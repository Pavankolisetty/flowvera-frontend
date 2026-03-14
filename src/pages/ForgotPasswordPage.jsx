import { useState } from "react"
import { ArrowLeft, Eye, EyeOff } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { buildApiUrl } from "../config/api"
import "../styles/LoginPage.css"

const STEPS = ["Email", "OTP", "Reset"]

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [resetToken, setResetToken] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [finalMessage, setFinalMessage] = useState("")

  const readMessage = async (response, fallbackMessage) => {
    const contentType = response.headers.get("content-type") || ""
    if (contentType.includes("application/json")) {
      const data = await response.json()
      return data.message || fallbackMessage
    }

    const text = await response.text()
    return text || fallbackMessage
  }

  const handleRequestOtp = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    try {
      const response = await fetch(buildApiUrl("/api/auth/forgot-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const message = await readMessage(response, "Unable to send OTP right now.")
      if (!response.ok) {
        throw new Error(message)
      }

      setSuccess(message)
      setStep(1)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    try {
      const response = await fetch(buildApiUrl("/api/auth/forgot-password/verify-otp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      })

      const contentType = response.headers.get("content-type") || ""
      const data = contentType.includes("application/json")
        ? await response.json()
        : { message: await response.text() }

      if (!response.ok) {
        throw new Error(data.message || "Unable to verify OTP.")
      }

      setResetToken(data.resetToken || "")
      setSuccess(data.message || "OTP verified successfully.")
      setStep(2)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    try {
      const response = await fetch(buildApiUrl("/api/auth/forgot-password/reset"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          resetToken,
          newPassword,
          confirmPassword,
        }),
      })

      const message = await readMessage(response, "Unable to reset password.")
      if (!response.ok) {
        throw new Error(message)
      }

      setFinalMessage(message)
      setStep(3)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <header className="auth-header">
        <div className="auth-nav">
          <button className="back-btn" onClick={() => navigate("/login")}>
            <ArrowLeft size={20} />
            Back to Login
          </button>
          <div className="brand-name">Flowvera</div>
        </div>
      </header>

      <div className="auth-content">
        <div className="auth-card">
          <div className="auth-header-text">
            <h1>Reset your password</h1>
            <p>
              Recover access securely with your registered email and one-time password.
            </p>
          </div>

          <div className="reset-steps" aria-label="Password reset progress">
            {STEPS.map((label, index) => (
              <div
                key={label}
                className={`reset-step ${index <= step ? "active" : ""} ${index === step ? "current" : ""}`}
              >
                <span>{index + 1}</span>
                <strong>{label}</strong>
              </div>
            ))}
          </div>

          {step === 0 && (
            <form className="auth-form" onSubmit={handleRequestOtp}>
              <div className="form-group">
                <label htmlFor="reset-email">Registered Email</label>
                <input
                  id="reset-email"
                  type="email"
                  className="form-input"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>

              {success && <div className="auth-success">{success}</div>}
              {error && <div className="auth-error">{error}</div>}

              <button type="submit" className="auth-submit-btn" disabled={loading}>
                {loading ? "Sending OTP..." : "Send OTP"}
              </button>
            </form>
          )}

          {step === 1 && (
            <form className="auth-form" onSubmit={handleVerifyOtp}>
              <div className="form-group">
                <label htmlFor="otp-email">Registered Email</label>
                <input
                  id="otp-email"
                  type="email"
                  className="form-input"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="otp-code">Enter OTP</label>
                <input
                  id="otp-code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  className="form-input otp-input"
                  placeholder="6-digit OTP"
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))}
                  required
                />
              </div>

              {success && <div className="auth-success">{success}</div>}
              {error && <div className="auth-error">{error}</div>}

              <button type="submit" className="auth-submit-btn" disabled={loading}>
                {loading ? "Verifying OTP..." : "Verify OTP"}
              </button>

              <button
                type="button"
                className="auth-secondary-btn"
                onClick={() => {
                  setError("")
                  setSuccess("")
                  setStep(0)
                }}
              >
                Change email
              </button>
            </form>
          )}

          {step === 2 && (
            <form className="auth-form" onSubmit={handleResetPassword}>
              <div className="form-group">
                <label htmlFor="new-password">New Password</label>
                <div className="password-wrapper">
                  <input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    className="form-input"
                    placeholder="Enter a strong password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowNewPassword((value) => !value)}
                  >
                    {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="confirm-password">Confirm Password</label>
                <div className="password-wrapper">
                  <input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    className="form-input"
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowConfirmPassword((value) => !value)}
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="reset-password-note">
                Use at least 8 characters. Choose a password you have not used before.
              </div>

              {error && <div className="auth-error">{error}</div>}

              <button type="submit" className="auth-submit-btn" disabled={loading}>
                {loading ? "Updating password..." : "Update Password"}
              </button>
            </form>
          )}

          {step === 3 && (
            <div className="reset-success-screen">
              <div className="reset-success-card">
                <h2>Password Updated</h2>
                <p>
                  {finalMessage || "Your password has been successfully updated. You can now log in with your new credentials."}
                </p>
                <button
                  type="button"
                  className="auth-submit-btn"
                  onClick={() => navigate("/login", { state: { message: finalMessage } })}
                >
                  Return to Login
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="auth-sidebar">
          <div className="sidebar-content">
            <h2>Secure account recovery</h2>
            <p>
              OTP-based reset keeps access controlled while allowing users to recover quickly
              without admin intervention.
            </p>

            <div className="testimonial">
              <p>
                "Sensitive account actions should be short-lived, traceable, and easy for users
                to complete without friction."
              </p>
              <div className="testimonial-author">
                <div className="author-info">
                  <strong>Security Practice</strong>
                  <span>Flowvera Access Control</span>
                </div>
              </div>
            </div>

            <div className="security-note">
              <p>OTP expiry: 10 minutes • Mailtrap in dev • Gmail SMTP in production</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
