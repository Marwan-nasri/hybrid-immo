// Types de la base de données hybrid'immo.
//
// Format canonique attendu par supabase-js (identique à ce que produit
// `supabase gen types typescript`). Écrits à la main pour l'instant — ils
// reflètent exactement `supabase/schema.sql`. Régénérables plus tard via la CLI.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// --- Énumérations métier (miroir des contraintes CHECK en base) ---
export type TypeBien = 'location' | 'sous-location';
export type Duree = 'courte' | 'longue';
export type StatutAppartement = 'disponible' | 'bientot' | 'loue';
export type StatutDemande = 'nouvelle' | 'contactee' | 'en_cours' | 'acceptee' | 'refusee';

export type Database = {
  public: {
    Tables: {
      appartements: {
        Row: {
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
          date_disponibilite: string | null;
          statut: StatutAppartement;
          photos: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          titre: string;
          description?: string | null;
          type: TypeBien;
          duree: Duree;
          ville: string;
          quartier?: string | null;
          prix_mensuel: number;
          charges?: number | null;
          surface?: number | null;
          nb_pieces?: number | null;
          meuble?: boolean;
          date_disponibilite?: string | null;
          statut?: StatutAppartement;
          photos?: string[];
          created_at?: string;
        };
        Update: {
          id?: string;
          titre?: string;
          description?: string | null;
          type?: TypeBien;
          duree?: Duree;
          ville?: string;
          quartier?: string | null;
          prix_mensuel?: number;
          charges?: number | null;
          surface?: number | null;
          nb_pieces?: number | null;
          meuble?: boolean;
          date_disponibilite?: string | null;
          statut?: StatutAppartement;
          photos?: string[];
          created_at?: string;
        };
        Relationships: [];
      };
      demandes: {
        Row: {
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
        };
        Insert: {
          id?: string;
          appartement_id?: string | null;
          nom: string;
          email: string;
          telephone: string;
          type_demande?: TypeBien | null;
          duree?: Duree | null;
          ville?: string | null;
          budget?: number | null;
          date_entree?: string | null;
          nb_personnes?: number | null;
          message?: string | null;
          statut?: StatutDemande;
          consentement_rgpd: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          appartement_id?: string | null;
          nom?: string;
          email?: string;
          telephone?: string;
          type_demande?: TypeBien | null;
          duree?: Duree | null;
          ville?: string | null;
          budget?: number | null;
          date_entree?: string | null;
          nb_personnes?: number | null;
          message?: string | null;
          statut?: StatutDemande;
          consentement_rgpd?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'demandes_appartement_id_fkey';
            columns: ['appartement_id'];
            isOneToOne: false;
            referencedRelation: 'appartements';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

// --- Types pratiques dérivés (utilisés dans tout le code) ---
export type Appartement = Database['public']['Tables']['appartements']['Row'];
export type Demande = Database['public']['Tables']['demandes']['Row'];
