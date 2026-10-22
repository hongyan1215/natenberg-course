"""Build resumable narrated MP4 lessons. No website build calls this implicitly."""
from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import json
import os
from pathlib import Path
import shutil
import time

from video_render import ROOT, RenderConfig, input_hash, load_episodes, render_episode, verify_mp4


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    selection = parser.add_mutually_exclusive_group()
    selection.add_argument("--episodes", help="Comma-separated ids, e.g. ch01,ch02; default: all")
    selection.add_argument("--all", action="store_true", help="Build every episode (also the default)")
    parser.add_argument("--input", type=Path, default=ROOT / "video_src/lessons.json")
    parser.add_argument("--output", type=Path, default=ROOT / "site_src/assets/videos")
    parser.add_argument("--work-dir", type=Path, default=ROOT / ".media-work")
    parser.add_argument("--tts-engine", choices=["edge", "say"], default="edge")
    parser.add_argument("--voice", help="Default: zh-TW-HsiaoChenNeural; explicit say engine: Meijia")
    parser.add_argument("--rate", default="-8%", help="Speech-rate adjustment (use --rate=-8%%)")
    parser.add_argument("--fps", type=int, default=12)
    parser.add_argument("--workers", type=int, choices=[1, 2], default=2)
    parser.add_argument("--minimum-seconds", type=float, default=60, help="Target minimum duration; reading holds never exceed two seconds per scene")
    parser.add_argument("--skip-existing", action="store_true", help="Reuse only complete outputs with matching content/settings/renderer hashes")
    parser.add_argument("--validate-only", action="store_true", help="Validate scripts and settings without TTS or rendering")
    return parser.parse_args()


def save_manifest(path: Path, voice: dict, episodes: list[dict], order: list[str]) -> None:
    indexed = {episode["id"]: episode for episode in episodes}
    result = {"version": 1, "voice": voice, "episodes": [indexed[key] for key in order if key in indexed]}
    temporary = path.with_suffix(".partial.json")
    temporary.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def main() -> None:
    args = parse_args()
    episodes = load_episodes(args.input)
    ids = [episode["id"] for episode in episodes]
    requested = set(args.episodes.split(",")) if args.episodes else set(ids)
    missing = requested - set(ids)
    if missing:
        raise SystemExit(f"Unknown episode ids: {', '.join(sorted(missing))}")
    selected = [episode for episode in episodes if episode["id"] in requested]
    config = RenderConfig(fps=args.fps, voice=args.voice or ("zh-TW-HsiaoChenNeural" if args.tts_engine == "edge" else "Meijia"), rate=args.rate, tts_engine=args.tts_engine, minimum_seconds=args.minimum_seconds)
    config.validate()
    if args.validate_only:
        print(f"Validated {len(episodes)} episodes; selected {len(selected)}; voice={config.voice_metadata()}")
        return
    for executable in ("ffmpeg", "ffprobe"):
        if not shutil.which(executable):
            raise SystemExit(f"Missing required executable: {executable}")
    args.output.mkdir(parents=True, exist_ok=True)
    manifest_path = args.output / "manifest.json"
    existing = json.loads(manifest_path.read_text()) if manifest_path.is_file() else {}
    # Do not describe an older voice as the newly selected engine in a partial build.
    if existing.get("episodes") and existing.get("voice") != config.voice_metadata():
        raise SystemExit("Existing videos use another voice. Select a different --output directory or rebuild into a fresh output directory.")
    results = {episode["id"]: episode for episode in existing.get("episodes", []) if episode.get("id") in ids}
    pending = []
    for episode in selected:
        prior = results.get(episode["id"], {})
        complete = all((args.output / (episode["id"] + suffix)).is_file() and (args.output / (episode["id"] + suffix)).stat().st_size > 0 for suffix in (".mp4", ".vtt", ".jpg"))
        if args.skip_existing and complete and prior.get("inputHash") == input_hash(episode, config):
            verify_mp4(args.output / (episode["id"] + ".mp4"))
            print(f"{episode['id']}: matching complete output, skipped", flush=True)
        else:
            pending.append(episode)
    started = time.monotonic()
    with ThreadPoolExecutor(max_workers=args.workers) as executor:
        futures = {executor.submit(render_episode, episode, config, args.output, args.work_dir): (episode["id"], time.monotonic()) for episode in pending}
        for future in as_completed(futures):
            key, launch = futures[future]
            try:
                result = future.result()
            except Exception as error:
                for pending_future in futures:
                    pending_future.cancel()
                raise RuntimeError(f"{key} failed; completed episodes remain resumable with --skip-existing") from error
            results[key] = result
            save_manifest(manifest_path, config.voice_metadata(), list(results.values()), ids)
            size = (args.output / (key + ".mp4")).stat().st_size / 1024 / 1024
            print(f"{key}: {result['duration']:.1f}s video, {size:.2f} MiB, {time.monotonic() - launch:.1f}s elapsed", flush=True)
    if results:
        save_manifest(manifest_path, config.voice_metadata(), list(results.values()), ids)
    print(f"Finished {len(selected)} selected episode(s) in {time.monotonic() - started:.1f}s: {manifest_path}")


if __name__ == "__main__":
    main()
