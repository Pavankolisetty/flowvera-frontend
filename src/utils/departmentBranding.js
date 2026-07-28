export const DEPARTMENT_BRANDS = {
  Electronics: {
    shortName: "EL",
    icon: "Circuit",
    color: "#0f766e",
    softColor: "#ccfbf1",
    borderColor: "#5eead4",
  },
  "Bio Med": {
    shortName: "BM",
    icon: "Pulse",
    color: "#be123c",
    softColor: "#ffe4e6",
    borderColor: "#fda4af",
  },
  Design: {
    shortName: "DS",
    icon: "Draft",
    color: "#7c3aed",
    softColor: "#ede9fe",
    borderColor: "#c4b5fd",
  },
  Software: {
    shortName: "SW",
    icon: "Code",
    color: "#2563eb",
    softColor: "#dbeafe",
    borderColor: "#93c5fd",
  },
  Testing: {
    shortName: "QA",
    icon: "Shield",
    color: "#0891b2",
    softColor: "#cffafe",
    borderColor: "#67e8f9",
  },
};

export const getDepartmentBrand = (department) =>
  DEPARTMENT_BRANDS[department] || {
    shortName: "TM",
    icon: "Team",
    color: "#475569",
    softColor: "#e2e8f0",
    borderColor: "#cbd5e1",
  };

export const getEmployeeInitials = (name = "") => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] || ""}${parts.at(-1)[0] || ""}`.toUpperCase();
  }
  return (parts[0] || "NA").slice(0, 2).toUpperCase();
};
