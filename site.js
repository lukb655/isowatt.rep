function initNav(currentPage) {
  const nav = document.getElementById('main-nav');
  if (!nav) return;
  
  const navHTML = `
    <div class="nav-left">
      <a href="index.html" class="nav-logo">
        <span class="iso">Iso</span>Watt
      </a>
    </div>
    <div class="nav-center">
      <a href="index.html" class="nav-link ${currentPage === 'home' ? 'active' : ''}">Home</a>
      <a href="products.html" class="nav-link ${currentPage === 'products' ? 'active' : ''}">Products</a>
    </div>
    <div class="nav-right">
      <span class="nav-location">Bellefonte, PA</span>
    </div>
  `;
  
  nav.innerHTML = navHTML;
}

// Detect current page if not specified
if (!window.currentPageSet) {
  const path = window.location.pathname;
  if (path.includes('products')) {
    initNav('products');
  } else if (path.includes('configurator')) {
    initNav('home');
  } else {
    initNav('home');
  }
  window.currentPageSet = true;
}
