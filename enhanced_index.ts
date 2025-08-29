// @noErrors
// @module: esnext
// @filename: enhanced_index.ts
import {
    Context, definePlugin, Handler, NotFoundError,
    PRIV, SystemModel, db
} from 'hydrooj';

// Enhanced Plugin configuration
const PLUGIN_NAME = 'phosphorus-plagiarism-enhanced';
const PLUGIN_VERSION = '2.0.0';

// Get Phosphorus API base URL from system settings
function getPhosphorusApiBase(): string {
    const apiBase = SystemModel.get('phosphorus.api.base') || 'http://localhost:8000';
    console.log('[Enhanced Phosphorus Plugin] API Base URL:', apiBase);
    return apiBase;
}

/**
 * Enhanced API request helper with better error handling and caching
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
 * Enhanced Plagiarism Main Page Handler - /plagiarism/enhanced
 */
class EnhancedPlagiarismMainHandler extends Handler {
    async get() {
        this.checkPriv(PRIV.PRIV_EDIT_SYSTEM);
        
        try {
            // Get enhanced system statistics
            const enhancedStats = await this.getEnhancedSystemStats();
            const analyticsData = await this.getAnalyticsData();
            const recentAnalyses = await this.getRecentAnalyses();
            
            this.response.template = 'enhanced_plagiarism_main.html';
            this.response.body = {
                ...enhancedStats,
                analytics: analyticsData,
                recent_analyses: recentAnalyses,
                plugin_version: PLUGIN_VERSION
            };
        } catch (error: any) {
            console.error('[Enhanced Plagiarism Main] Error:', error);
            this.response.template = 'enhanced_plagiarism_main.html';
            this.response.body = {
                error: error.message,
                total_contests: 0,
                total_problems: 0,
                total_submissions: 0,
                high_similarity_count: 0,
                analytics: {},
                recent_analyses: [],
                plugin_version: PLUGIN_VERSION
            };
        }
    }
    
    private async getEnhancedSystemStats(): Promise<any> {
        try {
            const response = await makeEnhancedApiRequest('/api/v1/jplag/enhanced/analysis/statistics/all');
            return response.data || {};
        } catch (error) {
            console.error('[Enhanced Stats] Failed to get system stats:', error);
            return {
                total_contests: 0,
                total_problems: 0,
                total_submissions: 0,
                high_similarity_count: 0,
                clusters_detected: 0,
                risk_level: 'unknown'
            };
        }
    }
    
    private async getAnalyticsData(): Promise<any> {
        try {
            // Get advanced analytics data
            return {
                similarity_trends: await this.getSimilarityTrends(),
                language_analysis: await this.getLanguageAnalysis(),
                temporal_patterns: await this.getTemporalPatterns(),
                cluster_insights: await this.getClusterInsights()
            };
        } catch (error) {
            console.error('[Analytics] Failed to get analytics data:', error);
            return {};
        }
    }
    
    private async getSimilarityTrends(): Promise<any[]> {
        // Mock data - in real implementation, fetch from API
        return [
            { date: '2024-01-01', high_similarity: 12, medium_similarity: 25, low_similarity: 45 },
            { date: '2024-01-02', high_similarity: 15, medium_similarity: 30, low_similarity: 40 },
            { date: '2024-01-03', high_similarity: 8, medium_similarity: 22, low_similarity: 50 }
        ];
    }
    
    private async getLanguageAnalysis(): Promise<any> {
        return {
            'Python': { submissions: 150, high_similarity: 18, avg_similarity: 0.45 },
            'Java': { submissions: 120, high_similarity: 22, avg_similarity: 0.52 },
            'C++': { submissions: 90, high_similarity: 15, avg_similarity: 0.38 },
            'JavaScript': { submissions: 80, high_similarity: 12, avg_similarity: 0.41 }
        };
    }
    
    private async getTemporalPatterns(): Promise<any> {
        return {
            peak_hours: [14, 15, 16, 20, 21],
            submission_clusters: [
                { time: '2024-01-01 14:30', count: 25, avg_similarity: 0.78 },
                { time: '2024-01-01 21:15', count: 18, avg_similarity: 0.65 }
            ]
        };
    }
    
    private async getClusterInsights(): Promise<any> {
        return {
            total_clusters: 15,
            high_risk_clusters: 4,
            largest_cluster_size: 8,
            cluster_distribution: {
                'size_2': 6,
                'size_3_5': 5,
                'size_6_10': 3,
                'size_10_plus': 1
            }
        };
    }
    
    private async getRecentAnalyses(): Promise<any[]> {
        try {
            // Get recent analysis results
            return [
                {
                    contest_id: 'contest_001',
                    problem_id: 1001,
                    analysis_time: '2024-01-01 15:30:00',
                    high_similarity_pairs: 5,
                    max_similarity: 0.95,
                    status: 'completed'
                },
                {
                    contest_id: 'contest_002',
                    problem_id: 1002,
                    analysis_time: '2024-01-01 14:20:00',
                    high_similarity_pairs: 3,
                    max_similarity: 0.87,
                    status: 'completed'
                }
            ];
        } catch (error) {
            console.error('[Recent Analyses] Failed to get recent analyses:', error);
            return [];
        }
    }
}

/**
 * Enhanced Contest List Handler - /plagiarism/enhanced/contests
 */
class EnhancedContestListHandler extends Handler {
    async get() {
        this.checkPriv(PRIV.PRIV_EDIT_SYSTEM);
        
        try {
            const contests = await this.getEnhancedContestList();
            const contestStats = await this.getContestStatistics();
            
            this.response.template = 'enhanced_contest_list.html';
            this.response.body = {
                contests,
                contest_stats: contestStats,
                total_contests: contests.length
            };
        } catch (error: any) {
            console.error('[Enhanced Contest List] Error:', error);
            this.response.template = 'enhanced_contest_list.html';
            this.response.body = {
                error: error.message,
                contests: [],
                contest_stats: {},
                total_contests: 0
            };
        }
    }
    
    private async getEnhancedContestList(): Promise<any[]> {
        try {
            const response = await makeEnhancedApiRequest('/api/v1/jplag/enhanced/contests');
            return response.data || [];
        } catch (error) {
            console.error('[Enhanced Contest List] API call failed:', error);
            // Return mock data for development
            return [
                {
                    contest_id: 'contest_001',
                    title: 'Algorithm Contest 2024',
                    problems_count: 5,
                    submissions_count: 150,
                    high_similarity_pairs: 12,
                    risk_level: 'medium',
                    last_analysis: '2024-01-01 15:30:00'
                },
                {
                    contest_id: 'contest_002',
                    title: 'Data Structure Challenge',
                    problems_count: 8,
                    submissions_count: 200,
                    high_similarity_pairs: 8,
                    risk_level: 'low',
                    last_analysis: '2024-01-01 14:20:00'
                }
            ];
        }
    }
    
    private async getContestStatistics(): Promise<any> {
        return {
            total_analyzed: 15,
            high_risk: 3,
            medium_risk: 7,
            low_risk: 5,
            avg_similarity: 0.42
        };
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
            // Try to get problem info from Hydro database
            // For now, return mock data
            return {
                id: problem_id,
                title: `Enhanced Problem ${problem_id}`,
                description: `Enhanced analysis for problem ${problem_id} in contest ${contest_id}`
            };
        } catch (error) {
            console.error('[Problem Info] Failed to get problem info:', error);
            return {
                id: problem_id,
                title: `Problem ${problem_id}`,
                description: `Problem ${problem_id} description`
            };
        }
    }
}

/**
 * Enhanced Detailed Comparison Handler - /plagiarism/enhanced/comparison/{analysis_id}/{first}/{second}
 */
class EnhancedComparisonHandler extends Handler {
    async get(domainId: string, analysis_id: string, first_submission: string, second_submission: string) {
        this.checkPriv(PRIV.PRIV_EDIT_SYSTEM);
        
        try {
            const comparisonData = await this.getEnhancedComparison(analysis_id, first_submission, second_submission);
            
            this.response.template = 'enhanced_comparison_detail.html';
            this.response.body = {
                comparison: comparisonData,
                analysis_id,
                first_submission,
                second_submission
            };
        } catch (error: any) {
            console.error('[Enhanced Comparison] Error:', error);
            
            if (error.message.includes('404')) {
                throw new NotFoundError('Comparison data not found');
            }
            
            this.response.template = 'enhanced_comparison_detail.html';
            this.response.body = {
                error: error.message,
                comparison: null,
                analysis_id,
                first_submission,
                second_submission
            };
        }
    }
    
    private async getEnhancedComparison(analysis_id: string, first: string, second: string): Promise<any> {
        const requestData = {
            analysis_id,
            first_submission: first,
            second_submission: second
        };
        
        try {
            const response = await makeEnhancedApiRequest(
                '/api/v1/jplag/enhanced/comparison/detailed/enhanced',
                'POST',
                requestData
            );
            return response.data;
        } catch (error) {
            console.error('[Enhanced Comparison] API call failed:', error);
            throw error;
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

/**
 * Enhanced WebSocket Handler for real-time updates
 */
class EnhancedWebSocketHandler extends Handler {
    noCheckPermissions = true;
    
    async prepare() {
        // Check permissions for WebSocket connection
        this.checkPriv(PRIV.PRIV_EDIT_SYSTEM);
    }
    
    async message(type: string, data: any) {
        try {
            switch (type) {
                case 'subscribe_analysis':
                    await this.handleAnalysisSubscription(data);
                    break;
                case 'request_update':
                    await this.handleUpdateRequest(data);
                    break;
                case 'filter_change':
                    await this.handleFilterChange(data);
                    break;
                default:
                    console.warn('[Enhanced WebSocket] Unknown message type:', type);
            }
        } catch (error: any) {
            console.error('[Enhanced WebSocket] Message handling error:', error);
            // Send error response via WebSocket
            this.response.body = { type: 'error', data: { message: error.message } };
        }
    }
    
    private async handleAnalysisSubscription(data: any) {
        const { contest_id, problem_id } = data;
        console.log(`[Enhanced WebSocket] Subscribing to analysis updates: ${contest_id}/${problem_id}`);
        
        // In real implementation, set up subscription to analysis updates
        this.response.body = { type: 'subscription_confirmed', data: { contest_id, problem_id } };
    }
    
    private async handleUpdateRequest(data: any) {
        try {
            const updatedData = await makeEnhancedApiRequest(`/api/v1/jplag/enhanced/live/${data.endpoint}`);
            this.response.body = { type: 'update', data: updatedData };
        } catch (error: any) {
            this.response.body = { type: 'error', data: { message: `Failed to get update: ${error.message}` } };
        }
    }
    
    private async handleFilterChange(data: any) {
        console.log('[Enhanced WebSocket] Filter change:', data);
        // Handle real-time filtering
        this.response.body = { type: 'filter_applied', data: { filters: data.filters } };
    }
}

// Enhanced Plugin Registration
export default definePlugin({
    name: PLUGIN_NAME,
    
    apply(ctx: Context) {
        // Enhanced route registration
        ctx.Route('enhanced_plagiarism_main', '/plagiarism/enhanced', EnhancedPlagiarismMainHandler);
        ctx.Route('enhanced_contest_list', '/plagiarism/enhanced/contests', EnhancedContestListHandler);
        ctx.Route('enhanced_problem_detail', '/plagiarism/enhanced/contest/:contest_id/problem/:problem_id', EnhancedProblemDetailHandler);
        ctx.Route('enhanced_comparison', '/plagiarism/enhanced/comparison/:analysis_id/:first_submission/:second_submission', EnhancedComparisonHandler);
        ctx.Route('enhanced_api_proxy', '/plagiarism/enhanced/api/*', EnhancedApiProxyHandler);
        ctx.Route('enhanced_websocket', '/plagiarism/enhanced/ws', EnhancedWebSocketHandler, PRIV.PRIV_EDIT_SYSTEM);
        
        console.log(`[${PLUGIN_NAME}] Enhanced plugin v${PLUGIN_VERSION} loaded successfully`);
        console.log('[Enhanced Routes] Registered enhanced plagiarism detection routes');
    },
});
