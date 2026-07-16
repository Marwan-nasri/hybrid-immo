import { defineMiddleware } from 'astro:middleware';
import { creerClientServeur } from './lib/supabase-server';

// Le middleware s'exécute pour CHAQUE requête, avant le rendu de la page.
export const onRequest = defineMiddleware(async (context, next) => {
  const { request, cookies, url, locals, redirect } = context;

  // Client authentifié disponible partout via Astro.locals.supabase.
  const supabase = creerClientServeur(request, cookies);
  locals.supabase = supabase;

  // getUser() revalide le JWT auprès de Supabase (fiable, contrairement à getSession()).
  const {
    data: { user },
  } = await supabase.auth.getUser();
  locals.user = user;

  const path = url.pathname;
  const estZoneAdmin = path.startsWith('/admin');
  const estLogin = path === '/admin/login';

  // Protection : toute page /admin/* (sauf /admin/login) exige une session.
  if (estZoneAdmin && !estLogin && !user) {
    return redirect('/admin/login');
  }

  // Confort : si déjà connecté, on saute la page de login.
  if (estLogin && user) {
    return redirect('/admin');
  }

  return next();
});
