/* Minimal cart logic with localStorage */
(function () {
  const CART_KEY = 'banda4erep_cart_v1';

  function readCart() {
    try {
      const raw = localStorage.getItem(CART_KEY);
      return raw ? JSON.parse(raw) : { items: [] };
    } catch (e) {
      return { items: [] };
    }
  }

  function writeCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateBadge();
    renderMiniCart();
    window.dispatchEvent(new CustomEvent('cart:updated'));
  }

  function addItem(item) {
    const cart = readCart();
    const existing = cart.items.find((x) => x.sku === item.sku);
    if (existing) {
      existing.qty += item.qty;
    } else {
      cart.items.push(item);
    }
    writeCart(cart);
  }

  function removeItem(sku) {
    const cart = readCart();
    cart.items = cart.items.filter((x) => x.sku !== sku);
    writeCart(cart);
  }

  function updateBadge() {
    const badge = document.getElementById('cart-badge');
    if (!badge) return;
    const cart = readCart();
    const count = cart.items.reduce((sum, x) => sum + x.qty, 0);
    badge.textContent = String(count);
    badge.hidden = count === 0;
  }

  // Wire buttons on catalog
  document.addEventListener('click', function (e) {
    const btn = e.target.closest('.js-add-to-cart');
    if (btn) {
      const card = btn.closest('.card');
      if (!card) return;
      const sku = card.getAttribute('data-sku');
      const title = card.getAttribute('data-title');
      const price = Number(card.getAttribute('data-price')) || 0;
      const image = card.getAttribute('data-image');
      addItem({ sku, title, price, image, qty: 1 });
      btn.textContent = 'В корзине';
      setTimeout(() => (btn.textContent = 'Купить'), 1200);
      return;
    }
  });

  // Observe sections for enter animation
  const observer = new IntersectionObserver((entries)=>{
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    }
  }, { rootMargin: '0px 0px -15% 0px', threshold: 0.15 });

  document.querySelectorAll('main section').forEach((sec)=>{
    sec.classList.add('section-animate');
    observer.observe(sec);
  });

  // Product modal
  const productCards = document.querySelectorAll('.js-product');
  const modal = document.getElementById('product-modal');
  const pmImage = document.getElementById('pm-image');
  const pmTitle = document.getElementById('pm-title');
  const pmDesc = document.getElementById('pm-desc');
  const pmPrice = document.getElementById('pm-price');
  const pmQty = document.getElementById('pm-qty');
  const pmInc = document.getElementById('pm-inc');
  const pmDec = document.getElementById('pm-dec');
  const pmBuy = document.getElementById('pm-buy');

  const DESCS = {
    'tshirt': 'Белая, оверсайз, хлопок. Аккуратно сидит и держит форму.',
    'hoodie': 'Белое оверсайз худи. Мягкий флис внутри.',
    'zip-hoodie': 'Белое оверсайз зип-худи на молнии.',
    'longsleeve': 'Белый лонгслив, оверсайз посадка, базовая модель.'
  };

  function openModalFrom(card){
    if (!modal) return;
    const sku = card.getAttribute('data-sku');
    const title = card.getAttribute('data-title');
    const price = Number(card.getAttribute('data-price')) || 0;
    const image = card.getAttribute('data-image');
    pmImage.src = image; pmImage.alt = title;
    pmTitle.textContent = title;
    pmDesc.textContent = DESCS[sku] || '';
    pmPrice.textContent = price.toLocaleString('ru-RU', {style:'currency', currency:'RUB', maximumFractionDigits:0});
    pmQty.value = 1;
    pmBuy.onclick = function(){ addItem({ sku, title, price, image, qty: Math.max(1, Number(pmQty.value)||1) }); };
    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }
  function closeModal(){ if(!modal) return; modal.classList.remove('is-open'); document.body.style.overflow=''; }

  productCards.forEach((card)=>{
    card.addEventListener('click', function(e){
      if (e.target.closest('.js-add-to-cart')) return; // ignore buy button
      openModalFrom(card);
    });
  });
  modal?.addEventListener('click', function(e){ if (e.target.hasAttribute('data-close')) closeModal(); });
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape') closeModal(); });
  pmInc?.addEventListener('click', ()=> pmQty.value = Math.max(1, Number(pmQty.value||1)+1));
  pmDec?.addEventListener('click', ()=> pmQty.value = Math.max(1, Number(pmQty.value||1)-1));

  // Expose simple API for product pages
  window.BCart = {
    read: readCart,
    write: writeCart,
    add: addItem,
    remove: removeItem,
    updateBadge,
  };

  updateBadge();
  renderMiniCart();
  renderDrawerCart();

  // Mini cart rendering
  function formatRub(v){ return (v).toLocaleString('ru-RU', {style:'currency', currency:'RUB', maximumFractionDigits:0}); }
  function renderMiniCart(){
    const wrap = document.getElementById('mini-cart');
    const list = document.getElementById('mini-cart-list');
    const totalEl = document.getElementById('mini-cart-total');
    if (!wrap || !list || !totalEl) return;
    const cart = readCart();
    list.innerHTML = '';
    let total = 0;
    for (const it of cart.items) {
      const row = document.createElement('div');
      row.className = 'mini-cart__item';
      row.innerHTML = `
        <div class="mini-cart__thumb"><img src="${it.image}" alt="${it.title}"></div>
        <div>
          <div class="mini-cart__name">${it.title}</div>
          <div class="mini-cart__meta">${formatRub(it.price)} × ${it.qty}</div>
        </div>
        <div class="mini-cart__meta">${formatRub(it.price * it.qty)}</div>
        <button class="btn btn-ghost js-mini-remove" data-sku="${it.sku}">Удалить</button>
      `;
      list.appendChild(row);
      total += it.price * it.qty;
    }
    totalEl.textContent = formatRub(total);
    const drawerOpen = document.getElementById('cart-drawer')?.classList.contains('is-open');
    wrap.classList.toggle('is-open', cart.items.length > 0 && !drawerOpen);
  }

  document.addEventListener('click', function(e){
    if (e.target.closest('.mini-cart__close')) {
      const wrap = document.getElementById('mini-cart');
      wrap?.classList.remove('is-open');
    }
    const rm = e.target.closest('.js-mini-remove');
    if (rm) {
      removeItem(rm.getAttribute('data-sku'));
      renderMiniCart();
    }
  });

  // Drawer cart
  function formatRub(v){ return (v).toLocaleString('ru-RU', {style:'currency', currency:'RUB', maximumFractionDigits:0}); }
  function renderDrawerCart(){
    const wrap = document.getElementById('cart-drawer');
    const list = document.getElementById('drawer-cart-list');
    const totalEl = document.getElementById('drawer-cart-total');
    if (!wrap || !list || !totalEl) return;
    const cart = readCart();
    list.innerHTML = '';
    let total = 0;
    for (const it of cart.items) {
      const li = document.createElement('li');
      li.className = 'cart-item';
      li.innerHTML = `
        <div class="cart-item__thumb"><img src="${it.image}" alt="${it.title}"></div>
        <div>
          <div class="cart-item__title">${it.title}</div>
          <div class="cart-item__meta">${formatRub(it.price)} / шт.</div>
        </div>
        <div class="cart-item__actions">
          <div class="qty">
            <button class="btn btn-ghost js-dec" data-sku="${it.sku}" aria-label="Уменьшить">−</button>
            <input class="js-qty" data-sku="${it.sku}" type="number" min="1" value="${it.qty}">
            <button class="btn btn-ghost js-inc" data-sku="${it.sku}" aria-label="Увеличить">+</button>
          </div>
          <button class="btn btn-ghost js-remove" data-sku="${it.sku}">Удалить</button>
        </div>`;
      list.appendChild(li);
      total += it.price * it.qty;
    }
    totalEl.textContent = formatRub(total);
  }

  document.addEventListener('click', function(e){
    const open = e.target.closest('.js-open-cart');
    if (open) {
      e.preventDefault();
      document.getElementById('cart-drawer')?.classList.add('is-open');
      // hide mini cart while drawer is open
      document.getElementById('mini-cart')?.classList.remove('is-open');
      renderDrawerCart();
    }
    if (e.target.hasAttribute('data-cart-close')) {
      document.getElementById('cart-drawer')?.classList.remove('is-open');
      // re-show mini cart if items exist
      renderMiniCart();
    }
  });

  document.addEventListener('click', function(e){
    const dec = e.target.closest('.js-dec');
    const inc = e.target.closest('.js-inc');
    if (dec || inc) {
      const sku = (dec||inc).getAttribute('data-sku');
      const delta = inc ? 1 : -1;
      const cart = readCart();
      const it = cart.items.find(i=>i.sku===sku);
      if (it) { it.qty = Math.max(1, it.qty + delta); writeCart(cart); renderDrawerCart(); }
    }
    const rm = e.target.closest('.js-remove');
    if (rm) { removeItem(rm.getAttribute('data-sku')); renderDrawerCart(); }
  });

  // Smooth scroll for nav links
  document.querySelectorAll('.nav__link[href^="#"]').forEach((link)=>{
    link.addEventListener('click', function(e){
      const href = link.getAttribute('href');
      if (!href || href === '#') return;
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        history.pushState(null, '', href);
        document.querySelectorAll('.nav__link').forEach((a)=> a.classList.toggle('is-active', a === link));
      }
    });
  });

  // Sync other open pages/tabs
  window.addEventListener('storage', function(){
    updateBadge();
    renderMiniCart();
    window.dispatchEvent(new CustomEvent('cart:updated'));
  });
})();


