# Crawl Lawer — PoC Decrets Bénin

Collecte incrémentale des décrets du Bénin (du plus récent au plus ancien) avec OCR, filtres dynamiques d'exclusion, liste « protégée » anti‑purge, UI d’édition du texte OCR et métriques de fonctionnement. Conçu pour Netlify Functions (limite ~10s) via 3 crons dédiés.

## Aperçu

- Crawl incrémental: nouveaux d’abord, puis rattrapage par années.
- OCR via OCR.space avec découpage intelligent des PDF et fallback multi‑clés.
- Filtres dynamiques:
	- exclude / include: agissent au moment du crawl (pour éviter l’enregistrement).
	- protect: protège de la purge selon tag/catégorie (les documents correspondants ne sont pas supprimés).
- Purge sous budget: base capée à ~0.5 GB, suppression par paquets des plus anciens en excluant les documents protégés et ceux édités par l’utilisateur.
- UI: recherche/pagination, édition du texte OCR, gestion des filtres, métriques/statistiques simples.

## Architecture rapide

- Frontend: Vite + React + React Query + shadcn/ui (`src/`).
- Fonctions Netlify (`netlify/functions/`):
	- `cron-latest` (*/15): traite un petit lot des plus récents.
	- `cron-backfill` (*/15): traite un petit lot d’années récentes (gating: attend plusieurs runs « calmes » de latest avant de démarrer).
	- `cron-purge` (*/15): purge pour rester sous le budget de stockage.
	- APIs UI/observabilité: `documents`, `filters`, `cron-runs`, `crawl-urls`, `overview`.
- Core serveur (`netlify/core/src/services/`): `crawler`, `ocrSpace`, `purge`, `config`, `metrics`.
- Base de données (Prisma + Postgres):
	- `Document` (texte OCR, bytes, year/index, category, userEdited, tag…).
	- `Filter` (type: exclude/include/protect; field: title/text/url/tag/category; mode: contains/startsWith/endsWith/regex; pattern; active).
	- `CrawlUrl` (état du crawl par URL).
	- `NotFoundRange` (compaction des URLs 404 par plages contiguës pour éviter le bloat de lignes).
	- `CronConfig` (paramètres dynamiques des crons; auto‑tuning persisté).
	- `CronRun` (journal des exécutions pour statistiques; rétention: derniers 5 par cron).

## Prérequis

- Node.js 18+ et pnpm/npm.
- PostgreSQL accessible (voir `DATABASE_URL`).
- Netlify CLI pour le dev local (optionnel): `npm i -g netlify-cli`.

## Variables d’environnement

Créer un fichier `.env` à la racine :

```
DATABASE_URL="postgresql://user:password@localhost:5432/crawl_lawer_db?schema=public"
# Clés OCR.space séparées par "," ou ";" (recommandé: plusieurs clés pour gérer les quotas)
OCR_API_KEY="key1,key2"
```

## Démarrage local

1) Installer les dépendances:

```
npm install
```

2) Provisionner le schéma en dev (base vide):

```
npx prisma migrate dev
```

3) Lancer en local (UI + fonctions):

```
npm run dev
```

Par défaut, Netlify Dev expose les fonctions sous `/api/*` via les redirects de `netlify.toml`.

## Déploiement Netlify

- Le build exécute: `npm run build` puis `prisma migrate deploy` (cf. `netlify.toml`).
- Les crons sont définis dans chaque handler via `export const config: { schedule: "*/15 * * * *" }`.
- Fournir `DATABASE_URL` et `OCR_API_KEY` dans les variables d’environnement du site Netlify.

## Endpoints principaux

- Documents
	- `GET /api/documents?query=&year=&page=&pageSize=`: liste paginée filtrable.
	- `PUT /api/documents`: met à jour titre/texte et marque `userEdited = true` pour protéger de la purge.

- Filtres
	- `GET /api/filters`: liste des filtres.
	- `POST /api/filters`: crée un filtre.
		- Body exemple:
			```json
			{ "type": "protect", "field": "category", "mode": "contains", "pattern": "finance", "active": true }
			```
	- `DELETE /api/filters?id=123`: supprime un filtre.

- Statistiques
	- `GET /api/cron-runs?cron=latest|backfill|purge&limit=50&since=7d`: métriques récentes et agrégées.

- Crawl URLs
	- `GET /api/crawl-urls?status=pending|success|error|not_found|excluded&q=&page=&pageSize=`: liste paginée des URLs de crawl, recherche plein‑texte par `q`, avec statut UI dérivé.

- Vue d’ensemble (Dashboard)
	- `GET /api/overview`: statistiques globales (compte de documents, récents, distribution par provider OCR, tendances mois‑sur‑mois) pour alimenter le Dashboard.

## Filtres protégés (anti‑purge)

- Type `protect` appliqué sur `tag` ou `category`.
- Modes: `contains`, `startsWith`, `endsWith`, `regex` (insensible à la casse pour contains/starts/ends; regex en `i`).
- Effet: lors de la purge, les documents dont le tag/catégorie matchent un filtre protect ne sont pas supprimés.
- La purge ne supprime jamais non plus les documents `userEdited = true`.

## Budget de stockage et purge

- Budget par défaut: ~0.5 GB. Réglable via `CronConfig` (fonction `cron-purge`).
- La purge supprime par paquets les documents les plus anciens et s’auto‑règle (nombre de suppressions) selon le niveau de dépassement et la contrainte de 10s.
- Ordre de protection: `userEdited` > `protect(tag/category)` > le reste (plus ancien d’abord).

## Auto‑tuning des crons

- `cron-latest` ajuste la taille de lot `batch` selon la durée et les erreurs du run.
- `cron-backfill` ajuste `batchPerYear` de la même manière et ne s’exécute que lorsque les N derniers runs de `cron-latest` n’ont rien téléchargé ("quiet runs").
- `cron-purge` ajuste `maxDeletesPerRun` selon l’usage (`before / maxBytes`).
- Les paramètres sont persistés dans `CronConfig` et consultés au run suivant.

### Rétention des métriques

- Chaque cron conserve uniquement les 5 derniers `CronRun` (pruning automatique après log) pour limiter la croissance.

### Compaction des 404 (NotFoundRange)

- Après les runs `cron-latest` et `cron-backfill`, les URLs en statut `not_found` sont regroupées en plages contiguës par année dans `NotFoundRange` puis supprimées de `CrawlUrl`.
- Effet: réduction drastique du nombre de lignes « 404 » tout en conservant l’information de gaps; le crawler saute désormais proactivement ces plages (aucune requête HEAD/GET effectuée sur ces indices, `stats.skipped` incrémenté, `gapLimit` respecté).

## Notes migrations (squash)

- L’historique a été simplifié: toutes les migrations à partir de `20251027003858_add_filters_and_doc_category` ont été rassemblées en un seul changeset `squash_after_20251027003858`.
- En dev local, si votre base avait l’ancien historique, exécutez:
	- `npx prisma migrate reset` (ATTENTION: supprime les données locales) puis `npx prisma migrate dev`.
- En prod: ne pas faire de reset. Utiliser `prisma migrate deploy` avec prudence et sur une base alignée.

Note: Un changement ultérieur a introduit `NotFoundRange`; assurez‑vous d’avoir appliqué les dernières migrations (`prisma migrate deploy`).

## Limitations & bonnes pratiques

- Netlify Functions: viser des lots modestes (<10s) ; l’auto‑tuning aide à rester dans la fenêtre.
- OCR.space: respect des quotas; fournissez plusieurs clés via `OCR_API_KEY`.
- Fiabilité du crawl: le crawler saute d’abord les plages `NotFoundRange` connues; sinon, il essaie un `HEAD` puis confirme avec `GET` si besoin; tolère les 405.

## Scripts utiles

- `npm run dev` — Dev local (Netlify + Vite).
- `npm run build` — Build UI + Prisma generate.
- `npm run preview` — Prévisualisation Vite.
- `npm run lint` — Lint.

## UI et statuts

- Pages principales:
	- Dashboard: tendances, récents, distribution des providers (via `/api/overview`).
	- Documents: liste, recherche, édition OCR (marque `userEdited=true`).
	- Crawl URLs: liste paginée avec recherche `q` et filtres de statut.
	- Filtres: gestion des `exclude`/`include`/`protect`.
- Statuts alignés backend: `pending`, `success`, `error`, `not_found`, `excluded`.

## Licence

Usage interne PoC. Adapter selon les besoins du projet.

