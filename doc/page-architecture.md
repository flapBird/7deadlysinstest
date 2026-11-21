# 7 Deadly Sins Test · 英文首版页面架构与开发交接

首版交付 **1 个答题首页、7 个静态结果页、2 种尺寸的分享图**。短视频访客打开首页就能回答第一题。搜索访客可直接读某一种罪的解读。两条路径都汇入同一个答题引擎，完成后即可分享，好友完成后可在自己的结果页对照两人的七项分数。

本文是待实现规格。项目当前为空目录。下文的文件名是建议落点，验收以静态产物和浏览器行为为准。

## 1. 路由和页面状态

| 入口 | 首次打开所见 | 操作与去向 |
| --- | --- | --- |
| `/` | 窄幅站名、用时提示、第一题和五个选项 | 直接选择。存在有效草稿时恢复到保存的题；第 21 次选择后自动进入主导罪结果页 |
| `/result/{sin}` 公开阅读 | 七色带、罪名、通用三段解读、其余六罪的简介与链接、答题入口 | `Take the test` 到首页。抓取器、关闭 JS 的读者、首次访问的好友均能读取正文 |
| 同一结果页，刚完成或刷新自己的结果 | 主导罪标题、实际得分、七条分数、分享操作及完整解读 | 分享、邀请好友、重测。点击其他罪的内链时进入对应的公开阅读态 |
| `/?vs=wrath#s=…` | 同一答题首页，用一行小字提示完成后可与好友比较 | 随草稿保留邀请上下文，答完在本人结果页追加对比区；已有完整结果时直接进入对比 |
| 仅含 `/?vs=wrath` 的邀请 | 提示好友主导罪为 Wrath | 答完可对照双方主导罪，只展示手头真实存在的分数 |

七个合法 slug 按固定展示顺序为 `pride`、`greed`、`lust`、`envy`、`gluttony`、`wrath`、`sloth`。构建时逐个输出可由静态主机直接返回 HTTP 200 的 HTML。未知 slug 返回 404。双主导使用排名第一项的现有路径，另一项显示在个人结果标题与分享图上。

### 英文与未来语言

把路径构造集中到 `pathFor(locale, page, sin?)`。默认英语使用无前缀路径，将来其他语言使用 `/{locale}/…`。首版只发布英语，HTML 声明 `lang="en"`。在 `src/locales/en.json` 集中维护题干、五档选项、罪名、美德、解读、按钮、键盘提示、无障碍标签、错误与降级提示、分享模板、Canvas 文字及页面元数据。代码中只留稳定 ID、数值和插值参数。域名通过站点配置注入。

## 2. 首页 · 从第一题到最后一次选择

**390px 手机版，从上到下**：站名和“约 3 分钟”同一行 → 返回按钮与 `7 / 21` → 高 2px 的进度条 → 当前陈述 → 五个纵排选项 → 简短的本地保存说明。首题返回按钮禁用，位置保留。左右各留 16px，选项高 52px、间隔 8px，题干预留两至三行。缩小顶部留白优先于缩小选项。桌面沿用单列，内容最大宽约 560px。知识词入口放在题区下方，用简短的七罪列表链接七个结果页。

**一次选择的处理顺序**：锁定本题输入 → 写入或覆盖当前题答案 → 同步保存下一题位置（末题则保存结果）→ 显示选中反馈 → 180ms 后换题或跳转。关闭页面发生在过渡中也应恢复到下一题。键盘 1–5 与点击共用同一处理函数，忽略按键长按重复事件；← 回上一题，恢复原选中项，允许重选相同答案继续。返回时也保存当前位置。每次换题使焦点落到新题干，让读屏器读出题号和陈述。启用减少动态效果时直接切换。

### 题库交付稿

直接按表序使用；ID 与展示语言独立。每轮顺序相同。英文选项依次为 Strongly disagree、Disagree、Neither agree nor disagree、Agree、Strongly agree，存储值为 1 至 5。罪名和方向仅供开发，答题时隐藏。

| ID | 计入维度 | 方向 | en.json 英文题干 |
| --- | --- | --- | --- |
| q01 | Pride | 正 | I want others to notice when I get something right. |
| q02 | Envy | 正 | Someone else's success can make my own progress feel smaller. |
| q03 | Sloth | 正 | I put off small tasks even when I have time to do them. |
| q04 | Wrath | 反 | When someone annoys me, I can pause before reacting. |
| q05 | Greed | 正 | Even when I have enough, I still want more for myself. |
| q06 | Gluttony | 正 | I often keep enjoying a treat past the point of satisfaction. |
| q07 | Lust | 正 | A strong attraction can pull my attention away from my plans. |
| q08 | Envy | 反 | I can celebrate a friend's win without comparing it to my own life. |
| q09 | Greed | 反 | I find it easy to share something valuable to me. |
| q10 | Pride | 反 | I find it easy to admit I was wrong. |
| q11 | Lust | 正 | I chase the excitement of a new attraction even when it complicates things. |
| q12 | Sloth | 反 | I usually take the first step on a dull task promptly. |
| q13 | Wrath | 正 | I replay arguments long after they are over. |
| q14 | Gluttony | 反 | I can stop enjoying a favorite treat when I feel satisfied. |
| q15 | Sloth | 正 | I wait for motivation before starting something important. |
| q16 | Lust | 反 | I can let a passing attraction go without acting on it. |
| q17 | Wrath | 正 | When I feel slighted, my first impulse is to snap back. |
| q18 | Gluttony | 正 | When something feels good, I reach for more without thinking. |
| q19 | Pride | 正 | I get defensive when someone points out my mistake. |
| q20 | Greed | 正 | When dividing a reward, I look for a way to keep the larger share. |
| q21 | Envy | 正 | I wish I had what others show about their lives. |

### 计分、保存与恢复

- 正向题贡献 `v - 1`，反向题贡献 `(6 - v) - 1`。分别求和得到七个 0–12 的整数。按原始分排名，横条长度用 `score / 12`，可见文本同时给原始分与四舍五入百分比。例：Wrath 两道正题选 5、5，反题选 2，结果为 11/12，显示 92%。
- 最高与次高差为 0 或 1 时显示两项，否则只显示第一项。三项及以上同分时按上述固定 slug 顺序打破排序平局，标题最多两项。七条横条始终按固定展示顺序排列，让两人分数、卡片和屏幕上的行对应。
- 建议一个带版本的 localStorage 键保存 `{version, phase, cursor, answersById, invite}`；完成后可改存七项总分并清除逐题答案。刷新结果页按真实总分重建。只有路径与本人已完成结果第一项匹配才显示个人态。普通回访首页有草稿则续答，已完成则提供自己的结果入口并允许再次答题。`Retake` 清理本轮个人状态，从第一题开始。
- 读入时校验版本、题号、选项范围、草稿完整性与结果范围。无效存档恢复为可答的首题；存储不可用时当前标签页用内存完成，提示关闭后无法恢复。所有运算在设备内进行。页面说明用 “Your answers stay on this device.”；邀请按钮旁另说明会随链接分享七项总分。避免承诺 “nothing is stored”。

## 3. 结果模板 · 公开解读与个人成绩

1. **结果首屏**。顶部七色带用于建立七个维度的识别，主标题支持 `Pride + Envy` 换行。个人态紧跟 `You scored 11 of 12 on Wrath.`，双主导列出两项各自得分。公开态使用通用导语。页面标题按 slug 输出，例如 `Your Result: Wrath — 7 Deadly Sins Test`。
2. **七项分数**。每行依次放罪名、横条和 `11/12 · 92%`；数字用 tabular-nums。主导项加文字标识，颜色只作辅助。读屏标签读出名称和分数。窄屏允许缩短横条，数字保持可读。个人态标题区放一个直接复制分享文案的按钮，七行末尾提供两种图片按钮。
3. **广告位**。只在七条分数下方设一个插槽，位置同时满足首屏以下。首版交付插槽，无广告素材时收起；答题过程中没有广告请求。
4. **七项解读**。每个 slug 在 en.json 有 meaning（含义）、pattern（日常表现）、virtue（对应美德与一个可尝试的动作）及 summary（一句摘要）。主导项三段完整展开，双主导两项都展开；其余每项都显示一句摘要及链接，可在本页展开读完三段。公开页同样将当前罪的三段和其余六条内链写入静态 HTML。用第二人称描述可能出现的行为，避免给人格定性。
5. **继续操作**。个人态给 `Retake` 和 `Compare with a friend`。带有效邀请完成时，将比较区放在分数区后、长篇解读前，锚点可从标题区到达。公开页给 `Take the test`。

| 维度 | 解读围绕的日常行为 | 对应美德和可落地的小动作 |
| --- | --- | --- |
| Pride | 被纠正时急于辩护 | Humility · 先复述对方指出的问题 |
| Greed | 分配资源时想多留一份 | Generosity · 主动分出一份有用的资源 |
| Lust | 吸引力打乱原有安排 | Chastity · 行动前确认自己的意愿与彼此的边界 |
| Envy | 看到别人的进展后贬低自己的努力 | Kindness · 真诚祝贺对方一个具体进展 |
| Gluttony | 满足后仍习惯性地继续 | Temperance · 再拿一份之前停一下 |
| Wrath | 争执结束后仍反复回想 | Patience · 回复前留出一次慢呼吸 |
| Sloth | 等到有动力才开始 | Diligence · 先做两分钟能完成的第一步 |

## 4. 分享回流 · 交付表

| 功能 | 规格与实现动作 | 优先级 |
| --- | --- | --- |
| 竖版分享卡 | Canvas 1080×1920 PNG。上部放站名与主导罪，中部七条成绩，下部放可读的正式域名与答题路径。以第一主导项配色，双主导写全两项。复用计分结果，使用本地字体，按实际像素绘制 | 最先做 |
| 方形卡 | Canvas 1080×1080 PNG，供 X / Facebook / WhatsApp。独立计算七行间距、标题换行和页脚、安全边距。两种尺寸共用数据与颜色映射 | 最先做 |
| 一键复制文案 | 例：`I'm Wrath (11/12). Which deadly sin are you?` 加对应公开结果页绝对链接。双主导模板分别插入两项分数。复制成功才显示确认；剪贴板不可用时展示可选中的完整文本 | 最先做 |
| 好友对比 | 邀请动作复制或分享 `/?vs={第一主导罪}#s={七项总分}`。例如 `/?vs=wrath#s=4.6.3.5.2.11.7`。片段只承载派生总分。接收方完成后按罪名逐行并排显示 You / Friend 两根条与各自的数值，双方主导项单独标记 | 其次 |
| 埋点 | 实现 start、complete、share_click、share_success、compare 五种浏览器事件。细则见下。首版用本地监听器验收 | 其次 |
| 结果永久链接 | 无用户 ID、后端记录或个人结果查询接口；公开结果链接长期指向相应罪名解读页 | 不做 |

**图片交付动作**：结果可用时准备 Blob，支持文件分享的浏览器在按钮的用户手势中调用系统分享，否则直接下载相应 PNG。生成失败保留重试与复制入口。按钮打开系统分享面板后，用户取消应留在原页。以调用绘图到得到可用 PNG Blob 的耗时验收两种尺寸，不计用户操作系统分享面板的时间。

**邀请数据契约**：按第 1 节固定顺序读写七项，严格校验长度、0–12 整数及第一主导项与 vs 的一致性。合法邀请保存在草稿中以支持关页续答；无效或缺失分数仅使用合法的 vs 罪名，非法 vs 回到普通测验。接收者可看到链接里的七项成绩，不能凭单个罪名反推出七项。普通分享与好友邀请分别使用公开结果 URL 和带上下文的答题 URL。

**埋点触发口径**：一次答题首次有效作答发 start，首次完成发 complete，刷新与恢复不重发。每次主动复制、导图或邀请发 share_click，成功写入剪贴板、系统分享成功返回或触发文件下载后发 share_success，并用 method 区分；下载只计浏览器已发起。取消或失败不计成功。真实双方七项首次同屏发 compare。事件参数限 action、method 和卡片尺寸等操作信息，不携带答案、分数、邀请 URL、用户标识。浏览器事件可用测试监听器验证；跨用户汇总需另行确定采集方案。

## 5. 开发顺序与交付边界

| 工单 | 依赖 | 执行内容与可交付物 | 完成标志 |
| --- | --- | --- | --- |
| A · 静态骨架与内容 | 无 | 建立静态构建入口、站点 URL 配置、locale 路径函数和 en.json；录入题库与七组解读，生成首页与七份结果 HTML | 无 JS 直开七页可读；检查全部翻译键有值，页面内链可达 |
| B · 答题与计分 | A | 实现纯函数计分、排序、题序约束检查；接入单题视图、键盘、持久化和恢复 | 21 次选择自动出结果；返回修改、关闭重开、分数边界与平局用例通过 |
| C · 个人结果 | A、B | 复用公开模板加入个人态、双主导、七行分数、解读展开、广告插槽和重测 | 干净浏览器直访与完成后的同一 URL 各显示正确状态 |
| D · 卡片与复制 | C | 生成两种 Canvas 布局，接入复制、文件分享和下载降级 | 在手机验收两张实际 PNG、URL、最长标题和复制文案 |
| E · 邀请对比与埋点 | B、C、D | 实现邀请编码解码、续答、同屏对比和五种事件 | 两个隔离的浏览器上下文跑通分享回流，失败、取消、参数损坏均可继续答题 |
| F · 发布验收 | A–E | 对生产构建执行下列用例，记录 URL、设备、实测值与失败项 | 每项有截图、检测输出或可重复的测试记录 |

可按 `src/locales/`（文案）、`src/quiz/`（题目映射、评分与存档）、`src/pages/`（首页与结果模板）、`src/share/`（绘图与邀请）分工。首版范围止于上表；账号、排行榜、AI 即时解读、评论、邮件弹窗、后端计分及其他语言留待后续决策。第二语言由分国家搜索量与当地同类产品质量决定，发布该语言时同步加互指 hreflang。

## 6. 验收清单

| 场景 | 操作与通过标准 |
| --- | --- |
| 完成路径 | 用手机从首次进入首页起按自然阅读速度答完，计时至结果可见 ≤180 秒。到结果恰好 21 次选择，再点一次复制即完成首次分享，共 22 次站内操作 |
| 手机与键盘 | 390×667 和 390×844 CSS px 下，第一题五项完整可见，各高 52px，无横向滚动；验证长题干、焦点、1–5、←、连续快速点击及减少动态效果 |
| 题序与分数 | 校验共 21 个唯一 ID，各罪 3 题且恰 1 题反向，前三题维度互异、相邻不重复。全选 5 时七项均 8，全选 1 时均 4；构造 0/12、12/12、最高差 0/1/2 和三方同分；核对页面、卡片、邀请三处一致 |
| 恢复 | 第 7 题作答后立即关页，重开显示第 8 题；回到第 7 题修改，最终结果只计更新值一次。损坏存档及禁用存储可完成本轮；重测从空白第一题开始 |
| 静态与 SEO | 直接请求七个干净结果 URL（含 /result/wrath）均为 200。检查原始 HTML 的独立 title、description、H1、自引用 canonical、三段正文和六条有效内链。首页及结果页只输出基础 WebSite / WebPage 标记；邀请参数不进入 canonical 或 sitemap |
| 分享导出 | 在移动端生产构建首次生成竖版和方形卡，分别记录耗时，均 ≤2 秒。读取 PNG 尺寸；七行数值、站名、URL、双主导标题不裁切。验证实际复制、原生分享及下载降级 |
| 好友回流 | A 得 Wrath 11/12，发邀请给无存档的 B。B 中途退出再完成，对比区七项逐行匹配 A、B 各自原值。测试只有 vs、分数损坏、已有本人结果三个入口；浏览器事件按约定触发 |
| 性能与设计检查 | 在生产静态构建上对首页、公开结果页跑 Lighthouse 移动端各三次，分别记录中位数，Performance 各 ≥90；另检查个人态、对比态的布局和对比度。运行交付环境指定的 design / SEO 引擎，两类警告均为 0；当前尚无指定引擎，交付时记录工具名、版本和输出，未运行项标为未验证 |
| 数据边界 | 检查浏览器网络、Cookie 与存储：答题、刷新与完成无答案上传、无后端计分、无 Cookie；仅本设备保存进度。显式邀请可从链接片段读取七项总分 |
