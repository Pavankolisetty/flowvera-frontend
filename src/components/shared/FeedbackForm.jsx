import { useState, useEffect } from "react";
import { MessageCircle, Send, AlertCircle } from "lucide-react";
import "../../styles/FeedbackForm.css";
import { useAuth } from "../../context/AuthContext";


const FeedbackForm = ({ userType = "employee" }) => {
  const { authFetch } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [issues, setIssues] = useState([]);
  const [filteredIssues, setFilteredIssues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Load issues from backend (fall back to localStorage)
  useEffect(() => {
    const load = async () => {
      let fromStorage = null;
      try {
        const resp = await authFetch("/api/feedback");
        if (resp.ok) {
          const data = await resp.json();
          setIssues(data);
          setFilteredIssues(data);
          localStorage.setItem("flowvera_feedback_issues", JSON.stringify(data));
          return;
        }
      } catch (err) {
        console.warn("backend feedback fetch failed", err);
      }

      // fallback to localStorage if remote fails
      const storedIssues = localStorage.getItem("flowvera_feedback_issues");
      if (storedIssues) {
        try {
          const parsedIssues = JSON.parse(storedIssues);
          setIssues(parsedIssues);
          setFilteredIssues(parsedIssues);
        } catch (e) {
          console.error("Failed to load issues:", e);
        }
      }
    };
    load();
  }, [authFetch]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!feedback.trim()) return;

    setLoading(true);

    // Check for duplicate issues
    const lowerFeedback = feedback.toLowerCase().trim();
    const isDuplicate = issues.some(
      issue => issue.text.toLowerCase() === lowerFeedback
    );

    if (isDuplicate) {
      alert("This feedback has already been submitted. Thanks for your contribution!");
      setFeedback("");
      setLoading(false);
      return;
    }

    // Add new issue (optimistic)
    const newIssue = {
      id: Date.now(),
      text: feedback,
      submittedBy: userType,
      timestamp: new Date().toLocaleString(),
      count: 1
    };

    let updatedIssues = [newIssue, ...issues];
    setIssues(updatedIssues);
    setFilteredIssues(updatedIssues);

    // attempt to send to backend
    try {
      const resp = await authFetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newIssue)
      });
      if (resp.ok) {
        const saved = await resp.json();
        // replace optimistic entry with canonical
        updatedIssues[0] = saved;
        setIssues(updatedIssues);
        setFilteredIssues(updatedIssues);
      }
    } catch (err) {
      console.warn("Feedback POST failed, will keep local copy", err);
    }

    // Save to localStorage (stay in sync)
    try {
      localStorage.setItem("flowvera_feedback_issues", JSON.stringify(updatedIssues));
    } catch (e) {
      console.error("Failed to save feedback:", e);
    }

    setFeedback("");
    setSubmitted(true);
    setLoading(false);

    // Reset submitted message after 3 seconds
    setTimeout(() => {
      setSubmitted(false);
    }, 3000);
  };

  return (
    <div className="feedback-container">
      {/* Floating Feedback Button */}
      {!isOpen && (
        <button
          className="floating-feedback-btn"
          onClick={() => setIsOpen(true)}
          title="Send feedback"
        >
          <MessageCircle size={20} />
          <span className="feedback-badge">{issues.length}</span>
        </button>
      )}

      {/* Feedback Panel */}
      {isOpen && (
        <div className="feedback-panel">
          <div className="feedback-header">
            <h3>Beta Feedback</h3>
            <button
              className="close-feedback-btn"
              onClick={() => setIsOpen(false)}
            >
              ✕
            </button>
          </div>

          {submitted && (
            <div className="feedback-success">
              <AlertCircle size={18} />
              <span>Thank you! Feedback submitted successfully.</span>
            </div>
          )}

          {/* Issue Submission Form */}
          <form onSubmit={handleSubmit} className="feedback-form">
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Found a bug? Have a suggestion? Tell us..."
              className="feedback-textarea"
              rows="4"
            />
            <button
              type="submit"
              className="submit-feedback-btn"
              disabled={loading || !feedback.trim()}
            >
              {loading ? "Submitting..." : <>
                <Send size={16} />
                Submit Feedback
              </>}
            </button>
          </form>

          {/* Existing Issues List */}
          {filteredIssues.length > 0 && (
            <div className="issues-list-section">
              <h4>Recent Feedback ({filteredIssues.length})</h4>
              <div className="issues-list">
                {filteredIssues.slice(0, 5).map((issue) => (
                  <div key={issue.id} className="issue-item">
                    <div className="issue-content">
                      <p className="issue-text">{issue.text}</p>
                      <div className="issue-meta">
                        <span className="issue-type">{issue.submittedBy}</span>
                        <span className="issue-time">{issue.timestamp}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {filteredIssues.length === 0 && !feedback && (
            <div className="no-issues">
              <p>No feedback yet. Be the first to share!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FeedbackForm;
