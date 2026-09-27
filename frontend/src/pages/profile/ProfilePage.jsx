import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { 
  User, 
  ShieldCheck, 
  Lock, 
  KeyRound, 
  Smartphone, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  UploadCloud,
  FileCheck2,
  Trash2
} from 'lucide-react';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const { showSuccess, showError } = useToast();

  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'security' | 'sessions'
  const [loading, setLoading] = useState(false);

  // Profile Form
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');

  // KYC Form
  const [docType, setDocType] = useState('PASSPORT');
  const [docNumber, setDocNumber] = useState('');

  // Password Form
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // PIN Form
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  // Sessions
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    if (user) {
      setFullName(user.profile?.full_name || '');
      setPhone(user.phone_number || '');
      setCity(user.profile?.city || '');
      setAddress(user.profile?.address || '');
    }
    fetchSessions();
  }, [user]);

  const fetchSessions = async () => {
    try {
      const res = await api.get('/api/auth/sessions/');
      if (res.data?.success) {
        setSessions(res.data.data || []);
      }
    } catch (e) {}
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.patch('/api/profile/', {
        phone_number: phone.trim(),
        full_name: fullName.trim(),
        city: city.trim(),
        address: address.trim()
      });

      if (res.data?.success) {
        showSuccess("Profile information updated successfully.");
        refreshUser();
      }
    } catch (err) {
      showError(err.response?.data?.message || "Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitKYC = async (e) => {
    e.preventDefault();
    if (!docNumber.trim()) {
      showError("Please enter your document identification number.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/api/profile/kyc/', {
        document_type: docType,
        document_number: docNumber.trim(),
        city: city.trim(),
        address: address.trim()
      });

      if (res.data?.success) {
        showSuccess("KYC documents submitted. Status is now PENDING REVIEW.");
        refreshUser();
      }
    } catch (err) {
      showError(err.response?.data?.message || "Failed to submit KYC.");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showError("New passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/api/auth/change-password/', {
        old_password: oldPassword,
        new_password: newPassword,
        confirm_password: confirmPassword
      });

      if (res.data?.success) {
        showSuccess("Password changed successfully.");
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      showError(err.response?.data?.message || "Failed to change password.");
    } finally {
      setLoading(false);
    }
  };

  const handleSetPIN = async (e) => {
    e.preventDefault();
    if (pin.length < 4 || pin.length > 6) {
      showError("PIN must be 4 to 6 digits.");
      return;
    }
    if (pin !== confirmPin) {
      showError("PINs do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/api/auth/set-pin/', {
        pin,
        confirm_pin: confirmPin
      });

      if (res.data?.success) {
        showSuccess("Transaction PIN updated successfully.");
        setPin('');
        setConfirmPin('');
        refreshUser();
      }
    } catch (err) {
      showError(err.response?.data?.message || "Failed to update PIN.");
    } finally {
      setLoading(false);
    }
  };

  const handleTerminateSession = async (sessionId) => {
    try {
      await api.delete('/api/auth/sessions/', { data: { session_id: sessionId } });
      showSuccess("Session terminated.");
      fetchSessions();
    } catch (e) {
      showError("Failed to terminate session.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Profile & Security Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage your identity, KYC verification, password, and transaction authorization PIN.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl w-fit">
        {[
          { id: 'profile', label: 'Personal & KYC', icon: User },
          { id: 'security', label: 'Security & PIN', icon: ShieldCheck },
          { id: 'sessions', label: 'Active Sessions', icon: Smartphone }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-2 px-4 text-xs font-bold rounded-xl transition-all ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Profile & KYC */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Profile Form */}
          <div className="p-6 rounded-3xl glass-card border border-slate-200/80 dark:border-slate-800/80 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Profile Details</h3>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Username (Fixed)
                </label>
                <input
                  type="text"
                  disabled
                  value={user?.username || ''}
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-semibold opacity-75"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Email (Fixed)
                </label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-semibold opacity-75"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full legal name"
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 9876543210"
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Mumbai, Bengaluru"
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-md shadow-brand-600/30 transition-all"
              >
                Save Profile Changes
              </button>
            </form>
          </div>

          {/* KYC Status & Form */}
          <div className="p-6 rounded-3xl glass-card border border-slate-200/80 dark:border-slate-800/80 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">KYC Verification</h3>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                user?.profile?.kyc_status === 'VERIFIED'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : user?.profile?.kyc_status === 'PENDING'
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
              }`}>
                {user?.profile?.kyc_status || 'UNVERIFIED'}
              </span>
            </div>

            <p className="text-xs text-slate-500">
              Submit your government identity document to enable higher daily spending limits.
            </p>

            {user?.profile?.kyc_status === 'VERIFIED' ? (
              <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-bold">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  Your Account is Verified
                </div>
                <p>Document: {user.profile?.kyc_document_type} • {user.profile?.kyc_document_number}</p>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400">Daily limit raised to ₹50,000.00.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitKYC} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Document Type
                  </label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="PASSPORT">Passport</option>
                    <option value="NATIONAL_ID">National ID / Aadhaar</option>
                    <option value="DRIVING_LICENSE">Driving License</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Document Number
                  </label>
                  <input
                    type="text"
                    required
                    value={docNumber}
                    onChange={(e) => setDocNumber(e.target.value)}
                    placeholder="Enter document number"
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs shadow-md transition-all"
                >
                  Submit KYC for Review
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Security & PIN */}
      {activeTab === 'security' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Change Password */}
          <div className="p-6 rounded-3xl glass-card border border-slate-200/80 dark:border-slate-800/80 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Change Account Password</h3>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-md shadow-brand-600/30 transition-all"
              >
                Update Password
              </button>
            </form>
          </div>

          {/* Transaction PIN */}
          <div className="p-6 rounded-3xl glass-card border border-slate-200/80 dark:border-slate-800/80 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Transaction Security PIN</h3>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                user?.is_pin_set ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
              }`}>
                {user?.is_pin_set ? 'PIN Enabled' : 'PIN Not Configured'}
              </span>
            </div>

            <p className="text-xs text-slate-500">
              Your 4-6 digit numeric PIN authorizes payments, QR settlements, and transfers.
            </p>

            <form onSubmit={handleSetPIN} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  New Security PIN (Digits Only)
                </label>
                <input
                  type="password"
                  maxLength={6}
                  required
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 1234"
                  className="w-full py-2.5 px-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center tracking-widest text-lg font-bold focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Confirm Security PIN
                </label>
                <input
                  type="password"
                  maxLength={6}
                  required
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 1234"
                  className="w-full py-2.5 px-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center tracking-widest text-lg font-bold focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 transition-all"
              >
                Save Transaction PIN
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Tab 3: Active Sessions */}
      {activeTab === 'sessions' && (
        <div className="p-6 rounded-3xl glass-card border border-slate-200/80 dark:border-slate-800/80 space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Active Device Sessions</h3>
          <p className="text-xs text-slate-500">
            These are devices currently logged into your PayPulse digital wallet account.
          </p>

          <div className="space-y-3 pt-2">
            {sessions.map((s) => (
              <div
                key={s.id}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-brand-500/10 text-brand-500 flex items-center justify-center">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      {s.device_name || "Web Client"}
                      {s.is_active && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                      )}
                    </div>
                    <div className="text-xs text-slate-400">
                      IP: {s.ip_address || "127.0.0.1"} • Last active: {new Date(s.last_active).toLocaleString()}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleTerminateSession(s.id)}
                  className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                  title="Terminate Session"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
