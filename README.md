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

Generate Railway-compatible session variables to connect your WhatsApp account.

You can run the included **self-hosted pairing server** from the `pairing/` folder:

```bash
cd pairing
npm install
node index.js
```

For Railway deployments, use the standalone pairing project at [qr-bot](https://github.com/amrelnahas05-wq/qr-bot). It supports both QR scanning and phone-number pairing, then displays the session variables needed by this bot.

### Railway session setup

1. Pair your WhatsApp account with `qr-bot` and copy every displayed variable.
2. In Railway, open this bot service, then select **Variables → Raw Editor**.
3. Paste the copied variables, which look like this:

   ```text
   SESSION_ID_PARTS=2
   SESSION_ID_1=<first session-data chunk>
   SESSION_ID_2=<second session-data chunk>
   ```

4. Save the variables and redeploy the bot service.

> Add every `SESSION_ID_N` variable exactly as generated. Railway cannot store the complete session archive in one environment-variable value.

### Meme sounds with `.smeme`

The `.smeme` command searches Voicy and sends a random matching sound as an MP3 audio message. Set the API key as a Railway variable or in your local `.env` file:

```env
VOICY_API_KEY=your_voicy_api_key
```

Use it with an optional search phrase, for example `.smeme vine boom`, `.smeme bruh`, or `.smeme airhorn`. If no phrase is supplied, the command searches for general meme sounds. Request a Voicy API key from the [Voicy API documentation](https://api.voicy.network/).

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

Set all generated session variables in the `.env` file. For example:

```env
SESSION_ID_PARTS=2
SESSION_ID_1="first_session_data_chunk"
SESSION_ID_2="second_session_data_chunk"
VOICY_API_KEY="your_voicy_api_key"
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

## Editable Arabic list

A starter Arabic list is stored in [`data/arabic-list.json`](data/arabic-list.json). Replace the values inside `title`, `description`, and the `items` array whenever you are ready. Keep the file as valid JSON: use double quotes around text, separate entries with commas, and preserve Arabic text as UTF-8.

### OmniRoute AI with `.omni`

The `.omni` command sends a question to a separately running [OmniRoute](https://github.com/diegosouzapw/OmniRoute) instance through its OpenAI-compatible API. Configure the connection in Railway Variables or a local `.env` file:

```env
OMNIROUTE_BASE_URL=http://127.0.0.1:20128/v1
OMNIROUTE_MODEL=auto
OMNIROUTE_API_KEY=your_omniroute_api_key
# Optional:
OMNIROUTE_TIMEOUT_MS=45000
OMNIROUTE_SYSTEM_PROMPT=Answer clearly and concisely in English.
```

For a separate Railway service, replace `127.0.0.1` with the private or protected URL of the OmniRoute service. Use `.omni Explain how solar panels work` in WhatsApp. The command is intentionally isolated in `commands/omni.js`, so its URL, model, prompt, timeout, and behavior can be edited easily.
