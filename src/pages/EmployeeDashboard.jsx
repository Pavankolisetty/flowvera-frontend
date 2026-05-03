import { useEffect, useState } from "react";
import EmployeeHeader from "../components/EmployeeHeader";
import TaskList from "../components/employee/TaskList";
import AttendancePanel from "../components/employee/AttendancePanel";
import QuoteSection from "../components/employee/QuoteSection";
import TodaySummaryStrip from "../components/employee/TodaySummaryStrip";
import FeedbackForm from "../components/shared/FeedbackForm";
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

const buildDashboardNotifications = (assignedTasks = [], delegatedTasks = []) => {
  const todayKey = toDateKey(new Date());
  const notifications = [];

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

const buildLeaveNotifications = (myLeaveRequests = [], managedLeaveRequests = []) => {
  const notifications = [];

  managedLeaveRequests.forEach((request) => {
    if (!request.managerNotificationUnread || request.status !== "PENDING") {
      return;
    }
    notifications.push({
      id: `leave-manager-${request.id}`,
      type: "approval",
      title: "Leave approval pending",
      message: `${request.employeeName} requested ${String(request.type).replaceAll("_", " ")} for ${request.requestDate}.`,
      to: `/employee/tasks?section=leave-requests&leaveRequestId=${request.id}`,
    });
  });

  myLeaveRequests.forEach((request) => {
    if (!request.employeeNotificationUnread || !request.employeeNotificationMessage) {
      return;
    }
    notifications.push({
      id: `leave-employee-${request.id}`,
      type: "success",
      title: "Leave approved",
      message: request.employeeNotificationMessage,
      to: "/employee/dashboard",
    });
  });

  return notifications;
};

const notificationSeenKey = (user) =>
  `employee-dashboard-notifications-seen:${user?.empId || user?.email || user?.name || "current"}`;

export default function EmployeeDashboard() {
  const { authFetch, user } = useAuth();
  const [profileName, setProfileName] = useState(user?.name || "");
  const [profile, setProfile] = useState(null);
  const [tasks, setTasks] = useState([]);
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

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      try {
        const [
          profileResponse,
          tasksResponse,
          allTasksResponse,
          delegatedTasksResponse,
          myLeaveResponse,
          managedLeaveResponse,
        ] = await Promise.all([
          authFetch("/api/employee/me"),
          authFetch("/api/employee/my-tasks/active"),
          authFetch("/api/employee/my-tasks"),
          authFetch("/api/employee/delegated-tasks"),
          authFetch("/api/employee/leave-requests"),
          authFetch("/api/employee/managed-leave-requests"),
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

        if (!myLeaveResponse.ok || !managedLeaveResponse.ok) {
          throw new Error("Failed to load leave request notifications");
        }

        const profileData = await profileResponse.json();
        const tasksData = await tasksResponse.json();
        const allTasksData = await allTasksResponse.json();
        const delegatedTasksData = await delegatedTasksResponse.json();
        const myLeaveData = await myLeaveResponse.json();
        const managedLeaveData = await managedLeaveResponse.json();

        if (isMounted) {
          setProfile(profileData);
          setProfileName(profileData.name || user?.name || "");
          setTasks(tasksData || []);
          setTodaySummary(buildTodaySummary(allTasksData || []));
          const notificationItems = buildDashboardNotifications(
            allTasksData || [],
            delegatedTasksData || []
          )
            .concat(buildLeaveNotifications(myLeaveData || [], managedLeaveData || []))
            .slice(0, 6);
          const seenKey = notificationSeenKey(user);
          const alreadySeen = window.sessionStorage.getItem(seenKey) === "true";
          setDashboardNotifications(notificationItems);
          setNotificationsSeen(alreadySeen);
          if (notificationItems.length > 0 && !alreadySeen) {
            setNotificationsOpen(true);
            setNotificationsSeen(true);
            window.sessionStorage.setItem(seenKey, "true");
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
            ) || (managedLeaveData || []).some((request) => request.managerNotificationUnread),
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
          }}
          onCloseNotifications={() => {
            setNotificationsOpen(false);
            setNotificationsSeen(true);
            window.sessionStorage.setItem(notificationSeenKey(user), "true");
          }}
        />

        <TodaySummaryStrip summary={todaySummary} loading={status.loading} />

        {profile && (
          <section className="employee-reporting-strip">
            <div className="reporting-card">
              <span>Your employee information</span>
              <strong>{profile.name} ({profile.empId})</strong>
              <small>{profile.designation || "Role not assigned"}</small>
            </div>
            <div className="reporting-card manager">
              <span>Reporting manager</span>
              <strong>
                {profile.reportingManagerName
                  ? `${profile.reportingManagerName} (${profile.reportingManagerEmpId})`
                  : "Not assigned"}
              </strong>
              <small>
                {profile.canAssignTask
                  ? "You can assign work and approve leave for direct reports"
                  : "Your task and leave approvals route to this manager"}
              </small>
            </div>
          </section>
        )}

        <section className="employee-grid">
          <TaskList tasks={tasks} status={status} />
          <AttendancePanel />
        </section>
      </div>

      <FeedbackForm userType="employee" />
    </div>
  );
}
