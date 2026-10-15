import { Project, InventoryItem } from '../types';

export interface ProjectProfitabilityAnalysis {
  projectId: string;
  projectCode: string;
  projectName: string;
  clientName: string;
  revenue: number;
  directCost: number;
  totalCost: number;
  plannedBudget: number;
  grossMarginPct: number;
  netMarginPct: number;
  budgetVariance: number;
  isBudgetOverrun: boolean;
  isMarginBelowThreshold: boolean;
  thresholdPct: number;
  marginDeficitPct: number;
}

export interface SystemAlert {
  id: string;
  type: 'margin' | 'budget' | 'inventory';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  value?: number;
  target?: number;
  projectId?: string;
  projectCode?: string;
  projectName?: string;
  itemId?: string;
  timestamp: string;
}

const THRESHOLD_STORAGE_KEY = 'user_margin_warning_threshold';
const DISMISSED_ALERTS_KEY = 'dismissed_system_alerts';
const DEFAULT_MARGIN_THRESHOLD = 20; // 20%

/**
 * Get user-defined margin threshold percentage
 */
export function getMarginThreshold(): number {
  try {
    const val = localStorage.getItem(THRESHOLD_STORAGE_KEY);
    if (val !== null) {
      const parsed = parseFloat(val);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
        return parsed;
      }
    }
  } catch (e) {
    // ignore
  }
  return DEFAULT_MARGIN_THRESHOLD;
}

/**
 * Set user-defined margin threshold percentage
 */
export function setMarginThreshold(threshold: number): void {
  const clamped = Math.max(0, Math.min(100, Math.round(threshold * 10) / 10));
  try {
    localStorage.setItem(THRESHOLD_STORAGE_KEY, clamped.toString());
    window.dispatchEvent(new CustomEvent('margin-threshold-changed', { detail: { threshold: clamped } }));
  } catch (e) {
    // ignore
  }
}

/**
 * Calculate profitability & budget variance for a project
 */
export function calculateProjectProfitability(
  project: Project,
  userThreshold: number = getMarginThreshold()
): ProjectProfitabilityAnalysis {
  const revenue = project.quotedPrice || 0;
  const items = project.selectedItems || [];

  // Direct costs from materials, subcontractors, outsourced
  const directCost = items.reduce((sum, item) => {
    return sum + (item.totalCost || (item.quantity || 1) * (item.unitCost || 0));
  }, 0);

  const overheadPct = project.overheadPct ?? 8.5;
  const contingencyPct = project.contingencyPct ?? 5.0;

  const overhead = directCost * (overheadPct / 100);
  const contingency = directCost * (contingencyPct / 100);
  const totalCost = directCost + overhead + contingency;

  // Planned budget across phases
  const plannedBudget = (project.phases || []).reduce((sum, p) => sum + (p.budget || 0), 0);

  const grossMarginPct = revenue > 0 ? ((revenue - directCost) / revenue) * 100 : 0;
  const netMarginPct = revenue > 0 ? ((revenue - totalCost) / revenue) * 100 : 0;

  // We check net margin or gross margin against the threshold
  // Net margin reflects true bottom-line profitability
  const effectiveMargin = netMarginPct;
  const isMarginBelowThreshold = (revenue > 0 || totalCost > 0) && effectiveMargin < userThreshold;
  const budgetVariance = plannedBudget - totalCost;
  const isBudgetOverrun = plannedBudget > 0 && totalCost > plannedBudget;
  const marginDeficitPct = isMarginBelowThreshold ? userThreshold - effectiveMargin : 0;

  return {
    projectId: project.id,
    projectCode: project.code,
    projectName: project.name,
    clientName: project.clientName,
    revenue,
    directCost,
    totalCost,
    plannedBudget,
    grossMarginPct,
    netMarginPct,
    budgetVariance,
    isBudgetOverrun,
    isMarginBelowThreshold,
    thresholdPct: userThreshold,
    marginDeficitPct
  };
}

/**
 * Get dismissed alert IDs
 */
export function getDismissedAlertIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_ALERTS_KEY);
    if (raw) {
      return new Set(JSON.parse(raw));
    }
  } catch (e) {
    // ignore
  }
  return new Set();
}

/**
 * Dismiss an alert
 */
export function dismissAlert(alertId: string): void {
  try {
    const set = getDismissedAlertIds();
    set.add(alertId);
    localStorage.setItem(DISMISSED_ALERTS_KEY, JSON.stringify(Array.from(set)));
    window.dispatchEvent(new CustomEvent('system-alerts-updated'));
  } catch (e) {
    // ignore
  }
}

/**
 * Clear all dismissed alerts
 */
export function resetDismissedAlerts(): void {
  try {
    localStorage.removeItem(DISMISSED_ALERTS_KEY);
    window.dispatchEvent(new CustomEvent('system-alerts-updated'));
  } catch (e) {
    // ignore
  }
}

/**
 * Scan all projects and inventory to compile active system alerts
 */
export function compileSystemAlerts(
  projects: Project[],
  inventory: InventoryItem[] = [],
  threshold: number = getMarginThreshold()
): SystemAlert[] {
  const dismissed = getDismissedAlertIds();
  const alerts: SystemAlert[] = [];

  // 1. Project Margin Alerts
  projects.forEach((p) => {
    const analysis = calculateProjectProfitability(p, threshold);
    const alertId = `margin-${p.id}`;

    if (analysis.isMarginBelowThreshold && !dismissed.has(alertId)) {
      const isCritical = analysis.netMarginPct < 5 || analysis.netMarginPct <= 0;
      alerts.push({
        id: alertId,
        type: 'margin',
        severity: isCritical ? 'critical' : 'warning',
        title: isCritical ? 'Critical Margin' : 'Low Margin',
        message: `${p.name}: Margin ${analysis.netMarginPct.toFixed(1)}% (below ${threshold}% target)`,
        value: analysis.netMarginPct,
        target: threshold,
        projectId: p.id,
        projectCode: p.code,
        projectName: p.name,
        timestamp: new Date().toISOString()
      });
    }

    // 2. Budget Overrun Alerts
    const budgetAlertId = `budget-${p.id}`;
    if (analysis.isBudgetOverrun && !dismissed.has(budgetAlertId)) {
      const overrunAmount = analysis.totalCost - analysis.plannedBudget;
      alerts.push({
        id: budgetAlertId,
        type: 'budget',
        severity: 'warning',
        title: 'Budget Overrun',
        message: `${p.name}: Cost exceeds budget by $${Math.round(overrunAmount).toLocaleString()}`,
        value: overrunAmount,
        target: analysis.plannedBudget,
        projectId: p.id,
        projectCode: p.code,
        projectName: p.name,
        timestamp: new Date().toISOString()
      });
    }
  });

  // 3. Low Inventory Alerts
  inventory.forEach((item) => {
    const minStock = item.reorderLevel || 5;
    const stock = item.currentStock ?? item.onHand ?? 0;
    const alertId = `inv-${item.id}`;
    const displayName = item.itemName || item.name || item.sku || 'Item';
    if (stock <= minStock && !dismissed.has(alertId)) {
      const isOut = stock <= 0;
      alerts.push({
        id: alertId,
        type: 'inventory',
        severity: isOut ? 'critical' : 'warning',
        title: isOut ? 'Out of Stock' : 'Low Stock',
        message: `${displayName}: ${stock} ${item.unit || 'units'} left (min ${minStock})`,
        value: stock,
        target: minStock,
        itemId: String(item.id),
        timestamp: new Date().toISOString()
      });
    }
  });

  return alerts;
}

export interface PhaseMarginPoint {
  phaseId: string;
  phaseNumber: number;
  phaseName: string;
  phaseShortName: string;
  status: 'Completed' | 'In Progress' | 'Not Started';
  startDate?: string;
  endDate?: string;
  budget: number;
  recordedCost: number;
  totalCost: number; // including overhead & contingency
  allocatedRevenue: number;
  phaseMarginPct: number;
  cumulativeRevenue: number;
  cumulativeCost: number;
  cumulativeMarginPct: number;
  targetMarginPct: number;
  thresholdPct: number;
  isMarginBelowThreshold: boolean;
  varianceAmount: number; // budget - totalCost
  variancePct: number;
  isRecorded: boolean;
}

export interface ProjectMarginTrendAnalysis {
  projectId: string;
  projectName: string;
  projectCode: string;
  currency: string;
  targetMarginPct: number;
  thresholdPct: number;
  currentNetMarginPct: number;
  isCurrentBelowThreshold: boolean;
  phases: PhaseMarginPoint[];
  recordedPhasesCount: number;
  totalPhasesCount: number;
  lowestPhaseMargin: PhaseMarginPoint | null;
  highestPhaseMargin: PhaseMarginPoint | null;
  trendDirection: 'improving' | 'declining' | 'stable';
  latestRecordedMarginPct: number;
}

/**
 * Calculates historical margin trend over recorded project phases.
 */
export function calculatePhaseMarginTrend(
  project: Project,
  userThreshold: number = getMarginThreshold()
): ProjectMarginTrendAnalysis {
  const totalRevenue = project.quotedPrice || 0;
  const targetMarginPct = project.targetMarginPct || 25;
  const overheadPct = project.overheadPct ?? 8.5;
  const contingencyPct = project.contingencyPct ?? 5.0;
  const addOnMultiplier = 1 + (overheadPct + contingencyPct) / 100;

  // If project has defined phases, use them. Otherwise, synthesize standard phases based on project timeline.
  let phasesList = (project.phases && project.phases.length > 0) ? [...project.phases] : [];

  if (phasesList.length === 0) {
    const totalItemsCost = (project.selectedItems || []).reduce((sum, item) => sum + (item.totalCost || 0), 0);
    const estBudget = project.quotedPrice ? project.quotedPrice * 0.75 : 100000;
    phasesList = [
      {
        id: 'ph-1',
        name: 'Phase 1: Alloy & Material Sourcing',
        phaseNumber: 1,
        status: 'Completed',
        startDate: project.startDate || '2026-08-01',
        endDate: '2026-09-15',
        budget: Math.round(estBudget * 0.45),
        actualCost: Math.round(totalItemsCost * 0.42) || Math.round(estBudget * 0.40),
        items: []
      },
      {
        id: 'ph-2',
        name: 'Phase 2: Precision Machining & Fab',
        phaseNumber: 2,
        status: 'In Progress',
        startDate: '2026-09-16',
        endDate: '2026-10-31',
        budget: Math.round(estBudget * 0.35),
        actualCost: Math.round(totalItemsCost * 0.32) || Math.round(estBudget * 0.33),
        items: []
      },
      {
        id: 'ph-3',
        name: 'Phase 3: Metrology & Surface Finishing',
        phaseNumber: 3,
        status: 'Not Started',
        startDate: '2026-11-01',
        endDate: '2026-11-20',
        budget: Math.round(estBudget * 0.12),
        actualCost: 0,
        items: []
      },
      {
        id: 'ph-4',
        name: 'Phase 4: Assembly, QA & Handover',
        phaseNumber: 4,
        status: 'Not Started',
        startDate: '2026-11-21',
        endDate: project.deliveryDeadline || '2026-12-15',
        budget: Math.round(estBudget * 0.08),
        actualCost: 0,
        items: []
      }
    ];
  }

  // Sort phases by phaseNumber or index
  phasesList.sort((a, b) => (a.phaseNumber || 0) - (b.phaseNumber || 0));

  const totalPhaseBudget = phasesList.reduce((sum, p) => sum + (p.budget || p.plannedCost || 1), 0);

  let runningCumRevenue = 0;
  let runningCumCost = 0;
  const phasePoints: PhaseMarginPoint[] = [];

  phasesList.forEach((phase, index) => {
    const phaseNum = phase.phaseNumber || index + 1;
    const phaseBudget = phase.budget || phase.plannedCost || (totalPhaseBudget / phasesList.length);

    // Sum item costs assigned to this phase
    const phaseItemsCost = (project.selectedItems || [])
      .filter((item) => item.phaseId === phase.id || (!item.phaseId && index === 0))
      .reduce((sum, item) => sum + (item.totalCost || (item.quantity || 1) * (item.unitCost || 0)), 0);

    // Recorded cost: prioritize actualCost if explicitly recorded > 0, else phaseItemsCost
    const recordedDirectCost = phase.actualCost > 0
      ? phase.actualCost
      : phase.status === 'Completed' || phase.status === 'In Progress'
      ? Math.max(phaseItemsCost, Math.round(phaseBudget * (phase.status === 'Completed' ? 0.95 : 0.6)))
      : 0;

    const isRecorded = phase.status === 'Completed' || (phase.status === 'In Progress' && recordedDirectCost > 0);
    const activeDirectCost = isRecorded ? recordedDirectCost : (phase.plannedCost || phaseBudget);
    const totalPhaseCost = Math.round(activeDirectCost * addOnMultiplier);

    // Revenue allocation proportional to phase budget
    const allocatedRevenue = totalPhaseBudget > 0
      ? Math.round(totalRevenue * (phaseBudget / totalPhaseBudget))
      : Math.round(totalRevenue / phasesList.length);

    // Phase Margin %
    const phaseMarginPct = allocatedRevenue > 0
      ? Math.round(((allocatedRevenue - totalPhaseCost) / allocatedRevenue) * 1000) / 10
      : 0;

    runningCumRevenue += allocatedRevenue;
    runningCumCost += totalPhaseCost;

    const cumulativeMarginPct = runningCumRevenue > 0
      ? Math.round(((runningCumRevenue - runningCumCost) / runningCumRevenue) * 1000) / 10
      : 0;

    const isBelow = phaseMarginPct < userThreshold;
    const varianceAmount = phaseBudget - totalPhaseCost;
    const variancePct = phaseBudget > 0 ? Math.round((varianceAmount / phaseBudget) * 1000) / 10 : 0;

    // Short name for clean XAxis display
    const rawName = phase.name || `Phase ${phaseNum}`;
    const cleanedName = rawName.replace(/^Phase\s*\d+:\s*/i, '');
    const phaseShortName = `P${phaseNum}: ${cleanedName.length > 14 ? cleanedName.substring(0, 14) + '…' : cleanedName}`;

    phasePoints.push({
      phaseId: phase.id,
      phaseNumber: phaseNum,
      phaseName: rawName,
      phaseShortName,
      status: phase.status,
      startDate: phase.startDate,
      endDate: phase.endDate,
      budget: phaseBudget,
      recordedCost: recordedDirectCost,
      totalCost: totalPhaseCost,
      allocatedRevenue,
      phaseMarginPct,
      cumulativeRevenue: runningCumRevenue,
      cumulativeCost: runningCumCost,
      cumulativeMarginPct,
      targetMarginPct,
      thresholdPct: userThreshold,
      isMarginBelowThreshold: isBelow,
      varianceAmount,
      variancePct,
      isRecorded
    });
  });

  const recordedPoints = phasePoints.filter(p => p.isRecorded);
  const activePoints = recordedPoints.length > 0 ? recordedPoints : phasePoints;

  const lowestPhaseMargin = activePoints.reduce((min, p) => (p.phaseMarginPct < min.phaseMarginPct ? p : min), activePoints[0] || null);
  const highestPhaseMargin = activePoints.reduce((max, p) => (p.phaseMarginPct > max.phaseMarginPct ? p : max), activePoints[0] || null);

  // Overall current project net margin
  const overallAnalysis = calculateProjectProfitability(project, userThreshold);

  // Trend direction across recorded phases
  let trendDirection: 'improving' | 'declining' | 'stable' = 'stable';
  if (activePoints.length >= 2) {
    const first = activePoints[0].phaseMarginPct;
    const last = activePoints[activePoints.length - 1].phaseMarginPct;
    const diff = last - first;
    if (diff >= 1.0) trendDirection = 'improving';
    else if (diff <= -1.0) trendDirection = 'declining';
  }

  const latestRecorded = activePoints[activePoints.length - 1]?.phaseMarginPct ?? overallAnalysis.netMarginPct;

  return {
    projectId: project.id,
    projectName: project.name,
    projectCode: project.code,
    currency: project.currency || 'USD',
    targetMarginPct,
    thresholdPct: userThreshold,
    currentNetMarginPct: overallAnalysis.netMarginPct,
    isCurrentBelowThreshold: overallAnalysis.isMarginBelowThreshold,
    phases: phasePoints,
    recordedPhasesCount: recordedPoints.length,
    totalPhasesCount: phasePoints.length,
    lowestPhaseMargin,
    highestPhaseMargin,
    trendDirection,
    latestRecordedMarginPct: latestRecorded
  };
}
