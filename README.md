# TYRAVORN
**ONE JURASSIC WORLD. INFINITE CREATURE IDENTITIES.**

TYRAVORN is a static, mobile-friendly field archive of deterministic, fictional prehistoric creature profiles. It uses only HTML, CSS, and JavaScript and can be published on GitHub Pages without a build process, backend, account system, paid API, or image-generation service.

## Files
- `index.html` — semantic page structure and controls
- `style.css` — responsive cinematic interface
- `script.js` — deterministic identity generator, procedural Canvas renderer, profile navigation, and stream logic

## Publish on GitHub Pages
1. Create a repository on GitHub.
2. Upload all four files to the repository root.
3. Open **Settings → Pages**.
4. Under the build/deployment source, select **Deploy from a branch**, choose your default branch and `/ (root)`, then save.
5. Wait for the Pages deployment and open the published address.

No build step is required. The optional Google Fonts import has system-font fallbacks; the site remains usable if that request fails.

## Infinite exploration
The home stream starts with profile IDs `1`, `2`, and `3`. As the sentinel approaches the viewport, an `IntersectionObserver` requests more profiles. The live DOM is bounded by keeping a small recent window of cards; older cards are discarded rather than retained forever. The next ID is incremented as a decimal string, so stream generation does not depend on JavaScript's safe integer range.

The implementation is an effectively inexhaustible stream, not a claim of mathematically infinite storage. A browser still has finite CPU, memory, and session time. The stream uses a bounded number of live cards and a bounded portrait cache.

## Profile identities and exact large IDs
Each profile's decimal identifier is its primary identity. The generator hashes the string directly; it never converts the full ID to `Number` or `BigInt`. Consequently, very large decimal IDs are not rounded. The search accepts up to 10,000 digits as a defensive browser-input bound, then opens that profile directly without enumerating previous IDs. Leading zeros are normalized away. Scientific notation, signs, and separators are rejected.

The 10,000-digit input bound is a safety limit for browser responsiveness, not a profile-count limit. The number of possible IDs is not otherwise capped.

## Permanent links
A profile is addressable with a query parameter, for example:

`https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/?profile=98765432101234567890`

This query-string route works on GitHub Pages because it does not require server-side rewrite rules. Copy-link controls create a link to the exact profile. Refreshing a direct profile URL regenerates the same profile. Browser Back/Forward responds to navigation state.

If a repository is published under a project path, use its published URL as the base. The copy-link control automatically retains that base path.

## Procedural portrait renderer
Portraits are generated locally using layered HTML Canvas drawing. The renderer combines habitat atmosphere, distant vegetation, body and neck masses, a head silhouette, jaw, eye socket, iris, nostril, texture flecks, wrinkles, family-specific structures, shadows, and a vignette. The blueprint family influences body plan: terrestrial hunters, small agile animals, long-necked and heavy herbivores, armored and plated animals, feathered forms, bird-like forms, flying reptiles, marine reptiles, crocodile-line reptiles, small mammals, amphibians, fish, and invertebrates are represented as different categories rather than all being drawn as the same dinosaur.

The portraits are deterministic for an ID while `VERSION` remains unchanged. They are sophisticated stylized wildlife illustrations, not professionally sculpted photorealistic 3D models. Canvas illustration has real limits: it cannot automatically deliver the subtle anatomical accuracy and physically based material response of a high-end 3D sculpt. The current renderer is a lightweight code-generated alternative that prioritizes distinct silhouettes, atmosphere, and legibility at card size.

## Modify anatomical templates
In `script.js`:
- Edit `blueprints` to adjust categories, habitat pools, and allowed Jurassic epochs.
- Edit `makeTraits`, `makeBehavior`, and `makeSize` to tune fictional field data.
- Edit `palettes` for surface color combinations.
- Modify the family-specific branches inside `drawPortrait()` to change anatomy, appendages, head shapes, scales, feathers, plates, lighting, and composition.
- Change `VERSION` only when you intentionally want a new deterministic generation series. Existing IDs will then render with the new version's configurations.

The geological epoch labels are approximate. This is a fictional creature generator inspired by Jurassic ecosystems, not a scientific species database. The fictional names and profiles must not be treated as documented prehistoric species. Some categories such as fish, amphibians, mammals, flying reptiles, and marine reptiles are explicitly distinguished from dinosaurs.

## Caching and performance
The renderer caches a small number of recently drawn Canvas portraits in memory. When the cache exceeds its limit, the oldest entry is removed; the deterministic profile configuration remains reproducible and can be rendered again. Portraits are drawn once per created card, not continuously every animation frame. The live stream removes old cards to prevent unbounded DOM growth.

The browser's device pixel ratio is capped for the portrait renderer to balance clarity and mobile performance. CSS handles responsive display sizing. If a drawing operation fails, the card shows a simple recovery panel instead of stopping profile generation.

## Current scope and honest limitations
- No posts, comments, likes, followers, messaging, user accounts, or post creation.
- No backend, database, paid image API, or mandatory external assets.
- Profiles are generated on demand; images are not permanently stored as separate files.
- Profile identifiers are unlimited in count in the generator model, while search input has a defensive 10,000-digit limit.
- The portrait renderer is layered procedural illustration, not true 3D and not photorealistic.
- Scientific dates and ecological inspiration are approximate; generated identities are fictional.
