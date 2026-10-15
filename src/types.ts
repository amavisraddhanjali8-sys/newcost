/**
 * Types and interfaces for Cost, Supplier, Rate, Project Profitability, and Inventory Management
 */

export type EntityId = string;

export interface SupplierContract {
  contractId: string;
  contractNumber?: string;
  title: string;
  value: number;
  startDate: string;
  endDate: string;
  status: 'Completed' | 'Active' | 'Renewed' | 'Pending Approval';
  scopeType?: 'materials' | 'final_product' | 'full_contract' | 'hybrid' | 'service';
  type?: string;
  deliverablesSummary?: string;
  scopeDescription?: string;
  paymentSchedule?: string;
  paymentTerms?: string;
  currency?: string;
  attachmentUrl?: string;
  notes?: string;
}

export interface Supplier {
  id: EntityId;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  category: 'Materials' | 'Outsourced' | 'Subcontractor' | 'Turnkey Project';
  supplyScope: 'materials' | 'final_product' | 'full_contract' | 'hybrid';
  paymentTerms: 'Immediate' | 'Net 15' | 'Net 30' | 'Net 60' | 'Net 90' | 'Advance 50%' | 'Milestone Based' | 'LC / Commercial Escrow' | string;
  rating: number; // 1 to 5
  onTimeDeliveryPct: number;
  qualityScorePct: number;
  complianceScorePct?: number;
  riskLevel?: 'Low' | 'Medium' | 'High';
  status: 'Active' | 'Under Review' | 'Preferred' | 'Suspended';
  country: string;
  city: string;
  vendorTaxId?: string;
  certifications?: string[];
  creditLimit?: number;
  currency?: string;
  contractHistory: SupplierContract[];
  imageUrl?: string;
  notes: string;
}

export interface VolumePriceTier {
  minQty: number;
  maxQty?: number;
  unitPrice: number;
  discountPct: number;
  label: string;
}

export interface PriceHistoryRecord {
  id: string;
  date: string;
  previousPrice: number;
  newPrice: number;
  changePct: number;
  reason: string;
  updatedBy: string;
}

export interface TierChangeDetail {
  tierLabel: string;
  previousMinQty?: number;
  newMinQty?: number;
  previousMaxQty?: number;
  newMaxQty?: number;
  previousPrice?: number;
  newPrice?: number;
  previousDiscountPct?: number;
  newDiscountPct?: number;
  changeType?: 'price' | 'discount' | 'range_size' | 'all';
}

/**
 * Individual price change record for a specific vendor quote over time
 */
export interface VendorPriceChangeRecord {
  id: string;
  date: string;
  price: number;
  previousPrice?: number;
  changePct?: number;
  reason: string;
  quoteRef?: string;
  moq?: number;
  leadTimeDays?: number;
  updatedBy: string;
  changedTiers?: VolumePriceTier[];
  targetTierLabel?: string;
  tierChanges?: TierChangeDetail[];
  appliedChangesSummary?: string[];
}

/**
 * Supplier / Vendor quote supplying a specific material with distinct pricing and history
 */
export interface MaterialVendorQuote {
  vendorId: string;
  vendorName: string;
  country?: string;
  currentPrice: number;
  currency?: string;
  leadTimeDays: number;
  moq?: number; // Minimum Order Quantity
  isPreferred?: boolean;
  status: 'Active' | 'Preferred' | 'Secondary' | 'Best Price' | 'Under Review';
  priceHistory: VendorPriceChangeRecord[];
  lastUpdated: string;
  volumePricing?: VolumePriceTier[];
  contactEmail?: string;
  contactPhone?: string;
  notes?: string;
}

/**
 * Produced / Supplied Product or Service by our enterprise
 * 4-Tier Hierarchy: Category -> Subcategory -> More Subcategory -> Product/Service Item
 */
export interface ProduceItem {
  id: EntityId;
  code: string;
  name: string;
  type: 'product' | 'service';
  category: string; // e.g. Industrial Automation & Machinery
  subCategory: string; // e.g. Aerospace Stamping & Hydro-Forming
  moreSubCategory: string; // e.g. Turnkey Closed-Loop Servo Press
  itemClassification?: 'produced_product' | 'delivered_service' | 'turnkey_system' | string;
  description?: string;
  unit: string; // unit, assembly, system, month, hr
  costPrice: number; // internal production cost
  retailPrice: number; // quoted/retail price
  defaultDiscountPct: number;
  bundlesAndRanges?: VolumePriceTier[];
  leadTimeDays: number;
  status: 'Active' | 'In Production' | 'Custom Order' | 'Archived';
  specSheetUrl?: string;
  imageUrl?: string;
  priceHistory: PriceHistoryRecord[];
  lastUpdated: string;
  currency?: string;
}

export interface MaterialItem {
  id: EntityId;
  code: string;
  name: string;
  category: string; // e.g., Metals & Structural Alloys
  subCategory: string; // e.g., Aircraft & Marine Alloys
  moreSubCategory: string; // e.g., Pre-Tempered Extrusions & Plates
  itemClassification: 'raw_material' | 'final_product' | 'full_contract' | 'hardware' | string;
  supplierId: EntityId;
  supplierName: string;
  unit: string; // kg, m, pcs, ton, sheet, bundle
  retailPrice: number;
  defaultDiscountPct: number;
  volumePricing: VolumePriceTier[];
  inStock: number;
  reorderPoint: number;
  leadTimeDays: number;
  priceHistory: PriceHistoryRecord[];
  vendorQuotes?: MaterialVendorQuote[];
  specSheetUrl?: string;
  imageUrl?: string;
  lastUpdated: string;
}

export interface OutsourcedService {
  id: EntityId;
  code?: string;
  name: string;
  providerId: EntityId;
  providerName: string;
  category: 'Banking & Financial' | 'Telecommunications' | 'Enterprise Internet' | 'Heavy Transportation & Logistics' | 'Grid & Industrial Power' | 'Quality & NDT Inspection' | 'Legal & Compliance' | string;
  subCategory: string;
  moreSubCategory?: string;
  baseUnitType: 'per_km' | 'per_kwh' | 'per_month' | 'per_transaction' | 'per_hour' | 'per_gb' | 'fixed_per_contract' | string;
  rate: number;
  retailPrice: number;
  tierRates: Array<{
    minVolume: number;
    maxVolume?: number;
    rate: number;
    description: string;
  }>;
  slaLevel: 'Standard SLA' | 'Premium 99.9%' | 'Mission Critical 24/7' | string;
  imageUrl?: string;
  priceHistory: Array<{
    id: string;
    date: string;
    oldRate: number;
    newRate: number;
    reason: string;
    updatedBy: string;
  }>;
  lastUpdated: string;
}

export interface AlternativeOption {
  id: string;
  title: string;
  description: string;
  adjustedCost: number;
  adjustedPrice: number;
  projectedMarginPct: number;
  isRecommended: boolean;
}

export type ProjectItem = ProjectCostItem;

export interface SubcontractorRateItem {
  id: EntityId;
  code?: string;
  name?: string;
  subcontractorId: EntityId;
  subcontractorName: string;
  serviceType: string;
  serviceCategory?: string;
  serviceSubCategory?: string;
  moreServiceSubCategory?: string;
  category?: string;
  subCategory?: string;
  nicheServiceName?: string;
  rateModel?: 'hourly_labour' | 'daily_rate' | 'bulk_volume' | 'retail_rate' | 'full_contract_lump_sum';
  baseRate: number;
  rate?: number;
  retailRate?: number;
  unit: string;
  bulkPricingRanges?: Array<{
    minVolume: number;
    maxVolume?: number;
    unitRate: number;
    discountPct: number;
  }>;
  rateRanges?: Array<{
    minUnits: number;
    maxUnits?: number;
    rate: number;
    label: string;
  }>;
  fullContractEstimate?: number;
  fullContractPrice?: number;
  skillLevel: string;
  imageUrl?: string;
  rateHistory?: Array<{
    id: string;
    date: string;
    oldRate: number;
    newRate: number;
    changeReason: string;
    updatedBy: string;
  }>;
  priceHistory?: Array<{
    id: string;
    date: string;
    previousRate: number;
    previousPrice?: number;
    newRate: number;
    newPrice?: number;
    changePct?: number;
    changeReason?: string;
    reason: string;
    updatedBy: string;
  }>;
  lastUpdated: string;
}

export interface InventoryItem {
  id: EntityId;
  materialId?: EntityId;
  itemName?: string;
  name?: string;
  sku: string;
  category: string;
  currentStock?: number;
  allocatedStock?: number;
  availableStock?: number;
  onHand?: number;
  reserved?: number;
  available?: number;
  reorderLevel: number;
  unitCost: number;
  totalValuation?: number;
  unit?: string;
  supplierId?: EntityId;
  supplierName?: string;
  allocatedProjectId?: EntityId;
  projectPhase?: string;
  location: string;
  stage?: string;
  status: string;
  lastMovementDate?: string;
  lastAuditDate?: string;
}

export interface InventoryTransaction {
  id: string;
  transactionNumber?: string;
  type: 'IN' | 'OUT';
  date: string;
  timestamp: string;
  projectId?: string;
  projectCode?: string;
  projectName?: string;
  materialId: string;
  materialCode: string;
  materialName: string;
  inventorySku?: string;
  inventoryItemId?: string;
  barcode: string;
  batchLotNumber?: string;
  requisitionRef?: string;
  requisitionNumber?: string;
  supplierId?: string;
  supplierName?: string;
  recordedBy?: string;
  notes?: string;
  currency?: string;
  quantity: number;
  unit: string;
  price: number;
  discount: number; // percentage (e.g. 5 for 5%)
  discountAmount?: number;
  totalAmount: number;
  previousAvailableQuantity: number;
  newAvailableQuantity: number;
}

export interface ProjectPhase {
  id: string;
  name: string;
  description?: string;
  budget?: number;
  actualCost: number;
  plannedCost?: number;
  startDate: string;
  endDate: string;
  status: 'Not Started' | 'In Progress' | 'Completed';
  phaseNumber?: number;
  items?: ProjectCostItem[];
  projectedCost?: number;
  consumptionPct?: number;
  isOverrun?: boolean;
  capacityHours?: number;
  allocatedHours?: number;
}

export interface ProjectCostItem {
  id: string;
  phaseId: string;
  type: 'material' | 'subcontractor' | 'outsourced';
  itemId?: string;
  name: string;
  category?: string;
  supplierOrProvider: string;
  quantity: number;
  unit: string;
  unitCost: number;
  discountPct?: number;
  totalCost: number;
  notes?: string;
  selectedOptionIndex?: number;
  alternativeOptions?: Array<{
    provider: string;
    unitCost: number;
    savingsDiff: number;
    notes: string;
  }>;
  billableRate?: number;
  totalRevenue?: number;
  grossProfit?: number;
  markupPct?: number;
  bulkTierLabel?: string;
  currency?: string;
  nativeUnitCost?: number;
  originalCurrency?: string;
  consumptionRate?: number; // e.g. 100 (%) or pace multiplier
  actualConsumedUnits?: number;
  projectedCost?: number;
  isOverrunWarning?: boolean;
  warningReason?: string;
}

export interface ProjectProfitabilityMetrics {
  revenue: number;
  materialCost: number;
  subcontractorCost: number;
  outsourcedCost: number;
  totalDirectCost: number;
  overheadAmount: number;
  contingencyAmount: number;
  totalProjectCost: number;
  grossProfit: number;
  grossMarginPct: number;
  netProfit: number;
  netMarginPct: number;
  totalPlannedBudget: number;
  budgetVariance: number;
  budgetVariancePct: number;
  healthScore: number;
  phaseMetrics: Array<{
    phaseId: string;
    phaseName: string;
    plannedBudget: number;
    actualCost: number;
    variance: number;
    variancePct: number;
    status: 'Under Budget' | 'Over Budget';
  }>;
  sensitivity: {
    materialInflation5Pct: {
      costImpact: number;
      revisedNetMarginPct: number;
    };
    labourRateHike8Pct: {
      costImpact: number;
      revisedNetMarginPct: number;
    };
  };
  costDistribution: Array<{
    category: string;
    amount: number;
    pct: number;
  }>;
}

export interface ProjectDeliverableItem {
  id: string;
  code: string;
  name: string;
  type: 'product' | 'service';
  category: string;
  subCategory?: string;
  description?: string;
  quantity: number;
  unit: string;
  costPrice: number;
  quotedPrice: number;
  totalRevenue: number;
  totalCost: number;
  marginPct: number;
  leadTimeDays?: number;
  status?: 'Planned' | 'In Assembly' | 'Completed' | 'Delivered' | string;
  currency?: string;
}

export interface PlanTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags?: string[];
  targetMarginPct: number;
  overheadPct: number;
  contingencyPct: number;
  items: ProjectCostItem[];
  themeId?: string;
  customGradient?: string;
  createdAt: string;
  updatedAt?: string;
  isBuiltIn?: boolean;
  sourcePlanName?: string;
  sourceProjectCode?: string;
  sourceClientName?: string;
}

export interface BudgetaryPlan {
  id: string;
  name: string;
  description?: string;
  isBaseline?: boolean;
  createdAt: string;
  targetMarginPct: number;
  overheadPct: number;
  contingencyPct: number;
  selectedItems: ProjectCostItem[];
  totalDirectCost?: number;
  totalProjectCost?: number;
  quotedRevenue?: number;
  grossMarginPct?: number;
  themeId?: string;
  customGradient?: string;
  templateId?: string;
  sourceProjectId?: string;
  sourceProjectCode?: string;
  totalEstimatedCost?: number;
  status?: string;
}

export interface Project {
  id: EntityId;
  code: string;
  name: string;
  clientName: string;
  targetProduct: string;
  productCategory: string;
  productSubCategory: string;
  moreSubCategory: string;
  productMoreSubCategory?: string;
  status: 'Draft' | 'Budget Approved' | 'In Execution' | 'Review' | 'Completed' | 'Proposal' | 'Contract Signed & Locked' | string;
  startDate: string;
  deliveryDeadline: string;
  quotedPrice: number;
  targetMarginPct: number;
  overheadPct: number;
  contingencyPct: number;
  phases: ProjectPhase[];
  selectedItems: ProjectCostItem[];
  alternativeOptions?: AlternativeOption[];
  deliverables?: ProjectDeliverableItem[];
  budgetaryPlans?: BudgetaryPlan[];
  activePlanId?: string;
  contractLocked?: boolean;
  analytics?: ProjectProfitabilityMetrics;
  themeId?: string;
  customGradient?: string;
  imageUrl?: string;
  currency?: string;
  notes: string;
  createdDate: string;
}

export type UserRole = 'ADMIN' | 'PROJECT_MANAGER';

export interface AppUser {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  password?: string;
  status: 'Active' | 'Inactive';
  createdAt: string;
  lastLogin?: string;
  avatarUrl?: string;
  authProvider?: 'password' | 'google';
  googleEmail?: string;
  themePreference?: 'light' | 'dark' | 'system';
}

export interface AccountRequest {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  department: string;
  requestedRole: UserRole;
  reason: string;
  submittedAt: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}

export interface CompanyDetails {
  name: string;
  registrationNumber: string;
  taxId: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  currency: string;
  logoUrl?: string;
  logoPosition: 'left' | 'right';
  tagline?: string;
}

export interface AuditLogRecord {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  module: 'Inventory' | 'Materials' | 'Users' | 'Settings' | 'Auth' | 'Projects' | 'Catalog';
  recordId?: string;
  recordName?: string;
  details: string;
  ipAddress: string;
  status: 'Success' | 'Warning' | 'Failed';
}

export interface CalendarEvent {
  id: string;
  year: number;
  month: number; // 0-indexed (9 = Oct)
  day: number;
  time: string;
  title: string;
  location: string;
  category: 'Audit' | 'Review' | 'Phase' | 'Stock' | 'Tariff' | 'Deadline' | 'Milestone' | 'Deliverable';
  badgeColor?: string;
  projectId?: string;
  projectCode?: string;
  projectName?: string;
  phaseId?: string;
  phaseName?: string;
  milestoneType?: 'project_deadline' | 'phase_start' | 'phase_end' | 'deliverable' | 'event';
  status?: string;
  budget?: number;
}

export interface ProjectMilestone {
  id: string;
  projectId: string;
  projectCode: string;
  projectName: string;
  title: string;
  date: string; // YYYY-MM-DD
  type: 'project_deadline' | 'project_start' | 'phase_start' | 'phase_end' | 'deliverable' | 'custom';
  phaseId?: string;
  phaseName?: string;
  status: 'Completed' | 'In Progress' | 'Not Started' | 'Overdue';
  budget?: number;
  description?: string;
}

