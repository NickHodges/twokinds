// This file is where you define your database schema
// You'll add your tables and columns here as needed

import { defineTable, column } from 'astro:db';

// Example minimal table structure - you'll replace this with your actual schema
export const ExampleTable = defineTable({
  id: column.number({ primaryKey: true, autoIncrement: true }),
  createdAt: column.date({ default: new Date() })
});