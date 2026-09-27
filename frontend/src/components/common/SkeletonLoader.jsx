import React from 'react';

export function CardSkeleton() {
  return (
    <div className="rounded-3xl p-6 glass-card border border-slate-200 dark:border-slate-800 animate-pulse space-y-4">
      <div className="h-4 bg-slate-200 dark:bg-slate-700/60 rounded-md w-1/3"></div>
      <div className="h-8 bg-slate-300 dark:bg-slate-700 rounded-lg w-2/3"></div>
      <div className="h-4 bg-slate-200 dark:bg-slate-700/60 rounded-md w-1/2"></div>
    </div>
  );
}

export function TableRowSkeleton({ count = 5 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <tr key={i} className="animate-pulse border-b border-slate-100 dark:border-slate-800/80">
          <td className="py-4 px-4"><div className="h-4 bg-slate-200 dark:bg-slate-700/60 rounded w-28"></div></td>
          <td className="py-4 px-4"><div className="h-4 bg-slate-200 dark:bg-slate-700/60 rounded w-20"></div></td>
          <td className="py-4 px-4"><div className="h-4 bg-slate-200 dark:bg-slate-700/60 rounded w-36"></div></td>
          <td className="py-4 px-4"><div className="h-4 bg-slate-200 dark:bg-slate-700/60 rounded w-16"></div></td>
          <td className="py-4 px-4"><div className="h-6 bg-slate-200 dark:bg-slate-700/60 rounded-full w-20"></div></td>
        </tr>
      ))}
    </>
  );
}
