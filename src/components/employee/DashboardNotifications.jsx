import { AlertTriangle, Bell, CalendarClock, CheckCircle2, ClipboardCheck, Inbox, X } from "lucide-react";
import { Link } from "react-router-dom";

const iconMap = {
  approval: ClipboardCheck,
  overdue: AlertTriangle,
  assigned: Bell,
  success: CheckCircle2,
  update: CalendarClock,
};

const DashboardNotifications = ({ notifications = [], open, showCount = true, onClose, onOpen }) => {
  const hasNotifications = notifications.length > 0;

  return (
    <div className="dashboard-notification-anchor">
      <button
        type="button"
        className={`dashboard-notification-trigger${hasNotifications ? " has-items" : ""}`}
        onClick={open ? onClose : onOpen}
        aria-label={hasNotifications ? "Open dashboard notifications" : "No dashboard notifications"}
      >
        <Bell size={20} />
        {hasNotifications && showCount && (
          <span className="dashboard-notification-count">{notifications.length}</span>
        )}
      </button>

      {open && (
        <aside className="dashboard-notification-popover" aria-label="Important dashboard notifications">
          <div className="dashboard-notification-top">
            <div>
              <span className="dashboard-notification-kicker">Notifications</span>
              <h3>{hasNotifications ? "Needs attention" : "All clear"}</h3>
            </div>
            <button
              type="button"
              className="dashboard-notification-close"
              onClick={onClose}
              aria-label="Close notifications"
            >
              <X size={18} />
            </button>
          </div>

          <div className="dashboard-notification-list">
            {!hasNotifications && (
              <div className="dashboard-notification-empty">
                <span>
                  <Inbox size={22} />
                </span>
                <strong>No notifications</strong>
                <p>You are all caught up. New task updates and approvals will appear here.</p>
              </div>
            )}

            {notifications.map((notification) => {
              const Icon = iconMap[notification.type] || Bell;
              const content = (
                <>
                  <span className={`dashboard-notification-icon ${notification.type}`}>
                    <Icon size={18} />
                  </span>
                  <span className="dashboard-notification-copy">
                    <strong>{notification.title}</strong>
                    <span>{notification.message}</span>
                  </span>
                </>
              );

              return notification.to ? (
                <Link
                  to={notification.to}
                  className="dashboard-notification-item"
                  key={notification.id}
                >
                  {content}
                </Link>
              ) : (
                <div className="dashboard-notification-item" key={notification.id}>
                  {content}
                </div>
              );
            })}
          </div>
        </aside>
      )}
    </div>
  );
};

export default DashboardNotifications;
