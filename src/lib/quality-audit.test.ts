import {describe,it,expect} from 'vitest';
import {auditLexicon} from './quality-audit';
import {words,type Word} from '../data/course';
const card=(patch:Partial<Word>={}):Word=>({...structuredClone(words[0]),...patch});
describe('Проверки всего словаря без фиктивной семантической гарантии',()=>{
 it('находит дубли ID/лексем и пунктуационные дубли примеров',()=>{const source=card({examples:[{ro:'Mi-e sete!',ru:'Я хочу пить!'},{ro:'Mi-e sete.',ru:'Я хочу пить.'}]});const issues=auditLexicon([source,card({id:'other'})]);expect(issues.some(i=>i.code==='duplicate-headword')).toBe(true);expect(issues.some(i=>i.code==='example-duplicate')).toBe(true);expect(auditLexicon([source,source]).some(i=>i.code==='duplicate-id')).toBe(true)});
 it('отмечает неправильные диакритические знаки и смешанные буквы',()=>{const bad=card({ro:'раpă',forms:'cărţi'});expect(auditLexicon([bad]).some(i=>i.code==='diacritics')).toBe(true);expect(auditLexicon([bad]).some(i=>i.code==='mixed-script')).toBe(true)});
 it('не считает русское пояснение в формах ошибкой смешения алфавитов',()=>{expect(auditLexicon([card({forms:'apa; ape; только ед. ч. в этом значении'})]).some(i=>i.code==='mixed-script')).toBe(false)});
 it('различает языковую ошибку, неполноту и оценочность CEFR',()=>{const issues=auditLexicon([card({quality:'reference',levelEstimated:true,forms:'',examples:[]})]);expect(issues.find(i=>i.code==='examples-incomplete')?.severity).toBe('incomplete');expect(issues.find(i=>i.code==='level-unverified')?.severity).toBe('review');expect(issues.some(i=>i.severity==='error')).toBe(false)});
 it('не приписывает род союзу при явно разделённых омонимах',()=>{expect(auditLexicon([card({ro:'dar',pos:'союз; существительное, ср. р. (омоним)'})]).some(i=>i.code==='pos-conflict')).toBe(false)});
 it('отмечает подозрительные числа и часть речи, не меняет перевод автоматически',()=>{const c=card({pos:'глагол',ru:'прочитанный',examples:[{ro:'Trenul pleacă în 2025.',ru:'Поезд отправляется в 2026.'}]});const issues=auditLexicon([c]);expect(issues.some(i=>i.code==='example-numbers')).toBe(true);expect(issues.some(i=>i.code==='pos-conflict')).toBe(true);expect(c.ru).toBe('прочитанный')});
});
