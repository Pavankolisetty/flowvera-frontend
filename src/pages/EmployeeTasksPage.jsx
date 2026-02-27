import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, Calendar, BarChart3, Download, ArrowRight, Upload, CheckCircle } from "lucide-react";
import EmployeeHeader from "../components/EmployeeHeader";
import { useAuth } from "../context/AuthContext";
import "../styles/EmployeeDashboard.css";

const getStatusBadgeClass = (status) => {
  switch (status?.toLowerCase()) {
    case 'completed': return 'task-status completed';
    case 'in_progress': return 'task-status in_progress';
    case 'assigned': return 'task-status assigned';
    default: return 'task-status pending';
  }
};

const formatDate = (dateString) => {
  if (!dateString) return 'No deadline';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short', 
    day: 'numeric'
  });
};

export default function EmployeeTasksPage() {
  const { user, authFetch } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [status, setStatus] = useState({ loading: true, error: "" });
  const [submissionModal, setSubmissionModal] = useState({ open: false, assignmentId: null });
  const [selectedFile, setSelectedFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadTasks = async () => {
      try {
        const response = await authFetch("/api/employee/my-tasks");

        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || "Failed to load tasks");
        }

        const data = await response.json();

        if (isMounted) {
          setTasks(data || []);
          // Debug: Log task data to check requiresSubmission field
          console.log('Employee tasks loaded:', data);
          data?.forEach(task => {
            console.log(`Task ${task.id}: requiresSubmission = ${task.requiresSubmission}, status = ${task.status}, submissionDocPath = ${task.submissionDocPath}`);
          });
          setStatus({ loading: false, error: "" });
        }
      } catch (error) {
        if (isMounted) {
          setStatus({ loading: false, error: error.message });
        }
      }
    };

    loadTasks();

    return () => {
      isMounted = false;
    };
  }, [authFetch]);

  const handleDownloadDocument = async (assignmentId) => {
    try {
      const response = await authFetch(`/api/employee/download-task-doc/${assignmentId}`);
      
      if (!response.ok) {
        throw new Error('Failed to download document');
      }

      // Extract filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `task-document-${assignmentId}`; // fallback filename
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename; // Use the proper filename from server
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download document. Please try again.');
    }
  };

  const handleSubmitDocument = async (assignmentId) => {
    setSubmissionModal({ open: true, assignmentId });
  };

  const handleFileSubmission = async () => {
    if (!selectedFile || !submissionModal.assignmentId) return;

    setSubmitting(true);
    
    try {
      const formData = new FormData();
      formData.append('document', selectedFile);

      const response = await authFetch(`/api/employee/submit-document/${submissionModal.assignmentId}`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to submit document');
      }

      // Refresh tasks to show updated status
      const tasksResponse = await authFetch("/api/employee/my-tasks");
      if (tasksResponse.ok) {
        const updatedTasks = await tasksResponse.json();
        setTasks(updatedTasks || []);
      }

      alert('Document submitted successfully! Task marked as completed.');
      setSubmissionModal({ open: false, assignmentId: null });
      setSelectedFile(null);
    } catch (error) {
      console.error('Submission failed:', error);
      alert('Failed to submit document. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (status.loading) {
    return (
      <div className="employee-dashboard">
        <div className="dashboard-bg" aria-hidden="true"></div>
        <div className="employee-shell">
          <EmployeeHeader name={user?.name} />
          <section className="employee-quote compact">
            <span className="quote-label">Tasks</span>
            <h2>Loading your tasks...</h2>
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
          <span className="quote-label">Tasks</span>
          <h2>Your task assignments</h2>
        </section>
        
        {status.error ? (
          <section className="employee-grid single">
            <div className="employee-panel">
              <div className="employee-error">{status.error}</div>
            </div>
          </section>
        ) : (
          <section className="tasks-grid">
            {tasks.length === 0 ? (
              <div className="employee-panel">
                <div className="employee-empty">
                  No tasks assigned yet. Check back later for new assignments.
                </div>
              </div>
            ) : (
              tasks.map((assignment) => (
                <div className="task-detail-card" key={assignment.id}>
                  <div className="task-detail-header">
                    <div className="task-title-section">
                      <FileText size={20} className="task-icon" />
                      <h3>{assignment.task?.title || "Untitled Task"}</h3>
                    </div>
                    <span className={getStatusBadgeClass(assignment.status)}>
                      {assignment.status || "PENDING"}
                    </span>
                  </div>
                  
                  <div className="task-detail-body">
                    <p className="task-description">
                      {assignment.task?.description || "No description provided."}
                    </p>
                    
                    <div className="task-meta-grid">
                      <div className="task-meta-item">
                        <Calendar size={16} />
                        <span>Due: {formatDate(assignment.dueDate)}</span>
                      </div>
                      <div className="task-meta-item">
                        <BarChart3 size={16} />
                        <span>Progress: {assignment.progress || 0}%</span>
                      </div>
                    </div>
                    
                    <div className="task-progress-bar">
                      <div 
                        className="task-progress-fill" 
                        style={{ width: `${assignment.progress || 0}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="task-detail-actions">
                    {assignment.task?.documentPath && (
                      <button 
                        className="task-action-btn secondary"
                        onClick={() => handleDownloadDocument(assignment.id)}
                      >
                        <Download size={16} />
                        Download Task Doc
                      </button>
                    )}
                    
                    {assignment.requiresSubmission && assignment.status !== 'COMPLETED' && !assignment.submissionDocPath && (
                      <button 
                        className="task-action-btn primary"
                        onClick={() => handleSubmitDocument(assignment.id)}
                      >
                        <Upload size={16} />
                        Submit Document
                      </button>
                    )}
                    
                    {assignment.requiresSubmission && assignment.submissionDocPath && (
                      <div className="task-action-btn completed">
                        <CheckCircle size={16} />
                        Document Submitted
                      </div>
                    )}
                    
                    {assignment.status !== 'COMPLETED' && !assignment.requiresSubmission && (
                      <Link 
                        to={`/employee/update-progress/${assignment.id}`}
                        className="task-action-btn primary"
                      >
                        <BarChart3 size={16} />
                        Update Progress
                        <ArrowRight size={16} className="action-arrow" />
                      </Link>
                    )}
                    
                    {assignment.status !== 'COMPLETED' && assignment.requiresSubmission && assignment.submissionDocPath && (
                      <Link 
                        to={`/employee/update-progress/${assignment.id}`}
                        className="task-action-btn primary"
                      >
                        <BarChart3 size={16} />
                        Update Progress
                        <ArrowRight size={16} className="action-arrow" />
                      </Link>
                    )}
                  </div>
                </div>
              ))
            )}
          </section>
        )}
      </div>
      
      {/* Document Submission Modal */}
      {submissionModal.open && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Submit Document</h3>
              <button 
                className="modal-close-btn"
                onClick={() => setSubmissionModal({ open: false, assignmentId: null })}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p>Please select a document to submit for completion of this task:</p>
              <input 
                type="file" 
                onChange={(e) => setSelectedFile(e.target.files[0])}
                accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
                className="file-input"
              />
              {selectedFile && (
                <p className="selected-file">Selected: {selectedFile.name}</p>
              )}
            </div>
            <div className="modal-footer">
              <button 
                className="modal-btn secondary"
                onClick={() => setSubmissionModal({ open: false, assignmentId: null })}
              >
                Cancel
              </button>
              <button 
                className="modal-btn primary"
                onClick={handleFileSubmission}
                disabled={!selectedFile || submitting}
              >
                {submitting ? 'Submitting...' : 'Submit Document'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
