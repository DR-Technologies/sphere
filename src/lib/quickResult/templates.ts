export type QuickResultTemplateId = 'modern' | 'editorial' | 'dark';

export interface QuickResultTemplate {
  id: QuickResultTemplateId;
  name: string;
  description: string;
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  mutedText: string;
  accent: string;
  glow: string;
  chartColors: string[];
}

export const QUICK_RESULT_TEMPLATES: QuickResultTemplate[] = [
  {
    id: 'modern',
    name: 'Modern',
    description: 'Limpio, luminoso y balanceado para compartir rápido.',
    background: 'radial-gradient(circle at top left, rgba(100, 170, 255, 0.18), transparent 30%), linear-gradient(180deg, #0d1320 0%, #111828 100%)',
    surface: 'rgba(13, 20, 33, 0.72)',
    surfaceAlt: 'rgba(255,255,255,0.05)',
    border: 'rgba(255,255,255,0.12)',
    text: '#f5f7fb',
    mutedText: 'rgba(228, 234, 245, 0.72)',
    accent: '#7dd3fc',
    glow: 'rgba(125, 211, 252, 0.22)',
    chartColors: ['#7dd3fc', '#818cf8', '#34d399', '#f59e0b', '#f43f5e', '#a78bfa', '#22d3ee']
  },
  {
    id: 'editorial',
    name: 'Editorial',
    description: 'Más aire, contraste suave y foco en jerarquía.',
    background: 'linear-gradient(180deg, #16121c 0%, #10151d 100%)',
    surface: 'rgba(24, 25, 33, 0.78)',
    surfaceAlt: 'rgba(255,255,255,0.03)',
    border: 'rgba(255,255,255,0.08)',
    text: '#fbf7f1',
    mutedText: 'rgba(251, 247, 241, 0.68)',
    accent: '#fbbf24',
    glow: 'rgba(251, 191, 36, 0.18)',
    chartColors: ['#fbbf24', '#fb7185', '#38bdf8', '#34d399', '#a78bfa', '#f97316', '#60a5fa']
  },
  {
    id: 'dark',
    name: 'Dark',
    description: 'Más dramático, premium y enfocado en presentación.',
    background: 'radial-gradient(circle at top, rgba(99, 102, 241, 0.16), transparent 28%), linear-gradient(180deg, #070b12 0%, #0c1119 100%)',
    surface: 'rgba(10, 16, 26, 0.82)',
    surfaceAlt: 'rgba(255,255,255,0.035)',
    border: 'rgba(255,255,255,0.1)',
    text: '#f8fafc',
    mutedText: 'rgba(226, 232, 240, 0.68)',
    accent: '#8b5cf6',
    glow: 'rgba(139, 92, 246, 0.24)',
    chartColors: ['#8b5cf6', '#06b6d4', '#f43f5e', '#22c55e', '#f59e0b', '#3b82f6', '#ec4899']
  }
];

export function getQuickResultTemplate(templateId: QuickResultTemplateId) {
  return QUICK_RESULT_TEMPLATES.find((template) => template.id === templateId) || QUICK_RESULT_TEMPLATES[0];
}
