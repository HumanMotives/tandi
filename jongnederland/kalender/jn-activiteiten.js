/**
 * jn-activiteiten.js
 * Jong Nederland – Activiteiten kalender
 * Bootstrap 4 compatible (no framework dependency in this file)
 *
 * =====================================================================
 * WORDPRESS INTEGRATION
 * =====================================================================
 * 1. Enqueue this file with wp_enqueue_script() (footer, depends: []).
 * 2. To pass the RSVP AJAX URL + nonce, add in functions.php:
 *
 *    wp_localize_script('jn-activiteiten', 'jnData', [
 *      'ajax_url' => admin_url('admin-ajax.php'),
 *      'nonce'    => wp_create_nonce('jn_rsvp_nonce'),
 *    ]);
 *
 * 3. In PHP, register the AJAX handlers (see jn-functions.php comments).
 *
 * CARD HTML REQUIREMENTS (data-* attributes on the <article> element):
 *   data-event-id            – unique slug, e.g. "festival-back2basic-2027"
 *   data-response-mode       – "individual" | "group" | "info"
 *   data-filter-type         – "individual" | "group" | "info"
 *   data-initial-participants – integer
 *   data-initial-groups      – integer (group mode only)
 *
 * Inside .jn-response[data-role="response"] the JS writes the buttons.
 * Inside .jn-stat-value[data-role="participants"] the count is updated.
 * Inside .jn-stat-value[data-role="groups"] the group count is updated.
 * =====================================================================
 */

(function () {
  'use strict';

  /* ── Constants ──────────────────────────────────────────────────── */
  var STORAGE_KEY      = 'jn-activiteiten-v1';
  var POPULAR_THRESHOLD = 25;
  var GROUP_OPTIONS    = [10, 15, 20, 25, 30, 40, 50];

  /* ── State (localStorage) ──────────────────────────────────────── */
  function getState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      /* storage blocked / private mode – silently continue */
    }
  }

  function getEventState(eventId, state) {
    if (!state[eventId]) state[eventId] = {};
    return state[eventId];
  }

  /* ── DOM helpers ────────────────────────────────────────────────── */
  function qs(selector, context) {
    return (context || document).querySelector(selector);
  }

  function qsa(selector, context) {
    return Array.prototype.slice.call((context || document).querySelectorAll(selector));
  }

  /* ── Card data helpers ──────────────────────────────────────────── */
  function getCards() {
    return qsa('[data-event-id]');
  }

  function getInitialParticipants(card) {
    return parseInt(card.getAttribute('data-initial-participants'), 10) || 0;
  }

  function getInitialGroups(card) {
    return parseInt(card.getAttribute('data-initial-groups'), 10) || 0;
  }

  function getResponseMode(card) {
    return card.getAttribute('data-response-mode') || 'info';
  }

  function getFilterType(card) {
    return card.getAttribute('data-filter-type') || 'info';
  }

  function getEventId(card) {
    return card.getAttribute('data-event-id');
  }

  /* ── Participant/group counts ───────────────────────────────────── */
  function getExpectedParticipants(card, state) {
    var eventId  = getEventId(card);
    var mode     = getResponseMode(card);
    var initial  = getInitialParticipants(card);
    var evtState = state[eventId] || {};

    if (mode === 'individual') {
      return initial + (evtState.selected ? 1 : 0);
    }
    if (mode === 'group') {
      var count = evtState.count || GROUP_OPTIONS[0];
      return initial + (evtState.selected ? count : 0);
    }
    return initial;
  }

  function getExpectedGroups(card, state) {
    var eventId  = getEventId(card);
    var evtState = state[eventId] || {};
    return getInitialGroups(card) + (evtState.selected ? 1 : 0);
  }

  function isPopular(card, state) {
    return getExpectedParticipants(card, state) >= POPULAR_THRESHOLD;
  }

  /* ── Build response panel HTML ──────────────────────────────────── */
  function buildResponseHTML(card, state) {
    var mode     = getResponseMode(card);
    var eventId  = getEventId(card);
    var evtState = state[eventId] || {};

    if (mode === 'individual') {
      var sel = evtState.selected;
      return (
        '<div class="jn-action-row">' +
          '<button class="jn-action-btn' + (sel ? ' active' : '') + '" type="button"' +
          ' data-role="individual-btn" data-event-id="' + eventId + '"' +
          ' aria-pressed="' + (sel ? 'true' : 'false') + '">' +
            '<i class="fas ' + (sel ? 'fa-check-circle' : 'fa-heart') + '" aria-hidden="true"></i> ' +
            (sel ? 'Je bent erbij' : 'Ik ben erbij') +
          '</button>' +
        '</div>'
      );
    }

    if (mode === 'group') {
      var selG  = evtState.selected;
      var count = evtState.count || GROUP_OPTIONS[0];
      var opts  = GROUP_OPTIONS.map(function (v) {
        return '<option value="' + v + '"' + (v === count ? ' selected' : '') + '>' + v + '</option>';
      }).join('');

      return (
        '<div class="jn-action-row">' +
          '<button class="jn-action-btn' + (selG ? ' active' : '') + '" type="button"' +
          ' data-role="group-btn" data-event-id="' + eventId + '"' +
          ' aria-pressed="' + (selG ? 'true' : 'false') + '">' +
            '<i class="fas ' + (selG ? 'fa-check-circle' : 'fa-users') + '" aria-hidden="true"></i> ' +
            'Wij komen waarschijnlijk' +
          '</button>' +
          '<div class="jn-count-picker' + (selG ? ' visible' : '') + '" data-role="group-picker">' +
            '<span class="jn-count-picker-label">Aantal:</span>' +
            '<select class="jn-count-select" data-role="group-count" data-event-id="' + eventId + '">' +
              opts +
            '</select>' +
          '</div>' +
        '</div>'
      );
    }

    return ''; /* info only */
  }

  /* ── Update a single card's dynamic parts ───────────────────────── */
  function updateCard(card, state) {
    var mode    = getResponseMode(card);
    var popular = isPopular(card, state);

    /* Popular badge */
    var badge = qs('[data-role="popular-badge"]', card);
    if (badge) {
      if (popular) {
        badge.classList.remove('d-none');
      } else {
        badge.classList.add('d-none');
      }
    }

    /* Participant stat */
    var partEl = qs('[data-role="participants"]', card);
    if (partEl) {
      partEl.textContent = getExpectedParticipants(card, state);
    }

    /* Group stat */
    var groupEl = qs('[data-role="groups"]', card);
    if (groupEl && mode === 'group') {
      groupEl.textContent = getExpectedGroups(card, state);
    }

    /* Response panel */
    var responseEl = qs('[data-role="response"]', card);
    if (responseEl) {
      responseEl.innerHTML = buildResponseHTML(card, state);
      attachCardListeners(card);
    }
  }

  /* ── Attach button/select listeners to a card ───────────────────── */
  function attachCardListeners(card) {
    /* Individual RSVP */
    qsa('[data-role="individual-btn"]', card).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var eventId  = btn.getAttribute('data-event-id');
        var state    = getState();
        var evtState = getEventState(eventId, state);
        evtState.selected = !evtState.selected;
        saveState(state);

        /*
         * ============================================================
         * WORDPRESS AJAX:
         * After saveState(), also fire an AJAX request:
         *
         * fetch(jnData.ajax_url, {
         *   method: 'POST',
         *   headers: {'Content-Type':'application/x-www-form-urlencoded'},
         *   body: new URLSearchParams({
         *     action:    'jn_rsvp_individual',
         *     nonce:     jnData.nonce,
         *     event_id:  eventId,
         *     selected:  evtState.selected ? 1 : 0,
         *   })
         * });
         * ============================================================
         */

        updateCard(card, state);
      });
    });

    /* Group toggle */
    qsa('[data-role="group-btn"]', card).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var eventId  = btn.getAttribute('data-event-id');
        var state    = getState();
        var evtState = getEventState(eventId, state);
        if (!evtState.count) evtState.count = GROUP_OPTIONS[0];
        evtState.selected = !evtState.selected;
        saveState(state);

        /*
         * WORDPRESS AJAX (same pattern as individual, action: 'jn_rsvp_group')
         */

        updateCard(card, state);
      });
    });

    /* Group count select */
    qsa('[data-role="group-count"]', card).forEach(function (sel) {
      sel.addEventListener('change', function () {
        var eventId  = sel.getAttribute('data-event-id');
        var state    = getState();
        var evtState = getEventState(eventId, state);
        evtState.count    = parseInt(sel.value, 10);
        evtState.selected = true;
        saveState(state);
        updateCard(card, state);
      });
    });
  }

  /* ── Filter logic ───────────────────────────────────────────────── */
  var activeFilter = 'all';

  function applyFilter() {
    var allCards   = getCards();
    var anyVisible = false;

    allCards.forEach(function (card) {
      var filterType = getFilterType(card);
      var visible    = activeFilter === 'all' || filterType === activeFilter;

      /* For col wrappers we hide/show the column article itself */
      card.style.display = visible ? '' : 'none';
      if (visible) anyVisible = true;
    });

    var emptyState = document.getElementById('jnEmptyState');
    if (emptyState) {
      if (anyVisible) {
        emptyState.classList.add('d-none');
      } else {
        emptyState.classList.remove('d-none');
      }
    }
  }

  /* ── Init ───────────────────────────────────────────────────────── */
  function init() {
    var state = getState();

    /* Initial render of all cards */
    getCards().forEach(function (card) {
      updateCard(card, state);
    });

    /* Filter buttons */
    qsa('.jn-filter-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        qsa('.jn-filter-btn').forEach(function (b) {
          b.classList.remove('active');
        });
        btn.classList.add('active');
        activeFilter = btn.getAttribute('data-filter');
        applyFilter();
      });
    });
  }

  /* Run after DOM ready */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
