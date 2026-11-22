'use strict';
const catalog=globalThis.FunfectionCatalog;
const fields=Object.fromEntries(['prefix','family','suffix','seed'].map(k=>[k,document.getElementById(k)]));
const params=new URLSearchParams(location.search);
const newSeed=()=>Array.from(crypto.getRandomValues(new Uint32Array(2)),x=>x.toString(36)).join('-');
for(const key of ['prefix','family','suffix']){
 for(const name of catalog[key])fields[key].add(new Option(name,name));
 fields[key].value=catalog[key].includes(params.get(key))?params.get(key):catalog[key][Math.floor(Math.random()*catalog[key].length)];
 fields[key].addEventListener('change',draw);
}
fields.seed.value=(params.get('seed')||newSeed()).slice(0,80);
fields.seed.addEventListener('input',draw);
document.getElementById('recipe').addEventListener('submit',e=>e.preventDefault());
let svgText='',recipe;
function draw(){
 recipe=Object.fromEntries(Object.entries(fields).map(([k,el])=>[k,el.value]));
 svgText=FunfectionArt.render(recipe,catalog);
 document.getElementById('art').innerHTML=svgText;
 const name=[recipe.prefix,recipe.family,recipe.suffix].join(' ');
 document.getElementById('art').setAttribute('aria-label',name+' abstract artwork');
 document.getElementById('name').textContent=name;
 document.getElementById('edition').textContent='SEED '+recipe.seed;
 document.getElementById('status').textContent='';
 const url=new URL(location.href);url.search=new URLSearchParams(recipe).toString();
 history.replaceState(null,'',url);
}
document.getElementById('random').onclick=()=>{for(const k of ['prefix','family','suffix'])fields[k].value=catalog[k][Math.floor(Math.random()*catalog[k].length)];fields.seed.value=newSeed();draw();};
document.getElementById('variation').onclick=()=>{fields.seed.value=newSeed();draw();};
const filename=()=>[recipe.prefix,recipe.family,recipe.suffix,recipe.seed].join('-').replace(/[^a-z0-9-]/gi,'_');
function download(blob,extension,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name+'.'+extension;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
document.getElementById('svg').onclick=()=>download(new Blob([svgText],{type:'image/svg+xml'}),'svg',filename());
document.getElementById('png').onclick=async()=>{
 const name=filename(),url=URL.createObjectURL(new Blob([svgText],{type:'image/svg+xml'})),img=new Image();
 try{img.src=url;await img.decode();const canvas=document.createElement('canvas');canvas.width=canvas.height=1600;canvas.getContext('2d').drawImage(img,0,0,1600,1600);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error();download(blob,'png',name);document.getElementById('status').textContent='PNG saved.';}
 catch{document.getElementById('status').textContent='PNG export failed. Try saving SVG.';}
 finally{URL.revokeObjectURL(url);}
};
document.getElementById('share').onclick=async()=>{try{await navigator.clipboard.writeText(location.href);document.getElementById('status').textContent='Recipe link copied.';}catch{document.getElementById('status').textContent='Copy the recipe link from your address bar.';}};
draw();
