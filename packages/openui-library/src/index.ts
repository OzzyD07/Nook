export type { ElementNode } from '@openuidev/lang-core';

export { buildUiCapabilities, OPENUI_LANG_CORE_VERSION, RENDERER_VERSION, surfacePrompt } from './capabilities';
export { CARD_ROOT, DETAIL_ROOT } from './components';
export { designChanges, type DesignChange } from './design';
export { validateUi, type UiDocumentResult, type UiFormat } from './document';
export { EXAMPLES } from './examples';
export {
  buildHtmlPage,
  HTML_CONTENT_SECURITY_POLICY,
  HTML_LIBRARY_ORIGINS,
  isHtmlDocument,
  validateHtml,
  type HtmlPageContext,
  type HtmlStats,
  type HtmlValidationResult,
} from './html';
export { ICON_NAMES, ICONS, type IconName } from './icons';
export { getLibrary } from './library';
export {
  FONT_NAMES,
  FONTS,
  getTheme,
  THEME_NAMES,
  THEMES,
  type FontName,
  type ThemeBackdrop,
  type ThemeDef,
  type ThemeName,
  type ThemePalette,
} from './styles';
export { validateOpenUI, type UiIssue, type UiStateField, type UiStats, type UiValidationResult } from './validate';
