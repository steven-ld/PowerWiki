# Documentación de PowerWiki

<div align="center">

<img src="../assets/powerwiki-logo.svg" alt="PowerWiki" width="360" />
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
- **Artículos HTML** - Archivos HTML del repositorio como artículos, con modo sandbox para páginas interactivas completas
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

| Opción | Descripción | Por defecto |
|--------|-------------|-------------|
| `gitRepo` | URL del repositorio Git | - |
| `repoBranch` | Nombre de la rama | `main` |
| `mdPath` | Subdirectorio de archivos Markdown | `""` |
| `port` | Puerto del servidor | `3150` |
| `siteTitle` | Título del sitio | `PowerWiki` |
| `siteDescription` | Descripción del sitio | `Wiki` |
| `autoSyncInterval` | Intervalo de sincronización automática (ms) | `180000` |
| `sortOrder` | Orden de clasificación (`modified` o `name`) | `modified` |
| `pages.home` | Archivo de página de inicio | `""` |
| `pages.about` | Archivo de página Acerca de | `""` |
| `pages.notFound` | Página 404 personalizada (`.html` o `.md`) | página integrada |
| `html.enabled` | Incluir archivos HTML como artículos | `true` |
| `html.sanitize` | Sanitizar el cuerpo del artículo con una lista blanca | `true` |

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

## Artículos HTML

Los archivos HTML se tratan como artículos Markdown: aparecen en la barra lateral, se sirven en `/post/<ruta del repositorio>` y usan la misma vista de lectura (índice, copiar, vista sin formato, enlace para compartir y SEO). Las direcciones antiguas como `/docs/page` o `/docs/page.html` redirigen con 301 a `/post/docs/page.html`. Solo se renderiza el `<body>`; `<title>` y `<meta name="description|keywords">` aportan los metadatos del artículo. `pages.home` también puede apuntar a un archivo `.html`.

![Archivo HTML mostrado como artículo de PowerWiki con índice y herramientas de lectura](../assets/screenshots/html-article-plain.jpg)

El cuerpo se sanitiza por defecto: se eliminan `<script>`, `<style>`, `<iframe>`, formularios, manejadores de eventos en línea y atributos `style`, y se descartan las URL `javascript:`. Las direcciones relativas se reescriben en el servidor: las imágenes van a `/api/image/...`, los enlaces a otros archivos HTML/Markdown/PDF a `/post/...` y el resto de recursos se resuelven desde el directorio de la página. Usa `html.sanitize: false` solo para contenido totalmente de confianza.

### Páginas HTML completas (modo sandbox)

Las páginas interactivas activan el modo sandbox desde el `<head>`:

```html
<meta name="powerwiki-render" content="sandbox">
```

Entonces la página se incrusta sin sanitizar en un `iframe`: se permiten scripts, formularios, ventanas emergentes, descargas y navegación superior activada por el usuario, pero no `allow-same-origin`. La página se ejecuta en un origen opaco y no puede leer cookies, localStorage ni API del mismo origen del Wiki. La página original también está disponible en `/full/<ruta del repositorio>` con `Content-Security-Policy: sandbox ...`; esa ruta solo sirve HTML y recursos estáticos y rechaza traversal, segmentos ocultos, enlaces simbólicos y archivos de más de 50 MB.

![Panel HTML interactivo abierto en modo de lectura inmersiva en PowerWiki](../assets/screenshots/html-article.jpg)

### Lectura inmersiva

Las páginas sandbox y la página de inicio HTML se abren directamente en modo inmersivo: el lienzo de lectura llena el viewport, `Esc` o el botón superior derecho vuelven a la vista normal y el `iframe` no se recarga. El servidor entrega el estado inmersivo desde el primer fotograma, así que no hay salto de anchura al cargar. La altura sigue el contenido informado (240–20000px), de modo que fuera del modo inmersivo no aparece una segunda barra de desplazamiento. Los artículos HTML normales, sin meta de sandbox, no tienen `iframe`: se desplazan como una página normal y su botón **Pantalla completa** abre `/full/...` en una pestaña nueva.

El marco del artículo envía a las páginas sandbox `{ type: 'powerwiki:context', version: 1, theme, lang }` al cargar y en cada cambio de tema; una página puede solicitarlo con `parent.postMessage({ type: 'powerwiki:request-context' }, '*')`.

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
│   ├── index.html          # HTML del Frontend
│   ├── app.js             # Punto de entrada principal (modular)
│   ├── js/                # Módulos JavaScript
│   │   ├── theme.js       # Gestión de temas
│   │   ├── i18n.js        # Internacionalización
│   │   ├── cache.js       # Caché del cliente
│   │   ├── utils.js       # Utilidades
│   │   ├── posts.js       # Lista de artículos y árbol
│   │   ├── article.js     # Renderizado de artículos
│   │   ├── toc.js         # Generación de tabla de contenidos
│   │   └── media.js       # Copia de código, visor de imágenes, PDF
│   └── css/               # Módulos CSS
│       ├── base.css       # Estilos base y variables
│       ├── layout.css     # Diseño
│       ├── sidebar.css    # Menú de navegación
│       ├── article.css    # Artículos y Markdown
│       ├── toc.css        # Barra de tabla de contenidos derecha
│       ├── media.css      # Diseño responsivo
│       └── components.css # Componentes UI
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
