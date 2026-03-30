import { useEffect, useMemo, useState } from "react";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { Activity, PieChart, TrendingUp } from "lucide-react";

const formatMinutes = (minutes = 0) => {
  const hours = Math.floor(Math.max(minutes, 0) / 60);
  const remainingMinutes = Math.max(minutes, 0) % 60;
  return `${hours}h ${remainingMinutes}m`;
};

const inferProgressAsOf = (assignment, cutoffDate) => {
  const cutoff = new Date(cutoffDate);
  cutoff.setHours(23, 59, 59, 999);
  const today = new Date();
  const isCurrentOrFutureCutoff =
    cutoff.getFullYear() > today.getFullYear() ||
    (cutoff.getFullYear() === today.getFullYear() &&
      (cutoff.getMonth() > today.getMonth() ||
        (cutoff.getMonth() === today.getMonth() && cutoff.getDate() >= today.getDate())));

  const assignedAt = assignment.assignedAt ? new Date(assignment.assignedAt) : null;
  if (assignedAt && assignedAt > cutoff) {
    return null;
  }

  const history = Array.isArray(assignment.progressHistory) ? assignment.progressHistory : [];
  const latestHistory = history
    .filter((entry) => entry.recordedAt && new Date(entry.recordedAt) <= cutoff)
    .sort((left, right) => new Date(left.recordedAt) - new Date(right.recordedAt))
    .at(-1);

  if (latestHistory) {
    return latestHistory.progress ?? 0;
  }

  if (assignment.reviewedAt && new Date(assignment.reviewedAt) <= cutoff) {
    if (assignment.status === "COMPLETED") {
      return 100;
    }
    if (assignment.status === "CHANGES_REQUESTED") {
      return 85;
    }
  }

  if (assignment.lastSubmittedAt && new Date(assignment.lastSubmittedAt) <= cutoff) {
    return 90;
  }

  if (isCurrentOrFutureCutoff) {
    return assignment.progress ?? 0;
  }

  return 0;
};

const statusMeta = (status) => {
  switch (status) {
    case "CLOCKED_IN":
      return { label: "Clocked in", tone: "live" };
    case "PRESENT":
      return { label: "Present", tone: "present" };
    case "PARTIAL":
      return { label: "Partial", tone: "partial" };
    default:
      return { label: "Absent", tone: "absent" };
  }
};

const statusOrder = {
  CLOCKED_IN: 0,
  PRESENT: 1,
  PARTIAL: 2,
  ABSENT: 3,
};

const getChartX = (index) => 50 + index * 60;
const getChartY = (value) => 180 - value * 1.3;

const AdminAnalytics = ({ employees, assignments, authFetch, showNotification, dataLoading }) => {
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const nonAdminEmployees = useMemo(
    () => employees.filter((employee) => employee.role !== "ADMIN"),
    [employees]
  );

  const performanceData = useMemo(() => {
    const empPerformance = {};

    nonAdminEmployees.forEach((employee) => {
      empPerformance[employee.empId] = {
        empId: employee.empId,
        name: employee.name,
        totalTasks: 0,
        completedTasks: 0,
        averageProgress: 0,
        totalProgress: 0,
      };
    });

    assignments.forEach((assignment) => {
      const empId = assignment.employee?.empId;
      if (empPerformance[empId]) {
        empPerformance[empId].totalTasks += 1;
        empPerformance[empId].totalProgress += assignment.progress || 0;
        if (assignment.status === "COMPLETED") {
          empPerformance[empId].completedTasks += 1;
        }
      }
    });

    Object.values(empPerformance).forEach((emp) => {
      emp.averageProgress = emp.totalTasks > 0 ? Math.round(emp.totalProgress / emp.totalTasks) : 0;
    });

    return Object.values(empPerformance);
  }, [assignments, nonAdminEmployees]);

  const performanceTrend = useMemo(() => {
    const trendData = [];
    const today = new Date();
    const employeePerformanceMap = new Map(
      nonAdminEmployees.map((employee) => [
        employee.empId,
        {
          name: employee.name,
          totalTasks: 0,
          totalProgress: 0,
        },
      ])
    );

    for (let i = 6; i >= 0; i -= 1) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const employeeDailyProgress = new Map(
        Array.from(employeePerformanceMap.entries()).map(([empId, value]) => [
          empId,
          { ...value },
        ])
      );

      assignments.forEach((assignment) => {
        const empId = assignment.employee?.empId;
        const progress = inferProgressAsOf(assignment, date);
        const employeeEntry = employeeDailyProgress.get(empId);

        if (!employeeEntry || progress === null) {
          return;
        }

        employeeEntry.totalTasks += 1;
        employeeEntry.totalProgress += progress;
      });

      const totalPerformance = Array.from(employeeDailyProgress.values()).reduce((sum, employee) => {
        if (employee.totalTasks === 0) {
          return sum;
        }

        return sum + employee.totalProgress / employee.totalTasks;
      }, 0);
      const overallPerformance =
        employeeDailyProgress.size > 0 ? Math.round(totalPerformance / employeeDailyProgress.size) : 0;
      const isToday = i === 0;

      trendData.push({
        date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        weekday: date.toLocaleDateString("en-US", { weekday: "short" }),
        performance: overallPerformance,
        isToday,
        employeeCount: employeeDailyProgress.size,
      });
    }

    return trendData;
  }, [assignments, nonAdminEmployees]);

  const todayAttendanceSummary = useMemo(() => {
    const summary = {
      clockedIn: 0,
      present: 0,
      partial: 0,
      absent: 0,
    };

    todayAttendance.forEach((employee) => {
      switch (employee.today?.status) {
        case "CLOCKED_IN":
          summary.clockedIn += 1;
          break;
        case "PRESENT":
          summary.present += 1;
          break;
        case "PARTIAL":
          summary.partial += 1;
          break;
        default:
          summary.absent += 1;
          break;
      }
    });

    return summary;
  }, [todayAttendance]);

  const focusEmployees = useMemo(
    () =>
      performanceData
        .filter((employee) => employee.totalTasks > 0 && employee.averageProgress < 50)
        .sort((left, right) => left.averageProgress - right.averageProgress),
    [performanceData]
  );

  const attendanceByStatus = useMemo(() => {
    const groups = {
      CLOCKED_IN: [],
      PRESENT: [],
      PARTIAL: [],
      ABSENT: [],
    };

    [...todayAttendance]
      .sort((left, right) => {
        const leftStatus = left.today?.status || "ABSENT";
        const rightStatus = right.today?.status || "ABSENT";
        if (statusOrder[leftStatus] !== statusOrder[rightStatus]) {
          return statusOrder[leftStatus] - statusOrder[rightStatus];
        }

        return left.name.localeCompare(right.name);
      })
      .forEach((employee) => {
        const key = employee.today?.status || "ABSENT";
        groups[key].push(employee);
      });

    return groups;
  }, [todayAttendance]);

  useEffect(() => {
    const loadAttendance = async () => {
      try {
        setAttendanceLoading(true);
        const response = await authFetch("/api/admin/attendance/today");
        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || "Failed to load attendance");
        }

        const data = await response.json();
        setTodayAttendance(data || []);
      } catch (error) {
        showNotification(error.message || "Failed to load attendance", "error");
      } finally {
        setAttendanceLoading(false);
      }
    };

    loadAttendance();
  }, [authFetch, showNotification]);

  return (
    <div className="stats-content">
      <div className="analytics-grid">
        <div className="analytics-card main-chart">
          <h3>
            <TrendingUp size={20} />
            Overall Employee Performance Trend
          </h3>
          <div className="line-chart-container">
            <div className="performance-line-chart">
              <svg width="100%" height="184" viewBox="0 0 500 200" className="performance-chart">
                <defs>
                  <filter id="chartGlow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {[0, 25, 50, 75, 100].map((line) => (
                  <line
                    key={line}
                    x1="50"
                    y1={180 - line * 1.3}
                    x2="450"
                    y2={180 - line * 1.3}
                    stroke="#e2e8f0"
                    strokeWidth="1"
                    opacity={0.5}
                  />
                ))}

                <path
                  d={`M ${getChartX(0)} ${getChartY(performanceTrend[0]?.performance || 0)} ${performanceTrend
                    .slice(1)
                    .map((point, index) => `L ${getChartX(index + 1)} ${getChartY(point.performance)}`)
                    .join(" ")}`}
                  stroke="#1f2933"
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="performance-line"
                />

                {performanceTrend.map((point, index) => (
                  <g key={point.date}>
                    {point.isToday && (
                      <g>
                        <line
                          x1={getChartX(index)}
                          y1="24"
                          x2={getChartX(index)}
                          y2="180"
                          stroke="#f59e0b"
                          strokeWidth="2"
                          strokeDasharray="4 5"
                          opacity="0.7"
                        />
                        <rect
                          x={getChartX(index) - 18}
                          y="12"
                          width="36"
                          height="18"
                          rx="9"
                          fill="#fff4db"
                          stroke="#f59e0b"
                          strokeWidth="1"
                        />
                        <text
                          x={getChartX(index)}
                          y="24"
                          textAnchor="middle"
                          fontSize="9"
                          fill="#b45309"
                          fontWeight="700"
                        >
                          TODAY
                        </text>
                      </g>
                    )}
                    <circle
                      cx={getChartX(index)}
                      cy={getChartY(point.performance)}
                      r="18"
                      fill="transparent"
                      style={{ cursor: "pointer" }}
                      onMouseEnter={() => setHoveredPoint({ ...point, index })}
                      onMouseLeave={() => setHoveredPoint(null)}
                    />
                    <circle
                      cx={getChartX(index)}
                      cy={getChartY(point.performance)}
                      r={point.isToday ? "6" : hoveredPoint?.index === index ? "6" : "4"}
                      fill={point.isToday ? "#f59e0b" : "#1f2933"}
                      stroke={point.isToday ? "#fff4db" : "#f7f4f0"}
                      strokeWidth="2"
                      className="data-point"
                      style={{
                        transition: "all 0.2s ease",
                        filter:
                          hoveredPoint?.index === index || point.isToday
                            ? "url(#chartGlow)"
                            : "none",
                        pointerEvents: "none",
                      }}
                    />
                    <text
                      x={getChartX(index)}
                      y={195}
                      textAnchor="middle"
                      fontSize="11"
                      fill={point.isToday ? "#b45309" : "#47515c"}
                      fontWeight={point.isToday ? "700" : "500"}
                    >
                      {point.weekday}
                    </text>
                  </g>
                ))}

                {hoveredPoint && (
                  <g className="tooltip">
                    <rect
                      x={getChartX(hoveredPoint.index) - 48}
                      y={getChartY(hoveredPoint.performance) - 60}
                      width="96"
                      height="46"
                      rx="8"
                      fill={hoveredPoint.isToday ? "#b45309" : "#1f2933"}
                      className="tooltip-bg"
                    />
                    <text
                      x={getChartX(hoveredPoint.index)}
                      y={getChartY(hoveredPoint.performance) - 39}
                      textAnchor="middle"
                      fontSize="12"
                      fill="#f8fafc"
                      fontWeight="700"
                    >
                      {hoveredPoint.performance}%
                    </text>
                    <text
                      x={getChartX(hoveredPoint.index)}
                      y={getChartY(hoveredPoint.performance) - 25}
                      textAnchor="middle"
                      fontSize="9"
                      fill="#fde68a"
                    >
                      {hoveredPoint.isToday ? "Today" : hoveredPoint.date}
                    </text>
                  </g>
                )}
              </svg>
            </div>

            <div className="chart-stats">
              <div className="stat-item">
                <span className="stat-value">
                  {dataLoading ? <Skeleton width={70} /> : `${performanceTrend.at(-1)?.performance || 0}%`}
                </span>
                <span className="stat-label">Current Performance</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">
                  {dataLoading ? <Skeleton width={50} /> : assignments.length}
                </span>
                <span className="stat-label">Total Tasks</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">
                  {dataLoading ? <Skeleton width={50} /> : nonAdminEmployees.length}
                </span>
                <span className="stat-label">Employees</span>
              </div>
            </div>
          </div>

          <div className="chart-summary-strip">
            <div className="chart-summary-card">
              <span>Team completion pace</span>
              <strong>{performanceTrend.at(-1)?.performance || 0}%</strong>
              <small>Average of all employees; unassigned employees stay at 0%</small>
            </div>
            <div className="chart-summary-card">
              <span>Employee Need To Focus Name</span>
              <strong>{focusEmployees.length}</strong>
              <small>
                {focusEmployees.length > 0
                  ? `Lowest progress: ${focusEmployees
                      .slice(0, 3)
                      .map((employee) => `${employee.name} (${employee.averageProgress}%)`)
                      .join(", ")}`
                  : "No employee is currently below 50% progress"}
              </small>
            </div>
          </div>
        </div>

        <div className="analytics-card attendance-focus-card">
          <h3>
            <Activity size={20} />
            Today&apos;s Attendance
          </h3>

          {attendanceLoading ? (
            <div className="attendance-admin-skeleton">
              <div className="attendance-admin-stats">
                {["live", "present", "partial", "absent"].map((tone) => (
                  <div key={tone} className={`attendance-admin-pill ${tone} skeleton-pill`}>
                    <div className="skeleton-shimmer attendance-skeleton-value"></div>
                    <div className="skeleton-shimmer attendance-skeleton-label"></div>
                  </div>
                ))}
              </div>

              <div className="attendance-status-groups skeleton-groups">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="attendance-group-card skeleton-group-card">
                    <div className="attendance-group-header">
                      <div className="skeleton-shimmer attendance-skeleton-chip"></div>
                      <div className="skeleton-shimmer attendance-skeleton-count"></div>
                    </div>
                    <div className="attendance-admin-list">
                      {Array.from({ length: 2 }).map((__, rowIndex) => (
                        <div key={rowIndex} className="attendance-admin-row skeleton-row" aria-hidden="true">
                          <div className="attendance-skeleton-copy">
                            <div className="skeleton-shimmer attendance-skeleton-name"></div>
                            <div className="skeleton-shimmer attendance-skeleton-role"></div>
                          </div>
                          <div className="skeleton-shimmer attendance-skeleton-time"></div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="attendance-admin-stats">
                <div className="attendance-admin-pill live">
                  <strong>{todayAttendanceSummary.clockedIn}</strong>
                  <span>Clocked in</span>
                </div>
                <div className="attendance-admin-pill present">
                  <strong>{todayAttendanceSummary.present}</strong>
                  <span>Present</span>
                </div>
                <div className="attendance-admin-pill partial">
                  <strong>{todayAttendanceSummary.partial}</strong>
                  <span>Partial</span>
                </div>
                <div className="attendance-admin-pill absent">
                  <strong>{todayAttendanceSummary.absent}</strong>
                  <span>Absent</span>
                </div>
              </div>

              <div className="attendance-status-groups">
                {Object.entries(attendanceByStatus)
                  .filter(([, employeesInStatus]) => employeesInStatus.length > 0)
                  .map(([statusKey, employeesInStatus]) => {
                    const meta = statusMeta(statusKey);

                    return (
                      <div key={statusKey} className={`attendance-group-card ${meta.tone}`}>
                        <div className="attendance-group-header">
                          <span className={`attendance-status-chip ${meta.tone}`}>{meta.label}</span>
                          <strong>{employeesInStatus.length}</strong>
                        </div>

                        <div className="attendance-admin-list">
                          {employeesInStatus.map((employee) => (
                            <button
                              key={employee.empId}
                              type="button"
                              className="attendance-admin-row"
                              onClick={() =>
                                showNotification(
                                  `Open Employee Insights to inspect ${employee.name}'s full attendance calendar and punctuality details.`,
                                  "success"
                                )
                              }
                            >
                              <div>
                                <strong>{employee.name}</strong>
                                <span>{employee.designation || "Team member"}</span>
                              </div>
                              <div className="attendance-admin-row-meta">
                                <small>{formatMinutes(employee.today?.workedMinutes)}</small>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </>
          )}
        </div>

        <div className="analytics-card performance-overview-card">
          <h3>
            <PieChart size={20} />
            Individual Employee Performance
          </h3>
          <div className="employee-performance-circles">
            {dataLoading
              ? Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="employee-circle">
                    <div className="circle-container">
                      <Skeleton circle width={80} height={80} />
                    </div>
                    <div className="employee-info">
                      <Skeleton width={120} height={16} />
                      <Skeleton width={80} height={14} style={{ marginTop: 4 }} />
                    </div>
                  </div>
                ))
              : performanceData.map((emp) => {
                  const progressPercentage = emp.averageProgress;
                  const radius = 35;
                  const circumference = 2 * Math.PI * radius;
                  const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;

                  return (
                    <div key={emp.empId} className="employee-circle">
                      <div className="circle-container">
                        <svg width="80" height="80" className="progress-ring">
                          <circle cx="40" cy="40" r={radius} stroke="#e2e8f0" strokeWidth="8" fill="none" />
                          <circle
                            cx="40"
                            cy="40"
                            r={radius}
                            stroke={
                              progressPercentage >= 75
                                ? "#22c55e"
                                : progressPercentage >= 50
                                  ? "#f59e0b"
                                  : "#ef4444"
                            }
                            strokeWidth="8"
                            fill="none"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            transform="rotate(-90 40 40)"
                            className="progress-circle"
                          />
                        </svg>
                        <div className="circle-text">
                          <span className="percentage">{progressPercentage}%</span>
                        </div>
                      </div>
                      <div className="employee-info">
                        <span className="employee-name">{emp.name}</span>
                        <span className="task-count">
                          {emp.totalTasks > 0 ? `${emp.totalTasks} tasks` : "No tasks assigned"}
                        </span>
                      </div>
                    </div>
                  );
                })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;
