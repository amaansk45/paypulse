import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/common/Modal';
import { RotateCcw, Check, X, Loader2, ShieldAlert } from 'lucide-react';

export default function AdminRefunds() {
  const { showSuccess, showError } = useToast();
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [activeRefund, setActiveRefund] = useState(null);
  const [actionType, setActionType] = useState('APPROVE');
  const [adminNotes, setAdminNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchRefunds = async () => {
    setLoading(true);
    try {
      const url = statusFilter ? `/api/admin/refunds/?status=${statusFilter}` : '/api/admin/refunds/';
      const res = await api.get(url);
      if (res.data?.results) {
        setRefunds(res.data.results);
      }
    } catch (err) {
      showError("Failed to fetch refund queue.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRefunds();
  }, [statusFilter]);

  const handleOpenActionModal = (refund, action) => {
    setActiveRefund(refund);
    setActionType(action);
    setAdminNotes(action === 'APPROVE' ? 'Approved based on financial review.' : 'Disputed transfer policy.');
  };

  const handleProcessRefund = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await api.post(`/api/admin/refunds/${activeRefund.refund_id}/action/`, {
        action: actionType,
        admin_notes: adminNotes.trim()
      });

      if (res.data?.success) {
        showSuccess(`Refund ${activeRefund.refund_id} successfully ${actionType.toLowerCase()}d!`);
        setActiveRefund(null);
        fetchRefunds();
      }
    } catch (err) {
      showError(err.response?.data?.message || "Failed to process refund.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Refund Management Queue
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Review user refund requests, verify ledger balances, and execute compensating transfers.
          </p>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All Statuses</option>
          <option value="REQUESTED">Pending Review</option>
          <option value="APPROVED">Approved & Processed</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      <div className="p-6 rounded-3xl glass-card border border-slate-200/80 dark:border-slate-800/80">
        {loading ? (
          <div className="py-12 text-center text-sm text-slate-400">Loading refund queue...</div>
        ) : refunds.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">No refund requests in this view.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-3">Refund ID</th>
                  <th className="py-3 px-3">Requester</th>
                  <th className="py-3 px-3">Original TXN</th>
                  <th className="py-3 px-3">Reason</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Amount</th>
                  <th className="py-3 px-3 text-center">Review Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {refunds.map((rfd) => {
                  const isPending = rfd.status === 'REQUESTED' || rfd.status === 'UNDER_REVIEW';
                  return (
                    <tr key={rfd.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-3 font-mono font-bold text-slate-900 dark:text-white">
                        {rfd.refund_id}
                      </td>

                      <td className="py-3.5 px-3 text-slate-700 dark:text-slate-300">
                        @{rfd.requester?.username}
                      </td>

                      <td className="py-3.5 px-3 font-mono text-[11px] text-slate-500">
                        {rfd.transaction?.transaction_id}
                      </td>

                      <td className="py-3.5 px-3 text-slate-600 dark:text-slate-300 italic max-w-xs truncate">
                        "{rfd.reason}"
                      </td>

                      <td className="py-3.5 px-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          rfd.status === 'APPROVED'
                            ? 'bg-emerald-500/15 text-emerald-500'
                            : rfd.status === 'REJECTED'
                            ? 'bg-rose-500/15 text-rose-500'
                            : 'bg-amber-500/15 text-amber-500'
                        }`}>
                          {rfd.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-right font-extrabold text-slate-900 dark:text-white">
                        ₹{parseFloat(rfd.amount).toFixed(2)}
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        {isPending ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenActionModal(rfd, 'APPROVE')}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow-sm"
                            >
                              <Check className="w-3.5 h-3.5" /> Approve
                            </button>
                            <button
                              onClick={() => handleOpenActionModal(rfd, 'REJECT')}
                              className="px-3 py-1.5 rounded-xl border border-rose-300 dark:border-rose-800 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-bold text-xs flex items-center gap-1"
                            >
                              <X className="w-3.5 h-3.5" /> Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">Processed</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Approve/Reject Modal */}
      <Modal
        isOpen={!!activeRefund}
        onClose={() => setActiveRefund(null)}
        title={`${actionType === 'APPROVE' ? 'Approve' : 'Reject'} Refund (${activeRefund?.refund_id})`}
      >
        {activeRefund && (
          <form onSubmit={handleProcessRefund} className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Requester:</span>
                <span className="font-bold text-slate-900 dark:text-white">@{activeRefund.requester?.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount:</span>
                <span className="font-extrabold text-emerald-500 text-sm">₹{parseFloat(activeRefund.amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Reason:</span>
                <span className="italic text-slate-700 dark:text-slate-300">"{activeRefund.reason}"</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Admin Audit Notes
              </label>
              <textarea
                required
                rows={3}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Reason or ledger reference note..."
                className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveRefund(null)}
                className="py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className={`flex-1 py-2.5 px-4 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-2 ${
                  actionType === 'APPROVE' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : actionType === 'APPROVE' ? "Confirm & Settle Refund" : "Confirm Rejection"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
