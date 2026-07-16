import type { APIRoute } from 'astro';

const BUCKET = 'photos-appartements';

// Extrait le chemin Storage depuis une URL publique Supabase.
// .../storage/v1/object/public/photos-appartements/<chemin>  →  <chemin>
function cheminDepuisUrl(url: string): string | null {
  const marqueur = `/object/public/${BUCKET}/`;
  const i = url.indexOf(marqueur);
  return i === -1 ? null : url.slice(i + marqueur.length);
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Récupère les photos actuelles de l'appartement (client authentifié → RLS).
async function photosActuelles(supabase: App.Locals['supabase'], id: string) {
  const { data, error } = await supabase
    .from('appartements')
    .select('photos')
    .eq('id', id)
    .maybeSingle();
  if (error || !data) return null;
  return data.photos;
}

// POST : upload d'un fichier (déjà compressé côté client) → ajoute à la fin.
export const POST: APIRoute = async ({ params, request, locals }) => {
  const id = params.id!;
  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return json({ error: 'Fichier manquant.' }, 400);
  if (!file.type.startsWith('image/')) return json({ error: 'Le fichier doit être une image.' }, 400);
  if (file.size > 8 * 1024 * 1024) return json({ error: 'Image trop lourde (max 8 Mo).' }, 400);

  const actuelles = await photosActuelles(locals.supabase, id);
  if (actuelles === null) return json({ error: 'Appartement introuvable.' }, 404);

  const ext = file.type === 'image/webp' ? 'webp' : file.type.split('/')[1] || 'bin';
  const chemin = `${id}/${crypto.randomUUID()}.${ext}`;

  const { error: upErr } = await locals.supabase.storage
    .from(BUCKET)
    .upload(chemin, file, { contentType: file.type, upsert: false });
  if (upErr) return json({ error: 'Échec de l’upload : ' + upErr.message }, 500);

  const { data: pub } = locals.supabase.storage.from(BUCKET).getPublicUrl(chemin);
  const nouvelles = [...actuelles, pub.publicUrl];

  const { error: majErr } = await locals.supabase
    .from('appartements')
    .update({ photos: nouvelles })
    .eq('id', id);
  if (majErr) return json({ error: 'Échec de l’enregistrement : ' + majErr.message }, 500);

  return json({ photos: nouvelles });
};

// DELETE : { url } → supprime du tableau ET du Storage.
export const DELETE: APIRoute = async ({ params, request, locals }) => {
  const id = params.id!;
  const { url } = (await request.json().catch(() => ({}))) as { url?: string };
  if (!url) return json({ error: 'URL manquante.' }, 400);

  const actuelles = await photosActuelles(locals.supabase, id);
  if (actuelles === null) return json({ error: 'Appartement introuvable.' }, 404);
  if (!actuelles.includes(url)) return json({ error: 'Photo inconnue.' }, 400);

  const nouvelles = actuelles.filter((u) => u !== url);
  const { error: majErr } = await locals.supabase
    .from('appartements')
    .update({ photos: nouvelles })
    .eq('id', id);
  if (majErr) return json({ error: majErr.message }, 500);

  // Suppression du fichier Storage (best-effort : on ne bloque pas la réponse).
  const chemin = cheminDepuisUrl(url);
  if (chemin) {
    const { data: retires, error: rmErr } = await locals.supabase.storage.from(BUCKET).remove([chemin]);
    if (rmErr) console.error('[photos] remove:', rmErr.message);
    else if (!retires || retires.length === 0)
      console.warn('[photos] remove n’a supprimé aucun fichier (policy SELECT manquante ?):', chemin);
  }

  return json({ photos: nouvelles });
};

// PUT : { photos } → réordonne (ex. définir la photo principale). On vérifie que
// le nouvel ordre contient exactement le même ensemble d'URLs (pas d'injection).
export const PUT: APIRoute = async ({ params, request, locals }) => {
  const id = params.id!;
  const { photos } = (await request.json().catch(() => ({}))) as { photos?: string[] };
  if (!Array.isArray(photos)) return json({ error: 'Format invalide.' }, 400);

  const actuelles = await photosActuelles(locals.supabase, id);
  if (actuelles === null) return json({ error: 'Appartement introuvable.' }, 404);

  const memeEnsemble =
    photos.length === actuelles.length && [...photos].sort().join() === [...actuelles].sort().join();
  if (!memeEnsemble) return json({ error: 'Liste de photos invalide.' }, 400);

  const { error } = await locals.supabase.from('appartements').update({ photos }).eq('id', id);
  if (error) return json({ error: error.message }, 500);

  return json({ photos });
};
