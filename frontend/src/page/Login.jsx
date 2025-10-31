import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios"; // pastikan axios sudah diinstall

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [error, setError] = useState("");

  // Redirect jika sudah login
  useEffect(() => {
    const isAuthenticated = localStorage.getItem("isAuthenticated") === "true";
    if (isAuthenticated) navigate("/");
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post(
        "http://localhost:5000/api/admin/login",
        {
          username: formData.username,
          password: formData.password,
        }
      );

      if (response.data.success) {
        // Simpan status login
        localStorage.setItem("isAuthenticated", "true");
        localStorage.setItem(
          "userData",
          JSON.stringify({ username: formData.username, role: "Administrator" })
        );
        navigate("/"); // redirect ke protected route
      } else {
        setError(response.data.error || "Login failed");
      }
    } catch (err) {
      console.error("Login error:", err);
      const msg = err.response?.data?.error || "Failed to connect to server";
      setError(msg);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-b from-navy-950 to-navy-900">
      <div className="max-w-md w-full space-y-8 p-10 bg-navy-900/50 backdrop-blur-sm rounded-xl shadow-2xl border border-navy-800/50">
        <div className="space-y-6">
          <div className="flex justify-center">
            <div className="h-20 w-20 rounded-full bg-blue-600/20 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-10 h-10 text-blue-400"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                />
              </svg>
            </div>
          </div>
          <div>
            <h2 className="mt-2 text-center text-3xl font-extrabold text-blue-100">
              Face Attendance System
            </h2>
            <p className="mt-3 text-center text-sm text-blue-300">
              Sign in to your account
            </p>
          </div>
        </div>

        <form className="mt-12 space-y-8" onSubmit={handleSubmit}>
          {error && (
            <div
              className="bg-red-900/50 border border-red-700/50 text-red-300 px-4 py-3 rounded-lg relative backdrop-blur-sm"
              role="alert"
            >
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-blue-300 mb-2"
              >
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={formData.username}
                onChange={handleChange}
                className="appearance-none relative block w-full px-4 py-3 border border-navy-700 placeholder-blue-400 text-blue-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 sm:text-sm bg-navy-800/50 backdrop-blur-sm"
                placeholder="Enter your username"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-blue-300 mb-2"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="appearance-none relative block w-full px-4 py-3 border border-navy-700 placeholder-blue-400 text-blue-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 sm:text-sm bg-navy-800/50 backdrop-blur-sm"
                placeholder="Enter your password"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 transform hover:scale-[1.02]"
            >
              <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-5 h-5 text-blue-300 group-hover:text-blue-200"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
                  />
                </svg>
              </span>
              Sign in
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
