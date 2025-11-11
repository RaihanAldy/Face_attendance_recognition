import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Eye, EyeOff } from "lucide-react";

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      console.log(" Attempting admin login...");

      // Extract username from email (before @)
      const username = email.split("@")[0];

      //  CONNECT TO BACKEND API
      const response = await fetch("http://localhost:5000/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username, // or use email directly
          password: password,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log(" Login successful:", data);

        // Call parent onLogin callback
        const userData = {
          name: data.name || "Administrator",
          email: email,
          role: data.role || "admin",
        };

        onLogin(data.token, "admin", userData);

        // Navigate to analytics dashboard
        navigate("/analytics", { replace: true });
      } else {
        throw new Error(data.error || "Login failed. Please try again.");
      }
    } catch (error) {
      console.error(" Login error:", error);

      // User-friendly error messages
      let errorMessage = error.message;

      if (error.message === "Failed to fetch") {
        errorMessage =
          "Unable to connect to the server. Ensure the backend is running on http://localhost:5000";
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 w-full max-w-md border border-slate-700/50 shadow-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-600 p-3 rounded-full">
              <Shield className="h-8 w-8 text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white">Admin Login</h2>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">
                Admin Email
              </label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                placeholder="admin@company.com"
                required
              />
            </div>

            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all pr-12"
                  placeholder="Enter password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <p className="text-red-400 text-sm text-center">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-6 py-3 px-4 bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
          >
            {isLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Processing...</span>
              </div>
            ) : (
              "Login as Admin"
            )}
          </button>
        </form>

        {/* Demo Credentials */}
        <div className="mt-6 p-4 bg-slate-700/30 rounded-xl border border-slate-600/30">
          <h4 className="text-slate-300 text-sm font-medium mb-2">
            Demo Credentials:
          </h4>
          <div className="text-slate-400 text-sm space-y-1">
            <p>
              Email:{" "}
              <span className="text-blue-400 font-mono">admin@company.com</span>
            </p>
            <p>
              Password:{" "}
              <span className="text-blue-400 font-mono">admin123</span>
            </p>
            <p className="text-xs text-slate-500 mt-2">
              The username will be taken from the email (before @).
            </p>
          </div>
        </div>

        {/* Back to FaceScan */}
        <div className="mt-4 text-center">
          <button
            onClick={() => navigate("/")}
            className="text-slate-400 hover:text-slate-300 text-sm transition-colors"
          >
            ← Face Scan
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
