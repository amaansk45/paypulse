import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, 
  Wallet, 
  Send, 
  ArrowDownLeft, 
  QrCode, 
  ScanLine, 
  History, 
  Bell, 
  UserCheck, 
  ShieldAlert,
  PlusCircle,
  Eye,
  EyeOff
} from 'lucide-react';

export default function Sidebar({ isOpen, onClose }) {
  const { user, isAdmin } = useAuth();
  const [showBalance, setShowBalance] = React.useState(true);

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/wallet', label: 'Wallet & Ledger', icon: Wallet },
    { to: '/send', label: 'Send Money', icon: Send },
    { to: '/requests', label: 'Payment Requests', icon: ArrowDownLeft },
    { to: '/scan-pay', label: 'Scan & Pay', icon: ScanLine },
    { to: '/my-qr', label: 'My QR Code', icon: QrCode },
    { to: '/transactions', label: 'Transactions', icon: History },
    { to: '/notifications', label: 'Notifications', icon: Bell },
    { to: '/profile', label: 'Profile & Security', icon: UserCheck },
  ];

  if (isAdmin) {
    navLinks.push({ to: '/admin', label: 'Admin Portal', icon: ShieldAlert, badge: 'Staff' });
  }

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden animate-in fade-in"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-16 bottom-0 left-0 z-40 w-64 border-r border-slate-200/80 dark:border-slate-800/80 glass-card flex flex-col justify-between transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 space-y-6 overflow-y-auto">
          {/* Mini Wallet Balance Peek */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-brand-900 via-indigo-950 to-slate-900 border border-brand-700/40 text-white shadow-glow">
            <div className="flex items-center justify-between text-xs text-brand-200 mb-1">
              <span>Wallet Balance</span>
              <button
                onClick={() => setShowBalance(!showBalance)}
                className="opacity-75 hover:opacity-100 transition-opacity"
              >
                {showBalance ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div className="text-xl font-bold tracking-tight">
              {showBalance ? `₹ ${parseFloat(user?.wallet_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '••••••••'}
            </div>
            <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-300">
              <span className="font-mono truncate max-w-[120px]">{user?.wallet_number || 'WAL-ACTIVE'}</span>
              <NavLink to="/wallet" className="text-emerald-400 font-semibold hover:underline flex items-center gap-1">
                <PlusCircle className="w-3 h-3" /> Top Up
              </NavLink>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                      isActive
                        ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-purple-500/20 text-purple-400">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-200/80 dark:border-slate-800/80 text-[11px] text-slate-400 text-center">
          PayPulse FinTech Core v1.0.0
        </div>
      </aside>
    </>
  );
}
