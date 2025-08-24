# Phosphorus 抄袭检测插件

## 简介

这是一个为 Hydro OJ 开发的抄袭检测插件，集成了 Phosphorus 后端服务，提供基于 JPlag 的代码相似度分析功能。

## 功能特性

- 🔍 **智能检测**: 使用 JPlag 引擎进行精确的代码相似度分析
- 📊 **详细报告**: 提供高相似度对、聚类分析和统计信息
- 🎯 **多语言支持**: 支持 Java, C++, Python, C 等多种编程语言
- 🔐 **权限控制**: 只有比赛管理员可以进行抄袭检测
- 📈 **可视化界面**: 友好的 Web 界面展示检测结果
- 💾 **结果导出**: 支持 JSON 格式导出检测结果

## 安装指南

### 1. 后端服务

首先确保 Phosphorus 后端服务正在运行：

```bash
cd /path/to/Phosphorus
uv run uvicorn src.main:app --host 0.0.0.0 --port 8000
```

### 2. 插件安装

将插件文件夹复制到 Hydro 的插件目录：

```bash
cp -r phosphorus-plagiarism /path/to/hydro/plugins/
```

### 3. 启用插件

在 Hydro 配置文件中启用插件：

```yaml
# config.yaml
plugins:
  - phosphorus-plagiarism
```

### 4. 重启 Hydro

```bash
pm2 restart hydro
```

## 使用方法

### 访问抄袭检测

1. 进入比赛管理页面
2. 点击 "抄袭检测" 标签页或按钮
3. 设置检测参数（最小标记数、相似度阈值）
4. 点击 "开始检测" 按钮

### 查看检测结果

检测完成后，您可以：

- 查看高相似度代码对
- 分析用户聚类情况
- 查看提交统计信息
- 导出检测结果为 JSON 文件

### 权限要求

- 只有比赛创建者或具有 `PRIV_EDIT_CONTEST` 权限的用户可以进行抄袭检测
- 检测结果仅对授权用户可见

## 配置说明

### API 端点配置

在 `index.ts` 中修改 Phosphorus API 地址：

```typescript
const PHOSPHORUS_API_BASE = 'http://your-phosphorus-server:8000';
```

### 检测参数

- **最小标记数** (1-100): JPlag 分析的最小匹配标记数，数值越小检测越严格
- **相似度阈值** (0.0-1.0): 报告相似度的最小阈值，0.0 表示显示所有结果

## 技术架构

```
Hydro Frontend (Jinja2) 
    ↓ HTTP Request
Hydro Plugin (TypeScript)
    ↓ REST API
Phosphorus Backend (FastAPI)
    ↓ Database Query
MongoDB (提交数据)
    ↓ Analysis
JPlag Engine
```

## 故障排除

### 常见问题

1. **API 连接失败**
   - 检查 Phosphorus 后端是否运行
   - 验证 API 地址配置是否正确
   - 检查网络连接和防火墙设置

2. **权限错误**
   - 确认用户是比赛创建者或有编辑权限
   - 检查用户登录状态

3. **检测失败**
   - 查看后端日志获取详细错误信息
   - 确认比赛中有足够的提交记录
   - 检查支持的编程语言

### 日志查看

```bash
# Hydro 日志
pm2 logs hydro

# Phosphorus 后端日志
uvicorn 启动时的控制台输出
```

## 开发指南

### 插件结构

```
phosphorus-plagiarism/
├── index.ts                 # 主插件文件
├── package.json            # 插件配置
├── templates/              # 模板文件
│   ├── plagiarism_main.html
│   └── plagiarism_detail.html
└── static/                 # 静态资源
    └── phosphorus-plagiarism.js
```

### 自定义开发

1. **修改界面**: 编辑 `templates/` 下的 Jinja2 模板
2. **添加功能**: 在 `index.ts` 中扩展 Handler 类
3. **前端交互**: 修改 `static/phosphorus-plagiarism.js`

## 依赖说明

- **Hydro OJ**: 主平台系统
- **Phosphorus**: 后端抄袭检测服务
- **MongoDB**: 提交数据存储
- **JPlag**: 代码相似度分析引擎

## 许可证

AGPL-3.0 License

## 支持与反馈

如遇问题或需要功能建议，请联系 CAUCOJ 团队。
