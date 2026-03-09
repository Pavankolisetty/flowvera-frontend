import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Loader } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-hot-toast";
import "../styles/CreateUserPage.css";

// Designation is now a free-text input field

export default function CreateUserPage() {
  const navigate = useNavigate();
  const { authFetch } = useAuth();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    designation: ""
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    } else if (!isValidEmailDomain(formData.email)) {
      newErrors.email = "Email domain not allowed. Use Gmail, Outlook, Yahoo, or Zoho";
    }
    if (!formData.password.trim()) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }
    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^\d{10}$/.test(formData.phone)) {
      newErrors.phone = "Phone number must be 10 digits";
    }
    if (!formData.designation.trim()) {
      newErrors.designation = "Designation is required";
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      const firstMsg = newErrors[Object.keys(newErrors)[0]];
      toast.error(firstMsg);
      return false;
    }
    return true;
  };

  const isValidEmailDomain = (email) => {
    const allowedDomains = ["gmail.com", "outlook.com", "yahoo.com", "zoho.com"];
    const domain = email.substring(email.indexOf("@") + 1).toLowerCase();
    return allowedDomains.includes(domain);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let updatedValue = value;

    // Handle phone number: only allow 10 digits
    if (name === "phone") {
      const digitsOnly = value.replace(/\D/g, "");
      if (digitsOnly.length <= 10) {
        updatedValue = digitsOnly;
      } else {
        return; // Don't update if more than 10 digits
      }
    }

    setFormData(prev => ({
      ...prev,
      [name]: updatedValue
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);


    try {
      const response = await authFetch("/api/admin/create-user", {
        method: "POST",
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to create user");
      }

      const newUser = await response.json();

      toast.success(`User ${newUser.name} (ID: ${newUser.empId}) created successfully!`);

      // Reset form
      setFormData({
        name: "",
        email: "",
        password: "",
        phone: "",
        designation: ""
      });
      setErrors({});

      // Redirect after a moment
      setTimeout(() => {
        navigate("/admin/dashboard");
      }, 1000);
    } catch (error) {
      toast.error(error.message || "Error creating user");
      setErrors({
        submit: error.message || "Error creating user"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-user-page">
      <div className="page-bg" aria-hidden="true"></div>

      <div className="create-user-shell">
        <div className="create-user-header">
          <button 
            className="back-btn"
            onClick={() => navigate(-1)}
            disabled={loading}
          >
            <ArrowLeft size={20} />
            Back
          </button>
          <h1>Create New Employee</h1>
          <div></div>
        </div>

        <div className="create-user-container">
          <div className="form-section">
            <div className="section-header">
              <h2>Employee Information</h2>
              <p>Fill in the details to create a new employee account</p>
            </div>

            {errors.submit && (
              <div className="error-message">
                <p>{errors.submit}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="create-user-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="name">Full Name *</label>
                  <input
                    id="name"
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter employee's full name"
                    className={errors.name ? "input-error" : ""}
                  />
                  {errors.name && <span className="error-text">{errors.name}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email Address *</label>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter employee's email"
                    className={errors.email ? "input-error" : ""}
                  />
                  {errors.email && <span className="error-text">{errors.email}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="password">Password *</label>
                  <input
                    id="password"
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter password (minimum 6 characters)"
                    className={errors.password ? "input-error" : ""}
                  />
                  {errors.password && <span className="error-text">{errors.password}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="phone">Phone Number *</label>
                  <input
                    id="phone"
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="Enter 10-digit phone number"
                    maxLength="13"
                    className={errors.phone ? "input-error" : ""}
                  />
                  {errors.phone && <span className="error-text">{errors.phone}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group full-width">
                  <label htmlFor="designation">Designation *</label>
                  <input
                    id="designation"
                    type="text"
                    name="designation"
                    value={formData.designation}
                    onChange={handleChange}
                    placeholder="e.g., Frontend Developer, Backend Developer"
                    className={errors.designation ? "input-error" : ""}
                  />
                  {errors.designation && <span className="error-text">{errors.designation}</span>}
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => navigate(-1)}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-submit"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader size={18} className="spinner" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus size={18} />
                      Create Employee
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          <div className="info-section">
            <div className="info-card">
              <h3>Auto-Generated Information</h3>
              <p>The following will be automatically assigned:</p>
              <ul>
                <li><strong>Employee ID:</strong> System generated (e.g., 0001, 0002)</li>
                <li><strong>Role:</strong> User (default for all new employees)</li>
                <li><strong>Join Date:</strong> Current date & time</li>
              </ul>
            </div>

            <div className="info-card">
              <h3>Password Requirements</h3>
              <ul>
                <li>Minimum 6 characters</li>
                <li>Easy to remember for the employee</li>
                <li>Can be changed later in profile settings</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
