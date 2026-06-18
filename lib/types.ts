export interface AnalysisEntry {
  id: string;
  timestamp: number;
  thumbnail: string;
  analysis: string;
  source: "image" | "figma";
  figmaUrl?: string;
  filename?: string;
}

export type Tab = "image" | "figma";
