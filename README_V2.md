# 数字生产力单元评测与选型平台 V2

> 企业招聘方向 · 评测与选型工作台 Demo

## 一、V2 方法论变化

### 为什么 V1 的"大一统排行榜"逻辑有问题？

V1 将所有 SKU（不同层级、不同赛道、不同职责）放进同一个池子里，用同一套标准打分和排名。这导致：

1. **评测关系失真**：一个寻源工具和一个面试评估平台被放在一起比较，但它们解决的是完全不同的问题
2. **维度不适配**：所有 SKU 共用同一套六维评测，但"触达自动化"对面试工具毫无意义
3. **Tags 自证高分**：V1 中分数主要来自 tags 关键词匹配，产品自己写的标签越多分越高
4. **层级混乱**：Platform、Agent、Workflow、Component 被混在一起排名，但它们的采购逻辑完全不同

### 为什么 V2 改成"同赛道 × 同层级比较"？

V2 的核心设计原则：

1. **先分类再评测**：每个 SKU 必须先明确它属于哪个赛道、什么层级，然后在同赛道内比较
2. **赛道专属维度**：每个赛道有自己的评测维度和权重，不再共用一套标准
3. **跨赛道不排名**：不同赛道的产品不做总排名，改做组合推荐
4. **证据分层**：每个评分必须来自 catalog evidence + structured inference + mock task evidence

### 第一层资格合格考 vs 第二层场景专项考

| 维度 | 第一层：资格合格考 | 第二层：场景专项考 |
|------|-------------------|-------------------|
| 核心问题 | 是否有资格进入企业 shortlist？ | 在所属赛道里是否专业、适不适合买？ |
| 评测方式 | Hard Gates（规则淘汰）+ 基础评分 | 赛道专属维度评分 |
| 输出 | pass / conditional_pass / fail | core / strong / supplementary / not_recommended |
| 目的 | 筛掉不合格的 | 在合格的里面比较谁更强 |

### 为什么跨赛道应该做组合推荐而不是总排名？

- 企业采购招聘工具不是买"一个最强的"，而是买"一套能覆盖需求的组合"
- 寻源工具、面试工具、全流程平台各有专长，互补组合才能发挥最大价值
- 总排名会误导企业"买第一名就够了"，但第一名可能只解决一个环节的问题

### 当前仍然是 Demo

- 所有评测结果基于 **Mock 数据和规则推断**，不是真实 API 调用
- 12 个 SKU 的信息基于公开资料编造，用于演示逻辑可行性
- 测试任务结果为模拟执行，但结构上保留了"输入 → 任务 → 输出 → 评分"的完整链路
- 代码结构上保留了未来接入真实 evaluator 的扩展点

## 二、评测体系

### 3 个赛道

| 赛道 | 定义 | SKU 数量 |
|------|------|---------|
| 候选人寻源与触达 | 帮助招聘团队发现候选人、做初步匹配并发起触达 | 4 |
| 面试评估与辅助 | 帮助企业提升结构化评估质量与效率 | 4 |
| 全流程招聘 Agent/Platform | 围绕招聘流程多个环节提供连续能力 | 4 |

### 12 个样例 SKU

| 赛道 | SKU | 层级 |
|------|-----|------|
| 寻源与触达 | Fetcher AI | Platform |
| 寻源与触达 | SeekOut | Platform |
| 寻源与触达 | Findem | Agent |
| 寻源与触达 | hireEZ | Workflow |
| 面试评估 | HireVue | Platform |
| 面试评估 | Pymetrics | Platform |
| 面试评估 | Metaview | Agent |
| 面试评估 | Humanly | Workflow |
| 全流程招聘 | Paradox Olivia | Agent |
| 全流程招聘 | Tezi | Agent |
| 全流程招聘 | Manatal | Platform |
| 全流程招聘 | Eightfold AI | Platform |

### Shortlist 标签

| 标签 | 含义 | 判定规则 |
|------|------|---------|
| A | 优先 Shortlist | 资格通过 + 专项分 ≥ 80 |
| B | 可纳入 Shortlist | 资格通过 + 专项分 ≥ 68 |
| C | 补充模块观察 | 条件通过或专项分较低 |
| D | 不建议纳入 | 关键资格不通过 |

## 三、技术架构

```
├── data/v2/                    # V2 数据文件
│   ├── sku_profiles.json       # 12 个 SKU 完整 Profile
│   ├── evaluation_results.json # 评测结果
│   ├── scenario_tasks.json     # 测试任务定义和 Mock 结果
│   ├── mock_assets.json        # Mock 数据素材
│   └── bundle_recommendations.json # 组合推荐和场景推荐
├── evaluation/                 # 评测引擎模块
│   └── __init__.py            # 赛道定义、评分逻辑、验证函数
├── static/v2/                  # V2 前端
│   ├── index.html             # 页面结构
│   ├── style.css              # 样式
│   └── app.js                 # 前端应用逻辑
├── main_v2.py                  # V2 FastAPI 后端
└── README_V2.md               # 本文件
```

## 四、运行方式

```bash
# 安装依赖
pip install fastapi uvicorn

# 启动 V2
uvicorn main_v2:app --reload --port 8000

# 访问
open http://localhost:8000
```

## 五、页面结构

| 页面 | 功能 |
|------|------|
| 总览 Overview | 平台说明、赛道分布、资格结果总览、组合预览 |
| 赛道 Tracks | 按赛道进入，查看赛道定义和评测维度 |
| 赛道详情 | 赛道内 SKU 列表、散点图、筛选 |
| SKU 详情 | 完整评测结果、Hard Gate、维度评分、测试证据、采购建议 |
| 对比 Compare | 2-4 个 SKU 横向对比表 + 雷达图 |
| 场景推荐 Scenarios | 从企业问题出发推荐产品和组合 |
| 组合方案 Bundles | 跨赛道组合推荐方案 |

## 六、API 接口

| 接口 | 说明 |
|------|------|
| GET /api/v2/overview | 平台概览统计 |
| GET /api/v2/tracks | 赛道列表 |
| GET /api/v2/tracks/{track_key} | 赛道详情 |
| GET /api/v2/skus | SKU 列表（支持筛选） |
| GET /api/v2/skus/{sku_id} | SKU 详情 |
| GET /api/v2/compare?ids=id1,id2 | SKU 对比 |
| GET /api/v2/scenarios | 场景推荐 |
| GET /api/v2/bundles | 组合方案 |
| GET /api/v2/tasks | 测试任务 |
| GET /api/v2/methodology | 评测方法论 |
