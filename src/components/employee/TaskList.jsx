import { useMemo } from "react";
import { Link } from "react-router-dom";
import { BarChart3, ArrowRight } from "lucide-react";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

const TaskList = ({ tasks, status }) => {
  const taskCards = useMemo(() => {
    if (!tasks.length) {
      return (
        <div className="employee-empty">
          No active tasks assigned yet.
        </div>
      );
    }

    return tasks.map((assignment) => (
      <div className="employee-task-card" key={assignment.id}>
        <div className="task-card-header">
          <h4>{assignment.task?.title || "Task"}</h4>
          <span className={`task-status ${assignment.status?.toLowerCase() || "pending"}`}>
            {assignment.status || "PENDING"}
          </span>
        </div>
        <p className="task-card-desc">
          {assignment.task?.description || "Task details will appear here."}
        </p>
        <div className="task-card-meta">
          <span>Due: {assignment.dueDate || "TBD"}</span>
          <span>Progress: {assignment.progress || 0}%</span>
        </div>
        <div className="task-card-progress">
          <div 
            className="task-progress-bar-mini"
            style={{ width: `${assignment.progress || 0}%` }}
          ></div>
        </div>
        {assignment.status !== 'COMPLETED' && (
          <div className="task-card-action">
            <Link 
              to={`/employee/update-progress/${assignment.id}`}
              className="update-progress-btn"
            >
              <BarChart3 size={14} />
              Update Progress
              <ArrowRight size={14} className="btn-arrow" />
            </Link>
          </div>
        )}
      </div>
    ));
  }, [tasks]);

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