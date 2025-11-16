// Firebase imports
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, push, set, get, remove, onValue } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCV4Zx7vfR0Et4uDWlYsmPxUptQnRMPCes",
  authDomain: "evenements-nat.firebaseapp.com",
  databaseURL: "https://evenements-nat-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "evenements-nat",
  storageBucket: "evenements-nat.firebasestorage.app",
  messagingSenderId: "283381369320",
  appId: "1:283381369320:web:c106273508efef48503c5d",
  measurementId: "G-K8V46GMK0L"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// State management (in-memory)
const state = {
  currentTab: 'calendrier',
  isAdminLoggedIn: false,
  events: {},
  selectedEventId: null
};

const ADMIN_PASSWORD = 'admin123';

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

// Admin authentication
function initAdminForm() {
  const adminLoginForm = document.getElementById('admin-login-form');
  const adminLogoutBtn = document.getElementById('admin-logout');

  adminLoginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const password = document.getElementById('admin-password').value;
    const errorEl = document.getElementById('admin-error');

    if (password === ADMIN_PASSWORD) {
      state.isAdminLoggedIn = true;
      document.getElementById('admin-login').style.display = 'none';
      document.getElementById('admin-panel').style.display = 'block';
      loadAdminEvents();
      errorEl.style.display = 'none';
    } else {
      errorEl.textContent = 'Mot de passe incorrect';
      errorEl.style.display = 'block';
    }
  });

  adminLogoutBtn.addEventListener('click', () => {
    state.isAdminLoggedIn = false;
    document.getElementById('admin-login').style.display = 'block';
    document.getElementById('admin-panel').style.display = 'none';
    document.getElementById('admin-password').value = '';
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
      participants: {},
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
    const participantCount = event.participants ? Object.keys(event.participants).length : 0;
    const availableSeats = event.maxParticipants - participantCount;
    const isNew = isEventNew(event.createdAt);
    const categoryClass = getCategoryClass(event.category);

    return `
      <div class="event-card" onclick="showEventDetails('${event.id}')">
        <div class="event-card-header">
          <h3 class="event-card-title">${event.name}</h3>
          <span class="event-category ${categoryClass}">${event.category}</span>
        </div>
        <div class="event-card-body">
          <div class="event-info">
            <span class="event-info-icon">📅</span>
            <span>${formatDate(event.date)} à ${event.time}</span>
          </div>
          <div class="event-info">
            <span class="event-info-icon">📍</span>
            <span>${event.location}</span>
          </div>
          ${event.description ? `<p style="margin-top: 8px; color: var(--color-text-secondary);">${event.description}</p>` : ''}
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
    const participantCount = event.participants ? Object.keys(event.participants).length : 0;
    const availableSeats = event.maxParticipants - participantCount;
    const isFull = availableSeats <= 0;
    const categoryClass = getCategoryClass(event.category);

    return `
      <div class="booking-event-card">
        <div class="event-card-header">
          <h3 class="event-card-title">${event.name}</h3>
          <span class="event-category ${categoryClass}">${event.category}</span>
        </div>
        <div class="event-card-body">
          <div class="event-info">
            <span class="event-info-icon">📅</span>
            <span>${formatDate(event.date)} à ${event.time}</span>
          </div>
          <div class="event-info">
            <span class="event-info-icon">📍</span>
            <span>${event.location}</span>
          </div>
          ${event.description ? `<p style="margin-top: 8px; color: var(--color-text-secondary);">${event.description}</p>` : ''}
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
    const participantCount = event.participants ? Object.keys(event.participants).length : 0;
    const categoryClass = getCategoryClass(event.category);

    return `
      <div class="admin-event-card">
        <div class="admin-event-header">
          <div>
            <h4>${event.name}</h4>
            <span class="event-category ${categoryClass}">${event.category}</span>
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
            <span>${formatDate(event.date)} à ${event.time}</span>
          </div>
          <div class="event-info">
            <span class="event-info-icon">📍</span>
            <span>${event.location}</span>
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

  const participantCount = event.participants ? Object.keys(event.participants).length : 0;
  const availableSeats = event.maxParticipants - participantCount;
  const categoryClass = getCategoryClass(event.category);

  const modalBody = document.getElementById('event-modal-body');
  modalBody.innerHTML = `
    <div class="event-card-header">
      <h3 class="event-card-title">${event.name}</h3>
      <span class="event-category ${categoryClass}">${event.category}</span>
    </div>
    <div class="event-card-body" style="margin-top: 16px;">
      <div class="event-info">
        <span class="event-info-icon">📅</span>
        <span>${formatDate(event.date)} à ${event.time}</span>
      </div>
      <div class="event-info">
        <span class="event-info-icon">📍</span>
        <span>${event.location}</span>
      </div>
      <div class="event-info">
        <span class="event-info-icon">👥</span>
        <span>${participantCount} / ${event.maxParticipants} participants</span>
      </div>
      ${event.description ? `
        <div style="margin-top: 16px; padding: 12px; background: var(--color-secondary); border-radius: var(--radius-base);">
          <p style="margin: 0;">${event.description}</p>
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
  
  const participantCount = event.participants ? Object.keys(event.participants).length : 0;
  const availableSeats = event.maxParticipants - participantCount;

  document.getElementById('modal-event-title').textContent = `Réserver - ${event.name}`;
  document.getElementById('modal-event-details').innerHTML = `
    <div class="event-info" style="margin-bottom: 16px;">
      <span class="event-info-icon">📅</span>
      <span>${formatDate(event.date)} à ${event.time}</span>
    </div>
    <div class="event-info" style="margin-bottom: 16px;">
      <span class="event-info-icon">📍</span>
      <span>${event.location}</span>
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
  const phone = document.getElementById('booking-phone').value.trim();
  const errorEl = document.getElementById('booking-error');
  const successEl = document.getElementById('booking-success');
  
  errorEl.style.display = 'none';
  successEl.style.display = 'none';

  // Validate phone number (French format)
  if (!validatePhoneNumber(phone)) {
    errorEl.textContent = 'Numéro de téléphone invalide. Format attendu: 06 12 34 56 78 ou 0612345678';
    errorEl.style.display = 'block';
    return;
  }

  const event = state.events[state.selectedEventId];
  if (!event) {
    errorEl.textContent = 'Événement introuvable';
    errorEl.style.display = 'block';
    return;
  }

  // Check if already registered
  if (event.participants) {
    const existingParticipant = Object.values(event.participants).find(
      p => p.phone === phone
    );
    if (existingParticipant) {
      errorEl.textContent = 'Ce numéro de téléphone est déjà inscrit à cet événement';
      errorEl.style.display = 'block';
      return;
    }
  }

  // Check available seats
  const participantCount = event.participants ? Object.keys(event.participants).length : 0;
  if (participantCount >= event.maxParticipants) {
    errorEl.textContent = 'Désolé, cet événement est complet';
    errorEl.style.display = 'block';
    return;
  }

  try {
    const participantData = {
      name,
      phone,
      registeredAt: new Date().toISOString()
    };

    const participantsRef = ref(database, `events/${state.selectedEventId}/participants`);
    const newParticipantRef = push(participantsRef);
    await set(newParticipantRef, participantData);

    successEl.textContent = '✓ Inscription confirmée! Vous recevrez une confirmation.';
    successEl.style.display = 'block';
    
    setTimeout(() => {
      document.getElementById('booking-modal').classList.remove('active');
      resetBookingForm();
    }, 2000);
  } catch (error) {
    console.error('Error booking event:', error);
    errorEl.textContent = 'Erreur lors de l\'inscription. Veuillez réessayer.';
    errorEl.style.display = 'block';
  }
}

// Reset booking form
function resetBookingForm() {
  document.getElementById('booking-form').reset();
  document.getElementById('booking-error').style.display = 'none';
  document.getElementById('booking-success').style.display = 'none';
  state.selectedEventId = null;
}

// Show participants modal
window.showParticipants = async function(eventId) {
  const event = state.events[eventId];
  if (!event) return;

  const participantsModalBody = document.getElementById('participants-modal-body');
  document.getElementById('participants-modal-title').textContent = `Participants - ${event.name}`;

  if (!event.participants || Object.keys(event.participants).length === 0) {
    participantsModalBody.innerHTML = `
      <div class="empty-state">
        <p>Aucun participant inscrit</p>
      </div>
    `;
  } else {
    const participantsList = Object.entries(event.participants).map(([participantId, participant]) => `
      <div class="participant-item">
        <div class="participant-info">
          <div class="participant-name">${participant.name}</div>
          <div class="participant-phone">📱 ${participant.phone}</div>
        </div>
        <button 
          class="btn btn--danger btn--sm" 
          onclick="removeParticipant('${eventId}', '${participantId}')"
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

// Remove participant
window.removeParticipant = async function(eventId, participantId) {
  if (!confirm('Voulez-vous vraiment retirer ce participant?')) return;

  try {
    const participantRef = ref(database, `events/${eventId}/participants/${participantId}`);
    await remove(participantRef);
    
    // Refresh participants modal
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
    const eventRef = ref(database, `events/${eventId}`);
    await remove(eventRef);
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
function getUpcomingEvents() {
  const now = new Date();
  return Object.entries(state.events)
    .map(([id, event]) => ({ ...event, id }))
    .filter(event => new Date(event.date) >= now)
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

function validatePhoneNumber(phone) {
  // French phone number validation
  const cleanPhone = phone.replace(/\s+/g, '');
  const phoneRegex = /^(\+33|0)[1-9](\d{8})$/;
  return phoneRegex.test(cleanPhone);
}
