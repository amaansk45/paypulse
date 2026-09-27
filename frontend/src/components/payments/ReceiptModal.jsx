import React from 'react';
import Modal from '../common/Modal';
import { ShieldCheck, Printer, CheckCircle2, Clock } from 'lucide-react';

export default function ReceiptModal({ isOpen, onClose, receipt }) {
  if (!receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  const isSuccess = receipt.status === 'SUCCESS';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Payment Receipt" maxWidth="max-w-lg">
      <div id="printable-receipt" className="space-y-6 print:p-8">
        {/* Receipt Header Banner */}
        <div className="text-center p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 text-white relative overflow-hidden border border-indigo-900/40 shadow-xl">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="font-extrabold text-lg tracking-tight">PayPulse</span>
          </div>

          <div className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-3">
            ₹{parseFloat(receipt.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold mt-3">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {receipt.status}
          </div>

          <p className="text-[11px] font-mono text-slate-400 mt-2">
            TXN: {receipt.transaction_id}
          </p>
        </div>

        {/* Detailed Breakdown */}
        <div className="space-y-3 text-xs bg-slate-50 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="flex justify-between pb-2 border-b border-slate-200/80 dark:border-slate-800/80">
            <span className="text-slate-500">Date & Time:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{receipt.date || new Date().toLocaleString()}</span>
          </div>

          <div className="flex justify-between pb-2 border-b border-slate-200/80 dark:border-slate-800/80">
            <span className="text-slate-500">Sender:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{receipt.sender?.name || 'Self / Top-Up'}</span>
          </div>

          <div className="flex justify-between pb-2 border-b border-slate-200/80 dark:border-slate-800/80">
            <span className="text-slate-500">Recipient:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{receipt.receiver?.name || 'External / Wallet'}</span>
          </div>

          <div className="flex justify-between pb-2 border-b border-slate-200/80 dark:border-slate-800/80">
            <span className="text-slate-500">Payment Method:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{receipt.payment_method}</span>
          </div>

          <div className="flex justify-between pb-2 border-b border-slate-200/80 dark:border-slate-800/80">
            <span className="text-slate-500">Reference ID:</span>
            <span className="font-mono text-slate-700 dark:text-slate-300">{receipt.reference_id || 'N/A'}</span>
          </div>

          {receipt.note && (
            <div className="flex justify-between pb-2 border-b border-slate-200/80 dark:border-slate-800/80">
              <span className="text-slate-500">Note:</span>
              <span className="italic text-slate-700 dark:text-slate-300 truncate max-w-[200px]">{receipt.note}</span>
            </div>
          )}

          <div className="flex justify-between pt-1">
            <span className="text-slate-500">Network Processing Fee:</span>
            <span className="font-semibold text-emerald-500">₹0.00 (Zero Fee)</span>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex gap-2 print:hidden">
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 py-3 px-4 rounded-2xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center gap-2 transition-colors"
          >
            <Printer className="w-4 h-4" /> Print / Save PDF
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
}
