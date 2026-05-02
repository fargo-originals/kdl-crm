import { supabaseServer } from '@/lib/supabase-server';

export async function getPublishedSnapshot(locale: string) {
  const [settings, hero, services, portfolio, testimonials, faq, team] = await Promise.all([
    supabaseServer.from('landing_settings').select('key, published_value').in('key', ['header', 'footer', 'seo_global', 'theme']),
    supabaseServer.from('landing_hero').select('*').eq('published', true).order('position'),
    supabaseServer.from('landing_services').select('*').eq('published', true).order('position'),
    supabaseServer.from('landing_portfolio').select('*').eq('published', true).order('position'),
    supabaseServer.from('landing_testimonials').select('*').eq('published', true).order('position'),
    supabaseServer.from('landing_faq').select('*').eq('published', true).order('position'),
    supabaseServer.from('landing_team').select('*').eq('published', true).order('position'),
  ]);

  const settingsMap = Object.fromEntries(
    (settings.data ?? []).map(s => [s.key, s.published_value])
  );

  return {
    locale,
    header: settingsMap.header ?? {},
    footer: settingsMap.footer ?? {},
    seo: settingsMap.seo_global ?? {},
    theme: settingsMap.theme ?? {},
    hero: hero.data ?? [],
    services: services.data ?? [],
    portfolio: portfolio.data ?? [],
    testimonials: testimonials.data ?? [],
    faq: faq.data ?? [],
    team: team.data ?? [],
  };
}

export async function getPublishedBlogPosts(locale: string, page = 1, tag?: string) {
  let query = supabaseServer
    .from('landing_blog_posts')
    .select('id, slug, title, excerpt, cover_url, tags, published_at, author_id')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .range((page - 1) * 10, page * 10 - 1);

  if (tag) query = query.contains('tags', [tag]);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getPublishedBlogPost(slug: string) {
  const { data, error } = await supabaseServer
    .from('landing_blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();

  if (error) throw error;
  return data;
}
