/* ── API client layer ────────────────────────────────────── */

import { state, CONSTANTS } from './state.js';
import { buildQuery, normalizeSteamSearchResults } from './utils.js';

const { deadlockApiBase } = CONSTANTS;

export async function fetchJsonOrThrow(url, fetchOptions = {}) {
  const res = await fetch(url, fetchOptions);
  const contentType = res.headers.get("content-type") || "";
  const body = contentType.includes("application/json") ? await res.json() : await res.text();

  if (!res.ok) {
    const details = typeof body === "string" ? body : JSON.stringify(body);
    if (res.status === 429) {
      throw new Error("Limite API atteinte (429). Reessaye plus tard ou utilise l'historique stocke.");
    }
    throw new Error(`HTTP ${res.status} - ${details.slice(0, 220)}`);
  }

  if (typeof body === "string") {
    throw new Error(`Reponse non JSON recue: ${body.slice(0, 120)}`);
  }

  return body;
}

export async function deadlockGet(pathname, query = {}, fetchOptions = {}) {
  const url = `${deadlockApiBase}${pathname}${buildQuery(query)}`;
  return fetchJsonOrThrow(url, fetchOptions);
}

export function isMissingMatchSaltsError(error) {
  const message = String(error?.message || "").toLowerCase();
  return message.includes("match salts") || message.includes("failed to fetch match salts");
}

export async function fetchMatchMetadataWithFallback(matchId) {
  const fullQuery = {
    include_player_info: true,
    include_player_items: true,
    include_player_stats: true,
  };

  try {
    return await deadlockGet(`/v1/matches/${matchId}/metadata`, fullQuery);
  } catch (error) {
    if (!isMissingMatchSaltsError(error)) throw error;
  }

  try {
    return await deadlockGet(`/v1/matches/${matchId}/metadata`);
  } catch (error) {
    if (!isMissingMatchSaltsError(error)) throw error;
  }

  throw new Error(`Les details du match #${matchId} ne sont pas disponibles (salts/replay manquants).`);
}

export async function apiGet(pathname, query = {}) {
  if (pathname === "/health") {
    return deadlockGet("/v1/info/health");
  }

  if (pathname === "/leaderboard") {
    const region = query.region || "Europe";
    const limit = Math.min(Math.max(Number(query.limit || 20), 1), 100);
    const data = await deadlockGet(`/v1/leaderboard/${encodeURIComponent(region)}`);
    const entries = Array.isArray(data.entries) ? data.entries.slice(0, limit) : [];
    return { region, total: entries.length, entries };
  }

  if (pathname === "/player-search") {
    const searchQuery = String(query.searchQuery || "").trim();
    if (!searchQuery) return [];
    const data = await deadlockGet("/v1/players/steam-search", {
      search_query: searchQuery,
    });
    return normalizeSteamSearchResults(data);
  }

  if (pathname === "/builds") {
    const buildId = Number(query.buildId);
    if (!Number.isInteger(buildId) || buildId <= 0) return null;
    const data = await deadlockGet("/v1/builds", {
      build_id: buildId,
      only_latest: query.onlyLatest !== false,
      language: query.language ?? 0,
    });
    return Array.isArray(data) ? data[0] ?? null : data;
  }

  if (pathname === "/match-history") {
    const accountId = Number(query.accountId);
    const onlyStored = query.onlyStored !== false && query.onlyStored !== "false";
    const [matchHistory, steamProfiles] = await Promise.all([
      deadlockGet(`/v1/players/${accountId}/match-history`, {
        only_stored_history: onlyStored,
      }),
      deadlockGet("/v1/players/steam", {
        account_ids: [accountId],
      }).catch(() => []),
    ]);
    const history = Array.isArray(matchHistory) ? matchHistory : [];
    const steamProfile = Array.isArray(steamProfiles) ? steamProfiles[0] : null;
    const playerName =
      steamProfile?.personaname ||
      history[0]?.username ||
      null;
    const playerProfileUrl = steamProfile?.profileurl || null;
    const playerAvatar = steamProfile?.avatarfull || steamProfile?.avatarmedium || steamProfile?.avatar || null;
    return { accountId, playerName, playerProfileUrl, playerAvatar, total: history.length, history };
  }

  if (pathname === "/player-info") {
    const accountId = Number(query.accountId);
    const forceRefresh = query.forceRefresh === true || query.forceRefresh === "true";
    const profiles = await deadlockGet(
      "/v1/players/steam",
      { account_ids: [accountId] },
      forceRefresh ? { cache: "no-store" } : {}
    );
    const profile = Array.isArray(profiles) ? profiles[0] : null;
    if (!profile) return null;
    return {
      account_id: profile.account_id,
      account_name: profile.personaname,
      persona_name: profile.personaname,
      profileurl: profile.profileurl,
      avatar: profile.avatar,
      avatarmedium: profile.avatarmedium,
      avatarfull: profile.avatarfull,
    };
  }

  if (pathname === "/mmr-history") {
    const accountId = Number(query.accountId);
    return deadlockGet(`/v1/players/${accountId}/mmr-history`);
  }

  if (pathname === "/global-duration-insights") {
    const sampleSize = Math.max(100, Math.min(Number(query.sampleSize || 100000), 100000));
    const overallQuery = `SELECT avg(duration_s) AS avg_duration_s, count() AS matches FROM (SELECT duration_s FROM match_info WHERE duration_s > 0 ORDER BY start_time DESC LIMIT ${sampleSize})`;
    const byBadgeQuery = `SELECT average_badge, avg(duration_s) AS avg_duration_s, count() AS matches FROM (SELECT duration_s, toUInt32(round((ifNull(average_badge_team0,0)+ifNull(average_badge_team1,0))/2)) AS average_badge FROM match_info WHERE duration_s > 0 ORDER BY start_time DESC LIMIT ${sampleSize}) WHERE average_badge > 0 GROUP BY average_badge HAVING count() >= 20 ORDER BY average_badge DESC`;
    const [overallRows, byBadgeRows] = await Promise.all([
      deadlockGet("/v1/sql", { query: overallQuery }),
      deadlockGet("/v1/sql", { query: byBadgeQuery }),
    ]);
    return {
      sampleSize,
      overall: Array.isArray(overallRows) ? overallRows[0] || null : null,
      byBadge: Array.isArray(byBadgeRows) ? byBadgeRows : [],
    };
  }

  if (pathname.startsWith("/match/")) {
    const matchId = pathname.split("/").pop();
    return fetchMatchMetadataWithFallback(matchId);
  }

  throw new Error(`Endpoint ${pathname} non disponible.`);
}

export async function fetchMatchMetadata(matchId) {
  if (state.matchMetadataCache.has(matchId)) return state.matchMetadataCache.get(matchId);
  try {
    const data = await deadlockGet(`/v1/matches/${matchId}/metadata`, {
      include_player_info: true,
      include_player_items: true,
      include_player_stats: true,
    });
    const info = data?.match_info ?? data;
    if (!Array.isArray(info?.players) || !info.players.length) {
      state.matchMetadataCache.set(matchId, null);
      return null;
    }
    state.matchMetadataCache.set(matchId, info);
    return info;
  } catch (_e) {
    state.matchMetadataCache.set(matchId, null);
    return null;
  }
}

export async function initHeroes() {
  try {
    const res = await fetch("https://assets.deadlock-api.com/v2/heroes");
    const data = await res.json();
    if (Array.isArray(data)) {
      data.forEach(h => { state.heroesMap[h.id] = h; });
    }
  } catch (e) {
    console.error("Failed to load heroes", e);
  }
}

export async function initItems() {
  try {
    const res = await fetch("https://assets.deadlock-api.com/v2/items");
    const data = await res.json();
    if (Array.isArray(data)) {
      state.itemsListCache = data;
      data.forEach(i => {
        if (i?.id != null) state.itemsMap[i.id] = i;
      });
    }
  } catch (e) {
    console.error("Failed to load items", e);
  }
}

export async function initRanks() {
  try {
    const res = await fetch("https://assets.deadlock-api.com/v2/ranks");
    const data = await res.json();
    if (Array.isArray(data)) {
      state.ranksMap = Object.fromEntries(data.map((rank) => [rank.tier, rank]));
    }
  } catch (e) {
    console.error("Failed to load ranks", e);
  }
}
