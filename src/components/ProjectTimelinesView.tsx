import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  Edit2,
  TrendingUp,
  Layers,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Target,
  Flag,
  Package,
  Check,
  Trash2,
  X,
  AlertTriangle,
  FolderGit2,
  Download,
  GripVertical,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { Project, ProjectPhase, ProjectMilestone } from '../types';
import { formatCurrency } from '../utils/currency';

interface ProjectTimelinesViewProps {
  project: Project | null;
  projects?: Project[];
  onSelectProject?: (proj: Project) => void;
  onOpenProjectPicker?: () => void;
  onUpdateProject: (updated: Project) => void;
  onExportPDF: () => void;
}

export const ProjectTimelinesView: React.FC<ProjectTimelinesViewProps> = ({
  project,
  projects = [],
  onSelectProject,
  onOpenProjectPicker,
  onUpdateProject,
  onExportPDF
}) => {
  // View Toggle: Calendar View vs Phase Breakdown Cards vs Split
  const [viewMode, setViewMode] = useState<'calendar' | 'cards' | 'split'>('calendar');

  // Calendar Date Navigation (Default to today: Oct 2026 or project start)
  const defaultYear = 2026;
  const defaultMonth = 9; // October (0-indexed)
  const defaultDay = 15;

  const [calYear, setCalYear] = useState<number>(defaultYear);
  const [calMonth, setCalMonth] = useState<number>(defaultMonth);
  const [selectedDay, setSelectedDay] = useState<number>(defaultDay);

  // Phase modal states
  const [isAddingPhase, setIsAddingPhase] = useState(false);
  const [editingPhaseId, setEditingPhaseId] = useState<string | null>(null);

  // Drag and drop reordering state
  const [draggedPhaseIndex, setDraggedPhaseIndex] = useState<number | null>(null);
  const [dragOverPhaseIndex, setDragOverPhaseIndex] = useState<number | null>(null);

  // Form state for adding/editing phase
  const [phaseName, setPhaseName] = useState('');
  const [phaseDescription, setPhaseDescription] = useState('');
  const [phaseBudget, setPhaseBudget] = useState(50000);
  const [phaseActual, setPhaseActual] = useState(0);
  const [phaseStartDate, setPhaseStartDate] = useState('');
  const [phaseEndDate, setPhaseEndDate] = useState('');
  const [phaseStatus, setPhaseStatus] = useState<'Not Started' | 'In Progress' | 'Completed'>('In Progress');

  // Toast feedback states
  const [icsToast, setIcsToast] = useState<string | null>(null);
  const [reorderToast, setReorderToast] = useState<string | null>(null);

  // Quick Deadline Reschedule Modal
  const [isReschedulingDeadline, setIsReschedulingDeadline] = useState(false);
  const [newProjectDeadline, setNewProjectDeadline] = useState(project?.deliveryDeadline || '2026-12-15');

  // If no project selected, render fallback selector
  if (!project) {
    return (
      <div className="p-8 text-center bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm max-w-lg mx-auto my-12 space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-sky-50 dark:bg-sky-950/50 text-[#0078d4] dark:text-sky-400 mx-auto flex items-center justify-center shadow-2xs">
          <Calendar className="w-7 h-7" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Select Project</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Choose a project to inspect milestones, deadlines, and phase completion schedules.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
          {projects.length > 0 && (
            <select
              defaultValue=""
              onChange={(e) => {
                const found = projects.find(p => p.id === e.target.value);
                if (found && onSelectProject) onSelectProject(found);
              }}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs rounded-xl px-3 py-2 font-semibold text-slate-900 dark:text-slate-100 cursor-pointer"
            >
              <option value="" disabled>Choose a project...</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.code} - {p.name}
                </option>
              ))}
            </select>
          )}
          {onOpenProjectPicker && (
            <button
              type="button"
              onClick={onOpenProjectPicker}
              className="px-4 py-2 bg-[#0078d4] hover:bg-[#006cbd] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Browse Projects
            </button>
          )}
        </div>
      </div>
    );
  }

  // Calculate all milestones for the selected project
  const projectMilestones: ProjectMilestone[] = useMemo(() => {
    const list: ProjectMilestone[] = [];

    // 1. Overall Project Delivery Deadline
    if (project.deliveryDeadline) {
      list.push({
        id: `ms-deadline-${project.id}`,
        projectId: project.id,
        projectCode: project.code,
        projectName: project.name,
        title: `Project Delivery Deadline: ${project.name}`,
        date: project.deliveryDeadline,
        type: 'project_deadline',
        status: project.status === 'Completed' ? 'Completed' : 'In Progress',
        description: `Contractual delivery deadline for client ${project.clientName}. Quoted value: ${formatCurrency(project.quotedPrice, project.currency)}.`
      });
    }

    // 2. Project Kickoff / Start Date
    if (project.startDate) {
      list.push({
        id: `ms-start-${project.id}`,
        projectId: project.id,
        projectCode: project.code,
        projectName: project.name,
        title: `Project Kickoff`,
        date: project.startDate,
        type: 'project_start',
        status: 'Completed',
        description: `Official execution kickoff date.`
      });
    }

    // 3. Phase Completion Dates and Start Dates (Sequenced)
    (project.phases || []).forEach((phase, idx) => {
      // Phase End / Completion Date
      if (phase.endDate) {
        list.push({
          id: `ms-phase-end-${phase.id}`,
          projectId: project.id,
          projectCode: project.code,
          projectName: project.name,
          title: `Phase ${idx + 1}: ${phase.name} (Completion Target)`,
          date: phase.endDate,
          type: 'phase_end',
          phaseId: phase.id,
          phaseName: phase.name,
          status: phase.status === 'Completed' ? 'Completed' : phase.status === 'In Progress' ? 'In Progress' : 'Not Started',
          budget: Number(phase.budget) || 0,
          description: phase.description || `Phase ${idx + 1} completion target. Budget: ${formatCurrency(Number(phase.budget) || 0, project.currency)}.`
        });
      }

      // Phase Start Date
      if (phase.startDate && phase.startDate !== project.startDate) {
        list.push({
          id: `ms-phase-start-${phase.id}`,
          projectId: project.id,
          projectCode: project.code,
          projectName: project.name,
          title: `Phase ${idx + 1}: ${phase.name} (Kickoff)`,
          date: phase.startDate,
          type: 'phase_start',
          phaseId: phase.id,
          phaseName: phase.name,
          status: phase.status === 'Completed' ? 'Completed' : 'In Progress',
          budget: Number(phase.budget) || 0,
          description: `Kickoff and allocation for Phase ${idx + 1}: ${phase.name}.`
        });
      }
    });

    // 4. Deliverables fulfillment dates
    (project.deliverables || []).forEach((deliv) => {
      list.push({
        id: `ms-deliv-${deliv.id}`,
        projectId: project.id,
        projectCode: project.code,
        projectName: project.name,
        title: `Deliverable: ${deliv.name}`,
        date: project.deliveryDeadline,
        type: 'deliverable',
        status: deliv.status === 'Delivered' || deliv.status === 'Completed' ? 'Completed' : 'In Progress',
        budget: deliv.totalCost || 0,
        description: `SKU ${deliv.code || deliv.id} - ${deliv.quantity} ${deliv.unit}. Quoted: ${formatCurrency(deliv.totalRevenue || deliv.quotedPrice, project.currency)}.`
      });
    });

    // Sort chronologically
    return list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [project]);

  // Calendar calculations
  const monthName = useMemo(() => {
    return new Date(calYear, calMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [calYear, calMonth]);

  const handlePrevMonth = () => {
    const newMonth = calMonth === 0 ? 11 : calMonth - 1;
    const newYear = calMonth === 0 ? calYear - 1 : calYear;
    setCalMonth(newMonth);
    setCalYear(newYear);
    const maxDays = new Date(newYear, newMonth + 1, 0).getDate();
    if (selectedDay > maxDays) setSelectedDay(maxDays);
  };

  const handleNextMonth = () => {
    const newMonth = calMonth === 11 ? 0 : calMonth + 1;
    const newYear = calMonth === 11 ? calYear + 1 : calYear;
    setCalMonth(newMonth);
    setCalYear(newYear);
    const maxDays = new Date(newYear, newMonth + 1, 0).getDate();
    if (selectedDay > maxDays) setSelectedDay(maxDays);
  };

  const handleJumpToToday = () => {
    setCalYear(defaultYear);
    setCalMonth(defaultMonth);
    setSelectedDay(defaultDay);
  };

  const handleJumpToDeadline = () => {
    if (!project.deliveryDeadline) return;
    const parts = project.deliveryDeadline.split('-');
    if (parts.length >= 3) {
      const yr = parseInt(parts[0], 10);
      const mo = parseInt(parts[1], 10) - 1;
      const dy = parseInt(parts[2], 10);
      setCalYear(yr);
      setCalMonth(mo);
      setSelectedDay(dy);
    }
  };

  // Calendar grid day matrix
  const calendarCells = useMemo(() => {
    const cells: Array<{
      day: number;
      isCurrentMonth: boolean;
      dateString: string;
      milestones: ProjectMilestone[];
    }> = [];

    const daysInCurrentMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const firstDayIndex = new Date(calYear, calMonth, 1).getDay(); // 0 = Sun
    const prevMonthDays = new Date(calYear, calMonth, 0).getDate();

    // Previous month trailing days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const prevMo = calMonth === 0 ? 11 : calMonth - 1;
      const prevYr = calMonth === 0 ? calYear - 1 : calYear;
      const dateStr = `${prevYr}-${String(prevMo + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const ms = projectMilestones.filter(m => m.date === dateStr);
      cells.push({ day: d, isCurrentMonth: false, dateString: dateStr, milestones: ms });
    }

    // Current month days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const ms = projectMilestones.filter(m => m.date === dateStr);
      cells.push({ day: d, isCurrentMonth: true, dateString: dateStr, milestones: ms });
    }

    // Next month leading days to complete grid (up to 35 or 42)
    const totalCells = cells.length <= 35 ? 35 : 42;
    const remaining = totalCells - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const nextMo = calMonth === 11 ? 0 : calMonth + 1;
      const nextYr = calMonth === 11 ? calYear + 1 : calYear;
      const dateStr = `${nextYr}-${String(nextMo + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const ms = projectMilestones.filter(m => m.date === dateStr);
      cells.push({ day: d, isCurrentMonth: false, dateString: dateStr, milestones: ms });
    }

    return cells;
  }, [calYear, calMonth, projectMilestones]);

  // Selected date ISO string
  const selectedDateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
  const selectedDayMilestones = projectMilestones.filter(m => m.date === selectedDateStr);

  // Financial and Timeline statistics
  const totalPhaseBudget = (project.phases || []).reduce((acc, p) => acc + (Number(p.budget) || 0), 0);
  const totalPhaseActual = (project.phases || []).reduce((acc, p) => acc + (Number(p.actualCost) || 0), 0);
  const totalPhaseVariance = totalPhaseBudget - totalPhaseActual;
  const completedPhasesCount = (project.phases || []).filter(p => p.status === 'Completed').length;

  // Deadline countdown
  const getDaysRemaining = (targetDate: string) => {
    if (!targetDate) return null;
    const diffTime = new Date(targetDate).getTime() - new Date('2026-10-15').getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };
  const deadlineDaysLeft = getDaysRemaining(project.deliveryDeadline);

  // Find next upcoming phase completion
  const nextPhaseCompletion = (project.phases || [])
    .filter(p => p.status !== 'Completed' && new Date(p.endDate).getTime() >= new Date('2026-10-15').getTime())
    .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime())[0];

  // Drag and Drop Phase Reordering Handlers
  const handleDragStart = (index: number, e: React.DragEvent) => {
    setDraggedPhaseIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `${index}`);
  };

  const handleDragOver = (index: number, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverPhaseIndex !== index) {
      setDragOverPhaseIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverPhaseIndex(null);
  };

  const handleDrop = (dropIndex: number, e: React.DragEvent) => {
    e.preventDefault();
    if (draggedPhaseIndex === null || draggedPhaseIndex === dropIndex) {
      setDraggedPhaseIndex(null);
      setDragOverPhaseIndex(null);
      return;
    }

    const currentPhases = [...(project.phases || [])];
    const [draggedItem] = currentPhases.splice(draggedPhaseIndex, 1);
    currentPhases.splice(dropIndex, 0, draggedItem);

    // Update sequence numbers
    const resequencedPhases = currentPhases.map((p, idx) => ({
      ...p,
      phaseNumber: idx + 1
    }));

    onUpdateProject({
      ...project,
      phases: resequencedPhases
    });

    setDraggedPhaseIndex(null);
    setDragOverPhaseIndex(null);
    setReorderToast(`Phase order adjusted: sequence renumbered (1 to ${resequencedPhases.length}) and saved.`);
    setTimeout(() => setReorderToast(null), 3500);
  };

  const handleDragEnd = () => {
    setDraggedPhaseIndex(null);
    setDragOverPhaseIndex(null);
  };

  const handleMovePhase = (currentIndex: number, direction: 'up' | 'down') => {
    const currentPhases = [...(project.phases || [])];
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= currentPhases.length) return;

    const temp = currentPhases[currentIndex];
    currentPhases[currentIndex] = currentPhases[targetIndex];
    currentPhases[targetIndex] = temp;

    const resequencedPhases = currentPhases.map((p, idx) => ({
      ...p,
      phaseNumber: idx + 1
    }));

    onUpdateProject({
      ...project,
      phases: resequencedPhases
    });
    setReorderToast(`Moved "${temp.name}" ${direction === 'up' ? 'earlier' : 'later'} to Phase ${targetIndex + 1}.`);
    setTimeout(() => setReorderToast(null), 3000);
  };

  // Phase Add / Edit Handlers
  const handleSavePhase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phaseName.trim()) return;

    let updatedPhases = [...(project.phases || [])];
    if (editingPhaseId) {
      updatedPhases = updatedPhases.map(p => {
        if (p.id === editingPhaseId) {
          return {
            ...p,
            name: phaseName.trim(),
            description: phaseDescription.trim(),
            budget: Number(phaseBudget) || 0,
            actualCost: Number(phaseActual) || 0,
            startDate: phaseStartDate,
            endDate: phaseEndDate,
            status: phaseStatus
          };
        }
        return p;
      });
    } else {
      const newPhase: ProjectPhase = {
        id: `phase-${Date.now()}`,
        name: phaseName.trim(),
        description: phaseDescription.trim(),
        budget: Number(phaseBudget) || 0,
        actualCost: Number(phaseActual) || 0,
        startDate: phaseStartDate || selectedDateStr,
        endDate: phaseEndDate || selectedDateStr,
        status: phaseStatus,
        phaseNumber: (project.phases?.length || 0) + 1
      };
      updatedPhases.push(newPhase);
    }

    const updatedProject = {
      ...project,
      phases: updatedPhases
    };
    onUpdateProject(updatedProject);
    setIsAddingPhase(false);
    setEditingPhaseId(null);
  };

  const handleTogglePhaseStatus = (phaseId: string) => {
    const updatedPhases = (project.phases || []).map(p => {
      if (p.id === phaseId) {
        const nextStatus = p.status === 'Completed' ? 'In Progress' : 'Completed';
        return { ...p, status: nextStatus };
      }
      return p;
    });
    onUpdateProject({ ...project, phases: updatedPhases });
  };

  const handleDeletePhase = (phaseId: string) => {
    const updatedPhases = (project.phases || []).filter(p => p.id !== phaseId);
    onUpdateProject({ ...project, phases: updatedPhases });
  };

  const openEditPhase = (phase: ProjectPhase) => {
    setEditingPhaseId(phase.id);
    setPhaseName(phase.name);
    setPhaseDescription(phase.description || '');
    setPhaseBudget(phase.budget || 0);
    setPhaseActual(phase.actualCost || 0);
    setPhaseStartDate(phase.startDate);
    setPhaseEndDate(phase.endDate);
    setPhaseStatus(phase.status);
    setIsAddingPhase(true);
  };

  const openNewPhaseForDate = (dateStr?: string) => {
    const targetDate = dateStr || selectedDateStr;
    setEditingPhaseId(null);
    setPhaseName(`Phase ${(project.phases?.length || 0) + 1}: `);
    setPhaseDescription('');
    setPhaseBudget(45000);
    setPhaseActual(0);
    setPhaseStartDate('2026-10-15');
    setPhaseEndDate(targetDate);
    setPhaseStatus('In Progress');
    setIsAddingPhase(true);
  };

  const handleUpdateDeadline = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectDeadline) return;
    onUpdateProject({
      ...project,
      deliveryDeadline: newProjectDeadline
    });
    setIsReschedulingDeadline(false);
  };

  // Export to iCalendar (.ICS) Handler (Full Project or Specific Milestone)
  const handleExportICS = (targetMilestone?: ProjectMilestone) => {
    const nowISO = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    const formatICSDate = (dateStr: string) => {
      // YYYY-MM-DD to YYYYMMDD
      return dateStr.replace(/-/g, '');
    };

    const escapeICS = (str: string) => {
      return (str || '')
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n');
    };

    const events: string[] = [];

    if (targetMilestone) {
      // Export single specific milestone
      const dt = formatICSDate(targetMilestone.date);
      events.push([
        'BEGIN:VEVENT',
        `UID:${targetMilestone.id}-${dt}@costplanning.system`,
        `DTSTAMP:${nowISO}`,
        `DTSTART;VALUE=DATE:${dt}`,
        `SUMMARY:${escapeICS(`[${targetMilestone.type.toUpperCase()}] ${project.code}: ${targetMilestone.title}`)}`,
        `DESCRIPTION:${escapeICS(`${targetMilestone.description || targetMilestone.title}\\nProject: ${project.name}\\nClient: ${project.clientName}\\nStatus: ${targetMilestone.status}`)}`,
        'STATUS:CONFIRMED',
        'CATEGORIES:MILESTONE,PROJECT',
        'END:VEVENT'
      ].join('\r\n'));
    } else {
      // 1. Overall Delivery Deadline
      if (project.deliveryDeadline) {
        const dt = formatICSDate(project.deliveryDeadline);
        events.push([
          'BEGIN:VEVENT',
          `UID:deadline-${project.id}-${dt}@costplanning.system`,
          `DTSTAMP:${nowISO}`,
          `DTSTART;VALUE=DATE:${dt}`,
          `SUMMARY:${escapeICS(`[DEADLINE] ${project.code}: ${project.name}`)}`,
          `DESCRIPTION:${escapeICS(`Project Contract Delivery Deadline for ${project.clientName}.\\nQuoted Value: ${formatCurrency(project.quotedPrice, project.currency)}\\nTarget Margin: ${project.targetMarginPct}%`)}`,
          'STATUS:CONFIRMED',
          'TRANSP:OPAQUE',
          'CATEGORIES:DEADLINE,PROJECT',
          'END:VEVENT'
        ].join('\r\n'));
      }

      // 2. Project Kickoff
      if (project.startDate) {
        const dt = formatICSDate(project.startDate);
        events.push([
          'BEGIN:VEVENT',
          `UID:start-${project.id}-${dt}@costplanning.system`,
          `DTSTAMP:${nowISO}`,
          `DTSTART;VALUE=DATE:${dt}`,
          `SUMMARY:${escapeICS(`[KICKOFF] ${project.code}: ${project.name}`)}`,
          `DESCRIPTION:${escapeICS(`Project Kickoff for ${project.name}. Client: ${project.clientName}`)}`,
          'STATUS:CONFIRMED',
          'CATEGORIES:KICKOFF,PROJECT',
          'END:VEVENT'
        ].join('\r\n'));
      }

      // 3. Phase Completion Targets & Kickoffs
      (project.phases || []).forEach((phase, index) => {
        if (phase.endDate) {
          const dt = formatICSDate(phase.endDate);
          events.push([
            'BEGIN:VEVENT',
            `UID:phase-end-${phase.id}-${dt}@costplanning.system`,
            `DTSTAMP:${nowISO}`,
            `DTSTART;VALUE=DATE:${dt}`,
            `SUMMARY:${escapeICS(`[MILESTONE] ${project.code} Phase ${index + 1}: ${phase.name}`)}`,
            `DESCRIPTION:${escapeICS(`Phase Target Completion.\\nPhase: ${phase.name}\\nScope: ${phase.description || 'N/A'}\\nBudget: ${formatCurrency(Number(phase.budget) || 0, project.currency)}\\nStatus: ${phase.status}`)}`,
            'STATUS:CONFIRMED',
            'CATEGORIES:PHASE,MILESTONE',
            'END:VEVENT'
          ].join('\r\n'));
        }

        if (phase.startDate && phase.startDate !== project.startDate) {
          const dtStart = formatICSDate(phase.startDate);
          events.push([
            'BEGIN:VEVENT',
            `UID:phase-start-${phase.id}-${dtStart}@costplanning.system`,
            `DTSTAMP:${nowISO}`,
            `DTSTART;VALUE=DATE:${dtStart}`,
            `SUMMARY:${escapeICS(`[PHASE START] ${project.code} Phase ${index + 1}: ${phase.name}`)}`,
            `DESCRIPTION:${escapeICS(`Kickoff for Phase ${index + 1}: ${phase.name}.\\nBudget: ${formatCurrency(Number(phase.budget) || 0, project.currency)}`)}`,
            'STATUS:CONFIRMED',
            'CATEGORIES:PHASE,START',
            'END:VEVENT'
          ].join('\r\n'));
        }
      });

      // 4. Deliverables fulfillment targets
      (project.deliverables || []).forEach((deliv) => {
        const dt = formatICSDate(project.deliveryDeadline);
        events.push([
          'BEGIN:VEVENT',
          `UID:deliv-${deliv.id}-${dt}@costplanning.system`,
          `DTSTAMP:${nowISO}`,
          `DTSTART;VALUE=DATE:${dt}`,
          `SUMMARY:${escapeICS(`[DELIVERABLE] ${project.code}: ${deliv.name}`)}`,
          `DESCRIPTION:${escapeICS(`Deliverable fulfillment for ${deliv.name}.\\nSKU: ${deliv.code || deliv.id}\\nQuantity: ${deliv.quantity} ${deliv.unit}\\nQuoted Revenue: ${formatCurrency(deliv.totalRevenue || deliv.quotedPrice, project.currency)}`)}`,
          'STATUS:CONFIRMED',
          'CATEGORIES:DELIVERABLE,PROJECT',
          'END:VEVENT'
        ].join('\r\n'));
      });
    }

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Cost and Planning Database System//Project Milestone Exporter//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${escapeICS(`${project.code} - ${targetMilestone ? targetMilestone.title : 'Milestones'}`)}`,
      `X-WR-TIMEZONE:UTC`,
      ...events,
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = targetMilestone 
      ? `${project.code}_${targetMilestone.type}_${formatICSDate(targetMilestone.date)}.ics`
      : `${project.code}_milestones.ics`;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (link.parentNode) link.parentNode.removeChild(link);
      URL.revokeObjectURL(url);
    }, 300);

    setIcsToast(
      targetMilestone
        ? `Exported "${targetMilestone.title}" to .ICS calendar format.`
        : `${project.code} schedule (${events.length} milestones & deadlines) exported to .ICS. Ready for Google Calendar and Outlook!`
    );
    setTimeout(() => setIcsToast(null), 4500);
  };

  return (
    <div className="space-y-4 font-sans select-none pb-12">
      {/* Toast notifications for ICS export and sequence reordering */}
      {icsToast && (
        <div className="bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between shadow-2xs">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{icsToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setIcsToast(null)}
            className="text-emerald-600 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-200 p-0.5 rounded cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {reorderToast && (
        <div className="bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 text-[#0078d4] dark:text-sky-200 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between shadow-2xs">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-[#0078d4] dark:text-sky-400 shrink-0" />
            <span>{reorderToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setReorderToast(null)}
            className="text-[#0078d4] hover:text-blue-900 dark:text-sky-400 dark:hover:text-sky-200 p-0.5 rounded cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* =========================================================================
          1. PROJECT HEADER & CONTROL STRIP
         ========================================================================= */}
      <div className="bg-white dark:bg-[#0b101b] p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-[#0078d4]/10 dark:bg-sky-950/60 text-[#0078d4] dark:text-sky-400">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-xs font-bold text-[#0078d4] dark:text-sky-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900">
                {project.code}
              </span>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {project.name}
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400 mt-1">
              <span>Client: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{project.clientName}</strong></span>
              <span>•</span>
              <span>Deadline: <strong className="font-mono font-bold text-slate-900 dark:text-slate-200">{project.deliveryDeadline}</strong></span>
              {deadlineDaysLeft !== null && (
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                  deadlineDaysLeft < 0
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                    : deadlineDaysLeft <= 30
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                }`}>
                  {deadlineDaysLeft < 0 ? `${Math.abs(deadlineDaysLeft)}d Overdue` : `${deadlineDaysLeft}d remaining`}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Project Switcher */}
          <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Project:</span>
            <select
              value={project.id}
              onChange={(e) => {
                const found = projects.find(p => p.id === e.target.value);
                if (found && onSelectProject) onSelectProject(found);
              }}
              className="bg-transparent text-xs font-bold text-[#0078d4] dark:text-sky-300 focus:outline-none cursor-pointer max-w-[170px] truncate"
            >
              {projects.map(p => (
                <option key={p.id} value={p.id} className="text-slate-900 bg-white dark:bg-slate-900 dark:text-white">
                  {p.code} - {p.name}
                </option>
              ))}
            </select>
            {onOpenProjectPicker && (
              <button
                type="button"
                onClick={onOpenProjectPicker}
                className="text-xs font-semibold text-[#0078d4] dark:text-sky-400 hover:underline ml-1 cursor-pointer"
              >
                Browse
              </button>
            )}
          </div>

          {/* View Mode Toggle: Calendar vs Cards vs Split */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors flex items-center space-x-1 cursor-pointer ${
                viewMode === 'calendar'
                  ? 'bg-white dark:bg-slate-900 text-[#0078d4] dark:text-sky-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
              title="Milestone Calendar View"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Milestone Calendar</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors flex items-center space-x-1 cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-white dark:bg-slate-900 text-[#0078d4] dark:text-sky-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
              title="Phase List & Sequence Reordering"
            >
              <List className="w-3.5 h-3.5" />
              <span>Phase Sequence</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors flex items-center space-x-1 cursor-pointer ${
                viewMode === 'split'
                  ? 'bg-white dark:bg-slate-900 text-[#0078d4] dark:text-sky-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
              title="Split View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Split</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => openNewPhaseForDate()}
            className="flex items-center space-x-1 px-3 py-1.5 bg-[#0078d4] hover:bg-[#006cbd] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-2xs"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Add Phase</span>
          </button>

          {/* Export to ICS Calendar Button */}
          <button
            type="button"
            onClick={handleExportICS}
            className="flex items-center space-x-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-2xs"
            title="Download iCalendar (.ics) milestone schedule for Google Calendar, Outlook, and Apple Calendar"
          >
            <Download className="w-3.5 h-3.5 text-[#0078d4] dark:text-sky-400" />
            <span>Export to ICS</span>
          </button>

          <button
            type="button"
            onClick={onExportPDF}
            className="flex items-center space-x-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-2xs"
          >
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          2. KEY MILESTONES & SCHEDULE METRICS STRIP
         ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Metric 1: Contract Delivery Deadline */}
        <div className="bg-white dark:bg-[#0b101b] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider flex items-center space-x-1">
              <Target className="w-3.5 h-3.5 text-rose-500" />
              <span>Delivery Deadline</span>
            </div>
            <div className="text-base font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
              {project.deliveryDeadline || 'Not Set'}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {deadlineDaysLeft !== null ? `${deadlineDaysLeft} days remaining` : 'No deadline'}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setNewProjectDeadline(project.deliveryDeadline);
              setIsReschedulingDeadline(true);
            }}
            className="px-2 py-1 text-[11px] font-semibold text-[#0078d4] dark:text-sky-400 hover:bg-blue-50 dark:hover:bg-slate-800 rounded border border-blue-200 dark:border-slate-700 cursor-pointer"
          >
            Reschedule
          </button>
        </div>

        {/* Metric 2: Next Key Phase Completion */}
        <div className="bg-white dark:bg-[#0b101b] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider flex items-center space-x-1">
            <Flag className="w-3.5 h-3.5 text-[#0078d4]" />
            <span>Upcoming Phase Completion</span>
          </div>
          <div className="text-base font-bold font-mono text-slate-900 dark:text-slate-100 mt-1 truncate">
            {nextPhaseCompletion ? nextPhaseCompletion.name : 'All Phases Complete'}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Target: <span className="font-mono font-semibold">{nextPhaseCompletion?.endDate || 'N/A'}</span>
          </div>
        </div>

        {/* Metric 3: Phases Completion Progress */}
        <div className="bg-white dark:bg-[#0b101b] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider flex items-center space-x-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Phases Progress</span>
          </div>
          <div className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            {completedPhasesCount} / {project.phases?.length || 0} Complete
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-1.5 overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{
                width: `${project.phases?.length ? (completedPhasesCount / project.phases.length) * 100 : 0}%`
              }}
            />
          </div>
        </div>

        {/* Metric 4: Planned Phase Budget vs Incurred */}
        <div className="bg-white dark:bg-[#0b101b] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider flex items-center justify-between">
            <span>Budget / Variance</span>
            <span className={`font-mono font-bold ${totalPhaseVariance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {totalPhaseVariance >= 0 ? `+${formatCurrency(totalPhaseVariance, project.currency)}` : `-${formatCurrency(Math.abs(totalPhaseVariance), project.currency)}`}
            </span>
          </div>
          <div className="text-base font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
            {formatCurrency(totalPhaseBudget, project.currency)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Actual Incurred: <span className="font-mono">{formatCurrency(totalPhaseActual, project.currency)}</span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. MAIN INTERACTIVE CONTENT: CALENDAR VIEW & DAY AGENDA
         ========================================================================= */}
      {(viewMode === 'calendar' || viewMode === 'split') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4">
          {/* ===================== LEFT / MAIN: MILESTONE CALENDAR GRID ===================== */}
          <div className={viewMode === 'split' ? 'lg:col-span-7 bg-white dark:bg-[#0b101b] rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs space-y-3.5' : 'lg:col-span-8 bg-white dark:bg-[#0b101b] rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs space-y-3.5'}>
            {/* Calendar Month Navigation Header */}
            <div className="flex flex-wrap items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 gap-2">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300 cursor-pointer transition-colors"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 min-w-[140px] text-center">
                  {monthName}
                </h3>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300 cursor-pointer transition-colors"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Jump Buttons & Legend */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={handleJumpToToday}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold cursor-pointer transition-colors"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={handleJumpToDeadline}
                  className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 text-xs font-semibold cursor-pointer flex items-center space-x-1 transition-colors"
                >
                  <Target className="w-3 h-3 text-rose-600" />
                  <span>Jump to Deadline</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportICS}
                  className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-[#0078d4] dark:text-sky-300 border border-blue-200 dark:border-blue-900 text-xs font-semibold cursor-pointer flex items-center space-x-1 transition-colors"
                  title="Export .ICS for Outlook & Google Calendar"
                >
                  <Download className="w-3 h-3 text-[#0078d4]" />
                  <span>.ICS</span>
                </button>
              </div>
            </div>

            {/* Calendar Legend Bar */}
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
              <span className="font-bold text-slate-500 uppercase text-[10px]">Legend:</span>
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>Delivery Deadline</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-[#0078d4]" />
                <span>Phase Completion</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Phase Kickoff</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                <span>Deliverable</span>
              </span>
            </div>

            {/* Days of Week Header */}
            <div className="grid grid-cols-7 text-center text-[11px] font-bold text-slate-500 dark:text-slate-400 pb-1.5 border-b border-slate-100 dark:border-slate-800">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            {/* Calendar Month Matrix Grid */}
            <div className="grid grid-cols-7 gap-1.5 pt-1 text-center">
              {calendarCells.map((cell, idx) => {
                const isSelected = cell.isCurrentMonth && cell.day === selectedDay;
                const isToday = calYear === defaultYear && calMonth === defaultMonth && cell.day === defaultDay && cell.isCurrentMonth;
                const hasMilestones = cell.milestones.length > 0;
                const hasDeadline = cell.milestones.some(m => m.type === 'project_deadline');
                const hasPhaseEnd = cell.milestones.some(m => m.type === 'phase_end');

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      if (cell.isCurrentMonth) {
                        setSelectedDay(cell.day);
                      } else {
                        const parts = cell.dateString.split('-');
                        setCalYear(parseInt(parts[0], 10));
                        setCalMonth(parseInt(parts[1], 10) - 1);
                        setSelectedDay(cell.day);
                      }
                    }}
                    className={`min-h-[64px] sm:min-h-[76px] p-1.5 rounded-xl border flex flex-col items-stretch justify-between text-left transition-all relative cursor-pointer ${
                      !cell.isCurrentMonth
                        ? 'bg-slate-50/50 dark:bg-slate-900/20 text-slate-400 dark:text-slate-600 border-slate-100 dark:border-slate-800/40'
                        : isSelected
                        ? 'border-[#0078d4] ring-2 ring-[#0078d4]/20 bg-blue-50/40 dark:bg-slate-800'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    } ${isToday ? 'border-amber-400 dark:border-amber-500' : ''}`}
                  >
                    {/* Top Row: Day Number & Today indicator */}
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-mono font-bold ${
                        isSelected
                          ? 'text-[#0078d4] dark:text-sky-300'
                          : cell.isCurrentMonth
                          ? 'text-slate-800 dark:text-slate-200'
                          : 'text-slate-400 dark:text-slate-600'
                      }`}>
                        {cell.day}
                      </span>
                      {isToday && (
                        <span className="text-[9px] px-1 rounded bg-amber-400 text-slate-950 font-bold">
                          Today
                        </span>
                      )}
                    </div>

                    {/* Milestone Badges inside Day Cell */}
                    <div className="space-y-1 mt-1 overflow-hidden">
                      {cell.milestones.slice(0, 2).map((m) => {
                        const isDead = m.type === 'project_deadline';
                        const isEnd = m.type === 'phase_end';
                        const isStart = m.type === 'phase_start';

                        return (
                          <div
                            key={m.id}
                            className={`px-1 py-0.5 rounded text-[9px] font-semibold truncate flex items-center space-x-1 ${
                              isDead
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-200 border border-rose-300 dark:border-rose-800'
                                : isEnd
                                ? 'bg-blue-100 text-[#0078d4] dark:bg-blue-950/80 dark:text-sky-200 border border-blue-200 dark:border-blue-800'
                                : isStart
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
                                : 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-200 border border-purple-200 dark:border-purple-800'
                            }`}
                            title={m.title}
                          >
                            <span>{isDead ? '🎯' : isEnd ? '🏁' : isStart ? '🚀' : '📦'}</span>
                            <span className="truncate">{m.phaseName || m.title}</span>
                          </div>
                        );
                      })}

                      {cell.milestones.length > 2 && (
                        <div className="text-[9px] text-slate-500 font-bold text-right pr-0.5">
                          +{cell.milestones.length - 2} more
                        </div>
                      )}
                    </div>

                    {/* Bottom Status Dot indicator */}
                    {hasMilestones && cell.milestones.length <= 2 && (
                      <div className="flex items-center space-x-1 mt-1">
                        {hasDeadline && <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />}
                        {hasPhaseEnd && <span className="w-1.5 h-1.5 rounded-full bg-[#0078d4]" />}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ===================== RIGHT: DAY AGENDA & MILESTONE INSPECTION DRAWER ===================== */}
          <div className={viewMode === 'split' ? 'lg:col-span-5 bg-white dark:bg-[#0b101b] rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs space-y-3.5 flex flex-col justify-between' : 'lg:col-span-4 bg-white dark:bg-[#0b101b] rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs space-y-3.5 flex flex-col justify-between'}>
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-1.5">
                    <Calendar className="w-4 h-4 text-[#0078d4]" />
                    <span>Day Inspection: {selectedDateStr}</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {selectedDayMilestones.length} milestone(s) active on this date
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => openNewPhaseForDate(selectedDateStr)}
                  className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-[#0078d4] dark:text-sky-300 text-xs font-semibold flex items-center space-x-1 cursor-pointer transition-colors border border-blue-200 dark:border-blue-900"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>+ Milestone</span>
                </button>
              </div>

              {/* Day Milestone Items List */}
              {selectedDayMilestones.length > 0 ? (
                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {selectedDayMilestones.map((m) => {
                    const isDead = m.type === 'project_deadline';
                    const isEnd = m.type === 'phase_end';
                    const isStart = m.type === 'phase_start';
                    const targetPhase = m.phaseId ? (project.phases || []).find(p => p.id === m.phaseId) : null;

                    return (
                      <div
                        key={m.id}
                        className={`p-3 rounded-xl border transition-colors ${
                          isDead
                            ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900'
                            : isEnd
                            ? 'bg-blue-50/60 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900'
                            : isStart
                            ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900'
                            : 'bg-purple-50/60 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-0.5">
                            <span className={`text-[10px] font-bold uppercase px-1.5 py-0.2 rounded ${
                              isDead
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200'
                                : isEnd
                                ? 'bg-blue-100 text-[#0078d4] dark:bg-blue-900 dark:text-sky-200'
                                : isStart
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                                : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                            }`}>
                              {isDead ? 'Project Contract Deadline' : isEnd ? 'Phase Completion Target' : isStart ? 'Phase Kickoff' : 'Deliverable'}
                            </span>
                            <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-1">
                              {m.title}
                            </h5>
                          </div>

                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            m.status === 'Completed'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}>
                            {m.status}
                          </span>
                        </div>

                        {m.description && (
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                            {m.description}
                          </p>
                        )}

                        {m.budget !== undefined && m.budget > 0 && (
                          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-1.5 border-t border-slate-200/60 dark:border-slate-800">
                            <span>Phase Budget:</span>
                            <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                              {formatCurrency(m.budget, project.currency)}
                            </span>
                          </div>
                        )}

                        {/* Quick actions for milestone */}
                        <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-200/60 dark:border-slate-800 text-[11px]">
                          <button
                            type="button"
                            onClick={() => handleExportICS(m)}
                            className="font-semibold text-slate-500 hover:text-[#0078d4] dark:hover:text-sky-400 flex items-center space-x-1 cursor-pointer transition-colors"
                            title="Export this milestone to .ICS calendar"
                          >
                            <Download className="w-3 h-3 text-[#0078d4] dark:text-sky-400" />
                            <span>Export .ICS</span>
                          </button>

                          <div className="flex items-center space-x-2">
                            {targetPhase && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleTogglePhaseStatus(targetPhase.id)}
                                  className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center space-x-1 cursor-pointer"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>{targetPhase.status === 'Completed' ? 'Reopen' : 'Complete'}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openEditPhase(targetPhase)}
                                  className="font-semibold text-[#0078d4] dark:text-sky-400 hover:underline flex items-center space-x-1 cursor-pointer"
                                >
                                  <Edit2 className="w-3 h-3" />
                                  <span>Edit</span>
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                  <Calendar className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                  <div>No milestone deadline falls on this date.</div>
                  <button
                    type="button"
                    onClick={() => openNewPhaseForDate(selectedDateStr)}
                    className="text-xs font-semibold text-[#0078d4] hover:underline cursor-pointer"
                  >
                    + Schedule Phase Due on {selectedDateStr}
                  </button>
                </div>
              )}
            </div>

            {/* Quick Chronological Overview of Next 3 Project Deadlines */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Upcoming Project Milestones:
              </span>
              <div className="space-y-1 text-xs">
                {projectMilestones
                  .filter(m => new Date(m.date).getTime() >= new Date('2026-10-15').getTime())
                  .slice(0, 3)
                  .map((m) => (
                    <div
                      key={m.id}
                      onClick={() => {
                        if (!m.date) return;
                        const parts = m.date.split('-');
                        if (parts.length >= 3) {
                          const y = parseInt(parts[0], 10);
                          const mo = parseInt(parts[1], 10) - 1;
                          const d = parseInt(parts[2], 10);
                          if (!isNaN(y) && !isNaN(mo) && !isNaN(d)) {
                            setCalYear(y);
                            setCalMonth(mo);
                            setSelectedDay(d);
                          }
                        }
                      }}
                      className="p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800 flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate pr-2">
                        {m.title}
                      </span>
                      <span className="font-mono text-[10px] text-[#0078d4] shrink-0 font-bold">
                        {m.date}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          4. PHASE LIST & SEQUENCING (DRAG & DROP REORDERING)
         ========================================================================= */}
      {(viewMode === 'cards' || viewMode === 'split') && (
        <div className="space-y-3 pt-2">
          <div className="flex flex-wrap items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                <Layers className="w-4 h-4 text-[#0078d4]" />
                <span>Phase Breakdown &amp; Sequence Reordering</span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Drag cards by the grip handle or use arrow buttons to reorder phase execution sequences. Changes persist automatically.
              </p>
            </div>
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-slate-500">
                {(project.phases || []).length} phases in sequence
              </span>
              <button
                type="button"
                onClick={handleExportICS}
                className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-[#0078d4] dark:text-sky-300 font-semibold border border-blue-200 dark:border-blue-900 flex items-center space-x-1 cursor-pointer transition-colors"
              >
                <Download className="w-3 h-3" />
                <span>Export .ICS</span>
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            {(project.phases || []).map((phase, idx) => {
              const budget = Number(phase.budget) || 0;
              const actualCost = Number(phase.actualCost) || 0;
              const variance = budget - actualCost;
              const pctUsed = budget > 0 ? (actualCost / budget) * 100 : 0;
              const isUnder = variance >= 0;
              const isBeingDragged = draggedPhaseIndex === idx;
              const isDragTarget = dragOverPhaseIndex === idx && draggedPhaseIndex !== idx;

              return (
                <div
                  key={phase.id}
                  draggable={true}
                  onDragStart={(e) => handleDragStart(idx, e)}
                  onDragOver={(e) => handleDragOver(idx, e)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(idx, e)}
                  onDragEnd={handleDragEnd}
                  className={`bg-white dark:bg-[#0b101b] p-3.5 rounded-xl border transition-all duration-150 shadow-2xs ${
                    isBeingDragged
                      ? 'opacity-40 border-dashed border-[#0078d4] scale-[0.99]'
                      : isDragTarget
                      ? 'border-[#0078d4] ring-2 ring-[#0078d4]/30 bg-blue-50/40 dark:bg-slate-800'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center space-x-2.5">
                      {/* Drag Handle & Sequence Reorder Controls */}
                      <div className="flex items-center space-x-1">
                        <div
                          className="cursor-grab active:cursor-grabbing p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded"
                          title="Drag to reorder sequence"
                        >
                          <GripVertical className="w-4 h-4" />
                        </div>
                        <div
                          className="flex flex-col -space-y-1"
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMovePhase(idx, 'up')}
                            className="p-0.5 text-slate-400 hover:text-[#0078d4] disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                            title="Move Up"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === (project.phases || []).length - 1}
                            onClick={() => handleMovePhase(idx, 'down')}
                            className="p-0.5 text-slate-400 hover:text-[#0078d4] disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                            title="Move Down"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#0078d4]/10 text-[#0078d4] font-bold text-xs shrink-0">
                        {idx + 1}
                      </div>

                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{phase.name}</h4>
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                            phase.status === 'Completed'
                              ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : phase.status === 'In Progress'
                              ? 'bg-blue-50 dark:bg-blue-950 text-[#0078d4] dark:text-sky-300 border border-blue-200 dark:border-blue-800'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                          }`}>
                            {phase.status}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-1">
                          <span className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>{phase.startDate} &rarr; <strong>{phase.endDate}</strong></span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div
                      className="flex items-center space-x-2"
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <div className="text-right mr-1">
                        <div className="text-[11px] text-slate-400">Budget: <span className="font-bold text-slate-900 dark:text-slate-100">${budget.toLocaleString()}</span></div>
                        <div className="text-[11px] text-slate-400">Actual: <span className="font-bold text-[#0078d4] dark:text-sky-400">${actualCost.toLocaleString()}</span></div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const phaseMilestone = projectMilestones.find(m => m.phaseId === phase.id && m.type === 'phase_end');
                          handleExportICS(phaseMilestone);
                        }}
                        className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg text-slate-500 hover:text-[#0078d4] dark:hover:text-sky-400 transition-colors cursor-pointer"
                        title="Export Phase to .ICS"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditPhase(phase)}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                        title="Edit Phase"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePhase(phase.id)}
                        className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Delete Phase"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar & Variance Breakdown */}
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-slate-500">Budget Consumption</span>
                      <span className={`font-semibold ${pctUsed > 100 ? 'text-rose-600' : 'text-slate-700 dark:text-slate-300'}`}>
                        {pctUsed.toFixed(1)}% ({isUnder ? `$${variance.toLocaleString()} remaining` : `$${Math.abs(variance).toLocaleString()} over budget`})
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          pctUsed > 100 ? 'bg-rose-500' : pctUsed > 80 ? 'bg-amber-500' : 'bg-[#0078d4]'
                        }`}
                        style={{ width: `${Math.min(100, pctUsed)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          5. MODALS: ADD/EDIT PHASE MODAL & RESCHEDULE DEADLINE MODAL
         ========================================================================= */}
      {/* ADD / EDIT PHASE MODAL */}
      {isAddingPhase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-2xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {editingPhaseId ? 'Edit Project Phase' : 'Create Project Phase Milestone'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddingPhase(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePhase} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">Phase Name &amp; Scope *</label>
                <input
                  type="text"
                  required
                  value={phaseName}
                  onChange={(e) => setPhaseName(e.target.value)}
                  placeholder="e.g. Phase 2: CNC Precision Machining &amp; Lapping"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#0078d4]"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">Description &amp; Milestone Scope</label>
                <textarea
                  rows={2}
                  value={phaseDescription}
                  onChange={(e) => setPhaseDescription(e.target.value)}
                  placeholder="Details of materials, subcontractor tasks, and deliverables due..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#0078d4]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">Planned Budget ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    required
                    value={phaseBudget}
                    onChange={(e) => setPhaseBudget(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">Actual Incurred ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={phaseActual}
                    onChange={(e) => setPhaseActual(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">Kickoff Date</label>
                  <input
                    type="date"
                    required
                    value={phaseStartDate}
                    onChange={(e) => setPhaseStartDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">Completion Target Date *</label>
                  <input
                    type="date"
                    required
                    value={phaseEndDate}
                    onChange={(e) => setPhaseEndDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">Status</label>
                <select
                  value={phaseStatus}
                  onChange={(e) => setPhaseStatus(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100"
                >
                  <option value="Not Started">Not Started</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddingPhase(false)}
                  className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0078d4] hover:bg-[#006cbd] text-white font-bold rounded-xl shadow-xs cursor-pointer transition-colors"
                >
                  Save Phase
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESCHEDULE OVERALL DELIVERY DEADLINE MODAL */}
      {isReschedulingDeadline && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-2xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <div className="flex items-center space-x-2">
                <Target className="w-5 h-5 text-rose-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Reschedule Project Deadline
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsReschedulingDeadline(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateDeadline} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">
                  Contractual Delivery Deadline
                </label>
                <input
                  type="date"
                  required
                  value={newProjectDeadline}
                  onChange={(e) => setNewProjectDeadline(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 font-mono text-sm"
                />
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                Updating this deadline synchronizes with the project milestone calendar, contract terms, and home command center.
              </p>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsReschedulingDeadline(false)}
                  className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Update Deadline
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
