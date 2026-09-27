import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import RequestMoneyModal from '../../components/payments/RequestMoneyModal';
import PaymentStatusModal from '../../components/payments/PaymentStatusModal';
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Check, 
  X, 
  Loader2
} from 'lucide-react';

export default function RequestsPage() {
  const { showSuccess, showError } = useToast();
  const { refreshUser } = useAuth();
  const [tab, setTab] = useState('incoming'); // 'incoming' | 'outgoing'
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

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

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/payments/request/?tab=${tab}`);
      if (res.data?.results) {
        setRequests(res.data.results);
      }
    } catch (err) {
      showError("Failed to fetch payment requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [tab]);

  const handleAccept = async (reqItem) => {
    setActionLoading(reqItem.request_id);
    const amount = parseFloat(reqItem.amount).toFixed(2);
    const requester = reqItem.requester?.username || 'User';

    try {
      const res = await api.post(`/api/payments/request/${reqItem.request_id}/accept/`);
      if (res.data?.success) {
        showSuccess(`Paid ₹${amount} to @${requester}!`);
        if (refreshUser) refreshUser();
        fetchRequests();

        // Show Success Right Tick Modal with Voice Announcement!
        setStatusModal({
          isOpen: true,
          status: 'success',
          amount: amount,
          recipient: requester,
          note: reqItem.note || 'Settled Payment Request',
          transactionId: res.data.data?.transaction_id || '',
          errorMessage: '',
        });
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to accept request.";
      showError(msg);

      // Show Failed Wrong Tick Modal (NO VOICE!)
      setStatusModal({
        isOpen: true,
        status: 'failed',
        amount: amount,
        recipient: requester,
        note: '',
        transactionId: '',
        errorMessage: msg,
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (requestId) => {
    setActionLoading(requestId);
    try {
      const res = await api.post(`/api/payments/request/${requestId}/reject/`);
      if (res.data?.success) {
        showSuccess("Request declined.");
        fetchRequests();
      }
    } catch (err) {
      showError(err.response?.data?.message || "Failed to decline request.");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Payment Requests
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage incoming money requests from friends and track requests you've sent.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-5 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-md shadow-brand-600/30 flex items-center justify-center gap-2 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" /> Request Money
        </button>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl w-fit">
        <button
          onClick={() => setTab('incoming')}
          className={`py-2 px-5 text-xs font-bold rounded-xl transition-all ${
            tab === 'incoming'
              ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Incoming Requests
        </button>
        <button
          onClick={() => setTab('outgoing')}
          className={`py-2 px-5 text-xs font-bold rounded-xl transition-all ${
            tab === 'outgoing'
              ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Outgoing Requests
        </button>
      </div>

      {/* List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-400 glass-card rounded-3xl">Loading requests...</div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-400 glass-card rounded-3xl border border-slate-200/80 dark:border-slate-800/80">
            No {tab} payment requests found.
          </div>
        ) : (
          requests.map((req) => {
            const isIncoming = tab === 'incoming';
            const counterparty = isIncoming ? req.requester : req.payer;
            const isPending = req.status === 'PENDING';

            return (
              <div
                key={req.id}
                className="p-5 rounded-3xl glass-card border border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:shadow-md"
              >
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm ${
                    isIncoming ? 'bg-amber-500/10 text-amber-600' : 'bg-brand-500/10 text-brand-600'
                  }`}>
                    {counterparty?.username ? counterparty.username.substring(0, 2).toUpperCase() : 'U'}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        {isIncoming ? `Request from @${counterparty.username}` : `Request to @${counterparty.username}`}
                      </h4>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        req.status === 'ACCEPTED'
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : req.status === 'PENDING'
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                          : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                      }`}>
                        {req.status}
                      </span>
                    </div>

                    <div className="text-xs text-slate-400 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span>ID: {req.request_id}</span>
                      <span>•</span>
                      <span>Created: {new Date(req.created_at).toLocaleDateString()}</span>
                    </div>

                    {req.note && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 italic mt-1 bg-slate-100 dark:bg-slate-900/60 py-1 px-2.5 rounded-lg w-fit">
                        "{req.note}"
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 pt-3 sm:pt-0 border-t sm:border-0 border-slate-100 dark:border-slate-800">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Requested Amount</span>
                    <span className="text-xl font-extrabold text-slate-900 dark:text-white">
                      ₹{parseFloat(req.amount).toFixed(2)}
                    </span>
                  </div>

                  {isIncoming && isPending && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleReject(req.request_id)}
                        disabled={actionLoading === req.request_id}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="Decline"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleAccept(req)}
                        disabled={actionLoading === req.request_id}
                        className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 flex items-center gap-1.5 transition-all"
                      >
                        {actionLoading === req.request_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        Pay Now
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <RequestMoneyModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={fetchRequests}
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
      />
    </div>
  );
}
