/* ════════════════════════════════════════════════════════════════
   IsoWatt shared site script
   - Loads the product catalog (prices.json) and editable text (site.json)
   - Applies edited text to any element with data-edit="some.key"
   - Renders product cards for the home page and products page
   - Powers the click-to-edit Site Editor inside admin.html (?edit=1)
   ════════════════════════════════════════════════════════════════ */
(function () {
  const IW = (window.IW = window.IW || {});

  /* ── helpers ─────────────────────────────────────────────────── */
  IW.esc = s => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  IW.money = n => (n == null || n === '' || isNaN(n)) ? '' : '$' + Number(n).toLocaleString();

  IW.param = k => new URLSearchParams(location.search).get(k);

  // "IsoStation" -> <span class="iso">Iso</span>Station  (keeps the brand look)
  IW.brandName = name => {
    const n = IW.esc(name);
    return /^Iso[A-Z]/.test(name) ? '<span class="iso">Iso</span>' + n.slice(3) : n;
  };

  // Plain text with blank-line paragraphs and "- " bullets -> HTML
  IW.richText = txt => {
    if (!txt) return '';
    return String(txt).trim().split(/\n\s*\n/).map(block => {
      const lines = block.split('\n');
      if (lines.every(l => /^\s*[-•]\s+/.test(l))) {
        return '<ul>' + lines.map(l => '<li>' + IW.esc(l.replace(/^\s*[-•]\s+/, '')) + '</li>').join('') + '</ul>';
      }
      return '<p>' + lines.map(IW.esc).join('<br>') + '</p>';
    }).join('');
  };

  // Turn a video link/path into something the page can play.
  //   YouTube (watch, youtu.be, shorts, embed) -> privacy-friendly embed
  //   Vimeo                                    -> embed
  //   anything else (e.g. Images/products/x/clip.mp4) -> plain <video> file
  IW.parseVideo = src => {
    const s = String(src || '').trim();
    if (!s) return null;
    let m = s.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/i);
    if (m) return {
      kind: 'youtube', id: m[1],
      embed: 'https://www.youtube-nocookie.com/embed/' + m[1] + '?rel=0&modestbranding=1&playsinline=1',
      thumb: 'https://i.ytimg.com/vi/' + m[1] + '/hqdefault.jpg'
    };
    m = s.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
    if (m) return { kind: 'vimeo', id: m[1], embed: 'https://player.vimeo.com/video/' + m[1] + '?dnt=1', thumb: '' };
    return { kind: 'file', src: s, thumb: '' };
  };

  /* ── data loading ────────────────────────────────────────────── */
  const bust = () => '?v=' + Date.now();
  let _catalog, _site;

  // Normalises old single-product prices.json so nothing breaks mid-upgrade
  function normalise(data) {
    if (!data) return { products: {}, productOrder: [] };
    if (!data.products && data.configurator) {
      data = {
        meta: data.meta,
        products: { 'power-station': {
          name: 'IsoStation Power Systems', status: 'live', featured: true,
          purchase: { mode: 'configure' }, images: [], specs: [],
          configurator: data.configurator
        } },
        productOrder: ['power-station']
      };
    }
    data.products = data.products || {};
    const order = (data.productOrder || []).filter(id => data.products[id]);
    Object.keys(data.products).forEach(id => { if (!order.includes(id)) order.push(id); });
    data.productOrder = order;
    return data;
  }

  IW.loadCatalog = async () => {
    if (_catalog) return _catalog;
    try {
      const r = await fetch('./prices.json' + bust());
      _catalog = normalise(r.ok ? await r.json() : null);
    } catch (_) { _catalog = normalise(null); }
    return _catalog;
  };

  IW.loadSite = async () => {
    if (_site) return _site;
    try {
      const r = await fetch('./site.json' + bust());
      _site = r.ok ? await r.json() : {};
    } catch (_) { _site = {}; }
    _site.texts = _site.texts || {};
    return _site;
  };

  // Products in display order. Admin preview (edit mode) shows hidden ones too.
  IW.listProducts = (cat, { includeHidden = false } = {}) =>
    cat.productOrder.map(id => Object.assign({ id }, cat.products[id]))
      .filter(p => includeHidden || (p.status || 'live') !== 'hidden');

  IW.productUrl = p => 'product.html?p=' + encodeURIComponent(p.id);

  IW.primaryAction = p => {
    const mode = (p.purchase && p.purchase.mode) || (p.configurator ? 'configure' : 'quote');
    const custom = p.purchase && p.purchase.ctaLabel;
    if (p.status === 'coming-soon') return { href: 'contact.html?product=' + encodeURIComponent(p.id), label: custom || 'Get Notified', ext: false };
    if (mode === 'stripe' && p.purchase.stripeLink) return { href: p.purchase.stripeLink, label: custom || 'Buy Now', ext: true };
    if (mode === 'configure' && p.configurator) return { href: 'configurator.html?p=' + encodeURIComponent(p.id), label: custom || 'Configure', ext: false };
    return { href: 'contact.html?product=' + encodeURIComponent(p.id), label: custom || 'Request a Quote', ext: false };
  };

  IW.priceHtml = p => {
    if (p.price == null || p.price === '') return '<span class="price price-sm">' + (p.status === 'coming-soon' ? 'Coming Soon' : 'Contact for Pricing') + '</span>';
    const lbl = p.priceLabel ? '<span class="price-from">' + IW.esc(p.priceLabel) + '</span> ' : '';
    return '<span class="price">' + lbl + IW.money(p.price) + '</span>';
  };

  /* ── product card (home + products page) ─────────────────────── */
  IW.productCard = (p, { wide = false } = {}) => {
    const img = (p.images && p.images[0]) || null;
    const specs = (p.specs || []).slice(0, 4);
    const status = p.status === 'coming-soon' ? '<span class="pc-badge pc-badge-soon">Coming Soon</span>'
      : p.badge ? '<span class="pc-badge">' + IW.esc(p.badge) + '</span>' : '';
    return `
      <a href="${IW.productUrl(p)}" class="product-card${wide ? ' featured' : ''}${p.status === 'coming-soon' ? ' is-soon' : ''}">
        ${status}
        <div class="pc-media${img ? '' : ' pc-media-empty'}">
          ${img ? `<img src="${IW.esc(img.src)}" alt="${IW.esc(img.alt || p.name)}" loading="lazy">`
                : `<span class="pc-media-mark">${IW.brandName(p.name)}</span>`}
        </div>
        <div class="pc-body">
          ${p.tier ? `<div class="card-tier">${IW.esc(p.tier)}</div>` : ''}
          <div class="card-name">${IW.brandName(p.name)}</div>
          ${p.summary || p.tagline ? `<p class="card-desc">${IW.esc(p.summary || p.tagline)}</p>` : ''}
          ${specs.length ? `<div class="card-specs">${specs.map(s =>
            `<div class="card-spec"><span class="cs-label">${IW.esc(s.label)}</span><span class="cs-val">${IW.esc(s.value)}</span></div>`).join('')}</div>` : ''}
          <div class="card-price">
            ${IW.priceHtml(p)}
            <span class="price-note">${IW.esc(p.leadTime ? 'Lead time ' + p.leadTime : (p.priceNote || ''))}</span>
          </div>
          <span class="card-cta">View ${IW.esc(p.name)} ↗</span>
        </div>
      </a>`;
  };

  IW.renderGrid = async (el, { limit, featuredFirst = true } = {}) => {
    if (!el) return;
    const cat = await IW.loadCatalog();
    let list = IW.listProducts(cat, { includeHidden: IW.editMode });
    if (limit) list = list.slice(0, limit);
    if (!list.length) { el.innerHTML = '<p class="section-body">New products coming soon.</p>'; return; }
    // A featured product spans the full row when it's alone at the top
    el.innerHTML = list.map((p, i) => IW.productCard(p, { wide: featuredFirst && i === 0 && p.featured && list.length !== 2 })).join('');
  };

  /* ── editable text ───────────────────────────────────────────── */
  IW.applyTexts = texts => {
    document.querySelectorAll('[data-edit]').forEach(el => {
      const k = el.getAttribute('data-edit');
      if (!el.hasAttribute('data-default')) el.setAttribute('data-default', el.innerHTML);
      if (texts && Object.prototype.hasOwnProperty.call(texts, k)) el.innerHTML = texts[k];
    });
  };

  /* ── Site Editor mode (loaded inside admin.html iframe) ──────── */
  IW.editMode = IW.param('edit') === '1' && window.parent !== window;

  const post = msg => window.parent.postMessage(Object.assign({ iw: true }, msg), location.origin);

  // Make every (not yet bound) [data-edit] element editable. Safe to call again
  // after a page renders more content.
  IW.bindEditables = () => {
    if (!IW.editMode) return;
    document.querySelectorAll('[data-edit]:not([data-iw-bound])').forEach(el => {
      el.setAttribute('data-iw-bound', '');
      el.setAttribute('contenteditable', 'true');
      el.setAttribute('spellcheck', 'true');
      el.addEventListener('input', () => post({ type: 'text', key: el.getAttribute('data-edit'), html: el.innerHTML }));
      el.addEventListener('focus', () => post({ type: 'focus', key: el.getAttribute('data-edit') }));
      // Keep pasted text plain so styling stays on-brand
      el.addEventListener('paste', e => {
        e.preventDefault();
        const t = (e.clipboardData || window.clipboardData).getData('text/plain');
        document.execCommand('insertText', false, t);
      });
    });
    post({ type: 'keys', keys: Array.from(document.querySelectorAll('[data-edit]')).map(el => ({
      key: el.getAttribute('data-edit'), text: el.textContent.trim().slice(0, 80)
    })) });
  };

  function startEditMode() {
    document.documentElement.classList.add('iw-editing');
    // Links shouldn't navigate while editing. Clicking product content jumps to
    // that product in Admin → Products.
    document.addEventListener('click', e => {
      const a = e.target.closest('a, button');
      const prod = e.target.closest('[data-product-id]');
      const card = e.target.closest('a.product-card');
      if (e.target.closest('[data-edit]')) { if (a) e.preventDefault(); return; }
      if (card) { e.preventDefault(); post({ type: 'product', id: new URL(card.href).searchParams.get('p') }); return; }
      if (prod && !e.target.closest('.gal-nav, .gal-thumbs')) { if (a) e.preventDefault(); post({ type: 'product', id: prod.getAttribute('data-product-id') }); return; }
      if (a && !a.closest('.gal-nav, .gal-thumbs')) e.preventDefault();
    }, true);

    window.addEventListener('message', e => {
      if (e.origin !== location.origin || !e.data || !e.data.iw) return;
      if (e.data.type === 'texts') IW.applyTexts(e.data.texts);
      if (e.data.type === 'reset') {
        const el = document.querySelector('[data-edit="' + CSS.escape(e.data.key) + '"]');
        if (el) el.innerHTML = el.getAttribute('data-default');
      }
      if (e.data.type === 'scrollTo') {
        const el = document.querySelector('[data-edit="' + CSS.escape(e.data.key) + '"]');
        if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.focus(); }
      }
    });
    post({ type: 'ready', title: document.title });
    IW.bindEditables();
  }

  /* ── boot ────────────────────────────────────────────────────── */
  IW.ready = (async () => {
    const site = await IW.loadSite();
    IW.applyTexts(site.texts);
    if (IW.editMode) startEditMode();
    return site;
  })();

  // Mobile menu (shared)
  window.toggleMobileMenu = function () {
    const m = document.getElementById('mobile-menu');
    if (m) m.classList.toggle('open');
  };
})();
