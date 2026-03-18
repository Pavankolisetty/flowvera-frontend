import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  BellRing,
  Calendar,
  CheckCircle,
  Download,
  FileText,
  MessageSquareQuote,
  Sparkles,
  Upload,
} from "lucide-react";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import EmployeeHeader from "../components/EmployeeHeader";
import ConfettiAnimation from "../components/shared/ConfettiAnimation";
import { useAuth } from "../context/AuthContext";
import "../styles/EmployeeDashboard.css";

const getStatusBadgeClass = (status) => {
  switch (status?.toLowerCase()) {
    case "completed":
      return "task-status completed";
    case "in_progress":
      return "task-status in_progress";
    case "assigned":
      return "task-status assigned";
    case "under_review":
      return "task-status review";
    case "changes_requested":
      return "task-status changes_requested";
    default:
      return "task-status pending";
  }
};

const formatStatusLabel = (status) => (status ? status.replaceAll("_", " ") : "PENDING");

const formatDate = (dateString) => {
  if (!dateString) return "No deadline";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatDateTime = (value) => {
  if (!value) return "Not available";
  return new Date(value).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export default function EmployeeTasksPage() {
  const { user, authFetch } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [status, setStatus] = useState({ loading: true, error: "" });
  const [submissionModal, setSubmissionModal] = useState({ open: false, assignmentId: null });
  const [selectedFile, setSelectedFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const taskNotifications = useMemo(
    () => ({
      hasAccepted: tasks.some(
        (task) => task.employeeNotificationUnread && task.employeeCelebrationPending
      ),
      hasChanges: tasks.some(
        (task) => task.employeeNotificationUnread && task.status === "CHANGES_REQUESTED"
      ),
    }),
    [tasks]
  );

  const loadTasks = async () => {
    const response = await authFetch("/api/employee/my-tasks");

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || "Failed to load tasks");
    }

    const data = await response.json();
    setTasks(data || []);
    return data || [];
  };

  useEffect(() => {
    let isMounted = true;

    const fetchTasks = async () => {
      try {
        const data = await loadTasks();

        if (!isMounted) {
          return;
        }

        setStatus({ loading: false, error: "" });

        const unreadNotifications = data.filter(
          (task) => task.employeeNotificationUnread && task.employeeNotificationMessage
        );

        if (unreadNotifications.length) {
          const priorityNotification =
            unreadNotifications.find((task) => task.employeeCelebrationPending) || unreadNotifications[0];

          setNotification({
            title: priorityNotification.employeeCelebrationPending
              ? "Work Accepted"
              : priorityNotification.status === "CHANGES_REQUESTED"
                ? "Improvement Requested"
                : "Task Update",
            message: priorityNotification.employeeNotificationMessage,
            type: priorityNotification.employeeCelebrationPending
              ? "success"
              : priorityNotification.status === "CHANGES_REQUESTED"
                ? "warning"
                : "info",
          });

          if (priorityNotification.employeeCelebrationPending) {
            setShowConfetti(true);
          }

          authFetch("/api/employee/notifications/read", { method: "PUT" }).catch(() => {});
          setTasks((current) =>
            current.map((task) =>
              task.employeeNotificationUnread
                ? {
                    ...task,
                    employeeNotificationUnread: false,
                    employeeCelebrationPending: false,
                  }
                : task
            )
          );
        }
      } catch (error) {
        if (isMounted) {
          setStatus({ loading: false, error: error.message });
        }
      }
    };

    fetchTasks();

    return () => {
      isMounted = false;
    };
  }, [authFetch]);

  useEffect(() => {
    if (!notification) {
      return;
    }

    const timer = window.setTimeout(() => {
      setNotification(null);
    }, notification.type === "success" ? 7000 : 5000);

    return () => window.clearTimeout(timer);
  }, [notification]);

  const activeSubmissionTask = useMemo(
    () => tasks.find((assignment) => assignment.id === submissionModal.assignmentId),
    [submissionModal.assignmentId, tasks]
  );

  const handleDownloadDocument = async (assignmentId) => {
    try {
      const response = await authFetch(`/api/employee/download-task-doc/${assignmentId}`);

      if (!response.ok) {
        throw new Error("Failed to download document");
      }

      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `task-document-${assignmentId}`;

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (error) {
      console.error("Download failed:", error);
      setNotification({
        title: "Download Failed",
        message: "Failed to download document. Please try again.",
        type: "error",
      });
    }
  };

  const handleFileSubmission = async () => {
    if (!selectedFile || !submissionModal.assignmentId) return;

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("document", selectedFile);

      const response = await authFetch(`/api/employee/submit-document/${submissionModal.assignmentId}`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to submit document");
      }

      const payload = await response.json();
      await loadTasks();
      setNotification({
        title: "Submission Received",
        message:
          payload?.message ||
          "Your document has been submitted successfully. Please wait for the administrator's review.",
        type: "info",
      });
      setSubmissionModal({ open: false, assignmentId: null });
      setSelectedFile(null);
    } catch (error) {
      console.error("Submission failed:", error);
      setNotification({
        title: "Submission Failed",
        message: error.message || "Failed to submit document. Please try again.",
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (status.loading) {
    return (
      <div className="employee-dashboard">
        <div className="dashboard-bg" aria-hidden="true"></div>
        <div className="employee-shell">
          <EmployeeHeader name={user?.name} />

          <div className="employee-panel full-width">
            <div className="panel-header">
              <h3>All Tasks</h3>
              <span className="panel-badge">Overview</span>
            </div>

            <div className="employee-tasks">
              {Array.from({ length: 4 }).map((_, index) => (
                <div className="employee-task-card skeleton-card" key={index}>
                  <div className="task-card-header">
                    <Skeleton width={250} height={22} />
                    <Skeleton width={90} height={26} style={{ borderRadius: 13 }} />
                  </div>
                  <Skeleton width="100%" height={45} style={{ marginBottom: 15 }} />
                  <div className="task-card-meta">
                    <Skeleton width={120} height={16} />
                    <Skeleton width={110} height={16} />
                  </div>
                  <Skeleton width="100%" height={10} style={{ borderRadius: 5, marginBottom: 15 }} />
                  <div className="task-card-action">
                    <Skeleton width={160} height={36} style={{ borderRadius: 8 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="employee-dashboard">
      <div className="dashboard-bg" aria-hidden="true"></div>
      <div className="employee-shell">
        <EmployeeHeader name={user?.name} taskNotifications={taskNotifications} />

        <section className="employee-quote compact">
          <span className="quote-label">Tasks</span>
          <h2>Your task assignments</h2>
        </section>

        {status.error ? (
          <section className="employee-grid single">
            <div className="employee-panel">
              <div className="employee-error">{status.error}</div>
            </div>
          </section>
        ) : (
          <section className="tasks-grid">
            {tasks.length === 0 ? (
              <div className="employee-panel">
                <div className="employee-empty">
                  No tasks assigned yet. Check back later for new assignments.
                </div>
              </div>
            ) : (
              tasks.map((assignment) => {
                const canUpdateProgress =
                  assignment.status !== "COMPLETED" &&
                  (!assignment.requiresSubmission || !assignment.submissionDocPath);

                const canSubmitDocument =
                  assignment.requiresSubmission && assignment.status !== "COMPLETED";

                return (
                  <div className="task-detail-card" key={assignment.id}>
                    <div className="task-detail-header">
                      <div className="task-title-section">
                        <FileText size={20} className="task-icon" />
                        <h3>{assignment.task?.title || "Untitled Task"}</h3>
                      </div>
                      <span className={getStatusBadgeClass(assignment.status)}>
                        {formatStatusLabel(assignment.status)}
                      </span>
                    </div>

                    <div className="task-detail-body">
                      <p className="task-description">
                        {assignment.task?.description || "No description provided."}
                      </p>

                      <div className="task-meta-grid">
                        <div className="task-meta-item">
                          <Calendar size={16} />
                          <span>Due: {formatDate(assignment.dueDate)}</span>
                        </div>
                        <div className="task-meta-item">
                          <BarChart3 size={16} />
                          <span>Progress: {assignment.progress || 0}%</span>
                        </div>
                        {assignment.requiresSubmission && (
                          <div className="task-meta-item">
                            <Upload size={16} />
                            <span>Submissions: {assignment.submissionCount || 0}</span>
                          </div>
                        )}
                      </div>

                      <div className="task-progress-bar">
                        <div
                          className="task-progress-fill"
                          style={{ width: `${assignment.progress || 0}%` }}
                        ></div>
                      </div>

                      {assignment.requiresSubmission && assignment.submissionDocPath && assignment.status !== "COMPLETED" && (
                        <div className="task-review-panel waiting">
                          <div className="task-review-panel-title">
                            <FileText size={16} />
                            <span>Submission in review</span>
                          </div>
                          <p>
                            Submission #{assignment.submissionCount || 1} was sent on{" "}
                            {formatDateTime(assignment.lastSubmittedAt)}. Please wait for the
                            administrator to accept the work or share improvement notes.
                          </p>
                        </div>
                      )}

                      {assignment.status === "CHANGES_REQUESTED" && assignment.adminReviewComments && (
                        <div className="task-review-panel feedback">
                          <div className="task-review-panel-title">
                            <MessageSquareQuote size={16} />
                            <span>Improvement notes from admin</span>
                          </div>
                          <p>{assignment.adminReviewComments}</p>
                          <small>You can update your work and submit the document again.</small>
                        </div>
                      )}

                      {assignment.employeeNotificationMessage && assignment.status !== "CHANGES_REQUESTED" && (
                        <div
                          className={`task-review-panel ${
                            assignment.status === "COMPLETED" ? "accepted" : "neutral"
                          }`}
                        >
                          <div className="task-review-panel-title">
                            {assignment.employeeNotificationUnread ? <BellRing size={16} /> : <Sparkles size={16} />}
                            <span>Latest update</span>
                          </div>
                          <p>{assignment.employeeNotificationMessage}</p>
                        </div>
                      )}
                    </div>

                    <div className="task-detail-actions">
                      {assignment.task?.documentPath && (
                        <button
                          className="task-action-btn secondary"
                          onClick={() => handleDownloadDocument(assignment.id)}
                        >
                          <Download size={16} />
                          Download Task Doc
                        </button>
                      )}

                      {canSubmitDocument && (
                        <button
                          className="task-action-btn primary"
                          onClick={() => setSubmissionModal({ open: true, assignmentId: assignment.id })}
                        >
                          <Upload size={16} />
                          {assignment.submissionDocPath ? "Resubmit Document" : "Submit Document"}
                        </button>
                      )}

                      {assignment.status === "COMPLETED" && (
                        <div className="task-action-btn completed">
                          <CheckCircle size={16} />
                          Work Accepted
                        </div>
                      )}

                      {canUpdateProgress && (
                        <Link
                          to={`/employee/update-progress/${assignment.id}`}
                          className="task-action-btn primary"
                        >
                          <BarChart3 size={16} />
                          Update Progress
                          <ArrowRight size={16} className="action-arrow" />
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </section>
        )}
      </div>

      {submissionModal.open && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Submit Work Document</h3>
              <button
                className="modal-close-btn"
                onClick={() => {
                  setSubmissionModal({ open: false, assignmentId: null });
                  setSelectedFile(null);
                }}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <p>
                Upload the latest document for{" "}
                <strong>{activeSubmissionTask?.task?.title || "this task"}</strong>.
                Your work will stay pending until the administrator reviews and accepts it.
              </p>
              <input
                type="file"
                onChange={(event) => setSelectedFile(event.target.files[0])}
                accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
                className="file-input"
              />
              {selectedFile && <p className="selected-file">Selected: {selectedFile.name}</p>}
            </div>
            <div className="modal-footer">
              <button
                className="modal-btn secondary"
                onClick={() => {
                  setSubmissionModal({ open: false, assignmentId: null });
                  setSelectedFile(null);
                }}
              >
                Cancel
              </button>
              <button
                className="modal-btn primary"
                onClick={handleFileSubmission}
                disabled={!selectedFile || submitting}
              >
                {submitting ? "Submitting..." : "Submit Document"}
              </button>
            </div>
          </div>
        </div>
      )}

      {notification && (
        <div className="toast-overlay">
          <div className="toast-notification-center">
            <div className="toast-icon-wrapper">
              <Sparkles className="toast-main-icon" size={28} />
            </div>
            <div className="toast-message-content">
              <h3 className="toast-title">{notification.title}</h3>
              <p className="toast-message">{notification.message}</p>
            </div>
            <div className="toast-success-icon">
              <CheckCircle size={24} className="success-check" />
            </div>
          </div>
        </div>
      )}

      <ConfettiAnimation show={showConfetti} onComplete={() => setShowConfetti(false)} />
    </div>
  );
}
