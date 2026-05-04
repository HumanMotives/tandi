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
  function cards() { return qsa('[data-event-id]'); }

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
    if (mode === 'aantal' && evtSt.selected) {
      return base + (evtSt.count || cfg.aantallMin);
    }
    return base;
  }

  function getGroupsTotal(card, state) {
    var id    = attr(card, 'event-id');
    var base  = numAttr(card, 'groups-count');
    var evtSt = state[id] || {};
    if (attr(card, 'rsvp-mode') === 'aantal' && evtSt.selected) {
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
            (sel ? 'Je bent aangemeld' : 'Ik meld me aan') +
          '</button>' +
        '</div>'
      );
    }

    if (mode === 'aantal') {
      var selG  = evtSt.selected;
      var count = evtSt.count || cfg.aantallMin;
      if (full && !selG) {
        return '<p class="jn-full-msg"><i class="fas fa-lock" aria-hidden="true"></i> Activiteit is vol</p>';
      }
      return (
        '<div class="jn-action-row">' +
          '<button class="jn-action-btn' + (selG ? ' active' : '') + '"' +
          ' type="button" data-role="aantal-btn" data-event-id="' + id + '"' +
          ' aria-pressed="' + (selG ? 'true' : 'false') + '">' +
            '<i class="fas ' + (selG ? 'fa-check-circle' : 'fa-users') + '" aria-hidden="true"></i> ' +
            (selG ? 'Aangemeld' : 'Wij doen mee') +
          '</button>' +
        '</div>' +
        '<div class="jn-aantal-wrap' + (selG ? ' visible' : '') + '" data-role="aantal-wrap">' +
          '<span class="jn-aantal-label">Aantal deelnemers:</span>' +
          '<input class="jn-aantal-input"' +
          ' type="number" inputmode="numeric"' +
          ' min="' + cfg.aantallMin + '" max="' + cfg.aantallMax + '"' +
          ' value="' + count + '"' +
          ' data-role="aantal-input" data-event-id="' + id + '"' +
          ' aria-label="Aantal deelnemers"' +
          ' />' +
          '<span class="jn-input-error" data-role="input-error">Voer een getal in tussen ' + cfg.aantallMin + ' en ' + cfg.aantallMax + '</span>' +
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

  /* ── Event listeners per kaart ───────────────────────────────── */
  function attachCardListeners(card) {

    /* Individueel */
    qsa('[data-role="individueel-btn"]', card).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id    = btn.getAttribute('data-event-id');
        var state = getState();
        var evtSt = getEventState(id, state);
        evtSt.selected = !evtSt.selected;
        saveState(state);
        sendRsvp('individueel', id, evtSt.selected, null);
        updateCard(card, state);
      });
    });

    /* Aantal — knop toggle */
    qsa('[data-role="aantal-btn"]', card).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id    = btn.getAttribute('data-event-id');
        var state = getState();
        var evtSt = getEventState(id, state);
        if (!evtSt.count) evtSt.count = cfg.aantallMin;
        evtSt.selected = !evtSt.selected;
        saveState(state);
        sendRsvp('aantal', id, evtSt.selected, evtSt.count);
        updateCard(card, state);
      });
    });

    /* Aantal — invoerveld */
    qsa('[data-role="aantal-input"]', card).forEach(function (input) {
      /* Valideer en sla op bij wijziging */
      function handleInput() {
        var id      = input.getAttribute('data-event-id');
        var val     = parseInt(input.value, 10);
        var errEl   = qs('[data-role="input-error"]', card);
        var valid   = !isNaN(val) && val >= cfg.aantallMin && val <= cfg.aantallMax;

        input.classList.toggle('is-invalid', !valid);
        if (errEl) errEl.classList.toggle('visible', !valid);

        if (valid) {
          var state = getState();
          var evtSt = getEventState(id, state);
          evtSt.count    = val;
          evtSt.selected = true;
          saveState(state);
          sendRsvp('aantal', id, true, val);
          /* Herrender alleen tellers, niet het hele panel */
          var rsvpEl = qs('[data-role="rsvp-count"]', card);
          if (rsvpEl) {
            rsvpEl.firstChild.nodeValue = getRsvpTotal(card, state);
          }
          var badge = qs('[data-role="popular-badge"]', card);
          if (badge) badge.classList.toggle('d-none', !isPopular(card, state));
        }
      }

      input.addEventListener('change', handleInput);
      input.addEventListener('blur',   handleInput);
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

  function applyFilter() {
    var allCards   = cards();
    var anyVisible = false;

    allCards.forEach(function (card) {
      var type    = attr(card, 'type');
      var visible = activeFilter === 'all' || type === activeFilter;
      card.style.display = visible ? '' : 'none';
      if (visible) anyVisible = true;
    });

    var empty = document.getElementById('jnEmptyState');
    if (empty) empty.classList.toggle('d-none', anyVisible);
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
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
