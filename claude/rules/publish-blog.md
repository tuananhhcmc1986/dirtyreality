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
- ConvertKit subscription script present after `{{CONTENT}}`:
  ```html
  <script async data-uid="5312ad6631" src="https://dirty-reality.kit.com/5312ad6631/index.js"></script>
  ```
- No duplicate script or toggle elements
