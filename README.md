# JNONO (MVP)

专注LICENSE考试培训平台。

一个可扩展的执照考试刷题网站前端原型，第一阶段提供装修/承包商执照题库，后续可扩展到保险、美容、房产经纪人等行业。

## 功能
- 登录后自动按会员类型跳转到不同页面
- 注册入口（新用户注册后自动进入 10 题模拟）
- 会员分层：注册会员仅 10 题模拟；付费会员解锁全题库和错题本
- 管理端会员管理：可切换用户为免费/付费
- 管理端题库导入中心：CSV导入、题库统计、导出JSON、重置默认题库
- 付费会员训练模式：B证分类题训练 + 模拟考试（整场计时）
- B证题型分类（支持 `question_type` 字段，未填会自动推断）
- 成绩统计（正确率 / 次数 / 最高分）
- 实时记录（每次选项变更都会写入）
- 云端持久化（SQLite：`data/jnono.db`）
- 多设备同步（同账号在手机/iPad/电脑自动同步学习数据）

## 默认测试账号（可关闭）
- 邮箱：`demo@licensedrill.com`
- 密码：`demo123456`

## 管理员账号
- 地址：`/admin.html`
- 邮箱：`admin@licensedrill.com`
- 密码：`admin123456`

## 体验流程
1. 打开首页先登录，或先注册新账号。
2. 注册成功后自动进入 `/trial.html`（10题模拟页）。
3. 付费会员登录后自动进入 `/member.html`（完整刷题页）。
4. 免费会员登录后自动进入 `/trial.html`（仅模拟）。
5. 在管理端把用户改成付费会员后，该用户重新登录即可生效。

## 运行（实时记录 + 云端保存）
在项目根目录执行：

```bash
python3 app.py
```

打开：

- http://127.0.0.1:8000

如果 `8000` 端口被占用，可改端口：

```bash
PORT=5173 python3 app.py
```

然后打开：

- http://127.0.0.1:5173

### 生产部署建议（前台/管理端分域）
推荐同一套服务，由反向代理按域名转发：
- 前台域名：`www.yourdomain.com` -> `/`
- 管理端域名：`admin.yourdomain.com` -> `/admin.html`

部署时建议设置环境变量：
- `ADMIN_EMAIL` 管理员账号
- `ADMIN_PASSWORD` 管理员密码
- `ADMIN_NAME` 管理员显示名
- `SEED_DEFAULT_USERS=0` 关闭默认测试账号写入

### 一键启动（推荐）
双击：
- `/Volumes/Elements/OPEN AI/jnono.com/start_jnono.command`

停止服务双击：
- `/Volumes/Elements/OPEN AI/jnono.com/stop_jnono.command`

## 目录结构

- `/Volumes/Elements/OPEN AI/jnono.com/index.html` 主页面
- `/Volumes/Elements/OPEN AI/jnono.com/member.html` 付费会员刷题页
- `/Volumes/Elements/OPEN AI/jnono.com/trial.html` 注册会员10题模拟页
- `/Volumes/Elements/OPEN AI/jnono.com/styles.css` 样式
- `/Volumes/Elements/OPEN AI/jnono.com/app.js` 首页登录/注册逻辑
- `/Volumes/Elements/OPEN AI/jnono.com/member.js` 付费会员刷题逻辑
- `/Volumes/Elements/OPEN AI/jnono.com/trial.js` 注册会员模拟逻辑
- `/Volumes/Elements/OPEN AI/jnono.com/admin.html` 管理端页面
- `/Volumes/Elements/OPEN AI/jnono.com/admin.js` 管理端逻辑
- `/Volumes/Elements/OPEN AI/jnono.com/data/question-bank.json` 题库数据
- `/Volumes/Elements/OPEN AI/jnono.com/data/jnono.db` 云端用户与学习进度数据库

## 批量导入题库（CSV）
1. 先复制模板：
`/Volumes/Elements/OPEN AI/jnono.com/templates/questions_template.csv`
2. 按模板填题，字段说明：
- `industry_id` / `industry_name` 行业
- `exam_id` / `exam_name` 考试分类
- `question_id` 题目唯一ID（重复会更新）
- `question_type` 题型分类（如：合同与流程/安全管理/估算与成本）
- `prompt` 题干
- `option_a`~`option_d` 四个选项
- `answer` 支持 `A-D` 或 `1-4` 或 `0-3`
- `explanation` 解析
- 可选双语字段：`prompt_zh`、`prompt_en`、`option_a_zh~option_d_zh`、`option_a_en~option_d_en`、`explanation_zh`、`explanation_en`、`question_type_zh`、`question_type_en`
- 若仅导入英文题（`prompt/option/explanation` 为英文），系统会自动生成中文字段并写入双语结构
3. 执行导入命令：

```bash
cd "/Volumes/Elements/OPEN AI/jnono.com"
python3 tools/import_questions.py --csv templates/questions_template.csv --json data/question-bank.json
```

导入后刷新网页即可看到新题目。

## 管理端直接导入（推荐）
1. 登录 `/admin.html`
2. 在“题库导入中心”下载模板并填题
3. 选择 CSV 文件点击“导入题库”
4. 查看“题库统计”确认行业/分类/题量
5. 前台付费页刷新后立即生效

## 加州 B 证题型分类（已内置）
管理端与付费页已按以下分类识别和展示（中英文都可识别）：
- Business Organization / 商业组织
- Business Finances / 商业财务
- Employment Requirements / 雇佣要求
- Bonds, Insurance, and Liens / 保证金、保险与留置权
- Contract Requirements and Execution / 合同要求与执行
- Licensing Requirements / 执照要求
- Safety / 安全规范
- Public Works / 公共工程
- B Planning & Estimating / B类计划与预算
- B Framing & Structural / B类结构与框架施工
- B Core Trades (Part 1) / B类核心工种（第1部分）
- B Core Trades (Part 2) / B类核心工种（第2部分）
- B Finish Trades / B类收尾工种
- B Health & Safety / B类健康与安全
- B General Building Updates I / B类建筑规范更新 I
- B General Building Updates II / B类建筑规范更新 II
- Health & Safety Test / 健康与安全测试

## 扩展到新行业
1. 在 `data/question-bank.json` 的 `industries` 新增行业。
2. 在对应行业的 `exams` 下新增考试类别。
3. 每道题结构：

```json
{
  "id": "unique-id",
  "prompt": "题目",
  "options": ["A", "B", "C", "D"],
  "answerIndex": 1,
  "explanation": "解析",
  "questionType": "题型",
  "i18n": {
    "sourceLanguage": "en|zh|mixed|unknown",
    "zh": {
      "prompt": "中文题干",
      "options": ["中文A", "中文B", "中文C", "中文D"],
      "explanation": "中文解析",
      "questionType": "中文题型"
    },
    "en": {
      "prompt": "English prompt",
      "options": ["English A", "English B", "English C", "English D"],
      "explanation": "English explanation",
      "questionType": "English type"
    }
  }
}
```

## 下一阶段建议
- 接后端（用户系统、云端进度、支付、会员）
- 管理端（批量导入题库 CSV/Excel）
- 模考模式（按州/按章节固定组卷）
- 多语言（中/英/西）
