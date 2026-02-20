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

/* ── Event Listeners ────────────────────────────────────── */
document.getElementById("btn-health").addEventListener("click", loadHealth);
document.getElementById("btn-leaderboard").addEventListener("click", loadLeaderboard);
document.getElementById("btn-history").addEventListener("click", loadHistory);
document.getElementById("btn-coach").addEventListener("click", loadCoachReport);

/* ── Utilities ──────────────────────────────────────────── */
let heroesMap = {};
let itemsMap  = {};

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

function kdaClass(k, d, a) {
  if (!d || d === 0) return "kda-good";
  const ratio = (k + a) / d;
  if (ratio >= 3)   return "kda-good";
  if (ratio < 1.5)  return "kda-bad";
  return "kda-mid";
}

/* ── Health ─────────────────────────────────────────────── */
async function loadHealth() {
  healthOutput.textContent = "Chargement…";
  try {
    const res  = await fetch("/api/health");
    const data = await res.json();
    healthOutput.textContent = JSON.stringify(data, null, 2);
    const ok = res.ok && data.status !== "error";
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
    const res  = await fetch(`/api/leaderboard?region=${encodeURIComponent(region)}&limit=${encodeURIComponent(limit)}`);
    const data = await res.json();
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
  const accountId = document.getElementById("accountId").value;
  try {
    const res  = await fetch(`/api/match-history?accountId=${encodeURIComponent(accountId)}&onlyStored=true`);
    const data = await res.json();
    const history = Array.isArray(data.history) ? data.history : [];

    if (!history.length) {
      historyBody.innerHTML = `<tr><td colspan="5" class="empty-row">Aucune donnée disponible.</td></tr>`;
      return;
    }

    const myAccountId = document.getElementById("accountId").value;

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
  coachStatsGrid.innerHTML = "";
  coachFindings.innerHTML  = `<div class="loading-row"><span class="spinner"></span> Analyse en cours…</div>`;

  const accountId = document.getElementById("coachAccountId").value;
  const matches   = document.getElementById("coachMatches").value;

  try {
    const res  = await fetch(`/api/coach-report?accountId=${encodeURIComponent(accountId)}&matches=${encodeURIComponent(matches)}`);
    const data = await res.json();

    if (!res.ok) {
      coachFindings.innerHTML = `<div class="error-block">${JSON.stringify(data, null, 2)}</div>`;
      return;
    }

    const report    = data.report    || {};
    const summary   = report.summary  || {};
    const trend     = report.trend    || {};
    const mmrTrend  = report.mmrTrend || {};
    const heroStats = report.heroStats || {};

    /* Stat cards */
    const fmt = (v, decimals = 2) => (v != null ? (+v).toFixed(decimals) : "—");
    const fmtDelta = (v, decimals = 1) => {
      if (v == null) return { text: "—", cls: "" };
      const fixed = (+v).toFixed(decimals);
      return {
        text: `${+v > 0 ? "+" : ""}${fixed}%`,
        cls:  +v > 0 ? "pos" : +v < 0 ? "neg" : "",
      };
    };

    const kdaDelta    = fmtDelta(trend.kdaDeltaPct);
    const deathDelta  = fmtDelta(trend.deathsDeltaPct);
    const mmrDelta    = mmrTrend.deltaRank != null
      ? { text: `${mmrTrend.deltaRank > 0 ? "+" : ""}${mmrTrend.deltaRank}`, cls: mmrTrend.deltaRank > 0 ? "pos" : mmrTrend.deltaRank < 0 ? "neg" : "" }
      : { text: "—", cls: "" };

    const topHeroId = heroStats.topHero?.heroId;
    const topHero = topHeroId ? heroesMap[topHeroId] : null;
    const topHeroDisplay = topHero && topHero.images && topHero.images.icon_image_small
      ? `<div class="hero-list"><img src="${topHero.images.icon_image_small}" alt="${topHero.name}" title="${topHero.name}" class="hero-icon-sm" /> <span>${topHero.name}</span></div>`
      : (topHeroId || "—");

    const stats = [
      { label: "Matchs analysés",  value: summary.matchesAnalyzed ?? "—",                         cls: "" },
      { label: "KDA moyen",        value: fmt(summary.kdaAvg),                                    cls: "" },
      { label: "Décès / 10 min",   value: fmt(summary.deathsPer10Avg, 1),                         cls: "" },
      { label: "Farm / min (LH)",  value: fmt(summary.lhPerMinAvg, 1),                            cls: "" },
      { label: "Or / min",         value: summary.netWorthPerMinAvg != null ? Math.round(summary.netWorthPerMinAvg) : "—", cls: "" },
      { label: "Δ KDA tendance",   value: kdaDelta.text,                                           cls: kdaDelta.cls },
      { label: "Δ Décès tendance", value: deathDelta.text,                                         cls: deathDelta.cls },
      { label: "Δ Rang MMR",       value: mmrDelta.text,                                           cls: mmrDelta.cls },
      { label: "Héros uniques",    value: heroStats.uniqueHeroes ?? "—",                           cls: "" },
      { label: "Top Héros",        value: topHeroDisplay,                                          cls: "" },
      { label: "Part héro #1",     value: heroStats.topHeroSharePct != null ? `${Math.round(heroStats.topHeroSharePct)}%` : "—", cls: "" },
    ];

    coachStatsGrid.innerHTML = stats
      .map(
        (s) => `
      <div class="stat-card">
        <div class="stat-label">${s.label}</div>
        <div class="stat-value ${s.cls}">${s.value}</div>
      </div>`
      )
      .join("");

    /* Findings */
    const findings = Array.isArray(report.findings) ? report.findings : [];

    if (!findings.length) {
      coachFindings.innerHTML = `<div class="success-block">✓ Aucun problème détecté sur les ${summary.matchesAnalyzed ?? matches} derniers matchs.</div>`;
      return;
    }

    coachFindings.innerHTML = findings
      .map(
        (f) => `
      <article class="finding sev-${f.severity}">
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
      )
      .join("");
  } catch (e) {
    coachFindings.innerHTML = `<div class="error-block">Erreur : ${e.message}</div>`;
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
    const res  = await fetch(`/api/match/${matchId}`);
    const data = await res.json();

    if (!res.ok) {
      modalBody.innerHTML = `<div class="error-block">${JSON.stringify(data, null, 2)}</div>`;
      return;
    }

    // Normalise response — the metadata endpoint nests under match_info
    const matchInfo = data.match_info ?? data;
    const players   = matchInfo.players ?? matchInfo.player_info ?? [];
    const durationS = matchInfo.duration_s ?? matchInfo.match_duration_s ?? 0;
    const startTime = matchInfo.start_time ?? 0;
    const outcome   = matchInfo.match_outcome ?? null; // 1 = team 0 wins? depends on API

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
      const iWon    = outcome === myTeam || outcome === 1; // fallback: outcome 1 = first team wins
      const outcomeEl = document.getElementById("modal-outcome");
      outcomeEl.textContent = iWon ? "Victoire" : "Défaite";
      outcomeEl.className   = `modal-outcome ${iWon ? "win" : "loss"}`;
    }

    let html = "";

    /* ── My performance ── */
    if (myPlayer) {
      const mk = myPlayer.kills ?? myPlayer.player_kills ?? 0;
      const md = myPlayer.deaths ?? myPlayer.player_deaths ?? 0;
      const ma = myPlayer.assists ?? myPlayer.player_assists ?? 0;
      const mnw = myPlayer.net_worth ?? myPlayer.networth ?? null;
      const mHero = heroesMap[myPlayer.hero_id];
      const heroImg = mHero?.images?.icon_image_small
        ? `<img src="${mHero.images.icon_image_small}" alt="${mHero.name}" />`
        : `<div style="width:44px;height:44px;background:var(--card-alt);border-radius:var(--radius-sm);border:1px solid var(--border);"></div>`;

      const myItems = myPlayer.items ?? myPlayer.item_data ?? [];

      html += `
        <div>
          <div class="section-label">Votre performance</div>
          <div class="my-perf-card">
            <div class="my-perf-hero">
              ${heroImg}
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
              ${renderBuild(myItems, false)}
            </div>
          </div>
        </div>`;
    }

    /* ── All players by team ── */
    if (players.length) {
      const amber    = players.filter(p => (p.player_team ?? p.team_number ?? 0) === 0);
      const sapphire = players.filter(p => (p.player_team ?? p.team_number ?? 0) === 1);

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
          const name  = p.account_name ?? p.persona_name ?? `#${p.account_id}`;

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

    modalBody.innerHTML = html;
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
