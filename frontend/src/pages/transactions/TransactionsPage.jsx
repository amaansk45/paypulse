import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';
import ReceiptModal from '../../components/payments/ReceiptModal';
import Modal from '../../components/common/Modal';
import { 
  History, 
  Search, 
  Filter, 
  FileText, 
  RotateCcw, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ChevronLeft, 
  ChevronRight,
  Loader2,
  Calendar
} from 'lucide-react';

export default function TransactionsPage() {
  const { showSuccess, showError } = useToast();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [refundTargetTxn, setRefundTargetTxn] = useState(null);
  const [refundReason, setRefundReason] = useState('');
  const [refundLoading, setRefundLoading] = useState(false);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: '15'
      });
      if (search.trim()) params.append('search', search.trim());
      if (typeFilter) params.append('type', typeFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const res = await api.get(`/api/transactions/?${params.toString()}`);
      if (res.data?.results) {
        setTransactions(res.data.results);
        setTotalCount(res.data.count || 0);
        setTotalPages(Math.ceil((res.data.count || 0) / 15) || 1);
      }
    } catch (err) {
      showError("Failed to fetch transactions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [page, typeFilter, statusFilter, startDate, endDate]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchTransactions();
  };

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

  const handleRequestRefund = async (e) => {
    e.preventDefault();
    if (!refundReason.trim()) {
      showError("Please describe why you are requesting a refund.");
      return;
    }

    setRefundLoading(true);
    try {
      const res = await api.post('/api/payments/refunds/', {
        transaction_id: refundTargetTxn.transaction_id,
        amount: refundTargetTxn.amount,
        reason: refundReason.trim()
      });

      if (res.data?.success) {
        showSuccess("Refund request submitted to administrators.");
        setRefundTargetTxn(null);
        setRefundReason('');
        fetchTransactions();
      }
    } catch (err) {
      showError(err.response?.data?.message || "Failed to submit refund request.");
    } finally {
      setRefundLoading(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Transaction Records
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Detailed history of all peer-to-peer transfers, QR settlements, top-ups, and refunds.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="p-4 sm:p-5 rounded-3xl glass-card border border-slate-200/80 dark:border-slate-800/80 space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by TXN ID, recipient, note, or reference..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
              className="px-3 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Types</option>
              <option value="SEND">Send Money</option>
              <option value="RECEIVE">Receive Money</option>
              <option value="ADD_MONEY">Top-Up</option>
              <option value="QR_PAYMENT">QR Payment</option>
              <option value="PAYMENT_REQUEST">Payment Request</option>
              <option value="REFUND">Refund</option>
            </select>

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
              className="px-4 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs transition-colors"
            >
              Search
            </button>
          </div>
        </form>
      </div>

      {/* Transactions Table */}
      <div className="p-6 rounded-3xl glass-card border border-slate-200/80 dark:border-slate-800/80">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
            Showing {transactions.length} of {totalCount} records
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-slate-400">Loading transactions...</div>
        ) : transactions.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">
            No transactions match the specified filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-3">Transaction</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Payment Method</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Amount</th>
                  <th className="py-3 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {transactions.map((t) => {
                  const isDebit = t.is_debit;
                  const counterparty = t.counterparty?.username || 'System';

                  return (
                    <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            isDebit ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'
                          }`}>
                            {isDebit ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 dark:text-slate-200">
                              {t.transaction_type.replace('_', ' ')}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              TXN: {t.transaction_id}
                            </div>
                            {t.description && (
                              <div className="text-[10px] text-slate-500 italic truncate max-w-[180px]">
                                "{t.description}"
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-slate-500 whitespace-nowrap">
                        {new Date(t.created_at).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>

                      <td className="py-3.5 px-3 text-slate-700 dark:text-slate-300">
                        {t.payment_method}
                      </td>

                      <td className="py-3.5 px-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          t.status === 'SUCCESS'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            : t.status === 'PENDING'
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                            : t.status === 'REFUNDED'
                            ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400'
                            : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                        }`}>
                          {t.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-right font-extrabold whitespace-nowrap text-sm">
                        <span className={isDebit ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}>
                          {isDebit ? '-' : '+'}₹{parseFloat(t.amount).toFixed(2)}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenReceipt(t.transaction_id)}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="View Official Receipt"
                          >
                            <FileText className="w-4 h-4" />
                          </button>

                          {/* Allow requesting refund on completed debit or add money transactions */}
                          {t.status === 'SUCCESS' && (isDebit || t.transaction_type === 'ADD_MONEY') && (
                            <button
                              onClick={() => setRefundTargetTxn(t)}
                              className="p-1.5 rounded-xl text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="Request Refund"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-6 border-t border-slate-200/80 dark:border-slate-800 text-xs">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="py-1.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 disabled:opacity-40 flex items-center gap-1 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <span className="font-semibold text-slate-500">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="py-1.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 disabled:opacity-40 flex items-center gap-1 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={!!selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
        receipt={selectedReceipt}
      />

      {/* Refund Request Modal */}
      <Modal
        isOpen={!!refundTargetTxn}
        onClose={() => setRefundTargetTxn(null)}
        title="Request Refund"
      >
        {refundTargetTxn && (
          <form onSubmit={handleRequestRefund} className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Transaction ID:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{refundTargetTxn.transaction_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount to Refund:</span>
                <span className="font-bold text-emerald-500">₹{parseFloat(refundTargetTxn.amount).toFixed(2)}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Reason for Refund
              </label>
              <textarea
                required
                rows={3}
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Explain the reason for requesting a refund..."
                className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRefundTargetTxn(null)}
                className="py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={refundLoading}
                className="flex-1 py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {refundLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Refund Request"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
