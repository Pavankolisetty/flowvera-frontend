import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import EmployeeTasksPage from "./pages/EmployeeTasksPage";
import EmployeeProfilePage from "./pages/EmployeeProfilePage";
import UpdatePasswordPage from "./pages/UpdatePasswordPage";
import UpdateProgressPage from "./pages/UpdateProgressPage";
import AdminDashboard from "./pages/AdminDashboard";
import CreateUserPage from "./pages/CreateUserPage";
import { useAuth } from "./context/AuthContext";

const RequireAuth = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/employee/dashboard"
          element={
            <RequireAuth>
              <EmployeeDashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/employee/tasks"
          element={
            <RequireAuth>
              <EmployeeTasksPage />
            </RequireAuth>
          }
        />
        <Route
          path="/employee/profile"
          element={
            <RequireAuth>
              <EmployeeProfilePage />
            </RequireAuth>
          }
        />
        <Route
          path="/employee/update-password"
          element={
            <RequireAuth>
              <UpdatePasswordPage />
            </RequireAuth>
          }
        />
        <Route
          path="/employee/update-progress/:assignmentId"
          element={
            <RequireAuth>
              <UpdateProgressPage />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/dashboard"
          element={
            <RequireAuth>
              <AdminDashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/create-user"
          element={
            <RequireAuth>
              <CreateUserPage />
            </RequireAuth>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}