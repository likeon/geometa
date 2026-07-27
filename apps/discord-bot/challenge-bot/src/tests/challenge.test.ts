import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  aggregateLeaderboards,
  challengeButtonLabel,
  challengeMessage,
  dateShift,
  isPostDue,
  leaderboardMessage,
  nextPostTimestamp,
  parseSettings,
  selectMap,
  type Challenge,
} from "../challenge.js";
import { createMissingChallenges, loadSettings } from "../bot.js";
import {
  challengePayload,
  enrichPlayerCountries,
  fetchChallengeResults,
} from "../geoguessr.js";
import { StateStore } from "../state.js";

test("loads static, filtered, and full LearnableMeta pools from YAML", async () => {
  const directory = await mkdtemp(join(tmpdir(), "challengebot-config-"));
  try {
    const path = join(directory, "config.yaml");
    await writeFile(path, `
challenge:
  channel_id: 123456789012345678
  post_time: "12:00"
  timezone: Europe/Berlin
  rounds: 5
  time_limit: 90
  message:
    show_title: true
    title: Daily Challenge
  leaderboard:
    enabled: true
    max_players: 10
game_modes:
  nm:
    name: NM
    settings:
      forbid_moving: true
      forbid_rotating: false
      forbid_zooming: false
pools:
  - id: world
    name: World
    maps:
      - name: A Community World
        map_id: map-1
        game_modes: [nm]
  - id: alm-europe
    name: Learnable Meta Europe
    learnable_meta:
      region: Europe
      is_shared: true
    game_modes: [nm]
  - id: alm-all
    name: All Learnable Maps
    learnable_meta: {}
    game_modes: [nm]
`, "utf8");
    const requestedUrls: string[] = [];
    const settings = await loadSettings(path, async (input) => {
      requestedUrls.push(String(input));
      return jsonResponse([{
        geoguessrId: "alm-map-1",
        name: "A Learnable Europe",
        authors: "Map Maker",
      }]);
    });
    assert.equal(settings.challenge.channelId, "123456789012345678");
    assert.equal(settings.challenge.timeZone, "Europe/Berlin");
    assert.equal(settings.pools[0]!.maps[0]!.mapId, "map-1");
    assert.deepEqual(requestedUrls.sort(), [
      "https://learnablemeta.com/api/maps/",
      "https://learnablemeta.com/api/maps/?region=Europe&isShared=true",
    ]);
    assert.deepEqual(settings.pools[1]!.maps[0], {
      name: "A Learnable Europe",
      mapId: "alm-map-1",
      mapKey: "alm-map-1",
      gameModes: ["nm"],
      creator: {
        name: "Map Maker",
        geoguessrId: "",
        discordId: "",
        customLinkText: "",
        customLinkUrl: "",
      },
    });
    assert.equal(settings.pools[2]!.maps[0]!.mapId, "alm-map-1");
    await assert.rejects(
      loadSettings(path, async () => jsonResponse([])),
      /learnable_meta returned no maps/,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("validates configuration and schedules correctly across DST", () => {
  const settings = fixtureSettings();
  assert.equal(isPostDue(new Date("2026-03-28T10:59:00Z"), settings.challenge), false);
  assert.equal(isPostDue(new Date("2026-03-28T11:00:00Z"), settings.challenge), true);
  assert.equal(
    nextPostTimestamp(new Date("2026-03-28T11:01:00Z"), settings.challenge),
    Date.parse("2026-03-29T10:00:00Z") / 1_000,
  );
  assert.equal(dateShift("2026-03-01", -1), "2026-02-28");
  assert.throws(
    () => parseSettings({
      ...fixtureValue(),
      challenge: {
        ...fixtureValue().challenge as object,
        post_time: "25:00",
      },
    }),
    /challenge\.post_time/,
  );
});

test("avoids recent maps and keeps the GeoGuessr payload minimal", () => {
  const settings = fixtureSettings();
  const pool = settings.pools[0]!;
  assert.equal(selectMap(pool, ["map-1"], () => 0).mapId, "map-2");
  assert.deepEqual(
    challengePayload(pool.maps[0]!, settings.gameModes.nm!, settings.challenge),
    {
      forbidMoving: true,
      forbidRotating: false,
      forbidZooming: false,
      map: "map-1",
      rounds: 5,
      timeLimit: 90,
    },
  );
  assert.equal(challengeButtonLabel("Map One"), "Map One");
  assert.equal([...challengeButtonLabel("x".repeat(100))].length, 80);
});

test("uses the primary paginated GeoGuessr result endpoint", async () => {
  const urls: string[] = [];
  let resultPages = 0;
  const fetcher: typeof fetch = async (input, init) => {
    const url = String(input);
    urls.push(url);
    assert.equal(new Headers(init?.headers).get("cookie"), "_ncfa=cookie value");
    if (url.includes("/api/v3/users/")) {
      return jsonResponse({ countryCode: url.endsWith("/a") ? "CN" : "DE" });
    }
    resultPages += 1;
    const page = resultPages === 1
      ? {
          items: [{
            game: {
              player: {
                id: "a",
                nick: "Ada",
                totalScore: { amount: 5_000 },
              },
            },
          }],
          paginationToken: "next page",
        }
      : {
          items: [{
            player: {
              id: "b",
              nick: "Bob",
              totalScore: 4_500,
            },
          }],
        };
    return jsonResponse(page);
  };

  const players = await fetchChallengeResults("token/value", "cookie%20value", fetcher);
  assert.deepEqual(players, [
    { playerName: "Ada", userId: "a", totalScore: 5_000 },
    { playerName: "Bob", userId: "b", totalScore: 4_500 },
  ]);
  assert.match(urls[0]!, /\/results\/highscores\/token%2Fvalue\?/);
  assert.match(urls[1]!, /paginationToken=next%20page$/);
  assert.equal(urls.some((url) => url.includes("/api/v3/challenges/")), false);

  await enrichPlayerCountries([...players, players[0]!], "cookie%20value", fetcher);
  assert.deepEqual(players.map((player) => player.country), ["CN", "DE"]);
  assert.equal(urls.filter((url) => url.includes("/api/v3/users/")).length, 2);
});

test("persists successful pools and retries only missing challenges", async () => {
  const directory = await mkdtemp(join(tmpdir(), "challengebot-state-"));
  try {
    const path = join(directory, "state.json");
    await writeFile(path, JSON.stringify({
      last_posted_date: null,
      recent_maps: { world: ["map-1"] },
      posted_pools: {},
      daily_challenges: {
        "2026-07-23": [{
          token: "saved",
          map_name: "Saved Map",
          game_mode: "NM",
          map_key: "map-1",
          pool_key: "world",
        }],
      },
      posted_leaderboards: [],
    }), "utf8");

    const settings = fixtureSettings();
    settings.pools.push({
      name: "Country",
      key: "country",
      maps: [{
        ...settings.pools[0]!.maps[0]!,
        name: "Germany",
        mapId: "map-de",
        mapKey: "map-de",
      }],
    });

    let creates = 0;
    const fetcher: typeof fetch = async (_input, init) => {
      creates += 1;
      assert.equal(init?.method, "POST");
      return jsonResponse({ token: "new-token" }, 201);
    };
    const state = await StateStore.open(path);
    const first = await createMissingChallenges(
      settings,
      state,
      "2026-07-23",
      "cookie",
      fetcher,
      () => 0,
    );
    assert.equal(creates, 1);
    assert.deepEqual(first.errors, []);
    assert.deepEqual(first.challenges.map((challenge) => challenge.token), [
      "saved",
      "new-token",
    ]);

    const reopened = await StateStore.open(path);
    assert.equal(reopened.challengeNumber("2026-07-23"), 1);
    const second = await createMissingChallenges(
      settings,
      reopened,
      "2026-07-23",
      "cookie",
      fetcher,
      () => 0,
    );
    assert.equal(creates, 1);
    assert.equal(second.challenges.length, 2);
    assert.equal((await readFile(`${path}.tmp`, "utf8").catch(() => "")), "");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("formats configurable announcements and bounded escaped leaderboards", () => {
  const settings = fixtureSettings();
  const challenges = [
    storedChallenge(1, "world", "World Map"),
    storedChallenge(2, "country", "Germany"),
  ];
  challenges[0]!.creator = {
    name: "Map *Maker*",
    geoguessrId: "creator/id",
    discordId: "123",
    customLinkText: "Website",
    customLinkUrl: "https://example.com",
  };
  const announcement = challengeMessage(
    settings.challenge,
    challenges,
    1_800_000_000,
  )!;
  assert.match(announcement, /^# Daily Challenge/m);
  assert.match(announcement, /Creator:/);
  assert.match(announcement, /<@123>/);
  assert.match(announcement, /Map \\\*Maker\\\*/);

  const players = aggregateLeaderboards([
    [
      {
        playerName: "dyingangels",
        userId: "a",
        totalScore: 5_000,
        country: "CN",
      },
      { playerName: "Bad\n*Name*", userId: "b", totalScore: 4_900 },
    ],
    [{
      playerName: "dyingangels",
      userId: "a",
      totalScore: 4_800,
      country: "CN",
    }],
  ]);
  assert.deepEqual(players.map((player) => ({
    name: player.playerName,
    score: player.totalScore,
    games: player.playedCount,
    country: player.country,
  })), [
    { name: "dyingangels", score: 9_800, games: 2, country: "CN" },
    { name: "Bad\n*Name*", score: 4_900, games: 1, country: undefined },
  ]);
  const content = leaderboardMessage(players, 284, "2026-07-22", 10)!;
  assert.ok(content.length <= 2_000);
  assert.equal(
    content,
    "# DAILY LEADERBOARD #284 · Jul 22, 2026\n\n" +
      "## 1. dyingangels 🇨🇳  (9800)\n" +
      "2. Bad \\*Name\\* (4900)",
  );
});

test("fails closed on malformed state instead of risking duplicate challenges", async () => {
  const directory = await mkdtemp(join(tmpdir(), "challengebot-invalid-state-"));
  try {
    const path = join(directory, "state.json");
    await writeFile(path, "{not json", "utf8");
    await assert.rejects(StateStore.open(path), /Invalid state file/);
    await writeFile(path, JSON.stringify({
      daily_challenges: {
        "2026-07-23": [{ token: "would-be-duplicated" }],
      },
    }), "utf8");
    await assert.rejects(StateStore.open(path), /token and pool_key strings/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

function fixtureSettings() {
  return parseSettings(fixtureValue());
}

function fixtureValue(): Record<string, unknown> {
  const map = (id: string, name: string): Record<string, unknown> => ({
    name,
    map_id: id,
    game_modes: ["nm"],
  });
  return {
    challenge: {
      channel_id: 123456789012345678n,
      post_time: "12:00",
      timezone: "Europe/Berlin",
      rounds: 5,
      time_limit: 90,
      challenge_url: "https://www.geoguessr.com/challenge/",
      message: {
        show_title: true,
        title: "Daily Challenge",
        show_date: true,
        show_next_challenge: true,
        show_creators: true,
      },
      leaderboard: { enabled: true, max_players: 10 },
    },
    game_modes: {
      nm: {
        name: "NM",
        settings: {
          forbid_moving: true,
          forbid_rotating: false,
          forbid_zooming: false,
        },
      },
    },
    pools: [{
      id: "world",
      name: "World",
      maps: [map("map-1", "Map One"), map("map-2", "Map Two")],
    }],
  };
}

function storedChallenge(
  dailyOrder: number,
  poolKey: string,
  mapName: string,
): Challenge {
  return {
    date: "2026-07-23",
    dailyOrder,
    poolKey,
    mapKey: `map-${dailyOrder}`,
    mapName,
    modeName: "NM",
    token: `token-${dailyOrder}`,
    creator: {
      name: "",
      geoguessrId: "",
      discordId: "",
      customLinkText: "",
      customLinkUrl: "",
    },
  };
}

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
