/**
 * Timeline Component
 * Gantt 风格时间条，可视化节点执行时间
 */

import React, { type ComponentPropsWithRef, type ReactElement, useMemo } from 'react';
import cn from 'classnames';
import type { NodeTypeName } from '../../types/node';

export interface TimelineProps extends ComponentPropsWithRef<'div'> {
  /**
   * 节点开始时间（毫秒时间戳）
   */
  startTime: number;
  /**
   * 节点结束时间（毫秒时间戳）
   */
  endTime?: number;
  /**
   * 时间范围最小值
   */
  minTime: number;
  /**
   * 时间范围最大值
   */
  maxTime: number;
  /**
   * 节点类型（用于着色）
   */
  nodeType: NodeTypeName;
  /**
   * 宽度（像素）
   * @default 80
   */
  width?: number;
}

const NODE_TYPE_TIMELINE_CLASS: Record<NodeTypeName, string> = {
  user_input: 'bg-ts-timeline-user',
  assistant_thought: 'bg-ts-timeline-thought',
  tool_call: 'bg-ts-timeline-tool',
  code_execution: 'bg-ts-timeline-code',
  execution_result: 'bg-ts-timeline-result',
  final_output: 'bg-ts-timeline-output',
  error: 'bg-ts-timeline-error',
};

/**
 * 格式化持续时间
 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

export function Timeline({
  startTime,
  endTime,
  minTime,
  maxTime,
  nodeType,
  width = 80,
  className,
  ...rest
}: TimelineProps): ReactElement | null {
  // 计算时间条位置和宽度
  const { left, barWidth, duration } = useMemo(() => {
    const totalDuration = maxTime - minTime;
    if (totalDuration <= 0) return { left: 0, barWidth: 0, duration: 0 };

    const actualEndTime = endTime || Date.now();
    const nodeDuration = actualEndTime - startTime;
    
    const leftPercent = ((startTime - minTime) / totalDuration) * 100;
    const widthPercent = Math.min((nodeDuration / totalDuration) * 100, 100 - leftPercent);

    return {
      left: Math.max(0, Math.min(leftPercent, 100)),
      barWidth: Math.max(2, Math.min(widthPercent, 100)),
      duration: nodeDuration,
    };
  }, [startTime, endTime, minTime, maxTime]);

  if (barWidth <= 0) return null;

  const timelineClass = NODE_TYPE_TIMELINE_CLASS[nodeType] || NODE_TYPE_TIMELINE_CLASS.final_output;

  return (
    <div
      className={cn('relative h-1.5 flex-shrink-0', className)}
      style={{ width: `${width}px` }}
      title={`Duration: ${formatDuration(duration)}`}
      {...rest}
    >
      {/* 背景轨道 */}
      <div className="absolute inset-0 rounded-full bg-ts-border-subtle" />
      
      {/* 时间条 */}
      <div
        className={cn(
          'absolute top-0 h-full rounded-full transition-all',
          timelineClass
        )}
        style={{
          left: `${left}%`,
          width: `${barWidth}%`,
        }}
      />
    </div>
  );
}

export default Timeline;
