import {sha256} from '@noble/hashes/sha2.js';
import {localAIModel,localAIResources} from './local-ai-model';
import {applicationResourceBase} from '@prisma/core/resource-base';
const name='auralis-lore-local-ai';
const db=()=>new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open(name,1);r.onupgradeneeded=()=>r.result.createObjectStore('models');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
async function access<T>(mode:IDBTransactionMode,job:(store:IDBObjectStore)=>IDBRequest<T>){const database=await db();try{return await new Promise<T>((resolve,reject)=>{const tx=database.transaction('models',mode),r=job(tx.objectStore('models'));tx.oncomplete=()=>resolve(r.result);tx.onabort=()=>reject(tx.error??Error('No se pudo guardar el modelo local.'));tx.onerror=()=>reject(tx.error);});}finally{database.close();}}
export const readAIModel=()=>access('readonly',s=>s.get(localAIModel.sha256)) as Promise<Blob|undefined>;
export const removeAIModel=()=>access('readwrite',s=>{s.delete(localAIModel.sha256);for(const resource of localAIResources)s.delete('runtime-'+resource.sha256);return s.count();});
export async function readAIRuntimes(){
 const blobs=await Promise.all(localAIResources.map(r=>access('readonly',s=>s.get('runtime-'+r.sha256)) as Promise<Blob|undefined>));
 if(blobs.some((b,i)=>b?.size!==localAIResources[i].bytes))throw Error('Prepara de nuevo la descarga de IA para guardar el motor sin conexión.');
 return blobs as Blob[];
}
export async function obtainAIRuntime(signal:AbortSignal){
 for(const resource of localAIResources){
  const key='runtime-'+resource.sha256,saved=await access('readonly',s=>s.get(key)) as Blob|undefined;if(saved?.size===resource.bytes)continue;
  const response=await fetch(new URL('lore-ai/'+resource.file,applicationResourceBase()),{signal}),blob=await verifyAIModel(response,resource,signal,()=>{});signal.throwIfAborted();await access('readwrite',s=>s.put(blob,key));
 }
}
export async function importAIModel(file:Blob,signal:AbortSignal,progress:(fraction:number)=>void){
 if(file.size!==localAIModel.bytes)throw Error('Este archivo no es el modelo compacto compatible. Descarga el GGUF indicado en Modelo y licencia.');
 await obtainAIRuntime(signal);
 const blob=await verifyAIModel(new Response(file),localAIModel,signal,progress);signal.throwIfAborted();
 try{await access('readwrite',s=>s.put(blob,localAIModel.sha256));}catch{throw Error('No se pudo guardar la IA. Revisa el espacio disponible.');}return blob;
}
export async function verifyAIModel(response:Response,expected:{sha256:string;bytes:number},signal:AbortSignal,progress:(fraction:number)=>void){
 if(!response.ok||!response.body)throw Error('No se pudo descargar el modelo. Reintenta cuando tengas conexión.');
 const reader=response.body.getReader(),hash=sha256.create(),chunks:Uint8Array<ArrayBuffer>[]=[];let bytes=0,lastYield=0;
 const cancel=()=>void reader.cancel().catch(()=>{});signal.addEventListener('abort',cancel,{once:true});
 try{while(true){signal.throwIfAborted();const part=await reader.read();if(part.done)break;bytes+=part.value.byteLength;if(bytes>expected.bytes)throw Error('El modelo tiene un tamaño inesperado.');hash.update(part.value);chunks.push(new Uint8Array(part.value));progress(bytes/expected.bytes);if(bytes-lastYield>2097152){lastYield=bytes;await new Promise(resolve=>setTimeout(resolve,0));}}
 signal.throwIfAborted();const digest=Array.from(hash.digest(),n=>n.toString(16).padStart(2,'0')).join('');if(bytes!==expected.bytes||digest!==expected.sha256)throw Error('Modelo incompleto o dañado. No se guardó.');return new Blob(chunks,{type:'application/octet-stream'});
 }finally{signal.removeEventListener('abort',cancel);await reader.cancel().catch(()=>{});}
}
export async function downloadAIModel(signal:AbortSignal,progress:(fraction:number)=>void){
 await obtainAIRuntime(signal);
 const existing=await readAIModel();if(existing?.size===localAIModel.bytes){progress(1);return existing;}
 const estimate=await navigator.storage?.estimate?.();if(estimate?.quota&&estimate.quota-(estimate.usage??0)<localAIModel.bytes*1.15)throw Error('No hay espacio suficiente para guardar la IA. El corrector ligero sigue disponible.');
 const response=await fetch(localAIModel.url,{signal,credentials:'omit',referrerPolicy:'no-referrer'}),blob=await verifyAIModel(response,localAIModel,signal,progress);signal.throwIfAborted();
 try{await access('readwrite',s=>s.put(blob,localAIModel.sha256));}catch{throw Error('No se pudo conservar la IA en este dispositivo. Revisa el espacio disponible.');}return blob;
}
