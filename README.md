# Streeterville Apartments

A static webpage to compare apartments near **Feinberg School of Medicine** (303 E Chicago Ave, Chicago, IL 60611). All data scraped directly from each property's official website on **2026-05-11** — no Apartments.com / Zillow / Zumper third-party data (those snapshots are often weeks to months stale).

## What's in here

- **`index.html` / `style.css` / `app.js`** — A single-page, client-only app with:
  - **Map view** (Leaflet + OpenStreetMap) — every building pinned, Feinberg starred, walking-rectangle outlined
  - **Unit table** — 130 rows (specific units + plan-level entries), sortable by rent / walk / sqft / availability
  - **Filters** — bedrooms, max rent, max walk time, "Available Now" only, hide buildings without scraped data
  - **Building cards view** — alternative layout grouping by property
- **`data/apartments.json`** — 33 buildings (lat/lng, walk distance, Google rating, official URLs)
- **`data/units.json`** — 130 units / plans with rent, sqft, beds/baths, availability date
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
- 11 properties whose floor-plan pages are behind iframe widgets (Yardi prospectportal, Knock, Sightmap, etc.) are listed in the app as "Not scraped" — toggle the filter to show them.

## Data formats per building

| Format | Description | Count |
|---|---|---|
| `unit-level` | Specific apartment #, floor, current price, availability date | 4 |
| `plan-level` | Floor plan templates + starting price (and sometimes "X units left") | 13 |
| `floor-summary` | Per-floor availability count + one featured priced unit | 3 |
| `featured-only` | 4-6 hand-picked sample units | 2 |
| `partial` / `starting-only` / `category-only` / `highlight` | One-unit-per-page, starting prices only, or category overview | 6 |
| `skipped` | Could not extract — see notes per building | 11 |

## Run locally

```bash
# Any static server works:
python3 -m http.server 8000
# Then open http://localhost:8000
```

## Deploy to GitHub Pages

1. Create a new GitHub repo (e.g. `streeterville-apartments`)
2. Push these files:
   ```bash
   cd streeterville-apartments
   git init
   git add .
   git commit -m "Initial scrape — 2026-05-11"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/streeterville-apartments.git
   git push -u origin main
   ```
3. In repo settings → **Pages** → set source to `main` branch, `/` (root)
4. After ~1 minute, your site is live at `https://YOUR_USERNAME.github.io/streeterville-apartments/`

## How the data was collected

A semi-manual scrape using a Chrome browser session: navigate to each building's floor-plans page, extract the rendered DOM text, parse with regex / by hand. Sites using iframe-embedded widgets (Yardi RentCafe prospectportal, Knock doorway, Sightmap, etc.) could not be extracted via DOM text — those are listed in the `skipped` set.

For each property the scraper attempted, in order:
1. `<domain>/floor-plans/` or `<domain>/floorplans/`
2. `<domain>/availability/` or `<domain>/apartments/`
3. Navigation link from homepage
4. Mark as skipped if all of the above fail

To refresh data: you'd need to re-run the same browser session against each building. A future enhancement could automate this with Playwright; the existing widgets (Yardi/Knock/Sightmap) would still need bespoke handling per platform.

## License

Data is sourced from each property's public website. Code is MIT.

## Disclaimers

- **Prices change daily**, sometimes hourly. Always confirm with the leasing office before signing.
- "**Total Monthly Leasing Price**" disclaimed by Aston, State and Grand, 640 N Wells, Windsor properties includes mandatory utility packages / admin fees — typically $175–$500/month above the base rent shown.
- Related Rentals properties (One Bennett Park, 500 LSD) have a "Website Offer" promo limited to new residents, select lease terms, market-rate units only.
- Google ratings shown were captured in May 2026; verify on Google Maps before relying on them.
