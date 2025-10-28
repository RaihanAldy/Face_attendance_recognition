import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ScanFace } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Test credentials check (In production, this should be replaced with actual API call)
    if (formData.username === 'admin' && formData.password === 'admin123') {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      localStorage.setItem('authToken', 'test-token-123');
      navigate('/');
    } else {
      setError('Invalid username or password');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-navy-900 p-8 rounded-xl shadow-lg border border-navy-800">
        <div className="text-center">
          <div className="flex justify-center">
            <ScanFace className="h-16 w-16 text-sky-400" />
          </div>
          <h2 className="mt-4 text-3xl font-bold text-sky-100">
            Admin Login
          </h2>
          <p className="mt-2 text-sm text-sky-400">
            Sign in to access the attendance dashboard
          </p>
          <div className="mt-2 text-xs bg-navy-700 p-3 rounded-lg">
            <p className="text-sky-300 font-medium mb-1">Test Account:</p>
            <p className="text-sky-400">Username: <span className="text-sky-200">admin</span></p>
            <p className="text-sky-400">Password: <span className="text-sky-200">admin123</span></p>
          </div>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="text-sm font-medium text-sky-300">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="appearance-none rounded-lg relative block w-full px-3 py-2 mt-1 border border-sky-700 bg-navy-900 placeholder-sky-400 text-sky-100 focus:outline-none focus:ring-sky-500 focus:border-sky-500 focus:z-10 sm:text-sm"
                placeholder="Enter your username"
                value={formData.username}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="password" className="text-sm font-medium text-sky-300">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="appearance-none rounded-lg relative block w-full px-3 py-2 mt-1 border border-sky-700 bg-navy-900 placeholder-sky-400 text-sky-100 focus:outline-none focus:ring-sky-500 focus:border-sky-500 focus:z-10 sm:text-sm pr-10"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-sky-500"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white ${
              loading ? 'bg-sky-700' : 'bg-sky-500 hover:bg-sky-600'
            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-colors`}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;