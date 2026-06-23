import { describe, it, expect } from "vitest";
import {
  COMPETITION_TYPES,
  RACE_TYPES,
  competitionMeta,
  raceTypeMeta,
  distanceForRaceType,
  raceTypeForDistance,
} from "./competition";

describe("competition metadata", () => {
  it("exposes the four race-type presets with their distances", () => {
    expect(distanceForRaceType("DASH")).toBe(500);
    expect(distanceForRaceType("SPRINT")).toBe(1200);
    expect(distanceForRaceType("MARATHON")).toBe(2400);
    expect(distanceForRaceType("GRAND_PRIX")).toBe(3000);
  });

  it("maps a stored track length back to the nearest race type", () => {
    expect(raceTypeForDistance(500)).toBe("DASH");
    expect(raceTypeForDistance(1250)).toBe("SPRINT");
    expect(raceTypeForDistance(2900)).toBe("GRAND_PRIX");
  });

  it("falls back gracefully for unknown values", () => {
    expect(competitionMeta("NOPE").value).toBe(COMPETITION_TYPES[0].value);
    expect(raceTypeMeta("NOPE").value).toBe("SPRINT");
  });

  it("marks Guild Cup as not yet available", () => {
    const guild = COMPETITION_TYPES.find((c) => c.value === "GUILD_CUP");
    expect(guild?.available).toBe(false);
    expect(RACE_TYPES).toHaveLength(4);
  });
});
