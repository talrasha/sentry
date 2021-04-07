from typing import Mapping, Tuple

from .base import ActivityEmail


class UnassignedActivityEmail(ActivityEmail):
    def get_activity_name(self) -> str:
        return "Unassigned"

    def get_description(self) -> Tuple[str, Mapping[str, str], Mapping[str, str]]:
        return "{author} unassigned {an issue}", {}, {}

    def get_category(self) -> str:
        return "unassigned_activity_email"
