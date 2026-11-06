export type ThemeId =
  | 'neo-dark'
  | 'neo-light'
  | 'midnight-coral';

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
    id: 'midnight-coral',
    name: 'Midnight Coral',
    label: 'Navy Theme',
    tagline: 'Deep Navy & Coral Luxury',
    description: 'A modern, high-end dark mode incorporating deep navy background (#14213D), cream typography (#F4EDEO), and vibrant coral accents (#FF6B58).',
    badge: 'MODERN',
    isDark: true,
    status: 'active',
    icon: 'Sparkles',
    previewColors: {
      bg: '#14213D',
      surface: '#1D2D50',
      card: '#273c68',
      accent: '#FF6B58',
      accentSecondary: '#F4EDEO',
      border: '#000000',
      text: '#F4EDEO',
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
