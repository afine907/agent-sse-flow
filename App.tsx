/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ReactNode } from "react";
import { motion } from "motion/react";
import { 
  User, 
  Settings, 
  Terminal, 
  CheckCircle2, 
  AlertCircle, 
  Code2, 
  ChevronRight, 
  Copy, 
  Minus, 
  Plus, 
  ExternalLink 
} from "lucide-react";

const Header = () => (
  <header className="mb-32 flex flex-col items-start gap-6 relative">
    {/* Design Accent Line */}
    <div className="absolute -left-12 top-0 bottom-0 w-[1px] bg-gradient-to-b from-accent via-accent/20 to-transparent" />
    
    <div className="text-accent text-[10px] uppercase tracking-[5px] font-bold">
      Premium Architecture
    </div>
    <h1 className="text-[64px] md:text-[88px] font-serif font-light leading-[0.9] tracking-tight text-white m-0">
      Trace<br />Sequence.
    </h1>
    <div className="flex flex-wrap items-center gap-12 mt-8 font-mono text-[11px] uppercase tracking-[3px] text-white/40">
      <div className="flex flex-col gap-2">
        <span className="text-white font-serif text-[32px] normal-case tracking-normal leading-none font-light italic">alpha-0922</span>
        <span className="text-tertiary text-[9px] font-sans font-bold tracking-[2px]">SESSION ID</span>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-white font-serif text-[32px] normal-case tracking-normal leading-none font-light italic">14ms</span>
        <span className="text-tertiary text-[9px] font-sans font-bold tracking-[2px]">LATENCY</span>
      </div>
      <div className="flex flex-col gap-2">
        <div className="text-accent font-serif text-[32px] normal-case tracking-normal leading-none font-light italic flex items-center gap-3">
           Live
           <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
        </div>
        <span className="text-tertiary text-[9px] font-sans font-bold tracking-[2px]">STREAMING</span>
      </div>
    </div>
  </header>
);

interface TimelineItemProps {
  icon?: ReactNode;
  markerType?: "dot" | "pulse" | "success" | "error";
  title: string;
  timestamp?: string;
  metadata?: string;
  children: ReactNode;
  isLast?: boolean;
}

const TimelineItem = ({ 
  icon, 
  markerType = "dot", 
  title, 
  timestamp, 
  metadata, 
  children, 
  isLast = false 
}: TimelineItemProps) => {
  return (
    <div className={`relative pl-14 ${!isLast ? 'pb-14' : 'pb-8'} group`}>
      {/* Connector line */}
      {!isLast && (
        <div className="absolute left-[23px] top-6 bottom-0 w-[1px] bg-outline-variant" />
      )}
      
      {/* Marker */}
      <div className="absolute left-[14px] top-1 w-5 h-5 flex items-center justify-center bg-background z-10">
        {icon ? (
          <div className="text-tertiary group-hover:text-primary transition-colors">
            {icon}
          </div>
        ) : (
          <div className={`w-1.5 h-1.5 rounded-none ${
            markerType === "pulse" ? "bg-accent pulse-node" :
            markerType === "success" ? "bg-success" :
            markerType === "error" ? "bg-error" :
            "bg-outline-variant"
          }`} />
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-baseline justify-between mb-4">
          <span className={`text-[10px] uppercase tracking-[5px] font-bold ${
            markerType === "error" ? "text-error" : "text-accent"
          }`}>
            {title}
          </span>
          {timestamp && (
            <span className="font-mono text-[11px] text-tertiary tracking-widest uppercase">
              {timestamp}
            </span>
          )}
          {metadata && (
            <span className="font-mono text-[11px] text-tertiary tracking-widest uppercase">
              {metadata}
            </span>
          )}
        </div>
        <div className="mt-2 text-white/50 text-base font-light font-sans leading-relaxed">
          {children}
        </div>
      </div>
    </div>
  );
};

const JsonBlock = ({ content }: { content: string }) => (
  <div className="bg-surface border border-white/10 p-6 mt-4 relative overflow-hidden group">
    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
    <pre className="font-mono text-[13px] text-white/80 overflow-x-auto leading-relaxed whitespace-pre selection:bg-accent/30">
      {content}
    </pre>
  </div>
);

const PatchBlock = ({ before, after }: { before: string[]; after: string[] }) => (
  <div className="space-y-4 pl-8 relative mt-4">
    {/* Inner 'L' Connector */}
    <div className="absolute left-0 top-0 bottom-8 w-px bg-outline-variant" />
    <div className="absolute left-0 top-3 w-5 h-px bg-outline-variant" />
    
    <div className="bg-surface-container border border-outline-variant p-5 text-[13px] font-mono leading-relaxed relative group/patch">
      {before.map((line, i) => (
        <div key={i} className="text-error opacity-80 flex gap-2">
          <span>-</span>
          <span>{line}</span>
        </div>
      ))}
      {after.map((line, i) => (
        <div key={i} className="text-success flex gap-2">
          <span>+</span>
          <span>{line}</span>
        </div>
      ))}
      <div className="absolute top-3 right-3 opacity-0 group-hover/patch:opacity-100 transition-opacity">
        <button className="p-1.5 border border-outline-variant hover:bg-outline-variant transition-colors" title="Copy Patch">
          <Copy className="w-3 h-3 text-secondary" />
        </button>
      </div>
    </div>
  </div>
);

const StatusFooter = () => (
  <footer className="mt-28 pt-10 border-t border-outline-variant flex flex-wrap justify-between items-end gap-8">
    <div className="flex items-center gap-10">
      <div className="flex flex-col gap-1">
        <span className="font-mono text-[10px] text-tertiary uppercase tracking-tighter opacity-60">
          Stream Status
        </span>
        <span className="font-mono text-[11px] text-white uppercase font-bold tracking-widest">
          Encrypted / E2E
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <span className="font-mono text-[10px] text-tertiary uppercase tracking-tighter opacity-60">
          Total Trace Time
        </span>
        <span className="font-mono text-[11px] text-white uppercase font-bold tracking-widest">
          1,402ms
        </span>
      </div>
    </div>
    <div className="flex items-center gap-3 pb-0.5">
      <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
      <span className="font-mono text-[11px] text-tertiary uppercase tracking-[0.2em]">
        Listening...
      </span>
    </div>
  </footer>
);

export default function App() {
  return (
    <div className="min-h-screen bg-background p-8 md:p-12 lg:p-24 selection:bg-accent selection:text-white">
      {/* Background Grid */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 opacity-[0.03]" 
        style={{ 
          backgroundImage: 'radial-gradient(#ffffff 0.5px, transparent 0.5px)', 
          backgroundSize: '32px 32px' 
        }} 
      />

      <main className="max-w-3xl mx-auto relative z-10">
        <Header />

        <div className="relative">
          <TimelineItem 
            icon={<User className="w-4 h-4 text-white" />}
            title="User Intent"
            timestamp="14:02:01.004"
          >
            <p className="text-secondary text-base leading-relaxed max-w-xl">
              Identify the bottleneck in the <code className="font-mono text-accent text-[13px]">auth-middleware.ts</code> within the local container and suggest a fix for the token validation loop.
            </p>
          </TimelineItem>

          <TimelineItem 
            markerType="pulse"
            title="Assistant Process"
            metadata="Tokens: 42"
          >
            <p className="text-tertiary text-base italic leading-relaxed font-light">
              Analyzing filesystem structure... indexing middleware patterns... identifying potential circular dependencies in the validation chain.
            </p>
          </TimelineItem>

          <TimelineItem 
            icon={<Terminal className="w-4 h-4" />}
            title="Tool Call"
            metadata="EXEC_ID: 982-FC"
          >
            <div className="bg-surface p-4 border border-outline-variant relative group">
              <code className="font-mono text-[13px] text-white block truncate">
                <span className="text-tertiary italic">[ Click to expand 48 characters ]</span>
              </code>
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-1 border border-outline-variant hover:bg-outline-variant transition-colors">
                   <ChevronRight className="w-3 h-3 rotate-90" />
                </button>
                <button className="p-1 border border-outline-variant hover:bg-outline-variant transition-colors">
                   <Copy className="w-3 h-3" />
                </button>
              </div>
            </div>
          </TimelineItem>

          <TimelineItem 
            markerType="success"
            title="Execution Success"
            metadata="STDOUT"
          >
            <JsonBlock content={`{
  "status": "success",
  "matches": [
    {"line": 42, "content": "async function validateToken(t) {"},
    {"line": 89, "content": "const isValid = await validateToken(req.header);"}
  ],
  "path": "/volumes/app/src/middleware/auth-middleware.ts"
}`} />
          </TimelineItem>

          <TimelineItem 
            icon={<Code2 className="w-4 h-4" />}
            title="Proposed Patch"
            metadata="DIFF_V1"
          >
            <PatchBlock 
              before={[
                "if (await validateToken(token)) return next();"
              ]}
              after={[
                "const cached = cache.get(token);",
                "if (cached) return next();",
                "const valid = await validateToken(token);",
                "cache.set(token, valid);",
                "return next();"
              ]}
            />
          </TimelineItem>

          <TimelineItem 
            markerType="error"
            title="Runtime Warning"
            metadata="ERR_021"
          >
            <p className="text-error/90 text-sm font-mono bg-error/5 p-3 border-l-2 border-error">
              Filesystem watch limit reached. Hot-reload might be delayed for the next 4s.
            </p>
          </TimelineItem>

          <TimelineItem 
            icon={<CheckCircle2 className="w-4 h-4 text-success" />}
            title="Final Resolution"
            metadata="COMPLETED"
            isLast
          >
            <div className="space-y-8">
              <div className="text-secondary text-lg font-serif leading-relaxed max-w-2xl space-y-4">
                <p>
                  The bottleneck was identified in <code className="bg-surface px-2 py-0.5 border border-white/10 text-white font-mono text-[13px]">auth-middleware.ts:89</code>. The validation logic was re-triggering for every nested route call without an internal cache mechanism.
                </p>
                <p>
                  I have applied a temporary LRU cache layer. To persist this, please update your <span className="text-accent underline underline-offset-8 decoration-accent/30 font-medium">redis.config</span> to include the <code className="bg-surface px-2 py-0.5 border border-white/10 font-mono text-[13px] text-accent/80">AUTH_TTL</code> parameter.
                </p>
              </div>
              <div className="flex flex-wrap gap-8 pt-4">
                <button className="border border-white/30 rounded-full text-white font-sans text-[11px] px-12 py-5 uppercase font-medium tracking-[3px] transition-all hover:bg-white hover:text-black cursor-pointer bg-transparent active:scale-95">
                  Apply Patch
                </button>
                <button className="border border-white/10 rounded-full text-secondary font-sans text-[11px] px-12 py-5 uppercase font-medium tracking-[3px] transition-all hover:border-white/40 hover:text-white cursor-pointer active:scale-95">
                  Discard
                </button>
              </div>
            </div>
          </TimelineItem>
        </div>

        <StatusFooter />
      </main>
    </div>
  );
}
