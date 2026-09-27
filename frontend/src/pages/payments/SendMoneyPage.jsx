import React, { useState } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import ReceiptModal from '../../components/payments/ReceiptModal';
import PaymentStatusModal from '../../components/payments/PaymentStatusModal';
import { Send, UserCheck, ShieldCheck, Lock, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function SendMoneyPage() {
  const { user, refreshUser } = useAuth();
  const { showSuccess, showError } = useToast();

  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [pin, setPin] = useState('');
  const [step, setStep] = useState(1); // 1: Input, 2: Review & PIN
  const [loading, setLoading] = useState(false);
  const [recipientInfo, setRecipientInfo] = useState(null);
  const [receipt, setSelectedReceipt] = useState(null);

  // Status Animation Modal State
  const [statusModal, setStatusModal] = useState({
    isOpen: false,
    status: 'success', // 'success' | 'failed'
    amount: '',
    recipient: '',
    note: '',
    transactionId: '',
    errorMessage: '',
    receiptData: null,
  });

  const handleVerifyRecipient = async (e) => {
    e.preventDefault();
    if (!recipient.trim()) {
      showError("Please enter recipient username, email, or mobile.");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      showError("Please enter a valid amount.");
      return;
    }

    const available = parseFloat(user?.wallet_balance || 0);
    if (parseFloat(amount) > available) {
      showError(`Insufficient wallet balance. Available: ₹${available.toFixed(2)}`);
      return;
    }

    setStep(2);
  };

  const handleExecuteSend = async (e) => {
    e.preventDefault();
    setLoading(true);
    const sentAmount = parseFloat(amount).toFixed(2);
    const sentRecipient = recipient.trim();
    const sentNote = note.trim();

    try {
      const res = await api.post('/api/payments/send/', {
        recipient: sentRecipient,
        amount: sentAmount,
        note: sentNote,
        pin: pin.trim()
      });

      if (res.data?.success) {
        showSuccess(`Transferred ₹${sentAmount} to @${sentRecipient}!`);
        if (refreshUser) refreshUser();

        // Load receipt
        let receiptPayload = null;
        try {
          const recRes = await api.get(`/api/transactions/${res.data.data.transaction_id}/receipt/`);
          if (recRes.data?.success) {
            receiptPayload = recRes.data.data;
          }
        } catch (e) {
          // ignore receipt fetch error
        }

        // Show Success Right Tick Modal with Voice Announcement!
        setStatusModal({
          isOpen: true,
          status: 'success',
          amount: sentAmount,
          recipient: sentRecipient,
          note: sentNote,
          transactionId: res.data.data?.transaction_id || '',
          errorMessage: '',
          receiptData: receiptPayload,
        });

        // Reset inputs
        setRecipient('');
        setAmount('');
        setNote('');
        setPin('');
        setStep(1);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to complete transfer.";
      showError(msg);

      // Show Failed Wrong Tick Modal (NO VOICE!)
      setStatusModal({
        isOpen: true,
        status: 'failed',
        amount: sentAmount,
        recipient: sentRecipient,
        note: sentNote,
        transactionId: '',
        errorMessage: msg,
        receiptData: null,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Send Money
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Instant zero-fee peer-to-peer digital wallet transfer.
        </p>
      </div>

      <div className="p-6 sm:p-8 rounded-3xl glass-card border border-slate-200/80 dark:border-slate-800/80 shadow-xl backdrop-blur-xl">
        {step === 1 ? (
          <form onSubmit={handleVerifyRecipient} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Recipient Details
              </label>
              <input
                type="text"
                required
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="Username, Email, or Mobile Phone..."
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Amount (INR)
                </label>
                <span className="text-xs text-slate-400">
                  Available: <span className="font-bold text-slate-800 dark:text-slate-200">₹{parseFloat(user?.wallet_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-slate-400">₹</span>
                <input
                  type="number"
                  min="1"
                  step="any"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-10 pr-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-2xl font-extrabold focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Add an Optional Note
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Reimbursement for dinner, rent share"
                maxLength={255}
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-4 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm shadow-md shadow-brand-600/30 flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              Continue to Authorization <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <form onSubmit={handleExecuteSend} className="space-y-6 animate-in fade-in">
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Beneficiary:</span>
                <span className="font-bold text-slate-900 dark:text-white">@{recipient}</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-slate-500">Transfer Amount:</span>
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white">₹{parseFloat(amount).toFixed(2)}</span>
              </div>
              {note && (
                <div className="flex justify-between text-xs pt-2 border-t border-slate-200/80 dark:border-slate-800/80">
                  <span className="text-slate-500">Note:</span>
                  <span className="italic text-slate-700 dark:text-slate-300 truncate max-w-[220px]">"{note}"</span>
                </div>
              )}
              <div className="flex justify-between text-xs text-slate-500">
                <span>Fee & Taxes:</span>
                <span className="font-bold text-emerald-500">₹0.00</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Authorize with Security PIN
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  maxLength={6}
                  required
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Security PIN (e.g. 1234)"
                  className="w-full pl-10 pr-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="py-3.5 px-5 rounded-2xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3.5 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                {loading ? "Settling via Ledger..." : `Confirm & Send ₹${parseFloat(amount).toFixed(2)}`}
              </button>
            </div>
          </form>
        )}
      </div>

      <ReceiptModal
        isOpen={!!receipt}
        onClose={() => setSelectedReceipt(null)}
        receipt={receipt}
      />

      {/* Payment Status Modal (Right Tick + Voice on Success, Wrong Tick on Failure) */}
      <PaymentStatusModal
        isOpen={statusModal.isOpen}
        status={statusModal.status}
        amount={statusModal.amount}
        recipient={statusModal.recipient}
        note={statusModal.note}
        transactionId={statusModal.transactionId}
        errorMessage={statusModal.errorMessage}
        onClose={() => setStatusModal((prev) => ({ ...prev, isOpen: false }))}
        onRetry={() => {
          setStatusModal((prev) => ({ ...prev, isOpen: false }));
          setPin('');
          setStep(2);
        }}
        onViewReceipt={
          statusModal.receiptData
            ? () => {
                setSelectedReceipt(statusModal.receiptData);
              }
            : null
        }
      />
    </div>
  );
}
