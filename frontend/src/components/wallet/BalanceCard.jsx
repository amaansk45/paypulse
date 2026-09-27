import React, { useState } from 'react';
import { Eye, EyeOff, Plus, Send, ArrowDownLeft, ScanLine, CreditCard, ShieldCheck } from 'lucide-react';

export default function BalanceCard({ wallet, onAddMoney, onSend, onRequest, onScan }) {
  const [showBalance, setShowBalance] = useState(true);

  const balance = parseFloat(wallet?.balance || 0);
  const formattedBalance = balance.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 text-white p-6 sm:p-8 shadow-2xl border border-indigo-900/50 shadow-brand-500/10">
      {/* Decorative Glow Elements */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Card Header */}
      <div className="relative z-10 flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xs uppercase tracking-wider font-semibold text-slate-300">PayPulse Digital Wallet</h2>
            <p className="text-[11px] font-mono text-slate-400">{wallet?.wallet_number || 'WAL-ACTIVE'}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          {wallet?.is_frozen ? 'Frozen' : 'Active'}
        </div>
      </div>

      {/* Balance Section */}
      <div className="relative z-10 my-4">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-1">
          <span>Available Balance</span>
          <button
            onClick={() => setShowBalance(!showBalance)}
            className="text-slate-400 hover:text-white transition-colors"
          >
            {showBalance ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>

        <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
          {showBalance ? (
            <span className="flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl text-brand-400 font-bold">{wallet?.currency || 'INR'}</span>
              <span>₹{formattedBalance}</span>
            </span>
          ) : (
            <span className="tracking-widest">••••••••••</span>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-6 pt-6 border-t border-white/10">
        <button
          onClick={onAddMoney}
          className="flex items-center justify-center gap-2 py-3 px-3 rounded-2xl bg-brand-600 hover:bg-brand-500 font-semibold text-xs transition-all duration-200 shadow-md shadow-brand-600/30 active:scale-95"
        >
          <Plus className="w-4 h-4" /> Add Money
        </button>

        <button
          onClick={onSend}
          className="flex items-center justify-center gap-2 py-3 px-3 rounded-2xl bg-white/10 hover:bg-white/20 font-semibold text-xs backdrop-blur-sm border border-white/15 transition-all duration-200 active:scale-95"
        >
          <Send className="w-4 h-4 text-emerald-400" /> Send Money
        </button>

        <button
          onClick={onRequest}
          className="flex items-center justify-center gap-2 py-3 px-3 rounded-2xl bg-white/10 hover:bg-white/20 font-semibold text-xs backdrop-blur-sm border border-white/15 transition-all duration-200 active:scale-95"
        >
          <ArrowDownLeft className="w-4 h-4 text-amber-400" /> Request
        </button>

        <button
          onClick={onScan}
          className="flex items-center justify-center gap-2 py-3 px-3 rounded-2xl bg-white/10 hover:bg-white/20 font-semibold text-xs backdrop-blur-sm border border-white/15 transition-all duration-200 active:scale-95"
        >
          <ScanLine className="w-4 h-4 text-purple-400" /> Scan & Pay
        </button>
      </div>
    </div>
  );
}
