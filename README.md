# Deadlock API Explorer

Application web frontend-first pour interroger l'API Deadlock. Fonctionne sur GitHub Pages sans backend, avec un backend Node.js optionnel pour un usage local avancé.

## Fonctionnalités
- Vérifier l'état de l'API Deadlock
- Consulter le leaderboard par région
- Rechercher des joueurs par pseudo
- Consulter l'historique de matchs d'un joueur
- Générer un rapport de coaching avec analyse de performance (côté client)

## Stack
- Frontend: HTML/CSS/JS (vanilla)
- API: Deadlock API (https://api.deadlock-api.com)
- Déploiement: GitHub Pages

## Déploiement GitHub Pages

L'application fonctionne directement sur GitHub Pages :
1. Push vers GitHub
2. Activer GitHub Pages dans Settings > Pages
3. Accéder à l'URL GitHub Pages

## Utilisation locale

Pour tester en local :

```bash
npm install

# Mode par défaut (frontend-only, cohérent avec GitHub Pages)
npm start

# Mode optionnel avec backend proxy/API key
npm run start:backend
```

Puis ouvrir: `http://localhost:3000`

## Backend Node.js (optionnel)

Un backend Node.js est fourni dans le dossier `backend/` mais reste **optionnel**.
Toutes les fonctionnalités principales fonctionnent directement en appelant l'API Deadlock depuis le frontend.

Le backend peut être activé uniquement si nécessaire (`npm run start:backend`) pour :
- Proxyfier les appels API
- Ajouter une API key côté serveur
- Gérer des besoins de cache/contrôle serveur en local

## Endpoints utilisés (API Deadlock)
- `GET /v1/info/health` - Santé de l'API
- `GET /v1/leaderboard/:region` - Leaderboard
- `GET /v1/players/search?name=...` - Recherche joueur
- `GET /v1/players/:id` - Info joueur
- `GET /v1/players/:id/match-history` - Historique matchs
- `GET /v1/players/:id/mmr-history` - Historique MMR
- `GET /v1/matches/:id/metadata` - Détails match

## Rapport coaching (analyse côté client)

Le rapport de coaching analyse automatiquement :
- Surmortalité
- Farm insuffisant
- Économie faible
- Irrégularité de performance
- Baisse récente de niveau
- Pool de héros trop dispersé

L'analyse est effectuée **entièrement côté client** en JavaScript.

## Note API Deadlock

Source communautaire:
- https://api.deadlock-api.com/openapi.json
- https://docs.deadlock-api.com
