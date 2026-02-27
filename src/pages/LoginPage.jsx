import { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { ArrowLeft, Mail, Lock, Eye, EyeOff } from "lucide-react"
import { buildApiUrl } from "../config/api"
import { useAuth } from "../context/AuthContext"
import "../styles/LoginPage.css"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()

  useEffect(() => {
    // Check if there's a success message from password update
    if (location.state?.message) {
      setSuccessMessage(location.state.message)
      // Clear the state to prevent message from persisting on refresh
      window.history.replaceState({}, document.title)
    }
  }, [location])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setIsSubmitting(true)

    try {
      const response = await fetch(buildApiUrl("/api/auth/login-email"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        const message = await response.text()
        throw new Error(message || "Login failed")
      }

      const data = await response.json()
      login(data)
      
      // Redirect based on user role
      if (data.role === "ADMIN") {
        navigate("/admin/dashboard")
      } else {
        navigate("/employee/dashboard")
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-container">
      {/* Header */}
      <header className="auth-header">
        <div className="auth-nav">
          <button className="back-btn" onClick={() => navigate("/")}>
            <ArrowLeft size={20} />
            Back to Home
          </button>
          <div className="brand-name">Flowvera</div>
        </div>
      </header>

      {/* Main Content */}
      <div className="auth-content">
        {/* Login Card */}
        <div className="auth-card">
          <div className="auth-header-text">
            <h1>Sign in to Vyaas Technologies</h1>
            <p>
              Authorized employees only. Please use your company credentials.
            </p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {successMessage && (
              <div className="auth-success">{successMessage}</div>
            )}
            
            <div className="form-group">
              <label htmlFor="email">Company Email</label>
              <input
                id="email"
                type="email"
                placeholder="name@company.com"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="password-wrapper">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="form-options">
              <label className="checkbox-wrapper">
                <input type="checkbox" />
                <span className="checkmark"></span>
                Keep me signed in
              </label>
              <a href="#" className="forgot-password">
                Contact Admin
              </a>
            </div>

            {error && <div className="auth-error">{error}</div>}

            <button type="submit" className="auth-submit-btn" disabled={isSubmitting}>
              {isSubmitting ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="auth-footer-note">
            <p>
              Accounts are created and managed by administrators.<br />
              If you need access, please contact your system admin.
            </p>
          </div>
        </div>

        {/* Sidebar */}
        <div className="auth-sidebar">
          <div className="sidebar-content">
            <h2>Internal Task Management Platform</h2>
            <p>
              Flowvera helps teams manage tasks, track performance, and collaborate
              efficiently across projects — all in one secure system.
            </p>

            <div className="testimonial">
              <p>
                "Flowvera gives our teams complete visibility into tasks and
                progress, helping us deliver consistently and on time.”
              </p>
              <div className="testimonial-author">
                <div className="author-info">
                  <strong>Operations Team</strong>
                  <span>Vyaas Technologies</span>
                </div>
              </div>
            </div>

            <div className="security-note">
              <p>
                🔒 Secure • Role-based Access • Internal Use Only
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}