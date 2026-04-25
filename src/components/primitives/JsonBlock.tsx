/**
 * Json Block Component
 * JSON code block with top gradient line decoration
 */

import { type ReactElement } from 'react';
import cn from 'classnames';

export interface JsonBlockProps {
  content: string;
  className?: string;
}

export function JsonBlock({ content = '', className }: JsonBlockProps): ReactElement {
  return (
    <div
      className={cn(
        'bg-[#111111] border border-white/10 p-6 mt-4 relative overflow-hidden',
        className
      )}
    >
      {/* Top gradient line */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#c5a059]/30 to-transparent" />
      <pre className="font-mono text-[13px] text-white/80 overflow-x-auto leading-relaxed whitespace-pre selection:bg-[#c5a059]/30">
        {content}
      </pre>
    </div>
  );
}

export default JsonBlock;
