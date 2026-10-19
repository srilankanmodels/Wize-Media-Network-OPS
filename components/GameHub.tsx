import React, { useState, useEffect } from 'react';
import { X, Gamepad2, Trophy, Share2, Sparkles, Hash, Layers, ArrowRight, CheckCircle2, AlertCircle, ChevronRight, ArrowUpRight } from 'lucide-react';
import { StaffMember } from '../types';

interface GameHubProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: StaffMember[];
  currentUser: StaffMember;
  onInvite: (gameName: string) => void;
}

const CrosswordGame: React.FC<{ onComplete: (score: number) => void }> = ({ onComplete }) => {
  const [grid, setGrid] = useState<string[][]>(Array(8).fill(null).map(() => Array(8).fill('#')));
  const [answers, setAnswers] = useState<Record<string, string>>({
    '0-0-h': 'WIZE', '2-0-h': 'CLIENT', '4-2-h': 'MEDIA', '0-0-v': 'WORKFLOW', '0-4-v': 'STRATEGY'
  });
  
  useEffect(() => {
    const newGrid = [...grid];
    // WIZE
    for (let i = 0; i < 4; i++) newGrid[0][i] = '';
    // CLIENT
    for (let i = 0; i < 6; i++) newGrid[2][i] = '';
    // MEDIA
    for (let i = 2; i < 7; i++) newGrid[4][i] = '';
    // WORKFLOW (vert)
    for (let i = 0; i < 8; i++) newGrid[i][0] = '';
    // STRATEGY (vert)
    for (let i = 0; i < 8; i++) newGrid[i][4] = '';
    
    setGrid(newGrid);
  }, []);

  const handleCellChange = (r: number, c: number, val: string) => {
    const newGrid = [...grid];
    newGrid[r][c] = val.toUpperCase().slice(0, 1);
    setGrid(newGrid);
  };

  return (
    <div className="flex flex-col items-center animate-in fade-in duration-300 font-mono">
      <div className="grid grid-cols-8 gap-1.5 bg-[#07080a] p-4 rounded-sm border border-neutral-800 shadow-2xl">
        {grid.map((row, r) => row.map((cell, c) => (
          <div key={`${r}-${c}`} className={`w-9 h-9 md:w-11 md:h-11 flex items-center justify-center rounded-sm transition-all border ${cell === '#' ? 'bg-[#0e0f14] border-neutral-900' : 'bg-[#141620] border-neutral-700'}`}>
            {cell !== '#' && (
              <input 
                className="w-full h-full text-center font-black text-white bg-transparent uppercase outline-none focus:bg-white focus:text-black transition-colors"
                value={cell}
                onChange={(e) => handleCellChange(r, c, e.target.value)}
              />
            )}
          </div>
        )))}
      </div>
      
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl text-xs">
        <div className="bg-[#12141a] p-4 rounded-sm border border-neutral-800">
            <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2">Horizontal Directives</h4>
            <ul className="space-y-1.5 text-neutral-400 uppercase">
                <li><span className="text-white">1.</span> Agency intelligence prefix [4]</li>
                <li><span className="text-white">2.</span> Organization we service [6]</li>
                <li><span className="text-white">3.</span> Core output channel [5]</li>
            </ul>
        </div>
        <div className="bg-[#12141a] p-4 rounded-sm border border-neutral-800">
            <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2">Vertical Directives</h4>
            <ul className="space-y-1.5 text-neutral-400 uppercase">
                <li><span className="text-white">4.</span> Operational execution stream [8]</li>
                <li><span className="text-white">5.</span> High-level planning node [8]</li>
            </ul>
        </div>
      </div>

      <button 
        onClick={() => { alert("Calibration verified. Logic matrix synchronized."); onComplete(100); }}
        className="mt-6 px-8 py-3 bg-white text-black font-black text-xs uppercase tracking-wider rounded-sm hover:bg-neutral-200 transition-all shadow-md active:scale-95"
      >
        Submit Calibration Matrix
      </button>
    </div>
  );
};

const GameHub: React.FC<GameHubProps> = ({ isOpen, onClose, staffList, currentUser, onInvite }) => {
  const [activeGame, setActiveGame] = useState<'selection' | 'crossword' | 'logic'>('selection');
  const [score, setScore] = useState(0);

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 font-mono text-white">
      <div className="w-full max-w-5xl h-[85vh] bg-[#0b0c0f] border border-neutral-800 rounded-sm shadow-2xl flex flex-col relative overflow-hidden">
        {/* Top Header */}
        <div className="p-6 bg-[#0e0f14] border-b border-neutral-800 flex justify-between items-center shrink-0">
          <div>
            <div className="text-[9px] text-neutral-500 uppercase tracking-widest">TACTICAL SIMULATION DOCK</div>
            <h2 className="text-xl font-heading font-black text-white uppercase tracking-tight">Logic & Domain Calibration</h2>
          </div>
          <button onClick={onClose} className="p-2 text-neutral-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
          {activeGame === 'selection' ? (
            <div className="flex flex-col items-center justify-center min-h-full">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
                <div 
                  onClick={() => setActiveGame('crossword')}
                  className="bg-[#12141a] border border-neutral-800 hover:border-neutral-600 p-8 rounded-sm transition-all cursor-pointer group"
                >
                  <div className="w-12 h-12 bg-white text-black rounded-sm flex items-center justify-center mb-6">
                    <Hash size={24}/>
                  </div>
                  <h3 className="text-xl font-heading font-black text-white uppercase tracking-tight mb-2">Agency Crossword</h3>
                  <p className="text-neutral-400 text-xs leading-relaxed uppercase">Agency terminology, industry acronyms, and client servicing protocols.</p>
                  <div className="mt-6 flex items-center justify-between pt-4 border-t border-neutral-800 text-[10px] text-white uppercase font-bold">
                    <span>Initialize Matrix</span>
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                <div className="bg-[#12141a]/40 border border-neutral-800/60 p-8 rounded-sm opacity-50 cursor-not-allowed">
                  <div className="w-12 h-12 bg-[#0c0d12] border border-neutral-800 text-neutral-500 rounded-sm flex items-center justify-center mb-6">
                    <Layers size={24}/>
                  </div>
                  <h3 className="text-xl font-heading font-black text-neutral-400 uppercase tracking-tight mb-2">Numerical Logic Grid</h3>
                  <p className="text-neutral-500 text-xs leading-relaxed uppercase">High-speed calculations and media plan optimization logic.</p>
                  <div className="mt-6 pt-4 border-t border-neutral-800/40 text-[10px] text-neutral-600 uppercase">
                    Protocol Locked
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-[#12141a] p-4 rounded-sm border border-neutral-800">
                <div className="flex items-center gap-3">
                  <button onClick={() => setActiveGame('selection')} className="p-2 bg-[#0c0d12] border border-neutral-800 text-neutral-400 hover:text-white rounded-sm">
                    <ArrowRight className="rotate-180" size={16}/>
                  </button>
                  <div>
                    <h3 className="font-heading font-black text-white uppercase text-base">Agency Crossword</h3>
                    <div className="text-[9px] text-neutral-500 uppercase">Status: Live Calibration</div>
                  </div>
                </div>
                <div className="text-right text-xs">
                  <span className="text-neutral-500 uppercase text-[9px] block">Operator Score</span>
                  <span className="text-xl font-black text-white">{score} PTS</span>
                </div>
              </div>

              <CrosswordGame onComplete={(s) => setScore(s)} />
            </div>
          )}
        </div>

        {/* Global Leaderboard Footer */}
        <div className="p-4 bg-[#0e0f14] border-t border-neutral-800 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-3">
            <Trophy size={16} className="text-neutral-400" />
            <span className="text-[10px] uppercase tracking-wider text-neutral-400">Team High Scores</span>
          </div>
          <div className="flex items-center gap-4 overflow-x-auto">
            {staffList.slice(0, 4).map((s, i) => (
              <div key={s.id} className="flex items-center gap-2 text-[10px] uppercase text-neutral-400">
                <span className="text-white font-bold">#{i+1}</span>
                <span>{s.name.split(' ')[0]}</span>
                <span className="text-neutral-500">{95 - i * 5}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameHub;
