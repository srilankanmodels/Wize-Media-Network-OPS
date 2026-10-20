import React, { useState, useMemo } from 'react';
import { Procedure, ProcedureStep, StaffMember } from '../types';
import { 
  BookOpen, ChevronRight, ChevronDown, Zap, ShieldCheck, Activity, Briefcase, 
  DollarSign, Users, Heart, Search, CheckCircle2, Circle, Clock, AlertTriangle, 
  Plus, Check, Copy, ExternalLink, Printer, Trash2, Edit3, X, Filter, Sparkles,
  ArrowRight, ShieldAlert, Award, FileCheck, Layers, Video, Globe, Hash
} from 'lucide-react';

interface ProceduresProps {
  procedures?: Procedure[];
  currentUser?: StaffMember;
  staffList?: StaffMember[];
  onUpdateProcedure?: (updated: Procedure) => void;
  onAddProcedure?: (newProc: Procedure) => void;
  onDeleteProcedure?: (id: string) => void;
  onNavigate?: (view: string) => void;
}

const Procedures: React.FC<ProceduresProps> = ({
  procedures = [],
  currentUser,
  staffList = [],
  onUpdateProcedure,
  onAddProcedure,
  onDeleteProcedure,
  onNavigate
}) => {
  const [expandedId, setExpandedId] = useState<string | null>('proc-1');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [filterMyRoleOnly, setFilterMyRoleOnly] = useState(false);
  const [filterPendingSignoff, setFilterPendingSignoff] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Active execution checklist states
  const [stepChecklist, setStepChecklist] = useState<Record<string, Record<string, boolean>>>({});

  // Modal State for New Procedure
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProcedure, setEditingProcedure] = useState<Procedure | null>(null);
  const [formCategory, setFormCategory] = useState('Operations');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDepartment, setFormDepartment] = useState('');
  const [formRole, setFormRole] = useState('');
  const [formSla, setFormSla] = useState('24 hours');
  const [formPriority, setFormPriority] = useState<'Normal' | 'High' | 'Critical'>('Normal');
  const [formInputs, setFormInputs] = useState('');
  const [formDeliverables, setFormDeliverables] = useState('');
  const [formSteps, setFormSteps] = useState<{ id: string; text: string; role?: string; timeEstimate?: string; checkpoint?: string }[]>([
    { id: 's1', text: 'Initiate protocol and verify prerequisites.', role: '', timeEstimate: '15 mins', checkpoint: 'Check requirements' },
    { id: 's2', text: 'Execute primary operation sequence.', role: '', timeEstimate: '30 mins', checkpoint: 'Quality check' }
  ]);

  const categories = ['All', 'Operations', 'Finance', 'Creative', 'Production', 'Digital', 'HR'];

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Operations': return <Briefcase size={18} />;
      case 'Finance': return <DollarSign size={18} />;
      case 'Creative': return <Zap size={18} />;
      case 'Production': return <Video size={18} />;
      case 'Digital': return <Globe size={18} />;
      case 'HR': return <Heart size={18} />;
      default: return <Activity size={18} />;
    }
  };

  const getPriorityBadge = (priority?: 'Normal' | 'High' | 'Critical') => {
    switch (priority) {
      case 'Critical':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-none text-[9px] font-mono font-black uppercase tracking-wider bg-rose-500 text-white animate-pulse">
            <ShieldAlert size={12} /> CRITICAL GATE
          </span>
        );
      case 'High':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-none text-[9px] font-mono font-black uppercase tracking-wider bg-amber-500 text-black">
            <AlertTriangle size={12} /> HIGH PRIORITY
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-none text-[9px] font-mono uppercase tracking-wider bg-[#161822] text-neutral-300 border border-neutral-800">
            <Clock size={12} /> STANDARD
          </span>
        );
    }
  };

  const filteredProcedures = useMemo(() => {
    return procedures.filter(proc => {
      if (selectedCategory !== 'All' && proc.category.toLowerCase() !== selectedCategory.toLowerCase()) {
        return false;
      }

      if (filterMyRoleOnly && currentUser) {
        const matchesRole = proc.roleResponsible?.toLowerCase().includes(currentUser.role.toLowerCase()) ||
          proc.steps.some(s => s.role?.toLowerCase().includes(currentUser.role.toLowerCase()));
        const matchesDept = proc.department?.toLowerCase().includes(currentUser.department.toLowerCase());
        if (!matchesRole && !matchesDept) return false;
      }

      if (filterPendingSignoff && currentUser) {
        const hasAcknowledged = proc.acknowledgedBy?.includes(currentUser.id);
        if (hasAcknowledged) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inTitle = proc.title.toLowerCase().includes(q);
        const inDesc = proc.description.toLowerCase().includes(q);
        const inDept = proc.department?.toLowerCase().includes(q);
        const inRole = proc.roleResponsible?.toLowerCase().includes(q);
        const inTags = proc.tags?.some(t => t.toLowerCase().includes(q));
        const inSteps = proc.steps.some(s => 
          s.text.toLowerCase().includes(q) || 
          s.checkpoint?.toLowerCase().includes(q) || 
          s.role?.toLowerCase().includes(q)
        );
        return inTitle || inDesc || inDept || inRole || inTags || inSteps;
      }

      return true;
    });
  }, [procedures, selectedCategory, filterMyRoleOnly, filterPendingSignoff, searchQuery, currentUser]);

  const totalCount = procedures.length;
  const acknowledgedCount = useMemo(() => {
    if (!currentUser) return 0;
    return procedures.filter(p => p.acknowledgedBy?.includes(currentUser.id)).length;
  }, [procedures, currentUser]);

  const criticalCount = useMemo(() => {
    return procedures.filter(p => p.priority === 'Critical').length;
  }, [procedures]);

  const handleToggleAcknowledge = (proc: Procedure) => {
    if (!currentUser || !onUpdateProcedure) return;
    const currentAcks = proc.acknowledgedBy || [];
    const hasAck = currentAcks.includes(currentUser.id);
    const updatedAcks = hasAck
      ? currentAcks.filter(id => id !== currentUser.id)
      : [...currentAcks, currentUser.id];

    onUpdateProcedure({
      ...proc,
      acknowledgedBy: updatedAcks
    });
  };

  const handleToggleStep = (procedureId: string, stepId: string) => {
    setStepChecklist(prev => {
      const procSteps = prev[procedureId] || {};
      return {
        ...prev,
        [procedureId]: {
          ...procSteps,
          [stepId]: !procSteps[stepId]
        }
      };
    });
  };

  const handleResetChecklist = (procedureId: string) => {
    setStepChecklist(prev => ({
      ...prev,
      [procedureId]: {}
    }));
  };

  const handleCopySOP = (proc: Procedure) => {
    const markdown = `# ${proc.title} (${proc.category})\n` +
      `Department: ${proc.department || 'All'}\n` +
      `Responsible: ${proc.roleResponsible || 'All'}\n` +
      `SLA: ${proc.sla || 'N/A'}\n` +
      `Priority: ${proc.priority || 'Normal'}\n\n` +
      `Description:\n${proc.description}\n\n` +
      (proc.requiredInputs && proc.requiredInputs.length > 0 ? `## Prerequisites / Inputs:\n` + proc.requiredInputs.map(i => `- ${i}`).join('\n') + '\n\n' : '') +
      `## Step-by-Step Sequence:\n` +
      proc.steps.map((s, idx) => `${idx + 1}. [${s.role || 'Team'}] ${s.text} (${s.timeEstimate || 'Standard'}) ${s.checkpoint ? `\n   ↳ Checkpoint: ${s.checkpoint}` : ''}`).join('\n') +
      (proc.deliverables && proc.deliverables.length > 0 ? `\n\n## Deliverables:\n` + proc.deliverables.map(d => `- ${d}`).join('\n') : '');

    navigator.clipboard.writeText(markdown);
    setCopiedId(proc.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleLaunchModule = (proc: Procedure) => {
    if (!onNavigate) return;
    if (proc.category === 'Operations' || proc.title.includes('Registry')) {
      onNavigate('registry');
    } else if (proc.category === 'Finance' || proc.title.includes('Invoicing') || proc.title.includes('Cash')) {
      onNavigate('finance');
    } else if (proc.category === 'HR' || proc.title.includes('Staff') || proc.title.includes('Onboarding')) {
      onNavigate('staff');
    } else if (proc.category === 'Creative' || proc.title.includes('Meeting') || proc.title.includes('Minutes')) {
      onNavigate('notes');
    } else {
      onNavigate('dashboard');
    }
  };

  const handleOpenAddModal = (existing?: Procedure) => {
    if (existing) {
      setEditingProcedure(existing);
      setFormTitle(existing.title);
      setFormCategory(existing.category);
      setFormDepartment(existing.department || '');
      setFormRole(existing.roleResponsible || '');
      setFormSla(existing.sla || '24 hours');
      setFormPriority(existing.priority || 'Normal');
      setFormDescription(existing.description);
      setFormInputs(existing.requiredInputs?.join('\n') || '');
      setFormDeliverables(existing.deliverables?.join('\n') || '');
      setFormSteps(existing.steps.map(s => ({ ...s })));
    } else {
      setEditingProcedure(null);
      setFormTitle('');
      setFormCategory('Operations');
      setFormDepartment(currentUser?.department || 'Operations');
      setFormRole(currentUser?.role || 'All Team');
      setFormSla('24 hours');
      setFormPriority('Normal');
      setFormDescription('');
      setFormInputs('');
      setFormDeliverables('');
      setFormSteps([
        { id: `s-${Date.now()}-1`, text: 'Receive and verify initial requirements.', role: 'Account Executive', timeEstimate: '15 mins', checkpoint: 'Brief verified' },
        { id: `s-${Date.now()}-2`, text: 'Execute main task sequence according to standard criteria.', role: 'Specialist', timeEstimate: '30 mins', checkpoint: 'Draft completed' },
        { id: `s-${Date.now()}-3`, text: 'Submit for internal quality gate and signoff.', role: 'Lead / Reviewer', timeEstimate: '15 mins', checkpoint: 'Approval documented' }
      ]);
    }
    setIsAddModalOpen(true);
  };

  const handleSaveProcedure = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const parsedInputs = formInputs.split('\n').map(s => s.trim()).filter(Boolean);
    const parsedDeliverables = formDeliverables.split('\n').map(s => s.trim()).filter(Boolean);

    const newProc: Procedure = {
      id: editingProcedure ? editingProcedure.id : `proc-${Date.now()}`,
      title: formTitle.trim(),
      category: formCategory,
      department: formDepartment.trim() || undefined,
      roleResponsible: formRole.trim() || undefined,
      sla: formSla.trim() || undefined,
      priority: formPriority,
      description: formDescription.trim(),
      requiredInputs: parsedInputs.length > 0 ? parsedInputs : undefined,
      deliverables: parsedDeliverables.length > 0 ? parsedDeliverables : undefined,
      steps: formSteps.filter(s => s.text.trim().length > 0),
      acknowledgedBy: editingProcedure?.acknowledgedBy || (currentUser ? [currentUser.id] : []),
      lastUpdated: new Date().toISOString().split('T')[0],
      tags: [formCategory, formDepartment].filter(Boolean)
    };

    if (editingProcedure && onUpdateProcedure) {
      onUpdateProcedure(newProc);
    } else if (onAddProcedure) {
      onAddProcedure(newProc);
    }

    setIsAddModalOpen(false);
    setExpandedId(newProc.id);
  };

  const canManage = currentUser?.role === 'Admin' || currentUser?.role === 'Management' || currentUser?.role === 'HR';

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Hero Banner - Liquid Glass */}
      <div className="liquid-glass-card hud-frame border border-[var(--jarvis-border)] rounded-sm p-8 sm:p-12 relative overflow-hidden shadow-[0_0_40px_-10px_rgba(var(--jarvis-primary-rgb),0.2)]">
        <div className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-[100px] sm:text-[180px] lg:text-[240px] text-white/[0.03] select-none uppercase tracking-tighter pointer-events-none font-heading leading-none">
          PROTOCOLS
        </div>

        <div className="relative z-10 max-w-3xl">
          <div className="font-mono text-xs uppercase tracking-[0.25em] text-[var(--jarvis-primary)] mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--jarvis-primary)] animate-ping" />
            <span>PROPRIETARY ECOSYSTEM // STANDARD OPERATING PROCEDURES // JARVIS MATRIX</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight uppercase leading-none font-heading">
            PROCEDURES
            <span className="block text-[var(--jarvis-primary)] hud-glow-text font-bold mt-2">OPERATIONAL MATRIX</span>
          </h1>

          <p className="text-xs sm:text-sm text-neutral-300 font-medium uppercase tracking-wider max-w-2xl mt-6 leading-relaxed">
            Mandatory operational blueprints, quality gates, and SLAs governing client execution across all Mediawize departments.
          </p>

          <div className="flex flex-wrap items-center gap-4 mt-8">
            <button
              onClick={() => handleOpenAddModal()}
              className="jarvis-btn-primary px-6 py-3 font-black text-xs uppercase tracking-wider flex items-center gap-2 rounded-sm shadow-xl active:scale-95 transition-all cursor-pointer"
            >
              <Plus size={16} strokeWidth={3} /> NEW PROTOCOL
            </button>

            <button
              onClick={() => window.print()}
              className="jarvis-btn-secondary px-6 py-3 font-black text-xs uppercase tracking-wider flex items-center gap-2 rounded-sm active:scale-95 transition-all cursor-pointer"
            >
              <Printer size={16} /> PRINT DIRECTIVES
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0a0b0e] border border-neutral-800 p-6 rounded-sm">
          <div className="font-mono text-[9px] text-neutral-400 uppercase tracking-widest">ACTIVE PROTOCOLS</div>
          <div className="text-3xl font-mono font-black text-white mt-1">{totalCount}</div>
          <div className="font-mono text-[9px] text-neutral-500 mt-2">TOTAL NODES</div>
        </div>

        <div className="bg-[#0a0b0e] border border-neutral-800 p-6 rounded-sm">
          <div className="font-mono text-[9px] text-neutral-400 uppercase tracking-widest">YOUR COMPLIANCE</div>
          <div className="text-3xl font-mono font-black text-white mt-1">
            {acknowledgedCount} <span className="text-sm text-neutral-500">/ {totalCount}</span>
          </div>
          <div className="w-full bg-[#14151c] h-1 mt-2">
            <div 
              className="bg-white h-full transition-all"
              style={{ width: `${totalCount > 0 ? (acknowledgedCount / totalCount) * 100 : 0}%` }}
            />
          </div>
        </div>

        <div className="bg-[#0a0b0e] border border-neutral-800 p-6 rounded-sm">
          <div className="font-mono text-[9px] text-neutral-400 uppercase tracking-widest">CRITICAL GATES</div>
          <div className="text-3xl font-mono font-black text-rose-500 mt-1">{criticalCount}</div>
          <div className="font-mono text-[9px] text-neutral-500 mt-2">ZERO-TOLERANCE</div>
        </div>

        <div className="bg-[#0a0b0e] border border-neutral-800 p-6 rounded-sm">
          <div className="font-mono text-[9px] text-neutral-400 uppercase tracking-widest">YOUR DEPLOYMENT</div>
          <div className="text-lg font-black text-white mt-1 truncate uppercase font-heading">{currentUser?.role || 'Staff'}</div>
          <div className="font-mono text-[9px] text-neutral-500 truncate uppercase mt-1">{currentUser?.department || 'Mediawize Team'}</div>
        </div>
      </div>

      {/* Filter and Search Panel */}
      <div className="bg-[#0a0b0e] border border-neutral-800 p-6 rounded-sm space-y-4">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="SEARCH PROTOCOL BY DIRECTIVE, STEP, ROLE, SLA, OR CHECKPOINT..."
              className="w-full bg-[#12141a] border border-neutral-800 focus:border-white pl-12 pr-10 py-3 font-mono text-xs uppercase tracking-wider text-white outline-none rounded-sm transition-colors placeholder:text-neutral-600"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white">
                <X size={16} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
            <button
              onClick={() => setFilterMyRoleOnly(!filterMyRoleOnly)}
              className={`px-4 py-3 rounded-sm font-mono text-xs uppercase tracking-wider border transition-colors ${
                filterMyRoleOnly ? 'bg-white text-black font-bold border-white' : 'bg-[#12141a] text-neutral-400 border-neutral-800 hover:border-neutral-700'
              }`}
            >
              MY ROLE / DEPT
            </button>
            <button
              onClick={() => setFilterPendingSignoff(!filterPendingSignoff)}
              className={`px-4 py-3 rounded-sm font-mono text-xs uppercase tracking-wider border transition-colors ${
                filterPendingSignoff ? 'bg-white text-black font-bold border-white' : 'bg-[#12141a] text-neutral-400 border-neutral-800 hover:border-neutral-700'
              }`}
            >
              NEEDS SIGN-OFF
            </button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-neutral-800/80 custom-scrollbar">
          {categories.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-sm font-mono text-xs uppercase tracking-wider transition-colors shrink-0 ${
                  isActive 
                    ? 'bg-white text-black font-black' 
                    : 'bg-[#12141a] text-neutral-400 hover:text-white border border-neutral-800'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Procedures List */}
      <div className="space-y-4">
        {filteredProcedures.map((proc) => {
          const isExpanded = expandedId === proc.id;
          const isAcknowledged = currentUser && proc.acknowledgedBy?.includes(currentUser.id);
          const activeStepMap = stepChecklist[proc.id] || {};
          const completedStepCount = proc.steps.filter(s => activeStepMap[s.id]).length;
          const progressPercent = proc.steps.length > 0 
            ? Math.round((completedStepCount / proc.steps.length) * 100) 
            : 0;

          return (
            <div
              key={proc.id}
              className={`bg-[#0a0b0e] border transition-all rounded-sm overflow-hidden ${
                isExpanded ? 'border-white shadow-2xl' : 'border-neutral-800 hover:border-neutral-700'
              }`}
            >
              {/* Header */}
              <div
                onClick={() => setExpandedId(isExpanded ? null : proc.id)}
                className="p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 cursor-pointer select-none"
              >
                <div className="flex items-start sm:items-center gap-5 flex-1 min-w-0">
                  <div className={`w-12 h-12 rounded-sm flex items-center justify-center shrink-0 border ${
                    isExpanded ? 'bg-white text-black border-white' : 'bg-[#12141a] text-neutral-300 border-neutral-800'
                  }`}>
                    {getCategoryIcon(proc.category)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2 font-mono text-[9px]">
                      <span className="px-2 py-0.5 bg-[#14151c] border border-neutral-800 text-neutral-300 uppercase">
                        {proc.category}
                      </span>
                      {proc.department && (
                        <span className="px-2 py-0.5 bg-[#14151c] border border-neutral-800 text-neutral-400 uppercase">
                          {proc.department}
                        </span>
                      )}
                      {getPriorityBadge(proc.priority)}
                      {isAcknowledged ? (
                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase flex items-center gap-1">
                          <Check size={10} strokeWidth={3} /> SIGNED OFF
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-neutral-900 text-neutral-400 border border-neutral-800 uppercase flex items-center gap-1">
                          <Clock size={10} /> PENDING
                        </span>
                      )}
                    </div>

                    <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase font-heading truncate">
                      {proc.title}
                    </h3>

                    <p className="text-xs text-neutral-400 mt-1 line-clamp-1 font-medium">
                      {proc.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 mt-3 font-mono text-[10px] text-neutral-400 uppercase">
                      {proc.roleResponsible && <span>ROLE: {proc.roleResponsible}</span>}
                      {proc.sla && <span>SLA: {proc.sla}</span>}
                      <span>{proc.steps.length} NODES</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  {completedStepCount > 0 && (
                    <div className="text-right font-mono text-xs">
                      <div className="text-emerald-400 font-bold">{completedStepCount}/{proc.steps.length} STEPS</div>
                      <div className="text-neutral-500">{progressPercent}% DONE</div>
                    </div>
                  )}
                  <div className={`w-8 h-8 flex items-center justify-center border border-neutral-800 bg-[#12141a] text-neutral-400 transition-transform ${isExpanded ? 'rotate-180 text-white' : ''}`}>
                    <ChevronDown size={16} />
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="px-6 sm:px-8 pb-8 pt-4 space-y-6 border-t border-neutral-800/80 animate-in slide-in-from-top-2 duration-200">
                  <div className="bg-[#0e0f14] border border-neutral-800 p-6 rounded-sm">
                    <div className="font-mono text-[10px] uppercase text-neutral-400 tracking-widest mb-2">
                      OPERATIONAL DIRECTIVE
                    </div>
                    <p className="text-xs sm:text-sm text-neutral-200 leading-relaxed font-mono">
                      {proc.description}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-neutral-800">
                      {proc.requiredInputs && proc.requiredInputs.length > 0 && (
                        <div>
                          <div className="font-mono text-[10px] uppercase text-neutral-400 tracking-wider mb-2">
                            PREREQUISITES & INPUTS
                          </div>
                          <ul className="space-y-1.5 font-mono text-xs text-neutral-300">
                            {proc.requiredInputs.map((item, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-neutral-600">↳</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {proc.deliverables && proc.deliverables.length > 0 && (
                        <div>
                          <div className="font-mono text-[10px] uppercase text-neutral-400 tracking-wider mb-2">
                            OUTPUT DELIVERABLES
                          </div>
                          <ul className="space-y-1.5 font-mono text-xs text-neutral-300">
                            {proc.deliverables.map((item, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-emerald-500">✓</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Steps Checklist */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between font-mono text-xs">
                      <span className="text-neutral-400 uppercase tracking-widest">
                        EXECUTION CHECKLIST ({proc.steps.length} STEPS)
                      </span>
                      {completedStepCount > 0 && (
                        <button 
                          onClick={() => handleResetChecklist(proc.id)}
                          className="text-neutral-500 hover:text-white uppercase tracking-wider"
                        >
                          Reset Checklist
                        </button>
                      )}
                    </div>

                    <div className="space-y-2">
                      {proc.steps.map((step, idx) => {
                        const isDone = !!activeStepMap[step.id];

                        return (
                          <div
                            key={step.id}
                            onClick={() => handleToggleStep(proc.id, step.id)}
                            className={`p-4 border rounded-sm transition-all cursor-pointer flex items-start gap-3 select-none ${
                              isDone 
                                ? 'bg-[#0e1713] border-emerald-500/40' 
                                : 'bg-[#101217] border-neutral-800 hover:border-neutral-700'
                            }`}
                          >
                            <button
                              type="button"
                              className={`w-6 h-6 rounded-sm flex items-center justify-center shrink-0 mt-0.5 font-mono text-xs ${
                                isDone ? 'bg-emerald-500 text-black font-black' : 'bg-[#161822] text-neutral-400 border border-neutral-700'
                              }`}
                            >
                              {isDone ? <Check size={14} strokeWidth={3} /> : idx + 1}
                            </button>

                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 font-mono text-[9px] mb-1">
                                {step.role && <span className="text-neutral-400 uppercase">ROLE: {step.role}</span>}
                                {step.timeEstimate && <span className="text-neutral-500 uppercase">({step.timeEstimate})</span>}
                              </div>
                              <p className={`text-xs font-mono leading-relaxed ${isDone ? 'text-neutral-400 line-through' : 'text-neutral-200'}`}>
                                {step.text}
                              </p>
                              {step.checkpoint && (
                                <div className="mt-2 text-[10px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 inline-block">
                                  GATE: {step.checkpoint}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sign-off & Actions Bar */}
                  <div className="bg-[#0e0f14] border border-neutral-800 p-6 rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="font-mono text-xs uppercase text-white font-bold mb-1">
                        OPERATIONAL COMPLIANCE SIGN-OFF
                      </div>
                      <p className="font-mono text-[10px] text-neutral-400 max-w-md">
                        Confirming your review certifies compliance during live agency production.
                      </p>
                      {proc.acknowledgedBy && proc.acknowledgedBy.length > 0 && (
                        <div className="font-mono text-[9px] text-neutral-500 mt-2">
                          VERIFIED BY {proc.acknowledgedBy.length} TEAM MEMBERS
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        onClick={() => handleToggleAcknowledge(proc)}
                        className={`px-5 py-2.5 font-black text-xs font-mono uppercase tracking-wider rounded-sm transition-all ${
                          isAcknowledged
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-white text-black hover:bg-neutral-200 shadow-md'
                        }`}
                      >
                        {isAcknowledged ? '✓ SIGNED OFF' : 'ACKNOWLEDGE SOP'}
                      </button>

                      <button
                        onClick={() => handleLaunchModule(proc)}
                        className="px-4 py-2.5 bg-[#14151c] border border-neutral-700 hover:border-white font-mono text-xs uppercase text-white rounded-sm"
                      >
                        LAUNCH MODULE
                      </button>

                      <button
                        onClick={() => handleCopySOP(proc)}
                        className="p-2.5 bg-[#14151c] border border-neutral-700 hover:border-white text-neutral-300 hover:text-white rounded-sm"
                        title="Copy Markdown"
                      >
                        <Copy size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add / Edit Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b0c0f] border border-neutral-800 w-full max-w-2xl rounded-sm shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 bg-[#0e0f14] border-b border-neutral-800 flex justify-between items-center text-white">
              <div>
                <div className="font-mono text-[9px] text-neutral-400 uppercase tracking-widest">SOP DIRECTIVE CREATOR</div>
                <h3 className="text-lg font-black uppercase text-white font-heading">
                  {editingProcedure ? 'Edit Protocol' : 'Create Operating Procedure'}
                </h3>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-neutral-400 hover:text-white"><X size={20} /></button>
            </div>

            <form onSubmit={handleSaveProcedure} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
              <div>
                <label className="block font-mono text-[10px] text-neutral-400 uppercase tracking-widest mb-1">Title *</label>
                <input
                  required
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder="e.g. ANNUAL REPORT EDITORIAL TIMELINE"
                  className="w-full bg-[#12141a] border border-neutral-800 focus:border-white px-4 py-2 text-xs font-mono text-white outline-none rounded-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono text-[10px] text-neutral-400 uppercase tracking-widest mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value)}
                    className="w-full bg-[#12141a] border border-neutral-800 focus:border-white px-4 py-2 text-xs font-mono text-white outline-none rounded-sm"
                  >
                    {categories.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-mono text-[10px] text-neutral-400 uppercase tracking-widest mb-1">Priority</label>
                  <select
                    value={formPriority}
                    onChange={e => setFormPriority(e.target.value as any)}
                    className="w-full bg-[#12141a] border border-neutral-800 focus:border-white px-4 py-2 text-xs font-mono text-white outline-none rounded-sm"
                  >
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-mono text-[10px] text-neutral-400 uppercase tracking-widest mb-1">Description *</label>
                <textarea
                  required
                  rows={2}
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  placeholder="Summary of operational boundaries..."
                  className="w-full bg-[#12141a] border border-neutral-800 focus:border-white px-4 py-2 text-xs font-mono text-white outline-none rounded-sm"
                />
              </div>

              <div className="pt-4 border-t border-neutral-800 flex justify-end gap-2">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 font-mono text-xs text-neutral-400 hover:text-white">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-white text-black font-black text-xs uppercase tracking-wider hover:bg-neutral-200 rounded-sm">Save Directive</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Procedures;
