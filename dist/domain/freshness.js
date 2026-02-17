"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeFreshness = exports.resolveExpiryDate = void 0;
const dayjs_1 = __importDefault(require("dayjs"));
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const toDayBoundary = (isoDate) => (0, dayjs_1.default)(isoDate).startOf("day");
const resolveExpiryDate = (item) => {
    if (item.expiresAt) {
        return toDayBoundary(item.expiresAt).toISOString();
    }
    return toDayBoundary(item.addedAt)
        .add(item.shelfLifeDays, "day")
        .toISOString();
};
exports.resolveExpiryDate = resolveExpiryDate;
const computeFreshness = (item, asOf) => {
    const asOfDate = toDayBoundary(asOf);
    const addedAt = toDayBoundary(item.addedAt);
    const expiresAt = toDayBoundary((0, exports.resolveExpiryDate)(item));
    const totalShelfLifeDays = Math.max(expiresAt.diff(addedAt, "day"), 1);
    const daysUntilExpiry = expiresAt.diff(asOfDate, "day");
    const freshnessScore = clamp(daysUntilExpiry / totalShelfLifeDays, 0, 1);
    let status = "fresh";
    if (daysUntilExpiry < 0) {
        status = "expired";
    }
    else if (freshnessScore <= 0.15) {
        status = "critical";
    }
    else if (freshnessScore <= 0.35) {
        status = "warning";
    }
    const urgencyScore = daysUntilExpiry < 0
        ? 1
        : clamp((1 - freshnessScore) * 0.85 + (status === "critical" ? 0.15 : 0), 0, 1);
    return {
        item,
        expiresAt: expiresAt.toISOString(),
        daysUntilExpiry,
        freshnessScore,
        urgencyScore,
        status,
    };
};
exports.computeFreshness = computeFreshness;
//# sourceMappingURL=freshness.js.map