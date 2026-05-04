/**
 * jn-activiteiten.js  –  Jong Nederland Activiteiten kalender
 * v2.0.0  |  Vanilla JS, geen jQuery vereist
 *
 * ================================================================
 * WORDPRESS INTEGRATIE
 * ================================================================
 * In WordPress levert wp_localize_script() het jnConfig object:
 *
 *   wp_localize_script('jn-activiteiten', 'jnConfig', [
 *     'ajaxUrl'        => admin_url('admin-ajax.php'),
 *     'nonce'          => wp_create_nonce('jn_rsvp_nonce'),
 *     'popularAt'      => 25,
 *     'aantallMin'     => 1,
 *     'aantallMax'     => 100,
 *   ]);
 *
 * Lokaal/Netlify: het config-object hieronder wordt gebruikt als fallback.
 * ================================================================
 */

(function () {
  'use strict';

  /* ── Config (fallback voor lokale demo) ──────────────────────── */
  var cfg = (typeof jnConfig !== 'undefined') ? jnConfig : {
    ajaxUrl:    null,   /* null = geen AJAX, alleen localStorage */
    nonce:      null,
    popularAt:  25,     /* drempel voor "Populair" badge          */
    aantallMin: 1,
    aantallMax: 100,
  };

  var STORAGE_KEY = 'jn-activiteiten-v2';

  /* ── localStorage helpers ────────────────────────────────────── */
  function getState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }

  function saveState(state) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
  }

  function getEventState(id, state) {
    if (!state[id]) state[id] = {};
    return state[id];
  }

  /* ── DOM helpers ─────────────────────────────────────────────── */
  function qs(sel, ctx)  { return (ctx || document).querySelector(sel); }
  function qsa(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  /* ── Kaart data lezen ────────────────────────────────────────── */
  function cards() { return qsa('.jn-card-col[data-event-id]'); }

  function attr(card, name, fallback) {
    var v = card.getAttribute('data-' + name);
    return (v !== null && v !== '') ? v : (fallback !== undefined ? fallback : null);
  }

  function numAttr(card, name, fallback) {
    return parseInt(attr(card, name, fallback), 10) || 0;
  }

  /* ── RSVP tellers ────────────────────────────────────────────── */
  /**
   * Haal het totale aanmeldingsgetal op voor een kaart.
   * Basis = data-rsvp-count op de HTML (= initieel / uit WordPress meta).
   * Eigen aanmelding (opgeslagen in localStorage) wordt opgeteld.
   *
   * In WordPress: data-rsvp-count bevat de échte meta-waarde.
   * Na AJAX-save geeft de server de nieuwe totale waarde terug en
   * werken we data-rsvp-count bij — localStorage dient dan alleen
   * om de knopstatus te onthouden (selected: true/false + count).
   */
  function getRsvpTotal(card, state) {
    var id      = attr(card, 'event-id');
    var mode    = attr(card, 'rsvp-mode');
    var base    = numAttr(card, 'rsvp-count');
    var evtSt   = state[id] || {};

    if (mode === 'individueel' && evtSt.selected) {
      return base + 1;
    }
    if (mode === 'aantal' && evtSt.selected && evtSt.confirmed) {
      return base + (evtSt.count || cfg.aantallMin);
    }
    return base;
  }

  function getGroupsTotal(card, state) {
    var id    = attr(card, 'event-id');
    var base  = numAttr(card, 'groups-count');
    var evtSt = state[id] || {};
    if (attr(card, 'rsvp-mode') === 'aantal' && evtSt.selected && evtSt.confirmed) {
      return base + 1;
    }
    return base;
  }

  function isPopular(card, state) {
    return getRsvpTotal(card, state) >= cfg.popularAt;
  }

  function isFull(card, state) {
    var max = numAttr(card, 'rsvp-max', 1000);
    return max > 0 && getRsvpTotal(card, state) >= max;
  }

  /* ── Response panel HTML bouwen ──────────────────────────────── */
  function buildResponseHTML(card, state) {
    var id    = attr(card, 'event-id');
    var mode  = attr(card, 'rsvp-mode');
    var evtSt = state[id] || {};
    var full  = isFull(card, state);

    if (mode === 'individueel') {
      var sel = evtSt.selected;
      if (full && !sel) {
        return '<p class="jn-full-msg"><i class="fas fa-lock" aria-hidden="true"></i> Activiteit is vol</p>';
      }
      return (
        '<div class="jn-action-row">' +
          '<button class="jn-action-btn' + (sel ? ' active' : '') + '"' +
          ' type="button" data-role="individueel-btn" data-event-id="' + id + '"' +
          ' aria-pressed="' + (sel ? 'true' : 'false') + '">' +
            '<i class="fas ' + (sel ? 'fa-check-circle' : 'fa-heart') + '" aria-hidden="true"></i> ' +
            (sel ? 'Je wilt erbij zijn' : 'Ik wil erbij zijn') +
          '</button>' +
        '</div>'
      );
    }

    if (mode === 'aantal') {
      var selG      = evtSt.selected;
      var confirmed = evtSt.confirmed === true;
      var count     = evtSt.count || cfg.aantallMin;

      if (full && !confirmed) {
        return '<p class="jn-full-msg"><i class="fas fa-lock" aria-hidden="true"></i> Activiteit is vol</p>';
      }

      if (!selG) {
        return (
          '<div class="jn-action-row">' +
            '<button class="jn-action-btn"' +
            ' type="button" data-role="aantal-btn" data-event-id="' + id + '"' +
            ' aria-pressed="false">' +
              '<i class="fas fa-users" aria-hidden="true"></i> ' +
              'Wij willen komen' +
            '</button>' +
          '</div>'
        );
      }

      if (!confirmed) {
        return (
          '<div class="jn-aantal-wrap visible" data-role="aantal-wrap">' +
            '<span class="jn-aantal-label">Aantal deelnemers:</span>' +
            '<input class="jn-aantal-input"' +
            ' type="number" inputmode="numeric"' +
            ' min="' + cfg.aantallMin + '" max="' + cfg.aantallMax + '"' +
            ' value="' + count + '"' +
            ' data-role="aantal-input" data-event-id="' + id + '"' +
            ' aria-label="Aantal deelnemers"' +
            ' />' +
            '<button class="jn-confirm-btn" type="button" data-role="confirm-aantal" data-event-id="' + id + '">' +
              '<i class="fas fa-check" aria-hidden="true"></i> Bevestig' +
            '</button>' +
            '<span class="jn-input-error" data-role="input-error">Voer een getal in tussen ' + cfg.aantallMin + ' en ' + cfg.aantallMax + '</span>' +
          '</div>'
        );
      }

      return (
        '<div class="jn-action-row">' +
          '<button class="jn-action-btn active" type="button" aria-pressed="true">' +
            '<i class="fas fa-check-circle" aria-hidden="true"></i> ' +
            'Wij willen komen (' + count + ')' +
          '</button>' +
          '<button class="jn-edit-btn" type="button" data-role="edit-aantal" data-event-id="' + id + '">Aanpassen</button>' +
        '</div>'
      );
    }

    return ''; /* info only — geen RSVP */
  }

  /* ── Kaart bijwerken ─────────────────────────────────────────── */
  function updateCard(card, state) {
    var mode = attr(card, 'rsvp-mode');

    /* Populair badge */
    var badge = qs('[data-role="popular-badge"]', card);
    if (badge) {
      badge.classList.toggle('d-none', !isPopular(card, state));
    }

    /* RSVP teller */
    var rsvpEl = qs('[data-role="rsvp-count"]', card);
    if (rsvpEl) {
      var total   = getRsvpTotal(card, state);
      var maxVal  = numAttr(card, 'rsvp-max', 1000);
      var maxEl   = qs('[data-role="rsvp-max"]', rsvpEl);
      /* Schrijf alleen het getal, bewaar het <span data-role="rsvp-max"> */
      rsvpEl.firstChild.nodeValue = total;
      if (maxEl) maxEl.textContent = '/' + maxVal;
      rsvpEl.classList.toggle('is-full', total >= maxVal && maxVal > 0);
    }

    /* Afdelingenteller (alleen aantal-modus) */
    if (mode === 'aantal') {
      var grpEl = qs('[data-role="groups"]', card);
      if (grpEl) grpEl.textContent = getGroupsTotal(card, state);
    }

    /* Response panel */
    var responseEl = qs('[data-role="response"]', card);
    if (responseEl) {
      responseEl.innerHTML = buildResponseHTML(card, state);
      attachCardListeners(card);
    }
  }

  /* ── State acties ─────────────────────────────────────────── */
  function refreshEvent(eventId, state) {
    cards().forEach(function (card) {
      if (attr(card, 'event-id') === eventId) updateCard(card, state);
    });
    if (activeView === 'month') renderMonthView();
  }

  function toggleIndividueel(eventId) {
    var state = getState();
    var evtSt = getEventState(eventId, state);
    evtSt.selected = !evtSt.selected;
    saveState(state);
    sendRsvp('individueel', eventId, evtSt.selected, null);
    refreshEvent(eventId, state);
  }

  function toggleAantal(eventId) {
    var state = getState();
    var evtSt = getEventState(eventId, state);
    if (!evtSt.count) evtSt.count = cfg.aantallMin;
    evtSt.selected = true;
    evtSt.confirmed = false;
    saveState(state);
    refreshEvent(eventId, state);
  }

  function validateAantalInput(value, sourceInput) {
    var val   = parseInt(value, 10);
    var valid = !isNaN(val) && val >= cfg.aantallMin && val <= cfg.aantallMax;

    if (sourceInput) {
      var wrap = sourceInput.closest('[data-role="aantal-wrap"]') || sourceInput.parentNode;
      var errEl = wrap ? qs('[data-role="input-error"]', wrap) : null;
      sourceInput.classList.toggle('is-invalid', !valid);
      if (errEl) errEl.classList.toggle('visible', !valid);
    }

    return valid ? val : null;
  }

  function setAantal(eventId, value, sourceInput) {
    var val = validateAantalInput(value, sourceInput);
    if (val === null) return;

    var state = getState();
    var evtSt = getEventState(eventId, state);
    evtSt.count = val;
    evtSt.selected = true;
    evtSt.confirmed = false;
    saveState(state);
  }

  function confirmAantal(eventId, value, sourceInput) {
    var val = validateAantalInput(value, sourceInput);
    if (val === null) return;

    var state = getState();
    var evtSt = getEventState(eventId, state);
    evtSt.count = val;
    evtSt.selected = true;
    evtSt.confirmed = true;
    saveState(state);
    sendRsvp('aantal', eventId, true, val);
    refreshEvent(eventId, state);
  }

  function editAantal(eventId) {
    var state = getState();
    var evtSt = getEventState(eventId, state);
    evtSt.selected = true;
    evtSt.confirmed = false;
    if (!evtSt.count) evtSt.count = cfg.aantallMin;
    saveState(state);
    refreshEvent(eventId, state);
  }

  /* ── Event listeners per kaart ───────────────────────────────── */
  function attachCardListeners(card) {

    /* Individueel */
    qsa('[data-role="individueel-btn"]', card).forEach(function (btn) {
      btn.addEventListener('click', function () {
        toggleIndividueel(btn.getAttribute('data-event-id'));
      });
    });

    /* Aantal — knop toggle */
    qsa('[data-role="aantal-btn"]', card).forEach(function (btn) {
      btn.addEventListener('click', function () {
        toggleAantal(btn.getAttribute('data-event-id'));
      });
    });

    /* Aantal — invoerveld: alleen conceptwaarde bewaren, nog niet bevestigen */
    qsa('[data-role="aantal-input"]', card).forEach(function (input) {
      function handleInput() {
        setAantal(input.getAttribute('data-event-id'), input.value, input);
      }
      input.addEventListener('change', handleInput);
      input.addEventListener('blur',   handleInput);
    });

    /* Aantal — expliciet bevestigen */
    qsa('[data-role="confirm-aantal"]', card).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var wrap = btn.closest('[data-role="aantal-wrap"]') || btn.parentNode;
        var input = wrap ? qs('[data-role="aantal-input"]', wrap) : null;
        confirmAantal(btn.getAttribute('data-event-id'), input ? input.value : cfg.aantallMin, input);
      });
    });

    /* Aantal — na bevestiging aanpassen */
    qsa('[data-role="edit-aantal"]', card).forEach(function (btn) {
      btn.addEventListener('click', function () {
        editAantal(btn.getAttribute('data-event-id'));
      });
    });
  }

  /* ── AJAX naar WordPress (no-op in demo) ────────────────────── */
  /**
   * Stuurt aanmelding naar WordPress via admin-ajax.php.
   * In demo-modus (cfg.ajaxUrl === null) gebeurt er niets.
   *
   * WordPress PHP handlers: zie inc/jn-functions.php
   * Actions: jn_rsvp_individueel | jn_rsvp_aantal
   *
   * Succesvolle response: { success: true, data: { rsvp_total: X, groups_total: Y } }
   * Bij succes wordt data-rsvp-count bijgewerkt zodat na page-reload
   * het echte getal vanuit WP meta geladen wordt.
   */
  function sendRsvp(mode, eventId, selected, count) {
    if (!cfg.ajaxUrl || !cfg.nonce) return;

    var body = new URLSearchParams({
      action:   'jn_rsvp_' + mode,
      nonce:    cfg.nonce,
      event_id: eventId,
      selected: selected ? 1 : 0,
    });
    if (mode === 'aantal' && count !== null) {
      body.append('count', count);
    }

    fetch(cfg.ajaxUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (!data.success) return;
      /* Werk data-rsvp-count bij met de server-waarde */
      var card = qs('[data-event-id="' + eventId + '"]');
      if (card && data.data && data.data.rsvp_total !== undefined) {
        card.setAttribute('data-rsvp-count', data.data.rsvp_total);
      }
      if (card && data.data && data.data.groups_total !== undefined) {
        card.setAttribute('data-groups-count', data.data.groups_total);
      }
    })
    .catch(function () { /* stil falen — localStorage staat al goed */ });
  }

  /* ── Filter ──────────────────────────────────────────────────── */
  var activeFilter = 'all';
  var activeView = 'tiles';

  var MONTHS = {
    jan: { index: 1, label: 'Januari' },
    feb: { index: 2, label: 'Februari' },
    mrt: { index: 3, label: 'Maart' },
    apr: { index: 4, label: 'April' },
    mei: { index: 5, label: 'Mei' },
    jun: { index: 6, label: 'Juni' },
    jul: { index: 7, label: 'Juli' },
    aug: { index: 8, label: 'Augustus' },
    sep: { index: 9, label: 'September' },
    okt: { index: 10, label: 'Oktober' },
    nov: { index: 11, label: 'November' },
    dec: { index: 12, label: 'December' }
  };

  function cardMatchesFilter(card) {
    var type = attr(card, 'type');
    return activeFilter === 'all' || type === activeFilter;
  }

  function applyFilter() {
    var allCards   = cards();
    var anyVisible = false;

    allCards.forEach(function (card) {
      var visible = cardMatchesFilter(card);
      card.style.display = visible ? '' : 'none';
      if (visible) anyVisible = true;
    });

    var empty = document.getElementById('jnEmptyState');
    if (empty) empty.classList.toggle('d-none', anyVisible);

    if (activeView === 'month') renderMonthView();
  }

  /* ── Weergave toggle ─────────────────────────────────────────── */
  function applyView() {
    var featuredSection = document.getElementById('jnFeaturedSection');
    var cardsSection    = document.getElementById('jnCardsSection');
    var monthSection    = document.getElementById('jnMonthSection');

    var showTiles = activeView === 'tiles';

    if (featuredSection) featuredSection.classList.toggle('d-none', !showTiles);
    if (cardsSection)    cardsSection.classList.toggle('d-none', !showTiles);
    if (monthSection)    monthSection.classList.toggle('d-none', showTiles);

    if (!showTiles) renderMonthView();
    applyFilter();
  }

  function getCardTitle(card) {
    var el = qs('.jn-card__title', card);
    return el ? el.textContent.trim() : '';
  }

  function getCardDescription(card) {
    var el = qs('.jn-card__desc', card);
    return el ? el.textContent.trim() : '';
  }

  function getCardTypeLabel(card) {
    var chip = qs('.jn-type-chip', card);
    return chip ? chip.textContent.replace(/\s+/g, ' ').trim() : '';
  }

  function getCardTypeIconHTML(card) {
    var icon = qs('.jn-type-chip i', card);
    return icon ? icon.outerHTML : '';
  }

  function getCardDate(card) {
    var values = qsa('.jn-meta-value', card);
    return values[0] ? values[0].textContent.trim() : '';
  }

  function getCardLocation(card) {
    var values = qsa('.jn-meta-value', card);
    return values[1] ? values[1].textContent.trim() : '';
  }

  function parseDateInfo(dateText) {
    var normalized = (dateText || '').toLowerCase();
    var match = normalized.match(/(jan|feb|mrt|apr|mei|jun|jul|aug|sep|okt|nov|dec)\.?\s*(20\d{2})?/);

    if (!match || !MONTHS[match[1]]) {
      return {
        key: '9999-99',
        label: 'Doorlopend / datum volgt',
        sort: 99999999
      };
    }

    var month = MONTHS[match[1]];
    var year = match[2] ? parseInt(match[2], 10) : 2027;
    var beforeMonth = normalized.slice(0, match.index);
    var dayMatches = beforeMonth.match(/\d{1,2}/g);
    var day = dayMatches && dayMatches.length ? parseInt(dayMatches[0], 10) : 1;

    return {
      key: year + '-' + String(month.index).padStart(2, '0'),
      label: month.label + ' ' + year,
      sort: (year * 10000) + (month.index * 100) + day
    };
  }

  function buildMonthResponseHTML(card, state) {
    var mode = attr(card, 'rsvp-mode');
    if (mode === 'info') return '';
    return buildResponseHTML(card, state);
  }

  function buildMonthStatsHTML(card, state) {
    var mode = attr(card, 'rsvp-mode');
    if (mode === 'info') return '';

    var html = '<div class="jn-month-stats">';
    if (mode === 'aantal') {
      html += '<span class="jn-month-stat"><strong>' + getGroupsTotal(card, state) + '</strong> afdelingen</span>';
    }
    html += '<span class="jn-month-stat"><strong>' + getRsvpTotal(card, state) + '</strong> aanmeldingen</span>';
    html += '</div>';
    return html;
  }

  function getVisibleCardsSorted() {
    return cards()
      .filter(cardMatchesFilter)
      .map(function (card) {
        var dateInfo = parseDateInfo(getCardDate(card));
        return { card: card, dateInfo: dateInfo };
      })
      .sort(function (a, b) { return a.dateInfo.sort - b.dateInfo.sort; });
  }

  function renderMonthView() {
    var monthView = document.getElementById('jnMonthView');
    if (!monthView) return;

    var state = getState();
    var sorted = getVisibleCardsSorted();

    if (!sorted.length) {
      monthView.innerHTML = '';
      return;
    }

    var groups = [];
    sorted.forEach(function (item) {
      var current = groups.length ? groups[groups.length - 1] : null;
      if (!current || current.key !== item.dateInfo.key) {
        current = { key: item.dateInfo.key, label: item.dateInfo.label, items: [] };
        groups.push(current);
      }
      current.items.push(item.card);
    });

    monthView.innerHTML = groups.map(function (group) {
      var itemsHTML = group.items.map(function (card) {
        var id = attr(card, 'event-id');
        return (
          '<article class="jn-month-item" data-month-event-id="' + id + '">' +
            '<div class="jn-month-date">' + getCardDate(card) + '</div>' +
            '<div class="jn-month-title-wrap">' +
              '<div class="jn-month-title">' + getCardTitle(card) + '</div>' +
              '<div class="jn-month-desc">' + getCardDescription(card) + '</div>' +
            '</div>' +
            '<div class="jn-month-meta">' +
              '<span class="jn-month-type">' + getCardTypeIconHTML(card) + getCardTypeLabel(card) + '</span>' +
              '<span class="jn-month-location"><i class="far fa-map-marker-alt" aria-hidden="true"></i> ' + getCardLocation(card) + '</span>' +
            '</div>' +
            '<div class="jn-month-actions">' +
              buildMonthStatsHTML(card, state) +
              buildMonthResponseHTML(card, state) +
            '</div>' +
          '</article>'
        );
      }).join('');

      return (
        '<section class="jn-month-group">' +
          '<h2 class="jn-month-heading">' + group.label + '</h2>' +
          '<div class="jn-month-list">' + itemsHTML + '</div>' +
        '</section>'
      );
    }).join('');

    attachMonthListeners();
  }

  function attachMonthListeners() {
    var monthView = document.getElementById('jnMonthView');
    if (!monthView) return;

    qsa('[data-role="individueel-btn"]', monthView).forEach(function (btn) {
      btn.addEventListener('click', function () {
        toggleIndividueel(btn.getAttribute('data-event-id'));
      });
    });

    qsa('[data-role="aantal-btn"]', monthView).forEach(function (btn) {
      btn.addEventListener('click', function () {
        toggleAantal(btn.getAttribute('data-event-id'));
      });
    });

    qsa('[data-role="aantal-input"]', monthView).forEach(function (input) {
      function handleInput() {
        setAantal(input.getAttribute('data-event-id'), input.value, input);
      }
      input.addEventListener('change', handleInput);
      input.addEventListener('blur', handleInput);
    });

    qsa('[data-role="confirm-aantal"]', monthView).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var wrap = btn.closest('[data-role="aantal-wrap"]') || btn.parentNode;
        var input = wrap ? qs('[data-role="aantal-input"]', wrap) : null;
        confirmAantal(btn.getAttribute('data-event-id'), input ? input.value : cfg.aantallMin, input);
      });
    });

    qsa('[data-role="edit-aantal"]', monthView).forEach(function (btn) {
      btn.addEventListener('click', function () {
        editAantal(btn.getAttribute('data-event-id'));
      });
    });
  }

  /* ── Init ────────────────────────────────────────────────────── */
  function init() {
    var state = getState();

    /* Initialiseer alle kaarten */
    cards().forEach(function (card) {
      updateCard(card, state);
    });

    /* Filter knoppen */
    qsa('.jn-filter-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        qsa('.jn-filter-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        activeFilter = btn.getAttribute('data-filter');
        applyFilter();
      });
    });

    /* Weergave knoppen */
    qsa('.jn-view-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        qsa('.jn-view-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        activeView = btn.getAttribute('data-view');
        applyView();
      });
    });

    applyView();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
