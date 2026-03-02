export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://flowvera-backend.onrender.com";

export const buildApiUrl = (path) => `${API_BASE_URL}${path}`;
