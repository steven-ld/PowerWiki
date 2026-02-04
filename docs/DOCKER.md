# PowerWiki Docker 部署指南

## 🐳 Docker 部署

### 快速开始

1. **准备配置文件**
```bash
cp config.example.json config.json
# 编辑 config.json 配置你的 Git 仓库
```

2. **使用 Docker Compose（推荐）**
```bash
docker-compose up -d
```

3. **或使用 Docker 命令**
```bash
# 构建镜像
docker build -t powerwiki .

# 运行容器
docker run -d \
  --name powerwiki \
  -p 3150:3150 \
  -v $(pwd)/config.json:/app/config.json:ro \
  -v powerwiki_data:/app/data \
  -v powerwiki_cache:/app/cache \
  -e LANG=zh-CN \
  powerwiki
```

### 环境变量配置

```yaml
environment:
  - NODE_ENV=production
  - DATA_DIR=/app/data          # 数据存储目录
  - GIT_CACHE_DIR=/app/cache    # Git 缓存目录
  - CONFIG_PATH=/app/config.json # 配置文件路径
  - LANG=zh-CN                  # 语言设置
```

### 数据持久化

Docker 部署使用 volumes 来持久化数据：

- `powerwiki_data`: 存储访问统计和日志
- `powerwiki_cache`: 存储 Git 仓库缓存

### 健康检查

容器包含健康检查，确保服务正常运行：
- 检查间隔：30秒
- 超时时间：10秒
- 重试次数：3次
- 启动等待：40秒

### 日志查看

```bash
# 查看容器日志
docker-compose logs -f powerwiki

# 或使用 docker 命令
docker logs -f powerwiki
```

### 更新部署

```bash
# 停止服务
docker-compose down

# 拉取最新代码并重新构建
git pull
docker-compose build

# 启动服务
docker-compose up -d
```

## 🚀 生产环境部署

### 使用预构建镜像

```bash
# 拉取镜像（如果有发布到 Docker Hub）
docker pull your-registry/powerwiki:latest

# 运行
docker run -d \
  --name powerwiki \
  -p 3150:3150 \
  -v /path/to/config.json:/app/config.json:ro \
  -v /path/to/data:/app/data \
  -v /path/to/cache:/app/cache \
  --restart unless-stopped \
  your-registry/powerwiki:latest
```

### Nginx 反向代理

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3150;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 资源限制

```yaml
services:
  powerwiki:
    # ... 其他配置
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'
```
