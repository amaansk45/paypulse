import React, { useState } from 'react';
import Modal from '../common/Modal';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { ArrowDownLeft, Loader2 } from 'lucide-react';

export default function RequestMoneyModal({ isOpen, onClose, onSuccess }) {
  const { showSuccess, showError } = useToast();
  const [payer, setPayer] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const resetState = () => {
    setPayer('');
    setAmount('');
    setNote('');
    setLoading(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!payer.trim()) {
      showError("Please specify who you are requesting money from.");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      showError("Please enter a valid requested amount.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/api/payments/request/', {
        payer: payer.trim(),
        amount: parseFloat(amount).toFixed(2),
        note: note.trim()
      });

      if (res.data?.success) {
        showSuccess(`Payment request sent to @${payer}!`);
        if (onSuccess) onSuccess(res.data.data);
        handleClose();
      }
    } catch (err) {
      showError(err.response?.data?.message || "Failed to create payment request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Request Money">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
            Request From (Username, Email, or Phone)
          </label>
          <input
            type="text"
            value={payer}
            onChange={(e) => setPayer(e.target.value)}
            placeholder="e.g. rahul or rahul@example.com"
            required
            className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
            Requested Amount (INR)
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
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
            Reason / Note (Optional)
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Group lunch split, grocery bill"
            maxLength={255}
            className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 py-3.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm shadow-md shadow-amber-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowDownLeft className="w-4 h-4" />}
          {loading ? "Sending Request..." : "Send Request"}
        </button>
      </form>
    </Modal>
  );
}
