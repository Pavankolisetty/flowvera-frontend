// base URL for backend, comes from environment variable (VITE_API_URL)
export const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8082";

export const buildApiUrl = (path) => `${API_URL}${path}`;
