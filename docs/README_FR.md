# Documentation PowerWiki

<div align="center">

<img src="../assets/powerwiki-logo.svg" alt="PowerWiki" width="360" />
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![Node](https://img.shields.io/badge/Node.js->=14-339933?style=for-the-badge&logo=node.js&logoColor=white)

Un système Wiki moderne basé sur Git avec Markdown, support de la synchronisation automatique, coloration syntaxique et interface style Feishu.

**🔗 Démo en direct: [https://powerwiki.ga666666.cn](https://powerwiki.ga666666.cn)**

[English](README.md) • [中文](README_ZH.md) • [日本語](docs/README_JA.md) • [한국어](docs/README_KO.md) • [Español](docs/README_ES.md) • [Français](README_FR.md) • [Deutsch](docs/README_DE.md) • [Русский](docs/README_RU.md)

</div>

---

## Sélection de la langue

Documentation dans d'autres langues：

- [English](README.md)
- [中文](README_ZH.md)
- [日本語](README_JA.md)
- [한국어](README_KO.md)
- [Español](README_ES.md)
- [Français](README_FR.md)
- [Deutsch](README_DE.md)
- [Русский](README_RU.md)

## Fonctionnalités

- **Synchronisation Automatique** - Récupérer et mettre à jour les documents automatiquement depuis les dépôts Git
- **Coloration Syntaxique** - Coloration syntaxique pour plusieurs langages de programmation
- **Design Responsive** - Parfaitement adapté à tous les écrans
- **Table des Matières Auto** - Générer automatiquement la table des matières
- **Interface Moderne** - Conception d'interface épurée et intuitive
- **Support PDF** - Rendre les fichiers PDF en haute définition
- **Statistiques de Visites** - Statistiques automatiques des vues d'articles
- **Léger** - Aucune base de données requise
- **SEO Optimisé** - Visibilité dans les moteurs de recherche entièrement optimisée
- **Support Frontmatter** - Analyser les métadonnées YAML
- **Images Locales** - Support pour référencer des images locales dans Markdown
- **Articles HTML** - Les fichiers HTML du dépôt deviennent des articles, avec un mode sandbox pour les pages interactives complètes
- **Multi-langues** - Support pour le français et l'anglais
- **Support Docker** - Support complet du déploiement Docker

## Démarrage rapide

### Prérequis

- Node.js >= 14.0.0
- Git

### Utiliser Docker (Recommandé)

```bash
# Cloner le dépôt
git clone https://github.com/steven-ld/PowerWiki.git
cd PowerWiki

# Créer le fichier de configuration
cp config.example.json config.json
# Éditer config.json avec l'URL de votre dépôt Git

# Démarrer avec Docker Compose
docker-compose up -d
```

### Utiliser Node.js

```bash
# Cloner le dépôt
git clone https://github.com/steven-ld/PowerWiki.git
cd PowerWiki

# Installer les dépendances
npm install

# Créer le fichier de configuration
cp config.example.json config.json
# Éditer config.json avec l'URL de votre dépôt Git

# Démarrer le serveur
npm start
```

Visitez `http://localhost:3150` dans votre navigateur.

## Configuration

Éditer `config.json`：

```json
{
  "gitRepo": "https://github.com/your-username/your-wiki-repo.git",
  "repoBranch": "main",
  "port": 3150,
  "siteTitle": "My Wiki",
  "siteDescription": "Knowledge Base",
  "autoSyncInterval": 180000,
  "html": {
    "enabled": true,
    "sanitize": true
  },
  "pages": {
    "home": "README.md",
    "about": "ABOUT.md",
    "notFound": "404.html"
  }
}
```

| Option | Description | Par défaut |
|--------|-------------|------------|
| `gitRepo` | URL du dépôt Git | - |
| `repoBranch` | Nom de la branche | `main` |
| `mdPath` | Sous-répertoire des fichiers Markdown | `""` |
| `port` | Port du serveur | `3150` |
| `siteTitle` | Titre du site | `PowerWiki` |
| `siteDescription` | Description du site | `Wiki` |
| `autoSyncInterval` | Intervalle de sync automatique (ms) | `180000` |
| `sortOrder` | Ordre de tri (`modified` ou `name`) | `modified` |
| `pages.home` | Fichier de la page d'accueil | `""` |
| `pages.about` | Fichier de la page À propos | `""` |
| `pages.notFound` | Page 404 personnalisée (`.html` ou `.md`) | page intégrée |
| `html.enabled` | Inclure les fichiers HTML comme articles | `true` |
| `html.sanitize` | Assainir le corps de l'article via une liste blanche | `true` |

## Déploiement Docker

### Image Docker

**[@sayunchuan](https://github.com/sayunchuan)** fournit une image Docker pour PowerWiki.

- **Image**: `sayunchuan/powerwiki`
- **Docker Hub**: [sayunchuan/powerwiki](https://hub.docker.com/r/sayunchuan/powerwiki)
- **Tags**: `latest`, `1.4.5`, `20260207`

### Démarrage rapide

```bash
# Méthode la plus simple
docker run -d -p 3150:3150 sayunchuan/powerwiki

# Avec configuration personnalisée
docker run -d \
  --name powerwiki \
  -p 3150:3150 \
  -v $(pwd)/config.json:/app/config.json:ro \
  -v powerwiki_data:/app/data \
  -v powerwiki_cache:/app/cache \
  sayunchuan/powerwiki
```

### Déploiement avec Docker Compose

```yaml
version: '3.8'
services:
  powerwiki:
    image: sayunchuan/powerwiki:latest
    ports:
      - "3150:3150"
    environment:
      - NODE_ENV=production
      - LANG=fr
    volumes:
      - ./config.json:/app/config.json:ro
      - powerwiki_data:/app/data
      - powerwiki_cache:/app/cache
    restart: unless-stopped

volumes:
  powerwiki_data:
  powerwiki_cache:
```

```bash
# Démarrer les services
docker-compose up -d

# Voir les logs
docker-compose logs -f

# Arrêter les services
docker-compose down
```

**Remerciements**: Merci à [@sayunchuan](https://github.com/sayunchuan) pour avoir fourni l'image Docker, rendant le déploiement de PowerWiki plus pratique.

## Organisation des Articles

PowerWiki supporte une structure de dossiers hiérarchique pour organiser les articles：

```
your-wiki-repo/
├── README.md              # Page d'accueil
├── ABOUT.md               # Page À propos
├── images/                # Images globales (optionnel)
├── Architecture/          # Dossier de catégorie
│   ├── images/            # Images de catégorie
│   ├── IoT-Device-Standards.md
│   ├── TLS-Encryption.md
│   └── README.md          # Index de catégorie
└── Projects/              # Une autre catégorie
    ├── images/
    ├── URL-Shortener.md
    └── README.md
```

### Frontmatter de l'Article

Chaque article peut inclure des métadonnées YAML frontmatter：

```yaml
---
title: Titre de l'article
description: Description de l'article pour SEO
author: Nom de l'auteur
date: 2026-01-10
updated: 2026-01-10
keywords: mot1, mot2, mot3
tags: [tag1, tag2]
---
```

## Articles HTML

Les fichiers HTML sont traités comme des articles Markdown : ils apparaissent dans la barre latérale, sont servis sous `/post/<chemin du dépôt>` et utilisent la même vue de lecture (sommaire, copie, vue brute, lien de partage et SEO). Les anciennes adresses comme `/docs/page` ou `/docs/page.html` redirigent en 301 vers `/post/docs/page.html`. Seul le `<body>` est rendu ; `<title>` et `<meta name="description|keywords">` fournissent les métadonnées. `pages.home` peut aussi pointer vers un fichier `.html`.

![Fichier HTML affiché comme article PowerWiki avec sommaire et outils de lecture](../assets/screenshots/html-article-plain.jpg)

Le corps est assaini par défaut : `<script>`, `<style>`, `<iframe>`, formulaires, gestionnaires d'événements en ligne et attributs `style` sont retirés, les URL `javascript:` supprimées. Les adresses relatives sont réécrites côté serveur : images vers `/api/image/...`, liens vers d'autres fichiers HTML/Markdown/PDF vers `/post/...`, autres ressources résolues depuis le répertoire de la page. N'utilisez `html.sanitize: false` que pour du contenu totalement fiable.

### Pages HTML complètes (mode sandbox)

Les pages interactives activent le mode sandbox dans le `<head>` :

```html
<meta name="powerwiki-render" content="sandbox">
```

La page est alors intégrée sans assainissement dans un `iframe` : scripts, formulaires, popups, téléchargements et navigation supérieure déclenchée par l'utilisateur sont autorisés, `allow-same-origin` ne l'est pas. La page s'exécute dans une origine opaque et ne peut lire ni les cookies, ni le localStorage, ni les API same-origin du Wiki. La page originale est aussi disponible sous `/full/<chemin du dépôt>` avec `Content-Security-Policy: sandbox ...` ; cette route ne sert que du HTML et des ressources statiques et refuse le traversal, les segments cachés, les liens symboliques et les fichiers de plus de 50 Mo.

![Tableau de bord HTML interactif ouvert en lecture immersive dans PowerWiki](../assets/screenshots/html-article.jpg)

### Lecture immersive

Les pages sandbox et une page d'accueil HTML s'ouvrent directement en mode immersif : la zone de lecture remplit le viewport, `Esc` ou le bouton en haut à droite revient à la vue normale, et l'`iframe` n'est pas rechargé. Le serveur fournit l'état immersif dès la première frame, donc aucun saut de largeur au chargement. La hauteur suit le contenu signalé (240–20000px), afin qu'aucune seconde barre de défilement n'apparaisse hors mode immersif. Les articles HTML ordinaires, sans meta sandbox, n'ont pas d'`iframe` : ils défilent comme une page normale et leur bouton **Plein écran** ouvre `/full/...` dans un nouvel onglet.

Le cadre de l'article envoie aux pages sandbox `{ type: 'powerwiki:context', version: 1, theme, lang }` au chargement et à chaque changement de thème ; une page peut le demander avec `parent.postMessage({ type: 'powerwiki:request-context' }, '*')`.

## Pile Technologique

- **Backend**: Express.js
- **Frontend**: Vanilla JavaScript
- **Git**: simple-git
- **Markdown**: marked + highlight.js
- **PDF**: pdfjs-dist
- **Conteneurisation**: Docker

## Structure du Projet

```
PowerWiki/
├── src/                     # Code source
│   ├── index.js             # Point d'entrée du serveur Express
│   ├── routes/              # Modules de routes
│   │   ├── api.js           # Routes API
│   │   ├── feeds.js         # Routes RSS/Sitemap
│   │   └── static.js        # Routes de fichiers statiques
│   ├── config/              # Modules de configuration
│   │   ├── env.js           # Variables d'environnement
│   │   └── i18n.js          # Internationalisation
│   └── utils/               # Modules utilitaires
│       ├── cacheManager.js  # Gestion du cache
│       ├── gitManager.js    # Opérations Git
│       └── markdownParser.js# Analyseur Markdown
├── locales/                 # Fichiers de traduction
├── templates/               # Modèles HTML
├── public/                  # Actifs statiques
│   ├── index.html          # HTML Frontend
│   ├── app.js             # Point d'entrée principal (modulaire)
│   ├── js/                # Modules JavaScript
│   │   ├── theme.js       # Gestion des thèmes
│   │   ├── i18n.js        # Internationalisation
│   │   ├── cache.js       # Cache client
│   │   ├── utils.js       # Utilitaires
│   │   ├── posts.js       # Liste des articles & arborescence
│   │   ├── article.js     # Rendu des articles
│   │   ├── toc.js         # Génération de la table des matières
│   │   └── media.js       # Copie de code, visionneuse d'images, PDF
│   └── css/               # Modules CSS
│       ├── base.css       # Styles de base & variables
│       ├── layout.css     # Mise en page
│       ├── sidebar.css    # Menu de navigation
│       ├── article.css    # Articles & Markdown
│       ├── toc.css        # Barre de table des matières droite
│       ├── media.css      # Design réactif
│       └── components.css # Composants UI
├── config.example.json      # Modèle de configuration
└── package.json             # Dépendances
```

## Licence

MIT License - voir [LICENSE](LICENSE) pour plus de détails.

## Contributeurs

- [@sayunchuan](https://github.com/sayunchuan) - Ajout support multilingue, Mermaid, correction de divers problèmes

---

<div align="center">

**Si ce projet vous aide, merci de donner une ⭐ Étoile !**

</div>
