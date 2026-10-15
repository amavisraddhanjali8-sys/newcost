import type { CSSProperties } from 'react';

export interface TileTheme {
  id: string;
  name: string;
  gradientClass: string;
  bgStyle?: CSSProperties;
  badgeBg: string;
  buttonClass: string;
  previewColor: string;
}

export const TILE_GRADIENT_PRESETS: TileTheme[] = [
  {
    id: 'pacific-sky',
    name: 'Pacific Sky & Ocean',
    gradientClass: 'bg-gradient-to-br from-sky-400 via-blue-600 to-indigo-800',
    badgeBg: 'bg-white/20 text-white border-white/30',
    buttonClass: 'bg-white text-blue-900 hover:bg-slate-100',
    previewColor: '#0284c7'
  },
  {
    id: 'midnight-space',
    name: 'Midnight Cosmic Black',
    gradientClass: 'bg-gradient-to-br from-slate-900 via-slate-950 to-black',
    badgeBg: 'bg-white/15 text-slate-200 border-white/20',
    buttonClass: 'bg-white text-slate-950 hover:bg-slate-100',
    previewColor: '#0f172a'
  },
  {
    id: 'airbus-cobalt',
    name: 'Airbus Aviation Cobalt',
    gradientClass: 'bg-gradient-to-br from-blue-600 via-blue-700 to-blue-950',
    badgeBg: 'bg-white/20 text-white border-white/30',
    buttonClass: 'bg-white text-blue-950 hover:bg-slate-100',
    previewColor: '#1d4ed8'
  },
  {
    id: 'sunset-amber',
    name: 'Sunset Golden Amber',
    gradientClass: 'bg-gradient-to-br from-amber-400 via-orange-500 to-amber-700',
    badgeBg: 'bg-black/15 text-amber-950 border-amber-900/20',
    buttonClass: 'bg-white text-amber-950 hover:bg-slate-100',
    previewColor: '#f59e0b'
  },
  {
    id: 'napa-purple',
    name: 'Royal Grape & Purple',
    gradientClass: 'bg-gradient-to-br from-indigo-500 via-purple-600 to-violet-900',
    badgeBg: 'bg-white/20 text-white border-white/30',
    buttonClass: 'bg-white text-purple-950 hover:bg-slate-100',
    previewColor: '#7c3aed'
  },
  {
    id: 'sense-cyan',
    name: 'Sense Cyan Breeze',
    gradientClass: 'bg-gradient-to-br from-cyan-400 via-sky-500 to-blue-700',
    badgeBg: 'bg-white/20 text-white border-white/30',
    buttonClass: 'bg-white text-sky-950 hover:bg-slate-100',
    previewColor: '#06b6d4'
  },
  {
    id: 'emerald-forest',
    name: 'Emerald Industrial Teal',
    gradientClass: 'bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-950',
    badgeBg: 'bg-white/20 text-white border-white/30',
    buttonClass: 'bg-white text-emerald-950 hover:bg-slate-100',
    previewColor: '#059669'
  },
  {
    id: 'crimson-fire',
    name: 'Crimson Vulcan Flame',
    gradientClass: 'bg-gradient-to-br from-rose-500 via-red-600 to-rose-950',
    badgeBg: 'bg-white/20 text-white border-white/30',
    buttonClass: 'bg-white text-rose-950 hover:bg-slate-100',
    previewColor: '#e11d48'
  },
  {
    id: 'polymer-slate',
    name: 'Polymer Dark Slate',
    gradientClass: 'bg-gradient-to-br from-slate-700 via-slate-800 to-zinc-950',
    badgeBg: 'bg-white/15 text-slate-200 border-white/20',
    buttonClass: 'bg-white text-slate-900 hover:bg-slate-100',
    previewColor: '#334155'
  },
  {
    id: 'warm-terracotta',
    name: 'Warm Sand & Bronze',
    gradientClass: 'bg-gradient-to-br from-amber-600 via-amber-700 to-stone-900',
    badgeBg: 'bg-white/20 text-white border-white/30',
    buttonClass: 'bg-white text-amber-950 hover:bg-slate-100',
    previewColor: '#d97706'
  }
];

export function getThemeById(id?: string): TileTheme {
  if (!id) return TILE_GRADIENT_PRESETS[0];
  const found = TILE_GRADIENT_PRESETS.find(t => t.id === id);
  return found || TILE_GRADIENT_PRESETS[0];
}

export function getRandomThemeIndex(seed: number): TileTheme {
  return TILE_GRADIENT_PRESETS[Math.abs(seed) % TILE_GRADIENT_PRESETS.length];
}
