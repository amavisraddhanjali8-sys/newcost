import React, { useState, useRef, useEffect } from 'react';
import { Palette, ArrowRight, Sparkles, Check, ChevronRight, ListFilter, Table, Pencil, Trash2, Copy, Bookmark, Building2, Package, HardHat, Truck, ShieldCheck, Wrench, TrendingUp, Calendar, Users, Upload } from 'lucide-react';
import { TileTheme, getThemeById } from '../data/tileThemes';
import { ColorGradientPicker } from './ColorGradientPicker';

export interface ModernTileCardProps {
  id: string;
  tag: string; // e.g. 'PROJECT', 'CASE STUDY', 'MATERIAL CATEGORY', 'CLIENT PROFILE', 'SUPPLIER'
  title: string;
  brief?: string; // Few words/details only!
  actionLabel?: string; // e.g. 'Read the White Paper', 'Select Project', 'Explore Sub-Categories'
  actionVariant?: 'button' | 'link'; // 'button' = white pill button (top row in image), 'link' = 'READ NOW' (bottom row in image)
  themeId?: string;
  customGradient?: string;
  onClick?: () => void;
  onAction?: () => void;
  onViewListView?: () => void;
  listViewLabel?: string;
  onChangeTheme?: (newThemeId: string, customGradient?: string) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onSaveAsTemplate?: () => void;
  onViewMargins?: () => void;
  onViewTimelines?: () => void;
  onViewResources?: () => void;
  onBulkImport?: () => void;
  selected?: boolean;
  featured?: boolean; // wide hero card like top 3 cards in Ionic screenshot
  extraMeta?: React.ReactNode;
}

export const ModernTileCard: React.FC<ModernTileCardProps> = ({
  id,
  tag,
  title,
  brief,
  actionLabel = 'READ NOW',
  actionVariant = 'link',
  themeId = 'pacific-sky',
  customGradient,
  onClick,
  onAction,
  onViewListView,
  listViewLabel = 'List View',
  onChangeTheme,
  onEdit,
  onDelete,
  onDuplicate,
  onSaveAsTemplate,
  onViewMargins,
  onViewTimelines,
  onViewResources,
  onBulkImport,
  selected = false,
  featured = false,
  extraMeta
}) => {
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const paletteRef = useRef<HTMLDivElement>(null);
  const theme = getThemeById(themeId);

  // Close palette on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (paletteRef.current && !paletteRef.current.contains(e.target as Node)) {
        setIsPaletteOpen(false);
      }
    };
    if (isPaletteOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPaletteOpen]);

  const backgroundStyle: React.CSSProperties = customGradient
    ? { background: customGradient }
    : {};

  const handleCardClick = () => {
    if (isPaletteOpen) return;
    if (onClick) {
      onClick();
    } else if (onAction) {
      onAction();
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className={`group relative rounded-2xl transition-all duration-300 select-none flex flex-col justify-between shadow-md hover:shadow-xl ${
        isPaletteOpen ? 'z-40' : 'z-10'
      } ${onClick || onAction ? 'cursor-pointer hover:-translate-y-0.5' : ''} ${
        featured ? 'min-h-[260px] p-6 sm:p-7' : 'min-h-[220px] p-5'
      } ${
        selected ? 'ring-3 ring-white ring-offset-2 ring-offset-slate-900 scale-[1.01]' : ''
      }`}
    >
      {/* Background layer with rounded-2xl & overflow-hidden so the mesh & gradient clip cleanly, while dropdowns can overflow! */}
      <div
        className={`absolute inset-0 rounded-2xl overflow-hidden pointer-events-none transition-all duration-300 ${!customGradient ? theme.gradientClass : ''}`}
        style={backgroundStyle}
      >
        {/* Subtle Abstract Backdrop Accent Lines / Mesh */}
        <div className="absolute inset-0 pointer-events-none opacity-20 group-hover:opacity-30 transition-opacity duration-300 overflow-hidden">
          <svg
            className="absolute -right-12 -bottom-12 w-64 h-64 text-white"
            viewBox="0 0 200 200"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="100" cy="100" r="80" stroke="currentColor" strokeWidth="2" opacity="0.6" />
            <circle cx="100" cy="100" r="50" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.4" />
            <path d="M20 100 Q 100 20 180 100" stroke="currentColor" strokeWidth="2" opacity="0.5" />
            <path d="M20 120 Q 100 200 180 120" stroke="currentColor" strokeWidth="2" opacity="0.3" />
          </svg>
        </div>
      </div>

      {/* Top Bar: Eyebrow Tag & Interactive Action cluster (Edit, Duplicate, Palette, Delete) */}
      <div className="relative z-10 flex items-center justify-between gap-1.5">
        <span className="text-[10px] sm:text-[11px] font-normal uppercase tracking-wider text-white/90 px-2 py-0.5 rounded-full bg-black/20 backdrop-blur-xs border border-white/20 truncate max-w-[150px]">
          {tag}
        </span>

        {/* Action Cluster: Edit, Duplicate, Palette, Delete */}
        <div className="flex items-center space-x-1 shrink-0">
          {onEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="w-6 h-6 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-xs text-white flex items-center justify-center transition-colors shadow-2xs"
              title="Edit Details"
            >
              <Pencil className="w-3 h-3" />
            </button>
          )}

          {onDuplicate && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
              className="w-6 h-6 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-xs text-white flex items-center justify-center transition-colors shadow-2xs"
              title="Duplicate Card"
            >
              <Copy className="w-3 h-3" />
            </button>
          )}

          {onSaveAsTemplate && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSaveAsTemplate();
              }}
              className="w-6 h-6 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-xs text-white flex items-center justify-center transition-colors shadow-2xs"
              title="Save as Reusable Plan Template"
            >
              <Bookmark className="w-3 h-3" />
            </button>
          )}

          {/* Bulk Import Line Items Button */}
          {onBulkImport && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onBulkImport();
              }}
              className="w-6 h-6 rounded-full bg-emerald-500/80 hover:bg-emerald-600 backdrop-blur-xs text-white flex items-center justify-center transition-colors shadow-2xs"
              title="Bulk Import Items (Excel / CSV)"
            >
              <Upload className="w-3 h-3" />
            </button>
          )}

          {/* Quick Color/Gradient Theme Palette */}
          {onChangeTheme && (
            <div className="relative" ref={paletteRef}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPaletteOpen(!isPaletteOpen);
                }}
                className="w-6 h-6 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-xs text-white flex items-center justify-center transition-colors shadow-2xs"
                title="Change Card Color & Gradient Combination"
              >
                <Palette className="w-3 h-3" />
              </button>

              {isPaletteOpen && (
                <div
                  className="absolute right-0 top-7 z-50 animate-in fade-in zoom-in-95 duration-150"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ColorGradientPicker
                    compact
                    selectedThemeId={themeId}
                    onSelectTheme={(newTheme, newCustom) => {
                      onChangeTheme(newTheme, newCustom);
                      setIsPaletteOpen(false);
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="w-6 h-6 rounded-full bg-black/25 hover:bg-red-600/90 backdrop-blur-xs text-white/80 hover:text-white flex items-center justify-center transition-colors shadow-2xs"
              title="Delete Card"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Center: Clean, Crisp Title & Minimal Words */}
      <div className="relative z-10 my-3">
        <h3
          className={`font-normal text-white leading-tight tracking-tight drop-shadow-xs ${
            featured ? 'text-lg sm:text-xl' : 'text-base sm:text-lg'
          }`}
        >
          {title}
        </h3>

        {brief && (
          <p className="mt-1.5 text-xs text-white/80 font-normal leading-snug line-clamp-2 max-w-sm">
            {brief}
          </p>
        )}

        {extraMeta && (
          <div className="mt-2 text-white/90">
            {extraMeta}
          </div>
        )}

        {/* Quick Project Access: Margins, Timelines, Resources (Simple 1-word buttons) */}
        {(onViewMargins || onViewTimelines || onViewResources) && (
          <div className="mt-2.5 pt-2 border-t border-white/20 flex items-center gap-1.5 flex-wrap">
            {onViewMargins && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewMargins();
                }}
                className="flex items-center space-x-1 px-2 py-1 rounded-lg bg-black/25 hover:bg-black/45 backdrop-blur-xs text-white text-[11px] font-semibold border border-white/20 transition-all cursor-pointer shadow-2xs hover:scale-102"
                title="Marginal Analysis"
              >
                <TrendingUp className="w-3 h-3 text-emerald-300" />
                <span>Margins</span>
              </button>
            )}

            {onViewTimelines && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewTimelines();
                }}
                className="flex items-center space-x-1 px-2 py-1 rounded-lg bg-black/25 hover:bg-black/45 backdrop-blur-xs text-white text-[11px] font-semibold border border-white/20 transition-all cursor-pointer shadow-2xs hover:scale-102"
                title="Project Timelines"
              >
                <Calendar className="w-3 h-3 text-sky-300" />
                <span>Timelines</span>
              </button>
            )}

            {onViewResources && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewResources();
                }}
                className="flex items-center space-x-1 px-2 py-1 rounded-lg bg-black/25 hover:bg-black/45 backdrop-blur-xs text-white text-[11px] font-semibold border border-white/20 transition-all cursor-pointer shadow-2xs hover:scale-102"
                title="Resource Allocation"
              >
                <Users className="w-3 h-3 text-purple-300" />
                <span>Resources</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bottom Row: Action Buttons (View Projects & View Details) */}
      <div className="relative z-10 pt-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center flex-wrap gap-2">
          {/* FXTT List View / View Projects / View Materials & Supplies Button */}
          {onViewListView && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onViewListView();
              }}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-white text-slate-900 hover:bg-slate-50 text-xs font-medium transition-all duration-200 shadow-sm hover:shadow active:scale-95 cursor-pointer whitespace-nowrap"
              title={listViewLabel || 'View Items'}
            >
              {listViewLabel && (listViewLabel.toLowerCase().includes('subcontractor') || listViewLabel.toLowerCase().includes('trade')) ? (
                <HardHat className="w-3.5 h-3.5 text-[#0077b6] shrink-0" />
              ) : listViewLabel && (listViewLabel.toLowerCase().includes('material') || listViewLabel.toLowerCase().includes('suppli')) ? (
                <Package className="w-3.5 h-3.5 text-[#0077b6] shrink-0" />
              ) : listViewLabel && (listViewLabel.toLowerCase().includes('service') || listViewLabel.toLowerCase().includes('outsourced')) ? (
                <Truck className="w-3.5 h-3.5 text-[#0077b6] shrink-0" />
              ) : (
                <Table className="w-3.5 h-3.5 text-[#0077b6] shrink-0" />
              )}
              <span className="truncate">{listViewLabel}</span>
            </button>
          )}

          {/* Primary Action / View Details Button */}
          {onAction && (
            actionVariant === 'button' ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAction();
                }}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 shadow-sm hover:shadow flex items-center space-x-1.5 active:scale-95 cursor-pointer whitespace-nowrap ${
                  onViewListView
                    ? 'bg-black/25 hover:bg-black/40 backdrop-blur-xs text-white border border-white/20'
                    : 'bg-white text-slate-900 hover:bg-slate-50'
                }`}
                title={actionLabel}
              >
                {onViewListView ? (
                  actionLabel.toLowerCase().includes('subcontractor') ? (
                    <HardHat className="w-3.5 h-3.5 text-white/90 shrink-0" />
                  ) : actionLabel.toLowerCase().includes('provider') || actionLabel.toLowerCase().includes('service') ? (
                    <ShieldCheck className="w-3.5 h-3.5 text-white/90 shrink-0" />
                  ) : (
                    <Building2 className="w-3.5 h-3.5 text-white/90 shrink-0" />
                  )
                ) : null}
                <span className="truncate">{actionLabel}</span>
                {!onViewListView && <ChevronRight className="w-3.5 h-3.5 text-slate-700 shrink-0" />}
              </button>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAction();
                }}
                className="text-xs font-medium uppercase tracking-wider text-white hover:text-white/90 flex items-center space-x-1 transition-all duration-200 group-hover:translate-x-0.5 cursor-pointer whitespace-nowrap"
              >
                <span>{actionLabel}</span>
                <ArrowRight className="w-3.5 h-3.5 text-white/90 shrink-0" />
              </button>
            )
          )}
        </div>

        {selected && (
          <span className="text-[10px] text-white/90 bg-white/20 px-2 py-0.5 rounded-full border border-white/30">
            Selected
          </span>
        )}
      </div>
    </div>
  );
};
