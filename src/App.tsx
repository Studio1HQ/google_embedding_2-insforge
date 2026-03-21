import { useState, useCallback, useEffect } from 'react';
import { useAuth, useUser } from '@insforge/react';
import LandingPage from './components/LandingPage';
import UploadPanel from './components/UploadPanel';
import QueryPanel from './components/QueryPanel';
import { deleteAllEmbeddings, deleteEmbeddingsByDocument } from './api';
import { insforge } from './lib/insforge';

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
  const { isLoaded, isSignedIn, signOut } = useAuth();
  const { user } = useUser();

  // Persist inApp state across OAuth redirects
  const [inApp, setInApp] = useState(() => sessionStorage.getItem('inApp') === 'true');
  const [items, setItems] = useState<UploadedItem[]>([]);
  const [chatKey, setChatKey] = useState(0);

  // Live access token — refreshed from session on mount and when auth state changes
  const [accessToken, setAccessToken] = useState('');

  // Load access token from the active session
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    insforge.auth.getCurrentSession().then(({ data }: any) => {
      const token = data?.session?.accessToken ?? '';
      setAccessToken(token);
    }).catch(() => {});
  }, [isLoaded, isSignedIn]);

  // Auto-enter app after OAuth redirect sets sessionStorage
  useEffect(() => {
    if (isLoaded && isSignedIn && sessionStorage.getItem('inApp') === 'true') {
      setInApp(true);
    }
  }, [isLoaded, isSignedIn]);

  const enterApp = useCallback(() => {
    sessionStorage.setItem('inApp', 'true');
    setInApp(true);
  }, []);

  const leaveApp = useCallback(() => {
    sessionStorage.removeItem('inApp');
    setInApp(false);
  }, []);

  const handleSignOut = useCallback(async () => {
    await signOut();
    sessionStorage.removeItem('inApp');
    setInApp(false);
    setItems([]);
    setChatKey(0);
    setAccessToken('');
  }, [signOut]);

  const addItem = (item: UploadedItem) => setItems((p) => [...p, item]);
  const updateItem = (id: string, u: Partial<UploadedItem>) =>
    setItems((p) => p.map((i) => (i.id === id ? { ...i, ...u } : i)));

  const removeItem = useCallback(async (id: string) => {
    const item = items.find((i) => i.id === id);
    if (item?.documentId && accessToken) {
      try { await deleteEmbeddingsByDocument(item.documentId, accessToken); } catch { /* ignore */ }
    }
    setItems((p) => p.filter((i) => i.id !== id));
  }, [items, accessToken]);

  const clearAll = useCallback(async () => {
    if (accessToken) {
      try { await deleteAllEmbeddings(accessToken); } catch { /* ignore */ }
    }
    setItems([]);
    setChatKey((k) => k + 1);
  }, [accessToken]);

  const newChat = useCallback(() => {
    setChatKey((k) => k + 1);
  }, []);

  const readyCount = items.filter((i) => i.status === 'done').length;

  // Loading state
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-200 animate-pulse">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <p className="text-sm text-slate-400 font-medium">Loading…</p>
        </div>
      </div>
    );
  }

  // Landing page — always shown first, or when navigating back
  if (!inApp || !isSignedIn) {
    return (
      <LandingPage
        onEnterApp={enterApp}
        isSignedIn={!!isSignedIn}
        userEmail={user?.email}
        onSignOut={handleSignOut}
      />
    );
  }

  // App view — signed in + inApp
  // Don't render the app until we have a valid access token
  if (!accessToken) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-200 animate-pulse">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <p className="text-sm text-slate-400 font-medium">Loading session…</p>
        </div>
      </div>
    );
  }

  const userId = user?.id ?? '';
  const displayName = user?.profile?.name || user?.email || '';
  const initials = displayName ? displayName.charAt(0).toUpperCase() : '?';

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-5 h-14 flex items-center justify-between">
          {/* Logo — click to go back to landing */}
          <button onClick={leaveApp} className="flex items-center gap-2.5 group" title="Back to Home">
            <img src="/insforge-wordmark.svg" alt="InsForge" className="h-5 w-auto group-hover:opacity-70 transition" />
            <span className="text-[10px] text-slate-400 hidden sm:inline">← Home</span>
          </button>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {readyCount > 0 && (
              <div className="flex items-center gap-1.5 bg-teal-50 text-teal-700 px-3 py-1 rounded-full text-xs font-semibold border border-teal-200">
                <div className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                {readyCount} indexed
              </div>
            )}

            {/* User badge */}
            <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                {initials}
              </div>
              <span className="text-xs text-slate-600 font-medium hidden sm:block max-w-[120px] truncate">
                {displayName}
              </span>
            </div>

            {/* Sign Out */}
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-500 font-medium px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition"
              title="Sign out"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
              </svg>
              <span className="hidden sm:inline">Sign out</span>
            </button>
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
            userId={userId}
            accessToken={accessToken}
          />
        </div>
        <div className="flex flex-col lg:h-[calc(100vh-56px)] bg-slate-50">
          <QueryPanel
            key={chatKey}
            readyCount={readyCount}
            onNewChat={newChat}
            accessToken={accessToken}
          />
        </div>
      </main>
    </div>
  );
}
