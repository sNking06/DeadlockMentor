/* ── Home search (autocomplete + player search) ──────────── */

import { state } from './state.js';
import { apiGet } from './api.js';
import { escapeHtml, parseAccountId, pickBestSearchMatch } from './utils.js';

const homeSearchInput = document.getElementById("home-search-input");
const homeSearchWrap  = document.querySelector(".home-search-wrap");

let homeSearchResultsEl   = null;
let homeSearchDebounceTimer = null;
let homeSearchRequestSeq  = 0;
let homeSearchSuggestions = [];

export { homeSearchInput };

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

export function hideHomeSearchResults() {
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

export async function searchFromHome(switchToPlayerProfile) {
  const raw = (homeSearchInput?.value || "").trim().replace(/^#/, "");
  if (!raw) return;
  hideHomeSearchResults();

  const accountId = parseAccountId(raw);
  if (accountId) {
    switchToPlayerProfile(accountId);
    return;
  }

  const homeInsightsCard = document.getElementById("home-insights-card");
  const homeInsightsMeta = document.getElementById("home-insights-meta");
  const homeInsightsBody = document.getElementById("home-insights-body");

  try {
    const results = await apiGet("/player-search", { searchQuery: raw });
    const normalizedResults = Array.isArray(results)
      ? results.filter((entry) => parseAccountId(entry?.account_id))
      : [];
    if (!normalizedResults.length) {
      throw new Error(`Aucun joueur trouve pour "${raw}".`);
    }
    if (normalizedResults.length === 1) {
      switchToPlayerProfile(Number(normalizedResults[0].account_id));
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

export function onHomeSearchSuggestionClick(event, switchToPlayerProfile) {
  const item = event.target.closest(".search-result-item[data-account-id]");
  if (!item || !homeSearchWrap?.contains(item)) return;
  const accountId = parseAccountId(item.dataset.accountId);
  if (!accountId) return;
  if (homeSearchInput) homeSearchInput.value = String(accountId);
  hideHomeSearchResults();
  switchToPlayerProfile(accountId);
}

export function onHomeSearchInputChange(switchToPlayerProfile) {
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

export async function loadHomeInsights() {
  const homeInsightsCard  = document.getElementById("home-insights-card");
  const homeInsightsMeta  = document.getElementById("home-insights-meta");
  const homeInsightsTitle = document.getElementById("home-insights-title");
  const homeInsightsBody  = document.getElementById("home-insights-body");
  if (!homeInsightsCard || !homeInsightsMeta || !homeInsightsBody) return;

  homeInsightsCard.hidden = false;
  homeInsightsMeta.textContent = "Chargement des donnees...";
  homeInsightsBody.innerHTML = `<div class="loading-row"><span class="spinner"></span> Chargement...</div>`;

  const SAMPLE = 100000;
  function formatDurationLabel(seconds) {
    const safeSeconds = Math.max(0, Math.round(Number(seconds) || 0));
    const minutes = Math.floor(safeSeconds / 60);
    const secs = String(safeSeconds % 60).padStart(2, "0");
    return `${minutes}m ${secs}s`;
  }

  function aggregateDurationByDivisionFromBadges(entries = []) {
    const groups = new Map();
    entries.forEach((entry) => {
      const badge = Number(entry?.average_badge || 0);
      const averageSeconds = Number(entry?.avg_duration_s || 0);
      const count = Number(entry?.matches || 0);
      if (!Number.isFinite(badge) || badge <= 0 || !Number.isFinite(averageSeconds) || averageSeconds <= 0 || !Number.isFinite(count) || count <= 0) return;
      const division = Math.floor(badge / 10);
      if (!Number.isInteger(division) || division <= 0) return;
      const bucket = groups.get(division) || { division, totalDuration: 0, count: 0 };
      bucket.totalDuration += averageSeconds * count;
      bucket.count += count;
      groups.set(division, bucket);
    });
    return [...groups.values()]
      .map((entry) => {
        const rankData = state.ranksMap[entry.division] || null;
        return {
          division: entry.division,
          label: rankData?.name || `Rank ${entry.division}`,
          averageSeconds: entry.totalDuration / Math.max(1, entry.count),
          count: entry.count,
        };
      })
      .sort((a, b) => b.division - a.division);
  }

  try {
    const data = await apiGet("/global-duration-insights", { sampleSize: SAMPLE });
    const overallMatches = Number(data?.overall?.matches || 0);
    const overallAvgDuration = Number(data?.overall?.avg_duration_s || 0);
    const rankDurations = aggregateDurationByDivisionFromBadges(
      Array.isArray(data?.byBadge) ? data.byBadge : []
    );

    if (homeInsightsTitle) homeInsightsTitle.textContent = `Analyse Accueil - Global`;
    homeInsightsMeta.textContent = `${overallMatches.toLocaleString("fr-FR")} matchs globaux (base 100k)`;

    if (!overallMatches || !overallAvgDuration) {
      homeInsightsBody.innerHTML = `<div class="empty-row">Aucune donnee globale disponible.</div>`;
      return;
    }

    const rankRowsHtml = rankDurations.length
      ? rankDurations.map((entry) => `
          <div class="home-rank-duration-row">
            <span>${escapeHtml(entry.label)}</span>
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
          <span>Duree moyenne (100 000 derniers matchs)</span>
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
