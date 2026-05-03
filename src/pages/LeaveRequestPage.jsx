import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarCheck, Home, Send } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import EmployeeHeader from "../components/EmployeeHeader";
import FeedbackForm from "../components/shared/FeedbackForm";
import { useAuth } from "../context/AuthContext";
import "../styles/EmployeeDashboard.css";

const todayKey = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const requestTypes = [
  { value: "WFH", label: "Work from home", icon: Home },
  { value: "CASUAL", label: "Casual leave", icon: CalendarCheck },
  { value: "SICK", label: "Sick leave", icon: CalendarCheck },
];

export default function LeaveRequestPage() {
  const { authFetch, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    date: searchParams.get("date") || todayKey(),
    type: "WFH",
    reason: "",
  });
  const [status, setStatus] = useState({ loading: true, saving: false, error: "", success: "" });

  useEffect(() => {
    let mounted = true;
    const loadProfile = async () => {
      try {
        const response = await authFetch("/api/employee/me");
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(payload?.message || "Failed to load profile");
        }
        if (mounted) {
          setProfile(payload);
          setStatus((current) => ({ ...current, loading: false }));
        }
      } catch (error) {
        if (mounted) {
          setStatus((current) => ({ ...current, loading: false, error: error.message }));
        }
      }
    };
    loadProfile();
    return () => {
      mounted = false;
    };
  }, [authFetch]);

  const selectedType = useMemo(
    () => requestTypes.find((type) => type.value === form.type) || requestTypes[0],
    [form.type]
  );

  const submitRequest = async (event) => {
    event.preventDefault();
    if (form.date < todayKey()) {
      setStatus((current) => ({ ...current, error: "Past dates are not eligible for leave or WFH requests." }));
      return;
    }
    if (form.reason.trim().length < 5) {
      setStatus((current) => ({ ...current, error: "Please add a clear reason." }));
      return;
    }

    try {
      setStatus((current) => ({ ...current, saving: true, error: "", success: "" }));
      const response = await authFetch("/api/employee/leave-requests", {
        method: "POST",
        body: JSON.stringify({
          date: form.date,
          type: form.type,
          reason: form.reason.trim(),
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message || "Failed to submit leave request");
      }
      setStatus({
        loading: false,
        saving: false,
        error: "",
        success: "Your request has been sent to your reporting manager.",
      });
    } catch (error) {
      setStatus((current) => ({ ...current, saving: false, error: error.message }));
    }
  };

  const SelectedIcon = selectedType.icon;

  return (
    <div className="employee-dashboard">
      <div className="dashboard-bg" aria-hidden="true"></div>
      <div className="employee-shell">
        <EmployeeHeader name={user?.name} taskNotifications={{}} />

        <section className="leave-request-hero">
          <button type="button" className="leave-back-btn" onClick={() => navigate("/employee/dashboard")}>
            <ArrowLeft size={18} />
            Dashboard
          </button>
          <div className="leave-request-title">
            <span>Leave Workflow</span>
            <h1>Apply for leave or WFH</h1>
            <p>
              Reporting manager:{" "}
              <strong>
                {profile?.reportingManagerName
                  ? `${profile.reportingManagerName} (${profile.reportingManagerEmpId})`
                  : status.loading
                    ? "Loading..."
                    : "Not assigned"}
              </strong>
            </p>
          </div>
        </section>

        <form className="leave-request-card" onSubmit={submitRequest}>
          <div className="leave-request-preview">
            <span className="leave-request-icon">
              <SelectedIcon size={28} />
            </span>
            <div>
              <span>{selectedType.label}</span>
              <strong>{form.date}</strong>
            </div>
          </div>

          <div className="leave-form-grid">
            <label>
              Date
              <input
                type="date"
                min={todayKey()}
                value={form.date}
                onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
              />
            </label>

            <label>
              Request type
              <select
                value={form.type}
                onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}
              >
                {requestTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="leave-reason-field">
            Reason
            <textarea
              value={form.reason}
              maxLength={800}
              onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))}
              placeholder="Write the reason for this request"
            />
          </label>

          {status.error && <div className="employee-error">{status.error}</div>}
          {status.success && <div className="leave-success">{status.success}</div>}

          <button
            type="submit"
            className="leave-submit-btn"
            disabled={status.saving || !profile?.reportingManagerEmpId}
          >
            <Send size={16} />
            {status.saving ? "Sending..." : "Request Leave"}
          </button>
        </form>
      </div>
      <FeedbackForm userType="employee" />
    </div>
  );
}
