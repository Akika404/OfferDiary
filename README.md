# OfferDiary 校招日记

一款面向校招求职者的桌面端投递管理工具，帮助你高效追踪投递进度、管理面试安排、记录面试内容。

## 功能特性

### 投递管理

- 以表格形式管理所有投递记录，包括公司、岗位、部门、薪资、状态等信息
- 支持自定义流程模板，灵活配置各投递阶段（已投递 → 笔试 → 一面 → 二面 → HR面 → Offer）
- 可展开的流程时间线，直观查看每条投递的状态变更历程
- 点击时间线节点即可推进状态，操作便捷

### 面试日历

- 月历视图展示面试安排，一目了然
- 支持线上/线下面试，记录平台、会议链接、地点等信息
- 自动检测面试时间冲突
- 智能推荐空闲时段（09:00–21:00）
- 面试前 15 分钟系统通知提醒

### 面试记录

- 基于 TipTap 的富文本编辑器，支持 Markdown 快捷键
- 支持标题、加粗、斜体、列表、代码块等格式
- 自动防抖保存，不丢失任何记录
- 面试结果标记（通过 / 未通过 / 待定）

### 设置

- 自定义流程模板：新增、编辑、删除、设为默认
- 拖拽排序流程阶段，自定义阶段名称和颜色
- 一键恢复默认阶段配置

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Vue 3 + TypeScript |
| 桌面 | Electron |
| 构建 | Vite + Electron Forge |
| 状态管理 | Pinia |
| 路由 | Vue Router |
| UI 组件库 | Naive UI |
| 富文本 | TipTap |
| 拖拽 | vue-draggable-plus |
| 数据存储 | electron-store (本地 JSON) |


## 开发与构建

### 环境要求

- Node.js >= 20
- npm 或其他包管理器

### 安装依赖

```bash
npm install
```

### 开发模式

启动带有热更新的开发服务器：

```bash
npm run dev
```

### 构建

执行 TypeScript 类型检查并构建前端资源：

```bash
npm run build
```

### 启动 Electron 应用

```bash
npm start
```

### 打包为可分发安装包

```bash
npm run make
```

支持的打包格式：

| 平台 | 格式 |
|------|------|
| macOS | ZIP |
| Windows | Squirrel |
| Linux | deb / rpm |

## 数据存储

所有用户数据以 JSON 格式存储在本地，无需联网，保护隐私：

- **macOS**: `~/Library/Application Support/offer-diary/offer-diary-data.json`
- **Windows**: `%APPDATA%/offer-diary/offer-diary-data.json`
- **Linux**: `~/.config/offer-diary/offer-diary-data.json`

## 许可证

[Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0)
