import React, { useState } from 'react';
import { DailyCompiledReport, DailyReportConfig, StaffMember, Project, Todo } from '../types';
import { 
  Clock, CheckCircle2, Send, Users, ChevronDown, ChevronUp, 
  Settings, Sparkles, Activity, FileText, Check, ShieldAlert
} from 'lucide-react';

interface DailyReportWidgetProps {
  report: DailyCompiledReport | null;
  config: DailyReportConfig;
  onOpenSettings: () => void;
  onManualDispatch: () => Promise<void>;
  isDispatching: boolean;
  canManageSettings: boolean;
}

export const DailyReportWidget: React.FC<DailyReportWidgetProps> = ({
  report,
  config,
  onOpenSettings,
  onManualDispatch,
  isDispatching,
  canManageSettings
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const todayStr = new Date().toISOString().split('T')[0];
  const isSentToday = report && report.reportDate === todayStr && report.dispatchStatus === 'DELIVERED';

  return (
    <div className="bg-[#090a0f] border border-[var(--jarvis-border)] hover:border-[var(--jarvis-primary)] transition-all rounded-sm overflow-hidden shadow-[0_0_30px_-8px_rgba(var(--jarvis-primary-rgb),0.25)]">
      
      {/* Top Banner */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-[rgba(var(--jarvis-primary-rgb),0.15)] via-[#0d0e14] to-[#0d0e14] border-b border-[var(--jarvis-border)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-9 h-9 rounded-sm bg-black/80 border border-[var(--jarvis-primary)] flex items-center justify-center text-[var(--jarvis-primary)] shadow-[0_0_12px_rgba(var(--jarvis-primary-rgb),0.4)] shrink-0">
            <Clock size={18} className={config.enabled ? 'animate-pulse' : ''} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-[var(--jarvis-primary)] font-black">
                EXECUTIVE EOD DIGEST // OPERATIONS COMPILATION
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--jarvis-primary)] animate-ping" />
            </div>
            <h3 className="font-heading font-black text-white text-base sm:text-lg uppercase tracking-tight flex items-center gap-2 mt-0.5">
              <span>Today's Daily Reporting & Accomplishments</span>
              <span className={`px-2 py-0.5 text-[10px] font-mono rounded-xs font-black uppercase ${
                isSentToday 
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50' 
                  : 'bg-amber-950 text-amber-300 border border-amber-500/50'
              }`}>
                {isSentToday ? 'Compiled & Dispatched' : `Scheduled for ${config.scheduleTime || '19:00'} (7:00 PM)`}
              </span>
            </h3>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {canManageSettings && (
            <button
              type="button"
              disabled={isDispatching}
              onClick={onManualDispatch}
              className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:opacity-90 disabled:opacity-40 text-black font-mono font-black text-xs uppercase rounded-sm flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Instantly compile today's work and email to GM, Managers, and Admins"
            >
              <Send size={13} className={isDispatching ? 'animate-spin' : ''} />
              {isDispatching ? 'Compiling...' : 'Compile & Email Now'}
            </button>
          )}

          {canManageSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="p-2 bg-black/60 border border-neutral-700 hover:border-[var(--jarvis-primary)] text-neutral-300 hover:text-white rounded-sm transition-colors cursor-pointer"
              title="Open Daily Report Settings in Admin Menu"
            >
              <Settings size={15} />
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3 py-1.5 bg-black/60 border border-neutral-700 hover:border-neutral-500 text-neutral-300 hover:text-white font-mono text-xs rounded-sm flex items-center gap-1 cursor-pointer transition-colors"
          >
            {isExpanded ? (
              <>Collapse <ChevronUp size={14} /></>
            ) : (
              <>Inspect Team Breakdown <ChevronDown size={14} /></>
            )}
          </button>
        </div>
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-neutral-800/80 bg-[#0c0d13] border-b border-neutral-800 font-mono">
        <div className="p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-sm bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
            <CheckCircle2 size={16} />
          </div>
          <div>
            <div className="text-[10px] text-neutral-400 uppercase">Directives Done Today</div>
            <div className="text-xl font-black text-white font-heading mt-0.5">
              {report?.totalCompletedToday ?? 0}
            </div>
          </div>
        </div>

        <div className="p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-sm bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
            <Activity size={16} />
          </div>
          <div>
            <div className="text-[10px] text-neutral-400 uppercase">Active Directives</div>
            <div className="text-xl font-black text-white font-heading mt-0.5">
              {report?.totalActiveDirectives ?? 0}
            </div>
          </div>
        </div>

        <div className="p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-sm bg-amber-950/60 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
            <Clock size={16} />
          </div>
          <div>
            <div className="text-[10px] text-neutral-400 uppercase">Operational Hours</div>
            <div className="text-xl font-black text-white font-heading mt-0.5">
              {report?.totalHoursLogged ?? 0}h
            </div>
          </div>
        </div>

        <div className="p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-sm bg-purple-950/60 border border-purple-500/40 flex items-center justify-center text-purple-400 shrink-0">
            <Sparkles size={16} />
          </div>
          <div>
            <div className="text-[10px] text-neutral-400 uppercase">Avg Velocity</div>
            <div className="text-xl font-black text-[var(--jarvis-primary)] font-heading mt-0.5">
              {report?.averageEfficiency ?? 85}%
            </div>
          </div>
        </div>
      </div>

      {/* Memo Quote */}
      {report?.summaryMemo && (
        <div className="px-4 py-3 bg-[#0a0b10] border-b border-neutral-800/80 font-mono text-xs text-neutral-300 flex items-center gap-2">
          <span className="text-[var(--jarvis-primary)] font-black text-[10px] uppercase shrink-0">EXECUTIVE MEMO:</span>
          <span className="truncate">{report.summaryMemo}</span>
        </div>
      )}

      {/* Expandable Staff Accomplishments */}
      {isExpanded && (
        <div className="p-4 sm:p-5 bg-[#08090d] space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between font-mono text-xs text-neutral-400">
            <span className="uppercase font-bold tracking-wider">Staff Performance & Daily Output Breakdown</span>
            <span>Target Recipients: GM, Management, Directors, and Admins</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono">
            {(report?.staffAccomplishments || []).map(staff => {
              const totalDone = staff.completedTasks.length + staff.dailyTodosCompleted.length;
              return (
                <div key={staff.staffId} className="bg-[#0e0f16] border border-neutral-800 p-3 rounded-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                        src={staff.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${staff.staffId}`}
                        alt={staff.name}
                        className="w-6 h-6 rounded-full border border-neutral-700 object-cover shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-white text-xs truncate">{staff.name}</div>
                        <div className="text-[9px] text-neutral-400 truncate">{staff.role} // {staff.department}</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-emerald-400">{totalDone} Done</div>
                      <div className="text-[9px] text-neutral-500">{staff.efficiencyScore}% Velocity</div>
                    </div>
                  </div>

                  {totalDone > 0 ? (
                    <div className="space-y-1 pt-1.5 border-t border-neutral-800/60 pl-2">
                      {staff.completedTasks.slice(0, 3).map(t => (
                        <div key={t.id} className="text-[10px] text-emerald-300 flex items-center gap-1.5 truncate">
                          <CheckCircle2 size={10} className="text-emerald-400 shrink-0" />
                          <span className="truncate">{t.text}</span>
                        </div>
                      ))}
                      {staff.dailyTodosCompleted.slice(0, 2).map(t => (
                        <div key={t.id} className="text-[10px] text-emerald-300 flex items-center gap-1.5 truncate">
                          <CheckCircle2 size={10} className="text-emerald-400 shrink-0" />
                          <span className="truncate">{t.text} [Daily]</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[10px] text-neutral-500 italic pt-1 pl-2">
                      No directives marked finished today.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
};
