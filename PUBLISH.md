# 收录到插件市场（awesome-dsh-plugin）

> 这份文件是给仓库所有者看的操作单，不参与插件运行。
> 把 `<OWNER>` / `<REPO>` 换成你自己的 GitHub 用户名和仓库名。

## 市场的数据从哪来

dshmarket 的「插件市场」页、官网 [awesome-dsh-plugin.com](https://awesome-dsh-plugin.com)、
官方 Plugins → Discover（以及 `dsh-plugin-catalog` 索引）读的是**同一份目录**：
GitHub 仓库 [awesome-dsh-plugin/awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin)
里的 `data/plugins/<owner>__<repo>.yml`。

所以「上传到插件市场」= **给那个仓库交一个 PR，加一个 YAML 文件**。
不用给 dshmarket 作者提 PR，也不用等谁审核 npm 包。

当前目录里 12,763 条条目没有阿里云代金券类插件（2026-11-23 查），不会撞车。

## 硬性要求（CI 先卡这些）

1. `package.json` 里必须有 `dsh.bundle.patch`（本仓库已有，指向 `./cordis.patch.yml`）。
   只声明 `dsh.client` 会被拒——这是最常见的退件原因。
2. 仓库**公开**、有真实可运行的代码（占位/纯 README 仓库不行）。
3. 仓库创建**至少满 1 天**（CI 自动检查）。
4. 仓库加 topic：`dsh-plugin`（GitHub 仓库页右上 About → ⚙ → Topics）。
5. 一个 PR 最多 3 条条目；描述必须与代码一致，不写营销词。

## 第 1 步：建 GitHub 仓库

仓库名建议和包名一致，例如 `<OWNER>/dsh-aliyun-coupon`。公开。

要上传的内容（本目录全部，除了 node_modules）：

```
README.md            ← 市场详情页的兜底文档
LICENSE
.gitignore
package.json
cordis.patch.yml
index.js             ← 宿主端
client.js            ← 浏览器端
icon.svg
assets/icon-180.png  ← 列表卡片图标（PNG，96–180px）
locale/en.json
locale/zh.json
docs/DETAIL.md
docs/DETAIL.zh.md
docs/preview.svg
```

没有装 Git 也能传：GitHub 仓库页 → **Add file → Upload files**，把整个文件夹拖进去，
提交信息写 `feat: Alibaba Cloud coupon balance panel`。

装了 Git 的话：

```bat
cd /d "D:\文档\deepseek-harness\default-workspace\dsh-aliyun-coupon"
git init
git add -A
git commit -m "feat: Alibaba Cloud coupon balance panel"
git branch -M main
git remote add origin https://github.com/<OWNER>/<REPO>.git
git push -u origin main
```

## 第 2 步：等满 1 天，加 topic

建仓库当天提 PR 会被 CI 拦（`repo age` 检查）。第二天再加 topic `dsh-plugin`、提 PR。

## 第 3 步：给目录仓库提 PR

1. 打开 [awesome-dsh-plugin/awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin)，
   点 **Fork**；
2. 在你 fork 的仓库里 **Add file → Create new file**，路径填：

   ```
   data/plugins/<OWNER>__<REPO>.yml
   ```

   （`__` 是两个下划线，文件名必须与仓库路径一一对应；monorepo 子目录用
   `owner__repo--packages-xxx.yml` 这种形式。）
3. 内容用 `registry-entry.example.yml` 里的模板，改掉 `<OWNER>` / `<REPO>` 和图标地址；
4. 提交到新分支，回到上游仓库点 **New pull request**。

CI 会检查：条目数 ≤3、`dsh.bundle` 存在、仓库年龄、格式与 READMEs 重新生成。
过了 CI 还有维护者人工读源码、逐条核对描述。合并后官网/市场/Discover 通常一天内更新。

## 条目字段说明

```yaml
url: https://github.com/<OWNER>/<REPO>   # 必须与仓库完全一致
name: <OWNER>/<REPO>                     # 列表里显示的文字
category: ui                             # 只能是白名单里的分类
description:
  en: ...                                # 必填，一句话，句号结尾
  zh: ...                                # 可选；不写维护者会补
icon: https://raw.githubusercontent.com/<OWNER>/<REPO>/main/assets/icon-180.png
```

分类白名单：`api ui usage theme model identity session memory tools wsl browser vision voice docs skill workflow git notify dev security remote market fun`。
本插件是侧栏页面，用 `ui`。

`icon` 必须是 **GitHub 托管的 PNG/JPG/JPEG/WebP**（SVG 和第三方图床会被拒），
所以仓库里放了 `assets/icon-180.png`。

## 可选：发布到 npm

**不是收录的前提**，列表里有 GitHub-only 的插件。发布后市场会显示下载量、支持
「按名字安装」，但需要：

- npm 包名 `dsh-aliyun-coupon` **已经被别人占用**（作者 `fvvef121-cell`，发布的也是同类侧栏插件），
  你不能再用这个名字；建议改成 `dsh-aliyun-coupon-panel`（我查过，当前空闲）：
  改 `package.json` 的 `name`，然后 `npm publish --access public`；
- 已发布包的 `repository` 字段必须指回**你被收录的那个仓库**，否则 npm 包和条目不算关联
  （目录靠这个防止别人把包挂到不属于自己的仓库上）；
- 发布前把 `package.json` 的 `"private": true` 去掉，并补 `repository`、`homepage`。

## 可选：商店截图

在仓库根放 `screenshots.json`（相对该文件的图片路径，1–8 张，PNG/JPG/WebP）：

```json
["assets/screenshot-1.png", "assets/screenshot-2.png"]
```

不声明时市场会尝试从 README 里抓图；声明只影响顺序与取舍，不影响收录。

## 会被退件的几种写法

- 只声明 `dsh.client` 没有 `dsh.bundle`；
- 描述写了代码里没有的能力（比如「支持多账号」而实际只读单账号）；
- 分类乱填（比如费用类插件填 `theme`）——这条通常维护者会直接改，不打回；
- 一个 PR 提 3 条以上，或改了别人的条目；
- 仓库刚建几小时就提 PR。