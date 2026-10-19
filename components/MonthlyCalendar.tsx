import React, { useState, useMemo, useEffect } from 'react';
import { CalendarEvent, Project, StaffMember, LeaveRequest } from '../types';
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Clock, 
  Target, CheckCircle2, AlertCircle, Users, X, MapPin, Eye, Filter,
  ExternalLink, Video, Trash2, Check, RefreshCw, Mail, LogOut,
  Sparkles, Tag, ShieldCheck
} from 'lucide-react';
import { 
  fetchCalendarEvents, 
  createCalendarEvent, 
  deleteCalendarEvent, 
  GoogleCalendarEvent 
} from '../utils/googleCalendarService';
import { 
  googleSignIn, 
  logoutGoogle, 
  initAuth 
} from '../firebase';

interface MonthlyCalendarProps {
  events: CalendarEvent[];
  projects?: Project[];
  staffList?: StaffMember[];
  leaveRequests?: LeaveRequest[];
  onAddEvent: (event: CalendarEvent) => void;
  onDeleteEvent?: (eventId: string) => void;
  currentUser: StaffMember;
  onNotifyStaff?: (staffIds: string[], text: string) => void;
}

const MonthlyCalendar: React.FC<MonthlyCalendarProps> = ({
  events,
  projects = [],
  staffList = [],
  leaveRequests = [],
  onAddEvent,
  onDeleteEvent,
  currentUser,
  onNotifyStaff
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [filterType, setFilterType] = useState<'ALL' | 'google' | 'deadlines' | 'leaves' | 'internal'>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'agenda'>('grid');

  // Google Calendar Integration State
  const [token, setToken] = useState<string | null>(null);
  const [googleUser, setGoogleUser] = useState<any | null>(null);
  const [googleEvents, setGoogleEvents] = useState<GoogleCalendarEvent[]>([]);
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  // Destructive delete confirmation modal (per workspace integration skill)
  const [eventToDelete, setEventToDelete] = useState<{ id: string; title: string; isGoogle: boolean } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // New Event Form State
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    location: '',
    startDate: new Date().toISOString().split('T')[0],
    startTime: '10:00',
    endDate: new Date().toISOString().split('T')[0],
    endTime: '11:00',
    type: 'meeting' as 'meeting' | 'deadline' | 'personal',
    syncToGoogle: true,
    addMeetLink: true,
    taggedStaffIds: [] as string[]
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Initialize Auth listener for Google Calendar
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, cachedToken) => {
        setGoogleUser(user);
        setToken(cachedToken);
        loadGoogleEvents(cachedToken, currentDate);
      },
      () => {
        setGoogleUser(null);
        setToken(null);
      }
    );

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const loadGoogleEvents = async (accessToken: string, targetDate: Date) => {
    setIsLoadingGoogle(true);
    setGoogleError(null);
    try {
      const minDate = new Date(targetDate.getFullYear(), targetDate.getMonth() - 1, 1);
      const maxDate = new Date(targetDate.getFullYear(), targetDate.getMonth() + 2, 0);
      const fetched = await fetchCalendarEvents(accessToken, minDate, maxDate);
      setGoogleEvents(fetched);
    } catch (err: any) {
      if (err.message === 'TOKEN_EXPIRED') {
        setToken(null);
        setGoogleError('Google Workspace session expired. Please reconnect.');
      } else {
        setGoogleError(err.message || 'Failed to fetch Google Calendar events.');
      }
    } finally {
      setIsLoadingGoogle(false);
    }
  };

  const handleConnectGoogle = async () => {
    setIsLoadingGoogle(true);
    setGoogleError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setToken(result.accessToken);
        setGoogleUser(result.user);
        await loadGoogleEvents(result.accessToken, currentDate);
      }
    } catch (err: any) {
      console.error('Google Sign In Error:', err);
      setGoogleError(err.message || 'Google authorization was cancelled or failed.');
    } finally {
      setIsLoadingGoogle(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    await logoutGoogle();
    setToken(null);
    setGoogleUser(null);
    setGoogleEvents([]);
  };

  const handlePrevMonth = () => {
    const nextD = new Date(year, month - 1, 1);
    setCurrentDate(nextD);
    if (token) loadGoogleEvents(token, nextD);
  };

  const handleNextMonth = () => {
    const nextD = new Date(year, month + 1, 1);
    setCurrentDate(nextD);
    if (token) loadGoogleEvents(token, nextD);
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(now);
    if (token) loadGoogleEvents(token, now);
  };

  // Month days calculation
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const days: { date: Date; isCurrentMonth: boolean; isToday: boolean }[] = [];

    // Previous month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthDays - i);
      days.push({ date: d, isCurrentMonth: false, isToday: false });
    }

    // Current month days
    const today = new Date();
    for (let i = 1; i <= totalDaysInMonth; i++) {
      const d = new Date(year, month, i);
      const isToday = 
        d.getDate() === today.getDate() && 
        d.getMonth() === today.getMonth() && 
        d.getFullYear() === today.getFullYear();
      days.push({ date: d, isCurrentMonth: true, isToday });
    }

    // Next month padding to fill multiple of 7
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({ date: d, isCurrentMonth: false, isToday: false });
    }

    return days;
  }, [year, month]);

  // Aggregate items per date
  const getDayItems = (date: Date) => {
    const dStr = date.toDateString();

    const dayInternalEvents = events.filter(ev => new Date(ev.date).toDateString() === dStr);

    const dayGoogleEvents = googleEvents.filter(ev => {
      const startRaw = ev.start?.dateTime || ev.start?.date;
      if (!startRaw) return false;
      const evDate = new Date(startRaw);
      return evDate.toDateString() === dStr;
    });

    const dayDeadlines = projects.filter(p => {
      if (!p.dueDate) return false;
      return new Date(p.dueDate).toDateString() === dStr;
    });

    const dayLeaves = leaveRequests.filter(l => {
      if (l.status !== 'Approved') return false;
      const s = new Date(l.startDate);
      s.setHours(0, 0, 0, 0);
      const e = new Date(l.endDate);
      e.setHours(23, 59, 59, 999);
      return date >= s && date <= e;
    });

    return {
      internalEvents: dayInternalEvents,
      googleEvents: dayGoogleEvents,
      deadlines: dayDeadlines,
      leaves: dayLeaves,
      total: dayInternalEvents.length + dayGoogleEvents.length + dayDeadlines.length + dayLeaves.length
    };
  };

  const selectedDayItems = useMemo(() => {
    return getDayItems(selectedDate);
  }, [selectedDate, events, googleEvents, projects, leaveRequests]);

  const handleOpenAddModalForDate = (date?: Date) => {
    const target = date || selectedDate;
    setSelectedDate(target);
    const dateStr = target.toISOString().split('T')[0];
    setEventForm({
      title: '',
      description: '',
      location: '',
      startDate: dateStr,
      startTime: '10:00',
      endDate: dateStr,
      endTime: '11:00',
      type: 'meeting',
      syncToGoogle: !!token,
      addMeetLink: true,
      taggedStaffIds: []
    });
    setIsAddModalOpen(true);
  };

  const toggleTagStaff = (staffId: string) => {
    setEventForm(prev => {
      const exists = prev.taggedStaffIds.includes(staffId);
      return {
        ...prev,
        taggedStaffIds: exists 
          ? prev.taggedStaffIds.filter(id => id !== staffId)
          : [...prev.taggedStaffIds, staffId]
      };
    });
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventForm.title.trim()) return;

    const [hours, minutes] = eventForm.startTime.split(':').map(Number);
    const dateObj = new Date(eventForm.startDate);
    dateObj.setHours(hours || 9, minutes || 0, 0, 0);

    const taggedStaff = staffList.filter(s => eventForm.taggedStaffIds.includes(s.id));
    const taggedNames = taggedStaff.map(s => s.name).join(', ');

    // 1. Sync to Google Calendar if enabled & connected
    if (token && eventForm.syncToGoogle) {
      try {
        const attendees = taggedStaff.map(s => ({
          email: s.email,
          displayName: s.name
        }));

        await createCalendarEvent(token, {
          summary: eventForm.title.trim(),
          description: eventForm.description ? `${eventForm.description}\n\nTagged Agency Personnel: ${taggedNames}` : `Tagged Personnel: ${taggedNames}`,
          location: eventForm.location,
          startDate: eventForm.startDate,
          startTime: eventForm.startTime,
          endDate: eventForm.endDate,
          endTime: eventForm.endTime,
          attendees,
          createMeetCall: eventForm.addMeetLink
        });

        // Reload Google events
        await loadGoogleEvents(token, currentDate);
      } catch (err: any) {
        console.error('Failed to sync to Google Calendar:', err);
      }
    }

    // 2. Add to internal agency event system
    const newEv: CalendarEvent = {
      id: `ev-${Date.now()}`,
      title: taggedStaff.length > 0 ? `${eventForm.title.trim()} [with ${taggedStaff[0].name.split(' ')[0]}${taggedStaff.length > 1 ? ` +${taggedStaff.length - 1}` : ''}]` : eventForm.title.trim(),
      date: dateObj,
      type: eventForm.type,
      userId: currentUser.id
    };

    onAddEvent(newEv);

    // 3. Notify tagged personnel
    if (onNotifyStaff && eventForm.taggedStaffIds.length > 0) {
      onNotifyStaff(
        eventForm.taggedStaffIds,
        `You were tagged in calendar event "${eventForm.title}" on ${dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${eventForm.startTime}`
      );
    }

    setIsAddModalOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (!eventToDelete) return;
    setIsDeleting(true);
    try {
      if (eventToDelete.isGoogle && token) {
        await deleteCalendarEvent(token, eventToDelete.id);
        await loadGoogleEvents(token, currentDate);
      } else if (onDeleteEvent) {
        onDeleteEvent(eventToDelete.id);
      }
      setEventToDelete(null);
    } catch (err: any) {
      setGoogleError(err.message || 'Failed to delete event');
    } finally {
      setIsDeleting(false);
    }
  };

  const monthNames = [
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
  ];

  const weekDayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  return (
    <div className="bg-[#0a0b0e] border border-neutral-800 rounded-sm overflow-hidden space-y-0">
      {/* Calendar Header Bar */}
      <div className="p-6 bg-[#0e0f14] border-b border-neutral-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-sm bg-[#14151c] border border-neutral-700/80 flex items-center justify-center text-white">
            <CalendarIcon size={20} />
          </div>
          <div>
            <div className="font-mono text-[9px] text-neutral-400 uppercase tracking-[0.25em] flex items-center gap-2">
              <span>TEMPORAL MATRIX // STRATEGIC HORIZON</span>
              {token && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399] animate-pulse" />
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight font-heading flex items-center gap-2">
              <span>{monthNames[month]}</span>
              <span className="text-neutral-500 font-light">{year}</span>
            </h2>
          </div>
        </div>

        {/* Controls: Google Sync, Prev/Today/Next & Filters */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Google Calendar Connection Status Button */}
          {token ? (
            <div className="flex items-center gap-1.5 bg-[#12141a] border border-neutral-800 px-3 py-1.5 rounded-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="font-mono text-[10px] text-neutral-300 truncate max-w-[150px]">
                {googleUser?.email || 'Google Connected'}
              </span>
              <button
                type="button"
                onClick={() => loadGoogleEvents(token, currentDate)}
                className="p-1 text-neutral-400 hover:text-white transition-colors"
                title="Sync Google Calendar"
              >
                <RefreshCw size={12} className={isLoadingGoogle ? 'animate-spin' : ''} />
              </button>
              <button
                type="button"
                onClick={handleDisconnectGoogle}
                className="p-1 text-neutral-400 hover:text-rose-400 transition-colors"
                title="Disconnect Google Account"
              >
                <LogOut size={12} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleConnectGoogle}
              disabled={isLoadingGoogle}
              className="gsi-material-button flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-neutral-100 text-neutral-900 rounded-sm font-semibold text-xs transition-all shadow-sm cursor-pointer"
            >
              <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-3.5 h-3.5 shrink-0">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              <span>{isLoadingGoogle ? 'Connecting...' : 'Connect Google Calendar'}</span>
            </button>
          )}

          {/* Grid vs Agenda */}
          <div className="flex items-center bg-[#12141a] border border-neutral-800 rounded-sm p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 font-mono text-[10px] uppercase rounded-xs transition-all cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-black font-black' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Month Grid
            </button>
            <button
              type="button"
              onClick={() => setViewMode('agenda')}
              className={`px-3 py-1.5 font-mono text-[10px] uppercase rounded-xs transition-all cursor-pointer ${
                viewMode === 'agenda' ? 'bg-white text-black font-black' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Day Agenda
            </button>
          </div>

          {/* Prev/Today/Next */}
          <div className="flex items-center bg-[#12141a] border border-neutral-800 rounded-sm p-0.5">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="px-3 py-1 font-mono text-[10px] text-neutral-300 hover:text-white uppercase tracking-wider transition-colors cursor-pointer"
            >
              Today
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title="Next Month"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => handleOpenAddModalForDate()}
            className="px-4 py-2 bg-white text-black hover:bg-neutral-200 font-black font-mono text-xs uppercase tracking-wider rounded-sm transition-all shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Plus size={14} strokeWidth={3} /> Add Event
          </button>
        </div>
      </div>

      {/* Google Error Message */}
      {googleError && (
        <div className="mx-6 mt-4 p-3 bg-rose-950/40 border border-rose-500/30 rounded-sm text-xs font-mono text-rose-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0 text-rose-400" />
            <span>{googleError}</span>
          </div>
          <button onClick={() => setGoogleError(null)} className="text-neutral-400 hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Main Grid View */}
      {viewMode === 'grid' && (
        <div className="p-4 sm:p-6 space-y-4">
          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center font-mono text-[10px] font-black uppercase text-neutral-500 tracking-[0.2em] pb-1">
            {weekDayNames.map(wd => (
              <div key={wd} className="py-1">
                {wd}
              </div>
            ))}
          </div>

          {/* Days Cells Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {calendarDays.map(({ date, isCurrentMonth, isToday }, idx) => {
              const items = getDayItems(date);
              const isSelected = date.toDateString() === selectedDate.toDateString();

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedDate(date)}
                  className={`min-h-[85px] sm:min-h-[110px] p-2 rounded-sm border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-[#181a24] border-white shadow-[0_0_15px_rgba(255,255,255,0.08)]'
                      : isToday
                      ? 'bg-[#141620] border-emerald-500/60'
                      : isCurrentMonth
                      ? 'bg-[#0f1016] border-neutral-850 hover:border-neutral-700 hover:bg-[#13151d]'
                      : 'bg-[#08090c] border-neutral-900/60 opacity-35 hover:opacity-70'
                  }`}
                >
                  {/* Top Bar inside cell: Date number & Indicator */}
                  <div className="flex items-center justify-between">
                    <span className={`font-mono text-xs font-bold leading-none ${
                      isToday
                        ? 'px-1.5 py-0.5 bg-emerald-400 text-black rounded-xs shadow-sm font-black'
                        : isSelected
                        ? 'text-white'
                        : isCurrentMonth
                        ? 'text-neutral-300'
                        : 'text-neutral-600'
                    }`}>
                      {date.getDate()}
                    </span>

                    {items.total > 0 && (
                      <span className="font-mono text-[9px] text-neutral-400 font-bold">
                        {items.total}
                      </span>
                    )}
                  </div>

                  {/* Day Pills / Badges */}
                  <div className="space-y-1 mt-1.5 overflow-hidden">
                    {/* Google Calendar Events */}
                    {items.googleEvents.slice(0, 1).map(gev => (
                      <div
                        key={gev.id}
                        className="px-1.5 py-0.5 rounded-xs text-[9px] font-mono truncate bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 flex items-center gap-1"
                        title={`Google Calendar: ${gev.summary}`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                        <span className="truncate">{gev.summary}</span>
                      </div>
                    ))}

                    {/* Agency Events */}
                    {items.internalEvents.slice(0, 1).map(ev => (
                      <div
                        key={ev.id}
                        className={`px-1.5 py-0.5 rounded-xs text-[9px] font-mono truncate flex items-center gap-1 ${
                          ev.type === 'deadline'
                            ? 'bg-rose-950/70 border border-rose-500/40 text-rose-300'
                            : 'bg-sky-950/70 border border-sky-500/40 text-sky-300'
                        }`}
                        title={`${ev.title}`}
                      >
                        <span className="w-1 h-1 rounded-full bg-current shrink-0" />
                        <span className="truncate">{ev.title}</span>
                      </div>
                    ))}

                    {/* Project Deadlines */}
                    {items.deadlines.slice(0, 1).map(p => (
                      <div
                        key={p.id}
                        className="px-1.5 py-0.5 rounded-xs text-[9px] font-mono truncate bg-amber-950/70 border border-amber-500/40 text-amber-300 flex items-center gap-1"
                        title={`Campaign Deadline: ${p.projectName} (${p.jobNumber})`}
                      >
                        <Clock size={8} className="shrink-0" />
                        <span className="truncate">{p.jobNumber}</span>
                      </div>
                    ))}

                    {/* Leaves */}
                    {items.leaves.slice(0, 1).map(l => (
                      <div
                        key={l.id}
                        className="px-1.5 py-0.5 rounded-xs text-[9px] font-mono truncate bg-rose-950/80 border border-rose-500/50 text-rose-300 flex items-center gap-1"
                        title={`Leave: ${l.staffName} (${l.type})`}
                      >
                        <Users size={8} className="shrink-0" />
                        <span className="truncate">{l.staffName.split(' ')[0]}</span>
                      </div>
                    ))}

                    {items.total > 2 && (
                      <div className="text-[8px] font-mono text-neutral-500 text-right">
                        +{items.total - 2} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Date Inspector Drawer below grid */}
          <div className="mt-6 pt-5 border-t border-neutral-800 bg-[#0e0f14] p-5 rounded-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="font-mono text-[10px] text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                <span>INSPECTING DATE:</span>
                <strong className="text-white">
                  {selectedDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </strong>
              </div>
              <div className="flex flex-wrap items-center gap-3 font-mono text-xs text-neutral-300">
                <span>{selectedDayItems.googleEvents.length} Google Events</span>
                <span>•</span>
                <span>{selectedDayItems.internalEvents.length} Agency Scheduled</span>
                <span>•</span>
                <span>{selectedDayItems.deadlines.length} Deliverable Deadlines</span>
                <span>•</span>
                <span>{selectedDayItems.leaves.length} Personnel on Leave</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleOpenAddModalForDate(selectedDate)}
              className="px-4 py-2 bg-[#181a24] border border-neutral-700 hover:border-white text-white font-mono text-xs uppercase tracking-wider rounded-sm transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Plus size={14} /> Add Event for {selectedDate.toLocaleDateString([], { month: 'short', day: 'numeric' })}
            </button>
          </div>
        </div>
      )}

      {/* Agenda / Detailed Stream View */}
      {viewMode === 'agenda' && (
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <div>
              <h3 className="font-heading font-black text-white text-lg uppercase tracking-tight">
                Agenda for {selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </h3>
              <p className="font-mono text-[10px] text-neutral-400 uppercase mt-0.5">
                Comprehensive Google Calendar & Operational Agency Commitments
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleOpenAddModalForDate(selectedDate)}
              className="px-4 py-2 bg-white text-black font-black font-mono text-xs uppercase rounded-sm hover:bg-neutral-200 transition-all cursor-pointer flex items-center gap-1"
            >
              <Plus size={14} /> New Event
            </button>
          </div>

          {selectedDayItems.total === 0 ? (
            <div className="py-20 text-center text-neutral-500 font-mono text-xs uppercase tracking-widest border border-dashed border-neutral-800 rounded-sm">
              <CalendarIcon size={40} className="mx-auto mb-2 opacity-30" />
              Zero commitments logged for this date
            </div>
          ) : (
            <div className="space-y-4">
              {/* Google Calendar Events */}
              {selectedDayItems.googleEvents.map(gev => {
                const startTime = gev.start?.dateTime 
                  ? new Date(gev.start.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : 'All Day';

                return (
                  <div key={gev.id} className="p-4 bg-[#10141a] border border-emerald-500/30 rounded-sm flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 rounded-sm flex flex-col items-center justify-center font-mono shrink-0 text-emerald-400">
                        <Clock size={16} />
                        <span className="text-[9px] mt-0.5">{startTime}</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[9px] px-2 py-0.5 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 uppercase rounded-xs font-bold">
                            Google Calendar
                          </span>
                          {gev.hangoutLink && (
                            <a
                              href={gev.hangoutLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-[9px] px-2 py-0.5 bg-sky-950 border border-sky-500/40 text-sky-300 uppercase rounded-xs flex items-center gap-1 hover:text-white"
                            >
                              <Video size={10} /> Google Meet
                            </a>
                          )}
                        </div>
                        <h4 className="font-heading font-black text-white text-base uppercase">{gev.summary}</h4>
                        {gev.description && (
                          <p className="font-sans text-xs text-neutral-400 line-clamp-2">{gev.description}</p>
                        )}
                        {gev.attendees && gev.attendees.length > 0 && (
                          <div className="flex items-center gap-1.5 pt-1 text-[10px] font-mono text-neutral-400 flex-wrap">
                            <Users size={12} className="text-neutral-500" />
                            <span>Attendees:</span>
                            {gev.attendees.map((att, i) => (
                              <span key={i} className="px-1.5 py-0.2 bg-[#181a24] border border-neutral-800 rounded-xs text-neutral-300">
                                {att.displayName || att.email}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {gev.htmlLink && (
                        <a
                          href={gev.htmlLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-xs"
                          title="Open in Google Calendar"
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => setEventToDelete({ id: gev.id, title: gev.summary, isGoogle: true })}
                        className="p-1.5 text-neutral-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-xs cursor-pointer"
                        title="Delete from Google Calendar"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Agency Events */}
              {selectedDayItems.internalEvents.map(ev => (
                <div key={ev.id} className="p-4 bg-[#12141a] border border-neutral-800 rounded-sm flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#1a1c26] border border-neutral-700 rounded-sm flex flex-col items-center justify-center font-mono shrink-0">
                      <Clock size={16} className="text-sky-400" />
                      <span className="text-[9px] text-neutral-300 mt-0.5">
                        {new Date(ev.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-heading font-black text-white text-base uppercase">{ev.title}</h4>
                      <span className="font-mono text-[10px] text-neutral-400 uppercase">
                        Classification: {ev.type}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] px-2.5 py-1 bg-[#1a1c26] border border-neutral-700 text-sky-300 uppercase rounded-xs">
                      {ev.type}
                    </span>
                    {onDeleteEvent && (
                      <button
                        type="button"
                        onClick={() => setEventToDelete({ id: ev.id, title: ev.title, isGoogle: false })}
                        className="p-1.5 text-neutral-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-xs cursor-pointer"
                        title="Delete Event"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Deadlines */}
              {selectedDayItems.deadlines.map(p => (
                <div key={p.id} className="p-4 bg-[#141216] border border-amber-500/30 rounded-sm flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/40 rounded-sm flex flex-col items-center justify-center font-mono shrink-0 text-amber-400">
                      <Target size={18} />
                    </div>
                    <div>
                      <div className="font-mono text-[10px] text-amber-400 uppercase font-bold">PROJECT DEADLINE DELIVERABLE</div>
                      <h4 className="font-heading font-black text-white text-base uppercase">{p.projectName}</h4>
                      <p className="font-mono text-[10px] text-neutral-400 uppercase">Client: {p.clientName} // Job Code: {p.jobNumber}</p>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-bold text-amber-400 uppercase">
                    Status: {p.status}
                  </span>
                </div>
              ))}

              {/* Leaves */}
              {selectedDayItems.leaves.map(l => (
                <div key={l.id} className="p-4 bg-[#181214] border border-rose-500/30 rounded-sm flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/40 rounded-sm flex flex-col items-center justify-center font-mono shrink-0 text-rose-400">
                      <Users size={18} />
                    </div>
                    <div>
                      <div className="font-mono text-[10px] text-rose-400 uppercase font-bold">PERSONNEL ABSENCE / LEAVE</div>
                      <h4 className="font-heading font-black text-white text-base uppercase">{l.staffName}</h4>
                      <p className="font-mono text-[10px] text-neutral-400 uppercase">Type: {l.type} Leave // Reason: "{l.reason}"</p>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] px-2.5 py-1 bg-rose-950/60 border border-rose-500/40 text-rose-300 uppercase rounded-xs">
                    {l.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ADD EVENT MODAL WITH TAGGING AND GOOGLE CALENDAR SYNC */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-[#0b0c0f] border border-neutral-800 rounded-sm w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-[#0e0f14] border-b border-neutral-800 flex justify-between items-center text-white">
              <div>
                <div className="font-mono text-[9px] text-neutral-400 uppercase tracking-widest">TEMPORAL PROTOCOL</div>
                <h3 className="text-base font-black uppercase text-white font-heading">
                  Schedule Event ({new Date(eventForm.startDate).toLocaleDateString([], { month: 'short', day: 'numeric' })})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
              <div>
                <label className="block font-mono text-[10px] text-neutral-400 uppercase tracking-widest mb-1">Event Directive Title *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g., Client Campaign Review, Video Shoot Sync..."
                  className="w-full px-4 py-2.5 bg-[#12141a] border border-neutral-800 font-mono text-xs text-white outline-none focus:border-white rounded-sm"
                  value={eventForm.title}
                  onChange={e => setEventForm({ ...eventForm, title: e.target.value })}
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono text-[10px] text-neutral-400 uppercase tracking-widest mb-1">Start Time *</label>
                  <input
                    required
                    type="time"
                    className="w-full px-4 py-2.5 bg-[#12141a] border border-neutral-800 font-mono text-xs text-white outline-none focus:border-white rounded-sm"
                    value={eventForm.startTime}
                    onChange={e => setEventForm({ ...eventForm, startTime: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block font-mono text-[10px] text-neutral-400 uppercase tracking-widest mb-1">End Time *</label>
                  <input
                    required
                    type="time"
                    className="w-full px-4 py-2.5 bg-[#12141a] border border-neutral-800 font-mono text-xs text-white outline-none focus:border-white rounded-sm"
                    value={eventForm.endTime}
                    onChange={e => setEventForm({ ...eventForm, endTime: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block font-mono text-[10px] text-neutral-400 uppercase tracking-widest mb-1">Location or Studio Room</label>
                <input
                  type="text"
                  placeholder="e.g. Mediawize Studio A, Nawala Office, or Online"
                  className="w-full px-4 py-2.5 bg-[#12141a] border border-neutral-800 font-mono text-xs text-white outline-none focus:border-white rounded-sm"
                  value={eventForm.location}
                  onChange={e => setEventForm({ ...eventForm, location: e.target.value })}
                />
              </div>

              <div>
                <label className="block font-mono text-[10px] text-neutral-400 uppercase tracking-widest mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  placeholder="Agenda points or briefing notes..."
                  className="w-full px-4 py-2 bg-[#12141a] border border-neutral-800 font-mono text-xs text-white outline-none focus:border-white rounded-sm resize-none"
                  value={eventForm.description}
                  onChange={e => setEventForm({ ...eventForm, description: e.target.value })}
                />
              </div>

              {/* Tag Others / Personnel Selector */}
              <div>
                <label className="block font-mono text-[10px] text-neutral-400 uppercase tracking-widest mb-1.5 flex items-center justify-between">
                  <span>Tag Team Members / Attendees</span>
                  <span className="text-neutral-500">{eventForm.taggedStaffIds.length} Selected</span>
                </label>
                <div className="p-3 bg-[#12141a] border border-neutral-800 rounded-sm space-y-2">
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto custom-scrollbar">
                    {staffList.map(staff => {
                      const isTagged = eventForm.taggedStaffIds.includes(staff.id);
                      return (
                        <button
                          key={staff.id}
                          type="button"
                          onClick={() => toggleTagStaff(staff.id)}
                          className={`px-2.5 py-1 rounded-sm text-[11px] font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                            isTagged
                              ? 'bg-sky-500/20 text-sky-300 border border-sky-400/50 font-bold'
                              : 'bg-[#181a24] text-neutral-400 border border-neutral-800 hover:border-neutral-700 hover:text-white'
                          }`}
                        >
                          <Tag size={10} className={isTagged ? 'text-sky-300' : 'text-neutral-500'} />
                          <span>{staff.name}</span>
                          <span className="text-[9px] text-neutral-500">({staff.role})</span>
                          {isTagged && <Check size={10} className="text-sky-400" />}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] font-mono text-neutral-500">
                    Tagged personnel will receive invitations and in-app calendar alerts.
                  </p>
                </div>
              </div>

              {/* Google Sync Toggles */}
              {token && (
                <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-sm space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={eventForm.syncToGoogle}
                      onChange={e => setEventForm({ ...eventForm, syncToGoogle: e.target.checked })}
                      className="rounded border-neutral-700 bg-neutral-900 text-emerald-500 focus:ring-0"
                    />
                    <span className="font-mono text-xs text-emerald-300 font-bold">
                      Sync to Google Calendar & Dispatch Invitations
                    </span>
                  </label>

                  {eventForm.syncToGoogle && (
                    <label className="flex items-center gap-2 cursor-pointer ml-6">
                      <input
                        type="checkbox"
                        checked={eventForm.addMeetLink}
                        onChange={e => setEventForm({ ...eventForm, addMeetLink: e.target.checked })}
                        className="rounded border-neutral-700 bg-neutral-900 text-emerald-500 focus:ring-0"
                      />
                      <span className="font-mono text-[11px] text-neutral-300 flex items-center gap-1">
                        <Video size={12} className="text-sky-400" />
                        Generate Google Meet Video Conference Room
                      </span>
                    </label>
                  )}
                </div>
              )}

              <div className="pt-3 border-t border-neutral-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 font-mono text-xs text-neutral-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-white text-black font-black font-mono text-xs uppercase tracking-wider hover:bg-neutral-200 rounded-sm shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Plus size={16} /> Schedule Directive
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANDATORY USER CONFIRMATION MODAL FOR DELETING CALENDAR EVENTS (PER WORKSPACE INTEGRATION SKILL) */}
      {eventToDelete && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[210] flex items-center justify-center p-4">
          <div className="bg-[#0b0c0f] border border-neutral-800 rounded-sm w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-[#0e0f14] border-b border-neutral-800 flex justify-between items-center text-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-sm bg-rose-500/20 text-rose-400 flex items-center justify-center">
                  <Trash2 size={16} />
                </div>
                <div>
                  <div className="font-mono text-[9px] uppercase tracking-widest text-neutral-400">CALENDAR DELETION CONFIRMATION</div>
                  <h3 className="text-base font-black uppercase text-white font-heading">Delete Scheduled Event?</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEventToDelete(null)}
                className="text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-3 font-mono text-xs">
              <p className="text-neutral-300 leading-relaxed font-sans">
                Are you sure you want to delete this event? {eventToDelete.isGoogle ? 'This will remove the event from Google Calendar and notify attendees of cancellation.' : 'This will remove the event from the agency timeline.'}
              </p>

              <div className="p-3 bg-[#12141a] border border-neutral-800 rounded-sm space-y-1 text-neutral-400 text-[11px]">
                <div><span className="text-neutral-500 uppercase">Event:</span> <span className="text-white font-bold">{eventToDelete.title}</span></div>
                <div><span className="text-neutral-500 uppercase">Source:</span> <span className="text-neutral-300">{eventToDelete.isGoogle ? 'Google Calendar Primary' : 'Agency Matrix'}</span></div>
              </div>
            </div>

            <div className="p-4 bg-[#0e0f14] border-t border-neutral-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setEventToDelete(null)}
                className="px-4 py-2 font-mono text-xs text-neutral-400 hover:text-white uppercase cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase tracking-wider rounded-sm shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                {isDeleting ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonthlyCalendar;
