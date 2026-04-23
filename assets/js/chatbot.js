(function () {
  'use strict';

  // Clean up any previous instance's document listeners before re-initialising
  if (typeof window.__chatbotCleanup === 'function') {
    window.__chatbotCleanup();
  }

  var MCP_URL = 'https://patttterns.com/mcp';
  var SUGGESTIONS = ['login patterns', 'onboarding', 'checkout', 'navigation'];

  // ── Config — read lazily at call time so window.CHATBOT_CONFIG can change ──
  // In Jekyll/static HTML set window.CHATBOT_CONFIG before this script loads.
  // In a React harness just update window.CHATBOT_CONFIG and the next search
  // will pick it up automatically — no page reload needed.
  function getConfig() {
    var c = (typeof window !== 'undefined' && window.CHATBOT_CONFIG) || {};
    return {
      aiEnabled: c.aiEnabled === true,
      proxyUrl: c.proxyUrl || '/.netlify/functions/chatbot-proxy'
    };
  }

  var activeIndex = -1;
  var abortController = null;
  var aiAbortController = null;
  var isOpen = false;
  var lastQuery = '';

  // ── DOM creation ───────────────────────────────────────────────────────────

  function createWidget() {
    if (document.querySelector('.chatbot-trigger')) return;

    var trigger = document.createElement('button');
    trigger.className = 'chatbot-trigger';
    trigger.setAttribute('aria-label', 'Ask about design patterns');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';

    var panel = document.createElement('div');
    panel.className = 'chatbot-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'Pattern assistant');

    var header = document.createElement('div');
    header.className = 'chatbot-header';

    var inputWrap = document.createElement('div');
    inputWrap.className = 'chatbot-input-wrap';

    var input = document.createElement('input');
    input.className = 'chatbot-input';
    input.type = 'text';
    input.placeholder = getConfig().aiEnabled
      ? 'Ask about design patterns\u2026'
      : 'Search design patterns\u2026';
    input.setAttribute('aria-label', 'Search patterns');

    var submitBtn = document.createElement('button');
    submitBtn.className = 'chatbot-submit';
    submitBtn.setAttribute('aria-label', 'Submit');
    submitBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>';

    inputWrap.appendChild(input);
    inputWrap.appendChild(submitBtn);
    header.appendChild(inputWrap);

    var results = document.createElement('div');
    results.className = 'chatbot-results';
    results.setAttribute('role', 'list');

    panel.appendChild(header);
    panel.appendChild(results);
    document.body.appendChild(panel);
    document.body.appendChild(trigger);

    renderEmpty(results, input);

    var handleSubmit = function () {
      var q = input.value.trim();
      if (q) {
        lastQuery = q;
        doSearch(q, results);
      }
    };

    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      if (isOpen) {
        closePanel(trigger, panel);
      } else {
        openPanel(trigger, panel, input);
      }
    });

    submitBtn.addEventListener('click', function (e) {
      e.preventDefault();
      handleSubmit();
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
    });

    var _keydownHandler = function (e) {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        closePanel(trigger, panel);
        trigger.focus();
        return;
      }
      handleArrowNav(e, results);
    };

    var _clickHandler = function (e) {
      if (!isOpen) return;
      if (!panel.contains(e.target) && e.target !== trigger) {
        closePanel(trigger, panel);
      }
    };

    document.addEventListener('keydown', _keydownHandler);
    document.addEventListener('click', _clickHandler);

    // Expose cleanup so the next inject can remove these listeners
    window.__chatbotCleanup = function () {
      document.removeEventListener('keydown', _keydownHandler);
      document.removeEventListener('click', _clickHandler);
      window.__chatbotCleanup = null;
    };

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
    if (abortController) { abortController.abort(); abortController = null; }
    if (aiAbortController) { aiAbortController.abort(); aiAbortController = null; }
  }

  // ── MCP search ─────────────────────────────────────────────────────────────

  function searchPatterns(query) {
    var cfg = getConfig();
    console.log('[chatbot] MCP search →', { query: query, limit: cfg.aiEnabled ? 8 : 5, url: MCP_URL });
    if (abortController) abortController.abort();
    abortController = new AbortController();
    var ctrl = abortController;
    var signal = ctrl.signal;
    var timeout = setTimeout(function () { ctrl.abort(); }, 8000);

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
          arguments: { query: query, limit: cfg.aiEnabled ? 8 : 5 }
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
        var results = data.results || [];
        console.log('[chatbot] MCP results ←', results.length, 'patterns', results.map(function(r){ return r.title; }));
        return results;
      })
      .finally(function () { clearTimeout(timeout); });
  }

  function doSearch(query, container) {
    var cfg = getConfig();
    console.log('[chatbot] doSearch', { query: query, aiEnabled: cfg.aiEnabled, proxyUrl: cfg.proxyUrl });
    activeIndex = -1;
    renderLoading(container);

    if (cfg.aiEnabled) {
      // AI mode: single proxy call — proxy handles MCP + Gemini server-side
      doAiSearch(query, cfg.proxyUrl, container);
    } else {
      // Search-only mode: call MCP directly
      searchPatterns(query)
        .then(function (patterns) {
          if (patterns.length === 0) {
            console.log('[chatbot] no results for query:', query);
            renderEmpty(container);
            return;
          }
          console.log('[chatbot] search-only mode → rendering', patterns.length, 'cards');
          renderResults(patterns, container);
        })
        .catch(function (err) {
          console.error('[chatbot] search error:', err.name, err.message);
          if (err.name === 'AbortError') { renderEmpty(container); return; }
          renderError(container);
        });
    }
  }

  // ── AI mode: single proxy call ─────────────────────────────────────────────
  // Proxy fetches MCP internally, emits { type:"patterns" } first, then streams
  // Gemini deltas. Widget renders cards as soon as patterns arrive.

  function doAiSearch(query, proxyUrl, container) {
    container.innerHTML = '';

    var answerWrap = document.createElement('div');
    answerWrap.className = 'chatbot-answer';
    var answerText = document.createElement('div');
    answerText.className = 'chatbot-answer__text chatbot-answer__text--streaming';
    answerText.setAttribute('aria-live', 'polite');
    answerWrap.appendChild(answerText);
    container.appendChild(answerWrap);

    var cardsLabel = document.createElement('div');
    cardsLabel.className = 'chatbot-cards-label';
    cardsLabel.textContent = 'Related patterns';
    container.appendChild(cardsLabel);

    // Placeholder spinner in cards area while proxy fetches
    var cardsSpinner = document.createElement('div');
    cardsSpinner.className = 'chatbot-loading';
    cardsSpinner.innerHTML = '<div class="chatbot-spinner"></div>';
    container.appendChild(cardsSpinner);

    if (aiAbortController) aiAbortController.abort();
    aiAbortController = new AbortController();
    var signal = aiAbortController.signal;

    fetch(proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: signal,
      body: JSON.stringify({ query: query })
    })
      .then(function (res) {
        console.log('[chatbot] proxy response ←', res.status, res.headers.get('content-type'));
        if (!res.ok) {
          return res.text().catch(function () {
            return '';
          }).then(function (bodyText) {
            var body = bodyText;
            try {
              body = bodyText ? JSON.parse(bodyText) : null;
            } catch (e) { /* keep raw body text */ }
            console.error('[chatbot] proxy error', res.status, body, '— falling back to MCP-only');
            answerWrap.remove();
            cardsLabel.remove();
            cardsSpinner.remove();
            // Fallback: show plain search results
            return searchPatterns(query).then(function (patterns) {
              if (patterns.length === 0) { renderEmpty(container); return; }
              renderResults(patterns, container);
            }).catch(function () { renderError(container); });
          });
        }
        return readAiStream(res.body, answerText, cardsLabel, cardsSpinner, container);
      })
      .catch(function (err) {
        if (err.name !== 'AbortError') {
          console.error('[chatbot] proxy fetch failed:', err.message);
          answerWrap.remove();
          cardsLabel.remove();
          cardsSpinner.remove();
          renderError(container);
        }
      });
  }

  function readAiStream(body, answerText, cardsLabel, cardsSpinner, container) {
    var reader = body.getReader();
    var decoder = new TextDecoder();
    var buffer = '';
    var accumulated = '';
    var cardsRendered = false;
    var currentPatterns = [];

    function renderAnswerText(answerTextEl, text, patterns) {
      answerTextEl.textContent = '';

      var patternMap = {};
      (patterns || []).forEach(function (pattern) {
        if (!pattern || !pattern.title || !pattern.url) return;
        var title = String(pattern.title);
        patternMap[title.toLowerCase()] = pattern.url;
        // Also index without leading number prefix e.g. "397. Modal w/ Card Options" → "modal w/ card options"
        var bare = title.replace(/^\d+\.\s*/, '');
        if (bare !== title) patternMap[bare.toLowerCase()] = pattern.url;
      });

      var parts = String(text || '').split(/(\*\*[^*]+\*\*|https?:\/\/patttterns\.com[^\s.,;)]*)/g);
      parts.forEach(function (part) {
        if (!part) return;

        // Handle **bold** pattern references
        var boldMatch = part.match(/^\*\*([^*]+)\*\*$/);
        if (boldMatch) {
          var label = boldMatch[1];
          var href = patternMap[label.toLowerCase()];
          if (href) {
            var link = document.createElement('a');
            link.className = 'chatbot-answer__link';
            link.href = href;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.textContent = label;
            answerTextEl.appendChild(link);
          } else {
            var strong = document.createElement('strong');
            strong.textContent = label;
            answerTextEl.appendChild(strong);
          }
          return;
        }

        // Convert raw patttterns.com URLs to clean internal links
        var urlMatch = part.match(/^https?:\/\/patttterns\.com(\/[^\s.,;)]*)?\s*$/);
        if (urlMatch) {
          var path = urlMatch[1] || '/';
          var urlLabel = path.split('/').filter(Boolean).pop() || 'patttterns.com';
          // Humanise slug: "ux-patterns/onboarding" → "Onboarding"
          urlLabel = urlLabel.replace(/-/g, ' ').replace(/\b\w/g, function(c) { return c.toUpperCase(); });
          var urlLink = document.createElement('a');
          urlLink.className = 'chatbot-answer__link';
          urlLink.href = path;
          urlLink.textContent = urlLabel;
          answerTextEl.appendChild(urlLink);
          return;
        }

        answerTextEl.appendChild(document.createTextNode(part));
      });
    }

    function processBuffer(isFinal) {
      var lines = buffer.split('\n');
      buffer = isFinal ? '' : (lines.pop() || '');

      lines.forEach(function (line) {
        if (!line.startsWith('data:')) return;
        var raw = line.slice(5).trim();
        if (!raw) return;
        try {
          var evt = JSON.parse(raw);
          if (evt.type === 'patterns') {
            cardsSpinner.remove();
            currentPatterns = evt.patterns || [];
            if (currentPatterns.length > 0) {
              console.log('[chatbot] patterns received:', currentPatterns.length,
                currentPatterns.map(function(p){ return p.title; }));
              renderRichCards(currentPatterns, container);
            } else {
              console.log('[chatbot] no patterns returned');
              cardsLabel.remove();
            }
            cardsRendered = true;
          } else if (evt.type === 'delta' && evt.text) {
            accumulated += evt.text;
            renderAnswerText(answerText, accumulated, currentPatterns);
          } else if (evt.type === 'done') {
            console.log('[chatbot] stream done. total chars:', accumulated.length);
            answerText.classList.remove('chatbot-answer__text--streaming');
            if (!accumulated) answerText.closest('.chatbot-answer').remove();
          } else if (evt.type === 'error') {
            console.error('[chatbot] stream error event:', evt.message);
            answerText.closest('.chatbot-answer') && answerText.closest('.chatbot-answer').remove();
            if (!cardsRendered) { cardsSpinner.remove(); cardsLabel.remove(); renderError(container); }
          }
        } catch (e) { /* skip malformed */ }
      });
    }

    function pump() {
      return reader.read().then(function (chunk) {
        if (chunk.done) {
          processBuffer(true);
          answerText.classList.remove('chatbot-answer__text--streaming');
          return;
        }
        buffer += decoder.decode(chunk.value, { stream: true });
        processBuffer(false);
        return pump();
      });
    }
    return pump();
  }

  // ── Rendering ──────────────────────────────────────────────────────────────

  function renderRichCards(patterns, container) {
    var grid = document.createElement('div');
    grid.className = 'chatbot-cards-grid';
    grid.setAttribute('role', 'list');

    patterns.forEach(function (p, i) {
      var safeUrl = (p.url && /^https?:\/\//i.test(p.url)) ? p.url : '';
      var card = document.createElement('a');
      card.className = 'chatbot-card chatbot-card--rich';
      if (safeUrl) card.href = safeUrl;
      card.target = '_blank';
      card.rel = 'noopener noreferrer';
      card.setAttribute('role', 'listitem');
      card.setAttribute('data-index', i);

      if (p.coverImage && /^https?:\/\//i.test(p.coverImage)) {
        var imgWrap = document.createElement('div');
        imgWrap.className = 'chatbot-card__cover';
        var img = document.createElement('img');
        img.alt = p.title || '';
        img.loading = 'lazy';
        img.decoding = 'async';
        img.onerror = function () { imgWrap.remove(); };
        img.src = p.coverImage;
        imgWrap.appendChild(img);
        card.appendChild(imgWrap);
      }

      var body = document.createElement('div');
      body.className = 'chatbot-card__body';

      var title = document.createElement('div');
      title.className = 'chatbot-card__title';
      title.textContent = p.title || '';

      var desc = document.createElement('div');
      desc.className = 'chatbot-card__desc';
      desc.textContent = p.description || '';

      body.appendChild(title);
      body.appendChild(desc);
      card.appendChild(body);
      grid.appendChild(card);
    });

    container.appendChild(grid);
  }

  function renderResults(patterns, container) {
    container.innerHTML = '';
    patterns.forEach(function (p, i) {
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
    text.textContent = 'Try asking about';
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
        e.preventDefault(); e.stopPropagation(); triggerSearch();
      });
      pill.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault(); e.stopPropagation(); triggerSearch();
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
