"""
数字生产力单元评测平台 - FastAPI 后端
HR招聘方向 POC
"""
import os
import json
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="数字生产力单元评测平台",
    description="HR招聘方向 - 先合格，再分专业",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 数据目录
DATA_DIR = "data"


def load_json(filename):
    """加载JSON数据文件"""
    filepath = os.path.join(DATA_DIR, filename)
    if not os.path.exists(filepath):
        return []
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)


def ensure_data():
    """确保数据文件存在，如不存在则生成"""
    if not os.path.exists(os.path.join(DATA_DIR, "sku_catalog.json")):
        print("数据文件不存在，正在生成...")
        from generate_data import main as generate
        generate()


@app.on_event("startup")
async def startup_event():
    """启动时确保数据就绪"""
    ensure_data()


@app.get("/")
async def root():
    """根路径重定向到静态页面"""
    return RedirectResponse(url="/static/index.html")


# ============================================================
# API 接口
# ============================================================

@app.get("/api/overview")
async def get_overview():
    """获取平台概览数据"""
    catalog = load_json("sku_catalog.json")
    general_results = load_json("general_eval_results.json")
    shortlist = load_json("shortlist.json")
    final_tiering = load_json("final_tiering.json")

    # 统计
    type_dist = {}
    for sku in catalog:
        t = sku.get("sku_type", "Unknown")
        type_dist[t] = type_dist.get(t, 0) + 1

    tier_dist = {}
    for t in final_tiering:
        tier = t.get("tier", "Unknown")
        tier_dist[tier] = tier_dist.get(tier, 0) + 1

    pass_count = sum(1 for r in general_results if r.get("status") == "pass")
    fail_count = sum(1 for r in general_results if r.get("status") == "fail")

    return {
        "total_skus": len(catalog),
        "pass_count": pass_count,
        "fail_count": fail_count,
        "shortlist_count": len(shortlist),
        "type_distribution": type_dist,
        "tier_distribution": tier_dist,
        "avg_general_score": round(sum(r.get("total_score", 0) for r in general_results) / max(len(general_results), 1), 1),
        "avg_professional_score": round(sum(t.get("professional_score", 0) for t in final_tiering) / max(len(final_tiering), 1), 1)
    }


@app.get("/api/skus")
async def get_skus():
    """获取SKU列表"""
    return load_json("sku_catalog.json")


@app.get("/api/skus/{sku_id}")
async def get_sku_detail(sku_id: str):
    """获取SKU详情"""
    catalog = load_json("sku_catalog.json")
    general_results = load_json("general_eval_results.json")
    professional_results = load_json("recruiting_professional_eval_results.json")
    final_tiering = load_json("final_tiering.json")

    sku = next((s for s in catalog if s["id"] == sku_id), None)
    if not sku:
        raise HTTPException(status_code=404, detail="SKU not found")

    general = next((r for r in general_results if r["sku_id"] == sku_id), None)
    professional = next((r for r in professional_results if r["sku_id"] == sku_id), None)
    tiering = next((t for t in final_tiering if t["sku_id"] == sku_id), None)

    return {
        "sku": sku,
        "general_eval": general,
        "professional_eval": professional,
        "final_tiering": tiering
    }


@app.get("/api/general-eval")
async def get_general_eval():
    """获取第一层合格考结果"""
    return load_json("general_eval_results.json")


@app.get("/api/shortlist")
async def get_shortlist():
    """获取Shortlist"""
    return load_json("shortlist.json")


@app.get("/api/fail-list")
async def get_fail_list():
    """获取未通过列表"""
    return load_json("fail_list.json")


@app.get("/api/professional-eval")
async def get_professional_eval():
    """获取第二层专业评测结果"""
    return load_json("recruiting_professional_eval_results.json")


@app.get("/api/final-tiering")
async def get_final_tiering():
    """获取最终分层结果"""
    return load_json("final_tiering.json")


@app.get("/api/dimensions")
async def get_dimensions():
    """获取六维评测体系定义"""
    return load_json("dimensions_definition.json")


@app.get("/api/mock-data")
async def get_mock_data():
    """获取模拟数据"""
    return load_json("mock_data.json")


# 静态文件挂载 - 必须放在最后
os.makedirs("static", exist_ok=True)
app.mount("/static", StaticFiles(directory="static", html=True), name="static")
