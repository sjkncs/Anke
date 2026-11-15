# ANKE website comparison

## Usage scenario cards — 2026-11-14

The homepage presents three product usage scenarios for teacher housing selection,
family needs and housing research. The former simulated testimonials and their
labels were replaced with product descriptions, without quotes or user claims.
These cards are not survey observations, training records or evidence of product
effectiveness. Run `node verify-experiences.cjs` for desktop, tablet and
mobile checks; screenshots are saved as `previews/experiences-*.png`.

## Brand principles — 2026-11-14

`brand.js` shares the motto, personal-safety principles and Song's product
position across the five local pages. Product-level constitutional guidance
is explicitly distinguished from model training and evaluated safety. The
corresponding Bot guidance is documented in `local.pi-bot/BRAND_PRINCIPLES.md`.
No remote publication or model training is implied by this local update.

## Product homepage refresh — 2026-11-14

The current `index.html` uses `home.css`, `home.js`, `product.css` and
`product.js`. It includes real Agent/Bot captures, 22 searchable capabilities,
the seven housing stages, a narrated 4:14 video with subtitles, a six-step
`guide.html`, development progress and the Anke release link. Previous homepage
files are retained under `previews/design-backup-20261114-*`.

Run `node serve.cjs` and open `http://127.0.0.1:47845/`. The local server supports
video byte ranges. This is a local preview, not a public deployment. The request
worktree `_workspace/design-review-20261114` contains browser checks, independent
model review and an itemized gap matrix. External service entry cards do not
establish a working account, payment, delivery, email, device or cloud connection.

The older comparison variants and their verification notes below are retained
as history; they do not describe the refreshed homepage.

Local, dependency-free website design previews, not a deployed production site.

- `index.html`: complete ANKE landing page with eight illustrated capability cards, category filters, accessible detail dialogs and three expandable workflow examples. `home.css` and `home.js` are local assets without third-party dependencies. Illustrations are original SVG design examples, not empirical data or app screenshots. Housing links open the existing loopback service on port 47831; other capability cards explain the local configuration boundary rather than pretending to run a service.
- `warm.html`: original warm gray-white direction. The supplied Niulai URL returned a missing-link notice on 2026-11-13, so this is NOT a pixel-identical reproduction.
- `monitor.html`: original ANKE implementation following World Monitor's hero, dashboard preview, capability groups, evidence paths and responsibility content hierarchy. Browser access timed out; readable official page content was inspected. Exact visual parity is NOT verified.
- `site.js`: local interactive scenarios only. No account access, API consumption, purchases, registration or fabricated live metrics.

Reference: https://www.worldmonitor.app/ (accessed 2026-11-13); upstream license https://github.com/koala73/worldmonitor/blob/main/LICENSE (AGPL-3.0). No upstream code, logo, photographs, metrics or testimonials are copied. The CSS illustration and diagram are original, not actual housing geography.

Open `index.html` directly in a browser. All navigation is relative and works offline. `node verify.cjs` checks both pages at desktop and mobile sizes using the existing local Playwright installation and saves preview screenshots under `previews/`.

## Residential research workspace

## Shared Niulai light palette

The running `/workspace/` uses the housing plugin renderer, not the standalone research HTML. `niulai-theme.css` is the palette source; run `node sync-niulai-theme.cjs` to synchronize its marked tail into the website, research, housing monitor/assets and plugin presentation styles. Existing allowlisted CSS routes read these files per request, so this palette change requires a browser reload, not a service restart. Previous files are retained under `previews/palette-backup`. Map and segmentation data colors retain their semantic roles.

`node analyze-niulai.cjs` decodes every video frame and writes coverage/change evidence; visual state review is recorded in `previews/NIULAI-PALETTE-REVIEW.md`. `node verify-live-palette.cjs` checks the running workspace's personal/enterprise/government tabs and monitor/assets at desktop/mobile sizes, using read-only navigation. Website validation remains `node verify.cjs` and `node verify-research.cjs`.

`research.html` adds rental distribution/quantile charts, source and period filters, keyboard/pointer readout, zoom, strict repeated-listing comparisons, CSV export, local segmentation-mask inspection, and annotated-review coordinate mapping. `ink.css`/`ink.js` add slow ink-like homepage motion with pause and reduced-motion support. The supplied 74.86-second reference video was sampled locally to inspect its dashboard/detail interaction, rather than treating a landing-page screenshot as complete interaction evidence.

Run `node build-research-data.cjs` to refresh the minimized public-listing snapshot from the existing rental plugin. This is a frozen local snapshot, not live collection. The generated snapshot has 1,649 imported observations; the default whole-unit listing filter has 1,608 valid observations. Do not infer a city index or long historical coverage from these records. Paired comparisons require identical source/id/type/lease/area and exactly one record per date; absent stable ids and duplicate/conflicting observations are excluded. Source-field and credential payloads are not copied into the snapshot.

Image inspection requires a supplied original and equal-sized color mask. It counts exact RGB classes, rejects invalid/mismatched inputs, and reports unclassified pixels. No segmentation-model inference, georeferenced area computation, or quality score is performed. Review JSON requires explicit source, text, sentiment, and allowed taxonomy labels. Coordinates must declare their CRS; multiple coordinate systems are not overlaid. Multi-label counts are not disjoint. Image URLs are evidence links only; no embedding model, causal inference, sentiment inference, or cross-modal matching has been run.

`node verify-research.cjs` checks desktop/mobile layout, quantile arithmetic, duplicate exclusion in paired comparisons, a synthetic 50-percent vegetation mask, review filters/detail links, coordinate clearing, and invalid imports. `node verify.cjs` checks the main and alternate landing pages. These checks verify the local interface and calculations, not model quality or external-source completeness. Nothing has been published or uploaded.

App branding: sidebar home link and Bot header display ANKE. Existing navigation, sizing and identity configuration remain unchanged. Backups are in `../backups/anke-wordmark-20261113`. The source checkout has an unborn Git HEAD, so a history-based worktree could not be created. No commit, push or publication was performed.
