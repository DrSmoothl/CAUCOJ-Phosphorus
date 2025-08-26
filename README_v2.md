# Phosphorus Plagiarism Detection Plugin v2.0

完全重构的 Hydro OJ 查重插件，提供基于 JPlag 引擎的智能代码相似度检测功能。

## 🎯 核心特性

### 统一查重入口
- **主页面**: `/plagiarism` - 查重系统控制台，集中管理所有查重功能
- **比赛查重**: `/plagiarism/contest` - 比赛级别的代码相似度检测
- **题目查重**: `/plagiarism/problem` - 单题目跨比赛相似度分析 (开发中)

### 比赛查重功能
- 📊 **智能检测**: 基于 JPlag 6.2.0 引擎的高精度相似度分析
- 🎯 **批量处理**: 一键检测比赛中所有提交的代码相似度
- 📈 **详细报告**: 相似度对、聚类分析、用户行为统计
- 💾 **历史追踪**: 保存检测历史，支持结果对比和导出
- ⚙️ **灵活配置**: 可调节 Token 最小数量和相似度阈值

## 🗂️ 项目结构

```
phosphorus-plagiarism/
├── index.ts                              # 插件主入口文件
├── package.json                          # 插件配置和依赖
├── templates/                            # Jinja2 模板文件
│   ├── plagiarism_system.html           # 系统主页
│   ├── plagiarism_contest_list.html     # 比赛列表页
│   ├── plagiarism_contest_detail.html   # 比赛详情页
│   ├── plagiarism_problem_list.html     # 题目列表页
│   └── plagiarism_problem_detail.html   # 题目详情页
└── README.md                            # 本文档
```

## 🚀 URL 路由设计

| 路由 | Handler | 功能描述 |
|------|---------|----------|
| `/plagiarism` | PlagiarismSystemHandler | 查重系统主页 |
| `/plagiarism/contest` | PlagiarismContestListHandler | 比赛查重列表 |
| `/plagiarism/contest/check` | PlagiarismContestCheckHandler | 执行比赛查重 |
| `/plagiarism/contest/:id` | PlagiarismContestDetailHandler | 比赛查重详情 |
| `/plagiarism/problem` | PlagiarismProblemListHandler | 题目查重列表 |
| `/plagiarism/problem/:id` | PlagiarismProblemDetailHandler | 题目查重详情 |
| `/plagiarism/:type/:id/:rid/export` | PlagiarismExportHandler | 导出检测结果 |

## 🔧 数据库集成

### 比赛数据获取
- **数据源**: MongoDB `documents` 集合
- **查询条件**: `docType = 30` (比赛类型)
- **排序**: 按开始时间倒序 (`beginAt: -1`)

### 检测结果存储
- **后端存储**: Phosphorus API 管理检测结果
- **数据格式**: JSON 格式，包含相似度对、聚类、统计信息
- **历史追踪**: 支持多次检测结果的历史记录

## 🔌 API 集成

### Phosphorus 后端 API
```bash
# 基础地址
PHOSPHORUS_API_BASE = "http://localhost:8000"

# 比赛查重检测
POST /api/v1/contest/plagiarism
{
  "contest_id": "string",
  "min_tokens": 9,
  "similarity_threshold": 0.0
}

# 获取检测结果
GET /api/v1/contest/{contest_id}/plagiarism
```

### 权限控制
- **基础权限**: `PRIV.PRIV_USER_PROFILE` - 登录用户
- **管理权限**: `PRIV.PRIV_CREATE_DOMAIN` - 域管理员
- **比赛权限**: 比赛创建者或域管理员

## 🎨 前端特性

### 响应式设计
- 基于 Bootstrap 风格的现代化界面
- 支持移动设备和桌面端
- 动态加载和实时状态更新

### 交互功能
- **模态框配置**: 查重参数的可视化配置
- **实时反馈**: 检测过程的进度提示
- **数据可视化**: 相似度结果的直观展示
- **导出功能**: JSON 格式的结果导出

### 用户体验
- **智能导航**: 面包屑导航和返回按钮
- **状态指示**: 比赛状态、检测状态的清晰标识
- **错误处理**: 友好的错误信息和恢复建议

## 📦 安装和部署

### 1. 环境要求
- Hydro OJ 5.0.0-beta.8+
- Node.js 18+
- MongoDB 4.4+
- Phosphorus 后端服务

### 2. 插件安装
```bash
# 将插件复制到 Hydro 插件目录
cp -r phosphorus-plagiarism /path/to/hydro/addons/

# 重启 Hydro 服务
pm2 restart hydro
```

### 3. 后端配置
确保 Phosphorus 后端服务正在运行:
```bash
# 启动 Phosphorus 服务
cd /path/to/phosphorus
uvicorn main:app --host 0.0.0.0 --port 8000
```

## 🔍 使用指南

### 比赛查重流程
1. **访问主页**: 进入 `/plagiarism` 查重系统主页
2. **选择比赛**: 点击"管理比赛查重"进入比赛列表
3. **配置参数**: 点击"检测"按钮，设置 Token 数量和相似度阈值
4. **开始检测**: 确认参数后开始检测，等待完成
5. **查看结果**: 自动跳转到结果详情页，分析相似度报告
6. **导出数据**: 可选择导出 JSON 格式的检测结果

### 结果解读
- **高相似度对**: 相似度超过阈值的提交对
- **聚类分析**: 相似提交的自动分组
- **用户统计**: 每个用户的提交相似度统计
- **失败记录**: 检测过程中的错误信息

## 🛠️ 开发信息

### 技术栈
- **后端**: TypeScript + Hydro OJ Framework
- **前端**: Jinja2 Templates + Bootstrap + JavaScript
- **数据库**: MongoDB (通过 Hydro Model 层)
- **检测引擎**: JPlag 6.2.0
- **API 通信**: RESTful API + JSON

### 扩展开发
插件提供了完整的模型和工具函数，便于功能扩展：

```typescript
// 扩展查重模型
global.Hydro.model.plagiarism = {
    getAllContests,
    checkContestPlagiarism,
    getContestPlagiarismResults,
    // 可添加新的查重方法
}
```

## 📋 版本历史

### v2.0.0 (当前版本)
- ✅ 完全重构插件架构
- ✅ 实现新的 URL 路由系统
- ✅ 集成 MongoDB 数据库查询
- ✅ 优化用户界面和交互体验
- ✅ 添加权限控制和错误处理
- ✅ 支持检测结果导出

### v1.0.0 (已废弃)
- ❌ 旧版本架构存在严重问题
- ❌ URL 路由设计不合理
- ❌ 缺乏数据库集成
- ❌ 用户界面简陋

## 📞 支持和反馈

如有问题或建议，请联系：
- **项目仓库**: https://github.com/CAUCOJ/Phosphorus
- **开发团队**: CAUCOJ Team
- **许可证**: AGPL-3.0

---

*Phosphorus Plagiarism Detection Plugin - 让代码查重更智能、更高效*
