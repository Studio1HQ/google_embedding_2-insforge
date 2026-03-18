import { useState, useCallback } from 'react';
import UploadPanel from './components/UploadPanel';
import QueryPanel from './components/QueryPanel';
import { deleteAllEmbeddings, deleteEmbeddingsByDocument } from './api';

export interface UploadedItem {
  id: string;
  documentId?: string;
  fileName: string;
  type: 'text' | 'image';
  preview?: string;
  status: 'processing' | 'done' | 'error';
  error?: string;
}

export default function App() {
  const [items, setItems] = useState<UploadedItem[]>([]);
  const [chatKey, setChatKey] = useState(0); // increment to reset chat

  const addItem = (item: UploadedItem) => setItems((p) => [...p, item]);
  const updateItem = (id: string, u: Partial<UploadedItem>) =>
    setItems((p) => p.map((i) => (i.id === id ? { ...i, ...u } : i)));

  const removeItem = useCallback(async (id: string) => {
    const item = items.find((i) => i.id === id);
    if (item?.documentId) {
      try { await deleteEmbeddingsByDocument(item.documentId); } catch { /* ignore */ }
    }
    setItems((p) => p.filter((i) => i.id !== id));
  }, [items]);

  const clearAll = useCallback(async () => {
    try { await deleteAllEmbeddings(); } catch { /* ignore */ }
    setItems([]);
    setChatKey((k) => k + 1);
  }, []);

  const newChat = useCallback(() => {
    setChatKey((k) => k + 1);
  }, []);

  const readyCount = items.filter((i) => i.status === 'done').length;

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-md shadow-teal-200">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <div>
              <span className="text-sm font-bold text-slate-800">Multimodal RAG</span>
              <span className="text-[10px] text-slate-400 ml-2 hidden sm:inline">Gemini Embeddings · InsForge · GPT-4o Mini</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {readyCount > 0 && (
              <div className="flex items-center gap-1.5 bg-teal-50 text-teal-700 px-3 py-1 rounded-full text-xs font-semibold border border-teal-200">
                <div className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                {readyCount} indexed
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-[400px_1fr]">
        <div className="bg-white border-r border-slate-200/60 overflow-y-auto lg:h-[calc(100vh-56px)]">
          <UploadPanel
            items={items}
            addItem={addItem}
            updateItem={updateItem}
            removeItem={removeItem}
            clearAll={clearAll}
          />
        </div>
        <div className="flex flex-col lg:h-[calc(100vh-56px)] bg-slate-50">
          <QueryPanel key={chatKey} readyCount={readyCount} onNewChat={newChat} />
        </div>
      </main>
    </div>
  );
}
