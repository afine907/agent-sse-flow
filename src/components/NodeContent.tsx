/**
 * Node Content Component
 * Displays the actual content of a trace node with streaming animation
 * Supports code highlighting and markdown rendering
 */

import React, { useMemo, useEffect, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import type { NodeStatus } from '../types/node';
import './NodeContent.css';

// 动态导入类型定义
type MarkedModule = typeof import('marked');
type HljsModule = typeof import('highlight.js');

export interface NodeContentProps {
  /**
   * Content text to display
   */
  content: string;
  
  /**
   * Node execution status
   */
  status?: NodeStatus;
  
  /**
   * Node type for rendering strategy
   */
  nodeType?: string;
  
  /**
   * Custom class name
   */
  className?: string;
  
  /**
   * Enable markdown rendering
   */
  enableMarkdown?: boolean;
  
  /**
   * Enable code highlighting
   */
  enableHighlight?: boolean;
}

/**
 * NodeContent Component
 * Renders node content with streaming state handling
 * Supports code highlighting and markdown rendering
 * Uses DOMPurify to prevent XSS attacks
 */
export function NodeContent({
  content,
  status = 'streaming',
  nodeType = '',
  className = '',
  enableMarkdown = true,
  enableHighlight = true,
}: NodeContentProps): JSX.Element {
  const codeRef = useRef<HTMLElement>(null);

  // 动态导入 marked 和 hljs
  const [marked, setMarked] = useState<MarkedModule | null>(null);
  const [hljs, setHljs] = useState<HljsModule | null>(null);

  useEffect(() => {
    Promise.all([
      import('marked'),
      import('highlight.js')
    ]).then(([markedMod, hljsMod]) => {
      // Configure marked for security
      markedMod.marked.setOptions({
        gfm: true,
        breaks: true,
      });
      setMarked(markedMod);
      setHljs(hljsMod);
    });
  }, []);

  // Configure DOMPurify to allow safe HTML tags
  useEffect(() => {
    // Add hook for link safety
    DOMPurify.addHook('afterSanitizeAttributes', (node) => {
      // Open links in new tab
      if (node.tagName === 'A') {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer');
      }
    });

    // Cleanup hook on unmount to prevent duplicate registrations
    return () => {
      DOMPurify.removeHook('afterSanitizeAttributes');
    };
  }, []);

  // Determine if content is streaming
  const isStreaming = status === 'streaming';

  // Determine if there's content
  const hasContent = content && content.length > 0;

  // Format content based on node type and content
  const formattedContent = useMemo(() => {
    if (!hasContent) return null;

    // Check if content is code
    const isCode = nodeType === 'code_execution' ||
                   nodeType === 'tool_call' ||
                   /^(import|export|const|let|var|function|class|def|public|private|interface|type|enum)/m.test(content);

    // Check if content looks like markdown
    const isMarkdown = enableMarkdown && (
      content.includes('#') ||
      content.includes('```') ||
      content.includes('**') ||
      content.includes('[]') ||
      content.includes('```')
    );

    return {
      text: content,
      isCode,
      isMarkdown: isMarkdown && !isCode,
    };
  }, [content, hasContent, nodeType, enableMarkdown]);

  // Apply syntax highlighting
  useEffect(() => {
    if (codeRef.current && formattedContent?.isCode && enableHighlight && hljs) {
      hljs.default.highlightElement(codeRef.current);
    }
  }, [content, formattedContent?.isCode, enableHighlight, hljs]);

  // Render markdown with XSS protection
  const renderedMarkdown = useMemo(() => {
    if (formattedContent?.isMarkdown && enableMarkdown && marked) {
      try {
        // First render markdown
        const rawHtml = marked.marked(content) as string;
        // Then sanitize to prevent XSS
        return DOMPurify.sanitize(rawHtml, {
          ALLOWED_TAGS: [
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'p', 'br', 'hr',
            'ul', 'ol', 'li',
            'blockquote', 'pre', 'code',
            'a', 'strong', 'em', 'del', 'ins',
            'table', 'thead', 'tbody', 'tr', 'th', 'td',
            'img', 'span', 'div'
          ],
          ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'target', 'rel'],
          ALLOW_DATA_ATTR: false,
        });
      } catch (e) {
        console.warn('[TraceScope] Markdown render failed:', e);
        // Return escaped text as fallback
        return DOMPurify.sanitize(content);
      }
    }
    return null;
  }, [content, formattedContent?.isMarkdown, enableMarkdown, marked]);
  
  return (
    <div className={`node-content ${className}`}>
      {/* Streaming placeholder */}
      {isStreaming && !hasContent && (
        <span className="node-content-streaming">
          <span className="streaming-dot">.</span>
          <span className="streaming-dot">.</span>
          <span className="streaming-dot">.</span>
        </span>
      )}
      
      {/* Code content with highlighting */}
      {hasContent && formattedContent?.isCode && (
        <pre className="node-content-code">
          <code 
            ref={codeRef}
            className={`language-javascript ${enableHighlight ? 'hljs' : ''}`}
          >
            {formattedContent.text}
          </code>
        </pre>
      )}
      
      {/* Markdown content - SANITIZED to prevent XSS */}
      {hasContent && renderedMarkdown && (
        <div 
          className="node-content-markdown"
          dangerouslySetInnerHTML={{ __html: renderedMarkdown }}
        />
      )}
      
      {/* Plain text content */}
      {hasContent && !formattedContent?.isCode && !renderedMarkdown && (
        <pre className="node-content-text">
          {formattedContent?.text}
        </pre>
      )}
      
      {/* Error state */}
      {status === 'error' && (
        <div className="node-content-error">
          <span className="error-icon">⚠️</span>
          <span className="error-text">Execution failed</span>
        </div>
      )}
    </div>
  );
}

export default NodeContent;