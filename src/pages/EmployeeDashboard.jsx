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
  const [status, setStatus] = useState({ loading: true, error: "" });

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      try {
        const [profileResponse, tasksResponse] = await Promise.all([
          authFetch("/api/employee/me"),
          authFetch("/api/employee/my-tasks/active"),
        ]);

        if (!profileResponse.ok) {
          const message = await profileResponse.text();
          throw new Error(message || "Failed to load profile");
        }

        if (!tasksResponse.ok) {
          const message = await tasksResponse.text();
          throw new Error(message || "Failed to load tasks");
        }

        const profileData = await profileResponse.json();
        const tasksData = await tasksResponse.json();

        if (isMounted) {
          setProfileName(profileData.name || user?.name || "");
          setTasks(tasksData || []);
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
        <EmployeeHeader name={profileName} />

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
