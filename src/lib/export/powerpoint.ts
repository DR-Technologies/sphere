import PptxGenJS from 'pptxgenjs';
import { renderElementToPngDataUrl } from './png';

export interface PowerPointSlideSource {
  element: HTMLElement;
  widgetTitle: string;
}

interface ExportReportToPowerPointOptions {
  reportName: string;
  slides: PowerPointSlideSource[];
  accentColor?: string;
  mutedColor?: string;
  onProgress?: (completed: number, total: number) => void;
}

function toPowerPointColor(color: string | undefined, fallback: string) {
  const hex = color?.match(/^#([0-9a-f]{6})$/i)?.[1];
  return hex?.toUpperCase() || fallback;
}

export function ensurePowerPointFileName(name: string) {
  const safeName = name.trim().replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ') || 'Sphere Report';
  return safeName.toLowerCase().endsWith('.pptx') ? safeName : `${safeName}.pptx`;
}

export async function exportReportToPowerPoint({
  reportName,
  slides,
  accentColor,
  mutedColor,
  onProgress
}: ExportReportToPowerPointOptions) {
  if (slides.length === 0) {
    throw new Error('El reporte no contiene visualizaciones para exportar.');
  }

  const presentation = new PptxGenJS();
  presentation.layout = 'LAYOUT_WIDE';
  presentation.author = 'Sphere';
  presentation.company = 'Sphere';
  presentation.subject = reportName;
  presentation.title = reportName;

  for (let index = 0; index < slides.length; index += 1) {
    const source = slides[index];
    try {
      const imageData = await renderElementToPngDataUrl(source.element, {
        waitForSelector: '[data-export-ready="true"]',
        canvasScale: 2
      });
      const slide = presentation.addSlide();
      slide.addImage({ data: imageData, x: 0, y: 0, w: 13.333, h: 7.5 });
      slide.addText(`SPHERE REPORT · ${reportName}`, {
        x: 0.45,
        y: 0.2,
        w: 11.3,
        h: 0.28,
        margin: 0,
        fontFace: 'Arial',
        fontSize: 11,
        bold: true,
        color: toPowerPointColor(accentColor, '0058BE'),
        breakLine: false,
        fit: 'shrink'
      });
      slide.addText(`${index + 1} / ${slides.length}`, {
        x: 12.05,
        y: 0.2,
        w: 0.8,
        h: 0.28,
        margin: 0,
        align: 'right',
        fontFace: 'Arial',
        fontSize: 10,
        color: toPowerPointColor(mutedColor, '5B667A'),
        fit: 'shrink'
      });
      onProgress?.(index + 1, slides.length);
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Error desconocido';
      throw new Error(`No se pudo exportar la visualización "${source.widgetTitle}": ${reason}`);
    }
  }

  await presentation.writeFile({ fileName: ensurePowerPointFileName(reportName), compression: true });
}
