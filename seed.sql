-- This is a SQL script to populate the Astro DB database with sample data
-- Run this script after starting the dev server with: sqlite3 .astro/db.sqlite < seed.sql

-- Clear existing data
DELETE FROM "Sayings";
DELETE FROM "Likes";
DELETE FROM "Types";
DELETE FROM "Intros";
DELETE FROM "Users";

-- Insert system user
INSERT INTO "Users" ("id", "name", "email", "provider", "role", "lastLogin", "createdAt", "updatedAt", "preferences")
VALUES (1, 'System', 'system@twokindsof.com', 'system', 'system', datetime('now'), datetime('now'), datetime('now'), '{}');

-- Insert intros
INSERT INTO "Intros" ("id", "introText", "createdAt")
VALUES 
  (1, 'There are two kinds of', datetime('now')),
  (2, 'In this world, there are two kinds of', datetime('now')),
  (3, 'You can divide everything into two kinds of', datetime('now'));

-- Insert types
INSERT INTO "Types" ("id", "name", "createdAt")
VALUES 
  (1, 'people', datetime('now')),
  (2, 'dogs', datetime('now')),
  (3, 'refrigerators', datetime('now'));

-- Insert sayings
INSERT INTO "Sayings" ("intro", "type", "firstKind", "secondKind", "userId", "createdAt", "updatedAt")
VALUES 
  (1, 1, 'eat pizza with a fork', 'eat pizza with their hands', 1, datetime('now'), datetime('now')),
  (2, 2, 'bark at everything', 'are quiet and observant', 1, datetime('now'), datetime('now')),
  (3, 3, 'have ice makers', 'don''t have ice makers', 1, datetime('now'), datetime('now'));