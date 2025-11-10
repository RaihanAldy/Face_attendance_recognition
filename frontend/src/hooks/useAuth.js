import { useState, useEffect } from 'react';

export const useAuth = () => {
  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    userRole: null,
    isLoading: true,
    user: null
  });

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const role = localStorage.getItem('userRole');
    const name = localStorage.getItem('userName');
    const email = localStorage.getItem('userEmail');
    
    setAuthState({
      isAuthenticated: !!token,
      userRole: role,
      isLoading: false,
      user: token ? {
        name: name || 'User',
        email: email || '',
        role: role
      } : null
    });
  }, []);

  const login = (token, role, name, email) => {
    localStorage.setItem('authToken', token);
    localStorage.setItem('userRole', role);
    localStorage.setItem('userName', name);
    localStorage.setItem('userEmail', email);
    setAuthState({
      isAuthenticated: true,
      userRole: role,
      isLoading: false,
      user: {
        name: name || 'User',
        email: email || '',
        role: role
      }
    });
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    setAuthState({
      isAuthenticated: false,
      userRole: null,
      isLoading: false,
      user: null
    });
  };

  return {
    ...authState,
    login,
    logout
  };
};