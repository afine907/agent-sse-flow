/**
 * VirtualChat - 流式对话组件
 * 
 * 支持:
 * - 流式输出 (打字机效果)
 * - Token 计费展示
 * - 思考过程折叠 (Thinking)
 * - 多轮对话树
 * - 代码高亮
 */

import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

// 类型导入
import type { ProtocolMessageData, ProtocolMessageRole, ProtocolContentType } from '../protocol/types';

// 动态导入类型定义
type MarkedModule = typeof import('marked');
type HljsModule = typeof import('highlight.js');

// 配置类型
export interface VirtualChatConfig {
  /** 是否显示思考过程 */
  showThinking?: boolean;
  
  /** 是否显示 Token 计费 */
  showTokenUsage?: boolean;
  
  /** 是否显示时间戳 */
  showTimestamp?: boolean;
  
  /** 最大历史消息数 */
  maxMessages?: number;
  
  /** 自定义头像 */
  avatars?: {
    user?: string;
    assistant?: string;
    system?: string;
    tool?: string;
  };
  
  /** 发送消息回调 */
  onSendMessage?: (content: string) => void;
  
  /** 消息渲染完成回调 */
  onMessageRendered?: (messageId: string) => void;
}

// SSE 流式聊天配置
export interface StreamingChatConfig extends VirtualChatConfig {
  /** SSE URL */
  url: string;
  
  /** 适配器名称 */
  adapter?: string;
}

// 样式
import './VirtualChat.css';

// ============================================
// 子组件: 消息气泡
// ============================================

interface MessageBubbleProps {
  message: ProtocolMessageData;
  showThinking?: boolean;
  showTokenUsage?: boolean;
  showTimestamp?: boolean;
  avatar?: string;
}

const MessageBubble: React.FC<MessageBubbleProps> = memo(({
  message,
  showThinking = true,
  showTokenUsage = true,
  showTimestamp = true,
  avatar,
}) => {
  const contentRef = useRef<HTMLDivElement>(null);

  // 动态导入 marked (hljs 暂未使用，预留接口)
  const [marked, setMarked] = useState<MarkedModule | null>(null);

  useEffect(() => {
    Promise.all([
      import('marked'),
      import('highlight.js')
    ]).then(([markedMod]) => {
      setMarked(markedMod);
    }).catch((err) => {
      console.warn('[VirtualChat] Failed to load markdown libraries:', err);
    });
  }, []);

  // 渲染 Markdown / 代码
  const renderContent = useCallback((content: string, contentType: ProtocolContentType) => {
    // marked 未加载时显示纯文本
    if (!marked) {
      return <div className="text-content">{content}</div>;
    }

    if (contentType === 'code') {
      return (
        <pre><code className="hljs language-javascript">{content}</code></pre>
      );
    }

    if (contentType === 'markdown') {
      try {
        const html = marked.marked(content, { async: false }) as string;
        return <div className="markdown-content" dangerouslySetInnerHTML={{ __html: html }} />;
      } catch {
        return <div className="text-content">{content}</div>;
      }
    }

    // 默认纯文本
    return <div className="text-content">{content}</div>;
  }, [marked]);
  
  // 提取思考过程 (assistant 消息中以 <thinking> 包裹的内容)
  const extractThinking = useCallback((content: string): { thinking: string; content: string } | null => {
    const thinkingMatch = content.match(/<thinking>([\s\S]*?)<\/thinking>/);
    if (thinkingMatch) {
      return {
        thinking: thinkingMatch[1].trim(),
        content: content.replace(thinkingMatch[0], '').trim(),
      };
    }
    return null;
  }, []);
  
  const role = message.role;
  const isUser = role === 'user';
  const isAssistant = role === 'assistant';
  const isSystem = role === 'system';
  
  // 处理思考过程
  const thinking = showThinking && isAssistant ? extractThinking(message.content) : null;
  const displayContent = thinking?.content || message.content;
  
  // 角色名称
  const roleName = {
    user: '你',
    assistant: 'AI',
    system: '系统',
    tool: '工具',
  }[role] || role;
  
  // 格式化时间 - 使用 Intl.DateTimeFormat 以获得一致的本地化
  const timeFormatter = useMemo(
    () => new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    []
  );
  const formatTime = (timestamp: number) => {
    return timeFormatter.format(new Date(timestamp));
  };
  
  // Token 统计
  const tokenInfo = message.tokensReceived ? (
    <span className="token-count">{message.tokensReceived} tokens</span>
  ) : null;
  
  return (
    <div className={`message-bubble ${isUser ? 'user' : 'assistant'} ${isSystem ? 'system' : ''}`}>
      {/* 头像 */}
      {avatar && (
        <div className="message-avatar">
          <img src={avatar} alt={`${roleName} avatar`} />
        </div>
      )}
      
      {/* 内容区域 */}
      <div className="message-content-wrapper">
        {/* 角色名 */}
        <div className="message-header">
          <span className="message-role">{roleName}</span>
          {showTimestamp && (
            <span className="message-time">{formatTime(message.createdAt)}</span>
          )}
        </div>
        
        {/* 思考过程 (可折叠) */}
        {thinking && (
          <details className="thinking-block">
            <summary>💭 思考过程</summary>
            <div className="thinking-content">
              {renderContent(thinking.thinking, 'text')}
            </div>
          </details>
        )}
        
        {/* 消息内容 */}
        <div className="message-content" ref={contentRef}>
          {renderContent(displayContent, message.contentType)}
          
          {/* 流式输出光标 */}
          {message.isStreaming && (
            <span className="typing-cursor" aria-hidden="true">▊</span>
          )}
        </div>
        
        {/* Token 计费 */}
        {showTokenUsage && tokenInfo && (
          <div className="message-meta">
            {tokenInfo}
          </div>
        )}
      </div>
    </div>
  );
});

MessageBubble.displayName = 'MessageBubble';

// ============================================
// 子组件: 输入框
// ============================================

interface InputBoxProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

const InputBox: React.FC<InputBoxProps> = memo(({
  onSend,
  disabled = false,
  placeholder = '输入消息...',
}) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef<any>(null);
  
  // 自动调整高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + 'px';
    }
  }, [input]);
  
  // 发送消息
  const handleSend = useCallback(() => {
    const content = input.trim();
    if (content && !disabled) {
      onSend(content);
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  }, [input, disabled, onSend]);
  
  // 键盘事件
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);
  
  return (
    <div className="chat-input-box">
      <textarea
        ref={textareaRef}
        className="chat-input"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        aria-label="Message input"
      />
      <button
        className="send-button"
        onClick={handleSend}
        disabled={disabled || !input.trim()}
        aria-label="Send message"
      >
        发送
      </button>
    </div>
  );
});

InputBox.displayName = 'InputBox';

// ============================================
// 主组件: VirtualChat
// ============================================

interface VirtualChatProps {
  /** 消息列表 */
  messages: ProtocolMessageData[];

  /** 配置 */
  config?: VirtualChatConfig;

  /** 样式类名 */
  className?: string;

  /** 高度 */
  height?: number | string;
}

// 在组件外部定义默认配置，避免每次渲染创建新对象
const DEFAULT_CHAT_CONFIG: VirtualChatConfig = {
  showThinking: true,
  showTokenUsage: true,
  showTimestamp: true,
  maxMessages: 100,
  avatars: {},
};

export const VirtualChat: React.FC<VirtualChatProps> = memo(({
  messages,
  config,
  className = '',
  height = 600,
}) => {
  const mergedConfig = { ...DEFAULT_CHAT_CONFIG, ...config };
  const {
    showThinking = true,
    showTokenUsage = true,
    showTimestamp = true,
    maxMessages = 100,
    avatars = {},
    onSendMessage,
    // onMessageRendered is reserved for future use
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onMessageRendered: _onMessageRendered,
  } = mergedConfig;
  
  // 限制消息数量
  const displayMessages = messages.slice(-maxMessages);
  
  // 虚拟列表 Ref
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: displayMessages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // 估算每条消息高度
    overscan: 5,
  });
  
  // 自动滚动到底部
  const scrollToBottom = useCallback(() => {
    virtualizer.scrollToIndex(displayMessages.length - 1, { align: 'end' });
  }, [virtualizer, displayMessages.length]);
  
  // 新消息时滚动到底部
  useEffect(() => {
    if (displayMessages.length > 0) {
      const lastMessage = displayMessages[displayMessages.length - 1];
      // 如果是最后一条消息或者是用户消息，立即滚动
      if (!lastMessage.isStreaming) {
        setTimeout(scrollToBottom, 100);
      }
    }
  }, [displayMessages.length, scrollToBottom]);
  
  // 流式消息时平滑滚动
  useEffect(() => {
    const streamingMessage = displayMessages.find(m => m.isStreaming);
    if (streamingMessage) {
      const timeout = setTimeout(scrollToBottom, 500);
      return () => clearTimeout(timeout);
    }
  }, [displayMessages, scrollToBottom]);
  
  // 处理发送消息
  const handleSend = useCallback((content: string) => {
    if (onSendMessage) {
      onSendMessage(content);
    }
  }, [onSendMessage]);
  
  // 获取头像
  const getAvatar = (role: ProtocolMessageRole): string | undefined => {
    const avatarMap = {
      user: avatars.user,
      assistant: avatars.assistant,
      system: avatars.system,
      tool: avatars.tool,
    };
    return avatarMap[role];
  };
  
  // 总 Token 统计
  const totalTokens = displayMessages.reduce((sum, m) => sum + (m.tokensReceived || 0), 0);
  
  return (
    <div 
      className={`virtual-chat ${className}`}
      style={{ height }}
    >
      {/* 消息列表 */}
      <div
        ref={parentRef}
        className="chat-messages"
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
        role="log"
        aria-label="Chat messages"
        aria-live="polite"
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const message = displayMessages[virtualRow.index];
          return (
            <div
              key={message.messageId}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
              data-index={virtualRow.index}
            >
              <MessageBubble
                message={message}
                showThinking={showThinking}
                showTokenUsage={showTokenUsage}
                showTimestamp={showTimestamp}
                avatar={getAvatar(message.role)}
              />
            </div>
          );
        })}
      </div>
      
      {/* 输入框 */}
      {onSendMessage && (
        <InputBox onSend={handleSend} />
      )}
      
      {/* 底部 Token 统计 */}
      {showTokenUsage && totalTokens > 0 && (
        <div className="chat-footer">
          <span className="total-tokens">总消耗: {totalTokens} tokens</span>
        </div>
      )}
    </div>
  );
});

VirtualChat.displayName = 'VirtualChat';

// ============================================
// 便捷组件: 带有 SSE 流式的 Chat
// ============================================

interface StreamingChatProps {
  /** SSE URL */
  url: string;
  
  /** 适配器名称 */
  adapter?: string;
  
  /** 初始配置 */
  config?: VirtualChatConfig;
  
  /** 样式高度 */
  height?: number | string;
}

export const StreamingChat: React.FC<StreamingChatProps> = memo(({
  url,
  adapter = 'custom',
  config,
  height = 600,
}) => {
  const [messages, setMessages] = useState<ProtocolMessageData[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  
  // 连接 SSE
  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    
    const eventSource = new EventSource(`${url}?adapter=${adapter}`);
    eventSourceRef.current = eventSource;
    
    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
    };
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'message') {
          setMessages(prev => {
            // 检查是否已存在该消息 (用于更新)
            const existingIndex = prev.findIndex(m => m.messageId === data.message?.messageId);
            
            if (existingIndex >= 0) {
              // 更新现有消息
              const updated = [...prev];
              updated[existingIndex] = {
                ...updated[existingIndex],
                ...data.message,
                isStreaming: data.action === 'update',
              };
              return updated;
            } else {
              // 新消息
              return [...prev, {
                ...data.message,
                isStreaming: data.action === 'update',
              }];
            }
          });
        }
      } catch (e) {
        console.error('Failed to parse SSE message:', e);
      }
    };
    
    eventSource.onerror = () => {
      setIsConnected(false);
      setError('连接断开，正在重试...');
      eventSource.close();
      
      // 自动重连
      setTimeout(connect, 3000);
    };
  }, [url, adapter]);
  
  // 断开连接
  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    }
  }, []);
  
  // 发送消息
  const handleSendMessage = useCallback(async (content: string) => {
    // 添加用户消息到列表
    const userMessage: ProtocolMessageData = {
      messageId: `msg-${Date.now()}`,
      role: 'user',
      content,
      contentType: 'text',
      createdAt: Date.now(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    // 发送 POST 请求到服务器
    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content, adapter }),
      });
    } catch (e) {
      console.error('Failed to send message:', e);
    }
  }, [url, adapter]);
  
  // 组件挂载时连接
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);
  
  return (
    <div className="streaming-chat">
      {/* 连接状态 */}
      <div className={`connection-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
        {isConnected ? '🟢 已连接' : '🔴 已断开'}
      </div>
      
      {/* 错误信息 */}
      {error && <div className="error-message">{error}</div>}
      
      {/* 聊天组件 */}
      <VirtualChat
        messages={messages}
        config={{
          ...config,
          onSendMessage: handleSendMessage,
        }}
        height={height}
      />
    </div>
  );
});

StreamingChat.displayName = 'StreamingChat';

export default VirtualChat;