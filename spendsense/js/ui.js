// js/ui.js — HTML rendering helpers

// ── Nav item ──────────────────────────────────────────────────────────────────

function navItem(panelId, icon, label, badge) {
  const active = state.activePanel === panelId;
  return `
    <div class="nav-item${active ? ' active' : ''}" data-panel="${panelId}">
      <i class="${icon}" aria-hidden="true"></i>
      ${label}
      ${badge ? `<span class="nav-badge">${badge}</span>` : ''}
    </div>`;
}

// ── Category bars ─────────────────────────────────────────────────────────────

function renderCategoryBars() {
  const totals = categoryTotals();
  const max    = Math.max(...Object.values(totals), 1);
  const active = CATEGORIES.filter(c => totals[c] > 0).sort((a, b) => totals[b] - totals[a]);

  if (!active.length) {
    return `<div class="empty"><i class="fa-solid fa-chart-bar"></i><p>No expenses recorded yet</p></div>`;
  }

  return active.map(c => `
    <div class="cat-row">
      <div class="cat-label">${c}</div>
      <div class="cat-track">
        <div class="cat-fill" style="width:${Math.round((totals[c] / max) * 100)}%; background:${CATEGORY_COLORS[c]}"></div>
      </div>
      <div class="cat-amount">${fmt(totals[c])}</div>
    </div>`).join('');
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

function renderDashboard() {
  const spent    = monthlyTotal();
  const budget   = userBudget();
  const remaining = budget - spent;
  const pct      = Math.min(100, Math.round((spent / budget) * 100));
  const savings  = userIncome() - totalSpent();
  const alerts   = getNotifications();

  const recentList = allExpenses()
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6);

  const barColor = pct > 100 ? 'var(--red)' : pct > 80 ? 'var(--amber)' : 'var(--green)';

  return `
    ${alerts.length ? `
      <div class="notif notif-${alerts[0].type === 'danger' ? 'danger' : alerts[0].type === 'info' ? 'info' : 'warn'}" style="margin-bottom:14px">
        <i class="fa-solid fa-${alerts[0].type === 'danger' ? 'triangle-exclamation' : 'bell'}"></i>
        ${alerts[0].msg}
      </div>` : ''}

    <div class="metrics">
      <div class="metric">
        <div class="metric-label">Spent this month</div>
        <div class="metric-value mono">${fmt(spent)}</div>
        <div class="metric-sub">of ${fmt(budget)} budget</div>
      </div>
      <div class="metric">
        <div class="metric-label">Remaining</div>
        <div class="metric-value ${remaining < 0 ? 'red' : 'green'} mono">${fmt(Math.abs(remaining))}</div>
        <div class="metric-sub">${remaining < 0 ? 'over budget' : `${100 - pct}% left`}</div>
      </div>
      <div class="metric">
        <div class="metric-label">Net savings</div>
        <div class="metric-value ${savings >= 0 ? 'green' : 'red'} mono">${fmt(Math.abs(savings))}</div>
        <div class="metric-sub">${savings >= 0 ? 'saved so far' : 'deficit'}</div>
      </div>
      <div class="metric">
        <div class="metric-label">Month-end estimate</div>
        <div class="metric-value mono">${fmt(predictMonthEnd())}</div>
        <div class="metric-sub">at current pace</div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title">Monthly budget usage</span>
        <span style="font-size:12px;color:var(--text-3)">${fmt(spent)} / ${fmt(budget)} &mdash; ${pct}%</span>
      </div>
      <div class="budget-track">
        <div class="budget-fill" style="width:${pct}%; background:${barColor}"></div>
      </div>
    </div>

    <div class="grid-2">
      <div class="card" style="margin:0">
        <div class="card-header"><span class="card-title">Category breakdown</span></div>
        ${renderCategoryBars()}
      </div>
      <div class="card" style="margin:0">
        <div class="card-header"><span class="card-title">Recent expenses</span></div>
        ${recentList.length ? `
          <table>
            <thead><tr><th>Description</th><th>Category</th><th style="text-align:right">Amount</th></tr></thead>
            <tbody>
              ${recentList.map(e => `
                <tr>
                  <td>${e.desc || '—'}</td>
                  <td><span class="badge badge-${e.category}">${e.category}</span></td>
                  <td style="text-align:right" class="mono">${fmt(e.amount)}</td>
                </tr>`).join('')}
            </tbody>
          </table>` : `<div class="empty"><i class="fa-solid fa-receipt"></i><p>No expenses yet</p></div>`}
      </div>
    </div>`;
}

// ── Expenses list ─────────────────────────────────────────────────────────────

function renderExpenses() {
  const list  = filteredExpenses();
  const total = list.reduce((s, e) => s + e.amount, 0);

  return `
    <div class="search-row">
      <input id="search-input" placeholder="Search by name or category…" value="${escHtml(state.search)}">
      <select id="filter-cat">
        <option value="">All categories</option>
        ${CATEGORIES.map(c => `<option value="${c}"${state.filterCat === c ? ' selected' : ''}>${c}</option>`).join('')}
      </select>
      <select id="sort-select">
        <option value="date"${state.sortBy === 'date' ? ' selected' : ''}>Sort: Date</option>
        <option value="amount"${state.sortBy === 'amount' ? ' selected' : ''}>Sort: Amount</option>
      </select>
      <button class="btn" id="sort-dir-btn">
        <i class="fa-solid fa-sort"></i> ${state.sortDir === 'desc' ? 'Desc' : 'Asc'}
      </button>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title">${list.length} expense${list.length !== 1 ? 's' : ''}</span>
        <span style="font-size:12px;color:var(--text-3)">Total: ${fmt(total)}</span>
      </div>
      ${list.length ? `
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Recurring</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${list.map(e => `
                <tr>
                  <td class="mono" style="font-size:11px;white-space:nowrap">${e.date}</td>
                  <td>${escHtml(e.desc || '—')}</td>
                  <td><span class="badge badge-${e.category}">${e.category}</span></td>
                  <td class="mono">${fmt(e.amount)}</td>
                  <td>
                    ${e.recurring
                      ? '<span style="color:var(--amber);font-size:11px"><i class="fa-solid fa-rotate"></i> Yes</span>'
                      : '<span style="color:var(--text-3);font-size:11px">No</span>'}
                  </td>
                  <td style="white-space:nowrap">
                    <button class="icon-btn edit-btn" data-id="${e.id}" title="Edit expense"><i class="fa-solid fa-pen"></i></button>
                    <button class="icon-btn danger del-btn" data-id="${e.id}" title="Delete expense"><i class="fa-solid fa-trash"></i></button>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>` : `<div class="empty"><i class="fa-solid fa-magnifying-glass"></i><p>No expenses match your search</p></div>`}
    </div>`;
}

// ── Analytics ─────────────────────────────────────────────────────────────────

function renderAnalytics() {
  const hc     = highestCategory();
  const avg    = avgDailySpend();
  const budget = userBudget();

  return `
    <div class="metrics">
      <div class="metric">
        <div class="metric-label">Highest category</div>
        <div class="metric-value" style="font-size:18px">${hc[0]}</div>
        <div class="metric-sub">${fmt(hc[1])}</div>
      </div>
      <div class="metric">
        <div class="metric-label">Avg daily spend</div>
        <div class="metric-value mono">${fmt(avg)}</div>
        <div class="metric-sub">based on active days</div>
      </div>
      <div class="metric">
        <div class="metric-label">Month-end estimate</div>
        <div class="metric-value mono">${fmt(predictMonthEnd())}</div>
        <div class="metric-sub">${predictMonthEnd() > budget ? '⚠ may exceed budget' : 'within budget'}</div>
      </div>
      <div class="metric">
        <div class="metric-label">Total expenses</div>
        <div class="metric-value mono">${allExpenses().length}</div>
        <div class="metric-sub">all time</div>
      </div>
    </div>

    <div class="grid-2">
      <div class="card" style="margin:0">
        <div class="card-header"><span class="card-title">Spending by category</span></div>
        ${renderCategoryBars()}
      </div>
      <div class="card" style="margin:0">
        <div class="card-header"><span class="card-title">Spending projection</span></div>
        <p style="font-size:12px;color:var(--text-2);margin-bottom:14px">Based on ${fmt(avg)}/day average</p>
        ${[7, 14, 21, 30].map(days => {
          const est = Math.round(avg * days);
          const pct = Math.min(100, Math.round((est / budget) * 100));
          const col = pct > 100 ? 'var(--red)' : pct > 80 ? 'var(--amber)' : 'var(--green)';
          return `
            <div class="pred-row">
              <div class="pred-label">${days} days</div>
              <div class="pred-track"><div class="pred-fill" style="width:${pct}%;background:${col}"></div></div>
              <div class="pred-val">${fmt(est)}</div>
            </div>`;
        }).join('')}
        <p style="font-size:11px;color:var(--text-3);margin-top:10px">Budget limit: ${fmt(budget)}</p>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><span class="card-title">Category breakdown chart</span></div>
      <div style="position:relative;width:100%;height:240px">
        <canvas id="cat-chart" role="img" aria-label="Bar chart of spending by category"></canvas>
      </div>
    </div>`;
}

// ── Budget ────────────────────────────────────────────────────────────────────

function renderBudget() {
  const spent   = monthlyTotal();
  const budget  = userBudget();
  const rem     = budget - spent;
  const pct     = Math.min(100, Math.round((spent / budget) * 100));
  const totals  = categoryTotals();
  const barCol  = pct > 100 ? 'var(--red)' : pct > 80 ? 'var(--amber)' : 'var(--green)';

  return `
    <div class="card">
      <div class="card-header">
        <span class="card-title">Monthly budget — ${fmt(budget)}</span>
        <button class="btn btn-sm" id="edit-budget-btn"><i class="fa-solid fa-pen"></i> Edit</button>
      </div>
      <div class="metrics" style="margin-bottom:14px">
        <div class="metric"><div class="metric-label">Spent</div><div class="metric-value mono">${fmt(spent)}</div></div>
        <div class="metric"><div class="metric-label">Remaining</div><div class="metric-value ${rem < 0 ? 'red' : 'green'} mono">${fmt(Math.abs(rem))}</div></div>
        <div class="metric"><div class="metric-label">Used</div><div class="metric-value mono">${pct}%</div></div>
      </div>
      <div class="budget-track" style="height:14px">
        <div class="budget-fill" style="width:${pct}%;height:14px;background:${barCol}"></div>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:11px;color:var(--text-3)">
        <span>₹0</span><span>${fmt(budget)}</span>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><span class="card-title">Category share of budget</span></div>
      ${CATEGORIES.map(c => {
        const share = budget > 0 ? Math.min(100, Math.round(((totals[c] ?? 0) / budget) * 100)) : 0;
        return `
          <div class="cat-row">
            <div class="cat-label">${c}</div>
            <div class="cat-track"><div class="cat-fill" style="width:${share}%;background:${CATEGORY_COLORS[c]}"></div></div>
            <div class="cat-amount">${share}%</div>
          </div>`;
      }).join('')}
    </div>`;
}

// ── Savings ───────────────────────────────────────────────────────────────────

function renderSavings() {
  const inc  = userIncome();
  const spnt = totalSpent();
  const sav  = inc - spnt;
  const pct  = inc > 0 ? Math.max(0, Math.round((sav / inc) * 100)) : 0;
  const r    = 52;
  const circ = 2 * Math.PI * r;
  const col  = sav >= 0 ? 'var(--green)' : 'var(--red)';

  return `
    <div class="card">
      <div class="card-header">
        <span class="card-title">Savings overview</span>
        <button class="btn btn-sm" id="edit-income-btn"><i class="fa-solid fa-pen"></i> Edit income</button>
      </div>
      <div class="metrics">
        <div class="metric"><div class="metric-label">Monthly income</div><div class="metric-value mono">${fmt(inc)}</div></div>
        <div class="metric"><div class="metric-label">Total spent</div><div class="metric-value mono">${fmt(spnt)}</div></div>
        <div class="metric"><div class="metric-label">Net savings</div><div class="metric-value ${sav >= 0 ? 'green' : 'red'} mono">${fmt(Math.abs(sav))}</div></div>
        <div class="metric"><div class="metric-label">Savings rate</div><div class="metric-value mono">${pct}%</div></div>
      </div>
      <div style="text-align:center;padding:20px 0">
        <div class="ring-wrap">
          <svg class="ring-svg" viewBox="0 0 130 130" aria-hidden="true">
            <circle cx="65" cy="65" r="${r}" fill="none" stroke="var(--surface-3)" stroke-width="12"/>
            <circle cx="65" cy="65" r="${r}" fill="none" stroke="${col}" stroke-width="12"
              stroke-linecap="round"
              stroke-dasharray="${circ}"
              stroke-dashoffset="${circ * (1 - pct / 100)}"/>
          </svg>
          <div class="ring-label">
            <div class="ring-pct" style="color:${col}">${pct}%</div>
            <div class="ring-tiny">saved</div>
          </div>
        </div>
        <p style="font-size:13px;color:var(--text-2)">
          ${fmt(inc)} income &minus; ${fmt(spnt)} expenses =
          <strong style="color:${col}">${fmt(Math.abs(sav))} ${sav >= 0 ? 'saved' : 'deficit'}</strong>
        </p>
      </div>
    </div>`;
}

// ── Notifications ─────────────────────────────────────────────────────────────

function renderNotifications() {
  const alerts = getNotifications();
  const iconMap = { danger: 'triangle-exclamation', warn: 'circle-info', info: 'bell', success: 'circle-check' };

  return `
    <div class="card">
      <div class="card-header"><span class="card-title">Active alerts</span></div>
      ${alerts.length
        ? alerts.map(n => `
            <div class="notif notif-${n.type}">
              <i class="fa-solid fa-${iconMap[n.type] ?? 'info'}"></i>
              ${escHtml(n.msg)}
            </div>`).join('')
        : `<div class="empty"><i class="fa-solid fa-bell-slash"></i><p>No active alerts — you're on track!</p></div>`}
    </div>`;
}

// ── Settings ──────────────────────────────────────────────────────────────────

function renderSettings() {
  const u = currentUser();
  return `
    <div class="card">
      <div class="card-header"><span class="card-title">Account settings</span></div>
      <div class="form-row">
        <div class="form-group"><label>Name</label><input id="set-name" value="${escHtml(u.name)}"></div>
        <div class="form-group"><label>Email</label><input id="set-email" value="${escHtml(u.email)}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Monthly budget (₹)</label><input type="number" id="set-budget" value="${u.budget}" min="0"></div>
        <div class="form-group"><label>Monthly income (₹)</label><input type="number" id="set-income" value="${u.income}" min="0"></div>
      </div>
      <div class="form-group">
        <label>New password <span style="font-weight:400;color:var(--text-3)">(leave blank to keep current)</span></label>
        <input type="password" id="set-pass" placeholder="New password" autocomplete="new-password">
      </div>
      <div class="form-actions">
        <button class="btn btn-primary" id="save-settings-btn">Save changes</button>
      </div>
    </div>`;
}

// ── Modals ────────────────────────────────────────────────────────────────────

function renderModal() {
  const m = state.modal;

  if (m === 'add' || m === 'edit') {
    const e = m === 'edit' ? allExpenses().find(x => x.id === state.editingId) : null;
    return `
      <div class="modal-overlay" id="modal-overlay">
        <div class="modal">
          <div class="modal-title">
            ${m === 'edit' ? 'Edit expense' : 'Add expense'}
            <button class="icon-btn" id="close-modal" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Amount (₹)</label>
              <input type="number" id="m-amount" value="${e?.amount ?? ''}" placeholder="0" min="0" step="0.01">
            </div>
            <div class="form-group">
              <label>Category</label>
              <select id="m-cat">
                ${CATEGORIES.map(c => `<option value="${c}"${e?.category === c ? ' selected' : ''}>${c}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Date</label>
              <input type="date" id="m-date" value="${e?.date ?? today()}">
            </div>
            <div class="form-group">
              <label>Recurring</label>
              <select id="m-recur">
                <option value="">No</option>
                <option value="yes"${e?.recurring ? ' selected' : ''}>Yes</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label>Description</label>
            <textarea id="m-desc" placeholder="What was this for?">${escHtml(e?.desc ?? '')}</textarea>
          </div>
          <div class="form-actions">
            <button class="btn" id="close-modal-2">Cancel</button>
            <button class="btn btn-primary" id="save-expense">${m === 'edit' ? 'Save changes' : 'Add expense'}</button>
          </div>
        </div>
      </div>`;
  }

  if (m === 'budget') {
    return `
      <div class="modal-overlay" id="modal-overlay">
        <div class="modal">
          <div class="modal-title">
            Set monthly budget
            <button class="icon-btn" id="close-modal" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <div class="form-group">
            <label>Monthly budget (₹)</label>
            <input type="number" id="m-budget-val" value="${userBudget()}" min="0">
          </div>
          <div class="form-actions">
            <button class="btn" id="close-modal-2">Cancel</button>
            <button class="btn btn-primary" id="save-budget">Save</button>
          </div>
        </div>
      </div>`;
  }

  if (m === 'income') {
    return `
      <div class="modal-overlay" id="modal-overlay">
        <div class="modal">
          <div class="modal-title">
            Set monthly income
            <button class="icon-btn" id="close-modal" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <div class="form-group">
            <label>Monthly income (₹)</label>
            <input type="number" id="m-income-val" value="${userIncome()}" min="0">
          </div>
          <div class="form-actions">
            <button class="btn" id="close-modal-2">Cancel</button>
            <button class="btn btn-primary" id="save-income">Save</button>
          </div>
        </div>
      </div>`;
  }

  return '';
}

// ── Login ─────────────────────────────────────────────────────────────────────

function renderLogin() {
  return `
    <div class="login-page">
      <div class="login-card">
        <div class="login-title">
          <div class="logo-icon"><i class="fa-solid fa-wallet"></i></div>
          SpendSense
        </div>
        <p class="login-sub">Personal expense tracker — select your account to continue</p>

        <div class="user-tags" id="user-tags">
          ${state.users.map(u => `<div class="user-tag" data-uid="${u.id}">${escHtml(u.name)}</div>`).join('')}
          <div class="user-tag" data-uid="new"><i class="fa-solid fa-plus" style="font-size:10px"></i> New account</div>
        </div>

        <div id="login-form" style="display:none">
          <div class="form-group">
            <label>Password</label>
            <input type="password" id="lpass" placeholder="Enter password" autocomplete="current-password">
          </div>
          <div class="error-msg" id="login-err">Incorrect password. Try pass1 or pass2 for demo accounts.</div>
          <button class="btn btn-primary" style="width:100%;justify-content:center" id="do-login">
            <i class="fa-solid fa-arrow-right-to-bracket"></i> Sign in
          </button>
        </div>

        <div id="new-form" style="display:none">
          <div class="form-row">
            <div class="form-group"><label>Name</label><input id="nu-name" placeholder="Your name"></div>
            <div class="form-group"><label>Email</label><input id="nu-email" type="email" placeholder="you@email.com"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Password</label><input type="password" id="nu-pass" placeholder="Choose a password"></div>
            <div class="form-group"><label>Monthly budget (₹)</label><input type="number" id="nu-budget" placeholder="5000" min="0"></div>
          </div>
          <div class="form-group"><label>Monthly income (₹)</label><input type="number" id="nu-income" placeholder="10000" min="0"></div>
          <button class="btn btn-primary" style="width:100%;justify-content:center" id="do-register">
            <i class="fa-solid fa-user-plus"></i> Create account
          </button>
        </div>

        <div class="login-hint">Demo passwords: <strong>pass1</strong> (Alex) &nbsp;·&nbsp; <strong>pass2</strong> (Sam)</div>
      </div>
    </div>`;
}

// ── App shell ─────────────────────────────────────────────────────────────────

function renderApp() {
  const u      = currentUser();
  const alerts = getNotifications();
  const PAGE_TITLES = {
    dashboard:     'Dashboard',
    expenses:      'All Expenses',
    analytics:     'Analytics',
    budget:        'Budget & Goals',
    savings:       'Savings Tracker',
    notifications: 'Notifications',
    settings:      'Settings',
  };

  return `
    <div id="app">
      <aside class="sidebar">
        <div class="logo">
          <div class="logo-wordmark">
            <div class="logo-icon"><i class="fa-solid fa-wallet" aria-hidden="true"></i></div>
            SpendSense
          </div>
          <div class="logo-sub">Personal finance tracker</div>
        </div>

        <nav class="nav" aria-label="Main navigation">
          <div class="nav-section">Main</div>
          ${navItem('dashboard',     'fa-solid fa-gauge',      'Dashboard')}
          ${navItem('expenses',      'fa-solid fa-list',       'Expenses')}
          <div class="nav-section">Insights</div>
          ${navItem('analytics',     'fa-solid fa-chart-pie',  'Analytics')}
          ${navItem('budget',        'fa-solid fa-bullseye',   'Budget')}
          ${navItem('savings',       'fa-solid fa-piggy-bank', 'Savings')}
          <div class="nav-section">System</div>
          ${navItem('notifications', 'fa-solid fa-bell',       'Notifications', alerts.length || '')}
          ${navItem('settings',      'fa-solid fa-gear',       'Settings')}
        </nav>

        <div class="sidebar-footer">
          <div class="user-pill" id="logout-btn" title="Sign out" role="button" tabindex="0">
            <div class="avatar">${initials(u.name)}</div>
            <div>
              <div class="user-name">${escHtml(u.name)}</div>
              <div class="user-hint">Click to sign out</div>
            </div>
          </div>
        </div>
      </aside>

      <div class="main">
        <header class="topbar">
          <h1 class="page-title">${PAGE_TITLES[state.activePanel] ?? 'Dashboard'}</h1>
          <div class="topbar-right">
            <button class="btn" id="btn-import"><i class="fa-solid fa-upload"></i> Import CSV</button>
            <button class="btn" id="btn-export"><i class="fa-solid fa-download"></i> Export CSV</button>
            <button class="btn btn-primary" id="btn-add"><i class="fa-solid fa-plus"></i> Add expense</button>
          </div>
        </header>

        <main class="content">
          <div class="panel ${state.activePanel === 'dashboard'     ? 'active' : ''}" id="p-dashboard">${renderDashboard()}</div>
          <div class="panel ${state.activePanel === 'expenses'      ? 'active' : ''}" id="p-expenses">${renderExpenses()}</div>
          <div class="panel ${state.activePanel === 'analytics'     ? 'active' : ''}" id="p-analytics">${renderAnalytics()}</div>
          <div class="panel ${state.activePanel === 'budget'        ? 'active' : ''}" id="p-budget">${renderBudget()}</div>
          <div class="panel ${state.activePanel === 'savings'       ? 'active' : ''}" id="p-savings">${renderSavings()}</div>
          <div class="panel ${state.activePanel === 'notifications' ? 'active' : ''}" id="p-notifications">${renderNotifications()}</div>
          <div class="panel ${state.activePanel === 'settings'      ? 'active' : ''}" id="p-settings">${renderSettings()}</div>
        </main>
      </div>
    </div>
    ${state.modal ? renderModal() : ''}`;
}

// ── Utility ───────────────────────────────────────────────────────────────────

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
