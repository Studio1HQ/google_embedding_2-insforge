interface Props {
  onStart: () => void;
}

export default function LandingPage({ onStart }: Props) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Nav */}
      <nav className="px-6 py-4 flex items-center justify-between max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-md shadow-teal-200">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <span className="text-sm font-bold text-slate-800">Multimodal RAG</span>
        </div>
        <button onClick={onStart} className="text-xs font-semibold text-teal-600 hover:text-teal-700 px-4 py-2 rounded-lg border border-teal-200 hover:bg-teal-50 transition">
          Launch App →
        </button>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center max-w-4xl mx-auto">
        {/* Built with logos */}
        <div className="flex items-center gap-3 mb-8">
          <a href="https://insforge.dev" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-full border border-slate-100 hover:border-teal-200 transition">
            <img src="https://insforge.dev/favicon.ico" alt="InsForge" className="w-6 h-6" />
            <span className="text-sm font-semibold text-slate-600">InsForge</span>
          </a>
          <span className="text-slate-300 text-lg">×</span>
          <a href="https://ai.google.dev/gemini-api/docs/embeddings" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-full border border-slate-100 hover:border-blue-200 transition">
            <img src="https://storage.googleapis.com/gweb-developer-goog-blog-assets/images/Embedings_Wagtial_RD2-V01.original.jpg" alt="Gemini" className="w-6 h-6 rounded-sm" />
            <span className="text-sm font-semibold text-slate-600">Gemini Embeddings</span>
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

        {/* Subtitle */}
        <p className="mt-6 text-lg text-slate-500 max-w-2xl leading-relaxed">
          Upload text and images. Ask questions in natural language.
          Get AI-generated answers grounded in your actual content — with sources.
        </p>

        {/* CTA */}
        <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
          <button
            onClick={onStart}
            className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-semibold text-sm shadow-lg shadow-teal-200 hover:shadow-teal-300 hover:from-teal-600 hover:to-emerald-700 transition-all"
          >
            Get Started — It's Free
          </button>
        </div>

        {/* How it works */}
        <div className="mt-24 w-full">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-8">How it works</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                step: '1',
                title: 'Upload Content',
                desc: 'Add text or images. Each piece is converted into a vector embedding using Google Gemini Embedding 2 Preview.',
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                ),
              },
              {
                step: '2',
                title: 'Ask Questions',
                desc: 'Type any question. Your query is embedded and matched against stored content using cosine similarity search via pgvector.',
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                ),
              },
              {
                step: '3',
                title: 'Get Answers',
                desc: 'GPT-4o Mini generates a grounded answer using the most relevant content as context — with cited sources.',
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                ),
              },
            ].map((item) => (
              <div key={item.step} className="bg-slate-50 rounded-2xl p-6 text-left border border-slate-100 hover:border-teal-200 hover:shadow-sm transition-all">
                <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center mb-4 border border-teal-100">
                  <svg className="w-5 h-5 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    {item.icon}
                  </svg>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold text-teal-500 bg-teal-50 w-5 h-5 rounded-md flex items-center justify-center border border-teal-100">{item.step}</span>
                  <h3 className="text-sm font-bold text-slate-800">{item.title}</h3>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Features */}
        <div className="mt-16 w-full">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-6">Features</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              'Multimodal Embeddings',
              'Image Understanding',
              'Vector Similarity Search',
              'RAG Answer Generation',
              'Source Citations',
              'Copy Answers',
              'Knowledge Management',
              'Edge Functions',
            ].map((f) => (
              <div key={f} className="text-xs text-slate-500 bg-slate-50 px-3 py-2.5 rounded-xl border border-slate-100 text-center font-medium">
                {f}
              </div>
            ))}
          </div>
        </div>

        {/* Tech stack with logos */}
        <div className="mt-16 mb-12">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-6">Tech Stack</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <a href="https://ai.google.dev/gemini-api/docs/embeddings" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 bg-slate-50 px-5 py-2.5 rounded-xl border border-slate-100 hover:border-blue-200 transition">
              <img src="https://storage.googleapis.com/gweb-developer-goog-blog-assets/images/Embedings_Wagtial_RD2-V01.original.jpg" alt="Gemini" className="w-7 h-7 rounded" />
              <span className="text-sm font-medium text-slate-600">Gemini Embedding 2</span>
            </a>
            <a href="https://insforge.dev" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 bg-slate-50 px-5 py-2.5 rounded-xl border border-slate-100 hover:border-teal-200 transition">
              <img src="https://insforge.dev/favicon.ico" alt="InsForge" className="w-7 h-7" />
              <span className="text-sm font-medium text-slate-600">InsForge BaaS</span>
            </a>
            {['GPT-4o Mini', 'pgvector', 'React + Vite', 'Deno Edge'].map((t) => (
              <span key={t} className="text-xs text-slate-500 font-medium bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-4 text-center text-[10px] text-slate-300 border-t border-slate-100">
        Built with{' '}
        <a href="https://insforge.dev" target="_blank" rel="noopener noreferrer" className="text-teal-400 hover:text-teal-500">InsForge</a>
        {' '}·{' '}
        <a href="https://ai.google.dev/gemini-api/docs/embeddings" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-500">Google Gemini</a>
      </footer>
    </div>
  );
}
