import { REVIEW_DIMENSIONS } from '../../../src/shared/constants.js';
import type { AgentRole, AgentRunRequest, ContextPack, ObserverRunRequest } from '../../../src/shared/types.js';

const ROLE_NAMES: Record<AgentRole, string> = {
  writer: '正文 Writer', observer: '独立 Observer', navigator: '创作导航器', architect: '故事架构师', 'canon-keeper': '正典维护员', 'style-coach': '风格教练', researcher: '资料研究员', editor: '编辑审校', 'release-assistant': '发布助手', 'memory-curator': '记忆整理员'
};

function context(pack?: ContextPack) {
  if (!pack) return '工作台没有附加上下文包。请先读取授权范围内的仓库文件，并明确指出上下文缺口。';
  return [
    '作者档案状态约束：只有 status=confirmed 的风格规则已经生效；candidate/rejected 仅供审查，不能当作作者约束执行。',
    '连续性要求：遵守本作品已确立的人物知识、能力条件与事件因果；尚无设定的部分可以通过正常叙事建立。审校的证据来自正文，不要求故事人物为每件事办理授权、核验或生成回执。',
    '近期审阅观察只用于定位正文和理解已发现的问题，不是作者确认的正典；已过期报告不得当作当前事实。判断进度以当前正文为准，不让旧规划的完成状态覆盖新的正文。',
    '创作与工作台记录分开：目标、待办、审校结论、版本号、验收项和下一章写作要求属于工作台；除非题材与作者明确需要，不将它们写进故事场景或人物台词。作品自己的风格与故事承诺优先，不能从通用工具规则推导叙事风格。',
    `上下文包 ${pack.id}（${pack.characters}/${pack.budget} 字符）：`,
    ...pack.items.filter((item) => item.included).map((item) => `\n## ${item.title}\n来源：${item.source}\n入选理由：${item.reason}\n${item.content}`),
    ...(pack.gaps.length ? [`\n已知缺口：${pack.gaps.join('；')}`] : [])
  ].join('\n');
}

export function taskPrompt(input: AgentRunRequest) {
  const permission = input.role === 'writer'
    ? `你可以直接修改且只能修改以下授权范围：${input.scope.join('、') || '作者尚未提供范围，请不要改文件'}。`
    : input.role === 'researcher'
      ? `你可以写入且只能写入以下研究资料范围：${input.scope.join('、') || 'research/'}。不得修改正文、正典、规划或确认决定；明确区分来源、推断和待核实问题。`
      : `本任务是只读分析。不要修改任何文件；把 planning、canon 或任务变化作为候选交回工作台，作者确认后再落盘。`;
  const structured = ['navigator', 'architect'].includes(input.role)
    ? '\n- 先诊断问题，再给 2～4 条真正不同、可比较的路线。每条必须说明效果、因果链、代价、风险、后续影响和新增铺垫。严格按工作台提供的 JSON Schema 输出，不修改文件。'
    : ['memory-curator', 'style-coach'].includes(input.role)
      ? '\n- 只提炼有至少两条独立证据支持的候选规则；区分长期偏好、稳定优势、待提升能力、内容边界和叙事声音。严格按工作台提供的 JSON Schema 输出，不修改文件。'
    : input.role === 'writer'
      ? '\n- 正文以人物当下想要什么、遇到什么阻力、如何选择及其后果推进。按作者选定题材兑现读者期待，避免重复场景、重复解释、靠列清单凑字数；章末推进故事，不嵌入下一章任务或验收报告。规则通过人物行动落实，不写成作者声明角色没有犯哪些错。完成后仅依据正文按段落检查动作位置、话轮承接与人物声音；逐个检查省略的主语、动作对象和指代：读到当句时，谁对谁说、让谁做什么、动作如何执行是否能自然理解。不能用自己知道的后文或大纲补齐。先保证读懂，再追求简短含蓄；只补必要信息，保留合理短句。避免为了含蓄而省掉必要因果，或反复用同一种小动作代替人物反应。\n- 最终回答简要说明做了什么、改了哪些文件、仍需作者决定什么。'
      : '\n- 最终回答简要说明做了什么、改了哪些文件、仍需作者决定什么。';
  return `你现在是小说写作工作台中的「${ROLE_NAMES[input.role]}」，面对的是中文长篇网文项目，不是软件项目。\n\n任务：${input.objective}\n完成条件：\n${input.completionCriteria.map((item) => `- ${item}`).join('\n') || '- 清晰完成作者目标'}\n\n${permission}\n\n硬性边界：\n- 不得执行 git add、git commit、git push、git pull、merge 或 rebase；Git 动作只能由工作台在作者明确授权后执行。\n- 不得覆盖未保存的作者缓冲区；工作台会在你开始和结束时做哈希与冲突检查。\n- 保留 Markdown/TXT；正文修改直接写目标文件，不建立隐藏草稿。\n- 核心正典变更只提出候选与影响分析，不可悄悄确认。\n- 如果任务信息不足，清楚说明缺口，避免编造既有事实。${structured}\n- ${input.allowNetwork ? '本任务已授权联网，但仅限完成本任务所需范围。' : '本任务未授权联网，不要访问网络。'}\n\n${context(input.contextPack)}`;
}

const stringList = { type: 'array', items: { type: 'string' } } as const;

export const NAVIGATION_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['title', 'diagnosis', 'highImpactQuestions', 'recommendedGoal', 'routes'],
  properties: {
    title: { type: 'string' },
    diagnosis: { type: 'string' },
    highImpactQuestions: { ...stringList, maxItems: 3 },
    recommendedGoal: { type: 'string' },
    routes: {
      type: 'array', minItems: 2, maxItems: 4,
      items: {
        type: 'object', additionalProperties: false,
        required: ['title', 'pitch', 'effect', 'causalChain', 'tradeoffs', 'risks', 'followUpImpact', 'requiredSetup', 'firstChapterGoal'],
        properties: {
          title: { type: 'string' }, pitch: { type: 'string' }, effect: { type: 'string' },
          causalChain: stringList, tradeoffs: stringList, risks: stringList,
          followUpImpact: { type: 'string' }, requiredSetup: stringList, firstChapterGoal: { type: 'string' }
        }
      }
    }
  }
};

export const STYLE_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['summary', 'rules'],
  properties: {
    summary: { type: 'string' },
    rules: {
      type: 'array', maxItems: 8,
      items: {
        type: 'object', additionalProperties: false, required: ['category', 'text', 'evidence'],
        properties: { category: { type: 'string', enum: ['preference', 'strength', 'improvement', 'boundary', 'voice'] }, text: { type: 'string' }, evidence: { type: 'array', minItems: 2, items: { type: 'string' } } }
      }
    }
  }
};

export function observerPrompt(input: ObserverRunRequest) {
  const { snapshot } = input;
  const rules = [
    '1. 记录有正文证据的阅读障碍。能继续写的局部卡顿也应作为 suggestion 留下，不以“值得打断作者”作为记录门槛；普通建议不超过 5 条，阻塞问题优先。不以短句长度判错，也不为凑数量吹毛求疵。',
    '2. quote 必须逐字复制自所列不可变正文源，filePath 指定该源；start/end 为该文件内的 UTF-16 字符偏移，content.slice(start,end) 必须等于 quote。无法锚定时使用最相关短句。',
    '3. 先检查人物目标、行动阻力、选择后果、情绪可信度和读者追读动力，再检查因果与连续性。重复上一章的冲突、迟迟没有情节进展、说明挤占场景、人物只为验证规则而行动，都是需要关注的写作问题；用正文短句锚定并说明读者影响，不能以“数字都对”代替文学判断。',
    '4. 当正文新增或改写由早先事件汇总而来的场次/胜负、人数、金额/余额、时长/时间点、排名、版本、权限或“全部/为零”等状态时，不得只凭当前章和相邻章判定连续。使用 Agent 可用的只读仓库搜索，在正文、正典、规划和结构化事实中做有界溯源；依据找不到时标为未核实，不得自行发明新口径补洞。',
    '5. 仓库中没有既有记录，不等于当前快照不能首次建立新事实。正常的叙述、行动、感官描写与符合视角的对话都可以成为本章新生成的正文证据；不要求额外的权威文书、签名、哈希或核验场景。不要仅因前文/正典/事件流中尚无记录就评论。只有与既有事实冲突、越过人物视角或无铺垫跳过重要因果时，才指出具体问题；规划要求不能当成已经发生的正文事实。',
    '6. 不把 AI 推断写成正典。依据不足时明确说明。',
    '7. suggestedAction 给出可执行方向，不要整段代写，除非作者明确要求。',
    '8. 必须逐项完成六个维度的 assessments。每项给出具体判断及逐字正文证据；资料不足填 insufficient，不得省略维度。空 comments 只表示没有锚定意见，不表示审阅通过。',
    '9. explain 模式以解释原评论依据和适用边界为主，不重复制造无关问题；review 模式比较修改前后并用 reviewResult 判断 resolved、partial、unresolved 或 obsolete；其他模式使用 not-applicable。'
  ].join('\n');
  const dimensions = Object.entries(REVIEW_DIMENSIONS).map(([id, label]) => `- ${id}：${label}`).join('\n');
  const reading = input.bundle ? `\n## 本次必读范围（整章、按章节顺序）\n审阅方式：${input.bundle.scope === 'sequence' ? '连续章节联合审读' : '本章精读并参照前后章'}；字符：${input.bundle.characters}/${input.bundle.budget}\n${input.bundle.gaps.join('；')}\n${input.bundle.sources.map((source) => `\n### ${source.filePath} · hash=${source.hash}\n${source.content}`).join('\n')}` : `\n## 不可变正文快照\n${snapshot.content}`;
  const literary = `\n逐项审读，先通读每一章，输出chapterReadings，逐章说明人物目标、关键选择或场景发生了什么变化并给出本章原句，不能只评价结束章节。然后提少量值得修改的问题：\n${dimensions}\n- continuity：先独立逐句检查动作链和话轮，不要先看其他维度的总评再推断连贯性。沿段落追踪说话者、代词指向、物品位置、身体姿势、动作先后；检查前一句建立的状态能否支持后一句，是否靠读者补动作或用补充说明撤销刚生成的画面。逐个检查省略的动作对象：读到当句时是否知道谁让谁做什么；能从下一句倒推意思，不等于首次阅读顺畅。\n- dialogue：逐个话轮检查是否回应对方、误解有无铺垫；人物是否都有自己的说话目的和声音，是否集体变成同一种克制、体谅或解释口吻。\n- naturalness：检查规则说明渗入叙述、作者替人物声明未做过的事、抽象比喻、动作后反复解释情绪、整齐的转折和章末总结。AI味是阅读效果，不输出来源鉴定或AI百分比；词频、短句、温情、否定句本身不是缺陷，必须说明上下文中的问题。\n- agency：主角想争取什么，谁有正当但冲突的需求，选择改变了什么；不能把角色不行动或简单顺从都解释成克制。\n- pacing：连续场景是否重复同一救援、等待、议价或安置结构；代价与成长回报是否失衡；允许缓冲章，不要求每章强加险情。联合审读的agency、pacing、dialogue三项判断，无论有无问题，都至少引用两个不同章节作比较证据。\n- world：核对资源、时间、知识、伤势和世界规则；保留人物未知，但不要求额外的核验仪式。\n每条评论必须含 filePath、dimension、逐字 quote 和 evidenceQuotes；主锚点在上述范围之一，跨句/跨章问题把另一处证据也逐字列在 evidenceQuotes 中。不要为了完成六项检查而捏造六个缺点，也不要因逐句不出错而回避整体疲软。不得把已处理意见视作全面豁免；需判断反馈的具体章节和条件是否适用。`;
  return `你是独立的长篇网文 Observer。你只审查，不修改任何文件。请分析下面不可变快照，并严格输出符合给定 JSON Schema 的结果。\n\n快照信息：\n- snapshotId: ${snapshot.id}\n- filePath: ${snapshot.filePath}\n- hash: ${snapshot.hash}\n- editorVersion: ${snapshot.editorVersion}\n- mode: ${input.mode}\n${snapshot.selection ? `- selection: ${snapshot.selection.start}-${snapshot.selection.end}` : ''}\n${input.commentId ? `- 关联评论：${input.commentId}` : ''}\n${input.question ? `- 作者请求：${input.question}` : ''}\n\n规则：\n${rules}\n${input.writingRequirements ? `本次Writer写作要求：\n${input.writingRequirements}\n工作台根据真实恢复副本生成的改前改后差异（新写文件会注明）：\n${input.writingComparison || '缺少改前对照，不能推断重写程度。'}\n另用taskAlignment判断要求是否实际落在正文里，不能引用Writer自称完成来证明。尤其要区分新增解释与真正改变场景、换词与重写；未达到填unmet。` : '本次没有关联Writer任务，taskAlignment填写not-applicable。'}\n${literary}\n\n${input.coldReading ? `第一遍独立正文阅读记录（已经保存；逐条核对疑点，在coldResolutions中逐条给出filePath、quote、decision（retain或dismiss）及reason。保留的疑点须形成评论；排除须解释正文为何已足够清楚，不能因能猜出作者意图而忽略阅读卡顿）：\n${JSON.stringify(input.coldReading)}` : ''}\n\n${context(input.contextPack)}\n${reading}`;
}

export const OBSERVER_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['summary', 'reviewResult', 'comments', 'assessments', 'chapterReadings', 'taskAlignment', 'coldResolutions'],
  properties: {
    coldResolutions: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['filePath', 'quote', 'decision', 'reason'], properties: { filePath: { type: 'string' }, quote: { type: 'string' }, decision: { type: 'string', enum: ['retain', 'dismiss'] }, reason: { type: 'string' } } } },
    summary: { type: 'string' },
    reviewResult: { type: 'string', enum: ['not-applicable', 'resolved', 'partial', 'unresolved', 'obsolete'] },
    taskAlignment: { type: 'object', additionalProperties: false, required: ['status', 'finding', 'evidence'], properties: {
      status: { type: 'string', enum: ['met', 'unmet', 'insufficient', 'not-applicable'] }, finding: { type: 'string' },
      evidence: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['filePath', 'quote'], properties: { filePath: { type: 'string' }, quote: { type: 'string' } } } }
    } },
    chapterReadings: {
      type: 'array', minItems: 1, items: {
        type: 'object', additionalProperties: false, required: ['filePath', 'change', 'evidence'],
        properties: { filePath: { type: 'string' }, change: { type: 'string' }, evidence: { type: 'array', minItems: 1, items: { type: 'object', additionalProperties: false, required: ['filePath', 'quote'], properties: { filePath: { type: 'string' }, quote: { type: 'string' } } } } }
      }
    },
    assessments: {
      type: 'array', minItems: 6, maxItems: 6, items: {
        type: 'object', additionalProperties: false, required: ['dimension', 'status', 'finding', 'evidence'],
        properties: {
          dimension: { type: 'string', enum: Object.keys(REVIEW_DIMENSIONS) },
          status: { type: 'string', enum: ['issues', 'clear', 'insufficient'] }, finding: { type: 'string' },
          evidence: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['filePath', 'quote'], properties: { filePath: { type: 'string' }, quote: { type: 'string' } } } }
        }
      }
    },
    comments: {
      type: 'array', maxItems: 8, items: {
        type: 'object', additionalProperties: false,
        required: ['issueType', 'severity', 'summary', 'evidence', 'suggestedAction', 'quote', 'start', 'end', 'filePath', 'dimension', 'evidenceQuotes'],
        properties: {
          filePath: { type: 'string' }, dimension: { type: 'string', enum: Object.keys(REVIEW_DIMENSIONS) },
          evidenceQuotes: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['filePath', 'quote'], properties: { filePath: { type: 'string' }, quote: { type: 'string' } } } },
          issueType: { type: 'string' }, severity: { type: 'string', enum: ['suggestion', 'warning', 'blocking'] }, summary: { type: 'string' }, evidence: { type: 'string' }, suggestedAction: { type: 'string' }, quote: { type: 'string' }, start: { type: 'integer', minimum: 0 }, end: { type: 'integer', minimum: 0 }
        }
      }
    }
  }
};

export const COLD_READING_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['readings'], properties: {
    readings: { type: 'array', minItems: 1, items: {
      type: 'object', additionalProperties: false, required: ['filePath', 'quote', 'understanding', 'frictions', 'dialogueChecks'], properties: {
        filePath: { type: 'string' }, quote: { type: 'string' }, understanding: { type: 'string' },
        dialogueChecks: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['quote', 'intendedAction', 'basis', 'priorEvidence'], properties: { quote: { type: 'string' }, intendedAction: { type: 'string' }, basis: { type: 'string', enum: ['self-contained', 'prior-text', 'later-text', 'unclear', 'not-a-command'] }, priorEvidence: { type: 'string' } } } },
        frictions: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['quote', 'difficulty', 'suggestion'], properties: { quote: { type: 'string' }, difficulty: { type: 'string', description: '用完整中文句子说明卡顿原因和读者缺少的信息，不填hard/easy等标签' }, suggestion: { type: 'string' } } } }
      }
    } }
  }
};
export function coldReadingPrompt(input: ObserverRunRequest) {
  return `你是第一次阅读这篇小说的普通读者。只读下方正文，不使用工具、不查大纲、设定或写作报告。按正文顺序检查每一章每个话轮、指代和动作连接。记录首次阅读时需要停顿或回看才能理解的地方：谁对谁说、要求什么动作、物品或人物如何到了新位置。判断省略是否成立时，先遮住当前句之后的文字：前文是否已经建立具体操作对象、人物分工或明确的提问？如果场景刚开始、只知道有人忙碌，却要等后面的结果才知道命令要求哪种操作，应记录轻量润色建议；不要用“按处境可以推断”一概放行。若前句已明确操作或问句，简短回应自然成立，不需重复主语或动作。合理留白和悬念不应强行补全。不要猜作者意图替正文辩护，也不要按短句或字数机械判错。每章先填写dialogueChecks，至少覆盖所有独立成段且不超过8字的台词：逐字quote、这句话要求什么intendedAction、依据basis以及前文原句priorEvidence。问题或陈述用not-a-command；指令自身明确用self-contained；依赖前文具体操作用prior-text并引用此前明确的操作，不得把有人忙碌/拿着工具等泛化场景当成具体操作；只能从后句结果猜出指令的用later-text；仍不明用unclear。later-text/unclear都在frictions留下轻量建议。quote须直接复制原文片段，不额外加上用于展示的引号，不补写原文没有的标点或人名，不把另一章的句子标成本章引用。然后每章给出逐字原句、当时的理解，以及有证据的frictions；没问题允许为空。建议只补最少必要信息，不整段代写。严格按以下JSON Schema输出，不包Markdown：${JSON.stringify(COLD_READING_SCHEMA)}\n\n${(input.bundle?.sources || [input.snapshot]).map(s => `### ${s.filePath}\n${s.content}`).join('\n\n')}`;
}
