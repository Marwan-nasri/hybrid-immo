-- hybrid'immo — Données de test (facultatif)
--
-- À coller dans Supabase → SQL Editor → Run, pour voir le catalogue peuplé.
-- Les photos pointent vers picsum.photos (images de démo). À remplacer par de
-- vraies photos plus tard.
--
-- Pour repartir de zéro : `truncate table public.appartements cascade;`

insert into public.appartements
  (titre, description, type, duree, ville, quartier, prix_mensuel, charges, surface, nb_pieces, meuble, date_disponibilite, statut, photos)
values
  ('Studio lumineux hypercentre',
   'Studio rénové, idéal étudiant ou jeune actif, proche des transports.',
   'location', 'longue', 'Nancy', 'Centre-ville', 520, 40, 26, 1, true, current_date,
   'disponible', array['https://picsum.photos/seed/immo-1/800/600']),

  ('T2 cosy proche gare',
   'Deux pièces meublé, parfait pour la sous-location courte durée.',
   'sous-location', 'courte', 'Nancy', 'Gare', 780, 60, 42, 2, true, current_date + 15,
   'disponible', array['https://picsum.photos/seed/immo-2/800/600']),

  ('T3 familial avec balcon',
   'Grand trois pièces non meublé, quartier calme et résidentiel.',
   'location', 'longue', 'Metz', 'Sablon', 950, 80, 68, 3, false, current_date + 30,
   'disponible', array['https://picsum.photos/seed/immo-3/800/600']),

  ('Appartement design centre-ville',
   'Sous-location longue durée, entièrement équipé, prestations haut de gamme.',
   'sous-location', 'longue', 'Strasbourg', 'Krutenau', 1150, 90, 55, 2, true, current_date + 45,
   'disponible', array['https://picsum.photos/seed/immo-4/800/600']),

  ('Studio étudiant meublé',
   'Petit studio fonctionnel, disponible bientôt, proche campus.',
   'location', 'courte', 'Metz', 'Technopôle', 480, 35, 20, 1, true, current_date + 60,
   'bientot', array['https://picsum.photos/seed/immo-5/800/600']),

  ('T2 rénové (déjà loué)',
   'Exemple d''annonce déjà louée : reste visible, grisée, sans formulaire.',
   'location', 'longue', 'Strasbourg', 'Neudorf', 720, 55, 45, 2, false, null,
   'loue', array['https://picsum.photos/seed/immo-6/800/600']);
