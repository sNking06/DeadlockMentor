/* ── Scout — Analyse d'Items ─────────────────────────────── */

import { state, CONSTANTS } from './state.js';
import { deadlockGet, fetchMatchMetadataWithFallback, apiGet } from './api.js';
import { escapeHtml, parseAccountId, historyLoadingBlock, pickBestSearchMatch, runWithConcurrency, didPlayerWinMatch } from './utils.js';
import { resolvePlayerPseudo } from './players.js';

const { SCOUT_MATCH_COUNT } = CONSTANTS;

let scoutRawData = null;

// openMatchModal is set after modal.js loads to avoid circular import
let _openMatchModal = null;
export function setOpenMatchModal(fn) { _openMatchModal = fn; }

export function populateScoutHeroFilter(validMatches, accountId) {
  const sel = document.getElementById("scout-hero-filter");
  if (!sel) return;

  const heroSet = new Map();
  for (const { meta } of validMatches) {
    const players = Array.isArray(meta?.match_info?.players) ? meta.match_info.players
                  : Array.isArray(meta?.players)             ? meta.players : [];
    const me = players.find(p => Number(p.account_id) === accountId);
    if (!me) continue;
    const hId = me.hero_id ?? me.hero ?? 0;
    if (hId && !heroSet.has(hId)) {
      heroSet.set(hId, state.heroesMap[hId]?.name || `Hero #${hId}`);
    }
  }

  const sorted = [...heroSet.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  sel.innerHTML = `<option value="">Tous les héros</option>`
    + sorted.map(([id, name]) => `<option value="${id}">${escapeHtml(name)}</option>`).join("");
  sel.disabled = sorted.length === 0;
}

export function applyScoutHeroFilter() {
  if (!scoutRawData) return;
  const { accountId, validMatches, playerName } = scoutRawData;
  const heroId = Number(document.getElementById("scout-hero-filter")?.value || 0);
  const resultsEl = document.getElementById("scout-results");
  if (!resultsEl) return;

  const filtered = heroId
    ? validMatches.filter(({ meta }) => {
        const players = Array.isArray(meta?.match_info?.players) ? meta.match_info.players
                      : Array.isArray(meta?.players)             ? meta.players : [];
        const me = players.find(p => Number(p.account_id) === accountId);
        return me && (me.hero_id ?? me.hero) === heroId;
      })
    : validMatches;

  const processed = processScoutData(accountId, filtered);
  renderScoutPage(processed, resultsEl, playerName);
}

export async function runScoutAnalysis() {
  const rawInput = (document.getElementById("scout-input")?.value || "").trim().replace(/^#/, "");
  const count    = SCOUT_MATCH_COUNT;
  const resultsEl = document.getElementById("scout-results");
  if (!resultsEl) return;

  if (!rawInput) {
    resultsEl.innerHTML = `<div class="empty-row">Saisis un pseudo Steam ou un Account ID.</div>`;
    return;
  }

  resultsEl.innerHTML = historyLoadingBlock("Résolution du joueur...");

  let accountId  = parseAccountId(rawInput);
  let playerName = rawInput;

  if (!accountId) {
    try {
      const results = await apiGet("/player-search", { searchQuery: rawInput });
      const best    = pickBestSearchMatch(results, rawInput);
      accountId     = parseAccountId(best?.account_id);
      if (accountId) {
        playerName = best?.personaname || best?.account_name || rawInput;
        state.playerNameCache.set(accountId, playerName);
      }
    } catch (e) {
      resultsEl.innerHTML = `<div class="empty-row">Joueur introuvable : ${escapeHtml(e.message)}</div>`;
      return;
    }
  }

  if (!accountId) {
    resultsEl.innerHTML = `<div class="empty-row">Joueur introuvable pour "${escapeHtml(rawInput)}".</div>`;
    return;
  }

  resultsEl.innerHTML = historyLoadingBlock("Chargement de l'historique...");

  let matches = [];
  try {
    const data = await deadlockGet(`/v1/players/${accountId}/match-history`, { only_stored_history: true });
    const all  = Array.isArray(data) ? data : (Array.isArray(data?.history) ? data.history : []);
    matches = all.slice(0, count);
  } catch (e) {
    resultsEl.innerHTML = `<div class="empty-row">Impossible de charger l'historique : ${escapeHtml(e.message)}</div>`;
    return;
  }

  if (!matches.length) {
    resultsEl.innerHTML = `<div class="empty-row">Aucun match disponible pour ce joueur.</div>`;
    return;
  }

  const total = matches.length;
  let done    = 0;

  function updateScoutProgress() {
    done++;
    const pct = Math.round((done / total) * 100);
    resultsEl.innerHTML = `
      <div class="scout-progress-wrap">
        <div class="scout-progress-label">Analyse des matchs... ${done}/${total}</div>
        <div class="scout-progress-bar-outer">
          <div class="scout-progress-bar" style="width:${pct}%"></div>
        </div>
      </div>`;
  }

  const matchDataArray = await runWithConcurrency(matches, 6, async (m) => {
    const matchId = m.match_id ?? m.id;
    try {
      const meta = await fetchMatchMetadataWithFallback(matchId);
      updateScoutProgress();
      return { matchId, meta, summary: m };
    } catch (_) {
      updateScoutProgress();
      return null;
    }
  });

  const validMatches = matchDataArray.filter(Boolean);
  if (!validMatches.length) {
    resultsEl.innerHTML = `<div class="empty-row">Impossible de charger les détails des matchs.</div>`;
    return;
  }

  scoutRawData = { accountId, validMatches, playerName };

  const heroFilterEl = document.getElementById("scout-hero-filter");
  if (heroFilterEl) heroFilterEl.value = "";
  populateScoutHeroFilter(validMatches, accountId);

  const processed = processScoutData(accountId, validMatches);
  renderScoutPage(processed, resultsEl, playerName);
}

function processScoutData(accountId, matchDataArray) {
  const itemMap = new Map();

  for (const { matchId, meta, summary } of matchDataArray) {
    const players = Array.isArray(meta?.match_info?.players) ? meta.match_info.players
                  : Array.isArray(meta?.players)             ? meta.players : [];
    const me = players.find(p => Number(p.account_id) === accountId);
    if (!me) continue;

    const matchInfo = meta?.match_info ?? meta;
    const myTeamRaw = me.player_team ?? me.team ?? me.team_number;
    const myTeamNum = (myTeamRaw === 0 || myTeamRaw === "0" || myTeamRaw === "team0" || myTeamRaw === "Team0")
      ? 0
      : (myTeamRaw === 1 || myTeamRaw === "1" || myTeamRaw === "team1" || myTeamRaw === "Team1" ? 1 : null);
    const winningTeamRaw = matchInfo?.winning_team ?? null;
    const winningTeamNum = (winningTeamRaw === 0 || winningTeamRaw === "0" || winningTeamRaw === "team0" || winningTeamRaw === "Team0")
      ? 0
      : (winningTeamRaw === 1 || winningTeamRaw === "1" || winningTeamRaw === "team1" || winningTeamRaw === "Team1" ? 1 : null);
    const won = (winningTeamNum != null && myTeamNum != null)
      ? myTeamNum === winningTeamNum
      : didPlayerWinMatch(summary);
    const heroId  = me.hero_id ?? me.hero ?? 0;
    const heroData = state.heroesMap[heroId] || null;
    const enemyTeamNum = myTeamNum === 0 ? 1 : 0;
    const enemies = players.filter(p => {
      const t = p.player_team ?? p.team ?? p.team_number;
      const tNum = (t === 0 || t === "0" || t === "team0") ? 0 : 1;
      return Number(p.account_id) !== accountId && tNum === enemyTeamNum;
    });

    const rawItems = Array.isArray(me.items) ? me.items : [];
    const seenItemIds = new Set();

    for (const entry of rawItems) {
      const itemId  = typeof entry === "object" ? (entry.item_id ?? entry.id) : entry;
      if (!itemId || seenItemIds.has(itemId)) continue;

      const itemData = state.itemsMap[itemId];
      if (!itemData) continue;
      if (itemData.item_slot_type === "ability" || itemData.type === "ability") continue;

      seenItemIds.add(itemId);

      const rawTime = typeof entry === "object" ? (entry.game_time_s ?? entry.time_s ?? entry.purchased_at ?? null) : null;
      const buyMinute = rawTime != null ? Math.round(rawTime / 60) : null;
      const durationS = meta?.match_info?.duration_s ?? meta?.duration_s ?? summary.match_duration_s ?? null;

      if (!itemMap.has(itemId)) itemMap.set(itemId, { item: itemData, games: [] });
      itemMap.get(itemId).games.push({
        matchId,
        won,
        heroId,
        heroData,
        enemies: enemies.map(e => ({
          heroId  : e.hero_id ?? e.hero,
          heroData: state.heroesMap[e.hero_id ?? e.hero] || null,
          name    : resolvePlayerPseudo(e),
        })),
        buyMinute,
        durationS,
      });
    }
  }

  const items = Array.from(itemMap.values())
    .filter(e => e.games.length > 0)
    .sort((a, b) => b.games.length - a.games.length);

  return { items, totalMatches: matchDataArray.length };
}

function renderScoutPage({ items, totalMatches }, container, playerName) {
  if (!items.length) {
    container.innerHTML = `<div class="empty-row">Aucun item trouvé dans les matchs analysés.</div>`;
    return;
  }

  const gridHtml = items.map((entry, idx) => {
    const { item, games } = entry;
    const wins = games.filter(g => g.won).length;
    const wr   = Math.round((wins / games.length) * 100);
    const src  = item.shop_image_small || item.shop_image || item.image_webp || item.image || "";
    const name = escapeHtml(item.name || item.class_name || "Item");

    return `
      <div class="scout-item-tile${idx === 0 ? " is-selected" : ""}" data-scout-idx="${idx}" title="${name}">
        <div class="scout-tile-img">
          ${src ? `<img src="${escapeHtml(src)}" alt="${name}" onerror="this.parentElement.innerHTML='<span style=font-size:9px;color:var(--muted);padding:2px>${name.slice(0,8)}</span>'" />` : `<span style="font-size:9px;color:var(--muted);padding:2px">${name.slice(0, 8)}</span>`}
          <span class="scout-tile-count">${games.length}/${totalMatches}</span>
        </div>
        <div class="scout-tile-bar" style="--wc:${wr >= 50 ? "var(--green)" : "var(--red)"};--wp:${wr}%"></div>
      </div>`;
  }).join("");

  container.innerHTML = `
    <div class="scout-layout">
      <div class="scout-left">
        <div class="card" style="padding:12px;margin-bottom:0">
          <div style="font-size:11px;color:var(--muted);margin-bottom:10px;text-transform:uppercase;letter-spacing:0.06em">
            ${totalMatches} partie${totalMatches > 1 ? "s" : ""} analysée${totalMatches > 1 ? "s" : ""} · ${items.length} items
          </div>
          <div class="scout-grid">${gridHtml}</div>
        </div>
      </div>
      <div id="scout-ctx-panel"></div>
    </div>`;

  container.querySelectorAll(".scout-item-tile").forEach(tile => {
    tile.addEventListener("click", () => {
      container.querySelectorAll(".scout-item-tile").forEach(t => t.classList.remove("is-selected"));
      tile.classList.add("is-selected");
      const idx = Number(tile.dataset.scoutIdx);
      renderScoutContext(items[idx], totalMatches, document.getElementById("scout-ctx-panel"));
    });
  });

  renderScoutContext(items[0], totalMatches, document.getElementById("scout-ctx-panel"));
}

function renderScoutContext(entry, totalMatches, panel) {
  if (!panel || !entry) return;
  const { item, games } = entry;
  const wins   = games.filter(g => g.won).length;
  const losses = games.length - wins;
  const wr     = Math.round((wins / games.length) * 100);
  const src    = item.shop_image_small || item.shop_image || item.image_webp || item.image || "";
  const name   = item.name || item.class_name || "Item";

  const withTime = games.filter(g => g.buyMinute != null);
  const avgMin   = withTime.length
    ? Math.round(withTime.reduce((s, g) => s + g.buyMinute, 0) / withTime.length)
    : null;

  function inferPhase(m) {
    if (m === null) return null;
    if (m <= 10) return "Laning";
    if (m <= 20) return "Mid-game";
    return "Late-game";
  }
  const phaseCounts = {};
  withTime.forEach(g => {
    const p = inferPhase(g.buyMinute);
    if (p) phaseCounts[p] = (phaseCounts[p] || 0) + 1;
  });
  const dominantPhase = Object.entries(phaseCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  const heroCount = new Map();
  games.forEach(g => { if (g.heroId) heroCount.set(g.heroId, (heroCount.get(g.heroId) || 0) + 1); });
  const topHeroesHtml = [...heroCount.entries()]
    .sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([hId, cnt]) => {
      const h   = state.heroesMap[hId];
      const img = h?.images?.icon_image_small || h?.images?.minimap_image_webp || "";
      const n   = escapeHtml(h?.name || `#${hId}`);
      return `<span class="scout-enemy-chip">
        ${img ? `<img src="${escapeHtml(img)}" alt="${n}" onerror="this.style.display='none'">` : ""}
        <span>${n}</span><b>${cnt}</b>
      </span>`;
    }).join("");

  const enemyCount = new Map();
  games.forEach(g => g.enemies.forEach(e => {
    if (!e.heroId) return;
    enemyCount.set(e.heroId, (enemyCount.get(e.heroId) || 0) + 1);
  }));
  const topEnemiesHtml = [...enemyCount.entries()]
    .sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([hId, cnt]) => {
      const h   = state.heroesMap[hId];
      const img = h?.images?.icon_image_small || h?.images?.minimap_image_webp || "";
      const n   = escapeHtml(h?.name || `#${hId}`);
      return `<span class="scout-enemy-chip">
        ${img ? `<img src="${escapeHtml(img)}" alt="${n}" onerror="this.style.display='none'">` : ""}
        <span>${n}</span><b>${cnt}</b>
      </span>`;
    }).join("");

  const gamesHtml = games.map(g => {
    const heroName = escapeHtml(g.heroData?.name || `#${g.heroId}`);
    const heroImg  = g.heroData?.images?.icon_image_small || g.heroData?.images?.minimap_image_webp || "";
    const durMin   = g.durationS != null ? Math.floor(g.durationS / 60) : null;
    const buyStr   = g.buyMinute != null ? `${g.buyMinute}min` : "-";
    const enemiesHtml = g.enemies.slice(0, 6).map(e => {
      const img = e.heroData?.images?.icon_image_small || e.heroData?.images?.minimap_image_webp || "";
      return img
        ? `<img src="${escapeHtml(img)}" alt="${escapeHtml(e.name)}" title="${escapeHtml(e.name)}"
            style="width:18px;height:18px;border-radius:50%;object-fit:cover" onerror="this.outerHTML='<span class=&quot;scout-enemy-fallback-dot&quot; title=&quot;${escapeHtml(e.name)}&quot;></span>'">`
        : `<span class="scout-enemy-fallback-dot" title="${escapeHtml(e.name)}"></span>`;
    }).join("");

    return `
      <div class="scout-game-row" data-match-id="${Number(g.matchId) || 0}">
        <span class="scout-outcome ${g.won ? "win" : "loss"}">${g.won ? "V" : "D"}</span>
        ${heroImg ? `<img src="${escapeHtml(heroImg)}" alt="${heroName}" title="${heroName}"
          style="width:22px;height:22px;border-radius:50%;object-fit:cover" onerror="this.style.display='none'">` : ""}
        <span class="scout-vs">vs</span>
        <span class="scout-enemies">${enemiesHtml}</span>
        <button type="button" class="scout-match-link" data-match-id="${Number(g.matchId) || 0}">#${Number(g.matchId) || "-"}</button>
        <span class="scout-time">${buyStr}</span>
        ${durMin !== null ? `<span class="scout-dur">${durMin}min</span>` : ""}
      </div>`;
  }).join("");

  panel.innerHTML = `
    <div class="scout-ctx-card">
      <div class="scout-ctx-head">
        ${src ? `<img src="${escapeHtml(src)}" alt="${escapeHtml(name)}"
          style="width:44px;height:44px;object-fit:contain;border-radius:4px;flex-shrink:0"
          onerror="this.style.display='none'">` : ""}
        <div>
          <div class="scout-ctx-name">${escapeHtml(name)}</div>
          ${item.shopable_description ? `<div style="font-size:12px;color:var(--muted);margin-top:2px">
            ${escapeHtml(item.shopable_description.replace(/<[^>]*>/g, "").slice(0, 100))}
          </div>` : ""}
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin:12px 0 4px">
        <span class="scout-chip">${games.length} partie${games.length > 1 ? "s" : ""}</span>
        <span class="scout-chip ${wr >= 55 ? "pos" : wr <= 40 ? "neg" : ""}">${wr}% WR</span>
        <span class="scout-chip pos">${wins}V</span>
        <span class="scout-chip neg">${losses}D</span>
        ${avgMin !== null ? `<span class="scout-chip">~${avgMin}min</span>` : ""}
        ${dominantPhase ? `<span class="scout-chip">${dominantPhase}</span>` : ""}
      </div>
      ${topHeroesHtml ? `<div class="scout-ctx-section"><div class="scout-ctx-section-lbl">Joué avec ces héros</div><div style="display:flex;flex-wrap:wrap;gap:6px">${topHeroesHtml}</div></div>` : ""}
      ${topEnemiesHtml ? `<div class="scout-ctx-section"><div class="scout-ctx-section-lbl">Ennemis fréquents</div><div style="display:flex;flex-wrap:wrap;gap:6px">${topEnemiesHtml}</div></div>` : ""}
      <div class="scout-ctx-section">
        <div class="scout-ctx-section-lbl">Parties (${games.length})</div>
        <div class="scout-games-list">${gamesHtml}</div>
      </div>
    </div>`;

  panel.querySelectorAll(".scout-match-link[data-match-id]").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      const matchId = Number(btn.dataset.matchId || 0);
      const accountId = Number(scoutRawData?.accountId || 0);
      if (!matchId) return;
      if (_openMatchModal) _openMatchModal(matchId, accountId || null);
    });
  });
}
