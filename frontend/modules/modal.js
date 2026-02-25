/* ── Match Detail Modal ──────────────────────────────────── */

import { state } from './state.js';
import { apiGet } from './api.js';
import { escapeHtml, dateFromUnix, kdaClass } from './utils.js';
import { hydratePlayerNames } from './players.js';
import { resolvePlayerPseudo } from './players.js';
import { renderItemTooltip, renderBuild } from './items.js';

// Imported lazily to avoid circular dep: modal → history (for loadHistory)
let _loadHistory = null;
export function setLoadHistory(fn) { _loadHistory = fn; }

const matchModal = document.getElementById("match-modal");
const modalBody  = document.getElementById("modal-body");
const modalClose = document.getElementById("modal-close");

matchModal.addEventListener("click", (e) => {
  if (e.target === matchModal) closeMatchModal();
});
modalClose.addEventListener("click", closeMatchModal);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !matchModal.hidden) closeMatchModal();
});

export function closeMatchModal() {
  matchModal.hidden = true;
  document.body.style.overflow = "";
}

export function switchToPlayerProfile(accountId) {
  closeMatchModal();
  const input = document.getElementById("accountId");
  if (input) input.value = String(accountId);
  const coachInput = document.getElementById("coachAccountId");
  if (coachInput) coachInput.value = String(accountId);
  const homeSearchInput = document.getElementById("home-search-input");
  if (homeSearchInput) homeSearchInput.value = String(accountId);
  document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("is-active"));
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("is-active"));
  document.querySelector('.nav-item[data-tab="history"]')?.classList.add("is-active");
  document.getElementById("tab-history")?.classList.add("is-active");
  if (_loadHistory) _loadHistory();
}

// ── Helper functions ──────────────────────────────────────

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

function getPlayerCombatMetrics(player) {
  const last = Array.isArray(player?.stats) && player.stats.length
    ? player.stats[player.stats.length - 1]
    : null;
  return {
    heroDamage:       Number(player?.hero_damage ?? player?.damage ?? last?.player_damage ?? 0) || 0,
    healing:          Number(player?.healing_done ?? last?.player_healing ?? 0) || 0,
    objectiveDamage:  Number(player?.objective_damage ?? last?.boss_damage ?? 0) || 0,
    damageTaken:      Number(player?.damage_taken ?? last?.player_damage_taken ?? 0) || 0,
    mitigated:        Number(player?.mitigated_damage ?? last?.damage_mitigated ?? last?.damage_absorbed ?? 0) || 0,
  };
}

function getPlayerDeathLoss(player) {
  const last = Array.isArray(player?.stats) && player.stats.length
    ? player.stats[player.stats.length - 1]
    : null;
  return Number(player?.death_cost ?? last?.gold_death_loss ?? 0) || 0;
}

// ── Item Timeline (local version with tier badges) ────────

const ITL_TIER_ROMAN  = ["", "I", "II", "III", "IV"];
const ITL_TIER_COLORS = { 1: "#9e9e9e", 2: "#4caf50", 3: "#60a8f0", 4: "#c97bff" };

function renderItemTileTimeline(id) {
  const item = state.itemsMap[id];
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
  const itemEntries = rawItems
    .map(i => {
      if (typeof i === "object" && i !== null) {
        const id    = i.item_id ?? i.id ?? i.ability_id ?? i.upgrade_id;
        const timeS = i.game_time_s ?? i.time_s ?? i.purchased_at ?? null;
        return { kind: "item", id, timeS };
      }
      return { kind: "item", id: i, timeS: null };
    })
    .filter(i => i.id != null);

  const ablEntries = [];
  const rawAbl = player?.ability_upgrades ?? player?.abilities_upgrades
    ?? player?.hero_ability_upgrades ?? player?.stat_ability_upgrades ?? null;

  if (rawAbl?.length) {
    const heroAbilities = heroData?.abilities ?? [];
    const abilityInfo   = new Map(heroAbilities.map(a => [a.id, a]));
    const ablCount      = {};
    for (const u of rawAbl) {
      const ablId = typeof u === "object" ? (u.ability_id ?? u.id ?? null) : u;
      const timeS = typeof u === "object" ? (u.game_time_s ?? u.time_s ?? null) : null;
      if (!ablId) continue;
      ablCount[ablId] = (ablCount[ablId] ?? 0) + 1;
      ablEntries.push({ kind: "ability", id: ablId, timeS, level: ablCount[ablId], info: abilityInfo.get(ablId) ?? null });
    }
  }

  const all = [...itemEntries, ...ablEntries];
  if (!all.length) return `<span class="no-build" style="display:block;padding:4px 0;">Aucun item</span>`;

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
      return `<div class="itl-group">${renderItemTileTimeline(entry.id)}${timeLbl}</div>`;
    }
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

function buildAbilityBuild(player, heroData) {
  const raw = player.ability_upgrades ?? player.abilities_upgrades
    ?? player.hero_ability_upgrades ?? player.stat_ability_upgrades ?? null;
  if (!raw || !raw.length) return "";

  const sequence = raw.map((u, idx) => ({
    abilityId: typeof u === "object" ? (u.ability_id ?? u.id ?? null) : u,
    pos: idx,
  })).filter(u => u.abilityId != null);

  if (!sequence.length) return "";

  const heroAbilities = heroData?.abilities ?? [];
  const abilityInfo   = new Map(heroAbilities.map(a => [a.id, a]));

  const byAbility = new Map();
  for (const u of sequence) {
    if (!byAbility.has(u.abilityId)) byAbility.set(u.abilityId, []);
    byAbility.get(u.abilityId).push(u.pos);
  }

  const abilityOrder = [...byAbility.keys()].sort((a, b) => byAbility.get(a)[0] - byAbility.get(b)[0]);
  const totalCols = sequence.length;

  const priorityHtml = abilityOrder.slice(0, 4).map((ablId, i) => {
    const abl  = abilityInfo.get(ablId);
    const img  = abl?.image ? `<img src="${abl.image}" alt="${abl.name ?? ""}" />` : `<div class="abl-info-placeholder"></div>`;
    const name = abl?.name ?? `Ability ${ablId}`;
    const sep  = i > 0 ? `<span class="abl-priority-sep">></span>` : "";
    return `${sep}<div class="abl-priority-item">${img}<span style="max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${name}</span></div>`;
  }).join("");

  const rowsHtml = abilityOrder.map(ablId => {
    const abl        = abilityInfo.get(ablId);
    const positions  = new Set(byAbility.get(ablId));
    const firstPos   = byAbility.get(ablId)[0];
    let upgradeCount = 0;

    const img = abl?.image ? `<img src="${abl.image}" alt="${abl.name ?? ""}" />` : `<div class="abl-info-placeholder"></div>`;
    const name = abl?.name ?? `#${ablId}`;
    const totalUpgrades = byAbility.get(ablId).length;

    const cells = Array.from({ length: totalCols }, (_, col) => {
      if (col === firstPos) return `<div class="abl-cell is-unlock">*</div>`;
      if (positions.has(col)) {
        upgradeCount++;
        const isMax = upgradeCount === totalUpgrades - 1;
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

// ── Tab renderers ─────────────────────────────────────────

function renderOverviewTab(data) {
  const { myId, myPlayer, players } = data;
  let html = "";

  if (myPlayer != null) {
    const mHero = state.heroesMap[myPlayer.hero_id];
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

    const heroPortrait = mHero?.images?.top_bar_vertical_image || mHero?.images?.icon_hero_card || mHero?.images?.icon_image_small || "";
    const heroImgTag = heroPortrait
      ? `<img src="${heroPortrait}" alt="${mHero?.name ?? "Hero"}" class="ohc-hero-img" />`
      : `<div class="ohc-hero-img-placeholder"></div>`;
    const dcStr   = mdc > 0 ? (mdc / 1000).toFixed(1) + "k" : "-";
    const dcClass = mdc > 0 ? "neg" : "";

    html += `
      <div>
        <div class="section-label">Votre Performance</div>
        <div class="overview-hero-card">
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
          <div class="ohc-stats-row">
            <div class="ohc-stat"><span class="ohc-stat-v">${mlh}</span><span class="ohc-stat-l">Last Hits</span></div>
            <div class="ohc-stat"><span class="ohc-stat-v">${mdn}</span><span class="ohc-stat-l">Denies</span></div>
            <div class="ohc-stat"><span class="ohc-stat-v">${(mhd / 1000).toFixed(1)}k</span><span class="ohc-stat-l">Hero Dmg</span></div>
            <div class="ohc-stat ${mhl > 0 ? "pos" : ""}"><span class="ohc-stat-v">${(mhl / 1000).toFixed(1)}k</span><span class="ohc-stat-l">Healing</span></div>
            <div class="ohc-stat ${dcClass}"><span class="ohc-stat-v">${dcStr}</span><span class="ohc-stat-l">Death Loss</span></div>
          </div>
          <div class="ohc-build">
            <div class="ohc-build-label">Build Final</div>
            ${renderBuild(mItems, false)}
          </div>
        </div>
      </div>`;
  }

  if (players.length) {
    const { amber, sapphire } = splitTeams(players);
    const renderTeam = (teamPlayers) =>
      teamPlayers.map(p => {
        const isMe   = Number(p.account_id) === myId;
        const k = p.kills ?? p.player_kills ?? 0;
        const d = p.deaths ?? p.player_deaths ?? 0;
        const a = p.assists ?? p.player_assists ?? 0;
        const nw = p.net_worth ?? p.player_net_worth ?? null;
        const hero = state.heroesMap[p.hero_id];
        const heroImg = hero?.images?.icon_image_small
          ? `<img src="${hero.images.icon_image_small}" alt="${hero.name}" />`
          : `<div style="width:28px;height:28px;background:var(--card-alt);border-radius:4px;flex-shrink:0;"></div>`;
        const items = p.items ?? p.item_data ?? [];
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
    html += `<div class="error-block" style="color:var(--muted);">Aucune donnee joueur disponible.<br><small>L'API peut ne pas avoir indexe ce match.</small></div>`;
  }
  return html;
}

function renderEconomyTab(data) {
  const { players, myId } = data;
  if (!players.length) return `<div class="error-block">Aucune donnee economique disponible.</div>`;
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
      const hero = state.heroesMap[p.hero_id];
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
          <thead><tr>
            <th style="padding:7px 10px;width:32px;"></th>
            <th style="padding:7px 10px;">Joueur</th>
            <th class="right" style="padding:7px 10px;">Net Worth</th>
            <th class="center" style="padding:7px 10px;">CS</th>
            <th class="center" style="padding:7px 10px;">Denies</th>
            <th class="right" style="padding:7px 10px;">Death Loss</th>
          </tr></thead>
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
  const { players, myId } = data;
  if (!players.length) return `<div class="error-block">Aucune donnee de degats disponible.</div>`;
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
      const hero = state.heroesMap[p.hero_id];
      const heroImg = hero?.images?.icon_image_small
        ? `<img src="${hero.images.icon_image_small}" alt="${hero.name}" class="hero-icon-sm" style="vertical-align:middle;" />`
        : `<div style="width:24px;height:24px;background:var(--card-alt);border-radius:3px;display:inline-block;"></div>`;
      const pseudo = resolvePlayerPseudo(p);
      const metrics = getPlayerCombatMetrics(p);
      const fmt = (v) => v >= 1000 ? (v / 1000).toFixed(1) + "k" : String(v);
      return `<tr${isMe ? ' class="is-me-row"' : ""}>
        <td style="padding:7px 10px;width:32px;">${heroImg}</td>
        <td style="padding:7px 10px;"><button class="player-link" data-profile-id="${p.account_id}" style="color:${teamColor};">${pseudo}</button></td>
        <td class="right" style="padding:7px 10px;">${fmt(metrics.heroDamage)}</td>
        <td class="right" style="padding:7px 10px;color:var(--green);">${fmt(metrics.healing)}</td>
        <td class="right" style="padding:7px 10px;">${fmt(metrics.objectiveDamage)}</td>
        <td class="right" style="padding:7px 10px;">${fmt(metrics.damageTaken)}</td>
        <td class="right" style="padding:7px 10px;color:var(--muted-2);">${fmt(metrics.mitigated)}</td>
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
          <thead><tr>
            <th style="padding:7px 10px;width:32px;"></th>
            <th style="padding:7px 10px;">Joueur</th>
            <th class="right" style="padding:7px 10px;">Hero Dmg</th>
            <th class="right" style="padding:7px 10px;">Healing</th>
            <th class="right" style="padding:7px 10px;">Obj Dmg</th>
            <th class="right" style="padding:7px 10px;">Taken</th>
            <th class="right" style="padding:7px 10px;">Mitigated</th>
          </tr></thead>
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

function renderItemsTab(data) {
  const { players, myId } = data;
  if (!players.length) return `<div class="error-block">Aucune donnee d'items disponible.</div>`;
  const { amber, sapphire } = splitTeams(players);

  const renderPlayerCard = (p, teamColor) => {
    const isMe   = Number(p.account_id) === myId;
    const hero   = state.heroesMap[p.hero_id];
    const heroImg = hero?.images?.icon_image_small
      ? `<img src="${hero.images.icon_image_small}" alt="${hero.name}" class="hero-icon-sm" />`
      : `<div style="width:24px;height:24px;background:var(--card-alt);border-radius:3px;flex-shrink:0;"></div>`;
    const pseudo = resolvePlayerPseudo(p);
    const k = p.kills ?? p.player_kills ?? 0;
    const d = p.deaths ?? p.player_deaths ?? 0;
    const a = p.assists ?? p.player_assists ?? 0;
    const nw = p.net_worth ?? p.player_net_worth ?? null;
    const items = p.items ?? p.item_data ?? [];
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

  return `
    <div style="padding:16px 0;">
      <div class="section-label">Equipe Ambre</div>
      <div style="margin-bottom:20px;">${amber.map(p => renderPlayerCard(p, "var(--gold)")).join("")}</div>
      <div class="section-label">Equipe Saphir</div>
      <div>${sapphire.map(p => renderPlayerCard(p, "var(--sapphire)")).join("")}</div>
    </div>`;
}

function renderTimelineTab(data) {
  const { players, myId } = data;
  if (!players.length) return `<div class="error-block">Aucune donnee disponible.</div>`;
  const { amber, sapphire } = splitTeams(players);
  const totalDmg = players.reduce((s, p) => s + getPlayerCombatMetrics(p).heroDamage, 0);
  const totalNW  = players.reduce((s, p) => s + (p.net_worth ?? p.player_net_worth ?? 0), 0);

  const renderContribRows = (teamPlayers, teamColor) =>
    teamPlayers.map(p => {
      const isMe   = Number(p.account_id) === myId;
      const hero   = state.heroesMap[p.hero_id];
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
              <div class="scoreboard-bar-track"><div class="scoreboard-bar-fill" style="width:${dmgPct.toFixed(1)}%;background:${teamColor};"></div></div>
              <span class="scoreboard-bar-value">${(dmg / 1000).toFixed(1)}k <span style="color:var(--muted);font-size:10px;">(${dmgPct.toFixed(1)}%)</span></span>
            </div>
            <div class="scoreboard-bar-row">
              <span class="scoreboard-bar-label">NW</span>
              <div class="scoreboard-bar-track"><div class="scoreboard-bar-fill" style="width:${nwPct.toFixed(1)}%;background:${teamColor};opacity:0.55;"></div></div>
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

// Coaching tab is in coach.js — imported lazily
let _buildCounterRecommendations = null;
let _renderCounterSourcesGroupedByPlayer = null;
let _renderRecommendationItemTitle = null;
let _formatCounterTimeLabel = null;

export function setCoachHelpers(helpers) {
  _buildCounterRecommendations = helpers.buildCounterRecommendations;
  _renderCounterSourcesGroupedByPlayer = helpers.renderCounterSourcesGroupedByPlayer;
  _renderRecommendationItemTitle = helpers.renderRecommendationItemTitle;
  _formatCounterTimeLabel = helpers.formatCounterTimeLabel;
}

function renderCoachingTab(data) {
  const { myId, myPlayer, matchInfo } = data;
  if (!_buildCounterRecommendations) {
    return `<div class="error-block">Module coaching non disponible.</div>`;
  }
  const recommendation = _buildCounterRecommendations(matchInfo, myId);
  if (!recommendation) {
    return `<div class="error-block">Impossible de generer un coaching sur ce match (donnees insuffisantes).</div>`;
  }

  const myItemsRaw = Array.isArray(myPlayer?.items) ? myPlayer.items : [];
  const myItemIds = new Set(myItemsRaw
    .map((entry) => (typeof entry === "object" ? (entry.item_id ?? entry.id) : entry))
    .filter((id) => id != null));

  const players = Array.isArray(matchInfo?.players) ? matchInfo.players : [];
  const myTeam = myPlayer?.team ?? myPlayer?.player_team ?? myPlayer?.team_number;
  const enemyPlayers = players.filter((p) => (p.team ?? p.player_team ?? p.team_number) !== myTeam);
  const enemyPills = enemyPlayers.map((enemy) => {
    const hero = state.heroesMap[enemy.hero_id];
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
    const groupedSourcesHtml = _renderCounterSourcesGroupedByPlayer(details.slice(0, 18));
    return `
      <article class="finding ${alreadyOwned ? "sev-low" : "sev-medium"} coach-reco-card">
        <div class="finding-header">
          <span class="finding-title">${_renderRecommendationItemTitle(rec)}</span>
          <span class="sev-badge ${alreadyOwned ? "low" : "medium"}">${alreadyOwned ? "deja pris" : "recommande"}</span>
        </div>
        <div class="finding-body">
          <div class="finding-row"><strong>Pourquoi :</strong> ${escapeHtml(rec.reason)}</div>
          ${holders.length ? `<div class="finding-row"><strong>Qui vous counter :</strong> ${holders.map((name) => escapeHtml(name)).join(", ")}</div>` : ""}
          ${details.length ? `<div class="finding-row"><strong>Grace a :</strong></div>${groupedSourcesHtml}` : ""}
          ${startedAt != null ? `<div class="finding-row"><strong>Debut du counter :</strong> <span class="counter-start-badge">${_formatCounterTimeLabel(startedAt)}</span></div>` : ""}
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

// ── Tab system ────────────────────────────────────────────

function switchMatchTab(btn, matchData) {
  document.querySelectorAll(".match-tab-btn").forEach(b => b.classList.remove("is-active"));
  btn.classList.add("is-active");
  renderMatchTab(btn.dataset.matchTab, matchData);
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

  modalBody.querySelectorAll(".player-link[data-profile-id]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = Number(btn.dataset.profileId);
      if (id) switchToPlayerProfile(id);
    });
  });

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

// ── openMatchModal ────────────────────────────────────────

export async function openMatchModal(matchId, myAccountId) {
  document.getElementById("modal-match-id").textContent = `Match #${matchId}`;
  document.getElementById("modal-meta").textContent     = "";
  document.getElementById("modal-outcome").textContent  = "";
  document.getElementById("modal-outcome").className    = "modal-outcome";
  modalBody.innerHTML = `<div class="loading-row"><span class="spinner"></span> Chargement du match...</div>`;
  matchModal.hidden = false;
  document.body.style.overflow = "hidden";

  try {
    const data = await apiGet(`/match/${matchId}`);
    const matchInfo = data.match_info ?? data;
    const players   = matchInfo.players ?? matchInfo.player_info ?? [];
    const durationS = matchInfo.duration_s ?? matchInfo.match_duration_s ?? 0;
    const startTime = matchInfo.start_time ?? 0;
    const outcome   = matchInfo.winning_team ?? matchInfo.match_outcome ?? null;

    const mins = Math.floor(durationS / 60);
    const secs = String(durationS % 60).padStart(2, "0");
    document.getElementById("modal-meta").textContent = `${dateFromUnix(startTime)} - ${mins}:${secs}`;

    await hydratePlayerNames(players);

    const myId     = Number(myAccountId);
    const myPlayer = players.find(p => Number(p.account_id) === myId);

    if (myPlayer != null && outcome != null) {
      const myTeam  = myPlayer.team ?? myPlayer.player_team ?? myPlayer.team_number ?? -1;
      const iWon    = Number(outcome) === Number(myTeam);
      const outcomeEl = document.getElementById("modal-outcome");
      outcomeEl.textContent = iWon ? "Victoire" : "Defaite";
      outcomeEl.className   = `modal-outcome ${iWon ? "win" : "loss"}`;
    }

    const matchData = { matchId, myId, myPlayer, players, matchInfo, durationS, mins, secs };

    document.querySelectorAll(".match-tab-btn").forEach(btn => {
      btn.classList.remove("is-active");
      btn.onclick = () => switchMatchTab(btn, matchData);
    });
    document.querySelector(".match-tab-btn[data-match-tab='overview']").classList.add("is-active");
    renderMatchTab("overview", matchData);
  } catch (e) {
    modalBody.innerHTML = `<div class="error-block">Erreur : ${e.message}</div>`;
  }
}
