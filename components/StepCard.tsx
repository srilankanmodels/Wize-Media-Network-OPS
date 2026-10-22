import React, { useState, useEffect, useRef } from 'react';
import { Step, Task, Role, StaffMember } from '../types';
import { CheckCircle2, Circle, Play, Clock, FileText, User, ChevronDown, ChevronUp, Calendar, MessageSquare, X, Check, Timer, UserMinus, AlertCircle, Pause, StickyNote, Save, Settings, Trash2, Plus, Pencil, ArrowUpRight } from 'lucide-react';

interface StepCardProps {
  step: Step;
  completedTasks: Record<string, boolean>;
  onToggleTask: (taskId: string) => void;
  comments: any[];
  onAddComment: (text: string) => void;
  isActive: boolean;
  staffList: StaffMember[];
  onAssignTask: (taskId: string, staffId: string) => void;
  assignedTasks: Record<string, string>;
  onToggleTimer: (taskId: string) => void;
  activeTimerTaskId?: string;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onUpdateStep: (stepId: number, updates: Partial<Step>) => void;
  onDeleteStep?: (stepId: number) => void;
}

// --- Custom Modern Date/Time Picker Component in Dark Theme ---
const ModernDateTimePicker: React.FC<{
  initialValue?: Date;
  onConfirm: (date: Date) => void;
  onClose: () => void;
  title: string;
}> = ({ initialValue, onConfirm, onClose, title }) => {
  const [selectedDate, setSelectedDate] = useState(initialValue || new Date());
  const [hour, setHour] = useState(initialValue ? (initialValue.getHours() % 12 || 12).toString().padStart(2, '0') : '12');
  const [minute, setMinute] = useState(initialValue ? initialValue.getMinutes().toString().padStart(2, '0') : '00');
  const [period, setPeriod] = useState(initialValue ? (initialValue.getHours() >= 12 ? 'PM' : 'AM') : 'AM');

  const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  const handleConfirm = () => {
    const finalDate = new Date(selectedDate);
    let h = parseInt(hour);
    if (period === 'PM' && h < 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    finalDate.setHours(h, parseInt(minute), 0, 0);
    onConfirm(finalDate);
    onClose();
  };

  return (
    <div className="absolute top-full left-0 mt-3 bg-[#0c0d12] rounded-sm shadow-2xl border border-neutral-800 z-[200] overflow-hidden animate-in zoom-in-95 duration-200 w-[380px] font-mono text-white" onClick={e => e.stopPropagation()}>
      <div className="bg-[#12141a] p-4 flex justify-between items-center border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <Calendar size={15} className="text-neutral-400" />
          <span className="font-mono text-[10px] uppercase tracking-widest">{title}</span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-neutral-800 rounded transition-colors text-neutral-400 hover:text-white"><X size={16}/></button>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <label className="block text-[9px] uppercase tracking-widest text-neutral-400 mb-1">Target Date</label>
          <input 
            type="date"
            value={new Date(selectedDate).toISOString().split('T')[0]}
            onChange={e => setSelectedDate(new Date(e.target.value))}
            className="w-full bg-[#181a24] border border-neutral-800 px-3 py-2 text-xs text-white rounded-sm outline-none focus:border-white"
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-[9px] uppercase tracking-widest text-neutral-400 mb-1">Hour</label>
            <select value={hour} onChange={e => setHour(e.target.value)} className="w-full bg-[#181a24] border border-neutral-800 px-2 py-2 text-xs text-white rounded-sm outline-none">
              {hours.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[9px] uppercase tracking-widest text-neutral-400 mb-1">Minute</label>
            <select value={minute} onChange={e => setMinute(e.target.value)} className="w-full bg-[#181a24] border border-neutral-800 px-2 py-2 text-xs text-white rounded-sm outline-none">
              {minutes.filter((_, i) => i % 5 === 0).map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[9px] uppercase tracking-widest text-neutral-400 mb-1">Period</label>
            <select value={period} onChange={e => setPeriod(e.target.value)} className="w-full bg-[#181a24] border border-neutral-800 px-2 py-2 text-xs text-white rounded-sm outline-none">
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
          <button onClick={onClose} className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white">Cancel</button>
          <button onClick={handleConfirm} className="px-4 py-1.5 bg-white text-black font-black text-xs uppercase rounded-sm hover:bg-neutral-200">Set Target</button>
        </div>
      </div>
    </div>
  );
};

// Helper to format minutes into standard "Hrs : MM" representation
export const formatHrsMM = (minutes?: number): string => {
  const total = Math.max(0, minutes ?? 60);
  const hrs = Math.floor(total / 60);
  const mins = total % 60;
  return `${String(hrs).padStart(2, '0')} : ${String(mins).padStart(2, '0')}`;
};

// --- Task Item Component ---
const TaskItem: React.FC<{
  task: Task;
  taskIndex?: number;
  isCompleted: boolean;
  onToggle: () => void;
  staffList: StaffMember[];
  onAssign: (id: string) => void;
  onUpdate: (updates: Partial<Task>) => void;
  onDelete: () => void;
  onToggleTimer: () => void;
  activeTimerTaskId?: string;
}> = ({ task, taskIndex = 0, isCompleted, onToggle, staffList, onAssign, onUpdate, onDelete, onToggleTimer, activeTimerTaskId }) => {
  const [showAssignMenu, setShowAssignMenu] = useState(false);
  const [showDeadlinePicker, setShowDeadlinePicker] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [tempNotes, setTempNotes] = useState(task.notes || '');
  const assignMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showAssignMenu) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (assignMenuRef.current && !assignMenuRef.current.contains(event.target as Node)) {
        setShowAssignMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAssignMenu]);
  
  // Hours and minutes for Hrs : MM configuration
  const currentTotalMins = task.timeAllocated ?? 60;
  const [editHrs, setEditHrs] = useState(Math.floor(currentTotalMins / 60));
  const [editMins, setEditMins] = useState(currentTotalMins % 60);
  const [editDeadline, setEditDeadline] = useState(
    task.deadline ? new Date(new Date(task.deadline).getTime() - new Date(task.deadline).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''
  );

  const [editData, setEditData] = useState({
    text: task.text,
    role: task.role,
    priority: task.priority || 'Medium'
  });

  const assignedStaff = staffList.find(s => s.id === task.assignedTo);
  const isTimerActive = !!task.timerStart;

  // Deadline calculation
  const deadlineDate = task.deadline ? new Date(task.deadline) : null;
  const isOverdue = deadlineDate && !isCompleted ? deadlineDate.getTime() < Date.now() : false;
  const isDueToday = deadlineDate && !isCompleted ? (
    deadlineDate.getDate() === new Date().getDate() &&
    deadlineDate.getMonth() === new Date().getMonth() &&
    deadlineDate.getFullYear() === new Date().getFullYear()
  ) : false;

  const handleSaveEdit = () => {
    const totalMinutes = Math.max(1, (parseInt(String(editHrs)) || 0) * 60 + (parseInt(String(editMins)) || 0));
    onUpdate({
      text: editData.text,
      role: editData.role,
      priority: editData.priority as any,
      timeAllocated: totalMinutes,
      deadline: editDeadline ? new Date(editDeadline).toISOString() : undefined
    });
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="bg-[#12141a] p-5 rounded-sm border border-neutral-700 animate-in zoom-in-95 duration-200 space-y-4 font-mono text-white">
        <div className="flex justify-between items-center">
          <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold">Edit Task Directive Node</span>
          <button onClick={onDelete} className="text-neutral-500 hover:text-rose-400 transition-colors" title="Delete task">
            <Trash2 size={15} />
          </button>
        </div>

        <div>
          <label className="block text-[9px] uppercase tracking-widest text-neutral-400 mb-1 font-semibold">Directive Descriptor</label>
          <input 
            value={editData.text}
            onChange={e => setEditData({...editData, text: e.target.value})}
            className="w-full px-3 py-2 bg-[#0c0d12] border border-neutral-800 rounded-sm text-xs text-white outline-none focus:border-white"
            placeholder="Specify actionable task..."
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[9px] uppercase tracking-widest text-neutral-400 mb-1 font-semibold">Target Specialist Role</label>
            <select 
              value={editData.role}
              onChange={e => setEditData({...editData, role: e.target.value})}
              className="w-full px-3 py-2 bg-[#0c0d12] border border-neutral-800 rounded-sm text-xs text-white outline-none"
            >
              {Object.values(Role).map(role => <option key={role} value={role}>{role}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[9px] uppercase tracking-widest text-neutral-400 mb-1 font-semibold">Priority Matrix</label>
            <select 
              value={editData.priority}
              onChange={e => setEditData({...editData, priority: e.target.value as any})}
              className="w-full px-3 py-2 bg-[#0c0d12] border border-neutral-800 rounded-sm text-xs text-white outline-none"
            >
              <option value="Critical">Critical (Immediate SLA)</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>

        {/* Hrs : MM Time Allocation */}
        <div className="bg-[#0b0c10] p-3 rounded-sm border border-neutral-800 space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-[9px] uppercase tracking-widest text-neutral-300 font-bold">
              Allocated Time (Hrs : MM)
            </label>
            <span className="text-[10px] text-amber-400 font-bold">
              EST: {String(editHrs).padStart(2, '0')} : {String(editMins).padStart(2, '0')} ({Math.max(1, editHrs * 60 + editMins)} mins)
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-[8px] uppercase tracking-wider text-neutral-500 block mb-0.5">Hours (Hrs)</span>
              <input 
                type="number"
                min="0"
                max="999"
                value={editHrs}
                onChange={e => setEditHrs(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-1.5 bg-[#12141a] border border-neutral-700 rounded-sm text-xs text-white text-center font-bold outline-none focus:border-white"
              />
            </div>
            <div>
              <span className="text-[8px] uppercase tracking-wider text-neutral-500 block mb-0.5">Minutes (MM)</span>
              <input 
                type="number"
                min="0"
                max="59"
                value={editMins}
                onChange={e => setEditMins(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                className="w-full px-3 py-1.5 bg-[#12141a] border border-neutral-700 rounded-sm text-xs text-white text-center font-bold outline-none focus:border-white"
              />
            </div>
          </div>

          {/* Quick Duration Presets */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[8px] text-neutral-500 uppercase mr-1">Presets:</span>
            {[
              { label: '00 : 30', h: 0, m: 30 },
              { label: '01 : 00', h: 1, m: 0 },
              { label: '02 : 00', h: 2, m: 0 },
              { label: '04 : 00', h: 4, m: 0 },
              { label: '08 : 00', h: 8, m: 0 }
            ].map(p => (
              <button
                key={p.label}
                type="button"
                onClick={() => { setEditHrs(p.h); setEditMins(p.m); }}
                className="px-2 py-0.5 bg-[#171922] hover:bg-neutral-800 border border-neutral-800 text-[9px] text-neutral-300 hover:text-white rounded-xs transition-colors cursor-pointer"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Task Deadline Input */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-[9px] uppercase tracking-widest text-neutral-400 font-semibold">Sub-Task Deadline</label>
            {editDeadline && (
              <button 
                type="button"
                onClick={() => setEditDeadline('')}
                className="text-[9px] text-rose-400 hover:underline uppercase cursor-pointer"
              >
                Clear Deadline
              </button>
            )}
          </div>
          <input 
            type="datetime-local"
            value={editDeadline}
            onChange={e => setEditDeadline(e.target.value)}
            className="w-full px-3 py-2 bg-[#0c0d12] border border-neutral-800 rounded-sm text-xs text-white outline-none focus:border-white font-mono"
          />
        </div>

        <div className="flex gap-2 justify-end pt-2 border-t border-neutral-800">
          <button onClick={() => setIsEditing(false)} className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white">Cancel</button>
          <button onClick={handleSaveEdit} className="px-4 py-1.5 bg-white text-black font-black text-xs uppercase rounded-sm hover:bg-neutral-200">Save Changes</button>
        </div>
      </div>
    );
  }

  return (
    <div 
      style={{ zIndex: (showAssignMenu || showDeadlinePicker) ? 70 : Math.max(1, 30 - (taskIndex || 0)) }}
      className={`p-4 rounded-sm border transition-all relative ${
        isCompleted && !showAssignMenu && !showDeadlinePicker 
          ? 'bg-[#0e0f14]/80 border-neutral-800/60 opacity-60' 
          : isOverdue
          ? 'bg-[#180d10] border-rose-600/50 hover:border-rose-500 shadow-[0_0_15px_-3px_rgba(244,63,94,0.15)]'
          : 'bg-[#12141a] border-neutral-800 hover:border-neutral-700'
      }`}
    >
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Left: Check, Name, Est in Hrs:MM, Role & Deadline */}
        <div className="flex items-start gap-3.5 flex-1 min-w-0">
          <button onClick={onToggle} className={`shrink-0 mt-0.5 transition-colors ${isCompleted ? 'text-emerald-400' : 'text-neutral-500 hover:text-white'}`}>
            {isCompleted ? <CheckCircle2 size={18} /> : <Circle size={18} />}
          </button>
          <div className="min-w-0 flex-1">
            <span className={`text-xs font-semibold uppercase tracking-wide block truncate ${isCompleted ? 'text-neutral-400 line-through' : 'text-white'}`}>
              {task.text}
            </span>

            {/* Sub-task Metadata: Role, Est in Hrs : MM, Act in Hrs : MM, Deadline Badge */}
            <div className="flex flex-wrap items-center gap-2 mt-1.5 font-mono text-[9px]">
              <span className="px-1.5 py-0.5 bg-[#0c0d12] border border-neutral-800 rounded-xs text-neutral-400 font-semibold uppercase">
                {task.role}
              </span>

              {/* Requirement: est should be in Hrs : MM */}
              <span 
                className="px-2 py-0.5 bg-[#171922] border border-neutral-700 text-neutral-200 font-bold tracking-wider rounded-xs"
                title="Allocated Estimate: Hours : Minutes"
              >
                EST {formatHrsMM(task.timeAllocated)} Hrs
              </span>

              {task.timeSpent ? (
                <span 
                  className="px-2 py-0.5 bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 font-bold tracking-wider rounded-xs"
                  title="Actual Tracked Time: Hours : Minutes"
                >
                  ACT {formatHrsMM(Math.floor(task.timeSpent / 60))} Hrs
                </span>
              ) : null}

              {/* Requirement: Each sub-task also needs to have a deadline */}
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeadlinePicker(!showDeadlinePicker);
                  }}
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-xs border text-[9px] font-bold uppercase transition-all cursor-pointer ${
                    task.deadline
                      ? isOverdue
                        ? 'bg-rose-950/80 border-rose-500/60 text-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.3)] animate-pulse'
                        : isDueToday
                        ? 'bg-amber-950/70 border-amber-500/60 text-amber-300'
                        : 'bg-[#181a24] border-neutral-700 text-neutral-300 hover:text-white hover:border-neutral-500'
                      : 'bg-[#0c0d12] border-dashed border-neutral-700 text-neutral-400 hover:text-white hover:border-neutral-500'
                  }`}
                  title={task.deadline ? `Sub-task Deadline: ${new Date(task.deadline).toLocaleString()}` : "Set deadline for this task node"}
                >
                  <Calendar size={11} className={task.deadline ? (isOverdue ? 'text-rose-400' : isDueToday ? 'text-amber-400' : 'text-neutral-300') : 'text-neutral-500'} />
                  <span>
                    {task.deadline
                      ? `${isOverdue ? 'OVERDUE: ' : 'DUE: '}${new Date(task.deadline).toLocaleDateString([], { month: 'short', day: 'numeric' })} ${new Date(task.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                      : 'SET DEADLINE'}
                  </span>
                </button>

                {showDeadlinePicker && (
                  <div className="absolute left-0 top-full mt-2 z-[200]" onClick={e => e.stopPropagation()}>
                    <ModernDateTimePicker 
                      title={`Sub-Task Deadline // ${task.text.slice(0, 18)}`}
                      initialValue={task.deadline ? new Date(task.deadline) : new Date(Date.now() + 86400000)}
                      onConfirm={(date) => {
                        onUpdate({ deadline: date.toISOString() });
                        setShowDeadlinePicker(false);
                      }}
                      onClose={() => setShowDeadlinePicker(false)}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5 shrink-0 self-end lg:self-center font-mono">
          {/* Timer button */}
          <button 
            onClick={onToggleTimer}
            className={`px-2.5 py-1 rounded-sm text-[10px] font-mono uppercase flex items-center gap-1.5 border transition-all ${
              isTimerActive 
                ? 'bg-rose-950/80 border-rose-500/40 text-rose-300 animate-pulse' 
                : 'bg-[#0c0d12] border-neutral-800 text-neutral-400 hover:text-white'
            }`}
            title="Task Time Tracker"
          >
            {isTimerActive ? <Pause size={12} /> : <Play size={12} />}
            <span>{isTimerActive ? 'Active' : 'Sync'}</span>
          </button>

          {/* Assignee button */}
          <div ref={assignMenuRef} className={`relative ${showAssignMenu ? 'z-50' : 'z-auto'}`}>
            <button 
              type="button"
              onClick={() => setShowAssignMenu(!showAssignMenu)}
              className="flex items-center gap-2 px-2.5 py-1 bg-[#0c0d12] border border-neutral-800 rounded-sm text-[10px] text-neutral-300 hover:text-white hover:border-neutral-700 transition-colors cursor-pointer"
            >
              {assignedStaff ? (
                <div className="flex items-center gap-1.5">
                  <img src={assignedStaff.avatarUrl} className="w-4 h-4 rounded-full object-cover" alt="" />
                  <span className="uppercase text-[9px]">{assignedStaff.name.split(' ')[0]}</span>
                </div>
              ) : (
                <span className="text-neutral-500 uppercase text-[9px]">Assign</span>
              )}
              <ChevronDown size={11} className={`text-neutral-500 transition-transform ${showAssignMenu ? 'rotate-180' : ''}`} />
            </button>

            {showAssignMenu && (
              <div 
                className="absolute right-0 top-full mt-2 w-64 bg-[#0e1017] border border-neutral-700 rounded-sm shadow-[0_20px_40px_rgba(0,0,0,0.9),0_0_20px_rgba(0,0,0,0.8)] z-[100] p-2 space-y-1 font-mono text-xs animate-in fade-in zoom-in-95 duration-100" 
                onClick={e => e.stopPropagation()}
              >
                <div className="text-[9px] uppercase tracking-widest text-neutral-400 px-2 py-1 font-bold border-b border-neutral-800/80 pb-1.5">
                  Assign Specialist
                </div>
                <div className="max-h-56 overflow-y-auto custom-scrollbar space-y-1 pt-1">
                  {staffList.map(s => (
                    <button
                      key={s.id}
                      onClick={() => { onAssign(s.id); setShowAssignMenu(false); }}
                      className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-sm text-left transition-colors cursor-pointer ${
                        task.assignedTo === s.id ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:bg-[#181a24] hover:text-white'
                      }`}
                    >
                      <img src={s.avatarUrl} className="w-5 h-5 rounded-full object-cover" alt="" />
                      <div className="truncate min-w-0">
                        <div className="text-[10px] font-bold text-white uppercase truncate">{s.name}</div>
                        <div className="text-[8px] text-neutral-500 uppercase truncate">{s.role}</div>
                      </div>
                    </button>
                  ))}
                  {task.assignedTo && (
                    <button onClick={() => { onAssign(''); setShowAssignMenu(false); }} className="w-full text-left px-2 py-1.5 text-[9px] text-rose-400 hover:bg-rose-950/20 uppercase cursor-pointer">
                      Remove Assignee
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Notes toggle */}
          <button 
            onClick={() => setShowNotes(!showNotes)}
            className={`p-1.5 rounded-sm border transition-colors ${showNotes ? 'bg-neutral-800 text-white border-neutral-700' : 'bg-[#0c0d12] text-neutral-500 hover:text-white border-neutral-800'}`}
            title="Task Notes"
          >
            <StickyNote size={13} />
          </button>

          {/* Edit task */}
          <button 
            onClick={() => setIsEditing(true)}
            className="p-1.5 rounded-sm bg-[#0c0d12] text-neutral-500 hover:text-white border border-neutral-800 transition-colors"
            title="Edit Task"
          >
            <Pencil size={13} />
          </button>
        </div>
      </div>

      {/* Task Notes Section */}
      {showNotes && (
        <div className="mt-3 pt-3 border-t border-neutral-800/80 font-mono space-y-2">
          <div className="flex justify-between items-center text-[9px] text-neutral-500 uppercase tracking-widest">
            <span>Task Intelligence Log</span>
            <button 
              onClick={() => { onUpdate({ notes: tempNotes }); setShowNotes(false); }}
              className="text-white hover:underline flex items-center gap-1"
            >
              <Save size={10} /> Save Log
            </button>
          </div>
          <textarea 
            value={tempNotes}
            onChange={e => setTempNotes(e.target.value)}
            placeholder="Enter operational notes or specific intelligence..."
            className="w-full p-2.5 bg-[#0c0d12] border border-neutral-800 text-xs text-neutral-200 outline-none rounded-sm resize-none h-20"
          />
        </div>
      )}
    </div>
  );
};

const StepCard: React.FC<StepCardProps> = ({ 
    step, completedTasks, onToggleTask, isActive, staffList, onAssignTask, onUpdateStep, onUpdateTask, onToggleTimer, activeTimerTaskId, onDeleteStep
}) => {
  const [isExpanded, setIsExpanded] = useState(isActive);
  const [showPicker, setShowPicker] = useState(false);
  const [isEditingStep, setIsEditingStep] = useState(false);
  const [stepFormData, setStepFormData] = useState({ title: step.title, description: step.description });
  
  const tasks = [...step.tasks, ...(step.subSteps?.flatMap(ss => ss.tasks) || [])];
  const completedCount = tasks.filter(t => completedTasks[t.id]).length;
  const progress = tasks.length === 0 ? 0 : Math.round((completedCount / tasks.length) * 100);

  const handleSaveStep = () => {
    onUpdateStep(step.id, stepFormData);
    setIsEditingStep(false);
  };

  const handleAddTask = () => {
    const defaultDeadline = step.deadline 
      ? new Date(step.deadline).toISOString() 
      : new Date(Date.now() + 86400000).toISOString();

    const newTask: Task = {
      id: `${step.id}-${Date.now()}`,
      text: 'New Operational Directive',
      completed: false,
      role: Role.AE,
      timeAllocated: 60,
      timeSpent: 0,
      deadline: defaultDeadline,
      priority: 'Medium'
    };
    onUpdateStep(step.id, { tasks: [...step.tasks, newTask] });
  };

  const handleAddSubTask = () => {
    const defaultDeadline = step.deadline 
      ? new Date(step.deadline).toISOString() 
      : new Date(Date.now() + 86400000).toISOString();

    const newSubTask: Task = {
      id: `sub-${step.id}-${Date.now()}`,
      text: 'New Sub-Directive Node',
      completed: false,
      role: Role.AE,
      timeAllocated: 30, // 00:30 Hrs
      timeSpent: 0,
      deadline: defaultDeadline,
      priority: 'Medium'
    };
    const currentSubSteps = step.subSteps || [{ tasks: [] }];
    const firstSubStep = currentSubSteps[0] || { tasks: [] };
    const updatedSubSteps = [
      { ...firstSubStep, tasks: [...firstSubStep.tasks, newSubTask] },
      ...currentSubSteps.slice(1)
    ];
    onUpdateStep(step.id, { subSteps: updatedSubSteps });
  };

  const handleDeleteTask = (taskId: string) => {
    onUpdateStep(step.id, { tasks: step.tasks.filter(t => t.id !== taskId) });
  };

  return (
    <div 
      style={{ zIndex: isExpanded ? Math.max(1, 25 - step.id) : 1 }}
      className={`bg-[#0a0b0e] border rounded-sm transition-all relative ${
        isActive ? 'border-white/60 shadow-lg' : 'border-neutral-800 hover:border-neutral-700'
      }`}
    >
      {/* Header Row */}
      <div 
        onClick={() => !isEditingStep && setIsExpanded(!isExpanded)}
        className="p-6 flex items-center justify-between cursor-pointer select-none transition-colors hover:bg-[#12141a]/40"
      >
        <div className="flex items-center gap-5 min-w-0 flex-1">
          <div className={`w-10 h-10 rounded-sm flex items-center justify-center font-mono text-xs font-black shrink-0 border ${
            progress === 100 
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400' 
              : isActive 
                ? 'bg-white text-black border-white' 
                : 'bg-[#12141a] border-neutral-800 text-neutral-400'
          }`}>
            {step.id}
          </div>

          <div className="min-w-0 flex-1">
            {isEditingStep ? (
              <div className="space-y-2 max-w-xl animate-in fade-in" onClick={e => e.stopPropagation()}>
                <input 
                  value={stepFormData.title}
                  onChange={e => setStepFormData({...stepFormData, title: e.target.value.toUpperCase()})}
                  className="w-full px-3 py-1.5 bg-[#12141a] border border-neutral-700 rounded-sm font-mono text-xs text-white outline-none"
                  autoFocus
                />
                <input 
                  value={stepFormData.description}
                  onChange={e => setStepFormData({...stepFormData, description: e.target.value})}
                  className="w-full px-3 py-1 bg-[#12141a] border border-neutral-700 rounded-sm font-mono text-xs text-neutral-400 outline-none"
                  placeholder="Phase description..."
                />
                <div className="flex gap-2 pt-1 font-mono text-xs">
                  <button onClick={handleSaveStep} className="px-3 py-1 bg-white text-black font-black uppercase rounded-sm">Save</button>
                  <button onClick={() => setIsEditingStep(false)} className="px-3 py-1 text-neutral-400">Cancel</button>
                  {onDeleteStep && (
                    <button onClick={() => onDeleteStep(step.id)} className="ml-auto text-rose-400 hover:text-rose-300 transition-colors" title="Delete phase">
                      Delete Phase
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <h3 className="font-heading font-black text-white uppercase text-base truncate tracking-tight">
                    {step.title}
                  </h3>
                  {isActive && (
                    <span className="font-mono text-[9px] uppercase px-2 py-0.2 rounded-sm bg-neutral-900 border border-neutral-700 text-neutral-300">
                      ACTIVE PHASE
                    </span>
                  )}
                  <button 
                    onClick={(e) => { e.stopPropagation(); setIsEditingStep(true); }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-neutral-500 hover:text-white"
                  >
                    <Settings size={12} />
                  </button>
                </div>

                <div className="relative mt-1">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setShowPicker(!showPicker); }}
                    className="font-mono text-[10px] text-neutral-500 uppercase tracking-wider flex items-center gap-1.5 hover:text-neutral-300"
                  >
                    <Calendar size={12} />
                    <span>{step.deadline ? `DUE: ${new Date(step.deadline).toLocaleDateString()}` : 'SET TARGET DATE'}</span>
                  </button>

                  {showPicker && (
                    <ModernDateTimePicker 
                      title="Milestone Target"
                      initialValue={step.deadline ? new Date(step.deadline) : undefined}
                      onConfirm={(date) => onUpdateStep(step.id, { deadline: date })}
                      onClose={() => setShowPicker(false)}
                    />
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-6 shrink-0 font-mono">
          <div className="text-right">
            <span className={`text-xl font-black ${progress === 100 ? 'text-emerald-400' : 'text-white'}`}>
              {progress}%
            </span>
            <div className="text-[9px] text-neutral-500 uppercase">
              {completedCount}/{tasks.length} TASKS
            </div>
          </div>
          <div className="p-1.5 text-neutral-400">
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>
      </div>

      {/* Expanded Tasks List */}
      {isExpanded && (
        <div className="p-6 border-t border-neutral-800 bg-[#07080a] space-y-3">
          {step.tasks.map((task, taskIdx) => (
            <TaskItem 
              key={task.id} 
              task={task} 
              taskIndex={taskIdx}
              isCompleted={!!completedTasks[task.id]} 
              onToggle={() => onToggleTask(task.id)} 
              staffList={staffList} 
              onAssign={(id) => onAssignTask(task.id, id)}
              onUpdate={(updates) => onUpdateTask(task.id, updates)}
              onDelete={() => handleDeleteTask(task.id)}
              onToggleTimer={() => onToggleTimer(task.id)}
              activeTimerTaskId={activeTimerTaskId}
            />
          ))}

          {/* Sub-steps / Sub-tasks rendering */}
          {step.subSteps && step.subSteps.length > 0 && (
            <div className="space-y-3 pt-3 border-t border-neutral-800/80">
              <div className="font-mono text-[10px] text-neutral-400 uppercase tracking-widest flex items-center justify-between">
                <span>SUB-TASK / SUB-STEP DIRECTIVES</span>
              </div>
              {step.subSteps.map((subStep, ssIdx) => (
                <div key={`substep-${ssIdx}`} className="space-y-2 pl-3 border-l-2 border-neutral-800">
                  <div className="text-[9px] font-mono uppercase text-neutral-500 font-bold">
                    Sub-Phase {ssIdx + 1}
                  </div>
                  {subStep.tasks.map((task, tIdx) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      taskIndex={tIdx}
                      isCompleted={!!completedTasks[task.id]}
                      onToggle={() => onToggleTask(task.id)}
                      staffList={staffList}
                      onAssign={(id) => onAssignTask(task.id, id)}
                      onUpdate={(updates) => onUpdateTask(task.id, updates)}
                      onDelete={() => {
                        const newSubSteps = step.subSteps!.map((ss, i) => 
                          i === ssIdx ? { ...ss, tasks: ss.tasks.filter(t => t.id !== task.id) } : ss
                        );
                        onUpdateStep(step.id, { subSteps: newSubSteps });
                      }}
                      onToggleTimer={() => onToggleTimer(task.id)}
                      activeTimerTaskId={activeTimerTaskId}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
            <button 
              onClick={(e) => { e.stopPropagation(); handleAddTask(); }}
              className="flex-1 py-3 border border-dashed border-neutral-800 hover:border-neutral-600 rounded-sm font-mono text-xs uppercase tracking-wider text-neutral-400 hover:text-white transition-colors flex items-center justify-center gap-2 cursor-pointer w-full"
            >
              <Plus size={14} /> Append Directive Node
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); handleAddSubTask(); }}
              className="px-4 py-3 border border-dashed border-neutral-800 hover:border-neutral-600 rounded-sm font-mono text-xs uppercase tracking-wider text-neutral-400 hover:text-white transition-colors flex items-center justify-center gap-2 cursor-pointer w-full sm:w-auto"
              title="Add a sub-task directive node with individual deadline"
            >
              <Plus size={14} /> Append Sub-Task Node
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StepCard;
