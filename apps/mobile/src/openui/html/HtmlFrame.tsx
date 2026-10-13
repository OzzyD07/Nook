import { useImperativeHandle, useMemo, useRef, type Ref } from 'react';
import { View } from 'react-native';
import { WebView, type WebViewNavigation } from 'react-native-webview';

/** Sends answers to the page's pending nook requests (nook.ai.chat). */
export interface HtmlFrameHandle {
  reply: (reply: { requestId: string; ok: boolean; value?: unknown; error?: string }) => void;
}

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
 * Sandboxed web view for an HTML detail page. It never navigates: the page is loaded
 * from a string, links are routed to the app by the bridge and anything else is blocked.
 * No storage, file access or extra windows; the injected CSP blocks network access.
 */
export function HtmlFrame({ html, height, fill, onMessage, ref }: HtmlFrameProps) {
  const webView = useRef<WebView>(null);
  const source = useMemo(() => ({ html }), [html]);
  const allow = (request: WebViewNavigation) => request.url.startsWith('about:') || request.url.startsWith('data:');
  useImperativeHandle(ref, () => ({
    reply: (reply) => webView.current?.injectJavaScript(`window.__nookReceive && window.__nookReceive(${JSON.stringify(reply)}); true;`),
  }));
  return (
    <View style={fill ? { flex: 1 } : { height }}>
      <WebView
        ref={webView}
        source={source}
        originWhitelist={['about:*', 'data:*']}
        onShouldStartLoadWithRequest={allow}
        onMessage={(event) => onMessage(event.nativeEvent.data)}
        onContentProcessDidTerminate={() => webView.current?.reload()}
        onRenderProcessGone={() => webView.current?.reload()}
        javaScriptEnabled
        domStorageEnabled={false}
        allowFileAccess={false}
        allowFileAccessFromFileURLs={false}
        allowUniversalAccessFromFileURLs={false}
        mixedContentMode="never"
        setSupportMultipleWindows={false}
        javaScriptCanOpenWindowsAutomatically={false}
        scrollEnabled={!!fill}
        bounces={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={!!fill}
        // Full-screen pages handle the safe area themselves (env(safe-area-inset-*)).
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        allowsInlineMediaPlayback
        webviewDebuggingEnabled={__DEV__}
        style={{ backgroundColor: 'transparent' }}
        containerStyle={{ backgroundColor: 'transparent' }}
      />
    </View>
  );
}
