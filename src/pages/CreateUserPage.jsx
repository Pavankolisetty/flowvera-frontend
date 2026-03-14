import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Loader } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-hot-toast";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import CountrySelect from "../components/shared/CountrySelect";
import "../styles/CreateUserPage.css";

// Designation is now a free-text input field

export default function CreateUserPage() {
  const navigate = useNavigate();
  const { authFetch } = useAuth();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    phoneCountryIso: "IN",
    designation: ""
  });

  const [loading, setLoading] = useState(false);
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [verificationToken, setVerificationToken] = useState("");
  const [errors, setErrors] = useState({});

  const countryOptions = useMemo(() => ([
    { iso: "IN", name: "India", dialCode: "+91" },
    { iso: "US", name: "United States", dialCode: "+1" },
    { iso: "GB", name: "United Kingdom", dialCode: "+44" },
    { iso: "AE", name: "United Arab Emirates", dialCode: "+971" },
    { iso: "SG", name: "Singapore", dialCode: "+65" },
    { iso: "AU", name: "Australia", dialCode: "+61" },
    { iso: "CA", name: "Canada", dialCode: "+1" },
    { iso: "DE", name: "Germany", dialCode: "+49" }
  ]), []);

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
    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!isValidPhone(formData.phone, formData.phoneCountryIso)) {
      newErrors.phone = "Invalid phone number for selected country";
    }
    if (!formData.designation.trim()) {
      newErrors.designation = "Designation is required";
    }
    if (!emailVerified) {
      newErrors.email = newErrors.email || "Email must be verified before creating a user";
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

  const isEmailFormatValid = formData.email.trim()
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)
    && isValidEmailDomain(formData.email);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let updatedValue = value;

    // Handle phone number: only allow 10 digits
    if (name === "phone") {
      const digitsOnly = value.replace(/\D/g, "");
      updatedValue = digitsOnly;
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

    if (name === "email") {
      setEmailVerified(false);
      setVerificationToken("");
    }
  };

  const isValidPhone = (phone, iso) => {
    const parsed = parsePhoneNumberFromString(phone, iso);
    return parsed ? parsed.isValid() : false;
  };

  const handleVerifyEmail = async () => {
    if (!formData.email.trim()) {
      setErrors(prev => ({ ...prev, email: "Email is required" }));
      toast.error("Email is required");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setErrors(prev => ({ ...prev, email: "Invalid email format" }));
      toast.error("Invalid email format");
      return;
    }
    if (!isValidEmailDomain(formData.email)) {
      setErrors(prev => ({ ...prev, email: "Email domain not allowed. Use Gmail, Outlook, Yahoo, or Zoho" }));
      toast.error("Email domain not allowed");
      return;
    }

    setVerifyingEmail(true);
    try {
      const response = await authFetch("/api/admin/verify-email", {
        method: "POST",
        body: JSON.stringify({
          email: formData.email,
          name: formData.name
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to verify email");
      }

      const data = await response.json();
      setVerificationToken(data.verificationToken);
      setEmailVerified(true);
      toast.success("Verification email sent successfully");
    } catch (error) {
      setEmailVerified(false);
      setVerificationToken("");
      toast.error(error.message || "Failed to verify email");
    } finally {
      setVerifyingEmail(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);


    try {
      const selectedCountry = countryOptions.find(option => option.iso === formData.phoneCountryIso);
      const parsedPhone = parsePhoneNumberFromString(formData.phone, formData.phoneCountryIso);
      if (!parsedPhone || !parsedPhone.isValid()) {
        throw new Error("Invalid phone number for selected country");
      }

      const response = await authFetch("/api/admin/create-user", {
        method: "POST",
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: parsedPhone.format("E.164"),
          phoneCountryCode: selectedCountry?.dialCode || "",
          designation: formData.designation,
          verificationToken
        })
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
        phone: "",
        phoneCountryIso: "IN",
        designation: ""
      });
      setEmailVerified(false);
      setVerificationToken("");
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
                  <div className="email-verify-row">
                    <input
                      id="email"
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="Enter employee's email"
                      className={errors.email ? "input-error" : ""}
                    />
                    <button
                      type="button"
                      className="btn-verify"
                      onClick={handleVerifyEmail}
                      disabled={verifyingEmail || emailVerified || !isEmailFormatValid}
                    >
                      {verifyingEmail ? "Verifying..." : emailVerified ? "Verified" : "Verify Email"}
                    </button>
                  </div>
                  {errors.email && <span className="error-text">{errors.email}</span>}
                  <span className="helper-text">
                    Allowed email domains: gmail.com, outlook.com, yahoo.com, zoho.com
                  </span>
                  {emailVerified && (
                    <span className="verified-badge">Email verified</span>
                  )}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="phone">Phone Number *</label>
                  <div className="phone-input-row">
                    <CountrySelect
                      name="phoneCountryIso"
                      value={formData.phoneCountryIso}
                      onChange={handleChange}
                      options={countryOptions}
                      hasError={Boolean(errors.phone)}
                    />
                    <input
                      id="phone"
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="Enter phone number"
                      className={errors.phone ? "input-error" : ""}
                    />
                  </div>
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
                  disabled={loading || !emailVerified || verifyingEmail}
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
              <h3>Login Credentials</h3>
              <ul>
                <li>Temporary password is emailed after verification</li>
                <li>Users are required to reset the password on first login</li>
                <li>Credentials are sent only after email verification</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
