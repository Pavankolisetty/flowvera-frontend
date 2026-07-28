import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, Clock3, Mail, MessageSquare, Phone, ShieldCheck, Sparkles, User, XCircle } from "lucide-react";
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

const phoneRules = {
  IN: { digits: 10, pattern: /^[6-9]\d{9}$/, message: "India phone number must be 10 digits and start with 6, 7, 8, or 9." },
  US: { digits: 10, pattern: /^\d{10}$/, message: "US phone number must contain exactly 10 digits." },
  GB: { min: 10, max: 11, pattern: /^\d{10,11}$/, message: "UK phone number must contain 10 or 11 digits." },
  AE: { digits: 9, pattern: /^[2-9]\d{8}$/, message: "UAE phone number must contain 9 digits." },
  SG: { digits: 8, pattern: /^[689]\d{7}$/, message: "Singapore phone number must be 8 digits and start with 6, 8, or 9." },
};

const messageFromPayload = async (response, fallback) => {
  const payload = await response.json().catch(() => null);
  return payload?.message || fallback;
};

const REGISTRATION_PENDING_EMAIL_KEY = "flowvera.registration.pendingEmail";
const REGISTRATION_EMAIL_VERIFIED_KEY = "flowvera.registration.emailVerified";

const readPendingRegistrationEmail = () => {
  if (typeof window === "undefined") {
    return "";
  }
  return window.localStorage.getItem(REGISTRATION_PENDING_EMAIL_KEY) || "";
};

const rememberPendingRegistrationEmail = (email) => {
  if (typeof window === "undefined" || !email) {
    return;
  }
  window.localStorage.setItem(REGISTRATION_PENDING_EMAIL_KEY, email);
};

const notifyRegistrationEmailVerified = (email) => {
  if (typeof window === "undefined" || !email) {
    return;
  }
  window.localStorage.setItem(
    REGISTRATION_EMAIL_VERIFIED_KEY,
    JSON.stringify({ email, verifiedAt: Date.now() })
  );
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
    email: emailFromQuery || readPendingRegistrationEmail(),
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
  const [phoneNotice, setPhoneNotice] = useState("");

  const applyVerifiedEmail = useCallback((email) => {
    setFormData((current) => ({ ...current, email }));
    setState((current) => ({
      ...current,
      emailVerified: true,
      error: "",
      message: "Email verified successfully. Continue with phone verification.",
    }));
  }, []);

  useEffect(() => {
    return () => {
      if (redirectTimer.current) {
        clearTimeout(redirectTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!phoneNotice) {
      return undefined;
    }
    const timer = window.setTimeout(() => setPhoneNotice(""), 3000);
    return () => window.clearTimeout(timer);
  }, [phoneNotice]);

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
        applyVerifiedEmail(verifiedEmail);
        notifyRegistrationEmailVerified(verifiedEmail);
        navigate(`/register?email=${encodeURIComponent(verifiedEmail)}&emailVerified=1`, { replace: true });
      } catch (error) {
        setState((current) => ({ ...current, error: error.message, message: "" }));
      }
    };

    verifyEmail();
  }, [applyVerifiedEmail, emailFromQuery, isVerificationRoute, navigate, token]);

  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key !== REGISTRATION_EMAIL_VERIFIED_KEY || !event.newValue) {
        return;
      }

      let payload = null;
      try {
        payload = JSON.parse(event.newValue);
      } catch {
        return;
      }
      const verifiedEmail = payload?.email || "";
      if (!verifiedEmail) {
        return;
      }

      const currentEmail = formData.email.trim().toLowerCase();
      if (!currentEmail || currentEmail === verifiedEmail.trim().toLowerCase()) {
        applyVerifiedEmail(verifiedEmail);
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [applyVerifiedEmail, formData.email]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    if (name === "phoneCountryIso") {
      const nextRule = phoneRules[value];
      const nextPhone = nextRule?.digits
        ? formData.phone.slice(0, nextRule.digits)
        : nextRule?.max
          ? formData.phone.slice(0, nextRule.max)
          : formData.phone;
      setFormData((current) => ({ ...current, phoneCountryIso: value, phone: nextPhone }));
      setState((current) => ({ ...current, error: "" }));
      setPhoneNotice("");
      return;
    }

    let nextValue = name === "phone" ? value.replace(/\D/g, "") : value;
    if (name === "phone") {
      const rule = phoneRules[formData.phoneCountryIso];
      const maxDigits = rule?.digits || rule?.max;
      if (maxDigits) {
        nextValue = nextValue.slice(0, maxDigits);
      }
      setPhoneNotice("");
    }
    setFormData((current) => ({ ...current, [name]: nextValue }));
    setState((current) => ({ ...current, error: "" }));
  };

  const phoneValidationMessage = () => {
    const digits = formData.phone.replace(/\D/g, "");
    const rule = phoneRules[formData.phoneCountryIso];
    if (!digits) {
      return "Phone number is required.";
    }
    if (rule?.digits && digits.length !== rule.digits) {
      return `Enter exactly ${rule.digits} digits. You entered ${digits.length}.`;
    }
    if (rule?.min && digits.length < rule.min) {
      return `Enter at least ${rule.min} digits. You entered ${digits.length}.`;
    }
    if (rule?.max && digits.length > rule.max) {
      return `Enter no more than ${rule.max} digits.`;
    }
    if (rule?.pattern && !rule.pattern.test(digits)) {
      return rule.message;
    }

    const parsed = parsePhoneNumberFromString(digits, formData.phoneCountryIso);
    if (!parsed || !parsed.isValid()) {
      return "Enter a valid phone number for the selected country.";
    }
    return "";
  };

  const showPhoneValidation = () => {
    const message = phoneValidationMessage();
    if (message) {
      setPhoneNotice(message);
      return false;
    }
    setPhoneNotice("");
    return true;
  };

  const normalizedPhone = () => {
    const validationMessage = phoneValidationMessage();
    if (validationMessage) {
      throw new Error(validationMessage);
    }
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
      const email = formData.email.trim();
      rememberPendingRegistrationEmail(email);
      const response = await fetch(buildApiUrl("/api/auth/start-registration"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
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
      const email = formData.email.trim();
      rememberPendingRegistrationEmail(email);
      const response = await fetch(buildApiUrl("/api/auth/resend-email-verification"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
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
    if (!showPhoneValidation()) {
      return;
    }
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
          <h1>Request secure access to your workspace.</h1>
          <p>Verify your identity, submit your profile, and our admin team will activate your account after review.</p>
          <div className="registration-trust-row">
            <span><ShieldCheck size={16} /> Verified onboarding</span>
            <span><Clock3 size={16} /> Admin-reviewed access</span>
          </div>
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
                onBlur={showPhoneValidation}
                disabled={!state.emailVerified || state.phoneVerified}
                placeholder="Phone number"
              />
            </div>
            {phoneNotice && (
              <div className="registration-phone-notice" role="alert">
                <XCircle size={17} />
                <span>{phoneNotice}</span>
              </div>
            )}
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
