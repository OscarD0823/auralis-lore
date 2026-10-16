import {test} from 'node:test';import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import {createStory,blankCharacter,validateStory} from '../src/stories-model';
import {defaultAudiobook,defaultVoice,speechSegments,scheduleSpeech,validateAudiobook} from '../src/audio-model';
import {encodeWav} from '../src/audio-render';
import {splitSpeech} from '../src/audio-engine';
import {saveStory,listStories,saveAudioAsset,getAudioAsset,removeAudioAsset} from '../src/stories-storage';
import {storyArchive,readStoryArchive} from '../src/story-archive';
test('actualizar IndexedDB conserva historias de la versión anterior',async()=>{
 const p=createStory('Historia anterior');await new Promise<void>((resolve,reject)=>{const request=indexedDB.open('asteoria-lore-local-v1',1);request.onupgradeneeded=()=>request.result.createObjectStore('stories',{keyPath:'id'});request.onsuccess=()=>{const db=request.result,tx=db.transaction('stories','readwrite');tx.objectStore('stories').put(p);tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};request.onerror=()=>reject(request.error);});
 assert.ok((await listStories()).some(s=>s.id===p.id));assert.equal((await getAudioAsset('missing')),undefined);
});
test('las marcas alternan narrador/personajes sin perder texto ni formato anidado',()=>{
 const p=createStory(),c=blankCharacter('Elena');p.characters=[c];p.chapters[0].html=`<p>Era de noche. <span data-speaker-id="${c.id}"><strong>¡Hola!</strong> ¿Estás ahí?</span> La luna brilló.</p><p>Otro párrafo.</p>`;
 const segments=speechSegments(p.chapters[0]);assert.deepEqual(segments.map(s=>s.speaker),['narrator',c.id,'narrator','narrator']);assert.equal(segments[1].text,'¡Hola! ¿Estás ahí?');validateStory(p);
 p.chapters[0].html='<p>Primero</p>'+p.chapters[0].html;assert.equal(speechSegments(p.chapters[0])[2].id,segments[1].id);
});
test('la línea de tiempo usa duraciones reales y las pausas elegidas',()=>{
 const p=createStory();p.chapters[0].html='<p>Uno.</p><p>Dos.</p>';const segments=speechSegments(p.chapters[0]),audio=defaultAudiobook();audio.timings[segments[0].id]={before:1,after:2};const result=scheduleSpeech(segments,new Map([[segments[0].id,3],[segments[1].id,4]]),audio);assert.equal(result[0].start,1);assert.equal(result[1].start,6);assert.equal(result[1].end,10.35);
});
test('proyectos antiguos abren y configuraciones inválidas se rechazan',()=>{
 const p=createStory();assert.equal(validateStory(p).audio,undefined);const a=defaultAudiobook();a.voices.narrator={...defaultVoice(),speed:NaN};assert.throws(()=>validateAudiobook(a,new Set()),/voz/);a.voices.narrator=defaultVoice();a.timings.x={before:-1,after:0};assert.throws(()=>validateAudiobook(a,new Set()),/pausa/);
});
test('WAV estéreo válido, normalización evita saturación y Unicode se divide en fragmentos',()=>{
 const bytes=encodeWav([new Float32Array([0,2,-2]),new Float32Array([0,1,-1])],22050),view=new DataView(bytes.buffer);assert.equal(new TextDecoder().decode(bytes.slice(0,4)),'RIFF');assert.equal(view.getUint16(22,true),2);assert.equal(view.getUint32(24,true),22050);assert.equal(view.getUint32(40,true),12);assert.equal(view.getInt16(48,true),32767);assert.equal(view.getInt16(52,true),-32768);const text=('Niñez árbol música. ').repeat(100);assert.ok(splitSpeech(text).every(t=>t.length<=700));assert.equal(splitSpeech(text).join(' '),text.trim());
});
test('biblioteca local reusable y copia .auralis-lore incluyen los bytes originales de audio',async()=>{
 const p=createStory();p.audio=defaultAudiobook();const id='test-audio-'+crypto.randomUUID(),blob=new Blob([new Uint8Array([1,2,3,4])],{type:'audio/wav'});await saveAudioAsset({id,name:'música.wav',kind:'music',mime:'audio/wav',duration:3,created:Date.now(),blob});p.audio.clips=[{id:crypto.randomUUID(),chapterId:p.chapters[0].id,assetId:id,name:'Música',anchor:'',start:0,offset:0,duration:3,volume:.3,fadeIn:.2,fadeOut:.2,loop:false}];await saveStory(p);assert.ok((await listStories()).some(s=>s.id===p.id));assert.equal((await getAudioAsset(id))!.blob.size,4);await assert.rejects(()=>removeAudioAsset(id));const archive=await storyArchive(p),restored=readStoryArchive(archive);assert.equal(restored.project.audio!.clips[0].assetId,id);assert.deepEqual(new Uint8Array(await restored.assets[0].blob.arrayBuffer()),new Uint8Array([1,2,3,4]));p.audio.clips=[];await saveStory(p);await removeAudioAsset(id);assert.equal(await getAudioAsset(id),undefined);
});
test('una pista ausente impide una copia incompleta',async()=>{const p=createStory();p.audio=defaultAudiobook();p.audio.clips=[{id:'missing-clip',chapterId:p.chapters[0].id,assetId:'not-in-library',name:'Falta',anchor:'',start:0,offset:0,duration:3,volume:.3,fadeIn:0,fadeOut:0,loop:false}];await assert.rejects(()=>storyArchive(p),/Falta/);});
