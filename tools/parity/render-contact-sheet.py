#!/usr/bin/env python3
"""Render a parity smoke contact sheet from captured runtime screenshots."""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from PIL import Image, ImageDraw, ImageFont, ImageOps


BACKGROUND = "#050b0d"
PANEL = "#0b1f2d"
PANEL_ALT = "#071722"
BORDER = "#1f5a65"
TEXT = "#f3ead2"
MUTED = "#9ab1bc"
ACCENT = "#e6c66d"
PASS = "#77d38b"
FAIL = "#ff6b6b"

RUNTIME_ORDER = [
    "Web reference",
    "Windows / Flutter",
    "Linux / Flutter",
    "Android / Kotlin",
    "iOS / UIKit",
]

COLUMN_ORDER = [
    "phone",
    "tablet",
    "desktop",
    "native portrait",
    "native landscape",
    "device",
]


@dataclass(frozen=True)
class TargetShot:
    target_id: str
    runtime: str
    column: str
    status: str
    screenshot: Path | None
    error: str


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("smoke", type=Path, help="Parity smoke JSON file or smoke output directory.")
    parser.add_argument("--out", type=Path, help="Output PNG path. Defaults to contact-sheet.png beside the smoke JSON.")
    parser.add_argument("--tile-width", type=int, default=360)
    parser.add_argument("--tile-height", type=int, default=240)
    args = parser.parse_args()

    smoke_path = args.smoke
    if smoke_path.is_dir():
      smoke_path = smoke_path / "parity-smoke.json"
    if not smoke_path.exists():
        raise SystemExit(f"Smoke report not found: {smoke_path}")

    with smoke_path.open("r", encoding="utf-8-sig") as handle:
        report = json.load(handle)

    output = args.out or smoke_path.with_name("contact-sheet.png")
    output.parent.mkdir(parents=True, exist_ok=True)

    shots = [classify_target(target) for target in report.get("targets", [])]
    sheet = render_sheet(report, shots, args.tile_width, args.tile_height)
    sheet.save(output)
    print(output)
    return 0


def classify_target(target: dict) -> TargetShot:
    target_id = str(target.get("id", "unknown"))
    runtime = "Unknown"
    column = "device"

    if target_id.startswith("web-"):
        runtime = "Web reference"
        column = target_id.removeprefix("web-")
    elif target_id.startswith("windows-"):
        runtime = "Windows / Flutter"
        column = target_id.removeprefix("windows-")
    elif target_id.startswith("linux-"):
        runtime = "Linux / Flutter"
        column = target_id.removeprefix("linux-")
    elif target_id.startswith("android-native-"):
        runtime = "Android / Kotlin"
        column = f"native {target_id.removeprefix('android-native-')}"
    elif target_id.startswith("android-"):
        runtime = "Android / Kotlin"
        column = target_id.removeprefix("android-")
    elif target_id == "ios" or target_id.startswith("ios-"):
        runtime = "iOS / UIKit"
        column = "device"

    screenshot = target.get("screenshot")
    return TargetShot(
        target_id=target_id,
        runtime=runtime,
        column=column,
        status=str(target.get("status", "unknown")),
        screenshot=Path(screenshot) if screenshot else None,
        error=str(target.get("error", "")),
    )


def render_sheet(report: dict, shots: list[TargetShot], tile_w: int, tile_h: int) -> Image.Image:
    fonts = load_fonts()
    rows = ordered_unique([shot.runtime for shot in shots], RUNTIME_ORDER)
    columns = ordered_unique([shot.column for shot in shots], COLUMN_ORDER)
    by_cell = {(shot.runtime, shot.column): shot for shot in shots}

    margin = 28
    gutter = 14
    row_label_w = 190
    header_h = 110
    column_header_h = 42
    row_h = tile_h + 66
    width = margin * 2 + row_label_w + gutter + len(columns) * tile_w + (len(columns) - 1) * gutter
    height = margin * 2 + header_h + column_header_h + len(rows) * row_h + (len(rows) - 1) * gutter

    image = Image.new("RGB", (width, height), BACKGROUND)
    draw = ImageDraw.Draw(image)

    title = f"Eve Parity Reference Contact Sheet - {report.get('providerId', 'unknown')}"
    generated = str(report.get("generatedAt", ""))
    draw.text((margin, margin), title, fill=TEXT, font=fonts["title"])
    draw.text((margin, margin + 44), f"Smoke: {generated}", fill=MUTED, font=fonts["body"])
    draw.text((margin, margin + 70), f"Targets: {len(shots)} captured", fill=MUTED, font=fonts["body"])

    top = margin + header_h
    left = margin + row_label_w + gutter
    for index, column in enumerate(columns):
        x = left + index * (tile_w + gutter)
        draw.text((x, top + 10), column.upper(), fill=ACCENT, font=fonts["label"])

    y = top + column_header_h
    for row in rows:
        draw.rounded_rectangle(
            (margin, y, margin + row_label_w, y + row_h),
            radius=8,
            fill=PANEL_ALT,
            outline=BORDER,
            width=1,
        )
        draw.text((margin + 14, y + 18), row, fill=TEXT, font=fonts["label"])

        passed = sum(1 for shot in shots if shot.runtime == row and shot.status == "pass")
        total = sum(1 for shot in shots if shot.runtime == row)
        draw.text((margin + 14, y + 46), f"{passed}/{total} pass", fill=PASS if passed == total else FAIL, font=fonts["body"])

        for col_index, column in enumerate(columns):
            x = left + col_index * (tile_w + gutter)
            shot = by_cell.get((row, column))
            draw_cell(image, draw, shot, x, y, tile_w, tile_h, fonts)
        y += row_h + gutter

    return image


def draw_cell(
    sheet: Image.Image,
    draw: ImageDraw.ImageDraw,
    shot: TargetShot | None,
    x: int,
    y: int,
    tile_w: int,
    tile_h: int,
    fonts: dict[str, ImageFont.ImageFont],
) -> None:
    cell_h = tile_h + 66
    draw.rounded_rectangle((x, y, x + tile_w, y + cell_h), radius=8, fill=PANEL, outline=BORDER, width=1)
    label_y = y + 10
    preview_y = y + 42

    if shot is None:
        draw.text((x + 14, label_y), "not captured", fill=MUTED, font=fonts["body"])
        return

    status_color = PASS if shot.status == "pass" else FAIL
    draw.text((x + 14, label_y), shot.target_id, fill=TEXT, font=fonts["body_bold"])
    draw.text((x + tile_w - 72, label_y), shot.status.upper(), fill=status_color, font=fonts["body_bold"])

    preview_box = (x + 10, preview_y, x + tile_w - 10, preview_y + tile_h)
    draw.rectangle(preview_box, fill="#02080c", outline="#153642", width=1)

    if shot.status != "pass":
        draw_wrapped(draw, shot.error or "capture failed", (x + 18, preview_y + 18), tile_w - 36, fonts["body"], FAIL)
        return

    if shot.screenshot is None or not shot.screenshot.exists():
        draw_wrapped(draw, "missing screenshot", (x + 18, preview_y + 18), tile_w - 36, fonts["body"], FAIL)
        return

    with Image.open(shot.screenshot) as source:
        source = ImageOps.exif_transpose(source).convert("RGB")
        source.thumbnail((tile_w - 20, tile_h), Image.Resampling.LANCZOS)
        px = x + 10 + ((tile_w - 20) - source.width) // 2
        py = preview_y + (tile_h - source.height) // 2
        sheet.paste(source, (px, py))


def draw_wrapped(
    draw: ImageDraw.ImageDraw,
    text: str,
    xy: tuple[int, int],
    max_width: int,
    font: ImageFont.ImageFont,
    fill: str,
) -> None:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if draw.textlength(candidate, font=font) <= max_width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    y = xy[1]
    for line in lines[:8]:
        draw.text((xy[0], y), line, fill=fill, font=font)
        y += 22


def ordered_unique(values: Iterable[str], preferred: list[str]) -> list[str]:
    seen = set(values)
    ordered = [value for value in preferred if value in seen]
    ordered.extend(sorted(value for value in seen if value not in set(preferred)))
    return ordered


def load_fonts() -> dict[str, ImageFont.ImageFont]:
    candidates = [
        Path("C:/Windows/Fonts/segoeui.ttf"),
        Path("C:/Windows/Fonts/arial.ttf"),
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
    ]
    bold_candidates = [
        Path("C:/Windows/Fonts/segoeuib.ttf"),
        Path("C:/Windows/Fonts/arialbd.ttf"),
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
    ]
    regular = next((path for path in candidates if path.exists()), None)
    bold = next((path for path in bold_candidates if path.exists()), regular)
    if regular is None or bold is None:
        default = ImageFont.load_default()
        return {"title": default, "label": default, "body_bold": default, "body": default}
    return {
        "title": ImageFont.truetype(str(bold), 30),
        "label": ImageFont.truetype(str(bold), 17),
        "body_bold": ImageFont.truetype(str(bold), 14),
        "body": ImageFont.truetype(str(regular), 14),
    }


if __name__ == "__main__":
    raise SystemExit(main())
