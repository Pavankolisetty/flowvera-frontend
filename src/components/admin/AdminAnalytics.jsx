import { useState, useMemo, useEffect } from "react";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { TrendingUp, PieChart, Search, User } from "lucide-react";

const AdminAnalytics = ({ employees, assignments, authFetch, showNotification, dataLoading }) => {
  const [searchEmpId, setSearchEmpId] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedAttendance, setSelectedAttendance] = useState([]);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [todaySummary, setTodaySummary] = useState(null);

  // Calculate overall performance data - Include ALL employees except admin users
  const performanceData = useMemo(() => {
    const empPerformance = {};
    
    // Initialize all non-admin employees with zero data first
    employees
      .filter(employee => employee.role !== 'ADMIN') // Exclude admin users
      .forEach(employee => {
        empPerformance[employee.empId] = {
          empId: employee.empId,
          name: employee.name,
          totalTasks: 0,
          completedTasks: 0,
          averageProgress: 0,
          totalProgress: 0
        };
      });
    
    // Then calculate actual performance from assignments
    assignments.forEach(assignment => {
      const empId = assignment.employee?.empId;
      if (empPerformance[empId]) {
        empPerformance[empId].totalTasks++;
        empPerformance[empId].totalProgress += assignment.progress || 0;
        if (assignment.status === 'COMPLETED') {
          empPerformance[empId].completedTasks++;
        }
      }
    });

    // Calculate average progress for each employee
    Object.values(empPerformance).forEach(emp => {
      emp.averageProgress = emp.totalTasks > 0 ? Math.round(emp.totalProgress / emp.totalTasks) : 0;
    });

    return Object.values(empPerformance);
  }, [assignments, employees]);

  // Improved Overall performance trend calculation (last 7 days)
  const performanceTrend = useMemo(() => {
    const trendData = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      // Get assignments that were active on this date (assigned before or on this date)
      const activeAssignments = assignments.filter(assignment => {
        const assignedDate = new Date(assignment.assignedAt);
        return assignedDate <= date;
      });
      
      // Calculate performance based on actual progress and completion status
      let totalPerformance = 0;
      let taskCount = activeAssignments.length;
      
      if (taskCount > 0) {
        activeAssignments.forEach(assignment => {
          // Weight completed tasks more heavily for better trend visibility
          if (assignment.status === 'COMPLETED') {
            totalPerformance += 100; // Completed tasks contribute 100%
          } else {
            totalPerformance += assignment.progress || 0; // In-progress tasks contribute their progress
          }
        });
      }
      
      // Calculate average performance for the day
      const dailyPerformance = taskCount > 0 ? Math.round(totalPerformance / taskCount) : 0;
      
      trendData.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        weekday: date.toLocaleDateString('en-US', { weekday: 'short' }),
        performance: dailyPerformance,
        taskCount: taskCount,
        completedTasks: activeAssignments.filter(a => a.status === 'COMPLETED').length
      });
    }
    
    return trendData;
  }, [assignments]);

  // Attendance has been removed; admin attendance summary is disabled.

  const handleSearchEmployee = async (empId = searchEmpId) => {
    if (!empId) {
      setSelectedEmployee(null);
      return;
    }

      const emp = employees.find(e => e.empId === empId.trim());
    if (emp) {
      const empAssignments = assignments.filter(a => a.employee?.empId === empId.trim());
        setSelectedEmployee({
          ...emp,
          assignments: empAssignments,
          totalTasks: empAssignments.length,
          completedTasks: empAssignments.filter(a => a.status === 'COMPLETED').length,
          averageProgress: empAssignments.length > 0 
            ? Math.round(empAssignments.reduce((sum, a) => sum + (a.progress || 0), 0) / empAssignments.length) 
            : 0
        });

        // Attendance API removed — clear any attendance details
        setSelectedAttendance([]);
    } else {
      showNotification("Employee not found! Please check the employee details.", 'error');
    }
  };

  return (
    <div className="stats-content">
      <div className="analytics-grid">
        {/* Overall Performance Line Chart + Today Attendance */}
        <div className="analytics-card main-chart">
          <h3><TrendingUp size={20} /> Overall Employee Performance Trend</h3>
          <div className="line-chart-container">
            <div className="performance-line-chart">
              <svg width="100%" height="200" viewBox="0 0 500 200" className="performance-chart">
                <defs>
                  <linearGradient id="performanceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#1f2933" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#1f2933" stopOpacity={0.05} />
                  </linearGradient>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge> 
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/> 
                    </feMerge>
                  </filter>
                </defs>
                
                {/* Grid lines */}
                {[0, 25, 50, 75, 100].map(line => (
                  <line 
                    key={line}
                    x1="50" 
                    y1={180 - (line * 1.3)} 
                    x2="450" 
                    y2={180 - (line * 1.3)}
                    stroke="#e2e8f0" 
                    strokeWidth="1"
                    opacity={0.5}
                  />
                ))}
                
                {/* Performance line with subtle animation */}
                <path
                  d={`M 50 ${180 - (performanceTrend[0]?.performance || 0) * 1.3} ${performanceTrend.slice(1).map((point, index) => `L ${50 + (index + 1) * 60} ${180 - point.performance * 1.3}`).join(' ')}`}
                  stroke="#1f2933"
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="performance-line"
                  filter="url(#glow)"
                />
                
                {/* Area under line with animation */}
                <path
                  d={`M 50 180 L 50 ${180 - (performanceTrend[0]?.performance || 0) * 1.3} ${performanceTrend.slice(1).map((point, index) => `L ${50 + (index + 1) * 60} ${180 - point.performance * 1.3}`).join(' ')} L ${50 + (performanceTrend.length - 1) * 60} 180 Z`}
                  fill="url(#performanceGradient)"
                  className="performance-area"
                />
                
                {/* Interactive data points with hover effects */}
                {performanceTrend.map((point, index) => (
                  <g key={index}>
                    {/* Larger hover area for better stability */}
                    <circle
                      cx={50 + index * 60}
                      cy={180 - point.performance * 1.3}
                      r="20"
                      fill="transparent"
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={() => setHoveredPoint({ ...point, index })}
                      onMouseLeave={() => setHoveredPoint(null)}
                    />
                    {/* Visible data point */}
                    <circle
                      cx={50 + index * 60}
                      cy={180 - point.performance * 1.3}
                      r={hoveredPoint?.index === index ? "6" : "4"}
                      fill="#1f2933"
                      stroke="#f7f4f0"
                      strokeWidth="2"
                      className="data-point"
                      style={{
                        transition: 'all 0.2s ease',
                        filter: hoveredPoint?.index === index ? 'url(#glow)' : 'none',
                        pointerEvents: 'none'
                      }}
                    />
                    {/* Date label */}
                    <text
                      x={50 + index * 60}
                      y={195}
                      textAnchor="middle"
                      fontSize="11"
                      fill="#47515c"
                      fontWeight="500"
                    >
                      {point.weekday}
                    </text>
                  </g>
                ))}
                
                {/* Hover tooltip */}
                {hoveredPoint && (
                  <g className="tooltip" style={{ opacity: 1, transition: 'opacity 0.2s ease' }}>
                    <rect
                      x={50 + hoveredPoint.index * 60 - 35}
                      y={180 - hoveredPoint.performance * 1.3 - 45}
                      width="70"
                      height="35"
                      rx="6"
                      fill="#1f2933"
                      stroke="#47515c"
                      strokeWidth="1"
                      className="tooltip-bg"
                    />
                    <text
                      x={50 + hoveredPoint.index * 60}
                      y={180 - hoveredPoint.performance * 1.3 - 30}
                      textAnchor="middle"
                      fontSize="11"
                      fill="#f7f4f0"
                      fontWeight="600"
                    >
                      {hoveredPoint.performance}%
                    </text>
                    <text
                      x={50 + hoveredPoint.index * 60}
                      y={180 - hoveredPoint.performance * 1.3 - 18}
                      textAnchor="middle"
                      fontSize="9"
                      fill="#cbd5e0"
                      fontWeight="400"
                    >
                      {hoveredPoint.date}
                    </text>
                  </g>
                )}
              </svg>
            </div>
            <div className="chart-stats">
              {dataLoading ? (
                <div className="stat-item">
                  <Skeleton width={60} height={24} />
                  <Skeleton width={100} height={16} style={{ marginTop: 4 }} />
                </div>
              ) : (
                <div className="stat-item">
                  <span className="stat-value">{performanceTrend[performanceTrend.length - 1]?.performance || 0}%</span>
                  <span className="stat-label">Current Performance</span>
                </div>
              )}
              {dataLoading ? (
                <div className="stat-item">
                  <Skeleton width={40} height={24} />
                  <Skeleton width={80} height={16} style={{ marginTop: 4 }} />
                </div>
              ) : (
                <div className="stat-item">
                  <span className="stat-value">{assignments.length}</span>
                  <span className="stat-label">Total Tasks</span>
                </div>
              )}
              {dataLoading ? (
                <div className="stat-item">
                  <Skeleton width={50} height={24} />
                  <Skeleton width={120} height={16} style={{ marginTop: 4 }} />
                </div>
              ) : (
                <div className="stat-item">
                  <span className="stat-value">{employees.length}</span>
                  <span className="stat-label">Active Employees</span>
                </div>
              )}
            </div>
          </div>
            {/* Attendance removed - placeholder shown in employee dashboard */}
        </div>

        {/* Individual Employee Performance */}
        <div className="analytics-card">
          <h3><PieChart size={20} /> Individual Employee Performance</h3>
          <div className="employee-performance-circles">
            {dataLoading ? (
              // Show skeleton circles for loading state
              Array.from({ length: 6 }).map((_, index) => (
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
            ) : (
              performanceData.map((emp, index) => {
                const progressPercentage = emp.averageProgress;
                const radius = 35;
                const circumference = 2 * Math.PI * radius;
                // Simple and clear calculation: show exact percentage
                const strokeDasharray = circumference;
                const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;
                
                return (
                  <div key={emp.empId} className="employee-circle">
                    <div className="circle-container">
                      <svg width="80" height="80" className="progress-ring">
                        {/* Background circle */}
                        <circle
                          cx="40"
                          cy="40"
                          r={radius}
                          stroke="#e2e8f0"
                          strokeWidth="8"
                          fill="none"
                        />
                        {/* Progress circle */}
                        <circle
                          cx="40"
                          cy="40"
                          r={radius}
                          stroke={progressPercentage >= 75 ? '#22c55e' : progressPercentage >= 50 ? '#f59e0b' : '#ef4444'}
                          strokeWidth="8"
                          fill="none"
                          strokeDasharray={strokeDasharray}
                          strokeDashoffset={strokeDashoffset}
                          strokeLinecap="round"
                          transform="rotate(-90 40 40)"
                          className="progress-circle"
                          style={{
                            transition: 'stroke-dashoffset 0.6s ease-in-out'
                          }}
                        />
                      </svg>
                      <div className="circle-text">
                        <span className="percentage">{progressPercentage}%</span>
                      </div>
                    </div>
                    <div className="employee-info">
                      <span className="employee-name">{emp.name}</span>
                      <span className="task-count">
                        {emp.totalTasks > 0 ? `${emp.totalTasks} tasks` : 'No tasks assigned'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Employee Selection */}
      <div className="search-section">
        <div className="search-box">
          <h3><Search size={20} /> Employee Performance Details</h3>
          <div className="search-input-group">
            <select
              value={searchEmpId}
              onChange={(e) => {
                setSearchEmpId(e.target.value);
                if (e.target.value) handleSearchEmployee(e.target.value);
                else setSelectedEmployee(null);
              }}
            >
              <option value="">Select an employee...</option>
              {employees.filter(emp => emp.role !== 'ADMIN').map(emp => (
                <option key={emp.empId} value={emp.empId}>
                  {emp.name} (ID: {emp.empId})
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedEmployee && (
          <div className="employee-details">
            <div className="employee-header">
              <User size={24} />
              <div>
                <h4>{selectedEmployee.name}</h4>
                <p>ID: {selectedEmployee.empId}</p>
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

            <div className="task-status-grid">
              {selectedEmployee.assignments.map((assignment, index) => (
                <div key={index} className="task-status-item">
                  <span className="task-title">{assignment.task?.title}</span>
                  <div className="task-progress">
                    <div 
                      className="progress-bar-small"
                      style={{ width: `${assignment.progress || 0}%` }}
                    ></div>
                    <span>{assignment.progress || 0}%</span>
                  </div>
                  <span className={`task-status-badge ${assignment.status?.toLowerCase()}`}>
                    {assignment.status}
                  </span>
                </div>
              ))}
            </div>

            {selectedAttendance && selectedAttendance.length > 0 && (
              <div className="employee-attendance-panel">
                <h4>Attendance (last 7 days)</h4>
                <ul>
                  {selectedAttendance.map((r) => (
                    <li key={r.date} className={`attendance-row status-${r.status.toLowerCase()}`}>
                      <span className="att-date">{r.date}</span>
                      <span className="att-hours">{Math.floor(r.workedMinutes / 60)}h {r.workedMinutes % 60}m</span>
                      <span className="att-status">{r.status}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAnalytics;