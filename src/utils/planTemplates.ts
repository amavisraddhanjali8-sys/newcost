import { PlanTemplate, BudgetaryPlan, ProjectCostItem } from '../types';

const STORAGE_KEY = 'fxtt_plan_templates';

export const BUILT_IN_PLAN_TEMPLATES: PlanTemplate[] = [
  {
    id: 'tmpl-aero-baseline',
    name: 'Aerospace AS9100D Certified Baseline',
    description: 'High-precision aerospace airframe and tooling plan using vacuum-arc remelted titanium, 6061-T6 plate, and AS9100D 5-axis CNC machining.',
    category: 'Aerospace & Defense',
    tags: ['AS9100D', 'Titanium', '5-Axis CNC', 'Certified Baseline'],
    targetMarginPct: 35.0,
    overheadPct: 8.5,
    contingencyPct: 5.0,
    themeId: 'airbus-cobalt',
    createdAt: '2026-01-10',
    isBuiltIn: true,
    items: [
      {
        id: 'tmpl-item-01',
        phaseId: 'phase-01',
        type: 'material',
        itemId: 'mat-01',
        name: 'Aerospace Structural Aluminum 6061-T6 Plate (12mm)',
        category: 'Metals & Structural Alloys',
        supplierOrProvider: 'Apex Precision Metallurgy Corp',
        quantity: 50,
        unit: 'sheet',
        unitCost: 357.0,
        discountPct: 15.0,
        totalCost: 15172.5,
        selectedOptionIndex: 0,
        alternativeOptions: [
          { provider: 'Apex Precision Metallurgy Corp', unitCost: 357.0, savingsDiff: 0, notes: 'Direct mill certified lot' },
          { provider: 'Midwest Metal Supply', unitCost: 382.0, savingsDiff: -1250.0, notes: 'Higher inventory, 7% markup' }
        ]
      },
      {
        id: 'tmpl-item-02',
        phaseId: 'phase-01',
        type: 'material',
        itemId: 'mat-03',
        name: 'Titanium Grade 5 (Ti-6Al-4V) Billets (150mm)',
        category: 'High-Performance Synthetics & Exotic Metals',
        supplierOrProvider: 'Apex Precision Metallurgy Corp',
        quantity: 120,
        unit: 'kg',
        unitCost: 85.5,
        discountPct: 10.0,
        totalCost: 9234.0,
        selectedOptionIndex: 0,
        alternativeOptions: [
          { provider: 'Apex Precision Metallurgy Corp', unitCost: 85.5, savingsDiff: 0, notes: 'Vacuum arc remelted certified spec' }
        ]
      },
      {
        id: 'tmpl-item-03',
        phaseId: 'phase-02',
        type: 'subcontractor',
        itemId: 'sub-01',
        name: '5-Axis Simultaneous CNC Machining & Contouring',
        category: 'Precision Machining & Tooling',
        supplierOrProvider: 'Vertex Machining Works LLC',
        quantity: 160,
        unit: 'per_hour',
        unitCost: 145.0,
        discountPct: 5.0,
        totalCost: 22040.0,
        selectedOptionIndex: 0,
        alternativeOptions: [
          { provider: 'Vertex Machining Works LLC', unitCost: 145.0, savingsDiff: 0, notes: 'Direct spindle allocation' }
        ]
      },
      {
        id: 'tmpl-item-04',
        phaseId: 'phase-03',
        type: 'outsourced',
        itemId: 'out-01',
        name: 'Aerospace Coordinate Measuring Machine (CMM) Scan & NDT',
        category: 'Quality Assurance & Non-Destructive Testing (NDT)',
        supplierOrProvider: 'Apex Precision Metallurgy Corp',
        quantity: 40,
        unit: 'per_hour',
        unitCost: 185.0,
        discountPct: 0,
        totalCost: 7400.0,
        selectedOptionIndex: 0,
        alternativeOptions: []
      }
    ]
  },
  {
    id: 'tmpl-value-eng',
    name: 'Value-Engineered Domestic Alloys & Rapid CNC',
    description: 'Cost-optimized alternative replacing exotic billets with certified domestic structural alloys, tier-2 domestic machining, and consolidated logistics.',
    category: 'Value Engineering',
    tags: ['Cost-Optimized', 'Domestic', 'Fast-Turnaround', '12% Cost Savings'],
    targetMarginPct: 38.0,
    overheadPct: 7.5,
    contingencyPct: 4.0,
    themeId: 'emerald-oasis',
    createdAt: '2026-01-20',
    isBuiltIn: true,
    items: [
      {
        id: 'tmpl-item-05',
        phaseId: 'phase-01',
        type: 'material',
        itemId: 'mat-02',
        name: 'Standard Cold-Rolled Carbon Steel 1018 Bar (50mm)',
        category: 'Metals & Structural Alloys',
        supplierOrProvider: 'Midwest Metal Supply',
        quantity: 200,
        unit: 'bar',
        unitCost: 68.0,
        discountPct: 12.0,
        totalCost: 11968.0,
        selectedOptionIndex: 0,
        alternativeOptions: []
      },
      {
        id: 'tmpl-item-06',
        phaseId: 'phase-02',
        type: 'subcontractor',
        itemId: 'sub-02',
        name: '3-Axis Standard CNC Milling & Surfacing',
        category: 'Precision Machining & Tooling',
        supplierOrProvider: 'Midwest Metal Supply',
        quantity: 120,
        unit: 'per_hour',
        unitCost: 95.0,
        discountPct: 8.0,
        totalCost: 10488.0,
        selectedOptionIndex: 0,
        alternativeOptions: []
      },
      {
        id: 'tmpl-item-07',
        phaseId: 'phase-03',
        type: 'outsourced',
        itemId: 'out-02',
        name: 'Consolidated LTL Flatbed Freight & Handling',
        category: 'Heavy Transportation & Logistics',
        supplierOrProvider: 'Global Freight & Rigging Network',
        quantity: 4,
        unit: 'per_trip',
        unitCost: 1250.0,
        discountPct: 10.0,
        totalCost: 4500.0,
        selectedOptionIndex: 0,
        alternativeOptions: []
      }
    ]
  },
  {
    id: 'tmpl-automation-robotics',
    name: 'Turnkey Industrial Robotics & Automation Package',
    description: 'Comprehensive plan for 6-axis articulated arm cell, gantry linear axes, PLC electrical integration, and safety cage commissioning.',
    category: 'Robotics & Automation',
    tags: ['Robotics', 'Gantry', 'PLC Controls', 'Turnkey Integration'],
    targetMarginPct: 32.0,
    overheadPct: 9.0,
    contingencyPct: 6.0,
    themeId: 'pacific-sky',
    createdAt: '2026-02-01',
    isBuiltIn: true,
    items: [
      {
        id: 'tmpl-item-08',
        phaseId: 'phase-01',
        type: 'material',
        itemId: 'mat-05',
        name: 'High-Pressure Hydraulic Ram Actuator (750kN)',
        category: 'Pneumatics, Hydraulics & Power Transmission',
        supplierOrProvider: 'Titan Heavy Structural Fabricators',
        quantity: 4,
        unit: 'pcs',
        unitCost: 3515.0,
        discountPct: 7.5,
        totalCost: 13005.5,
        selectedOptionIndex: 0,
        alternativeOptions: []
      },
      {
        id: 'tmpl-item-09',
        phaseId: 'phase-02',
        type: 'subcontractor',
        itemId: 'sub-03',
        name: 'PLC & Control Panel Wiring / Electrical Integration',
        category: 'Electrical & Automation Services',
        supplierOrProvider: 'ElectraLogic Automation Corp',
        quantity: 80,
        unit: 'per_hour',
        unitCost: 125.0,
        discountPct: 5.0,
        totalCost: 9500.0,
        selectedOptionIndex: 0,
        alternativeOptions: []
      },
      {
        id: 'tmpl-item-10',
        phaseId: 'phase-03',
        type: 'outsourced',
        itemId: 'out-03',
        name: 'CE / UL Field Safety Evaluation & Risk Certification',
        category: 'Regulatory & Certification Audits',
        supplierOrProvider: 'Apex Precision Metallurgy Corp',
        quantity: 1,
        unit: 'fixed_fee',
        unitCost: 5800.0,
        discountPct: 0,
        totalCost: 5800.0,
        selectedOptionIndex: 0,
        alternativeOptions: []
      }
    ]
  },
  {
    id: 'tmpl-fast-prototype',
    name: 'Rapid Prototype & Fast-Track Commissioning',
    description: 'Accelerated 4-week delivery plan with premium rush machining rates, priority air freight, and dedicated testing engineering.',
    category: 'Prototyping & Speed',
    tags: ['Fast-Track', 'Rush Delivery', 'Rapid Prototype', 'Premium Rates'],
    targetMarginPct: 40.0,
    overheadPct: 10.0,
    contingencyPct: 8.0,
    themeId: 'aurora-violet',
    createdAt: '2026-02-15',
    isBuiltIn: true,
    items: [
      {
        id: 'tmpl-item-11',
        phaseId: 'phase-01',
        type: 'material',
        itemId: 'mat-01',
        name: 'Aerospace Structural Aluminum 6061-T6 Plate (12mm)',
        category: 'Metals & Structural Alloys',
        supplierOrProvider: 'Apex Precision Metallurgy Corp',
        quantity: 20,
        unit: 'sheet',
        unitCost: 357.0,
        discountPct: 0,
        totalCost: 7140.0,
        selectedOptionIndex: 0,
        alternativeOptions: []
      },
      {
        id: 'tmpl-item-12',
        phaseId: 'phase-02',
        type: 'subcontractor',
        itemId: 'sub-01',
        name: '5-Axis Simultaneous CNC Machining & Contouring (Rush Rate)',
        category: 'Precision Machining & Tooling',
        supplierOrProvider: 'Vertex Machining Works LLC',
        quantity: 60,
        unit: 'per_hour',
        unitCost: 195.0,
        discountPct: 0,
        totalCost: 11700.0,
        selectedOptionIndex: 0,
        alternativeOptions: []
      },
      {
        id: 'tmpl-item-13',
        phaseId: 'phase-03',
        type: 'outsourced',
        itemId: 'out-04',
        name: 'Expedited Air Cargo Logistics (Next-Flight-Out)',
        category: 'Heavy Transportation & Logistics',
        supplierOrProvider: 'Global Freight & Rigging Network',
        quantity: 2,
        unit: 'per_trip',
        unitCost: 3200.0,
        discountPct: 0,
        totalCost: 6400.0,
        selectedOptionIndex: 0,
        alternativeOptions: []
      }
    ]
  }
];

export function getCustomPlanTemplates(): PlanTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Error loading custom plan templates:', e);
    return [];
  }
}

export function getAllPlanTemplates(): PlanTemplate[] {
  const custom = getCustomPlanTemplates();
  return [...BUILT_IN_PLAN_TEMPLATES, ...custom];
}

export function savePlanTemplate(template: Omit<PlanTemplate, 'id' | 'createdAt'> & { id?: string }): PlanTemplate {
  const custom = getCustomPlanTemplates();
  const id = template.id || `tmpl-${Date.now()}`;
  const now = new Date().toISOString().split('T')[0];

  const newTemplate: PlanTemplate = {
    ...template,
    id,
    createdAt: (template as any).createdAt || now,
    updatedAt: now,
    isBuiltIn: false
  };

  const existingIdx = custom.findIndex(t => t.id === id);
  let updated: PlanTemplate[];
  if (existingIdx >= 0) {
    updated = [...custom];
    updated[existingIdx] = newTemplate;
  } else {
    updated = [newTemplate, ...custom];
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('fxtt-plan-templates-updated', { detail: { template: newTemplate } }));
  } catch (e) {
    console.error('Error saving plan template to localStorage:', e);
  }

  return newTemplate;
}

export function deletePlanTemplate(id: string): boolean {
  const custom = getCustomPlanTemplates();
  const filtered = custom.filter(t => t.id !== id);
  if (filtered.length === custom.length) return false;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    window.dispatchEvent(new CustomEvent('fxtt-plan-templates-updated', { detail: { deletedId: id } }));
    return true;
  } catch (e) {
    console.error('Error deleting plan template:', e);
    return false;
  }
}

/**
 * Deep clones items with new unique IDs to guarantee clean separation between projects/plans
 */
export function cloneCostItems(items: ProjectCostItem[], defaultPhaseId?: string): ProjectCostItem[] {
  return items.map((item, idx) => ({
    ...item,
    id: `item-${Date.now()}-${idx}-${Math.floor(Math.random() * 10000)}`,
    phaseId: defaultPhaseId || item.phaseId || 'phase-01',
    alternativeOptions: item.alternativeOptions ? item.alternativeOptions.map(opt => ({ ...opt })) : []
  }));
}

/**
 * Creates a unique BudgetaryPlan instance from a PlanTemplate
 */
export function createPlanFromTemplate(
  template: PlanTemplate,
  customName?: string,
  overrides?: Partial<BudgetaryPlan>,
  targetPhaseId?: string
): BudgetaryPlan {
  const planId = `plan-${Date.now()}`;
  const clonedItems = cloneCostItems(template.items, targetPhaseId);

  return {
    id: planId,
    name: customName || template.name,
    description: template.description,
    isBaseline: false,
    createdAt: new Date().toISOString().split('T')[0],
    targetMarginPct: template.targetMarginPct,
    overheadPct: template.overheadPct,
    contingencyPct: template.contingencyPct,
    selectedItems: clonedItems,
    themeId: template.themeId || 'pacific-sky',
    customGradient: template.customGradient,
    templateId: template.id,
    ...overrides
  };
}

/**
 * Creates a unique separated copy of a plan from another project
 */
export function clonePlanFromOtherProject(
  sourcePlan: BudgetaryPlan,
  sourceProject: { id: string; code: string; name: string; clientName: string },
  customName?: string,
  selectedItemIds?: string[],
  targetPhaseId?: string
): BudgetaryPlan {
  const planId = `plan-${Date.now()}`;
  
  let sourceItems = sourcePlan.selectedItems || [];
  if (selectedItemIds && selectedItemIds.length > 0) {
    sourceItems = sourceItems.filter(i => selectedItemIds.includes(i.id));
  }

  const clonedItems = cloneCostItems(sourceItems, targetPhaseId);

  return {
    id: planId,
    name: customName || `${sourcePlan.name} (from ${sourceProject.code})`,
    description: sourcePlan.description || `Imported from ${sourceProject.name} (${sourceProject.clientName}).`,
    isBaseline: false,
    createdAt: new Date().toISOString().split('T')[0],
    targetMarginPct: sourcePlan.targetMarginPct || 35.0,
    overheadPct: sourcePlan.overheadPct || 8.5,
    contingencyPct: sourcePlan.contingencyPct || 5.0,
    selectedItems: clonedItems,
    themeId: sourcePlan.themeId || 'emerald-oasis',
    customGradient: sourcePlan.customGradient,
    sourceProjectId: sourceProject.id,
    sourceProjectCode: sourceProject.code
  };
}
