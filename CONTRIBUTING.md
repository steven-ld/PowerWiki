# 贡献指南

感谢你对 PowerWiki 项目的关注！我们欢迎所有形式的贡献。

## 如何贡献

### 报告问题

如果你发现了 bug 或有功能建议，请：

1. 检查 [Issues](https://github.com/your-username/powerwiki/issues) 中是否已有相关问题
2. 如果没有，请创建新的 Issue，并包含：
   - 清晰的问题描述
   - 复现步骤
   - 预期行为 vs 实际行为
   - 环境信息（Node.js 版本、操作系统等）

### 提交代码

1. **Fork 仓库**

```bash
git clone https://github.com/your-username/powerwiki.git
cd powerwiki
```

2. **创建分支**

```bash
git checkout -b feature/your-feature-name
```

3. **进行修改**

- 遵循现有的代码风格
- 添加必要的注释
- 确保代码可以正常运行

4. **提交更改**

```bash
git add .
git commit -m "feat: 添加新功能描述"
```

提交信息格式：
- `feat:` 新功能
- `fix:` 修复 bug
- `docs:` 文档更新
- `style:` 代码格式调整
- `refactor:` 代码重构
- `test:` 测试相关
- `chore:` 构建/工具相关

5. **推送并创建 Pull Request**

```bash
git push origin feature/your-feature-name
```

然后在 GitHub 上创建 Pull Request。

## 代码规范

- 使用 2 个空格缩进
- 使用单引号（JavaScript）
- 添加必要的注释
- 保持函数简洁，单一职责

## 开发环境设置

1. 安装依赖：`npm install`
2. 复制配置：`cp config.example.json config.json`
3. 修改配置：编辑 `config.json`
4. 启动开发服务器：`npm run dev`

## 测试

在提交 PR 之前，请确保：

- [ ] 代码可以正常启动
- [ ] 功能正常工作
- [ ] 没有控制台错误
- [ ] 代码格式符合规范

## 问题反馈

如有任何问题，请通过 Issue 或邮件联系。

感谢你的贡献！🎉

