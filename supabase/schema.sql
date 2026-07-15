-- hybrid'immo — Schéma de base de données (étape 2)
--
-- À coller dans Supabase → SQL Editor → New query → Run.
-- Réexécutable sans risque (if not exists, drop policy if exists avant recréation).
--
-- Rôles pour la RLS (voir CLAUDE.md) :
--   anon          = visiteur public non connecté (site public)
--   authenticated = l'admin connecté via Supabase Auth (compte unique)
--   service_role  = contourne la RLS ; côté serveur uniquement, jamais exposée au client.


-- 1) Table appartements

create table if not exists public.appartements (
  id                  uuid        primary key default gen_random_uuid(),
  titre               text        not null,
  description         text,
  type                text        not null,          -- 'location' | 'sous-location'
  duree               text        not null,          -- 'courte' | 'longue'
  ville               text        not null,
  quartier            text,
  prix_mensuel        integer     not null,          -- en euros
  charges             integer,                        -- en euros
  surface             integer,                        -- en m2
  nb_pieces           integer,
  meuble              boolean     not null default false,
  date_disponibilite  date,
  statut              text        not null default 'disponible', -- 'disponible' | 'bientot' | 'loue'
  photos              text[]      not null default '{}',         -- URLs Storage ; [0] = photo principale
  created_at          timestamptz not null default now(),

  -- La base refuse elle-meme toute valeur hors des listes prevues.
  constraint appartements_type_check   check (type   in ('location', 'sous-location')),
  constraint appartements_duree_check  check (duree  in ('courte', 'longue')),
  constraint appartements_statut_check check (statut in ('disponible', 'bientot', 'loue'))
);


-- 2) Table demandes

create table if not exists public.demandes (
  id                  uuid        primary key default gen_random_uuid(),
  -- FK vers l'appartement concerne. NULL = demande generale (page /demande).
  -- ON DELETE SET NULL : si un appartement est supprime, on conserve la demande
  -- en la basculant en demande generale (on ne perd pas les coordonnees du candidat).
  appartement_id      uuid        references public.appartements(id) on delete set null,
  nom                 text        not null,
  email               text        not null,
  telephone           text        not null,
  type_demande        text,                           -- 'location' | 'sous-location'
  duree               text,                           -- 'courte' | 'longue'
  ville               text,
  budget              integer,                        -- en euros
  date_entree         date,
  nb_personnes        integer,
  message             text,
  statut              text        not null default 'nouvelle',
  -- Consentement RGPD : doit etre true pour inserer (garanti par la contrainte
  -- ET par la policy RLS d'insertion plus bas : double verrou).
  consentement_rgpd   boolean     not null,
  created_at          timestamptz not null default now(),

  constraint demandes_type_check         check (type_demande is null or type_demande in ('location', 'sous-location')),
  constraint demandes_duree_check        check (duree is null or duree in ('courte', 'longue')),
  constraint demandes_statut_check       check (statut in ('nouvelle', 'contactee', 'en_cours', 'acceptee', 'refusee')),
  constraint demandes_consentement_check check (consentement_rgpd = true)
);

-- Postgres n'indexe PAS automatiquement les cles etrangeres.
-- Utile : l'admin affiche les demandes groupees par appartement et triees par date.
create index if not exists demandes_appartement_id_idx on public.demandes (appartement_id);
create index if not exists demandes_created_at_idx      on public.demandes (created_at desc);


-- 3) Row Level Security
--
-- Des qu'on active la RLS, plus aucun acces n'est permis par defaut : il faut
-- declarer chaque droit via une policy.
--   using      = lignes visibles/modifiables (select/update/delete)
--   with check = condition que la ligne doit respecter pour insert/update

alter table public.appartements enable row level security;
alter table public.demandes     enable row level security;

-- appartements : lecture publique du catalogue (les 3 statuts, 'loue' reste affiche grise).
drop policy if exists "appartements_select_public" on public.appartements;
create policy "appartements_select_public"
  on public.appartements
  for select
  to anon
  using (statut in ('disponible', 'bientot', 'loue'));

-- appartements : l'admin authentifie a un acces total (tout lire + ecrire).
drop policy if exists "appartements_all_admin" on public.appartements;
create policy "appartements_all_admin"
  on public.appartements
  for all
  to authenticated
  using (true)
  with check (true);

-- demandes : insertion publique UNIQUEMENT si consentement RGPD coche.
-- Aucune policy de lecture publique => un visiteur ne peut jamais lire les demandes.
drop policy if exists "demandes_insert_public" on public.demandes;
create policy "demandes_insert_public"
  on public.demandes
  for insert
  to anon
  with check (consentement_rgpd = true);

-- demandes : l'admin authentifie a un acces total (lecture, changement de statut, suppression).
drop policy if exists "demandes_all_admin" on public.demandes;
create policy "demandes_all_admin"
  on public.demandes
  for all
  to authenticated
  using (true)
  with check (true);


-- 4) Storage : bucket photos-appartements
--
-- Bucket public en lecture (photos servies via URL publique).
-- Ecriture (upload/remplacement/suppression) reservee a l'admin authentifie.

insert into storage.buckets (id, name, public)
values ('photos-appartements', 'photos-appartements', true)
on conflict (id) do nothing;

drop policy if exists "photos_select_public" on storage.objects;
create policy "photos_select_public"
  on storage.objects
  for select
  to anon
  using (bucket_id = 'photos-appartements');

drop policy if exists "photos_insert_admin" on storage.objects;
create policy "photos_insert_admin"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'photos-appartements');

drop policy if exists "photos_update_admin" on storage.objects;
create policy "photos_update_admin"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'photos-appartements')
  with check (bucket_id = 'photos-appartements');

drop policy if exists "photos_delete_admin" on storage.objects;
create policy "photos_delete_admin"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'photos-appartements');
