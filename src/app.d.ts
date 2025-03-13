// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
import { getDb } from '$lib/drizzle';
import { initializeLucia } from '$lib/auth';

declare global {
  namespace App {
    // interface Error {}
    interface Locals {
      db: ReturnType<typeof getDb>;
      lucia: ReturnType<typeof initializeLucia>;
      user: import('lucia').User | null;
      session: import('lucia').Session | null;
    }
    // interface PageData {}
    // interface PageState {}
    interface Platform {
      env: {
        geometa_kv: KVNamespace;
        db: Hyperdrive;
      };
    }
  }
}

export {};
