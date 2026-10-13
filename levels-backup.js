/* Med13 reward ledger, geometric levels, and local JSON backup/restore. */
(function(){'use strict';
 const REWARD_KEY='student-rewards-v1', PLANNER_KEY='student-planner-v1';

 // أضيفي عتبات جديدة في نهاية المصفوفة عند إضافة مستويات مستقبلية.
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
       pomoMilestones:[...new Set(x.pomoMilestones.map(v=>String(v)))],
       sessionBaseline:Number.isFinite(x.sessionBaseline)&&x.sessionBaseline!==null?x.sessionBaseline:null,
       total:Math.max(0,Math.floor(Number(x.total)))
     };
   }catch(e){return empty;}
 }

 let ledger=read();

 function getCompletedSessionCount(){
   if(typeof S==='undefined'||!S.sessions)return 0;
   return Object.values(S.sessions).reduce((n,v)=>n+Math.max(0,Number(v)||0),0);
 }

 // لا نمنح مكافآت بأثر رجعي للجلسات التي أُنجزت قبل تفعيل سجل المكافآت.
 if(ledger.sessionBaseline===null){
   ledger.sessionBaseline=getCompletedSessionCount();
   try{localStorage.setItem(REWARD_KEY,JSON.stringify(ledger));}catch(e){}
 }

 function write(){
   try{localStorage.setItem(REWARD_KEY,JSON.stringify(ledger));return true;}
   catch(e){return false;}
 }

 // هوية الإنجاز تعتمد على معرّف المهمة وتاريخها، لا على العنوان وحده.
 function fingerprint(d){
   return `${String(d.id)}|${String(d.date||'')}`;
 }

 function currentLegacy(){
   if(typeof S==='undefined'||!S.starsByDay)return 0;
   return Object.values(S.starsByDay).reduce((n,x)=>n+(Number(x)||0),0);
 }

 function total(){
   return currentLegacy()+(Number(ledger.total)||0);
 }

 // كل 3 إنجازات مهام تمنح نجمة واحدة.
 function onTask(e){
   const d=e.detail||{};
   if(!d.first||!d.id||!d.date)return;

   const id=`${String(d.id)}|${String(d.date)}`;

   if(ledger.taskRewards.includes(id))return;

   ledger.taskRewards.push(id);
   ledger.taskFingerprints.push(fingerprint(d));

   ledger.taskCompletions=
     Math.max(0,Math.floor(Number(ledger.taskCompletions)||0))+1;

   if(ledger.taskCompletions%3===0){
     ledger.total+=1;
   }

   write();

   if(typeof updateStars==='function')updateStars();
   renderLevel();
 }

 // كل 8 جلسات في اليوم تمنح 3 نجمات إضافية.
 // المكافآت تُسجّل لكل يوم ولكل عتبة مرة واحدة فقط.
 function onPomo(e){
   const d=e.detail||{},day=String(d.day||'');

   if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||
      typeof S==='undefined'||!S.sessions)return;

   const sessions=Math.max(0,Number(S.sessions[day])||0);
   const milestones=Math.floor(sessions/8);

   if(milestones<1)return;

   let changed=false;

   for(let n=1;n<=milestones;n++){
     const key=`${day}:${n}`;

     if(!ledger.pomoMilestones.includes(key)){
       ledger.pomoMilestones.push(key);
       ledger.total+=3;
       changed=true;
     }
   }

   if(changed){
     write();
     if(typeof updateStars==='function')updateStars();
     renderLevel();
