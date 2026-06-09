import { Braces, Cpu, DraftingCompass, HeartPulse, Layers3 } from "lucide-react";
import { getDepartmentBrand, getEmployeeInitials } from "../../utils/departmentBranding";

const departmentIcons = {
  Electronics: Cpu,
  "Bio Med": HeartPulse,
  Design: DraftingCompass,
  Software: Braces,
};

export default function DepartmentEmblem({
  department,
  name,
  size = "md",
  showCode = true,
  className = "",
}) {
  const brand = getDepartmentBrand(department);
  const Icon = departmentIcons[department] || Layers3;

  return (
    <span
      className={`department-emblem ${size} ${className}`.trim()}
      style={{
        "--department-color": brand.color,
        "--department-soft": brand.softColor,
        "--department-border": brand.borderColor,
      }}
      aria-label={`${department || "Team"} department emblem`}
    >
      <span className="department-emblem-mark">
        <Icon size={size === "lg" ? 22 : size === "sm" ? 14 : 18} strokeWidth={2.35} />
      </span>
      <span className="department-emblem-initials">{getEmployeeInitials(name)}</span>
      {showCode && <span className="department-emblem-code">{brand.shortName}</span>}
    </span>
  );
}
