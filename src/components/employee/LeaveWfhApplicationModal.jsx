import { useEffect, useMemo, useState } from "react";
import { CheckCircle, Loader2, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { LeaveIcon, WfhIcon } from "./LeaveWfhIcons";

const initialForm = {
  requestType: "LEAVE",
  startDate: "",
  endDate: "",
  dayPart: "FULL_DAY",
  reason: "",
  dependencyEmpIds: [],
};

const formatNumber = (value) => Number(value || 0).toFixed(1).replace(/\.0$/, "");

export default function LeaveWfhApplicationModal({ open, initialDate, onClose, onSubmitted }) {
  const { authFetch } = useAuth();
  const [balance, setBalance] = useState(null);
  const [requests, setRequests] = useState([]);
  const [dependencies, setDependencies] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState({ loading: false, submitting: false, error: "", success: "" });

  useEffect(() => {
    if (!open) {
      return;
    }

    const date = initialDate || "";
    setForm({ ...initialForm, startDate: date, endDate: date });
    setStatus({ loading: true, submitting: false, error: "", success: "" });

    const loadData = async () => {
      try {
        const [summaryResponse, requestsResponse, dependenciesResponse] = await Promise.all([
          authFetch("/api/employee/leave/summary"),
          authFetch("/api/employee/leave/requests"),
          authFetch("/api/employee/leave/eligible-dependencies"),
        ]);

        if (!summaryResponse.ok || !requestsResponse.ok || !dependenciesResponse.ok) {
          throw new Error("Failed to load Leave/WFH details.");
        }

        setBalance(await summaryResponse.json());
        setRequests(await requestsResponse.json());
        setDependencies(await dependenciesResponse.json());
        setStatus({ loading: false, submitting: false, error: "", success: "" });
      } catch (error) {
        setStatus({ loading: false, submitting: false, error: error.message, success: "" });
      }
    };

    loadData();
  }, [authFetch, initialDate, open]);

  useEffect(() => {
    if (form.dayPart !== "FULL_DAY" && form.endDate !== form.startDate) {
      setForm((current) => ({ ...current, endDate: current.startDate }));
    }
  }, [form.dayPart, form.endDate, form.startDate]);

  const estimatedDays = useMemo(() => {
    if (!form.startDate || !form.endDate) {
      return 0;
    }
    if (form.dayPart !== "FULL_DAY") {
      return 0.5;
    }
    const start = new Date(`${form.startDate}T00:00:00`);
    const end = new Date(`${form.endDate}T00:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
      return 0;
    }
    return Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
  }, [form.dayPart, form.endDate, form.startDate]);

  const selectedQuota = form.requestType === "WFH"
    ? {
        label: "WFH",
        available: balance?.wfhAvailable,
        monthlyLimit: balance?.wfhMonthlyLimit,
      }
    : {
        label: "Leave",
        available: balance?.leaveAvailable ?? balance?.available,
        monthlyLimit: balance?.leaveMonthlyLimit,
      };

  const toggleDependency = (empId) => {
    setForm((current) => {
      const selected = new Set(current.dependencyEmpIds);
      if (selected.has(empId)) {
        selected.delete(empId);
      } else if (selected.size < 3) {
        selected.add(empId);
      }
      return { ...current, dependencyEmpIds: Array.from(selected) };
    });
  };

  const submitRequest = async (event) => {
    event.preventDefault();
    setStatus((current) => ({ ...current, submitting: true, error: "", success: "" }));

    try {
      const response = await authFetch("/api/employee/leave/requests", {
        method: "POST",
        body: JSON.stringify(form),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message || "Failed to submit Leave/WFH request.");
      }

      setRequests((current) => [payload, ...current]);
      setStatus({
        loading: false,
        submitting: false,
        error: "",
        success: "Request submitted successfully. Approval email has been sent.",
      });
      onSubmitted?.(payload);

      const summaryResponse = await authFetch("/api/employee/leave/summary");
      if (summaryResponse.ok) {
        setBalance(await summaryResponse.json());
      }
    } catch (error) {
      setStatus((current) => ({ ...current, submitting: false, error: error.message, success: "" }));
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div className="modal-overlay leave-modal-overlay">
      <div className="modal-content leave-modal-content">
        <div className="modal-header">
          <div>
            <span className="leave-modal-kicker">People Operations</span>
            <h3>Apply Leave / WFH</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close Leave/WFH form">
            <X size={18} />
          </button>
        </div>

        {status.loading ? (
          <div className="leave-loading">
            <Loader2 size={22} className="leave-spin" />
            Loading leave balance and team dependencies...
          </div>
        ) : (
          <>
            <div className="leave-balance-grid">
              {[
                {
                  title: "Leave",
                  icon: LeaveIcon,
                  allocated: balance?.leaveAllocated ?? balance?.allocated,
                  monthly: balance?.leaveMonthlyLimit,
                  used: balance?.leaveUsed ?? balance?.used,
                  pending: balance?.leavePending ?? balance?.pending,
                  available: balance?.leaveAvailable ?? balance?.available,
                },
                {
                  title: "WFH",
                  icon: WfhIcon,
                  allocated: balance?.wfhAllocated,
                  monthly: balance?.wfhMonthlyLimit,
                  used: balance?.wfhUsed,
                  pending: balance?.wfhPending,
                  available: balance?.wfhAvailable,
                },
              ].map((quota) => (
                <div className="leave-balance-card" key={quota.title}>
                  <div className="leave-balance-card-header">
                    <span>
                      <quota.icon size={15} />
                      {quota.title} Balance
                    </span>
                    <small>{formatNumber(quota.monthly)} / month</small>
                  </div>
                  <strong>{formatNumber(quota.available)}</strong>
                  <div className="leave-balance-meta">
                    <span>{formatNumber(quota.allocated)} yearly</span>
                    <span>{formatNumber(quota.used)} used</span>
                    <span>{formatNumber(quota.pending)} pending</span>
                  </div>
                </div>
              ))}
            </div>

            {status.error && <div className="employee-error">{status.error}</div>}
            {status.success && (
              <div className="leave-success">
                <CheckCircle size={16} />
                {status.success}
              </div>
            )}

            <form className="leave-form" onSubmit={submitRequest}>
              <div className="leave-form-row">
                <label>
                  Request Type
                  <select
                    value={form.requestType}
                    onChange={(event) => setForm((current) => ({ ...current, requestType: event.target.value }))}
                  >
                    <option value="LEAVE">Leave</option>
                    <option value="WFH">Work From Home</option>
                  </select>
                </label>

                <label>
                  Duration
                  <select
                    value={form.dayPart}
                    onChange={(event) => setForm((current) => ({ ...current, dayPart: event.target.value }))}
                  >
                    <option value="FULL_DAY">Full day</option>
                    <option value="HALF_DAY_MORNING">Half day morning</option>
                    <option value="HALF_DAY_AFTERNOON">Half day afternoon</option>
                  </select>
                </label>
              </div>

              <div className="leave-form-row">
                <label>
                  Start Date
                  <input
                    type="date"
                    value={form.startDate}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        startDate: event.target.value,
                        endDate: current.endDate || event.target.value,
                      }))
                    }
                    required
                  />
                </label>

                <label>
                  End Date
                  <input
                    type="date"
                    value={form.endDate}
                    min={form.startDate || new Date().toISOString().slice(0, 10)}
                    disabled={form.dayPart !== "FULL_DAY"}
                    onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))}
                    required
                  />
                </label>
              </div>

              {form.dayPart !== "FULL_DAY" && form.endDate !== form.startDate && (
                <input type="hidden" value={form.startDate} readOnly />
              )}

              <label>
                Reason
                <textarea
                  rows="4"
                  value={form.reason}
                  onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))}
                  placeholder="Add a clear reason for the request."
                  required
                />
              </label>

              <div className="leave-dependencies">
                <div className="leave-section-title">
                  <span>Dependency Employees</span>
                  <small>{form.dependencyEmpIds.length}/3 selected</small>
                </div>
                <div className="leave-dependency-grid">
                  {dependencies.length === 0 ? (
                    <div className="leave-empty">No dependency employees available in your department.</div>
                  ) : (
                    dependencies.map((employee) => (
                      <button
                        key={employee.empId}
                        type="button"
                        className={`leave-dependency-chip ${
                          form.dependencyEmpIds.includes(employee.empId) ? "selected" : ""
                        }`}
                        onClick={() => toggleDependency(employee.empId)}
                      >
                        <strong>{employee.name}</strong>
                        <span>{employee.designation || employee.empId}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className="leave-submit-strip">
                <div>
                  <span>Estimated total</span>
                  <strong>{formatNumber(estimatedDays)} day{estimatedDays === 1 ? "" : "s"}</strong>
                  <small>
                    {selectedQuota.label} available: {formatNumber(selectedQuota.available)} yearly,
                    {" "}monthly limit: {formatNumber(selectedQuota.monthlyLimit)}
                  </small>
                </div>
                <button type="submit" className="leave-submit-btn" disabled={status.submitting}>
                  {status.submitting ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </form>

            <div className="leave-request-history">
              <div className="leave-section-title">
                <span>Recent Requests</span>
              </div>
              {requests.slice(0, 4).map((request) => (
                <div key={request.id} className={`leave-history-item ${String(request.status).toLowerCase()}`}>
                  {request.requestType === "WFH" ? <WfhIcon size={16} /> : <LeaveIcon size={16} />}
                  <div>
                    <strong>{request.requestType} · {request.status}</strong>
                    <span>{request.startDate} to {request.endDate} · {formatNumber(request.totalDays)} day(s)</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
