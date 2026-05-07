# OSS Browser Next

阿里云 OSS 桌面客户端，基于 Electron 28 + React 18 + TypeScript 的现代化重写版本。

## 功能

- **多账号管理** — 支持多个阿里云账号，AES 加密本地存储
- **文件浏览** — 列表/网格视图、排序、全文搜索
- **上传** — 单文件、多文件、文件夹上传，大文件自动分片，支持拖拽
- **下载** — 单文件、批量下载
- **文件操作** — 重命名、复制、移动（含目录递归）
- **预览** — 图片（缩放/旋转）、视频、音频、文本/代码
- **传输队列** — 实时进度、支持取消
- **右键菜单** — 完整操作集
- **Bucket 管理** — 创建、删除 Bucket
- **元数据** — 设置 ACL、HTTP 请求头（Content-Type / Cache-Control 等）、查看文件详情
- **自动更新** — 启动时检查 GitHub Release 最新版本
- **自定义域名** — 支持 CNAME 自定义域名生成签名 URL
- **跨平台** — macOS / Windows / Linux

## 下载

前往 [Releases](../../releases) 下载最新版本：

| 平台 | 文件 |
|------|------|
| macOS (Apple Silicon) | `OSS-Browser-Next-*-arm64.zip` |
| macOS (Intel) | `OSS-Browser-Next-*-x64.zip` |
| Windows | `OSS-Browser-Next-*-Setup.exe` |
| Linux | `OSS-Browser-Next-*.AppImage` |

## 开发

```bash
# 安装依赖
npm install

# 启动开发模式
npm run dev

# 构建
npm run build

# 打包
npm run pack:mac        # macOS arm64
npm run pack:mac-x64    # macOS x64
npm run pack:win        # Windows x64
npm run pack:linux      # Linux x64 (AppImage)
```

**环境要求：** Node.js 18+

中国用户打包时建议设置镜像加速 Electron 下载：

```bash
ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ npm run pack:mac
```

## 配置文件位置

账号配置加密存储在：

| 平台 | 路径 |
|------|------|
| macOS | `~/Library/Application Support/oss-browser-next/accounts.json` |
| Windows | `%APPDATA%\oss-browser-next\accounts.json` |
| Linux | `~/.config/oss-browser-next/accounts.json` |

## Tech Stack

- [Electron 28](https://www.electronjs.org/) + [electron-vite](https://electron-vite.org/)
- [React 18](https://react.dev/) + TypeScript
- [Tailwind CSS](https://tailwindcss.com/) + [Radix UI](https://www.radix-ui.com/)
- [Zustand](https://zustand-demo.pmnd.rs/) — 状态管理
- [ali-oss](https://github.com/ali-sdk/ali-oss) — 阿里云 OSS SDK

## License

MIT
