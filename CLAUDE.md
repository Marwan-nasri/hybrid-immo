# CLAUDE.md — Site de location d'appartements

## Contexte du projet

Site web pour un gestionnaire d'appartements en location et sous-location (courte et longue durée) en France. Deux parties :

1. **Site public** : catalogue d'appartements consultable + formulaire de demande gratuit pour les visiteurs intéressés.
2. **Espace admin protégé** (`/admin`) : gestion des appartements (CRUD + photos) et des demandes reçues, utilisé par une seule personne.

À chaque nouvelle demande soumise, un email de notification est envoyé au gestionnaire. Pas de paiement en ligne, pas de comptes visiteurs, pas de scoring de priorité — les demandes sont simplement groupées par appartement et triées par date.

## Stack technique

- **Framework** : Astro en mode SSR (adaptateur `@astrojs/vercel`)
- **Styling** : Tailwind CSS
- **Base de données + Storage + Auth** : Supabase
- **Emails transactionnels** : Resend
- **Interactivité admin** : îlots React (`client:load`) uniquement où nécessaire (upload photos, tableaux dynamiques). Le reste en Astro pur.
- **Hébergement** : Vercel
- **Langue du site** : français uniquement

## Variables d'environnement

```
PUBLIC_SUPABASE_URL=          # exposée au client (préfixe PUBLIC_ requis par Astro)
PUBLIC_SUPABASE_ANON_KEY=     # exposée au client — clé anon, protégée par les policies RLS
SUPABASE_SERVICE_ROLE_KEY=    # côté serveur uniquement, jamais exposée au client
RESEND_API_KEY=               # côté serveur uniquement
NOTIFICATION_EMAIL=           # email du gestionnaire qui reçoit les notifications
RESEND_FROM=                  # expéditeur des emails (domaine vérifié Resend ; défaut : onboarding@resend.dev)
PUBLIC_SITE_URL=              # URL publique du site (liens absolus dans les emails)
```

Convention Astro : seules les variables préfixées `PUBLIC_` sont accessibles côté navigateur. L'URL et la clé anon Supabase doivent l'être (le catalogue public interroge Supabase depuis le client), d'où le préfixe — elles sont de toute façon protégées par les policies RLS. Ne jamais utiliser `SUPABASE_SERVICE_ROLE_KEY` (ni `RESEND_API_KEY`) dans du code exécuté côté client. Les clés vivent dans `.env` (gitignoré) et dans les variables d'environnement Vercel.

## Schéma de base de données

### Table `appartements`

| Colonne | Type | Notes |
|---|---|---|
| id | uuid, PK, default gen_random_uuid() | |
| titre | text, not null | |
| description | text | |
| type | text, not null | 'location' ou 'sous-location' |
| duree | text, not null | 'courte' ou 'longue' |
| ville | text, not null | |
| quartier | text | |
| prix_mensuel | integer, not null | en euros |
| charges | integer | en euros |
| surface | integer | en m² |
| nb_pieces | integer | |
| meuble | boolean, default false | |
| date_disponibilite | date | |
| statut | text, default 'disponible' | 'disponible', 'bientot', 'loue' |
| photos | text[] | URLs Supabase Storage, la première = photo principale |
| created_at | timestamptz, default now() | |

### Table `demandes`

| Colonne | Type | Notes |
|---|---|---|
| id | uuid, PK, default gen_random_uuid() | |
| appartement_id | uuid, FK → appartements.id, nullable | null = demande générale |
| nom | text, not null | |
| email | text, not null | |
| telephone | text, not null | |
| type_demande | text | 'location' ou 'sous-location' |
| duree | text | 'courte' ou 'longue' |
| ville | text | |
| budget | integer | en euros |
| date_entree | date | |
| nb_personnes | integer | |
| message | text | |
| statut | text, default 'nouvelle' | 'nouvelle', 'contactee', 'en_cours', 'acceptee', 'refusee' |
| consentement_rgpd | boolean, not null | doit être true pour insérer |
| created_at | timestamptz, default now() | |

### Storage

Bucket `photos-appartements`, public en lecture. Compression des images côté client avant upload (lib `browser-image-compression`, sortie WebP, max ~1600px de large, ~300 Ko cible).

## Sécurité — Row Level Security (non négociable)

RLS activée sur les deux tables. Policies :

- `appartements` : SELECT public autorisé uniquement sur `statut IN ('disponible', 'bientot', 'loue')` (tout en pratique, mais la policy existe). INSERT/UPDATE/DELETE réservés au rôle authentifié (admin).
- `demandes` : INSERT public autorisé (avec `consentement_rgpd = true`). SELECT/UPDATE/DELETE réservés au rôle authentifié. **Jamais de lecture publique sur cette table — données personnelles.**
- Storage : lecture publique sur le bucket photos, écriture réservée à l'authentifié.

L'authentification admin : Supabase Auth email/password, **un seul compte**, pas de page d'inscription. Les routes `/admin/*` sont protégées par un middleware Astro qui vérifie la session côté serveur.

## Design — charte visuelle

Style SaaS moderne épuré (références : Moduk.io, Linear, StatSync).

- **Fond** : blanc / gris très clair `#F7F8FA`, sections alternées
- **Accent** : bleu-violet `#5B5FED` (boutons, liens, éléments actifs)
- **Texte** : `#1A1A1A` titres, `#6B7280` paragraphes
- **Typo** : Inter (Google Fonts) — titres bold tracking serré, gros corps sur le hero
- **Cartes** : blanches, coins arrondis 16px (`rounded-2xl`), ombres douces (`shadow-sm` à `shadow-md`)
- **Boutons** : pill (`rounded-full`), accent plein pour le CTA principal
- **Section finale + footer** : fond sombre `#0D0D0D`
- **Animations** : fade-in doux au scroll, transitions discrètes — jamais tape-à-l'œil
- **Mobile-first** : le responsive n'est pas une étape finale, chaque composant est vérifié en mobile au moment où il est créé

## Structure des pages

```
/                       Accueil (hero, features, comment ça marche, apparts en avant, FAQ, CTA sombre)
/appartements           Catalogue avec filtres (ville, type, durée, budget max)
/appartements/[id]      Fiche détail (galerie, infos, formulaire pré-rempli avec appartement_id)
/demande                Formulaire général (sans appart précis)
/mentions-legales       Mentions légales
/confidentialite        Politique de confidentialité (RGPD)
/admin/login            Connexion admin
/admin                  Dashboard (liste apparts + compteur de demandes par appart)
/admin/appartements/... CRUD appartements + upload photos
/admin/demandes         Demandes groupées par appartement, changement de statut en un clic
```

## Logique métier

- Un appartement peut recevoir **plusieurs demandes** en parallèle. L'admin les affiche groupées par appartement, triées par date (pas de priorité automatique).
- Statuts d'une demande : `nouvelle → contactee → en_cours → acceptee / refusee`. Changement en un clic depuis l'admin.
- Quand une demande passe en `acceptee`, **proposer** (pas automatique) de passer l'appartement en `loue`.
- Les apparts `loue` restent visibles dans le catalogue en grisé avec badge « Loué », sans formulaire.
- À chaque INSERT dans `demandes` : envoi d'un email via Resend au gestionnaire (`NOTIFICATION_EMAIL`), objet : `Nouvelle demande – {titre appart ou "Demande générale"} – {nom}`, corps avec toutes les infos + lien vers /admin/demandes. L'envoi se fait dans l'endpoint serveur Astro qui traite le formulaire, jamais côté client.
- Accusé de réception automatique au candidat (email simple : « Votre demande a bien été reçue, réponse sous 24-48h »).
- Validation des formulaires côté client ET côté serveur (ne jamais faire confiance au client).

## RGPD

- Case de consentement obligatoire sur les formulaires (non pré-cochée) avec lien vers /confidentialite.
- Ne collecter que les champs définis dans le schéma — ne pas en ajouter sans raison.
- Prévoir la suppression des demandes anciennes (politique de conservation à définir avec le client, par défaut 6 mois).

## Conventions de travail

- **Petites étapes** : une fonctionnalité à la fois, testée avant de passer à la suivante.
- **Commits fréquents** : après chaque bloc fonctionnel, message clair en français.
- **Expliquer le code nouveau** : sur les parties Supabase (auth, RLS, storage), commenter et expliquer les choix — le développeur monte en compétence sur ces sujets pendant le projet.
- **Pas de sur-ingénierie** : pas de state manager, pas d'abstraction prématurée, pas de composants ultra-génériques. Ce projet doit rester simple et maintenable par une personne.
- **TypeScript** partout, types générés depuis Supabase (`supabase gen types`).
- **Aucune donnée sensible dans le code** : tout passe par les variables d'environnement.

## Ordre de construction prévu

1. Setup Astro SSR + Tailwind + déploiement Vercel (hello world en ligne)
2. Tables Supabase + RLS + catalogue en lecture seule avec données réelles
3. Fiche détail + formulaire de demande → INSERT en base
4. Notifications email Resend + accusé de réception
5. Admin : auth → CRUD appartements + upload photos → vue demandes
6. Pages légales, responsive final, polish