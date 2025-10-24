import { defineDb, defineTable, column } from 'astro:db';

const Users = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }), // Updated to auto-incrementing integer
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

export default defineDb({
  tables: {
    Users,
    Intros,
    Types,
    Sayings,
    Likes,
    Logs,
  },
});
