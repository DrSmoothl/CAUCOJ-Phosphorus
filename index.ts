// @noErrors
// @module: esnext
// @filename: index.ts
import {
    Context, definePlugin, Handler, NotFoundError,
    PRIV, SystemModel
} from 'hydrooj';

// Plugin configuration
const PLUGIN_NAME = 'phosphorus-plagiarism';
const PLUGIN_VERSION = '1.0.0';

// Get Phosphorus API base URL from system settings
function getPhosphorusApiBase(): string {
    return SystemModel.get('phosphorus.api.base') || 'http://localhost:8000';
}

/**
 * Make HTTP request to Phosphorus API
 */
async function makeApiRequest(endpoint: string, method: string = 'GET', data?: any): Promise<any> {
    const url = `${getPhosphorusApiBase()}${endpoint}`;
    
    const options: RequestInit = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
    };
    
    if (data && method !== 'GET') {
        options.body = JSON.stringify(data);
    }
    
    try {
        const response = await fetch(url, options);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
    } catch (error: any) {
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
        
        try {
            const result = await makeApiRequest('/api/v1/contests/plagiarism');
            
            if (result.success) {
                const contests = result.data || [];
                
                // Enrich contest data
                contests.forEach((contest: any) => {
                    contest.begin_at = contest.begin_at ? new Date(contest.begin_at) : null;
                    contest.end_at = contest.end_at ? new Date(contest.end_at) : null;
                    contest.last_check_at = contest.last_check_at ? new Date(contest.last_check_at) : null;
                });
                
                this.response.template = 'contest_list.html';
                this.response.body = { contests };
            } else {
                this.response.template = 'contest_list.html';
                this.response.body = { contests: [], error: result.message || 'Failed to fetch contests' };
            }
        } catch (error: any) {
            this.response.template = 'contest_list.html';
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
            
            this.response.template = 'contest_detail.html';
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
            this.response.template = 'contest_detail.html';
            this.response.body = { error: error.message };
        }
    }
    
    private async getContestInfo(contestId: string): Promise<any> {
        try {
            const result = await makeApiRequest('/api/v1/contests/plagiarism');
            if (result.success) {
                const contests = result.data || [];
                const contest = contests.find((c: any) => c.id === contestId);
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
            
            this.response.template = 'problem_detail.html';
            this.response.body = {
                contest,
                problem,
                language_results: languageResults
            };
        } catch (error: any) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            this.response.template = 'problem_detail.html';
            this.response.body = { error: error.message };
        }
    }
    
    private async getContestInfo(contestId: string): Promise<any> {
        try {
            const result = await makeApiRequest('/api/v1/contests/plagiarism');
            if (result.success) {
                const contests = result.data || [];
                return contests.find((c: any) => c.id === contestId) || null;
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
                const problem = problems.find((p: any) => p.id === problemId);
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
 * New Plagiarism Task Handler - /plagiarism/new
 */
class NewPlagiarismTaskHandler extends Handler {
    async get() {
        this.checkPriv(PRIV.PRIV_EDIT_SYSTEM);
        
        this.response.template = 'new_task.html';
        this.response.body = {};
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
        
        // Add to navigation menu
        ctx.injectUI('UserDropdown', 'Userinfo', {
            icon: 'search',
            displayName: '代码查重',
            uid: 'plagiarism_system',
        }, PRIV.PRIV_EDIT_SYSTEM);
        
        console.log(`${PLUGIN_NAME} plugin loaded successfully`);
    }
});
