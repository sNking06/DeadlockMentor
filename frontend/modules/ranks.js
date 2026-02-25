/* ── Rank data, rendering, and MMR hydration ─────────────── */

import { state } from './state.js';
import { deadlockGet } from './api.js';
import { escapeHtml, normalizeMmrResults, parseAccountId } from './utils.js';

export function getRankImage(rankTier, subrank = null, size = "small") {
  const rank = state.ranksMap[rankTier];
  if (!rank?.images) return null;
  const key = Number.isInteger(subrank) && subrank >= 1
    ? `${size}_subrank${subrank}`
    : size;
  return rank.images[key] || rank.images[size] || null;
}

export function getRankDivisionFromMmrEntry(entry) {
  const division = Number(entry?.division || 0);
  if (Number.isInteger(division) && division > 0) return division;
  const rank = Number(entry?.rank || 0);
  if (!Number.isFinite(rank) || rank <= 0) return 0;
  return Math.max(0, Math.floor(rank / 10));
}

export function getRankDivisionLabel(division) {
  const rankData = state.ranksMap[division] || null;
  return rankData?.name || `Rank ${division}`;
}

export async function hydratePlayerMmr(accountIds = []) {
  const missing = Array.from(
    new Set(
      accountIds
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id) && id > 0 && !state.playerMmrCache.has(id))
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
        state.playerMmrCache.set(id, {
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

export function getPlayerRankInfo(accountId) {
  const id = Number(accountId);
  if (!Number.isInteger(id) || id <= 0) return null;
  const mmr = state.playerMmrCache.get(id);
  if (!mmr || mmr.division <= 0) return null;

  const division = mmr.division;
  const subrank = mmr.divisionTier >= 1 ? mmr.divisionTier : null;
  const rankData = state.ranksMap[division] || null;
  const rankName = rankData?.name || `Rank ${division}`;
  const rankImg = getRankImage(division, subrank, "small");
  return { division, subrank, rankName, rankImg, rank: mmr.rank };
}

export function renderRankChip(accountId, withLabel = false, compact = false) {
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

export function computeAverageMatchRank(players = []) {
  const ranks = players
    .map((p) => getPlayerRankInfo(p?.account_id)?.rank)
    .filter((v) => Number.isFinite(v) && v > 0);

  if (!ranks.length) return null;
  const avgRank = ranks.reduce((sum, v) => sum + v, 0) / ranks.length;
  const division = Math.max(0, Math.floor(avgRank / 10));
  const subrank = Math.max(1, Math.min(6, Math.round(avgRank - division * 10)));
  const rankData = state.ranksMap[division] || null;
  const rankName = rankData?.name || `Rank ${division}`;
  const rankImg = getRankImage(division, subrank, "small");
  return { avgRank, division, subrank, rankName, rankImg };
}

export function renderRankCell(entry) {
  const tier = Number(entry?.ranked_rank);
  const sub = Number(entry?.ranked_subrank);
  const rankData = state.ranksMap[tier];
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

export function populateRankBracketOptions(selectEl) {
  if (!selectEl) return;
  const previousValue = String(selectEl.value || "all");
  const rankEntries = Object.entries(state.ranksMap || {})
    .map(([tier, rank]) => ({ tier: Number(tier), rank }))
    .filter((entry) => Number.isInteger(entry.tier) && entry.tier > 0)
    .sort((a, b) => a.tier - b.tier);

  const options = [`<option value="all">Tous</option>`];
  rankEntries.forEach(({ tier, rank }) => {
    const rankName = String(rank?.name || `Rank ${tier}`);
    options.push(`<option value="division:${tier}">${escapeHtml(rankName)}</option>`);
  });

  selectEl.innerHTML = options.join("");
  selectEl.value = options.some((opt) => opt.includes(`value="${previousValue}"`))
    ? previousValue
    : "all";
}

export function calculateAverageDurationByRank(history = [], mmrHistory = [], sampleSize = 100000) {
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
