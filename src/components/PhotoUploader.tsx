import { useRef, useState } from 'react';
import imageCompression from 'browser-image-compression';

interface Props {
  appartementId: string;
  photosInitiales: string[];
}

// Îlot React : gère les photos d'un appartement (upload, suppression, ordre).
// La compression se fait ICI, dans le navigateur (WebP, ~1600px, ~300 Ko cible),
// avant d'envoyer le fichier allégé à l'endpoint serveur qui écrit dans Storage.
export default function PhotoUploader({ appartementId, photosInitiales }: Props) {
  const [photos, setPhotos] = useState<string[]>(photosInitiales);
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const base = `/admin/appartements/${appartementId}/photos`;

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setErreur(null);
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        const compresse = await imageCompression(file, {
          maxSizeMB: 0.3,
          maxWidthOrHeight: 1600,
          useWebWorker: true,
          fileType: 'image/webp',
        });
        const fd = new FormData();
        const nom = (file.name.replace(/\.[^.]+$/, '') || 'photo') + '.webp';
        fd.append('file', compresse, nom);
        const res = await fetch(base, { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Échec de l’upload.');
        setPhotos(data.photos);
      }
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Erreur inconnue.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function action(method: 'DELETE' | 'PUT', body: object) {
    setErreur(null);
    setBusy(true);
    try {
      const res = await fetch(base, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Action échouée.');
      setPhotos(data.photos);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Erreur inconnue.');
    } finally {
      setBusy(false);
    }
  }

  const supprimer = (url: string) => {
    if (confirm('Supprimer cette photo ?')) action('DELETE', { url });
  };
  const definirPrincipale = (url: string) =>
    action('PUT', { photos: [url, ...photos.filter((u) => u !== url)] });

  return (
    <div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {busy ? 'Traitement…' : 'Ajouter des photos'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => onFiles(e.target.files)}
        />
        <span className="text-xs text-gray-500">JPG/PNG · compressées automatiquement</span>
      </div>

      {erreur && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erreur}</p>}

      {photos.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">Aucune photo pour le moment.</p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {photos.map((url, i) => (
            <div key={url} className="group relative overflow-hidden rounded-lg ring-1 ring-black/10">
              <img src={url} alt="" className="aspect-square w-full object-cover" />
              {i === 0 && (
                <span className="absolute left-1.5 top-1.5 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-white">
                  Principale
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-black/50 p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                {i !== 0 && (
                  <button
                    type="button"
                    onClick={() => definirPrincipale(url)}
                    disabled={busy}
                    className="text-[11px] font-medium text-white hover:underline disabled:opacity-50"
                  >
                    Principale
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => supprimer(url)}
                  disabled={busy}
                  className="ml-auto text-[11px] font-medium text-red-200 hover:underline disabled:opacity-50"
                >
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
