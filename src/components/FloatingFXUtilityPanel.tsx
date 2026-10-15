import React, { useState, useEffect, useRef } from 'react';
import {
  DollarSign,
  TrendingUp,
  RefreshCw,
  Upload,
  ArrowRightLeft,
  X,
  ChevronDown,
  ChevronUp,
  Check,
  AlertCircle,
  Sliders,
  Sparkles,
  Zap,
  Globe2,
  FileSpreadsheet,
  Layers,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { fxService, LiveExchangeRate } from '../services/fxService';
import { SUPPORTED_CURRENCIES, formatCurrency, getCurrencyInfo, setStoredCurrency, getStoredCurrency } from '../utils/currency';

interface FloatingFXUtilityPanelProps {
  onRecalculateAll?: () => void;
  activeCurrency?: string;
  onCurrencyChange?: (currency: string) => void;
}

export const FloatingFXUtilityPanel: React.FC<FloatingFXUtilityPanelProps> = ({
  onRecalculateAll,
  activeCurrency: externalCurrency,
  onCurrencyChange
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [rates, setRates] = useState<LiveExchangeRate[]>(() => fxService.getRates());
  const [isSimulating, setIsSimulating] = useState<boolean>(() => fxService.isSimulating());
  const [isFetchingApi, setIsFetchingApi] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [activeTab, setActiveTab] = useState<'rates' | 'import' | 'stress-test'>('rates');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [lastRecalcTime, setLastRecalcTime] = useState<string>('Just now');
  
  // Custom Import State
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  // Stress-Test Scenario Multiplier
  const [stressCurrency, setStressCurrency] = useState<string>('LKR');
  const [stressDeltaPct, setStressDeltaPct] = useState<number>(0);

  // Active selected base currency
  const [currentCurrency, setCurrentCurrency] = useState<string>(() => externalCurrency || getStoredCurrency());

  // Listen to external currency or rate changes
  useEffect(() => {
    if (externalCurrency && externalCurrency !== currentCurrency) {
      setCurrentCurrency(externalCurrency);
    }
  }, [externalCurrency]);

  useEffect(() => {
    const handleRatesUpdated = (e: any) => {
      if (e.detail?.rates) {
        setRates([...e.detail.rates]);
      }
    };
    const handleCurrencyChanged = (e: any) => {
      if (e.detail?.currency) {
        setCurrentCurrency(e.detail.currency);
      }
    };

    window.addEventListener('fxtt-rates-updated', handleRatesUpdated);
    window.addEventListener('fxtt-currency-changed', handleCurrencyChanged);

    return () => {
      window.removeEventListener('fxtt-rates-updated', handleRatesUpdated);
      window.removeEventListener('fxtt-currency-changed', handleCurrencyChanged);
    };
  }, []);

  const handleToggleSimulation = () => {
    if (isSimulating) {
      fxService.stopLiveSimulation();
      setIsSimulating(false);
      showStatus('Live simulated mid-market ticks paused.');
    } else {
      fxService.startLiveSimulation();
      setIsSimulating(true);
      showStatus('⚡ Live simulated mid-market ticks activated (3.5s interval).');
    }
  };

  const handleFetchApi = async () => {
    setIsFetchingApi(true);
    try {
      const res = await fxService.fetchLiveRatesFromApi();
      setRates(fxService.getRates());
      showStatus(res.message);
    } catch (e: any) {
      showStatus('Api sync completed with simulated forex brackets.');
    } finally {
      setIsFetchingApi(false);
    }
  };

  const handleInstantRecalculate = () => {
    setIsRecalculating(true);
    // Apply stress delta if any
    if (stressDeltaPct !== 0 && stressCurrency) {
      const currentRate = fxService.getRateValue(stressCurrency);
      const adjusted = currentRate * (1 + stressDeltaPct / 100);
      fxService.setRate(stressCurrency, adjusted, 'Manual Override');
    }

    if (onRecalculateAll) {
      onRecalculateAll();
    }

    // Dispatch global event for any listening child views
    window.dispatchEvent(new CustomEvent('fxtt-recalculate-projections', { detail: { rates: fxService.getRates() } }));

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLastRecalcTime(now);

    setTimeout(() => {
      setIsRecalculating(false);
      showStatus(`Projections recalculated across all project phases at ${now}.`);
    }, 450);
  };

  const handleRateEdit = (code: string, newRateStr: string) => {
    const val = parseFloat(newRateStr);
    if (!isNaN(val) && val > 0) {
      fxService.setRate(code, val, 'Manual Override');
      setRates(fxService.getRates());
    }
  };

  const handleImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setImportError(null);
    setImportSuccess(null);

    if (!importText.trim()) {
      setImportError('Please enter valid CSV or JSON exchange rates.');
      return;
    }

    const res = fxService.importRatesFromString(importText, 'Imported Custom Feed');
    if (res.success) {
      setRates(fxService.getRates());
      setImportSuccess(`Successfully imported ${res.count} foreign exchange rates!`);
      showStatus(`Imported ${res.count} FX rates. Ready to recalculate.`);
      handleInstantRecalculate();
    } else {
      setImportError(res.error || 'Failed to parse exchange rates.');
    }
  };

  const handleLoadSampleCSV = () => {
    const sample = `USD,1.0\nEUR,0.925\nGBP,0.792\nLKR,308.50\nINR,86.75\nJPY,155.20\nAUD,1.55\nCAD,1.40\nSGD,1.35\nAED,3.67\nCNY,7.26`;
    setImportText(sample);
  };

  const showStatus = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => {
      setStatusMessage(null);
    }, 4000);
  };

  const lkrRate = rates.find((r) => r.code === 'LKR')?.rateToUSD || 305.25;
  const eurRate = rates.find((r) => r.code === 'EUR')?.rateToUSD || 0.92;

  return (
    <>
      {/* 1. FLOATING QUICK-ACCESS DOCK BUTTON (Pinned bottom-right) */}
      <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2">
        {/* Instant Recalculate Button */}
        <button
          type="button"
          onClick={handleInstantRecalculate}
          disabled={isRecalculating}
          className="hidden sm:flex items-center space-x-1.5 px-3 py-2 bg-white dark:bg-[#0b101b] border border-slate-300 dark:border-slate-700 hover:border-[#0078d4] text-slate-800 dark:text-slate-100 rounded-xl shadow-lg hover:shadow-xl transition-all cursor-pointer text-xs font-semibold group"
          title="Recalculate with latest FX rates"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#0078d4] ${isRecalculating ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-300'}`} />
          <span className="text-[11px]">Recalculate</span>
        </button>

        {/* Main Floating Trigger Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center space-x-2 px-3 py-2 rounded-xl shadow-xl border transition-all cursor-pointer ${
            isOpen
              ? 'bg-[#003049] text-white border-blue-400 ring-2 ring-blue-500/30'
              : 'bg-[#003049] hover:bg-[#002235] text-white border-slate-700 hover:border-blue-400'
          }`}
          title="Currency Rates"
        >
          <div className="relative">
            <Globe2 className="w-4 h-4 text-sky-400" />
            <span
              className={`absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full ${
                isSimulating ? 'bg-emerald-400 animate-pulse' : 'bg-sky-400'
              }`}
            />
          </div>
          <div className="text-left">
            <div className="flex items-center space-x-1.5 text-xs font-bold leading-tight">
              <span>Currency</span>
              <span className="text-sky-300 font-mono text-[11px]">USD/LKR {lkrRate.toFixed(1)}</span>
            </div>
          </div>
          {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronUp className="w-3.5 h-3.5 text-slate-400" />}
        </button>
      </div>

      {/* 2. SIMPLE FOREIGN CURRENCY CONSOLE */}
      {isOpen && (
        <div className="fixed bottom-16 right-4 z-50 w-[94vw] sm:w-[440px] max-h-[82vh] bg-white dark:bg-[#0d1424] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-2 duration-150">
          {/* Header - Simple words, no descriptions */}
          <div className="px-4 py-3 bg-[#003049] text-white flex items-center justify-between border-b border-blue-900/50">
            <div className="flex items-center space-x-2">
              <Globe2 className="w-4 h-4 text-sky-300" />
              <h3 className="text-xs font-bold text-white tracking-wide">
                Currency Rates
              </h3>
              <span className={`w-2 h-2 rounded-full ${isSimulating ? 'bg-emerald-400 animate-ping' : 'bg-slate-400'}`} title={isSimulating ? 'Live' : 'Static'} />
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Status Message */}
          {statusMessage && (
            <div className="bg-blue-50 dark:bg-blue-950/60 border-b border-blue-200 dark:border-blue-900 px-3.5 py-1.5 text-[11px] text-[#0078d4] dark:text-sky-300 flex items-center justify-between">
              <span>{statusMessage}</span>
              <button
                type="button"
                onClick={() => setStatusMessage(null)}
                className="text-[10px] text-slate-400 hover:underline cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Simple Top Action Strip */}
          <div className="px-4 py-2 bg-slate-50 dark:bg-[#080d19] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="text-xs text-slate-500 font-mono">
              Base: <strong className="text-slate-800 dark:text-slate-200">USD</strong>
            </div>

            <button
              type="button"
              onClick={handleInstantRecalculate}
              disabled={isRecalculating}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#0078d4] hover:bg-[#006cbd] text-white text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRecalculating ? 'animate-spin' : ''}`} />
              <span>{isRecalculating ? 'Recalculating...' : 'Recalculate'}</span>
            </button>
          </div>

          {/* Navigation Tabs - Simple words */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101b] text-xs px-3 pt-1">
            <button
              type="button"
              onClick={() => setActiveTab('rates')}
              className={`px-3 py-2 border-b-2 font-bold cursor-pointer transition-colors ${
                activeTab === 'rates'
                  ? 'border-[#0078d4] text-[#0078d4] dark:text-sky-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Rates ({rates.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('stress-test')}
              className={`px-3 py-2 border-b-2 font-bold cursor-pointer transition-colors ${
                activeTab === 'stress-test'
                  ? 'border-[#0078d4] text-[#0078d4] dark:text-sky-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Stress Test
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('import')}
              className={`px-3 py-2 border-b-2 font-bold cursor-pointer transition-colors ${
                activeTab === 'import'
                  ? 'border-[#0078d4] text-[#0078d4] dark:text-sky-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Import
            </button>
          </div>

          {/* TAB 1: RATES */}
          {activeTab === 'rates' && (
            <div className="p-3 space-y-2.5 overflow-y-auto max-h-[50vh]">
              {/* Controls */}
              <div className="flex items-center justify-between gap-2 pb-1.5">
                <div className="flex items-center space-x-1.5">
                  <button
                    type="button"
                    onClick={handleToggleSimulation}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition-colors cursor-pointer ${
                      isSimulating
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                        : 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                    }`}
                  >
                    {isSimulating ? 'Live' : 'Simulate'}
                  </button>

                  <button
                    type="button"
                    onClick={handleFetchApi}
                    disabled={isFetchingApi}
                    className="flex items-center space-x-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded-md text-xs font-semibold border border-slate-300 dark:border-slate-700 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isFetchingApi ? 'animate-spin' : ''}`} />
                    <span>Sync</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    fxService.resetToDefaults();
                    setRates(fxService.getRates());
                    showStatus('Reset to defaults');
                  }}
                  className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                >
                  Reset
                </button>
              </div>

              {/* Rates Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                  <thead className="bg-slate-50 dark:bg-slate-900/80 text-[10px] text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2 px-3 font-semibold">Currency</th>
                      <th className="py-2 px-2 font-semibold text-right">1 USD =</th>
                      <th className="py-2 px-3 font-semibold text-right">24h</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {rates.map((rate) => {
                      const isUp = rate.change24hPct >= 0;
                      return (
                        <tr key={rate.code} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-2 px-3">
                            <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                              {rate.code}
                            </span>
                            <span className="text-slate-400 text-[10px] ml-1">
                              {rate.symbol}
                            </span>
                          </td>

                          <td className="py-2 px-2 text-right font-mono">
                            {rate.code === 'USD' ? (
                              <span className="text-slate-400 font-semibold">1.00</span>
                            ) : (
                              <input
                                type="number"
                                step={rate.decimals === 0 ? '1' : '0.01'}
                                value={rate.rateToUSD}
                                onChange={(e) => handleRateEdit(rate.code, e.target.value)}
                                className="w-20 text-right bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 text-xs text-slate-900 dark:text-slate-100 font-mono font-semibold focus:outline-none focus:border-[#0078d4]"
                              />
                            )}
                          </td>

                          <td className="py-2 px-3 text-right font-mono">
                            {rate.code === 'USD' ? (
                              <span className="text-slate-400">—</span>
                            ) : (
                              <span
                                className={`text-[11px] font-semibold inline-flex items-center ${
                                  isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'
                                }`}
                              >
                                {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                <span>{isUp ? `+${rate.change24hPct.toFixed(1)}%` : `${rate.change24hPct.toFixed(1)}%`}</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: SCENARIO STRESS TEST - SIMPLE WORDS, ZERO DESCRIPTIONS */}
          {activeTab === 'stress-test' && (
            <div className="p-4 space-y-4 overflow-y-auto max-h-[50vh]">
              {/* Target Currency */}
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Target Currency
                </label>
                <select
                  value={stressCurrency}
                  onChange={(e) => setStressCurrency(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#0078d4]"
                >
                  {rates.filter((r) => r.code !== 'USD').map((r) => (
                    <option key={r.code} value={r.code}>
                      {r.code} - {r.name} (1 USD = {r.rateToUSD})
                    </option>
                  ))}
                </select>
              </div>

              {/* Shift Slider */}
              <div>
                <div className="flex items-center justify-between mb-1.5 text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Rate Shift
                  </span>
                  <span className={`font-mono font-bold ${stressDeltaPct > 0 ? 'text-red-500' : stressDeltaPct < 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
                    {stressDeltaPct > 0 ? `+${stressDeltaPct}%` : `${stressDeltaPct}%`}
                  </span>
                </div>
                <input
                  type="range"
                  min="-30"
                  max="50"
                  step="5"
                  value={stressDeltaPct}
                  onChange={(e) => setStressDeltaPct(Number(e.target.value))}
                  className="w-full cursor-pointer accent-[#0078d4]"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-0.5">
                  <span>-30%</span>
                  <span>0%</span>
                  <span>+50%</span>
                </div>
              </div>

              {/* Simulation Result */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                <span className="text-slate-500">Rate:</span>
                <span className="font-mono font-bold text-[#0078d4] dark:text-sky-300 text-sm">
                  1 USD = {(fxService.getRateValue(stressCurrency) * (1 + stressDeltaPct / 100)).toFixed(2)} {stressCurrency}
                </span>
              </div>

              {/* Actions - Simple words */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleInstantRecalculate}
                  className="flex-1 py-2 px-3 bg-[#0078d4] hover:bg-[#006cbd] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer text-center"
                >
                  Apply
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStressDeltaPct(0);
                    fxService.resetToDefaults();
                    setRates(fxService.getRates());
                    handleInstantRecalculate();
                  }}
                  className="py-2 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer border border-slate-300 dark:border-slate-700"
                >
                  Reset
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: IMPORT - SIMPLE WORDS */}
          {activeTab === 'import' && (
            <form onSubmit={handleImportSubmit} className="p-4 space-y-3 overflow-y-auto max-h-[50vh]">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  CSV or JSON
                </span>
                <button
                  type="button"
                  onClick={handleLoadSampleCSV}
                  className="text-xs text-[#0078d4] hover:underline cursor-pointer"
                >
                  Sample
                </button>
              </div>

              {importError && (
                <div className="p-2 bg-red-50 dark:bg-red-950/60 border border-red-200 rounded-lg text-xs text-red-700 dark:text-red-300">
                  {importError}
                </div>
              )}

              {importSuccess && (
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 rounded-lg text-xs text-emerald-700 dark:text-emerald-300">
                  {importSuccess}
                </div>
              )}

              <textarea
                rows={5}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="USD,1.0&#10;EUR,0.92&#10;LKR,305.25"
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#0078d4]"
              />

              <button
                type="submit"
                className="w-full py-2 bg-[#003049] hover:bg-[#002235] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                Import Rates
              </button>
            </form>
          )}
        </div>
      )}
    </>
  );
};
