/* =========================================================
   浆造所 · 交互
   ========================================================= */

(function () {
  'use strict';

  document.documentElement.classList.add('js');

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const pad = (n) => String(n).padStart(2, '0');
  const typeLabel = (r) => TYPES[r.t] ? TYPES[r.t].label : '';
  const catLabel = (r) => r.t === 'soy' && r.s && SUBS[r.s]
    ? `${typeLabel(r)} · ${SUBS[r.s]}`
    : typeLabel(r);

  const byId = (id) => RECIPES.find((r) => r.id === id);

  function gramsOf(recipe) {
    return recipe.i.reduce((sum, item) => {
      const m = String(item[1]).match(/([\d.]+)\s*g/i);
      return sum + (m ? parseFloat(m[1]) : 0);
    }, 0);
  }

  function minutesOf(recipe) {
    const m = String(recipe.tm).match(/(\d+)/);
    return m ? parseInt(m[1], 10) : 99;
  }

  function esc(str) {
    return String(str).replace(/[&<>"]/g, (s) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[s]));
  }

  /* ---------------- counts ---------------- */
  function renderCounts() {
    $$('[data-count-total]').forEach((el) => { el.textContent = RECIPES.length; });
    $$('[data-count-home]').forEach((el) => { el.textContent = RECIPES.filter((r) => r.h).length; });
    $$('[data-count-type]').forEach((el) => {
      const t = el.getAttribute('data-count-type');
      el.textContent = RECIPES.filter((r) => r.t === t).length;
    });
    $$('[data-count-sub]').forEach((el) => {
      const s = el.getAttribute('data-count-sub');
      el.textContent = RECIPES.filter((r) => r.t === 'soy' && r.s === s).length;
    });
  }

  /* ---------------- card ---------------- */
  function cardHTML(r, index) {
    const color = TYPES[r.t] ? TYPES[r.t].color : '#6e7f45';
    const names = r.i.map((x) => x[0]).slice(0, 4).join(' · ');
    return `
      <article class="rcard" data-id="${r.id}" tabindex="0" role="button"
        aria-label="查看 ${esc(r.n)} 的做法" style="--c:${color}">
        <div class="rcard-img">
          <img src="assets/img/${r.img}" alt="${esc(r.n)}" loading="lazy" decoding="async" width="1024" height="636">
        </div>
        <div class="rcard-body">
          <div class="rcard-top">
            <span class="cat"><i></i>${esc(catLabel(r))}</span>
            ${r.h ? '<span class="badge-home">家藏</span>' : ''}
            <span class="num">${pad(index + 1)}</span>
          </div>
          <h3>${esc(r.n)}</h3>
          <p class="ings">${esc(names)}</p>
          <div class="rcard-bottom">
            <span class="meta">${esc(r.w)} · ${esc(r.m)}模式</span>
            <span class="view">看做法 →</span>
          </div>
        </div>
      </article>`;
  }

  function bindCards(root) {
    $$('.rcard', root || document).forEach((card) => {
      if (card.dataset.bound) return;
      card.dataset.bound = '1';
      const open = () => openRecipe(card.getAttribute('data-id'));
      card.addEventListener('click', open);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
      });
    });
  }

  /* ---------------- recipe dialog ---------------- */
  let dialog;

  function ensureDialog() {
    if (dialog) return dialog;
    dialog = $('#recipeDialog');
    if (!dialog) return null;

    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) closeRecipe();
    });
    dialog.addEventListener('cancel', () => {
      document.body.style.overflow = '';
      clearRecipeParam();
    });
    dialog.addEventListener('close', () => {
      document.body.style.overflow = '';
      clearRecipeParam();
    });
    return dialog;
  }

  function stepsFor(r) {
    const liquid = /不加/.test(r.w) ? '杯中不加液体' : `加入 ${r.w} 液体`;
    const finish = r.finish || '程序结束后倒出，趁热饮用；甜度按自己的口味再调。';
    return [
      r.prep,
      `食材放入破壁机，${liquid}，选择「${r.m}」模式，${r.tm}。`,
      finish
    ];
  }

  function openRecipe(id) {
    const r = byId(id);
    if (!r) return;
    const dlg = ensureDialog();
    if (!dlg) { window.location.href = `recipes.html?id=${encodeURIComponent(id)}`; return; }

    const color = TYPES[r.t] ? TYPES[r.t].color : '#6e7f45';
    const steps = stepsFor(r);
    const ings = r.i.map((x) => `<li><span>${esc(x[0])}</span><span>${esc(x[1])}</span></li>`).join('');
    dlg.style.setProperty('--c', color);
    dlg.innerHTML = `
      <div class="rd-head">
        <div>
          <div class="rd-type"><i></i>${esc(catLabel(r))}${r.h ? ' · 你的收藏' : ''}</div>
          <h2 id="rdTitle">${esc(r.n)}</h2>
          <div class="rd-tags">${r.g.map((t) => `<span>${esc(t)}</span>`).join('')}</div>
        </div>
        <button class="rd-close" type="button" data-close-recipe aria-label="关闭配方">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
      </div>
      <div class="rd-img">
        <img src="assets/img/${r.img}" alt="${esc(r.n)}" width="1024" height="636">
      </div>
      <div class="rd-body">
        <p class="rd-intro">${esc(r.d)}</p>
        <div class="rd-stats">
          <div><b>模式</b><span>${esc(r.m)}</span></div>
          <div><b>用时</b><span>${esc(r.tm)}</span></div>
          <div><b>液体量</b><span>${esc(r.w)}</span></div>
        </div>
        <div class="rd-cols">
          <div>
            <h3>食材</h3>
            <ul class="ing-list">${ings}</ul>
          </div>
          <div>
            <h3>做法</h3>
            <ol class="steps">${steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
          </div>
        </div>
        ${r.tip ? `<div class="rd-tip"><h3>一杯的经验</h3><p>${esc(r.tip)}</p></div>` : ''}
        <div class="rd-foot">
          <button class="btn" type="button" data-random>换一杯试试 <span class="arrow">→</span></button>
          <button class="btn ghost" type="button" data-similar="${r.t}">看同类配方</button>
        </div>
      </div>`;

    $('[data-close-recipe]', dlg).addEventListener('click', closeRecipe);
    $$('[data-random]', dlg).forEach((b) => b.addEventListener('click', (e) => {
      e.preventDefault();
      openRecipe(RECIPES[Math.floor(Math.random() * RECIPES.length)].id);
    }));
    $$('[data-similar]', dlg).forEach((b) => b.addEventListener('click', (e) => {
      e.preventDefault();
      closeRecipe();
      window.location.href = `recipes.html?type=${encodeURIComponent(b.getAttribute('data-similar'))}`;
    }));

    if (!dlg.open) {
      dlg.showModal();
      document.body.style.overflow = 'hidden';
    }
    dlg.scrollTop = 0;
    dlg.setAttribute('aria-labelledby', 'rdTitle');

    if (document.body.classList.contains('page-recipes')) {
      const url = new URL(window.location.href);
      url.hash = `r-${r.id}`;
      history.replaceState(null, '', url);
    }
  }

  function closeRecipe() {
    if (dialog && dialog.open) dialog.close();
    document.body.style.overflow = '';
    clearRecipeParam();
  }

  function clearRecipeParam() {
    if (!document.body.classList.contains('page-recipes')) return;
    const url = new URL(window.location.href);
    if (url.hash || url.searchParams.has('id')) {
      url.hash = '';
      url.searchParams.delete('id');
      history.replaceState(null, '', url);
    }
  }

  /* ---------------- home ---------------- */
  function renderHome() {
    const dailyEl = $('[data-daily]');
    if (!dailyEl) return;

    const day = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    const pool = RECIPES.filter((r) => r.h);
    const today = pool[day % pool.length];
    $('[data-daily-name]').textContent = today.n;
    $('[data-daily-ing]').textContent = today.i.map((x) => x[0]).join(' · ') + `　${today.w}`;
    const link = $('[data-daily-link]');
    link.href = `recipes.html?id=${today.id}`;
    const dailyImg = $('[data-daily-img]');
    if (dailyImg) {
      dailyImg.src = `assets/img/${today.img}`;
      dailyImg.alt = today.n;
    }
    const dateEl = $('[data-daily-date]');
    if (dateEl) {
      const now = new Date();
      dateEl.textContent = `${now.getMonth() + 1} 月 ${now.getDate()} 日`;
    }

    const featured = $('[data-featured]');
    if (featured) {
      const picks = [pool[day % pool.length], pool[(day + 5) % pool.length], pool[(day + 10) % pool.length]];
      featured.innerHTML = picks.map((r, idx) => {
        const color = TYPES[r.t].color;
        return `
          <article class="feature-card" data-id="${r.id}" tabindex="0" role="button"
            aria-label="查看 ${esc(r.n)} 的做法" style="--c:${color}">
            <div class="feature-img">
              <img src="assets/img/${r.img}" alt="${esc(r.n)}" loading="lazy" decoding="async" width="1024" height="636">
            </div>
            <div class="feature-body">
              <div class="topline"><span>${esc(catLabel(r))}</span><span>${pad(idx + 1)} / 03</span></div>
              <h3>${esc(r.n)}</h3>
              <p class="ings">${esc(r.i.map((x) => x[0]).join(' · '))}</p>
              <div class="meta"><span><b>水</b>${esc(r.w)}</span><span><b>模式</b>${esc(r.m)}</span></div>
              <span class="big-char">${esc(r.n.slice(0, 1))}</span>
            </div>
          </article>`;
      }).join('');
      $$('.feature-card', featured).forEach((card) => {
        const open = () => openRecipe(card.getAttribute('data-id'));
        card.addEventListener('click', open);
        card.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
        });
      });
    }
  }

  /* ---------------- recipes page ---------------- */
  const state = { type: 'all', sub: 'all', home: false, q: '', sort: 'default', shown: 15 };

  function initRecipes() {
    const grid = $('[data-recipe-grid]');
    if (!grid) return;

    const tabs = $('[data-type-tabs]');
    const subBar = $('[data-sub-toolbar]');
    const search = $('[data-search]');
    const sortBtn = $('[data-sort]');
    const moreWrap = $('[data-more]');
    const countEl = $('[data-result-count]');

    const params = new URLSearchParams(window.location.search);
    if (params.get('type') && TYPES[params.get('type')]) state.type = params.get('type');
    if (params.get('sub') && SUBS[params.get('sub')]) state.sub = params.get('sub');
    if (params.get('q')) state.q = params.get('q');
    if (params.get('home') === '1') state.home = true;

    // tabs
    tabs.innerHTML = [`<button class="chip" data-type="all">全部 <span class="n">${RECIPES.length}</span></button>`]
      .concat(Object.keys(TYPES).map((t) => {
        const n = RECIPES.filter((r) => r.t === t).length;
        return `<button class="chip" data-type="${t}" style="--c:${TYPES[t].color}"><span class="dot"></span>${TYPES[t].label} <span class="n">${n}</span></button>`;
      })).join('') + `<button class="chip home-chip" data-home="1">家藏 15 款</button>`;

    $$('.chip', tabs).forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.hasAttribute('data-home')) {
          state.home = !state.home;
          if (state.home) { state.type = 'all'; state.sub = 'all'; }
        } else {
          state.type = btn.getAttribute('data-type');
          state.sub = 'all';
        }
        state.shown = 15;
        sync();
        render();
      });
    });

    search.value = state.q;
    search.addEventListener('input', () => {
      state.q = search.value.trim();
      state.shown = 15;
      render();
    });

    sortBtn.addEventListener('click', () => {
      state.sort = state.sort === 'default' ? 'grams' : state.sort === 'grams' ? 'time' : 'default';
      state.shown = 15;
      sync();
      render();
    });

    moreWrap.addEventListener('click', () => {
      state.shown += 15;
      render();
    });

    function sync() {
      $$('.chip', tabs).forEach((b) => {
        b.classList.toggle('is-on', !b.hasAttribute('data-home') && b.getAttribute('data-type') === state.type);
      });
      const homeChip = $('.home-chip', tabs);
      if (homeChip) homeChip.classList.toggle('is-on', state.home);

      const isSoy = state.type === 'soy';
      subBar.hidden = !isSoy;
      if (isSoy) {
        subBar.innerHTML = [`<button class="sub-chip" data-sub="all">全部豆浆</button>`]
          .concat(Object.keys(SUBS).map((s) => `<button class="sub-chip" data-sub="${s}">${SUBS[s]}</button>`)).join('');
        $$('.sub-chip', subBar).forEach((b) => {
          b.classList.toggle('is-on', b.getAttribute('data-sub') === state.sub);
          b.addEventListener('click', () => {
            state.sub = b.getAttribute('data-sub');
            state.shown = 15;
            sync();
            render();
          });
        });
      }
      sortBtn.textContent = state.sort === 'default' ? '推荐顺序' : state.sort === 'grams' ? '干料 轻 → 重' : '用时 短 → 长';
    }

    function filtered() {
      let list = RECIPES.slice();
      if (state.type !== 'all') list = list.filter((r) => r.t === state.type);
      if (state.type === 'soy' && state.sub !== 'all') list = list.filter((r) => r.s === state.sub);
      if (state.home) list = list.filter((r) => r.h);
      if (state.q) {
        const q = state.q.toLowerCase();
        list = list.filter((r) => {
          const hay = [r.n, r.d, ...r.g, ...r.i.map((x) => x[0]), catLabel(r)].join(' ').toLowerCase();
          return hay.includes(q);
        });
      }
      if (state.sort === 'grams') list.sort((a, b) => gramsOf(a) - gramsOf(b));
      if (state.sort === 'time') list.sort((a, b) => minutesOf(a) - minutesOf(b));
      return list;
    }

    function render() {
      const list = filtered();
      const slice = list.slice(0, state.shown);
      countEl.innerHTML = `共 <b>${list.length}</b> 款配方${state.home ? ' · 仅看家藏' : ''}`;
      if (!list.length) {
        grid.innerHTML = `<div class="empty-state"><h3>没有找到这杯</h3><p>换一个关键词，或者把筛选放宽一点。</p></div>`;
      } else {
        grid.innerHTML = slice.map((r, i) => cardHTML(r, i)).join('');
        bindCards(grid);
      }
      moreWrap.hidden = list.length <= state.shown;

      const url = new URL(window.location.href);
      if (state.type === 'all') url.searchParams.delete('type'); else url.searchParams.set('type', state.type);
      if (state.type === 'soy' && state.sub !== 'all') url.searchParams.set('sub', state.sub); else url.searchParams.delete('sub');
      if (state.home) url.searchParams.set('home', '1'); else url.searchParams.delete('home');
      if (state.q) url.searchParams.set('q', state.q); else url.searchParams.delete('q');
      history.replaceState(null, '', url);
    }

    sync();
    render();

    const deepId = params.get('id');
    if (deepId) setTimeout(() => openRecipe(deepId), 80);
  }

  /* ---------------- beyond ---------------- */
  function initBeyond() {
    $$('[data-beyond]').forEach((el) => {
      const t = el.getAttribute('data-beyond');
      const list = RECIPES.filter((r) => r.t === t);
      el.innerHTML = list.map((r, i) => cardHTML(r, i)).join('');
      bindCards(el);
    });
  }

  /* ---------------- pantry ---------------- */
  function initPantry() {
    const grid = $('[data-pantry-grid]');
    if (!grid) return;
    const groups = ['全部', ...Array.from(new Set(INGREDIENTS.map((x) => x.group)))];
    const bar = $('[data-pantry-tabs]');
    bar.innerHTML = groups.map((g, i) => `<button class="chip ${i === 0 ? 'is-on' : ''}" data-group="${g}">${g} <span class="n">${g === '全部' ? INGREDIENTS.length : INGREDIENTS.filter((x) => x.group === g).length}</span></button>`).join('');

    function render(group) {
      const list = group === '全部' ? INGREDIENTS : INGREDIENTS.filter((x) => x.group === group);
      grid.innerHTML = list.map((x) => `
        <article class="ing-card reveal in" style="--c:${x.c}">
          <div class="ing-img">
            <img src="assets/img/${x.img}" alt="${esc(x.name)}" loading="lazy" decoding="async" width="640" height="596">
            <span class="glyph">${esc(x.glyph)}</span>
          </div>
          <div class="ing-body">
            <div class="ing-top">
              <div><h3>${esc(x.name)}</h3><div class="alias">${esc(x.alias)}</div></div>
            </div>
            <p class="role">${esc(x.role)}</p>
            <div class="facts">
              <span><b>浸泡</b>　${esc(x.soak)}</span>
              <span><b>参考量</b>　${esc(x.dose)}</span>
              <span><b>提示</b>　${esc(x.note)}</span>
            </div>
          </div>
        </article>`).join('');
    }
    bar.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-group]');
      if (!btn) return;
      $$('.chip', bar).forEach((b) => b.classList.toggle('is-on', b === btn));
      render(btn.getAttribute('data-group'));
    });
    render('全部');
  }

  /* ---------------- calculator ---------------- */
  function initCalc() {
    const calc = $('[data-calc]');
    if (!calc) return;
    const dry = $('[data-dry]', calc);
    const dryOut = $('[data-dry-out]', calc);
    const waterOut = $('[data-water-out]', calc);
    const cupsOut = $('[data-cups-out]', calc);
    const levelOut = $('[data-level-out]', calc);
    const ratioOut = $('[data-ratio-out]', calc);
    const presets = $$('[data-ratio]', calc);
    let ratio = 12;

    function update() {
      const grams = parseInt(dry.value, 10);
      const water = Math.round((grams * ratio) / 10) * 10;
      const cups = water / 250;
      dryOut.innerHTML = `${grams}<small>g</small>`;
      waterOut.innerHTML = `${water}<small>ml</small>`;
      ratioOut.textContent = `1 : ${ratio}`;
      cupsOut.textContent = `约 ${cups.toFixed(1).replace('.0', '')} 杯（250 ml/杯）`;
      levelOut.textContent = ratio >= 14 ? '清爽' : ratio >= 11 ? '日常' : ratio >= 8.5 ? '浓郁' : '糊状';
      presets.forEach((b) => b.classList.toggle('is-on', Number(b.getAttribute('data-ratio')) === ratio));
      const fill = ((ratio - 6) / 10) * 100;
      dry.style.setProperty('--fill', `${fill}%`);
    }

    dry.addEventListener('input', update);
    presets.forEach((b) => b.addEventListener('click', () => {
      ratio = Number(b.getAttribute('data-ratio'));
      update();
    }));
    update();
  }

  /* ---------------- modes table ---------------- */
  function initModes() {
    const gallery = $('[data-mode-gallery]');
    if (gallery) {
      gallery.innerHTML = MODES.filter((m) => m.img).map((m) => `
        <a class="mode-tile" href="${m.link}">
          <img src="assets/img/${m.img}" alt="${esc(m.name)}模式成品" loading="lazy" decoding="async" width="1024" height="636">
          <span class="mode-tile-label"><b>${esc(m.name)}</b><span>${esc(m.time)}</span></span>
        </a>`).join('');
    }
    const tbody = $('[data-modes]');
    if (!tbody) return;
    tbody.innerHTML = MODES.map((m) => `
      <tr>
        <td>${esc(m.name)}</td>
        <td>${esc(m.time)}</td>
        <td>${esc(m.use)}</td>
        <td>${esc(m.note)}</td>
      </tr>`).join('');
  }

  /* ---------------- reveal ---------------- */
  function initReveal() {
    const els = $$('.reveal');
    if (!els.length) return;
    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    els.forEach((el) => io.observe(el));
  }

  /* ---------------- random ---------------- */
  function initRandom() {
    $$('[data-random]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const r = RECIPES[Math.floor(Math.random() * RECIPES.length)];
        if ($('#recipeDialog')) openRecipe(r.id);
        else window.location.href = `recipes.html?id=${r.id}`;
      });
    });
  }

  /* ---------------- boot ---------------- */
  document.addEventListener('DOMContentLoaded', () => {
    renderCounts();
    ensureDialog();
    renderHome();
    initRecipes();
    initBeyond();
    initPantry();
    initCalc();
    initModes();
    initRandom();
    initReveal();

    // close recipe with ESC is native; also clear hash on hashchange removal
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && dialog && dialog.open) closeRecipe();
    });
  });
})();
