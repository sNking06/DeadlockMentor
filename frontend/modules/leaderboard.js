/* ── Leaderboard tab ─────────────────────────────────────── */

import { state } from './state.js';
import { apiGet } from './api.js';
import { escapeHtml, spinnerRow } from './utils.js';
import { renderRankCell } from './ranks.js';
import { resolveLeaderboardProfileIds, getLeaderboardProfileId } from './players.js';

const leaderboardBody       = document.getElementById("leaderboard-body");
const leaderboardHeroFilter = document.getElementById("leaderboard-hero-filter");

export async function loadLeaderboard() {
  leaderboardBody.innerHTML = spinnerRow(4);
  const region = document.getElementById("region").value;
  const limit  = document.getElementById("limit").value;
  try {
    const data = await apiGet("/leaderboard", { region, limit });
    const entries = Array.isArray(data.entries) ? data.entries : [];
    await resolveLeaderboardProfileIds(entries);
    state.leaderboardEntriesCache = entries;
    populateLeaderboardHeroFilter(entries);
    applyLeaderboardHeroFilter();
  } catch (e) {
    leaderboardBody.innerHTML = `<tr><td colspan="4" class="empty-row">Erreur : ${e.message}</td></tr>`;
    state.leaderboardEntriesCache = [];
    if (leaderboardHeroFilter) {
      leaderboardHeroFilter.innerHTML = `<option value="">Tous les heros</option>`;
      leaderboardHeroFilter.value = "";
      leaderboardHeroFilter.disabled = true;
    }
  }
}

export function populateLeaderboardHeroFilter(entries = []) {
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
      label: state.heroesMap[heroId]?.name || `Hero #${heroId}`,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "fr", { sensitivity: "base" }));

  leaderboardHeroFilter.innerHTML = [
    `<option value="">Tous les heros</option>`,
    ...options.map((opt) => `<option value="${opt.heroId}">${escapeHtml(opt.label)}</option>`),
  ].join("");
  leaderboardHeroFilter.value = options.some((opt) => String(opt.heroId) === String(previousValue)) ? previousValue : "";
  leaderboardHeroFilter.disabled = options.length === 0;
}

export function applyLeaderboardHeroFilter() {
  const selectedHeroId = Number(leaderboardHeroFilter?.value || 0);
  const filteredEntries = selectedHeroId
    ? state.leaderboardEntriesCache.filter((entry) => Array.isArray(entry?.top_hero_ids) && entry.top_hero_ids.some((id) => Number(id) === selectedHeroId))
    : state.leaderboardEntriesCache;
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
            const hero = state.heroesMap[id];
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
