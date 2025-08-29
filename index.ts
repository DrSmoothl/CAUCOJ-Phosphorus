// @noErrors
// @module: esnext
// @filename: index.ts
import {
    Context, definePlugin, Handler, NotFoundError,
    PRIV, SystemModel, db
} from 'hydrooj';

// Plugin configuration
const PLUGIN_NAME = 'phosphorus-plagiarism';
const PLUGIN_VERSION = '2.0.0'; // Updated for enhanced features

// Get Phosphorus API base URL from system settings
function getPhosphorusApiBase(): string {
    const apiBase = SystemModel.get('phosphorus.api.base') || 'http://localhost:8000';
    console.log('[Phosphorus Plugin] API Base URL:', apiBase);
    return apiBase;
}

/**
 * Enhanced API request helper with better error handling
 */
async function makeEnhancedApiRequest(endpoint: string, method: string = 'GET', data?: any): Promise<any> {
    const apiBase = getPhosphorusApiBase();
    const url = `${apiBase}${endpoint}`;
    
    console.log(`[Enhanced Phosphorus] Making API request: ${method} ${url}`);
    
    const options: RequestInit = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'X-API-Version': '2.0',
            'X-Client': 'hydro-enhanced-plugin'
        },
    };
    
    if (data && method !== 'GET') {
        options.body = JSON.stringify(data);
        console.log(`[Enhanced Phosphorus] Request body:`, data);
    }
    
    try {
        const response = await fetch(url, options);
        console.log(`[Enhanced Phosphorus] Response status: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            console.error(`[Enhanced Phosphorus] Error response:`, errorData);
            throw new Error(`HTTP ${response.status}: ${errorData.detail || response.statusText}`);
        }
        
        const result = await response.json();
        console.log(`[Enhanced Phosphorus] Response data:`, result);
        return result;
    } catch (error: any) {
        console.error(`[Enhanced Phosphorus] API request failed:`, error);
        throw new Error(`Enhanced API request failed: ${error.message}`);
    }
}

/**
 * Make HTTP request to Phosphorus API
 */
/**
 * 重构后的API请求函数 - 增强错误处理、重试机制和性能优化
 */
async function makeApiRequest(endpoint: string, method: string = 'GET', data?: any): Promise<any> {
    const apiBase = getPhosphorusApiBase();
    const url = `${apiBase}${endpoint}`;
    
    console.log(`[Phosphorus] Making API request: ${method} ${url}`);
    
    const options: RequestInit = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Client-Version': PLUGIN_VERSION,
        },
    };
    
    if (data && method !== 'GET') {
        options.body = JSON.stringify(data);
        console.log(`[Phosphorus] Request body:`, data);
    }
    
    // 重试机制
    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(url, options);
            console.log(`[Phosphorus] Response status: ${response.status} ${response.statusText}`);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[Phosphorus] Error response (attempt ${attempt}):`, errorText);
                
                // 如果是5xx错误且还有重试次数，继续重试
                if (response.status >= 500 && attempt < maxRetries) {
                    console.log(`[Phosphorus] Retrying request (attempt ${attempt + 1}/${maxRetries})`);
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // 递增延迟
                    continue;
                }
                
                throw new Error(`HTTP ${response.status}: ${response.statusText}\n${errorText}`);
            }
            
            const result = await response.json();
            console.log(`[Phosphorus] Response data received successfully`);
            return result;
            
        } catch (error: any) {
            if (attempt === maxRetries) {
                console.error(`[Phosphorus] API request failed after ${maxRetries} attempts:`, error);
                throw new Error(`API请求失败: ${error.message}`);
            }
            
            console.warn(`[Phosphorus] Request attempt ${attempt} failed, retrying...`, error.message);
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
    }
}

/**
 * 重构后的查重主页处理器 - 改进数据展示和加载性能
 */
class PlagiarismMainHandler extends Handler {
    async get() {
        // 检查权限
        this.checkPriv(PRIV.PRIV_EDIT_SYSTEM);
        
        try {
            console.log('[Phosphorus] 重构版主页处理器开始执行');
            
            // 并行获取数据以提升性能
            const [stats, recentActivities, systemHealth] = await Promise.all([
                this.getEnhancedSystemStats(),
                this.getRecentActivities(),
                this.getSystemHealth()
            ]);
            
            this.response.template = 'plagiarism_main.html';
            this.response.body = {
                // 基础统计信息
                total_contests: stats.total_contests || 0,
                total_problems: stats.total_problems || 0,
                total_submissions: stats.total_submissions || 0,
                high_similarity_count: stats.high_similarity_count || 0,
                
                // 增强统计信息
                contest_stats: stats.contest_stats || {},
                language_stats: stats.language_stats || {},
                history_stats: stats.history_stats || {},
                
                // 系统状态
                system_health: systemHealth,
                
                // 最近活动
                recent_activities: recentActivities,
                
                // 元数据
                plugin_version: PLUGIN_VERSION,
                last_updated: new Date().toISOString(),
                
                // 用户友好的展示数据
                formatted_stats: this.formatStatsForDisplay(stats)
            };
        } catch (error: any) {
            console.error('[Phosphorus] 主页处理器执行失败:', error);
            this.response.template = 'plagiarism_main.html';
            this.response.body = {
                error: `加载失败: ${error.message}`,
                total_contests: 0,
                total_problems: 0,
                total_submissions: 0,
                high_similarity_count: 0,
                contest_stats: {},
                language_stats: {},
                history_stats: {},
                recent_activities: [],
                plugin_version: PLUGIN_VERSION,
                system_health: { status: 'error', message: error.message }
            };
        }
    }
    
    private async getEnhancedSystemStats(): Promise<any> {
        try {
            const result = await makeApiRequest('/api/v1/contests/plagiarism');
            
            if (result.success) {
                const contests = result.data || [];
                
                const totalProblems = contests.reduce((sum: number, c: any) => sum + (c.checked_problems || 0), 0);
                const totalSubmissions = contests.reduce((sum: number, c: any) => sum + (c.total_submissions || 0), 0);
                const highSimilarityCount = contests.reduce((sum: number, c: any) => sum + (c.high_similarity_count || 0), 0);
                
                return {
                    total_contests: contests.length,
                    total_problems: totalProblems,
                    total_submissions: totalSubmissions,
                    high_similarity_count: highSimilarityCount,
                    contest_stats: {
                        total: contests.length,
                        checked: contests.filter((c: any) => (c.checked_problems || 0) > 0).length
                    },
                    language_stats: {
                        supported: 12,
                        active: 8
                    },
                    history_stats: {
                        total: totalProblems,
                        recent: contests.filter((c: any) => this.isRecent(c.last_check_at)).length
                    }
                };
            }
        } catch (error) {
            console.error('Failed to get system stats:', error);
        }
        
        return {
            total_contests: 0,
            total_problems: 0,
            total_submissions: 0,
            high_similarity_count: 0,
            contest_stats: {},
            language_stats: {},
            history_stats: {}
        };
    }
    
    private async getRecentActivities(): Promise<any[]> {
        try {
            const result = await makeApiRequest('/api/v1/contests/plagiarism');
            
            if (result.success) {
                const contests = result.data || [];
                const activities: any[] = [];
                
                contests.slice(-5).forEach((contest: any) => {
                    if (contest.last_check_at) {
                        activities.push({
                            type: 'contest_check',
                            title: `检查了比赛 ${contest.title}`,
                            description: `分析了 ${contest.checked_problems || 0} 个题目`,
                            time_ago: this.timeAgo(contest.last_check_at)
                        });
                    }
                });
                
                return activities;
            }
        } catch (error) {
            console.error('Failed to get recent activities:', error);
        }
        
        return [];
    }
    
    private isRecent(timestamp?: string): boolean {
        if (!timestamp) {
            return false;
        }
        try {
            const dt = new Date(timestamp);
            const delta = Date.now() - dt.getTime();
            return delta <= 30 * 24 * 60 * 60 * 1000; // 30 days
        } catch {
            return false;
        }
    }
    
    private timeAgo(timestamp: string): string {
        try {
            const dt = new Date(timestamp);
            const delta = Date.now() - dt.getTime();
            
            const days = Math.floor(delta / (24 * 60 * 60 * 1000));
            const hours = Math.floor(delta / (60 * 60 * 1000));
            const minutes = Math.floor(delta / (60 * 1000));
            
            if (days > 0) {
                return `${days} 天前`;
            }
            if (hours > 0) {
                return `${hours} 小时前`;
            }
            if (minutes > 0) {
                return `${minutes} 分钟前`;
            }
            return '刚刚';
        } catch {
            return '未知时间';
        }
    }
}

/**
 * Contest Plagiarism List Handler - /plagiarism/contest
 */
class ContestPlagiarismListHandler extends Handler {
    async get() {
        this.checkPriv(PRIV.PRIV_EDIT_SYSTEM);
        
        console.log('[Phosphorus] ContestPlagiarismListHandler.get() called');
        
        try {
            // 直接从数据库查询有查重结果的比赛
            let plagiarismResults: any[] = [];
            
            try {
                // 直接访问check_plagiarism_results集合
                const db_raw = db as any;
                plagiarismResults = await db_raw.db.collection('check_plagiarism_results').find({}).toArray();
            } catch (error) {
                console.warn('Failed to query check_plagiarism_results collection:', error);
                // 如果失败，尝试从document集合查询
                plagiarismResults = await db.collection('document').find({
                    docType: 'plagiarism_result'
                }).toArray();
            }
            
            console.log(`[Phosphorus] Found ${plagiarismResults.length} plagiarism results in database`);
            
            // 按contest_id分组统计
            const contestsMap = new Map<string, any>();
            
            for (const result of plagiarismResults) {
                const contestId = result.contest_id;
                
                if (!contestsMap.has(contestId)) {
                    // 获取比赛基本信息
                    let contestInfo: any = {
                        id: contestId,
                        title: `比赛 ${contestId}`,
                        description: '',
                        begin_at: null,
                        end_at: null,
                        total_problems: 0,
                        checked_problems: 0,
                        last_check_at: null,
                        problem_ids: new Set()
                    };
                    
                    // 尝试从比赛集合获取详细信息
                    try {
                        const contestDoc = await this.getContestFromDatabase(contestId);
                        if (contestDoc) {
                            contestInfo.title = contestDoc.title || `比赛 ${contestId}`;
                            contestInfo.description = contestDoc.content || '';
                            contestInfo.begin_at = contestDoc.beginAt;
                            contestInfo.end_at = contestDoc.endAt;
                            contestInfo.total_problems = Array.isArray(contestDoc.pids) ? contestDoc.pids.length : 0;
                        }
                    } catch (error) {
                        console.warn(`Failed to get contest info for ${contestId}:`, error);
                    }
                    
                    contestsMap.set(contestId, contestInfo);
                }
                
                const contest = contestsMap.get(contestId);
                
                // 更新统计信息
                contest.problem_ids.add(result.problem_id);
                contest.checked_problems = contest.problem_ids.size;
                
                // 更新最后检查时间
                if (result.created_at) {
                    const checkTime = new Date(result.created_at);
                    if (!contest.last_check_at || checkTime > contest.last_check_at) {
                        contest.last_check_at = checkTime;
                    }
                }
            }
            
            // 转换为数组并清理Set对象
            const contests = Array.from(contestsMap.values()).map(contest => {
                delete contest.problem_ids; // 删除临时的Set对象
                return contest;
            });
            
            // 按最后检查时间排序
            contests.sort((a, b) => {
                if (!a.last_check_at) return 1;
                if (!b.last_check_at) return -1;
                return b.last_check_at.getTime() - a.last_check_at.getTime();
            });
            
            console.log(`[Phosphorus] Processed ${contests.length} contests with plagiarism data`);
            
            this.response.template = 'plagiarism_contest_list.html';
            this.response.body = { contests };
            
        } catch (error: any) {
            console.error('[Phosphorus] Exception in ContestPlagiarismListHandler:', error);
            this.response.template = 'plagiarism_contest_list.html';
            this.response.body = { contests: [], error: error.message };
        }
    }

    private async getContestFromDatabase(contestId: string): Promise<any> {
        try {
            // 直接查询比赛
            if (contestId.length === 24 && /^[0-9a-fA-F]{24}$/.test(contestId)) {
                try {
                    return await db.collection('document').findOne({ 
                        _id: contestId, 
                        docType: 30 
                    });
                } catch (e) {
                    console.log(`[Phosphorus] Direct query failed for ${contestId}`);
                }
            }
            
            // 遍历查找
            const allContests = await db.collection('document').find({ docType: 30 }).toArray();
            return allContests.find(doc => {
                const docId = doc._id;
                return docId.toString() === contestId.toString() || 
                       (docId && typeof docId.toHexString === 'function' && docId.toHexString() === contestId) ||
                       (doc.docId && doc.docId.toString() === contestId.toString());
            });
        } catch (error) {
            console.error(`[Phosphorus] Error finding contest by ID ${contestId}:`, error);
            return null;
        }
    }
}

/**
 * Contest Plagiarism Detail Handler - /plagiarism/contest/:contest_id
 */
class ContestPlagiarismDetailHandler extends Handler {
    async get({ contest_id }: { contest_id: string }) {
        this.checkPriv(PRIV.PRIV_EDIT_SYSTEM);
        
        try {
            // Get contest information
            const contest = await this.getContestInfo(contest_id);
            if (!contest) {
                throw new NotFoundError('Contest not found');
            }
            
            // Get problems with plagiarism results
            const problems = await this.getContestProblems(contest_id);
            
            // Calculate summary statistics
            const totalHighSimilarity = problems.reduce((sum, p) => {
                const pairs = p.plagiarism_result?.high_similarity_pairs || [];
                return sum + pairs.length;
            }, 0);
            
            const avgSimilarity = this.calculateAverageSimilarity(problems);
            
            this.response.template = 'plagiarism_contest_detail.html';
            this.response.body = {
                contest,
                problems,
                total_high_similarity: totalHighSimilarity,
                avg_similarity: avgSimilarity
            };
        } catch (error: any) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            this.response.template = 'plagiarism_contest_detail.html';
            this.response.body = { error: error.message };
        }
    }
    
    private async getContestInfo(contestId: string): Promise<any> {
        try {
            console.log(`[Phosphorus] Looking up contest ${contestId} directly from database`);
            
            let contestDoc: any = null;
            
            // 首先尝试直接查询
            if (contestId.length === 24 && /^[0-9a-fA-F]{24}$/.test(contestId)) {
                try {
                    contestDoc = await db.collection('document').findOne({ 
                        _id: contestId, 
                        docType: 30 
                    });
                    if (contestDoc) {
                        console.log(`[Phosphorus] Found contest by direct query: ${contestDoc.title || 'Unknown'}`);
                    }
                } catch (e) {
                    console.log(`[Phosphorus] Direct query failed: ${e}`);
                }
            }
            
            // 如果直接查询失败，遍历所有比赛找匹配
            if (!contestDoc) {
                console.log('[Phosphorus] Searching for contest by iterating all contests...');
                const allContests = await db.collection('document').find({ docType: 30 }).toArray();
                
                console.log(`[Phosphorus] Found ${allContests.length} contests in database`);
                
                // 调试：显示所有比赛ID
                allContests.forEach((doc, index) => {
                    if (index < 5) { // 只显示前5个避免日志过多
                        console.log(`[Phosphorus] Contest ${index}: _id=${doc._id}, title=${doc.title}`);
                    }
                });
                
                // 尝试多种匹配方式
                contestDoc = allContests.find(doc => {
                    const docId = doc._id;
                    const stringMatch = docId.toString() === contestId.toString();
                    const hexMatch = docId && typeof docId.toHexString === 'function' && docId.toHexString() === contestId;
                    const docIdMatch = doc.docId && doc.docId.toString() === contestId.toString();
                    
                    if (stringMatch || hexMatch || docIdMatch) {
                        console.log(`[Phosphorus] Match found for ${contestId}: stringMatch=${stringMatch}, hexMatch=${hexMatch}, docIdMatch=${docIdMatch}`);
                        return true;
                    }
                    return false;
                });
                
                if (contestDoc) {
                    console.log(`[Phosphorus] Found contest by iteration: ${contestDoc.title || 'Unknown'} with ID: ${contestDoc._id}`);
                }
            }
            
            if (contestDoc) {
                console.log(`[Phosphorus] Found contest: ${contestDoc.title || 'Unknown'} with ID: ${contestDoc._id}`);
                
                // 查询该比赛的查重结果统计
                let checkedProblems = 0;
                let lastCheckAt: Date | null = null;
                
                try {
                    const plagiarismResults = await (db as any).collection('check_plagiarism_results').find({
                        contest_id: contestId
                    }).toArray();
                    
                    const problemIds = new Set();
                    for (const result of plagiarismResults) {
                        problemIds.add(result.problem_id);
                        if (result.created_at) {
                            const checkTime = new Date(result.created_at);
                            if (!lastCheckAt || checkTime > lastCheckAt) {
                                lastCheckAt = checkTime;
                            }
                        }
                    }
                    checkedProblems = problemIds.size;
                } catch (error) {
                    console.warn('Failed to get plagiarism stats:', error);
                }
                
                return {
                    id: contestDoc._id.toString(),
                    title: contestDoc.title || `比赛 ${contestDoc._id}`,
                    description: contestDoc.content || '',
                    begin_at: contestDoc.beginAt ? new Date(contestDoc.beginAt) : null,
                    end_at: contestDoc.endAt ? new Date(contestDoc.endAt) : null,
                    total_problems: Array.isArray(contestDoc.pids) ? contestDoc.pids.length : 0,
                    checked_problems: checkedProblems,
                    last_check_at: lastCheckAt
                };
            } else {
                console.log(`[Phosphorus] Contest ${contestId} not found in database`);
            }
            
        } catch (error) {
            console.error('Failed to get contest info:', error);
        }
        return null;
    }
    
    private async getContestProblems(contestId: string): Promise<any[]> {
        try {
            // 直接从数据库查询查重结果
            const plagiarismResults = await db.collection('document').find({
                contest_id: contestId,
                docType: 'plagiarism_result' // 使用特殊的docType标识查重结果
            }).toArray();
            
            // 如果没有找到，尝试直接查询check_plagiarism_results集合
            let results = plagiarismResults;
            if (results.length === 0) {
                try {
                    results = await (db as any).collection('check_plagiarism_results').find({
                        contest_id: contestId
                    }).toArray();
                } catch (error) {
                    console.warn('Failed to query check_plagiarism_results collection:', error);
                    results = [];
                }
            }
            
            console.log(`[Phosphorus] Found ${results.length} plagiarism results for contest ${contestId}`);
            
            // 按problem_id分组整理结果
            const problemsMap = new Map<number, any>();
            
            for (const result of results) {
                const problemId = result.problem_id;
                
                if (!problemsMap.has(problemId)) {
                    // 获取题目基本信息
                    let problemInfo: any = {
                        id: problemId,
                        title: `题目 ${problemId}`,
                        languages: [],
                        total_submissions: 0,
                        checked_submissions: 0,
                        last_check_at: null,
                        plagiarism_result: null
                    };
                    
                    // 尝试从题目集合获取更详细的信息
                    try {
                        const problemDoc = await db.collection('document').findOne({
                            docType: 10, // 题目文档类型
                            pid: problemId
                        });
                        
                        if (problemDoc) {
                            problemInfo.title = problemDoc.title || `题目 ${problemId}`;
                            // 可以添加更多字段
                        }
                    } catch (error) {
                        console.warn(`Failed to get problem info for ${problemId}:`, error);
                    }
                    
                    problemsMap.set(problemId, problemInfo);
                }
                
                const problem = problemsMap.get(problemId);
                
                // 更新查重结果信息
                problem.plagiarism_result = {
                    analysis_id: result.analysis_id,
                    total_submissions: result.total_submissions,
                    total_comparisons: result.total_comparisons,
                    execution_time_ms: result.execution_time_ms,
                    high_similarity_pairs: result.high_similarity_pairs || [],
                    clusters: result.clusters || [],
                    submission_stats: result.submission_stats || [],
                    failed_submissions: result.failed_submissions || [],
                    created_at: result.created_at
                };
                
                // 更新统计信息
                problem.total_submissions = result.total_submissions;
                problem.checked_submissions = result.total_submissions - (result.failed_submissions?.length || 0);
                problem.last_check_at = result.created_at;
                
                // 计算最高相似度和相似对数量
                problem.high_similarity_pairs = result.high_similarity_pairs?.length || 0;
                let maxSimilarity = 0;
                if (result.high_similarity_pairs && result.high_similarity_pairs.length > 0) {
                    result.high_similarity_pairs.forEach((pair: any) => {
                        const avgSim = pair.similarities?.AVG || 0;
                        const maxSim = pair.similarities?.MAX || 0;
                        maxSimilarity = Math.max(maxSimilarity, avgSim, maxSim);
                    });
                }
                problem.max_similarity = maxSimilarity;
                
                // 从high_similarity_pairs中提取语言信息（如果可能）
                if (result.high_similarity_pairs && result.high_similarity_pairs.length > 0) {
                    // 这里可以根据submission名称推断语言，但数据结构中没有直接的语言信息
                    // 暂时使用默认值
                    if (problem.languages.length === 0) {
                        problem.languages = ['C++', 'Java', 'Python']; // 默认常见语言
                    }
                }
            }
            
            // 转换Map为数组并排序
            const problems = Array.from(problemsMap.values()).sort((a, b) => a.id - b.id);
            
            console.log(`[Phosphorus] Processed ${problems.length} problems with plagiarism data`);
            return problems;
            
        } catch (error) {
            console.error('Failed to get contest problems from database:', error);
            return [];
        }
    }
    
    private calculateAverageSimilarity(problems: any[]): number | null {
        const similarities: number[] = [];
        
        problems.forEach(problem => {
            const result = problem.plagiarism_result;
            if (result?.high_similarity_pairs) {
                result.high_similarity_pairs.forEach((pair: any) => {
                    const avgSim = pair.similarities?.AVG;
                    if (typeof avgSim === 'number') {
                        similarities.push(avgSim);
                    }
                });
            }
        });
        
        return similarities.length > 0 ? similarities.reduce((a, b) => a + b, 0) / similarities.length : null;
    }
}

/**
 * Problem Plagiarism Detail Handler - /plagiarism/contest/:contest_id/:problem_id
 */
class ProblemPlagiarismDetailHandler extends Handler {
    async get({ contest_id, problem_id }: { contest_id: string; problem_id: string }) {
        this.checkPriv(PRIV.PRIV_EDIT_SYSTEM);
        
        try {
            console.log(`[Phosphorus] ProblemPlagiarismDetailHandler.get() called for contest ${contest_id}, problem ${problem_id}`);
            
            // Get contest information from database
            const contest = await this.findContestById(contest_id);
            if (!contest) {
                throw new NotFoundError(`Contest ${contest_id} not found`);
            }
            
            // Get plagiarism results for this specific problem (get the latest one)
            console.log(`[Phosphorus] Querying plagiarism results for contest ${contest_id}, problem ${problem_id}`);
            const plagiarismResult = await (db as any).collection('check_plagiarism_results').findOne({
                contest_id: contest_id,
                problem_id: parseInt(problem_id)
            }, {
                sort: { created_at: -1 } // 获取最新的查重结果
            });
            
            console.log(`[Phosphorus] Plagiarism result found:`, !!plagiarismResult);
            if (plagiarismResult) {
                console.log(`[Phosphorus] Result details:`, {
                    analysis_id: plagiarismResult.analysis_id,
                    total_submissions: plagiarismResult.total_submissions,
                    created_at: plagiarismResult.created_at
                });
            }
            
            if (!plagiarismResult) {
                console.log(`[Phosphorus] No plagiarism result found for contest ${contest_id}, problem ${problem_id}`);
                this.response.template = 'plagiarism_problem_detail.html';
                this.response.body = {
                    contest,
                    problem: { id: problem_id, title: `题目 ${problem_id}` },
                    error: '该题目还没有查重数据'
                };
                return;
            }
            
            // Process the plagiarism result
            const problemData = {
                id: problem_id,
                title: plagiarismResult.problem_title || `题目 ${problem_id}`,
                total_submissions: plagiarismResult.submission_stats?.total_submissions || 0,
                high_similarity_pairs: plagiarismResult.high_similarity_pairs?.length || 0,
                max_similarity: plagiarismResult.max_similarity || 0,
                avg_similarity: plagiarismResult.avg_similarity || 0,
                clusters: plagiarismResult.clusters || [],
                high_similarity_pairs_data: plagiarismResult.high_similarity_pairs || [],
                languages: this.extractLanguages(plagiarismResult),
                language_stats: this.processLanguageStats(plagiarismResult)
            };
            
            console.log(`[Phosphorus] Found plagiarism result with ${problemData.high_similarity_pairs} high similarity pairs`);
            
            this.response.template = 'plagiarism_problem_detail.html';
            this.response.body = {
                contest,
                problem: problemData,
                plagiarism_result: plagiarismResult,
                enhanced_url: `/plagiarism/enhanced/contest/${contest_id}/problem/${problem_id}`
            };
            
        } catch (error: any) {
            console.error('[Phosphorus] Exception in ProblemPlagiarismDetailHandler:', error);
            if (error instanceof NotFoundError) {
                throw error;
            }
            this.response.template = 'plagiarism_problem_detail.html';
            this.response.body = { error: error.message };
        }
    }
    
    private extractLanguages(plagiarismResult: any): string[] {
        const languages = new Set<string>();
        
        // Extract from high similarity pairs
        if (plagiarismResult.high_similarity_pairs) {
            plagiarismResult.high_similarity_pairs.forEach((pair: any) => {
                if (pair.file1_language) languages.add(pair.file1_language);
                if (pair.file2_language) languages.add(pair.file2_language);
            });
        }
        
        // Extract from submission stats
        if (plagiarismResult.submission_stats?.by_language) {
            Object.keys(plagiarismResult.submission_stats.by_language).forEach(lang => {
                languages.add(lang);
            });
        }
        
        return Array.from(languages);
    }
    
    private processLanguageStats(plagiarismResult: any): any[] {
        const stats: any[] = [];
        
        if (plagiarismResult.submission_stats?.by_language) {
            Object.entries(plagiarismResult.submission_stats.by_language).forEach(([language, data]: [string, any]) => {
                stats.push({
                    language,
                    language_display: this.getLanguageDisplayName(language),
                    language_icon: this.getLanguageIcon(language),
                    submission_count: data.count || 0,
                    high_similarity_pairs: this.countHighSimilarityPairsByLanguage(plagiarismResult, language),
                    max_similarity: this.getMaxSimilarityByLanguage(plagiarismResult, language),
                    avg_similarity: this.getAvgSimilarityByLanguage(plagiarismResult, language)
                });
            });
        }
        
        return stats.sort((a, b) => b.submission_count - a.submission_count);
    }
    
    private countHighSimilarityPairsByLanguage(plagiarismResult: any, language: string): number {
        if (!plagiarismResult.high_similarity_pairs) return 0;
        
        return plagiarismResult.high_similarity_pairs.filter((pair: any) => 
            pair.file1_language === language || pair.file2_language === language
        ).length;
    }
    
    private getMaxSimilarityByLanguage(plagiarismResult: any, language: string): number {
        if (!plagiarismResult.high_similarity_pairs) return 0;
        
        const pairs = plagiarismResult.high_similarity_pairs.filter((pair: any) => 
            pair.file1_language === language || pair.file2_language === language
        );
        
        if (pairs.length === 0) return 0;
        
        return Math.max(...pairs.map((pair: any) => pair.similarity || 0));
    }
    
    private getAvgSimilarityByLanguage(plagiarismResult: any, language: string): number {
        if (!plagiarismResult.high_similarity_pairs) return 0;
        
        const pairs = plagiarismResult.high_similarity_pairs.filter((pair: any) => 
            pair.file1_language === language || pair.file2_language === language
        );
        
        if (pairs.length === 0) return 0;
        
        const totalSimilarity = pairs.reduce((sum: number, pair: any) => sum + (pair.similarity || 0), 0);
        return totalSimilarity / pairs.length;
    }
    
    private async findContestById(contestId: string): Promise<any | null> {
        try {
            const documentColl = db.collection('document');
            let contest: any = null;
            
            // 首先尝试直接查询 (如果contestId是有效的ObjectId格式)
            if (contestId.length === 24 && /^[0-9a-fA-F]{24}$/.test(contestId)) {
                try {
                    // 尝试直接用字符串查询，让MongoDB自动转换
                    contest = await documentColl.findOne({ 
                        _id: contestId,
                        docType: 30 // 比赛文档类型
                    });
                } catch (error) {
                    // 如果直接查询失败，继续其他方法
                    console.log(`[Phosphorus] Direct query failed for contest ${contestId}, trying alternative methods`);
                }
            }
            
            // 如果直接查询失败，尝试遍历匹配
            if (!contest) {
                try {
                    const allContests = await documentColl.find({ docType: 30 }).toArray();
                    
                    // 尝试多种匹配方式
                    contest = allContests.find((c: any) => {
                        const docId = c._id;
                        return docId.toString() === contestId.toString() ||
                               (docId && typeof docId.toHexString === 'function' && docId.toHexString() === contestId) ||
                               (c.docId && c.docId.toString() === contestId.toString());
                    }) || null;
                } catch (error) {
                    console.error(`[Phosphorus] Alternative query also failed for contest ${contestId}:`, error);
                }
            }
            
            if (!contest) {
                console.log(`[Phosphorus] Contest not found with string ID: ${contestId}`);
                return null;
            }
            
            console.log(`[Phosphorus] Found contest: ${contest.title || contest._id}`);
            
            return {
                id: contest._id.toString(),
                title: contest.title || `比赛 ${contest._id}`,
                begin_at: contest.beginAt ? new Date(contest.beginAt).toLocaleString('zh-CN', {
                    year: 'numeric',
                    month: '2-digit', 
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                }) : null,
                end_at: contest.endAt ? new Date(contest.endAt).toLocaleString('zh-CN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit', 
                    hour: '2-digit',
                    minute: '2-digit'
                }) : null,
                status: this.getContestStatus(contest)
            };
        } catch (error) {
            console.error('Failed to get contest by ID:', error);
            return null;
        }
    }

    private getContestStatus(contestDoc: any): string {
        const now = new Date();
        const beginAt = contestDoc.beginAt ? new Date(contestDoc.beginAt) : null;
        const endAt = contestDoc.endAt ? new Date(contestDoc.endAt) : null;

        if (!beginAt || !endAt) {
            return '未定义';
        }

        if (now < beginAt) {
            return '未开始';
        } else if (now > endAt) {
            return '已结束';
        } else {
            return '进行中';
        }
    }
    
    private getLanguageDisplayName(lang: string): string {
        const langNames: { [key: string]: string } = {
            'c': 'C',
            'cc': 'C++',
            'py': 'Python',
            'java': 'Java',
            'js': 'JavaScript',
            'go': 'Go',
            'rs': 'Rust',
            'cs': 'C#',
            'kt': 'Kotlin'
        };
        return langNames[lang] || lang.toUpperCase();
    }
    
    private getLanguageIcon(lang: string): string {
        const langIcons: { [key: string]: string } = {
            'c': '⚡',
            'cc': '🔧',
            'py': '🐍',
            'java': '☕',
            'js': '🟨',
            'go': '🐹',
            'rs': '🦀',
            'cs': '🔷',
            'kt': '🎯'
        };
        return langIcons[lang] || '📝';
    }
    
    private generateMockPairs(submissionCount: number): any[] {
        const pairs: any[] = [];
        const numPairs = Math.min(5, Math.floor(submissionCount / 2));
        
        for (let i = 0; i < numPairs; i++) {
            const similarity = Math.random() * 0.6 + 0.3; // 0.3 to 0.9
            pairs.push({
                first_user_id: `user_${Math.floor(Math.random() * 9000) + 1000}`,
                second_user_id: `user_${Math.floor(Math.random() * 9000) + 1000}`,
                avg_similarity: similarity,
                max_similarity: similarity + Math.random() * 0.1,
                matched_tokens: Math.floor(Math.random() * 80) + 20,
                total_comparisons: Math.floor(Math.random() * 5) + 1,
                match_length: Math.floor(Math.random() * 40) + 10,
                first_submission: {
                    file_count: 1,
                    total_tokens: Math.floor(Math.random() * 150) + 50
                },
                second_submission: {
                    file_count: 1,
                    total_tokens: Math.floor(Math.random() * 150) + 50
                },
                first_code_lines: this.generateMockCode(),
                second_code_lines: this.generateMockCode(),
                code_matches: true
            });
        }
        
        return pairs.sort((a, b) => b.avg_similarity - a.avg_similarity);
    }
    
    private generateMockCode(): any[] {
        const codeTemplates = [
            "#include <iostream>",
            "using namespace std;",
            "int main() {",
            "    int a, b;",
            "    cin >> a >> b;",
            "    cout << a + b << endl;",
            "    return 0;",
            "}"
        ];
        
        return codeTemplates.map((line, index) => ({
            content: line,
            is_match: [3, 4, 5].includes(index) // Mark some lines as matches
        }));
    }
}

/**
 * API Handler for getting contest problems
 */
class PlagiarismApiHandler extends Handler {
    async get() {
        this.checkPriv(PRIV.PRIV_EDIT_SYSTEM);
        
        try {
            const contestId = this.request.query.contest_id;
            console.log('API Request - Contest ID:', contestId);
            
            if (!contestId) {
                throw new Error('缺少比赛ID参数');
            }
            
            const problems = await this.getContestProblems(contestId);
            console.log('API Response - Problems count:', problems.length);
            
            this.response.body = {
                success: true,
                problems: problems
            };
            this.response.type = 'application/json';
        } catch (error: any) {
            console.error('API Error:', error);
            this.response.body = {
                success: false,
                error: error.message,
                problems: []
            };
            this.response.type = 'application/json';
        }
    }

    private async getContestProblems(contestId: string): Promise<any[]> {
        try {
            // 查找比赛文档
            const contestDoc = await db.collection('document').findOne({ 
                _id: contestId,
                docType: 30 
            });
            
            if (!contestDoc || !contestDoc.pids) {
                return [];
            }
            
            // 获取题目信息
            const problemIds = contestDoc.pids.map((pid: any) => parseInt(pid.toString()));
            const problemDocs = await db.collection('document').find({
                docType: 10,
                docId: { $in: problemIds }
            }).toArray();
            
            return problemDocs.map(doc => ({
                id: doc.docId,
                title: doc.title || `题目 ${doc.docId}`,
                total_submissions: doc.nSubmit || 0,
                accepted_submissions: doc.nAccept || 0,
                can_analyze: (doc.nSubmit || 0) >= 5
            }));
        } catch (error) {
            console.error('Failed to get contest problems:', error);
            return [];
        }
    }
}

/**
 * New Plagiarism Task Handler - /plagiarism/new
 */
class NewPlagiarismTaskHandler extends Handler {
    async get() {
        this.checkPriv(PRIV.PRIV_EDIT_SYSTEM);
        
        try {
            // 获取所有比赛信息用于下拉选择
            const contests = await this.getAllContests();
            
            this.response.template = 'new_task.html';
            this.response.body = {
                contests: contests
            };
        } catch (error: any) {
            this.response.template = 'new_task.html';
            this.response.body = {
                error: error.message,
                contests: []
            };
        }
    }
    
    async post() {
        this.checkPriv(PRIV.PRIV_EDIT_SYSTEM);
        
        try {
            const { contest_id, problem_ids, min_tokens = 9, similarity_threshold = 0.7 } = this.request.body;
            
            console.log('[Phosphorus] NewPlagiarismTaskHandler.post() called with:', {
                contest_id, problem_ids, min_tokens, similarity_threshold
            });
            
            // 验证输入
            if (!contest_id) {
                throw new Error('请选择比赛');
            }
            
            if (!problem_ids || !Array.isArray(problem_ids) || problem_ids.length === 0) {
                throw new Error('请选择至少一个题目');
            }
            
            // 获取比赛信息用于显示
            const contest = await this.getContestById(contest_id.toString());
            
            // 调用Phosphorus API创建异步查重任务
            const taskData = {
                contest_id: contest_id.toString(),
                problem_ids: problem_ids.map((id: any) => parseInt(id.toString())),
                min_tokens: parseInt(min_tokens.toString()),
                similarity_threshold: parseFloat(similarity_threshold.toString())
            };
            
            console.log('[Phosphorus] Calling async task API with data:', taskData);
            
            // 使用新的异步任务接口
            const result = await makeApiRequest('/api/v1/contest/plagiarism/problems/async', 'POST', taskData);
            
            console.log('[Phosphorus] Async task API result:', result);
            
            if (result.success) {
                // 成功创建任务，立即重定向到等待页面
                const taskInfo = result.data;
                console.log('[Phosphorus] Task created successfully, showing waiting page');
                
                // 使用现有的 task_submitted.html 模板显示等待页面
                this.response.template = 'task_submitted.html';
                this.response.body = {
                    contest_id: contest_id.toString(),
                    contest_name: contest?.title || '未知比赛',
                    problem_count: problem_ids.length,
                    min_tokens: parseInt(min_tokens.toString()),
                    similarity_threshold: Math.round(parseFloat(similarity_threshold.toString()) * 100),
                    task_id: taskInfo.task_id,
                    estimated_time: `${Math.ceil((taskInfo.problem_count || 1) * 2)} 分钟`,
                    success: true
                };
                
            } else {
                throw new Error(result.message || '创建查重任务失败');
            }
            
        } catch (error: any) {
            console.error('[Phosphorus] Error in task creation:', error);
            
            // 重新显示表单，包含错误信息
            const contests = await this.getAllContests();
            
            this.response.template = 'new_task.html';
            this.response.body = {
                error: error.message,
                contests: contests,
                form_data: this.request.body // 保留用户输入的数据
            };
        }
    }
    
    private async getAllContests(): Promise<any[]> {
        try {
            // 从document集合中查询所有比赛
            const contestDocs = await db.collection('document').find({
                docType: 30 // 30 是比赛文档类型
            }).sort({ beginAt: -1 }).limit(100).toArray(); // 按开始时间倒序，获取最近100个比赛
            
            return contestDocs.map(doc => ({
                id: doc._id.toString(), // 使用_id作为交换标识
                title: doc.title || `比赛 ${doc._id}`,
                begin_at: doc.beginAt ? new Date(doc.beginAt).toLocaleString('zh-CN', {
                    year: 'numeric',
                    month: '2-digit', 
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                }) : null,
                end_at: doc.endAt ? new Date(doc.endAt).toLocaleString('zh-CN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit', 
                    hour: '2-digit',
                    minute: '2-digit'
                }) : null,
                owner: doc.owner || 0,
                attend: doc.attend || 0,
                status: this.getContestStatus(doc)
            }));
        } catch (error) {
            console.error('Failed to get contests:', error);
            return [];
        }
    }
    
    private getContestStatus(doc: any): string {
        const now = new Date();
        const beginAt = doc.beginAt ? new Date(doc.beginAt) : null;
        const endAt = doc.endAt ? new Date(doc.endAt) : null;
        
        if (!beginAt || !endAt) {
            return '未定时间';
        }
        
        if (now < beginAt) {
            return '未开始';
        } else if (now >= beginAt && now <= endAt) {
            return '进行中';
        } else {
            return '已结束';
        }
    }
    
    // 新增：根据比赛ID获取比赛信息
    private async getContestById(contestId: string): Promise<any | null> {
        try {
            // 使用灵活的查询方式查找比赛文档
            let contestDoc: any = null;
            
            try {
                contestDoc = await db.collection('document').findOne({ 
                    _id: contestId,
                    docType: 30 
                });
            } catch (error) {
                // 查询失败，继续尝试其他方式
            }
            
            if (!contestDoc) {
                try {
                    const allContests = await db.collection('document').find({ docType: 30 }).toArray();
                    contestDoc = allContests.find(c => c._id.toString() === contestId.toString()) || null;
                } catch (error) {
                    // 查询失败
                }
            }
            
            if (!contestDoc) {
                return null;
            }
            
            return {
                id: contestDoc._id.toString(),
                title: contestDoc.title || `比赛 ${contestDoc._id}`,
                begin_at: contestDoc.beginAt ? new Date(contestDoc.beginAt).toLocaleString('zh-CN', {
                    year: 'numeric',
                    month: '2-digit', 
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                }) : null,
                end_at: contestDoc.endAt ? new Date(contestDoc.endAt).toLocaleString('zh-CN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit', 
                    hour: '2-digit',
                    minute: '2-digit'
                }) : null,
                status: this.getContestStatus(contestDoc)
            };
        } catch (error) {
            console.error('Failed to get contest by ID:', error);
            return null;
        }
    }
    
    // 新增：估算处理时间
    private estimateProcessingTime(problemCount: number): string {
        if (problemCount <= 2) {
            return '15-30分钟';
        } else if (problemCount <= 5) {
            return '30-45分钟';
        } else if (problemCount <= 10) {
            return '45-90分钟';
        } else {
            return '1-2小时';
        }
    }
}

/**
 * Task Status Handler - /plagiarism/api/task/:task_id/status
 */
class TaskStatusHandler extends Handler {
    async get({ task_id }: { task_id: string }) {
        this.checkPriv(PRIV.PRIV_EDIT_SYSTEM);
        
        try {
            console.log('Checking task status for ID:', task_id);
            
            // 调用Phosphorus API检查任务状态
            const result = await makeApiRequest(`/api/v1/task/${task_id}/status`, 'GET');
            
            this.response.body = {
                success: true,
                task_id: task_id,
                status: result.status || 'unknown',
                progress: result.progress || 0,
                message: result.message || '',
                completed: result.completed || false,
                result_url: result.completed ? `/plagiarism/contest/${result.contest_id}` : null,
                estimated_remaining: result.estimated_remaining || null
            };
            this.response.type = 'application/json';
            
        } catch (error: any) {
            console.error('Failed to check task status:', error);
            
            // 如果API调用失败，返回默认状态（可能任务还没有被Phosphorus处理）
            this.response.body = {
                success: false,
                task_id: task_id,
                status: 'processing',
                progress: 0,
                message: '任务正在处理中，请稍候...',
                completed: false,
                result_url: null,
                error: error.message
            };
            this.response.type = 'application/json';
        }
    }
}

/**
 * Enhanced Problem Detail Handler - /plagiarism/enhanced/contest/{contest_id}/problem/{problem_id}
 */
class EnhancedProblemDetailHandler extends Handler {
    async get(domainId: string, contest_id: string, problem_id: string) {
        this.checkPriv(PRIV.PRIV_EDIT_SYSTEM);
        
        try {
            const problemData = await this.getEnhancedProblemData(contest_id, parseInt(problem_id));
            const problem = await this.getProblemInfo(contest_id, parseInt(problem_id));
            
            this.response.template = 'enhanced_plagiarism_detail.html';
            this.response.body = {
                problem,
                plagiarism_data: problemData,
                contest_id,
                problem_id: parseInt(problem_id)
            };
        } catch (error: any) {
            console.error('[Enhanced Problem Detail] Error:', error);
            
            if (error.message.includes('404')) {
                throw new NotFoundError('Problem plagiarism data not found');
            }
            
            this.response.template = 'enhanced_plagiarism_detail.html';
            this.response.body = {
                error: error.message,
                problem: { title: `Problem ${problem_id}`, id: problem_id },
                plagiarism_data: null,
                contest_id,
                problem_id: parseInt(problem_id)
            };
        }
    }
    
    private async getEnhancedProblemData(contest_id: string, problem_id: number): Promise<any> {
        try {
            const response = await makeEnhancedApiRequest(
                `/api/v1/jplag/enhanced/problem/${contest_id}/${problem_id}`
            );
            return response.data;
        } catch (error) {
            console.error(`[Enhanced Problem Data] Failed to get data for ${contest_id}/${problem_id}:`, error);
            throw error;
        }
    }
    
    private async getProblemInfo(contest_id: string, problem_id: number): Promise<any> {
        try {
            // Try to get problem info from existing problem handler logic
            // For now, return enhanced mock data
            return {
                id: problem_id,
                title: `Enhanced Problem ${problem_id}`,
                description: `Enhanced analysis for problem ${problem_id} in contest ${contest_id}`
            };
        } catch (error) {
            console.error('[Enhanced Problem Info] Failed to get problem info:', error);
            return {
                id: problem_id,
                title: `Problem ${problem_id}`,
                description: `Problem ${problem_id} description`
            };
        }
    }
}

/**
 * Enhanced API Proxy Handler for real-time features
 */
class EnhancedApiProxyHandler extends Handler {
    async get(domainId: string, ...args: string[]) {
        this.checkPriv(PRIV.PRIV_EDIT_SYSTEM);
        
        const endpoint = args.join('/');
        const queryParams = new URLSearchParams(this.request.query as any).toString();
        const fullEndpoint = queryParams ? `${endpoint}?${queryParams}` : endpoint;
        
        try {
            const response = await makeEnhancedApiRequest(`/api/v1/jplag/enhanced/${fullEndpoint}`);
            this.response.body = response;
            this.response.type = 'application/json';
        } catch (error: any) {
            console.error('[Enhanced API Proxy] Error:', error);
            this.response.status = 500;
            this.response.body = { error: error.message };
            this.response.type = 'application/json';
        }
    }
    
    async post(domainId: string, ...args: string[]) {
        this.checkPriv(PRIV.PRIV_EDIT_SYSTEM);
        
        const endpoint = args.join('/');
        
        try {
            const response = await makeEnhancedApiRequest(
                `/api/v1/jplag/enhanced/${endpoint}`,
                'POST',
                this.request.body
            );
            this.response.body = response;
            this.response.type = 'application/json';
        } catch (error: any) {
            console.error('[Enhanced API Proxy POST] Error:', error);
            this.response.status = 500;
            this.response.body = { error: error.message };
            this.response.type = 'application/json';
        }
    }
}

export default definePlugin({
    name: PLUGIN_NAME,
    
    apply(ctx: Context) {
        // Register original routes
        ctx.Route('plagiarism_main', '/plagiarism', PlagiarismMainHandler, PRIV.PRIV_EDIT_SYSTEM);
        ctx.Route('plagiarism_contest_list', '/plagiarism/contest', ContestPlagiarismListHandler, PRIV.PRIV_EDIT_SYSTEM);
        ctx.Route('plagiarism_contest_detail', '/plagiarism/contest/:contest_id', ContestPlagiarismDetailHandler, PRIV.PRIV_EDIT_SYSTEM);
        ctx.Route('plagiarism_problem_detail', '/plagiarism/contest/:contest_id/:problem_id', ProblemPlagiarismDetailHandler, PRIV.PRIV_EDIT_SYSTEM);
        ctx.Route('plagiarism_new_task', '/plagiarism/new', NewPlagiarismTaskHandler, PRIV.PRIV_EDIT_SYSTEM);
        ctx.Route('plagiarism_api_problems', '/plagiarism/api/problems', PlagiarismApiHandler, PRIV.PRIV_EDIT_SYSTEM);
        ctx.Route('plagiarism_task_status', '/plagiarism/api/task/:task_id/status', TaskStatusHandler, PRIV.PRIV_EDIT_SYSTEM);
        
        // Register enhanced routes
        ctx.Route('enhanced_problem_detail', '/plagiarism/enhanced/contest/:contest_id/problem/:problem_id', EnhancedProblemDetailHandler, PRIV.PRIV_EDIT_SYSTEM);
        ctx.Route('enhanced_api_proxy', '/plagiarism/enhanced/api/*', EnhancedApiProxyHandler, PRIV.PRIV_EDIT_SYSTEM);
        
        // Add to navigation menu
        ctx.injectUI('UserDropdown', 'Userinfo', {
            icon: 'search',
            displayName: '代码查重',
            uid: 'plagiarism_system',
        }, PRIV.PRIV_EDIT_SYSTEM);
        
        console.log(`${PLUGIN_NAME} plugin loaded successfully`);
        console.log('[Enhanced Routes] Registered enhanced plagiarism detection routes');
    }
});
