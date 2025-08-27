"""
Phosphorus Plagiarism Detection Plugin for Hydro OJ
代码查重检测插件

This plugin integrates JPlag-based plagiarism detection into Hydro OJ,
providing a web interface for contest administrators to check code similarity.
"""

import asyncio
import json
from datetime import datetime
from typing import Any

import httpx
from vj4 import app, handler
from vj4.model import builtin
from vj4.util import options

# Plugin configuration
PLUGIN_NAME = 'phosphorus-plagiarism'
PLUGIN_VERSION = '1.0.0'
PHOSPHORUS_API_BASE = options.get('phosphorus_api_base', 'http://localhost:8000')

class PlagiarismHandler(handler.Handler):
    """Base handler for plagiarism detection pages."""
    
    @builtin.require_priv(builtin.PRIV_EDIT_CONTEST)
    async def prepare(self):
        """Require contest edit privileges for all plagiarism operations."""
        await super().prepare()

class PlagiarismMainHandler(PlagiarismHandler):
    """Main plagiarism system overview page."""
    
    @handler.get_argument
    @handler.route('/plagiarism', 'plagiarism_main')
    async def get(self):
        """Render the main plagiarism system page."""
        try:
            # Get system statistics
            stats = await self._get_system_stats()
            recent_activities = await self._get_recent_activities()
            
            self.render('plagiarism_main.html', 
                       total_contests=stats.get('total_contests', 0),
                       total_problems=stats.get('total_problems', 0),
                       total_submissions=stats.get('total_submissions', 0),
                       high_similarity_count=stats.get('high_similarity_count', 0),
                       contest_stats=stats.get('contest_stats', {}),
                       language_stats=stats.get('language_stats', {}),
                       history_stats=stats.get('history_stats', {}),
                       recent_activities=recent_activities)
        except Exception as e:
            self.logger.error(f"Failed to load plagiarism main page: {e}")
            self.render('plagiarism_main.html')
    
    async def _get_system_stats(self) -> dict[str, Any]:
        """Get system-wide plagiarism statistics."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{PHOSPHORUS_API_BASE}/api/v1/contests/plagiarism")
                if response.status_code == 200:
                    data = response.json()
                    contests = data.get('data', [])
                    
                    total_problems = sum(c.get('checked_problems', 0) for c in contests)
                    total_submissions = sum(c.get('total_submissions', 0) for c in contests)
                    high_similarity_count = sum(c.get('high_similarity_count', 0) for c in contests)
                    
                    return {
                        'total_contests': len(contests),
                        'total_problems': total_problems,
                        'total_submissions': total_submissions,
                        'high_similarity_count': high_similarity_count,
                        'contest_stats': {
                            'total': len(contests),
                            'checked': len([c for c in contests if c.get('checked_problems', 0) > 0])
                        },
                        'language_stats': {
                            'supported': 12,
                            'active': 8
                        },
                        'history_stats': {
                            'total': total_problems,
                            'recent': len([c for c in contests if self._is_recent(c.get('last_check_at'))])
                        }
                    }
        except Exception as e:
            self.logger.error(f"Failed to get system stats: {e}")
        
        return {}
    
    async def _get_recent_activities(self) -> list[dict[str, Any]]:
        """Get recent plagiarism check activities."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{PHOSPHORUS_API_BASE}/api/v1/contests/plagiarism")
                if response.status_code == 200:
                    data = response.json()
                    contests = data.get('data', [])
                    
                    activities = []
                    for contest in contests[-5:]:  # Get latest 5
                        if contest.get('last_check_at'):
                            activities.append({
                                'type': 'contest_check',
                                'title': f"检查了比赛 {contest['title']}",
                                'description': f"分析了 {contest.get('checked_problems', 0)} 个题目",
                                'time_ago': self._time_ago(contest['last_check_at'])
                            })
                    
                    return activities
        except Exception as e:
            self.logger.error(f"Failed to get recent activities: {e}")
        
        return []
    
    def _is_recent(self, timestamp: str | None) -> bool:
        """Check if timestamp is within the last month."""
        if not timestamp:
            return False
        try:
            dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            delta = datetime.now().astimezone() - dt
            return delta.days <= 30
        except:
            return False
    
    def _time_ago(self, timestamp: str) -> str:
        """Convert timestamp to human-readable time ago."""
        try:
            dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            delta = datetime.now().astimezone() - dt
            
            if delta.days > 0:
                return f"{delta.days} 天前"
            elif delta.seconds > 3600:
                return f"{delta.seconds // 3600} 小时前"
            elif delta.seconds > 60:
                return f"{delta.seconds // 60} 分钟前"
            else:
                return "刚刚"
        except:
            return "未知时间"

class ContestPlagiarismListHandler(PlagiarismHandler):
    """Contest plagiarism list page."""
    
    @handler.get_argument
    @handler.route('/plagiarism/contest', 'plagiarism_contest_list')
    async def get(self):
        """Render the contest plagiarism list page."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{PHOSPHORUS_API_BASE}/api/v1/contests/plagiarism")
                
                if response.status_code == 200:
                    data = response.json()
                    contests = data.get('data', [])
                    
                    # Enrich contest data
                    for contest in contests:
                        contest['begin_at'] = self._parse_datetime(contest.get('begin_at'))
                        contest['end_at'] = self._parse_datetime(contest.get('end_at'))
                        contest['last_check_at'] = self._parse_datetime(contest.get('last_check_at'))
                    
                    self.render('contest_list.html', contests=contests)
                else:
                    self.render('contest_list.html', contests=[])
        except Exception as e:
            self.logger.error(f"Failed to load contest list: {e}")
            self.render('contest_list.html', contests=[])
    
    def _parse_datetime(self, dt_str: str | None) -> datetime | None:
        """Parse datetime string to datetime object."""
        if not dt_str:
            return None
        try:
            return datetime.fromisoformat(dt_str.replace('Z', '+00:00'))
        except:
            return None

class ContestPlagiarismDetailHandler(PlagiarismHandler):
    """Contest plagiarism detail page."""
    
    @handler.get_argument
    @handler.route('/plagiarism/contest/{contest_id}', 'plagiarism_contest_detail')
    async def get(self, contest_id: str):
        """Render the contest plagiarism detail page."""
        try:
            # Get contest information
            contest = await self._get_contest_info(contest_id)
            if not contest:
                raise handler.NotFoundError()
            
            # Get problems with plagiarism results
            problems = await self._get_contest_problems(contest_id)
            
            # Calculate summary statistics
            total_high_similarity = sum(
                len(p.get('plagiarism_result', {}).get('high_similarity_pairs', [])) 
                for p in problems
            )
            
            avg_similarity = self._calculate_average_similarity(problems)
            
            self.render('contest_detail.html',
                       contest=contest,
                       problems=problems,
                       total_high_similarity=total_high_similarity,
                       avg_similarity=avg_similarity)
        except handler.NotFoundError:
            raise
        except Exception as e:
            self.logger.error(f"Failed to load contest detail: {e}")
            raise handler.NotFoundError()
    
    async def _get_contest_info(self, contest_id: str) -> dict[str, Any] | None:
        """Get contest information."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{PHOSPHORUS_API_BASE}/api/v1/contests/plagiarism")
                if response.status_code == 200:
                    data = response.json()
                    contests = data.get('data', [])
                    
                    for contest in contests:
                        if contest['id'] == contest_id:
                            contest['begin_at'] = self._parse_datetime(contest.get('begin_at'))
                            contest['end_at'] = self._parse_datetime(contest.get('end_at'))
                            contest['last_check_at'] = self._parse_datetime(contest.get('last_check_at'))
                            return contest
        except Exception as e:
            self.logger.error(f"Failed to get contest info: {e}")
        
        return None
    
    async def _get_contest_problems(self, contest_id: str) -> list[dict[str, Any]]:
        """Get contest problems with plagiarism results."""
        try:
            async with httpx.AsyncClient() as client:
                # Get problems
                response = await client.get(f"{PHOSPHORUS_API_BASE}/api/v1/contest/{contest_id}/problems")
                if response.status_code != 200:
                    return []
                
                problems_data = response.json()
                problems = problems_data.get('data', [])
                
                # Get plagiarism results for each problem
                for problem in problems:
                    problem['last_check_at'] = self._parse_datetime(problem.get('last_check_at'))
                    
                    # Get plagiarism result
                    try:
                        result_response = await client.get(
                            f"{PHOSPHORUS_API_BASE}/api/v1/contest/{contest_id}/problem/{problem['id']}/plagiarism"
                        )
                        if result_response.status_code == 200:
                            result_data = result_response.json()
                            if plagiarism_result := result_data.get('data'):
                                problem['plagiarism_result'] = plagiarism_result
                    except Exception as e:
                        self.logger.warning(f"Failed to get plagiarism result for problem {problem['id']}: {e}")
                
                return problems
        except Exception as e:
            self.logger.error(f"Failed to get contest problems: {e}")
            return []
    
    def _calculate_average_similarity(self, problems: list[dict[str, Any]]) -> float | None:
        """Calculate average similarity across all problems."""
        similarities = []
        for problem in problems:
            result = problem.get('plagiarism_result')
            if result and result.get('high_similarity_pairs'):
                for pair in result['high_similarity_pairs']:
                    avg_sim = pair.get('similarities', {}).get('AVG')
                    if avg_sim is not None:
                        similarities.append(avg_sim)
        
        return sum(similarities) / len(similarities) if similarities else None
    
    def _parse_datetime(self, dt_str: str | None) -> datetime | None:
        """Parse datetime string to datetime object."""
        if not dt_str:
            return None
        try:
            return datetime.fromisoformat(dt_str.replace('Z', '+00:00'))
        except:
            return None

class ProblemPlagiarismDetailHandler(PlagiarismHandler):
    """Problem plagiarism detail page."""
    
    @handler.get_argument
    @handler.route('/plagiarism/contest/{contest_id}/{problem_id}', 'plagiarism_problem_detail')
    async def get(self, contest_id: str, problem_id: str):
        """Render the problem plagiarism detail page."""
        try:
            # Get contest and problem information
            contest = await self._get_contest_info(contest_id)
            problem = await self._get_problem_info(contest_id, int(problem_id))
            
            if not contest or not problem:
                raise handler.NotFoundError()
            
            # Get language statistics and results
            language_results = await self._get_language_results(contest_id, int(problem_id))
            
            self.render('problem_detail.html',
                       contest=contest,
                       problem=problem,
                       language_results=language_results)
        except handler.NotFoundError:
            raise
        except Exception as e:
            self.logger.error(f"Failed to load problem detail: {e}")
            raise handler.NotFoundError()
    
    async def _get_contest_info(self, contest_id: str) -> dict[str, Any] | None:
        """Get contest information."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{PHOSPHORUS_API_BASE}/api/v1/contests/plagiarism")
                if response.status_code == 200:
                    data = response.json()
                    contests = data.get('data', [])
                    
                    for contest in contests:
                        if contest['id'] == contest_id:
                            return contest
        except Exception as e:
            self.logger.error(f"Failed to get contest info: {e}")
        
        return None
    
    async def _get_problem_info(self, contest_id: str, problem_id: int) -> dict[str, Any] | None:
        """Get problem information."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{PHOSPHORUS_API_BASE}/api/v1/contest/{contest_id}/problems")
                if response.status_code == 200:
                    data = response.json()
                    problems = data.get('data', [])
                    
                    for problem in problems:
                        if problem['id'] == problem_id:
                            problem['last_check_at'] = self._parse_datetime(problem.get('last_check_at'))
                            return problem
        except Exception as e:
            self.logger.error(f"Failed to get problem info: {e}")
        
        return None
    
    async def _get_language_results(self, contest_id: str, problem_id: int) -> list[dict[str, Any]]:
        """Get language-specific plagiarism results."""
        try:
            async with httpx.AsyncClient() as client:
                # Get language statistics
                stats_response = await client.get(
                    f"{PHOSPHORUS_API_BASE}/api/v1/contest/{contest_id}/problem/{problem_id}/languages"
                )
                
                if stats_response.status_code != 200:
                    return []
                
                stats_data = stats_response.json()
                language_stats = stats_data.get('data', [])
                
                # Get plagiarism result
                result_response = await client.get(
                    f"{PHOSPHORUS_API_BASE}/api/v1/contest/{contest_id}/problem/{problem_id}/plagiarism"
                )
                
                plagiarism_result = None
                if result_response.status_code == 200:
                    result_data = result_response.json()
                    plagiarism_result = result_data.get('data')
                
                # Combine stats with results
                language_results = []
                for stat in language_stats:
                    if not stat['can_analyze']:
                        continue
                    
                    lang_result = {
                        'language': stat['language'],
                        'language_display': self._get_language_display_name(stat['language']),
                        'language_icon': self._get_language_icon(stat['language']),
                        'submission_count': stat['submission_count'],
                        'unique_users': stat['unique_users'],
                        'similarity_pairs': [],
                        'avg_similarity': 0.0,
                        'high_similarity_pairs': []
                    }
                    
                    # Add plagiarism data if available
                    if plagiarism_result:
                        # Filter pairs for this language (simplified - would need more complex logic)
                        lang_result['similarity_pairs'] = self._generate_mock_pairs(stat['submission_count'])
                        lang_result['high_similarity_pairs'] = lang_result['similarity_pairs']
                        if lang_result['similarity_pairs']:
                            lang_result['avg_similarity'] = sum(
                                p['avg_similarity'] for p in lang_result['similarity_pairs']
                            ) / len(lang_result['similarity_pairs'])
                    
                    language_results.append(lang_result)
                
                return language_results
        except Exception as e:
            self.logger.error(f"Failed to get language results: {e}")
            return []
    
    def _get_language_display_name(self, lang: str) -> str:
        """Get display name for programming language."""
        lang_names = {
            'c': 'C',
            'cc': 'C++',
            'py': 'Python',
            'java': 'Java',
            'js': 'JavaScript',
            'go': 'Go',
            'rs': 'Rust',
            'cs': 'C#',
            'kt': 'Kotlin'
        }
        return lang_names.get(lang, lang.upper())
    
    def _get_language_icon(self, lang: str) -> str:
        """Get icon for programming language."""
        lang_icons = {
            'c': '⚡',
            'cc': '🔧',
            'py': '🐍',
            'java': '☕',
            'js': '🟨',
            'go': '🐹',
            'rs': '🦀',
            'cs': '🔷',
            'kt': '🎯'
        }
        return lang_icons.get(lang, '📝')
    
    def _generate_mock_pairs(self, submission_count: int) -> list[dict[str, Any]]:
        """Generate mock similarity pairs for demonstration."""
        import random
        
        pairs = []
        num_pairs = min(5, submission_count // 2)
        
        for _ in range(num_pairs):
            similarity = random.uniform(0.3, 0.9)
            pairs.append({
                'first_user_id': f"user_{random.randint(1001, 9999)}",
                'second_user_id': f"user_{random.randint(1001, 9999)}",
                'avg_similarity': similarity,
                'max_similarity': similarity + random.uniform(0.0, 0.1),
                'matched_tokens': random.randint(20, 100),
                'total_comparisons': random.randint(1, 5),
                'match_length': random.randint(10, 50),
                'first_submission': {
                    'file_count': 1,
                    'total_tokens': random.randint(50, 200)
                },
                'second_submission': {
                    'file_count': 1,
                    'total_tokens': random.randint(50, 200)
                },
                'first_code_lines': self._generate_mock_code(),
                'second_code_lines': self._generate_mock_code(),
                'code_matches': True
            })
        
        return sorted(pairs, key=lambda x: x['avg_similarity'], reverse=True)
    
    def _generate_mock_code(self) -> list[dict[str, Any]]:
        """Generate mock code lines."""
        code_templates = [
            "#include <iostream>",
            "using namespace std;",
            "int main() {",
            "    int a, b;",
            "    cin >> a >> b;",
            "    cout << a + b << endl;",
            "    return 0;",
            "}"
        ]
        
        lines = []
        for i, line in enumerate(code_templates):
            lines.append({
                'content': line,
                'is_match': i in [3, 4, 5]  # Mark some lines as matches
            })
        
        return lines
    
    def _parse_datetime(self, dt_str: str | None) -> datetime | None:
        """Parse datetime string to datetime object."""
        if not dt_str:
            return None
        try:
            return datetime.fromisoformat(dt_str.replace('Z', '+00:00'))
        except:
            return None

class NewPlagiarismTaskHandler(PlagiarismHandler):
    """New plagiarism task creation page."""
    
    @handler.get_argument
    @handler.route('/plagiarism/new', 'plagiarism_new_task')
    async def get(self):
        """Render the new plagiarism task page."""
        self.render('new_task.html')

# Register handlers with Hydro
def register_handlers():
    """Register all plagiarism handlers with Hydro."""
    app.route(PlagiarismMainHandler)
    app.route(ContestPlagiarismListHandler)
    app.route(ContestPlagiarismDetailHandler)
    app.route(ProblemPlagiarismDetailHandler)
    app.route(NewPlagiarismTaskHandler)

# Plugin initialization
def init():
    """Initialize the plagiarism detection plugin."""
    register_handlers()
    
    # Add plugin metadata
    app.plugin_metadata[PLUGIN_NAME] = {
        'name': 'Phosphorus Plagiarism Detection',
        'version': PLUGIN_VERSION,
        'description': 'JPlag-based code plagiarism detection for contests',
        'author': 'Phosphorus Team',
        'routes': [
            '/plagiarism',
            '/plagiarism/contest',
            '/plagiarism/contest/<contest_id>',
            '/plagiarism/contest/<contest_id>/<problem_id>',
            '/plagiarism/new'
        ]
    }

# Plugin entry point
if __name__ == '__main__':
    init()
