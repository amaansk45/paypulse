import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { 
  Users, 
  TrendingUp, 
  RotateCcw, 
  ShieldCheck, 
  CreditCard, 
  CheckCircle2, 
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  History
} from 'lucide-react';

export default function AdminDashboard() {
  const { showError } = useToast();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/admin/stats/')
      .then((res) => {
        if (res.data?.success) {
          setStats(res.data.data);
        }
      })
      .catch((err) => {
        showError("Failed to fetch admin metrics.");
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-400 font-bold text-xs">
              ADMIN CONTROL PANEL
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1">
            PayPulse System Operations
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time analytics, financial flow oversight, and platform security management.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/admin/users"
            className="px-4 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-md shadow-brand-600/30 transition-all"
          >
            Manage Users
          </Link>
          <Link
            to="/admin/refunds"
            className="px-4 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md shadow-amber-600/30 transition-all flex items-center gap-1.5"
          >
            Refund Queue
            {stats?.refunds?.pending_count > 0 && (
              <span className="w-5 h-5 rounded-full bg-white text-amber-700 text-[10px] font-extrabold flex items-center justify-center">
                {stats.refunds.pending_count}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl glass-card border border-slate-200/80 dark:border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Registered Users</span>
            <Users className="w-5 h-5 text-brand-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white my-2">
            {stats?.users?.total || 0}
          </div>
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span className="text-emerald-500 font-semibold">{stats?.users?.active || 0} active</span>
            <span>•</span>
            <span className="text-purple-400 font-semibold">{stats?.users?.verified || 0} verified</span>
          </div>
        </div>

        <div className="p-5 rounded-3xl glass-card border border-slate-200/80 dark:border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">System Balance</span>
            <CreditCard className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 my-2">
            ₹{parseFloat(stats?.wallets?.total_system_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
          </div>
          <p className="text-xs text-slate-400">Total liquid balance across all wallets</p>
        </div>

        <div className="p-5 rounded-3xl glass-card border border-slate-200/80 dark:border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Volume</span>
            <TrendingUp className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white my-2">
            ₹{parseFloat(stats?.transactions?.total_volume || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
          </div>
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span className="text-emerald-500 font-semibold">{stats?.transactions?.successful || 0} settled</span>
            <span>•</span>
            <span className="text-rose-400">{stats?.transactions?.failed || 0} failed</span>
          </div>
        </div>

        <div className="p-5 rounded-3xl glass-card border border-slate-200/80 dark:border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Refunds</span>
            <RotateCcw className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-3xl font-extrabold text-amber-500 my-2">
            {stats?.refunds?.pending_count || 0}
          </div>
          <Link to="/admin/refunds" className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-semibold flex items-center gap-1">
            Review requests <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* 7-Day Cashflow Chart */}
      <div className="p-6 rounded-3xl glass-card border border-slate-200/80 dark:border-slate-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Daily Settled Transaction Volume (7 Days)</h3>
            <p className="text-xs text-slate-400">Total volume processed through the PayPulse network</p>
          </div>
        </div>

        <div className="pt-6 pb-2">
          <div className="h-48 flex items-end gap-3 sm:gap-6 justify-between border-b border-slate-200 dark:border-slate-800 px-2 sm:px-6">
            {stats?.daily_chart?.map((d, idx) => {
              const maxVol = Math.max(...(stats.daily_chart.map((c) => c.volume) || [1]), 1000);
              const heightPct = Math.max(10, Math.round((d.volume / maxVol) * 100));

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                  <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    ₹{d.volume}
                  </span>
                  <div
                    style={{ height: `${heightPct}%` }}
                    className="w-full max-w-[36px] bg-gradient-to-t from-brand-600 to-indigo-500 rounded-t-xl transition-all duration-500 group-hover:brightness-125 shadow-glow"
                  />
                  <span className="text-[11px] font-semibold text-slate-400 mt-1 whitespace-nowrap">
                    {d.date}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to="/admin/users"
          className="p-5 rounded-3xl glass-card border border-slate-200/80 dark:border-slate-800/80 hover:border-brand-500/50 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-500/10 text-brand-500 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">User Accounts</h4>
              <p className="text-xs text-slate-400">View, suspend, or verify KYC</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
        </Link>

        <Link
          to="/admin/transactions"
          className="p-5 rounded-3xl glass-card border border-slate-200/80 dark:border-slate-800/80 hover:border-brand-500/50 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">All Transactions</h4>
              <p className="text-xs text-slate-400">Global audit of all payments</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
        </Link>

        <Link
          to="/admin/audit-logs"
          className="p-5 rounded-3xl glass-card border border-slate-200/80 dark:border-slate-800/80 hover:border-brand-500/50 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">System Audit Logs</h4>
              <p className="text-xs text-slate-400">Security trails, logins & events</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </div>
  );
}
