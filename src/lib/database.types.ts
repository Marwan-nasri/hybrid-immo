// Types de la base de données hybrid'immo.
//
// Écrits à la main pour l'instant — ils reflètent exactement `supabase/schema.sql`.
// À terme, remplaçables par une génération automatique :
//   supabase gen types typescript --project-id <ref> > src/lib/database.types.ts

// --- Énumérations métier (miroir des contraintes CHECK en base) ---
export type TypeBien = 'location' | 'sous-location';
export type Duree = 'courte' | 'longue';
export type StatutAppartement = 'disponible' | 'bientot' | 'loue';
export type StatutDemande =
  | 'nouvelle'
  | 'contactee'
  | 'en_cours'
  | 'acceptee'
  | 'refusee';

// --- Lignes des tables ---
export interface Appartement {
  id: string;
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
  date_disponibilite: string | null; // date ISO 'YYYY-MM-DD'
  statut: StatutAppartement;
  photos: string[];
  created_at: string; // timestamptz ISO
}

export interface Demande {
  id: string;
  appartement_id: string | null;
  nom: string;
  email: string;
  telephone: string;
  type_demande: TypeBien | null;
  duree: Duree | null;
  ville: string | null;
  budget: number | null;
  date_entree: string | null;
  nb_personnes: number | null;
  message: string | null;
  statut: StatutDemande;
  consentement_rgpd: boolean;
  created_at: string;
}

// Champs auto-générés en base : absents à l'insertion.
type ColonnesAuto = 'id' | 'created_at';

// --- Forme attendue par le client typé supabase-js ---
export interface Database {
  public: {
    Tables: {
      appartements: {
        Row: Appartement;
        Insert: Omit<Appartement, ColonnesAuto> & Partial<Pick<Appartement, ColonnesAuto>>;
        Update: Partial<Omit<Appartement, ColonnesAuto>>;
      };
      demandes: {
        Row: Demande;
        Insert: Omit<Demande, ColonnesAuto | 'statut'> &
          Partial<Pick<Demande, ColonnesAuto | 'statut'>>;
        Update: Partial<Omit<Demande, ColonnesAuto>>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
