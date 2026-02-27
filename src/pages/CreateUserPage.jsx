import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Loader } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import "../styles/CreateUserPage.css";

const specializations = [
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "Software Developer",
  "Research Engineer",
  "Data Engineer",
  "DevOps Engineer",
  "UI/UX Designer",
  "QA Engineer",
  "Product Manager"
];

export default function CreateUserPage() {
  const navigate = useNavigate();
  const { authFetch } = useAuth();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    specialization: ""
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState("");

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }
    if (!formData.password.trim()) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }
    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    }
    if (!formData.specialization.trim()) {
      newErrors.specialization = "Specialization is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
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
    setSuccessMessage("");

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

      setSuccessMessage(`✓ User ${newUser.name} (ID: ${newUser.empId}) created successfully!`);

      // Reset form
      setFormData({
        name: "",
        email: "",
        password: "",
        phone: "",
        specialization: ""
      });
      setErrors({});

      // Redirect after 2 seconds
      setTimeout(() => {
        navigate("/admin/dashboard");
      }, 2000);
    } catch (error) {
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

            {successMessage && (
              <div className="success-banner">
                <span>{successMessage}</span>
              </div>
            )}

            {errors.submit && (
              <div className="error-banner">
                <span>✕ {errors.submit}</span>
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
                    placeholder="Enter phone number"
                    className={errors.phone ? "input-error" : ""}
                  />
                  {errors.phone && <span className="error-text">{errors.phone}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group full-width">
                  <label htmlFor="specialization">Specialization *</label>
                  <select
                    id="specialization"
                    name="specialization"
                    value={formData.specialization}
                    onChange={handleChange}
                    className={errors.specialization ? "input-error" : ""}
                  >
                    <option value="">Select a specialization</option>
                    {specializations.map(spec => (
                      <option key={spec} value={spec}>{spec}</option>
                    ))}
                  </select>
                  {errors.specialization && <span className="error-text">{errors.specialization}</span>}
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
