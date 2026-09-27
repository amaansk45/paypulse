import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api from '../../api/client';
import BalanceCard from '../../components/wallet/BalanceCard';
import AddMoneyModal from '../../components/wallet/AddMoneyModal';
import SendMoneyModal from '../../components/payments/SendMoneyModal';
import RequestMoneyModal from '../../components/payments/RequestMoneyModal';
import QRScannerModal from '../../components/qr/QRScannerModal';
import ReceiptModal from '../../components/payments/ReceiptModal';
import { CardSkeleton, TableRowSkeleton } from '../../components/common/SkeletonLoader';
import { 
  TrendingUp, 
  TrendingDown, 
  ShieldCheck, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  FileText,
  ChevronRight,
  Send,
  Plus
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { user, refreshUser } = useAuth();
  const { showSuccess, showError } = useToast();

  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [showSendMoney, setShowSendMoney] = useState(false);
  const [showRequestMoney, setShowRequestMoney] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [prefillRecipient, setPrefillRecipient] = useState('');

  const fetchDashboardData = async () => {
    try {
      const [walletRes, txnsRes, requestsRes] = await Promise.all([
        api.get('/api/wallet/'),
        api.get('/api/transactions/?page_size=6'),
        api.get('/api/payments/request/?tab=incoming&status=PENDING')
      ]);

      if (walletRes.data?.success) setWallet(walletRes.data.data);
      if (txnsRes.data?.results) setTransactions(txnsRes.data.results);
      if (requestsRes.data?.results) setPendingRequests(requestsRes.data.results);
      refreshUser();
    } catch (err) {
      console.error("Dashboard data fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleAcceptRequest = async (requestId) => {
    try {
      const res = await api.post(`/api/payments/request/${requestId}/accept/`);
      if (res.data?.success) {
        showSuccess("Payment request accepted and settled!");
        fetchDashboardData();
      }
    } catch (err) {
      showError(err.response?.data?.message || "Failed to accept request.");
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      const res = await api.post(`/api/payments/request/${requestId}/reject/`);
      if (res.data?.success) {
        showSuccess("Payment request rejected.");
        setPendingRequests((prev) => prev.filter((r) => r.request_id !== requestId));
      }
    } catch (err) {
      showError(err.response?.data?.message || "Failed to reject request.");
    }
  };

  const handleViewReceipt = async (txnId) => {
    try {
      const res = await api.get(`/api/transactions/${txnId}/receipt/`);
      if (res.data?.success) {
        setSelectedReceipt(res.data.data);
      }
    } catch (err) {
      showError("Failed to load transaction receipt.");
    }
  };

  const openSendToRecipient = (username) => {
    setPrefillRecipient(username);
    setShowSendMoney(true);
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Welcome Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Hi, {user?.profile?.full_name || user?.username || 'Member'} 👋
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Here is your financial overview and digital wallet activity today.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowScanner(true)}
            className="px-4 py-2.5 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs shadow-md hover:opacity-90 transition-all flex items-center gap-2 active:scale-95"
          >
            Scan & Pay
          </button>
          <button
            onClick={() => {
              setPrefillRecipient('');
              setShowSendMoney(true);
            }}
            className="px-4 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-md shadow-brand-600/30 transition-all flex items-center gap-2 active:scale-95"
          >
            <Send className="w-3.5 h-3.5" /> Transfer
          </button>
        </div>
      </div>

      {/* Main Wallet Balance Card */}
      {loading ? (
        <CardSkeleton />
      ) : (
        <BalanceCard
          wallet={wallet}
          onAddMoney={() => setShowAddMoney(true)}
          onSend={() => {
            setPrefillRecipient('');
            setShowSendMoney(true);
          }}
          onRequest={() => setShowRequestMoney(true)}
          onScan={() => setShowScanner(true)}
        />
      )}

      {/* Financial Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl glass-card border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Monthly Inflow</span>
            <div className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
              ₹{parseFloat(wallet?.metrics?.monthly_income || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-slate-400">Total received & deposited</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-3xl glass-card border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Monthly Outflow</span>
            <div className="text-xl sm:text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">
              ₹{parseFloat(wallet?.metrics?.monthly_spent || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-slate-400">Total transfers & payments</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-3xl glass-card border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Daily Spending Limit</span>
            <div className="text-xl sm:text-2xl font-extrabold text-brand-600 dark:text-brand-400 mt-1">
              ₹{parseFloat(wallet?.metrics?.available_daily_limit || 50000).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
            </div>
            <span className="text-[11px] text-slate-400">Remaining today</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-500 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Pending Payment Requests Action Bar */}
      {pendingRequests.length > 0 && (
        <div className="p-5 rounded-3xl bg-amber-500/10 border border-amber-500/25 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
              <h3 className="font-bold text-sm text-amber-900 dark:text-amber-200">
                Action Required: {pendingRequests.length} Pending Payment Request(s)
              </h3>
            </div>
            <Link to="/requests" className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline">
              View All →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingRequests.slice(0, 2).map((req) => (
              <div
                key={req.id}
                className="p-3.5 rounded-2xl bg-white dark:bg-slate-900/90 border border-amber-300/40 dark:border-amber-700/40 flex items-center justify-between shadow-sm"
              >
                <div>
                  <p className="text-xs text-slate-500">From <span className="font-bold text-slate-800 dark:text-slate-200">@{req.requester.username}</span></p>
                  <p className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">₹{parseFloat(req.amount).toFixed(2)}</p>
                  {req.note && <p className="text-[11px] text-slate-400 italic mt-0.5">"{req.note}"</p>}
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleRejectRequest(req.request_id)}
                    className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    title="Reject Request"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleAcceptRequest(req.request_id)}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 transition-all flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Pay
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Pay Contacts */}
      <div className="p-5 rounded-3xl glass-card border border-slate-200/80 dark:border-slate-800/80">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Quick Send</h3>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {['priya', 'rahul', 'vikram'].filter(u => u !== user?.username).map((username) => (
            <button
              key={username}
              onClick={() => openSendToRecipient(username)}
              className="flex items-center gap-2.5 py-2 px-3.5 rounded-2xl bg-slate-100 dark:bg-slate-900 hover:bg-brand-50 dark:hover:bg-brand-950/40 border border-slate-200 dark:border-slate-800 transition-all group flex-shrink-0"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-500 text-white font-bold text-xs flex items-center justify-center">
                {username.substring(0, 2).toUpperCase()}
              </div>
              <span className="text-xs font-semibold group-hover:text-brand-600 dark:group-hover:text-brand-400 capitalize">
                {username}
              </span>
            </button>
          ))}
          <button
            onClick={() => {
              setPrefillRecipient('');
              setShowSendMoney(true);
            }}
            className="flex items-center gap-1.5 py-2 px-3.5 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs font-semibold hover:border-brand-500 hover:text-brand-600 transition-all flex-shrink-0"
          >
            <Plus className="w-4 h-4" /> Other Contact
          </button>
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="p-6 rounded-3xl glass-card border border-slate-200/80 dark:border-slate-800/80">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Recent Transactions</h3>
            <p className="text-xs text-slate-400">Live auditable ledger recordings</p>
          </div>
          <Link
            to="/transactions"
            className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
          >
            View All <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="py-8 text-center text-sm text-slate-400">Loading ledger activities...</div>
        ) : transactions.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">
            No transactions yet. Add money or send funds to get started!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-2">Type / Counterparty</th>
                  <th className="py-3 px-2">Date</th>
                  <th className="py-3 px-2">Method</th>
                  <th className="py-3 px-2">Status</th>
                  <th className="py-3 px-2 text-right">Amount</th>
                  <th className="py-3 px-2 text-center">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {transactions.map((t) => {
                  const isDebit = t.is_debit;
                  const counterpartyName = t.counterparty?.username || 'External';

                  return (
                    <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-2">
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
                            <div className="text-[11px] text-slate-400">
                              {isDebit ? `To: @${counterpartyName}` : `From: @${counterpartyName}`}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-2 text-slate-500 whitespace-nowrap">
                        {new Date(t.created_at).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>

                      <td className="py-3.5 px-2 font-medium text-slate-600 dark:text-slate-300">
                        {t.payment_method}
                      </td>

                      <td className="py-3.5 px-2">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          t.status === 'SUCCESS'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            : t.status === 'PENDING'
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                            : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                        }`}>
                          {t.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-2 text-right font-extrabold whitespace-nowrap text-sm">
                        <span className={isDebit ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}>
                          {isDebit ? '-' : '+'}₹{parseFloat(t.amount).toFixed(2)}
                        </span>
                      </td>

                      <td className="py-3.5 px-2 text-center">
                        <button
                          onClick={() => handleViewReceipt(t.transaction_id)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="View Official Receipt"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals Container */}
      <AddMoneyModal
        isOpen={showAddMoney}
        onClose={() => setShowAddMoney(false)}
        onSuccess={fetchDashboardData}
      />

      <SendMoneyModal
        isOpen={showSendMoney}
        onClose={() => setShowSendMoney(false)}
        onSuccess={fetchDashboardData}
        initialRecipient={prefillRecipient}
      />

      <RequestMoneyModal
        isOpen={showRequestMoney}
        onClose={() => setShowRequestMoney(false)}
        onSuccess={fetchDashboardData}
      />

      <QRScannerModal
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onSuccess={fetchDashboardData}
      />

      <ReceiptModal
        isOpen={!!selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
        receipt={selectedReceipt}
      />
    </div>
  );
}
