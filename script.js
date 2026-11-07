"use strict";

(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* ===== Réglages de la réservation =====
     1) RECOMMANDÉ — Agenda + courriels : collez ici l'URL de votre script Google
        (elle se termine par /exec ; voir reservation-agenda/INSTALLATION.md).
        Chaque demande crée alors un évènement « À confirmer » dans le Google Agenda
        de jalabstudio@gmail.com, envoie un courriel au studio et une confirmation au client.
     2) Tant que ce champ est vide, les demandes sont envoyées par courriel seulement (FormSubmit). */
  const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyH08ZZLtwg05hZ3fOfoUYOFkX1o54RDxFuQdj-ZZBkDrgbrnKkbTi_Zfjmo5g6V3wOTA/exec";
  const STUDIO_EMAIL = "jalabstudio@gmail.com";
  const FORM_ENDPOINT = `https://formsubmit.co/ajax/${STUDIO_EMAIL}`;
  const USE_AGENDA = /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(APPS_SCRIPT_URL.trim());

  /* ---------- Année du pied de page ---------- */
  $$("[data-year]").forEach(el => { el.textContent = String(new Date().getFullYear()); });

  /* ---------- En-tête : ombre au défilement ---------- */
  const header = $(".site-header");
  if (header) {
    const updateHeader = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });
  }

  /* ---------- Menu mobile ---------- */
  const menuToggle = $(".menu-toggle");
  const nav = $("#navigation");
  if (menuToggle && nav) {
    const label = $(".menu-label", menuToggle);
    const isOpen = () => menuToggle.getAttribute("aria-expanded") === "true";
    const setOpen = open => {
      menuToggle.setAttribute("aria-expanded", String(open));
      nav.classList.toggle("is-open", open);
      if (label) label.textContent = open ? "Fermer" : "Menu";
    };
    menuToggle.addEventListener("click", () => setOpen(!isOpen()));
    nav.addEventListener("click", event => { if (event.target.closest("a")) setOpen(false); });
    document.addEventListener("click", event => {
      if (isOpen() && !event.target.closest(".site-header")) setOpen(false);
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && isOpen()) { setOpen(false); menuToggle.focus(); }
    });
    const desktop = window.matchMedia("(min-width: 961px)");
    const onDesktop = event => { if (event.matches) setOpen(false); };
    if (desktop.addEventListener) desktop.addEventListener("change", onDesktop);
  }

  /* ---------- Lien actif dans le menu ---------- */
  const navLinks = $$('.nav a[href^="#"]:not(.btn)');
  if ("IntersectionObserver" in window && navLinks.length) {
    const byId = new Map(navLinks.map(link => [link.getAttribute("href").slice(1), link]));
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        navLinks.forEach(link => link.classList.remove("is-active"));
        const link = byId.get(entry.target.id);
        if (link) link.classList.add("is-active");
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    $$("main section[id]").forEach(section => observer.observe(section));
  }

  /* ---------- Visionneuse du portfolio ---------- */
  const gallery = $("#gallery");
  const lightbox = $("#lightbox");
  if (gallery && lightbox && typeof lightbox.showModal === "function") {
    const items = $$(".gallery-item", gallery);
    const img = $("#lightboxImg");
    const caption = $("#lightboxCaption");
    let index = 0;

    const show = i => {
      index = (i + items.length) % items.length;
      const item = items[index];
      const thumb = $("img", item);
      const fullSrc = item.getAttribute("href");
      const current = index;
      // Affiche d'abord la miniature déjà chargée, puis la version haute définition.
      img.src = thumb.currentSrc || thumb.src;
      img.alt = thumb.alt;
      caption.textContent = `${item.dataset.caption || ""} · ${index + 1} / ${items.length}`;
      const full = new Image();
      full.onload = () => { if (current === index) img.src = fullSrc; };
      full.src = fullSrc;
      const next = new Image();
      next.src = items[(index + 1) % items.length].getAttribute("href");
    };

    const close = () => {
      lightbox.close();
    };

    items.forEach((item, i) => {
      item.addEventListener("click", event => {
        event.preventDefault();
        show(i);
        lightbox.showModal();
      });
    });

    lightbox.addEventListener("close", () => {
      const item = items[index];
      if (item) item.focus({ preventScroll: false });
    });

    $("#lightboxClose").addEventListener("click", close);
    $("#lightboxPrev").addEventListener("click", () => show(index - 1));
    $("#lightboxNext").addEventListener("click", () => show(index + 1));

    lightbox.addEventListener("click", event => {
      if (event.target === lightbox || event.target.classList.contains("lightbox-figure")) close();
    });
    lightbox.addEventListener("keydown", event => {
      if (event.key === "ArrowLeft") { event.preventDefault(); show(index - 1); }
      if (event.key === "ArrowRight") { event.preventDefault(); show(index + 1); }
    });

    // Balayage sur mobile
    let startX = null;
    lightbox.addEventListener("touchstart", event => { startX = event.touches[0].clientX; }, { passive: true });
    lightbox.addEventListener("touchend", event => {
      if (startX === null) return;
      const dx = event.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 50) show(dx < 0 ? index + 1 : index - 1);
      startX = null;
    }, { passive: true });
  }

  /* ---------- Formulaire de rendez-vous ---------- */
  const form = $("#bookingForm");
  if (!form || !("fetch" in window)) return;

  const submitBtn = $("#submitBtn");
  const btnLabel = $(".btn-label", submitBtn);
  const status = $("#formStatus");
  const successBox = $("#formSuccess");
  const errorBox = $("#formError");
  const errorText = $("#errorText");
  const recap = $("#successRecap");
  const mailtoLink = $("#mailtoFallback");
  const copyBtn = $("#copyRequest");
  const copyStatus = $("#copyStatus");
  const dateInput = $("#f-date");
  const serviceSelect = $("#f-service");
  const DEFAULT_ERROR = errorText.textContent;
  let lastText = "";
  let lastSubject = "";

  const pad = n => String(n).padStart(2, "0");
  const todayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };
  const formatDate = iso => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("fr-CA", {
      weekday: "long", day: "numeric", month: "long", year: "numeric"
    });
  };

  dateInput.min = todayISO();

  // Un clic sur « Réserver cette séance » présélectionne le service.
  $$("[data-service]").forEach(link => {
    link.addEventListener("click", () => {
      const value = link.dataset.service;
      if ([...serviceSelect.options].some(option => option.value === value)) serviceSelect.value = value;
    });
  });

  const collect = () => {
    const data = {};
    new FormData(form).forEach((value, key) => {
      data[key] = typeof value === "string" ? value.trim() : value;
    });
    return data;
  };

  const fieldsFor = raw => ([
    ["Nom", raw["Nom"]],
    ["Courriel", raw.email],
    ["Téléphone", raw["Téléphone"] || "Non précisé"],
    ["Type de séance", raw["Type de séance"]],
    ["Date souhaitée", formatDate(raw["Date souhaitée"])],
    ["Moment préféré", raw["Moment préféré"]],
    ["Lieu", raw["Lieu"]],
    ["Nombre de personnes", raw["Nombre de personnes"] || "Non précisé"]
  ]);

  const buildPayload = raw => {
    const payload = { ...raw };
    payload["Téléphone"] = raw["Téléphone"] || "Non précisé";
    payload["Date souhaitée"] = formatDate(raw["Date souhaitée"]);
    payload["Nombre de personnes"] = raw["Nombre de personnes"] || "Non précisé";
    payload["Message"] = raw["Message"] || "Aucun message";
    payload._subject = lastSubject;
    payload._replyto = raw.email;
    return payload;
  };

  // Données envoyées au script Google (noms simples, date au format AAAA-MM-JJ pour l'agenda).
  const buildAgendaPayload = raw => ({
    nom: raw["Nom"],
    email: raw.email,
    telephone: raw["Téléphone"],
    service: raw["Type de séance"],
    date: raw["Date souhaitée"],
    moment: raw["Moment préféré"],
    lieu: raw["Lieu"],
    personnes: raw["Nombre de personnes"],
    message: raw["Message"],
    consentement: raw["Consentement"],
    website: raw._honey
  });

  const sendRequest = (raw, signal) => {
    if (USE_AGENDA) {
      // Corps en texte brut : requête « simple » acceptée par Google Apps Script sans pré-vérification CORS.
      return fetch(APPS_SCRIPT_URL.trim(), {
        method: "POST",
        body: JSON.stringify(buildAgendaPayload(raw)),
        redirect: "follow",
        signal
      });
    }
    return fetch(FORM_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(buildPayload(raw)),
      referrerPolicy: "strict-origin-when-cross-origin",
      signal
    });
  };

  const buildText = raw => {
    const lines = fieldsFor(raw).map(([label, value]) => `${label} : ${value}`);
    return [
      "Bonjour JA Lab Studio, je souhaite réserver une séance photo.",
      "",
      ...lines,
      "",
      "Message :",
      raw["Message"] || "Aucun message"
    ].join("\n");
  };

  const setSending = sending => {
    form.classList.toggle("is-sending", sending);
    submitBtn.disabled = sending;
    submitBtn.setAttribute("aria-busy", String(sending));
    btnLabel.textContent = sending ? "Envoi en cours…" : "Envoyer ma demande";
    status.classList.remove("is-error");
    status.textContent = sending ? "Envoi de votre demande au studio…" : "";
  };

  const showPanel = panel => {
    form.hidden = panel !== form;
    successBox.hidden = panel !== successBox;
    errorBox.hidden = panel !== errorBox;
    if (panel !== form) {
      panel.focus({ preventScroll: true });
      panel.closest(".booking-card").scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const showSuccess = raw => {
    recap.replaceChildren();
    [["Nom", raw["Nom"]], ["Séance", raw["Type de séance"]], ["Date souhaitée", formatDate(raw["Date souhaitée"])], ["Courriel", raw.email]]
      .forEach(([label, value]) => {
        const dt = document.createElement("dt");
        const dd = document.createElement("dd");
        dt.textContent = label;
        dd.textContent = value || "—";
        recap.append(dt, dd);
      });
    showPanel(successBox);
  };

  const showError = message => {
    errorText.textContent = /activ/i.test(message || "")
      ? "Le formulaire de réservation est en cours d’activation. En attendant, envoyez votre demande directement au studio :"
      : DEFAULT_ERROR;
    mailtoLink.href = `mailto:${STUDIO_EMAIL}?subject=${encodeURIComponent(lastSubject)}&body=${encodeURIComponent(lastText)}`;
    copyStatus.textContent = "";
    showPanel(errorBox);
  };

  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (form.classList.contains("is-sending")) return;

    dateInput.min = todayISO();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const raw = collect();
    lastSubject = `Nouveau rendez-vous : ${raw["Type de séance"]} – ${formatDate(raw["Date souhaitée"])} – ${raw["Nom"]}`;
    lastText = buildText(raw);

    // Champ piège rempli : c'est un robot, on n'envoie rien.
    if (raw._honey) {
      showSuccess(raw);
      return;
    }

    setSending(true);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await sendRequest(raw, controller.signal);
      const result = await response.json().catch(() => ({}));
      const ok = response.ok && (result.success === true || result.success === "true");
      setSending(false);
      if (ok) {
        showSuccess(raw);
        form.reset();
        dateInput.min = todayISO();
      } else {
        showError(result.message);
      }
    } catch (error) {
      setSending(false);
      showError("");
    } finally {
      clearTimeout(timer);
    }
  });

  $("#newRequest").addEventListener("click", () => {
    showPanel(form);
    $("#f-nom").focus();
  });

  $("#retryRequest").addEventListener("click", () => {
    showPanel(form);
    submitBtn.focus();
  });

  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(lastText);
      copyStatus.textContent = "Demande copiée. Collez-la dans WhatsApp ou dans votre courriel.";
    } catch {
      const area = document.createElement("textarea");
      area.value = lastText;
      area.setAttribute("readonly", "");
      area.className = "hp";
      document.body.append(area);
      area.select();
      let copied = false;
      try { copied = document.execCommand("copy"); } catch { copied = false; }
      area.remove();
      copyStatus.textContent = copied
        ? "Demande copiée. Collez-la dans WhatsApp ou dans votre courriel."
        : "Copie impossible : utilisez plutôt le bouton « Envoyer par courriel ».";
    }
  });
})();
