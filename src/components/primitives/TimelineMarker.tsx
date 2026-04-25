/**
 * Timeline Marker Component
 * Timeline node marker supporting multiple types
 */

import { type ReactElement, type ReactNode } from 'react';
import cn from 'classnames';

export type MarkerType = 'dot' | 'pulse' | 'success' | 'error';

export interface TimelineMarkerProps {
  type?: MarkerType;
  icon?: ReactNode;
  className?: string;
}

const MARKER_STYLES: Record<MarkerType, string> = {
  dot: 'bg-white/20',
  pulse: 'bg-[#c5a059] pulse-node',
  success: 'bg-[#4ade80]',
  error: 'bg-[#fca5a5]',
};

export function TimelineMarker({
  type = 'dot',
  icon,
  className,
}: TimelineMarkerProps): ReactElement {
  if (icon) {
    return (
      <div className={cn('text-white/40 group-hover:text-white transition-colors', className)}>
        {icon}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'w-1.5 h-1.5 rounded-none',
        MARKER_STYLES[type],
        className
      )}
      aria-hidden
    />
  );
}

export default TimelineMarker;
