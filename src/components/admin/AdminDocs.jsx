import { useState, useEffect } from "react";
import { FileText, Download } from "lucide-react";

const AdminDocs = ({ authFetch, showNotification }) => {
  const [assignedDocs, setAssignedDocs] = useState([]);
  const [submissionDocs, setSubmissionDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDocuments();
  }, [authFetch]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const response = await authFetch("/api/admin/all-assignments");
      
      if (response.ok) {
        const assignments = await response.json();
        
        const assigned = assignments
          .filter(a => a.assignmentDocPath || a.task?.documentPath)
          .map(a => ({
            id: a.id,
            fileName: a.assignmentDocPath || a.task?.documentPath,
            taskTitle: a.task?.title,
            employeeName: a.employee?.name,
            employeeId: a.employee?.empId,
            assignedAt: a.assignedAt,
            type: 'assignment'
          }));

        const submissions = assignments
          .filter(a => a.submissionDocPath)
          .map(a => ({
            id: a.id,
            fileName: a.submissionDocPath,
            taskTitle: a.task?.title,
            employeeName: a.employee?.name,
            employeeId: a.employee?.empId,
            submittedAt: a.assignedAt,
            type: 'submission'
          }));

        setAssignedDocs(assigned);
        setSubmissionDocs(submissions);
      }
    } catch (error) {
      console.error("Failed to load documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (docType, id) => {
    try {
      const response = await authFetch(`/api/admin/download-document/${docType}/${id}`);
      
      if (!response.ok) {
        throw new Error('Failed to download document');
      }

      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `${docType}-document-${id}`;
      
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
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
      showNotification('Failed to download document. Please try again.', 'error');
    }
  };

  const DocGrid = ({ docs, title, type }) => (
    <div className="docs-section">
      <h3>{title} ({docs.length})</h3>
      <div className="docs-grid">
        {docs.map((doc, index) => (
          <div key={index} className="doc-card">
            <div className="doc-header">
              <FileText size={16} />
              <span className="doc-name">
                {doc.fileName ? doc.fileName.split('/').pop() : 'Document'}
              </span>
            </div>
            <div className="doc-details">
              <p><strong>Task:</strong> {doc.taskTitle}</p>
              <p><strong>Employee:</strong> {doc.employeeName} ({doc.employeeId})</p>
              <p><strong>Date:</strong> {new Date(doc.assignedAt || doc.submittedAt).toLocaleDateString()}</p>
            </div>
            <button
              className="doc-download-btn"
              onClick={() => handleDownload(type, doc.id)}
            >
              <Download size={14} />
              Download
            </button>
          </div>
        ))}
      </div>
      {docs.length === 0 && (
        <div className="no-docs">No {title.toLowerCase()} available</div>
      )}
    </div>
  );

  if (loading) {
    return <div className="docs-loading">Loading documents...</div>;
  }

  return (
    <div className="docs-content">
      <div className="docs-horizontal-layout">
        <div className="docs-section-half">
          <DocGrid docs={assignedDocs} title="Task Documents" type="assignment" />
        </div>
        <div className="docs-section-half">
          <DocGrid docs={submissionDocs} title="Submission Documents" type="submission" />
        </div>
      </div>
    </div>
  );
};

export default AdminDocs;