from rest_framework.response import Response

from sentry.api.bases.organization import OrganizationEndpoint
from sentry.api.serializers import serialize
from sentry.api.serializers.models.team import TeamWithProjectsSerializer
from sentry.auth.superuser import is_active_superuser
from sentry.models import Team, TeamStatus


class OrganizationUserTeamsEndpoint(OrganizationEndpoint):
    def get(self, request, organization):
        """
        List your Teams In the Current Organization
        ```````````````````````````````````````````

        Return a list of the teams available to the authenticated session and
        with the supplied organization. If the user is a super user, then all
        teams within the organization are returned.
        """
        if is_active_superuser(request):
            # retrieve all teams within the organization
            queryset = Team.objects.filter(
                organization=organization, status=TeamStatus.VISIBLE
            ).order_by("slug")
            return Response(serialize(list(queryset), request.user, TeamWithProjectsSerializer()))
        else:
            return Response(
                serialize(list(request.access.teams), request.user, TeamWithProjectsSerializer())
            )
