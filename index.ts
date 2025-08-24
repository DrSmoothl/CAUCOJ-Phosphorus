// @noErrors
// @module: esnext
// @filename: index.ts
import {
    Handler, NotFoundError, PermissionError,
    param, PRIV, Types, UserModel, ObjectId, Context
} from 'hydrooj';

// Phosphorus API base URL - 可以通过配置文件设置
const PHOSPHORUS_API_BASE = 'http://localhost:8000';

interface PlagiarismResult {
    _id: string;
    contest_id: string;
    problem_id: number;
    analysis_id: string;
    total_submissions: number;
    total_comparisons: number;
    execution_time_ms: number;
    high_similarity_pairs: Array<{
        user1_id: number;
        user2_id: number;
        similarity: number;
        file1: string;
        file2: string;
        match_count: number;
    }>;
    clusters: Array<{
        cluster_id: number;
        members: number[];
        avg_similarity: number;
    }>;
    submission_stats: Array<{
        user_id: number;
        submission_count: number;
        avg_similarity: number;
        max_similarity: number;
    }>;
    failed_submissions: Array<{
        user_id: number;
        error: string;
    }>;
    created_at: string;
    jplag_file_path?: string;
}

interface ContestPlagiarismRequest {
    contest_id: string;
    min_tokens?: number;
    similarity_threshold?: number;
}

/**
 * 调用 Phosphorus API 检查比赛抄袭
 */
async function checkContestPlagiarism(
    contestId: string, 
    minTokens: number = 9, 
    similarityThreshold: number = 0.0
): Promise<PlagiarismResult> {
    const requestData: ContestPlagiarismRequest = {
        contest_id: contestId,
        min_tokens: minTokens,
        similarity_threshold: similarityThreshold
    };

    try {
        // 使用 fetch API 调用 Phosphorus 后端
        const response = await fetch(
            `${PHOSPHORUS_API_BASE}/api/v1/contest/plagiarism`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        
        if (result && result.success) {
            return result.data;
        } else {
            throw new Error(result?.message || 'API call failed');
        }
    } catch (error: any) {
        throw new Error(`Request failed: ${error.message}`);
    }
}

/**
 * 获取比赛的抄袭检测结果
 */
async function getContestPlagiarismResults(contestId: string): Promise<PlagiarismResult[]> {
    try {
        const response = await fetch(
            `${PHOSPHORUS_API_BASE}/api/v1/contest/${contestId}/plagiarism`
        );

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        
        if (result && result.success) {
            return result.data;
        } else {
            throw new Error(result?.message || 'API call failed');
        }
    } catch (error: any) {
        throw new Error(`Request failed: ${error.message}`);
    }
}

const plagiarismModel = { checkContestPlagiarism, getContestPlagiarismResults };

/**
 * 抄袭检测主页面 Handler
 */
class PlagiarismMainHandler extends Handler {
    @param('tid', Types.ObjectId)
    async get(domainId: string, tid: ObjectId) {
        // 检查权限：需要是比赛管理员
        const tdoc = await this.model.contest.get(domainId, tid);
        if (!tdoc) {
            throw new NotFoundError(tid.toString());
        }
        
        // 检查是否有管理权限
        if (this.user._id !== tdoc.owner && !this.user.hasPerm(PRIV.PRIV_EDIT_CONTEST)) {
            throw new PermissionError(PRIV.PRIV_EDIT_CONTEST);
        }

        // 获取历史检测结果
        let results: PlagiarismResult[] = [];
        let error: string | null = null;
        
        try {
            results = await plagiarismModel.getContestPlagiarismResults(tid.toString());
        } catch (err: any) {
            error = err.message;
        }

        this.response.body = { 
            tdoc, 
            results, 
            error,
            apiBase: PHOSPHORUS_API_BASE
        };
        this.response.template = 'plagiarism_main.html';
    }
}

/**
 * 执行抄袭检测 Handler
 */
class PlagiarismCheckHandler extends Handler {
    @param('tid', Types.ObjectId)
    @param('minTokens', Types.PositiveInt, true)
    @param('similarityThreshold', Types.Float, true)
    async post(
        domainId: string, 
        tid: ObjectId, 
        minTokens: number = 9, 
        similarityThreshold: number = 0.0
    ) {
        // 检查权限
        const tdoc = await this.model.contest.get(domainId, tid);
        if (!tdoc) {
            throw new NotFoundError(tid.toString());
        }
        
        if (this.user._id !== tdoc.owner && !this.user.hasPerm(PRIV.PRIV_EDIT_CONTEST)) {
            throw new PermissionError(PRIV.PRIV_EDIT_CONTEST);
        }

        try {
            // 调用 Phosphorus API 进行检测
            const result = await plagiarismModel.checkContestPlagiarism(
                tid.toString(), 
                minTokens, 
                similarityThreshold
            );

            this.response.body = { 
                success: true, 
                result,
                message: 'Plagiarism check completed successfully'
            };
        } catch (error: any) {
            this.response.body = { 
                success: false, 
                error: error.message 
            };
        }

        this.response.type = 'application/json';
    }
}

/**
 * 查看检测结果详情 Handler
 */
class PlagiarismDetailHandler extends Handler {
    @param('tid', Types.ObjectId)
    @param('rid', Types.String)
    async get(domainId: string, tid: ObjectId, rid: string) {
        // 检查权限
        const tdoc = await this.model.contest.get(domainId, tid);
        if (!tdoc) {
            throw new NotFoundError(tid.toString());
        }
        
        if (this.user._id !== tdoc.owner && !this.user.hasPerm(PRIV.PRIV_EDIT_CONTEST)) {
            throw new PermissionError(PRIV.PRIV_EDIT_CONTEST);
        }

        // 获取检测结果
        let result: PlagiarismResult | null = null;
        let error: string | null = null;
        
        try {
            const results = await plagiarismModel.getContestPlagiarismResults(tid.toString());
            result = results.find(r => r._id === rid) || null;
            
            if (!result) {
                throw new NotFoundError(`Plagiarism result ${rid}`);
            }
        } catch (err: any) {
            error = err.message;
        }

        // 获取用户信息
        const uids = new Set<number>();
        if (result) {
            result.high_similarity_pairs.forEach(pair => {
                uids.add(pair.user1_id);
                uids.add(pair.user2_id);
            });
            result.submission_stats.forEach(stat => {
                uids.add(stat.user_id);
            });
            result.failed_submissions.forEach(fail => {
                uids.add(fail.user_id);
            });
        }

        const udict = await UserModel.getList(domainId, Array.from(uids));

        this.response.body = { 
            tdoc, 
            result, 
            error,
            udict
        };
        this.response.template = 'plagiarism_detail.html';
    }
}

/**
 * 导出检测结果 Handler
 */
class PlagiarismExportHandler extends Handler {
    @param('tid', Types.ObjectId)
    @param('rid', Types.String)
    async get(domainId: string, tid: ObjectId, rid: string) {
        // 检查权限
        const tdoc = await this.model.contest.get(domainId, tid);
        if (!tdoc) {
            throw new NotFoundError(tid.toString());
        }
        
        if (this.user._id !== tdoc.owner && !this.user.hasPerm(PRIV.PRIV_EDIT_CONTEST)) {
            throw new PermissionError(PRIV.PRIV_EDIT_CONTEST);
        }

        // 获取检测结果
        const results = await plagiarismModel.getContestPlagiarismResults(tid.toString());
        const result = results.find(r => r._id === rid);
        
        if (!result) {
            throw new NotFoundError(`Plagiarism result ${rid}`);
        }

        // 设置下载响应
        this.response.body = JSON.stringify(result, null, 2);
        this.response.type = 'application/json';
        this.response.addHeader('Content-Disposition', `attachment; filename="plagiarism_${tid}_${rid}.json"`);
    }
}

export async function apply(ctx: Context) {
    // 注册路由
    ctx.Route('plagiarism_main', '/contest/:tid/plagiarism', PlagiarismMainHandler, PRIV.PRIV_USER_PROFILE);
    ctx.Route('plagiarism_check', '/contest/:tid/plagiarism/check', PlagiarismCheckHandler, PRIV.PRIV_USER_PROFILE);
    ctx.Route('plagiarism_detail', '/contest/:tid/plagiarism/:rid', PlagiarismDetailHandler, PRIV.PRIV_USER_PROFILE);
    ctx.Route('plagiarism_export', '/contest/:tid/plagiarism/:rid/export', PlagiarismExportHandler, PRIV.PRIV_USER_PROFILE);

    // 在比赛管理页面添加抄袭检测入口（通过修改模板）
    ctx.addScript('phosphorus-plagiarism', 'phosphorus-plagiarism.js');
}
