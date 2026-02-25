/* ── History tab ─────────────────────────────────────────── */

import { state, CONSTANTS } from './state.js';
import { apiGet, fetchMatchMetadata } from './api.js';
import {
  escapeHtml,
  historyLoadingBlock,
  parseAccountId,
  didPlayerWinMatch,
  formatRelativeTime,
  formatDurationLabel,
  kdaClass,
  pickBestSearchMatch,
  runWithConcurrency,
} from './utils.js';
import {
  renderRankChip,
  computeAverageMatchRank,
  getRankDivisionFromMmrEntry,
  getRankDivisionLabel,
  hydratePlayerMmr,
  getPlayerRankInfo,
} from './ranks.js';
import {
  resolvePlayerPseudo,
  hydratePlayerNames,
  showPlayerInfo,
  hidePlayerInfo,
  setHistoryAvatar,
} from './players.js';
import { extractFinalItemIds, renderItemIcon } from './items.js';

/* ── DOM refs ────────────────────────────────────────────── */

const historyBody             = document.getElementById("history-body");
const playerInfoDisplay       = document.getElementById("playerInfoDisplay");
const playerInfoName          = document.getElementById("playerInfoName");
const playerInfoId            = document.getElementById("playerInfoId");
const historyPlayerTitle      = document.getElementById("history-player-title");
const historyPlayerSub        = document.getElementById("history-player-sub");
const historyWr               = document.getElementById("history-wr");
const historyKda              = document.getElementById("history-kda");
const historyCount            = document.getElementById("history-count");
const historyRankName         = document.getElementById("history-rank-name");
const historyRankSub          = document.getElementById("history-rank-sub");
const historyRankIconWrap     = document.getElementById("history-rank-icon-wrap");
const history30dWr            = document.getElementById("history-30d-wr");
const history30dMeta          = document.getElementById("history-30d-meta");
const history30dHeroes        = document.getElementById("history-30d-heroes");
const history10000AvgDuration = document.getElementById("history-10000-avg-duration");
const history10000DurationRanks = document.getElementById("history-10000-duration-ranks");
const historyLoadMoreWrap     = document.getElementById("history-load-more-wrap");
const historyLoadMoreBtn      = document.getElementById("history-load-more");
const historyHeroFilter       = document.getElementById("history-hero-filter");

/* ── Internal helpers ────────────────────────────────────── */

function resetHistoryPagination() {
  state.historyAllMatchesCache = [];
  state.historyMatchesCache = [];
  state.historyRenderedCount = 0;
  state.historyRenderContext = { accountId: null, playerName: "Joueur", playerProfileUrl: "" };
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
    const hero = state.heroesMap[entry.heroId];
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

function setHistoryAverageDurationLastMatches(history = []) {
  if (!history10000AvgDuration) return;
  const latestMatches = Array.isArray(history) ? history.slice(0, CONSTANTS.HISTORY_AVG_DURATION_SAMPLE) : [];
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

function setHistoryAverageDurationByRank(history = [], mmrHistory = []) {
  if (!history10000DurationRanks) return;
  const latestMatches = Array.isArray(history) ? history.slice(0, CONSTANTS.HISTORY_AVG_DURATION_SAMPLE) : [];
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
      label: state.heroesMap[heroId]?.name || `Hero #${heroId}`,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "fr", { sensitivity: "base" }));

  historyHeroFilter.innerHTML = [
    `<option value="">All Heroes</option>`,
    ...options.map((opt) => `<option value="${opt.heroId}">${escapeHtml(opt.label)}</option>`),
  ].join("");
  historyHeroFilter.value = "";
  historyHeroFilter.disabled = options.length === 0;
}

export async function applyHistoryHeroFilter() {
  const selectedHeroId = Number(historyHeroFilter?.value || 0);
  state.historyMatchesCache = selectedHeroId
    ? state.historyAllMatchesCache.filter((m) => Number(m?.hero_id) === selectedHeroId)
    : [...state.historyAllMatchesCache];
  state.historyRenderedCount = 0;
  historyBody.innerHTML = "";

  if (!state.historyMatchesCache.length) {
    historyBody.innerHTML = `<div class="empty-row">Aucun match pour ce hero.</div>`;
    updateHistoryLoadMoreVisibility();
    return;
  }
  await loadMoreHistoryMatches();
}

function updateHistoryLoadMoreVisibility() {
  if (!historyLoadMoreWrap || !historyLoadMoreBtn) return;
  const hasMore = state.historyRenderedCount < state.historyMatchesCache.length;
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
  const myAccountId = state.historyRenderContext.accountId;
  const playerName = state.historyRenderContext.playerName;
  const playerProfileUrl = state.historyRenderContext.playerProfileUrl;
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

  const hero = state.heroesMap[match.hero_id];
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

/* ── Exported functions ──────────────────────────────────── */

export function setHistorySummary(history = [], playerName = null) {
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
  const kda = deaths > 0 ? ((kills + assists) / deaths).toFixed(2) : "8";
  if (historyWr) historyWr.textContent = `${wr}%`;
  if (historyKda) historyKda.textContent = `${kda}`;
  if (historyCount) historyCount.textContent = `${history.length}`;
}

export async function loadMoreHistoryMatches() {
  if (!state.historyMatchesCache.length || state.historyRenderedCount >= state.historyMatchesCache.length) {
    updateHistoryLoadMoreVisibility();
    return;
  }
  if (historyLoadMoreBtn) {
    historyLoadMoreBtn.disabled = true;
    historyLoadMoreBtn.textContent = "Chargement...";
  }
  try {
    const nextMatches = state.historyMatchesCache.slice(
      state.historyRenderedCount,
      state.historyRenderedCount + CONSTANTS.HISTORY_PAGE_SIZE
    );
    const metadataByMatchId = await hydrateHistoryPageMetadata(nextMatches);
    historyBody.insertAdjacentHTML(
      "beforeend",
      nextMatches.map((match) => renderHistoryCard(match, metadataByMatchId)).join("")
    );
    state.historyRenderedCount += nextMatches.length;
  } catch (e) {
    if (state.historyRenderedCount === 0) throw e;
    historyBody.insertAdjacentHTML("beforeend", `<div class="empty-row">Erreur de chargement: ${escapeHtml(e.message || "inconnue")}</div>`);
  } finally {
    if (historyLoadMoreBtn) {
      historyLoadMoreBtn.textContent = "Load more";
    }
    updateHistoryLoadMoreVisibility();
  }
}

export async function loadHistory() {
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
    state.historyRenderContext = {
      accountId,
      playerName: data.playerName || "Joueur",
      playerProfileUrl,
    };
    state.historyAllMatchesCache = history;
    populateHistoryHeroFilter(state.historyAllMatchesCache);
    await applyHistoryHeroFilter();
  } catch (e) {
    historyBody.innerHTML = `<div class="empty-row">Erreur : ${e.message}</div>`;
    resetHistoryPagination();
  }
}
