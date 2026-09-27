import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';
import ReceiptModal from '../../components/payments/ReceiptModal';
import { 
  CreditCard, 
  Search, 
  FileText, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ChevronLeft, 
  ChevronRight 
} from 'lucide-react';

export default function AdminTransactions() {
  const { showError } = useToast();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString() });
      if (search.trim()) params.append('search', search.trim());
      if (statusFilter) params.append('status', statusFilter);

      const res = await api.get(`/api/admin/transactions/?${params.toString()}`);
      if (res.data?.results) {
        setTransactions(res.data.results);
        setTotalPages(Math.ceil((res.data.count || 0) / 20) || 1);
      }
    } catch (err) {
      showError("Failed to fetch global transactions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [page, statusFilter]);

  const handleOpenReceipt = async (txnId) => {
    try {
      const res = await api.get(`/api/transactions/${txnId}/receipt/`);
      if (res.data?.success) {
        setSelectedReceipt(res.data.data);
      }
    } catch (err) {
      showError("Failed to load receipt.");
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Global System Transactions
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Complete network audit trail of all peer-to-peer and gateway transaction events.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="p-4 sm:p-5 rounded-3xl glass-card border border-slate-200/80 dark:border-slate-800/80">
        <form onSubmit={(e) => { e.preventDefault(); setPage(1); fetchTransactions(); }} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by TXN ID, sender, or receiver..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-3 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Statuses</option>
              <option value="SUCCESS">Success</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
              <option value="REFUNDED">Refunded</option>
            </select>

            <button
              type="submit"
              className="px-4 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs"
            >
              Filter
            </button>
          </div>
        </form>
      </div>

      {/* Transactions Table */}
      <div className="p-6 rounded-3xl glass-card border border-slate-200/80 dark:border-slate-800/80">
        {loading ? (
          <div className="py-12 text-center text-sm text-slate-400">Loading system transactions...</div>
        ) : transactions.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">No transactions recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-3">TXN ID</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Sender</th>
                  <th className="py-3 px-3">Receiver</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Amount</th>
                  <th className="py-3 px-3 text-center">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-3 font-mono font-bold text-slate-900 dark:text-white">
                      {t.transaction_id}
                    </td>

                    <td className="py-3.5 px-3 text-slate-500 whitespace-nowrap">
                      {new Date(t.created_at).toLocaleString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>

                    <td className="py-3.5 px-3 text-slate-700 dark:text-slate-300">
                      {t.sender ? `@${t.sender.username}` : "Top-up Gateway"}
                    </td>

                    <td className="py-3.5 px-3 text-slate-700 dark:text-slate-300">
                      {t.receiver ? `@${t.receiver.username}` : "Withdrawal Gateway"}
                    </td>

                    <td className="py-3.5 px-3 text-slate-600 dark:text-slate-300">
                      {t.transaction_type}
                    </td>

                    <td className="py-3.5 px-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        t.status === 'SUCCESS' ? 'bg-emerald-500/15 text-emerald-500' : 'bg-amber-500/15 text-amber-500'
                      }`}>
                        {t.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 text-right font-extrabold text-slate-900 dark:text-white">
                      ₹{parseFloat(t.amount).toFixed(2)}
                    </td>

                    <td className="py-3.5 px-3 text-center">
                      <button
                        onClick={() => handleOpenReceipt(t.transaction_id)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="View Receipt"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-6 border-t border-slate-200/80 dark:border-slate-800 text-xs">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="py-1.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="font-semibold text-slate-500">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="py-1.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>

      <ReceiptModal
        isOpen={!!selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
        receipt={selectedReceipt}
      />
    </div>
  );
}
