export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8082";

export const buildApiUrl = (path) => `${API_BASE_URL}${path}`;
