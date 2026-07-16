/// <reference types="astro/client" />

import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { Database } from './lib/database.types';

declare global {
  namespace App {
    interface Locals {
      // Client Supabase authentifié, injecté par le middleware pour toute la requête.
      supabase: SupabaseClient<Database>;
      // Utilisateur connecté (null si visiteur public).
      user: User | null;
    }
  }
}

export {};
