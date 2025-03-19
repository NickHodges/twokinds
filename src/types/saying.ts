export interface Saying {
  id: string;
  intro: string;
  type: string;
  firstKind: string;
  secondKind: string;
  userId: string;
  createdAt: Date;
  introText?: string;
  typeName?: string;
  intro_data?: {
    id: string;
    introText: string;
  };
  type_data?: {
    id: string;
    name: string;
  };
  user?: {
    id: string;
    name: string;
    email: string;
  };
  isLiked?: boolean;
  totalLikes?: number;
}
