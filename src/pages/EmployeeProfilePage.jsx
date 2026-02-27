import { useEffect, useState } from "react";
import EmployeeHeader from "../components/EmployeeHeader";
import UserProfile from "../components/shared/UserProfile";
import { useAuth } from "../context/AuthContext";
import "../styles/EmployeeDashboard.css";

export default function EmployeeProfilePage() {
  const { user, authFetch } = useAuth();
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState({ loading: true, error: "" });

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      try {
        const response = await authFetch("/api/employee/me");

        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || "Failed to load profile");
        }

        const data = await response.json();

        if (isMounted) {
          setProfile(data);
          setStatus({ loading: false, error: "" });
        }
      } catch (error) {
        if (isMounted) {
          setStatus({ loading: false, error: error.message });
        }
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [authFetch]);

  if (status.loading) {
    return (
      <div className="employee-dashboard">
        <div className="dashboard-bg" aria-hidden="true"></div>
        <div className="employee-shell">
          <EmployeeHeader name={user?.name} />
          <section className="employee-quote compact">
            <span className="quote-label">Profile</span>
            <h2>Loading your profile...</h2>
          </section>
        </div>
      </div>
    );
  }

  if (status.error) {
    return (
      <div className="employee-dashboard">
        <div className="dashboard-bg" aria-hidden="true"></div>
        <div className="employee-shell">
          <EmployeeHeader name={user?.name} />
          <section className="employee-quote compact">
            <span className="quote-label">Profile</span>
            <h2>Failed to load profile</h2>
          </section>
          <section className="employee-grid single">
            <div className="employee-panel">
              <div className="employee-error">{status.error}</div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="employee-dashboard">
      <div className="dashboard-bg" aria-hidden="true"></div>
      <div className="employee-shell">
        <EmployeeHeader name={profile?.name || user?.name} />
        
        <section className="employee-quote compact">
          <span className="quote-label">Profile</span>
          <h2>Your professional details</h2>
        </section>
        
        <section className="employee-grid single">
          <div className="employee-panel profile-panel">
            <UserProfile 
              user={profile} 
              userType="employee" 
              showUpdatePassword={true} 
            />
          </div>
        </section>
      </div>
    </div>
  );
}
