/* Deterministic SVG renderer. No network calls or external assets. */
(function(root){
'use strict';
function hash(text){let h=2166136261;for(const c of text)h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
function random(seed){let a=hash(seed);return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
function render(recipe,catalog){
 const {prefix,family,suffix,seed}=recipe;
 for(const key of ['prefix','family','suffix'])if(!catalog[key].includes(recipe[key]))throw Error('Unknown '+key);
 const p=catalog.prefix.indexOf(prefix),f=catalog.family.indexOf(family),s=catalog.suffix.indexOf(suffix);
 const rng=random(JSON.stringify([prefix,family,suffix,String(seed)]));
 const n=(a,b)=>a+rng()*(b-a),fmt=v=>Number(v.toFixed(2));
 const hue=(p*137.508)%360,sat=48+(p%5)*10,light=35+(p%4)*7;
 const color=i=>`hsl(${fmt((hue+i*(30+p%4*25))%360)} ${sat}% ${Math.min(72,light+i*8)}%)`;
 const bg=p%3===0?'#101b2e':'#ffffff',ink=p%3===0?'#eef3ff':'#16283a';
 const bits=[`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 800 800"><title>${esc(prefix+' '+family+' '+suffix)}</title><desc>Funfection Art Lab. Seed: ${esc(seed)}. Recipe version 1.</desc><defs><clipPath id="art-crop"><circle cx="400" cy="400" r="400"/></clipPath></defs><g clip-path="url(#art-crop)"><rect width="800" height="800" fill="${bg}"/>`];
 const circle=(x,y,r,fill,stroke='none',w=1)=>bits.push(`<circle cx="${fmt(x)}" cy="${fmt(y)}" r="${fmt(r)}" fill="${fill}" stroke="${stroke}" stroke-width="${w}"/>`);
 const path=(d,stroke,sw=2,fill='none')=>bits.push(`<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`);
 // Family controls topology; each index also changes density, rhythm, and geometry.
 const mode=f%10,count=12+Math.floor(f/10)*5,phase=n(0,Math.PI*2);
 bits.push('<g opacity="0.9">');
 for(let i=0;i<count;i++){
  const a=phase+i*Math.PI*2/count,r=n(65,265),x=400+Math.cos(a)*r,y=400+Math.sin(a)*r,c=color(i%4),size=n(12,55);
  if(mode===0){let d='';for(let k=0;k<12;k++){const t=a+k*Math.PI/6,rr=k%2?size*.35:size;d+=(k?'L':'M')+fmt(x+Math.cos(t)*rr)+' '+fmt(y+Math.sin(t)*rr);}path(d+'Z',c,2,c);}
  if(mode===1)circle(400,400,35+i*(290/count),'none',c,2+(f%3));
  if(mode===2){circle(x,y,size,c);circle(x-size*.22,y-size*.15,3,ink);path(`M${fmt(x-size*.3)} ${fmt(y+size*.2)}q${fmt(size*.3)} ${fmt(size*.4)} ${fmt(size*.6)} 0`,ink);}
  if(mode===3){const xx=60+Math.floor(n(0,17))*40,yy=60+Math.floor(n(0,17))*40;bits.push(`<rect x="${xx}" y="${yy}" width="${fmt(size*2)}" height="${fmt(size*.7)}" fill="${c}"/>`);}
  if(mode===4){bits.push(`<ellipse cx="400" cy="400" rx="${fmt(30+size)}" ry="${fmt(r)}" fill="none" stroke="${c}" stroke-width="3" transform="rotate(${fmt(a*180/Math.PI)} 400 400)"/>`);}
  if(mode===5)path(`M80 ${fmt(100+i*600/count)} Q${fmt(x)} ${fmt(y-180)} 400 ${fmt(y)} T720 ${fmt(100+i*600/count)}`,c,3+(i%4)*3);
  if(mode===6){let d='';for(let k=0;k<7;k++){const t=k*Math.PI/3;d+=(k?'L':'M')+fmt(x+Math.cos(t)*size)+' '+fmt(y+Math.sin(t)*size);}path(d,c,2,i%3===0?c:'none');}
  if(mode===7){path(`M400 700 Q${fmt(x)} ${fmt(y)} ${fmt(x)} ${fmt(y-80)}`,c,2);circle(x,y-80,6,c);}
  if(mode===8){let d='';for(let k=0;k<6;k++)d+=(k?'L':'M')+fmt(x+n(-size,size))+' '+fmt(y+n(-size,size));path(d,c,3);}
  if(mode===9){path(`M${fmt(x-size)} ${fmt(y)} Q${fmt(x)} ${fmt(y-size*2)} ${fmt(x+size)} ${fmt(y)} Q${fmt(x)} ${fmt(y+size)} ${fmt(x-size)} ${fmt(y)}Z`,c,2,c);}
 }
 bits.push('</g>');
 // Prefix adds texture; suffix adds a separate field of gesture marks.
 for(let i=0;i<40+p%19;i++){const x=n(45,755),y=n(45,755);if(p%2)circle(x,y,n(.5,1.7),ink);else path(`M${fmt(x)} ${fmt(y)}h${fmt(n(2,8))}`,color(2),.7);}
 bits.push(`<g opacity="0.65" stroke-dasharray="${s%4===0?'3 7':'none'}">`);
 for(let i=0;i<8+s%13;i++){
  const x=n(70,730),y=n(70,730),length=15+Math.floor(s/6)*6,c=color((i+2)%4);
  switch(s%6){
   case 0:circle(x,y,length*.4,'none',c,1.5);break;
   case 1:path(`M${fmt(x)} ${fmt(y)}q${length/2} -${length} ${length} 0t${length} 0`,c,2);break;
   case 2:path(`M${fmt(x)} ${fmt(y)}l${length/3} -${length/2} ${length/3} ${length} ${length/3} -${length/2}`,c,2);break;
   case 3:path(`M${fmt(x)} ${fmt(y)}q${length} ${-length} ${length*2} 0`,c,1);break;
   case 4:circle(x,y,3,c);path(`M${fmt(x+8)} ${fmt(y)}h${length}`,c,2);break;
   case 5:path(`M${fmt(x)} ${fmt(y)}l${length} -${length}m-${length} 0l${length} ${length}`,c,2);break;
  }
 }
 bits.push('</g></g></svg>');return bits.join('');
}
root.FunfectionArt={render,hash};
if(typeof module!=='undefined')module.exports=root.FunfectionArt;
})(globalThis);
