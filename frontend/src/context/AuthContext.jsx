import { createContext, useContext, useEffect, useState } from "react";
import * as authApi from "../api/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setLoading(false);
      return;
    }
    authApi
      .getMe()
      .then((res) => setUser(res.data))
      .catch(() => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (identifier, password, expectedRole = null) => {
    const payload = {
      email_or_username: identifier,
      email: identifier.includes("@") ? identifier : undefined,
      username: !identifier.includes("@") ? identifier : undefined,
      password,
    };

    let res;
    if (expectedRole === "doctor") {
      res = await authApi.doctorLogin(payload);
    } else if (expectedRole === "patient") {
      res = await authApi.patientLogin(payload);
    } else {
      res = await authApi.login(payload);
    }

    localStorage.setItem("access_token", res.data.access_token);
    localStorage.setItem("refresh_token", res.data.refresh_token);
    const me = await authApi.getMe();
    setUser(me.data);
    return me.data;
  };

  const patientLogin = (identifier, password) => login(identifier, password, "patient");
  const doctorLogin = (identifier, password) => login(identifier, password, "doctor");

  const register = async (payload) => {
    await authApi.register(payload);
    return login(payload.email, payload.password);
  };

  const patientRegister = async (payload) => {
    await authApi.patientRegister(payload);
    return patientLogin(payload.email || payload.username, payload.password);
  };

  const doctorRegister = async (payload) => {
    const res = await authApi.doctorRegister(payload);
    return res.data;
  };

  const refreshUser = async () => {
    try {
      const me = await authApi.getMe();
      setUser(me.data);
      return me.data;
    } catch (e) {
      console.error("Failed to refresh user:", e);
    }
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        patientLogin,
        doctorLogin,
        register,
        patientRegister,
        doctorRegister,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
