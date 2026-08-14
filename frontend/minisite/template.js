function escapeHtml(value) { return String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]); }
function safeUrl(value) { try { const url = new URL(String(value)); return ['https:', 'tel:', 'mailto:'].includes(url.protocol) ? escapeHtml(url.href) : ''; } catch { return ''; } }

export function minisiteDocument(profile, slug) {
  const name = escapeHtml(profile?.name ?? slug);
  const city = escapeHtml(profile?.city?.name ?? 'Brasil');
  const presentation = escapeHtml(profile?.presentation ?? 'Perfil oficial no portal ACTS.');
  const media = profile?.gallery ?? [];
  const first = profile?.coverUrl;
  const images = [first, ...(Array.isArray(media) ? media : [])].filter(Boolean).map((item, index) => { const url = safeUrl(typeof item === 'object' ? item.url : item); return url ? `<img src="${url}" alt="Foto ${index + 1} de ${name}">` : ''; }).join('');
  const services = profile?.services ?? [];
  const chips = Array.isArray(services) ? services.map((item) => `<span class="mini-chip">${escapeHtml(item)}</span>`).join('') : '';
  const blogPosts = Array.isArray(profile?.blog?.posts) ? profile.blog.posts : [];
  const posts = blogPosts.map((post) => { const url=safeUrl(post.url),image=safeUrl(post.imageUrl); if(!url)return '';const date=post.publishedAt&&!Number.isNaN(Date.parse(post.publishedAt))?new Date(post.publishedAt).toLocaleDateString('pt-BR'):'';return `<article class="mini-post">${image?`<img src="${image}" alt="">`:''}<div><p class="mini-kicker">${escapeHtml(date)}</p><h3>${escapeHtml(post.title)}</h3>${post.excerpt?`<div>${post.excerpt}</div>`:''}${post.content?`<div class="mini-post-content">${post.content}</div>`:''}<a href="${url}" rel="noopener noreferrer">Ver publicação original</a></div></article>` }).join('');
  const blog = posts ? `<section class="mini-blog"><div class="mini-wrap"><span class="mini-kicker">Blogger</span><h2>Publicações</h2>${posts}</div></section>` : '';
  const contacts = profile?.contacts ?? {};
  const links = Object.entries(contacts).filter(([, value]) => typeof value === 'string').map(([key, value]) => { const href = key === 'phone' ? `tel:${value}` : value; const url = safeUrl(href); return url ? `<a class="mini-action" href="${url}" rel="noopener">${escapeHtml(key)}</a>` : ''; }).join('');
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${name} — Minisite ACTS</title><meta name="description" content="Perfil público de ${name} em ${city}."><link rel="canonical" href="https://${escapeHtml(slug)}.imobiliarista.net/"><link rel="stylesheet" href="/assets/minisite.css"></head><body><header class="mini-head mini-wrap"><span class="mini-brand">ACTS<span>.</span></span><a href="https://imobiliarista.net">Ir ao portal</a></header><main><section class="mini-hero mini-wrap"><div class="mini-gallery">${images || '<p>Fotos indisponíveis</p>'}</div><div class="mini-copy"><span class="mini-kicker">Perfil oficial · ${city}</span><h1>${name}</h1><p>${presentation}</p><div class="mini-chips">${chips}</div><div>${links}</div></div></section>${blog}</main><footer class="mini-footer"><div class="mini-wrap">Minisite oficial na mídia ACTS.</div></footer></body></html>`;
}

export function minisiteNotFound() {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Minisite não encontrado — ACTS</title><link rel="stylesheet" href="/assets/minisite.css"></head><body><main class="not-found"><div><span class="mini-brand">ACTS<span>.</span></span><h1>Minisite não encontrado</h1><p>Este perfil não está disponível.</p><a class="mini-action" href="https://imobiliarista.net">Voltar ao portal</a></div></main></body></html>`;
}
