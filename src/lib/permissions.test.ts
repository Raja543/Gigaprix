import { describe, it, expect } from "vitest";
import { isManager, isPrimaryHost } from "./permissions";

const t = {
  host: { walletAddress: "0xhost000000000000000000000000000000000001" },
  coHosts: ["0xCo0000000000000000000000000000000000000A"],
};

describe("permissions", () => {
  it("recognises the primary host (case-insensitive)", () => {
    expect(isPrimaryHost(t, t.host.walletAddress.toUpperCase())).toBe(true);
    expect(isPrimaryHost(t, t.coHosts[0])).toBe(false);
    expect(isPrimaryHost(t, "0xstranger")).toBe(false);
    expect(isPrimaryHost(t, null)).toBe(false);
  });

  it("treats host and co-hosts as managers", () => {
    expect(isManager(t, t.host.walletAddress)).toBe(true);
    expect(isManager(t, t.coHosts[0].toLowerCase())).toBe(true);
    expect(isManager(t, "0xstranger")).toBe(false);
    expect(isManager(t, undefined)).toBe(false);
  });

  it("handles missing co-host list", () => {
    expect(isManager({ host: { walletAddress: "0xa" } }, "0xa")).toBe(true);
    expect(isManager({ host: { walletAddress: "0xa" } }, "0xb")).toBe(false);
  });
});
