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
  MessageSquareMore,
  MessageSquareQuote,
  Send,
  Sparkles,
  Upload,
  UserPlus,
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

const initialCreateForm = {
  title: "",
  description: "",
  empId: "",
  dueDate: "",
  requiresSubmission: false,
};

export default function EmployeeTasksPage() {
  const { user, authFetch } = useAuth();
  const [activeSection, setActiveSection] = useState("assigned");
  const [tasks, setTasks] = useState([]);
  const [delegatedTasks, setDelegatedTasks] = useState([]);
  const [assignableEmployees, setAssignableEmployees] = useState([]);
  const [status, setStatus] = useState({ loading: true, error: "" });
  const [submissionModal, setSubmissionModal] = useState({ open: false, assignmentId: null });
  const [selectedFile, setSelectedFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [createForm, setCreateForm] = useState(initialCreateForm);
  const [createFile, setCreateFile] = useState(null);
  const [creatingTask, setCreatingTask] = useState(false);
  const [reviewDrafts, setReviewDrafts] = useState({});
  const [reviewActionState, setReviewActionState] = useState({});
  const [expandedReviewId, setExpandedReviewId] = useState(null);

  const taskNotifications = useMemo(
    () => ({
      hasAccepted: tasks.some(
        (task) => task.employeeNotificationUnread && task.employeeCelebrationPending
      ),
      hasChanges: tasks.some(
        (task) => task.employeeNotificationUnread && task.status === "CHANGES_REQUESTED"
      ),
      hasDelegated: delegatedTasks.some(
        (task) => task.adminNotificationUnread && task.adminNotificationMessage
      ),
    }),
    [tasks, delegatedTasks]
  );

  const activeSubmissionTask = useMemo(
    () => tasks.find((assignment) => assignment.id === submissionModal.assignmentId),
    [submissionModal.assignmentId, tasks]
  );

  const loadAssignedTasks = async () => {
    const response = await authFetch("/api/employee/my-tasks");
    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || "Failed to load tasks");
    }
    const data = await response.json();
    setTasks(data || []);
    return data || [];
  };

  const loadDelegatedTasks = async () => {
    const response = await authFetch("/api/employee/delegated-tasks");
    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || "Failed to load delegated tasks");
    }
    const data = await response.json();
    setDelegatedTasks(data || []);
    return data || [];
  };

  const loadAssignableEmployees = async () => {
    const response = await authFetch("/api/employee/assignable-employees");
    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || "Failed to load employees");
    }
    const data = await response.json();
    setAssignableEmployees(data || []);
    return data || [];
  };

  const refreshWorkspace = async ({ silent = false } = {}) => {
    if (!silent) {
      setStatus({ loading: true, error: "" });
    }

    try {
      const [assignedData, delegatedData] = await Promise.all([
        loadAssignedTasks(),
        loadDelegatedTasks(),
        loadAssignableEmployees(),
      ]);

      if (!silent) {
        setStatus({ loading: false, error: "" });
      }

      return { assignedData, delegatedData };
    } catch (error) {
      if (!silent) {
        setStatus({ loading: false, error: error.message });
      }
      throw error;
    }
  };

  useEffect(() => {
    let isMounted = true;

    const fetchWorkspace = async () => {
      try {
        const { assignedData, delegatedData } = await refreshWorkspace();

        if (!isMounted) {
          return;
        }

        const unreadAssigned = assignedData.filter(
          (task) => task.employeeNotificationUnread && task.employeeNotificationMessage
        );
        const unreadDelegated = delegatedData.filter(
          (task) => task.adminNotificationUnread && task.adminNotificationMessage
        );

        if (unreadAssigned.length) {
          const priorityNotification =
            unreadAssigned.find((task) => task.employeeCelebrationPending) || unreadAssigned[0];

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
        } else if (unreadDelegated.length) {
          setNotification({
            title: "Delegated Work Update",
            message: unreadDelegated[0].adminNotificationMessage,
            type: "info",
          });
          authFetch("/api/employee/delegated-notifications/read", { method: "PUT" }).catch(() => {});
          setDelegatedTasks((current) =>
            current.map((task) =>
              task.adminNotificationUnread
                ? { ...task, adminNotificationUnread: false }
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

    fetchWorkspace();

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

  const downloadBlob = async (response, fallbackName) => {
    const contentDisposition = response.headers.get("Content-Disposition");
    let filename = fallbackName;

    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename=\"?([^\"]+)\"?/);
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
  };

  const handleDownloadDocument = async (assignmentId) => {
    try {
      const response = await authFetch(`/api/employee/download-task-doc/${assignmentId}`);
      if (!response.ok) {
        throw new Error("Failed to download document");
      }
      await downloadBlob(response, `task-document-${assignmentId}`);
    } catch (error) {
      setNotification({
        title: "Download Failed",
        message: "Failed to download document. Please try again.",
        type: "error",
      });
    }
  };

  const handleDelegatedDownload = async (type, assignmentId) => {
    try {
      const response = await authFetch(`/api/employee/delegated/download-document/${type}/${assignmentId}`);
      if (!response.ok) {
        throw new Error("Failed to download delegated document");
      }
      await downloadBlob(response, `${type}-${assignmentId}`);
    } catch (error) {
      setNotification({
        title: "Download Failed",
        message: error.message || "Failed to download delegated document.",
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
      await refreshWorkspace({ silent: true });
      setNotification({
        title: "Submission Received",
        message: payload?.message || "Your document has been submitted successfully.",
        type: "info",
      });
      setSubmissionModal({ open: false, assignmentId: null });
      setSelectedFile(null);
    } catch (error) {
      setNotification({
        title: "Submission Failed",
        message: error.message || "Failed to submit document. Please try again.",
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateTask = async (event) => {
    event.preventDefault();

    if (!createForm.title.trim() || !createForm.description.trim() || !createForm.empId || !createForm.dueDate) {
      setNotification({
        title: "Missing Details",
        message: "Please complete all required fields before delegating the task.",
        type: "error",
      });
      return;
    }

    const selectedDate = new Date(createForm.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      setNotification({
        title: "Invalid Due Date",
        message: "Due date cannot be in the past.",
        type: "error",
      });
      return;
    }

    setCreatingTask(true);

    try {
      if (createFile) {
        const formData = new FormData();
        formData.append("title", createForm.title);
        formData.append("description", createForm.description);
        formData.append("empId", createForm.empId);
        formData.append("dueDate", createForm.dueDate);
        formData.append("requiresSubmission", createForm.requiresSubmission);
        formData.append("file", createFile);

        const response = await authFetch("/api/employee/delegated/create-task-with-file", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.message || "Failed to create delegated task");
        }
      } else {
        const createTaskResponse = await authFetch("/api/employee/delegated/create-task", {
          method: "POST",
          body: JSON.stringify({
            title: createForm.title,
            description: createForm.description,
            taskType: createForm.requiresSubmission ? "DOC_TEXT" : "TEXT",
          }),
        });

        if (!createTaskResponse.ok) {
          const payload = await createTaskResponse.json().catch(() => null);
          throw new Error(payload?.message || "Failed to create delegated task");
        }

        const task = await createTaskResponse.json();
        const assignTaskResponse = await authFetch("/api/employee/delegated/assign-task", {
          method: "POST",
          body: JSON.stringify({
            taskId: task.id,
            empId: createForm.empId,
            dueDate: createForm.dueDate,
            requiresSubmission: createForm.requiresSubmission,
          }),
        });

        if (!assignTaskResponse.ok) {
          const payload = await assignTaskResponse.json().catch(() => null);
          throw new Error(payload?.message || "Failed to assign delegated task");
        }
      }

      setCreateForm(initialCreateForm);
      setCreateFile(null);
      const fileInput = document.getElementById("delegated-task-file-input");
      if (fileInput) {
        fileInput.value = "";
      }

      await refreshWorkspace({ silent: true });
      setActiveSection("reviews");
      setNotification({
        title: "Task Delegated",
        message: "The task has been created and assigned successfully.",
        type: "success",
      });
    } catch (error) {
      setNotification({
        title: "Delegation Failed",
        message: error.message || "Failed to delegate task.",
        type: "error",
      });
    } finally {
      setCreatingTask(false);
    }
  };

  const handleDelegatedReviewAction = async (assignmentId, actionType) => {
    const draft = reviewDrafts[assignmentId]?.trim() || "";

    if (actionType === "changes" && !draft) {
      setNotification({
        title: "Comments Required",
        message: "Please add improvement notes before requesting changes.",
        type: "error",
      });
      return;
    }

    try {
      setReviewActionState((current) => ({ ...current, [assignmentId]: actionType }));

      const response =
        actionType === "accept"
          ? await authFetch(`/api/employee/delegated/submission/accept/${assignmentId}`, { method: "POST" })
          : await authFetch("/api/employee/delegated/submission/request-changes", {
              method: "POST",
              body: JSON.stringify({
                taskAssignmentId: assignmentId,
                comments: draft,
              }),
            });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || "Unable to update delegated review.");
      }

      const payload = await response.json();
      setReviewDrafts((current) => ({ ...current, [assignmentId]: "" }));
      setExpandedReviewId((current) => (current === assignmentId ? null : current));
      await refreshWorkspace({ silent: true });
      setNotification({
        title: actionType === "accept" ? "Work Accepted" : "Improvement Note Sent",
        message: payload?.message || "Delegated review updated successfully.",
        type: "success",
      });
    } catch (error) {
      setNotification({
        title: "Review Failed",
        message: error.message || "Unable to process the delegated review.",
        type: "error",
      });
    } finally {
      setReviewActionState((current) => ({ ...current, [assignmentId]: null }));
    }
  };

  const renderAssignedTasks = () => {
    if (tasks.length === 0) {
      return (
        <div className="employee-panel">
          <div className="employee-empty">
            No tasks assigned yet. Check back later for new assignments.
          </div>
        </div>
      );
    }

    return (
      <section className="tasks-grid">
        {tasks.map((assignment) => {
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
                      {formatDateTime(assignment.lastSubmittedAt)}. Please wait for the task assigner
                      to accept the work or share improvement notes.
                    </p>
                  </div>
                )}

                {assignment.status === "CHANGES_REQUESTED" && assignment.adminReviewComments && (
                  <div className="task-review-panel feedback">
                    <div className="task-review-panel-title">
                      <MessageSquareQuote size={16} />
                      <span>Improvement notes from reviewer</span>
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
                {(assignment.assignmentDocPath || assignment.task?.documentPath) && (
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
        })}
      </section>
    );
  };

  const renderCreateTask = () => (
    <section className="employee-grid single">
      <div className="employee-panel progress-panel">
        <div className="panel-header">
          <h3>Delegate a Task</h3>
          <span className="panel-badge">Team Workflow</span>
        </div>

        <form onSubmit={handleCreateTask} className="task-form">
          <div className="form-group">
            <label>Task Title *</label>
            <input
              type="text"
              value={createForm.title}
              onChange={(event) => setCreateForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="Enter task title..."
              required
            />
          </div>

          <div className="form-group">
            <label>Task Description *</label>
            <textarea
              value={createForm.description}
              onChange={(event) => setCreateForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="Describe the task clearly and professionally..."
              rows="4"
              required
            />
          </div>

          <div className="form-group">
            <label>Assign to Employee *</label>
            <select
              value={createForm.empId}
              onChange={(event) => setCreateForm((current) => ({ ...current, empId: event.target.value }))}
              required
            >
              <option value="">Choose an employee...</option>
              {assignableEmployees.map((employee) => (
                <option key={employee.empId} value={employee.empId}>
                  {employee.name} ({employee.empId})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Due Date *</label>
            <input
              type="date"
              value={createForm.dueDate}
              onChange={(event) => setCreateForm((current) => ({ ...current, dueDate: event.target.value }))}
              required
            />
          </div>

          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={createForm.requiresSubmission}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    requiresSubmission: event.target.checked,
                  }))
                }
              />
              <span className="checkbox-custom"></span>
              Requires Document Submission for Completion
            </label>
            <p className="help-text">
              If enabled, the assignee must submit a document and you will review it here.
            </p>
          </div>

          <div className="form-group">
            <label>Reference Document (Optional)</label>
            <div className="file-upload-area">
              <input
                id="delegated-task-file-input"
                type="file"
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
                onChange={(event) => setCreateFile(event.target.files?.[0] || null)}
                className="file-input-hidden"
              />
              {!createFile ? (
                <label htmlFor="delegated-task-file-input" className="file-upload-label">
                  <Upload size={24} />
                  <span>Upload reference material for the assignee</span>
                  <small>PDF, DOC, DOCX, TXT, JPG, PNG, GIF</small>
                </label>
              ) : (
                <div className="selected-file-display">
                  <div className="file-info">
                    <span className="file-name">{createFile.name}</span>
                    <span className="file-size">({(createFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <button type="submit" className="assign-btn" disabled={creatingTask}>
            <UserPlus size={16} />
            {creatingTask ? "Delegating Task..." : "Create & Assign Task"}
          </button>
        </form>
      </div>
    </section>
  );

  const renderDelegatedReviews = () => (
    <section className="tasks-grid">
      {delegatedTasks.length === 0 ? (
        <div className="employee-panel">
          <div className="employee-empty">
            You have not delegated any tasks yet.
          </div>
        </div>
      ) : (
        delegatedTasks.map((assignment) => {
          const reviewOpen = expandedReviewId === assignment.id;
          const reviewBusy = Boolean(reviewActionState[assignment.id]);
          const canReview =
            assignment.requiresSubmission &&
            assignment.submissionDocPath &&
            assignment.status !== "COMPLETED";

          return (
            <div className="task-detail-card" key={assignment.id}>
              <div className="task-detail-header">
                <div className="task-title-section">
                  <FileText size={20} className="task-icon" />
                  <h3>{assignment.task?.title || "Delegated Task"}</h3>
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
                  <div className="task-meta-item">
                    <UserPlus size={16} />
                    <span>Assigned to: {assignment.employee?.name || assignment.employee?.empId}</span>
                  </div>
                </div>

                <div className="task-progress-bar">
                  <div
                    className="task-progress-fill"
                    style={{ width: `${assignment.progress || 0}%` }}
                  ></div>
                </div>

                {assignment.adminNotificationMessage && (
                  <div className="task-review-panel neutral">
                    <div className="task-review-panel-title">
                      {assignment.adminNotificationUnread ? <BellRing size={16} /> : <Sparkles size={16} />}
                      <span>Delegation update</span>
                    </div>
                    <p>{assignment.adminNotificationMessage}</p>
                  </div>
                )}

                {assignment.status === "CHANGES_REQUESTED" && assignment.adminReviewComments && (
                  <div className="task-review-panel feedback">
                    <div className="task-review-panel-title">
                      <MessageSquareQuote size={16} />
                      <span>Latest improvement note</span>
                    </div>
                    <p>{assignment.adminReviewComments}</p>
                    <small>Waiting for the assignee to refine and resubmit.</small>
                  </div>
                )}

                {assignment.status === "COMPLETED" && (
                  <div className="task-review-panel accepted">
                    <div className="task-review-panel-title">
                      <CheckCircle size={16} />
                      <span>Accepted</span>
                    </div>
                    <p>This delegated task has been reviewed and accepted.</p>
                  </div>
                )}

                {assignment.submissionDocPath && (
                  <div className="task-review-panel waiting">
                    <div className="task-review-panel-title">
                      <Upload size={16} />
                      <span>Submission received</span>
                    </div>
                    <p>
                      Submission #{assignment.submissionCount || 1} was uploaded on{" "}
                      {formatDateTime(assignment.lastSubmittedAt)}.
                    </p>
                  </div>
                )}
              </div>

              <div className="task-detail-actions delegated-actions">
                {(assignment.assignmentDocPath || assignment.task?.documentPath) && (
                  <button
                    className="task-action-btn secondary"
                    onClick={() => handleDelegatedDownload("assignment", assignment.id)}
                  >
                    <Download size={16} />
                    Task Doc
                  </button>
                )}

                {assignment.submissionDocPath && (
                  <button
                    className="task-action-btn secondary"
                    onClick={() => handleDelegatedDownload("submission", assignment.id)}
                  >
                    <Download size={16} />
                    Submission
                  </button>
                )}

                {canReview && (
                  <>
                    <button
                      className="task-action-btn secondary"
                      onClick={() => setExpandedReviewId((current) => (current === assignment.id ? null : assignment.id))}
                      disabled={reviewBusy}
                    >
                      <MessageSquareMore size={16} />
                      {reviewOpen ? "Cancel Note" : "Suggest Improvements"}
                    </button>
                    <button
                      className="task-action-btn primary"
                      onClick={() => handleDelegatedReviewAction(assignment.id, "accept")}
                      disabled={reviewBusy}
                    >
                      <Send size={16} />
                      {reviewActionState[assignment.id] === "accept" ? "Accepting..." : "Accept Work"}
                    </button>
                  </>
                )}
              </div>

              {reviewOpen && (
                <div className="delegated-review-editor">
                  <textarea
                    className="submission-review-input"
                    rows="4"
                    placeholder="Share clear improvement notes so the assignee knows what to refine."
                    value={reviewDrafts[assignment.id] || ""}
                    onChange={(event) =>
                      setReviewDrafts((current) => ({
                        ...current,
                        [assignment.id]: event.target.value,
                      }))
                    }
                  />
                  <button
                    className="task-action-btn secondary"
                    onClick={() => handleDelegatedReviewAction(assignment.id, "changes")}
                    disabled={reviewBusy}
                  >
                    <Send size={16} />
                    {reviewActionState[assignment.id] === "changes" ? "Sending..." : "Send Improvement Note"}
                  </button>
                </div>
              )}
            </div>
          );
        })
      )}
    </section>
  );

  if (status.loading) {
    return (
      <div className="employee-dashboard">
        <div className="dashboard-bg" aria-hidden="true"></div>
        <div className="employee-shell">
          <EmployeeHeader name={user?.name} taskNotifications={taskNotifications} />

          <div className="employee-panel full-width">
            <div className="panel-header">
              <h3>Task Workspace</h3>
              <span className="panel-badge">Loading</span>
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
          <h2>Manage your assigned work and delegated reviews</h2>
        </section>

        <div className="task-section-switcher">
          <button
            className={`task-section-btn ${activeSection === "assigned" ? "active" : ""}`}
            onClick={() => setActiveSection("assigned")}
          >
            My Tasks
          </button>
          <button
            className={`task-section-btn ${activeSection === "create" ? "active" : ""}`}
            onClick={() => setActiveSection("create")}
          >
            Create & Assign
          </button>
          <button
            className={`task-section-btn ${activeSection === "reviews" ? "active" : ""}`}
            onClick={() => setActiveSection("reviews")}
          >
            Assigned By Me
            {taskNotifications.hasDelegated && <span className="task-section-dot"></span>}
          </button>
        </div>

        {status.error ? (
          <section className="employee-grid single">
            <div className="employee-panel">
              <div className="employee-error">{status.error}</div>
            </div>
          </section>
        ) : activeSection === "assigned" ? (
          renderAssignedTasks()
        ) : activeSection === "create" ? (
          renderCreateTask()
        ) : (
          renderDelegatedReviews()
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
                Your work will stay pending until the assigner reviews and accepts it.
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
