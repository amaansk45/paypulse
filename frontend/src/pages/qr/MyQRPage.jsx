import React, { useState, useEffect, useRef } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import DynamicQRModal from '../../components/qr/DynamicQRModal';
import { QRCodeSVG } from 'qrcode.react';
import { 
  QrCode, 
  Download, 
  Copy, 
  Check, 
  Sparkles, 
  ShieldCheck, 
  Share2, 
  Info 
} from 'lucide-react';

export default function MyQRPage() {
  const { user } = useAuth();
  const { showSuccess } = useToast();
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showDynamicModal, setShowDynamicModal] = useState(false);
  const svgRef = useRef(null);

  const fetchMyQR = async () => {
    try {
      const res = await api.get('/api/qr/my/');
      if (res.data?.success) {
        setQrData(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyQR();
  }, []);

  const handleCopy = () => {
    if (!qrData) return;
    navigator.clipboard.writeText(qrData.payment_identifier);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showSuccess("Personal payment ID copied to clipboard!");
  };

  const handleDownload = () => {
    const svg = document.getElementById("my-qr-svg");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width + 40;
      canvas.height = img.height + 40;
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 20, 20);
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `PayPulse_QR_${user?.username}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
      showSuccess("QR Code image downloaded.");
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="text-center">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          My Personal QR Code
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Anyone with PayPulse can scan this QR code to transfer money directly into your wallet.
        </p>
      </div>

      {/* QR Card Container */}
      <div className="p-6 sm:p-8 rounded-3xl glass-card border border-slate-200/80 dark:border-slate-800/80 shadow-2xl backdrop-blur-xl text-center space-y-6">
        {/* User Card Header */}
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-500 text-white font-extrabold text-xl flex items-center justify-center ring-4 ring-brand-500/20 shadow-glow mb-2">
            {user?.username ? user.username.substring(0, 2).toUpperCase() : 'U'}
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {user?.profile?.full_name || user?.username}
          </h2>
          <p className="text-xs text-brand-600 dark:text-brand-400 font-medium">
            @{user?.username}
          </p>
        </div>

        {/* QR Code Presentation */}
        <div className="relative inline-block p-6 bg-white rounded-3xl shadow-xl border border-slate-200">
          {loading ? (
            <div className="w-56 h-56 flex items-center justify-center text-slate-400 text-xs">
              Rendering encrypted QR...
            </div>
          ) : (
            <QRCodeSVG
              id="my-qr-svg"
              value={JSON.stringify({
                app: "paypulse",
                pid: qrData?.payment_identifier,
                type: "PERSONAL",
                username: user?.username
              })}
              size={220}
              level="H"
              includeMargin={true}
            />
          )}
        </div>

        {/* Payment Identifier Banner */}
        <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="text-left font-mono text-xs">
            <span className="text-slate-400 block text-[10px]">Payment ID:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {qrData?.payment_identifier || "Generating..."}
            </span>
          </div>

          <button
            onClick={handleCopy}
            className="p-2 rounded-xl text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-white dark:hover:bg-slate-800 transition-colors"
            title="Copy Payment ID"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleDownload}
            className="py-3 px-4 rounded-2xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Download className="w-4 h-4" /> Download PNG
          </button>

          <button
            onClick={() => setShowDynamicModal(true)}
            className="py-3 px-4 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-600/30 flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <Sparkles className="w-4 h-4" /> Create Invoice QR
          </button>
        </div>

        <div className="p-3.5 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-700 dark:text-brand-300 text-xs flex items-start gap-2.5 text-left">
          <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>This QR code is secured with cryptographic signatures and does not expose your bank account numbers or credentials.</span>
        </div>
      </div>

      <DynamicQRModal
        isOpen={showDynamicModal}
        onClose={() => setShowDynamicModal(false)}
      />
    </div>
  );
}
