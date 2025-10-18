/* script.js
 * Handles booking form submissions, contact messages, and admin dashboard functions.
 */

// Utility: Read from local storage
function getStorage(key) {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

// Utility: Save to local storage
function setStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// Booking form submission handler
function handleBooking(event) {
  event.preventDefault();
  const form = event.target;
  const formMessage = document.getElementById('formMessage');
  formMessage.textContent = '';

  // Collect form data
  const booking = {
    name: form.name.value.trim(),
    phone: form.phone.value.trim(),
    email: form.email.value.trim(),
    vehicle: form.vehicle.value,
    serviceType: form.serviceType.value,
    pickup: form.pickup.value.trim(),
    destination: form.destination.value.trim(),
    datetime: form.datetime.value,
    notes: form.notes.value.trim(),
    createdAt: new Date().toISOString()
  };

  // Basic validation
  if (!booking.name || !booking.phone || !booking.email || !booking.vehicle || !booking.serviceType || !booking.pickup) {
    formMessage.style.color = 'red';
    formMessage.textContent = 'Please fill in all required fields.';
    return;
  }
  // If datetime is not provided, set to current date/time for record-keeping
  if (!booking.datetime) {
    booking.datetime = new Date().toISOString();
  }

  const bookings = getStorage('bookings');
  bookings.push(booking);
  setStorage('bookings', bookings);

  form.reset();
  formMessage.style.color = 'green';
  formMessage.textContent = 'Your request has been submitted successfully! We will contact you shortly.';
}

// Load bookings into admin table
function loadBookings() {
  const bookings = getStorage('bookings');
  const tbody = document.querySelector('#bookingsTable tbody');
  const noBookings = document.getElementById('noBookings');
  tbody.innerHTML = '';

  if (!bookings || bookings.length === 0) {
    noBookings.textContent = 'No bookings have been made yet.';
    return;
  }
  noBookings.textContent = '';

  bookings.forEach((booking, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${booking.name}</td>
      <td>${booking.phone}</td>
      <td>${booking.email}</td>
      <td>${booking.vehicle}</td>
      <td>${booking.serviceType}</td>
      <td>${booking.pickup}</td>
      <td>${booking.destination || ''}</td>
      <td>${new Date(booking.datetime).toLocaleString()}</td>
      <td>${booking.notes || ''}</td>
      <td><button class="btn" data-index="${index}">Delete</button></td>
    `;
    tbody.appendChild(tr);
  });

  // Attach delete handlers
  tbody.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', function () {
      const idx = parseInt(this.getAttribute('data-index'), 10);
      deleteBooking(idx);
    });
  });
}

// Delete booking by index
function deleteBooking(index) {
  const bookings = getStorage('bookings');
  if (index >= 0 && index < bookings.length) {
    if (confirm('Are you sure you want to delete this booking?')) {
      bookings.splice(index, 1);
      setStorage('bookings', bookings);
      loadBookings();
    }
  }
}

// Load messages into messages table
function loadMessages() {
  const messages = getStorage('messages');
  const tbody = document.querySelector('#messagesTable tbody');
  const noMessages = document.getElementById('noMessages');
  if (!tbody) return;
  tbody.innerHTML = '';
  if (!messages || messages.length === 0) {
    if (noMessages) noMessages.textContent = 'No messages have been received yet.';
    return;
  }
  if (noMessages) noMessages.textContent = '';
  messages.forEach((message, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${message.name}</td>
      <td>${message.email}</td>
      <td>${message.subject}</td>
      <td>${message.message}</td>
      <td>${new Date(message.createdAt).toLocaleString()}</td>
      <td><button class="btn" data-index="${index}">Delete</button></td>
    `;
    tbody.appendChild(tr);
  });
  tbody.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', function() {
      const idx = parseInt(this.getAttribute('data-index'), 10);
      deleteMessage(idx);
    });
  });
}

// Delete message by index
function deleteMessage(index) {
  const messages = getStorage('messages');
  if (index >= 0 && index < messages.length) {
    if (confirm('Are you sure you want to delete this message?')) {
      messages.splice(index, 1);
      setStorage('messages', messages);
      loadMessages();
    }
  }
}

/* ---------------------------------------------------------------------------
 * Booking assignment
 * Assigns a provider to a new booking. The simplest strategy assigns the first
 * available provider from the users list. Updates the booking object stored
 * in localStorage with providerEmail and status="assigned" if a provider is
 * found.
 */
function assignProvider(newBooking) {
  // Only assign if provider not already set
  if (newBooking.providerEmail) return;
  const users = getUsers();
  // find first provider
  const provider = users.find(u => u.role === 'provider');
  if (provider) {
    // update newBooking in storage (bookings array)
    let bookings = getStorage('bookings');
    const index = bookings.findIndex(b => b.createdAt === newBooking.createdAt && b.email === newBooking.email);
    if (index !== -1) {
      bookings[index].providerEmail = provider.email;
      bookings[index].status = 'assigned';
      setStorage('bookings', bookings);
    }
  }
}

/* ---------------------------------------------------------------------------
 * Provider action handlers
 * Providers can accept, decline, or complete service requests from their dashboard.
 */
function acceptRequest(createdAt) {
  const bookings = getStorage('bookings');
  const current = getCurrentUser();
  if (!bookings || !current) return;
  const booking = bookings.find(b => b.createdAt === createdAt);
  if (booking) {
    booking.providerEmail = current.email;
    booking.status = 'assigned';
    // remove provider from declined list if present
    if (booking.declinedProviders) {
      booking.declinedProviders = booking.declinedProviders.filter(e => e !== current.email);
    }
    setStorage('bookings', bookings);
    loadProviderDashboard();
  }
}

function declineRequest(createdAt) {
  const bookings = getStorage('bookings');
  const current = getCurrentUser();
  if (!bookings || !current) return;
  const booking = bookings.find(b => b.createdAt === createdAt);
  if (booking) {
    if (!booking.declinedProviders) booking.declinedProviders = [];
    if (!booking.declinedProviders.includes(current.email)) {
      booking.declinedProviders.push(current.email);
    }
    setStorage('bookings', bookings);
    loadProviderDashboard();
  }
}

function completeRequest(createdAt) {
  const bookings = getStorage('bookings');
  const current = getCurrentUser();
  if (!bookings || !current) return;
  const booking = bookings.find(b => b.createdAt === createdAt);
  if (booking && booking.providerEmail === current.email) {
    booking.status = 'completed';
    setStorage('bookings', bookings);
    loadProviderDashboard();
  }
}

// Contact form handler
function handleContact(event) {
  event.preventDefault();
  const form = event.target;
  const messageEl = document.getElementById('contactMessage');
  messageEl.textContent = '';

  const contact = {
    name: form.contactName.value.trim(),
    email: form.contactEmail.value.trim(),
    subject: form.subject.value.trim(),
    message: form.message.value.trim(),
    createdAt: new Date().toISOString()
  };

  if (!contact.name || !contact.email || !contact.subject || !contact.message) {
    messageEl.style.color = 'red';
    messageEl.textContent = 'Please complete all fields.';
    return;
  }

  const messages = getStorage('messages');
  messages.push(contact);
  setStorage('messages', messages);

  form.reset();
  messageEl.style.color = 'green';
  messageEl.textContent = 'Thank you! Your message has been received.';
}

// Attach event listeners for forms when the DOM content is loaded
document.addEventListener('DOMContentLoaded', function () {
  const bookingForm = document.getElementById('bookingForm');
  if (bookingForm) {
    bookingForm.addEventListener('submit', handleBooking);
  }
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', handleContact);
  }

  // If on login page, attach login/signup handlers
  const formLogin = document.getElementById('formLogin');
  const formSignup = document.getElementById('formSignup');
  if (formLogin) {
    formLogin.addEventListener('submit', handleLogin);
  }
  if (formSignup) {
    formSignup.addEventListener('submit', handleSignup);
  }

  // Initialize dashboards
  const bookingsListEl = document.getElementById('bookingsList');
  const requestsListEl = document.getElementById('requestsList');
  if (bookingsListEl) {
    // capture location for dashboard map
    captureLocation();
    loadUserDashboard();
  }
  if (requestsListEl) {
    // capture location for provider map
    captureLocation();
    loadProviderDashboard();
  }

  // Capture geolocation on booking page
  if (bookingForm && navigator.geolocation) {
    captureLocation();
  }

  // Chat messenger handlers
  const chatForm = document.getElementById('chatForm');
  if (chatForm) {
    chatForm.addEventListener('submit', handleChatSubmit);
    loadChatMessages();
  }
});

/* ---------------------------------------------------------------------------
 * User authentication and dashboard logic
 * Users are stored in localStorage under the key 'users' and current user under
 * 'currentUser'. Passwords are stored in plain text purely for demonstration.
 */

// Read users from storage
function getUsers() {
  return getStorage('users');
}

// Write users to storage
function setUsers(users) {
  setStorage('users', users);
}

// Get current logged in user
function getCurrentUser() {
  const data = localStorage.getItem('currentUser');
  return data ? JSON.parse(data) : null;
}

// Set current logged in user
function setCurrentUser(user) {
  if (user) {
    localStorage.setItem('currentUser', JSON.stringify(user));
  } else {
    localStorage.removeItem('currentUser');
  }
}

// Handle user sign up
function handleSignup(e) {
  e.preventDefault();
  const name = document.getElementById('signupName').value.trim();
  const phone = document.getElementById('signupPhone').value.trim();
  const email = document.getElementById('signupEmail').value.trim().toLowerCase();
  const password = document.getElementById('signupPassword').value;
  const role = document.getElementById('signupRole').value;
  const carType = document.getElementById('signupCarType') ? document.getElementById('signupCarType').value : null;
  const msgEl = document.getElementById('signupMsg');
  msgEl.textContent = '';

  if (!name || !phone || !email || !password || !role) {
    msgEl.style.color = 'red';
    msgEl.textContent = 'Please fill in all required fields.';
    return;
  }
  let users = getUsers();
  // ensure unique email
  if (users.find(u => u.email === email)) {
    msgEl.style.color = 'red';
    msgEl.textContent = 'An account with that email already exists.';
    return;
  }
  const user = {
    id: Date.now(),
    name,
    phone,
    email,
    password,
    role,
    carType: role === 'provider' ? carType : null,
    lat: null,
    lng: null
  };
  users.push(user);
  setUsers(users);
  setCurrentUser({email, role, name});
  msgEl.style.color = 'green';
  msgEl.textContent = 'Account created successfully! Redirecting...';
  setTimeout(() => {
    if (role === 'provider') {
      window.location.href = 'provider.html';
    } else {
      window.location.href = 'dashboard.html';
    }
  }, 1000);
}

// Handle user login
function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const password = document.getElementById('loginPassword').value;
  const msgEl = document.getElementById('loginMsg');
  msgEl.textContent = '';
  const users = getUsers();
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) {
    msgEl.style.color = 'red';
    msgEl.textContent = 'Invalid email or password.';
    return;
  }
  setCurrentUser({email: user.email, role: user.role, name: user.name});
  // Start geolocation watch to keep user position updated
  watchUserLocation();
  msgEl.style.color = 'green';
  msgEl.textContent = 'Login successful! Redirecting...';
  setTimeout(() => {
    if (user.role === 'provider') {
      window.location.href = 'provider.html';
    } else {
      window.location.href = 'dashboard.html';
    }
  }, 500);
}

// Logout current user
function logout() {
  setCurrentUser(null);
  window.location.href = 'index.html';
}

/* ---------------------------------------------------------------------------
 * Simple chat messenger functionality
 * Messages are stored in localStorage under the key 'chatMessages'. Each message
 * object contains {from: email, text: message body, timestamp: ISO string}.
 */

function getChatMessages() {
  return getStorage('chatMessages');
}

function setChatMessages(msgs) {
  setStorage('chatMessages', msgs);
}

function loadChatMessages() {
  const container = document.getElementById('chatMessages');
  if (!container) return;
  const msgs = getChatMessages();
  container.innerHTML = '';
  msgs.forEach(m => {
    const div = document.createElement('div');
    const current = getCurrentUser();
    // highlight messages from current user
    if (current && current.email === m.from) {
      div.className = 'message own';
    } else {
      div.className = 'message';
    }
    const sender = m.from || 'Anonymous';
    div.innerHTML = `<strong>${sender}:</strong> ${m.text}`;
    container.appendChild(div);
  });
  container.scrollTop = container.scrollHeight;
}

function handleChatSubmit(e) {
  e.preventDefault();
  const input = document.getElementById('chatInput');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  const current = getCurrentUser();
  const msgs = getChatMessages();
  msgs.push({
    from: current ? current.email : 'Guest',
    text: text,
    timestamp: new Date().toISOString()
  });
  setChatMessages(msgs);
  input.value = '';
  loadChatMessages();
}

// Capture user's current geolocation (if permitted)
let currentPosition = null;
function captureLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      function(pos) {
        currentPosition = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        };
      },
      function(err) {
        console.warn('Geolocation error:', err.message);
      }
    );
  }
}

// Continuously update the current user's geolocation and persist to storage.
let watchId = null;
function watchUserLocation() {
  const currentUser = getCurrentUser();
  if (!currentUser || !navigator.geolocation) return;
  // clear any existing watcher
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
  watchId = navigator.geolocation.watchPosition(function(pos) {
    currentPosition = {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude
    };
    // Update user record in storage
    let users = getUsers();
    const idx = users.findIndex(u => u.email === currentUser.email);
    if (idx !== -1) {
      users[idx].lat = currentPosition.latitude;
      users[idx].lng = currentPosition.longitude;
      setUsers(users);
    }
    // update bookings for current user's own bookings (for customers) as current lat/lng of pickup maybe changed
    if (currentUser.role === 'customer') {
      let bookings = getStorage('bookings');
      bookings.forEach(b => {
        if (b.userEmail === currentUser.email) {
          b.lat = currentPosition.latitude;
          b.lng = currentPosition.longitude;
        }
      });
      setStorage('bookings', bookings);
    }
  }, function(err) {
    console.warn('watchPosition error:', err.message);
  }, {enableHighAccuracy: true});
}

// Override handleBooking to store latitude/longitude
const originalHandleBooking = handleBooking;
handleBooking = function(event) {
  event.preventDefault();
  const form = event.target;
  const formMessage = document.getElementById('formMessage');
  formMessage.textContent = '';

  // gather booking from original function
    const booking = {
    name: form.name.value.trim(),
    phone: form.phone.value.trim(),
    email: form.email.value.trim(),
    vehicle: form.vehicle.value,
    serviceType: form.serviceType.value,
    pickup: form.pickup.value.trim(),
    destination: form.destination.value.trim(),
    datetime: form.datetime.value,
    notes: form.notes.value.trim(),
    createdAt: new Date().toISOString(),
    lat: currentPosition ? currentPosition.latitude : null,
    lng: currentPosition ? currentPosition.longitude : null,
    userEmail: getCurrentUser() ? getCurrentUser().email : null,
    status: 'pending',
    // track providers who declined this request
    declinedProviders: []
  };
  // validation
  if (!booking.name || !booking.phone || !booking.email || !booking.vehicle || !booking.serviceType || !booking.pickup) {
    formMessage.style.color = 'red';
    formMessage.textContent = 'Please fill in all required fields.';
    return;
  }
  if (!booking.datetime) {
    booking.datetime = new Date().toISOString();
  }
  const bookings = getStorage('bookings');
  bookings.push(booking);
  setStorage('bookings', bookings);

  // Do not automatically assign a provider; provider will accept or decline from dashboard
  form.reset();
  formMessage.style.color = 'green';
  formMessage.textContent = 'Your request has been submitted successfully! We will contact you shortly.';
}

// Load user dashboard: display bookings for logged in customer
function loadUserDashboard() {
  const current = getCurrentUser();
  if (!current || current.role !== 'customer') {
    // not authorized
    window.location.href = 'login.html';
    return;
  }
  // start geolocation watcher to update user position continuously
  watchUserLocation();
  // set user name
  const nameEl = document.getElementById('userName');
  if (nameEl) {
    nameEl.textContent = current.name;
  }
  const listEl = document.getElementById('bookingsList');
  if (!listEl) return;
  // get all bookings for this user
  const bookings = getStorage('bookings').filter(b => b.userEmail === current.email);

  // update statistics values if elements present
  const totalEl = document.getElementById('totalRequests');
  const pendingEl = document.getElementById('pendingRequests');
  const assignedEl = document.getElementById('assignedRequests');
  if (totalEl) totalEl.textContent = bookings.length;
  if (pendingEl) pendingEl.textContent = bookings.filter(b => b.status === 'pending').length;
  if (assignedEl) assignedEl.textContent = bookings.filter(b => b.status === 'assigned').length;

  // populate recent requests
  const recentEl = document.getElementById('recentRequests');
  if (recentEl) {
    recentEl.innerHTML = '';
    if (bookings.length === 0) {
      recentEl.innerHTML = '<p>No recent requests.</p>';
    } else {
      const sorted = bookings.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      const top = sorted.slice(0, 3);
      top.forEach(b => {
        const div = document.createElement('div');
        div.className = 'booking-item';
        let providerInfo = '';
        if (b.providerEmail) {
          const provider = getUsers().find(u => u.email === b.providerEmail);
          if (provider) {
            providerInfo = `<br>Assigned to: ${provider.name} (${provider.carType || 'Provider'})`;
          }
        }
        div.innerHTML = `<strong>${b.serviceType}</strong> on ${new Date(b.datetime).toLocaleString()}<br>
          Pickup: ${b.pickup}${b.destination ? ', Destination: ' + b.destination : ''}<br>
          Status: ${b.status}${providerInfo}`;
        recentEl.appendChild(div);
      });
    }
  }

  // populate full bookings list
  if (bookings.length === 0) {
    listEl.innerHTML = '<p>You have no requests yet.</p>';
  } else {
    listEl.innerHTML = '';
    bookings.forEach(b => {
      const div = document.createElement('div');
      div.className = 'booking-item';
      let providerInfo = '';
      if (b.providerEmail) {
        const provider = getUsers().find(u => u.email === b.providerEmail);
        if (provider) {
          providerInfo = `<br>Assigned to: ${provider.name} (${provider.carType || 'Provider'})`;
        }
      }
      div.innerHTML = `<strong>${b.serviceType}</strong> on ${new Date(b.datetime).toLocaleString()}<br>
        Pickup: ${b.pickup}${b.destination ? ', Destination: ' + b.destination : ''}<br>
        Status: ${b.status}${providerInfo}`;
      listEl.appendChild(div);
    });
  }
  // initialize map showing current and provider positions
  if (typeof L !== 'undefined') {
    const mapEl = document.getElementById('map');
    if (mapEl) {
      const map = L.map(mapEl).setView([5.6037, -0.1870], 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);
      let userMarker = null;
      let providerMarkers = [];
      function refreshMarkers() {
        const currentUser = getCurrentUser();
        if (!currentUser) return;
        const users = getUsers();
        // update user marker
        const self = users.find(u => u.email === currentUser.email);
        if (self && self.lat && self.lng) {
          const latlng = [self.lat, self.lng];
          if (!userMarker) {
            userMarker = L.marker(latlng, {icon: L.icon({iconUrl:'https://cdn-icons-png.flaticon.com/512/149/149071.png', iconSize:[28,28]})}).addTo(map).bindPopup('You');
          } else {
            userMarker.setLatLng(latlng);
          }
        }
        // clear provider markers
        providerMarkers.forEach(m => map.removeLayer(m));
        providerMarkers = [];
        // for each booking show provider location if assigned
        const bookings = getStorage('bookings').filter(b => b.userEmail === currentUser.email);
        bookings.forEach(b => {
          if (b.providerEmail) {
            const provider = users.find(u => u.email === b.providerEmail);
            if (provider && provider.lat && provider.lng) {
              const marker = L.marker([provider.lat, provider.lng], {icon: L.icon({iconUrl:'https://cdn-icons-png.flaticon.com/512/2308/2308443.png', iconSize:[32,32]})}).addTo(map);
              marker.bindPopup(`${provider.name || 'Provider'} (${provider.carType || ''})`);
              providerMarkers.push(marker);
            }
          }
        });
      }
      // initial refresh and interval
      refreshMarkers();
      setInterval(refreshMarkers, 10000);
    }
  }
}

// Load provider dashboard: display all bookings on map and list
function loadProviderDashboard() {
  const current = getCurrentUser();
  if (!current || current.role !== 'provider') {
    window.location.href = 'login.html';
    return;
  }
  // start geolocation watcher to update provider position continuously
  watchUserLocation();
  // set provider name
  const nameEl = document.getElementById('providerName');
  if (nameEl) {
    nameEl.textContent = current.name;
  }
      const requestsEl = document.getElementById('requestsList');
      if (!requestsEl) return;
      const bookings = getStorage('bookings');

      // update statistics if elements present
      const totalEl = document.getElementById('providerTotalRequests');
      const pendingEl = document.getElementById('providerPendingRequests');
      const assignedToYouEl = document.getElementById('providerAssignedToYou');
      const assignedOthersEl = document.getElementById('providerAssignedOthers');
      const completedEl = document.getElementById('providerCompletedRequests');
      if (totalEl) totalEl.textContent = bookings ? bookings.length : 0;
      if (pendingEl) pendingEl.textContent = bookings ? bookings.filter(b => b.status === 'pending').length : 0;
      if (assignedToYouEl) assignedToYouEl.textContent = bookings ? bookings.filter(b => b.status === 'assigned' && b.providerEmail === current.email).length : 0;
      if (assignedOthersEl) assignedOthersEl.textContent = bookings ? bookings.filter(b => b.status === 'assigned' && b.providerEmail && b.providerEmail !== current.email).length : 0;
      if (completedEl) completedEl.textContent = bookings ? bookings.filter(b => b.status === 'completed').length : 0;

      // update recent requests section
      const recentEl = document.getElementById('providerRecentRequests');
      if (recentEl) {
        recentEl.innerHTML = '';
        if (!bookings || bookings.length === 0) {
          recentEl.innerHTML = '<p>No recent requests.</p>';
        } else {
          const sorted = bookings.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          const top = sorted.slice(0, 3);
          top.forEach(b => {
            const div = document.createElement('div');
            div.className = 'booking-item';
            let assignmentInfo = '';
            if (b.providerEmail) {
              if (b.providerEmail === current.email) {
                assignmentInfo = ' <span style="color:green;">(Assigned to you)</span>';
              } else {
                const prov = getUsers().find(u => u.email === b.providerEmail);
                assignmentInfo = ` <span style="color:gray;">(Assigned to ${prov ? prov.name : 'another provider'})</span>`;
              }
            }
            div.innerHTML = `<strong>${b.serviceType}</strong> request by ${b.name}${assignmentInfo}<br>
              Pickup: ${b.pickup}${b.destination ? ', Destination: ' + b.destination : ''}<br>
              Date: ${new Date(b.datetime).toLocaleString()}<br>
              Status: ${b.status}`;
            recentEl.appendChild(div);
          });
        }
      }

      // Build requests list with details and action buttons
      requestsEl.innerHTML = '';
      if (!bookings || bookings.length === 0) {
        requestsEl.innerHTML = '<p>No service requests yet.</p>';
      } else {
        // sort bookings by date descending
        const sortedBookings = bookings.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        sortedBookings.forEach(b => {
          // Skip requests that current provider has declined
          if (b.declinedProviders && b.declinedProviders.includes(current.email)) {
            return;
          }
          const div = document.createElement('div');
          div.className = 'booking-item';
          // Build detail lines
          let details = '';
          details += `<p><strong>Service:</strong> ${b.serviceType}</p>`;
          details += `<p><strong>Customer:</strong> ${b.name} (${b.phone})</p>`;
          details += `<p><strong>Vehicle:</strong> ${b.vehicle}</p>`;
          details += `<p><strong>Pickup:</strong> ${b.pickup}</p>`;
          if (b.destination) details += `<p><strong>Destination:</strong> ${b.destination}</p>`;
          details += `<p><strong>Date:</strong> ${new Date(b.datetime).toLocaleString()}</p>`;
          details += `<p><strong>Status:</strong> ${b.status}</p>`;
          // Determine assignment info and action buttons
          let actions = '';
          if (b.status === 'pending') {
            // show accept/decline buttons
            actions += `<button class="btn-sm accept" onclick="acceptRequest('${b.createdAt}')">Accept</button>`;
            actions += `<button class="btn-sm decline" onclick="declineRequest('${b.createdAt}')">Decline</button>`;
          } else if (b.status === 'assigned') {
            if (b.providerEmail === current.email) {
              actions += `<span style="color:green; font-weight:bold;">Assigned to you</span> `;
              actions += `<button class="btn-sm complete" onclick="completeRequest('${b.createdAt}')">Mark Completed</button>`;
            } else {
              const prov = getUsers().find(u => u.email === b.providerEmail);
              const provName = prov ? prov.name : 'another provider';
              actions += `<span style="color:gray;">Assigned to ${provName}</span>`;
            }
          } else if (b.status === 'completed') {
            actions += `<span style="color:blue; font-weight:bold;">Completed</span>`;
          }
          div.innerHTML = details + '<div class="actions">' + actions + '</div>';
          requestsEl.appendChild(div);
        });
      }
  // map showing provider and requests
  if (typeof L !== 'undefined') {
    const mapEl = document.getElementById('providerMap');
    if (mapEl) {
      const map = L.map(mapEl).setView([5.6037, -0.1870], 11);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);
      let providerMarker = null;
      let customerMarkers = [];
      function refreshProviderMap() {
        const users = getUsers();
        // update provider marker
        const self = users.find(u => u.email === current.email);
        if (self && self.lat && self.lng) {
          const latlng = [self.lat, self.lng];
          if (!providerMarker) {
            providerMarker = L.marker(latlng, {icon: L.icon({iconUrl:'https://cdn-icons-png.flaticon.com/512/2308/2308443.png', iconSize:[32,32]})}).addTo(map).bindPopup('You');
          } else {
            providerMarker.setLatLng(latlng);
          }
        }
        // clear existing customer markers
        customerMarkers.forEach(m => map.removeLayer(m));
        customerMarkers = [];
        const bookings = getStorage('bookings');
        bookings.forEach(b => {
          if (b.lat && b.lng) {
            const marker = L.marker([b.lat, b.lng], {icon: L.icon({iconUrl:'https://cdn-icons-png.flaticon.com/512/149/149071.png', iconSize:[28,28]})}).addTo(map);
            marker.bindPopup(`${b.name} - ${b.serviceType}`);
            customerMarkers.push(marker);
          }
        });
      }
      // initial map refresh and update interval
      refreshProviderMap();
      setInterval(refreshProviderMap, 10000);
    }
  }
}