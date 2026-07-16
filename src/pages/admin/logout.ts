import type { APIRoute } from 'astro';

// Déconnexion : efface la session (cookies) puis renvoie vers la page de login.
export const POST: APIRoute = async ({ locals, redirect }) => {
  await locals.supabase.auth.signOut();
  return redirect('/admin/login');
};
