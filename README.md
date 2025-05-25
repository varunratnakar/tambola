# Tambola Online Multiplayer Game

This repository contains a full-stack implementation of an online Tambola (Housie/Bingo) game.

* **Backend**: Node.js + Express + Socket.IO (directory `server/`)
* **Frontend**: React + Vite + Socket.IO-client (directory `client/`)
* **Deployment**: One-command Docker Compose setup

## Getting started locally

### Prerequisites

* Node.js ≥ 18
* npm ≥ 9

### 1. Install dependencies

```
# Backend
cd server && npm install

# Frontend
cd ../client && npm install
```

### 2. Start development servers

Open two terminals:

1. **Backend**
   ```bash
   cd server
   npm start
   # runs on http://localhost:4000
   ```
2. **Frontend**
   ```bash
   cd client
   npm run dev
   # opens http://localhost:3000
   ```

Open the frontend URL in your browser, create a game, share the game ID with friends and start playing!

## Docker deployment

The project ships with a Docker Compose file that runs both services behind Nginx in production-ready containers.

```
# Build and run (detached)
docker compose up --build -d
```

Then open `http://localhost` in your browser.

## File structure

```
├── client/          # React front-end (Vite)
├── server/          # Node/Express + Socket.IO back-end
├── docker-compose.yml
└── README.md
```

---

Feel free to fork and enhance with features such as authentication, persistent storage, better ticket generation, UI polish and more. 