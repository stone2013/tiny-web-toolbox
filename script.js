(function(){'use strict';
var lang=localStorage.getItem('twt:lang')||(navigator.language&&navigator.language.toLowerCase().startsWith('zh')?'zh-CN':'en');
var dict={
en:{hero:'Small tools for everyday tasks.',sub:'Useful little tools, right in your browser. No uploads, no tracking, no installation.',search:'Search tools…',tools:'Tools',all:'All',developer:'Developer',text:'Text',design:'Design',time:'Time',base:'Base Converter',basedesc:'Convert binary, octal, decimal and hexadecimal.',textname:'Text Tools',textdesc:'Clean up text and count characters.',json:'JSON Formatter',jsondesc:'Format, minify and validate JSON.',color:'Color Converter',colordesc:'Convert HEX, RGB and HSL.',timestamp:'Timestamp Converter',timestampdesc:'Convert Unix timestamps and dates.',privacy:'Private by design',privacysub:'Your input stays on this device. Tools run locally in your browser.',recent:'Recently used',clear:'Clear',soon:'Coming soon'},
'zh-CN':{hero:'日常小任务，用小工具搞定。',sub:'实用的小工具，直接在浏览器中运行。无需上传、无需追踪、无需安装。',search:'搜索工具…',tools:'工具',all:'全部',developer:'开发',text:'文本',design:'设计',time:'时间',base:'进制转换器',basedesc:'二进制、八进制、十进制与十六进制互转。',textname:'文本工具',textdesc:'整理文本并统计字符。',json:'JSON 格式化',jsondesc:'格式化、压缩并校验 JSON。',color:'颜色转换器',colordesc:'转换 HEX、RGB 和 HSL。',timestamp:'时间戳转换器',timestampdesc:'转换 Unix 时间戳和日期。',privacy:'隐私优先',privacysub:'你的输入留在本设备上，所有工具都在浏览器本地运行。',recent:'最近使用',clear:'清除',soon:'即将推出'}
};
function t(k){return dict[lang][k]||dict.en[k]||k}
document.documentElement.lang=lang;
function apply(){document.querySelectorAll('[data-key]').forEach(function(e){e.textContent=t(e.dataset.key)});document.querySelectorAll('[data-placeholder]').forEach(function(e){e.placeholder=t(e.dataset.placeholder)});document.querySelectorAll('[data-lang]').forEach(function(b){b.setAttribute('aria-pressed',b.dataset.lang===lang?'true':'false')});render()}
document.querySelectorAll('[data-lang]').forEach(function(b){b.addEventListener('click',function(){lang=b.dataset.lang;localStorage.setItem('twt:lang',lang);document.documentElement.lang=lang;apply()})});
var cat='all',q='';var cards=[].slice.call(document.querySelectorAll('.card'));
function render(){var visible=0;cards.forEach(function(c){var match=(cat==='all'||c.dataset.cat===cat)&&((c.dataset.search+' '+c.textContent).toLowerCase().includes(q.toLowerCase()));c.classList.toggle('hidden',!match);if(match)visible++});document.getElementById('count').textContent=visible+' / '+cards.length;document.getElementById('empty').classList.toggle('hidden',visible!==0);document.querySelectorAll('[data-cat-filter]').forEach(function(b){b.setAttribute('aria-pressed',b.dataset.catFilter===cat?'true':'false')});}
document.getElementById('search').addEventListener('input',function(e){q=e.target.value;render()});
document.querySelectorAll('[data-cat-filter]').forEach(function(b){b.addEventListener('click',function(){cat=b.dataset.catFilter;render()})});
document.getElementById('year').textContent=new Date().getFullYear();
apply();
})();