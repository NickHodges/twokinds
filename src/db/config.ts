import { defineDb, defineTable, column } from 'astro:db';

const Users = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),
    name: column.text(),
    email: column.text(),
    image: column.text(),
    provider: column.text({ default: 'unknown' }),
    role: column.text({ default: 'user' }),
    lastLogin: column.date({ default: new Date() }),
    preferences: column.json({ default: {} }),
    createdAt: column.date({ default: new Date() }),
    updatedAt: column.date({ default: new Date() }),
  },
});

const Sayings = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),
    intro: column.number({ references: () => Intros.columns.id }),
    type: column.number({ references: () => Types.columns.id }),
    firstKind: column.text(),
    secondKind: column.text(),
    userId: column.number({ references: () => Users.columns.id }),
    createdAt: column.date({ default: new Date() }),
    updatedAt: column.date({ default: new Date() }),
  },
});

const Intros = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),
    introText: column.text(),
    createdAt: column.date({ default: new Date() }),
  },
});

const Types = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),
    name: column.text(),
    createdAt: column.date({ default: new Date() }),
  },
});

const Likes = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),
    userId: column.number({ references: () => Users.columns.id }),
    sayingId: column.number({ references: () => Sayings.columns.id }),
    createdAt: column.date({ default: new Date() }),
  },
});

export default defineDb({
  tables: {
    Users,
    Sayings,
    Intros,
    Types,
    Likes,
  },
});
