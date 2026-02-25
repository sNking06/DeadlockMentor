/* ── Tier List tab ───────────────────────────────────────── */

import { state, CONSTANTS } from './state.js';
import { deadlockGet } from './api.js';
import { escapeHtml } from './utils.js';

const { TIERLIST_MIN_MATCHES_FIXED } = CONSTANTS;

const tierListGrid             = document.getElementById("tierlist-grid");
const tierListModeSelect       = document.getElementById("tierlist-mode");
const tierListRankBracketSelect = document.getElementById("tierlist-rank-bracket");
const tierListRefreshBtn       = document.getElementById("btn-tierlist-refresh");

export function getTierListRankBounds(bracket) {
  const key = String(bracket || "all");
  if (key.startsWith("division:")) {
    const division = Number(key.slice("division:".length));
    if (Number.isInteger(division) && division > 0) {
      return { minBadge: division * 10 + 1, maxBadge: division * 10 + 6 };
    }
  }
  return { minBadge: null, maxBadge: null };
}

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
        heroName: state.heroesMap[heroId]?.name || `Hero #${heroId}`,
        heroIcon: state.heroesMap[heroId]?.images?.icon_image_small || "",
        winrate,
        matches: Number(entry.matches || 0),
        tier: getTierListTierByRank(index, entries.length),
      };
    });
}

function renderTierListPeriod(label, items = []) {
  const byTier = { S: [], A: [], B: [], C: [], D: [] };
  items.forEach((item) => byTier[item.tier]?.push(item));

  return `
    <article class="tierlist-period-card">
      <header class="tierlist-period-head">
        <h3>${escapeHtml(String(label || "-"))}</h3>
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

export async function loadTierList() {
  if (!tierListGrid) return;
  const minMatches = TIERLIST_MIN_MATCHES_FIXED;
  const gameMode = String(tierListModeSelect?.value || "normal");
  const rankBracket = String(tierListRankBracketSelect?.value || "all");

  if (tierListRefreshBtn) {
    tierListRefreshBtn.disabled = true;
    tierListRefreshBtn.textContent = "Chargement...";
  }
  tierListGrid.innerHTML = `<div class="loading-row"><span class="spinner"></span> Chargement tier list...</div>`;

  try {
    const periods = [
      { label: "7 jours",  loader: () => fetchTierListForDays(7,  minMatches, gameMode, rankBracket) },
      { label: "15 jours", loader: () => fetchTierListForDays(15, minMatches, gameMode, rankBracket) },
      { label: "30 jours", loader: () => fetchTierListForDays(30, minMatches, gameMode, rankBracket) },
    ];
    const results = await Promise.all(periods.map((p) => p.loader()));
    tierListGrid.innerHTML = periods.map((p, idx) => renderTierListPeriod(p.label, results[idx])).join("");
    state.tierListLoaded = true;
  } catch (error) {
    tierListGrid.innerHTML = `<div class="empty-row">Erreur tier list: ${escapeHtml(error?.message || "inconnue")}</div>`;
    state.tierListLoaded = false;
  } finally {
    if (tierListRefreshBtn) {
      tierListRefreshBtn.disabled = false;
      tierListRefreshBtn.textContent = "Actualiser";
    }
  }
}

export async function ensureTierListLoaded() {
  if (state.tierListLoaded) return;
  if (state.tierListPromise) {
    await state.tierListPromise;
    return;
  }
  state.tierListPromise = (async () => { await loadTierList(); })();
  try {
    await state.tierListPromise;
  } finally {
    state.tierListPromise = null;
  }
}
