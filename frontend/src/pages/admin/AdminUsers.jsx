import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/common/Modal';
import { 
  Users, 
  Search, 
  ShieldCheck, 
  UserX, 
  UserCheck, 
  Eye, 
  ChevronLeft, 
  ChevronRight,
  Loader2,
  FileSpreadsheet
} from 'lucide-react';

export default function AdminUsers() {
  const { showSuccess, showError } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Selected user inspect modal
  const [inspectUser, setInspectUser] = useState(null);
  const [inspectLoading, setInspectLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString() });
      if (search.trim()) params.append('search', search.trim());
      if (statusFilter) params.append('status', statusFilter);

      const res = await api.get(`/api/admin/users/?${params.toString()}`);
      if (res.data?.results) {
        setUsers(res.data.results);
        setTotalPages(Math.ceil((res.data.count || 0) / 20) || 1);
      }
    } catch (err) {
      showError("Failed to fetch user list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleUpdateStatus = async (userId, action) => {
    try {
      const res = await api.patch(`/api/admin/users/${userId}/status/`, {
        action,
        reason: `Admin requested status change to ${action}`
      });
      if (res.data?.success) {
        showSuccess(res.data.message);
        fetchUsers();
        if (inspectUser) {
          handleInspectUser(userId);
        }
      }
    } catch (err) {
      showError(err.response?.data?.message || "Failed to update user status.");
    }
  };

  const handleInspectUser = async (userId) => {
    setInspectLoading(true);
    try {
      const res = await api.get(`/api/admin/users/${userId}/`);
      if (res.data?.success) {
        setInspectUser(res.data.data);
      }
    } catch (err) {
      showError("Failed to load user details.");
    } finally {
      setInspectLoading(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          User Account Management
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Review registered accounts, KYC submissions, suspend access, and audit individual balances.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="p-4 sm:p-5 rounded-3xl glass-card border border-slate-200/80 dark:border-slate-800/80">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by username, email, phone, or name..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-3 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Account Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="BLOCKED">Blocked</option>
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

      {/* Users Table */}
      <div className="p-6 rounded-3xl glass-card border border-slate-200/80 dark:border-slate-800/80">
        {loading ? (
          <div className="py-12 text-center text-sm text-slate-400">Loading accounts...</div>
        ) : users.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">No users match your criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-3">User</th>
                  <th className="py-3 px-3">Phone</th>
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">KYC</th>
                  <th className="py-3 px-3 text-right">Balance</th>
                  <th className="py-3 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {u.profile?.full_name || u.username}
                      </div>
                      <div className="text-[11px] text-slate-400">@{u.username} • {u.email}</div>
                    </td>

                    <td className="py-3.5 px-3 text-slate-500">
                      {u.phone_number || "—"}
                    </td>

                    <td className="py-3.5 px-3">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        u.role === 'ADMIN' ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                      }`}>
                        {u.role}
                      </span>
                    </td>

                    <td className="py-3.5 px-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        u.account_status === 'ACTIVE'
                          ? 'bg-emerald-500/15 text-emerald-500'
                          : 'bg-rose-500/15 text-rose-500'
                      }`}>
                        {u.account_status}
                      </span>
                    </td>

                    <td className="py-3.5 px-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        u.profile?.kyc_status === 'VERIFIED'
                          ? 'bg-emerald-500/15 text-emerald-500'
                          : u.profile?.kyc_status === 'PENDING'
                          ? 'bg-amber-500/15 text-amber-500'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                      }`}>
                        {u.profile?.kyc_status || 'UNVERIFIED'}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 text-right font-extrabold text-slate-900 dark:text-white">
                      ₹{parseFloat(u.wallet_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    <td className="py-3.5 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleInspectUser(u.id)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Inspect User & Ledger"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {u.account_status === 'ACTIVE' ? (
                          <button
                            onClick={() => handleUpdateStatus(u.id, 'SUSPEND')}
                            className="p-1.5 rounded-xl text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                            title="Suspend Account"
                          >
                            <UserX className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUpdateStatus(u.id, 'ACTIVATE')}
                            className="p-1.5 rounded-xl text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                            title="Reactivate Account"
                          >
                            <UserCheck className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
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

      {/* Inspect User Modal */}
      <Modal
        isOpen={!!inspectUser}
        onClose={() => setInspectUser(null)}
        title={`User Account: @${inspectUser?.user?.username || ''}`}
        maxWidth="max-w-2xl"
      >
        {inspectUser && (
          <div className="space-y-5 text-xs">
            {/* User Overview Box */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-3">
              <div>
                <span className="text-slate-400">Full Name:</span>
                <p className="font-bold text-slate-900 dark:text-white">{inspectUser.user.profile?.full_name || inspectUser.user.username}</p>
              </div>
              <div>
                <span className="text-slate-400">Email:</span>
                <p className="font-bold text-slate-900 dark:text-white">{inspectUser.user.email}</p>
              </div>
              <div>
                <span className="text-slate-400">Wallet Number:</span>
                <p className="font-mono font-bold text-brand-600 dark:text-brand-400">{inspectUser.user.wallet_number}</p>
              </div>
              <div>
                <span className="text-slate-400">Wallet Balance:</span>
                <p className="font-extrabold text-emerald-500 text-sm">₹{parseFloat(inspectUser.user.wallet_balance).toFixed(2)}</p>
              </div>
            </div>

            {/* KYC Details & Verification Action */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 dark:text-slate-200">KYC Status:</span>
                <span className="font-extrabold text-purple-400">{inspectUser.user.profile?.kyc_status}</span>
              </div>
              <p className="text-slate-400">
                Document: {inspectUser.user.profile?.kyc_document_type || 'None'} ({inspectUser.user.profile?.kyc_document_number || 'N/A'})
              </p>
              {inspectUser.user.profile?.kyc_status === 'PENDING' && (
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => handleUpdateStatus(inspectUser.user.id, 'VERIFY_KYC')}
                    className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                  >
                    Approve KYC
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(inspectUser.user.id, 'REJECT_KYC')}
                    className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold"
                  >
                    Reject KYC
                  </button>
                </div>
              )}
            </div>

            {/* Recent Ledger Entries */}
            <div>
              <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2">Recent Ledger Records</h4>
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {inspectUser.recent_ledger?.length === 0 ? (
                  <p className="text-slate-400">No ledger entries.</p>
                ) : (
                  inspectUser.recent_ledger.map((entry) => (
                    <div key={entry.id} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 flex justify-between font-mono text-[11px]">
                      <span>{entry.reference_type}</span>
                      <span className={entry.entry_type === 'CREDIT' ? 'text-emerald-500' : 'text-rose-500'}>
                        {entry.entry_type === 'CREDIT' ? '+' : '-'}₹{entry.amount} (Bal: ₹{entry.balance_after})
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
