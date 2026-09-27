import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { 
  Bell, 
  Check, 
  Trash2, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ShieldAlert, 
  CreditCard, 
  Sparkles,
  CheckCircle2
} from 'lucide-react';

export default function NotificationsPage() {
  const { showSuccess, showError } = useToast();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterUnread, setFilterUnread] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const url = filterUnread ? '/api/notifications/?is_read=false' : '/api/notifications/';
      const res = await api.get(url);
      if (res.data?.success) {
        setNotifications(res.data.data || []);
      }
    } catch (err) {
      showError("Failed to fetch notifications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [filterUnread]);

  const handleMarkRead = async (id) => {
    try {
      await api.patch(`/api/notifications/${id}/read/`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (e) {}
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post('/api/notifications/mark-all-read/');
      showSuccess("All notifications marked as read.");
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (e) {
      showError("Failed to mark all as read.");
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/notifications/${id}/`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      showSuccess("Notification removed.");
    } catch (e) {
      showError("Failed to delete notification.");
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'MONEY_SENT':
        return <ArrowUpRight className="w-5 h-5 text-rose-500" />;
      case 'MONEY_RECEIVED':
      case 'QR_PAYMENT':
        return <ArrowDownLeft className="w-5 h-5 text-emerald-500" />;
      case 'ADD_MONEY':
        return <CreditCard className="w-5 h-5 text-brand-500" />;
      case 'SECURITY_ALERT':
      case 'LOGIN':
        return <ShieldAlert className="w-5 h-5 text-amber-500" />;
      default:
        return <Bell className="w-5 h-5 text-indigo-500" />;
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Notification Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time security alerts, transaction updates, and account activity.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterUnread(!filterUnread)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              filterUnread
                ? 'bg-brand-50 dark:bg-brand-950/60 border-brand-500 text-brand-600 dark:text-brand-400'
                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {filterUnread ? 'Showing Unread' : 'Filter Unread'}
          </button>
          <button
            onClick={handleMarkAllRead}
            className="px-3.5 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:opacity-90 transition-opacity flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" /> Mark All Read
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-400 glass-card rounded-3xl">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-400 glass-card rounded-3xl border border-slate-200/80 dark:border-slate-800/80">
            No notifications to display.
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 sm:p-5 rounded-3xl glass-card border transition-all flex items-start gap-4 ${
                n.is_read
                  ? 'border-slate-200/80 dark:border-slate-800/80 opacity-75'
                  : 'border-brand-500/50 shadow-md shadow-brand-500/5 ring-1 ring-brand-500/20'
              }`}
            >
              <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center flex-shrink-0">
                {getNotificationIcon(n.notification_type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                    {n.title}
                  </h4>
                  <span className="text-[10px] text-slate-400 whitespace-nowrap">
                    {new Date(n.created_at).toLocaleDateString('en-IN', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  {n.message}
                </p>

                <div className="flex items-center gap-3 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  {!n.is_read && (
                    <button
                      onClick={() => handleMarkRead(n.id)}
                      className="text-xs text-brand-600 dark:text-brand-400 font-semibold hover:underline flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" /> Mark as read
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(n.id)}
                    className="text-xs text-rose-500 font-semibold hover:underline flex items-center gap-1 ml-auto"
                  >
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
