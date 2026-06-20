import { useEffect, useState } from "react";
import EmployeeHeader from "../components/EmployeeHeader";
import TaskList from "../components/employee/TaskList";
import AttendancePanel from "../components/employee/AttendancePanel";
import QuoteSection from "../components/employee/QuoteSection";
import TodaySummaryStrip from "../components/employee/TodaySummaryStrip";
import DepartmentPerformancePulse from "../components/employee/DepartmentPerformancePulse";
import CommunicationWidget from "../components/shared/CommunicationWidget";
import { useAuth } from "../context/AuthContext";
import "../styles/EmployeeDashboard.css";

const toDateKey = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const isOverdue = (assignment) => {
  if (!assignment?.dueDate || assignment.status === "COMPLETED") return false;
  const dueDate = new Date(`${assignment.dueDate}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dueDate < today;
};

const startOfWeek = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = today.getDay();
  const diff = day === 0 ? 6 : day - 1;
  today.setDate(today.getDate() - diff);
  return today;
};

const currentWeekKey = () => toDateKey(startOfWeek());

const isCurrentWeekDate = (value) => {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  date.setHours(0, 0, 0, 0);
  return date >= startOfWeek();
};

const getCompletedAt = (assignment) => {
  if (assignment?.status !== "COMPLETED") return null;
  const acceptedHistory = [...(assignment.progressHistory || [])]
    .reverse()
    .find((entry) => entry.status === "COMPLETED" || entry.source === "ACCEPTED");
  return acceptedHistory?.recordedAt || assignment.reviewedAt || assignment.lastSubmittedAt;
};

const buildTodaySummary = (assignments = []) => {
  const todayKey = toDateKey(new Date());
  const weekStart = startOfWeek();

  return assignments.reduce(
    (summary, assignment) => {
      if (assignment.status !== "COMPLETED" && assignment.dueDate === todayKey) {
        summary.dueToday += 1;
      }

      if (isOverdue(assignment)) {
        summary.overdue += 1;
      }

      if (assignment.status === "UNDER_REVIEW") {
        summary.underReview += 1;
      }

      const completedAt = getCompletedAt(assignment);
      if (completedAt) {
        const completedDate = new Date(completedAt);
        if (!Number.isNaN(completedDate.getTime()) && completedDate >= weekStart) {
          summary.completedThisWeek += 1;
        }
      }

      return summary;
    },
    {
      dueToday: 0,
      overdue: 0,
      underReview: 0,
      completedThisWeek: 0,
    }
  );
};

const taskTitle = (assignment) => assignment?.task?.title || "Task";

const buildDashboardNotifications = (assignedTasks = [], delegatedTasks = [], leaveRequests = []) => {
  const todayKey = toDateKey(new Date());
  const notifications = [];

  leaveRequests.forEach((request) => {
    const isFreshLeaveNotification =
      request.employeeNotificationUnread ||
      isCurrentWeekDate(request.createdAt) ||
      isCurrentWeekDate(request.decidedAt);

    if (!isFreshLeaveNotification) {
      return;
    }

    const isPending = request.status === "PENDING";
    const isApproved = request.status === "APPROVED";
    notifications.push({
      id: `leave-${request.id}`,
      type: isPending ? "approval" : isApproved ? "success" : "overdue",
      title: `${request.requestType} ${request.status}`,
      message:
        request.employeeNotificationMessage ||
        (isPending
          ? `Your ${request.requestType} request is waiting for approval.`
          : `Your ${request.requestType} request was ${String(request.status).toLowerCase()}.`),
      to: "/employee/dashboard",
    });
  });

  delegatedTasks.forEach((assignment) => {
    if (!assignment.adminNotificationUnread || !assignment.adminNotificationMessage) {
      return;
    }

    const isExtensionRequest = Boolean(assignment.dueDateExtensionPending);
    notifications.push({
      id: `delegated-${assignment.id}`,
      type: isExtensionRequest ? "overdue" : "approval",
      title: isExtensionRequest ? "Overdue approval pending" : "Work approval pending",
      message: isExtensionRequest
        ? `${taskTitle(assignment)} needs a due-date extension decision.`
        : assignment.adminNotificationMessage,
      to: `/employee/tasks?section=reviews&assignmentId=${assignment.id}`,
    });
  });

  assignedTasks.forEach((assignment) => {
    if (toDateKey(assignment.assignedAt) === todayKey && assignment.status !== "COMPLETED") {
      notifications.push({
        id: `new-task-${assignment.id}`,
        type: "assigned",
        title: "New task assigned",
        message: `${taskTitle(assignment)} was assigned today.`,
        to: `/employee/tasks?section=assigned&assignmentId=${assignment.id}`,
      });
    }

    if (assignment.employeeNotificationUnread && assignment.employeeNotificationMessage) {
      notifications.push({
        id: `employee-update-${assignment.id}`,
        type: assignment.employeeCelebrationPending ? "success" : "update",
        title: assignment.employeeCelebrationPending
          ? "Work accepted"
          : assignment.status === "CHANGES_REQUESTED"
            ? "Improvement requested"
            : "Task update",
        message: assignment.employeeNotificationMessage,
        to: `/employee/tasks?section=assigned&assignmentId=${assignment.id}`,
      });
    }

    if (isOverdue(assignment)) {
      notifications.push({
        id: `overdue-${assignment.id}`,
        type: "overdue",
        title: "Task overdue",
        message: `${taskTitle(assignment)} passed its due date.`,
        to: `/employee/tasks?section=assigned&assignmentId=${assignment.id}`,
      });
    }
  });

  return notifications.slice(0, 6);
};

const notificationSeenKey = (user) =>
  `employee-dashboard-notifications-seen:${currentWeekKey()}:${user?.empId || user?.email || user?.name || "current"}`;

export default function EmployeeDashboard() {
  const { authFetch, user } = useAuth();
  const [profileName, setProfileName] = useState(user?.name || "");
  const [tasks, setTasks] = useState([]);
  const [departmentPerformance, setDepartmentPerformance] = useState([]);
  const [todaySummary, setTodaySummary] = useState({
    dueToday: 0,
    overdue: 0,
    underReview: 0,
    completedThisWeek: 0,
  });
  const [dashboardNotifications, setDashboardNotifications] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsSeen, setNotificationsSeen] = useState(() =>
    window.sessionStorage.getItem(notificationSeenKey(user)) === "true"
  );
  const [taskNotifications, setTaskNotifications] = useState({
    hasAccepted: false,
    hasChanges: false,
    hasDelegated: false,
  });
  const [status, setStatus] = useState({ loading: true, error: "" });

  const markLeaveNotificationsRead = () => {
    authFetch("/api/employee/leave/notifications/read", { method: "PUT" }).catch(() => {});
  };

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      try {
        const [
          profileResponse,
          tasksResponse,
          allTasksResponse,
          delegatedTasksResponse,
          leaveRequestsResponse,
          departmentPerformanceResponse,
        ] = await Promise.all([
          authFetch("/api/employee/me"),
          authFetch("/api/employee/my-tasks/active"),
          authFetch("/api/employee/my-tasks"),
          authFetch("/api/employee/delegated-tasks"),
          authFetch("/api/employee/leave/requests"),
          authFetch("/api/employee/department-performance"),
        ]);

        if (!profileResponse.ok) {
          const message = await profileResponse.text();
          throw new Error(message || "Failed to load profile");
        }

        if (!tasksResponse.ok) {
          const message = await tasksResponse.text();
          throw new Error(message || "Failed to load tasks");
        }

        if (!allTasksResponse.ok) {
          const message = await allTasksResponse.text();
          throw new Error(message || "Failed to load task notifications");
        }

        if (!delegatedTasksResponse.ok) {
          const message = await delegatedTasksResponse.text();
          throw new Error(message || "Failed to load delegated task notifications");
        }

        if (!leaveRequestsResponse.ok) {
          const message = await leaveRequestsResponse.text();
          throw new Error(message || "Failed to load leave notifications");
        }

        if (!departmentPerformanceResponse.ok) {
          const message = await departmentPerformanceResponse.text();
          throw new Error(message || "Failed to load department performance");
        }

        const profileData = await profileResponse.json();
        const tasksData = await tasksResponse.json();
        const allTasksData = await allTasksResponse.json();
        const delegatedTasksData = await delegatedTasksResponse.json();
        const leaveRequestsData = await leaveRequestsResponse.json();
        const departmentPerformanceData = await departmentPerformanceResponse.json();

        if (isMounted) {
          setProfileName(profileData.name || user?.name || "");
          setTasks(tasksData || []);
          setDepartmentPerformance(departmentPerformanceData || []);
          setTodaySummary(buildTodaySummary(allTasksData || []));
          const notificationItems = buildDashboardNotifications(
            allTasksData || [],
            delegatedTasksData || [],
            leaveRequestsData || []
          );
          const seenKey = notificationSeenKey(user);
          const alreadySeen = window.sessionStorage.getItem(seenKey) === "true";
          setDashboardNotifications(notificationItems);
          setNotificationsSeen(alreadySeen);
          if (notificationItems.length > 0 && !alreadySeen) {
            setNotificationsOpen(true);
            setNotificationsSeen(true);
            window.sessionStorage.setItem(seenKey, "true");
            markLeaveNotificationsRead();
          } else {
            setNotificationsOpen(false);
          }
          setTaskNotifications({
            hasAccepted: (allTasksData || []).some(
              (task) => task.employeeNotificationUnread && task.employeeCelebrationPending
            ),
            hasChanges: (allTasksData || []).some(
              (task) =>
                task.employeeNotificationUnread &&
                task.status === "CHANGES_REQUESTED"
            ),
            hasDelegated: (delegatedTasksData || []).some(
              (task) => task.adminNotificationUnread && task.adminNotificationMessage
            ),
          });
          setStatus({ loading: false, error: "" });
        }
      } catch (error) {
        if (isMounted) {
          setStatus({ loading: false, error: error.message });
        }
      }
    };

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [authFetch, user]);

  return (
    <div className="employee-dashboard">
      <div className="dashboard-bg" aria-hidden="true"></div>
      <div className="employee-shell">
        <EmployeeHeader name={profileName} taskNotifications={taskNotifications} />

        <QuoteSection
          notifications={dashboardNotifications}
          notificationsOpen={notificationsOpen}
          showNotificationCount={dashboardNotifications.length > 0 && !notificationsSeen}
          onOpenNotifications={() => {
            setNotificationsOpen(true);
            setNotificationsSeen(true);
            window.sessionStorage.setItem(notificationSeenKey(user), "true");
            markLeaveNotificationsRead();
          }}
          onCloseNotifications={() => {
            setNotificationsOpen(false);
            setNotificationsSeen(true);
            window.sessionStorage.setItem(notificationSeenKey(user), "true");
            markLeaveNotificationsRead();
          }}
        />

        <TodaySummaryStrip summary={todaySummary} loading={status.loading} />

        <section className="employee-grid">
          <div className="employee-left-stack">
            <TaskList tasks={tasks} status={status} />
            <DepartmentPerformancePulse
              members={departmentPerformance}
              loading={status.loading}
              error={status.error}
            />
          </div>
          <AttendancePanel />
        </section>
      </div>

      <CommunicationWidget />
    </div>
  );
}
