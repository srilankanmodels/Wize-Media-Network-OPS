import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Sparkles, Zap, MessageSquare, Terminal, ChevronRight, BrainCircuit, Hexagon, Menu, Target, LayoutGrid, Users, ChevronLeft } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { Project, StaffMember } from '../types';

interface FloatingAIProps {
  projects: Project[];
  staffList: StaffMember[];
  balance: number;
  currentUser: StaffMember;
  onOpenMenu: () => void;
  onOpenFocus: () => void;
  onOpenNotes?: () => void;
  onOpenHub?: () => void;
}

const FloatingAI: React.FC<FloatingAIProps> = ({ projects, staffList, balance, currentUser, onOpenMenu, onOpenFocus, onOpenNotes, onOpenHub }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDockHovered, setIsDockHovered] = useState(false);
  const [isManuallyPinned, setIsManuallyPinned] = useState(false);
  const [input, setInput] = useState('');
  const [chat, setChat] = useState<{role: 'user' | 'bot', text: string}[]>([
    { role: 'bot', text: `Greetings, ${currentUser.name.split(' ')[0]}. WizeMind OS Strategic Intelligence is active. How can I assist with Mediawize operations today?` }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isExpanded = isOpen || isDockHovered || isManuallyPinned;

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsDockHovered(true);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setIsDockHovered(false);
    }, 400);
  };

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat]);

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMsg = input;
    setChat(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setIsTyping(true);

    try {
      const apiKey = (typeof process !== 'undefined' && process.env?.API_KEY) || (import.meta as any).env?.VITE_GEMINI_API_KEY || '';
      if (!apiKey) {
        setChat(prev => [...prev, { role: 'bot', text: "AI neural link offline: Gemini API key is not configured. Add API_KEY to .env to enable." }]);
        setIsTyping(false);
        return;
      }
      const genAI = new GoogleGenAI({ apiKey });
      const model = 'gemini-2.5-flash';
      
      const context = `
        You are "WizeMind", the strategic operational intelligence agent of MEDIAWIZE OPS.
        AGENCY CONTEXT:
        - Active Job Nodes: ${projects.length}
        - Current Liquid Capital: LKR ${balance.toLocaleString()}
        - Team Personnel: ${staffList.length} specialized members
        - Current Operator: ${currentUser.name} (${currentUser.role})
        
        BEHAVIOR:
        - Be professional, high-precision, strategic, and concise.
        - Speak like an advanced creative agency operating system.
      `;

      const response = await genAI.models.generateContent({
        model,
        contents: `${context}\n\nUSER INQUIRY: ${userMsg}`,
      });

      setChat(prev => [...prev, { role: 'bot', text: response.text || "Strategic command processed successfully." }]);
    } catch (err) {
      console.error(err);
      setChat(prev => [...prev, { role: 'bot', text: "Neural link offline or rate limit encountered. Operational protocols remain active locally." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-0 z-[100] flex flex-col items-end pointer-events-none">
      {/* Floating Tactical Dock */}
      <div 
        className={`pointer-events-auto flex items-center relative transition-transform duration-300 ease-out ${
          isExpanded 
            ? 'translate-x-0 mr-4 sm:mr-6' 
            : 'translate-x-[calc(100%-38px)] mr-0'
        }`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className={`flex items-center gap-1.5 p-1.5 bg-[#0a0b0e]/95 border border-neutral-800 rounded-l-md ${isExpanded ? 'rounded-r-sm shadow-2xl' : 'rounded-r-none border-r-0 shadow-lg'} backdrop-blur-md transition-all duration-300`}>
            {/* Peek tab / Auto-hide toggle handle */}
            <button
              onClick={() => setIsManuallyPinned(prev => !prev)}
              className="w-7 h-10 rounded-sm bg-[#12141a] hover:bg-[#181a24] text-neutral-400 hover:text-white flex items-center justify-center transition-all border border-neutral-800/80 group cursor-pointer"
              title={isExpanded ? (isManuallyPinned ? "Pinned: Click to auto-hide" : "Click to pin dock") : "Hover or click to reveal Command Dock"}
              aria-label={isExpanded ? "Collapse dock to right" : "Expand dock"}
            >
              {isExpanded ? (
                <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              ) : (
                <div className="flex items-center justify-center relative">
                  <ChevronLeft size={14} className="text-white group-hover:-translate-x-0.5 transition-transform" />
                  <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399] animate-pulse" />
                </div>
              )}
            </button>

            {/* Quick Menu Launcher */}
            <button 
                onClick={onOpenMenu}
                className="w-10 h-10 rounded-sm bg-[#12141a] hover:bg-[#181a24] text-neutral-400 hover:text-white flex items-center justify-center transition-all group relative border border-neutral-800"
                title="System Modules"
            >
                <LayoutGrid size={16} />
                <div className="absolute right-full mr-3 px-2 py-1 bg-black text-white text-[9px] font-mono uppercase tracking-widest rounded-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-neutral-800 whitespace-nowrap">Modules</div>
            </button>

            {/* Hub Launcher */}
            <button 
                onClick={onOpenHub}
                className="w-10 h-10 rounded-sm bg-[#12141a] hover:bg-[#181a24] text-neutral-400 hover:text-white flex items-center justify-center transition-all group relative border border-neutral-800"
                title="Communication Hub"
            >
                <MessageSquare size={16} />
                <div className="absolute right-full mr-3 px-2 py-1 bg-black text-white text-[9px] font-mono uppercase tracking-widest rounded-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-neutral-800 whitespace-nowrap">Comms Hub</div>
            </button>

            {/* AI Launcher */}
            <button 
                onClick={() => {
                  const nextOpen = !isOpen;
                  setIsOpen(nextOpen);
                  if (nextOpen) {
                    setIsManuallyPinned(true);
                  }
                }}
                className="w-10 h-10 rounded-sm bg-white text-black hover:bg-neutral-200 flex items-center justify-center shadow-lg transition-all active:scale-95 group relative"
                title="WizeMind AI"
            >
                <BrainCircuit size={18} />
                <div className="absolute right-full mr-3 px-2 py-1 bg-white text-black font-mono text-[9px] font-black uppercase tracking-widest rounded-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">AI Console</div>
            </button>
        </div>
      </div>

      {/* Chat Window */}
      {isOpen && (
        <div className="pointer-events-auto absolute bottom-16 right-4 sm:right-6 w-[420px] max-w-[calc(100vw-2rem)] h-[560px] max-h-[calc(100vh-6rem)] bg-[#0b0c10] rounded-sm shadow-2xl border border-neutral-800 overflow-hidden flex flex-col font-mono text-white animate-in zoom-in-95 duration-200 z-[120]">
          {/* Header */}
          <div className="bg-[#0e0f14] p-5 border-b border-neutral-800 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white text-black rounded-sm flex items-center justify-center">
                <Bot size={18} />
              </div>
              <div>
                <div className="font-heading font-black text-sm uppercase text-white tracking-wider flex items-center gap-2">
                  <span>WizeMind OS</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <div className="text-[8px] text-neutral-500 uppercase tracking-widest">Autonomous Strategic AI</div>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-neutral-400 hover:text-white"><X size={18} /></button>
          </div>

          {/* Quick Shortcuts */}
          <div className="bg-[#12141a] px-4 py-2 border-b border-neutral-800 flex gap-2 text-[9px] uppercase tracking-wider text-neutral-400">
            <button onClick={onOpenMenu} className="hover:text-white">Modules</button>
            <span>•</span>
            <button onClick={onOpenHub} className="hover:text-white">Hub</button>
            <span>•</span>
            <button onClick={onOpenFocus} className="hover:text-white">Directives</button>
            <span>•</span>
            <button onClick={onOpenNotes} className="hover:text-white">Notes</button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#08090c] custom-scrollbar text-xs">
            {chat.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in duration-200`}>
                <div className={`max-w-[85%] p-3 rounded-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-neutral-800 text-white border border-neutral-700' 
                    : 'bg-[#12141a] border border-neutral-800 text-neutral-200'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="p-2.5 bg-[#12141a] border border-neutral-800 rounded-sm w-fit text-neutral-400 flex items-center gap-1.5 text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce [animation-delay:0.4s]" />
                <span className="ml-1 uppercase">Processing strategic query...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-[#0e0f14] border-t border-neutral-800 shrink-0">
            <form onSubmit={handleAsk} className="flex gap-2">
              <input 
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="PROMPT STRATEGIC AI..."
                className="flex-1 px-3 py-2 bg-[#141620] border border-neutral-800 focus:border-white text-xs uppercase text-white rounded-sm outline-none transition-colors placeholder:text-neutral-600"
              />
              <button 
                type="submit" 
                disabled={!input.trim() || isTyping}
                className="px-4 py-2 bg-white text-black font-black text-xs uppercase rounded-sm hover:bg-neutral-200 disabled:opacity-40 transition-colors"
              >
                <Send size={13} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FloatingAI;
