import { defineDb, defineTable, column } from 'astro:db';

// Define the database configuration
const dbConfig = {
  tables: {
    Users: defineTable({
      columns: {
        id: column.number({ primaryKey: true }),
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
    }),

    Intros: defineTable({
      columns: {
        id: column.number({ primaryKey: true, autoIncrement: true }),
        introText: column.text(),
        createdAt: column.date(),
      },
    }),

    Types: defineTable({
      columns: {
        id: column.number({ primaryKey: true, autoIncrement: true }),
        name: column.text(),
        createdAt: column.date(),
      },
    }),

    Sayings: defineTable({
      columns: {
        id: column.number({ primaryKey: true, autoIncrement: true }),
        intro: column.number({ references: () => dbConfig.tables.Intros.columns.id }),
        type: column.number({ references: () => dbConfig.tables.Types.columns.id }),
        firstKind: column.text(),
        secondKind: column.text(),
        userId: column.number({ references: () => dbConfig.tables.Users.columns.id }),
        createdAt: column.date(),
      },
    }),

    Likes: defineTable({
      columns: {
        id: column.number({ primaryKey: true, autoIncrement: true }),
        userId: column.number({ references: () => dbConfig.tables.Users.columns.id }),
        sayingId: column.number({ references: () => dbConfig.tables.Sayings.columns.id }),
        createdAt: column.date(),
      },
      indexes: {
        unique_like: { on: ['userId', 'sayingId'], unique: true },
      },
    }),
  },
};

export default defineDb(dbConfig);
