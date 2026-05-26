import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, ShieldCheck, UsersRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { DEPARTMENTS, DEPARTMENT_ROLE_OPTIONS } from "../constants/organization";
import "../styles/UserApprovalsPage.css";

export default function UserApprovalsPage() {
  const navigate = useNavigate();
  const { authFetch } = useAuth();
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [approvalDrafts, setApprovalDrafts] = useState({});

  const loadPendingUsers = async () => {
    setLoading(true);
    try {
      const response = await authFetch("/api/admin/pending-users");
      const payload = await response.json().catch(() => []);
      if (!response.ok) {
        throw new Error(payload?.message || "Failed to load pending users.");
      }
      setPendingUsers(payload || []);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPendingUsers();
  }, []);

  const handleDraftChange = (userId, field, value) => {
    setApprovalDrafts((current) => {
      const next = {
        ...current,
        [userId]: {
          department: "",
          designation: "",
          canAssignTask: false,
          ...current[userId],
          [field]: value,
        },
      };
      if (field === "department") {
        next[userId].designation = "";
      }
      return next;
    });
  };

  const approveUser = async (userId) => {
    const draft = approvalDrafts[userId] || {};
    if (!draft.department || !draft.designation) {
      setError("Select department and role before approving.");
      return;
    }

    setSubmittingId(userId);
    setError("");
    setMessage("");

    try {
      const response = await authFetch(`/api/admin/approve-user/${userId}`, {
        method: "POST",
        body: JSON.stringify(draft),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message || "Failed to approve user.");
      }
      setMessage(`Approved ${payload?.name || "user"} with employee ID ${payload?.empId || ""}.`);
      setPendingUsers((current) => current.filter((user) => user.empId !== userId));
    } catch (approveError) {
      setError(approveError.message);
    } finally {
      setSubmittingId("");
    }
  };

  const pendingCountLabel = useMemo(
    () => `${pendingUsers.length} pending registration${pendingUsers.length === 1 ? "" : "s"}`,
    [pendingUsers.length]
  );

  return (
    <div className="user-approvals-page">
      <div className="user-approvals-shell">
        <div className="user-approvals-header">
          <button className="back-btn" onClick={() => navigate("/admin/dashboard")}>
            <ArrowLeft size={18} />
            Back to dashboard
          </button>
          <button className="back-btn" onClick={() => navigate("/admin/user-management")}>
            <UsersRound size={18} />
            User Management
          </button>
          <div>
            <span className="approvals-kicker">Admin Workflow</span>
            <h1>User Approvals</h1>
            <p>{pendingCountLabel}</p>
          </div>
        </div>

        {message && <div className="approval-banner success">{message}</div>}
        {error && <div className="approval-banner error">{error}</div>}

        {loading ? (
          <div className="approval-empty">Loading pending registrations...</div>
        ) : pendingUsers.length === 0 ? (
          <div className="approval-empty">
            <ShieldCheck size={28} />
            <span>No pending users right now.</span>
          </div>
        ) : (
          <div className="approval-grid">
            {pendingUsers.map((user) => {
              const draft = approvalDrafts[user.empId] || {
                department: "",
                designation: "",
                canAssignTask: false,
              };
              const availableRoles = DEPARTMENT_ROLE_OPTIONS[draft.department] || [];
              const canApprove = Boolean(draft.department && draft.designation);

              return (
                <article key={user.empId} className="approval-card">
                  <div className="approval-card-header">
                    <div>
                      <h2>{user.name}</h2>
                      <p>{user.email}</p>
                    </div>
                    <span className="pending-badge">Pending</span>
                  </div>

                  <div className="approval-meta">
                    <span>{user.phone}</span>
                    <span>Email verified</span>
                    <span>Phone verified</span>
                  </div>

                  <div className="approval-form-grid">
                    <label>
                      Department
                      <select
                        value={draft.department}
                        onChange={(event) => handleDraftChange(user.empId, "department", event.target.value)}
                      >
                        <option value="">Select department</option>
                        {DEPARTMENTS.map((department) => (
                          <option key={department} value={department}>
                            {department}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      Role
                      <select
                        value={draft.designation}
                        onChange={(event) => handleDraftChange(user.empId, "designation", event.target.value)}
                        disabled={!draft.department}
                      >
                        <option value="">Select role</option>
                        {availableRoles.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <label className="approval-checkbox">
                    <input
                      type="checkbox"
                      checked={Boolean(draft.canAssignTask)}
                      onChange={(event) => handleDraftChange(user.empId, "canAssignTask", event.target.checked)}
                    />
                    <span>Allow this user to assign tasks</span>
                  </label>

                  <button
                    className="approve-btn"
                    onClick={() => approveUser(user.empId)}
                    disabled={!canApprove || submittingId === user.empId}
                  >
                    {submittingId === user.empId ? "Approving..." : "Approve user"}
                  </button>

                  {!canApprove && (
                    <div className="approval-hint">
                      Approval unlocks after department and role are selected.
                    </div>
                  )}
                  {canApprove && (
                    <div className="approval-hint ready">
                      <CheckCircle2 size={14} />
                      Approval will generate the department-based employee ID automatically.
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
