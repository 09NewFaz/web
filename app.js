// Lucky World - app.js v6
const PRODUCT_FILE = window.PRODUCT_JSON_FILE || 'products.json';
const PRODUCT_PLACEHOLDER = window.PRODUCT_EMOJI || '👕';

let ALL_PRODUCTS = [];
let activeFilters = { genero: [], marca: [], categoria: [], talla: [] };
let searchQuery = '';
let currentSort = 'default';
let currentView = 'grid';
let priceMin = 0;
let priceMax = 999999;
function fmtPrice(n, p) { if ((p && p.precio_por_definir) || n === 0 || n === '0') return 'Preguntar por precio'; return n ? '$' + Number(n).toLocaleString('es-CL') : ''; }
let recentlyViewed = JSON.parse(localStorage.getItem('ld_recent') || '[]');

const searchInput = document.getElementById('search-input');
const productGrid = document.getElementById('product-grid');
const resultCount = document.getElementById('result-count');
const activeTags = document.getElementById('active-filters');
const btnClear = document.getElementById('btn-clear-filters');
const sortSelect = document.getElementById('sort-select');
const modalOverlay = document.getElementById('modal-overlay');
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const navbar = document.getElementById('navbar');
const progressBar = document.getElementById('progress-bar');
const searchDropdown = document.getElementById('search-dropdown');

// ── PROGRESS BAR ──────────────────────────────────────────
window.addEventListener('scroll', () => {
  const scrollTop = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  progressBar.style.width = (scrollTop / docHeight * 100) + '%';
  navbar.classList.toggle('scrolled', scrollTop > 50);
});

// ── THEME TOGGLE ──────────────────────────────────────────
const themeBtn = document.getElementById('theme-toggle');
let isDark = localStorage.getItem('ld_theme') !== 'light';
applyTheme();

themeBtn.addEventListener('click', () => {
  isDark = !isDark;
  localStorage.setItem('ld_theme', isDark ? 'dark' : 'light');
  applyTheme();
});

function applyTheme() {
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  themeBtn.textContent = isDark ? '🌙' : '☀️';
}

// ── MOBILE NAV ────────────────────────────────────────────
document.getElementById('mobile-menu-btn').addEventListener('click', () => {
  document.getElementById('mobile-nav').classList.toggle('open');
});
function closeMobileNav() { document.getElementById('mobile-nav').classList.remove('open'); }

// ── MOBILE SIDEBAR ────────────────────────────────────────
function toggleMobileSidebar() {
  document.querySelector('.sidebar').classList.toggle('open');
}

// ── SMOOTH SCROLL ─────────────────────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', e => {
    const href = link.getAttribute('href');
    if (href.length > 1) {
      e.preventDefault();
      const el = document.querySelector(href);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
      closeMobileNav();
    }
  });
});

// ── SCROLL REVEAL ─────────────────────────────────────────
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal-section, .reveal-up, .reveal-left, .reveal-right').forEach(el => {
  revealObserver.observe(el);
});

// ── LAZY LOADING ──────────────────────────────────────────
function lazyLoad(img) {
  if (!img || img.dataset.loaded) return;
  img.dataset.loaded = '1';
  img.addEventListener('load', () => img.classList.add('loaded'));
  img.addEventListener('error', () => img.classList.add('loaded'));
  if (img.complete) img.classList.add('loaded');
}

const lazyObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) lazyLoad(entry.target);
  });
}, { rootMargin: '100px' });

function observeLazyImages() {
  document.querySelectorAll('.card-img, .rv-card img, .modal-img-side img').forEach(img => {
    lazyObserver.observe(img);
  });
}

// ── SKELETON ──────────────────────────────────────────────
function showSkeleton() {
  const s = Array(8).fill(`
    <div class="skeleton-card">
      <div class="skeleton-img"></div>
      <div class="skeleton-body">
        <div class="skeleton-line short"></div>
        <div class="skeleton-line medium"></div>
        <div class="skeleton-line short"></div>
      </div>
    </div>`).join('');
  productGrid.innerHTML = `<div class="loader-grid">${s}</div>`;
}

// ── LOAD ──────────────────────────────────────────────────
async function loadProducts() {
  showSkeleton();
  try {
    const supabaseUrl = 'https://urzwbrtziduhfuhknsdl.supabase.co/rest/v1/productos?select=*';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVyendicnR6aWR1aGZ1aGtuc2RsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0MDEyNzUsImV4cCI6MjA4Nzk3NzI3NX0.MQtg8-LsesZIofSrtNtUgiX-sOMpxAnrjVTjJ3QJaNU';

    // Extraer productos guardados en Supabase
    let supabaseProducts = [];
    try {
      const res = await fetch(supabaseUrl, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      });
      if (res.ok) {
        supabaseProducts = await res.json();
      }
    } catch (e) {
      console.error('Error cargando de Supabase:', e);
    }

    // Adaptar los campos de Supabase al formato que espera la web
    const mappedSupabase = supabaseProducts.map(p => {
      const cat = p.catalogo_destino || p.catalogo;
      let tallas = p.tallas || [];
      // Fallback: extract size from description for parfum products
      if ((!tallas || tallas.length === 0) && cat === 'LuckyParfum' && p.descripcion) {
        const sizeMatch = p.descripcion.match(/Tamaño:\s*(\d+\s*ml)/i);
        if (sizeMatch) tallas = [sizeMatch[1]];
      }
      return {
        id: p.id,
        nombre: p.nombre,
        descripcion: p.descripcion,
        precio: p.precio,
        imagen: p.imagen,
        galeria: p.galeria || [],
        catalogo: cat,
        marca: p.marca || 'LuckyDrip',
        categoria: p.categoria || cat,
        genero: p.genero || 'Unisex',
        colores: p.colores || [],
        tallas: tallas,
        calidad: p.calidad || null,
        nuevo: p.id !== undefined ? p.nuevo : true,
        activo: p.activo !== undefined ? p.activo : true,
        precio_por_definir: p.precio_por_definir || false
      };
    });

    // Solo Supabase — sin archivos JSON locales
    ALL_PRODUCTS = [...mappedSupabase];

    // Ocultar productos desactivados desde el dashboard
    ALL_PRODUCTS = ALL_PRODUCTS.filter(p => p.activo !== false);

    // Filtrar los productos de la Base de datos dependiendo en qué página estamos (Shoes, Parfum, o Drip)
    if (window.PRODUCT_JSON_FILE === 'products-shoes.json') {
      ALL_PRODUCTS = ALL_PRODUCTS.filter(p => p.catalogo === 'LuckyShoes');
    } else if (window.PRODUCT_JSON_FILE === 'products-parfum.json') {
      ALL_PRODUCTS = ALL_PRODUCTS.filter(p => p.catalogo === 'LuckyParfum');
    } else {
      ALL_PRODUCTS = ALL_PRODUCTS.filter(p => p.catalogo === 'LuckyDrip');
    }

    buildFilterUI();
    initPriceSlider();
    renderProducts();
    initUrgencyBanner();
  } catch (err) {
    productGrid.innerHTML = `
      <div class="no-results">
        <div class="no-icon">⚠️</div>
        <h3>No se pudo cargar el catálogo</h3>
        <p>No pudimos conectarnos a la Base de Datos.</p>
      </div>`;
  }
}

// ── FILTERS ───────────────────────────────────────────────
function buildFilterUI() {
  [
    { key: 'genero', id: 'filter-genero' },
    { key: 'marca', id: 'filter-marca' },
    { key: 'categoria', id: 'filter-categoria' },
    { key: 'talla', id: 'filter-talla' }
  ].forEach(({ key, id }) => {
    const container = document.getElementById(id);
    if (!container) return;
    const map = {};
    ALL_PRODUCTS.forEach(p => {
      (Array.isArray(p[key]) ? p[key] : [p[key]]).forEach(v => { if (v) map[v] = (map[v] || 0) + 1; });
    });
    const sorted = Object.keys(map).sort((a, b) => {
      const nA = parseFloat(a), nB = parseFloat(b);
      if (!isNaN(nA) && !isNaN(nB)) return nA - nB;
      return a.localeCompare(b, 'es');
    });
    container.innerHTML = sorted.map(val => `
      <label class="filter-option" data-key="${key}" data-val="${val}">
        <div class="filter-left"><div class="filter-checkbox"></div><span class="filter-option-label">${val}</span></div>
        <span class="filter-count">${map[val]}</span>
      </label>`).join('');
    container.querySelectorAll('.filter-option').forEach(el =>
      el.addEventListener('click', () => toggleFilter(el.dataset.key, el.dataset.val)));
  });
}

function toggleFilter(key, val) {
  const arr = activeFilters[key];
  const idx = arr.indexOf(val);
  if (idx === -1) arr.push(val); else arr.splice(idx, 1);
  syncFilterUI(); renderProducts();
}

function syncFilterUI() {
  document.querySelectorAll('.filter-option').forEach(el =>
    el.classList.toggle('active', !!activeFilters[el.dataset.key]?.includes(el.dataset.val)));
  const total = Object.values(activeFilters).reduce((s, a) => s + a.length, 0);
  btnClear.classList.toggle('visible', total > 0);
  const badge = document.getElementById('filter-badge');
  if (badge) { badge.textContent = total; badge.style.display = total > 0 ? 'inline' : 'none'; }
  renderActiveTags();
}

function renderActiveTags() {
  activeTags.innerHTML = Object.entries(activeFilters).flatMap(([key, vals]) =>
    vals.map(val => `<div class="filter-tag" onclick="toggleFilter('${key}','${val}')">${val} <span class="tag-remove">×</span></div>`)
  ).join('');
}

// ── COLOR DOTS ────────────────────────────────────────────
const COLOR_MAP = {
  'blanco': '#f0f0f0', 'negro': '#111', 'rojo': '#e53e3e', 'azul': '#3182ce',
  'verde': '#38a169', 'gris': '#718096', 'beige': '#d4b896', 'rosa': '#ed64a6',
  'amarillo': '#ecc94b', 'naranja': '#ed8936', 'morado': '#805ad5',
};
function getColorDot(c) {
  const key = c.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const bg = COLOR_MAP[key] || '#555';
  return `<span class="color-dot" style="background:${bg};${key === 'blanco' ? 'border:1px solid #888' : ''}" title="${c}"></span>`;
}

// ── VIEW TOGGLE ───────────────────────────────────────────
function setView(view) {
  currentView = view;
  productGrid.classList.toggle('list-view', view === 'list');
  document.getElementById('btn-grid').classList.toggle('active', view === 'grid');
  document.getElementById('btn-list').classList.toggle('active', view === 'list');
}

// ── SEARCH DROPDOWN ───────────────────────────────────────
function renderSearchDropdown(query) {
  if (!query || query.length < 2) { searchDropdown.classList.remove('open'); return; }
  const q = query.toLowerCase();
  const matches = ALL_PRODUCTS.filter(p =>
    p.nombre?.toLowerCase().includes(q) || p.marca?.toLowerCase().includes(q) ||
    p.categoria?.toLowerCase().includes(q)
  ).slice(0, 6);

  if (!matches.length) {
    searchDropdown.innerHTML = `<div class="search-no-results">Sin resultados para "${query}"</div>`;
  } else {
    searchDropdown.innerHTML = matches.map(p => `
      <div class="search-item" onclick="openModal(${p.id});searchDropdown.classList.remove('open');searchInput.value='';">
        <img class="search-item-img" src="${p.imagen || ''}" alt="${p.nombre}"
          onerror="this.style.display='none'" />
        <div class="search-item-info">
          <div class="search-item-name">${p.nombre}</div>
          <div class="search-item-brand">${p.marca}${p.precio ? ' · ' + fmtPrice(p.precio) : ''}</div>
        </div>
      </div>`).join('');
  }
  searchDropdown.classList.add('open');
}

document.addEventListener('click', e => {
  if (!e.target.closest('.navbar-search')) searchDropdown.classList.remove('open');
});

// ── RECENTLY VIEWED ───────────────────────────────────────
function addToRecent(id) {
  recentlyViewed = [id, ...recentlyViewed.filter(x => x !== id)].slice(0, 8);
  try { localStorage.setItem('ld_recent', JSON.stringify(recentlyViewed)); } catch (e) { }
  renderRecentlyViewed();
}

function renderRecentlyViewed() {
  const container = document.getElementById('recently-viewed');
  const grid = document.getElementById('rv-grid');
  const products = recentlyViewed.map(id => ALL_PRODUCTS.find(p => p.id === id)).filter(Boolean);
  if (!products.length) { container.style.display = 'none'; return; }
  container.style.display = 'block';
  grid.innerHTML = products.map(p => `
    <div class="rv-card" onclick="openModal(${p.id})">
      <img src="${p.imagen || ''}" alt="${p.nombre}" onerror="this.style.display='none'" />
      <div class="rv-card-name">${p.nombre}</div>
    </div>`).join('');
  grid.querySelectorAll('img').forEach(img => {
    img.addEventListener('load', () => img.classList.add('loaded'));
    if (img.complete) img.classList.add('loaded');
  });
}

// ── RENDER ────────────────────────────────────────────────
function renderProducts() {
  let results = ALL_PRODUCTS.filter(p => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const ok = p.nombre?.toLowerCase().includes(q) || p.marca?.toLowerCase().includes(q) ||
        p.categoria?.toLowerCase().includes(q) || p.descripcion?.toLowerCase().includes(q) ||
        (Array.isArray(p.colores) && p.colores.some(c => c.toLowerCase().includes(q)));
      if (!ok) return false;
    }
    for (const [key, vals] of Object.entries(activeFilters)) {
      if (!vals.length) continue;
      const pv = Array.isArray(p[key]) ? p[key] : [p[key]];
      if (!vals.some(v => pv.includes(v))) return false;
    }
    // Price filter (skip products with price=0 aka "por definir")
    if (p.precio !== undefined && p.precio > 0) {
      if (p.precio < priceMin || p.precio > priceMax) return false;
    }
    return true;
  });

  if (currentSort === 'name-asc') results.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  if (currentSort === 'name-desc') results.sort((a, b) => b.nombre.localeCompare(a.nombre, 'es'));
  if (currentSort === 'brand') results.sort((a, b) => a.marca.localeCompare(b.marca, 'es'));
  if (currentSort === 'new-first') results.sort((a, b) => (b.nuevo ? 1 : 0) - (a.nuevo ? 1 : 0));
  if (currentSort === 'price-asc') results.sort((a, b) => (a.precio || 0) - (b.precio || 0));
  if (currentSort === 'price-desc') results.sort((a, b) => (b.precio || 0) - (a.precio || 0));

  // Urgencia solo aplica en modo "default" para no romper el orden elegido
  if (currentSort === 'default' && PRODUCT_FILE === 'products.json') {
    results.sort((a, b) => {
      const urgA = STOCK_LOW_IDS.has(a.id) ? 2 : STOCK_MID_IDS.has(a.id) ? 1 : 0;
      const urgB = STOCK_LOW_IDS.has(b.id) ? 2 : STOCK_MID_IDS.has(b.id) ? 1 : 0;
      return urgB - urgA;
    });
  }

  resultCount.innerHTML = `<span>${results.length}</span> items`;

  if (!results.length) {
    productGrid.innerHTML = `<div class="no-results"><div class="no-icon">🔍</div><h3>Sin resultados</h3><p>Probá con otros filtros.</p></div>`;
    return;
  }

  productGrid.className = 'product-grid' + (currentView === 'list' ? ' list-view' : '');

  productGrid.innerHTML = results.map((p, i) => `
    <div class="product-card stagger-anim" style="animation-delay:${Math.min(i * 40, 500)}ms" role="listitem" data-product-id="${p.id}">
      <div class="card-img-wrapper">
        ${p.nuevo ? '<span class="card-badge">Nuevo</span>' : ''}
        ${p.genero ? `<span class="card-gender-badge">${p.genero}</span>` : ''}
        ${p.imagen ? `<img class="card-img" src="${p.imagen}" alt="${p.nombre}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" onload="if(this.naturalWidth<10||this.naturalHeight<10){this.style.display='none';this.nextElementSibling.style.display='flex'}">` : ''}
        <div class="card-img-placeholder" style="${p.imagen ? 'display:none' : ''}">${PRODUCT_PLACEHOLDER}</div>
        ${PRODUCT_FILE === 'products.json' ? getStockBadge(p.id) : ''}
        <button class="card-zoom-btn" data-zoom-id="${p.id}" title="Ampliar">⤢</button>
      </div>
      <div class="card-body" onclick="openModal(${p.id})">
        <div class="card-brand">${p.marca || ''}</div>
        <div class="card-name">${p.nombre}</div>
        <div class="card-footer">
          ${(p.precio !== undefined && p.precio !== null && p.precio !== '') || p.precio_por_definir ? `<span class="card-price">${fmtPrice(p.precio, p)}</span>` : ''}
          ${p.calidad ? `<span class="card-calidad-badge">${p.calidad}</span>` : ''}
          <div class="card-color-dots">${p.catalogo === 'LuckyParfum' ? ((p.colores && p.colores.length) ? `<span style="font-size:.65rem;font-weight:700;color:var(--catalog-accent,var(--accent));letter-spacing:.5px">${p.colores[0]}</span>` : '') : (p.colores || []).map(getColorDot).join('')}</div>
          <span class="card-cat">${p.categoria || ''}</span>
        </div>
      </div>
    </div>`).join('');

  // Event delegation for zoom buttons (avoids inline base64 in onclick)
  productGrid.querySelectorAll('.card-zoom-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const pid = parseInt(btn.dataset.zoomId);
      const prod = ALL_PRODUCTS.find(x => x.id === pid);
      if (prod && prod.imagen) openLightbox(prod.imagen, prod.nombre);
    });
  });

  // Lazy load images - also check for broken/tiny images
  productGrid.querySelectorAll('.card-img').forEach(img => {
    img.addEventListener('load', () => {
      img.classList.add('loaded');
      if (img.naturalWidth < 10 || img.naturalHeight < 10) {
        img.style.display = 'none';
        const ph = img.nextElementSibling;
        if (ph) ph.style.display = 'flex';
      }
    });
    img.addEventListener('error', () => {
      img.style.display = 'none';
      const ph = img.nextElementSibling;
      if (ph) ph.style.display = 'flex';
    });
    if (img.complete) img.classList.add('loaded');
  });

  renderRecentlyViewed();
}

// ── MODAL ─────────────────────────────────────────────────
function openModal(id) {
  const p = ALL_PRODUCTS.find(x => x.id === id);
  if (!p) return;

  addToRecent(id);

  document.getElementById('modal-brand').textContent = p.marca || '';
  document.getElementById('modal-name').textContent = p.nombre || '';
  document.getElementById('modal-desc').textContent = p.descripcion || 'Sin descripción.';
  document.getElementById('modal-badges').innerHTML = [
    p.genero ? `<span class="modal-badge">👤 ${p.genero}</span>` : '',
    p.categoria ? `<span class="modal-badge">🏷️ ${p.categoria}</span>` : '',
    p.calidad ? `<span class="modal-badge" style="background:rgba(232,255,0,.12);color:var(--accent,#e8ff00);border-color:rgba(232,255,0,.3);font-weight:800">⚡ ${p.calidad}</span>` : '',
    p.nuevo ? `<span class="modal-badge modal-badge-new">✨ Nuevo</span>` : '',
    (p.precio !== undefined && p.precio !== null && p.precio !== '') || p.precio_por_definir ? `<span class="modal-badge modal-badge-new" style="font-size:.9rem;font-weight:800">${fmtPrice(p.precio, p)}</span>` : ''
  ].filter(Boolean).join('');
  // For parfum: if tallas is empty, try to extract size from description
  let displayTallas = p.tallas || [];
  if ((!displayTallas || displayTallas.length === 0) && p.catalogo === 'LuckyParfum' && p.descripcion) {
    const sizeMatch = p.descripcion.match(/Tamaño:\s*(\d+\s*ml)/i);
    if (sizeMatch) displayTallas = [sizeMatch[1]];
  }
  document.getElementById('modal-sizes').innerHTML =
    displayTallas.map(t => `<span class="modal-size">${t}</span>`).join('') || '<span style="color:var(--text-muted)">N/D</span>';
  document.getElementById('modal-colors').innerHTML =
    (p.catalogo === 'LuckyParfum')
      ? ((p.colores && p.colores.length) ? `<span style="font-weight:700;font-size:.95rem;letter-spacing:.5px;color:var(--catalog-accent,var(--accent))">${p.colores[0]}</span>` : '<span style="color:var(--text-muted)">N/D</span>')
      : ((p.colores || []).map(c => `${getColorDot(c)}<span class="color-chip">${c}</span>`).join('') || '<span style="color:var(--text-muted)">N/D</span>');

  const imgEl = document.getElementById('modal-img');
  const phEl = document.getElementById('modal-img-placeholder');
  imgEl.classList.remove('loaded');
  let currentModalImg = p.imagen;

  // Build carousel data
  window._modalGallery = (p.galeria && p.galeria.length > 0) ? [...p.galeria] : (p.imagen ? [p.imagen] : []);
  window._modalGalIdx = 0;
  window._modalName = p.nombre || '';

  if (p.imagen) {
    imgEl.src = p.imagen; imgEl.alt = p.nombre; imgEl.style.display = 'block'; phEl.style.display = 'none';
    imgEl.onload = () => imgEl.classList.add('loaded');
    imgEl.onerror = () => { imgEl.style.display = 'none'; phEl.style.display = 'flex' };
    if (imgEl.complete) imgEl.classList.add('loaded');
  } else { imgEl.style.display = 'none'; phEl.style.display = 'flex'; }

  // Gallery thumbnails
  let galEl = document.getElementById('modal-gallery');
  if (!galEl) {
    galEl = document.createElement('div');
    galEl.id = 'modal-gallery';
    galEl.style.cssText = 'display:none;flex-shrink:0';
    document.querySelector('.modal-img-side').appendChild(galEl);
  }

  // Carousel arrows
  let arrowPrev = document.getElementById('modal-arrow-prev');
  let arrowNext = document.getElementById('modal-arrow-next');
  let photoCounter = document.getElementById('modal-photo-counter');
  const imgSide = document.querySelector('.modal-img-side');

  if (!arrowPrev) {
    arrowPrev = document.createElement('button');
    arrowPrev.id = 'modal-arrow-prev';
    arrowPrev.innerHTML = '‹';
    arrowPrev.style.cssText = 'position:absolute;left:8px;top:50%;transform:translateY(-50%);background:rgba(0,0,0,.6);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.15);color:#fff;width:40px;height:40px;border-radius:50%;cursor:pointer;font-size:1.3rem;display:flex;align-items:center;justify-content:center;z-index:10;transition:all .2s';
    arrowPrev.onmouseover = () => { arrowPrev.style.background = 'rgba(232,255,0,.25)'; arrowPrev.style.borderColor = 'var(--accent,#e8ff00)'; arrowPrev.style.color = 'var(--accent,#e8ff00)'; };
    arrowPrev.onmouseout = () => { arrowPrev.style.background = 'rgba(0,0,0,.6)'; arrowPrev.style.borderColor = 'rgba(255,255,255,.15)'; arrowPrev.style.color = '#fff'; };
    arrowPrev.onclick = (e) => { e.stopPropagation(); modalCarouselNav(-1); };
    imgSide.style.position = 'relative';
    imgSide.appendChild(arrowPrev);
  }
  if (!arrowNext) {
    arrowNext = document.createElement('button');
    arrowNext.id = 'modal-arrow-next';
    arrowNext.innerHTML = '›';
    arrowNext.style.cssText = 'position:absolute;right:8px;top:50%;transform:translateY(-50%);background:rgba(0,0,0,.6);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.15);color:#fff;width:40px;height:40px;border-radius:50%;cursor:pointer;font-size:1.3rem;display:flex;align-items:center;justify-content:center;z-index:10;transition:all .2s';
    arrowNext.onmouseover = () => { arrowNext.style.background = 'rgba(232,255,0,.25)'; arrowNext.style.borderColor = 'var(--accent,#e8ff00)'; arrowNext.style.color = 'var(--accent,#e8ff00)'; };
    arrowNext.onmouseout = () => { arrowNext.style.background = 'rgba(0,0,0,.6)'; arrowNext.style.borderColor = 'rgba(255,255,255,.15)'; arrowNext.style.color = '#fff'; };
    arrowNext.onclick = (e) => { e.stopPropagation(); modalCarouselNav(1); };
    imgSide.appendChild(arrowNext);
  }
  // Hide dots - we use thumbnails instead
  if (photoCounter) photoCounter.style.display = 'none';

  // Show/hide arrows based on gallery length
  const hasMultiple = window._modalGallery.length > 1;
  arrowPrev.style.display = hasMultiple ? 'flex' : 'none';
  arrowNext.style.display = hasMultiple ? 'flex' : 'none';

  if (p.galeria && p.galeria.length > 1) {
    galEl.style.cssText = 'display:flex;gap:8px;padding:10px 14px;overflow-x:auto;background:var(--bg-secondary);border-top:1px solid var(--border,#252525);align-items:center;justify-content:flex-start;flex-wrap:nowrap;flex-shrink:0';
    galEl.innerHTML = p.galeria.map((src, i) => `
      <img src="${src}" alt="Foto ${i + 1}" class="modal-gallery-thumb${i === 0 ? ' active' : ''}" 
        style="width:68px;height:68px;object-fit:cover;border-radius:4px;cursor:pointer;border:2px solid ${i === 0 ? 'var(--text-primary,#f0f0f0)' : 'var(--border,#252525)'};opacity:${i === 0 ? '1' : '.6'};transition:all .2s;flex-shrink:0;background:var(--bg-secondary,#0f0f0f)" 
        onmouseover="if(!this.classList.contains('active')){this.style.borderColor='var(--text-secondary,#808080)';this.style.opacity='1'}"
        onmouseout="if(!this.classList.contains('active')){this.style.borderColor='var(--border,#252525)';this.style.opacity='.6'}"
        onclick="modalCarouselGoTo(${i})">`).join('');
  } else {
    galEl.style.display = 'none';
    galEl.innerHTML = '';
  }

  const zBtn = document.getElementById('modal-zoom-btn');
  if (zBtn) { zBtn.onclick = () => currentModalImg && openLightbox(currentModalImg, p.nombre); zBtn.style.display = p.imagen ? 'flex' : 'none'; }

  modalOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';

  if (STOCK_LOW_IDS.has(id)) {
    setTimeout(() => showToast('🔥', '¡Últimas unidades!', `Solo quedan pocas del ${p.nombre}`, 3500), 600);
  }
}
function closeModal() { modalOverlay.classList.remove('open'); document.body.style.overflow = ''; }

// ── CAROUSEL NAV ──────────────────────────────────────────
function modalCarouselNav(dir) {
  if (!window._modalGallery || window._modalGallery.length <= 1) return;
  window._modalGalIdx = (window._modalGalIdx + dir + window._modalGallery.length) % window._modalGallery.length;
  modalCarouselGoTo(window._modalGalIdx);
}

function modalCarouselGoTo(idx) {
  if (!window._modalGallery) return;
  window._modalGalIdx = idx;
  const src = window._modalGallery[idx];
  const imgEl = document.getElementById('modal-img');
  const phEl = document.getElementById('modal-img-placeholder');
  imgEl.classList.remove('loaded');
  imgEl.src = src; imgEl.alt = window._modalName; imgEl.style.display = 'block'; phEl.style.display = 'none';
  imgEl.onload = () => imgEl.classList.add('loaded');
  // Update zoom
  const zBtn = document.getElementById('modal-zoom-btn');
  if (zBtn) zBtn.onclick = () => openLightbox(src, window._modalName);
  // Update thumbs
  document.querySelectorAll('.modal-gallery-thumb').forEach((t, i) => {
    const isActive = i === idx;
    t.style.border = isActive ? '2px solid var(--text-primary,#f0f0f0)' : '2px solid var(--border,#252525)';
    t.style.opacity = isActive ? '1' : '.6';
    if (isActive) t.classList.add('active'); else t.classList.remove('active');
  });
}

// ── GALLERY SWITCH (legacy compat) ────────────────────────
function switchModalImg(thumb, src, alt) {
  const idx = window._modalGallery ? window._modalGallery.indexOf(src) : -1;
  if (idx >= 0) { modalCarouselGoTo(idx); return; }
  const imgEl = document.getElementById('modal-img');
  const phEl = document.getElementById('modal-img-placeholder');
  imgEl.classList.remove('loaded');
  imgEl.src = src; imgEl.alt = alt; imgEl.style.display = 'block'; phEl.style.display = 'none';
  imgEl.onload = () => imgEl.classList.add('loaded');
  const zBtn = document.getElementById('modal-zoom-btn');
  if (zBtn) zBtn.onclick = () => openLightbox(src, alt);
  document.querySelectorAll('.modal-gallery-thumb').forEach(t => {
    t.style.border = '2px solid transparent'; t.style.opacity = '.6';
  });
  thumb.style.border = '2px solid var(--catalog-accent,#d4f55c)'; thumb.style.opacity = '1';
}

// ── LIGHTBOX ──────────────────────────────────────────────
function openLightbox(src, alt) {
  if (!src) return;
  lightboxImg.src = src; lightboxImg.alt = alt || '';
  lightbox.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeLightbox() {
  lightbox.classList.remove('open'); lightboxImg.src = '';
  if (!modalOverlay.classList.contains('open')) document.body.style.overflow = '';
}

// ── EVENTS ────────────────────────────────────────────────
searchInput.addEventListener('input', e => {
  searchQuery = e.target.value.trim();
  renderSearchDropdown(searchQuery);
  renderProducts();
});
sortSelect.addEventListener('change', e => { currentSort = e.target.value; renderProducts(); });
btnClear.addEventListener('click', () => {
  activeFilters = { genero: [], marca: [], categoria: [], talla: [] };
  syncFilterUI(); renderProducts();
});
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });
lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeLightbox(); closeModal(); }
  if (modalOverlay.classList.contains('open')) {
    if (e.key === 'ArrowLeft') modalCarouselNav(-1);
    if (e.key === 'ArrowRight') modalCarouselNav(1);
  }
});

// Toast en botones de contacto
document.querySelectorAll('a[href*="wa.me"]').forEach(btn => {
  btn.addEventListener('click', () => showToast('💬', 'Redirigiendo a WhatsApp...', 'Te llevaremos al chat en segundos'));
});
document.querySelectorAll('a[href*="instagram"]').forEach(btn => {
  btn.addEventListener('click', () => showToast('📸', 'Abriendo Instagram...', 'Seguinos en @luckydrip'));
});

// ── TOAST ─────────────────────────────────────────────────
function showToast(icon, text, sub = '', duration = 3200) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <div class="toast-icon">${icon}</div>
    <div><div class="toast-text">${text}</div>${sub ? `<div class="toast-sub">${sub}</div>` : ''}</div>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 280);
  }, duration);
}

// ── URGENCY BANNER ────────────────────────────────────────
const URGENCY_MSGS = [
  { fire: true, count: '3', label: 'unidades del Puffer Hoodie Nike' },
  { fire: true, count: '1', label: 'hoodie Fear of God disponible' },
  { fire: false, count: '5', label: 'personas viendo el catálogo ahora' },
  { fire: true, count: '2', label: 'remeras Supreme restantes' },
  { fire: false, count: '8', label: 'unidades del Tech Fleece Nike' },
  { fire: true, count: '1', label: 'LV Hoodie disponible — ¡último!' },
  { fire: false, count: '4', label: 'Jordan disponibles esta semana' },
  { fire: true, count: '2', label: 'Off-White en talla M solamente' },
  { fire: false, count: '6', label: 'personas compraron hoy' },
  { fire: true, count: '3', label: 'prendas de Corteiz disponibles' },
];

function initUrgencyBanner() {
  const track = document.getElementById('urgency-track');
  if (!track) return;
  const msgs = [...URGENCY_MSGS, ...URGENCY_MSGS]; // loop infinito
  track.innerHTML = msgs.map(m => `
    <span class="urgency-item">
      ${m.fire ? '<span class="urgency-fire">🔥</span>' : '<span class="urgency-fire">👁</span>'}
      <span class="urgency-count">${m.count}</span>
      <span class="urgency-label">${m.label}</span>
    </span>`).join('');
}

// ── PRICE SLIDER ──────────────────────────────────────────
function initPriceSlider() {
  const minInput = document.getElementById('price-min');
  const maxInput = document.getElementById('price-max');
  const minLabel = document.getElementById('price-min-label');
  const maxLabel = document.getElementById('price-max-label');
  const fill = document.getElementById('price-track-fill');
  if (!minInput || !maxInput) return;

  // Calcular precios del catálogo si existen
  const prices = ALL_PRODUCTS.map(p => p.precio).filter(Boolean);
  const globalMin = prices.length ? Math.min(...prices) : 0;
  const globalMax = prices.length ? Math.max(...prices) : 999999;
  [minInput, maxInput].forEach(el => {
    el.min = globalMin; el.max = globalMax;
  });
  minInput.value = globalMin; maxInput.value = globalMax;
  priceMin = globalMin; priceMax = globalMax;

  function fmt(n) { return '$' + Number(n).toLocaleString('es-AR'); }

  function updateSlider() {
    let lo = parseInt(minInput.value), hi = parseInt(maxInput.value);
    if (lo > hi) { if (this === minInput) lo = hi; else hi = lo; }
    minInput.value = lo; maxInput.value = hi;
    priceMin = lo; priceMax = hi;
    minLabel.textContent = fmt(lo);
    maxLabel.textContent = fmt(hi);
    const pct = (v) => ((v - globalMin) / (globalMax - globalMin || 1)) * 100;
    fill.style.left = pct(lo) + '%';
    fill.style.width = (pct(hi) - pct(lo)) + '%';
    renderProducts();
  }

  minInput.addEventListener('input', updateSlider);
  maxInput.addEventListener('input', updateSlider);
  updateSlider.call(minInput);
}

// ── STOCK BADGE ───────────────────────────────────────────
const STOCK_LOW_IDS = new Set([1, 4, 6, 10, 14, 17]);
const STOCK_MID_IDS = new Set([2, 7, 11, 15, 19]);

function getStockBadge(id) {
  if (STOCK_LOW_IDS.has(id)) return `<span class="card-stock-badge card-stock-low">🔥 Últimas unidades</span>`;
  if (STOCK_MID_IDS.has(id)) return `<span class="card-stock-badge card-stock-mid">⚡ Pocas unidades</span>`;
  return '';
}

loadProducts();

// ── KEYBOARD SHORTCUT ──
document.addEventListener('keydown', e => {
  if (e.key === '/' && document.activeElement !== searchInput) {
    e.preventDefault();
    searchInput.focus();
    searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
});

// ── 3D TILT ON PRODUCT CARDS ──
document.addEventListener('mousemove', e => {
  const card = e.target.closest('.product-card');
  if (!card) return;
  const rect = card.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width - 0.5;
  const y = (e.clientY - rect.top) / rect.height - 0.5;
  card.style.transform = `perspective(800px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg) translateY(-4px)`;
});
document.addEventListener('mouseout', e => {
  const card = e.target.closest('.product-card');
  if (card) card.style.transform = '';
});
