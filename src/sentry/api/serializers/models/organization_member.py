from collections import defaultdict
from typing import Any, List, Mapping, MutableMapping, Optional, Sequence, Set

from sentry import roles
from sentry.api.serializers import Serializer, register, serialize
from sentry.models import (
    ExternalActor,
    OrganizationMember,
    OrganizationMemberTeam,
    Team,
    TeamStatus,
    User,
)


def get_serialized_users_by_id(users_set: Set[User], user: User) -> Mapping[str, User]:
    serialized_users = serialize(users_set, user)
    return {user["id"]: user for user in serialized_users}


def get_team_slugs_by_organization_member_id(
    organization_members: Sequence[OrganizationMember],
) -> Mapping[int, List[str]]:
    """ @returns a map of member id -> team_slug[] """
    organization_member_tuples = list(
        OrganizationMemberTeam.objects.filter(
            team__status=TeamStatus.VISIBLE, organizationmember__in=organization_members
        ).values_list("organizationmember_id", "team_id")
    )
    team_ids_by_organization_member_id = {
        organization_member_id: team_id
        for organization_member_id, team_id in organization_member_tuples
    }
    teams = Team.objects.filter(id__in=team_ids_by_organization_member_id.values())
    teams_by_id = {team.id: team for team in teams}

    results = defaultdict(list)
    for member_id, team_id in team_ids_by_organization_member_id:
        results[member_id].append(teams_by_id[team_id].slug)
    return results


@register(OrganizationMember)
class OrganizationMemberSerializer(Serializer):  # type: ignore
    def __init__(self, expand: Optional[Sequence[str]] = None) -> None:
        self.expand = expand or []

    def get_attrs(
        self, item_list: Sequence[OrganizationMember], user: User, **kwargs: Any
    ) -> MutableMapping[OrganizationMember, MutableMapping[str, Any]]:
        """
        Fetch all of the associated Users and ExternalActors needed to serialize
        the organization_members in `item_list`.
        TODO(dcramer): assert on relations
        """

        users_set = {
            organization_member.user
            for organization_member in item_list
            if organization_member.user_id
        }
        users_by_id = get_serialized_users_by_id(users_set, user)
        external_users_map = defaultdict(list)

        if "externalUsers" in self.expand:
            actor_mapping = {user.actor_id: user for user in users_set}
            external_actors = list(ExternalActor.objects.filter(actor_id__in=actor_mapping.keys()))

            for external_actor in external_actors:
                serialized = serialize(external_actor, user)
                user = actor_mapping.get(external_actor.actor.id)
                external_users_map[user].append(serialized)

        attrs: MutableMapping[OrganizationMember, MutableMapping[str, Any]] = {}
        for item in item_list:
            user = users_by_id.get(str(item.user_id), None)
            if user:
                attrs[item] = {
                    "user": user,
                    "externalUsers": external_users_map.get(user),
                }
        return attrs

    def serialize(
        self, obj: OrganizationMember, attrs: Mapping[str, Any], user: Any, **kwargs: Any
    ) -> MutableMapping[str, Any]:
        d = {
            "id": str(obj.id),
            "email": obj.get_email(),
            "name": obj.user.get_display_name() if obj.user else obj.get_email(),
            "user": attrs["user"],
            "role": obj.role,
            "roleName": roles.get(obj.role).name,
            "pending": obj.is_pending,
            "expired": obj.token_expired,
            "flags": {
                "sso:linked": bool(getattr(obj.flags, "sso:linked")),
                "sso:invalid": bool(getattr(obj.flags, "sso:invalid")),
            },
            "dateCreated": obj.date_added,
            "inviteStatus": obj.get_invite_status_name(),
            "inviterName": obj.inviter.get_display_name() if obj.inviter else None,
        }

        if "externalUsers" in self.expand:
            d["externalUsers"] = attrs.get("externalUsers", [])

        return d


class OrganizationMemberWithTeamsSerializer(OrganizationMemberSerializer):
    def get_attrs(
        self, item_list: Sequence[OrganizationMember], user: User, **kwargs: Any
    ) -> MutableMapping[OrganizationMember, MutableMapping[str, Any]]:
        attrs = super().get_attrs(item_list, user)

        team_ids_by_organization_member_id = get_team_slugs_by_organization_member_id(item_list)
        for item in item_list:
            teams = team_ids_by_organization_member_id.get(item.id, [])
            try:
                attrs[item]["teams"] = teams
            except KeyError:
                attrs[item] = {"teams": teams}

        return attrs

    def serialize(
        self, obj: OrganizationMember, attrs: Mapping[str, Any], user: Any, **kwargs: Any
    ) -> MutableMapping[str, Any]:
        d = super().serialize(obj, attrs, user)
        d["teams"] = attrs.get("teams", [])
        return d


class OrganizationMemberWithProjectsSerializer(OrganizationMemberSerializer):
    def __init__(self, *args: Any, **kwargs: Any) -> None:
        self.project_ids = set(kwargs.pop("project_ids", []))
        super().__init__(*args, **kwargs)

    def get_attrs(
        self, item_list: Sequence[OrganizationMember], user: User, **kwargs: Any
    ) -> MutableMapping[OrganizationMember, MutableMapping[str, Any]]:
        """
        Note: For this to be efficient, call
        `.prefetch_related(
              'teams',
              'teams__projectteam_set',
              'teams__projectteam_set__project',
        )` on your queryset before using this serializer
        """

        attrs = super().get_attrs(item_list, user)
        for org_member in item_list:
            projects = set()
            for team in org_member.teams.all():
                # Filter in python here so that we don't break the prefetch
                if team.status != TeamStatus.VISIBLE:
                    continue

                for project_team in team.projectteam_set.all():
                    if (
                        project_team.project_id in self.project_ids
                        and project_team.project.status == TeamStatus.VISIBLE
                    ):
                        projects.add(project_team.project.slug)

            projects_list = list(projects)
            projects_list.sort()
            attrs[org_member]["projects"] = projects_list
        return attrs

    def serialize(
        self, obj: OrganizationMember, attrs: Mapping[str, Any], user: Any, **kwargs: Any
    ) -> MutableMapping[str, Any]:
        d = super().serialize(obj, attrs, user)
        d["projects"] = attrs.get("projects", [])
        return d
