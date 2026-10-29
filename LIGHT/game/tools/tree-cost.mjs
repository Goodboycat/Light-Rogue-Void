import { build } from 'esbuild';
const g=process.cwd();
const o=await build({stdin:{contents:`export {ABILITY_TREE_DATA} from '${g}/data.ts'`,resolveDir:g,loader:'ts'},bundle:true,write:false,format:'esm',platform:'node',logLevel:'error'});
const {ABILITY_TREE_DATA:T}=await import('data:text/javascript;base64,'+Buffer.from(o.outputFiles[0].text).toString('base64'));
const s={};for(const n of T){const k=n.requiresBoss?'CONST':n.type;s[k]=s[k]||{n:0,c:0,max:0};s[k].n++;s[k].c+=n.cost;s[k].max=Math.max(s[k].max,n.cost);}
console.log(T.length,JSON.stringify(s),'total',T.reduce((a,n)=>a+n.cost,0));
