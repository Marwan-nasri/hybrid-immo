import { supabase } from './supabase';
import type { TypeBien, Duree } from './database.types';

// Traitement d'une demande soumise via un formulaire public.
//
// Toute la validation est refaite ICI, côté serveur : on ne fait jamais
// confiance au client (le HTML peut être contourné). L'insertion se fait avec
// le client anon → c'est la policy RLS `demandes_insert_public` qui autorise
// (uniquement si consentement_rgpd = true). On ne lit jamais la ligne en retour
// (anon n'a aucun droit de SELECT sur `demandes`).

export type DemandeErreurs = Record<string, string>;
// Valeurs brutes (string) renvoyées au formulaire pour le repeupler en cas d'erreur.
export type DemandeValeurs = Record<string, string>;

export interface ResultatDemande {
  ok: boolean;
  erreurs: DemandeErreurs;
  valeurs: DemandeValeurs;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Convertit une chaîne de formulaire en entier positif, ou null si vide/invalide.
function entierOuNull(v: string): number | null {
  if (v === '') return null;
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

function texteOuNull(v: string): string | null {
  return v === '' ? null : v;
}

export async function traiterDemande(formData: FormData): Promise<ResultatDemande> {
  const get = (k: string) => (formData.get(k) ?? '').toString().trim();

  const valeurs: DemandeValeurs = {
    appartement_id: get('appartement_id'),
    nom: get('nom'),
    email: get('email'),
    telephone: get('telephone'),
    type_demande: get('type_demande'),
    duree: get('duree'),
    ville: get('ville'),
    budget: get('budget'),
    date_entree: get('date_entree'),
    nb_personnes: get('nb_personnes'),
    message: get('message'),
    // La case cochée renvoie "on" ; on normalise en "on"/"" pour le repeuplage.
    consentement_rgpd: formData.get('consentement_rgpd') ? 'on' : '',
  };

  const erreurs: DemandeErreurs = {};

  // --- Champs obligatoires ---
  if (!valeurs.nom) erreurs.nom = 'Le nom est obligatoire.';
  if (!valeurs.email) erreurs.email = "L'email est obligatoire.";
  else if (!EMAIL_RE.test(valeurs.email)) erreurs.email = "L'email n'est pas valide.";
  if (!valeurs.telephone) erreurs.telephone = 'Le téléphone est obligatoire.';
  if (valeurs.consentement_rgpd !== 'on')
    erreurs.consentement_rgpd = 'Vous devez accepter la politique de confidentialité.';

  // --- Champs optionnels : on valide seulement s'ils sont renseignés ---
  if (valeurs.type_demande && !['location', 'sous-location'].includes(valeurs.type_demande))
    erreurs.type_demande = 'Valeur invalide.';
  if (valeurs.duree && !['courte', 'longue'].includes(valeurs.duree))
    erreurs.duree = 'Valeur invalide.';
  if (valeurs.budget && entierOuNull(valeurs.budget) === null)
    erreurs.budget = 'Le budget doit être un nombre positif.';
  if (valeurs.nb_personnes && entierOuNull(valeurs.nb_personnes) === null)
    erreurs.nb_personnes = 'Nombre invalide.';

  if (Object.keys(erreurs).length > 0) {
    return { ok: false, erreurs, valeurs };
  }

  // --- Construction de la ligne à insérer ---
  const appartementId = UUID_RE.test(valeurs.appartement_id) ? valeurs.appartement_id : null;

  const ligne = {
    appartement_id: appartementId,
    nom: valeurs.nom,
    email: valeurs.email,
    telephone: valeurs.telephone,
    type_demande: (texteOuNull(valeurs.type_demande) as TypeBien | null),
    duree: (texteOuNull(valeurs.duree) as Duree | null),
    ville: texteOuNull(valeurs.ville),
    budget: entierOuNull(valeurs.budget),
    date_entree: texteOuNull(valeurs.date_entree),
    nb_personnes: entierOuNull(valeurs.nb_personnes),
    message: texteOuNull(valeurs.message),
    consentement_rgpd: true,
  };

  const { error } = await supabase.from('demandes').insert(ligne);

  if (error) {
    return {
      ok: false,
      erreurs: { _global: "Une erreur est survenue lors de l'envoi. Merci de réessayer." },
      valeurs,
    };
  }

  return { ok: true, erreurs: {}, valeurs: {} };
}
