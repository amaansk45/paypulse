import React, { useState } from 'react';
import Modal from '../common/Modal';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Copy, Check, Loader2, Sparkles } from 'lucide-react';

export default function DynamicQRModal({ isOpen, onClose }) {
  const { showSuccess, showError } = useToast();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [expiryMinutes, setExpiryMinutes] = useState(30);
  const [loading, setLoading] = useState(false);
  const [generatedQR, setGeneratedQR] = useState(null);
  const [copied, setCopied] = useState(false);

  const resetState = () => {
    setAmount('');
    setNote('');
    setExpiryMinutes(30);
    setLoading(false);
    setGeneratedQR(null);
    setCopied(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      showError("Please enter a valid amount.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/api/qr/generate/', {
        amount: parseFloat(amount).toFixed(2),
        note: note.trim(),
        expiry_minutes: parseInt(expiryMinutes, 10)
      });

      if (res.data?.success) {
        setGeneratedQR(res.data.data);
        showSuccess("Dynamic QR invoice created!");
      }
    } catch (err) {
      showError(err.response?.data?.message || "Failed to generate dynamic QR.");
    } finally {
      setLoading(false);
    }
  };

  const copyPaymentPayload = () => {
    if (!generatedQR) return;
    navigator.clipboard.writeText(generatedQR.payment_identifier);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showSuccess("Payment identifier copied to clipboard.");
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Generate Dynamic QR Invoice">
      {!generatedQR ? (
        <form onSubmit={handleGenerate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Invoice Amount (INR)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-400">₹</span>
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
              Invoice Note / Reference (Optional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Invoice #2026-99 or Coffee & Pastry"
              maxLength={255}
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Expiry Time
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { mins: 15, label: '15 mins' },
                { mins: 30, label: '30 mins' },
                { mins: 60, label: '1 hour' }
              ].map((opt) => (
                <button
                  key={opt.mins}
                  type="button"
                  onClick={() => setExpiryMinutes(opt.mins)}
                  className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                    expiryMinutes === opt.mins
                      ? 'bg-brand-50/70 dark:bg-brand-950/40 border-brand-500 text-brand-600 dark:text-brand-400'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm shadow-md shadow-purple-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? "Generating Dynamic QR..." : "Generate Dynamic QR"}
          </button>
        </form>
      ) : (
        /* Generated QR Display */
        <div className="text-center space-y-4 animate-in fade-in">
          <div className="p-6 bg-white rounded-3xl inline-block shadow-xl border border-slate-200 mx-auto">
            <QRCodeSVG
              value={JSON.stringify({
                app: "paypulse",
                pid: generatedQR.payment_identifier,
                type: "DYNAMIC",
                amount: generatedQR.amount,
                note: generatedQR.note
              })}
              size={200}
              level="H"
              includeMargin={true}
            />
          </div>

          <div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
              ₹{parseFloat(generatedQR.amount).toFixed(2)}
            </div>
            {generatedQR.note && (
              <p className="text-xs text-slate-500 italic mt-0.5">{generatedQR.note}</p>
            )}
            <div className="text-xs text-amber-500 font-medium mt-1">
              Valid for single payment • Expires in {expiryMinutes} minutes
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={copyPaymentPayload}
              className="flex-1 py-3 px-4 rounded-2xl border border-slate-300 dark:border-slate-700 font-semibold text-xs flex items-center justify-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied Payment ID" : "Copy Payment ID"}
            </button>

            <button
              type="button"
              onClick={resetState}
              className="py-3 px-4 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs transition-colors"
            >
              New QR
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
