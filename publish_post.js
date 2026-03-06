const fs = require('fs');
const path = require('path');

const defaultDraftPath = path.join(__dirname, 'drafts', 'ba', 'ba-sau-ky-nguyen-AI');

function formatDdMmYyyy(d) {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = String(d.getFullYear());
  return `${dd}/${mm}/${yyyy}`;
}

function parseDdMmYyyy(s) {
  const m = String(s).trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const dd = Number(m[1]);
  const mm = Number(m[2]);
  const yyyy = Number(m[3]);
  const d = new Date(Date.UTC(yyyy, mm - 1, dd));
  if (d.getUTCFullYear() !== yyyy || d.getUTCMonth() !== mm - 1 || d.getUTCDate() !== dd) return null;
  return d;
}

function stripVietnameseAccents(s) {
  return String(s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

function slugify(name) {
  const base = stripVietnameseAccents(String(name));
  return base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function convInline(s) {
  // Note: we escape first, then re-introduce safe tags.
  const escaped = escapeHtml(s);
  return escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

function countMatches(re, s) {
  const m = s.match(re);
  return m ? m.length : 0;
}

function markdownBodyToHtml(rawBody) {
  const lines = rawBody.split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const L = lines[i];
    if (L.startsWith('## ')) {
      out.push('<h2>' + convInline(L.slice(3)) + '</h2>');
      i++;
      continue;
    }
    if (L.startsWith('### ')) {
      out.push('<h3>' + convInline(L.slice(4)) + '</h3>');
      i++;
      continue;
    }
    if (L.trim() === '---') {
      out.push('<hr>');
      i++;
      continue;
    }
    if (L.trim().startsWith('* ') && L.trim().length > 2) {
      const ul = ['<ul>'];
      while (i < lines.length && lines[i].trim().startsWith('* ')) {
        ul.push('<li>' + convInline(lines[i].trim().slice(2)) + '</li>');
        i++;
      }
      ul.push('</ul>');
      out.push(ul.join(''));
      continue;
    }
    if (L.includes('|') && L.trim().startsWith('|')) {
      const tbl = ['<table><tbody>'];
      while (i < lines.length && lines[i].includes('|')) {
        const cells = lines[i].split('|').slice(1, -1).map(c => c.trim());
        if (cells.length && !cells.every(c => c.replace(/-/g, '').trim() === '')) {
          const tag = tbl.length === 1 ? 'th' : 'td';
          tbl.push('<tr>' + cells.map(c => '<' + tag + '>' + convInline(c) + '</' + tag + '>').join('') + '</tr>');
        }
        i++;
      }
      tbl.push('</tbody></table>');
      out.push(tbl.join(''));
      continue;
    }
    if (L.trim().startsWith('<div')) {
      const block = [L];
      let depth = countMatches(/<div\b/gi, L) - countMatches(/<\/div>/gi, L);
      i++;
      while (i < lines.length && depth > 0) {
        const ln = lines[i];
        block.push(ln);
        depth += countMatches(/<div\b/gi, ln) - countMatches(/<\/div>/gi, ln);
        i++;
      }

      let blockHtml = block.join('\n');

      // Make diagram render top-to-bottom by preserving newlines.
      if (blockHtml.includes('class="diagram-box"') && blockHtml.includes('<style>')) {
        if (!blockHtml.includes('white-space: pre-line')) {
          if (blockHtml.includes('<style>\n')) {
            blockHtml = blockHtml.replace(
              '<style>\n',
              '<style>\n.diagram-box { white-space: pre-line; }\n'
            );
          } else {
            blockHtml = blockHtml.replace(
              '<style>',
              '<style>\n.diagram-box { white-space: pre-line; }\n'
            );
          }
        }
      }

      out.push(blockHtml);
      continue;
    }
    if (L.trim() === '') {
      i++;
      continue;
    }
    const acc = [L];
    i++;
    while (i < lines.length && lines[i].trim() !== '' &&
      !lines[i].startsWith('## ') && !lines[i].startsWith('### ') &&
      !lines[i].trim().startsWith('* ') &&
      !(lines[i].trim().startsWith('|') && lines[i].includes('|')) &&
      !lines[i].trim().startsWith('<')) {
      acc.push(lines[i]);
      i++;
    }
    const cleaned = acc.map(x => x.trim()).filter(Boolean);
    if (cleaned.length) {
      const joined = cleaned.map(convInline).join('<br>\n');
      out.push('<p>' + joined + '</p>');
    }
  }
  return out.join('\n\n');
}

function extractExistingPostMeta(html) {
  const dateMatch = html.match(/<div class="article-meta">\s*([0-9]{2}\/[0-9]{2}\/[0-9]{4})\s*·/);
  const titleMatch = html.match(/<h1[^>]*class="article-title"[^>]*>[\s\n\r]*([^<]+?)\s*<\/h1>/);
  return {
    date: dateMatch ? dateMatch[1] : null,
    title: titleMatch ? titleMatch[1].trim() : null,
  };
}

function buildRelatedPostsHtml(postsDir, currentSlug) {
  if (!fs.existsSync(postsDir)) return '';
  const files = fs.readdirSync(postsDir).filter(f => f.toLowerCase().endsWith('.html'));
  const posts = [];
  for (const f of files) {
    const slug = path.basename(f, '.html');
    if (slug === currentSlug) continue;
    const full = path.join(postsDir, f);
    let html;
    try {
      html = fs.readFileSync(full, 'utf8');
    } catch {
      continue;
    }
    const meta = extractExistingPostMeta(html);
    const dateObj = meta.date ? parseDdMmYyyy(meta.date) : null;
    posts.push({
      slug,
      file: f,
      title: meta.title || slug,
      date: meta.date || '',
      dateObj: dateObj ? dateObj.getTime() : 0,
    });
  }

  posts.sort((a, b) => (b.dateObj - a.dateObj) || a.slug.localeCompare(b.slug));
  const top = posts.slice(0, 5);
  if (!top.length) return '';

  return top
    .map(p => `        <a href="${escapeHtml(p.file)}">${escapeHtml(p.title)}</a><br>`)
    .join('\n');
}

function ensureTemplateIntegrity(tpl) {
  let t = String(tpl);

  // Required: style.css reference
  if (!t.includes('href="../../style.css"')) {
    t = t.replace(
      /<\/title>\s*/,
      '</title>\n\n<link rel="stylesheet" href="../../style.css">\n\n'
    );
  }

  // Required: theme toggle directly after <body>
  if (!t.includes('class="theme-toggle"') || !t.includes('toggleTheme()')) {
    t = t.replace(
      /<body>\s*/,
      '<body>\n\n<div class="theme-toggle" onclick="toggleTheme()">\ntoggle theme\n</div>\n\n'
    );
  }

  // Required: nav-back element
  if (!t.includes('class="nav-back"')) {
    t = t.replace(
      /<div class="site-title">[\s\S]*?<\/div>\s*/,
      (m) => `${m}\n<div class="nav-back">\n    <a href="../">← {{CATEGORY}}</a>\n</div>\n\n`
    );
  }

  // Required: theme.js script immediately before </body>
  if (!t.includes('<script src="../../theme.js"></script>')) {
    t = t.replace(
      /<\/body>/,
      '<script src="../../theme.js"></script>\n\n</body>'
    );
  }

  // Avoid duplicates (if template accidentally includes theme.js twice)
  const themeScript = '<script src="../../theme.js"></script>';
  const parts = t.split(themeScript);
  if (parts.length > 2) {
    t = parts[0] + themeScript + parts.slice(1).join('');
  }

  return t;
}

function updateCategoryIndex(indexPath, slug, title) {
  if (!fs.existsSync(indexPath)) return false;
  const href = `posts/${slug}.html`;
  let html = fs.readFileSync(indexPath, 'utf8');
  if (html.includes(href)) return false;

  const insertion = `\n\n<div class="post-item">\n<a href="${href}">${escapeHtml(title)}</a>\n</div>\n`;

  const marker = '<div class="posts">';
  if (html.includes(marker)) {
    html = html.replace(marker, marker + insertion);
  } else {
    // Fallback: append at end.
    html += `\n${insertion}\n`;
  }

  fs.writeFileSync(indexPath, html, 'utf8');
  return true;
}

function resolveDraftPath() {
  const arg = process.argv[2];
  if (!arg) return defaultDraftPath;
  return path.isAbsolute(arg) ? arg : path.join(__dirname, arg);
}

function inferCategoryFromDraft(draftPath) {
  const draftsRoot = path.join(__dirname, 'drafts');
  const rel = path.relative(draftsRoot, draftPath);
  const parts = rel.split(path.sep).filter(Boolean);
  return parts.length ? parts[0] : 'ba';
}

const draftPath = resolveDraftPath();
const category = inferCategoryFromDraft(draftPath);
const displayCategory = category.toUpperCase();

const draftBase = path.basename(draftPath).replace(/\.[^.]+$/, '');
const slug = slugify(draftBase);

const outPath = path.join(__dirname, 'docs', category, 'posts', `${slug}.html`);
const postsDir = path.dirname(outPath);
const indexPath = path.join(__dirname, 'docs', category, 'index.html');
const templatePath = path.join(__dirname, 'templates', 'post-template.html');

let raw = fs.readFileSync(draftPath, 'utf8');
raw = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

const titleMatch = raw.match(/^#\s+(.+)\s*$/m);
const title = titleMatch ? titleMatch[1].trim() : 'Untitled';

// Remove the first "# ..." heading line only.
raw = raw.replace(/^#\s+.*\n?/, '');
raw = raw.replace(/^\n+/, '');

let publishDate = formatDdMmYyyy(new Date());
if (fs.existsSync(outPath)) {
  const existingHtml = fs.readFileSync(outPath, 'utf8');
  const meta = extractExistingPostMeta(existingHtml);
  if (meta.date) publishDate = meta.date;
}

const contentHtml = markdownBodyToHtml(raw);
const relatedHtml = buildRelatedPostsHtml(postsDir, slug);

let template = fs.readFileSync(templatePath, 'utf8');
template = ensureTemplateIntegrity(template);

const finalHtml = template
  .split('{{TITLE}}').join(escapeHtml(title))
  .split('{{DATE}}').join(escapeHtml(publishDate))
  .split('{{CATEGORY}}').join(escapeHtml(displayCategory))
  .split('{{CONTENT}}').join(contentHtml)
  .split('{{RELATED_POSTS}}').join(relatedHtml);

fs.mkdirSync(postsDir, { recursive: true });
fs.writeFileSync(outPath, finalHtml, 'utf8');

updateCategoryIndex(indexPath, slug, title);

console.log('Wrote', outPath);
