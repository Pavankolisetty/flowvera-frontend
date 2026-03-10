import { useState, useEffect } from "react";
import { Plus, Upload, X } from "lucide-react";

const ASSIGN_STATUS_MESSAGES = [
  "Validating task details...",
  "Assigning task to employee...",
  "Securing documents...",
  "Updating dashboard view..."
];

const AdminTaskManagement = ({ employees, authFetch, showNotification, loadData }) => {
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    empId: "",
    dueDate: "",
    requiresSubmission: false
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [assigning, setAssigning] = useState(false);
  const [assignMessageIndex, setAssignMessageIndex] = useState(0);

  useEffect(() => {
    if (!assigning) return;
    const timer = setInterval(() => {
      setAssignMessageIndex((prev) => (prev + 1) % ASSIGN_STATUS_MESSAGES.length);
    }, 1200);
    return () => clearInterval(timer);
  }, [assigning]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.size > 10 * 1024 * 1024) {
      showNotification("File size must be less than 10MB", 'error');
      return;
    }
    setSelectedFile(file);
  };

  const removeFile = () => {
    setSelectedFile(null);
    // Reset the file input
    const fileInput = document.getElementById('task-file-input');
    if (fileInput) fileInput.value = '';
  };

  const handleCreateAndAssignTask = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!taskForm.title?.trim() || !taskForm.description?.trim() || !taskForm.empId || !taskForm.dueDate) {
      showNotification("Please fill in all required fields", 'error');
      return;
    }
    
    // Due date validation
    const selectedDate = new Date(taskForm.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      showNotification("Due date cannot be in the past", 'error');
      return;
    }

    try {
      setAssigning(true);
      setAssignMessageIndex(0);
      let createdTask;
      
      if (selectedFile) {
        // Create task with file using FormData
        const formData = new FormData();
        formData.append('title', taskForm.title);
        formData.append('description', taskForm.description);
        formData.append('empId', taskForm.empId);
        formData.append('dueDate', taskForm.dueDate); // Already in YYYY-MM-DD format from date input
        formData.append('requiresSubmission', taskForm.requiresSubmission);
        formData.append('taskType', taskForm.requiresSubmission ? 'DOC_TEXT' : 'TEXT'); // Use correct TaskType enum values
        formData.append('file', selectedFile);

        const createTaskWithFileResponse = await authFetch("/api/admin/create-task-with-file", {
          method: "POST",
          body: formData // Don't set Content-Type, let browser set it with boundary
        });

        if (!createTaskWithFileResponse.ok) {
          throw new Error("Failed to create task with file");
        }

        createdTask = await createTaskWithFileResponse.json();
      } else {
        // Create task without file (existing logic)
        const createTaskResponse = await authFetch("/api/admin/create-task", {
          method: "POST",
          body: JSON.stringify({
            title: taskForm.title,
            description: taskForm.description,
            requiresSubmission: taskForm.requiresSubmission,
            taskType: taskForm.requiresSubmission ? "DOC_TEXT" : "TEXT" // Use correct TaskType enum values
          })
        });

        if (!createTaskResponse.ok) {
          throw new Error("Failed to create task");
        }

        createdTask = await createTaskResponse.json();
        
        // Step 2: Assign the task to employee (only needed for non-file tasks)
        const assignTaskResponse = await authFetch("/api/admin/assign-task", {
          method: "POST", 
          body: JSON.stringify({
            taskId: createdTask.id,
            empId: taskForm.empId,
            dueDate: taskForm.dueDate,
            requiresSubmission: taskForm.requiresSubmission
          })
        });

        if (!assignTaskResponse.ok) {
          throw new Error("Failed to assign task to employee");
        }
      }

      // Success - clear form and update data
      setTaskForm({
        title: "",
        description: "",
        empId: "",
        dueDate: "",
        requiresSubmission: false
      });
      setSelectedFile(null);
      
      // Show success notification
      showNotification(`Task ${selectedFile ? 'with document ' : ''}successfully created and assigned!`, 'success');
      
      // Reset file input
      const fileInput = document.getElementById('task-file-input');
      if (fileInput) fileInput.value = '';
      
      // Reload data to reflect new assignment
      if (loadData) {
        loadData();
      }
    } catch (error) {
      console.error("Error creating/assigning task:", error);
      showNotification("Failed to create or assign task. Please try again.", 'error');
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="task-management-panel">
      {assigning && (
        <div className="assigning-overlay" role="status" aria-live="polite">
          <div className="assigning-card">
            <div className="assigning-title">Creating and assigning task</div>
            <div className="assigning-message">
              {ASSIGN_STATUS_MESSAGES[assignMessageIndex]}
            </div>
            <div className="assigning-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      )}
      <h2>Task Management</h2>
      
      <form onSubmit={handleCreateAndAssignTask} className="task-form">
        <div className="form-group">
          <label>Task Title *</label>
          <input 
            type="text"
            value={taskForm.title} 
            onChange={(e) => setTaskForm(prev => ({...prev, title: e.target.value}))}
            placeholder="Enter task title..."
            required
          />
        </div>

        <div className="form-group">
          <label>Task Description *</label>
          <textarea 
            value={taskForm.description} 
            onChange={(e) => setTaskForm(prev => ({...prev, description: e.target.value}))}
            placeholder="Enter detailed task description..."
            rows="4"
            required
          />
        </div>

        <div className="form-group">
          <label>Assign to Employee *</label>
          <select 
            value={taskForm.empId} 
            onChange={(e) => setTaskForm(prev => ({...prev, empId: e.target.value}))}
            required
          >
            <option value="">Choose an employee...</option>
            {employees.filter(emp => emp.role !== 'ADMIN').map(emp => (
              <option key={emp.empId} value={emp.empId}>
                {emp.name} (ID: {emp.empId})
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Due Date *</label>
          <input 
            type="date" 
            value={taskForm.dueDate}
            onChange={(e) => setTaskForm(prev => ({...prev, dueDate: e.target.value}))}
            required
          />
        </div>

        <div className="form-group checkbox-group">
          <label className="checkbox-label">
            <input 
              type="checkbox" 
              checked={taskForm.requiresSubmission}
              onChange={(e) => setTaskForm(prev => ({...prev, requiresSubmission: e.target.checked}))}
            />
            <span className="checkbox-custom"></span>
            Requires Document Submission for Completion
          </label>
          <p className="help-text">
            If checked, the employee must submit a document to mark this task as 100% complete.
          </p>
        </div>

        <div className="form-group">
          <label>Task Document (Optional)</label>
          <div className="file-upload-area">
            <input
              id="task-file-input"
              type="file"
              accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
              onChange={handleFileChange}
              className="file-input-hidden"
            />
            
            {!selectedFile ? (
              <label htmlFor="task-file-input" className="file-upload-label">
                <Upload size={24} />
                <span>Click to upload task document</span>
                <small>PDF, DOC, DOCX, TXT, JPG, PNG, GIF (Max 10MB)</small>
              </label>
            ) : (
              <div className="selected-file-display">
                <div className="file-info">
                  <span className="file-name">{selectedFile.name}</span>
                  <span className="file-size">({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                </div>
                <button type="button" onClick={removeFile} className="remove-file-btn">
                  <X size={16} />
                </button>
              </div>
            )}
          </div>
          <p className="help-text">
            Upload a document that employees can reference while working on this task.
          </p>
        </div>

        <button type="submit" className="assign-btn" disabled={assigning}>
          <Plus size={16} />
          {assigning ? "Creating Task..." : "Create & Assign Task"}
        </button>
      </form>
      
      {/* Professional Toast Notification */}
    </div>
  );
};

export default AdminTaskManagement;
