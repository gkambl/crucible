import React, { useCallback, useState } from 'react';
import { Upload, FileText, AlertTriangle } from 'lucide-react';
import { validateFile, extractTextContent } from '../utils/fileValidation';

interface DropZoneProps {
  onAnalyze: (content: string, filename?: string, size?: number) => void;
  isAnalyzing: boolean;
}

export function DropZone({ onAnalyze, isAnalyzing }: DropZoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    setError(null);
    
    const fileArray = Array.from(files);
    
    for (const file of fileArray) {
      const validation = validateFile(file);
      if (!validation.valid) {
        setError(validation.error || 'Invalid file');
        return;
      }
      
      try {
        const content = await extractTextContent(file);
        onAnalyze(content, file.name, file.size);
      } catch (err) {
        setError('Failed to read file content');
      }
    }
  }, [onAnalyze]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.currentTarget === e.target) {
      setIsDragActive(false);
    }
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      handleFiles(e.target.files);
    }
  }, [handleFiles]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text');
    if (text.trim()) {
      onAnalyze(text.trim(), undefined, new Blob([text]).size);
    }
  }, [onAnalyze]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && !isAnalyzing) {
      e.preventDefault();
      (e.currentTarget as HTMLElement).click();
    }
  }, [isAnalyzing]);

  return (
    <div className="w-full">
      <div
        className={`
          relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 cursor-pointer
          focus:outline-none focus:ring-2 focus:ring-[#0339b8] focus:border-transparent
          ${isDragActive 
            ? 'border-[#0339b8] bg-[#0339b8]/5' 
            : 'border-[#9bb0ff]/30 hover:border-[#9bb0ff]/50 hover:bg-[#9bb0ff]/5'
          }
          ${isAnalyzing ? 'opacity-50 pointer-events-none' : ''}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onPaste={handlePaste}
        onClick={() => document.getElementById('fileInput')?.click()}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-label="Drop files, paste content, or browse to analyze"
      >
        <input
          id="fileInput"
          type="file"
          multiple
          accept=".txt,.log,.md,.csv,.json,.jsonl,.html,.eml,.pdf"
          className="hidden"
          onChange={handleFileInput}
          disabled={isAnalyzing}
        />
        
        <div className="flex flex-col items-center space-y-4">
          {isAnalyzing ? (
            <div className="animate-spin w-12 h-12 border-2 border-[#0339b8] border-t-transparent rounded-full" />
          ) : (
            <div className={`p-3 rounded-full transition-colors ${
              isDragActive ? 'bg-[#0339b8] text-white' : 'bg-[#9bb0ff]/10 text-[#9bb0ff]'
            }`}>
              <Upload className="w-8 h-8" />
            </div>
          )}
          
          <div>
            <h3 className="text-lg font-medium text-[#d9e2ff] mb-2">
              {isAnalyzing ? 'Analyzing...' : 'Drag & drop / Paste / Browse'}
            </h3>
            <p className="text-[#9bb0ff] text-sm">
              Analysis runs locally on your device
            </p>
          </div>
          
          <div className="flex items-center space-x-2 text-xs text-[#9bb0ff]/70">
            <FileText className="w-4 h-4" />
            <span>txt, log, md, csv, json, html, eml, pdf</span>
          </div>
        </div>
      </div>
      
      {error && (
        <div className="mt-4 p-3 bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-lg flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 text-[#ef4444] flex-shrink-0" />
          <span className="text-[#ef4444] text-sm">{error}</span>
        </div>
      )}
      
      <div className="mt-4 text-xs text-[#9bb0ff]/50 text-center">
        Not a malware scanner. Heuristic content inspection only.
      </div>
    </div>
  );
}