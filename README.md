# De Lukes — website preview (GitHub Pages)

A static preview of the De Lukes website so the artist can click through it before it goes live on Hostinger.

**Works here:** every page, the music player and background music, lyrics, gallery, videos, light/dark theme,
smooth scrolling, WhatsApp button and chat assistant, plus a read-only tour of the admin panel (`/admin/`).

**Demo only:** booking/contact/signup forms, cart and checkout, and admin saving show a "preview" message,
because GitHub Pages has no server or database. On Hostinger they work for real.

Search engines are told not to index this preview (`noindex` + `robots.txt`), so it won't compete with the live site.

## Publish
1. Create a new repository on GitHub (e.g. `delukes-preview`). Public repos get free Pages.
2. Upload **the contents of this folder** (not the folder itself) to the repository root, including the hidden `.nojekyll` file.
3. Repository → **Settings → Pages** → Source: *Deploy from a branch* → Branch: `main` / `(root)` → Save.
4. After about a minute the preview is at `https://YOUR-USERNAME.github.io/delukes-preview/`.

Generated from the PHP site with `tools/export-static.php`.