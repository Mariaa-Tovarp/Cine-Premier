/* =====================================
   Premier Films · cart.js (limpio, único)
   ===================================== */

/* ====== Config ====== */
const CART_KEY = 'carrito_premier';           // items array
const META_KEY = 'carrito_premier_meta';      // { promo: { code, ... } }

/* ====== Utils ====== */
const $ = (s, sc=document) => sc.querySelector(s);
const fmtCOP = (n) => {
  const v = Number(n) || 0;
  return v.toLocaleString('es-CO', { style:'currency', currency:'COP', maximumFractionDigits:0 });
};

/* ====== Storage ====== */
function loadItems(){
  try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); }
  catch { return []; }
}
function saveItems(items){
  localStorage.setItem(CART_KEY, JSON.stringify(items || []));
}
function loadMeta(){
  try { return JSON.parse(localStorage.getItem(META_KEY) || '{}'); }
  catch { return {}; }
}
function saveMeta(meta){
  localStorage.setItem(META_KEY, JSON.stringify(meta || {}));
}

/* ====== Promos (sincronizadas con Promociones) ======
   type: 'percent' -> value 0..1   |   'fixed' -> pesos
   cond(cart): condición opcional booleana sobre el array de items
*/
const COUPONS = {
  PRE10:   { code:'PRE10',   label:'Descuento 10%',          type:'percent', value:0.10 },
  FIESTA5: { code:'FIESTA5', label:'Fiesta Cine −$5.000',    type:'fixed',   value:5000 },
  MARTES2X1:{code:'MARTES2X1',label:'Martes 2x1 en 2D (50%)',type:'percent', value:0.50,
    cond: (cart)=> cart.some(i => (i.format||'').toUpperCase().includes('2D')) &&
                   cart.some(i => (i.date||'').toLowerCase().includes('martes'))
  },
  IMAXPRE: { code:'IMAXPRE', label:'IMAX Preventa −15%',     type:'percent', value:0.15,
    cond: (cart)=> cart.some(i => (i.format||'').toUpperCase().includes('IMAX'))
  }
};

function cartSubtotal(items){
  // Acepta item.total o item.subtotal (por compatibilidad)
  return items.reduce((acc, it) => acc + (Number(it.total ?? it.subtotal) || 0), 0);
}
function evalCoupon(items, couponObj){
  if(!couponObj) return { valid:false, discount:0, reason:'Sin cupón' };
  const sub = cartSubtotal(items);
  if(sub <= 0) return { valid:false, discount:0, reason:'Carrito vacío' };

  const def = COUPONS[(couponObj.code||'').toUpperCase()];
  if(!def) return { valid:false, discount:0, reason:'Código inválido' };
  if(def.cond && !def.cond(items)) return { valid:false, discount:0, reason:'No cumple condiciones' };

  let discount = 0;
  if(def.type === 'percent') discount = Math.round(sub * def.value);
  if(def.type === 'fixed')   discount = Math.min(sub, Math.round(def.value));
  return { valid:true, discount, label:def.label, code:def.code };
}

/* ====== API pública mínima ====== */
function add(item){
  // Normaliza el shape que llega desde asientos.js
  // Espera campos: id?, movie, cinema, date, time, format, seats[], total (num), poster?
  const items = loadItems();
  const id = item.id || ('TKT-' + Date.now());
  const total = Number(item.total ?? item.subtotal) || 0;
  items.push({ ...item, id, total });
  saveItems(items);
}
window.PF_CART = { add };

/* ====== Render ====== */
function renderCart(){
  const wrap = $('#cart-container');
  if(!wrap) return;

  const items = loadItems();
  const meta  = loadMeta();
  const sub   = cartSubtotal(items);
  const promoRes = evalCoupon(items, meta.promo);
  const discount = promoRes.valid ? promoRes.discount : 0;
  const grand    = Math.max(0, sub - discount);

  if(!items.length){
    wrap.innerHTML = `
      <section class="panel">
        <div class="empty">
          Tu carrito está vacío. 🛒<br>
          Ve a la cartelera o selecciona asientos para agregar una compra.
        </div>
      </section>`;
    return;
  }

  const listHtml = items.map(it => `
    <article class="cart-card">
      <div class="thumb">${it.poster ? `<img src="${it.poster}" alt="${it.movie||'Poster'}">` : ''}</div>
      <div class="item-body">
        <div class="item-title">${it.movie || it.title || 'Entradas'}</div>
        <div class="item-meta">
          ${it.cinema ? `<span>${it.cinema}</span> • `:''}
          ${it.date ? `<span>${it.date}</span> • `:''}
          ${it.time ? `<span>${it.time}</span> • `:''}
          ${it.format ? `<span>${it.format}</span>`:''}
        </div>
        ${it.seats?.length ? `<div class="item-meta"><span class="badge">🎟️ Asientos: ${it.seats.join(', ')}</span></div>`:''}
      </div>
      <div class="item-actions">
        <div class="price">${fmtCOP(it.total)}</div>
        <button class="remove" data-id="${it.id}">Eliminar</button>
      </div>
    </article>
  `).join('');

  wrap.innerHTML = `
    <section class="panel">
      <div class="cart-list">${listHtml}</div>
    </section>

    <aside class="panel summary">
      <h3>Resumen</h3>
      <div class="row"><span>Artículos</span><span>${items.length}</span></div>
      <div class="row"><span>Subtotal</span><span>${fmtCOP(sub)}</span></div>

      <div style="margin:10px 0;display:grid;gap:8px">
        <label for="coupon" style="color:#cbd5e1;font-weight:600">Código de descuento</label>
        <div style="display:flex;gap:8px">
          <input id="coupon" type="text" placeholder="Ej: PRE10"
            style="flex:1;background:#0f172a;border:1px solid rgba(255,255,255,.14);color:#e5e7eb;border-radius:10px;padding:10px 12px;outline:none">
          <button id="applyCoupon" class="btn-ghost" style="width:auto;padding:10px 14px">Aplicar</button>
        </div>
        <div id="couponMsg" style="font-size:12px;color:#a7b0c4"></div>
      </div>

      ${promoRes.valid ? `<div class="row"><span>Descuento (${promoRes.label})</span><span>- ${fmtCOP(discount)}</span></div>` : ''}

      <div class="total">
        <span>Total</span>
        <strong>${fmtCOP(grand)}</strong>
      </div>

      <button class="btn-primary" id="btnCheckout">Proceder al pago</button>
      <button class="btn-ghost" id="btnClear">Vaciar carrito</button>
      <div class="notice">Los descuentos VIP ya se aplicaron en la página de asientos.</div>
    </aside>
  `;

  // Prefill code si ya había uno
  if(meta.promo?.code) $('#coupon').value = meta.promo.code;

  // Eliminar item
  wrap.querySelectorAll('.remove').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = btn.getAttribute('data-id');
      const next = loadItems().filter(x => String(x.id) !== String(id));
      saveItems(next);
      renderCart();
    });
  });

  // Vaciar
  $('#btnClear')?.addEventListener('click', ()=>{
    if(confirm('¿Vaciar carrito?')){
      saveItems([]); saveMeta({}); renderCart();
    }
  });

  // Checkout (demo)
  $('#btnCheckout')?.addEventListener('click', ()=>{
    alert('Demo: aquí va tu flujo de pago.');
  });

  // Aplicar cupón
  $('#applyCoupon')?.addEventListener('click', ()=>{
    const code = ($('#coupon').value || '').trim().toUpperCase();
    const msg  = $('#couponMsg');

    if(!code){
      saveMeta({}); msg.textContent = 'Cupón eliminado.'; renderCart(); return;
    }
    const def = COUPONS[code];
    if(!def){ msg.textContent = 'Código inválido.'; return; }

    const test = evalCoupon(loadItems(), {code});
    if(!test.valid){ msg.textContent = 'Este cupón no aplica (' + (test.reason||'') + ').'; return; }

    saveMeta({ promo: { code:def.code } });
    msg.textContent = 'Cupón aplicado: ' + def.label;
    renderCart();
  });
}

/* ====== Init ====== */
document.addEventListener('DOMContentLoaded', renderCart);
