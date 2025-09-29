export interface Message {
  id: string | number;
  sender: 'user' | 'ai';
  content: string;
  timestamp?: Date | string;
  codeSnippet?: {
    code: string;
    language: string;
    editable: boolean;
  };
  quiz?: {
    question: string;
    options: string[];
    correctAnswer: number;
  }[];
  imageUrl?: string;
  visualData?: {
    type: '3d' | 'chart' | 'diagram';
    data: any;
  };
  achievements?: string[];
  pointsEarned?: number;
  topic?: string;
  mermaidChart?: string;
}