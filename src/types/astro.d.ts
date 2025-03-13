import type { ExtendedSession } from '../env';
import type { Users } from 'astro:db';

declare namespace App {
  interface Locals {
    session: ExtendedSession | null;
    dbUser: Users | null;
  }
}
