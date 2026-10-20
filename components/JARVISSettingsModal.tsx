import React, { useState, useEffect } from 'react';
import { JarvisThemeConfig, JarvisPresetId } from '../types';
import { JARVIS_THEME_PRESETS } from '../utils/jarvisTheme';
import { playJarvisSound } from '../utils/jarvisAudio';
import { 
  X, Sliders, Sparkles, Volume2, VolumeX, Eye, RotateCcw, 
  Palette, Cpu, CheckCircle2, Shield, Radio, Activity, 
  Layers, Sun, Compass, Disc, Zap, Flame, Monitor
} from 'lucide-react';

interface JARVISSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: JarvisThemeConfig;
  onSaveTheme: (config: JarvisThemeConfig) => void;
}

const PRESET_ICONS: Record<string, React.ElementType> = {
  'arc-cyan': Zap,
  'mark-crimson': Flame,
  'friday-emerald': Activity,
  'veronica-violet': Compass,
  'solar-amber': Sun,
  'stealth-chrome': Disc,
  'custom': Palette
};

const SWATCH_PALETTE = [
  '#00f0ff', '#0284c7', '#38bdf8', '#10b981', '#06b6d4', 
  '#22c55e', '#ff2a5f', '#ef4444', '#f59e0b', '#ea580c', 
  '#a855f7', '#8b5cf6', '#6366f1', '#ec4899', '#ffffff'
];

const BG_PRESETS = [
  { label: 'Deep Arc Void', value: '#040711' },
  { label: 'Pure Obsidian', value: '#050507' },
  { label: 'Crimson Dusk', value: '#0b0407' },
  { label: 'Matrix Shadow', value: '#030d08' },
  { label: 'Nebula Violet', value: '#090514' },
  { label: 'Tactical Bronze', value: '#0e0904' },
  { label: 'Pitch Black', value: '#000000' }
];

export const JARVISSettingsModal: React.FC<JARVISSettingsModalProps> = ({
  isOpen,
  onClose,
  currentTheme,
  onSaveTheme
}) => {
  const [activeTab, setActiveTab] = useState<'presets' | 'custom' | 'optics'>('presets');
  const [config, setConfig] = useState<JarvisThemeConfig>(currentTheme);

  useEffect(() => {
    setConfig(currentTheme);
  }, [currentTheme]);

  if (!isOpen) return null;

  const handlePresetSelect = (presetId: JarvisPresetId) => {
    const selected = JARVIS_THEME_PRESETS[presetId];
    if (selected) {
      const updated = { ...selected, audioFeedback: config.audioFeedback };
      setConfig(updated);
      onSaveTheme(updated);
      playJarvisSound('theme_switch', !config.audioFeedback);
    }
  };

  const handleUpdate = (patch: Partial<JarvisThemeConfig>) => {
    const updated: JarvisThemeConfig = {
      ...config,
      ...patch,
      presetId: 'custom'
    };
    setConfig(updated);
    onSaveTheme(updated);
  };

  const handleReset = () => {
    const defaultTheme = JARVIS_THEME_PRESETS['arc-cyan'];
    setConfig(defaultTheme);
    onSaveTheme(defaultTheme);
    playJarvisSound('deploy', !defaultTheme.audioFeedback);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
      <div 
        className="w-full max-w-4xl bg-[#05070e]/95 border border-[var(--jarvis-border)] rounded-sm shadow-[0_0_50px_-5px_rgba(var(--jarvis-primary-rgb),0.35)] overflow-hidden flex flex-col max-h-[92vh] hud-frame"
        style={{
          backdropFilter: 'blur(30px)'
        }}
      >
        {/* Top Header */}
        <div className="p-4 sm:p-6 border-b border-[var(--jarvis-border)] flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-black/60 border border-[var(--jarvis-primary)] flex items-center justify-center text-[var(--jarvis-primary)] shadow-[0_0_15px_rgba(var(--jarvis-primary-rgb),0.5)]">
              <Cpu size={22} className="animate-pulse" />
            </div>
            <div>
              <div className="font-mono text-[9px] text-[var(--jarvis-primary)] uppercase tracking-[0.25em] flex items-center gap-2">
                <span>STARK INDUSTRIES // SYSTEM CALIBRATION</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--jarvis-primary)] animate-ping" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight font-heading flex items-center gap-2">
                JARVIS THEME & OPTICS CONSOLE
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const nextAudio = !config.audioFeedback;
                handleUpdate({ audioFeedback: nextAudio });
                if (nextAudio) playJarvisSound('toggle', false);
              }}
              className={`p-2 rounded-sm border transition-all cursor-pointer ${
                config.audioFeedback 
                  ? 'border-[var(--jarvis-primary)] text-[var(--jarvis-primary)] bg-[rgba(var(--jarvis-primary-rgb),0.12)] shadow-[0_0_10px_rgba(var(--jarvis-primary-rgb),0.3)]' 
                  : 'border-neutral-800 text-neutral-500 hover:text-white'
              }`}
              title={config.audioFeedback ? "HUD Audio Synthesis Active" : "HUD Audio Muted"}
            >
              {config.audioFeedback ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>

            <button
              onClick={() => {
                playJarvisSound('click', !config.audioFeedback);
                onClose();
              }}
              className="p-2 text-neutral-400 hover:text-white border border-neutral-800 hover:border-neutral-600 rounded-sm transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-4 sm:px-6 pt-3 border-b border-neutral-800/80 bg-black/20">
          {[
            { id: 'presets', label: '01 // THEME PRESETS', icon: Sparkles },
            { id: 'custom', label: '02 // COLOR MATRIX', icon: Palette },
            { id: 'optics', label: '03 // LIQUID OPTICS & HUD', icon: Sliders }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                playJarvisSound('click', !config.audioFeedback);
              }}
              className={`px-4 py-2.5 font-mono text-xs uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'border-[var(--jarvis-primary)] text-white font-bold bg-[rgba(var(--jarvis-primary-rgb),0.08)]'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <tab.icon size={14} className={activeTab === tab.id ? 'text-[var(--jarvis-primary)]' : ''} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar">

          {/* TAB 1: THEME PRESETS */}
          {activeTab === 'presets' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-heading font-black text-white text-base uppercase tracking-tight">
                    Holographic Core Presets
                  </h3>
                  <p className="text-xs text-neutral-400 font-mono">
                    Select a battle-tested Stark Industries visual signature for all pages.
                  </p>
                </div>
                <div className="font-mono text-[10px] text-[var(--jarvis-primary)] px-2.5 py-1 bg-[rgba(var(--jarvis-primary-rgb),0.1)] border border-[var(--jarvis-primary)] rounded-xs uppercase">
                  ACTIVE: {config.name}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.values(JARVIS_THEME_PRESETS).filter(p => p.presetId !== 'custom').map(preset => {
                  const isSelected = config.presetId === preset.presetId;
                  const Icon = PRESET_ICONS[preset.presetId] || Zap;
                  
                  return (
                    <button
                      key={preset.presetId}
                      onClick={() => handlePresetSelect(preset.presetId)}
                      className={`text-left p-4 rounded-sm border transition-all relative overflow-hidden group cursor-pointer ${
                        isSelected 
                          ? 'border-[var(--jarvis-primary)] bg-[rgba(var(--jarvis-primary-rgb),0.12)] shadow-[0_0_25px_-5px_rgba(var(--jarvis-primary-rgb),0.5)]' 
                          : 'border-neutral-800/80 bg-black/40 hover:border-neutral-600 hover:bg-neutral-900/60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-7 h-7 rounded-sm flex items-center justify-center text-black font-black"
                            style={{ background: `linear-gradient(135deg, ${preset.primaryAccent}, ${preset.secondaryAccent})` }}
                          >
                            <Icon size={14} />
                          </div>
                          <span className="font-heading font-black text-xs text-white uppercase tracking-tight">
                            {preset.name}
                          </span>
                        </div>
                        {isSelected && (
                          <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-[var(--jarvis-primary)] text-black rounded-xs uppercase">
                            LIVE
                          </span>
                        )}
                      </div>

                      <p className="text-[10px] font-mono text-neutral-400 mb-3 truncate">
                        {preset.tagline}
                      </p>

                      {/* Swatch Pill preview */}
                      <div className="flex items-center gap-2 pt-2 border-t border-neutral-800/60">
                        <div className="flex items-center gap-1.5">
                          <span className="w-3.5 h-3.5 rounded-full border border-black/40 shadow-sm" style={{ backgroundColor: preset.primaryAccent }} />
                          <span className="w-3.5 h-3.5 rounded-full border border-black/40 shadow-sm" style={{ backgroundColor: preset.secondaryAccent }} />
                          <span className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm" style={{ backgroundColor: preset.bgDark }} />
                        </div>
                        <span className="font-mono text-[9px] text-neutral-500 uppercase ml-auto">
                          {preset.glassBlur.toUpperCase()} BLUR
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: CUSTOM COLOR MATRIX */}
          {activeTab === 'custom' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-heading font-black text-white text-base uppercase tracking-tight">
                  Custom Spectrum Calibrator
                </h3>
                <p className="text-xs text-neutral-400 font-mono">
                  Modify primary accent colors, reactor glows, and base canvas tones in real time.
                </p>
              </div>

              {/* Primary Accent */}
              <div className="p-4 bg-black/40 border border-neutral-800/80 rounded-sm space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="font-mono text-xs font-bold text-white uppercase flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: config.primaryAccent }} />
                      Primary Quantum Accent
                    </label>
                    <p className="font-mono text-[10px] text-neutral-400">Controls buttons, active badges, reactor glow & borders</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.primaryAccent}
                      onChange={(e) => handleUpdate({ primaryAccent: e.target.value })}
                      className="w-10 h-8 rounded-sm bg-transparent cursor-pointer border border-neutral-700"
                    />
                    <input
                      type="text"
                      value={config.primaryAccent}
                      onChange={(e) => handleUpdate({ primaryAccent: e.target.value })}
                      className="w-24 px-2 py-1 bg-neutral-900 border border-neutral-700 text-xs font-mono text-white uppercase rounded-sm outline-none"
                    />
                  </div>
                </div>

                {/* Quick Swatches */}
                <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-neutral-800/60">
                  <span className="font-mono text-[9px] text-neutral-500 uppercase mr-1">Presets:</span>
                  {SWATCH_PALETTE.map(hex => (
                    <button
                      key={hex}
                      onClick={() => handleUpdate({ primaryAccent: hex })}
                      className="w-6 h-6 rounded-sm border border-neutral-700 transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                      style={{ backgroundColor: hex }}
                      title={hex}
                    />
                  ))}
                </div>
              </div>

              {/* Secondary Accent */}
              <div className="p-4 bg-black/40 border border-neutral-800/80 rounded-sm space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="font-mono text-xs font-bold text-white uppercase flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: config.secondaryAccent }} />
                      Secondary Arc Gradient Accent
                    </label>
                    <p className="font-mono text-[10px] text-neutral-400">Blends with primary accent for liquid glass reflections</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.secondaryAccent}
                      onChange={(e) => handleUpdate({ secondaryAccent: e.target.value })}
                      className="w-10 h-8 rounded-sm bg-transparent cursor-pointer border border-neutral-700"
                    />
                    <input
                      type="text"
                      value={config.secondaryAccent}
                      onChange={(e) => handleUpdate({ secondaryAccent: e.target.value })}
                      className="w-24 px-2 py-1 bg-neutral-900 border border-neutral-700 text-xs font-mono text-white uppercase rounded-sm outline-none"
                    />
                  </div>
                </div>

                {/* Quick Swatches */}
                <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-neutral-800/60">
                  <span className="font-mono text-[9px] text-neutral-500 uppercase mr-1">Presets:</span>
                  {SWATCH_PALETTE.map(hex => (
                    <button
                      key={hex}
                      onClick={() => handleUpdate({ secondaryAccent: hex })}
                      className="w-6 h-6 rounded-sm border border-neutral-700 transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                      style={{ backgroundColor: hex }}
                      title={hex}
                    />
                  ))}
                </div>
              </div>

              {/* Base Background Tone */}
              <div className="p-4 bg-black/40 border border-neutral-800/80 rounded-sm space-y-3">
                <div>
                  <label className="font-mono text-xs font-bold text-white uppercase flex items-center gap-2 mb-1">
                    Base Matrix Tone
                  </label>
                  <p className="font-mono text-[10px] text-neutral-400 mb-3">Overall background darkness supporting the liquid glass layers</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {BG_PRESETS.map(bg => (
                    <button
                      key={bg.value}
                      onClick={() => handleUpdate({ bgDark: bg.value })}
                      className={`p-2 rounded-sm border text-left flex items-center gap-2 cursor-pointer transition-all ${
                        config.bgDark === bg.value
                          ? 'border-[var(--jarvis-primary)] bg-[rgba(var(--jarvis-primary-rgb),0.1)]'
                          : 'border-neutral-800 hover:border-neutral-600'
                      }`}
                    >
                      <span className="w-4 h-4 rounded-full border border-neutral-600" style={{ backgroundColor: bg.value }} />
                      <span className="font-mono text-[10px] text-white truncate">{bg.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: OPTICS & LIQUID GLASS */}
          {activeTab === 'optics' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-heading font-black text-white text-base uppercase tracking-tight">
                  Liquid Glass & Holographic Optics
                </h3>
                <p className="text-xs text-neutral-400 font-mono">
                  Tune backdrop-filter refraction, glow bloom, and HUD corner telemetry.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Glass Blur Level */}
                <div className="p-4 bg-black/40 border border-neutral-800/80 rounded-sm space-y-3">
                  <label className="font-mono text-xs font-bold text-white uppercase block">
                    Glass Refraction Blur
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'subtle', label: '12px Subtle' },
                      { id: 'liquid', label: '24px Liquid' },
                      { id: 'deep', label: '40px Deep' }
                    ].map(b => (
                      <button
                        key={b.id}
                        onClick={() => handleUpdate({ glassBlur: b.id as any })}
                        className={`py-2 px-2 text-center rounded-sm font-mono text-[10px] uppercase border transition-all cursor-pointer ${
                          config.glassBlur === b.id
                            ? 'border-[var(--jarvis-primary)] text-white font-bold bg-[rgba(var(--jarvis-primary-rgb),0.15)] shadow-[0_0_12px_rgba(var(--jarvis-primary-rgb),0.3)]'
                            : 'border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
                        }`}
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Glow Bloom Intensity */}
                <div className="p-4 bg-black/40 border border-neutral-800/80 rounded-sm space-y-3">
                  <label className="font-mono text-xs font-bold text-white uppercase block">
                    Quantum Glow Bloom
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'subtle', label: 'Stealth' },
                      { id: 'medium', label: 'Standard' },
                      { id: 'high', label: 'Reactor' }
                    ].map(g => (
                      <button
                        key={g.id}
                        onClick={() => handleUpdate({ glowIntensity: g.id as any })}
                        className={`py-2 px-2 text-center rounded-sm font-mono text-[10px] uppercase border transition-all cursor-pointer ${
                          config.glowIntensity === g.id
                            ? 'border-[var(--jarvis-primary)] text-white font-bold bg-[rgba(var(--jarvis-primary-rgb),0.15)] shadow-[0_0_12px_rgba(var(--jarvis-primary-rgb),0.3)]'
                            : 'border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
                        }`}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Glass Opacity */}
                <div className="p-4 bg-black/40 border border-neutral-800/80 rounded-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="font-mono text-xs font-bold text-white uppercase">
                      Glass Surface Opacity
                    </label>
                    <span className="font-mono text-xs text-[var(--jarvis-primary)]">
                      {Math.round(config.glassOpacity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="0.95"
                    step="0.05"
                    value={config.glassOpacity}
                    onChange={(e) => handleUpdate({ glassOpacity: parseFloat(e.target.value) })}
                    className="w-full accent-[var(--jarvis-primary)] cursor-pointer"
                  />
                  <div className="flex justify-between font-mono text-[9px] text-neutral-500">
                    <span>Translucent</span>
                    <span>Frosted</span>
                    <span>Solid</span>
                  </div>
                </div>

                {/* Ambient Dynamics Toggles */}
                <div className="p-4 bg-black/40 border border-neutral-800/80 rounded-sm space-y-2.5">
                  <label className="font-mono text-xs font-bold text-white uppercase block mb-1">
                    HUD Dynamics
                  </label>

                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-neutral-300">Ambient Liquid Orbs</span>
                    <button
                      onClick={() => handleUpdate({ ambientOrbs: !config.ambientOrbs })}
                      className={`px-3 py-1 font-mono text-[10px] rounded-xs uppercase font-bold border transition-all cursor-pointer ${
                        config.ambientOrbs 
                          ? 'bg-[var(--jarvis-primary)] text-black border-[var(--jarvis-primary)]' 
                          : 'bg-neutral-900 text-neutral-400 border-neutral-800'
                      }`}
                    >
                      {config.ambientOrbs ? 'ENABLED' : 'DISABLED'}
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-neutral-300">Scanline CRT Texture</span>
                    <button
                      onClick={() => handleUpdate({ scanlineEffect: !config.scanlineEffect })}
                      className={`px-3 py-1 font-mono text-[10px] rounded-xs uppercase font-bold border transition-all cursor-pointer ${
                        config.scanlineEffect 
                          ? 'bg-[var(--jarvis-primary)] text-black border-[var(--jarvis-primary)]' 
                          : 'bg-neutral-900 text-neutral-400 border-neutral-800'
                      }`}
                    >
                      {config.scanlineEffect ? 'ENABLED' : 'DISABLED'}
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-neutral-300">Corner Bracket Accents</span>
                    <button
                      onClick={() => handleUpdate({ hudBorders: !config.hudBorders })}
                      className={`px-3 py-1 font-mono text-[10px] rounded-xs uppercase font-bold border transition-all cursor-pointer ${
                        config.hudBorders 
                          ? 'bg-[var(--jarvis-primary)] text-black border-[var(--jarvis-primary)]' 
                          : 'bg-neutral-900 text-neutral-400 border-neutral-800'
                      }`}
                    >
                      {config.hudBorders ? 'ENABLED' : 'DISABLED'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Live Liquid Glass Interactive Preview Sandbox */}
          <div className="p-5 rounded-sm border border-[var(--jarvis-border)] bg-gradient-to-r from-black/60 via-black/40 to-black/60 relative overflow-hidden">
            <div className="font-mono text-[9px] text-[var(--jarvis-primary)] uppercase tracking-widest mb-3 flex items-center justify-between">
              <span>LIVE LIQUID GLASS SIMULATION</span>
              <span className="flex items-center gap-1.5 text-neutral-400">
                <Eye size={12} /> REAL-TIME PREVIEW
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <button 
                onClick={() => playJarvisSound('deploy', !config.audioFeedback)}
                className="jarvis-btn-primary px-5 py-2.5 rounded-sm text-xs font-mono font-black uppercase cursor-pointer"
              >
                + DEPLOY DIRECTIVE
              </button>

              <button 
                onClick={() => playJarvisSound('sonar', !config.audioFeedback)}
                className="jarvis-btn-secondary px-5 py-2.5 rounded-sm text-xs font-mono font-bold uppercase cursor-pointer"
              >
                OPEN SIMULATOR
              </button>

              <button
                onClick={() => playJarvisSound('chime', !config.audioFeedback)}
                className="px-4 py-2 bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 border border-neutral-700/80 rounded-sm text-xs font-mono uppercase cursor-pointer flex items-center gap-1.5"
              >
                <Volume2 size={13} className="text-[var(--jarvis-primary)]" /> Test Chime
              </button>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="p-4 sm:p-5 border-t border-[var(--jarvis-border)] flex items-center justify-between bg-black/40">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs font-mono text-neutral-400 hover:text-white uppercase tracking-wider transition-colors cursor-pointer"
          >
            <RotateCcw size={14} /> Reset Defaults
          </button>

          <button
            onClick={() => {
              playJarvisSound('deploy', !config.audioFeedback);
              onClose();
            }}
            className="jarvis-btn-primary px-6 py-2.5 rounded-sm font-mono text-xs uppercase font-black cursor-pointer shadow-lg"
          >
            Apply & Close Console
          </button>
        </div>
      </div>
    </div>
  );
};

export default JARVISSettingsModal;
