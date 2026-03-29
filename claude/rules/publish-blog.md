# Publish Blog Post

Automation rule for publishing markdown drafts to HTML posts.

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

## Steps

**1. Convert markdown content**
Each paragraph → `<p>...</p>`

**2. Generate related posts**
- Scan `docs/<category>/posts/`
- Sort newest first, exclude current post, take latest 5
- Format: `<a href="slug.html">Title</a>`

**3. Apply template**
Use `templates/post-template.html`, replace:
- `{{TITLE}}`
- `{{DATE}}`
- `{{CATEGORY}}`
- `{{CONTENT}}`
- `{{RELATED_POSTS}}`

**4. Save file**
`docs/<category>/posts/<slug>.html`

**5. Update category index**
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

**6. Update RSS feed**
Edit `feed.xml`, insert inside `<channel>` after `<lastBuildDate>`:

```xml
<item>
    <title>{{TITLE}}</title>
    <link>https://yourdomain.com/dirtyreality/{{CATEGORY}}/posts/{{SLUG}}.html</link>
    <pubDate>{{DATE_RSS_FORMAT}}</pubDate>
    <guid>https://yourdomain.com/dirtyreality/{{CATEGORY}}/posts/{{SLUG}}.html</guid>
    <description>Bài viết mới nhất trong chuyên mục {{CATEGORY}}</description>
</item>
```

Limit feed to latest 10 items.

**7. Notify subscribers via email**

Extract sapo from the markdown draft: take the first non-empty paragraph — the first block of text that is not a heading (does not start with `#`) and not a separator (`---`). Strip any markdown formatting (bold `**`, italic `*`, etc.) to get plain text.

Then call the notification endpoint using Bash:

```bash
curl -s "https://script.google.com/macros/s/AKfycbxMbWXIe56bCpGt3oywPv_6NU8FH-UkMgkHbut3fxvneMF905yT4fKP9JLSlygbofNIhA/exec?action=notify&secret=dirtyrealitysgnngsytilaerytrid14061986&title={{URL_ENCODED_TITLE}}&url={{URL_ENCODED_POST_URL}}&sapo={{URL_ENCODED_SAPO}}"
```

- Post URL format: `https://dirtyreality.net/{{CATEGORY}}/posts/{{SLUG}}.html`
- URL-encode all three params (title, url, sapo) before inserting into the curl command
- Run the curl command using the Bash tool
- This sends email to all subscribers recorded in the Google Sheet

## Constraints

- Do NOT modify other files
- Final URL must work at: `/dirtyreality/<category>/posts/<slug>.html`

## Republish Mode

If `docs/<category>/posts/<slug>.html` already exists:
- Overwrite file content using latest template
- Do NOT create duplicate entry in index — check first, only add if slug missing
- If slug already exists in `feed.xml`, update the existing `<item>` instead of creating duplicate

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
