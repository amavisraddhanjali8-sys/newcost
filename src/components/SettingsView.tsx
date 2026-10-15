import React, { useState, useRef, useEffect } from 'react';
import {
  Building2,
  Users,
  Shield,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  Edit2,
  Search,
  Lock,
  Mail,
  Phone,
  Globe,
  MapPin,
  RefreshCw,
  Hash,
  Download,
  FileText,
  FileSpreadsheet,
  RotateCcw,
  ShieldCheck,
  HardDrive,
  Sun,
  Moon,
  Monitor,
  Printer,
  X
} from 'lucide-react';
import jsPDF from 'jspdf';
import { getStoredThemeMode, setStoredThemeMode, ThemeMode } from '../services/themeService';
import { getStoredSessionToken, setStoredTimeoutMinutes, getStoredTimeoutMinutes } from '../services/sessionService';
import {
  AppUser,
  AccountRequest,
  CompanyDetails,
  UserRole,
  MaterialItem,
  InventoryItem,
  InventoryTransaction,
  Project,
  Supplier,
  SubcontractorRateItem,
  OutsourcedService,
  ProduceItem
} from '../types';
import {
  AutoNumberRule,
  AutoNumberEntityType,
  getStoredAutoNumberRules,
  saveAutoNumberRules,
  resetAutoNumberRules,
  generateSampleNumber,
  peekNextNumber
} from '../services/autoNumberingService';
import { persistentDatabase } from '../services/persistentDatabase';
import { exportMasterExecutiveReportPDF } from '../utils/pdfExport';
import {
  exportMaterialsToCSV,
  exportProduceItemsToCSV,
  exportInventoryToCSV,
  exportInventoryTransactionsToCSV,
  exportSubcontractorsToCSV,
  exportOutsourcedServicesToCSV,
  exportProjectsToCSV,
  exportSuppliersToCSV
} from '../utils/csvExport';

interface SettingsViewProps {
  currentUser: AppUser;
  companyDetails: CompanyDetails;
  onUpdateCompanyDetails: (details: CompanyDetails) => void;
  users: AppUser[];
  onAddUser: (user: Omit<AppUser, 'id' | 'createdAt'>) => void;
  onUpdateUser: (id: string, updates: Partial<AppUser>) => void;
  onDeleteUser: (id: string) => void;
  accountRequests: AccountRequest[];
  onApproveRequest: (requestId: string) => void;
  onRejectRequest: (requestId: string) => void;
  showToast: (msg: string) => void;
  materials?: MaterialItem[];
  inventory?: InventoryItem[];
  transactions?: InventoryTransaction[];
  projects?: Project[];
  suppliers?: Supplier[];
  subcontractors?: SubcontractorRateItem[];
  outsourced?: OutsourcedService[];
  produceItems?: ProduceItem[];
  onRestoreDatabase?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser,
  companyDetails,
  onUpdateCompanyDetails,
  users,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  accountRequests,
  onApproveRequest,
  onRejectRequest,
  showToast,
  materials = [],
  inventory = [],
  transactions = [],
  projects = [],
  suppliers = [],
  subcontractors = [],
  outsourced = [],
  produceItems = [],
  onRestoreDatabase
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'company' | 'auto_numbering' | 'export_data' | 'users' | 'appearance' | 'security'>('company');

  // Company Details State
  const [compForm, setCompForm] = useState<CompanyDetails>({ ...companyDetails });
  const [isLogoDragging, setIsLogoDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-Numbering Rules State
  const [rules, setRules] = useState<AutoNumberRule[]>(() => getStoredAutoNumberRules());
  const [isSyncingCounters, setIsSyncingCounters] = useState(false);

  // Export & Database State
  const [isExportingAll, setIsExportingAll] = useState(false);
  const dbFileInputRef = useRef<HTMLInputElement | null>(null);

  // Users Management State
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userFormEmpId, setUserFormEmpId] = useState('');
  const [userFormName, setUserFormName] = useState('');
  const [userFormEmail, setUserFormEmail] = useState('');
  const [userFormRole, setUserFormRole] = useState<UserRole>('PROJECT_MANAGER');
  const [userFormDept, setUserFormDept] = useState('');
  const [userFormPassword, setUserFormPassword] = useState('user123');
  const [userFormStatus, setUserFormStatus] = useState<'Active' | 'Inactive'>('Active');

  // Appearance State
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => getStoredThemeMode());

  // Security & 2FA State
  const [sessionTimeout, setSessionTimeout] = useState<number>(() => getStoredTimeoutMinutes());
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [totpQrModalOpen, setTotpQrModalOpen] = useState(false);
  const [totpQrDataUrl, setTotpQrDataUrl] = useState<string | null>(null);
  const [totpVerifyCode, setTotpVerifyCode] = useState('');
  const [totpConfigured, setTotpConfigured] = useState(false);
  const [isSecurityLoading, setIsSecurityLoading] = useState(false);

  // Load Admin Security Configuration
  useEffect(() => {
    if (currentUser.role === 'ADMIN') {
      const token = getStoredSessionToken();
      fetch('/api/admin/security-config', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then((r) => r.json())
        .then((data) => {
          if (data && data.success) {
            setTotpConfigured(Boolean(data.config?.totpEnabled));
            if (data.config?.backupCodes) {
              setBackupCodes(data.config.backupCodes);
            }
          }
        })
        .catch(() => {});
    }
  }, [currentUser]);

  // Company Details Handlers
  const handleSaveCompanyDetails = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateCompanyDetails(compForm);
    showToast('Company details saved.');
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showToast('File exceeds 10MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) setCompForm((prev) => ({ ...prev, logoUrl: result }));
    };
    reader.readAsDataURL(file);
  };

  const handleLogoDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsLogoDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showToast('File exceeds 10MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) setCompForm((prev) => ({ ...prev, logoUrl: result }));
    };
    reader.readAsDataURL(file);
  };

  // Auto-Number Handlers
  const handleUpdateRule = (key: string, field: keyof AutoNumberRule, value: any) => {
    setRules((prev) =>
      prev.map((r) => ((r.entityKey === key || r.entityType === key) ? { ...r, [field]: value } : r))
    );
  };

  const handleSaveRules = () => {
    saveAutoNumberRules(rules);
    showToast('Auto-number rules saved.');
  };

  const handleResetRules = () => {
    const defaults = resetAutoNumberRules();
    setRules(defaults);
    showToast('Rules reset to defaults.');
  };

  const handleSyncCounters = () => {
    setIsSyncingCounters(true);
    setTimeout(() => {
      const updatedRules = rules.map((rule) => {
        let maxFound = 0;
        if (rule.entityType === 'material') {
          materials.forEach((m) => {
            const match = m.code?.match(/\d+/g);
            if (match) {
              const num = parseInt(match[match.length - 1], 10);
              if (num > maxFound) maxFound = num;
            }
          });
        } else if (rule.entityType === 'project') {
          projects.forEach((p) => {
            const match = p.code?.match(/\d+/g);
            if (match) {
              const num = parseInt(match[match.length - 1], 10);
              if (num > maxFound) maxFound = num;
            }
          });
        } else if (rule.entityType === 'inventory_in' || rule.entityType === 'inventory_out') {
          transactions.forEach((t) => {
            const match = (t.transactionNumber || t.id)?.match(/\d+/g);
            if (match) {
              const num = parseInt(match[match.length - 1], 10);
              if (num > maxFound) maxFound = num;
            }
          });
        }
        return {
          ...rule,
          nextNumber: Math.max(rule.nextNumber, maxFound + 1)
        };
      });

      setRules(updatedRules);
      saveAutoNumberRules(updatedRules);
      setIsSyncingCounters(false);
      showToast('Counters synchronized.');
    }, 600);
  };

  // Export All Datasets
  const handleMasterExportAll = () => {
    setIsExportingAll(true);
    try {
      exportMasterExecutiveReportPDF(
        companyDetails,
        materials,
        inventory,
        transactions,
        projects,
        subcontractors,
        outsourced,
        suppliers
      );

      setTimeout(() => exportMaterialsToCSV(materials), 200);
      setTimeout(() => exportInventoryToCSV(inventory), 400);
      setTimeout(() => exportInventoryTransactionsToCSV(transactions), 600);
      setTimeout(() => exportSubcontractorsToCSV(subcontractors), 800);
      setTimeout(() => exportOutsourcedServicesToCSV(outsourced), 1000);
      setTimeout(() => exportProjectsToCSV(projects), 1200);
      setTimeout(() => exportSuppliersToCSV(suppliers), 1400);
      setTimeout(() => exportProduceItemsToCSV(produceItems), 1600);
      setTimeout(() => persistentDatabase.exportCompleteDatabase(), 1800);

      setTimeout(() => {
        setIsExportingAll(false);
        showToast('All exports downloaded.');
      }, 2000);
    } catch {
      setIsExportingAll(false);
      showToast('Export failed.');
    }
  };

  // Database Restore
  const handleRestoreDatabase = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showToast('File exceeds 10MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const success = persistentDatabase.restoreDatabase(text);
        if (success) {
          showToast('Database restored.');
          if (onRestoreDatabase) onRestoreDatabase();
        } else {
          showToast('Invalid backup file.');
        }
      } catch {
        showToast('Restore error.');
      }
    };
    reader.readAsText(file);
    if (dbFileInputRef.current) dbFileInputRef.current.value = '';
  };

  // User Management Handlers
  const handleOpenAddUser = () => {
    setEditingUserId(null);
    setUserFormEmpId(`EMP-${Date.now().toString().slice(-4)}`);
    setUserFormName('');
    setUserFormEmail('');
    setUserFormRole('PROJECT_MANAGER');
    setUserFormDept('Engineering');
    setUserFormPassword('pass123');
    setUserFormStatus('Active');
    setIsUserModalOpen(true);
  };

  const handleOpenEditUser = (user: AppUser) => {
    setEditingUserId(user.id);
    setUserFormEmpId(user.employeeId);
    setUserFormName(user.name);
    setUserFormEmail(user.email);
    setUserFormRole(user.role);
    setUserFormDept(user.department);
    setUserFormPassword(user.password || '');
    setUserFormStatus(user.status);
    setIsUserModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userFormEmpId || !userFormName || !userFormEmail) return;

    if (editingUserId) {
      onUpdateUser(editingUserId, {
        employeeId: userFormEmpId.trim().toUpperCase(),
        name: userFormName.trim(),
        email: userFormEmail.trim(),
        role: userFormRole,
        department: userFormDept.trim(),
        password: userFormPassword.trim(),
        status: userFormStatus
      });
      showToast('User updated.');
    } else {
      onAddUser({
        employeeId: userFormEmpId.trim().toUpperCase(),
        name: userFormName.trim(),
        email: userFormEmail.trim(),
        role: userFormRole,
        department: userFormDept.trim(),
        password: userFormPassword.trim(),
        status: userFormStatus
      });
      showToast('User created.');
    }

    setIsUserModalOpen(false);
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.employeeId.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const pendingRequests = accountRequests.filter((r) => r.status === 'Pending');

  // Appearance Theme Handler
  const handleSelectTheme = (mode: ThemeMode) => {
    setThemeMode(mode);
    setStoredThemeMode(mode);
    onUpdateUser(currentUser.id, { themePreference: mode });
    showToast(`Theme set to ${mode}.`);
  };

  // Google Authenticator Setup
  const handleOpenGoogleAuthSetup = async () => {
    setIsSecurityLoading(true);
    const token = getStoredSessionToken();
    try {
      const res = await fetch('/api/auth/totp-setup', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setTotpQrDataUrl(data.qrCodeDataUrl);
      setTotpVerifyCode('');
      setTotpQrModalOpen(true);
    } catch {
      showToast('Error setting up 2FA.');
    } finally {
      setIsSecurityLoading(false);
    }
  };

  const handleConfirmTotp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!totpVerifyCode.trim()) return;

    setIsSecurityLoading(true);
    const token = getStoredSessionToken();
    try {
      const res = await fetch('/api/auth/totp-confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ code: totpVerifyCode.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setTotpConfigured(true);
      setTotpQrModalOpen(false);
      showToast('2FA activated.');
    } catch {
      showToast('Invalid verification code.');
    } finally {
      setIsSecurityLoading(false);
    }
  };

  const handleDownloadBackupCodesPdf = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text('Emergency Backup Codes', 14, 20);
      doc.setFontSize(10);
      doc.text(`User: ${currentUser.name} (${currentUser.employeeId})`, 14, 28);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 34);

      backupCodes.forEach((code, idx) => {
        doc.text(`[${idx + 1}] ${code}`, 14, 46 + idx * 8);
      });

      doc.save('backup_codes.pdf');
      showToast('Backup codes downloaded.');
    } catch {
      showToast('Failed to download PDF.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4 pb-12">
      {/* 1. TOP HEADER & TABS - WHITE BOX */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <Building2 className="w-5 h-5 text-slate-700" />
          <h1 className="text-base font-bold text-slate-900">Settings</h1>
        </div>

        {/* Simple Tab Pills */}
        <div className="inline-flex p-0.5 bg-slate-100 rounded-lg border border-slate-200 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveSubTab('company')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
              activeSubTab === 'company'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Company
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('auto_numbering')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
              activeSubTab === 'auto_numbering'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Auto Numbers
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('export_data')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
              activeSubTab === 'export_data'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Exports
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('users')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors flex items-center space-x-1 ${
              activeSubTab === 'users'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Users</span>
            {pendingRequests.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('appearance')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
              activeSubTab === 'appearance'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Appearance
          </button>

          {currentUser.role === 'ADMIN' && (
            <button
              type="button"
              onClick={() => setActiveSubTab('security')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                activeSubTab === 'security'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Security
            </button>
          )}
        </div>
      </div>

      {/* SUB-TAB 1: COMPANY */}
      {activeSubTab === 'company' && (
        <form onSubmit={handleSaveCompanyDetails} className="space-y-4">
          {/* Card: Logo */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
              Company Logo
            </span>

            <div className="flex flex-wrap items-center gap-4">
              {compForm.logoUrl ? (
                <div className="w-24 h-16 bg-slate-50 border border-slate-200 rounded-lg p-2 flex items-center justify-center shrink-0">
                  <img src={compForm.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                </div>
              ) : (
                <div className="w-24 h-16 bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center text-slate-400 text-xs font-medium shrink-0">
                  No Logo
                </div>
              )}

              <div className="flex items-center space-x-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Upload Logo
                </button>
                {compForm.logoUrl && (
                  <button
                    type="button"
                    onClick={() => setCompForm((prev) => ({ ...prev, logoUrl: '' }))}
                    className="px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Card: Profile Fields */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
              Company Profile
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Company Name</label>
                <input
                  type="text"
                  value={compForm.name}
                  onChange={(e) => setCompForm({ ...compForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Registration #</label>
                <input
                  type="text"
                  value={compForm.registrationNumber || ''}
                  onChange={(e) => setCompForm({ ...compForm, registrationNumber: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Email</label>
                <input
                  type="email"
                  value={compForm.email}
                  onChange={(e) => setCompForm({ ...compForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Phone</label>
                <input
                  type="text"
                  value={compForm.phone}
                  onChange={(e) => setCompForm({ ...compForm, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Website</label>
                <input
                  type="text"
                  value={compForm.website}
                  onChange={(e) => setCompForm({ ...compForm, website: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Currency</label>
                <input
                  type="text"
                  value={compForm.currency}
                  onChange={(e) => setCompForm({ ...compForm, currency: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-bold"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-600 font-semibold mb-1">Address</label>
                <input
                  type="text"
                  value={compForm.address}
                  onChange={(e) => setCompForm({ ...compForm, address: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-sm"
              >
                Save Changes
              </button>
            </div>
          </div>
        </form>
      )}

      {/* SUB-TAB 2: AUTO NUMBERS */}
      {activeSubTab === 'auto_numbering' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Auto Numbering Rules
            </span>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleSyncCounters}
                disabled={isSyncingCounters}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg cursor-pointer"
              >
                {isSyncingCounters ? 'Syncing...' : 'Sync Counters'}
              </button>
              <button
                type="button"
                onClick={handleResetRules}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Reset Defaults
              </button>
              <button
                type="button"
                onClick={handleSaveRules}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg cursor-pointer shadow-sm"
              >
                Save Rules
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-800">
                <thead className="bg-slate-50 uppercase text-[10px] text-slate-600 border-b border-slate-200 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Entity</th>
                    <th className="py-2.5 px-3">Prefix</th>
                    <th className="py-2.5 px-3">Suffix</th>
                    <th className="py-2.5 px-3">Digits</th>
                    <th className="py-2.5 px-3">Next Number</th>
                    <th className="py-2.5 px-3">Sample Preview</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rules.map((rule) => {
                    const ruleKey = rule.entityKey || rule.entityType || '';
                    return (
                      <tr key={ruleKey} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          {rule.label}
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            value={rule.prefix}
                            onChange={(e) => handleUpdateRule(ruleKey, 'prefix', e.target.value.toUpperCase())}
                            className="w-24 px-2 py-1 bg-white border border-slate-300 rounded font-mono font-bold"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            value={rule.suffix || ''}
                            onChange={(e) => handleUpdateRule(ruleKey, 'suffix', e.target.value.toUpperCase())}
                            className="w-16 px-2 py-1 bg-white border border-slate-300 rounded font-mono"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            min="2"
                            max="8"
                            value={rule.padding || 4}
                            onChange={(e) => handleUpdateRule(ruleKey, 'padding', parseInt(e.target.value, 10) || 4)}
                            className="w-16 px-2 py-1 bg-white border border-slate-300 rounded"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            min="1"
                            value={rule.nextNumber}
                            onChange={(e) => handleUpdateRule(ruleKey, 'nextNumber', Math.max(1, parseInt(e.target.value, 10) || 1))}
                            className="w-24 px-2 py-1 bg-white border border-slate-300 rounded font-mono font-bold"
                          />
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                          {generateSampleNumber(rule)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: EXPORTS */}
      {activeSubTab === 'export_data' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Box 1: Master Download */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between space-y-3">
              <div>
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                  Master Export
                </span>
                <span className="text-xs text-slate-500 mt-1 block">
                  Download executive report and all datasets.
                </span>
              </div>
              <button
                type="button"
                onClick={handleMasterExportAll}
                disabled={isExportingAll}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-sm"
              >
                {isExportingAll ? 'Generating...' : 'Download All (PDF + CSV)'}
              </button>
            </div>

            {/* Box 2: JSON Backup */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between space-y-3">
              <div>
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                  Backup Database
                </span>
                <span className="text-xs text-slate-500 mt-1 block">
                  Download full system data as JSON.
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  persistentDatabase.exportCompleteDatabase();
                  showToast('Database JSON downloaded.');
                }}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Download JSON
              </button>
            </div>

            {/* Box 3: Restore Database */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between space-y-3">
              <div>
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                  Restore Database
                </span>
                <span className="text-xs text-slate-500 mt-1 block">
                  Upload a JSON backup file to restore.
                </span>
              </div>
              <input
                ref={dbFileInputRef}
                type="file"
                accept=".json"
                onChange={handleRestoreDatabase}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => dbFileInputRef.current?.click()}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Upload Backup File
              </button>
            </div>
          </div>

          {/* Individual Module Exports */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
              Individual Datasets
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => {
                  exportMaterialsToCSV(materials);
                  showToast('Materials CSV downloaded.');
                }}
                className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-left text-xs font-semibold text-slate-800 cursor-pointer"
              >
                Materials ({materials.length})
              </button>

              <button
                type="button"
                onClick={() => {
                  exportInventoryToCSV(inventory);
                  showToast('Inventory CSV downloaded.');
                }}
                className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-left text-xs font-semibold text-slate-800 cursor-pointer"
              >
                Inventory ({inventory.length})
              </button>

              <button
                type="button"
                onClick={() => {
                  exportInventoryTransactionsToCSV(transactions);
                  showToast('Transactions CSV downloaded.');
                }}
                className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-left text-xs font-semibold text-slate-800 cursor-pointer"
              >
                Transactions ({transactions.length})
              </button>

              <button
                type="button"
                onClick={() => {
                  exportProjectsToCSV(projects);
                  showToast('Projects CSV downloaded.');
                }}
                className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-left text-xs font-semibold text-slate-800 cursor-pointer"
              >
                Projects ({projects.length})
              </button>

              <button
                type="button"
                onClick={() => {
                  exportSubcontractorsToCSV(subcontractors);
                  showToast('Subcontractors CSV downloaded.');
                }}
                className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-left text-xs font-semibold text-slate-800 cursor-pointer"
              >
                Subcontractors ({subcontractors.length})
              </button>

              <button
                type="button"
                onClick={() => {
                  exportOutsourcedServicesToCSV(outsourced);
                  showToast('Outsourced CSV downloaded.');
                }}
                className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-left text-xs font-semibold text-slate-800 cursor-pointer"
              >
                Outsourced ({outsourced.length})
              </button>

              <button
                type="button"
                onClick={() => {
                  exportSuppliersToCSV(suppliers);
                  showToast('Suppliers CSV downloaded.');
                }}
                className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-left text-xs font-semibold text-slate-800 cursor-pointer"
              >
                Suppliers ({suppliers.length})
              </button>

              <button
                type="button"
                onClick={() => {
                  exportMasterExecutiveReportPDF(
                    companyDetails,
                    materials,
                    inventory,
                    transactions,
                    projects,
                    subcontractors,
                    outsourced,
                    suppliers
                  );
                  showToast('Executive PDF downloaded.');
                }}
                className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-left text-xs font-semibold text-slate-800 cursor-pointer"
              >
                Audit PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: USERS */}
      {activeSubTab === 'users' && (
        <div className="space-y-4">
          {/* Pending Account Requests (if any) */}
          {pendingRequests.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
              <span className="text-xs font-bold text-amber-900 uppercase tracking-wider block">
                Pending Access Requests ({pendingRequests.length})
              </span>
              <div className="space-y-1.5">
                {pendingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-2.5 bg-white rounded-lg border border-amber-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-900">{req.name}</span>
                      <span className="text-slate-500 ml-2">({req.email})</span>
                      <span className="text-slate-400 ml-2 font-mono">Role: {req.requestedRole}</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={() => onApproveRequest(req.id)}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold cursor-pointer"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => onRejectRequest(req.id)}
                        className="px-2.5 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded font-semibold cursor-pointer"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* User List White Box */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="p-3.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="Search user..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs w-52"
                />
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as any)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700"
                >
                  <option value="ALL">All Roles</option>
                  <option value="ADMIN">Admin</option>
                  <option value="PROJECT_MANAGER">Project Manager</option>
                  <option value="QUANTITY_SURVEYOR">Quantity Surveyor</option>
                  <option value="PROCUREMENT_OFFICER">Procurement Officer</option>
                  <option value="ESTIMATOR">Estimator</option>
                </select>
              </div>

              <button
                type="button"
                onClick={handleOpenAddUser}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add User</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-800">
                <thead className="bg-slate-50 uppercase text-[10px] text-slate-600 border-b border-slate-200 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Emp ID</th>
                    <th className="py-2.5 px-3">Name</th>
                    <th className="py-2.5 px-3">Email</th>
                    <th className="py-2.5 px-3">Role</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                        {u.employeeId}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        {u.name}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {u.email}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-slate-800">
                          {u.role.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {u.department}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            u.status === 'Active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {u.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="inline-flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditUser(u)}
                            className="p-1 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {u.id !== currentUser.id && (
                            <button
                              type="button"
                              onClick={() => onDeleteUser(u.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add / Edit User Modal */}
          {isUserModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
              <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <h3 className="text-sm font-bold text-slate-900">
                    {editingUserId ? 'Edit User' : 'Add New User'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsUserModalOpen(false)}
                    className="text-slate-400 hover:text-slate-700 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSaveUser} className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Employee ID</label>
                      <input
                        type="text"
                        value={userFormEmpId}
                        onChange={(e) => setUserFormEmpId(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Name</label>
                      <input
                        type="text"
                        value={userFormName}
                        onChange={(e) => setUserFormName(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Email</label>
                    <input
                      type="email"
                      value={userFormEmail}
                      onChange={(e) => setUserFormEmail(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Role</label>
                      <select
                        value={userFormRole}
                        onChange={(e) => setUserFormRole(e.target.value as UserRole)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded"
                      >
                        <option value="ADMIN">Admin</option>
                        <option value="PROJECT_MANAGER">Project Manager</option>
                        <option value="QUANTITY_SURVEYOR">Quantity Surveyor</option>
                        <option value="PROCUREMENT_OFFICER">Procurement Officer</option>
                        <option value="ESTIMATOR">Estimator</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Status</label>
                      <select
                        value={userFormStatus}
                        onChange={(e) => setUserFormStatus(e.target.value as any)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded"
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Department</label>
                    <input
                      type="text"
                      value={userFormDept}
                      onChange={(e) => setUserFormDept(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Password</label>
                    <input
                      type="password"
                      value={userFormPassword}
                      onChange={(e) => setUserFormPassword(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded"
                    />
                  </div>

                  <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setIsUserModalOpen(false)}
                      className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded font-semibold cursor-pointer shadow-sm"
                    >
                      Save User
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 5: APPEARANCE */}
      {activeSubTab === 'appearance' && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
          <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
            Theme
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => handleSelectTheme('light')}
              className={`p-4 rounded-xl border text-left cursor-pointer transition-colors ${
                themeMode === 'light'
                  ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <Sun className="w-5 h-5 text-amber-500 mb-2" />
              <div className="font-bold text-xs text-slate-900">Light</div>
              <span className="text-[11px] text-slate-500">Day mode</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectTheme('dark')}
              className={`p-4 rounded-xl border text-left cursor-pointer transition-colors ${
                themeMode === 'dark'
                  ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <Moon className="w-5 h-5 text-slate-800 mb-2" />
              <div className="font-bold text-xs text-slate-900">Dark</div>
              <span className="text-[11px] text-slate-500">Night mode</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectTheme('system')}
              className={`p-4 rounded-xl border text-left cursor-pointer transition-colors ${
                themeMode === 'system'
                  ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <Monitor className="w-5 h-5 text-blue-500 mb-2" />
              <div className="font-bold text-xs text-slate-900">System</div>
              <span className="text-[11px] text-slate-500">Follow device</span>
            </button>
          </div>
        </div>
      )}

      {/* SUB-TAB 6: SECURITY */}
      {activeSubTab === 'security' && currentUser.role === 'ADMIN' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Box 1: Session Timeout */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                Session Timeout
              </span>
              <div className="flex items-center space-x-2">
                <select
                  value={sessionTimeout}
                  onChange={(e) => {
                    const min = parseInt(e.target.value, 10);
                    setSessionTimeout(min);
                    setStoredTimeoutMinutes(min);
                    showToast(`Timeout set to ${min} minutes.`);
                  }}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                >
                  <option value={15}>15 Minutes</option>
                  <option value={30}>30 Minutes</option>
                  <option value={60}>60 Minutes</option>
                  <option value={120}>2 Hours</option>
                  <option value={480}>8 Hours</option>
                </select>
              </div>
            </div>

            {/* Box 2: Two-Factor Auth */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                Two-Factor Auth (2FA)
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleOpenGoogleAuthSetup}
                  disabled={isSecurityLoading}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-sm"
                >
                  {totpConfigured ? 'Reconfigure 2FA' : 'Set Up 2FA'}
                </button>
                {totpConfigured && (
                  <span className="text-xs text-emerald-600 font-bold">Active</span>
                )}
              </div>
            </div>
          </div>

          {/* Backup Codes */}
          {backupCodes.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Backup Codes
                </span>
                <button
                  type="button"
                  onClick={handleDownloadBackupCodesPdf}
                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-xs font-semibold cursor-pointer"
                >
                  Download PDF
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {backupCodes.map((code, idx) => (
                  <div
                    key={idx}
                    className="p-2 bg-slate-50 border border-slate-200 rounded text-xs font-mono font-bold text-center text-slate-800"
                  >
                    {code}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2FA QR Code Modal */}
          {totpQrModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
              <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4 text-center">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h3 className="text-sm font-bold text-slate-900">Scan QR Code</h3>
                  <button
                    type="button"
                    onClick={() => setTotpQrModalOpen(false)}
                    className="text-slate-400 hover:text-slate-700 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {totpQrDataUrl && (
                  <div className="p-3 bg-white border border-slate-200 rounded-xl inline-block mx-auto">
                    <img src={totpQrDataUrl} alt="2FA QR" className="w-48 h-48 mx-auto" />
                  </div>
                )}

                <form onSubmit={handleConfirmTotp} className="space-y-3 text-xs">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="Enter 6-digit code"
                    value={totpVerifyCode}
                    onChange={(e) => setTotpVerifyCode(e.target.value)}
                    className="w-full text-center tracking-widest text-base font-mono font-bold py-2 border border-slate-300 rounded-lg"
                    autoFocus
                  />
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setTotpQrModalOpen(false)}
                      className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSecurityLoading}
                      className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded font-semibold cursor-pointer shadow-sm"
                    >
                      Verify & Activate
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
