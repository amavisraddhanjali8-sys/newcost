/**
 * Visual Warning System & Projected Cost Analysis Engine
 * Calculates item consumption run-rates, projected cost trajectories,
 * and detects phase budget overruns to flag high-risk budget items in bold red.
 */

import { Project, ProjectPhase, ProjectCostItem } from '../types';
import { convertCurrency, getCurrencyInfo } from './currency';
import { fxService } from '../services/fxService';

export interface ItemWarningAnalysis {
  itemId: string;
  itemName: string;
  phaseId: string;
  phaseName: string;
  phaseBudget: number;
  phaseProjectedTotal: number;
  itemBaseCost: number;
  itemProjectedCost: number;
  consumptionRatePct: number;
  currency: string;
  nativeCost: number;
  isOverrunWarning: boolean;
  varianceAmount: number; // phaseBudget - phaseProjected
  variancePct: number;
  overrunExcessAmount: number; // how much projected exceeds budget
  severity: 'normal' | 'caution' | 'warning' | 'critical';
  reason: string;
}

export interface PhaseWarningSummary {
  phaseId: string;
  phaseName: string;
  budget: number;
  actualCost: number;
  projectedCost: number;
  variance: number;
  variancePct: number;
  consumptionPct: number;
  isOverrun: boolean;
  healthStatus: 'optimal' | 'on_target' | 'caution' | 'high_risk' | 'critical';
  healthLabel: string;
  colorClass: {
    bg: string;
    border: string;
    text: string;
    badgeBg: string;
    badgeText: string;
  };
  flaggedItemCount: number;
  flaggedItems: ItemWarningAnalysis[];
}

export interface ProjectWarningRollup {
  totalEstablishedBudget: number;
  totalActualCost: number;
  totalProjectedCost: number;
  totalVariance: number;
  totalVariancePct: number;
  hasOverruns: boolean;
  criticalItemCount: number;
  phases: PhaseWarningSummary[];
  itemAnalyses: Map<string, ItemWarningAnalysis>;
}

/**
 * Analyze all items in a project or plan for phase budget overruns based on consumption rates
 */
export function analyzeProjectBudgetWarnings(
  project: Project,
  customItems?: ProjectCostItem[],
  projectCurrency: string = 'USD'
): ProjectWarningRollup {
  const items = customItems || project.selectedItems || [];
  const phases = project.phases || [];

  const itemAnalyses = new Map<string, ItemWarningAnalysis>();

  const phaseSummaries: PhaseWarningSummary[] = phases.map((phase) => {
    const phaseBudget = phase.budget ?? phase.plannedCost ?? 0;
    const phaseItems = items.filter((i) => i.phaseId === phase.id);

    // Compute base cost and projected cost for each item in the phase
    let phaseCalculatedActual = 0;
    let phaseTotalProjected = 0;

    const itemCalcs = phaseItems.map((item) => {
      const itemCurr = item.currency || 'USD';
      
      // Calculate unit cost in project currency
      let unitCostInProjectCurrency = item.unitCost;
      if (itemCurr !== projectCurrency) {
        unitCostInProjectCurrency = convertCurrency(item.unitCost, itemCurr, projectCurrency);
      }

      const discountFactor = 1 - (item.discountPct || 0) / 100;
      const baseTotalCost = (item.quantity || 1) * unitCostInProjectCurrency * discountFactor;
      
      // Consumption rate: default is 100% (burn matches plan). If 125%, burning 25% faster.
      const consumptionRate = item.consumptionRate !== undefined && item.consumptionRate > 0 
        ? item.consumptionRate 
        : 100;

      // Projected cost based on current consumption rate
      const projectedCost = baseTotalCost * (consumptionRate / 100);

      phaseCalculatedActual += baseTotalCost;
      phaseTotalProjected += projectedCost;

      return {
        item,
        baseTotalCost,
        projectedCost,
        consumptionRate,
        unitCostInProjectCurrency,
        itemCurr
      };
    });

    // Determine if phase will exceed established budget
    const effectiveActual = phaseCalculatedActual > 0 ? phaseCalculatedActual : (phase.actualCost || 0);
    const effectiveProjected = phaseTotalProjected > 0 ? phaseTotalProjected : effectiveActual;
    const variance = phaseBudget - effectiveProjected;
    const variancePct = phaseBudget > 0 ? (variance / phaseBudget) * 100 : 0;
    const isPhaseOverrun = phaseBudget > 0 && effectiveProjected > phaseBudget;
    const consumptionPct = phaseBudget > 0 ? (effectiveProjected / phaseBudget) * 100 : 100;

    // Evaluate individual items:
    // Items are highlighted in RED when:
    // 1. The phase as a whole is projected to exceed its budget (isPhaseOverrun), AND this item is consuming above normal (consumptionRate >= 100%) or is a significant cost contributor.
    // 2. OR the item's individual projected cost exceeds the phase budget by itself.
    // 3. OR the item's consumption rate is sharply elevated (> 110%) indicating severe burn overrun.
    const flaggedItems: ItemWarningAnalysis[] = [];

    itemCalcs.forEach(({ item, baseTotalCost, projectedCost, consumptionRate, itemCurr }) => {
      let isWarning = false;
      let reason = '';
      let severity: ItemWarningAnalysis['severity'] = 'normal';

      const itemShareOfBudget = phaseBudget > 0 ? (projectedCost / phaseBudget) * 100 : 0;
      const excessOverBudget = effectiveProjected - phaseBudget;

      if (isPhaseOverrun) {
        if (consumptionRate > 105) {
          isWarning = true;
          severity = 'critical';
          reason = `Consumption rate is elevated at ${consumptionRate}% pace. Projected cost ($${Math.round(projectedCost).toLocaleString()}) drives phase overrun of +$${Math.round(excessOverBudget).toLocaleString()} above established $${Math.round(phaseBudget).toLocaleString()} budget.`;
        } else if (itemShareOfBudget > 30) {
          isWarning = true;
          severity = 'warning';
          reason = `Primary cost driver (${itemShareOfBudget.toFixed(0)}% of phase budget). Phase is projected to exceed budget by $${Math.round(excessOverBudget).toLocaleString()}.`;
        } else {
          isWarning = true;
          severity = 'caution';
          reason = `Phase is projected to exceed established budget by $${Math.round(excessOverBudget).toLocaleString()}.`;
        }
      } else if (consumptionRate > 125) {
        isWarning = true;
        severity = 'warning';
        reason = `Burn rate alert: Consuming at ${consumptionRate}% of baseline. Near phase threshold.`;
      }

      const analysis: ItemWarningAnalysis = {
        itemId: item.id,
        itemName: item.name,
        phaseId: phase.id,
        phaseName: phase.name,
        phaseBudget,
        phaseProjectedTotal: effectiveProjected,
        itemBaseCost: baseTotalCost,
        itemProjectedCost: projectedCost,
        consumptionRatePct: consumptionRate,
        currency: itemCurr,
        nativeCost: item.unitCost,
        isOverrunWarning: isWarning,
        varianceAmount: variance,
        variancePct,
        overrunExcessAmount: excessOverBudget > 0 ? excessOverBudget : 0,
        severity,
        reason
      };

      itemAnalyses.set(item.id, analysis);
      if (isWarning) {
        flaggedItems.push(analysis);
      }
    });

    // Phase Health Categorization
    let healthStatus: PhaseWarningSummary['healthStatus'] = 'optimal';
    let healthLabel = 'Optimal';
    let colorClass = {
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      border: 'border-emerald-300 dark:border-emerald-800',
      text: 'text-emerald-800 dark:text-emerald-300',
      badgeBg: 'bg-emerald-100 dark:bg-emerald-900/60',
      badgeText: 'text-emerald-700 dark:text-emerald-300'
    };

    if (isPhaseOverrun || consumptionPct >= 120) {
      healthStatus = 'critical';
      healthLabel = 'Critical Overrun';
      colorClass = {
        bg: 'bg-red-50 dark:bg-red-950/40',
        border: 'border-red-400 dark:border-red-800',
        text: 'text-red-900 dark:text-red-200',
        badgeBg: 'bg-red-100 dark:bg-red-900/70',
        badgeText: 'text-red-700 dark:text-red-300'
      };
    } else if (consumptionPct >= 105) {
      healthStatus = 'high_risk';
      healthLabel = 'High Risk';
      colorClass = {
        bg: 'bg-orange-50 dark:bg-orange-950/40',
        border: 'border-orange-300 dark:border-orange-800',
        text: 'text-orange-900 dark:text-orange-200',
        badgeBg: 'bg-orange-100 dark:bg-orange-900/60',
        badgeText: 'text-orange-700 dark:text-orange-300'
      };
    } else if (consumptionPct >= 98) {
      healthStatus = 'caution';
      healthLabel = 'Near Budget Cap';
      colorClass = {
        bg: 'bg-amber-50 dark:bg-amber-950/40',
        border: 'border-amber-300 dark:border-amber-800',
        text: 'text-amber-900 dark:text-amber-200',
        badgeBg: 'bg-amber-100 dark:bg-amber-900/60',
        badgeText: 'text-amber-700 dark:text-amber-300'
      };
    } else if (consumptionPct >= 85) {
      healthStatus = 'on_target';
      healthLabel = 'On Target';
      colorClass = {
        bg: 'bg-teal-50 dark:bg-teal-950/40',
        border: 'border-teal-300 dark:border-teal-800',
        text: 'text-teal-900 dark:text-teal-200',
        badgeBg: 'bg-teal-100 dark:bg-teal-900/60',
        badgeText: 'text-teal-700 dark:text-teal-300'
      };
    }

    return {
      phaseId: phase.id,
      phaseName: phase.name,
      budget: phaseBudget,
      actualCost: effectiveActual,
      projectedCost: effectiveProjected,
      variance,
      variancePct,
      consumptionPct,
      isOverrun: isPhaseOverrun,
      healthStatus,
      healthLabel,
      colorClass,
      flaggedItemCount: flaggedItems.length,
      flaggedItems
    };
  });

  const totalEstablishedBudget = phaseSummaries.reduce((sum, p) => sum + p.budget, 0);
  const totalActualCost = phaseSummaries.reduce((sum, p) => sum + p.actualCost, 0);
  const totalProjectedCost = phaseSummaries.reduce((sum, p) => sum + p.projectedCost, 0);
  const totalVariance = totalEstablishedBudget - totalProjectedCost;
  const totalVariancePct = totalEstablishedBudget > 0 ? (totalVariance / totalEstablishedBudget) * 100 : 0;
  const criticalItemCount = Array.from(itemAnalyses.values()).filter((a) => a.isOverrunWarning).length;

  return {
    totalEstablishedBudget,
    totalActualCost,
    totalProjectedCost,
    totalVariance,
    totalVariancePct,
    hasOverruns: phaseSummaries.some((p) => p.isOverrun),
    criticalItemCount,
    phases: phaseSummaries,
    itemAnalyses
  };
}
