// This file is where you define your database schema using Astro:DB

import { defineDb, defineTable, column } from 'astro:db';

/**
 * Users table - stores information about authenticated users
 */
const Users = defineTable({
  columns: {
    id: column.text({ primaryKey: true }), // Auth provider user ID
    name: column.text({ optional: true }),
    email: column.text({ optional: true }),
    image: column.text({ optional: true }),
    provider: column.text({ optional: true }), // 'github', 'google', etc.
    lastLogin: column.date({ default: new Date() }),
    createdAt: column.date({ default: new Date() }),
    updatedAt: column.date({ default: new Date() }),
    role: column.text({ default: 'user' }), // 'user', 'admin', etc.
    preferences: column.json({ optional: true }), // Store user preferences as JSON
  },
  indexes: {
    email_idx: { on: ['email'], unique: true },
  },
});

const Intros = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),
    introText: column.text({ optional: false }),
    createdAt: column.date({ default: new Date() }),
  },
});

const Leads = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),
    leadText: column.text({ optional: false }),
    createdAt: column.date({ default: new Date() }),
  },
});

const Sayings = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),
    firstLead: column.number({ references: () => Leads.columns.id }),
    secondLead: column.number({ references: () => Leads.columns.id }),
    firstKind: column.text({ optional: false }),
    secondKind: column.text({ optional: false }),
    intro: column.number({ references: () => Intros.columns.id }),
    createdAt: column.date({ default: new Date() }),
  },
});

/**
 * Likes table - tracks which users have liked which sayings
 */
const Likes = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),
    userId: column.text({ references: () => Users.columns.id }),
    sayingId: column.number({ references: () => Sayings.columns.id }),
    createdAt: column.date({ default: new Date() }),
  },
  indexes: {
    // Ensure a user can only like a saying once
    unique_like: { on: ['userId', 'sayingId'], unique: true },
  },
});

export default defineDb({
  tables: { Intros, Leads, Sayings, Users, Likes },
});
