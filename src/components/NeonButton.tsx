import React from 'react';

export type NeonColor = 'cyan' | 'emerald' | 'indigo' | 'amber' | 'rose' | 'violet' | 'sky' | 'blue' | 'slate';

export interface NeonButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  color?: NeonColor;
  variant?: 'solid' | 'outline' | 'ghost' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  children: React.ReactNode;
  pulseGlow?: boolean;
}

const colorMap: Record<NeonColor, {
  solid: string;
  outline: string;
  secondary: string;
  ghost: string;
}> = {
  slate: {
    solid: 'bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white border-slate-900 shadow-2xs',
    outline: 'border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-400 bg-white shadow-2xs',
    secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200 shadow-2xs',
    ghost: 'border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  },
  blue: {
    solid: 'bg-[#0077b6] hover:bg-[#005f94] active:bg-[#004f7c] text-white border-[#005f94] shadow-2xs',
    outline: 'border-slate-200 text-slate-700 hover:bg-blue-50/70 hover:text-[#0077b6] hover:border-blue-300 bg-white shadow-2xs',
    secondary: 'bg-blue-50 hover:bg-blue-100 text-[#0077b6] border-blue-200 shadow-2xs',
    ghost: 'border-transparent text-[#0077b6] hover:bg-blue-50'
  },
  emerald: {
    solid: 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white border-emerald-700 shadow-2xs',
    outline: 'border-slate-200 text-slate-700 hover:bg-emerald-50/70 hover:text-emerald-800 hover:border-emerald-300 bg-white shadow-2xs',
    secondary: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200 shadow-2xs',
    ghost: 'border-transparent text-emerald-700 hover:bg-emerald-50'
  },
  rose: {
    solid: 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white border-rose-700 shadow-2xs',
    outline: 'border-slate-200 text-slate-700 hover:bg-rose-50/70 hover:text-rose-800 hover:border-rose-300 bg-white shadow-2xs',
    secondary: 'bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-200 shadow-2xs',
    ghost: 'border-transparent text-rose-700 hover:bg-rose-50'
  },
  indigo: {
    solid: 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white border-indigo-700 shadow-2xs',
    outline: 'border-slate-200 text-slate-700 hover:bg-indigo-50/70 hover:text-indigo-800 hover:border-indigo-300 bg-white shadow-2xs',
    secondary: 'bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border-indigo-200 shadow-2xs',
    ghost: 'border-transparent text-indigo-700 hover:bg-indigo-50'
  },
  amber: {
    solid: 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white border-amber-700 shadow-2xs',
    outline: 'border-slate-200 text-slate-700 hover:bg-amber-50/70 hover:text-amber-800 hover:border-amber-300 bg-white shadow-2xs',
    secondary: 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200 shadow-2xs',
    ghost: 'border-transparent text-amber-700 hover:bg-amber-50'
  },
  violet: {
    solid: 'bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white border-purple-700 shadow-2xs',
    outline: 'border-slate-200 text-slate-700 hover:bg-purple-50/70 hover:text-purple-800 hover:border-purple-300 bg-white shadow-2xs',
    secondary: 'bg-purple-50 hover:bg-purple-100 text-purple-800 border-purple-200 shadow-2xs',
    ghost: 'border-transparent text-purple-700 hover:bg-purple-50'
  },
  cyan: {
    solid: 'bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white border-sky-700 shadow-2xs',
    outline: 'border-slate-200 text-slate-700 hover:bg-sky-50/70 hover:text-sky-800 hover:border-sky-300 bg-white shadow-2xs',
    secondary: 'bg-sky-50 hover:bg-sky-100 text-sky-800 border-sky-200 shadow-2xs',
    ghost: 'border-transparent text-sky-700 hover:bg-sky-50'
  },
  sky: {
    solid: 'bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white border-sky-700 shadow-2xs',
    outline: 'border-slate-200 text-slate-700 hover:bg-sky-50/70 hover:text-sky-800 hover:border-sky-300 bg-white shadow-2xs',
    secondary: 'bg-sky-50 hover:bg-sky-100 text-sky-800 border-sky-200 shadow-2xs',
    ghost: 'border-transparent text-sky-700 hover:bg-sky-50'
  }
};

export const NeonButton: React.FC<NeonButtonProps> = ({
  color = 'blue',
  variant = 'outline',
  size = 'sm',
  icon,
  children,
  className = '',
  ...props
}) => {
  const c = colorMap[color] || colorMap.slate;

  const sizeClasses = {
    sm: 'h-8 px-3 text-xs gap-1.5',
    md: 'h-9 px-3.5 text-xs gap-2',
    lg: 'h-10 px-4 text-sm gap-2.5'
  }[size];

  let variantClass = c.outline;
  if (variant === 'solid') variantClass = c.solid;
  else if (variant === 'secondary') variantClass = c.secondary;
  else if (variant === 'ghost') variantClass = c.ghost;

  return (
    <button
      {...props}
      className={`relative inline-flex items-center justify-center font-medium rounded-lg border transition-all duration-150 select-none cursor-pointer active:scale-[0.98] ${sizeClasses} ${variantClass} ${className}`}
    >
      {icon && <span className="shrink-0 flex items-center">{icon}</span>}
      <span className="whitespace-nowrap leading-none">{children}</span>
    </button>
  );
};

export const FineButton = NeonButton;

