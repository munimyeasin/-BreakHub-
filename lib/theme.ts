export type ThemeId =
  | 'neo-dark'
  | 'neo-light';

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
