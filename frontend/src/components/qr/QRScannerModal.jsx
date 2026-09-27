import React, { useState, useEffect, useRef } from 'react';
import Modal from '../common/Modal';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { Html5Qrcode } from 'html5-qrcode';
import { 
  ScanLine, 
  Camera, 
  UploadCloud, 
  UserCheck, 
  ShieldCheck, 
  Lock, 
  Loader2, 
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import PaymentStatusModal from '../payments/PaymentStatusModal';

export default function QRScannerModal({ isOpen, onClose, onSuccess }) {
  const { showSuccess, showError } = useToast();
  const { refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState('camera'); // 'camera' | 'paste' | 'file'
  const [manualCode, setManualCode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  // Validation & Payment States
  const [validatedData, setValidatedData] = useState(null);
  const [amount, setAmount] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  // Payment Status Animation Modal State
  const [statusModal, setStatusModal] = useState({
    isOpen: false,
    status: 'success', // 'success' | 'failed'
    amount: '',
    recipient: '',
    note: '',
    transactionId: '',
    errorMessage: '',
  });

  const qrRegionId = "html5qr-code-full-region";
  const html5QrCodeRef = useRef(null);

  useEffect(() => {
    if (isOpen && activeTab === 'camera' && !validatedData) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab, validatedData]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(qrRegionId);
      }
      setIsScanning(true);
      await html5QrCodeRef.current.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 220, height: 220 }
        },
        (decodedText) => {
          stopCamera();
          handleScannedData(decodedText);
        },
        () => {}
      );
    } catch (err) {
      setIsScanning(false);
      setCameraError("Camera access unavailable or permission denied. You can paste the code or upload an image.");
      setActiveTab('paste');
    }
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current && isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (e) {}
      setIsScanning(false);
    }
  };

  const handleScannedData = async (rawCode) => {
    setLoading(true);
    try {
      const res = await api.post('/api/qr/validate/', { qr_data: rawCode });
      if (res.data?.success) {
        setValidatedData(res.data.data);
        if (res.data.data.amount) {
          setAmount(res.data.data.amount);
        }
      }
    } catch (err) {
      showError(err.response?.data?.message || "Invalid or unrecognized QR code.");
      if (activeTab === 'camera') {
        startCamera();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const html5QrCode = new Html5Qrcode("hidden-file-qr-region");
    html5QrCode.scanFile(file, true)
      .then((decodedText) => {
        handleScannedData(decodedText);
      })
      .catch((err) => {
        showError("No valid QR code could be found in this image.");
      });
  };

  const handlePay = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      showError("Please enter a valid payment amount.");
      return;
    }

    setLoading(true);
    const sentAmount = parseFloat(amount).toFixed(2);
    const recipientUser = validatedData.recipient?.username || 'Merchant';

    try {
      const res = await api.post('/api/qr/pay/', {
        qr_data: validatedData.payment_identifier,
        amount: sentAmount,
        pin: pin.trim()
      });

      if (res.data?.success) {
        showSuccess(`Paid ₹${sentAmount} to ${recipientUser} via QR!`);
        if (refreshUser) refreshUser();
        if (onSuccess) onSuccess(res.data.data);

        // Show Success Right Tick Modal with Voice Announcement!
        setStatusModal({
          isOpen: true,
          status: 'success',
          amount: sentAmount,
          recipient: recipientUser,
          note: validatedData.description || 'QR Payment',
          transactionId: res.data.data?.transaction_id || '',
          errorMessage: '',
        });
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "QR payment failed.";
      showError(msg);

      // Show Failed Wrong Tick Modal (NO VOICE!)
      setStatusModal({
        isOpen: true,
        status: 'failed',
        amount: sentAmount,
        recipient: recipientUser,
        note: '',
        transactionId: '',
        errorMessage: msg,
      });
    } finally {
      setLoading(false);
    }
  };

  const resetState = () => {
    stopCamera();
    setValidatedData(null);
    setAmount('');
    setPin('');
    setManualCode('');
    setLoading(false);
    setCameraError(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  return (
    <>
      <Modal isOpen={isOpen && !statusModal.isOpen} onClose={handleClose} title={validatedData ? "Confirm QR Payment" : "Scan & Pay"}>
      {!validatedData ? (
        <div className="space-y-4">
          {/* Tabs */}
          <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl">
            <button
              onClick={() => setActiveTab('camera')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'camera'
                  ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Camera className="w-3.5 h-3.5" /> Camera
            </button>
            <button
              onClick={() => setActiveTab('paste')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'paste'
                  ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <ScanLine className="w-3.5 h-3.5" /> Enter Code
            </button>
            <button
              onClick={() => setActiveTab('file')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'file'
                  ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5" /> Upload Image
            </button>
          </div>

          {/* Camera View */}
          {activeTab === 'camera' && (
            <div className="relative rounded-3xl overflow-hidden bg-slate-950 min-h-[260px] flex items-center justify-center border border-slate-800">
              <div id={qrRegionId} className="w-full h-full" />
              {/* Laser Scan line overlay */}
              <div className="absolute inset-0 pointer-events-none flex flex-col justify-center items-center">
                <div className="w-56 h-56 border-2 border-brand-500/80 rounded-2xl relative">
                  <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-brand-400 to-transparent shadow-glow animate-bounce" />
                </div>
              </div>
            </div>
          )}

          {/* Paste / Manual PID */}
          {activeTab === 'paste' && (
            <div className="space-y-3 pt-2">
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Paste QR Code or Payment ID
              </label>
              <textarea
                rows={3}
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Paste PAY-XXXXXXXX or raw scanned payload..."
                className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <button
                type="button"
                onClick={() => handleScannedData(manualCode)}
                disabled={!manualCode.trim() || loading}
                className="w-full py-3 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Validate & Continue →"}
              </button>
            </div>
          )}

          {/* File Upload */}
          {activeTab === 'file' && (
            <div className="pt-2">
              <label className="flex flex-col items-center justify-center p-8 rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/60 cursor-pointer transition-colors text-center">
                <UploadCloud className="w-10 h-10 text-brand-500 mb-2" />
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Upload QR Image</span>
                <span className="text-xs text-slate-400 mt-1">PNG, JPG, or SVG screenshot</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              <div id="hidden-file-qr-region" className="hidden" />
            </div>
          )}

          {cameraError && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{cameraError}</span>
            </div>
          )}
        </div>
      ) : (
        /* Scanned QR Settling Form */
        <form onSubmit={handlePay} className="space-y-4 animate-in fade-in">
          {/* Recipient Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-tr from-brand-950/60 to-slate-900 border border-brand-800/40 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-600 text-white font-bold flex items-center justify-center ring-2 ring-brand-400/30">
                {validatedData.recipient.username.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h4 className="font-bold text-sm">{validatedData.recipient.full_name || validatedData.recipient.username}</h4>
                <p className="text-xs text-brand-300">@{validatedData.recipient.username}</p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">
              VERIFIED QR
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Payment Amount (INR)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-400">₹</span>
              <input
                type="number"
                min="1"
                step="any"
                disabled={validatedData.qr_type === 'DYNAMIC' && !!validatedData.amount}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
                className="w-full pl-9 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xl font-bold focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-75"
              />
            </div>
            {validatedData.qr_type === 'DYNAMIC' && validatedData.amount && (
              <span className="text-[11px] text-amber-500 font-medium">Invoice amount pre-locked by recipient.</span>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Enter Security PIN
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Security PIN (e.g. 1234)"
                required
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={resetState}
              className="py-3 px-4 rounded-2xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Scan Again
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              {loading ? "Settling QR Transfer..." : `Authorize ₹${parseFloat(amount || 0).toFixed(2)}`}
            </button>
          </div>
        </form>
      )}
    </Modal>

    {/* Payment Status Modal (Right Tick + Voice on Success, Wrong Tick on Failure) */}
    <PaymentStatusModal
      isOpen={statusModal.isOpen}
      status={statusModal.status}
      amount={statusModal.amount}
      recipient={statusModal.recipient}
      note={statusModal.note}
      transactionId={statusModal.transactionId}
      errorMessage={statusModal.errorMessage}
      onClose={() => {
        const wasSuccess = statusModal.status === 'success';
        setStatusModal((prev) => ({ ...prev, isOpen: false }));
        if (wasSuccess) {
          handleClose();
        }
      }}
      onRetry={() => {
        setStatusModal((prev) => ({ ...prev, isOpen: false }));
        setPin('');
      }}
    />
  </>
  );
}
