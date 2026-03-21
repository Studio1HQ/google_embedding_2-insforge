import { SignInButton, SignUpButton, UserButton } from '@insforge/react';

interface Props {
  onEnterApp: () => void;
  isSignedIn: boolean;
  userEmail?: string;
  onSignOut: () => void;
}

export default function LandingPage({ onEnterApp, isSignedIn, userEmail, onSignOut }: Props) {
  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* Nav */}
      <nav className="px-6 py-4 flex items-center justify-between max-w-6xl mx-auto w-full">
        {/* App logo — clicking refreshes to top of landing page */}
        <a href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-md shadow-teal-200 group-hover:shadow-teal-300 transition">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <span className="text-sm font-bold text-slate-800 group-hover:text-teal-600 transition">Multimodal RAG</span>
        </a>

        <div className="flex items-center gap-3">
          {isSignedIn ? (
            <>
              <UserButton />
              <span className="text-xs text-slate-400 hidden sm:block max-w-[140px] truncate">{userEmail}</span>
              <button
                onClick={onEnterApp}
                className="text-xs font-semibold text-white bg-gradient-to-r from-teal-500 to-emerald-600 px-4 py-2 rounded-lg shadow-sm hover:from-teal-600 hover:to-emerald-700 transition"
              >
                Open App →
              </button>
              <button onClick={onSignOut} className="text-xs font-medium text-slate-400 hover:text-red-500 transition">
                Sign out
              </button>
            </>
          ) : (
            <>
              <SignInButton>
                <button className="text-xs font-semibold text-slate-600 hover:text-teal-600 px-4 py-2 rounded-lg border border-slate-200 hover:border-teal-200 hover:bg-teal-50 transition">
                  Sign In
                </button>
              </SignInButton>
              <SignUpButton>
                <button className="text-xs font-semibold text-white bg-gradient-to-r from-teal-500 to-emerald-600 px-4 py-2 rounded-lg shadow-sm hover:from-teal-600 hover:to-emerald-700 transition">
                  Sign Up
                </button>
              </SignUpButton>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center max-w-4xl mx-auto w-full">

        {/* Built with pills */}
        <div className="flex items-center gap-3 mb-10 flex-wrap justify-center">
          <a
            href="https://insforge.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center bg-slate-50 border border-slate-100 hover:border-slate-300 px-4 py-2 rounded-full transition"
          >
            <img src="/insforge-wordmark.svg" alt="InsForge" className="h-4 w-auto" />
          </a>
          <span className="text-slate-300 text-lg">×</span>
          <a
            href="https://ai.google.dev/gemini-api/docs/embeddings"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center bg-slate-50 border border-slate-100 hover:border-blue-200 px-4 py-2 rounded-full transition"
          >
            <img src="/gemini-logo.svg" alt="Google Gemini" className="h-4 w-auto" />
          </a>
        </div>

        {/* Title */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 leading-tight tracking-tight">
          Search your content
          <br />
          <span className="bg-gradient-to-r from-teal-500 to-emerald-500 bg-clip-text text-transparent">
            with AI understanding
          </span>
        </h1>

        <p className="mt-5 text-lg text-slate-500 max-w-2xl leading-relaxed">
          Upload text and images, ask questions in natural language, and get grounded AI answers — with cited sources.
        </p>

        {/* CTA */}
        <div className="mt-9 flex flex-col sm:flex-row items-center gap-3">
          {isSignedIn ? (
            <button
              onClick={onEnterApp}
              className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-semibold text-sm shadow-lg shadow-teal-200 hover:shadow-teal-300 hover:from-teal-600 hover:to-emerald-700 transition-all"
            >
              Open App →
            </button>
          ) : (
            <>
              <SignUpButton>
                <button className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-semibold text-sm shadow-lg shadow-teal-200 hover:shadow-teal-300 hover:from-teal-600 hover:to-emerald-700 transition-all">
                  Get Started — It's Free
                </button>
              </SignUpButton>
              <SignInButton>
                <button className="px-8 py-3.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:border-teal-300 hover:bg-teal-50 transition-all">
                  Sign In
                </button>
              </SignInButton>
            </>
          )}
        </div>

        {/* How it works */}
        <div className="mt-20 w-full">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-7">How it works</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              {
                step: '1',
                title: 'Upload Content',
                desc: 'Add text or images. Each piece is embedded with Gemini Embedding 2 and stored in InsForge\'s vector database.',
                icon: <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />,
              },
              {
                step: '2',
                title: 'Semantic Search',
                desc: 'Your query is embedded and matched against stored content using cosine similarity via pgvector.',
                icon: <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />,
              },
              {
                step: '3',
                title: 'Get Answers',
                desc: 'GPT-4o Mini generates a grounded answer from the most relevant content — with cited sources.',
                icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />,
              },
            ].map((item) => (
              <div key={item.step} className="bg-slate-50 rounded-2xl p-6 text-left border border-slate-100 hover:border-teal-200 hover:shadow-sm transition-all">
                <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center mb-4 border border-teal-100">
                  <svg style={{ width: 18, height: 18 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="text-teal-500">
                    {item.icon}
                  </svg>
                </div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-bold text-teal-500 bg-teal-50 w-4 h-4 rounded flex items-center justify-center border border-teal-100">{item.step}</span>
                  <h3 className="text-sm font-bold text-slate-800">{item.title}</h3>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* InsForge Features Used */}
        <div className="mt-16 w-full">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-7">InsForge Features Used</p>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
            {[
              {
                name: 'InsForge Auth',
                desc: 'Sign-up, sign-in and session management — zero backend code.',
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                ),
              },
              {
                name: 'Model Gateway',
                desc: 'GPT-4o Mini routed through InsForge for answer generation.',
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                ),
              },
              {
                name: 'InsForge Vector',
                desc: 'pgvector-backed similarity search for semantic retrieval.',
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                ),
              },
              {
                name: 'InsForge Storage',
                desc: 'Image uploads stored and served via InsForge object storage.',
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                ),
              },
              {
                name: 'Edge Functions',
                desc: 'Embedding and query logic run on InsForge Deno edge functions.',
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                ),
              },
            ].map((f) => (
              <div key={f.name} className="flex flex-col gap-3 bg-slate-50 rounded-2xl p-5 text-left border border-slate-100 hover:border-teal-200 hover:shadow-sm transition-all">
                <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center flex-shrink-0">
                  <svg style={{ width: 16, height: 16 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="text-teal-500">
                    {f.icon}
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 mb-1">{f.name}</p>
                  <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tech Stack */}
        <div className="mt-14 mb-16 w-full">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-5">Tech Stack</p>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              'InsForge BaaS',
              'Google Gemini 2 Embeddings',
              'React + Vite',
            ].map((t) => (
              <span key={t} className="text-sm font-semibold text-slate-700 bg-slate-50 px-5 py-2.5 rounded-xl border border-slate-200 hover:border-teal-300 hover:bg-teal-50/40 transition">
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-5 text-center border-t border-slate-100">
        <p className="text-[11px] text-slate-300">© 2026 Multimodal RAG Demo</p>
      </footer>
    </div>
  );
}
