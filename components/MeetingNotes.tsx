import React, { useState, useMemo, useEffect } from 'react';
import { MeetingNote, Project, StaffMember, ActionItem } from '../types';
import { Plus, Trash2, Search, Calendar, User, Tag, ArrowRight, X, Save, Edit3, Bookmark, Link as LinkIcon, History, FileText, ChevronRight, StickyNote, Timer, Users, ListChecks, Download, Mail, CheckCircle2, Play, StopCircle, Clock, Printer, Activity, UserPlus, ArrowUpRight, AtSign, Check, Circle, AlertCircle } from 'lucide-react';

interface MeetingNotesProps {
  notes: MeetingNote[];
  onAddNote: (note: MeetingNote) => void;
  onDeleteNote: (id: string) => void;
  onUpdateNote: (note: MeetingNote) => void;
  projects: Project[];
  staffList: StaffMember[];
  currentUserName: string;
  currentUserId?: string;
}

type TabType = 'all' | 'tagged' | 'my' | 'actions';

const MeetingNotes: React.FC<MeetingNotesProps> = ({ 
  notes = [], 
  onAddNote, 
  onDeleteNote, 
  onUpdateNote, 
  projects = [], 
  staffList = [], 
  currentUserName,
  currentUserId
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>('all');
  const [isCreating, setIsCreating] = useState(false);
  const [activeMeetingMode, setActiveMeetingMode] = useState<'standard' | 'live'>('standard');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  
  const [guestNameInput, setGuestNameInput] = useState('');
  const [newActionItemText, setNewActionItemText] = useState('');
  const [newActionAssignee, setNewActionAssignee] = useState('');

  const [form, setForm] = useState({ 
    title: '', 
    text: '', 
    category: 'Meeting' as 'Meeting' | 'Internal' | 'Client' | 'Brainstorm',
    attendees: [] as string[],
    taggedStaffIds: [] as string[],
    externalParticipants: [] as string[],
    agenda: '',
    actionItems: [] as ActionItem[]
  });

  const [meetingStartTime, setMeetingStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [previewNote, setPreviewNote] = useState<MeetingNote | null>(null);

  // Live timer for live meeting protocol
  useEffect(() => {
    let interval: any;
    if (meetingStartTime) {
      interval = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - meetingStartTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [meetingStartTime]);

  const formatElapsed = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Helper to determine if current user is tagged in a note
  const isUserTagged = (note: MeetingNote): boolean => {
    if (!currentUserName) return false;
    const lowerName = currentUserName.toLowerCase();
    
    // Checked via ID
    if (currentUserId && note.taggedStaffIds?.includes(currentUserId)) return true;
    
    // Checked via Tagged Names
    if (note.taggedStaffNames?.some(name => name.toLowerCase().includes(lowerName) || lowerName.includes(name.toLowerCase()))) {
      return true;
    }

    // Checked via Attendees
    if (note.attendees?.some(att => att.toLowerCase().includes(lowerName) || lowerName.includes(att.toLowerCase()))) {
      return true;
    }

    // Checked via text mention (e.g. @Sarah or @Tom)
    const firstName = currentUserName.split(' ')[0].toLowerCase();
    if (note.text && (note.text.toLowerCase().includes(`@${firstName}`) || note.text.toLowerCase().includes(`@${lowerName}`))) {
      return true;
    }

    return false;
  };

  // Helper to check if current user authored the note
  const isUserAuthor = (note: MeetingNote): boolean => {
    if (currentUserId && note.authorId === currentUserId) return true;
    return note.author?.toLowerCase() === currentUserName?.toLowerCase();
  };

  // Count notes where active user is tagged
  const taggedCount = useMemo(() => {
    return notes.filter(isUserTagged).length;
  }, [notes, currentUserName, currentUserId]);

  // Count notes authored by active user
  const authoredCount = useMemo(() => {
    return notes.filter(isUserAuthor).length;
  }, [notes, currentUserName, currentUserId]);

  // Filtered notes based on tab, project, and search term
  const filteredNotes = useMemo(() => {
    return notes.filter(note => {
      // 1. Tab filter
      if (activeTab === 'tagged' && !isUserTagged(note)) return false;
      if (activeTab === 'my' && !isUserAuthor(note)) return false;
      if (activeTab === 'actions') {
        const hasActions = note.actionItems && note.actionItems.length > 0;
        if (!hasActions) return false;
      }

      // 2. Project filter
      if (selectedProjectFilter !== 'all' && note.projectId !== selectedProjectFilter) {
        return false;
      }

      // 3. Search query
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesTitle = note.title.toLowerCase().includes(q);
        const matchesText = note.text.toLowerCase().includes(q);
        const matchesProject = note.projectName?.toLowerCase().includes(q);
        const matchesAuthor = note.author.toLowerCase().includes(q);
        const matchesTags = note.taggedStaffNames?.some(t => t.toLowerCase().includes(q));
        const matchesAttendees = note.attendees?.some(a => a.toLowerCase().includes(q));
        if (!matchesTitle && !matchesText && !matchesProject && !matchesAuthor && !matchesTags && !matchesAttendees) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [notes, activeTab, selectedProjectFilter, searchTerm, currentUserName, currentUserId]);

  const resetForm = () => {
    setForm({ 
      title: '', 
      text: '', 
      category: 'Meeting', 
      attendees: [], 
      taggedStaffIds: [],
      externalParticipants: [], 
      agenda: '', 
      actionItems: [] 
    });
    setSelectedProjectId('');
    setEditingNoteId(null);
    setMeetingStartTime(null);
    setElapsedSeconds(0);
    setGuestNameInput('');
    setNewActionItemText('');
    setNewActionAssignee('');
  };

  const handleOpenCreate = (mode: 'standard' | 'live' = 'standard') => {
    resetForm();
    setActiveMeetingMode(mode);
    if (mode === 'live') {
      setMeetingStartTime(Date.now());
      // Default tag current user
      if (currentUserId) {
        setForm(prev => ({
          ...prev,
          attendees: [currentUserId],
          taggedStaffIds: [currentUserId]
        }));
      }
    }
    setIsCreating(true);
  };

  const handleEdit = (note: MeetingNote) => {
    // Map tagged IDs and attendee IDs
    const taggedIds = note.taggedStaffIds || (note.attendees || [])
      .map(name => staffList.find(s => s.name === name)?.id)
      .filter(Boolean) as string[];

    const attendeeIds = (note.attendees || [])
      .map(name => staffList.find(s => s.name === name)?.id)
      .filter(Boolean) as string[];

    const guests = (note.attendees || []).filter(name => !staffList.some(s => s.name === name));

    setForm({
      title: note.title,
      text: note.text,
      category: note.category || 'Meeting',
      attendees: attendeeIds,
      taggedStaffIds: taggedIds,
      externalParticipants: guests,
      agenda: note.agenda || '',
      actionItems: note.actionItems || []
    });
    setSelectedProjectId(note.projectId || '');
    setEditingNoteId(note.id);
    setActiveMeetingMode(note.duration ? 'live' : 'standard');
    setIsCreating(true);
  };

  const toggleTagStaff = (id: string) => {
    setForm(prev => {
      const isTagged = prev.taggedStaffIds.includes(id);
      const nextTags = isTagged 
        ? prev.taggedStaffIds.filter(t => t !== id)
        : [...prev.taggedStaffIds, id];

      // Also ensure tagged staff are included in attendees if appropriate
      const nextAttendees = isTagged
        ? prev.attendees
        : Array.from(new Set([...prev.attendees, id]));

      return {
        ...prev,
        taggedStaffIds: nextTags,
        attendees: nextAttendees
      };
    });
  };

  const toggleAttendee = (id: string) => {
    setForm(prev => ({
      ...prev,
      attendees: prev.attendees.includes(id) 
        ? prev.attendees.filter(a => a !== id) 
        : [...prev.attendees, id]
    }));
  };

  const addGuest = () => {
    if (!guestNameInput.trim()) return;
    setForm(prev => ({
      ...prev,
      externalParticipants: [...prev.externalParticipants, guestNameInput.trim()]
    }));
    setGuestNameInput('');
  };

  const removeGuest = (name: string) => {
    setForm(prev => ({
      ...prev,
      externalParticipants: prev.externalParticipants.filter(g => g !== name)
    }));
  };

  const handleAddActionItem = () => {
    if (!newActionItemText.trim()) return;
    const item: ActionItem = {
      id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      text: newActionItemText.trim(),
      assignedTo: newActionAssignee || undefined,
      completed: false
    };
    setForm(prev => ({
      ...prev,
      actionItems: [...(prev.actionItems || []), item]
    }));
    setNewActionItemText('');
  };

  const handleRemoveActionItem = (id: string) => {
    setForm(prev => ({
      ...prev,
      actionItems: prev.actionItems.filter(act => act.id !== id)
    }));
  };

  // Toggle action item directly from note card
  const handleToggleCardAction = (note: MeetingNote, actionId: string) => {
    const updatedActions = (note.actionItems || []).map(act => {
      if (act.id === actionId) {
        return { ...act, completed: !act.completed };
      }
      return act;
    });
    onUpdateNote({ ...note, actionItems: updatedActions });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.text.trim()) return;

    const project = projects.find(p => p.id === selectedProjectId);
    
    // Resolve tagged staff names
    const resolvedTaggedNames = form.taggedStaffIds
      .map(id => staffList.find(s => s.id === id)?.name)
      .filter(Boolean) as string[];

    // Resolve attendee names
    const resolvedAttendees = form.attendees
      .map(id => staffList.find(s => s.id === id)?.name || id)
      .filter(Boolean);
    const combinedParticipants = Array.from(new Set([...resolvedAttendees, ...form.externalParticipants]));

    const notePayload: MeetingNote = {
      id: editingNoteId || `note-${Date.now()}`,
      title: form.title.trim(),
      text: form.text.trim(),
      category: form.category,
      projectId: selectedProjectId || undefined,
      projectName: project?.projectName,
      timestamp: editingNoteId ? (notes.find(n => n.id === editingNoteId)?.timestamp || new Date()) : new Date(),
      author: currentUserName,
      authorId: currentUserId,
      attendees: combinedParticipants,
      taggedStaffIds: form.taggedStaffIds,
      taggedStaffNames: resolvedTaggedNames,
      duration: activeMeetingMode === 'live' ? (elapsedSeconds > 0 ? Math.ceil(elapsedSeconds / 60) : 30) : undefined,
      agenda: form.agenda.trim() || undefined,
      actionItems: form.actionItems,
      isSavedToWize: true
    };

    if (editingNoteId) {
      onUpdateNote(notePayload);
    } else {
      onAddNote(notePayload);
    }

    resetForm();
    setIsCreating(false);
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Precision Header Banner - Liquid Glass */}
      <div className="liquid-glass-card hud-frame rounded-sm p-6 sm:p-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 shadow-[0_0_40px_-10px_rgba(var(--jarvis-primary-rgb),0.2)]">
        <div>
          <div className="font-mono text-[9px] text-[var(--jarvis-primary)] uppercase tracking-[0.25em] mb-2 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--jarvis-primary)] animate-ping" />
            <span>PROPRIETARY ECOSYSTEM // DECISION ARCHIVES // JARVIS MATRIX</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight font-heading leading-none">
            MEETING <span className="text-[var(--jarvis-primary)] hud-glow-text">INTELLIGENCE</span>
          </h1>
          <p className="text-neutral-300 text-xs font-mono uppercase tracking-wider mt-2.5">
            Synchronized Strategic Protocols, Team Tagging, Real-Time Minutes & Action Dispatches
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button 
            type="button"
            onClick={() => handleOpenCreate('standard')} 
            className="jarvis-btn-secondary px-5 py-3 font-mono text-xs uppercase tracking-wider rounded-sm transition-all flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <StickyNote size={15} /> QUICK NOTE
          </button>
          <button 
            type="button"
            onClick={() => handleOpenCreate('live')} 
            className="jarvis-btn-primary px-6 py-3 font-black text-xs uppercase tracking-wider rounded-sm transition-all shadow-md active:scale-95 flex items-center gap-2 cursor-pointer"
          >
            <Users size={16} strokeWidth={3} /> INITIALIZE MEETING PROTOCOL
          </button>
        </div>
      </div>

      {/* Synchronized Navigation Tabs & Filter Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-[#0a0b0e] p-2 border border-neutral-800 rounded-sm">
        {/* View Tabs */}
        <div className="flex flex-wrap items-center gap-1 font-mono text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-sm uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'all'
                ? 'bg-white text-black font-black shadow-md'
                : 'text-neutral-400 hover:text-white hover:bg-[#12141a]'
            }`}
          >
            <FileText size={13} />
            <span>ALL ARCHIVES</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-xs font-bold ${activeTab === 'all' ? 'bg-black text-white' : 'bg-[#14161f] text-neutral-400'}`}>
              {notes.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tagged')}
            className={`px-4 py-2 rounded-sm uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'tagged'
                ? 'bg-amber-400 text-black font-black shadow-md'
                : 'text-neutral-400 hover:text-white hover:bg-[#12141a]'
            }`}
          >
            <AtSign size={13} />
            <span>TAGGED IN ME</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-xs font-bold ${activeTab === 'tagged' ? 'bg-black text-amber-400' : 'bg-amber-950/60 text-amber-400 border border-amber-500/30'}`}>
              {taggedCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('my')}
            className={`px-4 py-2 rounded-sm uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'my'
                ? 'bg-white text-black font-black shadow-md'
                : 'text-neutral-400 hover:text-white hover:bg-[#12141a]'
            }`}
          >
            <User size={13} />
            <span>MY DISPATCHES</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-xs font-bold ${activeTab === 'my' ? 'bg-black text-white' : 'bg-[#14161f] text-neutral-400'}`}>
              {authoredCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('actions')}
            className={`px-4 py-2 rounded-sm uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'actions'
                ? 'bg-white text-black font-black shadow-md'
                : 'text-neutral-400 hover:text-white hover:bg-[#12141a]'
            }`}
          >
            <ListChecks size={13} />
            <span>ACTION ITEMS</span>
          </button>
        </div>

        {/* Project Selector Filter */}
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] text-neutral-400 uppercase tracking-widest hidden sm:inline">
            LINKED CAMPAIGN:
          </span>
          <select
            value={selectedProjectFilter}
            onChange={(e) => setSelectedProjectFilter(e.target.value)}
            className="bg-[#12141a] border border-neutral-700 text-white font-mono text-xs px-3 py-1.5 rounded-sm outline-none focus:border-white max-w-[220px] truncate"
          >
            <option value="all">ALL CAMPAIGNS // GLOBAL</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>
                {p.projectName.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={17} />
        <input 
          type="text" 
          placeholder="SEARCH INTELLIGENCE ARCHIVES (BY TITLE, MINUTES, TAGGED STAFF, OR CAMPAIGN)..." 
          className="w-full pl-12 pr-10 py-3 bg-[#0a0b0e] border border-neutral-800 focus:border-white font-mono text-xs uppercase tracking-wider text-white outline-none rounded-sm transition-colors placeholder:text-neutral-600"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button 
            type="button"
            onClick={() => setSearchTerm('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white cursor-pointer"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* NOTES GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredNotes.length === 0 ? (
          <div className="col-span-full py-20 text-center text-neutral-500 font-mono text-xs uppercase tracking-widest bg-[#0a0b0e] border border-neutral-800 rounded-sm space-y-3">
            <FileText size={44} className="mx-auto opacity-30 text-neutral-400" />
            <div>
              {activeTab === 'tagged' 
                ? 'No notes where you are currently tagged'
                : activeTab === 'my'
                ? 'You have not authored any meeting notes yet'
                : 'Zero intelligence artifacts match your filter query'}
            </div>
            <button
              type="button"
              onClick={() => handleOpenCreate('standard')}
              className="mt-2 px-5 py-2 bg-white text-black font-black uppercase text-[11px] rounded-sm hover:bg-neutral-200 transition-colors inline-flex items-center gap-1.5"
            >
              <Plus size={14} /> Create New Note
            </button>
          </div>
        ) : (
          filteredNotes.map(note => {
            const userTagged = isUserTagged(note);
            const userAuthor = isUserAuthor(note);
            const taggedStaff = (note.taggedStaffIds || [])
              .map(id => staffList.find(s => s.id === id))
              .filter(Boolean) as StaffMember[];

            return (
              <div 
                key={note.id} 
                className={`bg-[#0a0b0e] border rounded-sm p-6 flex flex-col justify-between transition-all group relative overflow-hidden ${
                  userTagged 
                    ? 'border-amber-500/50 hover:border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.06)]' 
                    : 'border-neutral-800 hover:border-neutral-600'
                }`}
              >
                <div>
                  {/* Top Category & Status Header */}
                  <div className="flex justify-between items-start gap-3 mb-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-[9px] uppercase px-2 py-0.5 rounded-sm bg-[#12141a] text-neutral-300 border border-neutral-800">
                        {note.category || 'Meeting'}
                      </span>
                      {note.duration && (
                        <span className="font-mono text-[9px] uppercase px-2 py-0.5 rounded-sm bg-[#161324] text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
                          <Clock size={10} /> {note.duration}m
                        </span>
                      )}
                      {userTagged && (
                        <span className="font-mono text-[9px] font-black uppercase px-2 py-0.5 rounded-sm bg-amber-950/80 text-amber-300 border border-amber-500/40 flex items-center gap-1 animate-pulse">
                          <AtSign size={10} /> TAGGED IN ME
                        </span>
                      )}
                    </div>

                    {/* Actions: Edit, Print, Delete */}
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button 
                        type="button"
                        onClick={() => handleEdit(note)} 
                        className="p-1.5 bg-[#12141a] hover:bg-[#1a1c26] border border-neutral-800 text-neutral-400 hover:text-white rounded-sm transition-colors cursor-pointer" 
                        title="Edit Note"
                      >
                        <Edit3 size={13} />
                      </button>
                      <button 
                        type="button"
                        onClick={() => setPreviewNote(note)} 
                        className="p-1.5 bg-[#12141a] hover:bg-[#1a1c26] border border-neutral-800 text-neutral-400 hover:text-white rounded-sm transition-colors cursor-pointer" 
                        title="Print / Export"
                      >
                        <Printer size={13} />
                      </button>
                      <button 
                        type="button"
                        onClick={() => onDeleteNote(note.id)} 
                        className="p-1.5 bg-[#12141a] hover:bg-rose-950/50 border border-neutral-800 text-neutral-400 hover:text-rose-400 rounded-sm transition-colors cursor-pointer" 
                        title="Delete Note"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Note Title */}
                  <h3 className="font-heading font-black text-white text-base sm:text-lg uppercase tracking-tight leading-snug line-clamp-2 mb-2">
                    {note.title}
                  </h3>

                  {/* Agenda if available */}
                  {note.agenda && (
                    <div className="mb-2 p-2 bg-[#0e0f14] border border-neutral-800/80 rounded-xs font-mono text-[10px] text-neutral-300">
                      <span className="text-neutral-500 uppercase tracking-widest block font-bold mb-0.5">AGENDA:</span>
                      <p className="line-clamp-2">{note.agenda}</p>
                    </div>
                  )}

                  {/* Main Minutes Text */}
                  <p className="font-mono text-xs text-neutral-400 leading-relaxed line-clamp-4 whitespace-pre-wrap">
                    {note.text}
                  </p>

                  {/* Tagged Personnel Badges */}
                  {(taggedStaff.length > 0 || (note.taggedStaffNames && note.taggedStaffNames.length > 0)) && (
                    <div className="mt-4 pt-3 border-t border-neutral-800/70">
                      <span className="font-mono text-[9px] text-neutral-500 uppercase tracking-widest block mb-1.5">
                        TAGGED PERSONNEL:
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {taggedStaff.map(member => (
                          <span 
                            key={member.id} 
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm font-mono text-[10px] border ${
                              member.id === currentUserId 
                                ? 'bg-amber-950/40 border-amber-500/40 text-amber-300 font-bold'
                                : 'bg-[#12141a] border-neutral-800 text-neutral-300'
                            }`}
                          >
                            <img src={member.avatarUrl} className="w-3.5 h-3.5 rounded-xs object-cover" alt="" />
                            <span>@{member.name.split(' ')[0]}</span>
                          </span>
                        ))}
                        {taggedStaff.length === 0 && (note.taggedStaffNames || []).map((name, i) => (
                          <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm font-mono text-[10px] bg-[#12141a] border border-neutral-800 text-neutral-300">
                            <AtSign size={10} className="text-neutral-500" />
                            <span>{name}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Items List with Direct Completion */}
                  {note.actionItems && note.actionItems.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-neutral-800/70 space-y-1.5">
                      <div className="flex items-center justify-between font-mono text-[9px] text-neutral-500 uppercase tracking-widest">
                        <span>ACTION DIRECTIVES:</span>
                        <span>{note.actionItems.filter(a => a.completed).length} / {note.actionItems.length}</span>
                      </div>
                      <div className="space-y-1">
                        {note.actionItems.map(act => (
                          <div 
                            key={act.id} 
                            onClick={() => handleToggleCardAction(note, act.id)}
                            className={`flex items-start gap-2 p-1.5 rounded-sm font-mono text-[10px] border transition-colors cursor-pointer ${
                              act.completed 
                                ? 'bg-[#0b0c10] border-neutral-900 text-neutral-500 line-through' 
                                : 'bg-[#12141a] border-neutral-800 text-neutral-300 hover:border-neutral-700'
                            }`}
                          >
                            <button type="button" className="mt-0.5 shrink-0 text-neutral-400 hover:text-white">
                              {act.completed ? <CheckCircle2 size={13} className="text-emerald-400" /> : <Circle size={13} />}
                            </button>
                            <div className="flex-1 min-w-0">
                              <span className="break-words">{act.text}</span>
                              {act.assignedTo && (
                                <span className="ml-1.5 text-[9px] text-neutral-500 font-bold uppercase">
                                  [@{act.assignedTo}]
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Telemetry */}
                <div className="pt-4 border-t border-neutral-800/80 mt-6 space-y-2.5 font-mono text-[10px]">
                  {note.projectName && (
                    <div className="flex items-center gap-2 text-neutral-300 truncate">
                      <LinkIcon size={12} className="text-neutral-500 shrink-0" />
                      <span className="text-neutral-400 uppercase truncate">{note.projectName}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-neutral-500">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={12} />
                      <span>{new Date(note.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                    <span className="text-neutral-400 uppercase">
                      BY: {userAuthor ? 'YOU' : note.author}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* CREATE / EDIT NOTE MODAL */}
      {isCreating && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-[#0b0c0f] border border-neutral-800 rounded-sm w-full max-w-5xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col font-mono text-white">
            {/* Modal Header */}
            <div className="p-6 bg-[#0e0f14] border-b border-neutral-800 flex justify-between items-center text-white shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-sm bg-[#12141a] border border-neutral-700 flex items-center justify-center text-white">
                  {activeMeetingMode === 'live' ? <Users size={18} /> : <StickyNote size={18} />}
                </div>
                <div>
                  <div className="text-[9px] text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                    <span>{activeMeetingMode === 'live' ? 'LIVE SESSION PROTOCOL' : 'INTELLIGENCE RECORD'}</span>
                    {editingNoteId && <span className="text-amber-400 font-bold">[EDIT MODE]</span>}
                  </div>
                  <h3 className="text-lg font-black uppercase text-white font-heading">
                    {editingNoteId 
                      ? 'Update Strategic Intelligence Artifact' 
                      : activeMeetingMode === 'live' 
                      ? 'Execute Live Meeting Protocol' 
                      : 'Deploy Intelligence Note'}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {activeMeetingMode === 'live' && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-[#12141a] border border-neutral-700 rounded-sm text-sm text-emerald-400">
                    <Clock size={14} />
                    <span>{formatElapsed(elapsedSeconds)}</span>
                  </div>
                )}
                <button 
                  type="button"
                  onClick={() => { resetForm(); setIsCreating(false); }} 
                  className="text-neutral-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 bg-[#0b0c0f]">
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-xs">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column: Basic Details */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] text-neutral-400 uppercase tracking-widest mb-1.5 font-bold">
                        Session / Note Title *
                      </label>
                      <input 
                        required 
                        value={form.title} 
                        onChange={e => setForm({...form, title: e.target.value.toUpperCase()})} 
                        placeholder="e.g. ALPHA CORP // ANNUAL REPORT KICKOFF SYNC" 
                        className="w-full px-4 py-2.5 bg-[#12141a] border border-neutral-800 text-xs text-white outline-none focus:border-white rounded-sm font-mono" 
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] text-neutral-400 uppercase tracking-widest mb-1.5 font-bold">Linked Campaign</label>
                        <select 
                          value={selectedProjectId} 
                          onChange={e => setSelectedProjectId(e.target.value)} 
                          className="w-full px-3 py-2 bg-[#12141a] border border-neutral-800 text-xs text-white outline-none focus:border-white rounded-sm font-mono"
                        >
                          <option value="">No Campaign Link</option>
                          {projects.map(p => <option key={p.id} value={p.id}>{p.projectName}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] text-neutral-400 uppercase tracking-widest mb-1.5 font-bold">Classification</label>
                        <select 
                          value={form.category} 
                          onChange={e => setForm({...form, category: e.target.value as any})} 
                          className="w-full px-3 py-2 bg-[#12141a] border border-neutral-800 text-xs text-white outline-none focus:border-white rounded-sm font-mono"
                        >
                          {['Meeting', 'Internal', 'Client', 'Brainstorm'].map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] text-neutral-400 uppercase tracking-widest mb-1.5 font-bold">Meeting Agenda</label>
                      <textarea 
                        value={form.agenda} 
                        onChange={e => setForm({...form, agenda: e.target.value})} 
                        rows={2} 
                        placeholder="Key milestones, discussion items, and briefing scope..." 
                        className="w-full px-4 py-2 bg-[#12141a] border border-neutral-800 text-xs text-white outline-none focus:border-white rounded-sm resize-none font-mono" 
                      />
                    </div>
                  </div>

                  {/* Right Column: Tag Team Members */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="block text-[10px] text-neutral-400 uppercase tracking-widest font-bold">
                        Tag Team Members ({form.taggedStaffIds.length} Selected)
                      </label>
                      <span className="text-[9px] text-amber-400">
                        Tagged members receive alerts & sync
                      </span>
                    </div>

                    <div className="bg-[#12141a] border border-neutral-800 p-3 rounded-sm max-h-[160px] overflow-y-auto custom-scrollbar space-y-1.5">
                      <div className="grid grid-cols-2 gap-2">
                        {staffList.map(member => {
                          const isTagged = form.taggedStaffIds.includes(member.id);
                          return (
                            <button
                              key={member.id}
                              type="button"
                              onClick={() => toggleTagStaff(member.id)}
                              className={`p-2 rounded-sm border text-left flex items-center gap-2 transition-all text-[10px] cursor-pointer ${
                                isTagged 
                                  ? 'bg-amber-950/40 border-amber-500 text-white font-bold' 
                                  : 'bg-[#0a0b0e] border-neutral-800 text-neutral-400 hover:text-white'
                              }`}
                            >
                              <img src={member.avatarUrl} className="w-6 h-6 rounded-xs object-cover" alt="" />
                              <div className="min-w-0 flex-1">
                                <div className="truncate uppercase flex items-center gap-1">
                                  <span>@{member.name.split(' ')[0]}</span>
                                  {isTagged && <Check size={11} className="text-amber-400 shrink-0" />}
                                </div>
                                <div className="text-[8px] text-neutral-500 truncate">{member.role}</div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* External Participants */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] text-neutral-400 uppercase tracking-widest">
                        External Guests / Client Stakeholders
                      </label>
                      <div className="flex gap-2">
                        <input 
                          value={guestNameInput}
                          onChange={e => setGuestNameInput(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addGuest())}
                          placeholder="e.g. John Doe (Alpha Corp)" 
                          className="flex-1 px-3 py-1.5 bg-[#12141a] border border-neutral-800 text-xs text-white outline-none focus:border-white rounded-sm font-mono"
                        />
                        <button 
                          type="button" 
                          onClick={addGuest}
                          disabled={!guestNameInput.trim()}
                          className="px-4 py-1.5 bg-[#181a24] hover:bg-[#202330] text-neutral-300 text-xs uppercase rounded-sm border border-neutral-800 disabled:opacity-40 cursor-pointer"
                        >
                          Add
                        </button>
                      </div>

                      {form.externalParticipants.length > 0 && (
                        <div className="pt-1.5 flex flex-wrap gap-1.5">
                          {form.externalParticipants.map(guest => (
                            <span key={guest} className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[#181a24] border border-neutral-700 text-neutral-200 text-[10px] rounded-sm">
                              <span>{guest}</span>
                              <button type="button" onClick={() => removeGuest(guest)} className="text-neutral-400 hover:text-white cursor-pointer"><X size={10} /></button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Strategic Minutes & Text Body */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-[10px] text-neutral-400 uppercase tracking-widest font-bold">
                      Strategic Minutes & Decision Artifacts *
                    </label>
                    <span className="text-[9px] text-neutral-500">
                      Use @Name to reference team members
                    </span>
                  </div>
                  <textarea 
                    required
                    value={form.text} 
                    onChange={e => setForm({...form, text: e.target.value})} 
                    rows={6} 
                    placeholder="Document decisions, deliverables, client feedback, next steps, and technical specifications..." 
                    className="w-full p-4 bg-[#12141a] border border-neutral-800 text-xs text-white outline-none focus:border-white rounded-sm resize-none font-mono leading-relaxed" 
                  />
                </div>

                {/* Action Items Builder */}
                <div className="space-y-3 pt-2 border-t border-neutral-800">
                  <div className="flex justify-between items-center">
                    <label className="block text-[10px] text-neutral-400 uppercase tracking-widest font-bold">
                      Action Items & Assigned Deliverables ({form.actionItems.length})
                    </label>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <input 
                      value={newActionItemText}
                      onChange={e => setNewActionItemText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddActionItem())}
                      placeholder="Add an actionable directive or deliverable..." 
                      className="flex-1 px-3 py-2 bg-[#12141a] border border-neutral-800 text-xs text-white outline-none focus:border-white rounded-sm font-mono"
                    />
                    <select
                      value={newActionAssignee}
                      onChange={e => setNewActionAssignee(e.target.value)}
                      className="bg-[#12141a] border border-neutral-800 text-xs text-neutral-300 px-3 py-2 rounded-sm outline-none font-mono"
                    >
                      <option value="">Assign To...</option>
                      {staffList.map(s => (
                        <option key={s.id} value={s.name}>{s.name} ({s.role})</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleAddActionItem}
                      disabled={!newActionItemText.trim()}
                      className="px-4 py-2 bg-white text-black font-black uppercase text-xs rounded-sm hover:bg-neutral-200 disabled:opacity-40 cursor-pointer"
                    >
                      Add Action
                    </button>
                  </div>

                  {form.actionItems.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      {form.actionItems.map(act => (
                        <div key={act.id} className="flex items-center justify-between p-2 bg-[#12141a] border border-neutral-800 rounded-sm text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            <span className="text-white">{act.text}</span>
                            {act.assignedTo && (
                              <span className="px-1.5 py-0.2 bg-[#181a24] border border-neutral-700 text-[10px] text-neutral-300 rounded-xs">
                                @{act.assignedTo}
                              </span>
                            )}
                          </div>
                          <button 
                            type="button" 
                            onClick={() => handleRemoveActionItem(act.id)}
                            className="text-neutral-400 hover:text-rose-400 cursor-pointer p-1"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="p-4 bg-[#0e0f14] border-t border-neutral-800 flex justify-end gap-3 shrink-0">
                <button 
                  type="button" 
                  onClick={() => { resetForm(); setIsCreating(false); }} 
                  className="px-5 py-2.5 text-xs text-neutral-400 hover:text-white uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2.5 bg-white text-black font-black text-xs uppercase tracking-wider hover:bg-neutral-200 rounded-sm shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Save size={15} /> Save Intelligence Artifact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINT / PREVIEW MODAL */}
      {previewNote && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[300] flex items-center justify-center p-4 overflow-y-auto" onClick={() => setPreviewNote(null)}>
          <div className="bg-[#0b0c0f] border border-neutral-800 rounded-sm w-full max-w-3xl shadow-2xl overflow-hidden my-8" onClick={e => e.stopPropagation()}>
            <div className="p-6 bg-[#0e0f14] border-b border-neutral-800 flex justify-between items-center text-white">
              <div className="flex items-center gap-3">
                <Printer size={18} className="text-neutral-400" />
                <h3 className="font-heading font-black text-base uppercase text-white">Export Minutes Protocol</h3>
              </div>
              <button onClick={() => setPreviewNote(null)} className="text-neutral-400 hover:text-white cursor-pointer"><X size={20} /></button>
            </div>

            <div className="p-8 space-y-6 font-mono text-xs bg-[#0c0d12] text-neutral-300">
              <div className="border-b border-neutral-800 pb-4 flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-heading font-black text-white uppercase">{previewNote.title}</h2>
                  <div className="text-[10px] text-neutral-500 mt-1 uppercase">
                    CATEGORY: {previewNote.category} // AUTHOR: {previewNote.author}
                  </div>
                </div>
                <div className="text-right text-[10px] text-neutral-500">
                  {new Date(previewNote.timestamp).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}
                </div>
              </div>

              {previewNote.taggedStaffNames && previewNote.taggedStaffNames.length > 0 && (
                <div className="p-3 bg-[#12141a] border border-neutral-800 rounded-sm">
                  <span className="text-[9px] text-neutral-500 uppercase block mb-1">Tagged Personnel:</span>
                  <div className="flex flex-wrap gap-2 text-white font-bold">
                    {previewNote.taggedStaffNames.map(n => `@${n}`).join(', ')}
                  </div>
                </div>
              )}

              {previewNote.attendees && previewNote.attendees.length > 0 && (
                <div className="p-3 bg-[#12141a] border border-neutral-800 rounded-sm">
                  <span className="text-[9px] text-neutral-500 uppercase block mb-1">Participants:</span>
                  <div className="flex flex-wrap gap-2 text-white font-bold">
                    {previewNote.attendees.join(', ')}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <span className="text-[9px] text-neutral-500 uppercase block">Recorded Minutes:</span>
                <div className="p-4 bg-[#12141a] border border-neutral-800 rounded-sm whitespace-pre-wrap leading-relaxed text-neutral-200">
                  {previewNote.text}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-neutral-800">
                <button onClick={() => window.print()} className="px-6 py-2.5 bg-white text-black font-black uppercase tracking-wider rounded-sm flex items-center gap-2 hover:bg-neutral-200 cursor-pointer">
                  <Printer size={15} /> Print Document
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MeetingNotes;
