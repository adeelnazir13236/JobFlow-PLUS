export const customers = [
  { id: 1, name: "Ali Traders", phone: "0300-1234567", city: "Lahore", area: "Gulberg", status: "ACTIVE" },
  { id: 2, name: "Sunrise Foods", phone: "0311-9876543", city: "Karachi", area: "DHA", status: "ACTIVE" },
  { id: 3, name: "Metro Clinic", phone: "0322-4567890", city: "Islamabad", area: "F-8", status: "INACTIVE" }
];

export const jobs = [
  { id: 1, customer: "Ali Traders", staff: "Usman", date: "2026-05-20", time: "10:30", status: "SCHEDULED" },
  { id: 2, customer: "Sunrise Foods", staff: "Hina", date: "2026-05-22", time: "14:00", status: "RESCHEDULED" },
  { id: 3, customer: "Metro Clinic", staff: "Bilal", date: "2026-05-15", time: "11:00", status: "COMPLETED" }
];

export const followUps = [
  { id: 1, customer: "Ali Traders", dueDate: "2026-06-04", status: "PENDING", notes: "Check system performance" },
  { id: 2, customer: "Metro Clinic", dueDate: "2026-05-30", status: "PENDING", notes: "Confirm maintenance slot" }
];

export const users = [
  { id: 1, name: "Admin User", email: "admin@jobflow.local", role: "ADMIN", status: "ACTIVE" },
  { id: 2, name: "Sales Agent", email: "agent@jobflow.local", role: "AGENT", status: "ACTIVE" },
  { id: 3, name: "Field Staff", email: "staff@jobflow.local", role: "STAFF", status: "ACTIVE" }
];
