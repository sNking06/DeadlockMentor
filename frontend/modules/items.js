/* ── Item rendering and tooltip system ───────────────────── */

import { state } from './state.js';
import { escapeHtml, stripHtml, formatNumericValue } from './utils.js';

export function extractFinalItemIds(player = null, maxItems = 16) {
  const rawItems = Array.isArray(player?.items) ? player.items : [];
  if (!rawItems.length) return [];

  const finalItems = rawItems
    .filter((entry) => Number(entry?.sold_time_s ?? 0) === 0)
    .map((entry) => ({
      id: Number(entry?.item_id),
      t: Number(entry?.game_time_s ?? 0),
    }))
    .filter((entry) => Number.isFinite(entry.id) && entry.id > 0);

  if (!finalItems.length) return [];

  finalItems.sort((a, b) => a.t - b.t);

  const seen = new Set();
  const unique = [];
  for (let i = finalItems.length - 1; i >= 0; i -= 1) {
    const id = finalItems[i].id;
    if (seen.has(id)) continue;
    seen.add(id);
    unique.push(id);
    if (unique.length >= maxItems) break;
  }

  return unique.reverse();
}

export function findItemByName(candidates) {
  if (!Array.isArray(state.itemsListCache) || !state.itemsListCache.length) return null;
  const lookup = new Set(candidates.map((c) => String(c).toLowerCase()));
  return state.itemsListCache.find((item) => lookup.has(String(item.name || "").toLowerCase())) || null;
}

export function findItemByExactName(name) {
  const key = String(name || "").toLowerCase();
  if (!key || !Array.isArray(state.itemsListCache)) return null;
  return state.itemsListCache.find((item) => String(item?.name || "").toLowerCase() === key) || null;
}

export function formatItemProperty(item, propertyId) {
  const prop = item?.properties?.[propertyId];
  if (!prop) return null;
  const value = prop.value;
  if (value == null || value === "") return null;
  if (prop.disable_value != null && String(value) === String(prop.disable_value)) return null;

  const label = prop.label || propertyId;
  const formattedValue = formatNumericValue(value);
  if (!formattedValue) return null;
  const postfix = prop.postfix || "";
  return `${formattedValue}${postfix ? postfix : ""} ${label}`;
}

export function getItemTooltipSections(item) {
  const sections = [];
  const sectionNames = {
    innate: "Bonus",
    passive: "Passif",
    active: "Actif",
    conditional: "Conditionnel",
    upgrade: "Upgrade",
  };

  const rawSections = Array.isArray(item?.tooltip_sections) ? item.tooltip_sections : [];
  for (const section of rawSections) {
    const title = sectionNames[section.section_type] || "Effets";
    const lines = [];
    const attrs = Array.isArray(section.section_attributes) ? section.section_attributes : [];
    for (const attr of attrs) {
      const propIds = [
        ...(Array.isArray(attr?.properties) ? attr.properties : []),
        ...(Array.isArray(attr?.important_properties) ? attr.important_properties : []),
      ];
      for (const propId of propIds) {
        const line = formatItemProperty(item, propId);
        if (line && !lines.includes(line)) lines.push(line);
      }

      if (attr?.loc_string) {
        const text = stripHtml(attr.loc_string);
        if (text && !lines.includes(text)) lines.push(text);
      }
    }

    if (lines.length) sections.push({ title, lines });
  }

  if (!sections.length && item?.description?.desc) {
    sections.push({ title: "Description", lines: [stripHtml(item.description.desc)] });
  }
  return sections;
}

export function renderItemTooltip(item, small = false) {
  if (!item) return "";

  const title = escapeHtml(item.name || "Item");
  const cost = Number(item.cost);
  const costText = Number.isFinite(cost) ? cost.toLocaleString("fr-FR") : "-";
  const tier = Number(item.item_tier ?? item.tier ?? 0);
  const sectionHtml = getItemTooltipSections(item)
    .map(
      (section) => `
      <div class="item-tip-section">
        <div class="item-tip-section-title">${escapeHtml(section.title)}</div>
        ${section.lines.map((line) => `<div class="item-tip-line">${escapeHtml(line)}</div>`).join("")}
      </div>`
    )
    .join("");

  return `
    <div class="item-tooltip item-tooltip-rich${small ? " is-small" : ""}">
      <div class="item-tip-head">
        <div class="item-tip-title">${title}</div>
        <div class="item-tip-cost">$ ${costText}</div>
      </div>
      ${tier > 0 ? `<div class="item-tip-tier">Tier ${tier}</div>` : ""}
      ${sectionHtml || `<div class="item-tip-line">Aucun detail disponible.</div>`}
    </div>
  `;
}

export function renderItemIcon(itemId, small = false) {
  const item = state.itemsMap[itemId];
  const cls  = small ? "item-icon-sm" : "item-icon";
  const fbCls = small ? "item-id-fallback-sm" : "item-id-fallback";

  if (item) {
    const src  = item.shop_image_small || item.shop_image || item.image_webp || item.image || "";
    const name = item.name || String(itemId);
    if (src) {
      return `<div class="${cls}">
        <img src="${src}" alt="${name}" />
        ${renderItemTooltip(item, small)}
      </div>`;
    }
    return `<div class="${fbCls}" title="${name}">${String(itemId).slice(-4)}</div>`;
  }
  return `<div class="${fbCls}">${String(itemId).slice(-4)}</div>`;
}

export function renderBuild(itemIds, small = false) {
  if (!Array.isArray(itemIds) || !itemIds.length) {
    return small
      ? `<span class="no-build">Aucun item</span>`
      : `<span style="font-size:12px;color:var(--muted);font-style:italic;">Aucun item</span>`;
  }
  const ids = itemIds
    .map(i => (typeof i === "object" ? (i.item_id ?? i.id ?? i.ability_id ?? i.upgrade_id) : i))
    .filter(v => v != null);
  const stripClass = small ? "player-build" : "build-strip";
  return `<div class="${stripClass}">${ids.map(id => renderItemIcon(id, small)).join("")}</div>`;
}

export function positionTooltipWithinViewport(container) {
  const tooltip = container?.querySelector?.(".item-tooltip");
  if (!tooltip) return;

  tooltip.classList.remove("edge-left", "edge-right", "place-below");

  const margin = 8;
  const rect = tooltip.getBoundingClientRect();
  const modalPanel = container.closest?.(".modal-panel");

  const leftBoundary = modalPanel ? modalPanel.getBoundingClientRect().left + margin : margin;
  const rightBoundary = modalPanel
    ? modalPanel.getBoundingClientRect().right - margin
    : window.innerWidth - margin;

  if (rect.left < leftBoundary) tooltip.classList.add("edge-left");
  if (rect.right > rightBoundary) tooltip.classList.add("edge-right");
  if (rect.top < margin) tooltip.classList.add("place-below");
}

export function bindTooltipAutoPositioning() {
  document.addEventListener(
    "pointerenter",
    (event) => {
      const container = event.target?.closest?.(".item-icon, .item-icon-sm, .itl-item");
      if (!container) return;
      requestAnimationFrame(() => positionTooltipWithinViewport(container));
    },
    true
  );
}

export function extractItemsWithTime(rawItems) {
  if (!Array.isArray(rawItems)) return [];
  return rawItems
    .map((entry) => {
      const itemId = typeof entry === "object" ? (entry.item_id ?? entry.id) : entry;
      const timeS = typeof entry === "object" ? (entry.game_time_s ?? entry.time_s ?? null) : null;
      const soldTime = typeof entry === "object" ? (entry.sold_time_s ?? null) : null;
      return { itemId: Number(itemId), timeS: Number(timeS) || null, soldTime: Number(soldTime) || null };
    })
    .filter((e) => Number.isFinite(e.itemId) && e.itemId > 0);
}

export function renderItemTile(id) {
  const item = state.itemsMap[id];
  if (!item) return `<div class="itl-item itl-unknown">${String(id).slice(-4)}</div>`;
  const src = item.shop_image_small || item.shop_image || item.image_webp || item.image || "";
  const name = escapeHtml(item.name || String(id));
  return `
    <div class="itl-item" title="${name}">
      ${src ? `<img src="${src}" alt="${name}" />` : `<div class="itl-fallback">${String(id).slice(-4)}</div>`}
      ${renderItemTooltip(item, true)}
    </div>
  `;
}
