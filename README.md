# SpendSense

A personal expense tracker built with vanilla HTML, CSS, and JavaScript. No frameworks, no build tools — just open `index.html` in a browser.

## Features

**Core**
- Add, edit, and delete expenses (amount, category, date, description)
- Recurring expense support (rent, subscriptions, internet)
- Search and filter by name or category
- Sort by date or amount (ascending / descending)

**Budget & Goals**
- Set a monthly budget and track remaining balance
- Visual usage bar with colour-coded warnings
- Category-wise budget breakdown

**Analytics**
- Highest spending category
- Average daily spend
- Month-end spending prediction
- 7 / 14 / 21 / 30-day projections
- Category breakdown chart (Chart.js)

**Savings**
- Income − Expenses = Savings
- Savings rate ring visualisation

**Accounts**
- Multiple user accounts with password authentication
- Data persists across sessions via `localStorage`

**Import / Export**
- Export all expenses to CSV
- Import expenses from a CSV file

**Notifications**
- Budget exceeded alert
- 80% budget usage warning
- Upcoming recurring bill reminders (within 5 days)
- Month-end overspend prediction warning

## Getting started

```bash
git clone https://github.com/your-username/spendsense.git
cd spendsense
# open index.html in your browser
```

No `npm install`, no build step. Works offline.

## Demo accounts

| Name         | Password |
|--------------|----------|
| Alex Johnson | pass1    |
| Sam Rivera   | pass2    |

## Project structure

```
spendsense/
├── index.html       # Entry point
├── css/
│   └── main.css     # All styles, light + dark mode
├── js/
│   ├── data.js      # State, data helpers, localStorage persistence
│   ├── ui.js        # HTML rendering functions
│   └── app.js       # Event bindings, chart, main render loop
└── README.md
```

## CSV format

When importing, the file should have this column order:

```
Date,Description,Category,Amount,Recurring
2026-06-01,"Monthly rent",Rent,1200,Yes
2026-06-03,"Groceries",Food,450,No
```

Valid categories: `Food`, `Travel`, `Shopping`, `Entertainment`, `Rent`, `Internet`, `Subscriptions`, `Other`

## Tech

- Vanilla JS (ES2020) — no framework
- CSS custom properties for theming
- Automatic dark mode via `prefers-color-scheme`
- [Chart.js](https://www.chartjs.org/) for the category chart
- [Font Awesome](https://fontawesome.com/) for icons
- [JetBrains Mono](https://www.jetbrains.com/lp/mono/) for numbers

## License

MIT
