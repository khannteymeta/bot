"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAuthorized = isAuthorized;
const allowedUserIds = (process.env.ALLOWED_USER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .map(Number);
/**
 * Returns true if the given Telegram user ID is allowed to run
 * privileged commands like /deploy.
 *
 * If ALLOWED_USER_IDS is not set, everyone is allowed (fine for local
 * testing, NOT recommended for production).
 */
function isAuthorized(userId) {
    if (allowedUserIds.length === 0)
        return true;
    return allowedUserIds.includes(userId);
}
