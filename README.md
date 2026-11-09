# 浆造所 · 破壁机豆浆与五谷饮调配手册

60 款破壁机配方：豆浆、玉米汁、果蔬汁、米糊、浓汤、冰沙、酱料与植物奶。从豆水比例、泡豆时间到每一种模式，附器具使用与安全指南。纯静态站点，无构建步骤。

在线站点（GitHub Pages）：https://sxs159733.github.io/jiangzaosuo/

仓库为公开仓库，任何有写权限的协作者都可以直接 clone、修改、推送；推送 `main` 后由 GitHub Actions 自动发布。

## 页面

| 文件 | 页面 | 内容 |
| --- | --- | --- |
| `index.html` | 首页 | 站点导览与本週推荐 |
| `recipes.html` | 配方库 | 60 款配方，按类别/场景筛选 |
| `machine.html` | 器具手册 | 破壁机模式、转速与使用要点 |
| `pantry.html` | 食材图鉴 | 豆类、谷物、果蔬与搭配 |
| `science.html` | 调配心法 | 比例公式、口感调整与避坑 |
| `beyond.html` | 不止豆浆 | 浓汤、冰沙、酱料与植物奶 |

## 目录结构

```
*.html                 六个页面
assets/style.css       全站样式与设计变量
assets/data.js         全部结构化内容（配方、食材、模式）
assets/app.js          筛选、搜索、详情与公共交互
assets/community.js    评分与评论（1–5 星、平均分、评论发布/列表、按评分/评论数排序）
assets/img/            实拍与配图
```

## 评分与评论

每款配方支持 1–5 星打分（同一浏览器可修改自己的评分）、平均分与评论数展示、文字评论发布与列表；配方库可按「评分 高 → 低」「评论 多 → 少」排序。数据云端共享，所有访客可见。

后端为 Cloudflare Worker + KV（源码不在本仓库，由站点维护者单独保管），前端在 `assets/community.js` 顶部的 `PROD_API` 配置 API 地址；未配置时评分评论区自动隐藏，不影响其余功能。本地联调可用配套的 dev-server（localhost 自动走同源 `/api` 代理）。

## 本地预览

站点是纯静态文件，用任意本地服务器打开：

```bash
python -m http.server 8766
```

然后访问 http://127.0.0.1:8766 。

## 改内容

绝大多数内容改 `assets/data.js` 即可，样式走 `assets/style.css` 顶部的 `:root` CSS 变量，改完刷新页面就能看到。

## 协作流程

1. 仓库持有者在 GitHub 的 **Settings → Collaborators** 里邀请成员（对方用自己的 GitHub 账号接受即可，不需要 Qoder 账号）。
2. 从 `main` 拉最新代码，改动按页面或数据字段分开提交，减少冲突。
3. 图片放到 `assets/img/`，用 kebab-case 命名，并在 `data.js` 里引用。
4. 提 PR 或直接推 `main` 都可以，推上去会自动重新部署。

### 用 AI Agent 协作

仓库是纯静态 HTML/CSS/JS，没有构建步骤和私有依赖，Codex、WorkBuddy、Qoder、Copilot 等 Agent 直接 clone 就能改。建议约定：内容改动集中在 `data.js`，多人同时改时先拉最新再提交。

## 部署

仓库根目录就是可直接部署的静态站点，由 `.github/workflows/pages.yml` 在每次推送 `main` 后自动发布到 GitHub Pages，约 1–2 分钟上线。

## 说明

配方为家庭饮品记录，具体食材过敏、器具安全与破壁机使用请以厂商说明书为准。
