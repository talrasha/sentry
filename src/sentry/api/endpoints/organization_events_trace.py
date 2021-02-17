import logging
import sentry_sdk

from collections import deque

from rest_framework.response import Response
from rest_framework.exceptions import ParseError

from sentry import features, eventstore
from sentry.api.bases import OrganizationEventsEndpointBase, NoProjects
from sentry.snuba import discover


logger = logging.getLogger(__name__)
MAX_TRACE_SIZE = 100


def find_event(items, function, default=None):
    return next(filter(function, items), default)


def is_root(item):
    return item["root"] == "1"


def serialize_event(event, parent, is_root_event=False):
    return {
        "event_id": event["id"],
        "span_id": event["trace.span"],
        "transaction": event["transaction"],
        "project_id": event["project_id"],
        "parent_event_id": parent,
        "is_root": is_root_event,
    }


class OrganizationEventsTraceEndpointBase(OrganizationEventsEndpointBase):
    def has_feature(self, organization, request):
        return features.has(
            "organizations:trace-view-quick", organization, actor=request.user
        ) or features.has("organizations:trace-view-summary", organization, actor=request.user)

    def get(self, request, organization, trace_id):
        if not self.has_feature(organization, request):
            return Response(status=404)

        try:
            params = self.get_snuba_params(request, organization)
        except NoProjects:
            return Response([])

        with self.handle_query_errors():
            result = discover.query(
                selected_columns=[
                    "id",
                    "timestamp",
                    "transaction",
                    "project_id",
                    "trace.span",
                    "trace.parent_span",
                    'to_other(trace.parent_span, "", 0, 1) AS root',
                ],
                # We want to guarantee at least getting the root, and hopefully events near it with timestamp
                # id is just for consistent results
                orderby=["-root", "-timestamp", "id"],
                params=params,
                query=f"event.type:transaction trace:{trace_id}",
                limit=MAX_TRACE_SIZE,
                referrer="api.trace-view.get_ids",
            )
            if len(result["data"]) == 0:
                return Response(status=404)

        event_id = request.GET.get("event_id")
        warning_extra = {"trace": trace_id, "organization": organization}

        if is_root(result["data"][0]):
            root = result["data"][0]
        else:
            root = None
            logger.warning(
                "discover.trace-view.root.not-found",
                extra=warning_extra,
            )
            return Response(status=204)

        # Look for extra roots
        extra_roots = 0
        for item in result["data"][1:]:
            if is_root(item):
                extra_roots += 1
            else:
                break
        if extra_roots > 0:
            warning_extra["extra_roots"] = extra_roots
            logger.warning(
                "discover.trace-view.root.extra-found",
                warning_extra,
            )

        return Response(self.serialize(result["data"], root, warning_extra, event_id))


class OrganizationEventsTraceLightEndpoint(OrganizationEventsTraceEndpointBase):
    def serialize(self, result, root, warning_extra, event_id=None):
        parent_map = {item["trace.parent_span"]: item for item in result}
        trace_results = [serialize_event(root, None, True)]

        snuba_event = find_event(result, lambda item: item["id"] == event_id)
        if snuba_event is None:
            sentry_sdk.set_tag("query.error_reason", "Matching event not found")
            raise ParseError("event matching matching requested id not found")

        if root["id"] != event_id:
            # Get the root event and see if the current event's span is in the root event
            root_event = eventstore.get_event_by_id(root["project_id"], root["id"])
            root_span = find_event(
                root_event.data.get("spans", []),
                lambda item: item["span_id"] == snuba_event["trace.parent_span"],
            )

            # For the light response, the parent will be unknown unless it is a direct descendent of the root
            trace_results.append(
                serialize_event(snuba_event, root["id"] if root_span is not None else None)
            )

        event = eventstore.get_event_by_id(snuba_event["project_id"], event_id)
        for span in event.data.get("spans", []):
            if span["span_id"] in parent_map:
                child_event = parent_map[span["span_id"]]
                trace_results.append(serialize_event(child_event, event_id))

        return trace_results


class OrganizationEventsTraceEndpoint(OrganizationEventsTraceEndpointBase):
    def serialize(self, result, root, warning_extra, event_id=None):
        parent_map = {item["trace.parent_span"]: item for item in result}
        trace_results = [serialize_event(root, None, True)]

        current_event = root
        to_check = deque([root])
        iteration = 0
        while to_check:
            current_event = to_check.popleft()
            event = eventstore.get_event_by_id(current_event["project_id"], current_event["id"])
            for child in [
                item for item in event.data.get("spans", []) if item["span_id"] in parent_map
            ]:
                # Avoid potential span loops by popping, so we don't traverse the same nodes twice
                child_event = parent_map.pop(child["span_id"])
                trace_results.append(serialize_event(child_event, current_event["id"]))
                to_check.append(child_event)
            # Limit iterations just to be safe
            iteration += 1
            if iteration > MAX_TRACE_SIZE:
                logger.warning(
                    "discover.trace-view.surpassed-trace-limit",
                    extra=warning_extra,
                )
                break

        return trace_results
