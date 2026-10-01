import { useEffect, useRef } from 'react';

export interface HtmlFrameProps {
  html: string;
  height: number;
  /** The page's color scheme; a mismatch makes browsers paint the iframe opaque. */
  scheme: 'light' | 'dark';
  onMessage: (text: string) => void;
}

/**
 * Web version: an iframe sandboxed to scripts only. Without allow-same-origin the page
 * runs in an opaque origin and cannot reach the app; it talks to it through postMessage.
 */
export function HtmlFrame({ html, height, scheme, onMessage }: HtmlFrameProps) {
  const ref = useRef<HTMLIFrameElement>(null);
  const handler = useRef(onMessage);
  useEffect(() => {
    handler.current = onMessage;
  });

  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (event.source !== ref.current?.contentWindow) return;
      const text = (event.data as { nook?: unknown } | null)?.nook;
      if (typeof text === 'string') handler.current(text);
    };
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, []);

  return (
    <iframe
      ref={ref}
      title="Card page"
      srcDoc={html}
      sandbox="allow-scripts"
      referrerPolicy="no-referrer"
      // Positioned so it paints above an absolutely positioned page backdrop.
      style={{ display: 'block', position: 'relative', width: '100%', height, border: 0, background: 'transparent', colorScheme: scheme }}
    />
  );
}
