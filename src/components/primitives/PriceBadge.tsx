/**
 * PriceBadge Component
 * 成本徽章
 */

import React, { type ComponentPropsWithRef, type ReactElement } from 'react';
import { DollarSign } from 'lucide-react';
import cn from 'classnames';
import { Badge, type BadgeSize } from './Badge';

export interface PriceBadgeProps extends ComponentPropsWithRef<'span'> {
  /**
   * 成本（美元）
   */
  cost: number;
  /**
   * 尺寸
   */
  size?: BadgeSize;
}

/**
 * 格式化成本
 */
function formatCost(cost: number): string {
  if (cost < 0.01) return `$${(cost * 1000).toFixed(2)}m`; // 毫美元
  if (cost < 1) return `$${cost.toFixed(3)}`;
  return `$${cost.toFixed(2)}`;
}

export function PriceBadge({
  cost,
  size = 'sm',
  className,
  ...rest
}: PriceBadgeProps): ReactElement {
  return (
    <Badge
      iconStart={<DollarSign className="size-3" />}
      size={size}
      label={formatCost(cost)}
      className={cn('bg-ts-muted text-ts-muted-foreground', className)}
      {...rest}
    />
  );
}

export default PriceBadge;
