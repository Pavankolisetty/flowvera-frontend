import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, Clock3, Mail, MessageSquare, Phone, Sparkles, User } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { buildApiUrl } from "../config/api";
import CountrySelect from "../components/shared/CountrySelect";
import "../styles/RegistrationPage.css";

const countryOptions = [
  { iso: "IN", name: "India", dialCode: "+91" },
  { iso: "US", name: "United States", dialCode: "+1" },
  { iso: "GB", name: "United Kingdom", dialCode: "+44" },
  { iso: "AE", name: "United Arab Emirates", dialCode: "+971" },
  { iso: "SG", name: "Singapore", dialCode: "+65" },
];

const messageFromPayload = async (response, fallback) => {
  const payload = await response.json().catch(() => null);
  return payload?.message || fallback;
};

export default function RegistrationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTimer = useRef(null);
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const token = params.get("token") || "";
  const emailFromQuery = params.get("email") || "";
  const emailVerifiedFromQuery = params.get("emailVerified") === "1";
  const normalizedPathname = location.pathname.replace(/\/+$/, "") || "/";
  const isVerificationRoute = normalizedPathname === "/auth/verify-email";

  const [formData, setFormData] = useState({
    email: emailFromQuery,
    phone: "",
    phoneCountryIso: "IN",
    name: "",
    otp: "",
  });
  const [status, setStatus] = useState({
    sendingEmail: false,
    sendingOtp: false,
    verifyingOtp: false,
    completing: false,
  });
  const [state, setState] = useState({
    emailVerified: emailVerifiedFromQuery,
    phoneVerified: false,
    message: emailVerifiedFromQuery ? "Email verified successfully. Continue with phone verification." : "",
    error: "",
    debugOtp: "",
  });
  const [completionNotice, setCompletionNotice] = useState(null);

  useEffect(() => {
    return () => {
      if (redirectTimer.current) {
        clearTimeout(redirectTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isVerificationRoute || !token) {
      return;
    }

    const verifyEmail = async () => {
      setState((current) => ({ ...current, error: "", message: "Verifying your email..." }));
      try {
        const response = await fetch(buildApiUrl(`/api/auth/verify-email?token=${encodeURIComponent(token)}`));
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(payload?.message || "Email verification failed.");
        }
        const verifiedEmail = payload?.email || emailFromQuery;
        setFormData((current) => ({ ...current, email: verifiedEmail }));
        setState((current) => ({
          ...current,
          emailVerified: true,
          error: "",
          message: "Email verified successfully. Continue with phone verification.",
        }));
        navigate(`/register?email=${encodeURIComponent(verifiedEmail)}&emailVerified=1`, { replace: true });
      } catch (error) {
        setState((current) => ({ ...current, error: error.message, message: "" }));
      }
    };

    verifyEmail();
  }, [emailFromQuery, isVerificationRoute, navigate, token]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    const nextValue = name === "phone" ? value.replace(/\D/g, "") : value;
    setFormData((current) => ({ ...current, [name]: nextValue }));
    setState((current) => ({ ...current, error: "" }));
  };

  const normalizedPhone = () => {
    const parsed = parsePhoneNumberFromString(formData.phone, formData.phoneCountryIso);
    if (!parsed || !parsed.isValid()) {
      throw new Error("Enter a valid phone number.");
    }
    return parsed.format("E.164");
  };

  const startRegistration = async () => {
    if (!formData.email.trim()) {
      setState((current) => ({ ...current, error: "Email is required." }));
      return;
    }

    setStatus((current) => ({ ...current, sendingEmail: true }));
    try {
      const response = await fetch(buildApiUrl("/api/auth/start-registration"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email }),
      });
      const message = await messageFromPayload(response, "Check your email to verify");
      if (!response.ok) {
        throw new Error(message);
      }
      setState((current) => ({ ...current, message, error: "" }));
    } catch (error) {
      setState((current) => ({ ...current, error: error.message, message: "" }));
    } finally {
      setStatus((current) => ({ ...current, sendingEmail: false }));
    }
  };

  const resendEmail = async () => {
    setStatus((current) => ({ ...current, sendingEmail: true }));
    try {
      const response = await fetch(buildApiUrl("/api/auth/resend-email-verification"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email }),
      });
      const message = await messageFromPayload(response, "Check your email to verify");
      if (!response.ok) {
        throw new Error(message);
      }
      setState((current) => ({ ...current, message, error: "" }));
    } catch (error) {
      setState((current) => ({ ...current, error: error.message, message: "" }));
    } finally {
      setStatus((current) => ({ ...current, sendingEmail: false }));
    }
  };

  const sendOtp = async (resend = false) => {
    try {
      const phone = normalizedPhone();
      setStatus((current) => ({ ...current, sendingOtp: true }));
      const response = await fetch(buildApiUrl(resend ? "/api/auth/resend-phone-otp" : "/api/auth/send-phone-otp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email, phone }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message || "Failed to send OTP.");
      }
      setState((current) => ({
        ...current,
        error: "",
        message: "OTP sent successfully. Enter the code to verify your phone.",
        debugOtp: payload?.debugOtp || "",
        phoneVerified: false,
      }));
    } catch (error) {
      setState((current) => ({ ...current, error: error.message, message: "" }));
    } finally {
      setStatus((current) => ({ ...current, sendingOtp: false }));
    }
  };

  const verifyOtp = async () => {
    if (!formData.otp.trim()) {
      setState((current) => ({ ...current, error: "OTP is required." }));
      return;
    }
    setStatus((current) => ({ ...current, verifyingOtp: true }));
    try {
      const response = await fetch(buildApiUrl("/api/auth/verify-phone-otp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email, otp: formData.otp }),
      });
      const message = await messageFromPayload(response, "Phone verified");
      if (!response.ok) {
        throw new Error(message);
      }
      setState((current) => ({
        ...current,
        phoneVerified: true,
        error: "",
        message,
      }));
    } catch (error) {
      setState((current) => ({ ...current, error: error.message, message: "" }));
    } finally {
      setStatus((current) => ({ ...current, verifyingOtp: false }));
    }
  };

  const completeRegistration = async () => {
    if (!formData.name.trim()) {
      setState((current) => ({ ...current, error: "Name is required." }));
      return;
    }
    setStatus((current) => ({ ...current, completing: true }));
    try {
      const response = await fetch(buildApiUrl("/api/auth/complete-registration"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: normalizedPhone(),
        }),
      });
      const message = await messageFromPayload(response, "Registration successful. Waiting for admin approval");
      if (!response.ok) {
        throw new Error(message);
      }
      setState((current) => ({ ...current, error: "", message: "" }));
      setCompletionNotice({
        title: "Registration submitted",
        message: "Your account is waiting for admin approval. Once approved, your employee ID and temporary password will arrive by email.",
      });
      redirectTimer.current = setTimeout(() => {
        navigate("/", { replace: true });
      }, 4200);
    } catch (error) {
      setState((current) => ({ ...current, error: error.message, message: "" }));
    } finally {
      setStatus((current) => ({ ...current, completing: false }));
    }
  };

  return (
    <div className="registration-page">
      {completionNotice && (
        <div className="registration-complete-backdrop" role="status" aria-live="polite">
          <div className="registration-complete-modal">
            <div className="completion-icon">
              <CheckCircle2 size={32} />
            </div>
            <span className="registration-kicker">Access request received</span>
            <h2>{completionNotice.title}</h2>
            <p>{completionNotice.message}</p>

            <div className="completion-vision">
              <div>
                <Sparkles size={18} />
                <strong>Flowvera vision</strong>
              </div>
              <p>
                We build dependable workflows with clarity, ownership, and timely execution at the center of every team action.
              </p>
            </div>

            <div className="completion-redirect">
              <Clock3 size={16} />
              Redirecting to home in a few seconds
            </div>
          </div>
        </div>
      )}

      <div className="registration-shell">
        <div className="registration-hero">
          <button className="registration-back" onClick={() => navigate("/")}>
            <ArrowLeft size={18} />
            Back
          </button>
          <span className="registration-kicker">Flowvera Access</span>
          <h1>Self-registration with verification and approval</h1>
          <p>Complete the steps in order. Your account activates only after admin approval.</p>
          <div className="registration-summary">
            <div>
              <strong>1</strong>
              <span>Email link verification</span>
            </div>
            <div>
              <strong>2</strong>
              <span>Phone OTP confirmation</span>
            </div>
            <div>
              <strong>3</strong>
              <span>Profile submission</span>
            </div>
          </div>
        </div>

        <div className="registration-card">
          {state.message && <div className="registration-alert success">{state.message}</div>}
          {state.error && <div className="registration-alert error">{state.error}</div>}

          <section className={`registration-step ${state.emailVerified ? "done" : ""}`}>
            <div className="step-heading">
              <Mail size={18} />
              <div>
                <h2>Step 1. Verify email</h2>
                <p>{state.emailVerified ? "Email verified" : "Start registration and confirm the link in your inbox."}</p>
              </div>
              {state.emailVerified && <CheckCircle2 size={18} />}
            </div>
            <div className="registration-field">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                disabled={state.emailVerified}
                placeholder="name@gmail.com"
              />
            </div>
            <div className="registration-actions">
              <button onClick={startRegistration} disabled={status.sendingEmail || state.emailVerified}>
                {status.sendingEmail ? "Sending..." : "Send verification link"}
              </button>
              <button className="secondary" onClick={resendEmail} disabled={status.sendingEmail || !formData.email}>
                Resend email
              </button>
            </div>
          </section>

          <section className={`registration-step ${state.phoneVerified ? "done" : ""} ${!state.emailVerified ? "locked" : ""}`}>
            <div className="step-heading">
              <Phone size={18} />
              <div>
                <h2>Step 2. Verify phone</h2>
                <p>{state.phoneVerified ? "Phone verified" : "Send an OTP after email verification."}</p>
              </div>
              {state.phoneVerified && <CheckCircle2 size={18} />}
            </div>
            <div className="registration-phone-row">
              <CountrySelect
                name="phoneCountryIso"
                value={formData.phoneCountryIso}
                onChange={handleChange}
                options={countryOptions}
                hasError={Boolean(state.error && !state.phoneVerified)}
              />
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                disabled={!state.emailVerified || state.phoneVerified}
                placeholder="Phone number"
              />
            </div>
            <div className="registration-actions">
              <button onClick={() => sendOtp(false)} disabled={!state.emailVerified || status.sendingOtp || state.phoneVerified}>
                {status.sendingOtp ? "Sending OTP..." : "Send OTP"}
              </button>
              <button className="secondary" onClick={() => sendOtp(true)} disabled={!state.emailVerified || status.sendingOtp}>
                Resend OTP
              </button>
            </div>
            <div className="registration-field otp-field">
              <label>OTP</label>
              <div className="otp-row">
                <input
                  type="text"
                  name="otp"
                  value={formData.otp}
                  onChange={handleChange}
                  disabled={!state.emailVerified || state.phoneVerified}
                  placeholder="Enter OTP"
                />
                <button onClick={verifyOtp} disabled={!state.emailVerified || status.verifyingOtp || state.phoneVerified}>
                  {status.verifyingOtp ? "Verifying..." : "Verify OTP"}
                </button>
              </div>
              {state.debugOtp && !state.phoneVerified && (
                <small className="debug-note">
                  Simulated OTP: <strong>{state.debugOtp}</strong>
                </small>
              )}
            </div>
          </section>

          <section className={`registration-step ${!state.phoneVerified ? "locked" : ""}`}>
            <div className="step-heading">
              <User size={18} />
              <div>
                <h2>Step 3. Complete registration</h2>
                <p>Submit your profile after both verifications are complete.</p>
              </div>
              {state.phoneVerified && <CheckCircle2 size={18} />}
            </div>
            <div className="registration-field">
              <label>Full name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                disabled={!state.phoneVerified}
                placeholder="Enter your full name"
              />
            </div>
            <div className="registration-actions">
              <button onClick={completeRegistration} disabled={!state.phoneVerified || status.completing}>
                {status.completing ? "Submitting..." : "Complete registration"}
              </button>
            </div>
            <div className="registration-final-note">
              <MessageSquare size={16} />
              <span>Waiting for admin approval</span>
            </div>
          </section>

          <div className="registration-footer">
            <span>Already approved?</span>
            <Link to="/login">Go to sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
