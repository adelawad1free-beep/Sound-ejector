
export interface TranscriptionState {
  text: string;
  audioUrl: string | null;
  fileName: string | null;
  currentTime: number;
  duration: number;
  playbackRate: number;
  isPlaying: boolean;
}

export enum ExportType {
  PDF = 'PDF',
  WORD = 'WORD',
  TEXT = 'TEXT'
}
