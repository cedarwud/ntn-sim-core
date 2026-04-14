# Fixture Rules

`fixtures/sample-bundle-v1/` is a consumer-side mirror of:

`/home/u24/papers/modqn-paper-reproduction/tests/fixtures/sample-bundle-v1/`

Do not hand-edit the mirrored files in `sample-bundle-v1/`. Refresh and verify
them only through:

- `npm run sync:modqn:fixture`
- `npm run validate:modqn:fixture-sync`

The only consumer-owned support file inside that mirror is
`evaluation/sweeps/.gitkeep`, which exists so git keeps the empty directory.

`fixtures/modqn-bundle-sample/` is different: it is the hand-crafted minimal
consumer fixture used for adapter strictness and backward-compat coverage. Its
checked-in `manifest.json` intentionally keeps the legacy string-form
`checkpointRule` so the on-disk fixture still exercises that compatibility
surface.
