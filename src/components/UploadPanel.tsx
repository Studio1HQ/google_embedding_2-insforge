import { useState, useRef, useCallback } from 'react';
import type { UploadedItem } from '../App';
import { uploadAndProcess, processEmbedding, createDocument } from '../api';

interface Props {
  items: UploadedItem[];
  addItem: (item: UploadedItem) => void;
  updateItem: (id: string, u: Partial<UploadedItem>) => void;
  removeItem: (id: string) => void;
  clearAll: () => void;
  userId: string;
  accessToken: string;
}

export default function UploadPanel({
  items, addItem, updateItem, removeItem, clearAll,
  userId, accessToken,
}: Props) {
  const [textInput, setTextInput] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const submitText = async () => {
    const t = textInput.trim();
    if (!t || busy) return;
    const id = crypto.randomUUID();
    addItem({ id, fileName: t.slice(0, 50) + (t.length > 50 ? '…' : ''), type: 'text', status: 'processing' });
    setTextInput('');
    setBusy(true);
    try {
      // Create document record owned by the current user
      const docId = await createDocument('', 'text/plain', userId, accessToken);
      // Store embedding tagged with this user's id
      await processEmbedding({ document_id: docId, text: t, user_id: userId }, accessToken);
      updateItem(id, { status: 'done', documentId: docId });
    } catch (e) {
      updateItem(id, { status: 'error', error: e instanceof Error ? e.message : 'Failed' });
    } finally {
      setBusy(false);
    }
  };

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      const id = crypto.randomUUID();
      const preview = URL.createObjectURL(file);
      addItem({ id, fileName: file.name, type: 'image', preview, status: 'processing' });
      try {
        // Upload to user-namespaced storage path, create document + embedding with user_id
        const result = await uploadAndProcess(file, userId, accessToken);
        updateItem(id, { status: 'done', documentId: result.documentId });
      } catch (e) {
        updateItem(id, { status: 'error', error: e instanceof Error ? e.message : 'Failed' });
      }
    }
  }, [addItem, updateItem, userId, accessToken]);

  const doneCount = items.filter((i) => i.status === 'done').length;

  return (
    <div className="p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="w-6 h-6 rounded-md bg-teal-500 flex items-center justify-center">
              <span className="text-[10px] font-bold text-white">1</span>
            </div>
            <h2 className="text-sm font-bold text-slate-800">Add Content</h2>
          </div>
          <p className="text-xs text-slate-400 ml-8">Upload text or images to build your knowledge base</p>
        </div>
        {items.length > 0 && (
          <button
            onClick={clearAll}
            className="text-[10px] text-red-400 hover:text-red-500 font-medium px-2 py-1 rounded-md hover:bg-red-50 transition"
            title="Clear all content"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Text Input */}
      <div>
        <label className="text-xs font-medium text-slate-500 mb-1.5 block">Text</label>
        <textarea
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          placeholder="Paste or type any text content…"
          rows={3}
          className="w-full border border-slate-200 rounded-xl px-3.5 py-3 text-sm text-slate-700 placeholder-slate-300 resize-none outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition"
        />
        <button
          onClick={submitText}
          disabled={!textInput.trim() || busy}
          className="mt-2 w-full py-2.5 rounded-xl text-sm font-semibold transition-all bg-teal-600 text-white hover:bg-teal-700 shadow-md shadow-teal-200 hover:shadow-teal-300 disabled:bg-slate-100 disabled:text-slate-300 disabled:shadow-none disabled:cursor-not-allowed"
        >
          {busy ? 'Processing…' : 'Add Text'}
        </button>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-slate-100" />
        <span className="text-[10px] text-slate-300 font-medium">OR</span>
        <div className="flex-1 h-px bg-slate-100" />
      </div>

      {/* Image Upload */}
      <div>
        <label className="text-xs font-medium text-slate-500 mb-1.5 block">Images</label>
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false); }}
          onDrop={(e) => { e.preventDefault(); setIsDragOver(false); if (e.dataTransfer.files) handleFiles(e.dataTransfer.files); }}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
            isDragOver ? 'border-teal-400 bg-teal-50/50' : 'border-slate-200 hover:border-teal-300 hover:bg-teal-50/30'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center mx-auto mb-2">
            <svg className="w-5 h-5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-500">Drop images or click to browse</p>
          <p className="text-[10px] text-slate-300 mt-0.5">PNG, JPG, WEBP</p>
        </div>
        <input ref={fileRef} type="file" multiple accept="image/*" onChange={(e) => { if (e.target.files) handleFiles(e.target.files); e.target.value = ''; }} className="hidden" />
      </div>

      {/* Uploaded Items */}
      {items.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Uploaded</span>
            {doneCount > 0 && (
              <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                {doneCount} ready
              </span>
            )}
          </div>
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className={`group flex items-center gap-3 rounded-xl p-2.5 transition-all animate-fade-in ${
                  item.status === 'done' ? 'bg-emerald-50/50 border border-emerald-200/50' :
                  item.status === 'error' ? 'bg-red-50/50 border border-red-200/50' :
                  'bg-slate-50 border border-slate-100'
                }`}
              >
                {item.type === 'image' && item.preview ? (
                  <img src={item.preview} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0 shadow-sm" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
                    </svg>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-700 truncate">{item.fileName}</p>
                  <p className={`text-[10px] ${
                    item.status === 'done' ? 'text-emerald-500' :
                    item.status === 'error' ? 'text-red-400' :
                    'text-slate-400'
                  }`}>
                    {item.status === 'processing' ? 'Processing…' : item.status === 'done' ? '✓ Ready' : 'Failed'}
                  </p>
                </div>
                {item.status === 'processing' ? (
                  <div className="w-4 h-4 border-2 border-teal-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                    className="w-6 h-6 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-50 text-slate-300 hover:text-red-400 transition-all flex-shrink-0"
                    title="Remove"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>

          {doneCount > 0 && doneCount === items.length && (
            <div className="mt-3 p-3 rounded-xl bg-teal-50 border border-teal-100 text-center">
              <p className="text-xs font-semibold text-teal-700">✨ All content indexed!</p>
              <p className="text-[10px] text-teal-500 mt-0.5">Ask questions in the chat →</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
