FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 安装 git（用于仓库同步）
RUN apk add --no-cache git

# 复制 package 文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制应用代码
COPY . .

# 创建必要的目录
RUN mkdir -p /app/data /app/cache

# 设置环境变量
ENV NODE_ENV=production
ENV DATA_DIR=/app/data
ENV GIT_CACHE_DIR=/app/cache
ENV CONFIG_PATH=/app/config.json

# 暴露端口
EXPOSE 3150

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3150/ || exit 1

# 启动应用
CMD ["npm", "start"]
