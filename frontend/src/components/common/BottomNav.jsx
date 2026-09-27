import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Send, ScanLine, Wallet, UserCheck } from 'lucide-react';

export default function BottomNav() {
  const tabs = [
    { to: '/dashboard', label: 'Home', icon: LayoutDashboard },
    { to: '/wallet', label: 'Wallet', icon: Wallet },
    { to: '/scan-pay', label: 'Scan', icon: ScanLine, highlight: true },
    { to: '/send', label: 'Send', icon: Send },
    { to: '/profile', label: 'Profile', icon: UserCheck },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/80 dark:border-slate-800/80 glass px-2 py-1.5 flex items-center justify-around shadow-2xl">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        if (tab.highlight) {
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              className="flex flex-col items-center justify-center -mt-5"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-brand-500/40 ring-4 ring-white dark:ring-slate-900 transition-transform active:scale-95">
                <Icon className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-semibold text-brand-600 dark:text-brand-400 mt-0.5">
                {tab.label}
              </span>
            </NavLink>
          );
        }

        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `flex flex-col items-center py-1 px-2 rounded-xl text-xs font-medium transition-colors ${
                isActive
                  ? 'text-brand-600 dark:text-brand-400 font-semibold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`
            }
          >
            <Icon className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">{tab.label}</span>
          </NavLink>
        );
      })}
    </div>
  );
}
