import { isHtmlDocument } from '@nook/openui';

import { ErrorBoundary } from '@/components/error-boundary';
import { HtmlFrame } from '@/openui/html/HtmlFrame';
import { useHtmlPage, type HtmlPageHandlers } from '@/openui/html/use-html-page';
import { OpenUIView, Unrenderable } from '@/openui/OpenUIView';
import { CardStateProvider } from '@/openui/state-context';

/** A card's detail page in whichever format it was written: native OpenUI or sandboxed HTML. */
export function DetailView({ source, cardId }: { source: string; cardId?: string }) {
  if (!isHtmlDocument(source)) return <OpenUIView surface="detail" source={source} cardId={cardId} />;
  const page = <HtmlPage source={source} cardId={cardId} />;
  return cardId ? <CardStateProvider cardId={cardId}>{page}</CardStateProvider> : page;
}

/** An HTML page that fills its parent and scrolls itself: the card screen and its sub-pages. */
export function FullHtmlPage({ source, cardId, ...handlers }: { source: string; cardId: string } & HtmlPageHandlers) {
  return (
    <CardStateProvider cardId={cardId}>
      <HtmlPage source={source} cardId={cardId} fill handlers={handlers} />
    </CardStateProvider>
  );
}

function HtmlPage({ source, cardId, fill, handlers }: { source: string; cardId?: string; fill?: boolean; handlers?: HtmlPageHandlers }) {
  const { html, height, scheme, onMessage, frameRef, valid } = useHtmlPage(source, cardId, handlers);
  if (!valid) return <Unrenderable />;
  return (
    <ErrorBoundary resetKey={source} fallback={<Unrenderable />}>
      <HtmlFrame ref={frameRef} html={html} height={height} fill={fill} scheme={scheme} onMessage={onMessage} />
    </ErrorBoundary>
  );
}
