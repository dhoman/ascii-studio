# Uncommon Web repository catalog

Open the running catalog at:
http://localhost:5173/research/uncommon-web/index.html

The self-contained `index.html` also works when opened directly from disk. It makes no external requests until you follow a link. CSV, JSON and the complete written list are linked from the page.

## Deliverables

- `index.html`: searchable/filterable catalog, star sorting, expandable evidence and an editorial ASCII Studio shortlist.
- `catalog.csv`: one row per library; suitable for a spreadsheet. Nested lists are JSON-encoded inside cells.
- `catalog.json`: complete structured data, metadata, notes and source links.
- `catalog.md`: complete written list, grouped by primary family, with numbered sources. Libraries belonging to several families appear once; HTML filters retain every family membership.
- `preview.png`: browser screenshot.
- `site.html`: original directory snapshot, including all 430 cards.
- `repositories.json`, `evidence/`: repository metadata and README evidence; public information only.
- `special-cases.json`, `special-verification.json`: research and independent primary-source checks for registry-only and non-GitHub entries.
- `documentation.json`, `doc-checks.jsonl`: documentation selection and HTTP-check results.
- `sources.json`: local citation ledger.

## Scope and limitations

Snapshot captured 2026-10-22 UTC: 393 library names, 430 demos, 22 families. All counts are checked programmatically. Capabilities are attributed directory descriptions, not promises established by execution. Repository inspection includes landing-page metadata, README and license evidence; this is not a security audit, a full code review, or a benchmark of every project.

Unknown stars are not zero. Shared/parent repository counts are labeled. GitHub, Tangled and Codeberg totals are kept distinct. A repository not being archived does not establish active maintenance. License classifications are not legal advice, and package/asset/Pro-tier licensing may differ from the repository root.

Documentation prefers links belonging to the project and explicitly labeled as documentation; generic browser/npm/contributor docs and dependency documentation must not be substituted. Where dedicated documentation cannot be identified, the repository README is the labeled fallback. Failed HTTP checks remain visible as caveats rather than being concealed.

No ASCII Studio app source, dependencies or configuration were changed. Nothing was committed or pushed.

## Reproduce and verify

Run from the repository root, with Python 3 and curl available:

    python research/uncommon-web/extract.py
    python research/uncommon-web/collect.py
    python research/uncommon-web/enrich.py
    python research/uncommon-web/verify_special.py
    python research/uncommon-web/build_catalog.py
    python research/uncommon-web/test_catalog.py

`collect.py` resumes from the evidence cache. To take a genuinely new snapshot, archive this entire research directory first, retrieve a new site snapshot, and collect into an empty evidence directory; do not silently mix different research dates. The citation builder uses the active ascii-studio profile's installed grounded-citations script.

The app's existing Vite server serves these files; start it with `npm run dev` when it is not already running. As with the main lab, Docker must publish port 5173 for the Mac to reach it.
