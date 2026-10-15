import React, { useState } from 'react';
import { Check, Palette, Sparkles, RefreshCw } from 'lucide-react';
import { TILE_GRADIENT_PRESETS, TileTheme, getThemeById } from '../data/tileThemes';

interface ColorGradientPickerProps {
  selectedThemeId?: string;
  customFrom?: string;
  customTo?: string;
  onSelectTheme: (themeId: string, customGradient?: string) => void;
  compact?: boolean;
}

export const ColorGradientPicker: React.FC<ColorGradientPickerProps> = ({
  selectedThemeId = 'pacific-sky',
  customFrom = '#0284c7',
  customTo = '#3730a3',
  onSelectTheme,
  compact = false
}) => {
  const [activeTab, setActiveTab] = useState<'presets' | 'custom'>('presets');
  const [fromColor, setFromColor] = useState(customFrom);
  const [toColor, setToColor] = useState(customTo);

  const handleCustomApply = () => {
    const customStyle = `linear-gradient(135deg, ${fromColor}, ${toColor})`;
    onSelectTheme('custom', customStyle);
  };

  return (
    <div className={`bg-white rounded-lg p-3 ${compact ? 'w-64 shadow-xl border border-slate-200' : 'w-full'}`}>
      <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-100">
        <div className="flex items-center space-x-1.5 text-xs text-slate-800">
          <Palette className="w-3.5 h-3.5 text-[#003049]" />
          <span>Card Color & Gradient Theme</span>
        </div>
        <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded text-[10px]">
          <button
            type="button"
            onClick={() => setActiveTab('presets')}
            className={`px-2 py-0.5 rounded transition-colors ${activeTab === 'presets' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-600'}`}
          >
            Presets
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('custom')}
            className={`px-2 py-0.5 rounded transition-colors ${activeTab === 'custom' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-600'}`}
          >
            Custom
          </button>
        </div>
      </div>

      {activeTab === 'presets' ? (
        <div>
          <div className="grid grid-cols-5 gap-2">
            {TILE_GRADIENT_PRESETS.map((preset) => {
              const isSelected = selectedThemeId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onSelectTheme(preset.id)}
                  className={`group relative h-9 rounded-lg ${preset.gradientClass} p-1 transition-all duration-150 transform hover:scale-105 flex items-center justify-center shadow-xs ${
                    isSelected ? 'ring-2 ring-offset-1 ring-[#003049]' : ''
                  }`}
                  title={preset.name}
                >
                  {isSelected && (
                    <div className="w-4 h-4 rounded-full bg-white/90 text-slate-900 flex items-center justify-center shadow-xs">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  )}
                  <span className="sr-only">{preset.name}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-2 text-[10px] text-slate-500 text-center">
            Selected: <span className="text-slate-800">{getThemeById(selectedThemeId).name}</span>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="block text-[10px] text-slate-500 mb-1">Start Color</label>
              <div className="flex items-center space-x-1.5 border border-slate-300 rounded p-1">
                <input
                  type="color"
                  value={fromColor}
                  onChange={(e) => setFromColor(e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border-0 p-0"
                />
                <span className="text-[11px] text-slate-700 uppercase font-mono">{fromColor}</span>
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 mb-1">End Color</label>
              <div className="flex items-center space-x-1.5 border border-slate-300 rounded p-1">
                <input
                  type="color"
                  value={toColor}
                  onChange={(e) => setToColor(e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border-0 p-0"
                />
                <span className="text-[11px] text-slate-700 uppercase font-mono">{toColor}</span>
              </div>
            </div>
          </div>

          {/* Live Mini Preview */}
          <div
            className="h-10 rounded-lg flex items-center justify-center text-white text-[11px] shadow-xs"
            style={{ background: `linear-gradient(135deg, ${fromColor}, ${toColor})` }}
          >
            Preview Gradient
          </div>

          <button
            type="button"
            onClick={handleCustomApply}
            className="w-full py-1 bg-[#003049] hover:bg-[#002235] text-white text-xs rounded transition-colors"
          >
            Apply Custom Gradient
          </button>
        </div>
      )}
    </div>
  );
};
