import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null=loading, false=anon, obj=auth
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
      return data;
    } catch {
      setUser(false);
      return false;
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (localStorage.getItem("ft_token")) refresh();
    else { setUser(false); setReady(true); }
  }, [refresh]);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("ft_token", data.access_token);
    setUser(data.user);
    return data.user;
  };

  const register = async (payload) => {
    const { data } = await api.post("/auth/register", payload);
    localStorage.setItem("ft_token", data.access_token);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch {}
    localStorage.removeItem("ft_token");
    setUser(false);
  };

  const hasPerm = (p) => Array.isArray(user?.permissions) && user.permissions.includes(p);
  const isStaff = user && ["moderator", "admin", "super_admin", "school_admin", "directorate_admin"].includes(user.role);

  return (
    <AuthContext.Provider value={{ user, ready, login, register, logout, refresh, setUser, hasPerm, isStaff }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
