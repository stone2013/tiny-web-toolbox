(function(){
'use strict';
var lang=localStorage.getItem('twt:lang')||(navigator.language&&navigator.language.toLowerCase().startsWith('zh')?'zh-CN':'en');
var dict={
en:{bad:'Choose a PNG, JPG or WebP image.',large:'This image is larger than 12 MB.',library:'The vectorization library could not load. Refresh and try again.',loading:'Loading image…',working:'Tracing image into vector paths…',done:'SVG created. Review the preview and file size before downloading.',failed:'Could not convert this image. Try a smaller image or another style.',none:'Choose an image first.',copied:'SVG code copied.',copyFail:'Could not copy SVG code.',size:'{w} × {h} · {size}',remove:'Choose an image to begin.',stats:'{size} · {paths} paths · {nodes} nodes · {w} × {h}',background:'Removed {count} background pixels.',invisible:'Removed {count} invisible paths.',largeSvg:'Large SVG: try Cartoon mode, fewer colors, or a simpler source image.',copyFallback:'Select and copy the SVG code manually from the downloaded file.'},
'zh-CN':{bad:'请选择 PNG、JPG 或 WebP 图片。',large:'图片超过 12 MB，请选择较小的文件。',library:'矢量化工具库加载失败，请刷新页面重试。',loading:'正在读取图片…',working:'正在将图片描摹为矢量路径…',done:'SVG 已生成，请检查预览和文件大小后再下载。',failed:'转换失败，请尝试较小的图片或更换图像类型。',none:'请先选择图片。',copied:'SVG 代码已复制。',copyFail:'无法复制 SVG 代码。',size:'{w} × {h} · {size}',remove:'选择图片以开始。',stats:'{size} · {paths} 条路径 · {nodes} 个节点 · {w} × {h}',background:'已移除 {count} 个背景像素。',invisible:'已清除 {count} 条不可见路径。',largeSvg:'SVG 仍然较大：试试卡通模式、减少颜色或换用更简单的原图。',copyFallback:'复制失败，可以下载 SVG 文件后手动复制源码。'}
};
function t(k,v){var s=dict[lang][k]||dict.en[k]||k;Object.keys(v||{}).forEach(function(x){s=s.replace('{'+x+'}',v[x])});return s}
var input=document.getElementById('vector-file'),meta=document.getElementById('vector-meta'),preset=document.getElementById('vector-preset'),colors=document.getElementById('vector-colors'),removeBg=document.getElementById('vector-remove-bg'),simplify=document.getElementById('vector-simplify'),convert=document.getElementById('vector-convert'),reset=document.getElementById('vector-reset'),results=document.getElementById('vector-results'),original=document.getElementById('vector-original'),output=document.getElementById('vector-output'),stats=document.getElementById('vector-stats'),downloadBtn=document.getElementById('vector-download'),copyBtn=document.getElementById('vector-copy'),status=document.getElementById('vector-status');
var file=null,image=null,svgText='',sourceUrl='',resultUrl='';
function setStatus(s){status.textContent=s}
function bytes(n){return n<1024?n+' B':n<1048576?(n/1024).toFixed(1)+' KB':(n/1048576).toFixed(2)+' MB'}
function apply(){document.documentElement.lang=lang;document.querySelectorAll('[data-en][data-zh]').forEach(function(e){e.textContent=e.dataset[lang==='zh-CN'?'zh':'en']});document.querySelectorAll('[data-lang]').forEach(function(b){b.setAttribute('aria-pressed',b.dataset.lang===lang?'true':'false')})}
document.querySelectorAll('[data-lang]').forEach(function(b){b.addEventListener('click',function(){lang=b.dataset.lang;localStorage.setItem('twt:lang',lang);apply()})});
function simplifyPathData(pathData,tolerance){
 var tokens=pathData.match(/[A-Za-z]|[-+]?(?:\d*\.?\d+)(?:[eE][-+]?\d+)?/g)||[];
 var out=[],run=[],command=null,i=0,anchor=null;
 function fmt(n){var v=Math.round(Number(n)*10)/10;return String(v)}
 function distance(p,a,b){
  var dx=b[0]-a[0],dy=b[1]-a[1];
  if(dx===0&&dy===0)return Math.hypot(p[0]-a[0],p[1]-a[1]);
  var t=((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy);
  t=Math.max(0,Math.min(1,t));
  return Math.hypot(p[0]-(a[0]+t*dx),p[1]-(a[1]+t*dy));
 }
 function rdp(points,eps){
  if(points.length<=2)return points;
  var keep=new Uint8Array(points.length);keep[0]=1;keep[points.length-1]=1;
  var stack=[[0,points.length-1]],eps2=eps;
  while(stack.length){
   var pair=stack.pop(),first=pair[0],last=pair[1],max=eps2,index=-1;
   for(var k=first+1;k<last;k++){var d=distance(points[k],points[first],points[last]);if(d>max){max=d;index=k}}
   if(index!==-1){keep[index]=1;stack.push([first,index],[index,last])}
  }
  var result=[];for(var n=0;n<points.length;n++)if(keep[n])result.push(points[n]);
  return result;
 }
 function flush(){
  if(run.length>1){var reduced=rdp(run,tolerance);for(var q=1;q<reduced.length;q++)out.push('L '+fmt(reduced[q][0])+' '+fmt(reduced[q][1]));anchor=reduced[reduced.length-1]}
  run=[];
 }
 while(i<tokens.length){
  if(/^[A-Za-z]$/.test(tokens[i]))command=tokens[i++];
  if(command==='M'||command==='L'){
   if(i+1>=tokens.length)return pathData;
   var x=Number(tokens[i++]),y=Number(tokens[i++]),pt=[x,y];
   if(command==='M'){flush();out.push('M '+fmt(x)+' '+fmt(y));anchor=pt;run=[pt]}
   else {if(!anchor){out.push('M '+fmt(x)+' '+fmt(y));anchor=pt;run=[pt]}else run.push(pt)}
  }else if(command==='Q'){
   if(i+3>=tokens.length)return pathData;
   var cx=Number(tokens[i++]),cy=Number(tokens[i++]),xq=Number(tokens[i++]),yq=Number(tokens[i++]);
   flush();out.push('Q '+fmt(cx)+' '+fmt(cy)+' '+fmt(xq)+' '+fmt(yq));anchor=[xq,yq];run=[anchor];
  }else if(command==='Z'||command==='z'){
   flush();out.push('Z');anchor=null;command=null;
  }else{return pathData}
 }
 flush();
 return out.join(' ');
}
function simplifySvgPaths(source,tolerance){
 var before=0,after=0;
 var result=source.replace(/<path\b[^>]*>/gi,function(tag){
  var match=tag.match(/\bd="([^"]*)"/);if(!match)return tag;
  var data=match[1],reduced=simplifyPathData(data,tolerance);
  before+=(data.match(/\b[ L]\s*[-+\d.]/g)||[]).length;
  after+=(reduced.match(/\b[ L]\s*[-+\d.]/g)||[]).length;
  return tag.replace(/\bd="[^"]*"/,'d="'+reduced+'"');
 });
 return {svg:result,before:before,after:after};
}
function clearResult(){svgText='';if(resultUrl){URL.revokeObjectURL(resultUrl);resultUrl=''}results.hidden=true;stats.hidden=true;stats.textContent='';downloadBtn.disabled=true;copyBtn.disabled=true;output.innerHTML=''}
function isLightBackground(d,i){var r=d[i],g=d[i+1],b=d[i+2],hi=Math.max(r,g,b),lo=Math.min(r,g,b);return d[i+3]>8&&lo>=218&&hi>=232&&(hi-lo)<=48}
function removeEdgeBackground(imgData){
 var d=imgData.data,w=imgData.width,h=imgData.height,total=w*h,queue=new Int32Array(total),head=0,tail=0;
 function add(i){if(i<0||i>=total||d[i*4+3]===0||!isLightBackground(d,i*4))return;d[i*4+3]=0;queue[tail++]=i}
 for(var x=0;x<w;x++){add(x);add((h-1)*w+x)}
 for(var y=1;y<h-1;y++){add(y*w);add(y*w+w-1)}
 while(head<tail){var p=queue[head++],x=p%w;
 if(x>0)add(p-1);if(x<w-1)add(p+1);if(p>=w)add(p-w);if(p+w<total)add(p+w)}
 return tail;
}
function removeInvisiblePaths(source){
 var removed=0;
 var svg=source.replace(/<path\b(?=[^>]*\bopacity\s*=\s*["']0(?:\.0+)?["'])[^>]*\/>/gi,function(){removed++;return ''});
 return {svg:svg,removed:removed};
}
function countSvgNodes(source){
 var count=0;
 source.replace(/<path\b[^>]*\bd=["']([^"']*)["']/gi,function(_,data){
  var matches=data.match(/[MLQZmlqz]/g);if(matches)count+=matches.length;
  return _;
 });
 return count;
}
function getOptions(){
 var style=preset.value,n=Number(colors.value);
 if(style==='cartoon')return {ltres:1.8,qtres:2,pathomit:22,rightangleenhance:false,colorsampling:2,numberofcolors:Math.min(n,16),colorquantcycles:2,strokewidth:0,linefilter:true,scale:1,roundcoords:1,viewbox:true,desc:false,blurradius:0,blurdelta:20};
 if(style==='logo')return {ltres:1.5,qtres:1.6,pathomit:28,rightangleenhance:true,colorsampling:2,numberofcolors:Math.min(n,16),colorquantcycles:2,strokewidth:0,linefilter:true,scale:1,roundcoords:1,viewbox:true,desc:false,blurradius:0,blurdelta:20};
 return {ltres:1,qtres:1,pathomit:10,rightangleenhance:false,colorsampling:2,numberofcolors:Math.max(16,n),colorquantcycles:3,strokewidth:0,linefilter:false,scale:1,roundcoords:1,viewbox:true,desc:false,blurradius:0,blurdelta:20};
}
input.addEventListener('change',function(){
 var f=input.files&&input.files[0];if(!f)return;clearResult();
 if(!/^image\/(png|jpeg|webp)$/.test(f.type)&&!/\.(png|jpe?g|webp)$/i.test(f.name)){setStatus(t('bad'));input.value='';return}
 if(f.size>12*1024*1024){setStatus(t('large'));input.value='';return}
 if(sourceUrl)URL.revokeObjectURL(sourceUrl);file=f;image=null;setStatus(t('loading'));sourceUrl=URL.createObjectURL(f);
 var img=new Image();img.onload=function(){image=img;meta.textContent=t('size',{w:img.naturalWidth,h:img.naturalHeight,size:bytes(f.size)});original.innerHTML='';var thumb=document.createElement('img');thumb.src=sourceUrl;thumb.alt=f.name;original.appendChild(thumb);convert.disabled=false;reset.disabled=false;setStatus('')};
 img.onerror=function(){file=null;image=null;setStatus(t('bad'))};img.src=sourceUrl;
});
reset.addEventListener('click',function(){if(sourceUrl){URL.revokeObjectURL(sourceUrl);sourceUrl=''}file=null;image=null;input.value='';meta.textContent='';original.innerHTML='';clearResult();convert.disabled=true;reset.disabled=true;setStatus(t('remove'))});
convert.addEventListener('click',function(){
 if(!image){setStatus(t('none'));return}if(!window.ImageTracer){setStatus(t('library'));return}
 convert.disabled=true;downloadBtn.disabled=true;copyBtn.disabled=true;setStatus(t('working'));
 setTimeout(function(){try{
  var max=1000,w=image.naturalWidth,h=image.naturalHeight,ratio=Math.min(1,max/Math.max(w,h));
  var canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(w*ratio));canvas.height=Math.max(1,Math.round(h*ratio));
  var ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
  var outW=canvas.width,outH=canvas.height,data=ctx.getImageData(0,0,outW,outH),removed=removeBg.checked?removeEdgeBackground(data):0;
  var svgTextRaw=ImageTracer.imagedataToSVG(data,getOptions());canvas.width=0;canvas.height=0;
  if(!svgTextRaw||svgTextRaw.length<80)throw Error('empty');
  var cleaned=removeInvisiblePaths(svgTextRaw);
  var simplified=simplifySvgPaths(cleaned.svg,Number(simplify.value));
  var baseSize=new Blob([cleaned.svg]).size,candidateSize=new Blob([simplified.svg]).size;
  var finalSvg=candidateSize<baseSize?simplified.svg:cleaned.svg;
  var beforeNodes=countSvgNodes(cleaned.svg),afterNodes=countSvgNodes(finalSvg);
  svgText=finalSvg.replace(/<\?xml[^>]*>\s*/i,'');
  var blob=new Blob([svgText],{type:'image/svg+xml;charset=utf-8'});if(resultUrl)URL.revokeObjectURL(resultUrl);resultUrl=URL.createObjectURL(blob);
  output.innerHTML='';var svgImg=document.createElement('img');svgImg.src=resultUrl;svgImg.alt='Vectorized SVG preview';output.appendChild(svgImg);
  results.hidden=false;var pathCount=(svgText.match(/<path\b/gi)||[]).length;
  stats.textContent=t('stats',{size:bytes(blob.size),paths:pathCount.toLocaleString(),nodes:beforeNodes.toLocaleString()+' → '+afterNodes.toLocaleString(),w:outW,h:outH});
  stats.hidden=false;downloadBtn.disabled=false;copyBtn.disabled=false;var message=t('done');if(cleaned.removed)message+=' '+t('invisible',{count:cleaned.removed.toLocaleString()});if(removed)message+=' '+t('background',{count:removed.toLocaleString()});setStatus(message);
  if(blob.size>2*1024*1024)setStatus(status.textContent+' '+t('largeSvg'));
 }catch(e){setStatus(t('failed'))}finally{convert.disabled=false}},30);
});
downloadBtn.addEventListener('click',function(){if(!svgText)return;var blob=new Blob([svgText],{type:'image/svg+xml;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=(file?file.name.replace(/\.[^.]+$/,''):'image')+'.svg';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url)},30000)});
copyBtn.addEventListener('click',async function(){
 if(!svgText)return;
 try{if(navigator.clipboard&&navigator.clipboard.writeText){await navigator.clipboard.writeText(svgText)}else{throw Error('clipboard')}setStatus(t('copied'))}
 catch(e){var area=document.createElement('textarea');area.value=svgText;area.style.position='fixed';area.style.opacity='0';document.body.appendChild(area);area.select();var ok=false;try{ok=document.execCommand('copy')}catch(ignore){}area.remove();setStatus(ok?t('copied'):t('copyFail')+' '+t('copyFallback'))}
});
document.querySelector('.year').textContent=new Date().getFullYear();
try{var ids=JSON.parse(localStorage.getItem('twt:recent')||'[]');ids=['image-svg'].concat(ids.filter(function(x){return x!=='image-svg'})).slice(0,3);localStorage.setItem('twt:recent',JSON.stringify(ids))}catch(e){}
apply();
})();