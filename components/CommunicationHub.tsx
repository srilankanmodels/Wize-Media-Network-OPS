import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Channel, Message, StaffMember, Attachment } from '../types';
import { Send, Hash, Plus, X, MessageSquare, AtSign, Lock, Globe, Folder, Search, MoreVertical, User, Trash2, ShieldQuestion, BellOff, ArrowUpRight } from 'lucide-react';
import { marked } from 'marked';

interface CommunicationHubProps {
  channels: Channel[];
  messages: Message[];
  currentUser: StaffMember;
  onSendMessage: (text: string, channelId: string, attachments?: Attachment[]) => void;
  activeChannelId?: string;
  onSelectChannel: (channelId: string) => void;
  staffList: StaffMember[];
  onCreateChannel: (name: string, type: 'public' | 'private' | 'project', description: string) => void;
}

const MessageFormatter: React.FC<{ text: string, staffList: StaffMember[], isInverted?: boolean }> = ({ text, staffList, isInverted }) => {
    const textWithMentions = text.replace(/(@\w+)/g, (match) => {
        const handle = match.substring(1).toLowerCase();
        const staff = staffList.find(s => {
            const firstName = s.name.split(' ')[0].toLowerCase();
            return firstName === handle || s.name.toLowerCase().includes(handle);
        });
        
        if (staff) {
            return `<span class="inline-flex items-center gap-1 px-1.5 py-0.2 bg-white/20 text-white rounded font-mono text-[10px] uppercase mx-0.5 border border-white/20 whitespace-nowrap">@${staff.name.split(' ')[0]}</span>`;
        }
        return match;
    });

    try {
      const html = marked.parse(textWithMentions, { breaks: true }) as string;
      return (
          <div 
              className="message-content-markdown text-xs leading-relaxed break-words font-mono text-neutral-200"
              dangerouslySetInnerHTML={{ __html: html }}
          />
      );
    } catch (e) {
      return <div className="text-xs font-mono text-neutral-200 whitespace-pre-wrap">{textWithMentions}</div>;
    }
};

const CommunicationHub: React.FC<CommunicationHubProps> = ({ 
    channels, messages, currentUser, onSendMessage, activeChannelId, onSelectChannel, staffList, onCreateChannel
}) => {
  const [inputText, setInputText] = useState('');
  const [isCreatingChannel, setIsCreatingChannel] = useState(false);
  const [newChannelForm, setNewChannelForm] = useState({ name: '', type: 'public' as 'public' | 'private' | 'project', description: '' });
  
  const [isHeaderSearching, setIsHeaderSearching] = useState(false);
  const [headerSearchQuery, setHeaderSearchQuery] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const headerSearchInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeChannelId]);

  useEffect(() => {
    if (isHeaderSearching) {
        headerSearchInputRef.current?.focus();
    }
  }, [isHeaderSearching]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
            setIsMenuOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputText(val);

    const cursor = e.target.selectionStart || 0;
    const textBeforeCursor = val.slice(0, cursor);
    const lastAt = textBeforeCursor.lastIndexOf('@');

    if (lastAt !== -1 && !textBeforeCursor.slice(lastAt).includes(' ')) {
      const query = textBeforeCursor.slice(lastAt + 1).toLowerCase();
      setMentionQuery(query);
      setMentionIndex(0);
    } else {
      setMentionQuery(null);
    }
  };

  const filteredMentions = useMemo(() => {
    if (mentionQuery === null) return [];
    return staffList.filter(s => 
      s.name.toLowerCase().includes(mentionQuery) || 
      s.role.toLowerCase().includes(mentionQuery)
    );
  }, [mentionQuery, staffList]);

  const insertMention = (staff: StaffMember) => {
    const cursor = inputRef.current?.selectionStart || 0;
    const textBeforeCursor = inputText.slice(0, cursor);
    const lastAt = textBeforeCursor.lastIndexOf('@');
    const newText = inputText.slice(0, lastAt) + `@${staff.name.split(' ')[0]} ` + inputText.slice(cursor);
    setInputText(newText);
    setMentionQuery(null);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (mentionQuery !== null && filteredMentions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex(prev => (prev + 1) % filteredMentions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex(prev => (prev - 1 + filteredMentions.length) % filteredMentions.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(filteredMentions[mentionIndex]);
      } else if (e.key === 'Escape') {
        setMentionQuery(null);
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeChannelId) return;
    onSendMessage(inputText, activeChannelId);
    setInputText('');
    setMentionQuery(null);
  };

  const handleCreateChannelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelForm.name) return;
    onCreateChannel(newChannelForm.name, newChannelForm.type, newChannelForm.description);
    setNewChannelForm({ name: '', type: 'public', description: '' });
    setIsCreatingChannel(false);
  };

  const activeChannel = useMemo(() => {
    const found = channels.find(c => c.id === activeChannelId);
    if (found) return found;
    if (activeChannelId?.startsWith('dm-')) {
      const staffId = activeChannelId.replace('dm-', '');
      const staff = staffList.find(s => s.id === staffId);
      return { name: staff?.name || 'Direct Sync', type: 'dm' } as any;
    }
    return null;
  }, [channels, activeChannelId, staffList]);
  
  const currentMessages = useMemo(() => {
      const msgs = messages.filter(m => m.channelId === activeChannelId);
      if (headerSearchQuery.trim()) {
          return msgs.filter(m => m.text.toLowerCase().includes(headerSearchQuery.toLowerCase()) || m.senderName.toLowerCase().includes(headerSearchQuery.toLowerCase()));
      }
      return msgs;
  }, [messages, activeChannelId, headerSearchQuery]);

  return (
    <div className="flex h-full bg-[#08090c] relative overflow-hidden font-mono border-l border-neutral-800 text-white">
      {/* Internal Navigation Sidebar */}
      <div className="w-16 md:w-56 bg-[#07080a] flex flex-col shrink-0 border-r border-neutral-800">
        <div className="p-4 flex flex-col gap-5 overflow-y-auto custom-scrollbar flex-1">
          <div className="hidden md:flex items-center justify-between px-1">
            <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Main Hubs</div>
            <button onClick={() => setIsCreatingChannel(true)} className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition-all">
              <Plus size={14} />
            </button>
          </div>
          
          <div className="space-y-1">
            {channels.filter(c => c.type !== 'project').map(chan => (
              <button 
                key={chan.id} 
                onClick={() => onSelectChannel(chan.id)}
                className={`w-full flex items-center justify-between p-2 rounded-sm transition-all text-xs uppercase ${
                  activeChannelId === chan.id ? 'bg-white text-black font-black' : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="shrink-0">{chan.type === 'private' ? <Lock size={12} /> : <Hash size={12} />}</span>
                  <span className="truncate hidden md:block text-[10px]">{chan.name}</span>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-2 hidden md:block">
            <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest px-1 mb-2">Project Nodes</div>
            <div className="space-y-1">
              {channels.filter(c => c.type === 'project').map(chan => (
                <button 
                  key={chan.id} 
                  onClick={() => onSelectChannel(chan.id)}
                  className={`w-full flex items-center justify-between p-2 rounded-sm transition-all text-xs uppercase ${
                    activeChannelId === chan.id ? 'bg-white text-black font-black' : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Folder size={12} className="shrink-0" />
                    <span className="truncate hidden md:block text-[10px]">{chan.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-2 hidden md:block">
            <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest px-1 mb-2">Specialist DMs</div>
            <div className="space-y-1">
              {staffList.filter(s => s.id !== currentUser.id).map(staff => {
                const dmId = `dm-${staff.id}`;
                return (
                  <button 
                    key={staff.id} 
                    onClick={() => onSelectChannel(dmId)}
                    className={`w-full flex items-center gap-2 p-1.5 rounded-sm transition-all text-xs uppercase ${
                      activeChannelId === dmId ? 'bg-white text-black font-black' : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                    }`}
                  >
                    <img src={staff.avatarUrl} className="w-5 h-5 rounded-full object-cover" alt=""/>
                    <span className="truncate hidden md:block text-[10px]">{staff.name.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Conversation Hub */}
      <div className="flex-1 flex flex-col bg-[#0b0c10] overflow-hidden">
        {/* Hub Header */}
        <div className="px-6 py-3 border-b border-neutral-800 bg-[#0e0f14] flex items-center justify-between shrink-0 h-14">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {!isHeaderSearching ? (
              <div className="flex items-center gap-2.5">
                <span className="text-neutral-400">
                  {activeChannel?.type === 'project' ? <Folder size={14}/> : activeChannel?.type === 'dm' ? <User size={14}/> : <Hash size={14}/>}
                </span>
                <span className="font-bold text-xs uppercase tracking-wider text-white truncate">{activeChannel?.name || 'Sync Hub'}</span>
              </div>
            ) : (
              <div className="flex-1 flex items-center gap-2">
                <Search size={14} className="text-neutral-400" />
                <input 
                  ref={headerSearchInputRef}
                  value={headerSearchQuery}
                  onChange={e => setHeaderSearchQuery(e.target.value)}
                  placeholder="FILTER MESSAGES..."
                  className="flex-1 bg-transparent border-none outline-none text-xs uppercase text-white placeholder:text-neutral-600"
                />
                <button onClick={() => { setIsHeaderSearching(false); setHeaderSearchQuery(''); }} className="text-neutral-400 hover:text-white"><X size={14}/></button>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsHeaderSearching(!isHeaderSearching)} 
              className="p-1.5 text-neutral-400 hover:text-white"
            >
              <Search size={15}/>
            </button>
          </div>
        </div>

        {/* Message Viewport */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#08090c] custom-scrollbar min-h-0">
          {currentMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-30 text-center">
              <MessageSquare size={36} className="text-neutral-600 mb-2" />
              <p className="text-[10px] uppercase tracking-widest text-neutral-500">Zero Hub Transmissions</p>
            </div>
          ) : (
            currentMessages.map((msg) => {
              const isMe = msg.senderId === currentUser.id;
              return (
                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in fade-in duration-200`}>
                  <div className={`flex gap-2.5 items-end max-w-[85%] ${isMe ? 'flex-row-reverse' : ''}`}>
                    <img src={msg.senderAvatar} className="w-6 h-6 rounded-sm object-cover border border-neutral-700" alt=""/>
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className={`text-[8px] text-neutral-500 uppercase tracking-widest ${isMe ? 'text-right' : ''}`}>
                        {msg.senderName} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className={`p-3 rounded-sm border ${
                        isMe ? 'bg-neutral-800 text-white border-neutral-700' : 'bg-[#12141a] border-neutral-800 text-neutral-200'
                      }`}>
                        <MessageFormatter text={msg.text} staffList={staffList} isInverted={isMe} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input Bar */}
        <div className="p-4 bg-[#0e0f14] border-t border-neutral-800 relative">
          {mentionQuery !== null && filteredMentions.length > 0 && (
            <div className="absolute bottom-full left-4 right-4 mb-2 bg-[#0c0d12] border border-neutral-800 rounded-sm shadow-2xl overflow-hidden z-[200]">
              <div className="max-h-48 overflow-y-auto custom-scrollbar p-1">
                {filteredMentions.map((staff, i) => (
                  <button
                    key={staff.id}
                    onClick={() => insertMention(staff)}
                    onMouseEnter={() => setMentionIndex(i)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-sm text-left transition-colors ${i === mentionIndex ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'}`}
                  >
                    <img src={staff.avatarUrl} className="w-5 h-5 rounded-full object-cover" alt="" />
                    <div className="truncate">
                      <span className="text-[10px] font-bold uppercase">{staff.name}</span>
                      <span className="text-[8px] text-neutral-500 uppercase ml-2">{staff.department}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSend} className="flex items-center gap-2">
            <input 
              ref={inputRef}
              type="text" 
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="TRANSMIT MESSAGE... (@ TO NOTIFY)"
              className="flex-1 px-4 py-2.5 bg-[#12141a] border border-neutral-800 focus:border-white outline-none text-xs text-white uppercase placeholder:text-neutral-600 rounded-sm transition-colors"
            />
            <button 
              type="submit" 
              disabled={!inputText.trim()} 
              className="px-4 py-2.5 bg-white text-black font-black uppercase rounded-sm hover:bg-neutral-200 disabled:opacity-40 transition-colors"
            >
              <Send size={14} />
            </button>
          </form>
        </div>

        {/* Modal to Create Channel */}
        {isCreatingChannel && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-[150] flex flex-col animate-in fade-in">
            <div className="p-4 border-b border-neutral-800 flex justify-between items-center bg-[#0e0f14]">
              <span className="font-bold text-xs uppercase tracking-widest text-white">Initialize Hub Node</span>
              <button onClick={() => setIsCreatingChannel(false)} className="text-neutral-400 hover:text-white"><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateChannelSubmit} className="p-6 space-y-4 max-w-md mx-auto w-full">
              <div>
                <label className="block text-[9px] uppercase tracking-widest text-neutral-400 mb-1">Hub Identifier *</label>
                <input 
                  required 
                  placeholder="e.g. strategic-briefs" 
                  className="w-full px-3 py-2 bg-[#12141a] border border-neutral-800 rounded-sm text-xs text-white outline-none focus:border-white" 
                  value={newChannelForm.name} 
                  onChange={e => setNewChannelForm({...newChannelForm, name: e.target.value.toLowerCase().replace(/\s+/g, '-')})} 
                />
              </div>
              <div>
                <label className="block text-[9px] uppercase tracking-widest text-neutral-400 mb-1">Channel Visibility</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setNewChannelForm({...newChannelForm, type: 'public'})} className={`py-2 text-xs uppercase border rounded-sm ${newChannelForm.type === 'public' ? 'bg-white text-black font-black border-white' : 'bg-[#12141a] text-neutral-400 border-neutral-800'}`}>Public</button>
                  <button type="button" onClick={() => setNewChannelForm({...newChannelForm, type: 'private'})} className={`py-2 text-xs uppercase border rounded-sm ${newChannelForm.type === 'private' ? 'bg-white text-black font-black border-white' : 'bg-[#12141a] text-neutral-400 border-neutral-800'}`}>Private</button>
                </div>
              </div>
              <div>
                <label className="block text-[9px] uppercase tracking-widest text-neutral-400 mb-1">Objective</label>
                <textarea 
                  rows={2} 
                  className="w-full px-3 py-2 bg-[#12141a] border border-neutral-800 rounded-sm text-xs text-white outline-none focus:border-white resize-none" 
                  value={newChannelForm.description} 
                  onChange={e => setNewChannelForm({...newChannelForm, description: e.target.value})} 
                />
              </div>
              <button type="submit" className="w-full py-2.5 bg-white text-black font-black text-xs uppercase rounded-sm hover:bg-neutral-200">
                Deploy Channel Node
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommunicationHub;
