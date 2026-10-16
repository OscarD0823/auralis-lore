import {Document,Packer,Paragraph,TextRun,HeadingLevel} from 'docx';
import {plainText,type StoryProject} from './stories-model';
import {prismaPackageMetadata} from '@prisma/core/package-metadata';
import {download as saveDocument} from '@prisma/core/download';
const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
// Export a view of the manuscript; the portable .auralis-lore backup always keeps everything.
export function manuscriptSelection(p:StoryProject,ids?:string[]):StoryProject{
 if(ids===undefined)return p;const selected=new Set(ids),chapters=p.chapters.filter(c=>selected.has(c.id));if(!chapters.length)throw Error('Selecciona al menos un capítulo.');
 return {...p,name:chapters.length===1?p.name+' — '+chapters[0].title:p.name+' — Capítulos seleccionados',synopsis:'',chapters};
}
export const storyText=(p:StoryProject)=>[p.name,p.synopsis,...p.chapters.flatMap(c=>[c.title,plainText(c.html)])].filter(Boolean).join('\n\n');
export const storyMarkdown=(p:StoryProject)=>'# '+p.name+'\n\n'+p.synopsis+'\n\n'+p.chapters.map(c=>'## '+c.title+'\n\n'+plainText(c.html)).join('\n\n');
export function storyHtml(p:StoryProject){return '<!doctype html><html lang="es"><meta charset="utf-8"><title>'+escape(p.name)+'</title><style>body{max-width:760px;margin:40px auto;padding:24px;font:18px/1.65 Georgia,serif}h1,h2{line-height:1.2}section{break-before:page}img{max-width:100%}@media print{body{margin:0;padding:0}@page{margin:25mm}}</style><h1>'+escape(p.name)+'</h1><p>'+escape(p.synopsis)+'</p>'+p.chapters.map(c=>'<section><h2>'+escape(c.title)+'</h2>'+c.html+'</section>').join('')+'</html>';}
export async function storyDocx(p:StoryProject){const children=[new Paragraph({text:p.name,heading:HeadingLevel.TITLE}),new Paragraph(p.synopsis)];for(const c of p.chapters){children.push(new Paragraph({text:c.title,heading:HeadingLevel.HEADING_1,pageBreakBefore:true}));for(const line of plainText(c.html).split('\n'))children.push(new Paragraph({children:[new TextRun(line)]}));}const doc=new Document({creator:'OscarD0823',title:p.name,description:"Creado con Auralis Lore BETA",sections:[{children}]});return prismaPackageMetadata(new Uint8Array(await Packer.toArrayBuffer(doc)),"Auralis Lore");}
export async function download(bytes:Uint8Array|string,name:string,type:string){await saveDocument(typeof bytes==='string'?new TextEncoder().encode(bytes):bytes,name.replace(/[<>:"/\\|?*\x00-\x1f]/g,'_'),type);}
