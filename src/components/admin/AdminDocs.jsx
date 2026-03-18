import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Download,
  FileText,
  MessageSquareMore,
  Send,
} from "lucide-react";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

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

const getReviewState = (assignment) => {
  if (assignment.status === "COMPLETED") {
    return { label: "Accepted", className: "accepted" };
  }

  if (assignment.status === "CHANGES_REQUESTED") {
    return { label: "Changes Requested", className: "changes" };
  }

  if (assignment.status === "UNDER_REVIEW") {
    return { label: "Awaiting Review", className: "review" };
  }

  return { label: assignment.status?.replaceAll("_", " ") || "Pending", className: "pending" };
};

const getFileName = (path, fallback = "Document") => {
  if (!path) return fallback;
  return path.split("/").pop();
};

const AdminDocs = ({ authFetch, showNotification, loadData }) => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewDrafts, setReviewDrafts] = useState({});
  const [actionState, setActionState] = useState({});
  const [activeSection, setActiveSection] = useState("assigned");
  const [expandedReviewId, setExpandedReviewId] = useState(null);

  useEffect(() => {
    loadDocuments();
  }, [authFetch]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const response = await authFetch("/api/admin/all-assignments");

      if (!response.ok) {
        throw new Error("Failed to load assignment documents");
      }

      const data = await response.json();
      setAssignments(data || []);
    } catch (error) {
      console.error("Failed to load documents:", error);
      showNotification("Unable to load documents right now. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const assignedDocs = useMemo(
    () => assignments.filter((assignment) => assignment.assignmentDocPath || assignment.task?.documentPath),
    [assignments]
  );

  const submissionDocs = useMemo(
    () =>
      assignments
        .filter((assignment) => assignment.submissionDocPath)
        .sort((left, right) => new Date(right.lastSubmittedAt || 0) - new Date(left.lastSubmittedAt || 0)),
    [assignments]
  );

  const handleDownload = async (docType, id) => {
    try {
      const response = await authFetch(`/api/admin/download-document/${docType}/${id}`);

      if (!response.ok) {
        throw new Error("Failed to download document");
      }

      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `${docType}-document-${id}`;

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
      showNotification("Failed to download document. Please try again.", "error");
    }
  };

  const handleReviewAction = async (assignmentId, actionType) => {
    const draft = reviewDrafts[assignmentId]?.trim() || "";

    if (actionType === "changes" && !draft) {
      showNotification("Please enter comments or improvement suggestions before sending.", "error");
      return;
    }

    try {
      setActionState((current) => ({ ...current, [assignmentId]: actionType }));

      const response =
        actionType === "accept"
          ? await authFetch(`/api/admin/submission/accept/${assignmentId}`, { method: "POST" })
          : await authFetch("/api/admin/submission/request-changes", {
              method: "POST",
              body: JSON.stringify({
                taskAssignmentId: assignmentId,
                comments: draft,
              }),
            });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const message = payload?.message || "Unable to process the submission review.";
        throw new Error(message);
      }

      const payload = await response.json();
      showNotification(payload?.message || "Submission updated successfully.", "success");
      setReviewDrafts((current) => ({ ...current, [assignmentId]: "" }));
      setExpandedReviewId((current) => (current === assignmentId ? null : current));
      await loadDocuments();
      if (loadData) {
        await loadData();
      }
    } catch (error) {
      console.error("Review action failed:", error);
      showNotification(error.message || "Unable to process the review action.", "error");
    } finally {
      setActionState((current) => ({ ...current, [assignmentId]: null }));
    }
  };

  const renderAssignmentDocs = () => (
    <div className="docs-section">
      <h3>Task Documents ({assignedDocs.length})</h3>
      <div className="docs-grid">
        {assignedDocs.map((assignment) => (
          <article key={assignment.id} className="doc-card">
            <div className="doc-header">
              <FileText size={16} />
              <span className="doc-name">
                {getFileName(assignment.assignmentDocPath || assignment.task?.documentPath)}
              </span>
            </div>
            <div className="doc-details">
              <p><strong>Task:</strong> {assignment.task?.title}</p>
              <p><strong>Employee:</strong> {assignment.employee?.name} ({assignment.employee?.empId})</p>
              <p><strong>Assigned:</strong> {formatDateTime(assignment.assignedAt)}</p>
            </div>
            <button
              className="doc-download-btn"
              onClick={() => handleDownload("assignment", assignment.id)}
            >
              <Download size={14} />
              Download
            </button>
          </article>
        ))}
      </div>
      {assignedDocs.length === 0 && <div className="no-docs">No task documents available</div>}
    </div>
  );

  const renderSubmissionDocs = () => (
    <div className="docs-section">
      <h3>Submission Documents ({submissionDocs.length})</h3>
      <div className="docs-grid docs-grid-submissions">
        {submissionDocs.map((assignment) => {
          const reviewState = getReviewState(assignment);
          const isBusy = Boolean(actionState[assignment.id]);
          const canReview = assignment.status !== "COMPLETED";
          const isReviewExpanded = expandedReviewId === assignment.id;

          return (
            <article key={assignment.id} className={`doc-card submission-review-card ${reviewState.className}`}>
              <div className="submission-card-top">
                <div className="doc-header">
                  <FileText size={16} />
                  <span className="doc-name">{getFileName(assignment.submissionDocPath, "Submission")}</span>
                </div>
                <span className={`submission-state-pill ${reviewState.className}`}>
                  {reviewState.label}
                </span>
              </div>

              <div className="doc-details">
                <p><strong>Task:</strong> {assignment.task?.title}</p>
                <p><strong>Employee:</strong> {assignment.employee?.name} ({assignment.employee?.empId})</p>
                <p><strong>Submitted:</strong> {formatDateTime(assignment.lastSubmittedAt)}</p>
                <p><strong>Submissions:</strong> {assignment.submissionCount || 0}</p>
                {assignment.reviewedAt && (
                  <p><strong>Last Review:</strong> {formatDateTime(assignment.reviewedAt)}</p>
                )}
              </div>

              {assignment.adminReviewComments && assignment.status !== "COMPLETED" && (
                <div className="submission-feedback-box">
                  <div className="submission-feedback-label">Latest feedback sent</div>
                  <p>{assignment.adminReviewComments}</p>
                </div>
              )}

              {assignment.status === "COMPLETED" ? (
                <div className="submission-review-actions">
                  <button
                    className="doc-download-btn"
                    onClick={() => handleDownload("submission", assignment.id)}
                  >
                    <Download size={14} />
                    Download Submission
                  </button>
                  <div className="accepted-banner">
                    <BadgeCheck size={18} />
                    <span>Accepted by admin</span>
                  </div>
                </div>
              ) : (
                <div className="submission-review-actions">
                  <button
                    className="doc-download-btn"
                    onClick={() => handleDownload("submission", assignment.id)}
                  >
                    <Download size={14} />
                    Download Submission
                  </button>

                  {canReview && (
                    <>
                      <div className="submission-review-button-row">
                        <button
                          className="submission-action-btn secondary"
                          onClick={() =>
                            setExpandedReviewId((current) =>
                              current === assignment.id ? null : assignment.id
                            )
                          }
                          disabled={isBusy}
                        >
                          <MessageSquareMore size={14} />
                          {isReviewExpanded ? "Cancel Improvement Note" : "Request Improvements"}
                        </button>
                        <button
                          className="submission-action-btn primary"
                          onClick={() => handleReviewAction(assignment.id, "accept")}
                          disabled={isBusy}
                        >
                          <Send size={14} />
                          {actionState[assignment.id] === "accept" ? "Accepting..." : "Accept Work"}
                        </button>
                      </div>
                      {isReviewExpanded && (
                        <div className="submission-review-editor">
                          <textarea
                            className="submission-review-input"
                            placeholder="Add improvement suggestions, revision notes, or professional comments for the employee."
                            rows="4"
                            value={reviewDrafts[assignment.id] || ""}
                            onChange={(event) =>
                              setReviewDrafts((current) => ({
                                ...current,
                                [assignment.id]: event.target.value,
                              }))
                            }
                          />
                          <button
                            className="submission-action-btn secondary submit-note-btn"
                            onClick={() => handleReviewAction(assignment.id, "changes")}
                            disabled={isBusy}
                          >
                            <Send size={14} />
                            {actionState[assignment.id] === "changes" ? "Sending..." : "Send Improvement Note"}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>
      {submissionDocs.length === 0 && <div className="no-docs">No submission documents available</div>}
    </div>
  );

  if (loading) {
    return (
      <div className="docs-content">
        <div className="docs-horizontal-layout">
          {Array.from({ length: 2 }).map((_, colIndex) => (
            <div className="docs-section-half" key={colIndex}>
              <div className="docs-skeleton-header">
                <Skeleton width={180} height={18} />
              </div>
              <div className="docs-skeleton-grid">
                {Array.from({ length: 4 }).map((__, cardIndex) => (
                  <div className="docs-skeleton-card" key={cardIndex}>
                    <div className="docs-skeleton-row">
                      <Skeleton width={160} height={16} />
                    </div>
                    <Skeleton width="100%" height={12} style={{ marginBottom: 8 }} />
                    <Skeleton width="80%" height={12} style={{ marginBottom: 8 }} />
                    <Skeleton width="70%" height={12} />
                    <Skeleton width="100%" height={34} style={{ marginTop: 12, borderRadius: 8 }} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="docs-content">
      <div className="docs-tab-switcher">
        <button
          className={`docs-tab-btn ${activeSection === "assigned" ? "active" : ""}`}
          onClick={() => setActiveSection("assigned")}
        >
          Assigned Docs
        </button>
        <button
          className={`docs-tab-btn ${activeSection === "submission" ? "active" : ""}`}
          onClick={() => setActiveSection("submission")}
        >
          Submission Docs
        </button>
      </div>
      <div className="docs-single-layout">
        <div className="docs-section-half">
          {activeSection === "assigned" ? renderAssignmentDocs() : renderSubmissionDocs()}
        </div>
      </div>
    </div>
  );
};

export default AdminDocs;
