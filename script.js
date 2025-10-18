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
});