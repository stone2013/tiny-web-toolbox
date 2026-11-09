(function(){'use strict';
var lang=localStorage.getItem('twt:lang')||(navigator.language&&navigator.language.toLowerCase().startsWith('zh')?'zh-CN':'en');
var messages={en:{numberDone:'Generated successfully.',stringDone:'String generated.',passwordDone:'Password generated.',saveVault:'Save to vault',saved:'Password encrypted and saved to your vault.',loginRequired:'Sign in first to save passwords.',labelPrompt:'Name this password entry:',masterPrompt:'Enter your vault master password:',vaultMissing:'Create a vault on your Account page first.',saveFail:'Could not save. Check the master password and try again.',copied:'Copied to clipboard.',copyFail:'Could not access the clipboard.',range:'Enter valid safe integers. The range must be between 1 and 4,294,967,296 possible values.',count:'Count must be between 1 and 1,000.',length:'Length must be between {min} and {max}.',charset:'Select at least one character type.',secure:'Secure random generation is not available in this browser.'},'zh-CN':{numberDone:'生成成功。',stringDone:'字符串已生成。',passwordDone:'密码已生成。',saveVault:'保存到密码库',saved:'密码已加密并保存到密码库。',loginRequired:'请先登录账户再保存密码。',labelPrompt:'为这条密码记录命名：',masterPrompt:'请输入密码库主密码：',vaultMissing:'请先在账户页面创建密码库。',saveFail:'保存失败，请检查主密码后重试。',copied:'已复制到剪贴板。',copyFail:'无法访问剪贴板。',range:'请输入有效的安全整数，范围最多包含 4,294,967,296 个可能值。',count:'生成数量必须在 1 到 1,000 之间。',length:'长度必须在 {min} 到 {max} 之间。',charset:'请至少选择一种字符类型。',secure:'当前浏览器不支持安全随机数生成。'}};
function t(k){return messages[lang][k]||messages.en[k]||k}
function apply(){document.documentElement.lang=lang;document.querySelectorAll('[data-en][data-zh]').forEach(function(e){e.textContent=e.dataset[lang==='zh-CN'?'zh':'en']});document.querySelectorAll('[data-en-placeholder][data-zh-placeholder]').forEach(function(e){e.placeholder=e.dataset[lang==='zh-CN'?'zhPlaceholder':'enPlaceholder']});document.querySelectorAll('[data-lang]').forEach(function(b){b.setAttribute('aria-pressed',b.dataset.lang===lang?'true':'false')})}
document.querySelectorAll('[data-lang]').forEach(function(b){b.addEventListener('click',function(){lang=b.dataset.lang;localStorage.setItem('twt:lang',lang);apply()})});
function randomIndex(length){if(!window.crypto||!crypto.getRandomValues)throw Error('secure');if(length<1||length>4294967296)throw Error('range');var limit=Math.floor(4294967296/length)*length,buf=new Uint32Array(1),n;do{crypto.getRandomValues(buf);n=buf[0]}while(n>=limit);return n%length}
function randomChars(chars,length){var out='';for(var i=0;i<length;i++)out+=chars[randomIndex(chars.length)];return out}
function value(id){return Number(document.getElementById(id).value)}
function status(id,msg){document.getElementById(id).textContent=msg}
document.getElementById('generate-numbers').addEventListener('click',function(){var min=value('number-min'),max=value('number-max'),count=value('number-count');if(!Number.isSafeInteger(min)||!Number.isSafeInteger(max)||max<min||max-min+1>4294967296){status('number-status',t('range'));return}if(!Number.isInteger(count)||count<1||count>1000){status('number-status',t('count'));return}try{var nums=[];for(var i=0;i<count;i++)nums.push(min+randomIndex(max-min+1));document.getElementById('number-output').value=nums.join('\n');status('number-status',t('numberDone'))}catch(e){status('number-status',t(e.message==='secure'?'secure':'range'))}});
var sets={lower:'abcdefghijklmnopqrstuvwxyz',upper:'ABCDEFGHIJKLMNOPQRSTUVWXYZ',digits:'0123456789',symbols:'!@#$%^&*()-_=+[]{};:,.?/'};function selected(prefix){var chars='';Object.keys(sets).forEach(function(k){if(document.getElementById(prefix+'-'+k).checked)chars+=sets[k]});return chars}
function generateText(prefix,outId,statusId,min,max,done){var len=value(prefix+'-length'),groups=[];Object.keys(sets).forEach(function(k){if(document.getElementById(prefix+'-'+k).checked)groups.push(sets[k])});var chars=groups.join('');if(!Number.isInteger(len)||len<min||len>max){status(statusId,t('length').replace('{min}',min).replace('{max}',max));return}if(!chars){status(statusId,t('charset'));return}try{var pool=[];groups.forEach(function(group){pool.push(group[randomIndex(group.length)])});while(pool.length<len)pool.push(chars[randomIndex(chars.length)]);for(var i=pool.length-1;i>0;i--){var j=randomIndex(i+1),tmp=pool[i];pool[i]=pool[j];pool[j]=tmp}document.getElementById(outId).value=pool.join('');status(statusId,t(done))}catch(e){status(statusId,t('secure'))}}
document.getElementById('generate-string').addEventListener('click',function(){generateText('string','string-output','string-status',1,512,'stringDone')});
document.getElementById('generate-password').addEventListener('click',function(){generateText('password','password-output','password-status',8,128,'passwordDone')});
document.querySelectorAll('[data-copy]').forEach(function(b){b.addEventListener('click',async function(){var el=document.getElementById(b.dataset.copy);if(!el.value)return;try{if(navigator.clipboard&&navigator.clipboard.writeText)await navigator.clipboard.writeText(el.value);else{el.focus();el.select();if(!document.execCommand('copy'))throw Error('copy')}status(b.dataset.copy.replace('-output','')+'-status',t('copied'))}catch(e){status(b.dataset.copy.replace('-output','')+'-status',t('copyFail'))}})});

// Manual encrypted vault save. Generated password remains local unless the user explicitly saves it.
var saveButton=document.getElementById('save-password');
if(saveButton){
 saveButton.addEventListener('click',async function(){
  var secret=document.getElementById('password-output').value;if(!secret){status('password-status',t('passwordDone'));return}
  if(!window.supabase||!window.supabase.createClient){status('password-status',t('loginRequired'));return}
  var client=window.supabase.createClient('https://iwpxjqnwnpermpscsjo.supabase.co','sb_publishable_aIvw5vhS_RC4OpVNwymS5g_NozY78Pl');
  var session=await client.auth.getSession();if(!session.data.session){status('password-status',t('loginRequired'));return}
  var settings=await client.from('vault_settings').select('*').maybeSingle();if(settings.error||!settings.data){status('password-status',t('vaultMissing'));return}
  var label=prompt(t('labelPrompt'));if(!label||!label.trim())return;
  var master=prompt(t('masterPrompt'));if(!master)return;
  try{
   function from64(s){return Uint8Array.from(atob(s),function(c){return c.charCodeAt(0)})}
   function to64(a){return btoa(String.fromCharCode.apply(null,new Uint8Array(a)))}
   var base=await crypto.subtle.importKey('raw',new TextEncoder().encode(master),'PBKDF2',false,['deriveKey']);
   var key=await crypto.subtle.deriveKey({name:'PBKDF2',salt:from64(settings.data.kdf_salt),iterations:settings.data.kdf_iterations,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
   var check=await crypto.subtle.decrypt({name:'AES-GCM',iv:from64(settings.data.check_iv)},key,from64(settings.data.check_ciphertext));
   if(new TextDecoder().decode(check)!=='TWT vault verification v1')throw Error('unlock');
   var iv=new Uint8Array(12);crypto.getRandomValues(iv);
   var encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv:iv},key,new TextEncoder().encode(secret));
   var user=session.data.session.user;
   var result=await client.from('vault_items').insert({user_id:user.id,label:label.trim(),encrypted_payload:to64(encrypted),iv:to64(iv)});
   if(result.error)throw result.error;
   status('password-status',t('saved'));
  }catch(e){status('password-status',t('saveFail'))}
 });
}

document.querySelector('.year').textContent=new Date().getFullYear();
try{var ids=JSON.parse(localStorage.getItem('twt:recent')||'[]');ids=['random'].concat(ids.filter(function(x){return x!=='random'})).slice(0,3);localStorage.setItem('twt:recent',JSON.stringify(ids))}catch(e){}
apply();
})();