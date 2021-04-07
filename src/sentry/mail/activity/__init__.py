from sentry.mail.activity.assigned import AssignedActivityNotification
from sentry.mail.activity.new_processing_issues import NewProcessingIssuesActivityNotification
from sentry.mail.activity.note import NoteActivityNotification
from sentry.mail.activity.regression import RegressionActivityNotification
from sentry.mail.activity.release import ReleaseActivityNotification
from sentry.mail.activity.resolved import ResolvedActivityNotification
from sentry.mail.activity.resolved_in_release import ResolvedInReleaseActivityNotification
from sentry.mail.activity.unassigned import UnassignedActivityNotification
from sentry.models.activity import Activity

emails = {
    Activity.ASSIGNED: AssignedActivityNotification,
    Activity.NOTE: NoteActivityNotification,
    Activity.DEPLOY: ReleaseActivityNotification,
    Activity.SET_REGRESSION: RegressionActivityNotification,
    Activity.SET_RESOLVED: ResolvedActivityNotification,
    Activity.SET_RESOLVED_IN_RELEASE: ResolvedInReleaseActivityNotification,
    Activity.UNASSIGNED: UnassignedActivityNotification,
    Activity.NEW_PROCESSING_ISSUES: NewProcessingIssuesActivityNotification,
}
