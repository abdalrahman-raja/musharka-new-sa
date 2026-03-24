<!DOCTYPE html>
<html <?php language_attributes(); ?> class="no-js no-svg">
<head>
    <meta charset="<?php bloginfo( 'charset' ); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="profile" href="http://gmpg.org/xfn/11">
    <?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
<header class="header">
    <div class="wrapper">
        <nav id="nav-main" class="nav-main" role="navigation">
            <div class="menu-container d-flex flex-column">
                <nav class="navbar container flex-grow-1">
                    <div class="first-grp">
                        <a class="navbar-brand" href="<?php echo esc_url( home_url( '/' ) ); ?>">
                            <img src="<?php echo get_template_directory_uri(); ?>/../../uploads/2025/04/ad0dd98ee54f5c1cc0ad82aed29e0605-153x86-c-default.png" alt="<?php bloginfo( 'name' ); ?>" class="menu-logo">
                        </a>
                        <?php
                        // In a real theme, we would use wp_nav_menu() here.
                        // For now, we'll keep the static structure or leave it for the user to implement.
                        ?>
                        <ul class="navbar-nav">
                            <li class="nav-item"><a class="nav-link" href="<?php echo esc_url( home_url( '/' ) ); ?>">الرئيسية</a></li>
                            <!-- Add more menu items as needed -->
                        </ul>
                    </div>
                </nav>
            </div>
        </nav>
    </div>
</header>
