export interface Saying {
  id: number;
  intro: number;
  type: number;
  firstKind: string;
  secondKind: string;
  userId: number;
  createdAt: Date;
  introText?: string;
  typeName?: string;
  intro_data?: {
    id: number;
    introText: string;
  };
  type_data?: {
    id: number;
    name: string;
  };
  user?: {
    id: number;
    name: string;
    email: string;
  };
  isLiked?: boolean;
  totalLikes?: number;
}

// Add more specific interfaces for form handling
export interface IntroType {
  id: number;
  introText: string;
  createdAt: Date;
}

export interface SayingType {
  id: number;
  name: string;
  createdAt: Date;
}

// Schema for creating a new saying
export interface CreateSayingInput {
  intro: number;
  type: number;
  firstKind: string;
  secondKind: string;
}
