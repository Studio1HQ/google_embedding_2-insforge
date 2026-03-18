import { useState, useRef, useEffect } from 'react';
import type { Source } from '../types';
import { queryEmbedding } from '../api';

interface Props { readyCount: number; onNewChat: () => void; }

interface Msg {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  sources?: Source[];
  loading?: boolean;
}

function SourcesCollapsible({ sources }: { sources: Source[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1.5 text-xs font-medium text-teal-600 hover:text-teal-700 transition px-1">
        <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        {sources.length} source{sources.length !== 1 ? 's' : ''} found
      </button>
      {open && (
        <div className="mt-2 space-y-2 animate-fade-in">
          {sources.map((s, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-100 px-4 py-3 hover:border-teal-200 transition">
              <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{s.content}</p>
              <p className="text-[10px] text-slate-300 mt-1.5">{(s.similarity * 100).toFixed(0)}% match</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function QueryPanel({ readyCount, onNewChat }: Props) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  const send = async () => {
    const q = input.trim();
    if (!q || busy) return;
    setInput('');
    const uid = crypto.randomUUID();
    const aid = crypto.randomUUID();
    setMsgs((p) => [...p, { id: uid, role: 'user', text: q }, { id: aid, role: 'assistant', text: '', loading: true }]);
    setBusy(true);
    try {
      const res = await queryEmbedding(q);
      setMsgs((p) => p.map((m) => m.id === aid ? { ...m, text: res.answer, sources: res.sources, loading: false } : m));
    } catch (e) {
      setMsgs((p) => p.map((m) => m.id === aid ? { ...m, text: e instanceof Error ? e.message : 'Something went wrong.', loading: false } : m));
    } finally { setBusy(false); }
  };

  const copyText = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    } catch { /* ignore */ }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 pt-5 pb-3 border-b border-slate-100 bg-white flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-md bg-teal-500 flex items-center justify-center">
              <span className="text-[10px] font-bold text-white">2</span>
            </div>
            <h2 className="text-sm font-bold text-slate-800">Ask Questions</h2>
          </div>
          <p className="text-xs text-slate-400 ml-8">
            {readyCount > 0 ? `Searching across ${readyCount} indexed item${readyCount !== 1 ? 's' : ''}` : 'Upload content first to start asking'}
          </p>
        </div>
        {msgs.length > 0 && (
          <button
            onClick={onNewChat}
            className="flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-700 font-medium px-3 py-1.5 rounded-lg hover:bg-teal-50 border border-teal-200 transition"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Chat
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        {msgs.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-50 to-emerald-50 flex items-center justify-center mb-5 border border-teal-100">
              <svg className="w-7 h-7 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>
            <p className="text-base font-semibold text-slate-600">
              {readyCount > 0 ? 'Ready to search' : 'No content yet'}
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              {readyCount > 0
                ? 'Ask any question — the AI will find relevant content and generate an answer'
                : 'Upload text or images on the left panel to get started'}
            </p>
            {readyCount > 0 && (
              <div className="flex flex-wrap gap-2 mt-5 justify-center">
                {['Describe the uploaded content', 'What topics are covered?', 'Summarize everything'].map((s) => (
                  <button key={s} onClick={() => setInput(s)} className="text-xs px-3 py-1.5 rounded-full border border-teal-200 text-teal-600 hover:bg-teal-50 transition">
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {msgs.map((m) => (
          <div key={m.id} className="animate-slide-up">
            {m.role === 'user' ? (
              <div className="flex justify-end mb-1">
                <div className="bg-teal-600 text-white rounded-2xl rounded-br-md px-4 py-2.5 max-w-[85%] shadow-sm">
                  <p className="text-sm">{m.text}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-md bg-teal-500 flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                        </svg>
                      </div>
                      <span className="text-xs font-semibold text-slate-600">AI Answer</span>
                    </div>
                    {!m.loading && m.text && (
                      <button
                        onClick={() => copyText(m.id, m.text)}
                        className={`text-xs flex items-center gap-1 px-2 py-1 rounded-md transition ${
                          copied === m.id ? 'text-emerald-500 bg-emerald-50' : 'text-slate-300 hover:text-teal-500 hover:bg-teal-50'
                        }`}
                        title="Copy answer"
                      >
                        {copied === m.id ? (
                          <>
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                            Copied
                          </>
                        ) : (
                          <>
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                            </svg>
                            Copy
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  <div className="px-4 py-3">
                    {m.loading ? (
                      <div className="flex items-center gap-2 py-2">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse-dot" style={{ animationDelay: '-0.32s' }} />
                          <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse-dot" style={{ animationDelay: '-0.16s' }} />
                          <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse-dot" />
                        </div>
                        <span className="text-xs text-slate-400">Searching & generating…</span>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{m.text}</p>
                    )}
                  </div>
                </div>

                {m.sources && m.sources.length > 0 && (
                  <SourcesCollapsible sources={m.sources} />
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-200/60 bg-white px-6 py-4">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={readyCount > 0 ? 'Ask a question about your content…' : 'Upload content first…'}
            disabled={readyCount === 0}
            className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 placeholder-slate-300 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition disabled:bg-slate-50 disabled:cursor-not-allowed"
          />
          <button
            onClick={send}
            disabled={!input.trim() || busy || readyCount === 0}
            className="px-5 py-2.5 rounded-xl bg-teal-600 text-white font-medium hover:bg-teal-700 shadow-md shadow-teal-200 transition-all disabled:bg-slate-100 disabled:text-slate-300 disabled:shadow-none disabled:cursor-not-allowed"
          >
            Search
          </button>
        </div>
      </div>
    </div>
  );
}
