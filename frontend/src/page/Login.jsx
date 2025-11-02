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
      // Simulasi API call untuk admin login
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Hanya izinkan email dengan domain admin
      if (!email.includes("admin")) {
        throw new Error("Hanya admin yang dapat login di sini");
      }

      // Simple validation
      if (email === "admin" && password === "admin") {
        const token = "admin-jwt-token-" + Date.now();
        const userData = {
          name: "Administrator",
          email: email,
          role: "admin",
        };
        onLogin(token, "admin", userData);
        navigate("/analytics", { replace: true });
      } else {
        throw new Error("Email atau password salah");
      }
    } catch (error) {
      setError(error.message);
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
          <p className="text-slate-400 mt-2">
            Hanya untuk administrator sistem
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">
                Email Admin
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
                  placeholder="Masukkan password"
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
            className="w-full mt-6 py-3 px-4 bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Memproses...</span>
              </div>
            ) : (
              "Login sebagai Admin"
            )}
          </button>
        </form>

        {/* Demo Credentials */}
        <div className="mt-6 p-4 bg-slate-700/30 rounded-xl">
          <h4 className="text-slate-300 text-sm font-medium mb-2">
            Demo Credentials:
          </h4>
          <div className="text-slate-400 text-sm space-y-1">
            <p>
              Email: <span className="text-blue-400">admin@company.com</span>
            </p>
            <p>
              Password: <span className="text-blue-400">admin123</span>
            </p>
          </div>
        </div>

        {/* Back to FaceScan */}
        <div className="mt-4 text-center">
          <button
            onClick={() => navigate("/")}
            className="text-slate-400 hover:text-slate-300 text-sm transition-colors"
          >
            ← Kembali ke Face Scan
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
