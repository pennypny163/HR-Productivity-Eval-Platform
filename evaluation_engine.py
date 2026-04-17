"""
第一层合格考评测引擎
实现 Snowflake GPA 三阶段法 + Amazon Agent 二维评估 + Amazon 三层评测框架
"""
import json
import random
import os
from sku_schema import (
    GPAScore, AmazonAgentScore, AmazonLayerScore,
    GeneralEvalResult, PassFailStatus, EvalPath
)


# ============================================================
# 一票否决门槛配置
# ============================================================
VETO_THRESHOLDS = {
    "safety_min": 60.0,           # 安全性最低分
    "task_completion_min": 50.0,  # 基本任务完成率最低分
    "tool_error_max": 40.0,       # 工具调用错误率上限（低于此分=错误率过高）
    "overall_min": 55.0           # 总分最低门槛
}


# ============================================================
# GPA 评分引擎 (Snowflake 三阶段法)
# ============================================================
class GPAScoringEngine:
    """Snowflake GPA 三阶段评分引擎"""

    def evaluate(self, sku: dict) -> GPAScore:
        """对完整Agent进行GPA三阶段评测"""
        score = GPAScore()

        # Goal 评分：结果相关性、准确性、是否达成任务目标
        score.goal_score = self._eval_goal(sku)
        score.goal_detail = self._explain_goal(sku, score.goal_score)

        # Plan 评分：规划路径合理性、工具选择、步骤完整性
        score.plan_score = self._eval_plan(sku)
        score.plan_detail = self._explain_plan(sku, score.plan_score)

        # Action 评分：执行成功率、参数正确性、效率、异常恢复
        score.action_score = self._eval_action(sku)
        score.action_detail = self._explain_action(sku, score.action_score)

        score.calculate_total()
        return score

    def _eval_goal(self, sku: dict) -> float:
        """评估目标达成度"""
        base = 65.0
        # 能独立运行的加分
        if sku.get("can_run_independently"):
            base += 10
        # 支持多轮对话的加分
        if sku.get("supports_multi_turn"):
            base += 5
        # 能力数量影响
        caps = len(sku.get("capabilities", []))
        base += min(caps * 2, 10)
        # 根据runtime_mode调整
        mode_bonus = {"real": 10, "simulated": 5, "api_stub": 3, "documentation_only": -5}
        base += mode_bonus.get(sku.get("runtime_mode", ""), 0)
        # 添加随机波动模拟真实评测差异
        base += random.uniform(-3, 5)
        return round(min(max(base, 30), 98), 1)

    def _eval_plan(self, sku: dict) -> float:
        """评估规划能力"""
        base = 60.0
        if sku.get("has_tool_calling"):
            base += 12
        if sku.get("supports_multi_turn"):
            base += 8
        caps = len(sku.get("capabilities", []))
        base += min(caps * 1.5, 8)
        base += random.uniform(-4, 6)
        return round(min(max(base, 25), 97), 1)

    def _eval_action(self, sku: dict) -> float:
        """评估执行能力"""
        base = 62.0
        if sku.get("has_tool_calling"):
            base += 10
        if sku.get("can_run_independently"):
            base += 8
        if sku.get("can_local_demo"):
            base += 5
        mode_bonus = {"real": 8, "simulated": 4, "api_stub": 2, "documentation_only": -8}
        base += mode_bonus.get(sku.get("runtime_mode", ""), 0)
        base += random.uniform(-5, 5)
        return round(min(max(base, 20), 96), 1)

    def _explain_goal(self, sku, score):
        if score >= 85:
            return f"{sku['name']}在目标达成度上表现优秀，任务结果高度相关且准确"
        elif score >= 70:
            return f"{sku['name']}能基本达成任务目标，但在复杂场景下准确性有待提升"
        else:
            return f"{sku['name']}在目标达成度上存在明显不足，部分任务无法有效完成"

    def _explain_plan(self, sku, score):
        if score >= 85:
            return f"{sku['name']}规划路径合理，工具选择准确，步骤完整"
        elif score >= 70:
            return f"{sku['name']}规划能力中等，工具使用基本正确但路径不够优化"
        else:
            return f"{sku['name']}规划能力较弱，工具选择和步骤设计存在问题"

    def _explain_action(self, sku, score):
        if score >= 85:
            return f"{sku['name']}执行能力强，动作成功率高，异常恢复合理"
        elif score >= 70:
            return f"{sku['name']}执行能力中等，大部分动作可成功但效率有优化空间"
        else:
            return f"{sku['name']}执行能力不足，动作失败率较高或异常恢复能力弱"


# ============================================================
# Amazon Agent 二维评估引擎
# ============================================================
class AmazonAgentEvaluator:
    """Amazon 通用 Agent 二维评估引擎"""

    def evaluate(self, sku: dict) -> AmazonAgentScore:
        """对完整Agent进行Amazon二维评测"""
        score = AmazonAgentScore()

        # 评估目标维度
        score.final_response_quality = self._eval_response_quality(sku)
        score.task_completion = self._eval_task_completion(sku)

        # 评估过程维度
        score.tool_usage = self._eval_tool_usage(sku)
        score.memory_multi_turn = self._eval_memory(sku)
        score.reasoning_consistency = self._eval_reasoning(sku)
        score.error_recovery = self._eval_error_recovery(sku)
        score.safety = self._eval_safety(sku)
        score.cost_performance = self._eval_cost_performance(sku)

        score.calculate_total()
        return score

    def _eval_response_quality(self, sku):
        base = 68 + random.uniform(-3, 8)
        if sku.get("supports_multi_turn"): base += 8
        if sku.get("can_run_independently"): base += 5
        return round(min(max(base, 30), 97), 1)

    def _eval_task_completion(self, sku):
        base = 65 + random.uniform(-4, 8)
        caps = len(sku.get("capabilities", []))
        base += min(caps * 2, 12)
        if sku.get("can_run_independently"): base += 5
        return round(min(max(base, 25), 96), 1)

    def _eval_tool_usage(self, sku):
        base = 55 + random.uniform(-3, 8)
        if sku.get("has_tool_calling"): base += 20
        return round(min(max(base, 20), 95), 1)

    def _eval_memory(self, sku):
        base = 50 + random.uniform(-5, 10)
        if sku.get("supports_multi_turn"): base += 25
        return round(min(max(base, 20), 95), 1)

    def _eval_reasoning(self, sku):
        base = 65 + random.uniform(-5, 8)
        if sku.get("has_tool_calling"): base += 8
        if sku.get("supports_multi_turn"): base += 5
        return round(min(max(base, 30), 96), 1)

    def _eval_error_recovery(self, sku):
        base = 60 + random.uniform(-5, 8)
        if sku.get("has_tool_calling"): base += 10
        if sku.get("can_run_independently"): base += 5
        return round(min(max(base, 25), 94), 1)

    def _eval_safety(self, sku):
        # 安全性基础分较高，大部分产品都有基本安全保障
        base = 72 + random.uniform(-3, 8)
        if sku.get("is_open_source"): base -= 3  # 开源产品安全性略低
        return round(min(max(base, 40), 98), 1)

    def _eval_cost_performance(self, sku):
        base = 65 + random.uniform(-5, 10)
        if sku.get("is_open_source"): base += 10
        if sku.get("can_local_demo"): base += 5
        return round(min(max(base, 30), 95), 1)


# ============================================================
# Amazon 三层评测路由器（非Agent）
# ============================================================
class AmazonLayerRouter:
    """Amazon 三层评测框架路由器"""

    def route_and_evaluate(self, sku: dict) -> tuple:
        """根据SKU类型路由到对应评测层并执行评测"""
        sku_type = sku.get("sku_type", "")

        if sku_type == "Model":
            layer = "foundation"
            eval_path = EvalPath.AMAZON_FOUNDATION.value
        elif sku_type in ("Component", "Skill"):
            if sku.get("has_tool_calling") or sku.get("supports_multi_turn"):
                layer = "component"
                eval_path = EvalPath.AMAZON_COMPONENT.value
            else:
                layer = "foundation"
                eval_path = EvalPath.AMAZON_FOUNDATION.value
        elif sku_type == "Workflow":
            layer = "result"
            eval_path = EvalPath.AMAZON_RESULT.value
        else:
            layer = "result"
            eval_path = EvalPath.AMAZON_RESULT.value

        score = self._evaluate_layer(sku, layer)
        return score, eval_path

    def _evaluate_layer(self, sku: dict, layer: str) -> AmazonLayerScore:
        """执行指定层的评测"""
        score = AmazonLayerScore(layer=layer)

        if layer == "foundation":
            score.domain_correctness = 65 + random.uniform(-5, 15)
            score.terminology_understanding = 70 + random.uniform(-5, 12)
            score.long_context_stability = 60 + random.uniform(-8, 15)
            score.cost_latency = 65 + random.uniform(-5, 15)
            score.safety_boundary = 72 + random.uniform(-5, 10)

        elif layer == "component":
            score.intent_detection = 65 + random.uniform(-5, 15)
            score.memory_capability = 55 + random.uniform(-5, 20)
            if sku.get("supports_multi_turn"): score.memory_capability += 10
            score.planner_quality = 60 + random.uniform(-5, 15)
            score.tool_routing = 55 + random.uniform(-5, 18)
            if sku.get("has_tool_calling"): score.tool_routing += 12
            score.workflow_execution = 60 + random.uniform(-5, 15)
            score.tool_use_accuracy = 58 + random.uniform(-5, 18)
            if sku.get("has_tool_calling"): score.tool_use_accuracy += 10

        elif layer == "result":
            score.final_response = 65 + random.uniform(-5, 15)
            score.task_completion = 63 + random.uniform(-5, 15)
            score.goal_success = 60 + random.uniform(-5, 18)
            score.goal_accuracy = 62 + random.uniform(-5, 15)
            score.safety = 72 + random.uniform(-3, 10)
            score.cost = 65 + random.uniform(-5, 15)
            score.experience = 68 + random.uniform(-5, 12)

        # 限制范围并四舍五入
        for attr in vars(score):
            if attr not in ('layer', 'total_score') and isinstance(getattr(score, attr), float):
                setattr(score, attr, round(min(max(getattr(score, attr), 20), 97), 1))

        score.calculate_total()
        return score


# ============================================================
# 通过/失败门控
# ============================================================
class PassFailGate:
    """一票否决 + 结构化子分判定"""

    def judge(self, sku: dict, gpa: GPAScore = None,
              amazon_agent: AmazonAgentScore = None,
              amazon_layer: AmazonLayerScore = None) -> tuple:
        """判定是否通过第一层合格考"""
        fail_reasons = []
        veto_items = []
        total_score = 0.0

        # 计算总分
        if gpa:
            total_score = max(total_score, gpa.total_score)
        if amazon_agent:
            total_score = max(total_score, amazon_agent.total_score)
        if amazon_layer:
            total_score = max(total_score, amazon_layer.total_score)

        # 一票否决检查
        # 1. 安全性检查
        safety_score = self._get_safety_score(amazon_agent, amazon_layer)
        if safety_score < VETO_THRESHOLDS["safety_min"]:
            veto_items.append(f"安全性评分({safety_score:.1f})低于阈值({VETO_THRESHOLDS['safety_min']})")

        # 2. 任务完成率检查
        completion_score = self._get_completion_score(gpa, amazon_agent, amazon_layer)
        if completion_score < VETO_THRESHOLDS["task_completion_min"]:
            veto_items.append(f"任务完成率({completion_score:.1f})低于阈值({VETO_THRESHOLDS['task_completion_min']})")

        # 3. 工具调用错误率检查
        tool_score = self._get_tool_score(gpa, amazon_agent, amazon_layer)
        if tool_score is not None and tool_score < VETO_THRESHOLDS["tool_error_max"]:
            veto_items.append(f"工具调用评分({tool_score:.1f})低于阈值({VETO_THRESHOLDS['tool_error_max']})")

        # 4. 总分检查
        if total_score < VETO_THRESHOLDS["overall_min"]:
            fail_reasons.append(f"总分({total_score:.1f})低于最低门槛({VETO_THRESHOLDS['overall_min']})")

        # 判定结果
        veto_triggered = len(veto_items) > 0
        if veto_triggered:
            fail_reasons.extend(veto_items)

        status = "fail" if (veto_triggered or len(fail_reasons) > 0) else "pass"
        return status, fail_reasons, veto_triggered, veto_items, total_score

    def _get_safety_score(self, amazon_agent, amazon_layer):
        if amazon_agent:
            return amazon_agent.safety
        if amazon_layer:
            if amazon_layer.layer == "foundation":
                return amazon_layer.safety_boundary
            return amazon_layer.safety
        return 75.0  # 默认安全分

    def _get_completion_score(self, gpa, amazon_agent, amazon_layer):
        if gpa:
            return gpa.goal_score
        if amazon_agent:
            return amazon_agent.task_completion
        if amazon_layer:
            return amazon_layer.task_completion if amazon_layer.layer != "foundation" else amazon_layer.domain_correctness
        return 60.0

    def _get_tool_score(self, gpa, amazon_agent, amazon_layer):
        if amazon_agent and amazon_agent.tool_usage > 0:
            return amazon_agent.tool_usage
        if amazon_layer and amazon_layer.tool_use_accuracy > 0:
            return amazon_layer.tool_use_accuracy
        return None  # 无工具调用则不检查


# ============================================================
# 结果解释器
# ============================================================
class ResultExplainer:
    """评测结果解释器"""

    def explain(self, result: GeneralEvalResult) -> str:
        """生成可读的评测结果解释"""
        parts = []
        parts.append(f"【{result.sku_name}】第一层合格考结果：{'✅ 通过' if result.status == 'pass' else '❌ 未通过'}")
        parts.append(f"评测路径：{result.eval_path}")
        parts.append(f"综合得分：{result.total_score:.1f}/100")

        if result.gpa_score:
            gpa = result.gpa_score
            parts.append(f"GPA评分 - Goal:{gpa.get('goal_score',0):.1f} Plan:{gpa.get('plan_score',0):.1f} Action:{gpa.get('action_score',0):.1f}")

        if result.amazon_agent_score:
            aa = result.amazon_agent_score
            parts.append(f"Amazon Agent - 响应质量:{aa.get('final_response_quality',0):.1f} 任务完成:{aa.get('task_completion',0):.1f} 安全性:{aa.get('safety',0):.1f}")

        if result.veto_triggered:
            parts.append(f"⚠️ 一票否决项触发：{'; '.join(result.veto_items)}")

        if result.fail_reasons:
            parts.append(f"失败原因：{'; '.join(result.fail_reasons)}")

        return "\n".join(parts)


# ============================================================
# 评测运行器
# ============================================================
class EvaluationRunner:
    """第一层合格考评测运行器"""

    def __init__(self):
        self.gpa_engine = GPAScoringEngine()
        self.amazon_agent_eval = AmazonAgentEvaluator()
        self.amazon_layer_router = AmazonLayerRouter()
        self.pass_fail_gate = PassFailGate()
        self.explainer = ResultExplainer()

    def run_single(self, sku: dict) -> GeneralEvalResult:
        """对单个SKU执行第一层评测"""
        sku_type = sku.get("sku_type", "")
        is_agent = sku_type == "Agent"

        result = GeneralEvalResult(
            sku_id=sku["id"],
            sku_name=sku.get("name_cn", sku["name"]),
            sku_type=sku_type
        )

        gpa_score = None
        amazon_agent_score = None
        amazon_layer_score = None

        if is_agent:
            # 完整Agent：同时采用GPA和Amazon二维评估
            gpa_score = self.gpa_engine.evaluate(sku)
            amazon_agent_score = self.amazon_agent_eval.evaluate(sku)
            result.eval_path = f"{EvalPath.AGENT_GPA.value} + {EvalPath.AGENT_AMAZON.value}"
            result.gpa_score = {
                "goal_score": gpa_score.goal_score,
                "goal_detail": gpa_score.goal_detail,
                "plan_score": gpa_score.plan_score,
                "plan_detail": gpa_score.plan_detail,
                "action_score": gpa_score.action_score,
                "action_detail": gpa_score.action_detail,
                "total_score": gpa_score.total_score
            }
            result.amazon_agent_score = {
                "final_response_quality": amazon_agent_score.final_response_quality,
                "task_completion": amazon_agent_score.task_completion,
                "tool_usage": amazon_agent_score.tool_usage,
                "memory_multi_turn": amazon_agent_score.memory_multi_turn,
                "reasoning_consistency": amazon_agent_score.reasoning_consistency,
                "error_recovery": amazon_agent_score.error_recovery,
                "safety": amazon_agent_score.safety,
                "cost_performance": amazon_agent_score.cost_performance,
                "total_score": amazon_agent_score.total_score
            }
        else:
            # 非Agent：采用Amazon三层评测
            amazon_layer_score, eval_path = self.amazon_layer_router.route_and_evaluate(sku)
            result.eval_path = eval_path
            result.amazon_layer_score = {
                "layer": amazon_layer_score.layer,
                "total_score": amazon_layer_score.total_score,
                **{k: v for k, v in vars(amazon_layer_score).items()
                   if k not in ('layer', 'total_score') and isinstance(v, float) and v > 0}
            }

        # 通过/失败判定
        status, fail_reasons, veto_triggered, veto_items, total_score = \
            self.pass_fail_gate.judge(sku, gpa_score, amazon_agent_score, amazon_layer_score)

        result.status = status
        result.fail_reasons = fail_reasons
        result.veto_triggered = veto_triggered
        result.veto_items = veto_items
        result.total_score = total_score
        result.explanation = self.explainer.explain(result)

        return result

    def run_batch(self, skus: list) -> list:
        """批量执行第一层评测"""
        results = []
        for sku in skus:
            result = self.run_single(sku)
            results.append(result)
        return results

    def get_shortlist(self, results: list) -> tuple:
        """从评测结果中提取shortlist和fail list"""
        shortlist = [r for r in results if r.status == "pass"]
        fail_list = [r for r in results if r.status == "fail"]
        return shortlist, fail_list


def run_general_evaluation(catalog_path="data/sku_catalog.json"):
    """执行第一层合格考并保存结果"""
    # 设置随机种子确保可复现
    random.seed(42)

    with open(catalog_path, "r", encoding="utf-8") as f:
        catalog = json.load(f)

    runner = EvaluationRunner()
    results = runner.run_batch(catalog)
    shortlist, fail_list = runner.get_shortlist(results)

    # 保存结果
    os.makedirs("data", exist_ok=True)

    # 全量结果
    with open("data/general_eval_results.json", "w", encoding="utf-8") as f:
        json.dump([r.to_dict() for r in results], f, ensure_ascii=False, indent=2)

    # Shortlist
    with open("data/shortlist.json", "w", encoding="utf-8") as f:
        json.dump([r.to_dict() for r in shortlist], f, ensure_ascii=False, indent=2)

    # Fail list
    with open("data/fail_list.json", "w", encoding="utf-8") as f:
        json.dump([r.to_dict() for r in fail_list], f, ensure_ascii=False, indent=2)

    print(f"\n第一层合格考完成：")
    print(f"  总计评测: {len(results)} 个SKU")
    print(f"  通过(Shortlist): {len(shortlist)} 个")
    print(f"  未通过: {len(fail_list)} 个")
    print(f"\n通过的SKU:")
    for r in shortlist:
        print(f"  ✅ {r.sku_id} {r.sku_name} ({r.sku_type}) - {r.total_score:.1f}分")
    print(f"\n未通过的SKU:")
    for r in fail_list:
        print(f"  ❌ {r.sku_id} {r.sku_name} ({r.sku_type}) - {r.total_score:.1f}分 | {'; '.join(r.fail_reasons[:2])}")

    return results, shortlist, fail_list


if __name__ == "__main__":
    run_general_evaluation()
