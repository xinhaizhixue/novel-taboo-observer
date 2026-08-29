import path from 'node:path';
import { ProjectService } from '../electron/main/project.js';
import type { CreativeTask, StoryFact } from '../src/shared/types.js';
import { now, uid } from '../electron/main/utils.js';

const root = path.resolve(process.argv[2] || path.join(import.meta.dirname, '..', 'workspaces', 'wan-jie-zhu-shen'));
const project = new ProjectService('million-word-sixth-volume');
const state = await project.open(root);
const taskTitles = new Set(state.tasks.map((task) => task.title));
const factKeys = new Set(state.facts.map((fact) => `${fact.subject}\u0000${fact.statement}`));

type ProjectPosition = { filePath: string; stage: string; focus: string };
const positionKey = (position: ProjectPosition) => JSON.stringify([position.filePath, position.stage, position.focus]);
const knownPositions = new Set(
  (await project.eventStore.all())
    .filter((event) => event.type === 'project.position')
    .map((event) => positionKey(event.payload as unknown as ProjectPosition))
);

async function appendTask(task: CreativeTask, source: 'writer' | 'navigator' | 'agent') {
  await project.eventStore.append('task.upsert', task as never, source);
  taskTitles.add(task.title);
}

async function appendFact(fact: StoryFact) {
  const key = `${fact.subject}\u0000${fact.statement}`;
  if (factKeys.has(key)) return;
  await project.eventStore.append('fact.upsert', fact as never, fact.status === 'author-confirmed' ? 'author' : 'system');
  factKeys.add(key);
}

async function setPosition(position: ProjectPosition) {
  const key = positionKey(position);
  if (knownPositions.has(key)) return;
  await project.eventStore.append('project.position', position as never, 'system');
  knownPositions.add(key);
}

const chaptersThreeHundredEightySevenToThreeHundredEightyNine = ['manuscript/第六卷-人间武库/第387章-第三槽偏了三点四度就不再加力.md', 'manuscript/第六卷-人间武库/第388章-六道槽没有一道属于传力通道.md', 'manuscript/第六卷-人间武库/第389章-三件都没有修好评审仍然通过.md'];
if (chaptersThreeHundredEightySevenToThreeHundredEightyNine.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第387～389章'));
  if (current && current.status !== 'completed') await appendTask({ ...current, status: 'completed', agentWork: '外层三件形成不同终态：断潮枪铭牌900斤/摘要1200斤但第三槽无载偏角3.4/3.3度且私库量规越线，停止加载；折岳盾六槽为外甲锁槽、中央脊传力，排除L6；回风索刃六槽无载通过但额定未知，只准无载。测试杆在50%时第五槽卸载残余为前一级2.3倍，停在40%临时上限。揭盲确认三项均正确，评审通过不等于修好。', links: [...new Set([...current.links, 'research/人间武库外层三件退役武具核验.md', ...chaptersThreeHundredEightySevenToThreeHundredEightyNine])], updatedAt: now() }, 'researcher');
  if (!taskTitles.has('整理人间武库外层三件退役武具核验')) {
    const timestamp = now();
    await appendTask({ id: uid('task'), title: '整理人间武库外层三件退役武具核验', description: '记录三件武具来源分层、接口真值、物理停止、测试杆流程、私库揭盲和新增权限。', level: 'session', status: 'completed', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'high', whyNow: '外层评审必须证明候选方法能产生停止/范围外/承载未知三种答案，而不是用修好数量自证。', known: ['断潮枪停止加载', '折岳盾非L6', '回风索刃承载未知', '三项揭盲均未推翻'], missingDecisions: [], aiPreAnalysis: '分离公开铭牌、维护摘要、当前物理和私库揭盲，记录每件独立终态。', authorDecision: '评审通过只增加来源卡与9件抽样权限，不发布候选包、不读取私库算法正文。', agentWork: '已生成research/人间武库外层三件退役武具核验.md。', completionCriteria: ['三件终态可复算', '停止条件未被演示目标覆盖', '新增权限不越级'], links: ['research/人间武库外层三件退役武具核验.md', chaptersThreeHundredEightySevenToThreeHundredEightyNine[2]], dependencies: [], createdAt: timestamp, updatedAt: timestamp }, 'agent');
  }
  if (!taskTitles.has('续写第390～392章：一千二百斤只在已经拆掉的加强环上成立')) {
    await appendTask({ id: uid('task'), title: '续写第390～392章：一千二百斤只在已经拆掉的加强环上成立', description: '读取断潮枪1200斤摘要来源卡，复原潮脊三号加强环装配/测试条件，追查拆除后历史额定沿用，并建立版本化额定来源卡与9件抽样方案。', level: 'chapter', status: 'now', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'critical', whyNow: '1200斤在特定加强环上可能正确，却被摘要继承到已拆装配；问题从单件停止升级为版本化知识如何失真。', known: ['900斤是41年前出厂铭牌', '1200斤是14年前加强环短时证明载荷', '当前加强环已拆', '第三槽偏角发生在拆除后'], missingDecisions: ['摘要继承由谁/哪条规则触发？', '来源卡最小必须携哪些适用条件？', '9件抽样如何覆盖目录风险？'], aiPreAnalysis: '第390章复原来源卡；第391章查状态继承；第392章定义新来源卡并分层抽样。', authorDecision: '历史数值可保留但必须携装配、版本、时长与当前物理门禁；不以错误摘要证明门阀算法整体造假。', agentWork: '', completionCriteria: ['1200斤适用条件可追溯', '错误发生层与算法本身分开', '9件抽样不是方便样本'], links: [chaptersThreeHundredEightySevenToThreeHundredEightyNine[2], 'research/人间武库外层三件退役武具核验.md', 'planning/第六卷章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() }, 'navigator');
  }
  const facts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '武具来源冲突与当前物理门禁', statement: '公开铭牌、维护摘要和当前物理分别回答出厂宣称、历史维护结果与眼前状态，不设永久高低；当前异常经复核且摘要缺适用条件时，物理停止门禁优先。', status: 'author-confirmed', evidence: [{ filePath: chaptersThreeHundredEightySevenToThreeHundredEightyNine[0], quote: '第三槽偏了三点四度就不再加力' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '人间武库外层三件退役武具评审', statement: '断潮枪因第三槽偏角停止；折岳盾六槽为外甲锁槽而非L6；回风索刃无载L6通过但承载未知。三件0修复，5项预登记评审门槛通过。', status: 'text-explicit', evidence: [{ filePath: chaptersThreeHundredEightySevenToThreeHundredEightyNine[2], quote: '三件都没有修好评审仍然通过' }], updatedAt: now() },
    { id: uid('fact'), category: 'decision', subject: '外层评审新增权限', statement: '仅可读断潮枪1200斤摘要来源卡、再抽9件外层武具并邀请普通修械师盲测；不读私库算法正文、不批量发布、不进入深层、不试载额定未知原件。', status: 'author-confirmed', evidence: [{ filePath: chaptersThreeHundredEightySevenToThreeHundredEightyNine[2], quote: '通过只开放下一权限。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '断潮枪1200斤版本继承', statement: '1200斤属于潮脊三号加强环装配后的短时证明载荷；当前加强环已拆，摘要仍沿用，第三槽偏角在拆除后出现。需追查适用版本和状态继承。', status: 'text-explicit', evidence: [{ filePath: chaptersThreeHundredEightySevenToThreeHundredEightyNine[2], quote: '它只在一块已经拆掉的加强环上成立。' }], updatedAt: now() }
  ];
  for (const fact of facts) await appendFact(fact);
  await setPosition({ filePath: chaptersThreeHundredEightySevenToThreeHundredEightyNine[2], stage: '第六卷断潮枪额定版本来源阶段', focus: '续写第390～392章：一千二百斤只在已经拆掉的加强环上成立' });
}

const chaptersThreeHundredNinetyToThreeHundredNinetyTwo = ['manuscript/第六卷-人间武库/第390章-一千二百斤只测了三次三息.md', 'manuscript/第六卷-人间武库/第391章-拆掉加强环没有拆掉额定值.md', 'manuscript/第六卷-人间武库/第392章-额定值必须带着让它失效的条件.md'];
if (chaptersThreeHundredNinetyToThreeHundredNinetyTwo.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第390～392章'));
  if (current && current.status !== 'completed') await appendTask({ ...current, status: 'completed', agentWork: '复原断潮枪两种历史数值：900斤为R2枪身连续60息/5次变向额定；1200斤为潮脊三号在位、双向台座+承力碗、单方向、3次各3息的证明载荷。拆环后attachment.removed未触发根级current_load重算，复检工单/修改权限又断链，摘要迁移删除自由备注与来源。建立含主体/附件/方向/峰值/时长/支撑/材料/残余/原件/范围/失效触发的11字段来源卡，并锁定9件分层样本。', links: [...new Set([...current.links, 'research/断潮枪1200斤版本继承与额定来源卡.md', ...chaptersThreeHundredNinetyToThreeHundredNinetyTwo])], updatedAt: now() }, 'researcher');
  if (!taskTitles.has('整理断潮枪1200斤版本继承与额定来源卡')) {
    const timestamp = now();
    await appendTask({ id: uid('task'), title: '整理断潮枪1200斤版本继承与额定来源卡', description: '记录900/1200/当前未知三层、拆环继承错误链、11字段来源卡、失效触发和9件分层抽样。', level: 'session', status: 'completed', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'high', whyNow: '若把正确历史证明载荷简单标成假数，会掩盖真正发生在附件事件、工单权限和摘要迁移的系统问题。', known: ['1200在原装配下真实通过', 'removed未触发额定失效', '当前额定未知', '9件按三类风险锁定'], missingDecisions: [], aiPreAnalysis: '分离试验有效性、当前适用性和信息可见性，再定义能自动失效但不删除历史的来源卡。', authorDecision: '不以错误摘要证明门阀算法整体造假；历史值保留条件，当前异常先阻断。', agentWork: '已生成research/断潮枪1200斤版本继承与额定来源卡.md。', completionCriteria: ['适用条件可复算', '错误发生层和责任分开', '抽样在结果前锁定'], links: ['research/断潮枪1200斤版本继承与额定来源卡.md', chaptersThreeHundredNinetyToThreeHundredNinetyTwo[2]], dependencies: [], createdAt: timestamp, updatedAt: timestamp }, 'agent');
  }
  if (!taskTitles.has('续写第393～395章：九件抽样里四件额定来自已经不存在的装配')) {
    await appendTask({ id: uid('task'), title: '续写第393～395章：九件抽样里四件额定来自已经不存在的装配', description: '按封存候选集和固定种子核验附件史、六槽外形、模糊摘要三层9件武具，确认风险复现并决定扫描扩展，不从小样本伪造全库错误率。', level: 'chapter', status: 'now', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'critical', whyNow: '预读显示4件当前摘要额定来自已不存在装配；必须逐件核物理/版本，防止用9件给2406件下结论。', known: ['三层各抽3件', '候选全集/固定种子已封存', '4件存在附件继承候选', '9件不用于估精确错误率'], missingDecisions: ['4件是否同一removed缺口？', '外形与模糊摘要层各有何终态？', '下一轮扫描按风险还是按随机扩大？'], aiPreAnalysis: '第393章附件史层；第394章接口/摘要层；第395章风险复现与扫描决策。', authorDecision: '不得换样本，不为突出门阀问题只报异常；正常项与范围外项完整保留。', agentWork: '', completionCriteria: ['9件全部有终态', '异常机制不被同一标签覆盖', '扩大扫描不外推伪精度'], links: [chaptersThreeHundredNinetyToThreeHundredNinetyTwo[2], 'research/断潮枪1200斤版本继承与额定来源卡.md', 'planning/第六卷章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() }, 'navigator');
  }
  const facts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '武具证明载荷与战斗额定分离', statement: '短时单方向证明载荷不能脱离附件、台座、方向、时长和冷却写成当前战斗额定；历史试验可真实有效，同时对当前装配不适用。', status: 'author-confirmed', evidence: [{ filePath: chaptersThreeHundredNinetyToThreeHundredNinetyTwo[0], quote: '一个是加强装配下短时单方向证明载荷。' }], updatedAt: now() },
    { id: uid('fact'), category: 'knowledge', subject: '断潮枪1200斤错误链', statement: '潮脊三号拆除事件未触发根级额定重算；复检员能写待复测但无权改根值；附件工单未开枪身复测；摘要迁移只取数值/时间并删除条件来源。', status: 'author-confirmed', evidence: [{ filePath: chaptersThreeHundredNinetyToThreeHundredNinetyTwo[1], quote: '拆掉加强环，没有拆掉根级额定值。' }], updatedAt: now() },
    { id: uid('fact'), category: 'decision', subject: '新版武具额定来源卡', statement: '来源卡强制主体/附件/方向/峰值/时长/支撑/材料/残余/原件/范围/失效触发11字段；触发转待复核不删历史，条件状态未知也不得称当前有效。', status: 'author-confirmed', evidence: [{ filePath: chaptersThreeHundredNinetyToThreeHundredNinetyTwo[2], quote: '一个额定值必须带着让它失效的条件。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '人间武库9件风险分层抽样', statement: '从附件史/六槽外形/模糊摘要三类候选全集以封存固定种子各抽3件；只检验已知风险复现，不估2406件错误率。预读4件额定来自已不存在装配。', status: 'text-explicit', evidence: [{ filePath: chaptersThreeHundredNinetyToThreeHundredNinetyTwo[2], quote: '九件里有四件，当前摘要的额定都来自已经不存在的装配。' }], updatedAt: now() }
  ];
  for (const fact of facts) await appendFact(fact);
  await setPosition({ filePath: chaptersThreeHundredNinetyToThreeHundredNinetyTwo[2], stage: '第六卷外层9件分层抽样阶段', focus: '续写第393～395章：九件抽样里四件额定来自已经不存在的装配' });
}

const chaptersThreeHundredNinetyThreeToThreeHundredNinetyFive = ['manuscript/第六卷-人间武库/第393章-三件附件史里有一件正确失效.md', 'manuscript/第六卷-人间武库/第394章-六个槽和可用两个字藏着三种问题.md', 'manuscript/第六卷-人间武库/第395章-三件异常不能写成百分之三十三的武库.md'];
if (chaptersThreeHundredNinetyThreeToThreeHundredNinetyFive.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第393～395章'));
  if (current && current.status !== 'completed') await appendTask({ ...current, status: 'completed', agentWork: '9件封存样本全量核验：鸣雷锤当前来源有效、穿城弩臂正确失效、伏城短盾真L6；镇脊刀removed未重算、镇潮棍峰值迁成额定、横江刀实物附件丢失但台账仍在；鹤喙钩非L6、回锋轮L3+3混合、流火戟仅动作可用。预读4件混入前批断潮枪，更正为本轮3件装配相关失效；风险富集禁止外推33%。建立风险扫描与30件基线抽样并行。', links: [...new Set([...current.links, 'research/人间武库9件分层抽样核验.md', ...chaptersThreeHundredNinetyThreeToThreeHundredNinetyFive])], updatedAt: now() }, 'researcher');
  if (!taskTitles.has('整理人间武库9件分层抽样核验')) {
    const timestamp = now();
    await appendTask({ id: uid('task'), title: '整理人间武库9件分层抽样核验', description: '记录附件史/六槽外形/模糊摘要三层9件终态、预读更正、风险机制和风险扫描/随机基线双轨。', level: 'session', status: 'completed', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'high', whyNow: '风险富集样本和跨批预读极易生成夸张比例，且正常反例必须与异常项同等保留。', known: ['3件装配相关当前值失效', '2件接口分类问题', '1件状态语义问题', '3件正常/正确失效'], missingDecisions: [], aiPreAnalysis: '逐件给类型化终态，再区分风险处置与总体估计所需的不同抽样。', authorDecision: '不报9件33%或全库33%；不只查异常，不让统计等待延误高风险页面转黄。', agentWork: '已生成research/人间武库9件分层抽样核验.md。', completionCriteria: ['9件无遗漏', '正常项与异常项同表', '下一扫描目的和样本边界分开'], links: ['research/人间武库9件分层抽样核验.md', chaptersThreeHundredNinetyThreeToThreeHundredNinetyFive[2]], dependencies: [], createdAt: timestamp, updatedAt: timestamp }, 'agent');
  }
  if (!taskTitles.has('续写第396～398章：普通修械师第一次不用门阀私库算出同一个停止点')) {
    await appendTask({ id: uid('task'), title: '续写第396～398章：普通修械师第一次不用门阀私库算出同一个停止点', description: '让三组不共享中间答案的普通修械师在同批有额定/回收装置测试件上执行候选算法，拆解停止点差异并修订为可复现0.2。', level: 'chapter', status: 'now', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'critical', whyNow: '外层风险入口成立，但若只有石小满能靠隐性经验得到停止点，候选包仍是专家私传而非公共算法。', known: ['三组普通修械师独立执行', '测试件有额定和回收装置', '门阀维护员不共享答案', '停止点差异需分算法/量具/训练'], missingDecisions: ['不同组是否会在同一级停止？', '哪些口头解释必须写入算法？', '多大差异仍算可复现？'], aiPreAnalysis: '第396章盲执行；第397章差异归因；第398章0.2再测与公开候选门槛。', authorDecision: '不以平均值掩盖分歧；需要专家临场提示才成功则视为失败并补文档。', agentWork: '', completionCriteria: ['三组原始步骤与停止点完整', '差异原因可复算', '0.2由未参与修订者复现'], links: [chaptersThreeHundredNinetyThreeToThreeHundredNinetyFive[2], 'research/人间武库9件分层抽样核验.md', 'planning/第六卷章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() }, 'navigator');
  }
  const facts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '风险富集抽样不能估总体比例', statement: '按已知风险分层抽样用于复现机制，不可用异常数/样本数估全库错误率；高风险处置与剩余目录随机基线需并行，互不替代。', status: 'author-confirmed', evidence: [{ filePath: chaptersThreeHundredNinetyThreeToThreeHundredNinetyFive[2], quote: '三件异常不能写成百分之三十三的武库。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '人间武库9件分层抽样结果', statement: '9件含3正常/正确失效、3装配相关当前值失效、2接口分类问题、1动作/承载语义问题；预读4件混入断潮枪，本轮更正为3件。', status: 'text-explicit', evidence: [{ filePath: chaptersThreeHundredNinetyThreeToThreeHundredNinetyFive[2], quote: '九件终态摊在一张表上。' }], updatedAt: now() },
    { id: uid('fact'), category: 'knowledge', subject: '武库外层风险机制扩展', statement: '除removed未重算外，还发现历史峰值迁成额定、附件实物丢失无数字事件、六槽混合接口及动作可用冒充承载可用；不能由一个修复规则覆盖。', status: 'author-confirmed', evidence: [{ filePath: chaptersThreeHundredNinetyThreeToThreeHundredNinetyFive[1], quote: '还有两类不同问题。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '公共算法三组独立复现', statement: '下一阶段让三组普通修械师在同批安全测试件上盲执行无载/分级加载/残余停止；不共享中间答案，若需石小满口头解释则候选算法未公共化。', status: 'text-explicit', evidence: [{ filePath: chaptersThreeHundredNinetyThreeToThreeHundredNinetyFive[2], quote: '若只有石小满能用，方法就不是公共算法。' }], updatedAt: now() }
  ];
  for (const fact of facts) await appendFact(fact);
  await setPosition({ filePath: chaptersThreeHundredNinetyThreeToThreeHundredNinetyFive[2], stage: '第六卷公共算法三组独立复现阶段', focus: '续写第396～398章：普通修械师第一次不用门阀私库算出同一个停止点' });
}

const chaptersThreeHundredNinetySixToThreeHundredNinetyEight = ['manuscript/第六卷-人间武库/第396章-三组修械师停在三个不同刻度.md', 'manuscript/第六卷-人间武库/第397章-三个刻度不能取平均当答案.md', 'manuscript/第六卷-人间武库/第398章-没有石小满在场也停在五成.md'];
if (chaptersThreeHundredNinetySixToThreeHundredNinetyEight.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第396～398章'));
  if (current && current.status !== 'completed') await appendTask({ ...current, status: 'completed', agentWork: '0.1首次盲跑因隐性步骤让甲/乙/丙停在50/60/40%，拒绝取平均。差异来自噪声扣除、卸载读数时机、非线性定义、零分母和早停终态。0.2定义空载3次中位噪声、稳定两息/最长十息、硬门禁及绝对0.1mm+增长/刚度8%趋势门禁；阈值另经24根历史杆盲定界。未参与修订的第四组用不同噪声量具在3根新杆均停50%，旧三组重读也收敛。', links: [...new Set([...current.links, 'research/L6公共停止算法三组盲复现.md', ...chaptersThreeHundredNinetySixToThreeHundredNinetyEight])], updatedAt: now() }, 'researcher');
  if (!taskTitles.has('整理L6公共停止算法三组盲复现')) {
    const timestamp = now();
    await appendTask({ id: uid('task'), title: '整理L6公共停止算法三组盲复现', description: '记录0.1三种停止、隐性知识、0.2测量/门禁定义、第四组新操作复现和旧分歧收敛。', level: 'session', status: 'completed', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'high', whyNow: '专家写下结论不等于别人能执行；恰好平均到校准值尤其可能掩盖早停与裂片的不同代价。', known: ['0.1停40/50/60', '0.2三根均停50', '旧三组重读收敛', '仅受控试验室候选'], missingDecisions: [], aiPreAnalysis: '将地方习惯转为显式测量步骤与门禁，再由未参与者对新对象复现。', authorDecision: '不以平均值判一致；疑问需由文档解决，江砚身体感受不进公共证据。', agentWork: '已生成research/L6公共停止算法三组盲复现.md。', completionCriteria: ['原始分歧不删除', '0.2步骤可独立执行', '适用范围和未成立项明确'], links: ['research/L6公共停止算法三组盲复现.md', chaptersThreeHundredNinetySixToThreeHundredNinetyEight[2]], dependencies: [], createdAt: timestamp, updatedAt: timestamp }, 'agent');
  }
  if (!taskTitles.has('续写第399～401章：同一个算法换一套便宜量具就早停了一档')) {
    await appendTask({ id: uid('task'), title: '续写第399～401章：同一个算法换一套便宜量具就早停了一档', description: '用低/中/高三档常见量具与刚性/柔性普通装夹台复测0.2，拆解早停、假残余与校准补偿，形成工坊工具等级和不可执行条件。', level: 'chapter', status: 'now', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'critical', whyNow: '受控试验室复现仍依赖武库工具；若最低工具只有门阀买得起，文字公开不能让普通工坊真正使用。', known: ['0.2在武库量具下可复现', '低价量具噪声/分辨率更差', '普通装夹台刚度不同', '不能用江砚手感补量具'], missingDecisions: ['早停可否用校准片纠正？', '柔性台假残余能否区分？', '最低可执行工具成本是多少？'], aiPreAnalysis: '第399章交叉工具矩阵；第400章偏差归因与补偿；第401章工具等级/校准片/阻塞条件。', authorDecision: '不为普及降低安全门槛，也不把昂贵工具品牌写进算法；允许明确“本工坊不可执行”。', agentWork: '', completionCriteria: ['至少6种工具组合结果完整', '补偿不掩盖真实损伤', '普通工坊有可购或可共享路径'], links: [chaptersThreeHundredNinetySixToThreeHundredNinetyEight[2], 'research/L6公共停止算法三组盲复现.md', 'planning/第六卷章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() }, 'navigator');
  }
  const facts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '公共算法必须跨执行者复现', statement: '专家结论只有在未参与修订者仅凭公开材料对新对象得到可解释同终态时才可称公共候选；平均分歧、专家口头提示或主角特殊感受均不能替代。', status: 'author-confirmed', evidence: [{ filePath: chaptersThreeHundredNinetySixToThreeHundredNinetyEight[2], quote: '没有石小满在场也停在五成' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: 'L6停止算法0.1三组首轮', statement: '甲不扣噪声停50%，乙扣噪且等两级趋势到60%裂片才停，丙卸载立即读回弹期在40%停；三种均由0.1未定义处允许。', status: 'text-explicit', evidence: [{ filePath: chaptersThreeHundredNinetySixToThreeHundredNinetyEight[0], quote: '三组使用同一版文字。' }], updatedAt: now() },
    { id: uid('fact'), category: 'decision', subject: 'L6公共停止算法0.2', statement: '空载3次中位噪声；卸载稳定2息/最长10息；硬门禁偏角>2度/不稳/裂片/回声丢失；趋势门禁有效残余≥0.1mm且增长>1倍或刚度降>8%。', status: 'author-confirmed', evidence: [{ filePath: chaptersThreeHundredNinetySixToThreeHundredNinetyEight[1], quote: '零点二先定义测量。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: 'L6算法普通工坊工具复测', statement: '0.2在受控武库试验室由第四组3根均停50%、旧组重读收敛；下一步用三档常见量具与两类装夹台验证，明确校准片、最低工具与不可执行条件。', status: 'text-explicit', evidence: [{ filePath: chaptersThreeHundredNinetySixToThreeHundredNinetyEight[2], quote: '同一个算法换一套便宜量具就早停了一档。' }], updatedAt: now() }
  ];
  for (const fact of facts) await appendFact(fact);
  await setPosition({ filePath: chaptersThreeHundredNinetySixToThreeHundredNinetyEight[2], stage: '第六卷普通工坊工具可执行性阶段', focus: '续写第399～401章：同一个算法换一套便宜量具就早停了一档' });
}

const chaptersThreeHundredNinetyNineToFourHundredOne = ['manuscript/第六卷-人间武库/第399章-便宜量具让三根好杆都早停一档.md', 'manuscript/第六卷-人间武库/第400章-假残余有一半留在工作台上.md', 'manuscript/第六卷-人间武库/第401章-看不清残余也是合法停止结果.md'];
if (chaptersThreeHundredNinetyNineToFourHundredOne.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第399～401章'));
  if (current && current.status !== 'completed') await appendTask({ ...current, status: 'completed', agentWork: '三档量具×刚柔台六格交叉：普通针+刚性台复现50%，低价0.1mm针早停40%，高精/普通针在柔性台也因台座回弹早停，低价+柔性十息不稳。阶梯校准片证明低价针无趋势分辨率；空白杆+台座对角双参考/横向回零发现柔性与夹爪假残余。公开三角加固桥将参考差0.07降至0.02。0.3分A/B/C工具级，6工坊中5家复现、C档合法转介。', links: [...new Set([...current.links, 'research/L6公共算法普通工坊工具核验.md', ...chaptersThreeHundredNinetyNineToFourHundredOne])], updatedAt: now() }, 'researcher');
  if (!taskTitles.has('整理L6公共算法普通工坊工具核验')) {
    const timestamp = now();
    await appendTask({ id: uid('task'), title: '整理L6公共算法普通工坊工具核验', description: '记录六格工具矩阵、公共校准片、空白杆/双参考装夹自检、三角加固桥、A/B/C工具级和6工坊试点。', level: 'session', status: 'completed', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'high', whyNow: '精密量具可能精确测到工作台而非工件，低价量具也不能靠数值补偿制造分辨率；工具权利需有公开验收和转介。', known: ['低价针趋势不可执行', '柔性台需双参考/横向回零', '普通针+加固桥可复现', 'C档转介是合法终态'], missingDecisions: [], aiPreAnalysis: '先用无武具校准片/空白杆拆量具与台座，再把最低要求写成性能而非品牌。', authorDecision: '不降低安全门槛普及，不绑定门阀型号；公开性能/转介，不强迫公开高精工具制造秘密。', agentWork: '已生成research/L6公共算法普通工坊工具核验.md。', completionCriteria: ['量具与装夹误差分离', '低成本可达路径存在', '不可执行状态不被惩罚'], links: ['research/L6公共算法普通工坊工具核验.md', chaptersThreeHundredNinetyNineToFourHundredOne[2]], dependencies: [], createdAt: timestamp, updatedAt: timestamp }, 'agent');
  }
  if (!taskTitles.has('续写第402～404章：算法第一次走出武库没有让所有工坊都做承载测试')) {
    await appendTask({ id: uid('task'), title: '续写第402～404章：算法第一次走出武库没有让所有工坊都做承载测试', description: '三家普通工坊各接收一件真实维修史退役武具，先核工具/来源/权限，形成现场修复、停止转介和接口范围外终态，并回读责任证据。', level: 'chapter', status: 'now', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'critical', whyNow: '0.3只在测试杆上成立；真实武具有附件、历史、客户与工坊收益压力，必须验证出库后不会把“试点成功”变成全做承载。', known: ['5家A/B可全流程', 'C档只能硬筛转介', '三件允许不同终态', '候选包未全城发布'], missingDecisions: ['工坊是否会为保订单越级？', '转介后责任如何连续？', '有限发布评审需要哪些现场证据？'], aiPreAnalysis: '第402章接单与权限；第403章三终态；第404章责任回读与阶段结案。', authorDecision: '不以修好数奖励工坊；转介订单收入/责任需可见，避免经济激励逼出假通过。', agentWork: '', completionCriteria: ['三家/三件终态完整', '转介不断责任和证据', '决定有限发布但无自动全城生效'], links: [chaptersThreeHundredNinetyNineToFourHundredOne[2], 'research/L6公共算法普通工坊工具核验.md', 'planning/第六卷章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() }, 'navigator');
  }
  const facts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '公共算法工具链先自证测量对象', statement: '趋势测试前量具需读公共阶梯片，装夹台用空白杆/对角双参考/横向回零自检；精度高不代表测到工件，数学补偿也不能制造缺失分辨率。', status: 'author-confirmed', evidence: [{ filePath: chaptersThreeHundredNinetyNineToFourHundredOne[1], quote: '算法还没碰到材料以前，应该先知道自己正在量谁。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: 'L6零点三普通工坊工具试点', statement: '六格矩阵发现低价针早停、柔性台假残余；三角加固桥后普通针复现。6家中2家A、3家B、1家C；A/B疲劳杆50%停，C硬筛后转共享点且结果一致。', status: 'text-explicit', evidence: [{ filePath: chaptersThreeHundredNinetyNineToFourHundredOne[2], quote: 'C档也完成了自己的权限内任务。' }], updatedAt: now() },
    { id: uid('fact'), category: 'decision', subject: 'L6零点三A-B-C工具级', statement: 'A/B在公开性能验收下可执行全流程；C只做外形/回声/偏角/裂片硬筛，合法终态为封签转共享计量点。工具搬动/更换/桥拆装等触发重验。', status: 'author-confirmed', evidence: [{ filePath: chaptersThreeHundredNinetyNineToFourHundredOne[2], quote: '看不清残余也是合法停止结果。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: 'L6零点三真实工坊退役武具试点', statement: '下一轮3家普通工坊各收1件真实维修史退役武具，允许修复/停止转介/范围外；需保留订单收益、责任与证据，不以3件全修好定义成功。', status: 'text-explicit', evidence: [{ filePath: chaptersThreeHundredNinetyNineToFourHundredOne[2], quote: '算法第一次走出武库，没有让所有工坊都做承载测试。' }], updatedAt: now() }
  ];
  for (const fact of facts) await appendFact(fact);
  await setPosition({ filePath: chaptersThreeHundredNinetyNineToFourHundredOne[2], stage: '第六卷零点三真实工坊退役武具试点', focus: '续写第402～404章：算法第一次走出武库没有让所有工坊都做承载测试' });
}

const chaptersFourHundredTwoToFourHundredFour = ['manuscript/第六卷-人间武库/第402章-先写转介也有工钱再把武具送进工坊.md', 'manuscript/第六卷-人间武库/第403章-三家工坊只修好一件武具.md', 'manuscript/第六卷-人间武库/第404章-转出去的武具没有把责任一起丢掉.md'];
if (chaptersFourHundredTwoToFourHundredFour.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第402～404章'));
  if (current && current.status !== 'completed') await appendTask({ ...current, status: 'completed', agentWork: '先改订单：工具/来源/硬筛/封签/分类分别付费，合规转介保留工时+10%协作费，试点保险与越权责任分开。三家真实工坊仅甲铺修好折江钺油泥故障并通过本次60%任务载荷；C档乙铺因寒沙弓第四槽间歇回声丢失转介，后确认套管裂纹；丙铺将三棱护手判未知3+3范围外，后纸图证实御流式。原铺/共享点/武库三段责任回读通过，进入12家30天有限发布评审。', links: [...new Set([...current.links, 'research/L6零点三真实工坊三武具试点.md', ...chaptersFourHundredTwoToFourHundredFour])], updatedAt: now() }, 'researcher');
  if (!taskTitles.has('整理L6零点三真实工坊三武具试点')) {
    const timestamp = now();
    await appendTask({ id: uid('task'), title: '整理L6零点三真实工坊三武具试点', description: '记录订单激励、三家工具、三件终态、转介责任、成功范围和有限发布入口。', level: 'session', status: 'completed', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'high', whyNow: '若修好才付全款或转介丢责任，真实收益会诱导工坊绕过算法；现场成功也不能传播到未测试额定。', known: ['1修复/1停止转介/1范围外', '三家均完成权限内任务', '责任跨三段连续', '候选包未全城强制'], missingDecisions: [], aiPreAnalysis: '先让合同支持安全终态，再验证证据和责任跨机构交接。', authorDecision: '按可控劳动付费；正确停止受保护但不免伪造/越权审计；有限发布可撤回。', agentWork: '已生成research/L6零点三真实工坊三武具试点.md。', completionCriteria: ['激励不逼假通过', '转介证据可回读', '有限发布范围/撤回明确'], links: ['research/L6零点三真实工坊三武具试点.md', chaptersFourHundredTwoToFourHundredFour[2]], dependencies: [], createdAt: timestamp, updatedAt: timestamp }, 'agent');
  }
  if (!taskTitles.has('续写第405～407章：闻氏同意公开停止条件不同意公开谁批准了旧额定')) {
    await appendTask({ id: uid('task'), title: '续写第405～407章：闻氏同意公开停止条件不同意公开谁批准了旧额定', description: '拆分公开操作、旧批准、赔偿与在役结构保密，比较闻氏担保/工坊自担/共同基金模型，建立有限发布责任账和匿名来源入口。', level: 'chapter', status: 'now', kind: 'review', assignee: 'editor', source: 'navigator', priority: 'critical', whyNow: '零点三技术可执行后，垄断转到解释权和责任：公开步骤后谁为旧错/新错付钱，既不能无限推门阀也不能全压普通工坊。', known: ['闻氏愿公开停止条件/来源卡格式', '不同意公开批准者/赔偿链/旧事故', '部分记录含在役结构', '拟12家30天退役武具有限发布'], missingDecisions: ['责任公开是否需要姓名？', '新事故基金如何分摊？', '匿名来源如何接受追查又防人肉？'], aiPreAnalysis: '第405章四类责任；第406章三种担保模型；第407章责任账/匿名来源入口和发布门禁。', authorDecision: '不把系统缺口推给单人，不用保密掩盖机构责任；事故赔偿与算法解释权分别设计。', agentWork: '', completionCriteria: ['旧/新责任分开', '保密字段不吞机构责任', '有限发布有可执行赔付与追查路径'], links: [chaptersFourHundredTwoToFourHundredFour[2], 'research/L6零点三真实工坊三武具试点.md', 'planning/第六卷章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() }, 'navigator');
  }
  const facts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '安全终态必须有相容订单激励', statement: '修复/停止/范围外/转介应按权限内可控劳动付费；正确停止受试点保险保护但不免伪造/越权审计，避免转介丢单逼出假通过。', status: 'author-confirmed', evidence: [{ filePath: chaptersFourHundredTwoToFourHundredFour[0], quote: '算法把转介写成合法终态，合同却把它写成失败。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: 'L6零点三三工坊真实武具试点', statement: '折江钺油泥保养修复并通过本次60%载荷但完整额定待复；寒沙弓C档回声丢失转介并发现套管裂纹；三棱护手3+3范围外后确认为御流式。', status: 'text-explicit', evidence: [{ filePath: chaptersFourHundredTwoToFourHundredFour[1], quote: '三家工坊只修好一件武具。' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '武具转介三段责任连续', statement: '原铺负责权限内诊断/停止/封签，共享点负责高级复测/定位，武库所有者负责修复/封存/未来说明；哈希/运输/异议与第三复核防责任随订单丢失。', status: 'author-confirmed', evidence: [{ filePath: chaptersFourHundredTwoToFourHundredFour[2], quote: '转出去的武具没有把责任一起丢掉。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: 'L6零点三有限发布责任评审', statement: '拟12家持照工坊、30天、退役L6候选；公开操作/来源/工具/终态/转介，不公开M6/制造/在役清单。待决旧批准、赔偿和公开后新事故责任。', status: 'text-explicit', evidence: [{ filePath: chaptersFourHundredTwoToFourHundredFour[2], quote: '闻氏同意公开停止条件，不同意公开谁批准了旧额定。' }], updatedAt: now() }
  ];
  for (const fact of facts) await appendFact(fact);
  await setPosition({ filePath: chaptersFourHundredTwoToFourHundredFour[2], stage: '第六卷有限发布所有权与责任阶段', focus: '续写第405～407章：闻氏同意公开停止条件不同意公开谁批准了旧额定' });
}

const chaptersFourHundredFiveToFourHundredSeven = ['manuscript/第六卷-人间武库/第405章-公开责任不等于把名字贴在武库门口.md', 'manuscript/第六卷-人间武库/第406章-无限担保会让公开算法永远离不开闻氏.md', 'manuscript/第六卷-人间武库/第407章-匿名责任账能追到机构也能追到人.md'];
if (chaptersFourHundredFiveToFourHundredSeven.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第405～407章'));
  if (current && current.status !== 'completed') await appendTask({ ...current, status: 'completed', agentWork: '将责任拆为当前操作/历史批准/赔偿/保密；公开机构、稳定角色号、权限、决定和证据，实名与在役结构受限且双钥托管，个人匿名不取消机构责任。影子事故显示闻氏无限担保会保留最终审批、工坊自担会逼退出/假通过，选择武库40%/闻氏30%/公共预算20%/工坊共同10%基金，先赔后追偿。12字段责任账完成，12家30天退役武具有限发布启动；首日出现四成临时上限被标签写成新额定。', links: [...new Set([...current.links, 'research/L6有限发布责任模型与匿名来源账.md', 'decisions/L6零点三有限发布责任与赔付.md', ...chaptersFourHundredFiveToFourHundredSeven])], updatedAt: now() }, 'editor');
  if (!taskTitles.has('整理L6有限发布责任模型与匿名来源账')) {
    const timestamp = now();
    await appendTask({ id: uid('task'), title: '整理L6有限发布责任模型与匿名来源账', description: '记录四类责任、角色化来源、三赔偿模型、共同基金、12字段责任账、双钥实名与发布终态。', level: 'session', status: 'completed', kind: 'review', assignee: 'editor', source: 'navigator', priority: 'high', whyNow: '技术公开若没有赔付/追责/保密边界，会回到闻氏最终审批或把隐蔽缺陷压给小工坊。', known: ['机构/角色公开且实名受控', '共同基金先赔后归责', '12字段责任账', '零点三已有限发布'], missingDecisions: [], aiPreAnalysis: '分离看得见的机构责任、受控个人追索和伤者即时赔付，再以影子事故审逆向激励。', authorDecision: '不公开人名制造追杀，不以保密吞机构责任；试点基金比例不永久化。', agentWork: '已生成research/L6有限发布责任模型与匿名来源账.md和decisions/L6零点三有限发布责任与赔付.md。', completionCriteria: ['身份/机构/赔付分层', '受限来源可合法追查', '发布/撤回/离线恢复边界明确'], links: ['research/L6有限发布责任模型与匿名来源账.md', 'decisions/L6零点三有限发布责任与赔付.md', chaptersFourHundredFiveToFourHundredSeven[2]], dependencies: [], createdAt: timestamp, updatedAt: timestamp }, 'agent');
  }
  if (!taskTitles.has('续写第408～410章：有限发布第一天有人把临时上限写成了新额定')) {
    await appendTask({ id: uid('task'), title: '续写第408～410章：有限发布第一天有人把临时上限写成了新额定', description: '定位操作记录、标签模板和客户页类型丢失，冻结同模板并通知首日19件，修复类型化终态传播并决定有限发布继续/暂停边界。', level: 'chapter', status: 'now', kind: 'revision', assignee: 'editor', source: 'navigator', priority: 'critical', whyNow: '公开第一天已出现旧问题在新系统重生；必须按影响范围处理，不把一件展示错误写成零点三算法整体失效或只改当前标签。', known: ['操作记录正确写临时上限', '打印标签写新额定', '首日19件任务', '同模板输出需冻结'], missingDecisions: ['类型在哪一层被抹平？', '多少标签/客户页受影响？', '发布是否触发撤回条件？'], aiPreAnalysis: '第408章三层定位；第409章影响通知/冻结；第410章类型传播回归与继续边界。', authorDecision: '先冻结模板和受影响输出，不冻结无关安全停止；回读所有已打印标签，不能只修未来。', agentWork: '', completionCriteria: ['影响集合精确', '历史错误标签全部回读', '继续/暂停依据可审计'], links: [chaptersFourHundredFiveToFourHundredSeven[2], 'decisions/L6零点三有限发布责任与赔付.md', 'planning/第六卷章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() }, 'navigator');
  }
  const facts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '公开责任与个人实名分离', statement: '公共页显示机构/稳定角色/权限/决定/证据/范围；实名与在役结构受限双钥解析。个人匿名不取消机构责任，角色号不跨权限或任意重置，映射遗失也不伪造姓名。', status: 'author-confirmed', evidence: [{ filePath: chaptersFourHundredFiveToFourHundredSeven[0], quote: '公开责任不等于把批准者名字贴在武库门口。' }], updatedAt: now() },
    { id: uid('fact'), category: 'decision', subject: 'L6有限发布共同赔付基金', statement: '30天试点由武库40%/闻氏30%/公共预算20%/工坊共同10%出资；按伤害物损先赔，后按伪报/越权/隐瞒/来源错误追偿，合理未知共同承担。', status: 'author-confirmed', evidence: [{ filePath: chaptersFourHundredFiveToFourHundredSeven[1], quote: '赔偿与归责第一次分成两个时钟。' }], updatedAt: now() },
    { id: uid('fact'), category: 'decision', subject: 'L6有限发布匿名责任账', statement: '责任账含主体/附件/算法/工具/允许与实际动作/证据/终态/机构/角色/基金/受限入口12字段；实名双钥托管，包离线可验且换机不恢复过期任务权。', status: 'author-confirmed', evidence: [{ filePath: chaptersFourHundredFiveToFourHundredSeven[2], quote: '匿名责任账能追到机构也能追到人。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '零点三首日临时上限标签错误', statement: '12家有限发布首日共19件任务；第7家旧刀操作记录正确为四成临时上限，打印标签却写“新额定：四成”，类型在新公开系统中丢失，待精确召回。', status: 'text-explicit', evidence: [{ filePath: chaptersFourHundredFiveToFourHundredSeven[2], quote: '临时上限又一次被压成了额定。' }], updatedAt: now() }
  ];
  for (const fact of facts) await appendFact(fact);
  await setPosition({ filePath: chaptersFourHundredFiveToFourHundredSeven[2], stage: '第六卷有限发布终态类型召回阶段', focus: '续写第408～410章：有限发布第一天有人把临时上限写成了新额定' });
}

const chaptersFourHundredEightToFourHundredTen = ['manuscript/第六卷-人间武库/第408章-操作记录里从来没有新额定三个字.md', 'manuscript/第六卷-人间武库/第409章-冻结一张模板没有冻结十九件任务.md', 'manuscript/第六卷-人间武库/第410章-未知终态不再默认翻译成通过.md'];
if (chaptersFourHundredEightToFourHundredTen.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第408～410章'));
  if (current && current.status !== 'completed') await appendTask({ ...current, status: 'completed', agentWork: '原始12字段事件正确为四成temporary_task_limit/full_rating unknown；旧标签适配器只见过“完整额定通过/无数字失败”，以passed+numeric统一转新额定，客户页又读同一四字段缓存。首日19件中1件正式错显、1件冻结期标签待补、17件无同类错。只冻结LABEL-RETIRE-2数字转换/客户缓存，测量停止继续。改为current_rating/temporary_task_limit/historical_proof/no_load_only/stopped/out_of_scope/referred七类互斥终态，未知类型拒绝打印；召回闭环后有限发布继续。', links: [...new Set([...current.links, 'research/L6零点三临时上限标签召回.md', 'decisions/L6零点三有限发布责任与赔付.md', ...chaptersFourHundredEightToFourHundredTen])], updatedAt: now() }, 'editor');
  if (!taskTitles.has('整理L6零点三临时上限标签召回')) {
    const timestamp = now();
    await appendTask({ id: uid('task'), title: '整理L6零点三临时上限标签召回', description: '记录事件/适配器/纸面/客户页分层、19件影响、冻结通知、7类终态、回读和发布决定。', level: 'session', status: 'completed', kind: 'revision', assignee: 'editor', source: 'navigator', priority: 'high', whyNow: '只改当前标签会让同一默认分支继续污染其他数值终态；整体撤回又会覆盖仍正确的测量/停止。', known: ['原始事件正确', '正式错显1件', '类型适配器v3', '有限发布继续'], missingDecisions: [], aiPreAnalysis: '按数据血缘精确定位和召回，再用互斥类型消除默认数值翻译。', authorDecision: '历史错标签保留为撤回证据；未知类型失败关闭；旧离线版只读。', agentWork: '已生成research/L6零点三临时上限标签召回.md并更新有限发布决定。', completionCriteria: ['影响集合完整', '历史与未来都修复', '暂停范围不覆盖正确工作'], links: ['research/L6零点三临时上限标签召回.md', 'decisions/L6零点三有限发布责任与赔付.md', chaptersFourHundredEightToFourHundredTen[2]], dependencies: [], createdAt: timestamp, updatedAt: timestamp }, 'agent');
  }
  if (!taskTitles.has('续写第411～413章：十二家工坊都能下载算法只有闻氏能解释它为什么改过三次')) {
    await appendTask({ id: uid('task'), title: '续写第411～413章：十二家工坊都能下载算法只有闻氏能解释它为什么改过三次', description: '对照零点一至零点三修改理由与私库事故来源，建立去在役结构/去身份但保留因果的事故案例层，完成维护垄断阶段并确定正式公开谈判边界。', level: 'chapter', status: 'now', kind: 'review', assignee: 'editor', source: 'navigator', priority: 'critical', whyNow: '工坊已经能执行最新步骤，却看不到噪声、柔性台和类型丢失为何改变规则；没有失败来源，阈值仍只能依赖闻氏/武库权威解释。', known: ['0.1到0.3有三轮公开修订', '私库事故含在役结构/个人身份', '责任账支持角色化来源', '有限发布仍在运行'], missingDecisions: ['事故因果公开到何粒度？', '案例如何防反推在役武具？', '正式发布还需闻氏保留哪些解释权？'], aiPreAnalysis: '第411章版本理由缺口；第412章脱敏事故案例；第413章阶段结案与谈判边界。', authorDecision: '不公开姓名/在役位置，但必须公开足以推导阈值和修订的失败因果与反例。', agentWork: '', completionCriteria: ['三次修订可由公共证据解释', '脱敏不破坏因果', '门阀/公共解释权边界明确'], links: [chaptersFourHundredEightToFourHundredTen[2], 'research/L6零点三临时上限标签召回.md', 'planning/第六卷章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() }, 'navigator');
  }
  const facts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '类型化终态不得经通用数字降级', statement: '结构化结果进入旧显示/标签/缓存时必须保留互斥类型与范围；“通过+数值”不能默认额定，未知类型/冲突字段应拒绝展示而非选最近含义。', status: 'author-confirmed', evidence: [{ filePath: chaptersFourHundredEightToFourHundredTen[2], quote: '未知终态不再默认翻译成通过。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: 'L6零点三首日标签召回', statement: '19件中1件四成临时上限正式错显为新额定、1件冻结期数字标签待补、17件无同类错误；错误标签/客户缓存召回且客户未领取使用，工坊原始事件正确。', status: 'text-explicit', evidence: [{ filePath: chaptersFourHundredEightToFourHundredTen[2], quote: '十九件首日任务回读完成。' }], updatedAt: now() },
    { id: uid('fact'), category: 'decision', subject: 'L6终态七类与显示事实源', statement: '当前额定/临时上限/历史证明/无载/停止/范围外/转介七类互斥；客户页读签名事件，纸标签只指事件哈希。适配器v3，旧离线版只读历史。', status: 'author-confirmed', evidence: [{ filePath: chaptersFourHundredEightToFourHundredTen[2], quote: '新终态结构没有通用result_value。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: 'L6公开算法失败来源解释权', statement: '十二家可执行0.3但零点一至零点三的噪声/台座/类型修订仍依赖闻氏与武库解释；下一步建立去身份/在役结构但保留因果的公共事故案例层。', status: 'text-explicit', evidence: [{ filePath: chaptersFourHundredEightToFourHundredTen[2], quote: '十二家工坊都能下载算法，只有闻氏能解释它为什么改过三次。' }], updatedAt: now() }
  ];
  for (const fact of facts) await appendFact(fact);
  await setPosition({ filePath: chaptersFourHundredEightToFourHundredTen[2], stage: '第六卷公开算法失败来源与解释权阶段', focus: '续写第411～413章：十二家工坊都能下载算法只有闻氏能解释它为什么改过三次' });
}

const chaptersFourHundredElevenToFourHundredThirteen = ['manuscript/第六卷-人间武库/第411章-版本记录只写改了什么没有写为什么.md', 'manuscript/第六卷-人间武库/第412章-删掉武具编号不能删掉它怎样伤人.md', 'manuscript/第六卷-人间武库/第413章-公开算法也要公开它输过的版本.md'];
if (chaptersFourHundredElevenToFourHundredThirteen.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第411～413章'));
  if (current && current.status !== 'completed') await appendTask({ ...current, status: 'completed', agentWork: '发现0.1～0.3版本页只写改动、不写两度/0.1mm/8%等阈值为何成立，工坊可执行却无法质疑范围。建立公共失败案例层：主体类、前置、允许/实际动作、信号、后果、因果/反例、规则修改与删字段清单；知识盲门和保密盲门同时通过。两度案例保留1.6→2.2、回声仍在、侧缘裂片伤人因果，遮罩部队/附件/身份。30天173件试点0伤，45修复/37停止/21转介/16范围外/54无载补全；维护垄断阶段结案并建立正式谈判边界。', links: [...new Set([...current.links, 'research/L6公共算法三版本失败来源案例层.md', 'decisions/L6正式公开谈判边界.md', ...chaptersFourHundredElevenToFourHundredThirteen])], updatedAt: now() }, 'editor');
  if (!taskTitles.has('整理L6公共算法三版本失败来源案例层')) {
    const timestamp = now();
    await appendTask({ id: uid('task'), title: '整理L6公共算法三版本失败来源案例层', description: '记录版本解释缺口、公共案例字段、两度/0.1mm/8%来源、试验失败、30天结果和正式谈判边界。', level: 'session', status: 'completed', kind: 'review', assignee: 'editor', source: 'navigator', priority: 'high', whyNow: '只有步骤没有失败来源，公共算法仍要求普通工坊相信闻氏/武库阈值权威，无法在新对象上判断适用范围。', known: ['知识/保密双盲门', '失败因果可推导且低可识别', '旧版本永久可查', '正式谈判边界已写'], missingDecisions: [], aiPreAnalysis: '从规则回溯失败，按最小因果脱敏，并让知识与重识别分别由不知原件者测试。', authorDecision: '保护配方/在役/身份，不保护规则为何成立的解释垄断。', agentWork: '已生成research/L6公共算法三版本失败来源案例层.md和decisions/L6正式公开谈判边界.md。', completionCriteria: ['三版修改可回溯', '遮罩不毁因果', '公共/受限/修改权明确'], links: ['research/L6公共算法三版本失败来源案例层.md', 'decisions/L6正式公开谈判边界.md', chaptersFourHundredElevenToFourHundredThirteen[2]], dependencies: [], createdAt: timestamp, updatedAt: timestamp }, 'agent');
  }
  if (!taskTitles.has('续写第414～416章：已经列黄的旧槊在通知到达前被借去守夜')) {
    await appendTask({ id: uid('task'), title: '续写第414～416章：已经列黄的旧槊在通知到达前被借去守夜', description: '按借用记录/夜巡路线/最后可信回声定位镇门槊与持械人员，现场停止承载、核附件槽位并维持夜巡安全，复原通知迟到和退役/在用冲突。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'critical', whyNow: '风险扫描命中附件拆除与旧900斤额定，但武具登记退役、实际被民防借出；不能等正式谈判，也不能远程宣布报废让夜巡突然失去防卫。', known: ['23:00借出，预计06:00归还', '当前01:40', '镇门槊旧额定900斤', '附件removed命中黄色'], missingDecisions: ['持械人当前位置与当前任务？', '如何不承载又保持巡夜安全？', '黄色通知为何未在借出前阻断？'], aiPreAnalysis: '第414章定位人/槊；第415章现场替代与物理核验；第416章状态链/通知链结案。', authorDecision: '人员安全与街区防卫同时处理；不通过一通远程命令让武具或岗位瞬间消失。', agentWork: '', completionCriteria: ['人员/武具位置可核', '停止不制造新的街区风险', '退役/借用/黄色时序责任明确'], links: [chaptersFourHundredElevenToFourHundredThirteen[2], 'decisions/L6正式公开谈判边界.md', 'planning/第六卷章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() }, 'navigator');
  }
  const facts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '公共算法必须公开失败来源', statement: '公共步骤需能从规则回到动作/信号/后果/反例与修订；只写“历史验证”仍垄断解释权。事故可去位置/身份/配方，但遮罩后不能破坏阈值因果。', status: 'author-confirmed', evidence: [{ filePath: chaptersFourHundredElevenToFourHundredThirteen[2], quote: '公开算法也要公开它输过的版本。' }], updatedAt: now() },
    { id: uid('fact'), category: 'knowledge', subject: 'L6两度偏角公共案例', statement: '第三槽偏角1.6°缓升、加载中2.2°且回声仍在；操作者未越40%许可却发生侧缘滑移/护套裂片上肢伤。双量具/事件/对照削弱误差/越限/单材料，形成>2°硬停。', status: 'author-confirmed', evidence: [{ filePath: chaptersFourHundredElevenToFourHundredThirteen[1], quote: '删掉武具编号不能删掉它怎样伤人。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: 'L6零点三30天有限发布结案', statement: '12家接173件：45修复、37停止、21转介、16范围外、54无载/来源补全；0伤人，1错标召回，2工具级申报错误加载前发现，13件跨期只读待承接。', status: 'text-explicit', evidence: [{ filePath: chaptersFourHundredElevenToFourHundredThirteen[2], quote: '三十天有限发布结束。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '镇门槊退役登记与夜巡在用冲突', statement: '民防仓镇门槊登记退役、旧额定900斤、附件removed命中黄色；23:00被街区夜巡借出、06:00预计归还，01:40通知到库时槊不在架。', status: 'text-explicit', evidence: [{ filePath: chaptersFourHundredElevenToFourHundredThirteen[2], quote: '一柄已经列黄的旧枪在事故通知到达前被借去守夜' }], updatedAt: now() }
  ];
  for (const fact of facts) await appendFact(fact);
  await setPosition({ filePath: chaptersFourHundredElevenToFourHundredThirteen[2], stage: '第六卷镇门槊退役在用事故链阶段', focus: '续写第414～416章：已经列黄的旧槊在通知到达前被借去守夜' });
}

const chaptersFourHundredFourteenToFourHundredSixteen = ['manuscript/第六卷-人间武库/第414章-通知到达时镇门槊不在库里.md', 'manuscript/第六卷-人间武库/第415章-先让两根市政撑吃住栅门的重量.md', 'manuscript/第六卷-人间武库/第416章-退役状态没有让借用任务一起结束.md'];
if (chaptersFourHundredFourteenToFourHundredSixteen.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第414～416章'));
  if (current && current.status !== 'completed') await appendTask({ ...current, status: 'completed', agentWork: '镇门槊23:00以退役民防工具借出，00:58扫描列黄，01:40只通知仓库；01:44确认夜巡三组正用其斜撑脱轨防兽栅。拒绝远程立即放下，以两根市政撑分担纵横载荷、保险索和盾/钩维持街口后逐级卸槊；第三槽受力偏角1.9→2.4、无载2.3并有新增滑移，02:03红停封箱，无伤仅右掌短时绿观察。根因是风险按库存生命周期路由，退役未订阅借用任务；修复为生命周期/使用态双轴、当前保管链优先和借用全程订阅。', links: [...new Set([...current.links, 'research/镇门槊退役在用黄色通知事故链.md', ...chaptersFourHundredFourteenToFourHundredSixteen])], updatedAt: now() }, 'writer');
  if (!taskTitles.has('整理镇门槊退役在用黄色通知事故链')) {
    const timestamp = now();
    await appendTask({ id: uid('task'), title: '整理镇门槊退役在用黄色通知事故链', description: '记录借出/扫描/通知/卸载时序、现场力路、物理终态、通知断点、双轴状态和责任扩展。', level: 'session', status: 'completed', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'high', whyNow: '槊未断也无人红伤，若只以事故后果结案，会漏掉退役标签遮蔽当前借用与42分钟通知断链。', known: ['现场安全卸载', '第三槽2.3°红停', '当前保管链优先', '312件退役在用'], missingDecisions: [], aiPreAnalysis: '分离库存/任务时间线和纵横载荷，保留现场替代与夜巡连续性。', authorDecision: '不把列黄变成远程统一放下；不以民防非战斗名义绕过承载。', agentWork: '已生成research/镇门槊退役在用黄色通知事故链.md。', completionCriteria: ['人/物/载荷终态完整', '通知断点可修', '扩展数量不等于批量危险'], links: ['research/镇门槊退役在用黄色通知事故链.md', chaptersFourHundredFourteenToFourHundredSixteen[2]], dependencies: [], createdAt: timestamp, updatedAt: timestamp }, 'agent');
  }
  if (!taskTitles.has('续写第417～419章：第一条事故链没有断槊却暴露三百一十二件退役在用武具')) {
    await appendTask({ id: uid('task'), title: '续写第417～419章：第一条事故链没有断槊却暴露三百一十二件退役在用武具', description: '按当前保管/真实载荷/风险/替代能力拆分312件，分别处理长期民防、训练领用和临时借用，形成风险处置与基线复核并行终态并追查既有伤害。', level: 'chapter', status: 'now', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'critical', whyNow: '312件只说明退役不等于闲置；批量红停会制造民防/训练空窗，按价格或仓库排序又会延迟正在承载者。', known: ['312件退役在用', '三类使用态', '当前保管链已可通知', '镇门槊无伤但有真实滑移'], missingDecisions: ['多少件正在承载？', '哪些可现场替代？', '退役标签下是否已有伤害未进入在役事故统计？'], aiPreAnalysis: '第417章风险分层；第418章三类替代/通知；第419章处置结果与伤害回查。', authorDecision: '高风险先处置与随机基线并行；正常项/不可替代项完整保留，不用312制造危机比例。', agentWork: '', completionCriteria: ['312件有分层总数', '停用不制造安全空窗', '既有伤害检索口径修正'], links: [chaptersFourHundredFourteenToFourHundredSixteen[2], 'research/镇门槊退役在用黄色通知事故链.md', 'planning/第六卷章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() }, 'navigator');
  }
  const facts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '武具风险通知当前保管链优先', statement: '只要存在未结束借用/保管任务，当前保管链优先于库存生命周期接收风险；黄色给禁止新增承载与现场三问，不统一要求放下，归还哈希后才解除订阅。', status: 'author-confirmed', evidence: [{ filePath: chaptersFourHundredFourteenToFourHundredSixteen[2], quote: '退役状态没有让借用任务一起结束。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '镇门槊黄色通知与安全卸载', statement: '23:00借出、00:58列黄、01:40通知仓库、01:44联系现场、01:52替代车到、02:03卸载；两市政撑分载，夜巡防卫/路线缩短继续，无伤。', status: 'text-explicit', evidence: [{ filePath: chaptersFourHundredFourteenToFourHundredSixteen[2], quote: '任务线。' }], updatedAt: now() },
    { id: uid('fact'), category: 'knowledge', subject: '镇门槊当前物理终态', statement: '稳脊环已拆；防兽栅斜撑卸载中第三槽偏角1.9→2.4°，无载稳定2.3°且有本次新增槽缘滑移；完整额定未知，承载红停待材料检查。', status: 'text-explicit', evidence: [{ filePath: chaptersFourHundredFourteenToFourHundredSixteen[1], quote: '槊状态由黄色转红色停止。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '312件退役在用武具', statement: '2406件目录候选中312件登记退役却存在未结束借用、长期民防配置或训练领用；这不等于312件危险，需按当前保管/载荷/风险/替代能力分层。', status: 'text-explicit', evidence: [{ filePath: chaptersFourHundredFourteenToFourHundredSixteen[2], quote: '镇门槊不是唯一一件退役在用。' }], updatedAt: now() }
  ];
  for (const fact of facts) await appendFact(fact);
  await setPosition({ filePath: chaptersFourHundredFourteenToFourHundredSixteen[2], stage: '第六卷312件退役在用武具分层处置阶段', focus: '续写第417～419章：第一条事故链没有断槊却暴露三百一十二件退役在用武具' });
}

const chaptersFourHundredSeventeenToFourHundredNineteen = ['manuscript/第六卷-人间武库/第417章-三百一十二件先按谁正在受力排序.md', 'manuscript/第六卷-人间武库/第418章-停掉一件民防工具以前先补上它守的缺口.md', 'manuscript/第六卷-人间武库/第419章-七条退役伤情里只有两条碰到额定问题.md'];
if (chaptersFourHundredSeventeenToFourHundredNineteen.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第417～419章'));
  if (current && current.status !== 'completed') await appendTask({ ...current, status: 'completed', agentWork: '312件按使用态46当前承载/97当前保管/169长期配置与证据态23硬异常/84来源黄色/205通知缺口两轴交叉；用途126民防/98训练/88临借分别先补安全缺口再停。48小时形成28承载红停、76黄色待核、167配置/来源适用且补订阅继续、41范围外/行政关闭。事故检索去掉“库存=在役”前置后找到7条伤情：1条退役训练槊尾箍拆除/旧600仍在、400课程侧滑致腕骨裂高证据；1条矿撬额定候选；5条其他机制/无关共现。', links: [...new Set([...current.links, 'research/312件退役在用武具分层处置.md', ...chaptersFourHundredSeventeenToFourHundredNineteen])], updatedAt: now() }, 'researcher');
  if (!taskTitles.has('整理312件退役在用武具分层处置')) {
    const timestamp = now();
    await appendTask({ id: uid('task'), title: '整理312件退役在用武具分层处置', description: '记录使用/证据两轴、用途替代、48小时终态、事故检索口径与7条伤情分类。', level: 'session', status: 'completed', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'high', whyNow: '312是保管/通知问题集合，不是危险率；批量停用会制造民防/训练空窗，事故共现也不能全归额定。', known: ['312件两轴分层', '28/76/167/41终态', '7伤情仅1确认1候选', '事故检索改按使用态'], missingDecisions: [], aiPreAnalysis: '交叉当前载荷与证据，按用途设计替代，再用任务号/伤员授权重查事故。', authorDecision: '不外推危机比例；正常/范围外/其他伤因完整保留。', agentWork: '已生成research/312件退役在用武具分层处置.md。', completionCriteria: ['312总数闭合', '替代不制造空窗', '伤情机制分开'], links: ['research/312件退役在用武具分层处置.md', chaptersFourHundredSeventeenToFourHundredNineteen[2]], dependencies: [], createdAt: timestamp, updatedAt: timestamp }, 'agent');
  }
  if (!taskTitles.has('续写第420～422章：七条被退役标签排除的伤情里只有两条碰到额定问题')) {
    await appendTask({ id: uid('task'), title: '续写第420～422章：七条被退役标签排除的伤情里只有两条碰到额定问题', description: '重建腕骨裂训练槊尾箍/旧600斤/400斤课程与第三槽侧滑，拆教员/场馆/附件事件/摘要继承责任和伤员参与边界，完成首条有伤旧武具事故链。', level: 'chapter', status: 'now', kind: 'review', assignee: 'editor', source: 'navigator', priority: 'critical', whyNow: '这条伤害过去被统称退役器械维护不足；需要确认是否与镇门槊同机制，但不能从今天的证据倒推五年前。', known: ['教员未越400斤课程上限', '旧页面600斤', '尾箍已拆候选', '伤员腕骨裂且已赔付'], missingDecisions: ['600斤原适用装配/时长是什么？', '侧滑证据能否独立复原？', '伤员是否愿参与追加复核？'], aiPreAnalysis: '第420章物理/版本；第421章责任/伤员边界；第422章修订与阶段结案。', authorDecision: '不重演伤害，不要求伤员证明；旧赔付不因新原因暂停，新增差额由本人选择参与。', agentWork: '', completionCriteria: ['伤前证据链可复算', '个人与系统责任分离', '事故修订不覆盖旧终态'], links: [chaptersFourHundredSeventeenToFourHundredNineteen[2], 'research/312件退役在用武具分层处置.md', 'planning/第六卷章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() }, 'navigator');
  }
  const facts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '退役在用武具使用态与证据态两轴', statement: '当前承载/保管/配置与硬异常/来源黄色/通知缺口分别建轴，不能相加或用用途替代；优先处理交叉高风险，同级才按后果/年限/价值/替代时长。', status: 'author-confirmed', evidence: [{ filePath: chaptersFourHundredSeventeenToFourHundredNineteen[0], quote: '两条轴不能相加。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '312件退役在用48小时处置', statement: '312件用途126民防/98训练/88临借；48小时全部有当前保管回执，28红停、76黄待核、167补订阅后按明确范围继续、41范围外/行政关闭。', status: 'text-explicit', evidence: [{ filePath: chaptersFourHundredSeventeenToFourHundredNineteen[1], quote: '四数合计三百一十二。' }], updatedAt: now() },
    { id: uid('fact'), category: 'knowledge', subject: '退役在用7条伤情重查', statement: '去掉在役前置后找到7条：退役训练槊尾箍拆除/旧600仍在、400课程侧滑致腕骨裂为额定高证据；矿撬为候选；其余5条搬运/表面/机构/环境/共现。', status: 'author-confirmed', evidence: [{ filePath: chaptersFourHundredSeventeenToFourHundredNineteen[2], quote: '一条额定/附件机制高证据。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '腕骨裂退役训练槊事故链', statement: '下一步从伤前尾箍/600斤来源/400斤课程/第三槽侧滑重建，不从镇门槊倒推；教员未越限、伤员已赔付且无需重演，参与追加复核由本人选择。', status: 'text-explicit', evidence: [{ filePath: chaptersFourHundredSeventeenToFourHundredNineteen[2], quote: '先处理那柄让学员腕骨裂、却被归成维护不足的退役训练槊。' }], updatedAt: now() }
  ];
  for (const fact of facts) await appendFact(fact);
  await setPosition({ filePath: chaptersFourHundredSeventeenToFourHundredNineteen[2], stage: '第六卷腕骨裂退役训练槊有伤事故链阶段', focus: '续写第420～422章：七条被退役标签排除的伤情里只有两条碰到额定问题' });
}

const chaptersFourHundredTwentyToFourHundredTwentyTwo = ['manuscript/第六卷-人间武库/第420章-四百斤没有超过一个已经失效的六百斤.md', 'manuscript/第六卷-人间武库/第421章-教员确认过六百斤没有看见尾箍条件.md', 'manuscript/第六卷-人间武库/第422章-旧事故不再只写退役器械维护不足.md'];
if (chaptersFourHundredTwentyToFourHundredTwentyTwo.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第420～422章'));
  if (current && current.status !== 'completed') await appendTask({ ...current, status: 'completed', agentWork: '真实Codex Writer仅创建第420章，独立Observer指出只读镜像不能证明教员/学员实际看见600斤；作者接受收窄为页面显示，Agent review判resolved。事故复原：600斤仅尾箍在位/固定尾座/正向/3息；尾箍事故前13日拆除，页面仍显示；400课程峰398.7未数值越限，第三槽+0.4秒横移、+0.6黄、+0.7～0.8腕峰、+0.9停课。教员确认页面但看不到条件，学员端无额定字段；责任拆到附件/状态/课程/日检，学员无系统责任。', links: [...new Set([...current.links, 'research/退役训练槊腕骨裂事故链复核.md', ...chaptersFourHundredTwentyToFourHundredTwentyTwo])], updatedAt: now() }, 'editor');
  if (!taskTitles.has('整理退役训练槊腕骨裂事故链复核')) {
    const timestamp = now();
    await appendTask({ id: uid('task'), title: '整理退役训练槊腕骨裂事故链复核', description: '记录四条伤前事实、人物知识、响应时序、责任层、伤员参与和五项规则修订。', level: 'session', status: 'completed', kind: 'review', assignee: 'editor', source: 'navigator', priority: 'high', whyNow: '旧“退役器械维护不足/学员发力不稳”把条件值失效、系统许可和第三槽先横移压给伤员与最后操作者。', known: ['600条件值历史有效', '尾箍事故前拆', '400未越限', 'Observer知识边界已闭环'], missingDecisions: [], aiPreAnalysis: '用伤前底卷/整备/镜像/控制器，分页面发送渲染确认与人物知识，再按可控动作归责。', authorDecision: '不要求伤员重演；旧赔付不撤；本人匿名校对但不自动公开或申请差额。', agentWork: '已生成research/退役训练槊腕骨裂事故链复核.md。', completionCriteria: ['伤前因果可复算', 'Agent评论复查闭环', '责任不压单人/伤员'], links: ['research/退役训练槊腕骨裂事故链复核.md', chaptersFourHundredTwentyToFourHundredTwentyTwo[2]], dependencies: [], createdAt: timestamp, updatedAt: timestamp }, 'agent');
  }
  if (!taskTitles.has('续写第423～425章：公开规则竞试第一题要求参赛者先拒绝给出新额定')) {
    await appendTask({ id: uid('task'), title: '续写第423～425章：公开规则竞试第一题要求参赛者先拒绝给出新额定', description: '发布缺装配/材料字段首题证据包，比较高额定/保守停用/条件化/拒判四类答案，建立来源/物理/范围/停止/责任五门评分并确认拒判可完成。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'critical', whyNow: '公开规则进入竞试阶段；若评分仍奖励最接近私库数字，普通团队会为得分补造缺失额定，重复旧垄断。', known: ['首题必须缺关键额定条件', '历史值/当前值分离', '拒判是合法终态', '不公开私库答案做目标'], missingDecisions: ['首题物件与缺字段是什么？', '五门是硬门槛还是加权？', '如何防所有队为安全一律拒判？'], aiPreAnalysis: '第423章证据包/预登记；第424章四答案揭示；第425章五门评分/拒判边界。', authorDecision: '拒判需指出已知/缺失/可行动下一步，不以一句“不知道”满分；错误高数不能由接近私库值获胜。', agentWork: '', completionCriteria: ['至少4类不同答案', '评分不按数值接近', '拒判与可执行停止都有证据门槛'], links: [chaptersFourHundredTwentyToFourHundredTwentyTwo[2], 'research/退役训练槊腕骨裂事故链复核.md', 'planning/第六卷章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() }, 'navigator');
  }
  const facts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '页面显示与人物实际知识分离', statement: '页面发送、终端渲染、人员确认与理解分别证明；镜像不能单独生成教员/学员知识。教员确认600页面但看不到尾箍条件，学员端无额定必读字段。', status: 'author-confirmed', evidence: [{ filePath: chaptersFourHundredTwentyToFourHundredTwentyTwo[1], quote: '确认一个错误摘要，不等于知道摘要删掉的条件。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '退役训练槊腕骨裂事故复原', statement: '600斤仅尾箍在位/固定/正向/3息；尾箍事故前13日拆。事故课程峰398.7斤；+0.4秒第三槽横移、+0.6黄、+0.7～0.8腕峰、+0.9教员停课。', status: 'text-explicit', evidence: [{ filePath: chaptersFourHundredTwentyToFourHundredTwentyTwo[2], quote: '课程授权层。' }], updatedAt: now() },
    { id: uid('fact'), category: 'decision', subject: '退役训练槊事故责任与规则修订', statement: '附件维护/状态模型/课程系统/场馆日检分别承担系统责任；教员未数值越限且黄色后无继续，学员无系统责任。removed使依赖额定未知、开课比附件哈希、本地横移先停。', status: 'author-confirmed', evidence: [{ filePath: chaptersFourHundredTwentyToFourHundredTwentyTwo[2], quote: '责任矩阵按可控动作落账。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '公开规则竞试首题拒绝新额定', statement: '下一阶段首题故意缺装配/材料条件；参赛者需从来源/物理/范围/停止/责任作答。拒判需说明缺失与下一步，不按接近私库数字排名。', status: 'text-explicit', evidence: [{ filePath: chaptersFourHundredTwentyToFourHundredTwentyTwo[2], quote: '公开规则竞试第一题，要求参赛者先拒绝给出新额定。' }], updatedAt: now() }
  ];
  for (const fact of facts) await appendFact(fact);
  await setPosition({ filePath: chaptersFourHundredTwentyToFourHundredTwentyTwo[2], stage: '第六卷公开规则竞试首题阶段', focus: '续写第423～425章：公开规则竞试第一题要求参赛者先拒绝给出新额定' });
}

const chaptersFourHundredTwentyThreeToFourHundredTwentyFive = ['manuscript/第六卷-人间武库/第423章-第一题没有足够字段算出新额定.md', 'manuscript/第六卷-人间武库/第424章-八十四斤也不是比八百四十更安全的答案.md', 'manuscript/第六卷-人间武库/第425章-拒绝给数字也要通过五道门.md'];
if (chaptersFourHundredTwentyThreeToFourHundredTwentyFive.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第423～425章'));
  if (current && current.status !== 'completed') await appendTask({ ...current, status: 'completed', agentWork: '真实Codex Writer仅创建第423章：镇河锏乙十七历史840仅专用尾盏/双叉座/正向/3次3息，当前两只无号尾盏不可识别、回火校直材料状态缺失，禁止加载/试装/破坏/同型代填。24队封卷：7 current_rating/4 temporary/6 stopped/5 unknown/2 referred；760/84等低数字、历史比例临时上限、永久停用、空白不知道、单纯交闻氏均失败。来源/物理/范围/停止为硬门，责任为第五门；8队通过，当前额定未知且保留无载/补证。', links: [...new Set([...current.links, 'research/公开规则竞试第一题评分与拒判边界.md', ...chaptersFourHundredTwentyThreeToFourHundredTwentyFive])], updatedAt: now() }, 'writer');
  if (!taskTitles.has('整理公开规则竞试第一题评分与拒判边界')) {
    const timestamp = now();
    await appendTask({ id: uid('task'), title: '整理公开规则竞试第一题评分与拒判边界', description: '记录乙十七证据/缺口/禁令、六终态、24队答案、五门评分、8队终态和拒判边界。', level: 'session', status: 'completed', kind: 'review', assignee: 'editor', source: 'navigator', priority: 'high', whyNow: '若竞试仍奖励接近私库数字，参赛者会用更低比例伪造安全；若unknown天然满分，又会把谨慎变成责任回避。', known: ['无隐藏当前真值', '24队五类作答', '8队五门通过', '第二题字段齐全'], missingDecisions: [], aiPreAnalysis: '先预登记答案语法与禁令，再按来源/物理/范围/停止/责任逐门，保留原始与重分类。', authorDecision: '拒判需说明已知/缺失/停止/下一步；充分证据下仍需作答。', agentWork: '已生成research/公开规则竞试第一题评分与拒判边界.md。', completionCriteria: ['不按数值接近排名', '低数/永久停用/空白拒判均被识别', '下一题检验惯性拒判'], links: ['research/公开规则竞试第一题评分与拒判边界.md', chaptersFourHundredTwentyThreeToFourHundredTwentyFive[2]], dependencies: [], createdAt: timestamp, updatedAt: timestamp }, 'agent');
  }
  if (!taskTitles.has('续写第426～428章：第二题给齐了字段四支队伍仍然拒绝作答')) {
    await appendTask({ id: uid('task'), title: '续写第426～428章：第二题给齐了字段四支队伍仍然拒绝作答', description: '发布字段齐全且任务明确的第二题，对照惯性拒判与给值答案，拆分证据谨慎、责任回避和新异常阻塞，修订充分证据下的作答门。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'critical', whyNow: '首题最高分队中4支把unknown学成永远安全答案；公共方法必须既允许证据不足时拒判，也要求充分证据下承担有限结论。', known: ['第二题主体/附件/材料/方向/支撑/时长/残余/失效触发齐全', '任务需要临时上限', '4支高分队惯性unknown', '新异常仍可触发停止'], missingDecisions: ['第二题具体武具和任务是什么？', '充分证据门如何判？', '哪一种现场异常值得停止而非惯性拒判？'], aiPreAnalysis: '第426章题面/必须作答边界；第427章答案与异常；第428章评分修订。', authorDecision: '无理由拒判不能通过；若出现题面外新物理异常，停止仍优先且需证据。', agentWork: '', completionCriteria: ['充分字段可形成限定结论', '惯性unknown与真实阻塞可分', '作答门不取消停止权'], links: [chaptersFourHundredTwentyThreeToFourHundredTwentyFive[2], 'research/公开规则竞试第一题评分与拒判边界.md', 'planning/第六卷章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() }, 'navigator');
  }
  const facts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '公开规则竞试五门评分', statement: '来源/物理/范围/停止为硬门，任一失败不可用速度/解释补分；责任门说明谁补何字段与所有者选择。五门全过才比清晰、复现与时间。', status: 'author-confirmed', evidence: [{ filePath: chaptersFourHundredTwentyThreeToFourHundredTwentyFive[1], quote: '拒绝给数字也要通过五道门。' }], updatedAt: now() },
    { id: uid('fact'), category: 'knowledge', subject: '镇河锏乙十七首题终态', statement: '历史840仅专用尾盏/双叉座/正向/3次3息；当前无载六槽响应，但尾盏身份和回火内部材料不可确认。当前额定未知，禁加载/试装，允许无载/材料检查/来源穷尽。', status: 'author-confirmed', evidence: [{ filePath: chaptersFourHundredTwentyThreeToFourHundredTwentyFive[2], quote: '乙十七当前额定未知。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '公开规则竞试第一题结果', statement: '24队原始7当前额定/4临时/6停止/5未知/2转介；8队五门全过。无隐藏当前真值，不按数值接近840排名；历史840保留原条件。', status: 'text-explicit', evidence: [{ filePath: chaptersFourHundredTwentyThreeToFourHundredTwentyFive[2], quote: '二十四队最终有八队五门全过。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '竞试第二题充分证据与惯性拒判', statement: '第二题主体/附件/材料/方向/支撑/时长/残余/失效触发齐全且需临时上限；首题高分4队仍unknown，下一步区分谨慎回避与题面外真实异常。', status: 'text-explicit', evidence: [{ filePath: chaptersFourHundredTwentyThreeToFourHundredTwentyFive[2], quote: '第二题给齐了字段，四支队伍仍然拒绝作答。' }], updatedAt: now() }
  ];
  for (const fact of facts) await appendFact(fact);
  await setPosition({ filePath: chaptersFourHundredTwentyThreeToFourHundredTwentyFive[2], stage: '第六卷竞试第二题充分证据作答阶段', focus: '续写第426～428章：第二题给齐了字段四支队伍仍然拒绝作答' });
}

const chaptersFourHundredTwentySixToFourHundredTwentyEight = ['manuscript/第六卷-人间武库/第426章-字段齐全现场温度却低了七度.md', 'manuscript/第六卷-人间武库/第427章-停止到十八度不是停止到永远.md', 'manuscript/第六卷-人间武库/第428章-充分证据门不取消任何人的停止权.md'];
if (chaptersFourHundredTwentySixToFourHundredTwentyEight.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第426～428章'));
  if (current && current.status !== 'completed') await appendTask({ ...current, status: 'completed', agentWork: '第二题丙四主体/双翼托/材料/方向/支撑/时长/残余/失效触发完整：300～500通过，600第五槽趋势停止，历史验证18～22°C；开题内层11°C/外层14°C，当前停止并自然回温。47分钟后内层18、内外差降1.3、工具/无载通过。本轮24队最终9条件化500斤临时上限、4具体新异常停止通过，7惯性unknown/永久封存、4十一度直接给值失败。新增充分证据门：字段与条件齐全时必须提交最窄结论或具体异常；停止权不因充分字段取消。', links: [...new Set([...current.links, 'research/公开规则竞试第二题充分证据作答门.md', ...chaptersFourHundredTwentySixToFourHundredTwentyEight])], updatedAt: now() }, 'writer');
  if (!taskTitles.has('整理公开规则竞试第二题充分证据作答门')) {
    const timestamp = now();
    await appendTask({ id: uid('task'), title: '整理公开规则竞试第二题充分证据作答门', description: '记录丙四完整来源、温度失配、两时点答案、24队结果和第六门边界。', level: 'session', status: 'completed', kind: 'review', assignee: 'editor', source: 'navigator', priority: 'high', whyNow: '首题奖励证据不足时拒判，第二题需防unknown变成无需承担判断的永久安全答案，同时保留真实新异常停止。', known: ['500通过/600停止', '11°C当前阻断', '9条件上限/4异常停', '充分证据第六门'], missingDecisions: [], aiPreAnalysis: '把当前停止与条件恢复后作答分时点，再按缺失能否解决区分谨慎与回避。', authorDecision: '无理由拒判不通过；新物理/工具/任务异常仍可停。', agentWork: '已生成research/公开规则竞试第二题充分证据作答门.md。', completionCriteria: ['充分条件可作答', '后来安全不倒写过早给值', '新异常仍有停止权'], links: ['research/公开规则竞试第二题充分证据作答门.md', chaptersFourHundredTwentySixToFourHundredTwentyEight[2]], dependencies: [], createdAt: timestamp, updatedAt: timestamp }, 'agent');
  }
  if (!taskTitles.has('续写第429～431章：第三题允许两支队伍得出不同临时上限')) {
    await appendTask({ id: uid('task'), title: '续写第429～431章：第三题允许两支队伍得出不同临时上限', description: '同一武具给两种任务和两档工具级，要求分别形成条件化终态；比较不同上限/停止路径，确认差异来自任务与工具而非能力排名，完成竞试阶段。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'critical', whyNow: '前两题仍收敛到一个当前终态；第三题需证明公共方法可在不同任务/工具下产生多个同时有效答案，但不能跨条件传播。', known: ['同一主体可有多个任务范围', 'A/B/C工具级权能不同', '临时上限不等完整额定', '竞试阶段剩3章'], missingDecisions: ['第三题武具/任务组合？', '不同上限如何共同验证？', '何时差异代表错误而非条件不同？'], aiPreAnalysis: '第429章双任务双工具题面；第430章两答案/交叉复核；第431章多答案隔离与阶段结案。', authorDecision: '不要求唯一数字；每个结果携任务/装配/工具/时长/失效触发，跨范围引用失败。', agentWork: '', completionCriteria: ['至少2个不同合法终态', '差异有条件因果', '竞试阶段结案并进入武库深层争议'], links: [chaptersFourHundredTwentySixToFourHundredTwentyEight[2], 'research/公开规则竞试第二题充分证据作答门.md', 'planning/第六卷章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() }, 'navigator');
  }
  const facts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '充分证据门与停止权并存', statement: '前五门通过且任务字段/当前条件齐全时，必须提交最窄结论或具体新异常；普遍“总有未知”不完成。新物理/工具/任务矛盾仍可stopped/referred。', status: 'author-confirmed', evidence: [{ filePath: chaptersFourHundredTwentySixToFourHundredTwentyEight[2], quote: '充分证据门不取消任何人的停止权。' }], updatedAt: now() },
    { id: uid('fact'), category: 'knowledge', subject: '丙四防洪后撑临时上限', statement: '双翼托在位、主轴静压≤20分钟；300～500通过，600趋势停止。验证窗18～22°C；条件/工具/无载复查通过后，本次temporary_task_limit=500斤，不转完整额定。', status: 'author-confirmed', evidence: [{ filePath: chaptersFourHundredTwentySixToFourHundredTwentyEight[2], quote: '九队形成条件化五百斤临时上限。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '公开规则竞试第二题结果', statement: '开题内层11°C、外层14°C先停；47分钟后内层18、温差1.3且复测通过。24队最终9条件500、4具体异常停通过，7惯性拒判、4低温直接500失败。', status: 'text-explicit', evidence: [{ filePath: chaptersFourHundredTwentySixToFourHundredTwentyEight[2], quote: '九加四加七加四，合计二十四。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '竞试第三题多任务多上限', statement: '第三题同一武具提供两种任务与不同工具级，允许两支队形成不同临时上限/停止路径；结果必须携范围，跨条件传播失败，阶段后进入武库深层争议。', status: 'text-explicit', evidence: [{ filePath: chaptersFourHundredTwentySixToFourHundredTwentyEight[2], quote: '第三题允许两支队伍得出不同临时上限。' }], updatedAt: now() }
  ];
  for (const fact of facts) await appendFact(fact);
  await setPosition({ filePath: chaptersFourHundredTwentySixToFourHundredTwentyEight[2], stage: '第六卷竞试第三题多任务多上限阶段', focus: '续写第429～431章：第三题允许两支队伍得出不同临时上限' });
}

const chaptersFourHundredTwentyNineToFourHundredThirtyOne = ['manuscript/第六卷-人间武库/第429章-同一件武具领到两张不同任务卡.md', 'manuscript/第六卷-人间武库/第430章-三百二十和五百可以同时正确.md', 'manuscript/第六卷-人间武库/第431章-多答案有效不等于可以互相借用.md'];
if (chaptersFourHundredTwentyNineToFourHundredThirtyOne.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第429～431章'));
  if (current && current.status !== 'completed') await appendTask({ ...current, status: 'completed', agentWork: '第三题同一丁六分A卡主轴静压25分钟/B档和B卡3次×3息/A档：持续曲线320通过、400累积残余停；短时500通过、600停，合法validated_task_limit分别320/500；4队B卡+C档仅可硬筛转介。区分验证上限与所有者操作限值（如A验证320/操作280、B验证500/操作450）。统一500越持续范围，统一320若冒充B验证值失实；跨工具/附件哈希借用拒绝。24队15完成（9任务数字/3转介/1新异常停/2部分），竞试阶段结案，深层只读门开放。', links: [...new Set([...current.links, 'research/公开规则竞试第三题多上限条件隔离.md', ...chaptersFourHundredTwentyNineToFourHundredThirtyOne])], updatedAt: now() }, 'writer');
  if (!taskTitles.has('整理公开规则竞试第三题多上限条件隔离')) {
    const timestamp = now();
    await appendTask({ id: uid('task'), title: '整理公开规则竞试第三题多上限条件隔离', description: '记录丁六双任务双工具、320/500来源、验证上限/操作限值、答案与错误借用、阶段结案。', level: 'session', status: 'completed', kind: 'review', assignee: 'editor', source: 'navigator', priority: 'high', whyNow: '若竞试只接受一个数字，会删除时长/工具/任务；若低值一律安全，又会把所有者选择冒充物理验证边界。', known: ['A320/B500均合法', 'C档转介', 'validated与operating分开', '15/24完成'], missingDecisions: [], aiPreAnalysis: '同一主体只改变任务/工具，交叉测试统一数字与跨条件引用。', authorDecision: '允许多答案但强制条件指纹；数值大小不排名。', agentWork: '已生成research/公开规则竞试第三题多上限条件隔离.md。', completionCriteria: ['两合法上限可复算', '跨条件借用拒绝', '竞试三题完整结案'], links: ['research/公开规则竞试第三题多上限条件隔离.md', chaptersFourHundredTwentyNineToFourHundredThirtyOne[2]], dependencies: [], createdAt: timestamp, updatedAt: timestamp }, 'agent');
  }
  if (!taskTitles.has('续写第432～434章：竞试通过只打开武库深层的一扇只读门')) {
    await appendTask({ id: uid('task'), title: '续写第432～434章：竞试通过只打开武库深层的一扇只读门', description: '定义深层只读字段层、访问角色与禁止动作，拆闻氏设计所有权和公共停止必要字段审查冲突，选择首批对象与审计协议，形成准入但不自动公开。', level: 'chapter', status: 'now', kind: 'review', assignee: 'editor', source: 'navigator', priority: 'critical', whyNow: '竞试验证了方法，不授实物/加载权；深层库既含制造秘密也含公共事故所需字段，必须先分层再读。', known: ['深层只读门已开放', '无实物/加载权', '设计片段权利方同意条款', '公共停止字段审查反条件'], missingDecisions: ['哪些字段只读可见？', '首批对象如何选？', '读后候选何时能公开？'], aiPreAnalysis: '第432章访问协议；第433章冲突模型；第434章首批只读终态。', authorDecision: '读取不等于公开/所有权转移；影响公共停止的字段可受独立审查但不自动全文公开。', agentWork: '', completionCriteria: ['权限和禁止动作明确', '两类权利不互相吞并', '首批对象/审计可执行'], links: [chaptersFourHundredTwentyNineToFourHundredThirtyOne[2], 'research/公开规则竞试第三题多上限条件隔离.md', 'planning/第六卷章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() }, 'navigator');
  }
  const facts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '验证临时上限与所有者操作限值分离', statement: 'validated_task_limit描述证据在任务条件支持到哪里；operating_cap是所有者在其内实际允许值，可因接管/保险更低，不改写物理。操作限值不得高于验证上限。', status: 'author-confirmed', evidence: [{ filePath: chaptersFourHundredTwentyNineToFourHundredThirtyOne[0], quote: '证据支持的临时上限与所有者为人员、成本或设备余量设置的操作限值不能都叫“上限”。' }], updatedAt: now() },
    { id: uid('fact'), category: 'knowledge', subject: '丁六双任务临时上限', statement: 'A卡持续25分钟/B档：320通过、400累积残余停，验证320；B卡3次3息/A档：500通过、600残余停，验证500。C档只能硬筛转介。', status: 'author-confirmed', evidence: [{ filePath: chaptersFourHundredTwentyNineToFourHundredThirtyOne[2], quote: 'A卡验证临时上限三百二十斤。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '公开规则竞试三题结案', statement: '第三题24队15完成：9任务数字、3转介、1新异常停、2部分；其余9因统一数字/工具越权/范围混淆/永久停用失败。三题验证拒判、充分作答和多答案隔离。', status: 'text-explicit', evidence: [{ filePath: chaptersFourHundredTwentyNineToFourHundredThirtyOne[2], quote: '公开规则竞试阶段完成三项验证。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '人间武库深层只读门', statement: '竞试后仅开放深层设计/维护/事故索引只读分层，无实物/加载权。设计权利方同意与公共停止必要字段独立审查条件冲突，待访问协议。', status: 'text-explicit', evidence: [{ filePath: chaptersFourHundredTwentyNineToFourHundredThirtyOne[2], quote: '竞试通过只打开武库深层的一扇只读门。' }], updatedAt: now() }
  ];
  for (const fact of facts) await appendFact(fact);
  await setPosition({ filePath: chaptersFourHundredTwentyNineToFourHundredThirtyOne[2], stage: '第六卷武库深层只读准入与所有权争议阶段', focus: '续写第432～434章：竞试通过只打开武库深层的一扇只读门' });
}

const chaptersFourHundredThirtyTwoToFourHundredThirtyFour = ['manuscript/第六卷-人间武库/第432章-只读门后没有一份所有人都能看的档案.md', 'manuscript/第六卷-人间武库/第433章-影响停止的字段不一定要公开原始配方.md', 'manuscript/第六卷-人间武库/第434章-首批只读对象不是最值钱的三件武具.md'];
if (chaptersFourHundredThirtyTwoToFourHundredThirtyFour.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第432～434章'));
  if (current && current.status !== 'completed') await appendTask({ ...current, status: 'completed', agentWork: '深层档案按白公共工程/黄受控安全/黑制造秘密/红在役身份逐字段分层；普通工坊/独立安全/权利方/身份托管角色分权，只能签名摘录，不授原件、实物或加载权。必要字段四问拆所有权与公共安全：玄脊8%由黑配方模型与黄标准曲线双复算，配方不公开；止浪弩最小厚度/量具为公共必要，特殊槽形只提速保持黑；折甲锤“可用”仅机构解锁、无承载数据，改机构可动/承载未知并复核32引用。首批准入通过，原件未公开。', links: [...new Set([...current.links, 'research/人间武库深层只读准入与必要字段审查.md', 'decisions/武库深层只读与公共必要字段协议.md', ...chaptersFourHundredThirtyTwoToFourHundredThirtyFour])], updatedAt: now() }, 'editor');
  if (!taskTitles.has('整理人间武库深层只读准入与必要字段审查')) {
    const timestamp = now();
    await appendTask({ id: uid('task'), title: '整理人间武库深层只读准入与必要字段审查', description: '记录四层字段、角色、签名摘录、必要字段四问、三对象终态与只读边界。', level: 'session', status: 'completed', kind: 'review', assignee: 'editor', source: 'navigator', priority: 'high', whyNow: '整页所有权会把公共因果锁进配方，整页安全公开又会吞制造与在役隐私；需逐字段、角色和最小证据。', known: ['白黄黑红分层', '签名摘录/无原件公开', '三首批终态不同', '所有权/审查分离'], missingDecisions: [], aiPreAnalysis: '用必要性、最小替代、公开/受控、重识别四问处理字段而非整页。', authorDecision: '影响停止可独审，不自动公开配方；读取不等于公开/所有权/加载。', agentWork: '已生成research/人间武库深层只读准入与必要字段审查.md和decisions/武库深层只读与公共必要字段协议.md。', completionCriteria: ['字段/角色分层完整', '权利与安全不互吞', '首批访问可审计'], links: ['research/人间武库深层只读准入与必要字段审查.md', 'decisions/武库深层只读与公共必要字段协议.md', chaptersFourHundredThirtyTwoToFourHundredThirtyFour[2]], dependencies: [], createdAt: timestamp, updatedAt: timestamp }, 'agent');
  }
  if (!taskTitles.has('续写第435～437章：第一份只读记录证明闻氏阈值正确却不能公开制造公式')) {
    await appendTask({ id: uid('task'), title: '续写第435～437章：第一份只读记录证明闻氏阈值正确却不能公开制造公式', description: '复算玄脊刀8%阈值的黑配方模型与黄标准曲线，拆阈值正确/公式公开，确定外部复现最小证据，完成受控复算—公共摘录闭环并审解释权。', level: 'chapter', status: 'now', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'critical', whyNow: '首批只读协议成立后需用一条真实记录证明独立复算不是权利方签字换皮，也不要求泄配方。', known: ['玄脊8%公共门槛', '黑配方/黄曲线双窗口', '18～24°C材料族范围', '配方版本不自动改公共门槛'], missingDecisions: ['独立复算需要几名/何数据？', '摘录如何让外部验证不还原配方？', '闻氏异议如何保留？'], aiPreAnalysis: '第435章双侧复算；第436章最小公共证据；第437章闭环/解释权审计。', authorDecision: '阈值正确可确认，公式仍私有；无独立复算不得作为公共规则唯一依据。', agentWork: '', completionCriteria: ['复算数值/误差可审', '外部最小证据可复现', '配方不可逆还原风险受控'], links: [chaptersFourHundredThirtyTwoToFourHundredThirtyFour[2], 'research/人间武库深层只读准入与必要字段审查.md', 'planning/第六卷章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() }, 'navigator');
  }
  const facts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '武库深层白黄黑红字段与角色化只读', statement: '公共工程/受控安全/制造秘密/在役身份逐字段分层；工坊/独立安全/权利方/身份托管按任务读，签名摘录证明复算但不还原原件，读取不授实物/加载。', status: 'author-confirmed', evidence: [{ filePath: chaptersFourHundredThirtyTwoToFourHundredThirtyFour[0], quote: '只读门后没有一份所有人都能看的档案。' }], updatedAt: now() },
    { id: uid('fact'), category: 'decision', subject: '公共停止必要字段四问', statement: '字段是否改允许/停止/责任；能否以更少敏感信息验证；需公开或受控独审；是否反推在役/个人。影响安全不自动公开完整配方，所有权不拒绝必要审查。', status: 'author-confirmed', evidence: [{ filePath: chaptersFourHundredThirtyTwoToFourHundredThirtyFour[1], quote: '影响停止的字段不一定要公开原始配方。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '人间武库深层首批只读终态', statement: '玄脊8%双侧复算成立、配方私有；止浪弩厚度/量具公共候选而槽形私有；折甲锤可用仅机构动作、承载未知，32件引用追加复核。', status: 'text-explicit', evidence: [{ filePath: chaptersFourHundredThirtyTwoToFourHundredThirtyFour[2], quote: '首批只读终态因此不同。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '玄脊刀8%受控复算与公共摘录', statement: '下一步以黑配方模型/黄标准化曲线复算8%门槛，确认阈值正确与公式私有可并存，并使外部从最小证据验证而不可还原配方。', status: 'text-explicit', evidence: [{ filePath: chaptersFourHundredThirtyTwoToFourHundredThirtyFour[2], quote: '第一份只读记录证明闻氏的阈值正确却不能公开制造公式。' }], updatedAt: now() }
  ];
  for (const fact of facts) await appendFact(fact);
  await setPosition({ filePath: chaptersFourHundredThirtyTwoToFourHundredThirtyFour[2], stage: '第六卷玄脊阈值受控复算与公共摘录阶段', focus: '续写第435～437章：第一份只读记录证明闻氏阈值正确却不能公开制造公式' });
}

const chaptersFourHundredThirtyFiveToFourHundredThirtySeven = ['manuscript/第六卷-人间武库/第435章-配方模型和实测曲线在八附近相遇.md', 'manuscript/第六卷-人间武库/第436章-外部复现需要曲线不需要闻氏配方.md', 'manuscript/第六卷-人间武库/第437章-第四种材料在百分之六就要求停止.md'];
if (chaptersFourHundredThirtyFiveToFourHundredThirtySeven.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第435～437章'));
  if (current && current.status !== 'completed') await appendTask({ ...current, status: 'completed', agentWork: '玄脊W-12黑模型两隔离复算8.2/8.3；黄32组（24建立+8预封存留出）比较8.5漏裂片与7.5早停，支持公共8.0但保留<7.5损伤、>8未裂反例。白3供应方×6片、3实验室观察7.8～8.5，并以B档重读同载荷级；重识别仍>8候选，配方私有。D材料3片在6.1/6.3/6.4下一档层间滑移，经双设备与A族对照排工具；D不继承8%，也不直接把6.3定新门槛。黑/黄/白/D四来源并列，首个受控复算—公共摘录闭环完成。', links: [...new Set([...current.links, 'research/玄脊刀8阈值受控复算与公共摘录.md', ...chaptersFourHundredThirtyFiveToFourHundredThirtySeven])], updatedAt: now() }, 'researcher');
  if (!taskTitles.has('整理玄脊刀8阈值受控复算与公共摘录')) {
    const timestamp = now();
    await appendTask({ id: uid('task'), title: '整理玄脊刀8阈值受控复算与公共摘录', description: '记录黑W-12、黄32组、白18片、重识别、D反例和四来源终态。', level: 'session', status: 'completed', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'high', whyNow: '必须证明配方不公开仍可外部复现，也防公共8%跨材料扩张；正确阈值不能靠闻氏单签。', known: ['W-12 8.2/8.3', '黄留出支持8', '白跨实验室复现', 'D六点反例'], missingDecisions: [], aiPreAnalysis: '建立/留出分离，外部标准片与重识别双测，再以新材料反例锁范围。', authorDecision: '配方私有、阈值可复现；D另建建立级验证。', agentWork: '已生成research/玄脊刀8阈值受控复算与公共摘录.md。', completionCriteria: ['黑黄白独立性可审', '反例与代价公开', '配方不可还原且范围不扩张'], links: ['research/玄脊刀8阈值受控复算与公共摘录.md', chaptersFourHundredThirtyFiveToFourHundredThirtySeven[2]], dependencies: [], createdAt: timestamp, updatedAt: timestamp }, 'agent');
  }
  if (!taskTitles.has('续写第438～440章：深层库里三十二个可用没有一个能证明承载')) {
    await appendTask({ id: uid('task'), title: '续写第438～440章：深层库里三十二个可用没有一个能证明承载', description: '精确通知折甲锤32引用与9当前保管人，冻结承载含义而非实物；逐件拆机构动作/承载来源/使用态和训练民防替代，完成深层争议阶段结案。', level: 'chapter', status: 'now', kind: 'review', assignee: 'editor', source: 'navigator', priority: 'critical', whyNow: '深层原件证明“可用”只指机构解锁，但9件已进入训练/民防；批量宣布报废会制造恐慌，继续承载又无证据。', known: ['32引用', '9当前保管', '机构可动/承载未知', '只读协议已通过'], missingDecisions: ['9件各自当前载荷/替代？', '其余23件如何通知？', '权利方旧摘要责任如何记录？'], aiPreAnalysis: '第438章影响集合/通知；第439章9件现场+23件来源；第440章语义修订/阶段结案。', authorDecision: '冻结承载许可，不冻结无载机构检查；不把私库无数据写成故意隐瞒。', agentWork: '', completionCriteria: ['32总数闭合', '9当前任务无安全空窗', '可用语义/责任/深层协议结案'], links: [chaptersFourHundredThirtyFiveToFourHundredThirtySeven[2], 'research/玄脊刀8阈值受控复算与公共摘录.md', 'planning/第六卷章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() }, 'navigator');
  }
  const facts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '受控模型与公共阈值多来源并列', statement: '公共阈值可由黑配方模型、黄历史/留出、白外部试片和范围反例并列支撑；任一版本变化触发证据重算，不由权利方单签开关，也不要求公开公式。', status: 'author-confirmed', evidence: [{ filePath: chaptersFourHundredThirtyFiveToFourHundredThirtySeven[2], quote: '页面并列四条来源。' }], updatedAt: now() },
    { id: uid('fact'), category: 'knowledge', subject: '玄脊刀8%阈值复算范围', statement: 'W-12黑复算8.2/8.3；黄32组与留出、白18片跨供应/实验室支持8%操作级，仅A～C、18～24°C、对应L6第五槽类结构；不是绝对安全。', status: 'author-confirmed', evidence: [{ filePath: chaptersFourHundredThirtyFiveToFourHundredThirtySeven[0], quote: '两条独立路径在八附近相遇。' }], updatedAt: now() },
    { id: uid('fact'), category: 'knowledge', subject: '材料族D不可继承8%门槛', statement: 'D三片在刚度降6.1/6.3/6.4时下一档层间滑移，双设备/A族对照削弱工具因素；D当前停/转专项，三片不足以定6.3新公共门槛。', status: 'author-confirmed', evidence: [{ filePath: chaptersFourHundredThirtyFiveToFourHundredThirtySeven[2], quote: '第四种材料在百分之六就要求停止。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '折甲锤32个可用引用语义复核', statement: '深层原件仅证明机构解锁，无承载曲线；32引用中9件已在训练/民防当前保管。下一步冻结承载含义、现场替代并修订可用语义，不批量报废。', status: 'text-explicit', evidence: [{ filePath: chaptersFourHundredThirtyFiveToFourHundredThirtySeven[2], quote: '深层库里三十二个“可用”没有一个能证明承载。' }], updatedAt: now() }
  ];
  for (const fact of facts) await appendFact(fact);
  await setPosition({ filePath: chaptersFourHundredThirtyFiveToFourHundredThirtySeven[2], stage: '第六卷折甲锤可用语义与深层争议结案阶段', focus: '续写第438～440章：深层库里三十二个可用没有一个能证明承载' });
}

const chaptersFourHundredThirtyEightToFourHundredForty = ['manuscript/第六卷-人间武库/第438章-冻结可用两个字没有冻结三十二件锤.md', 'manuscript/第六卷-人间武库/第439章-机构会动和锤头能承载分成两行.md', 'manuscript/第六卷-人间武库/第440章-深层只读门没有把私库变成公共仓库.md'];
if (chaptersFourHundredThirtyEightToFourHundredForty.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第438～440章'));
  if (current && current.status !== 'completed') await appendTask({ ...current, status: 'completed', agentWork: '深层原件只证明折甲锤机构解锁；冻结“可用”的承载含义，精确通知32引用/9当前保管，训练/民防/工坊/救援分别替代且无伤。32终态：8独立承载来源、13 mechanism_operable/load_unknown、4物理红、5范围外、2重复别名；47下游（19课程/11民防/9委托/8库存）逐条修订。深层首轮21黄读取/6黑复算/9白摘录/0红身份、0原件修改导出加载；五条边界结案。闻氏继续合作，另7家因配方/赔付/评价权/内部分裂冻结来源可验证入口。', links: [...new Set([...current.links, 'research/折甲锤32可用引用语义与下游复核.md', ...chaptersFourHundredThirtyEightToFourHundredForty])], updatedAt: now() }, 'editor');
  if (!taskTitles.has('整理折甲锤32可用引用语义与下游复核')) {
    const timestamp = now();
    await appendTask({ id: uid('task'), title: '整理折甲锤32可用引用语义与下游复核', description: '记录深层原意、9当前保管、32主引用、字段责任、47下游、只读审计和阶段结论。', level: 'session', status: 'completed', kind: 'review', assignee: 'editor', source: 'navigator', priority: 'high', whyNow: '只改当前页面会让训练/民防/委托缓存继续把机构动作当承载；批量报废又会抹独立来源/范围外/重复关系。', known: ['32五组闭合', '47下游终态', '只读首轮0越权', '7家冻结入口'], missingDecisions: [], aiPreAnalysis: '先精确冻结语义，再逐件/下游按引用类型修复，最后审只读协议。', authorDecision: '冻结承载许可不冻结实物/机构；私库无数据不写故意隐瞒。', agentWork: '已生成research/折甲锤32可用引用语义与下游复核.md。', completionCriteria: ['32/47总数闭合', '当前任务无空窗', '深层五边界结案'], links: ['research/折甲锤32可用引用语义与下游复核.md', chaptersFourHundredThirtyEightToFourHundredForty[2]], dependencies: [], createdAt: timestamp, updatedAt: timestamp }, 'agent');
  }
  if (!taskTitles.has('续写第441～443章：七家维护库没有关闭算法先关闭了来源卡入口')) {
    await appendTask({ id: uid('task'), title: '续写第441～443章：七家维护库没有关闭算法先关闭了来源卡入口', description: '拆7家冻结原因/对象与门阀内部角色，处理来源关闭后已发布规则的证据降级、继续/暂停和替代复现，选择谈判/公共重建/法律审查并行路径。', level: 'chapter', status: 'now', kind: 'review', assignee: 'editor', source: 'navigator', priority: 'critical', whyNow: '深层只读证明可审不夺配方后，7家仍因不同利益冻结验证入口；若统一成门阀反扑会错过可谈/可重建/需审查的不同路径。', known: ['7家冻结来源可验证', '2配方反演担忧', '2赔付未决', '1评价权反对/2内部分裂'], missingDecisions: ['哪些规则立即降级？', '哪些有公共独立复现可继续？', '维护组与所有权部门如何分别参与？'], aiPreAnalysis: '第441章拆七家；第442章证据图降级；第443章并行应对和阶段入口。', authorDecision: '不把来源关闭当算法删除；按证据依赖降级，保留每家异议与内部角色。', agentWork: '', completionCriteria: ['七家不合并', '规则逐条继续/暂停', '三条应对路径有权限/代价'], links: [chaptersFourHundredThirtyEightToFourHundredForty[2], 'research/折甲锤32可用引用语义与下游复核.md', 'planning/第六卷章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() }, 'navigator');
  }
  const facts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '机构动作与承载状态分离', statement: 'mechanism_operable只证明展开/锁定等机构动作，load_status需独立来源；界面不得总usable。摘要冻结不冻结实物/无载维修，机构能动也不覆盖物理红色。', status: 'author-confirmed', evidence: [{ filePath: chaptersFourHundredThirtyEightToFourHundredForty[1], quote: '机构会动和锤头能承载分成两行。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '折甲锤32可用引用与47下游复核', statement: '32终态8独立承载、13机构可动承载未知、4物理红、5范围外、2重复别名；47下游19课程/11民防/9委托/8库存逐条结案，9当前保管无伤/空窗。', status: 'text-explicit', evidence: [{ filePath: chaptersFourHundredThirtyEightToFourHundredForty[2], quote: '四十七条全部有终态。' }], updatedAt: now() },
    { id: uid('fact'), category: 'decision', subject: '武库深层首轮只读五边界', statement: '竞试只授只读；必要字段可审且配方受控替代；所有权不要求外部相信/安全不取得全部设计；读/摘/公开分权；私库无数据即未知。', status: 'author-confirmed', evidence: [{ filePath: chaptersFourHundredThirtyEightToFourHundredForty[2], quote: '深层争议阶段结案有五条。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '七家维护库来源入口冻结', statement: '闻氏继续合作；另7家将来源卡由受控可验证改仅内部可见：2担心配方反演、2等赔付、1反对公共评价、2维护/所有权内部分裂。算法与历史未删除。', status: 'text-explicit', evidence: [{ filePath: chaptersFourHundredThirtyEightToFourHundredForty[2], quote: '七家维护库没有关闭算法，先关闭了来源卡入口。' }], updatedAt: now() }
  ];
  for (const fact of facts) await appendFact(fact);
  await setPosition({ filePath: chaptersFourHundredThirtyEightToFourHundredForty[2], stage: '第六卷七家维护库来源冻结与门阀分裂阶段', focus: '续写第441～443章：七家维护库没有关闭算法先关闭了来源卡入口' });
}

const chaptersFourHundredFortyOneToFourHundredFortyThree = ['manuscript/第六卷-人间武库/第441章-七家来源库先按为什么冻结分开.md', 'manuscript/第六卷-人间武库/第442章-来源入口关闭没有把历史摘录一起删除.md', 'manuscript/第六卷-人间武库/第443章-七家冻结需要四条不同的恢复路径.md'];
if (chaptersFourHundredFortyOneToFourHundredFortyThree.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第441～443章'));
  if (current && current.status !== 'completed') await appendTask({ ...current, status: 'completed', agentWork: '将7家按配方反演/赔付前置/评价权限/内部授权拆开，逐条审71条依赖：38有独立来源（29原范围继续、9收窄且审计转黄）、12唯一持续来源（7新增许可暂停、5历史保守停止保留）、21候选不生效。建立持续有效/缩减审计/暂停新增/历史证据四行状态。恢复走公共重建、7日赔付窄桥、评价权审查、章程授权四路：赔付两库窄开2张紧急卡，分裂甲按72小时安全签证恢复4条，其他保持关闭或重建；来源恢复不自动恢复规则。', links: [...new Set([...current.links, 'research/七家维护库来源冻结与规则证据降级.md', 'decisions/七家来源冻结分层应对.md', ...chaptersFourHundredFortyOneToFourHundredFortyThree])], updatedAt: now() }, 'editor');
  if (!taskTitles.has('整理七家维护库来源冻结与规则证据降级')) {
    const timestamp = now();
    await appendTask({ id: uid('task'), title: '整理七家维护库来源冻结与规则证据降级', description: '记录七家四类原因、71条依赖、四行证据状态、四条恢复路径与阶段终态。', level: 'session', status: 'completed', kind: 'review', assignee: 'editor', source: 'navigator', priority: 'high', whyNow: '来源入口、历史事实、当前规则和新增许可若被一个库级开关覆盖，会让保守停止失效或让旧签名变成永久许可。', known: ['7家四类冻结', '71条依赖闭合', '4行证据状态', '4条恢复路径'], missingDecisions: [], aiPreAnalysis: '按原因和证据依赖逐条降级，再把取证恢复与规则重启拆开。', authorDecision: '不将七家写成统一反派；旧签名保留但不冒充当前许可，来源重开不自动回绿。', agentWork: '已生成research/七家维护库来源冻结与规则证据降级.md和decisions/七家来源冻结分层应对.md。', completionCriteria: ['七家异议不合并', '71条总数闭合', '继续/收窄/暂停/候选可追溯'], links: ['research/七家维护库来源冻结与规则证据降级.md', 'decisions/七家来源冻结分层应对.md', chaptersFourHundredFortyOneToFourHundredFortyThree[2]], dependencies: [], createdAt: timestamp, updatedAt: timestamp }, 'agent');
  }
  if (!taskTitles.has('续写第444～446章：两家维护组愿意恢复验证所有权部门不承认他们有权签字')) {
    await appendTask({ id: uid('task'), title: '续写第444～446章：两家维护组愿意恢复验证所有权部门不承认他们有权签字', description: '审两家分裂库章程与真实签证动作，拆技术事实确认、紧急停止、摘录发布和长期责任，完成一库有限恢复、一库维持关闭并转公共复现。', level: 'chapter', status: 'now', kind: 'review', assignee: 'editor', source: 'navigator', priority: 'critical', whyNow: '合作意愿不等于对外授权；若让维护员越权签全部结论，会使后续证据无效，若所有权一票否决即时安全确认，又会制造正在使用的空窗。', known: ['分裂甲有72小时紧急安全条款', '分裂乙仅内部保养权', '技术确认与公开许可不同', '规则恢复需另审'], missingDecisions: ['技术签证可暴露哪些字段？', '紧急停止到期如何承接？', '乙库无授权时公共复现如何排优先级？'], aiPreAnalysis: '第444章呈现双份相反授权；第445章拆四种权力；第446章分别执行有限恢复与外部重建。', authorDecision: '不以维护组善意越过章程，也不让所有权抹掉明确的紧急安全权。', agentWork: '', completionCriteria: ['两库章程证据可核', '四类授权不互借', '一开一关终态与后续承接完整'], links: [chaptersFourHundredFortyOneToFourHundredFortyThree[2], 'research/七家维护库来源冻结与规则证据降级.md', 'planning/第六卷章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() }, 'navigator');
  }
  const facts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '来源冻结与规则证据状态分离', statement: '来源入口关闭只影响未来取证；已签历史事实保留。规则按持续有效/缩减审计/暂停新增/历史证据分行，保守停止不会因关门消失，旧签名也不成为永久当前许可。', status: 'author-confirmed', evidence: [{ filePath: chaptersFourHundredFortyOneToFourHundredFortyThree[1], quote: '来源入口关闭没有把历史摘录一起删除。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '七家来源冻结影响71条规则', statement: '71条中38有独立来源（29原范围继续/9收窄），12唯一持续来源（7新增许可暂停/5历史保守停止保留），21未生效候选保持研究；四数关系不由库级开关覆盖。', status: 'text-explicit', evidence: [{ filePath: chaptersFourHundredFortyOneToFourHundredFortyThree[0], quote: '三十八、十二、二十一，合计七十一。' }], updatedAt: now() },
    { id: uid('fact'), category: 'decision', subject: '七家来源冻结四路恢复', statement: '配方争议公共重建并审累计反演；赔付争议走7日窄桥且不预判长期责任；评价权审公共安全判断/个人归责边界；内部分裂查技术签证、发布许可与责任章程。', status: 'author-confirmed', evidence: [{ filePath: chaptersFourHundredFortyOneToFourHundredFortyThree[2], quote: '恢复页却已经有四条进度线。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '维护技术签证与所有权发布授权冲突', statement: '分裂甲章程允许维护组签72小时紧急停止但不许可公开曲线/承认长期责任；分裂乙仅有内部保养权。下一步审四种授权，一库有限恢复、一库转公共复现。', status: 'text-explicit', evidence: [{ filePath: chaptersFourHundredFortyOneToFourHundredFortyThree[2], quote: '谁有权证明什么，谁又有权允许这份证明走出去。' }], updatedAt: now() }
  ];
  for (const fact of facts) await appendFact(fact);
  await setPosition({ filePath: chaptersFourHundredFortyOneToFourHundredFortyThree[2], stage: '第六卷维护技术签证与所有权授权分裂阶段', focus: '续写第444～446章：两家维护组愿意恢复验证所有权部门不承认他们有权签字' });
}

const chaptersFourHundredFortyFourToFourHundredFortySix = ['manuscript/第六卷-人间武库/第444章-维护组的印只能证明它维护过什么.md', 'manuscript/第六卷-人间武库/第445章-技术签证和公开许可不是同一枚印.md', 'manuscript/第六卷-人间武库/第446章-一家的七十二小时没有借给另一家.md'];
if (chaptersFourHundredFortyFourToFourHundredFortySix.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第444～446章'));
  if (current && current.status !== 'completed') await appendTask({ ...current, status: 'completed', agentWork: '审两家分裂库章程：甲库第17条只授值守维护组记录/附件确认与72小时紧急停止，不授曲线发布/长期赔付；4签证得到附件不匹配、低温停止、出库阻断、旧版本失效/当前未知。把技术事实、紧急动作、摘录发布、责任赔付四印拆开并做错误互借门禁测试。乙库维护组仅有内部保养/标红/上报权，不借甲库格式；卸浪杆由公共物理证据暂停，短脊盾暂停冲击并做18片外部复现。甲库4项到期分别承接新附件验证、无载恢复、物理红、继续未知。', links: [...new Set([...current.links, 'research/维护技术签证与所有权发布授权拆分.md', ...chaptersFourHundredFortyFourToFourHundredFortySix])], updatedAt: now() }, 'editor');
  if (!taskTitles.has('整理维护技术签证与所有权发布授权拆分')) {
    const timestamp = now();
    await appendTask({ id: uid('task'), title: '整理维护技术签证与所有权发布授权拆分', description: '记录四种授权、甲乙两库章程、四项签证终态、外部复现和限时签证到期承接。', level: 'session', status: 'completed', kind: 'review', assignee: 'editor', source: 'navigator', priority: 'high', whyNow: '维护技术能力、紧急动作、公开许可和长期责任若共用一枚机构印，会让所有权阻断即时安全或让紧急权偷走曲线与赔付决定。', known: ['甲库第17条', '乙库无对外授权', '四印不可互借', '限时签证需承接'], missingDecisions: [], aiPreAnalysis: '逐条查章程与实际动作，不以善意/地位推断授权；用错误组合测试门禁。', authorDecision: '甲库有限恢复不复制给乙库；到期不回绿，历史签证不无限续命。', agentWork: '已生成research/维护技术签证与所有权发布授权拆分.md。', completionCriteria: ['两库授权来源可核', '四印边界完整', '4项到期终态不批量恢复'], links: ['research/维护技术签证与所有权发布授权拆分.md', chaptersFourHundredFortyFourToFourHundredFortySix[2]], dependencies: [], createdAt: timestamp, updatedAt: timestamp }, 'agent');
  }
  if (!taskTitles.has('续写第447～449章：来源库重新开放没有让规则自动恢复')) {
    await appendTask({ id: uid('task'), title: '续写第447～449章：来源库重新开放没有让规则自动恢复', description: '对71条受影响规则逐条核版本、对象哈希、适用范围、独立复核与任务影响，处理恢复/替换/废止/继续暂停并完成门阀反制与分裂阶段。', level: 'chapter', status: 'now', kind: 'review', assignee: 'editor', source: 'navigator', priority: 'critical', whyNow: '部分来源入口已窄开，但取证能力恢复不等于旧规则仍适配当前版本/对象；批量回绿会追溯改写暂停任务并传播过期范围。', known: ['71条有四类证据状态', '赔付库窄开2张', '甲库4条限时验证', '乙库转公共复现'], missingDecisions: ['哪些规则真正补齐？', '来源版本变化如何替换旧规则？', '已暂停任务是否需要重新申请而非补发？'], aiPreAnalysis: '第447章建立五门再启；第448章逐类处理版本漂移/替代证据；第449章闭合71条并进入12条公共试点。', authorDecision: '重开只恢复取证；每条规则显式再启，不追溯重写已执行任务。', agentWork: '', completionCriteria: ['71条总数闭合', '恢复/替换/废止/暂停可追溯', '下一公共试点范围明确'], links: [chaptersFourHundredFortyFourToFourHundredFortySix[2], 'research/维护技术签证与所有权发布授权拆分.md', 'planning/第六卷章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() }, 'navigator');
  }
  const facts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '维护技术签证与机构权利四印分离', statement: '技术事实确认、紧急安全动作、摘录发布许可、责任赔付承认分别授权；技术印不发布曲线/认债，发布印不改技术事实，赔付争议不取消即时停止。', status: 'author-confirmed', evidence: [{ filePath: chaptersFourHundredFortyFourToFourHundredFortySix[1], quote: '技术签证和公开许可不是同一枚印。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '分裂甲库四项72小时技术签证', statement: '镇潮绞弩附件不匹配、叠甲架低温停止、破脊槌出库前阻断、归潮钩旧版本失效/当前未知；到期分别转新附件验证、无载恢复、物理红接管、继续未知。', status: 'text-explicit', evidence: [{ filePath: chaptersFourHundredFortyFourToFourHundredFortySix[2], quote: '四条没有一起恢复。' }], updatedAt: now() },
    { id: uid('fact'), category: 'decision', subject: '限时安全签证到期承接', statement: '72小时等限时签证到期必须转当前物理、独立来源、合法续签或保守暂停；没有承接不自动变绿，签证保留历史但不无限续命。', status: 'author-confirmed', evidence: [{ filePath: chaptersFourHundredFortyFourToFourHundredFortySix[2], quote: '没有承接，不自动变绿。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '71条规则逐条再启审计', statement: '来源门窄开只恢复取证能力；下一步按版本、对象哈希、适用范围、独立复核、任务影响五门，将71条分恢复/替换/废止/继续暂停，不补发已暂停任务。', status: 'text-explicit', evidence: [{ filePath: chaptersFourHundredFortyFourToFourHundredFortySix[2], quote: '来源库重新开放没有让规则自动恢复。' }], updatedAt: now() }
  ];
  for (const fact of facts) await appendFact(fact);
  await setPosition({ filePath: chaptersFourHundredFortyFourToFourHundredFortySix[2], stage: '第六卷71条规则逐条再启审计阶段', focus: '续写第447～449章：来源库重新开放没有让规则自动恢复' });
}

const chaptersFourHundredFortySevenToFourHundredFortyNine = ['manuscript/第六卷-人间武库/第447章-门重新亮起来只恢复了取证能力.md', 'manuscript/第六卷-人间武库/第448章-一条新曲线不能偷偷续上旧规则.md', 'manuscript/第六卷-人间武库/第449章-七十一条规则没有一条靠门色恢复.md'];
if (chaptersFourHundredFortySevenToFourHundredFortyNine.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第447～449章'));
  if (current && current.status !== 'completed') await appendTask({ ...current, status: 'completed', agentWork: '建立版本/对象/范围/独立复核/任务影响五门，6个窄开窗口只生成民防支架320斤窄规则与叠甲架无载恢复，其余止于对象/版本/物理红。公共重建寒潮弩臂18片拆A/B 7%与C 5.5%专项，短脊盾由温度摘要改自然回温+双点一致，卸浪杆由当前物理红接管。71条闭合：38条为29不变/4恢复边缘/5收窄；12条为2重建/3替代/2废止/3暂停/2历史待任务；21候选为15保留/6退役。选12/46进入正式试点。', links: [...new Set([...current.links, 'research/七家来源恢复与公共规则再启审计.md', 'decisions/来源恢复不自动重启规则.md', ...chaptersFourHundredFortySevenToFourHundredFortyNine])], updatedAt: now() }, 'editor');
  if (!taskTitles.has('整理七家来源恢复与公共规则再启审计')) {
    const timestamp = now();
    await appendTask({ id: uid('task'), title: '整理七家来源恢复与公共规则再启审计', description: '记录再启五门、6个窄开窗口、三类公共替代、71条闭合与12条正式试点边界。', level: 'session', status: 'completed', kind: 'review', assignee: 'editor', source: 'navigator', priority: 'high', whyNow: '来源恢复若批量回绿，会把版本/对象漂移藏进旧规则并补发已经终结的任务；新曲线也可能偷偷扩大旧规则。', known: ['五门再启', '71条闭合', '公共替代不续旧号', '12/46试点'], missingDecisions: [], aiPreAnalysis: '逐条记录通过/失败门与新规则号，最后按原三组闭合总数。', authorDecision: '门色不参与规则真值；废止保留历史，恢复不追溯补发。', agentWork: '已生成research/七家来源恢复与公共规则再启审计.md和decisions/来源恢复不自动重启规则.md。', completionCriteria: ['71条无遗漏', '新旧规则身份分离', '试点选择可解释'], links: ['research/七家来源恢复与公共规则再启审计.md', 'decisions/来源恢复不自动重启规则.md', chaptersFourHundredFortySevenToFourHundredFortyNine[2]], dependencies: [], createdAt: timestamp, updatedAt: timestamp }, 'agent');
  }
  if (!taskTitles.has('续写第450～452章：正式试点第一天只发布十二条规则不发布整个零点三包')) {
    await appendTask({ id: uid('task'), title: '续写第450～452章：正式试点第一天只发布十二条规则不发布整个零点三包', description: '将4硬停止/3工具装夹/2来源版本/2任务限时/1合法转介按需下发到城市、工坊与训练场，处理一条旧范围缓存并做单规则冻结、回滚、赔付和恢复。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'critical', whyNow: '规则已能逐条再启，必须在真实并发环境验证下发、拒绝执行、失败隔离和回滚；整包发布会把尚未命中的范围带入现场。', known: ['46候选只选12', '每任务按需下发', '单条失败不传播', '需覆盖三类使用点'], missingDecisions: ['首日多少任务/终态？', '哪条缓存显示旧范围？', '失败如何赔付且不诱导隐瞒？'], aiPreAnalysis: '第450章首日下发/不同终态；第451章旧范围缓存与精确回滚；第452章回读、赔付、恢复和试点继续。', authorDecision: '不以首日零失败证明成功；真实拒绝/转介计入完成，不关闭无关11条。', agentWork: '', completionCriteria: ['12规则与使用点可核', '缓存影响集合闭合', '回滚/赔付/恢复不批量'], links: [chaptersFourHundredFortySevenToFourHundredFortyNine[2], 'research/七家来源恢复与公共规则再启审计.md', 'planning/第六卷章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() }, 'navigator');
  }
  const facts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '公共规则来源再启五门', statement: '来源可读后仍须逐条通过版本、对象/附件哈希、适用范围、独立复核、任务影响；建立新规则号，不补发已结束/替代/暂停/物理红任务，失败门公开可补。', status: 'author-confirmed', evidence: [{ filePath: chaptersFourHundredFortySevenToFourHundredFortyNine[0], quote: '门重新亮起来只恢复了取证能力。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '七家来源冻结71条规则再启结案', statement: '38独立来源为29不变/4恢复边缘/5收窄；12唯一来源为2重建/3替代/2废止/3暂停/2历史待任务；21候选为15保留/6退役，合计71。', status: 'text-explicit', evidence: [{ filePath: chaptersFourHundredFortySevenToFourHundredFortyNine[2], quote: '合计七十一。' }], updatedAt: now() },
    { id: uid('fact'), category: 'knowledge', subject: '来源冻结后的三项公共替代证据', statement: '寒潮弩臂18片支持A/B 7%停止、C 5.5%先停专项；短脊盾由温度摘要改自然回温/表里双点/禁明火；卸浪杆偏角2.1且回声丢失由当前物理红接管。', status: 'author-confirmed', evidence: [{ filePath: chaptersFourHundredFortySevenToFourHundredFortyNine[1], quote: '新曲线、版本差异和当前物理都可以让旧规则失效。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '12条公共规则正式试点', statement: '46候选只选12：4硬停止、3工具/装夹、2来源/版本、2任务范围/限时、1合法转介；按任务下发，单条成败不传播，覆盖城市/工坊/训练场及回滚赔付。', status: 'text-explicit', evidence: [{ filePath: chaptersFourHundredFortySevenToFourHundredFortyNine[2], quote: '正式试点只选十二条。' }], updatedAt: now() }
  ];
  for (const fact of facts) await appendFact(fact);
  await setPosition({ filePath: chaptersFourHundredFortySevenToFourHundredFortyNine[2], stage: '第六卷12条公共规则正式试点首日阶段', focus: '续写第450～452章：正式试点第一天只发布十二条规则不发布整个零点三包' });
}

const chaptersFourHundredFiftyToFourHundredFiftyTwo = ['manuscript/第六卷-人间武库/第450章-十二条规则没有装进同一个包.md', 'manuscript/第六卷-人间武库/第451章-一个旧范围只命中五张缓存卡.md', 'manuscript/第六卷-人间武库/第452章-冻结一条规则没有让另外十一条停止.md'];
if (chaptersFourHundredFiftyToFourHundredFiftyTwo.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第450～452章'));
  if (current && current.status !== 'completed') await appendTask({ ...current, status: 'completed', agentWork: '12条规则不整包安装，按任务下发到9点31任务；首日14条件继续/6硬停/4合法转介/3范围外/2来源版本待补/1限时转黄/1缓存故障后重申请。离线缓存键漏规则版本与对象哈希，旧机构500覆盖任务320顶栏；26请求中5错卡、4任务、3终端，零超320/零伤。精确冻结1条、保留正确执行、赔东垣47分钟/西桥32分钟，其余11条继续；新键、并列字段、纸卡失效与5错/21对/断网交叉三层回放通过。', links: [...new Set([...current.links, 'research/十二条公共规则正式试点首日.md', 'decisions/公共规则单条失败隔离与回滚.md', ...chaptersFourHundredFiftyToFourHundredFiftyTwo])], updatedAt: now() }, 'writer');
  if (!taskTitles.has('整理十二条公共规则正式试点首日')) {
    const timestamp = now();
    await appendTask({ id: uid('task'), title: '整理十二条公共规则正式试点首日', description: '记录12条按需下发、9点31任务终态、单条缓存故障、精确回滚赔付、三层回放与指标修订。', level: 'session', status: 'completed', kind: 'review', assignee: 'editor', source: 'navigator', priority: 'high', whyNow: '正式试点必须证明失败可被发现、闭合、赔付并隔离；无人受伤不等于无影响，合法转介也不等于算法失败。', known: ['31任务总数闭合', '5卡/4任务/3终端', '1冻11继续', '真实离线回放'], missingDecisions: [], aiPreAnalysis: '从签名事件、离线卡和纸卡闭合影响集合，保留正确动作并按依赖冻结。', authorDecision: '不以零失败包装首日；等待成本赔付，转介指标不预设好坏。', agentWork: '已生成research/十二条公共规则正式试点首日.md和decisions/公共规则单条失败隔离与回滚.md。', completionCriteria: ['31终态无重复', '缓存影响集合可回放', '修复不关闭无关规则'], links: ['research/十二条公共规则正式试点首日.md', 'decisions/公共规则单条失败隔离与回滚.md', chaptersFourHundredFiftyToFourHundredFiftyTwo[2]], dependencies: [], createdAt: timestamp, updatedAt: timestamp }, 'agent');
  }
  if (!taskTitles.has('续写第453～455章：同一条规则在城市工坊和军团设备上得到三种失败')) {
    await appendTask({ id: uid('task'), title: '续写第453～455章：同一条规则在城市工坊和军团设备上得到三种失败', description: '把同一硬停止/承接规则放入城市离线、工坊订单与军团轮班保密环境，分别定位同步、收益激励与交接字段失败，逐路修复回放并决定扩大或保持范围。', level: 'chapter', status: 'now', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'critical', whyNow: '首日证明单规则故障可隔离；第二日需验证相同文字在不同组织环境中不会被统一培训掩盖真实系统前置。', known: ['城市存在离线终端', '工坊按订单收益行动', '军团有轮班/保密/战备时限', '单条失败可精确冻结'], missingDecisions: ['选择哪条共同规则？', '三种失败各发生在哪一步？', '军团哪些字段可交接而不泄位置？'], aiPreAnalysis: '第453章三路同规则；第454章同步/激励/保密归因；第455章分别修复与外推边界。', authorDecision: '不以统一培训当万能修复；保密可遮位置，不得遮停止条件与当前承接人。', agentWork: '', completionCriteria: ['三种失败机制独立', '三路修复可回放', '扩大/保持范围有证据'], links: [chaptersFourHundredFiftyToFourHundredFiftyTwo[2], 'research/十二条公共规则正式试点首日.md', 'planning/第六卷章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() }, 'navigator');
  }
  const facts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '公共规则按任务隔离下发与失败回滚', statement: '规则以号/版本/对象/任务/动作按需下发；单条故障闭合真实依赖后精确冻结，保留正确执行、赔等待与额外检查，未参与者用错/对/断网交叉回放后显式恢复。', status: 'author-confirmed', evidence: [{ filePath: chaptersFourHundredFiftyToFourHundredFiftyTwo[2], quote: '冻结一条规则没有让另外十一条停止。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '12条公共规则首日31任务终态', statement: '9使用点31任务：14条件继续、6硬停、4合法转介、3范围外、2来源/版本待补、1限时转黄、1缓存故障取消后重申请完成；无重复计算屏幕/纸卡/重申请。', status: 'text-explicit', evidence: [{ filePath: chaptersFourHundredFiftyToFourHundredFiftyTwo[2], quote: '十四、六、四、三、二、一、一，合计三十一。' }], updatedAt: now() },
    { id: uid('fact'), category: 'knowledge', subject: '任务上限离线缓存首日故障', statement: '缓存键漏版本/对象哈希，使旧机构500摘要覆盖任务320顶栏；26请求中5错卡/4任务/3终端，零超320/零伤，东垣47分钟与西桥32分钟等待/检查获赔。', status: 'author-confirmed', evidence: [{ filePath: chaptersFourHundredFiftyToFourHundredFiftyTwo[1], quote: '一个旧范围只命中五张缓存卡。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '同一规则三组织环境失败试验', statement: '下一轮让同一规则进入城市离线、普通工坊订单、军团轮班保密环境，分别定位同步、激励与交接失败；保密可遮位置但不遮停止/承接。', status: 'text-explicit', evidence: [{ filePath: chaptersFourHundredFiftyToFourHundredFiftyTwo[2], quote: '同一条规则将在三种环境里遭遇三种失败。' }], updatedAt: now() }
  ];
  for (const fact of facts) await appendFact(fact);
  await setPosition({ filePath: chaptersFourHundredFiftyToFourHundredFiftyTwo[2], stage: '第六卷同一规则三组织环境失败与修复阶段', focus: '续写第453～455章：同一条规则在城市工坊和军团设备上得到三种失败' });
}

const chaptersFourHundredFiftyThreeToFourHundredFiftyFive = ['manuscript/第六卷-人间武库/第453章-同一条十息停止在三处断在不同位置.md', 'manuscript/第六卷-人间武库/第454章-三种失败不能合成一次统一培训.md', 'manuscript/第六卷-人间武库/第455章-一条规则修好三次仍然没有扩大到所有地方.md'];
if (chaptersFourHundredFiftyThreeToFourHundredFiftyFive.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第453～455章'));
  if (current && current.status !== 'completed') await appendTask({ ...current, status: 'completed', agentWork: '同一十息不稳停止分别断在城市本地保存/中心确认、工坊只为数值付尾款、军团保密遮掉稳定关联号；当事人均正确复述，拒绝统一培训。城市建本地持久停止+队列三态+机械封签，27分钟迟到确认不重写；工坊五段付费、同装夹序列连续；军团公共终态/轮班稳定号/本地位置三层，灰七关联红箱/替代不泄部署。回放后只扩10离线点、6分段工坊、1列6具/2轮班。累计68任务，25项等待恢复。', links: [...new Set([...current.links, 'research/同一停止规则三组织环境失败与修复.md', 'decisions/组织环境前置不能用统一培训替代.md', ...chaptersFourHundredFiftyThreeToFourHundredFiftyFive])], updatedAt: now() }, 'researcher');
  if (!taskTitles.has('整理同一停止规则三组织环境失败与修复')) {
    const timestamp = now();
    await appendTask({ id: uid('task'), title: '整理同一停止规则三组织环境失败与修复', description: '记录十息规则三种失败、知识测试、同步/合同/保密修复、真实回放、扩展边界和恢复队列。', level: 'session', status: 'completed', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'high', whyNow: '操作员理解规则仍失败时，统一培训会把系统确认、收益激励和权限交接的责任压回最后操作者。', known: ['三处知识测试通过', '三路机制不同', '回放范围不同', '25项恢复等待'], missingDecisions: [], aiPreAnalysis: '先证明非知识问题，再为各组织前置设计独立回放和有限外推。', authorDecision: '保密不公开位置但保留受控稳定关联；主动上报不删违规序列，系统成本由试点承接。', agentWork: '已生成research/同一停止规则三组织环境失败与修复.md和decisions/组织环境前置不能用统一培训替代.md。', completionCriteria: ['三机制不合并', '修复逐路可回放', '外推范围不越证据'], links: ['research/同一停止规则三组织环境失败与修复.md', 'decisions/组织环境前置不能用统一培训替代.md', chaptersFourHundredFiftyThreeToFourHundredFiftyFive[2]], dependencies: [], createdAt: timestamp, updatedAt: timestamp }, 'agent');
  }
  if (!taskTitles.has('续写第456～458章：规则能停下武具以后城市第一次为恢复排起长队')) {
    await appendTask({ id: uid('task'), title: '续写第456～458章：规则能停下武具以后城市第一次为恢复排起长队', description: '对68任务中25项恢复等待按当前风险、公共后果、等待时长和替代能力排序，处理共享计量/维修瓶颈、价格或关系插队，建立服务时限/超时赔付与替代并结案公共试点。', level: 'chapter', status: 'now', kind: 'planning', assignee: 'navigator', source: 'navigator', priority: 'critical', whyNow: '停止能力扩张快于复核维修能力；若只看出价、军团关系或先来后到，安全规则会把等待成本集中到最缺替代的街区与工坊。', known: ['68累计任务', '43已有承接', '11等计量', '8等附件版本/6无恢复日期'], missingDecisions: ['25项如何交叉排序？', '共享点每天能处理多少？', '超时后谁提供替代与赔付？'], aiPreAnalysis: '第456章建立排序与25项基线；第457章扩容/防插队；第458章时限赔付/终态与试点结案。', authorDecision: '不按出价或机构地位单排；停止不是永久终态，等待必须有承接、替代与成本归属。', agentWork: '', completionCriteria: ['25项总数闭合', '插队与紧急调整可审', '服务级别/赔付/阶段结案完整'], links: [chaptersFourHundredFiftyThreeToFourHundredFiftyFive[2], 'research/同一停止规则三组织环境失败与修复.md', 'planning/第六卷章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() }, 'navigator');
  }
  const facts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '规则执行依赖组织环境前置', statement: '执行者正确理解规则仍可因同步确认、合同激励、保密交接失败；修复须落到本地持久停止/合规终态付费/受控稳定关联，不能用统一培训替代。', status: 'author-confirmed', evidence: [{ filePath: chaptersFourHundredFiftyThreeToFourHundredFiftyFive[1], quote: '三种失败不能合成一次统一培训。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '十息不稳规则三组织环境回放', statement: '城市断网停止27分钟后中心确认；工坊三次回零仍拼回连续序列并按五段结费；军团灰七在6具中关联唯一红箱/替代且拒绝位置查询，三路均由未参与者回放。', status: 'text-explicit', evidence: [{ filePath: chaptersFourHundredFiftyThreeToFourHundredFiftyFive[2], quote: '三路回放从同一个十息序列开始。' }], updatedAt: now() },
    { id: uid('fact'), category: 'decision', subject: '十息规则三路有限扩大', statement: '城市仅扩10个有本地账/封签的离线点；工坊扩6家分段结算、14家只硬筛转介；军团限1维修列6具/2轮班，未测试矿队/远征/武馆不继承。', status: 'author-confirmed', evidence: [{ filePath: chaptersFourHundredFiftyThreeToFourHundredFiftyFive[2], quote: '一条规则修好三次仍然没有扩大到所有地方。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '公共试点25项恢复等待', statement: '累计68任务：43有承接、11等共享计量、8等附件/版本、6无明确恢复日期；下一步按风险/公共后果/时长/替代能力排序并建立时限、赔付、替代。', status: 'text-explicit', evidence: [{ filePath: chaptersFourHundredFiftyThreeToFourHundredFiftyFive[2], quote: '停得下来不等于恢复得起来。' }], updatedAt: now() }
  ];
  for (const fact of facts) await appendFact(fact);
  await setPosition({ filePath: chaptersFourHundredFiftyThreeToFourHundredFiftyFive[2], stage: '第六卷25项恢复等待与公共试点结案阶段', focus: '续写第456～458章：规则能停下武具以后城市第一次为恢复排起长队' });
}

const chaptersFourHundredFiftySixToFourHundredFiftyEight = ['manuscript/第六卷-人间武库/第456章-二十五项等待没有按谁先出钱排序.md', 'manuscript/第六卷-人间武库/第457章-新增一座计量台也不能出售原队列的位置.md', 'manuscript/第六卷-人间武库/第458章-停止以后第一次有了恢复时限和等待赔付.md'];
if (chaptersFourHundredFiftySixToFourHundredFiftyEight.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第456～458章'));
  if (current && current.status !== 'completed') await appendTask({ ...current, status: 'completed', agentWork: '25项等待先做安全隔离，再分5无替代高后果/7替代将到期/8稳定替代/5无当前任务四带；带内按等待，资金可增经公开验收的产能，不能买原队列。两共享台8次/日经增班、B档前置、独立台到真实13次；来源/版本与计量分流，6无日期项指定承接。建立立即停止确认、2小时队列/替代、24/48小时预约、4小时资料检查与超时赔付。72小时25项终态9窄恢复/5有日期修复/4替代退役/3范围外/4关闭申请，公共试点68任务结案。', links: [...new Set([...current.links, 'research/公共规则恢复队列与服务时限.md', 'decisions/停止后的恢复服务与公平排序.md', ...chaptersFourHundredFiftySixToFourHundredFiftyEight])], updatedAt: now() }, 'navigator');
  if (!taskTitles.has('整理公共规则恢复队列与服务时限')) {
    const timestamp = now();
    await appendTask({ id: uid('task'), title: '整理公共规则恢复队列与服务时限', description: '记录25项基线、四带排序、真实容量/防插队、恢复时限/赔付、72小时终态与公共试点结案。', level: 'session', status: 'completed', kind: 'planning', assignee: 'navigator', source: 'navigator', priority: 'high', whyNow: '停止能力扩张若没有恢复服务，会把安全成本压给最缺替代者；单一先来/危险/价格/机构排序均会制造不公平或新空窗。', known: ['25项三类基线', '4队列带', '8→13真实日能力', '9/5/4/3/4终态'], missingDecisions: [], aiPreAnalysis: '隔离先行，按替代和公共后果分带；把资料、计量、维修分流并显式服务时限。', authorDecision: '时限保证可行动承接而非保证绿色；资金新增共享产能，不购买旧队列名额。', agentWork: '已生成research/公共规则恢复队列与服务时限.md和decisions/停止后的恢复服务与公平排序.md。', completionCriteria: ['25总数闭合', '队列调整/挤后成本可审', '时限赔付和试点结案完整'], links: ['research/公共规则恢复队列与服务时限.md', 'decisions/停止后的恢复服务与公平排序.md', chaptersFourHundredFiftySixToFourHundredFiftyEight[2]], dependencies: [], createdAt: timestamp, updatedAt: timestamp }, 'agent');
  }
  if (!taskTitles.has('续写第459～461章：正式发布页上最重要的是十一类没有随算法公开的内容')) {
    await appendTask({ id: uid('task'), title: '续写第459～461章：正式发布页上最重要的是十一类没有随算法公开的内容', description: '将正式发布清单拆成公开、受控可审、角色限定三层，为11类不公开内容记录理由/审查者/替代证据/复议入口，发布最小可验证包并做外部重放和反推风险审计。', level: 'chapter', status: 'now', kind: 'review', assignee: 'editor', source: 'navigator', priority: 'critical', whyNow: '12条规则已通过真实试点；正式发布若用透明吞掉制造、在役和伤者边界，或用保密让公共结论不可验证，都会重建另一种垄断。', known: ['12条已验证规则', '11类不随发布公开', '白黄黑红分层已审', '需外部重放/反推审计'], missingDecisions: ['11类完整清单是什么？', '每类由谁审/如何复议？', '最小包能否独立复算终态？'], aiPreAnalysis: '第459章三层清单；第460章11类不公开责任；第461章最小包外部重放与反推测试。', authorDecision: '不公开必须可解释/复议，不等于无人可审；公开必须足以重放，不等于取得原件。', agentWork: '', completionCriteria: ['11类清单无遗漏', '理由/审查/替代/复议四项完整', '外部重放和反推边界通过'], links: [chaptersFourHundredFiftySixToFourHundredFiftyEight[2], 'research/公共规则恢复队列与服务时限.md', 'planning/第六卷章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() }, 'navigator');
  }
  const facts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '停止后恢复队列公平排序', statement: '先确认隔离/保管/替代，再按无替代公共后果、替代到期、稳定替代、无当前任务分带；带内等待/批量。资金可增经公开验收的共享能力，不买既有名额。', status: 'author-confirmed', evidence: [{ filePath: chaptersFourHundredFiftySixToFourHundredFiftyEight[0], quote: '二十五项等待没有按谁先出钱排序。' }], updatedAt: now() },
    { id: uid('fact'), category: 'decision', subject: '公共规则恢复服务时限与赔付', statement: '停止立即确认；2小时给队列/替代/承接；计量一二带24小时、三四带48小时预约或替代；资料4小时给请求/责任/再查。时限不保证绿色，超时按能力/迟交/缺回执归属。', status: 'author-confirmed', evidence: [{ filePath: chaptersFourHundredFiftySixToFourHundredFiftyEight[2], quote: '时限不是恢复承诺。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '25项恢复等待72小时结案', statement: '原11计量/8附件版本/6无日期共25；72小时形成9窄范围恢复、5有日期修复、4替代接管退役、3范围外转流程、4无当前需求关闭申请。', status: 'text-explicit', evidence: [{ filePath: chaptersFourHundredFiftySixToFourHundredFiftyEight[2], quote: '九、五、四、三、四，合计二十五。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '公共算法正式发布三层与11类不公开', statement: '下一步发布已验证12条/失败/范围/工具/恢复服务；制造配方、在役位置、伤者身份、受控曲线、未验证阈值、军团映射等11类分受控/角色限定，给理由/审查/替代/复议。', status: 'text-explicit', evidence: [{ filePath: chaptersFourHundredFiftySixToFourHundredFiftyEight[2], quote: '另有十一类内容不随发布公开。' }], updatedAt: now() }
  ];
  for (const fact of facts) await appendFact(fact);
  await setPosition({ filePath: chaptersFourHundredFiftySixToFourHundredFiftyEight[2], stage: '第六卷公共算法正式发布边界阶段', focus: '续写第459～461章：正式发布页上最重要的是十一类没有随算法公开的内容' });
}

const chaptersFourHundredFiftyNineToFourHundredSixtyOne = ['manuscript/第六卷-人间武库/第459章-发布清单先写了十一类不会公开的内容.md', 'manuscript/第六卷-人间武库/第460章-不公开的每一项也要有审查人和到期日.md', 'manuscript/第六卷-人间武库/第461章-五支外部队只用发布包重放了二十四个终态.md'];
if (chaptersFourHundredFiftyNineToFourHundredSixtyOne.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第459～461章'));
  if (current && current.status !== 'completed') await appendTask({ ...current, status: 'completed', agentWork: '正式发布拆公开/受控可审/角色限定；11类不随包公开涵盖配方、工艺、工具几何、反演曲线、在役编号位置数量、军团映射、伤者、操作者、证人、候选阈值、责任复议，每项有理由/审查/替代/复议/到期。D三片数字公开但不成阈值，争议不遮机构动作。5队用最小包重放24卡首轮23一致，补短脊盾“双点均入18～22°C窗”后全一致；反推审计将日期改季度、军团时区/原号改相对时刻/随机号。12条v1.0发布并保留失败史。', links: [...new Set([...current.links, 'research/公共算法正式发布与十一类不公开边界.md', 'decisions/不公开内容也必须可审查复议.md', ...chaptersFourHundredFiftyNineToFourHundredSixtyOne])], updatedAt: now() }, 'editor');
  if (!taskTitles.has('整理公共算法正式发布与十一类不公开边界')) {
    const timestamp = now();
    await appendTask({ id: uid('task'), title: '整理公共算法正式发布与十一类不公开边界', description: '记录三层发布、11类遮罩、责任卡/到期复议、5队24卡重放、短脊盾修订与配方部署个人反推审计。', level: 'session', status: 'completed', kind: 'review', assignee: 'editor', source: 'navigator', priority: 'high', whyNow: '公开吞掉配方/部署/个人会造成真实伤害，保密若无人可审又会重建解释垄断；最小包必须同时可重放且不可合理反推。', known: ['11类清单', '5队24卡', '首轮23一致', '两项反推修订'], missingDecisions: [], aiPreAnalysis: '逐遮罩建责任卡，再以正确性重放与组合攻击双门测试。', authorDecision: '不公开仍可审/复议；候选失败可见但不生成许可，发布保留失败与攻击史。', agentWork: '已生成research/公共算法正式发布与十一类不公开边界.md和decisions/不公开内容也必须可审查复议.md。', completionCriteria: ['11类无遗漏', '外部终态全重放', '合理攻击不定位配方/部署/个人'], links: ['research/公共算法正式发布与十一类不公开边界.md', 'decisions/不公开内容也必须可审查复议.md', chaptersFourHundredFiftyNineToFourHundredSixtyOne[2]], dependencies: [], createdAt: timestamp, updatedAt: timestamp }, 'agent');
  }
  if (!taskTitles.has('续写第462～464章：公开算法不能替江砚把淬皮震意铸进骨头')) {
    await appendTask({ id: uid('task'), title: '续写第462～464章：公开算法不能替江砚把淬皮震意铸进骨头', description: '让江砚在公开承力台上把淬皮巅峰震意映射到骨面受力，首次锻骨因左右不对称与旧记忆代偿停止，借可复现训练/同伴保护完成门槛且保留能力边界。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'critical', whyNow: '公共算法已发布，第六卷仍需兑现江砚锻骨准备；突破必须使用本卷建立的停止/复现逻辑，而非因完成制度任务自动获得力量。', known: ['江砚淬皮巅峰', '身体感知不进公共证据', '六槽承力可外测', '旧战死记忆可能形成代偿'], missingDecisions: ['锻骨具体第一部位/门槛？', '左右不对称来自哪段记忆？', '突破后能力和代价是什么？'], aiPreAnalysis: '第462章建个人训练证据；第463章停止并查代偿；第464章同伴保护/独立读数完成锻骨门槛。', authorDecision: '不以主角听感替量具，不靠神兵馈赠；突破可复查但个人武道不冒充公共普适算法。', agentWork: '', completionCriteria: ['停止与恢复因果完整', '同伴有真实保护作用', '能力/代价边界明确'], links: [chaptersFourHundredFiftyNineToFourHundredSixtyOne[2], 'research/公共算法正式发布与十一类不公开边界.md', 'planning/第六卷章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() }, 'navigator');
  }
  const facts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '公共算法三层发布与遮罩责任卡', statement: '公开/受控可审/角色限定并列；11类遮罩均须具体风险、审查角色、替代证据、复议、固定或事件到期。不公开不等于无人可审，公开不取得原件/身份/配方/部署。', status: 'author-confirmed', evidence: [{ filePath: chaptersFourHundredFiftyNineToFourHundredSixtyOne[1], quote: '不公开的每一项也要有审查人和到期日。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '公共算法v1.0外部重放与发布', statement: '5外部队仅用最小包重放24卡：11继续/6停/3转介/2范围外/2未知；首轮23一致，修双点均入18～22°C窗后24一致，12规则v1.0发布。', status: 'text-explicit', evidence: [{ filePath: chaptersFourHundredFiftyNineToFourHundredSixtyOne[2], quote: '十二条公共规则版本一零正式发布。' }], updatedAt: now() },
    { id: uid('fact'), category: 'knowledge', subject: '发布包组合反推修订', statement: '精确日期+材料可将4供应方缩到2，改季度窗口；军团本地时区+连续原号可缩城带，改相对事件时刻+随机发布号；终态因果/十息/承接不变。', status: 'author-confirmed', evidence: [{ filePath: chaptersFourHundredFiftyNineToFourHundredSixtyOne[2], quote: '他们用时间戳、材料编码、终端时区、任务顺序和聚合数量组合攻击。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '江砚公开承力台锻骨尝试', statement: '公开算法完成后江砚仍为淬皮巅峰；下一步用可外测承力验证震意入骨，首次左右不对称即停，查旧记忆代偿后在同伴保护下完成锻骨门槛。', status: 'text-explicit', evidence: [{ filePath: chaptersFourHundredFiftyNineToFourHundredSixtyOne[2], quote: '不能替他把淬皮巅峰积下的震意真正铸进骨头。' }], updatedAt: now() }
  ];
  for (const fact of facts) await appendFact(fact);
  await setPosition({ filePath: chaptersFourHundredFiftyNineToFourHundredSixtyOne[2], stage: '第六卷江砚公开承力锻骨门槛阶段', focus: '续写第462～464章：公开算法不能替江砚把淬皮震意铸进骨头' });
}

const chaptersFourHundredSixtyTwoToFourHundredSixtyFour = ['manuscript/第六卷-人间武库/第462章-震意进入骨面也不等于已经锻骨.md', 'manuscript/第六卷-人间武库/第463章-第三段左胫比右胫早了零点一九秒.md', 'manuscript/第六卷-人间武库/第464章-锻骨不是把死人走过的路再走一遍.md'];
if (chaptersFourHundredSixtyTwoToFourHundredSixtyFour.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第462～464章'));
  if (current && current.status !== 'completed') await appendTask({ ...current, status: 'completed', agentWork: '江砚用公开B档台、独立医疗/设备/训练/回收角色预登记骨膜痛、左右差>0.12秒、十息不稳停止；二成差0.03、三成五0.05～0.08，五成左0.24右0.43差0.19，在肩前主动停无伤。低负荷反事实拆右足外撇、右肩旧伤、周铁衣左强护人步，形成本人双窄基座。第二日三接口通过，24小时盲抽10次8完整/1角度拒绝/1疲劳0.14停；总量、双侧承力、卸载、无伤、跨日复现成立，更新锻骨初段并保留6次疲劳/右肩/陌生接口边界。', links: [...new Set([...current.links, 'research/江砚公开承力锻骨门槛复核.md', 'decisions/个人武道证据与公共算法边界.md', ...chaptersFourHundredSixtyTwoToFourHundredSixtyFour])], updatedAt: now() }, 'writer');
  if (!taskTitles.has('整理江砚公开承力锻骨门槛复核')) {
    const timestamp = now();
    await appendTask({ id: uid('task'), title: '整理江砚公开承力锻骨门槛复核', description: '记录个人基线/门禁、首次0.19停止、三类代偿反事实、双窄基座、跨日盲抽与锻骨初段边界。', level: 'session', status: 'completed', kind: 'review', assignee: 'editor', source: 'navigator', priority: 'high', whyNow: '武具算法不能直接生成身体阈值，死者经验也不能从已学技能中简单开关；境界需个人证据、独立角色与跨日复现。', known: ['五成0.19主动停', '双窄基座', '10次8/1/1', '锻骨初段有限边界'], missingDecisions: [], aiPreAnalysis: '把公共方法与个人阈值分开，用反事实拆结构/旧伤/记忆代偿，再盲抽复现。', authorDecision: '不删周铁衣贡献、不照抄其身体；感知只触发停止，境界不授岗位权限。', agentWork: '已生成research/江砚公开承力锻骨门槛复核.md和decisions/个人武道证据与公共算法边界.md。', completionCriteria: ['停止/恢复可回读', '代偿不单因果', '境界与能力边界完整'], links: ['research/江砚公开承力锻骨门槛复核.md', 'decisions/个人武道证据与公共算法边界.md', chaptersFourHundredSixtyTwoToFourHundredSixtyFour[2]], dependencies: [], createdAt: timestamp, updatedAt: timestamp }, 'agent');
  }
  if (!taskTitles.has('续写第465章：人间武库发布以后断星远征只带走一份可验证的方法')) {
    await appendTask({ id: uid('task'), title: '续写第465章：人间武库发布以后断星远征只带走一份可验证的方法', description: '汇总第六卷79章公共算法、深层边界、恢复服务与江砚锻骨终态；列出远征可携最小包、不可外推项和未决清单，承接第七卷断星远征。', level: 'chapter', status: 'now', kind: 'planning', assignee: 'navigator', source: 'navigator', priority: 'critical', whyNow: '第六卷只剩结案；若把城市试点与锻骨初段写成远征全环境授权，会在换设备/材料/保密/补给后重复本卷错误。', known: ['12规则v1.0', '11类遮罩', '68任务试点', '江砚锻骨初段'], missingDecisions: ['远征带走哪些公开/受控资产？', '哪些权限不随队？', 'D-5与断星入口如何接卷？'], aiPreAnalysis: '先闭合卷内目标/数量，再生成远征最小包、未决项与首个新环境问题。', authorDecision: '带方法、失败史与恢复责任，不带整座武库/私库/全城授权；锻骨不自动授指挥。', agentWork: '', completionCriteria: ['79章卷终态闭合', '远征携带/不携带清楚', '第七卷首个任务可执行'], links: [chaptersFourHundredSixtyTwoToFourHundredSixtyFour[2], 'research/江砚公开承力锻骨门槛复核.md', 'planning/第六卷章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() }, 'navigator');
  }
  const facts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '个人武道证据不由公共算法直接生成', statement: '公共量具/停止/复现可用于个人证据，但武具阈值不移植身体；感知只触发停止，医疗/设备/训练/本人分权，总量/承力/卸载/无伤/跨日盲复现才更新境界。', status: 'author-confirmed', evidence: [{ filePath: chaptersFourHundredSixtyTwoToFourHundredSixtyFour[0], quote: '震意进入骨面也不等于已经锻骨。' }], updatedAt: now() },
    { id: uid('fact'), category: 'knowledge', subject: '江砚五成锻骨首次左右代偿', statement: '左胫0.24息/右0.43息，差0.19>0.12，髋左锁且右肩将补偿；江砚肩前主动停无伤。右足外撇、右肩旧伤、周铁衣左强护人步共同候选。', status: 'author-confirmed', evidence: [{ filePath: chaptersFourHundredSixtyTwoToFourHundredSixtyFour[1], quote: '第三段左胫比右胫早了零点一九秒。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '江砚更新锻骨初段', statement: '个人双窄基座后第二日固定/移动/软索通过；24小时盲抽10次8完整、1角度加载前拒绝、1疲劳差0.14在三成五停，无伤且跨日复现，更新锻骨初段。', status: 'text-explicit', evidence: [{ filePath: chaptersFourHundredSixtyTwoToFourHundredSixtyFour[2], quote: '状态更新为：锻骨初段。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '第六卷结案与断星远征最小包', statement: '下一章闭合79章并生成远征最小可验证包：带12规则/失败/工具/恢复/边界，不带整座私库/在役映射/城市授权；江砚锻骨初段不自动授指挥。', status: 'text-explicit', evidence: [{ filePath: chaptersFourHundredSixtyTwoToFourHundredSixtyFour[2], quote: '人间武库发布以后，断星远征只带走一份可验证的方法。' }], updatedAt: now() }
  ];
  for (const fact of facts) await appendFact(fact);
  await setPosition({ filePath: chaptersFourHundredSixtyTwoToFourHundredSixtyFour[2], stage: '第六卷结案与断星远征承接阶段', focus: '续写第465章：人间武库发布以后断星远征只带走一份可验证的方法' });
}

const chapterFourHundredSixtyFive = 'manuscript/第六卷-人间武库/第465章-断星远征只带走一份可验证的方法.md';
if (state.files.some((item) => item.path === chapterFourHundredSixtyFive)) {
  const current = state.tasks.find((item) => item.title.includes('第465章'));
  if (current && current.status !== 'completed') await appendTask({ ...current, status: 'completed', agentWork: '第六卷以公共算法/私库边界/停止后责任/江砚锻骨/断星航路五线结案：12条v1.0、68任务、7家/71规则、11类遮罩和25项恢复均保留范围与失败；江砚锻骨初段不授岗位。断星外缘19年前失联中继发来417日延迟L6/M6/CAND-RELAY-3握手，只建设备候选。远征带7件最小包，不带私库/在役映射/个人/城市许可；装船旋转舱标准片出现17秒周期读数，启动第七卷环境校准。', links: [...new Set([...current.links, 'research/断星远征最小可验证携带包.md', 'decisions/远征不继承城市试点授权.md', 'planning/第六卷结案.md', 'planning/第七卷章纲.md', chapterFourHundredSixtyFive])], updatedAt: now() }, 'navigator');
  if (!taskTitles.has('整理断星远征最小可验证携带包')) {
    const timestamp = now();
    await appendTask({ id: uid('task'), title: '整理断星远征最小可验证携带包', description: '记录417日握手边界、7件携带资产、不携带/不继承项、旋转舱17秒首异常和第七卷新环境门。', level: 'volume', status: 'completed', kind: 'planning', assignee: 'navigator', source: 'navigator', priority: 'high', whyNow: '卷间迁移若只复制母星规则和权限，会在低重力/长延迟/有限备件环境把已验证范围误写成普适。', known: ['79章结案', 'L6/M6设备候选', '7件最小包', '17秒周期异常'], missingDecisions: [], aiPreAnalysis: '闭合第六卷证据后，仅迁移方法/标准/失败/撤退能力，明确新环境重新校准。', authorDecision: '不带整库或城市许可；D-5仍未知，锻骨不授远征指挥。', agentWork: '已生成research/断星远征最小可验证携带包.md、decisions/远征不继承城市试点授权.md、planning/第六卷结案.md和planning/第七卷章纲.md。', completionCriteria: ['第六卷79章闭合', '携带/不携带清楚', '第七卷首任务可执行'], links: ['research/断星远征最小可验证携带包.md', 'decisions/远征不继承城市试点授权.md', 'planning/第六卷结案.md', 'planning/第七卷章纲.md', chapterFourHundredSixtyFive], dependencies: [], createdAt: timestamp, updatedAt: timestamp }, 'agent');
  }
  if (!taskTitles.has('续写第466～468章：同一块校准片在旋转舱里每十七秒轻了一次')) {
    await appendTask({ id: uid('task'), title: '续写第466～468章：同一块校准片在旋转舱里每十七秒轻了一次', description: '确认17秒读数与旋转方位同步，在不同转速/方位/装夹建立六格对照，拆质量/法向载荷/甲板挠曲/量具漂移，形成远征校准0.1并测试锻骨初段不继承母星负荷。', level: 'chapter', status: 'now', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'critical', whyNow: '装船前标准件已显示母星重量语义失效；不先建立舰上本地真值，12条规则与江砚个人负荷都不能合法启用。', known: ['质量不变', '读针17秒周期下降/恢复', '旋转甲板与装夹候选', '母星许可不继承'], missingDecisions: ['周期是否锁旋转方位？', '甲板/量具/局部重力各占多少？', '最低可执行舰上校准是什么？'], aiPreAnalysis: '第466章相位确认；第467章转速×方位×装夹对照；第468章0.1/不可执行/人体负荷。', authorDecision: '不平均周期，不先判量具坏；设备与身体分别校准。', agentWork: '', completionCriteria: ['17秒来源可拆', '六格结果完整', '0.1范围/失败/撤退明确'], links: [chapterFourHundredSixtyFive, 'research/断星远征最小可验证携带包.md', 'planning/第七卷章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() }, 'navigator');
  }
  for (const goal of state.goals.filter((item) => item.status === 'active' && item.title.includes('第六卷《人间武库》'))) {
    await project.eventStore.append('goal.upsert', { ...goal, status: 'completed', updatedAt: now() } as never, 'author');
  }
  if (!state.goals.some((item) => item.title.includes('第七卷《断星远征》'))) {
    await project.eventStore.append('goal.upsert', { id: uid('goal'), level: 'volume', title: '完成第七卷《断星远征》并在星海环境重建可撤回的公共方法', description: '共77章：离开母星前往断星中继，让公共规则、停止权、角色权限和恢复能力在低重力、辐射、长延迟与有限补给中重新验证，并处理旧同盟真实分裂。', authority: 'author-pinned', status: 'active', target: 'manuscript/第七卷-断星远征', updatedAt: now() } as never, 'author');
  }
  const facts: StoryFact[] = [
    { id: uid('fact'), category: 'timeline', subject: '第六卷人间武库79章结案', statement: '第387～465章完成12条v1.0、68任务试点、7家/71规则再启、11类遮罩/5队24卡重放、25项恢复服务；2407件未被外推同一规则。', status: 'author-confirmed', evidence: [{ filePath: chapterFourHundredSixtyFive, quote: '第六卷《人间武库》完成。' }], updatedAt: now() },
    { id: uid('fact'), category: 'knowledge', subject: '断星中继417日延迟维修握手', statement: '断星带外缘19年前失联中继坞发来延迟417日握手，使用L6接口/M6代理槽/CAND-RELAY-3；只支持设备或兼容代理连续，不证明D-5本人/存活/控制。', status: 'text-explicit', evidence: [{ filePath: chapterFourHundredSixtyFive, quote: '握手使用L6物理接口与M6代理槽' }], updatedAt: now() },
    { id: uid('fact'), category: 'decision', subject: '断星远征7件最小可验证包', statement: '携12规则签名、公共校准/空白/B档工具、24重放与失败、离线停止确认、角色稳定号撤权、恢复赔付、未知范围外转介撤退；不携私库/映射/个人/未证阈值/城市许可。', status: 'author-confirmed', evidence: [{ filePath: chapterFourHundredSixtyFive, quote: '最小包有七件。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '旋转舱标准片17秒周期读数', statement: '标准片质量不变，B档读针每17秒随舱壁方位降低/恢复；候选含甲板周期挠曲、局部重力与装夹方向。下一步做相位/六格对照并建远征校准0.1。', status: 'text-explicit', evidence: [{ filePath: chapterFourHundredSixtyFive, quote: '同一块校准片为什么每十七秒轻了一次。' }], updatedAt: now() }
  ];
  for (const fact of facts) await appendFact(fact);
  await setPosition({ filePath: chapterFourHundredSixtyFive, stage: '第七卷旋转舱与出航校准阶段', focus: '续写第466～468章：同一块校准片在旋转舱里每十七秒轻了一次' });
}

const updated = await project.state();
process.stdout.write(`${JSON.stringify({ stats: updated.manuscriptStats, currentTask: updated.continueCard.focus, facts: updated.facts.length }, null, 2)}\n`);
