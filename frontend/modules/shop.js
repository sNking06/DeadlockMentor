/* ── Shop Simulator ───────────────────────────────────────── */

import { state } from './state.js';
import { escapeHtml } from './utils.js';

// ── Constants ─────────────────────────────────────────────

const RESALE_RATE = 0.8; // 80 % du prix de base récupéré à la vente

const DEFAULT_CATEGORY = 'all';
const DEFAULT_TIER     = 'all';

const CATEGORY_OPTIONS = [
  { key: 'all',      label: 'Tous' },
  { key: 'weapon',   label: 'Weapon' },
  { key: 'vitality', label: 'Vitality' },
  { key: 'spirit',   label: 'Spirit' },
  { key: 'other',    label: 'Autres' },
];

const TIER_OPTIONS = [
  { key: 'all', label: 'Tous les tiers' },
  { key: 't1',  label: 'Tier 1' },
  { key: 't2',  label: 'Tier 2' },
  { key: 't3',  label: 'Tier 3' },
  { key: 't4',  label: 'Tier 4' },
];

/**
 * Fallback items utilisés si state.itemsListCache est vide
 * (par exemple lors d'un rechargement à froid ou d'un bug API).
 */
const FALLBACK_ITEMS = [
  { id: 900001, name: 'Close Quarters',       cost: 500,  fallbackCategory: 'weapon'   },
  { id: 900002, name: 'Headshot Booster',     cost: 500,  fallbackCategory: 'weapon'   },
  { id: 900003, name: 'Restorative Shot',     cost: 500,  fallbackCategory: 'vitality' },
  { id: 900004, name: 'High-Velocity Rounds', cost: 500,  fallbackCategory: 'weapon'   },
  { id: 900005, name: 'Fleetfoot',            cost: 1250, fallbackCategory: 'spirit'   },
  { id: 900006, name: 'Mystic Shot',          cost: 1250, fallbackCategory: 'spirit'   },
  { id: 900007, name: 'Titanic Magazine',     cost: 1250, fallbackCategory: 'weapon'   },
  { id: 900008, name: 'Slowing Bullets',      cost: 1250, fallbackCategory: 'weapon'   },
  { id: 900009, name: 'Berserker',            cost: 3000, fallbackCategory: 'vitality' },
  { id: 900010, name: 'Headhunter',           cost: 3000, fallbackCategory: 'weapon'   },
  { id: 900011, name: 'Tesla Bullets',        cost: 3000, fallbackCategory: 'spirit'   },
  { id: 900012, name: 'Spirit Rend',          cost: 3000, fallbackCategory: 'spirit'   },
  { id: 900013, name: 'Crippling Headshot',   cost: 6200, fallbackCategory: 'weapon'   },
  { id: 900014, name: 'Silencer',             cost: 6200, fallbackCategory: 'weapon'   },
  { id: 900015, name: 'Spellslinger',         cost: 6200, fallbackCategory: 'spirit'   },
  { id: 900016, name: 'Spiritual Overflow',   cost: 6200, fallbackCategory: 'spirit'   },
];

// ── Module-level state ────────────────────────────────────

/**
 * @typedef {{ itemId: number, name: string, cost: number, quantity: number }} InventoryEntry
 *
 * inventory : Map<itemId, InventoryEntry>
 * totalSpent  : somme des coûts d'achat (avant revente)
 * totalEarned : somme des recettes de vente
 * startingSouls : souls de départ configurables
 * activeCategory / activeTier : filtres courants
 * lastClickedItemId : dernier item cliqué dans la grille
 *   → permet le double-clic (1er clic = achat, 2e clic = vente si possédé)
 */
const shopState = {
  /** @type {Map<number, InventoryEntry>} */
  inventory:        new Map(),
  totalSpent:       0,
  totalEarned:      0,
  startingSouls:    3000,
  activeCategory:   DEFAULT_CATEGORY,
  activeTier:       DEFAULT_TIER,
  lastClickedItemId: null,
};

// ── DOM refs (populated in initShopTab) ──────────────────

const refs = {
  searchInput:       /** @type {HTMLInputElement|null}  */ (null),
  startingSoulsInput:/** @type {HTMLInputElement|null}  */ (null),
  categoryFilters:   /** @type {HTMLElement|null}       */ (null),
  tierFilters:       /** @type {HTMLElement|null}       */ (null),
  feedback:          /** @type {HTMLElement|null}       */ (null),
  grid:              /** @type {HTMLElement|null}       */ (null),
  ownedList:         /** @type {HTMLElement|null}       */ (null),
  totalSpent:        /** @type {HTMLElement|null}       */ (null),
  totalEarned:       /** @type {HTMLElement|null}       */ (null),
  currentValue:      /** @type {HTMLElement|null}       */ (null),
  currentSouls:      /** @type {HTMLElement|null}       */ (null),
  totalWorth:        /** @type {HTMLElement|null}       */ (null),
  netValue:          /** @type {HTMLElement|null}       */ (null),
};

// ── Public entry point ────────────────────────────────────

/**
 * Initialise le Shop Simulator.
 * - Récupère les refs DOM
 * - Branche tous les event listeners
 * - Lance le premier rendu
 */
export function initShopTab() {
  refs.searchInput        = document.getElementById('shop-item-search');
  refs.startingSoulsInput = document.getElementById('shop-starting-souls');
  refs.categoryFilters    = document.getElementById('shop-category-filters');
  refs.tierFilters        = document.getElementById('shop-tier-filters');
  refs.feedback           = document.getElementById('shop-feedback');
  refs.grid               = document.getElementById('shop-grid');
  refs.ownedList          = document.getElementById('shop-owned-list');
  refs.totalSpent         = document.getElementById('shop-total-spent');
  refs.totalEarned        = document.getElementById('shop-total-earned');
  refs.currentValue       = document.getElementById('shop-current-value');
  refs.currentSouls       = document.getElementById('shop-current-souls');
  refs.totalWorth         = document.getElementById('shop-total-worth');
  refs.netValue           = document.getElementById('shop-net-value');

  // Garde-fou : si le conteneur principal est absent, on abandonne silencieusement.
  if (!refs.grid) return;

  // Initialise startingSouls depuis la valeur HTML (input value="3000")
  shopState.startingSouls = getNonNegativeInt(refs.startingSoulsInput?.value, 3000);

  // Listener — recherche par nom
  refs.searchInput?.addEventListener('input', renderShopGrid);

  // Listener — souls de départ
  refs.startingSoulsInput?.addEventListener('input', () => {
    shopState.startingSouls = getNonNegativeInt(refs.startingSoulsInput?.value, 3000);
    renderSummary();
  });

  // Rendu initial
  renderFilterButtons();
  renderShopGrid();
  renderOwnedList();
  renderSummary();
}

// ── Filter buttons ────────────────────────────────────────

function renderFilterButtons() {
  if (refs.categoryFilters) {
    refs.categoryFilters.innerHTML = CATEGORY_OPTIONS.map((opt) =>
      `<button type="button"
         class="shop-filter-btn${shopState.activeCategory === opt.key ? ' is-active' : ''}"
         data-shop-category="${escapeHtml(opt.key)}">
         ${escapeHtml(opt.label)}
       </button>`
    ).join('');

    refs.categoryFilters.querySelectorAll('[data-shop-category]').forEach((btn) => {
      btn.addEventListener('click', () => {
        shopState.activeCategory = btn.dataset.shopCategory || DEFAULT_CATEGORY;
        renderFilterButtons();
        renderShopGrid();
      });
    });
  }

  if (refs.tierFilters) {
    refs.tierFilters.innerHTML = TIER_OPTIONS.map((opt) =>
      `<button type="button"
         class="shop-filter-btn${shopState.activeTier === opt.key ? ' is-active' : ''}"
         data-shop-tier="${escapeHtml(opt.key)}">
         ${escapeHtml(opt.label)}
       </button>`
    ).join('');

    refs.tierFilters.querySelectorAll('[data-shop-tier]').forEach((btn) => {
      btn.addEventListener('click', () => {
        shopState.activeTier = btn.dataset.shopTier || DEFAULT_TIER;
        renderFilterButtons();
        renderShopGrid();
      });
    });
  }
}

// ── Shop grid ─────────────────────────────────────────────

function renderShopGrid() {
  if (!refs.grid) return;

  const query = String(refs.searchInput?.value || '').trim().toLowerCase();

  const items = getShopableItems().filter((item) => {
    if (query && !String(item.name || '').toLowerCase().includes(query)) return false;
    if (!matchesCategory(item, shopState.activeCategory)) return false;
    if (!matchesTier(item, shopState.activeTier)) return false;
    return true;
  });

  if (!items.length) {
    refs.grid.innerHTML = '<div class="empty-row">Aucun item trouvé pour ces filtres.</div>';
    return;
  }

  refs.grid.innerHTML = items.map((item) => renderItemTile(item)).join('');

  refs.grid.querySelectorAll('[data-shop-item-id]').forEach((btn) => {
    btn.addEventListener('click', () => onGridItemClick(Number(btn.dataset.shopItemId)));
  });
}

/**
 * Construit le HTML d'une tuile d'item dans la grille.
 * @param {object} item
 * @returns {string}
 */
function renderItemTile(item) {
  const id   = Number(item.id);
  const qty  = getOwnedQuantity(id);
  const isOwned       = qty > 0;
  const isLastClicked = shopState.lastClickedItemId === id;

  const image    = item.shop_image_small || item.shop_image || item.image_webp || item.image
                 || (item.images?.icon_image_small) || '';
  const itemName = item.name || `Item #${id}`;
  const tierLabel = getTierLabel(item);

  // Indice visuel : si c'est le dernier item cliqué et qu'on le possède,
  // le prochain clic déclenchera une vente.
  const willSell = isOwned && isLastClicked;

  return `
    <button type="button"
      class="shop-item-tile${isOwned ? ' is-owned' : ''}${willSell ? ' will-sell' : ''}"
      data-shop-item-id="${id}"
      title="${escapeHtml(itemName)} — ${formatSouls(item.cost)}${willSell ? ' (cliquer pour vendre)' : ''}">
      <span class="shop-item-tier">${escapeHtml(tierLabel)}</span>
      <span class="shop-item-img-wrap">
        ${image
          ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(itemName)}" loading="lazy" />`
          : `<span class="shop-item-fallback">?</span>`}
      </span>
      <span class="shop-item-name">${escapeHtml(itemName)}</span>
      <span class="shop-item-cost">${formatSouls(item.cost)}</span>
      ${isOwned ? `<span class="shop-item-owned">x${qty}</span>` : ''}
    </button>
  `;
}

/**
 * Gère le clic sur une tuile de la grille.
 *
 * Comportement :
 *   - 1er clic (ou item différent) → achat
 *   - 2e clic sur le même item déjà possédé → vente (1 exemplaire)
 *
 * @param {number} itemId
 */
function onGridItemClick(itemId) {
  const item = state.itemsMap[itemId];
  if (!item || !(Number(item.cost) > 0)) return;

  const owned      = getOwnedQuantity(itemId);
  const isRepeat   = shopState.lastClickedItemId === itemId;
  const shouldSell = owned > 0 && isRepeat;

  executeTrade(shouldSell ? 'sell' : 'buy', itemId, 1);
  shopState.lastClickedItemId = itemId;

  // Re-rendu de la grille pour mettre à jour les indicateurs visuels
  renderShopGrid();
}

// ── Trade logic ───────────────────────────────────────────

/**
 * Exécute un achat ou une vente d'un item.
 *
 * @param {'buy'|'sell'} type
 * @param {number} itemId
 * @param {number} quantity
 */
function executeTrade(type, itemId, quantity) {
  const item = state.itemsMap[itemId];
  if (!item || !(Number(item.cost) > 0)) {
    setFeedback("Item invalide ou introuvable.", 'error');
    return;
  }

  const baseCost = Number(item.cost);
  const existing = shopState.inventory.get(itemId) ?? {
    itemId,
    name:     item.name || `Item #${itemId}`,
    cost:     baseCost,
    quantity: 0,
  };

  const buyCost     = baseCost * quantity;
  const sellRevenue = Math.round(baseCost * RESALE_RATE) * quantity;
  const soulsAvail  = computeCurrentSouls();

  if (type === 'sell') {
    if (existing.quantity < quantity) {
      setFeedback(
        `Impossible de vendre ${quantity}x "${existing.name}" (inventaire: ${existing.quantity}).`,
        'error'
      );
      return;
    }
    existing.quantity    -= quantity;
    shopState.totalEarned += sellRevenue;
    setFeedback(
      `Vendu: "${existing.name}" — +${formatSouls(sellRevenue)} (${Math.round(RESALE_RATE * 100)}% remboursé).`,
      'warn'
    );
  } else {
    // type === 'buy'
    if (soulsAvail < buyCost) {
      setFeedback(
        `Pas assez de souls — il te manque ${formatSouls(buyCost - soulsAvail)}.`,
        'error'
      );
      return;
    }
    existing.quantity   += quantity;
    shopState.totalSpent += buyCost;
    setFeedback(
      `Acheté: "${existing.name}" pour ${formatSouls(buyCost)}.`,
      'ok'
    );
  }

  // Retire l'entrée si quantité tombe à 0
  if (existing.quantity <= 0) {
    shopState.inventory.delete(itemId);
  } else {
    shopState.inventory.set(itemId, existing);
  }

  renderOwnedList();
  renderSummary();
}

// ── Owned list ────────────────────────────────────────────

/**
 * Affiche la liste des items possédés.
 * Chaque puce est cliquable → vend 1 exemplaire de l'item.
 */
function renderOwnedList() {
  if (!refs.ownedList) return;

  const entries = Array.from(shopState.inventory.values())
    .filter((e) => e.quantity > 0)
    .sort((a, b) => b.cost - a.cost);

  if (!entries.length) {
    refs.ownedList.innerHTML = '<div class="empty-row">Aucun item dans l\'inventaire.</div>';
    return;
  }

  refs.ownedList.innerHTML = entries.map((entry) => `
    <button type="button"
      class="shop-owned-chip"
      data-shop-owned-id="${entry.itemId}"
      title="Cliquer pour vendre 1x ${escapeHtml(entry.name)} (+${formatSouls(Math.round(entry.cost * RESALE_RATE))})">
      <span class="shop-owned-name">${escapeHtml(entry.name)}</span>
      <b class="shop-owned-qty">x${entry.quantity}</b>
      <span class="shop-owned-sell-hint">vendre</span>
    </button>
  `).join('');

  refs.ownedList.querySelectorAll('[data-shop-owned-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const itemId = Number(btn.dataset.shopOwnedId);
      executeTrade('sell', itemId, 1);
      // Met à jour lastClickedItemId pour que la grille reste cohérente
      shopState.lastClickedItemId = itemId;
      renderShopGrid();
    });
  });
}

// ── Stats summary ─────────────────────────────────────────

/**
 * Recalcule et affiche les 6 statistiques du résumé.
 *
 * Définitions :
 *   totalSpent   = souls dépensées en achats
 *   totalEarned  = souls récupérées via ventes
 *   currentValue = valeur au prix d'achat des items encore possédés
 *   currentSouls = startingSouls - totalSpent + totalEarned
 *   totalWorth   = currentSouls + currentValue
 *   netValue     = totalEarned - totalSpent (bilan réalisé)
 */
function renderSummary() {
  const currentValue = Array.from(shopState.inventory.values())
    .reduce((sum, row) => sum + row.quantity * row.cost, 0);

  const currentSouls = computeCurrentSouls();
  const totalWorth   = currentSouls + currentValue;
  const netValue     = shopState.totalEarned - shopState.totalSpent;

  setText(refs.totalSpent,   formatSouls(shopState.totalSpent));
  setText(refs.totalEarned,  formatSouls(shopState.totalEarned));
  setText(refs.currentValue, formatSouls(currentValue));
  setText(refs.currentSouls, formatSouls(currentSouls));
  setText(refs.totalWorth,   formatSouls(totalWorth));
  setText(refs.netValue,     formatSouls(netValue));

  // Classes CSS pour coloration positive/négative
  toggleSignClasses(refs.currentSouls, currentSouls);
  toggleSignClasses(refs.totalWorth,   totalWorth);
  toggleSignClasses(refs.netValue,     netValue);
}

// ── Feedback bar ──────────────────────────────────────────

/**
 * Affiche un message dans la zone de feedback.
 * @param {string} message
 * @param {'ok'|'warn'|'error'|''} tone
 */
function setFeedback(message, tone = '') {
  if (!refs.feedback) return;
  refs.feedback.textContent = message;
  refs.feedback.dataset.tone = tone;
}

// ── Item source ───────────────────────────────────────────

/**
 * Retourne la liste des items achetables, triée par coût croissant.
 * Utilise state.itemsListCache quand disponible, sinon FALLBACK_ITEMS.
 */
function getShopableItems() {
  const source = Array.isArray(state.itemsListCache) && state.itemsListCache.length
    ? state.itemsListCache
    : FALLBACK_ITEMS;

  // Injecte les items fallback dans state.itemsMap pour que executeTrade puisse les retrouver
  source.forEach((item) => {
    if (item?.id != null && !state.itemsMap[item.id]) {
      state.itemsMap[item.id] = item;
    }
  });

  return source
    .filter((item) => Number(item?.cost) > 0)
    .sort((a, b) => Number(a.cost || 0) - Number(b.cost || 0));
}

// ── Filter helpers ────────────────────────────────────────

/**
 * Détermine le label de tier d'un item à partir de son coût.
 * @param {object} item
 * @returns {'Tier 1'|'Tier 2'|'Tier 3'|'Tier 4'}
 */
function getTierLabel(item) {
  const cost = Number(item?.cost || 0);
  if (cost <= 800)  return 'Tier 1';
  if (cost <= 2000) return 'Tier 2';
  if (cost <= 4500) return 'Tier 3';
  return 'Tier 4';
}

/**
 * Vérifie si un item correspond au tier sélectionné.
 * @param {object} item
 * @param {string} tierKey
 * @returns {boolean}
 */
function matchesTier(item, tierKey) {
  if (tierKey === 'all') return true;
  // Normalise 'Tier 1' → 't1', etc.
  const label = getTierLabel(item).toLowerCase().replace(' ', '');
  return label === tierKey;
}

/**
 * Vérifie si un item correspond à la catégorie sélectionnée.
 *
 * Stratégie :
 *   1. item.fallbackCategory (items statiques)
 *   2. item.item_type (champ API officiel)
 *   3. Heuristique textuelle sur plusieurs champs
 *
 * @param {object} item
 * @param {string} categoryKey
 * @returns {boolean}
 */
function matchesCategory(item, categoryKey) {
  if (categoryKey === 'all') return true;

  // 1. Fallback items ont une catégorie explicite
  if (item?.fallbackCategory) return categoryKey === item.fallbackCategory;

  // 2. Champ item_type de l'API (ex: "weapon", "vitality", "spirit")
  const itemType = String(item?.item_type || '').toLowerCase();
  if (itemType) {
    if (categoryKey === 'weapon'   && itemType === 'weapon')   return true;
    if (categoryKey === 'vitality' && itemType === 'vitality') return true;
    if (categoryKey === 'spirit'   && itemType === 'spirit')   return true;
    // Si item_type est connu et ne correspond pas, on peut déjà exclure
    if (['weapon', 'vitality', 'spirit'].includes(itemType)) {
      return categoryKey === 'other' ? false : false;
    }
  }

  // 3. Heuristique sur tous les champs textuels disponibles
  const haystack = [
    item?.name,
    item?.class_name,
    item?.category,
    item?.type,
    item?.item_slot_type,
    item?.shop_section,
    item?.shopable_description,
    item?.description,
  ].map((v) => String(v || '').toLowerCase()).join(' ');

  if (categoryKey === 'weapon')
    return /weapon|bullet|ammo|gun|shot|fire\s*rate|clip|magazine/.test(haystack);
  if (categoryKey === 'vitality')
    return /vitality|health|armor|resist|surviv|durab|shield|regen/.test(haystack);
  if (categoryKey === 'spirit')
    return /spirit|magic|ability|cooldown|energy|mystic|cast|power/.test(haystack);
  if (categoryKey === 'other') {
    return (
      !matchesCategory(item, 'weapon') &&
      !matchesCategory(item, 'vitality') &&
      !matchesCategory(item, 'spirit')
    );
  }
  return true;
}

// ── Derived computations ──────────────────────────────────

/** @returns {number} */
function getOwnedQuantity(itemId) {
  return shopState.inventory.get(itemId)?.quantity || 0;
}

/** @returns {number} Souls disponibles = départ − dépensé + récupéré */
function computeCurrentSouls() {
  return shopState.startingSouls - shopState.totalSpent + shopState.totalEarned;
}

// ── Formatting helpers ────────────────────────────────────

/**
 * Formate une valeur de souls avec séparateur de milliers (fr-FR).
 * @param {number|string} value
 * @returns {string}
 */
function formatSouls(value) {
  const amount = Math.round(Number(value) || 0);
  return `${amount.toLocaleString('fr-FR')} souls`;
}

/**
 * Met à jour le textContent d'un élément si présent.
 * @param {HTMLElement|null} el
 * @param {string} text
 */
function setText(el, text) {
  if (el) el.textContent = text;
}

/**
 * Ajoute/retire les classes `is-positive` / `is-negative` selon le signe.
 * @param {HTMLElement|null} el
 * @param {number} value
 */
function toggleSignClasses(el, value) {
  if (!el) return;
  el.classList.toggle('is-positive', value >= 0);
  el.classList.toggle('is-negative', value < 0);
}

/**
 * Parse un nombre entier non négatif depuis une chaîne.
 * @param {string|undefined} value
 * @param {number} fallback
 * @returns {number}
 */
function getNonNegativeInt(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.floor(parsed);
}
