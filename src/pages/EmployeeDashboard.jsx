import { useEffect, useState } from "react";
import EmployeeHeader from "../components/EmployeeHeader";
import TaskList from "../components/employee/TaskList";
import AttendancePanel from "../components/employee/AttendancePanel";
import QuoteSection from "../components/employee/QuoteSection";
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

export default function EmployeeDashboard() {
  const { authFetch, user } = useAuth();
  const [profileName, setProfileName] = useState(user?.name || "");
  const [tasks, setTasks] = useState([]);
  const [dashboardNotifications, setDashboardNotifications] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
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
        const [profileResponse, tasksResponse, allTasksResponse, delegatedTasksResponse] = await Promise.all([
          authFetch("/api/employee/me"),
          authFetch("/api/employee/my-tasks/active"),
          authFetch("/api/employee/my-tasks"),
          authFetch("/api/employee/delegated-tasks"),
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

        const profileData = await profileResponse.json();
        const tasksData = await tasksResponse.json();
        const allTasksData = await allTasksResponse.json();
        const delegatedTasksData = await delegatedTasksResponse.json();

        if (isMounted) {
          setProfileName(profileData.name || user?.name || "");
          setTasks(tasksData || []);
          const notificationItems = buildDashboardNotifications(
            allTasksData || [],
            delegatedTasksData || []
          );
          setDashboardNotifications(notificationItems);
          setNotificationsOpen(notificationItems.length > 0);
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
          onOpenNotifications={() => setNotificationsOpen(true)}
          onCloseNotifications={() => setNotificationsOpen(false)}
        />

        <section className="employee-grid">
          <TaskList tasks={tasks} status={status} />
          <AttendancePanel />
        </section>
      </div>

      <FeedbackForm userType="employee" />
    </div>
  );
}
