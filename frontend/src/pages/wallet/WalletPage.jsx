import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';
import AddMoneyModal from '../../components/wallet/AddMoneyModal';
import { 
  Wallet as WalletIcon, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ShieldCheck, 
  Clock, 
  FileSpreadsheet,
  CheckCircle2
} from 'lucide-react';

export default function WalletPage() {
  const { showSuccess, showError } = useToast();
  const [wallet, setWallet] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'CREDIT' | 'DEBIT'
  const [showAddMoney, setShowAddMoney] = useState(false);

  const fetchWallet = async () => {
    try {
      const [walletRes, ledgerRes] = await Promise.all([
        api.get('/api/wallet/'),
        api.get('/api/wallet/ledger/?page_size=30')
      ]);

      if (walletRes.data?.success) setWallet(walletRes.data.data);
      if (ledgerRes.data?.results) setLedger(ledgerRes.data.results);
    } catch (err) {
      showError("Failed to load wallet ledger data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, []);

  const filteredLedger = ledger.filter((entry) => {
    if (filterType === 'ALL') return true;
    return entry.entry_type === filterType;
  });

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Digital Wallet & Ledger
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Complete auditable double-entry record of all balances, credits, and debits.
          </p>
        </div>

        <button
          onClick={() => setShowAddMoney(true)}
          className="px-5 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-md shadow-brand-600/30 flex items-center justify-center gap-2 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" /> Top Up Balance
        </button>
      </div>

      {/* Wallet Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 text-white border border-indigo-900/50 shadow-xl">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Current Balance</span>
            <span className="font-mono text-[10px] bg-white/10 px-2 py-0.5 rounded-full">{wallet?.wallet_number || 'WAL-ACTIVE'}</span>
          </div>
          <div className="text-3xl font-black tracking-tight">
            ₹{parseFloat(wallet?.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-4 pt-3 border-t border-white/10 text-xs text-slate-300 flex justify-between">
            <span>Currency:</span>
            <span className="font-semibold text-emerald-400">{wallet?.currency || 'INR'} (Indian Rupee)</span>
          </div>
        </div>

        <div className="p-6 rounded-3xl glass-card border border-slate-200/80 dark:border-slate-800/80 flex flex-col justify-between">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Lifetime Inflow</div>
          <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 my-2">
            ₹{parseFloat(wallet?.total_credited || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-400">All credited additions and received transfers</p>
        </div>

        <div className="p-6 rounded-3xl glass-card border border-slate-200/80 dark:border-slate-800/80 flex flex-col justify-between">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Lifetime Outflow</div>
          <div className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 my-2">
            ₹{parseFloat(wallet?.total_debited || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-400">All debits, transfers, and settled requests</p>
        </div>
      </div>

      {/* Double-Entry Ledger Statement Table */}
      <div className="p-6 rounded-3xl glass-card border border-slate-200/80 dark:border-slate-800/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-brand-500" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Auditable Ledger Statement</h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Immutable financial ledger logs</p>
          </div>

          {/* Filter Pills */}
          <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl w-fit">
            {['ALL', 'CREDIT', 'DEBIT'].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`py-1.5 px-3.5 text-xs font-bold rounded-xl transition-all ${
                  filterType === type
                    ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {type === 'ALL' ? 'All Entries' : type === 'CREDIT' ? 'Credits (+)' : 'Debits (-)'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-slate-400">Loading ledger logs...</div>
        ) : filteredLedger.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">No ledger entries match this criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Date & Time</th>
                  <th className="py-3 px-3">Ref Category</th>
                  <th className="py-3 px-3">Reference ID</th>
                  <th className="py-3 px-3 text-right">Balance Before</th>
                  <th className="py-3 px-3 text-right">Amount</th>
                  <th className="py-3 px-3 text-right">Balance After</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {filteredLedger.map((row) => {
                  const isCredit = row.entry_type === 'CREDIT';
                  return (
                    <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isCredit ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                        }`}>
                          {isCredit ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                          {row.entry_type}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-slate-500 whitespace-nowrap">
                        {new Date(row.created_at).toLocaleString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </td>

                      <td className="py-3.5 px-3 text-slate-800 dark:text-slate-200">
                        {row.reference_type.replace('_', ' ')}
                      </td>

                      <td className="py-3.5 px-3 font-mono text-slate-500 dark:text-slate-400 text-[11px]">
                        {row.reference_id}
                      </td>

                      <td className="py-3.5 px-3 text-right text-slate-500 whitespace-nowrap">
                        ₹{parseFloat(row.balance_before).toFixed(2)}
                      </td>

                      <td className={`py-3.5 px-3 text-right font-extrabold whitespace-nowrap ${
                        isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}>
                        {isCredit ? '+' : '-'}₹{parseFloat(row.amount).toFixed(2)}
                      </td>

                      <td className="py-3.5 px-3 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        ₹{parseFloat(row.balance_after).toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddMoneyModal
        isOpen={showAddMoney}
        onClose={() => setShowAddMoney(false)}
        onSuccess={fetchWallet}
      />
    </div>
  );
}
