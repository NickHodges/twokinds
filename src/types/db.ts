export interface DBUser {
  id: string;
  name: string;
  email: string;
  image: string;
  role: string;
  createdAt: Date;
}

export interface DBSaying {
  id: number;
  intro: number;
  type: number;
  firstKind: string;
  secondKind: string;
  userId: string;
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
  id: string;
  userId: string;
  sayingId: string;
  createdAt: Date;
}
