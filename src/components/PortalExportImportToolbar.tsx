import React, { useState } from 'react';
import {
  Download,
  Upload,
  FileText,
  FileSpreadsheet,
  History,
  ChevronDown,
  Layers,
  Sparkles
} from 'lucide-react';
import { ImportEntityType } from '../utils/excelImport';

export interface PortalExportImportToolbarProps {
  portalTitle: string;
  categoryFilter?: string;
  entityType: ImportEntityType;
  totalItemsCount: number;
  onExportCSV: () => void;
  onExportPDF: () => void;
  onExportPriceHistoryCSV?: () => void;
  onExportPriceHistoryPDF?: () => void;
  onOpenImportModal: (entityType: ImportEntityType) => void;
}

export const PortalExportImportToolbar: React.FC<PortalExportImportToolbarProps> = ({
  portalTitle,
  categoryFilter,
  entityType,
  totalItemsCount,
  onExportCSV,
  onExportPDF,
  onExportPriceHistoryCSV,
  onExportPriceHistoryPDF,
  onOpenImportModal
}) => {
  const [isCsvMenuOpen, setIsCsvMenuOpen] = useState(false);
  const [isPdfMenuOpen, setIsPdfMenuOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
      {/* Left: Summary Info */}
      <div className="flex items-center space-x-2.5">
        <div className="p-2 bg-blue-50 text-[#0077b6] rounded-lg">
          <FileSpreadsheet className="w-4 h-4" />
        </div>
        <div>
          <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
            <span>{portalTitle} Master Data Gateway</span>
            <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-semibold">
              {totalItemsCount} {totalItemsCount === 1 ? 'Record' : 'Records'}
            </span>
            {categoryFilter && categoryFilter !== 'all' && (
              <span className="text-[10px] font-medium px-2 py-0.5 bg-blue-50 text-[#0077b6] rounded-full border border-blue-200 truncate max-w-xs">
                Category: {categoryFilter}
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-500">
            Export catalogs & audited price histories or ingest Excel / CSV batches.
          </div>
        </div>
      </div>

      {/* Right: Action Buttons */}
      <div className="flex items-center space-x-2">
        {/* CSV EXPORT DROPDOWN */}
        <div className="relative">
          <div className="inline-flex rounded-lg shadow-2xs">
            <button
              type="button"
              onClick={onExportCSV}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium rounded-l-lg flex items-center space-x-1.5 transition-colors cursor-pointer border-r-0"
              title="Download CSV spreadsheet of current items"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Download CSV</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsCsvMenuOpen(!isCsvMenuOpen);
                setIsPdfMenuOpen(false);
              }}
              className="px-2 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-800 text-xs rounded-r-lg transition-colors cursor-pointer"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {isCsvMenuOpen && (
            <div className="absolute right-0 mt-1 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-30 animate-in fade-in zoom-in-95">
              <button
                type="button"
                onClick={() => {
                  setIsCsvMenuOpen(false);
                  onExportCSV();
                }}
                className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center space-x-2 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Download Items Catalog (.CSV)</span>
              </button>

              {onExportPriceHistoryCSV && (
                <button
                  type="button"
                  onClick={() => {
                    setIsCsvMenuOpen(false);
                    onExportPriceHistoryCSV();
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center space-x-2 cursor-pointer border-t border-slate-100"
                >
                  <History className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Download Price Histories (.CSV)</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* PDF EXPORT DROPDOWN */}
        <div className="relative">
          <div className="inline-flex rounded-lg shadow-2xs">
            <button
              type="button"
              onClick={onExportPDF}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium rounded-l-lg flex items-center space-x-1.5 transition-colors cursor-pointer border-r-0"
              title="Download formal A4 PDF report"
            >
              <FileText className="w-3.5 h-3.5 text-red-600" />
              <span>Download PDF</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsPdfMenuOpen(!isPdfMenuOpen);
                setIsCsvMenuOpen(false);
              }}
              className="px-2 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-800 text-xs rounded-r-lg transition-colors cursor-pointer"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {isPdfMenuOpen && (
            <div className="absolute right-0 mt-1 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-30 animate-in fade-in zoom-in-95">
              <button
                type="button"
                onClick={() => {
                  setIsPdfMenuOpen(false);
                  onExportPDF();
                }}
                className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center space-x-2 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-red-600 shrink-0" />
                <span>Executive Catalog PDF</span>
              </button>

              {onExportPriceHistoryPDF && (
                <button
                  type="button"
                  onClick={() => {
                    setIsPdfMenuOpen(false);
                    onExportPriceHistoryPDF();
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center space-x-2 cursor-pointer border-t border-slate-100"
                >
                  <History className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Price History Audit PDF</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* IMPORT FROM EXCEL / CSV BUTTON */}
        <button
          type="button"
          onClick={() => onOpenImportModal(entityType)}
          className="px-3.5 py-1.5 bg-[#0077b6] hover:bg-[#005f94] text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors cursor-pointer shadow-2xs"
          title="Import batch data from Excel (.xlsx/.xls) or CSV"
        >
          <Upload className="w-3.5 h-3.5 text-white" />
          <span>Import Excel / CSV</span>
        </button>
      </div>
    </div>
  );
};
