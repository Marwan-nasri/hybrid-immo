import { Resend } from 'resend';

// Envoi des emails transactionnels via Resend.
//
// ⚠️ Côté serveur UNIQUEMENT : ce module utilise RESEND_API_KEY (secret, sans
// préfixe PUBLIC_). Il ne doit être importé que depuis du code serveur (ici,
// l'endpoint qui traite le formulaire), jamais dans un composant client.
//
// Robustesse : si la clé n'est pas configurée, ou si Resend renvoie une erreur,
// on log et on continue — une demande déjà enregistrée ne doit jamais être
// perdue à cause d'un email qui échoue.

const apiKey = import.meta.env.RESEND_API_KEY;
const from = import.meta.env.RESEND_FROM || "hybrid'immo <onboarding@resend.dev>";
const notificationEmail = import.meta.env.NOTIFICATION_EMAIL;
const siteUrl = import.meta.env.PUBLIC_SITE_URL || 'http://localhost:4321';

const resend = apiKey ? new Resend(apiKey) : null;

// Données nécessaires à la rédaction des emails (sous-ensemble de la demande).
export interface DonneesEmailDemande {
  nom: string;
  email: string;
  telephone: string;
  type_demande: string | null;
  duree: string | null;
  ville: string | null;
  budget: number | null;
  date_entree: string | null;
  nb_personnes: number | null;
  message: string | null;
  titreAppartement: string | null; // null = demande générale
}

// Échappe les caractères HTML pour insérer du texte utilisateur sans risque.
function esc(v: string | number | null): string {
  if (v == null || v === '') return '—';
  return String(v)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function corpsNotification(d: DonneesEmailDemande): string {
  const cible = d.titreAppartement ?? 'Demande générale';
  const ligne = (label: string, valeur: string | number | null) =>
    `<tr><td style="padding:4px 12px 4px 0;color:#6B7280">${label}</td><td style="padding:4px 0"><strong>${esc(valeur)}</strong></td></tr>`;
  return `
    <div style="font-family:Inter,Arial,sans-serif;color:#1A1A1A">
      <h2 style="margin:0 0 4px">Nouvelle demande</h2>
      <p style="margin:0 0 16px;color:#6B7280">${esc(cible)}</p>
      <table style="border-collapse:collapse;font-size:14px">
        ${ligne('Nom', d.nom)}
        ${ligne('Email', d.email)}
        ${ligne('Téléphone', d.telephone)}
        ${ligne('Type', d.type_demande)}
        ${ligne('Durée', d.duree)}
        ${ligne('Ville', d.ville)}
        ${ligne('Budget', d.budget != null ? `${d.budget} €/mois` : null)}
        ${ligne("Date d'entrée", d.date_entree)}
        ${ligne('Personnes', d.nb_personnes)}
        ${ligne('Message', d.message)}
      </table>
      <p style="margin:20px 0 0">
        <a href="${siteUrl}/admin/demandes" style="color:#5B5FED">Voir dans l'admin →</a>
      </p>
    </div>`;
}

function corpsAccuse(d: DonneesEmailDemande): string {
  return `
    <div style="font-family:Inter,Arial,sans-serif;color:#1A1A1A">
      <h2 style="margin:0 0 12px">Votre demande a bien été reçue</h2>
      <p style="margin:0 0 12px">Bonjour ${esc(d.nom)},</p>
      <p style="margin:0 0 12px">
        Nous avons bien reçu votre demande${d.titreAppartement ? ` concernant « ${esc(d.titreAppartement)} »` : ''}.
        Nous reviendrons vers vous sous 24 à 48 h.
      </p>
      <p style="margin:0 0 12px">À très bientôt,<br/>L'équipe hybrid'immo</p>
    </div>`;
}

// Envoie les deux emails. Ne lève jamais : encapsule ses erreurs.
export async function envoyerEmailsDemande(d: DonneesEmailDemande): Promise<void> {
  if (!resend) {
    console.warn('[emails] RESEND_API_KEY absente — envoi ignoré (demande enregistrée).');
    return;
  }

  const cible = d.titreAppartement ?? 'Demande générale';

  // 1) Notification au gestionnaire
  if (notificationEmail) {
    try {
      const { error } = await resend.emails.send({
        from,
        to: notificationEmail,
        replyTo: d.email, // répondre = écrire directement au candidat
        subject: `Nouvelle demande – ${cible} – ${d.nom}`,
        html: corpsNotification(d),
      });
      if (error) console.error('[emails] notification gestionnaire:', error);
    } catch (e) {
      console.error('[emails] notification gestionnaire (exception):', e);
    }
  } else {
    console.warn('[emails] NOTIFICATION_EMAIL absente — notification gestionnaire ignorée.');
  }

  // 2) Accusé de réception au candidat
  try {
    const { error } = await resend.emails.send({
      from,
      to: d.email,
      subject: 'Votre demande a bien été reçue – hybrid\'immo',
      html: corpsAccuse(d),
    });
    if (error) console.error('[emails] accusé candidat:', error);
  } catch (e) {
    console.error('[emails] accusé candidat (exception):', e);
  }
}
