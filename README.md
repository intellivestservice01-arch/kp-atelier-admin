# KP Atelier — Admin Panel

Plain HTML, CSS, and JavaScript — no build step, no framework. Talks to the
`kp-atelier-backend` API you already have running.

## How to run it

This is a static site, so it just needs to be served (opening the HTML file
directly with double-click can cause some browsers to block API requests —
serving it properly avoids that).

**Easiest way — VS Code Live Server extension:**
1. Install the "Live Server" extension in VS Code (Extensions panel → search "Live Server" by Ritwick Dey)
2. Right-click `index.html` → "Open with Live Server"
3. It opens in your browser, usually at `http://127.0.0.1:5500`

**Or, from the terminal (no extension needed):**
```bash
cd kp-atelier-admin
python -m http.server 8080
```
Then open `http://localhost:8080` in your browser.

## Before you open it

Make sure the backend is running first (`npm run dev` inside `kp-atelier-backend`,
on port 5000). The admin panel expects it at `http://localhost:5000/api` —
that's set in `js/api.js` at the top (`API_BASE`). If you ever deploy the
backend somewhere else, update that one line.

## Login

Use whatever email/password you set in the backend's `.env` and ran through
`npm run seed`. Default from the starter `.env.example` is:
```
admin@kpatelier.com / changeme123
```

## Pages

| Page | What it does |
|---|---|
| `index.html` | Login screen |
| `dashboard.html` | Pending chats, orders by status, best sellers |
| `products.html` | Add/edit/delete garments, upload photos, reserve/release stock |
| `orders.html` | See every order, negotiate final price, confirm → generates tracking ID |
| `chat.html` | Live chat inbox — text + image messages, pin conversations |
| `tracking.html` | Every order that has an active tracking ID, at a glance |

## Notes on how it's built

- `js/api.js` — every API call goes through here. Handles attaching your login token automatically, and logs you out if the token expires.
- `js/layout.js` — builds the sidebar on every page so it isn't copy-pasted five times. Also polls the backend once per page load to show the unread-chat badge.
- Dark/light mode is saved in your browser (`localStorage`) so it remembers your preference next time.
- The chat page uses Socket.io for real-time updates — new customer messages show up without refreshing.
- Internal product IDs (the ones only you should see) appear in the Products table under "Internal ID" — this data never reaches the public-facing site.

## If something doesn't load

Open your browser's dev tools (F12) → Console tab. Most issues will show up
there as a red error — usually either "Failed to fetch" (backend isn't
running, or is running on a different port than 5000) or a 401 error (your
login token expired — just log in again).
