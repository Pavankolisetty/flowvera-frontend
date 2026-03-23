import { useNavigate } from "react-router-dom";
import EmployeeHeader from "../components/EmployeeHeader";
import AccountPanel from "../components/shared/AccountPanel";
import { useAuth } from "../context/AuthContext";
import "../styles/EmployeeDashboard.css";

export default function EmployeeProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="employee-dashboard">
      <div className="dashboard-bg" aria-hidden="true"></div>
      <div className="employee-shell">
        <EmployeeHeader name={user?.name} />
        <section className="employee-quote compact">
          <span className="quote-label">Account Center</span>
          <h2>Manage your professional profile in one place</h2>
        </section>
        <section className="employee-grid single">
          <AccountPanel
            open={true}
            mode="profile"
            variant="page"
            onClose={() => navigate("/employee/dashboard")}
          />
        </section>
      </div>
    </div>
  );
}
