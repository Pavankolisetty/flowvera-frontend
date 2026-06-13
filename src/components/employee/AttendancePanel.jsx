import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlarmClock,
  CalendarDays,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  LogIn,
  LogOut,
  Timer,
} from "lucide-react";
import { buildApiUrl } from "../../config/api";
import { useAuth } from "../../context/AuthContext";
import LeaveWfhApplicationModal from "./LeaveWfhApplicationModal";

const ATTENDANCE_SESSION_KEY = "flowvera_attendance_session";
const HEARTBEAT_INTERVAL_MS = 45000;
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const readSessionKey = () => {
  const existingKey = localStorage.getItem(ATTENDANCE_SESSION_KEY);
  if (existingKey) {
    return existingKey;
  }

  const generatedKey =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `attendance-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  localStorage.setItem(ATTENDANCE_SESSION_KEY, generatedKey);
  return generatedKey;
};

const formatMinutes = (minutes = 0) => {
  const safeMinutes = Math.max(0, minutes);
  const hours = Math.floor(safeMinutes / 60);
  const remainingMinutes = safeMinutes % 60;
  return `${hours}h ${remainingMinutes}m`;
};

const formatDateTime = (value) => {
  if (!value) {
    return "Not available";
  }

  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const monthKeyFromDate = (value) => {
  const date = value ? new Date(value) : new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const createMonthDate = (monthKey) => new Date(`${monthKey}-01T00:00:00`);

const shiftMonth = (monthKey, delta) => {
  const date = createMonthDate(monthKey);
  date.setMonth(date.getMonth() + delta);
  return monthKeyFromDate(date);
};

const buildFallbackCalendarDays = (monthKey, joinedDate, todayOverview) => {
  const monthDate = createMonthDate(monthKey);
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const joined = joinedDate ? new Date(`${joinedDate}T00:00:00`) : null;
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const fallbackDays = [];

  for (let day = 1; day <= totalDays; day += 1) {
    const currentDate = new Date(year, month, day);
    const isoDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const isBeforeJoiningDate = Boolean(joined && currentDate < joined);
    const isFutureDate = currentDate > todayOnly;
    const isSunday = currentDate.getDay() === 0;
    const isToday = todayOverview?.date === isoDate;
    const workedMinutes = isToday ? todayOverview?.workedMinutes || 0 : 0;

    let status = "ABSENT";
    let holiday = false;
    let holidayName = null;

    if (isBeforeJoiningDate) {
      status = "NOT_JOINED";
    } else if (isSunday && workedMinutes === 0) {
      status = "HOLIDAY";
      holiday = true;
      holidayName = "Weekly off";
    } else if (isFutureDate) {
      status = "UPCOMING";
    }

    fallbackDays.push({
      date: isoDate,
      status,
      workedMinutes,
      firstClockInAt: isToday ? todayOverview?.firstClockInAt || null : null,
      lastClockOutAt: isToday ? todayOverview?.lastClockOutAt || null : null,
      lastActivityAt: isToday ? todayOverview?.lastActivityAt || null : null,
      holidayName,
      holiday,
      beforeJoiningDate: isBeforeJoiningDate,
      futureDate: isFutureDate,
    });
  }

  return fallbackDays;
};

const normalizeStatus = (status, holidayName) => {
  switch (status) {
    case "CLOCKED_IN":
      return { label: "Clocked in", tone: "live" };
    case "PRESENT":
      return { label: "Present", tone: "present" };
    case "PARTIAL":
      return { label: "Partial", tone: "partial" };
    case "HOLIDAY":
      return {
        label: holidayName === "Weekly off" ? "Weekly off" : "National holiday",
        tone: holidayName === "Weekly off" ? "weekly-off" : "holiday",
      };
    case "UPCOMING":
      return { label: "Upcoming", tone: "upcoming" };
    case "NOT_JOINED":
      return { label: "Not joined", tone: "muted" };
    default:
      return { label: "Absent", tone: "absent" };
  }
};

const AttendancePanel = () => {
  const { authFetch, token } = useAuth();
  const [overview, setOverview] = useState(null);
  const [profileMeta, setProfileMeta] = useState(null);
  const [status, setStatus] = useState({ loading: true, saving: false, error: "" });
  const [selectedMonth, setSelectedMonth] = useState(monthKeyFromDate());
  const [hoveredDay, setHoveredDay] = useState(null);
  const [leaveModal, setLeaveModal] = useState({ open: false, date: "" });
  const intervalRef = useRef(null);
  const sessionKey = useMemo(() => readSessionKey(), []);

  const loadOverview = useCallback(
    async (monthValue = selectedMonth) => {
      try {
        const response = await authFetch(
          `/api/employee/attendance?sessionKey=${encodeURIComponent(sessionKey)}&month=${monthValue}`
        );

        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || "Failed to load attendance");
        }

        const data = await response.json();
        setOverview(data);
        setStatus((current) => ({ ...current, loading: false, error: "" }));
      } catch (error) {
        setStatus((current) => ({ ...current, loading: false, error: error.message }));
      }
    },
    [authFetch, selectedMonth, sessionKey]
  );

  useEffect(() => {
    loadOverview(selectedMonth);
  }, [loadOverview, selectedMonth]);

  useEffect(() => {
    let mounted = true;

    const loadProfileMeta = async () => {
      try {
        const response = await authFetch("/api/employee/me");
        if (!response.ok) {
          return;
        }

        const data = await response.json();
        if (mounted) {
          setProfileMeta(data);
        }
      } catch (error) {
        // Keep attendance usable even if profile metadata cannot be loaded.
      }
    };

    loadProfileMeta();
    return () => {
      mounted = false;
    };
  }, [authFetch]);

  useEffect(() => {
    const isActive = Boolean(overview?.currentSession?.active);

    if (!isActive) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return undefined;
    }

    intervalRef.current = setInterval(async () => {
      try {
        const response = await authFetch("/api/employee/attendance/heartbeat", {
          method: "POST",
          body: JSON.stringify({ sessionKey }),
        });

        if (!response.ok) {
          throw new Error("Heartbeat failed");
        }

        const data = await response.json();
        if (selectedMonth === monthKeyFromDate()) {
          setOverview(data);
        } else {
          loadOverview(selectedMonth);
        }
      } catch (error) {
        setStatus((current) => ({ ...current, error: "Attendance heartbeat stopped. Refreshing..." }));
        loadOverview(selectedMonth);
      }
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [overview?.currentSession?.active, authFetch, loadOverview, selectedMonth, sessionKey]);

  useEffect(() => {
    const sendClockOut = () => {
      if (!overview?.currentSession?.active || !token) {
        return;
      }

      fetch(buildApiUrl("/api/employee/attendance/clock-out"), {
        method: "POST",
        keepalive: true,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sessionKey }),
      }).catch(() => {});
    };

    window.addEventListener("pagehide", sendClockOut);
    return () => window.removeEventListener("pagehide", sendClockOut);
  }, [overview?.currentSession?.active, sessionKey, token]);

  const submitAttendanceAction = async (path) => {
    try {
      setStatus((current) => ({ ...current, saving: true, error: "" }));
      const response = await authFetch(path, {
        method: "POST",
        body: JSON.stringify({ sessionKey }),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Attendance action failed");
      }

      const data = await response.json();
      if (selectedMonth === monthKeyFromDate()) {
        setOverview(data);
      } else {
        loadOverview(selectedMonth);
      }
    } catch (error) {
      setStatus((current) => ({ ...current, error: error.message }));
    } finally {
      setStatus((current) => ({ ...current, saving: false, loading: false }));
    }
  };

  const todayStatus = normalizeStatus(overview?.today?.status);
  const resolvedJoinedDate =
    overview?.joinedDate ||
    (profileMeta?.createdAt ? String(profileMeta.createdAt).slice(0, 10) : null);
  const joinedMonth = resolvedJoinedDate ? monthKeyFromDate(resolvedJoinedDate) : monthKeyFromDate();
  const currentMonth = monthKeyFromDate();

  const monthTitle = useMemo(() => {
    const sourceMonth = overview?.calendarMonth
      ? String(overview.calendarMonth).slice(0, 7)
      : selectedMonth;

    return createMonthDate(sourceMonth).toLocaleDateString([], {
      month: "long",
      year: "numeric",
    });
  }, [overview?.calendarMonth, selectedMonth]);

  const joinedDateLabel = useMemo(() => {
    if (!resolvedJoinedDate) {
      return "Join date unavailable";
    }

    return new Date(`${resolvedJoinedDate}T00:00:00`).toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, [resolvedJoinedDate]);

  const calendarSourceDays = useMemo(() => {
    if (overview?.calendarDays?.length) {
      return overview.calendarDays;
    }

    return buildFallbackCalendarDays(selectedMonth, resolvedJoinedDate, overview?.today);
  }, [overview?.calendarDays, overview?.today, resolvedJoinedDate, selectedMonth]);

  const calendarCells = useMemo(() => {
    const days = calendarSourceDays || [];
    if (!days.length) {
      return [];
    }

    const firstDay = new Date(`${days[0].date}T00:00:00`).getDay();
    const leading = Array.from({ length: firstDay }, (_, index) => ({
      key: `leading-${index}`,
      empty: true,
    }));

    const populated = days.map((day) => ({
      ...day,
      empty: false,
      meta: normalizeStatus(day.status, day.holidayName),
      dayNumber: Number(day.date.split("-")[2]),
    }));

    return [...leading, ...populated];
  }, [calendarSourceDays]);

  const legendItems = [
    { tone: "present", label: "Present" },
    { tone: "partial", label: "Partial" },
    { tone: "absent", label: "Absent" },
    { tone: "weekly-off", label: "Weekly off" },
    { tone: "holiday", label: "National holiday" },
  ];

  const canApplyLeaveForDate = (cell) => {
    if (!cell?.date || cell.beforeJoiningDate) {
      return false;
    }
    const target = new Date(`${cell.date}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return target >= today;
  };

  if (status.loading) {
    return (
      <div className="employee-panel attendance-panel">
        <div className="panel-header">
          <h3>Attendance</h3>
          <span className="panel-badge subtle">Loading</span>
        </div>

        <div className="attendance-skeleton-card">
          <div className="attendance-skeleton-top">
            <div className="attendance-skeleton-block eyebrow"></div>
            <div className="attendance-skeleton-block headline"></div>
            <div className="attendance-skeleton-block subline"></div>
          </div>
          <div className="attendance-skeleton-block action"></div>
        </div>

        <div className="attendance-skeleton-metrics">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="attendance-skeleton-metric">
              <div className="attendance-skeleton-block icon"></div>
              <div className="attendance-skeleton-block label"></div>
              <div className="attendance-skeleton-block value"></div>
            </div>
          ))}
        </div>

        <div className="attendance-skeleton-note"></div>

        <div className="attendance-history attendance-history-skeleton">
          <div className="attendance-calendar-header">
            <h4>
              <CalendarDays size={14} />
              Attendance Calendar
            </h4>
            <div className="attendance-calendar-nav">
              <div className="attendance-skeleton-circle"></div>
              <div className="attendance-skeleton-block month"></div>
              <div className="attendance-skeleton-circle"></div>
            </div>
          </div>

          <div className="attendance-skeleton-block join"></div>

          <div className="attendance-skeleton-legend">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="attendance-skeleton-legend-item">
                <div className="attendance-skeleton-dot"></div>
                <div className="attendance-skeleton-block legend"></div>
              </div>
            ))}
          </div>

          <div className="attendance-skeleton-weekdays">
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} className="attendance-skeleton-weekday">
                {label}
              </div>
            ))}
          </div>

          <div className="attendance-skeleton-calendar-grid">
            {Array.from({ length: 35 }).map((_, index) => (
              <div key={index} className="attendance-skeleton-cell"></div>
            ))}
          </div>

          <div className="attendance-skeleton-block footnote"></div>
        </div>
      </div>
    );
  }

  if (status.error && !overview) {
    return (
      <div className="employee-panel attendance-panel">
        <div className="panel-header">
          <h3>Attendance</h3>
          <span className="panel-badge subtle">Unavailable</span>
        </div>
        <div className="employee-error">{status.error}</div>
      </div>
    );
  }

  return (
    <div className="employee-panel attendance-panel">
      <div className="panel-header">
        <h3>Attendance</h3>
        <span className={`panel-badge attendance-badge ${todayStatus.tone}`}>
          {todayStatus.label}
        </span>
      </div>

      <div className={`attendance-live-card ${todayStatus.tone}`}>
        <div>
          <span className="attendance-live-label">Today</span>
          <strong>{formatMinutes(overview?.today?.workedMinutes)}</strong>
          <p>
            {overview?.today?.currentlyWorking
              ? `Active session${overview?.activeSessionCount > 1 ? "s" : ""}: ${overview?.activeSessionCount}`
              : "Tracked working time for the day"}
          </p>
        </div>

        <button
          type="button"
          className={`attendance-action-btn ${overview?.currentSession?.active ? "clock-out" : "clock-in"}`}
          onClick={() =>
            submitAttendanceAction(
              overview?.currentSession?.active
                ? "/api/employee/attendance/clock-out"
                : "/api/employee/attendance/clock-in"
            )
          }
          disabled={status.saving}
        >
          {overview?.currentSession?.active ? <LogOut size={16} /> : <LogIn size={16} />}
          {status.saving
            ? "Saving..."
            : overview?.currentSession?.active
              ? "Clock Out"
              : "Clock In"}
        </button>
      </div>

      <div className="attendance-metrics">
        <div className="attendance-metric-card">
          <Timer size={16} />
          <span>Monthly tracked</span>
          <strong>
            {formatMinutes(
              (overview?.calendarDays || []).reduce(
                (total, day) => total + (day.futureDate || day.beforeJoiningDate ? 0 : day.workedMinutes || 0),
                0
              )
            )}
          </strong>
        </div>
        <div className="attendance-metric-card">
          <AlarmClock size={16} />
          <span>First activity</span>
          <strong>{formatDateTime(overview?.today?.firstClockInAt)}</strong>
        </div>
        <div className="attendance-metric-card">
          <Activity size={16} />
          <span>Last update</span>
          <strong>{formatDateTime(overview?.today?.lastActivityAt)}</strong>
        </div>
      </div>

      {overview?.currentSession?.active && (
        <div className="attendance-session-note">
          <strong>Current session:</strong> running since{" "}
          {formatDateTime(overview.currentSession.clockInAt)}.
        </div>
      )}

      {status.error && <div className="employee-error">{status.error}</div>}

      <div className="attendance-history">
        <div className="attendance-calendar-header">
          <h4>
            <CalendarDays size={14} />
            Attendance Calendar
          </h4>

          <div className="attendance-calendar-nav">
            <button
              type="button"
              className="attendance-calendar-btn"
              onClick={() => setSelectedMonth((current) => shiftMonth(current, -1))}
              disabled={selectedMonth <= joinedMonth}
            >
              <ChevronLeft size={16} />
            </button>
            <span className="attendance-calendar-title">{monthTitle}</span>
            <button
              type="button"
              className="attendance-calendar-btn"
              onClick={() => setSelectedMonth((current) => shiftMonth(current, 1))}
              disabled={false}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="attendance-join-caption">
          Attendance starts from your join date: <strong>{joinedDateLabel}</strong>
        </div>

        <div className="attendance-legend">
          {legendItems.map((item) => (
            <div key={item.tone} className="attendance-legend-item">
              <span className={`attendance-legend-swatch ${item.tone}`}></span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>

        <div className="attendance-calendar-grid">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="attendance-calendar-weekday">
              {label}
            </div>
          ))}

          {calendarCells.map((cell) =>
            cell.empty ? (
              <div key={cell.key} className="attendance-calendar-cell placeholder"></div>
            ) : (
              <div
                key={cell.date}
                className={`attendance-calendar-cell ${cell.meta.tone} ${
                  hoveredDay?.date === cell.date ? "hovered" : ""
                } ${cell.beforeJoiningDate || cell.futureDate ? "disabled" : ""}`}
                onMouseEnter={() => setHoveredDay(cell)}
                onMouseLeave={() => setHoveredDay(null)}
              >
                <span className="attendance-calendar-day-number">{cell.dayNumber}</span>
                {!cell.beforeJoiningDate && !cell.futureDate && !cell.holiday && cell.workedMinutes > 0 && (
                  <small className="attendance-calendar-hours">{formatMinutes(cell.workedMinutes)}</small>
                )}
                {cell.holiday && <small className="attendance-calendar-marker">Holiday</small>}

                {hoveredDay?.date === cell.date && (
                  <div className="attendance-calendar-tooltip">
                    <strong>{cell.meta.label}</strong>
                    <span>{cell.holidayName || formatMinutes(cell.workedMinutes)}</span>
                    {!cell.beforeJoiningDate && !cell.futureDate && (
                      <>
                        <small>Worked: {formatMinutes(cell.workedMinutes)}</small>
                        <small>First login: {formatDateTime(cell.firstClockInAt)}</small>
                        <small>
                          {cell.lastClockOutAt ? "Last logout" : "Last activity"}:{" "}
                          {formatDateTime(cell.lastClockOutAt || cell.lastActivityAt)}
                        </small>
                      </>
                    )}
                    {canApplyLeaveForDate(cell) && (
                      <button
                        type="button"
                        className="attendance-apply-leave-btn"
                        onClick={(event) => {
                          event.stopPropagation();
                          setLeaveModal({ open: true, date: cell.date });
                        }}
                      >
                        <CalendarPlus size={14} />
                        Apply Leave / WFH
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          )}
        </div>

        <div className="attendance-calendar-footnote">
          Tracking begins from your join date shown in Flowvera. National holidays are overlaid from the
          configured Google Calendar feed when available.
        </div>
      </div>

      <LeaveWfhApplicationModal
        open={leaveModal.open}
        initialDate={leaveModal.date}
        onClose={() => setLeaveModal({ open: false, date: "" })}
        onSubmitted={() => loadOverview(selectedMonth)}
      />
    </div>
  );
};

export default AttendancePanel;
