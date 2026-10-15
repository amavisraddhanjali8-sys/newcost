/**
 * Subcontractor Working Hours & Project Capacity Calculation Utility
 * Accurately extracts subcontractor items, computes working hours,
 * and compares against available project phase capacities.
 */

import { Project, ProjectPhase, ProjectCostItem } from '../types';

export interface PhaseCapacityMetric {
  phaseId: string;
  phaseNumber: number;
  phaseName: string;
  fullPhaseName: string;
  startDate: string;
  endDate: string;
  status: 'Not Started' | 'In Progress' | 'Completed';
  capacityHours: number;
  allocatedHours: number;
  remainingHours: number;
  overAllocatedHours: number;
  utilizationPct: number;
  isOverAllocated: boolean;
  isZeroCapacity: boolean;
  statusCategory: 'within_capacity' | 'near_capacity' | 'over_allocated' | 'zero_capacity';
  subcontractorCount: number;
  subcontractorBreakdown: Array<{
    itemId: string;
    name: string;
    provider: string;
    hours: number;
    hourlyRate: number;
    totalSpend: number;
    unit: string;
  }>;
}

export interface ProjectCapacitySummary {
  projectCode: string;
  projectName: string;
  totalCapacityHours: number;
  totalAllocatedHours: number;
  totalRemainingHours: number;
  totalOverAllocatedHours: number;
  overallUtilizationPct: number;
  overAllocatedPhaseCount: number;
  totalPhaseCount: number;
  phases: PhaseCapacityMetric[];
}

/**
 * Calculate working days (approx business days Mon-Fri) between two dates
 */
export function calculateWorkingDays(startDateStr?: string, endDateStr?: string): number {
  if (!startDateStr || !endDateStr) return 20; // default 1 month working days
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
    return 20;
  }

  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // Approximate business days (5/7th of calendar days)
  const workingDays = Math.max(1, Math.round((diffDays * 5) / 7));
  return workingDays;
}

/**
 * Normalize an item's quantity into working hours
 */
export function extractWorkingHours(item: ProjectCostItem): number {
  const qty = Number(item.quantity) || 0;
  const unit = (item.unit || '').toLowerCase().trim();

  if (unit === 'day' || unit === 'days' || unit === 'daily_rate' || unit === 'per_day') {
    return qty * 8; // 8 hours per working day
  }
  if (unit === 'week' || unit === 'weeks' || unit === 'weekly') {
    return qty * 40; // 40 hours per standard work week
  }
  if (unit === 'month' || unit === 'months' || unit === 'monthly') {
    return qty * 160; // 160 hours per work month
  }
  // Standard per_hour, hr, hrs, hours, man_hour, or general quantity
  return qty;
}

/**
 * Determine default capacity hours based on phase timeframe or budget if not explicitly provided
 */
export function resolvePhaseCapacityHours(phase: ProjectPhase): number {
  if (typeof phase.capacityHours === 'number' && phase.capacityHours >= 0) {
    return phase.capacityHours;
  }

  // Derive estimated capacity from phase duration:
  // standard subcontractor team of 2 specialists working 8 hours/day
  const workingDays = calculateWorkingDays(phase.startDate, phase.endDate);
  const derivedCapacity = workingDays * 8 * 2; // e.g. 20 days * 16h = 320h

  return Math.max(0, derivedCapacity);
}

/**
 * Calculate phase-level and project-level capacity metrics
 */
export function calculatePhaseCapacityMetrics(project: Project): ProjectCapacitySummary {
  const phases = project.phases || [];
  const items = project.selectedItems || [];

  // Filter subcontractor cost items
  const subItems = items.filter((item) => item.type === 'subcontractor');

  const phaseMetrics: PhaseCapacityMetric[] = phases.map((phase, index) => {
    // Subcontractors allocated to this specific phase
    const phaseSubItems = subItems.filter((i) => i.phaseId === phase.id);

    // Sum allocated hours
    let allocatedHours = 0;
    const breakdown = phaseSubItems.map((item) => {
      const hours = extractWorkingHours(item);
      allocatedHours += hours;
      return {
        itemId: item.id,
        name: item.name,
        provider: item.supplierOrProvider || 'Subcontractor Trade',
        hours,
        hourlyRate: item.unitCost || 0,
        totalSpend: typeof item.totalCost === 'number' ? item.totalCost : hours * (item.unitCost || 0),
        unit: item.unit || 'hr'
      };
    });

    const capacityHours = resolvePhaseCapacityHours(phase);
    const isZeroCapacity = capacityHours === 0;
    const remainingHours = Math.max(0, capacityHours - allocatedHours);
    const overAllocatedHours = Math.max(0, allocatedHours - capacityHours);
    const isOverAllocated = allocatedHours > capacityHours;

    let utilizationPct = 0;
    if (capacityHours > 0) {
      utilizationPct = Number(((allocatedHours / capacityHours) * 100).toFixed(1));
    } else if (allocatedHours > 0) {
      utilizationPct = 100; // Zero capacity but has allocations
    }

    let statusCategory: PhaseCapacityMetric['statusCategory'] = 'within_capacity';
    if (isZeroCapacity && allocatedHours > 0) {
      statusCategory = 'zero_capacity';
    } else if (isOverAllocated) {
      statusCategory = 'over_allocated';
    } else if (utilizationPct >= 90) {
      statusCategory = 'near_capacity';
    }

    // Clean human-friendly phase label (e.g. "Phase 1: Alloy Procurement" -> "Phase 1")
    const shortName = phase.name.includes(':') 
      ? phase.name.split(':')[0].trim() 
      : phase.name.length > 18 
      ? `Phase ${phase.phaseNumber || index + 1}` 
      : phase.name;

    return {
      phaseId: phase.id,
      phaseNumber: phase.phaseNumber || index + 1,
      phaseName: shortName,
      fullPhaseName: phase.name,
      startDate: phase.startDate,
      endDate: phase.endDate,
      status: phase.status,
      capacityHours,
      allocatedHours,
      remainingHours,
      overAllocatedHours,
      utilizationPct,
      isOverAllocated,
      isZeroCapacity,
      statusCategory,
      subcontractorCount: phaseSubItems.length,
      subcontractorBreakdown: breakdown
    };
  });

  const totalCapacityHours = phaseMetrics.reduce((sum, p) => sum + p.capacityHours, 0);
  const totalAllocatedHours = phaseMetrics.reduce((sum, p) => sum + p.allocatedHours, 0);
  const totalRemainingHours = Math.max(0, totalCapacityHours - totalAllocatedHours);
  const totalOverAllocatedHours = phaseMetrics.reduce((sum, p) => sum + p.overAllocatedHours, 0);
  const overallUtilizationPct = totalCapacityHours > 0 
    ? Number(((totalAllocatedHours / totalCapacityHours) * 100).toFixed(1)) 
    : 0;
  const overAllocatedPhaseCount = phaseMetrics.filter((p) => p.isOverAllocated).length;

  return {
    projectCode: project.code,
    projectName: project.name,
    totalCapacityHours,
    totalAllocatedHours,
    totalRemainingHours,
    totalOverAllocatedHours,
    overallUtilizationPct,
    overAllocatedPhaseCount,
    totalPhaseCount: phaseMetrics.length,
    phases: phaseMetrics
  };
}
