# Deadlock API Explorer

Mini application web pour interroger l'API Deadlock via un backend Node.js.

## Fonctionnalites
- Verifier l'etat de l'API (`/v1/info/health`)
- Consulter le leaderboard par region
- Consulter l'historique de matchs d'un joueur (`account_id`)
- Generer un rapport de coaching avec erreurs prioritaires

## Stack
- Backend: Node.js + Express
- Frontend: HTML/CSS/JS (vanilla)

## Prerequis
- Node.js 18+

## Installation
```bash
npm install
```

## Configuration
1. Copier `.env.example` vers `.env`
2. Optionnel: definir `DEADLOCK_API_KEY` pour envoyer la cle API dans `X-API-KEY`

## Lancement
```bash
npm start
```

Puis ouvrir:
`http://localhost:3000`

## Endpoints backend exposes
- `GET /api/health`
- `GET /api/leaderboard?region=Europe&limit=20`
- `GET /api/match-history?accountId=906011648&onlyStored=true`
- `GET /api/coach-report?accountId=906011648&matches=30`

## Rapport coaching (heuristiques)
Le endpoint `/api/coach-report` detecte automatiquement:
- surmortalite
- farm insuffisant
- economie faible
- irregularite de performance
- baisse recente de niveau
- pool de heros trop disperse

Le rapport retourne des recommandations actionnables pour le coach.

## Note API Deadlock
Source communautaire:
- https://api.deadlock-api.com/openapi.json
- https://docs.deadlock-api.com
