/**
 * User constants and localStorage persistence helpers.
 * Single source of truth for the team directory.
 */

export const USERS = [
  { id: 'anika', initials: 'AK', name: 'Anika Kapoor', role: 'Owner', tone: 'blue', email: 'anika@kaamsetu.in' },
  { id: 'ravi', initials: 'RM', name: 'Ravi Mehta', role: 'Owner', tone: 'saffron', email: 'ravi@kaamsetu.in' },
  { id: 'ravi2', initials: 'RK', name: 'Ravi Kumar', nickname: 'RK', role: 'Sales', tone: 'purple', email: 'ravi.k@kaamsetu.in' },
  { id: 'rahul', initials: 'RS', name: 'Rahul Sharma', role: 'Procurement', tone: 'teal', email: 'rahul@kaamsetu.in' },
  { id: 'mohan', initials: 'MV', name: 'Mohan Verma', role: 'Dispatch', tone: 'lilac', email: 'mohan@kaamsetu.in' },
  { id: 'priya', initials: 'PS', name: 'Priya Shah', role: 'Operations', tone: 'saffron', email: 'priya@kaamsetu.in' },
];

/** Retrieve the last-selected user from localStorage (survives reload). */
export function getStoredUser() {
  try {
    const storedId = localStorage.getItem('kaamsetu_selected_user');
    if (storedId) {
      const found = USERS.find((u) => u.id === storedId);
      if (found) return found;
    }
  } catch { /* ignore */ }
  return USERS[0];
}

/** Persist the selected user id. */
export function saveStoredUser(userId) {
  try { localStorage.setItem('kaamsetu_selected_user', userId); } catch { /* ignore */ }
}

/** Retrieve custom-added people from localStorage. */
export function getStoredPeople() {
  try {
    const stored = localStorage.getItem('kaamsetu_custom_people');
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return [];
}

/** Persist custom people list. */
export function saveStoredPeople(people) {
  try { localStorage.setItem('kaamsetu_custom_people', JSON.stringify(people)); } catch { /* ignore */ }
}

/** Auto-generate initials from a full name. */
export function autoInitials(name) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export const TONE_CYCLE = ['blue', 'saffron', 'purple', 'teal', 'lilac'];
