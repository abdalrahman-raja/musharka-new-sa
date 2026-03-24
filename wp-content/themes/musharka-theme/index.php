<?php get_header(); ?>

<main id="content" class="main-content py-5">
    <div class="container">
        <?php if ( have_posts() ) : while ( have_posts() ) : the_post(); ?>
            <article id="post-<?php the_ID(); ?>" <?php post_class('mb-5'); ?>>
                <header class="entry-header mb-3">
                    <?php if ( is_singular() ) : ?>
                        <h1 class="entry-title"><?php the_title(); ?></h1>
                    <?php else : ?>
                        <h2 class="entry-title"><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h2>
                    <?php endif; ?>
                </header>

                <div class="entry-content">
                    <?php the_content(); ?>
                </div>
            </article>
        <?php endwhile; else : ?>
            <p><?php esc_html_e( 'عذراً، لم يتم العثور على أي محتوى.' ); ?></p>
        <?php endif; ?>
    </div>
</main>

<?php get_footer(); ?>
