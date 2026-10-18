import {normalize} from './exercises';
export function compareSpeech(expected:string,actual:string){
 const a=normalize(expected).split(' ').filter(Boolean),b=normalize(actual).split(' ').filter(Boolean);
 // Bound work for pasted text and long recognition results; this is text alignment only.
 const x=a.slice(0,200),y=b.slice(0,200);
 const dp=Array.from({length:x.length+1},()=>Array<number>(y.length+1).fill(0));
 for(let i=x.length-1;i>=0;i--)for(let j=y.length-1;j>=0;j--)dp[i][j]=x[i]===y[j]?1+dp[i+1][j+1]:Math.max(dp[i+1][j],dp[i][j+1]);
 const reference=x.map(text=>({text,match:false})),spoken=y.map(text=>({text,match:false}));
 let i=0,j=0;while(i<x.length&&j<y.length){if(x[i]===y[j]){reference[i++].match=true;spoken[j++].match=true;}else if(dp[i+1][j]>=dp[i][j+1])i++;else j++;}
 return {reference,spoken,exact:normalize(expected)===normalize(actual),truncated:a.length>200||b.length>200};
}
