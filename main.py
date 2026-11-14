import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import webbrowser

from helpers import CarnaticSwaraGenerator, RAGA_REGISTRY, Tala, export_all_markdown_books

ROOT_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = ROOT_DIR / "output"


class AccompAniHandler(SimpleHTTPRequestHandler):
    """Serves the static GitHub Pages-compatible AccompAni app locally with no-cache headers."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT_DIR), **kwargs)

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        super().end_headers()

    def log_message(self, format: str, *args) -> None:
        pass


def main() -> None:
    parser = argparse.ArgumentParser(description="Project AccompAni — Carnatic Violin Generator & Playalong")
    parser.add_argument(
        "--generate-only",
        action="store_true",
        help="Generate output/*.md and output/manifest.json without starting the local server.",
    )
    parser.add_argument("--port", type=int, default=8000, help="Local server port (default: 8000)")
    args = parser.parse_args()

    shankarabharanam = RAGA_REGISTRY["shankarabharanam"]
    gen = CarnaticSwaraGenerator(raga=shankarabharanam)
    adi_tala = Tala(name="Adi", angas=[4, 2, 2], nadai=1)

    exported = export_all_markdown_books(
        generator=gen,
        tala=adi_tala,
        output_dir=OUTPUT_DIR,
    )
    print("Generated Project AccompAni exercise books:")
    for key, path in exported.items():
        print(f"  - {key:20s} -> {path.relative_to(ROOT_DIR)}")

    if args.generate_only:
        return

    url = f"[http://127.0.0.1](http://127.0.0.1):{args.port}/index.html"
    server = ThreadingHTTPServer(("127.0.0.1", args.port), partial(AccompAniHandler))

    print(f"\nProject AccompAni running at: {url}")
    print("Press Ctrl+C to stop.\n")
    webbrowser.open(url)

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down Project AccompAni server.")
        server.server_close()


if __name__ == "__main__":
    main()