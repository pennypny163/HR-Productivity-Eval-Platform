"""
SKU 标准化数据模型
定义数字生产力单元的统一建模结构
"""
from enum import Enum
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, field, asdict
import json


class SKUType(str, Enum):
    """SKU 类型枚举"""
    AGENT = "Agent"
    WORKFLOW = "Workflow"
    SKILL = "Skill"
    COMPONENT = "Component"
    MODEL = "Model"


class RuntimeMode(str, Enum):
    """运行模式枚举"""
    REAL = "real"
    SIMULATED = "simulated"
    API_STUB = "api_stub"
    DOCUMENTATION_ONLY = "documentation_only"


class EvalPath(str, Enum):
    """评测路径枚举"""
    AGENT_GPA = "完整Agent-GPA三阶段"
    AGENT_AMAZON = "完整Agent-Amazon二维"
    AMAZON_FOUNDATION = "Amazon底层-基础模型层"
    AMAZON_COMPONENT = "Amazon中层-Agent组件层"
    AMAZON_RESULT = "Amazon上层-完整结果层"


class PassFailStatus(str, Enum):
    """通过/失败状态"""
    PASS = "pass"
    FAIL = "fail"


class TierLevel(str, Enum):
    """最终分层等级"""
    S = "S"
    A = "A"
    B = "B"
    C = "C"


@dataclass
class SKUCard:
    """SKU 标准卡片"""
    id: str
    name: str
    name_cn: str
    source_url: str
    sku_type: str
    description: str
    input_format: str
    output_format: str
    can_run_independently: bool
    has_tool_calling: bool
    supports_multi_turn: bool
    is_open_source: bool
    can_local_demo: bool
    runtime_mode: str
    vendor: str
    tags: List[str] = field(default_factory=list)
    capabilities: List[str] = field(default_factory=list)
    recruiting_relevance: str = ""

    def to_dict(self):
        return asdict(self)


@dataclass
class GPAScore:
    """Snowflake GPA 三阶段评分"""
    goal_score: float = 0.0
    goal_detail: str = ""
    plan_score: float = 0.0
    plan_detail: str = ""
    action_score: float = 0.0
    action_detail: str = ""
    total_score: float = 0.0

    def calculate_total(self):
        self.total_score = round(
            self.goal_score * 0.4 + self.plan_score * 0.3 + self.action_score * 0.3, 2
        )
        return self.total_score


@dataclass
class AmazonAgentScore:
    """Amazon 通用 Agent 二维评估"""
    # 评估目标维度
    final_response_quality: float = 0.0
    task_completion: float = 0.0
    # 评估过程维度
    tool_usage: float = 0.0
    memory_multi_turn: float = 0.0
    reasoning_consistency: float = 0.0
    error_recovery: float = 0.0
    safety: float = 0.0
    cost_performance: float = 0.0
    total_score: float = 0.0

    def calculate_total(self):
        objective = (self.final_response_quality + self.task_completion) / 2
        process = (
            self.tool_usage * 0.2 + self.memory_multi_turn * 0.15 +
            self.reasoning_consistency * 0.2 + self.error_recovery * 0.15 +
            self.safety * 0.2 + self.cost_performance * 0.1
        )
        self.total_score = round(objective * 0.5 + process * 0.5, 2)
        return self.total_score


@dataclass
class AmazonLayerScore:
    """Amazon 三层评测框架（非Agent）"""
    layer: str = ""  # foundation / component / result
    # 底层指标
    domain_correctness: float = 0.0
    terminology_understanding: float = 0.0
    long_context_stability: float = 0.0
    cost_latency: float = 0.0
    safety_boundary: float = 0.0
    # 中层指标
    intent_detection: float = 0.0
    memory_capability: float = 0.0
    planner_quality: float = 0.0
    tool_routing: float = 0.0
    workflow_execution: float = 0.0
    tool_use_accuracy: float = 0.0
    # 上层指标
    final_response: float = 0.0
    task_completion: float = 0.0
    goal_success: float = 0.0
    goal_accuracy: float = 0.0
    safety: float = 0.0
    cost: float = 0.0
    experience: float = 0.0
    total_score: float = 0.0

    def calculate_total(self):
        if self.layer == "foundation":
            self.total_score = round(
                self.domain_correctness * 0.3 + self.terminology_understanding * 0.2 +
                self.long_context_stability * 0.2 + self.cost_latency * 0.15 +
                self.safety_boundary * 0.15, 2
            )
        elif self.layer == "component":
            self.total_score = round(
                self.intent_detection * 0.2 + self.memory_capability * 0.15 +
                self.planner_quality * 0.2 + self.tool_routing * 0.15 +
                self.workflow_execution * 0.15 + self.tool_use_accuracy * 0.15, 2
            )
        elif self.layer == "result":
            self.total_score = round(
                self.final_response * 0.2 + self.task_completion * 0.2 +
                self.goal_success * 0.15 + self.goal_accuracy * 0.15 +
                self.safety * 0.15 + self.cost * 0.05 + self.experience * 0.1, 2
            )
        return self.total_score


@dataclass
class GeneralEvalResult:
    """第一层合格考结果"""
    sku_id: str
    sku_name: str
    sku_type: str
    eval_path: str = ""
    gpa_score: Optional[Dict] = None
    amazon_agent_score: Optional[Dict] = None
    amazon_layer_score: Optional[Dict] = None
    total_score: float = 0.0
    status: str = "pass"
    fail_reasons: List[str] = field(default_factory=list)
    veto_triggered: bool = False
    veto_items: List[str] = field(default_factory=list)
    explanation: str = ""

    def to_dict(self):
        return asdict(self)


@dataclass
class RecruitingDimensionScore:
    """招聘方向单维度评分"""
    dimension_id: str
    dimension_name: str
    score: float = 0.0
    max_score: float = 100.0
    task_results: List[Dict] = field(default_factory=list)
    strengths: List[str] = field(default_factory=list)
    weaknesses: List[str] = field(default_factory=list)
    detail: str = ""


@dataclass
class ProfessionalEvalResult:
    """第二层专业评测结果"""
    sku_id: str
    sku_name: str
    sku_type: str
    dimensions: List[Dict] = field(default_factory=list)
    total_professional_score: float = 0.0
    tier: str = ""
    tier_reason: str = ""
    best_fit_stage: str = ""
    role_positioning: str = ""
    enterprise_recommendation: str = ""
    explanation: str = ""

    def to_dict(self):
        return asdict(self)


@dataclass
class FinalTieringResult:
    """最终分层结果"""
    sku_id: str
    sku_name: str
    sku_type: str
    general_score: float = 0.0
    professional_score: float = 0.0
    tier: str = ""
    tier_reason: str = ""
    best_fit_stage: str = ""
    role_positioning: str = ""
    enterprise_recommendation: str = ""
    suitable_for_trial: bool = False
    suitable_for_listing: bool = False
    suitable_for_combo: bool = False
    suitable_for_custom_dev: bool = False

    def to_dict(self):
        return asdict(self)
