import { isHtmlDocument } from '@nook/openui';

import { ErrorBoundary } from '@/components/error-boundary';
import { HtmlFrame } from '@/openui/html/HtmlFrame';
import { useHtmlPage } from '@/openui/html/use-html-page';
import { OpenUIView, Unrenderable } from '@/openui/OpenUIView';
import { CardStateProvider } from '@/openui/state-context';

/** A card's detail page in whichever format it was written: native OpenUI or sandboxed HTML. */
export function DetailView({ source, cardId }: { source: string; cardId?: string }) {
  if (!isHtmlDocument(source)) return <OpenUIView surface="detail" source={source} cardId={cardId} />;
  const page = <HtmlPage source={source} cardId={cardId} />;
  return cardId ? <CardStateProvider cardId={cardId}>{page}</CardStateProvider> : page;
}

function HtmlPage({ source, cardId }: { source: string; cardId?: string }) {
  const { html, height, scheme, onMessage, valid } = useHtmlPage(source, cardId);
  if (!valid) return <Unrenderable />;
  return (
    <ErrorBoundary resetKey={source} fallback={<Unrenderable />}>
      <HtmlFrame html={html} height={height} scheme={scheme} onMessage={onMessage} />
    </ErrorBoundary>
  );
}
