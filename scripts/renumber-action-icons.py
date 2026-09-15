#!/usr/bin/env python3
"""action-icons 编号重排脚本（维护工具，可反复执行）

规则（见 docs/rpa-自定义动作图标计划书.md §5.1）：
1. s 编号：按「分类名升序 → 分类内按旧 s 编号升序」全库**连续编号**（1,2,3...），去掉跳号；
   —— 后端只存 `icon_series` 一个 int，所以编号必须全局唯一；
2. i 编号：每个系列内按旧 i 编号升序重排为 `1..N`，保留文件名中的名称与扩展名；
3. 采用「两阶段改名」（先全部改成 `__tmp_*`，再改成最终名），避免压缩编号时互相覆盖；
4. 输出 old→new 完整映射 JSON（供回滚/审计）。

⚠️ 编号一旦被自定义动作引用（DB `icon_series` / `icon_id`）就**不可**再重排；
   执行前请先确认 `compositeactionmodel` 中已引用的 (icon_series, icon_id) 组合数为 0。

用法：python3 scripts/renumber-action-icons.py [--dry-run]
"""
import json
import re
import sys
from datetime import datetime
from pathlib import Path

FRONTEND = Path(__file__).resolve().parent.parent
# 内容图库：放在 public/ 下随 Nginx 原样托管，不参与打包（见 scripts/gen-action-icon-manifest.mjs）
ICONS_ROOT = FRONTEND / "public" / "action-icons"
LOG_PATH = FRONTEND.parent / "docs" / f"action-icons-renumber-{datetime.now():%Y-%m-%d}.json"

SERIES_RE = re.compile(r"^s_(\d+)(?:_(.*))?$")
FILE_RE = re.compile(r"^i_(\d+)(?:_(.*))?\.(\w+)$")


def build_plan():
    """返回 (series_moves, skipped)；不触碰文件系统"""
    series_moves = []
    skipped = []
    counter = 0

    categories = sorted([d for d in ICONS_ROOT.iterdir() if d.is_dir()], key=lambda p: p.name)
    for cat in categories:
        series_dirs = []
        for d in cat.iterdir():
            if not d.is_dir():
                continue
            m = SERIES_RE.match(d.name)
            if m:
                series_dirs.append((int(m.group(1)), m.group(2), d))
            else:
                skipped.append(str(d.relative_to(ICONS_ROOT)))
        series_dirs.sort(key=lambda t: t[0])

        for old_num, series_name, d in series_dirs:
            counter += 1
            new_dir_name = f"s_{counter}" + (f"_{series_name}" if series_name else "")
            files = []
            for f in d.iterdir():
                if not f.is_file():
                    continue
                fm = FILE_RE.match(f.name)
                if fm:
                    files.append((int(fm.group(1)), fm.group(2), fm.group(3), f))
                else:
                    skipped.append(str(f.relative_to(ICONS_ROOT)))
            files.sort(key=lambda t: t[0])
            file_moves = []
            for idx, (_, fname, ext, _f) in enumerate(files, start=1):
                file_moves.append({
                    "old": _f.name,
                    "new": f"i_{idx}" + (f"_{fname}" if fname else "") + f".{ext}",
                })
            series_moves.append({
                "category": cat.name,
                "old_dir": str(d.relative_to(ICONS_ROOT)),
                "new_dir": str(Path(cat.name) / new_dir_name),
                "old_series": old_num,
                "new_series": counter,
                "file_count": len(file_moves),
                "files": file_moves,
            })
    return series_moves, skipped


def apply_plan(series_moves):
    """两阶段改名，避免压缩编号时互相覆盖"""
    temps = []
    for i, entry in enumerate(series_moves):
        old_dir = ICONS_ROOT / entry["old_dir"]
        tmp_dir = old_dir.parent / f"__tmp_s_{i}"
        for fm in entry["files"]:
            (old_dir / fm["old"]).rename(old_dir / f"__tmp_{fm['new']}")
        old_dir.rename(tmp_dir)
        temps.append(tmp_dir)
    for tmp_dir, entry in zip(temps, series_moves):
        final_dir = ICONS_ROOT / entry["new_dir"]
        for fm in entry["files"]:
            (tmp_dir / f"__tmp_{fm['new']}").rename(tmp_dir / fm["new"])
        final_dir.parent.mkdir(parents=True, exist_ok=True)
        tmp_dir.rename(final_dir)


def main():
    dry = "--dry-run" in sys.argv
    series_moves, skipped = build_plan()

    print(f"分类数: {len({s['category'] for s in series_moves})}  系列数: {len(series_moves)}  "
          f"文件数: {sum(s['file_count'] for s in series_moves)}")
    for s in series_moves:
        print(f"  [{s['category']}] s_{s['old_series']:<4} -> {s['new_dir']:<34} {s['file_count']:>4} 个文件")
    if skipped:
        print("⚠️ 跳过的不符合约定项（未改名）:", skipped)

    if dry:
        print("\n[dry-run] 未改动任何文件")
        return

    apply_plan(series_moves)
    LOG_PATH.write_text(
        json.dumps(
            {"generated_at": datetime.now().isoformat(timespec="seconds"), "series_moves": series_moves},
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    print(f"\n✅ 重排完成；old→new 映射已写入 {LOG_PATH}")
    print("👉 下一步：npm run icons:manifest（重建图标清单，否则前端读到的还是旧路径）")


if __name__ == "__main__":
    main()
