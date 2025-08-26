// @noErrors
// @module: esnext
// @filename: index.ts
import {
    Handler, NotFoundError, PermissionError,
    PRIV, Types, UserModel, ObjectId, Context
} from 'hydrooj';

// Phosphorus API base URL
const PHOSPHORUS_API_BASE = 'http://localhost:8000';

interface Contest {
    _id: ObjectId;
    title: string;
    owner: number;
    domainId: string;
    docType: number;
    docId: ObjectId;
    beginAt: Date;
    endAt: Date;
    attend: number;
    pids: any[];
    rule: string;
}

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

/**
 * 获取所有比赛
 */
async function getAllContests(domainId: string): Promise<Contest[]> {
    // 查询 documents 集合中 docType = 30 的文档（比赛）
    return await global.Hydro.model.document.getMulti(
        domainId, 
        30 as any
    ).sort({ beginAt: -1 }).toArray();
}

/**
 * 调用 Phosphorus API 检查比赛抄袭
 */
async function checkContestPlagiarism(
    contestId: string, 
    minTokens: number = 9, 
    similarityThreshold: number = 0.0
): Promise<PlagiarismResult> {
    const requestData = {
        contest_id: contestId,
        min_tokens: minTokens,
        similarity_threshold: similarityThreshold
    };

    try {
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

const plagiarismModel = { 
    getAllContests,
    checkContestPlagiarism, 
    getContestPlagiarismResults 
};

declare module 'hydrooj' {
    interface Model {
        plagiarism: typeof plagiarismModel;
    }
}

global.Hydro.model.plagiarism = plagiarismModel;

/**
 * 查重系统主页面 Handler - /plagiarism
 */
class PlagiarismSystemHandler extends Handler {
    async get({ domainId }: { domainId: string }) {
        // 检查权限：需要管理员权限
        this.checkPriv(PRIV.PRIV_CREATE_DOMAIN);

        this.response.body = { 
            apiBase: PHOSPHORUS_API_BASE
        };
        this.response.template = 'plagiarism_system.html';
    }
}

/**
 * 比赛查重列表页面 Handler - /plagiarism/contest
 */
class PlagiarismContestListHandler extends Handler {
    async get({ domainId }: { domainId: string }) {
        // 检查权限：需要管理员权限
        this.checkPriv(PRIV.PRIV_CREATE_DOMAIN);

        // 获取所有比赛
        let contests: Contest[] = [];
        let error: string | null = null;
        
        try {
            contests = await plagiarismModel.getAllContests(domainId);
        } catch (err: any) {
            error = err.message;
        }

        this.response.body = { 
            contests,
            error,
            apiBase: PHOSPHORUS_API_BASE
        };
        this.response.template = 'plagiarism_contest_list.html';
    }
}

/**
 * 比赛查重检测 Handler - /plagiarism/contest/check
 */
class PlagiarismContestCheckHandler extends Handler {
    async post({ domainId, contestId, minTokens = 9, similarityThreshold = 0.0 }: { 
        domainId: string; 
        contestId: string; 
        minTokens?: number; 
        similarityThreshold?: number;
    }) {
        // 检查权限
        this.checkPriv(PRIV.PRIV_CREATE_DOMAIN);

        try {
            // 调用 Phosphorus API 进行检测
            const result = await plagiarismModel.checkContestPlagiarism(
                contestId, 
                minTokens, 
                similarityThreshold
            );

            this.response.body = { 
                success: true, 
                result,
                message: 'Contest plagiarism check completed successfully'
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
 * 比赛查重详情页面 Handler - /plagiarism/contest/:id
 */
class PlagiarismContestDetailHandler extends Handler {
    async get({ domainId, id }: { domainId: string; id: string }) {
        // 检查权限
        this.checkPriv(PRIV.PRIV_CREATE_DOMAIN);

        // 获取比赛信息
        const contest = await global.Hydro.model.contest.get(domainId, new ObjectId(id));
        if (!contest) {
            throw new NotFoundError(`Contest ${id}`);
        }

        // 获取检测结果
        let results: PlagiarismResult[] = [];
        let error: string | null = null;
        
        try {
            results = await plagiarismModel.getContestPlagiarismResults(id);
        } catch (err: any) {
            error = err.message;
        }

        // 获取用户信息
        const uids = new Set<number>();
        results.forEach(result => {
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
        });

        const udict = await UserModel.getList(domainId, Array.from(uids));

        this.response.body = { 
            contest,
            results, 
            error,
            udict,
            apiBase: PHOSPHORUS_API_BASE
        };
        this.response.template = 'plagiarism_contest_detail.html';
    }
}

/**
 * 题目查重列表页面 Handler - /plagiarism/problem
 */
class PlagiarismProblemListHandler extends Handler {
    async get({ domainId }: { domainId: string }) {
        // 检查权限：需要管理员权限
        this.checkPriv(PRIV.PRIV_CREATE_DOMAIN);

        this.response.body = { 
            message: 'Problem plagiarism detection is not implemented yet.',
            apiBase: PHOSPHORUS_API_BASE
        };
        this.response.template = 'plagiarism_problem_list.html';
    }
}

/**
 * 题目查重详情页面 Handler - /plagiarism/problem/:id
 */
class PlagiarismProblemDetailHandler extends Handler {
    async get({ domainId, id }: { domainId: string; id: string }) {
        // 检查权限
        this.checkPriv(PRIV.PRIV_CREATE_DOMAIN);

        this.response.body = { 
            problemId: id,
            message: 'Problem plagiarism detection is not implemented yet.',
            apiBase: PHOSPHORUS_API_BASE
        };
        this.response.template = 'plagiarism_problem_detail.html';
    }
}

/**
 * 导出检测结果 Handler
 */
class PlagiarismExportHandler extends Handler {
    async get({ domainId, type, id, rid }: { domainId: string; type: string; id: string; rid: string }) {
        // 检查权限
        this.checkPriv(PRIV.PRIV_CREATE_DOMAIN);

        if (type === 'contest') {
            // 获取比赛检测结果
            const results = await plagiarismModel.getContestPlagiarismResults(id);
            const result = results.find(r => r._id === rid);
            
            if (!result) {
                throw new NotFoundError(`Plagiarism result ${rid}`);
            }

            // 设置下载响应
            this.response.body = JSON.stringify(result, null, 2);
            this.response.type = 'application/json';
            this.response.addHeader('Content-Disposition', `attachment; filename="contest_plagiarism_${id}_${rid}.json"`);
        } else {
            throw new NotFoundError(`Export type ${type} not supported`);
        }
    }
}

export async function apply(ctx: Context) {
    // 注册路由
    ctx.Route('plagiarism_system', '/plagiarism', PlagiarismSystemHandler, PRIV.PRIV_USER_PROFILE);
    ctx.Route('plagiarism_contest_list', '/plagiarism/contest', PlagiarismContestListHandler, PRIV.PRIV_USER_PROFILE);
    ctx.Route('plagiarism_contest_check', '/plagiarism/contest/check', PlagiarismContestCheckHandler, PRIV.PRIV_USER_PROFILE);
    ctx.Route('plagiarism_contest_detail', '/plagiarism/contest/:id', PlagiarismContestDetailHandler, PRIV.PRIV_USER_PROFILE);
    ctx.Route('plagiarism_problem_list', '/plagiarism/problem', PlagiarismProblemListHandler, PRIV.PRIV_USER_PROFILE);
    ctx.Route('plagiarism_problem_detail', '/plagiarism/problem/:id', PlagiarismProblemDetailHandler, PRIV.PRIV_USER_PROFILE);
    ctx.Route('plagiarism_export', '/plagiarism/:type/:id/:rid/export', PlagiarismExportHandler, PRIV.PRIV_USER_PROFILE);
}
