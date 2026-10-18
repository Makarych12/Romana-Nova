# Photo enrichment

Run `python scripts/expand-photos.py --vocabulary public/data/<current-vocabulary>.json --workers 3`.
Dependencies: Python, requests, Pillow. Responses are cached in `/tmp/romana-photo-cache`; downloaded local WebP assets and the enrichment manifest are reusable.

The pipeline preserves all existing photos and IDs. It considers nouns, resolves exact Romanian and Russian labels or aliases in the same Wikidata entity, requires an unambiguous entity and its P18 image, and checks each Commons file's current imageinfo metadata. It accepts JPEG photos with attributable public-domain, CC0, CC BY, or CC BY-SA metadata; it rejects SVG/PNG, small sources, and filenames/descriptions suggesting drawings, logos, maps or diagrams. Files are downloaded, decoded, resized within 800 × 800 px and stored as WebP. Identical Commons files cannot illustrate different new cards.

`src/data/photo-enrichment.json` contains card IDs, local images, individual source URLs, license URLs, author attribution and review evidence. `photoReview.status: automated-bilingual-match` means machine verified identity and licensing, **not human visual approval**. Contact sheets under `artifacts/photo-review` support visual review; only cards actually reviewed should receive `photoReview.visuallyReviewed: true`. The reviewer can reject unsuitable photos by removing their manifest entries and local files. Persist exclusions separately if rerunning the collector.

`src/data/photo-review-pending.json` records rejected candidates and reasons. No rejected candidates are linked to cards. `src/data/photo-enrichment-stats.json` reports the actual accepted count, bytes and rejection reasons. Wikipedia API (`--method wikipedia`) is an alternative entity index; it still requires exact bilingual Wikidata labels/aliases and the same file checks.

An entity's P18 or JPEG format alone does not prove that a picture is a photograph. Filename/description rejection is only a first screen; inspect the contact sheets before claiming every accepted image is visually checked. A match to a label establishes subject identity, not that the framing is optimal for a beginner's flashcard.
