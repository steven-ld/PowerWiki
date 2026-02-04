# PowerWiki 环境变量和多语言支持

## 🌍 环境变量支持

PowerWiki 现在支持以下环境变量来自定义配置：

### 配置文件路径
```bash
CONFIG_PATH=/path/to/your/config.json
```
- 默认值: `./config.json`
- 用途: 指定配置文件的自定义路径

### 数据存储目录
```bash
DATA_DIR=/path/to/data/directory
```
- 默认值: 项目根目录
- 用途: 存储统计数据和访问日志

### Git 缓存目录
```bash
GIT_CACHE_DIR=/path/to/git/cache
```
- 默认值: `./.git-cache`
- 用途: Git 仓库的本地缓存目录

### 语言设置
```bash
LANG=zh-CN
```
- 默认值: `zh-CN`
- 支持值: `zh-CN` (中文简体), `en` (英文)
- 用途: 控制台输出语言

## 🌐 多语言支持

### 支持的语言
- **中文简体** (`zh-CN`) - 默认语言
- **英文** (`en`)

### 翻译文件位置
- `locales/zh-CN.json` - 中文翻译
- `locales/en.json` - 英文翻译

### 使用方法

#### 方法 1: 环境变量
```bash
# 启动英文版本
LANG=en npm start

# 启动中文版本
LANG=zh-CN npm start
```

#### 方法 2: .env 文件
```bash
# 复制示例文件
cp .env.example .env

# 编辑 .env 文件
echo "LANG=en" >> .env

# 启动服务器
npm start
```

#### 方法 3: npm 脚本
```bash
# 英文版本
npm run start:en

# 中文版本
npm run start:zh
```

## 🐳 Docker 部署

### Docker Compose 示例
```yaml
version: '3.8'
services:
  powerwiki:
    build: .
    environment:
      - CONFIG_PATH=/app/config.json
      - DATA_DIR=/app/data
      - GIT_CACHE_DIR=/app/cache
      - LANG=zh-CN
    volumes:
      - ./config.json:/app/config.json:ro
      - powerwiki_data:/app/data
      - powerwiki_cache:/app/cache
```

### Dockerfile 示例
```dockerfile
FROM node:18-alpine
ENV CONFIG_PATH=/app/config/production.json
ENV DATA_DIR=/app/data
ENV GIT_CACHE_DIR=/app/cache
ENV LANG=en
```

## 🔧 向后兼容性

- ✅ **完全向后兼容** - 现有部署无需任何改动
- ✅ **默认值保证** - 所有环境变量都有合理的默认值
- ✅ **渐进式升级** - 可以逐步采用新功能

## 🧪 测试

运行环境变量测试：
```bash
npm run test:env
```

测试不同语言环境：
```bash
# 测试中文环境
LANG=zh-CN npm run test:env

# 测试英文环境
LANG=en npm run test:env
```

## 📝 示例配置

### systemd 服务示例
```ini
[Service]
Environment=CONFIG_PATH=/etc/powerwiki/config.json
Environment=DATA_DIR=/var/lib/powerwiki
Environment=GIT_CACHE_DIR=/var/cache/powerwiki
Environment=LANG=zh-CN
```
