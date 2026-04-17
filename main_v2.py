"""
Digital Productivity Unit Assessment & Selection Platform - V2 API
HR Recruiting Direction - Track-based Evaluation & Recommendation Workbench
"""
import os
import json
from fastapi import FastAPI, HTTPException, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List
from evaluation import (
    TRACK_DIMENSIONS, HARD_GATES, BASE_SCORE_WEIGHTS,
    compute_qualification_total, determine_shortlist_label,
    compute_scenario_total, get_track_info, get_all_tracks,
    get_hard_gates, validate_evaluation_result
)

app = FastAPI(
    title="数字生产力单元评测与选型平台 V2",
    description="HR招聘方向 - 同赛道比较 × 组合推荐工作台",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = os.path.join("data", "v2")


def load_json(filename):
    """Load JSON data file"""
    filepath = os.path.join(DATA_DIR, filename)
    if not os.path.exists(filepath):
        return [] if filename.endswith("s.json") else {}
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)


def get_sku_profiles():
    return load_json("sku_profiles.json")


def get_evaluation_results():
    return load_json("evaluation_results.json")


def get_scenario_tasks():
    return load_json("scenario_tasks.json")


def get_mock_assets():
    return load_json("mock_assets.json")


def get_bundle_recommendations():
    return load_json("bundle_recommendations.json")


# ============================================================
# V2 API Endpoints
# ============================================================

@app.get("/")
async def root():
    return RedirectResponse(url="/static/v2/index.html")


@app.get("/api/v2/overview")
async def get_overview():
    """Platform overview with track-based statistics"""
    profiles = get_sku_profiles()
    results = get_evaluation_results()
    bundles_data = get_bundle_recommendations()

    # Track distribution
    track_dist = {}
    level_dist = {}
    for sku in profiles:
        track = sku.get("primary_track", "unknown")
        level = sku.get("unit_level", "unknown")
        track_dist[track] = track_dist.get(track, 0) + 1
        level_dist[level] = level_dist.get(level, 0) + 1

    # Qualification statistics
    qual_stats = {"pass": 0, "conditional_pass": 0, "fail": 0}
    label_stats = {"A": 0, "B": 0, "C": 0, "D": 0}
    track_scores = {}

    for r in results:
        q_status = r.get("qualification", {}).get("status", "unknown")
        if q_status in qual_stats:
            qual_stats[q_status] += 1

        label = r.get("recommendation", {}).get("shortlist_label", "D")
        if label in label_stats:
            label_stats[label] += 1

        track = r.get("scenario_assessment", {}).get("track", "unknown")
        score = r.get("scenario_assessment", {}).get("total_score", 0)
        if track not in track_scores:
            track_scores[track] = []
        track_scores[track].append(score)

    # Average scores per track
    track_avg = {}
    for track, scores in track_scores.items():
        track_avg[track] = round(sum(scores) / len(scores), 1) if scores else 0

    # Key risk distribution
    risk_counts = {}
    for r in results:
        for risk in r.get("qualification", {}).get("key_risks", []):
            risk_counts[risk] = risk_counts.get(risk, 0) + 1

    top_risks = sorted(risk_counts.items(), key=lambda x: x[1], reverse=True)[:5]

    return {
        "total_skus": len(profiles),
        "total_tracks": 3,
        "track_distribution": track_dist,
        "level_distribution": level_dist,
        "qualification_stats": qual_stats,
        "label_stats": label_stats,
        "track_avg_scores": track_avg,
        "top_risks": [{"risk": r[0], "count": r[1]} for r in top_risks],
        "bundle_count": len(bundles_data.get("bundles", [])),
        "scenario_count": len(bundles_data.get("scenarios", [])),
        "track_definitions": {
            k: {"name": v["track_name"], "dimension_count": len(v["dimensions"])}
            for k, v in TRACK_DIMENSIONS.items()
        }
    }


@app.get("/api/v2/tracks")
async def get_tracks():
    """Get all track definitions with SKU counts"""
    profiles = get_sku_profiles()
    results = get_evaluation_results()

    tracks = []
    for track_key, track_info in TRACK_DIMENSIONS.items():
        track_skus = [p for p in profiles if p.get("primary_track") == track_key]
        track_results = [r for r in results
                         if r.get("scenario_assessment", {}).get("track") == track_key]

        label_dist = {"A": 0, "B": 0, "C": 0, "D": 0}
        for r in track_results:
            label = r.get("recommendation", {}).get("shortlist_label", "D")
            if label in label_dist:
                label_dist[label] += 1

        tracks.append({
            "track_key": track_key,
            "track_name": track_info["track_name"],
            "dimensions": track_info["dimensions"],
            "sku_count": len(track_skus),
            "label_distribution": label_dist,
            "skus": [{"id": s["id"], "name": s["product_name"], "level": s["unit_level"]}
                     for s in track_skus]
        })

    return tracks


@app.get("/api/v2/tracks/{track_key}")
async def get_track_detail(track_key: str):
    """Get detailed track information with all SKUs and their results"""
    if track_key not in TRACK_DIMENSIONS:
        raise HTTPException(status_code=404, detail="Track not found")

    track_info = TRACK_DIMENSIONS[track_key]
    profiles = get_sku_profiles()
    results = get_evaluation_results()

    track_skus = [p for p in profiles if p.get("primary_track") == track_key]
    result_map = {r["sku_id"]: r for r in results}

    sku_details = []
    for sku in track_skus:
        result = result_map.get(sku["id"], {})
        sku_details.append({
            "profile": sku,
            "evaluation": result
        })

    # Sort by scenario total score descending
    sku_details.sort(
        key=lambda x: x.get("evaluation", {}).get("scenario_assessment", {}).get("total_score", 0),
        reverse=True
    )

    return {
        "track_key": track_key,
        "track_name": track_info["track_name"],
        "dimensions": track_info["dimensions"],
        "hard_gates": HARD_GATES,
        "sku_count": len(track_skus),
        "skus": sku_details
    }


@app.get("/api/v2/skus")
async def get_skus(
    track: Optional[str] = None,
    level: Optional[str] = None,
    label: Optional[str] = None,
    deployment: Optional[str] = None
):
    """Get SKU list with optional filters"""
    profiles = get_sku_profiles()
    results = get_evaluation_results()
    result_map = {r["sku_id"]: r for r in results}

    filtered = profiles
    if track:
        filtered = [p for p in filtered if p.get("primary_track") == track]
    if level:
        filtered = [p for p in filtered if p.get("unit_level") == level]
    if deployment:
        filtered = [p for p in filtered if p.get("deployment_mode") == deployment]

    sku_list = []
    for sku in filtered:
        result = result_map.get(sku["id"], {})
        sku_label = result.get("recommendation", {}).get("shortlist_label", "D")
        if label and sku_label != label:
            continue
        sku_list.append({
            "profile": sku,
            "evaluation": result
        })

    return sku_list


@app.get("/api/v2/skus/{sku_id}")
async def get_sku_detail(sku_id: str):
    """Get detailed SKU information including profile, evaluation, and task evidence"""
    profiles = get_sku_profiles()
    results = get_evaluation_results()
    tasks_data = get_scenario_tasks()

    sku = next((p for p in profiles if p["id"] == sku_id), None)
    if not sku:
        raise HTTPException(status_code=404, detail="SKU not found")

    result = next((r for r in results if r["sku_id"] == sku_id), None)

    # Get task evidence for this SKU
    track = sku.get("primary_track", "")
    task_evidence = []
    if track in tasks_data.get("tracks", {}):
        track_tasks = tasks_data["tracks"][track].get("tasks", [])
        for task in track_tasks:
            mock_result = task.get("mock_results", {}).get(sku_id, {})
            if mock_result:
                task_evidence.append({
                    "task_id": task["task_id"],
                    "task_name": task["task_name"],
                    "description": task["description"],
                    "scoring_criteria": task["scoring_criteria"],
                    "result": mock_result
                })

    return {
        "profile": sku,
        "evaluation": result,
        "task_evidence": task_evidence,
        "track_info": TRACK_DIMENSIONS.get(track, {})
    }


@app.get("/api/v2/compare")
async def compare_skus(ids: str = Query(..., description="Comma-separated SKU IDs")):
    """Compare 2-4 SKUs side by side"""
    sku_ids = [id.strip() for id in ids.split(",")]
    if len(sku_ids) < 2 or len(sku_ids) > 4:
        raise HTTPException(status_code=400, detail="Please select 2-4 SKUs to compare")

    profiles = get_sku_profiles()
    results = get_evaluation_results()
    result_map = {r["sku_id"]: r for r in results}

    comparison = []
    for sku_id in sku_ids:
        sku = next((p for p in profiles if p["id"] == sku_id), None)
        if not sku:
            raise HTTPException(status_code=404, detail=f"SKU {sku_id} not found")
        result = result_map.get(sku_id, {})
        comparison.append({
            "profile": sku,
            "evaluation": result
        })

    return comparison


@app.get("/api/v2/scenarios")
async def get_scenarios():
    """Get scenario-based recommendations"""
    bundles_data = get_bundle_recommendations()
    return bundles_data.get("scenarios", [])


@app.get("/api/v2/bundles")
async def get_bundles():
    """Get bundle recommendations"""
    bundles_data = get_bundle_recommendations()
    return bundles_data.get("bundles", [])


@app.get("/api/v2/tasks")
async def get_tasks(track: Optional[str] = None):
    """Get scenario test tasks"""
    tasks_data = get_scenario_tasks()
    if track:
        track_data = tasks_data.get("tracks", {}).get(track, {})
        return track_data
    return tasks_data


@app.get("/api/v2/mock-assets")
async def get_mock_assets_api():
    """Get mock data assets"""
    return get_mock_assets()


@app.get("/api/v2/methodology")
async def get_methodology():
    """Get evaluation methodology explanation"""
    return {
        "version": "2.0",
        "approach": "同赛道比较 × 组合推荐",
        "tracks": TRACK_DIMENSIONS,
        "hard_gates": HARD_GATES,
        "base_score_weights": BASE_SCORE_WEIGHTS,
        "shortlist_rules": {
            "A": "优先 shortlist - 资格通过且专项分≥80",
            "B": "可纳入 shortlist - 资格通过且专项分≥68",
            "C": "作为补充模块观察 - 条件通过或专项分较低",
            "D": "当前不建议纳入 - 关键资格不通过"
        },
        "purchase_roles": {
            "core_module": "核心模块 - 建议优先采购",
            "important_module": "重要模块 - 建议纳入采购计划",
            "supplementary_module": "补充模块 - 可作为能力补充",
            "observe_only": "观察期 - 暂不建议采购"
        },
        "evidence_layers": {
            "catalog_evidence": "基于产品官网描述、公开特征、功能标签和集成说明",
            "structured_inference": "基于产品类型、支持环节、运行模式和部署方式的规则推断",
            "mock_task_evidence": "基于预设测试任务的模拟执行结果"
        }
    }


# Static files - must be last
os.makedirs("static/v2", exist_ok=True)
app.mount("/static", StaticFiles(directory="static", html=True), name="static")
