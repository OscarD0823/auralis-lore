import {validateAudiobook,type Audiobook} from './audio-model';
import {validateBackdrop,type LoreBackdrop,validateLocalImage} from './lore-artwork';
export type Chapter={id:string;title:string;html:string;status:'idea'|'draft'|'review'|'done'};
export type Character={id:string;name:string;familyId:string;portrait:string;role:string;aliases:string;biography:string;notes:string;birth:string;death:string;background?:LoreBackdrop};
export type Family={id:string;name:string;color:string;description:string;crest?:string;background?:LoreBackdrop};
export type Relation={id:string;from:string;to:string;type:'parent'|'partner'|'sibling'|'friend'|'rival'|'other';label:string;notes:string};
export type StoryProject={format:'auralis-lore'|'asteoria-lore';version:1;id:string;name:string;synopsis:string;genre:string;fandom:string;goal:number;font:string;chapters:Chapter[];characters:Character[];families:Family[];relations:Relation[];updated:number;audio?:Audiobook;treeBackground?:LoreBackdrop};
export const uid=()=>crypto.randomUUID();
export const blankChapter=(title='Capítulo 1'):Chapter=>({id:uid(),title,html:'<p></p>',status:'draft'});
export const blankCharacter=(name='Nuevo personaje'):Character=>({id:uid(),name,familyId:'',portrait:'',role:'',aliases:'',biography:'',notes:'',birth:'',death:''});
export function createStory(name='Mi nueva historia'):StoryProject{return{format:'auralis-lore',version:1,id:uid(),name,synopsis:'',genre:'Fantasía',fandom:'',goal:50000,font:'NotoSerif',chapters:[blankChapter()],characters:[],families:[],relations:[],updated:Date.now()};}
export function storyTemplate(id:string){const p=createStory();if(id==='blank')return p;if(id==='novel'){p.name='Mi novela';p.genre='Novela';p.goal=80000;p.chapters=['Un mundo por descubrir','El conflicto','La transformación'].map(blankChapter);}else if(id==='fanfic'){p.name='Mi fanfic';p.genre='Fanfic';p.goal=20000;p.chapters=['Un nuevo encuentro','Lo que cambia entre nosotros'].map(blankChapter);}else if(id==='short-story'){p.name='Mi relato';p.genre='Relato';p.goal=3000;p.chapters=[blankChapter('Un instante que lo cambia todo')];}else throw Error('Esta plantilla no está disponible.');return p;}
export function plainText(html:string){return html.replace(/<\/(?:p|h[1-6]|li|blockquote)>/gi,'\n').replace(/<br\s*\/?\s*>/gi,'\n').replace(/<[^>]*>/g,'').replace(/&nbsp;/g,' ').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&').trim();}
export function wordCount(html:string){return plainText(html).match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu)?.length??0;}
function validateChapterHtml(html:string){
 const allowed=new Set(['p','h1','h2','h3','h4','h5','h6','ul','ol','li','strong','b','em','i','u','s','strike','blockquote','pre','code','a','br','hr','span']);
 for(const match of html.matchAll(/<\/?\s*([a-z][a-z0-9:-]*)\b/gi))if(!allowed.has(match[1].toLowerCase()))throw Error('Un capítulo contiene una etiqueta no permitida.');
 if(/\b(?:style|src|srcdoc|on\w+)\s*=/i.test(html))throw Error('Un capítulo contiene atributos no permitidos.');
}
export function validateRelation(project:StoryProject,relation:Relation){
 if(relation.from===relation.to)throw Error('Elige dos personajes diferentes.');
 const ids=new Set(project.characters.map(c=>c.id));if(!ids.has(relation.from)||!ids.has(relation.to))throw Error('Ambos personajes deben existir.');
 const rest=project.relations.filter(r=>r.id!==relation.id);
 if(rest.some(r=>r.type===relation.type&&r.from===relation.from&&r.to===relation.to))throw Error('Esta relación ya existe.');
 if(relation.type==='parent'){
  const visit=(id:string,seen=new Set<string>()):boolean=>{if(id===relation.from)return true;if(seen.has(id))return false;seen.add(id);return rest.filter(r=>r.type==='parent'&&r.from===id).some(r=>visit(r.to,seen));};
  if(visit(relation.to))throw Error('La relación crearía un ciclo en el árbol familiar.');
 }
 return relation;
}
export function removeCharacter(project:StoryProject,id:string):StoryProject{return{...project,characters:project.characters.filter(c=>c.id!==id),relations:project.relations.filter(r=>r.from!==id&&r.to!==id)};}
export function treeLayout(project:StoryProject,familyId=''){
 const characters=project.characters.filter(c=>!familyId||c.familyId===familyId),ids=new Set(characters.map(c=>c.id));
 const edges=project.relations.filter(r=>r.type==='parent'&&ids.has(r.from)&&ids.has(r.to));
 const level=new Map<string,number>();
 const depth=(id:string,seen=new Set<string>()):number=>{if(level.has(id))return level.get(id)!;if(seen.has(id))throw Error('El árbol contiene un ciclo.');const next=new Set(seen);next.add(id);const parents=edges.filter(r=>r.to===id);const d=parents.length?Math.max(...parents.map(r=>depth(r.from,next)))+1:0;level.set(id,d);return d;};
 characters.forEach(c=>depth(c.id));
 const rows=new Map<number,Character[]>();for(const c of characters){const l=level.get(c.id)!;rows.set(l,[...(rows.get(l)??[]),c]);}
 const width=Math.max(600,...[...rows.values()].map(row=>row.length*210+40));
 const nodes=characters.map(c=>{const l=level.get(c.id)!,row=rows.get(l)!;return{character:c,x:(width-row.length*210)/2+row.indexOf(c)*210+105,y:l*170+80};});
 return{nodes,edges,width,height:Math.max(240,(Math.max(0,...level.values())+1)*170+40)};
}
export function validateStory(value:unknown):StoryProject{
 const p=value as StoryProject;if(!p||!['auralis-lore','asteoria-lore'].includes(p.format)||p.version!==1)throw Error("Selecciona un proyecto de Auralis Lore (.auralis-lore).");
 const arrays=['chapters','characters','families','relations'] as const;
 for(const key of arrays)if(!Array.isArray(p[key])||(key!=='chapters'&&p[key].length>5000))throw Error('El proyecto contiene una colección no válida.');
 if(typeof p.id!=='string'||!p.id||typeof p.name!=='string'||p.name.length>500||!Number.isFinite(p.updated)||!Number.isFinite(p.goal)||p.goal<0||typeof p.font!=='string'||p.font.length>150)throw Error('Los datos del proyecto no son válidos.');
 for(const field of ['synopsis','genre','fandom'] as const)if(typeof p[field]!=='string')throw Error('Falta información del proyecto.');
 for(const key of arrays){const ids=new Set<string>();for(const item of p[key]){if(!item||typeof item.id!=='string'||!item.id||ids.has(item.id))throw Error('Hay identificadores repetidos.');ids.add(item.id);}}
 for(const c of p.chapters){if(typeof c.title!=='string'||typeof c.html!=='string'||!['idea','draft','review','done'].includes(c.status)||/<(?:script|iframe|object|embed|svg|style|img)\b|\bon\w+\s*=|javascript\s*:|style\s*=\s*["'][^"']*(?:url|expression)\s*\(/i.test(c.html))throw Error('Un capítulo contiene contenido no permitido.');for(const match of c.html.matchAll(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)){const href=(match[1]??match[2]??match[3]).replace(/&#(x[0-9a-f]+|\d+);?/gi,(_s,n)=>String.fromCodePoint(Math.min(0x10ffff,parseInt(n.startsWith('x')?n.slice(1):n,n.startsWith('x')?16:10)))).replace(/&colon;/gi,':').replace(/&(?:tab|newline);/gi,'').trim();if(href&&!/^(?:https?:\/\/|mailto:|#)/i.test(href))throw Error('Un capítulo contiene un enlace no permitido.');}}
 const families=new Set(p.families.map(f=>f.id));
 validateBackdrop(p.treeBackground);
 for(const f of p.families){if(typeof f.name!=='string'||typeof f.description!=='string'||!/^#[a-f0-9]{6}$/i.test(f.color))throw Error('Una familia no es válida.');validateLocalImage(f.crest);validateBackdrop(f.background);}
 for(const c of p.characters){for(const key of ['name','familyId','portrait','role','aliases','biography','notes','birth','death'] as const)if(typeof c[key]!=='string')throw Error('Una ficha no es válida.');if(c.familyId&&!families.has(c.familyId))throw Error('La familia de un personaje no existe.');validateLocalImage(c.portrait);validateBackdrop(c.background);}
 for(const r of p.relations){if(!['parent','partner','sibling','friend','rival','other'].includes(r.type)||typeof r.label!=='string'||typeof r.notes!=='string')throw Error('Una relación no es válida.');validateRelation(p,r);}
 for(const chapter of p.chapters)validateChapterHtml(chapter.html);
 validateAudiobook(p.audio,new Set(p.chapters.map(c=>c.id)));treeLayout(p);return p;
}
