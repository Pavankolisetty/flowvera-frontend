import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import RegistrationPage from "./pages/RegistrationPage";

import EmployeeDashboard from "./pages/EmployeeDashboard";
import EmployeeTasksPage from "./pages/EmployeeTasksPage";
import EmployeeProfilePage from "./pages/EmployeeProfilePage";
import LeaveRequestPage from "./pages/LeaveRequestPage";
import UpdatePasswordPage from "./pages/UpdatePasswordPage";
import UpdateProgressPage from "./pages/UpdateProgressPage";
import AdminAccountPage from "./pages/AdminAccountPage";

import AdminDashboard from "./pages/AdminDashboard";
import UserApprovalsPage from "./pages/UserApprovalsPage";

import { useAuth } from "./context/AuthContext";

const normalizeRole = (role) => String(role || "").trim().toUpperCase();
const isAdminRole = (role) => normalizeRole(role) === "ADMIN";
const isEmployeeRole = (role) => {
  const normalizedRole = normalizeRole(role);
  return normalizedRole === "USER" || normalizedRole === "EMPLOYEE";
};

/* =========================
   AUTH PROTECTION
========================= */

const RequireAuth = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }

  return children;
};


/* =========================
   ADMIN ROLE PROTECTION
========================= */

const RequireAdmin = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const role = normalizeRole(user?.role);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }

  if (isEmployeeRole(role)) {
    return <Navigate to="/employee/dashboard" replace />;
  }

  if (!isAdminRole(role)) {
    return <Navigate to="/login" replace />;
  }

  return children;
};


/* =========================
   EMPLOYEE ROLE PROTECTION
========================= */

const RequireEmployee = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const role = normalizeRole(user?.role);
  const currentPath = `${location.pathname}${location.search}`;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: currentPath }} />;
  }

  if (isAdminRole(role)) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  if (!isEmployeeRole(role)) {
    return <Navigate to="/login" replace />;
  }

  if (user?.passwordResetRequired && location.pathname !== "/employee/update-password") {
    return <Navigate to="/employee/update-password" replace />;
  }

  return children;
};


/* =========================
   MAIN APP ROUTES
========================= */

export default function App() {

  return (
    <BrowserRouter>

      {/* Global Toast Notifications */}
      <Toaster position="top-right" />

      <Routes>

        {/* Public Routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/register" element={<RegistrationPage />} />
        <Route path="/auth/verify-email" element={<RegistrationPage />} />


        {/* =========================
            EMPLOYEE ROUTES
        ========================= */}

        <Route
          path="/employee/dashboard"
          element={
            <RequireEmployee>
              <EmployeeDashboard />
            </RequireEmployee>
          }
        />

        <Route
          path="/employee/tasks"
          element={
            <RequireEmployee>
              <EmployeeTasksPage />
            </RequireEmployee>
          }
        />

        <Route
          path="/employee/profile"
          element={
            <RequireEmployee>
              <EmployeeProfilePage />
            </RequireEmployee>
          }
        />

        <Route
          path="/employee/update-password"
          element={
            <RequireEmployee>
              <UpdatePasswordPage />
            </RequireEmployee>
          }
        />

        <Route
          path="/employee/update-progress/:assignmentId"
          element={
            <RequireEmployee>
              <UpdateProgressPage />
            </RequireEmployee>
          }
        />


        {/* =========================
            ADMIN ROUTES
        ========================= */}

        <Route
          path="/admin/dashboard"
          element={
            <RequireAdmin>
              <AdminDashboard />
            </RequireAdmin>
          }
        />

        <Route
          path="/admin/user-approvals"
          element={
            <RequireAdmin>
              <UserApprovalsPage />
            </RequireAdmin>
          }
        />

        <Route
          path="/employee/leave-request"
          element={
            <RequireEmployee>
              <LeaveRequestPage />
            </RequireEmployee>
          }
        />

        <Route
          path="/admin/account"
          element={
            <RequireAdmin>
              <AdminAccountPage />
            </RequireAdmin>
          }
        />


        {/* =========================
            404 ROUTE
        ========================= */}

        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>

    </BrowserRouter>
  );
}
