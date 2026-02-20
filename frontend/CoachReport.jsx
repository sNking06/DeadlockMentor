import React, { useState, useEffect } from 'react';
import { StatCard } from './components/StatCard';
import { Finding } from './components/Finding';

// Note: heroesMap devrait être chargé globalement ou via un contexte React
const heroesMap = {}; // Supposons qu'il soit chargé ailleurs

async function fetchJsonOrThrow(url) {
  const res = await fetch(url);
  if (!res.ok) {
    const errorBody = await res.json().catch(() => res.text());
    const error = new Error(`HTTP ${res.status} - ${JSON.stringify(errorBody)}`);
    error.status = res.status;
    throw error;
  }
  return res.json();
}

export function CoachReport({ accountId, matches }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!accountId) {
      setReport(null);
      setLoading(false);
      setError({ message: "Account ID invalide." });
      return;
    }

    async function loadReport() {
      setLoading(true);
      setError(null);
      try {
        // On appelle NOTRE backend, qui fait le travail d'analyse
        const data = await fetchJsonOrThrow(`/api/coach-report?accountId=${accountId}&matches=${matches}`);
        setReport(data);
      } catch (e) {
        setError(e);
      } finally {
        setLoading(false);
      }
    }

    loadReport();
  }, [accountId, matches]); // Se relance si l'ID ou le nombre de matchs change

  if (loading) {
    return <div className="loading-row"><span className="spinner"></span> Analyse en cours…</div>;
  }

  if (error) {
    return <div className="error-block">Erreur : {error.message}</div>;
  }

  if (!report || !report.report) {
    return <div className="empty-row">Aucun rapport à afficher.</div>;
  }

  const { summary, trend, mmrTrend, heroStats, findings } = report.report;

  // --- Fonctions d'aide pour le formatage (pourraient être dans un fichier utilitaire) ---
  const fmt = (v, decimals = 2) => (v != null ? (+v).toFixed(decimals) : "—");
  const fmtDelta = (v, decimals = 1) => {
    if (v == null) return { text: "—", cls: "" };
    const fixed = (+v).toFixed(decimals);
    return {
      text: `${+v > 0 ? "+" : ""}${fixed}%`,
      cls: +v > 0 ? "pos" : +v < 0 ? "neg" : "",
    };
  };
  const mmrDelta = mmrTrend.deltaRank != null
    ? { text: `${mmrTrend.deltaRank > 0 ? "+" : ""}${mmrTrend.deltaRank}`, cls: mmrTrend.deltaRank > 0 ? "pos" : mmrTrend.deltaRank < 0 ? "neg" : "" }
    : { text: "—", cls: "" };

  const topHeroId = heroStats.topHero?.heroId;
  const topHero = topHeroId ? heroesMap[topHeroId] : null;
  const topHeroDisplay = topHero?.images?.icon_image_small
    ? `<div class="hero-list"><img src="${topHero.images.icon_image_small}" alt="${topHero.name}" title="${topHero.name}" class="hero-icon-sm" /> <span>${topHero.name}</span></div>`
    : (topHeroId || "—");

  const stats = [
    { label: "Matchs analysés", value: summary.matchesAnalyzed ?? "—" },
    { label: "KDA moyen", value: fmt(summary.kdaAvg) },
    { label: "Décès / 10 min", value: fmt(summary.deathsPer10Avg, 1) },
    { label: "Farm / min (LH)", value: fmt(summary.lhPerMinAvg, 1) },
    { label: "Or / min", value: summary.netWorthPerMinAvg != null ? Math.round(summary.netWorthPerMinAvg) : "—" },
    { label: "Δ KDA tendance", value: fmtDelta(trend.kdaDeltaPct).text, cls: fmtDelta(trend.kdaDeltaPct).cls },
    { label: "Δ Décès tendance", value: fmtDelta(trend.deathsDeltaPct).text, cls: fmtDelta(trend.deathsDeltaPct).cls },
    { label: "Δ Rang MMR", value: mmrDelta.text, cls: mmrDelta.cls },
    { label: "Héros uniques", value: heroStats.uniqueHeroes ?? "—" },
    { label: "Top Héros", value: topHeroDisplay },
    { label: "Part héro #1", value: heroStats.topHeroSharePct != null ? `${Math.round(heroStats.topHeroSharePct)}%` : "—" },
  ];

  return (
    <>
      {report.playerName && (
        <div id="coachPlayerInfoDisplay" style={{ display: 'block' }}>
          <span id="coachPlayerInfoName">{report.playerName}</span>
          <span id="coachPlayerInfoId"> (#{report.accountId})</span>
        </div>
      )}
      <div id="coach-stats-grid" className="stats-grid">
        {stats.map(s => (
          <StatCard key={s.label} label={s.label} value={s.value} valueClassName={s.cls} />
        ))}
      </div>
      <div id="coach-findings">
        {findings && findings.length > 0 ? (
          findings.map((f, index) => <Finding key={f.code || index} finding={f} />)
        ) : (
          <div className="success-block">✓ Aucun problème majeur détecté.</div>
        )}
      </div>
    </>
  );
}