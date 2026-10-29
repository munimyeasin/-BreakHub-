export type ThemeId = 'light' | 'dark';

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  label: string;
  tagline: string;
  description: string;
  isDark: boolean;
  status: 'active' | 'upcoming';
  icon: 'Moon' | 'Sun' | 'Zap' | 'Gamepad2' | 'Sparkles';
  badge?: string;
  previewColors: {
    bg: string;
    card: string;
    accent: string;
    accentSecondary: string;
  };
}

export const THEMES_REGISTRY: ThemeDefinition[] = [
  {
    id: 'light',
    name: 'Clean Light',
    label: 'Light Mode',
    tagline: 'Modern Minimalist Light Canvas',
    description: 'Clean white background, crisp neutral borders, and high readability.',
    isDark: false,
    status: 'active',
    icon: 'Sun',
    previewColors: {
      bg: '#f8fafc',
      card: '#ffffff',
      accent: '#2563eb',
      accentSecondary: '#3b82f6',
    },
  },
  {
    id: 'dark',
    name: 'Clean Dark',
    label: 'Dark Mode',
    tagline: 'Sleek Modern Dark Canvas',
    description: 'Deep slate background with high-contrast text and clean borders.',
    isDark: true,
    status: 'active',
    icon: 'Moon',
    previewColors: {
      bg: '#0f172a',
      card: '#1e293b',
      accent: '#3b82f6',
      accentSecondary: '#60a5fa',
    },
  },
];

export const DEFAULT_THEME: ThemeId = 'light';
export const THEME_STORAGE_KEY = 'breakhub_ui_theme';

export function getTheme(id: string): ThemeDefinition {
  return THEMES_REGISTRY.find(t => t.id === id) || THEMES_REGISTRY[0];
}

export function getActiveThemes(): ThemeDefinition[] {
  return THEMES_REGISTRY.filter(t => t.status === 'active');
}

export function getUpcomingThemes(): ThemeDefinition[] {
  return THEMES_REGISTRY.filter(t => t.status === 'upcoming');
}
