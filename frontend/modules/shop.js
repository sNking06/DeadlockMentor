import { state } from './state.js';
import { escapeHtml } from './utils.js';

const RESALE_RATE = 0.5;
const DEFAULT_CATEGORY = 'all';
const DEFAULT_TIER = 'all';

const CATEGORY_OPTIONS = [
  { key: 'all', label: 'Tous' },
  { key: 'weapon', label: 'Weapon' },
  { key: 'vitality', label: 'Vitality' },
  { key: 'spirit', label: 'Spirit' },
  { key: 'other', label: 'Autres' },
];

const TIER_OPTIONS = [
  { key: 'all', label: 'Tous les tiers' },
  { key: 't1', label: 'Tier 1' },
  { key: 't2', label: 'Tier 2' },
  { key: 't3', label: 'Tier 3' },
  { key: 't4', label: 'Tier 4' },
];

const shopState = {
  inventory: new Map(),
  totalSpent: 0,
  totalEarned: 0,
  startingSouls: 3000,
  activeCategory: DEFAULT_CATEGORY,
  activeTier: DEFAULT_TIER,
  lastClickedItemId: null,
};

const refs = {
  searchInput: null,
  startingSoulsInput: null,
  categoryFilters: null,
  tierFilters: null,
  feedback: null,
  grid: null,
  ownedList: null,
  totalSpent: null,
  totalEarned: null,
  currentValue: null,
  currentSouls: null,
  totalWorth: null,
  netValue: null,
};

export function initShopTab() {
  refs.searchInput = document.getElementById('shop-item-search');
  refs.startingSoulsInput = document.getElementById('shop-starting-souls');
  refs.categoryFilters = document.getElementById('shop-category-filters');
  refs.tierFilters = document.getElementById('shop-tier-filters');
  refs.feedback = document.getElementById('shop-feedback');
  refs.grid = document.getElementById('shop-grid');
  refs.ownedList = document.getElementById('shop-owned-list');
  refs.totalSpent = document.getElementById('shop-total-spent');
  refs.totalEarned = document.getElementById('shop-total-earned');
  refs.currentValue = document.getElementById('shop-current-value');
  refs.currentSouls = document.getElementById('shop-current-souls');
  refs.totalWorth = document.getElementById('shop-total-worth');
  refs.netValue = document.getElementById('shop-net-value');

  if (!refs.grid) return;

  refs.searchInput?.addEventListener('input', () => renderShopGrid());
  refs.startingSoulsInput?.addEventListener('input', () => {
    shopState.startingSouls = getNonNegativeNumber(refs.startingSoulsInput?.value, 3000);
    renderSummary();
  });

  renderFilterButtons();
  renderShopGrid();
  renderOwnedList();
  renderSummary();
}

function renderFilterButtons() {
  if (refs.categoryFilters) {
    refs.categoryFilters.innerHTML = CATEGORY_OPTIONS.map((option) => `
      <button type="button" class="shop-filter-btn${shopState.activeCategory === option.key ? ' is-active' : ''}" data-shop-category="${option.key}">
        ${escapeHtml(option.label)}
      </button>
    `).join('');

    refs.categoryFilters.querySelectorAll('[data-shop-category]').forEach((button) => {
      button.addEventListener('click', () => {
        shopState.activeCategory = button.dataset.shopCategory || DEFAULT_CATEGORY;
        renderFilterButtons();
        renderShopGrid();
      });
    });
  }

  if (refs.tierFilters) {
    refs.tierFilters.innerHTML = TIER_OPTIONS.map((option) => `
      <button type="button" class="shop-filter-btn${shopState.activeTier === option.key ? ' is-active' : ''}" data-shop-tier="${option.key}">
        ${escapeHtml(option.label)}
      </button>
    `).join('');

    refs.tierFilters.querySelectorAll('[data-shop-tier]').forEach((button) => {
      button.addEventListener('click', () => {
        shopState.activeTier = button.dataset.shopTier || DEFAULT_TIER;
        renderFilterButtons();
        renderShopGrid();
      });
    });
  }
}

function getNonNegativeNumber(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
}

function getTradableItems() {
  return state.itemsListCache
    .filter((item) => Number(item?.cost) > 0)
    .sort((a, b) => Number(a?.cost || 0) - Number(b?.cost || 0));
}

function renderShopGrid() {
  if (!refs.grid) return;
  const query = String(refs.searchInput?.value || '').trim().toLowerCase();

  const items = getTradableItems().filter((item) => {
    const name = String(item?.name || '').toLowerCase();
    if (query && !name.includes(query)) return false;
    if (!matchesCategory(item, shopState.activeCategory)) return false;
    if (!matchesTier(item, shopState.activeTier)) return false;
    return true;
  });

  if (!items.length) {
    refs.grid.innerHTML = '<div class="empty-row">Aucun item trouvé pour ces filtres.</div>';
    return;
  }

  refs.grid.innerHTML = items.map((item) => {
    const id = Number(item.id);
    const owned = getOwnedQuantity(id);
    const isLastClicked = shopState.lastClickedItemId === id;
    const image = item.shop_image_small || item.shop_image || item.image_webp || item.image || '';
    const itemName = item.name || `Item #${id}`;

    return `
      <button type="button" class="shop-item-tile${owned > 0 ? ' is-owned' : ''}${isLastClicked ? ' is-last-clicked' : ''}" data-shop-item-id="${id}">
        <span class="shop-item-tier">${escapeHtml(getTierLabel(item))}</span>
        <span class="shop-item-img-wrap">
          ${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(itemName)}" loading="lazy" />` : '<span class="shop-item-fallback">?</span>'}
        </span>
        <span class="shop-item-name">${escapeHtml(itemName)}</span>
        <span class="shop-item-cost">${formatSouls(item.cost)}</span>
        ${owned > 0 ? `<span class="shop-item-owned">x${owned}</span>` : ''}
      </button>
    `;
  }).join('');

  refs.grid.querySelectorAll('[data-shop-item-id]').forEach((button) => {
    button.addEventListener('click', () => {
      const itemId = Number(button.dataset.shopItemId);
      onItemTileClick(itemId);
    });
  });
}

function onItemTileClick(itemId) {
  const item = state.itemsMap[itemId];
  if (!item || Number(item.cost) <= 0) return;

  const owned = getOwnedQuantity(itemId);
  const shouldSell = owned > 0 && shopState.lastClickedItemId === itemId;

  if (shouldSell) {
    executeTrade('sell', itemId, 1);
  } else {
    executeTrade('buy', itemId, 1);
  }

  shopState.lastClickedItemId = itemId;
  renderShopGrid();
}

function executeTrade(type, itemId, quantity) {
  const item = state.itemsMap[itemId];
  if (!item || Number(item?.cost) <= 0) {
    setFeedback("Choisis un item valide d'abord.", 'error');
    return;
  }

  const existing = shopState.inventory.get(itemId) || {
    itemId,
    name: item.name || `Item #${itemId}`,
    cost: Number(item.cost) || 0,
    quantity: 0,
  };

  const buyCost = existing.cost * quantity;
  const sellRevenue = Math.round(existing.cost * RESALE_RATE) * quantity;
  const currentSouls = getCurrentSouls();

  if (type === 'sell' && existing.quantity < quantity) {
    setFeedback(`Impossible de vendre ${quantity}x ${existing.name} (stock: ${existing.quantity}).`, 'error');
    return;
  }

  if (type === 'buy' && currentSouls < buyCost) {
    setFeedback(`Pas assez de souls (${formatSouls(currentSouls)} disponibles).`, 'error');
    return;
  }

  if (type === 'buy') {
    existing.quantity += quantity;
    shopState.totalSpent += buyCost;
    setFeedback(`Achat: ${existing.name} pour ${formatSouls(buyCost)}.`, 'ok');
  } else {
    existing.quantity -= quantity;
    shopState.totalEarned += sellRevenue;
    setFeedback(`Vente: ${existing.name} pour ${formatSouls(sellRevenue)} (${Math.round(RESALE_RATE * 100)}%).`, 'warn');
  }

  if (existing.quantity <= 0) {
    shopState.inventory.delete(itemId);
  } else {
    shopState.inventory.set(itemId, existing);
  }

  renderOwnedList();
  renderSummary();
}

function renderOwnedList() {
  if (!refs.ownedList) return;
  const entries = Array.from(shopState.inventory.values()).sort((a, b) => b.cost - a.cost);
  if (!entries.length) {
    refs.ownedList.innerHTML = '<div class="empty-row">Aucun item acheté.</div>';
    return;
  }

  refs.ownedList.innerHTML = entries.map((entry) => `
    <button type="button" class="shop-owned-chip" data-shop-owned-id="${entry.itemId}">
      <span>${escapeHtml(entry.name)}</span>
      <b>x${entry.quantity}</b>
    </button>
  `).join('');

  refs.ownedList.querySelectorAll('[data-shop-owned-id]').forEach((button) => {
    button.addEventListener('click', () => {
      const itemId = Number(button.dataset.shopOwnedId);
      executeTrade('sell', itemId, 1);
      shopState.lastClickedItemId = itemId;
      renderShopGrid();
    });
  });
}

function getOwnedQuantity(itemId) {
  return shopState.inventory.get(itemId)?.quantity || 0;
}

function getCurrentSouls() {
  return shopState.startingSouls - shopState.totalSpent + shopState.totalEarned;
}

function renderSummary() {
  const currentValue = Array.from(shopState.inventory.values()).reduce((sum, row) => sum + (row.quantity * row.cost), 0);
  const currentSouls = getCurrentSouls();
  const totalWorth = currentSouls + currentValue;
  const realizedNet = shopState.totalEarned - shopState.totalSpent;

  if (refs.totalSpent) refs.totalSpent.textContent = formatSouls(shopState.totalSpent);
  if (refs.totalEarned) refs.totalEarned.textContent = formatSouls(shopState.totalEarned);
  if (refs.currentValue) refs.currentValue.textContent = formatSouls(currentValue);
  if (refs.currentSouls) refs.currentSouls.textContent = formatSouls(currentSouls);
  if (refs.totalWorth) refs.totalWorth.textContent = formatSouls(totalWorth);
  if (refs.netValue) refs.netValue.textContent = formatSouls(realizedNet);

  refs.currentSouls?.classList.toggle('is-negative', currentSouls < 0);
  refs.currentSouls?.classList.toggle('is-positive', currentSouls >= 0);
  refs.totalWorth?.classList.toggle('is-negative', totalWorth < 0);
  refs.totalWorth?.classList.toggle('is-positive', totalWorth >= 0);
  refs.netValue?.classList.toggle('is-positive', realizedNet >= 0);
  refs.netValue?.classList.toggle('is-negative', realizedNet < 0);
}

function setFeedback(message, tone = '') {
  if (!refs.feedback) return;
  refs.feedback.textContent = message;
  refs.feedback.dataset.tone = tone;
}

function formatSouls(value) {
  const amount = Math.round(Number(value) || 0);
  return `${amount.toLocaleString('fr-FR')} souls`;
}

function getTierLabel(item) {
  const cost = Number(item?.cost || 0);
  if (cost <= 800) return 'Tier 1';
  if (cost <= 2000) return 'Tier 2';
  if (cost <= 4000) return 'Tier 3';
  return 'Tier 4';
}

function matchesTier(item, tierKey) {
  if (tierKey === 'all') return true;
  const label = getTierLabel(item).toLowerCase().replace(' ', '');
  return label === tierKey;
}

function matchesCategory(item, categoryKey) {
  if (categoryKey === 'all') return true;

  const haystack = [
    item?.name,
    item?.class_name,
    item?.category,
    item?.type,
    item?.item_type,
    item?.item_slot_type,
    item?.shop_section,
    item?.weapon_stat,
    item?.description,
  ].map((v) => String(v || '').toLowerCase()).join(' ');

  if (categoryKey === 'weapon') return /weapon|bullet|ammo|gun|shot/.test(haystack);
  if (categoryKey === 'vitality') return /vitality|health|armor|resist|surviv|durab|shield/.test(haystack);
  if (categoryKey === 'spirit') return /spirit|magic|ability|cooldown|energy|mystic/.test(haystack);
  if (categoryKey === 'other') {
    return !matchesCategory(item, 'weapon') && !matchesCategory(item, 'vitality') && !matchesCategory(item, 'spirit');
  }
  return true;
}
