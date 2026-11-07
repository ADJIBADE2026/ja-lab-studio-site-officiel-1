/**
 * JA Lab Studio — réception des demandes de rendez-vous
 * ------------------------------------------------------
 * À installer UNE SEULE FOIS sur https://script.google.com avec le compte jalabstudio@gmail.com
 * (voir reservation-agenda/INSTALLATION.md).
 *
 * À chaque demande envoyée depuis le site :
 *   1. un évènement « À confirmer » est ajouté au Google Agenda du studio ;
 *   2. un courriel détaillé est envoyé à jalabstudio@gmail.com (bouton « Répondre » = répondre au client) ;
 *   3. un courriel de confirmation de réception est envoyé au client.
 */

var CONFIG = {
  STUDIO_EMAIL: 'jalabstudio@gmail.com',
  STUDIO_NAME: 'JA Lab Studio',
  TIMEZONE: 'America/Toronto',            // heure de l'Est (Rimouski)
  STUDIO_LOCATION: 'JA Lab Studio, Rimouski, QC',
  EVENT_COLOR: CalendarApp.EventColor.YELLOW, // jaune = demande à confirmer
  // Créneaux indicatifs selon le « moment préféré » (heure de Rimouski)
  SLOTS: {
    'Matin':      ['09:00', '12:00'],
    'Après-midi': ['13:00', '17:00'],
    'Soirée':     ['18:00', '21:00']
  },
  MAX_PER_HOUR: 30,          // anti-abus : nombre maximum de demandes par heure
  MAX_PER_EMAIL_PER_HOUR: 3
};

var SERVICES = ['Shooting en studio', 'Mariage', 'Anniversaire', 'Couverture d’évènements', 'Séance personnalisée'];
var MOMENTS = ['Indifférent', 'Matin', 'Après-midi', 'Soirée'];
var LIEUX = ['En studio', 'Sur le lieu de l’évènement', 'En extérieur', 'À définir ensemble'];
var JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
var MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/** Page de test : ouvrir l'URL du déploiement dans un navigateur doit afficher ce message. */
function doGet() {
  return ContentService.createTextOutput('JA Lab Studio – service de réservation actif.');
}

/** Reçoit les demandes envoyées par le formulaire du site. */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    var data = parseRequest_(e);

    // Champ piège rempli : robot. On répond « OK » sans rien faire.
    if (data.website) return json_({ success: true });

    var errors = validate_(data);
    if (errors.length) return json_({ success: false, message: errors.join(' ') });

    if (!checkRateLimit_(data.email)) {
      return json_({ success: false, message: 'Trop de demandes. Merci de réessayer plus tard ou de nous appeler.' });
    }

    // Double-clic / double envoi : on ne crée pas deux fois le même rendez-vous.
    var cache = CacheService.getScriptCache();
    var dupKey = 'dup_' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(
      Utilities.DigestAlgorithm.MD5, [data.email, data.date, data.service, data.nom].join('|')));
    if (cache.get(dupKey)) return json_({ success: true, duplicate: true });

    processBooking_(data);
    cache.put(dupKey, '1', 600);
    return json_({ success: true });
  } catch (err) {
    console.error(err);
    return json_({ success: false, message: 'Erreur interne. Merci de réessayer ou de nous contacter directement.' });
  } finally {
    try { lock.releaseLock(); } catch (ignored) {}
  }
}

/** Crée l'évènement d'agenda et envoie les deux courriels. */
function processBooking_(d) {
  var dateTexte = formatDateFr_(d.date);
  var slot = CONFIG.SLOTS[d.moment];
  var recu = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "yyyy-MM-dd 'à' HH:mm");

  var lignes = [
    ['Nom', d.nom],
    ['Courriel', d.email],
    ['Téléphone', d.telephone || 'Non précisé'],
    ['Type de séance', d.service],
    ['Date souhaitée', dateTexte],
    ['Moment préféré', d.moment + (slot ? ' (' + slot[0] + ' – ' + slot[1] + ', horaire indicatif)' : '')],
    ['Lieu', d.lieu],
    ['Nombre de personnes', d.personnes || 'Non précisé'],
    ['Message', d.message || 'Aucun message']
  ];

  // 1. Agenda
  var calendar = CalendarApp.getDefaultCalendar();
  var title = 'À confirmer · ' + d.service + ' – ' + d.nom;
  var description = 'Demande de rendez-vous reçue par le site le ' + recu + '.\n'
    + 'Statut : À CONFIRMER avec le client (puis renommer l’évènement et changer sa couleur).\n\n'
    + lignes.map(function (l) { return l[0] + ' : ' + l[1]; }).join('\n');
  var options = { description: description };
  if (d.lieu === 'En studio') options.location = CONFIG.STUDIO_LOCATION;

  var event;
  if (slot) {
    var start = Utilities.parseDate(d.date + ' ' + slot[0], CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm');
    var end = Utilities.parseDate(d.date + ' ' + slot[1], CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm');
    event = calendar.createEvent(title, start, end, options);
  } else {
    var day = Utilities.parseDate(d.date + ' 12:00', CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm');
    event = calendar.createAllDayEvent(title, day, options);
  }
  try { event.setColor(CONFIG.EVENT_COLOR); } catch (ignored) {}

  // 2. Courriel au studio
  var tableau = lignes.map(function (l) {
    return '<tr><th align="left" style="padding:8px 14px;background:#f6f2ea;border:1px solid #e4dccd;font-weight:600;white-space:nowrap;vertical-align:top">'
      + esc_(l[0]) + '</th><td style="padding:8px 14px;border:1px solid #e4dccd;white-space:pre-wrap">' + esc_(l[1]) + '</td></tr>';
  }).join('');
  var telLink = d.telephone ? ' · <a href="tel:' + esc_(d.telephone.replace(/[^\d+]/g, '')) + '">Appeler le client</a>' : '';
  MailApp.sendEmail({
    to: CONFIG.STUDIO_EMAIL,
    replyTo: d.email,
    name: 'Site ' + CONFIG.STUDIO_NAME,
    subject: 'Nouveau rendez-vous : ' + d.service + ' – ' + dateTexte + ' – ' + d.nom,
    body: 'Nouvelle demande de rendez-vous (ajoutée à votre agenda, à confirmer).\n\n'
      + lignes.map(function (l) { return l[0] + ' : ' + l[1]; }).join('\n')
      + '\n\nRépondez à ce courriel pour écrire directement au client.',
    htmlBody: '<div style="font-family:Arial,sans-serif;font-size:15px;color:#141312;max-width:640px">'
      + '<h2 style="font-family:Georgia,serif;font-weight:normal">Nouvelle demande de rendez-vous</h2>'
      + '<p>✅ Ajoutée à votre <strong>Google Agenda</strong> le ' + esc_(dateTexte) + ' (en jaune, <em>à confirmer</em>).</p>'
      + '<table style="border-collapse:collapse;width:100%">' + tableau + '</table>'
      + '<p style="margin-top:18px">Répondez simplement à ce courriel pour écrire au client' + telLink + '.</p>'
      + '<p style="color:#6a645b;font-size:13px">Reçue par le site le ' + esc_(recu) + '.</p></div>'
  });

  // 3. Accusé de réception au client
  MailApp.sendEmail({
    to: d.email,
    replyTo: CONFIG.STUDIO_EMAIL,
    name: CONFIG.STUDIO_NAME,
    subject: 'Votre demande de rendez-vous – ' + CONFIG.STUDIO_NAME,
    body: 'Bonjour ' + d.nom + ',\n\n'
      + 'Merci pour votre demande de rendez-vous auprès de JA Lab Studio. Nous l’avons bien reçue :\n\n'
      + 'Séance : ' + d.service + '\nDate souhaitée : ' + dateTexte + '\nMoment : ' + d.moment + '\nLieu : ' + d.lieu + '\n\n'
      + 'Nous vous recontactons dans les meilleurs délais pour confirmer la date et les détails. '
      + 'Votre rendez-vous sera définitif après cette confirmation.\n\n'
      + 'Pour toute question : +1 581 246 4916 / +1 581 525 7379, ou répondez simplement à ce courriel.\n\n'
      + 'À bientôt,\nJA Lab Studio – Une image, un reflet\nRimouski',
    htmlBody: '<div style="font-family:Arial,sans-serif;font-size:15px;color:#141312;max-width:600px;line-height:1.6">'
      + '<p>Bonjour ' + esc_(d.nom) + ',</p>'
      + '<p>Merci pour votre demande de rendez-vous auprès de <strong>JA Lab Studio</strong>. Nous l’avons bien reçue&nbsp;:</p>'
      + '<p style="padding:14px 18px;background:#f6f2ea;border-left:3px solid #f0ad1f">'
      + '<strong>Séance :</strong> ' + esc_(d.service) + '<br><strong>Date souhaitée :</strong> ' + esc_(dateTexte)
      + '<br><strong>Moment :</strong> ' + esc_(d.moment) + '<br><strong>Lieu :</strong> ' + esc_(d.lieu) + '</p>'
      + '<p>Nous vous recontactons dans les meilleurs délais pour confirmer la date et les détails. '
      + 'Votre rendez-vous sera définitif après cette confirmation.</p>'
      + '<p>Pour toute question&nbsp;: +1 581 246 4916 / +1 581 525 7379, ou répondez simplement à ce courriel.</p>'
      + '<p>À bientôt,<br><strong>JA Lab Studio</strong><br><em>Une image, un reflet</em> · Rimouski</p></div>'
  });
}

/* ---------------- Outils ---------------- */

function parseRequest_(e) {
  var raw = (e && e.postData && e.postData.contents) || '{}';
  var obj;
  try { obj = JSON.parse(raw); } catch (err) { obj = {}; }
  function s(v, max) { return String(v == null ? '' : v).trim().slice(0, max); }
  return {
    nom: s(obj.nom, 100),
    email: s(obj.email, 254).toLowerCase(),
    telephone: s(obj.telephone, 32),
    service: s(obj.service, 60),
    date: s(obj.date, 10),
    moment: s(obj.moment, 20) || 'Indifférent',
    lieu: s(obj.lieu, 40) || 'À définir ensemble',
    personnes: s(obj.personnes, 5),
    message: s(obj.message, 1500),
    consentement: obj.consentement === true || obj.consentement === 'Accepté',
    website: s(obj.website, 200)
  };
}

function validate_(d) {
  var errors = [];
  if (!d.nom) errors.push('Le nom est obligatoire.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email)) errors.push('Adresse courriel invalide.');
  if (SERVICES.indexOf(d.service) === -1) errors.push('Type de séance invalide.');
  if (MOMENTS.indexOf(d.moment) === -1) errors.push('Moment invalide.');
  if (LIEUX.indexOf(d.lieu) === -1) errors.push('Lieu invalide.');
  if (d.personnes && !/^\d{1,4}$/.test(d.personnes)) errors.push('Nombre de personnes invalide.');
  if (!d.consentement) errors.push('Le consentement est requis.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date)) {
    errors.push('Date invalide.');
  } else {
    var today = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd');
    var max = Utilities.formatDate(new Date(Date.now() + 3 * 365 * 24 * 3600 * 1000), CONFIG.TIMEZONE, 'yyyy-MM-dd');
    if (d.date < today) errors.push('La date souhaitée est déjà passée.');
    if (d.date > max) errors.push('La date souhaitée est trop éloignée.');
  }
  return errors;
}

function checkRateLimit_(email) {
  var cache = CacheService.getScriptCache();
  var hour = Utilities.formatDate(new Date(), 'UTC', 'yyyyMMddHH');
  var kAll = 'rate_' + hour;
  var kMail = 'rate_' + hour + '_' + email;
  var all = Number(cache.get(kAll) || 0);
  var mine = Number(cache.get(kMail) || 0);
  if (all >= CONFIG.MAX_PER_HOUR || mine >= CONFIG.MAX_PER_EMAIL_PER_HOUR) return false;
  cache.put(kAll, String(all + 1), 3600);
  cache.put(kMail, String(mine + 1), 3600);
  return true;
}

function formatDateFr_(iso) {
  var p = iso.split('-').map(Number);
  var jour = JOURS[new Date(Date.UTC(p[0], p[1] - 1, p[2])).getUTCDay()];
  return jour + ' ' + (p[2] === 1 ? '1er' : p[2]) + ' ' + MOIS[p[1] - 1] + ' ' + p[0];
}

function esc_(v) {
  return String(v).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ---------------- À lancer depuis l'éditeur ---------------- */

/** Étape d'installation : lancez cette fonction une fois pour autoriser l'accès à l'agenda et aux courriels. */
function autoriser() {
  var cal = CalendarApp.getDefaultCalendar();
  console.log('Agenda : ' + cal.getName() + ' — courriels restants aujourd’hui : ' + MailApp.getRemainingDailyQuota());
}

/** Test complet : crée un faux rendez-vous dans 7 jours (à supprimer ensuite de l'agenda). */
function testerReservation() {
  var dans7jours = Utilities.formatDate(new Date(Date.now() + 7 * 24 * 3600 * 1000), CONFIG.TIMEZONE, 'yyyy-MM-dd');
  var res = doPost({ postData: { contents: JSON.stringify({
    nom: 'TEST – à supprimer', email: CONFIG.STUDIO_EMAIL, telephone: '+1 581 000 0000',
    service: 'Shooting en studio', date: dans7jours, moment: 'Après-midi', lieu: 'En studio',
    personnes: '1', message: 'Ceci est un test de la réservation en ligne.', consentement: 'Accepté'
  }) } });
  console.log(res.getContent());
}
