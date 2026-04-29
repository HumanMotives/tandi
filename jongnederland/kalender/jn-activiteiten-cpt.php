<?php
/**
 * jn-activiteiten-cpt.php
 * Jong Nederland – Custom Post Type + ACF velden + RSVP opslag
 *
 * Gebruik: plaats dit bestand in je (child) theme en include het in functions.php:
 *   require_once get_stylesheet_directory() . '/inc/jn-activiteiten-cpt.php';
 *
 * Of als plugin: maak een map /wp-content/plugins/jn-activiteiten/
 * en gebruik onderstaande als plugin-hoofdbestand.
 *
 * Plugin Name: Jong Nederland Activiteiten
 * Description: CPT + ACF + RSVP voor de Jong Nederland activiteitenkalender
 * Version:     1.0.0
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/* =========================================================================
   1. CUSTOM POST TYPE: jn_activiteit
   ========================================================================= */
add_action( 'init', 'jn_register_activiteit_cpt' );

function jn_register_activiteit_cpt() {
    $labels = [
        'name'               => 'Activiteiten',
        'singular_name'      => 'Activiteit',
        'add_new'            => 'Nieuwe activiteit',
        'add_new_item'       => 'Nieuwe activiteit toevoegen',
        'edit_item'          => 'Activiteit bewerken',
        'new_item'           => 'Nieuwe activiteit',
        'view_item'          => 'Activiteit bekijken',
        'search_items'       => 'Activiteiten zoeken',
        'not_found'          => 'Geen activiteiten gevonden',
        'not_found_in_trash' => 'Geen activiteiten in prullenbak',
        'menu_name'          => 'Activiteiten',
    ];

    register_post_type( 'jn_activiteit', [
        'labels'             => $labels,
        'public'             => true,
        'has_archive'        => false,
        'show_in_rest'       => true,   // Gutenberg / REST API support
        'supports'           => [ 'title', 'editor', 'thumbnail', 'excerpt' ],
        'menu_icon'          => 'dashicons-calendar-alt',
        'rewrite'            => [ 'slug' => 'activiteiten' ],
        'capability_type'    => 'post',
    ] );
}


/* =========================================================================
   2. ACF FIELD GROUP (pro-formaat; ook compatibel met ACF Free voor basis velden)
   =========================================================================
   Als je ACF Pro hebt: importeer via ACF > Tools > JSON import.
   Anders: registreer via acf_add_local_field_group() hieronder.
   ========================================================================= */
add_action( 'acf/init', 'jn_register_acf_fields' );

function jn_register_acf_fields() {
    if ( ! function_exists( 'acf_add_local_field_group' ) ) {
        return;
    }

    acf_add_local_field_group( [
        'key'      => 'group_jn_activiteit',
        'title'    => 'Activiteit details',
        'fields'   => [

            /* ── Basis ── */
            [
                'key'           => 'field_jn_featured',
                'label'         => 'Uitgelichte activiteit (featured)',
                'name'          => 'jn_featured',
                'type'          => 'true_false',
                'instructions'  => 'Vink aan om de activiteit groot bovenaan te tonen.',
                'default_value' => 0,
                'ui'            => 1,
            ],
            [
                'key'          => 'field_jn_response_mode',
                'label'        => 'Aanmeldtype',
                'name'         => 'jn_response_mode',
                'type'         => 'select',
                'instructions' => 'Individueel = per persoon; Groep = afdeling meldt groep aan; Info only = geen aanmelding.',
                'choices'      => [
                    'individual' => 'Individueel',
                    'group'      => 'Groep',
                    'info'       => 'Info only',
                ],
                'default_value' => 'individual',
                'return_format' => 'value',
            ],
            [
                'key'          => 'field_jn_type_label',
                'label'        => 'Type label (chip)',
                'name'         => 'jn_type_label',
                'type'         => 'text',
                'instructions' => 'Bijv. "Webinar", "Groepsactiviteit", "Cursus". Wordt getoond als chip op de afbeelding.',
                'placeholder'  => 'Webinar',
            ],
            [
                'key'          => 'field_jn_type_icon_fa',
                'label'        => 'FontAwesome icoontje (class)',
                'name'         => 'jn_type_icon_fa',
                'type'         => 'text',
                'instructions' => 'Alleen de FA class zonder "fa-" prefix, bijv. "trophy" of "laptop".',
                'placeholder'  => 'calendar',
            ],

            /* ── Datum & locatie ── */
            [
                'key'          => 'field_jn_date_start',
                'label'        => 'Startdatum',
                'name'         => 'jn_date_start',
                'type'         => 'date_picker',
                'instructions' => 'Wordt gebruikt voor sortering. Format: YYYYMMDD.',
                'display_format' => 'd/m/Y',
                'return_format'  => 'Ymd',
            ],
            [
                'key'          => 'field_jn_date_display',
                'label'        => 'Datum weergave',
                'name'         => 'jn_date_display',
                'type'         => 'text',
                'instructions' => 'Vrije tekst voor weergave, bijv. "25 t/m 27 sep 2026".',
                'placeholder'  => '10 apr 2027',
            ],
            [
                'key'          => 'field_jn_location',
                'label'        => 'Locatie',
                'name'         => 'jn_location',
                'type'         => 'text',
                'placeholder'  => 'BillyBird / Midden van het land',
            ],

            /* ── Prijs ── */
            [
                'key'          => 'field_jn_price',
                'label'        => 'Prijs (optioneel)',
                'name'         => 'jn_price',
                'type'         => 'text',
                'instructions' => 'Bijv. "€ 12,50 p.p." of leeg laten als gratis.',
                'placeholder'  => '',
            ],

            /* ── Deelnemers statistieken (initieel) ── */
            [
                'key'          => 'field_jn_initial_participants',
                'label'        => 'Verwachte deelnemers (initieel)',
                'name'         => 'jn_initial_participants',
                'type'         => 'number',
                'instructions' => 'Basisaantal deelnemers vóór aanmeldingen via de kalender. Aanmeldingen worden opgeteld.',
                'default_value' => 0,
                'min'          => 0,
            ],
            [
                'key'          => 'field_jn_initial_groups',
                'label'        => 'Verwachte afdelingen (initieel, alleen bij Groep)',
                'name'         => 'jn_initial_groups',
                'type'         => 'number',
                'default_value' => 0,
                'min'          => 0,
                'conditional_logic' => [[
                    'field'    => 'field_jn_response_mode',
                    'operator' => '==',
                    'value'    => 'group',
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
        'menu_order'            => 0,
        'position'              => 'normal',
        'style'                 => 'default',
        'label_placement'       => 'top',
        'instruction_placement' => 'label',
        'active'                => true,
    ] );
}


/* =========================================================================
   3. DATABASE TABEL: jn_rsvp  (aanmeldingen per event)
   =========================================================================
   Draait éénmalig bij activering plugin / theme-setup.
   Voer uit via: add_action('after_switch_theme', 'jn_create_rsvp_table');
   Of als plugin: register_activation_hook(__FILE__, 'jn_create_rsvp_table');
   ========================================================================= */
register_activation_hook( __FILE__, 'jn_create_rsvp_table' );

function jn_create_rsvp_table() {
    global $wpdb;
    $table   = $wpdb->prefix . 'jn_rsvp';
    $charset = $wpdb->get_charset_collate();

    $sql = "CREATE TABLE IF NOT EXISTS {$table} (
        id            BIGINT(20)   NOT NULL AUTO_INCREMENT,
        event_post_id BIGINT(20)   NOT NULL,
        user_id       BIGINT(20)   DEFAULT 0,
        mode          VARCHAR(20)  NOT NULL DEFAULT 'individual',
        group_count   SMALLINT(5)  DEFAULT 1,
        selected      TINYINT(1)   NOT NULL DEFAULT 1,
        user_name     VARCHAR(200) DEFAULT '',
        user_email    VARCHAR(200) DEFAULT '',
        afdeling      VARCHAR(200) DEFAULT '',
        created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_event    (event_post_id),
        KEY idx_user     (user_id),
        KEY idx_selected (selected)
    ) {$charset};";

    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    dbDelta( $sql );
}


/* =========================================================================
   4. AJAX HANDLERS: jn_rsvp_individual & jn_rsvp_group
   =========================================================================
   Roep deze aan vanuit jn-activiteiten.js na localStorage-update.
   (Zie commentaar in JS-bestand voor fetch() code.)
   ========================================================================= */

/* ── Zowel ingelogde als niet-ingelogde bezoekers ── */
add_action( 'wp_ajax_jn_rsvp_individual',        'jn_handle_rsvp_individual' );
add_action( 'wp_ajax_nopriv_jn_rsvp_individual', 'jn_handle_rsvp_individual' );

add_action( 'wp_ajax_jn_rsvp_group',        'jn_handle_rsvp_group' );
add_action( 'wp_ajax_nopriv_jn_rsvp_group', 'jn_handle_rsvp_group' );

function jn_handle_rsvp_individual() {
    check_ajax_referer( 'jn_rsvp_nonce', 'nonce' );

    $event_slug = sanitize_text_field( $_POST['event_id'] ?? '' );
    $selected   = intval( $_POST['selected'] ?? 1 );

    /* Zoek post op slug */
    $post = get_page_by_path( $event_slug, OBJECT, 'jn_activiteit' );
    if ( ! $post ) {
        wp_send_json_error( [ 'message' => 'Activiteit niet gevonden.' ] );
        return;
    }

    global $wpdb;
    $table   = $wpdb->prefix . 'jn_rsvp';
    $user_id = get_current_user_id(); /* 0 als niet ingelogd */

    /* Upsert op basis van event_post_id + user_id (of IP voor gasten) */
    $existing = $wpdb->get_row( $wpdb->prepare(
        "SELECT id FROM {$table} WHERE event_post_id = %d AND user_id = %d AND mode = 'individual'",
        $post->ID, $user_id
    ) );

    if ( $existing ) {
        $wpdb->update(
            $table,
            [ 'selected' => $selected ],
            [ 'id' => $existing->id ],
            [ '%d' ],
            [ '%d' ]
        );
    } else {
        $wpdb->insert( $table, [
            'event_post_id' => $post->ID,
            'user_id'       => $user_id,
            'mode'          => 'individual',
            'selected'      => $selected,
        ], [ '%d', '%d', '%s', '%d' ] );
    }

    /* Geef bijgewerkte telling terug */
    $total = (int) $wpdb->get_var( $wpdb->prepare(
        "SELECT COUNT(*) FROM {$table} WHERE event_post_id = %d AND mode = 'individual' AND selected = 1",
        $post->ID
    ) );

    wp_send_json_success( [ 'total_participants' => $total ] );
}

function jn_handle_rsvp_group() {
    check_ajax_referer( 'jn_rsvp_nonce', 'nonce' );

    $event_slug  = sanitize_text_field( $_POST['event_id'] ?? '' );
    $selected    = intval( $_POST['selected'] ?? 1 );
    $group_count = max( 1, intval( $_POST['group_count'] ?? 10 ) );

    $post = get_page_by_path( $event_slug, OBJECT, 'jn_activiteit' );
    if ( ! $post ) {
        wp_send_json_error( [ 'message' => 'Activiteit niet gevonden.' ] );
        return;
    }

    global $wpdb;
    $table   = $wpdb->prefix . 'jn_rsvp';
    $user_id = get_current_user_id();

    $existing = $wpdb->get_row( $wpdb->prepare(
        "SELECT id FROM {$table} WHERE event_post_id = %d AND user_id = %d AND mode = 'group'",
        $post->ID, $user_id
    ) );

    if ( $existing ) {
        $wpdb->update(
            $table,
            [ 'selected' => $selected, 'group_count' => $group_count ],
            [ 'id' => $existing->id ],
            [ '%d', '%d' ],
            [ '%d' ]
        );
    } else {
        $wpdb->insert( $table, [
            'event_post_id' => $post->ID,
            'user_id'       => $user_id,
            'mode'          => 'group',
            'group_count'   => $group_count,
            'selected'      => $selected,
        ], [ '%d', '%d', '%s', '%d', '%d' ] );
    }

    /* Totaal deelnemers = som van alle groepsgroottes */
    $total_parts = (int) $wpdb->get_var( $wpdb->prepare(
        "SELECT SUM(group_count) FROM {$table} WHERE event_post_id = %d AND mode = 'group' AND selected = 1",
        $post->ID
    ) );
    /* Totaal afdelingen */
    $total_groups = (int) $wpdb->get_var( $wpdb->prepare(
        "SELECT COUNT(*) FROM {$table} WHERE event_post_id = %d AND mode = 'group' AND selected = 1",
        $post->ID
    ) );

    wp_send_json_success( [
        'total_participants' => $total_parts,
        'total_groups'       => $total_groups,
    ] );
}


/* =========================================================================
   5. ADMIN OVERZICHT: aanmeldingen per activiteit
   ========================================================================= */
add_action( 'admin_menu', 'jn_register_rsvp_admin_page' );

function jn_register_rsvp_admin_page() {
    add_submenu_page(
        'edit.php?post_type=jn_activiteit',
        'Aanmeldingen overzicht',
        'Aanmeldingen',
        'manage_options',
        'jn-rsvp-overzicht',
        'jn_render_rsvp_admin_page'
    );
}

function jn_render_rsvp_admin_page() {
    global $wpdb;
    $table = $wpdb->prefix . 'jn_rsvp';

    /* Filter op event */
    $filter_event_id = intval( $_GET['event_id'] ?? 0 );

    /* Haal alle activiteiten op voor de dropdown */
    $all_events = get_posts( [
        'post_type'      => 'jn_activiteit',
        'posts_per_page' => -1,
        'orderby'        => 'title',
        'order'          => 'ASC',
    ] );

    /* Query aanmeldingen */
    $where = $filter_event_id ? $wpdb->prepare( 'WHERE r.event_post_id = %d', $filter_event_id ) : '';
    $rows  = $wpdb->get_results(
        "SELECT r.*, p.post_title AS event_title, u.user_login, u.display_name
         FROM {$table} r
         LEFT JOIN {$wpdb->posts} p  ON r.event_post_id = p.ID
         LEFT JOIN {$wpdb->users} u  ON r.user_id = u.ID
         {$where}
         ORDER BY r.event_post_id, r.created_at DESC"
    );

    /* Totalen per event */
    $totals = $wpdb->get_results(
        "SELECT
            event_post_id,
            SUM(CASE WHEN selected = 1 AND mode = 'individual' THEN 1 ELSE 0 END) AS ind_count,
            SUM(CASE WHEN selected = 1 AND mode = 'group'      THEN 1 ELSE 0 END) AS grp_count,
            SUM(CASE WHEN selected = 1 AND mode = 'group' THEN group_count ELSE 0 END) AS grp_parts
         FROM {$table}
         GROUP BY event_post_id"
    );

    ?>
    <div class="wrap">
        <h1>Jong Nederland – Aanmeldingen overzicht</h1>

        <!-- Filter -->
        <form method="get">
            <input type="hidden" name="post_type" value="jn_activiteit" />
            <input type="hidden" name="page" value="jn-rsvp-overzicht" />
            <select name="event_id">
                <option value="">— Alle activiteiten —</option>
                <?php foreach ( $all_events as $ev ) : ?>
                    <option value="<?php echo $ev->ID; ?>" <?php selected( $filter_event_id, $ev->ID ); ?>>
                        <?php echo esc_html( $ev->post_title ); ?>
                    </option>
                <?php endforeach; ?>
            </select>
            <button type="submit" class="button">Filter</button>
        </form>

        <!-- Totalen per activiteit -->
        <h2>Samenvatting</h2>
        <table class="wp-list-table widefat fixed striped">
            <thead>
                <tr>
                    <th>Activiteit</th>
                    <th>Individuele aanmeldingen</th>
                    <th>Afdelingen (groep)</th>
                    <th>Verwachte deelnemers (groep)</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ( $totals as $t ) :
                    $ev_title = get_the_title( $t->event_post_id );
                    ?>
                    <tr>
                        <td><?php echo esc_html( $ev_title ); ?></td>
                        <td><?php echo intval( $t->ind_count ); ?></td>
                        <td><?php echo intval( $t->grp_count ); ?></td>
                        <td><?php echo intval( $t->grp_parts ); ?></td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>

        <!-- Detail tabel -->
        <h2>Detail aanmeldingen<?php echo $filter_event_id ? ' – ' . esc_html( get_the_title( $filter_event_id ) ) : ''; ?></h2>
        <table class="wp-list-table widefat fixed striped">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Activiteit</th>
                    <th>Gebruiker</th>
                    <th>Type</th>
                    <th>Groepsgrootte</th>
                    <th>Aangemeld</th>
                    <th>Datum</th>
                </tr>
            </thead>
            <tbody>
                <?php if ( empty( $rows ) ) : ?>
                    <tr><td colspan="7">Geen aanmeldingen gevonden.</td></tr>
                <?php else : ?>
                    <?php foreach ( $rows as $row ) : ?>
                        <tr>
                            <td><?php echo intval( $row->id ); ?></td>
                            <td><?php echo esc_html( $row->event_title ); ?></td>
                            <td><?php echo $row->user_id ? esc_html( $row->display_name . ' (' . $row->user_login . ')' ) : '<em>Gast</em>'; ?></td>
                            <td><?php echo esc_html( $row->mode ); ?></td>
                            <td><?php echo $row->mode === 'group' ? intval( $row->group_count ) : '—'; ?></td>
                            <td><?php echo $row->selected ? '✅ Ja' : '❌ Nee'; ?></td>
                            <td><?php echo esc_html( $row->created_at ); ?></td>
                        </tr>
                    <?php endforeach; ?>
                <?php endif; ?>
            </tbody>
        </table>
    </div>
    <?php
}


/* =========================================================================
   6. SCRIPTS ENQUEUE (in WordPress context)
   =========================================================================
   Uncomment en gebruik in je (child-)theme functions.php in plaats van
   de CDN-links in het HTML-bestand.
   ========================================================================= */
/*
add_action( 'wp_enqueue_scripts', 'jn_enqueue_assets' );

function jn_enqueue_assets() {
    if ( ! is_page_template( 'template-activiteiten.php' ) ) return;

    // Bootstrap 4.6
    wp_enqueue_style( 'bootstrap', 'https://cdn.jsdelivr.net/npm/bootstrap@4.6.2/dist/css/bootstrap.min.css', [], '4.6.2' );
    wp_enqueue_script( 'popper',    'https://cdn.jsdelivr.net/npm/popper.js@1.16.1/dist/umd/popper.min.js',   ['jquery'], '1.16.1', true );
    wp_enqueue_script( 'bootstrap', 'https://cdn.jsdelivr.net/npm/bootstrap@4.6.2/dist/js/bootstrap.min.js',  ['jquery','popper'], '4.6.2', true );

    // FontAwesome Pro 5 – vervang de kit-URL met jouw Pro kit URL
    wp_enqueue_script( 'fontawesome', 'https://kit.fontawesome.com/JOUW_KIT_ID.js', [], null, true );

    // Jong Nederland activiteiten stijl
    wp_enqueue_style( 'jn-activiteiten', get_stylesheet_directory_uri() . '/css/jn-activiteiten.css', ['bootstrap'], '1.0.0' );

    // Jong Nederland activiteiten script + AJAX data
    wp_enqueue_script( 'jn-activiteiten', get_stylesheet_directory_uri() . '/js/jn-activiteiten.js', [], '1.0.0', true );
    wp_localize_script( 'jn-activiteiten', 'jnData', [
        'ajax_url' => admin_url( 'admin-ajax.php' ),
        'nonce'    => wp_create_nonce( 'jn_rsvp_nonce' ),
    ] );
}
*/
