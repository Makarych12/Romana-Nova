import families from './dialogue-families.json' with {type:'json'};
import type {Dialogue} from '../dialogues';
/** Compact source for 34 authored situations × 10 controlled context variants.
 * Full expanded materials are audited in quality/academy-dialogue-materials.json.
 * IDs, individual replies and branching remain distinct; no timing or audio synthesis here.
 */
const academyDialogues:Dialogue[]=families.flatMap(f=>{
 const items=f.items.split(';').map(row=>row.split('|'));
 return items.map(([x,u],i):Dialogue=>{
  const request=f.request.replace('{x}',x),ru=f.requestru.replace('{u}',u);
  const pairs=[
   {ro:f.opening,ru:f.openingru,note:f.role1},
   {ro:request,ru,note:f.role2},
   {ro:f.follow,ru:f.followru,note:f.role1},
   {ro:f.answer,ru:f.answerru,note:f.role2},
   {ro:f.close,ru:f.closeru,note:f.role1},
   {ro:'Vă mulțumesc pentru ajutor.',ru:'Спасибо за помощь.',note:f.role2},
  ];
  return {
   id:`academy-dialogue-${f.id}-${String(i+1).padStart(2,'0')}`,level:f.level as Dialogue['level'],title:`${f.title} · ${u}`,subtitle:`Диалог · ${f.title}`,familyId:f.id,variant:i+1,audioMode:'sequence',minutes:8,
   rule:`${f.title}: разберите роли и цель каждой реплики. В этом варианте ключевая фраза — «${request}». Сначала прослушайте разговор, затем ответьте за участника и выберите уместное продолжение. Это контролируемый вариант одной ситуации, а не отдельная тема.`,
   tip:'Тренируйте точность смысла и вежливость. Контекстные варианты используют общую структуру; прогресс сохраняется для каждого диалога.',pairs,
   turns:[{speaker:f.role2,promptRo:f.follow,promptRu:f.followru,answerRo:f.answer,anchorIndex:2,options:[
    {ro:f.answer,ru:f.answerru,correct:true,feedback:'Ответ соответствует вопросу собеседника.',continuation:pairs.slice(4)},
    {ro:'Aș dori mai întâi câteva explicații, vă rog.',ru:'Сначала я хотел бы получить несколько пояснений, пожалуйста.',correct:true,feedback:'Вы запросили пояснения до следующего шага.',continuation:[{ro:'Sigur. Ce anume doriți să clarificăm?',ru:'Конечно. Что именно вы хотите уточнить?',note:f.role1}]},
   ]}],
   questions:[{prompt:'Что уточняет или запрашивает участник во второй реплике?',answer:u,options:[u,...items.filter((_,j)=>j!==i).slice(0,3).map(item=>item[1])],audio:request}],
  };
 });
});
export default academyDialogues;
