import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { ShieldCheck, KeyRound, Loader2, ArrowRight, RotateCw } from 'lucide-react';

export default function VerifyOTP() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const identifier = searchParams.get('identifier') || '';
  const purpose = searchParams.get('purpose') || 'REGISTRATION';
  const initialCode = searchParams.get('code') || '';

  const [code, setCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleVerify = async (e) => {
    if (e) e.preventDefault();
    if (!code || code.length < 6) {
      showError("Please enter a 6-digit numeric OTP code.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/api/auth/verify-otp/', {
        identifier,
        code: code.trim(),
        purpose
      });

      if (res.data?.success) {
        showSuccess("Verification successful! Welcome to PayPulse.");
        navigate('/dashboard');
      }
    } catch (err) {
      showError(err.response?.data?.message || "Invalid or expired OTP code.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setResending(true);

    try {
      const res = await api.post('/api/auth/resend-otp/', {
        identifier,
        purpose
      });

      if (res.data?.success) {
        showSuccess("New OTP has been dispatched to your email/mobile.");
        setCountdown(60);
        if (res.data.data?.debug_otp) {
          setCode(res.data.data.debug_otp);
        }
      }
    } catch (err) {
      showError(err.response?.data?.message || "Failed to resend OTP.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-tr from-surface-light via-slate-100 to-indigo-50/50 dark:from-surface-dark dark:via-slate-950 dark:to-indigo-950/30 transition-colors">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white shadow-glow mb-4">
            <KeyRound className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Verify Your Account
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            We sent a 6-digit security code to <span className="font-semibold text-slate-700 dark:text-slate-300">{identifier || "your email"}</span>
          </p>
        </div>

        <div className="rounded-3xl glass-card border border-slate-200/80 dark:border-slate-800/80 shadow-2xl p-6 sm:p-8 backdrop-blur-xl">
          <form onSubmit={handleVerify} className="space-y-6">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2 text-center">
                Enter 6-Digit OTP Code
              </label>
              <input
                type="text"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="••••••"
                autoFocus
                className="w-full py-4 text-center tracking-[0.5em] text-3xl font-extrabold rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading || code.length < 6}
              className="w-full py-3.5 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm shadow-md shadow-brand-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify & Continue"}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">Didn't receive the code?</span>
            <button
              type="button"
              onClick={handleResend}
              disabled={countdown > 0 || resending}
              className="font-bold text-brand-600 dark:text-brand-400 hover:underline disabled:opacity-50 flex items-center gap-1"
            >
              {resending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCw className="w-3 h-3" />}
              {countdown > 0 ? `Resend in ${countdown}s` : "Resend OTP"}
            </button>
          </div>

          <div className="mt-4 text-center">
            <Link to="/login" className="text-xs text-slate-400 hover:underline">
              ← Return to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
