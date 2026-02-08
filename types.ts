
import type { ReactElement } from 'react';

export interface Tool {
  id: string;
  name: string;
  icon: ReactElement<any>;
  description: string;
  color: string;
  subTools?: SubTool[];
}

export interface SubTool {
    id: string;
    name: string;
    description: string;
}

export interface ProcessedFile {
  id: number;
  name: string;
  operation: string;
  blob: Blob;
  timestamp: Date;
}

export interface Position {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PageEditState {
  id: string; // Unique ID for drag and drop key
  originalPageNumber: number; // 1-based index from original doc
  rotation: number;   // 0, 90, 180, 270...
  isDeleted: boolean;
}
