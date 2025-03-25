export interface DBUser {
  id: string;
  name: string;
  email: string;
  image: string;
  role: string;
  createdAt: Date;
}

export interface DBSaying {
  id: string;
  intro: string;
  type: string;
  firstKind: string;
  secondKind: string;
  userId: string;
  createdAt: Date;
}

export interface DBIntro {
  id: string;
  introText: string;
  createdAt: Date;
}

export interface DBType {
  id: string;
  name: string;
  createdAt: Date;
}

export interface DBLike {
  id: string;
  userId: string;
  sayingId: string;
  createdAt: Date;
}
