/* Med13 reward ledger, geometric levels, and local JSON backup/restore. */
(function(){'use strict';
 const REWARD_KEY='student-rewards-v1', PLANNER_KEY='student-planner-v1';
 const THRESHOLDS=[0,20,50,90,140,200,270,350,450,570];

 function read(){
   const empty={v:1,taskRewards:[],taskFingerprints:[],taskCompletions:0,pomoMilestones:[],sessionBaseline:null,total:0};
   try{
     const x=JSON.parse(localStorage.getItem(REWARD_KEY)||'null');
     if(!x||x.v!==1||!Array.isArray(x.taskRewards)||!Array.isArray(x.pomoMilestones)||!Number.isFinite(Number(x.total)))return empty;
     return {...x,
       taskRewards:[...new Set(x.taskRewards.map(String))],
       taskFingerprints:Array.isArray(x.taskFingerprints)?[...new Set(x.taskFingerprints.map(String))]:[],
       taskCompletions:Math.max(0,Math.floor(Number(x.taskCompletions)||0)),
       pomoMilestones:[...new Set(x.pomoMilestones.map(String))],
       sessionBaseline:Number.isFinite(x.sessionBaseline)&&x.sessionBaseline!==null?x.sessionBaseline:null,
       total:Math.max(0,Math.floor(Number(x.total)))
     };
   }catch(e){return empty;}
 }

 let ledger=read();

 // الحفاظ على سجل المهام القديم ومنع احتساب المهمة نفسها
 // مرتين في التاريخ نفسه أثناء الانتقال للنظام الجديد.
 try{
   const oldPlanner=JSON.parse(localStorage.getItem(PLANNER_KEY)||'null');
   if(oldPlanner&&Array.isArray(oldPlanner.tasks)){
     oldPlanner.tasks.forEach(t=>{
       if(t&&t.id!=null&&t.date&&t.completedOnce&&ledger.taskRewards.includes(String(t.id))){
         const key=`${String(t.id)}|${String(t.date)}`;
         if(!ledger.taskRewards.includes(key))ledger.taskRewards.push(key);
       }
     });
   }
 }catch(e){}

 function getCompletedSessionCount(){
   if(typeof S==='undefined'||!S.sessions)return 0;
   return Object.values(S.sessions).reduce((n,v)=>n+Math.max(0,Number(v)||0),0);
 }

 // عدم منح مكافآت بأثر رجعي عند تفعيل النظام.
 if(ledger.sessionBaseline===null){
   ledger.sessionBaseline=getCompletedSessionCount();
   try{localStorage.setItem(REWARD_KEY,JSON.stringify(ledger));}catch(e){}
 }

 function write(){
   try{
     localStorage.setItem(REWARD_KEY,JSON.stringify(ledger));
     return true;
   }catch(e){return false;}
 }

 function fingerprint(d){
   return `${String(d.id)}|${String(d.date||'')}`;
 }

 function currentLegacy(){
   if(typeof S==='undefined'||!S.starsByDay)return 0;
   return Object.values(S.starsByDay).reduce((n,x)=>n+(Number(x)||0),0);
 }

 // مجموع النجوم القديمة والجديدة، دون تصفير التقدم السابق.
 function total(){
   return currentLegacy()+(Number(ledger.total)||0);
 }

 // نجمة واحدة لكل ثلاثة إنجازات مهام.
 // المهمة نفسها تُحتسب من جديد إذا أُنجزت بتاريخ مختلف.
 function onTask(e){
   const d=e.detail||{};
   if(!d.id||!/^\d{4}-\d{2}-\d{2}$/.test(String(d.date||'')))return;

   const id=`${String(d.id)}|${String(d.date)}`;
   if(ledger.taskRewards.includes(id))return;

   ledger.taskRewards.push(id);
   ledger.taskFingerprints.push(fingerprint(d));
   ledger.taskCompletions=Math.max(0,Math.floor(Number(ledger.taskCompletions)||0))+1;

   if(ledger.taskCompletions%3===0)ledger.total+=1;

   write();
   if(typeof updateStars==='function')updateStars();
   renderLevel();
 }

 // 3 نجوم عند الجلسة الثامنة، و3 إضافية عند السادسة عشرة،
 // وهكذا. المفتاح يتضمن التاريخ لمنع تكرار المكافأة.
 function onPomo(e){
   const d=e.detail||{},day=String(d.day||'');

   if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||typeof S==='undefined'||!S.sessions)return;

   const sessions=Math.max(0,Number(S.sessions[day])||0);

   // المكافأة عند بلوغ مضاعف 8 فقط.
   // لا نمنح مكافآت قديمة لمجرد فتح الموقع.
   if(sessions<8||sessions%8!==0)return;

   const milestone=Math.floor(sessions/8);
   const key=`${day}:${milestone}`;

   if(ledger.pomoMilestones.includes(key))return;

   ledger.pomoMilestones.push(key);
   ledger.total+=3;

   write();
   if(typeof updateStars==='function')updateStars();
   renderLevel();
 }

 document.addEventListener('planner:task-completed',onTask);
 document.addEventListener('med13:pomo-work-completed',onPomo);

 // مستويات إضافية قابلة للتوسيع دون إعادة تعيين النجوم.
 function levelFor(n){
   let idx=0;
   for(let i=0;i<THRESHOLDS.length;i++){
     if(n>=THRESHOLDS[i])idx=i;
   }
   return idx;
 }

 function renderLevel(){
   const n=total(),idx=levelFor(n),next=THRESHOLDS[idx+1],prev=THRESHOLDS[idx];
   const pct=next?Math.max(0,Math.min(100,(n-prev)/(next-prev)*100)):100;
   const put=(id,v)=>{
     const x=document.getElementById(id);
     if(x)x.textContent=v;
   };

   put('levelNumber',idx+1);
   put('levelCaption',idx===THRESHOLDS.length-1?'وصلت إلى أعلى مستوى!':`تابع التقدم نحو المستوى ${idx+2}`);
   put('levelStarText',`${n} نجمة إجمالاً`);
   put('levelNextText',next?`باقي ${next-n} نجمة للمستوى التالي`:'أعلى مستوى');

   const bar=document.getElementById('levelBar');
   if(bar)bar.style.width=pct+'%';

   const emblem=document.getElementById('levelEmblem');
   if(emblem){
     emblem.className='level-emblem level-'+(idx+1);
     const svg=emblem.querySelector('svg');

     if(svg){
       const variants=[
         `<path d="M50 8 86 29 86 71 50 92 14 71 14 29Z M50 8V92 M14 29 86 71 M86 29 14 71"/><circle cx="50" cy="50" r="22"/>`,
         `<path d="M50 5 91 29 91 71 50 95 9 71 9 29Z M50 5 9 71 91 71 50 5 9 29 91 29 50 95"/><circle cx="50" cy="50" r="18"/>`,
         `<path d="M50 5 88 18 95 50 75 86 50 95 25 86 5 50 12 18Z M12 18 75 86 M88 18 25 86 M5 50h90 M50 5v90"/><circle cx="50" cy="50" r="27"/><circle cx="50" cy="50" r="12"/>`,
         `<path d="M50 4 72 18 92 34 86 61 72 82 50 96 28 82 8 61 2 34 28 18Z M28 18 72 82 M72 18 28 82 M2 34 92 61 M92 34 8 61"/><circle cx="50" cy="50" r="31"/><path d="M50 19 77 35 77 65 50 81 23 65 23 35Z"/>`,
         `<path d="M50 3 68 14 86 14 86 32 97 50 86 68 86 86 68 86 50 97 32 86 14 86 14 68 3 50 14 32 14 14 32 14Z M50 3v94 M3 50h94 M14 14l72 72 M86 14 14 86"/><circle cx="50" cy="50" r="34"/><circle cx="50" cy="50" r="20"/>`,
         `<path d="M50 2 64 10 80 8 87 23 98 34 91 50 98 66 87 77 80 92 64 90 50 98 36 90 20 92 13 77 2 66 9 50 2 34 13 23 20 8 36 10Z M50 2v96 M2 34l96 32 M98 34 2 66 M20 8l60 84 M80 8 20 92"/><circle cx="50" cy="50" r="36"/><circle cx="50" cy="50" r="25"/><circle cx="50" cy="50" r="10"/>`
       ];
       svg.innerHTML=variants[idx%variants.length];
     }
   }

   const badges=document.getElementById('levelBadges');
   if(badges){
     badges.innerHTML='';
     for(let i=0;i<THRESHOLDS.length;i++){
       const b=document.createElement('span');
       b.className='level-badge'+(i===idx?' current':i<idx?' reached':'');
       b.textContent=String(i+1);
       b.title=`المستوى ${i+1}: ${THRESHOLDS[i]} نجمة فما فوق`;
       badges.appendChild(b);
     }
   }
 }

 window.Med13Rewards={
   getData:()=>JSON.parse(JSON.stringify(ledger)),
   bonusTotal:()=>Number(ledger.total)||0,

   setData(obj){
     if(!obj||obj.v!==1||!Array.isArray(obj.taskRewards)||!Array.isArray(obj.pomoMilestones)||!Number.isFinite(Number(obj.total)))return false;

     ledger={
       v:1,
       taskRewards:[...new Set(obj.taskRewards.map(String))],
       taskFingerprints:Array.isArray(obj.taskFingerprints)?[...new Set(obj.taskFingerprints.map(String))]:[],
       pomoMilestones:[...new Set(obj.pomoMilestones.map(String))],
       taskCompletions:Math.max(0,Math.floor(Number(obj.taskCompletions)||0)),
       sessionBaseline:Number.isFinite(obj.sessionBaseline)&&obj.sessionBaseline!==null?obj.sessionBaseline:getCompletedSessionCount(),
       total:Math.max(0,Math.floor(Number(obj.total)))
     };

     return write();
   },

   render:renderLevel,
   total
 };

 // النسخ الاحتياطي والاستعادة.
 const status=document.getElementById('backupStatus');
 const file=document.getElementById('importDataFile');

 function say(s){
   if(status)status.textContent=s;
 }

 document.getElementById('exportData')?.addEventListener('click',()=>{
   try{
     const data={
       format:'med13-backup',
       version:1,
       createdAt:new Date().toISOString(),
       site:JSON.parse(localStorage.getItem('student-site-v1')||'{}'),
       planner:JSON.parse(localStorage.getItem(PLANNER_KEY)||'{"v":1,"tasks":[],"rejected":[]}'),
       rewards:read()
     };

     const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
     const url=URL.createObjectURL(blob);
     const a=document.createElement('a');

     a.href=url;
     a.download='med13-backup-'+new Date().toISOString().slice(0,10)+'.json';
     document.body.appendChild(a);
     a.click();
     a.remove();
     URL.revokeObjectURL(url);

     say('تم إنشاء ملف النسخة الاحتياطية. احتفظ به في مكان آمن.');
   }catch(e){
     say('تعذر تصدير البيانات.');
   }
 });

 document.getElementById('importDataBtn')?.addEventListener('click',()=>file?.click());

 file?.addEventListener('change',async()=>{
   const f=file.files&&file.files[0];
   if(!f)return;

   try{
     if(f.size>5*1024*1024)throw Error('الملف أكبر من الحد المسموح.');

     const d=JSON.parse(await f.text());

     if(
       !d||
       d.format!=='med13-backup'||
       d.version!==1||
       !d.site||
       typeof d.site!=='object'||
       Array.isArray(d.site)||
       !d.planner||
       !Array.isArray(d.planner.tasks)||
       !d.rewards||
       d.rewards.v!==1||
       !Array.isArray(d.rewards.taskRewards)||
       !Array.isArray(d.rewards.pomoMilestones)||
       !Number.isFinite(Number(d.rewards.total))
     ){
       throw Error('بنية النسخة غير صالحة أو غير متوافقة.');
     }

     if(!confirm('سيتم استبدال بيانات Med13 المحلية بالبيانات الموجودة في النسخة. هل أنشأت نسخة احتياطية من بياناتك الحالية وتريد المتابعة؟'))return;

     localStorage.setItem('student-site-v1',JSON.stringify(d.site));
     localStorage.setItem(PLANNER_KEY,JSON.stringify(d.planner));
     localStorage.setItem(REWARD_KEY,JSON.stringify(d.rewards));

     say('تم استيراد النسخة. سيُعاد تحميل الموقع لتطبيق البيانات.');
     setTimeout(()=>location.reload(),700);
   }catch(e){
     say(e.message||'تعذر استيراد الملف. لم يتم تطبيق النسخة.');
   }finally{
     file.value='';
   }
 });

 renderLevel();
})();
