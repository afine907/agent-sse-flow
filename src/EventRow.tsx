import { memo, useCallback, forwardRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import type { FlowEvent, EventType } from './types';
import { formatTime, copyToClipboard, EVENT_DOT_COLORS, getSummary } from './utils';

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

/** Reusable copy button with feedback */
const CopyButton = memo(function CopyButton({ text, title = 'Copy' }: { text: string; title?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }, [text]);

  return (
    <button
      className="agent-flow__copy-btn"
      onClick={handleCopy}
      title={copied ? 'Copied!' : title}
      type="button"
      style={copied ? { color: '#10b981' } : undefined}
    >
      {copied ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
        </svg>
      )}
    </button>
  );
});
CopyButton.displayName = 'CopyButton';

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
}

/** EventRow — list/card view */
export const EventRow = memo(forwardRef<HTMLDivElement, RowProps>(function EventRow(
  {
    event,
    renderMessage,
    renderResult,
    showArgs = true,
    onToggleArgs,
  },
  ref,
) {
  const time = event.timestamp ? formatTime(event.timestamp) : null;

  return (
    <div ref={ref} className={`agent-flow__event agent-flow__event--${event.type}`}>
      <EventIcon type={event.type} />
      <div className="agent-flow__event-content">
        <div className="agent-flow__event-header">
          <span className="agent-flow__event-type">{event.type}</span>
          {event.agentName && (
            <span
              className="agent-flow__agent-badge"
              style={event.agentColor ? { background: event.agentColor } : undefined}
            >
              {event.agentName}
            </span>
          )}
          {event.duration !== undefined && (
            <span className="agent-flow__duration">{event.duration}ms</span>
          )}
          {time && <span className="agent-flow__event-time">{time}</span>}
        </div>
        {event.message && (
          <div className="agent-flow__event-message agent-flow__markdown">
            {renderMessage ? renderMessage(event.message) : <ReactMarkdown>{event.message}</ReactMarkdown>}
          </div>
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
                {event.argsJson}
              </pre>
            )}
          </div>
        )}
        {event.result && (
          <div className="agent-flow__event-result">
            <div className="agent-flow__event-result-actions">
              <CopyButton text={event.result} />
            </div>
            <div className="agent-flow__event-result-content agent-flow__markdown">
              {renderResult ? renderResult(event.result) : <ReactMarkdown>{event.result}</ReactMarkdown>}
            </div>
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
  },
  ref,
) {
  const time = event.timestamp ? formatTime(event.timestamp) : null;

  return (
    <div
      ref={ref}
      className={`agent-flow__timeline-item agent-flow__timeline-item--${event.type}${collapsed ? ' agent-flow__timeline-item--collapsed' : ''}`}
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
          {time && <span className="agent-flow__event-time">{time}</span>}
          <span className={`agent-flow__timeline-chevron${collapsed ? '' : ' agent-flow__timeline-chevron--open'}`}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </span>
        </div>
        {!collapsed && (
          <div className="agent-flow__timeline-detail" onClick={e => e.stopPropagation()}>
            {event.message && (
              <div className="agent-flow__event-message agent-flow__markdown">
                {renderMessage ? renderMessage(event.message) : <ReactMarkdown>{event.message}</ReactMarkdown>}
              </div>
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
                    {event.argsJson}
                  </pre>
                )}
              </div>
            )}
            {event.result && (
              <div className="agent-flow__event-result">
                <div className="agent-flow__event-result-actions">
                  <CopyButton text={event.result} />
                </div>
                <div className="agent-flow__event-result-content agent-flow__markdown">
                  {renderResult ? renderResult(event.result) : <ReactMarkdown>{event.result}</ReactMarkdown>}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}));
TimelineRow.displayName = 'TimelineRow';
