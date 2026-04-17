# 数字生产力单元评测平台 - HR招聘方向 POC

## 项目概述

本项目是一个面向企业级 Agent / Skill / Workflow 评测平台的高完成度 POC（Proof of Concept），围绕"数字生产力单元评测 + 分层推荐"概念，聚焦 HR 招聘方向（Recruiting）。

### 核心理念：先合格，再分专业

不同于泛泛的 Agent Marketplace，本平台采用两层评测架构：
1. **第一层（统一合格考）**：判断生产力单元是否达到进入候选池的最低门槛
2. **第二层（分专业考）**：围绕 HR 招聘方向，判断"擅长什么、专业度有多深"

最终形成企业可理解、可采购、可推荐的 S/A/B/C 四级分层结果。

## 为什么选择 HR 招聘场景

- **流程标准化程度高**：需求理解→JD生成→简历筛选→面试→Offer→入职
- **痛点明确**：简历海洋、标准不统一、跨系统操作、数据孤岛
- **AI工具丰富**：市场上已有大量不同形态的招聘AI工具
- **评价标准可量化**：人岗匹配精准度、流程时效、合规性等
- **企业采购意愿强**：招聘效率直接影响业务发展

## 整体评测框架

### 第一层：统一合格考

| SKU类型 | 评测方法 | 说明 |
|---------|---------|------|
| 完整Agent | Snowflake GPA三阶段 + Amazon Agent二维 | Goal/Plan/Action + 目标/过程双维度 |
| Model | Amazon底层评测 | 领域正确性/术语理解/长上下文/成本/安全 |
| Component/Skill | Amazon中层评测 | 意图检测/记忆/规划/工具路由/工作流 |
| Workflow | Amazon上层评测 | 最终响应/任务完成/目标成功/安全/体验 |

**一票否决机制**：安全性<60分、任务完成率<50分、工具错误率过高 → 直接FAIL

### 第二层：招聘方向六维专业评测

| 维度 | 说明 |
|------|------|
| D1 招聘需求理解与JD拆解 | 将模糊需求转化为结构化JD |
| D2 简历筛选与候选人匹配 | 大规模简历高效精准筛选 |
| D3 结构化面试设计与评估 | 科学面试方案和评分标准 |
| D4 招聘流程效率与响应时效 | 时效约束下的流程推进 |
| D5 公平性、合规性与风险控制 | 偏见检测和法律合规 |
| D6 招聘协同交付与业务支持 | 与业务部门有效协同 |

### 最终分层

| 层级 | 含义 | 建议 |
|------|------|------|
| S层 | 强专业生产力单元 | 可直接采购 |
| A层 | 关键环节强 | 适合方案组合 |
| B层 | 基础可用 | 需配合使用 |
| C层 | 组件辅助 | 不建议独立采购 |

## 20个SKU样本选择说明

样本覆盖5种类型：Agent(8个)、Workflow(3个)、Skill(6个)、Component(2个)、Model(1个)

选择标准：
- 覆盖招聘全流程各环节
- 类型多样化（Agent/Workflow/Skill/Component/Model）
- 包含头部产品和新兴产品
- 包含开源和商业产品
- 运行模式多样（real/simulated/api_stub/documentation_only）

## 项目结构

```
├── main.py                    # FastAPI后端主程序
├── sku_schema.py              # SKU标准化数据模型
├── sku_catalog_generator.py   # SKU样本数据生成
├── evaluation_engine.py       # 第一层合格考评测引擎
├── recruiting_evaluator.py    # 第二层专业评测引擎
├── generate_data.py           # 数据生成脚本
├── requirements.txt           # Python依赖
├── Dockerfile                 # Docker部署文件
├── README.md                  # 项目说明
├── data/                      # 数据文件目录
│   ├── sku_catalog.json
│   ├── general_eval_results.json
│   ├── shortlist.json
│   ├── fail_list.json
│   ├── recruiting_professional_eval_results.json
│   ├── final_tiering.json
│   ├── dimensions_definition.json
│   └── mock_data.json
└── static/                    # 前端文件
    ├── index.html
    ├── style.css
    └── app.js
```

## 运行方式

### 本地运行

```bash
pip install -r requirements.txt
python generate_data.py
uvicorn main:app --host 0.0.0.0 --port 8000
```

访问 http://localhost:8000

### Docker运行

```bash
docker build -t dpu-eval-platform .
docker run -p 8000:8000 dpu-eval-platform
```

## 当前POC的局限性

1. **评测数据为模拟**：评分基于SKU特征的规则推算，非真实运行评测
2. **样本覆盖有限**：20个样本仅覆盖市场主流产品
3. **运行模式受限**：大部分SKU为API Stub模式
4. **专业评测任务简化**：测试任务为设计态，未实际执行
5. **单一垂直场景**：仅验证了HR招聘方向
6. **缺少真实用户反馈**：未纳入Pilot Feedback数据

## 结论与下一步

### 概念验证结论

本POC初步验证了"先合格，再分专业"的评测与选型概念的可行性：
- ✅ 不同形态的SKU可以统一建模和评测
- ✅ 两层评测架构能有效区分"能不能用"和"专不专业"
- ✅ 分层结果对企业采购决策有参考价值
- ✅ 框架可扩展到其他垂直场景

### 下一步扩展

1. 接入真实API进行实际运行评测
2. 设计并执行完整测试用例集
3. 引入企业Pilot Feedback机制
4. 扩展到法务、客服、销售、咨询等场景
5. 建立SKU持续监测和更新机制
6. 开发SKU组合推荐引擎
