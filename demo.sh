#!/bin/bash

# Phosphorus 抄袭检测插件演示脚本
# 用于展示插件的完整安装和使用流程

echo "=========================================="
echo "  Phosphorus 抄袭检测插件演示"
echo "=========================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 函数：打印带颜色的消息
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查依赖
check_dependencies() {
    print_info "检查系统依赖..."
    
    # 检查 Node.js
    if command -v node &> /dev/null; then
        print_success "Node.js 已安装: $(node --version)"
    else
        print_error "Node.js 未安装，请先安装 Node.js"
        exit 1
    fi
    
    # 检查 Python
    if command -v python3 &> /dev/null; then
        print_success "Python3 已安装: $(python3 --version)"
    else
        print_error "Python3 未安装，请先安装 Python3"
        exit 1
    fi
    
    # 检查 MongoDB
    if command -v mongosh &> /dev/null || command -v mongo &> /dev/null; then
        print_success "MongoDB 客户端已安装"
    else
        print_warning "MongoDB 客户端未安装，部分功能可能无法使用"
    fi
}

# 检查 Phosphorus 后端
check_phosphorus_backend() {
    print_info "检查 Phosphorus 后端服务..."
    
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        print_success "Phosphorus 后端服务正在运行"
        
        # 获取服务信息
        response=$(curl -s http://localhost:8000/health)
        print_info "后端响应: $response"
    else
        print_warning "Phosphorus 后端服务未运行"
        print_info "正在尝试启动后端服务..."
        
        # 尝试启动后端（假设在上级目录）
        cd .. && nohup uv run uvicorn src.main:app --host 0.0.0.0 --port 8000 > /dev/null 2>&1 &
        sleep 5
        
        if curl -s http://localhost:8000/health > /dev/null 2>&1; then
            print_success "后端服务启动成功"
        else
            print_error "后端服务启动失败，请手动启动"
        fi
    fi
}

# 展示插件文件结构
show_plugin_structure() {
    print_info "插件文件结构:"
    echo ""
    tree . 2>/dev/null || find . -type f | sed 's|[^/]*/|- |g'
    echo ""
}

# 验证模板文件
validate_templates() {
    print_info "验证模板文件..."
    
    templates=("plagiarism_main.html" "plagiarism_detail.html" "plagiarism_test.html")
    
    for template in "${templates[@]}"; do
        if [ -f "templates/$template" ]; then
            lines=$(wc -l < "templates/$template")
            print_success "$template: $lines 行"
        else
            print_error "模板文件缺失: $template"
        fi
    done
}

# 测试 API 连接
test_api_connection() {
    print_info "测试 API 连接..."
    
    # 测试健康检查端点
    if response=$(curl -s http://localhost:8000/health); then
        print_success "健康检查: OK"
        echo "  响应: $response"
    else
        print_error "健康检查失败"
    fi
    
    # 测试抄袭检测端点（模拟请求）
    print_info "测试抄袭检测端点..."
    test_data='{"contest_id":"test","min_tokens":9,"similarity_threshold":0.0}'
    
    response_code=$(curl -s -o /dev/null -w "%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -d "$test_data" \
        http://localhost:8000/api/v1/contest/plagiarism)
    
    if [ "$response_code" = "422" ] || [ "$response_code" = "400" ]; then
        print_success "抄袭检测端点响应正常 (HTTP $response_code - 预期错误)"
    elif [ "$response_code" = "200" ]; then
        print_success "抄袭检测端点响应正常 (HTTP $response_code)"
    else
        print_warning "抄袭检测端点响应异常 (HTTP $response_code)"
    fi
}

# 生成安装命令
generate_install_commands() {
    print_info "生成 Hydro 安装命令..."
    
    echo ""
    echo "请在 Hydro 系统中执行以下命令:"
    echo ""
    echo "# 1. 复制插件到 Hydro 插件目录"
    echo "cp -r $(pwd) /path/to/hydro/plugins/"
    echo ""
    echo "# 2. 或创建软链接（推荐开发环境）"
    echo "ln -s $(pwd) /path/to/hydro/plugins/phosphorus-plagiarism"
    echo ""
    echo "# 3. 重启 Hydro 服务"
    echo "pm2 restart hydro"
    echo ""
    echo "# 4. 或如果使用 systemd"
    echo "sudo systemctl restart hydro"
    echo ""
}

# 显示使用说明
show_usage_guide() {
    print_info "使用指南:"
    echo ""
    echo "1. 访问比赛管理页面"
    echo "2. 寻找 '抄袭检测' 按钮或标签页"
    echo "3. 设置检测参数:"
    echo "   - 最小标记数: 1-100 (推荐 9)"
    echo "   - 相似度阈值: 0.0-1.0 (推荐 0.0)"
    echo "4. 点击 '开始抄袭检测'"
    echo "5. 等待分析完成"
    echo "6. 查看和导出结果"
    echo ""
    echo "权限要求:"
    echo "- 比赛创建者"
    echo "- 或具有 PRIV_EDIT_CONTEST 权限的用户"
    echo ""
}

# 主函数
main() {
    echo ""
    check_dependencies
    echo ""
    check_phosphorus_backend
    echo ""
    show_plugin_structure
    echo ""
    validate_templates
    echo ""
    test_api_connection
    echo ""
    generate_install_commands
    echo ""
    show_usage_guide
    
    print_success "演示完成！插件已准备就绪。"
    print_info "请参考 README.md 和 INSTALL.md 获取详细说明。"
}

# 执行主函数
main "$@"
