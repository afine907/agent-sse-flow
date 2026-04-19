/**
 * TokensBadge Component
 * Token 数量徽章
 */

import React, { type ComponentPropsWithRef, type ReactElement } from 'react';
import { Coins } from 'lucide-react';
import cn from 'classnames';
import { Badge, type BadgeSize } from './Badge';

export interface TokensBadgeProps extends ComponentPropsWithRef<'span'> {
  /**
   * Token 数量
   */
  tokens: number;
  /**
   * 尺寸
   */
  size?: BadgeSize;
}

/**
 * 格式化 Token 数量
 */
function formatTokens(tokens: number): string {
  if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
  return tokens.toString();
}

export function TokensBadge({
  tokens,
  size = 'sm',
  className,
  ...rest
}: TokensBadgeProps): ReactElement {
  return (
    <Badge
      iconStart={<Coins className="size-3" />}
      size={size}
      label={formatTokens(tokens)}
      className={cn('bg-ts-muted text-ts-muted-foreground', className)}
      {...rest}
    />
  );
}

export default TokensBadge;
