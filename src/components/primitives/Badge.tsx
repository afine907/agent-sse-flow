/**
 * Badge Component
 * 借鉴 AgentPrism 设计，支持图标和多种尺寸
 */

import React, { type ReactElement, type ReactNode } from 'react';
import cn from 'classnames';

export type BadgeSize = 'xs' | 'sm' | 'md' | 'lg';

const sizeConfig: Record<BadgeSize, { container: string; text: string }> = {
  xs: { container: 'px-1 gap-1 h-4', text: 'text-[10px] leading-3' },
  sm: { container: 'px-1.5 gap-1 h-5', text: 'text-xs' },
  md: { container: 'px-2 gap-1.5 h-6', text: 'text-sm' },
  lg: { container: 'px-2.5 gap-2 h-7', text: 'text-sm' },
};

export interface BadgeProps extends React.ComponentPropsWithRef<'span'> {
  /**
   * Badge 内容
   */
  label: ReactNode;
  /**
   * 尺寸
   * @default 'sm'
   */
  size?: BadgeSize;
  /**
   * 起始图标
   */
  iconStart?: ReactElement;
  /**
   * 结束图标
   */
  iconEnd?: ReactElement;
  /**
   * 是否使用默认样式
   * @default false
   */
  unstyled?: boolean;
}

export function Badge({
  label,
  size = 'sm',
  iconStart,
  iconEnd,
  unstyled = false,
  className,
  ...rest
}: BadgeProps): ReactElement {
  const { container, text } = sizeConfig[size];

  return (
    <span
      className={cn(
        'inline-flex min-w-0 items-center overflow-hidden rounded-md font-medium',
        container,
        !unstyled && 'bg-ts-muted text-ts-muted-foreground',
        className
      )}
      {...rest}
    >
      {iconStart && <span className="shrink-0">{iconStart}</span>}
      <span
        className={cn(
          text,
          'min-w-0 max-w-full flex-shrink-0 truncate tracking-normal'
        )}
      >
        {label}
      </span>
      {iconEnd && <span className="shrink-0">{iconEnd}</span>}
    </span>
  );
}

export default Badge;
