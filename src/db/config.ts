import { defineDb, defineTable, column } from 'astro:db';

const Users = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    name: column.text(),
    email: column.text(),
    image: column.text(),
    role: column.text({ default: 'user' }),
    createdAt: column.date({ default: new Date() }),
  },
});

const Sayings = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    intro: column.text({ references: () => Intros.columns.id }),
    type: column.text({ references: () => Types.columns.id }),
    firstKind: column.text(),
    secondKind: column.text(),
    userId: column.text({ references: () => Users.columns.id }),
    createdAt: column.date({ default: new Date() }),
  },
});

const Intros = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    introText: column.text(),
    createdAt: column.date({ default: new Date() }),
  },
});

const Types = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    name: column.text(),
    createdAt: column.date({ default: new Date() }),
  },
});

const Likes = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    userId: column.text({ references: () => Users.columns.id }),
    sayingId: column.text({ references: () => Sayings.columns.id }),
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
