import { getTemplateTokens, type PresentationTemplateId, type VisualSurfaceTokens } from '@/lib/visualSystem';

export type QuickResultTemplateId = PresentationTemplateId;

export interface QuickResultTemplate extends VisualSurfaceTokens {
  id: QuickResultTemplateId;
  name: string;
  description: string;
}

export const QUICK_RESULT_TEMPLATES: QuickResultTemplate[] = [
  {
    id: 'modern',
    name: 'Modern',
    description: 'Limpio, luminoso y balanceado para compartir rápido.',
    ...getTemplateTokens('modern')
  },
  {
    id: 'editorial',
    name: 'Editorial',
    description: 'Más aire, contraste suave y foco en jerarquía.',
    ...getTemplateTokens('editorial')
  },
  {
    id: 'dark',
    name: 'Dark',
    description: 'Más dramático, premium y enfocado en presentación.',
    ...getTemplateTokens('dark')
  }
];

export function getQuickResultTemplate(templateId: QuickResultTemplateId) {
  return QUICK_RESULT_TEMPLATES.find((template) => template.id === templateId) || QUICK_RESULT_TEMPLATES[0];
}
