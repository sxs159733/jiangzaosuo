# AGENTS.md

本仓库是纯静态站点（HTML/CSS/JS），**没有构建步骤**，仓库根目录就是发布目录，入口为 `index.html`。

## 改动约定

- 内容优先改 `assets/data.js`；交互逻辑在 `assets/app.js`，样式在 `assets/style.css`。
- 换配色或整体密度只改 `assets/style.css` 顶部的 `:root` CSS 变量。
- 图片放 `assets/img/`，用 kebab-case 命名，并在 `data.js` 中引用。
- 不要修改 `.github/workflows/pages.yml` 和 README 里的在线地址。
- 保持现有中文文案风格与排版，一次提交只做一件事。

## 本地验证

```bash
python -m http.server 8080
# 打开 http://127.0.0.1:8080 ，确认页面无控制台报错、图片与筛选正常
```

## 发布

推送到 `main` 后，GitHub Actions 自动发布到 GitHub Pages，约 1–2 分钟生效。
