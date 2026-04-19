/**
 * Avatar Component
 * 节点类型图标，根据节点类型自动着色
 */

import React, { type ComponentPropsWithRef, type ReactElement } from 'react';
import cn from 'classnames';
import {
  User,
  Zap,
  Wrench,
  Code,
  Terminal,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import type { NodeTypeName } from '../../types/node';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const sizeClasses: Record<AvatarSize, { container: string; icon: string }> = {
  xs: { container: 'size-4', icon: 'size-2.5' },
  sm: { container: 'size-5', icon: 'size-3' },
  md: { container: 'size-6', icon: 'size-4' },
  lg: { container: 'size-8', icon: 'size-5' },
  xl: { container: 'size-10', icon: 'size-6' },
};

const NODE_TYPE_CONFIG: Record<
  NodeTypeName,
  { label: string; icon: typeof User; bgClass: string }
> = {
  user_input: {
    label: 'User',
    icon: User,
    bgClass: 'bg-ts-node-user text-white',
  },
  assistant_thought: {
    label: 'AI',
    icon: Zap,
    bgClass: 'bg-ts-node-thought text-white',
  },
  tool_call: {
    label: 'Tool',
    icon: Wrench,
    bgClass: 'bg-ts-node-tool text-white',
  },
  code_execution: {
    label: 'Code',
    icon: Code,
    bgClass: 'bg-ts-node-code text-white',
  },
  execution_result: {
    label: 'Result',
    icon: Terminal,
    bgClass: 'bg-ts-node-result text-white',
  },
  final_output: {
    label: 'Output',
    icon: CheckCircle,
    bgClass: 'bg-ts-node-output text-white',
  },
  error: {
    label: 'Error',
    icon: AlertCircle,
    bgClass: 'bg-ts-node-error text-white',
  },
};

export interface AvatarProps extends ComponentPropsWithRef<'div'> {
  /**
   * 节点类型
   */
  nodeType: NodeTypeName;
  /**
   * 尺寸
   * @default 'sm'
   */
  size?: AvatarSize;
  /**
   * 自定义图标
   */
  icon?: ReactElement;
  /**
   * 圆角
   * @default 'sm'
   */
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
}

const roundedClasses = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  full: 'rounded-full',
};

export function Avatar({
  nodeType,
  size = 'sm',
  icon,
  rounded = 'sm',
  className,
  ...rest
}: AvatarProps): ReactElement {
  const config = NODE_TYPE_CONFIG[nodeType] || NODE_TYPE_CONFIG.final_output;
  const { container, icon: iconSize } = sizeClasses[size];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'flex items-center justify-center font-medium',
        container,
        roundedClasses[rounded],
        config.bgClass,
        className
      )}
      title={config.label}
      {...rest}
    >
      {icon || <Icon className={iconSize} aria-hidden />}
    </div>
  );
}

export default Avatar;
