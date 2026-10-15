/**
 * Auto-Numbering Configuration and Sequence Generation Service
 * Enables customizable unique ID patterns across all enterprise entities.
 */

export type AutoNumberEntityType =
  | 'materials'
  | 'inventory'
  | 'subcontractors'
  | 'outsourced'
  | 'suppliers'
  | 'projects'
  | 'inventory_in'
  | 'inventory_out'
  | 'batch_lot'
  | 'produce'
  | 'material'
  | 'subcontractor'
  | 'outsourced_service'
  | 'supplier'
  | 'project'
  | string;

export interface AutoNumberRule {
  entityKey: AutoNumberEntityType;
  entityType?: AutoNumberEntityType;
  label: string;
  prefix: string;
  suffix: string;
  padding: number; // e.g. 4 -> "0001"
  paddingDigits?: number;
  nextNumber: number; // e.g. 1001
  description: string;
  sampleExample: string;
  active?: boolean;
}

export const DEFAULT_AUTONUMBER_RULES: AutoNumberRule[] = [
  {
    entityKey: 'materials',
    entityType: 'material',
    label: 'Materials Master Code',
    prefix: 'MAT-',
    suffix: '',
    padding: 4,
    paddingDigits: 4,
    nextNumber: 1045,
    description: 'Auto-assigned code for raw materials, engineering alloys, and hardware',
    sampleExample: 'MAT-1045',
    active: true
  },
  {
    entityKey: 'inventory',
    entityType: 'inventory',
    label: 'Inventory Item SKU',
    prefix: 'SKU-INV-',
    suffix: '',
    padding: 4,
    paddingDigits: 4,
    nextNumber: 2050,
    description: 'Central inventory tracking number and storage location barcode tag',
    sampleExample: 'SKU-INV-2050',
    active: true
  },
  {
    entityKey: 'inventory_in',
    entityType: 'inventory_in',
    label: 'Inventory IN Receipt (GRN)',
    prefix: 'GRN-',
    suffix: '-LKR',
    padding: 5,
    paddingDigits: 5,
    nextNumber: 5001,
    description: 'Goods Received Note unique reference for materials entering inventory',
    sampleExample: 'GRN-05001-LKR',
    active: true
  },
  {
    entityKey: 'inventory_out',
    entityType: 'inventory_out',
    label: 'Inventory OUT Dispatch (GIN)',
    prefix: 'GIN-',
    suffix: '-DISP',
    padding: 5,
    paddingDigits: 5,
    nextNumber: 3001,
    description: 'Goods Issued Note unique reference for materials leaving inventory to projects',
    sampleExample: 'GIN-03001-DISP',
    active: true
  },
  {
    entityKey: 'batch_lot',
    entityType: 'batch_lot',
    label: 'Batch & Lot Reference Number',
    prefix: 'LOT-',
    suffix: '',
    padding: 5,
    paddingDigits: 5,
    nextNumber: 8001,
    description: 'Unique batch traceability number linked across transactions and suppliers',
    sampleExample: 'LOT-08001',
    active: true
  },
  {
    entityKey: 'projects',
    entityType: 'project',
    label: 'Project Identification Code',
    prefix: 'PRJ-LK-',
    suffix: '',
    padding: 3,
    paddingDigits: 3,
    nextNumber: 108,
    description: 'Commercial project reference code for budgeting, milestones, and deliverables',
    sampleExample: 'PRJ-LK-108',
    active: true
  },
  {
    entityKey: 'subcontractors',
    entityType: 'subcontractor',
    label: 'Subcontractor Rate Schedule ID',
    prefix: 'SUB-RATE-',
    suffix: '',
    padding: 4,
    paddingDigits: 4,
    nextNumber: 4015,
    description: 'Unique trade contractor labour code and SLA schedule reference',
    sampleExample: 'SUB-RATE-4015',
    active: true
  },
  {
    entityKey: 'outsourced',
    entityType: 'outsourced_service',
    label: 'Outsourced Service Tariff Code',
    prefix: 'OUT-SVC-',
    suffix: '',
    padding: 4,
    paddingDigits: 4,
    nextNumber: 6020,
    description: 'Unique carrier, utility, and inspection service contract number',
    sampleExample: 'OUT-SVC-6020',
    active: true
  },
  {
    entityKey: 'suppliers',
    entityType: 'supplier',
    label: 'Supplier Registration ID',
    prefix: 'SUP-VEN-',
    suffix: '',
    padding: 4,
    paddingDigits: 4,
    nextNumber: 1012,
    description: 'Vendor master directory number and procurement account reference',
    sampleExample: 'SUP-VEN-1012',
    active: true
  },
  {
    entityKey: 'produce',
    entityType: 'produce',
    label: 'Produced Product / Service Code',
    prefix: 'PRD-SYS-',
    suffix: '',
    padding: 4,
    paddingDigits: 4,
    nextNumber: 7030,
    description: 'Internal manufacturing product catalogue reference code',
    sampleExample: 'PRD-SYS-7030',
    active: true
  }
];

const AUTONUMBER_STORAGE_KEY = 'remix_enterprise_autonumber_rules_v1';

/**
 * Normalizes rule to ensure backward and forward compatibility
 */
function normalizeRule(rule: AutoNumberRule, defaultRule?: AutoNumberRule): AutoNumberRule {
  const entityType = rule.entityType || defaultRule?.entityType || rule.entityKey;
  const padding = rule.paddingDigits || rule.padding || defaultRule?.padding || 4;
  return {
    ...defaultRule,
    ...rule,
    entityType,
    padding,
    paddingDigits: padding,
    active: rule.active !== undefined ? rule.active : true,
    suffix: rule.suffix || ''
  };
}

/**
 * Get all configured auto-numbering rules from localStorage or defaults
 */
export function getStoredAutoNumberRules(): AutoNumberRule[] {
  try {
    const raw = localStorage.getItem(AUTONUMBER_STORAGE_KEY);
    if (!raw) return DEFAULT_AUTONUMBER_RULES;
    const parsed = JSON.parse(raw) as AutoNumberRule[];
    // Ensure all default keys exist
    const merged = DEFAULT_AUTONUMBER_RULES.map(def => {
      const existing = parsed.find(p => p.entityKey === def.entityKey || p.entityType === def.entityType);
      return normalizeRule(existing || def, def);
    });
    return merged;
  } catch (err) {
    console.warn('Failed to load auto-number rules, using defaults', err);
    return DEFAULT_AUTONUMBER_RULES;
  }
}

/**
 * Save updated auto-numbering rules to localStorage
 */
export function saveStoredAutoNumberRules(rules: AutoNumberRule[]): void {
  try {
    const normalized = rules.map(r => {
      const def = DEFAULT_AUTONUMBER_RULES.find(d => d.entityKey === r.entityKey || d.entityType === r.entityType);
      return normalizeRule(r, def);
    });
    localStorage.setItem(AUTONUMBER_STORAGE_KEY, JSON.stringify(normalized));
  } catch (err) {
    console.error('Failed to save auto-number rules', err);
  }
}

export const saveAutoNumberRules = saveStoredAutoNumberRules;

/**
 * Reset all auto-numbering rules to enterprise defaults
 */
export function resetAutoNumberRules(): AutoNumberRule[] {
  saveStoredAutoNumberRules(DEFAULT_AUTONUMBER_RULES);
  return DEFAULT_AUTONUMBER_RULES;
}

/**
 * Format a number using a rule's prefix, padding, and suffix
 */
export function formatWithRule(rule: AutoNumberRule, num?: number): string {
  const targetNum = num !== undefined ? num : rule.nextNumber;
  const padding = rule.paddingDigits || rule.padding || 4;
  const numStr = String(targetNum).padStart(Math.max(1, padding), '0');
  return `${rule.prefix || ''}${numStr}${rule.suffix || ''}`;
}

/**
 * Generate preview sample text for a rule
 */
export function generateSampleNumber(rule: AutoNumberRule): string {
  return formatWithRule(rule);
}

/**
 * Peek what the next number will look like without incrementing the counter
 */
export function peekNextNumber(entityKeyOrType: string): string {
  const rules = getStoredAutoNumberRules();
  const rule = rules.find(r => r.entityKey === entityKeyOrType || r.entityType === entityKeyOrType);
  if (!rule) return `${entityKeyOrType.toUpperCase()}-0001`;
  return formatWithRule(rule);
}

/**
 * Generate the next formatted unique number for an entity and increment its counter
 */
export function generateNextNumber(entityKeyOrType: string, increment: boolean = true): string {
  const rules = getStoredAutoNumberRules();
  const index = rules.findIndex(r => r.entityKey === entityKeyOrType || r.entityType === entityKeyOrType);
  if (index === -1) {
    return `${entityKeyOrType.toUpperCase()}-${Date.now().toString().slice(-4)}`;
  }

  const rule = rules[index];
  const generatedId = formatWithRule(rule);

  if (increment) {
    rules[index] = {
      ...rule,
      nextNumber: rule.nextNumber + 1
    };
    saveStoredAutoNumberRules(rules);
  }

  return generatedId;
}

/**
 * Update a specific auto-number rule in settings
 */
export function updateAutoNumberRule(
  entityKeyOrType: string,
  updates: Partial<AutoNumberRule>
): AutoNumberRule[] {
  const rules = getStoredAutoNumberRules();
  const updated = rules.map(r => {
    if (r.entityKey === entityKeyOrType || r.entityType === entityKeyOrType) {
      const merged = normalizeRule({ ...r, ...updates });
      merged.sampleExample = formatWithRule(merged);
      return merged;
    }
    return r;
  });
  saveStoredAutoNumberRules(updated);
  return updated;
}

/**
 * Reset an auto-numbering rule back to default settings
 */
export function resetAutoNumberRule(entityKeyOrType: string): AutoNumberRule[] {
  const defaultRule = DEFAULT_AUTONUMBER_RULES.find(r => r.entityKey === entityKeyOrType || r.entityType === entityKeyOrType);
  if (!defaultRule) return getStoredAutoNumberRules();
  return updateAutoNumberRule(entityKeyOrType, defaultRule);
}
