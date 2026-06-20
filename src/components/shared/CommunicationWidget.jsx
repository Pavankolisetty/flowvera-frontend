import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, Download, FileText, Maximize2, Megaphone, MessageCircle, Minimize2, Paperclip, Send, Users, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import "../../styles/CommunicationWidget.css";

const audienceLabels = {
  EMPLOYEE: "Employee",
  DEPARTMENT: "Department",
  ALL: "All employees",
  ANNOUNCEMENT: "Announcement",
};

const audienceHints = {
  EMPLOYEE: "Keep it focused. Share a quick doubt, update, or document with the selected teammate.",
  DEPARTMENT: "Align your department on blockers, deadlines, handoffs, or shared work notes.",
  ALL: "Share a clear team-wide update, useful context, or request that everyone should know.",
  ANNOUNCEMENT: "Send a formal work announcement for important updates, reminders, or decisions.",
};

const getInitials = (name = "") => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return (parts[0] || "US").slice(0, 2).toUpperCase();
};

const formatTime = (value) => {
  if (!value) return "";
  const normalizedValue = typeof value === "string" && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(value)
    ? `${value.replace(" ", "T")}Z`
    : value;
  const date = new Date(normalizedValue);
  if (Number.isNaN(date.getTime())) return "";
  const istDate = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  const todayIst = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayIst = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(yesterday);
  const isToday = istDate === todayIst;
  const dayLabel = isToday
    ? "Today"
    : istDate === yesterdayIst
      ? "Yesterday"
      : new Intl.DateTimeFormat("en-IN", {
          timeZone: "Asia/Kolkata",
          month: "short",
          day: "numeric",
        }).format(date);
  const timeLabel = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
  return `${dayLabel}, ${timeLabel}`;
};

const formatFileSize = (bytes) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function CommunicationWidget() {
  const { authFetch, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState({
    canSendAnnouncements: false,
    myDepartment: "",
    employees: [],
    departments: [],
  });
  const [messages, setMessages] = useState([]);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [audience, setAudience] = useState("EMPLOYEE");
  const [targetEmpId, setTargetEmpId] = useState("");
  const [targetDepartment, setTargetDepartment] = useState("");
  const [body, setBody] = useState("");
  const [file, setFile] = useState(null);
  const [panelSize, setPanelSize] = useState(() => {
    try {
      const stored = localStorage.getItem("flowvera_communication_panel_size");
      return stored ? JSON.parse(stored) : { width: 430, height: 680 };
    } catch (error) {
      return { width: 430, height: 680 };
    }
  });
  const [status, setStatus] = useState({ loading: true, sending: false, error: "" });
  const feedRef = useRef(null);
  const resizeRef = useRef(null);

  const visibleAudiences = useMemo(() => {
    const base = ["EMPLOYEE", "DEPARTMENT", "ALL"];
    return options.canSendAnnouncements ? [...base, "ANNOUNCEMENT"] : base;
  }, [options.canSendAnnouncements]);

  const loadSummary = async () => {
    try {
      const [optionsResponse, summaryResponse] = await Promise.all([
        authFetch("/api/communication/options"),
        authFetch("/api/communication/summary"),
      ]);

      if (!optionsResponse.ok || !summaryResponse.ok) {
        throw new Error("Could not load communication updates.");
      }

      const optionsData = await optionsResponse.json();
      const summaryData = await summaryResponse.json();
      setOptions(optionsData);
      setMessages(summaryData.messages || []);
      setHasNewMessages(Boolean(summaryData.hasNewMessages));
      setTargetDepartment((current) => current || optionsData.myDepartment || optionsData.departments?.[0] || "");
      setTargetEmpId((current) => current || optionsData.employees?.[0]?.empId || "");
      setStatus((current) => ({ ...current, loading: false, error: "" }));
    } catch (error) {
      setStatus((current) => ({ ...current, loading: false, error: error.message }));
    }
  };

  useEffect(() => {
    loadSummary();
    const interval = window.setInterval(loadSummary, 30000);
    return () => window.clearInterval(interval);
  }, [authFetch]);

  useEffect(() => {
    if (open && feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [messages, open]);

  const toggleOpen = async () => {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen) {
      setHasNewMessages(false);
      authFetch("/api/communication/seen", { method: "POST" }).catch(() => {});
    }
  };

  const startResize = (event) => {
    event.preventDefault();
    resizeRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      startWidth: panelSize.width,
      startHeight: panelSize.height,
    };
    window.addEventListener("mousemove", handleResize);
    window.addEventListener("mouseup", stopResize);
  };

  const handleResize = (event) => {
    if (!resizeRef.current) return;
    const maxWidth = Math.max(340, window.innerWidth - 48);
    const maxHeight = Math.max(460, window.innerHeight - 48);
    const nextWidth = Math.min(
      maxWidth,
      Math.max(380, resizeRef.current.startWidth - (event.clientX - resizeRef.current.startX))
    );
    const nextHeight = Math.min(
      maxHeight,
      Math.max(520, resizeRef.current.startHeight - (event.clientY - resizeRef.current.startY))
    );
    setPanelSize({ width: nextWidth, height: nextHeight });
  };

  const stopResize = () => {
    resizeRef.current = null;
    window.removeEventListener("mousemove", handleResize);
    window.removeEventListener("mouseup", stopResize);
  };

  const toggleComfortSize = () => {
    const compact = panelSize.width > 500 || panelSize.height > 720;
    const nextSize = compact ? { width: 430, height: 680 } : { width: 620, height: 760 };
    setPanelSize({
      width: Math.min(nextSize.width, Math.max(380, window.innerWidth - 48)),
      height: Math.min(nextSize.height, Math.max(520, window.innerHeight - 110)),
    });
  };

  useEffect(() => {
    localStorage.setItem("flowvera_communication_panel_size", JSON.stringify(panelSize));
  }, [panelSize]);

  useEffect(() => {
    return () => stopResize();
  }, []);

  const handleSend = async (event) => {
    event.preventDefault();
    const cleanBody = body.trim();
    if (!cleanBody && !file) {
      setStatus((current) => ({ ...current, error: "Write a message or attach a document." }));
      return;
    }

    const formData = new FormData();
    formData.append("audience", audience);
    formData.append("body", cleanBody);
    if (audience === "EMPLOYEE") {
      formData.append("targetEmpId", targetEmpId);
    }
    if (audience === "DEPARTMENT") {
      formData.append("targetDepartment", targetDepartment);
    }
    if (file) {
      formData.append("file", file);
    }

    setStatus((current) => ({ ...current, sending: true, error: "" }));
    try {
      const response = await authFetch("/api/communication/messages", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message || "Message could not be sent.");
      }

      const nextMessage = await response.json();
      setMessages((current) => [...current, nextMessage]);
      setBody("");
      setFile(null);
      setStatus((current) => ({ ...current, sending: false, error: "" }));
    } catch (error) {
      setStatus((current) => ({ ...current, sending: false, error: error.message }));
    }
  };

  const handleDownload = async (attachment) => {
    try {
      const response = await authFetch(`/api/communication/attachments/${attachment.id}/download`);
      if (!response.ok) {
        throw new Error("Download failed.");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = attachment.fileName || "attachment";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setStatus((current) => ({ ...current, error: error.message }));
    }
  };

  return (
    <div className="communication-widget">
      <button
        className={`communication-trigger ${open ? "active" : ""}`}
        onClick={toggleOpen}
        aria-label={open ? "Close communication panel" : "Open communication panel"}
      >
        {hasNewMessages && <span className="communication-pulse" aria-label="New messages"></span>}
        <MessageCircle size={22} />
      </button>

      {open && (
        <section
          className="communication-panel"
          aria-label="Team communication"
          style={{
            width: `min(${panelSize.width}px, calc(100vw - 32px))`,
            height: `min(${panelSize.height}px, calc(100vh - 48px))`,
          }}
        >
          <div className="communication-header">
            <div>
              <span className="communication-kicker">Work messages</span>
              <h2>Team Communication</h2>
            </div>
            <div className="communication-header-actions">
              <button className="communication-icon-btn" onClick={toggleComfortSize} aria-label="Resize panel">
                {panelSize.width > 500 || panelSize.height > 720 ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
              </button>
              <button className="communication-icon-btn" onClick={toggleOpen} aria-label="Close">
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="communication-audience-row">
            {visibleAudiences.map((item) => (
              <button
                key={item}
                className={`communication-chip ${audience === item ? "active" : ""}`}
                onClick={() => setAudience(item)}
                type="button"
              >
                {item === "ANNOUNCEMENT" ? <Megaphone size={14} /> : <Users size={14} />}
                {audienceLabels[item]}
              </button>
            ))}
          </div>

          <div className="communication-target">
            {audience === "EMPLOYEE" && (
              <select value={targetEmpId} onChange={(event) => setTargetEmpId(event.target.value)}>
                {options.employees.map((employee) => (
                  <option key={employee.empId} value={employee.empId}>
                    {employee.name} - {employee.department || employee.role}
                  </option>
                ))}
              </select>
            )}

            {audience === "DEPARTMENT" && (
              <select value={targetDepartment} onChange={(event) => setTargetDepartment(event.target.value)}>
                {options.departments.map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </select>
            )}

            <div className={`communication-guidance ${audience.toLowerCase()}`}>
              {audience === "ANNOUNCEMENT" ? <Megaphone size={15} /> : <MessageCircle size={15} />}
              <span>{audienceHints[audience]}</span>
            </div>
          </div>

          <div className="communication-feed" ref={feedRef}>
            {status.loading && <div className="communication-empty">Loading messages...</div>}
            {!status.loading && messages.length === 0 && (
              <div className="communication-empty">
                <Bell size={22} />
                Start a clear work conversation with your team.
              </div>
            )}

            {messages.map((message) => (
              <article
                key={message.id}
                className={`communication-message ${message.sentByMe ? "mine" : ""}`}
              >
                <div className="communication-avatar">{getInitials(message.senderName)}</div>
                <div className="communication-bubble">
                  <div className="communication-meta">
                    <strong>{message.sentByMe ? "You" : message.senderName}</strong>
                    <span>{audienceLabels[message.audience] || "Message"}</span>
                    <time>{formatTime(message.createdAt)}</time>
                  </div>
                  {message.body && <p>{message.body}</p>}
                  {message.attachments?.map((attachment) => (
                    <button
                      key={attachment.id}
                      className="communication-attachment"
                      onClick={() => handleDownload(attachment)}
                      type="button"
                    >
                      <FileText size={16} />
                      <span>{attachment.fileName}</span>
                      <small>{formatFileSize(attachment.sizeBytes)}</small>
                      <Download size={15} />
                    </button>
                  ))}
                </div>
              </article>
            ))}
          </div>

          {status.error && <div className="communication-error">{status.error}</div>}

          <form className="communication-composer" onSubmit={handleSend}>
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Type a work update, doubt, blocker, or note..."
              rows={3}
            />
            <div className="communication-compose-actions">
              <label className="communication-file-btn">
                <Paperclip size={16} />
                <span>{file ? file.name : "Attach"}</span>
                <input type="file" onChange={(event) => setFile(event.target.files?.[0] || null)} />
              </label>
              {file && (
                <button className="communication-clear-file" type="button" onClick={() => setFile(null)}>
                  Clear
                </button>
              )}
              <button className="communication-send-btn" type="submit" disabled={status.sending}>
                <Send size={16} />
                {status.sending ? "Sending" : "Send"}
              </button>
            </div>
          </form>
          <button
            className="communication-resize-handle"
            type="button"
            onMouseDown={startResize}
            aria-label="Resize communication panel"
          ></button>
        </section>
      )}
    </div>
  );
}
