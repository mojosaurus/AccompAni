import json
from pathlib import Path
from typing import Dict, List

from .swara_generator import CarnaticSwaraGenerator, ExerciseItem, Tala


def render_module_markdown(
    generator: CarnaticSwaraGenerator,
    tala: Tala,
    title: str,
    subtitle: str,
    exercises: List[ExerciseItem],
) -> str:
    """Render a standards-formatted Markdown practice book for a single Sarali module."""
    anga_str = " + ".join(str(a) for a in tala.angas)
    scale_str = "  ".join(generator.octave_notes)

    lines: List[str] = [
        f"# {title}",
        "",
        f"> {subtitle}",
        "",
        "## Practice Parameters",
        "",
        f"- **Raga:** {generator.raga.name} — {generator.raga.melakarta_info}",
        f"- **Scale (Bounded 1-Octave):** `{scale_str}`",
        f"- **Tala:** {tala.name} Tala (`{anga_str}` = {tala.beats_per_cycle} Aksharas)",
        f"- **Total Exercises:** {len(exercises)}",
        "",
        "---",
        "",
    ]

    for ex in exercises:
        lines.extend(
            [
                f"## {ex.title}",
                "",
                f"- **Motif Swaras:** {ex.motif_swaras}",
                f"- **Carnatic Classification:** {ex.carnatic_term}",
                f"- **Pattern Type:** {ex.pattern_type}",
                f"- **Practice Focus:** {ex.focus}",
                "",
                "```text",
                *ex.notation_lines,
                "```",
                "",
                "---",
                "",
            ]
        )

    return "\n".join(lines).rstrip() + "\n"


def export_all_markdown_books(
    generator: CarnaticSwaraGenerator,
    tala: Tala,
    output_dir: Path = Path("output"),
) -> Dict[str, Path]:
    """
    Generate all four grammatically strict Sarali Varisai Markdown books
    and `output/manifest.json` so GitHub Pages can load everything statically.
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    raga_key = generator.raga.key

    modules = [
        {
            "id": "bounded_motifs",
            "number": "01",
            "title": "Bounded Motifs",
            "carnatic_name": "Alankara Varisai",
            "description": "Stepwise and vakra 4-note motifs shifting strictly within S to Ṡ with zero octave wrapping.",
            "accent": "#008272",
            "filename": "bounded_motifs.md",
            "items": generator.generate_bounded_motifs(tala),
        },
        {
            "id": "cumulative_ceilings",
            "number": "02",
            "title": "Cumulative Ceilings",
            "carnatic_name": "Sarali Sthayi Extensions",
            "description": "Progressive range expansions (S→M, S→P, S→D, S→N, S→Ṡ) anchored back to Shadjam.",
            "accent": "#0078d4",
            "filename": "cumulative_ceilings.md",
            "items": generator.generate_cumulative_ceilings(tala),
        },
        {
            "id": "bowing_and_kala",
            "number": "03",
            "title": "Bowing & Kala",
            "carnatic_name": "Sanchara Bowing & Tri-Kala",
            "description": "Separate bows (⊓ / ∨), 2-note Jodi slurs, 4-note Anga slurs across bar lines, and 2nd-speed Dvitiya Kala.",
            "accent": "#4f46e5",
            "filename": "bowing_and_kala.md",
            "items": generator.generate_bowing_and_kala(tala),
        },
        {
            "id": "bounded_thirds",
            "number": "04",
            "title": "Bounded Thirds",
            "carnatic_name": "Entry-Level Dhatu Varisai",
            "description": "Controlled single-skip intervals (leap ≤ 2) strictly bounded between S and Ṡ.",
            "accent": "#b45309",
            "filename": "bounded_thirds.md",
            "items": generator.generate_bounded_thirds(tala),
        },
    ]

    exported_paths: Dict[str, Path] = {}
    manifest_modules: List[dict] = []

    for mod in modules:
        out_path = output_dir / mod["filename"]
        md_text = render_module_markdown(
            generator=generator,
            tala=tala,
            title=f"Sarali Varisai — {mod['title']} ({mod['carnatic_name']})",
            subtitle=mod["description"],
            exercises=mod["items"],
        )
        out_path.write_text(md_text, encoding="utf-8")
        exported_paths[mod["id"]] = out_path

        manifest_modules.append(
            {
                "id": mod["id"],
                "number": mod["number"],
                "title": mod["title"],
                "carnatic_name": mod["carnatic_name"],
                "description": mod["description"],
                "accent": mod["accent"],
                "exercise_count": len(mod["items"]),
                "files": {
                    raga_key: f"output/{mod['filename']}",
                },
            }
        )

    manifest = {
        "project": "Project AccompAni",
        "raga_default": raga_key,
        "modules": manifest_modules,
    }
    manifest_path = output_dir / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    exported_paths["manifest"] = manifest_path

    return exported_paths