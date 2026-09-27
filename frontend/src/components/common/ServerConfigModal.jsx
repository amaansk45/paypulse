import React, { useState, useEffect } from 'react';
import { Server, CheckCircle2, AlertCircle, RefreshCw, X, Globe, Link2, ExternalLink } from 'lucide-react';
import { getApiBaseUrl, setCustomApiUrl } from '../../api/client';

export default function ServerConfigModal({ isOpen, onClose, onSave }) {
  const [url, setUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // { success: boolean, message: string, pingMs?: number }

  useEffect(() => {
    if (isOpen) {
      setUrl(getApiBaseUrl() || '');
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestConnection = async (testTargetUrl) => {
    const target = (testTargetUrl || url).trim().replace(/\/+$/, '');
    if (!target) {
      setTestResult({
        success: false,
        message: 'Please enter a valid Backend API URL (e.g., https://your-backend.onrender.com)',
      });
      return;
    }

    // Check mixed content warning
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && target.startsWith('http://')) {
      setTestResult({
        success: false,
        message: 'Mixed Content Error: Your frontend is on HTTPS. A backend URL with http:// will be blocked by modern browsers. Please use an https:// URL (e.g. Render or HTTPS Tunnel).',
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    const startTime = performance.now();
    try {
      const response = await fetch(`${target}/api/health/`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      const pingMs = Math.round(performance.now() - startTime);

      if (response.ok) {
        const data = await response.json();
        setTestResult({
          success: true,
          message: `Connected successfully! (${data.message || 'API is operational'})`,
          pingMs,
        });
      } else {
        setTestResult({
          success: false,
          message: `Server returned HTTP status ${response.status} (${response.statusText}).`,
        });
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: `Failed to connect: ${err.message || 'Connection refused or blocked by CORS.'}`,
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    const trimmed = url.trim().replace(/\/+$/, '');
    setCustomApiUrl(trimmed);
    if (onSave) onSave(trimmed);
    onClose();
    // Refresh page if URL changed so all hooks and auth contexts re-initialize
    window.location.reload();
  };

  const handleReset = () => {
    setCustomApiUrl('');
    setUrl('');
    setTestResult(null);
    if (onSave) onSave('');
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl bg-surface-light dark:bg-surface-dark border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden text-slate-900 dark:text-white">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-500/10 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 flex items-center justify-center">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">Backend Server Settings</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Connect your frontend to your Django API backend
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Information Notice */}
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-xs text-amber-800 dark:text-amber-200 space-y-1.5">
            <div className="font-semibold flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              Why am I seeing "Network Error"?
            </div>
            <p className="leading-relaxed">
              When deployed to Vercel (HTTPS), your web app needs an <strong>HTTPS Backend API URL</strong> (e.g., Render, Railway, or an HTTPS Tunnel). Connecting to local <code>http://127.0.0.1:8000</code> from Vercel is blocked by browser security.
            </p>
          </div>

          {/* URL Input */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
              Backend API URL
            </label>
            <div className="relative">
              <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setTestResult(null);
                }}
                placeholder="https://paypulse-api.onrender.com or https://...pinggy.link"
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all font-mono text-xs"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Currently active: <span className="font-mono text-brand-600 dark:text-brand-400">{getApiBaseUrl() || 'Not configured'}</span>
            </p>
          </div>

          {/* Preset Buttons */}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setUrl('http://127.0.0.1:8000');
                setTestResult(null);
              }}
              className="text-xs px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Localhost (127.0.0.1:8000)
            </button>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  setUrl(`http://${window.location.hostname}:8000`);
                  setTestResult(null);
                }
              }}
              className="text-xs px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Current Host:8000
            </button>
          </div>

          {/* Test Status Feedback */}
          {testResult && (
            <div
              className={`p-3.5 rounded-2xl border text-xs flex items-start gap-2.5 transition-all ${
                testResult.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-200'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/50 text-rose-800 dark:text-rose-200'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1 leading-relaxed">
                <div>{testResult.message}</div>
                {testResult.pingMs && (
                  <div className="text-[10px] opacity-75 mt-0.5">Response latency: {testResult.pingMs}ms</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-6 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors order-3 sm:order-1"
          >
            Reset to Default
          </button>
          <div className="flex items-center gap-2.5 w-full sm:w-auto order-1 sm:order-2">
            <button
              type="button"
              disabled={testing || !url.trim()}
              onClick={() => handleTestConnection()}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
              Test Connection
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-md shadow-brand-600/20 transition-all active:scale-95"
            >
              Save & Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
