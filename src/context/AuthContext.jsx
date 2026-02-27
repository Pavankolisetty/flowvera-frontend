import { createContext, useContext, useMemo, useState } from "react";
import { buildApiUrl } from "../config/api";

const AuthContext = createContext(null);

const STORAGE_KEY = "flowvera_auth";

const readStoredAuth = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
};

export function AuthProvider({ children }) {
  const stored = readStoredAuth();
  const [user, setUser] = useState(stored?.user || null);
  const [token, setToken] = useState(stored?.token || "");

  const isAuthenticated = Boolean(token);

  const login = (authData) => {
    const nextUser = {
      empId: authData.empId,
      name: authData.name,
      email: authData.email,
      role: authData.role,
    };

    setUser(nextUser);
    setToken(authData.token);
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ user: nextUser, token: authData.token })
    );
  };

  const logout = async () => {
    try {
      if (token) {
        await fetch(buildApiUrl("/api/auth/logout"), {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }).catch(() => {});
      }
    } finally {
      setUser(null);
      setToken("");
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const authFetch = (path, options = {}) => {
    const headers = new Headers(options.headers || {});

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    // Only set Content-Type for JSON requests, not for FormData
    if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    return fetch(buildApiUrl(path), { ...options, headers });
  };

  const value = useMemo(
    () => ({ user, token, isAuthenticated, login, logout, authFetch }),
    [user, token, isAuthenticated]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
