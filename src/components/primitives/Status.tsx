/**
 * Status Component
 * 状态指示器，支持 dot 和 badge 两种变体
 */

import React, { type ComponentPropsWithRef, type ReactElement } from 'react';
import cn from 'classnames';
import { Check, AlertCircle, Info, MoreHorizontal } from 'lucide-react';

export type NodeStatus = 'streaming' | 'completed' | 'error' | 'pending';
export type StatusVariant = 'dot' | 'badge';

const STATUS_COLORS_DOT: Record<NodeStatus, string> = {
  streaming: 'bg-ts-streaming animate-pulse',
  completed: 'bg-ts-success',
  error: 'bg-ts-error',
  pending: 'bg-ts-warning',
};

const STATUS_COLORS_BADGE: Record<NodeStatus, string> = {
  streaming: 'bg-ts-streaming-muted text-ts-streaming-muted-foreground',
  completed: 'bg-ts-success-muted text-ts-success-muted-foreground',
  error: 'bg-ts-error-muted text-ts-error-muted-foreground',
  pending: 'bg-ts-warning-muted text-ts-warning-muted-foreground',
};

const STATUS_ICONS: Record<NodeStatus, ReactElement> = {
  streaming: <MoreHorizontal className="size-2.5" />,
  completed: <Check className="size-2.5" />,
  error: <AlertCircle className="size-2.5" />,
  pending: <Info className="size-2.5" />,
};

const STATUS_LABELS: Record<NodeStatus, string> = {
  streaming: 'Streaming',
  completed: 'Completed',
  error: 'Error',
  pending: 'Pending',
};

export interface StatusProps extends ComponentPropsWithRef<'div'> {
  status: NodeStatus;
  variant?: StatusVariant;
  showLabel?: boolean;
}

export function Status({
  status,
  variant = 'dot',
  showLabel = false,
  className,
  ...rest
}: StatusProps): ReactElement {
  const title = `Status: ${STATUS_LABELS[status]}`;

  return (
    <div
      className={cn('flex items-center gap-1', className)}
      title={title}
      {...rest}
    >
      {variant === 'dot' ? (
        <StatusDot status={status} />
      ) : (
        <StatusBadge status={status} />
      )}
      {showLabel && (
        <span className="text-xs text-ts-muted-foreground">
          {STATUS_LABELS[status]}
        </span>
      )}
    </div>
  );
}

interface StatusDotProps {
  status: NodeStatus;
  className?: string;
}

function StatusDot({ status, className }: StatusDotProps): ReactElement {
  return (
    <span
      className={cn(
        'block size-2 rounded-full',
        STATUS_COLORS_DOT[status],
        className
      )}
      aria-label={`Status: ${STATUS_LABELS[status]}`}
    />
  );
}

interface StatusBadgeProps {
  status: NodeStatus;
  className?: string;
}

function StatusBadge({ status, className }: StatusBadgeProps): ReactElement {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center',
        'h-4 w-5 rounded',
        STATUS_COLORS_BADGE[status],
        className
      )}
      aria-label={`Status: ${STATUS_LABELS[status]}`}
    >
      {STATUS_ICONS[status]}
    </span>
  );
}

export default Status;
