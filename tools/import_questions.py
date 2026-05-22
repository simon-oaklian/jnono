#!/usr/bin/env python3
"""Import questions from CSV into question-bank.json."""

from __future__ import annotations

import argparse
import csv
import json
import re
from datetime import datetime, timezone
from pathlib import Path

REQUIRED_COLUMNS = [
    "question_id",
    "prompt",
    "option_a",
    "option_b",
    "option_c",
    "option_d",
    "answer",
]

DEFAULT_IMPORT_CONTEXT_BY_CATEGORY = {
    "b_license": {
        "industry_id": "construction",
        "industry_name": "Contractor License",
        "exam_id": "ca-general-b",
        "exam_name": "California General B",
    },
    "c_license": {
        "industry_id": "construction",
        "industry_name": "Contractor License",
        "exam_id": "ca-trade-c",
        "exam_name": "California Trade C",
    },
}

CJK_RE = re.compile(r"[\u3400-\u9fff]")
EN_WORD_RE = re.compile(r"[A-Za-z]")
CSV_OPTION_LETTERS = ("a", "b", "c", "d")

EN_TO_ZH_PHRASES = [
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
    "true": "正确",
    "false": "错误",
}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


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
    raise ValueError(f"Invalid answer value: {value!r}. Use A-D or 1-4 or 0-3.")


def clean_text(value: str | None) -> str:
    return str(value or "").strip()


def default_import_context(category_key: str) -> dict[str, str]:
    key = clean_text(category_key).lower()
    mapped = DEFAULT_IMPORT_CONTEXT_BY_CATEGORY.get(key)
    if mapped:
        return dict(mapped)
    title = key.replace("_", " ").strip() or "General License"
    exam_slug = re.sub(r"[^a-z0-9]+", "-", key).strip("-") or "general"
    return {
        "industry_id": "construction",
        "industry_name": "Contractor License",
        "exam_id": f"ca-{exam_slug}",
        "exam_name": title.title(),
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
    safe_options = list(options_en[:4]) if isinstance(options_en, list) else []
    while len(safe_options) < 4:
        safe_options.append("")
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
    safe_options = list(options_zh[:4]) if isinstance(options_zh, list) else []
    while len(safe_options) < 4:
        safe_options.append("")
    correct_letter = labels[answer_index] if 0 <= answer_index < 4 else "?"
    correct_text = clean_text(safe_options[answer_index]) if 0 <= answer_index < 4 else ""
    if correct_text:
        return f"正确答案为{correct_letter}：{correct_text}。该选项最符合题目考查的合规要求。"
    return f"正确答案为选项{correct_letter}。该选项最符合题目考查要求。"


def infer_question_type(prompt: str, explanation: str) -> str:
    text = f"{clean_text(prompt)} {clean_text(explanation)}".lower()
    if "safety" in text or "osha" in text or "安全" in text:
        return "Safety"
    if "contract" in text or "合同" in text or "scope" in text:
        return "Contract"
    if "license" in text or "licensing" in text or "执照" in text:
        return "Licensing"
    if "finance" in text or "financial" in text or "财务" in text or "成本" in text:
        return "Business"
    return "General"


def build_bilingual_question(row: dict) -> tuple[dict, bool]:
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

    source_language = detect_question_language([base_prompt, *base_options, base_explanation, base_type])
    source_is_en = source_language == "en"
    has_explicit_en = bool(prompt_en_raw or explanation_en_raw or type_en_raw or any(options_en_raw))
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
    if not en_type and (source_is_en or has_explicit_en):
        en_type = infer_question_type(en_prompt or base_prompt, en_explanation or base_explanation)
        auto_translated = True
    if not zh_type:
        zh_type = infer_question_type(zh_prompt, zh_explanation)
        auto_translated = True

    question = {
        "id": clean_text(row.get("question_id")),
        "prompt": zh_prompt,
        "options": zh_options,
        "answerIndex": answer_index,
        "explanation": zh_explanation,
        "prompt_zh": zh_prompt,
        "option_a_zh": zh_options[0] if len(zh_options) > 0 else "",
        "option_b_zh": zh_options[1] if len(zh_options) > 1 else "",
        "option_c_zh": zh_options[2] if len(zh_options) > 2 else "",
        "option_d_zh": zh_options[3] if len(zh_options) > 3 else "",
        "explanation_zh": zh_explanation,
    }
    if zh_type:
        question["questionType"] = zh_type

    key_point_en = key_point_en_raw or generate_key_point_en(
        en_type or base_type,
        en_prompt or base_prompt,
        en_explanation or base_explanation,
    )
    key_point_zh = key_point_zh_raw
    if not key_point_zh and key_point_en:
        key_point_zh = auto_translate_en_text(key_point_en)
        auto_translated = True

    i18n: dict[str, dict | str] = {
        "sourceLanguage": source_language,
        "zh": compose_locale_payload(zh_prompt, zh_options, zh_explanation, zh_type, key_point_zh),
    }
    if source_is_en or has_explicit_en:
        en_payload = compose_locale_payload(en_prompt, en_options, en_explanation, en_type, key_point_en)
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

    return question, auto_translated


def ensure_industry(bank: dict, industry_id: str, industry_name: str) -> dict:
    for industry in bank["industries"]:
        if industry["id"] == industry_id:
            if industry_name:
                industry["name"] = industry_name
            return industry

    industry = {"id": industry_id, "name": industry_name, "exams": []}
    bank["industries"].append(industry)
    return industry


def ensure_exam(industry: dict, exam_id: str, exam_name: str) -> dict:
    for exam in industry["exams"]:
        if exam["id"] == exam_id:
            if exam_name:
                exam["name"] = exam_name
            return exam

    exam = {"id": exam_id, "name": exam_name, "questions": []}
    industry["exams"].append(exam)
    return exam


def upsert_question(exam: dict, question: dict) -> None:
    for idx, existing in enumerate(exam["questions"]):
        if existing["id"] == question["id"]:
            exam["questions"][idx] = question
            return
    exam["questions"].append(question)


def validate_row(row: dict, row_num: int) -> None:
    missing = [c for c in REQUIRED_COLUMNS if c not in row]
    if missing:
        raise ValueError(f"Row {row_num}: missing columns {missing}")

    for key in [
        "question_id",
        "prompt",
        "option_a",
        "option_b",
        "option_c",
        "option_d",
        "answer",
    ]:
        if not (row.get(key) or "").strip():
            raise ValueError(f"Row {row_num}: field {key} is empty")


def import_csv(csv_path: Path, json_path: Path, *, category_key: str) -> tuple[int, int]:
    bank = json.loads(json_path.read_text(encoding="utf-8"))
    if "industries" not in bank or not isinstance(bank["industries"], list):
        raise ValueError("Invalid question-bank.json: missing industries list")

    inserted_or_updated = 0
    created_exams = 0
    bilingual_processed = 0
    auto_translated = 0

    with csv_path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row_num, row in enumerate(reader, start=2):
            if not any((v or "").strip() for v in row.values()):
                continue

            validate_row(row, row_num)

            defaults = default_import_context(category_key)
            industry_id = clean_text(row.get("industry_id")) or defaults["industry_id"]
            industry_name = clean_text(row.get("industry_name")) or defaults["industry_name"]
            exam_id = clean_text(row.get("exam_id")) or defaults["exam_id"]
            exam_name = clean_text(row.get("exam_name")) or defaults["exam_name"]

            industry = ensure_industry(bank, industry_id, industry_name)
            exam_before = len(industry["exams"])
            exam = ensure_exam(industry, exam_id, exam_name)
            if len(industry["exams"]) > exam_before:
                created_exams += 1

            question, was_auto_translated = build_bilingual_question(row)
            question["categoryKey"] = clean_text(category_key).lower()
            bilingual_processed += 1
            if was_auto_translated:
                auto_translated += 1

            upsert_question(exam, question)
            inserted_or_updated += 1

    json_path.write_text(json.dumps(bank, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Bilingual processed: {bilingual_processed}.")
    print(f"Auto translated from English: {auto_translated}.")
    return inserted_or_updated, created_exams


def main() -> None:
    parser = argparse.ArgumentParser(description="Import question CSV into question-bank.json")
    parser.add_argument("--csv", required=True, help="Path to input CSV")
    parser.add_argument(
        "--category-key",
        default="b_license",
        help="Category key for this import (default: b_license)",
    )
    parser.add_argument(
        "--json",
        default="data/question-bank.json",
        help="Path to question-bank.json (default: data/question-bank.json)",
    )
    args = parser.parse_args()

    csv_path = Path(args.csv)
    json_path = Path(args.json)

    if not csv_path.exists():
        raise SystemExit(f"CSV file not found: {csv_path}")
    if not json_path.exists():
        raise SystemExit(f"JSON file not found: {json_path}")

    count, created = import_csv(csv_path, json_path, category_key=args.category_key)
    print(f"Imported/updated {count} questions.")
    print(f"Created {created} new exams.")
    print(f"Category key: {args.category_key}")
    print(f"Updated file: {json_path}")


if __name__ == "__main__":
    main()
