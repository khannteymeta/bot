import "dotenv/config";
import { Bot, webhookCallback } from "grammy";
import { isAuthorized } from "../auth";
import { runDeploy, runWebhookDeploy } from "../deploy";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  throw new Error("TELEGRAM_BOT_TOKEN is not set. Copy .env.example to .env and fill it in.");
}

const bot = new Bot(token);
const startedAt = new Date();
const MAX_OUTPUT_CHARS = 3500;
const webhookPath = process.env.WEBHOOK_PATH?.trim() || "/api/webhook";
const webhookUrl = process.env.WEBHOOK_URL?.trim();
const webhookSecretToken = process.env.WEBHOOK_SECRET_TOKEN?.trim();

function codeBlock(text: string): string {
  const trimmed = text.length > MAX_OUTPUT_CHARS ? text.slice(0, MAX_OUTPUT_CHARS) + "\n… (truncated)" : text;
  return "```\n" + trimmed + "\n```";
}

async function registerCommands() {
  await bot.api.setMyCommands([
    { command: "start", description: "Show welcome message" },
    { command: "help", description: "List available commands" },
    { command: "status", description: "Check bot uptime & server status" },
    { command: "deploy", description: "Run deploy (optional: target name, e.g. komerz-frontend)" },
    { command: "deploy_frontend", description: "Deploy komerz-frontend" },
    { command: "deploy_backend", description: "Deploy komerz-backend" },
  ]);
}

bot.command("start", async (ctx) => {
  await ctx.reply("👋 Welcome! I'm your deploy bot.\n\nUse /help to see what I can do.");
});

bot.command("help", async (ctx) => {
  await ctx.reply(
    "*Available commands*\n\n" +
      "/start — Welcome message\n" +
      "/help — This help message\n" +
      "/status — Show bot uptime & server time\n" +
      "/deploy [target] — Run deployment (defaults to server-configured deploy, or specify target like komerz-frontend)\n" +
      "/deploy_frontend — Deploy komerz-frontend\n" +
      "/deploy_backend — Deploy komerz-backend\n",
    { parse_mode: "Markdown" }
  );
});

bot.command("status", async (ctx) => {
  const uptimeMinutes = Math.floor((Date.now() - startedAt.getTime()) / 60000);
  await ctx.reply(
    `✅ Bot is running.\nUptime: ${uptimeMinutes} minute(s)\nServer time: ${new Date().toISOString()}`
  );
});

async function handleDeployAction(ctx: any, target?: string) {
  const userId = ctx.from?.id;

  if (!userId || !isAuthorized(userId)) {
    await ctx.reply(`⛔ You are not authorized to run this command. (Your Telegram User ID: ${userId ?? "unknown"})`);
    return;
  }

  const statusMsg = await ctx.reply(target ? `🚀 Deployment of ${target} started…` : "🚀 Deployment started…");

  try {
    const output = target ? await runWebhookDeploy(target) : await runDeploy();
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
}

bot.command("deploy", async (ctx) => {
  const target = ctx.match?.trim() || undefined;
  await handleDeployAction(ctx, target);
});

bot.command("deploy_frontend", async (ctx) => {
  await handleDeployAction(ctx, "komerz-frontend");
});

bot.command("deploy_backend", async (ctx) => {
  await handleDeployAction(ctx, "komerz-backend");
});

bot.catch((err) => {
  console.error("Bot error:", err);
});

const handleUpdate = webhookCallback(bot, "http");
let webhookConfigured = false;

async function ensureWebhook() {
  if (webhookConfigured) return;
  await registerCommands();
  if (webhookUrl) {
    await bot.api.setWebhook(webhookUrl, {
      secret_token: webhookSecretToken || undefined,
    });
    console.log(`Webhook configured at ${webhookUrl}`);
  }
  webhookConfigured = true;
}

function sendResponse(res: any, statusCode: number, body: string) {
  res.statusCode = statusCode;
  res.setHeader("content-type", "text/plain; charset=utf-8");
  res.end(body);
}

async function handleHttpDeploy(target: string, res: any) {
  try {
    const output = await runWebhookDeploy(target);
    res.statusCode = 200;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ success: true, target, output }));
  } catch (err: any) {
    res.statusCode = 500;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ success: false, error: err.message || String(err) }));
  }
}

export default async function handler(req: any, res: any) {
  await ensureWebhook();

  if (!req.url) {
    sendResponse(res, 400, "Bad Request");
    return;
  }

  const requestUrl = new URL(req.url, `https://${req.headers.host || "example.vercel.app"}`);

  if (req.method === "GET" && (requestUrl.pathname === "/" || requestUrl.pathname === "/healthz")) {
    sendResponse(res, 200, "ok");
    return;
  }

  if ((req.method === "POST" || req.method === "GET") && requestUrl.pathname === "/deploy-komerz-frontend") {
    await handleHttpDeploy("komerz-frontend", res);
    return;
  }

  if ((req.method === "POST" || req.method === "GET") && requestUrl.pathname === "/deploy-komerz-backend") {
    await handleHttpDeploy("komerz-backend", res);
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === webhookPath) {
    if (webhookSecretToken) {
      const incomingSecret = req.headers["x-telegram-bot-api-secret-token"];
      if (incomingSecret !== webhookSecretToken) {
        sendResponse(res, 403, "Forbidden");
        return;
      }
    }

    await handleUpdate(req, res);
    return;
  }

  sendResponse(res, 404, "Not Found");
}
