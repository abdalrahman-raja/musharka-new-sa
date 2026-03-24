<?php
/**
 * Musharka Theme functions and definitions
 */

function musharka_theme_setup() {
    add_theme_support( 'title-tag' );
    add_theme_support( 'post-thumbnails' );
    add_theme_support( 'html5', array( 'search-form', 'comment-form', 'comment-list', 'gallery', 'caption' ) );
}
add_action( 'after_setup_theme', 'musharka_theme_setup' );

function musharka_theme_scripts() {
    // Enqueue Litespeed CSS files (as found in the static version)
    $css_dir = get_template_directory_uri() . '/../../litespeed/css/';
    $css_files = array(
        'bd5f8e90ebc93e2be4eec48d92c8679f83ee',
        '942805cea4c21ef7a3b6b22c7233c913b528',
        '4b776a184b0bd64895fee5a2643c71c52a46',
        'cb5cad1a0a67e082785f6b11da5a19508bc2',
        '6c48f2cd0c7b46f8977f21e98ea1080f7846',
        'dfc03b3f1f2c0779cf9a5d8f3ef13fe17e0e',
        '403cd58e5396d28081f7bbaa05f4e3a8110d',
        '31e12dc746c99350058f27fddf3f7fcf8ace',
        'a0062117fd9d72362afee7da555070cd689c',
        '008c11843dec95ffa5f7bf182830729ec4bf',
        '6694bed961edb6ac42df8ba1370521fb31b0',
        'b0e0e6aec87bc26f9fb95ed8141aaf9beef0',
        '5e224b4b238a19dc737967adc105c0eb3014',
        '1fe80abfd4dbd5dcf8fa80176a26b9b8f825',
        '2606c484c270da1a338f6e53651cda0954ce',
        'fd1826d4e5b8900210107ad197874581cbb9'
    );

    foreach ($css_files as $css) {
        wp_enqueue_style( 'musharka-' . $css, $css_dir . $css . '.css' );
    }

    // Enqueue Theme JS
    wp_enqueue_script( 'musharka-menu', get_template_directory_uri() . '/assets/js/menu933d.js', array('jquery'), '1.0', true );
}
add_action( 'wp_enqueue_scripts', 'musharka_theme_scripts' );
