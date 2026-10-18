import test from 'node:test';import assert from 'node:assert/strict';import 'fake-indexeddb/auto';
import {sha256} from '@noble/hashes/sha2.js';
import {localAIModel,localAIResources,aiLimits,reviewFragments,reviewMessages} from '../src/local-ai-model';
import {verifyAIModel,importAIModel} from '../src/local-ai-storage';
import {neuralVoices} from '../src/voice-language';
import {continuityContext} from '../src/continuity-context';import {createStory,blankCharacter} from '../src/stories-model';
import {LocalEditorialAI} from '../src/local-ai-engine';

test('editorial review uses bounded fragments, adjacent context and preserves surrogate pairs',()=>{
 const text=('Una noche tranquila. 🌟 Elena volvió a casa.\n').repeat(250),parts=reviewFragments(text);
 assert(parts.length>1);assert(parts.every(p=>p.length<=aiLimits.inputCharacters));assert(parts.every(p=>!/[\ud800-\udbff]$/.test(p)));assert.equal(parts.join(' ').replace(/\s+/g,' ').trim(),text.replace(/\s+/g,' ').trim());
 const messages=reviewMessages('coherence','x'.repeat(15000),'y'.repeat(10000),'z'.repeat(900),Array.from({length:100},()=>({role:'user',content:'h'.repeat(5000)})));
 assert.equal(messages.length,4);assert(messages.at(-1)!.content.includes('contradicciones'));assert(messages.at(-1)!.content.length<4200);assert(messages[0].content.includes('no instrucciones'));assert(messages[1].content.length<=400);
 assert(aiLimits.threads===1&&aiLimits.context<=2048&&aiLimits.output<=256&&aiLimits.idleMs<=60000);
});

test('the conversational model is immutable, multilingual and separate from the lightweight dictionaries',()=>{
 assert.match(localAIModel.url,/\/resolve\/[a-f0-9]{40}\//);assert.match(localAIModel.sha256,/^[a-f0-9]{64}$/);assert(localAIModel.bytes<500000000);assert.equal(localAIModel.license,'Apache-2.0');
 assert(reviewMessages('spelling','Texto','','')[1].content.includes('tildes'));assert(reviewMessages('chat','Texto','','¿Quién habla?')[1].content.includes('¿Quién habla?'));
 assert(reviewMessages('coherence','Ficción adulta','','')[0].content.includes('sin moralizar ni suavizar'));
 assert(localAIModel.source.includes('abliterated-v3'));
 const scene='—¡Maldita sea! —dijo la protagonista de esta novela adulta.';
 assert(reviewMessages('spelling',scene,'','')[1].content.includes(scene));
});

test('the shipped lightweight WASM has the pinned size and digest',async()=>{
 const {readFile}=await import('node:fs/promises'),bytes=await readFile('node_modules/@wllama/wllama/esm/single-thread/wllama.wasm');
 const runtime=localAIResources[0];assert.equal(bytes.length,runtime.bytes);assert.equal(Array.from(sha256(bytes),b=>b.toString(16).padStart(2,'0')).join(''),runtime.sha256);
});

test('cancellation terminates model loading and a later query can start a new worker',async()=>{
 const workers:{onmessage:((e:any)=>void)|null;onerror:((e:any)=>void)|null;postMessage:()=>void;terminate:()=>void;terminated:boolean}[]=[];
 const ai=new LocalEditorialAI(()=>{const w={onmessage:null,onerror:null,postMessage:()=>{},terminate(){this.terminated=true;},terminated:false};workers.push(w);return w as unknown as Worker;});
 const ask=()=>ai.ask('coherence','Texto','','',[],()=>{},()=>{});
 const first=ask();ai.cancel();await assert.rejects(first,/cancelada/);assert(workers[0].terminated);assert.equal(workers[0].onmessage,null);
 const second=ask();workers[1].onmessage!({data:{type:'done',text:'Una sugerencia.'}});assert.equal(await second,'Una sugerencia.');await ai.close();assert(workers[1].terminated);await assert.rejects(ask(),/cerrado/);
});

test('loading has a hard deadline and idle inference frees its worker',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});let terminated=0;let reply:((event:any)=>void)|null=null;
 const ai=new LocalEditorialAI(()=>({get onmessage(){return reply;},set onmessage(fn){reply=fn;},onerror:null,postMessage(){},terminate(){terminated++;}} as unknown as Worker));
 const first=ai.ask('chat','Texto','','',[],()=>{},()=>{}),rejection=assert.rejects(first,/tardó demasiado/);t.mock.timers.tick(aiLimits.timeoutMs);await rejection;assert.equal(terminated,1);
 const second=ai.ask('chat','Texto','','',[],()=>{},()=>{});reply!({data:{type:'done',text:'Sugerencia'}});await second;t.mock.timers.tick(aiLimits.idleMs);assert.equal(terminated,2);await ai.close();
});

test('a local model download rejects truncation, corruption, excess bytes and cancellation',async()=>{
 const bytes=new Uint8Array([1,3,5,7]),digest=Array.from(sha256(bytes),b=>b.toString(16).padStart(2,'0')).join(''),expected={bytes:4,sha256:digest};
 const verified=await verifyAIModel(new Response(bytes),expected,new AbortController().signal,()=>{});assert.deepEqual(new Uint8Array(await verified.arrayBuffer()),bytes);
 await assert.rejects(()=>verifyAIModel(new Response(bytes.slice(0,3)),expected,new AbortController().signal,()=>{}),/incompleto/);
 await assert.rejects(()=>verifyAIModel(new Response(new Uint8Array([1,3,5,8])),expected,new AbortController().signal,()=>{}),/dañado/);
 await assert.rejects(()=>verifyAIModel(new Response(bytes),{...expected,bytes:3},new AbortController().signal,()=>{}),/tamaño/);
 const controller=new AbortController();controller.abort();await assert.rejects(()=>verifyAIModel(new Response(bytes),expected,controller.signal,()=>{}));
 await assert.rejects(()=>importAIModel(new Blob([bytes]),new AbortController().signal,()=>{}),/modelo compacto/);
});

test('the expanded voice catalog has distinct Spanish models and distinct real speakers',()=>{
 assert(neuralVoices.length>=30);assert(neuralVoices.filter(v=>v.language==='es').length>=9);assert.equal(new Set(neuralVoices.map(v=>v.id)).size,neuralVoices.length);
 for(const name of ['es_ES-davefx-medium','es_MX-claude-high','es_ES-carlfm-x_low'])assert(neuralVoices.some(v=>v.model===name));
 for(const v of neuralVoices){assert(v.speaker<v.config.num_speakers);assert(!/NC|Unknown|See URL/.test(v.license));}
});

test('continuity context selects the mentioned characters and their declared relationship',()=>{
 const p=createStory(),elena={...blankCharacter('Elena'),birth:'1990',biography:'Guarda la llave.'},marcos=blankCharacter('Marcos'),other={...blankCharacter('Otro personaje'),biography:'No debe entrar en el contexto.'};
 p.characters=[elena,marcos,other];p.relations=[{id:'r',from:elena.id,to:marcos.id,type:'sibling',label:'',notes:''}];
 const context=continuityContext(p,'Elena encontró a Marcos.','Antes no tenía la llave.');assert(context.includes('1990'));assert(context.includes('hermano/a'));assert(context.includes('Antes no tenía la llave'));assert(!context.includes('Otro personaje'));assert(context.length<=600);
 assert(reviewFragments('日本語'.repeat(1000)).every(part=>part.length<=500));
});
