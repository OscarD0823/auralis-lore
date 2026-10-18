/// <reference lib="webworker" />
import {Wllama} from '@wllama/wllama/esm/index.js';
import {readAIModel,readAIRuntimes} from './local-ai-storage';
import {aiLimits,localAIModel} from './local-ai-model';
import type {AIRequest,AIReply} from './local-ai-protocol';
const scope=self as unknown as DedicatedWorkerGlobalScope;
let engine:Wllama|undefined,busy=false;
const reply=(type:AIReply['type'],text:string)=>scope.postMessage({type,text} satisfies AIReply);
scope.onmessage=async(event:MessageEvent<AIRequest>)=>{
 if(busy)return;busy=true;
 try{
  if(!engine){
   const blob=await readAIModel();if(blob?.size!==localAIModel.bytes)throw Error('Primero descarga la IA local.');
   reply('status','Cargando el modelo en este dispositivo…');
   const [standard]=await readAIRuntimes(),urls=[URL.createObjectURL(standard)];
   try{
    engine=new Wllama({'single-thread/wllama.wasm':urls[0]},{suppressNativeLog:true,logger:{debug:()=>{},log:()=>{},warn:()=>{},error:()=>reply('error','El motor local no pudo completar la operación. Prueba un fragmento más corto o el corrector ligero.')}});
    await engine.loadModel([blob],{n_ctx:aiLimits.context,n_batch:aiLimits.batch,n_threads:aiLimits.threads});
   }finally{urls.forEach(url=>URL.revokeObjectURL(url));}
  }
  reply('status','Revisando localmente…');
  const answer=await engine.createChatCompletion(event.data.messages,{nPredict:aiLimits.output,sampling:{temp:.15},onNewToken:(_token,_piece,text)=>reply('text',text)});
  if(!answer.trim())throw Error('El modelo no devolvió una sugerencia. Prueba una pregunta más concreta.');reply('done',answer);
 }catch(e){reply('error',e instanceof Error?e.message:String(e));}finally{busy=false;}
};
