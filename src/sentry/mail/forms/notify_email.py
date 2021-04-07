from django import forms

from sentry.mail.forms.member_team import MemberTeamForm
from sentry.notifications.types import ActionTargetType, ACTION_CHOICES


class NotifyEmailForm(MemberTeamForm):
    targetType = forms.ChoiceField(choices=ACTION_CHOICES)

    teamValue = ActionTargetType.TEAM
    memberValue = ActionTargetType.MEMBER
    targetTypeEnum = ActionTargetType
