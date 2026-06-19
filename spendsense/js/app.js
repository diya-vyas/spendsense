// js/app.js — event wiring, chart rendering, main render loop

let chartInstance = null;

// ── Entry point ───────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  loadFromStorage();
  render();
});

// ── Render ────────────────────────────────────────────────────────────────────

function render() {
  const root = document.getElementById('root');

  if (!state.currentUser) {
    root.innerHTML = renderLogin();
    bindLogin();
    return;
  }

  root.innerHTML = renderApp();
  bindApp();

  if (state.activePanel === 'analytics') {
    drawCategoryChart();
  }
}

function showToast(msg) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const t = document.createElement('div');
  t.className   = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2800);
}

// ── Login bindings ────────────────────────────────────────────────────────────

function bindLogin() {
  let selectedUserId = null;

  document.querySelectorAll('.user-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      document.querySelectorAll('.user-tag').forEach(t => t.classList.remove('selected'));
      tag.classList.add('selected');
      selectedUserId = tag.dataset.uid;

      const isNew = selectedUserId === 'new';
      document.getElementById('login-form').style.display = isNew ? 'none'  : 'block';
      document.getElementById('new-form').style.display   = isNew ? 'block' : 'none';
      document.getElementById('login-err').style.display  = 'none';

      if (!isNew) setTimeout(() => document.getElementById('lpass')?.focus(), 50);
    });
  });

  // existing user sign-in
  const doLogin = () => {
    const pass = document.getElementById('lpass').value;
    const ok   = signIn(parseInt(selectedUserId), pass);
    if (ok) {
      render();
    } else {
      document.getElementById('login-err').style.display = 'block';
    }
  };

  document.getElementById('do-login')?.addEventListener('click', doLogin);
  document.getElementById('lpass')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') doLogin();
  });

  // new account
  document.getElementById('do-register')?.addEventListener('click', () => {
    const name   = document.getElementById('nu-name').value.trim();
    const email  = document.getElementById('nu-email').value.trim();
    const pass   = document.getElementById('nu-pass').value;
    const budget = parseInt(document.getElementById('nu-budget').value) || 5000;
    const income = parseInt(document.getElementById('nu-income').value) || 0;

    if (!name || !pass) {
      showToast('Name and password are required');
      return;
    }

    registerUser({ name, email, pass, budget, income });
    render();
  });
}

// ── App bindings ──────────────────────────────────────────────────────────────

function bindApp() {
  // navigation
  document.querySelectorAll('.nav-item[data-panel]').forEach(el => {
    el.addEventListener('click', () => {
      state.activePanel = el.dataset.panel;
      render();
    });
  });

  // keyboard nav for sign-out
  const logoutBtn = document.getElementById('logout-btn');
  logoutBtn?.addEventListener('click',  handleSignOut);
  logoutBtn?.addEventListener('keydown', e => { if (e.key === 'Enter') handleSignOut(); });

  // topbar buttons
  document.getElementById('btn-add')?.addEventListener('click', () => {
    state.modal    = 'add';
    state.editingId = null;
    render();
  });

  document.getElementById('btn-export')?.addEventListener('click', () => {
    exportCSV();
    showToast('CSV downloaded');
  });

  document.getElementById('btn-import')?.addEventListener('click', () => {
    const input    = document.createElement('input');
    input.type     = 'file';
    input.accept   = '.csv';
    input.onchange = e => {
      const file = e.target.files[0];
      if (!file) return;
      importCSV(file, count => {
        showToast(`Imported ${count} expense${count !== 1 ? 's' : ''}`);
        render();
      });
    };
    input.click();
  });

  // expenses panel
  document.getElementById('search-input')?.addEventListener('input', e => {
    state.search = e.target.value;
    render();
  });

  document.getElementById('filter-cat')?.addEventListener('change', e => {
    state.filterCat = e.target.value;
    render();
  });

  document.getElementById('sort-select')?.addEventListener('change', e => {
    state.sortBy = e.target.value;
    render();
  });

  document.getElementById('sort-dir-btn')?.addEventListener('click', () => {
    state.sortDir = state.sortDir === 'desc' ? 'asc' : 'desc';
    render();
  });

  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.editingId = parseInt(btn.dataset.id);
      state.modal     = 'edit';
      render();
    });
  });

  document.querySelectorAll('.del-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!confirm('Delete this expense?')) return;
      deleteExpense(parseInt(btn.dataset.id));
      showToast('Expense deleted');
      render();
    });
  });

  // budget & income edit buttons
  document.getElementById('edit-budget-btn')?.addEventListener('click', () => {
    state.modal = 'budget';
    render();
  });

  document.getElementById('edit-income-btn')?.addEventListener('click', () => {
    state.modal = 'income';
    render();
  });

  // settings
  document.getElementById('save-settings-btn')?.addEventListener('click', () => {
    const name   = document.getElementById('set-name').value.trim();
    const email  = document.getElementById('set-email').value.trim();
    const budget = parseInt(document.getElementById('set-budget').value);
    const income = parseInt(document.getElementById('set-income').value);
    const pass   = document.getElementById('set-pass').value;

    const updates = {};
    if (name)         updates.name   = name;
    if (email)        updates.email  = email;
    if (budget > 0)   updates.budget = budget;
    if (income >= 0)  updates.income = income;
    if (pass)         updates.pass   = pass;

    updateUser(updates);
    showToast('Settings saved');
    render();
  });

  bindModal();
}

function handleSignOut() {
  signOut();
  render();
}

// ── Modal bindings ────────────────────────────────────────────────────────────

function bindModal() {
  const close = () => {
    state.modal = null;
    render();
  };

  document.getElementById('close-modal')?.addEventListener('click', close);
  document.getElementById('close-modal-2')?.addEventListener('click', close);

  document.getElementById('modal-overlay')?.addEventListener('click', e => {
    if (e.target.id === 'modal-overlay') close();
  });

  document.addEventListener('keydown', function escClose(e) {
    if (e.key === 'Escape' && state.modal) {
      close();
      document.removeEventListener('keydown', escClose);
    }
  });

  // save expense (add or edit)
  document.getElementById('save-expense')?.addEventListener('click', () => {
    const amount    = parseFloat(document.getElementById('m-amount').value);
    const category  = document.getElementById('m-cat').value;
    const date      = document.getElementById('m-date').value;
    const desc      = document.getElementById('m-desc').value.trim();
    const recurring = document.getElementById('m-recur').value === 'yes';

    if (!amount || amount <= 0) { showToast('Please enter a valid amount'); return; }
    if (!date)                  { showToast('Please select a date');        return; }

    if (state.modal === 'edit') {
      updateExpense(state.editingId, { amount, category, date, desc, recurring });
      showToast('Expense updated');
    } else {
      addExpense({ amount, category, date, desc, recurring });
      showToast('Expense added');
    }

    state.modal = null;
    render();
  });

  // save budget
  document.getElementById('save-budget')?.addEventListener('click', () => {
    const val = parseInt(document.getElementById('m-budget-val').value);
    if (val > 0) {
      updateUser({ budget: val });
      showToast('Budget updated');
    }
    state.modal = null;
    render();
  });

  // save income
  document.getElementById('save-income')?.addEventListener('click', () => {
    const val = parseInt(document.getElementById('m-income-val').value);
    if (val >= 0) {
      updateUser({ income: val });
      showToast('Income updated');
    }
    state.modal = null;
    render();
  });
}

// ── Chart ─────────────────────────────────────────────────────────────────────

function drawCategoryChart() {
  setTimeout(() => {
    const canvas = document.getElementById('cat-chart');
    if (!canvas) return;

    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }

    const totals = categoryTotals();
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const gridColor  = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
    const tickColor  = isDark ? '#606060' : '#888880';

    chartInstance = new Chart(canvas, {
      type: 'bar',
      data: {
        labels:   CATEGORIES,
        datasets: [{
          label:           'Spending',
          data:            CATEGORIES.map(c => totals[c] ?? 0),
          backgroundColor: CATEGORIES.map(c => CATEGORY_COLORS[c]),
          borderRadius:    5,
          borderSkipped:   false,
        }],
      },
      options: {
        responsive:          true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ' ' + fmt(ctx.raw),
            },
          },
        },
        scales: {
          x: {
            grid:  { display: false },
            ticks: { color: tickColor, font: { size: 11 } },
          },
          y: {
            grid:  { color: gridColor },
            ticks: {
              color:    tickColor,
              font:     { size: 11 },
              callback: v => fmt(v),
            },
          },
        },
      },
    });
  }, 80);
}
