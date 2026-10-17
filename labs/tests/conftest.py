"""pytest 共用設定：決定測試要匯入 exercises（預設）還是 solutions 的 Lab 模組。

用法（在 labs/ 目錄下）：
    ../.venv/bin/python -m pytest tests/test_lab01_forward_pricing.py          # 測你的實作
    LAB_TARGET=solutions ../.venv/bin/python -m pytest -q                       # 測參考解答

每個測試檔開頭寫：
    from conftest import load_lab
    lab = load_lab("lab05_greeks")
"""
from __future__ import annotations

import importlib.util
import os
import sys
from pathlib import Path

import pytest

LABS_DIR = Path(__file__).resolve().parents[1]
if str(LABS_DIR) not in sys.path:
    sys.path.insert(0, str(LABS_DIR))  # 讓 `import optlib` 在任何地方都可用

VALID_TARGETS = ("exercises", "solutions")


def lab_target() -> str:
    """讀取環境變數 LAB_TARGET（預設 exercises）。"""
    target = os.environ.get("LAB_TARGET", "exercises").strip().lower()
    if target not in VALID_TARGETS:
        raise ValueError(f"LAB_TARGET 必須是 {VALID_TARGETS} 之一，收到 {target!r}")
    return target


def load_lab(name: str):
    """依 LAB_TARGET 從 exercises/ 或 solutions/ 載入 Lab 模組，例如 load_lab("lab05_greeks")。"""
    target = lab_target()
    path = LABS_DIR / target / f"{name}.py"
    if not path.exists():
        raise FileNotFoundError(f"找不到 {path}")
    mod_name = f"{target}_{name}"
    if mod_name in sys.modules:
        return sys.modules[mod_name]
    spec = importlib.util.spec_from_file_location(mod_name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[mod_name] = module
    spec.loader.exec_module(module)
    return module


def pytest_report_header(config):
    return f"LAB_TARGET = {lab_target()}（從 labs/{lab_target()}/ 載入 Lab 模組）"


@pytest.fixture
def rng():
    """固定種子的亂數產生器，讓模擬類測試可重現。"""
    import numpy as np

    return np.random.default_rng(12345)
