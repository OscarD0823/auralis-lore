import {aiLimits,reviewMessages,type LocalMessage,type ReviewKind} from './local-ai-model';
import type {AIReply,AIRequest} from './local-ai-protocol';

/** The outer worker owns the model and its nested WASM worker. Termination also
 * cancels loading, which an inference-only AbortSignal cannot interrupt. */
export class LocalEditorialAI{
 private worker:Worker|undefined;private pending:{resolve:(answer:string)=>void;reject:(reason:Error)=>void;status:(s:string)=>void;onText:(s:string)=>void}|undefined;
 private deadline:ReturnType<typeof setTimeout>|undefined;private idle:ReturnType<typeof setTimeout>|undefined;private closed=false;
 constructor(private createWorker=()=>new Worker(new URL('./local-ai.worker.ts',import.meta.url),{type:'module'})){}
 async ask(kind:ReviewKind,text:string,context:string,question:string,history:LocalMessage[],status:(message:string)=>void,onText:(text:string)=>void){
  if(this.closed)throw Error('La IA se ha cerrado.');if(this.pending)throw Error('Espera a que termine la consulta actual.');clearTimeout(this.idle);
  if(!this.worker){
   this.worker=this.createWorker();
   this.worker.onmessage=(event:MessageEvent<AIReply>)=>{
    const pending=this.pending;if(!pending)return;const message=event.data;
    if(message.type==='status')pending.status(message.text);
    else if(message.type==='text')pending.onText(message.text);
    else if(message.type==='error')this.terminate(new Error(message.text));
    else{this.pending=undefined;clearTimeout(this.deadline);pending.resolve(message.text);this.idle=setTimeout(()=>this.terminate(),aiLimits.idleMs);}
   };
   this.worker.onerror=()=>this.terminate(Error('No se pudo iniciar la IA en este dispositivo. Usa el corrector ligero o prueba un navegador actualizado.'));
  }
  return await new Promise<string>((resolve,reject)=>{
   this.pending={resolve,reject,status,onText};this.deadline=setTimeout(()=>this.terminate(Error('La revisión tardó demasiado. Prueba un fragmento más corto.')),aiLimits.timeoutMs);
   try{this.worker!.postMessage({messages:reviewMessages(kind,text,context,question,history)} satisfies AIRequest);}catch(e){this.terminate(e instanceof Error?e:Error(String(e)));}
  });
 }
 private terminate(reason=Error('Consulta cancelada.')){clearTimeout(this.deadline);clearTimeout(this.idle);if(this.worker){this.worker.onmessage=null;this.worker.onerror=null;this.worker.terminate();}this.worker=undefined;const pending=this.pending;this.pending=undefined;pending?.reject(reason);}
 cancel(){this.terminate();}
 async unload(){this.terminate();}
 async close(){this.closed=true;this.terminate();}
}
