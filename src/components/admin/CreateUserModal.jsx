import { useState } from "react";
import { X, Plus, Loader } from "lucide-react";
import { toast } from "react-hot-toast";
import "../../styles/CreateUserModal.css";

const CreateUserModal = ({ isOpen, onClose, authFetch }) => {

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    empId: "",
    password: "",
    phone: "",
    designation: ""
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const allowedDomains = ["gmail.com", "outlook.com", "yahoo.com", "zoho.com"];

  const isValidEmailDomain = (email) => {
    const domain = email.split("@")[1]?.toLowerCase();
    return allowedDomains.includes(domain);
  };

  const validateForm = () => {

    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } 
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    } 
    else if (!isValidEmailDomain(formData.email)) {
      newErrors.email = "Only Gmail, Outlook, Yahoo, Zoho allowed";
    }

    if (!formData.empId.trim()) {
      newErrors.empId = "Employee ID is required";
    }

    if (!formData.password.trim()) {
      newErrors.password = "Password is required";
    } 
    else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number required";
    } 
    else if (!/^\d{10}$/.test(formData.phone)) {
      newErrors.phone = "Phone must be 10 digits";
    }

    if (!formData.designation.trim()) {
      newErrors.designation = "Designation required";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      toast.error(Object.values(newErrors)[0]);
      return false;
    }

    return true;
  };

  const handleChange = (e) => {

    const { name, value } = e.target;

    if (name === "phone") {

      const digits = value.replace(/\D/g, "");

      if (digits.length > 10) return;

      setFormData(prev => ({
        ...prev,
        phone: digits
      }));

      return;
    }

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

    if (!validateForm()) return;

    setLoading(true);

    try {

      const payload = {
        ...formData
      };

      const response = await authFetch("/api/admin/create-user", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      if (!response.ok) {

        const errorData = await response.json().catch(() => ({
          message: "Failed to create user"
        }));

        throw new Error(errorData.message);
      }

      const newUser = await response.json();

      toast.success(`User ${newUser.name} created successfully`);

      setFormData({
        name: "",
        email: "",
        empId: "",
        password: "",
        phone: "",
        designation: ""
      });

      setErrors({});

      onClose();

    } catch (error) {

      toast.error(error.message || "Error creating user");

    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (

    <div className="modal-overlay" onClick={onClose}>

      <div className="modal-content create-user-modal" onClick={(e) => e.stopPropagation()}>

        <div className="modal-header">
          <h2>Create New User</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24}/>
          </button>
        </div>

        {errors.submit && (
          <div className="error-message">
            <p>{errors.submit}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="create-user-form">

          <div className="form-group">
            <label>Full Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter full name"
              className={errors.name ? "input-error" : ""}
            />
            {errors.name && <span className="error-text">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label>Email *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter email"
              className={errors.email ? "input-error" : ""}
            />
            {errors.email && <span className="error-text">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label>Employee ID *</label>
            <input
              type="text"
              name="empId"
              value={formData.empId}
              onChange={handleChange}
              placeholder="Enter employee ID"
              className={errors.empId ? "input-error" : ""}
            />
            {errors.empId && <span className="error-text">{errors.empId}</span>}
          </div>

          <div className="form-group">
            <label>Password *</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Min 6 characters"
              className={errors.password ? "input-error" : ""}
            />            {errors.password && <span className="error-text">{errors.password}</span>}          </div>

          <div className="form-group">
            <label>Phone *</label>

            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Enter 10 digit number"
              maxLength={10}
              className={errors.phone ? "input-error" : ""}
            />
            {errors.phone && <span className="error-text">{errors.phone}</span>}

          </div>

          <div className="form-group">
            <label>Designation *</label>
            <input
              type="text"
              name="designation"
              value={formData.designation}
              onChange={handleChange}
              placeholder="Frontend Developer"
              className={errors.designation ? "input-error" : ""}
            />
            {errors.designation && <span className="error-text">{errors.designation}</span>}
          </div>

          <div className="form-actions">

            <button
              type="button"
              className="btn-cancel"
              onClick={onClose}
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
                  <Loader size={16} className="spinner"/>
                  Creating...
                </>
              ) : (
                <>
                  <Plus size={16}/>
                  Create User
                </>
              )}

            </button>

          </div>

        </form>

      </div>

    </div>

  );
};

export default CreateUserModal;