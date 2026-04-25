/**
 * Patch Block Component
 * Diff patch block showing before/after changes
 */

import { type ReactElement } from 'react';
import cn from 'classnames';

export interface PatchBlockProps {
  before: string[];
  after: string[];
  className?: string;
}

export function PatchBlock({ before, after, className }: PatchBlockProps): ReactElement {
  return (
    <div className={cn('space-y-4 pl-8 relative mt-4', className)}>
      {/* Inner L-shaped connector */}
      <div className="absolute left-0 top-0 bottom-8 w-px bg-white/10" />
      <div className="absolute left-0 top-3 w-5 h-px bg-white/10" />

      <div className="bg-[#151515] border border-white/10 p-5 text-[13px] font-mono leading-relaxed relative group/patch">
        {before.map((line, i) => (
          <div key={`before-${i}-${line.slice(0, 20)}`} className="text-[#fca5a5] opacity-80 flex gap-2">
            <span>-</span>
            <span>{line}</span>
          </div>
        ))}
        {after.map((line, i) => (
          <div key={`after-${i}-${line.slice(0, 20)}`} className="text-[#4ade80] flex gap-2">
            <span>+</span>
            <span>{line}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PatchBlock;
