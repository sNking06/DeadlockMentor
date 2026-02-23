/* â”€â”€ Tab Switching â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
document.querySelectorAll(".nav-item").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach((b) => b.classList.remove("is-active"));
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("is-active"));
    btn.classList.add("is-active");
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add("is-active");
  });
});

/* â”€â”€ DOM Refs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const healthGrid      = document.getElementById("health-grid");
const healthMeta      = document.getElementById("health-meta");
const leaderboardBody = document.getElementById("leaderboard-body");
const leaderboardHeroFilter = document.getElementById("leaderboard-hero-filter");
const historyBody     = document.getElementById("history-body");
const coachStatsGrid  = document.getElementById("coach-stats-grid");
const coachFindings   = document.getElementById("coach-findings");
const apiStatus       = document.getElementById("api-status");
const playerInfoDisplay = document.getElementById("playerInfoDisplay");
const playerInfoName = document.getElementById("playerInfoName");
const playerInfoId = document.getElementById("playerInfoId");
const coachPlayerInfoDisplay = document.getElementById("coachPlayerInfoDisplay");
const coachPlayerInfoName = document.getElementById("coachPlayerInfoName");
const coachPlayerInfoId = document.getElementById("coachPlayerInfoId");
const homeSearchInput = document.getElementById("home-search-input");
const homeSearchBtn = document.getElementById("home-search-btn");
const homeSearchWrap = document.querySelector(".home-search-wrap");
const homeInsightsCard = document.getElementById("home-insights-card");
const homeInsightsTitle = document.getElementById("home-insights-title");
const homeInsightsMeta = document.getElementById("home-insights-meta");
const homeInsightsBody = document.getElementById("home-insights-body");
const historyPlayerTitle = document.getElementById("history-player-title");
const historyPlayerSub = document.getElementById("history-player-sub");
const historyWr = document.getElementById("history-wr");
const historyKda = document.getElementById("history-kda");
const historyCount = document.getElementById("history-count");
const historyRankName = document.getElementById("history-rank-name");
const historyRankSub = document.getElementById("history-rank-sub");
const historyRankIconWrap = document.getElementById("history-rank-icon-wrap");
const history30dWr = document.getElementById("history-30d-wr");
const history30dMeta = document.getElementById("history-30d-meta");
const history30dHeroes = document.getElementById("history-30d-heroes");
const history10000AvgDuration = document.getElementById("history-10000-avg-duration");
const history10000DurationRanks = document.getElementById("history-10000-duration-ranks");
const historyLoadMoreWrap = document.getElementById("history-load-more-wrap");
const historyLoadMoreBtn = document.getElementById("history-load-more");
const historyHeroFilter = document.getElementById("history-hero-filter");
const historyAvatarImg = document.getElementById("history-avatar-img");
const historyAvatarFallback = document.getElementById("history-avatar-fallback");
const guideTimerFilterInput = document.getElementById("guide-timer-filter");
const guideTimersTable = document.getElementById("guide-timers-table");
const buildsSheetUrlInput = document.getElementById("builds-sheet-url");
const buildsCodeInput = document.getElementById("builds-code-input");
const buildsStatus = document.getElementById("builds-status");
const buildsGrid = document.getElementById("builds-grid");
const buildsHeroFilter = document.getElementById("builds-hero-filter");
const buildsLoadSheetBtn = document.getElementById("btn-builds-sheet");
const buildsLoadCodesBtn = document.getElementById("btn-builds-codes");
const buildsNavBtn = document.querySelector('.nav-item[data-tab="builds"]');
const tierListNavBtn = document.querySelector('.nav-item[data-tab="tierlist"]');
const tierListGrid = document.getElementById("tierlist-grid");
const tierListMinMatchesInput = document.getElementById("tierlist-min-matches");
const tierListModeSelect = document.getElementById("tierlist-mode");
const tierListRankBracketSelect = document.getElementById("tierlist-rank-bracket");
const tierListRefreshBtn = document.getElementById("btn-tierlist-refresh");

/* â”€â”€ Event Listeners â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
document.getElementById("btn-health").addEventListener("click", loadHealth);
document.getElementById("btn-leaderboard").addEventListener("click", loadLeaderboard);
document.getElementById("btn-history").addEventListener("click", loadHistory);
if (leaderboardHeroFilter) leaderboardHeroFilter.addEventListener("change", applyLeaderboardHeroFilter);
if (historyLoadMoreBtn) historyLoadMoreBtn.addEventListener("click", loadMoreHistoryMatches);
if (historyHeroFilter) historyHeroFilter.addEventListener("change", applyHistoryHeroFilter);
if (buildsHeroFilter) buildsHeroFilter.addEventListener("change", applyBuildsHeroFilter);
if (buildsNavBtn) buildsNavBtn.addEventListener("click", ensureBuildsCatalogLoaded);
if (tierListNavBtn) tierListNavBtn.addEventListener("click", ensureTierListLoaded);
if (tierListRefreshBtn) tierListRefreshBtn.addEventListener("click", loadTierList);
const coachBtn = document.getElementById("btn-coach");
if (coachBtn) coachBtn.addEventListener("click", loadCoachReport);
if (homeSearchBtn) homeSearchBtn.addEventListener("click", searchFromHome);
if (homeSearchInput) {
  homeSearchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") searchFromHome();
  });
  homeSearchInput.addEventListener("input", onHomeSearchInputChange);
}
if (homeSearchWrap) {
  homeSearchWrap.addEventListener("click", onHomeSearchSuggestionClick);
}
document.addEventListener("click", (event) => {
  if (!homeSearchWrap || homeSearchWrap.contains(event.target)) return;
  hideHomeSearchResults();
});
if (guideTimerFilterInput && guideTimersTable) {
  guideTimerFilterInput.addEventListener("input", applyGuideTimerFilter);
}
leaderboardBody.addEventListener("click", (event) => {
  const target = event.target.closest(".player-link[data-profile-id]");
  if (!target || !leaderboardBody.contains(target)) return;
  const profileId = Number(target.dataset.profileId);
  if (profileId) switchToPlayerProfile(profileId);
});
historyBody.addEventListener("click", (event) => {
  const card = event.target.closest(".history-match-card.clickable");
  if (!card || !historyBody.contains(card)) return;
  openMatchModal(card.dataset.matchId, card.dataset.accountId);
});

/* â”€â”€ Utilities â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
let heroesMap = {};
let itemsMap  = {};
let ranksMap  = {};
const deadlockApiBase = "https://api.deadlock-api.com";
const matchMetadataCache = new Map();
const playerNameCache = new Map();
const playerMmrCache = new Map();
let itemsListCache = [];
const HISTORY_PAGE_SIZE = 10;
const HISTORY_AVG_DURATION_SAMPLE = 10000;
let historyAllMatchesCache = [];
let historyMatchesCache = [];
let historyRenderedCount = 0;
let historyRenderContext = { accountId: null, playerName: "Joueur", playerProfileUrl: "" };
let leaderboardEntriesCache = [];
let buildsEntriesCache = [];
const defaultBuildsSheetCsvUrl = "https://docs.google.com/spreadsheets/d/1YscI9Yg6SmTfFgX1R51tZaRr2WSgeIIH8P6ZIX6pu-Y/export?format=csv&gid=0";
let buildsCatalogLoaded = false;
let buildsCatalogPromise = null;
let tierListLoaded = false;
let tierListPromise = null;
let homeSearchResultsEl = null;
let homeSearchDebounceTimer = null;
let homeSearchRequestSeq = 0;
let homeSearchSuggestions = [];

function buildQuery(params = {}) {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      usp.set(key, String(value));
    }
  });
  const query = usp.toString();
  return query ? `?${query}` : "";
}

async function fetchJsonOrThrow(url, fetchOptions = {}) {
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

async function deadlockGet(pathname, query = {}, fetchOptions = {}) {
  const url = `${deadlockApiBase}${pathname}${buildQuery(query)}`;
  return fetchJsonOrThrow(url, fetchOptions);
}

function isMissingMatchSaltsError(error) {
  const message = String(error?.message || "").toLowerCase();
  return message.includes("match salts") || message.includes("failed to fetch match salts");
}

async function fetchMatchMetadataWithFallback(matchId) {
  const fullQuery = {
    include_player_info: true,
    include_player_items: true,
    include_player_stats: true,
  };

  try {
    return await deadlockGet(`/v1/matches/${matchId}/metadata`, fullQuery);
  } catch (error) {
    // Some matches do not expose salts/replay data; retry with minimal metadata query.
    if (!isMissingMatchSaltsError(error)) throw error;
  }

  try {
    return await deadlockGet(`/v1/matches/${matchId}/metadata`);
  } catch (error) {
    if (!isMissingMatchSaltsError(error)) throw error;
  }

  throw new Error(`Les details du match #${matchId} ne sont pas disponibles (salts/replay manquants).`);
}

async function apiGet(pathname, query = {}) {
  // Mode GitHub Pages pur: toujours utiliser l'API Deadlock directement
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
    const sampleSize = Math.max(100, Math.min(Number(query.sampleSize || 10000), 50000));
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

  // Pour les autres endpoints non supportes
  throw new Error(`Endpoint ${pathname} non disponible.`);
}

async function initHeroes() {
  try {
    const res = await fetch("https://assets.deadlock-api.com/v2/heroes");
    const data = await res.json();
    if (Array.isArray(data)) {
      data.forEach(h => { heroesMap[h.id] = h; });
    }
  } catch (e) {
    console.error("Failed to load heroes", e);
  }
}

async function initItems() {
  try {
    const res = await fetch("https://assets.deadlock-api.com/v2/items");
    const data = await res.json();
    if (Array.isArray(data)) {
      itemsListCache = data;
      data.forEach(i => {
        if (i?.id != null) itemsMap[i.id] = i;
      });
    }
  } catch (e) {
    console.error("Failed to load items", e);
  }
}

function dateFromUnix(unixTs) {
  if (!unixTs) return "-";
  return new Date(unixTs * 1000).toLocaleString("fr-FR");
}

function spinnerRow(cols) {
  return `<tr><td colspan="${cols}" class="loading-row"><span class="spinner"></span> Chargement...</td></tr>`;
}

function historyLoadingBlock(text = "Chargement...") {
  return `<div class="loading-row"><span class="spinner"></span> ${escapeHtml(text)}</div>`;
}

function parseAccountId(rawValue) {
  const accountId = Number(rawValue);
  if (!Number.isInteger(accountId) || accountId <= 0) return null;
  return accountId;
}

function normalizeSteamSearchResults(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.value)) return payload.value;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

function getLeaderboardCandidateAccountIds(entry) {
  const direct = [
    entry?.account_id,
    entry?.player_account_id,
    entry?.steam_account_id,
    entry?.accountId,
  ]
    .map(parseAccountId)
    .filter(Boolean);
  if (direct.length) return [...new Set(direct)];

  const possible = Array.isArray(entry?.possible_account_ids) ? entry.possible_account_ids : [];
  return [...new Set(possible.map(parseAccountId).filter(Boolean))];
}

function getLeaderboardProfileId(entry) {
  const candidates = getLeaderboardCandidateAccountIds(entry);
  if (candidates.length === 1) return candidates[0];
  const resolved = parseAccountId(entry?._resolved_profile_id);
  if (resolved) return resolved;
  return null;
}

function pickPlayerPseudo(...values) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (!text) continue;
    if (/^#?\d+$/.test(text)) continue;
    return text;
  }
  return null;
}

function resolvePlayerPseudo(player) {
  const accountId = Number(player?.account_id);
  const fromPlayer = pickPlayerPseudo(
    player?.account_name,
    player?.persona_name,
    player?.player_name,
    player?.name,
    player?.profile_name,
    player?.steam_name,
    player?.player_info?.account_name,
    player?.player_info?.persona_name,
  );
  if (fromPlayer) {
    if (Number.isInteger(accountId) && accountId > 0) playerNameCache.set(accountId, fromPlayer);
    return fromPlayer;
  }
  if (Number.isInteger(accountId) && accountId > 0 && playerNameCache.has(accountId)) {
    return playerNameCache.get(accountId);
  }
  return "Joueur inconnu";
}

async function hydratePlayerNames(players = []) {
  const missingIds = Array.from(
    new Set(
      players
        .map((p) => Number(p?.account_id))
        .filter((id) => Number.isInteger(id) && id > 0)
        .filter((id) => !playerNameCache.has(id))
        .filter((id) => {
          const player = players.find((p) => Number(p?.account_id) === id);
          return !pickPlayerPseudo(
            player?.account_name,
            player?.persona_name,
            player?.player_name,
            player?.name,
            player?.profile_name,
            player?.steam_name,
            player?.player_info?.account_name,
            player?.player_info?.persona_name,
          );
        })
    )
  );

  if (!missingIds.length) return;

  try {
    const profiles = await deadlockGet("/v1/players/steam", {
      account_ids: missingIds,
    });
    if (!Array.isArray(profiles)) return;
    profiles.forEach((profile) => {
      const accountId = Number(profile?.account_id);
      const pseudo = pickPlayerPseudo(profile?.personaname, profile?.realname);
      if (Number.isInteger(accountId) && accountId > 0 && pseudo) {
        playerNameCache.set(accountId, pseudo);
      }
    });
  } catch (_) {}
}

function showPlayerInfo(panel, nameEl, idEl, accountId, playerName) {
  if (!panel || !nameEl || !idEl) return;
  nameEl.textContent = (playerName || "Joueur inconnu").toString();
  idEl.textContent = `(#${accountId})`;
  panel.style.display = "block";
}

function hidePlayerInfo(panel) {
  if (!panel) return;
  panel.style.display = "none";
}

function setHistoryAvatar(avatarUrl = "", playerName = "") {
  if (!historyAvatarImg || !historyAvatarFallback) return;
  const src = String(avatarUrl || "").trim();
  if (src) {
    historyAvatarImg.src = src;
    historyAvatarImg.hidden = false;
    historyAvatarFallback.hidden = true;
    return;
  }
  const letter = String(playerName || "").trim().charAt(0).toUpperCase() || "S";
  historyAvatarFallback.textContent = letter;
  historyAvatarFallback.hidden = false;
  historyAvatarImg.hidden = true;
  historyAvatarImg.removeAttribute("src");
}

function pickBestSearchMatch(results, rawQuery) {
  if (!Array.isArray(results) || !results.length) return null;
  const query = String(rawQuery || "").trim().toLowerCase();
  if (!query) return results[0];

  const exact = results.find((r) => String(r?.personaname || "").trim().toLowerCase() === query);
  if (exact) return exact;

  const startsWith = results.find((r) => String(r?.personaname || "").trim().toLowerCase().startsWith(query));
  if (startsWith) return startsWith;

  return results[0];
}

function normalizeNameForMatch(value) {
  return String(value || "").trim().toLowerCase();
}

function scoreLeaderboardCandidate(entry, candidateId) {
  let score = 0;
  const candidateMmr = playerMmrCache.get(candidateId);
  const targetDivision = Number(entry?.ranked_rank || 0);
  const targetSubrank = Number(entry?.ranked_subrank || 0);
  const targetName = normalizeNameForMatch(entry?.account_name);
  const candidateName = normalizeNameForMatch(playerNameCache.get(candidateId));

  if (targetName && candidateName) {
    if (targetName === candidateName) score += 30;
    else if (candidateName.startsWith(targetName) || targetName.startsWith(candidateName)) score += 10;
  }

  if (candidateMmr) {
    if (targetDivision > 0 && Number(candidateMmr.division) === targetDivision) score += 50;
    if (targetSubrank > 0 && Number(candidateMmr.divisionTier) === targetSubrank) score += 30;
    if (targetDivision > 0 && targetSubrank > 0 &&
        Number(candidateMmr.division) === targetDivision &&
        Number(candidateMmr.divisionTier) === targetSubrank) {
      score += 40;
    }
  }

  return score;
}

async function resolveLeaderboardProfileIds(entries = []) {
  if (!Array.isArray(entries) || !entries.length) return;

  const unresolved = entries.filter((entry) => getLeaderboardCandidateAccountIds(entry).length > 1);
  if (!unresolved.length) return;

  const allCandidateIds = Array.from(
    new Set(unresolved.flatMap((entry) => getLeaderboardCandidateAccountIds(entry)))
  );
  if (!allCandidateIds.length) return;

  await Promise.all([
    hydratePlayerMmr(allCandidateIds),
    hydratePlayerNames(allCandidateIds.map((id) => ({ account_id: id }))),
  ]);

  unresolved.forEach((entry) => {
    const candidates = getLeaderboardCandidateAccountIds(entry);
    if (!candidates.length) return;

    const scored = candidates
      .map((id) => ({ id, score: scoreLeaderboardCandidate(entry, id) }))
      .sort((a, b) => b.score - a.score);

    if (!scored.length) return;
    if (scored.length === 1) {
      entry._resolved_profile_id = scored[0].id;
      return;
    }

    const best = scored[0];
    const second = scored[1];
    if (best.score <= 0) return;
    if (second && best.score === second.score) return;
    entry._resolved_profile_id = best.id;
  });
}

async function searchFromHome() {
  const raw = (homeSearchInput?.value || "").trim().replace(/^#/, "");
  if (!raw) return;
  hideHomeSearchResults();

  const accountId = parseAccountId(raw);
  if (accountId) {
    await loadHomeInsights(accountId);
    return;
  }

  try {
    const results = await apiGet("/player-search", { searchQuery: raw });
    const normalizedResults = Array.isArray(results)
      ? results.filter((entry) => parseAccountId(entry?.account_id))
      : [];
    if (!normalizedResults.length) {
      throw new Error(`Aucun joueur trouve pour "${raw}".`);
    }
    if (normalizedResults.length === 1) {
      await loadHomeInsights(Number(normalizedResults[0].account_id));
      return;
    }
    homeSearchSuggestions = normalizedResults.slice(0, 20);
    renderHomeSearchResults(homeSearchSuggestions, raw);
  } catch (error) {
    const message = error?.message || "Recherche joueur impossible.";
    if (homeInsightsCard && homeInsightsBody && homeInsightsMeta) {
      homeInsightsCard.hidden = false;
      homeInsightsMeta.textContent = "Erreur de chargement";
      homeInsightsBody.innerHTML = `<div class="empty-row">Erreur : ${escapeHtml(message)}</div>`;
    }
  }
}

function ensureHomeSearchResultsEl() {
  if (!homeSearchWrap) return null;
  if (homeSearchResultsEl && homeSearchWrap.contains(homeSearchResultsEl)) return homeSearchResultsEl;
  homeSearchResultsEl = document.createElement("div");
  homeSearchResultsEl.className = "search-results";
  homeSearchResultsEl.hidden = true;
  homeSearchResultsEl.id = "home-search-results";
  homeSearchWrap.appendChild(homeSearchResultsEl);
  return homeSearchResultsEl;
}

function hideHomeSearchResults() {
  if (!homeSearchResultsEl) return;
  homeSearchResultsEl.hidden = true;
  homeSearchResultsEl.innerHTML = "";
}

function renderHomeSearchResults(results = [], rawQuery = "") {
  const container = ensureHomeSearchResultsEl();
  if (!container) return;

  const list = Array.isArray(results) ? results : [];
  if (!list.length) {
    container.innerHTML = `<div class="search-result-empty">Aucun joueur pour "${escapeHtml(rawQuery)}".</div>`;
    container.hidden = false;
    return;
  }

  container.innerHTML = list
    .slice(0, 20)
    .map((entry) => {
      const accountId = parseAccountId(entry?.account_id);
      const name = String(entry?.personaname || "Joueur inconnu").trim() || "Joueur inconnu";
      const avatar = String(entry?.avatarmedium || entry?.avatar || "").trim();
      const avatarHtml = avatar
        ? `<img class="search-result-avatar" src="${escapeHtml(avatar)}" alt="${escapeHtml(name)}" />`
        : `<span class="search-result-avatar-fallback"></span>`;
      return `
        <button type="button" class="search-result-item" data-account-id="${accountId}">
          ${avatarHtml}
          <span class="search-result-name">${escapeHtml(name)}</span>
          <span class="search-result-id">#${accountId}</span>
        </button>
      `;
    })
    .join("");
  container.hidden = false;
}

function onHomeSearchSuggestionClick(event) {
  const item = event.target.closest(".search-result-item[data-account-id]");
  if (!item || !homeSearchWrap?.contains(item)) return;
  const accountId = parseAccountId(item.dataset.accountId);
  if (!accountId) return;
  if (homeSearchInput) homeSearchInput.value = String(accountId);
  hideHomeSearchResults();
  loadHomeInsights(accountId);
}

function onHomeSearchInputChange() {
  const raw = String(homeSearchInput?.value || "").trim().replace(/^#/, "");
  if (!raw) {
    hideHomeSearchResults();
    return;
  }

  if (parseAccountId(raw)) {
    hideHomeSearchResults();
    return;
  }

  if (raw.length < 2) {
    hideHomeSearchResults();
    return;
  }

  clearTimeout(homeSearchDebounceTimer);
  homeSearchDebounceTimer = setTimeout(async () => {
    const reqId = ++homeSearchRequestSeq;
    try {
      const results = await apiGet("/player-search", { searchQuery: raw });
      if (reqId !== homeSearchRequestSeq) return;
      const normalizedResults = Array.isArray(results)
        ? results.filter((entry) => parseAccountId(entry?.account_id))
        : [];
      homeSearchSuggestions = normalizedResults.slice(0, 20);
      renderHomeSearchResults(homeSearchSuggestions, raw);
    } catch (_) {
      if (reqId !== homeSearchRequestSeq) return;
      hideHomeSearchResults();
    }
  }, 220);
}

function didPlayerWinMatch(match) {
  const explicit = match?.player_won ?? match?.is_win ?? null;
  if (explicit === true || explicit === 1) return true;
  if (explicit === false || explicit === 0) return false;

  const team = Number(match?.player_team ?? match?.team ?? match?.team_number);
  const result = Number(match?.match_result ?? match?.winning_team);

  if (Number.isInteger(team) && Number.isInteger(result) && team >= 0 && result >= 0) {
    return team === result;
  }
  return false;
}

function formatRelativeTime(unixTs) {
  if (!unixTs) return "-";
  const diffMs = Date.now() - unixTs * 1000;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return "a l'instant";
  if (diffHours < 24) return `il y a ${diffHours}h`;
  const days = Math.floor(diffHours / 24);
  return `il y a ${days}j`;
}

function normalizeMmrResults(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.value)) return payload.value;
  return [];
}

function calculateAverageDurationInfo(history = [], sampleSize = HISTORY_AVG_DURATION_SAMPLE) {
  const latestMatches = Array.isArray(history) ? history.slice(0, sampleSize) : [];
  const durations = latestMatches
    .map((m) => Number(m?.match_duration_s || 0))
    .filter((seconds) => Number.isFinite(seconds) && seconds > 0);
  if (!durations.length) return { averageSeconds: 0, count: 0 };
  const totalDuration = durations.reduce((sum, seconds) => sum + seconds, 0);
  return { averageSeconds: totalDuration / durations.length, count: durations.length };
}

function calculateAverageDurationByRank(history = [], mmrHistory = [], sampleSize = HISTORY_AVG_DURATION_SAMPLE) {
  const latestMatches = Array.isArray(history) ? history.slice(0, sampleSize) : [];
  const mmrRows = Array.isArray(mmrHistory) ? mmrHistory : [];
  if (!latestMatches.length || !mmrRows.length) return [];

  const mmrByMatchId = new Map();
  mmrRows.forEach((row) => {
    const matchId = Number(row?.match_id);
    if (!Number.isFinite(matchId) || matchId <= 0) return;
    if (!mmrByMatchId.has(matchId)) mmrByMatchId.set(matchId, row);
  });

  const groups = new Map();
  latestMatches.forEach((match) => {
    const matchId = Number(match?.match_id);
    const duration = Number(match?.match_duration_s || 0);
    if (!Number.isFinite(matchId) || matchId <= 0 || !Number.isFinite(duration) || duration <= 0) return;
    const mmr = mmrByMatchId.get(matchId);
    if (!mmr) return;
    const division = getRankDivisionFromMmrEntry(mmr);
    if (!Number.isInteger(division) || division <= 0) return;
    const bucket = groups.get(division) || { division, totalDuration: 0, count: 0 };
    bucket.totalDuration += duration;
    bucket.count += 1;
    groups.set(division, bucket);
  });

  return [...groups.values()]
    .map((entry) => ({
      division: entry.division,
      label: getRankDivisionLabel(entry.division),
      averageSeconds: entry.totalDuration / Math.max(1, entry.count),
      count: entry.count,
    }))
    .sort((a, b) => b.count - a.count);
}

function formatBadgeLabel(badgeValue) {
  const badge = Number(badgeValue);
  if (!Number.isInteger(badge) || badge <= 0) return "Rang inconnu";
  const division = Math.floor(badge / 10);
  const subrank = badge % 10;
  const rankName = getRankDivisionLabel(division);
  if (subrank >= 1 && subrank <= 6) return `${rankName} ${subrank}`;
  return `${rankName} (${badge})`;
}

async function loadHomeInsights(_accountId = null) {
  if (!homeInsightsCard || !homeInsightsMeta || !homeInsightsBody) return;
  homeInsightsCard.hidden = false;
  homeInsightsMeta.textContent = "Chargement des donnees...";
  homeInsightsBody.innerHTML = `<div class="loading-row"><span class="spinner"></span> Chargement...</div>`;

  try {
    const data = await apiGet("/global-duration-insights", { sampleSize: HISTORY_AVG_DURATION_SAMPLE });
    const overallMatches = Number(data?.overall?.matches || 0);
    const overallAvgDuration = Number(data?.overall?.avg_duration_s || 0);
    const rankDurations = Array.isArray(data?.byBadge)
      ? data.byBadge
        .map((entry) => ({
          badge: Number(entry?.average_badge || 0),
          averageSeconds: Number(entry?.avg_duration_s || 0),
          count: Number(entry?.matches || 0),
        }))
        .filter((entry) => entry.badge > 0 && entry.averageSeconds > 0 && entry.count > 0)
      : [];

    homeInsightsTitle.textContent = `Analyse Accueil - Global`;
    homeInsightsMeta.textContent = `${overallMatches.toLocaleString("fr-FR")} matchs globaux (base 10k)`;

    if (!overallMatches || !overallAvgDuration) {
      homeInsightsBody.innerHTML = `<div class="empty-row">Aucune donnee globale disponible.</div>`;
      return;
    }

    const rankRowsHtml = rankDurations.length
      ? rankDurations.map((entry) => `
          <div class="home-rank-duration-row">
            <span>${escapeHtml(formatBadgeLabel(entry.badge))}</span>
            <strong>${formatDurationLabel(entry.averageSeconds)} (${entry.count.toLocaleString("fr-FR")})</strong>
          </div>
        `).join("")
      : `<div class="empty-row">Aucune donnee de rang exploitable.</div>`;

    homeInsightsBody.innerHTML = `
      <div class="home-insights-grid">
        <div class="home-insight-tile">
          <span>Type de stats</span>
          <strong>Global</strong>
        </div>
        <div class="home-insight-tile">
          <span>Duree moyenne (10 000 derniers matchs)</span>
          <strong>${formatDurationLabel(overallAvgDuration)}</strong>
        </div>
        <div class="home-insight-tile">
          <span>Matchs utilises</span>
          <strong>${overallMatches.toLocaleString("fr-FR")}</strong>
        </div>
      </div>
      <div class="home-rank-duration-list">
        ${rankRowsHtml}
      </div>
    `;
  } catch (error) {
    homeInsightsMeta.textContent = "Erreur de chargement";
    homeInsightsBody.innerHTML = `<div class="empty-row">Erreur : ${escapeHtml(error?.message || "inconnue")}</div>`;
  }
}

async function hydratePlayerMmr(accountIds = []) {
  const missing = Array.from(
    new Set(
      accountIds
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id) && id > 0 && !playerMmrCache.has(id))
    )
  );

  if (!missing.length) return;

  const chunkSize = 200;
  for (let i = 0; i < missing.length; i += chunkSize) {
    const chunk = missing.slice(i, i + chunkSize);
    try {
      const data = await deadlockGet("/v1/players/mmr", { account_ids: chunk });
      const entries = normalizeMmrResults(data);
      entries.forEach((entry) => {
        const id = Number(entry?.account_id);
        if (!Number.isInteger(id) || id <= 0) return;
        playerMmrCache.set(id, {
          accountId: id,
          rank: Number(entry?.rank ?? 0) || 0,
          division: Number(entry?.division ?? 0) || 0,
          divisionTier: Number(entry?.division_tier ?? 0) || 0,
        });
      });
    } catch (_) {
      // Ignore per-batch errors and keep partial ranking data.
    }
  }
}

function getPlayerRankInfo(accountId) {
  const id = Number(accountId);
  if (!Number.isInteger(id) || id <= 0) return null;
  const mmr = playerMmrCache.get(id);
  if (!mmr || mmr.division <= 0) return null;

  const division = mmr.division;
  const subrank = mmr.divisionTier >= 1 ? mmr.divisionTier : null;
  const rankData = ranksMap[division] || null;
  const rankName = rankData?.name || `Rank ${division}`;
  const rankImg = getRankImage(division, subrank, "small");
  return { division, subrank, rankName, rankImg, rank: mmr.rank };
}

function renderRankChip(accountId, withLabel = false, compact = false) {
  const info = getPlayerRankInfo(accountId);
  if (!info) return `<span class="history-rank-chip is-missing">Rang ?</span>`;

  const sub = info.subrank ? `.${info.subrank}` : "";
  const label = compact ? `R${info.division}${sub}` : `${info.rankName}${sub}`;
  const title = `${info.rankName}${sub}`;
  return `
    <span class="history-rank-chip${compact ? " is-compact" : ""}" title="${escapeHtml(title)}">
      ${info.rankImg ? `<img src="${info.rankImg}" alt="${escapeHtml(title)}" title="${escapeHtml(title)}" />` : ""}
      <span>${escapeHtml(label)}</span>
    </span>
  `;
}

function computeAverageMatchRank(players = []) {
  const ranks = players
    .map((p) => getPlayerRankInfo(p?.account_id)?.rank)
    .filter((v) => Number.isFinite(v) && v > 0);

  if (!ranks.length) return null;
  const avgRank = ranks.reduce((sum, v) => sum + v, 0) / ranks.length;
  const division = Math.max(0, Math.floor(avgRank / 10));
  const subrank = Math.max(1, Math.min(6, Math.round(avgRank - division * 10)));
  const rankData = ranksMap[division] || null;
  const rankName = rankData?.name || `Rank ${division}`;
  const rankImg = getRankImage(division, subrank, "small");
  return { avgRank, division, subrank, rankName, rankImg };
}

function extractFinalItemIds(player = null, maxItems = 16) {
  const rawItems = Array.isArray(player?.items) ? player.items : [];
  if (!rawItems.length) return [];

  const finalItems = rawItems
    .filter((entry) => Number(entry?.sold_time_s ?? 0) === 0)
    .map((entry) => ({
      id: Number(entry?.item_id),
      t: Number(entry?.game_time_s ?? 0),
    }))
    .filter((entry) => Number.isFinite(entry.id) && entry.id > 0);

  if (!finalItems.length) return [];

  finalItems.sort((a, b) => a.t - b.t);

  const seen = new Set();
  const unique = [];
  for (let i = finalItems.length - 1; i >= 0; i -= 1) {
    const id = finalItems[i].id;
    if (seen.has(id)) continue;
    seen.add(id);
    unique.push(id);
    if (unique.length >= maxItems) break;
  }

  return unique.reverse();
}

function setHistorySummary(history = [], playerName = null) {
  if (historyPlayerTitle) historyPlayerTitle.textContent = playerName || "Player";
  if (historyPlayerSub) historyPlayerSub.textContent = "Match overview";
  if (!Array.isArray(history) || !history.length) {
    if (historyWr) historyWr.textContent = "-";
    if (historyKda) historyKda.textContent = "-";
    if (historyCount) historyCount.textContent = "0";
    return;
  }
  const wins = history.filter(didPlayerWinMatch).length;
  const kills = history.reduce((s, m) => s + Number(m.player_kills || 0), 0);
  const deaths = history.reduce((s, m) => s + Number(m.player_deaths || 0), 0);
  const assists = history.reduce((s, m) => s + Number(m.player_assists || 0), 0);
  const wr = history.length ? Math.round((wins / history.length) * 100) : 0;
  const kda = deaths > 0 ? ((kills + assists) / deaths).toFixed(2) : "∞";
  if (historyWr) historyWr.textContent = `${wr}%`;
  if (historyKda) historyKda.textContent = `${kda}`;
  if (historyCount) historyCount.textContent = `${history.length}`;
}

async function initRanks() {
  try {
    const res = await fetch("https://assets.deadlock-api.com/v2/ranks");
    const data = await res.json();
    if (Array.isArray(data)) {
      ranksMap = Object.fromEntries(data.map((rank) => [rank.tier, rank]));
    }
  } catch (e) {
    console.error("Failed to load ranks", e);
  }
}

function getRankImage(rankTier, subrank = null, size = "small") {
  const rank = ranksMap[rankTier];
  if (!rank?.images) return null;
  const key = Number.isInteger(subrank) && subrank >= 1
    ? `${size}_subrank${subrank}`
    : size;
  return rank.images[key] || rank.images[size] || null;
}

function renderRankCell(entry) {
  const tier = Number(entry?.ranked_rank);
  const sub = Number(entry?.ranked_subrank);
  const rankData = ranksMap[tier];
  const rankName = rankData?.name || "Rang inconnu";
  const rankImg = getRankImage(tier, sub, "small");
  const subText = Number.isInteger(sub) && sub > 0 ? ` ${sub}` : "";
  const fallbackValue = entry?.badge_level ?? "-";

  if (!rankImg) {
    return `<span class="rank-value-only">${fallbackValue}</span>`;
  }

  return `
    <div class="rank-cell">
      <img class="rank-icon" src="${rankImg}" alt="${rankName}${subText}" title="${rankName}${subText}" />
      <span class="rank-label">${rankName}${subText}</span>
    </div>
  `;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function stripHtml(value) {
  return String(value ?? "").replace(/<[^>]*>/g, "").trim();
}

function formatNumericValue(raw) {
  if (raw == null || raw === "") return null;
  const num = Number(raw);
  if (!Number.isFinite(num)) return String(raw);
  if (Math.abs(num) >= 1000) return `${num > 0 ? "+" : ""}${Math.round(num)}`;
  if (Math.abs(num % 1) > 0.001) return `${num > 0 ? "+" : ""}${num.toFixed(2)}`;
  return `${num > 0 ? "+" : ""}${num}`;
}

function formatItemProperty(item, propertyId) {
  const prop = item?.properties?.[propertyId];
  if (!prop) return null;
  const value = prop.value;
  if (value == null || value === "") return null;
  if (prop.disable_value != null && String(value) === String(prop.disable_value)) return null;

  const label = prop.label || propertyId;
  const formattedValue = formatNumericValue(value);
  if (!formattedValue) return null;
  const postfix = prop.postfix || "";
  return `${formattedValue}${postfix ? postfix : ""} ${label}`;
}

function getItemTooltipSections(item) {
  const sections = [];
  const sectionNames = {
    innate: "Bonus",
    passive: "Passif",
    active: "Actif",
    conditional: "Conditionnel",
    upgrade: "Upgrade",
  };

  const rawSections = Array.isArray(item?.tooltip_sections) ? item.tooltip_sections : [];
  for (const section of rawSections) {
    const title = sectionNames[section.section_type] || "Effets";
    const lines = [];
    const attrs = Array.isArray(section.section_attributes) ? section.section_attributes : [];
    for (const attr of attrs) {
      const propIds = [
        ...(Array.isArray(attr?.properties) ? attr.properties : []),
        ...(Array.isArray(attr?.important_properties) ? attr.important_properties : []),
      ];
      for (const propId of propIds) {
        const line = formatItemProperty(item, propId);
        if (line && !lines.includes(line)) lines.push(line);
      }

      if (attr?.loc_string) {
        const text = stripHtml(attr.loc_string);
        if (text && !lines.includes(text)) lines.push(text);
      }
    }

    if (lines.length) sections.push({ title, lines });
  }

  if (!sections.length && item?.description?.desc) {
    sections.push({ title: "Description", lines: [stripHtml(item.description.desc)] });
  }
  return sections;
}

function renderItemTooltip(item, small = false) {
  if (!item) return "";

  const title = escapeHtml(item.name || "Item");
  const cost = Number(item.cost);
  const costText = Number.isFinite(cost) ? cost.toLocaleString("fr-FR") : "-";
  const tier = Number(item.item_tier ?? item.tier ?? 0);
  const sectionHtml = getItemTooltipSections(item)
    .map(
      (section) => `
      <div class="item-tip-section">
        <div class="item-tip-section-title">${escapeHtml(section.title)}</div>
        ${section.lines.map((line) => `<div class="item-tip-line">${escapeHtml(line)}</div>`).join("")}
      </div>`
    )
    .join("");

  return `
    <div class="item-tooltip item-tooltip-rich${small ? " is-small" : ""}">
      <div class="item-tip-head">
        <div class="item-tip-title">${title}</div>
        <div class="item-tip-cost">$ ${costText}</div>
      </div>
      ${tier > 0 ? `<div class="item-tip-tier">Tier ${tier}</div>` : ""}
      ${sectionHtml || `<div class="item-tip-line">Aucun detail disponible.</div>`}
    </div>
  `;
}

function positionTooltipWithinViewport(container) {
  const tooltip = container?.querySelector?.(".item-tooltip");
  if (!tooltip) return;

  tooltip.classList.remove("edge-left", "edge-right", "place-below");

  const margin = 8;
  const rect = tooltip.getBoundingClientRect();
  const modalPanel = container.closest?.(".modal-panel");

  const leftBoundary = modalPanel ? modalPanel.getBoundingClientRect().left + margin : margin;
  const rightBoundary = modalPanel
    ? modalPanel.getBoundingClientRect().right - margin
    : window.innerWidth - margin;

  if (rect.left < leftBoundary) tooltip.classList.add("edge-left");
  if (rect.right > rightBoundary) tooltip.classList.add("edge-right");
  if (rect.top < margin) tooltip.classList.add("place-below");
}

function bindTooltipAutoPositioning() {
  document.addEventListener(
    "pointerenter",
    (event) => {
      const container = event.target?.closest?.(".item-icon, .item-icon-sm, .itl-item");
      if (!container) return;
      requestAnimationFrame(() => positionTooltipWithinViewport(container));
    },
    true
  );
}

function kdaClass(k, d, a) {
  if (!d || d === 0) return "kda-good";
  const ratio = (k + a) / d;
  if (ratio >= 3)   return "kda-good";
  if (ratio < 1.5)  return "kda-bad";
  return "kda-mid";
}

/* â”€â”€ Coaching Analysis (DEPRECATED) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
// Toute la logique d'analyse est maintenant dans le backend.
// Le frontend se contente d'appeler /api/coach-report et d'afficher le resultat.
// Ce code est supprime pour eviter la duplication et simplifier la maintenance.

/* â”€â”€ Health â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function setHealthLight(key, ok) {
  if (!healthGrid) return;
  const tile = healthGrid.querySelector(`[data-health-key="${key}"]`);
  if (!tile) return;
  tile.classList.remove("ok", "err", "pending");
  tile.classList.add(ok ? "ok" : "err");
}

function setHealthPending() {
  if (!healthGrid) return;
  healthGrid.querySelectorAll(".health-tile").forEach((tile) => {
    tile.classList.remove("ok", "err", "pending");
    tile.classList.add("pending");
  });
}
async function loadHealth() {
  setHealthPending();
  if (healthMeta) healthMeta.textContent = "Verification en cours...";
  try {
    const data = await apiGet("/health");
    const services = data?.services || {};
    const clickhouseOk = Boolean(services.clickhouse);
    const postgresOk = Boolean(services.postgres);
    const redisOk = Boolean(services.redis);
    const ok = clickhouseOk && postgresOk && redisOk;

    setHealthLight("clickhouse", clickhouseOk);
    setHealthLight("postgres", postgresOk);
    setHealthLight("redis", redisOk);
    setHealthLight("global", ok);

    if (apiStatus) {
      apiStatus.className = `api-status ${ok ? "ok" : "err"}`;
      const label = apiStatus.querySelector(".api-label");
      if (label) label.textContent = ok ? "API en ligne" : "API degradee";
    }
    if (healthMeta) {
      healthMeta.textContent = `Derniere verification: ${new Date().toLocaleTimeString("fr-FR")}`;
    }
  } catch (e) {
    setHealthLight("clickhouse", false);
    setHealthLight("postgres", false);
    setHealthLight("redis", false);
    setHealthLight("global", false);

    if (apiStatus) {
      apiStatus.className = "api-status err";
      const label = apiStatus.querySelector(".api-label");
      if (label) label.textContent = "Injoignable";
    }
    if (healthMeta) healthMeta.textContent = "Derniere verification: echec";
  }
}

/* â”€â”€ Leaderboard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function loadLeaderboard() {
  leaderboardBody.innerHTML = spinnerRow(4);
  const region = document.getElementById("region").value;
  const limit  = document.getElementById("limit").value;
  try {
    const data = await apiGet("/leaderboard", { region, limit });
    const entries = Array.isArray(data.entries) ? data.entries : [];
    await resolveLeaderboardProfileIds(entries);
    leaderboardEntriesCache = entries;
    populateLeaderboardHeroFilter(entries);
    applyLeaderboardHeroFilter();
  } catch (e) {
    leaderboardBody.innerHTML = `<tr><td colspan="4" class="empty-row">Erreur : ${e.message}</td></tr>`;
    leaderboardEntriesCache = [];
    if (leaderboardHeroFilter) {
      leaderboardHeroFilter.innerHTML = `<option value="">Tous les heros</option>`;
      leaderboardHeroFilter.value = "";
      leaderboardHeroFilter.disabled = true;
    }
  }
}

function populateLeaderboardHeroFilter(entries = []) {
  if (!leaderboardHeroFilter) return;
  const previousValue = leaderboardHeroFilter.value;
  const heroIds = [...new Set(
    entries
      .flatMap((entry) => Array.isArray(entry?.top_hero_ids) ? entry.top_hero_ids : [])
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id) && id > 0)
  )];
  const options = heroIds
    .map((heroId) => ({
      heroId,
      label: heroesMap[heroId]?.name || `Hero #${heroId}`,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "fr", { sensitivity: "base" }));

  leaderboardHeroFilter.innerHTML = [
    `<option value="">Tous les heros</option>`,
    ...options.map((opt) => `<option value="${opt.heroId}">${escapeHtml(opt.label)}</option>`),
  ].join("");
  leaderboardHeroFilter.value = options.some((opt) => String(opt.heroId) === String(previousValue)) ? previousValue : "";
  leaderboardHeroFilter.disabled = options.length === 0;
}

function applyLeaderboardHeroFilter() {
  const selectedHeroId = Number(leaderboardHeroFilter?.value || 0);
  const filteredEntries = selectedHeroId
    ? leaderboardEntriesCache.filter((entry) => Array.isArray(entry?.top_hero_ids) && entry.top_hero_ids.some((id) => Number(id) === selectedHeroId))
    : leaderboardEntriesCache;
  renderLeaderboardRows(filteredEntries);
}

function renderLeaderboardRows(entries = []) {
  if (!entries.length) {
    const isFiltered = Boolean(Number(leaderboardHeroFilter?.value || 0));
    leaderboardBody.innerHTML = isFiltered
      ? `<tr><td colspan="4" class="empty-row">Aucun joueur ne correspond a ce hero.</td></tr>`
      : `<tr><td colspan="4" class="empty-row">Aucune donnee disponible.</td></tr>`;
    return;
  }

  leaderboardBody.innerHTML = entries
      .map((entry, i) => {
        const n      = i + 1;
        const cls    = n <= 3 ? `rank-chip rank-${n}` : "rank-chip";
        const heroes = Array.isArray(entry.top_hero_ids) 
          ? `<div class="hero-list">` + entry.top_hero_ids.map(id => {
              const hero = heroesMap[id];
              if (hero && hero.images && hero.images.icon_image_small) {
                return `<img src="${hero.images.icon_image_small}" alt="${hero.name}" title="${hero.name}" class="hero-icon-sm" />`;
              }
              return id;
            }).join("") + `</div>`
          : "-";
        const profileId = getLeaderboardProfileId(entry);
        const accountName = entry.account_name || "Joueur inconnu";
        const playerCell = profileId
          ? `<button class="player-link leaderboard-player-link" data-profile-id="${profileId}">${escapeHtml(accountName)}</button>`
          : escapeHtml(accountName);
        return `<tr>
          <td><span class="${cls}">${n}</span></td>
          <td>${playerCell}</td>
          <td>${renderRankCell(entry)}</td>
          <td>${heroes}</td>
        </tr>`;
      })
      .join("");
}

function applyGuideTimerFilter() {
  if (!guideTimerFilterInput || !guideTimersTable) return;
  const q = String(guideTimerFilterInput.value || "").trim().toLowerCase();
  const rows = guideTimersTable.querySelectorAll("tbody tr");
  rows.forEach((row) => {
    const text = String(row.textContent || "").toLowerCase();
    row.style.display = !q || text.includes(q) ? "" : "none";
  });
}

/* ── Builds ───────────────────────────────────────── */
function setBuildsStatus(text, isError = false) {
  if (!buildsStatus) return;
  buildsStatus.textContent = text;
  buildsStatus.classList.toggle("is-error", Boolean(isError));
}

function parseCsvRows(csvText) {
  const rows = [];
  let row = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i += 1) {
    const ch = csvText[i];
    const next = csvText[i + 1];

    if (ch === "\"") {
      if (inQuotes && next === "\"") {
        current += "\"";
        i += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }

    if (ch === "," && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }

    if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && next === "\n") i += 1;
      row.push(current);
      rows.push(row);
      row = [];
      current = "";
      continue;
    }

    current += ch;
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    rows.push(row);
  }
  return rows;
}

function parseBuildCodesInput(value) {
  return [...new Set(
    String(value || "")
      .split(/[\s,;|]+/)
      .map((token) => Number(token.trim()))
      .filter((id) => Number.isInteger(id) && id > 0)
  )];
}

function extractBuildCodesFromSheetCsv(csvText) {
  const rows = parseCsvRows(csvText);
  const refs = [];

  rows.forEach((cells, rowIndex) => {
    if (rowIndex === 0 || !cells?.length) return;
    const sheetHero = String(cells[0] || "").trim();
    if (!sheetHero) return;
    // Streams are maintained in spreadsheet columns D and E only.
    const rowTwitchLinks = [cells[3], cells[4]]
      .map((cell) => String(cell || "").trim())
      .filter((cell) => /^(https?:\/\/)?(www\.)?twitch\.tv\//i.test(cell));

    for (let c = 1; c < cells.length; c += 1) {
      const cell = String(cells[c] || "");
      const regex = /([^:,]+?)\s*:\s*(\d{4,})/g;
      let match = null;
      while ((match = regex.exec(cell)) != null) {
        const source = String(match[1] || "").trim();
        const buildId = Number(match[2]);
        if (!Number.isInteger(buildId) || buildId <= 0) continue;
        refs.push({
          buildId,
          sheetHero,
          sheetSource: source || null,
          twitchLinks: rowTwitchLinks,
        });
      }
    }
  });

  const byId = new Map();
  refs.forEach((ref) => {
    if (!byId.has(ref.buildId)) byId.set(ref.buildId, ref);
  });
  return [...byId.values()];
}

function normalizeForMatch(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function normalizeTwitchUrl(rawUrl) {
  const value = String(rawUrl || "").trim();
  if (!value) return null;
  if (/^https?:\/\/(www\.)?twitch\.tv\//i.test(value)) return value;
  if (/^(www\.)?twitch\.tv\//i.test(value)) return `https://${value.replace(/^www\./i, "www.")}`;
  return null;
}

function pickTwitchUrlForSource(source, twitchLinks = []) {
  if (!Array.isArray(twitchLinks) || !twitchLinks.length) return null;
  const normalizedLinks = twitchLinks
    .map(normalizeTwitchUrl)
    .filter(Boolean);
  if (!normalizedLinks.length) return null;
  const normalizedSource = normalizeForMatch(source);
  if (!normalizedSource) return normalizedLinks[0];

  const direct = normalizedLinks.find((url) => {
    const channel = String(url || "").split("/").pop() || "";
    return normalizeForMatch(channel).includes(normalizedSource) || normalizedSource.includes(normalizeForMatch(channel));
  });
  return direct || normalizedLinks[0];
}

function prettifyBuildCategoryName(rawName) {
  const value = String(rawName || "").trim();
  if (!value) return "Categorie";
  if (value.includes("EarlyGame")) return "Early Game";
  if (value.includes("MidGame")) return "Mid Game";
  if (value.includes("LateGame")) return "Late Game";
  if (value.startsWith("#Citadel_HeroBuilds_")) {
    return value.replace("#Citadel_HeroBuilds_", "").replace(/_/g, " ");
  }
  return value.replace(/^#/, "").replace(/_/g, " ");
}

function populateBuildsHeroFilter(entries = []) {
  if (!buildsHeroFilter) return;
  const previous = buildsHeroFilter.value;
  const options = [...new Set(entries.map((entry) => Number(entry.heroId)).filter((id) => Number.isFinite(id) && id > 0))]
    .map((heroId) => ({ heroId, label: heroesMap[heroId]?.name || `Hero #${heroId}` }))
    .sort((a, b) => a.label.localeCompare(b.label, "fr", { sensitivity: "base" }));

  buildsHeroFilter.innerHTML = [
    `<option value="">Choisir un hero</option>`,
    ...options.map((opt) => `<option value="${opt.heroId}">${escapeHtml(opt.label)}</option>`),
  ].join("");
  buildsHeroFilter.value = options.some((opt) => String(opt.heroId) === String(previous)) ? previous : "";
  buildsHeroFilter.disabled = options.length === 0;
}

function renderBuildsGrid(entries = []) {
  if (!buildsGrid) return;
  if (!entries.length) {
    buildsGrid.innerHTML = `<div class="empty-row">Aucun build ne correspond au filtre courant.</div>`;
    return;
  }

  buildsGrid.innerHTML = entries
    .map((entry) => {
      const hero = heroesMap[entry.heroId] || null;
      const heroName = hero?.name || `Hero #${entry.heroId}`;
      const heroIcon = hero?.images?.icon_image_small
        ? `<img class="hero-icon-sm" src="${hero.images.icon_image_small}" alt="${escapeHtml(heroName)}" />`
        : `<span class="history-hero-fallback">#${entry.heroId}</span>`;

      const categoriesHtml = entry.categories.length
        ? entry.categories.map((category) => `
          <section class="build-card-category">
            <h4>${escapeHtml(prettifyBuildCategoryName(category.name))}</h4>
            <div class="build-strip">
              ${category.mods.map((mod) => renderItemIcon(mod.ability_id, true)).join("")}
            </div>
          </section>
        `).join("")
        : `<div class="empty-row">Aucun item dans ce build.</div>`;

      const source = entry.sheetSource ? `${entry.sheetHero || "Sheet"} - ${entry.sheetSource}` : (entry.sheetHero || "Code manuel");
      const published = entry.publishTs ? dateFromUnix(entry.publishTs) : "-";
      const updated = entry.updatedTs ? dateFromUnix(entry.updatedTs) : "-";
      const twitchUrl = entry.twitchUrl || null;

      return `
        <article class="build-card">
          <header class="build-card-head">
            <div class="build-card-title">
              <div class="build-card-hero">${heroIcon}<span>${escapeHtml(heroName)}</span></div>
              <h3>${escapeHtml(entry.name || `Build #${entry.buildId}`)}</h3>
            </div>
            <div class="build-card-code">#${entry.buildId}</div>
          </header>
          <div class="build-card-meta">
            <span>Source: ${escapeHtml(source)}</span>
            <span>Fav: ${Number(entry.favorites || 0)}</span>
            <span>Publie: ${escapeHtml(published)}</span>
            <span>Maj: ${escapeHtml(updated)}</span>
            ${twitchUrl ? `<a class="build-twitch-btn" href="${escapeHtml(twitchUrl)}" target="_blank" rel="noopener noreferrer">Twitch</a>` : ""}
          </div>
          <div class="build-card-body">${categoriesHtml}</div>
        </article>
      `;
    })
    .join("");
}

function applyBuildsHeroFilter() {
  const selectedHeroId = Number(buildsHeroFilter?.value || 0);
  if (!selectedHeroId) {
    renderBuildsGrid([]);
    setBuildsStatus(buildsCatalogLoaded
      ? "Selectionnez un hero pour afficher ses builds."
      : "Chargement du catalogue de builds...");
    return;
  }
  const filtered = selectedHeroId
    ? buildsEntriesCache.filter((entry) => Number(entry.heroId) === selectedHeroId)
    : buildsEntriesCache;
  renderBuildsGrid(filtered);
  setBuildsStatus(`${filtered.length} build(s) pour ce hero.`);
}

function normalizeBuildEntry(rawBuild, refsByBuildId = new Map()) {
  const heroBuild = rawBuild?.hero_build;
  const buildId = Number(heroBuild?.hero_build_id);
  const heroId = Number(heroBuild?.hero_id);
  if (!Number.isInteger(buildId) || buildId <= 0) return null;
  if (!Number.isInteger(heroId) || heroId <= 0) return null;

  const ref = refsByBuildId.get(buildId) || null;
  const categories = Array.isArray(heroBuild?.details?.mod_categories)
    ? heroBuild.details.mod_categories.map((category) => ({
      name: category?.name || "",
      mods: Array.isArray(category?.mods)
        ? category.mods
          .map((mod) => ({ ability_id: Number(mod?.ability_id), annotation: mod?.annotation || null }))
          .filter((mod) => Number.isFinite(mod.ability_id) && mod.ability_id > 0)
        : [],
    }))
    : [];

  return {
    buildId,
    heroId,
    name: heroBuild?.name || "",
    authorId: Number(heroBuild?.author_account_id || 0) || null,
    favorites: Number(rawBuild?.num_favorites || 0) || 0,
    publishTs: Number(heroBuild?.publish_timestamp || 0) || null,
    updatedTs: Number(heroBuild?.last_updated_timestamp || 0) || null,
    sheetHero: ref?.sheetHero || null,
    sheetSource: ref?.sheetSource || null,
    twitchUrl: pickTwitchUrlForSource(ref?.sheetSource || "", ref?.twitchLinks || []),
    categories,
  };
}

async function fetchBuildByCode(buildId) {
  const data = await apiGet("/builds", { buildId, onlyLatest: true });
  return data || null;
}

async function loadBuildsByCodes(buildIds = [], refsByBuildId = new Map(), statusLabel = "codes") {
  if (!Array.isArray(buildIds) || !buildIds.length) {
    buildsEntriesCache = [];
    populateBuildsHeroFilter([]);
    renderBuildsGrid([]);
    setBuildsStatus("Aucun build disponible.", true);
    return;
  }

  setBuildsStatus(`Chargement de ${buildIds.length} build(s) depuis ${statusLabel}...`);
  if (buildsGrid) buildsGrid.innerHTML = `<div class="loading-row"><span class="spinner"></span> Chargement des builds...</div>`;

  const responses = await runWithConcurrency(buildIds, 5, async (buildId) => {
    try {
      return await fetchBuildByCode(buildId);
    } catch (_e) {
      return null;
    }
  });

  const entries = responses
    .map((rawBuild) => normalizeBuildEntry(rawBuild, refsByBuildId))
    .filter(Boolean);

  buildsEntriesCache = entries;
  populateBuildsHeroFilter(entries);
  applyBuildsHeroFilter();

  const foundCount = entries.length;
  const missingCount = buildIds.length - foundCount;
  if (missingCount > 0) {
    setBuildsStatus(`Catalogue charge (${foundCount} builds, ${missingCount} introuvables).`, true);
  } else {
    setBuildsStatus(`Catalogue charge (${foundCount} builds).`);
  }
}

async function loadBuildsFromSheet() {
  const sheetUrl = String(buildsSheetUrlInput?.value || defaultBuildsSheetCsvUrl).trim() || defaultBuildsSheetCsvUrl;
  if (buildsSheetUrlInput) buildsSheetUrlInput.value = sheetUrl;

  try {
    setBuildsStatus("Telechargement du Google Sheet...");
    const res = await fetch(sheetUrl, { cache: "no-store" });
    const csvText = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const refs = extractBuildCodesFromSheetCsv(csvText);
    const refsByBuildId = new Map(refs.map((ref) => [ref.buildId, ref]));
    const buildIds = refs.map((ref) => ref.buildId);
    await loadBuildsByCodes(buildIds, refsByBuildId, "Google Sheet");
    buildsCatalogLoaded = true;
  } catch (error) {
    buildsEntriesCache = [];
    populateBuildsHeroFilter([]);
    renderBuildsGrid([]);
    setBuildsStatus(`Impossible de charger le sheet: ${error.message}`, true);
    buildsCatalogLoaded = false;
  }
}

async function loadBuildsFromCodesInput() {
  const codes = parseBuildCodesInput(buildsCodeInput?.value || "");
  await loadBuildsByCodes(codes, new Map(), "codes manuels");
}

async function ensureBuildsCatalogLoaded() {
  if (buildsCatalogLoaded) return;
  if (buildsCatalogPromise) {
    await buildsCatalogPromise;
    return;
  }
  buildsCatalogPromise = (async () => {
    await loadBuildsFromSheet();
  })();
  try {
    await buildsCatalogPromise;
  } finally {
    buildsCatalogPromise = null;
  }
}

/* ── Tier List ───────────────────────────────────────── */
function getTierListTierByRank(index, total) {
  if (!total) return "C";
  const ratio = (index + 1) / total;
  if (ratio <= 0.1) return "S";
  if (ratio <= 0.3) return "A";
  if (ratio <= 0.6) return "B";
  if (ratio <= 0.85) return "C";
  return "D";
}

function getTierBadgeClass(tier) {
  if (tier === "S") return "tier-s";
  if (tier === "A") return "tier-a";
  if (tier === "B") return "tier-b";
  if (tier === "C") return "tier-c";
  return "tier-d";
}

function populateTierListRankOptions() {
  if (!tierListRankBracketSelect) return;
  const previousValue = String(tierListRankBracketSelect.value || "all");
  const rankEntries = Object.entries(ranksMap || {})
    .map(([tier, rank]) => ({ tier: Number(tier), rank }))
    .filter((entry) => Number.isInteger(entry.tier) && entry.tier > 0)
    .sort((a, b) => a.tier - b.tier);

  const options = [`<option value="all">Tous</option>`];
  rankEntries.forEach(({ tier, rank }) => {
    const rankName = String(rank?.name || `Rank ${tier}`);
    for (let subrank = 1; subrank <= 6; subrank += 1) {
      const badge = tier * 10 + subrank;
      options.push(`<option value="badge:${badge}">${escapeHtml(rankName)} ${subrank}</option>`);
    }
  });

  tierListRankBracketSelect.innerHTML = options.join("");
  tierListRankBracketSelect.value = options.some((opt) => opt.includes(`value="${previousValue}"`))
    ? previousValue
    : "all";
}

function getTierListRankBounds(bracket) {
  const key = String(bracket || "all");
  if (key.startsWith("badge:")) {
    const badge = Number(key.slice("badge:".length));
    if (Number.isInteger(badge) && badge > 0) {
      return { minBadge: badge, maxBadge: badge };
    }
  }
  return { minBadge: null, maxBadge: null };
}

async function fetchTierListForDays(days, minMatches, gameMode, rankBracket = "all") {
  const nowTs = Math.floor(Date.now() / 1000);
  const minTs = nowTs - days * 24 * 60 * 60;
  const bounds = getTierListRankBounds(rankBracket);
  const data = await deadlockGet("/v1/analytics/scoreboards/heroes", {
    sort_by: "winrate",
    sort_direction: "desc",
    game_mode: gameMode || "normal",
    min_matches: minMatches,
    min_unix_timestamp: minTs,
    max_unix_timestamp: nowTs,
    min_average_badge: bounds.minBadge,
    max_average_badge: bounds.maxBadge,
  });
  const entries = Array.isArray(data) ? data : [];
  return entries
    .filter((entry) => Number(entry?.hero_id) > 0 && Number.isFinite(Number(entry?.value)))
    .map((entry, index) => {
      const heroId = Number(entry.hero_id);
      const winrate = Number(entry.value) * 100;
      return {
        heroId,
        heroName: heroesMap[heroId]?.name || `Hero #${heroId}`,
        heroIcon: heroesMap[heroId]?.images?.icon_image_small || "",
        winrate,
        matches: Number(entry.matches || 0),
        tier: getTierListTierByRank(index, entries.length),
      };
    });
}

function renderTierListPeriod(days, items = []) {
  const byTier = { S: [], A: [], B: [], C: [], D: [] };
  items.forEach((item) => byTier[item.tier]?.push(item));

  return `
    <article class="tierlist-period-card">
      <header class="tierlist-period-head">
        <h3>${days} jours</h3>
        <span>${items.length} heroes</span>
      </header>
      <div class="tierlist-period-body">
        ${["S", "A", "B", "C", "D"].map((tier) => `
          <section class="tierlist-row">
            <div class="tierlist-label ${getTierBadgeClass(tier)}">${tier}</div>
            <div class="tierlist-heroes">
              ${
                byTier[tier].length
                  ? byTier[tier].map((item) => `
                    <div class="tierlist-hero-pill" title="${escapeHtml(item.heroName)} - WR ${item.winrate.toFixed(2)}% - ${item.matches} matches">
                      ${
                        item.heroIcon
                          ? `<img src="${item.heroIcon}" alt="${escapeHtml(item.heroName)}" />`
                          : `<span class="tierlist-hero-fallback">#${item.heroId}</span>`
                      }
                      <span class="tierlist-hero-name">${escapeHtml(item.heroName)}</span>
                      <span class="tierlist-hero-wr">${item.winrate.toFixed(2)}%</span>
                    </div>
                  `).join("")
                  : `<span class="tierlist-empty">-</span>`
              }
            </div>
          </section>
        `).join("")}
      </div>
    </article>
  `;
}

async function loadTierList() {
  if (!tierListGrid) return;
  const minMatches = Math.max(20, Number(tierListMinMatchesInput?.value || 200));
  const gameMode = String(tierListModeSelect?.value || "normal");
  const rankBracket = String(tierListRankBracketSelect?.value || "all");

  if (tierListRefreshBtn) {
    tierListRefreshBtn.disabled = true;
    tierListRefreshBtn.textContent = "Chargement...";
  }
  tierListGrid.innerHTML = `<div class="loading-row"><span class="spinner"></span> Chargement tier list...</div>`;

  try {
    const periods = [7, 15, 30];
    const results = await Promise.all(periods.map((days) => fetchTierListForDays(days, minMatches, gameMode, rankBracket)));
    tierListGrid.innerHTML = periods
      .map((days, idx) => renderTierListPeriod(days, results[idx]))
      .join("");
    tierListLoaded = true;
  } catch (error) {
    tierListGrid.innerHTML = `<div class="empty-row">Erreur tier list: ${escapeHtml(error?.message || "inconnue")}</div>`;
    tierListLoaded = false;
  } finally {
    if (tierListRefreshBtn) {
      tierListRefreshBtn.disabled = false;
      tierListRefreshBtn.textContent = "Actualiser";
    }
  }
}

async function ensureTierListLoaded() {
  if (tierListLoaded) return;
  if (tierListPromise) {
    await tierListPromise;
    return;
  }
  tierListPromise = (async () => {
    await loadTierList();
  })();
  try {
    await tierListPromise;
  } finally {
    tierListPromise = null;
  }
}

/* â”€â”€ History â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function resetHistoryPagination() {
  historyAllMatchesCache = [];
  historyMatchesCache = [];
  historyRenderedCount = 0;
  historyRenderContext = { accountId: null, playerName: "Joueur", playerProfileUrl: "" };
  if (historyHeroFilter) {
    historyHeroFilter.innerHTML = `<option value="">All Heroes</option>`;
    historyHeroFilter.value = "";
    historyHeroFilter.disabled = true;
  }
  if (historyLoadMoreWrap) historyLoadMoreWrap.hidden = true;
  if (historyLoadMoreBtn) {
    historyLoadMoreBtn.disabled = false;
    historyLoadMoreBtn.textContent = "Load more";
  }
  setHistoryCurrentRank(null);
  setHistoryRecent30dWinrate([]);
  setHistoryAverageDurationLastMatches([]);
  setHistoryAverageDurationByRank([], []);
}

function setHistoryCurrentRank(info) {
  if (!historyRankName || !historyRankSub || !historyRankIconWrap) return;

  if (!info) {
    historyRankName.textContent = "Inconnu";
    historyRankSub.textContent = "Estimated Rank";
    historyRankIconWrap.innerHTML = `<span id="history-rank-icon-fallback">?</span>`;
    return;
  }

  const sub = info.subrank ? ` ${info.subrank}` : "";
  historyRankName.textContent = `${info.rankName}${sub}`;
  historyRankSub.textContent = `Score ${Number(info.rank || 0)}`;
  historyRankIconWrap.innerHTML = info.rankImg
    ? `<img src="${info.rankImg}" alt="${escapeHtml(info.rankName)}" title="${escapeHtml(info.rankName)}" />`
    : `<span id="history-rank-icon-fallback">?</span>`;
}

function setHistoryRecent30dWinrate(history = []) {
  if (!history30dWr || !history30dMeta) return;
  const nowTs = Math.floor(Date.now() / 1000);
  const minTs = nowTs - 30 * 24 * 60 * 60;
  const recent = Array.isArray(history)
    ? history.filter((m) => Number(m?.start_time || 0) >= minTs)
    : [];

  if (!recent.length) {
    history30dWr.textContent = "-";
    history30dMeta.textContent = "Aucun match sur 30 jours";
    if (history30dHeroes) history30dHeroes.innerHTML = `<div class="history-30d-hero-empty">Aucune donnee hero</div>`;
    return;
  }

  const wins = recent.filter(didPlayerWinMatch).length;
  const wr = Math.round((wins / recent.length) * 100);
  history30dWr.textContent = `${wr}%`;
  history30dMeta.textContent = `${wins}/${recent.length} victoires`;

  if (!history30dHeroes) return;
  const byHero = new Map();
  recent.forEach((match) => {
    const heroId = Number(match?.hero_id);
    if (!Number.isInteger(heroId) || heroId <= 0) return;
    const bucket = byHero.get(heroId) || { heroId, wins: 0, games: 0 };
    bucket.games += 1;
    if (didPlayerWinMatch(match)) bucket.wins += 1;
    byHero.set(heroId, bucket);
  });

  const topHeroes = [...byHero.values()]
    .sort((a, b) => {
      if (b.games !== a.games) return b.games - a.games;
      return b.wins - a.wins;
    })
    .slice(0, 6);

  if (!topHeroes.length) {
    history30dHeroes.innerHTML = `<div class="history-30d-hero-empty">Aucune donnee hero</div>`;
    return;
  }

  history30dHeroes.innerHTML = topHeroes.map((entry) => {
    const hero = heroesMap[entry.heroId];
    const heroName = hero?.name || `Hero #${entry.heroId}`;
    const heroIcon = hero?.images?.icon_image_small
      ? `<img src="${hero.images.icon_image_small}" alt="${escapeHtml(heroName)}" />`
      : `<span class="history-30d-hero-fallback">#${entry.heroId}</span>`;
    const heroWr = Math.round((entry.wins / entry.games) * 100);
    return `
      <div class="history-30d-hero-row">
        <div class="history-30d-hero-main">
          <span class="history-30d-hero-icon">${heroIcon}</span>
          <span class="history-30d-hero-name">${escapeHtml(heroName)}</span>
        </div>
        <div class="history-30d-hero-stats">
          <small>${entry.wins}/${entry.games}</small>
          <strong>${heroWr}%</strong>
        </div>
      </div>
    `;
  }).join("");
}

function formatDurationLabel(seconds) {
  const safeSeconds = Math.max(0, Math.round(Number(seconds) || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const secs = String(safeSeconds % 60).padStart(2, "0");
  return `${minutes}m ${secs}s`;
}

function setHistoryAverageDurationLastMatches(history = []) {
  if (!history10000AvgDuration) return;
  const latestMatches = Array.isArray(history) ? history.slice(0, HISTORY_AVG_DURATION_SAMPLE) : [];
  const durations = latestMatches
    .map((m) => Number(m?.match_duration_s || 0))
    .filter((seconds) => Number.isFinite(seconds) && seconds > 0);

  if (!durations.length) {
    history10000AvgDuration.textContent = "-";
    return;
  }

  const totalDuration = durations.reduce((sum, seconds) => sum + seconds, 0);
  const averageDuration = totalDuration / durations.length;
  history10000AvgDuration.textContent = `${formatDurationLabel(averageDuration)} (${durations.length.toLocaleString("fr-FR")})`;
}

function getRankDivisionFromMmrEntry(entry) {
  const division = Number(entry?.division || 0);
  if (Number.isInteger(division) && division > 0) return division;
  const rank = Number(entry?.rank || 0);
  if (!Number.isFinite(rank) || rank <= 0) return 0;
  return Math.max(0, Math.floor(rank / 10));
}

function getRankDivisionLabel(division) {
  const rankData = ranksMap[division] || null;
  return rankData?.name || `Rank ${division}`;
}

function setHistoryAverageDurationByRank(history = [], mmrHistory = []) {
  if (!history10000DurationRanks) return;
  const latestMatches = Array.isArray(history) ? history.slice(0, HISTORY_AVG_DURATION_SAMPLE) : [];
  const mmrRows = Array.isArray(mmrHistory) ? mmrHistory : [];

  if (!latestMatches.length || !mmrRows.length) {
    history10000DurationRanks.innerHTML = `<div class="history-30d-hero-empty">Aucune donnee de rang</div>`;
    return;
  }

  const mmrByMatchId = new Map();
  mmrRows.forEach((row) => {
    const matchId = Number(row?.match_id);
    if (!Number.isFinite(matchId) || matchId <= 0) return;
    if (!mmrByMatchId.has(matchId)) mmrByMatchId.set(matchId, row);
  });

  const groups = new Map();
  latestMatches.forEach((match) => {
    const matchId = Number(match?.match_id);
    const duration = Number(match?.match_duration_s || 0);
    if (!Number.isFinite(matchId) || matchId <= 0 || !Number.isFinite(duration) || duration <= 0) return;
    const mmr = mmrByMatchId.get(matchId);
    if (!mmr) return;
    const division = getRankDivisionFromMmrEntry(mmr);
    if (!Number.isInteger(division) || division <= 0) return;
    const bucket = groups.get(division) || { division, totalDuration: 0, count: 0 };
    bucket.totalDuration += duration;
    bucket.count += 1;
    groups.set(division, bucket);
  });

  if (!groups.size) {
    history10000DurationRanks.innerHTML = `<div class="history-30d-hero-empty">Aucune correspondance match/rang</div>`;
    return;
  }

  const rows = [...groups.values()]
    .sort((a, b) => b.division - a.division)
    .map((entry) => {
      const avg = entry.totalDuration / Math.max(1, entry.count);
      const label = getRankDivisionLabel(entry.division);
      return `
        <div class="history-rank-duration-row">
          <span>${escapeHtml(label)}</span>
          <strong>${formatDurationLabel(avg)} (${entry.count.toLocaleString("fr-FR")})</strong>
        </div>
      `;
    });

  history10000DurationRanks.innerHTML = rows.join("");
}

function populateHistoryHeroFilter(matches = []) {
  if (!historyHeroFilter) return;
  const uniqueHeroIds = [...new Set(
    matches
      .map((m) => Number(m?.hero_id))
      .filter((id) => Number.isFinite(id) && id > 0)
  )];
  const options = uniqueHeroIds
    .map((heroId) => ({
      heroId,
      label: heroesMap[heroId]?.name || `Hero #${heroId}`,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "fr", { sensitivity: "base" }));

  historyHeroFilter.innerHTML = [
    `<option value="">All Heroes</option>`,
    ...options.map((opt) => `<option value="${opt.heroId}">${escapeHtml(opt.label)}</option>`),
  ].join("");
  historyHeroFilter.value = "";
  historyHeroFilter.disabled = options.length === 0;
}

async function applyHistoryHeroFilter() {
  const selectedHeroId = Number(historyHeroFilter?.value || 0);
  historyMatchesCache = selectedHeroId
    ? historyAllMatchesCache.filter((m) => Number(m?.hero_id) === selectedHeroId)
    : [...historyAllMatchesCache];
  historyRenderedCount = 0;
  historyBody.innerHTML = "";

  if (!historyMatchesCache.length) {
    historyBody.innerHTML = `<div class="empty-row">Aucun match pour ce hero.</div>`;
    updateHistoryLoadMoreVisibility();
    return;
  }
  await loadMoreHistoryMatches();
}

function updateHistoryLoadMoreVisibility() {
  if (!historyLoadMoreWrap || !historyLoadMoreBtn) return;
  const hasMore = historyRenderedCount < historyMatchesCache.length;
  historyLoadMoreWrap.hidden = !hasMore;
  historyLoadMoreBtn.disabled = !hasMore;
}

async function hydrateHistoryPageMetadata(matches) {
  const metadataRows = await runWithConcurrency(matches, 4, async (match) => ({
    matchId: match.match_id,
    info: await fetchMatchMetadata(match.match_id),
  }));
  const metadataByMatchId = new Map(
    metadataRows
      .filter((row) => row?.matchId != null)
      .map((row) => [row.matchId, row.info || null])
  );

  const rawPlayers = [];
  for (const info of metadataByMatchId.values()) {
    if (!info?.players) continue;
    rawPlayers.push(...info.players);
  }
  await hydratePlayerNames(rawPlayers);
  await hydratePlayerMmr(rawPlayers.map((p) => p?.account_id));

  return metadataByMatchId;
}

function renderHistoryCard(match, metadataByMatchId) {
  const myAccountId = historyRenderContext.accountId;
  const playerName = historyRenderContext.playerName;
  const playerProfileUrl = historyRenderContext.playerProfileUrl;
  const k = match.player_kills ?? 0;
  const d = match.player_deaths ?? 0;
  const a = match.player_assists ?? 0;
  const cls = kdaClass(k, d, a);
  const nw = match.net_worth != null ? `${Number(match.net_worth).toLocaleString("fr-FR")}` : "-";
  const mins = Math.max(1, (match.match_duration_s || 0) / 60);
  const cs = Number(match.last_hits || 0);
  const csPerMin = (cs / mins).toFixed(1);
  const durationMin = Math.floor((match.match_duration_s || 0) / 60);
  const durationSec = String((match.match_duration_s || 0) % 60).padStart(2, "0");
  const outcomeWin = didPlayerWinMatch(match);
  const outcomeClass = outcomeWin ? "win" : "loss";
  const outcomeText = outcomeWin ? "Victoire" : "Defaite";
  const relative = formatRelativeTime(match.start_time);

  const hero = heroesMap[match.hero_id];
  const heroDisplay = hero?.images?.icon_image_small
    ? `<img src="${hero.images.icon_image_small}" alt="${hero.name}" title="${hero.name}" class="history-hero-icon" />`
    : `<span class="history-hero-fallback">#${match.hero_id}</span>`;

  const info = metadataByMatchId.get(match.match_id) || null;
  const players = Array.isArray(info?.players) ? info.players : [];
  const me = players.find((p) => Number(p.account_id) === Number(myAccountId)) || null;
  const finalItemIds = extractFinalItemIds(me);
  const myRankChip = renderRankChip(myAccountId, true);
  const avgRank = computeAverageMatchRank(players);
  const avgRankChip = avgRank
    ? `
      <span class="history-avg-rank">
        ${avgRank.rankImg ? `<img src="${avgRank.rankImg}" alt="${escapeHtml(avgRank.rankName)}" title="${escapeHtml(avgRank.rankName)}" />` : ""}
        <span>Moyenne: ${escapeHtml(avgRank.rankName)}.${avgRank.subrank}</span>
      </span>
    `
    : `<span class="history-avg-rank is-missing">Moyenne: inconnue</span>`;
  const buildHtml = finalItemIds.length
    ? finalItemIds.map((itemId) => renderItemIcon(itemId, true)).join("")
    : `<span class="history-build-empty">Build indisponible</span>`;

  const myTeam = me?.player_team ?? me?.team ?? me?.team_number;
  const allies = players
    .filter((p) => Number(p.account_id) !== Number(myAccountId))
    .filter((p) => (p.player_team ?? p.team ?? p.team_number) === myTeam)
    .map((p) => `
      <span class="history-enemy-row">
        <span class="history-enemy-name" title="${escapeHtml(resolvePlayerPseudo(p))}">${escapeHtml(resolvePlayerPseudo(p))}</span>
        ${renderRankChip(p.account_id, false, true)}
      </span>
    `);

  const enemies = players
    .filter((p) => (p.player_team ?? p.team ?? p.team_number) !== myTeam)
    .map((p) => `
      <span class="history-enemy-row">
        <span class="history-enemy-name" title="${escapeHtml(resolvePlayerPseudo(p))}">${escapeHtml(resolvePlayerPseudo(p))}</span>
        ${renderRankChip(p.account_id, false, true)}
      </span>
    `);

  const alliesHtml = allies.length
    ? allies.join("")
    : `<span class="history-enemy-empty">Allies indisponibles</span>`;
  const enemiesHtml = enemies.length
    ? enemies.join("")
    : `<span class="history-enemy-empty">Ennemis indisponibles</span>`;

  return `
    <article class="history-match-card clickable" data-match-id="${match.match_id}" data-account-id="${myAccountId}">
      <div class="history-match-result ${outcomeClass}">
        <strong>${outcomeText}</strong>
        <span>${durationMin}:${durationSec}</span>
      </div>
      <div class="history-match-main">
        <div class="history-top-row">
          <div class="history-meta-left">
            <div class="history-player-line">
              ${heroDisplay}
              ${
                playerProfileUrl
                  ? `<a class="history-player-link" href="${escapeHtml(playerProfileUrl)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation();">${escapeHtml(playerName || "Joueur")}</a>`
                  : `<span class="history-player-link is-static">${escapeHtml(playerName || "Joueur")}</span>`
              }
            </div>
            <div class="history-top-time">${relative}</div>
            <div class="history-top-id">${match.match_id}</div>
          </div>
          <div class="history-kda-block">
            <div class="history-kda-value ${cls}">${k} / ${d} / ${a}</div>
            <div class="history-kda-sub">${d > 0 ? ((k + a) / d).toFixed(2) : "INF"} KDA</div>
          </div>
          <div class="history-stats-compact">
            <span>${cs} CS (${csPerMin}/m)</span>
            <span>${nw} NW</span>
            ${avgRankChip}
          </div>
        </div>
        <div class="history-bottom-row">
          <div class="history-build-col">
            <div class="history-rank-line">
              <span class="history-rank-label">Votre rang</span>
              ${myRankChip}
            </div>
            <div class="history-build-strip">${buildHtml}</div>
          </div>
          <div class="history-sides">
            <div class="history-side-block allies">
              <div class="history-side-title">Allies (${allies.length})</div>
              <div class="history-enemies">${alliesHtml}</div>
            </div>
            <div class="history-side-block enemies">
              <div class="history-side-title">Ennemis (${enemies.length})</div>
              <div class="history-enemies">${enemiesHtml}</div>
            </div>
          </div>
        </div>
      </div>
    </article>
  `;
}

async function loadMoreHistoryMatches() {
  if (!historyMatchesCache.length || historyRenderedCount >= historyMatchesCache.length) {
    updateHistoryLoadMoreVisibility();
    return;
  }
  if (historyLoadMoreBtn) {
    historyLoadMoreBtn.disabled = true;
    historyLoadMoreBtn.textContent = "Chargement...";
  }
  try {
    const nextMatches = historyMatchesCache.slice(historyRenderedCount, historyRenderedCount + HISTORY_PAGE_SIZE);
    const metadataByMatchId = await hydrateHistoryPageMetadata(nextMatches);
    historyBody.insertAdjacentHTML(
      "beforeend",
      nextMatches.map((match) => renderHistoryCard(match, metadataByMatchId)).join("")
    );
    historyRenderedCount += nextMatches.length;
  } catch (e) {
    if (historyRenderedCount === 0) throw e;
    historyBody.insertAdjacentHTML("beforeend", `<div class="empty-row">Erreur de chargement: ${escapeHtml(e.message || "inconnue")}</div>`);
  } finally {
    if (historyLoadMoreBtn) {
      historyLoadMoreBtn.textContent = "Load more";
    }
    updateHistoryLoadMoreVisibility();
  }
}

async function loadHistory() {
  historyBody.innerHTML = historyLoadingBlock();
  hidePlayerInfo(playerInfoDisplay);
  setHistoryAvatar("", "");
  setHistorySummary([], null);
  resetHistoryPagination();

  const rawInput = String(document.getElementById("accountId").value || "").trim().replace(/^#/, "");
  let accountId = parseAccountId(rawInput);
  if (!accountId && rawInput) {
    try {
      const results = await apiGet("/player-search", { searchQuery: rawInput });
      const best = pickBestSearchMatch(results, rawInput);
      accountId = parseAccountId(best?.account_id);
      if (accountId) {
        document.getElementById("accountId").value = String(accountId);
      }
    } catch (_) {
      // handled below as invalid input if unresolved
    }
  }

  if (!accountId) {
    historyBody.innerHTML = `<div class="empty-row">Account ID ou pseudo invalide.</div>`;
    return;
  }
  try {
    // Use stored history to avoid Steam refetch quota (5 req/h).
    const [data, mmrHistory] = await Promise.all([
      apiGet("/match-history", { accountId, onlyStored: true }),
      apiGet("/mmr-history", { accountId }).catch(() => []),
    ]);
    const history = Array.isArray(data.history) ? data.history : [];
    const playerProfileUrl = typeof data.playerProfileUrl === "string" ? data.playerProfileUrl : "";
    await hydratePlayerMmr([accountId]);
    setHistoryCurrentRank(getPlayerRankInfo(accountId));
    showPlayerInfo(playerInfoDisplay, playerInfoName, playerInfoId, accountId, data.playerName);
    setHistoryAvatar(data.playerAvatar, data.playerName || "Joueur");
    setHistorySummary(history, data.playerName || "Joueur");
    setHistoryRecent30dWinrate(history);
    setHistoryAverageDurationLastMatches(history);
    setHistoryAverageDurationByRank(history, mmrHistory);

    if (!history.length) {
      historyBody.innerHTML = `<div class="empty-row">Aucune donnee disponible.</div>`;
      return;
    }
    historyRenderContext = {
      accountId,
      playerName: data.playerName || "Joueur",
      playerProfileUrl,
    };
    historyAllMatchesCache = history;
    populateHistoryHeroFilter(historyAllMatchesCache);
    await applyHistoryHeroFilter();
  } catch (e) {
    historyBody.innerHTML = `<div class="empty-row">Erreur : ${e.message}</div>`;
    resetHistoryPagination();
  }
}

/* â”€â”€ Coaching Analysis (pure JS, fonctionne sans backend) â”€â”€ */
// Logique portee depuis backend/server.js pour GitHub Pages

function _round(v, d = 2) { const p = 10 ** d; return Math.round(v * p) / p; }
function _safeDiv(a, b, fb = 0) { return b ? a / b : fb; }
function _avg(arr) { return arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0; }
function _std(arr) {
  if (arr.length < 2) return 0;
  const m = _avg(arr);
  return Math.sqrt(_avg(arr.map(v => (v - m) ** 2)));
}

function _toMatchMetrics(match) {
  const mins   = Math.max((match.match_duration_s || 0) / 60, 1);
  const k      = match.player_kills   || 0;
  const d      = match.player_deaths  || 0;
  const a      = match.player_assists || 0;
  const lh     = match.last_hits      || 0;
  const dn     = match.denies         || 0;
  const nw     = match.net_worth      || 0;
  return {
    heroId:         match.hero_id,
    result:         match.match_result,
    kda:            _safeDiv(k + a, Math.max(1, d)),
    deathsPer10:    _safeDiv(d, mins) * 10,
    lhPerMin:       _safeDiv(lh, mins),
    deniesPerMin:   _safeDiv(dn, mins),
    netWorthPerMin: _safeDiv(nw, mins),
    kaPer10:        _safeDiv(k + a, mins) * 10,
  };
}

function _topHeroes(metrics) {
  const counts = new Map();
  for (const m of metrics) counts.set(m.heroId, (counts.get(m.heroId) || 0) + 1);
  return [...counts.entries()].map(([heroId, games]) => ({ heroId, games })).sort((a, b) => b.games - a.games);
}

function _buildFindings(summary, trend, heroStats) {
  const findings = [];
  if (summary.deathsPer10Avg >= 3.3) {
    findings.push({ severity: "high", code: "high_death_rate", title: "Surmortalite",
      why: "Le joueur meurt trop souvent, ce qui casse le tempo et la presence sur la carte.",
      evidence: `Morts/10min: ${summary.deathsPer10Avg} (cible <= 2.8)`,
      action: "Travailler la discipline de positionnement: reset avant les spikes ennemis et eviter les fights sans info." });
  } else if (summary.deathsPer10Avg >= 2.8) {
    findings.push({ severity: "medium", code: "death_control", title: "Gestion des morts a renforcer",
      why: "Le volume de morts reste assez haut pour limiter la progression constante.",
      evidence: `Morts/10min: ${summary.deathsPer10Avg}`,
      action: "Coach: fixer une regle simple par phase (laning/mid/late) sur quand disengage." });
  }
  if (summary.lhPerMinAvg < 5.8) {
    findings.push({ severity: "high", code: "low_farm", title: "Farm insuffisant",
      why: "Le joueur manque de ressources pour tenir son impact sur la duree.",
      evidence: `Last hits/min: ${summary.lhPerMinAvg} (cible >= 6.2)`,
      action: "Mettre une routine de wave + camp entre deux objectifs, avec timer strict." });
  } else if (summary.lhPerMinAvg < 6.2) {
    findings.push({ severity: "medium", code: "farm_optimization", title: "Optimisation de farm",
      why: "Le farm est jouable mais encore un cran sous un niveau stable.",
      evidence: `Last hits/min: ${summary.lhPerMinAvg}`,
      action: "Objectif de seances: +0.4 LH/min en priorisant les trajectoires de farm les plus courtes." });
  }
  if (summary.netWorthPerMinAvg < 1200) {
    findings.push({ severity: "medium", code: "low_economy", title: "Economie trop basse",
      why: "La generation de net worth ne soutient pas les timings d'objets.",
      evidence: `Net worth/min: ${summary.netWorthPerMinAvg} (cible >= 1300)`,
      action: "Analyser les 5 premieres minutes de chaque game pour corriger les pertes de tempo." });
  }
  if (trend.isRecentDrop) {
    findings.push({ severity: "high", code: "recent_performance_drop", title: "Baisse recente de performance",
      why: "Les 10 dernieres parties sont clairement en retrait par rapport aux precedentes.",
      evidence: `KDA ${trend.kdaDeltaPct}% et morts/10min +${trend.deathsDeltaPct}%`,
      action: "Coach: revoir 3 replays recents et isoler 2 erreurs recurrentes a corriger en priorite." });
  }
  if (summary.kdaCv > 0.85) {
    findings.push({ severity: "medium", code: "inconsistent_games", title: "Performance irreguliere",
      why: "Le niveau varie fortement d'une game a l'autre.",
      evidence: `Coefficient de variation KDA: ${summary.kdaCv}`,
      action: "Standardiser le plan de debut de partie pour reduire les ecarts de performance." });
  }
  if (heroStats.uniqueHeroes >= 10 && heroStats.topHeroShare < 0.25) {
    findings.push({ severity: "medium", code: "hero_pool_too_wide", title: "Pool de heros trop disperse",
      why: "Le joueur dilue sa progression mecanique et decisionnelle.",
      evidence: `${heroStats.uniqueHeroes} heros joues, top heros ${heroStats.topHeroSharePct}%`,
      action: "Limiter temporairement le pool a 2-3 heros pour accelerer la correction d'erreurs." });
  }
  if (!findings.length) {
    findings.push({ severity: "low", code: "no_major_issue", title: "Pas d'erreur majeure detectee",
      why: "Les indicateurs principaux sont globalement stables.",
      evidence: "Ajustements fins possibles selon role et heros joues.",
      action: "Passer a une analyse replay micro (positionnement, timings de powerspike, target selection)." });
  }
  const rank = { high: 0, medium: 1, low: 2 };
  findings.sort((a, b) => rank[a.severity] - rank[b.severity]);
  return findings;
}

function _analyzeMatchHistory(history, mmrHistory) {
  const metrics = history.map(_toMatchMetrics);
  const kdaVals  = metrics.map(m => m.kda);
  const d10Vals  = metrics.map(m => m.deathsPer10);
  const lhVals   = metrics.map(m => m.lhPerMin);
  const nwVals   = metrics.map(m => m.netWorthPerMin);
  const kaVals   = metrics.map(m => m.kaPer10);

  const summary = {
    matchesAnalyzed:    metrics.length,
    kdaAvg:             _round(_avg(kdaVals)),
    deathsPer10Avg:     _round(_avg(d10Vals)),
    lhPerMinAvg:        _round(_avg(lhVals)),
    netWorthPerMinAvg:  _round(_avg(nwVals)),
    kaPer10Avg:         _round(_avg(kaVals)),
    result1Rate:        _round(_avg(metrics.map(m => m.result === 1 ? 1 : 0)) * 100),
    kdaCv:              _round(_safeDiv(_std(kdaVals), Math.max(0.01, _avg(kdaVals)))),
  };

  const recent   = metrics.slice(0, 10);
  const previous = metrics.slice(10, 30);
  const recentKda    = _avg(recent.map(m => m.kda));
  const previousKda  = _avg(previous.map(m => m.kda));
  const recentDeaths = _avg(recent.map(m => m.deathsPer10));
  const prevDeaths   = _avg(previous.map(m => m.deathsPer10));
  const kdaDeltaPct    = _round(_safeDiv(recentKda - previousKda, Math.max(previousKda, 0.01)) * 100, 1);
  const deathsDeltaPct = _round(_safeDiv(recentDeaths - prevDeaths, Math.max(prevDeaths, 0.01)) * 100, 1);

  const trend = { kdaDeltaPct, deathsDeltaPct,
    isRecentDrop: recent.length >= 8 && previous.length >= 8 && kdaDeltaPct <= -15 && deathsDeltaPct >= 15 };

  const heroPicks = _topHeroes(metrics);
  const heroStats = {
    uniqueHeroes:     heroPicks.length,
    topHero:          heroPicks[0] || null,
    topHeroShare:     heroPicks.length ? heroPicks[0].games / metrics.length : 0,
    topHeroSharePct:  _round(heroPicks.length ? (heroPicks[0].games / metrics.length) * 100 : 0),
  };

  const recentMmr = Array.isArray(mmrHistory) ? mmrHistory.slice(-20) : [];
  const mmrTrend = {
    firstRank: recentMmr[0]?.rank ?? null,
    lastRank:  recentMmr[recentMmr.length - 1]?.rank ?? null,
    deltaRank: recentMmr.length >= 2
      ? _round(recentMmr[recentMmr.length - 1].rank - recentMmr[0].rank, 1)
      : null,
  };

  return { summary, trend, heroStats, mmrTrend, findings: _buildFindings(summary, trend, heroStats) };
}

/* â”€â”€ Coaching Report â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function findItemByName(candidates) {
  if (!Array.isArray(itemsListCache) || !itemsListCache.length) return null;
  const lookup = new Set(candidates.map((c) => String(c).toLowerCase()));
  return itemsListCache.find((item) => lookup.has(String(item.name || "").toLowerCase())) || null;
}

function findItemByExactName(name) {
  const key = String(name || "").toLowerCase();
  if (!key || !Array.isArray(itemsListCache)) return null;
  return itemsListCache.find((item) => String(item?.name || "").toLowerCase() === key) || null;
}

function computeEnemyProfile(enemyPlayers) {
  const stats = {
    enemyHealing: 0,
    enemyBulletPressure: 0,
    enemyPlayerDamage: 0,
    enemyItemNames: [],
    enemyItemCounts: {},
    enemySlotCounts: {},
  };

  const getEnemyName = (player) => resolvePlayerPseudo(player);

  for (const p of enemyPlayers) {
    const timeline = Array.isArray(p.stats) && p.stats.length ? p.stats[p.stats.length - 1] : null;
    if (timeline) {
      stats.enemyHealing += Number(timeline.player_healing || 0) + Number(timeline.self_healing || 0);
      stats.enemyBulletPressure += Number(timeline.hero_bullets_hit || 0);
      stats.enemyPlayerDamage += Number(timeline.player_damage || 0);
    }

    const ids = Array.isArray(p.items) ? p.items : [];
    for (const entry of ids) {
      const itemId = typeof entry === "object" ? (entry.item_id ?? entry.id) : entry;
      const rawTime = typeof entry === "object" ? (entry.game_time_s ?? entry.time_s ?? entry.purchased_at ?? null) : null;
      const purchaseTimeS = Number.isFinite(Number(rawTime)) ? Number(rawTime) : null;
      const item = itemsMap[itemId];
      const name = item?.name;
      if (!name) continue;
      const key = name.toLowerCase();
      stats.enemyItemNames.push(key);
      if (!stats.enemyItemCounts[key]) {
        stats.enemyItemCounts[key] = { name, key, count: 0, id: itemId, owners: new Map() };
      }
      stats.enemyItemCounts[key].count += 1;
      const ownerName = getEnemyName(p);
      const prevOwner = stats.enemyItemCounts[key].owners.get(ownerName);
      if (!prevOwner) {
        stats.enemyItemCounts[key].owners.set(ownerName, { name: ownerName, firstTimeS: purchaseTimeS });
      } else if (purchaseTimeS != null && (prevOwner.firstTimeS == null || purchaseTimeS < prevOwner.firstTimeS)) {
        prevOwner.firstTimeS = purchaseTimeS;
      }

      const slot = String(item.item_slot_type || "unknown").toLowerCase();
      stats.enemySlotCounts[slot] = (stats.enemySlotCounts[slot] || 0) + 1;
    }
  }

  return stats;
}

function buildCounterRecommendations(matchInfo, accountId) {
  const players = Array.isArray(matchInfo?.players) ? matchInfo.players : [];
  const myPlayer = players.find((p) => Number(p.account_id) === Number(accountId));
  if (!myPlayer) return null;

  const myTeam = myPlayer.team ?? myPlayer.player_team ?? myPlayer.team_number;
  const enemies = players.filter((p) => (p.team ?? p.player_team ?? p.team_number) !== myTeam);
  const enemyHeroes = enemies.map((p) => heroesMap[p.hero_id]?.name || `Hero #${p.hero_id}`);
  const profile = computeEnemyProfile(enemies);
  const enemyItems = Object.values(profile.enemyItemCounts);

  const counterRules = [
    {
      key: "anti_heal",
      enemyKeywords: ["healbane", "healing rite", "healing nova", "lifesteal", "leech", "vampiric", "siphon"],
      counterCandidates: ["Healbane", "Toxic Bullets"],
      reason: "cet item coupe les soins et le lifesteal pendant l'echange.",
      baseScore: 45,
    },
    {
      key: "anti_bullet",
      enemyKeywords: ["tesla bullets", "toxic bullets", "intensifying magazine", "burst fire", "headhunter", "sharpshooter", "pristine emblem"],
      counterCandidates: ["Bullet Armor", "Metal Skin", "Return Fire"],
      reason: "cet item reduit la pression weapon et amortit le burst auto-attack.",
      baseScore: 40,
    },
    {
      key: "anti_spirit",
      enemyKeywords: ["mystic burst", "improved burst", "spirit rend", "surge of power", "curse", "echo shard", "silence glyph"],
      counterCandidates: ["Spirit Armor", "Improved Spirit Armor", "Debuff Reducer"],
      reason: "cet item limite les pics de degats spirit et stabilise les trades.",
      baseScore: 38,
    },
    {
      key: "anti_cc",
      enemyKeywords: ["silence glyph", "silencer", "curse", "knockdown", "slowing bullets", "cold front", "debuff"],
      counterCandidates: ["Debuff Reducer", "Reactive Barrier", "Divine Barrier"],
      reason: "cet item reduit la duree/impact des controles et te laisse rejouer plus vite.",
      baseScore: 35,
    },
    {
      key: "anti_shield",
      enemyKeywords: ["reactive barrier", "divine barrier", "spirit shielding", "ancient shield", "metal skin"],
      counterCandidates: ["Nullification Burst", "Healbane", "Toxic Bullets"],
      reason: "cet item aide a casser les pics defensifs et a finir les cibles protegees.",
      baseScore: 30,
    },
  ];

  const scored = [];

  for (const rule of counterRules) {
    const matched = enemyItems
      .filter((entry) => rule.enemyKeywords.some((kw) => entry.key.includes(kw)))
      .sort((a, b) => b.count - a.count);

    if (!matched.length) continue;

    const counterItem = findItemByName(rule.counterCandidates);
    if (!counterItem) continue;

    const targetNames = matched.slice(0, 3).map((m) => m.name);
    const threatDetails = matched
      .flatMap((m) => Array.from(m.owners?.values?.() || []).map((owner) => ({
        ownerName: owner.name,
        itemName: m.name,
        timeS: owner.firstTimeS ?? null,
      })))
      .sort((a, b) => {
        if (a.timeS == null && b.timeS == null) return 0;
        if (a.timeS == null) return 1;
        if (b.timeS == null) return -1;
        return a.timeS - b.timeS;
      })
      .slice(0, 8);
    const threatHolders = Array.from(
      new Set(
        threatDetails.map((d) => d.ownerName)
      )
    ).slice(0, 4);
    const score = rule.baseScore + matched.reduce((sum, m) => sum + m.count * 8, 0);
    scored.push({
      item: counterItem,
      score,
      targets: targetNames,
      threatHolders,
      threatDetails,
      reason: `Contre ${targetNames.join(", ")} : ${rule.reason}`,
    });
  }

  if (profile.enemyHealing >= 18000) {
    const item = findItemByName(["Healbane", "Toxic Bullets"]);
    if (item) {
      scored.push({
        item,
        score: 42,
        targets: ["sustain global adverse"],
        reason: "Contre sustain global adverse : cet item reduit la valeur des soins en fight long.",
      });
    }
  }

  if (profile.enemyBulletPressure >= 550) {
    const item = findItemByName(["Metal Skin", "Bullet Armor", "Return Fire"]);
    if (item) {
      scored.push({
        item,
        score: 41,
        targets: ["pression bullet globale"],
        reason: "Contre pression bullet globale : cet item absorbe mieux les engages dps.",
      });
    }
  }

  if ((myPlayer.deaths ?? 0) >= 8) {
    const item = findItemByName(["Colossus", "Metal Skin", "Reactive Barrier"]);
    if (item) {
      scored.push({
        item,
        score: 34,
        targets: ["survie personnelle"],
        reason: "Contre votre mortalite sur cette partie : cet item ajoute une vraie marge defensive.",
      });
    }
  }

  if (!scored.length) {
    const dominantSlot = Object.entries(profile.enemySlotCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    const fallback = dominantSlot === "spirit"
      ? findItemByName(["Spirit Armor", "Improved Spirit Armor"])
      : findItemByName(["Bullet Armor", "Debuff Reducer"]);
    if (fallback) {
      scored.push({
        item: fallback,
        score: 20,
        targets: [dominantSlot || "build adverse"],
        reason: "Contre le profil principal adverse : ce contre reste le plus stable dans ce match.",
      });
    }
  }

  const mergedByItemId = new Map();
  for (const rec of scored) {
    const id = rec.item.id;
    if (!mergedByItemId.has(id)) {
      mergedByItemId.set(id, { ...rec });
      continue;
    }
    const prev = mergedByItemId.get(id);
    prev.score = Math.max(prev.score, rec.score);
    prev.targets = Array.from(new Set([...(prev.targets || []), ...(rec.targets || [])])).slice(0, 4);
    prev.threatHolders = Array.from(new Set([...(prev.threatHolders || []), ...(rec.threatHolders || [])])).slice(0, 6);
    prev.threatDetails = [...(prev.threatDetails || []), ...(rec.threatDetails || [])]
      .reduce((acc, detail) => {
        const key = `${detail.ownerName}::${detail.itemName}`;
        const found = acc.get(key);
        if (!found) {
          acc.set(key, { ...detail });
        } else if (detail.timeS != null && (found.timeS == null || detail.timeS < found.timeS)) {
          found.timeS = detail.timeS;
        }
        return acc;
      }, new Map());
    prev.threatDetails = Array.from(prev.threatDetails.values())
      .sort((a, b) => {
        if (a.timeS == null && b.timeS == null) return 0;
        if (a.timeS == null) return 1;
        if (b.timeS == null) return -1;
        return a.timeS - b.timeS;
      })
      .slice(0, 8);
    if (!prev.reason.includes(rec.reason)) {
      prev.reason = `${prev.reason} ${rec.reason}`;
    }
  }

  const recommendations = Array.from(mergedByItemId.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  return {
    matchId: matchInfo.match_id,
    enemyHeroes,
    myKda: `${myPlayer.kills ?? 0}/${myPlayer.deaths ?? 0}/${myPlayer.assists ?? 0}`,
    recommendations: recommendations.map((r) => ({
      itemId: r.item.id,
      itemName: r.item.name,
      reason: r.reason,
      targets: r.targets || [],
      threatHolders: r.threatHolders || [],
      threatDetails: r.threatDetails || [],
      score: r.score,
    })),
  };
}

function formatCounterTimeLabel(timeS) {
  if (timeS == null || !Number.isFinite(Number(timeS))) return "timing inconnu";
  const minute = Math.max(0, Math.floor(Number(timeS) / 60));
  return `dès ${minute}m`;
}

function renderCounterSourceTag(detail, options = {}) {
  const { includeOwner = true } = options;
  const item = findItemByExactName(detail?.itemName);
  const icon = item?.shop_image_small || item?.shop_image || item?.image_webp || item?.image || "";
  const owner = escapeHtml(detail?.ownerName || "inconnu");
  const itemName = escapeHtml(detail?.itemName || "item");
  const timing = escapeHtml(formatCounterTimeLabel(detail?.timeS));
  return `
    <span class="counter-source-tag">
      ${icon ? `<img class="counter-source-icon" src="${icon}" alt="${itemName}" title="${itemName}" />` : ""}
      ${includeOwner ? `<span class="counter-source-owner">${owner}</span>` : ""}
      <span class="counter-source-item">${itemName}</span>
      <span class="counter-source-time">${timing}</span>
    </span>
  `;
}

function renderCounterSourcesGroupedByPlayer(details = []) {
  const grouped = new Map();

  for (const detail of details) {
    const ownerName = String(detail?.ownerName || "inconnu").trim() || "inconnu";
    if (!grouped.has(ownerName)) {
      grouped.set(ownerName, new Map());
    }

    const byItem = grouped.get(ownerName);
    const itemKey = String(detail?.itemName || "item");
    const existing = byItem.get(itemKey);

    if (!existing) {
      byItem.set(itemKey, { ...detail, ownerName });
      continue;
    }

    if (detail?.timeS != null && (existing.timeS == null || Number(detail.timeS) < Number(existing.timeS))) {
      existing.timeS = detail.timeS;
    }
  }

  if (!grouped.size) return "";

  return `
    <div class="counter-source-groups">
      ${Array.from(grouped.entries()).map(([ownerName, itemMap]) => {
        const items = Array.from(itemMap.values())
          .sort((a, b) => {
            if (a.timeS == null && b.timeS == null) return 0;
            if (a.timeS == null) return 1;
            if (b.timeS == null) return -1;
            return Number(a.timeS) - Number(b.timeS);
          })
          .slice(0, 6);

        return `
          <div class="counter-source-group">
            <div class="counter-source-group-owner">${escapeHtml(ownerName)}</div>
            <div class="counter-source-list">
              ${items.map((detail) => renderCounterSourceTag(detail, { includeOwner: false })).join("")}
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderRecommendationItem(rec) {
  const item = rec?.itemId != null ? itemsMap[rec.itemId] : null;
  const src = item?.shop_image_small || item?.shop_image || item?.image_webp || item?.image || "";
  if (!src) return `<strong>${escapeHtml(rec.itemName)} :</strong>`;

  return `
    <span class="reco-item">
      <img class="reco-item-icon" src="${src}" alt="${escapeHtml(rec.itemName)}" title="${escapeHtml(rec.itemName)}" />
      <strong>${escapeHtml(rec.itemName)} :</strong>
    </span>
  `;
}

function renderRecommendationItemTitle(rec) {
  const item = rec?.itemId != null ? itemsMap[rec.itemId] : null;
  const src = item?.shop_image_small || item?.shop_image || item?.image_webp || item?.image || "";
  if (!src) return `${escapeHtml(rec.itemName)}`;
  return `<span class="reco-item"><img class="reco-item-icon" src="${src}" alt="${escapeHtml(rec.itemName)}" title="${escapeHtml(rec.itemName)}" />${escapeHtml(rec.itemName)}</span>`;
}

async function runWithConcurrency(values, concurrency, worker) {
  const results = new Array(values.length);
  let cursor = 0;

  async function next() {
    while (cursor < values.length) {
      const index = cursor++;
      try {
        results[index] = await worker(values[index], index);
      } catch (_e) {
        results[index] = null;
      }
    }
  }

  const workers = Array.from({ length: Math.max(1, concurrency) }, () => next());
  await Promise.all(workers);
  return results;
}

async function fetchMatchMetadata(matchId) {
  if (matchMetadataCache.has(matchId)) return matchMetadataCache.get(matchId);
  try {
    const data = await deadlockGet(`/v1/matches/${matchId}/metadata`, {
      include_player_info: true,
      include_player_items: true,
      include_player_stats: true,
    });
    const info = data?.match_info ?? data;
    if (!Array.isArray(info?.players) || !info.players.length) {
      matchMetadataCache.set(matchId, null);
      return null;
    }
    matchMetadataCache.set(matchId, info);
    return info;
  } catch (_e) {
    matchMetadataCache.set(matchId, null);
    return null;
  }
}

async function buildPerMatchRecommendations(history, accountId) {
  const metadataList = await runWithConcurrency(history, 4, async (match) => fetchMatchMetadata(match.match_id));
  const recs = [];
  for (const info of metadataList) {
    if (!info) continue;
    const rec = buildCounterRecommendations(info, accountId);
    if (rec) recs.push(rec);
  }
  return recs;
}

function renderPerMatchRecommendationsHtml(recommendations) {
  if (!recommendations.length) {
    return `<div class="finding sev-low"><div class="finding-body"><div class="finding-row">Aucune metadonnee exploitable pour generer des recommandations match par match.</div></div></div>`;
  }

  return recommendations.map((rec) => `
    <article class="finding sev-medium match-reco-card">
      <div class="finding-header">
        <span class="finding-title">Match #${rec.matchId}</span>
        <span class="sev-badge medium">${rec.myKda}</span>
      </div>
      <div class="finding-body">
        <div class="finding-row"><strong>Adversaires :</strong> ${rec.enemyHeroes.slice(0, 6).map((h) => escapeHtml(h)).join(", ")}</div>
        ${rec.recommendations.map((r) => `
          <div class="finding-row">
            ${renderRecommendationItem(r)} ${escapeHtml(r.reason)}
            ${Array.isArray(r.threatHolders) && r.threatHolders.length ? `<br><span style="color:var(--muted);">Counter porte par : ${r.threatHolders.map((name) => escapeHtml(name)).join(", ")}</span>` : ""}
            ${Array.isArray(r.threatDetails) && r.threatDetails.length ? `<br><span style="color:var(--muted);">Grace a : ${r.threatDetails.map((d) => `${escapeHtml(d.ownerName)} avec ${escapeHtml(d.itemName)} (${formatCounterTimeLabel(d.timeS)})`).join(" ; ")}</span>` : ""}
          </div>
        `).join("")}
      </div>
    </article>
  `).join("");
}

async function loadCoachReport() {
  const accountId = parseAccountId(document.getElementById("coachAccountId").value);
  const matches   = Math.min(Math.max(Number(document.getElementById("coachMatches").value), 10), 100);

  if (!accountId) {
    coachStatsGrid.innerHTML = "";
    coachFindings.innerHTML  = `<div class="error-block">Account ID invalide.</div>`;
    return;
  }

  coachStatsGrid.innerHTML = `<div class="loading-row"><span class="spinner"></span> Analyse en cours...</div>`;
  coachFindings.innerHTML  = "";
  hidePlayerInfo(coachPlayerInfoDisplay);

  try {
    // Appels directs a l'API Deadlock (fonctionne sur GitHub Pages)
    const [matchHistory, mmrHistory, playerInfo] = await Promise.all([
      // Keep coaching available even after quota limits.
      deadlockGet(`/v1/players/${accountId}/match-history`, { only_stored_history: true }),
      deadlockGet(`/v1/players/${accountId}/mmr-history`).catch(() => []),
      deadlockGet(`/v1/players/${accountId}`).catch(() => null),
    ]);

    const history    = Array.isArray(matchHistory) ? matchHistory.slice(0, matches) : [];
    const playerName = playerInfo?.account_name ?? playerInfo?.persona_name ?? null;

    if (history.length === 0) {
      coachStatsGrid.innerHTML = "";
      coachFindings.innerHTML  = `<div class="error-block">Aucun historique disponible pour ce joueur.</div>`;
      return;
    }

    if (playerName) {
      showPlayerInfo(coachPlayerInfoDisplay, coachPlayerInfoName, coachPlayerInfoId, accountId, playerName);
    }

    const { summary, trend, mmrTrend, heroStats, findings } = _analyzeMatchHistory(history, mmrHistory);

    const fmt      = (v, d = 2) => (v != null ? (+v).toFixed(d) : "-");
    const fmtDelta = (v, d = 1) => {
      if (v == null) return { text: "-", cls: "" };
      return { text: `${+v > 0 ? "+" : ""}${(+v).toFixed(d)}%`, cls: +v > 0 ? "pos" : +v < 0 ? "neg" : "" };
    };
    const mmrDelta = mmrTrend.deltaRank != null
      ? { text: `${mmrTrend.deltaRank > 0 ? "+" : ""}${mmrTrend.deltaRank}`, cls: mmrTrend.deltaRank > 0 ? "pos" : mmrTrend.deltaRank < 0 ? "neg" : "" }
      : { text: "-", cls: "" };

    const topHeroId = heroStats.topHero?.heroId;
    const topHero   = topHeroId ? heroesMap[topHeroId] : null;
    const topHeroDisplay = topHero?.images?.icon_image_small
      ? `<div class="hero-list"><img src="${topHero.images.icon_image_small}" alt="${topHero.name}" title="${topHero.name}" class="hero-icon-sm" /> <span>${topHero.name}</span></div>`
      : (topHeroId ?? "-");

    const stats = [
      { label: "Matchs analyses",   value: summary.matchesAnalyzed ?? "-",  cls: "" },
      { label: "KDA moyen",         value: fmt(summary.kdaAvg),             cls: "" },
      { label: "Deces / 10 min",    value: fmt(summary.deathsPer10Avg, 1),  cls: "" },
      { label: "Farm / min (LH)",   value: fmt(summary.lhPerMinAvg, 1),     cls: "" },
      { label: "Or / min",          value: summary.netWorthPerMinAvg != null ? Math.round(summary.netWorthPerMinAvg) : "-", cls: "" },
      { label: "Delta KDA tendance",    value: fmtDelta(trend.kdaDeltaPct).text,    cls: fmtDelta(trend.kdaDeltaPct).cls },
      { label: "Delta Deces tendance",  value: fmtDelta(trend.deathsDeltaPct).text, cls: fmtDelta(trend.deathsDeltaPct).cls },
      { label: "Delta Rang MMR",        value: mmrDelta.text,                   cls: mmrDelta.cls },
      { label: "Heros uniques",     value: heroStats.uniqueHeroes ?? "-",   cls: "" },
      { label: "Top Heros",         value: topHeroDisplay,                  cls: "" },
      { label: "Part heros #1",     value: heroStats.topHeroSharePct != null ? `${Math.round(heroStats.topHeroSharePct)}%` : "-", cls: "" },
    ];

    coachStatsGrid.innerHTML = stats.map(s =>
      `<div class="stat-card">
        <div class="stat-label">${s.label}</div>
        <div class="stat-value ${s.cls}">${s.value}</div>
      </div>`
    ).join("");

    const findingsHtml = findings.map(f =>
      `<article class="finding sev-${f.severity}">
        <div class="finding-header">
          <span class="finding-title">${f.title}</span>
          <span class="sev-badge ${f.severity}">${f.severity}</span>
        </div>
        <div class="finding-body">
          <div class="finding-row"><strong>Pourquoi :</strong> ${f.why}</div>
          <div class="finding-row"><strong>Preuve :</strong> ${f.evidence}</div>
          <div class="finding-row"><strong>Action coach :</strong> ${f.action}</div>
        </div>
      </article>`
    ).join("");

    coachFindings.innerHTML = findingsHtml + `<div class="loading-row"><span class="spinner"></span> Analyse matchup par matchup...</div>`;

    const perMatchRecommendations = await buildPerMatchRecommendations(history, accountId);
    const recoHtml = renderPerMatchRecommendationsHtml(perMatchRecommendations);
    coachFindings.innerHTML = `
      ${findingsHtml}
      <article class="finding sev-low">
        <div class="finding-header">
          <span class="finding-title">Recommandations Build Par Match</span>
          <span class="sev-badge low">${perMatchRecommendations.length}</span>
        </div>
        <div class="finding-body">
          <div class="finding-row"><strong>Objectif :</strong> proposer les meilleurs contres-items selon la team adverse de chaque match.</div>
        </div>
      </article>
      ${recoHtml}
    `;

  } catch (e) {
    coachStatsGrid.innerHTML = "";
    coachFindings.innerHTML  = `<div class="error-block">Erreur : ${e.message}</div>`;
  }
}

/* â”€â”€ Match Detail Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const matchModal  = document.getElementById("match-modal");
const modalBody   = document.getElementById("modal-body");
const modalClose  = document.getElementById("modal-close");

matchModal.addEventListener("click", (e) => {
  if (e.target === matchModal) closeMatchModal();
});
modalClose.addEventListener("click", closeMatchModal);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !matchModal.hidden) closeMatchModal();
});

function closeMatchModal() {
  matchModal.hidden = true;
  document.body.style.overflow = "";
}

/**
 * Ferme le modal et charge l'historique du joueur donne
 * dans l'onglet Historique.
 */
function switchToPlayerProfile(accountId) {
  closeMatchModal();
  const input = document.getElementById("accountId");
  if (input) input.value = String(accountId);
  const coachInput = document.getElementById("coachAccountId");
  if (coachInput) coachInput.value = String(accountId);
  if (homeSearchInput) homeSearchInput.value = String(accountId);
  document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("is-active"));
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("is-active"));
  document.querySelector('.nav-item[data-tab="history"]')?.classList.add("is-active");
  document.getElementById("tab-history")?.classList.add("is-active");
  loadHistory();
}

/**
 * Separe les joueurs en equipes Ambre / Saphir.
 * Replie sur un split 50/50 si les numeros d'equipe sont absents.
 */
function splitTeams(players) {
  let amber = players.filter(p => {
    const t = p.player_team ?? p.team ?? p.team_number;
    return t === 0 || t === "0" || t === "team0";
  });
  let sapphire = players.filter(p => {
    const t = p.player_team ?? p.team ?? p.team_number;
    return t === 1 || t === "1" || t === "team1" || t === 2 || t === "2";
  });
  if (!amber.length || !sapphire.length) {
    const half = Math.ceil(players.length / 2);
    amber    = players.slice(0, half);
    sapphire = players.slice(half);
  }
  return { amber, sapphire };
}

function renderItemIcon(itemId, small = false) {
  const item = itemsMap[itemId];
  const cls  = small ? "item-icon-sm" : "item-icon";
  const fbCls = small ? "item-id-fallback-sm" : "item-id-fallback";

  if (item) {
    const src  = item.shop_image_small || item.shop_image || item.image_webp || item.image || "";
    const name = item.name || String(itemId);
    if (src) {
      return `<div class="${cls}">
        <img src="${src}" alt="${name}" />
        ${renderItemTooltip(item, small)}
      </div>`;
    }
    return `<div class="${fbCls}" title="${name}">${String(itemId).slice(-4)}</div>`;
  }
  return `<div class="${fbCls}">${String(itemId).slice(-4)}</div>`;
}

function renderBuild(itemIds, small = false) {
  if (!Array.isArray(itemIds) || !itemIds.length) {
    return small
      ? `<span class="no-build">Aucun item</span>`
      : `<span style="font-size:12px;color:var(--muted);font-style:italic;">Aucun item</span>`;
  }
  // Extract item IDs - may be plain numbers or objects like { item_id: ... }
  const ids = itemIds
    .map(i => (typeof i === "object" ? (i.item_id ?? i.id ?? i.ability_id ?? i.upgrade_id) : i))
    .filter(v => v != null);
  const stripClass = small ? "player-build" : "build-strip";
  return `<div class="${stripClass}">${ids.map(id => renderItemIcon(id, small)).join("")}</div>`;
}

/* â”€â”€ Match Modal Tab System â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function switchMatchTab(btn, matchData) {
  document.querySelectorAll(".match-tab-btn").forEach(b => b.classList.remove("is-active"));
  btn.classList.add("is-active");
  const tabName = btn.dataset.matchTab;
  renderMatchTab(tabName, matchData);
}

function renderMatchTab(tabName, data) {
  let html = "";

  if (tabName === "overview")       html = renderOverviewTab(data);
  else if (tabName === "coaching")  html = renderCoachingTab(data);
  else if (tabName === "economy")   html = renderEconomyTab(data);
  else if (tabName === "damage")    html = renderDamageTab(data);
  else if (tabName === "items")     html = renderItemsTab(data);
  else if (tabName === "timeline")  html = renderTimelineTab(data);

  modalBody.innerHTML = html;

  // Delegation d'evenements pour les boutons de navigation profil
  modalBody.querySelectorAll(".player-link[data-profile-id]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = Number(btn.dataset.profileId);
      if (id) switchToPlayerProfile(id);
    });
  });

  // Animation des barres du scoreboard (0 -> valeur cible)
  if (tabName === "timeline") {
    requestAnimationFrame(() => {
      modalBody.querySelectorAll(".scoreboard-bar-fill").forEach(bar => {
        const target = bar.style.width;
        bar.style.width = "0";
        requestAnimationFrame(() => { bar.style.width = target; });
      });
    });
  }
}

function renderCoachingTab(data) {
  const { myId, myPlayer, matchInfo } = data;
  const recommendation = buildCounterRecommendations(matchInfo, myId);

  if (!recommendation) {
    return `<div class="error-block">Impossible de générer un coaching sur ce match (données insuffisantes).</div>`;
  }

  const myItemsRaw = Array.isArray(myPlayer?.items) ? myPlayer.items : [];
  const myItemIds = new Set(myItemsRaw
    .map((entry) => (typeof entry === "object" ? (entry.item_id ?? entry.id) : entry))
    .filter((id) => id != null));

  const players = Array.isArray(matchInfo?.players) ? matchInfo.players : [];
  const myTeam = myPlayer.team ?? myPlayer.player_team ?? myPlayer.team_number;
  const enemyPlayers = players.filter((p) => (p.team ?? p.player_team ?? p.team_number) !== myTeam);
  const enemyPills = enemyPlayers.map((enemy) => {
    const hero = heroesMap[enemy.hero_id];
    const heroIcon = hero?.images?.icon_image_small
      ? `<img class="coach-hero-pill-icon" src="${hero.images.icon_image_small}" alt="${escapeHtml(hero.name || "Hero")}" />`
      : `<span class="coach-hero-pill-icon fallback"></span>`;
    const name = escapeHtml(resolvePlayerPseudo(enemy));
    const heroName = escapeHtml(hero?.name || `Hero #${enemy.hero_id}`);
    return `<span class="coach-hero-pill">${heroIcon}<span class="coach-hero-pill-text">${name}<small>${heroName}</small></span></span>`;
  }).join("");

  const recRows = recommendation.recommendations.map((rec) => {
    const alreadyOwned = rec.itemId != null && myItemIds.has(rec.itemId);
    const holders = Array.isArray(rec.threatHolders) ? rec.threatHolders : [];
    const details = Array.isArray(rec.threatDetails) ? rec.threatDetails : [];
    const startedAt = details.find((d) => d.timeS != null)?.timeS ?? null;
    const groupedSourcesHtml = renderCounterSourcesGroupedByPlayer(details.slice(0, 18));
    return `
      <article class="finding ${alreadyOwned ? "sev-low" : "sev-medium"} coach-reco-card">
        <div class="finding-header">
          <span class="finding-title">${renderRecommendationItemTitle(rec)}</span>
          <span class="sev-badge ${alreadyOwned ? "low" : "medium"}">${alreadyOwned ? "deja pris" : "recommande"}</span>
        </div>
        <div class="finding-body">
          <div class="finding-row"><strong>Pourquoi :</strong> ${escapeHtml(rec.reason)}</div>
          ${holders.length ? `<div class="finding-row"><strong>Qui vous counter :</strong> ${holders.map((name) => escapeHtml(name)).join(", ")}</div>` : ""}
          ${details.length ? `<div class="finding-row"><strong>Grace a :</strong></div>${groupedSourcesHtml}` : ""}
          ${startedAt != null ? `<div class="finding-row"><strong>Debut du counter :</strong> <span class="counter-start-badge">${formatCounterTimeLabel(startedAt)}</span></div>` : ""}
        </div>
      </article>
    `;
  }).join("");

  return `
    <div class="coach-tab-wrap">
      <div class="section-label">Coaching Specifique Au Match</div>
      <div class="finding sev-low coach-match-summary">
        <div class="finding-body">
          <div class="coach-summary-grid">
            <div class="coach-summary-metric"><span>Match</span><strong>#${recommendation.matchId}</strong></div>
            <div class="coach-summary-metric"><span>Votre KDA</span><strong>${recommendation.myKda}</strong></div>
            <div class="coach-summary-metric"><span>Objectif</span><strong>Counter build reactif</strong></div>
          </div>
          <div class="finding-row"><strong>Adversaires :</strong> ${recommendation.enemyHeroes.map((h) => escapeHtml(h)).join(", ")}</div>
          ${enemyPills ? `<div class="coach-hero-pill-list">${enemyPills}</div>` : ""}
        </div>
      </div>
      ${recRows}
    </div>
  `;
}

function renderOverviewTab(data) {
  const { myId, myPlayer, players, heroesMap } = data;
  let html = "";

  /* â”€â”€ My performance â”€â”€ */
  if (myPlayer != null) {
    const mHero = heroesMap[myPlayer.hero_id];
    const lastTimeline = Array.isArray(myPlayer.stats) && myPlayer.stats.length
      ? myPlayer.stats[myPlayer.stats.length - 1]
      : null;
    const combat = getPlayerCombatMetrics(myPlayer);
    const mk  = myPlayer.kills    ?? myPlayer.player_kills   ?? 0;
    const md  = myPlayer.deaths   ?? myPlayer.player_deaths  ?? 0;
    const ma  = myPlayer.assists  ?? myPlayer.player_assists ?? 0;
    const mnw = myPlayer.net_worth ?? myPlayer.player_net_worth ?? null;
    const mlh = myPlayer.last_hits ?? myPlayer.cs ?? 0;
    const mdn = myPlayer.denies ?? 0;
    const mhd = combat.heroDamage;
    const mhl = combat.healing;
    const mdc = Number(myPlayer.death_cost ?? lastTimeline?.gold_death_loss ?? 0) || 0;
    const mItems = myPlayer.items ?? myPlayer.item_data ?? [];

    const kdaNum   = md > 0 ? (mk + ma) / md : Infinity;
    const kdaRatio = isFinite(kdaNum) ? kdaNum.toFixed(2) : "INF";
    const kdaColor = kdaNum >= 3 ? "pos" : kdaNum < 1.5 ? "neg" : "";

    const heroPortrait =
      mHero?.images?.top_bar_vertical_image ||
      mHero?.images?.top_bar_vertical_image_webp ||
      mHero?.images?.icon_hero_card ||
      mHero?.images?.icon_hero_card_webp ||
      mHero?.images?.icon_image_small ||
      mHero?.images?.icon_image_small_webp ||
      "";

    const heroImgTag = heroPortrait
      ? `<img src="${heroPortrait}" alt="${mHero?.name ?? "Hero"}" class="ohc-hero-img" />`
      : `<div class="ohc-hero-img-placeholder"></div>`;

    const dcStr   = mdc > 0 ? (mdc / 1000).toFixed(1) + "k" : "-";
    const dcClass = mdc > 0 ? "neg" : "";

    html += `
      <div>
        <div class="section-label">Votre Performance</div>
        <div class="overview-hero-card">

          <!-- Hero identity banner -->
          <div class="ohc-hero">
            ${heroImgTag}
            <div class="ohc-hero-info">
              <div class="ohc-hero-name">${mHero?.name ?? `Hero #${myPlayer.hero_id}`}</div>
              <div class="ohc-kda-row">
                <span class="ohc-kda-scores ${kdaClass(mk, md, ma)}">${mk}&thinsp;/&thinsp;${md}&thinsp;/&thinsp;${ma}</span>
                <span class="ohc-kda-badge ${kdaColor}">KDA&nbsp;${kdaRatio}</span>
              </div>
              ${mnw != null ? `<div class="ohc-nw">$ ${mnw.toLocaleString("fr-FR")}</div>` : ""}
            </div>
          </div>

          <!-- Stat pillars -->
          <div class="ohc-stats-row">
            <div class="ohc-stat">
              <span class="ohc-stat-v">${mlh}</span>
              <span class="ohc-stat-l">Last Hits</span>
            </div>
            <div class="ohc-stat">
              <span class="ohc-stat-v">${mdn}</span>
              <span class="ohc-stat-l">Denies</span>
            </div>
            <div class="ohc-stat">
              <span class="ohc-stat-v">${(mhd / 1000).toFixed(1)}k</span>
              <span class="ohc-stat-l">Hero Dmg</span>
            </div>
            <div class="ohc-stat ${mhl > 0 ? "pos" : ""}">
              <span class="ohc-stat-v">${(mhl / 1000).toFixed(1)}k</span>
              <span class="ohc-stat-l">Healing</span>
            </div>
            <div class="ohc-stat ${dcClass}">
              <span class="ohc-stat-v">${dcStr}</span>
              <span class="ohc-stat-l">Death Loss</span>
            </div>
          </div>

          <!-- Final build -->
          <div class="ohc-build">
            <div class="ohc-build-label">Build Final</div>
            ${renderBuild(mItems, false)}
          </div>
        </div>
      </div>`;
  }

  /* â”€â”€ All players by team â”€â”€ */
  if (players.length) {
    const { amber, sapphire } = splitTeams(players);

    const renderTeam = (teamPlayers) =>
      teamPlayers.map(p => {
        const isMe   = Number(p.account_id) === myId;
        const k      = p.kills   ?? p.player_kills   ?? 0;
        const d      = p.deaths  ?? p.player_deaths  ?? 0;
        const a      = p.assists ?? p.player_assists ?? 0;
        const nw     = p.net_worth ?? p.player_net_worth ?? null;
        const hero   = heroesMap[p.hero_id];
        const heroImg = hero?.images?.icon_image_small
          ? `<img src="${hero.images.icon_image_small}" alt="${hero.name}" />`
          : `<div style="width:28px;height:28px;background:var(--card-alt);border-radius:4px;flex-shrink:0;"></div>`;
        const items  = p.items ?? p.item_data ?? [];
        const pseudo = resolvePlayerPseudo(p);

        return `
          <div class="player-row${isMe ? " is-me" : ""}">
            <div class="player-row-top">
              ${heroImg}
              <button class="player-name player-link" data-profile-id="${p.account_id}" title="Voir profil">${pseudo}</button>
              <span class="player-kda ${kdaClass(k, d, a)}">${k}/${d}/${a}</span>
              ${nw != null ? `<span class="player-nw">$ ${(nw / 1000).toFixed(1)}k</span>` : ""}
            </div>
            ${renderBuild(items, true)}
          </div>`;
      }).join("");

    html += `
      <div>
        <div class="section-label">Joueurs de la partie</div>
        <div class="teams-grid">
          <div class="team-block">
            <div class="team-header amber">Equipe Ambre</div>
            ${renderTeam(amber)}
          </div>
          <div class="team-block">
            <div class="team-header sapphire">Equipe Saphir</div>
            ${renderTeam(sapphire)}
          </div>
        </div>
      </div>`;
  } else {
    html += `<div class="error-block" style="color:var(--muted);">Aucune donnee joueur disponible pour ce match.<br><small>L'API peut ne pas avoir indexe ce match.</small></div>`;
  }

  return html;
}

function getPlayerCombatMetrics(player) {
  const last = Array.isArray(player?.stats) && player.stats.length
    ? player.stats[player.stats.length - 1]
    : null;

  const heroDamage = player?.hero_damage ?? player?.damage ?? last?.player_damage ?? 0;
  const healing = player?.healing_done ?? last?.player_healing ?? 0;
  const objectiveDamage = player?.objective_damage ?? last?.boss_damage ?? 0;
  const damageTaken = player?.damage_taken ?? last?.player_damage_taken ?? 0;
  const mitigated = player?.mitigated_damage ?? last?.damage_mitigated ?? last?.damage_absorbed ?? 0;

  return {
    heroDamage: Number(heroDamage) || 0,
    healing: Number(healing) || 0,
    objectiveDamage: Number(objectiveDamage) || 0,
    damageTaken: Number(damageTaken) || 0,
    mitigated: Number(mitigated) || 0,
  };
}

function getPlayerDeathLoss(player) {
  const last = Array.isArray(player?.stats) && player.stats.length
    ? player.stats[player.stats.length - 1]
    : null;
  return Number(player?.death_cost ?? last?.gold_death_loss ?? 0) || 0;
}

function renderEconomyTab(data) {
  const { players, myId, heroesMap } = data;

  if (!players.length) {
    return `<div class="error-block">Aucune donnee economique disponible.</div>`;
  }

  const { amber, sapphire } = splitTeams(players);

  const calcTeamStats = (teamPlayers) => ({
    netWorth:  teamPlayers.reduce((s, p) => s + (p.net_worth ?? p.player_net_worth ?? 0), 0),
    cs:        teamPlayers.reduce((s, p) => s + (p.last_hits ?? p.cs ?? 0), 0),
    deaths:    teamPlayers.reduce((s, p) => s + (p.deaths ?? p.player_deaths ?? 0), 0),
    deathLoss: teamPlayers.reduce((s, p) => s + getPlayerDeathLoss(p), 0),
  });

  const amberStats    = calcTeamStats(amber);
  const sapphireStats = calcTeamStats(sapphire);

  const renderComparison = (label, amberVal, sapphireVal) => {
    const format = (v) => v > 1000 ? (v / 1000).toFixed(1) + "k" : v.toLocaleString("fr-FR");
    const pct = amberVal + sapphireVal > 0 ? (amberVal / (amberVal + sapphireVal) * 100) : 50;
    return `
      <div style="margin-bottom:16px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:12px;">
          <span style="color:var(--gold);">${format(amberVal)}</span>
          <span style="color:var(--text);font-weight:500;text-transform:uppercase;letter-spacing:0.5px;">${label}</span>
          <span style="color:var(--sapphire);">${format(sapphireVal)}</span>
        </div>
        <div style="height:6px;background:var(--border);border-radius:3px;overflow:hidden;display:flex;">
          <div style="flex:${pct};background:var(--gold);"></div>
          <div style="flex:${100 - pct};background:var(--sapphire);opacity:0.7;"></div>
        </div>
      </div>`;
  };

  const renderPlayerRows = (teamPlayers, teamColor) =>
    teamPlayers.map(p => {
      const isMe = Number(p.account_id) === myId;
      const hero = heroesMap[p.hero_id];
      const heroImg = hero?.images?.icon_image_small
        ? `<img src="${hero.images.icon_image_small}" alt="${hero.name}" class="hero-icon-sm" style="vertical-align:middle;" />`
        : `<div style="width:24px;height:24px;background:var(--card-alt);border-radius:3px;display:inline-block;"></div>`;
      const pseudo    = resolvePlayerPseudo(p);
      const nw        = p.net_worth ?? p.player_net_worth ?? 0;
      const cs        = p.last_hits ?? p.cs ?? 0;
      const denies    = p.denies ?? 0;
      const deathLoss = getPlayerDeathLoss(p);
      return `<tr${isMe ? ' class="is-me-row"' : ""}>
        <td style="padding:7px 10px;width:32px;">${heroImg}</td>
        <td style="padding:7px 10px;">
          <button class="player-link" data-profile-id="${p.account_id}" style="color:${teamColor};">${pseudo}</button>
        </td>
        <td class="right" style="padding:7px 10px;">${nw.toLocaleString("fr-FR")}</td>
        <td class="center" style="padding:7px 10px;">${cs}</td>
        <td class="center" style="padding:7px 10px;">${denies}</td>
        <td class="right" style="padding:7px 10px;color:${deathLoss > 0 ? "var(--red)" : "var(--muted)"};">${deathLoss > 0 ? deathLoss.toLocaleString("fr-FR") : "-"}</td>
      </tr>`;
    }).join("");

  return `
    <div style="padding:16px 0;">
      <div class="section-label">Comparaison Economique</div>
      <div style="background:var(--card);padding:16px;border-radius:var(--radius);border:1px solid var(--border);margin-bottom:20px;">
        ${renderComparison("NET WORTH",  amberStats.netWorth,  sapphireStats.netWorth)}
        ${renderComparison("LAST HITS",  amberStats.cs,        sapphireStats.cs)}
        ${renderComparison("MORTS",      amberStats.deaths,    sapphireStats.deaths)}
        ${renderComparison("DEATH LOSS", amberStats.deathLoss, sapphireStats.deathLoss)}
      </div>
      <div class="section-label">Detail par Joueur</div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th style="padding:7px 10px;width:32px;"></th>
              <th style="padding:7px 10px;">Joueur</th>
              <th class="right" style="padding:7px 10px;">Net Worth</th>
              <th class="center" style="padding:7px 10px;">CS</th>
              <th class="center" style="padding:7px 10px;">Denies</th>
              <th class="right" style="padding:7px 10px;">Death Loss</th>
            </tr>
          </thead>
          <tbody>
            <tr><td colspan="6" style="padding:5px 10px;font-size:10px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:var(--gold);background:var(--gold-bg);">Equipe Ambre</td></tr>
            ${renderPlayerRows(amber, "var(--gold)")}
            <tr><td colspan="6" style="padding:5px 10px;font-size:10px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:var(--sapphire);background:var(--sapphire-bg);">Equipe Saphir</td></tr>
            ${renderPlayerRows(sapphire, "var(--sapphire)")}
          </tbody>
        </table>
      </div>
    </div>`;
}

function renderDamageTab(data) {
  const { players, myId, heroesMap } = data;

  if (!players.length) {
    return `<div class="error-block">Aucune donnee de degats disponible.</div>`;
  }

  const { amber, sapphire } = splitTeams(players);

  const calcTeamDamage = (teamPlayers) => ({
    heroDmg:   teamPlayers.reduce((s, p) => s + getPlayerCombatMetrics(p).heroDamage, 0),
    healing:   teamPlayers.reduce((s, p) => s + getPlayerCombatMetrics(p).healing, 0),
    objDmg:    teamPlayers.reduce((s, p) => s + getPlayerCombatMetrics(p).objectiveDamage, 0),
    dmgTaken:  teamPlayers.reduce((s, p) => s + getPlayerCombatMetrics(p).damageTaken, 0),
    mitigated: teamPlayers.reduce((s, p) => s + getPlayerCombatMetrics(p).mitigated, 0),
  });

  const amberDmg    = calcTeamDamage(amber);
  const sapphireDmg = calcTeamDamage(sapphire);

  const renderDmgComparison = (label, amberVal, sapphireVal) => {
    const fmt = (v) => v >= 1000 ? (v / 1000).toFixed(1) + "k" : String(v);
    const pct = amberVal + sapphireVal > 0 ? (amberVal / (amberVal + sapphireVal) * 100) : 50;
    return `
      <div style="margin-bottom:16px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:12px;">
          <span style="color:var(--gold);">${fmt(amberVal)}</span>
          <span style="color:var(--text);font-weight:500;text-transform:uppercase;letter-spacing:0.5px;">${label}</span>
          <span style="color:var(--sapphire);">${fmt(sapphireVal)}</span>
        </div>
        <div style="height:6px;background:var(--border);border-radius:3px;overflow:hidden;display:flex;">
          <div style="flex:${pct};background:var(--orange);"></div>
          <div style="flex:${100 - pct};background:var(--sapphire);opacity:0.7;"></div>
        </div>
      </div>`;
  };

  const renderPlayerRows = (teamPlayers, teamColor) =>
    teamPlayers.map(p => {
      const isMe = Number(p.account_id) === myId;
      const hero = heroesMap[p.hero_id];
      const heroImg = hero?.images?.icon_image_small
        ? `<img src="${hero.images.icon_image_small}" alt="${hero.name}" class="hero-icon-sm" style="vertical-align:middle;" />`
        : `<div style="width:24px;height:24px;background:var(--card-alt);border-radius:3px;display:inline-block;"></div>`;
      const pseudo = resolvePlayerPseudo(p);
      const metrics = getPlayerCombatMetrics(p);
      const hd = metrics.heroDamage;
      const hl = metrics.healing;
      const od = metrics.objectiveDamage;
      const dt = metrics.damageTaken;
      const mi = metrics.mitigated;
      const fmt = (v) => v >= 1000 ? (v / 1000).toFixed(1) + "k" : String(v);
      return `<tr${isMe ? ' class="is-me-row"' : ""}>
        <td style="padding:7px 10px;width:32px;">${heroImg}</td>
        <td style="padding:7px 10px;">
          <button class="player-link" data-profile-id="${p.account_id}" style="color:${teamColor};">${pseudo}</button>
        </td>
        <td class="right" style="padding:7px 10px;">${fmt(hd)}</td>
        <td class="right" style="padding:7px 10px;color:var(--green);">${fmt(hl)}</td>
        <td class="right" style="padding:7px 10px;">${fmt(od)}</td>
        <td class="right" style="padding:7px 10px;">${fmt(dt)}</td>
        <td class="right" style="padding:7px 10px;color:var(--muted-2);">${fmt(mi)}</td>
      </tr>`;
    }).join("");

  return `
    <div style="padding:16px 0;">
      <div class="section-label">Analyse des Degats</div>
      <div style="background:var(--card);padding:16px;border-radius:var(--radius);border:1px solid var(--border);margin-bottom:20px;">
        ${renderDmgComparison("HERO DAMAGE",   amberDmg.heroDmg,  sapphireDmg.heroDmg)}
        ${renderDmgComparison("HEALING",       amberDmg.healing,  sapphireDmg.healing)}
        ${renderDmgComparison("OBJ DAMAGE",    amberDmg.objDmg,   sapphireDmg.objDmg)}
        ${renderDmgComparison("DAMAGE TAKEN",  amberDmg.dmgTaken, sapphireDmg.dmgTaken)}
        ${renderDmgComparison("MITIGATED",     amberDmg.mitigated,sapphireDmg.mitigated)}
      </div>
      <div class="section-label">Detail par Joueur</div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th style="padding:7px 10px;width:32px;"></th>
              <th style="padding:7px 10px;">Joueur</th>
              <th class="right" style="padding:7px 10px;">Hero Dmg</th>
              <th class="right" style="padding:7px 10px;">Healing</th>
              <th class="right" style="padding:7px 10px;">Obj Dmg</th>
              <th class="right" style="padding:7px 10px;">Taken</th>
              <th class="right" style="padding:7px 10px;">Mitigated</th>
            </tr>
          </thead>
          <tbody>
            <tr><td colspan="7" style="padding:5px 10px;font-size:10px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:var(--gold);background:var(--gold-bg);">Equipe Ambre</td></tr>
            ${renderPlayerRows(amber, "var(--gold)")}
            <tr><td colspan="7" style="padding:5px 10px;font-size:10px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:var(--sapphire);background:var(--sapphire-bg);">Equipe Saphir</td></tr>
            ${renderPlayerRows(sapphire, "var(--sapphire)")}
          </tbody>
        </table>
      </div>
    </div>`;
}

/* â”€â”€ Item Timeline helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const ITL_TIER_ROMAN  = ["", "I", "II", "III", "IV"];
const ITL_TIER_COLORS = { 1: "#9e9e9e", 2: "#4caf50", 3: "#60a8f0", 4: "#c97bff" };

function extractItemsWithTime(rawItems) {
  return rawItems
    .map(i => {
      if (typeof i === "object" && i !== null) {
        const id    = i.item_id ?? i.id ?? i.ability_id ?? i.upgrade_id;
        const timeS = i.game_time_s ?? i.time_s ?? i.purchased_at ?? null;
        return { id, timeS };
      }
      return { id: i, timeS: null };
    })
    .filter(i => i.id != null);
}

function renderItemTile(id) {
  const item = itemsMap[id];
  if (!item) {
    return `<div class="itl-item"><div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:8px;color:var(--muted);">${String(id).slice(-4)}</div></div>`;
  }
  const src  = item.shop_image_small ?? item.shop_image ?? item.image_webp ?? item.image ?? "";
  const name = item.name ?? String(id);
  const tier = item.tier ?? item.item_tier ?? null;
  const badge = (tier && ITL_TIER_ROMAN[tier])
    ? `<div class="itl-tier-badge" style="color:${ITL_TIER_COLORS[tier] ?? "#fff"};">${ITL_TIER_ROMAN[tier]}</div>`
    : "";
  const inner = src
    ? `<img src="${src}" alt="${name}" title="${name}" />${badge}`
    : `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:8px;color:var(--muted);">${String(id).slice(-4)}</div>`;
  return `<div class="itl-item">${inner}${renderItemTooltip(item, true)}</div>`;
}

function buildItemTimeline(rawItems, player, heroData) {
  // â”€â”€ Items â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const itemEntries = extractItemsWithTime(rawItems).map(i => ({ kind: "item", ...i }));

  // â”€â”€ Ability upgrades â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const rawAbl = player?.ability_upgrades ?? player?.abilities_upgrades
    ?? player?.hero_ability_upgrades ?? player?.stat_ability_upgrades ?? null;

  const ablEntries = [];
  if (rawAbl?.length) {
    const heroAbilities = heroData?.abilities ?? [];
    const abilityInfo   = new Map(heroAbilities.map(a => [a.id, a]));
    const ablCount      = {};           // tracks upgrade level per ability
    for (const u of rawAbl) {
      const ablId = typeof u === "object" ? (u.ability_id ?? u.id ?? null) : u;
      const timeS = typeof u === "object" ? (u.game_time_s ?? u.time_s ?? null) : null;
      if (!ablId) continue;
      ablCount[ablId] = (ablCount[ablId] ?? 0) + 1;
      ablEntries.push({
        kind:      "ability",
        id:        ablId,
        timeS,
        level:     ablCount[ablId],   // 1 = unlock, 2+ = upgrade
        info:      abilityInfo.get(ablId) ?? null,
      });
    }
  }

  const all = [...itemEntries, ...ablEntries];
  if (!all.length) return `<span class="no-build" style="display:block;padding:4px 0;">Aucun item</span>`;

  // Sort chronologically; entries without timestamps go at the end
  all.sort((a, b) => {
    if (a.timeS == null && b.timeS == null) return 0;
    if (a.timeS == null) return 1;
    if (b.timeS == null) return -1;
    return a.timeS - b.timeS;
  });

  const html = all.map(entry => {
    const min      = entry.timeS != null ? Math.floor(entry.timeS / 60) : null;
    const timeLbl  = min != null ? `<div class="itl-time">${min}m</div>` : "";

    if (entry.kind === "item") {
      return `<div class="itl-group">${renderItemTile(entry.id)}${timeLbl}</div>`;
    }

    // Ability tile
    const isUnlock = entry.level === 1;
    const abl      = entry.info;
    const img      = abl?.image
      ? `<img src="${abl.image}" alt="${abl.name ?? ""}" />`
      : `<div class="itl-abl-placeholder"></div>`;
    const badge    = isUnlock
      ? `<div class="itl-abl-badge unlock">*</div>`
      : `<div class="itl-abl-badge">${entry.level - 1}</div>`;
    return `<div class="itl-group"><div class="itl-ability">${img}${badge}</div>${timeLbl}</div>`;
  }).join("");

  return `<div class="itl-wrap"><div class="itl-row">${html}</div></div>`;
}

/* â”€â”€ Ability Build helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function buildAbilityBuild(player, heroData) {
  // Try multiple field names used by the Deadlock API
  const raw = player.ability_upgrades ?? player.abilities_upgrades
    ?? player.hero_ability_upgrades ?? player.stat_ability_upgrades ?? null;
  if (!raw || !raw.length) return "";

  // Normalise: each entry can be a plain id or { ability_id, game_time_s, ... }
  const sequence = raw.map((u, idx) => ({
    abilityId: typeof u === "object" ? (u.ability_id ?? u.id ?? null) : u,
    pos: idx,  // 0-indexed position in upgrade order
  })).filter(u => u.abilityId != null);

  if (!sequence.length) return "";

  // Ability info from hero data
  const heroAbilities = heroData?.abilities ?? [];
  const abilityInfo   = new Map(heroAbilities.map(a => [a.id, a]));

  // Group upgrades by ability
  const byAbility = new Map();
  for (const u of sequence) {
    if (!byAbility.has(u.abilityId)) byAbility.set(u.abilityId, []);
    byAbility.get(u.abilityId).push(u.pos);
  }

  // Ability display order: by first upgrade position
  const abilityOrder = [...byAbility.keys()].sort((a, b) => byAbility.get(a)[0] - byAbility.get(b)[0]);

  const totalCols = sequence.length;

  // PRIORITY row
  const priorityHtml = abilityOrder.slice(0, 4).map((ablId, i) => {
    const abl  = abilityInfo.get(ablId);
    const img  = abl?.image
      ? `<img src="${abl.image}" alt="${abl.name ?? ""}" />`
      : `<div class="abl-info-placeholder"></div>`;
    const name = abl?.name ?? `Ability ${ablId}`;
    const sep  = i > 0 ? `<span class="abl-priority-sep">></span>` : "";
    return `${sep}<div class="abl-priority-item">${img}<span style="max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${name}</span></div>`;
  }).join("");

  // Grid rows: one per ability
  const rowsHtml = abilityOrder.map(ablId => {
    const abl        = abilityInfo.get(ablId);
    const positions  = new Set(byAbility.get(ablId));
    const firstPos   = byAbility.get(ablId)[0];
    let upgradeCount = 0;

    const img = abl?.image
      ? `<img src="${abl.image}" alt="${abl.name ?? ""}" />`
      : `<div class="abl-info-placeholder"></div>`;
    const name = abl?.name ?? `#${ablId}`;
    const totalUpgrades = byAbility.get(ablId).length;

    const cells = Array.from({ length: totalCols }, (_, col) => {
      if (col === firstPos) {
        return `<div class="abl-cell is-unlock">*</div>`;
      }
      if (positions.has(col)) {
        upgradeCount++;
        const isMax = upgradeCount === totalUpgrades - 1; // last upgrade
        return `<div class="abl-cell ${isMax ? "is-maxed" : "is-upgrade"}">${upgradeCount}</div>`;
      }
      return `<div class="abl-cell is-empty"></div>`;
    }).join("");

    return `
      <div class="abl-row">
        <div class="abl-info">${img}<span class="abl-info-name">${name}</span></div>
        <div class="abl-cells">${cells}</div>
      </div>`;
  }).join("");

  return `
    <div class="abl-outer-wrap">
      <div class="abl-inner">
        <div class="abl-priority-row">
          <span class="abl-priority-label">PRIORITE</span>
          ${priorityHtml}
        </div>
        <div class="abl-rows">${rowsHtml}</div>
      </div>
    </div>`;
}

/* â”€â”€ Items Tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function renderItemsTab(data) {
  const { players, myId, heroesMap } = data;

  if (!players.length) {
    return `<div class="error-block">Aucune donnee d'items disponible.</div>`;
  }

  const { amber, sapphire } = splitTeams(players);

  const renderPlayerCard = (p, teamColor) => {
    const isMe   = Number(p.account_id) === myId;
    const hero   = heroesMap[p.hero_id];
    const heroImg = hero?.images?.icon_image_small
      ? `<img src="${hero.images.icon_image_small}" alt="${hero.name}" class="hero-icon-sm" />`
      : `<div style="width:24px;height:24px;background:var(--card-alt);border-radius:3px;flex-shrink:0;"></div>`;
    const pseudo = resolvePlayerPseudo(p);
    const k      = p.kills   ?? p.player_kills   ?? 0;
    const d      = p.deaths  ?? p.player_deaths  ?? 0;
    const a      = p.assists ?? p.player_assists ?? 0;
    const nw     = p.net_worth ?? p.player_net_worth ?? null;
    const items  = p.items ?? p.item_data ?? [];

    return `
      <div class="items-player-card${isMe ? " is-me-card" : ""}">
        <div class="items-player-header">
          ${heroImg}
          <button class="player-link" data-profile-id="${p.account_id}" style="color:${teamColor};">${pseudo}</button>
          <span class="player-kda ${kdaClass(k, d, a)}" style="margin-left:auto;font-size:11px;">${k}/${d}/${a}</span>
          ${nw != null ? `<span class="player-nw">$ ${(nw / 1000).toFixed(1)}k</span>` : ""}
        </div>

        <div class="section-block">
          <div class="section-block-head"><span>Build &amp; Competences</span></div>
          <div class="section-block-body">${buildItemTimeline(items, p, hero)}</div>
        </div>
      </div>`;
  };

  const renderTeam = (teamPlayers, teamColor) => teamPlayers.map(p => renderPlayerCard(p, teamColor)).join("");

  return `
    <div style="padding:16px 0;">
      <div class="section-label">Equipe Ambre</div>
      <div style="margin-bottom:20px;">${renderTeam(amber, "var(--gold)")}</div>
      <div class="section-label">Equipe Saphir</div>
      <div>${renderTeam(sapphire, "var(--sapphire)")}</div>
    </div>`;
}

function renderTimelineTab(data) {
  const { players, myId, heroesMap } = data;

  if (!players.length) {
    return `<div class="error-block">Aucune donnee disponible.</div>`;
  }

  const { amber, sapphire } = splitTeams(players);

  const totalDmg = players.reduce((s, p) => s + getPlayerCombatMetrics(p).heroDamage, 0);
  const totalNW  = players.reduce((s, p) => s + (p.net_worth ?? p.player_net_worth ?? 0), 0);

  const renderContribRows = (teamPlayers, teamColor) =>
    teamPlayers.map(p => {
      const isMe   = Number(p.account_id) === myId;
      const hero   = heroesMap[p.hero_id];
      const heroImg = hero?.images?.icon_image_small
        ? `<img src="${hero.images.icon_image_small}" alt="${hero.name}" class="hero-icon-sm" />`
        : `<div style="width:24px;height:24px;background:var(--card-alt);border-radius:3px;flex-shrink:0;"></div>`;
      const pseudo  = resolvePlayerPseudo(p);
      const dmg     = getPlayerCombatMetrics(p).heroDamage;
      const nw      = p.net_worth ?? p.player_net_worth ?? 0;
      const dmgPct  = totalDmg > 0 ? (dmg / totalDmg * 100) : 0;
      const nwPct   = totalNW  > 0 ? (nw  / totalNW  * 100) : 0;

      return `
        <div class="scoreboard-row${isMe ? " is-me-row" : ""}">
          <div class="scoreboard-player">
            ${heroImg}
            <button class="player-link" data-profile-id="${p.account_id}" style="color:${teamColor};">${pseudo}</button>
          </div>
          <div class="scoreboard-bars">
            <div class="scoreboard-bar-row">
              <span class="scoreboard-bar-label">DMG</span>
              <div class="scoreboard-bar-track">
                <div class="scoreboard-bar-fill" style="width:${dmgPct.toFixed(1)}%;background:${teamColor};"></div>
              </div>
              <span class="scoreboard-bar-value">${(dmg / 1000).toFixed(1)}k <span style="color:var(--muted);font-size:10px;">(${dmgPct.toFixed(1)}%)</span></span>
            </div>
            <div class="scoreboard-bar-row">
              <span class="scoreboard-bar-label">NW</span>
              <div class="scoreboard-bar-track">
                <div class="scoreboard-bar-fill" style="width:${nwPct.toFixed(1)}%;background:${teamColor};opacity:0.55;"></div>
              </div>
              <span class="scoreboard-bar-value">${(nw / 1000).toFixed(1)}k <span style="color:var(--muted);font-size:10px;">(${nwPct.toFixed(1)}%)</span></span>
            </div>
          </div>
        </div>`;
    }).join("");

  return `
    <div style="padding:16px 0;">
      <div class="section-label">Contribution a la partie</div>
      <p style="font-size:11px;color:var(--muted);margin-bottom:16px;">% du total (DMG hero + Net Worth) sur l'ensemble des joueurs</p>
      <div class="scoreboard-team-block">
        <div class="team-header amber">Equipe Ambre</div>
        ${renderContribRows(amber, "var(--gold)")}
      </div>
      <div class="scoreboard-team-block">
        <div class="team-header sapphire">Equipe Saphir</div>
        ${renderContribRows(sapphire, "var(--sapphire)")}
      </div>
    </div>`;
}

async function openMatchModal(matchId, myAccountId) {
  // Show modal with spinner
  document.getElementById("modal-match-id").textContent = `Match #${matchId}`;
  document.getElementById("modal-meta").textContent     = "";
  document.getElementById("modal-outcome").textContent  = "";
  document.getElementById("modal-outcome").className    = "modal-outcome";
  modalBody.innerHTML = `<div class="loading-row"><span class="spinner"></span> Chargement du match...</div>`;
  matchModal.hidden = false;
  document.body.style.overflow = "hidden";

  try {
    const data = await apiGet(`/match/${matchId}`);

    // Normalise response - the metadata endpoint nests under match_info
    const matchInfo = data.match_info ?? data;
    const players   = matchInfo.players ?? matchInfo.player_info ?? [];
    const durationS = matchInfo.duration_s ?? matchInfo.match_duration_s ?? 0;
    const startTime = matchInfo.start_time ?? 0;
    const outcome   = matchInfo.winning_team ?? matchInfo.match_outcome ?? null;

    // Duration formatting
    const mins = Math.floor(durationS / 60);
    const secs = String(durationS % 60).padStart(2, "0");
    document.getElementById("modal-meta").textContent =
      `${dateFromUnix(startTime)} - ${mins}:${secs}`;

    // Find my player data
    await hydratePlayerNames(players);

    const myId     = Number(myAccountId);
    const myPlayer = players.find(p => Number(p.account_id) === myId);

    // Determine my outcome
    if (myPlayer != null && outcome != null) {
      const myTeam  = myPlayer.team ?? myPlayer.player_team ?? myPlayer.team_number ?? -1;
      const iWon    = Number(outcome) === Number(myTeam);
      const outcomeEl = document.getElementById("modal-outcome");
      outcomeEl.textContent = iWon ? "Victoire" : "Défaite";
      outcomeEl.className   = `modal-outcome ${iWon ? "win" : "loss"}`;
    }

    // Store match data for tab switching
    const matchData = {
      matchId, myId, myPlayer, players, matchInfo,
      durationS, mins, secs, heroesMap, itemsMap, kdaClass
    };

    // Setup tab buttons
    document.querySelectorAll(".match-tab-btn").forEach(btn => {
      btn.classList.remove("is-active");
      btn.onclick = () => switchMatchTab(btn, matchData);
    });
    document.querySelector(".match-tab-btn[data-match-tab='overview']").classList.add("is-active");

    // Show Overview tab by default
    renderMatchTab("overview", matchData);
  } catch (e) {
    modalBody.innerHTML = `<div class="error-block">Erreur : ${e.message}</div>`;
  }
}

/* â”€â”€ Init â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function init() {
  await Promise.all([initHeroes(), initItems(), initRanks()]);
  populateTierListRankOptions();
  if (buildsHeroFilter) {
    buildsHeroFilter.disabled = true;
    buildsHeroFilter.innerHTML = `<option value="">Choisir un hero</option>`;
  }
  if (buildsGrid) buildsGrid.innerHTML = `<div class="empty-row">Selectionnez un hero pour voir les builds.</div>`;
  setBuildsStatus("Chargement du catalogue de builds...");
  bindTooltipAutoPositioning();
  loadHealth();
  loadHomeInsights();
}

init();


