import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { Send, UserCheck, ShieldCheck, Lock, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function SendMoneyModal({ isOpen, onClose, onSuccess, initialRecipient = '' }) {
  const { showSuccess, showError } = useToast();
  const { user } = useAuth();

  const [step, setStep] = useState(1); // 1: Enter details, 2: PIN Confirmation
  const [recipient, setRecipient] = useState(initialRecipient);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [recipientDetails, setRecipientDetails] = useState(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (initialRecipient) {
      setRecipient(initialRecipient);
    }
  }, [initialRecipient]);

  // Recipient search debounce
  useEffect(() => {
    if (recipient.trim().length >= 3 && step === 1) {
      setSearching(true);
      const timer = setTimeout(() => {
        api.get(`/api/users/search/?q=${encodeURIComponent(recipient.trim())}`)
          .then((res) => {
            if (res.data?.success && res.data.data.length > 0) {
              setRecipientDetails(res.data.data[0]);
            } else {
              setRecipientDetails(null);
            }
          })
          .catch(() => setRecipientDetails(null))
          .finally(() => setSearching(false));
      }, 400);

      return () => clearTimeout(timer);
    } else {
      setRecipientDetails(null);
    }
  }, [recipient, step]);

  const resetState = () => {
    setStep(1);
    setRecipient('');
    setAmount('');
    setNote('');
    setPin('');
    setLoading(false);
    setRecipientDetails(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleProceedToConfirm = (e) => {
    e.preventDefault();
    if (!recipient.trim()) {
      showError("Please enter recipient username, email, or mobile.");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      showError("Please specify a valid payment amount.");
      return;
    }
    const currentBalance = parseFloat(user?.wallet_balance || 0);
    if (parseFloat(amount) > currentBalance) {
      showError(`Insufficient wallet balance (Available: ₹${currentBalance.toFixed(2)}).`);
      return;
    }

    setStep(2);
  };

  const handleExecutePayment = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await api.post('/api/payments/send/', {
        recipient: recipient.trim(),
        amount: parseFloat(amount).toFixed(2),
        note: note.trim(),
        pin: pin.trim()
      });

      if (res.data?.success) {
        confetti({
          particleCount: 90,
          spread: 80,
          origin: { y: 0.6 }
        });

        showSuccess(`Payment of ₹${amount} sent to ${recipient}!`);
        if (onSuccess) onSuccess(res.data.data);
        handleClose();
      }
    } catch (err) {
      showError(err.response?.data?.message || "Failed to process transfer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={step === 1 ? "Send Money Instantly" : "Confirm Payment"}
    >
      {step === 1 ? (
        <form onSubmit={handleProceedToConfirm} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Recipient (Username, Email, or Phone)
            </label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="e.g. priya or priya@example.com"
              required
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
            />

            {recipientDetails && (
              <div className="mt-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs flex items-center justify-between animate-in fade-in">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-500 text-white font-bold text-[10px] flex items-center justify-center">
                    {recipientDetails.username.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <span className="font-semibold text-emerald-800 dark:text-emerald-200">{recipientDetails.full_name || recipientDetails.username}</span>
                    <span className="text-emerald-600 dark:text-emerald-400 ml-1.5">(@{recipientDetails.username})</span>
                  </div>
                </div>
                <UserCheck className="w-4 h-4 text-emerald-500" />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Amount (INR)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-400">
                ₹
              </span>
              <input
                type="number"
                min="1"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
                className="w-full pl-9 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xl font-bold focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
              />
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Available: ₹{parseFloat(user?.wallet_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Add a Note (Optional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Dinner, rent, birthday gift 🎁"
              maxLength={255}
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
            />
          </div>

          <button
            type="submit"
            className="w-full mt-2 py-3.5 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm shadow-md shadow-brand-600/30 flex items-center justify-center gap-2 transition-all"
          >
            Review Payment <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      ) : (
        /* Step 2: Payment Review & PIN Authorization */
        <form onSubmit={handleExecutePayment} className="space-y-5 animate-in fade-in">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Transferring to:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">@{recipient}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-slate-500">Amount:</span>
              <span className="text-2xl font-extrabold text-slate-900 dark:text-white">₹{parseFloat(amount).toFixed(2)}</span>
            </div>
            {note && (
              <div className="flex justify-between text-xs text-slate-500 pt-2 border-t border-slate-200/80 dark:border-slate-800/80">
                <span>Note:</span>
                <span className="italic text-slate-700 dark:text-slate-300 truncate max-w-[200px]">{note}</span>
              </div>
            )}
            <div className="flex justify-between text-xs text-slate-500">
              <span>Platform Fee:</span>
              <span className="text-emerald-500 font-semibold">₹0.00 (Free)</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Enter 4-digit Security PIN
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Security PIN (e.g. 1234)"
                required
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="py-3 px-4 rounded-2xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              {loading ? "Settling via Ledger..." : `Confirm & Pay ₹${parseFloat(amount).toFixed(2)}`}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
