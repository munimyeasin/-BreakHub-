export type ThemeId =
  | 'neo-dark'
  | 'neo-light'
  | 'cozy-dark'
  | 'cozy-light'
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
  icon: 'Moon' | 'Sun' | 'Zap' | 'Gamepad2' | 'Sparkles' | 'Coffee';
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
    id: 'cozy-dark',
    name: 'Cozy Amber Dusk',
    label: 'Cozy Dark',
    tagline: 'Warm Espresso & Velvet Amber Glow',
    description: 'Velvet espresso ground with warm amber gold highlights, soft lavender tones, twinkling ambient stars, and tranquil midnight café atmosphere.',
    badge: 'NEW',
    isDark: true,
    status: 'active',
    icon: 'Coffee',
    previewColors: {
      bg: '#0D0B0F',
      surface: '#171318',
      card: '#211A20',
      accent: '#ECA85C',
      accentSecondary: '#8670A6',
      border: '#F5D2A6',
      text: '#F5E9D7',
    },
  },
  {
    id: 'cozy-light',
    name: 'Cozy Amber Dawn',
    label: 'Cozy Light',
    tagline: 'Sunlit Parchment & Cinnamon Amber',
    description: 'Sunlit parchment canvas with rich cinnamon amber accents, warm cream surfaces, soft shadows, and morning café aesthetics.',
    badge: 'NEW',
    isDark: false,
    status: 'active',
    icon: 'Sun',
    previewColors: {
      bg: '#F6EEE4',
      surface: '#FFFAF4',
      card: '#F1E6D9',
      accent: '#C87932',
      accentSecondary: '#80669B',
      border: '#533A26',
      text: '#35281F',
    },
  },
  {
    id: 'cyberpunk-neon',
    name: 'Cyberpunk Neon 2077',
    label: 'Cyberpunk',
    tagline: 'High Voltage Holographic Matrix',
    description: 'Deep navy circuit grid with radioactive greens, high-voltage magenta glows, and chromatic aberration aesthetics.',
    badge: 'COMING SOON',
    isDark: true,
    status: 'upcoming',
    icon: 'Zap',
    previewColors: {
      bg: '#050814',
      surface: '#0B132B',
      card: '#1C2541',
      accent: '#39FF14',
      accentSecondary: '#FF0055',
      border: '#00FFFF',
      text: '#E0FBFC',
    },
  },
  {
    id: 'gameboy-retro',
    name: '8-Bit GameBoy Classic',
    label: '8-Bit DMG',
    tagline: '4-Shade Olive Green Dot Matrix',
    description: 'Authentic 1989 handheld gaming nostalgia with 4 distinct shades of olive green and pixel-grid scanlines.',
    badge: 'IN DESIGN',
    isDark: false,
    status: 'upcoming',
    icon: 'Gamepad2',
    previewColors: {
      bg: '#8B956D',
      surface: '#9BBC0F',
      card: '#8BAC0F',
      accent: '#306230',
      accentSecondary: '#0F380F',
      border: '#0F380F',
      text: '#0F380F',
    },
  },
  {
    id: 'vaporwave-80s',
    name: 'Vaporwave Sunset',
    label: 'Synthwave 80s',
    tagline: 'Pastel Sunset & Palm Grid',
    description: 'Dreamy purple dusk horizons, pastel peach gradients, laser grids, and nostalgic 80s mall aesthetics.',
    badge: 'CONCEPT',
    isDark: true,
    status: 'upcoming',
    icon: 'Sparkles',
    previewColors: {
      bg: '#1A0B2E',
      surface: '#2D124D',
      card: '#3D1B63',
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
