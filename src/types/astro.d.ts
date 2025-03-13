import type { ExtendedSession } from '../env';
import type { Users } from 'astro:db';

declare global {
  namespace App {
    interface Locals {
      session: ExtendedSession | null;
      dbUser: Users | null;
    }
  }
}

export {};
