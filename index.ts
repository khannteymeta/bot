import "dotenv/config";
import { createServer } from "node:http";
import { Bot, webhookCallback } from "grammy";
import { isAuthorized } from "./auth";
import { runDeploy } from "./deploy";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  throw new Error("TELEGRAM_BOT_TOKEN is not set. Copy .env.example to .env and fill it in.");
}

const bot = new Bot(token);
const startedAt = new Date();
const useWebhook = (process.env.USE_WEBHOOK ?? "").toLowerCase() === "true";
const webhookUrl = process.env.WEBHOOK_URL?.trim();
const webhookPath = process.env.WEBHOOK_PATH?.trim() || "/api/webhook";
const webhookPort = Number(process.env.WEBHOOK_PORT ?? process.env.PORT ?? 3000);
const webhookSecretToken = process.env.WEBHOOK_SECRET_TOKEN?.trim();

if (useWebhook && !webhookUrl) {
  throw new Error("WEBHOOK_URL is required when USE_WEBHOOK=true.");
}

// Telegram messages have a ~4096 char limit, leave room for formatting.
const MAX_OUTPUT_CHARS = 3500;

function codeBlock(text: string): string {
  const trimmed = text.length > MAX_OUTPUT_CHARS ? text.slice(0, MAX_OUTPUT_CHARS) + "\n… (truncated)" : text;
  return "```\n" + trimmed + "\n```";
}

async function registerCommands() {
  await bot.api.setMyCommands([
    { command: "start", description: "Show welcome message" },
    { command: "help", description: "List available commands" },
    { command: "status", description: "Check bot uptime & server status" },
    { command: "deploy", description: "Run the deploy command on the server" },
  ]);
}

bot.command("start", async (ctx) => {
  await ctx.reply(
    "👋 Welcome! I'm your deploy bot.\n\nUse /help to see what I can do."
  );
});

bot.command("help", async (ctx) => {
  await ctx.reply(
    "*Available commands*\n\n" +
      "/start — Welcome message\n" +
      "/help — This help message\n" +
      "/status — Show bot uptime & server time\n" +
      "/deploy — Run the configured deploy command on the server\n",
    { parse_mode: "Markdown" }
  );
});

bot.command("status", async (ctx) => {
  const uptimeMinutes = Math.floor((Date.now() - startedAt.getTime()) / 60000);
  await ctx.reply(
    `✅ Bot is running.\nUptime: ${uptimeMinutes} minute(s)\nServer time: ${new Date().toISOString()}`
  );
});

bot.command("deploy", async (ctx) => {
  const userId = ctx.from?.id;

  if (!userId || !isAuthorized(userId)) {
    await ctx.reply("⛔ You are not authorized to run this command.");
    return;
  }

  const statusMsg = await ctx.reply("🚀 Deployment started…");

  try {
    const output = await runDeploy();
    await ctx.api.editMessageText(
      ctx.chat.id,
      statusMsg.message_id,
      `✅ Deploy finished.\n\n${codeBlock(output)}`,
      { parse_mode: "Markdown" }
    );
  } catch (err: any) {
    const message = err?.stdout || err?.stderr || err?.message || String(err);
    await ctx.api.editMessageText(
      ctx.chat.id,
      statusMsg.message_id,
      `❌ Deploy failed.\n\n${codeBlock(String(message))}`,
      { parse_mode: "Markdown" }
    );
  }
});

bot.catch((err) => {
  console.error("Bot error:", err);
});

async function startWebhookServer() {
  const handleUpdate = webhookCallback(bot, "http");
  const server = createServer(async (req, res) => {
    if (!req.url) {
      res.writeHead(400, { "content-type": "text/plain" });
      res.end("Bad Request");
      return;
    }

    const requestUrl = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);

    if (req.method === "GET" && (requestUrl.pathname === "/" || requestUrl.pathname === "/healthz")) {
      res.writeHead(200, { "content-type": "text/plain" });
      res.end("ok");
      return;
    }

    if (req.method === "POST" && requestUrl.pathname === webhookPath) {
      if (webhookSecretToken) {
        const incomingSecret = req.headers["x-telegram-bot-api-secret-token"];
        if (incomingSecret !== webhookSecretToken) {
          res.writeHead(403, { "content-type": "text/plain" });
          res.end("Forbidden");
          return;
        }
      }

      await handleUpdate(req, res);
      return;
    }

    res.writeHead(404, { "content-type": "text/plain" });
    res.end("Not Found");
  });

  server.listen(webhookPort, () => {
    console.log(`Webhook server listening on port ${webhookPort} for ${webhookPath}`);
  });

  await bot.api.setWebhook(webhookUrl as string, { secret_token: webhookSecretToken || undefined });
  console.log(`Webhook configured at ${webhookUrl}`);
}

async function main() {
  await registerCommands();
  console.log("Commands registered with BotFather.");

  if (useWebhook && webhookUrl) {
    await startWebhookServer();
    return;
  }

  await bot.start();
}

main().catch((err) => {
  console.error("Failed to start bot:", err);
  process.exit(1);
});
