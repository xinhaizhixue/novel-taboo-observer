import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { AgentHub } from '../electron/main/agents/hub.js';
import { ProjectService } from '../electron/main/project.js';
import { AuthorProfileStore } from '../electron/main/profile.js';
import type { AgentAdapter, AdapterRunOptions, AdapterRunResult } from '../electron/main/agents/adapter.js';
const roots:string[]=[];
afterEach(async()=>{await Promise.all(roots.splice(0).map(root=>rm(root,{recursive:true,force:true})));});
async function setup(invalid=false, hold=false, wrapped=false) {
 const root=await mkdtemp(path.join(os.tmpdir(),'two-pass-'));roots.push(root);
 const project=new ProjectService('two-pass');await project.create({root:path.join(root,'novel'),title:'样本',kind:'novel'});
 const file=await project.readFile('manuscript/第一章.md');
 const calls:AdapterRunOptions[]=[];
 const adapter:AgentAdapter={id:'claude',info:async()=>({id:'claude',name:'test',available:true,command:'test',capabilities:{} as never}),run:options=>{
   calls.push(options);let resolve!:(r:Awaited<AdapterRunResult['completed']>)=>void;
   const completed=new Promise<Awaited<AdapterRunResult['completed']>>(r=>resolve=r);
   const originalQuote=invalid?'不存在的句子':file.content;
   const output=options.pureText ? {readings:[{filePath:file.path,quote:wrapped?`“${originalQuote}”`:originalQuote,understanding:'只根据正文阅读',frictions:[]}]} : {summary:'第二遍完成',comments:[],reviewResult:'not-applicable'};
   if(!hold)resolve({finalMessage:JSON.stringify(output),exitCode:0,raw:[]});
   return {completed,process:{kill:()=>{resolve({finalMessage:'',exitCode:143,raw:[]});return true;}} as never};
 }};
 const hub=new AgentHub(path.join(root,'runtime'),project,new AuthorProfileStore(path.join(root,'runtime')),[adapter]);
 const task=await hub.runObserver({adapterId:'claude',mode:'manual',snapshot:{...file,filePath:file.path,id:'snapshot',editorVersion:0,createdAt:new Date().toISOString()},contextPack:{id:'test',task:'读稿',budget:1000,characters:10,createdAt:'now',gaps:[],items:[{id:'hidden',kind:'canon',title:'写作意图',source:'canon',content:'SECRET_OUTLINE',reason:'context',characters:10,included:true}]}});
 return {hub,task,project,calls};
}
it('第一遍不收到写作意图、在独立目录运行，第二遍收到已保存的初读证据',async()=>{
 const {hub,task,project,calls}=await setup();await hub.waitForTask(task.id);
 expect(calls).toHaveLength(2);expect(calls[0].pureText).toBe(true);expect(calls[0].root).not.toBe(project.activeRoot);expect(calls[0].prompt).not.toContain('SECRET_OUTLINE');
 expect(calls[1].root).toBe(project.activeRoot);expect(calls[1].prompt).toContain('SECRET_OUTLINE');expect(calls[1].prompt).toContain('只根据正文阅读');
 expect((await project.state()).reviews?.[0].coldReading?.readings).toHaveLength(1);
});
it('第一遍伪造引文时失败，不能继续第二遍或宣称通过',async()=>{
 const {hub,task,calls}=await setup(true);await hub.waitForTask(task.id);expect(calls).toHaveLength(1);expect((await hub.record(task.id))?.state).toBe('failed');
});
it('展示引号逐字核对后继续第二遍，原始输出和格式处理记录均保留',async()=>{
 const {hub,task,project,calls}=await setup(false,false,true);await hub.waitForTask(task.id);
 expect(calls).toHaveLength(2);
 const file=await project.readFile('manuscript/第一章.md');
 const report=(await project.state()).reviews?.[0];
 expect(report?.coldReading?.readings[0].quote).toBe(file.content);
 expect(report?.quoteNormalizations).toEqual([{filePath:file.path,originalQuote:`“${file.content}”`,quote:file.content,phase:'reading'}]);
 const original=JSON.parse(await readFile(path.join(path.dirname(calls[0].outputPath),'cold-reading-original.json'),'utf8'));
 expect(original.readings[0].quote).toBe(`“${file.content}”`);
});
it('展示引号内部没有逐字来源时仍拒绝，不启动第二遍',async()=>{
 const {hub,task,calls}=await setup(true,false,true);await hub.waitForTask(task.id);
 expect(calls).toHaveLength(1);expect((await hub.record(task.id))?.state).toBe('failed');
});
it('取消第一遍后不启动第二遍',async()=>{
 const {hub,task,calls}=await setup(false,true);await hub.cancel(task.id);expect(calls).toHaveLength(1);expect((await hub.record(task.id))?.state).toBe('cancelled');
});
