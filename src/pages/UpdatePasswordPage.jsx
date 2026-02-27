import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Lock, Eye, EyeOff, Check } from "lucide-react";
import EmployeeHeader from "../components/EmployeeHeader";
import { useAuth } from "../context/AuthContext";
import "../styles/EmployeeDashboard.css";

export default function UpdatePasswordPage() {
  const { user, authFetch, logout } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    old: false,
    new: false,
    confirm: false,
  });
  const [status, setStatus] = useState({ loading: false, error: "", success: false });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setStatus(prev => ({ ...prev, error: "", success: false }));
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.newPassword !== formData.confirmPassword) {
      setStatus({ loading: false, error: "New passwords do not match", success: false });
      return;
    }

    if (formData.newPassword.length < 6) {
      setStatus({ loading: false, error: "New password must be at least 6 characters", success: false });
      return;
    }

    setStatus({ loading: true, error: "", success: false });

    try {
      const response = await authFetch("/api/employee/update-password", {
        method: "PUT",
        body: JSON.stringify({
          oldPassword: formData.oldPassword,
          newPassword: formData.newPassword,
        }),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to update password");
      }

      setStatus({ loading: false, error: "", success: true });
      
      // Clear form after successful update
      setFormData({ oldPassword: "", newPassword: "", confirmPassword: "" });
      
      // Auto-logout after successful password change for security
      setTimeout(() => {
        logout();
        navigate("/login", { 
          state: { 
            message: "Password updated successfully! Please log in again with your new password for security." 
          }
        });
      }, 2000);
      
    } catch (error) {
      setStatus({ loading: false, error: error.message, success: false });
    }
  };

  return (
    <div className="employee-dashboard">
      <div className="dashboard-bg" aria-hidden="true"></div>
      <div className="employee-shell">
        <EmployeeHeader name={user?.name} />
        
        <section className="employee-quote compact">
          <span className="quote-label">Security</span>
          <h2>Update your password</h2>
        </section>
        
        <section className="employee-grid single">
          <div className="employee-panel password-panel">
            <div className="panel-header">
              <Link to="/employee/profile" className="back-link">
                <ArrowLeft size={16} />
                Back to Profile
              </Link>
            </div>
            
            <form className="password-form" onSubmit={handleSubmit}>
              <div className="password-fields-horizontal">
                <div className="form-group">
                  <label htmlFor="oldPassword">Current Password</label>
                  <div className="password-input-wrapper">
                    <Lock className="input-icon" size={18} />
                    <input
                      id="oldPassword"
                      type={showPasswords.old ? "text" : "password"}
                      value={formData.oldPassword}
                      onChange={(e) => handleInputChange("oldPassword", e.target.value)}
                      placeholder="Enter current password"
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => togglePasswordVisibility("old")}
                    >
                      {showPasswords.old ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="newPassword">New Password</label>
                  <div className="password-input-wrapper">
                    <Lock className="input-icon" size={18} />
                    <input
                      id="newPassword"
                      type={showPasswords.new ? "text" : "password"}
                      value={formData.newPassword}
                      onChange={(e) => handleInputChange("newPassword", e.target.value)}
                      placeholder="Enter new password"
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => togglePasswordVisibility("new")}
                    >
                      {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirm Password</label>
                  <div className="password-input-wrapper">
                    <Lock className="input-icon" size={18} />
                    <input
                      id="confirmPassword"
                      type={showPasswords.confirm ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                      placeholder="Confirm new password"
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => togglePasswordVisibility("confirm")}
                    >
                      {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>

              {status.error && (
                <div className="employee-error">{status.error}</div>
              )}

              {status.success && (
                <div className="success-message">
                  <Check size={16} />
                  Password updated successfully! You will be logged out for security. Please log in again.
                </div>
              )}

              <button 
                type="submit" 
                className="password-submit-btn" 
                disabled={status.loading || status.success}
              >
                {status.loading ? "Updating..." : "Update Password"}
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}