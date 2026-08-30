# 项目管理 - 组会汇报助手

一个轻量级的纯前端项目管理工具，专为组会汇报设计。无需后端，数据存储在浏览器本地，支持一键部署到 GitHub Pages。

## 功能特性

- 📊 **仪表盘**：项目总览、进度统计、最近动态
- 📁 **项目管理**：新建、编辑、删除项目，管理项目基本信息和成员
- ✅ **任务看板**：拖拽式看板（待办/进行中/已完成），支持优先级和截止日期
- 🎤 **组会汇报**：自动生成汇报视图，支持打印/导出 PDF
- 📤 **数据导入导出**：JSON 格式备份和恢复
- 🌙 **深色/浅色主题**：一键切换
- 📱 **响应式设计**：适配电脑和手机

## 本地使用

直接双击打开 `index.html` 即可使用，无需安装任何依赖。

> 注意：数据存储在浏览器的 localStorage 中，清除浏览器数据会导致数据丢失，请定期导出备份。

## 部署到 GitHub Pages

### 方法一：手动上传（最简单）

1. 在 GitHub 上新建一个仓库（比如叫 `project-manager`）
2. 把 `project-manager` 文件夹里的所有文件上传到仓库根目录
3. 进入仓库的 **Settings** → **Pages**
4. 在 **Build and deployment** 下，选择：
   - Source: `Deploy from a branch`
   - Branch: `main` / `root`
5. 点击 **Save**，等待几分钟
6. 访问地址：`https://你的用户名.github.io/仓库名/`

### 方法二：Git 命令行

```bash
# 进入项目目录
cd project-manager

# 初始化 git
git init
git add .
git commit -m "init project"

# 添加远程仓库（替换成你的仓库地址）
git remote add origin https://github.com/你的用户名/project-manager.git
git branch -M main
git push -u origin main
```

然后按照方法一的第 3-6 步开启 Pages。

## 数据备份

由于数据存在浏览器本地，建议定期导出备份：

1. 点击左侧边栏的 **📤 导出数据**
2. 会下载一个 JSON 备份文件
3. 换电脑或清除浏览器数据后，点击 **📥 导入数据** 恢复

## 项目结构

```
project-manager/
├── index.html      # 主页面
├── css/
│   └── style.css   # 样式文件
├── js/
│   ├── storage.js  # 数据存储层
│   └── app.js      # 应用逻辑
└── README.md       # 说明文档
```

## 技术栈

- 原生 HTML + CSS + JavaScript
- 无构建工具，无依赖
- localStorage 本地存储
- GitHub Pages 部署
