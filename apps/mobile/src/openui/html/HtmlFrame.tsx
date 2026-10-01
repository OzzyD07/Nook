import { useMemo, useRef } from 'react';
import { View } from 'react-native';
import { WebView, type WebViewNavigation } from 'react-native-webview';

export interface HtmlFrameProps {
  html: string;
  height: number;
  /** The page's color scheme; a mismatch makes browsers paint the iframe opaque. */
  scheme: 'light' | 'dark';
  onMessage: (text: string) => void;
}

/**
 * Sandboxed web view for an HTML detail page. It never navigates: the page is loaded
 * from a string, links are routed to the app by the bridge and anything else is blocked.
 * No storage, file access or extra windows; the injected CSP blocks network access.
 */
export function HtmlFrame({ html, height, onMessage }: HtmlFrameProps) {
  const ref = useRef<WebView>(null);
  const source = useMemo(() => ({ html }), [html]);
  const allow = (request: WebViewNavigation) => request.url.startsWith('about:') || request.url.startsWith('data:');
  return (
    <View style={{ height }}>
      <WebView
        ref={ref}
        source={source}
        originWhitelist={['about:*', 'data:*']}
        onShouldStartLoadWithRequest={allow}
        onMessage={(event) => onMessage(event.nativeEvent.data)}
        onContentProcessDidTerminate={() => ref.current?.reload()}
        onRenderProcessGone={() => ref.current?.reload()}
        javaScriptEnabled
        domStorageEnabled={false}
        allowFileAccess={false}
        allowFileAccessFromFileURLs={false}
        allowUniversalAccessFromFileURLs={false}
        mixedContentMode="never"
        setSupportMultipleWindows={false}
        javaScriptCanOpenWindowsAutomatically={false}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        webviewDebuggingEnabled={__DEV__}
        style={{ backgroundColor: 'transparent' }}
        containerStyle={{ backgroundColor: 'transparent' }}
      />
    </View>
  );
}
