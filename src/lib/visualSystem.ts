export type PresentationTemplateId = 'modern' | 'editorial' | 'dark';

export interface VisualSurfaceTokens {
  background: string;
  pageBackground: string;
  surface: string;
  surfaceAlt: string;
  panel: string;
  sidebar: string;
  header: string;
  control: string;
  controlHover: string;
  border: string;
  borderStrong: string;
  text: string;
  mutedText: string;
  accent: string;
  accentContrast: string;
  glow: string;
  shadow: string;
  chartColors: string[];
}

export interface MotionTokens {
  ultraFast: number;
  fast: number;
  medium: number;
  slow: number;
  dramatic: number;
  easeStandard: [number, number, number, number];
  easeEmphasis: [number, number, number, number];
  easeEntrance: [number, number, number, number];
}

export interface SphereVisualSystem {
  fontFamily: string;
  fontMono: string;
  radius: {
    small: number;
    medium: number;
    large: number;
    xl: number;
    pill: number;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  shadow: {
    soft: string;
    float: string;
    glow: string;
  };
  shell: {
    heroRadius: number;
    cardRadius: number;
    panelRadius: number;
    pagePadding: number;
    pagePaddingMobile: number;
    cardPadding: number;
    cardPaddingCompact: number;
    gridGap: number;
    gridGapMobile: number;
    stagePadding: number;
  };
  motion: MotionTokens;
  templates: Record<PresentationTemplateId, VisualSurfaceTokens>;
}

export const SPHERE_VISUAL_SYSTEM: SphereVisualSystem = {
  fontFamily: 'var(--font-sans), "Geist", "Inter", "Segoe UI", sans-serif',
  fontMono: 'var(--font-mono), "Geist Mono", "JetBrains Mono", "DejaVu Sans Mono", monospace',
  radius: {
    small: 6,
    medium: 12,
    large: 18,
    xl: 24,
    pill: 999
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 40
  },
  shadow: {
    soft: '0 18px 48px rgba(11, 18, 33, 0.12)',
    float: '0 24px 60px rgba(11, 18, 33, 0.16)',
    glow: '0 18px 44px rgba(0, 88, 190, 0.16)'
  },
  shell: {
    heroRadius: 20,
    cardRadius: 18,
    panelRadius: 16,
    pagePadding: 24,
    pagePaddingMobile: 16,
    cardPadding: 20,
    cardPaddingCompact: 16,
    gridGap: 18,
    gridGapMobile: 14,
    stagePadding: 16
  },
  motion: {
    ultraFast: 0.16,
    fast: 0.24,
    medium: 0.42,
    slow: 0.72,
    dramatic: 1.1,
    easeStandard: [0.4, 0, 0.2, 1],
    easeEmphasis: [0.22, 1, 0.36, 1],
    easeEntrance: [0.16, 1, 0.3, 1]
  },
  templates: {
    modern: {
      background: 'linear-gradient(180deg, #fbfcff 0%, #f5f8ff 56%, #eef3ff 100%)',
      pageBackground: 'radial-gradient(circle at top left, rgba(0, 88, 190, 0.08), transparent 24%), radial-gradient(circle at top right, rgba(79, 219, 200, 0.08), transparent 18%), linear-gradient(180deg, #fbfcff 0%, #f4f7ff 54%, #edf2ff 100%)',
      surface: 'rgba(255, 255, 255, 0.88)',
      surfaceAlt: 'rgba(247, 250, 255, 0.92)',
      panel: 'rgba(255, 255, 255, 0.94)',
      sidebar: 'rgba(255, 255, 255, 0.92)',
      header: 'rgba(255, 255, 255, 0.78)',
      control: '#f8fafc',
      controlHover: '#eef4ff',
      border: 'rgba(194, 198, 214, 0.72)',
      borderStrong: 'rgba(0, 88, 190, 0.28)',
      text: '#111c2d',
      mutedText: '#5b667a',
      accent: '#0058be',
      accentContrast: '#ffffff',
      glow: 'rgba(0, 88, 190, 0.16)',
      shadow: '0 18px 42px rgba(31, 55, 104, 0.12)',
      chartColors: ['#0058be', '#4f46e5', '#18b59c', '#f97316', '#e11d48', '#9333ea', '#0ea5e9']
    },
    editorial: {
      background: 'linear-gradient(180deg, #fcfbf8 0%, #f7f2ea 100%)',
      pageBackground: 'radial-gradient(circle at top left, rgba(158, 102, 58, 0.08), transparent 22%), linear-gradient(180deg, #fcfbf8 0%, #f6f1e9 54%, #efe7dd 100%)',
      surface: 'rgba(255, 252, 246, 0.9)',
      surfaceAlt: 'rgba(248, 242, 232, 0.9)',
      panel: 'rgba(255, 251, 244, 0.95)',
      sidebar: 'rgba(255, 252, 246, 0.94)',
      header: 'rgba(255, 252, 246, 0.78)',
      control: '#f7f0e6',
      controlHover: '#efe5d7',
      border: 'rgba(198, 182, 164, 0.74)',
      borderStrong: 'rgba(158, 102, 58, 0.34)',
      text: '#1f1f20',
      mutedText: '#695f57',
      accent: '#9e663a',
      accentContrast: '#fffaf4',
      glow: 'rgba(158, 102, 58, 0.16)',
      shadow: '0 20px 48px rgba(70, 49, 31, 0.12)',
      chartColors: ['#9e663a', '#0058be', '#b3476b', '#18b59c', '#6f52c8', '#e37d2f', '#334155']
    },
    dark: {
      background: 'linear-gradient(180deg, #131314 0%, #17181d 48%, #1b1d22 100%)',
      pageBackground: 'radial-gradient(circle at top left, rgba(173, 198, 255, 0.1), transparent 20%), radial-gradient(circle at top right, rgba(79, 219, 200, 0.08), transparent 16%), linear-gradient(180deg, #131314 0%, #17181d 50%, #1a1c22 100%)',
      surface: 'rgba(28, 27, 28, 0.84)',
      surfaceAlt: 'rgba(255,255,255,0.04)',
      panel: 'rgba(24, 24, 27, 0.92)',
      sidebar: 'rgba(24, 24, 27, 0.9)',
      header: 'rgba(28, 27, 28, 0.76)',
      control: 'rgba(255,255,255,0.05)',
      controlHover: 'rgba(255,255,255,0.08)',
      border: 'rgba(140, 144, 159, 0.34)',
      borderStrong: 'rgba(173, 198, 255, 0.34)',
      text: '#f5f7fb',
      mutedText: 'rgba(221, 225, 234, 0.7)',
      accent: '#adc6ff',
      accentContrast: '#131314',
      glow: 'rgba(173, 198, 255, 0.16)',
      shadow: '0 18px 44px rgba(0, 0, 0, 0.42)',
      chartColors: ['#adc6ff', '#ddb7ff', '#4fdbc8', '#ff8b8b', '#f5c451', '#78b0ff', '#8ee6ff']
    }
  }
};

export function getTemplateTokens(templateId: PresentationTemplateId) {
  return SPHERE_VISUAL_SYSTEM.templates[templateId] || SPHERE_VISUAL_SYSTEM.templates.modern;
}
