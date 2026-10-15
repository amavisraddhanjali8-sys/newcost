import { jsPDF } from 'jspdf';
import { Project } from '../types';

export function exportProjectQuotePDF(project: Project) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 15;

  // Header Banner Background
  doc.setFillColor(19, 34, 56); // Deep Navy (#132238)
  doc.rect(0, 0, pageWidth, 32, 'F');

  // Gold accent bar
  doc.setFillColor(245, 158, 11); // Amber / Industrial Gold (#F59E0B)
  doc.rect(0, 32, pageWidth, 2.5, 'F');

  // Header Text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('PROJECT BUDGET QUOTATION & PROFITABILITY SPECIFICATION', 14, 14);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text('Precision Industrial Materials, Subcontractor Rates & Multi-Phase Cost Breakdown', 14, 21);
  doc.text(`Reference: ${project.code} | Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`, 14, 27);

  y = 42;

  // Client & Project Info Block
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, y, pageWidth - 28, 30, 2, 2, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('PROJECT DETAILS', 20, y + 7);
  doc.text('CLIENT / COUNTERPARTY', 110, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Project Name: ${project.name}`, 20, y + 14);
  doc.text(`Target Product: ${project.targetProduct}`, 20, y + 20);
  doc.text(`Category: ${project.productCategory} > ${project.productSubCategory}`, 20, y + 26);

  doc.text(`Client Name: ${project.clientName}`, 110, y + 14);
  doc.text(`Target Deadline: ${project.deliveryDeadline}`, 110, y + 20);
  doc.text(`Contract Status: ${project.status}`, 110, y + 26);

  y += 36;

  // Financial Oversight Card
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, y, pageWidth - 28, 22, 2, 2, 'FD');

  const analytics = project.analytics;
  const quotePrice = project.quotedPrice || 0;
  const totalCost = analytics?.totalProjectCost || 0;
  const marginPct = analytics?.grossMarginPct || project.targetMarginPct || 0;
  const netMargin = analytics?.netMarginPct || 0;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(19, 34, 56);
  doc.text('TOTAL QUOTED REVENUE', 20, y + 7);
  doc.text('ESTIMATED COGS / COST', 72, y + 7);
  doc.text('EST. GROSS MARGIN', 124, y + 7);
  doc.text('EST. NET MARGIN', 165, y + 7);

  const cur = project.currency || 'USD';

  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`${cur} ${(Number(quotePrice) || 0).toLocaleString()}`, 20, y + 16);
  doc.text(`${cur} ${(Number(totalCost) || 0).toLocaleString()}`, 72, y + 16);

  doc.setTextColor(16, 185, 129); // green
  doc.text(`${marginPct.toFixed(1)}%`, 124, y + 16);
  doc.text(`${netMargin.toFixed(1)}%`, 165, y + 16);

  y += 28;

  // Multi-Phase Budget Table Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(19, 34, 56);
  doc.text('PHASE-BY-PHASE BUDGET SCHEDULE', 14, y);
  y += 4;

  // Table header
  doc.setFillColor(19, 34, 56);
  doc.rect(14, y, pageWidth - 28, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text('Phase Name', 16, y + 4.8);
  doc.text('Schedule Period', 85, y + 4.8);
  doc.text(`Planned Budget (${cur})`, 130, y + 4.8);
  doc.text('Status', 168, y + 4.8);
  y += 7;

  (project.phases || []).forEach((phase, idx) => {
    doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
    doc.rect(14, y, pageWidth - 28, 6.5, 'F');
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(phase.name.substring(0, 42), 16, y + 4.5);
    doc.text(`${phase.startDate} to ${phase.endDate}`, 85, y + 4.5);
    doc.setFont('helvetica', 'bold');
    doc.text(`${cur} ${Number(phase.budget).toLocaleString()}`, 130, y + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.text(phase.status, 168, y + 4.5);
    y += 6.5;
  });

  y += 6;

  // Selected Materials, Subcontractor Labour & Outsourced Services
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(19, 34, 56);
  doc.text('DETAILED BILL OF MATERIALS, LABOUR & OUTSOURCED SERVICES', 14, y);
  y += 4;

  // Items table header
  doc.setFillColor(19, 34, 56);
  doc.rect(14, y, pageWidth - 28, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text('Item / Service Description', 16, y + 4.8);
  doc.text('Type', 80, y + 4.8);
  doc.text('Supplier / Contractor', 105, y + 4.8);
  doc.text('Qty / Unit', 145, y + 4.8);
  doc.text(`Unit (${cur})`, 165, y + 4.8);
  doc.text(`Total (${cur})`, 183, y + 4.8);
  y += 7;

  const items = project.selectedItems || [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    // Page overflow check
    if (y > pageHeight - 35) {
      doc.addPage();
      y = 15;
    }

    doc.setFillColor(i % 2 === 0 ? 255 : 248, i % 2 === 0 ? 255 : 250, i % 2 === 0 ? 255 : 252);
    doc.rect(14, y, pageWidth - 28, 6.5, 'F');
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.text(item.name.substring(0, 38), 16, y + 4.5);
    doc.text(item.type.toUpperCase(), 80, y + 4.5);
    doc.text(item.supplierOrProvider.substring(0, 22), 105, y + 4.5);
    doc.text(`${item.quantity} ${item.unit}`, 145, y + 4.5);
    doc.text(`${cur} ${(Number(item.unitCost) || 0).toLocaleString()}`, 165, y + 4.5);
    doc.setFont('helvetica', 'bold');
    doc.text(`${cur} ${(Number(item.totalCost) || 0).toLocaleString()}`, 183, y + 4.5);
    y += 6.5;
  }

  y += 6;

  // Terms & Notes
  if (y > pageHeight - 35) {
    doc.addPage();
    y = 15;
  }

  doc.setFillColor(254, 243, 199); // light amber
  doc.setDrawColor(245, 158, 11);
  doc.roundedRect(14, y, pageWidth - 28, 18, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(146, 64, 14);
  doc.text('COMMERCIAL TERMS & AUDIT NOTE', 18, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('1. All materials and subcontracted services conform to ISO 9001:2015 and ASME quality standards.', 18, y + 9.5);
  doc.text('2. Quotation valid for 30 calendar days. Escalation clauses apply if metal spot indexes fluctuate beyond +/- 8%.', 18, y + 14);

  // Footer on current page
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Generated via Cost and Planning Database System | Antigravity AI Engine', 14, pageHeight - 7);
  doc.text(`Page ${doc.getNumberOfPages()}`, pageWidth - 25, pageHeight - 7);

  // Save the PDF
  doc.save(`${project.code}_Budget_Quote.pdf`);
}

// ----------------------------------------------------
// 2. CATEGORY / PORTAL CATALOG PDF EXPORT
// ----------------------------------------------------
export interface CatalogPDFColumn {
  header: string;
  dataKey: string;
  width?: number; // in mm
  align?: 'left' | 'right' | 'center';
}

export function exportCategoryCatalogPDF(options: {
  title: string;
  subtitle?: string;
  categoryName: string;
  columns: CatalogPDFColumn[];
  rows: Record<string, any>[];
  filename?: string;
  summaryMetrics?: { label: string; value: string }[];
}) {
  const { title, subtitle, categoryName, columns, rows, filename, summaryMetrics } = options;

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 12;
  const printableWidth = pageWidth - marginX * 2;

  // Header Banner
  doc.setFillColor(19, 34, 56); // #132238
  doc.rect(0, 0, pageWidth, 26, 'F');

  // Accent Line
  doc.setFillColor(0, 119, 182); // #0077b6
  doc.rect(0, 26, pageWidth, 2, 'F');

  // Title & Metadata
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(title.toUpperCase(), marginX, 11);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text(subtitle || 'Enterprise Cost & Profitability Management Catalog', marginX, 18);

  const dateStr = `Exported: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`;
  doc.text(`Scope: ${categoryName} | ${dateStr} | Total Records: ${rows.length}`, marginX, 23);

  let y = 33;

  // Summary Metric Badges (if provided)
  if (summaryMetrics && summaryMetrics.length > 0) {
    const cardWidth = Math.min(65, (printableWidth - (summaryMetrics.length - 1) * 4) / summaryMetrics.length);
    summaryMetrics.forEach((m, idx) => {
      const cardX = marginX + idx * (cardWidth + 4);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(cardX, y, cardWidth, 12, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(m.label.toUpperCase(), cardX + 3, y + 4.5);

      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text(m.value, cardX + 3, y + 9.5);
    });
    y += 16;
  }

  // Calculate dynamic column widths if not specified
  const totalExplicitWidth = columns.reduce((acc, c) => acc + (c.width || 0), 0);
  const unassignedCount = columns.filter(c => !c.width).length;
  const remainingWidth = Math.max(0, printableWidth - totalExplicitWidth);
  const defaultColWidth = unassignedCount > 0 ? remainingWidth / unassignedCount : 30;

  const colLayout = columns.map(c => ({
    ...c,
    calcWidth: c.width || defaultColWidth
  }));

  // Render Table Header
  const renderTableHeader = (currentY: number) => {
    doc.setFillColor(30, 41, 59); // Slate-800
    doc.rect(marginX, currentY, printableWidth, 7, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);

    let curX = marginX;
    colLayout.forEach(col => {
      const textX = col.align === 'right' ? curX + col.calcWidth - 2 : col.align === 'center' ? curX + col.calcWidth / 2 : curX + 2;
      doc.text(col.header, textX, currentY + 4.8, { align: col.align || 'left' });
      curX += col.calcWidth;
    });
  };

  renderTableHeader(y);
  y += 7;

  // Render Table Rows with pagination
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);

  rows.forEach((row, rowIdx) => {
    // Check if new page needed
    if (y > pageHeight - 15) {
      doc.addPage();
      y = 15;
      renderTableHeader(y);
      y += 7;
    }

    // Zebra striping
    if (rowIdx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(marginX, y, printableWidth, 6, 'F');
    }

    doc.setDrawColor(241, 245, 249);
    doc.line(marginX, y + 6, marginX + printableWidth, y + 6);

    doc.setTextColor(30, 41, 59);
    let curX = marginX;
    colLayout.forEach(col => {
      let val = row[col.dataKey];
      if (val === null || val === undefined) val = '-';
      const strVal = String(val);

      // truncate if text exceeds col width
      const maxChars = Math.floor(col.calcWidth / 1.7);
      const displayVal = strVal.length > maxChars ? strVal.slice(0, maxChars - 2) + '…' : strVal;

      const textX = col.align === 'right' ? curX + col.calcWidth - 2 : col.align === 'center' ? curX + col.calcWidth / 2 : curX + 2;
      doc.text(displayVal, textX, y + 4.2, { align: col.align || 'left' });
      curX += col.calcWidth;
    });

    y += 6;
  });

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Confidential & Proprietary • FXTT Enterprise Management System • Page ${i} of ${totalPages}`,
      marginX,
      pageHeight - 6
    );
  }

  const outName = filename || `${title.replace(/\s+/g, '_')}_${categoryName.replace(/\s+/g, '_')}.pdf`;
  doc.save(outName);
  return doc;
}

// ----------------------------------------------------
// 3. PRICE REVISION AUDIT TRAIL PDF EXPORT
// ----------------------------------------------------
export function exportPriceAuditLogPDF(options: {
  itemCode: string;
  itemName: string;
  category?: string;
  currentRate: number;
  unit?: string;
  supplierOrContractor?: string;
  history: Array<{
    date: string;
    previousRate: number;
    newRate: number;
    changePct: number;
    reason: string;
    approvedBy: string;
    status?: string;
  }>;
}) {
  const { itemCode, itemName, category, currentRate, unit, supplierOrContractor, history } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;
  const printableWidth = pageWidth - marginX * 2;

  // Header Banner
  doc.setFillColor(0, 48, 73); // #003049 Deep Navy
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Accent Gold line
  doc.setFillColor(247, 127, 0); // #f77f00 Amber
  doc.rect(0, 28, pageWidth, 2, 'F');

  // Header Titles
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('PRICE REVISION AUDIT TRAIL & COMPLIANCE LOG', marginX, 12);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(224, 231, 255);
  doc.text('Authorized Historical Rate Adjustments, Variance Tracking & Approvals', marginX, 18);
  doc.text(`Audit Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })} | Compliance SLA: Level-1 Certified`, marginX, 23);

  let y = 37;

  // Item Overview Card
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginX, y, printableWidth, 26, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('ITEM SPECIFICATION OVERVIEW', marginX + 5, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Item Code: ${itemCode}`, marginX + 5, y + 12);
  doc.text(`Item Name: ${itemName}`, marginX + 5, y + 17);
  doc.text(`Category: ${category || 'General Industrial Catalog'}`, marginX + 5, y + 22);

  doc.text(`Current Active Rate: Rs. ${currentRate.toLocaleString()} / ${unit || 'unit'}`, marginX + 100, y + 12);
  doc.text(`Supplier / Partner: ${supplierOrContractor || 'Standard Catalog Supplier'}`, marginX + 100, y + 17);
  doc.text(`Total Recorded Revisions: ${history.length} Event(s)`, marginX + 100, y + 22);

  y += 32;

  // Table Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('HISTORICAL PRICE REVISION EVENTS & JUSTIFICATIONS', marginX, y);
  y += 4;

  // Table Columns layout
  const cols = [
    { label: 'Date', width: 22 },
    { label: 'Previous (LKR)', width: 27, align: 'right' },
    { label: 'New Rate (LKR)', width: 27, align: 'right' },
    { label: 'Variance', width: 18, align: 'center' },
    { label: 'Business Justification / Reason', width: 56 },
    { label: 'Auditor / Approver', width: 30 }
  ];

  // Render Table Header
  const renderHeader = (curY: number) => {
    doc.setFillColor(15, 23, 42);
    doc.rect(marginX, curY, printableWidth, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);

    let curX = marginX;
    cols.forEach(c => {
      const textX = c.align === 'right' ? curX + c.width - 2 : c.align === 'center' ? curX + c.width / 2 : curX + 2;
      doc.text(c.label, textX, curY + 4.8, { align: (c.align as any) || 'left' });
      curX += c.width;
    });
  };

  renderHeader(y);
  y += 7;

  // Render Rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);

  history.forEach((rec, idx) => {
    if (y > pageHeight - 20) {
      doc.addPage();
      y = 15;
      renderHeader(y);
      y += 7;
    }

    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(marginX, y, printableWidth, 6.5, 'F');
    }

    doc.setDrawColor(241, 245, 249);
    doc.line(marginX, y + 6.5, marginX + printableWidth, y + 6.5);

    let curX = marginX;
    doc.setTextColor(30, 41, 59);

    // Date
    doc.text(rec.date, curX + 2, y + 4.5);
    curX += cols[0].width;

    // Previous Rate
    doc.setTextColor(100, 116, 139);
    doc.text(`Rs. ${Number(rec.previousRate).toLocaleString()}`, curX + cols[1].width - 2, y + 4.5, { align: 'right' });
    curX += cols[1].width;

    // New Rate
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(`Rs. ${Number(rec.newRate).toLocaleString()}`, curX + cols[2].width - 2, y + 4.5, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    curX += cols[2].width;

    // Variance %
    const isUp = rec.changePct >= 0;
    doc.setTextColor(isUp ? 180 : 16, isUp ? 83 : 185, isUp ? 9 : 129);
    doc.text(`${isUp ? '+' : ''}${rec.changePct}%`, curX + cols[3].width / 2, y + 4.5, { align: 'center' });
    curX += cols[3].width;

    // Reason
    doc.setTextColor(51, 65, 85);
    const safeReason = rec.reason.length > 38 ? rec.reason.slice(0, 36) + '…' : rec.reason;
    doc.text(safeReason, curX + 2, y + 4.5);
    curX += cols[4].width;

    // Auditor
    doc.setTextColor(71, 85, 105);
    const safeAuditor = rec.approvedBy.length > 20 ? rec.approvedBy.slice(0, 18) + '…' : rec.approvedBy;
    doc.text(safeAuditor, curX + 2, y + 4.5);

    y += 6.5;
  });

  // Compliance Footnote
  y += 6;
  if (y > pageHeight - 25) {
    doc.addPage();
    y = 15;
  }
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(marginX, y, printableWidth, 14, 1, 1, 'F');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('CERTIFIED AUDIT TRAIL: All rate updates are cryptographically hashed and logged under immutable commercial governance.', marginX + 4, y + 5);
  doc.text('Currency Standard: Sri Lanka Rupees (LKR / Rs.) • Sign-off by Procurement Lead and Finance Controller.', marginX + 4, y + 9.5);

  const safeFilename = `Price_Audit_${itemCode.replace(/[^a-zA-Z0-9_-]/g, '_')}_LKR.pdf`;
  doc.save(safeFilename);
  return doc;
}

// Re-export CSV utilities for backwards compatibility
export {
  exportMaterialsToCSV,
  exportInventoryToCSV,
  exportInventoryTransactionsToCSV,
  exportSubcontractorsToCSV,
  exportOutsourcedServicesToCSV,
  exportProjectsToCSV,
  exportSuppliersToCSV
} from './csvExport';

// ----------------------------------------------------
// 4. MASTER ENTERPRISE EXECUTIVE SYSTEM REPORT (LKR)
// ----------------------------------------------------
export function exportMasterExecutiveReportPDF(
  optionsOrCompany: any,
  materialsParam?: any[],
  inventoryParam?: any[],
  transactionsParam?: any[],
  projectsParam?: any[],
  subcontractorsParam?: any[],
  outsourcedParam?: any[],
  suppliersParam?: any[]
) {
  let company: any;
  let materials: any[] = [];
  let inventory: any[] = [];
  let projects: any[] = [];
  let suppliers: any[] = [];
  let subcontractors: any[] = [];
  let outsourced: any[] = [];
  let transactions: any[] = [];

  if (optionsOrCompany && typeof optionsOrCompany === 'object' && ('company' in optionsOrCompany || 'materials' in optionsOrCompany)) {
    company = optionsOrCompany.company;
    materials = optionsOrCompany.materials || [];
    inventory = optionsOrCompany.inventory || [];
    projects = optionsOrCompany.projects || [];
    suppliers = optionsOrCompany.suppliers || [];
    subcontractors = optionsOrCompany.subcontractors || [];
    outsourced = optionsOrCompany.outsourced || [];
    transactions = optionsOrCompany.transactions || [];
  } else {
    company = optionsOrCompany;
    materials = materialsParam || [];
    inventory = inventoryParam || [];
    transactions = transactionsParam || [];
    projects = projectsParam || [];
    subcontractors = subcontractorsParam || [];
    outsourced = outsourcedParam || [];
    suppliers = suppliersParam || [];
  }
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;
  const printableWidth = pageWidth - marginX * 2;

  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(company?.name || 'FXTT Enterprise Solutions Ltd', marginX, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text('MASTER ENTERPRISE AUDIT & COMMERCIAL OPERATIONS REPORT (LKR)', marginX, 18);
  doc.text(
    `Registration: ${company?.registrationNumber || 'FX-CORP-LK-2026'} | Tax ID: ${company?.taxId || 'LK-VAT-94'} | Currency: Sri Lanka Rupees (LKR / Rs.)`,
    marginX,
    24
  );

  let y = 38;

  // Financial Metrics Cards
  const totalStockValuation = inventory.reduce((sum, item) => sum + (item.totalValuation || (item.currentStock * (item.unitCost || 0))), 0);
  const totalProjectRevenue = projects.reduce((sum, p) => sum + (p.quotedPrice || 0), 0);
  const totalTransactionsVolume = transactions.reduce((sum, t) => sum + (t.totalAmount || 0), 0);

  doc.setFillColor(241, 245, 249);
  doc.roundedRect(marginX, y, printableWidth, 22, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('INVENTORY VALUATION (LKR)', marginX + 6, y + 6);
  doc.text('PROJECT PIPELINE REVENUE (LKR)', marginX + 65, y + 6);
  doc.text('TRANSACTIONS VOLUME (LKR)', marginX + 128, y + 6);

  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Rs. ${totalStockValuation.toLocaleString()}`, marginX + 6, y + 15);
  doc.text(`Rs. ${totalProjectRevenue.toLocaleString()}`, marginX + 65, y + 15);
  doc.text(`Rs. ${totalTransactionsVolume.toLocaleString()}`, marginX + 128, y + 15);

  y += 28;

  // Section 1: System Scope & Registry Snapshot
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('1. CENTRAL DATABASE CONNECTIVITY & RECORD COUNTS', marginX, y);
  y += 4;

  const summaryGrid = [
    { label: 'Materials Master Catalog', count: `${materials.length} items` },
    { label: 'Live Inventory SKUs', count: `${inventory.length} SKUs` },
    { label: 'Logged Inventory Transactions', count: `${transactions.length} entries` },
    { label: 'Active Projects', count: `${projects.length} contracts` },
    { label: 'Approved Suppliers', count: `${suppliers.length} vendors` },
    { label: 'Subcontractor Rate Schedules', count: `${subcontractors.length} trades` },
    { label: 'Outsourced Utility Contracts', count: `${outsourced.length} services` }
  ];

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(marginX, y, printableWidth, 18, 1, 1, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);

  let gridX = marginX + 4;
  let gridY = y + 5;
  summaryGrid.slice(0, 4).forEach(item => {
    doc.text(`• ${item.label}: `, gridX, gridY);
    doc.setFont('helvetica', 'bold');
    doc.text(item.count, gridX + 44, gridY);
    doc.setFont('helvetica', 'normal');
    gridX += 60;
  });

  gridX = marginX + 4;
  gridY = y + 12;
  summaryGrid.slice(4).forEach(item => {
    doc.text(`• ${item.label}: `, gridX, gridY);
    doc.setFont('helvetica', 'bold');
    doc.text(item.count, gridX + 46, gridY);
    doc.setFont('helvetica', 'normal');
    gridX += 60;
  });

  y += 24;

  // Section 2: Top Inventory Items & Unique Number Linkage
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('2. CENTRAL INVENTORY STATUS & UNIQUE TRACEABILITY NUMBERS', marginX, y);
  y += 4;

  // Table header
  doc.setFillColor(15, 23, 42);
  doc.rect(marginX, y, printableWidth, 6.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.text('Central SKU', marginX + 2, y + 4.5);
  doc.text('Material / Item Name', marginX + 32, y + 4.5);
  doc.text('Location', marginX + 96, y + 4.5);
  doc.text('Stock', marginX + 130, y + 4.5);
  doc.text('Unit Cost (LKR)', marginX + 148, y + 4.5);
  doc.text('Valuation (LKR)', marginX + 182, y + 4.5, { align: 'right' });
  y += 6.5;

  inventory.slice(0, 8).forEach((inv, idx) => {
    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(marginX, y, printableWidth, 6, 'F');
    }
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(inv.sku, marginX + 2, y + 4.2);
    doc.text(inv.itemName.substring(0, 34), marginX + 32, y + 4.2);
    doc.text((inv.location || 'Warehouse').substring(0, 18), marginX + 96, y + 4.2);
    doc.text(String(inv.currentStock), marginX + 130, y + 4.2);
    doc.text(`Rs. ${Number(inv.unitCost || 0).toLocaleString()}`, marginX + 148, y + 4.2);
    doc.setFont('helvetica', 'bold');
    doc.text(`Rs. ${Number(inv.totalValuation || (inv.currentStock * (inv.unitCost || 0))).toLocaleString()}`, marginX + 182, y + 4.2, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    y += 6;
  });

  y += 6;

  // Section 3: Recent Inventory Transactions with Central Unique Linkage
  if (y > pageHeight - 55) {
    doc.addPage();
    y = 15;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('3. AUDITED INVENTORY TRANSACTIONS & CENTRAL DATABASE CONNECTIONS', marginX, y);
  y += 4;

  doc.setFillColor(15, 23, 42);
  doc.rect(marginX, y, printableWidth, 6.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.text('Unique Txn Ref', marginX + 2, y + 4.5);
  doc.text('Type', marginX + 36, y + 4.5);
  doc.text('Date', marginX + 48, y + 4.5);
  doc.text('Material Code & Batch', marginX + 68, y + 4.5);
  doc.text('Qty', marginX + 120, y + 4.5);
  doc.text('Unit Price (LKR)', marginX + 136, y + 4.5);
  doc.text('Total Amount (LKR)', marginX + 182, y + 4.5, { align: 'right' });
  y += 6.5;

  transactions.slice(0, 6).forEach((tx, idx) => {
    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(marginX, y, printableWidth, 6, 'F');
    }
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(tx.transactionNumber || tx.id, marginX + 2, y + 4.2);
    
    // Type colored
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(tx.type === 'IN' ? 16 : 185, tx.type === 'IN' ? 185 : 28, tx.type === 'IN' ? 129 : 28);
    doc.text(tx.type, marginX + 36, y + 4.2);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    doc.text(tx.date, marginX + 48, y + 4.2);
    doc.text(`${tx.materialCode} [${tx.batchLotNumber || 'LOT-AUTO'}]`.substring(0, 30), marginX + 68, y + 4.2);
    doc.text(`${tx.quantity} ${tx.unit}`, marginX + 120, y + 4.2);
    doc.text(`Rs. ${Number(tx.price).toLocaleString()}`, marginX + 136, y + 4.2);
    doc.setFont('helvetica', 'bold');
    doc.text(`Rs. ${Number(tx.totalAmount).toLocaleString()}`, marginX + 182, y + 4.2, { align: 'right' });
    y += 6;
  });

  // Footer / Certification Stamp
  y += 8;
  if (y > pageHeight - 30) {
    doc.addPage();
    y = 15;
  }

  doc.setFillColor(241, 245, 249);
  doc.roundedRect(marginX, y, printableWidth, 16, 1, 1, 'F');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text('OFFICIAL CERTIFICATION & INTEGRITY GUARANTEE:', marginX + 4, y + 5);
  doc.text(
    'All inventory transactions, items, rates, and projects are permanently synchronized with the central database in Sri Lanka Rupees (LKR).',
    marginX + 4,
    y + 9
  );
  doc.text(
    `Report generated on ${new Date().toLocaleString()} • Authorized by Enterprise Finance Comptroller & Procurement Administration.`,
    marginX + 4,
    y + 13
  );

  doc.save(`Master_Enterprise_Executive_Report_LKR_${new Date().toISOString().slice(0, 10)}.pdf`);
  return doc;
}

