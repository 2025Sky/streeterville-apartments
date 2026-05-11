# Streeterville Apartments

**Live: https://2025sky.github.io/streeterville-apartments/**

A static webpage to compare apartments near **Feinberg School of Medicine** (303 E Chicago Ave, Chicago, IL 60611). All data scraped directly from each property's official website on **2026-05-11** — no Apartments.com / Zillow / Zumper third-party data (those snapshots are often weeks to months stale).

## What's in here

- **`index.html` / `style.css` / `app.js`** — A single-page, client-only app with:
  - **Map view** (Leaflet + OpenStreetMap) — every building pinned, Feinberg starred, walking-rectangle outlined
  - **Unit table** — 287 rows (specific units + plan-level entries), sortable by rent / walk / sqft / availability
  - **Filters** — bedrooms, max rent, max walk time, "Available Now" only, hide buildings without scraped data
  - **Building cards view** — alternative layout grouping by property
  - **Manual check view** — auto-appears only when some buildings can't be scraped, listing click-through links for human review
- **`data/apartments.json`** — 33 buildings (lat/lng, walk distance, Google rating, official URLs)
- **`data/units.json`** — 287 units / plans with rent, sqft, beds/baths, availability date
- **`data/meta.json`** — target address + rectangle bounds

## The rectangle

```
North: 41.899339   ← Walton-ish
South: 41.889096   ← Grand-ish
West:  -87.636100  ← Wells-ish
East:  -87.613490  ← Lake Shore-ish
```

Roughly 0.7 mi × 1.2 mi — everything inside is ≤ 20 min walk to Feinberg.

## What's excluded

- **Condo-only buildings** (no unified rental management): The Grand Ohio (211 E Ohio)
- **> 20 min walk**: 220 WIL, Hubbard221

All 33 buildings inside the rectangle were successfully scraped on 2026-05-11, including the widget-portal properties (Yardi RentCafe, Knock, Sightmap, Group Fox, Windsor) that initially blocked extraction.

## Data formats per building

| Format | Description | Count |
|---|---|---|
| `unit-level` | Specific apartment #, floor, current price, availability date | 6 |
| `plan-level` | Floor plan templates + starting price (sometimes with "X units left") | 18 |
| `floor-summary` | Per-floor availability count + one featured priced unit | 3 |
| `featured-only` / `1-unit sample` | 1–6 hand-picked sample units | 4 |
| `starting-only` / `category-only` | Starting prices only, or category overview | 2 |

## Run locally

```bash
# Any static server works:
python3 -m http.server 8000
# Then open http://localhost:8000
```

## Deploy

Already live at https://2025sky.github.io/streeterville-apartments/ on GitHub Pages (`main` branch, `/` root). After updating any file:

```bash
git add . && git commit -m "Refresh data" && git push
```

Pages rebuilds automatically in ~30 seconds.

## How the data was collected

A semi-manual scrape using a Chrome browser session: navigate to each building's floor-plans page, extract the rendered DOM text, parse with regex / by hand. Widget-portal listings (Yardi RentCafe prospectportal, Knock doorway, Sightmap, Group Fox, Windsor) needed a second pass with deeper DOM and network inspection to extract.

For each property the scraper attempted, in order:
1. `<domain>/floor-plans/` or `<domain>/floorplans/`
2. `<domain>/availability/` or `<domain>/apartments/`
3. Navigation link from homepage
4. Widget iframe content + XHR responses (for portals that proxy through a third party)

If a future re-scrape fails on any building, it will show up automatically in the app's **Manual check** tab with a click-through link to the official site — no UI changes needed.

## License

Data is sourced from each property's public website. Code is MIT.

## Disclaimers

- **Prices change daily**, sometimes hourly. Always confirm with the leasing office before signing.
- "**Total Monthly Leasing Price**" disclaimed by Aston, State and Grand, 640 N Wells, Windsor properties includes mandatory utility packages / admin fees — typically $175–$500/month above the base rent shown.
- Related Rentals properties (One Bennett Park, 500 LSD) have a "Website Offer" promo limited to new residents, select lease terms, market-rate units only.
- Google ratings shown were captured in May 2026; verify on Google Maps before relying on them.
