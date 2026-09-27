export type ThemeId =
  | 'neo-dark'
  | 'neo-light'
  | 'cyberpunk-neon'
  | 'gameboy-retro'
  | 'vaporwave-80s';

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  label: string;
  tagline: string;
  description: string;
  badge?: string;
  isDark: boolean;
  status: 'active' | 'upcoming';
  icon: 'Moon' | 'Sun' | 'Zap' | 'Gamepad2' | 'Sparkles';
  previewColors: {
    bg: string;
    surface: string;
    card: string;
    accent: string;
    accentSecondary: string;
    border: string;
    text: string;
  };
}

export const THEMES_REGISTRY: ThemeDefinition[] = [
  {
    id: 'neo-dark',
    name: 'Dark Neo-Brutalist',
    label: 'Dark Mode',
    tagline: 'Midnight Cyber Arcade Ground',
    description: 'High-contrast midnight violet foundation with electric cyan, cyber yellow, and hot pink neon accents under crisp solid borders.',
    badge: 'CLASSIC',
    isDark: true,
    status: 'active',
    icon: 'Moon',
    previewColors: {
      bg: '#0B0819',
      surface: '#130F26',
      card: '#1C1635',
      accent: '#00F0FF',
      accentSecondary: '#FFE600',
      border: '#000000',
      text: '#FFFFFF',
    },
  },
  {
    id: 'neo-light',
    name: 'Light Neo-Brutalist',
    label: 'Light Mode',
    tagline: 'Retro Vintage Paper Canvas',
    description: 'Warm cream paper ground, crisp white panels, bold pitch-black borders, tactile drop shadows, and high-contrast retro arcade typography.',
    badge: 'RETRO',
    isDark: false,
    status: 'active',
    icon: 'Sun',
    previewColors: {
      bg: '#FFFDF0',
      surface: '#FFFFFF',
      card: '#FFF8E7',
      accent: '#FFE600',
      accentSecondary: '#FF4081',
      border: '#000000',
      text: '#000000',
    },
  },
  {
    id: 'cyberpunk-neon',
    name: 'Cyberpunk Neon 2077',
    label: 'Cyberpunk',
    tagline: 'High Voltage Holographic Matrix',
    description: 'Deep obsidian circuit grid with radioactive greens, high-voltage magenta glows, electric cyan lasers, and chromatic aberration aesthetics.',
    badge: 'ULTRA NEON',
    isDark: true,
    status: 'active',
    icon: 'Zap',
    previewColors: {
      bg: '#050814',
      surface: '#0B132B',
      card: '#121E3A',
      accent: '#39FF14',
      accentSecondary: '#FF0055',
      border: '#00F0FF',
      text: '#E0FBFC',
    },
  },
  {
    id: 'gameboy-retro',
    name: '8-Bit GameBoy Ultra',
    label: '8-Bit DMG',
    tagline: 'Phosphor Matrix & Arcade Power',
    description: 'Vibrant 8-bit handheld gaming nostalgia featuring authentic Nintendo burgundy A/B buttons, luminous LCD phosphor greens, and crisp dark pixel borders.',
    badge: '8-BIT RETRO',
    isDark: false,
    status: 'active',
    icon: 'Gamepad2',
    previewColors: {
      bg: '#7E8C5A',
      surface: '#A4C614',
      card: '#91B012',
      accent: '#D91448',
      accentSecondary: '#2B304A',
      border: '#081808',
      text: '#081808',
    },
  },
  {
    id: 'vaporwave-80s',
    name: 'Vaporwave Sunset',
    label: 'Synthwave 80s',
    tagline: 'Pastel Sunset & Laser Horizon',
    description: 'Dreamy synthwave dusk purple horizons, glowing pastel sunset magenta, laser cyan grids, and nostalgic 80s arcade mall aesthetics.',
    badge: 'SYNTHWAVE',
    isDark: true,
    status: 'active',
    icon: 'Sparkles',
    previewColors: {
      bg: '#140827',
      surface: '#220F3E',
      card: '#311559',
      accent: '#FF71CE',
      accentSecondary: '#01CDFE',
      border: '#05FFA1',
      text: '#FFFFFF',
    },
  },
];

export const DEFAULT_THEME: ThemeId = 'neo-dark';
export const THEME_STORAGE_KEY = 'stressbuster_ui_theme';

export function getTheme(id: string): ThemeDefinition {
  return THEMES_REGISTRY.find(t => t.id === id) || THEMES_REGISTRY[0];
}

export function getActiveThemes(): ThemeDefinition[] {
  return THEMES_REGISTRY.filter(t => t.status === 'active');
}

export function getUpcomingThemes(): ThemeDefinition[] {
  return THEMES_REGISTRY.filter(t => t.status === 'upcoming');
}
