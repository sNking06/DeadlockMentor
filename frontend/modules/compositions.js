/* ── Compositions tab ────────────────────────────────────── */

import { state } from './state.js';
import { deadlockGet } from './api.js';
import { escapeHtml } from './utils.js';
import { getTierListRankBounds } from './tierlist.js';

const compositionGrid           = document.getElementById("composition-grid");
const compositionModeSelect     = document.getElementById("composition-mode");
const compositionRankBracketSelect = document.getElementById("composition-rank-bracket");
const compositionSizeSelect     = document.getElementById("composition-size");
const compositionRefreshBtn     = document.getElementById("btn-composition-refresh");

function renderCompositionHeroSlots(heroIds = []) {
  const ids = Array.isArray(heroIds) ? heroIds : [];
  return ids
    .map((id) => {
      const heroId = Number(id);
      const hero = state.heroesMap[heroId];
      const heroName = hero?.name || `Hero #${heroId}`;
      return hero?.images?.icon_image_small
        ? `<img src="${hero.images.icon_image_small}" alt="${escapeHtml(heroName)}" title="${escapeHtml(heroName)}" />`
        : `<span class="composition-hero-fallback" title="${escapeHtml(heroName)}">#${heroId}</span>`;
    })
    .join("");
}

function renderCompositionTopPeriod(label, result) {
  const items = Array.isArray(result?.items) ? result.items : [];
  const minMatchesUsed = Number(result?.minMatchesUsed || 0);
  const totalFound = Number(result?.totalFound || items.length || 0);

  return `
    <article class="tierlist-period-card">
      <header class="tierlist-period-head">
        <h3>${escapeHtml(String(label || "-"))}</h3>
        <span>${totalFound} compos • min ${minMatchesUsed} matches</span>
      </header>
      <div class="tierlist-period-body">
        <div class="composition-list">
          ${
            items.length
              ? items.map((item, index) => `
                <div class="composition-row" title="${escapeHtml(item.compositionLabel)} - WR ${item.winrate.toFixed(2)}% - ${item.matches} matches">
                  <div class="composition-rank">#${index + 1}</div>
                  <div class="composition-heroes">${renderCompositionHeroSlots(item.heroIds)}</div>
                  <div class="composition-meta">
                    <div class="composition-name">${escapeHtml(item.compositionLabel)}</div>
                    <div class="composition-stats">${item.winrate.toFixed(2)}% • ${item.matches} matches</div>
                  </div>
                </div>
              `).join("")
              : `<div class="empty-row">Aucune composition sur cette periode.</div>`
          }
        </div>
      </div>
    </article>
  `;
}

async function fetchCompositionWinrates(days, minMatches, gameMode, rankBracket = "all", combSize = 6) {
  const nowTs = Math.floor(Date.now() / 1000);
  const minTs = nowTs - Number(days || 30) * 24 * 60 * 60;
  const requestedMinMatches = Math.max(20, Math.min(Number(minMatches || 120), 10000));
  const safeCombSize = Math.max(2, Math.min(Number(combSize || 6), 6));
  const bounds = getTierListRankBounds(rankBracket);
  const minCandidates = [requestedMinMatches, 80, 60, 40, 20]
    .map((value) => Math.max(20, Math.min(Number(value), 10000)))
    .filter((value, index, arr) => arr.indexOf(value) === index)
    .sort((a, b) => b - a);

  let bestItems = [];
  let usedMinMatches = minCandidates[minCandidates.length - 1];

  for (const candidateMin of minCandidates) {
    const data = await deadlockGet("/v1/analytics/hero-comb-stats", {
      game_mode: gameMode || "normal",
      min_matches: candidateMin,
      comb_size: safeCombSize,
      min_unix_timestamp: minTs,
      max_unix_timestamp: nowTs,
      min_average_badge: bounds.minBadge,
      max_average_badge: bounds.maxBadge,
    });

    const entries = Array.isArray(data) ? data : [];
    const normalized = entries
      .map((entry) => {
        const matches = Number(entry?.matches || 0);
        const wins = Number(entry?.wins || 0);
        const heroIds = Array.isArray(entry?.hero_ids) ? entry.hero_ids.map((id) => Number(id)).filter((id) => id > 0) : [];
        if (!matches || !heroIds.length) return null;
        const wr = matches > 0 ? (wins / matches) * 100 : 0;
        const compositionLabel = heroIds.map((id) => state.heroesMap[id]?.name || `Hero #${id}`).join(" + ");
        return { heroIds, matches, winrate: wr, compositionLabel };
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (b.winrate !== a.winrate) return b.winrate - a.winrate;
        return b.matches - a.matches;
      });

    if (normalized.length > bestItems.length) {
      bestItems = normalized;
      usedMinMatches = candidateMin;
    }
    if (normalized.length >= 5) {
      bestItems = normalized;
      usedMinMatches = candidateMin;
      break;
    }
  }

  return {
    minMatchesUsed: usedMinMatches,
    totalFound: bestItems.length,
    items: bestItems.slice(0, 5),
  };
}

export async function loadCompositionTierList() {
  if (!compositionGrid) return;
  const gameMode = String(compositionModeSelect?.value || "normal");
  const rankBracket = String(compositionRankBracketSelect?.value || "all");
  const combSize = Number(compositionSizeSelect?.value || 6);
  const minMatches = 120;

  if (compositionRefreshBtn) {
    compositionRefreshBtn.disabled = true;
    compositionRefreshBtn.textContent = "Chargement...";
  }
  compositionGrid.innerHTML = `<div class="loading-row"><span class="spinner"></span> Chargement compositions...</div>`;

  try {
    const periods = [
      { label: "7 jours",  loader: () => fetchCompositionWinrates(7,  minMatches, gameMode, rankBracket, combSize) },
      { label: "15 jours", loader: () => fetchCompositionWinrates(15, minMatches, gameMode, rankBracket, combSize) },
      { label: "30 jours", loader: () => fetchCompositionWinrates(30, minMatches, gameMode, rankBracket, combSize) },
    ];
    const results = await Promise.all(periods.map((p) => p.loader()));
    compositionGrid.innerHTML = periods.map((p, idx) => renderCompositionTopPeriod(p.label, results[idx])).join("");
    state.compositionTierListLoaded = true;
  } catch (error) {
    compositionGrid.innerHTML = `<div class="empty-row">Erreur compositions: ${escapeHtml(error?.message || "inconnue")}</div>`;
    state.compositionTierListLoaded = false;
  } finally {
    if (compositionRefreshBtn) {
      compositionRefreshBtn.disabled = false;
      compositionRefreshBtn.textContent = "Actualiser";
    }
  }
}

export async function ensureCompositionTierListLoaded() {
  if (state.compositionTierListLoaded) return;
  if (state.compositionTierListPromise) {
    await state.compositionTierListPromise;
    return;
  }
  state.compositionTierListPromise = (async () => { await loadCompositionTierList(); })();
  try {
    await state.compositionTierListPromise;
  } finally {
    state.compositionTierListPromise = null;
  }
}
