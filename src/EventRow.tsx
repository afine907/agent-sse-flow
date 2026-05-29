import { memo, useCallback, useMemo, useState, forwardRef } from 'react';
import ReactMarkdown from 'react-markdown';
import type { FlowEvent, EventType } from './types';
import { formatTime, formatRelativeTime, copyToClipboard, generateCurlCommand, EVENT_DOT_COLORS, getSummary } from './utils';

/** Character threshold above which content is truncated */
const TRUNCATE_THRESHOLD = 500;

/** Props for the TruncatedContent helper */
interface TruncatedContentProps {
  content: string;
  className?: string;
  render?: (text: string) => React.ReactNode;
}

/**
 * TruncatedContent — renders long text with a "Show more" toggle.
 * Prevents rendering huge markdown blocks for every event row.
 */
const TruncatedContent = memo(function TruncatedContent({
  content,
  className,
  render,
}: TruncatedContentProps) {
  const [expanded, setExpanded] = useState(false);

  if (content.length <= TRUNCATE_THRESHOLD) {
    return (
      <div className={className}>
        {render ? render(content) : <ReactMarkdown>{content}</ReactMarkdown>}
      </div>
    );
  }

  const preview = content.slice(0, TRUNCATE_THRESHOLD);

  return (
    <div className={className}>
      {expanded ? (
        render ? render(content) : <ReactMarkdown>{content}</ReactMarkdown>
      ) : (
        <>
          <div className="agent-flow__truncated">
            {render ? render(preview) : <ReactMarkdown>{preview}</ReactMarkdown>}
          </div>
          <button
            className="agent-flow__show-more"
            onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
            type="button"
          >
            Show more ({content.length} chars)
          </button>
        </>
      )}
    </div>
  );
});
TruncatedContent.displayName = 'TruncatedContent';

/** SVG icon paths by event type (Lucide-style, 24x24 viewBox) */
const ICON_PATHS: Record<EventType, string> = {
  start: 'M8 5v14l11-7z',
  thinking: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
  tool_call: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  tool_result: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  message: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
  error: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  end: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z',
};

/** Reusable copy button */
const CopyButton = memo(function CopyButton({ text, title = 'Copy' }: { text: string; title?: string }) {
  const handleCopy = useCallback(() => {
    copyToClipboard(text);
  }, [text]);

  return (
    <button
      className="agent-flow__copy-btn"
      onClick={handleCopy}
      title={title}
      type="button"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
      </svg>
    </button>
  );
});
CopyButton.displayName = 'CopyButton';

/**
 * SyntaxHighlight — lightweight JSON syntax highlighting (no external lib).
 * Tokenizes JSON via regex and wraps each token type in a colored span.
 *
 * Colors: keys=amber, strings=green, numbers=blue, booleans=purple, null=gray
 */
const JSON_TOKEN_RE = /("(?:\\.|[^"\\])*")\s*(:)?|(\b(?:true|false)\b)|(\bnull\b)|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|(\[|\]|\{|\}|,)/g;

export const SyntaxHighlight = memo(function SyntaxHighlight({ json }: { json: string }) {
  const html = useMemo(() => {
    return json.replace(JSON_TOKEN_RE, (match, str, colon, bool, nul, num) => {
      if (str) {
        if (colon) {
          // Key (string followed by colon) — amber
          return `<span class="af-syn--key">${str}</span>:`;
        }
        // String value — green
        return `<span class="af-syn--string">${str}</span>`;
      }
      if (bool) return `<span class="af-syn--bool">${match}</span>`;
      if (nul) return `<span class="af-syn--null">${match}</span>`;
      if (num) return `<span class="af-syn--num">${match}</span>`;
      return match; // punctuation
    });
  }, [json]);

  return <span dangerouslySetInnerHTML={{ __html: html }} />;
});
SyntaxHighlight.displayName = 'SyntaxHighlight';

/** Agent avatar: image URL, emoji/text, or default first-letter circle */
export const AgentAvatar = memo(function AgentAvatar({
  avatar,
  name,
  color,
  size = 18,
}: {
  avatar?: string;
  name: string;
  color?: string;
  size?: number;
}) {
  if (avatar) {
    // URL-based avatar
    if (avatar.startsWith('http://') || avatar.startsWith('https://') || avatar.startsWith('data:')) {
      return (
        <img
          className="agent-flow__avatar"
          src={avatar}
          alt={name}
          style={{ width: size, height: size }}
        />
      );
    }
    // Emoji or short text avatar
    return (
      <span
        className="agent-flow__avatar agent-flow__avatar--text"
        style={{ width: size, height: size, fontSize: size * 0.6, lineHeight: `${size}px` }}
      >
        {avatar}
      </span>
    );
  }
  // Default: first letter of name in a colored circle
  const letter = name.charAt(0).toUpperCase();
  return (
    <span
      className="agent-flow__avatar agent-flow__avatar--letter"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.55,
        lineHeight: `${size}px`,
        background: color || 'var(--af-accent)',
      }}
    >
      {letter}
    </span>
  );
});
AgentAvatar.displayName = 'AgentAvatar';

/** Event icon with memoization */
const EventIcon = memo(function EventIcon({ type }: { type: EventType }) {
  return (
    <span className="agent-flow__event-icon">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d={ICON_PATHS[type]} />
      </svg>
    </span>
  );
});
EventIcon.displayName = 'EventIcon';

/** Props shared by EventRow and TimelineRow */
interface RowProps {
  event: FlowEvent;
  renderMessage?: (message: string) => React.ReactNode;
  renderResult?: (result: string) => React.ReactNode;
  showArgs?: boolean;
  onToggleArgs?: () => void;
  /** Called when the event row is clicked to show detail modal */
  onEventClick?: (event: FlowEvent) => void;
  /** Whether this event is currently highlighted (e.g. after jump-to-error) */
  highlighted?: boolean;
  /** Whether to display relative time instead of absolute time */
  relativeTime?: boolean;
  /** Whether this event is bookmarked */
  bookmarked?: boolean;
  /** Called when the bookmark button is clicked */
  onToggleBookmark?: () => void;
}

/** EventRow — list/card view */
export const EventRow = memo(forwardRef<HTMLDivElement, RowProps>(function EventRow(
  {
    event,
    renderMessage,
    renderResult,
    showArgs = true,
    onToggleArgs,
    onEventClick,
    highlighted,
    relativeTime: useRelativeTime = false,
    bookmarked = false,
    onToggleBookmark,
  },
  ref,
) {
  const time = useMemo(
    () => event.timestamp ? (useRelativeTime ? formatRelativeTime(event.timestamp) : formatTime(event.timestamp)) : null,
    [event.timestamp, useRelativeTime],
  );

  return (
    <div
      ref={ref}
      className={`agent-flow__event agent-flow__event--${event.type} agent-flow__event--clickable${highlighted ? ' agent-flow__event--highlight' : ''}${bookmarked ? ' agent-flow__event--bookmarked' : ''}`}
      onClick={() => onEventClick?.(event)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onEventClick?.(event);
        }
      }}
    >
      <EventIcon type={event.type} />
      <div className="agent-flow__event-content">
        <div className="agent-flow__event-header">
          {onToggleBookmark && (
            <button
              className={`agent-flow__bookmark-btn${bookmarked ? ' agent-flow__bookmark-btn--active' : ''}`}
              onClick={(e) => { e.stopPropagation(); onToggleBookmark(); }}
              title={bookmarked ? 'Remove bookmark' : 'Bookmark event'}
              type="button"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill={bookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </button>
          )}
          <span className="agent-flow__event-type">{event.type}</span>
          {event.agentName && (
            <span className="agent-flow__agent-badge-wrapper">
              <AgentAvatar
                avatar={event.agentAvatar}
                name={event.agentName}
                color={event.agentColor}
                size={16}
              />
              <span
                className="agent-flow__agent-badge"
                style={event.agentColor ? { background: event.agentColor } : undefined}
              >
                {event.agentName}
              </span>
            </span>
          )}
          {event.duration !== undefined && (
            <span className="agent-flow__duration">{event.duration}ms</span>
          )}
          {(event.type === 'tool_call' || event.type === 'tool_result') && event.duration !== undefined && (
            <span className="agent-flow__duration-bar">
              <span
                className="agent-flow__duration-bar-fill"
                style={{ width: `${Math.min((event.duration / 5000) * 100, 100)}%` }}
              />
            </span>
          )}
          {time && <span className="agent-flow__event-time">{time}</span>}
        </div>
        {event.message && (
          <TruncatedContent
            content={event.message}
            className="agent-flow__event-message agent-flow__markdown"
            render={renderMessage}
          />
        )}
        {event.tool && (
          <div className="agent-flow__event-tool">
            <div className="agent-flow__tool-header">
              <span className="agent-flow__tool-name">{event.tool}</span>
              {event.argsJson && onToggleArgs && (
                <button className="agent-flow__tool-toggle" onClick={onToggleArgs} type="button">
                  {showArgs ? '▼' : '▶'} args
                </button>
              )}
            </div>
            {showArgs && event.argsJson && (
              <pre className="agent-flow__tool-args">
                <CopyButton text={event.argsJson} />
                <SyntaxHighlight json={event.argsJson} />
              </pre>
            )}
          </div>
        )}
        {event.result && (
          <div className="agent-flow__event-result">
            <div className="agent-flow__event-result-actions">
              <CopyButton text={event.result} />
            </div>
            <TruncatedContent
              content={event.result}
              className="agent-flow__event-result-content agent-flow__markdown"
              render={renderResult}
            />
          </div>
        )}
      </div>
    </div>
  );
}));
EventRow.displayName = 'EventRow';

/** TimelineRow — collapsible timeline view */
export const TimelineRow = memo(forwardRef<HTMLDivElement, RowProps & {
  collapsed: boolean;
  onToggle: () => void;
}>(function TimelineRow(
  {
    event,
    collapsed,
    onToggle,
    renderMessage,
    renderResult,
    showArgs = true,
    onToggleArgs,
    onEventClick,
    highlighted,
    relativeTime: useRelativeTime = false,
    bookmarked = false,
    onToggleBookmark,
  },
  ref,
) {
  const time = useMemo(
    () => event.timestamp ? (useRelativeTime ? formatRelativeTime(event.timestamp) : formatTime(event.timestamp)) : null,
    [event.timestamp, useRelativeTime],
  );

  return (
    <div
      ref={ref}
      className={`agent-flow__timeline-item agent-flow__timeline-item--${event.type}${collapsed ? ' agent-flow__timeline-item--collapsed' : ''}${highlighted ? ' agent-flow__event--highlight' : ''}${bookmarked ? ' agent-flow__event--bookmarked' : ''}`}
      onClick={onToggle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onToggle();
        }
      }}
    >
      <div className="agent-flow__timeline-track">
        <span
          className="agent-flow__timeline-dot"
          style={{ background: EVENT_DOT_COLORS[event.type] }}
        />
      </div>
      <div className="agent-flow__timeline-body">
        <div className="agent-flow__timeline-header">
          <EventIcon type={event.type} />
          <span className="agent-flow__timeline-label">{event.type}</span>
          <span className="agent-flow__timeline-summary">{getSummary(event)}</span>
          {(event.type === 'tool_call' || event.type === 'tool_result') && event.duration !== undefined && (
            <span className="agent-flow__duration-bar">
              <span
                className="agent-flow__duration-bar-fill"
                style={{ width: `${Math.min((event.duration / 5000) * 100, 100)}%` }}
              />
            </span>
          )}
          {time && <span className="agent-flow__event-time">{time}</span>}
          {onToggleBookmark && (
            <button
              className={`agent-flow__bookmark-btn${bookmarked ? ' agent-flow__bookmark-btn--active' : ''}`}
              onClick={(e) => { e.stopPropagation(); onToggleBookmark(); }}
              title={bookmarked ? 'Remove bookmark' : 'Bookmark event'}
              type="button"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill={bookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </button>
          )}
          {onEventClick && (
            <button
              className="agent-flow__detail-btn"
              onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
              title="View details"
              type="button"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </button>
          )}
          <span className={`agent-flow__timeline-chevron${collapsed ? '' : ' agent-flow__timeline-chevron--open'}`}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </span>
        </div>
        <div className={`agent-flow__timeline-detail-wrapper${collapsed ? ' agent-flow__timeline-detail-wrapper--collapsed' : ''}`} onClick={e => e.stopPropagation()}>
          <div className="agent-flow__timeline-detail-inner">
            <div className="agent-flow__timeline-detail">
              {event.message && (
                <TruncatedContent
                  content={event.message}
                  className="agent-flow__event-message agent-flow__markdown"
                  render={renderMessage}
                />
              )}
              {event.tool && (
                <div className="agent-flow__event-tool">
                  <div className="agent-flow__tool-header">
                    <span className="agent-flow__tool-name">{event.tool}</span>
                    {event.argsJson && onToggleArgs && (
                      <button className="agent-flow__tool-toggle" onClick={onToggleArgs} type="button">
                        {showArgs ? '▼' : '▶'} args
                      </button>
                    )}
                    {event.type === 'tool_call' && (
                      <button
                        className="agent-flow__tool-toggle"
                        onClick={(e) => { e.stopPropagation(); copyToClipboard(generateCurlCommand(event)); }}
                        title="Copy as cURL"
                        type="button"
                      >
                        curl
                      </button>
                    )}
                  </div>
                  {showArgs && event.argsJson && (
                    <pre className="agent-flow__tool-args">
                      <CopyButton text={event.argsJson} />
                      <SyntaxHighlight json={event.argsJson} />
                    </pre>
                  )}
                </div>
              )}
              {event.result && (
                <div className="agent-flow__event-result">
                  <div className="agent-flow__event-result-actions">
                    <CopyButton text={event.result} />
                  </div>
                  <TruncatedContent
                    content={event.result}
                    className="agent-flow__event-result-content agent-flow__markdown"
                    render={renderResult}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}));
TimelineRow.displayName = 'TimelineRow';

/** Props for WaterfallBar */
interface WaterfallBarProps {
  event: FlowEvent;
  startTime: number;
  totalDuration: number;
  onClick?: (event: FlowEvent) => void;
  highlighted?: boolean;
}

/** WaterfallBar — single event bar in the waterfall view */
export const WaterfallBar = memo(forwardRef<HTMLDivElement, WaterfallBarProps>(function WaterfallBar(
  { event, startTime, totalDuration, onClick, highlighted },
  ref,
) {
  const timestamp = event.timestamp ?? 0;
  const duration = event.duration ?? 0;

  // Calculate position and width as percentages
  const left = totalDuration > 0 ? ((timestamp - startTime) / totalDuration) * 100 : 0;
  // Minimum width of 0.5% for visibility, or actual duration proportion
  const width = totalDuration > 0
    ? Math.max(0.5, (duration / totalDuration) * 100)
    : 0.5;

  const color = EVENT_DOT_COLORS[event.type];

  return (
    <div
      ref={ref}
      className={`agent-flow__waterfall-bar${highlighted ? ' agent-flow__waterfall-bar--highlight' : ''}`}
      style={{ left: `${left}%`, width: `${width}%` }}
      onClick={() => onClick?.(event)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick?.(event);
      }}
      title={`${event.type}${event.tool ? `: ${event.tool}` : ''}${duration ? ` (${duration}ms)` : ''}`}
    >
      <span
        className="agent-flow__waterfall-bar-fill"
        style={{ background: color }}
      />
      <span className="agent-flow__waterfall-bar-label">
        {event.tool || event.type}
        {duration > 0 && <span className="agent-flow__waterfall-bar-duration">{duration}ms</span>}
      </span>
    </div>
  );
}));
WaterfallBar.displayName = 'WaterfallBar';
