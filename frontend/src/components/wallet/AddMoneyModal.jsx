import React, { useState } from 'react';
import Modal from '../common/Modal';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { CreditCard, Smartphone, Building, ShieldCheck, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import PaymentStatusModal from '../payments/PaymentStatusModal';

export default function AddMoneyModal({ isOpen, onClose, onSuccess }) {
  const { showSuccess, showError } = useToast();
  const { refreshUser } = useAuth();
  const [step, setStep] = useState(1); // 1: Input amount & method, 2: Gateway checkout
  const [amount, setAmount] = useState('1000');
  const [method, setMethod] = useState('CARD');
  const [loading, setLoading] = useState(false);
  const [orderData, setOrderData] = useState(null);

  // Status Animation Modal State
  const [statusModal, setStatusModal] = useState({
    isOpen: false,
    status: 'success', // 'success' | 'failed'
    amount: '',
    recipient: '',
    note: '',
    transactionId: '',
    errorMessage: '',
  });

  const quickAmounts = ['500', '1000', '2500', '5000'];

  const resetState = () => {
    setStep(1);
    setAmount('1000');
    setMethod('CARD');
    setLoading(false);
    setOrderData(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleInitiate = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      showError("Please enter a valid deposit amount.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/api/wallet/add-money/initiate/', {
        amount: parseFloat(amount).toFixed(2),
        payment_method: method === 'CARD' ? 'CARD' : method === 'UPI' ? 'UPI' : 'NETBANKING'
      });

      if (res.data?.success) {
        setOrderData(res.data.data);
        setStep(2);
      }
    } catch (err) {
      showError(err.response?.data?.message || "Failed to initialize payment gateway order.");
    } finally {
      setLoading(false);
    }
  };

  const handleSimulatePayment = async () => {
    setLoading(true);
    const sentAmount = parseFloat(amount).toFixed(2);

    try {
      const res = await api.post('/api/wallet/add-money/sandbox-mock/', {
        transaction_id: orderData.transaction_id,
        order_id: orderData.order_id,
        payment_method: method
      });

      if (res.data?.success) {
        showSuccess(`Success! ₹${sentAmount} added to your digital wallet.`);
        if (refreshUser) refreshUser();
        if (onSuccess) onSuccess();

        // Show Success Right Tick Modal with Voice Announcement!
        setStatusModal({
          isOpen: true,
          status: 'success',
          amount: sentAmount,
          recipient: 'Wallet Top-Up',
          note: `Gateway deposit via ${method}`,
          transactionId: res.data.data?.transaction_id || orderData.transaction_id,
          errorMessage: '',
        });
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Payment simulation failed.";
      showError(msg);

      // Show Failed Wrong Tick Modal (NO VOICE!)
      setStatusModal({
        isOpen: true,
        status: 'failed',
        amount: sentAmount,
        recipient: 'Wallet Deposit',
        note: '',
        transactionId: '',
        errorMessage: msg,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen && !statusModal.isOpen}
        onClose={handleClose}
        title={step === 1 ? "Top Up Digital Wallet" : "Sandbox Gateway Checkout"}
      >
      {step === 1 ? (
        <form onSubmit={handleInitiate} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Enter Amount (INR)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-slate-400">
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
                className="w-full pl-10 pr-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
              />
            </div>

            {/* Quick Amount Chips */}
            <div className="flex gap-2 mt-2.5">
              {quickAmounts.map((val) => (
                <button
                  type="button"
                  key={val}
                  onClick={() => setAmount(val)}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    amount === val
                      ? 'bg-brand-50 dark:bg-brand-950/60 border-brand-500 text-brand-600 dark:text-brand-400'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  +₹{val}
                </button>
              ))}
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Select Sandbox Payment Method
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { id: 'CARD', label: 'Test Card', icon: CreditCard },
                { id: 'UPI', label: 'Test UPI', icon: Smartphone },
                { id: 'NETBANKING', label: 'NetBanking', icon: Building },
              ].map((m) => {
                const Icon = m.icon;
                const active = method === m.id;
                return (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => setMethod(m.id)}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all ${
                      active
                        ? 'bg-brand-50/70 dark:bg-brand-950/40 border-brand-500 text-brand-600 dark:text-brand-400 ring-2 ring-brand-500/20'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <Icon className="w-5 h-5 mb-1.5" />
                    <span className="text-xs font-semibold">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>Sandbox Mode: No real bank funds or cards will be charged. This simulates external gateway processing safely.</span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm shadow-md shadow-brand-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Proceed to Sandbox Checkout →"}
          </button>
        </form>
      ) : (
        /* Step 2: Simulated Sandbox Gateway */
        <div className="space-y-5 animate-in fade-in">
          <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> PayPulse Test Gateway
            </span>
            <div className="text-3xl font-extrabold tracking-tight">₹{parseFloat(amount).toFixed(2)}</div>
            <p className="text-xs font-mono text-slate-500">Order ID: {orderData?.order_id}</p>
          </div>

          <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
            <div className="flex justify-between">
              <span>Payment Method:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{method}</span>
            </div>
            <div className="flex justify-between">
              <span>Security Protocol:</span>
              <span className="font-semibold text-emerald-500">HMAC-SHA256 Encrypted</span>
            </div>
            <div className="flex justify-between">
              <span>Processing Environment:</span>
              <span className="font-semibold text-purple-400">Sandbox Testnet</span>
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
              type="button"
              onClick={handleSimulatePayment}
              disabled={loading}
              className="flex-1 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Verifying Signatures...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Authorize & Deposit
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </Modal>

    {/* Payment Status Modal (Right Tick + Voice on Success, Wrong Tick on Failure) */}
    <PaymentStatusModal
      isOpen={statusModal.isOpen}
      status={statusModal.status}
      amount={statusModal.amount}
      recipient={statusModal.recipient}
      note={statusModal.note}
      transactionId={statusModal.transactionId}
      errorMessage={statusModal.errorMessage}
      onClose={() => {
        const wasSuccess = statusModal.status === 'success';
        setStatusModal((prev) => ({ ...prev, isOpen: false }));
        if (wasSuccess) {
          handleClose();
        }
      }}
      onRetry={() => {
        setStatusModal((prev) => ({ ...prev, isOpen: false }));
        setStep(2);
      }}
    />
  </>
  );
}
