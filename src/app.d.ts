// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
import { getDb } from '$lib/drizzle';
import { getLucia } from '$lib/auth';

declare global {
  namespace App {
    // interface Error {}
    interface Locals {
      db: ReturnType<typeof getDb>;
      lucia: ReturnType<typeof getLucia>;
      user: import('lucia').User | null;
      session: import('lucia').Session | null;
      startTime: number;
    }

    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}

export {};
