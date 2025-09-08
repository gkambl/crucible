import React from 'react';
import { Clock, Shield, AlertTriangle, XCircle } from 'lucide-react';
import { RecentItem } from '../types';

interface RecentProps {
  items: RecentItem[];
  onClear: () => void;
}

export function Recent({ items, onClear }: RecentProps) {
  if (items.length === 0) return null;

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const getVerdictIcon = (verdict: 'BLOCK' | 'WARN' | 'ALLOW') => {
    switch (verdict) {
      case 'BLOCK': return <XCircle className="w-4 h-4 text-[#ef4444]" />;
      case 'WARN': return <AlertTriangle className="w-4 h-4 text-[#f59e0b]" />;
      case 'ALLOW': return <Shield className="w-4 h-4 text-[#16a34a]" />;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-[#9bb0ff]" />
          <h4 className="font-medium text-[#d9e2ff]">Recent</h4>
        </div>
        <button
          onClick={onClear}
          className="text-xs text-[#9bb0ff] hover:text-[#d9e2ff] transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-[#0339b8] rounded px-2 py-1"
        >
          Clear
        </button>
      </div>
      
      <div className="space-y-2">
        {items.slice(0, 5).map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between p-3 bg-[#0b1020] rounded-lg border border-[#9bb0ff]/10 hover:border-[#9bb0ff]/20 transition-colors duration-200"
          >
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              {getVerdictIcon(item.verdict)}
              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-2 text-sm">
                  <span className="text-[#9bb0ff] text-xs">{formatTime(item.timestamp)}</span>
                  <span className="text-[#9bb0ff]/50">•</span>
                  <span className="text-[#d9e2ff] font-medium">{item.verdict}</span>
                  {item.filename && (
                    <>
                      <span className="text-[#9bb0ff]/50">•</span>
                      <span className="text-[#9bb0ff] text-xs truncate">{item.filename}</span>
                    </>
                  )}
                </div>
                <p className="text-xs text-[#9bb0ff]/80 truncate mt-1">
                  {item.firstReason}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}