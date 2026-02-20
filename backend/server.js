const path = require("path");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3000);
const apiBase = "https://api.deadlock-api.com";
const apiKey = process.env.DEADLOCK_API_KEY;
const allowedRegions = new Set(["Europe", "Asia", "NAmerica", "SAmerica", "Oceania"]);

app.use(cors());
app.use(express.static(path.join(__dirname, "..", "frontend")));

function round(value, decimals = 2) {
  const p = Math.pow(10, decimals);
  return Math.round(value * p) / p;
}

function safeDiv(a, b, fallback = 0) {
  return b ? a / b : fallback;
}

function avg(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function std(values) {
  if (values.length < 2) return 0;
  const mean = avg(values);
  const variance = avg(values.map((value) => (value - mean) ** 2));
  return Math.sqrt(variance);
}

function toMatchMetrics(match) {
  const minutes = Math.max((match.match_duration_s || 0) / 60, 1);
  const kills = match.player_kills || 0;
  const deaths = match.player_deaths || 0;
  const assists = match.player_assists || 0;
  const lastHits = match.last_hits || 0;
  const denies = match.denies || 0;
  const netWorth = match.net_worth || 0;

  return {
    matchId: match.match_id,
    heroId: match.hero_id,
    startTime: match.start_time,
    result: match.match_result,
    minutes,
    kills,
    deaths,
    assists,
    kda: safeDiv(kills + assists, Math.max(1, deaths), 0),
    kaPer10: safeDiv(kills + assists, minutes, 0) * 10,
    deathsPer10: safeDiv(deaths, minutes, 0) * 10,
    lhPerMin: safeDiv(lastHits, minutes, 0),
    deniesPerMin: safeDiv(denies, minutes, 0),
    netWorthPerMin: safeDiv(netWorth, minutes, 0),
  };
}

function topHeroes(metrics) {
  const counts = new Map();
  for (const match of metrics) {
    counts.set(match.heroId, (counts.get(match.heroId) || 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([heroId, games]) => ({ heroId, games }))
    .sort((a, b) => b.games - a.games);
}

function buildFindings(summary, trend, heroStats) {
  const findings = [];

  if (summary.deathsPer10Avg >= 3.3) {
    findings.push({
      severity: "high",
      code: "high_death_rate",
      title: "Surmortalite",
      why: "Le joueur meurt trop souvent, ce qui casse le tempo et la presence sur la carte.",
      evidence: `Morts/10min: ${summary.deathsPer10Avg} (cible <= 2.8)`,
      action: "Travailler la discipline de positionnement: reset avant les spikes ennemis et eviter les fights sans info.",
    });
  } else if (summary.deathsPer10Avg >= 2.8) {
    findings.push({
      severity: "medium",
      code: "death_control",
      title: "Gestion des morts a renforcer",
      why: "Le volume de morts reste assez haut pour limiter la progression constante.",
      evidence: `Morts/10min: ${summary.deathsPer10Avg}`,
      action: "Coach: fixer une regle simple par phase (laning/mid/late) sur quand disengage.",
    });
  }

  if (summary.lhPerMinAvg < 5.8) {
    findings.push({
      severity: "high",
      code: "low_farm",
      title: "Farm insuffisant",
      why: "Le joueur manque de ressources pour tenir son impact sur la duree.",
      evidence: `Last hits/min: ${summary.lhPerMinAvg} (cible >= 6.2)`,
      action: "Mettre une routine de wave + camp entre deux objectifs, avec timer strict.",
    });
  } else if (summary.lhPerMinAvg < 6.2) {
    findings.push({
      severity: "medium",
      code: "farm_optimization",
      title: "Optimisation de farm",
      why: "Le farm est jouable mais encore un cran sous un niveau stable.",
      evidence: `Last hits/min: ${summary.lhPerMinAvg}`,
      action: "Objectif de seances: +0.4 LH/min en priorisant les trajectoires de farm les plus courtes.",
    });
  }

  if (summary.netWorthPerMinAvg < 1200) {
    findings.push({
      severity: "medium",
      code: "low_economy",
      title: "Economie trop basse",
      why: "La generation de net worth ne soutient pas les timings d'objets.",
      evidence: `Net worth/min: ${summary.netWorthPerMinAvg} (cible >= 1300)`,
      action: "Analyser les 5 premieres minutes de chaque game pour corriger pertes de tempo.",
    });
  }

  if (trend.isRecentDrop) {
    findings.push({
      severity: "high",
      code: "recent_performance_drop",
      title: "Baisse recente de performance",
      why: "Les 10 dernieres parties sont clairement en retrait par rapport aux precedentes.",
      evidence: `KDA ${trend.kdaDeltaPct}% et morts/10min +${trend.deathsDeltaPct}%`,
      action: "Coach: revoir 3 replays recents et isoler 2 erreurs recurrentes a corriger en priorite.",
    });
  }

  if (summary.kdaCv > 0.85) {
    findings.push({
      severity: "medium",
      code: "inconsistent_games",
      title: "Performance irreguliere",
      why: "Le niveau varie fortement d'une game a l'autre.",
      evidence: `Coefficient de variation KDA: ${summary.kdaCv}`,
      action: "Standardiser le plan de debut de partie pour reduire les ecarts de performance.",
    });
  }

  if (heroStats.uniqueHeroes >= 10 && heroStats.topHeroShare < 0.25) {
    findings.push({
      severity: "medium",
      code: "hero_pool_too_wide",
      title: "Pool de heros trop disperse",
      why: "Le joueur dilue sa progression mecanique et decisionnelle.",
      evidence: `${heroStats.uniqueHeroes} heros joues, top hero ${heroStats.topHeroSharePct}%`,
      action: "Limiter temporairement le pool a 2-3 heros pour accelerer la correction d'erreurs.",
    });
  }

  if (!findings.length) {
    findings.push({
      severity: "low",
      code: "no_major_issue",
      title: "Pas d'erreur majeure detectee",
      why: "Les indicateurs principaux sont globalement stables.",
      evidence: "Ajustements fins possibles selon role et heros joues.",
      action: "Passer a une analyse replay micro (positionnement, timings de powerspike, target selection).",
    });
  }

  const severityRank = { high: 0, medium: 1, low: 2 };
  findings.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);
  return findings;
}

function analyzeMatchHistory(history, mmrHistory) {
  const metrics = history.map(toMatchMetrics);
  const kdaValues = metrics.map((m) => m.kda);
  const deathsPer10Values = metrics.map((m) => m.deathsPer10);
  const lhPerMinValues = metrics.map((m) => m.lhPerMin);
  const netWorthPerMinValues = metrics.map((m) => m.netWorthPerMin);
  const kaPer10Values = metrics.map((m) => m.kaPer10);
  const result1Rate = avg(metrics.map((m) => (m.result === 1 ? 1 : 0)));

  const summary = {
    matchesAnalyzed: metrics.length,
    kdaAvg: round(avg(kdaValues)),
    deathsPer10Avg: round(avg(deathsPer10Values)),
    lhPerMinAvg: round(avg(lhPerMinValues)),
    netWorthPerMinAvg: round(avg(netWorthPerMinValues)),
    kaPer10Avg: round(avg(kaPer10Values)),
    result1Rate: round(result1Rate * 100),
    kdaCv: round(safeDiv(std(kdaValues), Math.max(0.01, avg(kdaValues)))),
  };

  const recent = metrics.slice(0, 10);
  const previous = metrics.slice(10, 30);

  const recentKda = avg(recent.map((m) => m.kda));
  const previousKda = avg(previous.map((m) => m.kda));
  const recentDeaths = avg(recent.map((m) => m.deathsPer10));
  const previousDeaths = avg(previous.map((m) => m.deathsPer10));

  const kdaDeltaPct = round((safeDiv(recentKda - previousKda, Math.max(previousKda, 0.01), 0) * 100), 1);
  const deathsDeltaPct = round((safeDiv(recentDeaths - previousDeaths, Math.max(previousDeaths, 0.01), 0) * 100), 1);

  const trend = {
    kdaDeltaPct,
    deathsDeltaPct,
    isRecentDrop: recent.length >= 8 && previous.length >= 8 && kdaDeltaPct <= -15 && deathsDeltaPct >= 15,
  };

  const heroPicks = topHeroes(metrics);
  const heroStats = {
    uniqueHeroes: heroPicks.length,
    topHero: heroPicks[0] || null,
    topHeroShare: heroPicks.length ? heroPicks[0].games / metrics.length : 0,
    topHeroSharePct: round(heroPicks.length ? (heroPicks[0].games / metrics.length) * 100 : 0),
  };

  const recentMmr = Array.isArray(mmrHistory) ? mmrHistory.slice(-20) : [];
  const mmrTrend = {
    points: recentMmr.length,
    firstRank: recentMmr[0]?.rank ?? null,
    lastRank: recentMmr[recentMmr.length - 1]?.rank ?? null,
    deltaRank:
      recentMmr.length >= 2
        ? round(recentMmr[recentMmr.length - 1].rank - recentMmr[0].rank, 1)
        : null,
  };

  const findings = buildFindings(summary, trend, heroStats);

  return {
    summary,
    trend,
    heroStats,
    mmrTrend,
    findings,
  };
}

async function deadlockGet(pathname, query = {}) {
  const url = new URL(pathname, apiBase);

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  const headers = {};
  if (apiKey) {
    headers["X-API-KEY"] = apiKey;
  }

  const response = await fetch(url, { headers });
  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const error = new Error("Deadlock API request failed");
    error.status = response.status;
    error.body = body;
    throw error;
  }

  return body;
}

app.get("/api/health", async (_req, res) => {
  try {
    const data = await deadlockGet("/v1/info/health");
    res.json(data);
  } catch (error) {
    res.status(error.status || 500).json({
      error: "Impossible de recuperer l'etat de l'API",
      details: error.body || String(error),
    });
  }
});

app.get("/api/leaderboard", async (req, res) => {
  const region = req.query.region || "Europe";
  const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 100);

  if (!allowedRegions.has(region)) {
    return res.status(400).json({
      error: "Region invalide",
      allowedRegions: Array.from(allowedRegions),
    });
  }

  try {
    const data = await deadlockGet(`/v1/leaderboard/${region}`);
    const entries = Array.isArray(data.entries) ? data.entries.slice(0, limit) : [];
    return res.json({ region, total: entries.length, entries });
  } catch (error) {
    return res.status(error.status || 500).json({
      error: "Impossible de recuperer le leaderboard",
      details: error.body || String(error),
    });
  }
});

app.get("/api/player-search", async (req, res) => {
  const query = req.query.q || "";
  const limit = Math.min(Math.max(Number(req.query.limit || 10), 1), 50);

  if (!query || query.trim().length < 2) {
    return res.status(400).json({
      error: "Requete de recherche trop courte (minimum 2 caracteres)",
      hint: "Exemple: /api/player-search?q=PlayerName",
    });
  }

  try {
    const data = await deadlockGet("/v1/players/search", {
      name: query,
      limit: limit,
    });
    const results = Array.isArray(data) ? data : [];
    return res.json({ query, total: results.length, results });
  } catch (error) {
    return res.status(error.status || 500).json({
      error: "Impossible de rechercher le joueur",
      details: error.body || String(error),
    });
  }
});

app.get("/api/player-info", async (req, res) => {
  const accountId = Number(req.query.accountId);

  if (!Number.isInteger(accountId) || accountId < 0) {
    return res.status(400).json({
      error: "accountId invalide",
      hint: "Exemple: /api/player-info?accountId=178737114",
    });
  }

  try {
    const data = await deadlockGet(`/v1/players/${accountId}`);
    return res.json(data);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: "Impossible de recuperer les informations du joueur",
      details: error.body || String(error),
    });
  }
});

app.get("/api/match-history", async (req, res) => {
  const accountId = Number(req.query.accountId);
  const onlyStored = req.query.onlyStored !== "false";

  if (!Number.isInteger(accountId) || accountId < 0) {
    return res.status(400).json({
      error: "accountId invalide",
      hint: "Exemple: /api/match-history?accountId=178737114&onlyStored=true",
    });
  }

  try {
    const [matchHistory, playerInfo] = await Promise.all([
      deadlockGet(`/v1/players/${accountId}/match-history`, {
        only_stored_history: onlyStored,
      }),
      deadlockGet(`/v1/players/${accountId}`).catch(() => null),
    ]);
    const history = Array.isArray(matchHistory) ? matchHistory.slice(0, 30) : [];
    const playerName = playerInfo?.account_name || playerInfo?.persona_name || null;
    return res.json({ accountId, playerName, total: history.length, history });
  } catch (error) {
    return res.status(error.status || 500).json({
      error: "Impossible de recuperer l'historique",
      details: error.body || String(error),
    });
  }
});

app.get("/api/coach-report", async (req, res) => {
  const accountId = Number(req.query.accountId);
  const matches = Math.min(Math.max(Number(req.query.matches || 30), 10), 100);

  if (!Number.isInteger(accountId) || accountId < 0) {
    return res.status(400).json({
      error: "accountId invalide",
      hint: "Exemple: /api/coach-report?accountId=178737114&matches=30",
    });
  }

  try {
    const [matchHistory, mmrHistory, playerInfo] = await Promise.all([
      deadlockGet(`/v1/players/${accountId}/match-history`, { only_stored_history: true }),
      deadlockGet(`/v1/players/${accountId}/mmr-history`),
      deadlockGet(`/v1/players/${accountId}`).catch(() => null),
    ]);

    const trimmedHistory = Array.isArray(matchHistory) ? matchHistory.slice(0, matches) : [];
    const report = analyzeMatchHistory(trimmedHistory, mmrHistory);
    const playerName = playerInfo?.account_name || playerInfo?.persona_name || null;

    return res.json({
      accountId,
      playerName,
      generatedAt: new Date().toISOString(),
      report,
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      error: "Impossible de generer le rapport de coaching",
      details: error.body || String(error),
    });
  }
});

app.get("/api/match/:matchId", async (req, res) => {
  const matchId = Number(req.params.matchId);
  if (!Number.isInteger(matchId) || matchId <= 0) {
    return res.status(400).json({ error: "matchId invalide" });
  }

  try {
    const data = await deadlockGet(`/v1/matches/${matchId}/metadata`, {
      include_player_info: true,
      include_player_items: true,
      include_player_stats: true,
    });
    return res.json(data);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: "Impossible de rÃ©cupÃ©rer les dÃ©tails du match",
      details: error.body || String(error),
    });
  }
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "index.html"));
});

app.listen(port, () => {
  console.log(`Deadlock API Explorer en ligne sur http://localhost:${port}`);
});

