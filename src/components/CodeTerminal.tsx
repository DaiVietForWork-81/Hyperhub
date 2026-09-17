import React, { useState } from 'react';
import { Play, CheckCircle2, Terminal as TerminalIcon, Cpu, Zap, Copy, Check } from 'lucide-react';
import { SpotlightCard } from './SpotlightCard';

export const CodeTerminal: React.FC = () => {
  const [lang, setLang] = useState<'cpp' | 'python'>('cpp');
  const [isRunning, setIsRunning] = useState(false);
  const [runSuccess, setRunSuccess] = useState(true);
  const [copied, setCopied] = useState(false);

  const cppCode = [
    { line: 1, text: '#include <bits/stdc++.h>', type: 'preprocessor' },
    { line: 2, text: 'using namespace std;', type: 'keyword' },
    { line: 3, text: '', type: 'plain' },
    { line: 4, text: '// HyperHub 1:1 Duel Arena - Fast I/O', type: 'comment' },
    { line: 5, text: 'int main() {', type: 'func' },
    { line: 6, text: '    ios_base::sync_with_stdio(false);', type: 'stmt' },
    { line: 7, text: '    cin.tie(NULL);', type: 'stmt' },
    { line: 8, text: '    int n; cin >> n;', type: 'stmt' },
    { line: 9, text: '    vector<long long> a(n);', type: 'stmt' },
    { line: 10, text: '    for (auto &x : a) cin >> x;', type: 'stmt' },
    { line: 11, text: '    sort(a.begin(), a.end());', type: 'stmt' },
    { line: 12, text: '    // Check AC Verdict...', type: 'comment' },
    { line: 13, text: '    cout << a.back() << "\\n";', type: 'stmt' },
    { line: 14, text: '    return 0;', type: 'keyword' },
    { line: 15, text: '}', type: 'plain' }
  ];

  const pyCode = [
    { line: 1, text: 'import sys', type: 'preprocessor' },
    { line: 2, text: 'input = sys.stdin.readline', type: 'stmt' },
    { line: 3, text: '', type: 'plain' },
    { line: 4, text: '# HyperHub 1:1 Duel Arena - Python 3', type: 'comment' },
    { line: 5, text: 'def solve():', type: 'func' },
    { line: 6, text: '    n = int(input())', type: 'stmt' },
    { line: 7, text: '    a = sorted(map(int, input().split()))', type: 'stmt' },
    { line: 8, text: '    # AC verdict optimal logic', type: 'comment' },
    { line: 9, text: '    print(a[-1])', type: 'stmt' },
    { line: 10, text: '', type: 'plain' },
    { line: 11, text: 'if __name__ == "__main__":', type: 'keyword' },
    { line: 12, text: '    solve()', type: 'func' },
  ];

  const activeCode = lang === 'cpp' ? cppCode : pyCode;

  const handleRun = () => {
    if (isRunning) return;
    setIsRunning(true);
    setTimeout(() => {
      setIsRunning(false);
      setRunSuccess(true);
    }, 600);
  };

  const handleCopy = () => {
    const rawText = activeCode.map(c => c.text).join('\n');
    navigator.clipboard.writeText(rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const renderCodeLine = (item: { line: number; text: string; type: string }) => {
    let colorClass = 'text-white/80';
    if (item.type === 'comment') colorClass = 'text-white/40 italic';
    else if (item.type === 'preprocessor') colorClass = 'text-pink-400';
    else if (item.type === 'keyword') colorClass = 'text-purple-400 font-semibold';
    else if (item.type === 'func') colorClass = 'text-blue-300';
    else if (item.type === 'stmt') colorClass = 'text-white/90';

    return (
      <div key={item.line} className="flex leading-6 font-mono text-[12px] sm:text-[13px]">
        <span className="w-8 shrink-0 text-right pr-3 select-none text-white/20 tabular-nums">
          {item.line}
        </span>
        <span className={colorClass}>{item.text}</span>
      </div>
    );
  };

  return (
    <SpotlightCard
      enableTilt={false}
      spotlightColor="rgba(168, 85, 247, 0.15)"
      borderColor="rgba(236, 72, 153, 0.45)"
      className="terminal-preserve-dark liquid-glass rounded-2xl border-white/[0.1] shadow-2xl overflow-hidden w-full max-w-xl mx-auto text-left"
    >
      {/* Window Title Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08] bg-black/40 select-none">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-red-500/80"></span>
          <span className="h-3 w-3 rounded-full bg-yellow-500/80"></span>
          <span className="h-3 w-3 rounded-full bg-green-500/80"></span>
          <span className="text-xs font-mono text-white/50 ml-2">
            arena_duel.{lang === 'cpp' ? 'cpp' : 'py'}
          </span>
        </div>

        {/* Language Tabs & Copy Button */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white/[0.04] p-0.5 rounded-lg border border-white/[0.08]">
            <button
              type="button"
              onClick={() => setLang('cpp')}
              className={`px-2.5 py-0.5 rounded-md text-[11px] font-mono transition-colors ${
                lang === 'cpp'
                  ? 'bg-purple-600 text-white font-semibold'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              C++20
            </button>
            <button
              type="button"
              onClick={() => setLang('python')}
              className={`px-2.5 py-0.5 rounded-md text-[11px] font-mono transition-colors ${
                lang === 'python'
                  ? 'bg-purple-600 text-white font-semibold'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Python
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 rounded-md text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors"
            title="Sao chép code"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Code Editor Body */}
      <div className="p-4 sm:p-5 font-mono overflow-x-auto bg-[#07070c]/80 min-h-[220px]">
        {activeCode.map(renderCodeLine)}
      </div>

      {/* Compiler Execution Console & Verdict Bar */}
      <div className="px-4 py-3 border-t border-white/[0.08] bg-black/60 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-white/60 font-mono text-[11px]">
            <Cpu className="w-3.5 h-3.5 text-purple-400" />
            <span>Time: 12ms</span>
          </div>
          <span className="text-white/20">•</span>
          <div className="flex items-center gap-1.5 text-white/60 font-mono text-[11px]">
            <Zap className="w-3.5 h-3.5 text-pink-400" />
            <span>Mem: 2.1MB</span>
          </div>
        </div>

        {/* Verdict & Run Action Button */}
        <div className="flex items-center gap-2.5">
          {runSuccess && !isRunning && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/15 border border-green-500/30 text-green-400 font-mono text-[11px] font-bold shadow-[0_0_12px_rgba(34,197,94,0.25)]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>ACCEPTED</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleRun}
            disabled={isRunning}
            className="btn-shimmer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-medium text-xs shadow-md shadow-purple-950/40 active:scale-[0.97] transition-all cursor-pointer disabled:opacity-50"
          >
            {isRunning ? (
              <TerminalIcon className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            <span>{isRunning ? 'Chấm bài...' : 'Chạy Thử'}</span>
          </button>
        </div>
      </div>
    </SpotlightCard>
  );
};
