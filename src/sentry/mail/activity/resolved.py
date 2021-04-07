from typing import Mapping, Tuple

from .base import ActivityNotification


class ResolvedActivityNotification(ActivityNotification):
    def get_activity_name(self) -> str:
        return "Resolved Issue"

    def get_description(self) -> Tuple[str, Mapping[str, str], Mapping[str, str]]:
        return "{author} marked {an issue} as resolved", {}, {}

    def get_category(self) -> str:
        return "resolved_activity_email"
