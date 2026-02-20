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
const historyPlayerTitle = document.getElementById("history-player-title");
const historyPlayerSub = document.getElementById("history-player-sub");
const historyWr = document.getElementById("history-wr");
const historyKda = document.getElementById("history-kda");
const historyCount = document.getElementById("history-count");

/* â”€â”€ Event Listeners â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
document.getElementById("btn-health").addEventListener("click", loadHealth);
document.getElementById("btn-leaderboard").addEventListener("click", loadLeaderboard);
document.getElementById("btn-history").addEventListener("click", loadHistory);
document.getElementById("btn-coach").addEventListener("click", loadCoachReport);
if (homeSearchBtn) homeSearchBtn.addEventListener("click", searchFromHome);
if (homeSearchInput) {
  homeSearchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") searchFromHome();
  });
}
leaderboardBody.addEventListener("click", (event) => {
  const target = event.target.closest(".player-link[data-profile-id]");
  if (!target || !leaderboardBody.contains(target)) return;
  const profileId = Number(target.dataset.profileId);
  if (profileId) switchToPlayerProfile(profileId);
});

/* â”€â”€ Utilities â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
let heroesMap = {};
let itemsMap  = {};
let ranksMap  = {};
const deadlockApiBase = "https://api.deadlock-api.com";
const matchMetadataCache = new Map();
const playerNameCache = new Map();
let itemsListCache = [];

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

async function fetchJsonOrThrow(url) {
  const res = await fetch(url);
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

async function deadlockGet(pathname, query = {}) {
  const url = `${deadlockApiBase}${pathname}${buildQuery(query)}`;
  return fetchJsonOrThrow(url);
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
    const history = Array.isArray(matchHistory) ? matchHistory.slice(0, 30) : [];
    const playerName =
      (Array.isArray(steamProfiles) && steamProfiles[0]?.personaname) ||
      history[0]?.username ||
      null;
    return { accountId, playerName, total: history.length, history };
  }

  if (pathname === "/player-info") {
    const accountId = Number(query.accountId);
    const profiles = await deadlockGet("/v1/players/steam", {
      account_ids: [accountId],
    });
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

function getLeaderboardProfileId(entry) {
  const direct = [
    entry?.account_id,
    entry?.player_account_id,
    entry?.steam_account_id,
    entry?.accountId,
  ];
  for (const candidate of direct) {
    const id = parseAccountId(candidate);
    if (id) return id;
  }
  const possible = Array.isArray(entry?.possible_account_ids) ? entry.possible_account_ids : [];
  for (const candidate of possible) {
    const id = parseAccountId(candidate);
    if (id) return id;
  }
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

async function searchFromHome() {
  const raw = (homeSearchInput?.value || "").trim().replace(/^#/, "");
  if (!raw) return;

  const accountId = parseAccountId(raw);
  if (accountId) {
    switchToPlayerProfile(accountId);
    return;
  }

  try {
    const results = await apiGet("/player-search", { searchQuery: raw });
    const best = pickBestSearchMatch(results, raw);
    const foundAccountId = parseAccountId(best?.account_id);
    if (!foundAccountId) {
      throw new Error(`Aucun joueur trouve pour "${raw}".`);
    }
    switchToPlayerProfile(foundAccountId);
  } catch (error) {
    const message = error?.message || "Recherche joueur impossible.";
    if (historyBody) {
      historyBody.innerHTML = `<tr><td colspan="5" class="empty-row">Erreur : ${escapeHtml(message)}</td></tr>`;
    }
  }
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

  if (rect.left < margin) tooltip.classList.add("edge-left");
  if (rect.right > window.innerWidth - margin) tooltip.classList.add("edge-right");
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

    apiStatus.className = `api-status ${ok ? "ok" : "err"}`;
    apiStatus.querySelector(".api-label").textContent = ok ? "API en ligne" : "API degradee";
    if (healthMeta) {
      healthMeta.textContent = `Derniere verification: ${new Date().toLocaleTimeString("fr-FR")}`;
    }
  } catch (e) {
    setHealthLight("clickhouse", false);
    setHealthLight("postgres", false);
    setHealthLight("redis", false);
    setHealthLight("global", false);

    apiStatus.className = "api-status err";
    apiStatus.querySelector(".api-label").textContent = "Injoignable";
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

    if (!entries.length) {
      leaderboardBody.innerHTML = `<tr><td colspan="4" class="empty-row">Aucune donnee disponible.</td></tr>`;
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
  } catch (e) {
    leaderboardBody.innerHTML = `<tr><td colspan="4" class="empty-row">Erreur : ${e.message}</td></tr>`;
  }
}

/* â”€â”€ History â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function loadHistory() {
  historyBody.innerHTML = spinnerRow(5);
  hidePlayerInfo(playerInfoDisplay);
  setHistorySummary([], null);
  const accountId = parseAccountId(document.getElementById("accountId").value);
  if (!accountId) {
    historyBody.innerHTML = `<tr><td colspan="5" class="empty-row">Account ID invalide.</td></tr>`;
    return;
  }
  try {
    // Use stored history to avoid Steam refetch quota (5 req/h).
    const data = await apiGet("/match-history", { accountId, onlyStored: true });
    const history = Array.isArray(data.history) ? data.history : [];
    showPlayerInfo(playerInfoDisplay, playerInfoName, playerInfoId, accountId, data.playerName);
    setHistorySummary(history, data.playerName || "Joueur");

    if (!history.length) {
      historyBody.innerHTML = `<tr><td colspan="5" class="empty-row">Aucune donnee disponible.</td></tr>`;
      return;
    }

    const myAccountId = accountId;

    historyBody.innerHTML = history
      .map((match) => {
        const k   = match.player_kills   ?? 0;
        const d   = match.player_deaths  ?? 0;
        const a   = match.player_assists ?? 0;
        const cls = kdaClass(k, d, a);
        const nw  = match.net_worth != null ? match.net_worth.toLocaleString("fr-FR") : "-";

        const hero = heroesMap[match.hero_id];
        const heroDisplay = hero && hero.images && hero.images.icon_image_small
          ? `<img src="${hero.images.icon_image_small}" alt="${hero.name}" title="${hero.name}" class="hero-icon" />`
          : match.hero_id;

        return `<tr class="clickable" data-match-id="${match.match_id}" data-account-id="${myAccountId}">
          <td>${match.match_id}</td>
          <td>${heroDisplay}</td>
          <td class="center"><span class="${cls}">${k} / ${d} / ${a}</span></td>
          <td class="right">${nw}</td>
          <td>${dateFromUnix(match.start_time)}</td>
        </tr>`;
      })
      .join("");

    // Attach click listeners to rows
    historyBody.querySelectorAll("tr.clickable").forEach((row) => {
      row.addEventListener("click", () => {
        openMatchModal(row.dataset.matchId, row.dataset.accountId);
      });
    });
  } catch (e) {
    historyBody.innerHTML = `<tr><td colspan="5" class="empty-row">Erreur : ${e.message}</td></tr>`;
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

function renderCounterSourceTag(detail) {
  const item = findItemByExactName(detail?.itemName);
  const icon = item?.shop_image_small || item?.shop_image || item?.image_webp || item?.image || "";
  const owner = escapeHtml(detail?.ownerName || "inconnu");
  const itemName = escapeHtml(detail?.itemName || "item");
  const timing = escapeHtml(formatCounterTimeLabel(detail?.timeS));
  return `
    <span class="counter-source-tag">
      ${icon ? `<img class="counter-source-icon" src="${icon}" alt="${itemName}" title="${itemName}" />` : ""}
      <span class="counter-source-owner">${owner}</span>
      <span class="counter-source-item">${itemName}</span>
      <span class="counter-source-time">${timing}</span>
    </span>
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
    const sourceTags = details.slice(0, 6).map((detail) => renderCounterSourceTag(detail)).join("");
    return `
      <article class="finding ${alreadyOwned ? "sev-low" : "sev-medium"} coach-reco-card">
        <div class="finding-header">
          <span class="finding-title">${renderRecommendationItemTitle(rec)}</span>
          <span class="sev-badge ${alreadyOwned ? "low" : "medium"}">${alreadyOwned ? "deja pris" : "recommande"}</span>
        </div>
        <div class="finding-body">
          <div class="finding-row"><strong>Pourquoi :</strong> ${escapeHtml(rec.reason)}</div>
          ${holders.length ? `<div class="finding-row"><strong>Qui vous counter :</strong> ${holders.map((name) => escapeHtml(name)).join(", ")}</div>` : ""}
          ${details.length ? `<div class="finding-row"><strong>Grace a :</strong></div><div class="counter-source-list">${sourceTags}</div>` : ""}
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
    const outcome   = matchInfo.match_outcome ?? null;

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
      const myTeam  = myPlayer.player_team ?? myPlayer.team_number ?? -1;
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
  bindTooltipAutoPositioning();
  loadHealth();
}

init();


