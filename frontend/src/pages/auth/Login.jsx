import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ShieldCheck, Lock, User, Eye, EyeOff, Loader2, ArrowRight, Sparkles } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(username.trim(), password);
      showSuccess("Signed in successfully!");
      navigate(from, { replace: true });
    } catch (err) {
      showError(err.message || "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  const fillQuickCredentials = (u, p) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-tr from-surface-light via-slate-100 to-indigo-50/50 dark:from-surface-dark dark:via-slate-950 dark:to-indigo-950/30 transition-colors">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white shadow-glow mb-4">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-brand-600 via-indigo-600 to-emerald-500 bg-clip-text text-transparent">
            PayPulse
          </h1>
          <p className="text-xs uppercase tracking-widest font-semibold text-slate-500 dark:text-slate-400 mt-1">
            Enterprise Digital Wallet Network
          </p>
        </div>

        {/* Card */}
        <div className="rounded-3xl glass-card border border-slate-200/80 dark:border-slate-800/80 shadow-2xl p-6 sm:p-8 backdrop-blur-xl">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Welcome back</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
            Enter your credentials to access your secure digital wallet.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Username or Email
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username or email"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm shadow-md shadow-brand-600/30 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 mt-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign In"}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="mt-6 pt-5 border-t border-slate-200/80 dark:border-slate-800/80">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" /> Quick Demo Accounts
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => fillQuickCredentials('rahul', 'Password@123')}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/60 text-left transition-colors"
              >
                <div className="font-bold text-slate-800 dark:text-slate-200">Rahul (User)</div>
                <div className="text-[10px] text-slate-400">₹12,500 balance</div>
              </button>
              <button
                type="button"
                onClick={() => fillQuickCredentials('priya', 'Password@123')}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/60 text-left transition-colors"
              >
                <div className="font-bold text-slate-800 dark:text-slate-200">Priya (User)</div>
                <div className="text-[10px] text-slate-400">₹8,400 balance</div>
              </button>
              <button
                type="button"
                onClick={() => fillQuickCredentials('vikram', 'Password@123')}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/60 text-left transition-colors"
              >
                <div className="font-bold text-slate-800 dark:text-slate-200">Vikram (User)</div>
                <div className="text-[10px] text-slate-400">₹4,200 balance</div>
              </button>
              <button
                type="button"
                onClick={() => fillQuickCredentials('admin', 'Admin@12345')}
                className="p-2 rounded-xl border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-left transition-colors"
              >
                <div className="font-bold text-purple-600 dark:text-purple-300">Admin Portal</div>
                <div className="text-[10px] text-purple-400">Full System Control</div>
              </button>
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
            Don't have an account?{' '}
            <Link to="/register" className="font-bold text-brand-600 dark:text-brand-400 hover:underline">
              Create Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
