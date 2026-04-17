"""
数据生成脚本
运行完整评测流程并生成所有数据文件
"""
import os
import sys

def main():
    """运行完整评测流程"""
    os.makedirs("data", exist_ok=True)

    print("=" * 60)
    print("数字生产力单元评测平台 - 数据生成")
    print("=" * 60)

    # Step 1: 生成SKU目录
    print("\n[Step 1] 生成SKU目录...")
    from sku_catalog_generator import save_sku_catalog
    catalog = save_sku_catalog("data/sku_catalog.json")
    print(f"  已生成 {len(catalog)} 个SKU样本")

    # Step 2: 运行第一层合格考
    print("\n[Step 2] 运行第一层合格考...")
    from evaluation_engine import run_general_evaluation
    results, shortlist, fail_list = run_general_evaluation("data/sku_catalog.json")

    # Step 3: 运行第二层专业评测
    print("\n[Step 3] 运行第二层招聘方向专业评测...")
    from recruiting_evaluator import run_professional_evaluation
    prof_results, final_tiering = run_professional_evaluation(
        "data/sku_catalog.json", "data/shortlist.json"
    )

    print("\n" + "=" * 60)
    print("数据生成完成！")
    print("=" * 60)
    print(f"\n生成的数据文件：")
    for f in os.listdir("data"):
        filepath = os.path.join("data", f)
        size = os.path.getsize(filepath)
        print(f"  data/{f} ({size:,} bytes)")

if __name__ == "__main__":
    main()
