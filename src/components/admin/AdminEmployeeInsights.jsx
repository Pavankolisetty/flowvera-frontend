import { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Search,
  Timer,
  User,
} from "lucide-react";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

const AdminEmployeeInsights = ({ employees, assignments, authFetch, showNotification }) => {
  const [searchEmpId, setSearchEmpId] = useState("");
  const [selectedAttendance, setSelectedAttendance] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(monthKeyFromDate());
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [hoveredDay, setHoveredDay] = useState(null);

  const selectedEmployee = useMemo(() => {
    if (!searchEmpId) {
      return null;
    }

    const employee = employees.find((entry) => entry.empId === searchEmpId);
    if (!employee) {
      return null;
    }

    const empAssignments = assignments.filter((assignment) => assignment.employee?.empId === searchEmpId);
    return {
      ...employee,
      assignments: empAssignments,
      totalTasks: empAssignments.length,
      completedTasks: empAssignments.filter((assignment) => assignment.status === "COMPLETED").length,
      averageProgress:
        empAssignments.length > 0
          ? Math.round(
              empAssignments.reduce((sum, assignment) => sum + (assignment.progress || 0), 0) /
                empAssignments.length
            )
          : 0,
    };
  }, [assignments, employees, searchEmpId]);

  useEffect(() => {
    const loadAttendance = async () => {
      if (!searchEmpId) {
        setSelectedAttendance(null);
        return;
      }

      try {
        setAttendanceLoading(true);
        const response = await authFetch(
          `/api/admin/attendance/employee/${searchEmpId}?days=7&month=${selectedMonth}`
        );
        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || "Failed to load employee attendance details");
        }

        const data = await response.json();
        setSelectedAttendance(data);
      } catch (error) {
        showNotification(error.message || "Failed to load employee attendance", "error");
      } finally {
        setAttendanceLoading(false);
      }
    };

    loadAttendance();
  }, [authFetch, searchEmpId, selectedMonth, showNotification]);

  const joinedDate =
    selectedAttendance?.joinedDate ||
    (selectedEmployee?.createdAt ? String(selectedEmployee.createdAt).slice(0, 10) : null);

  const joinedDateLabel = useMemo(() => {
    if (!joinedDate) {
      return "Join date unavailable";
    }

    return new Date(`${joinedDate}T00:00:00`).toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, [joinedDate]);

  const monthTitle = useMemo(() => {
    const sourceMonth = selectedAttendance?.calendarMonth
      ? String(selectedAttendance.calendarMonth).slice(0, 7)
      : selectedMonth;

    return createMonthDate(sourceMonth).toLocaleDateString([], {
      month: "long",
      year: "numeric",
    });
  }, [selectedAttendance?.calendarMonth, selectedMonth]);

  const calendarSourceDays = useMemo(() => {
    if (selectedAttendance?.calendarDays?.length) {
      return selectedAttendance.calendarDays;
    }

    return buildFallbackCalendarDays(selectedMonth, joinedDate, selectedAttendance?.today);
  }, [joinedDate, selectedAttendance?.calendarDays, selectedAttendance?.today, selectedMonth]);

  const calendarCells = useMemo(() => {
    if (!calendarSourceDays.length) {
      return [];
    }

    const firstDay = new Date(`${calendarSourceDays[0].date}T00:00:00`).getDay();
    const leading = Array.from({ length: firstDay }, (_, index) => ({
      key: `leading-${index}`,
      empty: true,
    }));

    const populated = calendarSourceDays.map((day) => ({
      ...day,
      empty: false,
      meta: normalizeStatus(day.status, day.holidayName),
      dayNumber: Number(day.date.split("-")[2]),
    }));

    return [...leading, ...populated];
  }, [calendarSourceDays]);

  const todayMeta = normalizeStatus(selectedAttendance?.today?.status);
  const todayIso = new Date().toISOString().slice(0, 10);
  const legendItems = [
    { tone: "present", label: "Present", description: "Employee completed a full working day" },
    { tone: "partial", label: "Partial", description: "Employee logged some work but not a full day" },
    { tone: "absent", label: "Absent", description: "No attendance activity recorded for the day" },
    { tone: "weekly-off", label: "Weekly off", description: "Regular Sunday or scheduled day off" },
    { tone: "holiday", label: "National holiday", description: "Company or national holiday from calendar policy" },
  ];

  return (
    <div className="employee-insights-panel">
      <div className="search-box">
        <h3>
          <Search size={20} />
          Employee Performance, Attendance And Punctuality
        </h3>
        <div className="search-input-group">
          <select
            value={searchEmpId}
            onChange={(event) => {
              const nextEmpId = event.target.value;
              setSearchEmpId(nextEmpId);
              setSelectedMonth(monthKeyFromDate());
            }}
          >
            <option value="">Select an employee...</option>
            {employees
              .filter((emp) => emp.role !== "ADMIN")
              .map((emp) => (
                <option key={emp.empId} value={emp.empId}>
                  {emp.name} (ID: {emp.empId})
                </option>
              ))}
          </select>
        </div>
      </div>

      {!selectedEmployee ? (
        <div className="employee-insights-empty">
          Choose an employee to view task status, attendance summary, and monthly calendar.
        </div>
      ) : (
        <div className="employee-details">
          <div className="employee-header">
            <User size={24} />
            <div>
              <h4>{selectedEmployee.name}</h4>
              <p>
                ID: {selectedEmployee.empId}
                {selectedEmployee.designation ? ` • ${selectedEmployee.designation}` : ""}
              </p>
            </div>
          </div>

          <div className="employee-stats">
            <div className="stat-item">
              <span className="stat-label">Total Tasks</span>
              <span className="stat-value">{selectedEmployee.totalTasks}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Completed</span>
              <span className="stat-value">{selectedEmployee.completedTasks}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Average Progress</span>
              <span className="stat-value">{selectedEmployee.averageProgress}%</span>
            </div>
          </div>

          <div className="employee-insights-section">
            <div className="employee-insights-title">
              <ClipboardList size={18} />
              Task Statuses
            </div>
            <div className="task-status-grid">
              {selectedEmployee.assignments.length > 0 ? (
                selectedEmployee.assignments.map((assignment) => (
                  <div key={assignment.id} className="task-status-item">
                    <span className="task-title">{assignment.task?.title}</span>
                    <div className="task-progress">
                      <div className="progress-track-small">
                        <div
                          className="progress-bar-small"
                          style={{ width: `${assignment.progress || 0}%` }}
                        />
                      </div>
                      <span>{assignment.progress || 0}%</span>
                    </div>
                    <span className={`task-status-badge ${assignment.status?.toLowerCase()}`}>
                      {assignment.status}
                    </span>
                  </div>
                ))
              ) : (
                <div className="employee-insights-empty subtle">No tasks assigned to this employee yet.</div>
              )}
            </div>
          </div>

          <div className="attendance-detail-grid">
            <div className={`attendance-detail-card status-${todayMeta.tone}`}>
              <div className="attendance-detail-title">
                <CalendarClock size={16} />
                Today&apos;s Status
              </div>
              <strong>{todayMeta.label}</strong>
              <span>{formatMinutes(selectedAttendance?.today?.workedMinutes)}</span>
              <small>First login {formatDateTime(selectedAttendance?.today?.firstClockInAt)}</small>
            </div>
            <div className="attendance-detail-card">
              <div className="attendance-detail-title">
                <Timer size={16} />
                Weekly Time
              </div>
              <strong>{formatMinutes(selectedAttendance?.weeklyWorkedMinutes)}</strong>
              <span>{selectedAttendance?.activeSessionCount || 0} active session(s)</span>
              <small>
                Latest update {formatDateTime(selectedAttendance?.today?.lastActivityAt)}
              </small>
            </div>
          </div>

          <div className="employee-insights-calendar-card">
            <div className="employee-insights-calendar-header">
              <h4>
                <CalendarDays size={16} />
                Attendance Calendar
              </h4>
              <div className="employee-insights-calendar-nav">
                <button
                  type="button"
                  className="employee-insights-calendar-btn"
                  onClick={() => setSelectedMonth((current) => shiftMonth(current, -1))}
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="employee-insights-calendar-title">{monthTitle}</span>
                <button
                  type="button"
                  className="employee-insights-calendar-btn"
                  onClick={() => setSelectedMonth((current) => shiftMonth(current, 1))}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <div className="employee-insights-join-caption">
              Attendance starts from join date: <strong>{joinedDateLabel}</strong>
            </div>

              <div className="employee-insights-legend">
              {legendItems.map((item) => (
                <div key={item.tone} className="employee-insights-legend-item">
                  <span className={`employee-insights-legend-swatch ${item.tone}`}></span>
                  <div className="employee-insights-legend-copy">
                    <span>{item.label}</span>
                    <small>{item.description}</small>
                  </div>
                </div>
              ))}
            </div>

            {attendanceLoading ? (
              <div className="employee-insights-empty subtle">Loading employee calendar...</div>
            ) : (
              <div className="employee-insights-calendar-grid">
                {WEEKDAY_LABELS.map((label) => (
                  <div key={label} className="employee-insights-calendar-weekday">
                    {label}
                  </div>
                ))}

                {calendarCells.map((cell) =>
                  cell.empty ? (
                    <div key={cell.key} className="employee-insights-calendar-cell placeholder"></div>
                  ) : (
                    <div
                      key={cell.date}
                      className={`employee-insights-calendar-cell ${cell.meta.tone} ${
                        hoveredDay?.date === cell.date ? "hovered" : ""
                      } ${cell.beforeJoiningDate || cell.futureDate ? "disabled" : ""} ${
                        cell.date === todayIso ? "today" : ""
                      }`}
                      onMouseEnter={() => setHoveredDay(cell)}
                      onMouseLeave={() => setHoveredDay(null)}
                    >
                      <span className="employee-insights-calendar-day-number">{cell.dayNumber}</span>
                      {!cell.beforeJoiningDate && !cell.futureDate && !cell.holiday && cell.workedMinutes > 0 && (
                        <small className="employee-insights-calendar-hours">
                          {formatMinutes(cell.workedMinutes)}
                        </small>
                      )}
                      {cell.holiday && (
                        <small className="employee-insights-calendar-marker">
                          {cell.holidayName === "Weekly off" ? "Off" : "Holiday"}
                        </small>
                      )}

                      {hoveredDay?.date === cell.date && (
                        <div className="employee-insights-calendar-tooltip">
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
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>
            )}

            <div className="employee-insights-calendar-footnote">
              Admin can inspect daily punctuality, working duration, weekly off Sundays, and national holidays
              month by month from the employee join date onward.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminEmployeeInsights;
