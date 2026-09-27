import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ShieldCheck, Lock, User, Mail, Phone, Eye, EyeOff, Loader2, ArrowRight, AlertCircle } from 'lucide-react';

export default function Register() {
  const { register } = useAuth();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone_number: '',
    password: '',
    confirm_password: ''
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const calculateStrength = (pwd) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };

  const strength = calculateStrength(formData.password);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    if (generalError) setGeneralError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({});
    setGeneralError('');

    if (formData.username.trim().length < 3) {
      const err = "Username must be at least 3 characters.";
      setFieldErrors({ username: [err] });
      showError(err);
      return;
    }

    if (formData.password.length < 8) {
      const err = "Password must be at least 8 characters.";
      setFieldErrors({ password: [err] });
      showError(err);
      return;
    }

    if (formData.password !== formData.confirm_password) {
      const err = "Passwords do not match.";
      setFieldErrors({ confirm_password: [err] });
      showError(err);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        username: formData.username.trim(),
        email: formData.email.trim(),
        phone_number: formData.phone_number.trim(),
        password: formData.password,
        confirm_password: formData.confirm_password
      };

      const res = await register(payload);
      showSuccess("Account created! Please verify your OTP.");
      const debugOtp = res?.data?.debug_otp;
      navigate(`/verify-otp?identifier=${encodeURIComponent(formData.email.trim())}&purpose=REGISTRATION${debugOtp ? `&code=${debugOtp}` : ''}`);
    } catch (err) {
      const msg = err.message || "Registration failed.";
      setGeneralError(msg);
      showError(msg);
      if (err.errors && typeof err.errors === 'object') {
        setFieldErrors(err.errors);
      }
    } finally {
      setLoading(false);
    }
  };

  const getFieldError = (field) => {
    const error = fieldErrors[field];
    if (!error) return null;
    return Array.isArray(error) ? error[0] : String(error);
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
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Create an Account</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
            Get your instant digital wallet with double-entry security.
          </p>

          {/* Alert error box if general error */}
          {generalError && (
            <div className="mb-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{generalError}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Username */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  placeholder="e.g. rahul_sharma"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border ${
                    getFieldError('username')
                      ? 'border-rose-500 focus:ring-rose-500'
                      : 'border-slate-200 dark:border-slate-800 focus:ring-brand-500'
                  } text-sm font-medium focus:outline-none focus:ring-2`}
                />
              </div>
              {getFieldError('username') && (
                <p className="mt-1 text-[11px] font-medium text-rose-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {getFieldError('username')}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="you@example.com"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border ${
                    getFieldError('email')
                      ? 'border-rose-500 focus:ring-rose-500'
                      : 'border-slate-200 dark:border-slate-800 focus:ring-brand-500'
                  } text-sm font-medium focus:outline-none focus:ring-2`}
                />
              </div>
              {getFieldError('email') && (
                <p className="mt-1 text-[11px] font-medium text-rose-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {getFieldError('email')}
                </p>
              )}
            </div>

            {/* Phone Number */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  Mobile Number
                </label>
                <span className="text-[10px] text-slate-400 font-medium">Optional</span>
              </div>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="tel"
                  value={formData.phone_number}
                  onChange={(e) => handleInputChange('phone_number', e.target.value)}
                  placeholder="+91 9876543210"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border ${
                    getFieldError('phone_number')
                      ? 'border-rose-500 focus:ring-rose-500'
                      : 'border-slate-200 dark:border-slate-800 focus:ring-brand-500'
                  } text-sm font-medium focus:outline-none focus:ring-2`}
                />
              </div>
              {getFieldError('phone_number') && (
                <p className="mt-1 text-[11px] font-medium text-rose-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {getFieldError('phone_number')}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder="Min. 8 characters"
                  className={`w-full pl-10 pr-10 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border ${
                    getFieldError('password')
                      ? 'border-rose-500 focus:ring-rose-500'
                      : 'border-slate-200 dark:border-slate-800 focus:ring-brand-500'
                  } text-sm font-medium focus:outline-none focus:ring-2`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Strength Meter */}
              {formData.password && (
                <div className="mt-1.5 flex items-center gap-1.5">
                  <div className="flex-1 h-1 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex gap-1">
                    {[1, 2, 3, 4].map((step) => (
                      <div
                        key={step}
                        className={`h-full flex-1 transition-all ${
                          strength >= step
                            ? strength <= 2
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                            : 'bg-transparent'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400">
                    {strength <= 1 ? 'Weak' : strength <= 3 ? 'Good' : 'Strong'}
                  </span>
                </div>
              )}

              {getFieldError('password') ? (
                <p className="mt-1 text-[11px] font-medium text-rose-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" /> {getFieldError('password')}
                </p>
              ) : (
                <p className="mt-1 text-[10px] text-slate-400">
                  Must be at least 8 characters. Avoid common or username-like passwords.
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.confirm_password}
                  onChange={(e) => handleInputChange('confirm_password', e.target.value)}
                  placeholder="Repeat your password"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border ${
                    getFieldError('confirm_password')
                      ? 'border-rose-500 focus:ring-rose-500'
                      : 'border-slate-200 dark:border-slate-800 focus:ring-brand-500'
                  } text-sm font-medium focus:outline-none focus:ring-2`}
                />
              </div>
              {getFieldError('confirm_password') && (
                <p className="mt-1 text-[11px] font-medium text-rose-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {getFieldError('confirm_password')}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm shadow-md shadow-brand-600/30 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 mt-4"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Complete Registration"}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-brand-600 dark:text-brand-400 hover:underline">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
