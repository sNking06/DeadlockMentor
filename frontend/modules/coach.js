/* ── Coaching Analysis + Report ──────────────────────────── */

import { state } from './state.js';
import { deadlockGet, fetchMatchMetadata } from './api.js';
import { escapeHtml, parseAccountId, runWithConcurrency } from './utils.js';
import { findItemByName, findItemByExactName } from './items.js';
import { resolvePlayerPseudo, hidePlayerInfo, showPlayerInfo } from './players.js';
import { hydratePlayerMmr, getPlayerRankInfo } from './ranks.js';

/* ── DOM refs ─────────────────────────────────────────────── */
const coachStatsGrid = document.getElementById("coachStatsGrid");
const coachFindings  = document.getElementById("coachFindings");

/* ── Coaching Analysis Engine (pure JS) ──────────────────── */
// Logic ported from backend/server.js for GitHub Pages

function _round(v, d = 2) { const p = 10 ** d; return Math.round(v * p) / p; }
function _safeDiv(a, b, fb = 0) { return b ? a / b : fb; }
function _avg(arr) { return arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0; }
function _std(arr) {
  if (arr.length < 2) return 0;
  const m = _avg(arr);
  return Math.sqrt(_avg(arr.map(v => (v - m) ** 2)));
}

function _toMatchMetrics(match) {
  const mins   = Math.max((match.match_duration_s || 0) / 60, 1);
  const k      = match.player_kills   || 0;
  const d      = match.player_deaths  || 0;
  const a      = match.player_assists || 0;
  const lh     = match.last_hits      || 0;
  const dn     = match.denies         || 0;
  const nw     = match.net_worth      || 0;
  return {
    heroId:         match.hero_id,
    result:         match.match_result,
    kda:            _safeDiv(k + a, Math.max(1, d)),
    deathsPer10:    _safeDiv(d, mins) * 10,
    lhPerMin:       _safeDiv(lh, mins),
    deniesPerMin:   _safeDiv(dn, mins),
    netWorthPerMin: _safeDiv(nw, mins),
    kaPer10:        _safeDiv(k + a, mins) * 10,
  };
}

function _topHeroes(metrics) {
  const counts = new Map();
  for (const m of metrics) counts.set(m.heroId, (counts.get(m.heroId) || 0) + 1);
  return [...counts.entries()].map(([heroId, games]) => ({ heroId, games })).sort((a, b) => b.games - a.games);
}

function _buildFindings(summary, trend, heroStats) {
  const findings = [];
  if (summary.deathsPer10Avg >= 3.3) {
    findings.push({ severity: "high", code: "high_death_rate", title: "Surmortalite",
      why: "Le joueur meurt trop souvent, ce qui casse le tempo et la presence sur la carte.",
      evidence: `Morts/10min: ${summary.deathsPer10Avg} (cible <= 2.8)`,
      action: "Travailler la discipline de positionnement: reset avant les spikes ennemis et eviter les fights sans info." });
  } else if (summary.deathsPer10Avg >= 2.8) {
    findings.push({ severity: "medium", code: "death_control", title: "Gestion des morts a renforcer",
      why: "Le volume de morts reste assez haut pour limiter la progression constante.",
      evidence: `Morts/10min: ${summary.deathsPer10Avg}`,
      action: "Coach: fixer une regle simple par phase (laning/mid/late) sur quand disengage." });
  }
  if (summary.lhPerMinAvg < 5.8) {
    findings.push({ severity: "high", code: "low_farm", title: "Farm insuffisant",
      why: "Le joueur manque de ressources pour tenir son impact sur la duree.",
      evidence: `Last hits/min: ${summary.lhPerMinAvg} (cible >= 6.2)`,
      action: "Mettre une routine de wave + camp entre deux objectifs, avec timer strict." });
  } else if (summary.lhPerMinAvg < 6.2) {
    findings.push({ severity: "medium", code: "farm_optimization", title: "Optimisation de farm",
      why: "Le farm est jouable mais encore un cran sous un niveau stable.",
      evidence: `Last hits/min: ${summary.lhPerMinAvg}`,
      action: "Objectif de seances: +0.4 LH/min en priorisant les trajectoires de farm les plus courtes." });
  }
  if (summary.netWorthPerMinAvg < 1200) {
    findings.push({ severity: "medium", code: "low_economy", title: "Economie trop basse",
      why: "La generation de net worth ne soutient pas les timings d'objets.",
      evidence: `Net worth/min: ${summary.netWorthPerMinAvg} (cible >= 1300)`,
      action: "Analyser les 5 premieres minutes de chaque game pour corriger les pertes de tempo." });
  }
  if (trend.isRecentDrop) {
    findings.push({ severity: "high", code: "recent_performance_drop", title: "Baisse recente de performance",
      why: "Les 10 dernieres parties sont clairement en retrait par rapport aux precedentes.",
      evidence: `KDA ${trend.kdaDeltaPct}% et morts/10min +${trend.deathsDeltaPct}%`,
      action: "Coach: revoir 3 replays recents et isoler 2 erreurs recurrentes a corriger en priorite." });
  }
  if (summary.kdaCv > 0.85) {
    findings.push({ severity: "medium", code: "inconsistent_games", title: "Performance irreguliere",
      why: "Le niveau varie fortement d'une game a l'autre.",
      evidence: `Coefficient de variation KDA: ${summary.kdaCv}`,
      action: "Standardiser le plan de debut de partie pour reduire les ecarts de performance." });
  }
  if (heroStats.uniqueHeroes >= 10 && heroStats.topHeroShare < 0.25) {
    findings.push({ severity: "medium", code: "hero_pool_too_wide", title: "Pool de heros trop disperse",
      why: "Le joueur dilue sa progression mecanique et decisionnelle.",
      evidence: `${heroStats.uniqueHeroes} heros joues, top heros ${heroStats.topHeroSharePct}%`,
      action: "Limiter temporairement le pool a 2-3 heros pour accelerer la correction d'erreurs." });
  }
  if (!findings.length) {
    findings.push({ severity: "low", code: "no_major_issue", title: "Pas d'erreur majeure detectee",
      why: "Les indicateurs principaux sont globalement stables.",
      evidence: "Ajustements fins possibles selon role et heros joues.",
      action: "Passer a une analyse replay micro (positionnement, timings de powerspike, target selection)." });
  }
  const rank = { high: 0, medium: 1, low: 2 };
  findings.sort((a, b) => rank[a.severity] - rank[b.severity]);
  return findings;
}

export function _analyzeMatchHistory(history, mmrHistory) {
  const metrics = history.map(_toMatchMetrics);
  const kdaVals  = metrics.map(m => m.kda);
  const d10Vals  = metrics.map(m => m.deathsPer10);
  const lhVals   = metrics.map(m => m.lhPerMin);
  const nwVals   = metrics.map(m => m.netWorthPerMin);
  const kaVals   = metrics.map(m => m.kaPer10);

  const summary = {
    matchesAnalyzed:    metrics.length,
    kdaAvg:             _round(_avg(kdaVals)),
    deathsPer10Avg:     _round(_avg(d10Vals)),
    lhPerMinAvg:        _round(_avg(lhVals)),
    netWorthPerMinAvg:  _round(_avg(nwVals)),
    kaPer10Avg:         _round(_avg(kaVals)),
    result1Rate:        _round(_avg(metrics.map(m => m.result === 1 ? 1 : 0)) * 100),
    kdaCv:              _round(_safeDiv(_std(kdaVals), Math.max(0.01, _avg(kdaVals)))),
  };

  const recent   = metrics.slice(0, 10);
  const previous = metrics.slice(10, 30);
  const recentKda    = _avg(recent.map(m => m.kda));
  const previousKda  = _avg(previous.map(m => m.kda));
  const recentDeaths = _avg(recent.map(m => m.deathsPer10));
  const prevDeaths   = _avg(previous.map(m => m.deathsPer10));
  const kdaDeltaPct    = _round(_safeDiv(recentKda - previousKda, Math.max(previousKda, 0.01)) * 100, 1);
  const deathsDeltaPct = _round(_safeDiv(recentDeaths - prevDeaths, Math.max(prevDeaths, 0.01)) * 100, 1);

  const trend = { kdaDeltaPct, deathsDeltaPct,
    isRecentDrop: recent.length >= 8 && previous.length >= 8 && kdaDeltaPct <= -15 && deathsDeltaPct >= 15 };

  const heroPicks = _topHeroes(metrics);
  const heroStats = {
    uniqueHeroes:     heroPicks.length,
    topHero:          heroPicks[0] || null,
    topHeroShare:     heroPicks.length ? heroPicks[0].games / metrics.length : 0,
    topHeroSharePct:  _round(heroPicks.length ? (heroPicks[0].games / metrics.length) * 100 : 0),
  };

  const recentMmr = Array.isArray(mmrHistory) ? mmrHistory.slice(-20) : [];
  const mmrTrend = {
    firstRank: recentMmr[0]?.rank ?? null,
    lastRank:  recentMmr[recentMmr.length - 1]?.rank ?? null,
    deltaRank: recentMmr.length >= 2
      ? _round(recentMmr[recentMmr.length - 1].rank - recentMmr[0].rank, 1)
      : null,
  };

  return { summary, trend, heroStats, mmrTrend, findings: _buildFindings(summary, trend, heroStats) };
}

/* ── Coaching Report UI ───────────────────────────────────── */

function computeEnemyProfile(enemyPlayers) {
  const stats = {
    enemyHealing: 0,
    enemyBulletPressure: 0,
    enemyPlayerDamage: 0,
    enemyItemNames: [],
    enemyItemCounts: {},
    enemySlotCounts: {},
  };

  const getEnemyName = (player) => resolvePlayerPseudo(player);

  for (const p of enemyPlayers) {
    const timeline = Array.isArray(p.stats) && p.stats.length ? p.stats[p.stats.length - 1] : null;
    if (timeline) {
      stats.enemyHealing += Number(timeline.player_healing || 0) + Number(timeline.self_healing || 0);
      stats.enemyBulletPressure += Number(timeline.hero_bullets_hit || 0);
      stats.enemyPlayerDamage += Number(timeline.player_damage || 0);
    }

    const ids = Array.isArray(p.items) ? p.items : [];
    for (const entry of ids) {
      const itemId = typeof entry === "object" ? (entry.item_id ?? entry.id) : entry;
      const rawTime = typeof entry === "object" ? (entry.game_time_s ?? entry.time_s ?? entry.purchased_at ?? null) : null;
      const purchaseTimeS = Number.isFinite(Number(rawTime)) ? Number(rawTime) : null;
      const item = state.itemsMap[itemId];
      const name = item?.name;
      if (!name) continue;
      const key = name.toLowerCase();
      stats.enemyItemNames.push(key);
      if (!stats.enemyItemCounts[key]) {
        stats.enemyItemCounts[key] = { name, key, count: 0, id: itemId, owners: new Map() };
      }
      stats.enemyItemCounts[key].count += 1;
      const ownerName = getEnemyName(p);
      const prevOwner = stats.enemyItemCounts[key].owners.get(ownerName);
      if (!prevOwner) {
        stats.enemyItemCounts[key].owners.set(ownerName, { name: ownerName, firstTimeS: purchaseTimeS });
      } else if (purchaseTimeS != null && (prevOwner.firstTimeS == null || purchaseTimeS < prevOwner.firstTimeS)) {
        prevOwner.firstTimeS = purchaseTimeS;
      }

      const slot = String(item.item_slot_type || "unknown").toLowerCase();
      stats.enemySlotCounts[slot] = (stats.enemySlotCounts[slot] || 0) + 1;
    }
  }

  return stats;
}

export function buildCounterRecommendations(matchInfo, accountId) {
  const players = Array.isArray(matchInfo?.players) ? matchInfo.players : [];
  const myPlayer = players.find((p) => Number(p.account_id) === Number(accountId));
  if (!myPlayer) return null;

  const myTeam = myPlayer.team ?? myPlayer.player_team ?? myPlayer.team_number;
  const enemies = players.filter((p) => (p.team ?? p.player_team ?? p.team_number) !== myTeam);
  const enemyHeroes = enemies.map((p) => state.heroesMap[p.hero_id]?.name || `Hero #${p.hero_id}`);
  const profile = computeEnemyProfile(enemies);
  const enemyItems = Object.values(profile.enemyItemCounts);

  const counterRules = [
    {
      key: "anti_heal",
      enemyKeywords: ["healbane", "healing rite", "healing nova", "lifesteal", "leech", "vampiric", "siphon"],
      counterCandidates: ["Healbane", "Toxic Bullets"],
      reason: "cet item coupe les soins et le lifesteal pendant l'echange.",
      baseScore: 45,
    },
    {
      key: "anti_bullet",
      enemyKeywords: ["tesla bullets", "toxic bullets", "intensifying magazine", "burst fire", "headhunter", "sharpshooter", "pristine emblem"],
      counterCandidates: ["Bullet Armor", "Metal Skin", "Return Fire"],
      reason: "cet item reduit la pression weapon et amortit le burst auto-attack.",
      baseScore: 40,
    },
    {
      key: "anti_spirit",
      enemyKeywords: ["mystic burst", "improved burst", "spirit rend", "surge of power", "curse", "echo shard", "silence glyph"],
      counterCandidates: ["Spirit Armor", "Improved Spirit Armor", "Debuff Reducer"],
      reason: "cet item limite les pics de degats spirit et stabilise les trades.",
      baseScore: 38,
    },
    {
      key: "anti_cc",
      enemyKeywords: ["silence glyph", "silencer", "curse", "knockdown", "slowing bullets", "cold front", "debuff"],
      counterCandidates: ["Debuff Reducer", "Reactive Barrier", "Divine Barrier"],
      reason: "cet item reduit la duree/impact des controles et te laisse rejouer plus vite.",
      baseScore: 35,
    },
    {
      key: "anti_shield",
      enemyKeywords: ["reactive barrier", "divine barrier", "spirit shielding", "ancient shield", "metal skin"],
      counterCandidates: ["Nullification Burst", "Healbane", "Toxic Bullets"],
      reason: "cet item aide a casser les pics defensifs et a finir les cibles protegees.",
      baseScore: 30,
    },
  ];

  const scored = [];

  for (const rule of counterRules) {
    const matched = enemyItems
      .filter((entry) => rule.enemyKeywords.some((kw) => entry.key.includes(kw)))
      .sort((a, b) => b.count - a.count);

    if (!matched.length) continue;

    const counterItem = findItemByName(rule.counterCandidates);
    if (!counterItem) continue;

    const targetNames = matched.slice(0, 3).map((m) => m.name);
    const threatDetails = matched
      .flatMap((m) => Array.from(m.owners?.values?.() || []).map((owner) => ({
        ownerName: owner.name,
        itemName: m.name,
        timeS: owner.firstTimeS ?? null,
      })))
      .sort((a, b) => {
        if (a.timeS == null && b.timeS == null) return 0;
        if (a.timeS == null) return 1;
        if (b.timeS == null) return -1;
        return a.timeS - b.timeS;
      })
      .slice(0, 8);
    const threatHolders = Array.from(
      new Set(
        threatDetails.map((d) => d.ownerName)
      )
    ).slice(0, 4);
    const score = rule.baseScore + matched.reduce((sum, m) => sum + m.count * 8, 0);
    scored.push({
      item: counterItem,
      score,
      targets: targetNames,
      threatHolders,
      threatDetails,
      reason: `Contre ${targetNames.join(", ")} : ${rule.reason}`,
    });
  }

  if (profile.enemyHealing >= 18000) {
    const item = findItemByName(["Healbane", "Toxic Bullets"]);
    if (item) {
      scored.push({
        item,
        score: 42,
        targets: ["sustain global adverse"],
        reason: "Contre sustain global adverse : cet item reduit la valeur des soins en fight long.",
      });
    }
  }

  if (profile.enemyBulletPressure >= 550) {
    const item = findItemByName(["Metal Skin", "Bullet Armor", "Return Fire"]);
    if (item) {
      scored.push({
        item,
        score: 41,
        targets: ["pression bullet globale"],
        reason: "Contre pression bullet globale : cet item absorbe mieux les engages dps.",
      });
    }
  }

  if ((myPlayer.deaths ?? 0) >= 8) {
    const item = findItemByName(["Colossus", "Metal Skin", "Reactive Barrier"]);
    if (item) {
      scored.push({
        item,
        score: 34,
        targets: ["survie personnelle"],
        reason: "Contre votre mortalite sur cette partie : cet item ajoute une vraie marge defensive.",
      });
    }
  }

  if (!scored.length) {
    const dominantSlot = Object.entries(profile.enemySlotCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    const fallback = dominantSlot === "spirit"
      ? findItemByName(["Spirit Armor", "Improved Spirit Armor"])
      : findItemByName(["Bullet Armor", "Debuff Reducer"]);
    if (fallback) {
      scored.push({
        item: fallback,
        score: 20,
        targets: [dominantSlot || "build adverse"],
        reason: "Contre le profil principal adverse : ce contre reste le plus stable dans ce match.",
      });
    }
  }

  const mergedByItemId = new Map();
  for (const rec of scored) {
    const id = rec.item.id;
    if (!mergedByItemId.has(id)) {
      mergedByItemId.set(id, { ...rec });
      continue;
    }
    const prev = mergedByItemId.get(id);
    prev.score = Math.max(prev.score, rec.score);
    prev.targets = Array.from(new Set([...(prev.targets || []), ...(rec.targets || [])])).slice(0, 4);
    prev.threatHolders = Array.from(new Set([...(prev.threatHolders || []), ...(rec.threatHolders || [])])).slice(0, 6);
    prev.threatDetails = [...(prev.threatDetails || []), ...(rec.threatDetails || [])]
      .reduce((acc, detail) => {
        const key = `${detail.ownerName}::${detail.itemName}`;
        const found = acc.get(key);
        if (!found) {
          acc.set(key, { ...detail });
        } else if (detail.timeS != null && (found.timeS == null || detail.timeS < found.timeS)) {
          found.timeS = detail.timeS;
        }
        return acc;
      }, new Map());
    prev.threatDetails = Array.from(prev.threatDetails.values())
      .sort((a, b) => {
        if (a.timeS == null && b.timeS == null) return 0;
        if (a.timeS == null) return 1;
        if (b.timeS == null) return -1;
        return a.timeS - b.timeS;
      })
      .slice(0, 8);
    if (!prev.reason.includes(rec.reason)) {
      prev.reason = `${prev.reason} ${rec.reason}`;
    }
  }

  const recommendations = Array.from(mergedByItemId.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  return {
    matchId: matchInfo.match_id,
    enemyHeroes,
    myKda: `${myPlayer.kills ?? 0}/${myPlayer.deaths ?? 0}/${myPlayer.assists ?? 0}`,
    recommendations: recommendations.map((r) => ({
      itemId: r.item.id,
      itemName: r.item.name,
      reason: r.reason,
      targets: r.targets || [],
      threatHolders: r.threatHolders || [],
      threatDetails: r.threatDetails || [],
      score: r.score,
    })),
  };
}

export function formatCounterTimeLabel(timeS) {
  if (timeS == null || !Number.isFinite(Number(timeS))) return "timing inconnu";
  const minute = Math.max(0, Math.floor(Number(timeS) / 60));
  return `dès ${minute}m`;
}

function renderCounterSourceTag(detail, options = {}) {
  const { includeOwner = true } = options;
  const item = findItemByExactName(detail?.itemName);
  const icon = item?.shop_image_small || item?.shop_image || item?.image_webp || item?.image || "";
  const owner = escapeHtml(detail?.ownerName || "inconnu");
  const itemName = escapeHtml(detail?.itemName || "item");
  const timing = escapeHtml(formatCounterTimeLabel(detail?.timeS));
  return `
    <span class="counter-source-tag">
      ${icon ? `<img class="counter-source-icon" src="${icon}" alt="${itemName}" title="${itemName}" />` : ""}
      ${includeOwner ? `<span class="counter-source-owner">${owner}</span>` : ""}
      <span class="counter-source-item">${itemName}</span>
      <span class="counter-source-time">${timing}</span>
    </span>
  `;
}

export function renderCounterSourcesGroupedByPlayer(details = []) {
  const grouped = new Map();

  for (const detail of details) {
    const ownerName = String(detail?.ownerName || "inconnu").trim() || "inconnu";
    if (!grouped.has(ownerName)) {
      grouped.set(ownerName, new Map());
    }

    const byItem = grouped.get(ownerName);
    const itemKey = String(detail?.itemName || "item");
    const existing = byItem.get(itemKey);

    if (!existing) {
      byItem.set(itemKey, { ...detail, ownerName });
      continue;
    }

    if (detail?.timeS != null && (existing.timeS == null || Number(detail.timeS) < Number(existing.timeS))) {
      existing.timeS = detail.timeS;
    }
  }

  if (!grouped.size) return "";

  return `
    <div class="counter-source-groups">
      ${Array.from(grouped.entries()).map(([ownerName, itemMap]) => {
        const items = Array.from(itemMap.values())
          .sort((a, b) => {
            if (a.timeS == null && b.timeS == null) return 0;
            if (a.timeS == null) return 1;
            if (b.timeS == null) return -1;
            return Number(a.timeS) - Number(b.timeS);
          })
          .slice(0, 6);

        return `
          <div class="counter-source-group">
            <div class="counter-source-group-owner">${escapeHtml(ownerName)}</div>
            <div class="counter-source-list">
              ${items.map((detail) => renderCounterSourceTag(detail, { includeOwner: false })).join("")}
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

export function renderRecommendationItem(rec) {
  const item = rec?.itemId != null ? state.itemsMap[rec.itemId] : null;
  const src = item?.shop_image_small || item?.shop_image || item?.image_webp || item?.image || "";
  if (!src) return `<strong>${escapeHtml(rec.itemName)} :</strong>`;

  return `
    <span class="reco-item">
      <img class="reco-item-icon" src="${src}" alt="${escapeHtml(rec.itemName)}" title="${escapeHtml(rec.itemName)}" />
      <strong>${escapeHtml(rec.itemName)} :</strong>
    </span>
  `;
}

export function renderRecommendationItemTitle(rec) {
  const item = rec?.itemId != null ? state.itemsMap[rec.itemId] : null;
  const src = item?.shop_image_small || item?.shop_image || item?.image_webp || item?.image || "";
  if (!src) return `${escapeHtml(rec.itemName)}`;
  return `<span class="reco-item"><img class="reco-item-icon" src="${src}" alt="${escapeHtml(rec.itemName)}" title="${escapeHtml(rec.itemName)}" />${escapeHtml(rec.itemName)}</span>`;
}

async function buildPerMatchRecommendations(history, accountId) {
  const metadataList = await runWithConcurrency(history, 4, async (match) => fetchMatchMetadata(match.match_id));
  const recs = [];
  for (const info of metadataList) {
    if (!info) continue;
    const rec = buildCounterRecommendations(info, accountId);
    if (rec) recs.push(rec);
  }
  return recs;
}

function renderPerMatchRecommendationsHtml(recommendations) {
  if (!recommendations.length) {
    return `<div class="finding sev-low"><div class="finding-body"><div class="finding-row">Aucune metadonnee exploitable pour generer des recommandations match par match.</div></div></div>`;
  }

  return recommendations.map((rec) => `
    <article class="finding sev-medium match-reco-card">
      <div class="finding-header">
        <span class="finding-title">Match #${rec.matchId}</span>
        <span class="sev-badge medium">${rec.myKda}</span>
      </div>
      <div class="finding-body">
        <div class="finding-row"><strong>Adversaires :</strong> ${rec.enemyHeroes.slice(0, 6).map((h) => escapeHtml(h)).join(", ")}</div>
        ${rec.recommendations.map((r) => `
          <div class="finding-row">
            ${renderRecommendationItem(r)} ${escapeHtml(r.reason)}
            ${Array.isArray(r.threatHolders) && r.threatHolders.length ? `<br><span style="color:var(--muted);">Counter porte par : ${r.threatHolders.map((name) => escapeHtml(name)).join(", ")}</span>` : ""}
            ${Array.isArray(r.threatDetails) && r.threatDetails.length ? `<br><span style="color:var(--muted);">Grace a : ${r.threatDetails.map((d) => `${escapeHtml(d.ownerName)} avec ${escapeHtml(d.itemName)} (${formatCounterTimeLabel(d.timeS)})`).join(" ; ")}</span>` : ""}
          </div>
        `).join("")}
      </div>
    </article>
  `).join("");
}

export async function loadCoachReport() {
  const accountId = parseAccountId(document.getElementById("coachAccountId").value);
  const matches   = Math.min(Math.max(Number(document.getElementById("coachMatches").value), 10), 100);

  const coachPlayerInfoDisplay = document.getElementById("coachPlayerInfoDisplay");
  const coachPlayerInfoName    = document.getElementById("coachPlayerInfoName");
  const coachPlayerInfoId      = document.getElementById("coachPlayerInfoId");

  if (!accountId) {
    coachStatsGrid.innerHTML = "";
    coachFindings.innerHTML  = `<div class="error-block">Account ID invalide.</div>`;
    return;
  }

  coachStatsGrid.innerHTML = `<div class="loading-row"><span class="spinner"></span> Analyse en cours...</div>`;
  coachFindings.innerHTML  = "";
  hidePlayerInfo(coachPlayerInfoDisplay);

  try {
    // Appels directs a l'API Deadlock (fonctionne sur GitHub Pages)
    const [matchHistory, mmrHistory, playerInfo] = await Promise.all([
      // Keep coaching available even after quota limits.
      deadlockGet(`/v1/players/${accountId}/match-history`, { only_stored_history: true }),
      deadlockGet(`/v1/players/${accountId}/mmr-history`).catch(() => []),
      deadlockGet(`/v1/players/${accountId}`).catch(() => null),
    ]);

    const history    = Array.isArray(matchHistory) ? matchHistory.slice(0, matches) : [];
    const playerName = playerInfo?.account_name ?? playerInfo?.persona_name ?? null;

    if (history.length === 0) {
      coachStatsGrid.innerHTML = "";
      coachFindings.innerHTML  = `<div class="error-block">Aucun historique disponible pour ce joueur.</div>`;
      return;
    }

    if (playerName) {
      showPlayerInfo(coachPlayerInfoDisplay, coachPlayerInfoName, coachPlayerInfoId, accountId, playerName);
    }

    const { summary, trend, mmrTrend, heroStats, findings } = _analyzeMatchHistory(history, mmrHistory);

    const fmt      = (v, d = 2) => (v != null ? (+v).toFixed(d) : "-");
    const fmtDelta = (v, d = 1) => {
      if (v == null) return { text: "-", cls: "" };
      return { text: `${+v > 0 ? "+" : ""}${(+v).toFixed(d)}%`, cls: +v > 0 ? "pos" : +v < 0 ? "neg" : "" };
    };
    const mmrDelta = mmrTrend.deltaRank != null
      ? { text: `${mmrTrend.deltaRank > 0 ? "+" : ""}${mmrTrend.deltaRank}`, cls: mmrTrend.deltaRank > 0 ? "pos" : mmrTrend.deltaRank < 0 ? "neg" : "" }
      : { text: "-", cls: "" };

    const topHeroId = heroStats.topHero?.heroId;
    const topHero   = topHeroId ? state.heroesMap[topHeroId] : null;
    const topHeroDisplay = topHero?.images?.icon_image_small
      ? `<div class="hero-list"><img src="${topHero.images.icon_image_small}" alt="${topHero.name}" title="${topHero.name}" class="hero-icon-sm" /> <span>${topHero.name}</span></div>`
      : (topHeroId ?? "-");

    const stats = [
      { label: "Matchs analyses",   value: summary.matchesAnalyzed ?? "-",  cls: "" },
      { label: "KDA moyen",         value: fmt(summary.kdaAvg),             cls: "" },
      { label: "Deces / 10 min",    value: fmt(summary.deathsPer10Avg, 1),  cls: "" },
      { label: "Farm / min (LH)",   value: fmt(summary.lhPerMinAvg, 1),     cls: "" },
      { label: "Or / min",          value: summary.netWorthPerMinAvg != null ? Math.round(summary.netWorthPerMinAvg) : "-", cls: "" },
      { label: "Delta KDA tendance",    value: fmtDelta(trend.kdaDeltaPct).text,    cls: fmtDelta(trend.kdaDeltaPct).cls },
      { label: "Delta Deces tendance",  value: fmtDelta(trend.deathsDeltaPct).text, cls: fmtDelta(trend.deathsDeltaPct).cls },
      { label: "Delta Rang MMR",        value: mmrDelta.text,                   cls: mmrDelta.cls },
      { label: "Heros uniques",     value: heroStats.uniqueHeroes ?? "-",   cls: "" },
      { label: "Top Heros",         value: topHeroDisplay,                  cls: "" },
      { label: "Part heros #1",     value: heroStats.topHeroSharePct != null ? `${Math.round(heroStats.topHeroSharePct)}%` : "-", cls: "" },
    ];

    coachStatsGrid.innerHTML = stats.map(s =>
      `<div class="stat-card">
        <div class="stat-label">${s.label}</div>
        <div class="stat-value ${s.cls}">${s.value}</div>
      </div>`
    ).join("");

    const findingsHtml = findings.map(f =>
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

    coachFindings.innerHTML = findingsHtml + `<div class="loading-row"><span class="spinner"></span> Analyse matchup par matchup...</div>`;

    const perMatchRecommendations = await buildPerMatchRecommendations(history, accountId);
    const recoHtml = renderPerMatchRecommendationsHtml(perMatchRecommendations);
    coachFindings.innerHTML = `
      ${findingsHtml}
      <article class="finding sev-low">
        <div class="finding-header">
          <span class="finding-title">Recommandations Build Par Match</span>
          <span class="sev-badge low">${perMatchRecommendations.length}</span>
        </div>
        <div class="finding-body">
          <div class="finding-row"><strong>Objectif :</strong> proposer les meilleurs contres-items selon la team adverse de chaque match.</div>
        </div>
      </article>
      ${recoHtml}
    `;

  } catch (e) {
    coachStatsGrid.innerHTML = "";
    coachFindings.innerHTML  = `<div class="error-block">Erreur : ${e.message}</div>`;
  }
}
