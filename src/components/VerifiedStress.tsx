import stress from '../data/academy/stress.json';
const verified=new Map(stress.map(w=>[w.word,w]));
export default function VerifiedStress({word}:{word:string}){
 const w=verified.get(word);if(!w)return null;
 return <p className="verified-stress"><span>Учебное ударение: </span><span lang="ro">{w.syllables.map((s,i)=><span key={i}>{i?' · ':''}{i===w.stress?<mark>{s}</mark>:s}</span>)}</span> <a href={w.source} target="_blank" rel="noreferrer" aria-label={`Источник ударения ${word}`}>DOOM³</a></p>;
}
