import dayjs from "dayjs";
import { FreshnessSnapshot, PantryItem } from "./models";

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const toDayBoundary = (isoDate: string): dayjs.Dayjs => dayjs(isoDate).startOf("day");

export const resolveExpiryDate = (item: PantryItem): string => {
  if (item.expiresAt) {
    return toDayBoundary(item.expiresAt).toISOString();
  }

  return toDayBoundary(item.addedAt)
    .add(item.shelfLifeDays, "day")
    .toISOString();
};

export const computeFreshness = (item: PantryItem, asOf: string): FreshnessSnapshot => {
  const asOfDate = toDayBoundary(asOf);
  const addedAt = toDayBoundary(item.addedAt);
  const expiresAt = toDayBoundary(resolveExpiryDate(item));

  const totalShelfLifeDays = Math.max(expiresAt.diff(addedAt, "day"), 1);
  const daysUntilExpiry = expiresAt.diff(asOfDate, "day");
  const freshnessScore = clamp(daysUntilExpiry / totalShelfLifeDays, 0, 1);

  let status: FreshnessSnapshot["status"] = "fresh";
  if (daysUntilExpiry < 0) {
    status = "expired";
  } else if (freshnessScore <= 0.15) {
    status = "critical";
  } else if (freshnessScore <= 0.35) {
    status = "warning";
  }

  const urgencyScore =
    daysUntilExpiry < 0
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