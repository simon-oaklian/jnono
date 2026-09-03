#!/usr/bin/env python3
from __future__ import annotations

import csv
import hashlib
import io
import json
import os
import re
import secrets
import sqlite3
import sys
from datetime import datetime, timedelta, timezone
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent
DB_PATH = ROOT / "data" / "jnono.db"
DEFAULT_BANK_PATH = ROOT / "data" / "question-bank.json"
QUESTION_IMAGES_DIR = ROOT / "images" / "questions"
QUESTION_IMAGE_MAX_BYTES = 2 * 1024 * 1024  # 2 MB
WRONG_BOOK_REMOVE_STREAK = 5  # 错题连续答对多少次才移出错题本
QUESTION_IMAGE_ALLOWED_EXT = {"png", "jpg", "jpeg", "webp"}
QUESTION_IMAGE_MAGIC = {
    b"\x89PNG\r\n\x1a\n": "png",
    b"\xff\xd8\xff": "jpg",
    b"RIFF": "webp",  # WebP: RIFF....WEBP, we check prefix
}

ADMIN_EMAIL = "admin@licensedrill.com"
ADMIN_PASSWORD = "admin123456"
ADMIN_NAME = "系统管理员"
SEED_DEFAULT_USERS = os.environ.get("SEED_DEFAULT_USERS", "1").lower() not in {"0", "false", "no"}

ENTITLEMENT_KEYS = ("bLicenseAccess", "cLicenseAccess", "bilingualAccess", "aiAccess")
DB_ENTITLEMENT_KEYS = ("b_license_access", "c_license_access", "bilingual_access", "ai_access")
CONTENT_PERMISSION_KEYS = ("bilingualEnabled", "explanationEnabled", "memoryTipsEnabled")

DEFAULT_CATEGORIES = [
    {"key": "b_license", "name": "B License", "is_enabled": 1, "sort_order": 10},
    {"key": "c_license", "name": "C License", "is_enabled": 1, "sort_order": 20},
]
DEFAULT_CATEGORIES_BOOTSTRAP_SETTING_KEY = "default_categories_bootstrap_done"
B_PATH_LAUNCH_READY_SETTING_KEY = "b_path_launch_ready_v1_done"

DEFAULT_EXAM_CATALOG = [
    {
        "industry_key": "contractor",
        "industry_name": "Contractor License",
        "exam_family_key": "b_general",
        "exam_family_name": "B General Building",
        "trade_code": "",
        "exam_type": "law_business",
        "exam_code": "b_general_law_business",
        "exam_name": "Law & Business",
        "category_key": "b_license",
        "sort_order": 10,
        "is_enabled": 1,
    },
    {
        "industry_key": "contractor",
        "industry_name": "Contractor License",
        "exam_family_key": "b_general",
        "exam_family_name": "B General Building",
        "trade_code": "b_general",
        "exam_type": "trade",
        "exam_code": "ca_general_b",
        "exam_name": "B General Building Trade",
        "category_key": "b_license",
        "sort_order": 20,
        "is_enabled": 1,
    },
    {
        "industry_key": "contractor",
        "industry_name": "Contractor License",
        "exam_family_key": "c_specialty",
        "exam_family_name": "C Specialty",
        "trade_code": "",
        "exam_type": "law_business",
        "exam_code": "c_specialty_law_business",
        "exam_name": "Law & Business",
        "category_key": "c_license",
        "sort_order": 30,
        "is_enabled": 1,
    },
    {
        "industry_key": "contractor",
        "industry_name": "Contractor License",
        "exam_family_key": "c_specialty",
        "exam_family_name": "C Specialty",
        "trade_code": "c10_electrical",
        "exam_type": "trade",
        "exam_code": "c10_electrical",
        "exam_name": "Electrical Trade",
        "category_key": "c_license",
        "sort_order": 40,
        "is_enabled": 1,
    },
    {
        "industry_key": "contractor",
        "industry_name": "Contractor License",
        "exam_family_key": "c_specialty",
        "exam_family_name": "C Specialty",
        "trade_code": "c36_plumbing",
        "exam_type": "trade",
        "exam_code": "c36_plumbing",
        "exam_name": "Plumbing Trade",
        "category_key": "c_license",
        "sort_order": 60,
        "is_enabled": 1,
    },
    {
        "industry_key": "contractor",
        "industry_name": "Contractor License",
        "exam_family_key": "c_specialty",
        "exam_family_name": "C Specialty",
        "trade_code": "c20_hvac",
        "exam_type": "trade",
        "exam_code": "c20_hvac",
        "exam_name": "HVAC Trade",
        "category_key": "c_license",
        "sort_order": 80,
        "is_enabled": 1,
    },
    {
        "industry_key": "contractor",
        "industry_name": "Contractor License",
        "exam_family_key": "c_specialty",
        "exam_family_name": "C Specialty",
        "trade_code": "c27_landscaping",
        "exam_type": "trade",
        "exam_code": "c27_landscaping",
        "exam_name": "Landscaping Trade",
        "category_key": "c_license",
        "sort_order": 100,
        "is_enabled": 1,
    },
    {
        "industry_key": "contractor",
        "industry_name": "Contractor License",
        "exam_family_key": "c_specialty",
        "exam_family_name": "C Specialty",
        "trade_code": "c33_painting",
        "exam_type": "trade",
        "exam_code": "c33_painting",
        "exam_name": "Painting Trade",
        "category_key": "c_license",
        "sort_order": 120,
        "is_enabled": 1,
    },
]

DEFAULT_EXAM_RULES = {
    "b_general_law_business": {"question_count": 115, "exam_time_minutes": 210},
    "ca_general_b": {"question_count": 115, "exam_time_minutes": 210},
    "c_specialty_law_business": {"question_count": 115, "exam_time_minutes": 210},
    "c10_electrical": {"question_count": 100, "exam_time_minutes": 180},
    "c36_plumbing": {"question_count": 100, "exam_time_minutes": 180},
    "c20_hvac": {"question_count": 100, "exam_time_minutes": 180},
    "c27_landscaping": {"question_count": 100, "exam_time_minutes": 180},
    "c33_painting": {"question_count": 100, "exam_time_minutes": 180},
}

# V2 configurable exam/category defaults (backward-compatible with existing exam codes).
DEFAULT_EXAMS_V2 = [
    {
        "code": "b_general_law_business",
        "name": "Law & Business Examination",
        "name_zh": "法律与商业考试",
        "description": "Contractor law and business core module.",
        "sort_order": 10,
        "is_active": 1,
        "practice_enabled": 1,
        "mock_enabled": 1,
        "mock_question_count": 115,
        "mock_time_limit_minutes": 210,
        "included_exam_codes": [],
    },
    {
        "code": "ca_general_b",
        "name": "B General Building Contractor",
        "name_zh": "B 类建筑总承包商",
        "description": "California B general building trade module.",
        "sort_order": 20,
        "is_active": 1,
        "practice_enabled": 1,
        "mock_enabled": 1,
        "mock_question_count": 115,
        "mock_time_limit_minutes": 210,
        "included_exam_codes": [],
    },
]

DEFAULT_EXAM_CATEGORIES_V2 = {
    "b_general_law_business": [
        ("BUSINESS_ORGANIZATION", "Business Organization", "商业组织"),
        ("BUSINESS_FINANCES", "Business Finances", "商业财务"),
        ("EMPLOYMENT_REQUIREMENTS", "Employment Requirements", "雇佣要求"),
        ("BONDS_INSURANCE_LIENS", "Bonds, Insurance, and Liens", "保证金、保险与留置权"),
        ("CONTRACT_REQUIREMENTS_EXECUTION", "Contract Requirements and Execution", "合同要求与执行"),
        ("LICENSING_REQUIREMENTS", "Licensing Requirements", "执照要求"),
        ("SAFETY", "Safety", "安全规范"),
        ("PUBLIC_WORKS", "Public Works", "公共工程"),
    ],
    "ca_general_b": [
        ("B_PLANNING_ESTIMATING", "B Planning & Estimating", "B 类计划与预算"),
        ("B_FRAMING_STRUCTURAL", "B Framing & Structural", "B 类结构与框架施工"),
        ("B_CORE_TRADES_PART_1", "B Core Trades (Part 1)", "B 类核心工种（第 1 部分）"),
        ("B_CORE_TRADES_PART_2", "B Core Trades (Part 2)", "B 类核心工种（第 2 部分）"),
        ("B_FINISH_TRADES", "B Finish Trades", "B 类收尾工种"),
        ("B_HEALTH_SAFETY", "B Health & Safety", "B 类健康与安全"),
        ("B_GENERAL_BUILDING_UPDATES_1", "B General Building Updates I", "B 类建筑规范更新 I"),
        ("B_GENERAL_BUILDING_UPDATES_2", "B General Building Updates II", "B 类建筑规范更新 II"),
        ("HEALTH_SAFETY_TEST", "Health & Safety Test", "健康与安全测试"),
    ],
}

DEFAULT_IMPORT_CONTEXT_BY_CATEGORY = {
    "b_license": {
        "industry_id": "construction",
        "industry_name": "Contractor License",
        "examId": "ca-general-b",
        "exam_name": "California General B",
    },
    "c_license": {
        "industry_id": "construction",
        "industry_name": "Contractor License",
        "examId": "ca-trade-c",
        "exam_name": "California Trade C",
    },
}

CATEGORY_MIGRATION_SETTING_KEY = "category_migration_v1_done"
DELETED_DEFAULT_EXAM_CODES_SETTING_KEY = "deleted_default_exam_codes_v1"
EXAM_STRUCTURE_BOOTSTRAP_SETTING_KEY = "exam_structure_bootstrap_v1_done"
SITE_WECHAT_SETTING_KEY = "site_contact_wechat"
SITE_PRICING_SETTING_KEY = "site_pricing_config_v1"
DEFAULT_DASHBOARD_MODULES_BOOTSTRAP_SETTING_KEY = "dashboard_modules_bootstrap_v1_done"
DEFAULT_COURSE_CONTENTS_BOOTSTRAP_SETTING_KEY = "course_contents_bootstrap_v1_done"
DEFAULT_SITE_WECHAT_ID = "JNONO_HELP"
FAR_FUTURE_EXPIRES_AT = "2099-12-31T23:59:59+00:00"

DEFAULT_ASSIGNED_EXAM_CODES = ["LAW_BUSINESS", "B_GENERAL"]

# Approximate PSI blueprint weights for mock exam question sampling.
# Values represent relative target question counts (sum ≈ exam question_count).
# Derived from observed PSI exam result section breakdowns; no official outline available.
# Core categories mirror PSI sections; supplemental categories (Updates, HEALTH_SAFETY_TEST)
# are included at minimal weight so students get occasional exposure.
EXAM_MOCK_CATEGORY_WEIGHTS: dict[str, dict[str, int]] = {
    "b_general_law_business": {
        "BUSINESS_ORGANIZATION":            16,  # PSI section ~16q
        "BUSINESS_FINANCES":                17,  # PSI section ~17q
        "EMPLOYMENT_REQUIREMENTS":          20,  # PSI section ~20q
        "BONDS_INSURANCE_LIENS":            12,  # PSI section ~12q
        "CONTRACT_REQUIREMENTS_EXECUTION":  20,  # PSI section ~20q
        "LICENSING_REQUIREMENTS":           13,  # PSI section ~13q
        "PUBLIC_WORKS":                     14,  # PSI section ~14q
        "SAFETY":                           13,  # PSI section ~13q
        # total = 125 → system scales to actual questionCount (115)
    },
    "ca_general_b": {
        "B_PLANNING_ESTIMATING":        37,  # PSI sections 1+2 (planning ~17q + plans/codes ~23q)
        "B_FRAMING_STRUCTURAL":         32,  # PSI section 3 (~35q, largest section)
        "B_CORE_TRADES_PART_1":         11,  # PSI section 4 first half (~23q total)
        "B_CORE_TRADES_PART_2":         10,  # PSI section 4 second half
        "B_FINISH_TRADES":              15,  # PSI section 5 (~17q)
        "B_HEALTH_SAFETY":               5,  # safety knowledge, small
        "HEALTH_SAFETY_TEST":            2,  # supplemental, minimal exposure
        "B_GENERAL_BUILDING_UPDATES_1":  2,  # supplemental, minimal exposure
        "B_GENERAL_BUILDING_UPDATES_2":  1,  # supplemental, minimal exposure
        # total = 115 → maps directly to questionCount
    },
}
MODULE_TYPE_VALUES = {
    "exam_card",
    "practice_center",
    "mock_exam_entry",
    "progress_tracker",
    "course_video",
    "course_audio",
    "live_stream",
    "resources",
    "account_settings",
    "custom_link",
}
ROUTE_TYPE_VALUES = {
    "internal_page",
    "exam_home",
    "category_practice",
    "mock_exam",
    "placeholder",
    "external_link",
}
MEMBERSHIP_VISIBILITY_VALUES = {"free", "basic_399", "pro_599", "ai_999"}
COURSE_CONTENT_TYPE_VALUES = {"video", "audio", "live"}

DEFAULT_DASHBOARD_MODULES = [
    {
        "module_code": "exam_law_business",
        "title": "Law & Business",
        "title_zh": "法律与商业考试",
        "module_type": "exam_card",
        "description": "Contractor Law & Business training module.",
        "icon": "scale",
        "is_active": 1,
        "sort_order": 10,
        "visible_for_exam_codes": ["LAW_BUSINESS", "B_GENERAL", "C_LICENSE"],
        "visible_for_membership_tiers": [],
        "route_type": "exam_home",
        "route_target": "b_general_law_business",
        "linked_exam_code": "b_general_law_business",
        "linked_category_code": "",
        "badge_text": "",
        "is_placeholder": 0,
        "settings_json": {},
    },
    {
        "module_code": "exam_b_general",
        "title": "B General Building",
        "title_zh": "B类建筑总承包商",
        "module_type": "exam_card",
        "description": "B General trade training module.",
        "icon": "building",
        "is_active": 1,
        "sort_order": 20,
        "visible_for_exam_codes": ["B_GENERAL"],
        "visible_for_membership_tiers": [],
        "route_type": "exam_home",
        "route_target": "ca_general_b",
        "linked_exam_code": "ca_general_b",
        "linked_category_code": "",
        "badge_text": "",
        "is_placeholder": 0,
        "settings_json": {},
    },
    {
        "module_code": "exam_c_license",
        "title": "C License",
        "title_zh": "C类专业执照",
        "module_type": "exam_card",
        "description": "C Specialty training module.",
        "icon": "bolt",
        "is_active": 1,
        "sort_order": 30,
        "visible_for_exam_codes": ["C_LICENSE"],
        "visible_for_membership_tiers": [],
        "route_type": "exam_home",
        "route_target": "c10_electrical",
        "linked_exam_code": "c10_electrical",
        "linked_category_code": "",
        "badge_text": "",
        "is_placeholder": 0,
        "settings_json": {},
    },
    {
        "module_code": "practice_center",
        "title": "Practice Center",
        "title_zh": "分类练习中心",
        "module_type": "practice_center",
        "description": "Practice by category.",
        "icon": "target",
        "is_active": 1,
        "sort_order": 40,
        "visible_for_exam_codes": [],
        "visible_for_membership_tiers": [],
        "route_type": "internal_page",
        "route_target": "practice_center",
        "linked_exam_code": "",
        "linked_category_code": "",
        "badge_text": "",
        "is_placeholder": 0,
        "settings_json": {},
    },
    {
        "module_code": "mock_exam",
        "title": "Mock Exam",
        "title_zh": "模拟考试",
        "module_type": "mock_exam_entry",
        "description": "Timed mock exams using exam rules.",
        "icon": "timer",
        "is_active": 1,
        "sort_order": 50,
        "visible_for_exam_codes": [],
        "visible_for_membership_tiers": [],
        "route_type": "internal_page",
        "route_target": "mock_exam",
        "linked_exam_code": "",
        "linked_category_code": "",
        "badge_text": "",
        "is_placeholder": 0,
        "settings_json": {},
    },
    {
        "module_code": "licensing_progress",
        "title": "Licensing Progress",
        "title_zh": "执照进度",
        "module_type": "progress_tracker",
        "description": "Track application and exam milestones.",
        "icon": "progress",
        "is_active": 1,
        "sort_order": 60,
        "visible_for_exam_codes": [],
        "visible_for_membership_tiers": [],
        "route_type": "internal_page",
        "route_target": "licensing_progress",
        "linked_exam_code": "",
        "linked_category_code": "",
        "badge_text": "",
        "is_placeholder": 0,
        "settings_json": {},
    },
    {
        "module_code": "video_course",
        "title": "Video Course",
        "title_zh": "视频课程",
        "module_type": "course_video",
        "description": "Video course module placeholder.",
        "icon": "video",
        "is_active": 0,
        "sort_order": 70,
        "visible_for_exam_codes": [],
        "visible_for_membership_tiers": [],
        "route_type": "placeholder",
        "route_target": "course_video",
        "linked_exam_code": "",
        "linked_category_code": "",
        "badge_text": "Coming Soon",
        "is_placeholder": 1,
        "settings_json": {},
    },
    {
        "module_code": "audio_course",
        "title": "Audio Course",
        "title_zh": "音频课程",
        "module_type": "course_audio",
        "description": "Audio course module placeholder.",
        "icon": "audio",
        "is_active": 0,
        "sort_order": 80,
        "visible_for_exam_codes": [],
        "visible_for_membership_tiers": [],
        "route_type": "placeholder",
        "route_target": "course_audio",
        "linked_exam_code": "",
        "linked_category_code": "",
        "badge_text": "Coming Soon",
        "is_placeholder": 1,
        "settings_json": {},
    },
    {
        "module_code": "live_stream",
        "title": "Live Streaming",
        "title_zh": "直播课程",
        "module_type": "live_stream",
        "description": "Live streaming module placeholder.",
        "icon": "live",
        "is_active": 0,
        "sort_order": 90,
        "visible_for_exam_codes": [],
        "visible_for_membership_tiers": ["ai_999"],
        "route_type": "placeholder",
        "route_target": "live_stream",
        "linked_exam_code": "",
        "linked_category_code": "",
        "badge_text": "VIP",
        "is_placeholder": 1,
        "settings_json": {},
    },
    {
        "module_code": "resources_center",
        "title": "Resources",
        "title_zh": "学习资源",
        "module_type": "resources",
        "description": "Learning resources and references.",
        "icon": "book",
        "is_active": 1,
        "sort_order": 100,
        "visible_for_exam_codes": [],
        "visible_for_membership_tiers": [],
        "route_type": "placeholder",
        "route_target": "resources",
        "linked_exam_code": "",
        "linked_category_code": "",
        "badge_text": "",
        "is_placeholder": 1,
        "settings_json": {},
    },
    {
        "module_code": "account_settings",
        "title": "Account Settings",
        "title_zh": "账号设置",
        "module_type": "account_settings",
        "description": "Manage profile and preferences.",
        "icon": "user",
        "is_active": 1,
        "sort_order": 110,
        "visible_for_exam_codes": [],
        "visible_for_membership_tiers": [],
        "route_type": "internal_page",
        "route_target": "account_settings",
        "linked_exam_code": "",
        "linked_category_code": "",
        "badge_text": "",
        "is_placeholder": 0,
        "settings_json": {},
    },
]

DEFAULT_COURSE_CONTENTS = [
    {
        "content_code": "video_intro",
        "title": "Video Course (Coming Soon)",
        "content_type": "video",
        "linked_exam_code": "ca_general_b",
        "is_active": 0,
        "sort_order": 10,
        "description": "Video lessons placeholder.",
        "thumbnail": "",
        "access_tier": "",
        "is_placeholder": 1,
    },
    {
        "content_code": "audio_intro",
        "title": "Audio Course (Coming Soon)",
        "content_type": "audio",
        "linked_exam_code": "ca_general_b",
        "is_active": 0,
        "sort_order": 20,
        "description": "Audio lessons placeholder.",
        "thumbnail": "",
        "access_tier": "",
        "is_placeholder": 1,
    },
    {
        "content_code": "live_intro",
        "title": "Live Streaming (Coming Soon)",
        "content_type": "live",
        "linked_exam_code": "ca_general_b",
        "is_active": 0,
        "sort_order": 30,
        "description": "Live training placeholder.",
        "thumbnail": "",
        "access_tier": "ai_999",
        "is_placeholder": 1,
    },
]

DEFAULT_SITE_PRICING_CONFIG = {
    "promoEnabled": True,
    "promoEndAt": "",
    "plans": {
        "basic": {
            "originalPrice": 699,
            "promoPrice": 399,
            "durationText": "3个月训练",
        },
        "professional": {
            "originalPrice": 999,
            "promoPrice": 599,
            "durationText": "3个月训练",
            "recommended": True,
        },
        "ai": {
            "originalPrice": 1599,
            "promoPrice": 999,
            "durationText": "3个月训练",
        },
    },
}

# V1 naming lock: Contractor B sub-item key is fixed to "b_general".
CONTRACTOR_PROGRAM_KEY = "contractor"
CONTRACTOR_B_FAMILY_KEY = "b_general"
CONTRACTOR_B_SUB_ITEM_KEY = "b_general"

DEFAULT_USERS = [
    {
        "name": "默认付费学员",
        "email": "demo@licensedrill.com",
        "password": "demo123456",
        "plan": "paid",
        "membership_tier": "pro_599",
    },
    {
        "name": "默认注册学员",
        "email": "student@licensedrill.com",
        "password": "student123",
        "plan": "free",
        "membership_tier": "free",
    },
]

ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", ADMIN_EMAIL)
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", ADMIN_PASSWORD)
ADMIN_NAME = os.environ.get("ADMIN_NAME", ADMIN_NAME)

if ADMIN_PASSWORD == "admin123456":
    print(
        "[SECURITY WARNING] Default admin password 'admin123456' is in use. "
        "Set ADMIN_PASSWORD environment variable to a secure value.",
        file=sys.stderr,
    )

B_TOPIC_ORDER = [
    "Business Organization / 商业组织",
    "Business Finances / 商业财务",
    "Employment Requirements / 雇佣要求",
    "Bonds, Insurance, and Liens / 保证金、保险与留置权",
    "Contract Requirements and Execution / 合同要求与执行",
    "Licensing Requirements / 执照要求",
    "Safety / 安全规范",
    "Public Works / 公共工程",
    "B Planning & Estimating / B类计划与预算",
    "B Framing & Structural / B类结构与框架施工",
    "B Core Trades (Part 1) / B类核心工种（第1部分）",
    "B Core Trades (Part 2) / B类核心工种（第2部分）",
    "B Finish Trades / B类收尾工种",
    "B Health & Safety / B类健康与安全",
    "B General Building Updates I / B类建筑规范更新 I",
    "B General Building Updates II / B类建筑规范更新 II",
    "Health & Safety Test / 健康与安全测试",
]

B_TOPIC_RULES = [
    (B_TOPIC_ORDER[0], ["business organization", "商业组织"]),
    (B_TOPIC_ORDER[1], ["business finance", "business finances", "商业财务", "财务"]),
    (B_TOPIC_ORDER[2], ["employment requirement", "雇佣要求", "劳工", "工资"]),
    (B_TOPIC_ORDER[3], ["bonds, insurance, and liens", "保证金", "留置权", "保险"]),
    (B_TOPIC_ORDER[4], ["contract requirements", "execution", "合同要求", "合同", "变更订单"]),
    (B_TOPIC_ORDER[5], ["licensing requirement", "执照要求", "license"]),
    (B_TOPIC_ORDER[6], ["safety", "安全规范", "osha"]),
    (B_TOPIC_ORDER[7], ["public works", "公共工程"]),
    (B_TOPIC_ORDER[8], ["planning & estimating", "计划与预算", "估算"]),
    (B_TOPIC_ORDER[9], ["framing & structural", "结构与框架", "框架施工", "结构"]),
    (B_TOPIC_ORDER[10], ["core trades (part 1)", "核心工种（第1部分）", "核心工种第1部分"]),
    (B_TOPIC_ORDER[11], ["core trades (part 2)", "核心工种（第2部分）", "核心工种第2部分"]),
    (B_TOPIC_ORDER[12], ["finish trades", "收尾工种"]),
    (B_TOPIC_ORDER[13], ["b health & safety", "b类健康与安全"]),
    (B_TOPIC_ORDER[14], ["general building updates i", "建筑规范更新 i", "更新 i"]),
    (B_TOPIC_ORDER[15], ["general building updates ii", "建筑规范更新 ii", "更新 ii"]),
    (B_TOPIC_ORDER[16], ["health & safety test", "健康与安全测试"]),
]

CJK_RE = re.compile(r"[\u3400-\u9fff]")
EN_WORD_RE = re.compile(r"[A-Za-z]")
TRANSLATION_STATUS_VALUES = {"untranslated", "ai_translated", "human_verified"}
QUESTION_STATUS_VALUES = {"active", "inactive", "deleted"}
EXAM_TYPE_VALUES = {"law_business", "trade"}
ACCOUNT_STATUS_VALUES = {"active", "suspended"}
SUSPENDED_USER_ERROR = "账号已被暂停，请联系管理员。"
MEMBERSHIP_TIERS = ("free", "basic_399", "pro_599", "ai_999")
PAID_MEMBERSHIP_TIERS = {"basic_399", "pro_599", "ai_999"}
TIER_TO_PLAN = {
    "free": "free",
    "basic_399": "paid",
    "pro_599": "paid",
    "ai_999": "paid",
}
ZH_SUPPORT_FIELD_KEYS = (
    "prompt_zh",
    "option_a_zh",
    "option_b_zh",
    "option_c_zh",
    "option_d_zh",
    "explanation_zh",
    "key_point_zh",
    "vocab_zh",
    "memory_tip_zh",
    "answer_reasoning_zh",
)
EXPLANATION_SUPPORT_FIELD_KEYS = (
    "explanation",
    "explanation_zh",
)
MEMORY_SUPPORT_FIELD_KEYS = (
    "key_point_en",
    "keyPointEn",
    "key_point_zh",
    "keyPointZh",
    "keyPoints",
    "key_points",
    "answer_reasoning_en",
    "answerReasoningEn",
    "answer_reasoning_zh",
    "answerReasoningZh",
    "vocab_zh",
    "vocabZh",
    "memory_tip_zh",
    "memoryTipZh",
    "memory_trick",
    "memoryTrick",
)

OPENAI_MODEL = "gpt-4o-mini"
OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"
AI_IMPORT_FIELDS = (
    "prompt_zh",
    "option_a_zh",
    "option_b_zh",
    "option_c_zh",
    "option_d_zh",
    "explanation",
    "explanation_zh",
    "key_point_zh",
    "vocab_zh",
    "memory_tip_zh",
)

EN_TO_ZH_PHRASES = [
    ("before starting demolition in an occupied home, what should the contractor do first", "在有人居住的住宅开始拆除前，承包商首先应做什么"),
    ("which item must be clearly defined in a home improvement contract", "在家装合同中，哪一项必须明确写清"),
    ("when is a building permit typically required", "通常在什么情况下需要办理建筑许可"),
    ("what is the main purpose of daily job logs", "施工日志的主要作用是什么"),
    ("which action is part of proper site preparation", "以下哪项属于正确的现场准备"),
    ("what is the safest way to manage extension cords on a jobsite", "在工地上管理延长线最安全的做法是什么"),
    ("a change order should be handled how", "变更单应如何处理"),
    ("why should material delivery receipts be retained", "为什么要保留材料到货单据"),
    ("who is typically responsible for obtaining required permits", "通常由谁负责办理所需许可证"),
    ("before concrete placement, what should be confirmed", "混凝土浇筑前应确认什么"),
    ("personal protective equipment selection should be based on what", "个人防护装备应根据什么来选择"),
    ("what helps reduce payment disputes", "哪种做法有助于减少付款争议"),
    ("what should inspection records include", "检查记录应包含哪些内容"),
    ("if work changes from approved plans, what is usually required", "施工偏离已批准图纸时通常需要做什么"),
    ("which preconstruction action supports quality control", "哪项开工前动作最能支持质量控制"),
    ("what is a key fall-protection practice when working at height", "高处作业时关键的防坠落做法是什么"),
    ("why should allowance items be defined clearly", "为什么应明确暂定金额项目"),
    ("which record best supports a delay claim", "哪类记录最能支持延误索赔"),
    ("what should be done before requesting final inspection", "申请最终验收前应先做什么"),
    ("why is utility locate verification critical before excavation", "为什么开挖前核实地下管线定位至关重要"),
    ("verify hazard controls and isolate the work zone", "确认危险控制措施并隔离作业区"),
    ("scope of work and payment terms", "施工范围和付款条款"),
    ("for structural, electrical, or plumbing alterations", "涉及结构、电气或管道改造"),
    ("track progress, events, and decisions", "记录进度、事件和决策"),
    ("protect adjacent finishes and verify measurements", "保护相邻成品并核对尺寸"),
    ("route and secure cords to reduce trip hazards", "规范布置并固定电线以减少绊倒风险"),
    ("written approval before extra work begins", "额外工作开始前完成书面批准"),
    ("for warranty, payment, and audit records", "用于保修、付款和审计记录"),
    ("the party identified in the contract, often the contractor", "由合同约定的责任方负责，通常为承包商"),
    ("form dimensions, reinforcement, and inspection status", "模板尺寸、钢筋配置和检查状态"),
    ("task-specific hazard assessment", "与任务相关的危险评估"),
    ("clear schedule of values and progress billing terms", "明确的工程量分解及进度付款条款"),
    ("inspector feedback, date, and corrective actions", "检查意见、日期和整改措施"),
    ("submit revisions and obtain approval", "提交修订并获得批准"),
    ("review plans with crews and confirm tolerances", "与施工班组复核图纸并确认允许偏差"),
    ("provide guardrails or approved personal fall arrest systems", "设置护栏或使用经批准的个人防坠系统"),
    ("to set expectations for scope and pricing adjustments", "用于明确范围与价格调整预期"),
    ("dated logs, photos, and correspondence", "有日期的日志、照片和书面往来"),
    ("complete required corrections and documentation", "完成必要整改并备齐文件"),
    ("it helps prevent service strikes and safety incidents", "有助于预防挖断管线和安全事故"),
    ("what should a contractor verify before starting work", "承包商在开工前应确认什么"),
    ("permits and contract scope", "施工许可与合同范围"),
    ("social media ads", "社交媒体广告"),
    ("team lunch menu", "团队午餐菜单"),
    ("background music volume", "背景音乐音量"),
    ("before construction starts", "开工前"),
    ("contract requirements and execution", "合同要求与执行"),
    ("bonds, insurance, and liens", "保证金、保险与留置权"),
    ("employment requirements", "雇佣要求"),
    ("licensing requirements", "执照要求"),
    ("business organization", "商业组织"),
    ("business finances", "商业财务"),
    ("general building updates", "建筑规范更新"),
    ("planning & estimating", "计划与预算"),
    ("planning and estimating", "计划与预算"),
    ("framing & structural", "结构与框架"),
    ("framing and structural", "结构与框架"),
    ("health & safety test", "健康与安全测试"),
    ("health and safety test", "健康与安全测试"),
    ("health and safety", "健康与安全"),
    ("change order", "变更订单"),
    ("public works", "公共工程"),
    ("general contractor", "总承包商"),
    ("core trades", "核心工种"),
    ("finish trades", "收尾工种"),
    ("which of the following", "以下哪项"),
    ("all of the above", "以上皆是"),
    ("none of the above", "以上皆非"),
]

EN_TO_ZH_WORDS = {
    "a": "",
    "an": "",
    "the": "",
    "and": "和",
    "or": "或",
    "of": "",
    "to": "",
    "for": "",
    "with": "与",
    "in": "在",
    "on": "在",
    "is": "是",
    "are": "是",
    "was": "是",
    "were": "是",
    "be": "为",
    "can": "可以",
    "must": "必须",
    "should": "应",
    "may": "可",
    "what": "什么",
    "which": "哪项",
    "when": "何时",
    "where": "哪里",
    "who": "谁",
    "why": "为什么",
    "how": "如何",
    "before": "之前",
    "after": "之后",
    "during": "期间",
    "first": "第一",
    "main": "主要",
    "key": "关键",
    "best": "最佳",
    "correct": "正确",
    "wrong": "错误",
    "not": "不",
    "no": "无",
    "yes": "是",
    "work": "施工",
    "start": "开工",
    "starts": "开工",
    "starting": "开工",
    "verify": "确认",
    "social": "社交",
    "media": "媒体",
    "ad": "广告",
    "ads": "广告",
    "team": "团队",
    "lunch": "午餐",
    "menu": "菜单",
    "background": "背景",
    "music": "音乐",
    "volume": "音量",
    "worker": "工人",
    "workers": "工人",
    "contract": "合同",
    "contractor": "承包商",
    "contractors": "承包商",
    "license": "执照",
    "licenses": "执照",
    "licensing": "执照",
    "exam": "考试",
    "examination": "考试",
    "project": "项目",
    "projects": "项目",
    "scope": "范围",
    "permit": "许可",
    "permits": "许可",
    "payment": "付款",
    "payments": "付款",
    "safety": "安全",
    "health": "健康",
    "insurance": "保险",
    "bond": "保证金",
    "bonds": "保证金",
    "lien": "留置权",
    "liens": "留置权",
    "public": "公共",
    "business": "商业",
    "organization": "组织",
    "finance": "财务",
    "finances": "财务",
    "employment": "雇佣",
    "requirements": "要求",
    "requirement": "要求",
    "planning": "计划",
    "estimating": "预算",
    "framing": "框架",
    "structural": "结构",
    "general": "综合",
    "building": "建筑",
    "updates": "更新",
    "update": "更新",
    "core": "核心",
    "compliance": "合规",
    "check": "检查",
    "checks": "检查",
    "construction": "施工",
    "electrical": "电气",
    "plumbing": "管道",
    "question": "问题",
    "questions": "问题",
    "answer": "答案",
    "answers": "答案",
    "explanation": "解析",
    "do": "做",
    "begin": "开始",
    "immediately": "立即",
    "save": "节省",
    "time": "时间",
    "hazard": "危险",
    "hazards": "危险",
    "control": "控制",
    "controls": "控制措施",
    "isolate": "隔离",
    "isolated": "隔离",
    "zone": "区域",
    "remove": "移除",
    "only": "仅",
    "visible": "可见的",
    "debris": "碎屑",
    "wait": "等待",
    "neighbors": "邻居",
    "approve": "批准",
    "item": "项目",
    "clearly": "明确地",
    "defined": "定义",
    "home": "住宅",
    "improvement": "改善",
    "favorite": "偏好",
    "tools": "工具",
    "supplier": "供应商",
    "policy": "政策",
    "weather": "天气",
    "forecast": "预报",
    "preference": "偏好",
    "typically": "通常",
    "required": "需要",
    "painting": "涂刷",
    "interior": "室内",
    "walls": "墙面",
    "alterations": "改造",
    "owner": "业主",
    "requests": "要求",
    "photos": "照片",
    "never": "从不",
    "residential": "住宅类",
    "jobs": "工程",
    "purpose": "作用",
    "daily": "每日",
    "job": "工地",
    "logs": "日志",
    "track": "记录",
    "progress": "进度",
    "events": "事件",
    "decisions": "决策",
    "replace": "替代",
    "signed": "签署的",
    "avoid": "避免",
    "communication": "沟通",
    "clients": "客户",
    "estimate": "估算",
    "unrelated": "无关的",
    "proper": "正确的",
    "site": "现场",
    "preparation": "准备",
    "skip": "跳过",
    "utility": "管线",
    "adjacent": "相邻的",
    "finishes": "成品面",
    "measurements": "尺寸",
    "order": "下单",
    "materials": "材料",
    "without": "不带",
    "plans": "图纸",
    "safest": "最安全",
    "way": "方式",
    "manage": "管理",
    "extension": "延长",
    "cords": "电线",
    "jobsite": "工地",
    "run": "穿过",
    "through": "通过",
    "standing": "积",
    "water": "水",
    "route": "布置",
    "secure": "固定",
    "reduce": "减少",
    "trip": "绊倒",
    "hide": "隐藏",
    "under": "在下方",
    "loose": "松散",
    "rugs": "地毯",
    "use": "使用",
    "damaged": "损坏的",
    "temporarily": "临时",
    "change": "变更",
    "handled": "处理",
    "verbal": "口头",
    "agreement": "协议",
    "written": "书面",
    "approval": "批准",
    "extra": "额外",
    "begins": "开始",
    "ignored": "忽略",
    "small": "小",
    "billed": "计费",
    "later": "之后",
    "notice": "通知",
    "material": "材料",
    "delivery": "到货",
    "receipts": "单据",
    "retained": "保留",
    "warranty": "保修",
    "audit": "审计",
    "records": "记录",
    "cards": "卡片",
    "scheduling": "安排",
    "inspections": "检查",
    "office": "办公室",
    "decoration": "装饰",
    "responsible": "负责",
    "obtaining": "办理",
    "party": "责任方",
    "identified": "指定",
    "often": "通常",
    "nearest": "最近的",
    "neighbor": "邻居",
    "concrete": "混凝土",
    "placement": "浇筑",
    "confirmed": "确认",
    "tool": "工具",
    "color": "颜色",
    "coordination": "协调",
    "form": "模板",
    "dimensions": "尺寸",
    "reinforcement": "钢筋",
    "inspection": "检查",
    "status": "状态",
    "next": "下一个",
    "month": "月",
    "personal": "个人",
    "protective": "防护",
    "equipment": "装备",
    "selection": "选择",
    "based": "基于",
    "task": "任务",
    "specific": "特定",
    "assessment": "评估",
    "brand": "品牌",
    "popularity": "受欢迎度",
    "price": "价格",
    "alone": "单独",
    "helps": "有助于",
    "disputes": "争议",
    "undefined": "未定义",
    "milestone": "里程碑",
    "dates": "日期",
    "clear": "清晰的",
    "schedule": "进度表",
    "values": "分解值",
    "billing": "计费",
    "terms": "条款",
    "invoicing": "开票",
    "random": "随机",
    "timing": "时点",
    "inspector": "检查员",
    "feedback": "反馈",
    "date": "日期",
    "corrective": "纠正",
    "actions": "措施",
    "nickname": "昵称",
    "crew": "班组",
    "attendance": "出勤",
    "changes": "变更",
    "approved": "已批准",
    "usually": "通常",
    "submit": "提交",
    "revisions": "修订",
    "erase": "删除",
    "old": "旧的",
    "notes": "备注",
    "delay": "延迟",
    "until": "直到",
    "closeout": "收尾",
    "preconstruction": "开工前",
    "supports": "支持",
    "quality": "质量",
    "pre": "前",
    "meetings": "会议",
    "review": "复核",
    "crews": "施工班组",
    "confirm": "确认",
    "tolerances": "允许偏差",
    "ignore": "忽略",
    "manufacturer": "厂家",
    "instructions": "说明",
    "fall": "坠落",
    "protection": "防护",
    "practice": "做法",
    "working": "作业",
    "height": "高处",
    "unprotected": "无防护",
    "edges": "边缘",
    "provide": "提供",
    "guardrails": "护栏",
    "arrest": "防坠",
    "systems": "系统",
    "rely": "依赖",
    "warnings": "提醒",
    "alone": "单独",
    "spotters": "监护员",
    "allowance": "暂定金额",
    "defined": "明确",
    "hide": "隐藏",
    "final": "最终",
    "cost": "成本",
    "impacts": "影响",
    "set": "设定",
    "expectations": "预期",
    "pricing": "计价",
    "adjustments": "调整",
    "remove": "移除",
    "documentation": "文件资料",
    "record": "记录",
    "best": "最佳",
    "supports": "支持",
    "claim": "索赔",
    "unverified": "未经验证",
    "memory": "记忆",
    "dated": "有日期的",
    "photos": "照片",
    "correspondence": "书面往来",
    "informal": "非正式",
    "hallway": "走廊",
    "conversation": "对话",
    "purchase": "采购",
    "preferences": "偏好",
    "requesting": "申请",
    "leave": "留下",
    "punch": "缺陷清单",
    "list": "清单",
    "unfinished": "未完成",
    "complete": "完成",
    "corrections": "整改",
    "close": "关闭",
    "files": "文件",
    "early": "提前",
    "locate": "定位",
    "verification": "核实",
    "critical": "关键",
    "excavation": "开挖",
    "optional": "可选",
    "prevent": "预防",
    "service": "管线服务",
    "strikes": "挖断",
    "incidents": "事故",
    "replaces": "替代",
    "trench": "沟槽",
    "affects": "影响",
    "landscaping": "园林",
    "demolition": "拆除",
    "occupied": "有人居住的",
    "true": "正确",
    "false": "错误",
}

CSV_OPTION_LETTERS = ("a", "b", "c", "d")

SIMPLE_IMPORT_REQUIRED_COLUMNS = (
    "question_id",
    "prompt",
    "option_a",
    "option_b",
    "option_c",
    "option_d",
    "answer",
)

FULL_IMPORT_OPTIONAL_COLUMNS = (
    "exam_code",
    "category_code",
    "prompt_zh",
    "option_a_zh",
    "option_b_zh",
    "option_c_zh",
    "option_d_zh",
    "explanation",
    "explanation_zh",
    "question_type",
    "difficulty",
    "tags",
    "key_points",
    "memory_trick",
)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def parse_iso_datetime(value: str | None) -> datetime | None:
    text = str(value or "").strip()
    if not text:
        return None
    if text.endswith("Z"):
        text = text[:-1] + "+00:00"
    try:
        dt = datetime.fromisoformat(text)
    except ValueError:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def normalize_expires_at(value: str | None) -> str | None:
    text = str(value or "").strip()
    if not text:
        return None
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", text):
        return f"{text}T23:59:59+00:00"
    dt = parse_iso_datetime(text)
    if not dt:
        return None
    return dt.isoformat()


def is_active_by_expiry(expires_at: str | None) -> bool:
    dt = parse_iso_datetime(expires_at)
    if not dt:
        return True  # no expiry set = perpetually active
    return dt > datetime.now(timezone.utc)


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 260000)
    return f"pbkdf2:sha256:260000:{salt}:{dk.hex()}"


def verify_password(password: str, stored: str) -> bool:
    if stored.startswith("pbkdf2:sha256:"):
        parts = stored.split(":")
        if len(parts) != 5:
            return False
        _, algo, iters, salt, hashed = parts
        dk = hashlib.pbkdf2_hmac(algo, password.encode(), salt.encode(), int(iters))
        return dk.hex() == hashed
    return password == stored  # legacy plain-text


def db_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def to_bool_int(value, default: int = 0) -> int:
    if value is None:
        return 1 if default else 0
    if isinstance(value, bool):
        return 1 if value else 0
    if isinstance(value, (int, float)):
        return 1 if value else 0
    text = str(value).strip().lower()
    if text in {"1", "true", "yes", "y", "on"}:
        return 1
    if text in {"0", "false", "no", "n", "off"}:
        return 0
    return 1 if default else 0


def to_int(value, default: int = 0) -> int:
    if value is None:
        return default
    if isinstance(value, bool):
        return 1 if value else 0
    if isinstance(value, int):
        return value
    text = str(value).strip()
    if not text:
        return default
    try:
        return int(text)
    except ValueError:
        return default


def normalize_account_status(value: str | None, default: str = "active") -> str:
    text = str(value or "").strip().lower()
    if text in ACCOUNT_STATUS_VALUES:
        return text
    return default if default in ACCOUNT_STATUS_VALUES else "active"


def normalize_membership_tier(value: str | None, default: str | None = "free") -> str:
    text = str(value or "").strip().lower()
    alias = {
        "basic": "basic_399",
        "pro": "pro_599",
        "ai": "ai_999",
        "paid": "pro_599",
    }
    text = alias.get(text, text)
    if text in MEMBERSHIP_TIERS:
        return text
    if default is None:
        return ""
    return default if default in MEMBERSHIP_TIERS else "free"


def plan_from_membership_tier(tier: str) -> str:
    return TIER_TO_PLAN.get(normalize_membership_tier(tier), "free")


def is_paid_membership_tier(tier: str) -> bool:
    return normalize_membership_tier(tier) in PAID_MEMBERSHIP_TIERS


def membership_tier_rank(tier: str) -> int:
    normalized = normalize_membership_tier(tier, "free")
    ranks = {
        "free": 0,
        "basic_399": 1,
        "pro_599": 2,
        "ai_999": 3,
    }
    return ranks.get(normalized, 0)


def membership_tier_allows(user_tier: str, required_tier: str | None) -> bool:
    required = normalize_membership_tier(required_tier, "")
    if not required:
        return True
    return membership_tier_rank(user_tier) >= membership_tier_rank(required)


def infer_membership_tier(
    *,
    plan: str,
    bilingual_access: int | bool = 0,
    ai_access: int | bool = 0,
    current_tier: str | None = None,
) -> str:
    normalized_current = normalize_membership_tier(current_tier, "free")
    normalized_plan = "paid" if str(plan or "").strip().lower() == "paid" else "free"
    if normalized_plan != "paid":
        return "free"
    if to_bool_int(ai_access, 0):
        return "ai_999"
    if to_bool_int(bilingual_access, 0):
        return "pro_599"
    if normalized_current in PAID_MEMBERSHIP_TIERS:
        return normalized_current
    return "basic_399"


def entitlement_defaults_for_tier(tier: str) -> tuple[int, int, int, int]:
    normalized = normalize_membership_tier(tier, "free")
    if normalized == "free":
        return (0, 0, 0, 0)
    if normalized == "basic_399":
        return (1, 1, 0, 0)
    if normalized == "pro_599":
        return (1, 1, 1, 0)
    if normalized == "ai_999":
        return (1, 1, 1, 1)
    return (0, 0, 0, 0)


def entitlement_defaults_for_plan(plan: str) -> tuple[int, int, int]:
    b, c, bi, _ = entitlement_defaults_for_tier(infer_membership_tier(plan=plan))
    return (b, c, bi)


def content_permission_defaults_for_tier(tier: str) -> dict[str, bool]:
    normalized = normalize_membership_tier(tier, "free")
    if normalized == "ai_999":
        return {
            "bilingualEnabled": True,
            "explanationEnabled": True,
            "memoryTipsEnabled": True,
        }
    if normalized == "pro_599":
        return {
            "bilingualEnabled": True,
            "explanationEnabled": False,
            "memoryTipsEnabled": False,
        }
    return {
        "bilingualEnabled": False,
        "explanationEnabled": False,
        "memoryTipsEnabled": False,
    }


def normalize_optional_bool_override(value, *, strict: bool = False) -> int | None:
    if value is None:
        return None
    if isinstance(value, bool):
        return 1 if value else 0
    if isinstance(value, (int, float)):
        return 1 if int(value) != 0 else 0
    text = clean_text(value).lower()
    if not text or text in {"default", "inherit", "auto"}:
        return None
    if text in {"1", "true", "yes", "y", "on", "enabled"}:
        return 1
    if text in {"0", "false", "no", "n", "off", "disabled"}:
        return 0
    if strict:
        raise ValueError("权限覆盖值非法")
    return None


def compute_content_permissions(
    *,
    membership_tier: str,
    bilingual_override=None,
    explanation_override=None,
    memory_tips_override=None,
) -> tuple[dict[str, bool], dict[str, bool | None]]:
    defaults = content_permission_defaults_for_tier(membership_tier)
    override_values = {
        "bilingualEnabled": normalize_optional_bool_override(bilingual_override),
        "explanationEnabled": normalize_optional_bool_override(explanation_override),
        "memoryTipsEnabled": normalize_optional_bool_override(memory_tips_override),
    }
    effective = {
        key: bool(defaults[key]) if override_values[key] is None else bool(override_values[key])
        for key in CONTENT_PERMISSION_KEYS
    }
    overrides = {
        key: (None if override_values[key] is None else bool(override_values[key]))
        for key in CONTENT_PERMISSION_KEYS
    }
    return effective, overrides


def compute_entitlement_state(has_access: int | bool, expires_at: str | None) -> tuple[bool, bool]:
    enabled = bool(has_access)
    active = enabled and is_active_by_expiry(expires_at)
    expired = enabled and not active
    return active, expired


def row_to_entitlements(row: sqlite3.Row | None, *, plan: str, membership_tier: str = "free") -> dict:
    normalized_tier = normalize_membership_tier(membership_tier, infer_membership_tier(plan=plan))
    if row:
        bilingual_active, _ = compute_entitlement_state(row["bilingual_access"], row["bilingual_expires_at"])
        ai_active, _ = compute_entitlement_state(
            row["ai_access"] if "ai_access" in row.keys() else 0,
            row["ai_expires_at"] if "ai_expires_at" in row.keys() else None,
        )
        return {
            "bLicenseAccess": bool(row["b_license_access"]),
            "cLicenseAccess": bool(row["c_license_access"]),
            "bilingualAccess": bilingual_active,
            "aiAccess": ai_active,
        }
    default_b, default_c, default_bi, default_ai = entitlement_defaults_for_tier(normalized_tier)
    return {
        "bLicenseAccess": bool(default_b),
        "cLicenseAccess": bool(default_c),
        "bilingualAccess": bool(default_bi),
        "aiAccess": bool(default_ai),
    }


def ensure_wrong_book_columns(conn: sqlite3.Connection) -> None:
    """错题本连对计数列：连续答对 WRONG_BOOK_REMOVE_STREAK 次才移出错题本。"""
    columns = {row["name"] for row in conn.execute("PRAGMA table_info(wrong_book)").fetchall()}
    if "correct_streak" not in columns:
        conn.execute("ALTER TABLE wrong_book ADD COLUMN correct_streak INTEGER NOT NULL DEFAULT 0")


def ensure_user_membership_columns(conn: sqlite3.Connection) -> None:
    columns = {row["name"] for row in conn.execute("PRAGMA table_info(users)").fetchall()}
    if "membership_version" not in columns:
        conn.execute("ALTER TABLE users ADD COLUMN membership_version INTEGER NOT NULL DEFAULT 1")
    if "membership_updated_at" not in columns:
        conn.execute("ALTER TABLE users ADD COLUMN membership_updated_at TEXT")
    if "account_status" not in columns:
        conn.execute("ALTER TABLE users ADD COLUMN account_status TEXT NOT NULL DEFAULT 'active'")
    if "membership_tier" not in columns:
        conn.execute("ALTER TABLE users ADD COLUMN membership_tier TEXT NOT NULL DEFAULT 'free'")
    if "bilingual_enabled" not in columns:
        conn.execute("ALTER TABLE users ADD COLUMN bilingual_enabled INTEGER")
    if "explanation_enabled" not in columns:
        conn.execute("ALTER TABLE users ADD COLUMN explanation_enabled INTEGER")
    if "memory_tips_enabled" not in columns:
        conn.execute("ALTER TABLE users ADD COLUMN memory_tips_enabled INTEGER")

    conn.execute("UPDATE users SET membership_version = COALESCE(membership_version, 1)")
    conn.execute(
        """
        UPDATE users
        SET membership_updated_at = COALESCE(membership_updated_at, created_at, ?)
        """,
        (now_iso(),),
    )
    conn.execute(
        """
        UPDATE users
        SET account_status = CASE
          WHEN account_status IS NULL OR TRIM(account_status) = '' THEN 'active'
          WHEN LOWER(TRIM(account_status)) NOT IN ('active','suspended') THEN 'active'
          ELSE LOWER(TRIM(account_status))
        END
        """
    )
    conn.execute(
        """
        UPDATE users
        SET membership_tier = CASE
          WHEN membership_tier IS NULL OR TRIM(membership_tier) = '' THEN
            CASE WHEN plan = 'paid' THEN 'pro_599' ELSE 'free' END
          WHEN LOWER(TRIM(membership_tier)) NOT IN ('free','basic_399','pro_599','ai_999') THEN
            CASE WHEN plan = 'paid' THEN 'pro_599' ELSE 'free' END
          ELSE LOWER(TRIM(membership_tier))
        END
        """
    )
    for column in ("bilingual_enabled", "explanation_enabled", "memory_tips_enabled"):
        conn.execute(
            f"""
            UPDATE users
            SET {column} = CASE
              WHEN {column} IS NULL THEN NULL
              WHEN {column} IN (0,1) THEN {column}
              WHEN LOWER(TRIM(CAST({column} AS TEXT))) IN ('1','true','yes','y','on','enabled') THEN 1
              WHEN LOWER(TRIM(CAST({column} AS TEXT))) IN ('0','false','no','n','off','disabled') THEN 0
              ELSE NULL
            END
            """
        )


def infer_assigned_exam_codes_for_user(
    conn: sqlite3.Connection,
    *,
    user_id: int,
    plan: str,
) -> list[str]:
    assigned: list[str] = []
    row = conn.execute(
        """
        SELECT
          COALESCE(MAX(CASE WHEN category_key = 'b_license' AND has_access = 1 THEN 1 ELSE 0 END), 0) AS has_b,
          COALESCE(MAX(CASE WHEN category_key = 'c_license' AND has_access = 1 THEN 1 ELSE 0 END), 0) AS has_c
        FROM user_category_entitlements
        WHERE user_id = ?
        """,
        (user_id,),
    ).fetchone()
    has_b = int(row["has_b"] or 0) == 1 if row else False
    has_c = int(row["has_c"] or 0) == 1 if row else False
    if has_b:
        assigned.extend(["LAW_BUSINESS", "B_GENERAL"])
    if has_c:
        assigned.extend(["LAW_BUSINESS", "C_LICENSE"])
    if not assigned:
        if plan == "paid":
            assigned = ["LAW_BUSINESS", "B_GENERAL"]
        else:
            assigned = ["LAW_BUSINESS"]
    return normalize_assignment_exam_code_list(assigned)


def ensure_user_profile_columns(conn: sqlite3.Connection) -> None:
    ensure_user_membership_columns(conn)
    ensure_user_category_entitlement_columns(conn)
    columns = {row["name"] for row in conn.execute("PRAGMA table_info(users)").fetchall()}
    if "nickname" not in columns:
        conn.execute("ALTER TABLE users ADD COLUMN nickname TEXT NOT NULL DEFAULT ''")
    if "phone" not in columns:
        conn.execute("ALTER TABLE users ADD COLUMN phone TEXT NOT NULL DEFAULT ''")
    if "assigned_exam_codes" not in columns:
        conn.execute("ALTER TABLE users ADD COLUMN assigned_exam_codes TEXT NOT NULL DEFAULT '[]'")
    if "assigned_module_tags" not in columns:
        conn.execute("ALTER TABLE users ADD COLUMN assigned_module_tags TEXT NOT NULL DEFAULT '[]'")

    conn.execute(
        """
        UPDATE users
        SET nickname = CASE
          WHEN nickname IS NULL THEN ''
          ELSE TRIM(nickname)
        END,
            phone = CASE
          WHEN phone IS NULL THEN ''
          ELSE TRIM(phone)
        END
        """
    )

    rows = conn.execute("SELECT id, plan, assigned_exam_codes FROM users").fetchall()
    for row in rows:
        raw_codes = clean_text(row["assigned_exam_codes"])
        parsed = normalize_assignment_exam_code_list(raw_codes)
        if parsed:
            normalized = dump_assignment_exam_code_list(parsed)
            if raw_codes != normalized:
                conn.execute(
                    "UPDATE users SET assigned_exam_codes = ? WHERE id = ?",
                    (normalized, int(row["id"])),
                )
            continue
        inferred = infer_assigned_exam_codes_for_user(
            conn,
            user_id=int(row["id"]),
            plan=clean_text(row["plan"]).lower() or "free",
        )
        conn.execute(
            "UPDATE users SET assigned_exam_codes = ? WHERE id = ?",
            (dump_assignment_exam_code_list(inferred), int(row["id"])),
        )
    conn.execute(
        """
        UPDATE users
        SET assigned_module_tags = CASE
          WHEN assigned_module_tags IS NULL OR TRIM(assigned_module_tags) = '' THEN '[]'
          ELSE assigned_module_tags
        END
        """
    )


def ensure_dashboard_modules_table(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS dashboard_modules (
          module_code TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          title_zh TEXT,
          module_type TEXT NOT NULL,
          description TEXT,
          icon TEXT,
          is_active INTEGER NOT NULL DEFAULT 1,
          sort_order INTEGER NOT NULL DEFAULT 100,
          visible_for_exam_codes TEXT NOT NULL DEFAULT '[]',
          visible_for_membership_tiers TEXT NOT NULL DEFAULT '[]',
          route_type TEXT NOT NULL DEFAULT 'internal_page',
          route_target TEXT NOT NULL DEFAULT '',
          linked_exam_code TEXT,
          linked_category_code TEXT,
          badge_text TEXT,
          is_placeholder INTEGER NOT NULL DEFAULT 0,
          settings_json TEXT NOT NULL DEFAULT '{}',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
        """
    )

    count_row = conn.execute("SELECT COUNT(1) AS cnt FROM dashboard_modules").fetchone()
    count = int(count_row["cnt"] or 0) if count_row else 0
    setting_row = conn.execute(
        "SELECT value FROM settings WHERE key = ?",
        (DEFAULT_DASHBOARD_MODULES_BOOTSTRAP_SETTING_KEY,),
    ).fetchone()
    bootstrapped = setting_row and clean_text(setting_row["value"]) == "1"

    if count == 0 and not bootstrapped:
        now = now_iso()
        for item in DEFAULT_DASHBOARD_MODULES:
            conn.execute(
                """
                INSERT OR IGNORE INTO dashboard_modules(
                  module_code, title, title_zh, module_type, description, icon,
                  is_active, sort_order, visible_for_exam_codes, visible_for_membership_tiers,
                  route_type, route_target, linked_exam_code, linked_category_code,
                  badge_text, is_placeholder, settings_json, created_at, updated_at
                )
                VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                """,
                (
                    clean_text(item.get("module_code")),
                    clean_text(item.get("title")),
                    clean_text(item.get("title_zh")),
                    clean_text(item.get("module_type")),
                    clean_text(item.get("description")),
                    clean_text(item.get("icon")),
                    to_bool_int(item.get("is_active"), 1),
                    to_int(item.get("sort_order"), 100),
                    dump_assignment_exam_code_list(item.get("visible_for_exam_codes")),
                    dump_membership_visibility_list(item.get("visible_for_membership_tiers")),
                    clean_text(item.get("route_type")) or "internal_page",
                    clean_text(item.get("route_target")),
                    normalize_exam_code(item.get("linked_exam_code")),
                    clean_text(item.get("linked_category_code")).upper(),
                    clean_text(item.get("badge_text")),
                    to_bool_int(item.get("is_placeholder"), 0),
                    json.dumps(item.get("settings_json") or {}, ensure_ascii=False),
                    now,
                    now,
                ),
            )
        conn.execute(
            """
            INSERT INTO settings(key, value, updated_at)
            VALUES(?,?,?)
            ON CONFLICT(key) DO UPDATE SET
              value=excluded.value,
              updated_at=excluded.updated_at
            """,
            (DEFAULT_DASHBOARD_MODULES_BOOTSTRAP_SETTING_KEY, "1", now_iso()),
        )

    # normalize stored JSON-like fields
    rows = conn.execute(
        """
        SELECT module_code, visible_for_exam_codes, visible_for_membership_tiers, settings_json
        FROM dashboard_modules
        """
    ).fetchall()
    for row in rows:
        exam_codes = dump_assignment_exam_code_list(row["visible_for_exam_codes"])
        tiers = dump_membership_visibility_list(row["visible_for_membership_tiers"])
        settings_json = json.dumps(normalize_json_obj(row["settings_json"]), ensure_ascii=False)
        conn.execute(
            """
            UPDATE dashboard_modules
            SET visible_for_exam_codes = ?, visible_for_membership_tiers = ?, settings_json = ?
            WHERE module_code = ?
            """,
            (exam_codes, tiers, settings_json, clean_text(row["module_code"])),
        )


def ensure_licensing_progress_table(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS licensing_progress (
          user_id INTEGER PRIMARY KEY,
          enrolled INTEGER NOT NULL DEFAULT 1,
          application_number TEXT,
          application_submitted INTEGER NOT NULL DEFAULT 0,
          application_submitted_at TEXT,
          study_started INTEGER NOT NULL DEFAULT 0,
          study_progress_percent INTEGER NOT NULL DEFAULT 0,
          exam_date TEXT,
          exam_scheduled INTEGER NOT NULL DEFAULT 0,
          exam_passed INTEGER NOT NULL DEFAULT 0,
          exam_passed_at TEXT,
          notes TEXT,
          updated_by_admin INTEGER NOT NULL DEFAULT 0,
          updated_at TEXT NOT NULL,
          FOREIGN KEY(user_id) REFERENCES users(id)
        )
        """
    )
    conn.execute(
        """
        INSERT OR IGNORE INTO licensing_progress(user_id, updated_at)
        SELECT id, ? FROM users
        """,
        (now_iso(),),
    )


def ensure_course_contents_table(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS course_contents (
          content_code TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          content_type TEXT NOT NULL,
          linked_exam_code TEXT,
          is_active INTEGER NOT NULL DEFAULT 0,
          sort_order INTEGER NOT NULL DEFAULT 100,
          description TEXT,
          thumbnail TEXT,
          access_tier TEXT,
          is_placeholder INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
        """
    )
    count_row = conn.execute("SELECT COUNT(1) AS cnt FROM course_contents").fetchone()
    count = int(count_row["cnt"] or 0) if count_row else 0
    setting_row = conn.execute(
        "SELECT value FROM settings WHERE key = ?",
        (DEFAULT_COURSE_CONTENTS_BOOTSTRAP_SETTING_KEY,),
    ).fetchone()
    bootstrapped = setting_row and clean_text(setting_row["value"]) == "1"
    if count == 0 and not bootstrapped:
        now = now_iso()
        for item in DEFAULT_COURSE_CONTENTS:
            conn.execute(
                """
                INSERT OR IGNORE INTO course_contents(
                  content_code, title, content_type, linked_exam_code, is_active, sort_order,
                  description, thumbnail, access_tier, is_placeholder, created_at, updated_at
                )
                VALUES(?,?,?,?,?,?,?,?,?,?,?,?)
                """,
                (
                    clean_text(item.get("content_code")),
                    clean_text(item.get("title")),
                    clean_text(item.get("content_type")),
                    normalize_exam_code(item.get("linked_exam_code")),
                    to_bool_int(item.get("is_active"), 0),
                    to_int(item.get("sort_order"), 100),
                    clean_text(item.get("description")),
                    clean_text(item.get("thumbnail")),
                    normalize_membership_tier(item.get("access_tier"), "") if clean_text(item.get("access_tier")) else "",
                    to_bool_int(item.get("is_placeholder"), 1),
                    now,
                    now,
                ),
            )
        conn.execute(
            """
            INSERT INTO settings(key, value, updated_at)
            VALUES(?,?,?)
            ON CONFLICT(key) DO UPDATE SET
              value=excluded.value,
              updated_at=excluded.updated_at
            """,
            (DEFAULT_COURSE_CONTENTS_BOOTSTRAP_SETTING_KEY, "1", now_iso()),
        )


def normalize_dashboard_module_row(row: sqlite3.Row) -> dict:
    return {
        "moduleCode": clean_text(row["module_code"]),
        "title": clean_text(row["title"]),
        "titleZh": clean_text(row["title_zh"]),
        "moduleType": clean_text(row["module_type"]),
        "description": clean_text(row["description"]),
        "icon": clean_text(row["icon"]),
        "isActive": bool(row["is_active"]),
        "sortOrder": int(row["sort_order"] or 100),
        "visibleForExamCodes": normalize_assignment_exam_code_list(row["visible_for_exam_codes"]),
        "visibleForMembershipTiers": normalize_membership_visibility_list(row["visible_for_membership_tiers"]),
        "routeType": clean_text(row["route_type"]),
        "routeTarget": clean_text(row["route_target"]),
        "linkedExamCode": normalize_exam_code(row["linked_exam_code"]),
        "linkedCategoryCode": clean_text(row["linked_category_code"]).upper(),
        "badgeText": clean_text(row["badge_text"]),
        "isPlaceholder": bool(row["is_placeholder"]),
        "settings": normalize_json_obj(row["settings_json"]),
        "updatedAt": clean_text(row["updated_at"]),
    }


def list_dashboard_modules(conn: sqlite3.Connection, *, active_only: bool = False) -> list[dict]:
    ensure_dashboard_modules_table(conn)
    where_sql = "WHERE is_active = 1" if active_only else ""
    rows = conn.execute(
        f"""
        SELECT
          module_code, title, title_zh, module_type, description, icon, is_active, sort_order,
          visible_for_exam_codes, visible_for_membership_tiers, route_type, route_target,
          linked_exam_code, linked_category_code, badge_text, is_placeholder, settings_json, updated_at
        FROM dashboard_modules
        {where_sql}
        ORDER BY sort_order ASC, module_code ASC
        """
    ).fetchall()
    return [normalize_dashboard_module_row(row) for row in rows]


def normalize_licensing_progress_row(row: sqlite3.Row | None) -> dict:
    if not row:
        return {
            "enrolled": True,
            "applicationNumber": "",
            "applicationSubmitted": False,
            "applicationSubmittedAt": "",
            "studyStarted": False,
            "studyProgressPercent": 0,
            "examDate": "",
            "examScheduled": False,
            "examPassed": False,
            "examPassedAt": "",
            "notes": "",
            "updatedByAdmin": False,
            "updatedAt": "",
        }
    return {
        "enrolled": bool(row["enrolled"]),
        "applicationNumber": clean_text(row["application_number"]),
        "applicationSubmitted": bool(row["application_submitted"]),
        "applicationSubmittedAt": clean_text(row["application_submitted_at"]),
        "studyStarted": bool(row["study_started"]),
        "studyProgressPercent": max(0, min(100, to_int(row["study_progress_percent"], 0))),
        "examDate": clean_text(row["exam_date"]),
        "examScheduled": bool(row["exam_scheduled"]),
        "examPassed": bool(row["exam_passed"]),
        "examPassedAt": clean_text(row["exam_passed_at"]),
        "notes": clean_text(row["notes"]),
        "updatedByAdmin": bool(row["updated_by_admin"]),
        "updatedAt": clean_text(row["updated_at"]),
    }


def get_user_licensing_progress(conn: sqlite3.Connection, user_id: int) -> dict:
    ensure_licensing_progress_table(conn)
    row = conn.execute(
        """
        SELECT
          enrolled, application_number, application_submitted, application_submitted_at,
          study_started, study_progress_percent, exam_date, exam_scheduled,
          exam_passed, exam_passed_at, notes, updated_by_admin, updated_at
        FROM licensing_progress
        WHERE user_id = ?
        """,
        (user_id,),
    ).fetchone()
    return normalize_licensing_progress_row(row)


def upsert_user_licensing_progress(
    conn: sqlite3.Connection,
    *,
    user_id: int,
    payload: dict,
    updated_by_admin: bool,
) -> dict:
    ensure_licensing_progress_table(conn)
    current = get_user_licensing_progress(conn, user_id)

    enrolled = to_bool_int(payload.get("enrolled"), int(current["enrolled"]))
    application_number = clean_text(
        payload.get("applicationNumber")
        if "applicationNumber" in payload
        else payload.get("application_number")
        if "application_number" in payload
        else current["applicationNumber"]
    )[:128]
    application_submitted = to_bool_int(
        payload.get("applicationSubmitted")
        if "applicationSubmitted" in payload
        else payload.get("application_submitted")
        if "application_submitted" in payload
        else int(current["applicationSubmitted"]),
        int(current["applicationSubmitted"]),
    )
    if application_number and not application_submitted:
        application_submitted = 1
    application_submitted_at = clean_text(
        payload.get("applicationSubmittedAt")
        if "applicationSubmittedAt" in payload
        else payload.get("application_submitted_at")
        if "application_submitted_at" in payload
        else current["applicationSubmittedAt"]
    )
    if application_submitted and not application_submitted_at:
        application_submitted_at = now_iso()
    if not application_submitted:
        application_submitted_at = ""

    study_started = to_bool_int(
        payload.get("studyStarted")
        if "studyStarted" in payload
        else payload.get("study_started")
        if "study_started" in payload
        else int(current["studyStarted"]),
        int(current["studyStarted"]),
    )
    study_progress_percent = max(
        0,
        min(
            100,
            to_int(
                payload.get("studyProgressPercent")
                if "studyProgressPercent" in payload
                else payload.get("study_progress_percent")
                if "study_progress_percent" in payload
                else current["studyProgressPercent"],
                int(current["studyProgressPercent"]),
            ),
        ),
    )
    exam_date = clean_text(payload.get("examDate") if "examDate" in payload else payload.get("exam_date") if "exam_date" in payload else current["examDate"])[:64]
    exam_scheduled = to_bool_int(
        payload.get("examScheduled")
        if "examScheduled" in payload
        else payload.get("exam_scheduled")
        if "exam_scheduled" in payload
        else int(current["examScheduled"]),
        int(current["examScheduled"]),
    )
    if exam_date and not exam_scheduled:
        exam_scheduled = 1
    exam_passed = to_bool_int(
        payload.get("examPassed")
        if "examPassed" in payload
        else payload.get("exam_passed")
        if "exam_passed" in payload
        else int(current["examPassed"]),
        int(current["examPassed"]),
    )
    exam_passed_at = clean_text(
        payload.get("examPassedAt")
        if "examPassedAt" in payload
        else payload.get("exam_passed_at")
        if "exam_passed_at" in payload
        else current["examPassedAt"]
    )
    if exam_passed and not exam_passed_at:
        exam_passed_at = now_iso()
    if not exam_passed:
        exam_passed_at = ""

    notes = clean_text(payload.get("notes") if "notes" in payload else current["notes"])[:2000]
    now = now_iso()

    conn.execute(
        """
        INSERT INTO licensing_progress(
          user_id, enrolled, application_number, application_submitted, application_submitted_at,
          study_started, study_progress_percent, exam_date, exam_scheduled, exam_passed,
          exam_passed_at, notes, updated_by_admin, updated_at
        )
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT(user_id) DO UPDATE SET
          enrolled=excluded.enrolled,
          application_number=excluded.application_number,
          application_submitted=excluded.application_submitted,
          application_submitted_at=excluded.application_submitted_at,
          study_started=excluded.study_started,
          study_progress_percent=excluded.study_progress_percent,
          exam_date=excluded.exam_date,
          exam_scheduled=excluded.exam_scheduled,
          exam_passed=excluded.exam_passed,
          exam_passed_at=excluded.exam_passed_at,
          notes=excluded.notes,
          updated_by_admin=excluded.updated_by_admin,
          updated_at=excluded.updated_at
        """,
        (
            user_id,
            enrolled,
            application_number,
            application_submitted,
            application_submitted_at or None,
            study_started,
            study_progress_percent,
            exam_date or None,
            exam_scheduled,
            exam_passed,
            exam_passed_at or None,
            notes,
            1 if updated_by_admin else 0,
            now,
        ),
    )
    return get_user_licensing_progress(conn, user_id)


def normalize_course_content_row(row: sqlite3.Row) -> dict:
    return {
        "contentCode": clean_text(row["content_code"]),
        "title": clean_text(row["title"]),
        "contentType": clean_text(row["content_type"]),
        "linkedExamCode": normalize_exam_code(row["linked_exam_code"]),
        "isActive": bool(row["is_active"]),
        "sortOrder": int(row["sort_order"] or 100),
        "description": clean_text(row["description"]),
        "thumbnail": clean_text(row["thumbnail"]),
        "accessTier": normalize_membership_tier(row["access_tier"], "") if clean_text(row["access_tier"]) else "",
        "isPlaceholder": bool(row["is_placeholder"]),
        "updatedAt": clean_text(row["updated_at"]),
    }


def list_course_contents(conn: sqlite3.Connection, *, active_only: bool = False) -> list[dict]:
    ensure_course_contents_table(conn)
    where_sql = "WHERE is_active = 1" if active_only else ""
    rows = conn.execute(
        f"""
        SELECT
          content_code, title, content_type, linked_exam_code, is_active, sort_order,
          description, thumbnail, access_tier, is_placeholder, updated_at
        FROM course_contents
        {where_sql}
        ORDER BY sort_order ASC, content_code ASC
        """
    ).fetchall()
    return [normalize_course_content_row(row) for row in rows]


def should_show_module_for_user(module: dict, *, assigned_exam_codes: list[str], membership_tier: str) -> bool:
    if not module.get("isActive"):
        return False
    visible_codes = normalize_assignment_exam_code_list(module.get("visibleForExamCodes"))
    if visible_codes:
        assigned_set = set(normalize_assignment_exam_code_list(assigned_exam_codes))
        if not assigned_set.intersection(visible_codes):
            return False
    visible_tiers = normalize_membership_visibility_list(module.get("visibleForMembershipTiers"))
    if visible_tiers and normalize_membership_tier(membership_tier, "free") not in visible_tiers:
        return False
    return True


def normalize_module_payload_for_write(data: dict, current: dict | None = None) -> dict:
    current = current or {}
    module_code = clean_text(data.get("moduleCode") if "moduleCode" in data else data.get("module_code") if "module_code" in data else current.get("moduleCode"))
    module_code = module_code.lower().replace("-", "_")
    module_code = re.sub(r"[^a-z0-9_]", "", module_code)
    title = clean_text(data.get("title") if "title" in data else current.get("title"))
    title_zh = clean_text(data.get("titleZh") if "titleZh" in data else data.get("title_zh") if "title_zh" in data else current.get("titleZh"))
    module_type = clean_text(data.get("moduleType") if "moduleType" in data else data.get("module_type") if "module_type" in data else current.get("moduleType"))
    module_type = module_type.lower().strip()
    description = clean_text(data.get("description") if "description" in data else current.get("description"))
    icon = clean_text(data.get("icon") if "icon" in data else current.get("icon"))
    is_active = to_bool_int(data.get("isActive"), int(current.get("isActive", True)))
    sort_order = to_int(data.get("sortOrder"), int(current.get("sortOrder", 100)))
    visible_for_exam_codes = normalize_assignment_exam_code_list(
        data.get("visibleForExamCodes")
        if "visibleForExamCodes" in data
        else data.get("visible_for_exam_codes")
        if "visible_for_exam_codes" in data
        else current.get("visibleForExamCodes")
    )
    visible_for_membership_tiers = normalize_membership_visibility_list(
        data.get("visibleForMembershipTiers")
        if "visibleForMembershipTiers" in data
        else data.get("visible_for_membership_tiers")
        if "visible_for_membership_tiers" in data
        else current.get("visibleForMembershipTiers")
    )
    route_type = clean_text(data.get("routeType") if "routeType" in data else data.get("route_type") if "route_type" in data else current.get("routeType"))
    route_type = route_type.lower().strip() or "internal_page"
    route_target = clean_text(data.get("routeTarget") if "routeTarget" in data else data.get("route_target") if "route_target" in data else current.get("routeTarget"))
    linked_exam_code = normalize_exam_code(
        data.get("linkedExamCode")
        if "linkedExamCode" in data
        else data.get("linked_exam_code")
        if "linked_exam_code" in data
        else current.get("linkedExamCode")
    )
    linked_category_code = clean_text(
        data.get("linkedCategoryCode")
        if "linkedCategoryCode" in data
        else data.get("linked_category_code")
        if "linked_category_code" in data
        else current.get("linkedCategoryCode")
    ).upper()
    badge_text = clean_text(data.get("badgeText") if "badgeText" in data else data.get("badge_text") if "badge_text" in data else current.get("badgeText"))
    is_placeholder = to_bool_int(data.get("isPlaceholder"), int(current.get("isPlaceholder", False)))
    settings = normalize_json_obj(data.get("settings") if "settings" in data else data.get("settings_json") if "settings_json" in data else current.get("settings"))

    if not re.fullmatch(r"[a-z][a-z0-9_]{1,63}", module_code):
        raise ValueError("module_code 非法")
    if len(title) < 2:
        raise ValueError("模块标题至少2个字符")
    if module_type not in MODULE_TYPE_VALUES:
        raise ValueError("module_type 非法")
    if route_type not in ROUTE_TYPE_VALUES:
        raise ValueError("route_type 非法")

    return {
        "moduleCode": module_code,
        "title": title,
        "titleZh": title_zh,
        "moduleType": module_type,
        "description": description,
        "icon": icon,
        "isActive": is_active,
        "sortOrder": sort_order,
        "visibleForExamCodes": visible_for_exam_codes,
        "visibleForMembershipTiers": visible_for_membership_tiers,
        "routeType": route_type,
        "routeTarget": route_target,
        "linkedExamCode": linked_exam_code,
        "linkedCategoryCode": linked_category_code,
        "badgeText": badge_text,
        "isPlaceholder": is_placeholder,
        "settings": settings,
    }


def normalize_course_content_payload_for_write(data: dict, current: dict | None = None) -> dict:
    current = current or {}
    content_code = clean_text(
        data.get("contentCode")
        if "contentCode" in data
        else data.get("content_code")
        if "content_code" in data
        else current.get("contentCode")
    )
    content_code = content_code.lower().replace("-", "_")
    content_code = re.sub(r"[^a-z0-9_]", "", content_code)
    title = clean_text(data.get("title") if "title" in data else current.get("title"))
    content_type = clean_text(
        data.get("contentType")
        if "contentType" in data
        else data.get("content_type")
        if "content_type" in data
        else current.get("contentType")
    ).lower()
    linked_exam_code = normalize_exam_code(
        data.get("linkedExamCode")
        if "linkedExamCode" in data
        else data.get("linked_exam_code")
        if "linked_exam_code" in data
        else current.get("linkedExamCode")
    )
    is_active = to_bool_int(data.get("isActive"), int(current.get("isActive", False)))
    sort_order = to_int(data.get("sortOrder"), int(current.get("sortOrder", 100)))
    description = clean_text(data.get("description") if "description" in data else current.get("description"))
    thumbnail = clean_text(data.get("thumbnail") if "thumbnail" in data else current.get("thumbnail"))
    access_tier_raw = (
        data.get("accessTier")
        if "accessTier" in data
        else data.get("access_tier")
        if "access_tier" in data
        else current.get("accessTier")
    )
    access_tier = normalize_membership_tier(access_tier_raw, "") if clean_text(access_tier_raw) else ""
    is_placeholder = to_bool_int(data.get("isPlaceholder"), int(current.get("isPlaceholder", True)))

    if not re.fullmatch(r"[a-z][a-z0-9_]{1,63}", content_code):
        raise ValueError("content_code 非法")
    if len(title) < 2:
        raise ValueError("课程标题至少2个字符")
    if content_type not in COURSE_CONTENT_TYPE_VALUES:
        raise ValueError("content_type 非法，仅支持 video/audio/live")
    if access_tier and access_tier not in MEMBERSHIP_VISIBILITY_VALUES:
        raise ValueError("access_tier 非法")

    return {
        "contentCode": content_code,
        "title": title,
        "contentType": content_type,
        "linkedExamCode": linked_exam_code,
        "isActive": is_active,
        "sortOrder": sort_order,
        "description": description,
        "thumbnail": thumbnail,
        "accessTier": access_tier,
        "isPlaceholder": is_placeholder,
    }


def derive_assignment_exam_codes_for_exam(exam: dict) -> set[str]:
    out: set[str] = set()
    if not isinstance(exam, dict):
        return out
    direct_codes = [
        exam.get("examCode"),
        exam.get("id"),
        exam.get("examFamilyKey"),
        exam.get("licenseGroup"),
        exam.get("specializationCode"),
        exam.get("tradeCode"),
    ]
    for value in direct_codes:
        code = normalize_assignment_exam_code(value)
        if code:
            out.add(code)
    exam_type = normalize_exam_type(exam.get("examType") or exam.get("examTrack"), "")
    if exam_type == "law_business":
        out.add("LAW_BUSINESS")
    family_key = normalize_hierarchy_key(exam.get("licenseGroup") or exam.get("examFamilyKey"))
    if family_key == "c_specialty":
        out.add("C_LICENSE")
    elif family_key == "b_general":
        out.add("B_GENERAL")
    return out


def exam_matches_assigned_codes(exam: dict, assigned_exam_codes: list[str]) -> bool:
    assigned = set(normalize_assignment_exam_code_list(assigned_exam_codes))
    if not assigned:
        return True
    tags = derive_assignment_exam_codes_for_exam(exam)
    return bool(tags.intersection(assigned))


def filter_runtime_exams_by_assigned_codes(exams: list[dict], assigned_exam_codes: list[str]) -> list[dict]:
    if not assigned_exam_codes:
        return list(exams or [])
    return [exam for exam in (exams or []) if exam_matches_assigned_codes(exam, assigned_exam_codes)]


def filter_bank_by_assigned_exam_codes(bank: dict, assigned_exam_codes: list[str]) -> dict:
    assigned = normalize_assignment_exam_code_list(assigned_exam_codes)
    if not assigned:
        return bank
    industries_out: list[dict] = []
    for industry in bank.get("industries", []):
        if not isinstance(industry, dict):
            continue
        exams_out: list[dict] = []
        for exam in industry.get("exams", []):
            if not isinstance(exam, dict):
                continue
            if not exam_matches_assigned_codes(exam, assigned):
                continue
            exams_out.append(dict(exam))
        if not exams_out:
            continue
        copied = dict(industry)
        copied["exams"] = exams_out
        industries_out.append(copied)
    return {"industries": industries_out}


def derive_assignment_exam_codes_from_catalog_row(row: sqlite3.Row | dict | None) -> set[str]:
    if not row:
        return set()
    exam = {
        "examCode": row["exam_code"] if isinstance(row, sqlite3.Row) else row.get("exam_code"),
        "examFamilyKey": row["exam_family_key"] if isinstance(row, sqlite3.Row) else row.get("exam_family_key"),
        "licenseGroup": row["exam_family_key"] if isinstance(row, sqlite3.Row) else row.get("exam_family_key"),
        "tradeCode": row["trade_code"] if isinstance(row, sqlite3.Row) else row.get("trade_code"),
        "specializationCode": row["trade_code"] if isinstance(row, sqlite3.Row) else row.get("trade_code"),
        "examType": row["exam_type"] if isinstance(row, sqlite3.Row) else row.get("exam_type"),
        "examTrack": row["exam_type"] if isinstance(row, sqlite3.Row) else row.get("exam_type"),
    }
    return derive_assignment_exam_codes_for_exam(exam)


def list_visible_dashboard_modules_for_user(conn: sqlite3.Connection, user_payload: dict) -> list[dict]:
    modules = list_dashboard_modules(conn, active_only=True)
    assigned_exam_codes = normalize_assignment_exam_code_list(user_payload.get("assignedExamCodes"))
    membership_tier = normalize_membership_tier(user_payload.get("membershipTier"), "free")
    return [
        item
        for item in modules
        if should_show_module_for_user(
            item,
            assigned_exam_codes=assigned_exam_codes,
            membership_tier=membership_tier,
        )
    ]


def list_visible_course_contents_for_user(conn: sqlite3.Connection, user_payload: dict) -> list[dict]:
    contents = list_course_contents(conn, active_only=True)
    assigned_exam_codes = set(normalize_assignment_exam_code_list(user_payload.get("assignedExamCodes")))
    membership_tier = normalize_membership_tier(user_payload.get("membershipTier"), "free")
    out: list[dict] = []
    for item in contents:
        required_tier = clean_text(item.get("accessTier"))
        if required_tier and not membership_tier_allows(membership_tier, required_tier):
            continue
        linked_exam_code = normalize_exam_code(item.get("linkedExamCode"))
        if linked_exam_code and assigned_exam_codes:
            catalog_row = conn.execute(
                """
                SELECT exam_code, exam_family_key, trade_code, exam_type
                FROM exam_catalog
                WHERE exam_code = ?
                LIMIT 1
                """,
                (linked_exam_code,),
            ).fetchone()
            tags = {normalize_assignment_exam_code(linked_exam_code)}
            tags.update(derive_assignment_exam_codes_from_catalog_row(catalog_row))
            if not tags.intersection(assigned_exam_codes):
                continue
        out.append(item)
    return out


def ensure_user_entitlement_columns(conn: sqlite3.Connection) -> None:
    columns = {row["name"] for row in conn.execute("PRAGMA table_info(user_entitlements)").fetchall()}
    if "bilingual_expires_at" not in columns:
        conn.execute("ALTER TABLE user_entitlements ADD COLUMN bilingual_expires_at TEXT")
    if "ai_access" not in columns:
        conn.execute("ALTER TABLE user_entitlements ADD COLUMN ai_access INTEGER NOT NULL DEFAULT 0")
    if "ai_expires_at" not in columns:
        conn.execute("ALTER TABLE user_entitlements ADD COLUMN ai_expires_at TEXT")


def ensure_user_category_entitlement_columns(conn: sqlite3.Connection) -> None:
    columns = {row["name"] for row in conn.execute("PRAGMA table_info(user_category_entitlements)").fetchall()}
    if "expires_at" not in columns:
        conn.execute("ALTER TABLE user_category_entitlements ADD COLUMN expires_at TEXT")


def ensure_session_columns(conn: sqlite3.Connection) -> None:
    columns = {row["name"] for row in conn.execute("PRAGMA table_info(sessions)").fetchall()}
    if "expires_at" not in columns:
        conn.execute("ALTER TABLE sessions ADD COLUMN expires_at TEXT")


def ensure_questions_table(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS questions (
          question_id TEXT NOT NULL,
          category_key TEXT,
          industry_id TEXT,
          industry_name TEXT,
          exam_family_key TEXT,
          exam_family_name TEXT,
          trade_code TEXT,
          exam_type TEXT,
          exam_code TEXT,
          exam_id TEXT NOT NULL,
          exam_name TEXT,
          question_type TEXT,
          question_status TEXT NOT NULL DEFAULT 'active',
          prompt TEXT NOT NULL,
          option_a TEXT NOT NULL,
          option_b TEXT NOT NULL,
          option_c TEXT NOT NULL,
          option_d TEXT NOT NULL,
          answer TEXT NOT NULL,
          prompt_zh TEXT,
          option_a_zh TEXT,
          option_b_zh TEXT,
          option_c_zh TEXT,
          option_d_zh TEXT,
          explanation TEXT,
          explanation_zh TEXT,
          key_point_zh TEXT,
          vocab_zh TEXT,
          memory_trick TEXT,
          memory_tip_zh TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          PRIMARY KEY(question_id, exam_id)
        )
        """
    )
    columns = {row["name"] for row in conn.execute("PRAGMA table_info(questions)").fetchall()}
    required: dict[str, str] = {
        "program_code": "TEXT",
        "license_group": "TEXT",
        "specialization_code": "TEXT",
        "exam_track": "TEXT",
        "question_category": "TEXT",
        "category_code": "TEXT",
        "category_key": "TEXT",
        "industry_id": "TEXT",
        "industry_name": "TEXT",
        "exam_family_key": "TEXT",
        "exam_family_name": "TEXT",
        "trade_code": "TEXT",
        "exam_type": "TEXT",
        "exam_code": "TEXT",
        "examId": "TEXT",
        "exam_name": "TEXT",
        "question_type": "TEXT",
        "difficulty": "TEXT",
        "tags": "TEXT",
        "key_points": "TEXT",
        "is_active": "INTEGER NOT NULL DEFAULT 1",
        "question_status": "TEXT NOT NULL DEFAULT 'active'",
        "prompt": "TEXT",
        "option_a": "TEXT",
        "option_b": "TEXT",
        "option_c": "TEXT",
        "option_d": "TEXT",
        "answer": "TEXT",
        "prompt_zh": "TEXT",
        "option_a_zh": "TEXT",
        "option_b_zh": "TEXT",
        "option_c_zh": "TEXT",
        "option_d_zh": "TEXT",
        "explanation": "TEXT",
        "explanation_zh": "TEXT",
        "key_point_zh": "TEXT",
        "vocab_zh": "TEXT",
        "memory_trick": "TEXT",
        "memory_tip_zh": "TEXT",
        "image_url": "TEXT DEFAULT ''",
        "created_at": "TEXT",
        "updated_at": "TEXT",
    }
    for name, type_def in required.items():
        if name not in columns:
            conn.execute(f"ALTER TABLE questions ADD COLUMN {name} {type_def}")
    conn.execute(
        """
        UPDATE questions
        SET created_at = COALESCE(NULLIF(TRIM(created_at), ''), ?),
            updated_at = COALESCE(NULLIF(TRIM(updated_at), ''), ?)
        """,
        (now_iso(), now_iso()),
    )
    conn.execute(
        """
        UPDATE questions
        SET exam_code = COALESCE(NULLIF(TRIM(exam_code), ''), exam_id)
        WHERE exam_code IS NULL OR TRIM(exam_code) = ''
        """
    )
    conn.execute(
        """
        UPDATE questions
        SET exam_code = LOWER(REPLACE(REPLACE(TRIM(exam_code), '-', '_'), ' ', '_'))
        WHERE exam_code IS NOT NULL AND TRIM(exam_code) <> ''
        """
    )
    conn.execute(
        """
        UPDATE questions
        SET program_code = COALESCE(NULLIF(TRIM(program_code), ''), NULLIF(TRIM(industry_id), ''))
        """
    )
    conn.execute(
        """
        UPDATE questions
        SET license_group = COALESCE(NULLIF(TRIM(license_group), ''), NULLIF(TRIM(exam_family_key), ''))
        """
    )
    conn.execute(
        """
        UPDATE questions
        SET question_category = COALESCE(NULLIF(TRIM(question_category), ''), NULLIF(TRIM(category_key), ''))
        """
    )
    conn.execute(
        """
        UPDATE questions
        SET category_code = COALESCE(NULLIF(TRIM(category_code), ''), NULLIF(TRIM(question_category), ''), 'UNCATEGORIZED')
        """
    )
    conn.execute(
        """
        UPDATE questions
        SET exam_family_key = CASE
          WHEN exam_family_key IS NOT NULL AND TRIM(exam_family_key) <> '' THEN exam_family_key
          WHEN LOWER(COALESCE(exam_code, exam_id, '')) LIKE 'c%' THEN 'c_specialty'
          ELSE 'b_general'
        END,
            exam_family_name = CASE
          WHEN exam_family_name IS NOT NULL AND TRIM(exam_family_name) <> '' THEN exam_family_name
          WHEN LOWER(COALESCE(exam_code, exam_id, '')) LIKE 'c%' THEN 'C Specialty'
          ELSE 'B General Building'
        END
        """
    )
    conn.execute(
        """
        UPDATE questions
        SET exam_type = CASE
          WHEN exam_type IS NOT NULL AND LOWER(TRIM(exam_type)) IN ('law_business','trade') THEN LOWER(TRIM(exam_type))
          WHEN LOWER(REPLACE(COALESCE(exam_code, exam_id, ''), '-', '_')) LIKE '%law%' THEN 'law_business'
          WHEN LOWER(COALESCE(exam_name, '')) LIKE '%law%' OR LOWER(COALESCE(exam_name, '')) LIKE '%business%' THEN 'law_business'
          ELSE 'trade'
        END
        """
    )
    conn.execute(
        """
        UPDATE questions
        SET exam_track = COALESCE(NULLIF(TRIM(exam_track), ''), exam_type)
        """
    )
    conn.execute(
        """
        UPDATE questions
        SET trade_code = CASE
          WHEN trade_code IS NOT NULL AND TRIM(trade_code) <> '' THEN LOWER(REPLACE(TRIM(trade_code), '-', '_'))
          WHEN LOWER(REPLACE(COALESCE(exam_code, exam_id, ''), '-', '_')) LIKE 'c10%' THEN 'c10_electrical'
          WHEN LOWER(REPLACE(COALESCE(exam_code, exam_id, ''), '-', '_')) LIKE 'c36%' THEN 'c36_plumbing'
          WHEN LOWER(REPLACE(COALESCE(exam_code, exam_id, ''), '-', '_')) LIKE 'c20%' THEN 'c20_hvac'
          WHEN LOWER(REPLACE(COALESCE(exam_code, exam_id, ''), '-', '_')) LIKE 'c27%' THEN 'c27_landscaping'
          WHEN LOWER(REPLACE(COALESCE(exam_code, exam_id, ''), '-', '_')) LIKE 'c33%' THEN 'c33_painting'
          WHEN LOWER(REPLACE(COALESCE(exam_code, exam_id, ''), '-', '_')) LIKE '%general_b%' OR LOWER(REPLACE(COALESCE(exam_code, exam_id, ''), '-', '_')) = 'ca_general_b' THEN 'b_general'
          WHEN LOWER(COALESCE(exam_family_key, '')) = 'c_specialty' THEN LOWER(REPLACE(COALESCE(exam_code, exam_id, ''), '-', '_'))
          ELSE 'b_general'
        END
        """
    )
    conn.execute(
        """
        UPDATE questions
        SET trade_code = CASE
          WHEN exam_type = 'law_business' THEN ''
          ELSE trade_code
        END
        """
    )
    conn.execute(
        """
        UPDATE questions
        SET specialization_code = CASE
          WHEN specialization_code IS NOT NULL AND TRIM(specialization_code) <> '' THEN LOWER(REPLACE(TRIM(specialization_code), '-', '_'))
          WHEN exam_type = 'law_business' THEN ''
          ELSE COALESCE(trade_code, '')
        END
        """
    )
    conn.execute(
        """
        UPDATE questions
        SET license_group = COALESCE(NULLIF(TRIM(license_group), ''), NULLIF(TRIM(exam_family_key), '')),
            program_code = COALESCE(NULLIF(TRIM(program_code), ''), NULLIF(TRIM(industry_id), '')),
            question_category = COALESCE(NULLIF(TRIM(question_category), ''), NULLIF(TRIM(category_key), ''))
        """
    )
    conn.execute(
        """
        UPDATE questions
        SET question_status = CASE
          WHEN LOWER(TRIM(question_status)) IN ('active','inactive','deleted') THEN LOWER(TRIM(question_status))
          ELSE 'active'
        END
        """
    )
    conn.execute(
        """
        UPDATE questions
        SET is_active = CASE
          WHEN COALESCE(NULLIF(LOWER(TRIM(question_status)), ''), 'active') = 'active' THEN 1
          ELSE 0
        END
        """
    )


def ensure_entitlement_expiry_backfill(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        UPDATE user_entitlements
        SET bilingual_expires_at = ?
        WHERE bilingual_access = 1
          AND (bilingual_expires_at IS NULL OR TRIM(bilingual_expires_at) = '')
        """,
        (FAR_FUTURE_EXPIRES_AT,),
    )
    conn.execute(
        """
        UPDATE user_entitlements
        SET ai_expires_at = ?
        WHERE ai_access = 1
          AND (ai_expires_at IS NULL OR TRIM(ai_expires_at) = '')
        """,
        (FAR_FUTURE_EXPIRES_AT,),
    )
    conn.execute(
        """
        UPDATE user_category_entitlements
        SET expires_at = ?
        WHERE has_access = 1
          AND (expires_at IS NULL OR TRIM(expires_at) = '')
        """,
        (FAR_FUTURE_EXPIRES_AT,),
    )


def ensure_all_user_entitlements(conn: sqlite3.Connection) -> None:
    ensure_user_entitlement_columns(conn)
    ensure_user_membership_columns(conn)
    conn.execute(
        """
        INSERT OR IGNORE INTO user_entitlements(
          user_id, b_license_access, c_license_access, bilingual_access, bilingual_expires_at, ai_access, ai_expires_at, updated_at
        )
        SELECT
          id,
          CASE WHEN membership_tier IN ('basic_399','pro_599','ai_999') THEN 1 ELSE 0 END,
          CASE WHEN membership_tier IN ('basic_399','pro_599','ai_999') THEN 1 ELSE 0 END,
          CASE WHEN membership_tier IN ('pro_599','ai_999') THEN 1 ELSE 0 END,
          CASE WHEN membership_tier IN ('pro_599','ai_999') THEN ? ELSE NULL END,
          CASE WHEN membership_tier = 'ai_999' THEN 1 ELSE 0 END,
          CASE WHEN membership_tier = 'ai_999' THEN ? ELSE NULL END,
          COALESCE(membership_updated_at, created_at, ?)
        FROM users
        """,
        (FAR_FUTURE_EXPIRES_AT, FAR_FUTURE_EXPIRES_AT, now_iso()),
    )
    conn.execute(
        """
        UPDATE user_entitlements
        SET ai_access = CASE
          WHEN ai_access IS NULL THEN 0
          WHEN ai_access NOT IN (0,1) THEN CASE WHEN ai_access > 0 THEN 1 ELSE 0 END
          ELSE ai_access
        END
        """
    )
    conn.execute(
        """
        UPDATE user_entitlements
        SET ai_access = 1
        WHERE user_id IN (SELECT id FROM users WHERE membership_tier = 'ai_999')
        """
    )
    conn.execute(
        """
        UPDATE user_entitlements
        SET ai_access = 0, ai_expires_at = NULL
        WHERE user_id IN (SELECT id FROM users WHERE membership_tier <> 'ai_999')
        """
    )
    conn.execute(
        """
        UPDATE user_entitlements
        SET bilingual_access = CASE
          WHEN bilingual_access IS NULL THEN 0
          WHEN bilingual_access NOT IN (0,1) THEN CASE WHEN bilingual_access > 0 THEN 1 ELSE 0 END
          ELSE bilingual_access
        END
        """
    )
    conn.execute(
        """
        UPDATE users
        SET membership_tier = CASE
          WHEN plan = 'free' THEN 'free'
          WHEN plan = 'paid' AND id IN (
            SELECT user_id FROM user_entitlements WHERE ai_access = 1
          ) THEN 'ai_999'
          WHEN plan = 'paid' AND id IN (
            SELECT user_id FROM user_entitlements WHERE bilingual_access = 1
          ) THEN 'pro_599'
          WHEN plan = 'paid' THEN 'basic_399'
          ELSE 'free'
        END
        WHERE membership_tier IS NULL
           OR TRIM(membership_tier) = ''
           OR LOWER(TRIM(membership_tier)) NOT IN ('free','basic_399','pro_599','ai_999')
           OR (plan = 'free' AND membership_tier <> 'free')
           OR (plan = 'paid' AND membership_tier = 'free')
        """
    )


def ensure_default_categories(conn: sqlite3.Connection, *, seed_if_empty: bool = False) -> None:
    if not seed_if_empty:
        return
    existed = conn.execute("SELECT 1 FROM categories LIMIT 1").fetchone()
    if existed:
        return
    for item in DEFAULT_CATEGORIES:
        conn.execute(
            """
            INSERT OR IGNORE INTO categories(key, name, is_enabled, sort_order, created_at, updated_at)
            VALUES(?,?,?,?,?,?)
            """,
            (item["key"], item["name"], int(item["is_enabled"]), int(item["sort_order"]), now_iso(), now_iso()),
        )


def is_internal_category_key(value: str | None) -> bool:
    key = normalize_category_key(value)
    if not key:
        return False
    return key == "proof_tmp" or key.startswith("proof_")


def list_categories(
    conn: sqlite3.Connection,
    *,
    enabled_only: bool = False,
    include_internal: bool = False,
) -> list[sqlite3.Row]:
    where_clauses: list[str] = []
    if enabled_only:
        where_clauses.append("is_enabled = 1")
    if not include_internal:
        where_clauses.append("LOWER(TRIM(key)) NOT GLOB 'proof_*'")
    where = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""
    return conn.execute(
        f"""
        SELECT key, name, is_enabled, sort_order
        FROM categories
        {where}
        ORDER BY sort_order ASC, key ASC
        """
    ).fetchall()


def ensure_default_categories_bootstrap(conn: sqlite3.Connection, *, allow_seed: bool) -> None:
    row = conn.execute(
        "SELECT value FROM settings WHERE key = ?",
        (DEFAULT_CATEGORIES_BOOTSTRAP_SETTING_KEY,),
    ).fetchone()
    if row and clean_text(row["value"]):
        return
    if allow_seed:
        ensure_default_categories(conn, seed_if_empty=True)
    conn.execute(
        """
        INSERT INTO settings(key, value, updated_at)
        VALUES(?,?,?)
        ON CONFLICT(key) DO UPDATE SET
          value=excluded.value,
          updated_at=excluded.updated_at
        """,
        (DEFAULT_CATEGORIES_BOOTSTRAP_SETTING_KEY, "1", now_iso()),
    )


def ensure_exam_catalog_tables(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS exam_catalog (
          exam_code TEXT PRIMARY KEY,
          industry_key TEXT NOT NULL,
          industry_name TEXT NOT NULL,
          exam_family_key TEXT NOT NULL,
          exam_family_name TEXT NOT NULL,
          trade_code TEXT,
          exam_type TEXT NOT NULL DEFAULT 'trade',
          exam_name TEXT NOT NULL,
          category_key TEXT NOT NULL,
          is_enabled INTEGER NOT NULL DEFAULT 1,
          sort_order INTEGER NOT NULL DEFAULT 100,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY(category_key) REFERENCES categories(key)
        )
        """
    )
    columns = {row["name"] for row in conn.execute("PRAGMA table_info(exam_catalog)").fetchall()}
    if "trade_code" not in columns:
        conn.execute("ALTER TABLE exam_catalog ADD COLUMN trade_code TEXT")
    if "exam_type" not in columns:
        conn.execute("ALTER TABLE exam_catalog ADD COLUMN exam_type TEXT NOT NULL DEFAULT 'trade'")
    if "name_zh" not in columns:
        conn.execute("ALTER TABLE exam_catalog ADD COLUMN name_zh TEXT")
    if "description" not in columns:
        conn.execute("ALTER TABLE exam_catalog ADD COLUMN description TEXT")
    conn.execute(
        """
        UPDATE exam_catalog
        SET exam_type = CASE
          WHEN exam_type IS NOT NULL AND LOWER(TRIM(exam_type)) IN ('law_business','trade') THEN LOWER(TRIM(exam_type))
          WHEN LOWER(REPLACE(COALESCE(exam_code,''), '-', '_')) LIKE '%law%' THEN 'law_business'
          WHEN LOWER(COALESCE(exam_name,'')) LIKE '%law%' OR LOWER(COALESCE(exam_name,'')) LIKE '%business%' THEN 'law_business'
          ELSE 'trade'
        END
        """
    )
    conn.execute(
        """
        UPDATE exam_catalog
        SET trade_code = CASE
          WHEN trade_code IS NOT NULL AND TRIM(trade_code) <> '' THEN LOWER(REPLACE(TRIM(trade_code), '-', '_'))
          WHEN LOWER(REPLACE(COALESCE(exam_code,''), '-', '_')) LIKE 'c10%' THEN 'c10_electrical'
          WHEN LOWER(REPLACE(COALESCE(exam_code,''), '-', '_')) LIKE 'c36%' THEN 'c36_plumbing'
          WHEN LOWER(REPLACE(COALESCE(exam_code,''), '-', '_')) LIKE 'c20%' THEN 'c20_hvac'
          WHEN LOWER(REPLACE(COALESCE(exam_code,''), '-', '_')) LIKE 'c27%' THEN 'c27_landscaping'
          WHEN LOWER(REPLACE(COALESCE(exam_code,''), '-', '_')) LIKE 'c33%' THEN 'c33_painting'
          WHEN LOWER(REPLACE(COALESCE(exam_code,''), '-', '_')) LIKE '%general_b%' OR LOWER(REPLACE(COALESCE(exam_code,''), '-', '_')) = 'ca_general_b' THEN 'b_general'
          WHEN LOWER(COALESCE(exam_family_key,'')) = 'c_specialty' THEN LOWER(REPLACE(COALESCE(exam_code,''), '-', '_'))
          ELSE 'b_general'
        END
        """
    )
    conn.execute(
        """
        UPDATE exam_catalog
        SET trade_code = ''
        WHERE exam_type = 'law_business'
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS exam_configs (
          exam_code TEXT PRIMARY KEY,
          question_count INTEGER NOT NULL DEFAULT 100,
          exam_time_minutes INTEGER NOT NULL DEFAULT 180,
          practice_enabled INTEGER NOT NULL DEFAULT 1,
          mock_enabled INTEGER NOT NULL DEFAULT 1,
          included_exam_codes TEXT,
          updated_at TEXT NOT NULL,
          FOREIGN KEY(exam_code) REFERENCES exam_catalog(exam_code)
        )
        """
    )
    cfg_columns = {row["name"] for row in conn.execute("PRAGMA table_info(exam_configs)").fetchall()}
    if "practice_enabled" not in cfg_columns:
        conn.execute("ALTER TABLE exam_configs ADD COLUMN practice_enabled INTEGER NOT NULL DEFAULT 1")
    if "mock_enabled" not in cfg_columns:
        conn.execute("ALTER TABLE exam_configs ADD COLUMN mock_enabled INTEGER NOT NULL DEFAULT 1")
    if "included_exam_codes" not in cfg_columns:
        conn.execute("ALTER TABLE exam_configs ADD COLUMN included_exam_codes TEXT")
    conn.execute(
        """
        UPDATE exam_configs
        SET practice_enabled = CASE WHEN practice_enabled IN (0,1) THEN practice_enabled ELSE 1 END,
            mock_enabled = CASE WHEN mock_enabled IN (0,1) THEN mock_enabled ELSE 1 END
        """
    )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS exam_categories (
          code TEXT PRIMARY KEY,
          exam_code TEXT NOT NULL,
          name TEXT NOT NULL,
          name_zh TEXT,
          description TEXT,
          sort_order INTEGER NOT NULL DEFAULT 100,
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY(exam_code) REFERENCES exam_catalog(exam_code)
        )
        """
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_exam_categories_exam_code ON exam_categories(exam_code, is_active, sort_order)"
    )


def ensure_exam_structure_v1_tables(conn: sqlite3.Connection) -> None:
    # Step 2 only: create new structure tables (no backfill/read switch/write switch yet).
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS exam_structure_nodes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          parent_id INTEGER,
          node_type TEXT NOT NULL CHECK(node_type IN ('program','sub_item','exam_module')),
          node_key TEXT NOT NULL,
          node_name TEXT NOT NULL,
          is_enabled INTEGER NOT NULL DEFAULT 1,
          sort_order INTEGER NOT NULL DEFAULT 100,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          UNIQUE(parent_id, node_type, node_key),
          FOREIGN KEY(parent_id) REFERENCES exam_structure_nodes(id)
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS exam_module_configs (
          node_id INTEGER PRIMARY KEY,
          module_code TEXT NOT NULL UNIQUE,
          category_key TEXT NOT NULL,
          question_count INTEGER NOT NULL DEFAULT 100,
          exam_time_minutes INTEGER NOT NULL DEFAULT 180,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY(node_id) REFERENCES exam_structure_nodes(id),
          FOREIGN KEY(category_key) REFERENCES categories(key)
        )
        """
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_exam_structure_nodes_parent ON exam_structure_nodes(parent_id)"
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_exam_structure_nodes_type_enabled ON exam_structure_nodes(node_type, is_enabled)"
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_exam_module_configs_category ON exam_module_configs(category_key)"
    )


def find_exam_structure_node(
    conn: sqlite3.Connection, *, parent_id: int | None, node_type: str, node_key: str
) -> sqlite3.Row | None:
    if parent_id is None:
        return conn.execute(
            """
            SELECT id, parent_id, node_type, node_key, node_name, is_enabled, sort_order
            FROM exam_structure_nodes
            WHERE parent_id IS NULL AND node_type = ? AND node_key = ?
            LIMIT 1
            """,
            (node_type, node_key),
        ).fetchone()
    return conn.execute(
        """
        SELECT id, parent_id, node_type, node_key, node_name, is_enabled, sort_order
        FROM exam_structure_nodes
        WHERE parent_id = ? AND node_type = ? AND node_key = ?
        LIMIT 1
        """,
        (parent_id, node_type, node_key),
    ).fetchone()


def ensure_exam_structure_node(
    conn: sqlite3.Connection,
    *,
    parent_id: int | None,
    node_type: str,
    node_key: str,
    node_name: str,
    is_enabled: int,
    sort_order: int,
    update_existing: bool = True,
) -> int:
    existing = find_exam_structure_node(conn, parent_id=parent_id, node_type=node_type, node_key=node_key)
    updated_at = now_iso()
    if existing:
        if update_existing:
            conn.execute(
                """
                UPDATE exam_structure_nodes
                SET node_name = ?, is_enabled = ?, sort_order = ?, updated_at = ?
                WHERE id = ?
                """,
                (node_name, is_enabled, sort_order, updated_at, int(existing["id"])),
            )
        return int(existing["id"])

    created_at = updated_at
    conn.execute(
        """
        INSERT INTO exam_structure_nodes(
          parent_id, node_type, node_key, node_name, is_enabled, sort_order, created_at, updated_at
        )
        VALUES(?,?,?,?,?,?,?,?)
        """,
        (parent_id, node_type, node_key, node_name, is_enabled, sort_order, created_at, updated_at),
    )
    row = find_exam_structure_node(conn, parent_id=parent_id, node_type=node_type, node_key=node_key)
    if not row:
        raise ValueError("结构节点创建失败")
    return int(row["id"])


def derive_sub_item_name_for_structure(
    exam_family_name: str, trade_code: str, sub_item_key: str, exam_name: str
) -> str:
    key = normalize_hierarchy_key(sub_item_key)
    if key == CONTRACTOR_B_SUB_ITEM_KEY:
        return clean_text(exam_family_name) or "B General Building"
    if key.startswith("c") and "_" in key:
        part = key.split("_", 1)[0]
        if part[1:].isdigit():
            return f"C-{part[1:]}"
    if key.startswith("c") and key[1:].isdigit():
        return f"C-{key[1:]}"
    cleaned_trade = clean_text(trade_code)
    if cleaned_trade:
        return cleaned_trade.replace("_", " ").strip()
    cleaned_exam_name = clean_text(exam_name)
    return cleaned_exam_name or key


def ensure_exam_structure_v1_backfill(conn: sqlite3.Connection) -> None:
    # One-time bootstrap: backfill from legacy exam_catalog/exam_configs once, then stop re-running.
    ensure_exam_structure_v1_tables(conn)
    bootstrapped = conn.execute(
        "SELECT value FROM settings WHERE key = ?",
        (EXAM_STRUCTURE_BOOTSTRAP_SETTING_KEY,),
    ).fetchone()
    if bootstrapped and clean_text(bootstrapped["value"]):
        # Split safety/self-heal:
        # If the bootstrap flag is set but module configs are empty while legacy exam_catalog
        # still has rows, allow one repair backfill so admin structure/exam-catalog reads stay consistent.
        module_count_row = conn.execute("SELECT COUNT(1) AS cnt FROM exam_module_configs").fetchone()
        module_count = int(module_count_row["cnt"] or 0) if module_count_row else 0
        if module_count > 0:
            return
        legacy_count_row = conn.execute("SELECT COUNT(1) AS cnt FROM exam_catalog").fetchone()
        legacy_count = int(legacy_count_row["cnt"] or 0) if legacy_count_row else 0
        if legacy_count <= 0:
            return

    rows = conn.execute(
        """
        SELECT
          ec.exam_code,
          ec.industry_key,
          ec.industry_name,
          ec.exam_family_key,
          ec.exam_family_name,
          ec.trade_code,
          ec.exam_type,
          ec.exam_name,
          ec.category_key,
          ec.is_enabled,
          ec.sort_order,
          COALESCE(cfg.question_count, 100) AS question_count,
          COALESCE(cfg.exam_time_minutes, 180) AS exam_time_minutes
        FROM exam_catalog ec
        LEFT JOIN exam_configs cfg ON cfg.exam_code = ec.exam_code
        ORDER BY ec.sort_order ASC, ec.exam_code ASC
        """
    ).fetchall()

    for row in rows:
        exam_code = normalize_exam_code(row["exam_code"])
        if not exam_code:
            continue
        industry_key = normalize_hierarchy_key(row["industry_key"])
        industry_name = clean_text(row["industry_name"]) or industry_key
        family_key = normalize_hierarchy_key(row["exam_family_key"])
        family_name = clean_text(row["exam_family_name"]) or family_key
        trade_code = normalize_trade_code(row["trade_code"])
        exam_type = normalize_exam_type(row["exam_type"], "trade")
        category_key = normalize_category_key(row["category_key"])
        sort_order = to_int(row["sort_order"], 100)
        is_enabled = 1 if to_bool_int(row["is_enabled"], 1) else 0
        question_count = max(1, to_int(row["question_count"], 100))
        exam_time_minutes = max(1, to_int(row["exam_time_minutes"], 180))
        exam_name = clean_text(row["exam_name"]) or exam_code

        if not industry_key:
            continue

        program_node_id = ensure_exam_structure_node(
            conn,
            parent_id=None,
            node_type="program",
            node_key=industry_key,
            node_name=industry_name,
            is_enabled=1,
            sort_order=100,
            update_existing=False,
        )

        sub_item_key = normalize_sub_item_key_for_structure(industry_key, family_key, trade_code)
        parent_node_id = program_node_id
        if sub_item_key:
            sub_item_name = derive_sub_item_name_for_structure(family_name, trade_code, sub_item_key, exam_name)
            parent_node_id = ensure_exam_structure_node(
                conn,
                parent_id=program_node_id,
                node_type="sub_item",
                node_key=sub_item_key,
                node_name=sub_item_name,
                is_enabled=1,
                sort_order=sort_order,
                update_existing=False,
            )

        module_node_id = ensure_exam_structure_node(
            conn,
            parent_id=parent_node_id,
            node_type="exam_module",
            node_key=exam_code,
            node_name=exam_name,
            is_enabled=is_enabled,
            sort_order=sort_order,
            update_existing=False,
        )

        now = now_iso()
        conn.execute(
            """
            INSERT INTO exam_module_configs(
              node_id, module_code, category_key, question_count, exam_time_minutes, created_at, updated_at
            )
            VALUES(?,?,?,?,?,?,?)
            ON CONFLICT(node_id) DO UPDATE SET
              module_code=excluded.module_code,
              category_key=excluded.category_key,
              question_count=excluded.question_count,
              exam_time_minutes=excluded.exam_time_minutes,
              updated_at=excluded.updated_at
            """,
            (
                module_node_id,
                exam_code,
                category_key,
                question_count,
                exam_time_minutes,
                now,
                now,
            ),
        )

    conn.execute(
        """
        INSERT INTO settings(key, value, updated_at)
        VALUES(?,?,?)
        ON CONFLICT(key) DO UPDATE SET
          value=excluded.value,
          updated_at=excluded.updated_at
        """,
        (EXAM_STRUCTURE_BOOTSTRAP_SETTING_KEY, "1", now_iso()),
    )


def default_exam_code_set() -> set[str]:
    result: set[str] = set()
    for item in DEFAULT_EXAM_CATALOG:
        code = normalize_exam_code(item.get("exam_code"))
        if code:
            result.add(code)
    return result


def load_deleted_default_exam_codes(conn: sqlite3.Connection) -> set[str]:
    row = conn.execute(
        "SELECT value FROM settings WHERE key = ?",
        (DELETED_DEFAULT_EXAM_CODES_SETTING_KEY,),
    ).fetchone()
    if not row:
        return set()
    raw = str(row["value"] or "").strip()
    if not raw:
        return set()
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return set()
    if not isinstance(parsed, list):
        return set()
    output: set[str] = set()
    allowed = default_exam_code_set()
    for item in parsed:
        code = normalize_exam_code(item)
        if code and code in allowed:
            output.add(code)
    return output


def save_deleted_default_exam_codes(conn: sqlite3.Connection, codes: set[str]) -> None:
    allowed = default_exam_code_set()
    payload_codes = sorted([code for code in codes if code in allowed])
    conn.execute(
        """
        INSERT INTO settings(key, value, updated_at)
        VALUES(?,?,?)
        ON CONFLICT(key) DO UPDATE SET
          value=excluded.value,
          updated_at=excluded.updated_at
        """,
        (
            DELETED_DEFAULT_EXAM_CODES_SETTING_KEY,
            json.dumps(payload_codes, ensure_ascii=False),
            now_iso(),
        ),
    )


def ensure_default_exam_catalog(conn: sqlite3.Connection, *, seed_if_empty: bool = False) -> None:
    ensure_exam_catalog_tables(conn)
    if not seed_if_empty:
        return

    existed = conn.execute("SELECT 1 FROM exam_catalog LIMIT 1").fetchone()
    if existed:
        return

    category_rows = list_categories(conn, enabled_only=False, include_internal=True)
    category_keys = {row["key"] for row in category_rows}
    fallback_category = "b_license" if "b_license" in category_keys else (next(iter(category_keys), "b_license"))

    for item in DEFAULT_EXAM_CATALOG:
        exam_code = normalize_exam_code(item.get("exam_code"))
        if not exam_code:
            continue
        category_key = normalize_category_key(item.get("category_key")) or fallback_category
        if category_key not in category_keys:
            category_key = fallback_category
        exam_family_key = normalize_hierarchy_key(item.get("exam_family_key")) or "general"
        trade_code = normalize_trade_code(item.get("trade_code")) or derive_trade_code_from_exam(exam_code, exam_family_key)
        exam_type = normalize_exam_type(item.get("exam_type"), derive_exam_type_from_exam(exam_code, clean_text(item.get("exam_name"))))

        conn.execute(
            """
            INSERT OR IGNORE INTO exam_catalog(
              exam_code, industry_key, industry_name, exam_family_key, exam_family_name, trade_code, exam_type,
              exam_name, category_key, is_enabled, sort_order, created_at, updated_at
            )
            VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)
            """,
            (
                exam_code,
                normalize_hierarchy_key(item.get("industry_key")) or "general",
                clean_text(item.get("industry_name")) or "General License",
                exam_family_key,
                clean_text(item.get("exam_family_name")) or "General",
                trade_code,
                exam_type,
                clean_text(item.get("exam_name")) or exam_code,
                category_key,
                1 if to_bool_int(item.get("is_enabled"), 1) else 0,
                to_int(item.get("sort_order"), 100),
                now_iso(),
                now_iso(),
            ),
        )
        rules = DEFAULT_EXAM_RULES.get(exam_code, {"question_count": 100, "exam_time_minutes": 180})
        conn.execute(
            """
            INSERT OR IGNORE INTO exam_configs(
              exam_code, question_count, exam_time_minutes, practice_enabled, mock_enabled, included_exam_codes, updated_at
            )
            VALUES(?,?,?,?,?,?,?)
            """,
            (
                exam_code,
                max(1, to_int(rules.get("question_count"), 100)),
                max(1, to_int(rules.get("exam_time_minutes"), 180)),
                1,
                1,
                "[]",
                now_iso(),
            ),
        )
    ensure_exam_categories_defaults(conn)


def ensure_exam_catalog_for_active_questions(conn: sqlite3.Connection) -> int:
    ensure_questions_table(conn)
    ensure_default_exam_catalog(conn)
    category_rows = list_categories(conn, enabled_only=False, include_internal=True)
    category_keys = {row["key"] for row in category_rows}
    fallback_category = "b_license" if "b_license" in category_keys else (next(iter(category_keys), "b_license"))

    rows = conn.execute(
        """
        SELECT
          LOWER(TRIM(COALESCE(q.exam_code, q.exam_id, ''))) AS exam_code,
          COALESCE(NULLIF(TRIM(MAX(q.industry_id)), ''), 'contractor') AS industry_key,
          COALESCE(NULLIF(TRIM(MAX(q.industry_name)), ''), 'Contractor License') AS industry_name,
          COALESCE(NULLIF(TRIM(MAX(q.exam_family_key)), ''), '') AS exam_family_key,
          COALESCE(NULLIF(TRIM(MAX(q.exam_family_name)), ''), '') AS exam_family_name,
          COALESCE(NULLIF(TRIM(MAX(q.trade_code)), ''), '') AS trade_code,
          COALESCE(NULLIF(TRIM(MAX(q.exam_type)), ''), '') AS exam_type,
          COALESCE(NULLIF(TRIM(MAX(q.exam_name)), ''), NULLIF(TRIM(MAX(q.exam_id)), ''), LOWER(TRIM(COALESCE(q.exam_code, q.exam_id, '')))) AS exam_name,
          COALESCE(NULLIF(TRIM(MAX(q.category_key)), ''), '') AS category_key,
          COUNT(1) AS active_count
        FROM questions q
        LEFT JOIN exam_catalog ec
          ON ec.exam_code = LOWER(TRIM(COALESCE(q.exam_code, q.exam_id, '')))
        WHERE COALESCE(NULLIF(LOWER(TRIM(COALESCE(q.question_status, 'active'))), ''), 'active') = 'active'
          AND LOWER(TRIM(COALESCE(q.exam_code, q.exam_id, ''))) <> ''
          AND ec.exam_code IS NULL
        GROUP BY LOWER(TRIM(COALESCE(q.exam_code, q.exam_id, '')))
        """
    ).fetchall()

    created = 0
    for row in rows:
        exam_code = normalize_exam_code(row["exam_code"])
        if not is_valid_exam_code(exam_code):
            continue
        exam_family_key = normalize_hierarchy_key(row["exam_family_key"])
        exam_family_name = clean_text(row["exam_family_name"])
        if not exam_family_key:
            exam_family_key, default_family_name = derive_exam_family_from_code(exam_code)
            if not exam_family_name:
                exam_family_name = default_family_name
        if not exam_family_name:
            _, exam_family_name = derive_exam_family_from_code(exam_code)

        exam_name = clean_text(row["exam_name"]) or exam_code
        exam_type = normalize_exam_type(row["exam_type"], derive_exam_type_from_exam(exam_code, exam_name))
        trade_code = normalize_trade_code(row["trade_code"])
        if exam_type == "law_business":
            trade_code = ""
        if exam_type != "law_business" and not trade_code:
            trade_code = derive_trade_code_from_exam(exam_code, exam_family_key)

        category_key = normalize_category_key(row["category_key"])
        if category_key not in category_keys:
            category_key = "c_license" if exam_code.startswith("c") and "c_license" in category_keys else fallback_category

        question_count = max(1, to_int(row["active_count"], 1))
        exam_time_minutes = (
            DEFAULT_EXAM_RULES.get(exam_code, {}).get("exam_time_minutes")
            or (210 if exam_type == "law_business" else 180)
        )
        now = now_iso()
        conn.execute(
            """
            INSERT OR IGNORE INTO exam_catalog(
              exam_code, industry_key, industry_name, exam_family_key, exam_family_name, trade_code, exam_type,
              exam_name, category_key, is_enabled, sort_order, created_at, updated_at
            )
            VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)
            """,
            (
                exam_code,
                normalize_hierarchy_key(row["industry_key"]) or "contractor",
                clean_text(row["industry_name"]) or "Contractor License",
                exam_family_key,
                exam_family_name,
                trade_code,
                exam_type,
                exam_name,
                category_key,
                0,
                950,
                now,
                now,
            ),
        )
        conn.execute(
            """
            INSERT OR IGNORE INTO exam_configs(
              exam_code, question_count, exam_time_minutes, practice_enabled, mock_enabled, included_exam_codes, updated_at
            )
            VALUES(?,?,?,?,?,?,?)
            """,
            (exam_code, question_count, max(1, to_int(exam_time_minutes, 180)), 1, 1, "[]", now),
        )
        created += 1
    ensure_exam_categories_defaults(conn)
    return created


def ensure_b_path_launch_ready_defaults(conn: sqlite3.Connection) -> None:
    """
    One-time launch prep:
    - lock B path to b_license (b_general_law_business / ca_general_b)
    - keep C path disabled for now
    - hide proof_* categories from production-facing admin views
    """
    row = conn.execute(
        "SELECT value FROM settings WHERE key = ?",
        (B_PATH_LAUNCH_READY_SETTING_KEY,),
    ).fetchone()
    if row and clean_text(row["value"]):
        return

    ensure_questions_table(conn)
    ensure_exam_catalog_tables(conn)
    ensure_exam_structure_v1_tables(conn)
    ensure_exam_structure_v1_backfill(conn)

    now = now_iso()
    b_codes = {"b_general_law_business", "ca_general_b"}

    # Keep production-facing category dictionary stable for launch.
    conn.execute(
        """
        INSERT INTO categories(key, name, is_enabled, sort_order, created_at, updated_at)
        VALUES('b_license', 'B License', 1, 10, ?, ?)
        ON CONFLICT(key) DO UPDATE SET
          name='B License',
          is_enabled=1,
          sort_order=10,
          updated_at=excluded.updated_at
        """,
        (now, now),
    )
    conn.execute(
        """
        INSERT INTO categories(key, name, is_enabled, sort_order, created_at, updated_at)
        VALUES('c_license', 'C License', 0, 20, ?, ?)
        ON CONFLICT(key) DO UPDATE SET
          name='C License',
          is_enabled=0,
          sort_order=20,
          updated_at=excluded.updated_at
        """,
        (now, now),
    )
    conn.execute(
        """
        UPDATE categories
        SET is_enabled = 0, updated_at = ?
        WHERE LOWER(TRIM(key)) GLOB 'proof_*'
        """,
        (now,),
    )

    # Ensure B rows exist and are ready for future import.
    for item in DEFAULT_EXAM_CATALOG:
        exam_code = normalize_exam_code(item.get("exam_code"))
        if exam_code not in b_codes:
            continue
        conn.execute(
            """
            INSERT OR IGNORE INTO exam_catalog(
              exam_code, industry_key, industry_name, exam_family_key, exam_family_name, trade_code, exam_type,
              exam_name, category_key, is_enabled, sort_order, created_at, updated_at
            )
            VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)
            """,
            (
                exam_code,
                normalize_hierarchy_key(item.get("industry_key")) or "contractor",
                clean_text(item.get("industry_name")) or "Contractor License",
                normalize_hierarchy_key(item.get("exam_family_key")) or "b_general",
                clean_text(item.get("exam_family_name")) or "B General Building",
                normalize_trade_code(item.get("trade_code")),
                normalize_exam_type(item.get("exam_type"), "trade"),
                clean_text(item.get("exam_name")) or exam_code,
                "b_license",
                1,
                to_int(item.get("sort_order"), 100),
                now,
                now,
            ),
        )

    conn.execute(
        """
        UPDATE exam_catalog
        SET category_key='b_license',
            is_enabled=1,
            updated_at=?
        WHERE LOWER(TRIM(exam_code)) IN ('b_general_law_business', 'ca_general_b')
        """,
        (now,),
    )
    conn.execute(
        """
        UPDATE exam_catalog
        SET trade_code='',
            exam_type='law_business',
            updated_at=?
        WHERE LOWER(TRIM(exam_code)) = 'b_general_law_business'
        """,
        (now,),
    )
    conn.execute(
        """
        UPDATE exam_catalog
        SET trade_code='b_general',
            exam_type='trade',
            updated_at=?
        WHERE LOWER(TRIM(exam_code)) = 'ca_general_b'
        """,
        (now,),
    )
    # C path stays disabled in this launch phase.
    conn.execute(
        """
        UPDATE exam_catalog
        SET category_key='c_license',
            is_enabled=0,
            updated_at=?
        WHERE LOWER(TRIM(exam_family_key)) = 'c_specialty'
        """,
        (now,),
    )

    # Keep module/category mapping aligned with exam_catalog.
    conn.execute(
        """
        UPDATE exam_module_configs
        SET category_key='b_license', updated_at=?
        WHERE LOWER(TRIM(module_code)) IN ('b_general_law_business', 'ca_general_b')
        """,
        (now,),
    )
    conn.execute(
        """
        UPDATE exam_module_configs
        SET category_key='c_license', updated_at=?
        WHERE LOWER(TRIM(module_code)) IN (
          SELECT LOWER(TRIM(exam_code))
          FROM exam_catalog
          WHERE LOWER(TRIM(exam_family_key)) = 'c_specialty'
        )
        """,
        (now,),
    )

    conn.execute(
        """
        UPDATE exam_structure_nodes
        SET is_enabled = COALESCE(
              (
                SELECT ec.is_enabled
                FROM exam_module_configs mc
                JOIN exam_catalog ec
                  ON LOWER(TRIM(ec.exam_code)) = LOWER(TRIM(mc.module_code))
                WHERE mc.node_id = exam_structure_nodes.id
                LIMIT 1
              ),
              is_enabled
            ),
            updated_at = ?
        WHERE node_type = 'exam_module'
        """,
        (now,),
    )
    conn.execute(
        """
        UPDATE exam_structure_nodes
        SET is_enabled = 0, updated_at = ?
        WHERE node_type = 'sub_item'
          AND parent_id IN (
            SELECT id
            FROM exam_structure_nodes
            WHERE node_type = 'program' AND LOWER(TRIM(node_key)) = 'contractor'
          )
          AND LOWER(TRIM(node_key)) <> 'b_general'
        """,
        (now,),
    )
    conn.execute(
        """
        UPDATE exam_structure_nodes
        SET is_enabled = 1, updated_at = ?
        WHERE node_type = 'sub_item'
          AND parent_id IN (
            SELECT id
            FROM exam_structure_nodes
            WHERE node_type = 'program' AND LOWER(TRIM(node_key)) = 'contractor'
          )
          AND LOWER(TRIM(node_key)) = 'b_general'
        """,
        (now,),
    )

    # Remap existing question category keys for consistency (keep statuses unchanged).
    conn.execute(
        """
        UPDATE questions
        SET category_key='b_license',
            question_category='b_license',
            updated_at=?
        WHERE LOWER(TRIM(COALESCE(exam_code, exam_id, ''))) IN ('b_general_law_business', 'ca_general_b')
        """,
        (now,),
    )
    conn.execute(
        """
        UPDATE questions
        SET category_key='c_license',
            question_category='c_license',
            updated_at=?
        WHERE LOWER(TRIM(COALESCE(exam_family_key, ''))) = 'c_specialty'
           OR LOWER(TRIM(COALESCE(exam_code, exam_id, ''))) GLOB 'c*'
        """,
        (now,),
    )

    # Keep JSON bank metadata aligned with B/C launch mapping.
    bank_row = conn.execute(
        "SELECT value FROM settings WHERE key = 'question_bank_json'"
    ).fetchone()
    if bank_row:
        try:
            bank = json.loads(bank_row["value"] or "{}")
        except json.JSONDecodeError:
            bank = {}
        changed = False
        for industry in bank.get("industries", []):
            for exam in industry.get("exams", []):
                exam_code = normalize_exam_code(exam.get("examCode") or exam.get("id"))
                if exam_code in b_codes:
                    target_category = "b_license"
                elif exam_code.startswith("c") or normalize_hierarchy_key(exam.get("examFamilyKey")) == "c_specialty":
                    target_category = "c_license"
                else:
                    target_category = ""

                if target_category and normalize_category_key(exam.get("categoryKey")) != target_category:
                    exam["categoryKey"] = target_category
                    changed = True

                for question in exam.get("questions", []):
                    if not isinstance(question, dict):
                        continue
                    if target_category:
                        if normalize_category_key(question.get("categoryKey")) != target_category:
                            question["categoryKey"] = target_category
                            changed = True
                        if normalize_category_key(question.get("questionCategory")) != target_category:
                            question["questionCategory"] = target_category
                            changed = True

        if changed:
            conn.execute(
                """
                UPDATE settings
                SET value = ?, updated_at = ?
                WHERE key = 'question_bank_json'
                """,
                (json.dumps(bank, ensure_ascii=False), now),
            )

    conn.execute(
        """
        INSERT INTO settings(key, value, updated_at)
        VALUES(?,?,?)
        ON CONFLICT(key) DO UPDATE SET
          value=excluded.value,
          updated_at=excluded.updated_at
        """,
        (B_PATH_LAUNCH_READY_SETTING_KEY, "1", now),
    )


def list_exam_catalog(conn: sqlite3.Connection, *, enabled_only: bool = False) -> list[sqlite3.Row]:
    ensure_default_exam_catalog(conn)
    ensure_exam_categories_defaults(conn)
    where = "WHERE ec.is_enabled = 1" if enabled_only else ""
    return conn.execute(
        f"""
        SELECT
          ec.exam_code,
          ec.industry_key,
          ec.industry_name,
          ec.exam_family_key,
          ec.exam_family_name,
          ec.trade_code,
          ec.exam_type,
          ec.exam_name,
          ec.name_zh,
          ec.description,
          ec.category_key,
          ec.is_enabled,
          ec.sort_order,
          c.name AS category_name,
          CASE WHEN c.key IS NULL THEN 0 ELSE 1 END AS category_exists,
          COALESCE(c.is_enabled, 0) AS category_enabled,
          COALESCE(cfg.question_count, 100) AS question_count,
          COALESCE(cfg.exam_time_minutes, 180) AS exam_time_minutes,
          COALESCE(cfg.practice_enabled, 1) AS practice_enabled,
          COALESCE(cfg.mock_enabled, 1) AS mock_enabled,
          COALESCE(cfg.included_exam_codes, '[]') AS included_exam_codes
        FROM exam_catalog ec
        LEFT JOIN exam_configs cfg ON cfg.exam_code = ec.exam_code
        LEFT JOIN categories c ON c.key = ec.category_key
        {where}
        ORDER BY ec.industry_key ASC, ec.exam_family_key ASC, ec.trade_code ASC, ec.exam_type ASC, ec.sort_order ASC, ec.exam_code ASC
        """
    ).fetchall()


def infer_exam_family_from_structure(
    program_key: str, program_name: str, sub_item_key: str, sub_item_name: str, module_code: str
) -> tuple[str, str]:
    industry = normalize_hierarchy_key(program_key)
    sub_key = normalize_hierarchy_key(sub_item_key)
    if industry == CONTRACTOR_PROGRAM_KEY:
        if sub_key == CONTRACTOR_B_SUB_ITEM_KEY:
            return ("b_general", "B General Building")
        if sub_key.startswith("c"):
            return ("c_specialty", "C Specialty")
        return derive_exam_family_from_code(module_code)
    if sub_key:
        return (sub_key, clean_text(sub_item_name) or sub_key)
    return (industry or "general", clean_text(program_name) or industry or "General")


def list_exam_catalog_from_structure(conn: sqlite3.Connection, *, enabled_only: bool = False) -> list[dict]:
    ensure_exam_structure_v1_tables(conn)
    ensure_exam_structure_v1_backfill(conn)
    ensure_exam_categories_defaults(conn)
    where = "WHERE m.is_enabled = 1" if enabled_only else ""
    rows = conn.execute(
        f"""
        SELECT
          m.id AS module_node_id,
          m.node_key AS module_node_key,
          m.node_name AS module_node_name,
          m.is_enabled AS module_is_enabled,
          m.sort_order AS module_sort_order,
          COALESCE(s.node_key, '') AS sub_item_key,
          COALESCE(s.node_name, '') AS sub_item_name,
          p.node_key AS program_key,
          p.node_name AS program_name,
          mc.module_code,
          mc.category_key,
          mc.question_count,
          mc.exam_time_minutes,
          COALESCE(cfg.practice_enabled, 1) AS practice_enabled,
          COALESCE(cfg.mock_enabled, 1) AS mock_enabled,
          COALESCE(cfg.included_exam_codes, '[]') AS included_exam_codes,
          ec.exam_name AS legacy_exam_name,
          ec.name_zh AS legacy_name_zh,
          ec.description AS legacy_description,
          c.name AS category_name,
          CASE WHEN c.key IS NULL THEN 0 ELSE 1 END AS category_exists,
          COALESCE(c.is_enabled, 0) AS category_enabled
        FROM exam_module_configs mc
        JOIN exam_structure_nodes m ON m.id = mc.node_id AND m.node_type = 'exam_module'
        LEFT JOIN exam_structure_nodes s ON s.id = m.parent_id AND s.node_type = 'sub_item'
        LEFT JOIN exam_structure_nodes p ON p.id = CASE WHEN s.id IS NOT NULL THEN s.parent_id ELSE m.parent_id END
          AND p.node_type = 'program'
        LEFT JOIN exam_catalog ec ON LOWER(TRIM(ec.exam_code)) = LOWER(TRIM(mc.module_code))
        LEFT JOIN exam_configs cfg ON LOWER(TRIM(cfg.exam_code)) = LOWER(TRIM(mc.module_code))
        LEFT JOIN categories c ON c.key = mc.category_key
        {where}
        ORDER BY p.node_key ASC, COALESCE(s.node_key, '') ASC, m.sort_order ASC, mc.module_code ASC
        """
    ).fetchall()

    payloads: list[dict] = []
    for row in rows:
        exam_code = normalize_exam_code(row["module_code"] or row["module_node_key"])
        if not exam_code:
            continue

        program_key = normalize_hierarchy_key(row["program_key"])
        program_name = clean_text(row["program_name"]) or program_key
        sub_item_key = normalize_hierarchy_key(row["sub_item_key"])
        sub_item_name = clean_text(row["sub_item_name"]) or sub_item_key
        exam_name = clean_text(row["legacy_exam_name"]) or clean_text(row["module_node_name"]) or exam_code
        name_zh = clean_text(row["legacy_name_zh"])
        description = clean_text(row["legacy_description"])

        exam_family_key, exam_family_name = infer_exam_family_from_structure(
            program_key, program_name, sub_item_key, sub_item_name, exam_code
        )
        exam_type = derive_exam_type_from_exam(exam_code, exam_name)
        specialization_code = ""
        if exam_type != "law_business":
            specialization_code = normalize_sub_item_key_for_structure(
                program_key,
                exam_family_key,
                sub_item_key,
            )
            if not specialization_code:
                specialization_code = derive_trade_code_from_exam(exam_code, exam_family_key)
            specialization_code = normalize_specialization_code(specialization_code)

        category_key = normalize_category_key(row["category_key"])
        category_name = clean_text(row["category_name"]) or category_key
        category_exists = bool(row["category_exists"])
        category_enabled = bool(row["category_enabled"])
        is_enabled_value = bool(row["module_is_enabled"])

        payloads.append(
            {
                "examCode": exam_code,
                "industryKey": program_key,
                "industryName": program_name,
                "programCode": program_key,
                "programName": program_name,
                "examFamilyKey": exam_family_key,
                "examFamilyName": exam_family_name,
                "licenseGroup": exam_family_key,
                "licenseGroupName": exam_family_name,
                "tradeCode": specialization_code,
                "specializationCode": specialization_code,
                "examType": exam_type,
                "examTrack": exam_type,
                "examName": exam_name,
                "displayName": exam_name,
                "categoryKey": category_key,
                "categoryName": category_name,
                "categoryExists": category_exists,
                "categoryEnabled": category_enabled,
                "hasValidCategoryBinding": category_exists and category_enabled,
                "isEnabled": is_enabled_value,
                "active": is_enabled_value,
                "sortOrder": int(row["module_sort_order"] or 100),
                "questionCount": int(row["question_count"] or 100),
                "examTimeMinutes": int(row["exam_time_minutes"] or 180),
                "nameZh": name_zh,
                "description": description,
                "practiceEnabled": bool(row["practice_enabled"]),
                "mockEnabled": bool(row["mock_enabled"]),
                "includedExamCodes": normalize_exam_code_list(row["included_exam_codes"]),
            }
        )

    payloads.sort(
        key=lambda item: (
            clean_text(item["industryKey"]),
            clean_text(item["examFamilyKey"]),
            clean_text(item["tradeCode"]),
            clean_text(item["examType"]),
            int(item["sortOrder"]),
            clean_text(item["examCode"]),
        )
    )
    return payloads


def get_exam_catalog_payload_by_code_from_structure(conn: sqlite3.Connection, exam_code: str) -> dict | None:
    target_code = normalize_exam_code(exam_code)
    if not target_code:
        return None
    rows = list_exam_catalog_from_structure(conn, enabled_only=False)
    for item in rows:
        if normalize_exam_code(item.get("examCode")) == target_code:
            return item
    return None


def get_structure_module_node_id(conn: sqlite3.Connection, exam_code: str) -> int | None:
    target_code = normalize_exam_code(exam_code)
    if not target_code:
        return None
    row = conn.execute(
        """
        SELECT mc.node_id
        FROM exam_module_configs mc
        WHERE LOWER(TRIM(mc.module_code)) = ?
        LIMIT 1
        """,
        (target_code,),
    ).fetchone()
    if not row:
        return None
    return int(row["node_id"])


def list_exam_structure_tree(conn: sqlite3.Connection) -> list[dict]:
    ensure_exam_structure_v1_tables(conn)
    ensure_exam_structure_v1_backfill(conn)
    rows = conn.execute(
        """
        SELECT
          n.id,
          n.parent_id,
          n.node_type,
          n.node_key,
          n.node_name,
          n.is_enabled,
          n.sort_order,
          mc.module_code,
          mc.category_key,
          mc.question_count,
          mc.exam_time_minutes,
          c.name AS category_name,
          CASE WHEN c.key IS NULL THEN 0 ELSE 1 END AS category_exists,
          COALESCE(c.is_enabled, 0) AS category_enabled,
          COALESCE(child_count.cnt, 0) AS child_count,
          COALESCE(question_count.cnt, 0) AS question_refs
        FROM exam_structure_nodes n
        LEFT JOIN exam_module_configs mc ON mc.node_id = n.id
        LEFT JOIN categories c ON c.key = mc.category_key
        LEFT JOIN (
          SELECT parent_id, COUNT(1) AS cnt
          FROM exam_structure_nodes
          GROUP BY parent_id
        ) child_count ON child_count.parent_id = n.id
        LEFT JOIN (
          SELECT
            LOWER(TRIM(COALESCE(exam_code, exam_id, ''))) AS exam_code_norm,
            COUNT(1) AS cnt
          FROM questions
          WHERE COALESCE(NULLIF(LOWER(TRIM(COALESCE(question_status, 'active'))), ''), 'active') IN ('active','inactive')
          GROUP BY LOWER(TRIM(COALESCE(exam_code, exam_id, '')))
        ) question_count ON question_count.exam_code_norm = LOWER(TRIM(COALESCE(mc.module_code, '')))
        ORDER BY
          CASE n.node_type
            WHEN 'program' THEN 0
            WHEN 'sub_item' THEN 1
            ELSE 2
          END ASC,
          n.sort_order ASC,
          n.id ASC
        """
    ).fetchall()

    node_map: dict[int, dict] = {}
    for row in rows:
        node_id = int(row["id"])
        parent_id = int(row["parent_id"]) if row["parent_id"] is not None else None
        node_type = clean_text(row["node_type"])
        module_code = normalize_exam_code(row["module_code"])
        child_count = int(row["child_count"] or 0)
        question_refs = int(row["question_refs"] or 0)
        can_delete = child_count == 0 and (node_type != "exam_module" or question_refs == 0)

        node_map[node_id] = {
            "id": node_id,
            "parentId": parent_id,
            "nodeType": node_type,
            "nodeKey": clean_text(row["node_key"]),
            "name": clean_text(row["node_name"]),
            "isEnabled": bool(row["is_enabled"]),
            "sortOrder": int(row["sort_order"] or 100),
            "moduleCode": module_code,
            "categoryKey": normalize_category_key(row["category_key"]),
            "categoryName": clean_text(row["category_name"]) or normalize_category_key(row["category_key"]),
            "categoryExists": bool(row["category_exists"]),
            "categoryEnabled": bool(row["category_enabled"]),
            "questionCount": int(row["question_count"] or 100),
            "examTimeMinutes": int(row["exam_time_minutes"] or 180),
            "childCount": child_count,
            "questionRefs": question_refs if node_type == "exam_module" else 0,
            "canDelete": can_delete,
            "children": [],
        }

    roots: list[dict] = []
    for node in node_map.values():
        parent_id = node["parentId"]
        if parent_id is None or parent_id not in node_map:
            roots.append(node)
        else:
            node_map[parent_id]["children"].append(node)

    type_rank = {"program": 0, "sub_item": 1, "exam_module": 2}

    def sort_nodes(items: list[dict]) -> None:
        items.sort(
            key=lambda item: (
                type_rank.get(str(item.get("nodeType")), 9),
                int(item.get("sortOrder") or 100),
                clean_text(item.get("name")),
                clean_text(item.get("nodeKey")),
                int(item.get("id") or 0),
            )
        )
        for child in items:
            sort_nodes(child["children"])

    sort_nodes(roots)
    return roots


def collect_structure_descendant_ids(conn: sqlite3.Connection, root_id: int) -> list[int]:
    pending = [int(root_id)]
    result: list[int] = []
    seen: set[int] = set()
    while pending:
        current = pending.pop()
        if current in seen:
            continue
        seen.add(current)
        result.append(current)
        children = conn.execute("SELECT id FROM exam_structure_nodes WHERE parent_id = ?", (current,)).fetchall()
        for row in children:
            pending.append(int(row["id"]))
    return result


def list_module_codes_by_node_ids(conn: sqlite3.Connection, node_ids: list[int]) -> list[str]:
    if not node_ids:
        return []
    placeholders = ",".join(["?"] * len(node_ids))
    rows = conn.execute(
        f"""
        SELECT module_code
        FROM exam_module_configs
        WHERE node_id IN ({placeholders})
        ORDER BY module_code ASC
        """,
        tuple(node_ids),
    ).fetchall()
    result: list[str] = []
    for row in rows:
        code = normalize_exam_code(row["module_code"])
        if code:
            result.append(code)
    return result


def sync_legacy_exam_catalog_mirror_for_module(conn: sqlite3.Connection, module_code: str) -> bool:
    payload = get_exam_catalog_payload_by_code_from_structure(conn, module_code)
    if not payload:
        return False
    sync_legacy_exam_catalog_mirror(
        conn,
        exam_code=payload["examCode"],
        industry_key=payload["industryKey"],
        industry_name=payload["industryName"],
        exam_family_key=payload["examFamilyKey"],
        exam_family_name=payload["examFamilyName"],
        trade_code=payload["tradeCode"],
        exam_type=payload["examType"],
        exam_name=payload["examName"],
        category_key=payload["categoryKey"],
        is_enabled=1 if payload["isEnabled"] else 0,
        sort_order=int(payload["sortOrder"] or 100),
        question_count=max(1, int(payload["questionCount"] or 100)),
        exam_time_minutes=max(1, int(payload["examTimeMinutes"] or 180)),
    )
    return True


def sync_legacy_exam_catalog_mirror(
    conn: sqlite3.Connection,
    *,
    exam_code: str,
    industry_key: str,
    industry_name: str,
    exam_family_key: str,
    exam_family_name: str,
    trade_code: str,
    exam_type: str,
    exam_name: str,
    category_key: str,
    is_enabled: int,
    sort_order: int,
    question_count: int,
    exam_time_minutes: int,
) -> None:
    # Step 6 compatibility mirror: keep legacy tables in sync while runtime still reads legacy source.
    ensure_default_exam_catalog(conn)
    now = now_iso()
    conn.execute(
        """
        INSERT INTO exam_catalog(
          exam_code, industry_key, industry_name, exam_family_key, exam_family_name, trade_code, exam_type,
          exam_name, category_key, is_enabled, sort_order, created_at, updated_at
        )
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT(exam_code) DO UPDATE SET
          industry_key=excluded.industry_key,
          industry_name=excluded.industry_name,
          exam_family_key=excluded.exam_family_key,
          exam_family_name=excluded.exam_family_name,
          trade_code=excluded.trade_code,
          exam_type=excluded.exam_type,
          exam_name=excluded.exam_name,
          category_key=excluded.category_key,
          is_enabled=excluded.is_enabled,
          sort_order=excluded.sort_order,
          updated_at=excluded.updated_at
        """,
        (
            exam_code,
            industry_key,
            industry_name,
            exam_family_key,
            exam_family_name,
            trade_code,
            exam_type,
            exam_name,
            category_key,
            is_enabled,
            sort_order,
            now,
            now,
        ),
    )
    conn.execute(
        """
        INSERT INTO exam_configs(
          exam_code, question_count, exam_time_minutes, practice_enabled, mock_enabled, included_exam_codes, updated_at
        )
        VALUES(?,?,?,?,?,?,?)
        ON CONFLICT(exam_code) DO UPDATE SET
          question_count=excluded.question_count,
          exam_time_minutes=excluded.exam_time_minutes,
          updated_at=excluded.updated_at
        """,
        (exam_code, question_count, exam_time_minutes, 1, 1, "[]", now),
    )
    deleted_default_codes = load_deleted_default_exam_codes(conn)
    if exam_code in deleted_default_codes:
        deleted_default_codes.discard(exam_code)
        save_deleted_default_exam_codes(conn, deleted_default_codes)


def delete_legacy_exam_catalog_mirror(conn: sqlite3.Connection, exam_code: str) -> bool:
    ensure_default_exam_catalog(conn)
    default_codes = default_exam_code_set()
    deleted_default_codes = load_deleted_default_exam_codes(conn)
    tombstoned_default = False
    if exam_code in default_codes:
        deleted_default_codes.add(exam_code)
        save_deleted_default_exam_codes(conn, deleted_default_codes)
        tombstoned_default = True
    conn.execute("DELETE FROM exam_configs WHERE exam_code = ?", (exam_code,))
    conn.execute("DELETE FROM exam_catalog WHERE exam_code = ?", (exam_code,))
    return tombstoned_default


def normalize_exam_catalog_payload(row: sqlite3.Row) -> dict:
    exam_type = normalize_exam_type(row["exam_type"])
    specialization_code = normalize_specialization_code(row["trade_code"])
    if exam_type == "law_business":
        specialization_code = ""
    return {
        "examCode": row["exam_code"],
        "industryKey": row["industry_key"],
        "industryName": row["industry_name"],
        "programCode": row["industry_key"],
        "programName": row["industry_name"],
        "examFamilyKey": row["exam_family_key"],
        "examFamilyName": row["exam_family_name"],
        "licenseGroup": row["exam_family_key"],
        "licenseGroupName": row["exam_family_name"],
        "tradeCode": specialization_code,
        "specializationCode": specialization_code,
        "examType": exam_type,
        "examTrack": exam_type,
        "examName": row["exam_name"],
        "displayName": row["exam_name"],
        "categoryKey": row["category_key"],
        "categoryName": clean_text(row["category_name"]) or clean_text(row["category_key"]),
        "categoryExists": bool(row["category_exists"]),
        "categoryEnabled": bool(row["category_enabled"]),
        "hasValidCategoryBinding": bool(row["category_exists"]) and bool(row["category_enabled"]),
        "isEnabled": bool(row["is_enabled"]),
        "active": bool(row["is_enabled"]),
        "sortOrder": int(row["sort_order"] or 100),
        "questionCount": int(row["question_count"] or 100),
        "examTimeMinutes": int(row["exam_time_minutes"] or 180),
        "practiceEnabled": bool(row["practice_enabled"]) if "practice_enabled" in row.keys() else True,
        "mockEnabled": bool(row["mock_enabled"]) if "mock_enabled" in row.keys() else True,
        "includedExamCodes": normalize_exam_code_list(
            row["included_exam_codes"] if "included_exam_codes" in row.keys() else None
        ),
    }


def normalize_exam_code_list(value) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        raw_list = value
    else:
        text = clean_text(value)
        if not text:
            return []
        try:
            parsed = json.loads(text)
            raw_list = parsed if isinstance(parsed, list) else [item.strip() for item in text.split(",")]
        except json.JSONDecodeError:
            raw_list = [item.strip() for item in text.split(",")]
    out: list[str] = []
    seen: set[str] = set()
    for item in raw_list:
        code = normalize_exam_code(item)
        if not code or code in seen:
            continue
        seen.add(code)
        out.append(code)
    return out


def dump_exam_code_list(value) -> str:
    return json.dumps(normalize_exam_code_list(value), ensure_ascii=False)


def normalize_assignment_exam_code(value: str | None) -> str:
    text = clean_text(value).upper().replace("-", "_").replace(" ", "_")
    return re.sub(r"[^A-Z0-9_]", "", text)


def normalize_assignment_exam_code_list(value) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        raw_list = value
    else:
        text = clean_text(value)
        if not text:
            return []
        try:
            parsed = json.loads(text)
            raw_list = parsed if isinstance(parsed, list) else [item.strip() for item in text.split(",")]
        except json.JSONDecodeError:
            raw_list = [item.strip() for item in text.split(",")]
    out: list[str] = []
    seen: set[str] = set()
    for item in raw_list:
        code = normalize_assignment_exam_code(item)
        if not code or code in seen:
            continue
        seen.add(code)
        out.append(code)
    return out


def dump_assignment_exam_code_list(value) -> str:
    return json.dumps(normalize_assignment_exam_code_list(value), ensure_ascii=False)


def normalize_membership_visibility_list(value) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        raw_list = value
    else:
        text = clean_text(value)
        if not text:
            return []
        try:
            parsed = json.loads(text)
            raw_list = parsed if isinstance(parsed, list) else [item.strip() for item in text.split(",")]
        except json.JSONDecodeError:
            raw_list = [item.strip() for item in text.split(",")]
    out: list[str] = []
    seen: set[str] = set()
    for item in raw_list:
        tier = normalize_membership_tier(item, None)
        if not tier or tier in seen:
            continue
        seen.add(tier)
        out.append(tier)
    return out


def dump_membership_visibility_list(value) -> str:
    return json.dumps(normalize_membership_visibility_list(value), ensure_ascii=False)


def normalize_json_obj(value) -> dict:
    if isinstance(value, dict):
        return value
    text = clean_text(value)
    if not text:
        return {}
    try:
        parsed = json.loads(text)
        return parsed if isinstance(parsed, dict) else {}
    except json.JSONDecodeError:
        return {}


def ensure_exam_categories_defaults(conn: sqlite3.Connection) -> None:
    ensure_exam_catalog_tables(conn)
    existing_count_row = conn.execute("SELECT COUNT(1) AS cnt FROM exam_categories").fetchone()
    existing_count = int(existing_count_row["cnt"] or 0) if existing_count_row else 0
    now = now_iso()

    for exam in DEFAULT_EXAMS_V2:
        code = normalize_exam_code(exam.get("code"))
        if not code:
            continue
        cfg = conn.execute(
            """
            SELECT exam_code FROM exam_configs WHERE exam_code = ?
            """,
            (code,),
        ).fetchone()
        if not cfg:
            conn.execute(
                """
                INSERT INTO exam_configs(
                  exam_code, question_count, exam_time_minutes, practice_enabled, mock_enabled, included_exam_codes, updated_at
                )
                VALUES(?,?,?,?,?,?,?)
                """,
                (
                    code,
                    max(1, to_int(exam.get("mock_question_count"), 100)),
                    max(1, to_int(exam.get("mock_time_limit_minutes"), 180)),
                    to_bool_int(exam.get("practice_enabled"), 1),
                    to_bool_int(exam.get("mock_enabled"), 1),
                    dump_exam_code_list(exam.get("included_exam_codes") or []),
                    now,
                ),
            )
        conn.execute(
            """
            UPDATE exam_catalog
            SET name_zh = COALESCE(NULLIF(TRIM(name_zh), ''), ?),
                description = COALESCE(NULLIF(TRIM(description), ''), ?)
            WHERE exam_code = ?
            """,
            (
                clean_text(exam.get("name_zh")),
                clean_text(exam.get("description")),
                code,
            ),
        )
        conn.execute(
            """
            UPDATE exam_configs
            SET practice_enabled = COALESCE(practice_enabled, 1),
                mock_enabled = COALESCE(mock_enabled, 1),
                included_exam_codes = CASE
                  WHEN included_exam_codes IS NULL OR TRIM(included_exam_codes) = '' THEN ?
                  ELSE included_exam_codes
                END,
                updated_at = CASE
                  WHEN included_exam_codes IS NULL OR TRIM(included_exam_codes) = '' THEN ?
                  ELSE updated_at
                END
            WHERE exam_code = ?
            """,
            (
                dump_exam_code_list(exam.get("included_exam_codes") or []),
                now,
                code,
            ),
        )

    if existing_count > 0:
        # Already customized by admin/import; only ensure UNCATEGORIZED exists per exam.
        exam_rows = conn.execute("SELECT exam_code FROM exam_catalog").fetchall()
        for row in exam_rows:
            exam_code = normalize_exam_code(row["exam_code"])
            if not exam_code:
                continue
            uncategorized_code = f"{exam_code}__UNCATEGORIZED"
            conn.execute(
                """
                INSERT OR IGNORE INTO exam_categories(
                  code, exam_code, name, name_zh, description, sort_order, is_active, created_at, updated_at
                )
                VALUES(?,?,?,?,?,?,?,?,?)
                """,
                (
                    uncategorized_code,
                    exam_code,
                    "UNCATEGORIZED",
                    "未分类",
                    "Default fallback category.",
                    9999,
                    1,
                    now,
                    now,
                ),
            )
        return

    for exam in DEFAULT_EXAMS_V2:
        exam_code = normalize_exam_code(exam.get("code"))
        if not exam_code:
            continue
        categories = DEFAULT_EXAM_CATEGORIES_V2.get(exam_code, [])
        sort_order = 10
        for code, name, name_zh in categories:
            cat_code = clean_text(code).upper()
            if not cat_code:
                continue
            conn.execute(
                """
                INSERT OR IGNORE INTO exam_categories(
                  code, exam_code, name, name_zh, description, sort_order, is_active, created_at, updated_at
                )
                VALUES(?,?,?,?,?,?,?,?,?)
                """,
                (
                    cat_code,
                    exam_code,
                    clean_text(name) or cat_code,
                    clean_text(name_zh),
                    "",
                    sort_order,
                    1,
                    now,
                    now,
                ),
            )
            sort_order += 10
        conn.execute(
            """
            INSERT OR IGNORE INTO exam_categories(
              code, exam_code, name, name_zh, description, sort_order, is_active, created_at, updated_at
            )
            VALUES(?,?,?,?,?,?,?,?,?)
            """,
            (
                f"{exam_code}__UNCATEGORIZED",
                exam_code,
                "UNCATEGORIZED",
                "未分类",
                "Default fallback category.",
                9999,
                1,
                now,
                now,
            ),
        )


def list_exam_categories(
    conn: sqlite3.Connection, *, exam_code: str | None = None, active_only: bool = False
) -> list[sqlite3.Row]:
    where_clauses: list[str] = []
    params: list = []
    if exam_code:
        where_clauses.append("LOWER(TRIM(ec.exam_code)) = ?")
        params.append(normalize_exam_code(exam_code))
    if active_only:
        where_clauses.append("ec.is_active = 1")
    where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""
    return conn.execute(
        f"""
        SELECT ec.code, ec.exam_code, ec.name, ec.name_zh, ec.description, ec.sort_order, ec.is_active
        FROM exam_categories ec
        {where_sql}
        ORDER BY ec.exam_code ASC, ec.sort_order ASC, ec.code ASC
        """,
        params,
    ).fetchall()


def normalize_exam_category_payload(row: sqlite3.Row) -> dict:
    return {
        "code": clean_text(row["code"]),
        "examCode": normalize_exam_code(row["exam_code"]),
        "name": clean_text(row["name"]),
        "nameZh": clean_text(row["name_zh"]),
        "description": clean_text(row["description"]),
        "sortOrder": int(row["sort_order"] or 100),
        "isActive": bool(row["is_active"]),
    }


def ensure_user_category_entitlements(conn: sqlite3.Connection) -> None:
    ensure_user_category_entitlement_columns(conn)

    conn.execute(
        """
        INSERT OR IGNORE INTO user_category_entitlements(user_id, category_key, has_access, expires_at, updated_at)
        SELECT
          u.id,
          c.key,
          CASE WHEN u.membership_tier IN ('basic_399','pro_599','ai_999') THEN 1 ELSE 0 END,
          CASE WHEN u.membership_tier IN ('basic_399','pro_599','ai_999') THEN ? ELSE NULL END,
          ?
        FROM users u
        CROSS JOIN categories c
        """,
        (FAR_FUTURE_EXPIRES_AT, now_iso()),
    )

    migrated = conn.execute(
        "SELECT value FROM settings WHERE key = ?",
        (CATEGORY_MIGRATION_SETTING_KEY,),
    ).fetchone()
    ensure_entitlement_expiry_backfill(conn)
    if migrated:
        return

    conn.execute(
        """
        UPDATE user_category_entitlements
        SET has_access = (
          CASE category_key
            WHEN 'b_license' THEN COALESCE(
              (SELECT ue.b_license_access FROM user_entitlements ue WHERE ue.user_id = user_category_entitlements.user_id),
              has_access
            )
            WHEN 'c_license' THEN COALESCE(
              (SELECT ue.c_license_access FROM user_entitlements ue WHERE ue.user_id = user_category_entitlements.user_id),
              has_access
            )
            ELSE has_access
          END
        )
        WHERE category_key IN ('b_license', 'c_license')
        """
    )
    conn.execute(
        """
        UPDATE user_category_entitlements
        SET expires_at = CASE
          WHEN has_access = 1 THEN COALESCE(NULLIF(TRIM(expires_at), ''), ?)
          ELSE NULL
        END
        WHERE category_key IN ('b_license', 'c_license')
        """,
        (FAR_FUTURE_EXPIRES_AT,),
    )
    conn.execute(
        """
        INSERT INTO settings(key, value, updated_at)
        VALUES(?,?,?)
        ON CONFLICT(key) DO UPDATE SET
          value=excluded.value,
          updated_at=excluded.updated_at
        """,
        (CATEGORY_MIGRATION_SETTING_KEY, now_iso(), now_iso()),
    )


def get_user_category_entitlement_details(conn: sqlite3.Connection, user_id: int, *, plan: str) -> tuple[dict[str, bool], dict[str, dict]]:
    ensure_user_category_entitlements(conn)
    rows = conn.execute(
        """
        SELECT
          c.key,
          COALESCE(uce.has_access, CASE WHEN ?='paid' THEN 1 ELSE 0 END) AS has_access,
          uce.expires_at
        FROM categories c
        LEFT JOIN user_category_entitlements uce
          ON uce.category_key = c.key AND uce.user_id = ?
        ORDER BY c.sort_order ASC, c.key ASC
        """,
        (plan, user_id),
    ).fetchall()
    active_map: dict[str, bool] = {}
    details_map: dict[str, dict] = {}
    for row in rows:
        key = row["key"]
        has_access = bool(row["has_access"])
        expires_at = normalize_expires_at(row["expires_at"])
        is_active, is_expired = compute_entitlement_state(has_access, expires_at)
        active_map[key] = is_active
        details_map[key] = {
            "hasAccess": has_access,
            "expiresAt": expires_at,
            "isActive": is_active,
            "isExpired": is_expired,
        }
    return active_map, details_map


def get_user_category_entitlements(conn: sqlite3.Connection, user_id: int, *, plan: str) -> dict[str, bool]:
    active_map, _ = get_user_category_entitlement_details(conn, user_id, plan=plan)
    return active_map


def normalize_category_payload(row: sqlite3.Row) -> dict:
    return {
        "key": row["key"],
        "name": row["name"],
        "isEnabled": bool(row["is_enabled"]),
        "sortOrder": int(row["sort_order"] or 0),
    }


def derive_exam_family_from_code(exam_code: str) -> tuple[str, str]:
    code = normalize_exam_code(exam_code)
    if code.startswith("c"):
        return ("c_specialty", "C Specialty")
    return ("b_general", "B General Building")


def derive_trade_code_from_exam(exam_code: str, exam_family_key: str = "") -> str:
    code = normalize_exam_code(exam_code)
    family = normalize_hierarchy_key(exam_family_key)
    if code.startswith("c10"):
        return "c10_electrical"
    if code.startswith("c36"):
        return "c36_plumbing"
    if code.startswith("c20"):
        return "c20_hvac"
    if code.startswith("c27"):
        return "c27_landscaping"
    if code.startswith("c33"):
        return "c33_painting"
    if "general_b" in code or code == "ca_general_b":
        return CONTRACTOR_B_SUB_ITEM_KEY
    if family == "c_specialty":
        return code or "c_specialty"
    return CONTRACTOR_B_SUB_ITEM_KEY


def normalize_sub_item_key_for_structure(industry_key: str, exam_family_key: str, trade_code: str) -> str:
    industry = normalize_hierarchy_key(industry_key)
    family = normalize_hierarchy_key(exam_family_key)
    trade = normalize_trade_code(trade_code)
    if industry == CONTRACTOR_PROGRAM_KEY and family == CONTRACTOR_B_FAMILY_KEY:
        return CONTRACTOR_B_SUB_ITEM_KEY
    return trade


def derive_exam_code_from_structure(exam_family_key: str, trade_code: str, exam_type: str) -> str:
    family = normalize_hierarchy_key(exam_family_key)
    trade = normalize_trade_code(trade_code)
    normalized_type = normalize_exam_type(exam_type, "trade")
    if normalized_type == "law_business":
        base = family or "general"
        return normalize_exam_code(f"{base}_law_business")
    base = trade or family or "general_trade"
    return normalize_exam_code(base)


def derive_exam_type_from_exam(exam_code: str, exam_name: str = "") -> str:
    code = normalize_exam_code(exam_code)
    name = clean_text(exam_name).lower()
    if "law" in code or "business" in code or "law" in name or "business" in name:
        return "law_business"
    return "trade"


def normalize_exam_catalog_record(item: sqlite3.Row | dict | None) -> dict:
    if not item:
        return {}
    get = item.get if isinstance(item, dict) else lambda key, default=None: item[key] if key in item.keys() else default
    exam_code = normalize_exam_code(get("exam_code") or get("examCode"))
    if not exam_code:
        return {}
    question_count = max(1, to_int(get("question_count") or get("questionCount"), 100))
    exam_time_minutes = max(1, to_int(get("exam_time_minutes") or get("examTimeMinutes"), 180))
    industry_key = normalize_hierarchy_key(get("industry_key") or get("industryKey")) or "general"
    exam_family_key = normalize_hierarchy_key(get("exam_family_key") or get("examFamilyKey"))
    if not exam_family_key:
        exam_family_key, _ = derive_exam_family_from_code(exam_code)
    raw_trade_code = normalize_trade_code(
        get("specialization_code")
        or get("specializationCode")
        or get("trade_code")
        or get("tradeCode")
    )
    exam_type = normalize_exam_type(
        get("exam_track") or get("examTrack") or get("exam_type") or get("examType"),
        derive_exam_type_from_exam(exam_code, clean_text(get("exam_name") or get("examName"))),
    )
    trade_code = raw_trade_code
    if not trade_code and exam_type != "law_business":
        trade_code = derive_trade_code_from_exam(exam_code, exam_family_key)
    if exam_type == "law_business":
        trade_code = ""
    exam_family_name = clean_text(get("exam_family_name") or get("examFamilyName"))
    if not exam_family_name:
        _, exam_family_name = derive_exam_family_from_code(exam_code)
    return {
        "exam_code": exam_code,
        "industry_key": industry_key,
        "industry_name": clean_text(get("industry_name") or get("industryName")) or "General License",
        "exam_family_key": exam_family_key,
        "exam_family_name": exam_family_name,
        "trade_code": trade_code,
        "exam_type": exam_type,
        "exam_name": clean_text(get("exam_name") or get("examName")) or exam_code,
        "category_key": normalize_category_key(get("category_key") or get("categoryKey")) or "b_license",
        "is_enabled": 1 if to_bool_int(get("is_enabled") or get("isEnabled"), 1) else 0,
        "sort_order": to_int(get("sort_order") or get("sortOrder"), 100),
        "question_count": question_count,
        "exam_time_minutes": exam_time_minutes,
    }


def build_exam_catalog_map(rows: list[sqlite3.Row] | list[dict]) -> dict[str, dict]:
    mapped: dict[str, dict] = {}
    for row in rows:
        normalized = normalize_exam_catalog_record(row)
        code = normalized.get("exam_code")
        if not code:
            continue
        mapped[code] = normalized
    return mapped


def normalize_bank_hierarchy_and_status(bank: dict, exam_catalog_map: dict[str, dict]) -> bool:
    changed = False
    industries = bank.get("industries")
    if not isinstance(industries, list):
        return False

    for industry in industries:
        if not isinstance(industry, dict):
            continue
        exams = industry.get("exams")
        if not isinstance(exams, list):
            industry["exams"] = []
            exams = industry["exams"]
            changed = True

        for exam in exams:
            if not isinstance(exam, dict):
                continue
            exam_code = normalize_exam_code(exam.get("examCode") or exam.get("id"))
            if not exam_code:
                exam_code = normalize_exam_code(exam.get("name")) or "general_exam"
            catalog = exam_catalog_map.get(exam_code, {})

            exam_family_key = normalize_hierarchy_key(exam.get("examFamilyKey") or catalog.get("exam_family_key"))
            exam_family_name = clean_text(exam.get("examFamilyName") or catalog.get("exam_family_name"))
            if not exam_family_key:
                exam_family_key, fallback_family_name = derive_exam_family_from_code(exam_code)
                if not exam_family_name:
                    exam_family_name = fallback_family_name
            if not exam_family_name:
                _, exam_family_name = derive_exam_family_from_code(exam_code)
            exam_type = normalize_exam_type(
                exam.get("examTrack") or exam.get("examType") or catalog.get("exam_type"),
                derive_exam_type_from_exam(exam_code, clean_text(exam.get("name") or catalog.get("exam_name"))),
            )
            trade_code = normalize_trade_code(
                exam.get("specializationCode") or exam.get("tradeCode") or catalog.get("trade_code")
            )
            if not trade_code and exam_type != "law_business":
                trade_code = derive_trade_code_from_exam(exam_code, exam_family_key)
            if exam_type == "law_business":
                trade_code = ""

            simulation = exam.get("simulation") if isinstance(exam.get("simulation"), dict) else {}
            question_count = max(
                1,
                to_int(
                    simulation.get("questionCount")
                    or exam.get("questionCount")
                    or catalog.get("question_count"),
                    100,
                ),
            )
            exam_time_minutes = max(
                1,
                to_int(
                    simulation.get("examTimeMinutes")
                    or simulation.get("minutes")
                    or exam.get("examTimeMinutes")
                    or exam.get("minutes")
                    or catalog.get("exam_time_minutes"),
                    180,
                ),
            )
            category_key = normalize_category_key(
                exam.get("categoryKey") or catalog.get("category_key") or ""
            )

            exam_updates = {
                "id": exam_code,
                "examCode": exam_code,
                "programCode": industry.get("id"),
                "examFamilyKey": exam_family_key,
                "licenseGroup": exam_family_key,
                "examFamilyName": exam_family_name,
                "licenseGroupName": exam_family_name,
                "tradeCode": trade_code,
                "specializationCode": trade_code,
                "examType": exam_type,
                "examTrack": exam_type,
                "questionCount": question_count,
                "examTimeMinutes": exam_time_minutes,
                "simulation": {"questionCount": question_count, "examTimeMinutes": exam_time_minutes},
            }
            if category_key:
                exam_updates["categoryKey"] = category_key
            if "exam_name" in catalog and clean_text(catalog.get("exam_name")):
                exam_updates["name"] = clean_text(catalog.get("exam_name"))

            for key, value in exam_updates.items():
                if exam.get(key) != value:
                    exam[key] = value
                    changed = True

            questions = exam.get("questions")
            if not isinstance(questions, list):
                exam["questions"] = []
                questions = exam["questions"]
                changed = True

            for question in questions:
                if not isinstance(question, dict):
                    continue
                status = normalize_question_status(
                    question.get("status") or question.get("questionStatus") or question.get("question_status"),
                    "active",
                )
                if question.get("status") != status:
                    question["status"] = status
                    changed = True
                if "questionStatus" in question:
                    question.pop("questionStatus", None)
                    changed = True
                if question.get("examCode") != exam_code:
                    question["examCode"] = exam_code
                    changed = True
                if question.get("programCode") != industry.get("id"):
                    question["programCode"] = industry.get("id")
                    changed = True
                if question.get("examFamilyKey") != exam_family_key:
                    question["examFamilyKey"] = exam_family_key
                    changed = True
                if question.get("licenseGroup") != exam_family_key:
                    question["licenseGroup"] = exam_family_key
                    changed = True
                if question.get("tradeCode") != trade_code:
                    question["tradeCode"] = trade_code
                    changed = True
                if question.get("specializationCode") != trade_code:
                    question["specializationCode"] = trade_code
                    changed = True
                if normalize_exam_type(question.get("examTrack"), exam_type) != exam_type:
                    question["examTrack"] = exam_type
                    changed = True
                if normalize_exam_type(question.get("examType"), exam_type) != exam_type or question.get("examType") != exam_type:
                    question["examType"] = exam_type
                    changed = True
                if category_key and question.get("categoryKey") != category_key:
                    question["categoryKey"] = category_key
                    changed = True
                if category_key and question.get("questionCategory") != category_key:
                    question["questionCategory"] = category_key
                    changed = True

        deduped_exams: list[dict] = []
        dedup_index: dict[str, int] = {}
        for exam in exams:
            if not isinstance(exam, dict):
                continue
            exam_code = normalize_exam_code(exam.get("examCode") or exam.get("id"))
            dedup_key = exam_code or f"__raw_{len(deduped_exams)}"
            if dedup_key not in dedup_index:
                dedup_index[dedup_key] = len(deduped_exams)
                deduped_exams.append(exam)
                continue

            changed = True
            primary = deduped_exams[dedup_index[dedup_key]]
            primary_questions = primary.get("questions")
            if not isinstance(primary_questions, list):
                primary_questions = []
                primary["questions"] = primary_questions
            source_questions = exam.get("questions")
            if not isinstance(source_questions, list):
                source_questions = []

            question_pos: dict[str, int] = {}
            for idx, q in enumerate(primary_questions):
                if not isinstance(q, dict):
                    continue
                qid = clean_text(q.get("id"))
                if qid:
                    question_pos[qid] = idx

            for q in source_questions:
                if not isinstance(q, dict):
                    continue
                qid = clean_text(q.get("id"))
                if not qid:
                    continue
                if qid in question_pos:
                    pos = question_pos[qid]
                    if primary_questions[pos] != q:
                        primary_questions[pos] = q
                else:
                    question_pos[qid] = len(primary_questions)
                    primary_questions.append(q)

        if len(deduped_exams) != len(exams):
            industry["exams"] = deduped_exams

    global_seen: dict[str, dict] = {}
    for industry in industries:
        if not isinstance(industry, dict):
            continue
        exams = industry.get("exams")
        if not isinstance(exams, list):
            continue
        kept_exams: list[dict] = []
        for exam in exams:
            if not isinstance(exam, dict):
                continue
            exam_code = normalize_exam_code(exam.get("examCode") or exam.get("id"))
            if not exam_code:
                kept_exams.append(exam)
                continue
            if exam_code not in global_seen:
                global_seen[exam_code] = exam
                kept_exams.append(exam)
                continue

            changed = True
            primary = global_seen[exam_code]
            for key in ("name", "categoryKey", "examFamilyKey", "examFamilyName", "questionCount", "examTimeMinutes", "simulation"):
                if (primary.get(key) in (None, "", [], {})) and exam.get(key) not in (None, "", [], {}):
                    primary[key] = exam.get(key)

            primary_questions = primary.get("questions")
            if not isinstance(primary_questions, list):
                primary_questions = []
                primary["questions"] = primary_questions
            source_questions = exam.get("questions")
            if not isinstance(source_questions, list):
                source_questions = []

            question_pos: dict[str, int] = {}
            for idx, q in enumerate(primary_questions):
                if not isinstance(q, dict):
                    continue
                qid = clean_text(q.get("id"))
                if qid:
                    question_pos[qid] = idx
            for q in source_questions:
                if not isinstance(q, dict):
                    continue
                qid = clean_text(q.get("id"))
                if not qid:
                    continue
                if qid in question_pos:
                    pos = question_pos[qid]
                    if primary_questions[pos] != q:
                        primary_questions[pos] = q
                else:
                    question_pos[qid] = len(primary_questions)
                    primary_questions.append(q)

        if len(kept_exams) != len(exams):
            industry["exams"] = kept_exams

    return changed


def normalize_shared_law_business_exams(bank: dict) -> bool:
    changed = False
    industries = bank.get("industries")
    if not isinstance(industries, list):
        return False

    for industry in industries:
        if not isinstance(industry, dict):
            continue
        exams = industry.get("exams")
        if not isinstance(exams, list):
            continue

        kept_exams: list[dict] = []
        families: dict[str, list[dict]] = {}
        for exam in exams:
            if not isinstance(exam, dict):
                continue
            family_key = normalize_hierarchy_key(exam.get("examFamilyKey")) or "general"
            families.setdefault(family_key, []).append(exam)

        for family_key, family_exams in families.items():
            law_exams = [
                exam
                for exam in family_exams
                if normalize_exam_type(exam.get("examTrack") or exam.get("examType"), "trade") == "law_business"
            ]
            if not law_exams:
                kept_exams.extend(family_exams)
                continue

            target_code = normalize_exam_code(f"{family_key}_law_business") or "law_business"
            target_exam = None
            for exam in law_exams:
                code = normalize_exam_code(exam.get("examCode") or exam.get("id"))
                if code == target_code:
                    target_exam = exam
                    break
            if target_exam is None:
                target_exam = law_exams[0]
                changed = True

            target_exam["id"] = target_code
            target_exam["examCode"] = target_code
            target_exam["name"] = clean_text(target_exam.get("name")) or "Law & Business"
            target_exam["programCode"] = clean_text(industry.get("id"))
            target_exam["examFamilyKey"] = family_key
            target_exam["licenseGroup"] = family_key
            target_exam["examFamilyName"] = clean_text(target_exam.get("examFamilyName")) or clean_text(
                target_exam.get("licenseGroupName")
            )
            target_exam["licenseGroupName"] = clean_text(target_exam.get("examFamilyName"))
            target_exam["tradeCode"] = ""
            target_exam["specializationCode"] = ""
            target_exam["examType"] = "law_business"
            target_exam["examTrack"] = "law_business"
            if not isinstance(target_exam.get("questions"), list):
                target_exam["questions"] = []
            if "simulation" not in target_exam or not isinstance(target_exam.get("simulation"), dict):
                target_exam["simulation"] = {
                    "questionCount": max(1, to_int(target_exam.get("questionCount"), 115)),
                    "examTimeMinutes": max(1, to_int(target_exam.get("examTimeMinutes"), 210)),
                }
                changed = True

            for source_exam in law_exams:
                source_questions = source_exam.get("questions")
                if not isinstance(source_questions, list):
                    continue
                for question in source_questions:
                    if not isinstance(question, dict):
                        continue
                    question["examCode"] = target_code
                    question["examFamilyKey"] = family_key
                    question["licenseGroup"] = family_key
                    question["tradeCode"] = ""
                    question["specializationCode"] = ""
                    question["examType"] = "law_business"
                    question["examTrack"] = "law_business"
                    upsert_question(target_exam, question)
                if source_exam is not target_exam:
                    changed = True

            for exam in family_exams:
                if exam in law_exams and exam is not target_exam:
                    continue
                kept_exams.append(exam)
            if target_exam not in kept_exams:
                kept_exams.append(target_exam)

        if len(kept_exams) != len(exams):
            changed = True
        industry["exams"] = kept_exams

    return changed


def build_runtime_bank(bank: dict, *, enabled_exam_codes: set[str] | None = None) -> dict:
    industries_out: list[dict] = []
    for industry in bank.get("industries", []):
        if not isinstance(industry, dict):
            continue
        exams_out: list[dict] = []
        for exam in industry.get("exams", []):
            if not isinstance(exam, dict):
                continue
            exam_code = normalize_exam_code(exam.get("examCode") or exam.get("id"))
            if enabled_exam_codes is not None and exam_code and exam_code not in enabled_exam_codes:
                continue

            questions_out: list[dict] = []
            for question in exam.get("questions", []):
                if not isinstance(question, dict):
                    continue
                status = normalize_question_status(
                    question.get("status") or question.get("questionStatus") or question.get("question_status"),
                    "active",
                )
                if status != "active":
                    continue
                q = dict(question)
                q["status"] = status
                questions_out.append(q)

            if not questions_out:
                continue

            e = dict(exam)
            e["questions"] = questions_out
            exams_out.append(e)

        if not exams_out:
            continue

        ind = dict(industry)
        ind["exams"] = exams_out
        industries_out.append(ind)

    return {"industries": industries_out}


def required_category_for_exam(exam: dict) -> str | None:
    category_key = str(exam.get("categoryKey") or "").strip().lower()
    if category_key:
        return category_key

    required = required_entitlement_for_exam(exam)
    if required == "bLicenseAccess":
        return "b_license"
    if required == "cLicenseAccess":
        return "c_license"
    return None


def required_category_for_question(exam: dict, question: dict) -> str | None:
    q_key = str(question.get("categoryKey") or "").strip().lower()
    if q_key:
        return q_key
    return required_category_for_exam(exam)


def user_has_category_access(
    category_key: str,
    *,
    category_entitlements: dict[str, bool],
    legacy_entitlements: dict | None,
    enabled_categories: set[str],
) -> bool:
    if category_key not in enabled_categories:
        return False
    if category_key in category_entitlements:
        return bool(category_entitlements[category_key])
    if legacy_entitlements:
        if category_key == "b_license":
            return bool(legacy_entitlements.get("bLicenseAccess"))
        if category_key == "c_license":
            return bool(legacy_entitlements.get("cLicenseAccess"))
    return False


def required_entitlement_for_exam(exam: dict) -> str | None:
    exam_id = str(exam.get("id") or "").strip().lower()
    exam_name = str(exam.get("name") or "").strip().lower()

    if "general-b" in exam_id or "general_b" in exam_id or "general b" in exam_name:
        return "bLicenseAccess"

    if re.search(r"(^|[-_])c\d+", exam_id) or re.search(r"\bc[-\s]?\d+\b", exam_name):
        return "cLicenseAccess"

    return None


def filter_bank_for_paid_user(
    bank: dict,
    *,
    category_entitlements: dict[str, bool],
    legacy_entitlements: dict | None,
    enabled_categories: set[str],
    content_permissions: dict[str, bool],
) -> dict:
    def sanitize_question(question: dict) -> dict:
        return sanitize_question_by_content_permissions(question, content_permissions)

    industries = []
    for industry in bank.get("industries", []):
        exams = []
        for exam in industry.get("exams", []):
            questions = []
            for question in exam.get("questions", []):
                category_key = required_category_for_question(exam, question)
                if category_key and not user_has_category_access(
                    category_key,
                    category_entitlements=category_entitlements,
                    legacy_entitlements=legacy_entitlements,
                    enabled_categories=enabled_categories,
                ):
                    continue
                questions.append(sanitize_question(question))

            if not questions:
                continue

            cloned_exam = dict(exam)
            cloned_exam["questions"] = questions
            exams.append(cloned_exam)

        cloned = dict(industry)
        cloned["exams"] = exams
        industries.append(cloned)

    return {"industries": industries}


def sanitize_question_by_content_permissions(question: dict, permissions: dict[str, bool]) -> dict:
    bilingual_enabled = bool((permissions or {}).get("bilingualEnabled"))
    explanation_enabled = bool((permissions or {}).get("explanationEnabled"))
    memory_tips_enabled = bool((permissions or {}).get("memoryTipsEnabled"))

    cleaned = dict(question)
    if not bilingual_enabled:
        for key in ZH_SUPPORT_FIELD_KEYS:
            cleaned.pop(key, None)
    if not explanation_enabled:
        for key in EXPLANATION_SUPPORT_FIELD_KEYS:
            cleaned.pop(key, None)
    if not memory_tips_enabled:
        for key in MEMORY_SUPPORT_FIELD_KEYS:
            cleaned.pop(key, None)

    i18n = cleaned.get("i18n")
    if isinstance(i18n, dict):
        next_i18n = dict(i18n)
        if not bilingual_enabled:
            next_i18n.pop("zh", None)
        else:
            zh_locale = next_i18n.get("zh")
            if isinstance(zh_locale, dict):
                zh_next = dict(zh_locale)
                if not explanation_enabled:
                    zh_next.pop("explanation", None)
                if not memory_tips_enabled:
                    for key in ("keyPoint", "answerReasoning", "vocab", "memoryTip"):
                        zh_next.pop(key, None)
                next_i18n["zh"] = zh_next

        en_locale = next_i18n.get("en")
        if isinstance(en_locale, dict):
            en_next = dict(en_locale)
            if not explanation_enabled:
                en_next.pop("explanation", None)
            if not memory_tips_enabled:
                for key in ("keyPoint", "answerReasoning", "memoryTrick"):
                    en_next.pop(key, None)
            next_i18n["en"] = en_next
        cleaned["i18n"] = next_i18n

    return cleaned


def build_trial_safe_bank(bank: dict, *, max_questions: int = 10) -> dict:
    remaining = max(0, int(max_questions or 0))
    if remaining <= 0:
        return {"industries": []}

    free_permissions = content_permission_defaults_for_tier("free")

    def sanitize_question(question: dict) -> dict:
        return sanitize_question_by_content_permissions(question, free_permissions)

    industries_out: list[dict] = []
    for industry in bank.get("industries", []):
        if remaining <= 0:
            break
        if not isinstance(industry, dict):
            continue
        exams_out: list[dict] = []
        for exam in industry.get("exams", []):
            if remaining <= 0:
                break
            if not isinstance(exam, dict):
                continue
            exam_questions = exam.get("questions")
            if not isinstance(exam_questions, list):
                continue
            questions_out: list[dict] = []
            for question in exam_questions:
                if remaining <= 0:
                    break
                if not isinstance(question, dict):
                    continue
                questions_out.append(sanitize_question(question))
                remaining -= 1
            if questions_out:
                cloned_exam = dict(exam)
                cloned_exam["questions"] = questions_out
                exams_out.append(cloned_exam)
        if exams_out:
            cloned_industry = dict(industry)
            cloned_industry["exams"] = exams_out
            industries_out.append(cloned_industry)

    return {"industries": industries_out}


def count_category_references_in_bank(bank: dict, category_key: str) -> dict[str, int]:
    normalized_key = normalize_category_key(category_key)
    exam_refs = 0
    question_refs = 0
    implicit_exam_refs = 0

    for industry in bank.get("industries", []):
        for exam in industry.get("exams", []):
            exam_key = normalize_category_key(exam.get("categoryKey"))
            if exam_key == normalized_key:
                exam_refs += 1
            elif not exam_key and required_category_for_exam(exam) == normalized_key:
                implicit_exam_refs += 1

            for question in exam.get("questions", []):
                q_key = normalize_category_key(question.get("categoryKey"))
                if q_key == normalized_key:
                    question_refs += 1

    return {
        "examRefs": exam_refs,
        "questionRefs": question_refs,
        "implicitExamRefs": implicit_exam_refs,
        "totalRefs": exam_refs + question_refs + implicit_exam_refs,
    }


def clear_category_references_in_bank(bank: dict, category_key: str) -> dict[str, int]:
    normalized_key = normalize_category_key(category_key)
    cleared_exam_refs = 0
    cleared_question_refs = 0

    for industry in bank.get("industries", []):
        for exam in industry.get("exams", []):
            exam_key = normalize_category_key(exam.get("categoryKey"))
            if exam_key == normalized_key and "categoryKey" in exam:
                exam.pop("categoryKey", None)
                cleared_exam_refs += 1

            for question in exam.get("questions", []):
                q_key = normalize_category_key(question.get("categoryKey"))
                if q_key == normalized_key and "categoryKey" in question:
                    question.pop("categoryKey", None)
                    cleared_question_refs += 1

    return {
        "clearedExamRefs": cleared_exam_refs,
        "clearedQuestionRefs": cleared_question_refs,
        "totalCleared": cleared_exam_refs + cleared_question_refs,
    }


def init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    db_file_already_exists = DB_PATH.exists()
    default_bank = DEFAULT_BANK_PATH.read_text(encoding="utf-8")

    with db_conn() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              nickname TEXT NOT NULL DEFAULT '',
              email TEXT NOT NULL UNIQUE,
              phone TEXT NOT NULL DEFAULT '',
              password TEXT NOT NULL,
              plan TEXT NOT NULL CHECK(plan IN ('free','paid')),
              membership_tier TEXT NOT NULL DEFAULT 'free' CHECK(membership_tier IN ('free','basic_399','pro_599','ai_999')),
              bilingual_enabled INTEGER,
              explanation_enabled INTEGER,
              memory_tips_enabled INTEGER,
              account_status TEXT NOT NULL DEFAULT 'active' CHECK(account_status IN ('active','suspended')),
              created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS sessions (
              token TEXT PRIMARY KEY,
              user_id INTEGER,
              is_admin INTEGER NOT NULL DEFAULT 0,
              created_at TEXT NOT NULL,
              FOREIGN KEY(user_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS settings (
              key TEXT PRIMARY KEY,
              value TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS progress_summary (
              user_id INTEGER NOT NULL,
              exam_id TEXT NOT NULL,
              attempts INTEGER NOT NULL,
              percent INTEGER NOT NULL,
              best INTEGER NOT NULL,
              last_mode TEXT,
              practiced_at TEXT,
              PRIMARY KEY(user_id, exam_id)
            );

            CREATE TABLE IF NOT EXISTS wrong_book (
              user_id INTEGER NOT NULL,
              exam_id TEXT NOT NULL,
              question_id TEXT NOT NULL,
              created_at TEXT NOT NULL,
              correct_streak INTEGER NOT NULL DEFAULT 0,
              PRIMARY KEY(user_id, exam_id, question_id)
            );

            CREATE TABLE IF NOT EXISTS bookmarks (
              user_id INTEGER NOT NULL,
              exam_id TEXT NOT NULL,
              question_id TEXT NOT NULL,
              created_at TEXT NOT NULL,
              PRIMARY KEY(user_id, exam_id, question_id)
            );

            CREATE TABLE IF NOT EXISTS session_state (
              user_id INTEGER PRIMARY KEY,
              state_json TEXT NOT NULL DEFAULT '{}',
              updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS progress_events (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id INTEGER NOT NULL,
              exam_id TEXT NOT NULL,
              question_id TEXT NOT NULL,
              selected_index INTEGER,
              mode TEXT,
              created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS user_entitlements (
              user_id INTEGER PRIMARY KEY,
              b_license_access INTEGER NOT NULL DEFAULT 0,
              c_license_access INTEGER NOT NULL DEFAULT 0,
              bilingual_access INTEGER NOT NULL DEFAULT 0,
              bilingual_expires_at TEXT,
              ai_access INTEGER NOT NULL DEFAULT 0,
              ai_expires_at TEXT,
              updated_at TEXT NOT NULL,
              FOREIGN KEY(user_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS categories (
              key TEXT PRIMARY KEY,
              name TEXT NOT NULL,
              is_enabled INTEGER NOT NULL DEFAULT 1,
              sort_order INTEGER NOT NULL DEFAULT 100,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS user_category_entitlements (
              user_id INTEGER NOT NULL,
              category_key TEXT NOT NULL,
              has_access INTEGER NOT NULL DEFAULT 0,
              expires_at TEXT,
              updated_at TEXT NOT NULL,
              PRIMARY KEY(user_id, category_key),
              FOREIGN KEY(user_id) REFERENCES users(id),
              FOREIGN KEY(category_key) REFERENCES categories(key)
            );
            """
        )

        ensure_user_profile_columns(conn)
        ensure_wrong_book_columns(conn)
        ensure_user_entitlement_columns(conn)
        ensure_user_category_entitlement_columns(conn)
        ensure_session_columns(conn)
        ensure_questions_table(conn)
        # One-time bootstrap only: do not recreate default categories during normal runtime.
        ensure_default_categories_bootstrap(conn, allow_seed=not db_file_already_exists)
        ensure_all_user_entitlements(conn)
        ensure_user_category_entitlements(conn)
        ensure_default_exam_catalog(conn, seed_if_empty=True)
        ensure_exam_categories_defaults(conn)
        ensure_exam_structure_v1_tables(conn)
        ensure_dashboard_modules_table(conn)
        ensure_licensing_progress_table(conn)
        ensure_course_contents_table(conn)
        ensure_entitlement_expiry_backfill(conn)

        if SEED_DEFAULT_USERS:
            for user in DEFAULT_USERS:
                existing = conn.execute("SELECT password FROM users WHERE email=?", (user["email"],)).fetchone()
                # Only re-hash if the stored password is still plain-text
                if existing and existing["password"].startswith("pbkdf2:sha256:"):
                    hashed_pw = existing["password"]
                else:
                    hashed_pw = hash_password(user["password"])
                conn.execute(
                    """
                    INSERT INTO users(name, email, password, plan, membership_tier, created_at)
                    VALUES(?,?,?,?,?,?)
                    ON CONFLICT(email) DO UPDATE SET
                      name=excluded.name,
                      password=excluded.password,
                      plan=excluded.plan,
                      membership_tier=excluded.membership_tier
                    """,
                    (
                        user["name"],
                        user["email"],
                        hashed_pw,
                        user["plan"],
                        normalize_membership_tier(user.get("membership_tier"), infer_membership_tier(plan=user.get("plan"))),
                        now_iso(),
                    ),
                )

        ensure_user_profile_columns(conn)
        ensure_all_user_entitlements(conn)
        ensure_user_category_entitlements(conn)
        ensure_questions_table(conn)
        ensure_default_exam_catalog(conn, seed_if_empty=True)
        ensure_exam_categories_defaults(conn)
        ensure_exam_structure_v1_tables(conn)
        ensure_exam_structure_v1_backfill(conn)
        ensure_dashboard_modules_table(conn)
        ensure_licensing_progress_table(conn)
        ensure_course_contents_table(conn)
        ensure_entitlement_expiry_backfill(conn)

        conn.execute(
            """
            INSERT INTO settings(key, value, updated_at)
            VALUES('question_bank_json', ?, ?)
            ON CONFLICT(key) DO NOTHING
            """,
            (default_bank, now_iso()),
        )
        conn.execute(
            """
            INSERT INTO settings(key, value, updated_at)
            VALUES(?,?,?)
            ON CONFLICT(key) DO NOTHING
            """,
            (SITE_WECHAT_SETTING_KEY, DEFAULT_SITE_WECHAT_ID, now_iso()),
        )

        ensure_b_path_launch_ready_defaults(conn)


def parse_answer(value: str) -> int:
    text = (value or "").strip().upper()
    if text in {"A", "B", "C", "D"}:
        return {"A": 0, "B": 1, "C": 2, "D": 3}[text]
    if text.isdigit():
        num = int(text)
        if num in {0, 1, 2, 3}:
            return num
        if num in {1, 2, 3, 4}:
            return num - 1
    raise ValueError(f"Invalid answer value: {value!r}")


def clean_text(value: str | None) -> str:
    return str(value or "").strip()


def normalize_wechat_id(value: str | None, default: str = DEFAULT_SITE_WECHAT_ID) -> str:
    text = clean_text(value)
    if text:
        text = re.sub(r"\s+", "", text)
        text = text[:64]
    return text or default


def get_site_wechat_id(conn: sqlite3.Connection) -> str:
    row = conn.execute(
        "SELECT value FROM settings WHERE key = ?",
        (SITE_WECHAT_SETTING_KEY,),
    ).fetchone()
    return normalize_wechat_id(row["value"] if row else None)


def set_site_wechat_id(conn: sqlite3.Connection, wechat_id: str) -> str:
    value = normalize_wechat_id(wechat_id, default="")
    conn.execute(
        """
        INSERT INTO settings(key, value, updated_at)
        VALUES(?,?,?)
        ON CONFLICT(key) DO UPDATE SET
          value=excluded.value,
          updated_at=excluded.updated_at
        """,
        (SITE_WECHAT_SETTING_KEY, value, now_iso()),
    )
    return value


def deep_copy_site_pricing_default() -> dict:
    return json.loads(json.dumps(DEFAULT_SITE_PRICING_CONFIG, ensure_ascii=False))


def parse_price_int(value, default: int) -> int:
    if value is None:
        return max(1, int(default))
    if isinstance(value, bool):
        return max(1, int(default))
    if isinstance(value, (int, float)):
        num = int(round(float(value)))
        return max(1, num)
    text = clean_text(str(value)).replace("$", "").replace(",", "")
    if not text:
        return max(1, int(default))
    match = re.search(r"-?\d+(?:\.\d+)?", text)
    if not match:
        return max(1, int(default))
    try:
        num = int(round(float(match.group(0))))
    except ValueError:
        return max(1, int(default))
    return max(1, num)


def normalize_duration_text(value, default: str) -> str:
    text = clean_text(value)
    if not text:
        return clean_text(default) or "3个月训练"
    return text[:80]


def normalize_site_pricing_config(value) -> dict:
    default_cfg = deep_copy_site_pricing_default()
    raw = value if isinstance(value, dict) else {}

    promo_enabled = to_bool_int(raw.get("promoEnabled"), 1 if default_cfg.get("promoEnabled") else 0)
    promo_end_at = normalize_expires_at(raw.get("promoEndAt"))

    plans_raw = raw.get("plans") if isinstance(raw.get("plans"), dict) else {}
    normalized_plans: dict[str, dict] = {}
    for plan_key in ("basic", "professional", "ai"):
        base = default_cfg["plans"].get(plan_key, {})
        incoming = plans_raw.get(plan_key) if isinstance(plans_raw.get(plan_key), dict) else {}
        original_price = parse_price_int(incoming.get("originalPrice"), int(base.get("originalPrice", 1) or 1))
        promo_price = parse_price_int(incoming.get("promoPrice"), int(base.get("promoPrice", original_price) or original_price))
        duration_text = normalize_duration_text(incoming.get("durationText"), str(base.get("durationText") or "3个月训练"))
        plan_payload = {
            "originalPrice": original_price,
            "promoPrice": promo_price,
            "durationText": duration_text,
        }
        if plan_key == "professional":
            plan_payload["recommended"] = bool(
                to_bool_int(incoming.get("recommended"), 1 if base.get("recommended") else 0)
            )
        normalized_plans[plan_key] = plan_payload

    return {
        "promoEnabled": bool(promo_enabled),
        "promoEndAt": promo_end_at or "",
        "plans": normalized_plans,
    }


def get_site_pricing_config(conn: sqlite3.Connection) -> dict:
    row = conn.execute(
        "SELECT value FROM settings WHERE key = ?",
        (SITE_PRICING_SETTING_KEY,),
    ).fetchone()
    if not row:
        return normalize_site_pricing_config({})
    try:
        payload = json.loads(row["value"] or "{}")
    except json.JSONDecodeError:
        payload = {}
    return normalize_site_pricing_config(payload)


def set_site_pricing_config(conn: sqlite3.Connection, config: dict) -> dict:
    normalized = normalize_site_pricing_config(config)
    conn.execute(
        """
        INSERT INTO settings(key, value, updated_at)
        VALUES(?,?,?)
        ON CONFLICT(key) DO UPDATE SET
          value=excluded.value,
          updated_at=excluded.updated_at
        """,
        (SITE_PRICING_SETTING_KEY, json.dumps(normalized, ensure_ascii=False), now_iso()),
    )
    return normalized


def build_site_pricing_runtime(config: dict, *, server_now: datetime | None = None) -> dict:
    now_dt = server_now or datetime.now(timezone.utc)
    normalized = normalize_site_pricing_config(config)
    promo_enabled = bool(normalized.get("promoEnabled"))
    promo_end_at = normalize_expires_at(normalized.get("promoEndAt"))
    end_dt = parse_iso_datetime(promo_end_at)
    promo_active = bool(promo_enabled and end_dt and end_dt > now_dt)

    runtime_plans: dict[str, dict] = {}
    for plan_key in ("basic", "professional", "ai"):
        plan = normalized.get("plans", {}).get(plan_key, {})
        original_price = parse_price_int(plan.get("originalPrice"), 1)
        promo_price = parse_price_int(plan.get("promoPrice"), original_price)
        duration_text = normalize_duration_text(plan.get("durationText"), "3个月训练")
        show_promo = bool(promo_active and promo_price > 0 and promo_price < original_price)
        display_price = promo_price if show_promo else original_price
        savings = max(0, original_price - promo_price) if show_promo else 0
        runtime_item = {
            "originalPrice": original_price,
            "promoPrice": promo_price,
            "displayPrice": display_price,
            "durationText": duration_text,
            "showPromoPrice": show_promo,
            "savings": savings,
        }
        if plan_key == "professional":
            runtime_item["recommended"] = bool(plan.get("recommended"))
        runtime_plans[plan_key] = runtime_item

    return {
        "promoEnabled": promo_enabled,
        "promoEndAt": promo_end_at or "",
        "promoActive": promo_active,
        "plans": runtime_plans,
    }


def empty_ai_content() -> dict[str, str]:
    return {key: "" for key in AI_IMPORT_FIELDS}


def parse_json_object(text: str) -> dict:
    raw = clean_text(text)
    if not raw:
        return {}
    try:
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, dict) else {}
    except json.JSONDecodeError:
        pass
    start = raw.find("{")
    end = raw.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return {}
    try:
        parsed = json.loads(raw[start : end + 1])
        return parsed if isinstance(parsed, dict) else {}
    except json.JSONDecodeError:
        return {}


def generate_ai_content(question: dict) -> dict[str, str]:
    result = empty_ai_content()
    api_key = clean_text(os.environ.get("OPENAI_API_KEY"))
    if not api_key:
        return result

    prompt = clean_text(question.get("prompt"))
    option_a = clean_text(question.get("option_a"))
    option_b = clean_text(question.get("option_b"))
    option_c = clean_text(question.get("option_c"))
    option_d = clean_text(question.get("option_d"))
    answer = clean_text(question.get("answer")).upper()

    user_prompt = (
        "You are a professional exam tutor.\n\n"
        "Keep English as source of truth. Translate the question/options into Chinese and generate Chinese learning support.\n\n"
        "Return JSON only.\n\n"
        "{\n"
        '"prompt_zh":"",\n'
        '"option_a_zh":"",\n'
        '"option_b_zh":"",\n'
        '"option_c_zh":"",\n'
        '"option_d_zh":"",\n'
        '"explanation":"",\n'
        '"explanation_zh":"",\n'
        '"key_point_zh":"",\n'
        '"vocab_zh":"",\n'
        '"memory_tip_zh":""\n'
        "}\n\n"
        "Question:\n"
        f"prompt: {prompt}\n"
        f"option_a: {option_a}\n"
        f"option_b: {option_b}\n"
        f"option_c: {option_c}\n"
        f"option_d: {option_d}\n"
        f"answer: {answer}\n"
    )

    payload = {
        "model": OPENAI_MODEL,
        "response_format": {"type": "json_object"},
        "temperature": 0.2,
        "messages": [
            {"role": "system", "content": "You are a professional exam tutor."},
            {"role": "user", "content": user_prompt},
        ],
    }

    try:
        request = Request(
            OPENAI_API_URL,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        with urlopen(request, timeout=45) as response:
            body = response.read().decode("utf-8")
        parsed = json.loads(body)
        content = (
            (((parsed.get("choices") or [{}])[0]).get("message") or {}).get("content")
            if isinstance(parsed, dict)
            else ""
        )
        data = parse_json_object(str(content or ""))
        if not data:
            return result
        for key in AI_IMPORT_FIELDS:
            result[key] = clean_text(data.get(key))
        return result
    except Exception:
        return result


def normalize_category_key(value: str | None) -> str:
    text = clean_text(value).lower().replace("-", "_")
    return re.sub(r"[^a-z0-9_]", "", text)


def is_valid_category_key(value: str) -> bool:
    return bool(re.fullmatch(r"[a-z][a-z0-9_]{1,63}", value))


def normalize_hierarchy_key(value: str | None) -> str:
    text = clean_text(value).lower().replace("-", "_").replace(" ", "_")
    return re.sub(r"[^a-z0-9_]", "", text)


def is_valid_hierarchy_key(value: str) -> bool:
    return bool(re.fullmatch(r"[a-z][a-z0-9_]{1,63}", value))


def normalize_exam_code(value: str | None) -> str:
    text = clean_text(value).lower().replace("-", "_").replace(" ", "_")
    return re.sub(r"[^a-z0-9_]", "", text)


def is_valid_exam_code(value: str) -> bool:
    return bool(re.fullmatch(r"[a-z][a-z0-9_]{1,63}", value))


def normalize_trade_code(value: str | None) -> str:
    return normalize_exam_code(value)


def is_valid_trade_code(value: str) -> bool:
    return bool(re.fullmatch(r"[a-z][a-z0-9_]{1,63}", value))


def normalize_specialization_code(value: str | None) -> str:
    return normalize_trade_code(value)


def is_shared_specialization_code(value: str | None) -> bool:
    text = normalize_specialization_code(value)
    return text in {"", "none", "shared", "law_business"}


def normalize_exam_type(value: str | None, default: str = "trade") -> str:
    text = clean_text(value).lower().replace("-", "_").replace(" ", "_")
    alias = {
        "lawbusiness": "law_business",
        "law_and_business": "law_business",
        "law_business_exam": "law_business",
        "law": "law_business",
        "business": "law_business",
        "trade_exam": "trade",
    }
    text = alias.get(text, text)
    if text in EXAM_TYPE_VALUES:
        return text
    return default if default in EXAM_TYPE_VALUES else "trade"


def is_valid_exam_type(value: str) -> bool:
    return value in EXAM_TYPE_VALUES


def normalize_question_status(value: str | None, default: str = "active") -> str:
    text = clean_text(value).lower()
    if text in QUESTION_STATUS_VALUES:
        return text
    return default if default in QUESTION_STATUS_VALUES else "active"


def build_prompt_preview(text: str | None, max_len: int = 72) -> str:
    prompt = clean_text(text)
    if len(prompt) <= max_len:
        return prompt
    return f"{prompt[:max_len]}..."


def default_import_context(category_key: str, category_name: str) -> dict[str, str]:
    normalized = normalize_category_key(category_key)
    if normalized in DEFAULT_IMPORT_CONTEXT_BY_CATEGORY:
        return dict(DEFAULT_IMPORT_CONTEXT_BY_CATEGORY[normalized])

    readable_name = clean_text(category_name) or normalized.replace("_", " ").title() or "General Exam"
    industry_id = "general"
    return {
        "industry_id": industry_id,
        "industry_name": "General License",
        "examId": f"{normalized or 'general'}-exam",
        "exam_name": readable_name,
    }


def detect_text_language(text: str) -> str:
    has_cjk = bool(CJK_RE.search(text or ""))
    has_en = bool(EN_WORD_RE.search(text or ""))
    if has_en and not has_cjk:
        return "en"
    if has_cjk and not has_en:
        return "zh"
    if has_en and has_cjk:
        return "mixed"
    return "unknown"


def detect_question_language(texts: list[str]) -> str:
    cleaned = [t for t in texts if t]
    if not cleaned:
        return "unknown"

    en_word_count = sum(len(re.findall(r"[A-Za-z]+", text)) for text in cleaned)
    zh_char_count = sum(len(CJK_RE.findall(text)) for text in cleaned)

    if en_word_count > 0 and zh_char_count == 0:
        return "en"
    if zh_char_count > 0 and en_word_count == 0:
        return "zh"
    if en_word_count > 0 and zh_char_count > 0:
        if en_word_count >= zh_char_count * 2:
            return "en"
        if zh_char_count >= en_word_count * 2:
            return "zh"
        return "mixed"
    return "unknown"


def clean_translated_spacing(text: str) -> str:
    if not text:
        return ""
    out = re.sub(r"\s+", " ", text).strip()
    out = re.sub(r"\s*([，。！？；：,.!?;:])\s*", r"\1", out)
    out = re.sub(r"([\u3400-\u9fff])\s+([\u3400-\u9fff])", r"\1\2", out)
    out = re.sub(r"\(\s+", "(", out)
    out = re.sub(r"\s+\)", ")", out)
    return out.strip()


def auto_translate_en_text(text: str) -> str:
    source = clean_text(text)
    if not source:
        return ""

    translated = f" {source} "
    for en_phrase, zh_phrase in EN_TO_ZH_PHRASES:
        translated = re.sub(rf"(?i)\b{re.escape(en_phrase)}\b", zh_phrase, translated)

    parts = re.split(r"(\W+)", translated)
    output: list[str] = []
    for part in parts:
        if not part:
            continue
        if re.fullmatch(r"[A-Za-z][A-Za-z'\-]*", part):
            key = part.lower()
            mapped = EN_TO_ZH_WORDS.get(key)
            if mapped is None and key.endswith("s"):
                mapped = EN_TO_ZH_WORDS.get(key[:-1])
            output.append(mapped if mapped is not None else part)
        else:
            output.append(part)

    return clean_translated_spacing("".join(output))


def extract_options(row: dict, suffix: str = "") -> list[str]:
    if suffix:
        return [clean_text(row.get(f"option_{letter}_{suffix}")) for letter in CSV_OPTION_LETTERS]
    return [clean_text(row.get(f"option_{letter}")) for letter in CSV_OPTION_LETTERS]


def compose_locale_payload(
    prompt: str,
    options: list[str],
    explanation: str,
    question_type: str,
    key_point: str = "",
    answer_reasoning: str = "",
    vocab: str = "",
    memory_tip: str = "",
    memory_trick: str = "",
) -> dict:
    payload: dict[str, str | list[str]] = {}
    if prompt:
        payload["prompt"] = prompt
    if any(options):
        payload["options"] = options
    if explanation:
        payload["explanation"] = explanation
    if question_type:
        payload["questionType"] = question_type
    if key_point:
        payload["keyPoint"] = key_point
    if answer_reasoning:
        payload["answerReasoning"] = answer_reasoning
    if vocab:
        payload["vocab"] = vocab
    if memory_tip:
        payload["memoryTip"] = memory_tip
    if memory_trick:
        payload["memoryTrick"] = memory_trick
    return payload


def generate_key_point_en(question_type: str, prompt_en: str, explanation_en: str) -> str:
    topic = clean_text(question_type)
    if not topic:
        prompt_text = clean_text(prompt_en)
        if prompt_text:
            words = re.findall(r"[A-Za-z0-9'\-]+", prompt_text)
            if words:
                topic = " ".join(words[:8])
    if topic:
        return f"Core concept: {topic}. Focus on selecting the most compliant answer."
    if clean_text(explanation_en):
        return "Core concept: apply the key compliance principle shown in the explanation."
    return "Core concept: identify the most compliant and exam-valid answer for the scenario."


def generate_explanation_en(options_en: list[str], answer_index: int) -> str:
    labels = ("A", "B", "C", "D")
    safe_options = normalize_options(options_en, ["", "", "", ""])
    correct_letter = labels[answer_index] if 0 <= answer_index < 4 else "?"
    correct_text = clean_text(safe_options[answer_index]) if 0 <= answer_index < 4 else ""
    if correct_text:
        return (
            f"Correct answer {correct_letter}: {correct_text}. "
            "This option best matches the compliance requirement in the question."
        )
    return f"Correct answer is option {correct_letter}. This option best matches the question requirement."


def generate_explanation_zh(options_zh: list[str], answer_index: int) -> str:
    labels = ("A", "B", "C", "D")
    safe_options = normalize_options(options_zh, ["", "", "", ""])
    correct_letter = labels[answer_index] if 0 <= answer_index < 4 else "?"
    correct_text = clean_text(safe_options[answer_index]) if 0 <= answer_index < 4 else ""
    if correct_text:
        return f"正确答案为{correct_letter}：{correct_text}。该选项最符合题目考查的合规要求。"
    return f"正确答案为选项{correct_letter}。该选项最符合题目考查要求。"


EN_VOCAB_STOPWORDS = {
    "a",
    "an",
    "the",
    "and",
    "or",
    "of",
    "to",
    "for",
    "with",
    "in",
    "on",
    "is",
    "are",
    "was",
    "were",
    "be",
    "as",
    "by",
    "at",
    "from",
    "that",
    "this",
    "these",
    "those",
    "what",
    "which",
    "when",
    "where",
    "why",
    "how",
    "before",
    "after",
    "during",
    "should",
    "must",
    "may",
    "can",
    "all",
    "above",
    "none",
    "not",
}


def extract_vocab_terms_en(prompt_en: str, options_en: list[str], max_terms: int = 5) -> list[str]:
    text = " ".join([prompt_en, *options_en])
    words = re.findall(r"[A-Za-z][A-Za-z0-9'\-/]*", text)
    picked: list[str] = []
    seen: set[str] = set()
    for word in words:
        key = word.lower().strip("'-/")
        if not key or key in EN_VOCAB_STOPWORDS:
            continue
        if len(key) <= 2:
            continue
        if key in seen:
            continue
        seen.add(key)
        picked.append(word)
        if len(picked) >= max_terms:
            break
    return picked


def generate_vocab_zh(prompt_en: str, options_en: list[str]) -> str:
    terms = extract_vocab_terms_en(prompt_en, options_en, max_terms=5)
    if not terms:
        return ""
    pairs: list[str] = []
    for term in terms:
        zh = clean_translated_spacing(auto_translate_en_text(term))
        if not zh:
            continue
        if zh.lower() == term.lower():
            continue
        pairs.append(f"{term}={zh}")
    if len(pairs) < 3:
        fallback_terms = ["contractor", "permit", "safety", "contract", "inspection"]
        for term in fallback_terms:
            if len(pairs) >= 5:
                break
            if any(item.lower().startswith(f"{term.lower()}=") for item in pairs):
                continue
            zh = clean_translated_spacing(auto_translate_en_text(term))
            if not zh or zh.lower() == term.lower():
                continue
            pairs.append(f"{term}={zh}")
    return "；".join(pairs[:5])


def generate_key_point_zh(question_type: str, prompt_en: str) -> str:
    raw_type = clean_text(question_type)
    topic_zh = ""
    if raw_type and CJK_RE.search(raw_type):
        parts = [part.strip() for part in raw_type.split("/") if CJK_RE.search(part)]
        if parts:
            topic_zh = parts[-1]
    if not topic_zh:
        topic_source = raw_type or clean_text(prompt_en)
        topic_zh = clean_translated_spacing(auto_translate_en_text(topic_source))
    if topic_zh:
        return f"本题考查：{topic_zh}。解题时先抓关键词，再选择最符合规范与安全要求的选项。"
    return "本题考查施工合规判断。解题时先抓关键词，再选择最符合规范与安全要求的选项。"


def generate_memory_tip_zh(options_zh: list[str], answer_index: int) -> str:
    labels = ("A", "B", "C", "D")
    letter = labels[answer_index] if 0 <= answer_index < 4 else "?"
    safe_options = normalize_options(options_zh, ["", "", "", ""])
    correct_text = clean_text(safe_options[answer_index]) if 0 <= answer_index < 4 else ""
    if correct_text:
        return f"记忆方法：先看题干关键词，排除明显不合规选项，最后对照{letter}项（{correct_text}）。"
    return f"记忆方法：先抓关键词，再用排除法，最后锁定{letter}项。"


def build_builtin_zh_support(
    *,
    prompt_en: str,
    options_en: list[str],
    answer_index: int,
    question_type: str,
    explanation_en: str,
) -> dict[str, str]:
    prompt_zh = clean_translated_spacing(auto_translate_en_text(prompt_en))
    options_zh = [clean_translated_spacing(auto_translate_en_text(opt)) for opt in normalize_options(options_en, ["", "", "", ""])]
    explanation_en_final = clean_text(explanation_en) or generate_explanation_en(options_en, answer_index)
    explanation_zh = generate_explanation_zh(options_zh, answer_index)
    key_point_zh = generate_key_point_zh(question_type, prompt_en)
    vocab_zh = generate_vocab_zh(prompt_en, options_en)
    memory_tip_zh = generate_memory_tip_zh(options_zh, answer_index)
    return {
        "prompt_zh": prompt_zh,
        "option_a_zh": options_zh[0] if len(options_zh) > 0 else "",
        "option_b_zh": options_zh[1] if len(options_zh) > 1 else "",
        "option_c_zh": options_zh[2] if len(options_zh) > 2 else "",
        "option_d_zh": options_zh[3] if len(options_zh) > 3 else "",
        "explanation": explanation_en_final,
        "explanation_zh": explanation_zh,
        "key_point_zh": key_point_zh,
        "vocab_zh": vocab_zh,
        "memory_tip_zh": memory_tip_zh,
    }


def generate_answer_reasoning_en(
    options_en: list[str],
    answer_index: int,
    explanation_en: str,
) -> str:
    labels = ("A", "B", "C", "D")
    safe_options = normalize_options(options_en, ["", "", "", ""])
    correct_letter = labels[answer_index] if 0 <= answer_index < 4 else "?"
    correct_text = clean_text(safe_options[answer_index]) if 0 <= answer_index < 4 else ""

    sentence_1 = (
        f"Correct answer {correct_letter}: {correct_text}."
        if correct_text
        else f"Correct answer is option {correct_letter}."
    )
    explanation_text = clean_text(explanation_en)
    sentence_2 = (
        f"Why correct: {explanation_text}"
        if explanation_text
        else "Why correct: it best matches the requirement described in the question."
    )

    wrong_parts: list[str] = []
    for idx, option in enumerate(safe_options):
        if idx == answer_index:
            continue
        label = labels[idx]
        option_text = clean_text(option) or f"Option {label}"
        wrong_parts.append(f"{label}: {option_text} is less suitable for the tested concept.")

    if wrong_parts:
        return f"{sentence_1} {sentence_2} Why others are wrong: {' '.join(wrong_parts)}"
    return f"{sentence_1} {sentence_2}"


def normalize_translation_status(question: dict, i18n: dict | None = None) -> str:
    raw = clean_text(question.get("translation_status") or question.get("translationStatus"))
    if raw in TRANSLATION_STATUS_VALUES:
        return raw

    payload = i18n if isinstance(i18n, dict) else (question.get("i18n") if isinstance(question.get("i18n"), dict) else {})
    meta = payload.get("translationMeta") if isinstance(payload.get("translationMeta"), dict) else {}
    if clean_text(meta.get("reviewedAt")):
        return "human_verified"
    if clean_text(meta.get("generatedAt")):
        return "ai_translated"
    return "untranslated"


def build_bilingual_question_from_row(row: dict, *, exam_id: str = "") -> tuple[dict, bool]:
    base_prompt = clean_text(row.get("prompt"))
    base_options = extract_options(row)
    base_explanation = clean_text(row.get("explanation"))
    base_type = clean_text(row.get("question_type"))

    prompt_en_raw = clean_text(row.get("prompt_en"))
    options_en_raw = extract_options(row, "en")
    explanation_en_raw = clean_text(row.get("explanation_en"))
    type_en_raw = clean_text(row.get("question_type_en"))

    prompt_zh_raw = clean_text(row.get("prompt_zh"))
    options_zh_raw = extract_options(row, "zh")
    explanation_zh_raw = clean_text(row.get("explanation_zh"))
    type_zh_raw = clean_text(row.get("question_type_zh"))
    key_point_en_raw = clean_text(row.get("key_point_en"))
    key_point_zh_raw = clean_text(row.get("key_point_zh"))
    memory_trick_raw = clean_text(row.get("memory_trick") or row.get("memoryTrick"))
    vocab_zh_raw = clean_text(row.get("vocab_zh"))
    memory_tip_zh_raw = clean_text(row.get("memory_tip_zh"))
    answer_reasoning_en_raw = clean_text(row.get("answer_reasoning_en") or row.get("reasoning_en"))
    answer_reasoning_zh_raw = clean_text(row.get("answer_reasoning_zh") or row.get("reasoning_zh"))
    has_human_zh_input = bool(
        prompt_zh_raw
        or explanation_zh_raw
        or type_zh_raw
        or key_point_zh_raw
        or vocab_zh_raw
        or memory_tip_zh_raw
        or answer_reasoning_zh_raw
        or any(options_zh_raw)
    )

    source_language = detect_question_language([base_prompt, *base_options, base_explanation, base_type])
    has_explicit_en = bool(prompt_en_raw or explanation_en_raw or type_en_raw or any(options_en_raw))
    if source_language != "en" and has_explicit_en:
        source_language = "en"
    source_is_en = source_language == "en"
    answer_index = parse_answer(row["answer"])

    en_prompt = prompt_en_raw
    en_options = options_en_raw[:]
    en_explanation = explanation_en_raw
    en_type = type_en_raw

    if source_is_en:
        en_prompt = en_prompt or base_prompt
        en_options = [en_options[i] or base_options[i] for i in range(4)]
        en_explanation = en_explanation or base_explanation
        en_type = en_type or base_type

    auto_translated = False

    if not en_explanation and (source_is_en or has_explicit_en):
        en_explanation = generate_explanation_en(en_options or base_options, answer_index)
        auto_translated = True

    if prompt_zh_raw:
        zh_prompt = prompt_zh_raw
    elif source_is_en:
        zh_prompt = auto_translate_en_text(en_prompt or base_prompt)
        auto_translated = True
    else:
        zh_prompt = base_prompt

    if any(options_zh_raw):
        zh_options = options_zh_raw[:]
        if source_is_en:
            for i in range(4):
                if not zh_options[i]:
                    zh_options[i] = auto_translate_en_text(en_options[i] or base_options[i])
                    auto_translated = True
        else:
            zh_options = [zh_options[i] or base_options[i] for i in range(4)]
    elif source_is_en:
        zh_options = [auto_translate_en_text(opt) for opt in (en_options or base_options)]
        auto_translated = True
    else:
        zh_options = base_options

    if explanation_zh_raw:
        zh_explanation = explanation_zh_raw
    elif source_is_en and (en_explanation or base_explanation):
        zh_explanation = auto_translate_en_text(en_explanation or base_explanation)
        auto_translated = True
    else:
        zh_explanation = base_explanation
    if not zh_explanation:
        zh_explanation = generate_explanation_zh(zh_options or base_options, answer_index)
        auto_translated = True

    if type_zh_raw:
        zh_type = type_zh_raw
    elif source_is_en and (en_type or base_type):
        zh_type = auto_translate_en_text(en_type or base_type)
        auto_translated = True
    else:
        zh_type = base_type
    if not zh_type:
        inferred_seed = {"prompt": zh_prompt, "explanation": zh_explanation}
        zh_type = infer_type(inferred_seed, exam_id)
        if zh_type:
            auto_translated = True

    root_prompt = en_prompt or base_prompt
    root_options = [en_options[i] or base_options[i] for i in range(4)]
    root_explanation = en_explanation or base_explanation
    question = {
        "id": clean_text(row.get("question_id")),
        "prompt": root_prompt,
        "options": root_options,
        "answerIndex": answer_index,
        "explanation": root_explanation,
        "memory_trick": memory_trick_raw,
        "memoryTrick": memory_trick_raw,
        "prompt_zh": zh_prompt,
        "option_a_zh": zh_options[0] if len(zh_options) > 0 else "",
        "option_b_zh": zh_options[1] if len(zh_options) > 1 else "",
        "option_c_zh": zh_options[2] if len(zh_options) > 2 else "",
        "option_d_zh": zh_options[3] if len(zh_options) > 3 else "",
        "explanation_zh": zh_explanation,
        "image_url": clean_text(row.get("image_url")),
        "media_image_url": clean_text(row.get("image_url")),
    }
    if zh_type:
        question["questionType"] = zh_type

    key_point_en = key_point_en_raw or generate_key_point_en(en_type or base_type, en_prompt or base_prompt, en_explanation or base_explanation)
    key_point_zh = key_point_zh_raw
    if not key_point_zh and key_point_en:
        key_point_zh = auto_translate_en_text(key_point_en)
        auto_translated = True

    answer_reasoning_en = answer_reasoning_en_raw or generate_answer_reasoning_en(
        en_options or base_options,
        answer_index,
        en_explanation or base_explanation,
    )
    answer_reasoning_zh = answer_reasoning_zh_raw
    if not answer_reasoning_zh and answer_reasoning_en:
        answer_reasoning_zh = auto_translate_en_text(answer_reasoning_en)
        auto_translated = True
    vocab_zh = vocab_zh_raw
    memory_tip_zh = memory_tip_zh_raw or answer_reasoning_zh

    i18n: dict[str, dict | str] = {
        "sourceLanguage": source_language,
        "zh": compose_locale_payload(
            zh_prompt,
            zh_options,
            zh_explanation,
            zh_type,
            key_point_zh,
            answer_reasoning_zh,
            vocab_zh,
            memory_tip_zh,
        ),
    }

    if source_is_en or has_explicit_en:
        en_payload = compose_locale_payload(
            en_prompt,
            en_options,
            en_explanation,
            en_type,
            key_point_en,
            answer_reasoning_en,
            "",
            "",
            memory_trick_raw,
        )
        if en_payload:
            i18n["en"] = en_payload

    if auto_translated:
        i18n["translationMeta"] = {
            "autoTranslatedFrom": "en",
            "engine": "builtin-glossary-v1",
            "generatedAt": now_iso(),
        }

    question["i18n"] = i18n
    if key_point_en:
        question["key_point_en"] = key_point_en
    if key_point_zh:
        question["key_point_zh"] = key_point_zh
    if answer_reasoning_en:
        question["answer_reasoning_en"] = answer_reasoning_en
    if answer_reasoning_zh:
        question["answer_reasoning_zh"] = answer_reasoning_zh
    if vocab_zh:
        question["vocab_zh"] = vocab_zh
    if memory_tip_zh:
        question["memory_tip_zh"] = memory_tip_zh
    if has_human_zh_input:
        question["translation_status"] = "human_verified"
    elif auto_translated:
        question["translation_status"] = "ai_translated"
    else:
        question["translation_status"] = "untranslated"
    return question, auto_translated


def ensure_industry(bank: dict, industry_id: str, industry_name: str) -> dict:
    for industry in bank.get("industries", []):
        if industry.get("id") == industry_id:
            if industry_name:
                industry["name"] = industry_name
            if "exams" not in industry:
                industry["exams"] = []
            return industry

    industry = {"id": industry_id, "name": industry_name, "exams": []}
    bank.setdefault("industries", []).append(industry)
    return industry


def ensure_exam(
    industry: dict,
    exam_id: str,
    exam_name: str,
    *,
    exam_family_key: str = "",
    exam_family_name: str = "",
    trade_code: str = "",
    exam_type: str = "",
    category_key: str = "",
    question_count: int = 100,
    exam_time_minutes: int = 180,
) -> dict:
    normalized_code = normalize_exam_code(exam_id)
    family_key = normalize_hierarchy_key(exam_family_key)
    family_name = clean_text(exam_family_name)
    if not family_key:
        family_key, fallback_name = derive_exam_family_from_code(normalized_code)
        if not family_name:
            family_name = fallback_name
    if not family_name:
        _, family_name = derive_exam_family_from_code(normalized_code)
    normalized_exam_type = normalize_exam_type(
        exam_type,
        derive_exam_type_from_exam(normalized_code, exam_name),
    )
    normalized_trade_code = normalize_specialization_code(trade_code)
    if not normalized_trade_code and normalized_exam_type != "law_business":
        normalized_trade_code = derive_trade_code_from_exam(normalized_code, family_key)
    if normalized_exam_type == "law_business":
        normalized_trade_code = ""

    normalized_category_key = normalize_category_key(category_key)
    safe_question_count = max(1, to_int(question_count, 100))
    safe_exam_time_minutes = max(1, to_int(exam_time_minutes, 180))

    for exam in industry.get("exams", []):
        if normalize_exam_code(exam.get("id")) == normalized_code:
            if exam_name:
                exam["name"] = exam_name
            if "questions" not in exam:
                exam["questions"] = []
            exam["id"] = normalized_code or clean_text(exam.get("id")) or "general_exam"
            exam["examCode"] = exam["id"]
            exam["programCode"] = clean_text(industry.get("id"))
            exam["examFamilyKey"] = family_key
            exam["licenseGroup"] = family_key
            exam["examFamilyName"] = family_name
            exam["licenseGroupName"] = family_name
            exam["tradeCode"] = normalized_trade_code
            exam["specializationCode"] = normalized_trade_code
            exam["examType"] = normalized_exam_type
            exam["examTrack"] = normalized_exam_type
            if normalized_category_key:
                exam["categoryKey"] = normalized_category_key
            exam["questionCount"] = safe_question_count
            exam["examTimeMinutes"] = safe_exam_time_minutes
            exam["simulation"] = {
                "questionCount": safe_question_count,
                "examTimeMinutes": safe_exam_time_minutes,
                "categoryWeights": EXAM_MOCK_CATEGORY_WEIGHTS.get(normalized_code or exam_id, {}),
            }
            return exam

    exam = {
        "id": normalized_code or exam_id,
        "examCode": normalized_code or exam_id,
        "name": exam_name,
        "programCode": clean_text(industry.get("id")),
        "examFamilyKey": family_key,
        "licenseGroup": family_key,
        "examFamilyName": family_name,
        "licenseGroupName": family_name,
        "tradeCode": normalized_trade_code,
        "specializationCode": normalized_trade_code,
        "examType": normalized_exam_type,
        "examTrack": normalized_exam_type,
        "questionCount": safe_question_count,
        "examTimeMinutes": safe_exam_time_minutes,
        "simulation": {
            "questionCount": safe_question_count,
            "examTimeMinutes": safe_exam_time_minutes,
            "categoryWeights": EXAM_MOCK_CATEGORY_WEIGHTS.get(normalized_code or exam_id, {}),
        },
        "questions": [],
    }
    if normalized_category_key:
        exam["categoryKey"] = normalized_category_key
    industry.setdefault("exams", []).append(exam)
    return exam


def upsert_question(exam: dict, question: dict) -> tuple[bool, bool]:
    questions = exam.setdefault("questions", [])
    for i, existing in enumerate(questions):
        if existing.get("id") == question["id"]:
            questions[i] = question
            return False, True
    questions.append(question)
    return True, False


def build_import_question_from_ai(
    row: dict,
    *,
    exam_id: str,
    trade_code: str = "",
    exam_type: str = "trade",
    ai_content: dict[str, str],
) -> tuple[dict, bool]:
    prompt_en = clean_text(row.get("prompt"))
    options_en = [clean_text(row.get(f"option_{letter}")) for letter in CSV_OPTION_LETTERS]
    answer_raw = clean_text(row.get("answer")).upper()
    answer_index = parse_answer(answer_raw)
    explanation_en = clean_text(row.get("explanation"))
    memory_trick = clean_text(row.get("memory_trick") or row.get("memoryTrick"))
    question_type = infer_type({"prompt": prompt_en, "explanation": explanation_en}, exam_id)
    normalized_exam_type = normalize_exam_type(exam_type)
    normalized_specialization = normalize_specialization_code(trade_code)
    if not normalized_specialization and normalized_exam_type != "law_business":
        normalized_specialization = derive_trade_code_from_exam(exam_id)
    if normalized_exam_type == "law_business":
        normalized_specialization = ""
    builtin = build_builtin_zh_support(
        prompt_en=prompt_en,
        options_en=options_en,
        answer_index=answer_index,
        question_type=question_type,
        explanation_en=explanation_en,
    )
    merged = dict(builtin)
    for key in AI_IMPORT_FIELDS:
        value = clean_text(ai_content.get(key))
        if value:
            merged[key] = value

    prompt_zh = clean_text(merged.get("prompt_zh"))
    options_zh = [clean_text(merged.get(f"option_{letter}_zh")) for letter in CSV_OPTION_LETTERS]
    explanation_en_final = clean_text(merged.get("explanation"))
    explanation_zh = clean_text(merged.get("explanation_zh"))
    key_point_zh = clean_text(merged.get("key_point_zh"))
    vocab_zh = clean_text(merged.get("vocab_zh"))
    memory_tip_zh = clean_text(merged.get("memory_tip_zh"))

    root_prompt = prompt_en
    root_options = options_en[:]
    root_explanation = explanation_en_final

    question = {
        "id": clean_text(row.get("question_id")),
        "prompt": root_prompt,
        "options": root_options,
        "answerIndex": answer_index,
        "explanation": root_explanation,
        "memory_trick": memory_trick,
        "memoryTrick": memory_trick,
        "questionType": question_type,
        "status": "active",
        "examCode": normalize_exam_code(exam_id),
        "tradeCode": normalized_specialization,
        "specializationCode": normalized_specialization,
        "examType": normalized_exam_type,
        "examTrack": normalized_exam_type,
        "prompt_zh": prompt_zh,
        "option_a_zh": options_zh[0],
        "option_b_zh": options_zh[1],
        "option_c_zh": options_zh[2],
        "option_d_zh": options_zh[3],
        "explanation_zh": explanation_zh,
        "key_point_zh": key_point_zh,
        "vocab_zh": vocab_zh,
        "memory_tip_zh": memory_tip_zh,
    }

    i18n = {
        "sourceLanguage": "en",
        "en": compose_locale_payload(
            prompt_en,
            options_en,
            explanation_en_final,
            question_type,
            "",
            "",
            "",
            "",
            memory_trick,
        ),
        "zh": compose_locale_payload(
            prompt_zh,
            options_zh,
            explanation_zh,
            question_type,
            key_point_zh,
            "",
            vocab_zh,
            memory_tip_zh,
        ),
    }
    used_ai = any(clean_text(ai_content.get(key)) for key in AI_IMPORT_FIELDS)
    translated = bool(prompt_zh or any(options_zh) or explanation_zh or key_point_zh or vocab_zh or memory_tip_zh)
    if translated:
        i18n["translationMeta"] = {
            "autoTranslatedFrom": "en",
            "engine": OPENAI_MODEL if used_ai else "builtin-glossary-v1",
            "generatedAt": now_iso(),
        }
    question["i18n"] = i18n
    question["translation_status"] = "ai_translated" if translated else "untranslated"
    return question, used_ai


def upsert_question_row(
    conn: sqlite3.Connection,
    *,
    row: dict,
    ai_content: dict[str, str],
    category_key: str,
    industry_id: str,
    industry_name: str,
    exam_family_key: str,
    exam_family_name: str,
    trade_code: str,
    exam_type: str,
    exam_code: str,
    exam_id: str,
    exam_name: str,
    question_type: str,
    question_status: str,
) -> None:
    now = now_iso()
    normalized_exam_code = normalize_exam_code(exam_code)
    normalized_exam_id = normalize_exam_code(exam_id) or normalized_exam_code
    normalized_question_id = clean_text(row.get("question_id"))
    normalized_program_code = normalize_hierarchy_key(industry_id)
    normalized_license_group = normalize_hierarchy_key(exam_family_key)
    normalized_exam_track = normalize_exam_type(exam_type)
    normalized_specialization_code = normalize_specialization_code(trade_code)
    if normalized_exam_track == "law_business" and is_shared_specialization_code(normalized_specialization_code):
        normalized_specialization_code = ""
    normalized_question_category = normalize_category_key(category_key)
    requested_category_code = clean_text(row.get("category_code") or row.get("categoryCode")).upper()
    if not requested_category_code:
        requested_category_code = clean_text(row.get("question_category") or row.get("questionCategory")).upper()
    if not requested_category_code:
        requested_category_code = f"{normalized_exam_code}__UNCATEGORIZED".upper()
    difficulty = clean_text(row.get("difficulty"))
    tags = clean_text(row.get("tags"))
    key_points = clean_text(row.get("key_points") or row.get("keyPoints"))
    conn.execute(
        """
        INSERT INTO questions(
          question_id,
          program_code,
          license_group,
          specialization_code,
          exam_track,
          question_category,
          category_code,
          category_key,
          industry_id,
          industry_name,
          exam_family_key,
          exam_family_name,
          trade_code,
          exam_type,
          exam_code,
          exam_id,
          exam_name,
          question_type,
          difficulty,
          tags,
          key_points,
          question_status,
          prompt,
          option_a,
          option_b,
          option_c,
          option_d,
          answer,
          prompt_zh,
          option_a_zh,
          option_b_zh,
          option_c_zh,
          option_d_zh,
          explanation,
          explanation_zh,
          key_point_zh,
          vocab_zh,
          memory_trick,
          memory_tip_zh,
          created_at,
          updated_at
        )
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT(question_id, exam_id) DO UPDATE SET
          program_code=excluded.program_code,
          license_group=excluded.license_group,
          specialization_code=excluded.specialization_code,
          exam_track=excluded.exam_track,
          question_category=excluded.question_category,
          category_code=excluded.category_code,
          category_key=excluded.category_key,
          industry_id=excluded.industry_id,
          industry_name=excluded.industry_name,
          exam_family_key=excluded.exam_family_key,
          exam_family_name=excluded.exam_family_name,
          trade_code=excluded.trade_code,
          exam_type=excluded.exam_type,
          exam_code=excluded.exam_code,
          exam_name=excluded.exam_name,
          question_type=excluded.question_type,
          difficulty=excluded.difficulty,
          tags=excluded.tags,
          key_points=excluded.key_points,
          question_status=excluded.question_status,
          prompt=excluded.prompt,
          option_a=excluded.option_a,
          option_b=excluded.option_b,
          option_c=excluded.option_c,
          option_d=excluded.option_d,
          answer=excluded.answer,
          prompt_zh=excluded.prompt_zh,
          option_a_zh=excluded.option_a_zh,
          option_b_zh=excluded.option_b_zh,
          option_c_zh=excluded.option_c_zh,
          option_d_zh=excluded.option_d_zh,
          explanation=excluded.explanation,
          explanation_zh=excluded.explanation_zh,
          key_point_zh=excluded.key_point_zh,
          vocab_zh=excluded.vocab_zh,
          memory_trick=excluded.memory_trick,
          memory_tip_zh=excluded.memory_tip_zh,
          updated_at=excluded.updated_at
        """,
        (
            normalized_question_id,
            normalized_program_code,
            normalized_license_group,
            normalized_specialization_code,
            normalized_exam_track,
            normalized_question_category,
            requested_category_code,
            normalized_question_category,
            industry_id,
            industry_name,
            exam_family_key,
            exam_family_name,
            normalized_specialization_code,
            normalized_exam_track,
            normalized_exam_code,
            normalized_exam_id,
            exam_name,
            question_type,
            difficulty,
            tags,
            key_points,
            normalize_question_status(question_status, "active"),
            clean_text(row.get("prompt")),
            clean_text(row.get("option_a")),
            clean_text(row.get("option_b")),
            clean_text(row.get("option_c")),
            clean_text(row.get("option_d")),
            clean_text(row.get("answer")).upper(),
            clean_text(ai_content.get("prompt_zh")),
            clean_text(ai_content.get("option_a_zh")),
            clean_text(ai_content.get("option_b_zh")),
            clean_text(ai_content.get("option_c_zh")),
            clean_text(ai_content.get("option_d_zh")),
            clean_text(ai_content.get("explanation")),
            clean_text(ai_content.get("explanation_zh")),
            clean_text(ai_content.get("key_point_zh")),
            clean_text(ai_content.get("vocab_zh")),
            clean_text(row.get("memory_trick") or row.get("memoryTrick")),
            clean_text(ai_content.get("memory_tip_zh")),
            now,
            now,
        ),
    )
    if normalized_question_id and normalized_exam_id:
        conn.execute(
            """
            DELETE FROM questions
            WHERE question_id = ?
              AND REPLACE(LOWER(exam_id), '-', '_') = ?
              AND exam_id <> ?
            """,
            (normalized_question_id, normalized_exam_id, normalized_exam_id),
        )


def answer_index_to_letter(answer_index: int | str | None) -> str:
    idx = to_int(answer_index, 0)
    if idx < 0 or idx >= len(CSV_OPTION_LETTERS):
        idx = 0
    return CSV_OPTION_LETTERS[idx].upper()


def export_question_bank_full_csv(bank: dict) -> str:
    header = [
        "question_id",
        "exam_code",
        "category_code",
        "prompt",
        "prompt_zh",
        "option_a",
        "option_a_zh",
        "option_b",
        "option_b_zh",
        "option_c",
        "option_c_zh",
        "option_d",
        "option_d_zh",
        "answer",
        "explanation",
        "explanation_zh",
        "question_type",
        "difficulty",
        "tags",
        "key_points",
        "memory_trick",
    ]
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(header)

    for industry in bank.get("industries", []):
        if not isinstance(industry, dict):
            continue
        for exam in industry.get("exams", []):
            if not isinstance(exam, dict):
                continue
            exam_code = normalize_exam_code(exam.get("examCode") or exam.get("id"))
            for question in exam.get("questions", []):
                if not isinstance(question, dict):
                    continue
                i18n = question.get("i18n") if isinstance(question.get("i18n"), dict) else {}
                zh = i18n.get("zh") if isinstance(i18n.get("zh"), dict) else {}
                en = i18n.get("en") if isinstance(i18n.get("en"), dict) else {}
                options = normalize_options(question.get("options"), ["", "", "", ""])
                zh_options = normalize_options(
                    zh.get("options"),
                    [
                        clean_text(question.get("option_a_zh")),
                        clean_text(question.get("option_b_zh")),
                        clean_text(question.get("option_c_zh")),
                        clean_text(question.get("option_d_zh")),
                    ],
                )
                writer.writerow(
                    [
                        clean_text(question.get("id")),
                        exam_code,
                        clean_text(question.get("categoryCode")).upper(),
                        clean_text(question.get("prompt")),
                        clean_text(zh.get("prompt") or question.get("prompt_zh") or question.get("promptZh")),
                        clean_text(options[0]),
                        clean_text(zh_options[0]),
                        clean_text(options[1]),
                        clean_text(zh_options[1]),
                        clean_text(options[2]),
                        clean_text(zh_options[2]),
                        clean_text(options[3]),
                        clean_text(zh_options[3]),
                        answer_index_to_letter(question.get("answerIndex")),
                        clean_text(question.get("explanation")),
                        clean_text(zh.get("explanation") or question.get("explanation_zh") or question.get("explanationZh")),
                        clean_text(question.get("questionType")),
                        clean_text(question.get("difficulty")),
                        clean_text(question.get("tags")),
                        clean_text(question.get("keyPoints") or question.get("key_points")),
                        clean_text(question.get("memory_trick") or question.get("memoryTrick") or en.get("memoryTrick")),
                    ]
                )
    return output.getvalue()


def upsert_question_row_from_bank_question(
    conn: sqlite3.Connection,
    *,
    question: dict,
    category_key: str,
    industry_id: str,
    industry_name: str,
    exam_family_key: str,
    exam_family_name: str,
    trade_code: str,
    exam_type: str,
    exam_code: str,
    exam_name: str,
) -> None:
    runtime_category_code = clean_text(
        question.get("categoryCode")
        or question.get("category_code")
    ).upper()
    runtime_question_category = normalize_category_key(
        question.get("questionCategory")
        or question.get("question_category")
        or question.get("categoryKey")
        or question.get("category_key")
        or category_key
    )
    options = normalize_options(question.get("options"), ["", "", "", ""])
    row = {
        "question_id": clean_text(question.get("id")),
        "category_code": runtime_category_code,
        "question_category": runtime_question_category,
        "difficulty": clean_text(question.get("difficulty")),
        "tags": clean_text(question.get("tags")),
        "key_points": clean_text(question.get("keyPoints") or question.get("key_points")),
        "memory_trick": clean_text(
            question.get("memory_trick")
            or question.get("memoryTrick")
            or ((question.get("en") or {}).get("memoryTrick") if isinstance(question.get("en"), dict) else "")
        ),
        "prompt": clean_text(question.get("prompt")),
        "option_a": clean_text(options[0] if len(options) > 0 else ""),
        "option_b": clean_text(options[1] if len(options) > 1 else ""),
        "option_c": clean_text(options[2] if len(options) > 2 else ""),
        "option_d": clean_text(options[3] if len(options) > 3 else ""),
        "answer": answer_index_to_letter(question.get("answerIndex")),
    }
    ai_content = {
        "explanation": clean_text(question.get("explanation")),
        "prompt_zh": clean_text(question.get("prompt_zh")),
        "option_a_zh": clean_text(question.get("option_a_zh")),
        "option_b_zh": clean_text(question.get("option_b_zh")),
        "option_c_zh": clean_text(question.get("option_c_zh")),
        "option_d_zh": clean_text(question.get("option_d_zh")),
        "explanation_zh": clean_text(question.get("explanation_zh")),
        "key_point_zh": clean_text(question.get("key_point_zh")),
        "vocab_zh": clean_text(question.get("vocab_zh")),
        "memory_tip_zh": clean_text(question.get("memory_tip_zh")),
    }
    upsert_question_row(
        conn,
        row=row,
        ai_content=ai_content,
        category_key=normalize_category_key(category_key) or normalize_category_key(question.get("categoryKey")),
        industry_id=clean_text(industry_id),
        industry_name=clean_text(industry_name),
        exam_family_key=normalize_hierarchy_key(exam_family_key),
        exam_family_name=clean_text(exam_family_name),
        trade_code=normalize_trade_code(trade_code),
        exam_type=normalize_exam_type(exam_type),
        exam_code=normalize_exam_code(exam_code),
        exam_id=normalize_exam_code(exam_code),
        exam_name=clean_text(exam_name),
        question_type=clean_text(question.get("questionType")),
        question_status=normalize_question_status(question.get("status") or question.get("questionStatus"), "active"),
    )


def parse_csv_rows(csv_text: str) -> tuple[list[str], list[dict]]:
    reader = csv.DictReader(io.StringIO(csv_text))
    if not reader.fieldnames:
        raise ValueError("CSV 缺少表头")

    fieldnames = [clean_text(name) for name in (reader.fieldnames or []) if clean_text(name)]
    normalized_fields = [name.lower() for name in fieldnames]
    if len(set(normalized_fields)) != len(normalized_fields):
        raise ValueError("CSV 表头存在重复字段，请检查模板")

    rows: list[dict] = []
    for idx, raw_row in enumerate(reader, start=2):
        row = {clean_text(k): clean_text(v) for k, v in (raw_row or {}).items() if clean_text(k)}
        if not any(clean_text(v) for v in row.values()):
            continue
        row["__line__"] = idx
        rows.append(row)
    return normalized_fields, rows


def detect_import_mode(columns: list[str], requested_mode: str = "auto") -> str:
    mode = clean_text(requested_mode).lower()
    if mode in {"simple", "full"}:
        return mode
    full_markers = {item.lower() for item in FULL_IMPORT_OPTIONAL_COLUMNS}
    if any(col in full_markers for col in columns):
        return "full"
    return "simple"


def normalize_b_topic(raw_type: str, text: str) -> str:
    source = f"{raw_type} {text}".lower()
    for label, keys in B_TOPIC_RULES:
        if any(k.lower() in source for k in keys):
            return label
    return raw_type.strip() or "Uncategorized / 未分类"


def infer_type(question: dict, exam_id: str) -> str:
    raw = str(question.get("questionType") or "").strip()
    text = f"{question.get('prompt', '')} {question.get('explanation', '')}"

    if normalize_exam_code(exam_id) in {"ca_general_b", "ca-general-b"}:
        return normalize_b_topic(raw, text)

    if raw:
        return raw
    if any(k in text for k in ["合同", "变更", "付款", "验收", "签署"]):
        return "合同与流程"
    if any(k in text.lower() for k in ["safety", "osha"]) or "安全" in text:
        return "安全管理"
    if any(k in text for k in ["估算", "成本", "预算", "报价", "利润"]):
        return "估算与成本"
    if any(k in text for k in ["分包", "资质", "保险", "合规", "执照"]):
        return "合规与资质"
    if any(k in text for k in ["工期", "进度", "材料", "采购"]):
        return "进度与材料"
    return "综合基础"


def summarize_bank(bank: dict) -> dict:
    industries = bank.get("industries", [])
    exams = [e for ind in industries for e in ind.get("exams", [])]
    questions = [q for e in exams for q in e.get("questions", [])]
    active_questions = [q for q in questions if normalize_question_status(q.get("status") or q.get("questionStatus"), "active") == "active"]
    inactive_questions = [q for q in questions if normalize_question_status(q.get("status") or q.get("questionStatus"), "active") == "inactive"]
    deleted_questions = [q for q in questions if normalize_question_status(q.get("status") or q.get("questionStatus"), "active") == "deleted"]

    b_exam = next(
        (
            e
            for e in exams
            if normalize_exam_code(e.get("examCode") or e.get("id")) in {"ca_general_b", "ca-general-b"}
        ),
        None,
    )
    b_questions = [
        q
        for q in (b_exam.get("questions", []) if b_exam else [])
        if normalize_question_status(q.get("status") or q.get("questionStatus"), "active") == "active"
    ]
    b_types = {infer_type(q, "ca-general-b") for q in b_questions}

    return {
        "industries": len(industries),
        "exams": len(exams),
        "questions": len(questions),
        "activeQuestions": len(active_questions),
        "inactiveQuestions": len(inactive_questions),
        "deletedQuestions": len(deleted_questions),
        "bTypeCount": len(b_types),
        "bQuestionCount": len(b_questions),
        "bTopics": sorted(b_types, key=lambda x: B_TOPIC_ORDER.index(x) if x in B_TOPIC_ORDER else 999),
    }


def sync_questions_table_from_bank(conn: sqlite3.Connection, bank: dict) -> int:
    """
    Keep questions table aligned with question_bank_json for admin consistency views.
    Non-destructive: upserts/refreshes known bank questions; does not hard-delete table rows.
    """
    ensure_questions_table(conn)
    ensure_default_exam_catalog(conn)
    synced = 0
    industries = bank.get("industries", []) if isinstance(bank, dict) else []
    for industry in industries:
        if not isinstance(industry, dict):
            continue
        industry_id = clean_text(industry.get("id"))
        industry_name = clean_text(industry.get("name")) or industry_id
        exams = industry.get("exams", [])
        if not isinstance(exams, list):
            continue
        for exam in exams:
            if not isinstance(exam, dict):
                continue
            exam_code = normalize_exam_code(exam.get("examCode") or exam.get("id"))
            if not exam_code:
                continue
            exam_name = clean_text(exam.get("name")) or exam_code
            exam_family_key = normalize_hierarchy_key(
                exam.get("examFamilyKey") or exam.get("licenseGroup")
            )
            exam_family_name = clean_text(
                exam.get("examFamilyName") or exam.get("licenseGroupName")
            )
            if not exam_family_key:
                inferred_family_key, inferred_family_name = derive_exam_family_from_code(exam_code)
                exam_family_key = inferred_family_key
                if not exam_family_name:
                    exam_family_name = inferred_family_name
            if not exam_family_name:
                _, inferred_family_name = derive_exam_family_from_code(exam_code)
                exam_family_name = inferred_family_name
            exam_type = normalize_exam_type(
                exam.get("examType") or exam.get("examTrack"),
                derive_exam_type_from_exam(exam_code, exam_name),
            )
            trade_code = normalize_trade_code(
                exam.get("tradeCode")
                or exam.get("specializationCode")
                or derive_trade_code_from_exam(exam_code, exam_family_key)
            )
            if exam_type == "law_business":
                trade_code = ""
            category_key = normalize_category_key(exam.get("categoryKey"))
            questions = exam.get("questions", [])
            if not isinstance(questions, list):
                continue
            for question in questions:
                if not isinstance(question, dict):
                    continue
                question_id = clean_text(question.get("id"))
                if not question_id:
                    continue
                upsert_question_row_from_bank_question(
                    conn,
                    question=question,
                    category_key=category_key,
                    industry_id=industry_id,
                    industry_name=industry_name,
                    exam_family_key=exam_family_key,
                    exam_family_name=exam_family_name,
                    trade_code=trade_code,
                    exam_type=exam_type,
                    exam_code=exam_code,
                    exam_name=exam_name,
                )
                synced += 1
    return synced


def summarize_questions_table(conn: sqlite3.Connection) -> dict:
    ensure_questions_table(conn)
    row = conn.execute(
        """
        SELECT
          COUNT(1) AS total_questions,
          SUM(CASE WHEN COALESCE(NULLIF(LOWER(TRIM(COALESCE(question_status, 'active'))), ''), 'active') = 'active' THEN 1 ELSE 0 END) AS active_questions,
          SUM(CASE WHEN COALESCE(NULLIF(LOWER(TRIM(COALESCE(question_status, 'active'))), ''), 'active') = 'inactive' THEN 1 ELSE 0 END) AS inactive_questions,
          SUM(CASE WHEN COALESCE(NULLIF(LOWER(TRIM(COALESCE(question_status, 'active'))), ''), 'active') = 'deleted' THEN 1 ELSE 0 END) AS deleted_questions,
          COUNT(DISTINCT COALESCE(NULLIF(TRIM(exam_code), ''), TRIM(exam_id))) AS exams_count,
          COUNT(DISTINCT COALESCE(NULLIF(TRIM(industry_id), ''), NULLIF(TRIM(program_code), ''), 'general')) AS industries_count,
          SUM(
            CASE
              WHEN COALESCE(NULLIF(LOWER(TRIM(COALESCE(question_status, 'active'))), ''), 'active') = 'active'
                AND LOWER(TRIM(COALESCE(NULLIF(exam_code, ''), NULLIF(exam_id, ''), ''))) IN ('ca_general_b', 'ca-general-b')
              THEN 1 ELSE 0
            END
          ) AS b_question_count
        FROM questions
        """
    ).fetchone()

    b_type_rows = conn.execute(
        """
        SELECT DISTINCT COALESCE(NULLIF(TRIM(question_type), ''), 'Uncategorized / 未分类') AS topic
        FROM questions
        WHERE
          COALESCE(NULLIF(LOWER(TRIM(COALESCE(question_status, 'active'))), ''), 'active') = 'active'
          AND LOWER(TRIM(COALESCE(NULLIF(exam_code, ''), NULLIF(exam_id, ''), ''))) IN ('ca_general_b', 'ca-general-b')
        """
    ).fetchall()
    b_topics = sorted(
        {clean_text(r["topic"]) for r in b_type_rows if clean_text(r["topic"])},
        key=lambda x: B_TOPIC_ORDER.index(x) if x in B_TOPIC_ORDER else 999,
    )

    return {
        "industries": int(row["industries_count"] or 0) if row else 0,
        "exams": int(row["exams_count"] or 0) if row else 0,
        "questions": int(row["total_questions"] or 0) if row else 0,
        "activeQuestions": int(row["active_questions"] or 0) if row else 0,
        "inactiveQuestions": int(row["inactive_questions"] or 0) if row else 0,
        "deletedQuestions": int(row["deleted_questions"] or 0) if row else 0,
        "bQuestionCount": int(row["b_question_count"] or 0) if row else 0,
        "bTypeCount": len(b_topics),
        "bTopics": b_topics,
    }


def get_exam_category_codes_by_exam(conn: sqlite3.Connection, *, active_only: bool = True) -> dict[str, list[dict]]:
    ensure_exam_categories_defaults(conn)
    rows = list_exam_categories(conn, exam_code=None, active_only=active_only)
    mapped: dict[str, list[dict]] = {}
    for row in rows:
        payload = normalize_exam_category_payload(row)
        exam_code = normalize_exam_code(payload["examCode"])
        if not exam_code:
            continue
        mapped.setdefault(exam_code, []).append(payload)
    for items in mapped.values():
        items.sort(key=lambda item: (int(item["sortOrder"]), clean_text(item["code"])))
    return mapped


def parse_answer_index_safe(value: str | None) -> int:
    try:
        return parse_answer(value or "")
    except Exception:
        return 0


def row_to_runtime_question(row: sqlite3.Row) -> dict:
    exam_code = normalize_exam_code(row["exam_code"] or row["exam_id"])
    category_code = clean_text(row["category_code"]).upper()
    if not category_code:
        category_code = clean_text(row["question_category"]).upper()
    if not category_code:
        category_code = f"{exam_code}__UNCATEGORIZED".upper() if exam_code else "UNCATEGORIZED"
    question = {
        "id": clean_text(row["question_id"]),
        "examCode": exam_code,
        "programCode": normalize_hierarchy_key(row["program_code"] or row["industry_id"]),
        "examFamilyKey": normalize_hierarchy_key(row["license_group"] or row["exam_family_key"]),
        "licenseGroup": normalize_hierarchy_key(row["license_group"] or row["exam_family_key"]),
        "tradeCode": normalize_specialization_code(row["specialization_code"] or row["trade_code"]),
        "specializationCode": normalize_specialization_code(row["specialization_code"] or row["trade_code"]),
        "examType": normalize_exam_type(row["exam_type"] or row["exam_track"], "trade"),
        "examTrack": normalize_exam_type(row["exam_track"] or row["exam_type"], "trade"),
        "categoryKey": normalize_category_key(row["category_key"] or row["question_category"]),
        "questionCategory": normalize_category_key(row["question_category"] or row["category_key"]),
        "categoryCode": category_code,
        "prompt": clean_text(row["prompt"]),
        "options": [
            clean_text(row["option_a"]),
            clean_text(row["option_b"]),
            clean_text(row["option_c"]),
            clean_text(row["option_d"]),
        ],
        "answerIndex": parse_answer_index_safe(row["answer"]),
        "explanation": clean_text(row["explanation"]),
        "memory_trick": clean_text(row["memory_trick"]) if "memory_trick" in row.keys() else "",
        "memoryTrick": clean_text(row["memory_trick"]) if "memory_trick" in row.keys() else "",
        "questionType": clean_text(row["question_type"]),
        "difficulty": clean_text(row["difficulty"]) if "difficulty" in row.keys() else "",
        "tags": clean_text(row["tags"]) if "tags" in row.keys() else "",
        "keyPoints": clean_text(row["key_points"]) if "key_points" in row.keys() else "",
        "prompt_zh": clean_text(row["prompt_zh"]),
        "option_a_zh": clean_text(row["option_a_zh"]),
        "option_b_zh": clean_text(row["option_b_zh"]),
        "option_c_zh": clean_text(row["option_c_zh"]),
        "option_d_zh": clean_text(row["option_d_zh"]),
        "explanation_zh": clean_text(row["explanation_zh"]),
        "key_point_zh": clean_text(row["key_point_zh"]),
        "vocab_zh": clean_text(row["vocab_zh"]),
        "memory_tip_zh": clean_text(row["memory_tip_zh"]),
        "imageUrl": clean_text(row["image_url"]) if "image_url" in row.keys() else "",
        "image_url": clean_text(row["image_url"]) if "image_url" in row.keys() else "",
        "status": normalize_question_status(row["question_status"], "active"),
    }
    ensure_question_i18n(question)
    return question


def compose_bank_from_tables(
    conn: sqlite3.Connection, *, enabled_only: bool = True, active_questions_only: bool = True
) -> dict:
    ensure_questions_table(conn)
    exam_rows = list_exam_catalog_from_structure(conn, enabled_only=enabled_only)
    if not exam_rows:
        return {"industries": []}

    exam_codes = [normalize_exam_code(item.get("examCode")) for item in exam_rows if normalize_exam_code(item.get("examCode"))]
    if not exam_codes:
        return {"industries": []}
    placeholders = ",".join(["?"] * len(exam_codes))
    status_filter = (
        "AND COALESCE(NULLIF(LOWER(TRIM(COALESCE(question_status, 'active'))), ''), 'active') = 'active'"
        if active_questions_only
        else ""
    )
    question_rows = conn.execute(
        f"""
        SELECT
          question_id,
          program_code,
          license_group,
          specialization_code,
          exam_track,
          question_category,
          category_code,
          category_key,
          industry_id,
          industry_name,
          exam_family_key,
          exam_family_name,
          trade_code,
          exam_type,
          exam_code,
          exam_id,
          exam_name,
          question_type,
          difficulty,
          tags,
          key_points,
          question_status,
          prompt,
          option_a,
          option_b,
          option_c,
          option_d,
          answer,
          prompt_zh,
          option_a_zh,
          option_b_zh,
          option_c_zh,
          option_d_zh,
          explanation,
          explanation_zh,
          key_point_zh,
          vocab_zh,
          memory_trick,
          memory_tip_zh,
          image_url
        FROM questions
        WHERE LOWER(TRIM(COALESCE(NULLIF(exam_code,''), NULLIF(exam_id,''), ''))) IN ({placeholders})
        {status_filter}
        ORDER BY updated_at DESC, question_id ASC
        """,
        exam_codes,
    ).fetchall()

    questions_by_exam: dict[str, list[dict]] = {}
    for row in question_rows:
        exam_code = normalize_exam_code(row["exam_code"] or row["exam_id"])
        if not exam_code:
            continue
        questions_by_exam.setdefault(exam_code, []).append(row_to_runtime_question(row))

    categories_by_exam = get_exam_category_codes_by_exam(conn, active_only=True)
    industries_map: dict[str, dict] = {}
    for exam in exam_rows:
        exam_code = normalize_exam_code(exam.get("examCode"))
        if not exam_code:
            continue
        industry_key = normalize_hierarchy_key(exam.get("industryKey")) or "general"
        industry_name = clean_text(exam.get("industryName")) or industry_key
        industry = industries_map.setdefault(industry_key, {"id": industry_key, "name": industry_name, "exams": []})
        categories = categories_by_exam.get(exam_code, [])
        question_items = questions_by_exam.get(exam_code, [])
        count_by_category: dict[str, int] = {}
        for question in question_items:
            cc = clean_text(question.get("categoryCode")).upper() or f"{exam_code}__UNCATEGORIZED".upper()
            count_by_category[cc] = count_by_category.get(cc, 0) + 1
        categories_payload = []
        for category in categories:
            code = clean_text(category.get("code")).upper()
            categories_payload.append(
                {
                    "code": code,
                    "name": clean_text(category.get("name")) or code,
                    "nameZh": clean_text(category.get("nameZh")),
                    "description": clean_text(category.get("description")),
                    "sortOrder": int(category.get("sortOrder") or 100),
                    "questionCount": int(count_by_category.get(code, 0)),
                    "isActive": bool(category.get("isActive")),
                }
            )
        if not any(clean_text(item.get("code")).upper() == f"{exam_code}__UNCATEGORIZED".upper() for item in categories_payload):
            categories_payload.append(
                {
                    "code": f"{exam_code}__UNCATEGORIZED".upper(),
                    "name": "UNCATEGORIZED",
                    "nameZh": "未分类",
                    "description": "Default fallback category.",
                    "sortOrder": 9999,
                    "questionCount": int(count_by_category.get(f"{exam_code}__UNCATEGORIZED".upper(), 0)),
                    "isActive": True,
                }
            )
        categories_payload.sort(key=lambda item: (int(item["sortOrder"]), clean_text(item["code"])))
        exam_payload = {
            "id": exam_code,
            "examCode": exam_code,
            "name": clean_text(exam.get("examName")) or exam_code,
            "nameZh": clean_text(exam.get("nameZh")),
            "description": clean_text(exam.get("description")),
            "programCode": industry_key,
            "examFamilyKey": normalize_hierarchy_key(exam.get("examFamilyKey")),
            "examFamilyName": clean_text(exam.get("examFamilyName")),
            "licenseGroup": normalize_hierarchy_key(exam.get("licenseGroup") or exam.get("examFamilyKey")),
            "licenseGroupName": clean_text(exam.get("licenseGroupName") or exam.get("examFamilyName")),
            "tradeCode": normalize_specialization_code(exam.get("tradeCode")),
            "specializationCode": normalize_specialization_code(exam.get("specializationCode") or exam.get("tradeCode")),
            "examType": normalize_exam_type(exam.get("examType"), "trade"),
            "examTrack": normalize_exam_type(exam.get("examTrack") or exam.get("examType"), "trade"),
            "categoryKey": normalize_category_key(exam.get("categoryKey")),
            "sortOrder": int(exam.get("sortOrder") or 100),
            "isEnabled": bool(exam.get("isEnabled")),
            "practiceEnabled": bool(exam.get("practiceEnabled")),
            "mockEnabled": bool(exam.get("mockEnabled")),
            "includedExamCodes": normalize_exam_code_list(exam.get("includedExamCodes")),
            "questionCount": int(exam.get("questionCount") or 100),
            "examTimeMinutes": int(exam.get("examTimeMinutes") or 180),
            "simulation": {
                "questionCount": int(exam.get("questionCount") or 100),
                "examTimeMinutes": int(exam.get("examTimeMinutes") or 180),
                "categoryWeights": EXAM_MOCK_CATEGORY_WEIGHTS.get(exam_code, {}),
            },
            "categories": categories_payload,
            "questions": question_items,
        }
        industry["exams"].append(exam_payload)

    industries = list(industries_map.values())
    industries.sort(key=lambda item: clean_text(item.get("id")))
    for industry in industries:
        industry["exams"].sort(
            key=lambda item: (
                clean_text(item.get("examFamilyKey")),
                clean_text(item.get("tradeCode")),
                clean_text(item.get("examType")),
                int(item.get("sortOrder") or 100),
                clean_text(item.get("id")),
            )
        )
    return {"industries": industries}


def list_runtime_exams_with_categories(conn: sqlite3.Connection) -> list[dict]:
    rows = list_exam_catalog_from_structure(conn, enabled_only=True)
    if not rows:
        return []
    categories_by_exam = get_exam_category_codes_by_exam(conn, active_only=True)
    counts_by_exam: dict[str, dict[str, int]] = {}
    count_rows = conn.execute(
        """
        SELECT
          LOWER(TRIM(COALESCE(NULLIF(exam_code,''), NULLIF(exam_id,''), ''))) AS exam_code,
          UPPER(TRIM(COALESCE(NULLIF(category_code,''), NULLIF(question_category,''), ''))) AS category_code,
          COUNT(1) AS cnt
        FROM questions
        WHERE COALESCE(NULLIF(LOWER(TRIM(COALESCE(question_status, 'active'))), ''), 'active') = 'active'
        GROUP BY LOWER(TRIM(COALESCE(NULLIF(exam_code,''), NULLIF(exam_id,''), ''))),
                 UPPER(TRIM(COALESCE(NULLIF(category_code,''), NULLIF(question_category,''), '')))
        """
    ).fetchall()
    for row in count_rows:
        exam_code = normalize_exam_code(row["exam_code"])
        category_code = clean_text(row["category_code"]).upper()
        if not exam_code:
            continue
        counts_by_exam.setdefault(exam_code, {})[category_code] = int(row["cnt"] or 0)

    out: list[dict] = []
    for exam in rows:
        exam_code = normalize_exam_code(exam.get("examCode"))
        if not exam_code:
            continue
        categories = []
        for category in categories_by_exam.get(exam_code, []):
            code = clean_text(category.get("code")).upper()
            categories.append(
                {
                    "code": code,
                    "name": clean_text(category.get("name")) or code,
                    "nameZh": clean_text(category.get("nameZh")),
                    "description": clean_text(category.get("description")),
                    "sortOrder": int(category.get("sortOrder") or 100),
                    "isActive": bool(category.get("isActive")),
                    "questionCount": int(counts_by_exam.get(exam_code, {}).get(code, 0)),
                }
            )
        if not any(clean_text(cat.get("code")).upper() == f"{exam_code}__UNCATEGORIZED".upper() for cat in categories):
            categories.append(
                {
                    "code": f"{exam_code}__UNCATEGORIZED".upper(),
                    "name": "UNCATEGORIZED",
                    "nameZh": "未分类",
                    "description": "Default fallback category.",
                    "sortOrder": 9999,
                    "isActive": True,
                    "questionCount": int(counts_by_exam.get(exam_code, {}).get(f"{exam_code}__UNCATEGORIZED".upper(), 0)),
                }
            )
        categories.sort(key=lambda item: (int(item["sortOrder"]), clean_text(item["code"])))
        exam_copy = dict(exam)
        exam_copy["categories"] = categories
        out.append(exam_copy)
    return out


def fetch_runtime_questions(
    conn: sqlite3.Connection,
    *,
    exam_codes: list[str],
    category_code: str = "",
    limit: int = 0,
) -> list[dict]:
    codes = [normalize_exam_code(code) for code in exam_codes if normalize_exam_code(code)]
    if not codes:
        return []
    placeholders = ",".join(["?"] * len(codes))
    params: list = list(codes)
    where = [
        f"LOWER(TRIM(COALESCE(NULLIF(exam_code,''), NULLIF(exam_id,''), ''))) IN ({placeholders})",
        "COALESCE(NULLIF(LOWER(TRIM(COALESCE(question_status, 'active'))), ''), 'active') = 'active'",
    ]
    cat_code = clean_text(category_code).upper()
    if cat_code:
        where.append("UPPER(TRIM(COALESCE(NULLIF(category_code,''), NULLIF(question_category,''), ''))) = ?")
        params.append(cat_code)
    limit_sql = ""
    if limit and limit > 0:
        limit_sql = "LIMIT ?"
        params.append(int(limit))
    rows = conn.execute(
        f"""
        SELECT
          question_id,
          program_code,
          license_group,
          specialization_code,
          exam_track,
          question_category,
          category_code,
          category_key,
          industry_id,
          industry_name,
          exam_family_key,
          exam_family_name,
          trade_code,
          exam_type,
          exam_code,
          exam_id,
          exam_name,
          question_type,
          difficulty,
          tags,
          key_points,
          question_status,
          prompt,
          option_a,
          option_b,
          option_c,
          option_d,
          answer,
          prompt_zh,
          option_a_zh,
          option_b_zh,
          option_c_zh,
          option_d_zh,
          explanation,
          explanation_zh,
          key_point_zh,
          vocab_zh,
          memory_trick,
          memory_tip_zh,
          image_url
        FROM questions
        WHERE {' AND '.join(where)}
        ORDER BY RANDOM()
        {limit_sql}
        """,
        params,
    ).fetchall()
    return [row_to_runtime_question(row) for row in rows]


def filter_questions_for_user_access(
    *,
    questions: list[dict],
    user_payload: dict,
    enabled_categories: set[str],
    max_trial_questions: int = 10,
) -> tuple[list[dict], str]:
    membership_tier = normalize_membership_tier(
        user_payload.get("membershipTier"),
        infer_membership_tier(plan=user_payload.get("plan")),
    )
    active_entitlements = user_payload.get("entitlements") if isinstance(user_payload.get("entitlements"), dict) else {}
    content_permissions = user_payload.get("contentPermissions") if isinstance(user_payload.get("contentPermissions"), dict) else {}
    defaults = content_permission_defaults_for_tier(membership_tier)
    effective_permissions = {
        key: bool(content_permissions.get(key, defaults[key]))
        for key in CONTENT_PERMISSION_KEYS
    }
    if is_paid_membership_tier(membership_tier):
        category_entitlements = (
            user_payload.get("categoryEntitlements")
            if isinstance(user_payload.get("categoryEntitlements"), dict)
            else {}
        )
        visible = []
        for question in questions:
            category_key = normalize_category_key(question.get("categoryKey") or question.get("questionCategory"))
            if category_key and not user_has_category_access(
                category_key,
                category_entitlements=category_entitlements,
                legacy_entitlements=active_entitlements,
                enabled_categories=enabled_categories,
            ):
                continue
            visible.append(sanitize_question_by_content_permissions(question, effective_permissions))
        return visible, membership_tier

    trial_permissions = content_permission_defaults_for_tier("free")
    trial_items = [
        sanitize_question_by_content_permissions(question, trial_permissions)
        for question in questions[:max_trial_questions]
    ]
    return trial_items, "free"


def resolve_user_content_permissions(user_payload: dict | None) -> dict[str, bool]:
    payload = user_payload if isinstance(user_payload, dict) else {}
    membership_tier = normalize_membership_tier(
        payload.get("membershipTier"),
        infer_membership_tier(plan=payload.get("plan")),
    )
    defaults = content_permission_defaults_for_tier(membership_tier)
    from_payload = payload.get("contentPermissions") if isinstance(payload.get("contentPermissions"), dict) else {}
    return {
        key: bool(from_payload.get(key, defaults[key]))
        for key in CONTENT_PERMISSION_KEYS
    }


def find_exam(bank: dict, exam_id: str) -> tuple[dict | None, dict | None]:
    target = normalize_exam_code(exam_id)
    for industry in bank.get("industries", []):
        for exam in industry.get("exams", []):
            exam_code = normalize_exam_code(exam.get("examCode") or exam.get("id"))
            if exam_code and exam_code == target:
                return industry, exam
    return None, None


def find_question(exam: dict, question_id: str) -> dict | None:
    for question in exam.get("questions", []):
        if question.get("id") == question_id:
            return question
    return None


def normalize_options(options_value, fallback: list[str] | None = None) -> list[str]:
    fallback_values = [clean_text(v) for v in (fallback or ["", "", "", ""])]
    if len(fallback_values) < 4:
        fallback_values += [""] * (4 - len(fallback_values))
    fallback_values = fallback_values[:4]

    options: list[str] = []
    if isinstance(options_value, list):
        options = [clean_text(v) for v in options_value][:4]
    while len(options) < 4:
        options.append("")
    options = options[:4]
    return [options[i] or fallback_values[i] for i in range(4)]


def sanitize_english_text(value: str | None) -> str:
    text = clean_text(value)
    if not text:
        return ""
    if CJK_RE.search(text):
        return ""
    return text


def sanitize_english_options(options_value, fallback: list[str] | None = None) -> list[str]:
    base = normalize_options(options_value, fallback or ["", "", "", ""])
    return [sanitize_english_text(item) for item in base]


def migrate_question_english_source(question: dict) -> tuple[bool, bool]:
    changed = False
    i18n = ensure_question_i18n(question)
    en = i18n.get("en") if isinstance(i18n.get("en"), dict) else {}
    zh = i18n.get("zh") if isinstance(i18n.get("zh"), dict) else {}

    legacy_root_prompt = clean_text(question.get("prompt"))
    legacy_root_options = normalize_options(question.get("options"), ["", "", "", ""])
    legacy_root_explanation = clean_text(question.get("explanation"))

    en_prompt = sanitize_english_text(en.get("prompt") or question.get("prompt_en") or question.get("promptEn"))
    en_options = sanitize_english_options(
        en.get("options"),
        [
            clean_text(question.get("option_a_en")),
            clean_text(question.get("option_b_en")),
            clean_text(question.get("option_c_en")),
            clean_text(question.get("option_d_en")),
        ],
    )
    en_explanation = sanitize_english_text(
        en.get("explanation") or question.get("explanation_en") or question.get("explanationEn")
    )

    has_en_source = bool(en_prompt or any(en_options) or en_explanation)

    if has_en_source:
        if not clean_text(question.get("prompt_zh")) and CJK_RE.search(legacy_root_prompt or ""):
            question["prompt_zh"] = legacy_root_prompt
            changed = True
        for idx, key in enumerate(("option_a_zh", "option_b_zh", "option_c_zh", "option_d_zh")):
            if not clean_text(question.get(key)) and CJK_RE.search(legacy_root_options[idx] or ""):
                question[key] = legacy_root_options[idx]
                changed = True
        if not clean_text(question.get("explanation_zh")) and CJK_RE.search(legacy_root_explanation or ""):
            question["explanation_zh"] = legacy_root_explanation
            changed = True

        if en_prompt and clean_text(question.get("prompt")) != en_prompt:
            question["prompt"] = en_prompt
            changed = True
        if any(en_options) and normalize_options(question.get("options"), ["", "", "", ""]) != en_options:
            question["options"] = en_options
            changed = True
        if en_explanation and clean_text(question.get("explanation")) != en_explanation:
            question["explanation"] = en_explanation
            changed = True

    zh_prompt = clean_text(zh.get("prompt"))
    zh_options = normalize_options(zh.get("options"), ["", "", "", ""])
    zh_explanation = clean_text(zh.get("explanation"))
    if zh_prompt and clean_text(question.get("prompt_zh")) != zh_prompt:
        question["prompt_zh"] = zh_prompt
        changed = True
    for idx, key in enumerate(("option_a_zh", "option_b_zh", "option_c_zh", "option_d_zh")):
        if zh_options[idx] and clean_text(question.get(key)) != zh_options[idx]:
            question[key] = zh_options[idx]
            changed = True
    if zh_explanation and clean_text(question.get("explanation_zh")) != zh_explanation:
        question["explanation_zh"] = zh_explanation
        changed = True

    return changed, has_en_source


def migrate_bank_english_source(bank: dict) -> tuple[bool, dict[str, int]]:
    changed = False
    stats = {"total": 0, "withEnSource": 0, "migrated": 0}
    for industry in bank.get("industries", []):
        for exam in industry.get("exams", []):
            for question in exam.get("questions", []):
                stats["total"] += 1
                q_changed, has_en_source = migrate_question_english_source(question)
                if has_en_source:
                    stats["withEnSource"] += 1
                if q_changed:
                    changed = True
                    stats["migrated"] += 1
    return changed, stats


def ensure_question_i18n(question: dict) -> dict:
    root_prompt = clean_text(question.get("prompt"))
    root_options = normalize_options(question.get("options"), ["", "", "", ""])
    root_explanation = clean_text(question.get("explanation"))
    root_type = clean_text(question.get("questionType"))
    root_key_point_zh = clean_text(question.get("key_point_zh") or question.get("keyPointZh"))
    root_key_point_en = clean_text(question.get("key_point_en") or question.get("keyPointEn"))
    root_memory_trick = clean_text(question.get("memory_trick") or question.get("memoryTrick"))
    root_reasoning_zh = clean_text(question.get("answer_reasoning_zh") or question.get("answerReasoningZh"))
    root_reasoning_en = clean_text(question.get("answer_reasoning_en") or question.get("answerReasoningEn"))
    root_vocab_zh = clean_text(question.get("vocab_zh") or question.get("vocabZh"))
    root_memory_tip_zh = clean_text(question.get("memory_tip_zh") or question.get("memoryTipZh"))

    i18n = question.get("i18n")
    if not isinstance(i18n, dict):
        i18n = {}

    source_language = str(i18n.get("sourceLanguage") or "").strip()
    if source_language not in {"en", "zh", "mixed", "unknown"}:
        source_language = detect_question_language([root_prompt, *root_options, root_explanation, root_type])
    i18n["sourceLanguage"] = source_language

    zh_raw = i18n.get("zh") if isinstance(i18n.get("zh"), dict) else {}
    zh_prompt = clean_text(zh_raw.get("prompt")) or clean_text(question.get("prompt_zh")) or root_prompt
    zh_options = normalize_options(zh_raw.get("options"), [question.get("option_a_zh"), question.get("option_b_zh"), question.get("option_c_zh"), question.get("option_d_zh")] if question.get("option_a_zh") else root_options)
    zh_explanation = clean_text(zh_raw.get("explanation")) or clean_text(question.get("explanation_zh")) or root_explanation
    zh_type = clean_text(zh_raw.get("questionType")) or root_type
    zh_key_point = clean_text(zh_raw.get("keyPoint")) or root_key_point_zh
    zh_reasoning = clean_text(zh_raw.get("answerReasoning")) or root_reasoning_zh
    zh_vocab = clean_text(zh_raw.get("vocab")) or root_vocab_zh
    zh_memory_tip = clean_text(zh_raw.get("memoryTip")) or root_memory_tip_zh
    i18n["zh"] = compose_locale_payload(
        zh_prompt,
        zh_options,
        zh_explanation,
        zh_type,
        zh_key_point,
        zh_reasoning,
        zh_vocab,
        zh_memory_tip,
    )

    en_raw = i18n.get("en") if isinstance(i18n.get("en"), dict) else {}
    en_prompt = clean_text(en_raw.get("prompt"))
    en_options = normalize_options(en_raw.get("options"), ["", "", "", ""])
    en_explanation = clean_text(en_raw.get("explanation"))
    en_type = clean_text(en_raw.get("questionType"))
    en_key_point = clean_text(en_raw.get("keyPoint")) or root_key_point_en
    en_reasoning = clean_text(en_raw.get("answerReasoning")) or root_reasoning_en
    en_memory_trick = clean_text(en_raw.get("memoryTrick")) or root_memory_trick
    en_payload = compose_locale_payload(
        en_prompt,
        en_options,
        en_explanation,
        en_type,
        en_key_point,
        en_reasoning,
        "",
        "",
        en_memory_trick,
    )
    if en_payload:
        i18n["en"] = en_payload
    elif "en" in i18n:
        i18n.pop("en")

    if en_key_point:
        question["key_point_en"] = en_key_point
    if zh_key_point:
        question["key_point_zh"] = zh_key_point
    if en_reasoning:
        question["answer_reasoning_en"] = en_reasoning
    if zh_reasoning:
        question["answer_reasoning_zh"] = zh_reasoning
    if zh_vocab:
        question["vocab_zh"] = zh_vocab
    if zh_memory_tip:
        question["memory_tip_zh"] = zh_memory_tip
    if en_memory_trick:
        question["memory_trick"] = en_memory_trick
        question["memoryTrick"] = en_memory_trick

    question["i18n"] = i18n
    question["translation_status"] = normalize_translation_status(question, i18n)
    return i18n


def normalize_bank_translation_status(bank: dict) -> bool:
    changed = False
    for industry in bank.get("industries", []):
        for exam in industry.get("exams", []):
            for question in exam.get("questions", []):
                raw_status = clean_text(question.get("translation_status") or question.get("translationStatus"))
                if raw_status not in TRANSLATION_STATUS_VALUES:
                    changed = True
                if "translationStatus" in question:
                    question.pop("translationStatus", None)
                    changed = True
                ensure_question_i18n(question)
    return changed


def enrich_question_chinese_support(question: dict) -> bool:
    changed = False
    i18n = ensure_question_i18n(question)
    en = i18n.get("en") if isinstance(i18n.get("en"), dict) else {}
    root_options = sanitize_english_options(question.get("options"), ["", "", "", ""])
    prompt_en = sanitize_english_text(en.get("prompt") or question.get("prompt"))
    options_en = sanitize_english_options(en.get("options"), root_options)
    if not prompt_en or any(not opt for opt in options_en):
        return False

    explanation_en = sanitize_english_text(en.get("explanation") or question.get("explanation"))
    question_type = clean_text(question.get("questionType") or en.get("questionType"))
    answer_index = int(question.get("answerIndex", 0) or 0)
    if answer_index < 0 or answer_index > 3:
        answer_index = 0

    generated = build_builtin_zh_support(
        prompt_en=prompt_en,
        options_en=options_en,
        answer_index=answer_index,
        question_type=question_type,
        explanation_en=explanation_en,
    )

    if generated.get("explanation") and not clean_text(question.get("explanation")):
        question["explanation"] = generated["explanation"]
        changed = True

    for key in (
        "prompt_zh",
        "option_a_zh",
        "option_b_zh",
        "option_c_zh",
        "option_d_zh",
        "explanation_zh",
        "key_point_zh",
        "vocab_zh",
        "memory_tip_zh",
    ):
        if clean_text(question.get(key)):
            continue
        value = clean_text(generated.get(key))
        if value:
            question[key] = value
            changed = True

    zh = i18n.get("zh") if isinstance(i18n.get("zh"), dict) else {}
    zh_prompt = clean_text(zh.get("prompt")) or clean_text(question.get("prompt_zh"))
    zh_options = normalize_options(
        zh.get("options"),
        [
            clean_text(question.get("option_a_zh")),
            clean_text(question.get("option_b_zh")),
            clean_text(question.get("option_c_zh")),
            clean_text(question.get("option_d_zh")),
        ],
    )
    zh_explanation = clean_text(zh.get("explanation")) or clean_text(question.get("explanation_zh"))
    zh_type = clean_text(zh.get("questionType")) or question_type
    zh_key_point = clean_text(zh.get("keyPoint")) or clean_text(question.get("key_point_zh"))
    zh_vocab = clean_text(zh.get("vocab")) or clean_text(question.get("vocab_zh"))
    zh_memory_tip = clean_text(zh.get("memoryTip")) or clean_text(question.get("memory_tip_zh"))
    next_zh = compose_locale_payload(
        zh_prompt,
        zh_options,
        zh_explanation,
        zh_type,
        zh_key_point,
        clean_text(zh.get("answerReasoning")) or clean_text(question.get("answer_reasoning_zh")),
        zh_vocab,
        zh_memory_tip,
    )
    if next_zh != zh:
        i18n["zh"] = next_zh
        changed = True

    has_support = any(
        clean_text(question.get(key))
        for key in ("prompt_zh", "option_a_zh", "option_b_zh", "option_c_zh", "option_d_zh", "explanation_zh", "key_point_zh", "vocab_zh", "memory_tip_zh")
    )
    if has_support:
        meta = i18n.get("translationMeta") if isinstance(i18n.get("translationMeta"), dict) else {}
        if not clean_text(meta.get("autoTranslatedFrom")):
            meta["autoTranslatedFrom"] = "en"
            changed = True
        if not clean_text(meta.get("engine")):
            meta["engine"] = "builtin-glossary-v1"
            changed = True
        if not clean_text(meta.get("generatedAt")):
            meta["generatedAt"] = now_iso()
            changed = True
        i18n["translationMeta"] = meta

        current_status = normalize_translation_status(question, i18n)
        if current_status != "human_verified" and question.get("translation_status") != "ai_translated":
            question["translation_status"] = "ai_translated"
            changed = True

    question["i18n"] = i18n
    return changed


def enrich_bank_chinese_support(bank: dict) -> tuple[bool, dict[str, int]]:
    changed = False
    stats = {"total": 0, "enriched": 0}
    for industry in bank.get("industries", []):
        for exam in industry.get("exams", []):
            for question in exam.get("questions", []):
                stats["total"] += 1
                if enrich_question_chinese_support(question):
                    changed = True
                    stats["enriched"] += 1
    return changed, stats


def serialize_question_for_admin(question: dict) -> dict:
    i18n = ensure_question_i18n(question)
    zh = i18n.get("zh") if isinstance(i18n.get("zh"), dict) else {}
    en = i18n.get("en") if isinstance(i18n.get("en"), dict) else {}
    translation_status = normalize_translation_status(question, i18n)
    exam_type = normalize_exam_type(question.get("examTrack") or question.get("examType"), "trade")
    specialization_code = normalize_specialization_code(question.get("specializationCode") or question.get("tradeCode"))
    if exam_type == "law_business":
        specialization_code = ""
    license_group = normalize_hierarchy_key(question.get("licenseGroup") or question.get("examFamilyKey"))
    category_key = clean_text(question.get("questionCategory") or question.get("categoryKey"))
    return {
        "id": clean_text(question.get("id")),
        "categoryKey": category_key,
        "questionCategory": category_key,
        "programCode": normalize_hierarchy_key(question.get("programCode")),
        "examCode": normalize_exam_code(question.get("examCode")),
        "examFamilyKey": license_group,
        "licenseGroup": license_group,
        "tradeCode": specialization_code,
        "specializationCode": specialization_code,
        "examType": exam_type,
        "examTrack": exam_type,
        "status": normalize_question_status(question.get("status") or question.get("questionStatus"), "active"),
        "translation_status": translation_status,
        "prompt": clean_text(question.get("prompt")),
        "options": normalize_options(question.get("options"), ["", "", "", ""]),
        "explanation": clean_text(question.get("explanation")),
        "memoryTrick": clean_text(question.get("memory_trick") or question.get("memoryTrick") or en.get("memoryTrick")),
        "memory_trick": clean_text(question.get("memory_trick") or question.get("memoryTrick") or en.get("memoryTrick")),
        "questionType": clean_text(question.get("questionType")),
        "keyPointEn": clean_text(question.get("key_point_en") or en.get("keyPoint")),
        "keyPointZh": clean_text(question.get("key_point_zh") or zh.get("keyPoint")),
        "answerReasoningEn": clean_text(question.get("answer_reasoning_en") or en.get("answerReasoning")),
        "answerReasoningZh": clean_text(question.get("answer_reasoning_zh") or zh.get("answerReasoning")),
        "vocabZh": clean_text(question.get("vocab_zh") or zh.get("vocab")),
        "memoryTipZh": clean_text(question.get("memory_tip_zh") or zh.get("memoryTip")),
        "i18n": i18n,
        "zh": {
            "prompt": clean_text(zh.get("prompt")),
            "options": normalize_options(zh.get("options"), ["", "", "", ""]),
            "explanation": clean_text(zh.get("explanation")),
            "questionType": clean_text(zh.get("questionType")),
            "keyPoint": clean_text(zh.get("keyPoint")),
            "answerReasoning": clean_text(zh.get("answerReasoning")),
            "vocab": clean_text(zh.get("vocab")),
            "memoryTip": clean_text(zh.get("memoryTip")),
        },
        "en": {
            "prompt": clean_text(en.get("prompt")),
            "options": normalize_options(en.get("options"), ["", "", "", ""]),
            "explanation": clean_text(en.get("explanation")),
            "questionType": clean_text(en.get("questionType")),
            "keyPoint": clean_text(en.get("keyPoint")),
            "answerReasoning": clean_text(en.get("answerReasoning")),
            "memoryTrick": clean_text(en.get("memoryTrick") or question.get("memory_trick") or question.get("memoryTrick")),
        },
    }


class AppHandler(SimpleHTTPRequestHandler):
    server_version = "JNONOServer/1.0"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path.startswith("/api/"):
            self.handle_api("GET", parsed)
            return
        host = self.headers.get("Host", "")
        if host.startswith("admin.jnono.com") and parsed.path in ("/", ""):
            self.send_response(302)
            self.send_header("Location", "/admin.html")
            self.end_headers()
            return
        super().do_GET()

    def do_OPTIONS(self):
        self.send_response(HTTPStatus.NO_CONTENT)
        self.end_headers()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path.startswith("/api/"):
            self.handle_api("POST", parsed)
            return
        self.send_error(HTTPStatus.NOT_FOUND)

    def do_PUT(self):
        parsed = urlparse(self.path)
        if parsed.path.startswith("/api/"):
            self.handle_api("PUT", parsed)
            return
        self.send_error(HTTPStatus.NOT_FOUND)

    def do_DELETE(self):
        parsed = urlparse(self.path)
        if parsed.path.startswith("/api/"):
            self.handle_api("DELETE", parsed)
            return
        self.send_error(HTTPStatus.NOT_FOUND)

    def do_PATCH(self):
        parsed = urlparse(self.path)
        if parsed.path.startswith("/api/"):
            self.handle_api("PATCH", parsed)
            return
        self.send_error(HTTPStatus.NOT_FOUND)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        origin = self.headers.get("Origin", "*")
        if origin.startswith("http://127.0.0.1") or origin.startswith("http://localhost"):
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
        else:
            self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
        super().end_headers()

    def send_json(self, status: int, payload: dict | list):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def read_json(self) -> dict:
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = 0
        raw = self.rfile.read(length) if length > 0 else b"{}"
        if not raw:
            return {}
        return json.loads(raw.decode("utf-8"))

    def read_multipart_image(self) -> tuple[bytes, str] | None:
        """
        Parse a simple multipart/form-data request to extract ONE image file.
        Returns (file_bytes, ext) on success, or None after calling send_json with error.
        """
        ctype = self.headers.get("Content-Type", "")
        if not ctype.startswith("multipart/form-data"):
            self.send_json(400, {"error": "Content-Type must be multipart/form-data"})
            return None
        m = re.search(r'boundary=(?:"([^"]+)"|([^;]+))', ctype)
        if not m:
            self.send_json(400, {"error": "multipart boundary missing"})
            return None
        boundary = (m.group(1) or m.group(2)).strip().encode("utf-8")
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = 0
        if length <= 0:
            self.send_json(400, {"error": "empty body"})
            return None
        if length > QUESTION_IMAGE_MAX_BYTES + 4096:
            self.send_json(413, {"error": f"file too large (max {QUESTION_IMAGE_MAX_BYTES // 1024 // 1024}MB)"})
            return None
        raw = self.rfile.read(length)
        sep = b"--" + boundary
        parts = raw.split(sep)
        for part in parts:
            if not part or part in (b"--\r\n", b"--", b"\r\n"):
                continue
            head_end = part.find(b"\r\n\r\n")
            if head_end < 0:
                continue
            headers_blob = part[:head_end].decode("utf-8", errors="replace")
            body = part[head_end + 4:]
            if body.endswith(b"\r\n"):
                body = body[:-2]
            disp_match = re.search(r'Content-Disposition:[^\r\n]*filename="([^"]*)"', headers_blob, re.I)
            if not disp_match:
                continue
            filename = disp_match.group(1).strip()
            if not filename:
                continue
            if len(body) > QUESTION_IMAGE_MAX_BYTES:
                self.send_json(413, {"error": f"file too large (max {QUESTION_IMAGE_MAX_BYTES // 1024 // 1024}MB)"})
                return None
            if len(body) == 0:
                self.send_json(400, {"error": "empty file"})
                return None
            ext_from_name = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
            if ext_from_name not in QUESTION_IMAGE_ALLOWED_EXT:
                self.send_json(400, {"error": f"invalid extension (allowed: {', '.join(sorted(QUESTION_IMAGE_ALLOWED_EXT))})"})
                return None
            detected_ext = None
            for magic, mext in QUESTION_IMAGE_MAGIC.items():
                if body.startswith(magic):
                    detected_ext = mext
                    break
            if detected_ext == "webp" and not (len(body) >= 12 and body[8:12] == b"WEBP"):
                detected_ext = None
            if detected_ext is None:
                self.send_json(400, {"error": "file content does not match image format"})
                return None
            # jpg/jpeg: normalize
            if ext_from_name == "jpeg":
                ext_from_name = "jpg"
            if detected_ext != ext_from_name:
                self.send_json(400, {"error": f"file extension ({ext_from_name}) does not match content ({detected_ext})"})
                return None
            return body, ext_from_name
        self.send_json(400, {"error": "no file found in upload"})
        return None

    def get_bearer_token(self) -> str | None:
        auth = self.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            return auth.split(" ", 1)[1].strip()
        return None

    def require_user(self):
        token = self.get_bearer_token()
        if not token:
            self.send_json(401, {"error": "Unauthorized"})
            return None
        with db_conn() as conn:
            ensure_user_membership_columns(conn)
            row = conn.execute(
                """
                SELECT s.token, s.is_admin, s.expires_at, u.id, u.name, u.email, u.plan, u.membership_tier, u.account_status
                FROM sessions s
                LEFT JOIN users u ON u.id = s.user_id
                WHERE s.token = ?
                """,
                (token,),
            ).fetchone()
        if not row or row["is_admin"] != 0 or row["id"] is None:
            self.send_json(401, {"error": "Unauthorized"})
            return None
        exp = parse_iso_datetime(row["expires_at"]) if row["expires_at"] else None
        if exp and exp < datetime.now(timezone.utc):
            with db_conn() as conn:
                conn.execute("DELETE FROM sessions WHERE token=?", (token,))
            self.send_json(401, {"error": "会话已过期，请重新登录"})
            return None
        if normalize_account_status(row["account_status"], "active") != "active":
            with db_conn() as conn:
                conn.execute("DELETE FROM sessions WHERE token=?", (token,))
            self.send_json(403, {"error": SUSPENDED_USER_ERROR})
            return None
        return {
            "token": token,
            "id": row["id"],
            "name": row["name"],
            "email": row["email"],
            "plan": row["plan"],
            "membershipTier": normalize_membership_tier(
                row["membership_tier"],
                infer_membership_tier(plan=row["plan"]),
            ),
        }

    def require_admin(self):
        token = self.get_bearer_token()
        if not token:
            self.send_json(401, {"error": "Unauthorized"})
            return None
        with db_conn() as conn:
            row = conn.execute("SELECT token, is_admin, expires_at FROM sessions WHERE token = ?", (token,)).fetchone()
        if not row or row["is_admin"] != 1:
            self.send_json(401, {"error": "Unauthorized"})
            return None
        exp = parse_iso_datetime(row["expires_at"]) if row["expires_at"] else None
        if exp and exp < datetime.now(timezone.utc):
            with db_conn() as conn:
                conn.execute("DELETE FROM sessions WHERE token=?", (token,))
            self.send_json(401, {"error": "会话已过期，请重新登录"})
            return None
        return {"token": token, "name": ADMIN_NAME, "email": ADMIN_EMAIL}

    def require_session(self):
        token = self.get_bearer_token()
        if not token:
            self.send_json(401, {"error": "Unauthorized"})
            return None
        with db_conn() as conn:
            ensure_user_membership_columns(conn)
            row = conn.execute(
                """
                SELECT s.token, s.is_admin, s.expires_at, u.id, u.name, u.email, u.plan, u.membership_tier, u.account_status
                FROM sessions s
                LEFT JOIN users u ON u.id = s.user_id
                WHERE s.token = ?
                """,
                (token,),
            ).fetchone()
        if not row:
            self.send_json(401, {"error": "Unauthorized"})
            return None
        exp = parse_iso_datetime(row["expires_at"]) if row["expires_at"] else None
        if exp and exp < datetime.now(timezone.utc):
            with db_conn() as conn:
                conn.execute("DELETE FROM sessions WHERE token=?", (token,))
            self.send_json(401, {"error": "会话已过期，请重新登录"})
            return None
        if int(row["is_admin"]) != 1 and normalize_account_status(row["account_status"], "active") != "active":
            with db_conn() as conn:
                conn.execute("DELETE FROM sessions WHERE token=?", (token,))
            self.send_json(403, {"error": SUSPENDED_USER_ERROR})
            return None
        return {
            "token": token,
            "is_admin": int(row["is_admin"]),
            "id": int(row["id"]) if row["id"] is not None else None,
            "name": row["name"],
            "email": row["email"],
            "plan": row["plan"],
            "membershipTier": normalize_membership_tier(
                row["membership_tier"],
                infer_membership_tier(plan=row["plan"]),
            ),
        }

    def fetch_user_payload(self, conn: sqlite3.Connection, user_id: int) -> dict | None:
        ensure_user_profile_columns(conn)
        ensure_licensing_progress_table(conn)
        row = conn.execute(
            """
            SELECT
              id, name, nickname, email, phone, plan, membership_tier, account_status,
              bilingual_enabled, explanation_enabled, memory_tips_enabled,
              membership_version, membership_updated_at, created_at,
              assigned_exam_codes, assigned_module_tags
            FROM users
            WHERE id = ?
            """,
            (user_id,),
        ).fetchone()
        if not row:
            return None

        ensure_all_user_entitlements(conn)
        ent_row = conn.execute(
            """
            SELECT b_license_access, c_license_access, bilingual_access, bilingual_expires_at, ai_access, ai_expires_at, updated_at
            FROM user_entitlements
            WHERE user_id = ?
            """,
            (user_id,),
        ).fetchone()
        membership_tier = normalize_membership_tier(
            row["membership_tier"],
            infer_membership_tier(
                plan=row["plan"],
                bilingual_access=ent_row["bilingual_access"] if ent_row else 0,
                ai_access=ent_row["ai_access"] if ent_row else 0,
            ),
        )
        entitlements = row_to_entitlements(ent_row, plan=row["plan"], membership_tier=membership_tier)
        category_entitlements, category_details = get_user_category_entitlement_details(conn, user_id, plan=row["plan"])
        if "b_license" in category_entitlements:
            entitlements["bLicenseAccess"] = bool(category_entitlements["b_license"])
        if "c_license" in category_entitlements:
            entitlements["cLicenseAccess"] = bool(category_entitlements["c_license"])
        assigned_exam_codes = normalize_assignment_exam_code_list(row["assigned_exam_codes"])
        if not assigned_exam_codes:
            assigned_exam_codes = infer_assigned_exam_codes_for_user(
                conn,
                user_id=user_id,
                plan=clean_text(row["plan"]).lower() or "free",
            )
            conn.execute(
                "UPDATE users SET assigned_exam_codes = ? WHERE id = ?",
                (dump_assignment_exam_code_list(assigned_exam_codes), user_id),
            )
        assigned_module_tags = normalize_assignment_exam_code_list(row["assigned_module_tags"])
        default_b, default_c, default_bi, default_ai = entitlement_defaults_for_tier(membership_tier)
        bilingual_has_access = bool(ent_row["bilingual_access"]) if ent_row else bool(default_bi)
        bilingual_expires_at = normalize_expires_at(ent_row["bilingual_expires_at"]) if ent_row else (
            FAR_FUTURE_EXPIRES_AT if default_bi else None
        )
        bilingual_active, bilingual_expired = compute_entitlement_state(bilingual_has_access, bilingual_expires_at)
        entitlements["bilingualAccess"] = bilingual_active
        ai_has_access = bool(ent_row["ai_access"]) if ent_row else bool(default_ai)
        ai_expires_at = normalize_expires_at(ent_row["ai_expires_at"]) if ent_row else (
            FAR_FUTURE_EXPIRES_AT if default_ai else None
        )
        ai_active, ai_expired = compute_entitlement_state(ai_has_access, ai_expires_at)
        entitlements["aiAccess"] = ai_active
        content_permissions, content_overrides = compute_content_permissions(
            membership_tier=membership_tier,
            bilingual_override=row["bilingual_enabled"] if "bilingual_enabled" in row.keys() else None,
            explanation_override=row["explanation_enabled"] if "explanation_enabled" in row.keys() else None,
            memory_tips_override=row["memory_tips_enabled"] if "memory_tips_enabled" in row.keys() else None,
        )
        entitlements["bilingualEnabled"] = bool(content_permissions["bilingualEnabled"])
        entitlements["explanationEnabled"] = bool(content_permissions["explanationEnabled"])
        entitlements["memoryTipsEnabled"] = bool(content_permissions["memoryTipsEnabled"])
        licensing_progress = get_user_licensing_progress(conn, user_id)

        return {
            "id": int(row["id"]),
            "name": row["name"],
            "displayName": row["name"],
            "nickname": clean_text(row["nickname"]),
            "email": row["email"],
            "phone": clean_text(row["phone"]),
            "plan": row["plan"],
            "membershipTier": membership_tier,
            "accountStatus": normalize_account_status(row["account_status"], "active"),
            "membershipVersion": int(row["membership_version"] or 1),
            "membershipUpdatedAt": row["membership_updated_at"] or row["created_at"],
            "assignedExamCodes": assigned_exam_codes,
            "assignedModuleTags": assigned_module_tags,
            "entitlements": entitlements,
            "contentPermissions": content_permissions,
            "contentPermissionOverrides": content_overrides,
            "categoryEntitlements": category_entitlements,
            "categoryEntitlementDetails": category_details,
            "bilingualEntitlement": {
                "hasAccess": bilingual_has_access,
                "expiresAt": bilingual_expires_at,
                "isActive": bilingual_active,
                "isExpired": bilingual_expired,
            },
            "aiEntitlement": {
                "hasAccess": ai_has_access,
                "expiresAt": ai_expires_at,
                "isActive": ai_active,
                "isExpired": ai_expired,
            },
            "licensingProgress": licensing_progress,
        }

    def get_bank(self) -> dict:
        with db_conn() as conn:
            ensure_default_exam_catalog(conn)
            ensure_exam_categories_defaults(conn)
            bank_from_tables = compose_bank_from_tables(
                conn,
                enabled_only=False,
                active_questions_only=False,
            )
            has_table_questions = any(
                isinstance(industry, dict) and industry.get("exams")
                for industry in bank_from_tables.get("industries", [])
            )
            if has_table_questions:
                return bank_from_tables

            row = conn.execute("SELECT value FROM settings WHERE key='question_bank_json'").fetchone()
            exam_rows = list_exam_catalog(conn, enabled_only=False)
        if row:
            bank = json.loads(row["value"])
        else:
            bank = json.loads(DEFAULT_BANK_PATH.read_text(encoding="utf-8"))

        should_save = False
        catalog_map = build_exam_catalog_map(exam_rows)
        if normalize_bank_hierarchy_and_status(bank, catalog_map):
            should_save = True
        if normalize_shared_law_business_exams(bank):
            should_save = True
        migrated, _ = migrate_bank_english_source(bank)
        if migrated:
            should_save = True
        if normalize_bank_translation_status(bank):
            should_save = True
        enriched, _ = enrich_bank_chinese_support(bank)
        if enriched:
            should_save = True
        if should_save:
            self.save_bank(bank)
        return bank

    def save_bank(self, bank: dict):
        with db_conn() as conn:
            ensure_questions_table(conn)
            conn.execute(
                """
                INSERT INTO settings(key, value, updated_at)
                VALUES('question_bank_json', ?, ?)
                ON CONFLICT(key) DO UPDATE SET
                  value=excluded.value,
                  updated_at=excluded.updated_at
                """,
                (json.dumps(bank, ensure_ascii=False), now_iso()),
            )
            sync_questions_table_from_bank(conn, bank)

    def create_session(self, *, user_id: int | None, is_admin: int) -> str:
        token = secrets.token_urlsafe(32)
        expires_at = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
        with db_conn() as conn:
            conn.execute(
                "INSERT INTO sessions(token, user_id, is_admin, created_at, expires_at) VALUES(?,?,?,?,?)",
                (token, user_id, is_admin, now_iso(), expires_at),
            )
        return token

    def handle_api(self, method: str, parsed):
        path = parsed.path
        qs = parse_qs(parsed.query)

        try:
            if method == "GET" and path == "/api/health":
                self.send_json(200, {"ok": True, "time": now_iso()})
                return

            if method == "GET" and path == "/api/site-settings":
                with db_conn() as conn:
                    wechat_id = get_site_wechat_id(conn)
                    pricing_config = get_site_pricing_config(conn)
                server_now = now_iso()
                pricing_runtime = build_site_pricing_runtime(
                    pricing_config,
                    server_now=parse_iso_datetime(server_now),
                )
                self.send_json(
                    200,
                    {
                        "wechatId": wechat_id,
                        "serverNow": server_now,
                        "pricingConfig": pricing_config,
                        "pricingRuntime": pricing_runtime,
                    },
                )
                return

            if method == "POST" and path == "/api/auth/register":
                data = self.read_json()
                name = str(data.get("name", "")).strip()
                email = str(data.get("email", "")).strip().lower()
                password = str(data.get("password", ""))

                if len(name) < 2:
                    self.send_json(400, {"error": "姓名至少2个字符"})
                    return
                if "@" not in email:
                    self.send_json(400, {"error": "邮箱格式不正确"})
                    return
                if len(password) < 6:
                    self.send_json(400, {"error": "密码至少6位"})
                    return

                created_at = now_iso()
                with db_conn() as conn:
                    existed = conn.execute("SELECT id FROM users WHERE email=?", (email,)).fetchone()
                    if existed:
                        self.send_json(400, {"error": "该邮箱已注册，请直接登录"})
                        return
                    cur = conn.execute(
                        """
                        INSERT INTO users(
                          name, email, password, plan, membership_tier, created_at, membership_version, membership_updated_at
                        )
                        VALUES(?,?,?,?,?,?,?,?)
                        """,
                        (name, email, hash_password(password), "free", "free", created_at, 1, created_at),
                    )
                    user_id = int(cur.lastrowid)
                    ensure_all_user_entitlements(conn)
                    user_payload = self.fetch_user_payload(conn, user_id)

                token = self.create_session(user_id=user_id, is_admin=0)
                self.send_json(200, {"token": token, "user": user_payload})
                return

            if method == "POST" and path == "/api/auth/login":
                data = self.read_json()
                email = str(data.get("email", "")).strip().lower()
                password = str(data.get("password", ""))

                with db_conn() as conn:
                    ensure_user_membership_columns(conn)
                    row = conn.execute(
                        "SELECT id, name, email, plan, account_status, password FROM users WHERE email=?",
                        (email,),
                    ).fetchone()
                if not row or not verify_password(password, row["password"]):
                    self.send_json(401, {"error": "账号或密码错误"})
                    return
                if normalize_account_status(row["account_status"], "active") != "active":
                    self.send_json(403, {"error": SUSPENDED_USER_ERROR})
                    return
                # Migrate plain-text password to hashed on successful login
                if not row["password"].startswith("pbkdf2:sha256:"):
                    with db_conn() as conn:
                        conn.execute("UPDATE users SET password=? WHERE id=?", (hash_password(password), int(row["id"])))

                token = self.create_session(user_id=int(row["id"]), is_admin=0)
                with db_conn() as conn:
                    user_payload = self.fetch_user_payload(conn, int(row["id"]))

                self.send_json(200, {"token": token, "user": user_payload})
                return

            if method == "POST" and path == "/api/admin/login":
                data = self.read_json()
                email = str(data.get("email", "")).strip().lower()
                password = str(data.get("password", ""))
                if email != ADMIN_EMAIL or password != ADMIN_PASSWORD:
                    self.send_json(401, {"error": "管理员账号或密码错误"})
                    return
                token = self.create_session(user_id=None, is_admin=1)
                self.send_json(200, {"token": token, "admin": {"name": ADMIN_NAME, "email": ADMIN_EMAIL}})
                return

            if method == "GET" and path == "/api/auth/me":
                token = self.get_bearer_token()
                if not token:
                    self.send_json(401, {"error": "Unauthorized"})
                    return
                with db_conn() as conn:
                    ensure_user_membership_columns(conn)
                    row = conn.execute(
                        """
                        SELECT s.is_admin, u.id, u.name, u.email, u.plan, u.account_status
                        FROM sessions s
                        LEFT JOIN users u ON u.id = s.user_id
                        WHERE s.token = ?
                        """,
                        (token,),
                    ).fetchone()
                if not row:
                    self.send_json(401, {"error": "Unauthorized"})
                    return
                if row["is_admin"] == 1:
                    self.send_json(200, {"role": "admin", "admin": {"name": ADMIN_NAME, "email": ADMIN_EMAIL}})
                else:
                    if normalize_account_status(row["account_status"], "active") != "active":
                        with db_conn() as conn:
                            conn.execute("DELETE FROM sessions WHERE token=?", (token,))
                        self.send_json(403, {"error": SUSPENDED_USER_ERROR})
                        return
                    with db_conn() as conn:
                        user_payload = self.fetch_user_payload(conn, int(row["id"]))
                    self.send_json(200, {"role": "user", "user": user_payload})
                return

            if method == "POST" and path == "/api/auth/logout":
                token = self.get_bearer_token()
                if token:
                    with db_conn() as conn:
                        conn.execute("DELETE FROM sessions WHERE token=?", (token,))
                self.send_json(200, {"ok": True})
                return

            if method == "GET" and path == "/api/exams":
                session = self.require_session()
                if not session:
                    return
                with db_conn() as conn:
                    ensure_exam_categories_defaults(conn)
                    exams = list_runtime_exams_with_categories(conn)
                    if session["is_admin"] == 1 or session["id"] is None:
                        self.send_json(200, {"items": exams})
                        return
                    user_payload = self.fetch_user_payload(conn, int(session["id"]))
                    enabled_categories = {row["key"] for row in list_categories(conn, enabled_only=True)}
                    assigned_exam_codes = normalize_assignment_exam_code_list(
                        (user_payload or {}).get("assignedExamCodes")
                    )

                filtered_items = []
                for exam in exams:
                    if not exam.get("practiceEnabled") and not exam.get("mockEnabled"):
                        continue
                    if assigned_exam_codes and not exam_matches_assigned_codes(exam, assigned_exam_codes):
                        continue
                    category_key = normalize_category_key(exam.get("categoryKey"))
                    if session["is_admin"] != 1 and category_key:
                        category_entitlements = user_payload.get("categoryEntitlements", {}) if user_payload else {}
                        legacy_ent = user_payload.get("entitlements", {}) if user_payload else {}
                        if not user_has_category_access(
                            category_key,
                            category_entitlements=category_entitlements,
                            legacy_entitlements=legacy_ent,
                            enabled_categories=enabled_categories,
                        ) and (user_payload or {}).get("plan") == "paid":
                            continue
                    filtered_items.append(exam)
                self.send_json(200, {"items": filtered_items})
                return

            if method == "GET" and path.startswith("/api/exams/"):
                parts = [item for item in path.split("/") if item]
                if len(parts) >= 3 and parts[0] == "api" and parts[1] == "exams":
                    session = self.require_session()
                    if not session:
                        return
                    exam_code = normalize_exam_code(parts[2])
                    if not exam_code:
                        self.send_json(400, {"error": "exam_code 非法"})
                        return

                    if len(parts) == 3:
                        with db_conn() as conn:
                            ensure_exam_categories_defaults(conn)
                            exams = list_runtime_exams_with_categories(conn)
                            assigned_exam_codes: list[str] = []
                            user_payload = None
                            if session["is_admin"] != 1 and session["id"] is not None:
                                user_payload = self.fetch_user_payload(conn, int(session["id"]))
                                assigned_exam_codes = normalize_assignment_exam_code_list(
                                    (user_payload or {}).get("assignedExamCodes")
                                )
                        exam = next((item for item in exams if normalize_exam_code(item.get("examCode")) == exam_code), None)
                        if not exam:
                            self.send_json(404, {"error": "考试不存在"})
                            return
                        if assigned_exam_codes and not exam_matches_assigned_codes(exam, assigned_exam_codes):
                            self.send_json(403, {"error": "当前账号未开通该考试模块"})
                            return
                        self.send_json(200, {"exam": exam})
                        return

                    if len(parts) == 4 and parts[3] == "categories":
                        with db_conn() as conn:
                            ensure_exam_categories_defaults(conn)
                            exams = list_runtime_exams_with_categories(conn)
                            exam = next((item for item in exams if normalize_exam_code(item.get("examCode")) == exam_code), None)
                            if not exam:
                                self.send_json(404, {"error": "考试不存在"})
                                return
                            if session["is_admin"] != 1 and session["id"] is not None:
                                user_payload = self.fetch_user_payload(conn, int(session["id"]))
                                assigned_exam_codes = normalize_assignment_exam_code_list(
                                    (user_payload or {}).get("assignedExamCodes")
                                )
                                if assigned_exam_codes and not exam_matches_assigned_codes(exam, assigned_exam_codes):
                                    self.send_json(403, {"error": "当前账号未开通该考试模块"})
                                    return
                            categories = [
                                normalize_exam_category_payload(row)
                                for row in list_exam_categories(conn, exam_code=exam_code, active_only=True)
                            ]
                            counts_rows = conn.execute(
                                """
                                SELECT UPPER(TRIM(COALESCE(NULLIF(category_code,''), NULLIF(question_category,''), ''))) AS category_code,
                                       COUNT(1) AS cnt
                                FROM questions
                                WHERE LOWER(TRIM(COALESCE(NULLIF(exam_code,''), NULLIF(exam_id,''), ''))) = ?
                                  AND COALESCE(NULLIF(LOWER(TRIM(COALESCE(question_status, 'active'))), ''), 'active') = 'active'
                                GROUP BY UPPER(TRIM(COALESCE(NULLIF(category_code,''), NULLIF(question_category,''), '')))
                                """,
                                (exam_code,),
                            ).fetchall()
                        counts = {clean_text(item["category_code"]).upper(): int(item["cnt"] or 0) for item in counts_rows}
                        payload = []
                        for item in categories:
                            code = clean_text(item.get("code")).upper()
                            payload.append(
                                {
                                    **item,
                                    "questionCount": int(counts.get(code, 0)),
                                }
                            )
                        if not any(clean_text(item.get("code")).upper() == f"{exam_code}__UNCATEGORIZED".upper() for item in payload):
                            payload.append(
                                {
                                    "code": f"{exam_code}__UNCATEGORIZED".upper(),
                                    "examCode": exam_code,
                                    "name": "UNCATEGORIZED",
                                    "nameZh": "未分类",
                                    "description": "Default fallback category.",
                                    "sortOrder": 9999,
                                    "isActive": True,
                                    "questionCount": int(counts.get(f"{exam_code}__UNCATEGORIZED".upper(), 0)),
                                }
                            )
                        payload.sort(key=lambda item: (int(item.get("sortOrder") or 100), clean_text(item.get("code"))))
                        self.send_json(200, {"items": payload})
                        return

                    if len(parts) == 4 and parts[3] == "questions":
                        include_included = str((qs.get("include_included") or [""])[0]).strip().lower() in {"1", "true", "yes", "y"}
                        category_code = clean_text((qs.get("category_code") or [""])[0]).upper()
                        limit = max(0, to_int((qs.get("limit") or ["0"])[0], 0))
                        with db_conn() as conn:
                            ensure_exam_categories_defaults(conn)
                            exams = list_runtime_exams_with_categories(conn)
                            exam_map = {
                                normalize_exam_code(item.get("examCode")): item
                                for item in exams
                                if normalize_exam_code(item.get("examCode"))
                            }
                            exam = next(
                                (item for item in exams if normalize_exam_code(item.get("examCode")) == exam_code),
                                None,
                            )
                            if not exam:
                                self.send_json(404, {"error": "考试不存在"})
                                return
                            assigned_exam_codes: list[str] = []
                            if session["is_admin"] != 1 and session["id"] is not None:
                                user_payload = self.fetch_user_payload(conn, int(session["id"]))
                                assigned_exam_codes = normalize_assignment_exam_code_list(
                                    (user_payload or {}).get("assignedExamCodes")
                                )
                                if assigned_exam_codes and not exam_matches_assigned_codes(exam, assigned_exam_codes):
                                    self.send_json(403, {"error": "当前账号未开通该考试模块"})
                                    return
                            exam_codes = [exam_code]
                            if include_included:
                                exam_codes.extend(normalize_exam_code_list(exam.get("includedExamCodes")))
                            if assigned_exam_codes:
                                exam_codes = [
                                    code
                                    for code in exam_codes
                                    if exam_matches_assigned_codes(
                                        exam_map.get(code) or {"examCode": code},
                                        assigned_exam_codes,
                                    )
                                ]
                            questions = fetch_runtime_questions(
                                conn,
                                exam_codes=exam_codes,
                                category_code=category_code,
                                limit=limit if limit > 0 else 0,
                            )
                            if session["is_admin"] == 1 or session["id"] is None:
                                self.send_json(200, {"items": questions, "total": len(questions), "examCodes": exam_codes})
                                return
                            if not user_payload:
                                user_payload = self.fetch_user_payload(conn, int(session["id"]))
                            enabled_categories = {row["key"] for row in list_categories(conn, enabled_only=True)}
                        visible, tier = filter_questions_for_user_access(
                            questions=questions,
                            user_payload=user_payload,
                            enabled_categories=enabled_categories,
                            max_trial_questions=10,
                        )
                        self.send_json(
                            200,
                            {
                                "items": visible,
                                "total": len(visible),
                                "examCodes": exam_codes,
                                "membershipTier": tier,
                            },
                        )
                        return

                    if len(parts) == 4 and parts[3] == "mock-start" and method == "POST":
                        # handled below in POST branch
                        pass

            if method == "POST" and path.startswith("/api/exams/") and path.endswith("/mock-start"):
                session = self.require_session()
                if not session:
                    return
                parts = [item for item in path.split("/") if item]
                if len(parts) != 4 or parts[0] != "api" or parts[1] != "exams" or parts[3] != "mock-start":
                    self.send_json(404, {"error": "Unknown API endpoint"})
                    return
                exam_code = normalize_exam_code(parts[2])
                if not exam_code:
                    self.send_json(400, {"error": "exam_code 非法"})
                    return
                with db_conn() as conn:
                    ensure_exam_categories_defaults(conn)
                    exams = list_runtime_exams_with_categories(conn)
                    exam = next((item for item in exams if normalize_exam_code(item.get("examCode")) == exam_code), None)
                    if not exam:
                        self.send_json(404, {"error": "考试不存在"})
                        return
                    assigned_exam_codes: list[str] = []
                    user_payload = None
                    if session["is_admin"] != 1 and session["id"] is not None:
                        user_payload = self.fetch_user_payload(conn, int(session["id"]))
                        assigned_exam_codes = normalize_assignment_exam_code_list(
                            (user_payload or {}).get("assignedExamCodes")
                        )
                        if assigned_exam_codes and not exam_matches_assigned_codes(exam, assigned_exam_codes):
                            self.send_json(403, {"error": "当前账号未开通该考试模块"})
                            return
                    if not exam.get("mockEnabled"):
                        self.send_json(400, {"error": "该考试未启用模拟考试"})
                        return
                    exam_codes = [exam_code, *normalize_exam_code_list(exam.get("includedExamCodes"))]
                    if assigned_exam_codes:
                        exam_map = {
                            normalize_exam_code(item.get("examCode")): item
                            for item in exams
                            if normalize_exam_code(item.get("examCode"))
                        }
                        exam_codes = [
                            code
                            for code in exam_codes
                            if exam_matches_assigned_codes(
                                exam_map.get(code) or {"examCode": code},
                                assigned_exam_codes,
                            )
                        ]
                    question_count = max(1, to_int(exam.get("questionCount"), 100))
                    time_limit = max(1, to_int(exam.get("examTimeMinutes"), 180))
                    questions = fetch_runtime_questions(
                        conn,
                        exam_codes=exam_codes,
                        category_code="",
                        limit=question_count,
                    )
                    if session["is_admin"] == 1 or session["id"] is None:
                        self.send_json(
                            200,
                            {
                                "examCode": exam_code,
                                "examCodes": exam_codes,
                                "questionCount": question_count,
                                "timeLimitMinutes": time_limit,
                                "items": questions,
                            },
                        )
                        return
                    if not user_payload:
                        user_payload = self.fetch_user_payload(conn, int(session["id"]))
                    enabled_categories = {row["key"] for row in list_categories(conn, enabled_only=True)}
                visible, tier = filter_questions_for_user_access(
                    questions=questions,
                    user_payload=user_payload,
                    enabled_categories=enabled_categories,
                    max_trial_questions=10,
                )
                self.send_json(
                    200,
                    {
                        "examCode": exam_code,
                        "examCodes": exam_codes,
                        "questionCount": question_count,
                        "timeLimitMinutes": time_limit,
                        "items": visible,
                        "membershipTier": tier,
                    },
                )
                return

            if method == "GET" and path == "/api/question-bank":
                session = self.require_session()
                if not session:
                    return
                bank = self.get_bank()
                if session["is_admin"] == 1 or session["id"] is None:
                    self.send_json(200, bank)
                    return

                with db_conn() as conn:
                    enabled_exam_codes = {
                        normalize_exam_code(row["exam_code"])
                        for row in list_exam_catalog(conn, enabled_only=True)
                        if bool(row["category_exists"]) and bool(row["category_enabled"])
                    }
                runtime_bank = build_runtime_bank(bank, enabled_exam_codes=enabled_exam_codes)

                with db_conn() as conn:
                    ensure_user_category_entitlements(conn)
                    user_payload = self.fetch_user_payload(conn, int(session["id"]))
                if not user_payload:
                    self.send_json(401, {"error": "Unauthorized"})
                    return
                assigned_exam_codes = normalize_assignment_exam_code_list(user_payload.get("assignedExamCodes"))
                runtime_bank = filter_bank_by_assigned_exam_codes(runtime_bank, assigned_exam_codes)

                membership_tier = normalize_membership_tier(
                    user_payload.get("membershipTier"),
                    infer_membership_tier(plan=user_payload.get("plan")),
                )
                if is_paid_membership_tier(membership_tier):
                    with db_conn() as conn:
                        enabled_categories = {row["key"] for row in list_categories(conn, enabled_only=True)}
                    self.send_json(
                        200,
                        filter_bank_for_paid_user(
                            runtime_bank,
                            category_entitlements=user_payload.get("categoryEntitlements", {}),
                            legacy_entitlements=user_payload.get("entitlements"),
                            enabled_categories=enabled_categories,
                            content_permissions=resolve_user_content_permissions(user_payload),
                        ),
                    )
                    return

                self.send_json(200, build_trial_safe_bank(runtime_bank, max_questions=10))
                return

            if method == "GET" and path == "/api/dashboard/modules":
                user = self.require_user()
                if not user:
                    return
                with db_conn() as conn:
                    ensure_user_profile_columns(conn)
                    ensure_dashboard_modules_table(conn)
                    ensure_course_contents_table(conn)
                    payload = self.fetch_user_payload(conn, int(user["id"]))
                    if not payload:
                        self.send_json(401, {"error": "Unauthorized"})
                        return
                    modules = list_visible_dashboard_modules_for_user(conn, payload)
                    course_contents = list_visible_course_contents_for_user(conn, payload)
                self.send_json(
                    200,
                    {
                        "items": modules,
                        "courseContents": course_contents,
                        "assignedExamCodes": normalize_assignment_exam_code_list(payload.get("assignedExamCodes")),
                        "membershipTier": normalize_membership_tier(payload.get("membershipTier"), "free"),
                    },
                )
                return

            if method == "GET" and path == "/api/course-contents":
                user = self.require_user()
                if not user:
                    return
                with db_conn() as conn:
                    ensure_user_profile_columns(conn)
                    ensure_course_contents_table(conn)
                    payload = self.fetch_user_payload(conn, int(user["id"]))
                    if not payload:
                        self.send_json(401, {"error": "Unauthorized"})
                        return
                    items = list_visible_course_contents_for_user(conn, payload)
                self.send_json(200, {"items": items})
                return

            if method == "GET" and path == "/api/account/profile":
                user = self.require_user()
                if not user:
                    return
                with db_conn() as conn:
                    ensure_user_profile_columns(conn)
                    row = conn.execute(
                        """
                        SELECT id, name, nickname, email, phone, membership_tier
                        FROM users
                        WHERE id = ?
                        """,
                        (int(user["id"]),),
                    ).fetchone()
                if not row:
                    self.send_json(404, {"error": "用户不存在"})
                    return
                self.send_json(
                    200,
                    {
                        "ok": True,
                        "profile": {
                            "id": int(row["id"]),
                            "displayName": clean_text(row["name"]),
                            "name": clean_text(row["name"]),
                            "nickname": clean_text(row["nickname"]),
                            "email": clean_text(row["email"]),
                            "phone": clean_text(row["phone"]),
                            "membershipTier": normalize_membership_tier(row["membership_tier"], "free"),
                        },
                    },
                )
                return

            if method == "POST" and path == "/api/account/profile":
                user = self.require_user()
                if not user:
                    return
                data = self.read_json()
                if not isinstance(data, dict):
                    self.send_json(400, {"error": "请求体格式错误"})
                    return

                with db_conn() as conn:
                    ensure_user_profile_columns(conn)
                    row = conn.execute(
                        """
                        SELECT id, name, nickname, email, phone, membership_tier
                        FROM users
                        WHERE id = ?
                        """,
                        (int(user["id"]),),
                    ).fetchone()
                    if not row:
                        self.send_json(404, {"error": "用户不存在"})
                        return

                    current_name = clean_text(row["name"])
                    current_nickname = clean_text(row["nickname"])
                    current_phone = clean_text(row["phone"])

                    has_display_name = "displayName" in data or "name" in data
                    has_nickname = "nickname" in data
                    has_phone = "phone" in data

                    next_name = (
                        clean_text(data.get("displayName") if "displayName" in data else data.get("name"))
                        if has_display_name
                        else current_name
                    )
                    next_nickname = clean_text(data.get("nickname")) if has_nickname else current_nickname
                    next_phone = clean_text(data.get("phone")) if has_phone else current_phone

                    if has_display_name and len(next_name) < 2:
                        self.send_json(400, {"error": "姓名至少2个字符"})
                        return
                    if len(next_nickname) > 64:
                        self.send_json(400, {"error": "昵称长度不能超过64字符"})
                        return
                    if next_phone:
                        if len(next_phone) < 6 or len(next_phone) > 32:
                            self.send_json(400, {"error": "手机号长度不合法"})
                            return
                        if not re.fullmatch(r"[0-9+()\-\s]+", next_phone):
                            self.send_json(400, {"error": "手机号格式不合法"})
                            return

                    conn.execute(
                        """
                        UPDATE users
                        SET name = ?, nickname = ?, phone = ?
                        WHERE id = ?
                        """,
                        (next_name, next_nickname, next_phone, int(user["id"])),
                    )
                    latest = conn.execute(
                        """
                        SELECT id, name, nickname, email, phone, membership_tier
                        FROM users
                        WHERE id = ?
                        """,
                        (int(user["id"]),),
                    ).fetchone()

                self.send_json(
                    200,
                    {
                        "ok": True,
                        "profile": {
                            "id": int(latest["id"]),
                            "displayName": clean_text(latest["name"]),
                            "name": clean_text(latest["name"]),
                            "nickname": clean_text(latest["nickname"]),
                            "email": clean_text(latest["email"]),
                            "phone": clean_text(latest["phone"]),
                            "membershipTier": normalize_membership_tier(latest["membership_tier"], "free"),
                        },
                    },
                )
                return

            if method == "POST" and path == "/api/account/change-password":
                user = self.require_user()
                if not user:
                    return
                data = self.read_json()
                current_password = str(data.get("currentPassword", ""))
                new_password = str(data.get("newPassword", ""))
                if len(new_password) < 6:
                    self.send_json(400, {"error": "新密码至少6位"})
                    return
                with db_conn() as conn:
                    row = conn.execute(
                        "SELECT password FROM users WHERE id=?", (int(user["id"]),)
                    ).fetchone()
                    if not row:
                        self.send_json(404, {"error": "用户不存在"})
                        return
                    if not verify_password(current_password, row["password"]):
                        self.send_json(401, {"error": "当前密码不正确"})
                        return
                    conn.execute(
                        "UPDATE users SET password=? WHERE id=?",
                        (hash_password(new_password), int(user["id"])),
                    )
                self.send_json(200, {"ok": True})
                return

            if method == "GET" and path == "/api/licensing-progress":
                user = self.require_user()
                if not user:
                    return
                with db_conn() as conn:
                    ensure_licensing_progress_table(conn)
                    payload = get_user_licensing_progress(conn, int(user["id"]))
                self.send_json(200, {"ok": True, "progress": payload})
                return

            if method == "PUT" and path == "/api/licensing-progress":
                user = self.require_user()
                if not user:
                    return
                data = self.read_json()
                with db_conn() as conn:
                    ensure_licensing_progress_table(conn)
                    progress = upsert_user_licensing_progress(
                        conn,
                        user_id=int(user["id"]),
                        payload=data if isinstance(data, dict) else {},
                        updated_by_admin=False,
                    )
                self.send_json(200, {"ok": True, "progress": progress})
                return

            if method == "POST" and path == "/api/progress/event":
                user = self.require_user()
                if not user:
                    return
                data = self.read_json()
                exam_id = str(data.get("examId") or data.get("exam_id") or "").strip()
                question_id = str(data.get("question_id", "")).strip()
                selected_index = data.get("selected_index")
                mode = str(data.get("mode", "")).strip()
                if not exam_id or not question_id:
                    self.send_json(400, {"error": "exam_id 和 question_id 必填"})
                    return
                with db_conn() as conn:
                    conn.execute(
                        """
                        INSERT INTO progress_events(user_id, exam_id, question_id, selected_index, mode, created_at)
                        VALUES(?,?,?,?,?,?)
                        """,
                        (user["id"], exam_id, question_id, selected_index, mode, now_iso()),
                    )
                self.send_json(200, {"ok": True})
                return

            if method == "POST" and path == "/api/progress/submit":
                user = self.require_user()
                if not user:
                    return
                data = self.read_json()
                exam_id = str(data.get("examId") or data.get("exam_id") or "").strip()
                percent = max(0, min(100, int(data.get("percent", 0))))
                mode = str(data.get("mode", "")).strip() or "category"
                wrong_ids = data.get("wrong_question_ids") or []
                all_ids = data.get("all_question_ids") or []

                if not exam_id:
                    self.send_json(400, {"error": "exam_id 必填"})
                    return

                wrong_id_set = {str(qid).strip() for qid in wrong_ids if str(qid).strip()}
                all_id_set = {str(qid).strip() for qid in all_ids if str(qid).strip()}
                correct_id_set = all_id_set - wrong_id_set

                with db_conn() as conn:
                    prev = conn.execute(
                        "SELECT attempts, best FROM progress_summary WHERE user_id=? AND exam_id=?",
                        (user["id"], exam_id),
                    ).fetchone()
                    attempts = (prev["attempts"] if prev else 0) + 1
                    best = max(prev["best"] if prev else 0, percent)
                    mode_label = "模拟考试" if mode == "mock" else "分类训练"
                    conn.execute(
                        """
                        INSERT INTO progress_summary(user_id, exam_id, attempts, percent, best, last_mode, practiced_at)
                        VALUES(?,?,?,?,?,?,?)
                        ON CONFLICT(user_id, exam_id) DO UPDATE SET
                          attempts=excluded.attempts,
                          percent=excluded.percent,
                          best=excluded.best,
                          last_mode=excluded.last_mode,
                          practiced_at=excluded.practiced_at
                        """,
                        (user["id"], exam_id, attempts, percent, best, mode_label, now_iso()),
                    )

                    for qid_text in wrong_id_set:
                        conn.execute(
                            """
                            INSERT OR IGNORE INTO wrong_book(user_id, exam_id, question_id, created_at)
                            VALUES(?,?,?,?)
                            """,
                            (user["id"], exam_id, qid_text, now_iso()),
                        )
                    # 答错：连对计数清零（含已在错题本中的旧题）
                    if wrong_id_set:
                        placeholders = ",".join("?" * len(wrong_id_set))
                        conn.execute(
                            f"UPDATE wrong_book SET correct_streak=0 WHERE user_id=? AND exam_id=? AND question_id IN ({placeholders})",
                            (user["id"], exam_id, *wrong_id_set),
                        )

                    # 答对：连对 +1；连续答对 WRONG_BOOK_REMOVE_STREAK 次才移出错题本
                    if correct_id_set:
                        placeholders = ",".join("?" * len(correct_id_set))
                        conn.execute(
                            f"UPDATE wrong_book SET correct_streak=COALESCE(correct_streak,0)+1 WHERE user_id=? AND exam_id=? AND question_id IN ({placeholders})",
                            (user["id"], exam_id, *correct_id_set),
                        )
                        conn.execute(
                            f"DELETE FROM wrong_book WHERE user_id=? AND exam_id=? AND question_id IN ({placeholders}) AND correct_streak >= {WRONG_BOOK_REMOVE_STREAK}",
                            (user["id"], exam_id, *correct_id_set),
                        )

                self.send_json(200, {"ok": True})
                return

            if method == "GET" and path == "/api/progress/summary":
                user = self.require_user()
                if not user:
                    return
                try:
                    with db_conn() as conn:
                        try:
                            rows = conn.execute(
                                "SELECT exam_id, attempts, percent, best, last_mode, practiced_at FROM progress_summary WHERE user_id=?",
                                (user["id"],),
                            ).fetchall()
                        except Exception:
                            rows = []

                    summary = {}
                    for row in rows:
                        row_keys = set(row.keys()) if hasattr(row, "keys") else set()
                        exam_id = row["exam_id"] if "exam_id" in row_keys else row["examId"]
                        summary[exam_id] = {
                            "attempts": row["attempts"] if "attempts" in row_keys else 0,
                            "percent": row["percent"] if "percent" in row_keys else 0,
                            "best": row["best"] if "best" in row_keys else 0,
                            "lastMode": row["last_mode"] if "last_mode" in row_keys else (row["lastMode"] if "lastMode" in row_keys else None),
                            "practicedAt": row["practiced_at"] if "practiced_at" in row_keys else (row["practicedAt"] if "practicedAt" in row_keys else None),
                        }

                    self.send_json(200, summary)
                except Exception as e:
                    print("SAFE /api/progress/summary fallback:", e)
                    self.send_json(200, {})
                return
            if method == "GET" and path == "/api/progress/wrong-book":
                user = self.require_user()
                if not user:
                    return
                exam_id = (qs.get("exam_id") or qs.get("examId") or [""])[0]
                with db_conn() as conn:
                    if exam_id:
                        rows = conn.execute(
                            "SELECT question_id FROM wrong_book WHERE user_id=? AND exam_id=?",
                            (user["id"], exam_id),
                        ).fetchall()
                        self.send_json(200, {"examId": exam_id, "question_ids": [r["question_id"] for r in rows]})
                        return
                    rows = conn.execute(
                        "SELECT exam_id, question_id FROM wrong_book WHERE user_id=?",
                        (user["id"],),
                    ).fetchall()
                mapped: dict[str, list[str]] = {}
                for row in rows:
                    mapped.setdefault(row["exam_id"], []).append(row["question_id"])
                self.send_json(200, mapped)
                return

            if method == "GET" and path == "/api/progress/bookmarks":
                user = self.require_user()
                if not user:
                    return
                exam_id = (qs.get("exam_id") or qs.get("examId") or [""])[0]
                with db_conn() as conn:
                    if exam_id:
                        rows = conn.execute(
                            "SELECT question_id FROM bookmarks WHERE user_id=? AND exam_id=?",
                            (user["id"], exam_id),
                        ).fetchall()
                        self.send_json(200, {"examId": exam_id, "question_ids": [r["question_id"] for r in rows]})
                        return
                    rows = conn.execute(
                        "SELECT exam_id, question_id FROM bookmarks WHERE user_id=?",
                        (user["id"],),
                    ).fetchall()
                    mapped: dict[str, list[str]] = {}
                    for row in rows:
                        mapped.setdefault(row["exam_id"], []).append(row["question_id"])
                    self.send_json(200, mapped)
                return

            if method == "POST" and path == "/api/progress/bookmarks":
                user = self.require_user()
                if not user:
                    return
                body = self.read_json()
                exam_id = str(body.get("exam_id") or "").strip()
                question_id = str(body.get("question_id") or "").strip()
                if not exam_id or not question_id:
                    self.send_json(400, {"error": "exam_id and question_id required"})
                    return
                with db_conn() as conn:
                    conn.execute(
                        "INSERT OR IGNORE INTO bookmarks(user_id, exam_id, question_id, created_at) VALUES(?,?,?,?)",
                        (user["id"], exam_id, question_id, now_iso()),
                    )
                self.send_json(200, {"ok": True})
                return

            if method == "DELETE" and path == "/api/progress/bookmarks":
                user = self.require_user()
                if not user:
                    return
                body = self.read_json()
                exam_id = str(body.get("exam_id") or "").strip()
                question_id = str(body.get("question_id") or "").strip()
                if not exam_id or not question_id:
                    self.send_json(400, {"error": "exam_id and question_id required"})
                    return
                with db_conn() as conn:
                    conn.execute(
                        "DELETE FROM bookmarks WHERE user_id=? AND exam_id=? AND question_id=?",
                        (user["id"], exam_id, question_id),
                    )
                self.send_json(200, {"ok": True})
                return

            if method == "GET" and path == "/api/progress/session":
                user = self.require_user()
                if not user:
                    return
                with db_conn() as conn:
                    row = conn.execute(
                        "SELECT state_json, updated_at FROM session_state WHERE user_id=?",
                        (user["id"],),
                    ).fetchone()
                if row:
                    try:
                        state_data = json.loads(row["state_json"])
                    except Exception:
                        state_data = {}
                    self.send_json(200, {"state": state_data, "updatedAt": row["updated_at"]})
                else:
                    self.send_json(200, {"state": {}, "updatedAt": None})
                return

            if method == "PUT" and path == "/api/progress/session":
                user = self.require_user()
                if not user:
                    return
                body = self.read_json()
                state_json = json.dumps(body, ensure_ascii=False)
                ts = now_iso()
                with db_conn() as conn:
                    conn.execute(
                        "INSERT OR REPLACE INTO session_state(user_id, state_json, updated_at) VALUES(?,?,?)",
                        (user["id"], state_json, ts),
                    )
                self.send_json(200, {"ok": True, "updatedAt": ts})
                return

            if method == "POST" and path == "/api/progress/reset":
                user = self.require_user()
                if not user:
                    return
                with db_conn() as conn:
                    conn.execute("DELETE FROM progress_summary WHERE user_id=?", (user["id"],))
                    conn.execute("DELETE FROM wrong_book WHERE user_id=?", (user["id"],))
                    conn.execute("DELETE FROM progress_events WHERE user_id=?", (user["id"],))
                    conn.execute("DELETE FROM session_state WHERE user_id=?", (user["id"],))
                self.send_json(200, {"ok": True})
                return

            if method == "GET" and path == "/api/admin/site-settings":
                if not self.require_admin():
                    return
                with db_conn() as conn:
                    wechat_id = get_site_wechat_id(conn)
                    pricing_config = get_site_pricing_config(conn)
                server_now = now_iso()
                pricing_runtime = build_site_pricing_runtime(
                    pricing_config,
                    server_now=parse_iso_datetime(server_now),
                )
                self.send_json(
                    200,
                    {
                        "wechatId": wechat_id,
                        "pricingConfig": pricing_config,
                        "pricingRuntime": pricing_runtime,
                        "serverNow": server_now,
                    },
                )
                return

            if method == "PUT" and path == "/api/admin/site-settings":
                if not self.require_admin():
                    return
                data = self.read_json()
                has_wechat = ("wechatId" in data) or ("wechat_id" in data)
                has_pricing = "pricingConfig" in data
                if not has_wechat and not has_pricing:
                    self.send_json(400, {"error": "请提供可更新字段（wechatId 或 pricingConfig）"})
                    return

                wechat_id = None
                if has_wechat:
                    wechat_id = normalize_wechat_id(
                        data.get("wechatId") or data.get("wechat_id"),
                        default="",
                    )
                    if len(wechat_id) < 3:
                        self.send_json(400, {"error": "微信号至少 3 个字符"})
                        return

                pricing_config_payload = data.get("pricingConfig") if isinstance(data.get("pricingConfig"), dict) else {}
                with db_conn() as conn:
                    current_wechat_id = get_site_wechat_id(conn)
                    saved_wechat_id = current_wechat_id
                    if has_wechat and wechat_id is not None:
                        saved_wechat_id = set_site_wechat_id(conn, wechat_id)
                    current_pricing = get_site_pricing_config(conn)
                    saved_pricing = current_pricing
                    if has_pricing:
                        saved_pricing = set_site_pricing_config(conn, pricing_config_payload)
                server_now = now_iso()
                pricing_runtime = build_site_pricing_runtime(
                    saved_pricing,
                    server_now=parse_iso_datetime(server_now),
                )
                self.send_json(
                    200,
                    {
                        "ok": True,
                        "wechatId": saved_wechat_id,
                        "pricingConfig": saved_pricing,
                        "pricingRuntime": pricing_runtime,
                        "serverNow": server_now,
                    },
                )
                return

            if method == "GET" and path == "/api/admin/dashboard-modules":
                if not self.require_admin():
                    return
                active_only = str((qs.get("active_only") or [""])[0]).strip().lower() in {"1", "true", "yes", "y"}
                with db_conn() as conn:
                    ensure_dashboard_modules_table(conn)
                    rows = list_dashboard_modules(conn, active_only=active_only)
                self.send_json(200, {"items": rows})
                return

            if method == "POST" and path == "/api/admin/dashboard-modules":
                if not self.require_admin():
                    return
                data = self.read_json()
                try:
                    payload = normalize_module_payload_for_write(data if isinstance(data, dict) else {})
                except ValueError as err:
                    self.send_json(400, {"error": str(err)})
                    return
                with db_conn() as conn:
                    ensure_dashboard_modules_table(conn)
                    existed = conn.execute(
                        "SELECT module_code FROM dashboard_modules WHERE module_code = ?",
                        (payload["moduleCode"],),
                    ).fetchone()
                    if existed:
                        self.send_json(409, {"error": "module_code 已存在", "code": "ALREADY_EXISTS"})
                        return
                    now = now_iso()
                    conn.execute(
                        """
                        INSERT INTO dashboard_modules(
                          module_code, title, title_zh, module_type, description, icon,
                          is_active, sort_order, visible_for_exam_codes, visible_for_membership_tiers,
                          route_type, route_target, linked_exam_code, linked_category_code, badge_text,
                          is_placeholder, settings_json, created_at, updated_at
                        )
                        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                        """,
                        (
                            payload["moduleCode"],
                            payload["title"],
                            payload["titleZh"],
                            payload["moduleType"],
                            payload["description"],
                            payload["icon"],
                            payload["isActive"],
                            payload["sortOrder"],
                            dump_assignment_exam_code_list(payload["visibleForExamCodes"]),
                            dump_membership_visibility_list(payload["visibleForMembershipTiers"]),
                            payload["routeType"],
                            payload["routeTarget"],
                            payload["linkedExamCode"],
                            payload["linkedCategoryCode"],
                            payload["badgeText"],
                            payload["isPlaceholder"],
                            json.dumps(payload["settings"], ensure_ascii=False),
                            now,
                            now,
                        ),
                    )
                    row = conn.execute(
                        """
                        SELECT
                          module_code, title, title_zh, module_type, description, icon, is_active, sort_order,
                          visible_for_exam_codes, visible_for_membership_tiers, route_type, route_target,
                          linked_exam_code, linked_category_code, badge_text, is_placeholder, settings_json, updated_at
                        FROM dashboard_modules
                        WHERE module_code = ?
                        """,
                        (payload["moduleCode"],),
                    ).fetchone()
                self.send_json(200, {"ok": True, "item": normalize_dashboard_module_row(row)})
                return

            if method == "PUT" and path.startswith("/api/admin/dashboard-modules/"):
                if not self.require_admin():
                    return
                module_code = clean_text(path.rsplit("/", 1)[-1]).lower()
                if not re.fullmatch(r"[a-z][a-z0-9_]{1,63}", module_code):
                    self.send_json(400, {"error": "module_code 非法"})
                    return
                data = self.read_json()
                with db_conn() as conn:
                    ensure_dashboard_modules_table(conn)
                    current_row = conn.execute(
                        """
                        SELECT
                          module_code, title, title_zh, module_type, description, icon, is_active, sort_order,
                          visible_for_exam_codes, visible_for_membership_tiers, route_type, route_target,
                          linked_exam_code, linked_category_code, badge_text, is_placeholder, settings_json, updated_at
                        FROM dashboard_modules
                        WHERE module_code = ?
                        """,
                        (module_code,),
                    ).fetchone()
                    if not current_row:
                        self.send_json(404, {"error": "模块不存在"})
                        return
                    current = normalize_dashboard_module_row(current_row)
                    try:
                        payload = normalize_module_payload_for_write(
                            data if isinstance(data, dict) else {},
                            current=current,
                        )
                    except ValueError as err:
                        self.send_json(400, {"error": str(err)})
                        return
                    now = now_iso()
                    conn.execute(
                        """
                        UPDATE dashboard_modules
                        SET title = ?, title_zh = ?, module_type = ?, description = ?, icon = ?,
                            is_active = ?, sort_order = ?, visible_for_exam_codes = ?, visible_for_membership_tiers = ?,
                            route_type = ?, route_target = ?, linked_exam_code = ?, linked_category_code = ?,
                            badge_text = ?, is_placeholder = ?, settings_json = ?, updated_at = ?
                        WHERE module_code = ?
                        """,
                        (
                            payload["title"],
                            payload["titleZh"],
                            payload["moduleType"],
                            payload["description"],
                            payload["icon"],
                            payload["isActive"],
                            payload["sortOrder"],
                            dump_assignment_exam_code_list(payload["visibleForExamCodes"]),
                            dump_membership_visibility_list(payload["visibleForMembershipTiers"]),
                            payload["routeType"],
                            payload["routeTarget"],
                            payload["linkedExamCode"],
                            payload["linkedCategoryCode"],
                            payload["badgeText"],
                            payload["isPlaceholder"],
                            json.dumps(payload["settings"], ensure_ascii=False),
                            now,
                            module_code,
                        ),
                    )
                    row = conn.execute(
                        """
                        SELECT
                          module_code, title, title_zh, module_type, description, icon, is_active, sort_order,
                          visible_for_exam_codes, visible_for_membership_tiers, route_type, route_target,
                          linked_exam_code, linked_category_code, badge_text, is_placeholder, settings_json, updated_at
                        FROM dashboard_modules
                        WHERE module_code = ?
                        """,
                        (module_code,),
                    ).fetchone()
                self.send_json(200, {"ok": True, "item": normalize_dashboard_module_row(row)})
                return

            if method == "DELETE" and path.startswith("/api/admin/dashboard-modules/"):
                if not self.require_admin():
                    return
                module_code = clean_text(path.rsplit("/", 1)[-1]).lower()
                if not re.fullmatch(r"[a-z][a-z0-9_]{1,63}", module_code):
                    self.send_json(400, {"error": "module_code 非法"})
                    return
                with db_conn() as conn:
                    ensure_dashboard_modules_table(conn)
                    existed = conn.execute(
                        "SELECT module_code FROM dashboard_modules WHERE module_code = ?",
                        (module_code,),
                    ).fetchone()
                    if not existed:
                        self.send_json(404, {"error": "模块不存在"})
                        return
                    conn.execute("DELETE FROM dashboard_modules WHERE module_code = ?", (module_code,))
                self.send_json(200, {"ok": True, "deletedModuleCode": module_code})
                return

            if method == "GET" and path == "/api/admin/course-contents":
                if not self.require_admin():
                    return
                active_only = str((qs.get("active_only") or [""])[0]).strip().lower() in {"1", "true", "yes", "y"}
                with db_conn() as conn:
                    ensure_course_contents_table(conn)
                    rows = list_course_contents(conn, active_only=active_only)
                self.send_json(200, {"items": rows})
                return

            if method == "POST" and path == "/api/admin/course-contents":
                if not self.require_admin():
                    return
                data = self.read_json()
                try:
                    payload = normalize_course_content_payload_for_write(data if isinstance(data, dict) else {})
                except ValueError as err:
                    self.send_json(400, {"error": str(err)})
                    return
                with db_conn() as conn:
                    ensure_course_contents_table(conn)
                    existed = conn.execute(
                        "SELECT content_code FROM course_contents WHERE content_code = ?",
                        (payload["contentCode"],),
                    ).fetchone()
                    if existed:
                        self.send_json(409, {"error": "content_code 已存在", "code": "ALREADY_EXISTS"})
                        return
                    now = now_iso()
                    conn.execute(
                        """
                        INSERT INTO course_contents(
                          content_code, title, content_type, linked_exam_code, is_active, sort_order,
                          description, thumbnail, access_tier, is_placeholder, created_at, updated_at
                        )
                        VALUES(?,?,?,?,?,?,?,?,?,?,?,?)
                        """,
                        (
                            payload["contentCode"],
                            payload["title"],
                            payload["contentType"],
                            payload["linkedExamCode"],
                            payload["isActive"],
                            payload["sortOrder"],
                            payload["description"],
                            payload["thumbnail"],
                            payload["accessTier"],
                            payload["isPlaceholder"],
                            now,
                            now,
                        ),
                    )
                    row = conn.execute(
                        """
                        SELECT
                          content_code, title, content_type, linked_exam_code, is_active, sort_order,
                          description, thumbnail, access_tier, is_placeholder, updated_at
                        FROM course_contents
                        WHERE content_code = ?
                        """,
                        (payload["contentCode"],),
                    ).fetchone()
                self.send_json(200, {"ok": True, "item": normalize_course_content_row(row)})
                return

            if method == "PUT" and path.startswith("/api/admin/course-contents/"):
                if not self.require_admin():
                    return
                content_code = clean_text(path.rsplit("/", 1)[-1]).lower()
                if not re.fullmatch(r"[a-z][a-z0-9_]{1,63}", content_code):
                    self.send_json(400, {"error": "content_code 非法"})
                    return
                data = self.read_json()
                with db_conn() as conn:
                    ensure_course_contents_table(conn)
                    row = conn.execute(
                        """
                        SELECT
                          content_code, title, content_type, linked_exam_code, is_active, sort_order,
                          description, thumbnail, access_tier, is_placeholder, updated_at
                        FROM course_contents
                        WHERE content_code = ?
                        """,
                        (content_code,),
                    ).fetchone()
                    if not row:
                        self.send_json(404, {"error": "课程内容不存在"})
                        return
                    current = normalize_course_content_row(row)
                    try:
                        payload = normalize_course_content_payload_for_write(
                            data if isinstance(data, dict) else {},
                            current=current,
                        )
                    except ValueError as err:
                        self.send_json(400, {"error": str(err)})
                        return
                    now = now_iso()
                    conn.execute(
                        """
                        UPDATE course_contents
                        SET title = ?, content_type = ?, linked_exam_code = ?, is_active = ?, sort_order = ?,
                            description = ?, thumbnail = ?, access_tier = ?, is_placeholder = ?, updated_at = ?
                        WHERE content_code = ?
                        """,
                        (
                            payload["title"],
                            payload["contentType"],
                            payload["linkedExamCode"],
                            payload["isActive"],
                            payload["sortOrder"],
                            payload["description"],
                            payload["thumbnail"],
                            payload["accessTier"],
                            payload["isPlaceholder"],
                            now,
                            content_code,
                        ),
                    )
                    updated = conn.execute(
                        """
                        SELECT
                          content_code, title, content_type, linked_exam_code, is_active, sort_order,
                          description, thumbnail, access_tier, is_placeholder, updated_at
                        FROM course_contents
                        WHERE content_code = ?
                        """,
                        (content_code,),
                    ).fetchone()
                self.send_json(200, {"ok": True, "item": normalize_course_content_row(updated)})
                return

            if method == "DELETE" and path.startswith("/api/admin/course-contents/"):
                if not self.require_admin():
                    return
                content_code = clean_text(path.rsplit("/", 1)[-1]).lower()
                if not re.fullmatch(r"[a-z][a-z0-9_]{1,63}", content_code):
                    self.send_json(400, {"error": "content_code 非法"})
                    return
                with db_conn() as conn:
                    ensure_course_contents_table(conn)
                    row = conn.execute(
                        "SELECT content_code FROM course_contents WHERE content_code = ?",
                        (content_code,),
                    ).fetchone()
                    if not row:
                        self.send_json(404, {"error": "课程内容不存在"})
                        return
                    conn.execute("DELETE FROM course_contents WHERE content_code = ?", (content_code,))
                self.send_json(200, {"ok": True, "deletedContentCode": content_code})
                return

            if method == "GET" and path.startswith("/api/admin/licensing-progress/"):
                if not self.require_admin():
                    return
                raw_user_id = clean_text(path.rsplit("/", 1)[-1])
                if not raw_user_id.isdigit():
                    self.send_json(400, {"error": "user_id 非法"})
                    return
                user_id = int(raw_user_id)
                with db_conn() as conn:
                    ensure_user_profile_columns(conn)
                    ensure_licensing_progress_table(conn)
                    user_row = conn.execute("SELECT id, name, email FROM users WHERE id = ?", (user_id,)).fetchone()
                    if not user_row:
                        self.send_json(404, {"error": "用户不存在"})
                        return
                    progress = get_user_licensing_progress(conn, user_id)
                self.send_json(
                    200,
                    {
                        "ok": True,
                        "user": {"id": int(user_row["id"]), "name": user_row["name"], "email": user_row["email"]},
                        "progress": progress,
                    },
                )
                return

            if method == "PUT" and path.startswith("/api/admin/licensing-progress/"):
                if not self.require_admin():
                    return
                raw_user_id = clean_text(path.rsplit("/", 1)[-1])
                if not raw_user_id.isdigit():
                    self.send_json(400, {"error": "user_id 非法"})
                    return
                user_id = int(raw_user_id)
                data = self.read_json()
                with db_conn() as conn:
                    ensure_user_profile_columns(conn)
                    ensure_licensing_progress_table(conn)
                    user_row = conn.execute("SELECT id, name, email FROM users WHERE id = ?", (user_id,)).fetchone()
                    if not user_row:
                        self.send_json(404, {"error": "用户不存在"})
                        return
                    progress = upsert_user_licensing_progress(
                        conn,
                        user_id=user_id,
                        payload=data if isinstance(data, dict) else {},
                        updated_by_admin=True,
                    )
                self.send_json(
                    200,
                    {
                        "ok": True,
                        "user": {"id": int(user_row["id"]), "name": user_row["name"], "email": user_row["email"]},
                        "progress": progress,
                    },
                )
                return

            if method == "GET" and path == "/api/admin/categories":
                if not self.require_admin():
                    return
                with db_conn() as conn:
                    ensure_user_category_entitlements(conn)
                    rows = list_categories(conn, enabled_only=False)
                self.send_json(200, [normalize_category_payload(row) for row in rows])
                return

            if method == "POST" and path == "/api/admin/categories":
                if not self.require_admin():
                    return
                data = self.read_json()
                key = normalize_category_key(data.get("key"))
                name = clean_text(data.get("name"))
                sort_order = to_int(data.get("sortOrder"), 100)
                is_enabled = to_bool_int(data.get("isEnabled"), 1)

                if not is_valid_category_key(key):
                    self.send_json(400, {"error": "分类 key 仅支持小写字母/数字/下划线，且必须以字母开头"})
                    return
                if len(name) < 2:
                    self.send_json(400, {"error": "分类名称至少2个字符"})
                    return

                with db_conn() as conn:
                    ensure_user_category_entitlements(conn)
                    existed = conn.execute("SELECT key FROM categories WHERE key = ?", (key,)).fetchone()
                    if existed:
                        self.send_json(400, {"error": "分类 key 已存在"})
                        return

                    conn.execute(
                        """
                        INSERT INTO categories(key, name, is_enabled, sort_order, created_at, updated_at)
                        VALUES(?,?,?,?,?,?)
                        """,
                        (key, name, is_enabled, sort_order, now_iso(), now_iso()),
                    )
                    conn.execute(
                        """
                        INSERT OR IGNORE INTO user_category_entitlements(user_id, category_key, has_access, expires_at, updated_at)
                        SELECT id, ?, 0, NULL, ?
                        FROM users
                        """,
                        (key, now_iso()),
                    )
                    row = conn.execute(
                        "SELECT key, name, is_enabled, sort_order FROM categories WHERE key = ?",
                        (key,),
                    ).fetchone()

                self.send_json(200, {"ok": True, "category": normalize_category_payload(row)})
                return

            if method == "PUT" and path.startswith("/api/admin/categories/"):
                if not self.require_admin():
                    return
                raw_key = clean_text(path.rsplit("/", 1)[-1])
                key = normalize_category_key(raw_key)
                if not is_valid_category_key(key):
                    self.send_json(400, {"error": "非法分类 key"})
                    return

                data = self.read_json()
                name_input = data.get("name")
                sort_input = data.get("sortOrder")
                enabled_input = data.get("isEnabled")

                with db_conn() as conn:
                    ensure_user_category_entitlements(conn)
                    current = conn.execute(
                        "SELECT key, name, is_enabled, sort_order FROM categories WHERE key = ?",
                        (key,),
                    ).fetchone()
                    if not current:
                        self.send_json(404, {"error": "分类不存在"})
                        return

                    name = clean_text(name_input) if name_input is not None else current["name"]
                    sort_order = to_int(sort_input, int(current["sort_order"] or 100))
                    is_enabled = (
                        to_bool_int(enabled_input, int(current["is_enabled"])) if enabled_input is not None else int(current["is_enabled"])
                    )

                    if len(name) < 2:
                        self.send_json(400, {"error": "分类名称至少2个字符"})
                        return

                    conn.execute(
                        """
                        UPDATE categories
                        SET name = ?, is_enabled = ?, sort_order = ?, updated_at = ?
                        WHERE key = ?
                        """,
                        (name, is_enabled, sort_order, now_iso(), key),
                    )
                    row = conn.execute(
                        "SELECT key, name, is_enabled, sort_order FROM categories WHERE key = ?",
                        (key,),
                    ).fetchone()

                self.send_json(200, {"ok": True, "category": normalize_category_payload(row)})
                return

            if method == "DELETE" and path.startswith("/api/admin/categories/"):
                if not self.require_admin():
                    return
                raw_key = clean_text(path.rsplit("/", 1)[-1])
                key = normalize_category_key(raw_key)
                if not is_valid_category_key(key):
                    self.send_json(400, {"error": "非法分类 key"})
                    return
                force_delete = str((qs.get("force") or [""])[0]).strip().lower() in {"1", "true", "yes", "y"}

                bank = self.get_bank()
                bank_usage = count_category_references_in_bank(bank, key)
                warning_msg = "This category is in use. Disable it first or remove related data."
                bank_cleanup = {"clearedExamRefs": 0, "clearedQuestionRefs": 0, "totalCleared": 0}
                should_save_bank = False

                with db_conn() as conn:
                    ensure_user_category_entitlements(conn)
                    row = conn.execute("SELECT key FROM categories WHERE key = ?", (key,)).fetchone()
                    if not row:
                        self.send_json(404, {"error": "分类不存在"})
                        return

                    exam_ref_rows = conn.execute(
                        """
                        SELECT exam_code, exam_name, is_enabled
                        FROM exam_catalog
                        WHERE category_key = ?
                        ORDER BY is_enabled DESC, sort_order ASC, exam_code ASC
                        """,
                        (key,),
                    ).fetchall()
                    exam_catalog_refs = len(exam_ref_rows)
                    if exam_catalog_refs > 0:
                        preview = [
                            {
                                "examCode": item["exam_code"],
                                "examName": item["exam_name"],
                                "isEnabled": bool(item["is_enabled"]),
                            }
                            for item in exam_ref_rows[:10]
                        ]
                        self.send_json(
                            409,
                            {
                                "error": "该分类仍被考试项目引用，不能删除。请先在考试项目管理中改绑分类或删除相关考试项。",
                                "usage": {
                                    "examCatalogRefs": exam_catalog_refs,
                                    "examCatalogItems": preview,
                                },
                                "forceAvailable": False,
                            },
                        )
                        return

                    ent_row = conn.execute(
                        """
                        SELECT COUNT(1) AS cnt
                        FROM user_category_entitlements
                        WHERE category_key = ? AND has_access = 1
                        """,
                        (key,),
                    ).fetchone()
                    active_entitlement_refs = int(ent_row["cnt"] or 0) if ent_row else 0

                    legacy_entitlement_refs = 0
                    if key == "b_license":
                        legacy_row = conn.execute(
                            "SELECT COUNT(1) AS cnt FROM user_entitlements WHERE b_license_access = 1"
                        ).fetchone()
                        legacy_entitlement_refs = int(legacy_row["cnt"] or 0) if legacy_row else 0
                    elif key == "c_license":
                        legacy_row = conn.execute(
                            "SELECT COUNT(1) AS cnt FROM user_entitlements WHERE c_license_access = 1"
                        ).fetchone()
                        legacy_entitlement_refs = int(legacy_row["cnt"] or 0) if legacy_row else 0

                    if (
                        bank_usage["totalRefs"] > 0
                        or active_entitlement_refs > 0
                        or legacy_entitlement_refs > 0
                    ):
                        if not force_delete:
                            self.send_json(
                                409,
                                {
                                    "error": warning_msg,
                                    "usage": {
                                        "bank": bank_usage,
                                        "activeEntitlements": active_entitlement_refs,
                                        "legacyEntitlements": legacy_entitlement_refs,
                                    },
                                    "forceAvailable": True,
                                },
                            )
                            return

                        bank_cleanup = clear_category_references_in_bank(bank, key)
                        if bank_cleanup["totalCleared"] > 0:
                            should_save_bank = True

                    conn.execute("DELETE FROM user_category_entitlements WHERE category_key = ?", (key,))
                    if key == "b_license":
                        conn.execute(
                            "UPDATE user_entitlements SET b_license_access = 0, updated_at = ?",
                            (now_iso(),),
                        )
                    if key == "c_license":
                        conn.execute(
                            "UPDATE user_entitlements SET c_license_access = 0, updated_at = ?",
                            (now_iso(),),
                        )
                    conn.execute("DELETE FROM categories WHERE key = ?", (key,))

                if should_save_bank:
                    self.save_bank(bank)

                self.send_json(
                    200,
                    {
                        "ok": True,
                        "deletedCategoryKey": key,
                        "forced": force_delete,
                        "usageBeforeDelete": {
                            "bank": bank_usage,
                            "activeEntitlements": active_entitlement_refs,
                            "legacyEntitlements": legacy_entitlement_refs,
                        },
                        "cleanup": bank_cleanup,
                    },
                )
                return

            if method == "GET" and path == "/api/admin/exam-categories":
                if not self.require_admin():
                    return
                exam_code = normalize_exam_code((qs.get("exam_code") or [""])[0])
                active_only = str((qs.get("active_only") or [""])[0]).strip().lower() in {"1", "true", "yes", "y"}
                with db_conn() as conn:
                    ensure_exam_categories_defaults(conn)
                    rows = list_exam_categories(conn, exam_code=exam_code or None, active_only=active_only)
                self.send_json(200, [normalize_exam_category_payload(row) for row in rows])
                return

            if method == "POST" and path == "/api/admin/exam-categories":
                if not self.require_admin():
                    return
                data = self.read_json()
                code = clean_text(data.get("code")).upper()
                exam_code = normalize_exam_code(data.get("examCode") or data.get("exam_code"))
                name = clean_text(data.get("name"))
                name_zh = clean_text(data.get("nameZh") or data.get("name_zh"))
                description = clean_text(data.get("description"))
                sort_order = to_int(data.get("sortOrder"), 100)
                is_active = to_bool_int(data.get("isActive"), 1)

                if not code:
                    self.send_json(400, {"error": "code 必填"})
                    return
                if not re.fullmatch(r"[A-Z0-9_]{2,96}", code):
                    self.send_json(400, {"error": "code 仅支持大写字母/数字/下划线"})
                    return
                if not exam_code or not is_valid_exam_code(exam_code):
                    self.send_json(400, {"error": "exam_code 非法"})
                    return
                if len(name) < 2:
                    self.send_json(400, {"error": "分类名称至少2个字符"})
                    return

                with db_conn() as conn:
                    ensure_exam_categories_defaults(conn)
                    exam = conn.execute(
                        "SELECT exam_code FROM exam_catalog WHERE exam_code = ?",
                        (exam_code,),
                    ).fetchone()
                    if not exam:
                        self.send_json(400, {"error": "exam_code 不存在"})
                        return
                    existed = conn.execute(
                        "SELECT code FROM exam_categories WHERE code = ?",
                        (code,),
                    ).fetchone()
                    if existed:
                        self.send_json(400, {"error": "分类 code 已存在"})
                        return
                    now = now_iso()
                    conn.execute(
                        """
                        INSERT INTO exam_categories(
                          code, exam_code, name, name_zh, description, sort_order, is_active, created_at, updated_at
                        )
                        VALUES(?,?,?,?,?,?,?,?,?)
                        """,
                        (code, exam_code, name, name_zh, description, sort_order, is_active, now, now),
                    )
                    row = conn.execute(
                        """
                        SELECT code, exam_code, name, name_zh, description, sort_order, is_active
                        FROM exam_categories
                        WHERE code = ?
                        """,
                        (code,),
                    ).fetchone()
                self.send_json(200, {"ok": True, "category": normalize_exam_category_payload(row)})
                return

            if method == "PUT" and path.startswith("/api/admin/exam-categories/"):
                if not self.require_admin():
                    return
                code = clean_text(path.rsplit("/", 1)[-1]).upper()
                if not re.fullmatch(r"[A-Z0-9_]{2,96}", code):
                    self.send_json(400, {"error": "code 非法"})
                    return
                data = self.read_json()
                with db_conn() as conn:
                    ensure_exam_categories_defaults(conn)
                    current = conn.execute(
                        """
                        SELECT code, exam_code, name, name_zh, description, sort_order, is_active
                        FROM exam_categories
                        WHERE code = ?
                        """,
                        (code,),
                    ).fetchone()
                    if not current:
                        self.send_json(404, {"error": "分类不存在"})
                        return
                    next_exam_code = normalize_exam_code(
                        data.get("examCode") if "examCode" in data else data.get("exam_code") if "exam_code" in data else current["exam_code"]
                    )
                    next_name = clean_text(data.get("name") if "name" in data else current["name"])
                    next_name_zh = clean_text(
                        data.get("nameZh") if "nameZh" in data else data.get("name_zh") if "name_zh" in data else current["name_zh"]
                    )
                    next_description = clean_text(data.get("description") if "description" in data else current["description"])
                    next_sort_order = to_int(data.get("sortOrder"), int(current["sort_order"] or 100))
                    next_is_active = (
                        to_bool_int(data.get("isActive"), int(current["is_active"]))
                        if "isActive" in data
                        else int(current["is_active"])
                    )

                    if not next_exam_code or not is_valid_exam_code(next_exam_code):
                        self.send_json(400, {"error": "exam_code 非法"})
                        return
                    exam = conn.execute(
                        "SELECT exam_code FROM exam_catalog WHERE exam_code = ?",
                        (next_exam_code,),
                    ).fetchone()
                    if not exam:
                        self.send_json(400, {"error": "exam_code 不存在"})
                        return
                    if len(next_name) < 2:
                        self.send_json(400, {"error": "分类名称至少2个字符"})
                        return
                    conn.execute(
                        """
                        UPDATE exam_categories
                        SET exam_code = ?, name = ?, name_zh = ?, description = ?, sort_order = ?, is_active = ?, updated_at = ?
                        WHERE code = ?
                        """,
                        (next_exam_code, next_name, next_name_zh, next_description, next_sort_order, next_is_active, now_iso(), code),
                    )
                    row = conn.execute(
                        """
                        SELECT code, exam_code, name, name_zh, description, sort_order, is_active
                        FROM exam_categories
                        WHERE code = ?
                        """,
                        (code,),
                    ).fetchone()
                self.send_json(200, {"ok": True, "category": normalize_exam_category_payload(row)})
                return

            if method == "DELETE" and path.startswith("/api/admin/exam-categories/"):
                if not self.require_admin():
                    return
                code = clean_text(path.rsplit("/", 1)[-1]).upper()
                if not re.fullmatch(r"[A-Z0-9_]{2,96}", code):
                    self.send_json(400, {"error": "code 非法"})
                    return
                with db_conn() as conn:
                    ensure_questions_table(conn)
                    row = conn.execute(
                        "SELECT code, exam_code, name FROM exam_categories WHERE code = ?",
                        (code,),
                    ).fetchone()
                    if not row:
                        self.send_json(404, {"error": "分类不存在"})
                        return
                    refs = conn.execute(
                        """
                        SELECT COUNT(1) AS cnt
                        FROM questions
                        WHERE UPPER(TRIM(COALESCE(NULLIF(category_code,''), ''))) = ?
                          AND COALESCE(NULLIF(LOWER(TRIM(COALESCE(question_status, 'active'))), ''), 'active') IN ('active','inactive')
                        """,
                        (code,),
                    ).fetchone()
                    ref_count = int(refs["cnt"] or 0) if refs else 0
                    if ref_count > 0:
                        self.send_json(
                            409,
                            {
                                "error": "该分类下仍有题目，不能直接删除。请先迁移题目或改为停用。",
                                "code": "QUESTION_REFERENCED",
                                "questionRefs": ref_count,
                            },
                        )
                        return
                    conn.execute("DELETE FROM exam_categories WHERE code = ?", (code,))
                self.send_json(200, {"ok": True, "deletedCode": code})
                return

            if method == "GET" and path == "/api/admin/exam-structure":
                if not self.require_admin():
                    return
                with db_conn() as conn:
                    ensure_exam_structure_v1_tables(conn)
                    ensure_exam_structure_v1_backfill(conn)
                    nodes = list_exam_structure_tree(conn)
                self.send_json(200, {"nodes": nodes})
                return

            if method == "POST" and path == "/api/admin/exam-structure":
                if not self.require_admin():
                    return
                data = self.read_json()
                node_type = clean_text(data.get("nodeType") or data.get("node_type") or "program").lower()
                if node_type not in {"program", "sub_item"}:
                    self.send_json(400, {"error": "仅支持新增 program（项目）或 sub_item（子项）节点"})
                    return

                node_key = normalize_hierarchy_key(
                    data.get("nodeKey")
                    or data.get("node_key")
                    or data.get("programKey")
                    or data.get("program_key")
                )
                node_name = clean_text(
                    data.get("name")
                    or data.get("nodeName")
                    or data.get("programName")
                    or data.get("program_name")
                )
                sort_order = to_int(data.get("sortOrder"), 100)
                is_enabled = to_bool_int(
                    data.get("enabled") if "enabled" in data else data.get("isEnabled"),
                    1,
                )
                parent_id = None
                if node_type == "sub_item":
                    raw_parent_id = clean_text(
                        data.get("parentId")
                        or data.get("parent_id")
                        or data.get("parentProgramId")
                        or data.get("parent_program_id")
                    )
                    if not raw_parent_id.isdigit():
                        self.send_json(400, {"error": "parent_program_id 必填"})
                        return
                    parent_id = int(raw_parent_id)

                if not node_key:
                    self.send_json(400, {"error": f"{'program' if node_type == 'program' else 'sub_item'}_key 必填"})
                    return
                if not is_valid_hierarchy_key(node_key):
                    self.send_json(400, {"error": f"{'program' if node_type == 'program' else 'sub_item'}_key 非法"})
                    return
                if len(node_name) < 2:
                    self.send_json(
                        400,
                        {"error": "项目名称至少2个字符" if node_type == "program" else "子项名称至少2个字符"},
                    )
                    return

                with db_conn() as conn:
                    ensure_exam_structure_v1_tables(conn)
                    ensure_exam_structure_v1_backfill(conn)
                    if node_type == "sub_item":
                        parent_row = conn.execute(
                            """
                            SELECT id, node_type
                            FROM exam_structure_nodes
                            WHERE id = ?
                            LIMIT 1
                            """,
                            (parent_id,),
                        ).fetchone()
                        if not parent_row or clean_text(parent_row["node_type"]) != "program":
                            self.send_json(400, {"error": "parent_program_id 非法或不存在"})
                            return

                    existed = find_exam_structure_node(
                        conn,
                        parent_id=parent_id if node_type == "sub_item" else None,
                        node_type=node_type,
                        node_key=node_key,
                    )
                    if existed:
                        self.send_json(
                            409,
                            {
                                "error": "该项目已存在" if node_type == "program" else "该子项已存在",
                                "code": "ALREADY_EXISTS",
                                "existingNode": {
                                    "id": int(existed["id"]),
                                    "nodeType": clean_text(existed["node_type"]),
                                    "nodeKey": clean_text(existed["node_key"]),
                                    "name": clean_text(existed["node_name"]),
                                    "isEnabled": bool(existed["is_enabled"]),
                                    "sortOrder": int(existed["sort_order"] or 100),
                                },
                            },
                        )
                        return

                    node_id = ensure_exam_structure_node(
                        conn,
                        parent_id=parent_id if node_type == "sub_item" else None,
                        node_type=node_type,
                        node_key=node_key,
                        node_name=node_name,
                        is_enabled=is_enabled,
                        sort_order=sort_order,
                        update_existing=False,
                    )
                    created = conn.execute(
                        """
                        SELECT id, parent_id, node_type, node_key, node_name, is_enabled, sort_order
                        FROM exam_structure_nodes
                        WHERE id = ?
                        LIMIT 1
                        """,
                        (node_id,),
                    ).fetchone()

                self.send_json(
                    200,
                    {
                        "ok": True,
                        "node": {
                            "id": int(created["id"]),
                            "parentId": int(created["parent_id"]) if created["parent_id"] is not None else None,
                            "nodeType": clean_text(created["node_type"]),
                            "nodeKey": clean_text(created["node_key"]),
                            "name": clean_text(created["node_name"]),
                            "isEnabled": bool(created["is_enabled"]),
                            "sortOrder": int(created["sort_order"] or 100),
                        },
                    },
                )
                return

            if method == "PUT" and path.startswith("/api/admin/exam-structure/"):
                if not self.require_admin():
                    return
                raw_id = clean_text(path.rsplit("/", 1)[-1])
                if not raw_id.isdigit():
                    self.send_json(400, {"error": "结构节点ID非法"})
                    return
                node_id = int(raw_id)
                data = self.read_json()
                has_name = "name" in data or "nodeName" in data
                has_enabled = "enabled" in data or "isEnabled" in data
                if not has_name and not has_enabled:
                    self.send_json(400, {"error": "请提供可更新字段（name 或 enabled）"})
                    return

                with db_conn() as conn:
                    ensure_exam_structure_v1_tables(conn)
                    ensure_exam_structure_v1_backfill(conn)
                    node_row = conn.execute(
                        """
                        SELECT
                          n.id, n.parent_id, n.node_type, n.node_key, n.node_name, n.is_enabled, n.sort_order,
                          mc.module_code
                        FROM exam_structure_nodes n
                        LEFT JOIN exam_module_configs mc ON mc.node_id = n.id
                        WHERE n.id = ?
                        LIMIT 1
                        """,
                        (node_id,),
                    ).fetchone()
                    if not node_row:
                        self.send_json(404, {"error": "结构节点不存在"})
                        return

                    next_name = clean_text(data.get("name") if "name" in data else data.get("nodeName"))
                    if not has_name:
                        next_name = clean_text(node_row["node_name"])
                    if len(next_name) < 2:
                        self.send_json(400, {"error": "名称至少2个字符"})
                        return

                    next_enabled = (
                        to_bool_int(data.get("enabled") if "enabled" in data else data.get("isEnabled"), int(node_row["is_enabled"]))
                        if has_enabled
                        else int(node_row["is_enabled"])
                    )
                    now = now_iso()
                    updated_node_ids = [node_id]
                    if has_enabled and clean_text(node_row["node_type"]) in {"program", "sub_item"}:
                        updated_node_ids = collect_structure_descendant_ids(conn, node_id)

                    for target_id in updated_node_ids:
                        current_name = next_name if target_id == node_id else None
                        if has_name and target_id == node_id:
                            conn.execute(
                                """
                                UPDATE exam_structure_nodes
                                SET node_name = ?, updated_at = ?
                                WHERE id = ?
                                """,
                                (current_name, now, target_id),
                            )
                        if has_enabled:
                            conn.execute(
                                """
                                UPDATE exam_structure_nodes
                                SET is_enabled = ?, updated_at = ?
                                WHERE id = ?
                                """,
                                (next_enabled, now, target_id),
                            )
                        if not has_enabled and not (has_name and target_id == node_id):
                            continue

                    affected_ids = updated_node_ids if has_enabled else [node_id]
                    if (
                        has_name
                        and not has_enabled
                        and clean_text(node_row["node_type"]) in {"program", "sub_item"}
                    ):
                        affected_ids = collect_structure_descendant_ids(conn, node_id)
                    affected_module_codes = list_module_codes_by_node_ids(conn, affected_ids)
                    for module_code in affected_module_codes:
                        sync_legacy_exam_catalog_mirror_for_module(conn, module_code)

                    updated = conn.execute(
                        """
                        SELECT
                          n.id, n.parent_id, n.node_type, n.node_key, n.node_name, n.is_enabled, n.sort_order,
                          mc.module_code
                        FROM exam_structure_nodes n
                        LEFT JOIN exam_module_configs mc ON mc.node_id = n.id
                        WHERE n.id = ?
                        LIMIT 1
                        """,
                        (node_id,),
                    ).fetchone()

                self.send_json(
                    200,
                    {
                        "ok": True,
                        "node": {
                            "id": int(updated["id"]),
                            "parentId": int(updated["parent_id"]) if updated["parent_id"] is not None else None,
                            "nodeType": clean_text(updated["node_type"]),
                            "nodeKey": clean_text(updated["node_key"]),
                            "name": clean_text(updated["node_name"]),
                            "isEnabled": bool(updated["is_enabled"]),
                            "sortOrder": int(updated["sort_order"] or 100),
                            "moduleCode": normalize_exam_code(updated["module_code"]),
                        },
                        "updatedModuleCodes": affected_module_codes,
                    },
                )
                return

            if method == "DELETE" and path.startswith("/api/admin/exam-structure/"):
                if not self.require_admin():
                    return
                raw_id = clean_text(path.rsplit("/", 1)[-1])
                if not raw_id.isdigit():
                    self.send_json(400, {"error": "结构节点ID非法"})
                    return
                node_id = int(raw_id)

                with db_conn() as conn:
                    ensure_exam_structure_v1_tables(conn)
                    ensure_exam_structure_v1_backfill(conn)
                    node_row = conn.execute(
                        """
                        SELECT
                          n.id, n.parent_id, n.node_type, n.node_key, n.node_name, n.is_enabled,
                          mc.module_code
                        FROM exam_structure_nodes n
                        LEFT JOIN exam_module_configs mc ON mc.node_id = n.id
                        WHERE n.id = ?
                        LIMIT 1
                        """,
                        (node_id,),
                    ).fetchone()
                    if not node_row:
                        self.send_json(404, {"error": "结构节点不存在"})
                        return

                    child_row = conn.execute(
                        "SELECT COUNT(1) AS cnt FROM exam_structure_nodes WHERE parent_id = ?",
                        (node_id,),
                    ).fetchone()
                    child_count = int(child_row["cnt"] or 0) if child_row else 0
                    if child_count > 0:
                        self.send_json(
                            409,
                            {
                                "error": "该节点存在子节点，无法删除。请先删除子节点。",
                                "code": "HAS_CHILDREN",
                                "childCount": child_count,
                                "nodeId": node_id,
                            },
                        )
                        return

                    node_type = clean_text(node_row["node_type"])
                    module_code = normalize_exam_code(node_row["module_code"] or node_row["node_key"])
                    question_refs = 0
                    tombstoned_default = False
                    if node_type == "exam_module":
                        refs_row = conn.execute(
                            """
                            SELECT COUNT(1) AS cnt
                            FROM questions
                            WHERE LOWER(TRIM(COALESCE(exam_code, exam_id, ''))) = ?
                              AND COALESCE(NULLIF(LOWER(TRIM(COALESCE(question_status, 'active'))), ''), 'active') IN ('active','inactive')
                            """,
                            (module_code,),
                        ).fetchone()
                        question_refs = int(refs_row["cnt"] or 0) if refs_row else 0
                        if question_refs > 0:
                            self.send_json(
                                409,
                                {
                                    "error": "该考试模块已被题目引用，无法删除。请先停用或清理关联题目。",
                                    "code": "QUESTION_REFERENCED",
                                    "nodeId": node_id,
                                    "moduleCode": module_code,
                                    "questionRefs": question_refs,
                                },
                            )
                            return
                        conn.execute("DELETE FROM exam_module_configs WHERE node_id = ?", (node_id,))

                    conn.execute("DELETE FROM exam_structure_nodes WHERE id = ?", (node_id,))
                    if node_type == "exam_module" and module_code:
                        tombstoned_default = delete_legacy_exam_catalog_mirror(conn, module_code)

                self.send_json(
                    200,
                    {
                        "ok": True,
                        "deletedNode": {
                            "id": node_id,
                            "nodeType": clean_text(node_row["node_type"]),
                            "nodeKey": clean_text(node_row["node_key"]),
                            "name": clean_text(node_row["node_name"]),
                            "moduleCode": module_code,
                        },
                        "tombstonedDefault": tombstoned_default,
                    },
                )
                return

            if method == "GET" and path == "/api/admin/exam-catalog":
                if not self.require_admin():
                    return
                with db_conn() as conn:
                    payload = list_exam_catalog_from_structure(conn, enabled_only=False)
                self.send_json(200, payload)
                return

            if method == "POST" and path == "/api/admin/exam-catalog":
                if not self.require_admin():
                    return
                data = self.read_json()
                exam_code = normalize_exam_code(data.get("examCode") or data.get("exam_code"))
                industry_key = normalize_hierarchy_key(
                    data.get("programCode")
                    or data.get("program")
                    or data.get("industryKey")
                    or data.get("industry_key")
                )
                industry_name = clean_text(
                    data.get("programName") or data.get("industryName") or data.get("industry_name")
                )
                family_key = normalize_hierarchy_key(
                    data.get("licenseGroup")
                    or data.get("license_group")
                    or data.get("examFamilyKey")
                    or data.get("exam_family_key")
                )
                family_name = clean_text(
                    data.get("licenseGroupName") or data.get("examFamilyName") or data.get("exam_family_name")
                )
                trade_code = normalize_specialization_code(
                    data.get("specializationCode")
                    or data.get("specialization")
                    or data.get("tradeCode")
                    or data.get("trade_code")
                )
                exam_type = normalize_exam_type(
                    data.get("examTrack") or data.get("exam_track") or data.get("examType") or data.get("exam_type"),
                    "",
                )
                exam_name = clean_text(data.get("displayName") or data.get("examName") or data.get("exam_name"))
                name_zh = clean_text(data.get("nameZh") or data.get("name_zh"))
                description = clean_text(data.get("description"))
                category_key = normalize_category_key(data.get("categoryKey") or data.get("category_key"))
                is_enabled = to_bool_int(data.get("active") if "active" in data else data.get("isEnabled"), 1)
                sort_order = to_int(data.get("sortOrder"), 100)
                question_count = max(1, to_int(data.get("questionCount"), 100))
                exam_time_minutes = max(1, to_int(data.get("examTimeMinutes"), 180))
                practice_enabled = to_bool_int(
                    data.get("practiceEnabled") if "practiceEnabled" in data else data.get("practice_enabled"),
                    1,
                )
                mock_enabled = to_bool_int(
                    data.get("mockEnabled") if "mockEnabled" in data else data.get("mock_enabled"),
                    1,
                )
                included_exam_codes = normalize_exam_code_list(
                    data.get("includedExamCodes") if "includedExamCodes" in data else data.get("included_exam_codes")
                )

                if not industry_key:
                    self.send_json(400, {"error": "industry_key 必填"})
                    return
                if not is_valid_hierarchy_key(industry_key):
                    self.send_json(400, {"error": "industry_key 非法"})
                    return
                if not family_key:
                    self.send_json(400, {"error": "exam_family_key 必填"})
                    return
                if not is_valid_hierarchy_key(family_key):
                    self.send_json(400, {"error": "exam_family_key 非法"})
                    return
                if not exam_type:
                    self.send_json(400, {"error": "exam_type 必填"})
                    return
                if not is_valid_exam_type(exam_type):
                    self.send_json(400, {"error": "exam_type 必须为 law_business 或 trade"})
                    return
                if exam_type == "law_business":
                    trade_code = ""
                else:
                    trade_code = normalize_sub_item_key_for_structure(industry_key, family_key, trade_code)
                if exam_type == "trade" and not trade_code:
                    self.send_json(400, {"error": "trade_code 必填（技术考试）"})
                    return
                if exam_type == "trade" and not is_valid_trade_code(trade_code):
                    self.send_json(400, {"error": "trade_code 非法"})
                    return
                if not exam_code:
                    exam_code = derive_exam_code_from_structure(family_key, trade_code, exam_type)
                if not is_valid_exam_code(exam_code):
                    self.send_json(400, {"error": "exam_code 仅支持小写字母/数字/下划线，且必须以字母开头"})
                    return
                if not industry_name:
                    self.send_json(400, {"error": "industry_name 必填"})
                    return
                if not family_name:
                    self.send_json(400, {"error": "exam_family_name 必填"})
                    return
                if not exam_name:
                    self.send_json(400, {"error": "exam_name 必填"})
                    return
                if len(industry_name) < 2 or len(family_name) < 2 or len(exam_name) < 2:
                    self.send_json(400, {"error": "行业/考试族/考试名称至少2个字符"})
                    return
                if not is_valid_category_key(category_key):
                    self.send_json(400, {"error": "category_key 非法"})
                    return

                with db_conn() as conn:
                    ensure_exam_structure_v1_tables(conn)
                    ensure_exam_structure_v1_backfill(conn)
                    category = conn.execute("SELECT key FROM categories WHERE key = ?", (category_key,)).fetchone()
                    if not category:
                        self.send_json(400, {"error": "分类不存在"})
                        return
                    existed_node_id = get_structure_module_node_id(conn, exam_code)
                    if existed_node_id is not None:
                        if exam_type == "law_business":
                            self.send_json(
                                409,
                                {
                                    "ok": False,
                                    "code": "ALREADY_EXISTS",
                                    "message": "该法律考试结构已存在，请直接使用现有项",
                                    "existing_exam_code": exam_code,
                                },
                            )
                            return
                        self.send_json(400, {"error": "exam_code 已存在"})
                        return

                    now = now_iso()
                    program_node_id = ensure_exam_structure_node(
                        conn,
                        parent_id=None,
                        node_type="program",
                        node_key=industry_key,
                        node_name=industry_name,
                        is_enabled=1,
                        sort_order=100,
                    )
                    normalized_trade_code = ""
                    parent_node_id = program_node_id
                    if exam_type == "trade":
                        normalized_trade_code = normalize_sub_item_key_for_structure(
                            industry_key, family_key, trade_code
                        )
                        sub_item_name = derive_sub_item_name_for_structure(
                            family_name, normalized_trade_code, normalized_trade_code, exam_name
                        )
                        parent_node_id = ensure_exam_structure_node(
                            conn,
                            parent_id=program_node_id,
                            node_type="sub_item",
                            node_key=normalized_trade_code,
                            node_name=sub_item_name,
                            is_enabled=1,
                            sort_order=sort_order,
                        )

                    module_node_id = ensure_exam_structure_node(
                        conn,
                        parent_id=parent_node_id,
                        node_type="exam_module",
                        node_key=exam_code,
                        node_name=exam_name,
                        is_enabled=is_enabled,
                        sort_order=sort_order,
                    )
                    conn.execute(
                        """
                        INSERT INTO exam_module_configs(
                          node_id, module_code, category_key, question_count, exam_time_minutes, created_at, updated_at
                        )
                        VALUES(?,?,?,?,?,?,?)
                        ON CONFLICT(node_id) DO UPDATE SET
                          module_code=excluded.module_code,
                          category_key=excluded.category_key,
                          question_count=excluded.question_count,
                          exam_time_minutes=excluded.exam_time_minutes,
                          updated_at=excluded.updated_at
                        """,
                        (
                            module_node_id,
                            exam_code,
                            category_key,
                            question_count,
                            exam_time_minutes,
                            now,
                            now,
                        ),
                    )
                    sync_legacy_exam_catalog_mirror(
                        conn,
                        exam_code=exam_code,
                        industry_key=industry_key,
                        industry_name=industry_name,
                        exam_family_key=family_key,
                        exam_family_name=family_name,
                        trade_code=normalized_trade_code,
                        exam_type=exam_type,
                        exam_name=exam_name,
                        category_key=category_key,
                        is_enabled=is_enabled,
                        sort_order=sort_order,
                        question_count=question_count,
                        exam_time_minutes=exam_time_minutes,
                    )
                    conn.execute(
                        """
                        UPDATE exam_catalog
                        SET name_zh = ?, description = ?, updated_at = ?
                        WHERE exam_code = ?
                        """,
                        (name_zh, description, now, exam_code),
                    )
                    conn.execute(
                        """
                        UPDATE exam_configs
                        SET practice_enabled = ?,
                            mock_enabled = ?,
                            included_exam_codes = ?,
                            updated_at = ?
                        WHERE exam_code = ?
                        """,
                        (
                            practice_enabled,
                            mock_enabled,
                            dump_exam_code_list(included_exam_codes),
                            now,
                            exam_code,
                        ),
                    )
                    ensure_exam_categories_defaults(conn)
                    payload = get_exam_catalog_payload_by_code_from_structure(conn, exam_code)
                if not payload:
                    self.send_json(500, {"error": "考试创建成功但读取结果失败"})
                    return
                self.send_json(200, {"ok": True, "exam": payload})
                return

            if method == "PUT" and path.startswith("/api/admin/exam-catalog/"):
                if not self.require_admin():
                    return
                exam_code = normalize_exam_code(clean_text(path.rsplit("/", 1)[-1]))
                if not is_valid_exam_code(exam_code):
                    self.send_json(400, {"error": "exam_code 非法"})
                    return

                data = self.read_json()
                with db_conn() as conn:
                    ensure_exam_structure_v1_tables(conn)
                    ensure_exam_structure_v1_backfill(conn)
                    current = get_exam_catalog_payload_by_code_from_structure(conn, exam_code)
                    if not current:
                        self.send_json(404, {"error": "exam_code 不存在"})
                        return

                    next_industry_key = normalize_hierarchy_key(
                        data.get("programCode")
                        or data.get("program")
                        or data.get("industryKey")
                        or data.get("industry_key")
                        or current["industryKey"]
                    )
                    next_industry_name = clean_text(
                        data.get("programName")
                        or data.get("industryName")
                        or data.get("industry_name")
                        or current["industryName"]
                    )
                    next_family_key = normalize_hierarchy_key(
                        data.get("licenseGroup")
                        or data.get("license_group")
                        or data.get("examFamilyKey")
                        or data.get("exam_family_key")
                        or current["examFamilyKey"]
                    )
                    next_family_name = clean_text(
                        data.get("licenseGroupName")
                        or data.get("examFamilyName")
                        or data.get("exam_family_name")
                        or current["examFamilyName"]
                    )
                    next_trade_code = normalize_specialization_code(
                        data.get("specializationCode")
                        or data.get("specialization")
                        or data.get("tradeCode")
                        or data.get("trade_code")
                        or current["tradeCode"]
                    )
                    next_exam_type = normalize_exam_type(
                        data.get("examTrack")
                        or data.get("exam_track")
                        or data.get("examType")
                        or data.get("exam_type")
                        or current["examType"],
                        "trade",
                    )
                    next_exam_name = clean_text(
                        data.get("displayName") or data.get("examName") or data.get("exam_name") or current["examName"]
                    )
                    next_name_zh = clean_text(data.get("nameZh") if "nameZh" in data else data.get("name_zh"))
                    if "nameZh" not in data and "name_zh" not in data:
                        next_name_zh = clean_text(current.get("nameZh"))
                    next_description = clean_text(data.get("description") if "description" in data else current.get("description"))
                    next_category_key = normalize_category_key(
                        data.get("categoryKey") or data.get("category_key") or current["categoryKey"]
                    )
                    next_is_enabled = (
                        to_bool_int(data.get("active") if "active" in data else data.get("isEnabled"), 1 if current["isEnabled"] else 0)
                        if ("isEnabled" in data or "active" in data)
                        else (1 if current["isEnabled"] else 0)
                    )
                    next_sort_order = (
                        to_int(data.get("sortOrder"), int(current["sortOrder"]))
                        if "sortOrder" in data
                        else int(current["sortOrder"])
                    )
                    next_question_count = (
                        max(1, to_int(data.get("questionCount"), int(current["questionCount"])))
                        if "questionCount" in data
                        else int(current["questionCount"])
                    )
                    next_exam_time_minutes = (
                        max(1, to_int(data.get("examTimeMinutes"), int(current["examTimeMinutes"])))
                        if "examTimeMinutes" in data
                        else int(current["examTimeMinutes"])
                    )
                    next_practice_enabled = (
                        to_bool_int(data.get("practiceEnabled"), 1 if current.get("practiceEnabled") else 0)
                        if "practiceEnabled" in data
                        else (1 if current.get("practiceEnabled") else 0)
                    )
                    next_mock_enabled = (
                        to_bool_int(data.get("mockEnabled"), 1 if current.get("mockEnabled") else 0)
                        if "mockEnabled" in data
                        else (1 if current.get("mockEnabled") else 0)
                    )
                    next_included_exam_codes = (
                        normalize_exam_code_list(data.get("includedExamCodes"))
                        if "includedExamCodes" in data
                        else normalize_exam_code_list(current.get("includedExamCodes"))
                    )

                    if not is_valid_hierarchy_key(next_industry_key):
                        self.send_json(400, {"error": "industry_key 非法"})
                        return
                    if not is_valid_hierarchy_key(next_family_key):
                        self.send_json(400, {"error": "exam_family_key 非法"})
                        return
                    if next_exam_type == "law_business":
                        next_trade_code = ""
                    else:
                        next_trade_code = normalize_sub_item_key_for_structure(
                            next_industry_key, next_family_key, next_trade_code
                        )
                    if next_exam_type == "trade" and not is_valid_trade_code(next_trade_code):
                        self.send_json(400, {"error": "trade_code 非法"})
                        return
                    if not is_valid_exam_type(next_exam_type):
                        self.send_json(400, {"error": "exam_type 必须为 law_business 或 trade"})
                        return
                    if len(next_industry_name) < 2 or len(next_family_name) < 2 or len(next_exam_name) < 2:
                        self.send_json(400, {"error": "行业/考试族/考试名称至少2个字符"})
                        return
                    if not is_valid_category_key(next_category_key):
                        self.send_json(400, {"error": "category_key 非法"})
                        return
                    category = conn.execute("SELECT key FROM categories WHERE key = ?", (next_category_key,)).fetchone()
                    if not category:
                        self.send_json(400, {"error": "分类不存在"})
                        return

                    module_node_id = get_structure_module_node_id(conn, exam_code)
                    if module_node_id is None:
                        self.send_json(404, {"error": "exam_code 不存在"})
                        return
                    now = now_iso()
                    program_node_id = ensure_exam_structure_node(
                        conn,
                        parent_id=None,
                        node_type="program",
                        node_key=next_industry_key,
                        node_name=next_industry_name,
                        is_enabled=1,
                        sort_order=100,
                    )
                    parent_node_id = program_node_id
                    if next_exam_type == "trade":
                        sub_item_name = derive_sub_item_name_for_structure(
                            next_family_name, next_trade_code, next_trade_code, next_exam_name
                        )
                        parent_node_id = ensure_exam_structure_node(
                            conn,
                            parent_id=program_node_id,
                            node_type="sub_item",
                            node_key=next_trade_code,
                            node_name=sub_item_name,
                            is_enabled=1,
                            sort_order=next_sort_order,
                        )

                    conn.execute(
                        """
                        UPDATE exam_structure_nodes
                        SET parent_id=?, node_key=?, node_name=?, is_enabled=?, sort_order=?, updated_at=?
                        WHERE id=?
                        """,
                        (
                            parent_node_id,
                            exam_code,
                            next_exam_name,
                            next_is_enabled,
                            next_sort_order,
                            now,
                            module_node_id,
                        ),
                    )
                    conn.execute(
                        """
                        UPDATE exam_module_configs
                        SET module_code=?, category_key=?, question_count=?, exam_time_minutes=?, updated_at=?
                        WHERE node_id=?
                        """,
                        (
                            exam_code,
                            next_category_key,
                            next_question_count,
                            next_exam_time_minutes,
                            now,
                            module_node_id,
                        ),
                    )
                    sync_legacy_exam_catalog_mirror(
                        conn,
                        exam_code=exam_code,
                        industry_key=next_industry_key,
                        industry_name=next_industry_name,
                        exam_family_key=next_family_key,
                        exam_family_name=next_family_name,
                        trade_code=next_trade_code,
                        exam_type=next_exam_type,
                        exam_name=next_exam_name,
                        category_key=next_category_key,
                        is_enabled=next_is_enabled,
                        sort_order=next_sort_order,
                        question_count=next_question_count,
                        exam_time_minutes=next_exam_time_minutes,
                    )
                    conn.execute(
                        """
                        UPDATE exam_catalog
                        SET name_zh = ?, description = ?, updated_at = ?
                        WHERE exam_code = ?
                        """,
                        (next_name_zh, next_description, now, exam_code),
                    )
                    conn.execute(
                        """
                        UPDATE exam_configs
                        SET practice_enabled = ?,
                            mock_enabled = ?,
                            included_exam_codes = ?,
                            updated_at = ?
                        WHERE exam_code = ?
                        """,
                        (
                            next_practice_enabled,
                            next_mock_enabled,
                            dump_exam_code_list(next_included_exam_codes),
                            now,
                            exam_code,
                        ),
                    )
                    ensure_exam_categories_defaults(conn)
                    payload = get_exam_catalog_payload_by_code_from_structure(conn, exam_code)
                if not payload:
                    self.send_json(500, {"error": "考试更新成功但读取结果失败"})
                    return
                self.send_json(200, {"ok": True, "exam": payload})
                return

            if method == "DELETE" and path.startswith("/api/admin/exam-catalog/"):
                if not self.require_admin():
                    return
                exam_code = normalize_exam_code(clean_text(path.rsplit("/", 1)[-1]))
                if not is_valid_exam_code(exam_code):
                    self.send_json(400, {"error": "exam_code 非法"})
                    return
                with db_conn() as conn:
                    ensure_exam_structure_v1_tables(conn)
                    ensure_exam_structure_v1_backfill(conn)
                    payload = get_exam_catalog_payload_by_code_from_structure(conn, exam_code)
                    if not payload:
                        self.send_json(404, {"error": "exam_code 不存在"})
                        return
                    ref_row = conn.execute(
                        """
                        SELECT COUNT(1) AS cnt
                        FROM questions
                        WHERE LOWER(TRIM(COALESCE(NULLIF(exam_code,''), NULLIF(exam_id,''), ''))) = ?
                          AND COALESCE(NULLIF(LOWER(TRIM(COALESCE(question_status, 'active'))), ''), 'active') IN ('active','inactive')
                        """,
                        (exam_code,),
                    ).fetchone()
                    question_refs = int(ref_row["cnt"] or 0) if ref_row else 0
                    if question_refs > 0:
                        self.send_json(
                            409,
                            {
                                "error": "该考试项已被题目引用，无法删除。请先清理题目或改为停用。",
                                "examCode": exam_code,
                                "questionRefs": question_refs,
                            },
                        )
                        return
                    module_node_id = get_structure_module_node_id(conn, exam_code)
                    if module_node_id is None:
                        self.send_json(404, {"error": "exam_code 不存在"})
                        return
                    module_row = conn.execute(
                        "SELECT id, parent_id FROM exam_structure_nodes WHERE id = ?",
                        (module_node_id,),
                    ).fetchone()
                    parent_id = int(module_row["parent_id"]) if module_row and module_row["parent_id"] is not None else None

                    conn.execute("DELETE FROM exam_module_configs WHERE module_code = ?", (exam_code,))
                    conn.execute("DELETE FROM exam_structure_nodes WHERE id = ?", (module_node_id,))
                    if parent_id is not None:
                        parent_row = conn.execute(
                            "SELECT id, parent_id, node_type FROM exam_structure_nodes WHERE id = ?",
                            (parent_id,),
                        ).fetchone()
                        if parent_row and clean_text(parent_row["node_type"]) == "sub_item":
                            child_row = conn.execute(
                                "SELECT COUNT(1) AS cnt FROM exam_structure_nodes WHERE parent_id = ?",
                                (parent_id,),
                            ).fetchone()
                            if int(child_row["cnt"] or 0) == 0:
                                conn.execute("DELETE FROM exam_structure_nodes WHERE id = ?", (parent_id,))

                    tombstoned_default = delete_legacy_exam_catalog_mirror(conn, exam_code)
                self.send_json(
                    200,
                    {
                        "ok": True,
                        "deletedExamCode": exam_code,
                        "deletedExamName": payload["examName"],
                        "questionRefs": 0,
                        "tombstonedDefault": tombstoned_default,
                    },
                )
                return

            if method == "GET" and path == "/api/admin/users":
                if not self.require_admin():
                    return
                include_archived = str((qs.get("include_archived") or [""])[0]).strip().lower() in {"1", "true", "yes", "y"}
                with db_conn() as conn:
                    ensure_user_membership_columns(conn)
                    ensure_all_user_entitlements(conn)
                    ensure_user_category_entitlements(conn)
                    rows = conn.execute("SELECT id FROM users ORDER BY id").fetchall()
                    users = []
                    for row in rows:
                        payload = self.fetch_user_payload(conn, int(row["id"]))
                        if payload:
                            if not include_archived and normalize_account_status(payload.get("accountStatus"), "active") == "suspended":
                                continue
                            users.append(payload)
                self.send_json(200, users)
                return

            if method == "DELETE" and path.startswith("/api/admin/users/"):
                if not self.require_admin():
                    return
                user_id = path.rsplit("/", 1)[-1]
                if not user_id.isdigit():
                    self.send_json(400, {"error": "非法用户ID"})
                    return
                uid = int(user_id)
                with db_conn() as conn:
                    ensure_user_membership_columns(conn)
                    row = conn.execute(
                        "SELECT id, name, email, plan, membership_tier, account_status FROM users WHERE id = ?",
                        (uid,),
                    ).fetchone()
                    if not row:
                        self.send_json(404, {"error": "用户不存在"})
                        return
                    _protected = {u["email"] for u in DEFAULT_USERS}
                    if row["email"] in _protected:
                        self.send_json(403, {"error": "系统默认账号不可删除，重启后会自动重建。"})
                        return
                    conn.execute("DELETE FROM sessions WHERE user_id = ?", (uid,))
                    conn.execute("DELETE FROM progress_summary WHERE user_id = ?", (uid,))
                    conn.execute("DELETE FROM progress_events WHERE user_id = ?", (uid,))
                    conn.execute("DELETE FROM wrong_book WHERE user_id = ?", (uid,))
                    conn.execute("DELETE FROM licensing_progress WHERE user_id = ?", (uid,))
                    conn.execute("DELETE FROM user_category_entitlements WHERE user_id = ?", (uid,))
                    conn.execute("DELETE FROM user_entitlements WHERE user_id = ?", (uid,))
                    conn.execute("DELETE FROM users WHERE id = ?", (uid,))
                self.send_json(
                    200,
                    {
                        "ok": True,
                        "deletedUser": {
                            "id": uid,
                            "name": row["name"],
                            "email": row["email"],
                            "plan": row["plan"],
                            "membershipTier": normalize_membership_tier(
                                row["membership_tier"],
                                infer_membership_tier(plan=row["plan"]),
                            ),
                            "accountStatus": normalize_account_status(row["account_status"], "active"),
                        },
                    },
                )
                return

            if method == "PUT" and path.startswith("/api/admin/users/"):
                if not self.require_admin():
                    return
                user_id = path.rsplit("/", 1)[-1]
                if not user_id.isdigit():
                    self.send_json(400, {"error": "非法用户ID"})
                    return
                data = self.read_json()
                ent_payload = data.get("entitlements") if isinstance(data.get("entitlements"), dict) else {}
                content_payload = (
                    data.get("contentPermissions")
                    if isinstance(data.get("contentPermissions"), dict)
                    else data.get("content_permissions")
                    if isinstance(data.get("content_permissions"), dict)
                    else {}
                )
                category_payload = (
                    data.get("categoryEntitlements") if isinstance(data.get("categoryEntitlements"), dict) else {}
                )
                category_expiry_payload = (
                    data.get("categoryExpiresAt") if isinstance(data.get("categoryExpiresAt"), dict) else {}
                )
                uid = int(user_id)

                with db_conn() as conn:
                    ensure_user_profile_columns(conn)
                    ensure_all_user_entitlements(conn)
                    ensure_user_category_entitlements(conn)

                    user_row = conn.execute(
                        """
                        SELECT
                          id,
                          plan,
                          membership_tier,
                          bilingual_enabled,
                          explanation_enabled,
                          memory_tips_enabled,
                          account_status,
                          COALESCE(membership_version, 1) AS membership_version,
                          membership_updated_at,
                          created_at,
                          assigned_exam_codes,
                          assigned_module_tags
                        FROM users
                        WHERE id = ?
                        """,
                        (uid,),
                    ).fetchone()
                    if not user_row:
                        self.send_json(404, {"error": "用户不存在"})
                        return
                    _protected_emails = {u["email"] for u in DEFAULT_USERS}
                    _req_email = conn.execute("SELECT email FROM users WHERE id=?", (uid,)).fetchone()
                    if _req_email and _req_email["email"] in _protected_emails:
                        requested_status = normalize_account_status(data.get("accountStatus"), "active")
                        if requested_status == "suspended":
                            self.send_json(403, {"error": "系统默认账号不可归档，重启后会自动重建。"})
                            return

                    current_membership_tier = normalize_membership_tier(
                        user_row["membership_tier"],
                        infer_membership_tier(plan=user_row["plan"]),
                    )
                    requested_plan = str(data.get("plan", "")).strip().lower()
                    raw_tier_value = data.get("membershipTier")
                    if raw_tier_value is None:
                        raw_tier_value = data.get("membership_tier")
                    requested_tier_text = str(raw_tier_value or "").strip()
                    has_explicit_tier_input = bool(requested_tier_text)
                    requested_membership_tier = (
                        normalize_membership_tier(requested_tier_text, None)
                        if has_explicit_tier_input
                        else ""
                    )
                    if has_explicit_tier_input and not requested_membership_tier:
                        self.send_json(400, {"error": "membershipTier 非法"})
                        return
                    if requested_membership_tier:
                        next_membership_tier = requested_membership_tier
                    elif requested_plan in {"free", "paid"}:
                        if requested_plan == "free":
                            next_membership_tier = "free"
                        elif current_membership_tier in PAID_MEMBERSHIP_TIERS:
                            next_membership_tier = current_membership_tier
                        else:
                            next_membership_tier = "basic_399"
                    else:
                        next_membership_tier = current_membership_tier
                    plan = plan_from_membership_tier(next_membership_tier)
                    requested_account_status = normalize_account_status(
                        data.get("accountStatus"), normalize_account_status(user_row["account_status"], "active")
                    )
                    has_assigned_exam_codes_input = (
                        "assignedExamCodes" in data or "assigned_exam_codes" in data
                    )
                    has_assigned_module_tags_input = (
                        "assignedModuleTags" in data or "assigned_module_tags" in data
                    )
                    current_assigned_exam_codes = normalize_assignment_exam_code_list(
                        user_row["assigned_exam_codes"]
                    )
                    current_assigned_module_tags = normalize_assignment_exam_code_list(
                        user_row["assigned_module_tags"]
                    )
                    next_assigned_exam_codes = (
                        normalize_assignment_exam_code_list(
                            data.get("assignedExamCodes")
                            if "assignedExamCodes" in data
                            else data.get("assigned_exam_codes")
                        )
                        if has_assigned_exam_codes_input
                        else current_assigned_exam_codes
                    )
                    next_assigned_module_tags = (
                        normalize_assignment_exam_code_list(
                            data.get("assignedModuleTags")
                            if "assignedModuleTags" in data
                            else data.get("assigned_module_tags")
                        )
                        if has_assigned_module_tags_input
                        else current_assigned_module_tags
                    )
                    if not next_assigned_exam_codes and is_paid_membership_tier(next_membership_tier):
                        next_assigned_exam_codes = infer_assigned_exam_codes_for_user(
                            conn,
                            user_id=uid,
                            plan=plan,
                        )
                    licensing_progress_payload = (
                        data.get("licensingProgress")
                        if isinstance(data.get("licensingProgress"), dict)
                        else data.get("licensing_progress")
                        if isinstance(data.get("licensing_progress"), dict)
                        else None
                    )
                    has_progress_update = isinstance(licensing_progress_payload, dict)

                    ent_row = conn.execute(
                        """
                        SELECT b_license_access, c_license_access, bilingual_access, bilingual_expires_at, ai_access, ai_expires_at
                        FROM user_entitlements
                        WHERE user_id = ?
                        """,
                        (uid,),
                    ).fetchone()
                    category_rows = list_categories(conn, enabled_only=False)
                    category_keys = [row["key"] for row in category_rows]
                    current_category_active, current_category_details = get_user_category_entitlement_details(
                        conn, uid, plan=user_row["plan"]
                    )
                    current_category_ent = {
                        key: bool((current_category_details.get(key) or {}).get("hasAccess", current_category_active.get(key, False)))
                        for key in category_keys
                    }
                    current_category_exp = {
                        key: normalize_expires_at((current_category_details.get(key) or {}).get("expiresAt"))
                        for key in category_keys
                    }

                    default_b, default_c, default_bi, default_ai = entitlement_defaults_for_tier(current_membership_tier)
                    current_b = int(current_category_ent.get("b_license", int(ent_row["b_license_access"]) if ent_row else default_b))
                    current_c = int(current_category_ent.get("c_license", int(ent_row["c_license_access"]) if ent_row else default_c))
                    current_bi = int(ent_row["bilingual_access"]) if ent_row else default_bi
                    current_bi_expires = normalize_expires_at(ent_row["bilingual_expires_at"]) if ent_row else (
                        FAR_FUTURE_EXPIRES_AT if current_bi else None
                    )
                    current_ai = int(ent_row["ai_access"]) if ent_row else default_ai
                    current_ai_expires = normalize_expires_at(ent_row["ai_expires_at"]) if ent_row else (
                        FAR_FUTURE_EXPIRES_AT if current_ai else None
                    )
                    current_bilingual_override = normalize_optional_bool_override(
                        user_row["bilingual_enabled"] if "bilingual_enabled" in user_row.keys() else None
                    )
                    current_explanation_override = normalize_optional_bool_override(
                        user_row["explanation_enabled"] if "explanation_enabled" in user_row.keys() else None
                    )
                    current_memory_tips_override = normalize_optional_bool_override(
                        user_row["memory_tips_enabled"] if "memory_tips_enabled" in user_row.keys() else None
                    )
                    next_bilingual_override = current_bilingual_override
                    next_explanation_override = current_explanation_override
                    next_memory_tips_override = current_memory_tips_override

                    incoming_override_values = {
                        "bilingualEnabled": content_payload.get("bilingualEnabled")
                        if "bilingualEnabled" in content_payload
                        else data.get("bilingual_enabled")
                        if "bilingual_enabled" in data
                        else None,
                        "explanationEnabled": content_payload.get("explanationEnabled")
                        if "explanationEnabled" in content_payload
                        else data.get("explanation_enabled")
                        if "explanation_enabled" in data
                        else None,
                        "memoryTipsEnabled": content_payload.get("memoryTipsEnabled")
                        if "memoryTipsEnabled" in content_payload
                        else data.get("memory_tips_enabled")
                        if "memory_tips_enabled" in data
                        else None,
                    }
                    has_content_override_input = any(
                        key in content_payload or key in data
                        for key in (
                            "bilingualEnabled",
                            "explanationEnabled",
                            "memoryTipsEnabled",
                            "bilingual_enabled",
                            "explanation_enabled",
                            "memory_tips_enabled",
                        )
                    )
                    if has_content_override_input:
                        try:
                            next_bilingual_override = (
                                normalize_optional_bool_override(
                                    incoming_override_values["bilingualEnabled"],
                                    strict=True,
                                )
                                if ("bilingualEnabled" in content_payload or "bilingual_enabled" in data)
                                else current_bilingual_override
                            )
                            next_explanation_override = (
                                normalize_optional_bool_override(
                                    incoming_override_values["explanationEnabled"],
                                    strict=True,
                                )
                                if ("explanationEnabled" in content_payload or "explanation_enabled" in data)
                                else current_explanation_override
                            )
                            next_memory_tips_override = (
                                normalize_optional_bool_override(
                                    incoming_override_values["memoryTipsEnabled"],
                                    strict=True,
                                )
                                if ("memoryTipsEnabled" in content_payload or "memory_tips_enabled" in data)
                                else current_memory_tips_override
                            )
                        except ValueError:
                            self.send_json(400, {"error": "内容权限覆盖值非法"})
                            return

                    plan_changed = user_row["plan"] != plan
                    tier_changed = current_membership_tier != next_membership_tier
                    next_default_b, next_default_c, next_default_bi, next_default_ai = entitlement_defaults_for_tier(
                        next_membership_tier
                    )
                    has_entitlement_input = any(key in ent_payload for key in ENTITLEMENT_KEYS)
                    has_category_input = any(key in category_payload for key in category_keys)
                    has_legacy_category_input = any(key in ent_payload for key in ("bLicenseAccess", "cLicenseAccess"))
                    has_category_expiry_input = any(key in category_expiry_payload for key in category_keys)

                    next_category_ent = dict(current_category_ent)
                    next_category_exp = dict(current_category_exp)
                    if has_category_input:
                        for key in category_keys:
                            if key in category_payload:
                                next_category_ent[key] = bool(to_bool_int(category_payload.get(key), int(current_category_ent.get(key, False))))
                    elif has_legacy_category_input:
                        if "bLicenseAccess" in ent_payload:
                            next_category_ent["b_license"] = bool(to_bool_int(ent_payload.get("bLicenseAccess"), current_b))
                        if "cLicenseAccess" in ent_payload:
                            next_category_ent["c_license"] = bool(to_bool_int(ent_payload.get("cLicenseAccess"), current_c))
                    elif plan_changed or tier_changed:
                        default_access = is_paid_membership_tier(next_membership_tier)
                        next_category_ent = {key: default_access for key in category_keys}
                        next_category_exp = {
                            key: (FAR_FUTURE_EXPIRES_AT if default_access else None) for key in category_keys
                        }

                    if has_category_expiry_input:
                        for key in category_keys:
                            if key not in category_expiry_payload:
                                continue
                            raw_expires = category_expiry_payload.get(key)
                            normalized_expires = normalize_expires_at(raw_expires)
                            if str(raw_expires or "").strip() and not normalized_expires:
                                self.send_json(400, {"error": f"分类 {key} 到期时间格式无效"})
                                return
                            next_category_exp[key] = normalized_expires

                    if "bilingualAccess" in ent_payload:
                        next_bi = to_bool_int(ent_payload.get("bilingualAccess"), current_bi)
                    elif (plan_changed or tier_changed) and not (has_category_input or has_legacy_category_input):
                        next_bi = next_default_bi
                    else:
                        next_bi = current_bi

                    if "bilingualExpiresAt" in ent_payload:
                        raw_bi_expires = ent_payload.get("bilingualExpiresAt")
                        next_bi_expires = normalize_expires_at(raw_bi_expires)
                        if str(raw_bi_expires or "").strip() and not next_bi_expires:
                            self.send_json(400, {"error": "双语到期时间格式无效"})
                            return
                    elif (plan_changed or tier_changed) and not (has_category_input or has_legacy_category_input):
                        next_bi_expires = FAR_FUTURE_EXPIRES_AT if next_bi else None
                    else:
                        next_bi_expires = current_bi_expires

                    if "aiAccess" in ent_payload:
                        next_ai = to_bool_int(ent_payload.get("aiAccess"), current_ai)
                    elif (plan_changed or tier_changed) and not (has_category_input or has_legacy_category_input):
                        next_ai = next_default_ai
                    else:
                        next_ai = current_ai

                    if "aiExpiresAt" in ent_payload:
                        raw_ai_expires = ent_payload.get("aiExpiresAt")
                        next_ai_expires = normalize_expires_at(raw_ai_expires)
                        if str(raw_ai_expires or "").strip() and not next_ai_expires:
                            self.send_json(400, {"error": "AI 到期时间格式无效"})
                            return
                    elif (plan_changed or tier_changed) and not (has_category_input or has_legacy_category_input):
                        next_ai_expires = FAR_FUTURE_EXPIRES_AT if next_ai else None
                    else:
                        next_ai_expires = current_ai_expires

                    for key in category_keys:
                        if bool(next_category_ent.get(key, False)):
                            if not normalize_expires_at(next_category_exp.get(key)):
                                next_category_exp[key] = FAR_FUTURE_EXPIRES_AT
                        else:
                            next_category_exp[key] = None

                    if next_bi:
                        if not normalize_expires_at(next_bi_expires):
                            next_bi_expires = FAR_FUTURE_EXPIRES_AT
                    else:
                        next_bi_expires = None

                    if next_ai:
                        if not normalize_expires_at(next_ai_expires):
                            next_ai_expires = FAR_FUTURE_EXPIRES_AT
                        if not next_bi:
                            next_bi = 1
                            next_bi_expires = normalize_expires_at(next_bi_expires) or FAR_FUTURE_EXPIRES_AT
                    else:
                        next_ai_expires = None

                    if has_explicit_tier_input:
                        if next_membership_tier == "free":
                            next_ai = 0
                            next_ai_expires = None
                            next_bi = 0
                            next_bi_expires = None
                        elif next_membership_tier == "basic_399":
                            if "aiAccess" not in ent_payload:
                                next_ai = 0
                                next_ai_expires = None
                            if "bilingualAccess" not in ent_payload:
                                next_bi = 0
                                next_bi_expires = None
                        elif next_membership_tier == "pro_599":
                            if "aiAccess" not in ent_payload:
                                next_ai = 0
                                next_ai_expires = None
                            if "bilingualAccess" not in ent_payload:
                                next_bi = 1
                                next_bi_expires = normalize_expires_at(next_bi_expires) or FAR_FUTURE_EXPIRES_AT
                        elif next_membership_tier == "ai_999":
                            next_ai = 1
                            next_ai_expires = normalize_expires_at(next_ai_expires) or FAR_FUTURE_EXPIRES_AT
                            next_bi = 1
                            next_bi_expires = normalize_expires_at(next_bi_expires) or FAR_FUTURE_EXPIRES_AT
                    else:
                        next_membership_tier = infer_membership_tier(
                            plan=plan,
                            bilingual_access=next_bi,
                            ai_access=next_ai,
                            current_tier=next_membership_tier,
                        )
                        plan = plan_from_membership_tier(next_membership_tier)
                        plan_changed = user_row["plan"] != plan

                    next_b = int(next_category_ent.get("b_license", bool(next_default_b)))
                    next_c = int(next_category_ent.get("c_license", bool(next_default_c)))

                    category_changed = any(
                        (
                            bool(current_category_ent.get(key, False)) != bool(next_category_ent.get(key, False))
                            or normalize_expires_at(current_category_exp.get(key)) != normalize_expires_at(next_category_exp.get(key))
                        )
                        for key in category_keys
                    )
                    ent_changed = (
                        category_changed
                        or (current_bi != next_bi)
                        or (normalize_expires_at(current_bi_expires) != normalize_expires_at(next_bi_expires))
                        or (current_ai != next_ai)
                        or (normalize_expires_at(current_ai_expires) != normalize_expires_at(next_ai_expires))
                    )
                    content_permissions_changed = (
                        current_bilingual_override != next_bilingual_override
                        or current_explanation_override != next_explanation_override
                        or current_memory_tips_override != next_memory_tips_override
                    )
                    tier_changed = current_membership_tier != next_membership_tier
                    account_status_changed = normalize_account_status(user_row["account_status"], "active") != requested_account_status
                    assigned_changed = (
                        normalize_assignment_exam_code_list(current_assigned_exam_codes)
                        != normalize_assignment_exam_code_list(next_assigned_exam_codes)
                        or normalize_assignment_exam_code_list(current_assigned_module_tags)
                        != normalize_assignment_exam_code_list(next_assigned_module_tags)
                    )
                    changed = (
                        plan_changed
                        or tier_changed
                        or ent_changed
                        or content_permissions_changed
                        or account_status_changed
                        or assigned_changed
                        or has_progress_update
                    )

                    version = int(user_row["membership_version"] or 1)
                    updated_at = user_row["membership_updated_at"] or user_row["created_at"] or now_iso()

                    if changed:
                        version += 1
                        updated_at = now_iso()

                    conn.execute(
                        """
                        UPDATE users
                        SET plan = ?, membership_tier = ?, bilingual_enabled = ?, explanation_enabled = ?, memory_tips_enabled = ?,
                            account_status = ?, membership_version = ?, membership_updated_at = ?,
                            assigned_exam_codes = ?, assigned_module_tags = ?
                        WHERE id = ?
                        """,
                        (
                            plan,
                            next_membership_tier,
                            next_bilingual_override,
                            next_explanation_override,
                            next_memory_tips_override,
                            requested_account_status,
                            version,
                            updated_at,
                            dump_assignment_exam_code_list(next_assigned_exam_codes),
                            dump_assignment_exam_code_list(next_assigned_module_tags),
                            uid,
                        ),
                    )
                    conn.execute(
                        """
                        INSERT INTO user_entitlements(
                          user_id, b_license_access, c_license_access, bilingual_access, bilingual_expires_at, ai_access, ai_expires_at, updated_at
                        )
                        VALUES(?,?,?,?,?,?,?,?)
                        ON CONFLICT(user_id) DO UPDATE SET
                          b_license_access = excluded.b_license_access,
                          c_license_access = excluded.c_license_access,
                          bilingual_access = excluded.bilingual_access,
                          bilingual_expires_at = excluded.bilingual_expires_at,
                          ai_access = excluded.ai_access,
                          ai_expires_at = excluded.ai_expires_at,
                          updated_at = excluded.updated_at
                        """,
                        (uid, next_b, next_c, next_bi, next_bi_expires, next_ai, next_ai_expires, updated_at),
                    )
                    if category_keys:
                        conn.executemany(
                            """
                            INSERT INTO user_category_entitlements(user_id, category_key, has_access, expires_at, updated_at)
                            VALUES(?,?,?,?,?)
                            ON CONFLICT(user_id, category_key) DO UPDATE SET
                              has_access=excluded.has_access,
                              expires_at=excluded.expires_at,
                              updated_at=excluded.updated_at
                            """,
                            [
                                (
                                    uid,
                                    key,
                                    1 if bool(next_category_ent.get(key, False)) else 0,
                                    normalize_expires_at(next_category_exp.get(key)),
                                    updated_at,
                                )
                                for key in category_keys
                            ],
                        )

                    if has_progress_update and licensing_progress_payload is not None:
                        upsert_user_licensing_progress(
                            conn,
                            user_id=uid,
                            payload=licensing_progress_payload,
                            updated_by_admin=True,
                        )

                    user_payload = self.fetch_user_payload(conn, uid)

                self.send_json(200, {"ok": True, "changed": changed, "user": user_payload})
                return

            if method == "GET" and path == "/api/admin/questions":
                if not self.require_admin():
                    return

                category_code = clean_text(
                    ((qs.get("category_code") or qs.get("category_key") or [""])[0])
                ).upper()
                exam_code = normalize_exam_code((qs.get("exam_code") or [""])[0])
                status_raw = clean_text((qs.get("question_status") or [""])[0]).lower()
                include_deleted = str((qs.get("include_deleted") or [""])[0]).strip().lower() in {
                    "1",
                    "true",
                    "yes",
                    "y",
                }
                keyword = clean_text((qs.get("keyword") or [""])[0])
                page = max(1, to_int((qs.get("page") or ["1"])[0], 1))
                page_size = to_int((qs.get("page_size") or ["20"])[0], 20)
                page_size = max(1, min(page_size, 100))
                offset = (page - 1) * page_size

                if status_raw and status_raw != "all" and status_raw not in QUESTION_STATUS_VALUES:
                    self.send_json(400, {"error": "question_status 必须为 active/inactive/deleted/all"})
                    return

                where_clauses = ["1=1"]
                params: list = []
                if category_code:
                    where_clauses.append(
                        "UPPER(TRIM(COALESCE(NULLIF(q.category_code,''), NULLIF(q.question_category,''), ''))) = ?"
                    )
                    params.append(category_code)
                if exam_code:
                    where_clauses.append(
                        "LOWER(TRIM(COALESCE(NULLIF(q.exam_code,''), NULLIF(q.exam_id,''), ''))) = ?"
                    )
                    params.append(exam_code)
                if status_raw and status_raw != "all":
                    where_clauses.append("LOWER(TRIM(COALESCE(q.question_status,'active'))) = ?")
                    params.append(status_raw)
                elif not include_deleted:
                    where_clauses.append(
                        "COALESCE(NULLIF(LOWER(TRIM(COALESCE(q.question_status,'active'))), ''), 'active') IN ('active','inactive')"
                    )
                if keyword:
                    where_clauses.append(
                        """
                        (
                          LOWER(COALESCE(q.question_id, '')) LIKE ?
                          OR LOWER(COALESCE(q.exam_id, '')) LIKE ?
                          OR LOWER(COALESCE(q.exam_code, '')) LIKE ?
                          OR LOWER(COALESCE(q.prompt, '')) LIKE ?
                          OR LOWER(COALESCE(q.option_a, '')) LIKE ?
                          OR LOWER(COALESCE(q.option_b, '')) LIKE ?
                          OR LOWER(COALESCE(q.option_c, '')) LIKE ?
                          OR LOWER(COALESCE(q.option_d, '')) LIKE ?
                        )
                        """
                    )
                    keyword_like = f"%{keyword.lower()}%"
                    params.extend([keyword_like] * 8)

                where_sql = " AND ".join(where_clauses)
                bank = self.get_bank()
                with db_conn() as conn:
                    ensure_questions_table(conn)
                    sync_questions_table_from_bank(conn, bank)
                    total_row = conn.execute(
                        f"SELECT COUNT(1) AS cnt FROM questions q WHERE {where_sql}",
                        params,
                    ).fetchone()
                    total = int(total_row["cnt"] or 0) if total_row else 0
                    rows = conn.execute(
                        f"""
                        SELECT
                          q.question_id,
                          q.exam_id,
                          COALESCE(NULLIF(TRIM(q.exam_code), ''), TRIM(q.exam_id)) AS exam_code,
                          COALESCE(NULLIF(TRIM(q.category_code), ''), NULLIF(TRIM(q.question_category), ''), '') AS category_code,
                          COALESCE(NULLIF(TRIM(q.question_status), ''), 'active') AS question_status,
                          q.prompt,
                          q.memory_trick,
                          q.updated_at
                        FROM questions q
                        WHERE {where_sql}
                        ORDER BY q.updated_at DESC, q.exam_id ASC, q.question_id ASC
                        LIMIT ? OFFSET ?
                        """,
                        [*params, page_size, offset],
                    ).fetchall()

                items = [
                    {
                        "questionId": row["question_id"],
                        "examId": row["exam_id"],
                        "examCode": clean_text(row["exam_code"]) or clean_text(row["exam_id"]),
                        "categoryCode": clean_text(row["category_code"]).upper(),
                        "categoryKey": clean_text(row["category_code"]).upper(),
                        "questionStatus": normalize_question_status(row["question_status"], "active"),
                        "promptPreview": build_prompt_preview(row["prompt"]),
                        "memoryTrick": clean_text(row["memory_trick"]) if "memory_trick" in row.keys() else "",
                        "memory_trick": clean_text(row["memory_trick"]) if "memory_trick" in row.keys() else "",
                        "updatedAt": row["updated_at"],
                    }
                    for row in rows
                ]
                total_pages = max(1, (total + page_size - 1) // page_size) if total > 0 else 1
                self.send_json(
                    200,
                    {
                        "items": items,
                        "page": page,
                        "pageSize": page_size,
                        "total": total,
                        "totalPages": total_pages,
                        "filters": {
                            "categoryCode": category_code,
                            "categoryKey": category_code,
                            "examCode": exam_code,
                            "questionStatus": status_raw or "all",
                            "includeDeleted": include_deleted,
                            "keyword": keyword,
                        },
                    },
                )
                return

            if method == "PATCH" and path == "/api/admin/questions/bulk-status":
                if not self.require_admin():
                    return

                data = self.read_json()
                requested_status = clean_text(data.get("question_status") or data.get("status")).lower()
                if requested_status not in QUESTION_STATUS_VALUES:
                    self.send_json(400, {"error": "status 必须为 active/inactive/deleted"})
                    return
                next_status = requested_status

                targets_raw = data.get("question_ids")
                if not isinstance(targets_raw, list) or not targets_raw:
                    self.send_json(400, {"error": "question_ids 必须为非空数组"})
                    return

                normalized_targets: list[dict[str, str]] = []
                seen: set[tuple[str, str, str]] = set()
                for item in targets_raw:
                    if not isinstance(item, dict):
                        continue
                    question_id = clean_text(item.get("question_id") or item.get("questionId"))
                    exam_id = clean_text(item.get("examId") or item.get("examId"))
                    exam_code = normalize_exam_code(item.get("exam_code") or item.get("examCode"))
                    if not question_id:
                        continue
                    if not exam_id and not exam_code:
                        continue
                    dedupe_key = (question_id, exam_id, exam_code)
                    if dedupe_key in seen:
                        continue
                    seen.add(dedupe_key)
                    normalized_targets.append(
                        {
                            "question_id": question_id,
                            "examId": exam_id,
                            "exam_code": exam_code,
                        }
                    )

                if not normalized_targets:
                    self.send_json(400, {"error": "question_ids 缺少有效 question_id + exam_id/exam_code"})
                    return

                matched_rows: list[dict[str, str]] = []
                changed_rows: list[dict[str, str]] = []
                not_found = 0
                ambiguous = 0
                with db_conn() as conn:
                    ensure_questions_table(conn)
                    for target in normalized_targets:
                        question_id = target["question_id"]
                        exam_id = target["examId"]
                        exam_code = target["exam_code"]

                        row = None
                        if exam_id:
                            row = conn.execute(
                                """
                                SELECT
                                  q.question_id,
                                  q.exam_id,
                                  COALESCE(NULLIF(TRIM(q.exam_code), ''), TRIM(q.exam_id)) AS exam_code,
                                  COALESCE(NULLIF(TRIM(q.question_status), ''), 'active') AS question_status
                                FROM questions q
                                WHERE q.question_id = ? AND q.exam_id = ?
                                """,
                                (question_id, exam_id),
                            ).fetchone()
                        else:
                            rows = conn.execute(
                                """
                                SELECT
                                  q.question_id,
                                  q.exam_id,
                                  COALESCE(NULLIF(TRIM(q.exam_code), ''), TRIM(q.exam_id)) AS exam_code,
                                  COALESCE(NULLIF(TRIM(q.question_status), ''), 'active') AS question_status
                                FROM questions q
                                WHERE q.question_id = ?
                                  AND LOWER(TRIM(COALESCE(NULLIF(q.exam_code,''), NULLIF(q.exam_id,''), ''))) = ?
                                """,
                                (question_id, exam_code),
                            ).fetchall()
                            if len(rows) > 1:
                                ambiguous += 1
                                continue
                            if rows:
                                row = rows[0]

                        if not row:
                            not_found += 1
                            continue

                        matched_rows.append(
                            {
                                "question_id": clean_text(row["question_id"]),
                                "examId": clean_text(row["exam_id"]),
                                "exam_code": clean_text(row["exam_code"]) or clean_text(row["exam_id"]),
                                "question_status": normalize_question_status(row["question_status"], "active"),
                            }
                        )

                        current_status = normalize_question_status(row["question_status"], "active")
                        if current_status == next_status:
                            continue
                        updated_at = now_iso()
                        conn.execute(
                            """
                            UPDATE questions
                            SET question_status = ?, updated_at = ?
                            WHERE question_id = ? AND exam_id = ?
                            """,
                            (next_status, updated_at, row["question_id"], row["exam_id"]),
                        )
                        changed_rows.append(
                            {
                                "question_id": clean_text(row["question_id"]),
                                "examId": clean_text(row["exam_id"]),
                                "exam_code": clean_text(row["exam_code"]) or clean_text(row["exam_id"]),
                            }
                        )

                bank_synced = False
                if changed_rows:
                    bank = self.get_bank()
                    for row in changed_rows:
                        effective_exam_code = clean_text(row["exam_code"]) or clean_text(row["exam_id"])
                        _, exam = find_exam(bank, effective_exam_code)
                        if not exam:
                            continue
                        question = find_question(exam, row["question_id"])
                        if not question:
                            continue
                        question["status"] = next_status
                        question["questionStatus"] = next_status
                        bank_synced = True
                    if bank_synced:
                        self.save_bank(bank)

                self.send_json(
                    200,
                    {
                        "ok": True,
                        "status": next_status,
                        "requested": len(normalized_targets),
                        "matched": len(matched_rows),
                        "changed": len(changed_rows),
                        "notFound": not_found,
                        "ambiguous": ambiguous,
                        "bankSynced": bank_synced,
                    },
                )
                return

            if method == "PATCH" and path.startswith("/api/admin/questions/"):
                if not self.require_admin():
                    return
                question_id = clean_text(path.rsplit("/", 1)[-1])
                if not question_id:
                    self.send_json(400, {"error": "question_id 必填"})
                    return

                data = self.read_json()
                requested_status = clean_text(data.get("question_status") or data.get("status")).lower()
                if requested_status not in QUESTION_STATUS_VALUES:
                    self.send_json(400, {"error": "status 必须为 active/inactive/deleted"})
                    return
                next_status = requested_status

                exam_id_filter = clean_text(data.get("examId") or data.get("examId"))
                exam_code_filter = normalize_exam_code(data.get("exam_code") or data.get("examCode"))
                where_clauses = ["q.question_id = ?"]
                params: list = [question_id]
                if exam_id_filter:
                    where_clauses.append("q.exam_id = ?")
                    params.append(exam_id_filter)
                if exam_code_filter:
                    where_clauses.append(
                        "LOWER(TRIM(COALESCE(NULLIF(q.exam_code,''), NULLIF(q.exam_id,''), ''))) = ?"
                    )
                    params.append(exam_code_filter)
                where_sql = " AND ".join(where_clauses)

                with db_conn() as conn:
                    ensure_questions_table(conn)
                    matched_rows = conn.execute(
                        f"""
                        SELECT
                          q.question_id,
                          q.exam_id,
                          COALESCE(NULLIF(TRIM(q.exam_code), ''), TRIM(q.exam_id)) AS exam_code,
                          COALESCE(NULLIF(TRIM(q.question_status), ''), 'active') AS question_status
                        FROM questions q
                        WHERE {where_sql}
                        """,
                        params,
                    ).fetchall()
                    if not matched_rows:
                        self.send_json(404, {"error": "题目不存在"})
                        return
                    if len(matched_rows) > 1:
                        self.send_json(400, {"error": "匹配到多条题目，请补充 exam_id 或 exam_code"})
                        return

                    target = matched_rows[0]
                    current_status = normalize_question_status(target["question_status"], "active")
                    changed = current_status != next_status
                    updated_at = now_iso()
                    if changed:
                        conn.execute(
                            """
                            UPDATE questions
                            SET question_status = ?, updated_at = ?
                            WHERE question_id = ? AND exam_id = ?
                            """,
                            (next_status, updated_at, target["question_id"], target["examId"]),
                        )

                bank_synced = False
                effective_exam_code = clean_text(target["exam_code"]) or clean_text(target["examId"])
                bank = self.get_bank()
                _, exam = find_exam(bank, effective_exam_code)
                if exam:
                    question = find_question(exam, question_id)
                    if question:
                        question["status"] = next_status
                        question["questionStatus"] = next_status
                        bank_synced = True
                if bank_synced:
                    self.save_bank(bank)

                self.send_json(
                    200,
                    {
                        "ok": True,
                        "changed": changed,
                        "bankSynced": bank_synced,
                        "question": {
                            "questionId": target["question_id"],
                            "examId": target["examId"],
                            "examCode": effective_exam_code,
                            "questionStatus": next_status,
                            "updatedAt": now_iso() if changed else None,
                        },
                    },
                )
                return

            if method == "GET" and path == "/api/admin/question-bank/questions":
                if not self.require_admin():
                    return
                exam_id = clean_text((qs.get("examId") or [""])[0])
                if not exam_id:
                    self.send_json(400, {"error": "exam_id 必填"})
                    return

                bank = self.get_bank()
                industry, exam = find_exam(bank, exam_id)
                if not exam:
                    self.send_json(404, {"error": "考试分类不存在"})
                    return

                questions = [serialize_question_for_admin(q) for q in exam.get("questions", [])]
                self.send_json(
                    200,
                    {
                        "examId": exam.get("id"),
                        "examName": exam.get("name"),
                        "industryId": industry.get("id") if industry else None,
                        "industryName": industry.get("name") if industry else None,
                        "questions": questions,
                    },
                )
                return

            if method == "POST" and re.match(r"^/api/admin/question-bank/question/[^/]+/image$", path):
                if not self.require_admin():
                    return
                question_id = clean_text(path.split("/")[-2])
                if not question_id:
                    self.send_json(400, {"error": "question_id missing"})
                    return
                with db_conn() as conn:
                    ensure_questions_table(conn)
                    row = conn.execute(
                        "SELECT question_id FROM questions WHERE question_id = ?",
                        (question_id,),
                    ).fetchone()
                if not row:
                    self.send_json(404, {"error": "question not found"})
                    return
                result = self.read_multipart_image()
                if result is None:
                    return  # error response already sent
                file_bytes, ext = result
                QUESTION_IMAGES_DIR.mkdir(parents=True, exist_ok=True)
                # Remove old files (any extension) for this qid
                for old_ext in QUESTION_IMAGE_ALLOWED_EXT:
                    old_path = QUESTION_IMAGES_DIR / f"{question_id}.{old_ext}"
                    if old_path.exists():
                        try:
                            old_path.unlink()
                        except OSError:
                            pass
                # Write new file
                new_path = QUESTION_IMAGES_DIR / f"{question_id}.{ext}"
                new_path.write_bytes(file_bytes)
                image_url = f"/images/questions/{question_id}.{ext}"
                with db_conn() as conn:
                    conn.execute(
                        "UPDATE questions SET image_url = ?, updated_at = ? WHERE question_id = ?",
                        (image_url, datetime.now(timezone.utc).isoformat(), question_id),
                    )
                    conn.commit()
                self.send_json(200, {"ok": True, "imageUrl": image_url})
                return

            if method == "DELETE" and re.match(r"^/api/admin/question-bank/question/[^/]+/image$", path):
                if not self.require_admin():
                    return
                question_id = clean_text(path.split("/")[-2])
                if not question_id:
                    self.send_json(400, {"error": "question_id missing"})
                    return
                with db_conn() as conn:
                    ensure_questions_table(conn)
                    row = conn.execute(
                        "SELECT question_id FROM questions WHERE question_id = ?",
                        (question_id,),
                    ).fetchone()
                if not row:
                    self.send_json(404, {"error": "question not found"})
                    return
                # Remove all extensions
                for old_ext in QUESTION_IMAGE_ALLOWED_EXT:
                    old_path = QUESTION_IMAGES_DIR / f"{question_id}.{old_ext}"
                    if old_path.exists():
                        try:
                            old_path.unlink()
                        except OSError:
                            pass
                with db_conn() as conn:
                    conn.execute(
                        "UPDATE questions SET image_url = '', updated_at = ? WHERE question_id = ?",
                        (datetime.now(timezone.utc).isoformat(), question_id),
                    )
                    conn.commit()
                self.send_json(200, {"ok": True})
                return

            if method == "PUT" and path.startswith("/api/admin/question-bank/question/"):
                if not self.require_admin():
                    return

                question_id = clean_text(path.rsplit("/", 1)[-1])
                if not question_id:
                    self.send_json(400, {"error": "question_id 必填"})
                    return

                data = self.read_json()
                exam_id = clean_text(data.get("examId") or data.get("examId"))
                if not exam_id:
                    self.send_json(400, {"error": "examId 必填"})
                    return

                zh_payload = data.get("zh") if isinstance(data.get("zh"), dict) else {}
                prompt_zh_input = clean_text(zh_payload.get("prompt") or data.get("promptZh") or data.get("prompt_zh"))
                options_zh_input = zh_payload.get("options")
                if options_zh_input is None:
                    options_zh_input = data.get("optionsZh") or data.get("options_zh")
                explanation_zh_input = clean_text(
                    zh_payload.get("explanation") or data.get("explanationZh") or data.get("explanation_zh")
                )
                question_type_zh_input = clean_text(
                    zh_payload.get("questionType") or data.get("questionTypeZh") or data.get("question_type_zh")
                )
                key_point_zh_input = clean_text(
                    zh_payload.get("keyPoint") or data.get("keyPointZh") or data.get("key_point_zh")
                )
                answer_reasoning_zh_input = clean_text(
                    zh_payload.get("answerReasoning")
                    or data.get("answerReasoningZh")
                    or data.get("answer_reasoning_zh")
                )
                vocab_zh_input = clean_text(zh_payload.get("vocab") or data.get("vocabZh") or data.get("vocab_zh"))
                memory_tip_zh_input = clean_text(
                    zh_payload.get("memoryTip") or data.get("memoryTipZh") or data.get("memory_tip_zh")
                )
                memory_trick_present = (
                    "memory_trick" in data
                    or "memoryTrick" in data
                    or (isinstance(data.get("en"), dict) and "memoryTrick" in data.get("en"))
                )
                memory_trick_input = clean_text(
                    data.get("memory_trick")
                    or data.get("memoryTrick")
                    or ((data.get("en") or {}).get("memoryTrick") if isinstance(data.get("en"), dict) else "")
                )

                bank = self.get_bank()
                current_industry, current_exam = find_exam(bank, exam_id)
                if not current_exam:
                    self.send_json(404, {"error": "考试分类不存在"})
                    return

                question = find_question(current_exam, question_id)
                if not question:
                    self.send_json(404, {"error": "题目不存在"})
                    return

                requested_status = normalize_question_status(
                    data.get("status") or data.get("questionStatus"),
                    normalize_question_status(question.get("status") or question.get("questionStatus"), "active"),
                )
                target_exam_code = normalize_exam_code(
                    data.get("targetExamCode") or data.get("target_exam_code") or data.get("examCode")
                ) or normalize_exam_code(current_exam.get("examCode") or current_exam.get("id") or exam_id)

                if not is_valid_exam_code(target_exam_code):
                    self.send_json(400, {"error": "exam_code 非法"})
                    return

                target_exam_row = None
                with db_conn() as conn:
                    ensure_default_exam_catalog(conn)
                    target_exam_row = conn.execute(
                        """
                        SELECT
                          ec.exam_code,
                          ec.industry_key,
                          ec.industry_name,
                          ec.exam_family_key,
                          ec.exam_family_name,
                          ec.trade_code,
                          ec.exam_type,
                          ec.exam_name,
                          ec.category_key,
                          ec.is_enabled,
                          COALESCE(cfg.question_count, 100) AS question_count,
                          COALESCE(cfg.exam_time_minutes, 180) AS exam_time_minutes
                        FROM exam_catalog ec
                        LEFT JOIN exam_configs cfg ON cfg.exam_code = ec.exam_code
                        WHERE ec.exam_code = ?
                        """,
                        (target_exam_code,),
                    ).fetchone()
                if not target_exam_row:
                    self.send_json(400, {"error": "目标考试不存在，请先在考试结构管理中创建"})
                    return

                target_industry_id = clean_text(target_exam_row["industry_key"])
                target_industry_name = clean_text(target_exam_row["industry_name"])
                target_exam_name = clean_text(target_exam_row["exam_name"])
                target_family_key = clean_text(target_exam_row["exam_family_key"])
                target_family_name = clean_text(target_exam_row["exam_family_name"])
                target_trade_code = clean_text(target_exam_row["trade_code"])
                target_exam_type = clean_text(target_exam_row["exam_type"])
                target_category_key = clean_text(target_exam_row["category_key"])
                target_question_count = int(target_exam_row["question_count"] or 100)
                target_exam_time_minutes = int(target_exam_row["exam_time_minutes"] or 180)

                target_industry = ensure_industry(bank, target_industry_id, target_industry_name)
                target_exam = ensure_exam(
                    target_industry,
                    target_exam_code,
                    target_exam_name,
                    exam_family_key=target_family_key,
                    exam_family_name=target_family_name,
                    trade_code=target_trade_code,
                    exam_type=target_exam_type,
                    category_key=target_category_key,
                    question_count=target_question_count,
                    exam_time_minutes=target_exam_time_minutes,
                )
                current_exam_code = normalize_exam_code(current_exam.get("examCode") or current_exam.get("id") or exam_id)
                moved_exam = current_exam_code != target_exam_code

                if moved_exam:
                    current_questions = current_exam.get("questions") if isinstance(current_exam.get("questions"), list) else []
                    current_exam["questions"] = [q for q in current_questions if clean_text(q.get("id")) != question_id]

                i18n = ensure_question_i18n(question)
                zh_current = i18n.get("zh") if isinstance(i18n.get("zh"), dict) else {}

                zh_prompt = prompt_zh_input or clean_text(zh_current.get("prompt")) or clean_text(question.get("prompt"))
                root_options = normalize_options(question.get("options"), ["", "", "", ""])
                zh_current_options = normalize_options(zh_current.get("options"), root_options)
                zh_options = normalize_options(options_zh_input, zh_current_options)
                zh_explanation = (
                    explanation_zh_input
                    or clean_text(zh_current.get("explanation"))
                    or clean_text(question.get("explanation"))
                )
                zh_question_type = (
                    question_type_zh_input
                    or clean_text(zh_current.get("questionType"))
                    or clean_text(question.get("questionType"))
                )
                zh_key_point = (
                    key_point_zh_input
                    or clean_text(zh_current.get("keyPoint"))
                    or clean_text(question.get("key_point_zh"))
                )
                zh_answer_reasoning = (
                    answer_reasoning_zh_input
                    or clean_text(zh_current.get("answerReasoning"))
                    or clean_text(question.get("answer_reasoning_zh"))
                )
                zh_vocab = (
                    vocab_zh_input
                    or clean_text(zh_current.get("vocab"))
                    or clean_text(question.get("vocab_zh"))
                )
                zh_memory_tip = (
                    memory_tip_zh_input
                    or clean_text(zh_current.get("memoryTip"))
                    or clean_text(question.get("memory_tip_zh"))
                )

                i18n["zh"] = compose_locale_payload(
                    zh_prompt,
                    zh_options,
                    zh_explanation,
                    zh_question_type,
                    zh_key_point,
                    zh_answer_reasoning,
                    zh_vocab,
                    zh_memory_tip,
                )
                meta = i18n.get("translationMeta") if isinstance(i18n.get("translationMeta"), dict) else {}
                meta["reviewedAt"] = now_iso()
                i18n["translationMeta"] = meta

                question["prompt_zh"] = zh_prompt
                question["option_a_zh"] = zh_options[0] if len(zh_options) > 0 else ""
                question["option_b_zh"] = zh_options[1] if len(zh_options) > 1 else ""
                question["option_c_zh"] = zh_options[2] if len(zh_options) > 2 else ""
                question["option_d_zh"] = zh_options[3] if len(zh_options) > 3 else ""
                question["explanation_zh"] = zh_explanation

                # force import target exam/category from admin selection when provided
                forced_exam_code = normalize_exam_code(default_exam_code)
                forced_category_code = clean_text(default_category_code).upper()
                forced_category_name = clean_text(default_category_name)

                if forced_exam_code:
                    question["exam_code"] = forced_exam_code
                    question["exam_id"] = forced_exam_code
                    question["examId"] = forced_exam_code

                if forced_category_code:
                    question["category_code"] = forced_category_code
                    question["question_category"] = forced_category_code
                    question["categoryCode"] = forced_category_code
                    if forced_category_name:
                        question["categoryName"] = forced_category_name
                if zh_question_type:
                    question["questionType"] = zh_question_type
                if zh_key_point:
                    question["key_point_zh"] = zh_key_point
                if zh_answer_reasoning:
                    question["answer_reasoning_zh"] = zh_answer_reasoning
                if zh_vocab:
                    question["vocab_zh"] = zh_vocab
                if zh_memory_tip:
                    question["memory_tip_zh"] = zh_memory_tip
                if memory_trick_present:
                    question["memory_trick"] = memory_trick_input
                    question["memoryTrick"] = memory_trick_input
                question["status"] = requested_status
                question["examCode"] = target_exam_code
                if forced_exam_code:
                    question["examCode"] = forced_exam_code
                    question["exam_code"] = forced_exam_code
                    question["exam_id"] = forced_exam_code
                    question["examId"] = forced_exam_code
                question["examFamilyKey"] = target_family_key
                question["tradeCode"] = normalize_trade_code(target_trade_code)
                question["examType"] = normalize_exam_type(target_exam_type)
                if target_category_key:
                    question["categoryKey"] = target_category_key
                if forced_category_code:
                    question["categoryKey"] = forced_category_code
                    question["category_code"] = forced_category_code
                    question["question_category"] = forced_category_code
                    question["categoryCode"] = forced_category_code
                    if forced_category_name:
                        question["categoryName"] = forced_category_name
                question["i18n"] = i18n
                question["translation_status"] = "human_verified"

                if moved_exam:
                    upsert_question(target_exam, question)

                with db_conn() as qconn:
                    ensure_questions_table(qconn)
                    final_category_key = forced_category_code or target_category_key
                    final_exam_code = forced_exam_code or target_exam_code

                    upsert_question_row_from_bank_question(
                        qconn,
                        question=question,
                        category_key=final_category_key,
                        industry_id=target_industry_id,
                        industry_name=target_industry_name,
                        exam_family_key=target_family_key,
                        exam_family_name=target_family_name,
                        trade_code=target_trade_code,
                        exam_type=target_exam_type,
                        exam_code=final_exam_code,
                        exam_name=target_exam_name,
                    )
                    if moved_exam and current_exam_code:
                        qconn.execute(
                            "DELETE FROM questions WHERE question_id = ? AND exam_id = ?",
                            (question_id, current_exam_code),
                        )

                self.save_bank(bank)
                self.send_json(200, {"ok": True, "question": serialize_question_for_admin(question)})
                return

            if method == "POST" and path == "/api/admin/question-bank/import-csv":
                if not self.require_admin():
                    return
                data = self.read_json()
                csv_text = str(data.get("csv_text", ""))
                requested_mode = clean_text(data.get("import_mode") or data.get("importMode") or "auto").lower()
                duplicate_mode = clean_text(data.get("duplicate_mode") or data.get("duplicateMode") or "skip").lower()
                rewrite_duplicates = duplicate_mode == "rewrite"
                auto_create_category = to_bool_int(data.get("auto_create_category"), 0) == 1
                auto_generate_support = to_bool_int(data.get("auto_generate_support"), 1) == 1

                default_exam_code = normalize_exam_code(
                    data.get("default_exam_code") or data.get("exam_code") or data.get("examCode")
                )
                default_category_code = clean_text(
                    data.get("default_category_code") or data.get("category_code") or data.get("categoryCode")
                ).upper()

                category_key = normalize_category_key(data.get("category_key") or data.get("categoryKey"))
                program_key = normalize_hierarchy_key(
                    data.get("program_code")
                    or data.get("programCode")
                    or data.get("program")
                    or data.get("industry_key")
                    or data.get("industryKey")
                )
                license_group_key = normalize_hierarchy_key(
                    data.get("license_group")
                    or data.get("licenseGroup")
                    or data.get("license_type")
                    or data.get("exam_family_key")
                    or data.get("examFamilyKey")
                )
                specialization_code = normalize_specialization_code(
                    data.get("specialization_code")
                    or data.get("specializationCode")
                    or data.get("specialization")
                    or data.get("trade_code")
                    or data.get("tradeCode")
                )
                raw_exam_type = clean_text(
                    data.get("exam_track") or data.get("examTrack") or data.get("exam_type") or data.get("examType")
                )
                exam_track = normalize_exam_type(raw_exam_type, "") if raw_exam_type else ""
                if not csv_text.strip():
                    self.send_json(400, {"error": "csv_text 不能为空"})
                    return

                default_exam_row = None
                with db_conn() as conn:
                    ensure_exam_categories_defaults(conn)
                    ensure_questions_table(conn)
                    ensure_default_exam_catalog(conn)
                    if default_exam_code:
                        default_exam_row = conn.execute(
                            """
                            SELECT
                              ec.exam_code,
                              ec.industry_key,
                              ec.industry_name,
                              ec.exam_family_key,
                              ec.exam_family_name,
                              ec.trade_code,
                              ec.exam_type,
                              ec.exam_name,
                              ec.category_key,
                              ec.is_enabled,
                              COALESCE(cfg.question_count, 100) AS question_count,
                              COALESCE(cfg.exam_time_minutes, 180) AS exam_time_minutes
                            FROM exam_catalog ec
                            LEFT JOIN exam_configs cfg ON cfg.exam_code = ec.exam_code
                            WHERE ec.exam_code = ?
                            """,
                            (default_exam_code,),
                        ).fetchone()
                        if default_exam_row:
                            if not program_key:
                                program_key = normalize_hierarchy_key(default_exam_row["industry_key"])
                            if not license_group_key:
                                license_group_key = normalize_hierarchy_key(default_exam_row["exam_family_key"])
                            if not specialization_code:
                                specialization_code = normalize_specialization_code(default_exam_row["trade_code"])
                            if not exam_track:
                                exam_track = normalize_exam_type(default_exam_row["exam_type"], "trade")

                    if not default_exam_row and (program_key and license_group_key and exam_track):
                        exam_matches = conn.execute(
                            """
                            SELECT
                              ec.exam_code,
                              ec.industry_key,
                              ec.industry_name,
                              ec.exam_family_key,
                              ec.exam_family_name,
                              ec.trade_code,
                              ec.exam_type,
                              ec.exam_name,
                              ec.category_key,
                              ec.is_enabled,
                              COALESCE(cfg.question_count, 100) AS question_count,
                              COALESCE(cfg.exam_time_minutes, 180) AS exam_time_minutes
                            FROM exam_catalog ec
                            LEFT JOIN exam_configs cfg ON cfg.exam_code = ec.exam_code
                            WHERE ec.industry_key = ?
                              AND ec.exam_family_key = ?
                              AND ec.exam_type = ?
                            ORDER BY ec.is_enabled DESC, ec.sort_order ASC, ec.exam_code ASC
                            """,
                            (program_key, license_group_key, exam_track),
                        ).fetchall()
                        if exam_track == "law_business":
                            shared_rows = [
                                item
                                for item in exam_matches
                                if is_shared_specialization_code(item["trade_code"])
                            ]
                            if shared_rows:
                                default_exam_row = shared_rows[0]
                            else:
                                exact_rows = [
                                    item
                                    for item in exam_matches
                                    if normalize_specialization_code(item["trade_code"]) == specialization_code
                                ]
                                if len(exact_rows) == 1:
                                    default_exam_row = exact_rows[0]
                                elif len(exam_matches) == 1:
                                    default_exam_row = exam_matches[0]
                        else:
                            exact_rows = [
                                item
                                for item in exam_matches
                                if normalize_specialization_code(item["trade_code"]) == specialization_code
                            ]
                            if len(exact_rows) == 1:
                                default_exam_row = exact_rows[0]
                            elif not specialization_code and len(exam_matches) == 1:
                                default_exam_row = exam_matches[0]
                        if default_exam_row is None and len(exam_matches) > 1:
                            duplicated = ", ".join(clean_text(item["exam_code"]) for item in exam_matches[:5])
                            self.send_json(
                                400,
                                {"error": f"匹配到多个 exam_code：{duplicated}。请补充 specialization 或在考试结构管理中去重。"},
                            )
                            return
                        if default_exam_row is None and exam_matches:
                            default_exam_row = exam_matches[0]

                    if default_exam_row and not default_exam_code:
                        default_exam_code = normalize_exam_code(default_exam_row["exam_code"])
                    if default_exam_row and not category_key:
                        category_key = normalize_category_key(default_exam_row["category_key"])

                    columns, rows = parse_csv_rows(csv_text)
                    mode_used = detect_import_mode(columns, requested_mode)
                    missing_required = [col for col in SIMPLE_IMPORT_REQUIRED_COLUMNS if col not in columns]
                    if missing_required:
                        self.send_json(400, {"error": f"CSV 缺少基础字段: {', '.join(missing_required)}"})
                        return

                    exam_rows = conn.execute(
                        """
                        SELECT
                          ec.exam_code,
                          ec.industry_key,
                          ec.industry_name,
                          ec.exam_family_key,
                          ec.exam_family_name,
                          ec.trade_code,
                          ec.exam_type,
                          ec.exam_name,
                          ec.category_key,
                          ec.is_enabled,
                          COALESCE(cfg.question_count, 100) AS question_count,
                          COALESCE(cfg.exam_time_minutes, 180) AS exam_time_minutes
                        FROM exam_catalog ec
                        LEFT JOIN exam_configs cfg ON cfg.exam_code = ec.exam_code
                        """
                    ).fetchall()
                    exam_map = {
                        normalize_exam_code(item["exam_code"]): item
                        for item in exam_rows
                        if normalize_exam_code(item["exam_code"])
                    }
                    category_rows = conn.execute(
                        """
                        SELECT code, exam_code, name, is_active
                        FROM exam_categories
                        """
                    ).fetchall()
                    category_map = {
                        clean_text(item["code"]).upper(): item for item in category_rows if clean_text(item["code"])
                    }

                    if not default_exam_code and default_exam_row:
                        default_exam_code = normalize_exam_code(default_exam_row["exam_code"])
                    if default_exam_code and default_exam_code not in exam_map:
                        self.send_json(400, {"error": "默认考试不存在，请先在后台创建考试"})
                        return

                    if not default_category_code and default_exam_code:
                        default_category_code = f"{default_exam_code}__UNCATEGORIZED".upper()
                    if default_category_code and default_category_code not in category_map:
                        if auto_create_category and default_exam_code:
                            conn.execute(
                                """
                                INSERT INTO exam_categories(
                                  code, exam_code, name, name_zh, description, sort_order, is_active, created_at, updated_at
                                )
                                VALUES(?,?,?,?,?,?,?,?,?)
                                """,
                                (
                                    default_category_code,
                                    default_exam_code,
                                    default_category_code,
                                    "",
                                    "",
                                    9999,
                                    1,
                                    now_iso(),
                                    now_iso(),
                                ),
                            )
                            category_map[default_category_code] = conn.execute(
                                "SELECT code, exam_code, name, is_active FROM exam_categories WHERE code = ?",
                                (default_category_code,),
                            ).fetchone()
                        elif default_category_code:
                            self.send_json(400, {"error": "默认分类不存在，请先在后台创建分类"})
                            return

                    total_rows = len(rows)
                    inserted = 0
                    updated = 0
                    skipped = 0
                    failed = 0
                    duplicate_ids: list[str] = []
                    failures: list[dict] = []
                    seen_keys: set[tuple[str, str]] = set()
                    now = now_iso()

                    for raw in rows:
                        line_no = int(raw.get("__line__") or 0)
                        row = {str(k): str(v) for k, v in raw.items() if not str(k).startswith("__")}
                        question_id = clean_text(row.get("question_id"))
                        prompt = clean_text(row.get("prompt"))
                        options = [clean_text(row.get(f"option_{letter}")) for letter in CSV_OPTION_LETTERS]
                        answer_text = clean_text(row.get("answer")).upper()
                        if not question_id:
                            failed += 1
                            failures.append({"line": line_no, "question_id": "", "reason": "question_id 为空"})
                            continue
                        if not prompt:
                            failed += 1
                            failures.append({"line": line_no, "question_id": question_id, "reason": "prompt 为空"})
                            continue
                        if any(not opt for opt in options):
                            failed += 1
                            failures.append({"line": line_no, "question_id": question_id, "reason": "选项 A-D 不能为空"})
                            continue
                        try:
                            parse_answer(answer_text)
                        except Exception:
                            failed += 1
                            failures.append(
                                {"line": line_no, "question_id": question_id, "reason": "answer 必须为 A/B/C/D"}
                            )
                            continue

                        row_exam_code = normalize_exam_code(
                            row.get("exam_code") if mode_used == "full" else ""
                        ) or default_exam_code
                        if not row_exam_code or row_exam_code not in exam_map:
                            failed += 1
                            failures.append(
                                {
                                    "line": line_no,
                                    "question_id": question_id,
                                    "reason": "exam_code 缺失或不存在（请在导入页设置默认考试或在CSV提供 exam_code）",
                                }
                            )
                            continue
                        exam_row = exam_map[row_exam_code]
                        if int(exam_row["is_enabled"]) != 1:
                            failed += 1
                            failures.append({"line": line_no, "question_id": question_id, "reason": "考试已停用，无法导入"})
                            continue

                        if default_category_code:
                            row_category_code = default_category_code
                        else:
                            row_category_code = clean_text(
                                row.get("category_code") if mode_used == "full" else ""
                            ).upper()
                        if not row_category_code:
                            row_category_code = f"{row_exam_code}__UNCATEGORIZED".upper()
                        category_row = category_map.get(row_category_code)
                        if not category_row:
                            if auto_create_category:
                                conn.execute(
                                    """
                                    INSERT INTO exam_categories(
                                      code, exam_code, name, name_zh, description, sort_order, is_active, created_at, updated_at
                                    )
                                    VALUES(?,?,?,?,?,?,?,?,?)
                                    """,
                                    (
                                        row_category_code,
                                        row_exam_code,
                                        row_category_code,
                                        "",
                                        "",
                                        9999,
                                        1,
                                        now,
                                        now,
                                    ),
                                )
                                category_row = conn.execute(
                                    "SELECT code, exam_code, name, is_active FROM exam_categories WHERE code = ?",
                                    (row_category_code,),
                                ).fetchone()
                                category_map[row_category_code] = category_row
                            else:
                                failed += 1
                                failures.append(
                                    {
                                        "line": line_no,
                                        "question_id": question_id,
                                        "reason": f"分类 {row_category_code} 不存在",
                                    }
                                )
                                continue
                        if normalize_exam_code(category_row["exam_code"]) != row_exam_code:
                            if auto_create_category:
                                new_cat_code = f"{row_exam_code}__{row_category_code}"
                                conn.execute(
                                    """
                                    INSERT OR IGNORE INTO exam_categories(
                                      code, exam_code, name, name_zh, description, sort_order, is_active, created_at, updated_at
                                    )
                                    VALUES(?,?,?,?,?,?,?,?,?)
                                    """,
                                    (new_cat_code, row_exam_code, row_category_code, "", "", 9999, 1, now, now),
                                )
                                category_row = conn.execute(
                                    "SELECT code, exam_code, name, is_active FROM exam_categories WHERE code = ?",
                                    (new_cat_code,),
                                ).fetchone()
                                row_category_code = new_cat_code
                                category_map[row_category_code] = category_row
                            else:
                                failed += 1
                                failures.append(
                                    {
                                        "line": line_no,
                                        "question_id": question_id,
                                        "reason": f"分类 {row_category_code} 不属于考试 {row_exam_code}",
                                    }
                                )
                                continue
                        if int(category_row["is_active"]) != 1:
                            failed += 1
                            failures.append(
                                {
                                    "line": line_no,
                                    "question_id": question_id,
                                    "reason": f"分类 {row_category_code} 已停用",
                                }
                            )
                            continue

                        key = (question_id, row_exam_code)
                        if key in seen_keys and not rewrite_duplicates:
                            skipped += 1
                            duplicate_ids.append(question_id)
                            failures.append({"line": line_no, "question_id": question_id, "reason": "CSV 内 question_id 重复，已跳过"})
                            continue
                        if key in seen_keys and rewrite_duplicates:
                            suffix = 2
                            base_id = question_id
                            while (question_id, row_exam_code) in seen_keys:
                                question_id = f"{base_id}_{suffix}"
                                suffix += 1
                        seen_keys.add((question_id, row_exam_code))

                        existed = conn.execute(
                            "SELECT 1 FROM questions WHERE question_id = ? AND exam_id = ?",
                            (question_id, row_exam_code),
                        ).fetchone()

                        # ===== FIX：数据库已存在重复ID时，按 duplicate_mode 处理 =====
                        if existed and rewrite_duplicates:
                            base_id = question_id
                            suffix = 2
                            while conn.execute(
                                "SELECT 1 FROM questions WHERE question_id = ? AND exam_id = ?",
                                (question_id, row_exam_code),
                            ).fetchone():
                                question_id = f"{base_id}_{suffix}"
                                suffix += 1
                            existed = None
                        elif existed:
                            skipped += 1
                            duplicate_ids.append(question_id)
                            failures.append({
                                "line": line_no,
                                "question_id": question_id,
                                "reason": "数据库内 question_id 重复，已跳过"
                            })
                            continue


                        csv_row = dict(row)
                        csv_row["question_id"] = question_id
                        csv_row["answer"] = answer_text
                        csv_row["category_code"] = row_category_code
                        csv_row["memory_trick"] = clean_text(row.get("memory_trick") or row.get("memoryTrick"))
                        if mode_used == "full":
                            csv_row["explanation"] = clean_text(row.get("explanation"))
                            csv_row["prompt_zh"] = clean_text(row.get("prompt_zh"))
                            for letter in CSV_OPTION_LETTERS:
                                csv_row[f"option_{letter}_zh"] = clean_text(row.get(f"option_{letter}_zh"))
                        else:
                            csv_row["explanation"] = clean_text(row.get("explanation"))

                        generated_support = empty_ai_content()
                        if auto_generate_support and mode_used == "simple":
                            generated_support = build_builtin_zh_support(
                                prompt_en=prompt,
                                options_en=options,
                                answer_index=parse_answer(answer_text),
                                question_type=clean_text(row.get("question_type")),
                                explanation_en=clean_text(row.get("explanation")),
                            )
                        if mode_used == "full":
                            generated_support["prompt_zh"] = clean_text(row.get("prompt_zh"))
                            generated_support["option_a_zh"] = clean_text(row.get("option_a_zh"))
                            generated_support["option_b_zh"] = clean_text(row.get("option_b_zh"))
                            generated_support["option_c_zh"] = clean_text(row.get("option_c_zh"))
                            generated_support["option_d_zh"] = clean_text(row.get("option_d_zh"))
                            generated_support["explanation"] = clean_text(row.get("explanation"))
                            generated_support["explanation_zh"] = clean_text(row.get("explanation_zh"))
                            generated_support["key_point_zh"] = clean_text(row.get("key_points"))
                        if not clean_text(generated_support.get("explanation")):
                            generated_support["explanation"] = clean_text(row.get("explanation"))

                        question_type = clean_text(row.get("question_type")) or infer_type(
                            {"prompt": prompt, "explanation": clean_text(generated_support.get("explanation"))},
                            row_exam_code,
                        )

                        upsert_question_row(
                            conn,
                            row=csv_row,
                            ai_content=generated_support,
                            category_key=normalize_category_key(exam_row["category_key"]) or category_key,
                            industry_id=clean_text(exam_row["industry_key"]),
                            industry_name=clean_text(exam_row["industry_name"]),
                            exam_family_key=clean_text(exam_row["exam_family_key"]),
                            exam_family_name=clean_text(exam_row["exam_family_name"]),
                            trade_code=clean_text(exam_row["trade_code"]),
                            exam_type=clean_text(exam_row["exam_type"]),
                            exam_code=row_exam_code,
                            exam_id=row_exam_code,
                            exam_name=clean_text(exam_row["exam_name"]),
                            question_type=question_type,
                            question_status="active",
                        )

                        if existed:
                            updated += 1
                        else:
                            inserted += 1

                    bank = compose_bank_from_tables(conn, enabled_only=False, active_questions_only=False)

                self.save_bank(bank)
                self.send_json(
                    200,
                    {
                        "ok": True,
                        "modeUsed": mode_used,
                        "totalRows": total_rows,
                        "successCount": inserted + updated,
                        "inserted": inserted,
                        "updated": updated,
                        "skipped": skipped,
                        "failed": failed,
                        "duplicateQuestionIds": sorted(set(duplicate_ids)),
                        "failures": failures[:200],
                        "defaultExamCode": default_exam_code,
                        "defaultCategoryCode": default_category_code,
                    },
                )
                return

            if method == "GET" and path == "/api/admin/question-bank/stats":
                if not self.require_admin():
                    return
                bank = self.get_bank()
                stats = summarize_bank(bank)
                with db_conn() as conn:
                    sync_questions_table_from_bank(conn, bank)
                    table_stats = summarize_questions_table(conn)
                    source = conn.execute("SELECT updated_at FROM settings WHERE key='question_bank_json'").fetchone()
                stats["industries"] = table_stats.get("industries", stats.get("industries", 0))
                stats["exams"] = table_stats.get("exams", stats.get("exams", 0))
                stats["questions"] = table_stats.get("questions", stats.get("questions", 0))
                stats["activeQuestions"] = table_stats.get("activeQuestions", stats.get("activeQuestions", 0))
                stats["inactiveQuestions"] = table_stats.get("inactiveQuestions", stats.get("inactiveQuestions", 0))
                stats["deletedQuestions"] = table_stats.get("deletedQuestions", stats.get("deletedQuestions", 0))
                stats["bQuestionCount"] = table_stats.get("bQuestionCount", stats.get("bQuestionCount", 0))
                stats["bTypeCount"] = table_stats.get("bTypeCount", stats.get("bTypeCount", 0))
                stats["bTopics"] = table_stats.get("bTopics", stats.get("bTopics", []))
                stats["questionStatsSource"] = "questions_table"
                stats["source"] = "云端数据库"
                stats["updatedAt"] = source["updated_at"] if source else None
                self.send_json(200, stats)
                return

            if method == "GET" and path == "/api/admin/question-bank/export":
                if not self.require_admin():
                    return
                self.send_json(200, self.get_bank())
                return

            if method == "GET" and path == "/api/admin/question-bank/export-csv":
                if not self.require_admin():
                    return
                csv_text = export_question_bank_full_csv(self.get_bank())
                body = csv_text.encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "text/csv; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.send_header(
                    "Content-Disposition",
                    f"attachment; filename=question-bank-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}.csv",
                )
                self.end_headers()
                self.wfile.write(body)
                return

            if method == "POST" and path == "/api/admin/question-bank/reset":
                if not self.require_admin():
                    return
                bank = json.loads(DEFAULT_BANK_PATH.read_text(encoding="utf-8"))
                self.save_bank(bank)
                self.send_json(200, {"ok": True})
                return

            if method == "GET" and path == "/api/dict":
                from urllib.parse import quote as _quote
                import re as _re
                word = (qs.get("q", [""])[0] or "").strip()[:60]
                if not word:
                    self.send_json(400, {"error": "missing q"})
                    return
                try:
                    defs = []
                    phonetic = ""
                    # 1st priority: construction-specific vocabulary
                    with db_conn() as _dbc:
                        _row = _dbc.execute(
                            "SELECT phonetic, defs_json FROM construction_vocab WHERE word=? COLLATE NOCASE LIMIT 1",
                            (word,)
                        ).fetchone()
                    if _row:
                        phonetic = (_row[0] or "").strip()
                        defs = json.loads(_row[1])
                    # 2nd priority: ECDICT general dictionary
                    if not defs:
                        _ECDICT = ROOT / "data" / "stardict.db"
                        if _ECDICT.exists():
                            with sqlite3.connect(str(_ECDICT)) as ec:
                                row = ec.execute(
                                    "SELECT phonetic, translation FROM stardict WHERE word=? COLLATE NOCASE LIMIT 1",
                                    (word,)
                                ).fetchone()
                            if row:
                                phonetic = (row[0] or "").lstrip("'").strip()
                                for line in (row[1] or "").split("\n"):
                                    line = line.strip()
                                    m = _re.match(r'^([a-zA-Z]+)\.\s+(.+)', line)
                                    if m:
                                        pos, zh_raw = m.group(1).lower(), m.group(2)
                                        zh_raw = _re.sub(r'^\[.+?\]\s*', '', zh_raw)
                                        terms = [t.strip() for t in _re.split(r'[,，]', zh_raw)][:4]
                                        terms = [t for t in terms if t]
                                        if terms:
                                            defs.append({"pos": pos, "zh": "，".join(terms)})
                    # 3rd priority: Google Translate fallback
                    if not defs:
                        url = (
                            "https://translate.googleapis.com/translate_a/single"
                            f"?client=gtx&sl=en&tl=zh-CN&dt=bd&dt=t&dj=1&q={_quote(word)}"
                        )
                        req = Request(url, headers={"User-Agent": "Mozilla/5.0"})
                        with urlopen(req, timeout=6) as resp:
                            raw_data = json.loads(resp.read().decode("utf-8"))
                        pos_map = {
                            "verb": "v", "noun": "n", "adjective": "adj",
                            "adverb": "adv", "preposition": "prep",
                            "conjunction": "conj", "interjection": "int",
                            "pronoun": "pron", "numeral": "num",
                        }
                        for d in raw_data.get("dict", []):
                            pos = pos_map.get(d.get("pos", ""), d.get("pos", ""))
                            entries = sorted(d.get("entry", []), key=lambda e: e.get("score", 0), reverse=True)
                            top = [e["word"] for e in entries[:4]] or (d.get("terms") or [])[:4]
                            if top:
                                defs.append({"pos": pos, "zh": "；".join(top)})
                        if not defs:
                            sents = raw_data.get("sentences", [])
                            trans = sents[0].get("trans", "") if sents else ""
                            if trans and trans.lower() != word.lower():
                                defs.append({"pos": "译", "zh": trans})
                    self.send_json(200, {"word": word, "phonetic": phonetic, "defs": defs})
                except Exception as e:
                    self.send_json(502, {"error": f"dict error: {e}"})
                return

            self.send_json(404, {"error": f"Unknown API endpoint: {path}"})

        except ValueError as e:
            self.send_json(400, {"error": str(e)})
        except json.JSONDecodeError:
            self.send_json(400, {"error": "JSON 格式错误"})
        except Exception as e:
            self.send_json(500, {"error": f"Server error: {e}"})


def run():
    init_db()
    port = int(os.environ.get("PORT", "8000"))
    server = ThreadingHTTPServer(("0.0.0.0", port), AppHandler)
    print(f"JNONO server running at http://127.0.0.1:{port}")
    server.serve_forever()


if __name__ == "__main__":
    run()


# ====== SAFE PATCH: progress summary fallback (AUTO ADDED) ======
def _progress_summary(self):
    try:
        user = self._current_user()
        if not user:
            return self._json_response({"authenticated": False}, 401)

        conn = get_conn()
        cur = conn.cursor()

        study_progress = 0
        license_progress = 0
        question_coverage = 0
        accuracy = 0

        try:
            try:
                cur.execute("SELECT COUNT(*) FROM question_bank")
                total_questions = cur.fetchone()[0] or 0
            except Exception:
                total_questions = 0

            try:
                cur.execute("SELECT COUNT(*) FROM user_answers WHERE user_id=?", (user["id"],))
                answered = cur.fetchone()[0] or 0
            except Exception:
                answered = 0

            if total_questions > 0:
                question_coverage = int(answered / total_questions * 100)

            try:
                cur.execute("""
                    SELECT COUNT(*) FROM user_answers
                    WHERE user_id=? AND is_correct=1
                """, (user["id"],))
                correct = cur.fetchone()[0] or 0
            except Exception:
                correct = 0

            if answered > 0:
                accuracy = int(correct / answered * 100)

            study_progress = question_coverage

        except Exception as inner_e:
            print("progress inner error:", inner_e)

        conn.close()

        return self._json_response({
            "study_progress": study_progress,
            "license_progress": license_progress,
            "question_coverage": question_coverage,
            "accuracy": accuracy
        }, 200)

    except Exception as e:
        print("progress summary fatal error:", e)
        return self._json_response({
            "study_progress": 0,
            "license_progress": 0,
            "question_coverage": 0,
            "accuracy": 0
        }, 200)
# ====== END PATCH ======


# ===== JNONO MEMBERSHIP MODEL PATCH START =====
def normalize_membership_tier_v2(value, default="trial"):
    raw = str(value or "").strip().lower()
    mapping = {
        "free": "trial",
        "trial": "trial",
        "basic": "basic",
        "basic_399": "basic",
        "pro": "pro",
        "pro_599": "pro",
        "paid": "pro",
        "ai": "ai",
        "ai_999": "ai",
        "all": "ai",
    }
    return mapping.get(raw, raw or default)

def content_permission_defaults_for_tier_v2(membership_tier):
    tier = normalize_membership_tier_v2(membership_tier, "trial")
    is_basic = tier == "basic"
    is_pro = tier == "pro"
    is_ai = tier == "ai"

    return {
        "membershipTierNormalized": tier,
        "bilingualEnabled": is_pro or is_ai,
        "showChineseEnabled": is_pro or is_ai,
        "questionChineseEnabled": is_pro or is_ai,
        "optionChineseEnabled": is_pro or is_ai,
        "explanationEnabled": is_ai,
        "analysisEnabled": is_ai,
        "aiAnalysisEnabled": is_ai,
        "keyPointEnabled": is_ai,
        "vocabEnabled": is_ai,
        "memoryTipEnabled": is_ai,
        "memoryTipsEnabled": is_ai,
        "memoryTrickEnabled": is_ai,
    }
# ===== JNONO MEMBERSHIP MODEL PATCH END =====
