import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BriefcaseBusiness, Mail, Phone, Search, Trash2, UsersRound, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/UserApprovalsPage.css";

export default function UserManagementPage() {
  const navigate = useNavigate();
  const { authFetch } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState("");
  const [confirmingId, setConfirmingId] = useState("");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadEmployees = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await authFetch("/api/admin/employees");
      const payload = await response.json().catch(() => []);
      if (!response.ok) {
        throw new Error(payload?.message || "Failed to load employees.");
      }
      setEmployees((payload || []).filter((employee) => employee.role === "USER" && employee.isApproved));
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const filteredEmployees = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return employees;
    }

    return employees.filter((employee) =>
      [employee.empId, employee.name, employee.email, employee.phone, employee.department, employee.designation]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery))
    );
  }, [employees, query]);

  const deleteEmployee = async (employee) => {
    setDeletingId(employee.empId);
    setError("");
    setMessage("");

    try {
      const response = await authFetch(`/api/admin/employees/${encodeURIComponent(employee.empId)}`, {
        method: "DELETE",
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message || "Failed to delete employee.");
      }
      setEmployees((current) => current.filter((item) => item.empId !== employee.empId));
      setMessage(`${employee.name} and related history were deleted.`);
      setConfirmingId("");
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setDeletingId("");
    }
  };

  return (
    <div className="user-approvals-page">
      <div className="user-approvals-shell">
        <div className="user-approvals-header">
          <button className="back-btn" onClick={() => navigate("/admin/dashboard")}>
            <ArrowLeft size={18} />
            Back to dashboard
          </button>
          <div>
            <span className="approvals-kicker">Admin Workflow</span>
            <h1>User Management</h1>
            <p>{filteredEmployees.length} employee{filteredEmployees.length === 1 ? "" : "s"}</p>
          </div>
        </div>

        {message && <div className="approval-banner success">{message}</div>}
        {error && <div className="approval-banner error">{error}</div>}

        <div className="management-toolbar">
          <div className="management-search">
            <Search size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search employees"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label="Clear search">
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="approval-empty">Loading employees...</div>
        ) : filteredEmployees.length === 0 ? (
          <div className="approval-empty">
            <UsersRound size={28} />
            <span>No employees found.</span>
          </div>
        ) : (
          <div className="management-grid">
            {filteredEmployees.map((employee) => {
              const confirming = confirmingId === employee.empId;
              const deleting = deletingId === employee.empId;

              return (
                <article key={employee.empId} className="management-card">
                  <div className="management-card-main">
                    <div className="management-avatar">
                      {String(employee.name || "U").slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="management-title-row">
                        <h2>{employee.name}</h2>
                        <span>{employee.empId}</span>
                      </div>
                      <div className="management-meta">
                        <span><Mail size={14} />{employee.email}</span>
                        <span><Phone size={14} />{employee.phone}</span>
                        <span><BriefcaseBusiness size={14} />{employee.department || "Department pending"} · {employee.designation || "Role pending"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="management-actions">
                    {confirming ? (
                      <>
                        <button
                          type="button"
                          className="delete-confirm-btn"
                          onClick={() => deleteEmployee(employee)}
                          disabled={deleting}
                        >
                          {deleting ? "Deleting..." : "Confirm delete"}
                        </button>
                        <button
                          type="button"
                          className="delete-cancel-btn"
                          onClick={() => setConfirmingId("")}
                          disabled={deleting}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="delete-employee-btn"
                        onClick={() => setConfirmingId(employee.empId)}
                      >
                        <Trash2 size={16} />
                        Delete
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
