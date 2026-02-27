/* ── Entry point (ES Module) ─────────────────────────────── */

/* ── Imports ────────────────────────────────────────────── */
import { initHeroes, initItems, initRanks } from './modules/api.js';
import { populateRankBracketOptions } from './modules/ranks.js';
import { bindTooltipAutoPositioning } from './modules/items.js';
import { loadHealth } from './modules/health.js';
import {
  loadLeaderboard,
  applyLeaderboardHeroFilter,
} from './modules/leaderboard.js';
import {
  homeSearchInput,
  hideHomeSearchResults,
  searchFromHome,
  onHomeSearchSuggestionClick,
  onHomeSearchInputChange,
  loadHomeInsights,
} from './modules/search.js';
import {
  applyBuildsHeroFilter,
  loadBuildsFromCodesInput,
  ensureBuildsCatalogLoaded,
  loadBuildsFromSheet_public,
} from './modules/builds.js';
import { loadTierList, ensureTierListLoaded } from './modules/tierlist.js';
import {
  loadCompositionTierList,
  ensureCompositionTierListLoaded,
} from './modules/compositions.js';
import {
  loadHistory,
  loadMoreHistoryMatches,
  applyHistoryHeroFilter,
} from './modules/history.js';
import {
  loadCoachReport,
  buildCounterRecommendations,
  renderCounterSourcesGroupedByPlayer,
  renderRecommendationItemTitle,
  formatCounterTimeLabel,
} from './modules/coach.js';
import {
  closeMatchModal,
  switchToPlayerProfile,
  openMatchModal,
  setLoadHistory,
  setCoachHelpers,
} from './modules/modal.js';
import {
  applyScoutHeroFilter,
  runScoutAnalysis,
  setOpenMatchModal,
} from './modules/scout.js';
import { initShopTab } from './modules/shop.js';

/* ── Circular dependency injections ─────────────────────── */
setLoadHistory(loadHistory);
setCoachHelpers({
  buildCounterRecommendations,
  renderCounterSourcesGroupedByPlayer,
  renderRecommendationItemTitle,
  formatCounterTimeLabel,
});
setOpenMatchModal(openMatchModal);

/* ── Tab switching ──────────────────────────────────────── */
document.querySelectorAll(".nav-item").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach((b) => b.classList.remove("is-active"));
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("is-active"));
    btn.classList.add("is-active");
    document.getElementById(`tab-${btn.dataset.tab}`)?.classList.add("is-active");
  });
});

/* ── DOM refs ───────────────────────────────────────────── */
const leaderboardBody       = document.getElementById("leaderboard-body");
const leaderboardHeroFilter = document.getElementById("leaderboard-hero-filter");
const historyBody           = document.getElementById("history-body");
const historyLoadMoreBtn    = document.getElementById("history-load-more");
const historyHeroFilter     = document.getElementById("history-hero-filter");
const buildsHeroFilter      = document.getElementById("builds-hero-filter");
const buildsGrid            = document.getElementById("builds-grid");
const buildsSheetUrlInput   = document.getElementById("builds-sheet-url");
const buildsCodeInput       = document.getElementById("builds-code-input");
const buildsLoadSheetBtn    = document.getElementById("btn-builds-sheet");
const buildsLoadCodesBtn    = document.getElementById("btn-builds-codes");
const buildsNavBtn          = document.querySelector('.nav-item[data-tab="builds"]');
const tierListNavBtn        = document.querySelector('.nav-item[data-tab="tierlist"]');
const tierListRefreshBtn    = document.getElementById("btn-tierlist-refresh");
const compositionNavBtn     = document.querySelector('.nav-item[data-tab="compositions"]');
const compositionRefreshBtn = document.getElementById("btn-composition-refresh");
const homeSearchWrap        = document.querySelector(".home-search-wrap");
const homeSearchBtn         = document.getElementById("home-search-btn");
const guideTimerFilterInput = document.getElementById("guide-timer-filter");
const guideTimersTable      = document.getElementById("guide-timers-table");
const scoutBtn              = document.getElementById("scout-btn");
const scoutInput            = document.getElementById("scout-input");
const scoutHeroFilter       = document.getElementById("scout-hero-filter");

/* ── Event Listeners ────────────────────────────────────── */
document.getElementById("btn-health")?.addEventListener("click", loadHealth);
document.getElementById("btn-leaderboard")?.addEventListener("click", loadLeaderboard);
document.getElementById("btn-history")?.addEventListener("click", loadHistory);
document.getElementById("btn-coach")?.addEventListener("click", loadCoachReport);

if (leaderboardHeroFilter) leaderboardHeroFilter.addEventListener("change", applyLeaderboardHeroFilter);
if (historyLoadMoreBtn)    historyLoadMoreBtn.addEventListener("click", loadMoreHistoryMatches);
if (historyHeroFilter)     historyHeroFilter.addEventListener("change", applyHistoryHeroFilter);
if (buildsHeroFilter)      buildsHeroFilter.addEventListener("change", applyBuildsHeroFilter);
if (buildsNavBtn)          buildsNavBtn.addEventListener("click", ensureBuildsCatalogLoaded);
if (tierListNavBtn)        tierListNavBtn.addEventListener("click", ensureTierListLoaded);
if (tierListRefreshBtn)    tierListRefreshBtn.addEventListener("click", loadTierList);
if (compositionNavBtn)     compositionNavBtn.addEventListener("click", ensureCompositionTierListLoaded);
if (compositionRefreshBtn) compositionRefreshBtn.addEventListener("click", loadCompositionTierList);

if (homeSearchBtn) homeSearchBtn.addEventListener("click", () => searchFromHome(switchToPlayerProfile));
if (homeSearchInput) {
  homeSearchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") searchFromHome(switchToPlayerProfile);
  });
  homeSearchInput.addEventListener("input", () => onHomeSearchInputChange(switchToPlayerProfile));
}
if (homeSearchWrap) {
  homeSearchWrap.addEventListener("click", (event) => onHomeSearchSuggestionClick(event, switchToPlayerProfile));
}
document.addEventListener("click", (event) => {
  if (!homeSearchWrap || homeSearchWrap.contains(event.target)) return;
  hideHomeSearchResults();
});

if (guideTimerFilterInput && guideTimersTable) {
  guideTimerFilterInput.addEventListener("input", () => {
    const q = String(guideTimerFilterInput.value || "").trim().toLowerCase();
    guideTimersTable.querySelectorAll("tbody tr").forEach((row) => {
      row.style.display = !q || String(row.textContent || "").toLowerCase().includes(q) ? "" : "none";
    });
  });
}

if (leaderboardBody) {
  leaderboardBody.addEventListener("click", (event) => {
    const target = event.target.closest(".player-link[data-profile-id]");
    if (!target || !leaderboardBody.contains(target)) return;
    const profileId = Number(target.dataset.profileId);
    if (profileId) switchToPlayerProfile(profileId);
  });
}

if (historyBody) {
  historyBody.addEventListener("click", (event) => {
    const card = event.target.closest(".history-match-card.clickable");
    if (!card || !historyBody.contains(card)) return;
    openMatchModal(card.dataset.matchId, card.dataset.accountId);
  });
}

if (scoutBtn)        scoutBtn.addEventListener("click", runScoutAnalysis);
if (scoutInput)      scoutInput.addEventListener("keydown", (e) => { if (e.key === "Enter") runScoutAnalysis(); });
if (scoutHeroFilter) scoutHeroFilter.addEventListener("change", applyScoutHeroFilter);

if (buildsLoadSheetBtn) buildsLoadSheetBtn.addEventListener("click", loadBuildsFromSheet_public);
if (buildsLoadCodesBtn) buildsLoadCodesBtn.addEventListener("click", loadBuildsFromCodesInput);

/* ── Modal close button ─────────────────────────────────── */
document.getElementById("modal-close")?.addEventListener("click", closeMatchModal);
document.getElementById("match-modal")?.addEventListener("click", (event) => {
  if (event.target === event.currentTarget) closeMatchModal();
});

/* ── Init ───────────────────────────────────────────────── */
async function init() {
  await Promise.all([initHeroes(), initItems(), initRanks()]);

  const tierListRankBracketSelect    = document.getElementById("tierlist-rank-bracket");
  const compositionRankBracketSelect = document.getElementById("composition-rank-bracket");
  populateRankBracketOptions(tierListRankBracketSelect);
  populateRankBracketOptions(compositionRankBracketSelect);

  if (buildsHeroFilter) {
    buildsHeroFilter.disabled = true;
    buildsHeroFilter.innerHTML = `<option value="">Choisir un hero</option>`;
  }
  if (buildsGrid) {
    buildsGrid.innerHTML = `<div class="empty-row">Selectionnez un hero pour voir les builds.</div>`;
  }
  const buildsStatus = document.getElementById("builds-status");
  if (buildsStatus) buildsStatus.textContent = "Chargement du catalogue de builds...";

  bindTooltipAutoPositioning();
  initShopTab();
  loadHealth();
  loadHomeInsights();
}

init();
