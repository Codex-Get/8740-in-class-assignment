import { computeFreshness, resolveExpiryDate } from "../src/domain/freshness";
import { PantryItem } from "../src/domain/models";

const buildItem = (overrides: Partial<PantryItem> = {}): PantryItem => ({
  id: "item-x",
  name: "Milk",
  quantity: 1,
  unit: "bottle",
  addedAt: "2026-02-10T12:34:56.000Z",
  shelfLifeDays: 10,
  storageZone: "fridge",
  tags: [],
  ...overrides,
});

describe("freshness domain", () => {
  it("uses explicit expiresAt when provided", () => {
    const item = buildItem({ expiresAt: "2026-02-22T20:00:00.000Z" });
    const resolved = resolveExpiryDate(item);
    expect(resolved.slice(0, 10)).toBe("2026-02-22");
  });

  it("marks item as warning near expiry", () => {
    const item = buildItem({ addedAt: "2026-02-01T00:00:00.000Z", shelfLifeDays: 10 });
    const snapshot = computeFreshness(item, "2026-02-08T00:00:00.000Z");
    expect(snapshot.daysUntilExpiry).toBe(3);
    expect(snapshot.status).toBe("warning");
    expect(snapshot.urgencyScore).toBeGreaterThan(0.5);
  });

  it("marks item as critical and then expired", () => {
    const item = buildItem({ addedAt: "2026-02-01T00:00:00.000Z", shelfLifeDays: 10 });

    const critical = computeFreshness(item, "2026-02-10T00:00:00.000Z");
    expect(critical.daysUntilExpiry).toBe(1);
    expect(critical.status).toBe("critical");

    const expired = computeFreshness(item, "2026-02-13T00:00:00.000Z");
    expect(expired.daysUntilExpiry).toBe(-2);
    expect(expired.status).toBe("expired");
    expect(expired.urgencyScore).toBe(1);
  });
});