# Intelligent Pantry & Expiry Manager (Backend)

Backend-only API for tracking pantry freshness decay and generating a priority cooking list that favors ingredients closest to expiration.

## Implemented Scope

- Pantry item state management with variable shelf-life support.
- Freshness decay calculation (`freshnessScore`, `urgencyScore`, status bands).
- Recipe catalog and `Priority Cooking List` ranking.
- Dietary constraints support (`requiredRecipeTags`, `excludedRecipeTags`, `excludedIngredients`).
- No UI included.

## Core Logic

### Freshness Decay

For each item:

- Expiry date is either explicit (`expiresAt`) or inferred as `addedAt + shelfLifeDays`.
- `freshnessScore = clamp(daysUntilExpiry / totalShelfLifeDays, 0, 1)`.
- Status bands:
  - `fresh`
  - `warning`
  - `critical`
  - `expired`
- `urgencyScore` increases as freshness decays and reaches `1` when expired.

### Priority Cooking List

Recipes are filtered by dietary constraints, then ranked by:

- urgency of matched pantry ingredients,
- ingredient coverage of the recipe,
- boost when a matched ingredient is already expired.

This balances waste reduction with practical recipe usability.

## Engineering Tradeoff

- Algorithm complexity can model decay in detail (storage conditions, opened/unopened states, probabilistic spoilage), but that value depends on user data accuracy.
- This implementation intentionally uses deterministic, explainable scoring to stay robust when user-entered data is incomplete.

## API Endpoints

- `GET /health`
- `POST /pantry/items`
- `GET /pantry/items?asOf=<ISO_DATE>`
- `PATCH /pantry/items/:id`
- `DELETE /pantry/items/:id`
- `POST /recipes`
- `GET /recipes`
- `POST /recipes/priority`

Example request body for `POST /recipes/priority`:

```json
{
  "asOf": "2026-02-17T00:00:00.000Z",
  "limit": 5,
  "constraints": {
    "requiredRecipeTags": ["vegan"],
    "excludedIngredients": ["milk", "egg"]
  }
}
```

## Run

```bash
npm install
npm run dev
```

## Validate

```bash
npm run build
npm test
npm run lint
```