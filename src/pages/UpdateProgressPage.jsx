import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, BarChart3, CheckCircle, Target, TrendingUp, Award, Sparkles } from "lucide-react";
import EmployeeHeader from "../components/EmployeeHeader";
import ConfettiAnimation from "../components/shared/ConfettiAnimation";
import { useAuth } from "../context/AuthContext";
import "../styles/EmployeeDashboard.css";

const PROGRESS_OPTIONS = [
  { value: 0, label: "Just Started", icon: Target, message: "Every journey begins with a single step! 🚀" },
  { value: 25, label: "Quarter Done", icon: TrendingUp, message: "Great momentum! You're making solid progress! 💪" },
  { value: 50, label: "Half Complete", icon: BarChart3, message: "Amazing! You're halfway there! Keep pushing! 🔥" },
  { value: 75, label: "Almost Done", icon: CheckCircle, message: "Excellent work! You're in the final stretch! ⭐" },
  { value: 100, label: "Completed", icon: Award, message: "Outstanding! Task completed successfully! 🎉🏆" }
];

export default function UpdateProgressPage() {
  const { assignmentId } = useParams();
  const { user, authFetch } = useAuth();
  const navigate = useNavigate();
  
  const [assignment, setAssignment] = useState(null);
  const [selectedProgress, setSelectedProgress] = useState(null);
  const [status, setStatus] = useState({ loading: true, error: "", updating: false });
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadAssignment = async () => {
      try {
        const response = await authFetch("/api/employee/my-tasks");
        
        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || "Failed to load task");
        }

        const tasks = await response.json();
        const currentAssignment = tasks.find(task => task.id === parseInt(assignmentId));
        
        if (!currentAssignment) {
          throw new Error("Task assignment not found");
        }

        if (isMounted) {
          setAssignment(currentAssignment);
          setSelectedProgress(currentAssignment.progress || 0);
          setStatus({ loading: false, error: "", updating: false });
        }
      } catch (error) {
        if (isMounted) {
          setStatus({ loading: false, error: error.message, updating: false });
        }
      }
    };

    loadAssignment();

    return () => {
      isMounted = false;
    };
  }, [assignmentId, authFetch]);

  const handleSubmitProgress = async () => {
    if (selectedProgress === null) return;

    setStatus(prev => ({ ...prev, updating: true }));

    try {
      const response = await authFetch("/api/employee/update-progress", {
        method: "PUT",
        body: JSON.stringify({
          taskAssignmentId: parseInt(assignmentId),
          progress: selectedProgress
        })
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to update progress");
      }

      // Show encouraging toast notification  
      const selectedOption = PROGRESS_OPTIONS.find(opt => opt.value === selectedProgress);
      setToastMessage(selectedOption?.message || "Progress updated successfully!");
      setShowToast(true);

      // Trigger confetti animation if task is completed (100%)
      if (selectedProgress === 100) {
        setShowConfetti(true);
      }

      // Hide toast after extended time and navigate back
      setTimeout(() => {
        setShowToast(false);
        navigate("/employee/tasks");
      }, selectedProgress === 100 ? 8000 : 3000); // Longer delay for 100% completion with confetti

      setStatus(prev => ({ ...prev, updating: false }));
    } catch (error) {
      setStatus(prev => ({ ...prev, error: error.message, updating: false }));
    }
  };

  if (status.loading) {
    return (
      <div className="employee-dashboard">
        <div className="dashboard-bg" aria-hidden="true"></div>
        <div className="employee-shell">
          <EmployeeHeader name={user?.name} />
          <section className="employee-quote compact">
            <span className="quote-label">Progress</span>
            <h2>Loading task details...</h2>
          </section>
        </div>
      </div>
    );
  }

  if (status.error) {
    return (
      <div className="employee-dashboard">
        <div className="dashboard-bg" aria-hidden="true"></div>
        <div className="employee-shell">
          <EmployeeHeader name={user?.name} />
          <section className="employee-quote compact">
            <span className="quote-label">Error</span>
            <h2>Failed to load task</h2>
          </section>
          <section className="employee-grid single">
            <div className="employee-panel">
              <div className="employee-error">{status.error}</div>
              <Link to="/employee/tasks" className="back-link">
                <ArrowLeft size={16} />
                Back to Tasks
              </Link>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="employee-dashboard">
      <div className="dashboard-bg" aria-hidden="true"></div>
      <div className="employee-shell">
        <EmployeeHeader name={user?.name} />
        
        <section className="employee-quote compact">
          <span className="quote-label">Progress Update</span>
          <h2>{assignment?.task?.title || "Update Task Progress"}</h2>
        </section>
        
        <section className="employee-grid single">
          <div className="employee-panel progress-panel">
            <div className="panel-header">
              <Link to="/employee/tasks" className="back-link">
                <ArrowLeft size={16} />
                Back to Tasks
              </Link>
              <div className="current-progress">
                Current: {assignment?.progress || 0}%
              </div>
            </div>

            <div className="task-summary">
              <p><strong>Task:</strong> {assignment?.task?.title}</p>
              <p><strong>Description:</strong> {assignment?.task?.description}</p>
              <p><strong>Due Date:</strong> {assignment?.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'No deadline'}</p>
            </div>
            
            <div className="progress-options">
              <h3>Select Progress Level</h3>
              <div className="progress-radio-grid">
                {PROGRESS_OPTIONS.map((option) => {
                  const IconComponent = option.icon;
                  const isSelected = selectedProgress === option.value;
                  const isCompleted = assignment?.progress >= option.value;
                  
                  return (
                    <label 
                      key={option.value} 
                      className={`progress-option ${isSelected ? 'selected' : ''} ${isCompleted ? 'completed' : ''}`}
                    >
                      <input
                        type="radio"
                        value={option.value}
                        checked={isSelected}
                        onChange={(e) => setSelectedProgress(parseInt(e.target.value))}
                        name="taskProgress"
                      />
                      <div className="option-content">
                        <IconComponent size={24} className="option-icon" />
                        <span className="option-label">{option.label}</span>
                        <span className="option-percentage">{option.value}%</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {status.error && (
              <div className="employee-error">{status.error}</div>
            )}

            <button 
              className="progress-submit-btn"
              onClick={handleSubmitProgress}
              disabled={status.updating || selectedProgress === assignment?.progress}
            >
              {status.updating ? 'Updating...' : 'Update Progress'}
            </button>
          </div>
        </section>
      </div>

      {/* Enhanced Toast Notification */}
      {showToast && (
        <div className="toast-overlay">
          <div className="toast-notification-center">
            <div className="toast-icon-wrapper">
              <Sparkles className="toast-main-icon" size={28} />
            </div>
            <div className="toast-message-content">
              <h3 className="toast-title">Progress Updated!</h3>
              <p className="toast-message">{toastMessage}</p>
            </div>
            <div className="toast-success-icon">
              <CheckCircle size={24} className="success-check" />
            </div>
          </div>
        </div>
      )}
      {/* Confetti Animation for Task Completion */}
      <ConfettiAnimation 
        show={showConfetti} 
        onComplete={() => setShowConfetti(false)} 
      />    </div>
  );
}