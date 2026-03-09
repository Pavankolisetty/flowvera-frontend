// base URL for backend, comes from environment variable (VITE_API_URL)
export const API_URL =
  import.meta.env.VITE_API_URL || "https://flowvera-backend.onrender.com";

export const buildApiUrl = (path) => `${API_URL}${path}`;
