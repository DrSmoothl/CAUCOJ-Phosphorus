/**
 * Phosphorus 抄袭检测插件前端脚本
 * 用于在比赛管理页面添加抄袭检测入口
 */

// 等待页面加载完成
document.addEventListener('DOMContentLoaded', function() {
    // 检查是否在比赛管理页面
    const currentPath = window.location.pathname;
    const contestManagePattern = /^\/contest\/([^\/]+)\/manage$/;
    const match = currentPath.match(contestManagePattern);
    
    if (match) {
        const contestId = match[1];
        addPlagiarismTab(contestId);
    }
    
    // 检查是否在比赛详情页面
    const contestDetailPattern = /^\/contest\/([^\/]+)$/;
    const detailMatch = currentPath.match(contestDetailPattern);
    
    if (detailMatch) {
        const contestId = detailMatch[1];
        addPlagiarismButton(contestId);
    }
});

/**
 * 在比赛管理页面添加抄袭检测标签页
 */
function addPlagiarismTab(contestId) {
    // 查找标签页容器
    const tabsContainer = document.querySelector('.nav-tabs, .menu, .section__tabs');
    if (!tabsContainer) {
        console.log('未找到标签页容器，尝试添加到其他位置');
        addPlagiarismButtonToSidebar(contestId);
        return;
    }
    
    // 创建抄袭检测标签
    const plagiarismTab = document.createElement('li');
    plagiarismTab.className = 'menu__item';
    
    const link = document.createElement('a');
    link.href = `/contest/${contestId}/plagiarism`;
    link.className = 'menu__link';
    link.innerHTML = `
        <span class="icon icon-search"></span>
        抄袭检测
    `;
    
    plagiarismTab.appendChild(link);
    tabsContainer.appendChild(plagiarismTab);
}

/**
 * 在比赛详情页面添加抄袭检测按钮
 */
function addPlagiarismButton(contestId) {
    // 查找操作按钮区域
    const buttonsContainer = document.querySelector('.section__body .button-group, .section__body');
    if (!buttonsContainer) {
        console.log('未找到按钮容器');
        return;
    }
    
    // 检查用户是否有权限（简单检查，实际权限由后端控制）
    const userPriv = window.UserContext?.priv || 0;
    const isOwner = window.UiContext?.tdoc?.owner === window.UserContext?.uid;
    
    if (!isOwner && userPriv < 32) { // PRIV_EDIT_CONTEST = 32
        return; // 无权限，不显示按钮
    }
    
    // 创建抄袭检测按钮
    const plagiarismButton = document.createElement('a');
    plagiarismButton.href = `/contest/${contestId}/plagiarism`;
    plagiarismButton.className = 'rounded button';
    plagiarismButton.innerHTML = `
        <span class="icon icon-search"></span>
        抄袭检测
    `;
    
    // 添加到按钮容器
    const buttonWrapper = document.createElement('div');
    buttonWrapper.style.marginTop = '10px';
    buttonWrapper.appendChild(plagiarismButton);
    buttonsContainer.appendChild(buttonWrapper);
}

/**
 * 在侧边栏添加抄袭检测链接
 */
function addPlagiarismButtonToSidebar(contestId) {
    // 查找侧边栏
    const sidebar = document.querySelector('.medium-3.columns, .sidebar');
    if (!sidebar) {
        console.log('未找到侧边栏');
        return;
    }
    
    // 创建新的 section
    const section = document.createElement('div');
    section.className = 'section';
    
    const header = document.createElement('div');
    header.className = 'section__header';
    header.innerHTML = '<h3 class="section__title">抄袭检测</h3>';
    
    const body = document.createElement('div');
    body.className = 'section__body';
    
    const link = document.createElement('a');
    link.href = `/contest/${contestId}/plagiarism`;
    link.className = 'rounded primary button';
    link.style.width = '100%';
    link.innerHTML = `
        <span class="icon icon-search"></span>
        检测代码相似度
    `;
    
    body.appendChild(link);
    section.appendChild(header);
    section.appendChild(body);
    sidebar.appendChild(section);
}

/**
 * 实时检测状态更新
 */
class PlagiarismStatusUpdater {
    constructor(contestId) {
        this.contestId = contestId;
        this.isRunning = false;
        this.intervalId = null;
    }
    
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.intervalId = setInterval(() => {
            this.checkStatus();
        }, 5000); // 每5秒检查一次
    }
    
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.isRunning = false;
    }
    
    async checkStatus() {
        try {
            const response = await fetch(`/contest/${this.contestId}/plagiarism`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (response.ok) {
                // 如果检测完成，停止轮询并刷新页面
                this.stop();
                window.location.reload();
            }
        } catch (error) {
            console.log('检查状态失败:', error);
        }
    }
}

// 导出供其他脚本使用
window.PhosphorusPlagiarism = {
    StatusUpdater: PlagiarismStatusUpdater
};
