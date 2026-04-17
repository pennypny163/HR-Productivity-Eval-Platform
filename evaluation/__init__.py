"""
V2 Evaluation Engine
Evaluation logic for the Digital Productivity Unit Assessment Platform
Supports qualification gate checking and scenario-specific assessment
"""
import json
import os
from typing import Dict, List, Optional, Any


# Track dimension definitions
TRACK_DIMENSIONS = {
    "sourcing_outreach": {
        "track_name": "候选人寻源与触达",
        "dimensions": [
            {"key": "search_recall_quality", "name": "候选人召回与搜索质量", "weight": 0.30},
            {"key": "matching_relevance", "name": "匹配相关性与推荐有效性", "weight": 0.30},
            {"key": "outreach_automation", "name": "触达效率与自动化能力", "weight": 0.25},
            {"key": "team_workflow_support", "name": "招聘团队协同与回写支持", "weight": 0.15}
        ]
    },
    "interview_assessment": {
        "track_name": "面试评估与辅助",
        "dimensions": [
            {"key": "structured_interview_support", "name": "结构化面试设计支持", "weight": 0.30},
            {"key": "evidence_extraction", "name": "评估证据提取与总结质量", "weight": 0.25},
            {"key": "consistency_bias_control", "name": "评估一致性与偏差控制", "weight": 0.25},
            {"key": "interviewer_collaboration", "name": "面试协同与反馈效率", "weight": 0.20}
        ]
    },
    "fullcycle_recruiting": {
        "track_name": "全流程招聘Agent/Platform",
        "dimensions": [
            {"key": "process_coverage", "name": "招聘流程覆盖与闭环能力", "weight": 0.30},
            {"key": "candidate_interaction", "name": "候选人交互与响应效率", "weight": 0.25},
            {"key": "recruiting_automation", "name": "招聘运营自动化水平", "weight": 0.25},
            {"key": "business_control", "name": "多角色协同与业务可控性", "weight": 0.20}
        ]
    }
}

# Hard gate definitions
HARD_GATES = [
    {
        "gate_id": "basic_accessibility",
        "gate_name": "基础可接入性",
        "description": "是否有明确的产品形态或可演示交互，是否存在可配置使用方式/API/平台入口"
    },
    {
        "gate_id": "enterprise_governance",
        "gate_name": "企业治理能力",
        "description": "是否支持基础权限/审计/管理机制"
    },
    {
        "gate_id": "data_privacy",
        "gate_name": "数据与隐私可接受性",
        "description": "对候选人敏感信息处理是否具备企业可接受性"
    },
    {
        "gate_id": "task_closure_minimum",
        "gate_name": "任务闭环最小成立",
        "description": "是否真的能完成其宣称的关键任务闭环"
    }
]

# Qualification base score weights
BASE_SCORE_WEIGHTS = {
    "operability": 0.25,
    "integration_readiness": 0.25,
    "enterprise_safety": 0.25,
    "task_closure": 0.25
}


def compute_qualification_total(base_scores: Dict[str, float]) -> float:
    """Compute weighted total for qualification base scores"""
    total = 0.0
    for key, weight in BASE_SCORE_WEIGHTS.items():
        total += base_scores.get(key, 0) * weight
    return round(total, 1)


def determine_shortlist_label(
    qualification_status: str,
    qualification_total: float,
    scenario_total: float
) -> str:
    """Determine the final shortlist label based on qualification and scenario results"""
    if qualification_status == "fail":
        return "D"
    elif qualification_status == "conditional_pass" and scenario_total < 70:
        return "C"
    elif qualification_status == "pass" and scenario_total >= 80:
        return "A"
    elif qualification_status == "pass" and scenario_total >= 68:
        return "B"
    else:
        return "C"


def determine_purchase_role(label: str, fit_level: str) -> str:
    """Determine the purchase role based on shortlist label and fit level"""
    if label == "A" and fit_level in ("core", "strong"):
        return "core_module"
    elif label in ("A", "B") and fit_level in ("core", "strong"):
        return "important_module"
    elif label in ("B", "C"):
        return "supplementary_module"
    else:
        return "observe_only"


def compute_scenario_total(dimensions: List[Dict], track: str) -> float:
    """Compute weighted total for scenario assessment dimensions"""
    track_config = TRACK_DIMENSIONS.get(track, {})
    dim_weights = {d["key"]: d["weight"] for d in track_config.get("dimensions", [])}

    total = 0.0
    for dim in dimensions:
        key = dim.get("dimension_key", "")
        score = dim.get("score", 0)
        weight = dim_weights.get(key, 0.25)
        total += score * weight

    return round(total, 1)


def get_track_info(track_key: str) -> Dict:
    """Get track information including dimensions and weights"""
    return TRACK_DIMENSIONS.get(track_key, {})


def get_all_tracks() -> Dict:
    """Get all track definitions"""
    return TRACK_DIMENSIONS


def get_hard_gates() -> List[Dict]:
    """Get hard gate definitions"""
    return HARD_GATES


def validate_evaluation_result(result: Dict) -> List[str]:
    """Validate an evaluation result structure and return any issues"""
    issues = []

    if "qualification" not in result:
        issues.append("Missing qualification result")
    else:
        q = result["qualification"]
        if "status" not in q:
            issues.append("Missing qualification status")
        if "hard_gate_results" not in q:
            issues.append("Missing hard gate results")
        if "base_scores" not in q:
            issues.append("Missing base scores")

    if "scenario_assessment" not in result:
        issues.append("Missing scenario assessment")
    else:
        s = result["scenario_assessment"]
        if "track" not in s:
            issues.append("Missing scenario track")
        if "dimensions" not in s:
            issues.append("Missing scenario dimensions")

    if "recommendation" not in result:
        issues.append("Missing recommendation")

    return issues
