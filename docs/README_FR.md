# Documentation PowerWiki

<div align="center">

![PowerWiki](https://img.shields.io/badge/PowerWiki-Wiki%20bas%C3%A9%20sur%20Git-3370ff?style=for-the-badge)
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
  "pages": {
    "home": "README.md",
    "about": "ABOUT.md"
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
| `pages.home` | Fichier de la page d'accueil | `""` |
| `pages.about` | Fichier de la page À propos | `""` |

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
