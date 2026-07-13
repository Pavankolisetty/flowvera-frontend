import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, Eye, EyeOff, Mail, Phone, Shield, User, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getDepartmentBrand } from "../../utils/departmentBranding";
import DepartmentBrandBadge from "./DepartmentBrandBadge";

const initialPasswordState = {
  oldPassword: "",
  newPassword: "",
  confirmPassword: "",
};

const getPasswordStrength = (password) => {
  const value = password || "";
  let score = 0;
  if (value.length >= 8) score += 1;
  if (value.length >= 12) score += 1;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;

  if (!value) {
    return { label: "Not started", className: "empty", score: 0 };
  }
  if (score <= 2) {
    return { label: "Weak", className: "weak", score };
  }
  if (score <= 4) {
    return { label: "Medium", className: "medium", score };
  }
  return { label: "Strong", className: "strong", score };
};

const passwordRequirements = [
  { label: "At least 8 characters", test: (value) => value.length >= 8 },
  { label: "Uppercase and lowercase letters", test: (value) => /[A-Z]/.test(value) && /[a-z]/.test(value) },
  { label: "At least one number", test: (value) => /\d/.test(value) },
  { label: "At least one special character", test: (value) => /[^A-Za-z0-9]/.test(value) },
];

export default function AccountPanel({ open, mode = "profile", onClose, variant = "modal", initialCurrentPassword = "" }) {
  const { authFetch, user, updateUser, logout } = useAuth();
  const [panelMode, setPanelMode] = useState(mode);
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(mode === "edit");
  const [formData, setFormData] = useState({ name: "", email: "", phone: "" });
  const [passwordData, setPasswordData] = useState(initialPasswordState);
  const [visiblePasswords, setVisiblePasswords] = useState({
    oldPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const [status, setStatus] = useState({ loading: false, error: "", success: "" });
  const authFetchRef = useRef(authFetch);
  const updateUserRef = useRef(updateUser);

  useEffect(() => {
    authFetchRef.current = authFetch;
    updateUserRef.current = updateUser;
  }, [authFetch, updateUser]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setPanelMode(mode);
    setEditing(mode === "edit");
      setStatus({ loading: false, error: "", success: "" });
      setVisiblePasswords({
        oldPassword: false,
        newPassword: false,
        confirmPassword: false,
      });
      setPasswordData((current) => ({
        ...current,
        oldPassword: initialCurrentPassword || current.oldPassword || "",
      }));
  }, [open, mode, initialCurrentPassword]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const loadProfile = async () => {
      try {
        const response = await authFetchRef.current("/api/account/me");
        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || "Failed to load account profile");
        }

        const data = await response.json();
        setProfile(data);
        updateUserRef.current({
          name: data.name,
          email: data.email,
          phone: data.phone,
          department: data.department,
          designation: data.designation,
          canAssignTask: Boolean(data.canAssignTask),
          departmentLead: Boolean(data.departmentLead),
        });
        setFormData({
          name: data.name || "",
          email: data.email || "",
          phone: data.phone || "",
        });
      } catch (error) {
        setStatus({ loading: false, error: error.message, success: "" });
      }
    };

    loadProfile();
  }, [open, mode]);

  const stats = useMemo(
    () => [
      { label: "Total Tasks Assigned", value: profile?.totalTasksAssigned ?? 0 },
      { label: "Tasks Accomplished", value: profile?.totalTasksCompleted ?? 0 },
      { label: "Average Progress", value: `${profile?.averageProgress ?? 0}%` },
    ],
    [profile]
  );

  const fallbackDesignation = user?.role === "ADMIN" ? "Administrator" : "Associate Engineer";
  const designation = String(profile?.designation || user?.designation || "").trim() || fallbackDesignation;
  const emailLabel = user?.role === "ADMIN" ? "Email Address / Approval Alerts" : "Email Address";
  const departmentBrand = getDepartmentBrand(profile?.department || user?.department);
  const passwordStrength = getPasswordStrength(passwordData.newPassword);

  if (!open) {
    return null;
  }

  const handleProfileSave = async () => {
    setStatus({ loading: true, error: "", success: "" });

    try {
      const response = await authFetch("/api/account/profile", {
        method: "PUT",
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || "Failed to update profile");
      }

      const updatedProfile = await response.json();
      setProfile(updatedProfile);
      setEditing(false);
      setStatus({ loading: false, error: "", success: "Profile updated successfully." });
      updateUser({
        name: updatedProfile.name,
        email: updatedProfile.email,
        phone: updatedProfile.phone,
        designation: updatedProfile.designation,
      });
    } catch (error) {
      setStatus({ loading: false, error: error.message, success: "" });
    }
  };

  const handlePasswordSave = async (event) => {
    event.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setStatus({ loading: false, error: "New passwords do not match.", success: "" });
      return;
    }

    const unmetRequirement = passwordRequirements.find((item) => !item.test(passwordData.newPassword));
    if (unmetRequirement) {
      setStatus({ loading: false, error: `New password requirement missing: ${unmetRequirement.label}.`, success: "" });
      return;
    }

    setStatus({ loading: true, error: "", success: "" });

    try {
      const response = await authFetch("/api/account/password", {
        method: "PUT",
        body: JSON.stringify({
          oldPassword: passwordData.oldPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const message = payload?.message || (await response.text()) || "Failed to update password";
        throw new Error(message);
      }

      setStatus({ loading: false, error: "", success: "Password updated. Please sign in again." });
      setPasswordData(initialPasswordState);
      window.sessionStorage.removeItem("flowveraTemporaryPassword");
      updateUser({ passwordResetRequired: false });
      setTimeout(async () => {
        await logout();
        window.location.href = "/login";
      }, 1200);
    } catch (error) {
      setStatus({ loading: false, error: error.message, success: "" });
    }
  };

  const renderPasswordInput = (field, label, autoComplete) => {
    const isVisible = visiblePasswords[field];
    const inputId = `account-${field}`;

    return (
      <div className="form-group">
        <label htmlFor={inputId}>{label}</label>
        <div className="account-password-control">
          <input
            id={inputId}
            type={isVisible ? "text" : "password"}
            value={passwordData[field]}
            autoComplete={autoComplete}
            onChange={(event) =>
              setPasswordData((current) => ({ ...current, [field]: event.target.value }))
            }
            required
          />
          <button
            type="button"
            className="account-password-toggle"
            onClick={() =>
              setVisiblePasswords((current) => ({ ...current, [field]: !current[field] }))
            }
            aria-label={isVisible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          >
            {isVisible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>
    );
  };

  const content = (
    <div className={variant === "page" ? "account-page-card" : "account-panel"}>
      <div className="account-panel-header">
        <div>
          <span className="account-panel-label">Account</span>
          <h2>{panelMode === "password" ? "Change Password" : "Profile Settings"}</h2>
        </div>
        <button type="button" className="account-panel-close" onClick={onClose}>
          {variant === "page" ? <ArrowLeft size={18} /> : <X size={18} />}
        </button>
      </div>

      <div className="account-panel-tabs">
        <button
          type="button"
          className={`account-panel-tab ${panelMode === "profile" ? "active" : ""}`}
          onClick={() => {
            setPanelMode("profile");
            setEditing(false);
            setStatus({ loading: false, error: "", success: "" });
          }}
        >
          Profile
        </button>
        <button
          type="button"
          className={`account-panel-tab ${panelMode === "password" ? "active" : ""}`}
          onClick={() => {
            setPanelMode("password");
            setStatus({ loading: false, error: "", success: "" });
          }}
        >
          Password
        </button>
      </div>

      {status.error && <div className="employee-error">{status.error}</div>}
      {status.success && (
        <div className="success-message">
          <Check size={16} />
          {status.success}
        </div>
      )}

      {panelMode === "password" ? (
        <form className="account-password-form" onSubmit={handlePasswordSave}>
          {renderPasswordInput("oldPassword", "Current Password", "current-password")}
          {renderPasswordInput("newPassword", "New Password", "new-password")}
          <div className={`password-strength-card ${passwordStrength.className}`}>
            <div className="password-strength-header">
              <span>Password strength</span>
              <strong>{passwordStrength.label}</strong>
            </div>
            <div className="password-strength-track" aria-hidden="true">
              <span style={{ width: `${Math.max(12, passwordStrength.score * 20)}%` }}></span>
            </div>
            <ul className="password-requirements">
              {passwordRequirements.map((item) => {
                const passed = item.test(passwordData.newPassword);
                return (
                  <li key={item.label} className={passed ? "passed" : ""}>
                    {passed ? <Check size={14} /> : <X size={14} />}
                    {item.label}
                  </li>
                );
              })}
            </ul>
          </div>
          {renderPasswordInput("confirmPassword", "Confirm New Password", "new-password")}
          <button type="submit" className="password-submit-btn" disabled={status.loading}>
            {status.loading ? "Updating..." : "Update Password"}
          </button>
        </form>
      ) : (
        <div className="account-profile-content">
          <div className="account-identity-card">
            <div className="account-identity-top">
              <DepartmentBrandBadge
                employeeName={profile?.name || user?.name}
                departmentName={profile?.department || user?.department}
                departmentCode={departmentBrand.shortName}
                departmentColor={departmentBrand.color}
                departmentIcon={departmentBrand.icon}
                size="lg"
                variant="profile"
              />
              <div>
                <h3>{profile?.name || user?.name}</h3>
                <p>{designation}</p>
                {profile?.department || user?.department ? (
                  <span
                    className="department-profile-badge"
                    style={{
                      "--department-color": departmentBrand.color,
                      "--department-soft": departmentBrand.softColor,
                      "--department-border": departmentBrand.borderColor,
                    }}
                  >
                    {departmentBrand.shortName} · {profile?.department || user?.department}
                  </span>
                ) : null}
              </div>
            </div>
            <div className="account-stats-grid">
              {stats.map((item) => (
                <div key={item.label} className="account-stat-card">
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="account-fields-grid">
            <div className="profile-field">
              <User size={20} />
              <div>
                <label>Full Name</label>
                {editing ? (
                  <input
                    value={formData.name}
                    onChange={(event) =>
                      setFormData((current) => ({ ...current, name: event.target.value }))
                    }
                  />
                ) : (
                  <span>{profile?.name}</span>
                )}
              </div>
            </div>

            <div className="profile-field">
              <Mail size={20} />
              <div>
                <label>{emailLabel}</label>
                {editing ? (
                  <input
                    value={formData.email}
                    onChange={(event) =>
                      setFormData((current) => ({ ...current, email: event.target.value }))
                    }
                  />
                ) : (
                  <span>{profile?.email}</span>
                )}
              </div>
            </div>

            <div className="profile-field">
              <Phone size={20} />
              <div>
                <label>Phone Number</label>
                {editing ? (
                  <input
                    value={formData.phone}
                    onChange={(event) =>
                      setFormData((current) => ({ ...current, phone: event.target.value }))
                    }
                  />
                ) : (
                  <span>{profile?.phone}</span>
                )}
              </div>
            </div>

            <div className="profile-field">
              <Shield size={20} />
              <div>
                <label>Designation</label>
                <span>{designation}</span>
              </div>
            </div>
          </div>

          <div className="account-panel-actions">
            {editing ? (
              <>
                <button
                  type="button"
                  className="account-action-btn secondary"
                  onClick={() => {
                    setEditing(false);
                    setFormData({
                      name: profile?.name || "",
                      email: profile?.email || "",
                      phone: profile?.phone || "",
                    });
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="account-action-btn primary"
                  onClick={handleProfileSave}
                  disabled={status.loading}
                >
                  {status.loading ? "Saving..." : "Save Changes"}
                </button>
              </>
            ) : (
              <button
                type="button"
                className="account-action-btn primary"
                onClick={() => setEditing(true)}
              >
                Edit Profile
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );

  if (variant === "page") {
    return content;
  }

  return (
    <div className="account-panel-overlay" onClick={onClose}>
      <div onClick={(event) => event.stopPropagation()}>
        {content}
      </div>
    </div>
  );
}
