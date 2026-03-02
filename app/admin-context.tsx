"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

interface AdminCtx {
  isAdmin: boolean;
  adminKey: string;
  login: (password: string) => void;
  logout: () => void;
}

const AdminContext = createContext<AdminCtx>({
  isAdmin: false,
  adminKey: "",
  login: () => {},
  logout: () => {},
});

export function useAdmin() {
  return useContext(AdminContext);
}

const STORAGE_KEY = "mm_admin_key";

export function AdminProvider({ children }: { children: ReactNode }) {
  const [adminKey, setAdminKey] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setAdminKey(stored);
  }, []);

  const login = useCallback((password: string) => {
    setAdminKey(password);
    localStorage.setItem(STORAGE_KEY, password);
  }, []);

  const logout = useCallback(() => {
    setAdminKey("");
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <AdminContext.Provider value={{ isAdmin: adminKey.length > 0, adminKey, login, logout }}>
      {children}
    </AdminContext.Provider>
  );
}
