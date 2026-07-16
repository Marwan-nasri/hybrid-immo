import { createServerClient, parseCookieHeader } from '@supabase/ssr';
import type { AstroCookies } from 'astro';
import type { Database } from './database.types';

// Client Supabase AUTHENTIFIÉ côté serveur.
//
// Contrairement au client public (src/lib/supabase.ts, clé anon « nue »), celui-ci
// lit/écrit la session dans les cookies de la requête. Les requêtes partent donc
// avec le JWT de l'admin connecté → les policies RLS `authenticated` s'appliquent
// (accès complet au CRUD). On n'utilise jamais la service_role.
//
// À créer par requête (jamais en singleton) car il dépend des cookies courants.
export function creerClientServeur(request: Request, cookies: AstroCookies) {
  return createServerClient<Database>(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        // Toutes les cookies de la requête entrante.
        getAll() {
          return parseCookieHeader(request.headers.get('Cookie') ?? '').map((c) => ({
            name: c.name,
            value: c.value ?? '',
          }));
        },
        // Supabase nous demande d'écrire les cookies de session mis à jour.
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookies.set(name, value, options));
        },
      },
    },
  );
}
