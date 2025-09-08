import React, { useState } from 'react';
import { Copy, Shield, AlertTriangle, XCircle, Check } from 'lucide-react';
import { AnalysisResult } from '../types';

interface ResultProps {
  result: AnalysisResult;
}

export function Result({ result }: ResultProps) {
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  const getVerdictIcon = () => {
    switch (result.verdict) {
      case 'BLOCK': return <XCircle className="w-5 h-5" />;
      case 'WARN': return <AlertTriangle className="w-5 h-5" />;
      case 'ALLOW': return <Shield className="w-5 h-5" />;
    }
  };

  const getVerdictColors = () => {
    switch (result.verdict) {
      case 'BLOCK': return 'bg-[#ef4444] text-white';
      case 'WARN': return 'bg-[#f59e0b] text-white';
      case 'ALLOW': return 'bg-[#16a34a] text-white';
    }
  };

  const getRiskBarColor = () => {
    if (result.riskScore >= 80) return 'bg-[#ef4444]';
    if (result.riskScore >= 50) return 'bg-[#f59e0b]';
    return 'bg-[#16a34a]';
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(label);
      setTimeout(() => setCopySuccess(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const generateSanitizedSummary = () => {
    const summary = [
      `Verdict: ${result.verdict}`,
      `Risk Score: ${result.riskScore}/100`,
      `Analysis Time: ${result.analysisTime}ms`,
      `Original Size: ${result.originalSize} bytes`,
      '',
      'Reasons:',
      ...result.reasons.map(reason => `• ${reason}`),
      '',
      'Preview:',
      result.sanitizedPreview
    ].join('\n');
    
    return summary;
  };

  const generateIndicators = () => {
    return result.detectionHits.map(hit => 
      `${hit.label} (severity: ${hit.severity}): ${hit.snippet}`
    ).join('\n');
  };

  return (
    <div className="w-full space-y-6" role="region" aria-label="Analysis Results">
      {/* Verdict and Risk Score */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className={`
            inline-flex items-center space-x-2 px-4 py-2 rounded-full font-medium text-sm
            ${getVerdictColors()}
          `}>
            {getVerdictIcon()}
            <span>{result.verdict}</span>
          </div>
          
          <div className="text-right">
            <div className="text-2xl font-bold text-[#d9e2ff]">{result.riskScore}</div>
            <div className="text-xs text-[#9bb0ff]">Risk Score</div>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-[#9bb0ff]">Risk Level</span>
            <span className="text-[#d9e2ff]">{result.riskScore}/100</span>
          </div>
          <div className="w-full bg-[#0b1020] rounded-full h-2 overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${getRiskBarColor()}`}
              style={{ width: `${result.riskScore}%` }}
            />
          </div>
        </div>
      </div>

      {/* Reasons */}
      {result.reasons.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-[#d9e2ff]">Detection Reasons</h4>
          <ul className="space-y-2">
            {result.reasons.map((reason, index) => (
              <li key={index} className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-[#9bb0ff] rounded-full mt-2 flex-shrink-0" />
                <span className="text-[#9bb0ff] text-sm leading-relaxed">{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Sanitized Preview */}
      <div className="space-y-3">
        <h4 className="font-medium text-[#d9e2ff]">Sanitized Preview</h4>
        <div className="bg-[#0b1020] rounded-lg p-4 border border-[#9bb0ff]/10">
          <pre className="text-sm text-[#9bb0ff] whitespace-pre-wrap break-words font-mono">
            {result.sanitizedPreview}
          </pre>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => copyToClipboard(generateSanitizedSummary(), 'summary')}
          className="flex items-center justify-center space-x-2 px-4 py-2 bg-[#0339b8] hover:bg-[#3f6af6] text-white rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#0339b8] focus:ring-offset-2 focus:ring-offset-[#141a2a]"
        >
          <Copy className="w-4 h-4" />
          <span>Copy Sanitized Summary</span>
          {copySuccess === 'summary' && <Check className="w-4 h-4" />}
        </button>
        
        <button
          onClick={() => copyToClipboard(generateIndicators(), 'indicators')}
          className="flex items-center justify-center space-x-2 px-4 py-2 bg-[#141a2a] hover:bg-[#9bb0ff]/10 border border-[#9bb0ff]/20 text-[#9bb0ff] rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#0339b8] focus:ring-offset-2 focus:ring-offset-[#141a2a]"
        >
          <Copy className="w-4 h-4" />
          <span>Copy Indicators</span>
          {copySuccess === 'indicators' && <Check className="w-4 h-4" />}
        </button>
      </div>

      {/* Analysis Metadata */}
      <div className="flex justify-between text-xs text-[#9bb0ff]/70 pt-4 border-t border-[#9bb0ff]/10">
        <span>Analysis time: {result.analysisTime}ms</span>
        <span>Size: {result.originalSize} bytes</span>
      </div>
    </div>
  );
}