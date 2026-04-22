(function () {
  'use strict';

  var MCP_URL = 'https://patttterns.com/mcp';
  var SUGGESTIONS = ['onboarding', 'checkout', 'navigation'];
  var activeIndex = -1;
  var abortController = null;
  var isOpen = false;
  var lastQuery = '';

  // ── DOM creation ───────────────────────────────────────────────────────────

  function createWidget() {
    if (document.querySelector('.chatbot-trigger')) return;

    var trigger = document.createElement('button');
    trigger.className = 'chatbot-trigger';
    trigger.setAttribute('aria-label', 'Search design patterns');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.textContent = '?';

    var panel = document.createElement('div');
    panel.className = 'chatbot-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'Pattern search');

    var header = document.createElement('div');
    header.className = 'chatbot-header';

    var input = document.createElement('input');
    input.className = 'chatbot-input';
    input.type = 'text';
    input.placeholder = 'Ask about design patterns…';
    input.setAttribute('aria-label', 'Search patterns');

    var results = document.createElement('div');
    results.className = 'chatbot-results';
    results.setAttribute('role', 'list');

    header.appendChild(input);
    panel.appendChild(header);
    panel.appendChild(results);
    document.body.appendChild(panel);
    document.body.appendChild(trigger);

    renderEmpty(results, input);

    trigger.addEventListener('click', function () {
      if (isOpen) {
        closePanel(trigger, panel);
      } else {
        openPanel(trigger, panel, input);
      }
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        var q = input.value.trim();
        if (q) {
          lastQuery = q;
          doSearch(q, results);
        }
      }
    });

    document.addEventListener('keydown', function (e) {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        closePanel(trigger, panel);
        trigger.focus();
        return;
      }
      handleArrowNav(e, results);
    });

    document.addEventListener('click', function (e) {
      if (!isOpen) return;
      if (!panel.contains(e.target) && e.target !== trigger) {
        closePanel(trigger, panel);
      }
    });

    return { trigger: trigger, panel: panel, input: input, results: results };
  }

  // ── Panel open / close ─────────────────────────────────────────────────────

  function openPanel(trigger, panel, input) {
    isOpen = true;
    panel.classList.add('chatbot-panel--open');
    trigger.setAttribute('aria-expanded', 'true');
    input.focus();
  }

  function closePanel(trigger, panel) {
    isOpen = false;
    panel.classList.remove('chatbot-panel--open');
    trigger.setAttribute('aria-expanded', 'false');
    activeIndex = -1;
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
  }

  // ── MCP search ─────────────────────────────────────────────────────────────

  function searchPatterns(query) {
    if (abortController) abortController.abort();
    abortController = new AbortController();
    var ctrl = abortController;
    var signal = ctrl.signal;

    var timeout = setTimeout(function () { ctrl.abort(); }, 5000);

    return fetch(MCP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: signal,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'search_patterns',
          arguments: { query: query, limit: 5 }
        }
      })
    })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (envelope) {
        var text = envelope.result && envelope.result.content &&
          envelope.result.content[0] && envelope.result.content[0].text;
        if (!text) throw new Error('Unexpected response format');
        var data = JSON.parse(text);
        return data.results || [];
      })
      .finally(function () {
        clearTimeout(timeout);
      });
  }

  function doSearch(query, container) {
    activeIndex = -1;
    renderLoading(container);

    searchPatterns(query)
      .then(function (results) {
        if (results.length === 0) {
          renderEmpty(container);
        } else {
          renderResults(results, container);
        }
      })
      .catch(function (err) {
        if (err.name === 'AbortError') {
          renderEmpty(container);
          return;
        }
        renderError(container);
      });
  }

  // ── Rendering ──────────────────────────────────────────────────────────────

  function renderResults(results, container) {
    container.innerHTML = '';
    results.forEach(function (p, i) {
      var safeUrl = (p.url && /^https?:\/\//i.test(p.url)) ? p.url : '';
      var card = document.createElement('a');
      card.className = 'chatbot-card';
      if (safeUrl) card.href = safeUrl;
      card.target = '_blank';
      card.rel = 'noopener noreferrer';
      card.setAttribute('role', 'listitem');
      card.setAttribute('data-index', i);

      var title = document.createElement('div');
      title.className = 'chatbot-card__title';
      title.textContent = p.title || '';

      var desc = document.createElement('div');
      desc.className = 'chatbot-card__desc';
      desc.textContent = p.description || '';

      var url = document.createElement('div');
      url.className = 'chatbot-card__url';
      url.textContent = safeUrl.replace('https://', '');

      card.appendChild(title);
      card.appendChild(desc);
      card.appendChild(url);
      container.appendChild(card);
    });
  }

  function renderEmpty(container, inputEl) {
    container.innerHTML = '';
    var wrap = document.createElement('div');
    wrap.className = 'chatbot-empty';

    var text = document.createElement('div');
    text.textContent = 'Try searching for';
    wrap.appendChild(text);

    var pills = document.createElement('div');
    pills.style.marginTop = '8px';
    SUGGESTIONS.forEach(function (s) {
      var pill = document.createElement('span');
      pill.className = 'chatbot-suggestion';
      pill.textContent = s;
      pill.setAttribute('role', 'button');
      pill.setAttribute('tabindex', '0');
      var triggerSearch = function () {
        var target = inputEl || document.querySelector('.chatbot-input');
        if (target) {
          target.value = s;
          lastQuery = s;
          doSearch(s, container);
        }
      };
      pill.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        triggerSearch();
      });
      pill.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          triggerSearch();
        }
      });
      pills.appendChild(pill);
    });
    wrap.appendChild(pills);
    container.appendChild(wrap);
  }

  function renderLoading(container) {
    container.innerHTML = '';
    var wrap = document.createElement('div');
    wrap.className = 'chatbot-loading';
    var spinner = document.createElement('div');
    spinner.className = 'chatbot-spinner';
    wrap.appendChild(spinner);
    container.appendChild(wrap);
  }

  function renderError(container) {
    container.innerHTML = '';
    var wrap = document.createElement('div');
    wrap.className = 'chatbot-error';

    var msg = document.createElement('div');
    msg.textContent = 'Something went wrong. Try again.';
    wrap.appendChild(msg);

    var btn = document.createElement('button');
    btn.className = 'chatbot-retry';
    btn.textContent = 'Retry';
    btn.addEventListener('click', function () {
      if (lastQuery) doSearch(lastQuery, container);
    });
    wrap.appendChild(btn);
    container.appendChild(wrap);
  }

  // ── Keyboard navigation ────────────────────────────────────────────────────

  function handleArrowNav(e, container) {
    var cards = container.querySelectorAll('.chatbot-card');
    if (!cards.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndex = Math.min(activeIndex + 1, cards.length - 1);
      updateActiveCard(cards);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
      updateActiveCard(cards);
    } else if (e.key === 'Enter' && activeIndex >= 0 && cards[activeIndex]) {
      e.preventDefault();
      cards[activeIndex].click();
    }
  }

  function updateActiveCard(cards) {
    cards.forEach(function (c, i) {
      if (i === activeIndex) {
        c.classList.add('chatbot-card--active');
        c.scrollIntoView({ block: 'nearest' });
      } else {
        c.classList.remove('chatbot-card--active');
      }
    });
  }

  // ── Init ───────────────────────────────────────────────────────────────────

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createWidget);
  } else {
    createWidget();
  }
})();
