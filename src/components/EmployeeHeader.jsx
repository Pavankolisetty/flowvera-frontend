import { NavLink } from "react-router-dom";
import { ChevronLeft, ChevronRight, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

export default function EmployeeHeader({ name }) {
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };
  return (
    <header className="employee-header">
      <div className="employee-greeting">
        <span className="greeting-prefix">{getGreeting()},</span>
        <span className="greeting-name">{name || "Employee"}</span>
      </div>

      <nav className="employee-nav">
        <div className="nav-links-container">
          <NavLink
            to="/employee/dashboard"
            className={({ isActive }) =>
              `employee-nav-link${isActive ? " active" : ""}`
            }
          >
            <ChevronLeft className="nav-arrow left" size={16} />
            Dashboard
            <ChevronRight className="nav-arrow right" size={16} />
          </NavLink>
          <NavLink
            to="/employee/tasks"
            className={({ isActive }) =>
              `employee-nav-link${isActive ? " active" : ""}`
            }
          >
            <ChevronLeft className="nav-arrow left" size={16} />
            Tasks
            <ChevronRight className="nav-arrow right" size={16} />
          </NavLink>
          <NavLink
            to="/employee/profile"
            className={({ isActive }) =>
              `employee-nav-link${isActive ? " active" : ""}`
            }
          >
            <ChevronLeft className="nav-arrow left" size={16} />
            Profile
            <ChevronRight className="nav-arrow right" size={16} />
          </NavLink>
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          <LogOut size={16} />
          Logout
        </button>
      </nav>
    </header>
  );
}
