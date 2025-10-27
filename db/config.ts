import { defineDb, defineTable, column } from 'astro:db';

// Better Auth users table with string IDs
const AuthUsers = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    name: column.text(),
    email: column.text(),
    emailVerified: column.boolean({ default: false }),
    image: column.text({ optional: true }),
    createdAt: column.date(),
    updatedAt: column.date(),
  },
  indexes: {
    auth_email_idx: { on: ['email'], unique: true },
  },
});

// Application users table with numeric IDs (for app-specific data)
const Users = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }), // Updated to auto-incrementing integer
    authUserId: column.text({ optional: true }), // Link to Better Auth user
    name: column.text(),
    email: column.text(),
    image: column.text({ optional: true }),
    provider: column.text(),
    lastLogin: column.date(),
    createdAt: column.date(),
    updatedAt: column.date(),
    role: column.text(),
    preferences: column.json(),
  },
  indexes: {
    email_idx: { on: ['email'], unique: true },
    authUserId_idx: { on: ['authUserId'] },
  },
});

const Intros = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),
    introText: column.text(),
    createdAt: column.date(),
  },
});

const Types = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),
    name: column.text(),
    pronoun: column.text({ default: 'who' }), // 'who' for people, 'that' for things
    createdAt: column.date(),
  },
});

const Sayings = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),
    intro: column.number({ references: () => Intros.columns.id }),
    type: column.number({ references: () => Types.columns.id }),
    firstKind: column.text(),
    secondKind: column.text(),
    userId: column.number({ references: () => Users.columns.id }), // Updated to match Users.id type
    createdAt: column.date(),
  },
});

const Likes = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),
    userId: column.number({ references: () => Users.columns.id }), // Updated to match Users.id type
    sayingId: column.number({ references: () => Sayings.columns.id }),
    createdAt: column.date(),
  },
  indexes: {
    unique_like: { on: ['userId', 'sayingId'], unique: true },
  },
});

const Logs = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),
    level: column.text(), // 'debug', 'info', 'warn', 'error'
    context: column.text(), // Logger context like 'UserDB', 'Actions', etc.
    message: column.text(),
    metadata: column.json({ optional: true }), // Additional structured data
    createdAt: column.date(),
  },
  indexes: {
    level_idx: { on: ['level'] },
    context_idx: { on: ['context'] },
    created_at_idx: { on: ['createdAt'] },
  },
});

const RateLimits = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),
    identifier: column.text(), // User ID, IP address, or other identifier
    action: column.text(), // Action being rate limited (e.g., 'create_saying')
    count: column.number({ default: 0 }), // Number of actions in current window
    windowStart: column.date(), // When the current window started
    expiresAt: column.date(), // When this record expires
    createdAt: column.date(),
    updatedAt: column.date(),
  },
  indexes: {
    identifier_action_idx: { on: ['identifier', 'action'], unique: true },
    expires_at_idx: { on: ['expiresAt'] },
  },
});

// Better Auth required tables
const Sessions = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    userId: column.text(),
    token: column.text(),
    expiresAt: column.date(),
    ipAddress: column.text({ optional: true }),
    userAgent: column.text({ optional: true }),
    createdAt: column.date(),
    updatedAt: column.date(),
  },
  indexes: {
    session_token_idx: { on: ['token'], unique: true },
    session_userId_idx: { on: ['userId'] },
  },
});

const Accounts = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    userId: column.text(),
    accountId: column.text(),
    providerId: column.text(),
    accessToken: column.text({ optional: true }),
    refreshToken: column.text({ optional: true }),
    accessTokenExpiresAt: column.date({ optional: true }),
    refreshTokenExpiresAt: column.date({ optional: true }),
    scope: column.text({ optional: true }),
    idToken: column.text({ optional: true }),
    password: column.text({ optional: true }),
    createdAt: column.date(),
    updatedAt: column.date(),
  },
  indexes: {
    account_userId_idx: { on: ['userId'] },
    account_providerId_accountId_idx: { on: ['providerId', 'accountId'], unique: true },
  },
});

const Verifications = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    identifier: column.text(),
    value: column.text(),
    expiresAt: column.date(),
    createdAt: column.date(),
    updatedAt: column.date(),
  },
  indexes: {
    identifier_idx: { on: ['identifier'] },
  },
});

export default defineDb({
  tables: {
    AuthUsers,
    Users,
    Intros,
    Types,
    Sayings,
    Likes,
    Logs,
    RateLimits,
    Sessions,
    Accounts,
    Verifications,
  },
});
