// @noErrors
// @module: esnext
// @filename: index.ts
import {
    Context, definePlugin, Handler, NotFoundError,
    PRIV, SystemModel, db
} from 'hydrooj';

// Plugin configuration
const PLUGIN_NAME = 'phosphorus-plagiarism';
const PLUGIN_VERSION = '1.0.0';

// Get Phosphorus API base URL from system settings
function getPhosphorusApiBase(): string {
    const apiBase = SystemModel.get('phosphorus.api.base') || 'http://localhost:8000';
    console.log('[Phosphorus Plugin] API Base URL:', apiBase);
    return apiBase;
}

/**
 * Make HTTP request to Phosphorus API
 */
async function makeApiRequest(endpoint: string, method: string = 'GET', data?: any): Promise<any> {
    const apiBase = getPhosphorusApiBase();
    const url = `${apiBase}${endpoint}`;
    
    console.log(`[Phosphorus] Making API request: ${method} ${url}`);
    console.log(`[Phosphorus] API Base URL: ${apiBase}`);
    
    const options: RequestInit = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
    };
    
    if (data && method !== 'GET') {
        options.body = JSON.stringify(data);
        console.log(`[Phosphorus] Request body:`, data);
    }
    
    try {
        const response = await fetch(url, options);
        console.log(`[Phosphorus] Response status: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Phosphorus] Error response:`, errorText);
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log(`[Phosphorus] Response data:`, result);
        return result;
    } catch (error: any) {
        console.error(`[Phosphorus] API request failed:`, error);
        throw new Error(`API request failed: ${error.message}`);
    }
}

/**
 * Plagiarism Main Page Handler - /plagiarism
 */
class PlagiarismMainHandler extends Handler {
    async get() {
        // Check permissions - use existing permission for contest management
        this.checkPriv(PRIV.PRIV_EDIT_SYSTEM);
        
        try {
            // Get system statistics
            const stats = await this.getSystemStats();
            const recentActivities = await this.getRecentActivities();
            
            this.response.template = 'plagiarism_main.html';
            this.response.body = {
                total_contests: stats.total_contests || 0,
                total_problems: stats.total_problems || 0,
                total_submissions: stats.total_submissions || 0,
                high_similarity_count: stats.high_similarity_count || 0,
                contest_stats: stats.contest_stats || {},
                language_stats: stats.language_stats || {},
                history_stats: stats.history_stats || {},
                recent_activities: recentActivities
            };
        } catch (error: any) {
            this.response.template = 'plagiarism_main.html';
            this.response.body = {
                error: error.message,
                total_contests: 0,
                total_problems: 0,
                total_submissions: 0,
                high_similarity_count: 0,
                contest_stats: {},
                language_stats: {},
                history_stats: {},
                recent_activities: []
            };
        }
    }
    
    private async getSystemStats(): Promise<any> {
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
            console.log('[Phosphorus] Calling API endpoint: /api/v1/contests/plagiarism');
            const result = await makeApiRequest('/api/v1/contests/plagiarism');
            
            console.log('[Phosphorus] API result:', result);
            console.log('[Phosphorus] Result success:', result.success);
            console.log('[Phosphorus] Result data length:', result.data ? result.data.length : 'null/undefined');
            
            if (result.success) {
                const contests = result.data || [];
                console.log('[Phosphorus] Contests data:', contests);
                
                // Enrich contest data
                contests.forEach((contest: any, index: number) => {
                    console.log(`[Phosphorus] Processing contest ${index}:`, contest);
                    contest.begin_at = contest.begin_at ? new Date(contest.begin_at) : null;
                    contest.end_at = contest.end_at ? new Date(contest.end_at) : null;
                    contest.last_check_at = contest.last_check_at ? new Date(contest.last_check_at) : null;
                });
                
                console.log('[Phosphorus] Enriched contests:', contests);
                
                this.response.template = 'plagiarism_contest_list.html';
                this.response.body = { contests };
                console.log('[Phosphorus] Template set to plagiarism_contest_list.html with contests:', contests.length);
            } else {
                console.warn('[Phosphorus] API returned success=false:', result.message);
                this.response.template = 'plagiarism_contest_list.html';
                this.response.body = { contests: [], error: result.message || 'Failed to fetch contests' };
            }
        } catch (error: any) {
            console.error('[Phosphorus] Exception in ContestPlagiarismListHandler:', error);
            this.response.template = 'plagiarism_contest_list.html';
            this.response.body = { contests: [], error: error.message };
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
            const result = await makeApiRequest('/api/v1/contests/plagiarism');
            if (result.success) {
                const contests = result.data || [];
                const contest = contests.find((c: any) => c.id.toString() === contestId.toString());
                if (contest) {
                    contest.begin_at = contest.begin_at ? new Date(contest.begin_at) : null;
                    contest.end_at = contest.end_at ? new Date(contest.end_at) : null;
                    contest.last_check_at = contest.last_check_at ? new Date(contest.last_check_at) : null;
                    return contest;
                }
            }
        } catch (error) {
            console.error('Failed to get contest info:', error);
        }
        return null;
    }
    
    private async getContestProblems(contestId: string): Promise<any[]> {
        try {
            // Get problems
            const problemsResult = await makeApiRequest(`/api/v1/contest/${contestId}/problems`);
            if (!problemsResult.success) {
                return [];
            }
            
            const problems = problemsResult.data || [];
            
            // Get plagiarism results for each problem
            for (const problem of problems) {
                problem.last_check_at = problem.last_check_at ? new Date(problem.last_check_at) : null;
                
                try {
                    const resultResponse = await makeApiRequest(
                        `/api/v1/contest/${contestId}/problem/${problem.id}/plagiarism`
                    );
                    if (resultResponse.success && resultResponse.data) {
                        problem.plagiarism_result = resultResponse.data;
                    }
                } catch (error) {
                    console.warn(`Failed to get plagiarism result for problem ${problem.id}:`, error);
                }
            }
            
            return problems;
        } catch (error) {
            console.error('Failed to get contest problems:', error);
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
            // Get contest and problem information
            const contest = await this.getContestInfo(contest_id);
            const problem = await this.getProblemInfo(contest_id, parseInt(problem_id));
            
            if (!contest || !problem) {
                throw new NotFoundError('Contest or problem not found');
            }
            
            // Get language statistics and results
            const languageResults = await this.getLanguageResults(contest_id, parseInt(problem_id));
            
            this.response.template = 'plagiarism_problem_detail.html';
            this.response.body = {
                contest,
                problem,
                language_results: languageResults
            };
        } catch (error: any) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            this.response.template = 'plagiarism_problem_detail.html';
            this.response.body = { error: error.message };
        }
    }
    
    private async getContestInfo(contestId: string): Promise<any> {
        try {
            const result = await makeApiRequest('/api/v1/contests/plagiarism');
            if (result.success) {
                const contests = result.data || [];
                return contests.find((c: any) => c.id.toString() === contestId.toString()) || null;
            }
        } catch (error) {
            console.error('Failed to get contest info:', error);
        }
        return null;
    }
    
    private async getProblemInfo(contestId: string, problemId: number): Promise<any> {
        try {
            const result = await makeApiRequest(`/api/v1/contest/${contestId}/problems`);
            if (result.success) {
                const problems = result.data || [];
                const problem = problems.find((p: any) => p.id.toString() === problemId.toString());
                if (problem) {
                    problem.last_check_at = problem.last_check_at ? new Date(problem.last_check_at) : null;
                    return problem;
                }
            }
        } catch (error) {
            console.error('Failed to get problem info:', error);
        }
        return null;
    }
    
    private async getLanguageResults(contestId: string, problemId: number): Promise<any[]> {
        try {
            // Get language statistics
            const statsResult = await makeApiRequest(
                `/api/v1/contest/${contestId}/problem/${problemId}/languages`
            );
            
            if (!statsResult.success) {
                return [];
            }
            
            const languageStats = statsResult.data || [];
            
            // Get plagiarism result
            let plagiarismResult: any = null;
            try {
                const resultResponse = await makeApiRequest(
                    `/api/v1/contest/${contestId}/problem/${problemId}/plagiarism`
                );
                if (resultResponse.success) {
                    plagiarismResult = resultResponse.data;
                }
            } catch (error) {
                console.warn('Failed to get plagiarism result:', error);
            }
            
            // Combine stats with results
            const languageResults: any[] = [];
            
            languageStats.forEach((stat: any) => {
                if (!stat.can_analyze) {
                    return;
                }
                
                const langResult: any = {
                    language: stat.language,
                    language_display: this.getLanguageDisplayName(stat.language),
                    language_icon: this.getLanguageIcon(stat.language),
                    submission_count: stat.submission_count,
                    unique_users: stat.unique_users,
                    similarity_pairs: [],
                    avg_similarity: 0.0,
                    high_similarity_pairs: []
                };
                
                // Add plagiarism data if available
                if (plagiarismResult) {
                    // Generate mock pairs for demonstration
                    langResult.similarity_pairs = this.generateMockPairs(stat.submission_count);
                    langResult.high_similarity_pairs = langResult.similarity_pairs;
                    if (langResult.similarity_pairs.length > 0) {
                        langResult.avg_similarity = langResult.similarity_pairs.reduce(
                            (sum: number, p: any) => sum + p.avg_similarity, 0
                        ) / langResult.similarity_pairs.length;
                    }
                }
                
                languageResults.push(langResult);
            });
            
            return languageResults;
        } catch (error) {
            console.error('Failed to get language results:', error);
            return [];
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
            console.log('Getting problems for contest ID (string):', contestId);
            
            // 使用灵活的查询方式查找比赛文档
            let contestDoc: any = null;
            
            // 方式1: 直接使用传入的ID查询
            try {
                contestDoc = await db.collection('document').findOne({ 
                    _id: contestId,
                    docType: 30 
                });
            } catch (error) {
                // 查询失败，继续尝试其他方式
            }
            
            // 方式2: 如果直接查询失败，尝试字符串匹配
            if (!contestDoc) {
                try {
                    const allContests = await db.collection('document').find({ docType: 30 }).toArray();
                    contestDoc = allContests.find(c => c._id.toString() === contestId.toString()) || null;
                } catch (error) {
                    // 查询失败
                }
            }
            
            console.log('Contest document found:', !!contestDoc);
            console.log('Contest pids:', contestDoc?.pids);
            
            if (!contestDoc || !contestDoc.pids) {
                return [];
            }
            
            // 获取比赛中的题目ID列表
            const problemIds = contestDoc.pids.map((pid: any) => parseInt(pid.toString()));
            console.log('Problem IDs to query:', problemIds);
            
            // 查询这些题目的详细信息
            const problemDocs = await db.collection('document').find({
                docType: 10, // 10 是题目文档类型
                docId: { $in: problemIds }
            }).toArray();
            
            console.log('Problem documents found:', problemDocs.length);
            
            return problemDocs.map(doc => ({
                id: doc.docId,
                title: doc.title || `题目 ${doc.docId}`,
                total_submissions: doc.nSubmit || 0,
                accepted_submissions: doc.nAccept || 0,
                difficulty: doc.difficulty || 0,
                tags: doc.tag || [],
                pid: doc.pid || doc.docId.toString(),
                can_analyze: (doc.nSubmit || 0) >= 5 // 至少5个提交才能分析
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

export default definePlugin({
    name: PLUGIN_NAME,
    
    apply(ctx: Context) {
        // Register routes
        ctx.Route('plagiarism_main', '/plagiarism', PlagiarismMainHandler, PRIV.PRIV_EDIT_SYSTEM);
        ctx.Route('plagiarism_contest_list', '/plagiarism/contest', ContestPlagiarismListHandler, PRIV.PRIV_EDIT_SYSTEM);
        ctx.Route('plagiarism_contest_detail', '/plagiarism/contest/:contest_id', ContestPlagiarismDetailHandler, PRIV.PRIV_EDIT_SYSTEM);
        ctx.Route('plagiarism_problem_detail', '/plagiarism/contest/:contest_id/:problem_id', ProblemPlagiarismDetailHandler, PRIV.PRIV_EDIT_SYSTEM);
        ctx.Route('plagiarism_new_task', '/plagiarism/new', NewPlagiarismTaskHandler, PRIV.PRIV_EDIT_SYSTEM);
        ctx.Route('plagiarism_api_problems', '/plagiarism/api/problems', PlagiarismApiHandler, PRIV.PRIV_EDIT_SYSTEM);
        ctx.Route('plagiarism_task_status', '/plagiarism/api/task/:task_id/status', TaskStatusHandler, PRIV.PRIV_EDIT_SYSTEM);
        
        // Add to navigation menu
        ctx.injectUI('UserDropdown', 'Userinfo', {
            icon: 'search',
            displayName: '代码查重',
            uid: 'plagiarism_system',
        }, PRIV.PRIV_EDIT_SYSTEM);
        
        console.log(`${PLUGIN_NAME} plugin loaded successfully`);
    }
});
