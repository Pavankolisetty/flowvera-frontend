import { useEffect, useRef, useState } from "react";
import { ChevronDown, PencilLine, ShieldCheck, UsersRound } from "lucide-react";

export default function AccountMenu({
  user,
  onOpenProfile,
  onOpenApprovals,
  onOpenUserManagement,
  showUserApprovals = false,
  showUserManagement = false,
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const initials = String(user?.name || "U")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const fallbackDesignation = user?.role === "ADMIN" ? "Administrator" : "Associate Engineer";
  const designation = String(user?.designation || "").trim() || fallbackDesignation;

  return (
    <div className="account-menu" ref={containerRef}>
      <button
        type="button"
        className="account-menu-trigger"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        <span className="account-avatar">{initials}</span>
        <span className="account-trigger-copy">
          <strong>{user?.name || "Account"}</strong>
          <small>{designation}</small>
        </span>
        <ChevronDown size={16} className={`account-trigger-arrow ${open ? "open" : ""}`} />
      </button>

      {open && (
        <div className="account-menu-popover">
          <button
            type="button"
            className="account-menu-item"
            onClick={() => {
              setOpen(false);
              onOpenProfile?.();
            }}
          >
            <PencilLine size={16} />
            <span>Edit Profile</span>
          </button>
          {showUserApprovals && (
            <button
              type="button"
              className="account-menu-item"
              onClick={() => {
                setOpen(false);
                onOpenApprovals?.();
              }}
            >
              <ShieldCheck size={16} />
              <span>User Approvals</span>
            </button>
          )}
          {showUserManagement && (
            <button
              type="button"
              className="account-menu-item"
              onClick={() => {
                setOpen(false);
                onOpenUserManagement?.();
              }}
            >
              <UsersRound size={16} />
              <span>User Management</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
