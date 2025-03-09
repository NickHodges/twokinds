// This file is where you define your database schema

import { defineDb, defineTable, column } from 'astro:db';

/**
 * Intros table - contains introduction text for "Two Kinds of People"
 */
export const Intros = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),
    introText: column.text({ optional: false }),
    createdAt: column.date({ default: new Date() }),
  },
});

/**
 * Leads table - contains lead-in phrases for describing types of people
 */
export const Leads = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),
    leadText: column.text({ optional: false }),
    createdAt: column.date({ default: new Date() }),
  },
});

/**
 * Sayings table - contains complete "Two Kinds of People" statements
 * with references to intro text and descriptions of both kinds
 */
export const Sayings = defineTable({
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

export default defineDb({
  tables: { Intros, Leads, Sayings },
});
