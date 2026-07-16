import type { TypeBien, Duree, StatutAppartement, Appartement } from './database.types';

// Parsing + validation serveur d'un formulaire d'appartement (création ou édition).
// Ne touche pas au champ `photos` (géré séparément par l'upload, sous-étape 5.3).

export type AppartErreurs = Record<string, string>;
export type AppartValeurs = Record<string, string>;

export interface DonneesAppartement {
  titre: string;
  description: string | null;
  type: TypeBien;
  duree: Duree;
  ville: string;
  quartier: string | null;
  prix_mensuel: number;
  charges: number | null;
  surface: number | null;
  nb_pieces: number | null;
  meuble: boolean;
  date_disponibilite: string | null;
  statut: StatutAppartement;
}

export interface ResultatAppart {
  erreurs: AppartErreurs;
  valeurs: AppartValeurs;
  data: DonneesAppartement | null; // null si erreurs
}

// Convertit un appartement de la base en valeurs de formulaire (chaînes) pour l'édition.
export function appartementVersValeurs(a: Appartement): AppartValeurs {
  return {
    titre: a.titre,
    description: a.description ?? '',
    type: a.type,
    duree: a.duree,
    ville: a.ville,
    quartier: a.quartier ?? '',
    prix_mensuel: String(a.prix_mensuel),
    charges: a.charges != null ? String(a.charges) : '',
    surface: a.surface != null ? String(a.surface) : '',
    nb_pieces: a.nb_pieces != null ? String(a.nb_pieces) : '',
    date_disponibilite: a.date_disponibilite ?? '',
    statut: a.statut,
    meuble: a.meuble ? 'on' : '',
  };
}

function entierOuNull(v: string): number | null {
  if (v === '') return null;
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 ? n : null;
}
function texteOuNull(v: string): string | null {
  return v === '' ? null : v;
}

export function parseAppartementForm(formData: FormData): ResultatAppart {
  const get = (k: string) => (formData.get(k) ?? '').toString().trim();

  const valeurs: AppartValeurs = {
    titre: get('titre'),
    description: get('description'),
    type: get('type'),
    duree: get('duree'),
    ville: get('ville'),
    quartier: get('quartier'),
    prix_mensuel: get('prix_mensuel'),
    charges: get('charges'),
    surface: get('surface'),
    nb_pieces: get('nb_pieces'),
    date_disponibilite: get('date_disponibilite'),
    statut: get('statut') || 'disponible',
    meuble: formData.get('meuble') ? 'on' : '',
  };

  const erreurs: AppartErreurs = {};

  if (!valeurs.titre) erreurs.titre = 'Le titre est obligatoire.';
  if (!['location', 'sous-location'].includes(valeurs.type)) erreurs.type = 'Type requis.';
  if (!['courte', 'longue'].includes(valeurs.duree)) erreurs.duree = 'Durée requise.';
  if (!valeurs.ville) erreurs.ville = 'La ville est obligatoire.';
  if (!valeurs.prix_mensuel) erreurs.prix_mensuel = 'Le prix est obligatoire.';
  else if (entierOuNull(valeurs.prix_mensuel) === null)
    erreurs.prix_mensuel = 'Le prix doit être un entier positif.';
  if (valeurs.charges && entierOuNull(valeurs.charges) === null)
    erreurs.charges = 'Nombre invalide.';
  if (valeurs.surface && entierOuNull(valeurs.surface) === null)
    erreurs.surface = 'Nombre invalide.';
  if (valeurs.nb_pieces && entierOuNull(valeurs.nb_pieces) === null)
    erreurs.nb_pieces = 'Nombre invalide.';
  if (!['disponible', 'bientot', 'loue'].includes(valeurs.statut))
    erreurs.statut = 'Statut invalide.';

  if (Object.keys(erreurs).length > 0) {
    return { erreurs, valeurs, data: null };
  }

  const data: DonneesAppartement = {
    titre: valeurs.titre,
    description: texteOuNull(valeurs.description),
    type: valeurs.type as TypeBien,
    duree: valeurs.duree as Duree,
    ville: valeurs.ville,
    quartier: texteOuNull(valeurs.quartier),
    prix_mensuel: entierOuNull(valeurs.prix_mensuel)!,
    charges: entierOuNull(valeurs.charges),
    surface: entierOuNull(valeurs.surface),
    nb_pieces: entierOuNull(valeurs.nb_pieces),
    meuble: valeurs.meuble === 'on',
    date_disponibilite: texteOuNull(valeurs.date_disponibilite),
    statut: valeurs.statut as StatutAppartement,
  };

  return { erreurs: {}, valeurs, data };
}
