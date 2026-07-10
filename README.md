# telegram-deploy-bot

A small [grammY](https://grammy.dev) Telegram bot that lets you trigger a deploy
command from your phone/Telegram instead of running it on your desktop.

## Commands

| Command   | Description                                          |
|-----------|-------------------------------------------------------|
| `/start`  | Welcome message                                       |
| `/help`   | Lists available commands                               |
| `/status` | Shows bot uptime and server time                        |
| `/deploy` | Runs the configured `DEPLOY_COMMAND` and returns output |

`/deploy` is restricted to the Telegram user IDs listed in `ALLOWED_USER_IDS`.

## Setup

1. **Create a bot** — message [@BotFather](https://t.me/BotFather) on Telegram,
   run `/newbot`, and copy the token it gives you.

2. **Find your Telegram user ID** — message
   [@userinfobot](https://t.me/userinfobot); it replies with your numeric ID.

3. **Install dependencies**

   ```bash
   bun install
   # or: npm install
   ```

4. **Configure environment variables**

   ```bash
   cp .env.example .env
   ```

   Then edit `.env`:

   ```ini
   TELEGRAM_BOT_TOKEN=123456789:AA...        # from BotFather
   ALLOWED_USER_IDS=111111111                # your Telegram user ID(s), comma-separated
   DEPLOY_COMMAND=bash ./deploy.sh           # the actual command to run
   DEPLOY_CWD=/path/to/your/project          # where to run it from
   DEPLOY_TIMEOUT_MS=120000                  # kill it after 2 minutes
   ```

   `DEPLOY_COMMAND` can be anything: a shell script, `git pull && pm2 restart app`,
   a Docker command, an SSH call to another machine, etc. Whatever you'd normally
   type in your terminal to deploy.

5. **Run it**

   ```bash
   bun run dev      # local development, auto-restarts on file changes
   # or
   bun run build && bun run start   # production
   ```

## How it works

- The bot uses **long polling** (`bot.start()`) by default, so no public URL or
  webhook server is required — it works from any machine that can reach
  Telegram's API, including a VPS, Raspberry Pi, or your own server.
- If you switch to **webhook mode**, you will need a public URL or a webhook
  server that can receive Telegram updates; this is only required when the bot
  is configured to use webhooks instead of polling.
- `/deploy` checks the caller's Telegram user ID against `ALLOWED_USER_IDS`
  before running anything.
- The deploy command runs via Node's `child_process.exec`, and its combined
  stdout/stderr is sent back in the chat (truncated if very long).

## Security notes

- **Always set `ALLOWED_USER_IDS` in production.** Without it, anyone who
  finds your bot can trigger `/deploy`.
- Keep `.env` out of version control (already covered by `.gitignore` below).
- Consider giving the bot's host user minimal permissions — only what
  `DEPLOY_COMMAND` actually needs.
- For longer-running deploys, consider streaming progress instead of waiting
  for full completion (e.g. periodically editing the status message) — this
  starter waits for the command to finish, then shows the full output.

## Project structure

```
telegram-deploy-bot/
├── src/
│   ├── index.ts           # bot setup, commands, message handlers
│   ├── auth.ts             # authorization check for privileged commands
│   └── commands/
│       └── deploy.ts       # executes DEPLOY_COMMAND
├── .env.example
├── package.json
└── tsconfig.json
```

## Extending it

- Add more commands (e.g. `/logs`, `/restart`, `/rollback`) the same way
  `/deploy` is implemented: define a `bot.command(...)` handler, check
  `isAuthorized`, and call a function in `src/commands/`.
- Run the bot with Bun (`bun run dev` / `bun run start`) or keep using Node/npm
  if you prefer.
- If you want webhook support, expose a public URL and set up a webhook endpoint
  that forwards Telegram updates to your bot.
- Swap `child_process.exec` for `spawn` if you want to stream output live by
  editing the Telegram message as new lines arrive.
- Add inline keyboards (grammY supports `InlineKeyboard`) if you want a
  button-based menu instead of typed commands.

## Vercel deployment

1. Install the Vercel CLI if needed:

   ```bash
   npm i -g vercel
   ```

2. Deploy from the project root:

   ```bash
   npm run deploy:vercel
   ```

3. Add these environment variables in Vercel:

   ```env
   TELEGRAM_BOT_TOKEN=your-bot-token
   ALLOWED_USER_IDS=your-telegram-user-id
   DEPLOY_COMMAND=bash ./deploy.sh
   DEPLOY_CWD=/path/to/your/project
   DEPLOY_TIMEOUT_MS=120000
   USE_WEBHOOK=true
   WEBHOOK_URL=https://your-app.vercel.app/api/webhook
   WEBHOOK_PATH=/api/webhook
   WEBHOOK_SECRET_TOKEN=optional-shared-secret
   ```

4. Set the Telegram webhook:

   ```bash
   curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://your-app.vercel.app/api/webhook"
   ```

5. Verify the endpoint:

   ```bash
   curl https://your-app.vercel.app/api/webhook
   ```

   It should return `ok`.
