import { useState, useEffect } from "react";

export const useAuth = () => {
  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    userRole: null,
    isLoading: true,
  });

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const role = localStorage.getItem("userRole");

    setAuthState({
      isAuthenticated: !!token,
      userRole: role,
      isLoading: false,
    });
  }, []);

  const login = (token, role) => {
    localStorage.setItem("authToken", token);
    localStorage.setItem("userRole", role);
    setAuthState({
      isAuthenticated: true,
      userRole: role,
      isLoading: false,
    });
  };

  const logout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userRole");
    setAuthState({
      isAuthenticated: false,
      userRole: null,
      isLoading: false,
    });
  };

  return {
    ...authState,
    login,
    logout,
  };
};
