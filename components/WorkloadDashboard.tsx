import React, { useState, useMemo } from 'react';
import { Project, StaffMember, Role, Task } from '../types';
import { formatHrsMM } from '../utils/emailDispatcher';
import { 
  Users, Target, Search, Filter, CheckCircle2, Clock, 
  AlertCircle, ArrowRight, RefreshCw, Briefcase, ChevronRight, 
  Check, UserCheck, ShieldAlert, Sparkles, SlidersHorizontal, 
  Layers, BarChart2, ArrowUpRight, Flame, ShieldCheck, Zap
} from 'lucide-react';

interface WorkloadDashboardProps {
  projects: Project[];
  staffList: StaffMember[];
  currentUser: StaffMember;
  onUpdateProject: (updatedProject: Project) => void;
  onAddNotification?: (notif: any) => void;
  onSelectProject?: (project: Project) => void;
}

interface EnrichedTask extends Task {
  projectId: string;
  projectName: string;
  projectJobNumber: string;
  projectClient: string;
  stepId: number;
  stepTitle: string;
}

const WorkloadDashboard: React.FC<WorkloadDashboardProps> = ({
  projects,
  staffList,
  currentUser,
  onUpdateProject,
  onAddNotification,
  onSelectProject
}) => {
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL');
  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  
  // Reallocation Modal State
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [taskToReassign, setTaskToReassign] = useState<EnrichedTask | null>(null);
  const [currentAssigneeId, setCurrentAssigneeId] = useState<string | null>(null);
  const [targetStaffId, setTargetStaffId] = useState<string>('');
  const [reassignNote, setReassignNote] = useState<string>('');
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Role permissions: Only AE, Managers, Admins, Super Admins, General Managers can access
  const normRole = (currentUser.role || '').toLowerCase();
  const isSuperAdmin = normRole === 'super admin' || currentUser.role === Role.SUPER_ADMIN;
  const isAdmin = isSuperAdmin || normRole === 'admin' || currentUser.role === Role.ADMIN;
  const isGM = normRole === 'general manager' || normRole === 'gm' || currentUser.role === Role.GM;
  const isManager = normRole === 'management' || currentUser.role === Role.MANAGEMENT || normRole.includes('lead') || normRole.includes('manager');
  const isAE = normRole === 'account executive' || currentUser.role === Role.AE;
  const hasAccess = isSuperAdmin || isAdmin || isGM || isManager || isAE || !!currentUser.permissions?.canViewWorkload;

  // Flatten all tasks across all projects with project context (including sub-steps)
  const allProjectTasks = useMemo(() => {
    const list: EnrichedTask[] = [];
    (projects || []).forEach(project => {
      (project.steps || []).forEach(step => {
        const stepTasks = [...(step.tasks || []), ...(step.subSteps?.flatMap(ss => ss.tasks) || [])];
        stepTasks.forEach(task => {
          const isTaskCompleted = !!(project.tasksCompleted && project.tasksCompleted[task.id]) || task.completed;
          list.push({
            ...task,
            completed: isTaskCompleted,
            projectId: project.id,
            projectName: project.projectName,
            projectJobNumber: project.jobNumber,
            projectClient: project.clientName,
            stepId: step.id,
            stepTitle: step.title
          });
        });
      });
    });
    return list;
  }, [projects]);

  // Aggregate stats per staff member
  const staffWorkloadStats = useMemo(() => {
    return (staffList || []).map(staff => {
      // Direct tasks assigned explicitly to staff.id or matching their specific role
      const assignedTasks = allProjectTasks.filter(t => 
        t.assignedTo === staff.id || (!t.assignedTo && t.role === staff.role)
      );

      const activeTasks = assignedTasks.filter(t => !t.completed);
      const completedTasks = assignedTasks.filter(t => t.completed);
      const totalHoursAllocated = activeTasks.reduce((sum, t) => sum + (t.timeAllocated || 60), 0) / 60;
      const totalHoursSpent = assignedTasks.reduce((sum, t) => sum + (t.timeSpent || 0), 0) / 3600;

      // Bandwidth status
      // 0-2 tasks: Light / Available
      // 3-5 tasks: Optimal / Balanced
      // 6+ tasks: High / Overloaded
      let bandwidthStatus: 'AVAILABLE' | 'BALANCED' | 'OVERLOADED';
      if (activeTasks.length >= 5) {
        bandwidthStatus = 'OVERLOADED';
      } else if (activeTasks.length >= 2) {
        bandwidthStatus = 'BALANCED';
      } else {
        bandwidthStatus = 'AVAILABLE';
      }

      return {
        staff,
        assignedTasks,
        activeTasks,
        completedTasks,
        totalTasksCount: assignedTasks.length,
        activeTasksCount: activeTasks.length,
        completedTasksCount: completedTasks.length,
        totalHoursAllocated: Math.round(totalHoursAllocated * 10) / 10,
        totalHoursSpent: Math.round(totalHoursSpent * 10) / 10,
        bandwidthStatus
      };
    });
  }, [staffList, allProjectTasks]);

  // Filtered staff list
  const filteredStaffStats = useMemo(() => {
    return staffWorkloadStats.filter(({ staff, assignedTasks }) => {
      // Role filter
      if (selectedRoleFilter !== 'ALL') {
        const staffRoleLower = (staff.role || '').toLowerCase();
        if (selectedRoleFilter === 'DESIGNERS' && !staffRoleLower.includes('design')) return false;
        if (selectedRoleFilter === 'COPYWRITERS' && !staffRoleLower.includes('copy')) return false;
        if (selectedRoleFilter === 'AE' && !staffRoleLower.includes('executive') && staff.role !== Role.AE) return false;
        if (selectedRoleFilter === 'MANAGEMENT' && !staffRoleLower.includes('manage') && !staffRoleLower.includes('lead') && staff.role !== Role.MANAGEMENT) return false;
        if (selectedRoleFilter === 'PRODUCTION' && !staffRoleLower.includes('production') && !staffRoleLower.includes('editor') && !staffRoleLower.includes('camera')) return false;
      }

      // Department filter
      if (selectedDepartmentFilter !== 'ALL' && staff.department !== selectedDepartmentFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesStaff = staff.name.toLowerCase().includes(q) || 
                             staff.role.toLowerCase().includes(q) || 
                             staff.department.toLowerCase().includes(q);
        const matchesTask = assignedTasks.some(t => 
          t.text.toLowerCase().includes(q) || 
          t.projectName.toLowerCase().includes(q) ||
          t.projectJobNumber.toLowerCase().includes(q)
        );
        if (!matchesStaff && !matchesTask) return false;
      }

      return true;
    });
  }, [staffWorkloadStats, selectedRoleFilter, selectedDepartmentFilter, searchQuery]);

  // Overall metrics
  const totalActiveTasksCount = useMemo(() => 
    staffWorkloadStats.reduce((sum, s) => sum + s.activeTasksCount, 0), 
    [staffWorkloadStats]
  );
  
  const overloadedCount = useMemo(() => 
    staffWorkloadStats.filter(s => s.bandwidthStatus === 'OVERLOADED').length, 
    [staffWorkloadStats]
  );

  const availableCount = useMemo(() => 
    staffWorkloadStats.filter(s => s.bandwidthStatus === 'AVAILABLE').length, 
    [staffWorkloadStats]
  );

  // Creative focus: Designers and Copywriters side-by-side stats for quick balancing
  const creativeSwarmStats = useMemo(() => {
    const designers = staffWorkloadStats.filter(s => (s.staff.role || '').toLowerCase().includes('design'));
    const copywriters = staffWorkloadStats.filter(s => (s.staff.role || '').toLowerCase().includes('copy'));
    return { designers, copywriters };
  }, [staffWorkloadStats]);

  // Handle task reallocation
  const handleOpenReassignModal = (task: EnrichedTask, fromStaffId?: string) => {
    setTaskToReassign(task);
    setCurrentAssigneeId(fromStaffId || task.assignedTo || null);
    setTargetStaffId('');
    setReassignNote('');
    setReassignModalOpen(true);
  };

  const handleConfirmReassign = () => {
    if (!taskToReassign || !targetStaffId) return;

    const targetStaff = staffList.find(s => s.id === targetStaffId);
    if (!targetStaff) return;

    const projectToUpdate = projects.find(p => p.id === taskToReassign.projectId);
    if (!projectToUpdate) return;

    // Update the task assignedTo in the project's step tasks
    const updatedSteps = projectToUpdate.steps.map(step => {
      if (step.id !== taskToReassign.stepId) return step;
      return {
        ...step,
        tasks: step.tasks.map(t => {
          if (t.id !== taskToReassign.id) return t;
          return {
            ...t,
            assignedTo: targetStaffId,
            notes: reassignNote.trim() 
              ? `${t.notes ? t.notes + ' | ' : ''}Reassigned to ${targetStaff.name}: ${reassignNote.trim()}`
              : t.notes
          };
        })
      };
    });

    const updatedProject: Project = {
      ...projectToUpdate,
      steps: updatedSteps,
      lastUpdated: new Date()
    };

    onUpdateProject(updatedProject);

    // Notify new assignee
    if (onAddNotification) {
      onAddNotification({
        id: `notif-${Date.now()}`,
        userId: targetStaffId,
        text: `WORKLOAD BALANCED: You have been assigned to task "${taskToReassign.text}" on project ${projectToUpdate.projectName} by ${currentUser.name}.`,
        type: 'assignment',
        read: false,
        timestamp: new Date(),
        link: 'workload'
      });
    }

    setFeedbackToast(`Task successfully reallocated to ${targetStaff.name}. Workload matrix updated.`);
    setTimeout(() => setFeedbackToast(null), 4000);

    setReassignModalOpen(false);
    setTaskToReassign(null);
  };

  if (!hasAccess) {
    return (
      <div className="max-w-xl mx-auto my-16 p-8 bg-[#0e0f14] border border-rose-500/40 rounded-sm text-center space-y-4 animate-in fade-in">
        <ShieldAlert size={48} className="text-rose-500 mx-auto" />
        <h2 className="text-xl font-black uppercase text-white font-heading">
          Workload Management Restricted
        </h2>
        <p className="font-mono text-xs text-neutral-400 leading-relaxed">
          The Workload & Capacity Balancer is restricted exclusively to Account Executives (AE), Department Managers, General Managers, and Administrators. You do not have clearance to view team-wide task matrices or balance personnel workload.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-[1700px] mx-auto space-y-8 animate-in fade-in duration-300">
      
      {/* Toast Feedback */}
      {feedbackToast && (
        <div className="fixed bottom-6 right-6 z-[250] bg-emerald-950 border border-emerald-500 text-white px-5 py-3 rounded-sm shadow-2xl font-mono text-xs flex items-center gap-3 animate-in slide-in-from-bottom-2">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* Header Banner - Liquid Glass */}
      <div className="liquid-glass-card hud-frame rounded-sm p-8 sm:p-10 relative overflow-hidden shadow-[0_0_40px_-10px_rgba(var(--jarvis-primary-rgb),0.2)]">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="font-mono text-[10px] text-[var(--jarvis-primary)] uppercase tracking-[0.25em] mb-2 flex items-center gap-2">
              <Target size={13} className="text-[var(--jarvis-primary)]" />
              <span>CAPACITY COORDINATOR // RESOURCE ALLOCATION // JARVIS MATRIX</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight font-heading">
              WORKLOAD <span className="text-[var(--jarvis-primary)] hud-glow-text">DASHBOARD</span>
            </h1>
            <p className="text-neutral-300 text-xs font-mono uppercase tracking-wider mt-2.5 max-w-2xl leading-relaxed">
              Real-time individual task distribution, copywriter & designer capacity balancing, and agile reallocation protocols.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="px-5 py-3 bg-black/50 border border-[var(--jarvis-border)] rounded-sm font-mono text-left shadow-[0_0_12px_rgba(var(--jarvis-primary-rgb),0.15)]">
              <div className="text-[9px] text-[var(--jarvis-primary)] uppercase tracking-widest font-bold">ACTIVE DIRECTIVES</div>
              <div className="text-2xl font-black text-white leading-none mt-1 font-mono">{totalActiveTasksCount}</div>
            </div>

            <div className="px-5 py-3 bg-black/50 border border-rose-500/40 rounded-sm font-mono text-left shadow-[0_0_12px_rgba(244,63,94,0.2)]">
              <div className="text-[9px] text-rose-400 uppercase tracking-widest flex items-center gap-1 font-bold">
                <Flame size={10} /> HEAVY LOAD
              </div>
              <div className="text-2xl font-black text-rose-400 leading-none mt-1 font-mono">{overloadedCount}</div>
            </div>

            <div className="px-5 py-3 bg-black/50 border border-emerald-500/40 rounded-sm font-mono text-left shadow-[0_0_12px_rgba(16,185,129,0.2)]">
              <div className="text-[9px] text-emerald-400 uppercase tracking-widest flex items-center gap-1 font-bold">
                <Zap size={10} /> AVAILABLE
              </div>
              <div className="text-2xl font-black text-emerald-400 leading-none mt-1 font-mono">{availableCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* SPECIAL BALANCING RADAR: Copywriters vs Designers */}
      <div className="liquid-glass-card border border-[var(--jarvis-border)] rounded-sm p-6 space-y-4 shadow-[0_0_20px_-5px_rgba(var(--jarvis-primary-rgb),0.12)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--jarvis-border)] pb-3">
          <div className="flex items-center gap-2.5">
            <Sparkles size={16} className="text-emerald-400" />
            <h3 className="font-mono text-xs uppercase tracking-[0.25em] text-white font-bold">
              CREATIVE & EDITORIAL CAPACITY RADAR // COPYWRITERS & DESIGNERS
            </h3>
          </div>
          <span className="font-mono text-[10px] text-neutral-400 uppercase">
            RAPID WORKLOAD REBALANCING SHORTCUT
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Designers Column */}
          <div className="p-4 bg-[#0e1017] border border-indigo-950/60 rounded-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-wider text-indigo-300 font-bold flex items-center gap-2">
                <Layers size={13} className="text-indigo-400" />
                DESIGN SWARM ({creativeSwarmStats.designers.length} SPECIALISTS)
              </span>
              <span className="text-[10px] font-mono text-neutral-400">
                {creativeSwarmStats.designers.reduce((s, d) => s + d.activeTasksCount, 0)} TOTAL TASKS
              </span>
            </div>

            <div className="space-y-2">
              {creativeSwarmStats.designers.length === 0 ? (
                <div className="py-4 text-center text-xs font-mono text-neutral-500">No designers configured</div>
              ) : (
                creativeSwarmStats.designers.map(d => (
                  <div 
                    key={d.staff.id} 
                    className="p-3 bg-[#12141e] border border-neutral-800 rounded-sm flex items-center justify-between gap-3 hover:border-neutral-700 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img src={d.staff.avatarUrl} alt="" className="w-8 h-8 rounded-sm object-cover border border-neutral-700 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white uppercase truncate font-mono">{d.staff.name}</div>
                        <div className="text-[9px] font-mono text-neutral-400">{d.staff.staffId} // {d.staff.role}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right font-mono">
                        <div className="text-xs font-black text-white">{d.activeTasksCount} ACTIVE</div>
                        <div className="text-[9px] text-neutral-400">{d.totalHoursAllocated}h ALLOCATED</div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-xs font-mono text-[9px] uppercase border ${
                        d.bandwidthStatus === 'OVERLOADED' ? 'bg-rose-950/80 text-rose-300 border-rose-800' :
                        d.bandwidthStatus === 'BALANCED' ? 'bg-amber-950/80 text-amber-300 border-amber-800' :
                        'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                      }`}>
                        {d.bandwidthStatus}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Copywriters Column */}
          <div className="p-4 bg-[#0e1017] border border-emerald-950/60 rounded-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-wider text-emerald-300 font-bold flex items-center gap-2">
                <Briefcase size={13} className="text-emerald-400" />
                COPYWRITING SWARM ({creativeSwarmStats.copywriters.length} SPECIALISTS)
              </span>
              <span className="text-[10px] font-mono text-neutral-400">
                {creativeSwarmStats.copywriters.reduce((s, c) => s + c.activeTasksCount, 0)} TOTAL TASKS
              </span>
            </div>

            <div className="space-y-2">
              {creativeSwarmStats.copywriters.length === 0 ? (
                <div className="py-4 text-center text-xs font-mono text-neutral-500">No copywriters configured</div>
              ) : (
                creativeSwarmStats.copywriters.map(c => (
                  <div 
                    key={c.staff.id} 
                    className="p-3 bg-[#12141e] border border-neutral-800 rounded-sm flex items-center justify-between gap-3 hover:border-neutral-700 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img src={c.staff.avatarUrl} alt="" className="w-8 h-8 rounded-sm object-cover border border-neutral-700 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white uppercase truncate font-mono">{c.staff.name}</div>
                        <div className="text-[9px] font-mono text-neutral-400">{c.staff.staffId} // {c.staff.role}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right font-mono">
                        <div className="text-xs font-black text-white">{c.activeTasksCount} ACTIVE</div>
                        <div className="text-[9px] text-neutral-400">{c.totalHoursAllocated}h ALLOCATED</div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-xs font-mono text-[9px] uppercase border ${
                        c.bandwidthStatus === 'OVERLOADED' ? 'bg-rose-950/80 text-rose-300 border-rose-800' :
                        c.bandwidthStatus === 'BALANCED' ? 'bg-amber-950/80 text-amber-300 border-amber-800' :
                        'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                      }`}>
                        {c.bandwidthStatus}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'ALL', label: 'ALL TEAM' },
            { id: 'DESIGNERS', label: 'DESIGNERS' },
            { id: 'COPYWRITERS', label: 'COPYWRITERS' },
            { id: 'AE', label: 'ACCOUNT EXECS' },
            { id: 'MANAGEMENT', label: 'MANAGEMENT' },
            { id: 'PRODUCTION', label: 'PRODUCTION' }
          ].map(btn => (
            <button
              key={btn.id}
              onClick={() => setSelectedRoleFilter(btn.id)}
              className={`px-3 py-2 font-mono text-[10px] uppercase rounded-xs transition-all cursor-pointer ${
                selectedRoleFilter === btn.id
                  ? 'bg-white text-black font-black shadow-md'
                  : 'bg-[#0a0b0e] border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[280px]">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input 
              type="text" 
              placeholder="SEARCH PERSONNEL OR TASK TEXT..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#0a0b0e] border border-neutral-800 focus:border-white font-mono text-xs text-white uppercase outline-none rounded-sm transition-colors placeholder:text-neutral-600"
            />
          </div>

          <select
            value={selectedDepartmentFilter}
            onChange={e => setSelectedDepartmentFilter(e.target.value)}
            className="px-3 py-2 bg-[#0a0b0e] border border-neutral-800 text-neutral-300 font-mono text-xs uppercase rounded-sm outline-none cursor-pointer"
          >
            <option value="ALL">ALL DEPARTMENTS</option>
            {Array.from(new Set(staffList.map(s => s.department))).filter(Boolean).map(dept => (
              <option key={dept} value={dept}>{dept.toUpperCase()}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Individual Staff Workload Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredStaffStats.map(({ staff, activeTasks, completedTasks, totalTasksCount, activeTasksCount, completedTasksCount, totalHoursAllocated, bandwidthStatus }) => {
          const isSelected = selectedStaffId === staff.id;
          const completionPercentage = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

          return (
            <div 
              key={staff.id}
              className={`bg-[#0a0b0e] border rounded-sm p-6 flex flex-col justify-between transition-all ${
                isSelected 
                  ? 'border-white shadow-xl bg-[#0c0e14]' 
                  : 'border-neutral-800 hover:border-neutral-700'
              }`}
            >
              <div>
                {/* Staff Identity Header */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <img 
                      src={staff.avatarUrl} 
                      alt={staff.name} 
                      className="w-12 h-12 rounded-sm object-cover border border-neutral-700 shrink-0" 
                    />
                    <div className="min-w-0">
                      <div className="font-heading font-black text-sm uppercase text-white truncate">
                        {staff.name}
                      </div>
                      <div className="font-mono text-[10px] text-neutral-400 truncate mt-0.5">
                        {staff.staffId} // {staff.department}
                      </div>
                      <span className="inline-block mt-1 font-mono text-[9px] uppercase px-1.5 py-0.2 bg-[#12141c] border border-neutral-700/80 text-neutral-300 rounded-xs">
                        {staff.role}
                      </span>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded-xs font-mono text-[9px] font-bold uppercase border shrink-0 ${
                    bandwidthStatus === 'OVERLOADED' 
                      ? 'bg-rose-950/80 text-rose-400 border-rose-800' 
                      : bandwidthStatus === 'BALANCED' 
                      ? 'bg-amber-950/80 text-amber-300 border-amber-800' 
                      : 'bg-emerald-950/80 text-emerald-400 border-emerald-800'
                  }`}>
                    {bandwidthStatus}
                  </span>
                </div>

                {/* Capacity & Progress Bar */}
                <div className="p-3 bg-[#11131a] border border-neutral-800/80 rounded-xs space-y-2 mb-4 font-mono text-[10px]">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-400">ACTIVE WORKLOAD:</span>
                    <strong className="text-white font-bold">{activeTasksCount} TASKS ({totalHoursAllocated}h)</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-400">COMPLETED:</span>
                    <span className="text-neutral-300">{completedTasksCount} / {totalTasksCount} ({completionPercentage}%)</span>
                  </div>
                  <div className="w-full bg-[#181a24] h-1.5 rounded-none overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        bandwidthStatus === 'OVERLOADED' ? 'bg-rose-500' :
                        bandwidthStatus === 'BALANCED' ? 'bg-amber-400' : 'bg-emerald-400'
                      }`}
                      style={{ width: `${Math.max(5, completionPercentage)}%` }}
                    />
                  </div>
                </div>

                {/* Individual Tasks List */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-wider text-neutral-400 border-b border-neutral-800 pb-1">
                    <span>INDIVIDUAL TASK QUEUE ({activeTasks.length})</span>
                    <span className="text-neutral-500">PHASE // JOB</span>
                  </div>

                  {activeTasks.length === 0 ? (
                    <div className="py-6 text-center text-neutral-500 font-mono text-xs uppercase tracking-wider">
                      Zero active assignments. Bandwidth open.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                      {activeTasks.map(task => (
                        <div 
                          key={`${task.projectId}-${task.id}`}
                          className="p-3 bg-[#13151e] border border-neutral-800/80 hover:border-neutral-700 rounded-xs transition-colors flex flex-col justify-between gap-2"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 font-mono text-[9px] text-neutral-400 mb-1">
                              <span className="text-neutral-300 font-bold truncate max-w-[150px]">
                                {task.projectJobNumber}
                              </span>
                              <span className="text-neutral-500 truncate">
                                {task.stepTitle}
                              </span>
                            </div>

                            <div className="text-xs font-semibold text-white leading-snug">
                              {task.text}
                            </div>
                            
                            <div className="font-mono text-[9px] text-neutral-400 mt-1 flex items-center justify-between">
                              <span className="truncate max-w-[180px]">Client: {task.projectClient}</span>
                              <span className="text-amber-300 font-bold">EST {formatHrsMM(task.timeAllocated)} Hrs</span>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-neutral-800/70 flex items-center justify-between gap-2">
                            {onSelectProject && (
                              <button
                                type="button"
                                onClick={() => {
                                  const project = projects.find(p => p.id === task.projectId);
                                  if (project) onSelectProject(project);
                                }}
                                className="font-mono text-[9px] text-neutral-400 hover:text-white uppercase flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                View Brief <ArrowUpRight size={10} />
                              </button>
                            )}

                            {/* Rebalance Button */}
                            <button
                              type="button"
                              onClick={() => handleOpenReassignModal(task, staff.id)}
                              className="px-2 py-1 bg-white hover:bg-neutral-200 text-black font-mono text-[9px] font-bold uppercase rounded-xs transition-colors flex items-center gap-1 cursor-pointer ml-auto"
                              title="Reallocate this task to balance workload"
                            >
                              <RefreshCw size={9} /> Reassign
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer */}
              <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center justify-between font-mono text-[9px] text-neutral-400">
                <span>STATUS: {bandwidthStatus === 'OVERLOADED' ? 'ACTION RECOMMENDED' : 'HEALTHY'}</span>
                <span>{staff.email}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Reallocation Modal */}
      {reassignModalOpen && taskToReassign && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#0e0f14] border border-neutral-800 w-full max-w-lg rounded-sm p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <div className="font-mono text-[9px] text-neutral-400 uppercase tracking-widest">
                  AGILE RESOURCE SHIFT // CAPACITY OPTIMIZER
                </div>
                <h3 className="text-base font-black uppercase text-white font-heading mt-0.5">
                  Reallocate Project Directive
                </h3>
              </div>
              <button 
                onClick={() => setReassignModalOpen(false)}
                className="text-neutral-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            {/* Task summary */}
            <div className="p-3.5 bg-[#14161f] border border-neutral-800 rounded-sm space-y-1.5 font-mono text-xs">
              <div className="text-[10px] text-neutral-400 uppercase flex items-center justify-between">
                <span>Job Code: <strong className="text-white">{taskToReassign.projectJobNumber}</strong></span>
                <span>{taskToReassign.projectName}</span>
              </div>
              <div className="text-sm font-bold text-white font-sans">
                {taskToReassign.text}
              </div>
              <div className="text-[10px] text-neutral-400">
                Target Role Discipline: <span className="text-neutral-200 font-bold">{taskToReassign.role}</span>
              </div>
            </div>

            {/* Current assignee info */}
            {currentAssigneeId && (
              <div className="text-xs font-mono text-neutral-400 flex items-center gap-2">
                <span>Current Assignee:</span>
                <strong className="text-white">
                  {staffList.find(s => s.id === currentAssigneeId)?.name || 'Unassigned'}
                </strong>
              </div>
            )}

            {/* Target Select with Workload Guidance */}
            <div>
              <label className="block font-mono text-[10px] text-neutral-400 uppercase tracking-widest mb-1.5">
                Reassign to Team Member *
              </label>
              <select
                value={targetStaffId}
                onChange={e => setTargetStaffId(e.target.value)}
                className="w-full bg-[#14151c] border border-neutral-700 focus:border-white px-3 py-2.5 text-xs text-white font-mono rounded-sm outline-none"
              >
                <option value="">Select available staff member...</option>
                {staffList.map(s => {
                  const stat = staffWorkloadStats.find(st => st.staff.id === s.id);
                  const isRoleMatch = s.role === taskToReassign.role;
                  return (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.role} // {s.department}) — {stat?.activeTasksCount || 0} active tasks {isRoleMatch ? '★ MATCH' : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Reallocation Reason Note */}
            <div>
              <label className="block font-mono text-[10px] text-neutral-400 uppercase tracking-widest mb-1.5">
                Rebalancing Note / Directive Instructions
              </label>
              <textarea
                rows={3}
                value={reassignNote}
                onChange={e => setReassignNote(e.target.value)}
                placeholder="e.g. Shifting copy task to balance design queue ahead of Wednesday milestone..."
                className="w-full bg-[#14151c] border border-neutral-700 focus:border-white p-3 text-xs text-white font-mono rounded-sm outline-none resize-none"
              />
            </div>

            <div className="pt-3 border-t border-neutral-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setReassignModalOpen(false)}
                className="px-4 py-2 font-mono text-xs text-neutral-400 hover:text-white uppercase"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!targetStaffId}
                onClick={handleConfirmReassign}
                className="px-5 py-2.5 bg-white text-black hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed font-black font-mono text-xs uppercase tracking-wider rounded-sm transition-all"
              >
                Confirm Reallocation
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default WorkloadDashboard;
