/* =========================================================
   浆造所 · 评分与评论（云端共享）
   依赖后端 API（Cloudflare Worker），接口见 jzs-backend/worker.mjs
   对外暴露 window.JZSCommunity：
     getStats(id)      读取某配方的 { avg, count, comments }
     decorateCards(root) 填充卡片上的 [data-rate] 占位
     renderDialog(id, container) 渲染详情弹窗内的评分评论区
   加载完成后派发 'jzs-stats' 事件，供 app.js 刷新卡片与排序
   ========================================================= */

(function () {
  'use strict';

  /* 部署 Worker 后填入地址，例如 https://jzs-api.xxx.workers.dev（末尾不带 /）
     本地开发（localhost / 127.0.0.1）走同源 /api 代理，见 jzs-backend/dev-server.mjs */
  const PROD_API = '';
  const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname);
  const API_BASE = isLocal ? '' : PROD_API;
  const configured = isLocal || !!PROD_API;

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const esc = (str) => String(str).replace(/[&<>"]/g, (s) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[s]));

  const stats = {};
  let serviceState = configured ? 'loading' : 'off'; // off | loading | ready | error

  /* 本机匿名身份：用于“我的评分”可修改、不重复计票 */
  let voter = '';
  try {
    voter = localStorage.getItem('jzs-voter') || '';
    if (!voter) {
      voter = (crypto.randomUUID ? crypto.randomUUID() : 'v-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10));
      localStorage.setItem('jzs-voter', voter);
    }
  } catch (e) { voter = 'v-' + Math.random().toString(36).slice(2, 12); }

  function getStats(id) {
    return stats[id] || { avg: 0, count: 0, comments: 0 };
  }

  function starsHTML(avg, extraClass) {
    const pct = Math.max(0, Math.min(5, avg)) / 5 * 100;
    return `<span class="stars ${extraClass || ''}" role="img" aria-label="平均 ${avg} 星（满分 5 星）"><span class="stars-bg" aria-hidden="true">★★★★★</span><span class="stars-fg" aria-hidden="true" style="width:${pct}%">★★★★★</span></span>`;
  }

  function fmtDate(t) {
    const d = new Date(t);
    if (isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  async function api(path, options) {
    const res = await fetch(API_BASE + path, options);
    let data = null;
    try { data = await res.json(); } catch (e) { /* ignore */ }
    if (!res.ok || !data || data.ok !== true) {
      const msg = (data && data.message) || (res.status === 429 ? '操作太频繁，请稍后再试' : '服务暂时不可用');
      throw Object.assign(new Error(msg), { status: res.status });
    }
    return data;
  }

  /* ---------------- 卡片装饰 ---------------- */
  function decorateCards(root) {
    $$('[data-rate]', root || document).forEach((el) => {
      const id = el.getAttribute('data-rate');
      if (serviceState !== 'ready') { el.innerHTML = ''; return; }
      const s = getStats(id);
      if (s.count > 0) {
        el.innerHTML = `${starsHTML(s.avg)}<b>${s.avg.toFixed(1)}</b><span>(${s.count})</span><span class="cm-sep">·</span><span>评论 ${s.comments}</span>`;
      } else {
        el.innerHTML = '<span class="no-rate">暂无评分</span>';
      }
    });
  }

  /* ---------------- 弹窗评分评论区 ---------------- */
  function commentItemHTML(c) {
    return `
      <article class="cm-item">
        <header><b>${esc(c.name)}</b><time>${fmtDate(c.t)}</time></header>
        <p>${esc(c.text)}</p>
      </article>`;
  }

  function summaryHTML(s) {
    return `
      <div class="cm-avg"><b>${s.count ? s.avg.toFixed(1) : '–'}</b><span>/ 5</span></div>
      ${starsHTML(s.avg, 'stars-lg')}
      <span class="cm-count">${s.count} 人评分 · ${s.comments} 条评论</span>`;
  }

  function pickerHTML(mine) {
    return [1, 2, 3, 4, 5].map((n) =>
      `<button type="button" data-stars="${n}" class="${n <= mine ? 'on' : ''}" aria-label="评 ${n} 星" aria-pressed="${n === mine}">★</button>`
    ).join('');
  }

  async function renderDialog(id, container) {
    if (!container) return;
    if (serviceState === 'off') { container.hidden = true; return; }
    container.hidden = false;
    container.innerHTML = '<h3>评分与评论</h3><p class="cm-note">正在加载…</p>';

    let data;
    try {
      data = await api(`/api/recipe/${encodeURIComponent(id)}?voter=${encodeURIComponent(voter)}`);
    } catch (e) {
      container.innerHTML = `<h3>评分与评论</h3><p class="cm-note">评分服务暂时不可用。<button type="button" class="cm-retry">重试</button></p>`;
      $('.cm-retry', container).addEventListener('click', () => renderDialog(id, container));
      return;
    }
    if (!container.isConnected) return; // 弹窗已切换配方

    stats[id] = { avg: data.avg, count: data.count, comments: (data.comments || []).length };
    let mine = data.mine || 0;
    let comments = data.comments || [];
    let savedName = '';
    try { savedName = localStorage.getItem('jzs-name') || ''; } catch (e) { /* ignore */ }

    container.innerHTML = `
      <h3>评分与评论</h3>
      <div class="cm-summary" data-cm-summary>${summaryHTML(stats[id])}</div>
      <div class="cm-mine">
        <span class="cm-mine-label">我的评分</span>
        <div class="cm-pick" data-cm-pick role="group" aria-label="为这款配方打分">${pickerHTML(mine)}</div>
        <span class="cm-mine-note" data-cm-mine-note>${mine ? `已评 ${mine} 星，点击星星可修改` : '点击星星即可评分'}</span>
      </div>
      <form class="cm-form" data-cm-form>
        <input type="text" name="name" maxlength="20" placeholder="你的昵称（可选，20 字以内）" value="${esc(savedName)}" autocomplete="nickname">
        <textarea name="text" required maxlength="500" rows="3" placeholder="说说你做的这杯：比例、口感，或你的改进心得…"></textarea>
        <input type="text" name="website" class="cm-hp" tabindex="-1" autocomplete="off" aria-hidden="true">
        <div class="cm-form-foot">
          <span class="cm-form-msg" data-cm-msg role="status"></span>
          <button class="btn" type="submit">发布评论</button>
        </div>
      </form>
      <div class="cm-list">
        <h4 data-cm-list-title>评论（${comments.length}）</h4>
        <div data-cm-list>${comments.length ? comments.map(commentItemHTML).join('') : '<p class="cm-empty">还没有评论，来写第一条吧。</p>'}</div>
      </div>`;

    const summaryEl = $('[data-cm-summary]', container);
    const pickEl = $('[data-cm-pick]', container);
    const mineNote = $('[data-cm-mine-note]', container);
    const form = $('[data-cm-form]', container);
    const msgEl = $('[data-cm-msg]', container);
    const listEl = $('[data-cm-list]', container);
    const listTitle = $('[data-cm-list-title]', container);

    function refreshSummary() {
      summaryEl.innerHTML = summaryHTML(stats[id]);
      listTitle.textContent = `评论（${stats[id].comments}）`;
    }

    function setMsg(text, kind) {
      msgEl.textContent = text;
      msgEl.className = 'cm-form-msg' + (kind ? ' ' + kind : '');
    }

    /* 星级打分 */
    pickEl.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-stars]');
      if (!btn) return;
      const n = Number(btn.getAttribute('data-stars'));
      $$('button', pickEl).forEach((b) => { b.disabled = true; });
      try {
        const res = await api(`/api/recipe/${encodeURIComponent(id)}/rating`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ voter, stars: n }),
        });
        mine = res.mine;
        stats[id] = { avg: res.avg, count: res.count, comments: res.comments != null ? res.comments : stats[id].comments };
        pickEl.innerHTML = pickerHTML(mine);
        mineNote.textContent = `已评 ${mine} 星，点击星星可修改`;
        refreshSummary();
        window.dispatchEvent(new CustomEvent('jzs-stats'));
      } catch (err) {
        mineNote.textContent = err.message || '评分失败，请稍后再试';
        $$('button', pickEl).forEach((b) => { b.disabled = false; });
      }
    });
    /* 悬停预览 */
    pickEl.addEventListener('mouseover', (e) => {
      const btn = e.target.closest('[data-stars]');
      if (!btn) return;
      const n = Number(btn.getAttribute('data-stars'));
      $$('button', pickEl).forEach((b) => b.classList.toggle('on', Number(b.getAttribute('data-stars')) <= n));
    });
    pickEl.addEventListener('mouseleave', () => {
      $$('button', pickEl).forEach((b) => b.classList.toggle('on', Number(b.getAttribute('data-stars')) <= mine));
    });

    /* 发表评论 */
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nameInput = form.elements.name;
      const textInput = form.elements.text;
      const text = textInput.value.trim();
      if (!text) { setMsg('先写点什么再发布吧', 'err'); textInput.focus(); return; }
      const submitBtn = $('button[type="submit"]', form);
      submitBtn.disabled = true;
      setMsg('正在发布…');
      try {
        const res = await api(`/api/recipe/${encodeURIComponent(id)}/comment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: nameInput.value.trim(), text, voter, website: form.elements.website.value }),
        });
        try { localStorage.setItem('jzs-name', nameInput.value.trim()); } catch (err2) { /* ignore */ }
        if (res.comment) {
          comments = [res.comment].concat(comments);
          listEl.innerHTML = comments.map(commentItemHTML).join('');
        }
        stats[id] = { avg: stats[id].avg, count: stats[id].count, comments: res.comments != null ? res.comments : stats[id].comments + 1 };
        textInput.value = '';
        refreshSummary();
        setMsg('评论已发布', 'ok');
        window.dispatchEvent(new CustomEvent('jzs-stats'));
      } catch (err) {
        setMsg(err.message || '发布失败，请稍后再试', 'err');
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  /* ---------------- 启动 ---------------- */
  async function loadStats() {
    if (!configured) return;
    try {
      const data = await api('/api/summary');
      Object.assign(stats, data.stats || {});
      serviceState = 'ready';
    } catch (e) {
      serviceState = 'error';
    }
    window.dispatchEvent(new CustomEvent('jzs-stats'));
  }

  window.JZSCommunity = { getStats, decorateCards, renderDialog };

  document.addEventListener('DOMContentLoaded', () => {
    loadStats().then(() => decorateCards(document));
  });
})();