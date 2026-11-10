(function(){
'use strict';
var lang=localStorage.getItem('twt:lang')||(navigator.language&&navigator.language.toLowerCase().startsWith('zh')?'zh-CN':'en');
var dict={
en:{bad:'Choose a PNG, JPG or WebP image.',large:'This image is larger than 12 MB.',library:'The vectorization library could not load. Refresh and try again.',loading:'Loading image…',working:'Tracing image into vector paths…',done:'SVG created. Review the preview and file size before downloading.',failed:'Could not convert this image. Try a smaller image or another style.',none:'Choose an image first.',copied:'SVG code copied.',copyFail:'Could not copy SVG code.',size:'{w} × {h} · {size}',remove:'Choose an image to begin.',stats:'{size} · {paths} paths · {nodes} nodes · {w} × {h}',background:'Removed {count} background pixels.',invisible:'Removed {count} invisible paths.',largeSvg:'Large SVG: try Cartoon mode, fewer colors, or a simpler source image.',progressPrep:'Preparing image…',progressTrace:'Tracing image…',progressFinish:'Optimizing SVG…',progressDone:'Conversion complete',progressFail:'Conversion failed',copyFallback:'Select and copy the SVG code manually from the downloaded file.'},
'zh-CN':{bad:'请选择 PNG、JPG 或 WebP 图片。',large:'图片超过 12 MB，请选择较小的文件。',library:'矢量化工具库加载失败，请刷新页面重试。',loading:'正在读取图片…',working:'正在将图片描摹为矢量路径…',done:'SVG 已生成，请检查预览和文件大小后再下载。',failed:'转换失败，请尝试较小的图片或更换图像类型。',none:'请先选择图片。',copied:'SVG 代码已复制。',copyFail:'无法复制 SVG 代码。',size:'{w} × {h} · {size}',remove:'选择图片以开始。',stats:'{size} · {paths} 条路径 · {nodes} 个节点 · {w} × {h}',background:'已移除 {count} 个背景像素。',invisible:'已清除 {count} 条不可见路径。',largeSvg:'SVG 仍然较大：试试卡通模式、减少颜色或换用更简单的原图。',progressPrep:'正在准备图片…',progressTrace:'正在描摹图像…',progressFinish:'正在优化 SVG…',progressDone:'转换完成',progressFail:'转换失败',copyFallback:'复制失败，可以下载 SVG 文件后手动复制源码。'}
};
function t(k,v){var s=dict[lang][k]||dict.en[k]||k;Object.keys(v||{}).forEach(function(x){s=s.replace('{'+x+'}',v[x])});return s}
var input=document.getElementById('vector-file'),meta=document.getElementById('vector-meta'),preset=document.getElementById('vector-preset'),colors=document.getElementById('vector-colors'),removeBg=document.getElementById('vector-remove-bg'),simplify=document.getElementById('vector-simplify'),convert=document.getElementById('vector-convert'),reset=document.getElementById('vector-reset'),results=document.getElementById('vector-results'),original=document.getElementById('vector-original'),output=document.getElementById('vector-output'),stats=document.getElementById('vector-stats'),downloadBtn=document.getElementById('vector-download'),copyBtn=document.getElementById('vector-copy'),status=document.getElementById('vector-status');
var file=null,image=null,svgText='',sourceUrl='',resultUrl='',activeWorker=null,progressMessageKey='';
function setStatus(s){status.textContent=s}
function setProgress(value,key,indeterminate){
 progressMessageKey=key;
 var wrap=document.getElementById('vector-progress-wrap');
 var track=document.getElementById('vector-progress-track');
 var bar=document.getElementById('vector-progress-bar');
 var label=document.getElementById('vector-progress-text');
 if(!wrap||!track||!bar||!label)return;
 wrap.hidden=false;label.textContent=t(key);
 track.classList.toggle('is-indeterminate',!!indeterminate);
 bar.style.width=indeterminate?'34%':value+'%';
 track.setAttribute('aria-label',lang==='zh-CN'?'SVG 生成进度':'SVG generation progress');
 track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax','100');
 if(indeterminate){track.removeAttribute('aria-valuenow');track.setAttribute('aria-valuetext',t(key))}
 else{track.setAttribute('aria-valuenow',String(value));track.removeAttribute('aria-valuetext')}
}
function finishProgress(){
 setProgress(100,'progressDone',false);
 progressMessageKey='progressDone';
}
function bytes(n){return n<1024?n+' B':n<1048576?(n/1024).toFixed(1)+' KB':(n/1048576).toFixed(2)+' MB'}
function apply(){document.documentElement.lang=lang;document.querySelectorAll('[data-en][data-zh]').forEach(function(e){e.textContent=e.dataset[lang==='zh-CN'?'zh':'en']});document.querySelectorAll('[data-lang]').forEach(function(b){b.setAttribute('aria-pressed',b.dataset.lang===lang?'true':'false')});var wrap=document.getElementById('vector-progress-wrap');if(wrap&&!wrap.hidden&&progressMessageKey){var label=document.getElementById('vector-progress-text');if(label)label.textContent=t(progressMessageKey)}}
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
function clearResult(){if(activeWorker){activeWorker.terminate();if(activeWorker._blobUrl)URL.revokeObjectURL(activeWorker._blobUrl);activeWorker=null}svgText='';if(resultUrl){URL.revokeObjectURL(resultUrl);resultUrl=''}results.hidden=true;stats.hidden=true;stats.textContent='';downloadBtn.disabled=true;copyBtn.disabled=true;output.innerHTML='';var wrap=document.getElementById('vector-progress-wrap');if(wrap)wrap.hidden=true;progressMessageKey=''}
function isLightBackground(d,i){var r=d[i],g=d[i+1],b=d[i+2],hi=Math.max(r,g,b),lo=Math.min(r,g,b);return d[i+3]>8&&lo>=218&&hi>=232&&(hi-lo)<=48}
function quantizeCartoonColors(imgData,maxColors){
 var d=imgData.data,w=imgData.width,h=imgData.height,total=w*h,hist=new Map();
 for(var p=0;p<total;p++){
  var i=p*4;if(d[i+3]<8)continue;
  var r=d[i]>>3,g=d[i+1]>>3,b=d[i+2]>>3,key=(r<<10)|(g<<5)|b;
  var item=hist.get(key);if(item)item.count++;else hist.set(key,{key:key,count:1,r:r*8+4,g:g*8+4,b:b*8+4});
 }
 var bins=Array.from(hist.values());
 if(!bins.length)return;
 var boxes=[bins];
 function range(box,axis){var lo=255,hi=0;for(var z=0;z<box.length;z++){var v=box[z][axis];if(v<lo)lo=v;if(v>hi)hi=v}return hi-lo}
 while(boxes.length<maxColors){
  var best=-1,bestScore=-1,bestAxis='r';
  for(var bi=0;bi<boxes.length;bi++){
   var box=boxes[bi];if(box.length<2)continue;
   var axes=['r','g','b'],axis=axes[0],span=range(box,axis);
   for(var ai=1;ai<3;ai++){var rr=range(box,axes[ai]);if(rr>span){span=rr;axis=axes[ai]}}
   var score=span*Math.log(1+box.reduce(function(sum,x){return sum+x.count},0));
   if(score>bestScore){bestScore=score;best=bi;bestAxis=axis}
  }
  if(best<0)break;
  var chosen=boxes.splice(best,1)[0].slice().sort(function(a,b){return a[bestAxis]-b[bestAxis]});
  var totalWeight=chosen.reduce(function(sum,x){return sum+x.count},0),acc=0,split=1;
  for(;split<chosen.length;split++){acc+=chosen[split-1].count;if(acc>=totalWeight/2)break}
  boxes.push(chosen.slice(0,split),chosen.slice(split));
 }
 var palette=boxes.map(function(box){
  var weight=0,r=0,g=0,b=0;
  box.forEach(function(x){weight+=x.count;r+=x.r*x.count;g+=x.g*x.count;b+=x.b*x.count});
  return {r:r/weight,g:g/weight,b:b/weight};
 });
 var lookup=new Int16Array(32768);
 hist.forEach(function(item,key){
  var best=0,dist=Infinity;
  for(var c=0;c<palette.length;c++){var dr=item.r-palette[c].r,dg=item.g-palette[c].g,db=item.b-palette[c].b,dd=dr*dr+dg*dg+db*db;if(dd<dist){dist=dd;best=c}}
  lookup[key]=best;
 });
 var labels=new Int16Array(total);
 for(var p2=0;p2<total;p2++){
  var q=p2*4;if(d[q+3]<8){labels[p2]=-1;continue}
  var k=((d[q]>>3)<<10)|((d[q+1]>>3)<<5)|(d[q+2]>>3),id=lookup[k],c0=palette[id];
  labels[p2]=id;d[q]=Math.round(c0.r);d[q+1]=Math.round(c0.g);d[q+2]=Math.round(c0.b);
 }
 // Replace tiny isolated color islands with the most common neighboring palette color.
 var seen=new Uint8Array(total),queue=new Int32Array(total),minArea=5;
 for(var start=0;start<total;start++){
  if(seen[start]||labels[start]<0)continue;
  var color=labels[start],head=0,tail=0;queue[tail++]=start;seen[start]=1;
  while(head<tail){
   var cur=queue[head++],x=cur%w;
   if(x>0&& !seen[cur-1]&&labels[cur-1]===color){seen[cur-1]=1;queue[tail++]=cur-1}
   if(x<w-1&& !seen[cur+1]&&labels[cur+1]===color){seen[cur+1]=1;queue[tail++]=cur+1}
   if(cur>=w&& !seen[cur-w]&&labels[cur-w]===color){seen[cur-w]=1;queue[tail++]=cur-w}
   if(cur+w<total&& !seen[cur+w]&&labels[cur+w]===color){seen[cur+w]=1;queue[tail++]=cur+w}
  }
  if(tail<minArea){
   var votes=new Int32Array(palette.length);
   for(var z=0;z<tail;z++){
    var at=queue[z],xx=at%w,neighbors=[xx>0?at-1:-1,xx<w-1?at+1:-1,at>=w?at-w:-1,at+w<total?at+w:-1];
    for(var ni=0;ni<4;ni++){var np=neighbors[ni];if(np>=0&&labels[np]>=0&&labels[np]!==color)votes[labels[np]]++}
   }
   var replacement=color,maxVotes=0;for(var vi=0;vi<votes.length;vi++)if(votes[vi]>maxVotes){maxVotes=votes[vi];replacement=vi}
   if(maxVotes)for(var z2=0;z2<tail;z2++){var pos=queue[z2],pix=pos*4,pc=palette[replacement];labels[pos]=replacement;d[pix]=Math.round(pc.r);d[pix+1]=Math.round(pc.g);d[pix+2]=Math.round(pc.b)}
  }
 }
}
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
function createTraceWorker(){
 var workerGetOptions=function(style,n){
  if(style==='cartoon')return {ltres:1.8,qtres:2,pathomit:22,rightangleenhance:false,colorsampling:2,numberofcolors:Math.min(n,16),colorquantcycles:2,strokewidth:0,linefilter:true,scale:1,roundcoords:1,viewbox:true,desc:false,blurradius:0,blurdelta:20};
  if(style==='logo')return {ltres:1.5,qtres:1.6,pathomit:28,rightangleenhance:true,colorsampling:2,numberofcolors:Math.min(n,16),colorquantcycles:2,strokewidth:0,linefilter:true,scale:1,roundcoords:1,viewbox:true,desc:false,blurradius:0,blurdelta:20};
  return {ltres:1,qtres:1,pathomit:10,rightangleenhance:false,colorsampling:2,numberofcolors:Math.max(16,n),colorquantcycles:3,strokewidth:0,linefilter:false,scale:1,roundcoords:1,viewbox:true,desc:false,blurradius:0,blurdelta:20};
 };
 var source=[
  "importScripts('https://cdn.jsdelivr.net/npm/imagetracerjs@1.2.6/imagetracer_v1.2.6.js');",
  removeInvisiblePaths.toString(),
  countSvgNodes.toString(),
  "var workerGetOptions="+workerGetOptions.toString()+";",
  "self.onmessage=function(event){try{var p=event.data;var imageData={width:p.width,height:p.height,data:new Uint8ClampedArray(p.pixels)};var raw=ImageTracer.imagedataToSVG(imageData,workerGetOptions(p.style,p.colors));if(!raw||raw.length<80)throw new Error('empty');var cleaned=removeInvisiblePaths(raw);self.postMessage({ok:true,svg:cleaned.svg,beforeNodes:countSvgNodes(cleaned.svg),afterNodes:countSvgNodes(cleaned.svg),removedInvisible:cleaned.removed});}catch(error){self.postMessage({ok:false,error:String(error&&error.message||error)});}};"
 ].join("\n");
 var blob=new Blob([source],{type:'text/javascript'});
 var url=URL.createObjectURL(blob);
 var worker=new Worker(url);
 worker._blobUrl=url;
 return worker;
}
convert.addEventListener('click',function(){
 if(!image){setStatus(t('none'));return}
 if(!window.Worker){setStatus(t('failed'));return}
 if(activeWorker){activeWorker.terminate();activeWorker=null}
 convert.disabled=true;reset.disabled=true;downloadBtn.disabled=true;copyBtn.disabled=true;
 setProgress(8,'progressPrep',false);setStatus(t('working'));
 setTimeout(function(){
  var worker=null;
  try{
   var max=1000,w=image.naturalWidth,h=image.naturalHeight,ratio=Math.min(1,max/Math.max(w,h));
   var canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(w*ratio));canvas.height=Math.max(1,Math.round(h*ratio));
   var ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
   var outW=canvas.width,outH=canvas.height,data=ctx.getImageData(0,0,outW,outH);var removed=removeBg.checked?removeEdgeBackground(data):0;if(preset.value==='cartoon')quantizeCartoonColors(data,8);
   canvas.width=0;canvas.height=0;
   setProgress(28,'progressTrace',true);
   worker=createTraceWorker();activeWorker=worker;
   worker.onmessage=function(event){
    if(activeWorker!==worker)return;
    activeWorker=null;URL.revokeObjectURL(worker._blobUrl);
    try{
     var result=event.data;if(!result.ok)throw new Error(result.error||'worker');
     setProgress(92,'progressFinish',false);
     svgText=result.svg.replace(/<\\?xml[^>]*>\\s*/i,'');
     var blob=new Blob([svgText],{type:'image/svg+xml;charset=utf-8'});if(resultUrl)URL.revokeObjectURL(resultUrl);resultUrl=URL.createObjectURL(blob);
     output.innerHTML='';var svgImg=document.createElement('img');svgImg.src=resultUrl;svgImg.alt='Vectorized SVG preview';output.appendChild(svgImg);
     results.hidden=false;var pathCount=(svgText.match(/<path\\b/gi)||[]).length;
     stats.textContent=t('stats',{size:bytes(blob.size),paths:pathCount.toLocaleString(),nodes:result.beforeNodes.toLocaleString()+' → '+result.afterNodes.toLocaleString(),w:outW,h:outH});
     stats.hidden=false;downloadBtn.disabled=false;copyBtn.disabled=false;
     var message=t('done');if(result.removedInvisible)message+=' '+t('invisible',{count:result.removedInvisible.toLocaleString()});if(removed)message+=' '+t('background',{count:removed.toLocaleString()});setStatus(message);
     if(blob.size>2*1024*1024)setStatus(status.textContent+' '+t('largeSvg'));
     finishProgress();convert.disabled=false;reset.disabled=false;
    }catch(error){setProgress(100,'progressFail',false);setStatus(t('failed'));convert.disabled=false;reset.disabled=false}
   };
   worker.onerror=function(){if(activeWorker===worker)activeWorker=null;URL.revokeObjectURL(worker._blobUrl);setProgress(100,'progressFail',false);setStatus(t('failed'));convert.disabled=false;reset.disabled=false};
   worker.postMessage({pixels:data.data.buffer,width:outW,height:outH,style:preset.value,colors:Number(colors.value)},[data.data.buffer]);
  }catch(error){
   if(worker){worker.terminate();URL.revokeObjectURL(worker._blobUrl)}
   activeWorker=null;setProgress(100,'progressFail',false);setStatus(t('failed'));convert.disabled=false;reset.disabled=false;
  }
 },30);
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