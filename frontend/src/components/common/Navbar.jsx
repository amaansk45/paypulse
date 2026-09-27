import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { 
  Sun, 
  Moon, 
  Bell, 
  User, 
  LogOut, 
  ShieldCheck, 
  CreditCard,
  Check,
  ChevronDown,
  Menu,
  X
} from 'lucide-react';
import api from '../../api/client';

export default function Navbar({ onMobileMenuToggle }) {
  const { user, logout, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const notifRef = useRef(null);
  const userRef = useRef(null);

  // Fetch recent notifications
  useEffect(() => {
    if (user) {
      api.get('/api/notifications/?page_size=5')
        .then((res) => {
          if (res.data?.success) {
            setNotifications(res.data.data || []);
            setUnreadCount(res.data.unread_count || 0);
          }
        })
        .catch(() => {});
    }
  }, [user]);

  // Click outside listener for dropdowns
  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (userRef.current && !userRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAllRead = async () => {
    try {
      await api.post('/api/notifications/mark-all-read/');
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (e) {}
  };

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-slate-200/80 dark:border-slate-800/80 glass transition-colors">
      <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-4 max-w-7xl mx-auto w-full">
        {/* Left: Mobile Menu Toggle & Brand */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMobileMenuToggle}
            className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link to="/dashboard" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-glow">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-brand-600 via-indigo-600 to-emerald-500 bg-clip-text text-transparent">
              PayPulse
            </span>
          </Link>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
            title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
          </button>

          {/* Notifications Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl glass-card shadow-2xl p-4 z-50 border border-slate-200 dark:border-slate-800 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80 mb-2">
                  <div className="font-semibold text-sm">Notifications</div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-xs text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" /> Mark all read
                    </button>
                  )}
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {notifications.length === 0 ? (
                    <div className="text-center py-6 text-sm text-slate-400">No new notifications</div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`p-2.5 rounded-xl text-xs transition-colors ${
                          n.is_read
                            ? 'bg-slate-50/50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400'
                            : 'bg-brand-50/70 dark:bg-brand-950/40 text-slate-800 dark:text-slate-200 border-l-2 border-brand-500 font-medium'
                        }`}
                      >
                        <div className="font-semibold">{n.title}</div>
                        <div className="line-clamp-2 mt-0.5 text-slate-600 dark:text-slate-300">{n.message}</div>
                      </div>
                    ))
                  )}
                </div>

                <div className="pt-2.5 mt-2 border-t border-slate-100 dark:border-slate-800/80 text-center">
                  <Link
                    to="/notifications"
                    onClick={() => setShowNotifications(false)}
                    className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
                  >
                    View all notifications →
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* User Menu Dropdown */}
          <div className="relative" ref={userRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 pl-2 pr-1 sm:pr-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-500 text-white font-bold text-xs flex items-center justify-center ring-2 ring-brand-500/20">
                {user?.username ? user.username.substring(0, 2).toUpperCase() : 'U'}
              </div>
              <span className="hidden sm:inline font-semibold text-sm">{user?.username}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl glass-card shadow-2xl p-2 z-50 border border-slate-200 dark:border-slate-800 text-sm animate-in fade-in slide-in-from-top-2">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800/80 mb-1">
                  <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">{user?.username}</p>
                  <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                  {isAdmin && (
                    <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-bold rounded-md bg-purple-500/20 text-purple-400">
                      ADMIN
                    </span>
                  )}
                </div>

                <Link
                  to="/profile"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                >
                  <User className="w-4 h-4 text-brand-500" />
                  Profile & Security
                </Link>

                <Link
                  to="/wallet"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                >
                  <CreditCard className="w-4 h-4 text-emerald-500" />
                  My Wallet
                </Link>

                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors text-left"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
