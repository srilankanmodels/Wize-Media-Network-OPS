import React, { useState } from 'react';
import { AgencyProfile, MeetingNote, Project } from '../types';
import { Building, Mail, Phone, Globe, MessageSquare, Plus, Trash2, Clock, StickyNote, Send, X, Link, Bookmark, ChevronRight, Archive, ShieldCheck } from 'lucide-react';

interface FooterProps {
  agencyProfile: AgencyProfile;
  meetingNotes: MeetingNote[];
  projects: Project[];
  onAddNote: (text: string, projectId?: string, projectName?: string, isSavedToWize?: boolean) => void;
  onDeleteNote: (id: string) => void;
  currentUserName: string;
}

const Footer: React.FC<FooterProps> = ({ agencyProfile, meetingNotes, projects, onAddNote, onDeleteNote, currentUserName }) => {
  const [newNote, setNewNote] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [isSavedToWize, setIsSavedToWize] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    
    const project = projects.find(p => p.id === selectedProjectId);
    onAddNote(newNote, selectedProjectId || undefined, project?.projectName, isSavedToWize);
    
    setNewNote('');
    setSelectedProjectId('');
  };

  return (
    <footer className="mt-auto border-t border-neutral-800 bg-[#060709] text-white pt-12 pb-8 px-4 sm:px-8">
      <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Company Info */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-white text-black font-black flex items-center justify-center rounded-sm font-heading">
                MW
             </div>
             <div>
                <h3 className="text-base font-black text-white uppercase tracking-tight font-heading">{agencyProfile.name}</h3>
                <div className="font-mono text-[9px] text-neutral-400 uppercase tracking-widest">CREATIVE OPERATIONS ECOSYSTEM</div>
             </div>
          </div>
          <p className="font-mono text-xs text-neutral-300 leading-relaxed uppercase">
             {agencyProfile.address || '17, KIRIMANDALA MAWATHA, NAWALA'}
          </p>
          <div className="space-y-2 pt-1 font-mono text-xs">
            <div className="flex items-center gap-2.5 text-neutral-400 hover:text-white transition-colors">
              <Mail size={14} className="text-neutral-500" />
              <span>{agencyProfile.email || 'contact@mediawize.lk'}</span>
            </div>
            <div className="flex items-center gap-2.5 text-neutral-400 hover:text-white transition-colors">
              <Phone size={14} className="text-neutral-500" />
              <span>{agencyProfile.phone || '+94 770 655 665'}</span>
            </div>
            <div className="flex items-center gap-2.5 text-neutral-400 hover:text-white transition-colors">
              <Globe size={14} className="text-neutral-500" />
              <span>{agencyProfile.website || 'www.mediawize.lk'}</span>
            </div>
          </div>
        </div>

        {/* System Info */}
        <div className="hidden lg:block space-y-4">
          <div className="font-mono text-[10px] text-neutral-400 uppercase tracking-[0.25em]">OPERATIONAL PROTOCOL</div>
          <div className="grid grid-cols-2 gap-3 font-mono">
             <div className="bg-[#0b0c10] p-4 rounded-sm border border-neutral-800">
                <p className="text-[9px] text-neutral-400 uppercase tracking-widest mb-1">Architecture</p>
                <p className="text-xs font-black text-white uppercase">MEDIAWIZE OS V4.0.2</p>
             </div>
             <div className="bg-[#0b0c10] p-4 rounded-sm border border-neutral-800">
                <p className="text-[9px] text-neutral-400 uppercase tracking-widest mb-1">Telemetry Status</p>
                <div className="flex items-center gap-2 mt-1">
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                   <p className="text-xs font-black text-emerald-400 uppercase">Synchronized</p>
                </div>
             </div>
          </div>
          <p className="font-mono text-[9px] text-neutral-400 uppercase tracking-wider leading-relaxed">
            PROPRIETARY AGENCY WORKFLOW SYSTEM. CONFIDENTIAL TO MEDIAWIZE STAFF AND AUTHORIZED CLIENT DEPLOYMENTS.
          </p>
        </div>

        {/* Strategic Notepad / Meeting Notes */}
        <div className="space-y-4 flex flex-col">
            <div className="flex items-center justify-between">
                <div className="font-mono text-[10px] text-white uppercase tracking-[0.25em] flex items-center gap-2">
                   <StickyNote size={14} /> SCRATCHPAD INTELLIGENCE
                </div>
                <button 
                  onClick={() => setShowNotes(!showNotes)} 
                  className="font-mono text-[10px] text-neutral-400 hover:text-white uppercase tracking-wider"
                >
                  {showNotes ? 'COLLAPSE [-]' : `EXPAND [${meetingNotes.length} LOGS]`}
                </button>
            </div>

            {showNotes ? (
                <div className="bg-[#0b0c10] rounded-sm border border-neutral-800 flex flex-col h-[380px] overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                        {meetingNotes.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center opacity-30 font-mono text-[10px] uppercase">
                                <MessageSquare size={24} className="mb-2" />
                                <p>Zero Scratchpad logs</p>
                            </div>
                        ) : (
                            meetingNotes.map(note => (
                                <div key={note.id} className="bg-[#12141a] p-3 rounded-sm border border-neutral-800 space-y-1.5">
                                    <div className="flex justify-between items-start font-mono text-[9px]">
                                        <div className="flex items-center gap-2 text-neutral-300 uppercase">
                                            <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                                            <span>{note.author}</span>
                                        </div>
                                        <div className="flex gap-2">
                                          {note.projectName && (
                                            <span className="px-1.5 py-0.2 bg-[#1a1c24] text-neutral-400 border border-neutral-700">
                                              {note.projectName.split(' ')[0]}
                                            </span>
                                          )}
                                          <button onClick={() => onDeleteNote(note.id)} className="text-neutral-500 hover:text-rose-400">
                                              <Trash2 size={12} />
                                          </button>
                                        </div>
                                    </div>
                                    <p className="font-mono text-xs text-white leading-relaxed">{note.text}</p>
                                </div>
                            ))
                        )}
                    </div>
                    
                    <form onSubmit={handleSubmit} className="p-3 bg-[#0e0f14] border-t border-neutral-800 space-y-2">
                        <select 
                            value={selectedProjectId}
                            onChange={(e) => setSelectedProjectId(e.target.value)}
                            className="w-full px-3 py-1.5 bg-[#14151c] border border-neutral-800 rounded-sm font-mono text-[10px] text-white outline-none"
                        >
                            <option value="">LINK TO CAMPAIGN (OPTIONAL)...</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.projectName.toUpperCase()}</option>)}
                        </select>
                        <div className="flex gap-2">
                            <input 
                                value={newNote}
                                onChange={(e) => setNewNote(e.target.value)}
                                placeholder="Append quick log..." 
                                className="flex-1 px-3 py-2 bg-[#14151c] border border-neutral-800 font-mono text-xs text-white outline-none rounded-sm"
                            />
                            <button type="submit" className="px-4 py-2 bg-white text-black font-black font-mono text-xs uppercase hover:bg-neutral-200 rounded-sm">
                                <Send size={14} />
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <div 
                  className="p-5 bg-[#0b0c10] border border-neutral-800 rounded-sm text-center cursor-pointer hover:border-neutral-600 transition-colors" 
                  onClick={() => setShowNotes(true)}
                >
                   <p className="font-mono text-[10px] text-neutral-400 uppercase tracking-widest flex items-center justify-center gap-2">
                     INITIALIZE SCRATCHPAD SYNC <ChevronRight size={14} />
                   </p>
                </div>
            )}
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto mt-10 pt-6 border-t border-neutral-800/80 flex flex-col md:flex-row justify-between items-center gap-4 font-mono text-[9px] text-neutral-400 uppercase">
          <p>© 2026 MEDIAWIZE CREATIVE OPS • CORE ENGINE PRO</p>
          <div className="flex gap-6">
             <span className="hover:text-white transition-colors cursor-pointer">PRIVACY PROTOCOL</span>
             <span className="hover:text-white transition-colors cursor-pointer">OPERATIONAL SLAs</span>
             <span className="hover:text-white transition-colors cursor-pointer">TELEMETRY MATRIX</span>
          </div>
      </div>
    </footer>
  );
};

export default Footer;
