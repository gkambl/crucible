export interface DetectionHit {
  type: string;                // category of detection
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;             // human-readable explanation
  value?: string;              // e.g. URL, email, etc.
  meta?: Record<string, any>;  // optional context
}

export interface AnalysisResult {
  verdict: 'BLOCK' | 'WARN' | 'ALLOW';
  riskScore: number;          // 0..100
  reasons: string[];
  sanitizedPreview: string;
  originalSize: number;
  analysisTime: number;
  detectionHits: DetectionHit[];
}

export interface RecentItem {
  id: string;
  timestamp: number;
  verdict: 'BLOCK' | 'WARN' | 'ALLOW';
  firstReason: string;
  filename?: string;
}

export interface AnalysisInput {
  content: string;
  filename?: string;
  mimeType?: string;
  size: number;
}

export interface AnalysisRequest {
  input: AnalysisInput;
  policy?: {
    allowDomains?: string[];
    allowSenders?: string[];
  };
}

export interface AnalysisResponse {
  success: boolean;
  result?: AnalysisResult;
  error?: string;
}
