import test from "node:test";
import assert from "node:assert/strict";
import { cronMatches } from "../src/routines/cron.js";

const d = (s: string) => new Date(s);

test("cron: feste Uhrzeit trifft nur zur Minute", () => {
  assert.equal(cronMatches("0 8 * * *", d("2026-06-29T08:00:00")), true);
  assert.equal(cronMatches("0 8 * * *", d("2026-06-29T08:01:00")), false);
  assert.equal(cronMatches("0 8 * * *", d("2026-06-29T09:00:00")), false);
});

test("cron: Schritte (*/15)", () => {
  assert.equal(cronMatches("*/15 * * * *", d("2026-06-29T10:30:00")), true);
  assert.equal(cronMatches("*/15 * * * *", d("2026-06-29T10:31:00")), false);
});

test("cron: Wochentage (Mo–Fr)", () => {
  assert.equal(cronMatches("30 9 * * 1-5", d("2026-06-29T09:30:00")), true); // Montag
  assert.equal(cronMatches("30 9 * * 1-5", d("2026-06-28T09:30:00")), false); // Sonntag
});

test("cron: Tag im Monat + Listen", () => {
  assert.equal(cronMatches("0 0 1 * *", d("2026-07-01T00:00:00")), true);
  assert.equal(cronMatches("0 0 1 * *", d("2026-07-02T00:00:00")), false);
  assert.equal(cronMatches("0 8,12,18 * * *", d("2026-06-29T12:00:00")), true);
  assert.equal(cronMatches("0 8,12,18 * * *", d("2026-06-29T13:00:00")), false);
});

test("cron: Wildcard + ungültiger Ausdruck", () => {
  assert.equal(cronMatches("* * * * *", d("2026-06-29T03:07:00")), true);
  assert.equal(cronMatches("kaputt", d("2026-06-29T03:07:00")), false);
});
