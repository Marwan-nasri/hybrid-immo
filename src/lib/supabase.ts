import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// Client Supabase PUBLIC (clé anon).
//
// Utilisé côté serveur (SSR) comme côté client pour tout ce qui est public :
// lecture du catalogue, insertion d'une demande. Les policies RLS de la base
// définissent ce qui est réellement autorisé — la clé anon n'ouvre aucun accès
// privilégié.
//
// ⚠️ Ne JAMAIS utiliser ici la SUPABASE_SERVICE_ROLE_KEY : elle contourne la RLS
// et doit rester confinée au code serveur (endpoints d'admin), dans un autre client.

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Variables manquantes : PUBLIC_SUPABASE_URL et/ou PUBLIC_SUPABASE_ANON_KEY. ' +
      'Copie .env.example vers .env et renseigne-les (dashboard Supabase → Settings → API).',
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
