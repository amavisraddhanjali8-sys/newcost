import { ProjectCostItem, ProjectPhase, ProjectProfitabilityMetrics } from '../types';

export function calculateProjectMetrics(
  quotedPrice: number,
  targetMarginPct: number,
  overheadPct: number,
  contingencyPct: number,
  selectedItems: ProjectCostItem[],
  phases: ProjectPhase[]
): ProjectProfitabilityMetrics {
  const materialCost = (selectedItems || [])
    .filter(i => i.type === 'material')
    .reduce((sum, i) => sum + (i.totalCost || 0), 0);
  const subcontractorCost = (selectedItems || [])
    .filter(i => i.type === 'subcontractor')
    .reduce((sum, i) => sum + (i.totalCost || 0), 0);
  const outsourcedCost = (selectedItems || [])
    .filter(i => i.type === 'outsourced')
    .reduce((sum, i) => sum + (i.totalCost || 0), 0);
  const totalDirectCost = materialCost + subcontractorCost + outsourcedCost;
  const overheadAmount = totalDirectCost * ((overheadPct || 8.5) / 100);
  const contingencyAmount = totalDirectCost * ((contingencyPct || 5.0) / 100);
  const totalProjectCost = totalDirectCost + overheadAmount + contingencyAmount;
  const grossProfit = quotedPrice - totalDirectCost;
  const grossMarginPct = quotedPrice > 0 ? (grossProfit / quotedPrice) * 100 : 0;
  const netProfit = quotedPrice - totalProjectCost;
  const netMarginPct = quotedPrice > 0 ? (netProfit / quotedPrice) * 100 : 0;

  const healthScore = Math.min(
    100,
    Math.max(
      30,
      Math.round(
        75 +
        (grossMarginPct >= targetMarginPct ? 15 : -15) +
        (netMarginPct >= 20 ? 10 : 0)
      )
    )
  );

  const phaseMetrics = (phases || []).map(p => {
    const phaseItemsCost = (selectedItems || [])
      .filter(i => i.phaseId === p.id)
      .reduce((sum, i) => sum + (i.totalCost || 0), 0);
    const actual = phaseItemsCost > 0 ? phaseItemsCost : p.actualCost;
    const variance = p.budget - actual;
    const variancePct = p.budget > 0 ? (variance / p.budget) * 100 : 0;
    return {
      phaseId: p.id,
      phaseName: p.name,
      plannedBudget: p.budget,
      actualCost: actual,
      variance,
      variancePct,
      status: (variance >= 0 ? 'Under Budget' : 'Over Budget') as 'Under Budget' | 'Over Budget'
    };
  });

  const totalPlannedBudget = (phases || []).reduce((sum, p) => sum + p.budget, 0);
  const budgetVariance = totalPlannedBudget - totalProjectCost;
  const budgetVariancePct = totalPlannedBudget > 0 ? (budgetVariance / totalPlannedBudget) * 100 : 0;

  return {
    revenue: quotedPrice,
    materialCost,
    subcontractorCost,
    outsourcedCost,
    totalDirectCost,
    overheadAmount,
    contingencyAmount,
    totalProjectCost,
    grossProfit,
    grossMarginPct,
    netProfit,
    netMarginPct,
    totalPlannedBudget,
    budgetVariance,
    budgetVariancePct,
    healthScore,
    phaseMetrics,
    sensitivity: {
      materialInflation5Pct: {
        costImpact: Number((materialCost * 0.05).toFixed(2)),
        revisedNetMarginPct: Number((((quotedPrice - (totalProjectCost + materialCost * 0.05)) / (quotedPrice || 1)) * 100).toFixed(1))
      },
      labourRateHike8Pct: {
        costImpact: Number((subcontractorCost * 0.08).toFixed(2)),
        revisedNetMarginPct: Number((((quotedPrice - (totalProjectCost + subcontractorCost * 0.08)) / (quotedPrice || 1)) * 100).toFixed(1))
      }
    },
    costDistribution: [
      { category: 'Materials', amount: materialCost, pct: totalDirectCost > 0 ? (materialCost / totalDirectCost) * 100 : 0 },
      { category: 'Subcontractor Labour', amount: subcontractorCost, pct: totalDirectCost > 0 ? (subcontractorCost / totalDirectCost) * 100 : 0 },
      { category: 'Outsourced Services', amount: outsourcedCost, pct: totalDirectCost > 0 ? (outsourcedCost / totalDirectCost) * 100 : 0 },
      { category: 'Overhead & Contingency', amount: overheadAmount + contingencyAmount, pct: totalProjectCost > 0 ? ((overheadAmount + contingencyAmount) / totalProjectCost) * 100 : 0 }
    ]
  };
}
