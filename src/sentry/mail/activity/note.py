from typing import Any, Dict

from .base import ActivityEmail


class NoteActivityEmail(ActivityEmail):
    def get_context(self) -> Dict[str, Any]:
        return {}

    def get_template(self) -> str:
        return "sentry/emails/activity/note.txt"

    def get_html_template(self) -> str:
        return "sentry/emails/activity/note.html"

    def get_category(self) -> str:
        return "note_activity_email"
