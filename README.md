# Grand X Telegram Bot V5

Professional Telegram group bot using a Vercel webhook.

## Features

- Professional `/start` menu
- Clear QR instructions and example
- `/Qr LINK`
- `/Mute` — ONLY administrators/owner can execute it
- `/all` — ONLY administrators/owner
- `/Spam` — ONLY administrators/owner, small controlled test
- `/Image`
- `/Video`
- New-member welcome with profile photo + Telegram ID
- Inline buttons
- Telegram command menu
- Automatic webhook setup
- Health endpoint
- Separate image/video source files

## Fresh setup

### 1. Regenerate your Telegram bot token

The old token was exposed. Create a new token in BotFather.

### 2. Put the new token in

`api/config.js`

```js
const BOT_TOKEN = "PASTE_NEW_BOT_TOKEN_HERE";
```

Do not publish a real token in a public GitHub repository.

### 3. Deploy to Vercel

Import the project into Vercel.

### 4. Run automatic setup

Open:

`https://YOUR-DOMAIN.vercel.app/api/setup`

It will automatically:

- set the Telegram webhook
- register the bot command menu

### 5. Test

Open the bot and send:

`/start`

Then:

`/ping`

Then:

`/Qr https://google.com`

## Mute

The command must be used by a group administrator or owner.

Use it by replying to the target member:

`/Mute`

The bot attempts to restrict the target for exactly 10 minutes.

Telegram does not allow the bot to override users it is not allowed to restrict. Administrators/owners cannot normally be muted by the bot.

## Image/video

Edit:

- `src/data/imageSites.js`
- `src/data/videoSites.js`

Only add websites you are permitted to access/scrape. The scraper does not bypass authentication, CAPTCHAs, paywalls, or access controls.

## /all

Telegram does not provide ordinary bots with an unrestricted "list every group member" operation. This implementation mentions members the bot has observed while receiving updates.

## Vercel endpoints

- `/api/health`
- `/api/setup`
- `/api/webhook`
