import { jsPDF } from 'jspdf';
import {
  MaterialItem,
  Supplier,
  SubcontractorRateItem,
  OutsourcedService,
  ProduceItem,
  Project,
  InventoryItem,
  CompanyDetails
} from '../types';
import { formatLKR } from './currency';

/**
 * Clean and escape values for standard RFC 4180 CSV format
 */
export function escapeCSV(val: any): string {
  if (val === undefined || val === null) return '""';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Triggers browser download of a CSV file
 */
export function triggerDownload(content: string, filename: string, mimeType = 'text/csv;charset=utf-8;') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// -------------------------------------------------------------
// 1. INDIVIDUAL CSV BUILDERS (WITH SRI LANKA RUPEES - LKR)
// -------------------------------------------------------------

export function generateMaterialsCSV(materials: MaterialItem[]): string {
  const headers = [
    'Material Code',
    'Item Name',
    'Category',
    'Sub-Category',
    'Classification',
    'Unit of Measure',
    'Retail Price (LKR)',
    'In Stock Qty',
    'Reorder Point',
    'Lead Time (Days)',
    'Supplier Name',
    'Last Updated'
  ];

  const rows = materials.map((m) => [
    m.code,
    m.name,
    m.category,
    m.subCategory,
    m.itemClassification,
    m.unit,
    m.retailPrice,
    m.inStock,
    m.reorderPoint,
    m.leadTimeDays,
    m.supplierName,
    m.lastUpdated
  ]);

  return [headers.map(escapeCSV).join(','), ...rows.map((r) => r.map(escapeCSV).join(','))].join('\n');
}

export function generateSuppliersCSV(suppliers: Supplier[]): string {
  const headers = [
    'Supplier ID / Code',
    'Supplier Name',
    'Primary Category',
    'Supply Scope',
    'Contact Person',
    'Email Address',
    'Phone',
    'City',
    'Country',
    'Payment Terms',
    'Reliability Rating (1-5)',
    'Quality Score (%)',
    'On-Time Delivery (%)',
    'Status',
    'Certifications'
  ];

  const rows = suppliers.map((s) => [
    s.id,
    s.name,
    s.category,
    s.supplyScope,
    s.contactPerson,
    s.email,
    s.phone,
    s.city,
    s.country,
    s.paymentTerms,
    s.rating,
    s.qualityScorePct,
    s.onTimeDeliveryPct,
    s.status,
    (s.certifications || []).join('; ')
  ]);

  return [headers.map(escapeCSV).join(','), ...rows.map((r) => r.map(escapeCSV).join(','))].join('\n');
}

export function generateSubcontractorsCSV(subcontractors: SubcontractorRateItem[]): string {
  const headers = [
    'Subcontractor Code',
    'Contractor Name',
    'Service / Trade Specialty',
    'Category',
    'Sub-Category',
    'Skill Level',
    'Unit of Rate',
    'Base Cost Rate (LKR)',
    'Retail Billable Rate (LKR)',
    'Rate Model',
    'Contract Estimate (LKR)',
    'Operational Location'
  ];

  const rows = subcontractors.map((s) => [
    s.code || s.id,
    s.subcontractorName,
    s.nicheServiceName || s.serviceType,
    s.serviceCategory || s.category || 'Specialist Labor',
    s.serviceSubCategory || s.subCategory || 'General',
    s.skillLevel || 'Journeyman Specialist',
    s.unit || 'hr',
    s.baseRate || s.rate || 0,
    s.retailRate || 0,
    s.rateModel || 'hourly_labour',
    s.fullContractEstimate || 0,
    (s as any).location || 'Colombo, Sri Lanka'
  ]);

  return [headers.map(escapeCSV).join(','), ...rows.map((r) => r.map(escapeCSV).join(','))].join('\n');
}

export function generateOutsourcedCSV(services: OutsourcedService[]): string {
  const headers = [
    'Service Code',
    'Surface / Finishing Process',
    'Partner Provider',
    'Category',
    'Base Unit Type',
    'Internal Rate (LKR)',
    'Retail Tariff (LKR)',
    'SLA Level Guarantee',
    'Last Updated'
  ];

  const rows = services.map((srv) => [
    srv.code || srv.id,
    srv.name,
    srv.providerName,
    srv.category,
    srv.baseUnitType,
    srv.rate,
    srv.retailPrice,
    srv.slaLevel,
    srv.lastUpdated
  ]);

  return [headers.map(escapeCSV).join(','), ...rows.map((r) => r.map(escapeCSV).join(','))].join('\n');
}

export function generateProduceCSV(produce: ProduceItem[]): string {
  const headers = [
    'Product SKU Code',
    'Product / Assembly Name',
    'Category',
    'Sub-Category',
    'Unit',
    'Internal Production Cost (LKR)',
    'Target Retail Price (LKR)',
    'Projected Margin (%)',
    'Lead Time (Days)',
    'Status',
    'Last Updated'
  ];

  const rows = produce.map((p) => {
    const margin = p.retailPrice > 0 ? ((p.retailPrice - p.costPrice) / p.retailPrice) * 100 : 0;
    return [
      p.code,
      p.name,
      p.category,
      p.subCategory,
      p.unit,
      p.costPrice,
      p.retailPrice,
      margin.toFixed(1) + '%',
      p.leadTimeDays,
      p.status,
      p.lastUpdated
    ];
  });

  return [headers.map(escapeCSV).join(','), ...rows.map((r) => r.map(escapeCSV).join(','))].join('\n');
}

export function generateProjectsCSV(projects: Project[]): string {
  const headers = [
    'Project Code',
    'Project Name',
    'Client Name',
    'Product Category',
    'Quoted Price (LKR)',
    'Actual Cost to Date (LKR)',
    'Target Margin (%)',
    'Delivery Deadline',
    'Status',
    'Phases Count'
  ];

  const rows = projects.map((prj) => [
    prj.code,
    prj.name,
    prj.clientName,
    prj.productCategory,
    prj.quotedPrice,
    prj.analytics?.totalDirectCost || (prj as any).actualCostToDate || 0,
    prj.targetMarginPct + '%',
    prj.deliveryDeadline,
    prj.status,
    prj.phases.length
  ]);

  return [headers.map(escapeCSV).join(','), ...rows.map((r) => r.map(escapeCSV).join(','))].join('\n');
}

export function generateProjectCostItemsCSV(project: Project): string {
  const headers = [
    'Project Code',
    'Project Name',
    'Client Name',
    'Phase Name',
    'Item Type',
    'Item SKU / ID',
    'Item Name',
    'Category',
    'Supplier / Subcontractor',
    'Quantity',
    'Unit of Measure',
    'Unit Cost (LKR)',
    'Discount (%)',
    'Total Line Cost (LKR)'
  ];

  const phaseMap = new Map<string, string>();
  (project.phases || []).forEach((p) => {
    phaseMap.set(p.id, p.name);
  });

  const costItems = project.selectedItems || [];
  if (costItems.length === 0) {
    // If no individual cost items, export the phases breakdown
    const phaseHeaders = [
      'Project Code',
      'Project Name',
      'Client Name',
      'Phase Name',
      'Description',
      'Status',
      'Start Date',
      'End Date',
      'Phase Budget (LKR)',
      'Actual Cost (LKR)'
    ];
    const phaseRows = (project.phases || []).map((ph) => [
      project.code,
      project.name,
      project.clientName,
      ph.name,
      ph.description || 'N/A',
      ph.status,
      ph.startDate,
      ph.endDate,
      ph.budget,
      ph.actualCost
    ]);
    return [phaseHeaders.map(escapeCSV).join(','), ...phaseRows.map((r) => r.map(escapeCSV).join(','))].join('\n');
  }

  const rows = costItems.map((item) => {
    const phaseName = phaseMap.get(item.phaseId) || item.phaseId || 'General Execution';
    return [
      project.code,
      project.name,
      project.clientName,
      phaseName,
      item.type,
      item.itemId || item.id,
      item.name,
      item.category || '',
      item.supplierOrProvider || '',
      item.quantity,
      item.unit || 'pcs',
      item.unitCost,
      item.discountPct ? `${item.discountPct}%` : '0%',
      item.totalCost
    ];
  });

  return [headers.map(escapeCSV).join(','), ...rows.map((r) => r.map(escapeCSV).join(','))].join('\n');
}

export function generateInventoryCSV(inventory: InventoryItem[]): string {
  const headers = [
    'Inventory ID',
    'Item Code',
    'Item Name',
    'Batch Number',
    'Warehouse Location',
    'Quantity On Hand',
    'Reserved Qty',
    'Unit of Measure',
    'Unit Valuation Cost (LKR)',
    'Total Valuation (LKR)',
    'Quality Status',
    'Last Count Date'
  ];

  const rows = inventory.map((inv) => {
    const qty = inv.currentStock ?? inv.onHand ?? 0;
    const reserved = inv.allocatedStock ?? inv.reserved ?? 0;
    const valuation = inv.totalValuation ?? (qty * inv.unitCost);
    return [
      inv.id,
      inv.sku || (inv as any).itemCode || inv.id,
      inv.name || inv.itemName || 'Inventory Item',
      (inv as any).batchNumber || 'BATCH-STD',
      inv.location || 'Central Stores - Colombo',
      qty,
      reserved,
      inv.unit || 'units',
      inv.unitCost,
      valuation,
      inv.status || (inv as any).qualityStatus || 'Good',
      inv.lastAuditDate || inv.lastMovementDate || (inv as any).lastCountDate || 'N/A'
    ];
  });

  return [headers.map(escapeCSV).join(','), ...rows.map((r) => r.map(escapeCSV).join(','))].join('\n');
}

// -------------------------------------------------------------
// 2. MASTER ENTERPRISE SUMMARY PDF GENERATOR (WITH LKR)
// -------------------------------------------------------------

export interface EnterpriseExportData {
  materials: MaterialItem[];
  suppliers: Supplier[];
  subcontractors: SubcontractorRateItem[];
  outsourcedServices: OutsourcedService[];
  produceItems: ProduceItem[];
  projects: Project[];
  inventory: InventoryItem[];
  companyDetails?: CompanyDetails;
  selectedProject?: Project | null;
}

export interface ExportSelectionOptions {
  exportFormat: 'pdf' | 'csv' | 'both';
  includeMaterials: boolean;
  includeSuppliers: boolean;
  includeSubcontractors: boolean;
  includeOutsourced: boolean;
  includeProduce: boolean;
  includeProjects: boolean;
  includeInventory: boolean;
  includeProjectCostBreakdown?: boolean;
}

export function generateEnterpriseMasterPDF(
  data: EnterpriseExportData,
  selection?: Partial<ExportSelectionOptions>
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const company = data.companyDetails || {
    name: 'FXTT Enterprise Solutions Ltd',
    tagline: 'Precision Cost, Tariff & Project Profitability Management (LKR)',
    address: '100 Galle Road, World Trade Center Tower, Colombo 01, Sri Lanka',
    currency: 'LKR (Rs.)'
  };

  const timestamp = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  let y = 14;

  // Header Banner
  doc.setFillColor(15, 23, 42); // Deep Slate
  doc.rect(0, 0, pageWidth, 32, 'F');

  // Gold accent bar
  doc.setFillColor(217, 119, 6); // Amber Gold
  doc.rect(0, 32, pageWidth, 2.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text(company.name.toUpperCase(), 14, 13);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text('ENTERPRISE DATA AUDIT & RESOURCE MASTER SPECIFICATION', 14, 19);
  doc.text(`Generated: ${timestamp} | Currency: Sri Lankan Rupee (LKR / Rs.)`, 14, 25);

  y = 42;

  // Executive Summary Cards
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, y, pageWidth - 28, 24, 2, 2, 'FD');

  const totalInventoryValuation = data.inventory.reduce(
    (acc, i) => acc + (i.totalValuation ?? ((i.currentStock ?? i.onHand ?? 0) * i.unitCost)),
    0
  );
  const totalProjectQuotedVal = data.projects.reduce((acc, p) => acc + p.quotedPrice, 0);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('PORTFOLIO KPI SUMMARY (SRI LANKA RUPEES - LKR)', 20, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);

  const colWidth = (pageWidth - 40) / 4;
  doc.text(`Raw Materials: ${data.materials.length} SKUs`, 20, y + 13);
  doc.text(`Approved Suppliers: ${data.suppliers.length} Vendors`, 20, y + 19);

  doc.text(`Subcontractor Roster: ${data.subcontractors.length} Crews`, 20 + colWidth, y + 13);
  doc.text(`Finishing Tariffs: ${data.outsourcedServices.length} Procs`, 20 + colWidth, y + 19);

  doc.text(`Product Catalog: ${data.produceItems.length} Assemblies`, 20 + colWidth * 2, y + 13);
  doc.text(`Active Projects: ${data.projects.length} Contracts`, 20 + colWidth * 2, y + 19);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`Stock Valuation: ${formatLKR(totalInventoryValuation, { compact: true })}`, 20 + colWidth * 3, y + 13);
  doc.text(`Quoted Portfolio: ${formatLKR(totalProjectQuotedVal, { compact: true })}`, 20 + colWidth * 3, y + 19);

  y += 32;

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 15) {
      doc.addPage();
      y = 15;
      // Mini header for subsequent pages
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageWidth, 12, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(`${company.name} • Master Enterprise Dossier (LKR)`, 14, 8);
      doc.setTextColor(15, 23, 42);
      y = 18;
    }
  };

  // Section 1: Materials Catalog Table
  if (selection?.includeMaterials !== false && data.materials.length > 0) {
    checkPageBreak(30);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`1. MATERIALS & RAW STOCK (${data.materials.length} Items)`, 14, y);
    y += 5;

    // Table Header
    doc.setFillColor(241, 245, 249);
    doc.rect(14, y, pageWidth - 28, 6, 'F');
    doc.setFontSize(7);
    doc.setTextColor(51, 65, 85);
    doc.text('SKU CODE', 16, y + 4);
    doc.text('MATERIAL NAME', 42, y + 4);
    doc.text('CATEGORY', 95, y + 4);
    doc.text('UNIT', 135, y + 4);
    doc.text('PRICE (LKR)', 150, y + 4);
    doc.text('STOCK', 178, y + 4);
    y += 7;

    doc.setFont('helvetica', 'normal');
    data.materials.slice(0, 25).forEach((m) => {
      checkPageBreak(6);
      doc.text(m.code.substring(0, 14), 16, y);
      doc.text(m.name.substring(0, 32), 42, y);
      doc.text(m.category.substring(0, 24), 95, y);
      doc.text(m.unit, 135, y);
      doc.text(formatLKR(m.retailPrice), 150, y);
      doc.text(String(m.inStock), 178, y);
      y += 5;
    });

    if (data.materials.length > 25) {
      doc.setFont('helvetica', 'italic');
      doc.text(`... and ${data.materials.length - 25} additional items (exported to full CSV spreadsheet)`, 16, y);
      y += 6;
    }
    y += 4;
  }

  // Section 2: Approved Suppliers Table
  if (selection?.includeSuppliers !== false && data.suppliers.length > 0) {
    checkPageBreak(30);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`2. APPROVED ENTERPRISE SUPPLIERS (${data.suppliers.length} Vendors)`, 14, y);
    y += 5;

    doc.setFillColor(241, 245, 249);
    doc.rect(14, y, pageWidth - 28, 6, 'F');
    doc.setFontSize(7);
    doc.setTextColor(51, 65, 85);
    doc.text('VENDOR NAME', 16, y + 4);
    doc.text('SCOPE', 65, y + 4);
    doc.text('CITY / LOCATION', 105, y + 4);
    doc.text('PAYMENT TERMS', 140, y + 4);
    doc.text('RATING', 175, y + 4);
    y += 7;

    doc.setFont('helvetica', 'normal');
    data.suppliers.slice(0, 20).forEach((s) => {
      checkPageBreak(6);
      doc.text(s.name.substring(0, 30), 16, y);
      doc.text(s.supplyScope.toUpperCase(), 65, y);
      doc.text(`${s.city}, ${s.country}`.substring(0, 22), 105, y);
      doc.text(s.paymentTerms, 140, y);
      doc.text(`${s.rating} ★ (${s.qualityScorePct}%)`, 175, y);
      y += 5;
    });
    y += 4;
  }

  // Section 3: Subcontractors & Labor Specialist Roster
  if (selection?.includeSubcontractors !== false && data.subcontractors.length > 0) {
    checkPageBreak(30);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`3. SPECIALIST LABOR & SUBCONTRACTOR ROSTER (${data.subcontractors.length} Specialists)`, 14, y);
    y += 5;

    doc.setFillColor(241, 245, 249);
    doc.rect(14, y, pageWidth - 28, 6, 'F');
    doc.setFontSize(7);
    doc.setTextColor(51, 65, 85);
    doc.text('CODE', 16, y + 4);
    doc.text('CONTRACTOR / SPECIALIST', 36, y + 4);
    doc.text('TRADE / SERVICE', 85, y + 4);
    doc.text('BASE RATE (LKR)', 135, y + 4);
    doc.text('RETAIL BILLABLE (LKR)', 165, y + 4);
    y += 7;

    doc.setFont('helvetica', 'normal');
    data.subcontractors.slice(0, 20).forEach((sub) => {
      checkPageBreak(6);
      doc.text((sub.code || sub.id).substring(0, 10), 16, y);
      doc.text(sub.subcontractorName.substring(0, 28), 36, y);
      doc.text((sub.nicheServiceName || sub.serviceType).substring(0, 28), 85, y);
      doc.text(`${formatLKR(sub.baseRate || sub.rate || 0)} / ${sub.unit || 'hr'}`, 135, y);
      doc.text(`${formatLKR(sub.retailRate || 0)} / ${sub.unit || 'hr'}`, 165, y);
      y += 5;
    });
    y += 4;
  }

  // Section 4: Outsourced Finishing Tariffs
  if (selection?.includeOutsourced !== false && data.outsourcedServices.length > 0) {
    checkPageBreak(30);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`4. OUTSOURCED FINISHING & TREATMENT TARIFFS (${data.outsourcedServices.length} Processes)`, 14, y);
    y += 5;

    doc.setFillColor(241, 245, 249);
    doc.rect(14, y, pageWidth - 28, 6, 'F');
    doc.setFontSize(7);
    doc.setTextColor(51, 65, 85);
    doc.text('PROCESS / TREATMENT', 16, y + 4);
    doc.text('SERVICE PARTNER', 75, y + 4);
    doc.text('UNIT TYPE', 120, y + 4);
    doc.text('TARIFF RATE (LKR)', 155, y + 4);
    y += 7;

    doc.setFont('helvetica', 'normal');
    data.outsourcedServices.slice(0, 15).forEach((srv) => {
      checkPageBreak(6);
      doc.text(srv.name.substring(0, 32), 16, y);
      doc.text(srv.providerName.substring(0, 24), 75, y);
      doc.text(srv.baseUnitType, 120, y);
      doc.text(formatLKR(srv.retailPrice || srv.rate), 155, y);
      y += 5;
    });
    y += 4;
  }

  // Section 5: Projects Portfolio Table
  if (selection?.includeProjects !== false && data.projects.length > 0) {
    checkPageBreak(30);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);

    if (data.selectedProject) {
      doc.text(`5. TARGET PROJECT AUDIT & QUOTATION: [${data.selectedProject.code}]`, 14, y);
      y += 5;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(
        `Project: ${data.selectedProject.name} | Client: ${data.selectedProject.clientName} | Quoted Value: ${formatLKR(data.selectedProject.quotedPrice)} | Margin: ${data.selectedProject.targetMarginPct}%`,
        14,
        y
      );
      y += 5;

      // Render phases for selected project
      if (data.selectedProject.phases && data.selectedProject.phases.length > 0) {
        doc.setFillColor(241, 245, 249);
        doc.rect(14, y, pageWidth - 28, 6, 'F');
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(51, 65, 85);
        doc.text('PHASE NAME', 16, y + 4);
        doc.text('STATUS', 75, y + 4);
        doc.text('BUDGET (LKR)', 110, y + 4);
        doc.text('ACTUAL (LKR)', 145, y + 4);
        doc.text('TIMELINE', 175, y + 4);
        y += 7;

        doc.setFont('helvetica', 'normal');
        data.selectedProject.phases.forEach((ph) => {
          checkPageBreak(6);
          doc.text(ph.name.substring(0, 30), 16, y);
          doc.text(ph.status, 75, y);
          doc.text(formatLKR(ph.budget), 110, y);
          doc.text(formatLKR(ph.actualCost), 145, y);
          doc.text(ph.endDate || 'Ongoing', 175, y);
          y += 5;
        });
        y += 3;
      }

      // Render itemized cost items if present
      const costItems = data.selectedProject.selectedItems || [];
      if (costItems.length > 0) {
        checkPageBreak(25);
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(`Allocated Cost Items & BOM Specifications (${costItems.length} items)`, 14, y);
        y += 4;

        doc.setFillColor(241, 245, 249);
        doc.rect(14, y, pageWidth - 28, 6, 'F');
        doc.setFontSize(6.5);
        doc.setTextColor(51, 65, 85);
        doc.text('ITEM DESCRIPTION', 16, y + 4);
        doc.text('TYPE', 80, y + 4);
        doc.text('SUPPLIER/SOURCE', 105, y + 4);
        doc.text('QTY', 145, y + 4);
        doc.text('UNIT COST', 158, y + 4);
        doc.text('TOTAL (LKR)', 180, y + 4);
        y += 7;

        doc.setFont('helvetica', 'normal');
        costItems.slice(0, 18).forEach((item) => {
          checkPageBreak(5);
          doc.text(item.name.substring(0, 35), 16, y);
          doc.text(item.type.toUpperCase(), 80, y);
          doc.text((item.supplierOrProvider || 'Standard').substring(0, 20), 105, y);
          doc.text(`${item.quantity} ${item.unit || ''}`, 145, y);
          doc.text(formatLKR(item.unitCost), 158, y);
          doc.text(formatLKR(item.totalCost), 180, y);
          y += 5;
        });
        if (costItems.length > 18) {
          doc.setFont('helvetica', 'italic');
          doc.text(`... and ${costItems.length - 18} more items in full project CSV export.`, 16, y);
          y += 5;
        }
        y += 3;
      }
    } else {
      doc.text(`5. CAPITAL PROJECTS PORTFOLIO (${data.projects.length} Contracts)`, 14, y);
      y += 5;

      doc.setFillColor(241, 245, 249);
      doc.rect(14, y, pageWidth - 28, 6, 'F');
      doc.setFontSize(7);
      doc.setTextColor(51, 65, 85);
      doc.text('CODE', 16, y + 4);
      doc.text('PROJECT NAME', 35, y + 4);
      doc.text('CLIENT', 85, y + 4);
      doc.text('CONTRACT VALUE (LKR)', 130, y + 4);
      doc.text('STATUS', 175, y + 4);
      y += 7;

      doc.setFont('helvetica', 'normal');
      data.projects.forEach((prj) => {
        checkPageBreak(6);
        doc.text(prj.code.substring(0, 10), 16, y);
        doc.text(prj.name.substring(0, 28), 35, y);
        doc.text(prj.clientName.substring(0, 22), 85, y);
        doc.text(formatLKR(prj.quotedPrice), 130, y);
        doc.text(prj.status, 175, y);
        y += 5;
      });
    }
    y += 4;
  }

  // Footer on all pages
  const pageCount = doc.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Page ${i} of ${pageCount} • ${company.name} • Official Enterprise Ledger (LKR)`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
  }

  return doc;
}

// -------------------------------------------------------------
// 3. COMPLETE 1-CLICK ENTERPRISE ARCHIVE DOWNLOADER
// -------------------------------------------------------------

export function downloadCompleteEnterpriseArchive(data: EnterpriseExportData): {
  success: boolean;
  exportedCounts: Record<string, number>;
} {
  const dateStr = new Date().toISOString().split('T')[0];

  // 1. Download Master JSON Backup
  const fullBackupPayload = {
    enterprise: data.companyDetails?.name || 'FXTT Enterprise Solutions',
    exportDate: new Date().toISOString(),
    currency: 'LKR',
    dataset: {
      materials: data.materials,
      suppliers: data.suppliers,
      subcontractors: data.subcontractors,
      outsourcedServices: data.outsourcedServices,
      produceItems: data.produceItems,
      projects: data.projects,
      inventory: data.inventory
    }
  };
  triggerDownload(
    JSON.stringify(fullBackupPayload, null, 2),
    `FXTT-Full-System-Data-Backup-${dateStr}.json`,
    'application/json;charset=utf-8;'
  );

  // 2. Download Individual CSV files
  triggerDownload(generateMaterialsCSV(data.materials), `FXTT-Materials-Catalog-${dateStr}.csv`);
  triggerDownload(generateSuppliersCSV(data.suppliers), `FXTT-Suppliers-Directory-${dateStr}.csv`);
  triggerDownload(generateSubcontractorsCSV(data.subcontractors), `FXTT-Subcontractors-Labor-${dateStr}.csv`);
  triggerDownload(generateOutsourcedCSV(data.outsourcedServices), `FXTT-Outsourced-Finishing-${dateStr}.csv`);
  triggerDownload(generateProduceCSV(data.produceItems), `FXTT-Produce-Assemblies-${dateStr}.csv`);
  triggerDownload(generateProjectsCSV(data.projects), `FXTT-Projects-Portfolio-${dateStr}.csv`);
  triggerDownload(generateInventoryCSV(data.inventory), `FXTT-Inventory-Valuations-${dateStr}.csv`);

  // 3. Generate and trigger download of the Master PDF
  const pdfDoc = generateEnterpriseMasterPDF(data);
  pdfDoc.save(`FXTT-Master-Executive-Dossier-LKR-${dateStr}.pdf`);

  return {
    success: true,
    exportedCounts: {
      materials: data.materials.length,
      suppliers: data.suppliers.length,
      subcontractors: data.subcontractors.length,
      outsourcedServices: data.outsourcedServices.length,
      produceItems: data.produceItems.length,
      projects: data.projects.length,
      inventory: data.inventory.length
    }
  };
}
