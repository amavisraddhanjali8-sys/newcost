import React, { useState, useEffect, useRef } from 'react';
import { Bell, AlertTriangle, AlertCircle, Package, Check, X, SlidersHorizontal, ChevronRight } from 'lucide-react';
import { Project, InventoryItem } from '../types';
import {
  SystemAlert,
  compileSystemAlerts,
  getMarginThreshold,
  setMarginThreshold,
  dismissAlert,
  resetDismissedAlerts
} from '../utils/profitabilityMonitor';

interface NotificationCenterDropdownProps {
  projects: Project[];
  inventory: InventoryItem[];
  selectedProject?: Project | null;
  onSelectProject?: (project: Project) => void;
  onNavigateToTab?: (tab: any) => void;
}

export const NotificationCenterDropdown: React.FC<NotificationCenterDropdownProps> = ({
  projects,
  inventory,
  selectedProject,
  onSelectProject,
  onNavigateToTab
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [threshold, setLocalThreshold] = useState<number>(() => getMarginThreshold());
  const [activeFilter, setActiveFilter] = useState<'all' | 'margin' | 'budget' | 'inventory'>('all');
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Refresh alerts whenever projects, inventory, or threshold changes
  const refreshAlerts = () => {
    const list = compileSystemAlerts(projects, inventory, threshold);
    setAlerts(list);
  };

  useEffect(() => {
    refreshAlerts();
  }, [projects, inventory, threshold]);

  // Listen to global changes
  useEffect(() => {
    const handleThresholdChange = (e: any) => {
      if (e.detail?.threshold !== undefined) {
        setLocalThreshold(e.detail.threshold);
      }
    };
    const handleAlertsUpdated = () => {
      refreshAlerts();
    };

    window.addEventListener('margin-threshold-changed', handleThresholdChange);
    window.addEventListener('system-alerts-updated', handleAlertsUpdated);

    return () => {
      window.removeEventListener('margin-threshold-changed', handleThresholdChange);
      window.removeEventListener('system-alerts-updated', handleAlertsUpdated);
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleThresholdUpdate = (newVal: number) => {
    const clamped = Math.max(0, Math.min(95, newVal));
    setLocalThreshold(clamped);
    setMarginThreshold(clamped);
  };

  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    dismissAlert(id);
    refreshAlerts();
  };

  const handleClearAll = () => {
    alerts.forEach((a) => dismissAlert(a.id));
    refreshAlerts();
  };

  const handleRestore = () => {
    resetDismissedAlerts();
    refreshAlerts();
  };

  const handleAlertClick = (alert: SystemAlert) => {
    setIsOpen(false);
    if (alert.type === 'margin' || alert.type === 'budget') {
      if (alert.projectId) {
        const found = projects.find((p) => p.id === alert.projectId);
        if (found && onSelectProject) {
          onSelectProject(found);
        }
      }
      if (onNavigateToTab) {
        onNavigateToTab('project-home');
      }
    } else if (alert.type === 'inventory') {
      if (onNavigateToTab) {
        onNavigateToTab('inventory');
      }
    }
  };

  const filteredAlerts = alerts.filter((a) => {
    if (activeFilter === 'all') return true;
    return a.type === activeFilter;
  });

  const marginAlertCount = alerts.filter((a) => a.type === 'margin').length;
  const budgetAlertCount = alerts.filter((a) => a.type === 'budget').length;
  const stockAlertCount = alerts.filter((a) => a.type === 'inventory').length;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        id="notification-bell-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="relative h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center space-x-1.5 text-xs font-semibold transition-all cursor-pointer shadow-2xs"
        title="System Alerts & Margin Monitor"
      >
        <Bell className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
        {alerts.length > 0 && (
          <span className="flex items-center justify-center min-w-4 h-4 px-1 rounded-full text-[10px] font-bold bg-amber-500 text-white leading-none">
            {alerts.length}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in-50 duration-100">
          {/* Header Bar */}
          <div className="px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">Alerts</span>
              {alerts.length > 0 && (
                <span className="text-[10px] font-semibold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded">
                  {alerts.length} active
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {alerts.length > 0 ? (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                >
                  Clear all
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleRestore}
                  className="text-[11px] text-blue-600 dark:text-sky-400 hover:underline cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* User-Defined Margin Threshold Control */}
          <div className="px-3.5 py-2 bg-amber-50/50 dark:bg-amber-950/20 border-b border-amber-100 dark:border-amber-900/40 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-1.5 text-amber-900 dark:text-amber-200">
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span className="font-medium">Warn if margin below:</span>
            </div>
            <div className="flex items-center space-x-1 bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800 rounded px-1.5 py-0.5">
              <button
                type="button"
                onClick={() => handleThresholdUpdate(threshold - 5)}
                className="w-4 h-4 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                title="Decrease"
              >
                -
              </button>
              <input
                type="number"
                min="0"
                max="90"
                value={threshold}
                onChange={(e) => handleThresholdUpdate(Number(e.target.value))}
                className="w-8 text-center text-xs font-bold text-amber-700 dark:text-amber-300 bg-transparent focus:outline-hidden"
              />
              <span className="text-[10px] text-slate-400 font-mono">%</span>
              <button
                type="button"
                onClick={() => handleThresholdUpdate(threshold + 5)}
                className="w-4 h-4 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                title="Increase"
              >
                +
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 flex items-center space-x-1.5 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              All ({alerts.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('margin')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                activeFilter === 'margin'
                  ? 'bg-amber-600 text-white font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Margin ({marginAlertCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('budget')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                activeFilter === 'budget'
                  ? 'bg-red-600 text-white font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Budget ({budgetAlertCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('inventory')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                activeFilter === 'inventory'
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Stock ({stockAlertCount})
            </button>
          </div>

          {/* Alerts List */}
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {filteredAlerts.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-slate-400">
                <Check className="w-5 h-5 mx-auto mb-1 text-emerald-500 opacity-80" />
                No active alerts. All margins and budgets are healthy.
              </div>
            ) : (
              filteredAlerts.map((alert) => {
                let icon = <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />;
                if (alert.type === 'budget') {
                  icon = <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />;
                } else if (alert.type === 'inventory') {
                  icon = <Package className="w-4 h-4 text-blue-500 shrink-0" />;
                }

                return (
                  <div
                    key={alert.id}
                    onClick={() => handleAlertClick(alert)}
                    className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer flex items-start space-x-2.5 transition-colors group"
                  >
                    <div className="mt-0.5">{icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {alert.title}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleDismiss(alert.id, e)}
                          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded transition-opacity cursor-pointer"
                          title="Dismiss"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-snug">
                        {alert.message}
                      </div>
                      <div className="mt-1.5 flex items-center space-x-2 text-[10px] text-blue-600 dark:text-sky-400 font-medium">
                        <span>Open Details</span>
                        <ChevronRight className="w-3 h-3" />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
