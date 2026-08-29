import path from 'node:path';
import { ProjectService } from '../electron/main/project.js';
import type { CreativeTask, StoryFact } from '../src/shared/types.js';
import { now, uid } from '../electron/main/utils.js';

const root = path.resolve(process.argv[2] || path.join(import.meta.dirname, '..', 'workspaces', 'wan-jie-zhu-shen'));
const project = new ProjectService('million-word-seventh-volume');
const state = await project.open(root);
const taskTitles = new Set(state.tasks.map((task) => task.title));
const factKeys = new Set(state.facts.map((fact) => `${fact.subject}\u0000${fact.statement}`));

type ProjectPosition = { filePath: string; stage: string; focus: string };
type EventSource = 'writer' | 'navigator' | 'agent' | 'researcher' | 'editor' | 'system';
const positionKey = (position: ProjectPosition) => JSON.stringify([position.filePath, position.stage, position.focus]);
const knownPositions = new Set(
  (await project.eventStore.all())
    .filter((event) => event.type === 'project.position')
    .map((event) => positionKey(event.payload as unknown as ProjectPosition))
);

async function appendTask(task: CreativeTask, source: EventSource) {
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

const chaptersFourHundredSixtySixToFourHundredSixtyEight = ['manuscript/第七卷-断星远征/第466章-十七秒不是校准片的重量周期.md', 'manuscript/第七卷-断星远征/第467章-六格对照里只有壁侧柔架一起变轻.md', 'manuscript/第七卷-断星远征/第468章-远征校准先把重量拆成质量和三个方向.md'];
if (chaptersFourHundredSixtySixToFourHundredSixtyEight.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第466～468章'));
  if (current && current.status !== 'completed') await appendTask({ ...current, status: 'completed', agentWork: '12圈确认读针17.04～17.06秒锁旋转方位，甲板应变领先0.12秒；3片同相、2针互换留台、惯性质量稳定，排单片/单针/质量变化。2转速×3支撑六格：17秒柔架/刚桥/中央法向5.9/2.1/0.8%，23.1秒4.2/1.7/0.7%，拆局部向量与柔架放大。远征校准0.1分质量、局部向量、法切轴、支撑相位、工具能力；江砚柔架二成左右差0.13停、刚桥0.08/换相0.09，锻骨初段保留但仅开舰上刚桥二成。', links: [...new Set([...current.links, 'research/旋转舱17秒标准片周期与远征校准01.md', 'decisions/远征重量必须拆质量与局部载荷向量.md', ...chaptersFourHundredSixtySixToFourHundredSixtyEight])], updatedAt: now() }, 'researcher');
  if (!taskTitles.has('整理旋转舱17秒标准片周期与远征校准0.1')) {
    const timestamp = now();
    await appendTask({ id: uid('task'), title: '整理旋转舱17秒标准片周期与远征校准0.1', description: '记录17秒相位、3片2针惯性质量、2×3六格、质量/向量/支撑拆分、0.1硬门与江砚舰上人体负荷。', level: 'session', status: 'completed', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'high', whyNow: '母星总重量语义在旋转舱混合局部向量与支撑形变，平均值会隐藏瞬时切向风险，人体许可也不能跟境界证书直接迁移。', known: ['17.05秒相位', '六格法向差', '质量稳定', '江砚柔架0.13停'], missingDecisions: [], aiPreAnalysis: '用相位/互换/惯性质量排单点，再以转速×支撑拆分局部载荷。', authorDecision: '不平均周期，不借中央给壁侧；设备与人体分别校准。', agentWork: '已生成research/旋转舱17秒标准片周期与远征校准01.md和decisions/远征重量必须拆质量与局部载荷向量.md。', completionCriteria: ['来源可拆', '六格无遗漏', '0.1硬门与人体边界完整'], links: ['research/旋转舱17秒标准片周期与远征校准01.md', 'decisions/远征重量必须拆质量与局部载荷向量.md', chaptersFourHundredSixtySixToFourHundredSixtyEight[2]], dependencies: [], createdAt: timestamp, updatedAt: timestamp }, 'agent');
  }
  if (!taskTitles.has('续写第469～471章：一份出航岗位表把三个人都写成最终停止人')) {
    await appendTask({ id: uid('task'), title: '续写第469～471章：一份出航岗位表把三个人都写成最终停止人', description: '拆江砚战斗现场、石小满设备远程、沈青弦医疗三种最终停止的风险范围/即时动作/承接，以冲突情景验证并行停止、局部继续、共同撤退并修订岗位表和离线接管。', level: 'chapter', status: 'now', kind: 'planning', assignee: 'navigator', source: 'navigator', priority: 'critical', whyNow: '环境校准已证明设备与身体门不同；三个最终停止若靠投票或职级覆盖，会让身体事实、设备异常与共同风险互相否决。', known: ['江砚现场战斗停权', '石小满设备停权', '沈青弦医疗停权', '旋转舱有离线场景'], missingDecisions: ['三权是否可并行生效？', '谁能恢复他人停止？', '失联后由谁接管共同撤退？'], aiPreAnalysis: '第469章拆范围；第470章冲突回放；第471章岗位/离线/恢复权。', authorDecision: '停止按风险范围并行，不投票决定事实；恢复需对应新证据，最终共同撤退另有规则。', agentWork: '', completionCriteria: ['三停权不互吞', '冲突情景可回放', '离线承接/恢复边界完整'], links: [chaptersFourHundredSixtySixToFourHundredSixtyEight[2], 'research/旋转舱17秒标准片周期与远征校准01.md', 'planning/第七卷章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() }, 'navigator');
  }
  const facts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '旋转远征环境质量与载荷向量分离', statement: '质量、局部加速度向量、法/切/轴载荷、支撑应变、装夹相位分别记录；转速/舱位/架/方向变化失效，中央稳定结果和每圈平均不得覆盖壁侧瞬时风险。', status: 'author-confirmed', evidence: [{ filePath: chaptersFourHundredSixtySixToFourHundredSixtyEight[2], quote: '远征校准零点一没有“重量”单字段。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '旋转舱2转速3支撑六格结果', statement: '17秒法向峰谷柔架5.9%/壁侧刚桥2.1%/中央0.8%；23.1秒为4.2/1.7/0.7%；3片/2针/惯性质量支持局部向量与柔架放大，量具漂移≤0.4%。', status: 'text-explicit', evidence: [{ filePath: chaptersFourHundredSixtySixToFourHundredSixtyEight[1], quote: '六格没有出现“换一个地方就完全恒定”。' }], updatedAt: now() },
    { id: uid('fact'), category: 'knowledge', subject: '江砚旋转舱首轮人体校准', statement: '锻骨初段不继承母星负荷：壁侧柔架二成左右胫差0.13>0.12在髋前停；壁侧刚桥二成0.08、换相0.09，无迟发伤，舰上只开刚桥二成适应。', status: 'author-confirmed', evidence: [{ filePath: chaptersFourHundredSixtySixToFourHundredSixtyEight[2], quote: '境界是身体已经建立的能力，环境许可是此处能否安全使用' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '出航岗位表三名最终停止人冲突', statement: '出航表把江砚写战斗现场最终停止、石小满设备远程最终停止、沈青弦医疗最终停止；下一步按风险范围拆停权、恢复权与失联共同撤退，不以投票决定事实。', status: 'text-explicit', evidence: [{ filePath: chaptersFourHundredSixtySixToFourHundredSixtyEight[2], quote: '同一任务出现三个“最终”。' }], updatedAt: now() }
  ];
  for (const fact of facts) await appendFact(fact);
  await setPosition({ filePath: chaptersFourHundredSixtySixToFourHundredSixtyEight[2], stage: '第七卷出航三类停止权与岗位校准阶段', focus: '续写第469～471章：一份出航岗位表把三个人都写成最终停止人' });
}

const chaptersFourHundredSixtyNineToFourHundredSeventyOne = ['manuscript/第七卷-断星远征/第469章-三个最终停止人不能互相投票.md', 'manuscript/第七卷-断星远征/第470章-人身红色没有让绿色牵引器一起报废.md', 'manuscript/第七卷-断星远征/第471章-能让任务停下的人不能独自让它重新开始.md'];
if (chaptersFourHundredSixtyNineToFourHundredSeventyOne.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第469～471章'));
  if (current && current.status !== 'completed') await appendTask({ ...current, status: 'completed', agentWork: '删除江砚战斗现场、石小满设备远程、沈青弦医疗三个“最终”，按对象/动作并行停止；阿轨按气密/生命维持/回程/多域组合门撤退，巫岚合并，指挥官只选剩余安全目标。四场演练得到人员停设备续、设备停人员换动作、现场霜线停远程26秒追证、组合门整退。停权不含恢复权，各域新证据+独立签读，共同撤退后新建任务；8分钟离线用设备联锁/本地签停、医疗腕带、现场收窄承接，重连按对象合链不回滚。', links: [...new Set([...current.links, 'research/远征三类停止权与离线承接.md', 'decisions/停止权按风险范围并行而非投票.md', ...chaptersFourHundredSixtyNineToFourHundredSeventyOne])], updatedAt: now() }, 'navigator');
  if (!taskTitles.has('整理远征三类停止权与离线承接')) {
    const timestamp = now();
    await appendTask({ id: uid('task'), title: '整理远征三类停止权与离线承接', description: '记录医疗/设备/现场三域、阿轨组合撤退、四场冲突、恢复权分离和8分钟离线本地承接。', level: 'session', status: 'completed', kind: 'planning', assignee: 'navigator', source: 'navigator', priority: 'high', whyNow: '单炮式最终授权复制到身体/设备/现场会用投票覆盖事实；停权兼恢复权又会诱导过早复工或把补证压给停止者。', known: ['三域并行', '四场演练', '停权不含恢复', '8分钟离线'], missingDecisions: [], aiPreAnalysis: '以冲突情景证明状态可并存，再拆承接/恢复与对象身份。', authorDecision: '指挥选择目标不改事实；本地停止优先，重连不自动回滚。', agentWork: '已生成research/远征三类停止权与离线承接.md和decisions/停止权按风险范围并行而非投票.md。', completionCriteria: ['三域不互吞', '撤退组合门可执行', '离线同链不丢/不重'], links: ['research/远征三类停止权与离线承接.md', 'decisions/停止权按风险范围并行而非投票.md', chaptersFourHundredSixtyNineToFourHundredSeventyOne[2]], dependencies: [], createdAt: timestamp, updatedAt: timestamp }, 'agent');
  }
  if (!taskTitles.has('续写第472～474章：母星仍在视窗里第一条远程停止已经晚了八分钟')) {
    await appendTask({ id: uid('task'), title: '续写第472～474章：母星仍在视窗里第一条远程停止已经晚了八分钟', description: '处理真实一号舱外维修臂8分钟断链：本地最后有效卡/机械联锁先停，迟到远程建议核对象/有效窗，不覆盖现场漂移；完成首次舰外任务与出航校准阶段。', level: 'chapter', status: 'now', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'critical', whyNow: '演练刚验证离线协议，真实维修臂首次展开即失去中心确认；必须区分命令发出、到达、对象状态和现场承接。', known: ['停止已入发送队列', '预计8分钟闭环', '机械联锁有最后有效卡', '母星仍在视窗'], missingDecisions: ['本地为何触发停止？', '8分钟内对象如何变化？', '迟到命令何时失效/如何承接？'], aiPreAnalysis: '第472章本地停止；第473章迟到命令/对象漂移；第474章首次任务结案与有效窗。', authorDecision: '不因看得见母星假装实时；迟到命令先核对象/版本/状态，现场新事实优先。', agentWork: '', completionCriteria: ['8分钟时序闭合', '迟到命令不误作用', '首次舰外任务有终态'], links: [chaptersFourHundredSixtyNineToFourHundredSeventyOne[2], 'research/远征三类停止权与离线承接.md', 'planning/第七卷章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() }, 'navigator');
  }
  const facts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '远征三类停止权并行', statement: '医疗停具体人员/负荷，设备停接口/版本/舱位/数据链，现场停眼前物理/战斗；状态可并存不投票。阿轨按气密/生命维持/回程/多域组合门撤退。', status: 'author-confirmed', evidence: [{ filePath: chaptersFourHundredSixtyNineToFourHundredSeventyOne[0], quote: '三个最终停止人不能互相投票。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '远征停止权四场冲突演练', statement: '江砚医疗停后贺川接设备任务；设备旧卡停而人员手动退；现场霜线先停26秒后远程追证；生命维持+回程+中继组合门整退，分别保留任务/人/设备终态。', status: 'text-explicit', evidence: [{ filePath: chaptersFourHundredSixtyNineToFourHundredSeventyOne[1], quote: '四场演练产生四种结果。' }], updatedAt: now() },
    { id: uid('fact'), category: 'decision', subject: '停止权不包含恢复权', statement: '医疗/设备/现场分别需新证据和独立签读；共同撤退后开新任务。远程无回执不算落地，本地状态重连后按命令号/对象合链，不覆盖生效时间或恢复旧许可。', status: 'author-confirmed', evidence: [{ filePath: chaptersFourHundredSixtyNineToFourHundredSeventyOne[2], quote: '能让任务停下的人不能独自让它重新开始。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '首个真实维修臂8分钟停止断链', statement: '离港牵引后母星仍可见，一号舱外维修臂真实展开丢中心确认，停止命令预计8分钟闭环；下一步由本地卡/联锁承接并审迟到命令有效窗。', status: 'text-explicit', evidence: [{ filePath: chaptersFourHundredSixtyNineToFourHundredSeventyOne[2], quote: '第一条远程停止已经晚了八分钟。' }], updatedAt: now() }
  ];
  for (const fact of facts) await appendFact(fact);
  await setPosition({ filePath: chaptersFourHundredSixtyNineToFourHundredSeventyOne[2], stage: '第七卷首个真实舰外任务与延迟命令阶段', focus: '续写第472～474章：母星仍在视窗里第一条远程停止已经晚了八分钟' });
}

const chaptersFourHundredSeventyTwoToFourHundredSeventyFour = ['manuscript/第七卷-断星远征/第472章-维修臂在停止命令到达以前先停在四十二度.md', 'manuscript/第七卷-断星远征/第473章-迟到的收回命令指向了已经不存在的轨迹.md', 'manuscript/第七卷-断星远征/第474章-第一次舰外任务没有让迟到命令冒充实时指挥.md'];
if (chaptersFourHundredSeventyTwoToFourHundredSeventyFour.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第472～474章'));
  if (current && current.status !== 'completed') await appendTask({ ...current, status: 'completed', agentWork: '首次舰外臂因旋转17.05→16.72使载荷卡失效；中心+6秒发“停并收回”，本地联锁+11秒停增力、+19秒停42°、+2:40三索限摆，命令+8:09才到。命令观测28°/双索/旧周期，现场42°/三索/新周期；拆停止（已满足合链）与收回运动（状态漂移拒绝）。新任务先退臂35°，再3方位窗将箱体移至2扣+3索软泊位；无人越权出舱，原槽未恢复，保留11分钟/0.2%推进剂/适配器不可用成本。建立目的/状态哈希/允许漂移/不可跨动作/到期五字段。', links: [...new Set([...current.links, 'research/首个舰外维修臂八分钟延迟命令.md', 'decisions/远程命令必须携对象状态与有效窗.md', ...chaptersFourHundredSeventyTwoToFourHundredSeventyFour])], updatedAt: now() }, 'researcher');
  if (!taskTitles.has('整理首个舰外维修臂八分钟延迟命令')) {
    const timestamp = now();
    await appendTask({ id: uid('task'), title: '整理首个舰外维修臂八分钟延迟命令', description: '记录真实时序、停止/收回拆分、状态漂移拒绝、新任务软泊位、命令五字段与七人四席入口。', level: 'session', status: 'completed', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'high', whyNow: '签名和权限真实不代表迟到动作仍适用；把收回当更彻底停止会沿旧轨迹制造新碰撞。', known: ['+8:09命令到达', '42°三索新状态', '2扣+3索终态', '命令五字段'], missingDecisions: [], aiPreAnalysis: '按本地/中心事件闭合，拆单调停止与需当前几何的新运动。', authorDecision: '本地近证优先；拒绝/部分满足为有效回执，不为取箱越权出舱。', agentWork: '已生成research/首个舰外维修臂八分钟延迟命令.md和decisions/远程命令必须携对象状态与有效窗.md。', completionCriteria: ['8分钟时序闭合', '命令不误作用', '首次舰外任务成本/终态完整'], links: ['research/首个舰外维修臂八分钟延迟命令.md', 'decisions/远程命令必须携对象状态与有效窗.md', chaptersFourHundredSeventyTwoToFourHundredSeventyFour[2]], dependencies: [], createdAt: timestamp, updatedAt: timestamp }, 'agent');
  }
  if (!taskTitles.has('续写第475～477章：七个人都通过出航测试长期航行舱却只有四个')) {
    await appendTask({ id: uid('task'), title: '续写第475～477章：七个人都通过出航测试长期航行舱却只有四个', description: '按远征任务依赖、可替代性、母星留守责任与个人选择拆7人4席，盲比多种名单对救援/设备/医疗/撤退/公共维护缺口，确认首批长期乘员和轮换/留守任务。', level: 'chapter', status: 'now', kind: 'planning', assignee: 'navigator', source: 'navigator', priority: 'critical', whyNow: '七人都合格但席位稀缺；按境界、功劳或测试排名会把岗位互补与母星公共算法维护当成落选惩罚。', known: ['七人均通过', '仅4长期舱位', '远征需多岗位', '母星v1.0仍需维护'], missingDecisions: ['4个岗位最小覆盖？', '谁必须留守母星？', '轮换何时/由什么条件触发？'], aiPreAnalysis: '第475章需求/个人选择；第476章多名单盲审；第477章乘员/轮换/留守终态与同盟分歧。', authorDecision: '通过是资格不保证席位；不把留守写降级，个人拒绝也不写不忠。', agentWork: '', completionCriteria: ['7人选择/缺口可见', '4席方案可解释', '未上船者有真实任务与复议'], links: [chaptersFourHundredSeventyTwoToFourHundredSeventyFour[2], 'research/首个舰外维修臂八分钟延迟命令.md', 'planning/第七卷章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() }, 'navigator');
  }
  const facts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '远程命令状态有效窗', statement: '命令须携目的、最后观测/对象哈希、允许漂移、不可跨动作、到期/重取；签名权限只证谁何时发。停止可与本地合链，收回/移动按当前几何新授权。', status: 'author-confirmed', evidence: [{ filePath: chaptersFourHundredSeventyTwoToFourHundredSeventyFour[1], quote: '迟到的收回命令指向了已经不存在的轨迹。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '首个真实舰外维修臂8分钟断链', statement: '转速变化后+6秒中心发令，+11本地停增力、+19停42°、+2:40三索限摆，+8:03中心获确认/+8:09节点收令；停止合链、旧收回拒绝。', status: 'text-explicit', evidence: [{ filePath: chaptersFourHundredSeventyTwoToFourHundredSeventyFour[2], quote: '首次舰外任务时间线结案。' }], updatedAt: now() },
    { id: uid('fact'), category: 'knowledge', subject: '维护箱软泊位终态', statement: '新任务将维修臂42→35°，三方位窗把箱体移入软泊位；第三扣封膜，终态2扣+3索/禁姿态调整，零伤零越权舱外，原槽未恢复且备用适配器暂不可用。', status: 'author-confirmed', evidence: [{ filePath: chaptersFourHundredSeventyTwoToFourHundredSeventyFour[2], quote: '软泊位部分接合、禁止姿态调整' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '七人通过但仅四个长期航行舱位', statement: '江砚/贺川/石小满/纪潮生/沈青弦/巫岚/阿轨均通过出航测试，公共组仅4长期舱位；下一步按任务依赖/替代/留守/个人选择盲比，不按功劳境界排名。', status: 'text-explicit', evidence: [{ filePath: chaptersFourHundredSeventyTwoToFourHundredSeventyFour[2], quote: '通过不等于所有人都能上同一艘船。' }], updatedAt: now() }
  ];
  for (const fact of facts) await appendFact(fact);
  await setPosition({ filePath: chaptersFourHundredSeventyTwoToFourHundredSeventyFour[2], stage: '第七卷七人四席与旧同盟任务分流阶段', focus: '续写第475～477章：七个人都通过出航测试长期航行舱却只有四个' });
}

const chaptersFourHundredSeventyFiveToFourHundredSeventySeven = ['manuscript/第七卷-断星远征/第475章-七个人通过测试不等于凭空多出三个舱位.md', 'manuscript/第七卷-断星远征/第476章-四张名单分别漏掉了撤退结构设备和母星维护.md', 'manuscript/第七卷-断星远征/第477章-留下来的三个人不是一张落选名单.md'];
if (chaptersFourHundredSeventyFiveToFourHundredSeventySeven.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第475～477章'));
  if (current && current.status !== 'completed') await appendTask({ ...current, status: 'completed', agentWork: '七人资格卡加入个人选择与舰队基线，长期4席须覆盖公共设备、变重结构、现场接触、撤退承接；医疗/战斗/记录需交接。四名单盲审分别暴露结构撤退、现场撤退、设备事件缺口；医官3例盲重放、舰队江退出护卫、巫岚延迟复议通过，选江砚/石小满/纪潮生/阿轨。贺川为第一现场轮换并保留救援优先异议，沈青弦建医疗镜像，巫岚维护版本/异议并近轨返回；席位有补给点复审，不保证无安全交换仍轮换。', links: [...new Set([...current.links, 'research/七人四席出航名单与留守轮换.md', 'decisions/资格通过不自动获得稀缺舱位.md', ...chaptersFourHundredSeventyFiveToFourHundredSeventySeven])], updatedAt: now() }, 'navigator');
  if (!taskTitles.has('整理七人四席出航名单与留守轮换')) {
    const timestamp = now();
    await appendTask({ id: uid('task'), title: '整理七人四席出航名单与留守轮换', description: '记录舰队基线/四缺口、四候选名单、三项交接、江贺对照、长期/留守/轮换终态和目标异议。', level: 'session', status: 'completed', kind: 'planning', assignee: 'navigator', source: 'navigator', priority: 'high', whyNow: '测试合格不制造氧水辐射逃生容量；按境界/战功或简单岗位连续会漏掉真实缺口并把留守写成惩罚。', known: ['7人全通过', '4公共缺口', '3项交接通过', '江石纪阿长期'], missingDecisions: [], aiPreAnalysis: '把舰队既有基线扣除后盲比组合，再核可移交能力与个人选择。', authorDecision: '留守/拒绝不降级；轮换按任务变化且不承诺无安全交换上船。', agentWork: '已生成research/七人四席出航名单与留守轮换.md和decisions/资格通过不自动获得稀缺舱位.md。', completionCriteria: ['七人终态/资源完整', '四席缺口可解释', '救援/取证分歧保留'], links: ['research/七人四席出航名单与留守轮换.md', 'decisions/资格通过不自动获得稀缺舱位.md', chaptersFourHundredSeventyFiveToFourHundredSeventySeven[2]], dependencies: [], createdAt: timestamp, updatedAt: timestamp }, 'agent');
  }
  if (!taskTitles.has('续写第478～480章：四个长期乘员每人同时收到一份军令和一份公共维护职责')) {
    await appendTask({ id: uid('task'), title: '续写第478～480章：四个长期乘员每人同时收到一份军令和一份公共维护职责', description: '处理同一中继预检的军令“战备先行”与公共职责“来源/撤退先行”，拆目标选择、事实判断、动作权限，用延迟情景验证军令不越硬门/公共协议不夺资源指挥并建立冲突账。', level: 'chapter', status: 'now', kind: 'planning', assignee: 'navigator', source: 'navigator', priority: 'critical', whyNow: '四人上船后同时属于舰队任务与公共维护承诺；若以军令或公共协议一方全覆盖，都会在长延迟下制造无责任的双重服从。', known: ['军令战备优先', '公共职责来源/撤退优先', '贺川救援异议保留', '母星意见将迟到'], missingDecisions: ['哪类冲突能本地决议？', '资源目标由谁选？', '母星公共协议何时只作建议？'], aiPreAnalysis: '第478章拆两份职责；第479章延迟冲突演练；第480章本地冲突账/优先级/复议。', authorDecision: '军令选目标不改事实，公共协议守证据/撤退不夺舰队资源；冲突显式留账。', agentWork: '', completionCriteria: ['双职责边界完整', '延迟情景可执行', '本地决议与母星复议分离'], links: [chaptersFourHundredSeventyFiveToFourHundredSeventySeven[2], 'research/七人四席出航名单与留守轮换.md', 'planning/第七卷章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() }, 'navigator');
  }
  const facts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '资格通过与长期舱位分离', statement: '通过出航测试仅获候选资格；长期舱按舰队基线后的任务缺口、可替代、真实交接、母星留守和个人选择配置，不按境界/战功/排名，留守不降级。', status: 'author-confirmed', evidence: [{ filePath: chaptersFourHundredSeventyFiveToFourHundredSeventySeven[0], quote: '四席不是选出四个最好的人。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '七人四席首批长期航行名单', statement: '长期江砚/石小满/纪潮生/阿轨，覆盖现场/设备/结构/撤退；贺川第一现场轮换，沈青弦母星医疗镜像，巫岚版本异议留守并近轨返回。', status: 'text-explicit', evidence: [{ filePath: chaptersFourHundredSeventyFiveToFourHundredSeventySeven[2], quote: '长期舱位不是战功。' }], updatedAt: now() },
    { id: uid('fact'), category: 'decision', subject: '四席交接与轮换边界', statement: '舰上医官盲重放3医疗例、舰队完成江退出护卫、巫岚延迟复议均通过；补给点前复审，之后无安全交换不假装轮换一定发生。', status: 'author-confirmed', evidence: [{ filePath: chaptersFourHundredSeventyFiveToFourHundredSeventySeven[1], quote: '三项交接通过。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '长期乘员军令与公共职责冲突', statement: '江/石/纪/阿同时收到舰队军令与母星公共维护职责；同一预检出现战备先行对来源/撤退先行，下一步拆目标/事实/动作并建延迟本地冲突账。', status: 'text-explicit', evidence: [{ filePath: chaptersFourHundredSeventyFiveToFourHundredSeventySeven[2], quote: '两份对同一设备第一次给出了不同的优先级。' }], updatedAt: now() }
  ];
  for (const fact of facts) await appendFact(fact);
  await setPosition({ filePath: chaptersFourHundredSeventyFiveToFourHundredSeventySeven[2], stage: '第七卷军令与公共维护双职责冲突阶段', focus: '续写第478～480章：四个长期乘员每人同时收到一份军令和一份公共维护职责' });
}

const chaptersFourHundredSeventyEightToFourHundredEighty = ['manuscript/第七卷-断星远征/第478章-军令可以选择先看什么不能命令旧握手变成当前.md', 'manuscript/第七卷-断星远征/第479章-公共协议不能因为证据重要就独占整面阵列.md', 'manuscript/第七卷-断星远征/第480章-母星迟到的正确意见不能倒写舰上当时的选择.md'];
if (chaptersFourHundredSeventyEightToFourHundredEighty.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第478～480章'));
  if (current && current.status !== 'completed') await appendTask({ ...current, status: 'completed', agentWork: '把军令战备优先与公共来源/撤退职责拆为目标/事实/动作：指挥选阵列/推进剂/时间和放弃，不能令417日旧握手变当前；公共守来源/失败/隐私/硬门，不独占资源。三场预检：18分钟用12分威胁图+6分版本询问；单阵列转右排除两散热罩并重建左时间链；模拟求救因47秒导航盲区先建第二定位线，7分钟后未再现。建7字段冲突账；母星9小时分时方案在舰上16.72秒周期仍缺11秒，转未来候选。握手尾部发现7秒像呼吸压力回声。', links: [...new Set([...current.links, 'research/舰队军令与公共维护双职责冲突账.md', 'decisions/军令选目标公共协议守证据和硬门.md', ...chaptersFourHundredSeventyEightToFourHundredEighty])], updatedAt: now() }, 'navigator');
  if (!taskTitles.has('整理舰队军令与公共维护双职责冲突账')) {
    const timestamp = now();
    await appendTask({ id: uid('task'), title: '整理舰队军令与公共维护双职责冲突账', description: '记录目标/事实/动作三层、三场预检、7字段冲突账、母星迟到候选与7秒压力尾段。', level: 'session', status: 'completed', kind: 'planning', assignee: 'navigator', source: 'navigator', priority: 'high', whyNow: '文件等级覆盖会让军令制造事实或公共协议夺资源；长延迟下后来正确方案还可能倒写现场可用信息。', known: ['三层职责', '单阵列资源冲突', '回程硬门', '7秒压力尾段'], missingDecisions: [], aiPreAnalysis: '把事实/硬门/纯资源冲突分流，按本地单调时钟记录重开条件。', authorDecision: '军令选目标，公共守证据硬门；迟到正确意见只转未来候选。', agentWork: '已生成research/舰队军令与公共维护双职责冲突账.md和decisions/军令选目标公共协议守证据和硬门.md。', completionCriteria: ['双职责不互吞', '三场资源/硬门可执行', '迟到意见不倒写'], links: ['research/舰队军令与公共维护双职责冲突账.md', 'decisions/军令选目标公共协议守证据和硬门.md', chaptersFourHundredSeventyEightToFourHundredEighty[2]], dependencies: [], createdAt: timestamp, updatedAt: timestamp }, 'agent');
  }
  if (!taskTitles.has('续写第481～483章：四百一十七日前的维修握手后面多出七秒像呼吸的压力回声')) {
    await appendTask({ id: uid('task'), title: '续写第481～483章：四百一十七日前的维修握手后面多出七秒像呼吸的压力回声', description: '拆7秒回声时间/频谱/设备相位，用泵阀、星兽囊腔、人类呼吸三类对照保留共同解释；按有限证据决定航路/监听资源/救援优先级并完成舰队角色阶段。', level: 'chapter', status: 'now', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'critical', whyNow: '尾段因协议外低幅曾被压成机械余振；形似呼吸会放大贺川救援异议，但当前频段同时支持机械和生物，不能直接命名求救。', known: ['7秒低幅', '3短1长2短', '频段三类重叠', '417日历史窗口'], missingDecisions: ['尾段与握手/泵相位关系？', '三类对照区分到何程度？', '是否改变航路或只加监听？'], aiPreAnalysis: '第481章来源/相位；第482章三类盲对照；第483章资源决议/角色结案。', authorDecision: '不因像呼吸写人类求救，也不因历史久拒绝有限救援监听；航路改变需可解释门槛。', agentWork: '', completionCriteria: ['7秒来源可回读', '三类解释不强并', '航路/监听决议有代价边界'], links: [chaptersFourHundredSeventyEightToFourHundredEighty[2], 'research/舰队军令与公共维护双职责冲突账.md', 'planning/第七卷章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() }, 'navigator');
  }
  const facts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '舰队军令与公共维护职责三层分离', statement: '指挥官在目标层选资源/时间/放弃，专业证据在事实层并列，操作在动作层守硬门；军令不改旧数据/身体结构，公共协议不独占阵列/推进剂。', status: 'author-confirmed', evidence: [{ filePath: chaptersFourHundredSeventyEightToFourHundredEighty[0], quote: '军令可以选择先看什么不能命令旧握手变成当前。' }], updatedAt: now() },
    { id: uid('fact'), category: 'decision', subject: '双职责7字段本地冲突账', statement: '记录共同/本轮目标、当时事实、硬门、资源/动作、本地决定/代价、异议、新证据重开；事实近证并列、不可逆门先停、纯资源由指挥选择并公开放弃。', status: 'author-confirmed', evidence: [{ filePath: chaptersFourHundredSeventyEightToFourHundredEighty[2], quote: '双职责冲突账在三场预检后形成七个字段。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '军令公共职责三场延迟预检', statement: '18分钟威胁/版本并行；单阵列转右排除散热罩且重建左时间链；模拟求救因47秒导航盲区先建第二线，7分钟后未复现。母星9小时方案受16.72秒周期留11秒缺口。', status: 'text-explicit', evidence: [{ filePath: chaptersFourHundredSeventyEightToFourHundredEighty[2], quote: '第一场战备图与来源核验并行' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '417日握手尾部7秒压力回声', statement: '旧握手协议外尾段7秒低幅呈3短/1长/2短，频率落在人类呼吸、泵阀回弹、星兽囊腔共同区间；下一步做相位/三类盲对照，只称像呼吸不称求救。', status: 'text-explicit', evidence: [{ filePath: chaptersFourHundredSeventyEightToFourHundredEighty[2], quote: '它像呼吸。还不能叫求救。' }], updatedAt: now() }
  ];
  for (const fact of facts) await appendFact(fact);
  await setPosition({ filePath: chaptersFourHundredSeventyEightToFourHundredEighty[2], stage: '第七卷417日握手7秒压力回声有限救援判断阶段', focus: '续写第481～483章：四百一十七日前的维修握手后面多出七秒像呼吸的压力回声' });
}

const chaptersFourHundredEightyOneToFourHundredEightyThree = ['manuscript/第七卷-断星远征/第481章-七秒尾声不在维修协议里也不一定来自人.md', 'manuscript/第七卷-断星远征/第482章-六十八段对照没有把七秒尾声分进唯一一类.md', 'manuscript/第七卷-断星远征/第483章-没有确认求救仍然可以准备一条救援路径.md'];
if (chaptersFourHundredEightyOneToFourHundredEightyThree.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第481～483章'));
  if (current && current.status !== 'completed') await appendTask({ ...current, status: 'completed', agentWork: '恢复握手正文后7.02秒压力原序列：主结束+0.83秒、同12°扇区，高时间连续/同源中；人耳随三种渲染在呼吸/阀门间变化，旧压缩折叠无机械分类权。24泵+20人+24星兽囊共68段同传感前处理盲审，前三短支持泵谐振、长段支持柔性/有机腔；泵+柔囊即可复现形状。最小结论泵阀异常高、柔性/有机共同中，具体未知。舰队不加速，增6%监听、无物种气密、人物/柔腔双接口和生命分支；两独立生命证据或可重复人类回应重开救援。第37日收到当前L6回执偏旧坐标11°。', links: [...new Set([...current.links, 'research/417日握手七秒压力回声三类对照.md', 'decisions/像呼吸的历史信号只升级可逆救援准备.md', ...chaptersFourHundredEightyOneToFourHundredEightyThree])], updatedAt: now() }, 'researcher');
  if (!taskTitles.has('整理417日握手七秒压力回声三类对照')) {
    const timestamp = now();
    await appendTask({ id: uid('task'), title: '整理417日握手七秒压力回声三类对照', description: '记录原始/渲染/压缩边界、68段泵人星兽盲审、混合复现、可逆救援准备、重开门与11°当前回执。', level: 'session', status: 'completed', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'high', whyNow: '人耳形似与多数票会把压力翻成人类求救；历史窗口又不能因不唯一降成噪声，需拆来源/意图并用多解释受益的准备。', known: ['7.02秒同包', '68段对照', '泵高/柔腔中', '不加速可逆准备'], missingDecisions: [], aiPreAnalysis: '先排渲染/压缩标签，再同传感对照与混合反例，最后按可逆成本决策。', authorDecision: '不命名人类或星兽；明确生命证据重开救援，气密/回程仍保留。', agentWork: '已生成research/417日握手七秒压力回声三类对照.md和decisions/像呼吸的历史信号只升级可逆救援准备.md。', completionCriteria: ['来源/意图分离', '对照能力边界公开', '救援准备与资源成本完整'], links: ['research/417日握手七秒压力回声三类对照.md', 'decisions/像呼吸的历史信号只升级可逆救援准备.md', chaptersFourHundredEightyOneToFourHundredEightyThree[2]], dependencies: [], createdAt: timestamp, updatedAt: timestamp }, 'agent');
  }
  if (!taskTitles.has('续写第484～486章：断星航路第一声当前回执比四百日前的坐标偏了十一度')) {
    await appendTask({ id: uid('task'), title: '续写第484～486章：断星航路第一声当前回执比四百日前的坐标偏了十一度', description: '核当前回执时间/方位/设备族，拆星历/阵列/传播与中继真实移动；以双舰基线和背景星校准确认11°，估候选轨迹并调整搜索扇区/燃料/回程，保留旧中继/移动设备/转发三候选。', level: 'chapter', status: 'now', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'critical', whyNow: '首次当前回执仍为L6却偏旧坐标11°；若直接修航会把阵列或传播误差当移动主体，若忽略则可能错过当前目标。', known: ['第37日当前回执', '设备族L6', '偏旧坐标11°', '417日位置历史'], missingDecisions: ['时钟/背景星是否可信？', '双舰视差支持多远/多快？', '航路调整代价与候选范围？'], aiPreAnalysis: '第484章单舰校验；第485章双舰/背景星；第486章搜索扇区与三候选决议。', authorDecision: '不锁D-5/中继本体移动；位置候选影响航路但不覆盖返航余量。', agentWork: '', completionCriteria: ['11°误差来源可限', '候选轨迹不单点', '航路/燃料/回程终态完整'], links: [chaptersFourHundredEightyOneToFourHundredEightyThree[2], 'research/417日握手七秒压力回声三类对照.md', 'planning/第七卷章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() }, 'navigator');
  }
  const facts: StoryFact[] = [
    { id: uid('fact'), category: 'knowledge', subject: '417日握手七秒压力尾段最小解释', statement: '尾段7.02秒在握手后0.83秒，同包/同12°扇区；68段同传感对照支持泵阀异常高、柔性或有机腔共同中，具体人类/星兽/维修囊与意图未知，非已知求救码。', status: 'author-confirmed', evidence: [{ filePath: chaptersFourHundredEightyOneToFourHundredEightyThree[1], quote: '七秒没有被分进唯一一类。' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '历史生命候选升级可逆救援准备', statement: '历史/低幅/三类重叠信号不加速烧返航，只增6%监听、无物种气密、人物/柔腔双接口和生命分支；中断保留未观测窗，准备公开货位/耗材/时间成本。', status: 'author-confirmed', evidence: [{ filePath: chaptersFourHundredEightyOneToFourHundredEightyThree[2], quote: '没有确认求救仍然可以准备一条救援路径。' }], updatedAt: now() },
    { id: uid('fact'), category: 'decision', subject: '断星当前人类生命重开门', statement: '两种独立生命证据或一种直接可重复人类回应即重开救援优先，不需姓名/阵营/D-5；设备气密能源接口服务救援，阿轨保留可公开调整的回程代价门。', status: 'author-confirmed', evidence: [{ filePath: chaptersFourHundredEightyOneToFourHundredEightyThree[2], quote: '两种独立生命证据，或一种直接可重复的人类回应' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '断星当前L6回执偏旧坐标11度', statement: '深航第37日收到第一声当前L6设备族回执，方位比417日前旧坐标偏11°；下一步用时钟/背景星/双舰基线拆阵列传播误差与旧中继/移动设备/转发。', status: 'text-explicit', evidence: [{ filePath: chaptersFourHundredEightyOneToFourHundredEightyThree[2], quote: '方位却比四百一十七日前的坐标偏了十一度。' }], updatedAt: now() }
  ];
  for (const fact of facts) await appendFact(fact);
  await setPosition({ filePath: chaptersFourHundredEightyOneToFourHundredEightyThree[2], stage: '第七卷当前L6回执11度偏移与断星航路阶段', focus: '续写第484～486章：断星航路第一声当前回执比四百日前的坐标偏了十一度' });
}

const chaptersFourHundredEightyFourToFourHundredEightySix = ['manuscript/第七卷-断星远征/第484章-回应了新挑战的设备不一定就是旧中继.md', 'manuscript/第七卷-断星远征/第485章-两条视线相交在旧坐标旁十九万公里.md', 'manuscript/第七卷-断星远征/第486章-舰队只向十一度偏移走了三点二度.md'];
if (chaptersFourHundredEightyFourToFourHundredEightySix.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第484～486章'));
  if (current && current.status !== 'completed') await appendTask({ ...current, status: 'completed', agentWork: '回执正确回答6小时前17组新挑战，建立当前兼容设备但不授身份/资产/位置。单舰核时钟<0.4ms、12背景星轴残0.08°、旋转修0.16°、旁瓣反例、三频10.8/11.1/11.0°，误差<0.5°。3200km双舰独立挑战测旧坐标偏10.76/11.04°、视差0.18°，距离94～116万km、横偏约19万；旧主体漂移/移动平台/主动转发并列。舰队不守旧点或直转11°，转3.2°交叠走廊，+21小时/1.8%燃料，双标记器与两处监听，返航绿；新回执方位同壳但延迟3倍。', links: [...new Set([...current.links, 'research/当前L6回执11度偏移双舰定位.md', 'decisions/当前回执证明当前设备不证明旧中继移动.md', ...chaptersFourHundredEightyFourToFourHundredEightySix])], updatedAt: now() }, 'researcher');
  if (!taskTitles.has('整理当前L6回执11度偏移双舰定位')) {
    const timestamp = now();
    await appendTask({ id: uid('task'), title: '整理当前L6回执11度偏移双舰定位', description: '记录新挑战当前性、单舰误差、双舰视差/位置壳、三候选、3.2度交叠航路与三倍延迟新异常。', level: 'session', status: 'completed', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'high', whyNow: '当前挑战回应只证兼容设备；若把11度直接写旧中继移动/D-5位置，会把信号源、资产主体和人物连续合并。', known: ['单舰误差<0.5°', '双舰0.18°视差', '横偏19万km', '3.2°交叠走廊'], missingDecisions: [], aiPreAnalysis: '先排舰队误差，再双舰定位响应壳，按三主体候选选择可逆航路。', authorDecision: '不锁主体/人物；两处监听且返航绿，标记器失联不追逐。', agentWork: '已生成research/当前L6回执11度偏移双舰定位.md和decisions/当前回执证明当前设备不证明旧中继移动.md。', completionCriteria: ['当前性与身份分离', '位置范围非单点', '航路资源/回程完整'], links: ['research/当前L6回执11度偏移双舰定位.md', 'decisions/当前回执证明当前设备不证明旧中继移动.md', chaptersFourHundredEightyFourToFourHundredEightySix[2]], dependencies: [], createdAt: timestamp, updatedAt: timestamp }, 'agent');
  }
  if (!taskTitles.has('续写第487～489章：第二声当前回执从同一扇区到达却用了第一声三倍时间')) {
    await appendTask({ id: uid('task'), title: '续写第487～489章：第二声当前回执从同一扇区到达却用了第一声三倍时间', description: '拆两次挑战生成/发送/到达/响应全时序，排舰队链路统计错误；以不同复杂度挑战和双频短问区分计算、低功耗窗、内部转发、多路径，将延迟写设备状态而非人物犹豫并更新候选/监听。', level: 'chapter', status: 'now', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'critical', whyNow: '方位壳稳定而响应从7小时增至21小时；延迟可能暴露转发/功耗/状态，也最容易被拟人化成D-5在犹豫。', known: ['两次同方位壳', '新挑战均有效', '第二次延迟约3倍', '内部链路/低功耗候选'], missingDecisions: ['舰队发收时钟是否同口径？', '延迟随挑战复杂度还是固定窗？', '多路径是否改变到达簇？'], aiPreAnalysis: '第487章全时序；第488章复杂度×频段短问；第489章状态解释/航路更新。', authorDecision: '不把响应慢写人物意图；只用可复现延迟结构修改转发/功耗候选。', agentWork: '', completionCriteria: ['三倍时序闭合', '候选可区分/反例', '监听节奏与航路代价明确'], links: [chaptersFourHundredEightyFourToFourHundredEightySix[2], 'research/当前L6回执11度偏移双舰定位.md', 'planning/第七卷章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() }, 'navigator');
  }
  const facts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '当前挑战回应与主体身份分离', statement: '新随机挑战正确回应只证当前兼容设备；临时会话/空位置不授合法所有权、旧资产连续、主体或D-5身份。定位的是响应源/转发处，不是人物。', status: 'author-confirmed', evidence: [{ filePath: chaptersFourHundredEightyFourToFourHundredEightySix[0], quote: '回应了新挑战的设备不一定就是旧中继。' }], updatedAt: now() },
    { id: uid('fact'), category: 'knowledge', subject: '断星当前L6响应源双舰位置壳', statement: '3200km基线下主/副偏11.04/10.76°、视差0.18°，距离94～116万km、与旧距离相近而横偏约19万；9小时无可分移动，旧漂移/移动平台/转发并列。', status: 'author-confirmed', evidence: [{ filePath: chaptersFourHundredEightyFourToFourHundredEightySix[1], quote: '两条视线相交在旧坐标旁十九万公里。' }], updatedAt: now() },
    { id: uid('fact'), category: 'decision', subject: '断星11度偏移交叠航路', statement: '舰队只转3.2°进入旧点/当前壳交叠走廊，增加21小时/1.8%燃料，返航绿；两无人物标记器分探，两处保监听，背景图6→8小时但威胁可抢占。', status: 'author-confirmed', evidence: [{ filePath: chaptersFourHundredEightyFourToFourHundredEightySix[2], quote: '舰队只向十一度偏移走了三点二度。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '同方位当前回执三倍延迟', statement: '转向后新挑战回执仍落偏移位置壳，到达时间约前次3倍；下一步拆时钟/计算/低功耗/内部转发/多路径，不把延迟拟人化为D-5犹豫。', status: 'text-explicit', evidence: [{ filePath: chaptersFourHundredEightyFourToFourHundredEightySix[2], quote: '到达时间却是上一次的三倍。' }], updatedAt: now() }
  ];
  for (const fact of facts) await appendFact(fact);
  await setPosition({ filePath: chaptersFourHundredEightyFourToFourHundredEightySix[2], stage: '第七卷当前回执三倍延迟与转发状态阶段', focus: '续写第487～489章：第二声当前回执从同一扇区到达却用了第一声三倍时间' });
}

const chaptersFourHundredEightySevenToFourHundredEightyNine = ['manuscript/第七卷-断星远征/第487章-三倍延迟先排除了舰队自己少算十四小时.md', 'manuscript/第七卷-断星远征/第488章-简单问题和复杂问题在同一秒返回.md', 'manuscript/第七卷-断星远征/第489章-七小时一层是设备状态不是人物犹豫.md'];
if (chaptersFourHundredEightySevenToFourHundredEightyNine.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第487～489章'));
  if (current && current.status !== 'completed') await appendTask({ ...current, status: 'completed', agentWork: '统一本地时钟得首回6h55/次回21h，双舰旁听、双时钟发送、单主簇弱尾、百万公里传播和同复杂度排舰队漏算/被动多路径/计算十四小时。六短问：简单1位与17组在13h58同秒回；双频仅差1.2秒；7h预测边界前后11分发送分别13h59/20h59。中性字段重译为重新封装：首1层、21h 3层、同秒2层、边界后3层，与约7h倍数同向。建单机多队列/多设备链/移动会合三模型和边界±20分监听；第三回两层时钟日快1.7/日慢0.9秒。', links: [...new Set([...current.links, 'research/同方位L6回执三倍延迟与七小时量化.md', 'decisions/响应延迟是设备链状态不是人物意图.md', ...chaptersFourHundredEightySevenToFourHundredEightyNine])], updatedAt: now() }, 'researcher');
  if (!taskTitles.has('整理同方位L6回执三倍延迟与七小时量化')) {
    const timestamp = now();
    await appendTask({ id: uid('task'), title: '整理同方位L6回执三倍延迟与七小时量化', description: '记录全时序、六短问、重封装字段重译、约7小时调度、三拓扑、窄窗监听与两层反向时钟漂移。', level: 'session', status: 'completed', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'high', whyNow: '响应快慢最易被补成人物犹豫/试探；只有复杂度、频段、发送相位和封装结构可更新设备链。', known: ['6h55/21h', '复杂同秒', '边界差7h', '两层反向漂移'], missingDecisions: [], aiPreAnalysis: '统一时钟排舰内/传播，再用六问拆计算/频段/调度并追封装时钟。', authorDecision: '不画三个人/三站；错过窗不写沉默，航路和历史生命候选不搬家。', agentWork: '已生成research/同方位L6回执三倍延迟与七小时量化.md和decisions/响应延迟是设备链状态不是人物意图.md。', completionCriteria: ['三倍时序闭合', '7h量化有预登记', '三模型/监听边界完整'], links: ['research/同方位L6回执三倍延迟与七小时量化.md', 'decisions/响应延迟是设备链状态不是人物意图.md', chaptersFourHundredEightySevenToFourHundredEightyNine[2]], dependencies: [], createdAt: timestamp, updatedAt: timestamp }, 'agent');
  }
  if (!taskTitles.has('续写第490～492章：第三份回执里出现两个不同方向漂移的本地时钟')) {
    await appendTask({ id: uid('task'), title: '续写第490～492章：第三份回执里出现两个不同方向漂移的本地时钟', description: '验证两层时钟日快1.7/日慢0.9秒是否来自温度或同机分频；用同步短问、噪声底、能源温度与方位子区拆层间时钟/位置，形成最小转发拓扑并决定链尾/旧点接近顺序。', level: 'chapter', status: 'now', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'critical', whyNow: '相反漂移首次支持层间独立振荡器，但同一设备也可能有分频/温控域；直接数成两座设备会重犯字段到主体合并。', known: ['第三回2层', '层1日快1.7秒', '层2日慢0.9秒', '约7h重封装'], missingDecisions: ['漂移跨窗是否稳定？', '噪声/温度是否独立？', '方位能否拆层？'], aiPreAnalysis: '第490章时钟/温度反例；第491章同步短问/噪声/方位；第492章最小拓扑/航路决议。', authorDecision: '独立时钟不自动等于独立设备；仅以多源一致证据建立最小节点数。', agentWork: '', completionCriteria: ['两漂移可复现', '同机解释有对照', '拓扑与接近资源决议完整'], links: [chaptersFourHundredEightySevenToFourHundredEightyNine[2], 'research/同方位L6回执三倍延迟与七小时量化.md', 'planning/第七卷章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() }, 'navigator');
  }
  const facts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '响应延迟不得拟人化', statement: '挑战延迟须拆舰内生成/队列/发射/传播/远端等待/预热回发；只有复杂度/频段/相位/封装可更新设备状态，不用快慢补D-5犹豫、试探、引诱。', status: 'author-confirmed', evidence: [{ filePath: chaptersFourHundredEightySevenToFourHundredEightyNine[2], quote: '七小时一层是设备状态不是人物犹豫。' }], updatedAt: now() },
    { id: uid('fact'), category: 'knowledge', subject: '当前L6约7小时低功耗重封装', statement: '简单/复杂同秒、双频差1.2秒、边界前后响应差约7h；重封装1～3层与6h55/13h58/21h同向，支持低功耗存储转发，纯被动镜面/计算困难下降。', status: 'author-confirmed', evidence: [{ filePath: chaptersFourHundredEightySevenToFourHundredEightyNine[1], quote: '简单问题和复杂问题在同一秒返回。' }], updatedAt: now() },
    { id: uid('fact'), category: 'decision', subject: '断星7小时边界监听', statement: '先影子2周期，再用预测边界±20分高增益/余时低缓存；漂移>30分恢复宽窗，挑战每2窗一次，拒绝即停主动问但保被动安全监听。', status: 'author-confirmed', evidence: [{ filePath: chaptersFourHundredEightySevenToFourHundredEightyNine[2], quote: '监听改成以七小时边界为中心前后各二十分钟高增益' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '两重封装层反向本地时钟漂移', statement: '第三回仍2层，层1本地时钟每天快1.7秒、层2每天慢0.9秒；下一步排温度/同机分频并用噪声/方位等多源建立最小节点，不直接数两设备。', status: 'text-explicit', evidence: [{ filePath: chaptersFourHundredEightySevenToFourHundredEightyNine[2], quote: '两个不同方向漂移的本地时钟。' }], updatedAt: now() }
  ];
  for (const fact of facts) await appendFact(fact);
  await setPosition({ filePath: chaptersFourHundredEightySevenToFourHundredEightyNine[2], stage: '第七卷两层时钟与最小转发拓扑阶段', focus: '续写第490～492章：第三份回执里出现两个不同方向漂移的本地时钟' });
}

const chaptersFourHundredNinetyToFourHundredNinetyTwo = ['manuscript/第七卷-断星远征/第490章-两个反向时钟也可以装在同一只外壳里.md', 'manuscript/第七卷-断星远征/第491章-两层噪声底在同一次断电后只重置了一层.md', 'manuscript/第七卷-断星远征/第492章-主舰去链尾副舰去旧坐标不是把舰队平均分开.md'];
if (chaptersFourHundredNinetyToFourHundredNinetyTwo.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第490～492章'));
  if (current && current.status !== 'completed') await appendTask({ ...current, status: 'completed', agentWork: '八台同代M6中3台给同壳双钟反向漂移反例，不能由+1.7/-0.9日漂直接数两设备。目标6窗甲温度相关且可独立冷启/噪声重置，乙时钟噪声序号连续；同步短问显示甲乙底噪不同、乙可见甲未转交的副舰拒绝摘要、粗子区不同。最小拓扑为2独立功能域1汇流：甲约7h重封/位置未知，乙独立钟和旁路/最终发射偏移壳，物理外壳1～多。主舰去乙链尾，副舰卸采样架后回程绿去旧点外层生命/气密；互救>6h、每7h共同窗及错3窗/回程红/碎片图12h撤退门。', links: [...new Set([...current.links, 'research/两层反向时钟与最小转发拓扑.md', 'decisions/最小拓扑只确认独立功能域不直接数设备.md', ...chaptersFourHundredNinetyToFourHundredNinetyTwo])], updatedAt: now() }, 'researcher');
  if (!taskTitles.has('整理两层反向时钟与最小转发拓扑')) {
    const timestamp = now();
    await appendTask({ id: uid('task'), title: '整理两层反向时钟与最小转发拓扑', description: '记录同机反例、层内温度/冷启、同步短问噪声/旁路、2域1汇流最小图与主副舰分航撤退门。', level: 'session', status: 'completed', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'high', whyNow: '功能时钟与物理外壳若直接等同，会提前画设备/位置；接近链尾也可能只见乙域，不能覆盖甲域和旧中继任务。', known: ['同壳双钟反例', '甲单层冷启', '乙副舰旁路', '2域1汇流'], missingDecisions: [], aiPreAnalysis: '跨时钟/温度/噪声/旁路建立功能独立，物理边界保持虚线，再按两处时间窗分航。', authorDecision: '不数设备/D-5；每舰独算回程，副舰只读包不降门槛。', agentWork: '已生成research/两层反向时钟与最小转发拓扑.md和decisions/最小拓扑只确认独立功能域不直接数设备.md。', completionCriteria: ['独立域多源成立', '物理未知保留', '分航权限/撤退完整'], links: ['research/两层反向时钟与最小转发拓扑.md', 'decisions/最小拓扑只确认独立功能域不直接数设备.md', chaptersFourHundredNinetyToFourHundredNinetyTwo[2]], dependencies: [], createdAt: timestamp, updatedAt: timestamp }, 'agent');
  }
  if (!taskTitles.has('续写第493～495章：主舰去当前链尾副舰去旧中继第一次分航把救援和战备拆成两条路')) {
    await appendTask({ id: uid('task'), title: '续写第493～495章：主舰去当前链尾副舰去旧中继第一次分航把救援和战备拆成两条路', description: '为主舰乙链尾战备/设备任务与副舰旧点生命/气密任务分别开卡，不互借优先级与证据；处理母星延长救援建议和舰队回归军令的共同窗冲突，让不可同时满足终态进入目标账而非背叛。', level: 'chapter', status: 'now', kind: 'planning', assignee: 'navigator', source: 'navigator', priority: 'critical', whyNow: '分航后两舰互救超过6小时，母星和军令给出相反建议；若用同盟忠诚覆盖本地回程/生命/威胁事实，会迫使一舰失去终态。', known: ['主舰去乙链尾', '副舰去旧点', '每7h共同窗', '母星延长/军令回归冲突'], missingDecisions: ['两舰首批本地事实？', '哪项建议在何条件适用？', '分歧何时触发撤回/继续？'], aiPreAnalysis: '第493章双任务卡；第494章共同窗冲突；第495章本地终态/分歧正式化。', authorDecision: '两舰不互借成功，建议按有效窗；目标分歧不写背叛，成本/错失分别留账。', agentWork: '', completionCriteria: ['双任务证据/权限分离', '共同窗决议可执行', '分歧与两舰终态完整'], links: [chaptersFourHundredNinetyToFourHundredNinetyTwo[2], 'research/两层反向时钟与最小转发拓扑.md', 'planning/第七卷章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() }, 'navigator');
  }
  const facts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '独立功能域与物理设备数分离', statement: '反向时钟、不同温度/噪声、单层冷启和旁路可建立功能域；同壳可多域、多壳可汇流。无物理方位/结构身份时，域数不写设备/外壳数。', status: 'author-confirmed', evidence: [{ filePath: chaptersFourHundredNinetyToFourHundredNinetyTwo[0], quote: '两个反向时钟也可以装在同一只外壳里。' }], updatedAt: now() },
    { id: uid('fact'), category: 'knowledge', subject: '当前L6最小2域1汇流拓扑', statement: '甲域受温/可冷启/约7h重封且位置未知；乙域独立钟噪、可见副舰旁路、另一7h窗并从偏移壳最终发射。物理设备1～多，粗子区无姿态映射。', status: 'author-confirmed', evidence: [{ filePath: chaptersFourHundredNinetyToFourHundredNinetyTwo[1], quote: '最小功能拓扑变成两域一汇流。' }], updatedAt: now() },
    { id: uid('fact'), category: 'decision', subject: '断星主副舰链尾旧点分航', statement: '主舰携公共4人去乙链尾；副舰携医官/气密/双接口/只读包去旧点，卸采样架保回程绿。互救>6h、约7h共同窗；错3窗/回程红不可修/碎片图失效>12h各撤交叠点。', status: 'author-confirmed', evidence: [{ filePath: chaptersFourHundredNinetyToFourHundredNinetyTwo[2], quote: '主舰去链尾副舰去旧坐标不是把舰队平均分开。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '分航后母星救援延长与舰队回归冲突', statement: '首共同窗母星建议生命候选则副舰延长，舰队军令要求主舰确认链尾威胁后副舰立即回归；下一步按两舰本地事实/回程/有效窗决议，分歧不写背叛。', status: 'text-explicit', evidence: [{ filePath: chaptersFourHundredNinetyToFourHundredNinetyTwo[2], quote: '两条建议无法同时保证。' }], updatedAt: now() }
  ];
  for (const fact of facts) await appendFact(fact);
  await setPosition({ filePath: chaptersFourHundredNinetyToFourHundredNinetyTwo[2], stage: '第七卷主副舰分航与旧同盟目标分裂阶段', focus: '续写第493～495章：主舰去当前链尾副舰去旧中继第一次分航把救援和战备拆成两条路' });
}

const chaptersFourHundredNinetyThreeToFourHundredNinetyFive = ['manuscript/第七卷-断星远征/第493章-两艘船的任务卡没有共享同一个通过条件.md', 'manuscript/第七卷-断星远征/第494章-副舰延长七小时让主舰失去了一次近接窗口.md', 'manuscript/第七卷-断星远征/第495章-目标分歧不是背叛但会让双方真的失去东西.md'];
if (chaptersFourHundredNinetyThreeToFourHundredNinetyFive.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第493～495章'));
  if (current && current.status !== 'completed') await appendTask({ ...current, status: 'completed', agentWork: '主舰任务卡在320km见27m乙链尾、7h能源与无可见武器，深层未知；副舰旧点见71%断坞与温高4.3°C、含水/CO2压力袋，生命未知，两任务不互借。第二取样压力/CO2同相重开生命评审，副舰本地延长7h至回程绿下沿，主舰因失双角/互救取消320→180km近接。副舰低功率回应后压力由3短1长2短变2短1长2短并重复2轮，建立当前可响应系统非人类确认；主舰见乙域3倍能源朝旧点窄束转发，无武器释放。两边保成本/异议，目标分歧正式入账；唯一高功率中继成为新冲突。', links: [...new Set([...current.links, 'research/主副舰分航首窗救援与战备冲突.md', 'decisions/分航后各舰按本地事实执行共同异议入账.md', ...chaptersFourHundredNinetyThreeToFourHundredNinetyFive])], updatedAt: now() }, 'navigator');
  if (!taskTitles.has('整理主副舰分航首窗救援与战备冲突')) {
    const timestamp = now();
    await appendTask({ id: uid('task'), title: '整理主副舰分航首窗救援与战备冲突', description: '记录双任务首证、生命重开/七小时延长、主舰近接损失、两舰有限终态、异议成本与唯一中继入口。', level: 'session', status: 'completed', kind: 'planning', assignee: 'navigator', source: 'navigator', priority: 'high', whyNow: '分航后母星/军令建议都可能截取一句自动触发；延长救援与取消近接的真实损失必须对应本地事实和各舰回程。', known: ['27m乙链尾', '旧坞71%/压力袋', '七小时延长', '压力可响应/乙向旧点转发'], missingDecisions: [], aiPreAnalysis: '两舰分别开卡，按共同窗本地证据和回程做有限延长，双方丢失项同时留账。', authorDecision: '分歧不贴背叛；救援窗不无限续，威胁阴性不写没有。', agentWork: '已生成research/主副舰分航首窗救援与战备冲突.md和decisions/分航后各舰按本地事实执行共同异议入账.md。', completionCriteria: ['双任务终态分离', '延长/取消成本可审', '目标异议不人格化'], links: ['research/主副舰分航首窗救援与战备冲突.md', 'decisions/分航后各舰按本地事实执行共同异议入账.md', chaptersFourHundredNinetyThreeToFourHundredNinetyFive[2]], dependencies: [], createdAt: timestamp, updatedAt: timestamp }, 'agent');
  }
  if (!taskTitles.has('续写第496～498章：两条航路同时申请唯一一枚高功率中继')) {
    await appendTask({ id: uid('task'), title: '续写第496～498章：两条航路同时申请唯一一枚高功率中继', description: '比较高功率中继给副舰压力双接口或主舰乙→旧点转发拆解的边际收益/不可逆门，测试分时、降功率和缓存方案，做单一资源决议并补偿未获一方，不用轮流平均。', level: 'chapter', status: 'now', kind: 'planning', assignee: 'navigator', source: 'navigator', priority: 'critical', whyNow: '两舰需求在同一约7h窗口，唯一中继不能同时指向；简单轮流会让两边都错过当前状态窗口，按身份优先又把目标分歧变权力。', known: ['副舰双接口需稳定链', '主舰需拆窄束转发', '同一高功率中继', '两舰回程/互救有限'], missingDecisions: ['各需求最小功率/时长？', '分时是否破坏状态连续？', '未获一方如何替代/补偿？'], aiPreAnalysis: '第496章需求/代价；第497章三替代实测；第498章单一分配/补偿/异议。', authorDecision: '不按人/舰轮流平均；资源给本窗边际不可替代更高者，另一方获得可执行替代和损失记录。', agentWork: '', completionCriteria: ['唯一资源需求可量', '替代实验有终态', '分配与未获补偿完整'], links: [chaptersFourHundredNinetyThreeToFourHundredNinetyFive[2], 'research/主副舰分航首窗救援与战备冲突.md', 'planning/第七卷章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() }, 'navigator');
  }
  const facts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '分航任务不互借终态', statement: '主舰链尾设备/威胁与副舰旧点气密/生命分别通过；一舰成功不证明另一舰事实。母星/军令建议按本地证据/回程/有效窗，不截取“生命候选”或“未见威胁”自动触发。', status: 'author-confirmed', evidence: [{ filePath: chaptersFourHundredNinetyThreeToFourHundredNinetyFive[0], quote: '两艘船的任务卡没有共享同一个通过条件。' }], updatedAt: now() },
    { id: uid('fact'), category: 'knowledge', subject: '旧中继当前可响应压力系统候选', statement: '旧坞残舱压力袋温高4.3°C，压力/CO2同相；低功率复制间隔后3短1长2短变2短1长2短并重复2轮，纯固定泵下降，当前可响应生命或柔性系统上升，非人类确认。', status: 'author-confirmed', evidence: [{ filePath: chaptersFourHundredNinetyThreeToFourHundredNinetyFive[2], quote: '当前可响应压力系统，物种/人员未知' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '副舰七小时延长与主舰近接取消', statement: '副舰延长1窗至回程绿下沿/互救峰7h40后返航；主舰失双角/互救取消320→180km近接，只见乙域3倍能源朝旧点窄束转发，无武器/推进释放。', status: 'text-explicit', evidence: [{ filePath: chaptersFourHundredNinetyThreeToFourHundredNinetyFive[2], quote: '目标分歧造成的损失也分别结算。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '主副舰唯一高功率中继资源冲突', statement: '副舰需唯一高功率中继维持旧点压力双接口，主舰需它拆乙域到旧点窄束转发；同窗只能一舰使用，下一步测分时/降功率/缓存并做单一分配与未获替代。', status: 'text-explicit', evidence: [{ filePath: chaptersFourHundredNinetyThreeToFourHundredNinetyFive[2], quote: '中继只能给一艘船。' }], updatedAt: now() }
  ];
  for (const fact of facts) await appendFact(fact);
  await setPosition({ filePath: chaptersFourHundredNinetyThreeToFourHundredNinetyFive[2], stage: '第七卷唯一高功率中继与目标资源分配阶段', focus: '续写第496～498章：两条航路同时申请唯一一枚高功率中继' });
}

const chaptersFourHundredNinetySixToFourHundredNinetyEight = ['manuscript/第七卷-断星远征/第496章-唯一中继不能用救援和取证各分一半.md', 'manuscript/第七卷-断星远征/第497章-分时方案让两边都错过了需要连续的那一段.md', 'manuscript/第七卷-断星远征/第498章-中继给了副舰主舰得到的是一份真实的缺失.md'];
if (chaptersFourHundredNinetySixToFourHundredNinetyEight.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第496～498章'));
  if (current && current.status !== 'completed') await appendTask({ ...current, status: 'completed', agentWork: '唯一中继28分窗，副舰需22分连续（<18无双轮、错过遮21h），主舰需16分因果（<9仅被动、下窗7h），另需2分中继自检。14分分时双不足；43%双波束主舰可被动而副舰丢下降沿；选择副舰22分+主舰双标记器缓存，按本窗不可逆/替代而非永久救援优先。副舰双轮可调无过冲，内袋变外壳不变，返回19年前人类应急医疗舱兼容格式“低压保持/禁开舱/请求稳压”，人员未知且不增压。主舰保乙朝旧点22分主束/第二层封签，丢主动因果/弱链；链尾随后出现连续推进离壳。', links: [...new Set([...current.links, 'research/唯一高功率中继救援取证资源分配.md', 'decisions/唯一资源按当前不可逆窗口分配不轮流平均.md', ...chaptersFourHundredNinetySixToFourHundredNinetyEight])], updatedAt: now() }, 'navigator');
  if (!taskTitles.has('整理唯一高功率中继救援取证资源分配')) {
    const timestamp = now();
    await appendTask({ id: uid('task'), title: '整理唯一高功率中继救援取证资源分配', description: '记录双方最低连续时长/不可逆窗、分时/降功率/缓存影子、实际双轮医疗格式、主舰真实缺失与链尾推进新冲突。', level: 'session', status: 'completed', kind: 'planning', assignee: 'navigator', source: 'navigator', priority: 'high', whyNow: '唯一资源轮流平均可能制造两个无效任务；分配需让一方达最低终态，并给未获方预验证替代/明确不可恢复缺失。', known: ['副22分/主16分', '三替代', '医疗接口非人员', '主舰丢主动因果'], missingDecisions: [], aiPreAnalysis: '按连续最低门/下一机会/不可逆/替代评审，在影子中先验证方案。', authorDecision: '本窗给副舰不设永久优先；主舰损失不被救援成果抵消。', agentWork: '已生成research/唯一高功率中继救援取证资源分配.md和decisions/唯一资源按当前不可逆窗口分配不轮流平均.md。', completionCriteria: ['资源数学闭合', '影子与实际分开', '双方终态/损失完整'], links: ['research/唯一高功率中继救援取证资源分配.md', 'decisions/唯一资源按当前不可逆窗口分配不轮流平均.md', chaptersFourHundredNinetySixToFourHundredNinetyEight[2]], dependencies: [], createdAt: timestamp, updatedAt: timestamp }, 'agent');
  }
  if (!taskTitles.has('续写第499～501章：链尾开始加速离开时旧中继压力袋回了人类医疗舱格式')) {
    await appendTask({ id: uid('task'), title: '续写第499～501章：链尾开始加速离开时旧中继压力袋回了人类医疗舱格式', description: '量链尾推进可追窗与医疗接口稳定时限，比较主舰追链/保持中继/副舰撤回三种组合；做不可同时满足选择，完成旧同盟分裂阶段并保留失去目标与后续承接。', level: 'chapter', status: 'now', kind: 'planning', assignee: 'navigator', source: 'navigator', priority: 'critical', whyNow: '链尾首次连续推进可能离开当前壳，副舰远程医疗接口也需中继；唯一中继不能同时支持追链和救援，目标差异进入不可逆选择。', known: ['链尾连续推进', '压力系统医疗格式再发', '主舰/副舰中继冲突', '人员仍未知'], missingDecisions: ['链尾可追多久/耗多少回程？', '压力系统不连续中继能稳定多久？', '三组合分别失去什么？'], aiPreAnalysis: '第499章双窗口量化；第500章三组合/各舰异议；第501章选择/结案/承接。', authorDecision: '不以人类接口等同有人，也不以设备移动压过救援；选择公开失去项，不贴背叛。', agentWork: '', completionCriteria: ['双不可逆窗闭合', '三组合可比较', '阶段选择与失去目标完整'], links: [chaptersFourHundredNinetySixToFourHundredNinetyEight[2], 'research/唯一高功率中继救援取证资源分配.md', 'planning/第七卷章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() }, 'navigator');
  }
  const facts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '唯一资源不按轮流平均', statement: '唯一资源按连续最低门、下一机会、不可逆损失、可用替代与后果分配；分时仅在双方各达有效终态时公平。获方成果不抵消未获方缺失，当前分配不继承永久优先。', status: 'author-confirmed', evidence: [{ filePath: chaptersFourHundredNinetySixToFourHundredNinetyEight[0], quote: '唯一中继不能用救援和取证各分一半。' }], updatedAt: now() },
    { id: uid('fact'), category: 'decision', subject: '高功率中继副舰22分钟分配', statement: '28分窗扣2分自检后给副舰22分连续，主舰用双标记器缓存；14分分时双不足，43%双波束副舰看不清过冲。理由为副错过21h而主下窗7h且有被动替代。', status: 'author-confirmed', evidence: [{ filePath: chaptersFourHundredNinetySixToFourHundredNinetyEight[1], quote: '副舰连续加主舰缓存' }], updatedAt: now() },
    { id: uid('fact'), category: 'knowledge', subject: '旧点压力系统人类医疗接口格式', statement: '副舰双轮可调无过冲、变化仅内袋；返回19年前人类应急医疗舱兼容格式：低压保持/不可开舱/请求外部稳压。证明人类接口，不证明舱内有人，当前不增压。', status: 'author-confirmed', evidence: [{ filePath: chaptersFourHundredNinetySixToFourHundredNinetyEight[2], quote: '它证明内部控制使用人类医疗接口。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '链尾推进与旧点远程救援不可同时满足', statement: '链尾在下一窗前出现连续可分推进离开位置壳，压力系统再发医疗格式；唯一中继若追链则救援失链，若保救援则可能失当前设备链，下一步量三组合并做阶段选择。', status: 'text-explicit', evidence: [{ filePath: chaptersFourHundredNinetySixToFourHundredNinetyEight[2], quote: '链尾开始加速离开时，旧中继压力袋回了人类医疗舱格式。' }], updatedAt: now() }
  ];
  for (const fact of facts) await appendFact(fact);
  await setPosition({ filePath: chaptersFourHundredNinetySixToFourHundredNinetyEight[2], stage: '第七卷链尾追踪与旧点救援不可同时满足阶段', focus: '续写第499～501章：链尾开始加速离开时旧中继压力袋回了人类医疗舱格式' });
}

const chaptersFourHundredNinetyNineToFiveHundredOne = ['manuscript/第七卷-断星远征/第499章-链尾可追四小时压力袋只能再稳六小时.md', 'manuscript/第七卷-断星远征/第500章-三个组合没有一个同时保住救援和设备链.md', 'manuscript/第七卷-断星远征/第501章-舰队保住压力袋以后失去了当前设备链.md'];
if (chaptersFourHundredNinetyNineToFiveHundredOne.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第499～501章'));
  if (current && current.status !== 'completed') await appendTask({ ...current, status: 'completed', agentWork: '链尾11分钟修正，4h17越绿色截获；压力袋泄漏+13%/压差每7h掉1.8%，6h双膜窗后遮28h。比较中继追链、只救援、救援+低功率影随、先后分时（半膜改受力且双不足），选择救援+影随：副舰第二段因隔热层抬2mm停/退/支点改6cm，双膜使维护口压差降至32%，不入不增压并保28h承接；主舰每40分核回程、绿下沿前12分停，将深廊缩2.6°，4h11失当前会话，保轨迹非跟踪。互救峰9h20/标记器滞留/D-5实时线丢失入账。成像见约1.73m随外压蜷缩人形，生命身份未知。', links: [...new Set([...current.links, 'research/链尾四小时与压力袋六小时不可同时窗口.md', 'decisions/本窗选择救援不成为永久救援高于取证.md', ...chaptersFourHundredNinetyNineToFiveHundredOne])], updatedAt: now() }, 'navigator');
  if (!taskTitles.has('整理链尾四小时与压力袋六小时不可同时窗口')) {
    const timestamp = now();
    await appendTask({ id: uid('task'), title: '整理链尾四小时与压力袋六小时不可同时窗口', description: '记录双不可逆窗、四组合、双膜停止/重置、影随回程、救援承接/设备链丢失、异议成本和1.73m轮廓入口。', level: 'session', status: 'completed', kind: 'planning', assignee: 'navigator', source: 'navigator', priority: 'high', whyNow: '本窗必须在可调医疗接口和实时设备链间选择；若用永久价值口号，会抹不同窗口/替代与真实失去。', known: ['4h17链尾窗', '6h双膜窗', '选救援+影随', '设备会话失去'], missingDecisions: [], aiPreAnalysis: '把截获/稳压/返航量化，拒半成品组合，选择后分别闭合救援和丢失设备线。', authorDecision: '本窗救援不成永久排序；异议不贴背叛，下一次从零决议。', agentWork: '已生成research/链尾四小时与压力袋六小时不可同时窗口.md和decisions/本窗选择救援不成为永久救援高于取证.md。', completionCriteria: ['双窗与组合闭合', '选择执行有停止/恢复', '失去目标/成本/异议完整'], links: ['research/链尾四小时与压力袋六小时不可同时窗口.md', 'decisions/本窗选择救援不成为永久救援高于取证.md', chaptersFourHundredNinetyNineToFiveHundredOne[2]], dependencies: [], createdAt: timestamp, updatedAt: timestamp }, 'agent');
  }
  if (!taskTitles.has('续写第502～504章：旧中继压力袋里有一具会随外压改变姿势的人形轮廓')) {
    await appendTask({ id: uid('task'), title: '续写第502～504章：旧中继压力袋里有一具会随外压改变姿势的人形轮廓', description: '对约1.73m轮廓做多角成像、材料/热/压力分层，以人体模型、医疗囊骨架和非人仿形结构反例判断随外压蜷缩是主动或被动；有限升级生命/人类候选并选择无侵入救援动作。', level: 'chapter', status: 'now', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'critical', whyNow: '人形轮廓与人类医疗格式叠加极易直接生成幸存者身份；当前无独立心跳/气血/主动动作，需在开舱前拆形状与生命。', known: ['约1.73m轮廓', '随外压轻微蜷缩', '医疗舱接口格式', '无心跳/气血/主动证据'], missingDecisions: ['轮廓材料/温度？', '变化相位主动还是被动？', '何种无侵入动作可增加证据且不伤害？'], aiPreAnalysis: '第502章多角分层；第503章三类反例/相位；第504章有限升级与外层动作。', authorDecision: '不以人形+医疗格式命名人；不为确认身份开舱或改变内部气体。', agentWork: '', completionCriteria: ['成像来源可核', '主动/被动边界明确', '下一救援动作可逆/有停止'], links: [chaptersFourHundredNinetyNineToFiveHundredOne[2], 'research/链尾四小时与压力袋六小时不可同时窗口.md', 'planning/第七卷章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() }, 'navigator');
  }
  const facts: StoryFact[] = [
    { id: uid('fact'), category: 'decision', subject: '链尾与压力袋双不可逆窗选择', statement: '链尾4h17截获窗、压力袋6h双膜窗不能同保；选择高功率救援+主舰低功率影随，依据可调医疗接口/泄漏增长/可逆稳压与设备可留轨迹，不生成永久救援优先。', status: 'author-confirmed', evidence: [{ filePath: chaptersFourHundredNinetyNineToFiveHundredOne[1], quote: '远征指挥官选择组合三。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '旧点压力袋双膜稳压终态', statement: '第二段骨架抬旧隔热层2mm触发停止，退回/支点改6cm后完成；双膜缓冲使维护口压差降至32%，不入舱不增压不改气体，低频接口承接并于28h复核。', status: 'text-explicit', evidence: [{ filePath: chaptersFourHundredNinetyNineToFiveHundredOne[2], quote: '稳压环终态成立。' }], updatedAt: now() },
    { id: uid('fact'), category: 'knowledge', subject: '偏移链尾当前设备会话丢失', statement: '主舰低功率影随缩深廊入口至2.6°，绿下沿前12分停；链尾4h11越可挑战范围，保最后方位/速度/两域史/标记器但当前会话失去，互救峰9h20。', status: 'author-confirmed', evidence: [{ filePath: chaptersFourHundredNinetyNineToFiveHundredOne[2], quote: '当前设备会话丢失。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '压力袋1.73m随外压蜷缩人形轮廓', statement: '稳压后多角成像初见约1.73m人形轮廓随外压轻微蜷缩，无独立心跳/气血/主动动作；下一步以材料热压力与人体模型/医疗骨架/非人仿形反例核验，不命名幸存者。', status: 'text-explicit', evidence: [{ filePath: chaptersFourHundredNinetyNineToFiveHundredOne[2], quote: '一具一米七三左右的人形轮廓。' }], updatedAt: now() }
  ];
  for (const fact of facts) await appendFact(fact);
  await setPosition({ filePath: chaptersFourHundredNinetyNineToFiveHundredOne[2], stage: '第七卷失联中继外层人形轮廓无侵入救援阶段', focus: '续写第502～504章：旧中继压力袋里有一具会随外压改变姿势的人形轮廓' });
}

const chaptersFiveHundredTwoToFiveHundredFour = ['manuscript/第七卷-断星远征/第502章-四个角度里人形只有两个关节真的会动.md', 'manuscript/第七卷-断星远征/第503章-空医疗骨架也会在外压变化时蜷缩.md', 'manuscript/第七卷-断星远征/第504章-人类身体候选升高没有让副舰立刻开舱.md'];
if (chaptersFiveHundredTwoToFiveHundredFour.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第502～504章'));
  if (current && current.status !== 'completed') await appendTask({ ...current, status: 'completed', agentWork: '四角将初始1.73m改1.69～1.76m高含水主体/医疗架/3管，左臂为管叠影；外压+1.5%时整体7mm，只有右肘1.2°/髋0.9°相对动，滞后0.4～0.6秒。高含水合成人体、空医疗骨架、非人仿形三套×6次复现被动蜷缩，外压动作不证生命。恒压6小时见4段7～12分/0.17～0.22Hz躯干变化，CO2晚30～40秒同段，泵/热/模型/滤芯唯一解释下降。接口占用1、生命传感离线，自动“保持当前”可交互；人类身体高/活体中高/意识身份未知，不开舱不增压。右手样恒压12帧累计3mm。', links: [...new Set([...current.links, 'research/旧中继压力袋人形轮廓无侵入核验.md', 'decisions/人形与人类医疗接口不等于活人.md', ...chaptersFiveHundredTwoToFiveHundredFour])], updatedAt: now() }, 'researcher');
  if (!taskTitles.has('整理旧中继压力袋人形轮廓无侵入核验')) {
    const timestamp = now();
    await appendTask({ id: uid('task'), title: '整理旧中继压力袋人形轮廓无侵入核验', description: '记录四角材料/热/关节、三模型反例、恒压微振/CO2、医疗占用/传感/自动交互、候选边界与右手3mm。', level: 'session', status: 'completed', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'high', whyNow: '人形+人类医疗格式最易跳到活人/D-5；外压蜷缩可由空骨架复现，生命候选越高越不应为身份开舱扰动。', known: ['四角1.69～1.76m', '蜷缩被动可复现', '微振/CO2同段', '活体中高人类高'], missingDecisions: [], aiPreAnalysis: '拆轮廓叠影、反例外压，再用恒压多源与无动作接口增加证据。', authorDecision: '不问身份/不开舱/不改气体；自动交互不等意识。', agentWork: '已生成research/旧中继压力袋人形轮廓无侵入核验.md和decisions/人形与人类医疗接口不等于活人.md。', completionCriteria: ['轮廓材料来源可核', '主动被动分开', '候选/动作权限完整'], links: ['research/旧中继压力袋人形轮廓无侵入核验.md', 'decisions/人形与人类医疗接口不等于活人.md', chaptersFiveHundredTwoToFiveHundredFour[2]], dependencies: [], createdAt: timestamp, updatedAt: timestamp }, 'agent');
  }
  if (!taskTitles.has('续写第505～507章：稳压后的第三个周期人形轮廓出现了与泵阀不同步的胸廓起伏')) {
    await appendTask({ id: uid('task'), title: '续写第505～507章：稳压后的第三个周期人形轮廓出现了与泵阀不同步的胸廓起伏', description: '长窗验证胸廓低频/CO2相位，排稳压环/热/滤芯共同驱动；核右手样3mm是成像漂移/支架回弹或独立动作，并用不涉及语言身份的可停止二元互动确定生命/意识候选边界。', level: 'chapter', status: 'now', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'critical', whyNow: '活体已中高但意识未知；右手3mm低于单帧分辨率且医疗自动控制可互动，必须用跨帧/对照/预登记回应区分主动生命与设备。', known: ['4段躯干低频', 'CO2晚30～40秒', '右手12帧3mm', '自动保持可交互'], missingDecisions: ['低频跨天是否稳定？', '右手是否独立于支架/相机？', '何种二元互动不扰动且能区分自动？'], aiPreAnalysis: '第505章长窗相位；第506章三基准手部动作；第507章可停止互动/生命意识边界。', authorDecision: '不问姓名/D-5，不用痛觉/压力刺激换回应；自动协议与主体回应分开。', agentWork: '', completionCriteria: ['低频多源跨窗', '3mm动作排成像/支架', '互动与候选终态有停止门'], links: [chaptersFiveHundredTwoToFiveHundredFour[2], 'research/旧中继压力袋人形轮廓无侵入核验.md', 'planning/第七卷章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() }, 'navigator');
  }
  const facts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '人形医疗接口活体意识身份分离', statement: '轮廓/医疗格式/占用、人类身体材料、活体、意识、身份分别判断；合成人体/空骨架可复现外压蜷缩，自动医疗可响应无动作请求，均不直接证明活人或D-5。', status: 'author-confirmed', evidence: [{ filePath: chaptersFiveHundredTwoToFiveHundredFour[1], quote: '空医疗骨架也会在外压变化时蜷缩。' }], updatedAt: now() },
    { id: uid('fact'), category: 'knowledge', subject: '压力袋人形四角成像与被动关节', statement: '1.69～1.76m高含水主体，中层医疗架/两金属点/3管；左臂为管叠影。外压+1.5%时整体7mm，右肘1.2°/髋0.9°、延迟0.4～0.6秒，可由无动力模型复现。', status: 'author-confirmed', evidence: [{ filePath: chaptersFiveHundredTwoToFiveHundredFour[0], quote: '四个角度里人形只有两个关节真的会动。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '旧点人形活体中高候选', statement: '恒压6小时4段7～12分/0.17～0.22Hz躯干变化，CO2均晚30～40秒低幅升；泵/热唯一解释下降。医疗占用1/生命传感离线，自动保持可交互；人类身体高、活体中高、意识身份未知。', status: 'text-explicit', evidence: [{ filePath: chaptersFiveHundredTwoToFiveHundredFour[2], quote: '当前活体候选由低到中升为中高。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '恒压右手样结构12帧3mm动作', statement: '第三恒压观测周期躯干低频重现，右手样结构连续12帧同向累计3mm、低于单帧分辨率；下一步排相机/支架回弹并做无痛无身份二元互动，不直接写主动意识。', status: 'text-explicit', evidence: [{ filePath: chaptersFiveHundredTwoToFiveHundredFour[2], quote: '右手样结构在恒压下移动了三毫米。' }], updatedAt: now() }
  ];
  for (const fact of facts) await appendFact(fact);
  await setPosition({ filePath: chaptersFiveHundredTwoToFiveHundredFour[2], stage: '第七卷压力袋活体与意识无侵入互动阶段', focus: '续写第505～507章：稳压后的第三个周期人形轮廓出现了与泵阀不同步的胸廓起伏' });
}

const chaptersFiveHundredFiveToFiveHundredSeven = ['manuscript/第七卷-断星远征/第505章-十一段胸廓起伏都比二氧化碳早三十秒.md', 'manuscript/第七卷-断星远征/第506章-右手三毫米没有跟相机和支架一起走.md', 'manuscript/第七卷-断星远征/第507章-人形按约定动了两次右手仍然没有姓名.md'];
if (chaptersFiveHundredFiveToFiveHundredSeven.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第505～507章'));
  if (current && current.status !== 'completed') await appendTask({ ...current, status: 'completed', agentWork: '恒压24h排姿态窗后见11段6m40s～13m12s/0.16～0.23Hz躯干变化，四气口CO2晚29～43秒且随距离递增；泵仅3段、热2段、环/撞击不匹配，活跃代谢样交换高。外壳/环/支架/右腕四参照确认两低频窗右腕相对动2.9/3.2mm、短结构弯约1.3～1.6°，静息无同类/无已知执行器，主动中候选。两组随机反转二元提示在独立揭盲下得到两声静/一声4.2秒动3.1mm、一声静/两声5.1秒动2.8mm，且生命门未触发；当前可理解指令的人类活体意识高候选，身份/D-5/开舱同意未知。停止认知测试，准备整体气密转移。', links: [...new Set([...current.links, 'research/压力袋胸廓气体与无痛二元互动.md', 'decisions/确认意识不等于取得身份或开舱同意.md', ...chaptersFiveHundredFiveToFiveHundredSeven])], updatedAt: now() }, 'researcher');
  if (!taskTitles.has('整理压力袋胸廓气体与无痛二元互动')) {
    const timestamp = now();
    await appendTask({ id: uid('task'), title: '整理压力袋胸廓气体与无痛二元互动', description: '记录24小时微振/CO2、四参照右手动作、两组随机反转互动、生命停止门、意识/身份/同意边界与整体转移。', level: 'session', status: 'completed', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'high', whyNow: '活体、局部动作与自动医疗可叠加成意识错觉；二元遵令也容易被扩张为身份和处置同意，必须随机反转/可停止且达到目的即停。', known: ['11段胸廓/CO2', '右腕2.9/3.2mm', '静动静动', '身份开舱同意未知'], missingDecisions: [], aiPreAnalysis: '长窗跨源确立活体，四参照拆局部动作，再以盲随机反转削弱自动反射。', authorDecision: '不问身份、不提高刺激、不把二元回应扩成开舱同意；安静是合法终态。', agentWork: '已生成research/压力袋胸廓气体与无痛二元互动.md和decisions/确认意识不等于取得身份或开舱同意.md。', completionCriteria: ['活体多源稳定', '互动揭盲/停止完整', '身份/同意/下一动作分离'], links: ['research/压力袋胸廓气体与无痛二元互动.md', 'decisions/确认意识不等于取得身份或开舱同意.md', chaptersFiveHundredFiveToFiveHundredSeven[2]], dependencies: [], createdAt: timestamp, updatedAt: timestamp }, 'agent');
  }
  if (!taskTitles.has('续写第508～510章：副舰不打开压力袋先把整段残舱搬进外侧隔离舱')) {
    await appendTask({ id: uid('task'), title: '续写第508～510章：副舰不打开压力袋先把整段残舱搬进外侧隔离舱', description: '验证残舱/双膜/医疗舱整体吊点、质心、隔离容量，整体转移遇旧坞架应变红时停止重建承力路径；完成外侧隔离承接与中继外层阶段，保内部环境/意识/身份/开舱边界。', level: 'chapter', status: 'now', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'critical', whyNow: '当前意识高候选但未知气体/低压/旧膜使开舱不可逆；整体转移能增加工具与保护，救援目标仍不能覆盖残舱结构和副舰隔离安全。', known: ['双膜稳压32%', '当前意识高候选', '不打开/不增压', '副舰外侧隔离可用'], missingDecisions: ['整体质量/质心/吊点？', '旧坞架与压力袋如何切界而不切舱？', '隔离舱接收后的权限与下一步？'], aiPreAnalysis: '第508章整体工程卡；第509章真实转移停止/重建；第510章隔离终态/阶段结案。', authorDecision: '不为身份切开；结构红先停，宁可保原位也不把可能生命和副舰一起置险。', agentWork: '', completionCriteria: ['整体边界/载荷闭合', '真实停止与替代路径', '隔离终态/权限/未决完整'], links: [chaptersFiveHundredFiveToFiveHundredSeven[2], 'research/压力袋胸廓气体与无痛二元互动.md', 'planning/第七卷章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() }, 'navigator');
  }
  const facts: StoryFact[] = [
    { id: uid('fact'), category: 'knowledge', subject: '旧点压力袋活体代谢样长窗', statement: '恒压24h有11段0.16～0.23Hz躯干变化，近远四气口CO2均晚29～43秒且随距离递增；泵/热/环/撞击唯一驱动下降，支持主体活跃代谢样交换高，非意识单证。', status: 'author-confirmed', evidence: [{ filePath: chaptersFiveHundredFiveToFiveHundredSeven[0], quote: '十一段胸廓起伏都比二氧化碳早三十秒。' }], updatedAt: now() },
    { id: uid('fact'), category: 'knowledge', subject: '压力袋右手样独立局部动作', statement: '四参照下静息差≤0.7mm；两低频窗右腕相对固定扣移动2.9/3.2mm，两短结构弯1.3～1.6°，参照不动、无登记执行器/可见刺激，主动中候选但非意图。', status: 'author-confirmed', evidence: [{ filePath: chaptersFiveHundredFiveToFiveHundredSeven[1], quote: '右手三毫米没有跟相机和支架一起走。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '压力袋人形随机反转二元遵令', statement: '映射一声动/两声静得到两声静、一声后4.2秒动3.1mm；反转一声静/两声动得到静、两声后5.1秒动2.8mm。四轮生命门未触发，当前人类活体意识高候选。', status: 'text-explicit', evidence: [{ filePath: chaptersFiveHundredFiveToFiveHundredSeven[2], quote: '四轮结果是静、动、静、动。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '压力袋整体气密转入副舰外侧隔离', statement: '二元遵令不授身份/D-5/开舱同意；下一步不打开不改气体，将残舱+双膜+医疗舱作为整体搬入外侧隔离，转移中结构红先停并重建承力。', status: 'author-confirmed', evidence: [{ filePath: chaptersFiveHundredFiveToFiveHundredSeven[2], quote: '先把整段残舱、双膜与内部医疗舱作为一个气密对象' }], updatedAt: now() }
  ];
  for (const fact of facts) await appendFact(fact);
  await setPosition({ filePath: chaptersFiveHundredFiveToFiveHundredSeven[2], stage: '第七卷压力袋整体气密转移与中继外层结案阶段', focus: '续写第508～510章：副舰不打开压力袋先把整段残舱搬进外侧隔离舱' });
}

const chaptersFiveHundredEightToFiveHundredTen = ['manuscript/第七卷-断星远征/第508章-整体转移以前先承认四个旧吊点只有两个能用.md', 'manuscript/第七卷-断星远征/第509章-旧坞架在百分之十载荷时先亮了红.md', 'manuscript/第七卷-断星远征/第510章-压力袋进了隔离舱仍然没有被打开.md'];
if (chaptersFiveHundredEightToFiveHundredTen.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第508～510章'));
  if (current && current.status !== 'completed') await appendTask({ ...current, status: 'completed', agentWork: '初始残舱6.4×3.1m/3.8～4.3t，4旧吊点仅第4承载/第1导向；4带cradle按5/10/25/50/全载。首次10%离支撑3mm时隐藏短撑护框两应变片2.3×红，17秒逐带回落；拒切撑/补片，扩大对象+1.2m/+0.7t带两旧纵梁，拆工具柜/缓冲板、加独立延伸罩/6带。二次25%底带差14%停，配重移4cm降10%；全对象4.7t、cradle76%/纵梁24%，真实门余15cm，分别气密且可撤，晚9h17并取消采样。不开袋/增压/换气/查身份。底面新见M6-01-23代理维修印，只证工具曾维护。', links: [...new Set([...current.links, 'research/压力袋残舱整体气密转移与外侧隔离.md', 'decisions/意识高候选先整体转移不切开原环境.md', ...chaptersFiveHundredEightToFiveHundredTen])], updatedAt: now() }, 'researcher');
  if (!taskTitles.has('整理压力袋残舱整体气密转移与外侧隔离')) {
    const timestamp = now();
    await appendTask({ id: uid('task'), title: '整理压力袋残舱整体气密转移与外侧隔离', description: '记录初始质量/吊点/cradle五级、10%隐藏短撑红停、扩大对象/六带/延伸罩、全载隔离终态与M6-01-23印。', level: 'session', status: 'completed', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'high', whyNow: '意识高候选不等于可切舱；救援目标若覆盖旧结构红，会同时伤主体和副舰。整体扩大可逆但必须支付容量/工具/时间。', known: ['10%应变2.3×停', '对象扩大0.7t', '全载4.7t', 'M6-01-23印'], missingDecisions: [], aiPreAnalysis: '先核吊点/质心/隔离反向路线，真实分级后按隐藏支撑扩大承力，不切内部。', authorDecision: '不开舱/换气/查身份；新维修印只进设备来源链。', agentWork: '已生成research/压力袋残舱整体气密转移与外侧隔离.md和decisions/意识高候选先整体转移不切开原环境.md。', completionCriteria: ['质量载荷闭合', '停止/回落/新路径完整', '隔离/未决/M6印边界完整'], links: ['research/压力袋残舱整体气密转移与外侧隔离.md', 'decisions/意识高候选先整体转移不切开原环境.md', chaptersFiveHundredEightToFiveHundredTen[2]], dependencies: [], createdAt: timestamp, updatedAt: timestamp }, 'agent');
  }
  if (!taskTitles.has('续写第511～513章：医疗舱外壳上的M6-01-23只证明同一套代理工具来过')) {
    await appendTask({ id: uid('task'), title: '续写第511～513章：医疗舱外壳上的M6-01-23只证明同一套代理工具来过', description: '核维修印真伪/时间/动作范围/外壳版本，与第五卷W2/M6-01-23/CAND-RELAY-3做字段级对照，拆同套件/克隆印/标准兼容；建立医疗舱维修事件与D-5设备候选边，不查询舱内身份。', level: 'chapter', status: 'now', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'critical', whyNow: 'M6-01-23与第五卷代理链相同，但工具印最易被直接归给舱内人/D-5；需先确认印本身与工具动作，人物身份对当前救援非必要。', known: ['底面M6-01-23印', '第五卷23号重配DEV-B-L6', 'CAND-RELAY-3匿名位', '舱内身份关闭'], missingDecisions: ['印是否克隆/兼容字段？', '维修时间与动作？', '同套件连续到何程度？'], aiPreAnalysis: '第511章印/材料/版本；第512章字段比对与三模型；第513章事件边/权限/后续取证。', authorDecision: '工具、操作者、舱内对象三层分离；不为D-5线索打断隔离救援。', agentWork: '', completionCriteria: ['印真伪时间可核', '三模型有反例', '设备边不泄身份/不越救援'], links: [chaptersFiveHundredEightToFiveHundredTen[2], 'research/压力袋残舱整体气密转移与外侧隔离.md', 'planning/第七卷章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() }, 'navigator');
  }
  const facts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '意识高候选整体气密转移边界', statement: '身份/气体/膜材/开舱同意未知时，压力袋/医疗架/双膜/必要残舱整体转外侧隔离；救援不覆盖结构红，宁可扩大可逆对象并付容量成本，不切原环境。', status: 'author-confirmed', evidence: [{ filePath: chaptersFiveHundredEightToFiveHundredTen[2], quote: '压力袋进了隔离舱仍然没有被打开。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '压力袋残舱整体转移结构停止与重建', statement: '初始4带10%时隐藏短撑护框应变2.3×红并回落；扩大对象带2纵梁+0.7t，6带25%差14%停/配重移4cm；全载4.7t，cradle76%/纵梁24%，隔离门余15cm。', status: 'text-explicit', evidence: [{ filePath: chaptersFiveHundredEightToFiveHundredTen[1], quote: '旧坞架在百分之十载荷时先亮了红。' }], updatedAt: now() },
    { id: uid('fact'), category: 'decision', subject: '副舰外侧隔离舱与延伸罩终态', statement: '主隔离与尾部延伸罩独立气密/可关闭/可沿原轨迹撤；转移晚9h17，拆工具柜/缓冲板并取消旧坞采样。内部原压气体/双膜/节律保持，不开舱增压换气查身份。', status: 'author-confirmed', evidence: [{ filePath: chaptersFiveHundredEightToFiveHundredTen[2], quote: '整体气密转移完成。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '医疗舱外壳M6-01-23维修代理印', statement: '转移后底座遮挡面见M6-01-23印，与第五卷23号代理套件同标；只证代理工具曾维护外壳，不证舱内人/D-5操作者/套件现位置，下一步字段级核验。', status: 'text-explicit', evidence: [{ filePath: chaptersFiveHundredEightToFiveHundredTen[2], quote: 'M6-01-23' }], updatedAt: now() }
  ];
  for (const fact of facts) await appendFact(fact);
  await setPosition({ filePath: chaptersFiveHundredEightToFiveHundredTen[2], stage: '第七卷M6-01-23医疗舱维修事件与D-5设备候选阶段', focus: '续写第511～513章：医疗舱外壳上的M6-01-23只证明同一套代理工具来过' });
}

const chaptersFiveHundredElevenToFiveHundredThirteen = ['manuscript/第七卷-断星远征/第511章-二十三号印记有十九年氧化也有同一枚缺齿.md', 'manuscript/第七卷-断星远征/第512章-六个字段相同也不足以把两次维修交给同一个人.md', 'manuscript/第七卷-断星远征/第513章-同一套代理工具来过不等于舱里躺着工具主人.md'];
if (chaptersFiveHundredElevenToFiveHundredThirteen.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第511～513章'));
  if (current && current.status !== 'completed') await appendTask({ ...current, status: 'completed', agentWork: '无接触核医疗支架印：6齿/实例23/旧离线签名/封固层，氧化与失联早期相容但误差近2年；第四齿0.14mm缺口+第三齿半月由盲标与第五卷W2高似，27留存无第二组合。六字段前5同/高似，角色仅同类候选中继末位3且盐不同；盲审同物理套件高、克隆中、标准重合低，均非人物。七动作恢复读版本/旧控失效/装M6桥/低压/禁开/外稳/封固退出，解释自动格式与生命传感不可达，不覆盖意识证据。工具进入L6-Maint-4后只读，中间19年未知，再到地下端点；只开外壳工程与外侧出口，不查舱内身份。', links: [...new Set([...current.links, 'research/医疗舱M6-01-23维修印与第五卷代理链对照.md', 'decisions/代理工具印不归属操作者和舱内对象.md', ...chaptersFiveHundredElevenToFiveHundredThirteen])], updatedAt: now() }, 'researcher');
  if (!taskTitles.has('整理医疗舱M6-01-23维修印与第五卷代理链对照')) {
    const timestamp = now();
    await appendTask({ id: uid('task'), title: '整理医疗舱M6-01-23维修印与第五卷代理链对照', description: '记录印记四层/盲微痕、六字段三模型、七维修动作、Maintain-4出口/19年虚线和设备/操作者/舱内身份权限。', level: 'session', status: 'completed', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'high', whyNow: '工具印、匿名执行位和人形救援叠加会直接生成D-5人物；需将物件、角色、操作者、被维护对象分边并关闭身份捷径。', known: ['双微痕高似', '同套件高/克隆中', '7动作自动格式', 'Maintain-4后19年未知'], missingDecisions: [], aiPreAnalysis: '先核印/污染/签名，再盲比物理/克隆/标准，最后恢复动作与出口而不补人物。', authorDecision: '救援主体不回答历史；只开工程与外侧出口，不开身份/病历/D-5匹配。', agentWork: '已生成research/医疗舱M6-01-23维修印与第五卷代理链对照.md和decisions/代理工具印不归属操作者和舱内对象.md。', completionCriteria: ['印真伪时间动作完整', '三模型负担/反例可审', '设备链与身份救援隔离'], links: ['research/医疗舱M6-01-23维修印与第五卷代理链对照.md', 'decisions/代理工具印不归属操作者和舱内对象.md', chaptersFiveHundredElevenToFiveHundredThirteen[2]], dependencies: [], createdAt: timestamp, updatedAt: timestamp }, 'agent');
  }
  if (!taskTitles.has('续写第514～516章：二十三号代理工具修完医疗舱以后沿旧中继内侧接口离开')) {
    await appendTask({ id: uid('task'), title: '续写第514～516章：二十三号代理工具修完医疗舱以后沿旧中继内侧接口离开', description: '在旧中继外侧定位L6-Maint-4出口/封固/最后物理方向，用磨屑、磁化、接口时钟与周边结构拆套件离开/留置/被转运三候选；建立最小去向扇区和下一授权，不用十九年空白连地下路线。', level: 'chapter', status: 'now', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'critical', whyNow: '维修事件只给工具进入Maintain-4；若把接口入口当连续路线，会凭十九年空白把星海和地下画直线。外侧物理取证可在不进深层下收窄。', known: ['Maintain-4内侧接口', '工具封固退出', '19年中间未知', '同物理套件高候选'], missingDecisions: ['出口是否仍物理存在？', '工具最后方向/残留？', '离开/留置/被运各需何证据？'], aiPreAnalysis: '第514章定位出口；第515章四类物证/三候选；第516章扇区/权限/不连续边。', authorDecision: '只查外侧出口，不开深层档案/召主舰；无法定位也作为终态。', agentWork: '', completionCriteria: ['接口物理终态', '三候选有反例', '最小方向/下一授权不越界'], links: [chaptersFiveHundredElevenToFiveHundredThirteen[2], 'research/医疗舱M6-01-23维修印与第五卷代理链对照.md', 'planning/第七卷章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() }, 'navigator');
  }
  const facts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '代理工具操作者被维护对象分离', statement: '实例印/微磨损支持工具或模具；匿名执行位是岗位槽，不是人；同一工具可多人/自动使用，被维护医疗舱占用者不等于操作者。设备取证不得借救援身份。', status: 'author-confirmed', evidence: [{ filePath: chaptersFiveHundredElevenToFiveHundredThirteen[2], quote: '同一套代理工具来过不等于舱里躺着工具主人。' }], updatedAt: now() },
    { id: uid('fact'), category: 'knowledge', subject: '医疗舱M6-01-23印与W2双微痕', statement: '旧离线签名属M6-01实例23/压力接口封固重绑；第四齿0.14mm缺口+第三齿半月与W2高似，27留存无第二组合。同物理套件高、克隆中、标准重合低，氧化误差近2年。', status: 'author-confirmed', evidence: [{ filePath: chaptersFiveHundredElevenToFiveHundredThirteen[0], quote: '二十三号印记有十九年氧化也有同一枚缺齿。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '医疗舱M6桥七动作维修事件', statement: '读版本/旧控制失效/装M6桥/固定值改低压/关自动开舱/启外稳请求/封固退出；生命模块不可达但压力保护继续。解释自动医疗格式/传感离线，不覆盖右手意识证据。', status: 'text-explicit', evidence: [{ filePath: chaptersFiveHundredElevenToFiveHundredThirteen[2], quote: '医疗舱维修事件从封固头里恢复出七个动作。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: 'M6-01-23进入旧中继L6-Maint-4后未知', statement: '工具封固后进入内侧L6-Maint-4，接口转只读；之后归仓/携带/自动运行未知，中间19年到地下端点为虚线。下一步只查外侧物理出口/磨屑磁化时钟方向，不进深层。', status: 'text-explicit', evidence: [{ filePath: chaptersFiveHundredElevenToFiveHundredThirteen[2], quote: '沿旧中继内侧接口离开。' }], updatedAt: now() }
  ];
  for (const fact of facts) await appendFact(fact);
  await setPosition({ filePath: chaptersFiveHundredElevenToFiveHundredThirteen[2], stage: '第七卷M6-01-23内侧接口出口与去向候选阶段', focus: '续写第514～516章：二十三号代理工具修完医疗舱以后沿旧中继内侧接口离开' });
}

const chaptersFiveHundredFourteenToFiveHundredSixteen = ['manuscript/第七卷-断星远征/第514章-内侧四号接口的外门还留在断掉的坞架上.md', 'manuscript/第七卷-断星远征/第515章-磨屑和磁化只把工具送到外门以外十一米.md', 'manuscript/第七卷-断星远征/第516章-十九年前的出向扇区不能直接连到今天的地下.md'];
if (chaptersFiveHundredFourteenToFiveHundredSixteen.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第514～516章'));
  if (current && current.status !== 'completed') await appendTask({ ...current, status: 'completed', agentWork: '用无人物无开门探头在6.4°姿态扇区7门中定位散热罩下6槽Maintain-4外门，仅分级移罩15mm；门闭但封固膜内向外裂11cm。微样见4槽双刮/3槽半月高钴屑与23号匹配，同物理通过很高；锁舌向外解锁11m20s后回锁，医疗封固后37m04s，导轨42～58kg载荷持续16分，外侧6m轮痕+5m磁吸至少11m。外端三去向R-S4/缺失坞架/梁端碎片。三源姿态只给当时13.6°扇区，不能连今日深廊/地下；R-S4三日前进入、离开缺。工具走后同类CAND-RELAY-3匿名位又登录7次，角色不依赖工具在场。', links: [...new Set([...current.links, 'research/旧中继L6-Maint-4外侧出口与工具去向.md', 'decisions/接口出向不跨十九年生成目的地.md', ...chaptersFiveHundredFourteenToFiveHundredSixteen])], updatedAt: now() }, 'researcher');
  if (!taskTitles.has('整理旧中继L6-Maint-4外侧出口与工具去向')) {
    const timestamp = now();
    await appendTask({ id: uid('task'), title: '整理旧中继L6-Maint-4外侧出口与工具去向', description: '记录外门定位/权限、四类物证、11m外移、三去向、13.6度历史扇区、R-S4和工具后7次匿名登录。', level: 'session', status: 'completed', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'high', whyNow: '局部接口方向与扎实11米痕迹最易被跨十九年延长成星海—地下路线；姿态、运输、时间、主体必须逐段补齐。', known: ['Maintain-4外门', '工具外移≥11m', '13.6°历史扇区', '工具后7次角色登录'], missingDecisions: [], aiPreAnalysis: '只从外侧定位/微样/磁化计时，恢复历史局部出向后停止，不把今日目标参与拟合。', authorDecision: '不进深层/查人员/改副舰救援；匿名角色只读动作来源端。', agentWork: '已生成research/旧中继L6-Maint-4外侧出口与工具去向.md和decisions/接口出向不跨十九年生成目的地.md。', completionCriteria: ['外门物理终态', '向外通过多源闭合', '历史方向/十九年空白/下一权限完整'], links: ['research/旧中继L6-Maint-4外侧出口与工具去向.md', 'decisions/接口出向不跨十九年生成目的地.md', chaptersFiveHundredFourteenToFiveHundredSixteen[2]], dependencies: [], createdAt: timestamp, updatedAt: timestamp }, 'agent');
  }
  if (!taskTitles.has('续写第517～519章：二十三号工具离开以后同类匿名执行位还登录了七次')) {
    await appendTask({ id: uid('task'), title: '续写第517～519章：二十三号工具离开以后同类匿名执行位还登录了七次', description: '拆7次匿名登录的时间、动作、来源端和撤权，核哪些动作需要23号工具/可由其他设备执行，建立角色池/多执行者边界；完成D-5设备候选阶段并迁移设备证据而人物仍未知。', level: 'chapter', status: 'now', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'critical', whyNow: '同类角色在工具离开后持续登录，直接否定角色只能由23号工具承载；需拆会话/来源/能力，避免七次被合成D-5连续活动。', known: ['工具已出外门', '之后7次登录', '角色同类末位3', '事件含动作摘要/来源端/撤权'], missingDecisions: ['7次是否同会话/同端？', '哪些需实体工具？', '角色池大小与撤权如何？'], aiPreAnalysis: '第517章时序/动作；第518章工具依赖/多端；第519章最小角色模型/阶段结案。', authorDecision: '不恢复身份名单；角色复用是权限事实，不翻人多人少或D-5活动。', agentWork: '', completionCriteria: ['7次无遗漏', '工具依赖逐项', '角色/人物/设备终态与迁移边界'], links: [chaptersFiveHundredFourteenToFiveHundredSixteen[2], 'research/旧中继L6-Maint-4外侧出口与工具去向.md', 'planning/第七卷章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() }, 'navigator');
  }
  const facts: StoryFact[] = [
    { id: uid('fact'), category: 'knowledge', subject: 'M6-01-23通过Maintain-4外门物证', statement: '4槽双刮/3槽半月高钴屑匹配23号，锁舌向外解锁11m20s后回，封固后37m04s；42～58kg移动载荷16分，外门外6m轮痕+5m磁吸，物理套件向外至少11m很高。', status: 'author-confirmed', evidence: [{ filePath: chaptersFiveHundredFourteenToFiveHundredSixteen[1], quote: '磨屑和磁化只把工具送到外门以外十一米。' }], updatedAt: now() },
    { id: uid('fact'), category: 'world-rule', subject: '历史接口出向不得跨时间生成目的地', statement: '局部外门/擦痕/历史姿态只给当时通过与13.6°出向；没有连续运输/轨迹/时间，不连今日2.6°深廊、地下或人物路线。每一步需独立物证。', status: 'author-confirmed', evidence: [{ filePath: chaptersFiveHundredFourteenToFiveHundredSixteen[2], quote: '十九年前的出向扇区不能直接连到今天的地下。' }], updatedAt: now() },
    { id: uid('fact'), category: 'decision', subject: '23号工具外门后三去向', statement: '外侧11m后可能进无人维修艇R-S4、入后来缺失坞架段、或停梁端后随碎片脱离；R-S4三日前入服务区/离开缺、货位磁吸相容，今日残骸/地下/链尾无编号匹配。', status: 'author-confirmed', evidence: [{ filePath: chaptersFiveHundredFourteenToFiveHundredSixteen[2], quote: '其后可能进入R-S4、缺失坞架段或随梁端脱离。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '23号工具离开后匿名执行位7次登录', statement: 'Maintain-4事件计数显示23号工具通过外门后，同类CAND-RELAY-3匿名执行位仍登录7次；证明角色不依赖工具一直在场，下一步只读7次动作/来源/撤权，不查身份。', status: 'text-explicit', evidence: [{ filePath: chaptersFiveHundredFourteenToFiveHundredSixteen[2], quote: '同类匿名执行位还登录了七次。' }], updatedAt: now() }
  ];
  for (const fact of facts) await appendFact(fact);
  await setPosition({ filePath: chaptersFiveHundredFourteenToFiveHundredSixteen[2], stage: '第七卷匿名执行位七次登录与D-5设备候选结案阶段', focus: '续写第517～519章：二十三号工具离开以后同类匿名执行位还登录了七次' });
}

const chaptersFiveHundredSeventeenToFiveHundredNineteen = ['manuscript/第七卷-断星远征/第517章-七次登录来自三个来源端也没有三个姓名.md', 'manuscript/第七卷-断星远征/第518章-七次动作里没有一次必须握着二十三号工具.md', 'manuscript/第七卷-断星远征/第519章-D5设备候选变长了人物候选没有一起变强.md'];
if (chaptersFiveHundredSeventeenToFiveHundredNineteen.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第517～519章'));
  if (current && current.status !== 'completed') await appendTask({ ...current, status: 'completed', agentWork: '工具后7登录跨4会话盐/3散列来源端，4/5仅隔11秒并行；动作读压力桥/确认低压/轮签/失败快照/续禁开舱/撤写/关角色，前5同控制器、第6权限域、第7角色池，无身份开舱等。逐能力依赖：5项纯接口存储权限，禁开由已装桥可做，轮签只需任意合法安全模块；复制环境移23号仍6项、加41号模块7项且保双实例。端C快照由握手自动触发，至少1次自动高证据；第6撤写后第7只撤权。角色=能力集合、会话=生命周期、端=访问范围、载体=动作能力，人0～多。D-5设备/工具/角色链增强，人物无新增；隔离舱身份不迁移。', links: [...new Set([...current.links, 'research/工具离开后七次匿名执行位登录.md', 'decisions/匿名角色复用不推出人物数量.md', ...chaptersFiveHundredSeventeenToFiveHundredNineteen])], updatedAt: now() }, 'researcher');
  if (!taskTitles.has('整理工具离开后七次匿名执行位登录')) {
    const timestamp = now();
    await appendTask({ id: uid('task'), title: '整理工具离开后七次匿名执行位登录', description: '记录7次时序/4会话/3端、动作对象/黄色中态、工具能力依赖/复制重放、自动调度/撤权和D-5设备人物迁移边界。', level: 'session', status: 'completed', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'high', whyNow: '多端/多会话/并行动作最易画多人头像或D-5连续活动；角色能力可由桥/模块/存储与自动承载，不依赖23号工具或当场人员。', known: ['7动作4会话3端', '移工具仍6项', '至少1自动', '人物无新增'], missingDecisions: [], aiPreAnalysis: '按对象哈希/撤权拆生命周期，逐动作做能力依赖并用复制环境验证载体替代。', authorDecision: '不恢复身份；设备阶段成功不要求人物确认，救援对象身份不迁移。', agentWork: '已生成research/工具离开后七次匿名执行位登录.md和decisions/匿名角色复用不推出人物数量.md。', completionCriteria: ['7次无遗漏/无重复', '工具依赖实测', '角色/设备/人物结案分离'], links: ['research/工具离开后七次匿名执行位登录.md', 'decisions/匿名角色复用不推出人物数量.md', chaptersFiveHundredSeventeenToFiveHundredNineteen[2]], dependencies: [], createdAt: timestamp, updatedAt: timestamp }, 'agent');
  }
  if (!taskTitles.has('续写第520～522章：副舰申请归队时军令要求先确认隔离舱里的人是谁')) {
    await appendTask({ id: uid('task'), title: '续写第520～522章：副舰申请归队时军令要求先确认隔离舱里的人是谁', description: '拆军令身份/威胁申报真正需要的气密、病原、权限与行为字段，设计无身份隔离对接包并做舰队威胁演练；处理主体同意与主舰安全，建立身份未知也可有限归队的边界。', level: 'chapter', status: 'now', kind: 'review', assignee: 'editor', source: 'navigator', priority: 'critical', whyNow: '副舰带高候选人类活体和未知气体归队，主舰需安全；姓名既不能证明无病原/无威胁，也未获主体同意。用身份作为对接门会逼医疗对象换救援。', known: ['人类活体意识高候选', '身份未查/未同意', '原气体双膜隔离', '主舰军令身份+威胁要求'], missingDecisions: ['安全对接最小字段？', '何种威胁可在不知身份下评估？', '隔离对象如何表达/拒绝？'], aiPreAnalysis: '第520章拆姓名与风险；第521章无身份对接包/演练；第522章有限对接/权限/同意。', authorDecision: '不以姓名换救援；可隔离/撤回/最小风险字段满足舰体安全，身份待医疗稳定后自愿。', agentWork: '', completionCriteria: ['风险字段不靠身份', '演练覆盖失联/泄漏/行为', '有限对接与身份同意边界完整'], links: [chaptersFiveHundredSeventeenToFiveHundredNineteen[2], 'research/工具离开后七次匿名执行位登录.md', 'planning/第七卷章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() }, 'navigator');
  }
  const facts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '匿名角色复用不推出人物数量', statement: '来源端、会话、角色、工具与人物分别计数；3端/4会话/11秒并行只支持执行链独立，一端可多人自动、多端可一人设备。角色名不承载人或工具身份。', status: 'author-confirmed', evidence: [{ filePath: chaptersFiveHundredSeventeenToFiveHundredNineteen[0], quote: '七次登录来自三个来源端也没有三个姓名。' }], updatedAt: now() },
    { id: uid('fact'), category: 'knowledge', subject: '工具离开后匿名角色七动作能力依赖', statement: '7动作中5项只需接口存储权限，续禁开由已装桥，轮签需任意安全模块；复制环境移23号仍6项，加41号完成7并保历史来源。端C快照至少1次自动高证据，其余人0～多。', status: 'author-confirmed', evidence: [{ filePath: chaptersFiveHundredSeventeenToFiveHundredNineteen[1], quote: '七次动作里没有一次必须握着二十三号工具。' }], updatedAt: now() },
    { id: uid('fact'), category: 'decision', subject: 'D-5设备候选阶段迁移边界', statement: '迁M6-01-23跨端点高、外门≥11m、历史13.6°、3端4会话至少1自动、R-S4候选；不迁舱内身份、D-5存活、今日链尾=历史路线。人物层本阶段无新增。', status: 'author-confirmed', evidence: [{ filePath: chaptersFiveHundredSeventeenToFiveHundredNineteen[2], quote: 'D-5设备候选变长了人物候选没有一起变强。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '副舰归队身份与威胁申报冲突', statement: '副舰携匿名医疗对象申请归队，军令要求先报身份/威胁；主体未同意身份查询且可能无法完整沟通。下一步用气密/病原/权限/行为最小包与隔离演练满足主舰安全，不以姓名换救援。', status: 'text-explicit', evidence: [{ filePath: chaptersFiveHundredSeventeenToFiveHundredNineteen[2], quote: '军令要求先确认隔离舱里的人是谁。' }], updatedAt: now() }
  ];
  for (const fact of facts) await appendFact(fact);
  await setPosition({ filePath: chaptersFiveHundredSeventeenToFiveHundredNineteen[2], stage: '第七卷匿名医疗对象归队与军令安全边界阶段', focus: '续写第520～522章：副舰申请归队时军令要求先确认隔离舱里的人是谁' });
}

const chaptersFiveHundredTwentyToFiveHundredTwentyTwo = ['manuscript/第七卷-断星远征/第520章-姓名不能替主舰判断病原和气密.md', 'manuscript/第七卷-断星远征/第521章-没有姓名的隔离舱也能完成四场威胁演练.md', 'manuscript/第七卷-断星远征/第522章-身份未知没有阻止副舰进入外侧防护圈.md'];
if (chaptersFiveHundredTwentyToFiveHundredTwentyTwo.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第520～522章'));
  if (current && current.status !== 'completed') await appendTask({ ...current, status: 'completed', agentWork: '将军令姓名/总威胁拆为气密、生化、物理、网络权限、行为、身份意图六类：三层气密、生化黄受控、4.7t结构/毫米动作、M6单向白名单、有限遵令、身份未知。无身份泊位只连结构锁/独立供电/物理单向状态，不连大气水废主网；用无害示踪、复制未知包、配重质心、失联大动作完成泄漏/网络/结构/失联四场演练，友军/敌对姓名不改物理结果。同匿名事件ID连续归因。真实100km核版本、20km气体、2km最小无线、500m 5%预载，六带差9%/气密节律稳，额定对接且双方可撤。身份未知不阻有限归队；旧同步每7分钟重复报警成为下一故障。', links: [...new Set([...current.links, 'research/匿名医疗对象无身份隔离归队.md', 'decisions/姓名不是舰体安全字段身份未知可有限对接.md', ...chaptersFiveHundredTwentyToFiveHundredTwentyTwo])], updatedAt: now() }, 'editor');
  if (!taskTitles.has('整理匿名医疗对象无身份隔离归队')) {
    const timestamp = now();
    await appendTask({ id: uid('task'), title: '整理匿名医疗对象无身份隔离归队', description: '记录军令六类风险、无身份泊位三通道/禁止项、四场威胁演练、分级真实对接、同意/权限与7分钟重复警报。', level: 'session', status: 'completed', kind: 'review', assignee: 'editor', source: 'navigator', priority: 'high', whyNow: '姓名不能证明气密/病原/网络安全，身份门会逼医疗对象以身份换救援；安全应由传播路径、权限、行为和可撤回动作证明。', known: ['六类风险', '四场演练', '无身份有限对接', '7分钟重复警报'], missingDecisions: [], aiPreAnalysis: '拆姓名与风险，以同匿名事件ID做隔离演练和距离分级对接。', authorDecision: '不以姓名换救援；自动保持不等同意，身份待稳定后按用途自愿。', agentWork: '已生成research/匿名医疗对象无身份隔离归队.md和decisions/姓名不是舰体安全字段身份未知可有限对接.md。', completionCriteria: ['风险不靠身份', '演练/真实状态闭合', '权限/同意/撤回完整'], links: ['research/匿名医疗对象无身份隔离归队.md', 'decisions/姓名不是舰体安全字段身份未知可有限对接.md', chaptersFiveHundredTwentyToFiveHundredTwentyTwo[2]], dependencies: [], createdAt: timestamp, updatedAt: timestamp }, 'agent');
  }
  if (!taskTitles.has('续写第523～525章：身份未知不是每七分钟重新触发一次全舰警报')) {
    await appendTask({ id: uid('task'), title: '续写第523～525章：身份未知不是每七分钟重新触发一次全舰警报', description: '用医疗事件ID/隔离哈希/泊位闭合同一匿名对象，区分首次发现、状态变化和重复同步警报；修复并回放报警、撤权与对象离开，防去重压掉真实新风险。', level: 'chapter', status: 'now', kind: 'review', assignee: 'editor', source: 'navigator', priority: 'critical', whyNow: '乘员同步只认身份名册，每7分钟把同一匿名对象当新载荷；持续黄警会造成疲劳，简单静音又可能吞掉气密/行为真实变化。', known: ['同一匿名医疗事件ID', '隔离舱/压力袋哈希', '每7分钟乘员同步', '首次后均重复黄警'], missingDecisions: ['对象连续用哪些稳定字段？', '哪些变化必须重新报警？', '离开/撤权后如何结束去重？'], aiPreAnalysis: '第523章归因键；第524章三类警报；第525章真实回放/生命周期。', authorDecision: '去重重复发现不去除身份未知可见；气密/病原/权限/行为变化各自触发新警报。', agentWork: '', completionCriteria: ['同一对象不重复新建', '真实变化不被去重', '离开/重入/撤权回放完整'], links: [chaptersFiveHundredTwentyToFiveHundredTwentyTwo[2], 'research/匿名医疗对象无身份隔离归队.md', 'planning/第七卷章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() }, 'navigator');
  }
  const facts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '姓名与舰体安全风险分离', statement: '对接风险按气密/生化/物理/网络权限/行为/身份意图六类并列；姓名可影响后续权限司法，不生成病原、气密或能力事实。某类未知只限制依赖动作，不合总分。', status: 'author-confirmed', evidence: [{ filePath: chaptersFiveHundredTwentyToFiveHundredTwentyTwo[0], quote: '姓名不能替主舰判断病原和气密。' }], updatedAt: now() },
    { id: uid('fact'), category: 'decision', subject: '匿名医疗对象无身份外侧隔离泊位', statement: '副舰外侧泊位只连结构锁/独立供电/物理单向状态，不连大气、水废、主网；主舰只读六类风险，不能开舱增压查身份，副舰保推进与本地解锁撤回。', status: 'author-confirmed', evidence: [{ filePath: chaptersFiveHundredTwentyToFiveHundredTwentyTwo[1], quote: '没有姓名的隔离舱也能完成四场威胁演练。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '副舰无身份有限归队终态', statement: '100km核版本、20km气体、2km最小无线、500m 5%预载；六带差9%、延伸罩/隔离气密与医疗节律稳，结构锁额定且双方独立撤回。匿名对象不获生活区/大气/主网/控制。', status: 'text-explicit', evidence: [{ filePath: chaptersFiveHundredTwentyToFiveHundredTwentyTwo[2], quote: '有限对接完成。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '匿名对象每7分钟重复全舰黄警', statement: '旧军务乘员同步只认身份名册，同一匿名医疗对象每7分钟被重判新未识别载荷；下一步以事件ID/隔离哈希/泊位闭合生命周期，去重复但保真实状态变化警报。', status: 'text-explicit', evidence: [{ filePath: chaptersFiveHundredTwentyToFiveHundredTwentyTwo[2], quote: '第二次以后只是同一对象被系统忘记了七分钟。' }], updatedAt: now() }
  ];
  for (const fact of facts) await appendFact(fact);
  await setPosition({ filePath: chaptersFiveHundredTwentyToFiveHundredTwentyTwo[2], stage: '第七卷匿名对象警报生命周期与舰内命令修订阶段', focus: '续写第523～525章：身份未知不是每七分钟重新触发一次全舰警报' });
}

const chaptersFiveHundredTwentyThreeToFiveHundredTwentyFive = ['manuscript/第七卷-断星远征/第523章-同一个匿名对象不该每七分钟重新出生一次.md', 'manuscript/第七卷-断星远征/第524章-持续未知和出现新风险不是同一种黄色.md', 'manuscript/第七卷-断星远征/第525章-修掉重复警报以后真实变化仍然响了.md'];
if (chaptersFiveHundredTwentyThreeToFiveHundredTwentyFive.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第523～525章'));
  if (current && current.status !== 'completed') await appendTask({ ...current, status: 'completed', agentWork: '旧姓名主键让同一匿名对象42分钟生成6条并扭曲资源；改救援根事件ID+压力袋/医疗舱关系哈希+隔离泊位承接+占用计数，姓名/身高/动作/工具印不作主键，观测时间不进语义哈希。警报拆首次发现、状态变化、持续未知；12周期只1首次、CO2/M6变化及恢复、离开，其余未知无声有回执。24h影子旧206黄中201重复，新系统1首次/3变化/2恢复/4到期且覆盖旧真实变化；换泊位、同哈希另对象、未来姓名、撤权、离开/重入回放通过。实装前三周期无重复，28分钟外泄+11%仍定向报警，调温恢复且长期未知不涂绿。下一主动请求为关顶灯。', links: [...new Set([...current.links, 'research/匿名医疗对象警报生命周期与去重.md', 'decisions/未知状态持续可见但不重复新建警报.md', ...chaptersFiveHundredTwentyThreeToFiveHundredTwentyFive])], updatedAt: now() }, 'editor');
  if (!taskTitles.has('整理匿名医疗对象警报生命周期与去重')) {
    const timestamp = now();
    await appendTask({ id: uid('task'), title: '整理匿名医疗对象警报生命周期与去重', description: '记录根事件主键、三类警报、12周期/24小时影子、过度去重回放、真实外泄命中与主动关灯请求。', level: 'session', status: 'completed', kind: 'review', assignee: 'editor', source: 'navigator', priority: 'high', whyNow: '姓名空值导致对象每7分钟重生；简单静音会吞气密/权限真实变化。需让未知持续可见而对象/风险生命周期分别归因。', known: ['事件身份四项', '三类警报', '旧206中201重复', '真实外泄仍响'], missingDecisions: [], aiPreAnalysis: '用根事件/物理迁移闭合实体，语义哈希只纳改变动作字段，再做同哈希另物/换泊位/撤权回放。', authorDecision: '去重重复发现不去掉未知；每类风险独立恢复，不让一绿覆盖全部。', agentWork: '已生成research/匿名医疗对象警报生命周期与去重.md和decisions/未知状态持续可见但不重复新建警报.md。', completionCriteria: ['同一实体不重建', '真实变化不丢', '离开重入身份权限生命周期完整'], links: ['research/匿名医疗对象警报生命周期与去重.md', 'decisions/未知状态持续可见但不重复新建警报.md', chaptersFiveHundredTwentyThreeToFiveHundredTwentyFive[2]], dependencies: [], createdAt: timestamp, updatedAt: timestamp }, 'agent');
  }
  if (!taskTitles.has('续写第526～528章：匿名对象第一次主动请求关掉隔离舱的灯')) {
    await appendTask({ id: uid('task'), title: '续写第526～528章：匿名对象第一次主动请求关掉隔离舱的灯', description: '验证关灯请求来自主体还是自动医疗模板，拆请求对象/范围/代价；处理军务行为异常与医疗舒适需求，测试局部调光/监测替代/停止条件，完成可撤回响应与舰内命令阶段。', level: 'chapter', status: 'now', kind: 'review', assignee: 'editor', source: 'navigator', priority: 'critical', whyNow: '这是第一条模板外主动环境请求；军务把未识别对象改变舰内环境标异常，但无差别拒绝会让身份未知者失去基本舒适与沟通权，直接关灯又影响监测。', known: ['请求关闭正上方持续照明', '模板外主动请求', '隔离需光学监测', '军务标行为异常'], missingDecisions: ['请求是主体还是自动系统？', '关哪盏/多久/保何监测？', '何种变化触发恢复照明？'], aiPreAnalysis: '第526章来源/范围；第527章三照明方案与监测；第528章真实可撤响应/阶段结案。', authorDecision: '主动请求不等敌意或无限控制；先给最小可撤舒适变化并保安全替代。', agentWork: '', completionCriteria: ['请求来源边界', '舒适/监测双终态', '撤回/同意/权限不扩张'], links: [chaptersFiveHundredTwentyThreeToFiveHundredTwentyFive[2], 'research/匿名医疗对象警报生命周期与去重.md', 'planning/第七卷章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() }, 'navigator');
  }
  const facts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '匿名对象事件身份与姓名分离', statement: '对象连续由救援根事件、物理关系、隔离泊位承接和占用计数建立；姓名未来关联不替根，内容/位置变化显式迁移。同哈希异根不合并，同根哈希变不新建。', status: 'author-confirmed', evidence: [{ filePath: chaptersFiveHundredTwentyThreeToFiveHundredTwentyFive[0], quote: '同一个匿名对象不该每七分钟重新出生一次。' }], updatedAt: now() },
    { id: uid('fact'), category: 'decision', subject: '匿名对象三类警报与持续未知', statement: '首次新根/物/泊位报警；六类风险/承接变化重报；身份病原等持续未知保持面板/交班/到期而不全舰重复。观测时间独立，不进改变安全动作的语义哈希。', status: 'author-confirmed', evidence: [{ filePath: chaptersFiveHundredTwentyThreeToFiveHundredTwentyFive[1], quote: '持续未知和出现新风险不是同一种黄色。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '全舰匿名对象重复黄警修复', statement: '24h旧206黄中201为同步重复；新系统1首次/3状态/2恢复/4到期并保旧5类真实变化。实装前三周期无重复，28分钟外泄+11%仍报警，延伸罩调温后恢复且病原身份未知保留。', status: 'text-explicit', evidence: [{ filePath: chaptersFiveHundredTwentyThreeToFiveHundredTwentyFive[2], quote: '修掉重复警报以后真实变化仍然响了。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '匿名医疗对象主动关灯请求', statement: '归队第6小时，医疗对象通过接口首次发模板外请求：关闭隔离舱正上方持续照明；军务行为系统标异常。下一步核主体/自动来源并试局部调光、监测替代与可撤回响应。', status: 'text-explicit', evidence: [{ filePath: chaptersFiveHundredTwentyThreeToFiveHundredTwentyFive[2], quote: '请求关闭隔离舱正上方的持续照明。' }], updatedAt: now() }
  ];
  for (const fact of facts) await appendFact(fact);
  await setPosition({ filePath: chaptersFiveHundredTwentyThreeToFiveHundredTwentyFive[2], stage: '第七卷匿名对象主动请求与舰内命令边界阶段', focus: '续写第526～528章：匿名对象第一次主动请求关掉隔离舱的灯' });
}

const chaptersFiveHundredTwentySixToFiveHundredTwentyEight = ['manuscript/第七卷-断星远征/第526章-关灯请求来自占用者通道不等于命令.md', 'manuscript/第七卷-断星远征/第527章-关掉正上方白灯没有关掉全部监测.md', 'manuscript/第七卷-断星远征/第528章-回应一项请求没有把隔离舱控制权交出去.md'];
if (chaptersFiveHundredTwentySixToFiveHundredTwentyEight.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第526～528章'));
  if (current && current.status !== 'completed') await appendTask({ ...current, status: 'completed', agentWork: '关灯请求来自占用者偏好通道、带当前会话/灯哈希，非安全/自动模板；复制控制器不生成，字段改位签名失败，主体主动高候选。请求只指正上方持续白灯、执行权0，军务由行为异常改未执行偏好。拆持续白灯/侧定位/热微振/短时复核；25%白灯分辨1.8mm仍持续，关顶灯+最低侧灯+近红外1.6～1.7mm，全部可见关则结构3.4mm/漏手部。选第二方案，设能量温度、分辨>2mm、结构生命/接口停止等撤回门，先降25%再关；6h气密/节律/监测持续，保4秒未观测窗。响应不授灯控/不查身份，恢复需触发和告知。第7小时发现12未知外部热源，时间/传感不支持与关灯因果。', links: [...new Set([...current.links, 'research/匿名对象关灯请求与可撤回环境响应.md', 'decisions/主动请求是输入不是控制权也不自动等敌意.md', ...chaptersFiveHundredTwentySixToFiveHundredTwentyEight])], updatedAt: now() }, 'editor');
  if (!taskTitles.has('整理匿名对象关灯请求与可撤回环境响应')) {
    const timestamp = now();
    await appendTask({ id: uid('task'), title: '整理匿名对象关灯请求与可撤回环境响应', description: '记录请求来源/权限、四监测通道、三照明方案、真实6小时、请求/控制/敌意边界与12外部热源。', level: 'session', status: 'completed', kind: 'review', assignee: 'editor', source: 'navigator', priority: 'high', whyNow: '未识别对象表达环境需求容易被军务翻成控制尝试；直接拒绝又把身份未知者排除基本舒适。请求、执行权、响应和安全需分开。', known: ['占用者偏好通道', '关顶灯范围', '近红外替代', '6h可持续'], missingDecisions: [], aiPreAnalysis: '核模板/签名与对象哈希，拆监测通道并影子验证最小可撤响应。', authorDecision: '请求不等敌意/控制权，不要求主体致谢；下一环境请求重新审。', agentWork: '已生成research/匿名对象关灯请求与可撤回环境响应.md和decisions/主动请求是输入不是控制权也不自动等敌意.md。', completionCriteria: ['请求来源边界', '监测/舒适双完成', '权限/撤回/隐私完整'], links: ['research/匿名对象关灯请求与可撤回环境响应.md', 'decisions/主动请求是输入不是控制权也不自动等敌意.md', chaptersFiveHundredTwentySixToFiveHundredTwentyEight[2]], dependencies: [], createdAt: timestamp, updatedAt: timestamp }, 'agent');
  }
  if (!taskTitles.has('续写第529～531章：关灯以后断星碎片背面亮起十二个不属于舰队的热源')) {
    await appendTask({ id: uid('task'), title: '续写第529～531章：关灯以后断星碎片背面亮起十二个不属于舰队的热源', description: '核12热源方位/速度/同步/碎片反射，先拆设备、生物、假影；建立威胁/接触/撤退三轴且不把匿名对象写预警者，完成首轮被动接近与一次真实硬门，决定战斗/接触/规避。', level: 'chapter', status: 'now', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'critical', whyNow: '12热源接近防护圈，时间上晚于关灯但来源为外侧远距阵列；若强连请求会给匿名对象预知能力，若先标敌军会跳过设备/生物/反射。', known: ['12热源', '碎片阴影同步移动', '接近防护圈', '与关灯无因果证据'], missingDecisions: ['热源是否独立目标？', '速度/能量/响应？', '哪条硬门触发战斗或规避？'], aiPreAnalysis: '第529章多阵列/反射；第530章三轴候选；第531章被动接近/硬门决议。', authorDecision: '不问匿名对象解释关灯；先以外部证据判断，不把未知运动自动翻敌意。', agentWork: '', completionCriteria: ['12数目/假影闭合', '三轴不互借', '首轮动作/停止/终态完整'], links: [chaptersFiveHundredTwentySixToFiveHundredTwentyEight[2], 'research/匿名对象关灯请求与可撤回环境响应.md', 'planning/第七卷章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() }, 'navigator');
  }
  const facts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '主动请求与环境控制权分离', statement: '占用者请求只提供需求/对象/范围，执行权限和舰队响应另审；合法表达不算控制尝试，未经授权写入/绕过/拒绝后升级才越权。满足一次不授权其他系统。', status: 'author-confirmed', evidence: [{ filePath: chaptersFiveHundredTwentySixToFiveHundredTwentyEight[2], quote: '回应一项请求没有把隔离舱控制权交出去。' }], updatedAt: now() },
    { id: uid('fact'), category: 'knowledge', subject: '匿名对象关顶灯请求来源', statement: '请求来自占用者偏好通道、当前会话与灯对象哈希，非安全/自动模板；复制控制器不生成/篡位签名失败，主体或辅助输入主动高候选。范围仅正上方持续白灯，执行权限0。', status: 'author-confirmed', evidence: [{ filePath: chaptersFiveHundredTwentySixToFiveHundredTwentyEight[0], quote: '关灯请求来自占用者通道不等于命令。' }], updatedAt: now() },
    { id: uid('fact'), category: 'timeline', subject: '隔离舱关顶灯近红外替代终态', statement: '拆白灯/侧灯/热微振/短时复核，选关顶灯+最低侧灯+近红外；分辨1.6～1.7mm，6h气密六带胸廓CO2接口稳定，4秒红外未观测由气体/结构承接，恢复25%白灯需具体门。', status: 'text-explicit', evidence: [{ filePath: chaptersFiveHundredTwentySixToFiveHundredTwentyEight[2], quote: '局部关灯持续六小时。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '断星碎片背面12未知热源', statement: '关顶灯后6h47，外侧远距阵列见12热源沿碎片阴影同步接近防护圈；传感与时间不足以关联关灯请求。下一步拆设备/生物/反射并建威胁接触撤退三轴。', status: 'text-explicit', evidence: [{ filePath: chaptersFiveHundredTwentySixToFiveHundredTwentyEight[2], quote: '十二个热源沿碎片阴影同步移动' }], updatedAt: now() }
  ];
  for (const fact of facts) await appendFact(fact);
  await setPosition({ filePath: chaptersFiveHundredTwentySixToFiveHundredTwentyEight[2], stage: '第七卷断星碎片十二热源首轮接近阶段', focus: '续写第529～531章：关灯以后断星碎片背面亮起十二个不属于舰队的热源' });
}

const chaptersFiveHundredTwentyNineToFiveHundredThirtyOne = ['manuscript/第七卷-断星远征/第529章-十二个热源里有三个只存在于同一个观察角.md', 'manuscript/第七卷-断星远征/第530章-六个有机热源和三个机械热源没有共享同一种目的.md', 'manuscript/第七卷-断星远征/第531章-第一条红线来自挡住返航的冷网.md'];
if (chaptersFiveHundredTwentyNineToFiveHundredThirtyOne.every((file) => state.files.some((item) => item.path === file))) {
  const current = state.tasks.find((item) => item.title.includes('第529～531章'));
  if (current && current.status !== 'completed') await appendTask({ ...current, status: 'completed', agentWork: '多角阵列把12热斑拆成9物理源与3个只在单观察角成立的碎片磁场反射；9物理源再分4趋热柔性、2跟随阴影与3刚性机械。三刚性源展开420米低温网面，未锁定/警告/加速，却使副舰原绿色返航廊转红。无载冷探针靠近后网面收紧17厘米，两阴影源通过时局部放松；低功率航路占用图后网面仅上移120米，不足以证明响应。舰队不穿网不毁网，用可撤热诱导与碎片脊绕行；三只趋热个体继续追逐标记器，第四只脱离并接近副舰匿名医疗隔离舱，单体升红而其余不批量变红。江砚受舰上刚桥二成与出舱许可限制，只进入外侧防护岗位。真实UI Observer发现并复查通过四个趋热源的数量闭合。', links: [...new Set([...current.links, 'research/断星十二热源多阵列首轮分类.md', 'decisions/同步移动不等统一指挥热源不等敌意.md', ...chaptersFiveHundredTwentyNineToFiveHundredThirtyOne])], updatedAt: now() }, 'researcher');
  if (!taskTitles.has('整理断星十二热源多阵列首轮分类')) {
    const timestamp = now();
    await appendTask({ id: uid('task'), title: '整理断星十二热源多阵列首轮分类', description: '记录12观测到9物理源的多角去影、4趋热/2阴影/3刚性分类、冷网探针与航路占用测试、返航绕行及单体威胁终态。', level: 'session', status: 'completed', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'high', whyNow: '碎片反射、热行为和网面阻路不能合成敌意总分；下一批将直接承接四个趋热个体与隔离舱，需要先闭合数目和行为证据。', known: ['3假影', '4趋热/2阴影/3刚性', '420米冷网', '三追一脱离'], missingDecisions: [], aiPreAnalysis: '以多角复现/材料行为/可逆探针和航路测试逐层分类，不从同步移动推统一指挥。', authorDecision: '阻路先触发返航硬门，不自动升级敌方；单体越线单独升红，其他来源不批量继承。', agentWork: '已生成research/断星十二热源多阵列首轮分类.md和decisions/同步移动不等统一指挥热源不等敌意.md，并经真实UI Observer修正趋热个体计数。', completionCriteria: ['12到9分类闭合', '威胁/接触/返航三轴分离', '绕行/单体升红/下一任务完整'], links: ['research/断星十二热源多阵列首轮分类.md', 'decisions/同步移动不等统一指挥热源不等敌意.md', chaptersFiveHundredTwentyNineToFiveHundredThirtyOne[2]], dependencies: [], createdAt: timestamp, updatedAt: timestamp }, 'agent');
  }
  if (!taskTitles.has('续写第532～534章：三只趋热个体继续追逐空标记器第四只却停在副舰隔离舱外')) {
    await appendTask({ id: uid('task'), title: '续写第532～534章：三只趋热个体继续追逐空标记器第四只却停在副舰隔离舱外', description: '保持三追一停的四个趋热个体闭合，分别验证停靠者对隔离舱热量、匿名医疗接口、舰体动作和空标记器的响应；以可撤屏障/诱导/距离门阻止越线，不借其他八个来源的状态判断该单体意图。', level: 'chapter', status: 'now', kind: 'research', assignee: 'researcher', source: 'navigator', priority: 'critical', whyNow: '第四只已脱离群体并指向匿名医疗隔离舱；它可能追热、识别医疗接口、跟随冷网局部规则或偶然停靠，直接攻击或接触都会跳过可逆证据。', known: ['三只继续追逐空标记器', '第四只停在副舰隔离舱外', '单体威胁已升红', '隔离舱对象身份未知'], missingDecisions: ['停靠距离/热相位是否稳定？', '屏障与诱导分别改变什么？', '何种越线才开放江砚战斗权限？'], aiPreAnalysis: '第532章四体计数/相位；第533章三种可撤刺激；第534章单体接触或规避终态。', authorDecision: '不把趋向隔离舱写成救援或攻击；只按该个体可见动作升级，其他热源不连坐。', agentWork: '', completionCriteria: ['四个趋热个体全程闭合', '至少两种可撤反例有结果', '隔离舱/战斗/接触硬门明确'], links: [chaptersFiveHundredTwentyNineToFiveHundredThirtyOne[2], 'research/断星十二热源多阵列首轮分类.md', 'planning/第七卷章纲.md'], dependencies: [], createdAt: now(), updatedAt: now() }, 'navigator');
  }
  const facts: StoryFact[] = [
    { id: uid('fact'), category: 'world-rule', subject: '断星热源威胁接触返航三轴分离', statement: '同步移动、同温或同处碎片阴影不证明统一指挥；威胁按锁定/能量/越线，接触按可重复响应，返航按航路占用分别判断。一轴转红不批量改写其他来源或另两轴。', status: 'author-confirmed', evidence: [{ filePath: chaptersFiveHundredTwentyNineToFiveHundredThirtyOne[1], quote: '没有共享同一种目的' }], updatedAt: now() },
    { id: uid('fact'), category: 'knowledge', subject: '断星十二热源首轮分类', statement: '多角阵列确认12观测中3为单角反射、9为物理源；物理源为4趋热柔性、2跟随阴影、3刚性机械。三刚性源共同展开420米低温网面，具体材料与目的未知。', status: 'author-confirmed', evidence: [{ filePath: chaptersFiveHundredTwentyNineToFiveHundredThirtyOne[2], quote: '三个热斑是假影。' }], updatedAt: now() },
    { id: uid('fact'), category: 'decision', subject: '冷网返航硬门与绕行', statement: '冷网无锁定/警告仍阻断绿色返航；探针仅靠近、航路图仅建议，120米移动不足以确认接触。舰队用热诱导和碎片脊绕行，不穿网不毁网，阻路不自动命名敌方。', status: 'author-confirmed', evidence: [{ filePath: chaptersFiveHundredTwentyNineToFiveHundredThirtyOne[2], quote: '返航硬门由绕行解除，冷网未穿未毁。' }], updatedAt: now() },
    { id: uid('fact'), category: 'promise', subject: '四个趋热个体三追一停', statement: '四个趋热源中三只继续追逐空标记器，第四只脱离诱导并停在副舰匿名医疗隔离舱外；该单体升红，其他8个物理来源不连坐。下一步以可撤刺激判断追热、接口响应或越线。', status: 'text-explicit', evidence: [{ filePath: chaptersFiveHundredTwentyNineToFiveHundredThirtyOne[2], quote: '下一任务第532～534章：三只趋热个体继续追逐空标记器，第四只却停在副舰隔离舱外。' }], updatedAt: now() }
  ];
  for (const fact of facts) await appendFact(fact);
  await setPosition({ filePath: chaptersFiveHundredTwentyNineToFiveHundredThirtyOne[2], stage: '第七卷四个趋热个体与匿名隔离舱首轮接触阶段', focus: '续写第532～534章：三只趋热个体继续追逐空标记器第四只却停在副舰隔离舱外' });
}

const updated = await project.state();
process.stdout.write(`${JSON.stringify({ stats: updated.manuscriptStats, currentTask: updated.continueCard.focus, facts: updated.facts.length }, null, 2)}\n`);
