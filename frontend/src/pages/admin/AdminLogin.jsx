import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ShieldAlert, ShieldCheck, Lock, User, Eye, EyeOff, Loader2, ArrowRight, KeyRound } from 'lucide-react';

export default function AdminLogin() {
  const { login, logout } = useAuth();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await login(username.trim(), password);
      
      const userData = res?.data?.user;
      if (userData?.role !== 'ADMIN') {
        // Not an administrator - force logout and deny entry
        await logout();
        showError("Access Denied: You do not possess Administrator privileges.");
        return;
      }

      showSuccess("Welcome, Administrator. Security session initiated.");
      navigate('/admin', { replace: true });
    } catch (err) {
      showError(err.message || "Admin authorization failed.");
    } finally {
      setLoading(false);
    }
  };

  const fillAdminCredentials = () => {
    setUsername('admin');
    setPassword('Admin@12345');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-tr from-slate-950 via-purple-950/40 to-slate-900 text-slate-100">
      <div className="w-full max-w-md">
        {/* Admin Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-purple-800 text-white shadow-lg shadow-purple-900/50 mb-4 ring-4 ring-purple-500/20">
            <ShieldAlert className="w-9 h-9" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center justify-center gap-2">
            PayPulse <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 font-bold uppercase tracking-wider">Admin</span>
          </h1>
          <p className="text-xs uppercase tracking-widest font-semibold text-purple-300/80 mt-1">
            Staff & System Administration Portal
          </p>
        </div>

        {/* Security Warning Notice */}
        <div className="mb-4 p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs flex items-center gap-2.5 backdrop-blur-sm">
          <KeyRound className="w-4 h-4 shrink-0 text-purple-400" />
          <span>Restricted Portal. Authorized personnel and audit-logged operations only.</span>
        </div>

        {/* Card */}
        <div className="rounded-3xl bg-slate-900/80 border border-purple-900/40 shadow-2xl shadow-purple-950/50 p-6 sm:p-8 backdrop-blur-xl">
          <h2 className="text-xl font-bold text-white mb-1">Administrative Sign-In</h2>
          <p className="text-xs text-slate-400 mb-6">
            Enter administrative credentials to access ledger management and oversight tools.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-purple-300 uppercase tracking-wider mb-1.5">
                Staff ID or Email
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin or admin@paypulse.com"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-950/80 border border-purple-900/50 text-white placeholder-slate-500 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-purple-300 uppercase tracking-wider mb-1.5">
                Security Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-3 rounded-2xl bg-slate-950/80 border border-purple-900/50 text-white placeholder-slate-500 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-purple-900/40 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 mt-3"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              {loading ? "Authenticating Clearance..." : "Authorize Admin Session"}
            </button>
          </form>

          {/* Discreet Admin Auto-fill for convenience */}
          <div className="mt-5 pt-4 border-t border-purple-900/30 text-center">
            <button
              type="button"
              onClick={fillAdminCredentials}
              className="text-[11px] font-semibold text-purple-400/80 hover:text-purple-300 hover:underline flex items-center justify-center gap-1 mx-auto"
            >
              <KeyRound className="w-3 h-3" /> Quick-fill Default Admin Clearance
            </button>
          </div>

          <div className="mt-5 text-center text-xs text-slate-500">
            Standard customer account?{' '}
            <Link to="/login" className="font-bold text-brand-400 hover:underline">
              Go to User Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
