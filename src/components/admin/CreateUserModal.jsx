import { useMemo, useState } from "react";
import { X, Plus, Loader } from "lucide-react";
import { toast } from "react-hot-toast";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import CountrySelect from "../shared/CountrySelect";
import "../../styles/CreateUserModal.css";

const CreateUserModal = ({ isOpen, onClose, authFetch }) => {

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

  const allowedDomains = ["gmail.com", "outlook.com", "yahoo.com", "zoho.com"];

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

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number required";
    } 
    else if (!isValidPhone(formData.phone, formData.phoneCountryIso)) {
      newErrors.phone = "Invalid phone number for selected country";
    }

    if (!formData.designation.trim()) {
      newErrors.designation = "Designation required";
    }
    if (!emailVerified) {
      newErrors.email = newErrors.email || "Email must be verified before creating a user";
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

    if (name === "email") {
      setEmailVerified(false);
      setVerificationToken("");
    }
  };

  const isValidPhone = (phone, iso) => {
    const parsed = parsePhoneNumberFromString(phone, iso);
    return parsed ? parsed.isValid() : false;
  };

  const isEmailFormatValid = formData.email.trim()
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)
    && isValidEmailDomain(formData.email);

  const handleVerifyEmail = async () => {
    if (!isEmailFormatValid) {
      toast.error("Enter a valid email before verifying");
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
        const errorData = await response.json().catch(() => ({
          message: "Failed to verify email"
        }));
        throw new Error(errorData.message);
      }

      const data = await response.json();
      setVerificationToken(data.verificationToken);
      setEmailVerified(true);
      toast.success("Verification email sent");
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

    if (!validateForm()) return;

    setLoading(true);

    try {

      const selectedCountry = countryOptions.find(option => option.iso === formData.phoneCountryIso);
      const parsedPhone = parsePhoneNumberFromString(formData.phone, formData.phoneCountryIso);
      if (!parsedPhone || !parsedPhone.isValid()) {
        throw new Error("Invalid phone number for selected country");
      }

      const payload = {
        name: formData.name,
        email: formData.email,
        phone: parsedPhone.format("E.164"),
        phoneCountryCode: selectedCountry?.dialCode || "",
        designation: formData.designation,
        verificationToken
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
        phone: "",
        phoneCountryIso: "IN",
        designation: ""
      });

      setEmailVerified(false);
      setVerificationToken("");
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
            <div className="email-verify-row">
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter email"
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
            {emailVerified && <span className="verified-badge">Email verified</span>}
          </div>

          <div className="form-group">
            <label>Phone *</label>

            <div className="phone-input-row">
              <CountrySelect
                name="phoneCountryIso"
                value={formData.phoneCountryIso}
                onChange={handleChange}
                options={countryOptions}
                hasError={Boolean(errors.phone)}
              />
              <input
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
              disabled={loading || !emailVerified || verifyingEmail}
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
