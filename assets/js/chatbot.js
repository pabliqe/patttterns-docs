(function(){var s=document.createElement('style');s.textContent=":root {\n  --chatbot-primary:        #0267FF;\n  --chatbot-secondary:      #FF2299;\n  --chatbot-bg:             #ffffff;\n  --chatbot-surface:        #f9fafb;\n  --chatbot-border:         #e5e7eb;\n  --chatbot-text:           #111827;\n  --chatbot-text-secondary: #6b7280;\n  --chatbot-text-muted:     #9ca3af;\n  --chatbot-primary-dark:   #0057d9; /* darken(#0267FF, 8%) */\n}\n\n/* ── Trigger button ─────────────────────────────────────────────────────────── */\n.chatbot-trigger {\n  position: fixed;\n  bottom: 24px;\n  right: 24px;\n  z-index: 1000;\n  width: 48px;\n  height: 48px;\n  border: none;\n  border-radius: 50%;\n  background: var(--chatbot-primary);\n  color: var(--chatbot-bg);\n  font-size: 1.25rem;\n  font-weight: 700;\n  cursor: pointer;\n  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);\n  transition: transform 0.15s ease, box-shadow 0.15s ease;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n}\n.chatbot-trigger:hover {\n  transform: scale(1.08);\n  box-shadow: 0 6px 20px rgba(2, 103, 255, 0.35);\n}\n.chatbot-trigger:focus-visible {\n  outline: 2px solid var(--chatbot-primary);\n  outline-offset: 2px;\n  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);\n}\n.chatbot-trigger[aria-expanded=\"true\"] {\n  background: var(--chatbot-text-secondary);\n}\n\n/* ── Panel ──────────────────────────────────────────────────────────────────── */\n.chatbot-panel {\n  position: fixed;\n  bottom: 84px;\n  right: 24px;\n  z-index: 999;\n  width: 360px;\n  max-height: 480px;\n  background: var(--chatbot-bg);\n  border: 1px solid var(--chatbot-border);\n  border-radius: 8px;\n  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);\n  display: flex;\n  flex-direction: column;\n  overflow: hidden;\n  opacity: 0;\n  transform: translateY(12px);\n  pointer-events: none;\n  transition: opacity 0.2s ease, transform 0.2s ease;\n}\n.chatbot-panel.chatbot-panel--open {\n  opacity: 1;\n  transform: translateY(0);\n  pointer-events: auto;\n}\n\n/* ── Header ─────────────────────────────────────────────────────────────────── */\n.chatbot-header {\n  padding: 16px;\n  border-bottom: 1px solid var(--chatbot-border);\n  flex-shrink: 0;\n}\n\n.chatbot-input-wrap {\n  display: flex;\n  gap: 8px;\n  align-items: center;\n}\n\n.chatbot-input {\n  flex: 1;\n  width: 100%;\n  padding: 10px 12px;\n  border: 1px solid var(--chatbot-border);\n  border-radius: 8px;\n  font-family: \"Inter\", system-ui, sans-serif;\n  font-size: 0.875rem;\n  color: var(--chatbot-text);\n  background: var(--chatbot-bg);\n  box-sizing: border-box;\n}\n.chatbot-input::placeholder {\n  color: var(--chatbot-text-muted);\n}\n.chatbot-input:focus {\n  outline: 2px solid var(--chatbot-primary);\n  outline-offset: -2px;\n  border-color: var(--chatbot-primary);\n  box-shadow: none;\n}\n\n.chatbot-submit {\n  flex-shrink: 0;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  width: 36px;\n  height: 36px;\n  border: none;\n  border-radius: 8px;\n  background: var(--chatbot-primary);\n  color: #fff;\n  cursor: pointer;\n  transition: background 0.15s ease, transform 0.1s ease;\n}\n.chatbot-submit:hover {\n  background: var(--chatbot-primary-dark);\n  transform: scale(1.05);\n}\n.chatbot-submit:focus-visible {\n  outline: 2px solid var(--chatbot-primary);\n  outline-offset: 2px;\n}\n\n/* ── Results container ──────────────────────────────────────────────────────── */\n.chatbot-results {\n  flex: 1;\n  overflow-y: auto;\n  padding: 8px;\n}\n\n/* ── AI answer section ──────────────────────────────────────────────────────── */\n.chatbot-answer {\n  padding: 12px 14px 4px;\n  border-bottom: 1px solid var(--chatbot-border);\n}\n.chatbot-answer__text {\n  font-family: \"Inter\", system-ui, sans-serif;\n  font-size: 0.85rem;\n  color: var(--chatbot-text);\n  line-height: 1.6;\n  white-space: pre-wrap;\n  min-height: 20px;\n}\n.chatbot-answer__link {\n  color: var(--chatbot-primary);\n  text-decoration: underline;\n  text-decoration-thickness: 1px;\n  text-underline-offset: 2px;\n  font-weight: 600;\n}\n.chatbot-answer__link:hover {\n  color: var(--chatbot-primary-dark);\n}\n.chatbot-answer__text--streaming::after {\n  content: '▋';\n  display: inline-block;\n  color: var(--chatbot-primary);\n  animation: chatbot-blink 0.7s step-start infinite;\n  margin-left: 2px;\n  font-size: 0.8em;\n  vertical-align: middle;\n}\n@keyframes chatbot-blink {\n  50% { opacity: 0; }\n}\n\n/* ── Cards section label ────────────────────────────────────────────────────── */\n.chatbot-cards-label {\n  padding: 10px 14px 4px;\n  font-family: \"Inter\", system-ui, sans-serif;\n  font-size: 0.7rem;\n  font-weight: 600;\n  letter-spacing: 0.06em;\n  text-transform: uppercase;\n  color: var(--chatbot-text-muted);\n}\n\n/* ── Rich card grid ─────────────────────────────────────────────────────────── */\n.chatbot-cards-grid {\n  padding: 4px 8px 8px;\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n}\n\n.chatbot-card--rich {\n  display: flex;\n  flex-direction: row;\n  align-items: stretch;\n  padding: 0;\n  overflow: hidden;\n  border: 1px solid var(--chatbot-border);\n  border-radius: 8px;\n  transition: border-color 0.15s ease, box-shadow 0.15s ease;\n}\n.chatbot-card--rich:hover,\n.chatbot-card--rich.chatbot-card--active {\n  background: transparent;\n  border-color: rgba(2, 103, 255, 0.4);\n  box-shadow: 0 2px 8px rgba(2, 103, 255, 0.1);\n}\n\n.chatbot-card__cover {\n  flex-shrink: 0;\n  width: 72px;\n  background: var(--chatbot-surface);\n  overflow: hidden;\n  border-right: 1px solid var(--chatbot-border);\n}\n.chatbot-card__cover img {\n  width: 100%;\n  height: 100%;\n  object-fit: cover;\n  display: block;\n}\n\n.chatbot-card__body {\n  flex: 1;\n  padding: 10px 12px;\n  min-width: 0;\n}\n\n/* ── Result card (plain, Phase 1 mode) ──────────────────────────────────────── */\n.chatbot-card {\n  display: block;\n  padding: 12px;\n  border-radius: 8px;\n  text-decoration: none !important;\n  color: var(--chatbot-text) !important;\n  transition: background 0.1s ease;\n}\n.chatbot-card:hover,\n.chatbot-card.chatbot-card--active {\n  background: rgba(2, 103, 255, 0.06);\n}\n.chatbot-card:focus-visible {\n  outline: 2px solid var(--chatbot-primary);\n  outline-offset: -2px;\n}\n.chatbot-card + .chatbot-card {\n  margin-top: 2px;\n}\n\n.chatbot-card__title {\n  font-family: \"Inter\", system-ui, sans-serif;\n  font-size: 0.875rem;\n  font-weight: 600;\n  color: var(--chatbot-text);\n  margin: 0 0 4px;\n  line-height: 1.3;\n}\n.chatbot-card__desc {\n  font-family: \"Inter\", system-ui, sans-serif;\n  font-size: 0.8rem;\n  color: var(--chatbot-text-secondary);\n  margin: 0 0 4px;\n  line-height: 1.4;\n  display: -webkit-box;\n  -webkit-line-clamp: 2;\n  -webkit-box-orient: vertical;\n  overflow: hidden;\n}\n.chatbot-card__url {\n  font-family: \"Geist Mono\", monospace;\n  font-size: 0.7rem;\n  color: var(--chatbot-text-muted);\n}\n\n/* ── Empty / loading / error states ────────────────────────────────────────── */\n.chatbot-empty,\n.chatbot-error {\n  padding: 24px 16px;\n  text-align: center;\n  font-family: \"Inter\", system-ui, sans-serif;\n  font-size: 0.85rem;\n  color: var(--chatbot-text-muted);\n  line-height: 1.5;\n}\n.chatbot-error {\n  color: var(--chatbot-secondary);\n}\n.chatbot-retry {\n  display: inline-block;\n  margin-top: 8px;\n  padding: 6px 14px;\n  border: 1px solid var(--chatbot-border);\n  border-radius: 6px;\n  background: var(--chatbot-bg);\n  color: var(--chatbot-text);\n  font-family: \"Inter\", system-ui, sans-serif;\n  font-size: 0.8rem;\n  cursor: pointer;\n  transition: background 0.1s ease;\n}\n.chatbot-retry:hover {\n  background: var(--chatbot-surface);\n}\n\n.chatbot-loading {\n  padding: 24px 16px;\n  text-align: center;\n}\n.chatbot-spinner {\n  display: inline-block;\n  width: 20px;\n  height: 20px;\n  border: 2px solid var(--chatbot-border);\n  border-top-color: var(--chatbot-primary);\n  border-radius: 50%;\n  animation: chatbot-spin 0.6s linear infinite;\n}\n@keyframes chatbot-spin {\n  to { transform: rotate(360deg); }\n}\n\n/* ── Suggested searches ─────────────────────────────────────────────────────── */\n.chatbot-suggestion {\n  display: inline-block;\n  margin: 4px 2px;\n  padding: 4px 10px;\n  border: 1px solid var(--chatbot-border);\n  border-radius: 12px;\n  font-size: 0.75rem;\n  color: var(--chatbot-text-secondary);\n  cursor: pointer;\n  transition: background 0.1s ease, color 0.1s ease;\n}\n.chatbot-suggestion:hover {\n  background: rgba(2, 103, 255, 0.06);\n  color: var(--chatbot-primary);\n  border-color: rgba(2, 103, 255, 0.3);\n}\n\n/* ── Responsive ─────────────────────────────────────────────────────────────── */\n@media (max-width: 420px) {\n  .chatbot-panel {\n    right: 8px;\n    left: 8px;\n    width: auto;\n    bottom: 76px;\n  }\n  .chatbot-trigger {\n    bottom: 16px;\n    right: 16px;\n  }\n}\n";document.head.appendChild(s);})();
(function () {
  'use strict';

  // Clean up any previous instance's document listeners before re-initialising
  if (typeof window.__chatbotCleanup === 'function') {
    window.__chatbotCleanup();
  }

  var MCP_URL = 'https://patttterns.com/mcp';
  var PROXY_URL = 'https://patttterns.com/.netlify/functions/chatbot-proxy';
  var SUGGESTIONS = ['login patterns', 'onboarding', 'checkout', 'navigation'];

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
    input.placeholder = 'Ask about design patterns\u2026';
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
    console.log('[chatbot] MCP search →', { query: query, limit: 8, url: MCP_URL });
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
          arguments: { query: query, limit: 8 }
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
    console.log('[chatbot] doSearch', { query: query, proxyUrl: PROXY_URL });
    activeIndex = -1;
    renderLoading(container);

    // Always use AI proxy — proxy falls back to MCP-only if Gemini is not configured
    doAiSearch(query, container);
  }

  // ── AI mode: single proxy call ─────────────────────────────────────────────
  // Proxy fetches MCP internally, emits { type:"patterns" } first, then streams
  // Gemini deltas. Widget renders cards as soon as patterns arrive.

  function doAiSearch(query, container) {
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

    fetch(PROXY_URL, {
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
