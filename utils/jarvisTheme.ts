import { JarvisThemeConfig, JarvisPresetId } from '../types';

export const JARVIS_THEME_PRESETS: Record<JarvisPresetId, JarvisThemeConfig> = {
  'arc-cyan': {
    presetId: 'arc-cyan',
    name: 'JARVIS Arc Cyan',
    tagline: 'Mark 85 // Quantum Arc Reactor',
    primaryAccent: '#00f0ff',
    secondaryAccent: '#0284c7',
    bgDark: '#040711',
    glassBlur: 'liquid',
    glowIntensity: 'high',
    glassOpacity: 0.82,
    ambientOrbs: true,
    audioFeedback: true,
    scanlineEffect: true,
    hudBorders: true
  },
  'mark-crimson': {
    presetId: 'mark-crimson',
    name: 'Mark XLVII Crimson',
    tagline: 'Stark Vanguard // Core Thermal Matrix',
    primaryAccent: '#ff2a5f',
    secondaryAccent: '#f59e0b',
    bgDark: '#0b0407',
    glassBlur: 'liquid',
    glowIntensity: 'high',
    glassOpacity: 0.82,
    ambientOrbs: true,
    audioFeedback: true,
    scanlineEffect: true,
    hudBorders: true
  },
  'friday-emerald': {
    presetId: 'friday-emerald',
    name: 'F.R.I.D.A.Y. Emerald',
    tagline: 'Tactical Matrix // Neural Mesh',
    primaryAccent: '#10b981',
    secondaryAccent: '#06b6d4',
    bgDark: '#030d08',
    glassBlur: 'liquid',
    glowIntensity: 'medium',
    glassOpacity: 0.82,
    ambientOrbs: true,
    audioFeedback: true,
    scanlineEffect: true,
    hudBorders: true
  },
  'veronica-violet': {
    presetId: 'veronica-violet',
    name: 'Veronica Amethyst',
    tagline: 'Orbital Uplink // Violet Ion Pulse',
    primaryAccent: '#a855f7',
    secondaryAccent: '#6366f1',
    bgDark: '#090514',
    glassBlur: 'liquid',
    glowIntensity: 'high',
    glassOpacity: 0.82,
    ambientOrbs: true,
    audioFeedback: true,
    scanlineEffect: true,
    hudBorders: true
  },
  'solar-amber': {
    presetId: 'solar-amber',
    name: 'Solar HUD Amber',
    tagline: 'Avionics Telemetry // High Contrast',
    primaryAccent: '#f59e0b',
    secondaryAccent: '#ea580c',
    bgDark: '#0e0904',
    glassBlur: 'liquid',
    glowIntensity: 'medium',
    glassOpacity: 0.82,
    ambientOrbs: true,
    audioFeedback: true,
    scanlineEffect: true,
    hudBorders: true
  },
  'stealth-chrome': {
    presetId: 'stealth-chrome',
    name: 'Titanium Chrome',
    tagline: 'Stealth Liquid Glass // Pure Monolith',
    primaryAccent: '#38bdf8',
    secondaryAccent: '#e2e8f0',
    bgDark: '#06070a',
    glassBlur: 'deep',
    glowIntensity: 'subtle',
    glassOpacity: 0.88,
    ambientOrbs: true,
    audioFeedback: true,
    scanlineEffect: false,
    hudBorders: true
  },
  'custom': {
    presetId: 'custom',
    name: 'Custom JARVIS Node',
    tagline: 'Operator Custom Spectrum',
    primaryAccent: '#00f0ff',
    secondaryAccent: '#6366f1',
    bgDark: '#05070e',
    glassBlur: 'liquid',
    glowIntensity: 'high',
    glassOpacity: 0.82,
    ambientOrbs: true,
    audioFeedback: true,
    scanlineEffect: true,
    hudBorders: true
  }
};

const STORAGE_KEY = 'mw_jarvis_theme_config';

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean, 16);
  if (isNaN(bigint)) return { r: 0, g: 240, b: 255 };
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255
  };
}

export function applyJarvisThemeToDOM(config: JarvisThemeConfig) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const pRgb = hexToRgb(config.primaryAccent);
  const sRgb = hexToRgb(config.secondaryAccent);
  const bgRgb = hexToRgb(config.bgDark);

  const blurValues = {
    subtle: '12px',
    liquid: '24px',
    deep: '40px'
  };

  const glowMultipliers = {
    subtle: '0.25',
    medium: '0.45',
    high: '0.85'
  };

  // Primary variables
  root.style.setProperty('--jarvis-primary', config.primaryAccent);
  root.style.setProperty('--jarvis-primary-rgb', `${pRgb.r}, ${pRgb.g}, ${pRgb.b}`);
  root.style.setProperty('--jarvis-secondary', config.secondaryAccent);
  root.style.setProperty('--jarvis-secondary-rgb', `${sRgb.r}, ${sRgb.g}, ${sRgb.b}`);
  root.style.setProperty('--jarvis-bg-dark', config.bgDark);
  root.style.setProperty('--jarvis-bg-dark-rgb', `${bgRgb.r}, ${bgRgb.g}, ${bgRgb.b}`);

  // Liquid glass variables
  root.style.setProperty('--jarvis-blur', blurValues[config.glassBlur]);
  root.style.setProperty('--jarvis-glass-opacity', config.glassOpacity.toString());
  root.style.setProperty('--jarvis-glass-bg', `rgba(${bgRgb.r}, ${bgRgb.g}, ${bgRgb.b}, ${config.glassOpacity})`);
  root.style.setProperty('--jarvis-glass-highlight', `rgba(${pRgb.r}, ${pRgb.g}, ${pRgb.b}, 0.08)`);
  root.style.setProperty('--jarvis-border', `rgba(${pRgb.r}, ${pRgb.g}, ${pRgb.b}, 0.22)`);
  root.style.setProperty('--jarvis-border-glow', `rgba(${pRgb.r}, ${pRgb.g}, ${pRgb.b}, ${glowMultipliers[config.glowIntensity]})`);
  root.style.setProperty('--jarvis-glow', `0 0 24px -2px rgba(${pRgb.r}, ${pRgb.g}, ${pRgb.b}, ${glowMultipliers[config.glowIntensity]})`);
  root.style.setProperty('--jarvis-glow-lg', `0 0 45px -4px rgba(${pRgb.r}, ${pRgb.g}, ${pRgb.b}, ${glowMultipliers[config.glowIntensity]})`);

  // Document body background tint
  document.body.style.backgroundColor = config.bgDark;
}

export function loadSavedJarvisTheme(): JarvisThemeConfig {
  if (typeof window === 'undefined') return JARVIS_THEME_PRESETS['arc-cyan'];
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...JARVIS_THEME_PRESETS['arc-cyan'],
        ...parsed
      };
    }
  } catch (e) {
    console.error('Failed to parse saved JARVIS theme:', e);
  }
  return JARVIS_THEME_PRESETS['arc-cyan'];
}

export function saveJarvisTheme(config: JarvisThemeConfig) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    applyJarvisThemeToDOM(config);
  } catch (e) {
    console.error('Failed to save JARVIS theme:', e);
  }
}
