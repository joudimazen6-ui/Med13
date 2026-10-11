
/* Med13 weekly planner v1 — independent storage, local dates, Saturday-start weeks. */
(function () {
  'use strict';
  const root = document.getElementById('week');
  if (!root) return;
  const KEY = 'student-planner-v1', WEEK_START = 6;
  const DAYS = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
  const SHORT = ['أحد','اثنين','ثلاثاء','أربعاء','خميس','جمعة','سبت'];
  const pad = n => String(n).padStart(2,'0');
  const keyOf = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  function parseKey(k) {
    const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(k||'');
    if(!m)return null;
    const d=new Date(+m[1],+m[2]-1,+m[3]);
    return keyOf(d)===k?d:null;
  }
  const addDays=(d,n)=>new Date(d.getFullYear(),d.getMonth(),d.getDate()+n);
  const weekOf=d=>addDays(d,-((d.getDay()-WEEK_START+7)%7));
  const today=()=>keyOf(new Date());
  const dateLabel=k=>{
    const d=parseKey(k);
    return `${DAYS[d.getDay()]}، ${d.getDate()} ${d.toLocaleDateString('ar-u-nu-latn',{month:'long'})}`;
  };
  const rangeLabel=d=>{
    const e=addDays(d,6), m=x=>x.toLocaleDateString('ar-u-nu-latn',{month:'long'});
    return `${d.getDate()} ${m(d)} – ${e.getDate()} ${m(e)} ${e.getFullYear()}`;
  };
  const state={tasks:[],rejected:[],notice:'',error:'',start:weekOf(new Date()),selected:today(),view:'day'};
  const uid=()=>typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():'t'+Date.now().toString(36)+Math.random().toString(36).slice(2);

  function normalize(t){
    if(!t||typeof t!=='object'||!parseKey(t.date)||typeof t.title!=='string'||!t.title.trim()||t.id==null)return null;
    const dur=Number(t.duration);
    return {
      id:String(t.id),
      title:t.title.trim().slice(0,120),
      date:t.date,
      subject:typeof t.subject==='string'?t.subject.slice(0,60):'',
      duration:Number.isFinite(dur)&&dur>0?Math.min(600,Math.round(dur)):null,
      notes:typeof t.notes==='string'?t.notes.slice(0,500):'',
      done:!!t.done,
      doneAt:Number.isFinite(t.doneAt)?t.doneAt:null,
      completedOnce:!!(t.completedOnce||t.done),
      createdAt:Number.isFinite(t.createdAt)?t.createdAt:Date.now(),
      updatedAt:Number.isFinite(t.updatedAt)?t.updatedAt:Date.now()
    };
  }

  function load(){
    let raw;
    try{raw=localStorage.getItem(KEY);}
    catch(e){state.notice='التخزين غير متاح؛ قد لا تُحفظ المهام بعد إغلاق الصفحة.';return;}
    if(raw===null)return;
    try{
      const d=JSON.parse(raw);
      if(!d||!Array.isArray(d.tasks))throw Error('invalid');
      const seen=new Set();
      d.tasks.forEach(t=>{
        const n=normalize(t);
        if(!n){state.rejected.push(t);return;}
        if(seen.has(n.id))n.id=uid();
        seen.add(n.id);state.tasks.push(n);
      });
      if(Array.isArray(d.rejected))state.rejected.push(...d.rejected);
      if(state.rejected.length)state.notice=`تم تجاوز ${state.rejected.length} عنصر غير صالح مع الاحتفاظ به ضمن البيانات الاحتياطية.`;
    }catch(e){
      try{localStorage.setItem(KEY+'.corrupt.'+Date.now(),raw);}catch(_){}
      state.notice='تعذّرت قراءة بيانات المخطط؛ حُفظت نسخة خام احتياطية إن أمكن ولم تُستبدل البيانات.';
    }
  }

  function save(){
    try{
      localStorage.setItem(KEY,JSON.stringify({v:1,tasks:state.tasks,rejected:state.rejected}));
      state.error='';return true;
    }catch(e){
      state.error='تعذّر حفظ التغييرات؛ قد تكون مساحة التخزين ممتلئة.';
      return false;
    }
  }

  const $=id=>document.getElementById(id);
  const fire=(n,detail)=>document.dispatchEvent(new CustomEvent(n,{detail}));
  const weekKeys=()=>Array.from({length:7},(_,i)=>keyOf(addDays(state.start,i)));
  const tasksOn=k=>state.tasks.filter(t=>t.date===k).sort((a,b)=>(a.done-b.done)||(a.createdAt-b.createdAt));
  const stats=list=>{
    const done=list.filter(t=>t.done).length;
    return {total:list.length,done,pct:list.length?Math.round(done/list.length*100):0};
  };
  const late=t=>!t.done&&t.date<today();

  root.innerHTML=`
    <div class="pl">
      <h2 class="title"><svg><use href="#i-cal"/></svg>المخطط الأسبوعي</h2>
      <div class="pl-notice" id="plNotice" role="status" hidden></div>
      <div class="pl-card">
        <div class="pl-weeknav">
          <button type="button" class="pl-icon" data-act="prev" aria-label="الأسبوع السابق">›</button>
          <div class="pl-range">
            <b id="plRange"></b>
            <small id="plSub"></small>
            <button type="button" class="pl-link" data-act="today" id="plToday">العودة إلى اليوم</button>
          </div>
          <button type="button" class="pl-icon" data-act="next" aria-label="الأسبوع التالي">‹</button>
        </div>
        <div class="pl-days" id="plDays" role="group" aria-label="أيام الأسبوع"></div>
        <div class="pl-progress">
          <div>
            <div class="pl-prow"><span>اليوم المحدد</span><b id="plDayPct"></b></div>
            <div class="pl-bar" role="progressbar" aria-label="إنجاز اليوم" aria-valuemin="0" aria-valuemax="100" id="plDayBox"><i id="plDayBar"></i></div>
          </div>
          <div>
            <div class="pl-prow"><span>الأسبوع كله</span><b id="plWeekPct"></b></div>
            <div class="pl-bar" role="progressbar" aria-label="إنجاز الأسبوع" aria-valuemin="0" aria-valuemax="100" id="plWeekBox"><i id="plWeekBar"></i></div>
          </div>
        </div>
      </div>
      <div class="pl-card">
        <div class="pl-head">
          <div class="pl-tabs">
            <button type="button" data-act="view" data-view="day" id="plDayTab">اليوم المحدد</button>
            <button type="button" data-act="view" data-view="week" id="plWeekTab">الأسبوع كله</button>
          </div>
          <button type="button" class="pl-btn primary" data-act="add">＋ مهمة جديدة</button>
        </div>
        <div id="plList"></div>
      </div>
    </div>`;

  const modal=document.createElement('div');
  modal.className='pl-modal';modal.hidden=true;
  modal.innerHTML=`
    <form class="pl-dialog" id="plForm" role="dialog" aria-modal="true" aria-labelledby="plFormTitle" novalidate>
      <h3 id="plFormTitle"></h3>
      <p id="plMoveTitle" class="pl-move-title" dir="auto"></p>
      <label class="pl-hide-move">عنوان المهمة <span class="pl-req">*</span><input id="plTitle" maxlength="120" dir="auto" autocomplete="off"></label>
      <label class="pl-hide-move">المادة أو التصنيف (اختياري)<select id="plSubject"></select></label>
      <label id="plOtherWrap" hidden>اسم المادة أو التصنيف<input id="plOther" maxlength="60" dir="auto"></label>
      <div class="pl-grid2">
        <label>التاريخ <span class="pl-req">*</span><input id="plDate" type="date" required></label>
        <label class="pl-hide-move">المدة بالدقائق<input id="plDur" type="number" min="1" max="600" inputmode="numeric"></label>
      </div>
      <label class="pl-hide-move">ملاحظات (اختياري)<textarea id="plNotes" rows="3" maxlength="500" dir="auto"></textarea></label>
      <p id="plErr" class="pl-err" role="alert" hidden></p>
      <div class="pl-actions">
        <button type="submit" class="pl-btn primary">حفظ</button>
        <button type="button" class="pl-btn" id="plCancel">إلغاء</button>
      </div>
    </form>`;
  document.body.appendChild(modal);

  const f={
    form:$('plForm'),title:$('plTitle'),subject:$('plSubject'),
    other:$('plOther'),otherWrap:$('plOtherWrap'),date:$('plDate'),
    dur:$('plDur'),notes:$('plNotes'),err:$('plErr'),
    heading:$('plFormTitle'),move:$('plMoveTitle'),
    mode:'add',id:null,focus:null
  };

  function fillSubjects(cur){
    const names=(typeof SUBJECTS!=='undefined'?SUBJECTS:[]).map(x=>x.name);
    f.subject.innerHTML='';
    [['','بدون مادة'],...names.map(x=>[x,x]),['__other','مادة أو تصنيف آخر…']].forEach(([v,l])=>{
      const o=document.createElement('option');o.value=v;o.textContent=l;f.subject.appendChild(o);
    });
    if(cur&&!names.includes(cur)){f.subject.value='__other';f.other.value=cur;}
    else{f.subject.value=cur||'';f.other.value='';}
    f.otherWrap.hidden=f.subject.value!=='__other';
  }
  f.subject.addEventListener('change',()=>f.otherWrap.hidden=f.subject.value!=='__other');

  function openForm(mode,t){
    f.mode=mode;f.id=t&&t.id;
    f.heading.textContent=mode==='add'?'مهمة جديدة':mode==='edit'?'تعديل المهمة':'نقل المهمة إلى تاريخ آخر';
    f.move.textContent=mode==='move'&&t?t.title:'';
    f.title.value=t?t.title:'';
    fillSubjects(t?t.subject:'');
    f.date.value=t?t.date:state.selected;
    f.dur.value=t&&t.duration?t.duration:'';
    f.notes.value=t?t.notes:'';
    f.err.hidden=true;
    modal.classList.toggle('pl-move',mode==='move');
    f.focus=document.activeElement;
    modal.hidden=false;
    (mode==='move'?f.date:f.title).focus();
  }

  function closeForm(){
    modal.hidden=true;
    if(f.focus&&f.focus.focus)f.focus.focus();
  }

  f.form.addEventListener('submit',e=>{
    e.preventDefault();
    if(modal.hidden)return;
    const date=f.date.value;
    if(!parseKey(date)){f.err.textContent='اختر تاريخاً صحيحاً.';f.err.hidden=false;return;}

    if(f.mode==='move'){
      const t=state.tasks.find(x=>x.id===f.id);
      if(t){
        t.date=date;t.updatedAt=Date.now();state.selected=date;
      }
      closeForm();state.start=weekOf(parseKey(date));commit();return;
    }

    const title=f.title.value.trim();
    if(!title){f.err.textContent='اكتب عنوان المهمة.';f.err.hidden=false;return;}
    let subject=f.subject.value;
    if(subject==='__other'){
      subject=f.other.value.trim();
      if(!subject){f.err.textContent='اكتب اسم المادة أو اختر بدون مادة.';f.err.hidden=false;return;}
    }

    let duration=null;
    if(f.dur.value.trim()){
      duration=Number(f.dur.value);
      if(!Number.isInteger(duration)||duration<1||duration>600){
        f.err.textContent='المدة يجب أن تكون بين 1 و600 دقيقة.';
        f.err.hidden=false;return;
      }
    }

    const now=Date.now(),notes=f.notes.value.trim();
    if(f.mode==='add'){
      state.tasks.push({
        id:uid(),title,subject,date,duration,notes,
        done:false,doneAt:null,completedOnce:false,
        createdAt:now,updatedAt:now
      });
    }else{
      const t=state.tasks.find(x=>x.id===f.id);
      if(!t){closeForm();return;}
      Object.assign(t,{title,subject,date,duration,notes,updatedAt:now});
    }
    closeForm();state.selected=date;state.start=weekOf(parseKey(date));commit();
  });

  $('plCancel').addEventListener('click',closeForm);
  modal.addEventListener('click',e=>{if(e.target===modal)closeForm();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden)closeForm();});

  function commit(){save();render();}

  function toggle(t){
    const now=Date.now();
    if(!t.done){
      const first=!t.completedOnce;
      t.done=true;t.doneAt=now;t.completedOnce=true;t.updatedAt=now;
      commit();
      fire('planner:task-completed',{id:t.id,title:t.title,date:t.date,first});
    }else{
      t.done=false;t.doneAt=null;t.updatedAt=now;
      commit();
      fire('planner:task-uncompleted',{id:t.id});
    }
  }

  function remove(t){
    if(!confirm(`حذف المهمة «${t.title}»؟`))return;
    state.tasks=state.tasks.filter(x=>x.id!==t.id);
    commit();
    fire('planner:task-deleted',{id:t.id,title:t.title,date:t.date,completedOnce:t.completedOnce});
  }

  function textButton(label,act,aria){
    const b=document.createElement('button');
    b.type='button';b.className='pl-link';b.textContent=label;b.dataset.act=act;
    if(aria)b.setAttribute('aria-label',aria);
    return b;
  }

  function el(tag,cls,txt){
    const n=document.createElement(tag);
    if(cls)n.className=cls;
    if(txt!==undefined)n.textContent=txt;
    return n;
  }

  function taskEl(t){
    const li=el('li','pl-task'+(t.done?' done':'')+(late(t)?' late':''));
    li.dataset.id=t.id;
    const chk=el('button','pl-check','✓');
    chk.type='button';chk.dataset.act='toggle';
    chk.setAttribute('aria-pressed',String(t.done));
    chk.setAttribute('aria-label',(t.done?'إلغاء إكمال ':'إكمال ')+t.title);

    const body=el('div','pl-body');
    const title=el('span','pl-task-title',t.title);title.dir='auto';
    body.appendChild(title);

    const meta=el('div','pl-meta');
    if(t.subject)meta.appendChild(el('span','pl-chip',t.subject));
    if(t.duration)meta.appendChild(el('span','pl-chip mute',t.duration+' دقيقة'));
    if(late(t))meta.appendChild(el('span','pl-chip bad','متأخرة'));
    if(t.done)meta.appendChild(el('span','pl-chip ok','مكتملة'));
    if(meta.childNodes.length)body.appendChild(meta);

    if(t.notes){
      const p=el('p','pl-notes',t.notes);p.dir='auto';body.appendChild(p);
    }

    const acts=el('div','pl-acts');
    acts.append(textButton('تعديل','edit','تعديل '+t.title));
    if(!t.done)acts.append(textButton('نقل لتاريخ آخر','move','نقل '+t.title));
    acts.append(textButton('حذف','delete','حذف '+t.title));
    body.appendChild(acts);li.append(chk,body);
    return li;
  }

  function listFor(keys){
    const ul=el('ul','pl-tasks');
    keys.forEach(k=>tasksOn(k).forEach(t=>ul.appendChild(taskEl(t))));
    return ul;
  }

  function render(){
    const tk=today(),wk=weekKeys(),cur=keyOf(weekOf(new Date()));
    const notice=[$('plNotice')&&state.notice,state.error].filter(Boolean).join(' ');
    $('plNotice').hidden=!notice;$('plNotice').textContent=notice;
    $('plRange').textContent=rangeLabel(state.start);
    $('plSub').textContent=keyOf(state.start)===cur?'الأسبوع الحالي':'';
    $('plToday').hidden=state.selected===tk;

    const days=$('plDays');days.innerHTML='';
    wk.forEach(k=>{
      const d=parseKey(k),list=tasksOn(k),s=stats(list);
      const b=el('button','pl-day'+(k===state.selected?' sel':'')+(k===tk?' today':''));
      b.type='button';b.dataset.act='day';b.dataset.date=k;
      b.setAttribute('aria-pressed',String(k===state.selected));
      b.setAttribute('aria-label',dateLabel(k));
      b.append(el('small','',SHORT[d.getDay()]),el('b','',String(d.getDate())));
      const mini=el('span','pl-mini'),fill=el('i');
      fill.style.width=s.pct+'%';mini.appendChild(fill);
      b.append(mini,el('span','pl-late-dot'+(list.some(late)?' on':'')));
      days.appendChild(b);
    });

    const sd=stats(tasksOn(state.selected));
    const sw=stats(state.tasks.filter(t=>wk.includes(t.date)));
    const fmt=s=>s.total?`${s.done} من ${s.total} (${s.pct}%)`:'لا مهام';
    $('plDayPct').textContent=fmt(sd);$('plWeekPct').textContent=fmt(sw);
    $('plDayBar').style.width=sd.pct+'%';$('plWeekBar').style.width=sw.pct+'%';
    $('plDayBox').setAttribute('aria-valuenow',sd.pct);
    $('plWeekBox').setAttribute('aria-valuenow',sw.pct);

    [['plDayTab','day'],['plWeekTab','week']].forEach(([id,v])=>{
      $(id).classList.toggle('on',state.view===v);
      $(id).setAttribute('aria-pressed',String(state.view===v));
    });

    const box=$('plList');box.innerHTML='';
    if(state.view==='day'){
      const h=el('div','pl-dayhead');
      h.appendChild(el('b','',dateLabel(state.selected)));
      if(state.selected===tk)h.appendChild(el('span','pl-chip ok','اليوم'));
      box.appendChild(h);
      const l=tasksOn(state.selected);
      box.appendChild(l.length?listFor([state.selected]):el('p','pl-empty','لا توجد مهام في هذا اليوم. أضف مهمتك الأولى.'));
    }else{
      let any=false;
      wk.forEach(k=>{
        const l=tasksOn(k);if(!l.length)return;any=true;
        const h=el('div','pl-dayhead');
        h.append(el('b','',dateLabel(k)),el('span','pl-chip mute',`${l.filter(t=>t.done).length} من ${l.length}`));
        if(k===tk)h.appendChild(el('span','pl-chip ok','اليوم'));
        box.append(h,listFor([k]));
      });
      if(!any)box.appendChild(el('p','pl-empty','لا توجد مهام في هذا الأسبوع.'));
    }
  }

  root.addEventListener('click',e=>{
    const b=e.target.closest('[data-act]');
    if(!b||!root.contains(b))return;
    const a=b.dataset.act;
    if(a==='prev'||a==='next'){
      const idx=Math.max(0,weekKeys().indexOf(state.selected));
      state.start=addDays(state.start,a==='prev'?-7:7);
      state.selected=keyOf(addDays(state.start,idx));
      return render();
    }
    if(a==='today'){state.start=weekOf(new Date());state.selected=today();return render();}
    if(a==='add')return openForm('add');
    if(a==='view'){state.view=b.dataset.view;return render();}
    if(a==='day'){state.selected=b.dataset.date;return render();}
    const li=b.closest('.pl-task'),t=li&&state.tasks.find(x=>x.id===li.dataset.id);
    if(!t)return;
    if(a==='toggle')toggle(t);
    if(a==='edit')openForm('edit',t);
    if(a==='move')openForm('move',t);
    if(a==='delete')remove(t);
  });

  window.PlannerAPI={
    version:1,
    getData(){return JSON.parse(JSON.stringify({v:1,tasks:state.tasks,rejected:state.rejected}));},
    setData(obj){
      if(!obj||!Array.isArray(obj.tasks))return{ok:false,error:'بيانات المخطط غير صالحة.'};
      const next=[],rej=Array.isArray(obj.rejected)?obj.rejected.slice():[];
      obj.tasks.forEach(t=>{const n=normalize(t);if(n)next.push(n);else rej.push(t);});
      state.tasks=next;state.rejected=rej;state.notice='';
      const ok=save();render();
      return{ok,count:next.length,rejected:rej.length};
    }
  };

  load();render();
  let last=today();
  setInterval(()=>{if(today()!==last){last=today();render();}},30000);
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible'&&today()!==last){last=today();render();}
  });
  window.addEventListener('storage',e=>{
    if(e.key===KEY){state.tasks=[];state.rejected=[];load();render();}
  });
})();
