import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import { Project } from '../../types';
import {
  calculatePhaseMarginTrend,
  getMarginThreshold
} from '../../utils/profitabilityMonitor';
import { formatCurrency } from '../../utils/currency';

interface HistoricalMarginTrendChartProps {
  project: Project;
  currency?: string;
  onOpenThresholdSettings?: () => void;
  className?: string;
}

export const HistoricalMarginTrendChart: React.FC<HistoricalMarginTrendChartProps> = ({
  project,
  currency,
  onOpenThresholdSettings,
  className = ''
}) => {
  const [marginThreshold, setMarginThresholdState] = useState<number>(() => getMarginThreshold());
  const [showCumulative, setShowCumulative] = useState<boolean>(true);
  const [filterRecordedOnly, setFilterRecordedOnly] = useState<boolean>(false);

  // Sync when user changes threshold anywhere in the app
  React.useEffect(() => {
    const handleThresholdChange = (e: any) => {
      if (e.detail?.threshold !== undefined) {
        setMarginThresholdState(e.detail.threshold);
      }
    };
    window.addEventListener('margin-threshold-changed', handleThresholdChange);
    return () => window.removeEventListener('margin-threshold-changed', handleThresholdChange);
  }, []);

  const activeCurrency = currency || project.currency || 'USD';

  // Compute trend data
  const trendAnalysis = useMemo(() => {
    return calculatePhaseMarginTrend(project, marginThreshold);
  }, [project, marginThreshold]);

  const displayPhases = useMemo(() => {
    if (filterRecordedOnly) {
      const rec = trendAnalysis.phases.filter((p) => p.isRecorded);
      return rec.length > 0 ? rec : trendAnalysis.phases;
    }
    return trendAnalysis.phases;
  }, [trendAnalysis, filterRecordedOnly]);

  // Format data for Recharts LineChart
  const chartData = useMemo(() => {
    return displayPhases.map((phase) => ({
      name: phase.phaseShortName,
      fullName: phase.phaseName,
      status: phase.status,
      phaseMargin: phase.phaseMarginPct,
      cumulativeMargin: phase.cumulativeMarginPct,
      budget: phase.budget,
      cost: phase.totalCost,
      recordedCost: phase.recordedCost,
      revenue: phase.allocatedRevenue,
      isBelow: phase.isMarginBelowThreshold,
      isRecorded: phase.isRecorded,
      dates: phase.startDate && phase.endDate ? `${phase.startDate} to ${phase.endDate}` : undefined
    }));
  }, [displayPhases]);

  // Determine min & max for YAxis to ensure lines and reference lines fit nicely
  const yDomain = useMemo(() => {
    const margins = chartData.flatMap((d) => [d.phaseMargin, d.cumulativeMargin]);
    margins.push(marginThreshold, project.targetMarginPct || 25);
    const minVal = Math.min(...margins);
    const maxVal = Math.max(...margins);
    const minPadded = Math.max(-10, Math.floor((minVal - 5) / 5) * 5);
    const maxPadded = Math.min(100, Math.ceil((maxVal + 5) / 5) * 5);
    return [minPadded, Math.max(maxPadded, minPadded + 20)];
  }, [chartData, marginThreshold, project.targetMarginPct]);

  const anyPhaseBelowThreshold = trendAnalysis.phases.some((p) => p.isRecorded && p.isMarginBelowThreshold);

  return (
    <div className={`bg-white dark:bg-[#0b101b] rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-2xs space-y-4 ${className}`}>
      {/* Header with Title and Quick Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-blue-50 dark:bg-blue-950/60 text-[#0078d4] dark:text-sky-400 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
              Historical Margin Trend
            </h3>
            {anyPhaseBelowThreshold ? (
              <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                <AlertTriangle className="w-3 h-3 text-amber-500" />
                <span>Phase Below {marginThreshold}%</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                <span>Healthy Margins</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Profit margin trajectory across recorded phases against budgets and limits.
          </p>
        </div>

        {/* Filter & Toggle buttons */}
        <div className="flex items-center space-x-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowCumulative(!showCumulative)}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
              showCumulative
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                : 'bg-slate-50 dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800'
            }`}
            title="Toggle Cumulative margin trend line"
          >
            <span>Cumulative Trend</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterRecordedOnly(!filterRecordedOnly)}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
              filterRecordedOnly
                ? 'bg-blue-50 dark:bg-blue-950/40 text-[#0078d4] dark:text-sky-300 border-blue-300 dark:border-blue-800'
                : 'bg-slate-50 dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800'
            }`}
            title="Show only recorded phases with actual costs"
          >
            <span>{filterRecordedOnly ? 'Recorded Only' : 'All Phases'}</span>
          </button>
        </div>
      </div>

      {/* Key Metric Highlights Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Latest Phase Margin */}
        <div className={`p-2.5 rounded-lg border ${
          trendAnalysis.latestRecordedMarginPct < marginThreshold
            ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60'
            : 'bg-slate-50/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'
        }`}>
          <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Latest Margin
          </div>
          <div className="flex items-baseline space-x-1.5 mt-0.5">
            <span className={`text-lg font-bold font-mono ${
              trendAnalysis.latestRecordedMarginPct < marginThreshold
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-emerald-600 dark:text-emerald-400'
            }`}>
              {trendAnalysis.latestRecordedMarginPct.toFixed(1)}%
            </span>
            <span className="text-[10px] text-slate-400">
              (Phase {trendAnalysis.recordedPhasesCount || 1})
            </span>
          </div>
        </div>

        {/* Target Margin */}
        <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60">
          <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Project Target
          </div>
          <div className="flex items-baseline space-x-1.5 mt-0.5">
            <span className="text-lg font-bold font-mono text-[#0078d4] dark:text-sky-400">
              {(project.targetMarginPct || 25).toFixed(1)}%
            </span>
            <span className="text-[10px] text-slate-400">budgeted</span>
          </div>
        </div>

        {/* Warning Threshold */}
        <div className={`p-2.5 rounded-lg border ${
          trendAnalysis.isCurrentBelowThreshold
            ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60'
            : 'bg-slate-50/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'
        }`}>
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Warning Limit
            </div>
            {onOpenThresholdSettings && (
              <button
                type="button"
                onClick={onOpenThresholdSettings}
                className="text-[10px] text-[#0078d4] hover:underline"
              >
                Edit
              </button>
            )}
          </div>
          <div className="flex items-baseline space-x-1.5 mt-0.5">
            <span className="text-lg font-bold font-mono text-amber-600 dark:text-amber-400">
              {marginThreshold}%
            </span>
            <span className="text-[10px] text-slate-400">floor</span>
          </div>
        </div>

        {/* Margin Trend Direction */}
        <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60">
          <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Trend Pace
          </div>
          <div className="flex items-center space-x-1.5 mt-0.5">
            {trendAnalysis.trendDirection === 'improving' ? (
              <span className="flex items-center text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="w-4 h-4 mr-1" />
                Improving
              </span>
            ) : trendAnalysis.trendDirection === 'declining' ? (
              <span className="flex items-center text-xs font-bold text-rose-600 dark:text-rose-400">
                <TrendingDown className="w-4 h-4 mr-1" />
                Declining
              </span>
            ) : (
              <span className="flex items-center text-xs font-bold text-slate-600 dark:text-slate-300">
                <Minus className="w-4 h-4 mr-1" />
                Stable
              </span>
            )}
            <span className="text-[10px] text-slate-400">
              {trendAnalysis.recordedPhasesCount}/{trendAnalysis.totalPhasesCount} phases
            </span>
          </div>
        </div>
      </div>

      {/* Main Recharts Line Chart Container */}
      <div className="w-full h-[280px] sm:h-[320px] pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 15, right: 25, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
            />
            <YAxis
              unit="%"
              domain={yDomain}
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
            />
            <Tooltip content={<CustomTrendTooltip activeCurrency={activeCurrency} threshold={marginThreshold} />} />
            <Legend
              wrapperStyle={{ paddingTop: 10, fontSize: 12 }}
              formatter={(val: string) => <span className="text-slate-700 dark:text-slate-300 font-medium">{val}</span>}
            />

            {/* Warning Threshold Reference Line */}
            <ReferenceLine
              y={marginThreshold}
              stroke="#f59e0b"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: `Limit (${marginThreshold}%)`,
                position: 'insideBottomRight',
                fill: '#d97706',
                fontSize: 10,
                fontWeight: 'bold'
              }}
            />

            {/* Target Margin Reference Line */}
            <ReferenceLine
              y={project.targetMarginPct || 25}
              stroke="#0078d4"
              strokeDasharray="3 3"
              strokeWidth={1.5}
              label={{
                value: `Target (${project.targetMarginPct || 25}%)`,
                position: 'insideTopLeft',
                fill: '#0078d4',
                fontSize: 10,
                fontWeight: 'bold'
              }}
            />

            {/* Phase Margin Line (Primary) */}
            <Line
              type="monotone"
              dataKey="phaseMargin"
              name="Phase Margin %"
              stroke="#0078d4"
              strokeWidth={2.5}
              dot={{ r: 5, fill: '#0078d4', stroke: '#ffffff', strokeWidth: 2 }}
              activeDot={{ r: 7, stroke: '#0078d4', strokeWidth: 2 }}
            />

            {/* Cumulative Margin Line (Secondary) */}
            {showCumulative && (
              <Line
                type="monotone"
                dataKey="cumulativeMargin"
                name="Cumulative Margin %"
                stroke="#10b981"
                strokeWidth={2}
                strokeDasharray="4 2"
                dot={{ r: 4, fill: '#10b981', stroke: '#ffffff', strokeWidth: 2 }}
                activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2 }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Phase Details Cards Breakdown */}
      <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span className="font-semibold text-slate-700 dark:text-slate-300">Phase Breakdown Details</span>
          <span>{trendAnalysis.phases.length} recorded phases</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {trendAnalysis.phases.map((phase) => {
            const isBelow = phase.isMarginBelowThreshold;
            return (
              <div
                key={phase.phaseId}
                className={`p-2.5 rounded-lg border text-xs transition-colors ${
                  isBelow
                    ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800'
                    : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-900 dark:text-slate-100 truncate max-w-[130px]">
                    {phase.phaseShortName}
                  </span>
                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                    phase.status === 'Completed'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : phase.status === 'In Progress'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-sky-300'
                      : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                  }`}>
                    {phase.status}
                  </span>
                </div>

                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-[11px] text-slate-500">Recorded Margin:</span>
                  <span className={`font-mono font-bold text-xs ${
                    isBelow ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {phase.phaseMarginPct.toFixed(1)}%
                  </span>
                </div>

                <div className="flex items-baseline justify-between text-[11px] text-slate-500 mt-0.5">
                  <span>Recorded Cost:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {formatCurrency(phase.totalCost, activeCurrency)}
                  </span>
                </div>

                <div className="flex items-baseline justify-between text-[11px] text-slate-500 mt-0.5">
                  <span>Phase Budget:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {formatCurrency(phase.budget, activeCurrency)}
                  </span>
                </div>

                {isBelow && (
                  <div className="mt-1.5 pt-1 border-t border-amber-200 dark:border-amber-900/60 flex items-center space-x-1 text-[10px] text-amber-700 dark:text-amber-400 font-semibold">
                    <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                    <span>Below {marginThreshold}% warning threshold</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

interface CustomTrendTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  activeCurrency: string;
  threshold: number;
}

const CustomTrendTooltip: React.FC<CustomTrendTooltipProps> = ({
  active,
  payload,
  activeCurrency,
  threshold
}) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0]?.payload;
  if (!data) return null;

  const isBelow = data.phaseMargin < threshold;

  return (
    <div className="bg-white dark:bg-[#0b101b] border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-lg text-xs space-y-2 min-w-[210px]">
      <div>
        <div className="flex items-center justify-between gap-2">
          <span className="font-bold text-slate-900 dark:text-slate-100">{data.fullName}</span>
          <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
            data.status === 'Completed'
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              : data.status === 'In Progress'
              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-sky-300'
              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
          }`}>
            {data.status}
          </span>
        </div>
        {data.dates && (
          <div className="text-[10px] text-slate-400 mt-0.5">{data.dates}</div>
        )}
      </div>

      <div className="border-t border-slate-100 dark:border-slate-800 pt-1.5 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-slate-500 flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-[#0078d4]" />
            <span>Phase Margin:</span>
          </span>
          <span className={`font-mono font-bold ${isBelow ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {data.phaseMargin.toFixed(1)}%
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-500 flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-[#10b981]" />
            <span>Cumulative:</span>
          </span>
          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
            {data.cumulativeMargin.toFixed(1)}%
          </span>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5 border-t border-slate-100 dark:border-slate-800">
          <span>Allocated Revenue:</span>
          <span className="font-mono text-slate-800 dark:text-slate-200">{formatCurrency(data.revenue, activeCurrency)}</span>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span>Recorded Cost:</span>
          <span className="font-mono text-slate-800 dark:text-slate-200">{formatCurrency(data.cost, activeCurrency)}</span>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span>Phase Budget:</span>
          <span className="font-mono text-slate-800 dark:text-slate-200">{formatCurrency(data.budget, activeCurrency)}</span>
        </div>
      </div>

      {isBelow ? (
        <div className="flex items-center space-x-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-1 rounded">
          <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
          <span>Warning: Margin is below {threshold}% limit</span>
        </div>
      ) : (
        <div className="flex items-center space-x-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 p-1 rounded">
          <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
          <span>Margin above warning limit</span>
        </div>
      )}
    </div>
  );
};
