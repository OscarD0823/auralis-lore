import type {StoryProject} from './stories-model';
/** Select nearby facts rather than loading every biography into a small model. */
export function continuityContext(project:StoryProject,fragment:string,before:string){
 const normalized=fragment.normalize('NFC').toLocaleLowerCase(),present=project.characters.filter(c=>[c.name,...c.aliases.split(/[,;\n]/)].some(name=>name.trim().length>1&&normalized.includes(name.trim().normalize('NFC').toLocaleLowerCase()))).slice(0,3),ids=new Set(present.map(c=>c.id));
 const facts=present.map(c=>[c.name,c.role,c.birth&&'nace '+c.birth,c.death&&'muere '+c.death,c.biography.slice(0,90)].filter(Boolean).join('; '));
 const names=new Map(project.characters.map(c=>[c.id,c.name]));
 for(const relation of project.relations.filter(r=>ids.has(r.from)&&ids.has(r.to)).slice(0,2))facts.push((names.get(relation.from)??'')+' '+({parent:'es progenitor de',partner:'es pareja de',sibling:'es hermano/a de',friend:'es amigo/a de',rival:'es rival de',other:relation.label||'se relaciona con'})[relation.type]+' '+(names.get(relation.to)??''));
 return 'Datos de personajes: '+facts.join(' | ').slice(0,260)+'\nTexto anterior: '+before.slice(-290);
}
