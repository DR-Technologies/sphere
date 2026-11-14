import { toPng } from 'html-to-image';

export async function waitForExportReady(element: HTMLElement, selector?: string) {
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  if (!selector) {
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const deadline = window.setTimeout(() => reject(new Error('PNG export surface did not become ready.')), 5000);

    const check = () => {
      if (element.matches(selector) || element.querySelector(selector)) {
        window.clearTimeout(deadline);
        resolve();
        return true;
      }
      return false;
    };

    if (check()) return;

    const observer = new MutationObserver(() => {
      if (check()) observer.disconnect();
    });

    observer.observe(element, { subtree: true, childList: true, attributes: true });
  });

  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

export async function renderElementToPngDataUrl(
  element: HTMLElement,
  options?: { waitForSelector?: string; pixelRatio?: number; canvasScale?: number }
) {
  await waitForExportReady(element, options?.waitForSelector);
  const width = Math.ceil(element.scrollWidth);
  const height = Math.ceil(element.scrollHeight);
  const pixelRatio = options?.canvasScale ? 1 : (options?.pixelRatio ?? 2);
  const canvasScale = options?.canvasScale ?? pixelRatio;
  const computed = window.getComputedStyle(element);
  return toPng(element, {
    cacheBust: true,
    pixelRatio,
    width,
    height,
    canvasWidth: width * canvasScale,
    canvasHeight: height * canvasScale,
    backgroundColor: computed.backgroundColor === 'rgba(0, 0, 0, 0)' ? '#0b1020' : computed.backgroundColor,
    style: {
      width: `${width}px`,
      height: `${height}px`
    }
  });
}

export async function exportElementToPng(
  element: HTMLElement,
  fileName: string,
  options?: { waitForSelector?: string }
) {
  const dataUrl = await renderElementToPngDataUrl(element, options);

  const link = document.createElement('a');
  link.download = fileName.endsWith('.png') ? fileName : `${fileName}.png`;
  link.href = dataUrl;
  link.click();
}
