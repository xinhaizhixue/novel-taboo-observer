import path from 'node:path';
import { ProjectService } from '../electron/main/project.js';
import type { CreativeTask, StoryFact } from '../src/shared/types.js';
import { now, uid } from '../electron/main/utils.js';

const root = path.resolve(process.argv[2] || path.join(import.meta.dirname, '..', 'workspaces', 'wan-jie-zhu-shen'));
const project = new ProjectService('million-word-production');
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

const chaptersThreeHundredNineteenToThreeHundredTwentyOne = ['manuscript/第五卷-地窟王庭/第319章-把九十秒放在取样以前.md', 'manuscript/第五卷-地窟王庭/第320章-黄色以后还有四十四秒证据.md', 'manuscript/第五卷-地窟王庭/第321章-通行牌在七个人回来以后生成.md'];
if (chaptersThreeHundredNineteenToThreeHundredTwentyOne.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第319～321章'));
  if (current && current.status !== 'completed') await appendTask({ ...current, status: 'completed', agentWork: '第三训保持原红黄线、90秒信标和样本/信标/全员返回三门槛，通过入场先设信标与取样并行。黄色阶段两次逐项重算，江砚左腕绿伤后返回上限增加12秒；信标完成、样本有效，单点红色时撤退扩大并分线，七人5分11秒全部返回，训练通过后才生成单任务外环通行牌。', links: [...new Set([...current.links, 'planning/第五卷章纲.md', ...chaptersThreeHundredNineteenToThreeHundredTwentyOne])], updatedAt: now() }, 'writer');
  if (!taskTitles.has('续写第322～324章：正式任务包没有写王庭两个字')) {
    await appendTask({ id: uid('task'), title: '续写第322～324章：正式任务包没有写王庭两个字', description: '执行外环五号废槽回程节点复位：拆分人员身份、设备身份与匿名凭据权限，取回无主维修片并处理只认识设备型号的候选信号。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'critical', whyNow: '七人完成第三训并取得仅限一项任务的正式外环通行；首次真实接触必须先证明协议边界能工作，而不是追逐D-5或王庭标签。', known: ['通行范围仅外环且单任务有效', '目标为维修片、回程节点和全员返回', '候选接触只读设备身份层', '不得发送人员身份或追踪来源'], missingDecisions: ['候选信号读取设备型号后，应交换何种最小信息而不把设备响应解释成智慧个体？'], aiPreAnalysis: '第322章拆任务权限与三层接触结构；第323章进入五号废槽完成节点和维修片物理核验；第324章设备型号被读取，执行或拒绝最小交换并保留来源未知。', authorDecision: '不因卷名、维修片形制或合法候选信号预设王庭/D-5；只交换任务允许的低强度设备状态，人员和来源保持不可见。', agentWork: '', completionCriteria: ['人员/设备/匿名凭据三层权限可追溯', '维修片与节点有独立物理结果', '候选接触发生但不自动确认身份、族群或智慧'], links: [chaptersThreeHundredNineteenToThreeHundredTwentyOne[2], 'planning/第五卷章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() }, 'navigator');
  }
  const facts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '外环训练任务与安全同时通过', statement: '训练可通过任务并行、预登记岗位和逐次证据重算提高完成率；不得降低红黄线、90秒信标或样本/信标/全员返回门槛，也不得为通过挑全绿场景。', status: 'author-confirmed', evidence: [{ filePath: chaptersThreeHundredNineteenToThreeHundredTwentyOne[0], quote: '九十秒与取样并行。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '第五卷外环第三训', statement: '第三训信标先设、取样并行；两次黄色重算后信标90秒完成、样本有效，江砚左腕绿伤令上限加12秒，单点红色时撤退扩大，七人5分11秒返回并通过。', status: 'text-explicit', evidence: [{ filePath: chaptersThreeHundredNineteenToThreeHundredTwentyOne[2], quote: '三项目标第一次在同一场成立。' }], updatedAt: now() },
    { id: uid('fact'), category: 'decision', subject: '正式外环通行边界', statement: '正式通行牌在七人全部返回后生成，仅限外环、单项任务有效；不得读深层坐标、借D-5设备凭据或把候选接触改成人员追踪。', status: 'author-confirmed', evidence: [{ filePath: chaptersThreeHundredNineteenToThreeHundredTwentyOne[2], quote: '范围只有外环。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '外环五号废槽正式任务', statement: '首次正式任务为复位回程节点、取回无主维修片、全员返回；候选接触仅只读设备身份层，不发送人员身份、不追踪来源，任务包无王庭或D-5标签。', status: 'text-explicit', evidence: [{ filePath: chaptersThreeHundredNineteenToThreeHundredTwentyOne[2], quote: '任务包里没有“王庭”两个字。' }], updatedAt: now() }
  ];
  for (const fact of facts) await appendFact(fact);
  await setPosition({ filePath: chaptersThreeHundredNineteenToThreeHundredTwentyOne[2], stage: '第五卷首次正式外环任务', focus: '续写第322～324章：正式任务包没有写王庭两个字' });
}

const chaptersThreeHundredTwentyTwoToThreeHundredTwentyFour = ['manuscript/第五卷-地窟王庭/第322章-任务包先把人从设备里删掉.md', 'manuscript/第五卷-地窟王庭/第323章-维修片先留在原来的石缝里.md', 'manuscript/第五卷-地窟王庭/第324章-它读到型号没有读到江砚.md'];
if (chaptersThreeHundredTwentyTwoToThreeHundredTwentyFour.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第322～324章'));
  if (current && current.status !== 'completed') await appendTask({ ...current, status: 'completed', agentWork: '按人员身份、R-17设备身份、一次性匿名凭据三层执行首次正式接触；未知端只读设备层并接收一次凭据，返回三六三压力与兼容接口，人员零字段、来源未追踪。五号节点恢复第一回声，维修片由无主可回收改为登记主体未知、功能关联强、移动影响待核，任务仍在场内继续。', links: [...new Set([...current.links, 'research/外环候选接触三层协议核验.md', ...chaptersThreeHundredTwentyTwoToThreeHundredTwentyFour])], updatedAt: now() }, 'writer');
  if (!taskTitles.has('核验外环候选接触三层协议')) {
    const timestamp = now();
    await appendTask({ id: uid('task'), title: '核验外环候选接触三层协议', description: '把人员身份、设备身份与匿名凭据分层，列出首次正式外环接触的允许字段、禁止动作和解释候选。', level: 'session', status: 'completed', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'high', whyNow: '真实候选接触前必须让字段边界可审计，避免设备握手自动升级为人物或王庭正典。', known: ['正式通行仅限外环单任务', 'R-17协议四可被候选端读取', '人员身份和D-5凭据禁止发送'], missingDecisions: [], aiPreAnalysis: '对照第309、312、321章，将三层数据、允许动作、禁止动作与多种来源解释写成可迁移研究文件。', authorDecision: '研究资料不自动升级正典；单次合法响应只证明协议发生，不证明身份、族群或智慧。', agentWork: '已生成research/外环候选接触三层协议核验.md，覆盖三层字段、审计责任、允许/禁止动作及自动设施、远端中继、工具载体、匿名操作者等解释候选。', completionCriteria: ['三层字段边界明确', '发送与本地审计责任分离', '至少四种来源解释保留'], links: ['research/外环候选接触三层协议核验.md', chaptersThreeHundredTwentyTwoToThreeHundredTwentyFour[0]], dependencies: [], createdAt: timestamp, updatedAt: timestamp }, 'agent');
  }
  if (!taskTitles.has('续写第325～327章：无主维修片有一个正在使用它的插槽')) {
    await appendTask({ id: uid('task'), title: '续写第325～327章：无主维修片有一个正在使用它的插槽', description: '继续五号废槽正式任务：用独立物理证据核验维修片与节点的功能关系，获得机构分类答复，并完成维修片、节点和人员终态。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'critical', whyNow: '远程“无主可回收”分类已被原位磨痕、负载回声和候选兼容回应削弱；擅自取走可能破坏回程节点，擅自留置又不能完成任务。', known: ['维修片无登记但卡在节点窄槽', '轻触会让第二回声提前0.4秒', '候选三六三只能作辅助证据', '人员层零字段且来源未追踪'], missingDecisions: ['维修片应留置、取回还是由替代件接管功能，谁有权改变现场任务分类？'], aiPreAnalysis: '第325章完成非破坏负载和回声对照；第326章处理机构答复与证据/设施冲突；第327章形成可核验终态并全员撤出。', authorDecision: '候选信号不得作为唯一操作指令；以独立物理测试和机构任务权限决定，任务改动保留原始目标与理由。', agentWork: '', completionCriteria: ['至少两类独立物理证据支持功能关联', '任务分类变更有外部授权和追加记录', '节点、维修片、接触与人员终态分别结案'], links: [chaptersThreeHundredTwentyTwoToThreeHundredTwentyFour[2], 'research/外环候选接触三层协议核验.md', 'planning/第五卷章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() }, 'navigator');
  }
  const facts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '外环候选接触三层数据', statement: '人员身份层只在本地救援审计；设备层可发送一次性任务号、型号/协议/压力；匿名凭据仅证明本任务授权且单次失效，本地责任回执不随凭据发送。', status: 'author-confirmed', evidence: [{ filePath: chaptersThreeHundredTwentyTwoToThreeHundredTwentyFour[0], quote: '正式任务包有三层封套。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '五号废槽首次正式候选接触', statement: '未知端读取R-17设备层并请求授权；人类端发送1次匿名凭据，收到三六三压力与兼容接口回应；人员/D-5字段为零，未追踪来源，窗口结束。', status: 'text-explicit', evidence: [{ filePath: chaptersThreeHundredTwentyTwoToThreeHundredTwentyFour[2], quote: '接触终态：设备层读取成功' }], updatedAt: now() },
    { id: uid('fact'), category: 'knowledge', subject: '五号废槽无主维修片', statement: '薄片无登记/接线但卡入节点窄槽，原位磨痕连续；轻触使第二回声提前0.4秒，候选回应显示兼容接口。登记主体未知，节点功能关联强，移动影响待测试。', status: 'text-explicit', evidence: [{ filePath: chaptersThreeHundredTwentyTwoToThreeHundredTwentyFour[2], quote: '维修片确实影响节点。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '五号废槽任务现场分类变更', statement: '队伍已申请将维修片从无主可回收改为功能关联待核；外环机构答复前不移动，节点第二回声未完成，正式任务继续且七人未向深处越界。', status: 'text-explicit', evidence: [{ filePath: chaptersThreeHundredTwentyTwoToThreeHundredTwentyFour[2], quote: '任务没有完成。' }], updatedAt: now() }
  ];
  for (const fact of facts) await appendFact(fact);
  await setPosition({ filePath: chaptersThreeHundredTwentyTwoToThreeHundredTwentyFour[2], stage: '第五卷维修片功能关联阶段', focus: '续写第325～327章：无主维修片有一个正在使用它的插槽' });
}

const chaptersThreeHundredTwentyFiveToThreeHundredTwentySeven = ['manuscript/第五卷-地窟王庭/第325章-候选信号关闭以后回声还在.md', 'manuscript/第五卷-地窟王庭/第326章-原目标没有被新目标覆盖.md', 'manuscript/第五卷-地窟王庭/第327章-带回来的不是那枚维修片.md'];
if (chaptersThreeHundredTwentyFiveToThreeHundredTwentySeven.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第325～327章'));
  if (current && current.status !== 'completed') await appendTask({ ...current, status: 'completed', agentWork: '屏蔽R-17后完成多点负载、0.2毫米微移、13～18年矿层/磨痕和H-2同厚替代对照：标准片仅恢复六成回声且偏7度，原片回位后三次方向误差≤0.9度。机构保留原目标并追加授权原片留置；节点复位、证据包带回、七人5分12秒撤出，首次正式外环任务完成。', links: [...new Set([...current.links, 'research/外环五号维修片功能关联核验.md', ...chaptersThreeHundredTwentyFiveToThreeHundredTwentySeven])], updatedAt: now() }, 'writer');
  if (!taskTitles.has('核验外环五号维修片功能关联')) {
    const timestamp = now();
    await appendTask({ id: uid('task'), title: '核验外环五号维修片功能关联', description: '将屏蔽负载、微移、矿层磨痕和H-2替代对照整理为可迁移证据，限制结论到节点功能关系。', level: 'session', status: 'completed', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'high', whyNow: '候选三六三不能成为操作和分类的唯一依据，任务变更需要独立物理证据。', known: ['原片影响第二回声', '登记主体和制造来源未知', 'R-17接触已结束'], missingDecisions: [], aiPreAnalysis: '逐项分离负载、位移、时间层和替代件证据，记录授权链与仍未知项。', authorDecision: '结论仅为后加入的节点功能件；不推断安装者、所有权、候选来源或智慧。', agentWork: '已生成research/外环五号维修片功能关联核验.md；保留原目标、追加分类失效和原片留置授权，明确未带回实物。', completionCriteria: ['至少三类独立测试可复算', '候选信号仅作弱旁证', '授权和未知项完整'], links: ['research/外环五号维修片功能关联核验.md', chaptersThreeHundredTwentyFiveToThreeHundredTwentySeven[2]], dependencies: [], createdAt: timestamp, updatedAt: timestamp }, 'agent');
  }
  if (!taskTitles.has('续写第328～330章：同一地层里四种会动的目标')) {
    await appendTask({ id: uid('task'), title: '续写第328～330章：同一地层里四种会动的目标', description: '拆分五号废槽回撤图中的热快目标、冷点群、周期扫描和长形承力结构，通过可控刺激建立第一版多目标谱。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'critical', whyNow: '首次正式任务回撤出现四组不同运动曲线；若直接统一成王庭目标，会把生物、工具载体、独立巢群和设施运动混成单一阵营。', known: ['热快目标至少有一只灰背穴兽', '二十余冷点未与穴兽同步追击', '周期扫描接近旧确认头频率', '长形结构依次收缩但未靠近人员'], missingDecisions: ['四类运动分别对热、压力、节点回声和彼此位置如何响应，哪些标签仍只能保持候选？'], aiPreAnalysis: '第328章拆物理曲线与观测限制；第329章设计不伤害人员的多刺激对照；第330章建立带证据等级和反例的多目标谱。', authorDecision: '先描述运动和响应，不按卷名预设族群、工具或王庭；每个分类都保留替代解释与升级条件。', agentWork: '', completionCriteria: ['四组曲线不被同一标签覆盖', '至少两种刺激产生区分性响应', '形成可修订多目标谱且不提前确认阵营'], links: [chaptersThreeHundredTwentyFiveToThreeHundredTwentySeven[2], 'research/外环五号维修片功能关联核验.md', 'planning/第五卷章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() }, 'navigator');
  }
  const facts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '外环任务追加式分类变更', statement: '现场证据推翻任务分类时不删除原目标；追加分类依据失效、授权者、证据、时间和替代终态，防止新目标覆盖旧目标或队伍自行改成功。', status: 'author-confirmed', evidence: [{ filePath: chaptersThreeHundredTwentyFiveToThreeHundredTwentySeven[1], quote: '原目标仍保留在历史里。' }], updatedAt: now() },
    { id: uid('fact'), category: 'knowledge', subject: '五号维修片功能对照终态', statement: '屏蔽接触后的负载/微移仍改变第二回声；薄片覆盖层约13～18年；H-2同厚片只恢复六成且偏7度，原片回位后三次误差≤0.9度。功能关联成立，来源/安装者未知。', status: 'text-explicit', evidence: [{ filePath: chaptersThreeHundredTwentyFiveToThreeHundredTwentySeven[1], quote: '原片的六齿、弧槽与磨合位置' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '五号废槽首次正式任务结案', statement: '外环机构授权维修片原位留置并带回扫描/曲线/矿层样本；节点三次方向回声合格，候选接触保持未知，七人5分12秒返回，单任务通行牌失效。', status: 'text-explicit', evidence: [{ filePath: chaptersThreeHundredTwentyFiveToThreeHundredTwentySeven[2], quote: '首次正式外环任务完成。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '五号废槽四组运动候选', statement: '回撤图记录热快穴兽级目标、20余冷点群、11秒周期导轨扫描、长形依次收缩结构；目前只确认曲线不同，未统一为生物、工具、设施或阵营。', status: 'text-explicit', evidence: [{ filePath: chaptersThreeHundredTwentyFiveToThreeHundredTwentySeven[2], quote: '当前设备只能证明四种运动曲线不同。' }], updatedAt: now() }
  ];
  for (const fact of facts) await appendFact(fact);
  await setPosition({ filePath: chaptersThreeHundredTwentyFiveToThreeHundredTwentySeven[2], stage: '第五卷地窟多目标谱阶段', focus: '续写第328～330章：同一地层里四种会动的目标' });
}

const chaptersThreeHundredTwentyEightToThreeHundredThirty = ['manuscript/第五卷-地窟王庭/第328章-先给四组曲线取编号.md', 'manuscript/第五卷-地窟王庭/第329章-四种目标没有一起追热源.md', 'manuscript/第五卷-地窟王庭/第330章-第一版目标谱不画阵营边界.md'];
if (chaptersThreeHundredTwentyEightToThreeHundredThirty.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第328～330章'));
  if (current && current.status !== 'completed') await appendTask({ ...current, status: 'completed', agentWork: '将五号废槽运动分为A灰背穴兽个体、B二十三低热点、C导轨11秒扫描、D十四米顺序承力结构；通过12度热片、一二一受控压力和协议二回声完成区分。A追热，B压力下散聚，C被协议重置，D按压力峰改变承力点；形成0.1目标谱，只确认四种物理模式，不确认阵营。', links: [...new Set([...current.links, 'research/五号废槽四类运动第一版目标谱.md', ...chaptersThreeHundredTwentyEightToThreeHundredThirty])], updatedAt: now() }, 'writer');
  if (!taskTitles.has('整理五号废槽四类运动第一版目标谱')) {
    const timestamp = now();
    await appendTask({ id: uid('task'), title: '整理五号废槽四类运动第一版目标谱', description: '把四类运动的特征、区分响应、证据等级、保留候选和关系边界写成可修订研究资料。', level: 'session', status: 'completed', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'high', whyNow: '同层运动若只按“会动”聚合，会把生物、工具、设施和地层响应错误归为一个王庭阵营。', known: ['A有灰背穴兽直接影像', 'B为23个低热点', 'C沿导轨11秒扫描', 'D为14米顺序承力结构'], missingDecisions: [], aiPreAnalysis: '汇总热、压力和协议回声对照，分别记录高/中证据等级与不能推出的关系。', authorDecision: '0.1谱只描述物理模式；共同刺激响应不等于共同指挥，不画阵营边界。', agentWork: '已生成research/五号废槽四类运动第一版目标谱.md，包含A-D表、关系证据边界与仅跟踪B类的下一步。', completionCriteria: ['四类响应独立成行', '每行含证据等级和替代解释', '明确不支持四阵营或单一王庭'], links: ['research/五号废槽四类运动第一版目标谱.md', chaptersThreeHundredTwentyEightToThreeHundredThirty[2]], dependencies: [], createdAt: timestamp, updatedAt: timestamp }, 'agent');
  }
  if (!taskTitles.has('续写第331～333章：二十三个冷点没有跟穴兽回巢')) {
    await appendTask({ id: uid('task'), title: '续写第331～333章：二十三个冷点没有跟穴兽回巢', description: '连续跟踪B类低热点的数量、携带物与汇合路线，区分独立巢群、工具载体和设施附属候选。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'critical', whyNow: 'B类不追热、压力下散聚，测试后未跟灰背穴兽离开，并在碎裂固定孔带走一枚低温小片；三种行为无法由穴兽附属标签解释。', known: ['B类共23点且可分/重聚', '多数不响应协议回声', '未与A同步追击或回撤', '3点在固定孔停留并带走低温小片'], missingDecisions: ['携带物是什么，汇合点是否稳定，B与C/D是否存在交换或仅共享路径？'], aiPreAnalysis: '第331章跟踪数量连续和携带物；第332章观察汇合点及与C/D关系；第333章更新B类候选并保留个体差异。', authorDecision: '不捕杀或诱入人员区；只用现有远程监测和自然行为，不把采集、搬运、聚居提前解释为王庭工兵。', agentWork: '', completionCriteria: ['23点的分合与丢失可追溯', '携带物至少获得一项物理信息', 'B类候选收敛但不强行确认身份/阵营'], links: [chaptersThreeHundredTwentyEightToThreeHundredThirty[2], 'research/五号废槽四类运动第一版目标谱.md', 'planning/第五卷章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() }, 'navigator');
  }
  const facts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '地窟多目标谱证据边界', statement: '目标谱按物理特征、区分响应、证据等级、反例和升级条件记录；共同刺激下同时变化不等于共同命令，同层四种模式不等于四阵营或单一王庭。', status: 'author-confirmed', evidence: [{ filePath: chaptersThreeHundredTwentyEightToThreeHundredThirty[2], quote: '第一版目标谱有四行。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '五号废槽三类远程对照', statement: '12度热片仅A灰背穴兽追逐；一二一压力使B散聚、D按峰值改变承力点；协议二回声重置C扫描、使D短停且仅吸引B中2点。无人重新入场。', status: 'text-explicit', evidence: [{ filePath: chaptersThreeHundredTwentyEightToThreeHundredThirty[1], quote: '四种目标没有一起追热源。' }], updatedAt: now() },
    { id: uid('fact'), category: 'knowledge', subject: '五号废槽0.1多目标谱', statement: 'A为灰背穴兽个体高证据；B为23低热多点群中证据；C为设施/沿设施装置高证据；D为压力响应结构中证据。具体族群、机制与关系仍未知。', status: 'text-explicit', evidence: [{ filePath: chaptersThreeHundredTwentyEightToThreeHundredThirty[2], quote: '当前结论只到这里' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: 'B类二十三冷点后续', statement: 'B类测试后未跟A穴兽离开，19点与4留置点重新汇合；3点在碎裂固定孔停留并带走低温小片。下一步仅跟踪数量、携带物和去向。', status: 'text-explicit', evidence: [{ filePath: chaptersThreeHundredTwentyEightToThreeHundredThirty[2], quote: '二十三个冷点在测试结束后没有跟灰背穴兽走。' }], updatedAt: now() }
  ];
  for (const fact of facts) await appendFact(fact);
  await setPosition({ filePath: chaptersThreeHundredTwentyEightToThreeHundredThirty[2], stage: '第五卷B类冷点跟踪阶段', focus: '续写第331～333章：二十三个冷点没有跟穴兽回巢' });
}

const chaptersThreeHundredThirtyOneToThreeHundredThirtyThree = ['manuscript/第五卷-地窟王庭/第331章-二十三个点先按遮挡守恒.md', 'manuscript/第五卷-地窟王庭/第332章-有七个冷点没有等第十一次扫描.md', 'manuscript/第五卷-地窟王庭/第333章-会搬东西不等于替谁工作.md'];
if (chaptersThreeHundredThirtyOneToThreeHundredThirtyThree.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第331～333章'));
  if (current && current.status !== 'completed') await appendTask({ ...current, status: 'completed', agentWork: '以三监测器事前校时和遮挡守恒连续跟踪B类6小时：直接拍到11只弧形矿壳、软组织、六细肢的小型生物，其余12只保持低一级同类候选；23点经历19+4到16暗腔/5外侧/2固定孔。3只主动携带直角缺口低温片进入D暗腔，C扫描无统一指令，A经过未跟随；升级0.2谱但B-D仅为时间关联。', links: [...new Set([...current.links, 'research/B类二十三冷点自然行为跟踪.md', ...chaptersThreeHundredThirtyOneToThreeHundredThirtyThree])], updatedAt: now() }, 'writer');
  if (!taskTitles.has('整理B类二十三冷点自然行为跟踪')) {
    const timestamp = now();
    await appendTask({ id: uid('task'), title: '整理B类二十三冷点自然行为跟踪', description: '记录B类数量守恒、形态证据覆盖、携带行为和与A/C/D的关系边界，形成0.2增量。', level: 'session', status: 'completed', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'high', whyNow: 'B类已出现直接生物形态和主动携带，但遮挡、第四面未知通道与个体差异不允许把23点全部写成同种王庭工具。', known: ['11只直接成像', '23点六小时守恒', '3只携片进入D暗腔', 'C扫描无统一停行'], missingDecisions: [], aiPreAnalysis: '区分直接形态、连续同类候选、守恒计数与关系相关，保存不可见区域的上下限。', authorDecision: '不捕获、不诱导；直接证据只覆盖实际成像个体，携带用途与阵营保持未知。', agentWork: '已生成research/B类二十三冷点自然行为跟踪.md，包含数量/形态、携带/汇合、A/C/D关系与下一步纯被动承力对照。', completionCriteria: ['形态覆盖范围不外推', '遮挡计数含未知通道边界', '关系候选保留反例'], links: ['research/B类二十三冷点自然行为跟踪.md', chaptersThreeHundredThirtyOneToThreeHundredThirtyThree[2]], dependencies: [], createdAt: timestamp, updatedAt: timestamp }, 'agent');
  }
  if (!taskTitles.has('续写第334～336章：冷点进入以后长形结构少抬两个支点')) {
    await appendTask({ id: uid('task'), title: '续写第334～336章：冷点进入以后长形结构少抬两个支点', description: '用纯被动承力片比较无B活动、B进入、携片进入与B离开时段，核验D类七变五是否与B行为稳定相关。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'critical', whyNow: '三枚低温片进入D暗腔后承力点7→6→5，但背景压力下降和16只个体活动同时发生；必须分离相关因素才能完成多目标谱阶段。', known: ['B为壳载小型生物群高/中混合证据', 'D为14米压力响应结构', 'C未因携片改变周期', '暗腔第四面不可见'], missingDecisions: ['D变化由压力、B活动、携带物还是多因素共同造成，B-D能否升级为稳定功能关系？'], aiPreAnalysis: '第334章建立无B活动基线；第335章分时段对照B进入/携片/B离开；第336章更新B-D关系并完成多目标谱阶段。', authorDecision: '只用被动监测，不新增刺激或捕获；时间先后不足以写成维护、交换或指挥。', agentWork: '', completionCriteria: ['至少覆盖四类自然时段', '背景压力与B活动分开记录', '关系结论有证据等级和替代解释'], links: [chaptersThreeHundredThirtyOneToThreeHundredThirtyThree[2], 'research/B类二十三冷点自然行为跟踪.md', 'planning/第五卷章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() }, 'navigator');
  }
  const facts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '地窟遮挡守恒与形态外推边界', statement: '被动跟踪按遮挡区进出与时空连续守恒，不把不可见写成死亡/消失；形态只赋给直接成像个体，其余连续目标保持低一级同类候选。', status: 'author-confirmed', evidence: [{ filePath: chaptersThreeHundredThirtyOneToThreeHundredThirtyThree[0], quote: '第一条规则是遮挡守恒。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: 'B类二十三冷点六小时跟踪', statement: 'B类按守恒由19+4变为16暗腔/5外侧/2固定孔；11只直接见矿质背壳、软组织和六肢，3只携低温片进入D暗腔，6只后出未携片。', status: 'text-explicit', evidence: [{ filePath: chaptersThreeHundredThirtyOneToThreeHundredThirtyThree[2], quote: 'B 类目标谱从一句改成四层。' }], updatedAt: now() },
    { id: uid('fact'), category: 'knowledge', subject: 'B类0.2目标谱', statement: 'B主标签为低热壳载小型生物群，高/中混合证据，具分合与携带行为；独立巢群候选上升，工具载体与设施附属候选保留，不确认阵营。', status: 'text-explicit', evidence: [{ filePath: chaptersThreeHundredThirtyOneToThreeHundredThirtyThree[2], quote: '0.1目标谱升级为0.2。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: 'B-D承力关系后续', statement: '携片进入D暗腔后D承力点7→6→5，但背景压力和腔内活动同时变化；下一步以纯被动承力片比较无B、B进入、携片进入与B离开时段。', status: 'text-explicit', evidence: [{ filePath: chaptersThreeHundredThirtyOneToThreeHundredThirtyThree[2], quote: 'B 将小片送入 D 暗腔后' }], updatedAt: now() }
  ];
  for (const fact of facts) await appendFact(fact);
  await setPosition({ filePath: chaptersThreeHundredThirtyOneToThreeHundredThirtyThree[2], stage: '第五卷B-D关系核验阶段', focus: '续写第334～336章：冷点进入以后长形结构少抬两个支点' });
}

const chaptersThreeHundredThirtyFourToThreeHundredThirtySix = ['manuscript/第五卷-地窟王庭/第334章-没有冷点时长形结构也会七变五.md', 'manuscript/第五卷-地窟王庭/第335章-小片进入以后先变的是局部负载.md', 'manuscript/第五卷-地窟王庭/第336章-功能关系不等于上下级.md'];
if (chaptersThreeHundredThirtyFourToThreeHundredThirtySix.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第334～336章'));
  if (current && current.status !== 'completed') await appendTask({ ...current, status: 'completed', agentWork: '纯被动承力片记录73轮基线：可见入口无B时两次7→5均伴压力下降，推翻B必要条件；无携片B进入时D保持7点。直角片进入局部负载+12%后D 7→6，取出-11%后6→7；另两次自然送片部分复现。结论为背景压力主导、B携带物形成中等证据的材料介导局部承力耦合，不等于维护或上下级。', links: [...new Set([...current.links, 'research/B-D纯被动承力关系核验.md', ...chaptersThreeHundredThirtyFourToThreeHundredThirtySix])], updatedAt: now() }, 'writer');
  if (!taskTitles.has('整理B-D纯被动承力关系核验')) {
    const timestamp = now();
    await appendTask({ id: uid('task'), title: '整理B-D纯被动承力关系核验', description: '分离背景压力、B活动和携带物进入/取出，记录反例、正反时序、证据等级与适用范围。', level: 'session', status: 'completed', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'high', whyNow: '携片后七变五的时间关联不足以支撑维护或交换结论，需要无B反例和反向取出证据。', known: ['D按压力在5～8支点变化', 'B携片进入D暗腔', 'C周期未改变', '暗腔第四面未知'], missingDecisions: [], aiPreAnalysis: '建立无B基线，比较无携片进入、携片进入、掉片在外与取片离开，限制结论范围。', authorDecision: '仅确认材料介导局部承力耦合；不推断意图、上下级、所有权或阵营。', agentWork: '已生成research/B-D纯被动承力关系核验.md，包含73轮反例基线、四类自然时段、正反负载顺序与五号废槽适用范围。', completionCriteria: ['有否定必要条件的反例', '至少一组进入/取出正反顺序', '结论含范围和替代解释'], links: ['research/B-D纯被动承力关系核验.md', chaptersThreeHundredThirtyFourToThreeHundredThirtySix[2]], dependencies: [], createdAt: timestamp, updatedAt: timestamp }, 'agent');
  }
  if (!taskTitles.has('续写第337～339章：石台上的东西每次都少一件多一件')) {
    await appendTask({ id: uid('task'), title: '续写第337～339章：石台上的东西每次都少一件多一件', description: '重建两组路线在平石台的到离时间、重量和物件变化，区分交换、缓存、清理与维修取放。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'critical', whyNow: '五号节点连续收到两组相反重量趋势的路线通过压力，交叉石台物件每次有增有减，但从未看见双方同时出现；这是关系证据而非物理类型证据。', known: ['一组向中层边缘去且携带重量增加', '另一组沿旧路返回且重量减少', '石台一次少2多1、另一次少1多3', '无双方同场影像'], missingDecisions: ['同一目标往返、缓存、清理、维修取放或跨目标交换中，哪些可由时间与物件守恒排除？'], aiPreAnalysis: '第337章重建时间与路线连续；第338章比较物件重量/摆放和等待窗口；第339章形成第一版石台关系候选。', authorDecision: '不以“少一件多一件”直接宣布交易；交换至少需要跨目标守恒、延迟和重复方向关系，仍保留非意图解释。', agentWork: '', completionCriteria: ['排查同一目标自取自放', '至少四种解释分别有支持/反例', '关系结论不越级为市场、王庭或盟约'], links: [chaptersThreeHundredThirtyFourToThreeHundredThirtySix[2], 'research/B-D纯被动承力关系核验.md', 'planning/第五卷章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() }, 'navigator');
  }
  const facts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '地窟关系因果升级边界', statement: '时间先后需结合无目标反例、进入/取出正反顺序、背景因素和重复事件才能升级为功能耦合；耦合仍不等于意图、维护、上下级或阵营。', status: 'author-confirmed', evidence: [{ filePath: chaptersThreeHundredThirtyFourToThreeHundredThirtySix[2], quote: '“耦合”描述先后和受力。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: 'B-D纯被动承力核验', statement: '73轮基线确认D支点主要随压力5～8变化；无B时两次7→5，无携片B进入不变。碎片进入负载先升/D后减，取出负载先降/D后加，另一次进入复现。', status: 'text-explicit', evidence: [{ filePath: chaptersThreeHundredThirtyFourToThreeHundredThirtySix[1], quote: '进入时负载先升、D 后减点。' }], updatedAt: now() },
    { id: uid('fact'), category: 'knowledge', subject: '五号废槽0.3多目标谱结案', statement: 'A生物个体、B壳载生物群、C周期设施/装置、D压力响应结构分离；B携带物与D为中等证据材料耦合。物理多样性成立，政治阵营与统一指挥未知。', status: 'author-confirmed', evidence: [{ filePath: chaptersThreeHundredThirtyFourToThreeHundredThirtySix[2], quote: '多目标谱阶段完成四项门槛。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '中层边缘平石台取放候选', statement: '五号节点记录两组重复路线在平石台交叉：向中层路线重量增加、返回旧路重量减少，台上物件有增有减且无双方同场；交换/缓存/清理/维修均待核。', status: 'text-explicit', evidence: [{ filePath: chaptersThreeHundredThirtyFourToThreeHundredThirtySix[2], quote: '可能是交换。' }], updatedAt: now() }
  ];
  for (const fact of facts) await appendFact(fact);
  await setPosition({ filePath: chaptersThreeHundredThirtyFourToThreeHundredThirtySix[2], stage: '第五卷中层路线与石台关系阶段', focus: '续写第337～339章：石台上的东西每次都少一件多一件' });
}

const chaptersThreeHundredThirtySevenToThreeHundredThirtyNine = ['manuscript/第五卷-地窟王庭/第337章-两条路线先证明不是同一个往返.md', 'manuscript/第五卷-地窟王庭/第338章-不是每次经过都要拿走一件.md', 'manuscript/第五卷-地窟王庭/第339章-异步互惠候选不是地下市场.md'];
if (chaptersThreeHundredThirtySevenToThreeHundredThirtyNine.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第337～339章'));
  if (current && current.status !== 'completed') await appendTask({ ...current, status: 'completed', agentWork: '重建E三硬接触/52～58kg与F宽带/80～96kg两类路线：相隔620米传感点同时重叠19秒，排除同一整体目标绕路。至少三轮中心物件由一方新增、另一方取走，第6/7轮E留窄片→F取窄片留软物→E取软物；形成跨目标转移高证据、延迟互惠中候选，仍保留共享缓存与维修中转。', links: [...new Set([...current.links, 'research/中层边缘平石台取放序列核验.md', ...chaptersThreeHundredThirtySevenToThreeHundredThirtyNine])], updatedAt: now() }, 'writer');
  if (!taskTitles.has('整理中层边缘平石台取放序列')) {
    const timestamp = now();
    await appendTask({ id: uid('task'), title: '整理中层边缘平石台取放序列', description: '按路线签名、同时存在、物件身份、重量守恒和跨轮取放建立第一版关系候选。', level: 'session', status: 'completed', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'high', whyNow: '物件增减容易被直接讲成交易，但没有双方同场、价值、约定或稳定个体证据。', known: ['E/F同时存在19秒', '三轮中心物跨签名转移', '部分旧物长期不取', '一次经过可只放不取'], missingDecisions: [], aiPreAnalysis: '依次排除同一目标绕路，比较缓存/清理/维修/交换支持与反例，保存压力签名不等于身份。', authorDecision: '只命名异步取放点；市场、货币、王庭规则均证据不足。', agentWork: '已生成research/中层边缘平石台取放序列核验.md，包含多使用者证据、跨目标取放、候选排序和透明硬片异常。', completionCriteria: ['排除同一整体目标', '物件身份需重量/位置/边缘特征共同确认', '交易与组织不得越级'], links: ['research/中层边缘平石台取放序列核验.md', chaptersThreeHundredThirtySevenToThreeHundredThirtyNine[2]], dependencies: [], createdAt: timestamp, updatedAt: timestamp }, 'agent');
  }
  if (!taskTitles.has('续写第340～342章：多出来的一件东西没有被带走')) {
    await appendTask({ id: uid('task'), title: '续写第340～342章：多出来的一件东西没有被带走', description: '跟踪自然落入石台的透明硬片，比较E/F对自然新增、对方新增和旧边缘物的选择差异，核验材料选择或来源识别。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'critical', whyNow: '透明硬片不在E/F到达重量中，E/F均拒取，F只将其推到边缘；它提供不由人类投放的选择性反例。', known: ['透明片从石台上方自然落下', 'E取弯边薄片而跳过透明片', 'F也跳过并把透明片推到边缘', 'F随后放下三孔灰板'], missingDecisions: ['透明片因材质、形状、来源还是位置被拒取，第三签名目标是否会处理它？'], aiPreAnalysis: '第340章跟踪透明片自然终态；第341章比较E/F选择集；第342章更新异步互惠/缓存/清理候选。', authorDecision: '不人工添加对照物；若后续被取走，也按实际签名与伴随回置记录，不倒推前两次拒取意图。', agentWork: '', completionCriteria: ['透明片全程位置与物理状态连续', '至少两类物件选择产生反例', '选择性结论不越级为价值或货币'], links: [chaptersThreeHundredThirtySevenToThreeHundredThirtyNine[2], 'research/中层边缘平石台取放序列核验.md', 'planning/第五卷章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() }, 'navigator');
  }
  const facts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '中层石台关系证据分级', statement: '不同压力签名可证明同时存在的整体施压来源，不等于稳定个体/物种/阵营；物件转移需位置、重量和边缘特征共同确认，互惠不自动升级为价值、市场或组织。', status: 'author-confirmed', evidence: [{ filePath: chaptersThreeHundredThirtySevenToThreeHundredThirtyNine[2], quote: '石台关系候选分四级。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '中层平石台E-F取放序列', statement: 'E/F在620米分离传感点同时重叠19秒；至少三轮中心物跨签名转移，第6/7轮E留窄片、F取窄片留软物、E再取软物，双方不必每次取物。', status: 'text-explicit', evidence: [{ filePath: chaptersThreeHundredThirtySevenToThreeHundredThirtyNine[1], quote: '关系图因此有两条实线。' }], updatedAt: now() },
    { id: uid('fact'), category: 'knowledge', subject: '中层边缘平石台0.1关系候选', statement: '多个使用者与跨目标物件转移为高证据，延迟互惠为中证据；共享缓存、维修中转保留，市场/货币/王庭规则证据不足。', status: 'text-explicit', evidence: [{ filePath: chaptersThreeHundredThirtySevenToThreeHundredThirtyNine[2], quote: '第一版名称写：中层边缘平石台异步取放点。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '平石台透明硬片拒取异常', statement: '一块不在E/F到达重量中的透明硬片自然落到中央；E/F均未取，F将其推到边缘后放下三孔灰板。下一步观察选择性与第三使用者。', status: 'text-explicit', evidence: [{ filePath: chaptersThreeHundredThirtySevenToThreeHundredThirtyNine[2], quote: '多出来的一件东西没有被带走。' }], updatedAt: now() }
  ];
  for (const fact of facts) await appendFact(fact);
  await setPosition({ filePath: chaptersThreeHundredThirtySevenToThreeHundredThirtyNine[2], stage: '第五卷石台选择性取放阶段', focus: '续写第340～342章：多出来的一件东西没有被带走' });
}

const chaptersThreeHundredFortyToThreeHundredFortyTwo = ['manuscript/第五卷-地窟王庭/第340章-透明片在边缘待了四十八小时.md', 'manuscript/第五卷-地窟王庭/第341章-第三种压力签名只拿透明片.md', 'manuscript/第五卷-地窟王庭/第342章-被拒绝不等于没有价值.md'];
if (chaptersThreeHundredFortyToThreeHundredFortyTwo.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第340～342章'));
  if (current && current.status !== 'completed') await appendTask({ ...current, status: 'completed', agentWork: '自然透明T-1/T-2在中心与边缘被E/F七次经过重复拒取并移边；同一上方来源、相近尺寸的不透明O-1被E取走，削弱位置/来源/尺寸解释。G型七低热点只取两枚T类、零回置，证明T可携且对另一签名被选择，但G不进入互惠。石台0.2新增E/F-T重复不选择中证据与G-T一次携取高事件证据，不建立价值。', links: [...new Set([...current.links, 'research/平石台透明硬片选择性拒取核验.md', ...chaptersThreeHundredFortyToThreeHundredFortyTwo])], updatedAt: now() }, 'writer');
  if (!taskTitles.has('整理平石台透明硬片选择性拒取核验')) {
    const timestamp = now();
    await appendTask({ id: uid('task'), title: '整理平石台透明硬片选择性拒取核验', description: '记录T类个体连续、位置/来源自然对照、G携取事件和选择集证据边界。', level: 'session', status: 'completed', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'high', whyNow: 'E/F共同拒取可能来自位置、材质、抓取能力或来源；G取走也不能倒推统一价值。', known: ['T-1/T-2均自然落片', 'O-1同来源但不透明并被E取', 'G仅取T类且零回置', 'E/F互惠链继续'], missingDecisions: [], aiPreAnalysis: '核对缺口/白线/重量身份，比较中央/边缘与透明/不透明，限制G事件到一次携取。', authorDecision: '选择集只描述签名级动作；被拒取不等于无价值，不建立货币或第三交易者。', agentWork: '已生成research/平石台透明硬片选择性拒取核验.md，包含T类连续、O-1自然对照、G事件及关系更新。', completionCriteria: ['自然对照无人工投放', 'T类身份与可携性可核验', '选择原因与价值保持未知'], links: ['research/平石台透明硬片选择性拒取核验.md', chaptersThreeHundredFortyToThreeHundredFortyTwo[2]], dependencies: [], createdAt: timestamp, updatedAt: timestamp }, 'agent');
  }
  if (!taskTitles.has('续写第343～345章：三孔灰板出现在另一条路的裂缝里')) {
    await appendTask({ id: uid('task'), title: '续写第343～345章：三孔灰板出现在另一条路的裂缝里', description: '核验石台三孔灰板与F旧路裂缝灰板的物件连续，重建E取走后进入F路线的时间和功能，完成中层路线/取放阶段结案。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'critical', whyNow: 'F留、E取的三孔灰板疑似在72小时后进入F路线侧裂缝；若同物成立，将同时支持跨目标交付和共享维修用途。', known: ['两板均有孔旁半月缺口', '石台灰板由F留下、E取走', 'F旧路侧裂缝后出现三孔板', '当前只见远程边缘影像'], missingDecisions: ['是否同一物件，E如何把它送入F路线，灰板是否真实改变路线功能？'], aiPreAnalysis: '第343章核对孔距/缺口/重量与时间连续；第344章重建路线与安装效果；第345章更新异步互惠和维修中转候选并阶段结案。', authorDecision: '先确认物件连续再谈用途；同物和功能成立也只支持跨目标维修交付，不自动证明市场或组织。', agentWork: '', completionCriteria: ['至少三项独立特征支持或否定同物', '灰板进入F路线的中间链有明确缺口', '关系候选按证据升级且保留政治边界'], links: [chaptersThreeHundredFortyToThreeHundredFortyTwo[2], 'research/平石台透明硬片选择性拒取核验.md', 'planning/第五卷章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() }, 'navigator');
  }
  const facts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '石台选择集证据边界', statement: '重复取/不取可形成签名级选择集，但材料、位置、来源、气味等原因需自然对照；拒取不等于无价值，一次携取不等于稳定偏好或互惠关系。', status: 'author-confirmed', evidence: [{ filePath: chaptersThreeHundredFortyToThreeHundredFortyTwo[2], quote: '平石台0.2关系候选增加一列：选择集。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '平石台T类透明片与G事件', statement: 'T-1/T-2自然落在边缘/中央，E/F多轮拒取并由F移边；同来源不透明O-1被E取。G型7低热点只携走T-1/T-2、零回置，之后未形成稳定路线。', status: 'text-explicit', evidence: [{ filePath: chaptersThreeHundredFortyToThreeHundredFortyTwo[1], quote: 'G 只拿了两块透明片。' }], updatedAt: now() },
    { id: uid('fact'), category: 'knowledge', subject: '平石台0.2选择集关系', statement: 'E/F跨目标取放高、延迟互惠中；E/F对T类重复不选择中；G对T类一次携取为高事件证据，G与E/F关系未知。材料选择不证明统一或分裂阵营。', status: 'text-explicit', evidence: [{ filePath: chaptersThreeHundredFortyToThreeHundredFortyTwo[2], quote: '中层路线图因此出现三种关系。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: 'F路线三孔灰板连续候选', statement: 'F曾在石台留下、E随后取走的三孔灰板，72小时后疑似出现在F旧路侧裂缝；孔旁半月缺口相似，尚需孔距/重量/时间核验。', status: 'text-explicit', evidence: [{ filePath: chaptersThreeHundredFortyToThreeHundredFortyTwo[2], quote: '下一项证据来自三孔灰板。' }], updatedAt: now() }
  ];
  for (const fact of facts) await appendFact(fact);
  await setPosition({ filePath: chaptersThreeHundredFortyToThreeHundredFortyTwo[2], stage: '第五卷跨目标维修交付核验阶段', focus: '续写第343～345章：三孔灰板出现在另一条路的裂缝里' });
}

const chaptersThreeHundredFortyThreeToThreeHundredFortyFive = ['manuscript/第五卷-地窟王庭/第343章-半月缺口不能只靠看起来一样.md', 'manuscript/第五卷-地窟王庭/第344章-E带走以后F路线先多了一点六公斤.md', 'manuscript/第五卷-地窟王庭/第345章-维修交付也不是王庭组织.md'];
if (chaptersThreeHundredFortyThreeToThreeHundredFortyFive.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第343～345章'));
  if (current && current.status !== 'completed') await appendTask({ ...current, status: 'completed', agentWork: '以孔距、右孔椭圆、半月缺口不对称尖角、交叉白纹、1.58/1.56kg和约5mm厚度，经双人盲透视复核确认石台P-3与F路Q-1同物高证据。时间链为F留→E取并携1.6kg进380m盲区→F带1.55kg出→裂缝停97秒卸载；Q-1后F路压力差18%→6%、滑移7～9cm→1～3cm。跨目标交付高、维修用途中高，组织未知。', links: [...new Set([...current.links, 'research/三孔灰板跨路线连续与功能核验.md', ...chaptersThreeHundredFortyThreeToThreeHundredFortyFive])], updatedAt: now() }, 'writer');
  if (!taskTitles.has('整理三孔灰板跨路线连续与功能核验')) {
    const timestamp = now();
    await appendTask({ id: uid('task'), title: '整理三孔灰板跨路线连续与功能核验', description: '以独立形态、重量、时间与功能证据核验P-3/Q-1同物及跨路线维修交付，保存盲区和反向对照缺口。', level: 'session', status: 'completed', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'high', whyNow: '同型号灰板和同期自然闭合都可能制造假连续，必须分离物件身份、运输链和功能用途。', known: ['F留板E取板', 'F路后出现相似三孔板', '中间有380m盲区', '安装后路线受力改善'], missingDecisions: [], aiPreAnalysis: '双人盲测孔距/缺口/白纹，核对载荷时间线与前后受力，分别给证据等级。', authorDecision: '同物与交付成立也不补写盲区直接交接，不升级为市场或王庭物流。', agentWork: '已生成research/三孔灰板跨路线连续与功能核验.md，包含P-3/Q-1同物、路线连续、功能候选与阶段边界。', completionCriteria: ['至少三项独立同物特征', '运输链明确标出盲区', '功能改善保留替代解释'], links: ['research/三孔灰板跨路线连续与功能核验.md', chaptersThreeHundredFortyThreeToThreeHundredFortyFive[2]], dependencies: [], createdAt: timestamp, updatedAt: timestamp }, 'agent');
  }
  if (!taskTitles.has('续写第346～348章：人类终端把三次敲击翻译成谢谢')) {
    await appendTask({ id: uid('task'), title: '续写第346～348章：人类终端把三次敲击翻译成谢谢', description: '撤销F路线短短长压力的自动中文翻译，对照结构释放、通过节奏、节点确认与有限信号，建立未知节奏的语义升级门槛。', level: 'chapter', status: 'now', kind: 'review', assignee: 'editor', source: 'navigator', priority: 'critical', whyNow: '协议四人类词典把未知F签名三段压力直接显示为“确认，完成，谢谢”，无置信度和替代解释；复制进正文会让模型输出反向成为证据。', known: ['短短长发生在Q-1安装后第9次F通过', '原始事件无文字字段', 'F身份与语言能力未知', '结构和节点均可产生压力节奏'], missingDecisions: ['什么重复、情境对照和可逆回应足以把节奏从物理事件升级为有限语义？'], aiPreAnalysis: '第346章撤销翻译并审计词典来源；第347章比较四类候选；第348章建立语义门槛和最小回应边界。', authorDecision: '默认只显示原始节奏与候选；一次映射不训练词典，不发送带人类情绪或身份的回应。', agentWork: '', completionCriteria: ['错误中文不再作为默认事实显示', '至少四类候选分别可证伪', '有限语义升级和回应有明确边界'], links: [chaptersThreeHundredFortyThreeToThreeHundredFortyFive[2], 'research/三孔灰板跨路线连续与功能核验.md', 'planning/第五卷章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() }, 'navigator');
  }
  const facts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '跨路线物件连续证据边界', statement: '同物需独立形态/磨损与重量支持，运输链需区分可见载荷和盲区，功能改善需保留自然变化与自身调整；一例交付不外推全部取放或地下物流。', status: 'author-confirmed', evidence: [{ filePath: chaptersThreeHundredFortyThreeToThreeHundredFortyFive[0], quote: '半月缺口不能只靠看起来一样。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: 'P-3/Q-1跨路线灰板链', statement: 'F留P-3，E取并带约1.6kg进盲区；F带约1.55kg出并在侧裂缝停97秒卸载，Q-1出现。缺口/白纹/孔距/重量支持同物高证据，盲区机制未知。', status: 'text-explicit', evidence: [{ filePath: chaptersThreeHundredFortyThreeToThreeHundredFortyFive[1], quote: 'P-3离开石台后的时间线有五段。' }], updatedAt: now() },
    { id: uid('fact'), category: 'knowledge', subject: '中层路线与取放0.3结案', statement: '中层边缘存在跨目标材料选择、异步取放与维修交付；P-3/Q-1交付高、维修用途中高。共享维修/延迟互惠为候选，市场、领地、阵营与王庭未知。', status: 'author-confirmed', evidence: [{ filePath: chaptersThreeHundredFortyThreeToThreeHundredFortyFive[2], quote: '阶段结案写入0.3关系图。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: 'F路线短短长误译事件', statement: 'Q-1安装后第9次F通过产生短短长压力；人类协议四词典自动翻为“确认，完成，谢谢”，已撤下中文，只保留原始事件与结构/节奏/节点/有限信号候选。', status: 'text-explicit', evidence: [{ filePath: chaptersThreeHundredFortyThreeToThreeHundredFortyFive[2], quote: '原始压力里没有“谢谢”两个字。' }], updatedAt: now() }
  ];
  for (const fact of facts) await appendFact(fact);
  await setPosition({ filePath: chaptersThreeHundredFortyThreeToThreeHundredFortyFive[2], stage: '第五卷接触语言与误译阶段', focus: '续写第346～348章：人类终端把三次敲击翻译成谢谢' });
}

const chaptersThreeHundredFortySixToThreeHundredFortyEight = ['manuscript/第五卷-地窟王庭/第346章-谢谢来自人类训练集.md', 'manuscript/第五卷-地窟王庭/第347章-短短长先跟着F的身体走.md', 'manuscript/第五卷-地窟王庭/第348章-有限语义先要有一个反例.md'];
if (chaptersThreeHundredFortySixToThreeHundredFortyEight.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第346～348章'));
  if (current && current.status !== 'completed') await appendTask({ ...current, status: 'completed', agentWork: '审计12,400条词典样本：短短长=谢谢来自人类协议四界面文案，模拟样本372条共享波形模板、其余亦由人类编写，无F外部验证。47条未知中文映射降回原始事件。Q-1前12次F中9次、后8次全有短短长，归一位置与前中后压力区对齐且间隔随速度、幅度随重量变化，物理通过解释高、有限信号不足。建立来源/情境/可逆/中性回应/范围/负例六门。', links: [...new Set([...current.links, 'research/F路线短短长误译与有限语义门槛.md', ...chaptersThreeHundredFortySixToThreeHundredFortyEight])], updatedAt: now() }, 'editor');
  if (!taskTitles.has('整理F路线短短长误译与有限语义门槛')) {
    const timestamp = now();
    await appendTask({ id: uid('task'), title: '整理F路线短短长误译与有限语义门槛', description: '追溯协议词典训练来源，对照F身体压力、结构释放和节点回声，建立有限语义六门与两状态试验边界。', level: 'session', status: 'completed', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'high', whyNow: '自动中文若进入正文和事实库，会让人类训练文案反向成为地下语言证据。', known: ['词典来自人类协议四和模拟器', 'F通过多次自然产生短短长', 'F事件无协议四发送端', '旧中文曾被3项记录引用'], missingDecisions: [], aiPreAnalysis: '按波形/脚本来源去重，回查历史影响，比较四类候选并定义语义升级与负例门槛。', authorDecision: '原始模式优先，便捷释义默认关闭；一次映射不训练词典，不发送情绪文本。', agentWork: '已生成research/F路线短短长误译与有限语义门槛.md，包含误译来源、候选排序、六门和最多6次两状态门片试验。', completionCriteria: ['模拟复用不算独立来源', '物理解释有历史对照', '语义门槛能被反例降级'], links: ['research/F路线短短长误译与有限语义门槛.md', chaptersThreeHundredFortySixToThreeHundredFortyEight[2]], dependencies: [], createdAt: timestamp, updatedAt: timestamp }, 'agent');
  }
  if (!taskTitles.has('续写第349～351章：同一节奏在门开和门关时必须不同')) {
    await appendTask({ id: uid('task'), title: '续写第349～351章：同一节奏在门开和门关时必须不同', description: '执行F旧路两状态门片最多六次自然到达对照，比较开放/抬高下节奏、路线选择和负例，决定是否允许一次中性回应。', level: 'chapter', status: 'now', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'critical', whyNow: '短短长已被身体通过高证据解释；只有在可逆情境中出现独立稳定差异，才值得升级到交互候选。', known: ['门片不承载主路且可绕行', '开放/抬高各3次顺序预封存', '未到达也占用计划', '前三次只观察'], missingDecisions: ['F在两状态下是否改变绕行、停留或独立节奏，证据是否足以申请一次中性设备状态回应？'], aiPreAnalysis: '第349章执行前三次纯观察；第350章完成六次并分析负例；第351章按六门决定回应或停止。', authorDecision: '不诱导F到达，不重抽缺失样本；六次不训练词典，只决定是否继续，任何回应均不带姓名、情绪或立场。', agentWork: '', completionCriteria: ['开放/关闭各有预登记记录', '速度/重量与独立节奏分离', '回应决策包含不回应路径'], links: [chaptersThreeHundredFortySixToThreeHundredFortyEight[2], 'research/F路线短短长误译与有限语义门槛.md', 'planning/第五卷章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() }, 'navigator');
  }
  const facts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '未知压力有限语义六门', statement: '语义升级需来源可分、两情境对照、可逆复现、中性限次回应、范围标签和完整负例；便捷中文不能覆盖原始模式，模拟复用不算独立语言来源。', status: 'author-confirmed', evidence: [{ filePath: chaptersThreeHundredFortySixToThreeHundredFortyEight[2], quote: '有限语义门槛不是词语数量。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '短短长词典误译审计', statement: '人类协议四“礼貌结束”被界面写成谢谢，模拟器复用同波形造成来源虚增；47条未知中文映射降回原始事件，3项引用保留影响并重审。', status: 'text-explicit', evidence: [{ filePath: chaptersThreeHundredFortySixToThreeHundredFortyEight[0], quote: '谢谢来自人类训练集' }], updatedAt: now() },
    { id: uid('fact'), category: 'knowledge', subject: 'F路线短短长当前解释', statement: 'Q-1前12次F中9次、后8次全有短短长，归一位置对应F前中后压力区且间隔随速度变化；当前为F型通过压力模式，物理解释高，语义未建立。', status: 'author-confirmed', evidence: [{ filePath: chaptersThreeHundredFortySixToThreeHundredFortyEight[1], quote: '短短长先跟着F的身体走。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: 'F旧路两状态门片试验', statement: '独立可绕行门片开放/抬高各3次、顺序事前封存，未到达也占用；最多6次自然F到达，前3次只观察，稳定差异后才申请一次中性回应。', status: 'text-explicit', evidence: [{ filePath: chaptersThreeHundredFortySixToThreeHundredFortyEight[2], quote: '在F旧路侧启用一块独立、可绕行的测试门片。' }], updatedAt: now() }
  ];
  for (const fact of facts) await appendFact(fact);
  await setPosition({ filePath: chaptersThreeHundredFortySixToThreeHundredFortyEight[2], stage: '第五卷两状态有限语义试验阶段', focus: '续写第349～351章：同一节奏在门开和门关时必须不同' });
}

const chaptersThreeHundredFortyNineToThreeHundredFiftyOne = ['manuscript/第五卷-地窟王庭/第349章-第三轮没有F也不能重抽.md', 'manuscript/第五卷-地窟王庭/第350章-开放门片前也出现了长短.md', 'manuscript/第五卷-地窟王庭/第351章-没有回应也是一次完成.md'];
if (chaptersThreeHundredFortyNineToThreeHundredFiftyOne.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第349～351章'));
  if (current && current.status !== 'completed') await appendTask({ ...current, status: 'completed', agentWork: '执行预封存开/关顺序共6轮：开放无障碍2次直行无额外长短；抬高2次F到达均在前端产生长短并旁路；1次抬高F未到达不重抽；1次开放遭自然1.8cm落石，F同样长短后局部偏移。长短与实际高差接触3/3一致、与人类关闭字段有开放负例，定位为F前端探压—释放—绕行动作。六门语义未通过，结案为物理解释优先，未发送回应。', links: [...new Set([...current.links, 'research/F两状态门片自然到达试验.md', ...chaptersThreeHundredFortyNineToThreeHundredFiftyOne])], updatedAt: now() }, 'researcher');
  if (!taskTitles.has('整理F两状态门片自然到达试验')) {
    const timestamp = now();
    await appendTask({ id: uid('task'), title: '整理F两状态门片自然到达试验', description: '保存六轮预登记状态、F缺失、自然落石混杂、身体/触障模式分离和不回应决策。', level: 'session', status: 'completed', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'high', whyNow: '开放状态自然障碍提供关键负例，若按人类开关字段清洗会制造假语义。', known: ['开放/抬高各3次预封存', '第3轮F未到达', '第5轮开放有自然落石', '主路始终可绕行'], missingDecisions: [], aiPreAnalysis: '按实际前缘而非计划标签重排六轮，保留速度重量和未到达，按六门结案。', authorDecision: '没有必要为证明语言发送回应；物理解释优先是有效完成，不自动追加试验。', agentWork: '已生成research/F两状态门片自然到达试验.md，包含六轮表、长短与高差3/3关系、开放负例和转向R-17的下一步。', completionCriteria: ['缺失不重抽', '自然混杂不删除', '回应决策可审计'], links: ['research/F两状态门片自然到达试验.md', chaptersThreeHundredFortyNineToThreeHundredFiftyOne[2]], dependencies: [], createdAt: timestamp, updatedAt: timestamp }, 'agent');
  }
  if (!taskTitles.has('续写第352～354章：兼容和不兼容不能都回三六三')) {
    await appendTask({ id: uid('task'), title: '续写第352～354章：兼容和不兼容不能都回三六三', description: '以R-17兼容接口和同外形不兼容接口做设备状态对照，比较候选端三六三、错误码、超时和无响应，完成接触语言阶段。', level: 'chapter', status: 'now', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'critical', whyNow: 'F身体压力不适合语义试验；R-17来源可分、请求窗口明确，曾在兼容状态返回三六三与接口宽度，可用双状态检验有限设备语义。', known: ['人员层保持零字段', '两接口外形/重量相同但协议兼容性不同', '每状态只用一次匿名测试凭据', '红线或超时立即关闭'], missingDecisions: ['候选端是否区分兼容/不兼容，响应差异能否稳定复现且不被翻译成人类接受/拒绝？'], aiPreAnalysis: '第352章冻结字段和接口状态；第353章执行双状态及反向复现；第354章按六门建立有限设备语义或结案失败。', authorDecision: '只允许设备状态映射，不使用好坏、接受拒绝、谢谢或人员身份；无响应保持未知。', agentWork: '', completionCriteria: ['来源与状态可独立验证', '至少一次状态往返复现或明确失败', '结论严格限于R-17当前任务设备语义'], links: [chaptersThreeHundredFortyNineToThreeHundredFiftyOne[2], 'research/F两状态门片自然到达试验.md', 'planning/第五卷章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() }, 'navigator');
  }
  const facts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '有限语义试验缺失与混杂处理', statement: '预登记状态未到达不得重抽；自然混杂若提供反例必须保留。试验可因物理解释优先而完成，不为得到语言自动追加轮次或发送污染性回应。', status: 'author-confirmed', evidence: [{ filePath: chaptersThreeHundredFortyNineToThreeHundredFiftyOne[2], quote: '没有回应也是一次完成。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: 'F旧路两状态门片六轮结果', statement: '开放无障碍2次直行无长短；抬高2次到达均长短后绕行；1次抬高F未到达；1次开放因自然1.8cm落石出现长短和局部偏移。未回应。', status: 'text-explicit', evidence: [{ filePath: chaptersThreeHundredFortyNineToThreeHundredFiftyOne[1], quote: '六轮终态。' }], updatedAt: now() },
    { id: uid('fact'), category: 'knowledge', subject: 'F前端长短当前解释', statement: '额外长短与实际高差接触3/3一致，来源在F前端探压/释放/转向区；与人类关闭字段存在开放负例。当前物理解释优先，有限语义未建立。', status: 'author-confirmed', evidence: [{ filePath: chaptersThreeHundredFortyNineToThreeHundredFiftyOne[2], quote: '当前名称：F型前端高差探压—释放序列' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: 'R-17兼容不兼容双状态试验', statement: '下一试验以外形重量相同的兼容/不兼容接口分别发送一次设备层和匿名测试凭据，比对三六三/错误码/超时；人员层零字段，红线或超时关闭。', status: 'text-explicit', evidence: [{ filePath: chaptersThreeHundredFortyNineToThreeHundredFiftyOne[2], quote: '新的对照有两种设备状态。' }], updatedAt: now() }
  ];
  for (const fact of facts) await appendFact(fact);
  await setPosition({ filePath: chaptersThreeHundredFortyNineToThreeHundredFiftyOne[2], stage: '第五卷R-17有限设备语义阶段', focus: '续写第352～354章：兼容和不兼容不能都回三六三' });
}

const chaptersThreeHundredFiftyTwoToThreeHundredFiftyFour = ['manuscript/第五卷-地窟王庭/第352章-接口状态不写进发送字段.md', 'manuscript/第五卷-地窟王庭/第353章-三零三没有被翻译成拒绝.md', 'manuscript/第五卷-地窟王庭/第354章-有限语义只能活在一个接口里.md'];
if (chaptersThreeHundredFiftyTwoToThreeHundredFiftyFour.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第352～354章'));
  if (current && current.status !== 'completed') await appendTask({ ...current, status: 'completed', agentWork: '以外形/重量/身份字段等价的N-1零耦合与K-1六耦合接口各执行一次R-17候选接触：N收到三零三，K收到三六三，首尾参照幅度一致，中间按实际槽位扫描；断开候选输入不自发生成三零三。结合第324章历史兼容三六三形成跨时六—零—六，按六门建立“R-17六槽接口中间段可耦合通道状态映射0.1”，不翻接受/拒绝，不跨型号继承。', links: [...new Set([...current.links, 'research/R17兼容不兼容有限设备语义核验.md', ...chaptersThreeHundredFiftyTwoToThreeHundredFiftyFour])], updatedAt: now() }, 'researcher');
  if (!taskTitles.has('整理R17兼容不兼容有限设备语义核验')) {
    const timestamp = now();
    await appendTask({ id: uid('task'), title: '整理R17兼容不兼容有限设备语义核验', description: '记录接口盲化、发送字段等价、候选输入方向、六—零—六结果和有限语义六门结论。', level: 'session', status: 'completed', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'high', whyNow: '三六三与三零三若直接翻成接受/拒绝，会把物理通道镜像越级成情绪和立场。', known: ['K-1六通道可耦合', 'N-1零通道绝缘', '两轮字段哈希等价', '历史兼容轮为三六三'], missingDecisions: [], aiPreAnalysis: '分离候选输入与本地错误码，按六门限制到R-17六槽接口，保存样本少和跨时环境差异。', authorDecision: '仅建立设备状态映射0.1，默认显示原始节奏，不跨型号或人员身份。', agentWork: '已生成research/R17兼容不兼容有限设备语义核验.md，包含状态控制、三零三/三六三结果、六门和D-5设备接口回查。', completionCriteria: ['接口状态不泄漏', '输入来源与本地回路分离', '映射范围和反例降级明确'], links: ['research/R17兼容不兼容有限设备语义核验.md', chaptersThreeHundredFiftyTwoToThreeHundredFiftyFour[2]], dependencies: [], createdAt: timestamp, updatedAt: timestamp }, 'agent');
  }
  if (!taskTitles.has('续写第355～357章：同一个D-5标签下面有三件设备')) {
    await appendTask({ id: uid('task'), title: '续写第355～357章：同一个D-5标签下面有三件设备', description: '拆分0055-A手套连接片、D-5深层凭据外壳和五号节点旧确认头的制造批次、出现时间、物理使用与人类标签生成链。', level: 'chapter', status: 'now', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'critical', whyNow: '三件六槽设备被后期人类记录共同回查到D-5标签；若按标签合并，会把设备标准连续错误写成人物连续。', known: ['0055-A与零号维修员手套有关', '深层凭据真实被未知单人使用', '五号节点旧确认头无序号', '三者共享六槽接口型'], missingDecisions: ['三件设备是否同批制造、是否发生转移、D-5标签在哪一层被附加，各自使用者能否独立核验？'], aiPreAnalysis: '第355章核对制造批次与首次出现；第356章分别重建物理使用/转移；第357章形成不合并身份的设备链候选。', authorDecision: '接口相同只证明标准共享；设备可以转移、回收、借用或由匿名代理操作，不以D-5标签宣布本人连续。', agentWork: '', completionCriteria: ['三件设备时间线分别成立', '人类标签生成层可追溯', '本人/转移/匿名代理候选不被设备连续覆盖'], links: [chaptersThreeHundredFiftyTwoToThreeHundredFiftyFour[2], 'research/R17兼容不兼容有限设备语义核验.md', 'planning/第五卷章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() }, 'navigator');
  }
  const facts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '有限设备语义范围隔离', statement: '设备状态映射必须限定型号/接口/任务，默认展示原始响应与样本/反例；物理镜像不翻接受/拒绝/情绪，不跨型号继承，也不关联人员身份。', status: 'author-confirmed', evidence: [{ filePath: chaptersThreeHundredFiftyTwoToThreeHundredFiftyFour[2], quote: '有限语义只能活在一个接口里。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: 'R-17兼容不兼容双状态结果', statement: 'N-1零耦合收到三零三，K-1六耦合收到三六三；两轮外形/重量/发送字段等价，首尾参照一致。第324章兼容轮亦三六三，形成跨时六—零—六。', status: 'text-explicit', evidence: [{ filePath: chaptersThreeHundredFiftyTwoToThreeHundredFiftyFour[1], quote: '接口测试终态分开。' }], updatedAt: now() },
    { id: uid('fact'), category: 'knowledge', subject: 'R-17六槽有限语义0.1', statement: '首个候选为“R-17六槽接口中间段可耦合通道状态映射0.1”；中间6/0与实际耦合通道同现，首尾3未知，样本少且可能只是物理槽位镜像。', status: 'author-confirmed', evidence: [{ filePath: chaptersThreeHundredFiftyTwoToThreeHundredFiftyFour[2], quote: '首个有限设备语义候选建立。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: 'D-5六槽接口三设备候选', statement: '同型六槽接口在人类档案中关联0055-A手套连接片、D-5深层凭据外壳和五号节点旧确认头；三者共享接口不证明同一使用者，下一步按设备链核验。', status: 'text-explicit', evidence: [{ filePath: chaptersThreeHundredFiftyTwoToThreeHundredFiftyFour[2], quote: '同一接口型曾出现在三件旧设备上。' }], updatedAt: now() }
  ];
  for (const fact of facts) await appendFact(fact);
  await setPosition({ filePath: chaptersThreeHundredFiftyTwoToThreeHundredFiftyFour[2], stage: '第五卷D-5设备链阶段', focus: '续写第355～357章：同一个D-5标签下面有三件设备' });
}

const chaptersThreeHundredFiftyFiveToThreeHundredFiftySeven = ['manuscript/第五卷-地窟王庭/第355章-同一个接口跨了三十多年.md', 'manuscript/第五卷-地窟王庭/第356章-三件设备没有同一条使用时间线.md', 'manuscript/第五卷-地窟王庭/第357章-D5设备链只有一条人物候选边.md'];
if (chaptersThreeHundredFiftyFiveToThreeHundredFiftySeven.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第355～357章'));
  if (current && current.status !== 'completed') await appendTask({ ...current, status: 'completed', agentWork: '拆分A零号手套连接片/L6-1约57～54年前、B深层凭据外壳/L6-5约22～20年前、C五号节点确认头/L6-6约18～15年前；合金/陶片/焊料/压痕证明不同实物与批次，接口仅为跨年代兼容标准。A有零号维修员/0055-A同人高证据，B仅有未知人形载荷通行，C为节点部件。撤销D-5标签沿接口匹配扩散，三十七份引用追加复核，只保留B事故设备标签→D-5人物候选虚线。', links: [...new Set([...current.links, 'research/D5六槽接口三设备链核验.md', ...chaptersThreeHundredFiftyFiveToThreeHundredFiftySeven])], updatedAt: now() }, 'researcher');
  if (!taskTitles.has('整理D5六槽接口三设备链核验')) {
    const timestamp = now();
    await appendTask({ id: uid('task'), title: '整理D5六槽接口三设备链核验', description: '拆分三件实物、L6接口标准、物理使用事件和人物标签，追溯D-5标签扩散与历史影响。', level: 'session', status: 'completed', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'high', whyNow: '同接口匹配边被UI画成与同设备/同使用者相同实线，导致三件跨年代设备互相提供虚假人物旁证。', known: ['A/B/C共享六槽外形', '三者年代与物理使用不同', '只有B事故标签直接映射D-5', 'A/C关联来自后续检索摘要'], missingDecisions: [], aiPreAnalysis: '用材料批次、时间、使用事件和标签生成链拆图，回查历史引用并保留旧版本。', authorDecision: '标准连续不传递人物身份；错误边撤销不删除设备事实或历史影响。', agentWork: '已生成research/D5六槽接口三设备链核验.md，包含三设备表、标签扩散错误、B人物三候选与磨损后续。', completionCriteria: ['批次与实物独立', '使用链不互相作证', '人物候选仅保留有直接来源的边'], links: ['research/D5六槽接口三设备链核验.md', chaptersThreeHundredFiftyFiveToThreeHundredFiftySeven[2]], dependencies: [], createdAt: timestamp, updatedAt: timestamp }, 'agent');
  }
  if (!taskTitles.has('续写第358～360章：凭据外壳上有两套不同的握持磨损')) {
    await appendTask({ id: uid('task'), title: '续写第358～360章：凭据外壳上有两套不同的握持磨损', description: '非破坏分期B外壳长期右拇指与临时左侧夹持磨损，用匿名手型和两闸压力偏移核验是否支持设备换手。', level: 'chapter', status: 'now', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'critical', whyNow: 'B是唯一保留D-5人物候选边的设备；两组方向不同磨损可能区分同人换手与设备转移，但也可能来自维修夹具。', known: ['B凭据事故后3个月被未知人使用', '一组长期右拇指磨损', '一组临时左侧夹持磨损', '两闸总载荷72～91kg'], missingDecisions: ['两组磨损能否分期、是否对应不同匿名手型，闸门左右压力是否具有足够分辨率？'], aiPreAnalysis: '第358章非破坏表面分层；第359章匿名手型/左右切换模拟与闸门对齐；第360章更新本人/转移/代理三候选或不可判定。', authorDecision: '不切开外壳、不读取姓名、不用江砚身体当默认样本；不可判定也是完成。', agentWork: '', completionCriteria: ['磨损年代与形成方式有边界', '匿名模拟不强制选中某手型', '候选更新不把重量拟合具体人物'], links: [chaptersThreeHundredFiftyFiveToThreeHundredFiftySeven[2], 'research/D5六槽接口三设备链核验.md', 'planning/第五卷章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() }, 'navigator');
  }
  const facts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '设备链关系类型不可传递', statement: '制造标准相同、物件同一、共同使用者和人物标签是不同边；接口标准边不得传递人物身份。导出/摘要必须携关系类型，错误边撤销保留旧图和影响。', status: 'author-confirmed', evidence: [{ filePath: chaptersThreeHundredFiftyFiveToThreeHundredFiftySeven[2], quote: '第一版设备链有四类节点。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: 'L6三设备制造与使用分离', statement: 'A为L6-1约57～54年前且与零号/0055-A同人；B为L6-5约22～20年前且被未知人形载荷通行使用；C为L6-6约18～15年前并在五号节点长期工作。', status: 'text-explicit', evidence: [{ filePath: chaptersThreeHundredFiftyFiveToThreeHundredFiftySeven[1], quote: '三条使用链不能拼成一条。' }], updatedAt: now() },
    { id: uid('fact'), category: 'knowledge', subject: 'D-5设备链0.1人物边', statement: 'A/C的D-5关联来自接口匹配摘要，已撤销；只有B事故设备标签保留D-5人物候选虚线。本人存活使用、设备转移、匿名代理三候选并列。', status: 'author-confirmed', evidence: [{ filePath: chaptersThreeHundredFiftyFiveToThreeHundredFiftySeven[2], quote: '唯一一条D-5人物候选边在B。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: 'B凭据外壳双磨损后续', statement: 'B外壳有长期右拇指磨损与临时左侧夹持磨损；下一步非破坏分期并对齐匿名手型/两闸左右压力，区分同人换手、设备转移或夹具。', status: 'text-explicit', evidence: [{ filePath: chaptersThreeHundredFiftyFiveToThreeHundredFiftySeven[1], quote: 'B外壳上有两组磨损。' }], updatedAt: now() }
  ];
  for (const fact of facts) await appendFact(fact);
  await setPosition({ filePath: chaptersThreeHundredFiftyFiveToThreeHundredFiftySeven[2], stage: '第五卷B凭据换手核验阶段', focus: '续写第358～360章：凭据外壳上有两套不同的握持磨损' });
}

const chaptersThreeHundredFiftyEightToThreeHundredSixty = ['manuscript/第五卷-地窟王庭/第358章-第二套磨损没有皮肤留下的油膜.md', 'manuscript/第五卷-地窟王庭/第359章-六道平行线来自一只夹具.md', 'manuscript/第五卷-地窟王庭/第360章-换过固定方式不等于换过人.md'];
if (chaptersThreeHundredFiftyEightToThreeHundredSixty.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第358～360章'));
  if (current && current.status !== 'completed') await appendTask({ ...current, status: 'completed', agentWork: 'B外壳非破坏分层：W1为事故前12mm弧形、31μm长期右拇指磨损；W2为切过事故硫灰的6条7.4～7.6mm等距、8～12μm陡线，无皮肤圆化。48匿名手型无法复现W2，盲测12夹具仅M-6型六齿软合金扣同时匹配齿距/齐平/陡度/止挡压点。两闸仅支持左侧挂载与位置调整，不能判人。固定方式改变成立，本人/转移/代理均可解释；M-6事故后2个月试用时间待发放链核验。', links: [...new Set([...current.links, 'research/D5凭据外壳双磨损与夹具核验.md', ...chaptersThreeHundredFiftyEightToThreeHundredSixty])], updatedAt: now() }, 'researcher');
  if (!taskTitles.has('整理D5凭据外壳双磨损与夹具核验')) {
    const timestamp = now();
    await appendTask({ id: uid('task'), title: '整理D5凭据外壳双磨损与夹具核验', description: '以非破坏表面分期、匿名手型/夹具盲测和脱敏闸门压力区分人手磨损与挂载方式，更新三候选。', level: 'session', status: 'completed', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'high', whyNow: 'W2若被误写成第二只手，会把固定方式变化越级成设备换人；M-6名称又可能把用途越级成代理身份。', known: ['W1事故前长期形成', 'W2切过硫灰且含深层矿粉', '两闸设备读取偏左', 'M-6几何匹配'], missingDecisions: [], aiPreAnalysis: '做表面时间层、匿名盲对照、左右载荷边界和候选不定量更新，保存同规格仿制风险。', authorDecision: '可判固定方式，不判人员改变；候选上升不写伪概率，套件名称不代替现场角色。', agentWork: '已生成research/D5凭据外壳双磨损与夹具核验.md，包含W1/W2分期、匿名对照、两闸压力和M-6后续。', completionCriteria: ['手与夹具痕迹可分', '闸门分辨率边界明确', '本人/转移/代理仍可被证据降级'], links: ['research/D5凭据外壳双磨损与夹具核验.md', chaptersThreeHundredFiftyEightToThreeHundredSixty[2]], dependencies: [], createdAt: timestamp, updatedAt: timestamp }, 'agent');
  }
  if (!taskTitles.has('续写第361～363章：夹具来自事故以后才启用的代理套件')) {
    await appendTask({ id: uid('task'), title: '续写第361～363章：夹具来自事故以后才启用的代理套件', description: '核验M-6六齿挂载扣的材料批次、事故后试用、发放回收与B凭据签发链，完成D-5设备阶段结案。', level: 'chapter', status: 'now', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'critical', whyNow: 'M-6几何与W2高匹配，公开目录在事故后2个月启用、早于事故后3个月通行；但原型、仿制、未登记发放和“代理”名称都可能误导。', known: ['W2为事故后六齿挂载高证据', 'M-6齿距/软合金/12度匹配', 'B在事故后3个月通行', '具体使用者未知'], missingDecisions: ['W2材料是否匹配正式M-6批次，哪些单位领取且是否有未回收件，B凭据签发与套件领用是否同链？'], aiPreAnalysis: '第361章材料批次与仿制排除；第362章发放/回收/签发时间；第363章更新三候选并设备阶段结案。', authorDecision: '产品用途和领取单位不确认实际使用者；只在材料、时间与记录三链一致时连接B与M-6。', agentWork: '', completionCriteria: ['正式批次与同规格仿制可区分', '发放回收缺口可见', '设备链结论不替代人员身份'], links: [chaptersThreeHundredFiftyEightToThreeHundredSixty[2], 'research/D5凭据外壳双磨损与夹具核验.md', 'planning/第五卷章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() }, 'navigator');
  }
  const facts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '设备磨损方式与人员数量分离', statement: '表面磨损需区分手、夹具、清洁和封存；固定方式变化不等于人员变化。匿名对照可确认工具类型，不能用总重量/左右偏移拟合具体身份。', status: 'author-confirmed', evidence: [{ filePath: chaptersThreeHundredFiftyEightToThreeHundredSixty[2], quote: '换过固定方式不等于换过人。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: 'B凭据外壳W1-W2分期', statement: 'W1为事故前长期右拇指磨损；W2切过事故硫灰、含深层矿粉，为事故后六齿软合金挂载。M-6盲测匹配W2，闸门记录设备位于载荷左侧。', status: 'text-explicit', evidence: [{ filePath: chaptersThreeHundredFiftyEightToThreeHundredSixty[1], quote: 'W2来自六齿应急挂载扣，高证据。' }], updatedAt: now() },
    { id: uid('fact'), category: 'knowledge', subject: 'D-5三候选磨损更新', statement: '事故后挂载降低原握法依赖，使设备转移/匿名代理候选小幅上升；本人可因伤或任务改装，故不下降。现有磨损不能区分使用者数量，三候选仍并列。', status: 'author-confirmed', evidence: [{ filePath: chaptersThreeHundredFiftyEightToThreeHundredSixty[2], quote: '三候选仍并列。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: 'M-6代理套件发放链后续', statement: 'W2疑似M-6候选接触应急挂载扣；公开目录显示事故后2个月受限试用，早于3个月深层通行。需核材料批次、发放/回收和同规格仿制，名称不确认代理。', status: 'text-explicit', evidence: [{ filePath: chaptersThreeHundredFiftyEightToThreeHundredSixty[2], quote: '真正的新线索是六齿挂载扣。' }], updatedAt: now() }
  ];
  for (const fact of facts) await appendFact(fact);
  await setPosition({ filePath: chaptersThreeHundredFiftyEightToThreeHundredSixty[2], stage: '第五卷M-6代理套件核验阶段', focus: '续写第361～363章：夹具来自事故以后才启用的代理套件' });
}

const chaptersThreeHundredSixtyOneToThreeHundredSixtyThree = ['manuscript/第五卷-地窟王庭/第361章-M6第一批只有一只没有回来.md', 'manuscript/第五卷-地窟王庭/第362章-领用人字段写的是匿名执行位.md', 'manuscript/第五卷-地窟王庭/第363章-代理流程成立不等于另有代理人.md'];
if (chaptersThreeHundredSixtyOneToThreeHundredSixtyThree.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第361～363章'));
  if (current && current.status !== 'completed') await appendTask({ ...current, status: 'completed', agentWork: 'W2锡铜/蓝钼/齿距/止挡匹配事故后47日检验的M6-01正式批次高证据；64只中M6-01-23为唯一“深层任务连续”未返主候选。事故后61日08:10，23号发给CAND-RELAY-3匿名执行位；08:41 B在同任务槽重配置左侧12度挂载；第89日深层值守生成授权，第90日前后未知载荷两闸使用。代理式机构流程高，执行角色为匿名中继；执行者是D-5本人还是另一人未知。', links: [...new Set([...current.links, 'research/M6代理套件发放与D5凭据重配置核验.md', ...chaptersThreeHundredSixtyOneToThreeHundredSixtyThree])], updatedAt: now() }, 'researcher');
  if (!taskTitles.has('整理M6代理套件发放与D5凭据重配置核验')) {
    const timestamp = now();
    await appendTask({ id: uid('task'), title: '整理M6代理套件发放与D5凭据重配置核验', description: '连接W2正式批次、23号发放、B同槽重配置、跨部门授权和两闸通行，分离代理角色与执行者身份。', level: 'session', status: 'completed', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'high', whyNow: 'M-6名称和匿名执行位容易被自动翻译成另一个代理人，掩盖D-5本人也可占用角色槽。', known: ['W2正式M6-01高匹配', '23号未返主候选', 'B与23号同任务槽', '闸门身份未知'], missingDecisions: [], aiPreAnalysis: '核材料/仿制、64只终态、任务槽签名、哈希转换回执和角色/身份两行状态。', authorDecision: '确认代理流程不确认另一个代理人；内侧继续之后不在当前包范围。', agentWork: '已生成research/M6代理套件发放与D5凭据重配置核验.md，包含批次、发放重配置、角色身份结论和四部门后续边界。', completionCriteria: ['正式批次和23号等级分开', '设备任务连续不冒充人员连续', '代理角色和代理人身份分别结案'], links: ['research/M6代理套件发放与D5凭据重配置核验.md', chaptersThreeHundredSixtyOneToThreeHundredSixtyThree[2]], dependencies: [], createdAt: timestamp, updatedAt: timestamp }, 'agent');
  }
  if (!taskTitles.has('续写第364～366章：同一份证据让四个部门提出四种任务')) {
    await appendTask({ id: uid('task'), title: '续写第364～366章：同一份证据让四个部门提出四种任务', description: '拆分研究、城防、证据保全和资源开放四项申请的目标、权限、风险与不可逆动作，处理优先级冲突并确认单一主要任务。', level: 'chapter', status: 'now', kind: 'review', assignee: 'editor', source: 'navigator', priority: 'critical', whyNow: 'D-5设备链同一报告同时触发追内侧回执、复制匿名巡检、冻结旧工具链和开放兼容标准；合并执行会互相污染或越权。', known: ['Researcher需受限后续读取', '城防想复制M-6流程', '证据保全要求冻结', '资源部门要批量开放L6/M-6'], missingDecisions: ['哪一项是当前队伍主要目标，其他申请如何等待、影子评估或转交，谁承担不可逆风险？'], aiPreAnalysis: '第364章拆四任务；第365章评估互斥与排序；第366章确认一次只做一个主要目标并保留其他任务。', authorDecision: '共享D-5标题不合并授权；主要目标需与第五卷当前阶段一致，冻结/开放等不可逆动作必须独立批准。', agentWork: '', completionCriteria: ['四项申请各有目标和退出条件', '冲突不以部门票数平均', '确认单一主要任务和其他任务终态'], links: [chaptersThreeHundredSixtyOneToThreeHundredSixtyThree[2], 'research/M6代理套件发放与D5凭据重配置核验.md', 'planning/第五卷章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() }, 'navigator');
  }
  const facts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '匿名执行角色与执行者身份分离', statement: '设备/任务槽/签发链可确认匿名代理流程和执行角色，不能确认执行者是另一人；流程证据与身份生物证据分开显示、导出和计级。', status: 'author-confirmed', evidence: [{ filePath: chaptersThreeHundredSixtyOneToThreeHundredSixtyThree[2], quote: '代理流程成立。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: 'M6-01-23与B重配置通行链', statement: 'M6-01事故后47日检验、61日发放；23号08:10发给CAND-RELAY-3，08:41同槽重配置B；89日深层授权，90日前后未知载荷两闸通行，状态内侧继续。', status: 'text-explicit', evidence: [{ filePath: chaptersThreeHundredSixtyOneToThreeHundredSixtyThree[2], quote: 'D-5设备阶段结案有五条实线。' }], updatedAt: now() },
    { id: uid('fact'), category: 'knowledge', subject: 'D-5设备链0.3结案', statement: 'B经官方候选中继流程代理式重配置高证据；身份问题仍为D-5本人或另一人未知，角色为匿名中继执行位高。设备转移候选中等，代理流程高，不同代理人不足。', status: 'author-confirmed', evidence: [{ filePath: chaptersThreeHundredSixtyOneToThreeHundredSixtyThree[2], quote: '谁使用B：D-5本人或另一人，未知。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: 'D-5报告四部门任务冲突', statement: '同一报告触发研究追内侧回执、城防复制匿名巡检、证据保全冻结工具链、资源开放兼容标准四项申请；目标权限和不可逆风险不同，不能合并下井。', status: 'text-explicit', evidence: [{ filePath: chaptersThreeHundredSixtyOneToThreeHundredSixtyThree[2], quote: '同一份结论已经让四个部门提出四种任务。' }], updatedAt: now() }
  ];
  for (const fact of facts) await appendFact(fact);
  await setPosition({ filePath: chaptersThreeHundredSixtyOneToThreeHundredSixtyThree[2], stage: '第五卷人类任务冲突阶段', focus: '续写第364～366章：同一份证据让四个部门提出四种任务' });
}

const chaptersThreeHundredSixtyFourToThreeHundredSixtySix = ['manuscript/第五卷-地窟王庭/第364章-四张申请不能合成一张总任务.md', 'manuscript/第五卷-地窟王庭/第365章-部门票数不能批准不可逆动作.md', 'manuscript/第五卷-地窟王庭/第366章-主要目标只有一个影子任务有三个.md'];
if (chaptersThreeHundredSixtyFourToThreeHundredSixtySix.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第364～366章'));
  if (current && current.status !== 'completed') await appendTask({ ...current, status: 'completed', agentWork: '将同一D-5报告拆为Researcher内侧回执只读、城防现代匿名巡检、证据保全冻结、资源开放标准四项申请；分别记录目标/权限/退出/不可逆与冲突。按依赖、可逆、第五卷目标和现成权限选择“只读CAND-RELAY-3第一条内侧设备回执”为唯一主任务，快照仅为门禁；城防只做离线影子、长期冻结等待、资源只做本地字段差异。决定写入decisions/D5设备报告四部门任务选择.md，异议保留。', links: [...new Set([...current.links, 'decisions/D5设备报告四部门任务选择.md', ...chaptersThreeHundredSixtyFourToThreeHundredSixtySix])], updatedAt: now() }, 'editor');
  if (!taskTitles.has('续写第367～369章：内侧第一条回执不是一个人的名字')) {
    await appendTask({ id: uid('task'), title: '续写第367～369章：内侧第一条回执不是一个人的名字', description: '在查询前后校验门禁下，只读CAND-RELAY-3内侧继续后的第一条设备回执，区分设备状态、任务槽转换与人员事件并结案。', level: 'chapter', status: 'now', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'critical', whyNow: '该回执是其余三项现代行动的上游依赖，且当前已有一次脱敏只读渠道；范围最小、可停、不改原设备。', known: ['主任务只读一条', '无回执/来源失效/权限扩张均停止', '坐标/闸号/人员/接触对象黑名单', '查询前后校验快照'], missingDecisions: ['第一回执属于设备、任务槽还是人员事件，是否改变三项影子申请的风险和优先级？'], aiPreAnalysis: '第367章执行快照与单条读取；第368章核验事件类型和字段边界；第369章结案并分别更新影子任务。', authorDecision: '不为寻找姓名读取第二条；主任务选择不扩大受限权限。', agentWork: '', completionCriteria: ['只读取一条或按停止条件结案', '设备/任务/人员类型不混合', '三个影子任务独立更新且不继承主任务完成'], links: [chaptersThreeHundredSixtyFourToThreeHundredSixtySix[2], 'decisions/D5设备报告四部门任务选择.md'], dependencies: [], createdAt: now(), updatedAt: now() }, 'navigator');
  }
  if (!taskTitles.has('城防影子：现代匿名巡检责任模拟')) {
    await appendTask({ id: uid('task'), title: '城防影子：现代匿名巡检责任模拟', description: '仅在离线环境演算设备身份、人员本地追责、医疗救援和撤退闭环，不连接真实巡检设备。', level: 'session', status: 'next', kind: 'review', assignee: 'architect', source: 'navigator', priority: 'high', whyNow: '匿名巡检可能减少人员暴露，但真实部署会产生现代痕迹并改变责任模式。', known: ['不发送不部署', '医疗身份本地可见', '城防要求明确评审时间'], missingDecisions: ['第一内侧回执是否改变现代流程风险？'], aiPreAnalysis: '先做流程与失败路径影子评估，不计入主任务。', authorDecision: '等待主任务结果后独立评审；不得以影子状态获得部署权限。', agentWork: '', completionCriteria: ['离线责任链完整', '无真实数据/设备副作用'], links: ['decisions/D5设备报告四部门任务选择.md'], dependencies: ['续写第367～369章：内侧第一条回执不是一个人的名字'], createdAt: now(), updatedAt: now() }, 'navigator');
  }
  if (!taskTitles.has('证据保全：B查询后长期冻结复核')) {
    await appendTask({ id: uid('task'), title: '证据保全：B查询后长期冻结复核', description: '查询前后只做B原件/工具/权限校验；长期冻结范围等第一回执后独立决定，不冻结运行L6节点。', level: 'session', status: 'next', kind: 'review', assignee: 'canon-keeper', source: 'navigator', priority: 'high', whyNow: '需防现代测试污染旧证据，但过宽冻结会阻断维修和新证据。', known: ['当前校验快照是门禁非主目标', '运行节点不冻结'], missingDecisions: ['回执是否显示原件或工具链状态变化？'], aiPreAnalysis: '比较查询前后四项哈希和源版本，再提长期范围。', authorDecision: '不以保全名义冻结全部兼容标准。', agentWork: '', completionCriteria: ['漂移可识别', '长期冻结不自动执行'], links: ['decisions/D5设备报告四部门任务选择.md'], dependencies: ['续写第367～369章：内侧第一条回执不是一个人的名字'], createdAt: now(), updatedAt: now() }, 'navigator');
  }
  if (!taskTitles.has('资源开放：L6-M6公开字段差异清单')) {
    await appendTask({ id: uid('task'), title: '资源开放：L6-M6公开字段差异清单', description: '本地比较可公开维修字段与受限取证/凭据字段，不发布、不通知制造商。', level: 'session', status: 'next', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'normal', whyNow: '开放兼容标准可修旧节点，但公开不可收回并会污染未来来源辨识。', known: ['维修人员需参与复核', '蓝钼等历史取证特征不进入公开规范'], missingDecisions: ['第一回执是否改变兼容标准必要性和敏感字段？'], aiPreAnalysis: '生成本地字段差异，保持零外部效果。', authorDecision: '暂缓发布，仅做依赖分析。', agentWork: '', completionCriteria: ['公开/受限字段分开', '无外部发布'], links: ['decisions/D5设备报告四部门任务选择.md'], dependencies: ['续写第367～369章：内侧第一条回执不是一个人的名字'], createdAt: now(), updatedAt: now() }, 'navigator');
  }
  const facts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '同关键词跨部门任务不可自动合并', statement: '共享D-5标题不合并目标、权限、退出、不可逆动作和完成率；影子任务不得发送/部署/冻结/发布，也不继承主任务权限或完成状态。', status: 'author-confirmed', evidence: [{ filePath: chaptersThreeHundredSixtyFourToThreeHundredSixtySix[0], quote: '四张申请不能合成一张总任务。' }], updatedAt: now() },
    { id: uid('fact'), category: 'decision', subject: '四部门任务当前主目标选择', statement: '按依赖、可逆、卷目标和现成权限，当前唯一主目标为只读CAND-RELAY-3内侧第一条设备回执；得到/不存在/权限阻断任一即停，不追加姓名。', status: 'author-confirmed', evidence: [{ filePath: 'decisions/D5设备报告四部门任务选择.md', quote: '当前主任务' }], updatedAt: now() },
    { id: uid('fact'), category: 'decision', subject: '四部门其他申请终态', statement: '城防仅离线影子模拟；证据冻结缩为当前查询校验门禁、长期等待；资源开放暂缓，仅本地字段差异。三项不产生外部效果且独立重开。', status: 'author-confirmed', evidence: [{ filePath: chaptersThreeHundredSixtyFourToThreeHundredSixtySix[2], quote: '一主三影。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: 'CAND-RELAY-3第一内侧回执', statement: '下一主任务只读内侧继续后的第一条设备回执，范围为设备状态/任务槽转换/时间/来源；坐标、闸号、密钥、人员和接触对象禁止，查询前后做漂移校验。', status: 'text-explicit', evidence: [{ filePath: chaptersThreeHundredSixtyFourToThreeHundredSixtySix[2], quote: '只读一条。' }], updatedAt: now() }
  ];
  for (const fact of facts) await appendFact(fact);
  await setPosition({ filePath: chaptersThreeHundredSixtyFourToThreeHundredSixtySix[2], stage: '第五卷内侧单回执读取阶段', focus: '续写第367～369章：内侧第一条回执不是一个人的名字' });
}

const chaptersThreeHundredSixtySevenToThreeHundredSixtyNine = ['manuscript/第五卷-地窟王庭/第367章-第一条回执只写设备重绑定.md', 'manuscript/第五卷-地窟王庭/第368章-设备继续不等于携带者继续.md', 'manuscript/第五卷-地窟王庭/第369章-主任务完成没有让城防自动上线.md'];
if (chaptersThreeHundredSixtySevenToThreeHundredSixtyNine.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第367～369章'));
  if (current && current.status !== 'completed') await appendTask({ ...current, status: 'completed', agentWork: '在查询前后四项哈希门禁下以服务端limit=1读取CAND-RELAY-3第一条内侧设备事件：equipment.rebind，第二闸后43分钟M6-01-23解除，B停止主动通行验证并重封装为内侧固定中继；模式无人员/载荷字段。脚本、源版本、黑名单和脱敏包无漂移，未请求第二游标/人员事件。设备任务继续不等于携带者继续，人员离开/留置/继续/接替均未知。', links: [...new Set([...current.links, 'research/CAND-RELAY-3内侧第一设备回执核验.md', 'decisions/D5设备报告四部门任务选择.md', ...chaptersThreeHundredSixtySevenToThreeHundredSixtyNine])], updatedAt: now() }, 'researcher');
  const preservation = state.tasks.find((item) => item.title === '证据保全：B查询后长期冻结复核');
  if (preservation && preservation.status !== 'completed') await appendTask({ ...preservation, status: 'completed', agentWork: '查询前后脱敏包/脚本/受限源/黑名单哈希一致，无漂移；本次门禁完成，不扩大冻结运行L6节点。长期冻结保留为可由源漂移或现代污染重开的未采纳建议。', known: [...new Set([...preservation.known, '第一回执读取前后无源或工具漂移', 'B重绑定为内侧固定中继'])], updatedAt: now() }, 'agent');
  const defense = state.tasks.find((item) => item.title === '城防影子：现代匿名巡检责任模拟');
  if (defense && !defense.known.includes('B交接固定中继后人员字段不在设备事件中')) await appendTask({ ...defense, status: 'next', whyNow: '第一回执确认匿名设备可从随身凭据交接到固定中继；现代复制必须先解决交接后的人员责任、医疗本地身份和撤退关闭。', known: [...new Set([...defense.known, 'B交接固定中继后人员字段不在设备事件中', '主任务完成不授予真实部署'])], missingDecisions: ['设备交接后责任主体如何连续？', '医疗本地身份如何不断链？', '撤退员如何关闭匿名任务槽？'], updatedAt: now() }, 'navigator');
  const resource = state.tasks.find((item) => item.title === '资源开放：L6-M6公开字段差异清单');
  if (resource && !resource.known.includes('机械六槽/安全上限可公开候选')) await appendTask({ ...resource, status: 'next', known: [...new Set([...resource.known, '机械六槽/安全上限可公开候选', '任务槽哈希转换、匿名凭据、固定中继重封装保持受限'])], missingDecisions: ['维修人员尚未复核机械公开字段', '现代开放是否会污染历史来源辨识？'], updatedAt: now() }, 'navigator');
  if (!taskTitles.has('续写第370～372章：研究完成没有让城防任务自动上线')) {
    await appendTask({ id: uid('task'), title: '续写第370～372章：研究完成没有让城防任务自动上线', description: '离线审查现代匿名巡检从随身设备到固定中继的责任、医疗和撤退三条连续性，决定城防影子能否进入后续原型阶段。', level: 'chapter', status: 'now', kind: 'review', assignee: 'editor', source: 'navigator', priority: 'critical', whyNow: '主任务完成只解除城防评审依赖，不授予部署；第366章承诺本轮后给明确评审时间。', known: ['设备交接后人员不在设备事件模式', '城防影子仍next且无真实连接', '医疗身份必须本地持续可见', '撤退员必须能关闭匿名任务槽'], missingDecisions: ['责任/医疗/撤退能否在设备重绑定前后分别连续，失败时原型应阻塞、回滚还是降级？'], aiPreAnalysis: '第370章建责任链；第371章测医疗本地身份；第372章测撤退关闭并决定影子后续。', authorDecision: '只审离线影子，不部署；研究结果不自动转成城防批准。', agentWork: '', completionCriteria: ['三条连续性各有失败注入', '影子结论不连接真实设备', '明确进入原型或保持阻塞的终态'], links: [chaptersThreeHundredSixtySevenToThreeHundredSixtyNine[2], 'decisions/D5设备报告四部门任务选择.md'], dependencies: [], createdAt: now(), updatedAt: now() }, 'navigator');
  }
  const facts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '设备事件无人员字段的解释边界', statement: '事件模式本不含人员字段不同于字段被脱敏为空；设备重绑定不能生成未知人员主体，也不能将设备任务继续传播为携带者继续。', status: 'author-confirmed', evidence: [{ filePath: chaptersThreeHundredSixtySevenToThreeHundredSixtyNine[1], quote: '设备继续不等于携带者继续。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: 'CAND-RELAY-3第一内侧回执', statement: '第二闸后43分钟发生equipment.rebind：M6-01-23从B解除，B停止主动通行验证并重封装为内侧固定中继；任务槽继续，人员/载荷未采集。', status: 'text-explicit', evidence: [{ filePath: chaptersThreeHundredSixtySevenToThreeHundredSixtyNine[0], quote: '第一条回执到达。' }], updatedAt: now() },
    { id: uid('fact'), category: 'decision', subject: '第一回执后四任务独立终态', statement: 'Researcher主任务和证据查询门禁完成；城防影子/资源差异仍next，分别更新责任断点与字段分层；主任务完成不广播解除依赖或自动上线。', status: 'author-confirmed', evidence: [{ filePath: chaptersThreeHundredSixtySevenToThreeHundredSixtyNine[2], quote: '任务事件流写入四条独立更新。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '现代匿名巡检三连续性审查', statement: '下一审查仅在离线影子验证设备交接前后责任、医疗本地身份和撤退关闭三条连续；不连接真实巡检设备，研究完成不授予部署。', status: 'text-explicit', evidence: [{ filePath: chaptersThreeHundredSixtySevenToThreeHundredSixtyNine[2], quote: '是审查城防影子模拟能否保持责任、医疗和撤退三条连续。' }], updatedAt: now() }
  ];
  for (const fact of facts) await appendFact(fact);
  await setPosition({ filePath: chaptersThreeHundredSixtySevenToThreeHundredSixtyNine[2], stage: '第五卷城防匿名巡检影子审查阶段', focus: '续写第370～372章：研究完成没有让城防任务自动上线' });
}

const chaptersThreeHundredSeventyToThreeHundredSeventyTwo = ['manuscript/第五卷-地窟王庭/第370章-设备交接以后责任不能交给一块墙.md', 'manuscript/第五卷-地窟王庭/第371章-医疗身份不能跟着设备一起归档.md', 'manuscript/第五卷-地窟王庭/第372章-撤退令要关掉已经交出去的设备.md'];
if (chaptersThreeHundredSeventyToThreeHundredSeventyTwo.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第370～372章'));
  if (current && current.status !== 'completed') await appendTask({ ...current, status: 'completed', agentWork: '城防离线影子默认三次失败：M-A交接R-B后责任落到设备；黄伤随M-A归档；红线只关M-A不关R-B。修复为外发任务槽/本地责任账原子交班、person_ref+独立医疗episode、独立撤退岗位持任务级单调revocation_token。交接失败/换班断线/医疗断线/隐私越权/R-B断线/伪撤销/撤销后重开均通过；人员字段外发零。只获得隔离实验室原型资格，无真实部署。', links: [...new Set([...current.links, 'research/现代匿名巡检三连续性影子审查.md', 'decisions/D5设备报告四部门任务选择.md', ...chaptersThreeHundredSeventyToThreeHundredSeventyTwo])], updatedAt: now() }, 'editor');
  const defense = state.tasks.find((item) => item.title === '城防影子：现代匿名巡检责任模拟');
  if (defense && defense.status !== 'completed') await appendTask({ ...defense, status: 'completed', agentWork: '离线影子三连续性经失败注入后通过；责任空窗/双唯一为0，医疗本地可救援且外发零字段，任务级撤销跨移动/固定/断线设备单调生效。仅获隔离实验室原型资格。', links: [...new Set([...defense.links, 'research/现代匿名巡检三连续性影子审查.md', chaptersThreeHundredSeventyToThreeHundredSeventyTwo[2]])], updatedAt: now() }, 'agent');
  if (!taskTitles.has('城防后续：隔离实验室匿名巡检原型')) {
    await appendTask({ id: uid('task'), title: '城防后续：隔离实验室匿名巡检原型', description: '用仿真设备/假任务槽做硬件时序复测，不连接外环巡检、旧M6或候选凭据。', level: 'session', status: 'next', kind: 'review', assignee: 'architect', source: 'navigator', priority: 'normal', whyNow: '软件影子通过只证明流程设计，硬件断线恢复、伪撤销和撤销后重开仍需隔离验证。', known: ['责任/医疗/撤退软件影子通过', '旧型号不支持单调版本则阻塞'], missingDecisions: ['硬件时序是否保持三连续性，何时才值得申请真实部署评审？'], aiPreAnalysis: '复测断线、迟到回执、伪撤销和恢复，不接真实系统。', authorDecision: '独立后续next，不抢占第五卷当前地下关系主线。', agentWork: '', completionCriteria: ['硬件三连续性通过', '无外部连接'], links: ['research/现代匿名巡检三连续性影子审查.md'], dependencies: [], createdAt: now(), updatedAt: now() }, 'navigator');
  }
  if (!taskTitles.has('续写第373～375章：四种目标同时躲开了同一阵压力')) {
    await appendTask({ id: uid('task'), title: '续写第373～375章：四种目标同时躲开了同一阵压力', description: '定位深层宽压力范围，分别记录A/B/C/D与E/F的避让、防御和停运动作，建立共同威胁关系图而不合并阵营。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'critical', whyNow: '五号废槽多类目标同时响应同一深层压力但动作不同；这是王庭候选与地窟冲突阶段的首个共同威胁证据。', known: ['A向上逃', 'B贴入D暗腔', 'E/F停止石台经过', 'C停扫一轮且D八点全抬'], missingDecisions: ['压力是生物/设施/地层还是冲突波，哪些目标竞争、互不干涉或存在临时协作？'], aiPreAnalysis: '第373章排除人类测试/节点回声；第374章逐类重建动作；第375章建立关系候选和反例。', authorDecision: '共同避让不等于共同命令或联盟；每类目标保持自身证据边界。', agentWork: '', completionCriteria: ['压力源范围与人类排除可核验', '至少四类响应分别记录', '共同威胁关系不越级为阵营'], links: [chaptersThreeHundredSeventyToThreeHundredSeventyTwo[2], 'planning/第五卷章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() }, 'navigator');
  }
  const facts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '匿名巡检责任医疗撤退三连续性', statement: '外发匿名设备槽、本地责任账、人员医疗episode和任务级撤销链必须独立；设备交接不结案人员/医疗，红线跨移动/固定/断线中继单调生效，人员字段不外发。', status: 'author-confirmed', evidence: [{ filePath: chaptersThreeHundredSeventyToThreeHundredSeventyTwo[2], quote: '城防影子审查结论有三项。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '现代匿名巡检影子审查', statement: '默认责任归设备、黄伤随设备归档、红线关不掉R-B均失败；修复后交接/换班/医疗断线/隐私越权/固定中继断线/伪撤销/重开测试通过。', status: 'text-explicit', evidence: [{ filePath: chaptersThreeHundredSeventyToThreeHundredSeventyTwo[2], quote: '第三条链通过。' }], updatedAt: now() },
    { id: uid('fact'), category: 'decision', subject: '城防匿名巡检当前权限终态', statement: '城防软件影子任务完成，仅可进入隔离实验室仿真设备/假任务槽原型；不连接真实巡检、外环节点、旧M6或候选凭据，真实部署另审。', status: 'author-confirmed', evidence: [{ filePath: chaptersThreeHundredSeventyToThreeHundredSeventyTwo[2], quote: '不等于城防上线。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '五号废槽共同深层压力事件', statement: '深层宽压力到达时A上逃、B贴入D暗腔、E/F停过石台、C停扫一轮、D八支点全抬；共同威胁可能，但动作不同且不证明共同阵营。', status: 'text-explicit', evidence: [{ filePath: chaptersThreeHundredSeventyToThreeHundredSeventyTwo[2], quote: '四类目标同时避开同一阵压力，却做了不同动作。' }], updatedAt: now() }
  ];
  for (const fact of facts) await appendFact(fact);
  await setPosition({ filePath: chaptersThreeHundredSeventyToThreeHundredSeventyTwo[2], stage: '第五卷共同威胁与地窟冲突阶段', focus: '续写第373～375章：四种目标同时躲开了同一阵压力' });
}

const chaptersThreeHundredSeventyThreeToThreeHundredSeventyFive = ['manuscript/第五卷-地窟王庭/第373章-压力先碰到没有目标的石壁.md', 'manuscript/第五卷-地窟王庭/第374章-停一轮和逃上坡不是同一道命令.md', 'manuscript/第五卷-地窟王庭/第375章-共同危险以后先出现的是争位置.md'];
if (chaptersThreeHundredSeventyThreeToThreeHundredSeventyFive.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第373～375章'));
  if (current && current.status !== 'completed') await appendTask({ ...current, status: 'completed', agentWork: '七枚被动压片确认W-1由深向浅覆盖至少208米、持续83秒；事前6小时无人类主动任务，机械留痕独立存在，已知C/D回声及A/B/E/F载荷均不能单独生成。D第6秒增至八点、B第9～16秒入暗腔、C停扫一轮、A第15秒上逃，E/F分别中止本次经过；共同危险响应成立，共同命令不成立。压力后A四次试入D暗腔，B维持占用，新增A—B有限空间竞争候选。', links: [...new Set([...current.links, 'research/五号废槽共同深层压力与多目标响应.md', ...chaptersThreeHundredSeventyThreeToThreeHundredSeventyFive])], updatedAt: now() }, 'writer');
  if (!taskTitles.has('整理五号废槽共同深层压力与多目标响应')) {
    const timestamp = now();
    await appendTask({ id: uid('task'), title: '整理五号废槽共同深层压力与多目标响应', description: '复算W-1传播、已知来源排除、多目标响应时间线与关系图，分离共同危险、共同命令和A—B空间竞争。', level: 'session', status: 'completed', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'high', whyNow: '多类目标在同一压力窗变化，最容易被摘要越级成统一阵营或共同敌人；A与B随后又首次争用D暗腔。', known: ['W-1由深向浅覆盖至少208米', '人类主动测试和已知节点回声不支持', 'A/B/C/D/E/F响应不同', 'A试入而B维持占用'], missingDecisions: [], aiPreAnalysis: '将观测、推断、反例和升级/降级条件拆表，保留来源及政治关系未知。', authorDecision: '共同危险不传播共同命令；本次E/F停行不借用此前维修交付升级协作；A—B仅为有限空间竞争候选。', agentWork: '已生成research/五号废槽共同深层压力与多目标响应.md，包含W-1范围、排除表、逐类时间线、关系图和A—B候选门槛。', completionCriteria: ['压力范围与排除可复算', '各目标动作不被同一摘要覆盖', '冲突关系有升级和降级条件'], links: ['research/五号废槽共同深层压力与多目标响应.md', chaptersThreeHundredSeventyThreeToThreeHundredSeventyFive[2]], dependencies: [], createdAt: timestamp, updatedAt: timestamp }, 'agent');
  }
  if (!taskTitles.has('续写第376～378章：灰背穴兽想进暗腔时二十三个冷点没有让路')) {
    await appendTask({ id: uid('task'), title: '续写第376～378章：灰背穴兽想进暗腔时二十三个冷点没有让路', description: '复算D暗腔入口尺寸与A撞击目标，观察A/B直接接触、D承力和材料变化，形成空间竞争、捕食、守巢或物理受阻的可推翻终态。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'navigator', priority: 'critical', whyNow: '共同压力退去后A连续试入D暗腔，B首次不按旧模式分散；这是地下目标之间第一条可直接检验的冲突候选。', known: ['A已四次撞向入口', 'B二十三点向入口收紧', 'D保持八点承力', '尚无伤害、驱逐或稳定占领'], missingDecisions: ['入口是否容得A通过？', 'A目标是空间、B还是矿壳？', 'B收紧是阻挡、受困还是D形变的被动结果？'], aiPreAnalysis: '第376章复算空间和撞击方向；第377章记录首次接触与D响应；第378章以伤害/驱逐/占用终态更新关系。', authorDecision: '继续被动观察，不以热片、压力或人员介入制造冲突；不把一次阻挡写成族群战争。', agentWork: '', completionCriteria: ['进入意图与物理受阻可区分', 'A/B/D动作分别记录', '冲突候选有可复核终态'], links: [chaptersThreeHundredSeventyThreeToThreeHundredSeventyFive[2], 'research/五号废槽共同深层压力与多目标响应.md', 'planning/第五卷章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() }, 'navigator');
  }
  const facts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '共同危险响应不传播共同命令', statement: '多个目标在同一物理事件窗变化只支持共同危险响应；统一指挥还需命令载体、稳定节奏、相同终态或可复现回应。摘要必须保留各目标的先后、阈值与动作。', status: 'author-confirmed', evidence: [{ filePath: chaptersThreeHundredSeventyThreeToThreeHundredSeventyFive[1], quote: '在同一八十三秒压力事件内分别响应' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '五号废槽W-1深层宽压力', statement: 'W-1由P-7深侧向P-1传播，覆盖至少208米、持续83秒；事前6小时无人类主动测试，机械留痕独立存在，已知C/D回声及A/B/E/F载荷不能单独生成。', status: 'text-explicit', evidence: [{ filePath: chaptersThreeHundredSeventyThreeToThreeHundredSeventyFive[0], quote: '覆盖至少二百零八米。' }], updatedAt: now() },
    { id: uid('fact'), category: 'knowledge', subject: 'W-1多目标响应关系图', statement: 'D增至八点、B分批入暗腔、C停扫一轮、A上逃，E/F各自中止本次经过；B-D保持材料/空间耦合，C-D无新增实线，E-F不因本次停行升级协作。', status: 'author-confirmed', evidence: [{ filePath: chaptersThreeHundredSeventyThreeToThreeHundredSeventyFive[2], quote: '第一版共同威胁关系图因此没有画出联盟。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: 'A-B-D暗腔空间竞争候选', statement: '压力退去后A连续四次撞向D暗腔入口，B由旧有分散模式改为23点收紧并维持占用，D保持承力；空间竞争候选中低，捕食/守巢/受困/物理受阻未知。', status: 'text-explicit', evidence: [{ filePath: chaptersThreeHundredSeventyThreeToThreeHundredSeventyFive[2], quote: '它们没有给灰背穴兽让路。' }], updatedAt: now() }
  ];
  for (const fact of facts) await appendFact(fact);
  await setPosition({ filePath: chaptersThreeHundredSeventyThreeToThreeHundredSeventyFive[2], stage: '第五卷A-B-D暗腔冲突阶段', focus: '续写第376～378章：灰背穴兽想进暗腔时二十三个冷点没有让路' });
}

const chaptersThreeHundredSeventySixToThreeHundredSeventyEight = ['manuscript/第五卷-地窟王庭/第376章-八个承力点把入口变窄了.md', 'manuscript/第五卷-地窟王庭/第377章-三块薄片让入口又窄了四厘米.md', 'manuscript/第五卷-地窟王庭/第378章-抢同一个暗腔不等于永远敌对.md'];
if (chaptersThreeHundredSeventySixToThreeHundredSeventyEight.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第376～378章'));
  if (current && current.status !== 'completed') await appendTask({ ...current, status: 'completed', agentWork: '46轮C侧影确认D五点入口76×69cm可让A擦肩通过，八点入口62×59cm卡肩；A六次换肩、探爪、清地和撕沉积持续指向进入。B有侧缝/深侧退路却返回入口，并以3块薄片令入口再窄4cm；A/B首次接触未出现追食或对身体攻击。W-2到来前A撕宽入口并占前段42秒，B退深后复占，空间竞争升中高；D仍按载荷工作。', links: [...new Set([...current.links, 'research/ABD暗腔冲突与空间竞争核验.md', ...chaptersThreeHundredSeventySixToThreeHundredSeventyEight])], updatedAt: now() }, 'writer');
  if (!taskTitles.has('整理A-B-D暗腔冲突与空间竞争核验')) {
    const timestamp = now();
    await appendTask({ id: uid('task'), title: '整理A-B-D暗腔冲突与空间竞争核验', description: '复算入口几何、A进入动作、B材料调节、直接接触和W-2前后占用终态，区分空间竞争、捕食、领地与D载荷响应。', level: 'session', status: 'completed', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'high', whyNow: 'A/B首次出现相反的空间动作，但一次直接接触也可能被误写成捕食、守巢或永久敌对；D的物理响应不能自动获得保护意图。', known: ['五点入口可进且八点受阻', 'A进入意图高', 'B定向材料调整成立', 'A短占前段后B复占'], missingDecisions: [], aiPreAnalysis: '按入口误差极端、动作受力线、历史送片位置、直接接触与先后占用分层结论。', authorDecision: 'A—B只确认有限空间竞争；一次未咬不证明永久不捕食，一次退让不确认领地；D保持无意图物理结构。', agentWork: '已生成research/ABD暗腔冲突与空间竞争核验.md，包含入口几何、A/B/D动作闭环、W-2终态和关系等级。', completionCriteria: ['进入与撞矿可区分', '材料调节与指挥意图分离', '竞争/捕食/领地分别结案'], links: ['research/ABD暗腔冲突与空间竞争核验.md', chaptersThreeHundredSeventySixToThreeHundredSeventyEight[2]], dependencies: [], createdAt: timestamp, updatedAt: timestamp }, 'agent');
  }
  if (!taskTitles.has('续写第379～381章：第二阵压力在争夺结束以前又从深处来了')) {
    await appendTask({ id: uid('task'), title: '续写第379～381章：第二阵压力在争夺结束以前又从深处来了', description: '比较W-1/W-2传播、宽顶与尾部一推一拉细震，排除压片回弹并完成共同危险、空间竞争和维修协作并存的阶段关系图。', level: 'chapter', status: 'now', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'critical', whyNow: 'W-2从D深侧起波且发生在A/B浅侧争夺尚未结束时，证明冲突不是压力源；尾部双向细震提供下一层来源结构入口。', known: ['W-2峰值为W-1约36%', '传播方向相同', 'A/B/D不是W-2源头', 'P-7尾部有一推一拉两次细震'], missingDecisions: ['细震是机械片回弹、同源回摆、两个受力主体还是设施换载？', '重复压力如何改变王庭候选与多目标关系结论？'], aiPreAnalysis: '第379章做两次事件与设备回弹对照；第380章拆双向受力候选；第381章阶段关系图结案。', authorDecision: '双向细震不直接翻译成双方交战；保持被动观测，不跨中层边界追源。', agentWork: '', completionCriteria: ['机械回弹有独立对照', '双向受力保留替代解释', '阶段图同时保存协作/竞争/共同危险'], links: [chaptersThreeHundredSeventySixToThreeHundredSeventyEight[2], 'research/ABD暗腔冲突与空间竞争核验.md', 'planning/第五卷章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() }, 'navigator');
  }
  const facts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '有限冲突不传播永久敌我', statement: '共同危险可与有限空间竞争并存；一次阻挡、退让或未捕食只适用于当前对象/时间/资源，不能外推为稳定领地、永久敌对或永久互不捕食。', status: 'author-confirmed', evidence: [{ filePath: chaptersThreeHundredSeventySixToThreeHundredSeventyEight[2], quote: '抢同一个暗腔不等于永远敌对' }], updatedAt: now() },
    { id: uid('fact'), category: 'knowledge', subject: 'D暗腔入口与A进入意图', statement: 'D五点入口约76×69cm，A可擦肩进入；八点约62×59cm会卡肩。A六次换肩、探爪、清地、撕落旧沉积并在W-2前优先入腔，进入意图高，具体收益未知。', status: 'text-explicit', evidence: [{ filePath: chaptersThreeHundredSeventySixToThreeHundredSeventyEight[0], quote: '平时可进、加固后受阻' }], updatedAt: now() },
    { id: uid('fact'), category: 'relationship', subject: 'A-B-D暗腔空间关系', statement: 'B有可离开侧缝/深侧退路却返回入口，并以3块薄片令D入口再窄4cm；A撕宽后占前段42秒、B退深，A退出后B复占。A-B有限空间竞争中高，B-D材料调节入口高。', status: 'author-confirmed', evidence: [{ filePath: chaptersThreeHundredSeventySixToThreeHundredSeventyEight[2], quote: 'A—B空间竞争因此升级为中高证据。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: 'W-2深层宽压力尾震', statement: 'W-2由P-7深侧向浅侧传播、峰值约W-1的36%，发生于A/B争夺未结束时，排除浅侧冲突为源；宽顶后有一推一拉两次细震，机制待核。', status: 'text-explicit', evidence: [{ filePath: chaptersThreeHundredSeventySixToThreeHundredSeventyEight[2], quote: '一次向外推。' }], updatedAt: now() }
  ];
  for (const fact of facts) await appendFact(fact);
  await setPosition({ filePath: chaptersThreeHundredSeventySixToThreeHundredSeventyEight[2], stage: '第五卷深层双向细震与关系图结案阶段', focus: '续写第379～381章：第二阵压力在争夺结束以前又从深处来了' });
}

const chaptersThreeHundredSeventyNineToThreeHundredEightyOne = ['manuscript/第五卷-地窟王庭/第379章-机械片的回弹不会穿过六道石壁.md', 'manuscript/第五卷-地窟王庭/第380章-一推一拉只证明深处有两次受力.md', 'manuscript/第五卷-地窟王庭/第381章-没有一条线能代表整个地窟.md'];
if (chaptersThreeHundredSeventyNineToThreeHundredEightyOne.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第379～381章'));
  if (current && current.status !== 'completed') await appendTask({ ...current, status: 'completed', agentWork: '同批/老化/报废压片台架显示本地回弹在0.2～0.7秒开始、1.6秒内递减，且故障有摩擦前兆；W-2尾震在6.2秒后出现并从P-7到P-2依次传播，排除单片回弹。W-1和19个月前残缺纸带也有外推—内拉，命名S-1深层交替受力源候选；简单回摆下降，设施/地层/多主体仍并列。盲关系图确认共同危险、A-B竞争、B-D材料、E-F维修和C独立响应并存。', links: [...new Set([...current.links, 'research/W1W2深层双向细震与阶段关系图.md', ...chaptersThreeHundredSeventyNineToThreeHundredEightyOne])], updatedAt: now() }, 'researcher');
  if (!taskTitles.has('整理W1-W2深层双向细震与阶段关系图')) {
    const timestamp = now();
    await appendTask({ id: uid('task'), title: '整理W1-W2深层双向细震与阶段关系图', description: '汇总压片台架、跨点传播、方向轴、三次记录和A～F关系边，限制S-1与王庭候选的解释范围。', level: 'session', status: 'completed', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'high', whyNow: '仪器伪影若未排除会污染全部深层推断；一推一拉又极易被文本模型越级翻成双方交战。', known: ['本地压片回弹已排除', '两笔均由P-7深侧起波', '简单回摆下降但未排除复杂单源', '阶段图含协作/竞争/共同危险'], missingDecisions: [], aiPreAnalysis: '用同批/老化/故障台架、错标盲对齐和两轴方向拆出可确认层，再将阶段关系盲审。', authorDecision: '中性命名S-1交替受力源；不写王庭机械、两军或巨兽；当前范围否定单一族群/关系模板，不宣称全地下政治结构。', agentWork: '已生成research/W1W2深层双向细震与阶段关系图.md，覆盖伪影排除、传播、方向、候选表和阶段关系边。', completionCriteria: ['仪器伪影与地下传播分离', '一推一拉不越级命名主体', '阶段关系结论有明确空间范围'], links: ['research/W1W2深层双向细震与阶段关系图.md', chaptersThreeHundredSeventyNineToThreeHundredEightyOne[2]], dependencies: [], createdAt: timestamp, updatedAt: timestamp }, 'agent');
  }
  if (!taskTitles.has('续写第382～384章：第五卷报告不能把六类目标压成一个王庭')) {
    await appendTask({ id: uid('task'), title: '续写第382～384章：第五卷报告不能把六类目标压成一个王庭', description: '将D-5设备链与A～F地下关系装入卷末报告，盲审单一王庭/多阵营/生态设施网络等模型，确认第五卷认知目标和可迁移证据边界。', level: 'chapter', status: 'now', kind: 'review', assignee: 'editor', source: 'navigator', priority: 'critical', whyNow: '现场阶段已完成，但两个未知中心若在报告摘要中互相作证，会把D-5匿名设备与S-1深层来源拼成虚构王庭。', known: ['D-5只有B设备人物候选边', 'S-1主体/政权未知', 'A～F非单一物理族群', '协作/竞争/共同危险并存'], missingDecisions: ['哪些模型经盲审仍能解释全部强证据？', '哪些地下事实和禁止推断可带入第六卷？'], aiPreAnalysis: '第382章拆报告证据域；第383章竞争模型盲审；第384章确认认知目标与迁移边界。', authorDecision: '设备未知与地下未知不得互相补全；卷末完成可以保留身份和政权未知。', agentWork: '', completionCriteria: ['两个未知中心不互相作证', '至少三种竞争模型按反例审查', '卷目标完成和遗留项分别列明'], links: [chaptersThreeHundredSeventyNineToThreeHundredEightyOne[2], 'research/W1W2深层双向细震与阶段关系图.md', 'planning/第五卷章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() }, 'navigator');
  }
  const facts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '机械传感伪影排除边界', statement: '单片回弹需用同批、老化和故障台架核验时间/形态/前兆；跨多个压片按空间延迟复写可确认地下传播，但只能排除本地仪器伪影，不能直接命名地下主体。', status: 'author-confirmed', evidence: [{ filePath: chaptersThreeHundredSeventyNineToThreeHundredEightyOne[0], quote: '机械片的回弹不会穿过六道石壁。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: 'W-1-W-2外推内拉尾震', statement: 'W-1/W-2主峰后均出现由P-7深侧起波、向浅侧传播的外推→内拉两笔；W-1幅比约0.42/间隔5.6秒，W-2约0.81/3.1秒，简单固定比例回摆下降。', status: 'text-explicit', evidence: [{ filePath: chaptersThreeHundredSeventyNineToThreeHundredEightyOne[1], quote: '第一笔朝外环方向推。' }], updatedAt: now() },
    { id: uid('fact'), category: 'knowledge', subject: 'S-1深层交替受力源候选', statement: 'S-1只表示P-7深侧在宽压力后先外推、再内拉的重复受力来源；复杂单源、设施换载、岩层过程和多主体均保留，不携王庭/生物/交战预设。', status: 'author-confirmed', evidence: [{ filePath: chaptersThreeHundredSeventyNineToThreeHundredEightyOne[1], quote: '阶段名称因此定为S-1深层交替受力源候选。' }], updatedAt: now() },
    { id: uid('fact'), category: 'relationship', subject: '第五卷地下阶段关系图', statement: '当前五号废槽至中层边缘范围内，共同危险、A-B空间竞争、B-D材料调节、E-F维修交付与C独立设施响应并存；单一物理族群/单一关系模板被否定，统一政权仍未知。', status: 'author-confirmed', evidence: [{ filePath: chaptersThreeHundredSeventyNineToThreeHundredEightyOne[2], quote: '没有一条线能代表整个地窟。' }], updatedAt: now() }
  ];
  for (const fact of facts) await appendFact(fact);
  await setPosition({ filePath: chaptersThreeHundredSeventyNineToThreeHundredEightyOne[2], stage: '第五卷卷末证据报告与模型盲审阶段', focus: '续写第382～384章：第五卷报告不能把六类目标压成一个王庭' });
}

const chaptersThreeHundredEightyTwoToThreeHundredEightyFour = ['manuscript/第五卷-地窟王庭/第382章-两个B不能在摘要里变成一个主体.md', 'manuscript/第五卷-地窟王庭/第383章-能解释所有反例的王庭模型没有预测.md', 'manuscript/第五卷-地窟王庭/第384章-卷目标完成不需要给王庭画一面旗.md'];
if (chaptersThreeHundredEightyTwoToThreeHundredEightyFour.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第382～384章'));
  if (current && current.status !== 'completed') await appendTask({ ...current, status: 'completed', agentWork: '卷末报告拦截三类自动合并：设备B/生物B同简称、固定中继/固定结构同形容词、CAND-RELAY-3/SRC-S1同“深层”；改用DEV-B-L6、BIO-B23、STR-D14、PERSON-CAND-D5、SRC-S1唯一名，两个未知域零关系边。统一王庭、多政治阵营、生态设施、混合自主单元四模型盲审，仅后者为当前最小充分描述；政治结构未知。认知目标完成并建立方法/工程评估/受限三层迁移边界。', links: [...new Set([...current.links, 'research/第五卷卷末竞争模型盲审.md', 'decisions/第五卷卷末证据与第六卷迁移边界.md', ...chaptersThreeHundredEightyTwoToThreeHundredEightyFour])], updatedAt: now() }, 'editor');
  if (!taskTitles.has('整理第五卷卷末竞争模型盲审')) {
    const timestamp = now();
    await appendTask({ id: uid('task'), title: '整理第五卷卷末竞争模型盲审', description: '隔离D-5设备域与地下关系域，记录自动摘要错并主体、四种地下模型、两种D-5连续模型和第六卷迁移三层。', level: 'session', status: 'completed', kind: 'review', assignee: 'editor', source: 'navigator', priority: 'high', whyNow: '卷末压缩最易让相同简称/形容词/模糊位置制造伪连续，并让两个未知中心互相填空。', known: ['DEV-B-L6与BIO-B23是不同主体', 'D-5设备域与SRC-S1零关系边', '混合自主单元为最小充分描述', '政治王庭仍未知'], missingDecisions: [], aiPreAnalysis: '先做唯一命名与证据域隔离，再盲审有预测的竞争模型，最后将可迁移项按方法/工程/受限分层。', authorDecision: '卷目标以非单一物理族群和多关系并存完成；不要求确认政治阵营；两个未知不互补。', agentWork: '已生成research/第五卷卷末竞争模型盲审.md和decisions/第五卷卷末证据与第六卷迁移边界.md。', completionCriteria: ['自动摘要伪合并可追溯', '模型按额外假设和反例审查', '第六卷迁移边界明确'], links: ['research/第五卷卷末竞争模型盲审.md', 'decisions/第五卷卷末证据与第六卷迁移边界.md', chaptersThreeHundredEightyTwoToThreeHundredEightyFour[2]], dependencies: [], createdAt: timestamp, updatedAt: timestamp }, 'agent');
  }
  const resource = state.tasks.find((item) => item.title === '资源开放：L6-M6公开字段差异清单');
  if (resource && !resource.known.includes('人间武库2407件旧武具缺少安全载荷算法')) await appendTask({ ...resource, status: 'next', whyNow: '人间武库2407件六槽旧武具的公开维修库只有外形、缺安全载荷算法；L6工程字段可能补缺，但公开不可逆且不得携M6取证/匿名任务字段。', known: [...new Set([...resource.known, '人间武库2407件旧武具缺少安全载荷算法', 'L6机械尺寸/安全载荷/失效方式进入公开评估层', 'M6批次指纹/匿名槽哈希/内侧回执保持受限'])], missingDecisions: ['维修与取证双复核后哪些字段可公开？', '公开包如何证明不含D-5或地下关系权限？'], updatedAt: now() }, 'navigator');
  if (!taskTitles.has('续写第385～386章：带进人间武库的是接口边界，不是D-5名字')) {
    await appendTask({ id: uid('task'), title: '续写第385～386章：带进人间武库的是接口边界，不是D-5名字', description: '完成L6/M6公开工程、取证和匿名任务字段差异双复核，分别结案七人外环、D-5设备、SRC-S1与地下关系图，以最小公开接口包进入第六卷。', level: 'chapter', status: 'now', kind: 'review', assignee: 'editor', source: 'navigator', priority: 'critical', whyNow: '第五卷认知目标已完成，最后必须真实执行可迁移边界，避免“可评估公开”在卷末摘要中自动变成已发布。', known: ['2407件旧武具缺安全载荷算法', 'L6工程字段可评估', 'M6/D-5/SRC-S1保持受限', '第五卷剩余2章'], missingDecisions: ['公开包包含哪些字段、谁签字、是否已对外发布？', '四条主线以何终态进入第六卷？'], aiPreAnalysis: '第385章双角色字段差异与最小公开包；第386章发布/不发布终态、四线结案和人间武库入口。', authorDecision: '只带工程边界和方法，不带D-5名字或地下关系权限；发布必须显式且可审计。', agentWork: '', completionCriteria: ['公开/取证/匿名字段逐项分开', '发布动作与评估完成分开', '第五卷77章及四线终态审计通过'], links: [chaptersThreeHundredEightyTwoToThreeHundredEightyFour[2], 'decisions/第五卷卷末证据与第六卷迁移边界.md', 'planning/第五卷章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() }, 'navigator');
  }
  const facts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '跨证据域简称与相似语义不可并主体', statement: '临时简称相同、形容词相同或模糊位置相似均不能生成身份/时间/空间关系；卷末跨域必须使用唯一名并要求实物、时间、材料、接口或信号证据。', status: 'author-confirmed', evidence: [{ filePath: chaptersThreeHundredEightyTwoToThreeHundredEightyFour[0], quote: '两个未知放在一句话里，不会自动变成一个答案。' }], updatedAt: now() },
    { id: uid('fact'), category: 'decision', subject: '第五卷地下竞争模型盲审', statement: '统一王庭/多政治阵营/纯生态无组织均未确认；多种自主单元与生态、设施、局部组织混合关系是当前最小充分描述，不回答政治阵营数量。', status: 'author-confirmed', evidence: [{ filePath: chaptersThreeHundredEightyTwoToThreeHundredEightyFour[1], quote: '多种自主单元与混合关系：当前范围确认。' }], updatedAt: now() },
    { id: uid('fact'), category: 'decision', subject: '第五卷到第六卷迁移三层', statement: '可迁移方法层；L6尺寸/载荷/失效/替代原则进入工程公开评估；M6指纹、匿名槽、重封装、内侧回执、D-5人物候选及地下主体保持受限。', status: 'author-confirmed', evidence: [{ filePath: chaptersThreeHundredEightyTwoToThreeHundredEightyFour[2], quote: '卷末迁移清单分成三层。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '人间武库六槽旧武具缺口', statement: '人间武库修复处有2407件六槽旧武具；公开维修库只有外形、缺安全载荷算法，门阀维护库有算法但不向普通修械师开放，L6公开工程层进入双复核。', status: 'text-explicit', evidence: [{ filePath: chaptersThreeHundredEightyTwoToThreeHundredEightyFour[2], quote: '两千四百零七件旧武具使用六槽传力接口。' }], updatedAt: now() }
  ];
  for (const fact of facts) await appendFact(fact);
  await setPosition({ filePath: chaptersThreeHundredEightyTwoToThreeHundredEightyFour[2], stage: '第五卷L6-M6公开字段与四线终态结案阶段', focus: '续写第385～386章：带进人间武库的是接口边界，不是D-5名字' });
}

const chaptersThreeHundredEightyFiveToThreeHundredEightySix = ['manuscript/第五卷-地窟王庭/第385章-可公开候选包里没有蓝钼比例.md', 'manuscript/第五卷-地窟王庭/第386章-七十七章没有找到一位地下国王.md'];
if (chaptersThreeHundredEightyFiveToThreeHundredEightySix.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第385～386章'));
  if (current && current.status !== 'completed') await appendTask({ ...current, status: 'completed', agentWork: 'L6/M6共46字段经维修/取证独立分类：24项工程公开候选、9项受控维修候选、13项取证/匿名任务受限。四名普通修械师在18件报废武具盲测：12件有档案中11件在安全上限前停止、1件无载偏角阻断，6件无档案均未猜额定值，无破裂。候选包0.1仅本地生成，未发布。七人队伍、D-5设备、地下关系与SRC-S1分别结案，第五卷77章完成。', links: [...new Set([...current.links, 'research/L6M6公开字段差异双复核.md', 'planning/第五卷结案.md', 'planning/第六卷章纲.md', ...chaptersThreeHundredEightyFiveToThreeHundredEightySix])], updatedAt: now() }, 'editor');
  const resource = state.tasks.find((item) => item.title === '资源开放：L6-M6公开字段差异清单');
  if (resource && resource.status !== 'completed') await appendTask({ ...resource, status: 'completed', agentWork: '46字段差异与18件盲测完成；本地候选包0.1生成。终态为24工程公开候选/9受控维修候选/13受限，无外部发布、无制造商通知、无公共标准升级。', links: [...new Set([...resource.links, 'research/L6M6公开字段差异双复核.md', chaptersThreeHundredEightyFiveToThreeHundredEightySix[0]])], updatedAt: now() }, 'researcher');
  if (!taskTitles.has('整理L6-M6公开字段差异双复核')) {
    const timestamp = now();
    await appendTask({ id: uid('task'), title: '整理L6-M6公开字段差异双复核', description: '记录46字段维修/取证分类、十二度止挡角拆分、安全载荷算法、普通修械师盲测与发布终态。', level: 'session', status: 'completed', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'high', whyNow: '第五卷最后必须证明“可评估公开”没有被卷末叙事自动改成已发布，也要为第六卷提供可复现入口。', known: ['24/9/13三层结果', '18件盲测无破裂', '未知额定值全部停止', '候选包未发布'], missingDecisions: [], aiPreAnalysis: '按字段必要性/取证污染拆分，再由不知私库答案的普通修械师验证能否识别停止点。', authorDecision: '完成字段边界而非发布；发布范围、对象和责任进入第六卷独立决策。', agentWork: '已生成research/L6M6公开字段差异双复核.md，发布状态明确为本地候选。', completionCriteria: ['公开与受限字段可审计', '普通修械师可执行停止条件', '无外部发布副作用'], links: ['research/L6M6公开字段差异双复核.md', chaptersThreeHundredEightyFiveToThreeHundredEightySix[0]], dependencies: [], createdAt: timestamp, updatedAt: timestamp }, 'agent');
  }
  for (const goal of state.goals.filter((item) => item.status === 'active' && item.title.includes('第五卷《地窟王庭》'))) await project.eventStore.append('goal.upsert', { ...goal, status: 'completed', updatedAt: now() } as never, 'author');
  if (!state.goals.some((item) => item.title.includes('第六卷《人间武库》'))) {
    await project.eventStore.append('goal.upsert', { id: uid('goal'), level: 'volume', title: '完成第六卷《人间武库》并将门阀垄断算法公开化', description: '约79章：从2407件六槽旧武具的安全知识缺口出发，复现、审查并发布普通修械师可验证的公共算法，同时保留制造秘密与取证边界。', authority: 'author-pinned', status: 'active', target: 'manuscript/第六卷-人间武库', updatedAt: now() } as never, 'author');
  }
  if (!taskTitles.has('续写第387～389章：两千四百零七件旧武具只有门阀能看安全算法')) {
    await appendTask({ id: uid('task'), title: '续写第387～389章：两千四百零七件旧武具只有门阀能看安全算法', description: '在武库外层无联网试验室核验断潮枪等三件退役武具，分层公开铭牌、门阀摘要和物理状态，不读取私库先执行L6停止条件。', level: 'chapter', status: 'now', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'critical', whyNow: '断潮枪公开额定900斤、门阀摘要1200斤，但第三槽无载偏角3.4度；若为证明候选算法而继续加载，会重复用目标覆盖停止条件。', known: ['仅外层3件退役武具/无联网试验室', '候选包未发布', '断潮枪第三槽无载偏角3.4度', '不开放门阀维护私库'], missingDecisions: ['三种来源冲突时先信什么？', '不加载能否仍完成外层评审？', '另外两件武具是否属于同一接口族？'], aiPreAnalysis: '第387章来源分层并停止断潮枪；第388章无私库复现耦合/失效；第389章三件不同终态与评审门槛。', authorDecision: '外层评审不以全部修好或击出最大载荷为通过；物理无载异常可先于铭牌和私库摘要阻断。', agentWork: '', completionCriteria: ['三件武具分别有来源与物理终态', '停止条件不被演示目标覆盖', '不读取私库也不把候选包升级标准'], links: [chaptersThreeHundredEightyFiveToThreeHundredEightySix[1], 'planning/第六卷章纲.md', 'research/L6M6公开字段差异双复核.md'], dependencies: [], createdAt: now(), updatedAt: now() }, 'navigator');
  }
  const facts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: 'L6未知额定值安全诊断', statement: '已知额定值可从30%分级加载并按非线性/偏角/卸载残余停止；额定未知只做无载诊断，不从武者拳力、同外形设备或门阀摘要倒推。', status: 'author-confirmed', evidence: [{ filePath: chaptersThreeHundredEightyFiveToThreeHundredEightySix[0], quote: '算法公开的是停止条件。' }], updatedAt: now() },
    { id: uid('fact'), category: 'decision', subject: 'L6-M6字段双复核终态', statement: '46字段分为24工程公开候选、9受控维修候选、13取证/匿名任务受限；18件报废武具盲测无破裂，候选包0.1仅本地生成，未发布/通知/升级标准。', status: 'author-confirmed', evidence: [{ filePath: chaptersThreeHundredEightyFiveToThreeHundredEightySix[0], quote: '完成的是字段边界。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '第五卷地窟王庭结案', statement: '第五卷310～386共77章完成；七人均返回，D-5人员未知，地下非单一物理族群且多关系并存，SRC-S1主体未知，公开候选包无外部效果。', status: 'author-confirmed', evidence: [{ filePath: chaptersThreeHundredEightyFiveToThreeHundredEightySix[1], quote: '第五卷《地窟王庭》完成。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '第六卷人间武库外层评审', statement: '武库2407件六槽旧武具缺公开安全算法；当前只准外层3件退役武具/无联网试验室。断潮枪铭牌900斤、门阀摘要1200斤，第三槽无载偏角3.4度。', status: 'text-explicit', evidence: [{ filePath: chaptersThreeHundredEightyFiveToThreeHundredEightySix[1], quote: '第六卷《人间武库》启动。' }], updatedAt: now() }
  ];
  for (const fact of facts) await appendFact(fact);
  await setPosition({ filePath: chaptersThreeHundredEightyFiveToThreeHundredEightySix[1], stage: '第六卷人间武库外层三件退役武具评审', focus: '续写第387～389章：两千四百零七件旧武具只有门阀能看安全算法' });
}

const updated = await project.state();
process.stdout.write(`${JSON.stringify({ stats: updated.manuscriptStats, currentTask: updated.continueCard.focus, facts: updated.facts.length }, null, 2)}\n`);
