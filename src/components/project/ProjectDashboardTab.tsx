import React, { useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  Percent,
  AlertTriangle,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
  Layers,
  Zap,
  BarChart3,
  Plus,
  Package,
  Wrench,
  Trash2,
  Edit2,
  Clock,
  CheckCircle2,
  SlidersHorizontal,
  FileSpreadsheet,
  Search
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from 'recharts';
import { Project, ProjectDeliverableItem, ProduceItem, MaterialItem } from '../../types';
import { QuickInsertDeliverableModal } from './QuickInsertDeliverableModal';
import { GoogleSearchPreviewModal, GoogleSearchPreviewItem } from '../GoogleSearchPreviewModal';
import { formatCurrency } from '../../utils/currency';
import { getMarginThreshold } from '../../utils/profitabilityMonitor';

interface ProjectDashboardTabProps {
  project: Project;
  produceItems: ProduceItem[];
  materials?: MaterialItem[];
  onUpdateProject: (updatedProject: Project) => void;
  onAddProduceItem?: (item: ProduceItem) => void;
}

const PALETTE = {
  navy: '#003049',
  blue: '#0078d4',
  teal: '#0d9488',
  amber: '#f59e0b',
  slate: '#64748b'
};

export const ProjectDashboardTab: React.FC<ProjectDashboardTabProps> = ({
  project,
  produceItems,
  materials = [],
  onUpdateProject,
  onAddProduceItem
}) => {
  const [isQuickInsertModalOpen, setIsQuickInsertModalOpen] = useState(false);
  const [editingDeliverableId, setEditingDeliverableId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState<number>(1);
  const [editQuotedPrice, setEditQuotedPrice] = useState<number>(0);
  const [googleSearchItem, setGoogleSearchItem] = useState<GoogleSearchPreviewItem | null>(null);

  const analytics = project.analytics;
  const revenue = project.quotedPrice || 0;
  const materialCost = analytics?.materialCost || 0;
  const subcontractorCost = analytics?.subcontractorCost || 0;
  const outsourcedCost = analytics?.outsourcedCost || 0;
  const directCost = analytics?.totalDirectCost || (materialCost + subcontractorCost + outsourcedCost);
  const overheadAndContingency = (analytics?.overheadAmount || 0) + (analytics?.contingencyAmount || 0);
  const totalCost = analytics?.totalProjectCost || (directCost + overheadAndContingency);
  const grossProfit = analytics?.grossProfit || (revenue - directCost);
  const grossMarginPct = analytics?.grossMarginPct || (revenue > 0 ? (grossProfit / revenue) * 100 : 0);
  const netProfit = analytics?.netProfit || (revenue - totalCost);
  const netMarginPct = analytics?.netMarginPct || (revenue > 0 ? (netProfit / revenue) * 100 : 0);
  const healthScore = analytics?.healthScore ?? 85;

  const costDistributionData = [
    { name: 'Materials', value: materialCost, color: PALETTE.navy },
    { name: 'Subcontractors', value: subcontractorCost, color: PALETTE.blue },
    { name: 'Tariffs', value: outsourcedCost, color: PALETTE.teal },
    { name: 'Overhead', value: overheadAndContingency, color: PALETTE.amber }
  ].filter(d => d.value > 0);

  const phaseBarData = (project.phases || []).map((phase) => {
    return {
      name: phase.name.split(':')[0],
      Budget: phase.budget || phase.plannedCost || 0,
      Actual: phase.actualCost,
      Variance: (phase.budget || phase.plannedCost || 0) - phase.actualCost
    };
  });

  const deliverables = project.deliverables || [];

  // Deliverables financial summary
  const deliverablesSummary = React.useMemo(() => {
    const totalRev = deliverables.reduce((sum, d) => sum + (d.totalRevenue || 0), 0);
    const totalCst = deliverables.reduce((sum, d) => sum + (d.totalCost || 0), 0);
    const profit = totalRev - totalCst;
    const margin = totalRev > 0 ? (profit / totalRev) * 100 : 0;
    const productCount = deliverables.filter(d => d.type === 'product').length;
    const serviceCount = deliverables.filter(d => d.type === 'service').length;
    return {
      totalRev,
      totalCst,
      profit,
      margin,
      productCount,
      serviceCount,
      totalCount: deliverables.length
    };
  }, [deliverables]);

  // Handle adding deliverable
  const handleAddDeliverable = (item: ProjectDeliverableItem) => {
    const updatedDeliverables = [...deliverables, item];
    const updatedQuotedPrice = updatedDeliverables.reduce((sum, d) => sum + d.totalRevenue, 0);

    onUpdateProject({
      ...project,
      deliverables: updatedDeliverables,
      quotedPrice: updatedQuotedPrice > 0 ? updatedQuotedPrice : project.quotedPrice
    });
  };

  // Handle removing deliverable
  const handleRemoveDeliverable = (id: string) => {
    const updatedDeliverables = deliverables.filter(d => d.id !== id);
    onUpdateProject({
      ...project,
      deliverables: updatedDeliverables
    });
  };

  // Handle start edit
  const handleStartEdit = (d: ProjectDeliverableItem) => {
    setEditingDeliverableId(d.id);
    setEditQty(d.quantity);
    setEditQuotedPrice(d.quotedPrice);
  };

  // Handle save edit
  const handleSaveEdit = (id: string) => {
    const updatedDeliverables = deliverables.map(d => {
      if (d.id === id) {
        const totRev = editQuotedPrice * editQty;
        const totCost = d.costPrice * editQty;
        const margin = totRev > 0 ? ((totRev - totCost) / totRev) * 100 : 0;
        return {
          ...d,
          quantity: editQty,
          quotedPrice: editQuotedPrice,
          totalRevenue: totRev,
          totalCost: totCost,
          marginPct: Number(margin.toFixed(1))
        };
      }
      return d;
    });

    setEditingDeliverableId(null);
    onUpdateProject({
      ...project,
      deliverables: updatedDeliverables
    });
  };

  return (
    <div className="space-y-4">
      {/* 1. KPI CARDS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Revenue Tile */}
        <div className="bg-gradient-to-br from-[#003049] to-[#004e8a] text-white p-4 rounded-xl shadow-xs border border-blue-900 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-200">Revenue</span>
            <DollarSign className="w-4 h-4 text-blue-200" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">${revenue.toLocaleString()}</div>
          <div className="flex items-center space-x-1.5 text-xs text-blue-200 mt-2">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>Agreed Price</span>
          </div>
        </div>

        {/* Total Cost Tile */}
        <div className="bg-white dark:bg-[#0b101b] p-4 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Cost</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">
            ${totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center justify-between font-mono">
            <span>Direct: ${directCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            <span>Overhead: ${overheadAndContingency.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </div>
        </div>

        {/* Gross Margin Tile */}
        <div className={`p-4 rounded-xl shadow-xs border flex flex-col justify-between ${
          grossMarginPct < getMarginThreshold()
            ? 'bg-amber-50/20 border-amber-300 dark:border-amber-700/60 dark:bg-amber-950/20'
            : 'bg-white dark:bg-[#0b101b] border-slate-200 dark:border-slate-800'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Gross Margin</span>
            {grossMarginPct < getMarginThreshold() ? (
              <span className="flex items-center space-x-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>Low</span>
              </span>
            ) : (
              <Percent className="w-4 h-4 text-[#0078d4]" />
            )}
          </div>
          <div className="flex items-baseline space-x-2 mt-2">
            <div className={`text-2xl font-bold ${
              grossMarginPct < getMarginThreshold()
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-emerald-600 dark:text-emerald-400'
            }`}>
              {grossMarginPct.toFixed(1)}%
            </div>
            <span className="text-xs text-slate-500 font-mono">Target: {project.targetMarginPct}%</span>
          </div>
          <div className="flex items-center justify-between text-xs mt-2 font-medium">
            {grossMarginPct >= project.targetMarginPct ? (
              <span className="flex items-center text-emerald-600 dark:text-emerald-400">
                <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                +{(grossMarginPct - project.targetMarginPct).toFixed(1)}%
              </span>
            ) : (
              <span className="flex items-center text-red-500">
                <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
                {(grossMarginPct - project.targetMarginPct).toFixed(1)}%
              </span>
            )}
            {grossMarginPct < getMarginThreshold() && (
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                Below {getMarginThreshold()}% limit
              </span>
            )}
          </div>
        </div>

        {/* Health Score Tile */}
        <div className="bg-white dark:bg-[#0b101b] p-4 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Health Index</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline space-x-1.5 mt-2">
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{healthScore}</div>
            <span className="text-xs text-slate-400">/ 100</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
            <div className="h-full rounded-full bg-[#0078d4]" style={{ width: `${healthScore}%` }} />
          </div>
        </div>
      </div>

      {/* 2. VISUAL CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Cost Breakdown */}
        <div className="lg:col-span-5 bg-white dark:bg-[#0b101b] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
                <Layers className="w-4 h-4 text-[#0078d4]" />
                <span>Cost Breakdown</span>
              </h3>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded">
                Live
              </span>
            </div>

            <div className="h-44 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={costDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={42}
                    outerRadius={68}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {costDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [`$${Number(val).toLocaleString()}`, 'Cost']}
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#cbd5e1',
                      borderRadius: '8px',
                      fontSize: '11px',
                      color: '#0f172a'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div className="flex items-center space-x-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <div className="w-2.5 h-2.5 rounded-full bg-[#003049]" />
              <div>
                <p className="text-slate-400 text-[10px]">Materials</p>
                <p className="font-bold text-slate-800 dark:text-slate-200">${materialCost.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <div className="w-2.5 h-2.5 rounded-full bg-[#0078d4]" />
              <div>
                <p className="text-slate-400 text-[10px]">Subcontractors</p>
                <p className="font-bold text-slate-800 dark:text-slate-200">${subcontractorCost.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <div className="w-2.5 h-2.5 rounded-full bg-teal-600" />
              <div>
                <p className="text-slate-400 text-[10px]">Tariffs</p>
                <p className="font-bold text-slate-800 dark:text-slate-200">${outsourcedCost.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <div>
                <p className="text-slate-400 text-[10px]">Overheads</p>
                <p className="font-bold text-slate-800 dark:text-slate-200">${overheadAndContingency.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Phase Budget vs Actual */}
        <div className="lg:col-span-7 bg-white dark:bg-[#0b101b] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
                <BarChart3 className="w-4 h-4 text-[#0078d4]" />
                <span>Phases: Budget vs Actual</span>
              </h3>
              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded">
                Audited
              </span>
            </div>

            <div className="h-44 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={phaseBarData} margin={{ top: 8, right: 8, left: -15, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#64748B" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={10} tickFormatter={v => `$${v / 1000}k`} />
                  <Tooltip
                    formatter={(val: any) => [`$${Number(val).toLocaleString()}`, '']}
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#cbd5e1',
                      borderRadius: '8px',
                      fontSize: '11px',
                      color: '#0f172a'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '4px' }} />
                  <Bar dataKey="Budget" fill="#003049" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Actual" fill="#0078d4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-200 dark:border-slate-800 mt-2 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <Zap className="w-4 h-4 text-emerald-500" />
              <span className="text-slate-700 dark:text-slate-300 font-medium">Budget Threshold Status</span>
            </div>
            <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold font-mono">Optimal</span>
          </div>
        </div>
      </div>

      {/* 3. SENSITIVITY TEST */}
      {analytics?.sensitivity && (
        <div className="bg-white dark:bg-[#0b101b] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
              <ShieldAlert className="w-4 h-4 text-[#0078d4]" />
              <span>Sensitivity Analysis</span>
            </h3>
            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded">
              Scenario
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 text-xs">
            <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 dark:text-slate-200">Material +5% Inflation</span>
                <span className="text-red-500 font-bold font-mono">
                  +${analytics.sensitivity.materialInflation5Pct.costImpact.toLocaleString()}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 text-[11px]">Net Margin:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                  {netMarginPct.toFixed(1)}% &rarr; {analytics.sensitivity.materialInflation5Pct.revisedNetMarginPct}%
                </span>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 dark:text-slate-200">Labour +8% Wage Hike</span>
                <span className="text-red-500 font-bold font-mono">
                  +${analytics.sensitivity.labourRateHike8Pct.costImpact.toLocaleString()}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 text-[11px]">Net Margin:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                  {netMarginPct.toFixed(1)}% &rarr; {analytics.sensitivity.labourRateHike8Pct.revisedNetMarginPct}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. DELIVERABLES LIST */}
      <div className="bg-white dark:bg-[#0b101b] rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
        <div className="p-3 bg-white dark:bg-[#0b101b] border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <Package className="w-4 h-4 text-[#0078d4]" />
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Deliverables
            </h3>
            <span className="bg-blue-50 dark:bg-blue-950/70 text-[#0078d4] dark:text-sky-300 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded text-[10px] font-bold">
              {deliverablesSummary.totalCount} items
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsQuickInsertModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#0078d4] hover:bg-[#006cbd] text-white text-xs font-bold rounded-lg transition-colors shadow-2xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Item</span>
          </button>
        </div>

        {/* Deliverables Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-3 font-bold">Item</th>
                <th className="py-2.5 px-2 font-bold">Type</th>
                <th className="py-2.5 px-3 font-bold">Category</th>
                <th className="py-2.5 px-2 font-bold">Qty</th>
                <th className="py-2.5 px-2.5 font-bold">Cost</th>
                <th className="py-2.5 px-2.5 font-bold">Price</th>
                <th className="py-2.5 px-2 font-bold">Margin</th>
                <th className="py-2.5 px-3 font-bold text-right">Subtotal</th>
                <th className="py-2.5 px-2.5 font-bold text-center">Status</th>
                <th className="py-2.5 px-2 font-bold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {deliverables.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    <p className="text-xs">No deliverables added.</p>
                    <button
                      type="button"
                      onClick={() => setIsQuickInsertModalOpen(true)}
                      className="mt-2 text-xs font-bold text-[#0078d4] hover:underline cursor-pointer"
                    >
                      + Add Deliverable
                    </button>
                  </td>
                </tr>
              ) : (
                deliverables.map(item => {
                  const isEditing = editingDeliverableId === item.id;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-2 px-3">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-bold text-slate-900 dark:text-slate-100">{item.name}</span>
                          <button
                            type="button"
                            onClick={() => setGoogleSearchItem({
                              id: item.id,
                              code: item.code,
                              name: item.name,
                              category: item.category,
                              rate: item.quotedPrice,
                              unit: item.unit
                            })}
                            className="p-1 text-slate-400 hover:text-[#0078d4] hover:bg-sky-50 dark:hover:bg-slate-800 rounded cursor-pointer transition-colors shrink-0"
                            title={`Search Google & Lens for "${item.name}"`}
                          >
                            <Search className="w-3.5 h-3.5 text-[#0078d4]" />
                          </button>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">{item.code}</div>
                      </td>

                      <td className="py-2 px-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                            item.type === 'product'
                              ? 'bg-blue-100 dark:bg-blue-950 text-[#0078d4] dark:text-sky-300'
                              : 'bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300'
                          }`}
                        >
                          {item.type}
                        </span>
                      </td>

                      <td className="py-2 px-3 text-slate-600 dark:text-slate-400">
                        {item.category}
                      </td>

                      <td className="py-2 px-2">
                        {isEditing ? (
                          <input
                            type="number"
                            min={1}
                            value={editQty}
                            onChange={e => setEditQty(Math.max(1, Number(e.target.value)))}
                            className="w-16 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-0.5 text-xs text-slate-900 dark:text-slate-100"
                          />
                        ) : (
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {item.quantity} {item.unit}
                          </span>
                        )}
                      </td>

                      <td className="py-2 px-2.5 text-slate-600 dark:text-slate-400 font-mono">
                        {formatCurrency(item.costPrice, item.currency || project.currency)}
                      </td>

                      <td className="py-2 px-2.5 font-mono">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editQuotedPrice}
                            onChange={e => setEditQuotedPrice(Number(e.target.value))}
                            className="w-24 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-0.5 text-xs text-slate-900 dark:text-slate-100"
                          />
                        ) : (
                          <span className="text-slate-900 dark:text-slate-100 font-bold">
                            {formatCurrency(item.quotedPrice, item.currency || project.currency)}
                          </span>
                        )}
                      </td>

                      <td className="py-2 px-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${
                            item.marginPct >= 30
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-blue-100 text-[#0078d4] dark:bg-blue-950 dark:text-sky-300'
                          }`}
                        >
                          {item.marginPct}%
                        </span>
                      </td>

                      <td className="py-2 px-3 text-right font-bold text-slate-900 dark:text-slate-100 font-mono">
                        {formatCurrency(item.totalRevenue, item.currency || project.currency)}
                      </td>

                      <td className="py-2 px-2.5 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {item.status || 'Planned'}
                        </span>
                      </td>

                      <td className="py-2 px-2 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          {isEditing ? (
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(item.id)}
                              className="px-2 py-0.5 bg-[#0078d4] text-white text-[10px] font-bold rounded cursor-pointer"
                            >
                              Save
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleStartEdit(item)}
                              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveDeliverable(item.id)}
                            className="p-1 text-slate-400 hover:text-red-500 cursor-pointer"
                            title="Remove"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Summary */}
        {deliverables.length > 0 && (
          <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="text-slate-700 dark:text-slate-300 font-semibold">
              Total Quoted: <span className="font-bold text-[#0078d4] dark:text-sky-300">{formatCurrency(deliverablesSummary?.totalRev, project.currency)}</span>
            </div>
            <div className="flex items-center space-x-4 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              <span>Cost: {formatCurrency(deliverablesSummary?.totalCst, project.currency)}</span>
              <span>Margin: {(deliverablesSummary?.margin || 0).toFixed(1)}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Quick Insert Deliverable Modal (Full-Screen FXTT Table) */}
      <QuickInsertDeliverableModal
        isOpen={isQuickInsertModalOpen}
        onClose={() => setIsQuickInsertModalOpen(false)}
        project={project}
        produceItems={produceItems}
        materials={materials}
        projectCurrency={project.currency}
        onAddDeliverable={handleAddDeliverable}
        onAddProduceItem={onAddProduceItem}
      />

      {/* Google & Google Lens Quick Search Preview Modal */}
      {googleSearchItem && (
        <GoogleSearchPreviewModal
          isOpen={Boolean(googleSearchItem)}
          onClose={() => setGoogleSearchItem(null)}
          item={googleSearchItem}
        />
      )}
    </div>
  );
};
