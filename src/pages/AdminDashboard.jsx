import { useState, useEffect, useRef, useCallback } from "react";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import AdminAnalytics from "../components/admin/AdminAnalytics";
import AdminDocs from "../components/admin/AdminDocs";
import AdminTaskManagement from "../components/admin/AdminTaskManagement";
import UserProfile from "../components/shared/UserProfile";
import FeedbackForm from "../components/shared/FeedbackForm";
import FeedbackViewer from "../components/admin/FeedbackViewer";
import "../styles/AdminDashboard.css";

export default function AdminDashboard() {
  const { authFetch, user, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("stats");
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const notificationTimer = useRef(null);
  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // use react-hot-toast for notifications
  const showNotification = useCallback((message, type = "success") => {
    if (notificationTimer.current) {
      clearTimeout(notificationTimer.current);
    }
    setNotification({ message, type });
    notificationTimer.current = setTimeout(() => {
      setNotification(null);
      notificationTimer.current = null;
    }, 3200);
  }, []);

  useEffect(() => {
    loadData();
  }, [authFetch]);

  const loadData = async () => {
    try {
      setDataLoading(true);

      const [tasksResponse, employeesResponse, assignmentsResponse] =
        await Promise.all([
          authFetch("/api/admin/tasks"),
          authFetch("/api/admin/employees"),
          authFetch("/api/admin/all-assignments"),
        ]);

      if (tasksResponse.ok) {
        const tasksData = await tasksResponse.json();
        setTasks(tasksData || []);
      } else {
        showNotification(`Failed to load tasks (status ${tasksResponse.status})`, "error");
      }

      if (employeesResponse.ok) {
        const employeesData = await employeesResponse.json();
        setEmployees(employeesData || []);
      } else {
        showNotification(`Failed to load employees (status ${employeesResponse.status})`, "error");
      }

      if (assignmentsResponse.ok) {
        const assignmentsData = await assignmentsResponse.json();
        setAssignments(assignmentsData || []);
      } else {
        showNotification(`Failed to load assignments (status ${assignmentsResponse.status})`, "error");
      }
    } catch (error) {
      console.error("Failed to load data:", error);
      showNotification("Failed to load dashboard data", "error");
    } finally {
      setDataLoading(false);
    }
  };

  return (
    <div className="admin-dashboard">
      <div className="dashboard-bg"></div>

      <div className="admin-shell">
        <div className="admin-header">
          <div className="admin-greeting">
            <span className="greeting-prefix">Administrator Panel</span>
            <span className="greeting-name">
              Welcome back, {user?.name}
            </span>
          </div>

          <div className="admin-nav">
            <div className="nav-links-container">
              <button
                className={`admin-nav-link ${
                  activeTab === "stats" ? "active" : ""
                }`}
                onClick={() => setActiveTab("stats")}
              >
                Analytics
              </button>

              <button
                className={`admin-nav-link ${
                  activeTab === "docs" ? "active" : ""
                }`}
                onClick={() => setActiveTab("docs")}
              >
                Documents
              </button>

              <button
                className={`admin-nav-link ${
                  activeTab === "task-management" ? "active" : ""
                }`}
                onClick={() => setActiveTab("task-management")}
              >
                Task Management
              </button>

              <button
                className={`admin-nav-link ${
                  activeTab === "profile" ? "active" : ""
                }`}
                onClick={() => setActiveTab("profile")}
              >
                Profile
              </button>

              <button
                className={`admin-nav-link ${
                  activeTab === "feedback" ? "active" : ""
                }`}
                onClick={() => setActiveTab("feedback")}
              >
                Feedback
              </button>

              <button className="logout-btn" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </div>
        </div>

        <div className="admin-content">
          {activeTab === "stats" && (
            <AdminAnalytics
              employees={employees}
              assignments={assignments}
              authFetch={authFetch}
              showNotification={showNotification}
              dataLoading={dataLoading}
            />
          )}

          {activeTab === "docs" && (
            <AdminDocs
              authFetch={authFetch}
              showNotification={showNotification}
            />
          )}

          {activeTab === "task-management" && (
            <AdminTaskManagement
              employees={employees}
              authFetch={authFetch}
              showNotification={showNotification}
              loadData={loadData}
            />
          )}

          {activeTab === "profile" && (
            <UserProfile
              user={user}
              userType="admin"
              showUpdatePassword={false}
              authFetch={authFetch}
              showNotification={showNotification}
            />
          )}

          {activeTab === "feedback" && (
            <FeedbackViewer authFetch={authFetch} />
          )}
        </div>
      </div>

      <FeedbackForm userType="admin" />

      {notification && (
        <div
          className="notification-backdrop"
          onClick={() => setNotification(null)}
        >
          <div
            className={`notification ${notification.type}`}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="notification-close"
              onClick={() => setNotification(null)}
              aria-label="Close notification"
            >
              &times;
            </button>
            <div className="notification-content">
              <div className="notification-message">
                {notification.message}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
