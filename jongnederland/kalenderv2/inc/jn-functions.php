<?php
/**
 * jn-functions.php  –  Jong Nederland Activiteiten kalender
 * Versie 2.0.0
 *
 * Gebruik in je (child-)theme functions.php:
 *   require_once get_stylesheet_directory() . '/inc/jn-functions.php';
 *
 * ================================================================
 * INHOUD
 * 1. Custom Post Type: jn_activiteit
 * 2. ACF veldgroep
 * 3. RSVP opslag als post meta
 * 4. AJAX handlers (individueel + aantal)
 * 5. Admin kolom: X / Y aanmeldingen
 * 6. Scripts & styles enqueue
 * ================================================================
 */

defined( 'ABSPATH' ) || exit;

/* ================================================================
   1. CUSTOM POST TYPE
   ================================================================ */
add_action( 'init', 'jn_register_cpt' );

function jn_register_cpt() {
    register_post_type( 'jn_activiteit', [
        'labels' => [
            'name'               => 'Activiteiten',
            'singular_name'      => 'Activiteit',
            'add_new_item'       => 'Nieuwe activiteit toevoegen',
            'edit_item'          => 'Activiteit bewerken',
            'not_found'          => 'Geen activiteiten gevonden',
            'menu_name'          => 'Activiteiten',
        ],
        'public'          => true,
        'has_archive'     => false,
        'show_in_rest'    => true,
        'supports'        => [ 'title', 'excerpt', 'editor', 'thumbnail' ],
        /*
         * WordPress-native velden die we gebruiken:
         *   post_title     → naam activiteit
         *   post_excerpt   → korte beschrijving (op de kaart)
         *   post_content   → lange beschrijving (detailpagina later)
         *   post_thumbnail → afbeelding op de kaart
         */
        'menu_icon'       => 'dashicons-calendar-alt',
        'rewrite'         => [ 'slug' => 'activiteiten' ],
        'capability_type' => 'post',
    ] );
}


/* ================================================================
   2. ACF VELDGROEP
   Alleen velden die WordPress zelf niet heeft.
   ================================================================ */
add_action( 'acf/init', 'jn_register_acf_fields' );

function jn_register_acf_fields() {
    if ( ! function_exists( 'acf_add_local_field_group' ) ) return;

    acf_add_local_field_group( [
        'key'   => 'group_jn_activiteit_v2',
        'title' => 'Activiteit details',
        'fields' => [

            /* ── Type ── */
            [
                'key'           => 'field_jn_type',
                'label'         => 'Type activiteit',
                'name'          => 'jn_type',
                'type'          => 'select',
                'instructions'  => 'Bepaalt het filter en de chipkleur op de kalender.',
                'choices'       => [
                    'jeugd'        => 'Jeugdactiviteit',
                    'vrijwilliger' => 'Vrijwilligersactiviteit',
                    'cursus'       => 'Cursus',
                    'workshop'     => 'Workshop',
                ],
                'default_value' => 'vrijwilliger',
                'return_format' => 'value',
                'required'      => 1,
            ],

            /* ── RSVP modus ── */
            [
                'key'           => 'field_jn_rsvp_mode',
                'label'         => 'Aanmeldtype',
                'name'          => 'jn_rsvp_mode',
                'type'          => 'select',
                'instructions'  => 'Individueel = 1 persoon klikt aan. Aantal = afdeling voert groepsgrootte in. Info only = geen aanmelding.',
                'choices'       => [
                    'individueel' => 'Individueel',
                    'aantal'      => 'Aantal (groep)',
                    'info'        => 'Info only',
                ],
                'default_value' => 'individueel',
                'return_format' => 'value',
                'required'      => 1,
            ],

            /* ── Uitgelicht ── */
            [
                'key'           => 'field_jn_featured',
                'label'         => 'Uitgelicht (grote kaart bovenaan)',
                'name'          => 'jn_featured',
                'type'          => 'true_false',
                'default_value' => 0,
                'ui'            => 1,
            ],

            /* ── Datum ── */
            [
                'key'          => 'field_jn_date_sort',
                'label'        => 'Startdatum (voor sortering)',
                'name'         => 'jn_date_sort',
                'type'         => 'date_picker',
                'instructions' => 'Wordt gebruikt om activiteiten chronologisch te sorteren.',
                'display_format' => 'd/m/Y',
                'return_format'  => 'Ymd',
                'required'     => 1,
            ],
            [
                'key'         => 'field_jn_date_display',
                'label'       => 'Datum weergave',
                'name'        => 'jn_date_display',
                'type'        => 'text',
                'instructions'=> 'Vrije tekst, bijv. "25 t/m 27 sep 2026" of "14 t/m 18 jul 2027".',
                'placeholder' => '10 apr 2027',
                'required'    => 1,
            ],

            /* ── Locatie ── */
            [
                'key'         => 'field_jn_location',
                'label'       => 'Locatie',
                'name'        => 'jn_location',
                'type'        => 'text',
                'placeholder' => 'Utrecht / Online / Hybride',
                'required'    => 1,
            ],

            /* ── Prijs (optioneel) ── */
            [
                'key'         => 'field_jn_price',
                'label'       => 'Prijs (optioneel)',
                'name'        => 'jn_price',
                'type'        => 'text',
                'instructions'=> 'Leeg laten als gratis. Bijv. "€ 12,50 p.p."',
                'placeholder' => '',
            ],

            /* ── Maximum deelnemers ── */
            [
                'key'           => 'field_jn_rsvp_max',
                'label'         => 'Maximum deelnemers',
                'name'          => 'jn_rsvp_max',
                'type'          => 'number',
                'instructions'  => 'Maximale capaciteit. Bij 0 of leeg = onbeperkt (wordt 1000).',
                'default_value' => 1000,
                'min'           => 0,
                'conditional_logic' => [[
                    'field'    => 'field_jn_rsvp_mode',
                    'operator' => '!=',
                    'value'    => 'info',
                ]],
            ],

        ],
        'location' => [[
            [
                'param'    => 'post_type',
                'operator' => '==',
                'value'    => 'jn_activiteit',
            ],
        ]],
        'menu_order' => 0,
        'position'   => 'normal',
        'active'     => true,
    ] );
}


/* ================================================================
   3. RSVP OPSLAG ALS POST META
   ================================================================
   Meta keys per post (jn_activiteit):
     _jn_rsvp_total        int  – totaal aangemelde personen
     _jn_rsvp_groups       int  – totaal aangemelde afdelingen (aantal-modus)
     _jn_rsvp_entries      json – array van individuele aanmeldingen

   Structuur van een entry in _jn_rsvp_entries:
   {
     "user_id":    12,           // 0 = gast
     "mode":       "individueel" | "aantal",
     "count":      1,            // 1 voor individueel, groepsgrootte voor aantal
     "selected":   true,
     "timestamp":  "2026-09-01 14:32:00"
   }
   ================================================================ */

/**
 * Haal alle entries op voor een activiteit.
 */
function jn_get_rsvp_entries( $post_id ) {
    $raw = get_post_meta( $post_id, '_jn_rsvp_entries', true );
    return $raw ? json_decode( $raw, true ) : [];
}

/**
 * Sla entries op en herbereken totalen.
 */
function jn_save_rsvp_entries( $post_id, $entries ) {
    update_post_meta( $post_id, '_jn_rsvp_entries', wp_json_encode( $entries ) );

    $total  = 0;
    $groups = 0;
    foreach ( $entries as $e ) {
        if ( empty( $e['selected'] ) ) continue;
        $total  += intval( $e['count'] ?? 1 );
        $groups += ( ( $e['mode'] ?? '' ) === 'aantal' ) ? 1 : 0;
    }

    update_post_meta( $post_id, '_jn_rsvp_total',  $total  );
    update_post_meta( $post_id, '_jn_rsvp_groups', $groups );
}

/**
 * Vind een bestaande entry (op user_id voor ingelogden, of op session key voor gasten).
 * Geeft de index terug, of -1.
 */
function jn_find_entry_index( $entries, $user_id, $session_key, $mode ) {
    foreach ( $entries as $i => $e ) {
        if ( $user_id > 0 && intval( $e['user_id'] ?? 0 ) === $user_id && $e['mode'] === $mode ) {
            return $i;
        }
        if ( $user_id === 0 && isset( $e['session_key'] ) && $e['session_key'] === $session_key && $e['mode'] === $mode ) {
            return $i;
        }
    }
    return -1;
}

/**
 * Unieke session key voor gasten (opgeslagen in cookie).
 */
function jn_get_session_key() {
    $key = isset( $_COOKIE['jn_session'] ) ? sanitize_text_field( $_COOKIE['jn_session'] ) : '';
    if ( ! $key ) {
        $key = wp_generate_password( 24, false );
        setcookie( 'jn_session', $key, time() + YEAR_IN_SECONDS, COOKIEPATH, COOKIE_DOMAIN, is_ssl(), true );
    }
    return $key;
}

/**
 * Zoek de post op basis van post slug (event_id in JS = post slug).
 */
function jn_get_post_by_slug( $slug ) {
    return get_page_by_path( $slug, OBJECT, 'jn_activiteit' );
}


/* ================================================================
   4. AJAX HANDLERS
   ================================================================ */
add_action( 'wp_ajax_jn_rsvp_individueel',        'jn_ajax_rsvp_individueel' );
add_action( 'wp_ajax_nopriv_jn_rsvp_individueel', 'jn_ajax_rsvp_individueel' );

add_action( 'wp_ajax_jn_rsvp_aantal',        'jn_ajax_rsvp_aantal' );
add_action( 'wp_ajax_nopriv_jn_rsvp_aantal', 'jn_ajax_rsvp_aantal' );

function jn_ajax_rsvp_individueel() {
    check_ajax_referer( 'jn_rsvp_nonce', 'nonce' );

    $slug     = sanitize_text_field( $_POST['event_id'] ?? '' );
    $selected = ! empty( $_POST['selected'] ) && intval( $_POST['selected'] ) === 1;

    $post = jn_get_post_by_slug( $slug );
    if ( ! $post ) {
        wp_send_json_error( [ 'message' => 'Activiteit niet gevonden.' ] );
    }

    $user_id     = get_current_user_id();
    $session_key = jn_get_session_key();
    $entries     = jn_get_rsvp_entries( $post->ID );
    $idx         = jn_find_entry_index( $entries, $user_id, $session_key, 'individueel' );

    $entry = [
        'user_id'     => $user_id,
        'session_key' => $session_key,
        'mode'        => 'individueel',
        'count'       => 1,
        'selected'    => $selected,
        'timestamp'   => current_time( 'mysql' ),
    ];

    if ( $idx >= 0 ) {
        $entries[ $idx ] = $entry;
    } else {
        $entries[] = $entry;
    }

    jn_save_rsvp_entries( $post->ID, $entries );

    wp_send_json_success( [
        'rsvp_total'   => (int) get_post_meta( $post->ID, '_jn_rsvp_total',  true ),
        'groups_total' => (int) get_post_meta( $post->ID, '_jn_rsvp_groups', true ),
    ] );
}

function jn_ajax_rsvp_aantal() {
    check_ajax_referer( 'jn_rsvp_nonce', 'nonce' );

    $slug     = sanitize_text_field( $_POST['event_id'] ?? '' );
    $selected = ! empty( $_POST['selected'] ) && intval( $_POST['selected'] ) === 1;
    $count    = max( 1, min( 100, intval( $_POST['count'] ?? 1 ) ) );

    $post = jn_get_post_by_slug( $slug );
    if ( ! $post ) {
        wp_send_json_error( [ 'message' => 'Activiteit niet gevonden.' ] );
    }

    $user_id     = get_current_user_id();
    $session_key = jn_get_session_key();
    $entries     = jn_get_rsvp_entries( $post->ID );
    $idx         = jn_find_entry_index( $entries, $user_id, $session_key, 'aantal' );

    $entry = [
        'user_id'     => $user_id,
        'session_key' => $session_key,
        'mode'        => 'aantal',
        'count'       => $count,
        'selected'    => $selected,
        'timestamp'   => current_time( 'mysql' ),
    ];

    if ( $idx >= 0 ) {
        $entries[ $idx ] = $entry;
    } else {
        $entries[] = $entry;
    }

    jn_save_rsvp_entries( $post->ID, $entries );

    wp_send_json_success( [
        'rsvp_total'   => (int) get_post_meta( $post->ID, '_jn_rsvp_total',  true ),
        'groups_total' => (int) get_post_meta( $post->ID, '_jn_rsvp_groups', true ),
    ] );
}


/* ================================================================
   5. ADMIN KOLOM: X / Y aanmeldingen
   ================================================================ */
add_filter( 'manage_jn_activiteit_posts_columns',       'jn_add_admin_columns' );
add_action( 'manage_jn_activiteit_posts_custom_column', 'jn_render_admin_column', 10, 2 );
add_filter( 'manage_edit-jn_activiteit_sortable_columns', 'jn_sortable_columns' );

function jn_add_admin_columns( $columns ) {
    $new = [];
    foreach ( $columns as $key => $label ) {
        $new[ $key ] = $label;
        if ( $key === 'title' ) {
            $new['jn_type']         = 'Type';
            $new['jn_date_display'] = 'Datum';
            $new['jn_rsvp']         = 'Aanmeldingen';
        }
    }
    return $new;
}

function jn_render_admin_column( $column, $post_id ) {
    switch ( $column ) {
        case 'jn_type':
            $types = [
                'jeugd'        => 'Jeugdactiviteit',
                'vrijwilliger' => 'Vrijwilligersactiviteit',
                'cursus'       => 'Cursus',
                'workshop'     => 'Workshop',
            ];
            $val = get_post_meta( $post_id, 'jn_type', true );
            echo esc_html( $types[ $val ] ?? $val );
            break;

        case 'jn_date_display':
            echo esc_html( get_post_meta( $post_id, 'jn_date_display', true ) ?: '—' );
            break;

        case 'jn_rsvp':
            $total = (int) get_post_meta( $post_id, '_jn_rsvp_total', true );
            $max   = (int) get_post_meta( $post_id, 'jn_rsvp_max',    true );
            $max   = $max ?: 1000;
            $mode  = get_post_meta( $post_id, 'jn_rsvp_mode', true );

            if ( $mode === 'info' ) {
                echo '<em style="color:#999">—</em>';
                break;
            }

            $color = $total >= $max ? 'color:#c0392b;font-weight:700' : 'color:#0d7a40;font-weight:700';
            echo '<span style="' . $color . '">' . intval( $total ) . ' / ' . intval( $max ) . '</span>';

            if ( $mode === 'aantal' ) {
                $groups = (int) get_post_meta( $post_id, '_jn_rsvp_groups', true );
                echo '<br><small style="color:#666">' . intval( $groups ) . ' afdeling(en)</small>';
            }
            break;
    }
}

function jn_sortable_columns( $columns ) {
    $columns['jn_date_display'] = 'jn_date_sort';
    $columns['jn_rsvp']         = '_jn_rsvp_total';
    return $columns;
}


/* ================================================================
   6. SCRIPTS & STYLES ENQUEUE
   ================================================================
   Pas 'template-activiteiten.php' aan naar jouw template bestandsnaam.
   ================================================================ */
add_action( 'wp_enqueue_scripts', 'jn_enqueue_assets' );

function jn_enqueue_assets() {
    /* Alleen laden op de activiteitenpagina */
    if ( ! is_page_template( 'template-activiteiten.php' ) ) return;

    /* Bootstrap 4.6 */
    wp_enqueue_style(
        'bootstrap',
        'https://cdn.jsdelivr.net/npm/bootstrap@4.6.2/dist/css/bootstrap.min.css',
        [], '4.6.2'
    );
    wp_enqueue_script(
        'bootstrap',
        'https://cdn.jsdelivr.net/npm/bootstrap@4.6.2/dist/js/bootstrap.bundle.min.js',
        [ 'jquery' ], '4.6.2', true
    );

    /* FontAwesome Pro 5 — vervang kit-URL */
    wp_enqueue_script( 'fontawesome', 'https://kit.fontawesome.com/JOUW_KIT_ID.js', [], null, true );

    /* Jong Nederland stijlen */
    wp_enqueue_style(
        'jn-activiteiten',
        get_stylesheet_directory_uri() . '/css/jn-activiteiten.css',
        [ 'bootstrap' ], '2.0.0'
    );

    /* Jong Nederland script + config */
    wp_enqueue_script(
        'jn-activiteiten',
        get_stylesheet_directory_uri() . '/js/jn-activiteiten.js',
        [], '2.0.0', true
    );

    wp_localize_script( 'jn-activiteiten', 'jnConfig', [
        'ajaxUrl'    => admin_url( 'admin-ajax.php' ),
        'nonce'      => wp_create_nonce( 'jn_rsvp_nonce' ),
        'popularAt'  => 25,
        'aantallMin' => 1,
        'aantallMax' => 100,
    ] );
}
