import { useState, useEffect, useRef, useCallback } from "react";
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
  const timeoutRef = useRef(null);

  const [activeTab, setActiveTab] = useState("stats");
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const showNotification = useCallback((message, type = "success") => {
    // Clear previous timer if exists
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setNotification({ message, type });

    timeoutRef.current = setTimeout(() => {
      setNotification(null);
      timeoutRef.current = null;
    }, 5000); // 5 seconds
  }, []);

  useEffect(() => {
    loadData();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [authFetch]);

  const loadData = async () => {
    try {
      setLoading(true);

      const [tasksResponse, employeesResponse, assignmentsResponse] =
        await Promise.all([
          authFetch("/api/admin/tasks"),
          authFetch("/api/admin/employees"),
          authFetch("/api/admin/all-assignments"),
        ]);

      if (tasksResponse.ok) {
        const tasksData = await tasksResponse.json();
        setTasks(tasksData || []);
      }

      if (employeesResponse.ok) {
        const employeesData = await employeesResponse.json();
        setEmployees(employeesData || []);
      }

      if (assignmentsResponse.ok) {
        const assignmentsData = await assignmentsResponse.json();
        setAssignments(assignmentsData || []);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
      showNotification("Failed to load dashboard data", "error");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="admin-header">
          <h1>Admin Dashboard</h1>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="dashboard-bg"></div>

      {notification && (
        <div className={`notification ${notification.type}`}>
          <div className="notification-content">
            <span className="notification-message">
              {notification.message}
            </span>
            <button
              className="notification-close"
              onClick={() => {
                if (timeoutRef.current) {
                  clearTimeout(timeoutRef.current);
                  timeoutRef.current = null;
                }
                setNotification(null);
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}

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
    </div>
  );
}
