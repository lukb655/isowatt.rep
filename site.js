// ── NAVIGATION ──
function initNav(activePage) {
  const pages = ['home','configurator','about','contact'];
  const hrefs = {
    home: 'index.html',
    configurator: 'configurator.html',
    about: 'about.html',
    contact: 'contact.html'
  };

  const nav = document.getElementById('main-nav');
  if (!nav) return;

  nav.innerHTML = `
    <a href="index.html" class="wordmark" aria-label="IsoWatt home">
      <span><span class="iso">Iso</span><span class="watt">Watt</span></span>
      <span class="sub">Consumer Grade · Industrial Power</span>
    </a>
    <ul class="nav-links">
      <li><a href="index.html" ${activePage==='home'?'class="active"':''}>Home</a></li>
      <li><a href="configurator.html" ${activePage==='configurator'?'class="active"':''}>Configurator</a></li>
      <li><a href="about.html" ${activePage==='about'?'class="active"':''}>About</a></li>
      <li><a href="contact.html" ${activePage==='contact'?'class="active"':''}>Contact</a></li>
    </ul>
    <a href="configurator.html" class="nav-cta">Build Yours ↗</a>
    <button class="nav-burger" id="burger" aria-label="Open menu" aria-expanded="false">
      <span></span><span></span><span></span>
    </button>
  `;

  const mobileMenu = document.getElementById('mobile-menu');
  if (mobileMenu) {
    mobileMenu.innerHTML = `
      <a href="index.html" ${activePage==='home'?'class="amber"':''}>Home</a>
      <a href="configurator.html" ${activePage==='configurator'?'class="amber"':''}>Configurator</a>
      <a href="about.html" ${activePage==='about'?'class="amber"':''}>About</a>
      <a href="contact.html" ${activePage==='contact'?'class="amber"':''}>Contact</a>
      <a href="configurator.html" class="amber">Build Yours ↗</a>
    `;
  }

  const burger = document.getElementById('burger');
  if (burger && mobileMenu) {
    burger.addEventListener('click', () => {
      const open = mobileMenu.classList.toggle('open');
      burger.setAttribute('aria-expanded', open);
    });
  }
}

// ── FOOTER ──
function initFooter() {
  const footer = document.getElementById('main-footer');
  if (!footer) return;
  const year = new Date().getFullYear();
  footer.innerHTML = `
    <div class="footer-inner">
      <div class="footer-col">
        <div class="col-title">IsoWatt</div>
        <p>Portable LiFePO4 power systems built by hand in Lebanon, PA.</p>
        <p style="margin-top:0.75rem;">Consumer Grade.<br>Industrial Power.</p>
      </div>
      <div class="footer-col">
        <div class="col-title">Products</div>
        <a href="configurator.html">IsoPoint — 12Ah</a>
        <a href="configurator.html">IsoBase — 12Ah + AC</a>
        <a href="configurator.html">IsoWatt — 100Ah</a>
        <a href="configurator.html">IsoStation — Coming Soon</a>
      </div>
      <div class="footer-col">
        <div class="col-title">Company</div>
        <a href="about.html">About</a>
        <a href="contact.html">Contact</a>
        <a href="configurator.html">Build Yours</a>
        <p style="margin-top:0.75rem;">Lebanon, PA</p>
      </div>
    </div>
    <div class="footer-bottom">
      <span>© ${year} <span class="amber">IsoWatt</span> · All rights reserved</span>
      <span>Built to order · Ships in 2–4 weeks · LiFePO4 Chemistry</span>
    </div>
  `;
}

// ── SCROLL REVEAL ──
function initReveal() {
  const els = document.querySelectorAll('.reveal');
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });
  els.forEach(el => obs.observe(el));
}

document.addEventListener('DOMContentLoaded', () => initReveal());
