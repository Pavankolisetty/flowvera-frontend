import { useEffect, useState } from "react";
import EmployeeHeader from "../components/EmployeeHeader";
import TaskList from "../components/employee/TaskList";
import AttendancePanel from "../components/employee/AttendancePanel";
import QuoteSection from "../components/employee/QuoteSection";
import FeedbackForm from "../components/shared/FeedbackForm";
import { useAuth } from "../context/AuthContext";
import "../styles/EmployeeDashboard.css";

export default function EmployeeDashboard() {
  const { authFetch, user } = useAuth();
  const [profileName, setProfileName] = useState(user?.name || "");
  const [tasks, setTasks] = useState([]);
  const [taskNotifications, setTaskNotifications] = useState({
    hasAccepted: false,
    hasChanges: false,
  });
  const [status, setStatus] = useState({ loading: true, error: "" });

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      try {
        const [profileResponse, tasksResponse, allTasksResponse] = await Promise.all([
          authFetch("/api/employee/me"),
          authFetch("/api/employee/my-tasks/active"),
          authFetch("/api/employee/my-tasks"),
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

        const profileData = await profileResponse.json();
        const tasksData = await tasksResponse.json();
        const allTasksData = await allTasksResponse.json();

        if (isMounted) {
          setProfileName(profileData.name || user?.name || "");
          setTasks(tasksData || []);
          setTaskNotifications({
            hasAccepted: (allTasksData || []).some(
              (task) => task.employeeNotificationUnread && task.employeeCelebrationPending
            ),
            hasChanges: (allTasksData || []).some(
              (task) =>
                task.employeeNotificationUnread &&
                task.status === "CHANGES_REQUESTED"
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

        <QuoteSection />

        <section className="employee-grid">
          <TaskList tasks={tasks} status={status} />
          <AttendancePanel />
        </section>
      </div>

      <FeedbackForm userType="employee" />
    </div>
  );
}
