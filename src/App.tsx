import React, { useEffect } from 'react';
import { Flame, Trash2 } from 'lucide-react';
import { DropZone } from './components/DropZone';
import { Result } from './components/Result';
import { Recent } from './components/Recent';
// import { analyzePhishyUrls } from "./analyzers/urlPhish"; // ← unused; remove
import { useAnalysis } from './hooks/useAnalysis';

function App() {
  const { result, isAnalyzing, recentItems, analyze, clearRecent, clearAll } = useAnalysis();

  // Auto-purge on page visibility change
  useEffect(() => {
    let hiddenTimeout: ReturnType<typeof setTimeout> | undefined;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        hiddenTimeout = setTimeout(() => {
          clearAll();
        }, 10 * 60 * 1000); // 10 minutes
      } else if (hiddenTimeout) {
        clearTimeout(hiddenTimeout);
      }
    };

    const handlePageHide = () => {
      clearAll();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      if (hiddenTimeout) clearTimeout(hiddenTimeout);
    };
  }, [clearAll]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        clearAll();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [clearAll]);

  return (
    <div className="min-h-screen bg-[#0b1020] flex items-center justify-center p-4">
      <div className="max-w-[760px] w-[92vw] mx-auto">
        <main
          className="bg-[#141a2a] rounded-2xl p-6 sm:p-8 shadow-xl border border-[#9bb0ff]/10"
          role="main"
        >
          {/* Header */}
          <header className="text-center mb-8">
            <div className="flex items-center justify-center space-x-3 mb-2">
              <div className="p-2 bg-[#0339b8]/10 rounded-lg">
                <Flame className="w-8 h-8 text-[#0339b8]" />
              </div>
              <h1 className="text-3xl font-bold text-[#d9e2ff]">Crucible</h1>
              <div className="px-2 py-1 bg-[#16a34a]/10 border border-[#16a34a]/20 rounded-full">
                <span className="text-xs font-medium text-[#16a34a]">local-first</span>
              </div>
            </div>
            <p className="text-[#9bb0ff] text-sm">
              Drop a file, paste text, or browse. Analysis runs locally.
            </p>
            <p className="text-[#9bb0ff]/50 text-xs mt-1">We never upload your data.</p>
          </header>

          {/* Drop Zone */}
          <div className="mb-8">
            <DropZone onAnalyze={analyze} isAnalyzing={isAnalyzing} />
          </div>

          {/* Results */}
          {result && (
            <div className="mb-8">
              <Result result={result} />
            </div>
          )}

          {/* Recent Items */}
          {recentItems.length > 0 && (
            <div className="mb-6">
              <Recent items={recentItems} onClear={clearRecent} />
            </div>
          )}

          {/* Erase All Button */}
          {(result || recentItems.length > 0) && (
            <div className="text-center pt-6 border-t border-[#9bb0ff]/10">
              <button
                onClick={clearAll}
                className="inline-flex items-center space-x-2 px-4 py-2 text-[#9bb0ff]/70 hover:text-[#ef4444] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#0339b8] rounded-lg"
              >
                <Trash2 className="w-4 h-4" />
                <span className="text-sm">Erase All</span>
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
