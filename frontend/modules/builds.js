/* ── Builds tab ──────────────────────────────────────────── */

import { state, CONSTANTS } from './state.js';
import { apiGet } from './api.js';
import { escapeHtml, dateFromUnix, runWithConcurrency } from './utils.js';
import { renderItemIcon } from './items.js';

const { deadlockApiBase } = CONSTANTS;
const defaultBuildsSheetCsvUrl = "https://docs.google.com/spreadsheets/d/1YscI9Yg6SmTfFgX1R51tZaRr2WSgeIIH8P6ZIX6pu-Y/export?format=csv&gid=0";

const buildsSheetUrlInput = document.getElementById("builds-sheet-url");
const buildsCodeInput     = document.getElementById("builds-code-input");
const buildsStatus        = document.getElementById("builds-status");
const buildsGrid          = document.getElementById("builds-grid");
const buildsHeroFilter    = document.getElementById("builds-hero-filter");

function setBuildsStatus(text, isError = false) {
  if (!buildsStatus) return;
  buildsStatus.textContent = text;
  buildsStatus.classList.toggle("is-error", Boolean(isError));
}

function parseCsvRows(csvText) {
  const rows = [];
  let row = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i += 1) {
    const ch = csvText[i];
    const next = csvText[i + 1];

    if (ch === "\"") {
      if (inQuotes && next === "\"") {
        current += "\"";
        i += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }

    if (ch === "," && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }

    if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && next === "\n") i += 1;
      row.push(current);
      rows.push(row);
      row = [];
      current = "";
      continue;
    }

    current += ch;
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    rows.push(row);
  }
  return rows;
}

function parseBuildCodesInput(value) {
  return [...new Set(
    String(value || "")
      .split(/[\s,;|]+/)
      .map((token) => Number(token.trim()))
      .filter((id) => Number.isInteger(id) && id > 0)
  )];
}

function extractBuildCodesFromSheetCsv(csvText) {
  const rows = parseCsvRows(csvText);
  const refs = [];

  rows.forEach((cells, rowIndex) => {
    if (rowIndex === 0 || !cells?.length) return;
    const sheetHero = String(cells[0] || "").trim();
    if (!sheetHero) return;
    const rowTwitchLinks = [cells[3], cells[4]]
      .map((cell) => String(cell || "").trim())
      .filter((cell) => /^(https?:\/\/)?(www\.)?twitch\.tv\//i.test(cell));

    for (let c = 1; c < cells.length; c += 1) {
      const cell = String(cells[c] || "");
      const regex = /([^:,]+?)\s*:\s*(\d{4,})/g;
      let match = null;
      while ((match = regex.exec(cell)) != null) {
        const source = String(match[1] || "").trim();
        const buildId = Number(match[2]);
        if (!Number.isInteger(buildId) || buildId <= 0) continue;
        refs.push({
          buildId,
          sheetHero,
          sheetSource: source || null,
          twitchLinks: rowTwitchLinks,
        });
      }
    }
  });

  const byId = new Map();
  refs.forEach((ref) => {
    if (!byId.has(ref.buildId)) byId.set(ref.buildId, ref);
  });
  return [...byId.values()];
}

function normalizeForMatch(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function normalizeTwitchUrl(rawUrl) {
  const value = String(rawUrl || "").trim();
  if (!value) return null;
  if (/^https?:\/\/(www\.)?twitch\.tv\//i.test(value)) return value;
  if (/^(www\.)?twitch\.tv\//i.test(value)) return `https://${value.replace(/^www\./i, "www.")}`;
  return null;
}

function pickTwitchUrlForSource(source, twitchLinks = []) {
  if (!Array.isArray(twitchLinks) || !twitchLinks.length) return null;
  const normalizedLinks = twitchLinks.map(normalizeTwitchUrl).filter(Boolean);
  if (!normalizedLinks.length) return null;
  const normalizedSource = normalizeForMatch(source);
  if (!normalizedSource) return normalizedLinks[0];

  const direct = normalizedLinks.find((url) => {
    const channel = String(url || "").split("/").pop() || "";
    return normalizeForMatch(channel).includes(normalizedSource) || normalizedSource.includes(normalizeForMatch(channel));
  });
  return direct || normalizedLinks[0];
}

function prettifyBuildCategoryName(rawName) {
  const value = String(rawName || "").trim();
  if (!value) return "Categorie";
  if (value.includes("EarlyGame")) return "Early Game";
  if (value.includes("MidGame")) return "Mid Game";
  if (value.includes("LateGame")) return "Late Game";
  if (value.startsWith("#Citadel_HeroBuilds_")) {
    return value.replace("#Citadel_HeroBuilds_", "").replace(/_/g, " ");
  }
  return value;
}

export function populateBuildsHeroFilter(entries = []) {
  if (!buildsHeroFilter) return;
  const previous = buildsHeroFilter.value;
  const options = [...new Set(entries.map((entry) => Number(entry.heroId)).filter((id) => Number.isFinite(id) && id > 0))]
    .map((heroId) => ({ heroId, label: state.heroesMap[heroId]?.name || `Hero #${heroId}` }))
    .sort((a, b) => a.label.localeCompare(b.label, "fr", { sensitivity: "base" }));

  buildsHeroFilter.innerHTML = [
    `<option value="">Choisir un hero</option>`,
    ...options.map((opt) => `<option value="${opt.heroId}">${escapeHtml(opt.label)}</option>`),
  ].join("");
  buildsHeroFilter.value = options.some((opt) => String(opt.heroId) === String(previous)) ? previous : "";
  buildsHeroFilter.disabled = options.length === 0;
}

function renderBuildsGrid(entries = []) {
  if (!buildsGrid) return;
  if (!entries.length) {
    buildsGrid.innerHTML = `<div class="empty-row">Aucun build ne correspond au filtre courant.</div>`;
    return;
  }

  buildsGrid.innerHTML = entries
    .map((entry) => {
      const hero = state.heroesMap[entry.heroId] || null;
      const heroName = hero?.name || `Hero #${entry.heroId}`;
      const heroIcon = hero?.images?.icon_image_small
        ? `<img class="hero-icon-sm" src="${hero.images.icon_image_small}" alt="${escapeHtml(heroName)}" />`
        : `<span class="history-hero-fallback">#${entry.heroId}</span>`;

      const categoriesHtml = entry.categories.length
        ? entry.categories.map((category) => `
          <section class="build-card-category">
            <h4>${escapeHtml(prettifyBuildCategoryName(category.name))}</h4>
            <div class="build-strip">
              ${category.mods.map((mod) => renderItemIcon(mod.ability_id, true)).join("")}
            </div>
          </section>
        `).join("")
        : `<div class="empty-row">Aucun item dans ce build.</div>`;

      const source = entry.sheetSource ? `${entry.sheetHero || "Sheet"} - ${entry.sheetSource}` : (entry.sheetHero || "Code manuel");
      const published = entry.publishTs ? dateFromUnix(entry.publishTs) : "-";
      const updated = entry.updatedTs ? dateFromUnix(entry.updatedTs) : "-";
      const twitchUrl = entry.twitchUrl || null;

      return `
        <article class="build-card">
          <header class="build-card-head">
            <div class="build-card-title">
              <div class="build-card-hero">${heroIcon}<span>${escapeHtml(heroName)}</span></div>
              <h3>${escapeHtml(entry.name || `Build #${entry.buildId}`)}</h3>
            </div>
            <div class="build-card-code">#${entry.buildId}</div>
          </header>
          <div class="build-card-meta">
            <span>Source: ${escapeHtml(source)}</span>
            <span>Fav: ${Number(entry.favorites || 0)}</span>
            <span>Publie: ${escapeHtml(published)}</span>
            <span>Maj: ${escapeHtml(updated)}</span>
            ${twitchUrl ? `<a class="build-twitch-btn" href="${escapeHtml(twitchUrl)}" target="_blank" rel="noopener noreferrer">Twitch</a>` : ""}
          </div>
          <div class="build-card-body">${categoriesHtml}</div>
        </article>
      `;
    })
    .join("");
}

export function applyBuildsHeroFilter() {
  const selectedHeroId = Number(buildsHeroFilter?.value || 0);
  if (!selectedHeroId) {
    renderBuildsGrid([]);
    setBuildsStatus(state.buildsCatalogLoaded
      ? "Selectionnez un hero pour afficher ses builds."
      : "Chargement du catalogue de builds...");
    return;
  }
  const filtered = selectedHeroId
    ? state.buildsEntriesCache.filter((entry) => Number(entry.heroId) === selectedHeroId)
    : state.buildsEntriesCache;
  renderBuildsGrid(filtered);
  setBuildsStatus(`${filtered.length} build(s) pour ce hero.`);
}

function normalizeBuildEntry(rawBuild, refsByBuildId = new Map()) {
  const heroBuild = rawBuild?.hero_build;
  const buildId = Number(heroBuild?.hero_build_id);
  const heroId = Number(heroBuild?.hero_id);
  if (!Number.isInteger(buildId) || buildId <= 0) return null;
  if (!Number.isInteger(heroId) || heroId <= 0) return null;

  const ref = refsByBuildId.get(buildId) || null;
  const categories = Array.isArray(heroBuild?.details?.mod_categories)
    ? heroBuild.details.mod_categories.map((category) => ({
      name: category?.name || "",
      mods: Array.isArray(category?.mods)
        ? category.mods
          .map((mod) => ({ ability_id: Number(mod?.ability_id), annotation: mod?.annotation || null }))
          .filter((mod) => Number.isFinite(mod.ability_id) && mod.ability_id > 0)
        : [],
    }))
    : [];

  return {
    buildId,
    heroId,
    name: heroBuild?.name || "",
    authorId: Number(heroBuild?.author_account_id || 0) || null,
    favorites: Number(rawBuild?.num_favorites || 0) || 0,
    publishTs: Number(heroBuild?.publish_timestamp || 0) || null,
    updatedTs: Number(heroBuild?.last_updated_timestamp || 0) || null,
    sheetHero: ref?.sheetHero || null,
    sheetSource: ref?.sheetSource || null,
    twitchUrl: pickTwitchUrlForSource(ref?.sheetSource || "", ref?.twitchLinks || []),
    categories,
  };
}

async function fetchBuildByCode(buildId) {
  const data = await apiGet("/builds", { buildId, onlyLatest: true });
  return data || null;
}

async function loadBuildsByCodes(buildIds = [], refsByBuildId = new Map(), statusLabel = "codes") {
  if (!Array.isArray(buildIds) || !buildIds.length) {
    state.buildsEntriesCache = [];
    populateBuildsHeroFilter([]);
    renderBuildsGrid([]);
    setBuildsStatus("Aucun build disponible.", true);
    return;
  }

  setBuildsStatus(`Chargement de ${buildIds.length} build(s) depuis ${statusLabel}...`);
  if (buildsGrid) buildsGrid.innerHTML = `<div class="loading-row"><span class="spinner"></span> Chargement des builds...</div>`;

  const responses = await runWithConcurrency(buildIds, 5, async (buildId) => {
    try {
      return await fetchBuildByCode(buildId);
    } catch (_e) {
      return null;
    }
  });

  const entries = responses
    .map((rawBuild) => normalizeBuildEntry(rawBuild, refsByBuildId))
    .filter(Boolean);

  state.buildsEntriesCache = entries;
  populateBuildsHeroFilter(entries);
  applyBuildsHeroFilter();

  const foundCount = entries.length;
  const missingCount = buildIds.length - foundCount;
  if (missingCount > 0) {
    setBuildsStatus(`Catalogue charge (${foundCount} builds, ${missingCount} introuvables).`, true);
  } else {
    setBuildsStatus(`Catalogue charge (${foundCount} builds).`);
  }
}

async function loadBuildsFromSheet() {
  const sheetUrl = String(buildsSheetUrlInput?.value || defaultBuildsSheetCsvUrl).trim() || defaultBuildsSheetCsvUrl;
  if (buildsSheetUrlInput) buildsSheetUrlInput.value = sheetUrl;

  try {
    setBuildsStatus("Telechargement du Google Sheet...");
    const res = await fetch(sheetUrl, { cache: "no-store" });
    const csvText = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const refs = extractBuildCodesFromSheetCsv(csvText);
    const refsByBuildId = new Map(refs.map((ref) => [ref.buildId, ref]));
    const buildIds = refs.map((ref) => ref.buildId);
    await loadBuildsByCodes(buildIds, refsByBuildId, "Google Sheet");
    state.buildsCatalogLoaded = true;
  } catch (error) {
    state.buildsEntriesCache = [];
    populateBuildsHeroFilter([]);
    renderBuildsGrid([]);
    setBuildsStatus(`Impossible de charger le sheet: ${error.message}`, true);
    state.buildsCatalogLoaded = false;
  }
}

export async function loadBuildsFromCodesInput() {
  const codes = parseBuildCodesInput(buildsCodeInput?.value || "");
  await loadBuildsByCodes(codes, new Map(), "codes manuels");
}

export async function ensureBuildsCatalogLoaded() {
  if (state.buildsCatalogLoaded) return;
  if (state.buildsCatalogPromise) {
    await state.buildsCatalogPromise;
    return;
  }
  state.buildsCatalogPromise = (async () => {
    await loadBuildsFromSheet();
  })();
  try {
    await state.buildsCatalogPromise;
  } finally {
    state.buildsCatalogPromise = null;
  }
}

export async function loadBuildsFromSheet_public() {
  await loadBuildsFromSheet();
}
