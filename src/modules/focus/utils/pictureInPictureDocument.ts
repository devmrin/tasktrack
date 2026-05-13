type DocumentPictureInPictureRequestOptions = {
  width?: number;
  height?: number;
};

export type DocumentPictureInPictureAPI = {
  readonly window: Window | null;
  requestWindow(options?: DocumentPictureInPictureRequestOptions): Promise<Window>;
};

export function getDocumentPictureInPicture(): DocumentPictureInPictureAPI | null {
  if (globalThis.window === undefined) return null;
  const w = globalThis.window as Window & {
    documentPictureInPicture?: DocumentPictureInPictureAPI;
  };
  return w.documentPictureInPicture ?? null;
}

export function isDocumentPictureInPictureSupported(): boolean {
  return getDocumentPictureInPicture() !== null;
}

/**
 * Copies computed styles into a Document PiP window. Serializing `document.styleSheets` is required
 * because cloning `<style>` nodes alone often misses Vite-injected HMR sheets in development.
 */
export function copyStylesToPictureInPictureDocument(
  source: Document,
  target: Document,
): void {
  if (!target.querySelector('base')) {
    const base = target.createElement('base');
    base.href = source.baseURI;
    target.head.prepend(base);
  }

  target.documentElement.className = source.documentElement.className;
  target.documentElement.lang = source.documentElement.lang;

  const viewport = source.querySelector('meta[name="viewport"]');
  if (viewport && !target.querySelector('meta[name="viewport"]')) {
    target.head.insertBefore(viewport.cloneNode(true), target.head.firstChild);
  }

  const charset = source.querySelector('meta[charset]');
  if (charset && !target.querySelector('meta[charset]')) {
    target.head.appendChild(charset.cloneNode(true));
  }

  for (const sheet of source.styleSheets) {
    try {
      const rules: string[] = [];
      for (const rule of sheet.cssRules) {
        rules.push(rule.cssText);
      }
      const text = rules.join('\n');
      if (text.length > 0) {
        const styleEl = target.createElement('style');
        styleEl.setAttribute('data-tasktrack-pip', '1');
        styleEl.textContent = text;
        target.head.appendChild(styleEl);
      }
    } catch {
      const href = sheet.href;
      if (href) {
        const link = target.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        target.head.appendChild(link);
      }
    }
  }

  const isDark = source.documentElement.classList.contains('dark');
  const pageBg = isDark ? 'rgb(23 23 23)' : 'rgb(250 250 250)';
  target.documentElement.style.margin = '0';
  target.documentElement.style.minHeight = '100%';
  target.documentElement.style.height = '100%';
  target.documentElement.style.backgroundColor = pageBg;
  target.body.style.margin = '0';
  target.body.style.minHeight = '100%';
  target.body.style.height = '100%';
  target.body.style.backgroundColor = pageBg;
}

export function waitForPictureInPictureStyles(target: Document): Promise<void> {
  const links = [...target.querySelectorAll('link[rel="stylesheet"]')] as HTMLLinkElement[];
  return Promise.all(
    links.map(
      (link) =>
        new Promise<void>((resolve) => {
          if (link.sheet) {
            resolve();
            return;
          }
          link.addEventListener('load', () => resolve(), { once: true });
          link.addEventListener('error', () => resolve(), { once: true });
        }),
    ),
  ).then(() => undefined);
}

export async function preparePictureInPictureDocument(
  source: Document,
  target: Document,
): Promise<void> {
  copyStylesToPictureInPictureDocument(source, target);
  await waitForPictureInPictureStyles(target);
}
