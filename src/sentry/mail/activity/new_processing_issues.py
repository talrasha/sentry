from typing import Any, Dict, Iterable, Mapping

from sentry.models import EventError, GroupSubscriptionReason, NotificationSetting
from sentry.models.integration import ExternalProviders
from sentry.utils.http import absolute_uri

from .base import ActivityNotification


def summarize_issues(issues: Iterable[Any]) -> Iterable[Mapping[str, str]]:
    rv = []
    for issue in issues:
        extra_info = None
        msg_d = dict(issue["data"])
        msg_d["type"] = issue["type"]

        if "image_path" in issue["data"]:
            extra_info = issue["data"]["image_path"].rsplit("/", 1)[-1]
            if "image_arch" in issue["data"]:
                extra_info = "{} ({})".format(extra_info, issue["data"]["image_arch"])

        rv.append({"message": EventError(msg_d).message, "extra_info": extra_info})
    return rv


class NewProcessingIssuesActivityNotification(ActivityNotification):
    def __init__(self, activity: Any) -> None:
        ActivityNotification.__init__(self, activity)
        self.issues = summarize_issues(self.activity.data["issues"])

    def get_participants(self) -> Mapping[Any, GroupSubscriptionReason]:
        users = NotificationSetting.objects.get_notification_recipients(self.project)[
            ExternalProviders.EMAIL
        ]
        return {user: GroupSubscriptionReason.processing_issue for user in users}

    def get_context(self) -> Dict[str, Any]:
        return {
            "project": self.project,
            "issues": self.issues,
            "reprocessing_active": self.activity.data["reprocessing_active"],
            "info_url": absolute_uri(
                f"/settings/{self.organization.slug}/projects/{self.project.slug}/processing-issues/"
            ),
        }

    def get_subject(self) -> str:
        return f"Processing Issues on {self.project.slug}"

    def get_template(self) -> str:
        return "sentry/emails/activity/new_processing_issues.txt"

    def get_html_template(self) -> str:
        return "sentry/emails/activity/new_processing_issues.html"

    def get_category(self) -> str:
        return "new_processing_issues_activity_email"
