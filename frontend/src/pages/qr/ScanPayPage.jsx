import React, { useState } from 'react';
import QRScannerModal from '../../components/qr/QRScannerModal';
import { ScanLine, Camera, ShieldCheck, Zap } from 'lucide-react';

export default function ScanPayPage() {
  const [showScanner, setShowScanner] = useState(false);

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Scan & Pay
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Scan any PayPulse user or merchant QR code to transfer funds instantly.
        </p>
      </div>

      <div className="p-8 sm:p-12 rounded-3xl glass-card border border-slate-200/80 dark:border-slate-800/80 shadow-2xl backdrop-blur-xl text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white flex items-center justify-center mx-auto shadow-glow">
          <ScanLine className="w-10 h-10" />
        </div>

        <div className="max-w-md mx-auto space-y-2">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Camera Scanner & QR Code Reader
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Point your camera at a friend's personal QR code or upload an image to initiate transfer.
          </p>
        </div>

        <button
          onClick={() => setShowScanner(true)}
          className="px-8 py-4 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm shadow-xl shadow-brand-600/30 inline-flex items-center gap-2.5 transition-all active:scale-95"
        >
          <Camera className="w-5 h-5" /> Launch Scanner
        </button>

        <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-200/80 dark:border-slate-800/80 text-left text-xs text-slate-500">
          <div className="flex items-start gap-2">
            <Zap className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <span>Instant ledger validation & settlement in under 500ms.</span>
          </div>
          <div className="flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
            <span>Cryptographically signed to prevent spoofing or tampering.</span>
          </div>
        </div>
      </div>

      <QRScannerModal
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
      />
    </div>
  );
}
