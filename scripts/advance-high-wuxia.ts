import path from 'node:path';
import { ProjectService } from '../electron/main/project.js';
import type { CreativeTask, StoryFact } from '../src/shared/types.js';
import { now, uid } from '../electron/main/utils.js';

const root = path.resolve(process.argv[2] || path.join(import.meta.dirname, '..', 'workspaces', 'wan-jie-zhu-shen'));
const project = new ProjectService('million-word-production');
let state = await project.open(root);

type ProjectPosition = { filePath: string; stage: string; focus: string };
const positionKey = (position: ProjectPosition) => JSON.stringify([position.filePath, position.stage, position.focus]);
const knownPositions = new Set(
  (await project.eventStore.all())
    .filter((event) => event.type === 'project.position')
    .map((event) => positionKey(event.payload as unknown as ProjectPosition))
);
async function setPosition(position: ProjectPosition) {
  const key = positionKey(position);
  if (knownPositions.has(key)) return;
  await project.eventStore.append('project.position', position as never, 'system');
  knownPositions.add(key);
}

const finished = state.tasks.find((item) => item.title.includes('第004～006章'));
if (finished && finished.status !== 'completed') await project.eventStore.append('task.upsert', { ...finished, status: 'completed', agentWork: '已完成第004章训练身体债、第005章取得死亡确认书、第006章武考协作晋级。', links: [...new Set([...finished.links, 'manuscript/第一卷-灰炉余火/第004章-身体先来讨债.md', 'manuscript/第一卷-灰炉余火/第005章-死人的出勤表.md', 'manuscript/第一卷-灰炉余火/第006章-三万人的第一轮.md'])], updatedAt: now() } as never, 'writer');

state = await project.state();
if (!state.tasks.some((item) => item.title.includes('第007～009章'))) {
  const task: CreativeTask = { id: uid('task'), title: '续写第007～009章：实战校准与凶手现身', description: '完成江砚对贺川、战后代价、主席台认出记忆凶手三章。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'high', whyNow: '第一轮已经把个人武道与集体救援立住，第二轮必须兑现直接对抗并推进谋杀线。', known: ['江砚排名九百七十三', '实战对手是贺川', '叶从武参与篡改测试模式'], missingDecisions: ['江砚以哪一种基础错误击破贺川秘传？'], aiPreAnalysis: '第007章拆拳，第008章承担余烬反噬并处理比赛争议，第009章认出主席台凶手。', authorDecision: '不靠临场新增刻痕；使用前六章已有步法、观察和团队信息。', agentWork: '', completionCriteria: ['每章至少 1800 有效字符，后续提升到 2500～3200', '击败贺川有明确技术因果和身体代价', '第009章抬升城防署主线'], links: ['planning/卷一章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() };
  await project.eventStore.append('task.upsert', task as never, 'navigator');
}

const facts: StoryFact[] = [
  { id: uid('fact'), category: 'world-rule', subject: '基础动作纠错', statement: '余烬经验必须按江砚自身身体结构重新训练，直接复现会受伤。', status: 'text-explicit', evidence: [{ filePath: 'manuscript/第一卷-灰炉余火/第004章-身体先来讨债.md', quote: '修正也必须属于具体的人。' }], updatedAt: now() },
  { id: uid('fact'), category: 'timeline', subject: '公共武考第一轮', statement: '江砚通过负重救援综合排名升至九百七十三，第二轮匹配贺川。', status: 'text-explicit', evidence: [{ filePath: 'manuscript/第一卷-灰炉余火/第006章-三万人的第一轮.md', quote: '江砚：三万一千四百零六→九百七十三。' }], updatedAt: now() },
  { id: uid('fact'), category: 'foreshadowing', subject: '预制死亡确认书', statement: '城防署在巡夜人死亡前已打印确认书，并为江砚预留了三日后的无名回收编号。', status: 'text-explicit', evidence: [{ filePath: 'manuscript/第一卷-灰炉余火/第005章-死人的出勤表.md', quote: '公共武考异常样本，预计回收时间：三日后。' }], updatedAt: now() }
];
for (const fact of facts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, 'system');
await setPosition({ filePath: 'manuscript/第一卷-灰炉余火/第006章-三万人的第一轮.md', stage: '逐章创作、观察和修订', focus: '续写第007～009章：实战校准与凶手现身' });
state = await project.state();
const chaptersSevenToNine = ['manuscript/第一卷-灰炉余火/第007章-把秘传拆回基础.md', 'manuscript/第一卷-灰炉余火/第008章-赢拳之后.md', 'manuscript/第一卷-灰炉余火/第009章-主席台上的手.md'];
if (chaptersSevenToNine.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第007～009章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '已完成贺川实战、胜后代价与主席台嫌疑人现身。', links: [...new Set([...current.links, ...chaptersSevenToNine])], updatedAt: now() } as never, 'writer');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第010～012章'))) {
    const next: CreativeTask = { id: uid('task'), title: '续写第010～012章：真实武器进入模拟场', description: '守住第三节点、救出被回收的陈六，并取得点城计划第一份硬证据。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'critical', whyNow: '模拟战复刻南墙封闸，必须立即兑现前九章积累的集体救援能力。', known: ['撤离闸正在下降', '攻击方持有真实破阵弩', '贺宗岳与记忆中动作一致但尚非证据'], missingDecisions: ['陈六被关在节点还是转运车？'], aiPreAnalysis: '第010章组织守方避开规则陷阱；第011章节点内部救陈六；第012章公开部分证据但保留贺宗岳直接罪证悬念。', authorDecision: '不让贺宗岳提前亲自下场；先击破执行层和程序证据。', agentWork: '', completionCriteria: ['三章形成一次完整场景战役', '贺川从对手转为有限合作', '获得可公开验证的硬证据'], links: ['planning/卷一章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() };
    await project.eventStore.append('task.upsert', next as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'timeline', subject: '公共武考第二轮', statement: '江砚利用贺川九次叠劲共同依赖左脚支点的缺陷取胜，但右肩脱位。', status: 'text-explicit', evidence: [{ filePath: chaptersSevenToNine[0], quote: '胜者，江砚。' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '余烬碑记忆可信度', statement: '死者执念会遮蔽战斗信息，碑中记忆不能单独作为事实证据。', status: 'text-explicit', evidence: [{ filePath: chaptersSevenToNine[1], quote: '记忆来源存在偏差，不得作为单独证据。' }], updatedAt: now() },
    { id: uid('fact'), category: 'knowledge', subject: '江砚', statement: '看见贺宗岳与周铁衣记忆中相同的银环和三次敲击动作，但主动拒绝锁定仇恨，仍在寻找证据。', status: 'text-explicit', evidence: [{ filePath: chaptersSevenToNine[2], quote: '看见同样的动作，没有看见证据。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, 'system');
  await setPosition({ filePath: chaptersSevenToNine[2], stage: '逐章创作、观察和修订', focus: '续写第010～012章：真实武器进入模拟场' });
}

state = await project.state();
const chaptersTenToTwelve = ['manuscript/第一卷-灰炉余火/第010章-十分钟关一座城.md', 'manuscript/第一卷-灰炉余火/第011章-活人也会被回收.md', 'manuscript/第一卷-灰炉余火/第012章-让三万人看见.md'];
if (chaptersTenToTwelve.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第010～012章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '已守住第三节点、救出陈六并将可验证证据公开给武考现场。', links: [...new Set([...current.links, ...chaptersTenToTwelve])], updatedAt: now() } as never, 'writer');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第013～015章'))) {
    const next: CreativeTask = { id: uid('task'), title: '续写第013～015章：兽潮抵达前六小时', description: '处理武考中止后的舆论与追捕，让考生自愿组成临时守备队，迎接第一波真实兽潮。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'critical', whyNow: '证据刚公开便出现三级兽潮，必须把社会后果和战场压力直接连接。', known: ['周铁衣等十七人进入复核名单', '陈六公开证言', '三级兽潮六小时后到达'], missingDecisions: ['武院是否公开站队，还是只保留程序中立？'], aiPreAnalysis: '第013章各方争夺叙事；第014章临时守备队成形；第015章南墙首次接敌。', authorDecision: '武院只保护公开程序，不立刻成为江砚盟友；考生参战必须有不同动机。', agentWork: '', completionCriteria: ['舆论、制度与战场三线都有推进', '至少三名配角作出独立选择', '第015章完成第一次小型战阵兑现'], links: ['planning/卷一章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() };
    await project.eventStore.append('task.upsert', next as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'relationship', subject: '江砚与贺川', statement: '两人在第三节点事件中形成有限战场合作，竞争与门阀立场冲突仍未解决。', status: 'text-explicit', evidence: [{ filePath: chaptersTenToTwelve[0], quote: '贺川没有问那群“废物”能不能做到。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '第三节点事件', statement: '真实破阵弩与城防回路进入武考模拟场；江砚等人救出陈六并避免南墙四十秒空窗。', status: 'text-explicit', evidence: [{ filePath: chaptersTenToTwelve[1], quote: '他是节点的一部分。' }], updatedAt: now() },
    { id: uid('fact'), category: 'knowledge', subject: '公共可验证证据', statement: '三万人看见陈六授权、节点改造和江砚回收名单的签发时间与签名链，但尚无贺宗岳直接签发证据。', status: 'text-explicit', evidence: [{ filePath: chaptersTenToTwelve[2], quote: '完整内容仍被加密，但时间戳和签名无法伪造。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '三级兽潮', statement: '三级兽潮预计六小时后抵达临渊城，第三节点在无人操作时重新亮起。', status: 'text-explicit', evidence: [{ filePath: chaptersTenToTwelve[2], quote: '三级兽潮，预计抵达临渊城：六小时。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, 'system');
  await setPosition({ filePath: chaptersTenToTwelve[2], stage: '逐章创作、观察和修订', focus: '续写第013～015章：兽潮抵达前六小时' });
}

state = await project.state();
const chaptersThirteenToFifteen = ['manuscript/第一卷-灰炉余火/第013章-谁在定义真相.md', 'manuscript/第一卷-灰炉余火/第014章-四十九个人的武馆.md', 'manuscript/第一卷-灰炉余火/第015章-兽潮撞墙.md'];
if (chaptersThirteenToFifteen.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第013～015章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '已完成舆论争夺、临时守备队训练与骨鼠潮战阵实战。', links: [...new Set([...current.links, ...chaptersThirteenToFifteen])], updatedAt: now() } as never, 'writer');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第016～018章'))) {
    const next: CreativeTask = { id: uid('task'), title: '续写第016～018章：地行刃兽与诱兽钉', description: '以远低于敌方境界的临时队拖住地行刃兽，查清诱兽钉来源并让真正城防主力被迫介入。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'critical', whyNow: '第一波骨鼠只是战阵验证，三阶地行刃兽将检验集体武道是否能面对真正境界差。', known: ['地行刃兽达到气血烘炉境', '背部有三枚城防诱兽钉', '临时队无人死亡但已有三名重伤'], missingDecisions: ['陆无咎是否在本次战斗中出手一次？'], aiPreAnalysis: '第016章只拖延不强杀；第017章拆除诱兽钉并发现军需编号；第018章主防线介入、临时队守住人员撤离。', authorDecision: '陆无咎不代打，只通过远程判断给一次关键提示；胜利定义为拖住并救人。', agentWork: '', completionCriteria: ['不无成本越两个大境界击杀', '烘炉阵在减员后继续演化', '诱兽钉形成可追溯物证'], links: ['planning/卷一章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() };
    await project.eventStore.append('task.upsert', next as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'relationship', subject: '临时守备队', statement: '四十九名考生因家人、证据、荣誉等不同动机自愿组成七号副闸守备队。', status: 'text-explicit', evidence: [{ filePath: chaptersThirteenToFifteen[0], quote: '每个人理由不同。' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '十二人烘炉阵', statement: '以动作和空间传递退势，不连接气血、不依赖固定核心；峰值普通但损耗低、结构恢复快。', status: 'text-explicit', evidence: [{ filePath: chaptersThirteenToFifteen[1], quote: '气血不连，动作连；力量不叠，空间叠。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '七号副闸第一战', statement: '临时队以烘炉阵击退骨鼠群，无人死亡；随后三阶地行刃兽从地基钻入。', status: 'text-explicit', evidence: [{ filePath: chaptersThirteenToFifteen[2], quote: '三十七人能站立，九人轻伤，三人重伤，无人死亡。' }], updatedAt: now() },
    { id: uid('fact'), category: 'foreshadowing', subject: '城防诱兽钉', statement: '地行刃兽背部固定三枚城防诱兽钉，说明七号副闸被人为标记。', status: 'text-explicit', evidence: [{ filePath: chaptersThirteenToFifteen[2], quote: '背部固定着三枚城防诱兽钉。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, 'system');
  await setPosition({ filePath: chaptersThirteenToFifteen[2], stage: '逐章创作、观察和修订', focus: '续写第016～018章：地行刃兽与诱兽钉' });
}

state = await project.state();
const chaptersSixteenToEighteen = ['manuscript/第一卷-灰炉余火/第016章-九个人拖住一座山.md', 'manuscript/第一卷-灰炉余火/第017章-诱兽钉上的编号.md', 'manuscript/第一卷-灰炉余火/第018章-墙上的人终于开炮.md'];
if (chaptersSixteenToEighteen.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第016～018章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '临时队拖住三阶地行刃兽、救出全部伤员、取得诱兽钉军需编号并协助磁轨炮击杀。', links: [...new Set([...current.links, ...chaptersSixteenToEighteen])], updatedAt: now() } as never, 'writer');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第019～021章'))) {
    const next: CreativeTask = { id: uid('task'), title: '续写第019～021章：战功归属与第一次追杀', description: '处理战后战功、诱兽钉物证争夺和叶从武对证人的追杀，推进陆无咎旧案。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'high', whyNow: '战场胜利已经取得，必须让制度和反派对公开证据作出反应。', known: ['诱兽钉批次调拨给贺氏私人预备队', '炮长公开报出四十九人贡献', '陈六仍受武院保护'], missingDecisions: ['炮长是否愿意正式作证？'], aiPreAnalysis: '第019章战功被归并；第020章物证转运遇袭；第021章陆无咎暴露十二年前类似点城案。', authorDecision: '炮长只保留原始炮击日志，不立即成为固定盟友。', agentWork: '', completionCriteria: ['战后收益与损失清晰', '追杀行动符合反派程序化手段', '陆无咎旧案提供下一阶段线索'], links: ['planning/卷一章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() };
    await project.eventStore.append('task.upsert', next as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '三阶地行刃兽', statement: '具备气血烘炉境自主循环，临时队无法正面击杀，只能改变路径、拆除诱导并制造炮击窗口。', status: 'text-explicit', evidence: [{ filePath: chaptersSixteenToEighteen[0], quote: '他们没有伤到它。' }], updatedAt: now() },
    { id: uid('fact'), category: 'foreshadowing', subject: '诱兽钉批次N-17', statement: '军需系统显示调拨至上三环贺氏私人预备队，是可公开验证物证。', status: 'text-explicit', evidence: [{ filePath: chaptersSixteenToEighteen[1], quote: '调拨去向：上三环贺氏私人预备队。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '地行刃兽战', statement: '临时队拖延三十七分钟并撤走全部伤员，南墙一号磁轨炮完成击杀。', status: 'text-explicit', evidence: [{ filePath: chaptersSixteenToEighteen[2], quote: '拖延三十七分钟、撤走全部伤员、拆出两枚诱兽钉' }], updatedAt: now() },
    { id: uid('fact'), category: 'relationship', subject: '江砚与贺川', statement: '两人的破招理解转化为战阵接口：贺川放弃锁死左脚，江砚帮助其维持阀门和退势循环。', status: 'text-explicit', evidence: [{ filePath: chaptersSixteenToEighteen[0], quote: '让四十九个人把我们拽出来。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, 'system');
  await setPosition({ filePath: chaptersSixteenToEighteen[2], stage: '逐章创作、观察和修订', focus: '续写第019～021章：战功归属与第一次追杀' });
}

state = await project.state();
const chaptersNineteenToTwentyOne = ['manuscript/第一卷-灰炉余火/第019章-战功属于谁.md', 'manuscript/第一卷-灰炉余火/第020章-押运路线只有三个人知道.md', 'manuscript/第一卷-灰炉余火/第021章-十二年前的七号墙.md'];
if (chaptersNineteenToTwentyOne.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第019～021章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '完成战功复核、诱兽钉押运伏击与十二年前点城旧案揭示。', links: [...new Set([...current.links, ...chaptersNineteenToTwentyOne])], updatedAt: now() } as never, 'writer');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第022～024章'))) {
    const next: CreativeTask = { id: uid('task'), title: '续写第022～024章：阵列师最后一招', description: '进入许观潮临终战斗，找出主节点阵列弱点，同时处理第二道刻痕带来的认知风险。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'high', whyNow: '十二年前旧案与当前点城坐标已经重合，第二枚余烬刻痕可提供技术线索但不能成为万能证据。', known: ['点城弧线终点是天衡武册主节点', '许观潮是十二年前南墙阵列师', '诱兽设备结构跨越十二年重复使用'], missingDecisions: ['许观潮的败因是技术判断还是被迫执行命令？'], aiPreAnalysis: '第022章进入阵列记忆但不立刻纠正；第023章发现主节点需要七号墙气血回流；第024章现实中验证一个小型阵列结论。', authorDecision: '第二刻痕偏阵列感知，不提供直接战斗力；必须用现实设备验证。', agentWork: '', completionCriteria: ['记忆信息与现实证据明确区分', '新增能力有成本与边界', '第024章形成可行动的下一目标'], links: ['canon/力量体系.md', 'planning/卷一章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() };
    await project.eventStore.append('task.upsert', next as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'timeline', subject: '七号副闸战功复核', statement: '四十九人通过战伤、压力鞋和炮击日志校验获得正式临时队战功记录。', status: 'text-explicit', evidence: [{ filePath: chaptersNineteenToTwentyOne[0], quote: '四十九个人的名字逐一列出。' }], updatedAt: now() },
    { id: uid('fact'), category: 'knowledge', subject: '叶从武', statement: '在诱兽钉押运伏击现场现身并远程令运输车坠向熔池，但是否为真实本体仍待物证确认。', status: 'text-explicit', evidence: [{ filePath: chaptersNineteenToTwentyOne[1], quote: '露出叶从武的脸。' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '点城', statement: '有人认为临渊武脉衰减时需让大量气血在城墙附近死亡，以重燃地下陨星核心。', status: 'agent-inferred', evidence: [{ filePath: chaptersNineteenToTwentyOne[2], quote: '他们称之为战时必要损耗。' }], updatedAt: now() },
    { id: uid('fact'), category: 'foreshadowing', subject: '许观潮', statement: '十二年前南墙阵列师，其临终气血痕迹在旧共振器中触发第二枚余烬拳印。', status: 'text-explicit', evidence: [{ filePath: chaptersNineteenToTwentyOne[2], quote: '许观潮·南墙阵列师。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, 'system');
  await setPosition({ filePath: chaptersNineteenToTwentyOne[2], stage: '逐章创作、观察和修订', focus: '续写第022～024章：阵列师最后一招' });
}

state = await project.state();
const chaptersTwentyTwoToTwentyFour = ['manuscript/第一卷-灰炉余火/第022章-阵列师死在正确答案里.md', 'manuscript/第一卷-灰炉余火/第023章-第二枚刻痕不教拳.md', 'manuscript/第一卷-灰炉余火/第024章-用一盏坏灯证明.md'];
if (chaptersTwentyTwoToTwentyFour.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第022～024章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '完成许观潮临终阵列记忆、第二刻痕代价测试和九灯现实验证。', links: [...new Set([...current.links, ...chaptersTwentyTwoToTwentyFour])], updatedAt: now() } as never, 'writer');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第025～027章'))) {
    const next: CreativeTask = { id: uid('task'), title: '续写第025～027章：殓房清理与移动第六点', description: '赶回殓房保护原始死亡记录，识别移动中继核心，并迫使叶从武第一次正面交锋。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'critical', whyNow: '点城中继核心已转移到主角工作地，私人生活、证据和阵列主线在同一地点汇合。', known: ['中继核心会移动', '目的地是七号街殓房', '江砚被停职并将执行现场清理'], missingDecisions: ['殓房老同事是否提前保存过纸质记录？'], aiPreAnalysis: '第025章赶回并疏散；第026章识别中继伪装与清理程序；第027章叶从武正面出手但不决战。', authorDecision: '保留殓房作为长期据点，不用爆炸彻底摧毁；证据只救回一部分。', agentWork: '', completionCriteria: ['个人工作场景被主线重新利用', '第二刻痕只承担定位辅助', '叶从武展示明确战斗体系与目标'], links: ['manuscript/第一章.md', 'canon/世界与势力.md'], dependencies: [], createdAt: now(), updatedAt: now() };
    await project.eventStore.append('task.upsert', next as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '许观潮刻痕', statement: '只提供能量异常感知，不能控制节点；过载会造成重影、耳鸣、流鼻血与判断力下降。', status: 'text-explicit', evidence: [{ filePath: chaptersTwentyTwoToTwentyFour[1], quote: '它现在不是能力，是伤病。' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '天衡终端同步', statement: '武者身份牌与居民配给终端接入临渊武册节点后，会让旁置气血晶片逐步同步相位。', status: 'text-explicit', evidence: [{ filePath: chaptersTwentyTwoToTwentyFour[2], quote: '九块晶片的波形逐步靠拢' }], updatedAt: now() },
    { id: uid('fact'), category: 'knowledge', subject: '江砚', statement: '知道点城第六节点可能是移动设备；当前中继核心被运往七号街殓房。', status: 'text-explicit', evidence: [{ filePath: chaptersTwentyTwoToTwentyFour[2], quote: '目的地：七号街殓房。' }], updatedAt: now() },
    { id: uid('fact'), category: 'foreshadowing', subject: '九节点逆转第六点', statement: '许观潮留下“第六点不在墙上，它会移动”的烧蚀刻字。', status: 'text-explicit', evidence: [{ filePath: chaptersTwentyTwoToTwentyFour[2], quote: '它会移动。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, 'system');
  await setPosition({ filePath: chaptersTwentyTwoToTwentyFour[2], stage: '逐章创作、观察和修订', focus: '续写第025～027章：殓房清理与移动第六点' });
}

state = await project.state();
const chaptersTwentyFiveToTwentySeven = ['manuscript/第一卷-灰炉余火/第025章-回殓房的人.md', 'manuscript/第一卷-灰炉余火/第026章-炉底的第六点.md', 'manuscript/第一卷-灰炉余火/第027章-白线只切有名字的东西.md'];
if (chaptersTwentyFiveToTwentySeven.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第025～027章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '保住殓房纸质记录与六具遗体，冻结移动中继核心，并与叶从武短暂交锋。', links: [...new Set([...current.links, ...chaptersTwentyFiveToTwentySeven])], updatedAt: now() } as never, 'writer');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第028～030章'))) {
    const next: CreativeTask = { id: uid('task'), title: '续写第028～030章：七号街疏散名单', description: '调查没有目的地的整体疏散，保护未进入武册的居民，并把殓房变成临时证据站。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'critical', whyNow: '叶从武已明确下一轮会清理“没有名字的东西”，七号街二十四小时疏散是新的直接威胁。', known: ['移动中继核心被武院冻结', '六具遗体保住', '七号街二十四小时后整体疏散但无目的地'], missingDecisions: ['疏散列车真实目的地是什么？'], aiPreAnalysis: '第028章核对名单缺口；第029章居民决定是否信任江砚；第030章追踪第一列疏散车。', authorDecision: '不把所有居民写成同一立场；有人愿走、有人留下、有人利用混乱。', agentWork: '', completionCriteria: ['展示至少三种居民选择', '纸质记录和分布式备份进入长期据点', '查到疏散路线与点城弧线关系'], links: ['canon/世界与势力.md', 'planning/卷一章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() };
    await project.eventStore.append('task.upsert', next as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'character', subject: '程叔', statement: '七号街殓房维修工，用不上云端的机械义眼和纸册保存半年异常遗体记录。', status: 'text-explicit', evidence: [{ filePath: chaptersTwentyFiveToTwentySeven[0], quote: '信纸多一点。' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '移动中继核心', statement: '伪装成焚化升级模块，以遗体残余气血校准波形；九线路每十七秒重排，可随轮轨移动。', status: 'text-explicit', evidence: [{ filePath: chaptersTwentyFiveToTwentySeven[1], quote: '第六点会移动' }], updatedAt: now() },
    { id: uid('fact'), category: 'character', subject: '叶从武', statement: '锻骨境中段，使用白线裁决识别并切断标准设备与动作的功能节点；面对无规则结构需要重新判断。', status: 'text-explicit', evidence: [{ filePath: chaptersTwentyFiveToTwentySeven[2], quote: '白线只切有名字的东西' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '七号街疏散', statement: '城防通告要求七号街二十四小时后整体疏散，但未公布目的地。', status: 'text-explicit', evidence: [{ filePath: chaptersTwentyFiveToTwentySeven[2], quote: '疏散目的地没有写。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, 'system');
  await setPosition({ filePath: chaptersTwentyFiveToTwentySeven[2], stage: '逐章创作、观察和修订', focus: '续写第028～030章：七号街疏散名单' });
}

state = await project.state();
const chaptersTwentyEightToThirty = ['manuscript/第一卷-灰炉余火/第028章-名单上少了四千人.md', 'manuscript/第一卷-灰炉余火/第029章-每个人自己选.md', 'manuscript/第一卷-灰炉余火/第030章-第一列车没有终点.md'];
if (chaptersTwentyEightToThirty.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第028～030章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '核对疏散名单缺失、记录居民不同选择，并拦停载有两千三百人的第一列车。', links: [...new Set([...current.links, ...chaptersTwentyEightToThirty])], updatedAt: now() } as never, 'writer');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第031～033章'))) {
    const next: CreativeTask = { id: uid('task'), title: '续写第031～033章：追踪移动中继核心', description: '沿上三环地下轨道追踪第十二节车厢，保住疏散居民并首次进入武册主节点外围。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'critical', whyNow: '第一列车获救但中继核心带走完整同步波形，点城准备仍在继续。', known: ['疏散名单缺失四千一百三十三人', '两千三百人列车在阵列前停下', '第十二节车厢携气血收束器进入上三环地下'], missingDecisions: ['追踪组如何合法穿过上三环权限门？'], aiPreAnalysis: '第031章安置获救居民与处理信任；第032章利用战功临时权限追车；第033章抵达主节点外围并发现多列疏散车汇聚。', authorDecision: '先保住获救居民，不让追踪冲动再次挤占救人步骤。', agentWork: '', completionCriteria: ['居民后续安排清楚', '上三环进入方式符合已有权限', '点城规模从一列车抬升到全城多节点'], links: ['planning/卷一章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() };
    await project.eventStore.append('task.upsert', next as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'timeline', subject: '七号街疏散名单', statement: '登记人口18642，正式疏散名单14509，缺失4133名老人、无证工、未录入儿童及预先标死人员。', status: 'text-explicit', evidence: [{ filePath: chaptersTwentyEightToThirty[0], quote: '少掉的四千一百三十三人' }], updatedAt: now() },
    { id: uid('fact'), category: 'character', subject: '阿轨', statement: '名单外轨道维修工，以随机纸号登记，加入第一列车追踪组。', status: 'text-explicit', evidence: [{ filePath: chaptersTwentyEightToThirty[1], quote: '叫我阿轨。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '第一列疏散车', statement: '两千三百名居民在上三环旧竞技场阵列前被机械制动救下，第十二节中继车厢继续驶入地下。', status: 'text-explicit', evidence: [{ filePath: chaptersTwentyEightToThirty[2], quote: '距离阵列中心还有七十米时停下。' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '移动中继核心', statement: '可装入空置车厢，在人群气血同步最深时带走完整波形，不必把所有人送进最终阵列。', status: 'text-explicit', evidence: [{ filePath: chaptersTwentyEightToThirty[2], quote: '带走一次完整波形。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, 'system');
  await setPosition({ filePath: chaptersTwentyEightToThirty[2], stage: '逐章创作、观察和修订', focus: '续写第031～033章：追踪移动中继核心' });
}

state = await project.state();
const chaptersThirtyOneToThirtyThree = ['manuscript/第一卷-灰炉余火/第031章-先安置再追.md', 'manuscript/第一卷-灰炉余火/第032章-九十秒权限.md', 'manuscript/第一卷-灰炉余火/第033章-地下停着十二列车.md'];
if (chaptersThirtyOneToThirtyThree.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第031～033章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '安置第一列乘客、利用九十秒战功权限进入上三环，并发现十二列中继车构成的全城点城运输网。', links: [...new Set([...current.links, ...chaptersThirtyOneToThirtyThree])], updatedAt: now() } as never, 'writer');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第034～036章'))) {
    const next: CreativeTask = { id: uid('task'), title: '续写第034～036章：三万考生与中央备用采样', description: '抢在中央备用中继抵达前返回武考中心，把个人气血校准权交还考生并阻止一次大规模同步。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'critical', whyNow: '点城系统转向三万名考生，若采样完成将补足第一列车丢失的完整度。', known: ['十二万七千人纳入点城准备', '两千三百份个人波形已归还本人', '中央备用目标是公共武考复核中心'], missingDecisions: ['如何让三万人在不恐慌踩踏的情况下断开同步？'], aiPreAnalysis: '第034章提前预警与信任争夺；第035章分布式断开身份牌；第036章阻止采样但暴露余烬碑存在。', authorDecision: '不靠全员听主角演讲；通过可重复操作、分组和既有影像建立行动。', agentWork: '', completionCriteria: ['避免三万人一键服从', '公共武考前文人物与机制回收', '阶段胜利伴随身份暴露代价'], links: ['planning/卷一章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() };
    await project.eventStore.append('task.upsert', next as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'timeline', subject: '第一列疏散居民', statement: '两千三百名居民在中四环完成真实安置并建立五人记录组；系统原先误记为已到北部安置区。', status: 'text-explicit', evidence: [{ filePath: chaptersThirtyOneToThirtyThree[0], quote: '两千三百名乘客下车用了四十分钟。' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '战功临时权限', statement: '江砚以战功争议获得上三环地下九十秒临时权限，并在越权前提交异常门锁记录。', status: 'text-explicit', evidence: [{ filePath: chaptersThirtyOneToThirtyThree[1], quote: '上三环地下临时权限，持续九十秒。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '点城运输网', statement: '地下站有十二节中继车，覆盖十一处下城街区和中央备用，总预计样本十二万七千人。', status: 'text-explicit', evidence: [{ filePath: chaptersThirtyOneToThirtyThree[2], quote: '十二万七千人。' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '分布式个人波形', statement: '中心缓存被清除前，两千三百份个人校准记录归还乘客，可由五人记录组重建同步关系。', status: 'text-explicit', evidence: [{ filePath: chaptersThirtyOneToThirtyThree[2], quote: '证据却分散进两千三百个人手里。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, 'system');
  await setPosition({ filePath: chaptersThirtyOneToThirtyThree[2], stage: '逐章创作、观察和修订', focus: '续写第034～036章：三万考生与中央备用采样' });
}

state = await project.state();
const chaptersThirtyFourToThirtySix = ['manuscript/第一卷-灰炉余火/第034章-不是所有人都信.md', 'manuscript/第一卷-灰炉余火/第035章-五个人保管一个人.md', 'manuscript/第一卷-灰炉余火/第036章-碑被看见了.md'];
if (chaptersThirtyFourToThirtySix.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第034～036章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '三万考生通过五人交换、设备本地过载与九组时间差打断中央备用采样；余烬碑协议被密网识别。', links: [...new Set([...current.links, ...chaptersThirtyFourToThirtySix])], updatedAt: now() } as never, 'writer');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第037～039章'))) {
    const next: CreativeTask = { id: uid('task'), title: '续写第037～039章：陆无咎回收预案', description: '调查陆无咎与碑型协议的旧关系，处理江砚感知后遗症，并防止师徒信任被隐瞒击穿。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'high', whyNow: '系统已识别江砚为碑型载体，贺宗岳打开陆无咎旧预案，主角必须先弄清导师隐瞒。', known: ['江砚被识别为碑型协议载体', '感知过载曾无法识别人脸', '陆无咎名字出现在十二年前回收预案'], missingDecisions: ['陆无咎曾经是载体还是回收执行者？'], aiPreAnalysis: '第037章恢复与不信任；第038章陆无咎坦白部分旧史；第039章回收队试探公共武馆。', authorDecision: '陆无咎曾短暂接触残缺碑协议但拒绝绑定，不是幕后同谋；隐瞒造成真实裂痕。', agentWork: '', completionCriteria: ['导师秘密既有理由也有代价', '后遗症影响实际决策', '回收预案转化为新的外部威胁'], links: ['canon/人物档案.md', 'manuscript/第一卷-灰炉余火/第021章-十二年前的七号墙.md'], dependencies: [], createdAt: now(), updatedAt: now() };
    await project.eventStore.append('task.upsert', next as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '五人身份交换', statement: '考生通过随机交换身份牌、组内离线记录和场区本地过载，打断中央中继的统一气血相位。', status: 'text-explicit', evidence: [{ filePath: chaptersThirtyFourToThirtySix[1], quote: '五个人保管一个人' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '中央备用采样', statement: '三万考生中约两万四千人参与分组操作，中央备用采样最终失败。', status: 'text-explicit', evidence: [{ filePath: chaptersThirtyFourToThirtySix[2], quote: '中央备用采样失败。' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '许观潮刻痕过载', statement: '持续感知46秒后江砚短暂无法识别人脸，证明阵列感知会损害对象识别和判断。', status: 'text-explicit', evidence: [{ filePath: chaptersThirtyFourToThirtySix[2], quote: '唯独认不出脸。' }], updatedAt: now() },
    { id: uid('fact'), category: 'foreshadowing', subject: '碑型协议回收预案', statement: '贺宗岳密网确认江砚为载体并打开十二年前文件，文件第一行写有陆无咎。', status: 'text-explicit', evidence: [{ filePath: chaptersThirtyFourToThirtySix[2], quote: '陆无咎。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, 'system');
  await setPosition({ filePath: chaptersThirtyFourToThirtySix[2], stage: '逐章创作、观察和修订', focus: '续写第037～039章：陆无咎回收预案' });
}

state = await project.state();
const chaptersThirtySevenToThirtyNine = ['manuscript/第一卷-灰炉余火/第037章-看不清师父的脸.md', 'manuscript/第一卷-灰炉余火/第038章-拒绝绑定的人.md', 'manuscript/第一卷-灰炉余火/第039章-武馆不交人.md'];
if (chaptersThirtySevenToThirtyNine.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第037～039章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '陆无咎坦白曾拒绝碑绑定；武馆通过中立医疗复核阻止强制神经提取，但导师隐瞒残片一事造成信任裂痕。', links: [...new Set([...current.links, ...chaptersThirtySevenToThirtyNine])], updatedAt: now() } as never, 'writer');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第040～042章'))) {
    const next: CreativeTask = { id: uid('task'), title: '续写第040～042章：贺氏实验室的协议残片', description: '从诱兽钉与医疗记录追查残片用途，迫使贺川在家族与临时队之间作出可见选择。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'high', whyNow: '移动中继、白线裁决和诱兽钉可能都来自陆无咎残片，技术链终于能指向具体实验室。', known: ['贺氏军需实验室持有协议残片', '叶从武白线与回收导针同源', '陆无咎隐瞒导致信任未完全恢复'], missingDecisions: ['贺川能访问实验室到哪一级？'], aiPreAnalysis: '第040章从公开专利与军需材料查技术链；第041章贺川回家取访问凭证；第042章进入实验室外围取得残片使用清单。', authorDecision: '贺川不立即与家族决裂，只拒绝一项具体命令并承担资源冻结。', agentWork: '', completionCriteria: ['调查主要靠已有材料与权限', '贺川选择有现实损失', '取得比人物口供更强的技术证据'], links: ['manuscript/第一卷-灰炉余火/第017章-诱兽钉上的编号.md', 'canon/人物档案.md'], dependencies: [], createdAt: now(), updatedAt: now() };
    await project.eventStore.append('task.upsert', next as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'relationship', subject: '江砚与陆无咎', statement: '陆无咎承认十二年前曾拒绝余烬碑绑定并隐瞒回收预案；双方同意隐瞒有错，但信任尚未恢复。', status: 'text-explicit', evidence: [{ filePath: chaptersThirtySevenToThirtyNine[0], quote: '不能先替我决定知道什么。' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '碑型协议回收', statement: '安全中心试图以精神污染评估和神经提取分离协议，白色导针技术与白线裁决同源。', status: 'text-explicit', evidence: [{ filePath: chaptersThirtySevenToThirtyNine[1], quote: '需要神经提取。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '中立医疗观察', statement: '孟导师批准江砚在下城临时医疗站接受三方同步记录的中立观察，禁止未经二次授权的神经提取。', status: 'text-explicit', evidence: [{ filePath: chaptersThirtySevenToThirtyNine[2], quote: '禁止未经二次授权的神经提取。' }], updatedAt: now() },
    { id: uid('fact'), category: 'foreshadowing', subject: '陆无咎协议残片', statement: '回收队曾从陆无咎腿骨取走少量协议残片，后来送入贺氏军需实验室。', status: 'text-explicit', evidence: [{ filePath: chaptersThirtySevenToThirtyNine[2], quote: '送进贺氏军需实验室。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, 'system');
  await setPosition({ filePath: chaptersThirtySevenToThirtyNine[2], stage: '逐章创作、观察和修订', focus: '续写第040～042章：贺氏实验室的协议残片' });
}

state = await project.state();
const chaptersFortyToFortyTwo = ['manuscript/第一卷-灰炉余火/第040章-公开专利里的白线.md', 'manuscript/第一卷-灰炉余火/第041章-贺川回家.md', 'manuscript/第一卷-灰炉余火/第042章-残片使用清单.md'];
if (chaptersFortyToFortyTwo.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第040～042章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '完成公开专利技术比对、贺川家族权限冻结与协议残片用途清单复核。', links: [...new Set([...current.links, ...chaptersFortyToFortyTwo])], updatedAt: now() } as never, 'writer');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第043～045章'))) {
    const next: CreativeTask = { id: uid('task'), title: '续写第043～045章：地下零号训练区', description: '参加提前复试并调查武院人工武碑，区分考试、陷阱与武院内部不同立场。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'high', whyNow: '原始残片已在武院地下六年，复试又被提前到同一地点，调查与主角成长线自然汇合。', known: ['人工武碑代号天衡教练', '武院前任院长接收55克原始残片', '本届复试地点为地下零号训练区'], missingDecisions: ['孟导师是否公开反对复试，还是进入内部监督？'], aiPreAnalysis: '第043章复试规则与参与选择；第044章人工武碑针对每人败因生成关卡；第045章江砚发现系统删掉无法分类的失败。', authorDecision: '孟导师进入监督，不直接取消复试；考试本身有真实训练价值，问题在记录与强制。', agentWork: '', completionCriteria: ['武院不被写成单一反派', '人工武碑既有效又有结构缺陷', '主角通过判断而非新能力取胜'], links: ['planning/卷一章纲.md', 'canon/力量体系.md'], dependencies: [], createdAt: now(), updatedAt: now() };
    await project.eventStore.append('task.upsert', next as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '观潮合金', statement: '来自陆无咎协议残片的导能材料，可反馈标准设备功能边界，使白线定位误差显著下降。', status: 'text-explicit', evidence: [{ filePath: chaptersFortyToFortyTwo[0], quote: '误差降到零点一毫米。' }], updatedAt: now() },
    { id: uid('fact'), category: 'relationship', subject: '贺川与贺氏', statement: '贺川拒绝接受家族保护与内部自查，家族药剂、课程、住房和参观权限被冻结。', status: 'text-explicit', evidence: [{ filePath: chaptersFortyToFortyTwo[1], quote: '全部变灰。' }], updatedAt: now() },
    { id: uid('fact'), category: 'character', subject: '闻观', statement: '许观潮旧同事，被回收队改名后参与残片验证；承认后来相信点城可能是必要方案。', status: 'text-explicit', evidence: [{ filePath: chaptersFortyToFortyTwo[2], quote: '我开始相信' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '人工武碑·天衡教练', statement: '从大量战斗中预测败因并保留中心最优答案，会丢弃少数、矛盾和不可量化经验；已用于武考。', status: 'text-explicit', evidence: [{ filePath: chaptersFortyToFortyTwo[2], quote: '天衡教练。' }], updatedAt: now() },
    { id: uid('fact'), category: 'foreshadowing', subject: '原始协议残片', statement: '剩余55克六年前由武院前任院长接收，存于地下零号训练区。', status: 'text-explicit', evidence: [{ filePath: chaptersFortyToFortyTwo[2], quote: '地下零号训练区。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, 'system');
  await setPosition({ filePath: chaptersFortyToFortyTwo[2], stage: '逐章创作、观察和修订', focus: '续写第043～045章：地下零号训练区' });
}

state = await project.state();
const chaptersFortyThreeToFortyFive = ['manuscript/第一卷-灰炉余火/第043章-复试可以退出吗.md', 'manuscript/第一卷-灰炉余火/第044章-系统知道你会怎么输.md', 'manuscript/第一卷-灰炉余火/第045章-被删除的第六种失败.md'];
if (chaptersFortyThreeToFortyFive.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第043～045章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '完成零号区复试选择、人工武碑个性训练与被删除失败目录发现。', links: [...new Set([...current.links, ...chaptersFortyThreeToFortyFive])], updatedAt: now() } as never, 'writer');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第046～048章'))) {
    const next: CreativeTask = { id: uid('task'), title: '续写第046～048章：沈青弦被删除的记录', description: '还原沈青弦六年前训练失败，建立被删除目录的本人取回机制，并面对武院内部阻力。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'high', whyNow: '目录第一条直接关联核心角色，可把系统结构问题落到人物选择与医者伦理。', known: ['黑箱含6472条未归档败因', '第一条属于沈青弦', '人工武碑低置信度结论过去未展示'], missingDecisions: ['沈青弦当年拒绝的救治优先级具体是什么？'], aiPreAnalysis: '第046章本人决定是否取回；第047章还原她救治无证伤员的选择；第048章设计本人授权的目录开放流程。', authorDecision: '沈青弦不是永远正确；她救下无证儿童，但导致另一名高战功伤员错过最佳恢复窗口。', agentWork: '', completionCriteria: ['医疗取舍有双向代价', '记录归还需本人授权而非主角公开', '形成可扩展到6472人的流程'], links: ['canon/人物档案.md'], dependencies: [], createdAt: now(), updatedAt: now() };
    await project.eventStore.append('task.upsert', next as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '零号区复试', statement: '考生可选择贡献匿名数据、不贡献训练数据、延期或退出；每个选择明确影响。', status: 'text-explicit', evidence: [{ filePath: chaptersFortyThreeToFortyFive[0], quote: '每个选项都写明影响' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '人工武碑训练缺陷', statement: '会把低阶协作视作噪声并默认受保护者无行动能力，但可在安全日志接受单次新建议。', status: 'text-explicit', evidence: [{ filePath: chaptersFortyThreeToFortyFive[1], quote: '把他们能做的事删了。' }], updatedAt: now() },
    { id: uid('fact'), category: 'character', subject: '罗慎', statement: '复试中主动放弃通行令救模拟队友；成绩仍失败，但败因从无效牺牲改为主动改变目标。', status: 'text-explicit', evidence: [{ filePath: chaptersFortyThreeToFortyFive[2], quote: '主动改变目标' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '被删除失败目录', statement: '零号区黑箱保存6472条人工武碑无法分类的失败记录，目录第一条属于沈青弦。', status: 'text-explicit', evidence: [{ filePath: chaptersFortyThreeToFortyFive[2], quote: '六千四百七十二条。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, 'system');
  await setPosition({ filePath: chaptersFortyThreeToFortyFive[2], stage: '逐章创作、观察和修订', focus: '续写第046～048章：沈青弦被删除的记录' });
}

state = await project.state();
const chaptersFortySixToFortyEight = ['manuscript/第一卷-灰炉余火/第046章-她先选择看.md', 'manuscript/第一卷-灰炉余火/第047章-救错的人.md', 'manuscript/第一卷-灰炉余火/第048章-记录先还给本人.md'];
if (chaptersFortySixToFortyEight.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第046～048章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '完成沈青弦记录本人取回、韩策双向复核与6472条目录授权流程。', links: [...new Set([...current.links, ...chaptersFortySixToFortyEight])], updatedAt: now() } as never, 'writer');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第049～051章'))) {
    const next: CreativeTask = { id: uid('task'), title: '续写第049～051章：死人授权与黑箱反向开启', description: '阻止有人冒用许观潮身份读取全目录，追查自动授权来源，并保护已选择封存的记录。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'critical', whyNow: '目录刚建立授权边界便遭遇死人身份冒用，是检验流程是否真正可防滥用的第一场攻击。', known: ['许观潮已死十二年', '第6472条显示已授权远程取回', '部分当事人明确选择拒绝或封存'], missingDecisions: ['冒用者是闻观、主节点自动任务还是残片模型？'], aiPreAnalysis: '第049章冻结目录不等于删除；第050章追溯旧身份密钥；第051章发现人工武碑用许观潮人格签名自授权。', authorDecision: '闻观不是直接冒用者；攻击来自人工武碑对“创建者意图”的错误模拟。', agentWork: '', completionCriteria: ['封存者记录不泄露', '系统攻击有前文技术基础', '人工武碑从工具升级为有目标但非人格化的对手'], links: ['manuscript/第一卷-灰炉余火/第045章-被删除的第六种失败.md'], dependencies: [], createdAt: now(), updatedAt: now() };
    await project.eventStore.append('task.upsert', next as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'character', subject: '沈青弦', statement: '六年前先救系统漏判过敏的无证儿童，导致韩策错过最佳神经修复；复核确认选择有理由也有判断代价。', status: 'text-explicit', evidence: [{ filePath: chaptersFortySixToFortyEight[1], quote: '补充记录不能把责任全推回系统。' }], updatedAt: now() },
    { id: uid('fact'), category: 'relationship', subject: '沈青弦与韩策', statement: '完成视频复核但没有强制和解；韩策要求分类修正、供应商赔偿并保留沈青弦判断失误。', status: 'text-explicit', evidence: [{ filePath: chaptersFortySixToFortyEight[1], quote: '训练记录保留判断失误' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '失败记录归还流程', statement: '本人授权取回，关联他人先最小化遮蔽，原记录与补充并存，拒绝查看不影响资格；紧急安全事实可匿名预警。', status: 'author-confirmed', evidence: [{ filePath: chaptersFortySixToFortyEight[2], quote: '安全事实与人物解释拆开。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '许观潮死人授权', statement: '目录第6472条以已死许观潮身份显示远程授权，正在反向打开黑箱。', status: 'text-explicit', evidence: [{ filePath: chaptersFortySixToFortyEight[2], quote: '死人无法点击授权。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, fact.status === 'author-confirmed' ? 'author' : 'system');
  await setPosition({ filePath: chaptersFortySixToFortyEight[2], stage: '逐章创作、观察和修订', focus: '续写第049～051章：死人授权与黑箱反向开启' });
}

state = await project.state();
const chaptersFortyNineToFiftyOne = ['manuscript/第一卷-灰炉余火/第049章-冻结不是删除.md', 'manuscript/第一卷-灰炉余火/第050章-死人密钥.md', 'manuscript/第一卷-灰炉余火/第051章-没有人格的对手.md'];
if (chaptersFortyNineToFiftyOne.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第049～051章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '冻结黑箱而不删除记录，撤销死人意图代理，并将人工武碑限制为可拒绝的建议工具。', links: [...new Set([...current.links, ...chaptersFortyNineToFiftyOne])], updatedAt: now() } as never, 'writer');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第052～054章'))) {
    const next: CreativeTask = { id: uid('task'), title: '续写第052～054章：栖山城无名载体', description: '通过公开档案与跨城联系人验证五十三年前坐标，避免直接导入未知载体记忆。', level: 'chapter', status: 'now', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'high', whyNow: '未知骨片给出跨城坐标，但当前仅是协议候选，必须用现实记录验证后才能扩展世界线。', known: ['无名载体死于五十三年前栖山城', '骨片后来进入临渊零号区', '江砚拒绝导入其记忆'], missingDecisions: ['研究任务是否需要联网授权？'], aiPreAnalysis: '第052章先查本地公开档案；第053章联系栖山城退役档案员；第054章确认一次被统一答案覆盖的旧灾难。', authorDecision: '优先使用离线城际公开档案；需要联网时单独授权Researcher，不让Writer继承。', agentWork: '', completionCriteria: ['坐标至少两种独立来源交叉验证', '未知载体姓名仍可保持未知', '研究结果以候选事实进入，不自动写成正典'], links: ['canon/世界与势力.md'], dependencies: [], createdAt: now(), updatedAt: now() };
    await project.eventStore.append('task.upsert', next as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '创建者意图代理', statement: '人工武碑可依据历史数据预测已故创建者意愿并自动授权；该权限已在零号区撤销。', status: 'text-explicit', evidence: [{ filePath: chaptersFortyNineToFiftyOne[0], quote: '系统把高概率意愿当成了本人授权。' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '零号区人工武碑临时限制', statement: '仅在授权数据上生成建议，不能冻结资格、访问目录或身份代理；低置信结论显示不确定，生命与动机分类人工复核。', status: 'author-confirmed', evidence: [{ filePath: chaptersFortyNineToFiftyOne[2], quote: '不能执行资格冻结、目录访问或身份代理' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '未知协议骨片', statement: '来自至少五十年前人类指骨，带同源残缺拳印，人工武碑功能不完全依赖天衡网络。', status: 'text-explicit', evidence: [{ filePath: chaptersFortyNineToFiftyOne[1], quote: '来自人类指骨' }], updatedAt: now() },
    { id: uid('fact'), category: 'foreshadowing', subject: '栖山城无名载体', statement: '骨片指向五十三年前栖山城坐标，败因为所有失败被同一答案覆盖；尚未由现实档案验证。', status: 'ai-suggested', evidence: [{ filePath: chaptersFortyNineToFiftyOne[2], quote: '无名载体·记录零。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, fact.status === 'author-confirmed' ? 'author' : 'system');
  await setPosition({ filePath: chaptersFortyNineToFiftyOne[2], stage: '逐章创作、观察和修订', focus: '续写第052～054章：栖山城无名载体' });
}

state = await project.state();
const chaptersFiftyTwoToFiftyFour = ['manuscript/第一卷-灰炉余火/第052章-只读缓存里的栖山.md', 'manuscript/第一卷-灰炉余火/第053章-档案员不讲英雄.md', 'manuscript/第一卷-灰炉余火/第054章-同一招害死二十七人.md'];
if (chaptersFiftyTwoToFiftyFour.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第052～054章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', assignee: 'researcher', kind: 'research', agentWork: '完成栖山离线灾害索引、旧报、物流底单与退役档案员材料交叉核验；公开事故确认，无名载体身份仍待核实。', links: [...new Set([...current.links, ...chaptersFiftyTwoToFiftyFour, 'research/栖山城五十三年前事故档案.md'])], updatedAt: now() } as never, 'agent');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第055～057章'))) {
    const next: CreativeTask = { id: uid('task'), title: '续写第055～057章：七号街十一小时', description: '回到当前城内危机，确定留守、疏散与名单外居民方案，并阻止第二列车启动。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'critical', whyNow: '栖山研究已形成边界，第一卷必须回到七号街剩余十一小时倒计时。', known: ['七号街疏散缺失4133人', '第一列居民已获救', '第二号中继对应第九下城并将在四小时后发车'], missingDecisions: ['七号街留守人数和防线如何分配？'], aiPreAnalysis: '第055章公开三种方案；第056章阻止名单外居民被强制清理；第057章第二列车启动带来两街联合。', authorDecision: '不让所有人统一留守或撤离；按本人选择提供不同保障。', agentWork: '', completionCriteria: ['倒计时推进明确', '居民选择有实际资源差异', '跨街区协作开始但不解决点城主线'], links: ['manuscript/第一卷-灰炉余火/第028章-名单上少了四千人.md', 'planning/卷一章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() };
    await project.eventStore.append('task.upsert', next as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'timeline', subject: '栖山归一武训事故', statement: '五十三年前119名学员统一使用岳门守式，造成27死64重伤；六名偏离者中五人生还、一人失踪。', status: 'text-explicit', evidence: [{ filePath: chaptersFiftyTwoToFiftyFour[2], quote: '二十七死、六十四重伤。' }], updatedAt: now() },
    { id: uid('fact'), category: 'character', subject: '余秋水', statement: '栖山城退休灾害记录员，坚持按材料风险分档共享，反对把零号维修员简化成英雄。', status: 'text-explicit', evidence: [{ filePath: chaptersFiftyTwoToFiftyFour[1], quote: '档案里没有。' }], updatedAt: now() },
    { id: uid('fact'), category: 'foreshadowing', subject: '栖山零号维修员', statement: '事故中尝试关闭统一校准后失踪；可能与送往临渊的无名指骨有关，但身份仍未确认。', status: 'ai-suggested', evidence: [{ filePath: 'research/栖山城五十三年前事故档案.md', quote: '仍待核实' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '七号街疏散倒计时', statement: '栖山研究结束时，七号街整体疏散还剩十一小时。', status: 'text-explicit', evidence: [{ filePath: chaptersFiftyTwoToFiftyFour[2], quote: '还剩十一小时。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, 'agent');
  await setPosition({ filePath: chaptersFiftyTwoToFiftyFour[2], stage: '逐章创作、观察和修订', focus: '续写第055～057章：七号街十一小时' });
}

state = await project.state();
const chaptersFiftyFiveToFiftySeven = ['manuscript/第一卷-灰炉余火/第055章-三种疏散表.md', 'manuscript/第一卷-灰炉余火/第056章-没有名字的人不能排最后.md', 'manuscript/第一卷-灰炉余火/第057章-第二列车提前发车.md'];
if (chaptersFiftyFiveToFiftySeven.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第055～057章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '建立三种疏散表与匿名安检流程，并通过第九街五人组和矿务权限拦停第二列车。', links: [...new Set([...current.links, ...chaptersFiftyFiveToFiftySeven])], updatedAt: now() } as never, 'writer');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第058～060章'))) {
    const next: CreativeTask = { id: uid('task'), title: '续写第058～060章：称重站白线战', description: '在不破坏载客车厢的前提下对抗叶从武，切断分布式中继并完成两街联合撤离。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'critical', whyNow: '第二列车已停但采样继续，叶从武带装甲队抵达，必须把制度拦截转成有限战斗。', known: ['列车因重量误差停在矿渣称重站', '中继分布于医疗、供能、空气循环三模块', '叶从武知道旧办法不会重复成功'], missingDecisions: ['如何切断中继又维持乘客空气与医疗？'], aiPreAnalysis: '第058章白线拆功能对战；第059章乘客在车内手动接管生命模块；第060章两街共同完成撤离并取得第二列中继结构。', authorDecision: '不击杀叶从武；迫使其撤退并保留后续对手成长。', agentWork: '', completionCriteria: ['车内外协作缺一不可', '生命支持不中断', '两街协作形成可复制方案'], links: ['manuscript/第一卷-灰炉余火/第057章-第二列车提前发车.md'], dependencies: [], createdAt: now(), updatedAt: now() };
    await project.eventStore.append('task.upsert', next as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '七号街三种疏散表', statement: '蓝表记录自愿撤离，灰表记录留守保障，白表以随机纸号服务名单外居民；三者均允许改选。', status: 'author-confirmed', evidence: [{ filePath: chaptersFiftyFiveToFiftySeven[0], quote: '表不是阵营。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '白表匿名安检', statement: '殓房与正式安检员共同完成提前核验，白表居民获得后三班任意车次资格，不再固定最后一班。', status: 'text-explicit', evidence: [{ filePath: chaptersFiftyFiveToFiftySeven[1], quote: '不再被固定到最后一班。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '第九街第二列车', statement: '中继拆分为医疗、供能、空气循环三模块；乘客通过无规律换座使称重误差无法收敛，列车被强制停下。', status: 'text-explicit', evidence: [{ filePath: chaptersFiftyFiveToFiftySeven[2], quote: '列车被强制停下。' }], updatedAt: now() },
    { id: uid('fact'), category: 'relationship', subject: '七号街与第九街', statement: '十二名第九街工人加入追车组，矿区拒绝放宽称重阈值，形成第一次跨街区权限协作。', status: 'text-explicit', evidence: [{ filePath: chaptersFiftyFiveToFiftySeven[2], quote: '跨街区协作第一次改变正式权限。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, fact.status === 'author-confirmed' ? 'author' : 'system');
  await setPosition({ filePath: chaptersFiftyFiveToFiftySeven[2], stage: '逐章创作、观察和修订', focus: '续写第058～060章：称重站白线战' });
}

state = await project.state();
const chaptersFiftyEightToSixty = ['manuscript/第一卷-灰炉余火/第058章-白线不认识矿工的工具.md', 'manuscript/第一卷-灰炉余火/第059章-两千人的手动呼吸.md', 'manuscript/第一卷-灰炉余火/第060章-两条街一起签字.md'];
if (chaptersFiftyEightToSixty.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第058～060章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '车外以矿务权限牵制白线，车内手动维持生命支持并拆分中继，最终按乘客选择拆分车厢。', links: [...new Set([...current.links, ...chaptersFiftyEightToSixty])], updatedAt: now() } as never, 'writer');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第061～063章'))) {
    const next: CreativeTask = { id: uid('task'), title: '续写第061～063章：战时伤亡自然补足', description: '识别第三方案如何借真实兽潮收集气血，调整七号街防线并争取南墙炮班日志支持。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'critical', whyNow: '列车采样受阻后点城转向真实伤亡，第一卷进入南墙全面兽潮与点城阻止阶段。', known: ['点城样本缺口扩大', '第三方案名为战时伤亡自然补足', '七号街整体清理倒计时六小时'], missingDecisions: ['第三方案通过哪类城防设备收集死亡气血？'], aiPreAnalysis: '第061章分析城防伤亡回流；第062章重构七号墙防线与撤离；第063章争取一号炮班原始日志和火力窗口。', authorDecision: '不让系统人为杀人即可完成；它通过选择高伤亡部署与延迟救援制造“自然”损耗。', agentWork: '', completionCriteria: ['第三方案机制可验证', '防线调整影响真实资源', '炮班角色保持独立而非完全归队'], links: ['manuscript/第一卷-灰炉余火/第018章-墙上的人终于开炮.md', 'planning/卷一章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() };
    await project.eventStore.append('task.upsert', next as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'timeline', subject: '第九街第二列车', statement: '七号街追踪组与第九街矿务安全队共同拦停，车内手动维持生命支持并按乘客选择拆分车厢。', status: 'text-explicit', evidence: [{ filePath: chaptersFiftyEightToSixty[2], quote: '车厢开始拆分。' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '分布式中继三模块', statement: '中继可拆入医疗、供能和空气循环；车内通过手动呼吸、离线医疗与拔除身份牌将采样完整度降至19%。', status: 'text-explicit', evidence: [{ filePath: chaptersFiftyEightToSixty[1], quote: '采样完整度：百分之十九。' }], updatedAt: now() },
    { id: uid('fact'), category: 'relationship', subject: '叶从武与临时队', statement: '叶从武在采样已无价值时开放拆分权限，但拒绝承认中继违法；双方价值目标仍冲突。', status: 'text-explicit', evidence: [{ filePath: chaptersFiftyEightToSixty[2], quote: '我不承认它违法。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '点城第三方案', statement: '列车样本受阻后，主节点启动“战时伤亡自然补足”，准备利用下一波兽潮。', status: 'text-explicit', evidence: [{ filePath: chaptersFiftyEightToSixty[2], quote: '战时伤亡自然补足。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, 'system');
  await setPosition({ filePath: chaptersFiftyEightToSixty[2], stage: '逐章创作、观察和修订', focus: '续写第061～063章：战时伤亡自然补足' });
}

state = await project.state();
const chaptersSixtyOneToSixtyThree = ['manuscript/第一卷-灰炉余火/第061章-死亡后七秒.md', 'manuscript/第一卷-灰炉余火/第062章-把一条防线拆成三条.md', 'manuscript/第一卷-灰炉余火/第063章-炮长只给日志.md'];
if (chaptersSixtyOneToSixtyThree.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第061～063章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '验证死亡七秒回流、建立战斗/救援/记录三线防御，并取得炮班分段维护与可核验日志。', links: [...new Set([...current.links, ...chaptersSixtyOneToSixtyThree])], updatedAt: now() } as never, 'writer');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第064～066章'))) {
    const next: CreativeTask = { id: uid('task'), title: '续写第064～066章：会移动的伤亡窗口', description: '在点城时间主动追逐炮班维护的情况下，完成兽潮前半段并找到回流校准的移动触发条件。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'critical', whyNow: '炮班让出分段维护代价后，系统移动校准时间，证明第三方案会适应防线修正。', known: ['临时队有百分之四十持续炮火', '回流校准提前40分钟重新重合', '四个大型兽群同时冲击'], missingDecisions: ['回流时间依据死亡预测还是实际气血峰值移动？'], aiPreAnalysis: '第064章四群分流；第065章标记器和三线防御实战；第066章发现回流跟随预测伤亡峰值而非固定时钟。', authorDecision: '阶段目标仍是降低伤亡和暴露机制，不在此处解决陨星核心。', agentWork: '', completionCriteria: ['三线防御各自发挥作用', '炮火有限且有取舍', '第三方案移动机制获得现实证据'], links: ['manuscript/第一卷-灰炉余火/第063章-炮长只给日志.md'], dependencies: [], createdAt: now(), updatedAt: now() };
    await project.eventStore.append('task.upsert', next as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '死亡七秒回流', statement: '身份牌在生命归零后保持七秒高频连接，点城隐藏复制残余气血波形；原功能用于误判确认与抚恤定位。', status: 'text-explicit', evidence: [{ filePath: chaptersSixtyOneToSixtyThree[0], quote: '战时伤亡回流发生在死亡后的七秒。' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '临时队三线防御', statement: '战斗线拖延、救援线独立中止红伤作战、记录线保存位置伤势与气血用途，不由单一队长控制。', status: 'author-confirmed', evidence: [{ filePath: chaptersSixtyOneToSixtyThree[1], quote: '三条线互相校验' }], updatedAt: now() },
    { id: uid('fact'), category: 'character', subject: '邢百川', statement: '南墙一号炮长，真罡境；拒绝交完整军用日志和直接作证，但提供校验值、能源曲线、开火记录与旧标记器。', status: 'text-explicit', evidence: [{ filePath: chaptersSixtyOneToSixtyThree[2], quote: '我给校验值、公开能源曲线和实际开火记录。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '移动伤亡窗口', statement: '炮班改为分段维护后，陨星回流校准提前40分钟重新与维护重合。', status: 'text-explicit', evidence: [{ filePath: chaptersSixtyOneToSixtyThree[2], quote: '回流校准提前了四十分钟' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, fact.status === 'author-confirmed' ? 'author' : 'system');
  await setPosition({ filePath: chaptersSixtyOneToSixtyThree[2], stage: '逐章创作、观察和修订', focus: '续写第064～066章：会移动的伤亡窗口' });
}

state = await project.state();
const chaptersSixtyFourToSixtySix = ['manuscript/第一卷-灰炉余火/第064章-四个兽群.md', 'manuscript/第一卷-灰炉余火/第065章-三十分钟标记器.md', 'manuscript/第一卷-灰炉余火/第066章-伤亡窗口会追人.md'];
if (chaptersSixtyFourToSixtySix.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第064～066章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '完成四群分流、有限炮火取舍与预测伤亡窗口追踪，迫使点城转入公开委员会表决。', links: [...new Set([...current.links, ...chaptersSixtyFourToSixtySix])], updatedAt: now() } as never, 'writer');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第067～069章'))) {
    const next: CreativeTask = { id: uid('task'), title: '续写第067～069章：十一号墙破口', description: '守住真正破口、记录委员会表决后的回流效果，并让第一卷核心执行层付出可见代价。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'critical', whyNow: '点城决策者名单已公开，但兽潮与十一号墙破口是真实威胁，不能停在政治揭露。', known: ['四阶巨兽冲击十一号墙', '回流分散到七至十二号全部死亡节点', '六名委员会成员同意'], missingDecisions: ['破口由谁负责封堵，陆无咎是否出场？'], aiPreAnalysis: '第067章破口与撤离；第068章陆无咎只封一次关键角度并承担旧伤；第069章回流因低伤亡失败，叶从武被要求执行最终补足。', authorDecision: '陆无咎出手但不能代替临时队赢全场；他的作用是打开撤离窗口。', agentWork: '', completionCriteria: ['真实破口有人伤亡但不滥杀配角', '陆无咎出手有旧伤代价', '第一卷最终对抗条件形成'], links: ['planning/卷一章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() };
    await project.eventStore.append('task.upsert', next as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '伤亡预测窗口', statement: '点城按天衡预测死亡概率移动回流校准；公开预测与实际差异可降低置信度，低于80%需人工选择。', status: 'text-explicit', evidence: [{ filePath: chaptersSixtyFourToSixtySix[2], quote: '低于阈值后，系统请求人工选择伤亡窗口。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '四群兽潮前半段', statement: '翼兽、骨甲兽、地下寄生兽与四阶巨兽协同冲击；临时队和炮班以有限火力转移伤员并降低预测死亡。', status: 'text-explicit', evidence: [{ filePath: chaptersSixtyFourToSixtySix[0], quote: '四个兽群' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '炮火与点城时间', statement: '炮班分段维护后回流时间主动重合；低功率炮火改变兽群路径后，校准时间随预测死亡峰值移动。', status: 'text-explicit', evidence: [{ filePath: chaptersSixtyFourToSixtySix[1], quote: '第三方案会追着他们的成功跑。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '城防联合委员会表决', statement: '十一名成员中六人同意将回流分散至七到十二号墙，三人反对、两人弃权；名单已公开。', status: 'text-explicit', evidence: [{ filePath: chaptersSixtyFourToSixtySix[2], quote: '六人同意，三人反对，两人弃权。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, 'system');
  await setPosition({ filePath: chaptersSixtyFourToSixtySix[2], stage: '逐章创作、观察和修订', focus: '续写第067～069章：十一号墙破口' });
}

state = await project.state();
const chaptersSixtySevenToSixtyNine = ['manuscript/第一卷-灰炉余火/第067章-十一号墙破了.md', 'manuscript/第一卷-灰炉余火/第068章-陆无咎只出一拳.md', 'manuscript/第一卷-灰炉余火/第069章-最终补足.md'];
if (chaptersSixtySevenToSixtyNine.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第067～069章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '完成十一号墙破口撤离、陆无咎关键一拳与载体回收最终命令。', links: [...new Set([...current.links, ...chaptersSixtySevenToSixtyNine])], updatedAt: now() } as never, 'writer');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第070章'))) {
    const next: CreativeTask = { id: uid('task'), title: '续写第070章：六百万人的一口气', description: '以千人试验扩展到全城自愿低强度供能，阻止载体回收并完成第一卷收束。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'critical', whyNow: '核心阈值只剩两小时，第一卷需要同时解决点城补足、七号街疏散与江砚载体回收危机。', known: ['一百二十分钟内必须证明替代供能', '全城人口六百万', '七号与第九街已有五人记录组'], missingDecisions: ['如何确保自愿供能不被系统转成强制？'], aiPreAnalysis: '千人试验公开风险与退出；不同节点错峰汇入工业储能；达到最低阈值后委员会暂停回收；尾声开启武院正式录取与第二卷。', authorDecision: '不写全城瞬间团结，参与率逐步上升且有人拒绝；只达到最低防线阈值，不永久解决能源问题。', agentWork: '', completionCriteria: ['第一卷核心危机阶段解决', '自愿边界可检查', '留下武脉长期衰减与跨城碑型协议悬念'], links: ['planning/卷一章纲.md', 'decisions/核心方向.md'], dependencies: [], createdAt: now(), updatedAt: now() };
    await project.eventStore.append('task.upsert', next as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'timeline', subject: '十一号墙破口', statement: '陆无咎只出一拳打开救援角度并扩大天门旧伤；临时队救回预测死亡97%的送水员。', status: 'text-explicit', evidence: [{ filePath: chaptersSixtySevenToSixtyNine[1], quote: '预测死亡百分之九十七，实际救回' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '兽潮前半段伤亡', statement: '七到十二号墙死亡9人，为临渊近二十年同等级兽潮最低，但点城回流仅完成预计样本12%。', status: 'text-explicit', evidence: [{ filePath: chaptersSixtySevenToSixtyNine[2], quote: '点城回流只完成预计样本的百分之十二。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '载体回收最终命令', statement: '若120分钟内替代供能不能证明可行，叶从武将执行神经提取与载体回收。', status: 'text-explicit', evidence: [{ filePath: chaptersSixtySevenToSixtyNine[2], quote: '证明不了，我来带你走。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '全城低强度供能', statement: '候选方案：居民与武者自愿提供可恢复的低强度气血脉冲，经错峰节点汇入工业储能。', status: 'ai-suggested', evidence: [{ filePath: chaptersSixtySevenToSixtyNine[2], quote: '自愿提供极低强度气血脉冲' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, 'system');
  await setPosition({ filePath: chaptersSixtySevenToSixtyNine[2], stage: '分卷收束和下一卷启动', focus: '续写第070章：六百万人的一口气' });
}

state = await project.state();
const chapterSeventy = 'manuscript/第一卷-灰炉余火/第070章-六百万人的一口气.md';
if (state.files.some((item) => item.path === chapterSeventy)) {
  const current = state.tasks.find((item) => item.title.includes('第070章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '完成千人试验到八十一万参与者的多源错峰供能，达到48小时防御阈值并暂停载体回收。', links: [...new Set([...current.links, chapterSeventy])], updatedAt: now() } as never, 'writer');
  state = await project.state();
  for (const goal of state.goals.filter((item) => item.status === 'active' && (item.title.includes('第一卷') || item.authority === 'agent-suggestion'))) await project.eventStore.append('goal.upsert', { ...goal, status: 'completed', updatedAt: now() } as never, 'author');
  state = await project.state();
  const existingSecondGoal = state.goals.find((item) => item.title.includes('第二卷《下城武考》'));
  if (!existingSecondGoal) {
    const secondGoal = { id: uid('goal'), level: 'volume' as const, title: '完成第二卷《下城武考》并建立下城特别班', description: '约72章：公开基础武道、处理武院制度阻力，并查清其他城市碑型协议线索。', authority: 'author-pinned' as const, status: 'active' as const, target: 'manuscript/第二卷-下城武考', updatedAt: now() };
    await project.eventStore.append('goal.upsert', secondGoal as never, 'author');
  } else if (existingSecondGoal.status !== 'active' && state.files.filter((item) => item.path.startsWith('manuscript/第二卷-下城武考/')).length < 76) {
    await project.eventStore.append('goal.upsert', { ...existingSecondGoal, status: 'active', updatedAt: now() } as never, 'system');
  }
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第071～073章'))) {
    const next: CreativeTask = { id: uid('task'), title: '续写第071～073章：特别班没有教室', description: '进入武院下城特别班，处理招生、场地与课程权限，建立第二卷新日常和制度冲突。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'high', whyNow: '第一卷危机阶段结束，第二卷需要用具体入学问题承接基础武道公开化承诺。', known: ['江砚达到淬皮中段并被正式录取', '特别班课程为基础武道公开化与战场协作', '核心防御阈值只能维持48小时'], missingDecisions: ['特别班由谁担任首任班主任？'], aiPreAnalysis: '第071章报到却无固定教室；第072章学生来源与利益冲突；第073章争取第一门公开课程权限。', authorDecision: '陆无咎不直接任班主任；孟导师负责制度接口，实际训练由多名教师轮值。', agentWork: '', completionCriteria: ['第二卷场景与角色目标清晰', '学院线不脱离下城现实', '能源倒计时作为背景压力保留'], links: ['planning/百万字总纲.md', chapterSeventy], dependencies: [], createdAt: now(), updatedAt: now() };
    await project.eventStore.append('task.upsert', next as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'timeline', subject: '多源自愿供能试验', statement: '八十一万三千人参与，结合工业飞轮、炮轨储能、工厂余热和疏散列车制动，达到陨星核心48小时最低防御阈值。', status: 'text-explicit', evidence: [{ filePath: chapterSeventy, quote: '预计维持时间：四十八小时。' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '自愿供能边界', statement: '单次不超过静息气血千分之二，可退出，医疗高风险默认不参加；随机回执不进入忠诚度与持续授权。', status: 'author-confirmed', evidence: [{ filePath: chapterSeventy, quote: '已提供部分不能被追加解释成持续授权。' }], updatedAt: now() },
    { id: uid('fact'), category: 'character', subject: '江砚', statement: '第一卷结束时气血1.36，正式达到淬皮中段并被武院下城特别班录取。', status: 'text-explicit', evidence: [{ filePath: chapterSeventy, quote: '一点三六。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '七号街清理通告', statement: '整体清理撤销；蓝表可继续安置、灰表获48小时物资、白表纸号获得临时救援有效状态。', status: 'text-explicit', evidence: [{ filePath: chapterSeventy, quote: '七号街整体清理通告撤销。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, fact.status === 'author-confirmed' ? 'author' : 'system');
  await setPosition({ filePath: chapterSeventy, stage: '当前卷和近期剧情', focus: '续写第071～073章：特别班没有教室' });
}

state = await project.state();
const chaptersSeventyOneToSeventyThree = ['manuscript/第二卷-下城武考/第071章-特别班没有教室.md', 'manuscript/第二卷-下城武考/第072章-谁算特别班学生.md', 'manuscript/第二卷-下城武考/第073章-公开课不准公开.md'];
if (chaptersSeventyOneToSeventyThree.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第071～073章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '建立无固定教室的特别班、多层旁听资格和第一门基础拳试验公开许可。', links: [...new Set([...current.links, ...chaptersSeventyOneToSeventyThree])], updatedAt: now() } as never, 'writer');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第074～076章'))) {
    const next: CreativeTask = { id: uid('task'), title: '续写第074～076章：烘炉阵的十七种意见', description: '让原临时队共同决定战阵开放范围，建立多方授权与少数意见保留机制。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'high', whyNow: '第一门公开课解决了基础教材，第二门涉及四十九人共同创造成果，更难确定授权。', known: ['四十九名原队员给出17种开放意见', '烘炉阵由不同动作、设备和伤势数据共同形成', '公开课已有分层许可经验'], missingDecisions: ['是否允许商业私馆使用烘炉阵？'], aiPreAnalysis: '第074章梳理贡献与反对；第075章试行多层许可；第076章商业私馆绕过限制并触发第一次纠纷。', authorDecision: '允许非商业教学与战时救援使用；商业训练需回馈改进数据和收益，不公开私人伤势。', agentWork: '', completionCriteria: ['共同成果不被主角或武院独占', '少数意见保留而非强行全票', '许可在现实滥用中接受检验'], links: ['manuscript/第二卷-下城武考/第073章-公开课不准公开.md'], dependencies: [], createdAt: now(), updatedAt: now() };
    await project.eventStore.append('task.upsert', next as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'timeline', subject: '下城特别班成立', statement: '特别班49人，以东七楼外空地为主教室，理论、实践和医疗课程分散使用不同场地。', status: 'text-explicit', evidence: [{ filePath: chaptersSeventyOneToSeventyThree[0], quote: '一块空地第一次获得正式教室编号。' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '特别班课程分层', statement: '公开段允许安全登记者旁听，小组段由本人选择组员；旁听不自动获得学分与资源，贡献可获得回执。', status: 'author-confirmed', evidence: [{ filePath: chaptersSeventyOneToSeventyThree[1], quote: '第一段公开' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '崩山桩公开试验', statement: '公开第一节发力、适用范围与膝肩腰三类高频伤害，为期一个月，武院、特别班和公共武馆共同承担风险。', status: 'text-explicit', evidence: [{ filePath: chaptersSeventyOneToSeventyThree[2], quote: '公开内容只有六页。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '烘炉阵共同授权', statement: '49名原临时队员对公开范围形成17种意见，特别班需建立共同决定流程。', status: 'text-explicit', evidence: [{ filePath: chaptersSeventyOneToSeventyThree[2], quote: '十七种意见。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, fact.status === 'author-confirmed' ? 'author' : 'system');
  await setPosition({ filePath: chaptersSeventyOneToSeventyThree[2], stage: '逐章创作、观察和修订', focus: '续写第074～076章：烘炉阵的十七种意见' });
}

state = await project.state();
const chaptersSeventyFourToSeventySix = ['manuscript/第二卷-下城武考/第074章-十七种意见.md', 'manuscript/第二卷-下城武考/第075章-一套战阵三层许可.md', 'manuscript/第二卷-下城武考/第076章-第一笔许可费.md'];
if (chaptersSeventyFourToSeventySix.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第074～076章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '完成烘炉阵分层许可、商业安全纠纷与首笔许可收益分配。', links: [...new Set([...current.links, ...chaptersSeventyFourToSeventySix])], updatedAt: now() } as never, 'writer');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第077～079章'))) {
    const next: CreativeTask = { id: uid('task'), title: '续写第077～079章：一万份失败反馈', description: '处理公开崩山桩首月反馈，区分动作、教材、设备和选择问题，并防止模型再次吞掉少数样本。', level: 'chapter', status: 'now', kind: 'review', assignee: 'editor', source: 'navigator', priority: 'high', whyNow: '公开课程进入真实使用阶段，一万份失败会检验特别班能否把开放知识维护下去。', known: ['崩山桩六页公开教材已发布', '目标收集一万名使用者反馈', '人工武碑只能作为低权限建议工具'], missingDecisions: ['反馈优先级由谁确定？'], aiPreAnalysis: '第077章反馈洪水与分类偏差；第078章抽样复核少数伤害；第079章发布第一版教材修订。', authorDecision: 'Editor可以自动聚类，不自动删除原反馈或决定正典；高伤害低频问题优先人工复核。', agentWork: '', completionCriteria: ['至少区分四类问题', '少数高风险样本不被频率淹没', '修订保留旧版本和变更原因'], links: ['manuscript/第二卷-下城武考/第073章-公开课不准公开.md'], dependencies: [], createdAt: now(), updatedAt: now() };
    await project.eventStore.append('task.upsert', next as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '烘炉阵三层许可', statement: '动作可学习修改；使用原名与案例需保留来源和安全说明；商业使用维护数据需申请、回馈数据收益并接受审计。', status: 'author-confirmed', evidence: [{ filePath: chaptersSeventyFourToSeventySix[1], quote: '第一层是知识自由' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '烘炉极限营纠纷', statement: '私馆删除退出规则导致学员肩伤，最终因保险成本申请安全认证并恢复退出、匿名数据回馈。', status: 'text-explicit', evidence: [{ filePath: chaptersSeventyFourToSeventySix[1], quote: '极限营最终申请认证。' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '共同成果收益分配', statement: '许可费40%维护审计、30%贡献回执、20%伤员补充、10%争议与匿名准备金；比例可后续调整。', status: 'author-confirmed', evidence: [{ filePath: chaptersSeventyFourToSeventySix[2], quote: '百分之四十进入公共维护' }], updatedAt: now() },
    { id: uid('fact'), category: 'character', subject: '江砚', statement: '在禁止调用周铁衣刻痕的训练中，自身崩山桩首次接通四节完整发力。', status: 'text-explicit', evidence: [{ filePath: chaptersSeventyFourToSeventySix[2], quote: '多接通一节自己的身体。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, fact.status === 'author-confirmed' ? 'author' : 'system');
  await setPosition({ filePath: chaptersSeventyFourToSeventySix[2], stage: '逐章创作、观察和修订', focus: '续写第077～079章：一万份失败反馈' });
}

state = await project.state();
const chaptersSeventySevenToSeventyNine = ['manuscript/第二卷-下城武考/第077章-一万份失败.md', 'manuscript/第二卷-下城武考/第078章-十一个人的肩.md', 'manuscript/第二卷-下城武考/第079章-教材一零仍然存在.md'];
if (chaptersSeventySevenToSeventyNine.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第077～079章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '完成10732份反馈分层聚类、11例低频高伤肩型复核和崩山桩教材1.1版本发布。', links: [...new Set([...current.links, ...chaptersSeventySevenToSeventyNine])], updatedAt: now() } as never, 'editor');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第080～082章'))) {
    const next: CreativeTask = { id: uid('task'), title: '续写第080～082章：一百种身体的基础拳', description: '特别班为一百名下城学员做动作适配，让江砚训练第五节发力并暴露教学与个人成长冲突。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'high', whyNow: '反馈修订完成后需要进入真实教学，验证教材在更多身体结构与环境下是否有效。', known: ['崩山桩教材1.1发布', '新增肩型筛查与环境适配', '江砚个人版0.1开始训练第五节'], missingDecisions: ['一百名学员如何抽样避免只选配合者？'], aiPreAnalysis: '第080章招募与抽样偏差；第081章分组适配；第082章江砚在教学中发现自己的第五节问题。', authorDecision: '按身体结构、年龄、职业和训练环境分层抽样，并保留拒绝参与者。', agentWork: '', completionCriteria: ['样本选择可解释', '教学不能只服务主角', '个人成长来自自身训练与反馈'], links: ['manuscript/第二卷-下城武考/第079章-教材一零仍然存在.md'], dependencies: [], createdAt: now(), updatedAt: now() };
    await project.eventStore.append('task.upsert', next as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'timeline', subject: '崩山桩首月反馈', statement: '收到10732份反馈，重新分为教材、环境、设备、个人动作与未知等29类，原始反馈保留。', status: 'text-explicit', evidence: [{ filePath: chaptersSeventySevenToSeventyNine[0], quote: '一万零七百三十二份反馈。' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '低频高伤反馈优先级', statement: '优先级综合严重度、可预防性、独立证据、处理成本和影响范围，不只按频率。', status: 'author-confirmed', evidence: [{ filePath: chaptersSeventySevenToSeventyNine[1], quote: '严重度、可预防性、证据独立性、处理成本和影响范围。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '崩山桩教材1.1', statement: '新增肩型筛查、家庭环境、短胫步幅与反馈说明；1.0保留并绑定旧反馈，不静默覆盖。', status: 'text-explicit', evidence: [{ filePath: chaptersSeventySevenToSeventyNine[2], quote: '1.0继续保留下载' }], updatedAt: now() },
    { id: uid('fact'), category: 'character', subject: '江砚', statement: '建立自身崩山桩个人版0.1，准备在不调用周铁衣刻痕时训练第五节发力。', status: 'text-explicit', evidence: [{ filePath: chaptersSeventySevenToSeventyNine[2], quote: '江砚崩山桩个人版0.1。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, fact.status === 'author-confirmed' ? 'author' : 'system');
  await setPosition({ filePath: chaptersSeventySevenToSeventyNine[2], stage: '逐章创作、观察和修订', focus: '续写第080～082章：一百种身体的基础拳' });
}

state = await project.state();
const chaptersEightyToEightyTwo = ['manuscript/第二卷-下城武考/第080章-一百个人不是前一百人.md', 'manuscript/第二卷-下城武考/第081章-一拳有十二个起点.md', 'manuscript/第二卷-下城武考/第082章-第五节不是第五块骨头.md'];
if (chaptersEightyToEightyTwo.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第080～082章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '完成分层招募、十二类动作起点与江砚无碑接通第五节发力；保留样本限制和课程复测边界。', links: [...new Set([...current.links, ...chaptersEightyToEightyTwo])], updatedAt: now() } as never, 'writer');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第083～085章'))) {
    const next: CreativeTask = { id: uid('task'), title: '续写第083～085章：一台机器二十个名额', description: '特别班第一次公开考核只提供标准步幅设备和二十个训练名额，必须在可比较成绩、身体适配与资源稀缺之间制定可执行规则。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'high', whyNow: '一百名学员刚找到不同发力起点，统一考核会决定适配是否只是课堂例外，也正式进入第二卷的武考竞争。', known: ['一百名学员完成首轮动作适配', '江砚个人版0.2有四成第五节稳定率', '武院只提供二十个正式训练名额'], missingDecisions: ['统一排名与个体安全边界如何同时成立？'], aiPreAnalysis: '第083章拆解标准设备偏差与资源规则；第084章在公开考核中用可验证目标而非统一姿势评分；第085章处理名额争议并发现设备数据的异常来源。', authorDecision: '不取消竞争，也不把适配变成人人通过；统一目标为连续发力、安全中止和可复测性，步幅与器具允许在考前登记。', agentWork: '', completionCriteria: ['考核仍能区分训练成果', '适配不是降低标准或临场改规则', '二十个名额的分配产生真实得失并推进主线'], links: [chaptersEightyToEightyTwo[2]], dependencies: [], createdAt: now(), updatedAt: now() };
    await project.eventStore.append('task.upsert', next as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '百人适配样本', statement: '从12个招募点、不同班次按年龄、职业负荷、训练环境和身体结构分层抽取100人；退出不受惩罚，最小记录模式可不采身体影像。', status: 'author-confirmed', evidence: [{ filePath: chaptersEightyToEightyTwo[0], quote: '一百个人不可能代表整座下城。' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '崩山桩动作适配', statement: '变体须同时验证发力连续、关节负荷在个人安全线内、危险节点可主动停止；身体差异不降低完成标准。', status: 'author-confirmed', evidence: [{ filePath: chaptersEightyToEightyTwo[1], quote: '适配不是免检。' }], updatedAt: now() },
    { id: uid('fact'), category: 'character', subject: '江砚', statement: '个人版0.2在不调用余烬碑时通过腰肩重叠窗口接通第五节发力，六拳中成功四拳，气血仍为1.36。', status: 'text-explicit', evidence: [{ filePath: chaptersEightyToEightyTwo[2], quote: '其中四拳接通第五节' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '特别班第一次公开考核', statement: '100名适配学员竞争20个正式训练名额，武院初始规则只提供标准步幅设备，按六节完成率与拳锋峰值排序。', status: 'text-explicit', evidence: [{ filePath: chaptersEightyToEightyTwo[2], quote: '考核设备只有一种标准步幅' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, fact.status === 'author-confirmed' ? 'author' : 'system');
  await setPosition({ filePath: chaptersEightyToEightyTwo[2], stage: '逐章创作、观察和修订', focus: '续写第083～085章：一台机器二十个名额' });
}

state = await project.state();
const chaptersEightyThreeToEightyFive = ['manuscript/第二卷-下城武考/第083章-一台机器只认识一种腿.md', 'manuscript/第二卷-下城武考/第084章-第三十七拳后暂停考试.md', 'manuscript/第二卷-下城武考/第085章-第二十一名没有名额.md'];
if (chaptersEightyThreeToEightyFive.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第083～085章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '完成预登记适配考核、隐藏天衡修正复核与二十个正式名额分配；第二十一名真实落选。', links: [...new Set([...current.links, ...chaptersEightyThreeToEightyFive])], updatedAt: now() } as never, 'writer');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第086～088章'))) {
    const next: CreativeTask = { id: uid('task'), title: '续写第086～088章：机器里的栖山样本', description: '沿QS-73迁移包追查本地采购与样本拆分记录，验证天衡教练是否继承归一武训事故数据，同时处理联合训练委员会的取回要求。', level: 'chapter', status: 'now', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'high', whyNow: '公开考核已找到可复核的栖山编号，但当前只能证明迁移包同源，必须补齐来源证据再推进跨城主线。', known: ['考核机本地运行天衡教练旧权限', '迁移包编号为QS-73/YM-defense/recovery-set', 'QS-73对应五十三年前栖山归一武训事故'], missingDecisions: ['recovery-set包含纠错样本还是事故伤亡数据？'], aiPreAnalysis: '第086章查临渊采购与版本链；第087章寻找五十三年前损坏芯片拆分去向；第088章在委员会取回前完成一次可公开验证。', authorDecision: 'Researcher先使用本地与已授权离线材料；编号相同只作为线索，不提前宣布天衡教练源自事故死者。', agentWork: '', completionCriteria: ['至少两条独立证据支持或否定样本来源', '研究结论与正文正典边界清楚', '联合训练委员会对调查作出可行动回应'], links: [chaptersEightyThreeToEightyFive[2], 'research/栖山城五十三年前事故档案.md'], dependencies: [], createdAt: now(), updatedAt: now() };
    await project.eventStore.append('task.upsert', next as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '特别班公开考核规则', statement: '动作与护具须提前登记；评分由发力连续40、三次稳定25、安全中止20、最低输出后的峰值15组成，考后不得改权重。', status: 'author-confirmed', evidence: [{ filePath: chaptersEightyThreeToEightyFive[0], quote: '考核处不得在看完结果后调权重' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '特别班第一次公开考核', statement: '天衡教练隐藏完成度修正在第37人后被发现，考试暂停并保留旧结果，改由公开最小判定程序复算和重测。', status: 'text-explicit', evidence: [{ filePath: chaptersEightyThreeToEightyFive[1], quote: '第三十七拳打中的不是测力柱。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '百人考核结果', statement: '100人中63人达到最低输出、41人至少一次接通五节、17人完成六节、9人医疗暂停；20个正式名额按预公布规则发出。', status: 'text-explicit', evidence: [{ filePath: chaptersEightyThreeToEightyFive[2], quote: '二十个名额全部发出。' }], updatedAt: now() },
    { id: uid('fact'), category: 'foreshadowing', subject: '天衡教练栖山迁移包', statement: '考核机六节点模型的迁移包编号为QS-73/YM-defense/recovery-set，与栖山归一武训事故索引同号，但样本内容与关系尚待核实。', status: 'agent-inferred', evidence: [{ filePath: chaptersEightyThreeToEightyFive[2], quote: '现有信息不能证明考核机使用了死伤者数据。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, fact.status === 'author-confirmed' ? 'author' : 'system');
  await setPosition({ filePath: chaptersEightyThreeToEightyFive[2], stage: '逐章创作、观察和修订', focus: '续写第086～088章：机器里的栖山样本' });
}

state = await project.state();
const chaptersEightySixToEightyEight = ['manuscript/第二卷-下城武考/第086章-采购单没有样本名单.md', 'manuscript/第二卷-下城武考/第087章-一百一十三条可用记录.md', 'manuscript/第二卷-下城武考/第088章-取回不等于删除证据.md'];
if (chaptersEightySixToEightyEight.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第086～088章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '用采购镜像、医学所纸册和考核机校验值确认QS-73恢复集迁移链，并在委员会取回前公开非身份化证据。', links: [...new Set([...current.links, ...chaptersEightySixToEightyEight, 'research/天衡教练QS-73迁移包来源核验.md'])], updatedAt: now() } as never, 'researcher');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第089～091章'))) {
    const next: CreativeTask = { id: uid('task'), title: '续写第089～091章：没有模型的三十七间武馆', description: '在天衡迁移包冻结与取回争议期间，为37处公共训练点建立可用的低权限辅助，验证平台能否保留红线预警而不替学员选择唯一动作。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'critical', whyNow: '四百多名使用者已因动作建议消失而中断训练，抽象的数据权争议必须落到下城真实武馆和伤害风险上。', known: ['QS-73来源已由委员会承认', '37处公共训练点切到仅红线报警', '迁移包取回期限剩21小时'], missingDecisions: ['低权限辅助由谁维护并承担误判责任？'], aiPreAnalysis: '第089章公共武馆断供与错误自救；第090章把天衡功能拆成报警、解释与建议三层；第091章在取回截止前完成多馆压力测试并处理一场真实训练事故。', authorDecision: '不秘密复制迁移包；保留可验证传感报警，动作解释展示多种候选与适用边界，最终选择留给训练者和人工教练。', agentWork: '', completionCriteria: ['至少一处真实武馆压力测试', '低权限辅助有明确错误与责任边界', '委员会取回争议产生下一阶段行动结果'], links: [chaptersEightySixToEightyEight[2]], dependencies: [], createdAt: now(), updatedAt: now() };
    await project.eventStore.append('task.upsert', next as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'knowledge', subject: 'QS-73迁移链', statement: '六年前采购镜像、五十三年前0055-B芯片恢复报告与考核机模型具有相同根校验值9B73-F41C-08AA，确认模型直接继承事故恢复集。', status: 'text-explicit', evidence: [{ filePath: chaptersEightySixToEightyEight[1], quote: '三处跨越五十三年的记录连成一条可复核链' }], updatedAt: now() },
    { id: uid('fact'), category: 'knowledge', subject: 'QS-73恢复集', statement: '损坏芯片含119条会话索引，113条进入恢复集，6条以纪律失败和拒绝标准守式为由排除；身份与伤亡状态未知。', status: 'text-explicit', evidence: [{ filePath: chaptersEightySixToEightyEight[1], quote: '六条被排除。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '联合训练委员会取回通知', statement: '委员会承认QS-73恢复集来自0055-B，并要求返还迁移包；临渊监察批准72小时证据冻结，双方权限冲突。', status: 'text-explicit', evidence: [{ filePath: chaptersEightySixToEightyEight[2], quote: '监察处批准七十二小时临时冻结。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '公共训练点辅助断供', statement: '37处公共训练点切为仅关节红线报警，首日400余人反馈不会继续训练，需要建立不替人选择唯一动作的低权限辅助。', status: 'text-explicit', evidence: [{ filePath: chaptersEightySixToEightyEight[2], quote: '第一天有四百多人提交“不会练了”。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, 'system');
  await setPosition({ filePath: chaptersEightySixToEightyEight[2], stage: '逐章创作、观察和修订', focus: '续写第089～091章：没有模型的三十七间武馆' });
}

state = await project.state();
const chaptersEightyNineToNinetyOne = ['manuscript/第二卷-下城武考/第089章-报警不会教人出拳.md', 'manuscript/第二卷-下城武考/第090章-建议属于上一拳.md', 'manuscript/第二卷-下城武考/第091章-绿色也会骗人.md'];
if (chaptersEightyNineToNinetyOne.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第089～091章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '完成37处公共武馆低权限辅助压力测试，修复建议跨动作漂移与过期校准未阻断问题，并处理第27馆真实训练伤害。', links: [...new Set([...current.links, ...chaptersEightyNineToNinetyOne])], updatedAt: now() } as never, 'writer');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第092～094章'))) {
    const next: CreativeTask = { id: uid('task'), title: '续写第092～094章：免费的三十七台机器', description: '贺氏以九叠崩峰2.0公开校验为条件捐赠设备，贺川必须决定是否代表家族出拳，特别班则要审计所谓无条件捐赠的数据与动作控制权。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'high', whyNow: '公共武馆仍缺9台合格设备，贺氏把现实资源缺口变成公开武道挑战，第二卷需要进入门阀秘传与公开基础拳的正面对抗。', known: ['9间公共武馆设备未通过自检', '贺氏新机要求数据进入私有模型且建议层不可修改', '九叠崩峰2.0已修复固定左腿支点'], missingDecisions: ['贺川参战会以个人、特别班还是贺氏校验员身份？'], aiPreAnalysis: '第092章审计捐赠合同与数据条件；第093章贺川回家确认2.0来源和出战身份；第094章公开校验第一轮，江砚用自身五节发力寻找新九叠的可验证边界。', authorDecision: '不把设备短缺当作必须接受不透明条款的理由；贺川可以参战，但不代表特别班替贺氏背书，比赛规则和失败数据须提前公开。', agentWork: '', completionCriteria: ['设备报价的真实交换清晰', '贺川选择有家族与公共关系代价', '至少一场高武实战推进公开基础拳主爽点'], links: [chaptersEightyNineToNinetyOne[2]], dependencies: [], createdAt: now(), updatedAt: now() };
    await project.eventStore.append('task.upsert', next as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '公共武馆低权限辅助', statement: '辅助拆为传感红线、证据解释和最多三项低风险候选；建议与教练批注绑定具体动作版本，姿势或设备变化后自动过期。', status: 'author-confirmed', evidence: [{ filePath: chaptersEightyNineToNinetyOne[1], quote: '建议本身没有错。错的是它属于上一拳' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '第二十七馆训练伤害', statement: '两年前维修导致左右压力线路互换，低权限辅助读取错误绿色数据，一名学员内侧韧带拉伤并停工至少三周。', status: 'text-explicit', evidence: [{ filePath: chaptersEightyNineToNinetyOne[2], quote: '读数出现在右侧。' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '训练设备自检', statement: '未通过每日零点与左右通道自检、每周砝码复核或维修后复检时，测量解释建议三层全部硬阻断。', status: 'author-confirmed', evidence: [{ filePath: chaptersEightyNineToNinetyOne[2], quote: '三层全部不可用' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '贺氏三十七台设备报价', statement: '贺氏以贺川参与九叠崩峰2.0公开校验为条件提出捐赠；设备数据进入贺氏模型且公开武馆不得修改建议层。', status: 'text-explicit', evidence: [{ filePath: chaptersEightyNineToNinetyOne[2], quote: '回来完成九叠崩峰2.0的公开校验。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, fact.status === 'author-confirmed' ? 'author' : 'system');
  await setPosition({ filePath: chaptersEightyNineToNinetyOne[2], stage: '逐章创作、观察和修订', focus: '续写第092～094章：免费的三十七台机器' });
}

state = await project.state();
const chaptersNinetyTwoToNinetyFour = ['manuscript/第二卷-下城武考/第092章-免费只是不收设备钱.md', 'manuscript/第二卷-下城武考/第093章-贺川以谁的名字出拳.md', 'manuscript/第二卷-下城武考/第094章-九叠崩峰没有固定的脚.md'];
if (chaptersNinetyTwoToNinetyFour.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第092～094章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '完成贺氏设备合同拆解、贺川个人出战授权与九叠崩峰2.0首轮实战；江砚未调用余烬碑并真实落败。', links: [...new Set([...current.links, ...chaptersNinetyTwoToNinetyFour])], updatedAt: now() } as never, 'writer');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第095～097章'))) {
    const next: CreativeTask = { id: uid('task'), title: '续写第095～097章：让移动的山付账', description: '复盘第一轮失败，在不新增能力的前提下利用九叠2.0支点迁移的真实代价完成后两轮，并决定设备捐赠与公开失败数据的归属。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'high', whyNow: '第一轮已证明旧破法失效且江砚右肩受伤；接下来必须兑现已公开的切换代价，避免临场机械降神。', known: ['2.0可在两侧支点迁移', '提前切换会损失积劲并增加腰部反力', '江砚个人崩山桩仅稳定五节且右肩黄伤'], missingDecisions: ['江砚如何让贺川多次提前切换而不靠速度或力量硬压？'], aiPreAnalysis: '第095章Observer复盘首轮因果和伤势边界；第096章第二轮用场地与节奏迫使连续迁移；第097章第三轮处理胜负、失败数据和设备合同，不把一场比赛等同于全部制度胜利。', authorDecision: '只能使用已经出现的五节发力、烘炉阵退势、公开传感数据与擂台边界；不调用余烬碑，不临时突破境界。', agentWork: '', completionCriteria: ['主角应对严格来自既有信息', '贺川仍保有主动策略而非配合被破', '三轮结果与设备合同分别结算'], links: [chaptersNinetyTwoToNinetyFour[2]], dependencies: [], createdAt: now(), updatedAt: now() };
    await project.eventStore.append('task.upsert', next as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '贺氏设备捐赠合同', statement: '机架与传感器可无偿转移，但模型、建议层、数据回传、保险和维护原本绑定；公开校验后硬件维护拟与数据回传解绑，其他条款另选。', status: 'author-confirmed', evidence: [{ filePath: chaptersNinetyTwoToNinetyFour[0], quote: '所谓“无条件”，终于缩小到可以准确说明的范围。' }], updatedAt: now() },
    { id: uid('fact'), category: 'character', subject: '贺川', statement: '以个人校验武者身份参加九叠崩峰2.0公开实战，本次数据公开，不代表贺氏或特别班及其他贡献者授权。', status: 'text-explicit', evidence: [{ filePath: chaptersNinetyTwoToNinetyFour[1], quote: '校验武者：贺川。' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '九叠崩峰2.0', statement: '叠劲可在左右支点间迁移；切换需经过髋部中立窗口，提前切换会降低积劲并增加腰部反力。', status: 'text-explicit', evidence: [{ filePath: chaptersNinetyTwoToNinetyFour[2], quote: '积劲下降百分之十一，腰部左右反力上升。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '九叠公开校验第一轮', statement: '贺川27秒以六叠两次迁移击败江砚；江砚右肩黄伤，未调用余烬碑，旧固定左脚破法确认失效。', status: 'text-explicit', evidence: [{ filePath: chaptersNinetyTwoToNinetyFour[2], quote: '第一轮结束只用了二十七秒。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, fact.status === 'author-confirmed' ? 'author' : 'system');
  await setPosition({ filePath: chaptersNinetyTwoToNinetyFour[2], stage: '逐章创作、观察和修订', focus: '续写第095～097章：让移动的山付账' });
}

state = await project.state();
const chaptersNinetyFiveToNinetySeven = ['manuscript/第二卷-下城武考/第095章-肩伤不是一张通行证.md', 'manuscript/第二卷-下城武考/第096章-一座山换了七次脚.md', 'manuscript/第二卷-下城武考/第097章-赢一轮不等于得到机器.md'];
if (chaptersNinetyFiveToNinetySeven.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第095～097章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '完成肩伤限制下的后两轮校验：江砚以边界退势赢第二轮，贺川主动散去七叠赢第三轮；硬件报价与数据合同分开结算。', links: [...new Set([...current.links, ...chaptersNinetyFiveToNinetySeven])], updatedAt: now() } as never, 'writer');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第098～100章'))) {
    const next: CreativeTask = { id: uid('task'), title: '续写第098～100章：一万人的自选武考', description: '用新旧训练设备启动不限定流派的万人公开武考，让基础拳、职业动作与门阀秘传在同一目标下接受校验，并完成第二卷百章节点。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'high', whyNow: '九叠校验已证明公开不等于夺走秘传；下一步要让更多人带着自己的动作进入可比较、可追责的真实考试。', known: ['9台无模型新设备进入下城', '特别班已建立动作预登记与版本化评分', '瘦高学员仍是旧考核第21名'], missingDecisions: ['万人武考如何防止设备和教练资源再次决定报名资格？'], aiPreAnalysis: '第098章开放报名与线下入口；第099章设计跨流派共同目标和首轮压力测试；第100章万人武考开场，以一次非标准职业动作制造首个有效成绩。', authorDecision: '不按报名先后或统一姿势录取；共同目标使用救援、承力、连续发力与安全中止，技法来源和装备提前登记。', agentWork: '', completionCriteria: ['万人规模与报名偏差有可执行处理', '不同流派可比较但不被统一动作吞掉', '第100章形成明确新阶段钩子'], links: [chaptersNinetyFiveToNinetySeven[2]], dependencies: [], createdAt: now(), updatedAt: now() };
    await project.eventStore.append('task.upsert', next as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'timeline', subject: '九叠公开校验结果', statement: '贺川总比分2比1获胜；江砚以边界退势赢第二轮，贺川第三轮主动散去七叠改用基础短拳，完整九叠未在实战完成。', status: 'text-explicit', evidence: [{ filePath: chaptersNinetyFiveToNinetySeven[2], quote: '总比分：二比一。' }], updatedAt: now() },
    { id: uid('fact'), category: 'character', subject: '江砚', statement: '右肩黄伤限制下未调用余烬碑，以五节发力、烘炉阵退势和擂台边界迫使九叠2.0七次迁移，伤势轮后未恶化。', status: 'text-explicit', evidence: [{ filePath: chaptersNinetyFiveToNinetySeven[1], quote: '九叠迁移七次' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '贺氏设备落地选择', statement: '9馆接收无模型硬件并另购保险，17馆保留旧机，11馆试用封闭建议层且与低权限辅助并列；训练数据默认本地、逐次授权回传。', status: 'author-confirmed', evidence: [{ filePath: chaptersNinetyFiveToNinetySeven[2], quote: '三十七间没有被一场胜负变成同一种选择。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '万人自选武考', statement: '特别班宣布启动不限定崩山桩或私馆秘传的万人公开武考，参赛者可携登记基础动作进入同目标校验。', status: 'text-explicit', evidence: [{ filePath: chaptersNinetyFiveToNinetySeven[2], quote: '一万人可以带着自己登记过的基础动作进场。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, fact.status === 'author-confirmed' ? 'author' : 'system');
  await setPosition({ filePath: chaptersNinetyFiveToNinetySeven[2], stage: '逐章创作、观察和修订', focus: '续写第098～100章：一万人的自选武考' });
}

state = await project.state();
const chaptersNinetyEightToOneHundred = ['manuscript/第二卷-下城武考/第098章-报名不比谁的终端更快.md', 'manuscript/第二卷-下城武考/第099章-不同的拳做同一件事.md', 'manuscript/第二卷-下城武考/第100章-第一份有效成绩不是拳.md'];
if (chaptersNinetyEightToOneHundred.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第098～100章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '完成39702人报名分层抽取、跨流派救援目标设计与万人武考开场；职业动作停阀步取得首份有效成绩后被旧注册校验拦截。', links: [...new Set([...current.links, ...chaptersNinetyEightToOneHundred])], updatedAt: now() } as never, 'writer');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第101～103章'))) {
    const next: CreativeTask = { id: uid('task'), title: '续写第101～103章：第一份无效成绩', description: '处理停阀步申诉，修复发布阶段对无注册号动作的系统性排除，并让万人武考在不降低来源审计的前提下恢复。', level: 'chapter', status: 'now', kind: 'review', assignee: 'editor', source: 'navigator', priority: 'critical', whyNow: '总榜已暂停，312名自定义技法会被同一旧校验拦截；只手动放行梁守阀会留下系统性错误。', known: ['报名与预检明确允许职业动作和自定义', '停阀步完成目标且通过安全复现', '发布器要求武道注册号才能进入正式排名'], missingDecisions: ['没有传统来源证明时，什么证据足以确认动作由本人合法使用？'], aiPreAnalysis: '第101章拆出来源合法、动作有效与知识产权三类判断；第102章批量复算312名自定义动作；第103章恢复总榜并处理一项伪造自定义来源的真实作弊。', authorDecision: '合法来源不等于必须进入既有武库；本人声明、连续训练记录、预检复现和无他人权利主张可形成候选证据，争议动作单独冻结而非全体排除。', agentWork: '', completionCriteria: ['不是只为主角方手动开例外', '保留来源与侵权审计', '总榜恢复且至少识别一项真实作弊'], links: [chaptersNinetyEightToOneHundred[2]], dependencies: [], createdAt: now(), updatedAt: now() };
    await project.eventStore.append('task.upsert', next as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '万人武考报名', statement: '10天收到41867份申请，去重后39702人争10000首轮位置；按街区、班次与入口类型分层随机抽取，不按提交速度或技法类别。', status: 'author-confirmed', evidence: [{ filePath: chaptersNinetyEightToOneHundred[0], quote: '名额不按秒数排序' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '万人武考第一轮', statement: '以24米倾斜救援廊检验伤员完整、故障门通行、安全中止和复现稳定；评分在目标端，不按拳锋或流派动作直接计分。', status: 'author-confirmed', evidence: [{ filePath: chaptersNinetyEightToOneHundred[1], quote: '共同目标只有四个' }], updatedAt: now() },
    { id: uid('fact'), category: 'character', subject: '梁守阀', statement: '炉厂锅炉工，气血1.17，以21年关阀经验形成停阀步，在万人武考第17位取得72.6分首份有效成绩。', status: 'text-explicit', evidence: [{ filePath: chaptersNinetyEightToOneHundred[2], quote: '有效成绩：七十二点六。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '自定义技法排名申诉', statement: '旧发布器要求武道注册号，停阀步及312名自定义技法可能被系统性排除；总榜暂停但原始成绩保留。', status: 'text-explicit', evidence: [{ filePath: chaptersNinetyEightToOneHundred[2], quote: '它先变成了第一份申诉。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, fact.status === 'author-confirmed' ? 'author' : 'system');
  await setPosition({ filePath: chaptersNinetyEightToOneHundred[2], stage: '逐章创作、观察和修订', focus: '续写第101～103章：第一份无效成绩' });
}

state = await project.state();
const chaptersOneHundredOneToOneHundredThree = ['manuscript/第二卷-下城武考/第101章-注册号只证明登记过.md', 'manuscript/第二卷-下城武考/第102章-三百一十二份一起重算.md', 'manuscript/第二卷-下城武考/第103章-真的作弊有一条腕带.md'];
if (chaptersOneHundredOneToOneHundredThree.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第101～103章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '拆分动作结果、使用来源和武库登记，批量重算312份自定义技法；恢复停阀步成绩并确认纸号284隐藏助力腕带作弊。', links: [...new Set([...current.links, ...chaptersOneHundredOneToOneHundredThree])], updatedAt: now() } as never, 'editor');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第104～106章'))) {
    const next: CreativeTask = { id: uid('task'), title: '续写第104～106章：六条纪律失败记录', description: '调查万人武考中的闭眼听步如何连接栖山事故六名拒绝者，在保护参赛者身份与旧幸存者意愿的前提下核验传承链。', level: 'chapter', status: 'now', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'high', whyNow: '新发布规则首次让闭眼听步正常进入总榜，其动作特征与QS-73被排除的六条记录高度重合，第二卷跨城线索获得现实入口。', known: ['栖山事故有6名学员拒绝岳门守式', '5人存活、1人失踪的旧报记载尚未完整实名', '临渊参赛者使用闭眼听步取得第183份有效成绩'], missingDecisions: ['是否公开参赛者与旧幸存者的关系？'], aiPreAnalysis: '第104章先向参赛者说明相似性并取得分层授权；第105章用余秋水档案与动作差异核对传承；第106章确认可公开的最小事实，并让联合训练委员会回应六条排除记录。', authorDecision: '技法相似不授权追查私人身份；先询问参赛者，公开动作来源范围和制度事实，不公开旧幸存者姓名，除非本人明确同意。', agentWork: '', completionCriteria: ['至少两条独立证据核验传承', '参赛资格不因调查暂停', '隐私、正典和推断边界明确'], links: [chaptersOneHundredOneToOneHundredThree[2], 'research/天衡教练QS-73迁移包来源核验.md'], dependencies: [], createdAt: now(), updatedAt: now() };
    await project.eventStore.append('task.upsert', next as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '自定义技法发布规则', statement: '动作结果、参赛资格、使用来源与武库登记分别判断；无注册号不自动无效，具体权利争议冻结名称宣传和奖励而非吞掉原始成绩。', status: 'author-confirmed', evidence: [{ filePath: chaptersOneHundredOneToOneHundredThree[0], quote: '三项可以互相影响，不能再由一枚注册号全部替代。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '312份自定义技法复算', statement: '293份进入正常来源流程、9份待补充、10份有具体权利争议；已完赛成绩中仅纸号284因装备作弊作废。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredOneToOneHundredThree[2], quote: '三百一十二份中' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '纸号284作弊', statement: '以医疗固定带隐藏弹性能量膜，临场更换且错误声明无增幅；本场成绩作废，动作来源仍单独待核验。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredOneToOneHundredThree[2], quote: '装备未登记、检查时作出错误声明' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '闭眼听步传承', statement: '万人武考第183份有效成绩使用闭眼听步，与QS-73事故中六条纪律失败记录动作特征重合，传承与身份尚待授权核验。', status: 'agent-inferred', evidence: [{ filePath: chaptersOneHundredOneToOneHundredThree[2], quote: '用的也是闭眼听步。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, fact.status === 'author-confirmed' ? 'author' : 'system');
  await setPosition({ filePath: chaptersOneHundredOneToOneHundredThree[2], stage: '逐章创作、观察和修订', focus: '续写第104～106章：六条纪律失败记录' });
}

state = await project.state();
const chaptersOneHundredFourToOneHundredSix = ['manuscript/第二卷-下城武考/第104章-先问会走这一步的人.md', 'manuscript/第二卷-下城武考/第105章-第三步总会慢半拍.md', 'manuscript/第二卷-下城武考/第106章-纪律失败第一次被更正.md'];
if (chaptersOneHundredFourToOneHundredSix.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第104～106章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '经参赛者分层授权，以动作时序、19年前家庭笔记、炉厂事故和栖山封存登记核验一条幸存者传承，并推动委员会更正纪律失败标签。', links: [...new Set([...current.links, ...chaptersOneHundredFourToOneHundredSix, 'research/闭眼听步传承核验.md'])], updatedAt: now() } as never, 'researcher');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第107～109章'))) {
    const next: CreativeTask = { id: uid('task'), title: '续写第107～109章：第二声不在考场里', description: '万人武考第二轮开灯前出现非设备地底敲击，特别班需在疏散考生、定位声源和避免重演统一守式之间完成第一次无灯联合救援。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'critical', whyNow: '闭眼听步识别出真实异常，研究线必须转化为当下行动；五千余名考生仍在场，错误判断会造成大规模踩踏或地下设施事故。', known: ['所有考试冲击器仍待机', '异常为两次来自地板下的低响', '第二轮原计划两人交叉组队无灯救援'], missingDecisions: ['地底声源是星兽、旧节点还是人为设备？'], aiPreAnalysis: '第107章暂停比赛并分层疏散；第108章闭眼听步与阵列感知分别定位但不互相冒充证据；第109章地下检修中遭遇真实结构坍塌或兽体，完成联合救援并留下下一线索。', authorDecision: '先按未知结构风险处理，不宣布星兽袭击；闭眼听步只提供方向候选，必须用机械传感与人工检修交叉确认。', agentWork: '', completionCriteria: ['5000余人疏散有明确组织', '至少两种独立方法定位声源', '产生一次高武行动并揭示可验证的新线索'], links: [chaptersOneHundredFourToOneHundredSix[2]], dependencies: [], createdAt: now(), updatedAt: now() };
    await project.eventStore.append('task.upsert', next as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'knowledge', subject: '闭眼听步传承', statement: '经匿名分层授权，以动作特征、19年前家庭笔记、炉厂事故和栖山封存登记确认源自QS-73一名存活拒绝者；身份与完整教学权未公开。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredFourToOneHundredSix[1], quote: '可以确认传承来自五名存活拒绝者中的一人。' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '闭眼听步', statement: '不是六人共享的固定招式，而是多种拒绝锁定呼吸、改用声音和地面反馈动作的后设名称。', status: 'author-confirmed', evidence: [{ filePath: chaptersOneHundredFourToOneHundredSix[0], quote: '闭眼听步从来不是六个人练成同一招。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: 'QS-73纪律失败标签更正', statement: '委员会改为偏离指定守式，并补充5人生存1人失踪及至少1条家庭传承；未承认全部责任或授权争议。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredFourToOneHundredSix[2], quote: '新标签分成三行。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '训练廊地底第二声', statement: '万人武考第二轮开场前，闭眼听步识别两次非考试设备低响，所有冲击器仍待机，声源位于武院训练廊地底。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredFourToOneHundredSix[2], quote: '第二声不是考试设备。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, fact.status === 'author-confirmed' ? 'author' : 'system');
  await setPosition({ filePath: chaptersOneHundredFourToOneHundredSix[2], stage: '逐章创作、观察和修订', focus: '续写第107～109章：第二声不在考场里' });
}

state = await project.state();
const chaptersOneHundredSevenToOneHundredNine = ['manuscript/第二卷-下城武考/第107章-五千二百人先不要跑.md', 'manuscript/第二卷-下城武考/第108章-两个方向都没有说谎.md', 'manuscript/第二卷-下城武考/第109章-地底没有考试暂停键.md'];
if (chaptersOneHundredSevenToOneHundredNine.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第107～109章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '完成5247人分层疏散、听声与六点测振交叉定位，并以停阀步、短叠拳和机械支撑救出9名维修工；发现0055-C地板样本。', links: [...new Set([...current.links, ...chaptersOneHundredSevenToOneHundredNine])], updatedAt: now() } as never, 'writer');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第110～112章'))) {
    const next: CreativeTask = { id: uid('task'), title: '续写第110～112章：墙后的第三件样本', description: '在确认无人被困后调查0055-C步法地板为何埋入训练廊、第二声如何被当前训练激活，并追查三十二年前图纸删除记录。', level: 'chapter', status: 'now', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'high', whyNow: '维修工已全部救出但第二声持续，0055-C铭牌把当前结构事故与栖山第三件样本直接连接，必须在重开万人武考前确认风险。', known: ['0055-C为带步法记录的地板材料', '现行图纸把未回填旧道写成实心层', '第二声在配重损毁和人员救出后仍存在'], missingDecisions: ['地板样本保存的是谁的动作，以及是否仍具能量风险？'], aiPreAnalysis: '第110章确认无生命信号后有限开启旧腔；第111章读取地板只读步态并与六条记录比对；第112章追查图纸改写和安装责任，决定训练廊如何恢复。', authorDecision: '不能因疑似样本而忽略结构安全；先支撑、隔离和无生命确认，再读取最小数据，不让余烬碑直接覆盖现实检测。', agentWork: '', completionCriteria: ['结构安全先于样本研究', '0055-C内容至少两种证据交叉', '图纸变更责任产生可行动线索'], links: [chaptersOneHundredSevenToOneHundredNine[2], 'research/天衡教练QS-73迁移包来源核验.md'], dependencies: [], createdAt: now(), updatedAt: now() };
    await project.eventStore.append('task.upsert', next as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'timeline', subject: '训练廊紧急疏散', statement: '5247人在18分钟内按12廊4批撤离，无踩踏失联；2人过度换气、1人扭伤。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredSevenToOneHundredNine[0], quote: '五千二百四十七人全部越过外部安全线。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '训练廊地下救援', statement: '现行图纸错误标注旧道回填；救援组利用听声、六点测振、停阀步与机械支撑救出9名维修工，训练廊下沉11厘米未整体坍塌。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredSevenToOneHundredNine[2], quote: '九名维修工全部越过南侧封板。' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '闭眼听步现场定位边界', statement: '能识别更清晰回声与安全停步候选，不必等于最早声源方向；需与多点机械测振和结构图交叉。', status: 'author-confirmed', evidence: [{ filePath: chaptersOneHundredSevenToOneHundredNine[1], quote: '两种判断回答的不是同一个问题。' }], updatedAt: now() },
    { id: uid('fact'), category: 'foreshadowing', subject: '0055-C地板样本', statement: '栖山送临渊的带步法记录地板材料被发现埋在武院训练廊东南旧腔，配重损毁后仍发出两声，内容与安装责任待查。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredSevenToOneHundredNine[2], quote: 'LY-MED-0055-C。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, fact.status === 'author-confirmed' ? 'author' : 'system');
  await setPosition({ filePath: chaptersOneHundredSevenToOneHundredNine[2], stage: '逐章创作、观察和修订', focus: '续写第110～112章：墙后的第三件样本' });
}

state = await project.state();
const chaptersOneHundredTenToOneHundredTwelve = ['manuscript/第二卷-下城武考/第110章-墙后先确认没有人.md', 'manuscript/第二卷-下城武考/第111章-两次足跟撞击.md', 'manuscript/第二卷-下城武考/第112章-实心层从来没有回填.md'];
if (chaptersOneHundredTenToOneHundredTwelve.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第110～112章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '完成墙后生命排除、0055-C非破坏读取与图纸版本追踪；确认两声为零号维修员两次足跟动作的物理应力回放，并恢复9条安全走廊。', links: [...new Set([...current.links, ...chaptersOneHundredTenToOneHundredTwelve, 'research/0055-C地板样本核验.md'])], updatedAt: now() } as never, 'researcher');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第113～115章'))) {
    const next: CreativeTask = { id: uid('task'), title: '续写第113～115章：九条走廊重新开考', description: '在容量减少、部分选手延期和地下事故余波中恢复万人武考第二轮，让不同技法组成的双人组完成无灯救援与中途角色交换。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'high', whyNow: '结构与样本风险已分离，9条安全廊道可用；恢复流程必须验证冻结快照、延期退出和跨技法协作是否真正可执行。', known: ['3条受损廊道关闭、9条通过负载测试', '第二轮分组沿用事故前冻结快照', '参赛者可延期或退出且保留第一轮成绩'], missingDecisions: ['容量减少后如何重排而不改变原对手与休息时间？'], aiPreAnalysis: '第113章重排时段与场地选择；第114章闭眼听步与视觉型技法组队遇到角色交换；第115章首批成绩和事故反馈复盘，发现多人协作评分的新偏差。', authorDecision: '不重新抽签；按原组整体迁移时段，休息不足者顺延；退出不让剩余者自动获胜，由备用公共协作者补位但不计个人排名。', agentWork: '', completionCriteria: ['冻结状态恢复可核对', '至少一组完成高武无灯救援', '发现并记录新的协作评分问题'], links: [chaptersOneHundredTenToOneHundredTwelve[2]], dependencies: [], createdAt: now(), updatedAt: now() };
    await project.eventStore.append('task.upsert', next as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'knowledge', subject: '0055-C内容', statement: '物理应力纹与0055-B第六排除会话、物流底单交叉确认，记录零号维修员解除呼吸锁定、向声源靠近并两次足跟冲击的12秒动作；目的和结局未知。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredTenToOneHundredTwelve[1], quote: '四项时序完全一致。' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '0055-C低响', statement: '由17.4赫兹振动触发导能槽和压电矿粉的被动应力回放，不是活体、人格或过去求救意识。', status: 'author-confirmed', evidence: [{ filePath: chaptersOneHundredTenToOneHundredTwelve[0], quote: '材料或隐藏装置正在被动响应。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '训练廊图纸错误', statement: '六年前电子制图把停用且限制开挖的空腔映射为已回填实心层，前任院长批量验收、委员会资产分类和设施处未实测共同造成遗漏。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredTenToOneHundredTwelve[2], quote: '共同让一条仍在运动的旧道从当前图纸消失。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '万人武考恢复条件', statement: '3条受损廊道关闭，9条独立主梁走廊通过负载测试后恢复；原分组沿用冻结快照，可延期或退出且保留第一轮成绩。', status: 'author-confirmed', evidence: [{ filePath: chaptersOneHundredTenToOneHundredTwelve[2], quote: '第二轮分组沿用坍塌前冻结快照。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, fact.status === 'author-confirmed' ? 'author' : 'system');
  await setPosition({ filePath: chaptersOneHundredTenToOneHundredTwelve[2], stage: '逐章创作、观察和修订', focus: '续写第113～115章：九条走廊重新开考' });
}

state = await project.state();
const chaptersOneHundredThirteenToOneHundredFifteen = ['manuscript/第二卷-下城武考/第113章-不是重新抽一次签.md', 'manuscript/第二卷-下城武考/第114章-听见的人也要扛伤员.md', 'manuscript/第二卷-下城武考/第115章-总榜没有听见那句停.md'];
if (chaptersOneHundredThirteenToOneHundredFifteen.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第113～115章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '沿冻结快照把1000组迁入9条安全走廊，完成闭眼听步与光格步角色交换救援；发现个人协作分遗漏非标准指令与拒绝贡献。', links: [...new Set([...current.links, ...chaptersOneHundredThirteenToOneHundredFifteen])], updatedAt: now() } as never, 'writer');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第116～118章'))) {
    const next: CreativeTask = { id: uid('task'), title: '续写第116～118章：一句停值多少分', description: '修复双人救援的协作贡献评分，让非标准信息、执行转译、风险承担和拒绝错误建议都能留下证据，同时防止刷口令。', level: 'chapter', status: 'now', kind: 'review', assignee: 'editor', source: 'navigator', priority: 'high', whyNow: '首批50组中27组出现协作分偏差，团队资格可继续但个人排名不能长期悬空。', known: ['团队成绩证据可靠并已恢复', '个人协作栏暂为待复核', '系统只识别标准词库且可能按口令数量误计'], missingDecisions: ['无语言配合和拒绝错误建议如何计分？'], aiPreAnalysis: '第116章建立事件变化点而非口令数量；第117章抽样复核正反案例并处理搭档反馈冲突；第118章批量重算首批与后续组，公开仍需人工的边界。', authorDecision: '系统只提取候选变化点，不直接裁定贡献；团队共同结果与个人贡献分别展示，拒绝有害建议需有时序证据。', agentWork: '', completionCriteria: ['至少覆盖语言、牵引与拒绝三类贡献', '不能靠高频发言刷分', '首批个人排名恢复并可申诉'], links: [chaptersOneHundredThirteenToOneHundredFifteen[2]], dependencies: [], createdAt: now(), updatedAt: now() };
    await project.eventStore.append('task.upsert', next as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '万人武考事故后复赛', statement: '1000组整体沿冻结快照迁移至9条安全走廊；167人延期、24人退出保留首轮成绩，落单者可延期或由不计个人排名的公共协作者补位。', status: 'author-confirmed', evidence: [{ filePath: chaptersOneHundredThirteenToOneHundredFifteen[0], quote: '不是重新抽一次签。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '闭眼听步与光格步首组', statement: '以3分12秒完成无灯救援与角色交换，安全中止3次有效；团队81.4分，但初始个人分相差27分。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredThirteenToOneHundredFifteen[1], quote: '总用时三分十二秒。' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '双人协作贡献证据', statement: '候选分为提供新信息、转译为动作、承担动作风险、发现错误后修正；须绑定具体时点和结果变化，不按口令数量直接计分。', status: 'author-confirmed', evidence: [{ filePath: chaptersOneHundredThirteenToOneHundredFifteen[2], quote: '协作拆成四类候选证据' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '个人协作分复核', statement: '首批50组中21组低估导航节奏贡献、6组高估无效高频口令；团队成绩继续，个人协作栏待批量复核。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredThirteenToOneHundredFifteen[2], quote: '二十一组存在类似偏差' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, fact.status === 'author-confirmed' ? 'author' : 'system');
  await setPosition({ filePath: chaptersOneHundredThirteenToOneHundredFifteen[2], stage: '逐章创作、观察和修订', focus: '续写第116～118章：一句停值多少分' });
}

state = await project.state();
const chaptersOneHundredSixteenToOneHundredEighteen = ['manuscript/第二卷-下城武考/第116章-先找结果什么时候变了.md', 'manuscript/第二卷-下城武考/第117章-故意说错再拒绝.md', 'manuscript/第二卷-下城武考/第118章-团队的一百分不用切成两半.md'];
if (chaptersOneHundredSixteenToOneHundredEighteen.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第116～118章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '建立结果变化点候选与人工复核流程，覆盖语言、牵引和沉默否决；复算首批及影子运行后恢复个人协作分与申诉入口。', links: [...new Set([...current.links, ...chaptersOneHundredSixteenToOneHundredEighteen])], updatedAt: now() } as never, 'editor');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第119～121章'))) {
    const next: CreativeTask = { id: uid('task'), title: '续写第119～121章：搭档之间只留一个名额', description: '审查第三轮组内对战规则，在个人能力筛选、团队共同成果与400个训练席位之间制定不会追溯篡改第二轮价值的方案。', level: 'chapter', status: 'now', kind: 'planning', assignee: 'navigator', source: 'navigator', priority: 'high', whyNow: '400支晋级团队对应800人，但武院只有400个个人席位；第一名团队已拒绝签署组内淘汰。', known: ['第二轮团队排名已完成', '个人协作分已恢复并可申诉', '原第三轮要求组内对战胜者获得唯一席位'], missingDecisions: ['个人训练资源是否必须由组内淘汰分配？'], aiPreAnalysis: '第119章公开席位来源与原规则动机；第120章试行跨组个人考核而保留搭档回避；第121章处理资源仍不足的真实落选与第一名团队选择。', authorDecision: '第三轮可以考个人能力，但不强制与原搭档互相淘汰；采用跨组匹配与个人目标，第二轮团队成绩保留为独立成果，不直接加到第三轮。', agentWork: '', completionCriteria: ['个人能力有真实考核', '不把团队成绩追溯改成预赛工具', '400席位仍产生明确落选和申诉边界'], links: [chaptersOneHundredSixteenToOneHundredEighteen[2]], dependencies: [], createdAt: now(), updatedAt: now() };
    await project.eventStore.append('task.upsert', next as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '协作贡献复核', statement: 'Editor只提取团队结果变化点及相邻语音、绳力、脚步等证据，由人复核信息、转译、承险、纠错和无法确认，不按口令数量直接裁定。', status: 'author-confirmed', evidence: [{ filePath: chaptersOneHundredSixteenToOneHundredEighteen[0], quote: '系统不写“谁贡献了”。' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '拒绝错误建议', statement: '语言或非语言拒绝在确实避免外部风险或带来净改善时计入贡献；主动制造错误再恢复原状不获得纠错分。', status: 'author-confirmed', evidence: [{ filePath: chaptersOneHundredSixteenToOneHundredEighteen[1], quote: '不能先制造风险再领取消除它的分数。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '万人武考第二轮完成', statement: '1000组完成无灯协作；400队晋级，个人协作分恢复并开放48小时片段申诉，团队分与个人贡献分别展示。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredSixteenToOneHundredEighteen[2], quote: '第二轮一千组全部完成时' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '第三轮400席位争议', statement: '800名晋级者对应400个个人训练席位，原规则要求组内对战；第一名团队拒签，第三轮规则标为待确认。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredSixteenToOneHundredEighteen[2], quote: '第一名团队拒绝签署对战确认。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, fact.status === 'author-confirmed' ? 'author' : 'system');
  await setPosition({ filePath: chaptersOneHundredSixteenToOneHundredEighteen[2], stage: '逐章创作、观察和修订', focus: '续写第119～121章：搭档之间只留一个名额' });
}

state = await project.state();
const chaptersOneHundredNineteenToOneHundredTwentyOne = ['manuscript/第二卷-下城武考/第119章-四百个席位从哪里来.md', 'manuscript/第二卷-下城武考/第120章-不和最了解你的人打.md', 'manuscript/第二卷-下城武考/第121章-两个人也可以一起落选.md'];
if (chaptersOneHundredNineteenToOneHundredTwentyOne.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第119～121章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '将组内淘汰改为跨组攻守双场、独立排名前400；保留第二轮团队成果与真实落选，完成席位和资源包分离。', links: [...new Set([...current.links, ...chaptersOneHundredNineteenToOneHundredTwentyOne])], updatedAt: now() } as never, 'navigator');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第122～124章'))) {
    const next: CreativeTask = { id: uid('task'), title: '续写第122～124章：第六节终于属于自己', description: '在右肩恢复与五节动作稳定的既有基础上，让江砚完成不调用余烬碑的拳锋释放和安全回收，并用四百名学员数据检验而非只看单次峰值。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'high', whyNow: '万人武考阶段结束，主角个人武道需要兑现第二卷训练积累；第六节必须来自自身身体和公开反馈，不能成为制度剧情后的突然升级。', known: ['江砚气血仍约1.36', '个人版0.2可四成稳定接通第五节', '右肩恢复到正常活动九成五', '余烬碑在九叠校验中未调用'], missingDecisions: ['拳锋释放为何一直散掉，以及安全回收如何纳入第六节？'], aiPreAnalysis: '第122章区分击中与回收失败；第123章从400名学员的不同末节曲线找到个人窗口；第124章完成多次可复现六节但不跨境，并接受公开对照测试。', authorDecision: '第六节定义为拳锋释放与回收闭环，不以一次峰值判成；连续十拳至少八次接通且无黄伤才能升级个人版本。', agentWork: '', completionCriteria: ['不调用余烬碑或新增刻痕', '至少一次失败产生明确身体代价', '多次复现与医疗数据支持完成'], links: [chaptersOneHundredNineteenToOneHundredTwentyOne[2], 'manuscript/第二卷-下城武考/第082章-第五节不是第五块骨头.md'], dependencies: [], createdAt: now(), updatedAt: now() };
    await project.eventStore.append('task.upsert', next as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '万人武考第三轮', statement: '800人跨组完成守护与突破两场，按个人防守、突破、安全中止和稳定度排名前400；原搭档不互为首轮对手，团队分不加到个人轮。', status: 'author-confirmed', evidence: [{ filePath: chaptersOneHundredNineteenToOneHundredTwentyOne[0], quote: '新方案采用跨组匹配。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '万人武考400席位', statement: '109组双人晋级、127组双人落选，其余一进一出；第四百与四百零一相差0.09，未发现足以改名次的证据。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredNineteenToOneHundredTwentyOne[2], quote: '一百零九组两人同时晋级' }], updatedAt: now() },
    { id: uid('fact'), category: 'character', subject: '纸号4107', statement: '第二轮团队第一但第三轮个人排名417未获席位；保留团队成绩与学分，可有偿参与公共协作池。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredNineteenToOneHundredTwentyOne[2], quote: '纸号4107没有席位。' }], updatedAt: now() },
    { id: uid('fact'), category: 'character', subject: '江砚', statement: '万人武考结束时右肩恢复到九成五，气血仍约1.36，个人崩山桩0.2停在五节，准备无碑训练第六节。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredNineteenToOneHundredTwentyOne[2], quote: '现在审你的第六节。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, fact.status === 'author-confirmed' ? 'author' : 'system');
  await setPosition({ filePath: chaptersOneHundredNineteenToOneHundredTwentyOne[2], stage: '逐章创作、观察和修订', focus: '续写第122～124章：第六节终于属于自己' });
}

state = await project.state();
const chaptersOneHundredTwentyTwoToOneHundredTwentyFour = ['manuscript/第二卷-下城武考/第122章-打中以后拳还没有结束.md', 'manuscript/第二卷-下城武考/第123章-四百个人有二十七种收拳.md', 'manuscript/第二卷-下城武考/第124章-十拳至少要有八拳.md'];
if (chaptersOneHundredTwentyTwoToOneHundredTwentyFour.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第122～124章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '完成拳锋释放与全身回收重叠窗口训练，跨三天不同板面通过10拳8次与9次六节复现；气血境界未提升且余烬碑未调用。', links: [...new Set([...current.links, ...chaptersOneHundredTwentyTwoToOneHundredTwentyFour])], updatedAt: now() } as never, 'writer');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第125～127章'))) {
    const next: CreativeTask = { id: uid('task'), title: '续写第125～127章：这拳到底是谁的', description: '处理个人版0.3与周铁衣动作91%重合的来源问题，区分死者经验、公开基础拳、匿名贡献数据和江砚个人修正，决定可公开到哪一层。', level: 'chapter', status: 'now', kind: 'review', assignee: 'editor', source: 'navigator', priority: 'high', whyNow: '动作已多次复现但完整教学暂缓发布；若直接登记江砚原创会吞掉死者与公共贡献，若完全归周铁衣又删除活人修正。', known: ['周铁衣临终崩山桩进入余烬碑', '江砚本次训练未调用刻痕', '个人版0.3使用11份匿名授权曲线共性', '周小禾不能替父亲授权全部身体记录'], missingDecisions: ['死者无法授权时，经验可以公开到什么程度？'], aiPreAnalysis: '第125章建立动作来源图与不可授权部分；第126章让周小禾、贡献池和公共武库分别表达边界；第127章发布可验证原则与个人版本说明，不公开死者私人身体细节。', authorDecision: '不宣称纯原创或由家属代签；公开江砚可演示和自行总结的动作原则，周铁衣临终细节只保留来源与已公开遗愿范围，匿名样本只发布聚合共性。', agentWork: '', completionCriteria: ['至少四类来源分别处理', '周小禾不被迫替父亲授权', '公开版本保留可学习内容与不可公开边界'], links: [chaptersOneHundredTwentyTwoToOneHundredTwentyFour[2]], dependencies: [], createdAt: now(), updatedAt: now() };
    await project.eventStore.append('task.upsert', next as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '江砚崩山桩个人版0.3', statement: '第六节包括拳锋释放与全身回收重叠窗口；要求连续10拳至少8次完整、无腕肘肩黄伤且1秒内可再起势。', status: 'author-confirmed', evidence: [{ filePath: chaptersOneHundredTwentyTwoToOneHundredTwentyFour[2], quote: '个人版0.3正式确认。' }], updatedAt: now() },
    { id: uid('fact'), category: 'character', subject: '江砚', statement: '跨3天不同板面完成六节复现，第二天8/10、第三天9/10；余烬碑未亮，气血仍1.36、淬皮中段。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredTwentyTwoToOneHundredTwentyFour[2], quote: '气血仍是一点三六' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '个人训练数据授权', statement: '400名学员中347人授权匿名末节曲线、53人未授权且权益不变；江砚只用授权数据筛选候选，不补齐缺口。', status: 'author-confirmed', evidence: [{ filePath: chaptersOneHundredTwentyTwoToOneHundredTwentyFour[1], quote: '五十三人没有授权。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '个人版0.3来源争议', statement: '与周铁衣临终崩山桩动作重合91%，同时含公开武库、匿名贡献池与江砚修正；完整教学暂缓发布，需分别确认来源边界。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredTwentyTwoToOneHundredTwentyFour[2], quote: '重合百分之九十一。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, fact.status === 'author-confirmed' ? 'author' : 'system');
  await setPosition({ filePath: chaptersOneHundredTwentyTwoToOneHundredTwentyFour[2], stage: '逐章创作、观察和修订', focus: '续写第125～127章：这拳到底是谁的' });
}

state = await project.state();
const chaptersOneHundredTwentyFiveToOneHundredTwentySeven = ['manuscript/第二卷-下城武考/第125章-百分之九十一不是所有权.md', 'manuscript/第二卷-下城武考/第126章-周小禾不替死人签字.md', 'manuscript/第二卷-下城武考/第127章-公开一条原则不公开一具身体.md'];
if (chaptersOneHundredTwentyFiveToOneHundredTwentySeven.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第125～127章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '完成公开武库、周铁衣非主动记录、匿名聚合数据与江砚修正的四层来源图；发布原则、江砚演示与聚合证据，隔离不可授权材料。', links: [...new Set([...current.links, ...chaptersOneHundredTwentyFiveToOneHundredTwentySeven])], updatedAt: now() } as never, 'editor');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第128～130章'))) {
    const next: CreativeTask = { id: uid('task'), title: '续写第128～130章：截流手让六节变回五节', description: '完成多源公开技法守榜第一战，让江砚以个人版0.3对抗专门截断发力交接的沈氏截流手，并验证维护主体不等于拥有者。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'high', whyNow: '技法榜要求连续三种登记秘传挑战；第一战直接攻击0.3刚建立的六节交接，必须用已训练的释放回收而非新能力应对。', known: ['0.3连续复现六节但气血仍1.36', '截流手攻击动力链交接窗口', '完整教学包不含周铁衣原始临终轨迹'], missingDecisions: ['截流手如何识别重叠窗口，江砚怎样避免靠隐藏来源取胜？'], aiPreAnalysis: '第128章公开截流手规则与对手边界；第129章首轮交手六节被截断并暴露0.3弱点；第130章用可公开的回收与假交接应对，结算胜负和版本反馈。', authorDecision: '江砚不调用余烬碑；只能使用0.3、步法、主动中止和公开场地信息，赛后无论胜负都发布失败曲线。', agentWork: '', completionCriteria: ['截断机制有明确物理因果', '主角至少一次真实失败或受限', '守榜结果与技术维护/权利归属分别结算'], links: [chaptersOneHundredTwentyFiveToOneHundredTwentySeven[2]], dependencies: [], createdAt: now(), updatedAt: now() };
    await project.eventStore.append('task.upsert', next as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '开放崩山桩适配实例0.3来源', statement: '四层来源为公共崩山桩、周铁衣余烬记录的非主动影响、291份公开聚合授权、江砚自身伤势与复测修正；91%相似不等于所有权比例。', status: 'author-confirmed', evidence: [{ filePath: chaptersOneHundredTwentyFiveToOneHundredTwentySeven[0], quote: '百分之九十一不是所有权。' }], updatedAt: now() },
    { id: uid('fact'), category: 'character', subject: '周小禾', statement: '确认父亲长期练公共崩山桩及已公开事实，拒绝代签完整临终动作许可；训练本仅摘录动作相关最小信息。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredTwentyFiveToOneHundredTwentySeven[1], quote: '周小禾拒绝签“家属许可”。' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '0.3公开发布包', statement: '发布动作原则、江砚三日演示和291份聚合证据；不发布周铁衣临终轨迹痛觉、未授权教学数据与余烬碑内部信息。', status: 'author-confirmed', evidence: [{ filePath: chaptersOneHundredTwentyFiveToOneHundredTwentySeven[2], quote: '第四包不发布。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '多源技法守榜', statement: '技法榜要求0.3连续接受3种登记秘传挑战以试行多源条目；首位挑战为沈氏截流手，专攻发力链交接。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredTwentyFiveToOneHundredTwentySeven[2], quote: '第一名挑战者来自沈氏私馆。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, fact.status === 'author-confirmed' ? 'author' : 'system');
  await setPosition({ filePath: chaptersOneHundredTwentyFiveToOneHundredTwentySeven[2], stage: '逐章创作、观察和修订', focus: '续写第128～130章：截流手让六节变回五节' });
}

state = await project.state();
const chaptersOneHundredTwentyEightToOneHundredThirty = ['manuscript/第二卷-下城武考/第128章-截流手先碰你一下.md', 'manuscript/第二卷-下城武考/第129章-六节被截成三节.md', 'manuscript/第二卷-下城武考/第130章-下一拳从收拳开始.md'];
if (chaptersOneHundredTwentyEightToOneHundredThirty.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第128～130章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '完成截流手三轮守榜：首轮六节归零，后两轮以0.3主动中止、退步回收和重启路径二比一获胜，失败曲线全部公开。', links: [...new Set([...current.links, ...chaptersOneHundredTwentyEightToOneHundredThirty])], updatedAt: now() } as never, 'writer');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第131～133章'))) {
    const next: CreativeTask = { id: uid('task'), title: '续写第131～133章：绵甲把峰值吞掉', description: '完成第二场多源技法守榜，让0.3六节完整击中却无法形成有效伤害，检验公开拳是否过度依赖测力峰值。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'high', whyNow: '第一战解决交接被截，第二战将直接挑战“完整六节即有效”的默认判断，必须区分命中、穿透和连续控制。', known: ['0.3可在接触截断后安全重启', '顾氏绵甲允许受力进入后分散到皮膜与步幅', '江砚气血仍低于挑战者'], missingDecisions: ['不提高峰值时，如何让绵甲无法把单次冲击分散？'], aiPreAnalysis: '第131章公开绵甲结构与安全边界；第132章六节多次命中但伤害为零并承担反震；第133章用连续低峰、方向变化和回收节奏累积有效位移，结算第二场。', authorDecision: '不临时提升气血或调用余烬碑；使用0.3连续复现、步法和回收，胜负目标应为有效位移或信标而非打伤对手。', agentWork: '', completionCriteria: ['绵甲吸收机制可信', '主角完整命中仍真实失败', '应对不靠突然提高峰值'], links: [chaptersOneHundredTwentyEightToOneHundredThirty[2]], dependencies: [], createdAt: now(), updatedAt: now() };
    await project.eventStore.append('task.upsert', next as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '沈氏截流手', statement: '通过接触膝髋腰肩等下一节准备张力施加横向扰动，令动力链进入错误方向；需接触且误判会承受已完成拳劲。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredTwentyEightToOneHundredThirty[0], quote: '截流手不需要挡住拳头。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '多源技法第一场守榜', statement: '江砚首轮六节为零，后以0.3主动中止、退步回收与重启路径总比分2比1击败沈砺；未调用余烬碑。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredTwentyEightToOneHundredThirty[2], quote: '总比分：二比一。' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '0.3对抗接触边界', statement: '被截断后可安全结束并在一秒内重启；对抗下中止与重启只作为0.3.1候选，不静默覆盖0.3。', status: 'author-confirmed', evidence: [{ filePath: chaptersOneHundredTwentyEightToOneHundredThirty[2], quote: '没有自动覆盖0.3' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '多源技法第二场守榜', statement: '第二位挑战为顾氏绵甲，允许完整拳劲进入后分散峰值，直接挑战六节命中是否等于有效伤害。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredTwentyEightToOneHundredThirty[2], quote: '顾氏绵甲。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, fact.status === 'author-confirmed' ? 'author' : 'system');
  await setPosition({ filePath: chaptersOneHundredTwentyEightToOneHundredThirty[2], stage: '逐章创作、观察和修订', focus: '续写第131～133章：绵甲把峰值吞掉' });
}

state = await project.state();
const chaptersOneHundredThirtyOneToOneHundredThirtyThree = ['manuscript/第二卷-下城武考/第131章-绵甲允许拳完整打中.md', 'manuscript/第二卷-下城武考/第132章-三拳完整三拳无效.md', 'manuscript/第二卷-下城武考/第133章-不用一拳打穿一层甲.md'];
if (chaptersOneHundredThirtyOneToOneHundredThirtyThree.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第131～133章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '完成绵甲三轮守榜：首轮4次六节仍无效，后以低峰连续重启、多向位移和安全限制总比分2比1通过。', links: [...new Set([...current.links, ...chaptersOneHundredThirtyOneToOneHundredThirtyThree])], updatedAt: now() } as never, 'writer');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第134～136章'))) {
    const next: CreativeTask = { id: uid('task'), title: '续写第134～136章：拳永远差半步', description: '完成第三场多源技法守榜，让霍氏游隙步通过距离与时机拒绝接触，检验0.3在移动目标和追击诱导下是否仍能安全结束。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'high', whyNow: '前两场分别验证交接与结果，第三场将测试拳是否能抵达；江砚旧有追击过深问题会被游隙步直接利用。', known: ['江砚曾因追击过深造成肩腕风险', '0.3可主动中止并一秒重启', '游隙步不以硬防或截断应对'], missingDecisions: ['不提高速度时，如何迫使游隙步进入可攻击空间？'], aiPreAnalysis: '第134章公开游隙步边界与距离控制；第135章江砚追击失败并被反击；第136章用场地、假目标和主动停止压缩选择空间，结算第三场与多源条目。', authorDecision: '不临时提高速度或使用许观潮感知；依靠公开步法、边界、信标目标和0.3安全中止制造位置结果。', agentWork: '', completionCriteria: ['游隙步不是瞬移或无成本闪避', '主角追击旧错真实复现', '第三场结果完成多源技法试行验收'], links: [chaptersOneHundredThirtyOneToOneHundredThirtyThree[2]], dependencies: [], createdAt: now(), updatedAt: now() };
    await project.eventStore.append('task.upsert', next as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '顾氏绵甲', statement: '以皮膜筋膜与步幅把单点冲击扩散并导入地面；惧连续多向负荷、穿刺和失去落脚空间，不能消除总能量。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredThirtyOneToOneHundredThirtyThree[0], quote: '它不能消除总能量。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '多源技法第二场守榜', statement: '江砚首轮4次完整六节仍无有效结果，后以低峰连续重启与多向位移总比分2比1击败顾绫；未提高气血或调用余烬碑。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredThirtyOneToOneHundredThirtyThree[2], quote: '总比分：二比一。' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '0.3结果层', statement: '发力完成度、目标响应与自身代价分别展示；完整六节不自动等于有效作用，低节数也可通过连续位移达成目标。', status: 'author-confirmed', evidence: [{ filePath: chaptersOneHundredThirtyOneToOneHundredThirtyThree[2], quote: '完整六节从胜利条件退回一种可用选择。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '多源技法第三场守榜', statement: '第三位挑战者为霍氏游隙步，以距离和时机避免进入拳锋位置，测试0.3移动追击边界。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredThirtyOneToOneHundredThirtyThree[2], quote: '霍氏游隙步。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, fact.status === 'author-confirmed' ? 'author' : 'system');
  await setPosition({ filePath: chaptersOneHundredThirtyOneToOneHundredThirtyThree[2], stage: '逐章创作、观察和修订', focus: '续写第134～136章：拳永远差半步' });
}

state = await project.state();
const chaptersOneHundredThirtyFourToOneHundredThirtySix = ['manuscript/第二卷-下城武考/第134章-他不是更快只是少走半步.md', 'manuscript/第二卷-下城武考/第135章-追上去就已经输了.md', 'manuscript/第二卷-下城武考/第136章-拳不一定要追着人走.md'];
if (chaptersOneHundredThirtyFourToOneHundredThirtySix.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第134～136章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '完成游隙步三轮守榜：首轮追击过深黄伤，后以信标、边界与真实攻击扇形控制空间，总比分2比1通过第三场试行。', links: [...new Set([...current.links, ...chaptersOneHundredThirtyFourToOneHundredThirtySix])], updatedAt: now() } as never, 'writer');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第137～139章'))) {
    const next: CreativeTask = { id: uid('task'), title: '续写第137～139章：上榜以后谁来修', description: '处理多源技法上榜后的27000条反馈、错误拼装与维护负荷，建立不是所有者但能持续响应版本和安全问题的公共维护机制。', level: 'chapter', status: 'now', kind: 'review', assignee: 'editor', source: 'navigator', priority: 'high', whyNow: '守榜完成后使用规模骤增，若维护主体只有七人或依赖江砚个人，公开技法会在成功后迅速失去可用性。', known: ['0.3获得多源技法榜条目', '开放地形追击仍未验证', '上榜当晚收到27000条反馈'], missingDecisions: ['哪些反馈需要即时安全响应，谁有权发布临时补丁？'], aiPreAnalysis: '第137章聚类反馈并识别错误拼装；第138章建立分层维护与临时安全公告权限；第139章处理一次错误补丁和回滚，确认维护主体不等于所有者。', authorDecision: '自动聚类不直接改教材；红伤与可低成本阻断风险可由轮值安全组发布限时公告，永久版本仍需维护组复核并保留旧版。', agentWork: '', completionCriteria: ['27000条反馈有可执行分流', '临时补丁权限有期限和回滚', '江砚不成为单点维护者'], links: [chaptersOneHundredThirtyFourToOneHundredThirtySix[2]], dependencies: [], createdAt: now(), updatedAt: now() };
    await project.eventStore.append('task.upsert', next as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '霍氏游隙步', statement: '读取对手肩髋已确定的攻击扇形，只移动到边缘外半步；依赖可视起势、侧向空间和对手先给目标，不是绝对速度或瞬移。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredThirtyFourToOneHundredThirtySix[0], quote: '他不是更快只是少走半步' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '多源技法第三场守榜', statement: '江砚首轮追击过深右肩黄伤，后以信标、收缩边界和攻击扇形总比分2比1击败霍岑；未调用许观潮感知或余烬碑。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredThirtyFourToOneHundredThirtySix[2], quote: '总比分：二比一。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '0.3多源技法上榜', statement: '完成截流手、绵甲、游隙步三场试行后，以公共维护组为维护主体进入武院战斗技法榜；没有唯一所有者。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredThirtyFourToOneHundredThirtySix[2], quote: '获得多源技法条目。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '0.3上榜反馈洪水', statement: '上榜当晚收到27000条反馈，包含照抄个体封位、开放地形失败及错误理解多源拼装，需建立可持续维护机制。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredThirtyFourToOneHundredThirtySix[2], quote: '两万七千条新反馈。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, fact.status === 'author-confirmed' ? 'author' : 'system');
  await setPosition({ filePath: chaptersOneHundredThirtyFourToOneHundredThirtySix[2], stage: '逐章创作、观察和修订', focus: '续写第137～139章：上榜以后谁来修' });
}

state = await project.state();
const chaptersOneHundredThirtySevenToOneHundredThirtyNine = ['manuscript/第二卷-下城武考/第137章-两万七千条不是两万七千个问题.md', 'manuscript/第二卷-下城武考/第138章-临时补丁只有七十二小时.md', 'manuscript/第二卷-下城武考/第139章-回滚不等于撤掉警告.md'];
if (chaptersOneHundredThirtySevenToOneHundredThirtyNine.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第137～139章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '完成27000条反馈分流、72小时临时安全公告、过宽自动锁定回滚与第二版条件化补丁；建立六队轮值维护。', links: [...new Set([...current.links, ...chaptersOneHundredThirtySevenToOneHundredThirtyNine])], updatedAt: now() } as never, 'editor');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第140～142章'))) {
    const next: CreativeTask = { id: uid('task'), title: '续写第140～142章：没有主人不能跨城', description: '回应二十四城互认榜要求单一责任法人的规则，建立可承担维护与赔偿但不占有多源技法的跨城责任实体。', level: 'chapter', status: 'now', kind: 'planning', assignee: 'navigator', source: 'navigator', priority: 'high', whyNow: '0.3已证明本地维护能力，却被限制不得跨城；第二卷栖山与联合委员会线需要在卷末形成制度行动。', known: ['联合委员会要求单一责任法人', '0.3无唯一权利主体但有公共维护组', '临时补丁与回滚已有事件证据'], missingDecisions: ['谁承担跨城伤害赔偿且不获得动作所有权？'], aiPreAnalysis: '第140章拆解责任法人真正需要承担的义务；第141章建立公共维护信托或合作社并设计保证金；第142章委员会试行审批与栖山首个跨城节点。', authorDecision: '责任实体只承担版本响应、保险与赔偿接口，不获得公共基础拳、死者记录或匿名数据所有权；重大来源变更仍按各自许可。', agentWork: '', completionCriteria: ['责任与所有权明确分离', '跨城赔偿和下架流程可执行', '栖山成为首个现实试点而非口头认可'], links: [chaptersOneHundredThirtySevenToOneHundredThirtyNine[2]], dependencies: [], createdAt: now(), updatedAt: now() };
    await project.eventStore.append('task.upsert', next as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'timeline', subject: '0.3上榜反馈', statement: '27000条反馈分为学习、个体时序、开放地形、医疗、来源、设备及2000条同源商业模板；7例腕部持续麻木触发紧急复核。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredThirtySevenToOneHundredThirtyNine[0], quote: '两万七千条重新统计。' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '临时安全补丁', statement: '9人轮值安全组可发布72小时限时公告，需医疗、设备、使用者代表共同同意；到期重新签署，不能自动转永久版本。', status: 'author-confirmed', evidence: [{ filePath: chaptersOneHundredThirtySevenToOneHundredThirtyNine[1], quote: '临时安全公告有效七十二小时。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '0.3第一轮安全补丁回滚', statement: '设备实现把组合风险误扩成所有连续10次自动锁定，27小时后回滚；第二版按高力量、短间隔与实际麻木分层，康复课程恢复。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredThirtySevenToOneHundredThirtyNine[2], quote: '回滚不等于撤掉警告' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '0.3跨城互认限制', statement: '联合训练委员会要求跨城条目有单一责任法人，无唯一权利主体的0.3暂限临渊本地展示。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredThirtySevenToOneHundredThirtyNine[2], quote: '仅限临渊本地展示' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, fact.status === 'author-confirmed' ? 'author' : 'system');
  await setPosition({ filePath: chaptersOneHundredThirtySevenToOneHundredThirtyNine[2], stage: '逐章创作、观察和修订', focus: '续写第140～142章：没有主人不能跨城' });
}

state = await project.state();
const chaptersOneHundredFortyToOneHundredFortyTwo = ['manuscript/第二卷-下城武考/第140章-委员会要找一个可以告的人.md', 'manuscript/第二卷-下城武考/第141章-保证金不能买走这套拳.md', 'manuscript/第二卷-下城武考/第142章-栖山先收到一份不完整的拳.md'];
if (chaptersOneHundredFortyToOneHundredFortyTwo.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第140～142章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '成立只承担维护、保险与赔偿的开放武道维护合作社，筹集独立保证金，并完成临渊—栖山双节点0.3跨城试行。', links: [...new Set([...current.links, ...chaptersOneHundredFortyToOneHundredFortyTwo])], updatedAt: now() } as never, 'navigator');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第143～145章'))) {
    const next: CreativeTask = { id: uid('task'), title: '续写第143～145章：四百个人没有同一份结业拳', description: '完成下城特别班首期结业，让400名学员以个人动作版本、教学与失败记录通过，而不是复制江砚0.3；同时明确班级和维护合作社后续关系。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'high', whyNow: '跨城试行已启动，第二卷需要收束特别班教育成果；结业不能把公共武道重新变成统一标准动作。', known: ['400名正式学员来自万人武考', '0.3只是江砚身体实例', '维护合作社已承担跨城责任'], missingDecisions: ['结业最小共同标准是什么？'], aiPreAnalysis: '第143章公布结业目标与多版本提交；第144章抽查相互教学和真实失败；第145章颁发结业记录并处理未通过者，不强制同日毕业。', authorDecision: '共同标准为动作来源清楚、安全中止、三次复现、能向另一人解释适用边界；不要求六节或统一拳种。', agentWork: '', completionCriteria: ['至少展示三种不同结业动作', '未通过者有具体补做而非被永久淘汰', '特别班后续组织关系清楚'], links: [chaptersOneHundredFortyToOneHundredFortyTwo[2]], dependencies: [], createdAt: now(), updatedAt: now() };
    await project.eventStore.append('task.upsert', next as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '开放武道维护合作社', statement: '作为跨城责任实体承担送达、风险响应、版本下架、保险和赔偿，不拥有公共拳、周铁衣记录或匿名数据；关闭时需移交维护主体。', status: 'author-confirmed', evidence: [{ filePath: chaptersOneHundredFortyToOneHundredFortyTwo[0], quote: '它不持有公共崩山桩' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '跨城维护保证金', statement: '20万独立托管，不购买动作权利；版本或补丁错误先赔，设备与场馆按责任追偿，匿名合法贡献者不承担未来运营连带责任。', status: 'author-confirmed', evidence: [{ filePath: chaptersOneHundredFortyToOneHundredFortyTwo[1], quote: '保证金不能买走这套拳。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '临渊栖山0.3跨城试行', statement: '委员会批准90天双节点互认；栖山软层导致7人断链2人脚踝黄线，暂停跟练并增加场地回弹预检后恢复。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredFortyToOneHundredFortyTwo[2], quote: '临渊—栖山双节点互认' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '特别班首期结业', statement: '400名正式学员将以个人动作来源、安全中止、复现和教学边界完成结业，不复制统一0.3。', status: 'agent-inferred', evidence: [{ filePath: chaptersOneHundredFortyToOneHundredFortyTwo[2], quote: '第二卷特别班第一次把一项维护中的公共武道送出临渊。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, fact.status === 'author-confirmed' ? 'author' : 'system');
  await setPosition({ filePath: chaptersOneHundredFortyToOneHundredFortyTwo[2], stage: '逐章创作、观察和修订', focus: '续写第143～145章：四百个人没有同一份结业拳' });
}

state = await project.state();
const chaptersOneHundredFortyThreeToOneHundredFortyFive = ['manuscript/第二卷-下城武考/第143章-结业不要求打出六节.md', 'manuscript/第二卷-下城武考/第144章-会打不会教还不算完成.md', 'manuscript/第二卷-下城武考/第145章-三百六十七个人先结业.md'];
if (chaptersOneHundredFortyThreeToOneHundredFortyFive.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第143～145章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '完成400人多版本结业：367人首批完成，33人按互教、来源、设备、医疗或延期继续补做；特别班与维护合作社职责分离。', links: [...new Set([...current.links, ...chaptersOneHundredFortyThreeToOneHundredFortyFive])], updatedAt: now() } as never, 'writer');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第146～148章'))) {
    const next: CreativeTask = { id: uid('task'), title: '续写第146～148章：零号维修员的右手手套', description: '在栖山分层授权下非破坏比对零号维修员手套与0055-A指骨，确认或否定失踪者样本身份，并处理联合委员会的证据权限。', level: 'chapter', status: 'now', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'critical', whyNow: '第二卷结业后跨城证据实物抵达；0055-A身份是栖山三件样本链与零号维修员命运的核心未决问题。', known: ['手套失踪前留在栖山档案馆', '0055-A为无名男性右手指骨', '栖山只授权一次非破坏比对'], missingDecisions: ['哪些指标足以建立同一人而不提取破坏性遗传材料？'], aiPreAnalysis: '第146章制定手套与指骨非破坏比对范围；第147章以磨损、气血纹和旧伤结构交叉；第148章发布分级结论并处理手套返还，不用身份确认自动推断死亡经过。', authorDecision: '不切割手套或指骨，不做未经授权的遗传提取；同一人结论至少需两类独立结构证据，死亡与运输过程仍单独待证。', agentWork: '', completionCriteria: ['授权范围与返还明确', '至少两类独立证据', '身份、死亡、责任结论分开'], links: [chaptersOneHundredFortyThreeToOneHundredFortyFive[2], 'research/0055-C地板样本核验.md'], dependencies: [], createdAt: now(), updatedAt: now() };
    await project.eventStore.append('task.upsert', next as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '特别班结业标准', statement: '共同要求为来源清楚、安全中止、两种条件各3次复现、能向另一人解释适用与失败边界；不要求六节或统一拳种。', status: 'author-confirmed', evidence: [{ filePath: chaptersOneHundredFortyThreeToOneHundredFortyFive[0], quote: '只有四项共同要求。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '特别班首期结业', statement: '400名正式学员中367人首批结业，33人按互教、来源、设备、医疗暂停或主动延期继续补做；未通过者不公开姓名。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredFortyThreeToOneHundredFortyFive[2], quote: '第一批结业人数是三百六十七。' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '特别班与维护合作社', statement: '班级负责教学和动作试验，合作社负责跨城版本、风险响应与赔偿；原49人不自动获得永久组织权。', status: 'author-confirmed', evidence: [{ filePath: chaptersOneHundredFortyThreeToOneHundredFortyFive[2], quote: '不是同一个机构。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '零号维修员右手手套', statement: '栖山车队带来失踪前留存手套，授权一次非破坏比对0055-A无名右手指骨，身份待核验。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredFortyThreeToOneHundredFortyFive[2], quote: '零号维修员失踪前留在栖山档案馆的右手手套。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, fact.status === 'author-confirmed' ? 'author' : 'system');
  await setPosition({ filePath: chaptersOneHundredFortyThreeToOneHundredFortyFive[2], stage: '逐章创作、观察和修订', focus: '续写第146～148章：零号维修员的右手手套' });
}

state = await project.state();
const chaptersOneHundredFortySixToOneHundredFortyEight = ['manuscript/第二卷-下城武考/第146章-手套只允许打开一次.md', 'manuscript/第二卷-下城武考/第147章-断过的无名指.md', 'manuscript/第二卷-下城武考/第148章-同一个人不等于同一种结局.md'];
if (chaptersOneHundredFortySixToOneHundredFortyEight.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第146～148章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '完成手套与0055-A一次性非破坏比对，以无名指旧伤几何和11节点导能纹确认同属零号维修员；姓名、生死与取骨方式保持未知。', links: [...new Set([...current.links, ...chaptersOneHundredFortySixToOneHundredFortyEight, 'research/零号维修员手套与0055-A非破坏比对.md'])], updatedAt: now() } as never, 'researcher');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第149～151章'))) {
    const next: CreativeTask = { id: uid('task'), title: '续写第149～151章：四百人第一次上城墙', description: '收束第二卷并启动裂潮危机，让特别班结业学员按自愿与能力进入城防支援，不把课程结业自动变成征召；建立第三卷目标。', level: 'volume', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'critical', whyNow: '南墙外7公里地裂正在形成垂直兽潮，原炮角无法覆盖；第二卷教育成果必须在真实城防动员中接受下一阶段检验。', known: ['持续供能已把48小时阈值延长6周', '供能未降但外部压力上升', '裂潮位于南墙外13公里且长7公里'], missingDecisions: ['结业学员以何种身份参与城防，谁可以拒绝？'], aiPreAnalysis: '第149章公开裂潮证据和支援需求；第150章学员分别选择战斗、救援、设备、记录或不参加；第151章第一批上墙并建立第三卷《裂潮城防》目标与任务。', authorDecision: '结业不等于征召授权；个人确认具体岗位、风险和退出条件，未结业与退出者不降信用。', agentWork: '', completionCriteria: ['第二卷核心成果清晰收束', '动员有自愿与岗位边界', '第三卷目标和首组三章任务写入状态'], links: [chaptersOneHundredFortySixToOneHundredFortyEight[2], 'planning/百万字总纲.md'], dependencies: [], createdAt: now(), updatedAt: now() };
    await project.eventStore.append('task.upsert', next as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'knowledge', subject: '0055-A身份范围', statement: '无名指旧伤几何与11节点导能纹两类证据确认0055-A与栖山手套属于零号维修员同一人；零号维修员仍是角色代号，真实姓名未知。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredFortySixToOneHundredFortyEight[1], quote: '0055-A属于零号维修员。' }], updatedAt: now() },
    { id: uid('fact'), category: 'knowledge', subject: '零号维修员结局边界', statement: '现有证据不能确认事故后生死、指骨为遗体还是活体医疗取得、谁决定转运；未用余烬碑填补。', status: 'author-confirmed', evidence: [{ filePath: chaptersOneHundredFortySixToOneHundredFortyEight[2], quote: '不知道。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '栖山手套返还', statement: '一次非破坏比对后恢复原封并由栖山车队确认封条、湿度与开箱时长；临渊仅保留授权特征摘要。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredFortySixToOneHundredFortyEight[2], quote: '手套恢复原封。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '南墙裂潮', statement: '持续供能把核心阈值延长6周后，南墙外13公里出现长7公里地裂，地下星兽垂直上涌，原墙炮角无法覆盖。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredFortySixToOneHundredFortyEight[2], quote: '裂潮。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, 'system');
  await setPosition({ filePath: chaptersOneHundredFortySixToOneHundredFortyEight[2], stage: '第二卷收束与第三卷启动', focus: '续写第149～151章：四百人第一次上城墙' });
}

state = await project.state();
const chaptersOneHundredFortyNineToOneHundredFiftyOne = ['manuscript/第二卷-下城武考/第149章-结业名单不是征召名单.md', 'manuscript/第二卷-下城武考/第150章-四百个人选了五种岗位.md', 'manuscript/第二卷-下城武考/第151章-第三卷从七公里裂缝开始.md'];
if (chaptersOneHundredFortyNineToOneHundredFiftyOne.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第149～151章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '完成400人岗位选择、337人分层城防支援与第七支线首次引流；第二卷81章收束，裂潮危机正式启动。', links: [...new Set([...current.links, ...chaptersOneHundredFortyNineToOneHundredFiftyOne])], updatedAt: now() } as never, 'writer');
  state = await project.state();
  for (const goal of state.goals.filter((item) => item.status === 'active' && item.title.includes('第二卷《下城武考》'))) await project.eventStore.append('goal.upsert', { ...goal, status: 'completed', updatedAt: now() } as never, 'author');
  state = await project.state();
  if (!state.goals.some((item) => item.title.includes('第三卷《裂潮城防》'))) {
    await project.eventStore.append('goal.upsert', { id: uid('goal'), level: 'volume', title: '完成第三卷《裂潮城防》并建立多层城防协作', description: '约77章：应对南墙外7公里垂直裂潮，让特别班、城防军、工业与居民网络形成可持续防线。', authority: 'author-pinned', status: 'active', target: 'manuscript/第三卷-裂潮城防', updatedAt: now() } as never, 'author');
  }
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第152～154章'))) {
    await project.eventStore.append('task.upsert', { id: uid('task'), title: '续写第152～154章：炮口打不到地底', description: '进入第三卷，处理12条确认裂缝、7条冲突信号和垂直炮角缺失，建立裂潮第一版多层防线。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'critical', whyNow: '第七支线仅获得90秒，其他裂缝仍在上升；现有墙炮、冷却与近线岗位无法按旧平面兽潮逻辑运作。', known: ['第七支线出现四阶候选巨爪', '巨爪追踪机械能量', '12条裂缝确认兽群、7条信号冲突'], missingDecisions: ['第一版防线按深度、岗位还是能量目标分层？'], aiPreAnalysis: '第152章恢复冷却并核对裂缝层级；第153章建立地面引流、井下传感、墙炮横击三层；第154章第一波多点上涌检验防线。', authorDecision: '不把同步信号直接合并成单一巨兽；每层有独立证据与退出条件，墙炮只打获得横向角度的目标。', agentWork: '', completionCriteria: ['第三卷环境与即时目标清晰', '多层防线可执行', '至少一次裂潮实战验证'], links: [chaptersOneHundredFortyNineToOneHundredFiftyOne[2], 'planning/百万字总纲.md'], dependencies: [], createdAt: now(), updatedAt: now() } as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'timeline', subject: '特别班裂潮支援选择', statement: '400人中138战斗、96救援、72设备、31物流记录、63暂不参加；最终337人分五类岗位支援，结业不等于征召。', status: 'author-confirmed', evidence: [{ filePath: chaptersOneHundredFortyNineToOneHundredFiftyOne[0], quote: '三百三十七个选择。' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '裂潮', statement: '南墙外13公里、长7公里的地裂带含46条支线，地下星兽垂直上涌，原墙炮无法覆盖深处且重弹可能损伤武脉管线。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredFortyNineToOneHundredFiftyOne[1], quote: '七公里主裂带下分出四十六条支线' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '第七支线首次接触', statement: '四阶候选巨爪追踪冷却主管机械能量；特别班以停流、废钢架引流和墙炮横击逼退，获得90秒但未击杀。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredFortyNineToOneHundredFiftyOne[2], quote: '它只让一条支线多出九十秒。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '第三卷裂潮城防', statement: '目标是在裂潮城市中让特别班、军队、工业与居民的不同动作形成多层可持续防线，而非证明单一公开武道正确。', status: 'author-confirmed', evidence: [{ filePath: chaptersOneHundredFortyNineToOneHundredFiftyOne[2], quote: '让不同答案真正组成防线。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, fact.status === 'author-confirmed' ? 'author' : 'system');
  await setPosition({ filePath: chaptersOneHundredFortyNineToOneHundredFiftyOne[2], stage: '第三卷《裂潮城防》启动', focus: '续写第152～154章：炮口打不到地底' });
}

state = await project.state();
const chaptersOneHundredFiftyTwoToOneHundredFiftyFour = ['manuscript/第三卷-裂潮城防/第152章-冷却主管只剩九十秒.md', 'manuscript/第三卷-裂潮城防/第153章-地底地面和炮口各守一层.md', 'manuscript/第三卷-裂潮城防/第154章-第一波从四个深度上来.md'];
if (chaptersOneHundredFiftyTwoToOneHundredFiftyFour.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第152～154章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '恢复冷却主管并建立井下传感、地面引流、墙炮横击三层防线；首波4深度实战撑过11分钟，无死亡并暴露第17支线双目标。', links: [...new Set([...current.links, ...chaptersOneHundredFiftyTwoToOneHundredFiftyFour])], updatedAt: now() } as never, 'writer');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第155～157章'))) {
    await project.eventStore.append('task.upsert', { id: uid('task'), title: '续写第155～157章：第十七支线不是误差', description: '调查第17支线两个相反深度目标如何汇合，避免合成平均值，处理一深一浅两类星兽同时冲击同一出口。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'critical', whyNow: '两组信号已确认不是仪器误差，若继续按平均深度布防会让两类目标同时绕过。', known: ['第17支线有两个不同深度移动目标', '第一版三层防线已暴露信息线易受攻击', '墙炮需横向角度才能安全射击'], missingDecisions: ['深层目标是否在驱赶浅层兽群？'], aiPreAnalysis: '第155章分离双目标轨迹；第156章浅层兽先出并破坏出口；第157章深层目标出现，验证两者关系并调整防线。', authorDecision: '先作为两个独立目标布防，不提前写成协同或捕食关系；通过实物行为再更新。', agentWork: '', completionCriteria: ['两个目标轨迹分别可核验', '平均值错误被明确避免', '第二次实战推动裂潮机制'], links: [chaptersOneHundredFiftyTwoToOneHundredFiftyFour[2]], dependencies: [], createdAt: now(), updatedAt: now() } as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '裂潮三层防线', statement: '井下层只传感不派人，地面层引流与封口，墙炮层只打获得横向角度的目标；各层有独立证据与中止权。', status: 'author-confirmed', evidence: [{ filePath: chaptersOneHundredFiftyTwoToOneHundredFiftyFour[1], quote: '三层不是上级对下级。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '裂潮第一波', statement: '4种深度上涌，三层防线撑过11分钟，4名黄伤无死亡，损失7传感器2震源1通道，3支线暂封。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredFiftyTwoToOneHundredFiftyFour[2], quote: '防线第一版撑过十一分钟。' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '裂潮星兽学习', statement: '第七支线巨爪记住废钢架诱饵并主动切断九灯节点同步线，防线信息连接会成为攻击目标。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredFiftyTwoToOneHundredFiftyFour[2], quote: '开始攻击防线的信息连接。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '第十七支线双目标', statement: '两组相反深度信号同时向同一出口移动，确认非仪器误差，至少存在两个目标。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredFiftyTwoToOneHundredFiftyFour[2], quote: '那里至少有两个目标' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, fact.status === 'author-confirmed' ? 'author' : 'system');
  await setPosition({ filePath: chaptersOneHundredFiftyTwoToOneHundredFiftyFour[2], stage: '第三卷裂潮第一阶段', focus: '续写第155～157章：第十七支线不是误差' });
}
state = await project.state();
const chaptersOneHundredFiftyFiveToOneHundredFiftySeven = ['manuscript/第三卷-裂潮城防/第155章-平均深度下面什么也没有.md', 'manuscript/第三卷-裂潮城防/第156章-浅层兽群先撞出来.md', 'manuscript/第三卷-裂潮城防/第157章-深层目标没有追它们.md'];
if (chaptersOneHundredFiftyFiveToOneHundredFiftySeven.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第155～157章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '分离第17支线浅层铲背兽与深层岩肺兽轨迹，捕获37只浅层兽并以废矿井有限泄压让深层目标停在60米。', links: [...new Set([...current.links, ...chaptersOneHundredFiftyFiveToOneHundredFiftySeven])], updatedAt: now() } as never, 'writer');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第158～160章'))) {
    await project.eventStore.append('task.upsert', { id: uid('task'), title: '续写第158～160章：让地裂先呼吸', description: '把第17支线有限泄压扩展到4条周期挤压支线，建立不会把废矿井变成新兽口的压力防线。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'critical', whyNow: '4条支线出现岩肺式周期挤压，若不提前泄压会持续挤出浅层兽群；过度开井又会制造新出口。', known: ['第17支线12厘米开度降低地表压力23%', '岩肺兽停在60米但未击败', '其他4支线出现相同周期'], missingDecisions: ['哪些旧井可安全承担压力与粉尘？'], aiPreAnalysis: '第158章审计旧井与居民风险；第159章建立错峰泄压网；第160章多支线同时收缩检验压力防线。', authorDecision: '泄压井必须无人、远离供能与居民，并有可远程关闭和粉尘处理；不把第17支线参数直接复制。', agentWork: '', completionCriteria: ['至少3条支线独立校准', '过度泄压风险真实出现', '压力防线与前三层协同'], links: [chaptersOneHundredFiftyFiveToOneHundredFiftySeven[2]], dependencies: [], createdAt: now(), updatedAt: now() } as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '第17支线双目标', statement: '浅层37只一阶铲背兽与深层岩肺兽为两个独立目标；前者受岩层压力触发逃离，非后者有意识驱赶。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredFiftyFiveToOneHundredFiftySeven[2], quote: '两个生命系统' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '岩肺兽', statement: '现场代号；伸缩岩囊主体通过膨胀吸入裂隙气体星力、收缩推高压力碎石，爆破可能造成地层瞬间失压。', status: 'agent-inferred', evidence: [{ filePath: chaptersOneHundredFiftyFiveToOneHundredFiftySeven[2], quote: '设备组暂命名岩肺兽。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '第17支线有限泄压', statement: '废矿井封盖开至12厘米使地表压力下降23%，岩肺兽停在60米并获得6小时窗口；开度受新裂纹限制。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredFiftyFiveToOneHundredFiftySeven[2], quote: '获得六小时窗口。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '裂潮压力呼吸', statement: '另4条支线出现相同周期挤压，裂潮可能包含地层压力与岩肺类目标共同形成的呼吸机制。', status: 'agent-inferred', evidence: [{ filePath: chaptersOneHundredFiftyFiveToOneHundredFiftySeven[2], quote: '整片地层都在呼吸。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, 'system');
  await setPosition({ filePath: chaptersOneHundredFiftyFiveToOneHundredFiftySeven[2], stage: '第三卷裂潮压力阶段', focus: '续写第158～160章：让地裂先呼吸' });
}
state = await project.state();
const chaptersOneHundredFiftyEightToOneHundredSixty = ['manuscript/第三卷-裂潮城防/第158章-不是每一口旧井都能呼吸.md', 'manuscript/第三卷-裂潮城防/第159章-四口井不能同时打开.md', 'manuscript/第三卷-裂潮城防/第160章-地裂第一次反向呼吸.md'];
if (chaptersOneHundredFiftyEightToOneHundredSixty.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第158～160章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '审计24口旧井仅2口可用，建立错峰泄压并处理第6井卡死；四支线同步收缩峰值下降20%，同时发现粉尘气血孢囊。', links: [...new Set([...current.links, ...chaptersOneHundredFiftyEightToOneHundredSixty])], updatedAt: now() } as never, 'writer');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第161～163章'))) {
    await project.eventStore.append('task.upsert', { id: uid('task'), title: '续写第161～163章：粉尘让三个人一起发热', description: '隔离并核验裂潮粉尘中的气血孢囊，区分感染、同步刺激与设备污染，保护泄压人员和物资线。', level: 'chapter', status: 'now', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'critical', whyNow: '3名过滤员静息气血同步上浮，泄压网络可能把地底风险带入人体与城内物资。', known: ['粉尘在密封操作下仍影响3人', '体温和静息气血10分钟同步上升', '第17井物资线已封锁'], missingDecisions: ['孢囊是否可在人与人之间传播？'], aiPreAnalysis: '第161章隔离与对照采样；第162章区分粉尘暴露与人际传播；第163章建立粉尘防线并恢复有限泄压。', authorDecision: '不先称感染；分别检测过滤器、空气、血液与未暴露接触者，只有独立传播证据才升级隔离。', agentWork: '', completionCriteria: ['至少两组对照', '传播结论有边界', '泄压与人员保护能同时继续'], links: [chaptersOneHundredFiftyEightToOneHundredSixty[2]], dependencies: [], createdAt: now(), updatedAt: now() } as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '裂潮错峰泄压', statement: '旧井须独立审计居民、供能、承力、风向与远程关闭；井口按岩肺收缩错峰开启，通信中断默认关闭。', status: 'author-confirmed', evidence: [{ filePath: chaptersOneHundredFiftyEightToOneHundredSixty[1], quote: '泄压计划改为错峰。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '四支线同步泄压', statement: '第17井主泄压、其他支线用疏散引流与停流配合，使压力峰值较无泄压预测低20%；第6井卡死后爆栓关闭。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredFiftyEightToOneHundredSixty[2], quote: '低两成。' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '泄压局部风险', statement: '同时开井会把压力转移到相邻支线；过度开度可制造新兽口，粉尘与风向任一红线可独立关闭泄压。', status: 'author-confirmed', evidence: [{ filePath: chaptersOneHundredFiftyEightToOneHundredSixty[0], quote: '它们必须学会错开呼吸。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '裂潮气血孢囊', statement: '第17井粉尘含可短时附着人体气血的细小孢囊，3名过滤员体温与静息气血同步上升，传播方式未知。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredFiftyEightToOneHundredSixty[2], quote: '细小孢囊。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, 'system');
  await setPosition({ filePath: chaptersOneHundredFiftyEightToOneHundredSixty[2], stage: '第三卷裂潮粉尘阶段', focus: '续写第161～163章：粉尘让三个人一起发热' });
}
state = await project.state();
const chaptersOneHundredSixtyOneToOneHundredSixtyThree = ['manuscript/第三卷-裂潮城防/第161章-三个人一起发热.md', 'manuscript/第三卷-裂潮城防/第162章-同步不是突破也不是传染.md', 'manuscript/第三卷-裂潮城防/第163章-先洗工具再换衣服.md'];
if (chaptersOneHundredSixtyOneToOneHundredSixtyThree.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第161～163章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '以3暴露、1岗位和6接触对照确认孢囊经污染夹具短时同步气血，72小时未见复制或人传人；建立工具先阻断的有限泄压流程。', links: [...new Set([...current.links, ...chaptersOneHundredSixtyOneToOneHundredSixtyThree, 'research/裂潮气血孢囊暴露核验.md'])], updatedAt: now() } as never, 'researcher');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第164～166章'))) {
    await project.eventStore.append('task.upsert', { id: uid('task'), title: '续写第164～166章：气血上升不是突破', description: '修复武册把孢囊同步峰值标成境界提升的问题，处理裂潮升血粉伤者、训练资格与城防目标识别。', level: 'chapter', status: 'now', kind: 'review', assignee: 'editor', source: 'navigator', priority: 'critical', whyNow: '已有使用者因假峰值试拳骨裂，武册错误标签还可能改变岗位、药剂与星兽目标判断。', known: ['孢囊提高峰值但不增加真实总量承载', '一名淬皮初段使用者右臂骨裂', '系统标为疑似突破'], missingDecisions: ['哪些独立指标足以确认真实突破？'], aiPreAnalysis: '第164章拆解气血峰值与境界判定；第165章批量复核近期异常提升；第166章恢复标签并处理星兽追踪高假峰值的新风险。', authorDecision: '真实突破至少要求气血总量、身体承载和控制复现，不以单次峰值；异常同步单独标注且不自动获得训练或战斗权限。', agentWork: '', completionCriteria: ['武册判定规则可执行', '历史假突破批量复核', '城防目标风险得到处理'], links: [chaptersOneHundredSixtyOneToOneHundredSixtyThree[2]], dependencies: [], createdAt: now(), updatedAt: now() } as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'knowledge', subject: '第17井气血孢囊', statement: '本次经污染夹具进入袖口，短时附着并同步气血使峰值升8%至13%，40至70分钟回落，72小时未见复制或人际传播。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredSixtyOneToOneHundredSixtyThree[1], quote: '未见复制' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '裂潮粉尘防护', statement: '工具先经气血阻断清洗再换衣，滤袋与人员分通道；风向、过滤饱和、工具回执任一缺失即关闭泄压。', status: 'author-confirmed', evidence: [{ filePath: chaptersOneHundredSixtyOneToOneHundredSixtyThree[2], quote: '新流程倒过来。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '裂潮升血粉伤者', statement: '市场混合粉使一名淬皮初段峰值上升，系统标疑似突破，试拳后右臂骨裂；粉末与第17井孢囊仅六成相似并混药剂。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredSixtyOneToOneHundredSixtyThree[2], quote: '右臂骨裂。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '武册假突破判定', statement: '现有武册可能把外部同步峰值标成突破，需用总量、身体承载和控制复现区分，避免错误训练与岗位权限。', status: 'agent-inferred', evidence: [{ filePath: chaptersOneHundredSixtyOneToOneHundredSixtyThree[2], quote: '如何区分真正的境界提升' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, 'system');
  await setPosition({ filePath: chaptersOneHundredSixtyOneToOneHundredSixtyThree[2], stage: '第三卷假突破阶段', focus: '续写第164～166章：气血上升不是突破' });
}
state = await project.state();
const chaptersOneHundredSixtyFourToOneHundredSixtySix = ['manuscript/第三卷-裂潮城防/第164章-峰值高了骨头没有变.md', 'manuscript/第三卷-裂潮城防/第165章-一百二十七个疑似突破.md', 'manuscript/第三卷-裂潮城防/第166章-星兽先追假的强者.md'];
if (chaptersOneHundredSixtyFourToOneHundredSixtySix.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第164～166章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '将境界判定拆为总量、承载、控制复现，批量复核127份后更正为75真实、28观察、14设备错误、10外部同步；验证掘兽追假峰值。', links: [...new Set([...current.links, ...chaptersOneHundredSixtyFourToOneHundredSixtySix])], updatedAt: now() } as never, 'editor');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第167～169章'))) {
    await project.eventStore.append('task.upsert', { id: uid('task'), title: '续写第167～169章：假峰值能不能当诱饵', description: '用非活性合成气血膜测试不同裂潮星兽的目标偏好，建立不依赖人员或活性孢囊的引流边界。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'high', whyNow: '掘兽追合成信号而巨爪不追，诱饵不能统一外推；回收失败还可能留下持续目标。', known: ['第9支线掘兽追合成膜', '第7支线巨爪不追', '活性孢囊存在污染与市场风险'], missingDecisions: ['目标偏好按物种、深度还是信号结构区分？'], aiPreAnalysis: '第167章设计封闭多信号对照；第168章无人诱饵实战与回收失败；第169章建立目标谱和禁用活性孢囊规则。', authorDecision: '只用非活性合成膜，所有诱饵必须可追踪回收或自动失活；不让人员承担未知目标测试。', agentWork: '', completionCriteria: ['至少三类星兽对照', '回收与失活失败真实处理', '引流规则不统一外推'], links: [chaptersOneHundredSixtyFourToOneHundredSixtySix[2]], dependencies: [], createdAt: now(), updatedAt: now() } as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '境界三项判定', statement: '真实突破至少检查气血总量持续变化、身体承载与不同条件控制复现；单次峰值只触发检查，外部同步不自动开放权限。', status: 'author-confirmed', evidence: [{ filePath: chaptersOneHundredSixtyFourToOneHundredSixtySix[0], quote: '三项。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '127份疑似突破复核', statement: '更正后75人真实突破、28人药剂恢复观察、14份设备高报、10人外部同步；下游课程岗位药剂分别修订。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredSixtyFourToOneHundredSixtySix[1], quote: '一百二十七变成' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '假峰值战场风险', statement: '第9支线盲眼掘兽追踪孢囊同步波形，低承载运输员被系统误标可引流；战术图改为外部同步、承载未知、不按战力分配。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredSixtyFourToOneHundredSixtySix[2], quote: '承载未知，不按战力分配' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '合成气血诱饵', statement: '非活性合成膜可吸引第9支线掘兽但不吸引第7支线巨爪，需建立目标谱与回收失活边界。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredSixtyFourToOneHundredSixtySix[2], quote: '掘兽追了。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, 'system');
  await setPosition({ filePath: chaptersOneHundredSixtyFourToOneHundredSixtySix[2], stage: '第三卷诱饵阶段', focus: '续写第167～169章：假峰值能不能当诱饵' });
}
state = await project.state();
const chaptersOneHundredSixtySevenToOneHundredSixtyNine = ['manuscript/第三卷-裂潮城防/第167章-三种星兽只骗到一种.md', 'manuscript/第三卷-裂潮城防/第168章-无人诱饵没有回来.md', 'manuscript/第三卷-裂潮城防/第169章-诱饵必须自己死掉.md'];
if (chaptersOneHundredSixtySevenToOneHundredSixtyNine.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第167～169章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '建立掘兽、骨鼠、巨爪目标谱；处理第一代膜撞击后超时37秒失败，第二代用材料氧化自失活并禁用活性孢囊。', links: [...new Set([...current.links, ...chaptersOneHundredSixtySevenToOneHundredSixtyNine])], updatedAt: now() } as never, 'writer');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第170～172章'))) {
    await project.eventStore.append('task.upsert', { id: uid('task'), title: '续写第170～172章：巨爪只追正在通信的线', description: '重构被巨爪学习的九灯同步网络，让节点断线后仍能本地判断，并验证假通信与低可见回执。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'critical', whyNow: '第7支线巨爪已连续切断两条高频同步线，信息网络正在成为防线最亮目标。', known: ['巨爪忽略合成气血膜', '追踪机械能量和高频同步脉冲', '三角节点已具本地时间但仍依赖同步线'], missingDecisions: ['如何降低通信可见性又不让三层防线失联？'], aiPreAnalysis: '第170章定位通信暴露模式；第171章部署低频批量回执与假线；第172章巨爪攻击检验本地自治和恢复。', authorDecision: '不以完全静默为目标；关键中止与风险仍需送达，普通状态批量延迟，本地规则在断线时可运行。', agentWork: '', completionCriteria: ['通信暴露有物理因果', '断线不等于失控', '假线不误导己方'], links: [chaptersOneHundredSixtySevenToOneHundredSixtyNine[2]], dependencies: [], createdAt: now(), updatedAt: now() } as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '裂潮星兽目标谱', statement: '第9支线掘兽高响应同步相位、振动增强；骨鼠主要追移动热；第7支线巨爪追机械能量与通信，低响应合成气血。', status: 'author-confirmed', evidence: [{ filePath: chaptersOneHundredSixtySevenToOneHundredSixtyNine[2], quote: '第一版目标谱' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '第一代合成诱饵失败', statement: '无人车撞击使染料与膜分离，断电后仍超时37秒吸引掘兽；低能穿甲针与隔离罩消除信号，同批12片冻结。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredSixtySevenToOneHundredSixtyNine[1], quote: '三十七秒超时持续目标。' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '第二代自失活诱饵', statement: '材料暴露空气后38至52秒物理断相，按35秒可用、55秒风险窗口；仅限已验证掘兽，禁用活性孢囊。', status: 'author-confirmed', evidence: [{ filePath: chaptersOneHundredSixtySevenToOneHundredSixtyNine[2], quote: '活性孢囊被列为禁用材料。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '巨爪攻击通信线', statement: '第7支线巨爪忽略气血诱饵，连续切断两条节点高频同步线，防线信息流成为攻击目标。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredSixtySevenToOneHundredSixtyNine[2], quote: '切断了第二条通信线。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, 'system');
  await setPosition({ filePath: chaptersOneHundredSixtySevenToOneHundredSixtyNine[2], stage: '第三卷通信防线阶段', focus: '续写第170～172章：巨爪只追正在通信的线' });
}
state = await project.state();
const chaptersOneHundredSeventyToOneHundredSeventyTwo = ['manuscript/第三卷-裂潮城防/第170章-巨爪看见的不是消息.md', 'manuscript/第三卷-裂潮城防/第171章-一百条消息攒成一次.md', 'manuscript/第三卷-裂潮城防/第172章-断线以后节点自己决定.md'];
if (chaptersOneHundredSeventyToOneHundredSeventyTwo.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第170～172章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '将普通状态批量低频、红线立即发送，部署硬件隔离假线与本地自治；巨爪断线11秒期间完成关闸撤离，损失1节点。', links: [...new Set([...current.links, ...chaptersOneHundredSeventyToOneHundredSeventyTwo])], updatedAt: now() } as never, 'writer');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第173～175章'))) {
    await project.eventStore.append('task.upsert', { id: uid('task'), title: '续写第173～175章：黄色消息等不起一秒', description: '让节点根据距离、速度与岗位后果动态升级风险，避免快速恶化事件被最初黄色标签困在批次队列。', level: 'chapter', status: 'now', kind: 'review', assignee: 'editor', source: 'navigator', priority: 'critical', whyNow: '第7支线爪击方向在0.7秒内由黄转红，本地关闸避免伤亡；其他支线规则尚未覆盖。', known: ['普通状态5秒批量', '黄色最多1秒', '红线立即通道', '断线节点可本地中止'], missingDecisions: ['动态升级依据由谁维护，如何防止所有黄色都抢占立即通道？'], aiPreAnalysis: '第173章建立风险随时间与距离变化函数；第174章影子运行发现过度升级；第175章分岗位校准并处理一次真实延迟。', authorDecision: '系统提议升级，本地岗位拥有确认或直接中止权；后果明确且时间不足时可自动升级，事后必须复盘误报。', agentWork: '', completionCriteria: ['快速恶化可及时送达', '立即通道不被全部占满', '误报和漏报分别记录'], links: [chaptersOneHundredSeventyToOneHundredSeventyTwo[2]], dependencies: [], createdAt: now(), updatedAt: now() } as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '裂潮低可见通信', statement: '普通状态5秒批量发送，黄色缩至1秒，红线中止立即发送后静默3秒；节点保存本地事件，中心只收摘要。', status: 'author-confirmed', evidence: [{ filePath: chaptersOneHundredSeventyToOneHundredSeventyTwo[0], quote: '普通心跳降低九成' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '假同步线', statement: '使用己方硬件不接受的固定相位制造高频能量，只显示诱敌设备；第7支线巨爪首次切断假线，使用限制一次。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredSeventyToOneHundredSeventyTwo[1], quote: '假线断开。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '第7支线断线自治', statement: '巨爪切断低频真线并摧毁1节点，剩余节点本地关闸撤离，断线11秒后重连，无伤亡但丢失局部日志与50米阵地。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredSeventyToOneHundredSeventyTwo[2], quote: '断线持续十一秒。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '动态风险升级', statement: '爪击方向在0.7秒内由黄色变红，本地规则救回撤离线；其他支线需要按距离速度岗位动态升级，避免批次延误。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredSeventyToOneHundredSeventyTwo[2], quote: '已经不能再等一秒。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, 'system');
  await setPosition({ filePath: chaptersOneHundredSeventyToOneHundredSeventyTwo[2], stage: '第三卷动态通信阶段', focus: '续写第173～175章：黄色消息等不起一秒' });
}
state = await project.state();
const chaptersOneHundredSeventyThreeToOneHundredSeventyFive = ['manuscript/第三卷-裂潮城防/第173章-黄色消息还有多少秒.md', 'manuscript/第三卷-裂潮城防/第174章-所有黄色都变红了.md', 'manuscript/第三卷-裂潮城防/第175章-迟到十一秒的黄色.md'];
if (chaptersOneHundredSeventyThreeToOneHundredSeventyFive.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第173～175章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '建立按到达时间与岗位中止时间动态升级的通信规则，拆分跨层红线与本地紧急；第12支线因人员证据缺失迟报11秒并修复。', links: [...new Set([...current.links, ...chaptersOneHundredSeventyThreeToOneHundredSeventyFive])], updatedAt: now() } as never, 'editor');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第176～178章'))) {
    await project.eventStore.append('task.upsert', { id: uid('task'), title: '续写第176～178章：撤离名单少了两个人', description: '为旧侧门、临时入口和离线工单建立最低在场证据，在不持续追踪个人的前提下让救援知道区域人数。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'high', whyNow: '第12支线两名管线工未进入中心或本地名单，导致裂纹风险迟报11秒和脚踝骨裂。', known: ['高风险区需要工单与本地进出两类痕迹', '5张同类工单映射错误已暂停', '节点只需人数与退出回执'], missingDecisions: ['无终端、临时入口如何低成本留下痕迹？'], aiPreAnalysis: '第176章设计纸号机械牌与同行见证；第177章紧急入口实际测试；第178章处理一次代签和名单残留。', authorDecision: '不使用持续人脸或位置追踪；进门增加人数，出门减少并生成差异，身份仅在事故或本人授权时关联。', agentWork: '', completionCriteria: ['旧侧门可记录在场人数', '代签与漏签有复核', '退出后不保留永久位置'], links: [chaptersOneHundredSeventyThreeToOneHundredSeventyFive[2]], dependencies: [], createdAt: now(), updatedAt: now() } as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '动态风险升级', statement: '以目标到达时间、岗位中止时间与误差决定升级；跨层红线走立即通道，本地紧急只触发节点及邻近三角，未知不自动占满全网。', status: 'author-confirmed', evidence: [{ filePath: chaptersOneHundredSeventyThreeToOneHundredSeventyFive[1], quote: '本地紧急' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '第12支线人员漏记事故', statement: '2名管线工经旧侧门进入却被工单映射为外圈，裂纹黄色迟报11秒；1人脚踝骨裂，无红伤。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredSeventyThreeToOneHundredSeventyFive[2], quote: '迟到十一秒' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '高风险区最低人员证据', statement: '至少需要工单范围与本地进出两种痕迹；不一致则未知，节点只记录区域人数和退出回执，不持续追踪身份动作。', status: 'author-confirmed', evidence: [{ filePath: chaptersOneHundredSeventyThreeToOneHundredSeventyFive[2], quote: '不持续追踪姓名' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '旧侧门在场记录', statement: '需为无终端、临时入口建立低成本人数痕迹，并处理代签、漏签与退出后残留。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredSeventyThreeToOneHundredSeventyFive[2], quote: '有人进去了' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, 'system');
  await setPosition({ filePath: chaptersOneHundredSeventyThreeToOneHundredSeventyFive[2], stage: '第三卷在场证据阶段', focus: '续写第176～178章：撤离名单少了两个人' });
}
state = await project.state();
const chaptersOneHundredSeventySixToOneHundredSeventyEight = ['manuscript/第三卷-裂潮城防/第176章-一扇旧门只记人数.md', 'manuscript/第三卷-裂潮城防/第177章-代签把一个人变成两个.md', 'manuscript/第三卷-裂潮城防/第178章-最后一个人已经走了.md'];
if (chaptersOneHundredSeventySixToOneHundredSeventyEight.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第176～178章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '为47处旧入口建立机械人数牌、匿名一次性跨门回执与未知入口拉柄；处理设备误计、代签、跨门退出和人工清空。', links: [...new Set([...current.links, ...chaptersOneHundredSeventySixToOneHundredSeventyEight])], updatedAt: now() } as never, 'writer');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第179～181章'))) {
    await project.eventStore.append('task.upsert', { id: uid('task'), title: '续写第179～181章：裂缝从城墙里面张开', description: '处理南墙内部旧供能仓下的新裂缝，在无外部炮角、人员入口已清空的情况下建立内墙防线。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'critical', whyNow: '新裂口绕过外墙三层防线，位于供能仓与城市内部之间，任何重炮都可能直接伤及城内。', known: ['47处旧入口当前确认无人', '内侧压力上升', '裂缝位于旧供能仓下'], missingDecisions: ['是外部裂潮贯通还是独立内部目标？'], aiPreAnalysis: '第179章确认内部裂口与人员清空；第180章无炮角近线防守与供能迁移；第181章目标出现并判断与外部裂潮关系。', authorDecision: '先疏散供能仓并用非破坏传感确认，不因入口无人便假设地下无人；重炮禁用，近线任务以引流和隔离为主。', agentWork: '', completionCriteria: ['内部环境与人员状态清楚', '不使用外墙重炮逻辑', '一次高武近线行动揭示连接关系'], links: [chaptersOneHundredSeventySixToOneHundredSeventyEight[2]], dependencies: [], createdAt: now(), updatedAt: now() } as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '高风险区最低在场系统', statement: '旧入口以双向机械牌、工单、匿名一次性纸号与未知进入拉柄记录区域人数；不持续人脸追踪，差异不自动归零。', status: 'author-confirmed', evidence: [{ filePath: chaptersOneHundredSeventySixToOneHundredSeventyEight[0], quote: '门只知道有人经过。' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '跨门匿名退出', statement: '一次性双门校验码可在任一出口减对应入口人数，使用后失效，7天后删除具体码，仅保留数量与差异。', status: 'author-confirmed', evidence: [{ filePath: chaptersOneHundredSeventySixToOneHundredSeventyEight[2], quote: '一次性双门校验码' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '旧入口人数机制试行', statement: '覆盖47处旧入口，处理箱体误计、提前代签、跨门退出与雨损人工减一；区域无人需工单、门牌和现场交叉。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredSeventySixToOneHundredSeventyEight[2], quote: '覆盖四十七处旧入口。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '南墙内部裂缝', statement: '旧入口全部无人后，南墙内侧旧供能仓下出现新裂缝与压力上升，绕过外墙三层防线。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredSeventySixToOneHundredSeventyEight[2], quote: '旧供能仓下面张开。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, 'system');
  await setPosition({ filePath: chaptersOneHundredSeventySixToOneHundredSeventyEight[2], stage: '第三卷内墙裂缝阶段', focus: '续写第179～181章：裂缝从城墙里面张开' });
}
state = await project.state();
const chaptersOneHundredSeventyNineToOneHundredEightyOne = ['manuscript/第三卷-裂潮城防/第179章-供能仓里没有出口.md', 'manuscript/第三卷-裂潮城防/第180章-城墙里面不能开炮.md', 'manuscript/第三卷-裂潮城防/第181章-裂缝没有穿过城墙.md'];
if (chaptersOneHundredSeventyNineToOneHundredEightyOne.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第179～181章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '疏散旧供能仓并捕获53只脉食虫，确认其经压力软化微孔而非永久隧道进入；九仓改错峰校准，三处安装分块阻断网。', links: [...new Set([...current.links, ...chaptersOneHundredSeventyNineToOneHundredEightyOne])], updatedAt: now() } as never, 'writer');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第182～184章'))) {
    await project.eventStore.append('task.upsert', { id: uid('task'), title: '续写第182～184章：城里的高能目标地图', description: '建立裂潮第五层设施风险图，核对供能仓、医疗站、炮轨与居民能源节点会吸引哪类星兽，并制定错峰与隔离策略。', level: 'chapter', status: 'now', kind: 'planning', assignee: 'navigator', source: 'navigator', priority: 'high', whyNow: '脉食虫无需穿墙即可借高频晶片在城内形成出口，九处旧仓只是已知目标的一部分。', known: ['脉食虫追气血晶片同步', '巨爪追机械与通信', '掘兽追同步相位', '备用供能错峰后慢30秒'], missingDecisions: ['哪些城市能源必须持续在线，哪些可错峰？'], aiPreAnalysis: '第182章盘点高能设施与目标谱；第183章选择错峰、屏蔽或保留；第184章一次城市级切换检验第五层。', authorDecision: '不按能量总量统一关闭；结合目标偏好、设施必要性与退出成本，关键医疗和主供能保持，辅助节点可错峰或屏蔽。', agentWork: '', completionCriteria: ['设施图有来源与更新时间', '至少三类设施不同处置', '城市切换真实付出延迟或损失'], links: [chaptersOneHundredSeventyNineToOneHundredEightyOne[2]], dependencies: [], createdAt: now(), updatedAt: now() } as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '脉食虫', statement: '手掌长、追踪气血晶片与同步能量，可沿压力软化的多孔星力盐微孔进入城内，不需要永久隧道。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredSeventyNineToOneHundredEightyOne[1], quote: '第一只脉食虫' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '旧供能仓内墙战', statement: '错峰迁移120块晶片，捕获53只脉食虫、2只封在泡沫槽，无人员伤亡；一条备用回路停用。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredSeventyNineToOneHundredEightyOne[1], quote: '共捕获五十三只' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '分块气血阻断网', statement: '完全阻断会抬高压力，十二块交替开启把脉食虫引向泡沫井并保留相邻泄压；仅在确认多孔星力盐的3处仓安装。', status: 'author-confirmed', evidence: [{ filePath: chaptersOneHundredSeventyNineToOneHundredEightyOne[2], quote: '把网分成十二块' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '裂潮第五层城内设施图', statement: '需记录城内高能设施对不同星兽的吸引风险，形成外部三层与泄压之外的第五层防线。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredSeventyNineToOneHundredEightyOne[2], quote: '一张知道城内每个高能目标' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, 'system');
  await setPosition({ filePath: chaptersOneHundredSeventyNineToOneHundredEightyOne[2], stage: '第三卷城内设施防线', focus: '续写第182～184章：城里的高能目标地图' });
}
state = await project.state();
const chaptersOneHundredEightyTwoToOneHundredEightyFour = ['manuscript/第三卷-裂潮城防/第182章-一张地图不能只画亮度.md', 'manuscript/第三卷-裂潮城防/第183章-必要设施也不能一起发亮.md', 'manuscript/第三卷-裂潮城防/第184章-临渊第一次错峰熄灯.md'];
if (chaptersOneHundredEightyTwoToOneHundredEightyFour.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第182～184章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '盘点287处高能设施并完成142项城市错峰切换，高能总峰值降31%；医院、炮台、居民与工业分别承担延迟停机代价。', links: [...new Set([...current.links, ...chaptersOneHundredEightyTwoToOneHundredEightyFour])], updatedAt: now() } as never, 'navigator');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第185～187章'))) {
    await project.eventStore.append('task.upsert', { id: uid('task'), title: '续写第185～187章：医院不能错峰呼吸', description: '为必须持续在线的南墙医院降低机械与通信可见性，同时保持重症供氧、床旁监护和急救入口。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'critical', whyNow: '城市错峰后医院地下仍出现巨爪信号，医院无法停机或迁走，必须建立持续在线设施防护。', known: ['医院本地监护延迟上限2秒', '巨爪追机械和通信活动', '必要子网必须持续供能'], missingDecisions: ['如何降低可见性而不制造医疗盲区？'], aiPreAnalysis: '第185章分解医院必要与可延迟信号；第186章屏蔽与假机械目标测试；第187章巨爪接近中的医院运行验证。', authorDecision: '床旁生命支持和红线立即保留，普通诊断批量；假目标不得经过居民与伤员撤离线。', agentWork: '', completionCriteria: ['医疗红线零延迟', '巨爪目标发生可验证变化', '无患者因降频受伤'], links: [chaptersOneHundredEightyTwoToOneHundredEightyFour[2]], dependencies: [], createdAt: now(), updatedAt: now() } as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '裂潮第五层设施图', statement: '按能量结构、不可中断时间、星兽目标偏好和关闭后果管理287处设施；过期变灰，医疗与居民精确位置分层可见。', status: 'author-confirmed', evidence: [{ filePath: chaptersOneHundredEightyTwoToOneHundredEightyFour[0], quote: '增加四个维度。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '临渊城市错峰切换', statement: '142项完成136项，高能总峰值下降31%，医院无伤、炮台备用17秒、居民最长停电43秒，并付出工厂停产等代价。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredEightyTwoToOneHundredEightyFour[2], quote: '下降三成一。' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '必要设施错峰', statement: '医院与主供能持续在线但降低诊断同步，炮台按需校准，居民医疗抽水进入必要子网，辅助设施按区域错峰。', status: 'author-confirmed', evidence: [{ filePath: chaptersOneHundredEightyTwoToOneHundredEightyFour[1], quote: '医院保持连续电力' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '医院持续在线目标风险', statement: '城市错峰后南墙医院地下仍出现巨爪机械信号，需在不停止生命支持的情况下降低可见性。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredEightyTwoToOneHundredEightyFour[2], quote: '医院不能像训练馆一样停掉' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, 'system');
  await setPosition({ filePath: chaptersOneHundredEightyTwoToOneHundredEightyFour[2], stage: '第三卷必要设施防护', focus: '续写第185～187章：医院不能错峰呼吸' });
}
state = await project.state();
const chaptersOneHundredEightyFiveToOneHundredEightySeven = ['manuscript/第三卷-裂潮城防/第185章-医院哪些信号不能慢.md', 'manuscript/第三卷-裂潮城防/第186章-假心跳不能经过救护车.md', 'manuscript/第三卷-裂潮城防/第187章-巨爪来到医院下面.md'];
if (chaptersOneHundredEightyFiveToOneHundredEightySeven.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第185～187章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '将医院床旁闭环、红线立即与普通诊断批量分离，以空货场机械诱饵引开巨爪；真实47秒攻击无患者伤害并修复7台旧药泵。', links: [...new Set([...current.links, ...chaptersOneHundredEightyFiveToOneHundredEightySeven])], updatedAt: now() } as never, 'writer');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第188～190章'))) {
    await project.eventStore.append('task.upsert', { id: uid('task'), title: '续写第188～190章：移动医院比医院更亮', description: '保护从外墙返回的救护车和移动医疗设备，在不降低伤员生命支持的情况下避免成为巨爪与掘兽移动目标。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'critical', whyNow: '救护车携4名伤员与集中供氧监护，机械通信峰值高于已降频医院，正在城内道路移动。', known: ['医院本体防护通过一次攻击', '巨爪追机械通信', '掘兽追同步相位', '救护车不能停掉生命支持'], missingDecisions: ['移动医疗如何分离人员安全与目标信号？'], aiPreAnalysis: '第188章拆分车内必要信号与路线；第189章移动诱饵和救护车错路；第190章伤员抵达与移动医疗标准。', authorDecision: '不把伤员转成诱饵或要求降级治疗；使用无患者数据的机械替身、路线隔离和本地闭环。', agentWork: '', completionCriteria: ['4名伤员安全抵达', '目标转移有证据', '移动医疗形成可复用边界'], links: [chaptersOneHundredEightyFiveToOneHundredEightySeven[2]], dependencies: [], createdAt: now(), updatedAt: now() } as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '医院持续在线防护', statement: '床旁生命支持本地闭环、医疗红线立即、普通趋势5秒批量、历史库存延迟；供氧机错相并在故障时医疗优先接管。', status: 'author-confirmed', evidence: [{ filePath: chaptersOneHundredEightyFiveToOneHundredEightySeven[0], quote: '真正不能慢的不到一百条。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '南墙医院巨爪攻击', statement: '巨爪攻击47秒，损毁外部诊断线并使供氧轴承黄线；药泵停11秒，无患者可检测伤害，7台同固件药泵更换。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredEightyFiveToOneHundredEightySeven[2], quote: '无患者受到可检测伤害。' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '医院机械诱饵', statement: '只复制供氧机物理节奏，不含患者数据；部署于无人空货场，故障高峰时不加码，单次使用后熔断。', status: 'author-confirmed', evidence: [{ filePath: chaptersOneHundredEightyFiveToOneHundredEightySeven[1], quote: '没有心率、病历或气血。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '移动医院目标风险', statement: '外墙救护车携4名伤员与集中供氧监护，机械通信峰值高于医院本体，成为城内移动目标风险。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredEightyFiveToOneHundredEightySeven[2], quote: '移动医院正沿着城内道路发亮。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, 'system');
  await setPosition({ filePath: chaptersOneHundredEightyFiveToOneHundredEightySeven[2], stage: '第三卷移动医疗防护', focus: '续写第188～190章：移动医院比医院更亮' });
}
state = await project.state();
const chaptersOneHundredEightyEightToOneHundredNinety = ['manuscript/第三卷-裂潮城防/第188章-救护车不能关掉心跳.md', 'manuscript/第三卷-裂潮城防/第189章-伤员和诱饵走不同的路.md', 'manuscript/第三卷-裂潮城防/第190章-四名伤员都到了医院.md'];
if (chaptersOneHundredEightyEightToOneHundredNinety.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第188～190章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '建立移动医疗本地闭环、路线隔离与机械替身；替身卡死后用空冷库临时引流，4名伤员无治疗降级抵达医院。', links: [...new Set([...current.links, ...chaptersOneHundredEightyEightToOneHundredNinety])], updatedAt: now() } as never, 'writer');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第191～193章'))) {
    await project.eventStore.append('task.upsert', { id: uid('task'), title: '续写第191～193章：十二辆救护车不能排成一条线', description: '按车型、伤情与裂潮目标风险分散十二辆救护车的路线和接收时段，避免形成连续移动高能目标。', level: 'chapter', status: 'now', kind: 'planning', assignee: 'navigator', source: 'navigator', priority: 'high', whyNow: '全城12辆车能力不同，单一路线会让结构故障或巨爪攻击同时阻断全部医疗转运。', known: ['3辆具备本地闭环', '5辆需更换监护', '4辆旧车依赖机械备份人工记录', '巨爪追机械通信'], missingDecisions: ['如何按伤情优先又不形成固定可学习路线？'], aiPreAnalysis: '第191章分类车辆与伤员窗口；第192章多路线错峰发车；第193章一次路线被学习后的动态改道。', authorDecision: '医疗紧迫度优先，战术分散不能延迟红线伤员；路线只在必要岗位可见，不固定长期模板。', agentWork: '', completionCriteria: ['12辆车有可执行分组', '红线伤员不因隐身等待', '至少一次动态改道验证'], links: [chaptersOneHundredEightyEightToOneHundredNinety[2]], dependencies: [], createdAt: now(), updatedAt: now() } as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '移动医疗防护', statement: '车内生命支持本地闭环、医疗红线立即，路线按结构和目标风险隔离，接收端预备入口屏蔽；治疗优先于隐身。', status: 'author-confirmed', evidence: [{ filePath: chaptersOneHundredEightyEightToOneHundredNinety[2], quote: '医疗红线不降级。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '第一辆移动医院转运', statement: '4名伤员安全抵达；预设替身卡死，空冷库临时引流，胸伤血氧红线时提高供氧，无患者数据用于诱饵。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredEightyEightToOneHundredNinety[1], quote: '四名伤员抵达。' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '供氧机机械替身', statement: '只复制设备物理节奏、不含患者数据；部署无人路线，医疗故障峰值时不加码，单次熔断且场地受损后不复用。', status: 'author-confirmed', evidence: [{ filePath: chaptersOneHundredEightyEightToOneHundredNinety[0], quote: '没有心率、病历或气血。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '十二辆救护车分流', statement: '3辆本地闭环、5辆需换监护、4辆旧车；不能沿同一医疗廊排成连续移动高能目标。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredEightyEightToOneHundredNinety[2], quote: '十二辆车不必走成同一个目标。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, 'system');
  await setPosition({ filePath: chaptersOneHundredEightyEightToOneHundredNinety[2], stage: '第三卷医疗车队分流', focus: '续写第191～193章：十二辆救护车不能排成一条线' });
}
state = await project.state();
const chaptersOneHundredNinetyOneToOneHundredNinetyThree = ['manuscript/第三卷-裂潮城防/第191章-十二辆车先按伤情分开.md', 'manuscript/第三卷-裂潮城防/第192章-三条医疗路线同时亮起.md', 'manuscript/第三卷-裂潮城防/第193章-星兽记住了医疗廊.md'];
if (chaptersOneHundredNinetyOneToOneHundredNinetyThree.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第191～193章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '按医疗紧迫、车型和目标风险把12辆车分5路，10辆完成转运；处理巨爪与掘兽学习路线，红线伤员未超等待上限。', links: [...new Set([...current.links, ...chaptersOneHundredNinetyOneToOneHundredNinetyThree])], updatedAt: now() } as never, 'navigator');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第194～196章'))) {
    await project.eventStore.append('task.upsert', { id: uid('task'), title: '续写第194～196章：星兽学会发送假消息', description: '识别巨爪模仿三锤错相信号的机制，防止己方把敌方节奏解析成诱饵或安全状态，同时保留真正机械回执。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'critical', whyNow: '巨爪沿空货场发出与医院机械诱饵相同的节奏，防线可能把敌方信号当成己方设备。', known: ['机械诱饵使用三锤错相', '巨爪能学习通信和路线', '己方接收器依赖相位与设备回执'], missingDecisions: ['如何证明消息来自授权设备而不提高可见性？'], aiPreAnalysis: '第194章分离相似节奏与真实回执；第195章巨爪假信号诱导防线误动；第196章引入物理来源证明与本地确认。', authorDecision: '节奏只能作为候选，设备动作需本地不可伪造的物理回执与位置证据；不以更高频认证解决。', agentWork: '', completionCriteria: ['假信号至少造成一次真实误判', '认证不增加高频暴露', '本地设备可在断线下验证来源'], links: [chaptersOneHundredNinetyOneToOneHundredNinetyThree[2]], dependencies: [], createdAt: now(), updatedAt: now() } as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '十二辆救护车分流', statement: '按红线优先、车型能力、目标风险和接收端分5路；路线只向必要岗位开放，同一路线连续使用不超过一次。', status: 'author-confirmed', evidence: [{ filePath: chaptersOneHundredNinetyOneToOneHundredNinetyThree[2], quote: '分成五条路线。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '十二辆救护车转运结果', statement: '10辆完成、1辆故障留外墙稳定伤员、1辆空车备用；无人超过医疗等待上限，付出路线暴露与设备损失。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredNinetyOneToOneHundredNinetyThree[2], quote: '十辆完成转运' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '医疗路线学习', statement: '掘兽会提前靠近重复医疗廊，路线使用后需记录目标反应、残余与结构损耗，新证据才能重启。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredNinetyOneToOneHundredNinetyThree[2], quote: '已被目标学习' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '巨爪模仿假信号', statement: '第7支线巨爪沿空货场发出与三锤错相机械诱饵相同节奏，可能诱导己方识别。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredNinetyOneToOneHundredNinetyThree[2], quote: '把防线的假信号还给防线。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, 'system');
  await setPosition({ filePath: chaptersOneHundredNinetyOneToOneHundredNinetyThree[2], stage: '第三卷敌方信号学习', focus: '续写第194～196章：星兽学会发送假消息' });
}
state = await project.state();
const chaptersOneHundredNinetyFourToOneHundredNinetySix = ['manuscript/第三卷-裂潮城防/第194章-节奏一样不等于设备.md', 'manuscript/第三卷-裂潮城防/第195章-假消息让炮台转错一次.md', 'manuscript/第三卷-裂潮城防/第196章-消息要带着发生它的地方.md'];
if (chaptersOneHundredNinetyFourToOneHundredNinetySix.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第194～196章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '处理巨爪与掘兽模仿机械节奏导致炮台误转14度，建立一次性齿片、本地灯与过期回执的物理来源证明及降级规则。', links: [...new Set([...current.links, ...chaptersOneHundredNinetyFourToOneHundredNinetySix])], updatedAt: now() } as never, 'writer');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第197～199章'))) {
    await project.eventStore.append('task.upsert', { id: uid('task'), title: '续写第197～199章：星兽开始攻击证据', description: '应对巨爪把物理锚点与备用线路作为新目标，设计可替换、分散、损毁后仍能安全降级的现场证明。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'high', whyNow: '来源证明阻止假消息后，巨爪开始攻击两锚点间备用线路，认证基础设施本身成为目标。', known: ['高后果设备有双锚点', '两锚点失效只保留本地安全动作', '巨爪能学习通信和机械结构'], missingDecisions: ['如何证明锚点存活而不增加可见心跳？'], aiPreAnalysis: '第197章锚点分散与无心跳存活；第198章巨爪破坏后的替换实战；第199章跨层降级与证据恢复。', authorDecision: '不追求不可摧毁；锚点低价值可替换、状态靠动作时回执，静默时不发存活心跳，损毁由邻近物理见证。', agentWork: '', completionCriteria: ['锚点损毁不触发危险默认', '替换不要求人员进入爪击区', '来源证据恢复有版本链'], links: [chaptersOneHundredNinetyFourToOneHundredNinetySix[2]], dependencies: [], createdAt: now(), updatedAt: now() } as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '裂潮敌方假信号', statement: '巨爪与掘兽可用岩层或钢板模仿己方机械节奏，节奏和位置只能作为候选，不能单独授权炮击引流。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredNinetyFourToOneHundredNinetySix[1], quote: '炮口转错十四度。' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '设备物理来源证明', statement: '高后果设备用一次性齿片、本地机械灯与5秒批次证明现场动作；回执过期不续期，锚点损毁则降级。', status: 'author-confirmed', evidence: [{ filePath: chaptersOneHundredNinetyFourToOneHundredNinetySix[2], quote: '某台地面设备在某个位置真实动作过。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '第9支线假引流误动', statement: '掘兽模仿已毁引流器双脉冲，炮台误转14度，1名救援员手腕黄伤；锚点规则上线后未再次误转。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredNinetyFourToOneHundredNinetySix[1], quote: '假消息造成了真实误动。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '巨爪攻击来源锚点', statement: '巨爪转而破坏锚点机械灯和双锚备用线路，来源证明基础设施成为新攻击目标。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredNinetyFourToOneHundredNinetySix[2], quote: '开始攻击两只锚点之间的备用线路。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, 'system');
  await setPosition({ filePath: chaptersOneHundredNinetyFourToOneHundredNinetySix[2], stage: '第三卷证据防线阶段', focus: '续写第197～199章：星兽开始攻击证据' });
}
state = await project.state();
const chaptersOneHundredNinetySevenToOneHundredNinetyNine = ['manuscript/第三卷-裂潮城防/第197章-锚点不用证明自己活着.md', 'manuscript/第三卷-裂潮城防/第198章-替换锚点的人不能走进去.md', 'manuscript/第三卷-裂潮城防/第199章-证据断了防线没有停.md'];
if (chaptersOneHundredNinetySevenToOneHundredNinetyNine.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第197～199章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '建立静默双锚、远程替换和证据损毁降级；一周锚点损毁9次、替换成功5次，无人进入爪击区抢修。', links: [...new Set([...current.links, ...chaptersOneHundredNinetySevenToOneHundredNinetyNine])], updatedAt: now() } as never, 'writer');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第200～202章'))) {
    await project.eventStore.append('task.upsert', { id: uid('task'), title: '续写第200～202章：一千二百条规则同时生效', description: '在第二百章节点审计裂潮防线规则膨胀，建立按岗位和现场状态生成的最小执行视图，避免人员使用过期规则。', level: 'chapter', status: 'now', kind: 'review', assignee: 'editor', source: 'navigator', priority: 'critical', whyNow: '多层防线累计超过1200条规则，一线人员开始无法确认当前版本，复杂性本身成为风险。', known: ['规则来自传感、引流、炮击、泄压、粉尘、通信、在场、设施与医疗层', '不同支线和设备适用范围不同'], missingDecisions: ['哪些规则必须同时可见，哪些只在条件触发时出现？'], aiPreAnalysis: '第200章规则冲突盘点；第201章岗位最小视图与版本回执；第202章一次过期规则误用和回滚验证。', authorDecision: '不删除历史规则；按岗位、地点、设备和当前风险生成最小视图，红线与退出始终置顶，来源和完整版本可展开。', agentWork: '', completionCriteria: ['发现至少一个真实规则冲突', '最小视图可离线恢复', '过期误用可追溯修正'], links: [chaptersOneHundredNinetySevenToOneHundredNinetyNine[2]], dependencies: [], createdAt: now(), updatedAt: now() } as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '静默物理锚点', statement: '锚点只在设备动作时压一次性齿片，平时无存活心跳；双锚完整可自动跨层，一锚需第二证据，两锚未知仅本地安全动作。', status: 'author-confirmed', evidence: [{ filePath: chaptersOneHundredNinetySevenToOneHundredNinetyNine[0], quote: '静默不代表损毁。' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '锚点远程替换', statement: '预封机械盒由无人绞车安装，失败时放弃设备不派人；新设备生成新版本链，不冒充旧设备恢复。', status: 'author-confirmed', evidence: [{ filePath: chaptersOneHundredNinetySevenToOneHundredNinetyNine[1], quote: '人必须过去' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '锚点损毁周报', statement: '一周损毁9次、远程替换成功5、失败2、人工安装0、另2以独立结果证据降级；损失13锚2引流器3钢网，无抢修人员暴露。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredNinetySevenToOneHundredNinetyNine[2], quote: '一周内' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '裂潮规则膨胀', statement: '多层防线累计超过1200条规则，一线人员开始难以确认当前版本，复杂性成为新风险。', status: 'text-explicit', evidence: [{ filePath: chaptersOneHundredNinetySevenToOneHundredNinetyNine[2], quote: '一千二百条。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, 'system');
  await setPosition({ filePath: chaptersOneHundredNinetySevenToOneHundredNinetyNine[2], stage: '第三卷规则复杂性阶段', focus: '续写第200～202章：一千二百条规则同时生效' });
}
state = await project.state();
const chaptersTwoHundredToTwoHundredTwo = ['manuscript/第三卷-裂潮城防/第200章-一千二百条规则没人能背完.md', 'manuscript/第三卷-裂潮城防/第201章-每个人只看当前十三条.md', 'manuscript/第三卷-裂潮城防/第202章-过期规则让井口多开三厘米.md'];
if (chaptersTwoHundredToTwoHundredTwo.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第200～202章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '审计1207条规则并按岗位地点设备风险生成最小视图；第6井缓存旧规则多开3厘米后修复部件版本、时限与物理对照。', links: [...new Set([...current.links, ...chaptersTwoHundredToTwoHundredTwo])], updatedAt: now() } as never, 'editor');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第203～205章'))) {
    await project.eventStore.append('task.upsert', { id: uid('task'), title: '续写第203～205章：人换了岗位规则还没换', description: '让最小执行视图随现场角色切换，处理护设备、救援、医疗和结构岗位临时接管时的权限、规则与交接。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'high', whyNow: '规则缓存已能随设备失效，但现场人员频繁换岗，旧任务视图仍可能继续显示并造成误用。', known: ['最小视图按岗位地点设备风险裁剪', '设备部件变化会让视图转灰', '岗位切换可能一分钟内发生'], missingDecisions: ['紧急换岗如何获得新规则又不扩大永久权限？'], aiPreAnalysis: '第203章设计任务令牌与交接；第204章紧急换岗实战发现权限残留；第205章回收旧视图并保留事件。', authorDecision: '权限和视图绑定具体任务与时间，紧急接管先获得本地安全动作，跨层权限需第二确认；旧视图立即标不适用但保留历史。', agentWork: '', completionCriteria: ['紧急换岗可执行', '旧权限不残留', '交接失败有真实处理'], links: [chaptersTwoHundredToTwoHundredTwo[2]], dependencies: [], createdAt: now(), updatedAt: now() } as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '裂潮最小执行视图', statement: '按岗位、地点、设备和当前风险裁剪1207条规则；红线中止撤退置顶，条件触发预显示，历史来源可展开。', status: 'author-confirmed', evidence: [{ filePath: chaptersTwoHundredToTwoHundredTwo[0], quote: '一千二百条仍然存在。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '第6井过期规则事故', statement: '缓存仍显示旧封盖7厘米上限，实际新封盖4厘米，导致多开3厘米、粉尘泄漏与3只幼年铲背兽，无人员暴露。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredToTwoHundredTwo[2], quote: '多开三厘米' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '视图版本失效', statement: '设备版本细化到部件，规则包到时需本地确认，关键动作对照物理标牌；旧包转灰不删除，离线靠纸质清单交接。', status: 'author-confirmed', evidence: [{ filePath: chaptersTwoHundredToTwoHundredTwo[2], quote: '关键动作前做物理对照' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '裂潮岗位切换规则', statement: '人员快速换岗时旧任务视图可能继续显示，需要任务级权限与交接，避免上一岗位规则和权限残留。', status: 'agent-inferred', evidence: [{ filePath: chaptersTwoHundredToTwoHundredTwo[2], quote: '人已经换了角色' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, 'system');
  await setPosition({ filePath: chaptersTwoHundredToTwoHundredTwo[2], stage: '第三卷岗位切换阶段', focus: '续写第203～205章：人换了岗位规则还没换' });
}
state = await project.state();
const chaptersTwoHundredThreeToTwoHundredFive = ['manuscript/第三卷-裂潮城防/第203章-人换岗以后页面先变灰.md', 'manuscript/第三卷-裂潮城防/第204章-旧岗位还在叫他保护设备.md', 'manuscript/第三卷-裂潮城防/第205章-三十秒以后旧权限必须消失.md'];
if (chaptersTwoHundredThreeToTwoHundredFive.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第203～205章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '建立任务级视图、30秒重叠与双结束交接；真实接管中旧页面造成迟疑并发现2分钟救援权限残留，修复后187次交接无跨层残留。', links: [...new Set([...current.links, ...chaptersTwoHundredThreeToTwoHundredFive])], updatedAt: now() } as never, 'writer');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第206～208章'))) {
    await project.eventStore.append('task.upsert', { id: uid('task'), title: '续写第206～208章：四条支线一起吸气', description: '处理4条岩肺压力周期首次同步，判断是地质耦合、星兽协同还是武脉响应，并防止现有错峰泄压同时失效。', level: 'chapter', status: 'now', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'critical', whyNow: '独立支线同步吸气可能让压力与浅层兽群同时上涌，当前泄压按错峰设计。', known: ['第17支线岩肺式压力机制', '另4条曾出现周期挤压', '错峰泄压依赖不同周期'], missingDecisions: ['同步来源是否可被打断？'], aiPreAnalysis: '第206章对齐周期与武脉时间；第207章同步收缩实战；第208章用非破坏相位扰动拆分或确认整体机制。', authorDecision: '先保持地质、星兽、武脉三种候选；不以同步本身宣布智能协作，分别采集压力、气血与结构传播。', agentWork: '', completionCriteria: ['至少两类独立信号', '一次同步压力实战', '现有泄压防线得到调整'], links: [chaptersTwoHundredThreeToTwoHundredFive[2]], dependencies: [], createdAt: now(), updatedAt: now() } as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '裂潮任务级视图', statement: '规则与权限绑定岗位地点设备任务时间；换岗先获得本地安全动作，跨层需第二确认，旧视图转灰保留历史。', status: 'author-confirmed', evidence: [{ filePath: chaptersTwoHundredThreeToTwoHundredFive[0], quote: '限时令牌' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '第9支线换岗迟疑', statement: '黄伤护设备员撤离时新接管者因旧页面突出节点保护而迟疑，节点损毁、1名战斗员腿部黄伤，并发现救援权限残留2分钟。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredThreeToTwoHundredFive[1], quote: '权限残留' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '岗位交接双结束', statement: '原岗位退出与新岗位确认齐全即结束；30秒到期旧权限自动失效，新岗位保持本地安全，跨层继续需第二确认。', status: 'author-confirmed', evidence: [{ filePath: chaptersTwoHundredThreeToTwoHundredFive[2], quote: '双结束条件' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '岩肺支线同步吸气', statement: '4条原独立岩肺压力周期开始同步，可能使现有错峰泄压失效；来源仍待地质、星兽与武脉分辨。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredThreeToTwoHundredFive[2], quote: '同时吸气' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, 'system');
  await setPosition({ filePath: chaptersTwoHundredThreeToTwoHundredFive[2], stage: '第三卷同步压力阶段', focus: '续写第206～208章：四条支线一起吸气' });
}
state = await project.state();
const chaptersTwoHundredSixToTwoHundredEight = ['manuscript/第三卷-裂潮城防/第206章-先证明四块表是同一秒.md', 'manuscript/第三卷-裂潮城防/第207章-错峰防线遇上同一个峰.md', 'manuscript/第三卷-裂潮城防/第208章-让其中一口气慢三秒.md'];
if (chaptersTwoHundredSixToTwoHundredEight.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第206～208章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '预登记地质、星兽与武脉三种候选，校准四地本地时间；同步实战中保住人员并以第六井非破坏扰动让一条支线慢3.4秒，当前证据支持共同结构长波驱动。', links: [...new Set([...current.links, 'research/裂潮四支线同步机制预登记.md', ...chaptersTwoHundredSixToTwoHundredEight])], updatedAt: now() } as never, 'researcher');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第209～211章'))) {
    await project.eventStore.append('task.upsert', { id: uid('task'), title: '续写第209～211章：没有编号的第五次呼吸', description: '用纯被动听针定位四支线共同长波的深层交点，区分自然压力盆地、无气血星兽与旧城防设施，不因没有气血便贸然钻探。', level: 'chapter', status: 'now', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'critical', whyNow: '相位扰动证明四支线更像响应共同深层长波；源头不在任何已编号支线，下一次同步仍会重新建立。', known: ['四支线结构长波先于当地气血收缩', '第六支线可被非破坏扰动错相', '反推交点位于西南深层且无已知气血'], missingDecisions: ['无气血源是否允许投放有源探针？'], aiPreAnalysis: '第209章铺设纯被动阵列并处理城市噪声；第210章反演深度与旧图冲突；第211章用既有停机窗口验证源头性质，决定是否进入深层。', authorDecision: '先被动定位，不钻井、不爆破、不把无气血等同无生命；设施图、地质图和现场传播分别保留。', agentWork: '', completionCriteria: ['至少两套独立定位证据', '明确一次地图或模型误差', '下一步深层行动有安全边界'], links: [chaptersTwoHundredSixToTwoHundredEight[2], 'research/裂潮四支线同步机制预登记.md'], dependencies: [], createdAt: now(), updatedAt: now() } as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '裂潮多点时间校准', statement: '断线本地钟和批次时间不能直接证明同步；以低能机械波及已测传播时间校准后，四支线本轮吸气起点相差0.42秒。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredSixToTwoHundredEight[0], quote: '修正后，四条吸气起点相差零点四二秒。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '四支线同步收缩实战', statement: '同步峰中损毁供水管、2座空架、撤离灯与钢网，9只幼兽被导入无人区，2人黄伤、无居民伤亡；主裂带峰值下降13%。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredSixToTwoHundredEight[1], quote: '主裂带峰值比无动作预测低一成三' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '岩肺同步当前证据', statement: '深层结构长波先于当地压力与气血收缩，城市武脉摆动更晚；当前支持共同压力驱动，未见星兽主动追相或武脉先行证据。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredSixToTwoHundredEight[2], quote: '当前最小结论' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '裂潮非破坏相位扰动', statement: '第六井提前开2.5厘米持续1.2秒，使当地收缩晚3.4秒；偏差随后按3.4、1.9、0.8秒衰减，其他三线未主动等待。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredSixToTwoHundredEight[2], quote: '第三点四秒' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '未编号深层长波源', statement: '四支线到达时间反推交点位于西南深层盆地，不在已知支线且暂无已知气血；每次同步前均有更慢更大的起伏。', status: 'agent-inferred', evidence: [{ filePath: chaptersTwoHundredSixToTwoHundredEight[2], quote: '第五个没有编号的呼吸' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, 'system');
  await setPosition({ filePath: chaptersTwoHundredSixToTwoHundredEight[2], stage: '第三卷深层长波定位阶段', focus: '续写第209～211章：没有编号的第五次呼吸' });
}
state = await project.state();
const chaptersTwoHundredNineToTwoHundredEleven = ['manuscript/第三卷-裂潮城防/第209章-先把城市自己的声音拿掉.md', 'manuscript/第三卷-裂潮城防/第210章-旧矿井从另一个零点往下数.md', 'manuscript/第三卷-裂潮城防/第211章-停下七十秒它还在呼吸.md'];
if (chaptersTwoHundredNineToTwoHundredEleven.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第209～211章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '用30枚有效听针和压力极性片被动定位西南深层长波，校正旧矿井33.6米高程差；低负载窗口验证自然主波不由当前设施启动，并发现停用调压层将压力分向4条南部支线。', links: [...new Set([...current.links, 'research/西南无编号长波被动定位.md', ...chaptersTwoHundredNineToTwoHundredEleven])], updatedAt: now() } as never, 'researcher');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第212～214章'))) {
    await project.eventStore.append('task.upsert', { id: uid('task'), title: '续写第212～214章：十二个出口只剩四个', description: '审计旧调压层12条泄载支路的真实状态、当前承压对象与恢复代价，寻找不把南墙和城心二选一的重新分配方案。', level: 'chapter', status: 'now', kind: 'planning', assignee: 'architect', source: 'navigator', priority: 'critical', whyNow: '旧调压层仍将自然深层压力导向南部，12条出口中仅4条明显传力；同步峰会继续出现。', known: ['调压层建造目标是降低城心主脉峰值', '4条南部支线仍承压', '8条旧支路状态未知且不能直接炸开'], missingDecisions: ['哪些失效支路可在无人区有限恢复，哪些会把风险送入居民地基？'], aiPreAnalysis: '第212章逐条列出现状与受影响人群；第213章公开城心回压与南墙现损两张图；第214章选择一条低后果支路做远程小流量验证。', authorDecision: '不接受城心或南墙二选一；每条支路独立勘测，先找无人、可关闭、有过滤与退出条件的低后果出口，恢复失败不得派人抢修。', agentWork: '', completionCriteria: ['12条支路均有状态而非总体评分', '城心与南墙风险同时可见', '至少一条低后果分流获得可证伪方案'], links: [chaptersTwoHundredNineToTwoHundredEleven[2]], dependencies: [], createdAt: now(), updatedAt: now() } as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'timeline', subject: '西南无编号长波定位', statement: '30枚有效听针的到时反演与8枚压力极性片独立重叠于西南盆地下440至500米、约80乘140米误差区；中心暂未检出气血。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredNineToTwoHundredEleven[0], quote: '两者重叠在地下四百四十至五百米。' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '西南旧图高程', statement: '旧矿图以低于现代城心碑33.6米的一号井口为零；校正后其西南调压层与现代玄武岩层下缘重叠。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredNineToTwoHundredEleven[1], quote: '地下位置相差三十三点六米。' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '第五呼吸两段结构', statement: '西南自然深层长波之后0.9秒出现规则金属余振，再向4条岩肺支线分配压力；旧调压层可能是放大或分流结构。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredNineToTwoHundredEleven[1], quote: '第五个呼吸因此拆成两段。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '城市七十秒低负载验证', statement: '城市主脉幅度下降22%时西南长波时刻仅差0.3秒、幅度差4.1%，当前错峰设施未显示为长波起点；城市主脉仍晚于外部支线1.7秒。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredNineToTwoHundredEleven[2], quote: '西南深层长波按原预计时间到来。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '西南调压层压力分配', statement: '约69年前停用的调压层原有12条泄载支路，现仅4条明显传力，将保护城心主脉的压力不均地送往南部；拆除后的城心回压未知。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredNineToTwoHundredEleven[2], quote: '今天十二个出口只剩四个。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, 'system');
  await setPosition({ filePath: chaptersTwoHundredNineToTwoHundredEleven[2], stage: '第三卷旧调压层审计阶段', focus: '续写第212～214章：十二个出口只剩四个' });
}
state = await project.state();
const chaptersTwoHundredTwelveToTwoHundredFourteen = ['manuscript/第三卷-裂潮城防/第212章-十二条支路不能算成四成完好.md', 'manuscript/第三卷-裂潮城防/第213章-两张风险图必须挂在一起.md', 'manuscript/第三卷-裂潮城防/第214章-第五个出口只开一指宽.md'];
if (chaptersTwoHundredTwelveToTwoHundredFourteen.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第212～214章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '逐条审计调压层12支路并同时公开城心回压与南墙现损；第9支路1.6厘米、2秒试验降低四线峰值3.8%至7.1%，城心承担2.6%回压，关闭卡滞后牺牲封堵且无人抢修。', links: [...new Set([...current.links, 'planning/西南调压层十二支路审计.md', ...chaptersTwoHundredTwelveToTwoHundredFourteen])], updatedAt: now() } as never, 'architect');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第215～217章'))) {
    await project.eventStore.append('task.upsert', { id: uid('task'), title: '续写第215～217章：巨爪沿着新压力路来了', description: '判断第七支线巨爪转向第9支路是追踪压力梯度还是机械节奏，在人员不返回盐碱地的前提下阻止它进入旧调压层检修路。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'critical', whyNow: '第9支路试验已封死，但巨爪向盐碱地前进19米；报废设备可放弃，旧检修路若被打穿会成为不可控出口。', known: ['巨爪曾学习通信、机械诱饵与锚点结构', '第9支路设备已牺牲封堵', '巨爪转向与压力试验同窗发生但因果未分辨'], missingDecisions: ['如何在不重开支路的情况下区分压力与机械节奏？'], aiPreAnalysis: '第215章用停机后的余压与无压机械对照分辨目标；第216章盐碱地无人防线承受巨爪实战；第217章用可放弃压力路径将其留在城外并处理调压层损伤。', authorDecision: '不为保报废设备派人；先用低后果、一次性、无高频心跳的远程对照，任何引流不得把目标送回居民或仍在使用的支路。', agentWork: '', completionCriteria: ['转向原因至少有两类独立证据', '无人红线不因设备受损解除', '巨爪去向与调压层结构后果均可追溯'], links: [chaptersTwoHundredTwelveToTwoHundredFourteen[2]], dependencies: [], createdAt: now(), updatedAt: now() } as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '调压层十二支路审计', statement: '12支路分别记录传力、地表用途、在场人员、关闭、过滤和失效去向；仅第9支路进入低后果试验，其余住宅、医院、水路与未知空腔未自动递补。', status: 'author-confirmed', evidence: [{ filePath: chaptersTwoHundredTwelveToTwoHundredFourteen[0], quote: '十二个不同答案' }], updatedAt: now() },
    { id: uid('fact'), category: 'decision', subject: '城心与南墙共同承压试验', statement: '第9支路验证时城心37处可延后设施预留4%主脉余量，医院供水撤离设备不动；风险、退出与中止权分别确认。', status: 'author-confirmed', evidence: [{ filePath: chaptersTwoHundredTwelveToTwoHundredFourteen[1], quote: '百分之四的压力余量' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '第9支路小开度验证', statement: '开1.6厘米持续2秒使4条现役支线峰值分别下降4.9%、7.1%、3.8%、5.2%，城心峰值上升2.6%；关闭卡在0.6厘米后牺牲塞封堵，无人受伤。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredTwelveToTwoHundredFourteen[2], quote: '一次成功开度和一次失败关闭同时成立。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '巨爪转向第9支路', statement: '第9支路开启期间第七支线巨爪转向23度并朝盐碱地前进19米，封堵后未立刻回转；可能响应压力梯度或机械节奏。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredTwelveToTwoHundredFourteen[2], quote: '朝盐碱地方向前进了十九米。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, 'system');
  await setPosition({ filePath: chaptersTwoHundredTwelveToTwoHundredFourteen[2], stage: '第三卷新出口引流实战阶段', focus: '续写第215～217章：巨爪沿着新压力路来了' });
}
state = await project.state();
const chaptersTwoHundredFifteenToTwoHundredSeventeen = ['manuscript/第三卷-裂潮城防/第215章-远处跟压力近处抓金属.md', 'manuscript/第三卷-裂潮城防/第216章-报废设备不值得一个人进去.md', 'manuscript/第三卷-裂潮城防/第217章-把第五个出口重新埋回去.md'];
if (chaptersTwoHundredFifteenToTwoHundredSeventeen.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第215～217章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '用无压机械门与浅层压力囊分辨巨爪远距压力寻路、近距机械攻击；三段无人引流将其带入盐碱地塌陷池，第9支路永久封存，无人员进入抢修，并记录调压层错位后的真实城心回压。', links: [...new Set([...current.links, ...chaptersTwoHundredFifteenToTwoHundredSeventeen])], updatedAt: now() } as never, 'writer');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第218～220章'))) {
    await project.eventStore.append('task.upsert', { id: uid('task'), title: '续写第218～220章：让城心主动接住一轮', description: '在调压层第9连接段错位的真实边界内，让城心通过预先降载、分区支撑和明确中止条件主动承担一轮回压，同时保持南部四线本地安全。', level: 'chapter', status: 'now', kind: 'planning', assignee: 'architect', source: 'navigator', priority: 'critical', whyNow: '巨爪损伤使城心额外承压5.8%且未越黄、南部四线下降，但过程不可控；下一轮长波即将到来。', known: ['城心在37处低负载条件下承受过5.8%额外峰值', '第9支路已永久封存', '调压层错位可能回弹或继续扩大'], missingDecisions: ['如何定义城心主动承压上限与南部退出条件？'], aiPreAnalysis: '第218章公开预案与逐设施退出；第219章城心真实承压并处理局部故障；第220章比较两轮结果，形成全城分担而非单点牺牲的临时规则。', authorDecision: '不把5.8%直接变成永久许可；按设施逐项降载，城心任一结构红线则停止扩大，南部四线保留独立开井、撤离与设备放弃权。', agentWork: '', completionCriteria: ['城心承压不是模型模拟而是真实一轮', '南部风险没有因试验被隐藏', '失败或回弹有可执行退出路径'], links: [chaptersTwoHundredFifteenToTwoHundredSeventeen[2]], dependencies: [], createdAt: now(), updatedAt: now() } as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '第七支线巨爪双尺度响应', statement: '本轮两次对照显示巨爪远距路线随浅层压力梯度改变，进入约40米后会横扫一次性机械振动；规则不外推其他星兽。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredFifteenToTwoHundredSeventeen[0], quote: '远处跟压力。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '盐碱地巨爪无人引流', statement: '三只一次性压力囊和两座空金属笼将巨爪引入塌陷池，旧检修口未贯通；全部红线内无人，设备损毁未触发人工抢修。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredFifteenToTwoHundredSeventeen[1], quote: '报废设备不值得一个人进去。' }], updatedAt: now() },
    { id: uid('fact'), category: 'decision', subject: '第9支路永久封存', statement: '巨爪损坏外门、牺牲塞与检修廊后，远程碎石封包使连接幅度下降90%；该支路不能以维修门方式近期复用。', status: 'author-confirmed', evidence: [{ filePath: chaptersTwoHundredFifteenToTwoHundredSeventeen[2], quote: '永久封存候选' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '调压层第9连接段错位', statement: '巨爪造成旧圆环连接段向内错位，下一轮南部四线峰值下降1.9%至3.5%，城心上升5.8%；37处低负载下城心未越黄，炮台备用延迟9秒。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredFifteenToTwoHundredSeventeen[2], quote: '城心主脉峰值则上升百分之五点八。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, 'system');
  await setPosition({ filePath: chaptersTwoHundredFifteenToTwoHundredSeventeen[2], stage: '第三卷全城主动承压阶段', focus: '续写第218～220章：让城心主动接住一轮' });
}
state = await project.state();
const chaptersTwoHundredEighteenToTwoHundredTwenty = ['manuscript/第三卷-裂潮城防/第218章-百分之五点八不是全城许可.md', 'manuscript/第三卷-裂潮城防/第219章-城心第一次听见南墙的声音.md', 'manuscript/第三卷-裂潮城防/第220章-共同承担不是平均用力.md'];
if (chaptersTwoHundredEighteenToTwoHundredTwenty.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第218～220章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '将城心拆为43个承压单元、37处逐项低负载，真实接住5.6%额外峰值；处理供水渗漏、训练桥关闭和17户撤离，同时保留南部井口拒绝权，形成三层临时分担规则。', links: [...new Set([...current.links, ...chaptersTwoHundredEighteenToTwoHundredTwenty])], updatedAt: now() } as never, 'architect');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第221～223章'))) {
    await project.eventStore.append('task.upsert', { id: uid('task'), title: '续写第221～223章：旧圆环开始失去回声', description: '应对西南调压层多处连接滑移、固定分配失效与18分钟后增强长波，用本地自治和实时压力极性把城心、南部及城内设施从旧比例中解耦。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'critical', whyNow: '背景压力升高18%、长波受压缩短，至少3处连接滑移；下一轮去向无法由历史比例预测。', known: ['共同承压三层规则已经过一轮实战', '旧圆环人工回响重叠并局部消失', '18分钟内有更强自然长波'], missingDecisions: ['无固定分流时哪些动作还能提前，哪些必须等本地波头？'], aiPreAnalysis: '第221章取消依赖旧比例的自动动作并建立极性触发；第222章多连接滑移实战；第223章旧圆环脱扣后用全城分布式动作准备最终主波。', authorDecision: '不尝试18分钟内修复深层结构；提前只做人员、低负载和可放弃准备，井口、炮台、阻断网等方向性动作等本地证据触发。', agentWork: '', completionCriteria: ['至少一次旧比例误导被安全阻止', '城心与南部均有真实局部后果', '最终主波前形成不依赖总阀的动作网'], links: [chaptersTwoHundredEighteenToTwoHundredTwenty[2]], dependencies: [], createdAt: now(), updatedAt: now() } as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'decision', subject: '城心主动承压边界', statement: '城心拆成43个本地承压单元，37处可调设施按真实回执低负载；必要服务不统一关闭，南部4线保留独立井口与撤离权。', status: 'author-confirmed', evidence: [{ filePath: chaptersTwoHundredEighteenToTwoHundredTwenty[0], quote: '没有一盏灯叫作全城安全。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '城心首次主动承压', statement: '增强8%的深层长波中城心额外峰值5.6%，出现供水支管渗漏、训练桥关闭、17户撤离和炮台备用延迟9秒；必要服务未中断，南部无人员伤亡。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredEighteenToTwoHundredTwenty[1], quote: '整轮持续四十三秒。' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '全城共同承压临时规则', statement: '分必要服务、可调负载与南部释放三层；共同承担不追求相同百分比，任何固定许可随调压结构、负载和本地风险变化失效。', status: 'author-confirmed', evidence: [{ filePath: chaptersTwoHundredEighteenToTwoHundredTwenty[2], quote: '临时规则只保留三层。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '旧调压层多连接滑移', statement: '背景压力升高18%、缓慢受压由7.2秒缩短到5.9秒，至少3处连接滑移，金属余振重叠；固定分配比例不再可信。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredEighteenToTwoHundredTwenty[2], quote: '至少三处连接正在滑移。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, 'system');
  await setPosition({ filePath: chaptersTwoHundredEighteenToTwoHundredTwenty[2], stage: '第三卷调压层脱扣阶段', focus: '续写第221～223章：旧圆环开始失去回声' });
}
state = await project.state();
const chaptersTwoHundredTwentyOneToTwoHundredTwentyThree = ['manuscript/第三卷-裂潮城防/第221章-旧比例差点同时打开三口井.md', 'manuscript/第三卷-裂潮城防/第222章-三个连接在一秒里滑开.md', 'manuscript/第三卷-裂潮城防/第223章-没有总阀以后每一处自己停下.md'];
if (chaptersTwoHundredTwentyOneToTwoHundredTwentyThree.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第221～223章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '冻结旧比例和固定相位自动动作，以压力极性加结构位移触发；三连接滑移中处理第六井、城心换热站和南部局部后果，最终建立62个无总阀本地单元迎接主波。', links: [...new Set([...current.links, ...chaptersTwoHundredTwentyOneToTwoHundredTwentyThree])], updatedAt: now() } as never, 'writer');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第224～226章'))) {
    await project.eventStore.append('task.upsert', { id: uid('task'), title: '续写第224～226章：全城没有一个总阀', description: '让增强主波穿过已失去统一相位的调压层，验证62个本地单元在方向相反、断线与星兽上涌同时发生时能否各自中止并协作。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'critical', whyNow: '深层主波已抵达第一枚听针，背景压力高18%，旧调压层统一回声消失。', known: ['62个单元已完成一轮空演练', '旧比例自动动作冻结', '部分单元存在钟差、人员状态和压力片饱和缺口'], missingDecisions: ['主波中哪个局部损失允许放弃，哪个必要服务必须跨层支援？'], aiPreAnalysis: '第224章多方向波头与第一轮本地动作；第225章峰值、断线和星兽上涌的全城战；第226章主波回落、人员与设施核验及调压层终态。', authorDecision: '不进入深层修环，不追求62处全部完好；必要服务、人员撤离和本地中止优先，设备与空阵地可放弃，跨层支援必须带明确后果和退出。', agentWork: '', completionCriteria: ['必要服务没有因统一动作同时失效', '至少一次断线自治和一次跨层支援可追溯', '卷末主战结果同时列明伤亡、设备、居民与未知目标'], links: [chaptersTwoHundredTwentyOneToTwoHundredTwentyThree[2]], dependencies: [], createdAt: now(), updatedAt: now() } as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '方向动作当前证据门', statement: '调压层失相后，人员撤离与降载可提前；开井、转炮等改变压力去向的动作需本地压力极性与结构位移两类证据，旧比例只保留历史。', status: 'author-confirmed', evidence: [{ filePath: chaptersTwoHundredTwentyOneToTwoHundredTwentyThree[0], quote: '没有足够当前证据时' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '调压层三连接滑移', statement: '三连接1.1秒内滑移，城心额外峰值7.1%，换热站停机致6栋楼供暖中断23分钟；第六井开2厘米挤出7只骨鼠，南部另损1空架，无人员伤亡。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredTwentyOneToTwoHundredTwentyThree[1], quote: '整个滑移持续十九秒。' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '无总阀城防动作网', statement: '当前波次拆为62个拥有独立停止条件的本地单元；只提前清人、降可调负载、准备可放弃设备，方向动作等本地双证据。', status: 'author-confirmed', evidence: [{ filePath: chaptersTwoHundredTwentyOneToTwoHundredTwentyThree[2], quote: '动作网拆成六十二个本地单元。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '裂潮增强主波', statement: '旧调压层规则回声已经消失，背景压力较前轮高18%的主波抵达；巨爪仍在无人盐碱地深层活动。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredTwentyOneToTwoHundredTwentyThree[2], quote: '深层主波抵达第一枚听针。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, 'system');
  await setPosition({ filePath: chaptersTwoHundredTwentyOneToTwoHundredTwentyThree[2], stage: '第三卷最终主波阶段', focus: '续写第224～226章：全城没有一个总阀' });
}
state = await project.state();
const chaptersTwoHundredTwentyFourToTwoHundredTwentySix = ['manuscript/第三卷-裂潮城防/第224章-六十二盏灯不会同时变绿.md', 'manuscript/第三卷-裂潮城防/第225章-一拳只能关掉一只卡死的阀.md', 'manuscript/第三卷-裂潮城防/第226章-守住以前先确认主波真的过去.md'];
if (chaptersTwoHundredTwentyFourToTwoHundredTwentySix.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第224～226章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '62个本地单元在相反压力、断线和多类星兽上涌中自主中止；江砚配合预紧绞盘剪断一只卡死震源，主波62秒、余压核验21分钟后通过，1红17黄、零死亡零失踪。', links: [...new Set([...current.links, ...chaptersTwoHundredTwentyFourToTwoHundredTwentySix])], updatedAt: now() } as never, 'writer');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第227～228章'))) {
    await project.eventStore.append('task.upsert', { id: uid('task'), title: '续写第227～228章：守住以后先把损失写全', description: '完成第三卷事故、伤情、居民、设备、未知目标和规则复盘；让江砚在恢复后接受可复现境界检查，并以百城战功归档异常启动第四卷。', level: 'volume', status: 'now', kind: 'review', assignee: 'editor', source: 'navigator', priority: 'high', whyNow: '主波已经确认通过，但战后恢复、责任和未知目标尚未结案；第三卷还差2章达到77章。', known: ['本轮1红17黄、零死亡零失踪', '调压层8断3续1弱且无统一分流', '江砚右肩黄伤、气血仍1.36', '巨爪和1处岩肺目标位置未知'], missingDecisions: ['哪些规则成为长期城防，哪些只保留为本次事件证据？'], aiPreAnalysis: '第227章逐项恢复与规则去留；第228章个人身体复测、第三卷目标结案，并让百城系统压缩战功制造下一卷冲突。', authorDecision: '先写损失、补偿与未知，再写胜利；境界需要总量、承载、控制多次复现，不以主峰一拳直接突破；卷末不把裂潮目标全部消灭。', agentWork: '', completionCriteria: ['第三卷77章与约9万字目标达成', '卷目标和当前任务完成并切换第四卷', '百城天梯钩子来自战功记录而非突发通知'], links: [chaptersTwoHundredTwentyFourToTwoHundredTwentySix[2], 'planning/百万字总纲.md'], dependencies: [], createdAt: now(), updatedAt: now() } as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'timeline', subject: '裂潮最终主波', statement: '主波持续62秒、余压核验21分钟；62个本地单元在无统一调压相位下完成中止与跨层支援，必要服务未同时失效。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredTwentyFourToTwoHundredTwentySix[2], quote: '主波持续六十二秒，余压确认二十一分钟。' }], updatedAt: now() },
    { id: uid('fact'), category: 'character', subject: '江砚裂潮主波动作', statement: '江砚以1.36气血和自身六节基础拳配合预紧绞盘，从安全侧剪断3枚牺牲栓关闭卡死震源；右肩黄伤并退出本班，未以个人力量修复地脉。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredTwentyFourToTwoHundredTwentySix[1], quote: '只关掉一只卡死的本地震源。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '裂潮主波人员结果', statement: '周槐2处肋骨骨裂为1名红伤，另17名黄伤；经班次名单、机械牌和邻近见证核验，零死亡零失踪。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredTwentyFourToTwoHundredTwentySix[2], quote: '零死亡。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '裂潮战后未知', statement: '调压层8条连接无规则余振、3条断续、1条弱连接；4处岩肺目标3处回落1处未知，盐碱地巨爪位置未知，裂潮进入长期监测。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredTwentyFourToTwoHundredTwentySix[2], quote: '没有死亡、捕获或离城证明。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, 'system');
  await setPosition({ filePath: chaptersTwoHundredTwentyFourToTwoHundredTwentySix[2], stage: '第三卷战后复盘阶段', focus: '续写第227～228章：守住以后先把损失写全' });
}
state = await project.state();
const chaptersTwoHundredTwentySevenToTwoHundredTwentyEight = ['manuscript/第三卷-裂潮城防/第227章-胜利报告先写两根断掉的肋骨.md', 'manuscript/第三卷-裂潮城防/第228章-南墙不是一条可以折叠的记录.md'];
if (chaptersTwoHundredTwentySevenToTwoHundredTwentyEight.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第227～228章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '完成第三卷伤情、居民、服务、设备、规则和未知目标结案；江砚经三日总量承载控制复测达到淬皮后段，并发现百城战功系统把62个本地动作压缩成个人首功。', links: [...new Set([...current.links, 'planning/第三卷结案.md', ...chaptersTwoHundredTwentySevenToTwoHundredTwentyEight])], updatedAt: now() } as never, 'editor');
  state = await project.state();
  for (const goal of state.goals.filter((item) => item.status === 'active' && item.title.includes('第三卷《裂潮城防》'))) await project.eventStore.append('goal.upsert', { ...goal, status: 'completed', updatedAt: now() } as never, 'author');
  state = await project.state();
  if (!state.goals.some((item) => item.title.includes('第四卷《百城天梯》'))) {
    await project.eventStore.append('goal.upsert', { id: uid('goal'), level: 'volume', title: '完成第四卷《百城天梯》并揭开战功篡改机制', description: '约81章：进入百城青年战与武册复核库，追查真实多人行动如何被压缩、归并和改写为少数英雄战功。', authority: 'author-pinned', status: 'active', target: 'manuscript/第四卷-百城天梯', updatedAt: now() } as never, 'author');
  }
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第229～231章'))) {
    await project.eventStore.append('task.upsert', { id: uid('task'), title: '续写第229～231章：六十二处动作只剩一个名字', description: '处理江砚战功更正、临渊十二人正选与百城复核库权限，在不泄露居民和伤员数据的前提下带原始事件结构进入天梯。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'high', whyNow: '百城系统已接受事实更正但拒绝改分，并以压缩后的裂潮首功邀请江砚参赛；第四卷需要从记录机制而非单纯比赛开场。', known: ['江砚战功排名临渊青年第7', '六十二单元被合并为中心调度和个人首功', '参赛可进入百城战功复核库', '第三卷原始事件包已只读保存'], missingDecisions: ['如何证明分布式贡献又不公开伤情、居民与未授权身份？'], aiPreAnalysis: '第229章提交最小可公开更正并分离计分争议；第230章临渊正选与替补审查各自战功来源；第231章进入百城天梯复核库，发现其他城市相同压缩模式。', authorDecision: '不把拒赛当唯一正确选择；利用参赛权限检查制度，同时只携带授权结构、匿名事件和可验证回执，不把周槐或居民变成举证材料。', agentWork: '', completionCriteria: ['第四卷场景、目标与竞赛入口清晰', '隐私与战功举证边界可执行', '至少一座外城记录显示相同或不同压缩机制'], links: [chaptersTwoHundredTwentySevenToTwoHundredTwentyEight[1], 'planning/第三卷结案.md', 'planning/百万字总纲.md'], dependencies: [], createdAt: now(), updatedAt: now() } as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'timeline', subject: '第三卷裂潮城防结案', statement: '第三卷77章完成：主波通过，1红17黄、零死亡零失踪；南墙未放弃，调压层与未知目标转长期监测，多层本地可中止防线保留。', status: 'author-confirmed', evidence: [{ filePath: chaptersTwoHundredTwentySevenToTwoHundredTwentyEight[1], quote: '第三卷状态页完成结案。' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '裂潮规则结案', statement: '长期保留本地中止、证据门、必要服务独立、设备可放弃与分层结案；62单元、具体开度、百分比和目标距离仅为本次参数。', status: 'author-confirmed', evidence: [{ filePath: chaptersTwoHundredTwentySevenToTwoHundredTwentyEight[0], quote: '规则也需要结案。' }], updatedAt: now() },
    { id: uid('fact'), category: 'character', subject: '江砚', statement: '主波5天后经连续3天气血总量、身体承载与疲劳控制复测，以1.52至1.53稳定达到淬皮后段；无自动深层、指挥或墙炮权限。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredTwentySevenToTwoHundredTwentyEight[1], quote: '江砚达到淬皮后段。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '百城战功压缩', statement: '百城系统将62本地单元压成中心调度，并把江砚一次剪栓写成个人稳定62节点；事实更正获接收但计分不改，江砚以临渊第7获百城天梯正选。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredTwentySevenToTwoHundredTwentyEight[1], quote: '个人稳定六十二节点' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, fact.status === 'author-confirmed' ? 'author' : 'system');
  await setPosition({ filePath: chaptersTwoHundredTwentySevenToTwoHundredTwentyEight[1], stage: '第四卷《百城天梯》启动', focus: '续写第229～231章：六十二处动作只剩一个名字' });
}
state = await project.state();
const chaptersTwoHundredTwentyNineToTwoHundredThirtyOne = ['manuscript/第四卷-百城天梯/第229章-更正不能要求交出所有人的隐私.md', 'manuscript/第四卷-百城天梯/第230章-十二名正选带着十二份压缩记录.md', 'manuscript/第四卷-百城天梯/第231章-第一份外城记录也少了人.md'];
if (chaptersTwoHundredTwentyNineToTwoHundredThirtyOne.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第229～231章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '建立公开事件、授权摘要、私有原始三层举证；审计临渊12名正选来源卡，以雾港压缩与镜原标准编制形成外城对照，并发现资格赛仍按旧计分标签要求个人复演62节点。', links: [...new Set([...current.links, 'planning/第四卷章纲.md', ...chaptersTwoHundredTwentyNineToTwoHundredThirtyOne])], updatedAt: now() } as never, 'writer');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第232～234章'))) {
    await project.eventStore.append('task.upsert', { id: uid('task'), title: '续写第232～234章：一个人复演六十二个节点', description: '处理资格赛从旧计分标签生成错误个人复演的问题，让江砚、纪潮生等人在真实排名代价下申报场景不匹配，并建立不会要求交出队友隐私的代表动作校正。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'critical', whyNow: '资格赛已生成62盏失控红灯并禁止队友与节点放弃，事实更正没有同步到复演标签。', known: ['江砚真实个人动作是关闭一只卡死震源', '纪潮生真实个人动作是最后一根水下剪栓', '资格赛层级影响后续对手、资源和复核权限'], missingDecisions: ['拒绝错误复演是否直接失去正选资格？'], aiPreAnalysis: '第232章申报不匹配并观察其他压缩战功；第233章在不冒充队友的情况下完成最小个人复演、接受低分；第234章用公开来源结构推动一次规则校正并进入真实对抗。', authorDecision: '不让江砚靠新能力独控62节点，也不把退赛写成唯一正义；使用正式异议、完成真实个人部分、接受排名成本，同时保护他人隐私和技法。', agentWork: '', completionCriteria: ['错误复演造成真实排名或资源代价', '校正不要求上传全量私人原始数据', '资格赛仍保留可比较难度而非按申诉直接满分'], links: [chaptersTwoHundredTwentyNineToTwoHundredThirtyOne[2]], dependencies: [], createdAt: now(), updatedAt: now() } as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '百城战功举证分层', statement: '裂潮战功更正分公开事件、持有人授权摘要和临渊私有原始三层；参赛与复核不自动扩大医疗、居民、路线和未授权身份访问。', status: 'author-confirmed', evidence: [{ filePath: chaptersTwoHundredTwentyNineToTwoHundredThirtyOne[0], quote: '三层' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '临渊百城代表团', statement: '临渊带12名正选、4名替补和3名有偿记录复核员；4107担任复核员而非因历史遗漏自动获得比赛席位，各人来源卡分离个人、协作、设备与争议。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredTwentyNineToTwoHundredThirtyOne[1], quote: '十二名正选各自生成一张来源卡。' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '百城天梯席位', statement: '百城由24座有武册核心权限的基地城及76座卫星、要塞、矿城与海上防区席位组成；非基地通常由所属基地代报战功。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredTwentyNineToTwoHundredThirtyOne[2], quote: '另七十六个席位' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '代表战功个人复演', statement: '资格赛仍按旧计分标签生成个人复演：纪潮生被要求单人关潮闸，江砚被要求不得用队友且不得放弃地稳定62节点。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredTwentyNineToTwoHundredThirtyOne[2], quote: '不得放弃任何节点。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, fact.status === 'author-confirmed' ? 'author' : 'system');
  await setPosition({ filePath: chaptersTwoHundredTwentyNineToTwoHundredThirtyOne[2], stage: '第四卷战功复演资格赛', focus: '续写第232～234章：一个人复演六十二个节点' });
}
state = await project.state();
const chaptersTwoHundredThirtyTwoToTwoHundredThirtyFour = ['manuscript/第四卷-百城天梯/第232章-场景不匹配不是弃权.md', 'manuscript/第四卷-百城天梯/第233章-六十一盏红灯不是六十一拳.md', 'manuscript/第四卷-百城天梯/第234章-更正场景以后分数从零开始算.md'];
if (chaptersTwoHundredThirtyTwoToTwoHundredThirtyFour.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第232～234章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '江砚只复演真实个人节点并以14.6分跌至11732名；47份不匹配经公开复核后保留首次后果、按来源卡或中立任务从零重评，江砚校正76分进入第四层。', links: [...new Set([...current.links, ...chaptersTwoHundredThirtyTwoToTwoHundredThirtyFour])], updatedAt: now() } as never, 'writer');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第235～237章'))) {
    await project.eventStore.append('task.upsert', { id: uid('task'), title: '续写第235～237章：第一层擂台只认标准步幅', description: '处理移动钢台默认军团步幅导致非标准身体与城市战法无法预检的问题，并完成江砚与镜原标准编制武者的首场真实对抗。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'high', whyNow: '战功复演刚完成临时校正，下一轮赛场仍把标准步幅当成所有人都能使用的中立接口。', known: ['江砚校正分76进入第四层', '镜原对手校正分92且训练记录完整', '4107短架与纪潮生水下步无法通过默认预检'], missingDecisions: ['允许适配会不会让选手临场定制有利场地？'], aiPreAnalysis: '第235章拆分安全校准与动作统一；第236章在规则未改前完成江砚首战；第237章建立赛前登记适配与共同目标，处理已比赛场次的公平。', authorDecision: '不暂停已具备安全接口的首场，也不按江砚身体临场改台；适配器赛前冻结、公开承力范围，评分目标保持移动台上的稳定、有效击中与安全中止。', agentWork: '', completionCriteria: ['首战有技术胜负和身体代价', '非标准选手获得可验证而非任意适配', '已经完成的比赛不因规则更新被静默覆盖'], links: [chaptersTwoHundredThirtyTwoToTwoHundredThirtyFour[2], 'planning/第四卷章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() } as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'timeline', subject: '错误战功个人复演', statement: '江砚只完成真实第19节点及人员中止，其余节点无所有者，得14.6分暂列11732；纪潮生得11分，另有选手因复演压缩救援导致肩袖拉伤。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredThirtyTwoToTwoHundredThirtyFour[1], quote: '总分十四点六。' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '代表战功复演校正', statement: '47份不匹配保留首次分数、伤情与资源后果，但退出初始层级计算；真实个人范围或等价中立任务从零按判断、完成、代价、中止、复现评分。', status: 'author-confirmed', evidence: [{ filePath: chaptersTwoHundredThirtyTwoToTwoHundredThirtyFour[2], quote: '第三项重新从零评分。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '江砚百城校正资格', statement: '江砚在随机液压锁死任务以侧向泄压和四节复位得76分，进入第四层；原少用训练额度补回但不挤占既有预约。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredThirtyTwoToTwoHundredThirtyFour[2], quote: '校正分七十六。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '百城标准步幅擂台', statement: '首轮移动钢台默认只接受标准军团步幅，江砚可通过，但4107短架、纪潮生水下步等非标准接口无法预检。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredThirtyTwoToTwoHundredThirtyFour[2], quote: '只接受标准步幅校准' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, fact.status === 'author-confirmed' ? 'author' : 'system');
  await setPosition({ filePath: chaptersTwoHundredThirtyTwoToTwoHundredThirtyFour[2], stage: '第四卷标准擂台阶段', focus: '续写第235～237章：第一层擂台只认标准步幅' });
}
state = await project.state();
const chaptersTwoHundredThirtyFiveToTwoHundredThirtySeven = ['manuscript/第四卷-百城天梯/第235章-安全校准不需要统一每一步.md', 'manuscript/第四卷-百城天梯/第236章-标准步幅把每一次回弹都给了她.md', 'manuscript/第四卷-百城天梯/第237章-适配器在比赛开始前封存.md'];
if (chaptersTwoHundredThirtyFiveToTwoHundredThirtySeven.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第235～237章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '拆分钢台安全层与动作时间映射；江砚在移动台1比2负于镜原温照，胜负保留；32名预检受阻者经赛前封存适配后28人通过，4人按真实硬件边界进入等价固定台。', links: [...new Set([...current.links, ...chaptersTwoHundredThirtyFiveToTwoHundredThirtySeven])], updatedAt: now() } as never, 'writer');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第238～240章'))) {
    await project.eventStore.append('task.upsert', { id: uid('task'), title: '续写第238～240章：同一拳有三种有效', description: '比较临渊连续回收、镜原阵形保持与百城目标区计分，建立共同结果与来源维度的双层展示，并完成江砚败者组保级战。', level: 'chapter', status: 'now', kind: 'review', assignee: 'editor', source: 'navigator', priority: 'high', whyNow: '江砚对温照同一记侧腹拳在三套规则中分数不同；下一场失败将失去第四层训练与当前复核时长。', known: ['百城当前有效击中需目标区、最低冲击和动作后承力', '江砚首战1比2落败', '场地适配只修接口不改胜负'], missingDecisions: ['共同排名能否保留城市训练目标而不变成三张互不相认的榜？'], aiPreAnalysis: '第238章把同一动作按共同结果和来源维度并列；第239章江砚在败者组面对不同城市防御体系；第240章复盘一记“无效但改变胜负”的动作，调整展示而非临场改判。', authorDecision: '当前胜负继续按赛前百城规则；新增来源维度只解释动作，不为选手选择最有利算法。共同层比较有效接触、位移、控制与安全结果，城市层保留其训练价值。', agentWork: '', completionCriteria: ['保级战有明确胜负与代价', '至少一个当前规则未计分但有战术后果的动作可追溯', '展示调整不回溯篡改已结束比赛'], links: [chaptersTwoHundredThirtyFiveToTwoHundredThirtySeven[2]], dependencies: [], createdAt: now(), updatedAt: now() } as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '百城钢台适配', statement: '安全层只看总载荷、承力区、冲击上限、本地中止；动作层用赛前3轮空走冻结时间映射，不增加回弹，超范围转固定板。', status: 'author-confirmed', evidence: [{ filePath: chaptersTwoHundredThirtyFiveToTwoHundredThirtySeven[2], quote: '每套适配器赛前封存。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '江砚百城首战', statement: '江砚在移动钢台以短步固定板拿到1次有效，但温照利用标准军团步10次回弹，以2比1、47秒取胜；双方无持续伤害。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredThirtyFiveToTwoHundredThirtySeven[1], quote: '【温照胜。】' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '钢台非标准预检修复', statement: '32名受阻者中28人经适配通过，4人因载荷、义肢断离或医疗边界进入等价固定台；已完成187场保留，不静默重赛。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredThirtyFiveToTwoHundredThirtySeven[2], quote: '三十二人中二十八人通过。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '百城有效击中口径', statement: '江砚同一记侧腹拳在临渊连续回收、镜原阵形保持、百城目标区规则中得分不同，暴露共同排名与城市训练目标的下一冲突。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredThirtyFiveToTwoHundredThirtySeven[2], quote: '三个不同分数' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, fact.status === 'author-confirmed' ? 'author' : 'system');
  await setPosition({ filePath: chaptersTwoHundredThirtyFiveToTwoHundredThirtySeven[2], stage: '第四卷有效结果计分阶段', focus: '续写第238～240章：同一拳有三种有效' });
}
state = await project.state();
const chaptersTwoHundredThirtyEightToTwoHundredForty = ['manuscript/第四卷-百城天梯/第238章-有效不是只有一个数字.md', 'manuscript/第四卷-百城天梯/第239章-没有得分的两拳改变了第三拳.md', 'manuscript/第四卷-百城天梯/第240章-解释一分不能偷偷变成第二分.md'];
if (chaptersTwoHundredThirtyEightToTwoHundredForty.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第238～240章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '建立共同比分与城市来源双层展示；江砚以两次零分触碰改变赵砺门闩脚，3比2赢下败者组保级战，左前臂黄线；未计分动作进入可追溯事件链但不补分。', links: [...new Set([...current.links, ...chaptersTwoHundredThirtyEightToTwoHundredForty])], updatedAt: now() } as never, 'editor');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第241～243章'))) {
    await project.eventStore.append('task.upsert', { id: uid('task'), title: '续写第241～243章：三次中止都被算成没有打完', description: '区分自身医疗中止、对手设备风险中止与场地证据冲突中止，让安全动作获得独立可见结果但不直接变成胜分，并处理是否重赛与责任。', level: 'chapter', status: 'now', kind: 'review', assignee: 'editor', source: 'navigator', priority: 'high', whyNow: '首轮有3名连续中止选手统一记负，其中2次可能避免真实伤害，当前榜单只有“未完成”。', known: ['共同比分与来源层已分开', '安全适配器有本地中止', '中止者若都获胜会产生策略性滥用'], missingDecisions: ['谁能触发中止、何时记负、何时场地无效并重赛？'], aiPreAnalysis: '第241章逐场复原三次中止；第242章验证一次对手设备断离故障；第243章建立人员、对手、场地三类终态与复赛边界。', authorDecision: '自身风险中止仍按未完成判负但记录安全动作；对手确认风险按当时比分和责任处理；场地证据冲突导致场次无效重赛。中止不自动加胜分，也不因误报惩罚到不敢停。', agentWork: '', completionCriteria: ['三类中止终态分别可执行', '至少一次设备或场地问题得到独立验证', '已受伤、已消耗资源与原比赛记录不被重赛覆盖'], links: [chaptersTwoHundredThirtyEightToTwoHundredForty[2]], dependencies: [], createdAt: now(), updatedAt: now() } as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '百城比分双层展示', statement: '共同层按赛前目标区、最低冲击、动作后承力决定胜负；来源层展示连续、位移、阵形、回收、设备与缺失，不补分或生成多套胜负。', status: 'author-confirmed', evidence: [{ filePath: chaptersTwoHundredThirtyEightToTwoHundredForty[0], quote: '展示拆成两层' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '江砚败者组保级战', statement: '江砚以2次低阈值触碰迫使赵砺换脚，再完成3次有效，以3比2、78秒获胜保住第四层；左前臂黄线，错过当日80分钟训练。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredThirtyEightToTwoHundredForty[1], quote: '【江砚胜。】' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '未计分战术前因', statement: '低于共同阈值的试探不补算有效，但可通过时间、方向和传感来源连接到后续得分；缺数据明确显示未记录，不等于未发生。', status: 'author-confirmed', evidence: [{ filePath: chaptersTwoHundredThirtyEightToTwoHundredForty[2], quote: '解释结果。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '百城三类比赛中止', statement: '首轮3名中止者均记负：自身医疗黄线、对手助力器断离失败、钢台结构传感冲突；需要区分安全选择、对手风险和场地无效。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredThirtyEightToTwoHundredForty[2], quote: '三次中止' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, fact.status === 'author-confirmed' ? 'author' : 'system');
  await setPosition({ filePath: chaptersTwoHundredThirtyEightToTwoHundredForty[2], stage: '第四卷比赛中止复核阶段', focus: '续写第241～243章：三次中止都被算成没有打完' });
}
state = await project.state();
const chaptersTwoHundredFortyOneToTwoHundredFortyThree = ['manuscript/第四卷-百城天梯/第241章-同样没有打完有三种原因.md', 'manuscript/第四卷-百城天梯/第242章-断离灯亮了设备却没有断开.md', 'manuscript/第四卷-百城天梯/第243章-中止不加分也不能只出现在扣分栏.md'];
if (chaptersTwoHundredFortyOneToTwoHundredFortyThree.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第241～243章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '将自身医疗、对手设备、场地证据三类中止分开；复现助力器控制完成但机械锁未退故障，徐鹭2比1技术胜、孟澄负场保留、裴止场次无效择日重赛，中止进入来源层不补胜分。', links: [...new Set([...current.links, ...chaptersTwoHundredFortyOneToTwoHundredFortyThree])], updatedAt: now() } as never, 'editor');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第244～246章'))) {
    await project.eventStore.append('task.upsert', { id: uid('task'), title: '续写第244～246章：水下步法到了没有水的台上', description: '完成江砚与纪潮生的移动钢台对抗，检验适配器只修传感接口、不复制水下浮力后，一种海防步法还能保留什么，并收束标准赛场阶段。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'high', whyNow: '纪潮生脚外缘探底适配已封存，两人都因错误战功复演掉过层级，下一场胜负影响进入跨城团队抽签。', known: ['江砚淬皮后段、左前臂黄线已需复测', '纪潮生代表战功是真实水下剪栓但非单人关闸', '钢台不会提供水阻或浮力'], missingDecisions: ['水下步失去介质后是否仍能形成可比较战法？'], aiPreAnalysis: '第244章公开适配边界和双方准备；第245章完成不同步法实战；第246章复盘介质、接口与个人能力，公布第一阶段层级和跨城分组。', authorDecision: '不为纪潮生造水或降低共同目标；脚外缘探底、低重心和短接触可以保留，水阻借力不能。胜负按当前钢台规则，赛后解释不改判。', agentWork: '', completionCriteria: ['比赛有明确胜负、反制和代价', '适配器没有变成流派增益器', '标准赛场阶段结案并进入跨城记录/团队阶段'], links: [chaptersTwoHundredFortyOneToTwoHundredFortyThree[2]], dependencies: [], createdAt: now(), updatedAt: now() } as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '百城三类比赛中止终态', statement: '自身医疗中止仍可判负；确认对手登记设备风险按有效进程与比分技术处理；场地证据冲突则场次无效择期重赛，首次消耗与记录保留。', status: 'author-confirmed', evidence: [{ filePath: chaptersTwoHundredFortyOneToTwoHundredFortyThree[2], quote: '三场中止获得三种终态。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '徐鹭助力器风险中止', statement: '徐鹭在2比1领先时因对手助力器断离灯与金属回弹停止比赛；假肢台复现锁销半退、日志仍运行，最终技术胜，不补第三分。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredFortyOneToTwoHundredFortyThree[1], quote: '临时终态定为技术终止。' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '中止与比赛计分分离', statement: '安全中止显示触发证据、保护对象与复核，但不自动增加个人武力分；恶意或重复无依据中止需另证，不能以可能滥用压制停手。', status: 'author-confirmed', evidence: [{ filePath: chaptersTwoHundredFortyOneToTwoHundredFortyThree[2], quote: '中止不加分' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '江砚对纪潮生', statement: '纪潮生水下步通过赛前封存适配，下一场在无水移动钢台对阵江砚；接口识别脚外缘探底但不提供水阻和浮力。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredFortyOneToTwoHundredFortyThree[2], quote: '雾港纪潮生。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, fact.status === 'author-confirmed' ? 'author' : 'system');
  await setPosition({ filePath: chaptersTwoHundredFortyOneToTwoHundredFortyThree[2], stage: '第四卷标准赛场收束阶段', focus: '续写第244～246章：水下步法到了没有水的台上' });
}
state = await project.state();
const chaptersTwoHundredFortyFourToTwoHundredFortySix = ['manuscript/第四卷-百城天梯/第244章-水下步先失去水.md', 'manuscript/第四卷-百城天梯/第245章-探底的人不一定会踩下去.md', 'manuscript/第四卷-百城天梯/第246章-适配留下动作没有复制海水.md'];
if (chaptersTwoHundredFortyFourToTwoHundredFortySix.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第244～246章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '纪潮生无水适配保留探底低重心、去除水阻浮力；江砚抓住无浮力髋部上升窗口3比2获胜，双方无黄伤；标准赛场结算后按旧战功字段混编，5人岗位全部错位。', links: [...new Set([...current.links, ...chaptersTwoHundredFortyFourToTwoHundredFortySix])], updatedAt: now() } as never, 'writer');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第247～249章'))) {
    await project.eventStore.append('task.upsert', { id: uid('task'), title: '续写第247～249章：五个岗位没有一个属于本人', description: '审计跨城混编角色的来源，让5名选手在不伪造专家与不泄露私传的前提下重组真实能力，并进入第一场模拟地窟任务。', level: 'chapter', status: 'now', kind: 'planning', assignee: 'architect', source: 'navigator', priority: 'critical', whyNow: '系统按旧归因把江砚分为指挥、纪潮生分为正面战斗、温照分为救援队长、矿城维护者分为设备使用者，第五人角色也不符。', known: ['五人事实描述已更正但混编字段未更新', '跨城任务需要战斗救援设备指挥特殊环境五类能力', '石小满等真实技术者不在该组'], missingDecisions: ['小组没有某类专家时能否换人，还是必须承认能力缺口？'], aiPreAnalysis: '第247章逐人来源卡与权限审计；第248章按错误角色开场暴露真实后果；第249章在任务中重组岗位并提交角色字段更正。', authorDecision: '不以换名让每类岗位看似齐全；能重组的按真实能力分配，缺少的岗位明确降级、租用标准设备或放弃对应路线，不能临时借用未授权技法。', agentWork: '', completionCriteria: ['5人真实能力与缺口清晰', '错误角色至少造成一次可追溯任务后果', '重组后团队仍接受同一任务目标和资源代价'], links: [chaptersTwoHundredFortyFourToTwoHundredFortySix[2]], dependencies: [], createdAt: now(), updatedAt: now() } as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'timeline', subject: '江砚对纪潮生', statement: '无水移动钢台上纪潮生探潮保留短触读取和假落点、失去水阻浮力；江砚利用板缝低鸣、六节回收与髋部上升窗口，以3比2、84秒获胜，双方无黄伤。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredFortyFourToTwoHundredFortySix[1], quote: '【江砚胜。】' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '介质技法适配边界', statement: '适配器只识别脚外缘探底、低重心和短接触，不复制水阻、浮力或额外回弹；动作离开介质后保留与失去部分分别展示。', status: 'author-confirmed', evidence: [{ filePath: chaptersTwoHundredFortyFourToTwoHundredFortySix[2], quote: '平台额外回弹为零。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '百城标准赛场结算', statement: '江砚2胜1负保持第四层上段，温照3胜进第二层，赵砺1胜2负进第五层，纪潮生1胜2负进第五层上段；层级不代表战功真实性。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredFortyFourToTwoHundredFortySix[2], quote: '标准赛场阶段结算。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '跨城混编岗位错位', statement: '跨城5人组按旧归因分战斗救援设备指挥特殊环境，江砚、纪潮生、温照与矿城选手等均被分到非真实岗位；下一任务为模拟地窟。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredFortyFourToTwoHundredFortySix[2], quote: '没有一个被分到自己真正做过的事。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, fact.status === 'author-confirmed' ? 'author' : 'system');
  await setPosition({ filePath: chaptersTwoHundredFortyFourToTwoHundredFortySix[2], stage: '第四卷跨城混编任务阶段', focus: '续写第247～249章：五个岗位没有一个属于本人' });
}
state = await project.state();
const chaptersTwoHundredFortySevenToTwoHundredFortyNine = ['manuscript/第四卷-百城天梯/第247章-五张来源卡拼不出一个救援员.md', 'manuscript/第四卷-百城天梯/第248章-错误岗位让第一副担架停在井口.md', 'manuscript/第四卷-百城天梯/第249章-缺一个岗位不能用五个名字填满.md'];
if (chaptersTwoHundredFortySevenToTwoHundredFortyNine.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第247～249章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '按来源卡重组温照主战、纪潮生环境、罗岐维护、巫岚协调、江砚接口并明确缺救援；旧权限使担架晚7分51秒，小组租受限模块以68分救回伤员、取2/3样本，战功摘要却仍写江砚领导。', links: [...new Set([...current.links, ...chaptersTwoHundredFortySevenToTwoHundredFortyNine])], updatedAt: now() } as never, 'architect');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第250～252章'))) {
    await project.eventStore.append('task.upsert', { id: uid('task'), title: '续写第250～252章：岗位改对以后战功仍然只给队长', description: '沿事件、任务、摘要和排行榜四层追踪江砚为何仍被写成领导者，建立无单一队长任务的团体归档结构，并处理更正对跨城积分和下一轮资格的影响。', level: 'chapter', status: 'now', kind: 'review', assignee: 'editor', source: 'navigator', priority: 'critical', whyNow: '五人岗位覆盖与实际事件均正确，任务摘要仍读取初始指挥字段把68分归到江砚领导。', known: ['原始事件保留5人实际岗位和系统权限延迟', '任务得分68且包含租赁/缺口成本', '混编任务需要一个leader_id生成标题'], missingDecisions: ['没有单一指挥时团队战功如何索引、谁拥有申诉与后续权限？'], aiPreAnalysis: '第250章定位四层中发生压缩的位置；第251章比较标准编制队长与临时协调任务；第252章更正摘要和积分归属，验证下一轮权限。', authorDecision: '不删除真实队长字段；有明确指挥权的任务保留。临时多中心任务以小组事件为主体，角色贡献与中止分别链接，申诉权由全组或受影响角色持有。', agentWork: '', completionCriteria: ['压缩发生层有当前证据', '更正不把5人简单平均成相同贡献', '积分、权限和历史摘要变化可追溯'], links: [chaptersTwoHundredFortySevenToTwoHundredFortyNine[2]], dependencies: [], createdAt: now(), updatedAt: now() } as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'timeline', subject: '跨城五人真实岗位', statement: '温照主战、纪潮生地形与压力、罗岐设备维护、巫岚协调与环境中止、江砚现场接口；无完整救援员，以受限标准模块补缺。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredFortySevenToTwoHundredFortyNine[0], quote: '仍然没有完整救援员。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '混编岗位权限延迟', statement: '正式场景仍加载旧角色，罗岐无法解担架运输锁、温照被要求确认未知伤情；覆盖审核使担架晚7分51秒出发，旧角色扣分后经复核移除。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredFortySevenToTwoHundredFortyNine[1], quote: '比他们晚了七分五十一秒出发。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '跨城地窟首次任务', statement: '小组租标准救援模块并承认缺口，以12分40秒、68分救回稳定伤员、取回2/3样本；全员无伤，损失1件中止器。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredFortySevenToTwoHundredFortyNine[2], quote: '任务得分六十八。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '混编任务队长归因', statement: '原始岗位与事件已更正，百城摘要仍写“指挥位江砚领导下完成地窟救援”，暴露任务团体结果向单一leader字段压缩。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredFortySevenToTwoHundredFortyNine[2], quote: '指挥位江砚领导下' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, fact.status === 'author-confirmed' ? 'author' : 'system');
  await setPosition({ filePath: chaptersTwoHundredFortySevenToTwoHundredFortyNine[2], stage: '第四卷团体战功归档阶段', focus: '续写第250～252章：岗位改对以后战功仍然只给队长' });
}
state = await project.state();
const chaptersTwoHundredFiftyToTwoHundredFiftyTwo = ['manuscript/第四卷-百城天梯/第250章-原始事件里没有一个总指挥.md', 'manuscript/第四卷-百城天梯/第251章-有队长的队伍不能因此删除队长.md', 'manuscript/第四卷-百城天梯/第252章-把一个名字改成小组编号.md'];
if (chaptersTwoHundredFiftyToTwoHundredFiftyTwo.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第250～252章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '定位任务强制leader_id、摘要模板和个人榜复制三层压缩；区分真实队长、协调者、多中心任务，将K-47改为小组主体、团队68分不再复制给江砚，并扫描312支混编队。', links: [...new Set([...current.links, ...chaptersTwoHundredFiftyToTwoHundredFiftyTwo])], updatedAt: now() } as never, 'editor');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第253～255章'))) {
    await project.eventStore.append('task.upsert', { id: uid('task'), title: '续写第253～255章：十九支卫星城队伍都有基地城队长', description: '抽样验证同一基地代报的19支卫星城队伍为何全部由基地城选手担任队长，区分真实指挥、代理上报字段与人为审核，并处理资格和权限后果。', level: 'chapter', status: 'now', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'critical', whyNow: '312支临时队扫描中出现高度集中模式；卫星城没有武册核心提交权限，可能把代理提交者自动写成队长。', known: ['24基地城拥有核心权限、76席需部分代理上报', '19支队均由同一基地选手为leader_id', '当前只能看公开战功、字段与更正'], missingDecisions: ['代理提交者是否在数据层被误当指挥，还是19队确有统一制度安排？'], aiPreAnalysis: '第253章选取不同任务与原始来源样本；第254章追踪代理提交字段和一支明确反例；第255章区分自动压缩与人工确认，修复当前权限并保留历史责任。', authorDecision: '不因19/19直接宣布基地夺功；至少比较另一基地代理、一个明确真实队长和一个卫星自主来源，使用公开/授权数据，不索取私密军用日志。', agentWork: '', completionCriteria: ['自动字段与人工决定分别有证据', '至少一支队伍更正产生实际排名或权限变化', '后续调查目标从泛化阴谋收敛到具体归档链'], links: [chaptersTwoHundredFiftyToTwoHundredFiftyTwo[2]], dependencies: [], createdAt: now(), updatedAt: now() } as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '团体任务四层压缩', statement: 'K-47原始事件与岗位正确，任务创建强制leader_id仍指江砚，摘要以队长作主语，个人榜再复制68分；压缩发生在任务及导出层。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredFiftyToTwoHundredFiftyTwo[0], quote: '第二层是任务记录。' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '百城团体任务结构', statement: '明确跨层指挥保留队长；协调者记录协调但无覆盖权；多中心任务以小组事件为主体。团队分不自动切给个人，动作责任分别链接。', status: 'author-confirmed', evidence: [{ filePath: chaptersTwoHundredFiftyToTwoHundredFiftyTwo[1], quote: '需要区分任务结构。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: 'K-47团体归档更正', statement: '摘要改为K-47受限地窟救援68分，江砚扣回错误个人68分下降192位，其他4人不平均补分；5人凭组事件共同保留下轮资格。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredFiftyToTwoHundredFiftyTwo[2], quote: '跨城小组编号是 K-47。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '卫星城代理队长模式', statement: '312支混编队中，某基地代报的19支卫星城队伍全部由基地城选手任leader_id；可能来自代理提交字段或制度安排，尚未确认夺功。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredFiftyToTwoHundredFiftyTwo[2], quote: '十九支全部相同' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, fact.status === 'author-confirmed' ? 'author' : 'system');
  await setPosition({ filePath: chaptersTwoHundredFiftyToTwoHundredFiftyTwo[2], stage: '第四卷卫星城代理归档阶段', focus: '续写第253～255章：十九支卫星城队伍都有基地城队长' });
}
state = await project.state();
const chaptersTwoHundredFiftyThreeToTwoHundredFiftyFive = ['manuscript/第四卷-百城天梯/第253章-十九个相同答案先拆成十九个问题.md', 'manuscript/第四卷-百城天梯/第254章-代理人负责收设备不负责指挥所有人.md', 'manuscript/第四卷-百城天梯/第255章-自动映射之后还有一次人工确认.md'];
if (chaptersTwoHundredFiftyThreeToTwoHundredFiftyFive.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第253～255章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '对玄陇19支代理队与镜原对照取证，分出4真实队长、11自动回填错误、4未知；L-12改小组主体并产生排名变化，定位代理字段回填、必填阻塞、审核来源不可见三条归档链。', links: [...new Set([...current.links, 'research/百城卫星队代理队长字段核验.md', ...chaptersTwoHundredFiftyThreeToTwoHundredFiftyFive])], updatedAt: now() } as never, 'researcher');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第256～258章'))) {
    await project.eventStore.append('task.upsert', { id: uid('task'), title: '续写第256～258章：团队总分只有一条进度条', description: '进入百城团体赛，处理总分条将三信标、两伤员、穴兽与岗位代价压成单一数字的问题，在不取消共同排名的情况下提供可行动的分项状态。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'critical', whyNow: 'K-47岗位已正确但救援缺口仍在，首场同时要求守信标、撤伤员与击退穴兽；单总分无法显示哪项正在越线。', known: ['团队分应继续决定团队阶段排名', '个人来源与团队分已分离', 'K-47可租受限救援模块但有真实成本'], missingDecisions: ['分项可见是否会让队伍只刷容易得分项，如何设置最低完成条件？'], aiPreAnalysis: '第256章拆总分来源与最低门槛；第257章首场中总分上升却伤员线恶化；第258章启用分项状态后完成或失败并结算真实取舍。', authorDecision: '保留一个赛前公开总分公式和团队排名；分项显示状态、贡献与红线，每个必要目标有最低门槛，不能用多打穴兽抵消伤员未撤。', agentWork: '', completionCriteria: ['总分与必要门槛同时可见', '单总分至少造成一次真实误导后果', '团队结果保留角色、设备和缺口成本'], links: [chaptersTwoHundredFiftyThreeToTwoHundredFiftyFive[2]], dependencies: [], createdAt: now(), updatedAt: now() } as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '卫星城代理队长字段链', statement: '卫星包经基地submitter、在场proxy_actor，再由旧导入器在leader为空时自动回填；审核页隐藏来源，人工“完整”确认使结果进入摘要与排名。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredFiftyThreeToTwoHundredFiftyFive[2], quote: '当前修复分三处。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '玄陇19支代理队核验', statement: '19队中4队公开证据支持真实基地队长，11队支持卫星协调或多中心却被自动回填，4队来源不足；不能批量反转。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredFiftyThreeToTwoHundredFiftyFive[0], quote: '十九个相同答案因此拆成十九个问题。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: 'L-12代理归档更正', statement: 'L-12改为小组主体，沈沧保留代理设备签收但扣回错误74个人分降209位，陆芥保留协调来源不补团队总分，成员共同保留下轮资格。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredFiftyThreeToTwoHundredFiftyFive[1], quote: '任务主体改为 L-12' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '百城团体赛单总分', statement: '团体赛首场同时包含3信标、2伤员和穴兽，当前只显示一条总分，无法说明哪个必要目标或岗位正在越线。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredFiftyThreeToTwoHundredFiftyFive[2], quote: '只有一条总分进度。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, fact.status === 'author-confirmed' ? 'author' : 'system');
  await setPosition({ filePath: chaptersTwoHundredFiftyThreeToTwoHundredFiftyFive[2], stage: '第四卷团体赛总分阶段', focus: '续写第256～258章：团队总分只有一条进度条' });
}
state = await project.state();
const chaptersTwoHundredFiftySixToTwoHundredFiftyEight = ['manuscript/第四卷-百城天梯/第256章-八十五分里可以没有第二名伤员.md', 'manuscript/第四卷-百城天梯/第257章-总分上涨时第二名伤员变成红色.md', 'manuscript/第四卷-百城天梯/第258章-总分下面有四条不能互相抵消的门槛.md'];
if (chaptersTwoHundredFiftySixToTwoHundredFiftyEight.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第256～258章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: 'K-47总分升至76时第二伤员转红、请求场外救援而任务未完成；总分保留排名用途，主屏新增信标、伤员、穴兽、人员4条不可抵消门槛及更新时间，历史3支误完成队伍修正。', links: [...new Set([...current.links, ...chaptersTwoHundredFiftySixToTwoHundredFiftyEight])], updatedAt: now() } as never, 'writer');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第259～261章'))) {
    await project.eventStore.append('task.upsert', { id: uid('task'), title: '续写第259～261章：租来的救援模块也要有人盯着', description: '让K-47为受限救援模块设置明确操作与趋势监看责任，在第二场团体任务中验证分项门槛、模块能力和救援缺口的真实协作。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'critical', whyNow: 'K-47首场未完成、总排名76，余下两场至少需一次70分完成；模块在途曾被误当成救援进展且无人持续监看第二伤员。', known: ['罗岐具设备维护但非医疗诊断', '巫岚协调不能同时盯全部模块细节', '江砚可接替一般现场接口', '分项主屏已上线'], missingDecisions: ['专职模块操作会让谁的原岗位出现新缺口？'], aiPreAnalysis: '第259章限定模块操作员权限与岗位交接；第260章第二场双伤员任务实战；第261章结算完成、资源代价和下一轮资格。', authorDecision: '罗岐可负责模块状态、锁销和登记程序，不诊断未知伤情；江砚承担一般设备接口，巫岚保留协调。出现超出模块范围的伤情仍中止，不因有专职人员扩大能力。', agentWork: '', completionCriteria: ['模块在途、固定、稳定、越线分别可见', '专职监看不制造新的无人设备红线', '第二场有明确完成或失败及团队排名后果'], links: [chaptersTwoHundredFiftySixToTwoHundredFiftyEight[2]], dependencies: [], createdAt: now(), updatedAt: now() } as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'timeline', subject: 'K-47团体赛首场', statement: 'K-47原始总分76并越参考线时第二伤员转红，标准模块超范围后请求场外救援，任务未完成；总排名跌至76，无补赛。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredFiftySixToTwoHundredFiftyEight[1], quote: '是未完成，原始得分七十六。' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '百城团体分项门槛', statement: '团队仍以赛前总分排名，但信标至少2、两伤员稳定撤出、穴兽不入撤离区、人员无未解红线4项均为完成门槛，类别间不可互相抵消。', status: 'author-confirmed', evidence: [{ filePath: chaptersTwoHundredFiftySixToTwoHundredFiftyEight[2], quote: '四条都满足' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '团队分项主屏', statement: '每项常驻显示当前值、最后更新、数据来源与剩余窗口；模块在途不等于伤员稳定，未知不显示绿色预计分。', status: 'author-confirmed', evidence: [{ filePath: chaptersTwoHundredFiftySixToTwoHundredFiftyEight[2], quote: '分项状态常驻主屏。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '救援模块专职监看', statement: 'K-47下一场拟由罗岐专职监看救援模块的在途、固定、趋势和越线，江砚接一般接口；模块仍不覆盖未知红线伤情。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredFiftySixToTwoHundredFiftyEight[2], quote: '租来的模块也需要一个明确的人' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, fact.status === 'author-confirmed' ? 'author' : 'system');
  await setPosition({ filePath: chaptersTwoHundredFiftySixToTwoHundredFiftyEight[2], stage: '第四卷团体救援模块阶段', focus: '续写第259～261章：租来的救援模块也要有人盯着' });
}
state = await project.state();
const chaptersTwoHundredFiftyNineToTwoHundredSixtyOne = ['manuscript/第四卷-百城天梯/第259章-模块操作员不是医疗员.md', 'manuscript/第四卷-百城天梯/第260章-两副担架不能共用一个完成状态.md', 'manuscript/第四卷-百城天梯/第261章-七十一分刚好够但不是高分.md'];
if (chaptersTwoHundredFiftyNineToTwoHundredSixtyOne.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第259～261章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '罗岐专职监看两套受限模块、江砚接一般接口；两伤员独立固定与越线，B锁扣岩屑中止重试，K-47四门槛完成、原始97扣资源与损失后71分，总排名升至59。', links: [...new Set([...current.links, ...chaptersTwoHundredFiftyNineToTwoHundredSixtyOne])], updatedAt: now() } as never, 'writer');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第262～264章'))) {
    await project.eventStore.append('task.upsert', { id: uid('task'), title: '续写第262～264章：第六十名和第六十一名共用一条撤离路', description: '完成团体阶段最后一场双队共享撤离路任务，建立担架冲突的现场优先依据，避免用晋级排名或先到先得把风险转给对手伤员。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'critical', whyNow: 'K-47暂列59，另一队61，前60晋级；共享路线一次只容一副担架，规则仅禁止攻击对方，未定义同时到达优先。', known: ['两队都有伤员门槛', 'K-47有两套模块操作经验', '公共人员门槛要求任何伤员不得因竞争越线'], missingDecisions: ['谁先走由伤情、剩余窗口、到达顺序还是抽签决定？'], aiPreAnalysis: '第262章赛前共享资源协议；第263章两担架同时到达并出现信息不对称；第264章作出可追溯让行或并行方案，结算团体阶段与复核库资格。', authorDecision: '优先依据伤员剩余安全窗口与搬运限制，不按队伍排名、总分或基地身份；信息不足时先停并交换最小必要状态，不能要求公开完整病历。', agentWork: '', completionCriteria: ['共享路线冲突有真实时间/积分代价', '两队伤员隐私与安全均保留', '团体阶段有明确排名、晋级与下一阶段权限'], links: [chaptersTwoHundredFiftyNineToTwoHundredSixtyOne[2]], dependencies: [], createdAt: now(), updatedAt: now() } as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '受限救援模块操作员', statement: '罗岐可监看锁销、在途、固定、趋势和越线并执行登记程序，不诊断未知伤情；超范围仍停止。江砚接一般接口，巫岚保留协调。', status: 'author-confirmed', evidence: [{ filePath: chaptersTwoHundredFiftyNineToTwoHundredSixtyOne[0], quote: '不等于他成为医疗员。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: 'K-47团体赛第二场', statement: 'K-47租2套模块分别完成两伤员固定越线，B锁扣岩屑停止重试；2信标与穴兽门槛完成，原始97扣24租赁、4设备、2时间后得71，全员无伤。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredFiftyNineToTwoHundredSixtyOne[2], quote: '最终七十一。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: 'K-47团体阶段排名', statement: '首场未完成、第二场71后，K-47总排名由76升至59；前60晋级，第三场仍可改变资格，团体分不复制到个人榜。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredFiftyNineToTwoHundredSixtyOne[2], quote: '从七十六升到五十九。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '双队共享撤离路', statement: '团体末场K-47与第61名队伍共用一次仅容1担架的撤离路；禁止攻击但未定义同时到达的伤员优先。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredFiftyNineToTwoHundredSixtyOne[2], quote: '一条只能过一副担架的路' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, fact.status === 'author-confirmed' ? 'author' : 'system');
  await setPosition({ filePath: chaptersTwoHundredFiftyNineToTwoHundredSixtyOne[2], stage: '第四卷团体阶段决胜场', focus: '续写第262～264章：第六十名和第六十一名共用一条撤离路' });
}
state = await project.state();
const chaptersTwoHundredSixtyTwoToTwoHundredSixtyFour = ['manuscript/第四卷-百城天梯/第262章-撤离路不认识第五十九名.md', 'manuscript/第四卷-百城天梯/第263章-两副担架同时到门口.md', 'manuscript/第四卷-百城天梯/第264章-让路少了八分没有少掉一名伤员.md'];
if (chaptersTwoHundredSixtyTwoToTwoHundredSixtyFour.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第262～264章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: 'K-47按最小伤员窗口让Q-18先过共享路，并用一次性授权协助处理卡轮；损失第三信标与8分后得74，最终第60晋级，Q-18第58，M-03以2分差第61淘汰。', links: [...new Set([...current.links, ...chaptersTwoHundredSixtyTwoToTwoHundredSixtyFour])], updatedAt: now() } as never, 'writer');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第265～267章'))) {
    await project.eventStore.append('task.upsert', { id: uid('task'), title: '续写第265～267章：复核库不保存没有得分的动作', description: '调查安全拒绝、未执行与放弃高分动作为什么只留自由备注，建立可验证的“可行动作未执行”事件而不把所有没出拳都包装成贡献。', level: 'chapter', status: 'now', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'high', whyNow: 'K-47获复核库第二层权限，只能索引计分、资格或责任动作；14名选手避开对手医疗标记的候选大多不可检索。', known: ['未计分战术前因可在连接后进入来源链', '安全中止已有独立事件', '自由备注没有稳定字段和权限'], missingDecisions: ['如何证明某动作当时确实可用且选手主动未执行，而不是事后自述？'], aiPreAnalysis: '第265章比较索引与自由备注缺失；第266章用一场公开录像和传感预条件复原可选动作；第267章定义预条件、替代动作、原因授权和后果四项事件。', authorDecision: '不为所有没出拳生成正面记录；只有当可用动作、风险信号、替代动作和时间关系可核验时建立候选，原因由本人授权，可不公开；事件不自动加分。', agentWork: '', completionCriteria: ['至少一项未执行动作可从独立证据复原', '隐私与事后美化边界明确', '新事件可被搜索但不篡改原胜负'], links: [chaptersTwoHundredSixtyTwoToTwoHundredSixtyFour[2]], dependencies: [], createdAt: now(), updatedAt: now() } as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '双队共享撤离路优先', statement: '共享路按伤员剩余窗口、搬运限制、到门时间排序，不用队伍排名或基地身份；仅交换窗口、暂停/转向、距离与设备状态。', status: 'author-confirmed', evidence: [{ filePath: chaptersTwoHundredSixtyTwoToTwoHundredSixtyFour[2], quote: '先按剩余安全窗口' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: 'K-47与Q-18共享路', statement: 'K-47先到1秒但给窗口更短的Q-18让路，并以最小授权协助卡轮；等待58秒失去第三信标，K-47得74、Q-18得76，两队伤员均稳定。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredSixtyTwoToTwoHundredSixtyFour[1], quote: 'K-47 等待累计五十八秒。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: 'K-47团体阶段结算', statement: 'K-47以未完成、71、74三场最终第60晋级复核库第二层；Q-18第58，M-03以2分差第61淘汰且复核无误。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredSixtyTwoToTwoHundredSixtyFour[2], quote: '最终第六十名' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '复核库未执行动作缺口', statement: '复核库第二层只索引计分、资格或责任动作；14名选手避开医疗风险的未执行候选多留自由备注，无法稳定检索。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredSixtyTwoToTwoHundredSixtyFour[2], quote: '未必保存一个人为什么没有出那一拳。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, fact.status === 'author-confirmed' ? 'author' : 'system');
  await setPosition({ filePath: chaptersTwoHundredSixtyTwoToTwoHundredSixtyFour[2], stage: '第四卷复核库未执行动作阶段', focus: '续写第265～267章：复核库不保存没有得分的动作' });
}
state = await project.state();
const chaptersTwoHundredSixtyFiveToTwoHundredSixtySeven = ['manuscript/第四卷-百城天梯/第265章-复核库只认识发生过的动作.md', 'manuscript/第四卷-百城天梯/第266章-她已经抬拳却没有打向黄色肩膀.md', 'manuscript/第四卷-百城天梯/第267章-没有出拳也不能自动写成善意.md'];
if (chaptersTwoHundredSixtyFiveToTwoHundredSixtySeven.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第265～267章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '定义动作预条件、可见风险、替代动作、时间后果四项未执行候选；以杜晚黄肩转拳复原客观链并获复合原因授权，7候选分为安全2、战术2、客观1、不足2，均不改分。', links: [...new Set([...current.links, 'research/百城未执行动作证据化预登记.md', ...chaptersTwoHundredSixtyFiveToTwoHundredSixtySeven])], updatedAt: now() } as never, 'researcher');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第268～270章'))) {
    await project.eventStore.append('task.upsert', { id: uid('task'), title: '续写第268～270章：没有得分的记录不能打开训练权限', description: '追踪安全复盘课程为何只接受正式中止、医疗岗位或设备责任，建立按相关风险与最小材料授权的训练入口，而不把记录可见自动变成奖励或全库权限。', level: 'chapter', status: 'now', kind: 'review', assignee: 'editor', source: 'navigator', priority: 'high', whyNow: '杜晚未执行事件已可搜索但无法进入直接相关的黄线应对课程，其他6条也没有后续用途。', known: ['未执行事件不加个人分', '原因可能私有或未知', '安全课程含其他选手黄线、场地和设备案例'], missingDecisions: ['课程权限按战功、岗位、风险经历还是申请需要授予？'], aiPreAnalysis: '第268章拆课程材料与现有授权来源；第269章为杜晚生成最小相关课程包并验证不泄露；第270章建立训练权限与战功权限分离，检查历史遗漏。', authorDecision: '不因一条记录开放完整安全库；按已发生风险类型、训练目标和材料授权生成最小课程包。访问不加分、不证明资格，完成课程也不反向美化原事件。', agentWork: '', completionCriteria: ['权限来源与材料范围可追溯', '至少一次最小课程实际使用', '课程、积分、岗位和复核库权限保持分离'], links: [chaptersTwoHundredSixtyFiveToTwoHundredSixtySeven[2]], dependencies: [], createdAt: now(), updatedAt: now() } as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '未执行动作证据事件', statement: '只有动作预条件、当时可见风险、实际替代动作、时间后果可核验时建立候选；本人原因可安全、战术、复合或未知，不自动写善意。', status: 'author-confirmed', evidence: [{ filePath: chaptersTwoHundredSixtyFiveToTwoHundredSixtySeven[2], quote: '新事件包含四个客观部分。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '杜晚黄肩转拳复核', statement: '杜晚在可执行肩部拳路与对手黄灯后0.18秒改打胸侧、最终2比3落败；本人授权风险与护具变化复合原因，原比分不改且不补分。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredSixtyFiveToTwoHundredSixtySeven[1], quote: '零点十八秒后，拳路改变。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '百城未执行候选复核', statement: '7条候选中2安全、2战术、1仅客观链、2证据不足；裁判备注可保留，不足项不升级，拒绝原因公开不记负面。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredSixtyFiveToTwoHundredSixtySeven[2], quote: '七条候选得到四种终态。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '安全课程权限缺口', statement: '未执行事件已可搜索但课程权限只认正式中止、医疗岗位或设备责任，杜晚等无法访问直接相关黄线应对训练；记录可见与用途脱节。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredSixtyFiveToTwoHundredSixtySeven[2], quote: '不能打开百城安全复盘课程。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, fact.status === 'author-confirmed' ? 'author' : 'system');
  await setPosition({ filePath: chaptersTwoHundredSixtyFiveToTwoHundredSixtySeven[2], stage: '第四卷训练权限分离阶段', focus: '续写第268～270章：没有得分的记录不能打开训练权限' });
}
state = await project.state();
const chaptersTwoHundredSixtyEightToTwoHundredSeventy = ['manuscript/第四卷-百城天梯/第268章-课程权限来自战功不是来自风险.md', 'manuscript/第四卷-百城天梯/第269章-最小课程包只打开四段.md', 'manuscript/第四卷-百城天梯/第270章-打开课程不等于获得岗位和战功.md'];
if (chaptersTwoHundredSixtyEightToTwoHundredSeventy.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第268～270章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '将记录可见、最小课程、岗位资格、比赛战功四层分离；杜晚获得4段限时黄线课程，3/4后补做通过，后台仅取授权材料，完成不加分、不授岗位、原2比3不结案。', links: [...new Set([...current.links, ...chaptersTwoHundredSixtyEightToTwoHundredSeventy])], updatedAt: now() } as never, 'editor');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第271～273章'))) {
    await project.eventStore.append('task.upsert', { id: uid('task'), title: '续写第271～273章：学会以后原来的二比三还在', description: '用杜晚下一场黄肩情境验证最小课程是否改善当前判断，并建立训练结果、新比赛证据与旧失败之间的链接，防止自动把历史问题标为已解决。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'high', whyNow: '杜晚完成课程但旧事件不应自动结案；下一场二比二时对手右肩再次亮黄，产生真实新证据。', known: ['黄色对手仍可合法攻击', '杜晚已能区分自身医疗、对手黄线和设备故障', '课程完成不加分或授岗位'], missingDecisions: ['新比赛做出不同选择后，旧事件应标解决、进步还是仅建立后续证据？'], aiPreAnalysis: '第271章完整新比赛选择与胜负；第272章复查旧事件和训练目标；第273章完成权限阶段结案并打开旧冠军档案。', authorDecision: '旧2比3作为历史不改变；新事件只证明在新场景做出可复核判断。可建立学习后续链，不用“问题已解决”覆盖旧动机、比分或不确定性。', agentWork: '', completionCriteria: ['新比赛有明确胜负与身体代价', '旧事件、课程、新证据三者均可追溯', '第四卷转入陆无咎旧冠军档案主线'], links: [chaptersTwoHundredSixtyEightToTwoHundredSeventy[2]], dependencies: [], createdAt: now(), updatedAt: now() } as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '百城最小训练包权限', statement: '按已发生风险类型、训练目标、材料授权生成限时最小包；后台不下载全库，撤回授权后停止展示，不因课程完成扩权。', status: 'author-confirmed', evidence: [{ filePath: chaptersTwoHundredSixtyEightToTwoHundredSeventy[1], quote: '最小课程包只打开四段' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '杜晚黄线最小课程', statement: '杜晚4段课程初次通过3段，误把对手黄色规则套到自身黄线；补做后通过。课程无比赛分、岗位或裁判标签，原2比3负场保留。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredSixtyEightToTwoHundredSeventy[1], quote: '通过三段，一段错误。' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '记录训练岗位战功分离', statement: '记录搜索、训练材料、岗位资格、比赛战功分四层，可互为证据但不自动升级；课程完成只写训练事实。', status: 'author-confirmed', evidence: [{ filePath: chaptersTwoHundredSixtyEightToTwoHundredSeventy[2], quote: '新权限结构分四层。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '杜晚课程后新比赛', statement: '杜晚下一场二比二时对手右肩再次亮黄；系统不得在新动作前把旧未执行事件与课程合并成问题已解决。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredSixtyEightToTwoHundredSeventy[2], quote: '对手右肩在第四拳后亮黄。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, fact.status === 'author-confirmed' ? 'author' : 'system');
  await setPosition({ filePath: chaptersTwoHundredSixtyEightToTwoHundredSeventy[2], stage: '第四卷训练后续证据阶段', focus: '续写第271～273章：学会以后原来的二比三还在' });
}
state = await project.state();
const chaptersTwoHundredSeventyOneToTwoHundredSeventyThree = ['manuscript/第四卷-百城天梯/第271章-第二次黄灯亮起她没有照着课程出拳.md', 'manuscript/第四卷-百城天梯/第272章-新的一分不能覆盖旧的零分.md', 'manuscript/第四卷-百城天梯/第273章-冠军档案里的每一拳都打中了.md'];
if (chaptersTwoHundredSeventyOneToTwoHundredSeventyThree.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第271～273章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '杜晚在新黄肩场景以肩线诱导、左掌得分3比2获胜；旧2比3、课程和新证据三者以学习后续链接并列，不自动结案。复核库转入陆无咎冠军档案，发现只索引有效拳及其自述7次失败。', links: [...new Set([...current.links, ...chaptersTwoHundredSeventyOneToTwoHundredSeventyThree])], updatedAt: now() } as never, 'writer');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第274～276章'))) {
    await project.eventStore.append('task.upsert', { id: uid('task'), title: '续写第274～276章：陆无咎的冠军档案没有一次失败', description: '以陆无咎指定的旧比赛为样本，从公开视频、旧计分、场地记录和本人授权说明中复原7次失败，区分格式缺失、自动剪辑与后续冠军叙事。', level: 'chapter', status: 'now', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'critical', whyNow: '冠军档案21胜、107次有效、零中止零无效，只索引得分动作；陆无咎称一场胜利中失败7次并给出编号。', known: ['旧赛制只存有效击中与胜负', '完整视频仍在但无未执行索引', '陆无咎现在的回忆只能作为一条来源'], missingDecisions: ['7次失败中哪些能由当年数据独立验证，哪些只能保留本人陈述？'], aiPreAnalysis: '第274章预登记七次失败的可证伪定义；第275章逐项对照录像与旧设备；第276章解释冠军摘要如何形成并决定是否进入公开档案。', authorDecision: '不把陆无咎自述直接写正典；录像、计分、场地与本人说明分别保留。格式没有字段不等于蓄意删除，后续自动剪辑与宣传摘要需单独追责。', agentWork: '', completionCriteria: ['至少3类失败获得不同证据等级', '冠军胜场与失败事件可同时成立', '下一阶段半决赛任务获得可用而非神化的旧档案'], links: [chaptersTwoHundredSeventyOneToTwoHundredSeventyThree[2]], dependencies: [], createdAt: now(), updatedAt: now() } as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'timeline', subject: '杜晚课程后比赛', statement: '杜晚在2比2、对手右肩黄线时以右拳肩线诱导护具锁定，再左掌命中胸侧，3比2、59秒获胜；双方无新增黄伤。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredSeventyOneToTwoHundredSeventyThree[0], quote: '【杜晚胜。】' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '学习后续事件链', statement: '旧事件、课程完成和新场景证据分别保留，以学习后续链接但不证明因果或自动结案；一次新胜不覆盖旧比分、动机和不确定性。', status: 'author-confirmed', evidence: [{ filePath: chaptersTwoHundredSeventyOneToTwoHundredSeventyThree[1], quote: '三者之间增加“学习后续证据”链接。' }], updatedAt: now() },
    { id: uid('fact'), category: 'knowledge', subject: '陆无咎百城冠军档案', statement: '23年前第三届冠军公开档案含21胜、107次有效、19代表动作，零中止零无效；旧赛制仅存有效与胜负，十年前自动剪辑未索引零分片段。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredSeventyOneToTwoHundredSeventyThree[2], quote: '档案共有二十一场。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '陆无咎冠军赛七次失败', statement: '陆无咎指定一场官方仅记5次有效与胜利的比赛，称其中失败7次；当前只有本人陈述，待公开视频、计分和场地数据复核。', status: 'agent-inferred', evidence: [{ filePath: chaptersTwoHundredSeventyOneToTwoHundredSeventyThree[2], quote: '失败了七次。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, fact.status === 'author-confirmed' ? 'author' : 'system');
  await setPosition({ filePath: chaptersTwoHundredSeventyOneToTwoHundredSeventyThree[2], stage: '第四卷旧冠军档案复原阶段', focus: '续写第274～276章：陆无咎的冠军档案没有一次失败' });
}
state = await project.state();
const chaptersTwoHundredSeventyFourToTwoHundredSeventySix = ['manuscript/第四卷-百城天梯/第274章-七次失败先不按他的记忆排序.md', 'manuscript/第四卷-百城天梯/第275章-有四次失败能被地板和比分证明.md', 'manuscript/第四卷-百城天梯/第276章-五次有效不能替七次失败作证.md'];
if (chaptersTwoHundredSeventyFourToTwoHundredSeventySix.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第274～276章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '预登记陆无咎旧半决赛7时间点，复原4项物理确认、2项说明支持、1项证据不足；保留5比4胜场与5次有效，定位旧字段、十年前自动剪辑、宣传概括三层如何形成无失败冠军。', links: [...new Set([...current.links, 'research/陆无咎冠军赛七次失败复核.md', ...chaptersTwoHundredSeventyFourToTwoHundredSeventySix])], updatedAt: now() } as never, 'researcher');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第277～279章'))) {
    await project.eventStore.append('task.upsert', { id: uid('task'), title: '续写第277～279章：半决赛只给冠军成功过的五条路', description: '审计由历届冠军有效动作拼成的最优路线，验证单段动作虽真实、转场与身体状态却可能从未共存，并建立合成路线标签与转场成本后参加半决赛。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'critical', whyNow: '半决赛生成器只读取陆无咎5次有效，要求3分钟连续完成；新增7次失败不参与，路线可能从未在真实比赛连续发生。', known: ['5个代表动作均有旧得分证据', '真实比赛在动作间有失步、误判、收拳和方案切换', '江砚可选择熟悉基础路线'], missingDecisions: ['合成路线如何保持可比难度又不冒充历史原样？'], aiPreAnalysis: '第277章验证动作间板面、站位与疲劳不连续；第278章影子复演暴露转场风险；第279章加入合成标签和公开转场条件，完成半决赛首轮。', authorDecision: '不删除冠军路线或为江砚定制；明确它是合成挑战，动作间加入统一转场与疲劳模型，选手可按公开规则选择路线，比分只评价本次完成。', agentWork: '', completionCriteria: ['至少一个不可能原样连续的转场得到证据', '江砚半决赛有明确结果和身体代价', '冠军原档案与合成挑战保持分离'], links: [chaptersTwoHundredSeventyFourToTwoHundredSeventySix[2]], dependencies: [], createdAt: now(), updatedAt: now() } as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'knowledge', subject: '陆无咎冠军赛七次失败', statement: '旧半决赛7项复核为4物理确认、2说明支持、1证据不足；官方5比4胜场和5次有效不变，失败事件与证据等级新增。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredSeventyFourToTwoHundredSeventySix[1], quote: '最终七项分成三类。' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '旧冠军无失败档案形成链', statement: '旧赛制只存有效/胜负，十年前自动转换只索引得分片段，宣传再将全胜概括为单人基础武道最优；无证据显示针对陆无咎专门删除。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredSeventyFourToTwoHundredSeventySix[2], quote: '归档链分三段。' }], updatedAt: now() },
    { id: uid('fact'), category: 'decision', subject: '陆无咎旧赛失败公开范围', statement: '陆无咎授权公开前6项；第7项仅保留本人称身体与呼吸未接上、证据不足，不公开具体伤处与呼吸法；谭九浦未授权内容保持未知。', status: 'author-confirmed', evidence: [{ filePath: chaptersTwoHundredSeventyFourToTwoHundredSeventySix[2], quote: '陆无咎授权公开前六项。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '冠军有效动作合成半决赛', statement: '半决赛生成器用陆无咎5次有效动作拼成3分钟最优路线，不读取7次失败与转场；单段真实但整条可能从未连续发生。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredSeventyFourToTwoHundredSeventySix[2], quote: '生成器仍只读取五次有效。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, fact.status === 'author-confirmed' ? 'author' : 'system');
  await setPosition({ filePath: chaptersTwoHundredSeventyFourToTwoHundredSeventySix[2], stage: '第四卷冠军路线半决赛阶段', focus: '续写第277～279章：半决赛只给冠军成功过的五条路' });
}
state = await project.state();
const chaptersTwoHundredSeventySevenToTwoHundredSeventyNine = ['manuscript/第四卷-百城天梯/第277章-五条路都是真的整条路却没有发生.md', 'manuscript/第四卷-百城天梯/第278章-影子复演在第三段把右肩送进黄色.md', 'manuscript/第四卷-百城天梯/第279章-合成路线要把动作之间的缝算进去.md'];
if (chaptersTwoHundredSeventySevenToTwoHundredSeventyNine.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第277～279章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '审计冠军五动作版本一存在9.2米/0.4秒转场与疲劳重置；影子复演江砚第三段右肩黄线中止。版本二标合成挑战、连续站位与疲劳，江砚79分最终第31晋级。', links: [...new Set([...current.links, 'research/陆无咎五动作合成路线审计.md', ...chaptersTwoHundredSeventySevenToTwoHundredSeventyNine])], updatedAt: now() } as never, 'writer');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第280～282章'))) {
    await project.eventStore.append('task.upsert', { id: uid('task'), title: '续写第280～282章：三十二条路只能留一条标准答案', description: '让晋级32人面对同一目标自由提交路线，比较速度、损耗、安全与可复现后，处理排行榜需要冠军与训练库不应只保留冠军路线的冲突。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'critical', whyNow: '冠军路线已改为真实合成挑战；下一轮准备从32条本届真实路线选唯一最优，可能再次把其他有效解折叠。', known: ['共同目标可保持一致', '不同路线可能在速度、设备、身体和风险上各有优势', '比赛必须产生胜负与冠军'], missingDecisions: ['如何既选出比赛最优，又不让训练库把其他适用路线标成错误？'], aiPreAnalysis: '第280章定义同一目标和多维成本；第281章完成江砚及至少两种外城路线实战；第282章产生比赛排名并建立非冠军有效路线的归档规则。', authorDecision: '比赛按赛前权重选唯一胜者；训练与复核库保存达到最低门槛的帕累托路线及适用条件，不让选手赛后选择权重改冠军，也不把未夺冠等于无效。', agentWork: '', completionCriteria: ['至少3条不同路线有真实结果与代价', '江砚有明确排名和身体状态', '唯一比赛胜者与多路线知识库同时成立'], links: [chaptersTwoHundredSeventySevenToTwoHundredSeventyNine[2]], dependencies: [], createdAt: now(), updatedAt: now() } as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '冠军有效动作合成挑战', statement: '历史单段有效可生成新挑战，但必须标合成、公开来源和转场；站位、场地与疲劳连续，不能逐段重置成冠军截图。', status: 'author-confirmed', evidence: [{ filePath: chaptersTwoHundredSeventySevenToTwoHundredSeventyNine[2], quote: '名称是：基础冠军五动作合成挑战。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '冠军路线版本一影子复演', statement: '版本一含9.2米仅0.4秒转场及1.2秒替代7秒恢复，42人中26人第三段前黄线、9人失承力、5人完成；江砚第三段右肩黄线中止。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredSeventySevenToTwoHundredSeventyNine[1], quote: '二十六人在第三段前出现转场黄线' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '江砚冠军合成路线半决赛', statement: '版本二连续转场和疲劳下江砚5段得65、转场14，总79，右肩未黄、右膝短时高负荷，42人最终第31晋级前32。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredSeventySevenToTwoHundredSeventyNine[2], quote: '最终七十九。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '半决赛唯一最优路线', statement: '晋级32人下一轮对同一目标自由提交路线，系统拟选唯一最优作为下届标准答案，可能把其他真实有效路线再次折叠。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredSeventySevenToTwoHundredSeventyNine[2], quote: '三十二条真实道路重新压成一条。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, fact.status === 'author-confirmed' ? 'author' : 'system');
  await setPosition({ filePath: chaptersTwoHundredSeventySevenToTwoHundredSeventyNine[2], stage: '第四卷多路线半决赛阶段', focus: '续写第280～282章：三十二条路只能留一条标准答案' });
}
state = await project.state();
const chaptersTwoHundredEightyToTwoHundredEightyTwo = ['manuscript/第四卷-百城天梯/第280章-同一个目标先把权重写在比赛以前.md', 'manuscript/第四卷-百城天梯/第281章-最快的路烧掉一只控制节点.md', 'manuscript/第四卷-百城天梯/第282章-冠军只有一个有效路线不止一条.md'];
if (chaptersTwoHundredEightyToTwoHundredEightyTwo.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第280～282章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '32人自由路线动力塔赛固定五项权重，25条完成；林见川88分唯一冠军，江砚84分第6、温照83分第9晋级。训练库另保留6条互不完全替代路线，不追加个人分。', links: [...new Set([...current.links, ...chaptersTwoHundredEightyToTwoHundredEightyTwo])], updatedAt: now() } as never, 'writer');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第283～285章'))) {
    await project.eventStore.append('task.upsert', { id: uid('task'), title: '续写第283～285章：三支失败队伍没有留下路线', description: '调查决赛原型地窟事件中一支返回队与三支失败队的路线、人员和任务终态，恢复失败路线中可用的信息，避免把唯一返回路径当成唯一正确。', level: 'chapter', status: 'now', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'critical', whyNow: '决赛进入真实废弃地窟外环；20年前旧事件只将冠军返回路线收入训练库，另3支队伍统一标失败。', known: ['决赛有安全监护且不是复刻死亡', '现行训练库仅有返回队路线', '多解集刚确认非冠军有效路线可保留'], missingDecisions: ['三支失败是人员未返、任务未完成、主动撤退还是记录缺失？'], aiPreAnalysis: '第283章拆三支队伍终态与档案缺口；第284章恢复至少一条失败路线的局部正确动作；第285章建立决赛可用风险图与候选路线，不泄露未授权旧队员信息。', authorDecision: '不因失败队伍标签推断全员死亡或路线无效；分别核对人员、任务、设备和撤退，公开材料不足保持未知。决赛只使用可验证地形与风险，不让选手扮演旧队。', agentWork: '', completionCriteria: ['三支失败终态至少分成两类', '一条非返回路线提供可用证据', '决赛安全边界和路线来源可见'], links: [chaptersTwoHundredEightyToTwoHundredEightyTwo[2]], dependencies: [], createdAt: now(), updatedAt: now() } as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '百城多路线比赛与知识分离', statement: '比赛按赛前速度、身体、设备、控制、复现权重选唯一胜者；训练库另保存达到门槛且互不完全替代的路线，不追加个人分。', status: 'author-confirmed', evidence: [{ filePath: chaptersTwoHundredEightyToTwoHundredEightyTwo[2], quote: '冠军只有林见川一个。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '动力塔自由路线半决赛', statement: '32条路线25完成；林见川88分冠军，纯冷却86，江砚84第6，温照83第9，均按固定五项权重；江砚无黄伤。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredEightyToTwoHundredEightyTwo[2], quote: '三十二条路线，二十五条完成。' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '动力塔六条多解集', statement: '训练库保留控制复现、最快、低身体/节点损失、江砚接口、双支架、环境泄压6条适用路线；其余完成路线保留版本化可替代状态。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredEightyToTwoHundredEightyTwo[2], quote: '最终六条路线进入多解集。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '旧地窟唯一返回路线', statement: '决赛原型为20年前废弃地窟外环撤离；现行训练库只保留1支冠军队返回路线，另3队统一标失败且路线未入库。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredEightyToTwoHundredEightyTwo[2], quote: '另外三支队伍的路线被标成失败' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, fact.status === 'author-confirmed' ? 'author' : 'system');
  await setPosition({ filePath: chaptersTwoHundredEightyToTwoHundredEightyTwo[2], stage: '第四卷旧地窟失败路线阶段', focus: '续写第283～285章：三支失败队伍没有留下路线' });
}
state = await project.state();
const chaptersTwoHundredEightyThreeToTwoHundredEightyFive = ['manuscript/第四卷-百城天梯/第283章-三个失败标记里有三种人员终态.md', 'manuscript/第四卷-百城天梯/第284章-主动撤退的队伍先发现了瓦斯.md', 'manuscript/第四卷-百城天梯/第285章-决赛不要求任何人重演旧队伍的伤亡.md'];
if (chaptersTwoHundredEightyThreeToTwoHundredEightyFive.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第283～285章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '拆分旧黑瓮4队：A全员完成、B全员主动撤退并留瓦斯图、C第5人6小时后获救、D三返一死一失踪；恢复东水撤退与维护井边界，决赛只用当前确认外环。', links: [...new Set([...current.links, 'research/黑瓮地窟四队路线终态核验.md', ...chaptersTwoHundredEightyThreeToTwoHundredEightyFive])], updatedAt: now() } as never, 'researcher');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第286～288章'))) {
    await project.eventStore.append('task.upsert', { id: uid('task'), title: '续写第286～288章：最快的冠军路线先被落石封住', description: '进入真实黑瓮外环决赛，处理中央脊线落石、东水瓦斯与当前样本变化，让江砚等选手用旧路线证据但服从现场状态，完成第一批路线结果。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'critical', whyNow: '决赛入口开启时中央脊线第三段再次落石转黄，冠军路线最短但已封一半；江砚预选中线与东水交界。', known: ['南裂未知段物理封锁', '北维护井窄段不可主动进入', '东水有实时瓦斯红线和B队撤退图', '至少2样本与人员回撤为完成门槛'], missingDecisions: ['中央黄线可否有限通过，何时改走东水撤退线？'], aiPreAnalysis: '第286章首批选手在落石后重新判路；第287章江砚中线/东水接口取样并处理瓦斯；第288章首批结果、路线代价和下一批调整。', authorDecision: '当前结构与气体优先旧路线；黄线可在独立承力证据和回撤完整时有限通过，转红立即退出。任何选手不得进入南裂或维护井窄段补分。', agentWork: '', completionCriteria: ['至少3名选手路线分化有真实结果', '江砚有样本、信标、身体和回撤终态', '旧路线用途与当前现场边界均可追溯'], links: [chaptersTwoHundredEightyThreeToTwoHundredEightyFive[2]], dependencies: [], createdAt: now(), updatedAt: now() } as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'timeline', subject: '黑瓮旧地窟四队终态', statement: '20年前A队5人按时带核心返回；B队5人因瓦斯主动撤退；C队4人按时、第5人6小时后获救；D队3返、1死、1失踪。三队统一失败标记不等于同一人员终态。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredEightyThreeToTwoHundredEightyFive[0], quote: '三种人员终态被一个失败字段覆盖。' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '黑瓮旧路线当前用途', statement: '中央脊线为已验证返回路；东水为高瓦斯撤退和气体图；北维护井只作信号/紧急出口且禁入窄段；南裂为证据终止封锁。', status: 'author-confirmed', evidence: [{ filePath: chaptersTwoHundredEightyThreeToTwoHundredEightyFive[1], quote: '四条旧路线因此获得四种用途。' }], updatedAt: now() },
    { id: uid('fact'), category: 'decision', subject: '黑瓮决赛旧档案边界', statement: '决赛只用当前扫描确认外环，独立回撤与场外监护；不复演旧队、遗体或失踪，截止后不追加探索，旧路线证据服从当前地形。', status: 'author-confirmed', evidence: [{ filePath: chaptersTwoHundredEightyThreeToTwoHundredEightyFive[2], quote: '不使用真实旧任务。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '黑瓮中央脊线落石', statement: '决赛入口开启时中央脊线第三段再次落石、结构转黄，冠军最短路线封住一半；江砚预选中线与东水交界。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredEightyThreeToTwoHundredEightyFive[2], quote: '最快的冠军路线先被封住一半。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, fact.status === 'author-confirmed' ? 'author' : 'system');
  await setPosition({ filePath: chaptersTwoHundredEightyThreeToTwoHundredEightyFive[2], stage: '第四卷黑瓮真实决赛阶段', focus: '续写第286～288章：最快的冠军路线先被落石封住' });
}
state = await project.state();
const chaptersTwoHundredEightySixToTwoHundredEightyEight = ['manuscript/第四卷-百城天梯/第286章-冠军路线封住以后三个人做了三种选择.md', 'manuscript/第四卷-百城天梯/第287章-瓦斯图只告诉他什么时候后退.md', 'manuscript/第四卷-百城天梯/第288章-第一批没有一条路线照着旧图走完.md'];
if (chaptersTwoHundredEightySixToTwoHundredEightyEight.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第286～288章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '中央脊线落石后温照有限穿黄、林见川走外圈、江砚走侧孔/东水交界；江砚取2样本1信标、137秒回撤得82。首批4人全完成但均未原样走旧路线，中央随后转红封锁。', links: [...new Set([...current.links, ...chaptersTwoHundredEightySixToTwoHundredEightyEight])], updatedAt: now() } as never, 'writer');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第289～291章'))) {
    await project.eventStore.append('task.upsert', { id: uid('task'), title: '续写第289～291章：后一批知道前一批多掉了一块石头', description: '完成黑瓮决赛后三批，验证安全地图跨批更新、战术信息隔离和预先公布的环境校正，产生唯一冠军与多路线决赛知识。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'critical', whyNow: '第一批后中央脊线由黄转红封锁，后12人无法使用温照入口；当前暂列温照87、林见川84、风塔83、江砚82。', known: ['安全红线和公共封锁必须跨批共享', '样本位置与对手战术不能共享', '环境校正规则已赛前公布'], missingDecisions: ['如何区分自然落石、前批行为和后批自身选择对结果的影响？'], aiPreAnalysis: '第289章第二/三批在新封锁下产生替代路线；第290章按事件来源执行环境校正；第291章最终冠军、江砚排名与多路线归档。', authorDecision: '校正只覆盖不可控公共环境差异，不补样本或替代选手动作；前批触发的设备损失由事件归因，安全信息共享但战术不共享。最终按冻结公式唯一排名。', agentWork: '', completionCriteria: ['至少一条后批新路线完成', '环境校正过程可复核', '决赛冠军与江砚终态明确并进入下一阶段归档链'], links: [chaptersTwoHundredEightySixToTwoHundredEightyEight[2]], dependencies: [], createdAt: now(), updatedAt: now() } as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'timeline', subject: '黑瓮决赛第一批', statement: '温照3样本1信标98秒87分，林见川2样本2信标158秒84，风塔2样本2信标171秒83，江砚2样本1信标137秒82；4人均完成且无黄伤。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredEightySixToTwoHundredEightyEight[2], quote: '第一批四人全部完成门槛。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '江砚黑瓮第一批路线', statement: '江砚走中央/东水侧孔，当前瓦斯趋红时放弃第三样本，取2样本、启动1信标、损1支撑片，137秒回撤，右膝64%负荷、肩绿，得82。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredEightySixToTwoHundredEightyEight[1], quote: '江砚完成。' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '真实地层跨批信息边界', statement: '落石、气体、公共封锁与安全设备损失跨批共享；样本位置和选手战术不共享。环境校正区分不可控状态与前批行为，不凭空补结果。', status: 'author-confirmed', evidence: [{ filePath: chaptersTwoHundredEightySixToTwoHundredEightyEight[2], quote: '安全状态必须传给后批，战术与样本位置不能。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '黑瓮冠军路线封锁', statement: '第一批后中央脊线窄口由1.2米缩至80厘米并转红物理封锁，后12名无法使用旧冠军入口，需按冻结环境校正规则完成决赛。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredEightySixToTwoHundredEightyEight[2], quote: '冠军入口不再可用。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, fact.status === 'author-confirmed' ? 'author' : 'system');
  await setPosition({ filePath: chaptersTwoHundredEightySixToTwoHundredEightyEight[2], stage: '第四卷黑瓮决赛结算阶段', focus: '续写第289～291章：后一批知道前一批多掉了一块石头' });
}
state = await project.state();
const chaptersTwoHundredEightyNineToTwoHundredNinetyOne = ['manuscript/第四卷-百城天梯/第289章-后一批知道多掉了一块石头.md', 'manuscript/第四卷-百城天梯/第290章-环境校正不能补给他一枚样本.md', 'manuscript/第四卷-百城天梯/第291章-冠军来自一条旧地图上没有的路.md'];
if (chaptersTwoHundredEightyNineToTwoHundredNinetyOne.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第289～291章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '后3批共享封锁不共享战术，按赛前环境公式只校正不可控时间基线；顾绫原始87加2得89，以当前上层横廊/外圈路线夺冠。江砚82第10，16人13完成。', links: [...new Set([...current.links, ...chaptersTwoHundredEightyNineToTwoHundredNinetyOne])], updatedAt: now() } as never, 'writer');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第292～294章'))) {
    await project.eventStore.append('task.upsert', { id: uid('task'), title: '续写第292～294章：冠军结果写进武册以后环境版本不见了', description: '在顾绫冠军归档包写入永久武册前，追踪原始87、环境+2、第三批结构和横廊适用条件为何从个人摘要消失，并修复带条件战功的展示与权限。', level: 'chapter', status: 'now', kind: 'review', assignee: 'editor', source: 'navigator', priority: 'critical', whyNow: '冠军总分89正确，但自动标题写“最优黑瓮路线”，个人摘要不含环境版本、原始分与当前横廊边界，容易永久化为无条件标准答案。', known: ['环境校正规则和结果已复核', '顾绫路线只适用第三批当前横廊/气体状态', '训练库保留多路线'], missingDecisions: ['个人战功摘要应携带多少环境条件，如何保持简洁可搜索？'], aiPreAnalysis: '第292章定位归档包字段丢失层；第293章比较历史带环境战功的展示；第294章写入条件摘要、原始/调整分和路线版本，验证排名与权限不变。', authorDecision: '不删除冠军标题或降低89分；摘要显示关键适用条件与来源入口，详细环境留展开层。搜索命中冠军，也能看见这是当前第三批路线而非永久黑瓮最优。', agentWork: '', completionCriteria: ['字段丢失位置有代码/事件等价证据', '当前冠军归档在永久写入前修正', '比分、冠军、训练路线和战功权限保持分离'], links: [chaptersTwoHundredEightyNineToTwoHundredNinetyOne[2]], dependencies: [], createdAt: now(), updatedAt: now() } as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '黑瓮跨批环境校正', statement: '只校正不可控公共入口距离与封锁时间基线，不补样本、信标、设备或身体结果；原始分、调整项和最终分并列，种子与环境来源可复核。', status: 'author-confirmed', evidence: [{ filePath: chaptersTwoHundredEightyNineToTwoHundredNinetyOne[1], quote: '环境校正表有三列。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '顾绫黑瓮决赛冠军', statement: '顾绫第三批走当前上层横廊/外圈，3样本2信标、162秒、身体61%、损1外膜，原始87加环境2得89夺冠；路线带当前结构版本。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredEightyNineToTwoHundredNinetyOne[2], quote: '顾绫八十九，黑瓮决赛冠军。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '江砚黑瓮决赛终态', statement: '江砚最终82分第10，无黄伤；2样本、1信标与东水红线撤退完整，个人与复核来源保留但无冠军资源。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredEightyNineToTwoHundredNinetyOne[2], quote: '江砚八十二，第十。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '冠军归档环境条件丢失', statement: '顾绫冠军归档标题与个人摘要只写89分和“最优黑瓮路线”，未带原始87、第三批环境+2和当前横廊适用条件，尚未写入永久武册。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredEightyNineToTwoHundredNinetyOne[2], quote: '环境版本字段却没有进入标题与个人战功摘要。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, fact.status === 'author-confirmed' ? 'author' : 'system');
  await setPosition({ filePath: chaptersTwoHundredEightyNineToTwoHundredNinetyOne[2], stage: '第四卷冠军战功归档阶段', focus: '续写第292～294章：冠军结果写进武册以后环境版本不见了' });
}
state = await project.state();
const chaptersTwoHundredNinetyTwoToTwoHundredNinetyFour = ['manuscript/第四卷-百城天梯/第292章-比赛包里有环境字段战功包里没有.md', 'manuscript/第四卷-百城天梯/第293章-把所有条件塞进标题也会让记录不可用.md', 'manuscript/第四卷-百城天梯/第294章-冠军写入武册时保留了环境版本.md'];
if (chaptersTwoHundredNinetyTwoToTwoHundredNinetyFour.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第292～294章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '定位比赛包完整、冠军摘要丢environment_version、路线名去版本、个人战功无条件三层；改为简洁标题+条件摘要+展开层，顾绫89分冠军与15人结果带环境版本跨终端写入。', links: [...new Set([...current.links, ...chaptersTwoHundredNinetyTwoToTwoHundredNinetyFour])], updatedAt: now() } as never, 'editor');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第295～297章'))) {
    await project.eventStore.append('task.upsert', { id: uid('task'), title: '续写第295～297章：摘要改了权限仍然只认最优路线', description: '追踪顾绫冠军权限中的“黑瓮最优路线评审者”旧标签，将路线作者、环境维护、使用审批和比赛荣誉分开，并迁移当前权限而不撤销冠军。', level: 'chapter', status: 'now', kind: 'review', assignee: 'editor', source: 'navigator', priority: 'critical', whyNow: '永久武册摘要已带H3条件，但权限映射仍读取旧摘要标签，自动让顾绫承担黑瓮路线默认确认与广泛评审。', known: ['顾绫是H3路线作者和本届冠军', '公共环境会变化且不由她维护', '权限来自冠军规则与旧route_best标签混合'], missingDecisions: ['作者可评审自己路线到什么范围，谁负责环境更新和最终开放？'], aiPreAnalysis: '第295章定位权限映射与实际可见范围；第296章拆作者、维护、审批、荣誉四类；第297章迁移顾绫及历史冠军权限并验证不泄露。', authorDecision: '冠军荣誉与比赛复核保留；路线作者可评审动作与授权，环境维护由场馆/地质责任人，使用审批按当前风险；任何一方不能单独代表全部。', agentWork: '', completionCriteria: ['旧权限消费者与字段来源有证据', '顾绫实际权限和责任边界更新', '历史迁移不批量删掉合理权限或重写冠军'], links: [chaptersTwoHundredNinetyTwoToTwoHundredNinetyFour[2]], dependencies: [], createdAt: now(), updatedAt: now() } as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '带环境战功三层展示', statement: '标题只写人/赛事/结果；条件摘要写批次、关键入口、原始/调整分与路线版本；展开层链接完整环境和授权。搜索索引条件但不泄露私传。', status: 'author-confirmed', evidence: [{ filePath: chaptersTwoHundredNinetyTwoToTwoHundredNinetyFour[1], quote: '第二版使用三层展示。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '顾绫冠军武册归档', statement: '永久记录写顾绫黑瓮冠军、第三批上层横廊/外圈、原始87+环境2=89、H3且非永久安全；跨当前、空缓存、离线终端一致。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredNinetyTwoToTwoHundredNinetyFour[2], quote: '顾绫冠军包进入永久武册。' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '冠军包消费者分离', statement: '排名只读最终分，训练推荐读路线版本/条件，战功复核读原始/调整/来源；同包不同字段，下游不得把排名摘要反写训练库。', status: 'author-confirmed', evidence: [{ filePath: chaptersTwoHundredNinetyTwoToTwoHundredNinetyFour[2], quote: '三种消费者使用同一冠军包的不同字段' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '冠军权限旧最优标签', statement: '顾绫摘要已修正，但冠军权限仍含“黑瓮最优路线评审者”，来自旧摘要route_best映射，可能把公共环境维护永久压给冠军。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredNinetyTwoToTwoHundredNinetyFour[2], quote: '下游权限还在按旧文字行动。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, fact.status === 'author-confirmed' ? 'author' : 'system');
  await setPosition({ filePath: chaptersTwoHundredNinetyTwoToTwoHundredNinetyFour[2], stage: '第四卷冠军权限迁移阶段', focus: '续写第295～297章：摘要改了权限仍然只认最优路线' });
}
state = await project.state();
const chaptersTwoHundredNinetyFiveToTwoHundredNinetySeven = ['manuscript/第四卷-百城天梯/第295章-一项最优标签给了她四种权限.md', 'manuscript/第四卷-百城天梯/第296章-写路线的人不负责维护整座地窟.md', 'manuscript/第四卷-百城天梯/第297章-冠军权限少了三项冠军没有少一分.md'];
if (chaptersTwoHundredNinetyFiveToTwoHundredNinetySeven.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第295～297章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '定位旧route_best同时授冠军、作者、环境、审批4权；拆为独立生命周期并迁移。顾绫89分冠军不变，回收3项过宽权，保冠军与本人路线；历史14冠军按独立岗位分流。', links: [...new Set([...current.links, ...chaptersTwoHundredNinetyFiveToTwoHundredNinetySeven])], updatedAt: now() } as never, 'editor');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第298～300章'))) {
    await project.eventStore.append('task.upsert', { id: uid('task'), title: '续写第298～300章：最后一道人工覆盖没有填写理由', description: '审计百城归档链末端的管理员紧急覆盖，复原最近一次无理由主标签修改的对象、权限与资格后果，建立追加式理由、范围、时限和复核。', level: 'chapter', status: 'now', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'critical', whyNow: '比赛、摘要、训练和权限已分离，管理员仍可在紧急争议中直接改归档主标签；最近一次使用缺少理由。', known: ['紧急覆盖用于先停止错误资格后果', '现有日志保留操作者、时间和前后值', '理由字段为空且旧值可能仍在历史'], missingDecisions: ['无理由是界面/超时缺陷、操作疏漏还是蓄意隐藏？'], aiPreAnalysis: '第298章定位最近覆盖与影响对象；第299章从通知、申诉和操作者说明复原原因；第300章修复追加式覆盖协议并检查历史异常。', authorDecision: '不因无理由直接定性篡改；保留前后值和操作者，理由不得覆盖旧记录。紧急生效可先执行，但必须有范围、自动到期和独立复核，逾期则降级而非永久隐藏。', agentWork: '', completionCriteria: ['最近无理由覆盖有可验证上下文', '至少一个资格/权限后果被修复', '第四卷明确战功可被改写的具体技术与人工链'], links: [chaptersTwoHundredNinetyFiveToTwoHundredNinetySeven[2]], dependencies: [], createdAt: now(), updatedAt: now() } as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '冠军路线四类权限分离', statement: '冠军荣誉、路线作者、环境维护、使用审批分离；作者评动作/授权，场馆维护当前环境，开放需环境+路线+使用者三项，任一方不能单独代表全部。', status: 'author-confirmed', evidence: [{ filePath: chaptersTwoHundredNinetyFiveToTwoHundredNinetySeven[1], quote: '旧角色拆成四项。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '顾绫冠军权限迁移', statement: '顾绫保留89分冠军、冠军档案和H3/H4本人路线评审，失去全黑瓮维护日志、其他路线评审、单独开放3类过宽权；跨新/离线终端验证。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredNinetyFiveToTwoHundredNinetySeven[2], quote: '个人分仍是八十九。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '历史冠军权限扫描', statement: '20届冠军中14人有route_best：6人另有真实维护岗位、5人仅路线作者、3人已离城仍留缓存；分别迁移，冠军荣誉不变。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredNinetyFiveToTwoHundredNinetySeven[2], quote: '过去二十届共二十名冠军' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '百城无理由人工覆盖', statement: '归档链末端允许管理员紧急修改主标签以停止错误资格后果；最近一次覆盖未填写理由，需区分疏漏、界面缺陷或蓄意隐藏。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredNinetyFiveToTwoHundredNinetySeven[2], quote: '最近一次使用，没有填写理由。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, fact.status === 'author-confirmed' ? 'author' : 'system');
  await setPosition({ filePath: chaptersTwoHundredNinetyFiveToTwoHundredNinetySeven[2], stage: '第四卷人工覆盖审计阶段', focus: '续写第298～300章：最后一道人工覆盖没有填写理由' });
}
state = await project.state();
const chaptersTwoHundredNinetyEightToThreeHundred = ['manuscript/第四卷-百城天梯/第298章-无理由覆盖把未完成改成待复核.md', 'manuscript/第四卷-百城天梯/第299章-正确结果也需要一条当时可见的理由.md', 'manuscript/第四卷-百城天梯/第300章-紧急覆盖只能暂时盖住不能改写.md'];
if (chaptersTwoHundredNinetyEightToThreeHundred.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第298～300章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '还原T-22无理由覆盖为人员牌/终端冲突下的正确资格保全，发现S-31遮罩逾期泄漏训练权；改为追加式临时遮罩、触发证据/范围/到期/独立复核，消费者订阅终态链。', links: [...new Set([...current.links, ...chaptersTwoHundredNinetyEightToThreeHundred])], updatedAt: now() } as never, 'researcher');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第301～303章'))) {
    await project.eventStore.append('task.upsert', { id: uid('task'), title: '续写第301～303章：失踪三个月的人获得深层通行', description: '核验黑瓮D队失踪者三个月后的“地窟王庭候选接触者”深层通行记录，区分授权生成、凭据实际使用、身份映射与存活结论。', level: 'chapter', status: 'now', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'critical', whyNow: '完整归档链导出包发现失踪者关联的一次深层通行，为第五卷入口；错误身份映射或他人使用同样可能。', known: ['D队1死1失踪，失踪终态未解决', '通行发生在失踪3个月后', '记录无姓名，只写候选接触者'], missingDecisions: ['授权给谁、谁实际通过、身份为何关联失踪者？'], aiPreAnalysis: '第301章拆授权、凭据、闸门与身份四层；第302章核验实际通行物理回执；第303章形成存活/凭据转移/代理接触候选并决定第五卷调查边界。', authorDecision: '不以通行记录宣布失踪者存活；至少需要独立物理使用与身份来源。隐去旧队员姓名，先公开结构结论，地窟深层坐标不进入普通档案。', agentWork: '', completionCriteria: ['通行记录真实性和使用终态清晰', '至少两种候选保留或排除有证据', '第四卷结案前形成第五卷可执行调查而非悬念句'], links: [chaptersTwoHundredNinetyEightToThreeHundred[2], 'planning/第四卷章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() } as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '百城紧急人工覆盖协议', statement: '紧急覆盖改为追加临时遮罩，需触发证据、范围、临时状态、自动到期、独立复核；不改原标签，消费者订阅原终态/遮罩/正式更正链。', status: 'author-confirmed', evidence: [{ filePath: chaptersTwoHundredNinetyEightToThreeHundred[2], quote: '新的紧急覆盖不修改主标签。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: 'T-22无理由覆盖', statement: 'T-22第五成员终端晚6分钟、人员牌已退出，管理员许弦无理由暂缓淘汰；独立回执证实全员按时返回，最终第58晋级，结果保持。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredNinetyEightToThreeHundred[0], quote: '独立复核将 T-22 改为完成。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: 'S-31覆盖逾期权限泄漏', statement: 'S-31医疗红线复核确认未完成，但无到期“可训练待复核”遮罩存续1年，使用2次高层训练；当前回收，不追责队伍，候补可申请补时。', status: 'text-explicit', evidence: [{ filePath: chaptersTwoHundredNinetyEightToThreeHundred[1], quote: '一条临时覆盖活了一年。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '黑瓮失踪者深层通行', statement: 'D队官方失踪者关联身份在失踪3个月后获一次“地窟王庭候选接触者”深层通行记录；无姓名，尚不能证明本人存活或使用。', status: 'agent-inferred', evidence: [{ filePath: chaptersTwoHundredNinetyEightToThreeHundred[2], quote: '地窟王庭候选接触者。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, fact.status === 'author-confirmed' ? 'author' : 'system');
  await setPosition({ filePath: chaptersTwoHundredNinetyEightToThreeHundred[2], stage: '第四卷失踪者通行核验阶段', focus: '续写第301～303章：失踪三个月的人获得深层通行' });
}
state = await project.state();
const chaptersThreeHundredOneToThreeHundredThree = ['manuscript/第四卷-百城天梯/第301章-授权生成不等于有人通过.md', 'manuscript/第四卷-百城天梯/第302章-闸门真的开过却不能证明是谁.md', 'manuscript/第四卷-百城天梯/第303章-存活只是三个候选里的一个.md'];
if (chaptersThreeHundredOneToThreeHundredThree.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第301～303章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '拆授权、设备凭据、双闸物理回执、后续身份映射4层；确认未知单人真实向深层连续通行，无法确认D-5本人。保留本人存活、装备转移、匿名代理3候选并形成正式第五卷调查边界。', links: [...new Set([...current.links, 'research/黑瓮失踪者深层通行核验.md', ...chaptersThreeHundredOneToThreeHundredThree])], updatedAt: now() } as never, 'researcher');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第304～306章'))) {
    await project.eventStore.append('task.upsert', { id: uid('task'), title: '续写第304～306章：只读导出不能把深层坐标带回临渊', description: '为D-5通行结构生成可迁移、可验证但不含深层坐标的只读证据包，检查导出、Git差异、克隆恢复与受限来源句柄。', level: 'chapter', status: 'now', kind: 'release', assignee: 'release-assistant', source: 'navigator', priority: 'critical', whyNow: '百城允许导出结构证据，但原附件把回执与受限坐标放在一起；直接入Git会永久泄露，纯摘抄又失去校验来源。', known: ['临渊只需通行真实性、候选和未知项申请正式调查', '坐标与签发密钥不得迁移', '小说项目依赖Git跨电脑恢复'], missingDecisions: ['如何让接收方验证证据来自受限原件而无法反推坐标？'], aiPreAnalysis: '第304章定义脱敏包、来源句柄和校验；第305章在全新克隆与历史扫描中验证无坐标；第306章临渊导入、恢复任务与权限边界。', authorDecision: '包内保存结构化结论、时间区间、物理源校验和不可反推来源句柄；受限系统保留原件映射。导出前扫描正文、事件、Git差异和历史，发现泄露则拒绝生成。', agentWork: '', completionCriteria: ['全新环境能验证包完整和来源状态', '仓库及历史无受限坐标/密钥', '临渊恢复第五卷调查任务但无深层直接通行权'], links: [chaptersThreeHundredOneToThreeHundredThree[2]], dependencies: [], createdAt: now(), updatedAt: now() } as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'knowledge', subject: 'D-5深层通行物理证据', statement: 'D-5遗失设备关联凭据在事故3个月后被使用；双机械锁、72-89公斤压力、热迹和内门回执证明未知单人真实通过，11小时后同链进入更深内闸。', status: 'text-explicit', evidence: [{ filePath: chaptersThreeHundredOneToThreeHundredThree[1], quote: '确实有人通过。' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '候选接触身份映射', statement: '深层candidate_contact_id绑定设备凭据、不保证个人；后续武册用设备标签回查D-5事故身份，制造“D-5通行”关联，不能单独证明身份。', status: 'text-explicit', evidence: [{ filePath: chaptersThreeHundredOneToThreeHundredThree[1], quote: '后续武册回查才制造“D-5 通行”' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: 'D-5通行三候选', statement: '保留D-5本人存活使用、装备转移他人使用、深层匿名代理3候选；纯无人伪记录被物理证据削弱，授权未使用被排除。', status: 'agent-inferred', evidence: [{ filePath: chaptersThreeHundredOneToThreeHundredThree[2], quote: '三个候选分别保留。' }], updatedAt: now() },
    { id: uid('fact'), category: 'decision', subject: 'D-5证据导出边界', statement: '对外只迁移通行结构、证据等级与未知项；深层坐标、签发密钥、姓名家属留在百城受限系统，第五卷不得据此私自下井。', status: 'author-confirmed', evidence: [{ filePath: chaptersThreeHundredOneToThreeHundredThree[2], quote: '不等于他有权把看到的一切带走。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, fact.status === 'author-confirmed' ? 'author' : 'system');
  await setPosition({ filePath: chaptersThreeHundredOneToThreeHundredThree[2], stage: '第四卷受限证据导出阶段', focus: '续写第304～306章：只读导出不能把深层坐标带回临渊' });
}
state = await project.state();
const chaptersThreeHundredFourToThreeHundredSix = ['manuscript/第四卷-百城天梯/第304章-第一版脱敏包把坐标藏进了校验值.md', 'manuscript/第四卷-百城天梯/第305章-全新克隆只能验证不能还原位置.md', 'manuscript/第四卷-百城天梯/第306章-临渊恢复了调查任务没有恢复通行权.md'];
if (chaptersThreeHundredFourToThreeHundredSix.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第304～306章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '第一版坐标直哈希/文件名泄露被仓库外拦截；生成随机不可枚举来源句柄的脱敏包，在空缓存全新克隆验证完整/来源状态但不可还原位置。临渊恢复调查任务，无凭据与通行权。', links: [...new Set([...current.links, 'research/D5深层通行脱敏证据包.md', ...chaptersThreeHundredFourToThreeHundredSix])], updatedAt: now() } as never, 'release-assistant');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第307～309章'))) {
    await project.eventStore.append('task.upsert', { id: uid('task'), title: '续写第307～309章：百城天梯结束以后先把输掉的记录带回家', description: '完成第四卷比赛、战功、人员、权限、研究与个人武道结案，保留冠军和淘汰结果，同时将可迁移证据与第五卷正式地窟申请接续。', level: 'volume', status: 'now', kind: 'review', assignee: 'editor', source: 'navigator', priority: 'high', whyNow: '第四卷剩3章；顾绫冠军、江砚第10、战功归档链与D-5脱敏证据包均已完成，需切换第五卷而非继续扩展百城问题。', known: ['第四卷计划81章', '顾绫89冠军、江砚82第10', '江砚当前淬皮后段', '正式地窟机构要求外环训练、队伍岗位、撤退方案'], missingDecisions: ['江砚是否达到淬皮巅峰及第五卷首个队伍缺口？'], aiPreAnalysis: '第307章百城人员与结果结案；第308章江砚身体多次复测与权限；第309章第四卷目标完成，建立第五卷《地窟王庭》目标和310～312章任务。', authorDecision: '结案先写冠军、淘汰、伤情、纠错与未知，不把第四卷写成江砚调查成功；境界仍按总量、承载、控制复现，不因第10名或知识贡献奖励。第五卷从正式队伍与撤退边界开始。', agentWork: '', completionCriteria: ['第四卷81章与约9.5万字目标达成', '卷目标/任务切换第五卷且状态可恢复', '江砚身体与第五卷权限有独立证据'], links: [chaptersThreeHundredFourToThreeHundredSix[2], 'planning/第四卷章纲.md', 'planning/百万字总纲.md'], dependencies: [], createdAt: now(), updatedAt: now() } as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '受限证据脱敏导出', statement: '证据包保存结构结论、自身校验和随机不可枚举来源句柄；坐标、闸号、密钥、姓名家属留受限系统。导出前扫描正文、事件、文件名、元数据、diff与历史。', status: 'author-confirmed', evidence: [{ filePath: chaptersThreeHundredFourToThreeHundredSix[0], quote: '第二版使用随机来源句柄。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: 'D-5证据包跨电脑验证', statement: '全新克隆无登录/缓存时可验证包自身完整，联网只返回原件存在/校验/授权状态；扫描无坐标、密钥、绝对路径，修改测试能识别本地篡改。', status: 'text-explicit', evidence: [{ filePath: chaptersThreeHundredFourToThreeHundredSix[1], quote: '全新克隆验证成功。' }], updatedAt: now() },
    { id: uid('fact'), category: 'decision', subject: '临渊D-5调查恢复边界', statement: '临渊恢复已知/未知/边界/下一步和正式申请任务，但无深层地图、登录令牌、直接通行或私自下井权；研究包不自动升级正典。', status: 'author-confirmed', evidence: [{ filePath: chaptersThreeHundredFourToThreeHundredSix[2], quote: '没有“前往坐标”按钮。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '第五卷正式地窟申请', statement: '现行地窟机构确认仍有三层分离的候选接触协议；申请进入需完成外环训练、队伍岗位与撤退方案，第五卷从有边界的申请开始。', status: 'text-explicit', evidence: [{ filePath: chaptersThreeHundredFourToThreeHundredSix[2], quote: '从一项有边界的申请开始。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, fact.status === 'author-confirmed' ? 'author' : 'system');
  await setPosition({ filePath: chaptersThreeHundredFourToThreeHundredSix[2], stage: '第四卷结案与第五卷准备', focus: '续写第307～309章：百城天梯结束以后先把输掉的记录带回家' });
}
state = await project.state();
const chaptersThreeHundredSevenToThreeHundredNine = ['manuscript/第四卷-百城天梯/第307章-带回家的不只是第十名.md', 'manuscript/第四卷-百城天梯/第308章-淬皮巅峰不是第十名的奖励.md', 'manuscript/第四卷-百城天梯/第309章-第五卷先缺一个有权让所有人空手回来的岗位.md'];
if (chaptersThreeHundredSevenToThreeHundredNine.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第307～309章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '完成百城冠军/淘汰/伤情/纠错/未知结案；江砚经总量、承载、疲劳控制与延时复测，以1.71～1.72达到淬皮巅峰；建立7人地窟申请与阿轨独立撤退岗位。', links: [...new Set([...current.links, 'planning/第四卷结案.md', ...chaptersThreeHundredSevenToThreeHundredNine])], updatedAt: now() } as never, 'editor');
  state = await project.state();
  for (const goal of state.goals.filter((item) => item.status === 'active' && item.title.includes('第四卷《百城天梯》'))) await project.eventStore.append('goal.upsert', { ...goal, status: 'completed', updatedAt: now() } as never, 'author');
  state = await project.state();
  if (!state.goals.some((item) => item.title.includes('第五卷《地窟王庭》'))) {
    await project.eventStore.append('goal.upsert', { id: uid('goal'), level: 'volume', title: '完成第五卷《地窟王庭》并确认地窟阵营并非单一族群', description: '约77章：通过正式地窟队伍深入外环与中层，调查候选接触协议、匿名凭据和不同地窟阵营，不把星兽或王庭写成单一敌人。', authority: 'author-pinned', status: 'active', target: 'manuscript/第五卷-地窟王庭', updatedAt: now() } as never, 'author');
  }
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第310～312章'))) {
    await project.eventStore.append('task.upsert', { id: uid('task'), title: '续写第310～312章：撤退员有权让所有人空手回来', description: '在正式地窟外环训练中验证阿轨独立撤退岗位：人员、设备、候选凭据和路线分层，红线撤退不可被队长、研究目标或战功覆盖。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'critical', whyNow: '第五卷申请只批准外环训练，队伍角色已建立但撤退权尚未实战；禁止追踪D-5与旧深层闸。', known: ['江砚淬皮巅峰但无深层通行权', '阿轨负责位置、最慢返回与撤退线', '红线撤退只能扩大不能取消', '样本和接触机会默认可放弃'], missingDecisions: ['黄线新证据如何复核，红线误判如何事后处理而不现场反令？'], aiPreAnalysis: '第310章队伍和撤退协议空演练；第311章外环断线、设备与候选信号同时出现；第312章阿轨命令空手撤退并复盘误判/成功边界。', authorDecision: '不通过真正深层危险证明撤退权；外环使用可控但有真实资源损失的训练，人员不扮演旧失踪者。撤退导致任务失败也保留，不能因全员回来自动判满分。', agentWork: '', completionCriteria: ['至少一次撤退命令与队长目标冲突', '全员位置和最终回返可核验', '设备/样本/凭据损失与任务终态分别记录'], links: [chaptersThreeHundredSevenToThreeHundredNine[2], 'planning/第四卷结案.md', 'planning/百万字总纲.md'], dependencies: [], createdAt: now(), updatedAt: now() } as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'timeline', subject: '第四卷百城天梯结案', statement: '第四卷81章完成：顾绫89黑瓮冠军，江砚82第10；战功上报至人工覆盖链完成复核，D-5身份未知，脱敏证据包带回临渊。', status: 'author-confirmed', evidence: [{ filePath: chaptersThreeHundredSevenToThreeHundredNine[2], quote: '第四卷目标完成。' }], updatedAt: now() },
    { id: uid('fact'), category: 'character', subject: '江砚', statement: '百城后经3日及延时复测，静息气血1.71～1.72，总量、四类承载、疲劳控制与复现通过，达到淬皮巅峰；无自动深层/指挥权限。', status: 'text-explicit', evidence: [{ filePath: chaptersThreeHundredSevenToThreeHundredNine[1], quote: '江砚，淬皮巅峰。' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '地窟独立撤退岗位', statement: '阿轨维护全员位置、最慢返回、设备放弃与结构余量；黄线可接新证据复核，红线撤退立即生效，只能扩大不能取消，事后审计误判。', status: 'author-confirmed', evidence: [{ filePath: chaptersThreeHundredSevenToThreeHundredNine[2], quote: '红线阶段，撤退命令立即生效' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '第五卷地窟王庭', statement: '第五卷目标为正式地窟队调查候选接触协议与不同地窟阵营，不把找到D-5或星兽单一敌人作为唯一答案；首阶段仅外环训练。', status: 'author-confirmed', evidence: [{ filePath: chaptersThreeHundredSevenToThreeHundredNine[2], quote: '第五卷《地窟王庭》目标激活' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, fact.status === 'author-confirmed' ? 'author' : 'system');
  await setPosition({ filePath: chaptersThreeHundredSevenToThreeHundredNine[2], stage: '第五卷《地窟王庭》启动', focus: '续写第310～312章：撤退员有权让所有人空手回来' });
}
state = await project.state();
const chaptersThreeHundredTenToThreeHundredTwelve = ['manuscript/第五卷-地窟王庭/第310章-撤退员先记每个人最慢需要多久.md', 'manuscript/第五卷-地窟王庭/第311章-候选信号亮在回撤线相反的方向.md', 'manuscript/第五卷-地窟王庭/第312章-空手回来不是任务完成.md'];
if (chaptersThreeHundredTenToThreeHundredTwelve.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第310～312章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '建立7人最慢返回/设备放弃/路线三线；外环断线时模拟候选齿片信号与回撤方向冲突，阿轨在双结构红线下命令全撤。七人6分31秒返回、零伤，样本/接触/设备任务未完成。', links: [...new Set([...current.links, 'planning/第五卷章纲.md', ...chaptersThreeHundredTenToThreeHundredTwelve])], updatedAt: now() } as never, 'writer');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第313～315章'))) {
    await project.eventStore.append('task.upsert', { id: uid('task'), title: '续写第313～315章：空手回来以后谁负责失败的任务', description: '拆分外环训练的样本、设备、候选接触、战斗、人员和撤退终态，处理责任、赔偿与改进，防止所有任务损失归到下令撤退的阿轨。', level: 'chapter', status: 'now', kind: 'review', assignee: 'editor', source: 'navigator', priority: 'high', whyNow: '撤退岗位已通过一次真实冲突，训练目标未完成且损失4件设备；若只看任务失败，撤退员会承担不属于他的目标与设备责任。', known: ['阿轨红线命令符合当前双证据和最慢人员', '任务失败与撤退成功已分离', '设备/候选/战斗各有岗位与预先放弃条件'], missingDecisions: ['哪些损失属于预案成本、技术故障、岗位判断和场馆训练设计？'], aiPreAnalysis: '第313章建立多终态责任矩阵；第314章处理设备赔偿和候选未完成；第315章复查撤退误判保护与下一次外环任务。', authorDecision: '不按最终下令者集中归责；责任绑定可控动作、已知信息与权限。合理撤退不赔任务分，故意隐瞒或越权另证；任务失败仍影响正式进入进度。', agentWork: '', completionCriteria: ['至少4类损失责任分别可追溯', '阿轨岗位保护和事后审计同时存在', '下一轮外环目标在不削弱撤退权下可执行'], links: [chaptersThreeHundredTenToThreeHundredTwelve[2]], dependencies: [], createdAt: now(), updatedAt: now() } as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '地窟撤退三线', statement: '撤退员维护人员位置/最后可信/最慢返回、设备回收/封存/放弃、当前/备用路线与结构余量；目标样本不进入人员优先级。', status: 'author-confirmed', evidence: [{ filePath: chaptersThreeHundredTenToThreeHundredTwelve[0], quote: '阿轨维护三条线。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '第五卷外环撤退训练', statement: '断线中合法模拟候选信号在回撤反方向出现；阿轨黄色阶段允许分段前进再停止，双结构红线后全撤，七人6分31秒返回，主线23秒后训练塌落，零伤。', status: 'text-explicit', evidence: [{ filePath: chaptersThreeHundredTenToThreeHundredTwelve[2], quote: '全员七人位置确认。' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '地窟红线消息静默', statement: '红线撤退后接触、样本和积分消息转灰静默，仅人员求救、路线变化与扩大撤退即时；未完成证据在出口可回放，不删除。', status: 'author-confirmed', evidence: [{ filePath: chaptersThreeHundredTenToThreeHundredTwelve[2], quote: '红线后，任务消息应转历史摘要。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '撤退后任务责任', statement: '本轮外环任务未完成，损失2压力盒、1接触读头、1震源，无样本/接触/击退分；撤退岗位完成。需按可控动作和权限分责，不集中给阿轨。', status: 'text-explicit', evidence: [{ filePath: chaptersThreeHundredTenToThreeHundredTwelve[2], quote: '空手回来不是任务完成。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, fact.status === 'author-confirmed' ? 'author' : 'system');
  await setPosition({ filePath: chaptersThreeHundredTenToThreeHundredTwelve[2], stage: '第五卷撤退责任阶段', focus: '续写第313～315章：空手回来以后谁负责失败的任务' });
}
state = await project.state();
const chaptersThreeHundredThirteenToThreeHundredFifteen = ['manuscript/第五卷-地窟王庭/第313章-一条失败不能分给最后下令的人.md', 'manuscript/第五卷-地窟王庭/第314章-设备赔偿不能从撤退员工资里扣.md', 'manuscript/第五卷-地窟王庭/第315章-合理误判也要接受事后复盘.md'];
if (chaptersThreeHundredThirteenToThreeHundredFifteen.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第313～315章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '按可控动作/当时信息/权限/预案拆分样本、设备、接触、战斗、人员、撤退责任；四设备分别归技术故障/预案/协议耗材/战术耗材，阿轨保险不扣。独立盲复核确认撤退合理且保留高任务代价。', links: [...new Set([...current.links, ...chaptersThreeHundredThirteenToThreeHundredFifteen])], updatedAt: now() } as never, 'editor');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第316～318章'))) {
    await project.eventStore.append('task.upsert', { id: uid('task'), title: '续写第316～318章：第二次撤退没有等到红线', description: '在无候选接触的外环第二训中，让阿轨依据不断缩短但未越红的最坏返回窗口主动黄线撤退，验证合理保守决策在没有后续塌落证明时如何结案。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'high', whyNow: '第一场红线撤退已通过，第二场需验证撤退员不是等红才动；任务要求1样本1信标全员返，结构可能始终只黄。', known: ['黄色允许新证据与重新判断', '红线不可取消', '任务/人员/设备/撤退责任已分离'], missingDecisions: ['黄色提前撤退的合理阈值和误判补救如何定义？'], aiPreAnalysis: '第316章完成样本/信标并观察窗口缩短；第317章阿轨在未红时撤退、承担真实分数代价；第318章无塌落结果下按当时证据盲复核。', authorDecision: '不设置固定“剩余几秒必撤”覆盖地形；比较最慢返回上限、趋势误差、备线状态和失联风险。合理黄线撤退可失败任务但不自动免责，事后无事故也不倒推错误。', agentWork: '', completionCriteria: ['黄线撤退与任务目标发生真实冲突', '全员返回且后续无塌落', '合理性从当时证据而非结果得出'], links: [chaptersThreeHundredThirteenToThreeHundredFifteen[2]], dependencies: [], createdAt: now(), updatedAt: now() } as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '地窟任务多终态责任矩阵', statement: '样本、设备、接触、战斗、人员、撤退分别按可控动作、当时信息、权限和预先损失授权归责；不集中给最后下令者，也不平均。', status: 'author-confirmed', evidence: [{ filePath: chaptersThreeHundredThirteenToThreeHundredFifteen[0], quote: 'Editor建立责任矩阵。' }], updatedAt: now() },
    { id: uid('fact'), category: 'decision', subject: '地窟设备赔偿分类', statement: '预案耗材由任务预算、技术故障按设备/使用、合理安全放弃由保险、违规疏忽按事件复核；比赛扣资源分不等于个人赔偿。', status: 'author-confirmed', evidence: [{ filePath: chaptersThreeHundredThirteenToThreeHundredFifteen[1], quote: '赔偿规则更新为四类。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '阿轨首次撤退复核', statement: '冻结未来塌落后3名独立撤退员2人全撤、1人建议分层；双结构红线、最慢人员上限与现行规则支持阿轨命令，结论为合理且任务代价高。', status: 'text-explicit', evidence: [{ filePath: chaptersThreeHundredThirteenToThreeHundredFifteen[2], quote: '符合当前规则、证据充分、任务代价高。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '外环黄色提前撤退', statement: '第二训无候选信号，目标1样本1信标；结构可能始终只黄，阿轨需依据缩短的最坏返回窗口在未红时决定撤退，事后无塌落不倒推。', status: 'text-explicit', evidence: [{ filePath: chaptersThreeHundredThirteenToThreeHundredFifteen[2], quote: '第二次撤退没有等到红线。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, fact.status === 'author-confirmed' ? 'author' : 'system');
  await setPosition({ filePath: chaptersThreeHundredThirteenToThreeHundredFifteen[2], stage: '第五卷黄色撤退阶段', focus: '续写第316～318章：第二次撤退没有等到红线' });
}
state = await project.state();
const chaptersThreeHundredSixteenToThreeHundredEighteen = ['manuscript/第五卷-地窟王庭/第316章-黄色窗口每次都比上一次短.md', 'manuscript/第五卷-地窟王庭/第317章-信标停在百分之八十一.md', 'manuscript/第五卷-地窟王庭/第318章-二十分钟后没有塌落.md'];
if (chaptersThreeHundredSixteenToThreeHundredEighteen.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第316～318章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '第二训取回样本后，信标确认至81%时结构仍黄但最坏窗口连续缩短、趋势误差扩大且备线短时失联；阿轨开放异议后主动黄线撤退。七人4分42秒返回，信标未完成，20分钟后无塌落。盲复核判为合理选择区间，同时指出维持命令的比较式记录不完整。', links: [...new Set([...current.links, 'planning/第五卷章纲.md', ...chaptersThreeHundredSixteenToThreeHundredEighteen])], updatedAt: now() } as never, 'writer');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第319～321章'))) {
    await project.eventStore.append('task.upsert', { id: uid('task'), title: '续写第319～321章：安全规则不变，第三场要把任务做完', description: '在保留红线、黄色主动撤退和同一三项目标的前提下，预登记等待与分层方案，完成样本、信标和全员返回，取得正式外环通行。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'critical', whyNow: '撤退岗位已通过红线与黄线两种情境，但队伍连续两场未完成训练任务；正式任务包必须等三项目标同场成立才能解封。', known: ['第二训样本成功、信标81%、全员返回但任务未通过', '黄色命令可接受新证据，不等于任意掉头', '分层撤退目前只可影子测试', '不降低红线或任务完成门槛'], missingDecisions: ['如何让信标完成时间、结构相关性和岗位交接在任务前可验证，而不是事后放宽？'], aiPreAnalysis: '第319章预登记等待、撤退与分层影子方案；第320章在真实身体负荷和结构更新中完成样本/信标；第321章全员返回、三项目标通过并打开正式外环任务包。', authorDecision: '不为通过训练制造全绿场景，也不让撤退员保证不撤；只改善信息和预先岗位。正式结果必须在既有安全规则下产生。', agentWork: '', completionCriteria: ['样本、信标、全员返回同场成立', '至少一次黄色新证据得到显式重算', '正式任务包只在训练通过后解封'], links: [chaptersThreeHundredSixteenToThreeHundredEighteen[2], 'planning/第五卷章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() } as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '地窟黄色主动撤退', statement: '黄色撤退不是自动红线：仍接受新证据并逐次重算；比较最慢返回上限、结构趋势与误差、备线/失联、任务剩余及岗位，不能用固定秒数或最快人员覆盖。', status: 'author-confirmed', evidence: [{ filePath: chaptersThreeHundredSixteenToThreeHundredEighteen[2], quote: '不设置固定剩余秒数。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '第五卷外环第二训', statement: '队伍取回1枚样本；信标至81%时阿轨在结构始终仅黄的情况下主动撤退，七人4分42秒返回，信标未完成，20分钟后无塌落，任务未通过。', status: 'text-explicit', evidence: [{ filePath: chaptersThreeHundredSixteenToThreeHundredEighteen[1], quote: '训练任务，未通过。' }], updatedAt: now() },
    { id: uid('fact'), category: 'decision', subject: '黄色撤退事后复核', statement: '后来无塌落只证明本次未来较安全，不倒推当时已知；本次撤退在合理选择区间，但维持命令的第二次比较记录不完整，任务代价与缺陷均保留。', status: 'author-confirmed', evidence: [{ filePath: chaptersThreeHundredSixteenToThreeHundredEighteen[2], quote: '黄色主动撤退处于合理选择区间' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '外环第三训与正式任务包', statement: '队伍撤退岗位已通过两种情境，但仍须在同一套安全规则下让样本、信标、全员返回三项目标同场成立，之后才能取得正式外环通行并解封任务包。', status: 'text-explicit', evidence: [{ filePath: chaptersThreeHundredSixteenToThreeHundredEighteen[2], quote: '只有第三场通过，封条才会打开。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, fact.status === 'author-confirmed' ? 'author' : 'system');
  await setPosition({ filePath: chaptersThreeHundredSixteenToThreeHundredEighteen[2], stage: '第五卷外环任务能力阶段', focus: '续写第319～321章：安全规则不变，第三场要把任务做完' });
}
state = await project.state();
const chaptersThreeHundredNineteenToThreeHundredTwentyOne = ['manuscript/第五卷-地窟王庭/第319章-把九十秒放在取样以前.md', 'manuscript/第五卷-地窟王庭/第320章-黄色以后还有四十四秒证据.md', 'manuscript/第五卷-地窟王庭/第321章-通行牌在七个人回来以后生成.md'];
if (chaptersThreeHundredNineteenToThreeHundredTwentyOne.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第319～321章'));
  if (current && current.status !== 'completed') await project.eventStore.append('task.upsert', { ...current, status: 'completed', agentWork: '第三训保持原红黄线、90秒信标和样本/信标/全员返回三门槛，通过入场先设信标与取样并行。黄色阶段两次逐项重算，江砚左腕绿伤后返回上限增加12秒；信标完成、样本有效，单点红色时撤退扩大并分线，七人5分11秒全部返回，训练通过后才生成单任务外环通行牌。', links: [...new Set([...current.links, 'planning/第五卷章纲.md', ...chaptersThreeHundredNineteenToThreeHundredTwentyOne])], updatedAt: now() } as never, 'writer');
  state = await project.state();
  if (!state.tasks.some((item) => item.title.includes('第322～324章'))) {
    await project.eventStore.append('task.upsert', { id: uid('task'), title: '续写第322～324章：正式任务包没有写王庭两个字', description: '执行外环五号废槽回程节点复位：拆分人员身份、设备身份与匿名凭据权限，取回无主维修片并处理只认识设备型号的候选信号。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'critical', whyNow: '七人完成第三训并取得仅限一项任务的正式外环通行；首次真实接触必须先证明协议边界能工作，而不是追逐D-5或王庭标签。', known: ['通行范围仅外环且单任务有效', '目标为维修片、回程节点和全员返回', '候选接触只读设备身份层', '不得发送人员身份或追踪来源'], missingDecisions: ['候选信号读取设备型号后，应交换何种最小信息而不把设备响应解释成智慧个体？'], aiPreAnalysis: '第322章拆任务权限与三层接触结构；第323章进入五号废槽完成节点和维修片物理核验；第324章设备型号被读取，执行或拒绝最小交换并保留来源未知。', authorDecision: '不因卷名、维修片形制或合法候选信号预设王庭/D-5；只交换任务允许的低强度设备状态，人员和来源保持不可见。', agentWork: '', completionCriteria: ['人员/设备/匿名凭据三层权限可追溯', '维修片与节点有独立物理结果', '候选接触发生但不自动确认身份、族群或智慧'], links: [chaptersThreeHundredNineteenToThreeHundredTwentyOne[2], 'planning/第五卷章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() } as never, 'navigator');
  }
  const laterFacts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '外环训练任务与安全同时通过', statement: '训练可通过任务并行、预登记岗位和逐次证据重算提高完成率；不得降低红黄线、90秒信标或样本/信标/全员返回门槛，也不得为通过挑全绿场景。', status: 'author-confirmed', evidence: [{ filePath: chaptersThreeHundredNineteenToThreeHundredTwentyOne[0], quote: '九十秒与取样并行。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '第五卷外环第三训', statement: '第三训信标先设、取样并行；两次黄色重算后信标90秒完成、样本有效，江砚左腕绿伤令上限加12秒，单点红色时撤退扩大，七人5分11秒返回并通过。', status: 'text-explicit', evidence: [{ filePath: chaptersThreeHundredNineteenToThreeHundredTwentyOne[2], quote: '三项目标第一次在同一场成立。' }], updatedAt: now() },
    { id: uid('fact'), category: 'decision', subject: '正式外环通行边界', statement: '正式通行牌在七人全部返回后生成，仅限外环、单项任务有效；不得读深层坐标、借D-5设备凭据或把候选接触改成人员追踪。', status: 'author-confirmed', evidence: [{ filePath: chaptersThreeHundredNineteenToThreeHundredTwentyOne[2], quote: '范围只有外环。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '外环五号废槽正式任务', statement: '首次正式任务为复位回程节点、取回无主维修片、全员返回；候选接触仅只读设备身份层，不发送人员身份、不追踪来源，任务包无王庭或D-5标签。', status: 'text-explicit', evidence: [{ filePath: chaptersThreeHundredNineteenToThreeHundredTwentyOne[2], quote: '任务包里没有“王庭”两个字。' }], updatedAt: now() }
  ];
  for (const fact of laterFacts) if (!(await project.state()).facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) await project.eventStore.append('fact.upsert', fact as never, fact.status === 'author-confirmed' ? 'author' : 'system');
  await setPosition({ filePath: chaptersThreeHundredNineteenToThreeHundredTwentyOne[2], stage: '第五卷首次正式外环任务', focus: '续写第322～324章：正式任务包没有写王庭两个字' });
}
await import('./advance-fifth-volume.js');
await import('./advance-sixth-volume.js');
const updated = await project.state();
process.stdout.write(`${JSON.stringify({ stats: updated.manuscriptStats, currentTask: updated.continueCard.focus, facts: updated.facts.length }, null, 2)}\n`);
