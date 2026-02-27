import { useState, useEffect } from "react";
import "../../styles/FeedbackForm.css"; // reuse styles

const FeedbackViewer = ({ authFetch }) => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const resp = await authFetch("/api/feedback");
        if (resp.ok) {
          const data = await resp.json();
          setFeedbacks(data || []);
        } else {
          setError("Failed to load feedbacks");
        }
      } catch (e) {
        console.error(e);
        setError("Network error");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [authFetch]);

  if (loading) return <div>Loading feedback...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="feedback-viewer">
      <h3>Submitted Feedback ({feedbacks.length})</h3>
      {feedbacks.length === 0 && <p>No feedback available.</p>}
      <ul className="issues-list">
        {feedbacks.map(fb => (
          <li key={fb.id} className="issue-item">
            <p className="issue-text">{fb.text}</p>
            <div className="issue-meta">
              <span className="issue-type">{fb.submittedBy}</span> |{' '}
              <span className="issue-time">{fb.timestamp}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default FeedbackViewer;
