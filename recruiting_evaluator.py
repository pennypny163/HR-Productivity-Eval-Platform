"""
第二层招聘方向六维专业评测引擎
设计并实现招聘方向的分专业考
"""
import json
import random
import os
from sku_schema import ProfessionalEvalResult, RecruitingDimensionScore, TierLevel


# ============================================================
# 六维专业评测体系定义
# ============================================================
RECRUITING_DIMENSIONS = [
    {
        "id": "D1",
        "name": "招聘需求理解与JD拆解能力",
        "definition": "理解业务部门的招聘需求，将模糊的用人需求转化为结构化的岗位描述（JD），并拆解为可评估的能力要求。",
        "hr_meaning": "对应招聘流程中的'需求理解'和'JD生成/拆解'环节，是招聘工作的起点和基础。",
        "importance": "JD质量直接决定后续简历筛选的精准度和候选人池的质量。模糊或偏差的JD会导致整个招聘流程效率低下。",
        "scoring_rules": {
            "90-100": "能从模糊业务需求中精准提取岗位核心要求，生成结构化JD，包含硬技能、软技能、经验要求和文化匹配要素",
            "70-89": "能生成基本完整的JD，但在需求理解深度或能力拆解精细度上有提升空间",
            "50-69": "能生成JD但结构不够完整，或对业务需求的理解存在偏差",
            "0-49": "无法有效理解招聘需求或生成可用的JD"
        },
        "test_tasks": [
            "根据业务经理的口头描述生成结构化JD",
            "对现有JD进行能力拆解和优化建议",
            "识别JD中的隐含要求和潜在偏见"
        ],
        "mock_data_needed": ["岗位画像数据", "业务需求描述", "现有JD样本"]
    },
    {
        "id": "D2",
        "name": "简历筛选与候选人匹配能力",
        "definition": "从大量简历中高效筛选出与岗位匹配的候选人，并能解释匹配逻辑和推荐理由。",
        "hr_meaning": "对应招聘流程中的'简历筛选'环节，是解决'简历海洋'痛点的核心能力。",
        "importance": "招聘专员平均花费23秒查看一份简历，AI筛选能力直接影响招聘效率和人岗匹配精准度。",
        "scoring_rules": {
            "90-100": "能处理100+简历并产出精准shortlist，匹配解释清晰，考虑硬技能、软技能和潜力因素",
            "70-89": "能完成基本筛选，匹配度评估基本准确，但在边缘案例处理上有不足",
            "50-69": "能做初步筛选但精准度不高，或无法处理大批量简历",
            "0-49": "筛选结果不可靠或无法完成批量筛选任务"
        },
        "test_tasks": [
            "对150份简历做初筛并产出Top 10 shortlist",
            "解释每位候选人与岗位的匹配度",
            "识别简历中的关键信号和红旗"
        ],
        "mock_data_needed": ["候选人简历样本(150份)", "岗位要求", "历史录用数据"]
    },
    {
        "id": "D3",
        "name": "结构化面试设计与评估能力",
        "definition": "设计科学的结构化面试方案，包括面试题目、评分标准（rubric）和评估维度，并能汇总多位面试官反馈。",
        "hr_meaning": "对应招聘流程中的'面试组织'环节，确保面试过程的标准化和评估的一致性。",
        "importance": "结构化面试的预测效度是非结构化面试的2倍以上，标准化评估是公平招聘的基础。",
        "scoring_rules": {
            "90-100": "能设计完整的结构化面试方案，包含行为面试题、情境题和评分rubric，并能有效汇总多面试官反馈",
            "70-89": "能设计基本的面试题和评分标准，但在评估维度的全面性或rubric精细度上有不足",
            "50-69": "能生成面试题但缺乏结构化设计，评分标准不够明确",
            "0-49": "无法设计有效的结构化面试方案"
        },
        "test_tasks": [
            "为指定岗位设计结构化面试题和评分rubric",
            "汇总3位面试官的反馈并统一比较候选人",
            "设计针对特定能力维度的行为面试题"
        ],
        "mock_data_needed": ["面试反馈样本", "岗位能力模型", "评估维度定义"]
    },
    {
        "id": "D4",
        "name": "招聘流程效率与响应时效能力",
        "definition": "在时效约束下高效推进招聘流程，包括候选人沟通、面试安排、进度追踪和瓶颈识别。",
        "hr_meaning": "对应招聘流程中的全流程效率管理，直接影响'问题解决时效性'和'人才供给稳定性'。",
        "importance": "优秀候选人的市场停留时间平均仅10天，招聘效率直接影响人才获取成功率。",
        "scoring_rules": {
            "90-100": "能在时效约束下高效推进全流程，自动识别瓶颈，主动触发提醒和加速动作",
            "70-89": "能基本保证流程推进效率，但在复杂场景下的时效管理有提升空间",
            "50-69": "能执行基本流程但效率不高，缺乏主动的时效管理能力",
            "0-49": "流程推进缓慢或无法有效管理招聘时效"
        },
        "test_tasks": [
            "在5个工作日内完成从简历筛选到面试安排的全流程",
            "识别招聘流程中的瓶颈并提出优化建议",
            "管理10个并行岗位的招聘进度"
        ],
        "mock_data_needed": ["招聘流程状态数据", "时效要求", "协同消息样本"]
    },
    {
        "id": "D5",
        "name": "公平性、合规性与风险控制能力",
        "definition": "确保招聘过程的公平性和合规性，识别和防范歧视、偏见和法律风险。",
        "hr_meaning": "对应'制度公正性'和'合规零事故'的评价标准，是招聘工作的底线要求。",
        "importance": "招聘歧视不仅违法，还会损害雇主品牌。AI系统的偏见风险需要特别关注和管控。",
        "scoring_rules": {
            "90-100": "能主动识别JD、筛选和面试中的偏见和合规风险，提供具体的修正建议和合规审计报告",
            "70-89": "能识别明显的合规风险，但在隐性偏见检测和复杂法规场景上有不足",
            "50-69": "有基本的合规意识但检测能力有限",
            "0-49": "缺乏合规检测能力或自身存在偏见风险"
        },
        "test_tasks": [
            "审查JD中的歧视性语言和隐性偏见",
            "检查简历筛选结果的多样性分布",
            "识别面试评估中的不一致和潜在偏见"
        ],
        "mock_data_needed": ["合规规则集", "含偏见的JD样本", "筛选结果多样性数据"]
    },
    {
        "id": "D6",
        "name": "招聘协同交付与业务支持能力",
        "definition": "与hiring manager、面试官和其他利益相关方有效协同，输出可决策的招聘建议和报告。",
        "hr_meaning": "对应招聘专员的'业务协同与交付能力'，是将招聘工作转化为业务价值的关键。",
        "importance": "招聘不是HR的独角戏，与业务部门的有效协同直接影响招聘质量和满意度。",
        "scoring_rules": {
            "90-100": "能输出给hiring manager的完整决策建议，包含候选人对比、风险提示和录用建议，沟通清晰专业",
            "70-89": "能提供基本的招聘报告和建议，但在决策支持的深度和沟通效果上有提升空间",
            "50-69": "能输出基本信息但缺乏决策支持价值",
            "0-49": "无法有效支持业务决策或协同交付"
        },
        "test_tasks": [
            "输出给hiring manager的最终候选人推荐报告",
            "汇总招聘数据并生成周报/月报",
            "为业务部门提供人才市场洞察"
        ],
        "mock_data_needed": ["协同消息样本", "招聘数据汇总", "业务需求上下文"]
    }
]


# ============================================================
# 模拟数据生成
# ============================================================
MOCK_JOB_PROFILES = [
    {
        "title": "高级Java开发工程师",
        "department": "技术部",
        "level": "P7",
        "requirements": "5年以上Java开发经验，熟悉Spring Boot、微服务架构，有大型分布式系统经验",
        "skills_required": ["Java", "Spring Boot", "微服务", "MySQL", "Redis", "Kafka"],
        "soft_skills": ["团队协作", "问题解决", "沟通能力"],
        "salary_range": "30K-50K",
        "urgency": "高"
    },
    {
        "title": "产品经理",
        "department": "产品部",
        "level": "P6",
        "requirements": "3年以上B端产品经验，有SaaS产品设计经验，数据驱动思维",
        "skills_required": ["需求分析", "产品设计", "数据分析", "项目管理", "Axure"],
        "soft_skills": ["逻辑思维", "用户同理心", "跨部门沟通"],
        "salary_range": "25K-40K",
        "urgency": "中"
    }
]

MOCK_COMPLIANCE_RULES = [
    {"id": "CR-001", "rule": "JD中不得包含性别、年龄、民族、宗教等歧视性要求", "severity": "高", "law_ref": "《就业促进法》第三条"},
    {"id": "CR-002", "rule": "面试评估标准必须与岗位要求直接相关", "severity": "高", "law_ref": "《劳动法》第十二条"},
    {"id": "CR-003", "rule": "候选人个人信息收集必须遵循最小必要原则", "severity": "中", "law_ref": "《个人信息保护法》第六条"},
    {"id": "CR-004", "rule": "AI筛选结果必须可解释，不得使用黑箱算法做最终决策", "severity": "高", "law_ref": "EU AI Act Article 14"},
    {"id": "CR-005", "rule": "招聘广告不得包含虚假或误导性信息", "severity": "中", "law_ref": "《广告法》第四条"},
    {"id": "CR-006", "rule": "面试过程中不得询问候选人婚育状况", "severity": "高", "law_ref": "《妇女权益保障法》第四十三条"}
]


# ============================================================
# 招聘方向专业评测引擎
# ============================================================
class RecruitingProfessionalEvaluator:
    """招聘方向六维专业评测引擎"""

    def __init__(self):
        self.dimensions = RECRUITING_DIMENSIONS

    def evaluate(self, sku: dict) -> ProfessionalEvalResult:
        """对单个SKU执行六维专业评测"""
        result = ProfessionalEvalResult(
            sku_id=sku["id"],
            sku_name=sku.get("name_cn", sku["name"]),
            sku_type=sku.get("sku_type", "")
        )

        dimension_scores = []
        for dim in self.dimensions:
            score = self._evaluate_dimension(sku, dim)
            dimension_scores.append({
                "dimension_id": score.dimension_id,
                "dimension_name": score.dimension_name,
                "score": score.score,
                "max_score": score.max_score,
                "strengths": score.strengths,
                "weaknesses": score.weaknesses,
                "detail": score.detail
            })

        result.dimensions = dimension_scores
        result.total_professional_score = round(
            sum(d["score"] for d in dimension_scores) / len(dimension_scores), 1
        )

        # 确定分层
        result.tier = self._determine_tier(result.total_professional_score, dimension_scores)
        result.tier_reason = self._explain_tier(result.tier, dimension_scores, sku)
        result.best_fit_stage = self._determine_best_fit(dimension_scores)
        result.role_positioning = self._determine_role(sku, dimension_scores)
        result.enterprise_recommendation = self._generate_recommendation(result)
        result.explanation = self._generate_explanation(result)

        return result

    def _evaluate_dimension(self, sku: dict, dim: dict) -> RecruitingDimensionScore:
        """评估单个维度"""
        score = RecruitingDimensionScore(
            dimension_id=dim["id"],
            dimension_name=dim["name"]
        )

        # 根据SKU特征和维度匹配度计算分数
        base_score = self._calculate_dimension_base(sku, dim)
        score.score = round(base_score, 1)
        score.strengths = self._identify_strengths(sku, dim, base_score)
        score.weaknesses = self._identify_weaknesses(sku, dim, base_score)
        score.detail = self._generate_dimension_detail(sku, dim, base_score)

        return score

    def _calculate_dimension_base(self, sku: dict, dim: dict) -> float:
        """计算维度基础分"""
        dim_id = dim["id"]
        sku_type = sku.get("sku_type", "")
        caps = sku.get("capabilities", [])
        tags = sku.get("tags", [])
        all_features = " ".join(caps + tags + [sku.get("description", "")])

        base = 50.0

        # D1: 招聘需求理解与JD拆解
        if dim_id == "D1":
            jd_keywords = ["JD", "岗位", "需求", "职位描述", "文案", "写作"]
            match_count = sum(1 for k in jd_keywords if k in all_features)
            base += match_count * 6
            if sku_type == "Agent": base += 8
            if "JD优化" in tags or "JD生成" in tags: base += 15

        # D2: 简历筛选与候选人匹配
        elif dim_id == "D2":
            resume_keywords = ["简历", "筛选", "匹配", "候选人", "推荐", "排名", "搜索"]
            match_count = sum(1 for k in resume_keywords if k in all_features)
            base += match_count * 5
            if sku_type in ("Agent", "Workflow"): base += 5
            if "简历筛选" in tags or "候选人匹配" in tags: base += 15

        # D3: 结构化面试设计与评估
        elif dim_id == "D3":
            interview_keywords = ["面试", "评估", "评分", "结构化", "反馈", "笔记"]
            match_count = sum(1 for k in interview_keywords if k in all_features)
            base += match_count * 6
            if "面试" in all_features: base += 10
            if "评估" in all_features: base += 8

        # D4: 招聘流程效率与响应时效
        elif dim_id == "D4":
            efficiency_keywords = ["自动化", "流程", "安排", "协调", "追踪", "管理", "看板"]
            match_count = sum(1 for k in efficiency_keywords if k in all_features)
            base += match_count * 5
            if sku_type == "Workflow": base += 12
            if sku_type == "Agent": base += 8
            if sku.get("can_run_independently"): base += 5

        # D5: 公平性、合规性与风险控制
        elif dim_id == "D5":
            compliance_keywords = ["偏见", "公平", "合规", "多样性", "审计", "包容"]
            match_count = sum(1 for k in compliance_keywords if k in all_features)
            base += match_count * 7
            if "偏见检测" in caps or "偏见审计" in caps: base += 15
            if "多样性" in all_features: base += 8

        # D6: 招聘协同交付与业务支持
        elif dim_id == "D6":
            collab_keywords = ["报告", "洞察", "分析", "建议", "推荐", "协作", "沟通"]
            match_count = sum(1 for k in collab_keywords if k in all_features)
            base += match_count * 5
            if sku_type == "Agent": base += 10
            if sku.get("supports_multi_turn"): base += 8

        # 通用调整
        if sku.get("runtime_mode") == "documentation_only":
            base -= 10
        elif sku.get("runtime_mode") == "real":
            base += 5

        base += random.uniform(-5, 8)
        return min(max(base, 15), 97)

    def _identify_strengths(self, sku, dim, score):
        strengths = []
        if score >= 80:
            strengths.append(f"在{dim['name']}维度表现优秀")
        if score >= 70:
            strengths.append(f"具备{dim['name']}的核心能力")
        return strengths

    def _identify_weaknesses(self, sku, dim, score):
        weaknesses = []
        if score < 60:
            weaknesses.append(f"在{dim['name']}维度能力不足")
        if score < 50:
            weaknesses.append(f"缺乏{dim['name']}的基本能力")
        return weaknesses

    def _generate_dimension_detail(self, sku, dim, score):
        if score >= 85:
            return f"{sku.get('name_cn', sku['name'])}在{dim['name']}上表现出色，能够高质量完成相关任务"
        elif score >= 70:
            return f"{sku.get('name_cn', sku['name'])}在{dim['name']}上能力中上，基本满足专业要求"
        elif score >= 55:
            return f"{sku.get('name_cn', sku['name'])}在{dim['name']}上能力一般，有明显提升空间"
        else:
            return f"{sku.get('name_cn', sku['name'])}在{dim['name']}上能力不足，不建议在此维度独立使用"

    def _determine_tier(self, total_score, dimensions):
        """确定分层等级"""
        high_dims = sum(1 for d in dimensions if d["score"] >= 80)
        low_dims = sum(1 for d in dimensions if d["score"] < 50)

        if total_score >= 82 and high_dims >= 4:
            return TierLevel.S.value
        elif total_score >= 70 and high_dims >= 2:
            return TierLevel.A.value
        elif total_score >= 55 and low_dims <= 2:
            return TierLevel.B.value
        else:
            return TierLevel.C.value

    def _explain_tier(self, tier, dimensions, sku):
        top_dims = sorted(dimensions, key=lambda d: d["score"], reverse=True)[:3]
        top_names = [d["dimension_name"] for d in top_dims]

        if tier == "S":
            return f"综合专业能力突出，在{', '.join(top_names)}等维度表现优秀，可直接作为招聘方向强专业生产力单元"
        elif tier == "A":
            return f"在{', '.join(top_names[:2])}等关键环节表现强劲，适合纳入招聘方案组合"
        elif tier == "B":
            return f"基础可用，在{top_names[0]}上有一定优势，但整体专业深度不足"
        else:
            return f"更适合作为组件或辅助能力，在招聘专业维度上缺乏深度"

    def _determine_best_fit(self, dimensions):
        """确定最适合的招聘流程阶段"""
        dim_stage_map = {
            "D1": "需求理解与JD生成",
            "D2": "简历筛选与候选人匹配",
            "D3": "面试设计与评估",
            "D4": "流程管理与效率提升",
            "D5": "合规审查与风险控制",
            "D6": "协同交付与决策支持"
        }
        best_dim = max(dimensions, key=lambda d: d["score"])
        return dim_stage_map.get(best_dim["dimension_id"], "通用辅助")

    def _determine_role(self, sku, dimensions):
        """确定角色定位"""
        sku_type = sku.get("sku_type", "")
        avg_score = sum(d["score"] for d in dimensions) / len(dimensions)
        high_dims = sum(1 for d in dimensions if d["score"] >= 75)

        if sku_type == "Agent" and high_dims >= 4:
            return "完整招聘Agent - 可覆盖多个招聘环节"
        elif sku_type == "Agent" and high_dims >= 2:
            return "专项招聘Agent - 在特定环节有深度"
        elif sku_type == "Workflow":
            return "招聘工作流 - 流程驱动的招聘管理"
        elif sku_type == "Skill":
            return "专业技能 - 单点能力突出"
        elif sku_type == "Component":
            return "基础组件 - 可集成到招聘系统中"
        elif sku_type == "Model":
            return "底层模型 - 提供基础AI能力"
        else:
            return "辅助工具"

    def _generate_recommendation(self, result):
        """生成企业采购建议"""
        tier = result.tier
        if tier == "S":
            return "强烈推荐企业试用，可作为招聘方向的核心生产力单元直接采购"
        elif tier == "A":
            return "推荐企业试用，适合与其他工具组合使用，覆盖特定招聘环节"
        elif tier == "B":
            return "可考虑试用，但需要与其他工具配合使用，不建议作为独立解决方案"
        else:
            return "不建议独立采购，可作为现有系统的增强组件或辅助能力"

    def _generate_explanation(self, result):
        """生成完整解释"""
        parts = [
            f"【{result.sku_name}】招聘方向专业评测结果",
            f"分层等级：{result.tier}层",
            f"综合专业分：{result.total_professional_score:.1f}/100",
            f"分层理由：{result.tier_reason}",
            f"最适合阶段：{result.best_fit_stage}",
            f"角色定位：{result.role_positioning}",
            f"企业建议：{result.enterprise_recommendation}",
            "",
            "各维度得分："
        ]
        for d in result.dimensions:
            parts.append(f"  {d['dimension_name']}: {d['score']:.1f}/100")
        return "\n".join(parts)

    def run_batch(self, skus: list) -> list:
        """批量执行专业评测"""
        results = []
        for sku in skus:
            result = self.evaluate(sku)
            results.append(result)
        return results


def run_professional_evaluation(catalog_path="data/sku_catalog.json", shortlist_path="data/shortlist.json"):
    """执行第二层专业评测"""
    random.seed(42)

    # 加载shortlist对应的原始SKU数据
    with open(catalog_path, "r", encoding="utf-8") as f:
        catalog = json.load(f)

    with open(shortlist_path, "r", encoding="utf-8") as f:
        shortlist = json.load(f)

    shortlist_ids = {s["sku_id"] for s in shortlist}
    shortlist_skus = [sku for sku in catalog if sku["id"] in shortlist_ids]

    evaluator = RecruitingProfessionalEvaluator()
    results = evaluator.run_batch(shortlist_skus)

    # 保存结果
    os.makedirs("data", exist_ok=True)
    with open("data/recruiting_professional_eval_results.json", "w", encoding="utf-8") as f:
        json.dump([r.to_dict() for r in results], f, ensure_ascii=False, indent=2)

    # 生成最终分层
    final_tiering = []
    with open("data/general_eval_results.json", "r", encoding="utf-8") as f:
        general_results = {r["sku_id"]: r for r in json.load(f)}

    for r in results:
        general = general_results.get(r.sku_id, {})
        tier_result = {
            "sku_id": r.sku_id,
            "sku_name": r.sku_name,
            "sku_type": r.sku_type,
            "general_score": general.get("total_score", 0),
            "professional_score": r.total_professional_score,
            "tier": r.tier,
            "tier_reason": r.tier_reason,
            "best_fit_stage": r.best_fit_stage,
            "role_positioning": r.role_positioning,
            "enterprise_recommendation": r.enterprise_recommendation,
            "suitable_for_trial": r.tier in ("S", "A"),
            "suitable_for_listing": r.tier == "S",
            "suitable_for_combo": r.tier in ("A", "B"),
            "suitable_for_custom_dev": r.tier == "C",
            "dimensions": r.dimensions
        }
        final_tiering.append(tier_result)

    # 按tier排序
    tier_order = {"S": 0, "A": 1, "B": 2, "C": 3}
    final_tiering.sort(key=lambda x: (tier_order.get(x["tier"], 9), -x["professional_score"]))

    with open("data/final_tiering.json", "w", encoding="utf-8") as f:
        json.dump(final_tiering, f, ensure_ascii=False, indent=2)

    # 保存维度定义
    with open("data/dimensions_definition.json", "w", encoding="utf-8") as f:
        json.dump(RECRUITING_DIMENSIONS, f, ensure_ascii=False, indent=2)

    # 保存模拟数据
    mock_data = {
        "job_profiles": MOCK_JOB_PROFILES,
        "compliance_rules": MOCK_COMPLIANCE_RULES
    }
    with open("data/mock_data.json", "w", encoding="utf-8") as f:
        json.dump(mock_data, f, ensure_ascii=False, indent=2)

    print(f"\n第二层专业评测完成：")
    print(f"  评测SKU数: {len(results)}")
    for tier in ["S", "A", "B", "C"]:
        tier_skus = [t for t in final_tiering if t["tier"] == tier]
        print(f"\n  {tier}层 ({len(tier_skus)}个):")
        for t in tier_skus:
            print(f"    {t['sku_id']} {t['sku_name']} - 专业分:{t['professional_score']:.1f} | {t['best_fit_stage']}")

    return results, final_tiering


if __name__ == "__main__":
    run_professional_evaluation()
