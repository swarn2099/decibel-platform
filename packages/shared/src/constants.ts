export const CATEGORIES = ['music', 'restaurants', 'fashion', 'tech'] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_COLORS: Record<Category, string> = {
  music: '#9B6DFF',
  restaurants: '#FF4D6A',
  fashion: '#00D4AA',
  tech: '#4D9AFF',
};

export const COLORS = {
  background: '#0B0B0F',
  card: '#1A1A22',
  purple: '#9B6DFF',
  pink: '#FF4D6A',
  teal: '#00D4AA',
  gold: '#FFD700',
  blue: '#4D9AFF',
  textPrimary: '#FFFFFF',
  textSecondary: '#CCCCCC',
  textMuted: '#888888',
} as const;
