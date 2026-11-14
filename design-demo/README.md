# Design demo (3D version)

`index.html` is a single self-contained file: open it in a browser to click through the whole
redesigned site (3D particle star, light/dark mode, 3 languages, author/reviewer/admin panels) with
sample data kept in the browser. It is the design reference for the Next.js app in the repo root.

- `template.html` — source of the page (markup, styles' Tailwind classes, app logic)
- `scene.js` — the Three.js particle scene (star, book, stack, globe, starfield)
- `seed.json`, `messages.json` — sample data and uz/ru/en translations
- `build/` — rebuild `index.html` after editing:
  ```bash
  cd design-demo/build
  npm i tailwindcss@3 three@0.128.0
  python3 build.py
  ```
