// js/data.js — state management & data helpers

const CATEGORIES = ['Food', 'Travel', 'Shopping', 'Entertainment', 'Rent', 'Internet', 'Subscriptions', 'Other'];

const CATEGORY_COLORS = {
  Food:           '#1d9e75',
  Travel:         '#378add',
  Shopping:       '#639922',
  Entertainment:  '#7f77dd',
  Rent:           '#ef9f27',
  Internet:       '#d4537e',
  Subscriptions:  '#e24b4a',
  Other:          '#888780',
};

// ── Seed data for demo accounts ──────────────────────────────────────────────

const SEED = {
  1: [
    { id: 1,  amount: 1200, category: 'Rent',           date: '2026-06-01', desc: 'Monthly rent',           recurring: true  },
    { id: 2,  amount: 450,  category: 'Food',           date: '2026-06-03', desc: 'Groceries and dining',   recurring: false },
    { id: 3,  amount: 89,   category: 'Internet',       date: '2026-06-05', desc: 'Broadband bill',         recurring: true  },
    { id: 4,  amount: 320,  category: 'Shopping',       date: '2026-06-07', desc: 'Clothes and accessories',recurring: false },
    { id: 5,  amount: 55,   category: 'Entertainment',  date: '2026-06-10', desc: 'Movies and games',       recurring: false },
    { id: 6,  amount: 199,  category: 'Subscriptions',  date: '2026-06-12', desc: 'Streaming services',     recurring: true  },
    { id: 7,  amount: 280,  category: 'Travel',         date: '2026-06-14', desc: 'Weekend trip fuel',      recurring: false },
    { id: 8,  amount: 120,  category: 'Food',           date: '2026-06-16', desc: 'Restaurant dinner',      recurring: false },
  ],
  2: [
    { id: 1,  amount: 800,  category: 'Rent',           date: '2026-06-01', desc: 'Rent share',             recurring: true  },
    { id: 2,  amount: 200,  category: 'Food',           date: '2026-06-04', desc: 'Weekly groceries',       recurring: false },
    { id: 3,  amount: 50,   category: 'Entertainment',  date: '2026-06-09', desc: 'Cinema night',           recurring: false },
    { id: 4,  amount: 149,  category: 'Subscriptions',  date: '2026-06-12', desc: 'Cloud storage',          recurring: true  },
  ],
};

// ── Initial state ─────────────────────────────────────────────────────────────

const state = {
  users: [
    { id: 1, name: 'Alex Johnson', email: 'alex@example.com', pass: 'pass1', budget: 5000, income: 8000 },
    { id: 2, name: 'Sam Rivera',   email: 'sam@example.com',  pass: 'pass2', budget: 3500, income: 6000 },
  ],

  currentUser: null,

  expenses: {
    1: SEED[1].map(e => ({ ...e })),
    2: SEED[2].map(e => ({ ...e })),
  },

  // ui state
  nextId:      500,
  modal:       null,
  editingId:   null,
  activePanel: 'dashboard',
  search:      '',
  filterCat:   '',
  sortBy:      'date',
  sortDir:     'desc',
};

// ── Selectors ────────────────────────────────────────────────────────────────

function currentUser()    { return state.currentUser; }
function userId()         { return state.currentUser?.id; }
function userBudget()     { return state.currentUser?.budget  ?? 5000; }
function userIncome()     { return state.currentUser?.income  ?? 0;    }

function allExpenses() {
  return state.expenses[userId()] ?? [];
}

function monthlyExpenses() {
  const now = new Date();
  return allExpenses().filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
}

function totalSpent()   { return allExpenses().reduce((sum, e) => sum + e.amount, 0); }
function monthlyTotal() { return monthlyExpenses().reduce((sum, e) => sum + e.amount, 0); }

function categoryTotals() {
  const totals = {};
  CATEGORIES.forEach(c => (totals[c] = 0));
  allExpenses().forEach(e => { totals[e.category] = (totals[e.category] ?? 0) + e.amount; });
  return totals;
}

function highestCategory() {
  return Object.entries(categoryTotals()).sort((a, b) => b[1] - a[1])[0] ?? ['—', 0];
}

function avgDailySpend() {
  const expenses = allExpenses();
  if (!expenses.length) return 0;
  const activeDays = new Set(expenses.map(e => e.date)).size;
  return totalSpent() / activeDays;
}

function predictMonthEnd() {
  const dayOfMonth   = new Date().getDate();
  const daysInMonth  = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  if (!dayOfMonth) return 0;
  return (monthlyTotal() / dayOfMonth) * daysInMonth;
}

function getNotifications() {
  const alerts  = [];
  const spent   = monthlyTotal();
  const budget  = userBudget();

  if (spent > budget) {
    alerts.push({ type: 'danger', msg: `Budget exceeded! Spent ${fmt(spent)} of ${fmt(budget)}` });
  } else if (spent > budget * 0.8) {
    alerts.push({ type: 'warn', msg: `${Math.round((spent / budget) * 100)}% of monthly budget used` });
  }

  allExpenses()
    .filter(e => e.recurring)
    .forEach(e => {
      const due  = new Date(e.date);
      due.setMonth(due.getMonth() + 1);
      const diff = Math.ceil((due - new Date()) / 86_400_000);
      if (diff >= 0 && diff <= 5) {
        alerts.push({ type: 'info', msg: `Upcoming: "${e.desc}" in ${diff} day${diff !== 1 ? 's' : ''}` });
      }
    });

  const pred = predictMonthEnd();
  if (pred > budget && monthlyTotal() <= budget) {
    alerts.push({ type: 'warn', msg: `Month-end estimate ${fmt(pred)} may exceed your budget` });
  }

  return alerts;
}

// ── Mutations ────────────────────────────────────────────────────────────────

function addExpense(data) {
  const expense = { ...data, id: state.nextId++ };
  state.expenses[userId()].push(expense);
  saveToStorage();
  return expense;
}

function updateExpense(id, data) {
  const list = state.expenses[userId()];
  const idx  = list.findIndex(e => e.id === id);
  if (idx < 0) return;
  list[idx] = { ...list[idx], ...data };
  saveToStorage();
}

function deleteExpense(id) {
  state.expenses[userId()] = state.expenses[userId()].filter(e => e.id !== id);
  saveToStorage();
}

function updateUser(fields) {
  Object.assign(state.currentUser, fields);
  const user = state.users.find(u => u.id === userId());
  if (user) Object.assign(user, fields);
  saveToStorage();
}

// ── Auth ─────────────────────────────────────────────────────────────────────

function signIn(userId, password) {
  const user = state.users.find(u => u.id === userId);
  if (!user || user.pass !== password) return false;
  state.currentUser = user;
  state.activePanel = 'dashboard';
  saveToStorage();
  return true;
}

function signOut() {
  state.currentUser = null;
  saveToStorage();
}

function registerUser({ name, email, pass, budget, income }) {
  const user = { id: Date.now(), name, email, pass, budget: budget || 5000, income: income || 0 };
  state.users.push(user);
  state.expenses[user.id] = [];
  state.currentUser = user;
  saveToStorage();
  return user;
}

// ── Persistence ───────────────────────────────────────────────────────────────

function saveToStorage() {
  try {
    localStorage.setItem('ss_users',    JSON.stringify(state.users));
    localStorage.setItem('ss_expenses', JSON.stringify(state.expenses));
    localStorage.setItem('ss_nextId',   JSON.stringify(state.nextId));
    if (state.currentUser) {
      localStorage.setItem('ss_currentUserId', state.currentUser.id);
    } else {
      localStorage.removeItem('ss_currentUserId');
    }
  } catch (_) {
    // storage unavailable — that's fine, data lives in memory
  }
}

function loadFromStorage() {
  try {
    const users    = localStorage.getItem('ss_users');
    const expenses = localStorage.getItem('ss_expenses');
    const nextId   = localStorage.getItem('ss_nextId');
    const uid      = localStorage.getItem('ss_currentUserId');

    if (users)    state.users    = JSON.parse(users);
    if (expenses) state.expenses = JSON.parse(expenses);
    if (nextId)   state.nextId   = JSON.parse(nextId);

    if (uid) {
      state.currentUser = state.users.find(u => u.id === parseInt(uid)) ?? null;
    }
  } catch (_) {
    // corrupted storage — start fresh
  }
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function fmt(amount) {
  return '₹' + Math.round(amount).toLocaleString('en-IN');
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function initials(name) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function filteredExpenses() {
  let list = allExpenses().slice();

  if (state.search) {
    const q = state.search.toLowerCase();
    list = list.filter(e =>
      (e.desc ?? '').toLowerCase().includes(q) ||
      e.category.toLowerCase().includes(q)
    );
  }

  if (state.filterCat) {
    list = list.filter(e => e.category === state.filterCat);
  }

  list.sort((a, b) => {
    let diff = 0;
    if (state.sortBy === 'date')   diff = a.date.localeCompare(b.date);
    if (state.sortBy === 'amount') diff = a.amount - b.amount;
    return state.sortDir === 'desc' ? -diff : diff;
  });

  return list;
}

// ── Export ────────────────────────────────────────────────────────────────────

function exportCSV() {
  const header = ['Date', 'Description', 'Category', 'Amount', 'Recurring'];
  const rows   = allExpenses().map(e => [
    e.date,
    `"${(e.desc ?? '').replace(/"/g, '""')}"`,
    e.category,
    e.amount,
    e.recurring ? 'Yes' : 'No',
  ]);

  const csv  = [header, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `expenses_${state.currentUser?.name.replace(/\s+/g, '_')}_${today()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function importCSV(file, onDone) {
  const reader = new FileReader();
  reader.onload = ev => {
    const lines = ev.target.result.split('\n').slice(1);
    let added = 0;
    lines.forEach(line => {
      const parts = line.split(',');
      const [rawDate, rawDesc, rawCat, rawAmt, rawRec] = parts;
      const amount = parseFloat(rawAmt);
      if (!rawDate?.trim() || isNaN(amount)) return;
      addExpense({
        date:      rawDate.trim(),
        desc:      (rawDesc ?? '').replace(/"/g, '').trim(),
        category:  CATEGORIES.includes(rawCat?.trim()) ? rawCat.trim() : 'Other',
        amount,
        recurring: rawRec?.trim() === 'Yes',
      });
      added++;
    });
    onDone(added);
  };
  reader.readAsText(file);
}
