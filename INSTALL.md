# Phosphorus 抄袭检测插件安装指南

## 前置条件

1. **Hydro OJ 系统**: 已安装并运行的 Hydro OJ 实例
2. **Phosphorus 后端**: 正在运行的 Phosphorus 抄袭检测后端服务
3. **MongoDB**: 包含比赛和提交数据的 MongoDB 数据库
4. **权限**: Hydro 系统管理员权限

## 详细安装步骤

### 步骤 1: 准备后端服务

确保 Phosphorus 后端正在运行：

```bash
# 进入 Phosphorus 项目目录
cd /path/to/Phosphorus

# 安装依赖
uv sync

# 配置 MongoDB 连接
# 编辑配置文件，确保 MongoDB 连接字符串正确

# 启动后端服务
uv run uvicorn src.main:app --host 0.0.0.0 --port 8000
```

验证后端服务：
```bash
curl http://localhost:8000/health
```

### 步骤 2: 安装插件

1. **复制插件文件**：
   ```bash
   # 复制整个插件文件夹到 Hydro 插件目录
   cp -r phosphorus-plagiarism /path/to/hydro/plugins/
   
   # 或者创建软链接（推荐开发环境）
   ln -s /path/to/Phosphorus/FrontendHydroPlugin/phosphorus-plagiarism /path/to/hydro/plugins/
   ```

2. **设置文件权限**：
   ```bash
   chmod -R 755 /path/to/hydro/plugins/phosphorus-plagiarism
   ```

### 步骤 3: 配置插件

1. **编辑 API 配置** (可选):
   ```bash
   vim /path/to/hydro/plugins/phosphorus-plagiarism/config.json
   ```
   
   修改 API 地址：
   ```json
   {
     "api": {
       "base_url": "http://your-phosphorus-server:8000"
     }
   }
   ```

2. **更新 TypeScript 配置** (如果需要):
   ```bash
   vim /path/to/hydro/plugins/phosphorus-plagiarism/index.ts
   ```
   
   修改第 10 行：
   ```typescript
   const PHOSPHORUS_API_BASE = 'http://your-server:8000';
   ```

### 步骤 4: 启用插件

1. **编辑 Hydro 配置**：
   ```bash
   vim /path/to/hydro/config/config.yaml
   ```
   
   添加插件：
   ```yaml
   plugins:
     - phosphorus-plagiarism
   ```

2. **或者通过 Hydro 管理界面启用**：
   - 访问 Hydro 管理页面
   - 进入插件管理
   - 启用 "phosphorus-plagiarism" 插件

### 步骤 5: 重启服务

```bash
# 如果使用 PM2
pm2 restart hydro

# 如果使用 systemd
sudo systemctl restart hydro

# 如果使用 Docker
docker-compose restart hydro
```

### 步骤 6: 验证安装

1. **检查插件加载**：
   - 查看 Hydro 日志确认插件加载成功
   - 访问任意比赛管理页面，查看是否有 "抄袭检测" 入口

2. **测试 API 连接**：
   - 进入抄袭检测页面
   - 检查是否显示 API 连接错误

## 使用方法

### 对管理员

1. **进入比赛管理**：
   - 访问比赛详情页面
   - 点击 "比赛管理" 或 "抄袭检测" 按钮

2. **启动检测**：
   - 设置检测参数（最小标记数、相似度阈值）
   - 点击 "开始抄袭检测"
   - 等待分析完成（可能需要几分钟）

3. **查看结果**：
   - 查看高相似度代码对
   - 分析聚类结果
   - 导出检测报告

### 检测参数说明

- **最小标记数** (1-100): 
  - 较小值 (1-5): 更严格，能检测出微小相似性
  - 中等值 (6-15): 平衡设置，推荐使用
  - 较大值 (16+): 较宽松，只检测明显抄袭

- **相似度阈值** (0.0-1.0):
  - 0.0: 显示所有相似性
  - 0.3-0.5: 中等相似度
  - 0.7+: 高度相似（可能抄袭）

## 故障排除

### 常见问题及解决方案

1. **插件加载失败**：
   ```bash
   # 检查文件权限
   ls -la /path/to/hydro/plugins/phosphorus-plagiarism/
   
   # 检查 Hydro 日志
   tail -f /path/to/hydro/logs/hydro.log
   ```

2. **API 连接错误**：
   ```bash
   # 测试后端连接
   curl http://localhost:8000/health
   
   # 检查防火墙设置
   sudo ufw status
   
   # 检查端口占用
   netstat -tulpn | grep :8000
   ```

3. **权限错误**：
   - 确认用户是比赛创建者
   - 检查用户权限级别
   - 验证比赛状态

4. **检测失败**：
   ```bash
   # 检查 MongoDB 连接
   mongo --eval "db.adminCommand('ping')"
   
   # 查看 Phosphorus 后端日志
   # 检查比赛是否有足够的提交记录
   ```

### 日志文件位置

- **Hydro 日志**: `/path/to/hydro/logs/`
- **Phosphorus 日志**: 控制台输出或配置的日志文件
- **MongoDB 日志**: `/var/log/mongodb/`

## 开发和自定义

### 修改界面

编辑模板文件：
```bash
vim templates/plagiarism_main.html      # 主页面
vim templates/plagiarism_detail.html    # 详情页面
```

### 添加新功能

修改主文件：
```bash
vim index.ts    # 添加新的 Handler 或修改现有逻辑
```

### 调试模式

启用详细日志：
```typescript
// 在 index.ts 中添加
console.log('Debug info:', data);
```

## 安全注意事项

1. **API 安全**：
   - 确保 Phosphorus API 只对授权用户开放
   - 使用 HTTPS 连接（生产环境）
   - 设置适当的防火墙规则

2. **数据保护**：
   - 检测结果可能包含敏感代码信息
   - 确保只有授权用户可以访问
   - 定期清理旧的检测结果

3. **资源限制**：
   - 大型比赛的检测可能消耗大量 CPU 和内存
   - 建议在低峰期进行检测
   - 监控系统资源使用情况

## 技术支持

如有问题，请：

1. 查看本文档的故障排除部分
2. 检查项目 GitHub Issues
3. 联系 CAUCOJ 技术团队

---

**安装完成后，您就可以在 Hydro OJ 中使用强大的抄袭检测功能了！**
