from collections import defaultdict
from itertools import chain
from typing import Any, Dict, Iterable, Mapping, Optional, Set

from django.db.models import Count

from sentry.db.models.query import in_iexact
from sentry.models import (
    CommitFileChange,
    Deploy,
    Environment,
    Group,
    GroupLink,
    NotificationSetting,
    ProjectTeam,
    Release,
    ReleaseCommit,
    Repository,
    User,
    UserEmail,
)
from sentry.notifications.helpers import get_values_by_user
from sentry.notifications.types import (
    GroupSubscriptionReason,
    NotificationSettingOptionValues,
    NotificationSettingTypes,
)
from sentry.utils.compat import zip
from sentry.utils.http import absolute_uri

from .base import ActivityNotification


class ReleaseActivityNotification(ActivityNotification):
    def __init__(self, activity: Any):
        super().__init__(activity)
        # TODO MARCOS 6 most of this should be moved to helper

        self.organization = self.project.organization
        self.user_id_team_lookup: Optional[Mapping[int, Iterable[Any]]] = None
        self.email_list: Set[str] = set()
        self.user_ids: Set[int] = set()

        try:
            self.deploy = Deploy.objects.get(id=activity.data["deploy_id"])
        except Deploy.DoesNotExist:
            self.deploy = None

        try:
            self.release = Release.objects.get(
                organization_id=self.project.organization_id, version=activity.data["version"]
            )
        except Release.DoesNotExist:
            self.release = None
            self.repos = []
            self.projects = []
        else:
            self.projects = list(self.release.projects.all())
            self.commit_list = [
                rc.commit
                for rc in ReleaseCommit.objects.filter(release=self.release).select_related(
                    "commit", "commit__author"
                )
            ]
            repos = {
                r_id: {"name": r_name, "commits": []}
                for r_id, r_name in Repository.objects.filter(
                    organization_id=self.project.organization_id,
                    id__in={c.repository_id for c in self.commit_list},
                ).values_list("id", "name")
            }

            self.email_list = {c.author.email for c in self.commit_list if c.author}
            if self.email_list:
                users = {
                    ue.email: ue.user
                    for ue in UserEmail.objects.filter(
                        in_iexact("email", self.email_list),
                        is_verified=True,
                        user__sentry_orgmember_set__organization=self.organization,
                    ).select_related("user")
                }
                self.user_ids = {u.id for u in users.values()}

            else:
                users = {}

            for commit in self.commit_list:
                repos[commit.repository_id]["commits"].append(
                    (commit, users.get(commit.author.email) if commit.author_id else None)
                )

            self.repos = list(repos.values())

            self.environment = (
                Environment.objects.get(id=self.deploy.environment_id).name or "Default Environment"
            )

            self.group_counts_by_project = dict(
                Group.objects.filter(
                    project__in=self.projects,
                    id__in=GroupLink.objects.filter(
                        linked_type=GroupLink.LinkedType.commit,
                        linked_id__in=ReleaseCommit.objects.filter(
                            release=self.release
                        ).values_list("commit_id", flat=True),
                    ).values_list("group_id", flat=True),
                )
                .values_list("project")
                .annotate(num_groups=Count("id"))
            )

    def should_email(self) -> bool:
        return bool(self.release and self.deploy)

    def get_participants(self) -> Mapping[ExternalProviders, Mapping[Any, GroupSubscriptionReason]]:
        """ TODO MARCOS DESCRIBE """
        users = list(
            User.objects.get_team_members_with_verified_email_for_projects(self.projects).distinct()
        )
        notification_settings = NotificationSetting.objects.get_for_users_by_parent(
            NotificationSettingTypes.DEPLOY,
            users=users,
            parent=self.organization,
        )
        users_with_options = get_values_by_user(users, notification_settings)

        users_to_reasons = defaultdict(dict)
        for user, options_by_provider in users_with_options.items():
            for provider, option in options_by_provider.items():
                # members who opt into all deploy emails:
                if option == NotificationSettingOptionValues.ALWAYS:
                    users_to_reasons[provider][user] = GroupSubscriptionReason.deploy_setting

                # members which have been seen in the commit log
                elif (
                    option == NotificationSettingOptionValues.COMMITTED_ONLY
                    and user.id in self.user_ids
                ):
                    users_to_reasons[provider][user] = GroupSubscriptionReason.committed
        return users_to_reasons

    # TODO MARCOS move to a helper or BASE
    def get_users_by_teams(self) -> Mapping[int, Iterable[Any]]:
        """ TODO MARCOS describe caching """
        if not self.user_id_team_lookup:
            user_teams = defaultdict(list)
            queryset = User.objects.filter(
                sentry_orgmember_set__organization_id=self.organization.id
            ).values_list("id", "sentry_orgmember_set__teams")
            for user_id, team_id in queryset:
                user_teams[user_id].append(team_id)
            self.user_id_team_lookup = user_teams
        return self.user_id_team_lookup

    def get_context(self) -> Dict[str, Any]:
        file_count = (
            CommitFileChange.objects.filter(
                commit__in=self.commit_list, organization_id=self.organization.id
            )
            .values("filename")
            .distinct()
            .count()
        )

        return {
            "commit_count": len(self.commit_list),
            "author_count": len(self.email_list),
            "file_count": file_count,
            "repos": self.repos,
            "release": self.release,
            "deploy": self.deploy,
            "environment": self.environment,
            "setup_repo_link": absolute_uri(f"/organizations/{self.organization.slug}/repos/"),
        }

    def get_user_context(self, user: Any) -> Dict[str, Any]:
        if user.is_superuser or self.organization.flags.allow_joinleave:
            projects = self.projects
        else:
            teams = self.get_users_by_teams()[user.id]
            team_projects = set(
                ProjectTeam.objects.filter(team_id__in=teams)
                .values_list("project_id", flat=True)
                .distinct()
            )
            projects = [p for p in self.projects if p.id in team_projects]

        def get_url(p_id: int) -> str:
            return f"/organizations/{self.organization.slug}/releases/{self.release.version}/?project={p_id}"

        release_links = [absolute_uri(get_url(p.id)) for p in projects]
        resolved_issue_counts = [self.group_counts_by_project.get(p.id, 0) for p in projects]
        return {
            "projects": zip(projects, release_links, resolved_issue_counts),
            "project_count": len(projects),
        }

    def get_subject(self) -> str:
        return f"Deployed version {self.release.version} to {self.environment}"

    def get_template(self) -> str:
        return "sentry/emails/activity/release.txt"

    def get_html_template(self) -> str:
        return "sentry/emails/activity/release.html"

    def get_category(self) -> str:
        return "release_activity_email"
