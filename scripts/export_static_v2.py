#!/usr/bin/env python3
"""Build a static API snapshot for the V2 GitHub Pages demo."""

import json
import sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from evaluation import BASE_SCORE_WEIGHTS, HARD_GATES, TRACK_DIMENSIONS

DATA = ROOT / "data/v2"
OUTPUT = ROOT / "static/v2/data.json"


def load(name):
    return json.loads((DATA / name).read_text(encoding="utf-8"))


def main():
    profiles = load("sku_profiles.json")
    results = load("evaluation_results.json")
    tasks = load("scenario_tasks.json")
    bundles_data = load("bundle_recommendations.json")
    mock_assets = load("mock_assets.json")
    result_map = {item["sku_id"]: item for item in results}

    track_dist = Counter(item.get("primary_track", "unknown") for item in profiles)
    level_dist = Counter(item.get("unit_level", "unknown") for item in profiles)
    qualification_stats = Counter(item.get("qualification", {}).get("status", "unknown") for item in results)
    label_stats = Counter(item.get("recommendation", {}).get("shortlist_label", "D") for item in results)
    scores = defaultdict(list)
    risks = Counter()
    for item in results:
        assessment = item.get("scenario_assessment", {})
        scores[assessment.get("track", "unknown")].append(assessment.get("total_score", 0))
        risks.update(item.get("qualification", {}).get("key_risks", []))

    overview = {
        "total_skus": len(profiles), "total_tracks": len(TRACK_DIMENSIONS),
        "track_distribution": dict(track_dist), "level_distribution": dict(level_dist),
        "qualification_stats": {key: qualification_stats.get(key, 0) for key in ("pass", "conditional_pass", "fail")},
        "label_stats": {key: label_stats.get(key, 0) for key in ("A", "B", "C", "D")},
        "track_avg_scores": {key: round(sum(values) / len(values), 1) for key, values in scores.items() if values},
        "top_risks": [{"risk": risk, "count": count} for risk, count in risks.most_common(5)],
        "bundle_count": len(bundles_data.get("bundles", [])), "scenario_count": len(bundles_data.get("scenarios", [])),
        "track_definitions": {key: {"name": value["track_name"], "dimension_count": len(value["dimensions"])} for key, value in TRACK_DIMENSIONS.items()},
    }

    tracks, track_details = [], {}
    for track_key, track_info in TRACK_DIMENSIONS.items():
        track_profiles = [item for item in profiles if item.get("primary_track") == track_key]
        track_results = [item for item in results if item.get("scenario_assessment", {}).get("track") == track_key]
        distribution = Counter(item.get("recommendation", {}).get("shortlist_label", "D") for item in track_results)
        tracks.append({
            "track_key": track_key, "track_name": track_info["track_name"], "dimensions": track_info["dimensions"],
            "sku_count": len(track_profiles), "label_distribution": {key: distribution.get(key, 0) for key in ("A", "B", "C", "D")},
            "skus": [{"id": item["id"], "name": item["product_name"], "level": item["unit_level"]} for item in track_profiles],
        })
        details = [{"profile": item, "evaluation": result_map.get(item["id"], {})} for item in track_profiles]
        details.sort(key=lambda item: item["evaluation"].get("scenario_assessment", {}).get("total_score", 0), reverse=True)
        track_details[track_key] = {
            "track_key": track_key, "track_name": track_info["track_name"], "dimensions": track_info["dimensions"],
            "hard_gates": HARD_GATES, "sku_count": len(track_profiles), "skus": details,
        }

    sku_list = [{"profile": item, "evaluation": result_map.get(item["id"], {})} for item in profiles]
    sku_details = {}
    for profile in profiles:
        track = profile.get("primary_track", "")
        evidence = []
        for task in tasks.get("tracks", {}).get(track, {}).get("tasks", []):
            result = task.get("mock_results", {}).get(profile["id"])
            if result:
                evidence.append({
                    "task_id": task["task_id"], "task_name": task["task_name"], "description": task["description"],
                    "scoring_criteria": task["scoring_criteria"], "result": result,
                })
        sku_details[profile["id"]] = {
            "profile": profile, "evaluation": result_map.get(profile["id"]), "task_evidence": evidence,
            "track_info": TRACK_DIMENSIONS.get(track, {}),
        }

    methodology = {
        "version": "2.0", "approach": "同赛道比较 × 组合推荐", "tracks": TRACK_DIMENSIONS,
        "hard_gates": HARD_GATES, "base_score_weights": BASE_SCORE_WEIGHTS,
        "shortlist_rules": {"A": "优先 shortlist", "B": "可纳入 shortlist", "C": "作为补充模块观察", "D": "当前不建议纳入"},
    }
    snapshot = {
        "overview": overview, "tracks": tracks, "trackDetails": track_details, "skus": sku_list,
        "skuDetails": sku_details, "scenarios": bundles_data.get("scenarios", []),
        "bundles": bundles_data.get("bundles", []), "tasks": tasks, "mockAssets": mock_assets,
        "methodology": methodology,
    }
    OUTPUT.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Exported {len(profiles)} SKUs, {len(tracks)} tracks, and {len(snapshot['bundles'])} bundles to {OUTPUT}")


if __name__ == "__main__":
    main()
