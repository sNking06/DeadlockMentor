/* ── Tab Switching ──────────────────────────────────────── */
document.querySelectorAll(".nav-item").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach((b) => b.classList.remove("is-active"));
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("is-active"));
    btn.classList.add("is-active");
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add("is-active");
  });
});

/* ── DOM Refs ───────────────────────────────────────────── */
const healthOutput    = document.getElementById("health-output");
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

/* ── Event Listeners ────────────────────────────────────── */
document.getElementById("btn-health").addEventListener("click", loadHealth);
document.getElementById("btn-leaderboard").addEventListener("click", loadLeaderboard);
document.getElementById("btn-history").addEventListener("click", loadHistory);
document.getElementById("btn-coach").addEventListener("click", loadCoachReport);

/* ── Utilities ──────────────────────────────────────────── */
let heroesMap = {};
let itemsMap  = {};
const deadlockApiBase = "https://api.deadlock-api.com";

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
    throw new Error(`HTTP ${res.status} - ${details.slice(0, 220)}`);
  }

  if (typeof body === "string") {
    throw new Error(`Réponse non JSON reçue: ${body.slice(0, 120)}`);
  }

  return body;
}

async function deadlockGet(pathname, query = {}) {
  const url = `${deadlockApiBase}${pathname}${buildQuery(query)}`;
  return fetchJsonOrThrow(url);
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
    // L'API Deadlock ne supporte pas la recherche par nom directement
    // On retourne un message d'erreur ou une liste vide
    throw new Error("La recherche par pseudo n'est pas disponible. Veuillez utiliser l'Account ID directement.");
  }

  if (pathname === "/match-history") {
    const accountId = Number(query.accountId);
    const onlyStored = query.onlyStored !== false && query.onlyStored !== "false";
    const [matchHistory, playerInfo] = await Promise.all([
      deadlockGet(`/v1/players/${accountId}/match-history`, {
        only_stored_history: onlyStored,
      }),
      deadlockGet(`/v1/players/${accountId}`).catch(() => null),
    ]);
    const history = Array.isArray(matchHistory) ? matchHistory.slice(0, 30) : [];
    const playerName = playerInfo?.account_name || playerInfo?.persona_name || null;
    return { accountId, playerName, total: history.length, history };
  }

  if (pathname === "/player-info") {
    const accountId = Number(query.accountId);
    return deadlockGet(`/v1/players/${accountId}`);
  }

  if (pathname.startsWith("/match/")) {
    const matchId = pathname.split("/").pop();
    return deadlockGet(`/v1/matches/${matchId}/metadata`, {
      include_player_info: true,
      include_player_items: true,
      include_player_stats: true,
    });
  }

  // Pour les autres endpoints non supportés
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
      data.forEach(i => {
        if (i?.id != null) itemsMap[i.id] = i;
      });
    }
  } catch (e) {
    console.error("Failed to load items", e);
  }
}

function dateFromUnix(unixTs) {
  if (!unixTs) return "—";
  return new Date(unixTs * 1000).toLocaleString("fr-FR");
}

function spinnerRow(cols) {
  return `<tr><td colspan="${cols}" class="loading-row"><span class="spinner"></span> Chargement…</td></tr>`;
}

function parseAccountId(rawValue) {
  const accountId = Number(rawValue);
  if (!Number.isInteger(accountId) || accountId <= 0) return null;
  return accountId;
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

function kdaClass(k, d, a) {
  if (!d || d === 0) return "kda-good";
  const ratio = (k + a) / d;
  if (ratio >= 3)   return "kda-good";
  if (ratio < 1.5)  return "kda-bad";
  return "kda-mid";
}

/* ── Coaching Analysis (DEPRECATED) ─────────────────────── */
// Toute la logique d'analyse est maintenant dans le backend.
// Le frontend se contente d'appeler /api/coach-report et d'afficher le résultat.
// Ce code est supprimé pour éviter la duplication et simplifier la maintenance.

/* ── Health ─────────────────────────────────────────────── */
async function loadHealth() {
  healthOutput.textContent = "Chargement…";
  try {
    const data = await apiGet("/health");
    healthOutput.textContent = JSON.stringify(data, null, 2);
    const ok = data.status !== "error";
    apiStatus.className = `api-status ${ok ? "ok" : "err"}`;
    apiStatus.querySelector(".api-label").textContent = ok ? "API en ligne" : "API hors ligne";
  } catch (e) {
    healthOutput.textContent = `Erreur : ${e.message}`;
    apiStatus.className = "api-status err";
    apiStatus.querySelector(".api-label").textContent = "Injoignable";
  }
}

/* ── Leaderboard ────────────────────────────────────────── */
async function loadLeaderboard() {
  leaderboardBody.innerHTML = spinnerRow(4);
  const region = document.getElementById("region").value;
  const limit  = document.getElementById("limit").value;
  try {
    const data = await apiGet("/leaderboard", { region, limit });
    const entries = Array.isArray(data.entries) ? data.entries : [];

    if (!entries.length) {
      leaderboardBody.innerHTML = `<tr><td colspan="4" class="empty-row">Aucune donnée disponible.</td></tr>`;
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
          : "—";
        return `<tr>
          <td><span class="${cls}">${n}</span></td>
          <td>${entry.account_name || "—"}</td>
          <td>${entry.badge_level ?? "—"}</td>
          <td>${heroes}</td>
        </tr>`;
      })
      .join("");
  } catch (e) {
    leaderboardBody.innerHTML = `<tr><td colspan="4" class="empty-row">Erreur : ${e.message}</td></tr>`;
  }
}

/* ── History ────────────────────────────────────────────── */
async function loadHistory() {
  historyBody.innerHTML = spinnerRow(5);
  hidePlayerInfo(playerInfoDisplay);
  const accountId = parseAccountId(document.getElementById("accountId").value);
  if (!accountId) {
    historyBody.innerHTML = `<tr><td colspan="5" class="empty-row">Account ID invalide.</td></tr>`;
    return;
  }
  try {
    const data = await apiGet("/match-history", { accountId, onlyStored: true });
    const history = Array.isArray(data.history) ? data.history : [];
    showPlayerInfo(playerInfoDisplay, playerInfoName, playerInfoId, accountId, data.playerName);

    if (!history.length) {
      historyBody.innerHTML = `<tr><td colspan="5" class="empty-row">Aucune donnée disponible.</td></tr>`;
      return;
    }

    const myAccountId = accountId;

    historyBody.innerHTML = history
      .map((match) => {
        const k   = match.player_kills   ?? 0;
        const d   = match.player_deaths  ?? 0;
        const a   = match.player_assists ?? 0;
        const cls = kdaClass(k, d, a);
        const nw  = match.net_worth != null ? match.net_worth.toLocaleString("fr-FR") : "—";

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

/* ── Coaching Report ────────────────────────────────────── */
async function loadCoachReport() {
  const accountId = parseAccountId(document.getElementById("coachAccountId").value);
  const matches   = Number(document.getElementById("coachMatches").value);

  if (!accountId) {
    coachStatsGrid.innerHTML = "";
    coachFindings.innerHTML  = `<div class="error-block">Account ID invalide.</div>`;
    return;
  }

  coachStatsGrid.innerHTML = `<div class="loading-row"><span class="spinner"></span> Analyse en cours…</div>`;
  coachFindings.innerHTML  = "";
  hidePlayerInfo(coachPlayerInfoDisplay);

  try {
    const data = await fetchJsonOrThrow(`/api/coach-report?accountId=${accountId}&matches=${matches}`);

    if (data.playerName) {
      showPlayerInfo(coachPlayerInfoDisplay, coachPlayerInfoName, coachPlayerInfoId, accountId, data.playerName);
    }

    const { summary, trend, mmrTrend, heroStats, findings } = data.report;

    const fmt = (v, decimals = 2) => (v != null ? (+v).toFixed(decimals) : "—");
    const fmtDelta = (v, decimals = 1) => {
      if (v == null) return { text: "—", cls: "" };
      const fixed = (+v).toFixed(decimals);
      return { text: `${+v > 0 ? "+" : ""}${fixed}%`, cls: +v > 0 ? "pos" : +v < 0 ? "neg" : "" };
    };
    const mmrDelta = mmrTrend.deltaRank != null
      ? { text: `${mmrTrend.deltaRank > 0 ? "+" : ""}${mmrTrend.deltaRank}`, cls: mmrTrend.deltaRank > 0 ? "pos" : mmrTrend.deltaRank < 0 ? "neg" : "" }
      : { text: "—", cls: "" };

    const topHeroId = heroStats.topHero?.heroId;
    const topHero   = topHeroId ? heroesMap[topHeroId] : null;
    const topHeroDisplay = topHero?.images?.icon_image_small
      ? `<div class="hero-list"><img src="${topHero.images.icon_image_small}" alt="${topHero.name}" title="${topHero.name}" class="hero-icon-sm" /> <span>${topHero.name}</span></div>`
      : (topHeroId ?? "—");

    const stats = [
      { label: "Matchs analysés",   value: summary.matchesAnalyzed ?? "—",                              cls: "" },
      { label: "KDA moyen",         value: fmt(summary.kdaAvg),                                         cls: "" },
      { label: "Décès / 10 min",    value: fmt(summary.deathsPer10Avg, 1),                              cls: "" },
      { label: "Farm / min (LH)",   value: fmt(summary.lhPerMinAvg, 1),                                 cls: "" },
      { label: "Or / min",          value: summary.netWorthPerMinAvg != null ? Math.round(summary.netWorthPerMinAvg) : "—", cls: "" },
      { label: "Δ KDA tendance",    value: fmtDelta(trend.kdaDeltaPct).text,                            cls: fmtDelta(trend.kdaDeltaPct).cls },
      { label: "Δ Décès tendance",  value: fmtDelta(trend.deathsDeltaPct).text,                         cls: fmtDelta(trend.deathsDeltaPct).cls },
      { label: "Δ Rang MMR",        value: mmrDelta.text,                                               cls: mmrDelta.cls },
      { label: "Héros uniques",     value: heroStats.uniqueHeroes ?? "—",                               cls: "" },
      { label: "Top Héros",         value: topHeroDisplay,                                              cls: "" },
      { label: "Part héros #1",     value: heroStats.topHeroSharePct != null ? `${Math.round(heroStats.topHeroSharePct)}%` : "—", cls: "" },
    ];

    coachStatsGrid.innerHTML = stats.map(s =>
      `<div class="stat-card">
        <div class="stat-label">${s.label}</div>
        <div class="stat-value ${s.cls}">${s.value}</div>
      </div>`
    ).join("");

    if (findings && findings.length > 0) {
      coachFindings.innerHTML = findings.map(f =>
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
    } else {
      coachFindings.innerHTML = `<div class="success-block">✓ Aucun problème majeur détecté.</div>`;
    }
  } catch (e) {
    coachStatsGrid.innerHTML = "";
    coachFindings.innerHTML  = `<div class="error-block">Erreur : ${e.message}</div>`;
  }
}

/* ── Match Detail Modal ─────────────────────────────────── */
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
        <span class="item-tooltip">${name}</span>
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
  // Extract item IDs — may be plain numbers or objects like { item_id: ... }
  const ids = itemIds
    .map(i => (typeof i === "object" ? (i.item_id ?? i.id ?? i.ability_id ?? i.upgrade_id) : i))
    .filter(v => v != null);
  const stripClass = small ? "player-build" : "build-strip";
  return `<div class="${stripClass}">${ids.map(id => renderItemIcon(id, small)).join("")}</div>`;
}

/* ── Match Modal Tab System ─────────────────────────────── */
function switchMatchTab(btn, matchData) {
  document.querySelectorAll(".match-tab-btn").forEach(b => b.classList.remove("is-active"));
  btn.classList.add("is-active");
  const tabName = btn.dataset.matchTab;
  renderMatchTab(tabName, matchData);
}

function renderMatchTab(tabName, data) {
  const { matchId, myId, myPlayer, players, matchInfo, durationS, mins, secs, heroesMap, itemsMap, kdaClass } = data;
  let html = "";

  if (tabName === "overview") {
    html = renderOverviewTab(data);
  } else if (tabName === "economy") {
    html = renderEconomyTab(data);
  } else if (tabName === "damage") {
    html = renderDamageTab(data);
  } else if (tabName === "items") {
    html = renderItemsTab(data);
  } else if (tabName === "timeline") {
    html = renderTimelineTab(data);
  }

  modalBody.innerHTML = html;
}

function renderOverviewTab(data) {
  const { matchId, myId, myPlayer, players, matchInfo, durationS, mins, secs, heroesMap, itemsMap, kdaClass } = data;
  let html = "";

  /* ── My performance ── */
  if (myPlayer != null) {
    const mHero = heroesMap[myPlayer.hero_id];
    const mk = myPlayer.kills ?? myPlayer.player_kills ?? 0;
    const md = myPlayer.deaths ?? myPlayer.player_deaths ?? 0;
    const ma = myPlayer.assists ?? myPlayer.player_assists ?? 0;
    const mnw = myPlayer.net_worth ?? myPlayer.player_net_worth ?? null;
    const mHeroImg = mHero?.images?.icon_image_large
      ? `<img src="${mHero.images.icon_image_large}" alt="${mHero.name}" />`
      : `<div style="width:64px;height:64px;background:var(--card-alt);border-radius:var(--radius);"></div>`;
    const mItems = myPlayer.items ?? myPlayer.item_data ?? [];

    html += `
        <div>
          <div class="section-label">Votre Performance</div>
          <div class="my-perf-card">
            <div style="display:flex;gap:16px;">
              ${mHeroImg}
              <div>
                <div class="my-perf-hero-name">${mHero?.name ?? `Héro #${myPlayer.hero_id}`}</div>
                <div class="my-perf-kda">
                  <span class="${kdaClass(mk, md, ma)}"><strong>${mk}/${md}/${ma}</strong></span>
                  ${mnw != null ? `<span style="color:var(--muted);margin-left:10px;">⬡ ${mnw.toLocaleString("fr-FR")}</span>` : ""}
                </div>
              </div>
            </div>
            <div class="my-perf-divider"></div>
            <div>
              <div class="section-label" style="margin-bottom:8px;">Build final</div>
              ${renderBuild(mItems, false)}
            </div>
          </div>
        </div>`;
  }

  /* ── All players by team ── */
  if (players.length) {
    let amber = players.filter(p => {
      const team = p.player_team ?? p.team ?? p.team_number;
      return team === 0 || team === "0" || team === "team0";
    });
    
    let sapphire = players.filter(p => {
      const team = p.player_team ?? p.team ?? p.team_number;
      return team === 1 || team === "1" || team === "team1" || team === 2 || team === "2";
    });

    if (amber.length === 0 || sapphire.length === 0) {
      const half = Math.ceil(players.length / 2);
      amber = players.slice(0, half);
      sapphire = players.slice(half);
    }

    const renderTeam = (teamPlayers) =>
      teamPlayers.map(p => {
        const isMe  = Number(p.account_id) === myId;
        const k     = p.kills   ?? p.player_kills   ?? 0;
        const d     = p.deaths  ?? p.player_deaths  ?? 0;
        const a     = p.assists ?? p.player_assists ?? 0;
        const hero  = heroesMap[p.hero_id];
        const heroImg = hero?.images?.icon_image_small
          ? `<img src="${hero.images.icon_image_small}" alt="${hero.name}" />`
          : `<div style="width:28px;height:28px;background:var(--card-alt);border-radius:4px;flex-shrink:0;"></div>`;
        const items = p.items ?? p.item_data ?? [];
        const pseudo = p.account_name ?? p.persona_name;
        const name = pseudo ? `${pseudo} (#${p.account_id})` : `#${p.account_id}`;

        return `
          <div class="player-row${isMe ? " is-me" : ""}">
            <div class="player-row-top">
              ${heroImg}
              <span class="player-name" title="${name}">${name}</span>
              <span class="player-kda ${kdaClass(k, d, a)}">${k}/${d}/${a}</span>
            </div>
            ${renderBuild(items, true)}
          </div>`;
      }).join("");

    html += `
      <div>
        <div class="section-label">Joueurs de la partie</div>
        <div class="teams-grid">
          <div class="team-block">
            <div class="team-header amber">Équipe Ambre</div>
            ${renderTeam(amber)}
          </div>
          <div class="team-block">
            <div class="team-header sapphire">Équipe Saphir</div>
            ${renderTeam(sapphire)}
          </div>
        </div>
      </div>`;
  } else {
    html += `<div class="error-block" style="color:var(--muted);">Aucune donnée joueur disponible pour ce match.<br><small>L'API peut ne pas avoir indexé ce match.</small></div>`;
  }

  return html;
}

function renderEconomyTab(data) {
  const { players, heroesMap, kdaClass } = data;
  
  if (!players.length) {
    return `<div class="error-block">Aucune donnée économique disponible.</div>`;
  }

  const amber = players.filter(p => (p.player_team ?? p.team ?? p.team_number) !== 1);
  const sapphire = players.filter(p => (p.player_team ?? p.team ?? p.team_number) === 1 || (amber.length > 0 && !amber.includes(p)));

  const calcTeamStats = (teamPlayers) => {
    const netWorth = teamPlayers.reduce((sum, p) => sum + (p.net_worth ?? p.player_net_worth ?? 0), 0);
    const cs = teamPlayers.reduce((sum, p) => sum + (p.last_hits ?? p.cs ?? 0), 0);
    const deaths = teamPlayers.reduce((sum, p) => sum + (p.deaths ?? p.player_deaths ?? 0), 0);
    const deathLoss = teamPlayers.reduce((sum, p) => sum + (p.death_cost ?? 0), 0);
    return { netWorth, cs, deaths, deathLoss };
  };

  const amberStats = calcTeamStats(amber);
  const sapphireStats = calcTeamStats(sapphire);

  const renderComparison = (label, amberVal, sapphireVal) => {
    const format = (v) => typeof v === 'number' && v > 1000 ? (v / 1000).toFixed(1) + 'k' : v.toLocaleString('fr-FR');
    const amberPct = amberVal + sapphireVal > 0 ? (amberVal / (amberVal + sapphireVal) * 100) : 50;
    return `
      <div style="margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 12px;">
          <span style="color: var(--gold);">${format(amberVal)}</span>
          <span style="color: var(--text); font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">${label}</span>
          <span style="color: var(--muted-2);">${format(sapphireVal)}</span>
        </div>
        <div style="height: 6px; background: var(--border); border-radius: 3px; overflow: hidden; display: flex;">
          <div style="flex: ${amberPct}; background: var(--gold);"></div>
          <div style="flex: ${100 - amberPct}; background: var(--muted-2);"></div>
        </div>
      </div>`;
  };

  return `
    <div style="padding: 16px 0;">
      <div class="section-label">Comparaison Économique</div>
      <div style="background: var(--card); padding: 16px; border-radius: var(--radius); border: 1px solid var(--border);">
        ${renderComparison("NET WORTH", amberStats.netWorth, sapphireStats.netWorth)}
        ${renderComparison("LAST HITS", amberStats.cs, sapphireStats.cs)}
        ${renderComparison("MORTS", amberStats.deaths, sapphireStats.deaths)}
        ${renderComparison("DEATH LOSS", amberStats.deathLoss, sapphireStats.deathLoss)}
      </div>
    </div>`;
}

function renderDamageTab(data) {
  const { players, heroesMap, kdaClass } = data;
  
  if (!players.length) {
    return `<div class="error-block">Aucune donnée de dégâts disponible.</div>`;
  }

  const amber = players.filter(p => (p.player_team ?? p.team ?? p.team_number) !== 1);
  const sapphire = players.filter(p => (p.player_team ?? p.team ?? p.team_number) === 1 || (amber.length > 0 && !amber.includes(p)));

  const calcTeamDamage = (teamPlayers) => {
    const heroDmg = teamPlayers.reduce((sum, p) => sum + (p.hero_damage ?? p.damage ?? 0), 0);
    const healing = teamPlayers.reduce((sum, p) => sum + (p.healing_done ?? 0), 0);
    const objDmg = teamPlayers.reduce((sum, p) => sum + (p.objective_damage ?? 0), 0);
    const dmgTaken = teamPlayers.reduce((sum, p) => sum + (p.damage_taken ?? 0), 0);
    const mitigated = teamPlayers.reduce((sum, p) => sum + (p.mitigated_damage ?? 0), 0);
    return { heroDmg, healing, objDmg, dmgTaken, mitigated };
  };

  const amberDmg = calcTeamDamage(amber);
  const sapphireDmg = calcTeamDamage(sapphire);

  const renderDmgComparison = (label, amberVal, sapphireVal) => {
    const format = (v) => (v / 1000).toFixed(1) + 'k';
    const amberPct = amberVal + sapphireVal > 0 ? (amberVal / (amberVal + sapphireVal) * 100) : 50;
    return `
      <div style="margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 12px;">
          <span style="color: var(--gold);">${format(amberVal)}</span>
          <span style="color: var(--text); font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">${label}</span>
          <span style="color: var(--muted-2);">${format(sapphireVal)}</span>
        </div>
        <div style="height: 6px; background: var(--border); border-radius: 3px; overflow: hidden; display: flex;">
          <div style="flex: ${amberPct}; background: var(--orange);"></div>
          <div style="flex: ${100 - amberPct}; background: var(--muted-2);"></div>
        </div>
      </div>`;
  };

  return `
    <div style="padding: 16px 0;">
      <div class="section-label">Analyse des Dégâts</div>
      <div style="background: var(--card); padding: 16px; border-radius: var(--radius); border: 1px solid var(--border);">
        ${renderDmgComparison("HERO DAMAGE", amberDmg.heroDmg, sapphireDmg.heroDmg)}
        ${renderDmgComparison("HEALING", amberDmg.healing, sapphireDmg.healing)}
        ${renderDmgComparison("OBJ DAMAGE", amberDmg.objDmg, sapphireDmg.objDmg)}
        ${renderDmgComparison("DAMAGE TAKEN", amberDmg.dmgTaken, sapphireDmg.dmgTaken)}
        ${renderDmgComparison("MITIGATED", amberDmg.mitigated, sapphireDmg.mitigated)}
      </div>
    </div>`;
}

function renderItemsTab(data) {
  const { players, itemsMap } = data;
  
  if (!players.length) {
    return `<div class="error-block">Aucune donnée d'items disponible.</div>`;
  }

  const playerItems = players.map(p => ({
    name: p.account_name ?? p.persona_name ?? `#${p.account_id}`,
    kda: `${p.kills ?? 0}/${p.deaths ?? 0}/${p.assists ?? 0}`,
    items: p.items ?? p.item_data ?? []
  })).filter(p => p.items.length > 0);

  return `
    <div style="padding: 16px 0;">
      <div class="section-label">Build Final par Joueur</div>
      ${playerItems.map(p => `
        <div style="background: var(--card); padding: 12px; border-radius: var(--radius); border: 1px solid var(--border); margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="font-weight: 500;">${p.name}</span>
            <span style="color: var(--muted); font-size: 12px;">${p.kda}</span>
          </div>
          ${renderBuild(p.items, true)}
        </div>
      `).join('')}
    </div>`;
}

function renderTimelineTab(data) {
  return `
    <div style="padding: 16px 0; text-align: center; color: var(--muted);">
      <p style="font-size: 12px;">📊 Timeline détaillée à venir…</p>
      <p style="font-size: 11px; margin-top: 8px; color: var(--muted-2);">Graphique du score au fil du temps</p>
    </div>`;
}

async function openMatchModal(matchId, myAccountId) {
  // Show modal with spinner
  document.getElementById("modal-match-id").textContent = `Match #${matchId}`;
  document.getElementById("modal-meta").textContent     = "";
  document.getElementById("modal-outcome").textContent  = "";
  document.getElementById("modal-outcome").className    = "modal-outcome";
  modalBody.innerHTML = `<div class="loading-row"><span class="spinner"></span> Chargement du match…</div>`;
  matchModal.hidden = false;
  document.body.style.overflow = "hidden";

  try {
    const data = await apiGet(`/match/${matchId}`);

    // Normalise response — the metadata endpoint nests under match_info
    const matchInfo = data.match_info ?? data;
    const players   = matchInfo.players ?? matchInfo.player_info ?? [];
    const durationS = matchInfo.duration_s ?? matchInfo.match_duration_s ?? 0;
    const startTime = matchInfo.start_time ?? 0;
    const outcome   = matchInfo.match_outcome ?? null;

    // Duration formatting
    const mins = Math.floor(durationS / 60);
    const secs = String(durationS % 60).padStart(2, "0");
    document.getElementById("modal-meta").textContent =
      `${dateFromUnix(startTime)} — ${mins}:${secs}`;

    // Find my player data
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

/* ── Init ───────────────────────────────────────────────── */
async function init() {
  await Promise.all([initHeroes(), initItems()]);
  loadHealth();
}

init();
