const form = document.getElementById('bookingForm');
const formMessage = document.getElementById('formMessage');
const yearEl = document.getElementById('year');

if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}

if (form) {
  form.addEventListener('submit', function (e) {
    e.preventDefault();

    const data = new FormData(form);
    const nom = data.get('nom');
    const email = data.get('email');
    const telephone = data.get('telephone');
    const service = data.get('service');
    const date = data.get('date');
    const message = data.get('message') || 'Aucun détail supplémentaire';

    const whatsappMessage = `Bonjour JA Lab Studio, je souhaite prendre un rendez-vous.%0A%0ANom: ${encodeURIComponent(nom)}%0AEmail: ${encodeURIComponent(email)}%0ATéléphone: ${encodeURIComponent(telephone)}%0AService: ${encodeURIComponent(service)}%0ADate souhaitée: ${encodeURIComponent(date)}%0AMessage: ${encodeURIComponent(message)}`;

    formMessage.textContent = `Merci ${nom} ! Votre demande est prête. Vous allez être redirigé vers WhatsApp pour l'envoyer à JA Lab Studio.`;

    setTimeout(() => {
      window.open(`https://wa.me/message/3RZIZTAQAWMLC1?text=${whatsappMessage}`, '_blank');
    }, 700);

    form.reset();
  });
}
