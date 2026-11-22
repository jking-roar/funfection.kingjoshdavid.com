const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
require('../art/catalog.js');
const catalog=globalThis.FunfectionCatalog;
const {render}=require('../art/art.js');
const base={prefix:'Neon',family:'Spark',suffix:'Sneezle',seed:'test'};
test('catalog snapshots match and contain unique names',()=>{for(const key of ['prefix','family','suffix']){assert.deepEqual(catalog[key],JSON.parse(fs.readFileSync(require.resolve('../art/'+key+'.json'))));assert.equal(new Set(catalog[key]).size,catalog[key].length);}assert.deepEqual(Object.values(catalog).map(a=>a.length),[58,58,50]);});
test('recipes are deterministic, and all categories affect artwork',()=>{assert.equal(render(base,catalog),render({...base},catalog));for(const key of Object.keys(catalog)){const outputs=catalog[key].map(value=>render({...base,[key]:value},catalog).replace(/<title>.*?<\/title>/,''));assert.equal(new Set(outputs).size,catalog[key].length);}assert.notEqual(render(base,catalog),render({...base,seed:'other'},catalog));});
test('all category values render finite SVG',()=>{for(const key of Object.keys(catalog))for(const value of catalog[key]){const svg=render({...base,[key]:value},catalog);assert.match(svg,/^<svg/);assert.match(svg,/<\/svg>$/);assert.doesNotMatch(svg,/NaN|Infinity|undefined/);}});
test('untrusted seed text is escaped and unknown categories rejected',()=>{assert.doesNotMatch(render({...base,seed:'</desc><script>alert(1)</script>'},catalog),/<script>/);assert.throws(()=>render({...base,family:'fake'},catalog));});
test('page restores recipe, edits, randomizes, shares, and exports',async()=>{
 const vm=require('node:vm'),{webcrypto}=require('node:crypto');
 const nodes={};for(const id of ['prefix','family','suffix','seed','recipe','art','name','edition','status','random','variation','svg','png','share','history'])nodes[id]={children:[],replaceChildren(){this.children=[];},append(node){this.children.push(node);},value:'',add(){},addEventListener(k,fn){this[k]=fn;},setAttribute(){}};
 const downloads=[],blobs=[];let copied='';let current=new URL('https://example.com/art/?prefix=Neon&family=Bloom&suffix=Wiggle&seed=example');
 class FakeImage{async decode(){}}
const context={FunfectionCatalog:catalog,FunfectionArt:globalThis.FunfectionArt,URL:class extends URL{static createObjectURL(blob){blobs.push(blob);return 'blob:example';}static revokeObjectURL(){}},URLSearchParams,crypto:webcrypto,Uint32Array,Option:class{},Blob,Image:FakeImage,Math,setTimeout(){},location:{search:current.search,href:current.href},history:{replaceState(a,b,url){current=url;}},navigator:{clipboard:{async writeText(text){copied=text;}}},document:{getElementById:id=>nodes[id],createElement(tag){return tag==='button'?{setAttribute(k,v){this[k]=v;}}:tag==='a'?{click(){downloads.push(this.download);}}:{getContext(){return{beginPath(){},arc(x,y,r){assert.deepEqual([x,y,r],[800,800,800]);},clip(){},drawImage(){}};},toBlob(fn){fn(new Blob(['png'],{type:'image/png'}));}};}}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../art/app.js'),'utf8'),context);
 assert.equal(nodes.name.textContent,'Neon Bloom Wiggle');assert.equal(nodes.seed.value,'example');assert.match(nodes.art.innerHTML,/<svg/);
 const first=nodes.art.innerHTML;
 assert.equal(nodes.history.children.length,1);
 nodes.seed.value='typed seed';nodes.seed.input();
 assert.notEqual(nodes.art.innerHTML,first);assert.equal(current.searchParams.get('seed'),'typed seed');
 assert.equal(nodes.history.children.length,2);
 nodes.history.children[1].onclick();assert.equal(nodes.art.innerHTML,first);assert.equal(nodes.seed.value,'example');
 assert.equal(nodes.history.children.length,2);
 nodes.variation.onclick();assert.notEqual(nodes.seed.value,'example');assert.notEqual(nodes.art.innerHTML,first);assert.equal(nodes.family.value,'Bloom');
 nodes.family.value='Glitch';nodes.family.change();assert.match(nodes.name.textContent,/Glitch/);assert.equal(current.searchParams.get('family'),'Glitch');
 nodes.svg.onclick();assert.match(downloads[0],/\.svg$/);assert.equal(blobs[0].type,'image/svg+xml');await nodes.png.onclick();assert.match(downloads[1],/\.png$/);
 await nodes.share.onclick();assert.equal(copied,context.location.href);nodes.random.onclick();for(const key of Object.keys(catalog))assert.ok(catalog[key].includes(nodes[key].value));
});

test('circular clip encloses all painted artwork including background',()=>{const svg=render(base,catalog);assert.match(svg,/<clipPath id="art-crop"><circle cx="400" cy="400" r="400"\/><\/clipPath>/);assert.match(svg,/<g clip-path="url\(#art-crop\)"><rect/);assert.match(svg,/<\/g><\/g><\/svg>$/);});
