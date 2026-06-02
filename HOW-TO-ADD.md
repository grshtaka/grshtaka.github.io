# Adding stories & signs to THE MANIFOLD

There are two ways. The editor is the easy one.

---

## The easy way — the editor

1. Open **`editor.html`** in your browser (locally: `http://localhost:8731/editor.html`,
   or just double-click the file).
2. Pick **GARDEN STORY** or **LIBRARY SIGN** at the top.
3. Fill it in:
   - **Name** (e.g. `DUSKFALL.TXT` or `WHITE DOG`) — the `id` fills in automatically.
   - **Flower** (garden) or **book height** (library), and a **colour** (swatch or custom).
   - **Description** — the one line shown when you hover the bloom/book.
   - **The text** — your poem (a blank line starts a new stanza) or the sign's meaning.
   - **Gif** (optional) — see "Gifs" below.
   - Watch the **Preview** on the right.
4. **Save (preview)** — the page now appears in *your* browser when you open the site
   (choose the realm and you'll see your new bloom/book). This is private to your device.

### To publish it for everyone
5. Press **Export**. Copy the snippet it shows.
6. Open **`data/entries.js`**, paste the snippet just **before the closing `];`** at the
   bottom of the list (keep the comma).
7. If you used a gif, put the actual file in the **`assets/`** folder and make sure the
   snippet's `bg:`/`gif:` matches the filename (e.g. `assets/duskfall.gif`).
8. In **`index.html`**, find `data/entries.js?v=NN` and bump the number by one
   (e.g. `?v=55` → `?v=56`). This stops the browser/OneDrive from showing a stale copy.
9. Commit & push in **GitHub Desktop**. Done — it's live for everyone.

> Tip: once published, you can remove the local preview copy with **remove** in the
> editor's "Your saved pages" list (or "clear all drafts").

---

## Gifs

- For **publishing**, the gif must live in the `assets/` folder and be referenced by name
  (`assets/yourfile.gif`). Type that name in the gif field.
- The **Upload** button is only for an instant preview in the editor (and the private
  "Save"); it can't put the file into your repo for you.

---

## The by-hand way

Open `data/entries.js` and copy one of the templates at the top of the file (a `story({…})`
or `sign({…})`), fill it in, and paste it into the list. Then do steps 7–9 above.

`kind` values for a story (they set the default colour): `DREAM`, `COSMOGONY`, `MYTH`,
`SHADOW`, `ABOUT`. A library `sign` always uses the colour you give it.
