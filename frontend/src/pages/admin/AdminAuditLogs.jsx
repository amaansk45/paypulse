import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { History, Search, ShieldCheck, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';

export default function AdminAuditLogs() {
  const { showError } = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString() });
      if (search.trim()) params.append('search', search.trim());
      if (statusFilter) params.append('status', statusFilter);

      const res = await api.get(`/api/admin/audit-logs/?${params.toString()}`);
      if (res.data?.results) {
        setLogs(res.data.results);
        setTotalPages(Math.ceil((res.data.count || 0) / 20) || 1);
      }
    } catch (err) {
      showError("Failed to fetch audit logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, statusFilter]);

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          System Security & Audit Trails
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Immutable event stream capturing all authentications, financial actions, and administrative operations.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="p-4 sm:p-5 rounded-3xl glass-card border border-slate-200/80 dark:border-slate-800/80">
        <form onSubmit={(e) => { e.preventDefault(); setPage(1); fetchLogs(); }} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by action, username, or reference ID..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-3 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Event Statuses</option>
              <option value="SUCCESS">Success</option>
              <option value="FAILURE">Failure</option>
              <option value="WARNING">Warning</option>
            </select>

            <button
              type="submit"
              className="px-4 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs"
            >
              Search
            </button>
          </div>
        </form>
      </div>

      {/* Audit Logs Table */}
      <div className="p-6 rounded-3xl glass-card border border-slate-200/80 dark:border-slate-800/80">
        {loading ? (
          <div className="py-12 text-center text-sm text-slate-400">Loading audit trails...</div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">No audit records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-3">Timestamp (UTC)</th>
                  <th className="py-3 px-3">User</th>
                  <th className="py-3 px-3">Action</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Client IP</th>
                  <th className="py-3 px-3">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-[11px]">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-3 text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toISOString().replace('T', ' ').substring(0, 19)}
                    </td>

                    <td className="py-3.5 px-3 text-slate-800 dark:text-slate-200 font-sans font-bold">
                      {log.username ? `@${log.username}` : "Anonymous"}
                    </td>

                    <td className="py-3.5 px-3 text-brand-600 dark:text-brand-400 font-bold">
                      {log.action}
                    </td>

                    <td className="py-3.5 px-3 font-sans">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        log.status === 'SUCCESS'
                          ? 'bg-emerald-500/15 text-emerald-500'
                          : 'bg-rose-500/15 text-rose-500'
                      }`}>
                        {log.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 text-slate-400">
                      {log.ip_address || "127.0.0.1"}
                    </td>

                    <td className="py-3.5 px-3 text-slate-500">
                      {log.reference_id || "—"}
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
    </div>
  );
}
