import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { PhaseCapacityMetric, ProjectCapacitySummary } from '../utils/capacityCalculation';
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  Users,
  ChevronRight,
  Info,
  Maximize2,
  TrendingUp,
  ShieldAlert,
  Flame
} from 'lucide-react';

interface SubcontractorCapacityBarChartProps {
  capacityData: ProjectCapacitySummary;
  selectedPhaseId?: string | null;
  onSelectPhase?: (phaseId: string | null) => void;
  height?: number;
  highlightCategory?: 'all' | 'over_allocated' | 'near_capacity' | 'within_capacity';
}

export const SubcontractorCapacityBarChart: React.FC<SubcontractorCapacityBarChartProps> = ({
  capacityData,
  selectedPhaseId = null,
  onSelectPhase,
  height = 360,
  highlightCategory = 'all'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const [containerWidth, setContainerWidth] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      return Math.min(window.innerWidth - 64, 850);
    }
    return 750;
  });
  const [hoveredPhase, setHoveredPhase] = useState<PhaseCapacityMetric | null>(null);

  // Dynamic dark-mode detection with observer
  const [isDark, setIsDark] = useState<boolean>(() => {
    return typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  });

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // ResizeObserver for responsive width
  useEffect(() => {
    if (!containerRef.current) return;

    const initialWidth = containerRef.current.clientWidth;
    if (initialWidth > 0) {
      setContainerWidth(initialWidth);
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setContainerWidth(entry.contentRect.width);
        }
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const allPhases = capacityData?.phases || [];

  // Filter or highlight phases based on highlightCategory
  const displayPhases = useMemo(() => {
    if (highlightCategory === 'all') return allPhases;
    return allPhases.filter((p) => {
      if (highlightCategory === 'over_allocated') return p.isOverAllocated || p.statusCategory === 'zero_capacity';
      if (highlightCategory === 'near_capacity') return p.statusCategory === 'near_capacity';
      if (highlightCategory === 'within_capacity') return p.statusCategory === 'within_capacity' && !p.isOverAllocated;
      return true;
    });
  }, [allPhases, highlightCategory]);

  // D3 Chart Rendering Effect
  useEffect(() => {
    if (!svgRef.current || displayPhases.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clean previous render

    // Adjust bottom margin if labels need rotation
    const shouldRotateLabels = (containerWidth / Math.max(1, displayPhases.length)) < 110;
    const margin = {
      top: 36,
      right: 32,
      bottom: shouldRotateLabels ? 78 : 56,
      left: 64
    };

    const width = Math.max(280, containerWidth) - margin.left - margin.right;
    const innerHeight = Math.max(180, height) - margin.top - margin.bottom;

    // Pattern Definition for Over-Capacity Striping
    const defs = svg.append('defs');
    
    // Diagonal stripes for over-capacity section
    const stripePattern = defs.append('pattern')
      .attr('id', 'd3-over-capacity-stripe')
      .attr('patternUnits', 'userSpaceOnUse')
      .attr('width', 8)
      .attr('height', 8)
      .attr('patternTransform', 'rotate(45)');

    stripePattern.append('rect')
      .attr('width', 4)
      .attr('height', 8)
      .attr('fill', 'rgba(255, 255, 255, 0.42)');

    // Subtle drop shadow filter for active elements
    const filter = defs.append('filter')
      .attr('id', 'd3-bar-glow')
      .attr('x', '-10%')
      .attr('y', '-10%')
      .attr('width', '120%')
      .attr('height', '120%');
    filter.append('feDropShadow')
      .attr('dx', '0')
      .attr('dy', '2')
      .attr('stdDeviation', '3')
      .attr('flood-opacity', '0.25');

    // Create main chart group
    const g = svg
      .attr('width', width + margin.left + margin.right)
      .attr('height', innerHeight + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Determine max value for Y scale (accommodates over-allocations with 18% headroom)
    const maxVal = d3.max(displayPhases, (d: PhaseCapacityMetric) => Math.max(d.capacityHours, d.allocatedHours)) || 80;
    const yMax = Math.max(20, Math.ceil(maxVal * 1.20));

    // X0 Scale: Phases
    const x0 = d3
      .scaleBand()
      .domain(displayPhases.map((d) => d.phaseId))
      .range([0, width])
      .paddingInner(displayPhases.length === 1 ? 0.6 : 0.28)
      .paddingOuter(displayPhases.length === 1 ? 0.3 : 0.12);

    // X1 Scale: Sub-bars (Capacity vs Allocated)
    const subCategories = ['capacity', 'allocated'];
    const x1 = d3
      .scaleBand()
      .domain(subCategories)
      .range([0, x0.bandwidth()])
      .padding(0.08);

    // Y Scale: Working Hours
    const y = d3
      .scaleLinear()
      .domain([0, yMax])
      .nice()
      .range([innerHeight, 0]);

    // Color definitions
    const capacityColor = isDark ? '#475569' : '#94a3b8'; // Slate baseline for capacity
    const withinCapacityColor = isDark ? '#10b981' : '#059669'; // Emerald
    const nearCapacityColor = isDark ? '#f59e0b' : '#d97706'; // Amber (90-100%)
    const overAllocatedColor = isDark ? '#ef4444' : '#dc2626'; // Crimson Red (>100%)
    const gridColor = isDark ? 'rgba(51, 65, 85, 0.45)' : 'rgba(226, 232, 240, 0.9)';
    const textColor = isDark ? '#cbd5e1' : '#475569';
    const axisLineColor = isDark ? '#334155' : '#cbd5e1';

    // 1. Horizontal Gridlines
    g.append('g')
      .attr('class', 'gridlines')
      .call(
        d3
          .axisLeft(y)
          .ticks(6)
          .tickSize(-width)
          .tickFormat(() => '')
      )
      .selectAll('line')
      .attr('stroke', gridColor)
      .attr('stroke-dasharray', '3,3');

    g.select('.gridlines').select('.domain').remove();

    // 2. Y-Axis
    const yAxis = g.append('g')
      .attr('class', 'y-axis')
      .call(
        d3
          .axisLeft(y)
          .ticks(6)
          .tickFormat((d) => `${d}h`)
      );

    yAxis.selectAll('text')
      .attr('fill', textColor)
      .attr('font-size', '11px')
      .attr('font-family', 'ui-monospace, monospace');

    yAxis.select('.domain').attr('stroke', axisLineColor);

    // Y-Axis Title Label
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -48)
      .attr('x', -innerHeight / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', textColor)
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .text('Working Hours (hrs)');

    // 3. X-Axis
    const xAxis = g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(
        d3.axisBottom(x0).tickFormat((d) => {
          const match = displayPhases.find((p) => p.phaseId === d);
          return match ? match.phaseName : d;
        })
      );

    const xLabels = xAxis.selectAll('text')
      .attr('fill', (d) => {
        if (selectedPhaseId && d === selectedPhaseId) return '#0284c7';
        return textColor;
      })
      .attr('font-size', '11px')
      .attr('font-weight', (d) => (d === selectedPhaseId ? '700' : '500'))
      .style('cursor', 'pointer')
      .on('click', (_, d) => {
        if (onSelectPhase) {
          onSelectPhase(d === selectedPhaseId ? null : (d as string));
        }
      });

    if (shouldRotateLabels) {
      xLabels
        .attr('transform', 'rotate(-25)')
        .attr('text-anchor', 'end')
        .attr('dx', '-0.5em')
        .attr('dy', '0.6em');
    } else {
      xLabels.attr('dy', '1.1em').attr('text-anchor', 'middle');
    }

    xAxis.select('.domain').attr('stroke', axisLineColor);

    // X-Axis Title Label
    g.append('text')
      .attr('x', width / 2)
      .attr('y', innerHeight + (shouldRotateLabels ? 64 : 44))
      .attr('text-anchor', 'middle')
      .attr('fill', textColor)
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .text('Project Phases');

    // 4. Render Bars per Phase Group
    displayPhases.forEach((phase) => {
      const groupX = x0(phase.phaseId) || 0;
      const phaseG = g.append('g')
        .attr('class', `phase-group phase-${phase.phaseId}`)
        .attr('transform', `translate(${groupX},0)`);

      const isSelected = selectedPhaseId === phase.phaseId;
      const isOverAllocated = phase.isOverAllocated;

      // Color selection for Allocated Bar
      let allocatedBarColor = withinCapacityColor;
      if (phase.statusCategory === 'zero_capacity' || phase.statusCategory === 'over_allocated') {
        allocatedBarColor = overAllocatedColor;
      } else if (phase.statusCategory === 'near_capacity') {
        allocatedBarColor = nearCapacityColor;
      }

      // Dim non-selected groups if one is selected
      if (selectedPhaseId && !isSelected) {
        phaseG.attr('opacity', 0.42);
      }

      // Group Background Clickable Hitbox & hover indicator
      const hoverBg = phaseG.append('rect')
        .attr('width', x0.bandwidth())
        .attr('height', innerHeight)
        .attr('fill', isSelected ? (isDark ? 'rgba(2, 132, 199, 0.12)' : 'rgba(2, 132, 199, 0.06)') : 'transparent')
        .attr('rx', 6)
        .attr('cursor', 'pointer')
        .on('click', () => {
          if (onSelectPhase) {
            onSelectPhase(isSelected ? null : phase.phaseId);
          }
        })
        .on('mouseenter', (event) => {
          handleMouseEnter(event, phase);
          hoverBg.attr('fill', isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)');
        })
        .on('mousemove', handleMouseMove)
        .on('mouseleave', () => {
          handleMouseLeave();
          hoverBg.attr('fill', isSelected ? (isDark ? 'rgba(2, 132, 199, 0.12)' : 'rgba(2, 132, 199, 0.06)') : 'transparent');
        });

      // --- BAR 1: Available Capacity ---
      const capX = x1('capacity') || 0;
      const capBarHeight = Math.max(0, innerHeight - y(phase.capacityHours));
      const capY = y(phase.capacityHours);

      const capRect = phaseG.append('rect')
        .attr('x', capX)
        .attr('y', innerHeight) // Entrance starts at bottom
        .attr('width', x1.bandwidth())
        .attr('height', 0)
        .attr('rx', 4)
        .attr('fill', capacityColor)
        .attr('opacity', 0.88)
        .attr('cursor', 'pointer')
        .on('click', () => {
          if (onSelectPhase) onSelectPhase(isSelected ? null : phase.phaseId);
        })
        .on('mouseenter', (event) => handleMouseEnter(event, phase))
        .on('mousemove', handleMouseMove)
        .on('mouseleave', handleMouseLeave);

      // Smooth entrance transition
      capRect.transition()
        .duration(400)
        .attr('y', capY)
        .attr('height', capBarHeight);

      // Capacity Label on top of Capacity Bar
      if (phase.capacityHours > 0) {
        phaseG.append('text')
          .attr('x', capX + x1.bandwidth() / 2)
          .attr('y', capY - 6)
          .attr('text-anchor', 'middle')
          .attr('fill', textColor)
          .attr('font-size', '10px')
          .attr('font-weight', '600')
          .attr('font-family', 'ui-monospace, monospace')
          .text(`${phase.capacityHours}h`);
      } else {
        phaseG.append('text')
          .attr('x', capX + x1.bandwidth() / 2)
          .attr('y', innerHeight - 6)
          .attr('text-anchor', 'middle')
          .attr('fill', '#94a3b8')
          .attr('font-size', '9px')
          .text('0h');
      }

      // --- BAR 2: Allocated Subcontractor Hours ---
      const allocX = x1('allocated') || 0;
      const allocBarHeight = Math.max(0, innerHeight - y(phase.allocatedHours));
      const allocY = y(phase.allocatedHours);

      const allocRect = phaseG.append('rect')
        .attr('x', allocX)
        .attr('y', innerHeight)
        .attr('width', x1.bandwidth())
        .attr('height', 0)
        .attr('rx', 4)
        .attr('fill', allocatedBarColor)
        .attr('cursor', 'pointer')
        .on('click', () => {
          if (onSelectPhase) onSelectPhase(isSelected ? null : phase.phaseId);
        })
        .on('mouseenter', (event) => handleMouseEnter(event, phase))
        .on('mousemove', handleMouseMove)
        .on('mouseleave', handleMouseLeave);

      allocRect.transition()
        .duration(450)
        .attr('y', allocY)
        .attr('height', allocBarHeight);

      // Over-allocated excess striped section if allocated > capacity
      if (isOverAllocated && phase.capacityHours > 0) {
        const excessHeight = Math.max(0, y(phase.capacityHours) - allocY);
        if (excessHeight > 2) {
          phaseG.append('rect')
            .attr('x', allocX)
            .attr('y', allocY)
            .attr('width', x1.bandwidth())
            .attr('height', excessHeight)
            .attr('rx', 4)
            .attr('fill', 'url(#d3-over-capacity-stripe)')
            .attr('pointer-events', 'none');
        }
      }

      // Allocated Hours Label on top of Allocated Bar
      if (phase.allocatedHours > 0) {
        phaseG.append('text')
          .attr('x', allocX + x1.bandwidth() / 2)
          .attr('y', allocY - 6)
          .attr('text-anchor', 'middle')
          .attr('fill', isOverAllocated ? (isDark ? '#f87171' : '#b91c1c') : (isDark ? '#34d399' : '#047857'))
          .attr('font-size', '10px')
          .attr('font-weight', '700')
          .attr('font-family', 'ui-monospace, monospace')
          .text(`${phase.allocatedHours}h`);
      }

      // Allocation Percentage Label (inside bar if high enough, above if short)
      if (allocBarHeight >= 26) {
        phaseG.append('text')
          .attr('x', allocX + x1.bandwidth() / 2)
          .attr('y', allocY + 16)
          .attr('text-anchor', 'middle')
          .attr('fill', '#ffffff')
          .attr('font-size', '9px')
          .attr('font-weight', '700')
          .attr('font-family', 'ui-monospace, monospace')
          .attr('pointer-events', 'none')
          .text(
            phase.capacityHours > 0
              ? `${phase.utilizationPct.toFixed(0)}%`
              : phase.allocatedHours > 0
              ? 'Exceed'
              : '0%'
          );
      } else if (phase.allocatedHours > 0) {
        phaseG.append('text')
          .attr('x', allocX + x1.bandwidth() / 2)
          .attr('y', allocY - 18)
          .attr('text-anchor', 'middle')
          .attr('fill', allocatedBarColor)
          .attr('font-size', '8.5px')
          .attr('font-weight', '700')
          .attr('font-family', 'ui-monospace, monospace')
          .attr('pointer-events', 'none')
          .text(`${phase.utilizationPct.toFixed(0)}%`);
      }

      // Remaining buffer or Over-allocation indicator tag
      if (phase.isOverAllocated) {
        // Red warning tag for excess
        phaseG.append('text')
          .attr('x', allocX + x1.bandwidth() / 2)
          .attr('y', allocY - 18)
          .attr('text-anchor', 'middle')
          .attr('fill', isDark ? '#f87171' : '#dc2626')
          .attr('font-size', '8px')
          .attr('font-weight', '800')
          .attr('font-family', 'ui-monospace, monospace')
          .attr('pointer-events', 'none')
          .text(`+${phase.overAllocatedHours}h`);
      } else if (phase.remainingHours > 0 && capBarHeight >= 36) {
        // Subtle remaining capacity watermark inside capacity bar
        phaseG.append('text')
          .attr('x', capX + x1.bandwidth() / 2)
          .attr('y', capY + 16)
          .attr('text-anchor', 'middle')
          .attr('fill', isDark ? '#94a3b8' : '#ffffff')
          .attr('font-size', '8.5px')
          .attr('font-weight', '600')
          .attr('font-family', 'ui-monospace, monospace')
          .attr('opacity', 0.85)
          .attr('pointer-events', 'none')
          .text(`${phase.remainingHours}h rem`);
      }
    });

  }, [displayPhases, containerWidth, height, selectedPhaseId, isDark]);

  // Tooltip Mouse Handlers
  const handleMouseEnter = (event: MouseEvent | any, phase: PhaseCapacityMetric) => {
    setHoveredPhase(phase);
    if (!tooltipRef.current) return;
    const tooltip = tooltipRef.current;
    tooltip.style.opacity = '1';
    tooltip.style.display = 'block';
    positionTooltip(event);
  };

  const handleMouseMove = (event: MouseEvent | any) => {
    positionTooltip(event);
  };

  const handleMouseLeave = () => {
    setHoveredPhase(null);
    if (!tooltipRef.current) return;
    tooltipRef.current.style.opacity = '0';
    tooltipRef.current.style.display = 'none';
  };

  const positionTooltip = (event: MouseEvent | any) => {
    if (!tooltipRef.current || !containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const tooltip = tooltipRef.current;

    const mouseX = event.clientX - containerRect.left;
    const mouseY = event.clientY - containerRect.top;

    const tooltipWidth = tooltip.offsetWidth || 280;
    const tooltipHeight = tooltip.offsetHeight || 180;

    let left = mouseX + 16;
    let top = mouseY - 20;

    // Boundary containment
    if (left + tooltipWidth > containerRect.width - 12) {
      left = mouseX - tooltipWidth - 16;
    }
    if (left < 10) left = 10;

    if (top + tooltipHeight > containerRect.height - 10) {
      top = containerRect.height - tooltipHeight - 10;
    }
    if (top < 10) top = 10;

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  };

  if (displayPhases.length === 0) {
    return (
      <div className="py-12 px-4 text-center bg-white dark:bg-[#0b101b] rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400">
        <Users className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
          {highlightCategory !== 'all'
            ? `No phases match the '${highlightCategory.replace('_', ' ')}' filter`
            : 'No phase allocation records available'}
        </h4>
        <p className="text-[11px] text-slate-500 mt-1">
          {highlightCategory !== 'all'
            ? 'Try switching to All Phases to view the full capacity breakdown.'
            : 'This project does not currently have defined phases or subcontractor tasks.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* 1. CHART HEADER & LEGENDS */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800 text-xs">
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-[#0078d4]" />
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Phase Subcontractor Allocation vs. Available Capacity
            </h4>
            <span className="text-[10px] text-slate-400">
              Interactive D3.js visualization comparing working hours against capacity constraints
            </span>
          </div>
        </div>

        {/* Clean Human Legend */}
        <div className="flex flex-wrap items-center gap-3 text-[11px]">
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-xs bg-slate-400 dark:bg-slate-500 shrink-0" />
            <span className="text-slate-600 dark:text-slate-300 font-medium">Capacity Hours</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-xs bg-emerald-600 dark:bg-emerald-500 shrink-0" />
            <span className="text-slate-600 dark:text-slate-300 font-medium">Within Capacity (&lt;90%)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-xs bg-amber-500 shrink-0" />
            <span className="text-slate-600 dark:text-slate-300 font-medium">Near Limit (90-100%)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-xs bg-red-600 shrink-0 relative overflow-hidden">
              <span className="absolute inset-0 bg-white/30 transform rotate-45" />
            </span>
            <span className="text-red-600 dark:text-red-400 font-semibold">Over-Allocated (&gt;100%)</span>
          </div>
        </div>
      </div>

      {/* 2. D3 SVG CHART CANVAS CONTAINER */}
      <div ref={containerRef} className="relative w-full bg-white dark:bg-[#0b101b] rounded-xl overflow-hidden min-h-[260px]">
        <svg ref={svgRef} className="w-full block select-none" />

        {/* 3. INFORMATIVE FLOATING TOOLTIP */}
        <div
          ref={tooltipRef}
          className="absolute pointer-events-none hidden z-30 w-72 bg-white dark:bg-[#0f172a] p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl text-xs text-slate-700 dark:text-slate-200 transition-opacity duration-150"
        >
          {hoveredPhase && (
            <div className="space-y-2">
              <div className="pb-1.5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between">
                <div>
                  <span className="text-[10px] text-[#0078d4] dark:text-sky-400 font-bold font-mono uppercase block">
                    Phase {hoveredPhase.phaseNumber} • {hoveredPhase.status}
                  </span>
                  <h5 className="font-bold text-slate-900 dark:text-slate-100 text-xs mt-0.5 leading-snug">
                    {hoveredPhase.fullPhaseName}
                  </h5>
                </div>
                <span
                  className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase shrink-0 ${
                    hoveredPhase.isOverAllocated
                      ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                      : hoveredPhase.utilizationPct >= 90
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                  }`}
                >
                  {hoveredPhase.utilizationPct.toFixed(1)}% Used
                </span>
              </div>

              {/* Numerical Metrics */}
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="p-1.5 bg-slate-50 dark:bg-slate-900/60 rounded border border-slate-100 dark:border-slate-800">
                  <span className="text-[9px] text-slate-400 uppercase block font-sans">Available Capacity</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{hoveredPhase.capacityHours} hrs</span>
                </div>
                <div className="p-1.5 bg-slate-50 dark:bg-slate-900/60 rounded border border-slate-100 dark:border-slate-800">
                  <span className="text-[9px] text-slate-400 uppercase block font-sans">Allocated Hours</span>
                  <span className={`font-bold ${hoveredPhase.isOverAllocated ? 'text-red-600' : 'text-slate-800 dark:text-slate-200'}`}>
                    {hoveredPhase.allocatedHours} hrs
                  </span>
                </div>
              </div>

              {/* Status Outcome Callout */}
              <div
                className={`p-1.5 rounded text-[10px] font-medium flex items-center space-x-1.5 ${
                  hoveredPhase.isOverAllocated
                    ? 'bg-red-50 text-red-700 dark:bg-red-950/70 dark:text-red-300 border border-red-200 dark:border-red-900'
                    : hoveredPhase.isZeroCapacity
                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-900'
                    : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
                }`}
              >
                {hoveredPhase.isOverAllocated ? (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-600" />
                    <span>⚠️ Over capacity by +{hoveredPhase.overAllocatedHours} hours</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                    <span>✓ {hoveredPhase.remainingHours} hours capacity remaining</span>
                  </>
                )}
              </div>

              {/* Subcontractor Breakdown if any */}
              {hoveredPhase.subcontractorBreakdown.length > 0 && (
                <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 space-y-1">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">
                    Allocated Trades ({hoveredPhase.subcontractorBreakdown.length}):
                  </span>
                  <div className="max-h-24 overflow-y-auto space-y-1">
                    {hoveredPhase.subcontractorBreakdown.map((s, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[10px]">
                        <span className="truncate max-w-[150px] font-medium text-slate-800 dark:text-slate-200">
                          {s.name}
                        </span>
                        <span className="font-mono font-bold text-slate-600 dark:text-slate-300">
                          {s.hours}h (${s.hourlyRate}/h)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
