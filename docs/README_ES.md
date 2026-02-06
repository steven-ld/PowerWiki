# Documentación de PowerWiki

<div align="center">

![PowerWiki](https://img.shields.io/badge/PowerWiki-Wiki%20basado%20en%20Git-3370ff?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![Node](https://img.shields.io/badge/Node.js->=14-339933?style=for-the-badge&logo=node.js&logoColor=white)

Un sistema Wiki moderno basado en Git con Markdown, soporte para sincronización automática, resaltado de sintaxis y UI estilo Feishu.

**🔗 Demo en vivo: [https://powerwiki.ga666666.cn](https://powerwiki.ga666666.cn)**

[English](README.md) • [中文](README_ZH.md) • [日本語](docs/README_JA.md) • [한국어](docs/README_KO.md) • [Español](README_ES.md) • [Français](docs/README_FR.md) • [Deutsch](docs/README_DE.md) • [Русский](docs/README_RU.md)

</div>

---

## Selección de idioma

Documentación en otros idiomas：

- [English](README.md)
- [中文](README_ZH.md)
- [日本語](README_JA.md)
- [한국어](README_KO.md)
- [Español](README_ES.md)
- [Français](README_FR.md)
- [Deutsch](README_DE.md)
- [Русский](README_RU.md)

## Características

- **Sincronización Automática** - Obtener y actualizar documentos automáticamente desde repositorios Git
- **Resaltado de Sintaxis** - Resaltado de sintaxis para múltiples lenguajes de programación
- **Diseño Responsivo** - Perfectamente adaptado a todo tipo de pantallas
- **Índice Automático** - Generar índice de contenidos automáticamente
- **Interfaz Moderna** - Diseño de interfaz limpio e intuitivo
- **Soporte PDF** - Renderizar archivos PDF en alta definición
- **Estadísticas de Visitas** - Estadísticas automáticas de visitas a artículos
- **Ligero** - Sin base de datos necesaria
- **SEO Optimizado** - Visibilidad en buscadores completamente optimizada
- **Soporte Frontmatter** - Analizar metadatos YAML
- **Imágenes Locales** - Soporte para referenciar imágenes locales en Markdown
- **Multiidioma** - Soporte para español e inglés
- **Soporte Docker** - Soporte completo de despliegue con Docker

## Inicio Rápido

### Prerrequisitos

- Node.js >= 14.0.0
- Git

### Usar Docker (Recomendado)

```bash
# Clonar el repositorio
git clone https://github.com/steven-ld/PowerWiki.git
cd PowerWiki

# Crear archivo de configuración
cp config.example.json config.json
# Editar config.json con la URL de tu repositorio Git

# Iniciar con Docker Compose
docker-compose up -d
```

### Usar Node.js

```bash
# Clonar el repositorio
git clone https://github.com/steven-ld/PowerWiki.git
cd PowerWiki

# Instalar dependencias
npm install

# Crear archivo de configuración
cp config.example.json config.json
# Editar config.json con la URL de tu repositorio Git

# Iniciar el servidor
npm start
```

Visitar `http://localhost:3150` en tu navegador.

## Configuración

Editar `config.json`：

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

| Opción | Descripción | Por defecto |
|--------|-------------|-------------|
| `gitRepo` | URL del repositorio Git | - |
| `repoBranch` | Nombre de la rama | `main` |
| `mdPath` | Subdirectorio de archivos Markdown | `""` |
| `port` | Puerto del servidor | `3150` |
| `siteTitle` | Título del sitio | `PowerWiki` |
| `siteDescription` | Descripción del sitio | `Wiki` |
| `autoSyncInterval` | Intervalo de sincronización automática (ms) | `180000` |
| `pages.home` | Archivo de página de inicio | `""` |
| `pages.about` | Archivo de página Acerca de | `""` |

## Despliegue con Docker

### Imagen Docker

**[@sayunchuan](https://github.com/sayunchuan)** proporciona una imagen Docker para PowerWiki.

- **Imagen**: `sayunchuan/powerwiki`
- **Docker Hub**: [sayunchuan/powerwiki](https://hub.docker.com/r/sayunchuan/powerwiki)
- **Etiquetas**: `latest`, `1.4.5`, `20260207`

### Inicio rápido

```bash
# Forma más simple
docker run -d -p 3150:3150 sayunchuan/powerwiki

# Con configuración personalizada
docker run -d \
  --name powerwiki \
  -p 3150:3150 \
  -v $(pwd)/config.json:/app/config.json:ro \
  -v powerwiki_data:/app/data \
  -v powerwiki_cache:/app/cache \
  sayunchuan/powerwiki
```

### Despliegue con Docker Compose

```yaml
version: '3.8'
services:
  powerwiki:
    image: sayunchuan/powerwiki:latest
    ports:
      - "3150:3150"
    environment:
      - NODE_ENV=production
      - LANG=es
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
# Iniciar servicios
docker-compose up -d

# Ver registros
docker-compose logs -f

# Detener servicios
docker-compose down
```

**Agradecimiento**: Gracias a [@sayunchuan](https://github.com/sayunchuan) por proporcionar la imagen Docker, haciendo que el despliegue de PowerWiki sea más conveniente.

## Organización de Artículos

PowerWiki soporta una estructura de carpetas jerárquica para organizar artículos：

```
your-wiki-repo/
├── README.md              # Página de inicio
├── ABOUT.md               # Página Acerca de
├── images/                # Imágenes globales (opcional)
├── Architecture/          # Carpeta de categoría
│   ├── images/            # Imágenes de categoría
│   ├── IoT-Device-Standards.md
│   ├── TLS-Encryption.md
│   └── README.md          # Índice de categoría
└── Projects/              # Otra categoría
    ├── images/
    ├── URL-Shortener.md
    └── README.md
```

### Frontmatter del Artículo

Cada artículo puede incluir metadatos YAML frontmatter：

```yaml
---
title: Título del artículo
description: Descripción del artículo para SEO
author: Nombre del autor
date: 2026-01-10
updated: 2026-01-10
keywords: palabra1, palabra2, palabra3
tags: [etiqueta1, etiqueta2]
---
```

## Pila Tecnológica

- **Backend**: Express.js
- **Frontend**: Vanilla JavaScript
- **Git**: simple-git
- **Markdown**: marked + highlight.js
- **PDF**: pdfjs-dist
- **Contenedores**: Docker

## Estructura del Proyecto

```
PowerWiki/
├── src/                     # Código fuente
│   ├── index.js             # Punto de entrada del servidor Express
│   ├── routes/              # Módulos de rutas
│   │   ├── api.js           # Rutas API
│   │   ├── feeds.js         # Rutas RSS/Sitemap
│   │   └── static.js        # Rutas de archivos estáticos
│   ├── config/              # Módulos de configuración
│   │   ├── env.js           # Variables de entorno
│   │   └── i18n.js          # Internacionalización
│   └── utils/               # Módulos de utilidad
│       ├── cacheManager.js  # Gestión de caché
│       ├── gitManager.js    # Operaciones Git
│       └── markdownParser.js# Analizador Markdown
├── locales/                 # Archivos de traducción
├── templates/               # Plantillas HTML
├── public/                  # Activos estáticos
├── config.example.json      # Plantilla de configuración
└── package.json             # Dependencias
```

## Licencia

MIT License - ver [LICENSE](LICENSE) para más detalles.

## Contribuidores

- [@sayunchuan](https://github.com/sayunchuan) - Agregar soporte multilingüe, Mermaid, corregir varios problemas

---

<div align="center">

**Si este proyecto te ayuda, por favor ¡dale una ⭐ Estrella!**

</div>
