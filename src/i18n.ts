/**
 * Simple i18n (internationalization) framework for AgentFlow
 *
 * Supports English ('en') and Chinese ('zh') locales.
 * Uses a flat key structure with dot notation for namespacing.
 */

export type Locale = 'en' | 'zh';

export type TranslationKey =
  // Status labels
  | 'status.connecting'
  | 'status.connected'
  | 'status.disconnected'
  | 'status.error'
  | 'status.unsupported'
  // Header buttons
  | 'header.connectionDetails'
  | 'header.eventCount'
  | 'header.events'
  | 'header.bookmarked'
  | 'header.toggleStats'
  | 'header.compactView'
  | 'header.normalView'
  | 'header.clearAll'
  | 'header.export'
  | 'header.keyboardShortcuts'
  | 'header.jumpToError'
  | 'header.searchEvents'
  | 'header.filterByTime'
  | 'header.relativeTime'
  | 'header.absoluteTime'
  | 'header.allAgents'
  | 'header.groupByAgent'
  | 'header.flatList'
  | 'header.disconnect'
  | 'header.connect'
  // Search
  | 'search.placeholder'
  | 'search.matches'
  | 'search.closeSearch'
  // Time filter
  | 'timeFilter.label'
  | 'timeFilter.from'
  | 'timeFilter.to'
  | 'timeFilter.clear'
  // Stats
  | 'stats.total'
  | 'stats.cost'
  | 'stats.tokens'
  | 'stats.agents'
  // Empty states
  | 'empty.noEvents'
  | 'empty.noMatching'
  | 'empty.unsupported'
  // Export
  | 'export.asJSON'
  | 'export.asCSV'
  // Help panel
  | 'help.title'
  | 'help.searchEvents'
  | 'help.toggleHelp'
  | 'help.closePanels'
  // Event types
  | 'eventType.start'
  | 'eventType.thinking'
  | 'eventType.tool_call'
  | 'eventType.tool_result'
  | 'eventType.message'
  | 'eventType.error'
  | 'eventType.end'
  // Actions
  | 'action.copyJSON'
  | 'action.copyCurl'
  | 'action.bookmark'
  | 'action.unbookmark'
  | 'action.filterByAgent'
  | 'action.filterByType'
  | 'action.showDetails'
  | 'action.showMore'
  // Modal
  | 'modal.eventDetail'
  | 'modal.copyJSON'
  | 'modal.close'
  // Scroll
  | 'scroll.autoScrollOn'
  | 'scroll.autoScrollOff'
  | 'scroll.scrollToBottom'
  // Bookmarks
  | 'bookmark.add'
  | 'bookmark.remove'
  // Timeline
  | 'timeline.showArgs'
  | 'timeline.hideArgs'
  | 'timeline.viewDetails'
  // Generic
  | 'generic.to';

const translations: Record<Locale, Record<TranslationKey, string>> = {
  en: {
    // Status
    'status.connecting': 'connecting',
    'status.connected': 'connected',
    'status.disconnected': 'disconnected',
    'status.error': 'error',
    'status.unsupported': 'unsupported',
    // Header
    'header.connectionDetails': 'Connection details',
    'header.eventCount': 'Event count',
    'header.events': 'events',
    'header.bookmarked': 'bookmarked',
    'header.toggleStats': 'Toggle event statistics',
    'header.compactView': 'Switch to compact view',
    'header.normalView': 'Switch to normal view',
    'header.clearAll': 'Clear all events',
    'header.export': 'Export events',
    'header.keyboardShortcuts': 'Keyboard shortcuts',
    'header.jumpToError': 'Jump to next error',
    'header.searchEvents': 'Search events',
    'header.filterByTime': 'Filter by time range',
    'header.relativeTime': 'Showing relative time',
    'header.absoluteTime': 'Showing absolute time',
    'header.allAgents': 'All Agents',
    'header.groupByAgent': 'Group by agent',
    'header.flatList': 'Show flat list',
    'header.disconnect': 'Disconnect',
    'header.connect': 'Connect',
    // Search
    'search.placeholder': 'Search events...',
    'search.matches': 'matches',
    'search.closeSearch': 'Close search',
    // Time filter
    'timeFilter.label': 'Time range:',
    'timeFilter.from': 'From',
    'timeFilter.to': 'To',
    'timeFilter.clear': 'Clear',
    // Stats
    'stats.total': 'Total',
    'stats.cost': 'Cost',
    'stats.tokens': 'Tokens',
    'stats.agents': 'Agents',
    // Empty
    'empty.noEvents': 'No events yet. Waiting for agent...',
    'empty.noMatching': 'No matching events',
    'empty.unsupported': 'EventSource is not supported in this environment. Please use a browser that supports Server-Sent Events.',
    // Export
    'export.asJSON': 'Export as JSON',
    'export.asCSV': 'Export as CSV',
    // Help
    'help.title': 'Keyboard Shortcuts',
    'help.searchEvents': 'Search events',
    'help.toggleHelp': 'Toggle this help panel',
    'help.closePanels': 'Close panels',
    // Event types
    'eventType.start': 'start',
    'eventType.thinking': 'thinking',
    'eventType.tool_call': 'tool_call',
    'eventType.tool_result': 'tool_result',
    'eventType.message': 'message',
    'eventType.error': 'error',
    'eventType.end': 'end',
    // Actions
    'action.copyJSON': 'Copy event JSON',
    'action.copyCurl': 'Copy as cURL',
    'action.bookmark': 'Bookmark event',
    'action.unbookmark': 'Unbookmark',
    'action.filterByAgent': 'Filter by agent',
    'action.filterByType': 'Filter by type',
    'action.showDetails': 'Show details',
    'action.showMore': 'Show more',
    // Modal
    'modal.eventDetail': 'Event Detail',
    'modal.copyJSON': 'Copy JSON',
    'modal.close': 'Close',
    // Scroll
    'scroll.autoScrollOn': 'Auto-scroll ON',
    'scroll.autoScrollOff': 'Auto-scroll OFF',
    'scroll.scrollToBottom': 'Scroll to bottom',
    // Bookmarks
    'bookmark.add': 'Bookmark event',
    'bookmark.remove': 'Remove bookmark',
    // Timeline
    'timeline.showArgs': 'Show arguments',
    'timeline.hideArgs': 'Hide arguments',
    'timeline.viewDetails': 'View event details',
    // Generic
    'generic.to': 'to',
  },
  zh: {
    // Status
    'status.connecting': '连接中',
    'status.connected': '已连接',
    'status.disconnected': '已断开',
    'status.error': '错误',
    'status.unsupported': '不支持',
    // Header
    'header.connectionDetails': '连接详情',
    'header.eventCount': '事件计数',
    'header.events': '个事件',
    'header.bookmarked': '已收藏',
    'header.toggleStats': '切换事件统计',
    'header.compactView': '切换到紧凑视图',
    'header.normalView': '切换到普通视图',
    'header.clearAll': '清除所有事件',
    'header.export': '导出事件',
    'header.keyboardShortcuts': '键盘快捷键',
    'header.jumpToError': '跳转到下一个错误',
    'header.searchEvents': '搜索事件',
    'header.filterByTime': '按时间范围筛选',
    'header.relativeTime': '显示相对时间',
    'header.absoluteTime': '显示绝对时间',
    'header.allAgents': '所有代理',
    'header.groupByAgent': '按代理分组',
    'header.flatList': '显示平面列表',
    'header.disconnect': '断开连接',
    'header.connect': '连接',
    // Search
    'search.placeholder': '搜索事件...',
    'search.matches': '个匹配',
    'search.closeSearch': '关闭搜索',
    // Time filter
    'timeFilter.label': '时间范围:',
    'timeFilter.from': '从',
    'timeFilter.to': '到',
    'timeFilter.clear': '清除',
    // Stats
    'stats.total': '总计',
    'stats.cost': '费用',
    'stats.tokens': '令牌',
    'stats.agents': '代理',
    // Empty
    'empty.noEvents': '暂无事件，等待代理响应...',
    'empty.noMatching': '没有匹配的事件',
    'empty.unsupported': '此环境不支持 EventSource。请使用支持 Server-Sent Events 的浏览器。',
    // Export
    'export.asJSON': '导出为 JSON',
    'export.asCSV': '导出为 CSV',
    // Help
    'help.title': '键盘快捷键',
    'help.searchEvents': '搜索事件',
    'help.toggleHelp': '切换帮助面板',
    'help.closePanels': '关闭面板',
    // Event types
    'eventType.start': '开始',
    'eventType.thinking': '思考',
    'eventType.tool_call': '工具调用',
    'eventType.tool_result': '工具结果',
    'eventType.message': '消息',
    'eventType.error': '错误',
    'eventType.end': '结束',
    // Actions
    'action.copyJSON': '复制事件 JSON',
    'action.copyCurl': '复制为 cURL',
    'action.bookmark': '收藏事件',
    'action.unbookmark': '取消收藏',
    'action.filterByAgent': '按代理筛选',
    'action.filterByType': '按类型筛选',
    'action.showDetails': '查看详情',
    'action.showMore': '显示更多',
    // Modal
    'modal.eventDetail': '事件详情',
    'modal.copyJSON': '复制 JSON',
    'modal.close': '关闭',
    // Scroll
    'scroll.autoScrollOn': '自动滚动已开启',
    'scroll.autoScrollOff': '自动滚动已关闭',
    'scroll.scrollToBottom': '滚动到底部',
    // Bookmarks
    'bookmark.add': '收藏事件',
    'bookmark.remove': '取消收藏',
    // Timeline
    'timeline.showArgs': '显示参数',
    'timeline.hideArgs': '隐藏参数',
    'timeline.viewDetails': '查看详情',
    // Generic
    'generic.to': '至',
  },
};

/**
 * Create a translation function for the given locale.
 * Falls back to English if a key is missing in the target locale.
 */
export function createT(locale: Locale) {
  const dict = translations[locale] ?? translations.en;
  const fallback = translations.en;

  return function t(key: TranslationKey): string {
    return dict[key] ?? fallback[key] ?? key;
  };
}
