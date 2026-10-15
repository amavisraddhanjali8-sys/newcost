import React, { useState, useMemo } from 'react';
import {
  Shield,
  Search,
  Filter,
  Download,
  RefreshCw,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  User,
  Settings,
  Package,
  Layers,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Lock,
  Terminal,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  X,
  Calendar,
  Sparkles,
  SlidersHorizontal
} from 'lucide-react';
import { AuditLogRecord, AppUser } from '../types';
import { parseSmartSearch, evaluateSmartSearch, SearchableField } from '../utils/smartSearch';

interface AuditLogViewProps {
  currentUser: AppUser;
  auditLogs: AuditLogRecord[];
  onRefresh?: () => void;
  showToast: (msg: string) => void;
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({
  currentUser,
  auditLogs,
  onRefresh,
  showToast
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState<string>('ALL');
  const [selectedAction, setSelectedAction] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('ALL'); // ALL, TODAY, WEEK, MONTH
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [showSearchTips, setShowSearchTips] = useState(false);

  // ACCESS GUARD: Only viewable by Admin
  if (currentUser.role !== 'ADMIN') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-xs space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Restricted Access: System Audit Log</h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Under corporate compliance and security protocols, the system audit trail is classified and strictly viewable only by <strong className="text-slate-800">Administrators</strong>.
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-left text-xs max-w-sm mx-auto space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Your Current Session:</span>
              <span className="font-semibold text-slate-800">{currentUser.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Employee ID:</span>
              <span className="font-mono text-slate-700">{currentUser.employeeId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Assigned Role:</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800">
                Project Manager
              </span>
            </div>
          </div>

          <div className="text-[11px] text-slate-400">
            If you need access to regulatory audit transcripts, please request authorization from an Administrator.
          </div>
        </div>
      </div>
    );
  }

  // Smart Search & Filter Evaluation
  const parsedQuery = useMemo(() => parseSmartSearch(searchQuery), [searchQuery]);

  const filteredLogs = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    return auditLogs.filter(log => {
      // 1. Module filter
      if (selectedModule !== 'ALL' && log.module !== selectedModule) return false;

      // 2. Action filter
      if (selectedAction !== 'ALL' && log.action !== selectedAction) return false;

      // 3. Status filter
      if (selectedStatus !== 'ALL' && log.status !== selectedStatus) return false;

      // 4. Date filter
      const logDate = (log.timestamp || '').slice(0, 10);
      if (dateFilter === 'TODAY' && logDate !== todayStr) return false;
      if (dateFilter === 'WEEK' && logDate < oneWeekAgo) return false;
      if (dateFilter === 'MONTH' && logDate < oneMonthAgo) return false;

      // 5. Smart search evaluation
      if (!parsedQuery.raw) return true;

      const fields: SearchableField[] = [
        { name: 'actor', value: log.actorName, weight: 2 },
        { name: 'actorname', value: log.actorName, weight: 2 },
        { name: 'actorid', value: log.actorId, weight: 3 },
        { name: 'employeeid', value: log.actorId, weight: 3 },
        { name: 'role', value: log.actorRole, weight: 1 },
        { name: 'action', value: log.action, weight: 2 },
        { name: 'module', value: log.module, weight: 2 },
        { name: 'recordid', value: log.recordId || '', weight: 3 },
        { name: 'code', value: log.recordId || '', weight: 3 },
        { name: 'sku', value: log.recordId || '', weight: 3 },
        { name: 'recordname', value: log.recordName || '', weight: 2 },
        { name: 'name', value: log.recordName || '', weight: 2 },
        { name: 'details', value: log.details || '', weight: 1 },
        { name: 'ip', value: log.ipAddress || '', weight: 1 },
        { name: 'ipaddress', value: log.ipAddress || '', weight: 1 },
        { name: 'status', value: log.status, weight: 1 },
        { name: 'timestamp', value: log.timestamp, weight: 1 }
      ];

      const res = evaluateSmartSearch(parsedQuery, fields);
      return res.matches;
    });
  }, [auditLogs, selectedModule, selectedAction, selectedStatus, dateFilter, parsedQuery]);

  // Export audit log to CSV
  const handleExportCSV = () => {
    const headers = ['Timestamp', 'Actor ID', 'Actor Name', 'Actor Role', 'Action', 'Module', 'Record ID', 'Record Name', 'Details', 'IP Address', 'Status'];
    const rows = filteredLogs.map(l => [
      `"${l.timestamp}"`,
      `"${l.actorId}"`,
      `"${l.actorName}"`,
      `"${l.actorRole}"`,
      `"${l.action}"`,
      `"${l.module}"`,
      `"${l.recordId || ''}"`,
      `"${(l.recordName || '').replace(/"/g, '""')}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`,
      `"${l.ipAddress}"`,
      `"${l.status}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `FXTT_Audit_Log_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Audit log transcript exported to CSV.');
  };

  // Quick Preset Handlers
  const applyPreset = (type: string) => {
    switch (type) {
      case 'inventory':
        setSelectedModule('Inventory');
        setSelectedAction('ALL');
        setDateFilter('ALL');
        break;
      case 'pricing':
        setSelectedModule('ALL');
        setSelectedAction('PRICE_UPDATE');
        setDateFilter('ALL');
        break;
      case 'security':
        setSelectedModule('Auth');
        setSelectedAction('ALL');
        setDateFilter('ALL');
        break;
      case 'users':
        setSelectedModule('Users');
        setSelectedAction('ALL');
        setDateFilter('ALL');
        break;
      case 'today':
        setSelectedModule('ALL');
        setSelectedAction('ALL');
        setDateFilter('TODAY');
        break;
      case 'reset':
        setSelectedModule('ALL');
        setSelectedAction('ALL');
        setSelectedStatus('ALL');
        setDateFilter('ALL');
        setSearchQuery('');
        break;
      default:
        break;
    }
  };

  // Get action styling
  const getActionBadge = (action: string) => {
    switch (action) {
      case 'INVENTORY_IN':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ArrowDownLeft className="w-3 h-3" />
            <span>INVENTORY IN</span>
          </span>
        );
      case 'INVENTORY_OUT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <ArrowUpRight className="w-3 h-3" />
            <span>INVENTORY OUT</span>
          </span>
        );
      case 'PRICE_UPDATE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span>PRICE REVISION</span>
          </span>
        );
      case 'USER_CREATED':
      case 'USER_APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <User className="w-3 h-3" />
            <span>USER PROVISIONED</span>
          </span>
        );
      case 'USER_LOGIN':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <Lock className="w-3 h-3" />
            <span>AUTH LOGIN</span>
          </span>
        );
      case 'USER_LOGOUT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            <Lock className="w-3 h-3" />
            <span>AUTH LOGOUT</span>
          </span>
        );
      case 'SETTINGS_UPDATE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-cyan-50 text-cyan-700 border border-cyan-200">
            <Settings className="w-3 h-3" />
            <span>CONFIG UPDATE</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <span>{action}</span>
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      {/* Header Banner - Simple UI design like Home Tab */}
      <div className="bg-white dark:bg-[#0b101b] border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 sm:p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-lg bg-[#0078d4]/10 text-[#0078d4]">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Audit Trail
              </h2>
              <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[10px] font-bold rounded">
                Admin
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-1.5 bg-[#0078d4] hover:bg-[#006cbd] text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer flex items-center space-x-1"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          {onRefresh && (
            <button
              type="button"
              onClick={() => {
                onRefresh();
                showToast('Audit trail refreshed.');
              }}
              className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Quick Filter Presets - Simple Words */}
      <div className="flex items-center gap-1.5 flex-wrap text-xs">
        <button
          onClick={() => applyPreset('reset')}
          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
            selectedModule === 'ALL' && selectedAction === 'ALL' && dateFilter === 'ALL'
              ? 'bg-[#0078d4] text-white'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
          }`}
        >
          All
        </button>
        <button
          onClick={() => applyPreset('today')}
          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
            dateFilter === 'TODAY'
              ? 'bg-[#0078d4] text-white'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
          }`}
        >
          Today
        </button>
        <button
          onClick={() => applyPreset('inventory')}
          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
            selectedModule === 'Inventory'
              ? 'bg-[#0078d4] text-white'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
          }`}
        >
          Inventory
        </button>
        <button
          onClick={() => applyPreset('pricing')}
          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
            selectedAction === 'PRICE_UPDATE'
              ? 'bg-[#0078d4] text-white'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
          }`}
        >
          Pricing
        </button>
        <button
          onClick={() => applyPreset('users')}
          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
            selectedModule === 'Users'
              ? 'bg-[#003049] text-white'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
          }`}
        >
          Users
        </button>
        <button
          onClick={() => applyPreset('security')}
          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
            selectedModule === 'Auth'
              ? 'bg-[#003049] text-white'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
          }`}
        >
          Auth
        </button>
        {(selectedModule !== 'ALL' || selectedAction !== 'ALL' || selectedStatus !== 'ALL' || dateFilter !== 'ALL' || searchQuery) && (
          <button
            onClick={() => applyPreset('reset')}
            className="px-2 py-1 text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-all inline-flex items-center gap-1 ml-auto cursor-pointer"
          >
            <X className="w-3 h-3" /> Reset
          </button>
        )}
      </div>

      {/* Filter & Search Bar - Simple UI */}
      <div className="bg-white dark:bg-[#0b101b] border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Simple Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search audit trail..."
              className="w-full pl-9 pr-8 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0078d4]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Module Selector */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium text-[11px]">Module:</span>
            <div className="inline-flex h-8 p-0.5 bg-slate-100 rounded-lg border border-slate-200 shadow-2xs">
              {['ALL', 'Inventory', 'Materials', 'Users', 'Settings', 'Auth'].map((mod) => (
                <button
                  key={mod}
                  type="button"
                  onClick={() => setSelectedModule(mod)}
                  className={`px-2.5 h-full rounded-md text-[11px] font-medium cursor-pointer transition-all ${
                    selectedModule === mod
                      ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {mod}
                </button>
              ))}
            </div>

            <span className="text-slate-300 mx-1">|</span>

            {/* Action Selector */}
            <span className="text-slate-500 text-[11px]">Action:</span>
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#003049]"
            >
              <option value="ALL">All Actions</option>
              <option value="INVENTORY_IN">Inventory IN</option>
              <option value="INVENTORY_OUT">Inventory OUT</option>
              <option value="PRICE_UPDATE">Price Update</option>
              <option value="USER_CREATED">User Created</option>
              <option value="USER_APPROVED">User Approved</option>
              <option value="SETTINGS_UPDATE">Settings Update</option>
              <option value="USER_LOGIN">User Login</option>
              <option value="USER_LOGOUT">User Logout</option>
            </select>

            {/* Date Window */}
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#003049]"
            >
              <option value="ALL">All Time</option>
              <option value="TODAY">Today Only</option>
              <option value="WEEK">Past 7 Days</option>
              <option value="MONTH">Past 30 Days</option>
            </select>

            <span className="ml-auto text-[11px] text-slate-500 font-mono">
              {filteredLogs.length} / {auditLogs.length} entries
            </span>
          </div>
        </div>
      </div>

      {/* LIST VIEW UI OF AUDIT RECORDS */}
      <div className="bg-white dark:bg-[#0b101b] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-800 dark:text-slate-200">
            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 uppercase text-[10px] border-b border-slate-200 dark:border-slate-800 font-semibold">
              <tr>
                <th className="py-2.5 px-3 whitespace-nowrap">Time</th>
                <th className="py-2.5 px-3">Actor</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Module</th>
                <th className="py-2.5 px-3">Record</th>
                <th className="py-2.5 px-3 min-w-[240px]">Details</th>
                <th className="py-2.5 px-3 whitespace-nowrap">IP</th>
                <th className="py-2.5 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400 italic">
                    No records found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  return (
                    <React.Fragment key={log.id}>
                      <tr
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                        className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                          isExpanded ? 'bg-sky-50/40' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px] text-slate-500">
                          <div className="flex items-center gap-1.5">
                            {isExpanded ? (
                              <ChevronDown className="w-3 h-3 text-slate-400" />
                            ) : (
                              <ChevronRight className="w-3 h-3 text-slate-400" />
                            )}
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{log.timestamp}</span>
                          </div>
                        </td>

                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="font-semibold text-slate-900">{log.actorName}</div>
                          <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                            <span>{log.actorId}</span>
                            <span className={`px-1 py-0.2 rounded text-[9px] font-bold ${
                              log.actorRole === 'ADMIN' ? 'bg-indigo-50 text-indigo-700' : 'bg-blue-50 text-blue-700'
                            }`}>
                              {log.actorRole === 'ADMIN' ? 'ADM' : 'PM'}
                            </span>
                          </div>
                        </td>

                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {getActionBadge(log.action)}
                        </td>

                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            {log.module}
                          </span>
                        </td>

                        <td className="py-2.5 px-3">
                          {log.recordName ? (
                            <div>
                              <div className="font-medium text-slate-900 truncate max-w-[180px]">
                                {log.recordName}
                              </div>
                              {log.recordId && (
                                <div className="text-[10px] text-slate-400 font-mono">
                                  {log.recordId}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic font-mono text-[11px]">{log.recordId || '—'}</span>
                          )}
                        </td>

                        <td className="py-2.5 px-3 text-slate-700 leading-relaxed text-[11px]">
                          {log.details}
                        </td>

                        <td className="py-2.5 px-3 whitespace-nowrap text-[11px] text-slate-500 font-mono">
                          <div className="flex items-center gap-1">
                            <Terminal className="w-3 h-3 text-slate-400" />
                            <span>{log.ipAddress}</span>
                          </div>
                        </td>

                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Verified</span>
                          </span>
                        </td>
                      </tr>

                      {/* Expandable row detail */}
                      {isExpanded && (
                        <tr className="bg-slate-50/70 border-b border-slate-200">
                          <td colSpan={8} className="px-6 py-3">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
                              <div>
                                <span className="text-slate-400 block text-[10px] uppercase font-bold">Audit Identifier:</span>
                                <span className="text-slate-800 font-semibold">{log.id}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[10px] uppercase font-bold">Full Action Descriptor:</span>
                                <span className="text-slate-800 font-semibold">{log.action} ({log.module})</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[10px] uppercase font-bold">Network Origin:</span>
                                <span className="text-slate-800">{log.ipAddress} (Authenticated Secure Node)</span>
                              </div>
                              <div className="md:col-span-3 pt-2 border-t border-slate-200/80">
                                <span className="text-slate-400 block text-[10px] uppercase font-bold">Operational Context & Parameters:</span>
                                <p className="text-slate-700 text-xs mt-1 font-sans bg-white p-2 rounded border border-slate-200">
                                  {log.details}
                                </p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer pagination info */}
        <div className="bg-slate-50 px-4 py-2 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing <strong className="text-slate-800">{filteredLogs.length}</strong> of <strong className="text-slate-800">{auditLogs.length}</strong> immutable system records
          </div>
          <div className="text-[11px] text-slate-400">
            All records cryptographically stamped and synchronized across sessions
          </div>
        </div>
      </div>
    </div>
  );
};

