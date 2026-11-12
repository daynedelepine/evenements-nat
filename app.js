// Firebase imports
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, push, set, update, onValue } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// Configuration Firebase : projet de TEST en local (localhost), production sinon.
const CONFIGS = {
  prod: {
    apiKey: "AIzaSyCV4Zx7vfR0Et4uDWlYsmPxUptQnRMPCes",
    authDomain: "evenements-nat.firebaseapp.com",
    databaseURL: "https://evenements-nat-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "evenements-nat",
    storageBucket: "evenements-nat.firebasestorage.app",
    messagingSenderId: "283381369320",
    appId: "1:283381369320:web:c106273508efef48503c5d",
    measurementId: "G-K8V46GMK0L"
  },
  test: {
    apiKey: "AIzaSyDVZ3XM0W6q8TbSCK9GUWTeE9gHevNFMe0",
    authDomain: "evenements-nat-test.firebaseapp.com",
    databaseURL: "https://evenements-nat-test-default-rtdb.firebaseio.com",
    projectId: "evenements-nat-test",
    storageBucket: "evenements-nat-test.firebasestorage.app",
    messagingSenderId: "193804076960",
    appId: "1:193804076960:web:0a6e5bc00728c6aff006c5"
  }
};
const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname);
const app = initializeApp(isLocal ? CONFIGS.test : CONFIGS.prod);
const database = getDatabase(app);
const auth = getAuth(app);

// Compte administrateur (identifiant public, sans danger : les règles Firebase font foi)
const ADMIN_UID = 'hSfCSlm2tdSnc6WMARMheQP7NpY2';

// State management (in-memory)
const state = {
  currentTab: 'calendrier',
  isAdminLoggedIn: false,
  events: {},
  registrations: {},
  selectedEventId: null
};

// Échappement HTML : tout texte saisi par un utilisateur passe par esc() avant innerHTML
function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initModals();
  initAdminForm();
  initCreateEventForm();
  loadEvents();
});

// Tab navigation
function initTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetTab = button.getAttribute('data-tab');
      
      // Update active states
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabPanes.forEach(pane => pane.classList.remove('active'));
      
      button.classList.add('active');
      document.getElementById(`${targetTab}-tab`).classList.add('active');
      
      state.currentTab = targetTab;
    });
  });
}

// Modal management
function initModals() {
  // Booking modal
  const bookingModal = document.getElementById('booking-modal');
  const closeBookingModal = document.getElementById('close-booking-modal');
  
  closeBookingModal.addEventListener('click', () => {
    bookingModal.classList.remove('active');
    resetBookingForm();
  });

  // Event details modal
  const eventModal = document.getElementById('event-modal');
  const closeEventModal = document.getElementById('close-event-modal');
  
  closeEventModal.addEventListener('click', () => {
    eventModal.classList.remove('active');
  });

  // Participants modal
  const participantsModal = document.getElementById('participants-modal');
  const closeParticipantsModal = document.getElementById('close-participants-modal');
  
  closeParticipantsModal.addEventListener('click', () => {
    participantsModal.classList.remove('active');
  });

  // Close modals when clicking outside
  window.addEventListener('click', (e) => {
    if (e.target === bookingModal) {
      bookingModal.classList.remove('active');
      resetBookingForm();
    }
    if (e.target === eventModal) {
      eventModal.classList.remove('active');
    }
    if (e.target === participantsModal) {
      participantsModal.classList.remove('active');
    }
  });

  // Booking form submission
  const bookingForm = document.getElementById('booking-form');
  bookingForm.addEventListener('submit', handleBookingSubmit);
}

// Admin authentication (Firebase Authentication, compte unique)
let unsubRegistrations = null;

function watchRegistrations() {
  if (unsubRegistrations) unsubRegistrations();
  unsubRegistrations = onValue(ref(database, 'registrations'), (snapshot) => {
    state.registrations = snapshot.val() || {};
    renderAdminEventsList();
  }, (error) => console.error('Lecture des inscriptions refusée :', error.code));
}

function initAdminForm() {
  const adminLoginForm = document.getElementById('admin-login-form');
  const adminLogoutBtn = document.getElementById('admin-logout');
  const errorEl = document.getElementById('admin-error');

  adminLoginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.style.display = 'none';
    const email = document.getElementById('admin-email').value.trim();
    const password = document.getElementById('admin-password').value;
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      errorEl.textContent = 'Identifiants incorrects';
      errorEl.style.display = 'block';
    }
  });

  adminLogoutBtn.addEventListener('click', () => signOut(auth));

  onAuthStateChanged(auth, (user) => {
    if (user && user.uid !== ADMIN_UID) {
      signOut(auth);
      errorEl.textContent = 'Ce compte n\u2019est pas autorisé';
      errorEl.style.display = 'block';
      return;
    }
    state.isAdminLoggedIn = !!user;
    document.getElementById('admin-login').style.display = user ? 'none' : 'block';
    document.getElementById('admin-panel').style.display = user ? 'block' : 'none';
    if (user) {
      watchRegistrations();
      loadAdminEvents();
    } else {
      if (unsubRegistrations) { unsubRegistrations(); unsubRegistrations = null; }
      state.registrations = {};
      document.getElementById('admin-password').value = '';
    }
  });
}

// Create event form
function initCreateEventForm() {
  const createEventForm = document.getElementById('create-event-form');
  
  createEventForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const eventData = {
      name: document.getElementById('event-name').value,
      category: document.getElementById('event-category').value,
      date: document.getElementById('event-date').value,
      time: document.getElementById('event-time').value,
      location: document.getElementById('event-location').value,
      description: document.getElementById('event-description').value,
      maxParticipants: parseInt(document.getElementById('event-max-participants').value),
      taken: 0,
      createdAt: new Date().toISOString()
    };

    try {
      const eventsRef = ref(database, 'events');
      const newEventRef = push(eventsRef);
      await set(newEventRef, eventData);
      
      createEventForm.reset();
      alert('Événement créé avec succès!');
      loadAdminEvents();
    } catch (error) {
      console.error('Error creating event:', error);
      alert('Erreur lors de la création de l\'événement');
    }
  });
}

// Load events from Firebase
function loadEvents() {
  const eventsRef = ref(database, 'events');
  
  onValue(eventsRef, (snapshot) => {
    const data = snapshot.val();
    state.events = data || {};
    
    renderEventsList();
    renderBookingEventsList();
    
    if (state.isAdminLoggedIn) {
      renderAdminEventsList();
    }
  });
}

// Render events list (Calendrier tab)
function renderEventsList() {
  const eventsListEl = document.getElementById('events-list');
  const events = getUpcomingEvents();

  if (events.length === 0) {
    eventsListEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📅</div>
        <p class="empty-state-text">Aucun événement à venir</p>
      </div>
    `;
    return;
  }

  eventsListEl.innerHTML = events.map(event => {
    const participantCount = (event.taken || 0);
    const availableSeats = event.maxParticipants - participantCount;
    const isNew = isEventNew(event.createdAt);
    const categoryClass = getCategoryClass(event.category);

    return `
      <div class="event-card" onclick="showEventDetails('${event.id}')">
        <div class="event-card-header">
          <h3 class="event-card-title">${esc(event.name)}</h3>
          <span class="event-category ${categoryClass}">${esc(event.category)}</span>
        </div>
        <div class="event-card-body">
          <div class="event-info">
            <span class="event-info-icon">📅</span>
            <span>${formatDate(event.date)} à ${esc(event.time)}</span>
          </div>
          <div class="event-info">
            <span class="event-info-icon">📍</span>
            <span>${esc(event.location)}</span>
          </div>
          ${event.description ? `<p style="margin-top: 8px; color: var(--color-text-secondary);">${esc(event.description)}</p>` : ''}
        </div>
        <div class="event-card-footer">
          <span class="seats-info">
            Places: <span class="${availableSeats > 0 ? 'seats-available' : 'seats-full'}">
              ${availableSeats > 0 ? `${availableSeats} disponible${availableSeats > 1 ? 's' : ''}` : 'Complet'}
            </span>
          </span>
          ${isNew ? '<span class="new-badge">Nouveau</span>' : ''}
        </div>
      </div>
    `;
  }).join('');
}

// Render booking events list
function renderBookingEventsList() {
  const bookingEventsListEl = document.getElementById('booking-events-list');
  const events = getUpcomingEvents();

  if (events.length === 0) {
    bookingEventsListEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📅</div>
        <p class="empty-state-text">Aucun événement à venir</p>
      </div>
    `;
    return;
  }

  bookingEventsListEl.innerHTML = events.map(event => {
    const participantCount = (event.taken || 0);
    const availableSeats = event.maxParticipants - participantCount;
    const isFull = availableSeats <= 0;
    const categoryClass = getCategoryClass(event.category);

    return `
      <div class="booking-event-card">
        <div class="event-card-header">
          <h3 class="event-card-title">${esc(event.name)}</h3>
          <span class="event-category ${categoryClass}">${esc(event.category)}</span>
        </div>
        <div class="event-card-body">
          <div class="event-info">
            <span class="event-info-icon">📅</span>
            <span>${formatDate(event.date)} à ${esc(event.time)}</span>
          </div>
          <div class="event-info">
            <span class="event-info-icon">📍</span>
            <span>${esc(event.location)}</span>
          </div>
          ${event.description ? `<p style="margin-top: 8px; color: var(--color-text-secondary);">${esc(event.description)}</p>` : ''}
        </div>
        <div class="event-card-footer">
          <span class="seats-info">
            Places: <span class="${availableSeats > 0 ? 'seats-available' : 'seats-full'}">
              ${availableSeats > 0 ? `${availableSeats} disponible${availableSeats > 1 ? 's' : ''}` : 'Complet'}
            </span>
          </span>
          <button 
            class="btn btn--primary btn--sm" 
            onclick="openBookingModal('${event.id}')"
            ${isFull ? 'disabled' : ''}
          >
            ${isFull ? 'Complet' : 'S\'inscrire'}
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// Render admin events list
function renderAdminEventsList() {
  const adminEventsListEl = document.getElementById('admin-events-list');
  const events = getAllEvents();

  if (events.length === 0) {
    adminEventsListEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📅</div>
        <p class="empty-state-text">Aucun événement</p>
      </div>
    `;
    return;
  }

  adminEventsListEl.innerHTML = events.map(event => {
    const participantCount = (event.taken || 0);
    const categoryClass = getCategoryClass(event.category);

    return `
      <div class="admin-event-card">
        <div class="admin-event-header">
          <div>
            <h4>${esc(event.name)}</h4>
            <span class="event-category ${categoryClass}">${esc(event.category)}</span>
          </div>
          <div class="admin-event-actions">
            <button class="btn btn--secondary btn--sm" onclick="showParticipants('${event.id}')">
              👥 Inscrits (${participantCount})
            </button>
            <button class="btn btn--danger btn--sm" onclick="deleteEvent('${event.id}')">
              🗑️ Supprimer
            </button>
          </div>
        </div>
        <div class="event-card-body">
          <div class="event-info">
            <span class="event-info-icon">📅</span>
            <span>${formatDate(event.date)} à ${esc(event.time)}</span>
          </div>
          <div class="event-info">
            <span class="event-info-icon">📍</span>
            <span>${esc(event.location)}</span>
          </div>
          <div class="event-info">
            <span class="event-info-icon">👥</span>
            <span>Max: ${event.maxParticipants} participants</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Show event details modal
window.showEventDetails = function(eventId) {
  const event = state.events[eventId];
  if (!event) return;

  const participantCount = (event.taken || 0);
  const availableSeats = event.maxParticipants - participantCount;
  const categoryClass = getCategoryClass(event.category);

  const modalBody = document.getElementById('event-modal-body');
  modalBody.innerHTML = `
    <div class="event-card-header">
      <h3 class="event-card-title">${esc(event.name)}</h3>
      <span class="event-category ${categoryClass}">${esc(event.category)}</span>
    </div>
    <div class="event-card-body" style="margin-top: 16px;">
      <div class="event-info">
        <span class="event-info-icon">📅</span>
        <span>${formatDate(event.date)} à ${esc(event.time)}</span>
      </div>
      <div class="event-info">
        <span class="event-info-icon">📍</span>
        <span>${esc(event.location)}</span>
      </div>
      <div class="event-info">
        <span class="event-info-icon">👥</span>
        <span>${participantCount} / ${event.maxParticipants} participants</span>
      </div>
      ${event.description ? `
        <div style="margin-top: 16px; padding: 12px; background: var(--color-secondary); border-radius: var(--radius-base);">
          <p style="margin: 0;">${esc(event.description)}</p>
        </div>
      ` : ''}
    </div>
    <div style="margin-top: 20px;">
      <button 
        class="btn btn--primary btn--full-width" 
        onclick="openBookingModal('${eventId}')"
        ${availableSeats <= 0 ? 'disabled' : ''}
      >
        ${availableSeats <= 0 ? 'Complet' : 'S\'inscrire à cet événement'}
      </button>
    </div>
  `;

  document.getElementById('event-modal').classList.add('active');
}

// Open booking modal
window.openBookingModal = function(eventId) {
  const event = state.events[eventId];
  if (!event) return;

  state.selectedEventId = eventId;
  
  const participantCount = (event.taken || 0);
  const availableSeats = event.maxParticipants - participantCount;

  document.getElementById('modal-event-title').textContent = `Réserver - ${esc(event.name)}`;
  document.getElementById('modal-event-details').innerHTML = `
    <div class="event-info" style="margin-bottom: 16px;">
      <span class="event-info-icon">📅</span>
      <span>${formatDate(event.date)} à ${esc(event.time)}</span>
    </div>
    <div class="event-info" style="margin-bottom: 16px;">
      <span class="event-info-icon">📍</span>
      <span>${esc(event.location)}</span>
    </div>
    <div class="seats-info" style="margin-bottom: 20px;">
      Places disponibles: <span class="seats-available">${availableSeats}</span>
    </div>
  `;

  // Close event modal if open
  document.getElementById('event-modal').classList.remove('active');
  document.getElementById('booking-modal').classList.add('active');
}

// Handle booking form submission
async function handleBookingSubmit(e) {
  e.preventDefault();

  const name = document.getElementById('booking-name').value.trim();
  const phone = normalizePhone(document.getElementById('booking-phone').value);
  const errorEl = document.getElementById('booking-error');
  const successEl = document.getElementById('booking-success');
  const submitBtn = document.querySelector('#booking-form button[type="submit"]');
  const showError = (msg) => { errorEl.textContent = msg; errorEl.style.display = 'block'; };

  errorEl.style.display = 'none';
  successEl.style.display = 'none';

  if (name.length < 2) { showError('Indiquez votre nom (2 caractères minimum).'); return; }
  if (!validatePhoneNumber(phone)) {
    showError('Numéro de téléphone invalide. Format attendu: 06 12 34 56 78 ou 0612345678');
    return;
  }

  const eventId = state.selectedEventId;
  const event = state.events[eventId];
  if (!event) { showError('Événement introuvable'); return; }

  const taken = event.taken || 0;
  if (taken >= event.maxParticipants) { showError('Désolé, cet événement est complet'); return; }

  // Une seule écriture atomique : inscription + numéro (anti-doublon) + compteur de places.
  // Les règles Firebase refusent l'écriture si le compteur n'est pas exactement taken + 1.
  const registrationId = push(ref(database, `registrations/${eventId}`)).key;
  const updates = {
    [`registrations/${eventId}/${registrationId}`]: { name, phone, people: 1, status: 'ok', createdAt: Date.now() },
    [`phones/${eventId}/${phone}`]: registrationId,
    [`events/${eventId}/taken`]: taken + 1
  };

  submitBtn.disabled = true;
  try {
    await update(ref(database), updates);
    successEl.textContent = '✓ Inscription enregistrée !';
    successEl.style.display = 'block';
    setTimeout(() => {
      document.getElementById('booking-modal').classList.remove('active');
      resetBookingForm();
    }, 2000);
  } catch (error) {
    console.error('Error booking event:', error.code || error);
    showError(error.code === 'PERMISSION_DENIED'
      ? 'Inscription impossible : ce numéro est déjà inscrit, ou l\u2019événement vient de se remplir. Actualisez la page.'
      : 'Erreur lors de l\u2019inscription. Veuillez réessayer.');
  } finally {
    submitBtn.disabled = false;
  }
}

// Reset booking form
function resetBookingForm() {
  document.getElementById('booking-form').reset();
  document.getElementById('booking-error').style.display = 'none';
  document.getElementById('booking-success').style.display = 'none';
  state.selectedEventId = null;
}

// Show participants modal (admin : lit /registrations, protégé par les règles)
window.showParticipants = function(eventId) {
  const event = state.events[eventId];
  if (!event) return;

  const participantsModalBody = document.getElementById('participants-modal-body');
  document.getElementById('participants-modal-title').textContent = `Participants - ${event.name}`;
  const registrations = Object.entries(state.registrations[eventId] || {});

  if (registrations.length === 0) {
    participantsModalBody.innerHTML = `
      <div class="empty-state">
        <p>Aucun participant inscrit</p>
      </div>
    `;
  } else {
    const participantsList = registrations.map(([participantId, participant]) => `
      <div class="participant-item">
        <div class="participant-info">
          <div class="participant-name">${esc(participant.name)}</div>
          <div class="participant-phone">📱 ${esc(participant.phone)}</div>
        </div>
        <button
          class="btn btn--danger btn--sm"
          onclick="removeParticipant('${esc(eventId)}', '${esc(participantId)}')"
        >
          Retirer
        </button>
      </div>
    `).join('');

    participantsModalBody.innerHTML = `
      <div class="participants-list">
        ${participantsList}
      </div>
    `;
  }

  document.getElementById('participants-modal').classList.add('active');
}

// Remove participant (admin) : supprime l'inscription, son numéro et libère la place
window.removeParticipant = async function(eventId, participantId) {
  if (!confirm('Voulez-vous vraiment retirer ce participant?')) return;

  const registration = (state.registrations[eventId] || {})[participantId];
  if (!registration) return;

  const updates = {
    [`registrations/${eventId}/${participantId}`]: null,
    [`phones/${eventId}/${registration.phone}`]: null
  };
  if (registration.status !== 'wait') {
    updates[`events/${eventId}/taken`] = Math.max(0, (state.events[eventId].taken || 0) - (registration.people || 1));
  }

  try {
    await update(ref(database), updates);
    showParticipants(eventId);
  } catch (error) {
    console.error('Error removing participant:', error);
    alert('Erreur lors de la suppression du participant');
  }
}

// Delete event
window.deleteEvent = async function(eventId) {
  if (!confirm('Voulez-vous vraiment supprimer cet événement?')) return;

  try {
    await update(ref(database), {
      [`events/${eventId}`]: null,
      [`registrations/${eventId}`]: null,
      [`phones/${eventId}`]: null
    });
    alert('Événement supprimé avec succès');
  } catch (error) {
    console.error('Error deleting event:', error);
    alert('Erreur lors de la suppression de l\'événement');
  }
}

// Load admin events
function loadAdminEvents() {
  renderAdminEventsList();
}

// Utility functions
function isoToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getUpcomingEvents() {
  const now = new Date();
  return Object.entries(state.events)
    .map(([id, event]) => ({ ...event, id }))
    .filter(event => event.date >= isoToday())
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

function getAllEvents() {
  return Object.entries(state.events)
    .map(([id, event]) => ({ ...event, id }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('fr-FR', options);
}

function getCategoryClass(category) {
  const categoryMap = {
    'Cafés Nat': 'category-cafes',
    'Tables d\'hôtes': 'category-tables',
    'ApéroNus': 'category-aperos'
  };
  return categoryMap[category] || 'category-cafes';
}

function isEventNew(createdAt) {
  const created = new Date(createdAt);
  const now = new Date();
  const hoursSinceCreation = (now - created) / (1000 * 60 * 60);
  return hoursSinceCreation < 48; // New if created in last 48 hours
}

function normalizePhone(phone) {
  return String(phone).replace(/[\s.\-]/g, '').replace(/^\+33/, '0');
}

function validatePhoneNumber(phone) {
  // Numéro français : 10 chiffres commençant par 0 (ou +33 converti)
  return /^0[1-9][0-9]{8}$/.test(normalizePhone(phone));
}
