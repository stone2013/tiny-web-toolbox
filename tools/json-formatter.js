(function(){
'use strict';
var input=document.getElementById('json-input'),output=document.getElementById('json-output'),errorBox=document.getElementById('error'),status=document.getElementById('status'),lang=localStorage.getItem('twt:lang')||(navigator.language&&navigator.language.toLowerCase().startsWith('zh')?'zh-CN':'en');
var words={en:{ready:'Ready. Paste JSON to begin.',empty:'Paste JSON into the input first.',valid:'Valid JSON. No errors found.',formatted:'JSON formatted successfully.',minified:'JSON minified successfully.',copied:'Result copied.',copyfail:'Could not access the clipboard.',invalid:'Invalid JSON',line:'Line',column:'Column'},'zh-CN':{ready:'准备就绪，请粘贴 JSON。',empty:'请先在输入框中粘贴 JSON。',valid:'JSON 有效，未发现错误。',formatted:'JSON 格式化成功。',minified:'JSON 压缩成功。',copied:'结果已复制。',copyfail:'无法访问剪贴板。',invalid:'JSON 格式错误',line:'行',column:'列'}};
function t(k){return words[lang][k]||words.en[k]||k}
function apply(){document.documentElement.lang=lang;document.querySelectorAll('[data-en][data-zh]').forEach(function(e){e.textContent=e.dataset[lang==='zh-CN'?'zh':'en']});document.querySelectorAll('[data-lang]').forEach(function(b){b.setAttribute('aria-pressed',b.dataset.lang===lang?'true':'false')});}
document.querySelectorAll('[data-lang]').forEach(function(b){b.addEventListener('click',function(){lang=b.dataset.lang;localStorage.setItem('twt:lang',lang);apply();status.textContent=t('ready')})});
function size(n){if(n<1024)return n+' B';if(n<1048576)return (n/1024).toFixed(2)+' KB';return (n/1048576).toFixed(2)+' MB'}
function bytes(s){return new TextEncoder().encode(s).length}
function updateSizes(){document.getElementById('input-size').textContent=size(bytes(input.value));document.getElementById('output-size').textContent=size(bytes(output.value))}
function clearError(){errorBox.textContent='';input.removeAttribute('aria-invalid')}
function parseErrorPosition(message,source){var m=message.match(/position\s+(\d+)/i),pos=m?Number(m[1]):-1;if(pos<0){var lineMatch=message.match(/line\s+(\d+)\s+column\s+(\d+)/i);if(lineMatch)return {line:Number(lineMatch[1]),column:Number(lineMatch[2])};return null}var before=source.slice(0,pos),lines=before.split(/\r\n|\r|\n/);return {line:lines.length,column:Array.from(lines[lines.length-1]).length+1}}
function parse(){clearError();if(!input.value.trim()){status.textContent=t('empty');input.focus();return null}try{return {value:JSON.parse(input.value)}}catch(e){var p=parseErrorPosition(e.message,input.value),detail=t('invalid');if(p)detail+=' · '+t('line')+' '+p.line+', '+t('column')+' '+p.column;errorBox.textContent=detail;input.setAttribute('aria-invalid','true');status.textContent=detail;return null}}
function indentValue(){var v=document.getElementById('indent').value;return v==='tab'?'\t':Number(v)}
function process(mode){var parsed=parse();if(parsed===null)return;var value=parsed.value;try{output.value=mode==='minify'?JSON.stringify(value):JSON.stringify(value,null,indentValue());updateSizes();status.textContent=mode==='minify'?t('minified'):t('formatted')}catch(e){status.textContent=t('invalid')}}
document.getElementById('format').addEventListener('click',function(){process('format')});
document.getElementById('minify').addEventListener('click',function(){process('minify')});
document.getElementById('validate').addEventListener('click',function(){var parsed=parse();if(parsed!==null)status.textContent=t('valid')});
input.addEventListener('input',function(){clearError();updateSizes()});
document.getElementById('clear').addEventListener('click',function(){input.value='';output.value='';clearError();updateSizes();status.textContent=t('ready');input.focus()});
document.getElementById('copy').addEventListener('click',async function(){if(!output.value){status.textContent=t('empty');return}try{if(navigator.clipboard&&navigator.clipboard.writeText)await navigator.clipboard.writeText(output.value);else{var el=document.createElement('textarea');el.value=output.value;document.body.appendChild(el);el.select();if(!document.execCommand('copy'))throw Error('copy failed');el.remove()}status.textContent=t('copied')}catch(e){status.textContent=t('copyfail')}});
document.querySelector('.year').textContent=new Date().getFullYear();
try{var ids=JSON.parse(localStorage.getItem('twt:recent')||'[]');ids=['json'].concat(ids.filter(function(x){return x!=='json'})).slice(0,3);localStorage.setItem('twt:recent',JSON.stringify(ids))}catch(e){}
apply();updateSizes();
})();