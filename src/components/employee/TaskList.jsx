import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BarChart3, BellRing, FileCheck2, MessageSquareQuote, UserRound } from "lucide-react";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

const formatStatusLabel = (status) => (status ? status.replaceAll("_", " ") : "PENDING");

const toDateOnly = (value) => {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
};

const daysUntilDue = (assignment) => {
  const dueDate = toDateOnly(assignment.dueDate);
  if (!dueDate) return Number.POSITIVE_INFINITY;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((dueDate - today) / 86400000);
};

const assignedTime = (assignment) => {
  const date = new Date(assignment.assignedAt || 0);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};

const getPriorityRank = (assignment) => {
  if (assignment.status === "CHANGES_REQUESTED") return 0;
  if (daysUntilDue(assignment) < 0) return 1;
  if (assignment.status === "UNDER_REVIEW") return 2;
  if (daysUntilDue(assignment) <= 1) return 3;
  if (assignment.status === "ASSIGNED" || assignment.status === "IN_PROGRESS") return 4;
  return 5;
};

const getPriorityLabel = (assignment) => {
  const dueInDays = daysUntilDue(assignment);
  if (assignment.status === "CHANGES_REQUESTED") return "Needs revision";
  if (dueInDays < 0) return "Overdue";
  if (assignment.status === "UNDER_REVIEW") return "Waiting review";
  if (dueInDays === 0) return "Due today";
  if (dueInDays === 1) return "Due tomorrow";
  return "";
};

const canUpdateProgress = (assignment) =>
  assignment.status !== "COMPLETED" &&
  (!assignment.requiresSubmission || !assignment.submissionDocPath);

const formatAssignerLabel = (assignment) => {
  const assignerId = assignment.assignedBy || "Unknown";
  const assignerName = assignment.assignedByName || assignerId;

  return `Assigned by: ${assignerName !== assignerId ? `${assignerName} (${assignerId})` : assignerId}`;
};

const TaskList = ({ tasks, status }) => {
  const prioritizedTasks = useMemo(
    () =>
      [...tasks].sort((first, second) => {
        const rankDiff = getPriorityRank(first) - getPriorityRank(second);
        if (rankDiff !== 0) return rankDiff;
        const dueDiff = daysUntilDue(first) - daysUntilDue(second);
        if (dueDiff !== 0) return dueDiff;
        return assignedTime(second) - assignedTime(first);
      }),
    [tasks]
  );

  const taskCards = useMemo(() => {
    if (!prioritizedTasks.length) {
      return <div className="employee-empty">No active tasks assigned yet.</div>;
    }

    return prioritizedTasks.map((assignment) => {
      const priorityLabel = getPriorityLabel(assignment);

      return (
        <div className={`employee-task-card priority-${getPriorityRank(assignment)}`} key={assignment.id}>
        <div className="task-card-header">
          <div className="task-card-title-group">
            <h4>{assignment.task?.title || "Task"}</h4>
            {priorityLabel && <span className="task-priority-note">{priorityLabel}</span>}
          </div>
          <span className={`task-status ${assignment.status?.toLowerCase() || "pending"}`}>
            {formatStatusLabel(assignment.status)}
          </span>
        </div>
        <p className="task-card-desc">
          {assignment.task?.description || "Task details will appear here."}
        </p>
        <div className="task-card-meta">
          <span>Due: {assignment.dueDate || "TBD"}</span>
          <span>Progress: {assignment.progress || 0}%</span>
          <span className="task-card-assigner">
            <UserRound size={13} />
            {formatAssignerLabel(assignment)}
          </span>
        </div>
        <div className="task-card-progress">
          <div
            className="task-progress-bar-mini"
            style={{ width: `${assignment.progress || 0}%` }}
          ></div>
        </div>

        {assignment.status === "CHANGES_REQUESTED" && assignment.adminReviewComments ? (
          <div className="task-review-summary">
            <MessageSquareQuote size={14} />
            <span>
              {assignment.adminReviewComments}
            </span>
          </div>
        ) : assignment.employeeNotificationMessage ? (
          <div className="task-review-summary">
            {assignment.employeeNotificationUnread ? <BellRing size={14} /> : <MessageSquareQuote size={14} />}
            <span>{assignment.employeeNotificationMessage}</span>
          </div>
        ) : null}

        {assignment.requiresSubmission && assignment.submissionDocPath && assignment.status !== "COMPLETED" && (
          <div className="task-review-summary neutral">
            <FileCheck2 size={14} />
            <span>
              Submission {assignment.submissionCount ? `#${assignment.submissionCount}` : ""} is with the assigner for review.
            </span>
          </div>
        )}

        {canUpdateProgress(assignment) && (
          <div className="task-card-action">
            <Link to={`/employee/update-progress/${assignment.id}`} className="update-progress-btn">
              <BarChart3 size={14} />
              Update Progress
              <ArrowRight size={14} className="btn-arrow" />
            </Link>
          </div>
        )}
        </div>
      );
    });
  }, [prioritizedTasks]);

  return (
    <div className="employee-panel">
      <div className="panel-header">
        <h3>Today's tasks</h3>
        <span className="panel-badge">Active</span>
      </div>
      {status.loading ? (
        <div className="employee-tasks">
          {Array.from({ length: 3 }).map((_, index) => (
            <div className="employee-task-card skeleton-card" key={index}>
              <div className="task-card-header">
                <Skeleton width={200} height={20} />
                <Skeleton width={80} height={24} style={{ borderRadius: 12 }} />
              </div>
              <Skeleton width="100%" height={40} style={{ marginBottom: 12 }} />
              <div className="task-card-meta">
                <Skeleton width={100} height={14} />
                <Skeleton width={100} height={14} />
              </div>
              <Skeleton width="100%" height={8} style={{ borderRadius: 4, marginBottom: 12 }} />
              <div className="task-card-action">
                <Skeleton width={140} height={32} style={{ borderRadius: 6 }} />
              </div>
            </div>
          ))}
        </div>
      ) : status.error ? (
        <div className="employee-error">{status.error}</div>
      ) : (
        <div className="employee-tasks">{taskCards}</div>
      )}
    </div>
  );
};

export default TaskList;
