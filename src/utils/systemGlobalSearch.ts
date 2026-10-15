import {
  MaterialItem,
  ProduceItem,
  SubcontractorRateItem,
  OutsourcedService,
  Supplier,
  Project,
  InventoryItem
} from '../types';
import { ActiveTab } from '../components/TopNavbar';
import { parseSmartSearch, evaluateSmartSearch, SearchableField } from './smartSearch';

export type SearchItemType =
  | 'material'
  | 'produce'
  | 'subcontractor'
  | 'outsourced'
  | 'supplier'
  | 'project'
  | 'inventory';

export interface GlobalSearchResult {
  id: string;
  type: SearchItemType;
  typeLabel: string;
  code: string;
  title: string;
  subtitle: string;
  details: string;
  badgeText: string;
  badgeBg: string;
  badgeTextCol: string;
  priceOrRate?: string;
  status?: string;
  targetTab: ActiveTab;
  raw: any;
  score: number;
}

export interface SearchAllParams {
  materials: MaterialItem[];
  produceItems: ProduceItem[];
  subcontractors: SubcontractorRateItem[];
  outsourcedServices: OutsourcedService[];
  suppliers: Supplier[];
  projects: Project[];
  inventory: InventoryItem[];
  query: string;
  maxResults?: number;
}

/**
 * Searches across all database entities in the system.
 * Returns results ranked by relevance score.
 */
export function searchAllSystemRecords({
  materials = [],
  produceItems = [],
  subcontractors = [],
  outsourcedServices = [],
  suppliers = [],
  projects = [],
  inventory = [],
  query,
  maxResults = 40
}: SearchAllParams): {
  results: GlobalSearchResult[];
  countsByType: Record<SearchItemType, number>;
  totalMatches: number;
} {
  const cleanQ = (query || '').trim();
  if (!cleanQ) {
    return {
      results: [],
      countsByType: {
        material: 0,
        produce: 0,
        subcontractor: 0,
        outsourced: 0,
        supplier: 0,
        project: 0,
        inventory: 0
      },
      totalMatches: 0
    };
  }

  const parsed = parseSmartSearch(cleanQ);
  const matched: GlobalSearchResult[] = [];

  // 1. Search Materials
  for (const m of materials) {
    const fields: SearchableField[] = [
      { name: 'code', value: m.code, weight: 3 },
      { name: 'name', value: m.name, weight: 2.5 },
      { name: 'category', value: m.category, weight: 2 },
      { name: 'subCategory', value: m.subCategory, weight: 1.5 },
      { name: 'supplier', value: m.supplierName, weight: 1.5 },
      { name: 'barcode', value: (m as any).barcode, weight: 3 },
      { name: 'unit', value: m.unit, weight: 1 },
      { name: 'price', value: m.retailPrice, isNumeric: true },
      { name: 'stock', value: m.inStock, isNumeric: true }
    ];
    const evalRes = evaluateSmartSearch(parsed, fields);
    if (evalRes.matches) {
      matched.push({
        id: m.id,
        type: 'material',
        typeLabel: 'Material',
        code: m.code,
        title: m.name,
        subtitle: `${m.category || 'General'} • ${m.supplierName || 'Vanguard'}`,
        details: `Unit: ${m.unit || 'pcs'} | Stock: ${m.inStock ?? 0} in stock`,
        badgeText: 'MAT',
        badgeBg: 'bg-cyan-50 dark:bg-cyan-950/60 border-cyan-200 dark:border-cyan-800',
        badgeTextCol: 'text-cyan-800 dark:text-cyan-300',
        priceOrRate: `$${(m.retailPrice ?? 0).toFixed(2)} / ${m.unit || 'unit'}`,
        status: (m.inStock ?? 0) <= (m.reorderPoint ?? 5) ? 'Low Stock' : 'In Stock',
        targetTab: 'materials',
        raw: m,
        score: evalRes.score + 5 // bias core catalog
      });
    }
  }

  // 2. Search Produce Items (Products & Assemblies)
  for (const p of produceItems) {
    const fields: SearchableField[] = [
      { name: 'code', value: p.code, weight: 3 },
      { name: 'name', value: p.name, weight: 2.5 },
      { name: 'category', value: p.category, weight: 2 },
      { name: 'subCategory', value: p.subCategory, weight: 1.5 },
      { name: 'type', value: p.type, weight: 1.5 },
      { name: 'barcode', value: (p as any).barcode, weight: 3 },
      { name: 'price', value: p.retailPrice, isNumeric: true },
      { name: 'cost', value: p.costPrice, isNumeric: true }
    ];
    const evalRes = evaluateSmartSearch(parsed, fields);
    if (evalRes.matches) {
      matched.push({
        id: p.id,
        type: 'produce',
        typeLabel: 'Product / Assembly',
        code: p.code,
        title: p.name,
        subtitle: `${p.category || 'Assembly'} • Type: ${p.type === 'service' ? 'Service Package' : 'Finished Good'}`,
        details: `Lead Time: ${p.leadTimeDays ?? 14} days | Quoted: $${(p.retailPrice ?? 0).toFixed(2)}`,
        badgeText: 'PROD',
        badgeBg: 'bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800',
        badgeTextCol: 'text-purple-800 dark:text-purple-300',
        priceOrRate: `$${(p.retailPrice ?? 0).toFixed(2)}`,
        status: p.status || 'Active',
        targetTab: 'produce',
        raw: p,
        score: evalRes.score + 5
      });
    }
  }

  // 3. Search Subcontractors & Labor Roster
  for (const s of subcontractors) {
    const fields: SearchableField[] = [
      { name: 'code', value: s.code, weight: 3 },
      { name: 'name', value: s.name, weight: 2.5 },
      { name: 'subcontractor', value: s.subcontractorName, weight: 2 },
      { name: 'category', value: s.category, weight: 2 },
      { name: 'subCategory', value: s.subCategory, weight: 1.5 },
      { name: 'serviceType', value: s.serviceType, weight: 2 },
      { name: 'skillLevel', value: s.skillLevel, weight: 1.5 },
      { name: 'rate', value: s.rate || s.baseRate, isNumeric: true }
    ];
    const evalRes = evaluateSmartSearch(parsed, fields);
    if (evalRes.matches) {
      matched.push({
        id: s.id,
        type: 'subcontractor',
        typeLabel: 'Subcontractor Rate',
        code: s.code,
        title: s.name,
        subtitle: `${s.subcontractorName || 'Contractor'} • ${s.serviceType || 'Machining'}`,
        details: `Skill: ${s.skillLevel || 'Certified'} | Base: $${((s.rate || s.baseRate) ?? 0).toFixed(2)}`,
        badgeText: 'SUB',
        badgeBg: 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800',
        badgeTextCol: 'text-amber-800 dark:text-amber-300',
        priceOrRate: `$${((s.rate || s.baseRate) ?? 0).toFixed(2)} / ${s.unit === 'per_hour' ? 'hr' : s.unit || 'unit'}`,
        status: 'Active Rate',
        targetTab: 'subcontractors',
        raw: s,
        score: evalRes.score
      });
    }
  }

  // 4. Search Outsourced Services & Tariffs
  for (const o of outsourcedServices) {
    const fields: SearchableField[] = [
      { name: 'id', value: o.id, weight: 2 },
      { name: 'name', value: o.name, weight: 2.5 },
      { name: 'provider', value: o.providerName, weight: 2 },
      { name: 'category', value: o.category, weight: 2 },
      { name: 'subCategory', value: o.subCategory, weight: 1.5 },
      { name: 'sla', value: o.slaLevel, weight: 1.5 },
      { name: 'rate', value: o.rate, isNumeric: true }
    ];
    const evalRes = evaluateSmartSearch(parsed, fields);
    if (evalRes.matches) {
      matched.push({
        id: o.id,
        type: 'outsourced',
        typeLabel: 'Outsourced Tariff',
        code: o.id,
        title: o.name,
        subtitle: `${o.providerName || 'Provider'} • ${o.category || 'Finishing'}`,
        details: `SLA: ${o.slaLevel || 'Standard'} | Unit: ${o.baseUnitType || 'run'}`,
        badgeText: 'TARIFF',
        badgeBg: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800',
        badgeTextCol: 'text-emerald-800 dark:text-emerald-300',
        priceOrRate: `$${(o.rate ?? 0).toFixed(2)} / ${o.baseUnitType || 'run'}`,
        status: o.slaLevel || 'Active',
        targetTab: 'outsourced',
        raw: o,
        score: evalRes.score
      });
    }
  }

  // 5. Search Suppliers
  for (const sup of suppliers) {
    const fields: SearchableField[] = [
      { name: 'id', value: sup.id, weight: 2 },
      { name: 'name', value: sup.name, weight: 3 },
      { name: 'contact', value: sup.contactPerson, weight: 2 },
      { name: 'email', value: sup.email, weight: 2 },
      { name: 'phone', value: sup.phone, weight: 2 },
      { name: 'category', value: sup.category, weight: 1.5 },
      { name: 'scope', value: sup.supplyScope, weight: 2 },
      { name: 'city', value: sup.city, weight: 1.5 },
      { name: 'country', value: sup.country, weight: 1.5 },
      { name: 'status', value: sup.status, weight: 1 }
    ];
    const evalRes = evaluateSmartSearch(parsed, fields);
    if (evalRes.matches) {
      matched.push({
        id: sup.id,
        type: 'supplier',
        typeLabel: 'Supplier / Vendor',
        code: sup.id,
        title: sup.name,
        subtitle: `${sup.city || 'HQ'}, ${sup.country || 'USA'} • Scope: ${sup.supplyScope || 'Materials'}`,
        details: `Contact: ${sup.contactPerson || 'Sales'} • Rating: ${sup.rating ?? 4.5}★`,
        badgeText: 'SUP',
        badgeBg: 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800',
        badgeTextCol: 'text-indigo-800 dark:text-indigo-300',
        priceOrRate: sup.paymentTerms || 'Net 30',
        status: sup.status || 'Active',
        targetTab: 'suppliers',
        raw: sup,
        score: evalRes.score + 2
      });
    }
  }

  // 6. Search Projects & Contracts
  for (const pr of projects) {
    const fields: SearchableField[] = [
      { name: 'code', value: pr.code, weight: 3 },
      { name: 'id', value: pr.id, weight: 2 },
      { name: 'name', value: pr.name, weight: 3 },
      { name: 'client', value: pr.clientName, weight: 2.5 },
      { name: 'category', value: pr.productCategory, weight: 2 },
      { name: 'subCategory', value: pr.productSubCategory, weight: 1.5 },
      { name: 'targetProduct', value: pr.targetProduct, weight: 2 },
      { name: 'status', value: pr.status, weight: 1.5 },
      { name: 'price', value: pr.quotedPrice, isNumeric: true }
    ];
    const evalRes = evaluateSmartSearch(parsed, fields);
    if (evalRes.matches) {
      matched.push({
        id: pr.id,
        type: 'project',
        typeLabel: 'Project',
        code: pr.code,
        title: pr.name,
        subtitle: `Client: ${pr.clientName || 'Confidential'} • Category: ${pr.productCategory || 'Engineering'}`,
        details: `Quoted: $${(pr.quotedPrice ?? 0).toLocaleString()} • Margin: ${pr.targetMarginPct ?? 25}%`,
        badgeText: 'PRJ',
        badgeBg: 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800',
        badgeTextCol: 'text-rose-800 dark:text-rose-300',
        priceOrRate: `$${(pr.quotedPrice ?? 0).toLocaleString()}`,
        status: pr.status || 'Active',
        targetTab: 'cost-analysis',
        raw: pr,
        score: evalRes.score + 10 // bias projects on name match
      });
    }
  }

  // 7. Search Inventory Items
  for (const inv of inventory) {
    const fields: SearchableField[] = [
      { name: 'sku', value: inv.sku, weight: 3 },
      { name: 'code', value: inv.sku, weight: 3 },
      { name: 'name', value: inv.itemName || inv.name, weight: 2.5 },
      { name: 'category', value: inv.category, weight: 2 },
      { name: 'location', value: inv.location, weight: 2 },
      { name: 'supplier', value: inv.supplierName, weight: 1.5 },
      { name: 'barcode', value: (inv as any).barcode, weight: 3 },
      { name: 'cost', value: inv.unitCost, isNumeric: true },
      { name: 'stock', value: inv.onHand, isNumeric: true }
    ];
    const evalRes = evaluateSmartSearch(parsed, fields);
    if (evalRes.matches) {
      matched.push({
        id: inv.id,
        type: 'inventory',
        typeLabel: 'Inventory SKU',
        code: inv.sku,
        title: inv.itemName || inv.name,
        subtitle: `Location: ${inv.location || 'Warehouse Bay'} • ${inv.category || 'General'}`,
        details: `On Hand: ${inv.onHand ?? 0} ${inv.unit || 'pcs'} | Avail: ${inv.available ?? inv.onHand ?? 0}`,
        badgeText: 'INV',
        badgeBg: 'bg-teal-50 dark:bg-teal-950/60 border-teal-200 dark:border-teal-800',
        badgeTextCol: 'text-teal-800 dark:text-teal-300',
        priceOrRate: `$${(inv.unitCost ?? 0).toFixed(2)} / ${inv.unit || 'unit'}`,
        status: inv.status || 'Optimal',
        targetTab: 'inventory',
        raw: inv,
        score: evalRes.score
      });
    }
  }

  // Calculate counts by type
  const countsByType: Record<SearchItemType, number> = {
    material: 0,
    produce: 0,
    subcontractor: 0,
    outsourced: 0,
    supplier: 0,
    project: 0,
    inventory: 0
  };

  for (const item of matched) {
    countsByType[item.type] = (countsByType[item.type] || 0) + 1;
  }

  // Sort by highest score first
  matched.sort((a, b) => b.score - a.score);

  return {
    results: matched.slice(0, maxResults),
    countsByType,
    totalMatches: matched.length
  };
}
