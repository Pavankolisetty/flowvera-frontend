import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AccountPanel from "../components/shared/AccountPanel";
import { useAuth } from "../context/AuthContext";
import "../styles/AdminDashboard.css";

export default function AdminAccountPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const mode = useMemo(
    () => (searchParams.get("tab") === "password" ? "password" : "profile"),
    [searchParams]
  );

  return (
    <div className="admin-dashboard">
      <div className="dashboard-bg"></div>
      <div className="admin-shell">
        <section className="account-page-hero">
          <span className="greeting-prefix">Account Center</span>
          <h1 className="greeting-name">{user?.name || "Admin Account"}</h1>
          <p className="account-page-copy">
            Manage your profile details and security settings in a dedicated workspace.
          </p>
        </section>

        <AccountPanel
          open={true}
          mode={mode}
          variant="page"
          onClose={() => navigate("/admin/dashboard")}
        />
      </div>
    </div>
  );
}
