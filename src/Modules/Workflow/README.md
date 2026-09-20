# Workflow

Published process definitions support user tasks, service tasks, timers and conditional transitions.

## Person assignment

`workflow.manage` permits task creation and reassignment. `GET /api/v1/workflows/assignees?documentId=...` returns eligible registered members of the document owner's active unit. The assigning user must belong to that exact unit (development bootstrap administrator is the explicit exception), and must be able to read the document. Candidates must have persisted `workflow.read`, `workflow.task.complete` and, for an existing task, the node permission. External token-only roles are not inferred for absent users.

- `POST /workflows/assigned-tasks`: documentId, title, subjectId, slaMinutes (1–525600). Creates a one-step published workflow and assigns its task atomically.
- `POST /workflows/instances/{id}/assign`: workItemId, subjectId, expectedVersion. Closed/stale tasks return conflict. EF concurrency protects simultaneous writes.
- `GET /workflows/work-items/mine`: permission and document visibility checks; personal assignments are visible to the assignee and workflow managers. At most 100 records are shown by the UI (API maximum 500).
- `POST /workflows/instances/{id}/complete-task`: requires endpoint and node permissions, document visibility and matching assignee. Completion advances to the next transition; `outcome` is set as a workflow variable.

Assignment does not grant document or workflow permissions. Subject IDs are shown because the current membership directory does not expose display names. Assignment events with previous assignee, actor and timestamp are written to the Workflow outbox in the same save transaction. Mutation endpoints are access-audited.

Migration `WorkItemAssignment` adds nullable assignee, assigning actor and assignment timestamp fields; existing group tasks remain unassigned. Apply it before deploying the API.

The UI allows document search, individual assignment, reassignment and open-task filtering. A manual task uses a fixed completion outcome; existing process definitions retain their configured outcome semantics. Completion history is persisted, but a completed-task browsing screen is not provided here.
