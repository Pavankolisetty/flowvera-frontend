import { Braces, Cpu, DraftingCompass, HeartPulse, Layers3 } from "lucide-react";
import { getEmployeeInitials } from "../../utils/departmentBranding";

const iconRegistry = {
  Braces,
  Code: Braces,
  Cpu,
  Circuit: Cpu,
  Draft: DraftingCompass,
  DraftingCompass,
  HeartPulse,
  Pulse: HeartPulse,
  Layers3,
  Team: Layers3,
};

const sizeClass = {
  sm: "sm",
  md: "md",
  lg: "lg",
};

export default function DepartmentBrandBadge({
  employeeName,
  departmentName,
  departmentCode,
  departmentColor = "#475569",
  departmentIcon,
  size = "md",
  variant = "compact",
}) {
  const Icon =
    typeof departmentIcon === "function"
      ? departmentIcon
      : iconRegistry[departmentIcon] || iconRegistry[departmentName] || Layers3;

  return (
    <span
      className={`department-brand-badge ${variant} ${sizeClass[size] || "md"}`}
      style={{ "--department-color": departmentColor }}
      aria-label={`${departmentName || "Team"} badge for ${employeeName || "employee"}`}
    >
      <span className="department-brand-watermark" aria-hidden="true">
        <Icon size={variant === "profile" ? 52 : variant === "card" ? 44 : 34} strokeWidth={1.7} />
      </span>
      <span className="department-brand-icon" aria-hidden="true">
        <Icon size={variant === "profile" ? 22 : 16} strokeWidth={2.35} />
      </span>
      <span className="department-brand-initials">{getEmployeeInitials(employeeName)}</span>
      <span className="department-brand-code">{departmentCode || "TM"}</span>
    </span>
  );
}
