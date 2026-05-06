<h1 align="center">🤖 324-servant-Bot</h1>

<p align="center">
  A modern WhatsApp multi-device bot built with <strong>Node.js</strong>, <strong>Baileys</strong>, and <strong>Express</strong>.
</p>

<p align="center">
  <a href="https://github.com/amrelnahas05-wq/324SuperBot">
    <img src="https://img.shields.io/badge/GitHub-324SuperBot-181717?style=for-the-badge&logo=github" />
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/github/stars/amrelnahas05-wq/324SuperBot?color=FFD700&style=flat-square" alt="Stars" />
  <img src="https://img.shields.io/github/forks/amrelnahas05-wq/324SuperBot?color=00BFFF&style=flat-square" alt="Forks" />
  <img src="https://img.shields.io/github/repo-size/amrelnahas05-wq/324SuperBot?color=green&style=flat-square" alt="Repo Size" />
</p>

---

## About

**324-servant-Bot** is a feature-rich WhatsApp multi-device bot designed for simplicity, extensibility, and reliable automation for both group and personal chats.

> Please use responsibly and for educational purposes only.

---

## Session Pairing

Generate your Session ID to connect your WhatsApp account.

You can run the included **self-hosted pairing server** from the `pairing/` folder:

```bash
cd pairing
npm install
node index.js
```

Then open `http://localhost:3000` in your browser, enter your phone number, and follow the on-screen instructions to get your `SESSION_ID`.

### How it works

1. Enter your WhatsApp number (with country code) on the pairing page
2. You'll receive an 8-digit code
3. Open WhatsApp → **Linked Devices** → **Link a Device** → **Link with phone number**
4. Enter the code — your `SESSION_ID` will be displayed
5. Copy it and set it as the `SESSION_ID` environment variable when deploying

---

## Deploy

Deploy 324-servant-Bot with one click:

<p align="center">
  <a href="https://dashboard.heroku.com/new?template=https://github.com/amrelnahas05-wq/324SuperBot"><img src="https://img.shields.io/badge/Heroku-430098?style=for-the-badge&logo=heroku&logoColor=white" /></a>
  <a href="https://railway.app"><img src="https://img.shields.io/badge/Railway-0B0D0E?style=for-the-badge&logo=railway&logoColor=white" /></a>
  <a href="https://dashboard.render.com/web/new"><img src="https://img.shields.io/badge/Render-46E3B7?style=for-the-badge&logo=render&logoColor=white" /></a>
  <a href="https://app.koyeb.com/services/deploy?type=git&repository=amrelnahas05-wq/324SuperBot"><img src="https://img.shields.io/badge/Koyeb-121212?style=for-the-badge&logo=koyeb&logoColor=white" /></a>
</p>

---

## Features

| Feature | Description |
|---------|-------------|
| **Command Handler** | Modular command system with support for custom plugins and events |
| **Multi-Device** | Full multi-device support via Baileys |
| **One-Click Deploy** | Deploy instantly on Heroku, Railway, Render, or Koyeb |
| **Self-Hosted Pairing** | Built-in pairing server — generate SESSION_ID from your own fork |
| **Customizable** | Easily configurable via `settings.js` and environment variables |
| **Clean Logging** | User-friendly logs and clear error messages |

---

## Requirements

| Requirement | Version |
|-------------|---------|
| Node.js | >= 18.x |
| Git | Latest |
| NPM | Latest |
| WhatsApp | Active mobile account |

---

## Quick Start

```bash
git clone https://github.com/amrelnahas05-wq/324SuperBot.git
cd 324SuperBot
npm install
```

Set your `SESSION_ID` in the `.env` file:

```env
SESSION_ID="your_session_id_here"
```

Then start the bot:

```bash
npm start
```

---

## Configuration

Edit `settings.js` to customize the bot:

| Setting | Description |
|---------|-------------|
| `botName` | Name of the bot |
| `botOwner` | Owner display name |
| `ownerNumber` | Your WhatsApp number (with country code) |
| `prefix` | Command prefix (default: `.`) |
| `commandMode` | `public` or `private` |
| `timezone` | Your timezone (e.g. `Africa/cairo`) |

---

## Credits

| Contributor | Link |
|-------------|------|
| **Baileys** | [github.com/WhiskeySockets](https://github.com/WhiskeySockets) |
| **Original base** | [github.com/Dev-Kango](https://github.com/Dev-Kango) |

---

## Notice

> **Educational use only.** Do not use this bot for spam or any illegal activities.
