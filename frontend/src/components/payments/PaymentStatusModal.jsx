import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { playPaymentSuccessAudio } from '../../utils/paymentAudio';
import { ShieldCheck, ShieldAlert, ArrowRight, RotateCcw, Copy, Check, FileText, Volume2 } from 'lucide-react';

export default function PaymentStatusModal({
  isOpen,
  status = 'success', // 'success' | 'failed'
  amount = '0.00',
  recipient = '',
  note = '',
  transactionId = '',
  errorMessage = '',
  onClose,
  onViewReceipt,
  onRetry,
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (status === 'success') {
      // 1. Play fintech chime + soundbox voice announcement ONLY for success!
      playPaymentSuccessAudio(amount, recipient);

      // 2. Fire celebratory confetti
      try {
        confetti({
          particleCount: 85,
          spread: 80,
          origin: { y: 0.55 },
          colors: ['#10b981', '#06b6d4', '#6366f1', '#f59e0b', '#ec4899'],
        });
      } catch (e) {
        // ignore if canvas not supported
      }
    }
    // Note: If status === 'failed', NO voice is played, as requested!
  }, [isOpen, status, amount, recipient]);

  if (!isOpen) return null;

  const handleCopyId = () => {
    if (!transactionId) return;
    navigator.clipboard.writeText(transactionId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isSuccess = status === 'success';
  const numericAmount = parseFloat(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div
        className="relative w-full max-w-md rounded-3xl glass-card border border-slate-200/80 dark:border-slate-800/80 shadow-2xl p-6 sm:p-8 backdrop-blur-2xl z-10 animate-in zoom-in-95 duration-300 overflow-hidden text-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow ambient background aura */}
        <div
          className={`absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-3xl opacity-20 pointer-events-none ${
            isSuccess ? 'bg-emerald-500' : 'bg-rose-500'
          }`}
        />

        {/* ======================================================== */}
        {/* SUCCESS STATE: Animated Right Tick & Voice Announcement */}
        {/* ======================================================== */}
        {isSuccess ? (
          <div className="flex flex-col items-center">
            {/* Animated SVG Right Tick Icon */}
            <div className="relative mb-5 flex items-center justify-center">
              {/* Concentric ripple wave pulse */}
              <div className="absolute w-24 h-24 rounded-full bg-emerald-500/20 animate-wave-pulse" />
              <div className="absolute w-20 h-20 rounded-full bg-emerald-500/30 animate-ping opacity-25" />

              {/* Checkmark SVG Container */}
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 p-1 shadow-lg shadow-emerald-500/40 animate-pop-bounce flex items-center justify-center">
                <svg
                  className="w-16 h-16"
                  viewBox="0 0 100 100"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Circular border draw */}
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    stroke="rgba(255, 255, 255, 0.4)"
                    strokeWidth="5"
                    fill="none"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    stroke="#ffffff"
                    strokeWidth="5"
                    strokeLinecap="round"
                    className="animate-circle-draw"
                    style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
                  />
                  {/* Right Tick (Checkmark) path draw */}
                  <path
                    d="M28 52 L44 68 L74 36"
                    stroke="#ffffff"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="animate-check-draw"
                  />
                </svg>
              </div>
            </div>

            {/* Voice Announcement Soundbox Pill */}
            <div className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold animate-pulse">
              <Volume2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Voice Announcement Active</span>
              <span className="flex gap-0.5 items-end h-3 ml-0.5">
                <span className="w-0.5 h-2 bg-emerald-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-0.5 h-3 bg-emerald-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-0.5 h-1.5 bg-emerald-500 animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            </div>

            {/* Title & Amount */}
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
              Payment Successful!
            </h2>
            <div className="mt-2 text-4xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
              ₹{numericAmount}
            </div>

            {/* Recipient Details */}
            {recipient && (
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Transferred to <span className="font-bold text-slate-900 dark:text-white">@{recipient.replace(/^@/, '')}</span>
              </p>
            )}

            {note && (
              <p className="mt-1 text-xs italic text-slate-500 dark:text-slate-400">
                "{note}"
              </p>
            )}

            {/* Transaction Ref */}
            {transactionId && (
              <div className="mt-4 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-500 flex items-center justify-between gap-2 max-w-xs w-full">
                <span className="truncate">Ref: {transactionId}</span>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="shrink-0 p-1 hover:text-slate-800 dark:hover:text-slate-200"
                  title="Copy Reference"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}

            {/* Actions */}
            <div className="mt-6 flex flex-col sm:flex-row gap-2.5 w-full">
              {onViewReceipt && (
                <button
                  type="button"
                  onClick={onViewReceipt}
                  className="flex-1 py-3 px-4 rounded-2xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                >
                  <FileText className="w-4 h-4 text-brand-500" /> View Receipt
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 flex items-center justify-center gap-1.5 transition-all active:scale-95"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* ======================================================== */
          /* FAILED STATE: Animated Wrong Tick (NO VOICE)            */
          /* ======================================================== */
          <div className="flex flex-col items-center animate-shake-wobble">
            {/* Animated SVG Wrong Tick (Cross / X) */}
            <div className="relative mb-5 flex items-center justify-center">
              {/* Soft red glow */}
              <div className="absolute w-24 h-24 rounded-full bg-rose-500/20 blur-md" />

              {/* Cross SVG Container */}
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-tr from-rose-600 to-red-500 p-1 shadow-lg shadow-rose-600/40 flex items-center justify-center">
                <svg
                  className="w-16 h-16"
                  viewBox="0 0 100 100"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Circular border draw */}
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    stroke="rgba(255, 255, 255, 0.4)"
                    strokeWidth="5"
                    fill="none"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    stroke="#ffffff"
                    strokeWidth="5"
                    strokeLinecap="round"
                    className="animate-circle-draw"
                    style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
                  />
                  {/* Wrong Tick (Cross line 1) */}
                  <line
                    x1="32"
                    y1="32"
                    x2="68"
                    y2="68"
                    stroke="#ffffff"
                    strokeWidth="6"
                    strokeLinecap="round"
                    className="animate-cross-1"
                  />
                  {/* Wrong Tick (Cross line 2) */}
                  <line
                    x1="68"
                    y1="32"
                    x2="32"
                    y2="68"
                    stroke="#ffffff"
                    strokeWidth="6"
                    strokeLinecap="round"
                    className="animate-cross-2"
                  />
                </svg>
              </div>
            </div>

            {/* Title & Amount Attempted */}
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
              Payment Failed
            </h2>
            {amount && parseFloat(amount) > 0 && (
              <div className="mt-1 text-2xl font-bold tracking-tight text-slate-400 line-through">
                ₹{numericAmount}
              </div>
            )}

            {/* Error Message Details */}
            <div className="mt-4 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold max-w-xs w-full flex items-start gap-2 text-left">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <div className="flex-1 leading-relaxed">
                {errorMessage || "Unable to complete transaction. Please check your credentials and balance."}
              </div>
            </div>

            {/* Reassurance text */}
            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>No money was debited from your wallet.</span>
            </div>

            {/* Actions */}
            <div className="mt-6 flex flex-col sm:flex-row gap-2.5 w-full">
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="flex-1 py-3 px-4 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-md shadow-brand-600/30 flex items-center justify-center gap-1.5 transition-all active:scale-95"
                >
                  <RotateCcw className="w-4 h-4" /> Try Again
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-2xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
