export interface DBUser {
  id: number;
  name: string;
  email: string;
  image: string | null;
  role: string;
  createdAt: Date;
  provider: string;
  lastLogin: Date;
  updatedAt: Date;
  preferences: unknown;
}

export interface DBSaying {
  id: number;
  intro: number;
  type: number;
  firstKind: string;
  secondKind: string;
  userId: number;
  createdAt: Date;
}

export interface DBIntro {
  id: number;
  introText: string;
  createdAt: Date;
}

export interface DBType {
  id: number;
  name: string;
  createdAt: Date;
}

export interface DBLike {
  id: number;
  userId: number;
  sayingId: number;
  createdAt: Date;
}
