# Publish Blog Post

Codex automation rule for publishing markdown drafts to HTML posts.

When the user asks Codex to publish a Dirty Reality blog draft, follow this rule end to end from the `DirtyRealityBlog` project root. Preserve UTF-8 Vietnamese text. Do not summarize, skip, or reorder the required publishing steps.

## Source

```
drafts/<category>/<filename>.md
```

## Category

Must be one of: `mes`, `dms`, `ba`, `linh-tinh`

Target folder: `docs/<category>/posts/`

## Slug

Convert filename to slug:
- lowercase
- remove Vietnamese accents
- replace spaces with hyphen

Example: `mes không thất bại vì công nghệ.md` → `mes-khong-that-bai-vi-cong-nghe.html`

## Date Format

`dd/mm/yyyy` — example: `13/02/2026`

## Codex Operating Rules

- Work from the `DirtyRealityBlog` directory unless the user explicitly gives another root.
- Read and write all blog files using UTF-8.
- Prefer existing templates and local file structure over inventing new markup.
- Before editing, identify whether this is a new publish or Republish Mode by checking whether `docs/<category>/posts/<slug>.html` already exists.
- For manual file edits, keep changes limited to the files allowed in **Constraints**.
- For subscriber notification, run the `curl` command from Codex's shell tool. If Bash is available, use Bash as specified below; otherwise use the platform shell with `curl.exe`/`curl` while preserving the exact URL and URL-encoded parameters. If network access is blocked by the sandbox, request approval and then rerun the command.
- In the final response, report the final URL and whether subscriber notification was sent.

## Steps

**1. Convert markdown content**
Each paragraph → `<p>...</p>`

**2. Generate related posts**
- Scan `docs/<category>/posts/`
- Sort newest first, exclude current post, take latest 5
- Format: `<a href="slug.html">Title</a>`

**3. Apply template**

First, extract the **sapo** from the markdown draft: take the first non-empty paragraph that is not a heading (does not start with `#`) and not a separator (`---`). Strip markdown formatting (`**`, `*`, etc.) to get plain text. This value is used as `{{DESCRIPTION}}` and reused in Step 7.

Use `templates/post-template.html`, replace:
- `{{TITLE}}`
- `{{DATE}}`
- `{{CATEGORY}}`
- `{{CONTENT}}`
- `{{RELATED_POSTS}}`
- `{{DESCRIPTION}}` — the sapo extracted above (plain text, no markdown)
- `{{SLUG}}` — the slug computed from the filename (e.g. `mes-khong-that-bai-vi-cong-nghe`)

**4. SEO Metadata**

Sau khi áp template, bổ sung các thẻ SEO vào `<head>` của file HTML vừa tạo:

**4.1 Title tag**
```html
<title>{{TITLE}} | Dirty Reality</title>
```

**4.2 Meta description**
Dùng sapo đã extract ở Bước 3, cắt tối đa 160 ký tự (không cắt giữa từ):
```html
<meta name="description" content="{{DESCRIPTION_160}}">
```

**4.3 Canonical URL**
```html
<link rel="canonical" href="https://dirtyreality.net/{{CATEGORY}}/posts/{{SLUG}}.html">
```

**4.4 Open Graph tags**
```html
<meta property="og:type" content="article">
<meta property="og:title" content="{{TITLE}}">
<meta property="og:description" content="{{DESCRIPTION_160}}">
<meta property="og:url" content="https://dirtyreality.net/{{CATEGORY}}/posts/{{SLUG}}.html">
<meta property="og:image" content="https://dirtyreality.net/og-default.png">
<meta property="og:site_name" content="Dirty Reality">
<meta property="article:published_time" content="{{DATE_ISO}}">
```

> Nếu bài viết có chứa thẻ `<img>` trong content, lấy `src` của ảnh đầu tiên làm `og:image` thay cho ảnh mặc định.

**4.5 Twitter Card tags**
```html
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{{TITLE}}">
<meta name="twitter:description" content="{{DESCRIPTION_160}}">
<meta name="twitter:image" content="https://dirtyreality.net/og-default.png">
```

**4.6 JSON-LD Structured Data**

Chèn khối sau vào cuối `<head>`:
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "{{TITLE}}",
  "description": "{{DESCRIPTION_160}}",
  "url": "https://dirtyreality.net/{{CATEGORY}}/posts/{{SLUG}}.html",
  "datePublished": "{{DATE_ISO}}",
  "dateModified": "{{DATE_ISO}}",
  "author": {
    "@type": "Person",
    "name": "Dirty Reality"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Dirty Reality",
    "url": "https://dirtyreality.net"
  }
}
</script>
```

**4.7 Quy tắc bổ sung**
- Tất cả các thẻ meta SEO phải nằm trong `<head>`, trước `</head>`
- Không trùng lặp thẻ `<title>` — nếu template đã có, cập nhật thay vì thêm mới
- `{{DATE_ISO}}` = ngày bài viết chuyển từ `dd/mm/yyyy` → `YYYY-MM-DD` (đồng nhất với Bước 7)
- `{{DESCRIPTION_160}}` = sapo cắt tối đa 160 ký tự, giữ nguyên tiếng Việt có dấu

**5. Save file**
`docs/<category>/posts/<slug>.html`

**6. Update category index**
Edit `docs/<category>/index.html`, inside `<div class="posts">`, insert:

```html
<div class="post-item">
    <a href="posts/<slug>.html">
        TITLE
    </a>
</div>

<div class="post-year">
    DATE
</div>
```

**7. Update RSS feed**
Edit `docs/feed.xml`, insert inside `<channel>` after `<lastBuildDate>`:

```xml
<item>
    <title>{{TITLE}}</title>
    <link>https://dirtyreality.net/{{CATEGORY}}/posts/{{SLUG}}.html</link>
    <pubDate>{{DATE_RSS_FORMAT}}</pubDate>
    <guid>https://dirtyreality.net/{{CATEGORY}}/posts/{{SLUG}}.html</guid>
    <description>Bài viết mới nhất trong chuyên mục {{CATEGORY}}</description>
</item>
```

Limit feed to latest 10 items.

**8. Update sitemap**

Edit `docs/sitemap.xml`:

- Convert the post date from `dd/mm/yyyy` → `YYYY-MM-DD` for use as `<lastmod>`
- **New post:** insert a new `<url>` block before the closing `</urlset>` tag:

```xml
  <url>
    <loc>https://dirtyreality.net/{{CATEGORY}}/posts/{{SLUG}}.html</loc>
    <lastmod>{{DATE_ISO}}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
```

- **Republish:** update the `<lastmod>` of the existing entry for this URL instead of inserting a duplicate
- Update the `<lastmod>` of the matching category index entry (e.g. `https://dirtyreality.net/{{CATEGORY}}/`) if `{{DATE_ISO}}` is more recent than the current value
- Update the `<lastmod>` of the homepage entry (`https://dirtyreality.net/`) if `{{DATE_ISO}}` is more recent than the current value

**9. Notify subscribers via email**

Use the sapo already extracted in Step 3 as `{{DESCRIPTION}}`.

Then call the notification endpoint using Bash:

```bash
curl -s "https://script.google.com/macros/s/AKfycbxMbWXIe56bCpGt3oywPv_6NU8FH-UkMgkHbut3fxvneMF905yT4fKP9JLSlygbofNIhA/exec?action=notify&secret=dirtyrealitysgnngsytilaerytrid14061986&title={{URL_ENCODED_TITLE}}&url={{URL_ENCODED_POST_URL}}&sapo={{URL_ENCODED_SAPO}}"
```

- Post URL format: `https://dirtyreality.net/{{CATEGORY}}/posts/{{SLUG}}.html`
- URL-encode all three params (title, url, sapo) before inserting into the curl command
- Run the curl command using Codex's shell tool. Prefer Bash when available; otherwise use the active shell with `curl.exe`/`curl`.
- This sends email to all subscribers recorded in the Google Sheet

## Constraints

- Only modify the files touched by the steps above: the post HTML, `docs/<category>/index.html`, `docs/feed.xml`, `docs/sitemap.xml`
- Do NOT modify any other files
- Final URL must work at: `https://dirtyreality.net/<category>/posts/<slug>.html`

## Republish Mode

If `docs/<category>/posts/<slug>.html` already exists:
- Overwrite file content using latest template
- Do NOT create duplicate entry in index — check first, only add if slug missing
- If slug already exists in `docs/feed.xml`, update the existing `<item>` instead of creating duplicate
- If slug already exists in `docs/sitemap.xml`, update the existing `<lastmod>` instead of inserting duplicate

## Template Requirements

The generated HTML must include:

```html
<!-- immediately after <body> -->
<div class="theme-toggle" onclick="toggleTheme()">
toggle theme
</div>

<!-- immediately before </body> -->
<script src="../../theme.js"></script>
```

Also ensure:
- `nav-back` element present
- `style.css` reference present
- Google Sheets subscription form present after `{{CONTENT}}`:
  ```html
  <div class="subscribe-wrapper" style="border-top: 1px solid var(--border); padding-top: 40px;">
      <div class="subscribe-label">NHẬN BÀI MỚI QUA EMAIL</div>
      <form class="subscribe-form" onsubmit="handleSubscribe(event)">
          <input type="email" class="subscribe-input" placeholder="email@example.com" required>
          <button type="submit" class="subscribe-btn">Đăng ký</button>
      </form>
      <div class="subscribe-msg"></div>
  </div>

  <script>
  function handleSubscribe(e) {
    e.preventDefault();
    var form = e.target;
    var email = form.querySelector('input').value;
    var msg = form.parentElement.querySelector('.subscribe-msg');
    var btn = form.querySelector('button');
    btn.disabled = true;
    btn.textContent = '...';
    var url = 'https://script.google.com/macros/s/AKfycbxMbWXIe56bCpGt3oywPv_6NU8FH-UkMgkHbut3fxvneMF905yT4fKP9JLSlygbofNIhA/exec?email=' + encodeURIComponent(email) + '&source=dirtyreality.net';
    fetch(url, { mode: 'no-cors' })
      .then(function() {
        form.style.display = 'none';
        msg.textContent = 'Đã đăng ký! Cảm ơn bạn.';
      })
      .catch(function() {
        btn.disabled = false;
        btn.textContent = 'Đăng ký';
        msg.textContent = 'Có lỗi, thử lại nhé.';
      });
  }
  </script>
  ```
- No duplicate script or toggle elements
