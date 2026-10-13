import { useEffect, useImperativeHandle, useRef, type Ref } from 'react';

import type { HtmlFrameHandle } from './HtmlFrame';

export interface HtmlFrameProps {
  html: string;
  height: number;
  /** Fill the parent and let the page scroll itself, instead of sizing to the content. */
  fill?: boolean;
  /** The page's color scheme; a mismatch makes browsers paint the iframe opaque. */
  scheme: 'light' | 'dark';
  onMessage: (text: string) => void;
  ref?: Ref<HtmlFrameHandle>;
}

/**
 * Web version: an iframe sandboxed to scripts only. Without allow-same-origin the page
 * runs in an opaque origin and cannot reach the app; it talks to it through postMessage.
 */
export function HtmlFrame({ html, height, fill, scheme, onMessage, ref }: HtmlFrameProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  const handler = useRef(onMessage);
  useEffect(() => {
    handler.current = onMessage;
  });
  useImperativeHandle(ref, () => ({
    reply: (reply) => frame.current?.contentWindow?.postMessage({ nookReply: reply }, '*'),
  }));

  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow) return;
      const text = (event.data as { nook?: unknown } | null)?.nook;
      if (typeof text === 'string') handler.current(text);
    };
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, []);

  return (
    <iframe
      ref={frame}
      title="Card page"
      srcDoc={html}
      sandbox="allow-scripts"
      referrerPolicy="no-referrer"
      // Positioned so it paints above an absolutely positioned page backdrop.
      style={{
        display: 'block',
        position: 'relative',
        width: '100%',
        height: fill ? '100%' : height,
        flex: fill ? 1 : undefined,
        border: 0,
        background: 'transparent',
        colorScheme: scheme,
      }}
    />
  );
}
