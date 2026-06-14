import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  AlertTriangle,
  BarChart3,
  BellRing,
  Calendar,
  CheckCircle,
  Download,
  FileText,
  MessageSquareMore,
  MessageSquareQuote,
  Send,
  ShieldCheck,
  Sparkles,
  Upload,
  UserPlus,
  UserRound,
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

const toDateOnly = (value) => {
  if (!value) return null;
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const isTaskOverdue = (assignment) => {
  if (!assignment?.dueDate || assignment.status === "COMPLETED") return false;
  const dueDate = toDateOnly(assignment.dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dueDate < today;
};

const canRequestDueDateExtension = (assignment) => {
  if (!assignment?.dueDate || assignment.status === "COMPLETED" || assignment.dueDateExtensionPending) {
    return false;
  }

  const dueDate = toDateOnly(assignment.dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayBeforeDueDate = new Date(dueDate);
  dayBeforeDueDate.setDate(dayBeforeDueDate.getDate() - 1);

  return today >= dayBeforeDueDate;
};

const initialCreateForm = {
  title: "",
  description: "",
  empId: "",
  dueDate: "",
  requiresSubmission: false,
};

const formatAssignerLabel = (assignment) => {
  const assignerId = assignment.assignedBy || "Unknown";
  const assignerName = assignment.assignedByName || assignerId;

  return assignerName !== assignerId ? `${assignerName} (${assignerId})` : assignerId;
};

const initialAuthorityForm = {
  empId: "",
  startDate: "",
  endDate: "",
  reason: "",
};

export default function EmployeeTasksPage() {
  const { user, authFetch } = useAuth();
  const canAssignTask = user?.role === "ADMIN" || Boolean(user?.canAssignTask);
  const isDepartmentLead = Boolean(user?.departmentLead);
  const [searchParams] = useSearchParams();
  const [activeSection, setActiveSection] = useState("assigned");
  const [tasks, setTasks] = useState([]);
  const [delegatedTasks, setDelegatedTasks] = useState([]);
  const [assignableEmployees, setAssignableEmployees] = useState([]);
  const [status, setStatus] = useState({ loading: true, error: "" });
  const [submissionModal, setSubmissionModal] = useState({ open: false, assignmentId: null });
  const [extensionModal, setExtensionModal] = useState({ open: false, assignmentId: null });
  const [extensionDraft, setExtensionDraft] = useState({ requestedDueDate: "", reason: "" });
  const [selectedFile, setSelectedFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [extensionSubmitting, setExtensionSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [createForm, setCreateForm] = useState(initialCreateForm);
  const [createFile, setCreateFile] = useState(null);
  const [creatingTask, setCreatingTask] = useState(false);
  const [reviewDrafts, setReviewDrafts] = useState({});
  const [reviewActionState, setReviewActionState] = useState({});
  const [expandedReviewId, setExpandedReviewId] = useState(null);
  const [authorityForm, setAuthorityForm] = useState(initialAuthorityForm);
  const [authoritySubmitting, setAuthoritySubmitting] = useState(false);
  const [authorityActionState, setAuthorityActionState] = useState({});
  const requestedSection = searchParams.get("section");
  const requestedAssignmentId = searchParams.get("assignmentId");

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

  const activeExtensionTask = useMemo(
    () => tasks.find((assignment) => assignment.id === extensionModal.assignmentId),
    [extensionModal.assignmentId, tasks]
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
    if (
      requestedSection === "assigned" ||
      (canAssignTask && (requestedSection === "create" || requestedSection === "reviews")) ||
      (isDepartmentLead && requestedSection === "authority")
    ) {
      setActiveSection(requestedSection);
    }
  }, [canAssignTask, isDepartmentLead, requestedSection]);

  useEffect(() => {
    if (!requestedAssignmentId) {
      return;
    }

    const targetId = `task-assignment-${requestedAssignmentId}`;
    const timer = window.setTimeout(() => {
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 150);

    return () => window.clearTimeout(timer);
  }, [activeSection, requestedAssignmentId, tasks, delegatedTasks]);

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

  const openExtensionModal = (assignment) => {
    setExtensionModal({ open: true, assignmentId: assignment.id });
    setExtensionDraft({ requestedDueDate: "", reason: "" });
  };

  const handleDueDateExtensionRequest = async () => {
    if (!extensionModal.assignmentId || !extensionDraft.requestedDueDate || !extensionDraft.reason.trim()) {
      setNotification({
        title: "Missing Details",
        message: "Please choose a new due date and add a reason.",
        type: "error",
      });
      return;
    }

    setExtensionSubmitting(true);
    try {
      const response = await authFetch("/api/employee/due-date-extension/request", {
        method: "POST",
        body: JSON.stringify({
          taskAssignmentId: extensionModal.assignmentId,
          requestedDueDate: extensionDraft.requestedDueDate,
          reason: extensionDraft.reason,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || "Failed to update due date.");
      }

      const payload = await response.json();
      await refreshWorkspace({ silent: true });
      setNotification({
        title: "Due Date Updated",
        message: payload?.message || "Due date updated successfully. The assigner has been notified.",
        type: "success",
      });
      setExtensionModal({ open: false, assignmentId: null });
      setExtensionDraft({ requestedDueDate: "", reason: "" });
    } catch (error) {
      setNotification({
        title: "Update Failed",
        message: error.message || "Unable to update the due date.",
        type: "error",
      });
    } finally {
      setExtensionSubmitting(false);
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

  const handleApproveDueDateExtension = async (assignmentId) => {
    try {
      setReviewActionState((current) => ({ ...current, [assignmentId]: "due-date" }));
      const response = await authFetch(`/api/employee/delegated/due-date-extension/approve/${assignmentId}`, {
        method: "POST",
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || "Unable to approve due date extension.");
      }

      const payload = await response.json();
      await refreshWorkspace({ silent: true });
      setNotification({
        title: "Extension Approved",
        message: payload?.message || "Due date extension approved successfully.",
        type: "success",
      });
    } catch (error) {
      setNotification({
        title: "Approval Failed",
        message: error.message || "Unable to approve the extension request.",
        type: "error",
      });
    } finally {
      setReviewActionState((current) => ({ ...current, [assignmentId]: null }));
    }
  };

  const temporaryAuthorityEmployees = useMemo(
    () =>
      assignableEmployees.filter(
        (employee) => employee.canAssignTask && !employee.departmentLead
      ),
    [assignableEmployees]
  );

  const handleGrantAuthority = async (event) => {
    event.preventDefault();

    if (!authorityForm.empId || !authorityForm.startDate || !authorityForm.endDate) {
      setNotification({
        title: "Missing Details",
        message: "Please choose employee, start date, and end date.",
        type: "error",
      });
      return;
    }

    setAuthoritySubmitting(true);
    try {
      const response = await authFetch("/api/employee/task-authority/grant", {
        method: "POST",
        body: JSON.stringify(authorityForm),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || "Unable to grant task authority.");
      }

      await refreshWorkspace({ silent: true });
      setAuthorityForm(initialAuthorityForm);
      setNotification({
        title: "Authority Granted",
        message: "Temporary task assignment authority has been granted.",
        type: "success",
      });
    } catch (error) {
      setNotification({
        title: "Authority Update Failed",
        message: error.message || "Unable to grant task authority.",
        type: "error",
      });
    } finally {
      setAuthoritySubmitting(false);
    }
  };

  const handleRevokeAuthority = async (empId) => {
    try {
      setAuthorityActionState((current) => ({ ...current, [empId]: true }));
      const response = await authFetch(`/api/employee/task-authority/revoke/${empId}`, {
        method: "POST",
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || "Unable to revoke task authority.");
      }

      await refreshWorkspace({ silent: true });
      setNotification({
        title: "Authority Revoked",
        message: "Temporary task assignment authority has been revoked.",
        type: "success",
      });
    } catch (error) {
      setNotification({
        title: "Revoke Failed",
        message: error.message || "Unable to revoke task authority.",
        type: "error",
      });
    } finally {
      setAuthorityActionState((current) => ({ ...current, [empId]: false }));
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
          const overdue = isTaskOverdue(assignment);

          return (
            <div
              className={`task-detail-card ${overdue ? "overdue" : ""}`}
              key={assignment.id}
              id={`task-assignment-${assignment.id}`}
            >
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
                  <div className="task-meta-item">
                    <UserRound size={16} />
                    <span>Assigned by: {formatAssignerLabel(assignment)}</span>
                  </div>
                </div>

                <div className="task-progress-bar">
                  <div
                    className="task-progress-fill"
                    style={{ width: `${assignment.progress || 0}%` }}
                  ></div>
                </div>

                {overdue && (
                  <div className="task-review-panel overdue">
                    <div className="task-review-panel-title">
                      <AlertTriangle size={16} />
                      <span>Task overdue</span>
                    </div>
                    <p>
                      This task has passed its due date. Please update the due date with a clear reason so the assigner is notified.
                    </p>
                  </div>
                )}

                {assignment.dueDateExtensionPending && (
                  <div className="task-review-panel waiting">
                    <div className="task-review-panel-title">
                      <Calendar size={16} />
                      <span>Extension request pending</span>
                    </div>
                    <p>
                      You requested a new due date of {formatDate(assignment.requestedDueDate)}.
                      The assigner is reviewing your reason.
                    </p>
                  </div>
                )}

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

                {canRequestDueDateExtension(assignment) && (
                  <button
                    className="task-action-btn secondary danger-outline"
                    onClick={() => openExtensionModal(assignment)}
                  >
                    <Calendar size={16} />
                    Update Due Date
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
                            {assignableEmployees
                              .filter((employee) => isDepartmentLead || !employee.departmentLead)
                .map((employee) => (
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
            <div className="task-detail-card" key={assignment.id} id={`task-assignment-${assignment.id}`}>
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

                {assignment.dueDateExtensionPending && (
                  <div className="task-review-panel overdue">
                    <div className="task-review-panel-title">
                      <Calendar size={16} />
                      <span>Due date extension requested</span>
                    </div>
                    <p>
                      Requested due date: {formatDate(assignment.requestedDueDate)}
                    </p>
                    <small>Reason: {assignment.dueDateExtensionReason}</small>
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

                {assignment.dueDateExtensionPending && (
                  <button
                    className="task-action-btn primary"
                    onClick={() => handleApproveDueDateExtension(assignment.id)}
                    disabled={reviewBusy}
                  >
                    <Calendar size={16} />
                    {reviewActionState[assignment.id] === "due-date" ? "Approving..." : "Approve Due Date"}
                  </button>
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

  const renderAuthorityManager = () => (
    <section className="employee-grid single">
      <div className="employee-panel progress-panel">
        <div className="panel-header">
          <h3>Team Authority</h3>
          <span className="panel-badge">Department Lead</span>
        </div>

        <form onSubmit={handleGrantAuthority} className="task-form">
          <div className="form-group">
            <label>Employee *</label>
            <select
              value={authorityForm.empId}
              onChange={(event) => setAuthorityForm((current) => ({ ...current, empId: event.target.value }))}
              required
            >
              <option value="">Choose an employee...</option>
              {assignableEmployees
                .filter((employee) => !employee.departmentLead)
                .map((employee) => (
                  <option key={employee.empId} value={employee.empId}>
                    {employee.name} ({employee.empId})
                  </option>
                ))}
            </select>
          </div>

          <div className="task-authority-dates">
            <div className="form-group">
              <label>Start Date *</label>
              <input
                type="date"
                value={authorityForm.startDate}
                onChange={(event) => setAuthorityForm((current) => ({ ...current, startDate: event.target.value }))}
                required
              />
            </div>

            <div className="form-group">
              <label>End Date *</label>
              <input
                type="date"
                value={authorityForm.endDate}
                min={authorityForm.startDate || undefined}
                onChange={(event) => setAuthorityForm((current) => ({ ...current, endDate: event.target.value }))}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Reason</label>
            <textarea
              value={authorityForm.reason}
              onChange={(event) => setAuthorityForm((current) => ({ ...current, reason: event.target.value }))}
              rows="3"
              placeholder="Example: Backup assignment support during sprint delivery."
            />
          </div>

          <button type="submit" className="assign-btn" disabled={authoritySubmitting}>
            <ShieldCheck size={16} />
            {authoritySubmitting ? "Granting Authority..." : "Grant Temporary Authority"}
          </button>
        </form>

        <div className="task-authority-list">
          <h4>Active Temporary Authority</h4>
          {temporaryAuthorityEmployees.length === 0 ? (
            <div className="employee-empty">No temporary task assignment authority is active.</div>
          ) : (
            temporaryAuthorityEmployees.map((employee) => (
              <div className="task-authority-row" key={employee.empId}>
                <div>
                  <strong>{employee.name}</strong>
                  <span>
                    {employee.empId} · Valid until {employee.taskAuthorityEndDate || "not set"}
                  </span>
                </div>
                <button
                  type="button"
                  className="task-action-btn secondary"
                  onClick={() => handleRevokeAuthority(employee.empId)}
                  disabled={Boolean(authorityActionState[employee.empId])}
                >
                  {authorityActionState[employee.empId] ? "Revoking..." : "Revoke"}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
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
          <h2>{canAssignTask ? "Manage your assigned work and delegated reviews" : "Manage your assigned work"}</h2>
        </section>

        <div className="task-section-switcher">
          <button
            className={`task-section-btn ${activeSection === "assigned" ? "active" : ""}`}
            onClick={() => setActiveSection("assigned")}
          >
            My Tasks
          </button>
          {canAssignTask && (
            <button
              className={`task-section-btn ${activeSection === "create" ? "active" : ""}`}
              onClick={() => setActiveSection("create")}
            >
              Create & Assign
            </button>
          )}
          {canAssignTask && (
            <button
              className={`task-section-btn ${activeSection === "reviews" ? "active" : ""}`}
              onClick={() => setActiveSection("reviews")}
            >
              Assigned By Me
              {taskNotifications.hasDelegated && <span className="task-section-dot"></span>}
            </button>
          )}
          {isDepartmentLead && (
            <button
              className={`task-section-btn ${activeSection === "authority" ? "active" : ""}`}
              onClick={() => setActiveSection("authority")}
            >
              Team Authority
            </button>
          )}
        </div>

        {status.error ? (
          <section className="employee-grid single">
            <div className="employee-panel">
              <div className="employee-error">{status.error}</div>
            </div>
          </section>
        ) : activeSection === "assigned" ? (
          renderAssignedTasks()
        ) : canAssignTask && activeSection === "create" ? (
          renderCreateTask()
        ) : isDepartmentLead && activeSection === "authority" ? (
          renderAuthorityManager()
        ) : canAssignTask ? (
          renderDelegatedReviews()
        ) : (
          renderAssignedTasks()
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

      {extensionModal.open && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Update Due Date</h3>
              <button
                className="modal-close-btn"
                onClick={() => {
                  setExtensionModal({ open: false, assignmentId: null });
                  setExtensionDraft({ requestedDueDate: "", reason: "" });
                }}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <p>
                Request more time for{" "}
                <strong>{activeExtensionTask?.task?.title || "this task"}</strong>.
                The new due date will be applied immediately and the assigner will receive an email acknowledgement.
              </p>
              <div className="form-group">
                <label>New Due Date</label>
                <input
                  type="date"
                  value={extensionDraft.requestedDueDate}
                  min={activeExtensionTask?.dueDate || undefined}
                  onChange={(event) =>
                    setExtensionDraft((current) => ({
                      ...current,
                      requestedDueDate: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="form-group">
                <label>Reason</label>
                <textarea
                  rows="4"
                  value={extensionDraft.reason}
                  onChange={(event) =>
                    setExtensionDraft((current) => ({ ...current, reason: event.target.value }))
                  }
                  placeholder="Explain why you need more time."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="modal-btn secondary"
                onClick={() => {
                  setExtensionModal({ open: false, assignmentId: null });
                  setExtensionDraft({ requestedDueDate: "", reason: "" });
                }}
              >
                Cancel
              </button>
              <button
                className="modal-btn primary"
                onClick={handleDueDateExtensionRequest}
                disabled={extensionSubmitting}
              >
                {extensionSubmitting ? "Updating..." : "Update Due Date"}
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
