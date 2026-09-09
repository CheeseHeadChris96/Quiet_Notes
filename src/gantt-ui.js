(() => {
  const panel=document.createElement('section');panel.id='gantt-chart';panel.hidden=true;panel.setAttribute('aria-label','Gantt chart');$('notes-home').append(panel);
  const toolbar=document.createElement('div');toolbar.className='gantt-toolbar';
  const add=makeButton('+ Task','Add task',()=>editTask(folderFilter));
  const milestone=makeButton('◇ Milestone','Add milestone',()=>editTask(folderFilter,null,true));
  const undo=makeButton('↶','Undo chart edit',()=>travelChart(-1));const redo=makeButton('↷','Redo chart edit',()=>travelChart(1));
  const previous=makeButton('‹','Previous time period',()=>changePeriod(-1));const next=makeButton('›','Next time period',()=>changePeriod(1));
  const todayButton=makeButton('Today','Show today',()=>{first=GanttModel.day(today())-3;draw();});
  const scale=document.createElement('select');scale.setAttribute('aria-label','Timeline scale');
  for(const [value,label] of [['days','Days'],['weeks','Weeks'],['months','Months']]){const option=document.createElement('option');option.value=value;option.textContent=label;scale.append(option);}scale.value='weeks';scale.onchange=()=>draw();
  const period=document.createElement('span');period.className='gantt-period';toolbar.append(add,milestone,undo,redo,previous,period,next,todayButton,scale);
  const help=document.createElement('p');help.className='gantt-help';help.textContent='Click a task to edit. Drag a bar to move it; drag its ends to resize. Dependencies move later automatically.';
  const scroller=document.createElement('div');scroller.className='gantt-scroll';const board=document.createElement('div');board.className='gantt-board';scroller.append(board);
  const empty=document.createElement('p');empty.className='gantt-empty';empty.textContent='Add a task or milestone to start your chart.';panel.append(toolbar,help,scroller,empty);
  let currentId=null,first=null,drag=null,links=null;const histories=new Map();
  const chart=id=>folders.find(f=>f.id===id&&f.kind==='gantt');
  function today(){const now=new Date();return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;}
  const settings=()=>scale.value==='days'?{count:30,px:28}:scale.value==='months'?{count:365,px:4}:{count:90,px:12};
  const clone=tasks=>tasks.map(t=>({...t,dependencies:[...t.dependencies]}));
  function historyFor(id){if(!histories.has(id))histories.set(id,{states:[clone(chart(id).tasks)],index:0});return histories.get(id);}
  function controls(){const f=chart(folderFilter),h=f&&historyFor(f.id);undo.disabled=!h||!h.index;redo.disabled=!h||h.index>=h.states.length-1;add.disabled=milestone.disabled=storageFailed;}
  function commit(id,tasks,record=true){
    const f=chart(id);if(!f||storageFailed)throw new Error('This chart cannot be saved.');
    const h=historyFor(id),before=f.tasks;f.tasks=GanttModel.schedule(tasks);
    if(!persist()){f.tasks=before;throw new Error('Chart changes could not be saved.');}
    if(!before.length&&f.tasks.length&&folderFilter===id)first=Math.min(...f.tasks.map(t=>GanttModel.day(t.start)))-3;
    if(record){h.states=h.states.slice(0,h.index+1);h.states.push(clone(f.tasks));if(h.states.length>50)h.states.shift();h.index=h.states.length-1;}
    controls();if(folderFilter===id)draw();return f.tasks;
  }
  function travelChart(direction){const f=chart(folderFilter);if(!f)return;const h=historyFor(f.id),target=h.index+direction;if(target<0||target>=h.states.length)return;try{commit(f.id,clone(h.states[target]),false);h.index=target;controls();}catch(error){toast(error.message);}}
  function changePeriod(direction){first+=direction*settings().count;first=Math.max(GanttModel.day('1900-01-01'),Math.min(first,GanttModel.day('2200-01-01')));draw();}
  function svgElement(tag,attrs){const element=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [key,value] of Object.entries(attrs))element.setAttribute(key,String(value));return element;}
  function paint(tasks){
    const {px,count}=settings();
    for(const task of tasks){
      const row=[...board.querySelectorAll('.gantt-row')].find(e=>e.dataset.taskId===task.id);if(!row)continue;
      row.querySelector('.gantt-start').textContent=task.start;row.querySelector('.gantt-end').textContent=task.end;
      const bar=row.querySelector('.gantt-task-bar'),pos=GanttModel.position(task,first,count);bar.hidden=!pos;
      if(pos){bar.style.left=(pos.left*px+(task.milestone?px/2:0))+'px';bar.style.width=task.milestone?'14px':pos.width*px+'px';bar.classList.toggle('clipped-start',pos.clippedStart);bar.classList.toggle('clipped-end',pos.clippedEnd);}
      bar.title=`${task.name}: ${task.start}${task.milestone?' (milestone)':' → '+task.end} · ${task.progress}%`;
    }
    links.replaceChildren();
    for(let i=0;i<tasks.length;i++){
      const task=tasks[i];for(const id of task.dependencies){
        const parent=tasks.find(t=>t.id===id),index=tasks.indexOf(parent),from=(GanttModel.day(parent.end)+1-first)*px,to=(GanttModel.day(task.start)-first)*px;
        if(from<0||from>count*px||to<0||to>count*px)continue;
        const y1=index*42+21,y2=i*42+21,bend=Math.max(from+6,to-6);
        links.append(svgElement('path',{d:`M${from} ${y1}H${bend}V${y2}H${to}m-4 -3 4 3-4 3`,fill:'none',stroke:'currentColor','stroke-width':1}));
      }
    }
  }
  function draw(){
    const f=chart(folderFilter);if(!f)return;
    if(currentId!==f.id){cancelDrag();currentId=f.id;first=f.tasks.length?Math.min(...f.tasks.map(t=>GanttModel.day(t.start)))-3:GanttModel.day(today())-3;}
    controls();const {px,count}=settings();period.textContent=`${GanttModel.date(first)} – ${GanttModel.date(first+count-1)}`;
    const scrollLeft=scroller.scrollLeft,scrollTop=scroller.scrollTop;board.replaceChildren();board.style.width=(420+count*px)+'px';empty.hidden=!!f.tasks.length;scroller.hidden=!f.tasks.length;
    const header=document.createElement('div');header.className='gantt-header';
    const labels=document.createElement('div');labels.className='gantt-labels';for(const text of ['Task','Start','End','%']){const label=document.createElement('span');label.textContent=text;labels.append(label);}
    const dates=document.createElement('div');dates.className='gantt-dates';
    let lastTick=-Infinity;
    for(let i=0;i<count;i++){
      const date=new Date((first+i)*86400000),day=date.getUTCDate();let text='';
      if(scale.value==='days')text=String(day);
      else if(scale.value==='weeks'&&(date.getUTCDay()===1||i===0))text=date.toLocaleDateString(undefined,{month:'short',day:'numeric',timeZone:'UTC'});
      else if(scale.value==='months'&&(day===1||i===0))text=date.toLocaleDateString(undefined,{month:'short',year:'numeric',timeZone:'UTC'});
      if(text&&i*px-lastTick>=(scale.value==='days'?24:60)){lastTick=i*px;const tick=document.createElement('span');tick.title=GanttModel.date(first+i);tick.style.left=i*px+'px';tick.textContent=text;dates.append(tick);}
    }
    header.append(labels,dates);board.append(header);
    links=svgElement('svg',{'aria-hidden':true,width:count*px,height:f.tasks.length*42});links.classList.add('gantt-dependencies');board.append(links);
    for(const task of f.tasks){
      const row=document.createElement('div');row.className='gantt-row';row.dataset.taskId=task.id;
      const cells=document.createElement('div');cells.className='gantt-labels';
      const name=makeButton((task.milestone?'◇ ':'')+task.name,`Edit task ${task.name}`,()=>editTask(f.id,task.id));name.title=task.name;
      const start=document.createElement('span');start.className='gantt-start';const end=document.createElement('span');end.className='gantt-end';const progress=document.createElement('span');progress.textContent=task.progress+'%';cells.append(name,start,end,progress);
      const lane=document.createElement('div');lane.className='gantt-lane';lane.style.backgroundSize=px+'px 100%';
      const bar=document.createElement('div');bar.className='gantt-task-bar'+(task.milestone?' is-milestone':'');bar.tabIndex=0;bar.setAttribute('role','button');bar.setAttribute('aria-label',`${task.milestone?'Milestone':'Task bar'} ${task.name}`);
      const fill=document.createElement('span');fill.className='gantt-progress';fill.style.width=task.progress+'%';bar.append(fill);
      if(!task.milestone)for(const edge of ['start','end']){const handle=document.createElement('span');handle.className='gantt-resize '+edge;handle.dataset.edge=edge;handle.title=`Drag to change ${edge} date`;bar.append(handle);}
      bar.ondblclick=()=>editTask(f.id,task.id);bar.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();editTask(f.id,task.id);}else if(['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();try{commit(f.id,f.tasks.map(t=>t.id===task.id?GanttModel.shift(t,event.key==='ArrowRight'?1:-1):t));}catch(error){toast(error.message);}}};
      bar.onpointerdown=event=>{
        if(event.button!==0||storageFailed)return;event.preventDefault();event.stopPropagation();
        drag={id:f.id,taskId:task.id,task:clone([task])[0],tasks:clone(f.tasks),x:event.clientX,pointer:event.pointerId,bar,edge:event.target.dataset.edge||'move',candidate:null};bar.setPointerCapture(event.pointerId);document.body.classList.add('gantt-dragging');
      };
      bar.onpointermove=event=>{
        if(!drag||event.pointerId!==drag.pointer)return;const delta=Math.round((event.clientX-drag.x)/px);
        try{const updated=GanttModel.shift(drag.task,delta,drag.edge);drag.candidate=GanttModel.schedule(drag.tasks.map(t=>t.id===drag.taskId?updated:t));paint(drag.candidate);}catch{};
      };
      bar.onpointerup=()=>{
        if(!drag)return;const state=drag;drag=null;document.body.classList.remove('gantt-dragging');if(bar.hasPointerCapture(state.pointer))bar.releasePointerCapture(state.pointer);
        if(state.candidate&&JSON.stringify(state.candidate)!==JSON.stringify(state.tasks)){try{commit(state.id,state.candidate);}catch(error){toast(error.message);draw();}}else paint(f.tasks);
      };
      bar.onpointercancel=()=>{cancelDrag();draw();};bar.onlostpointercapture=()=>{if(drag){cancelDrag();draw();}};
      lane.append(bar);row.append(cells,lane);board.append(row);
    }
    const todayOffset=GanttModel.day(today())-first;if(todayOffset>=0&&todayOffset<count){const marker=document.createElement('div');marker.className='gantt-today';marker.style.left=420+(todayOffset+.5)*px+'px';marker.title='Today';board.append(marker);}
    paint(f.tasks);scroller.scrollLeft=scrollLeft;scroller.scrollTop=scrollTop;
  }
  function cancelDrag(){if(!drag)return;const state=drag;drag=null;document.body.classList.remove('gantt-dragging');if(state.bar.hasPointerCapture(state.pointer))state.bar.releasePointerCapture(state.pointer);}
  document.addEventListener('keydown',event=>{if(drag&&event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();cancelDrag();draw();}},true);window.addEventListener('blur',()=>{if(drag){cancelDrag();draw();}});
  const dialog=document.createElement('dialog');dialog.className='gantt-dialog';dialog.setAttribute('aria-label','Task details');const form=document.createElement('form');
  const heading=document.createElement('h2');const error=document.createElement('p');error.setAttribute('role','alert');
  function field(label,type){const wrapper=document.createElement('label');wrapper.textContent=label;const input=document.createElement('input');input.type=type;input.setAttribute('aria-label',label);wrapper.append(input);return {wrapper,input};}
  const name=field('Task name','text');name.input.required=true;name.input.maxLength=200;
  const start=field('Start date','date'),end=field('End date','date');for(const f of [start,end]){f.input.required=true;f.input.min='1900-01-01';f.input.max='2200-12-31';}
  const progress=field('Progress (%)','number');progress.input.required=true;progress.input.min=0;progress.input.max=100;progress.input.step=1;
  const isMilestone=field('Milestone','checkbox');isMilestone.wrapper.className='gantt-milestone-field';
  const dependencies=document.createElement('fieldset'),legend=document.createElement('legend');legend.textContent='Depends on';const dependencyList=document.createElement('div');dependencyList.className='gantt-dependency-list';dependencies.append(legend,dependencyList);
  const explanation=document.createElement('p');explanation.className='gantt-help';explanation.textContent='This task starts after all selected tasks finish. Dependent tasks move later automatically.';
  const actions=document.createElement('div');actions.className='dialog-buttons';
  const remove=makeButton('Delete task','Delete task',()=>{const f=chart(editingChart);if(!f)return;try{commit(f.id,f.tasks.filter(t=>t.id!==editingTask).map(t=>({...t,dependencies:t.dependencies.filter(id=>id!==editingTask)})));dialog.close();toast('Task deleted. Use Undo to restore it.');}catch(e){error.textContent=e.message;}});
  const cancel=makeButton('Cancel','Cancel task changes',()=>dialog.close());const save=document.createElement('button');save.type='submit';save.textContent='Save task';actions.append(remove,cancel,save);
  form.append(heading,name.wrapper,isMilestone.wrapper,start.wrapper,end.wrapper,progress.wrapper,dependencies,explanation,error,actions);dialog.append(form);document.body.append(dialog);
  let editingChart=null,editingTask=null;
  isMilestone.input.onchange=()=>{end.wrapper.hidden=isMilestone.input.checked;end.input.disabled=isMilestone.input.checked;if(isMilestone.input.checked)end.input.value=start.input.value;};
  start.input.onchange=()=>{if(isMilestone.input.checked)end.input.value=start.input.value;};
  function editTask(id,taskId=null,milestone=false){
    const f=chart(id);if(!f||storageFailed)return;editingChart=id;editingTask=taskId;const task=f.tasks.find(t=>t.id===taskId);
    heading.textContent=task?'Edit task':milestone?'New milestone':'New task';name.input.value=task?.name||'';start.input.value=task?.start||today();end.input.value=task?.end||start.input.value;progress.input.value=task?.progress??0;isMilestone.input.checked=task?.milestone??milestone;isMilestone.input.onchange();error.textContent='';remove.hidden=!task;
    dependencyList.replaceChildren();for(const other of f.tasks.filter(t=>t.id!==taskId)){const label=document.createElement('label'),check=document.createElement('input');check.type='checkbox';check.value=other.id;check.checked=task?.dependencies.includes(other.id)||false;label.append(check,document.createTextNode(other.name));dependencyList.append(label);}if(!dependencyList.children.length)dependencyList.textContent='No other tasks yet.';
    dialog.showModal();name.input.focus();
  }
  form.onsubmit=event=>{
    event.preventDefault();const f=chart(editingChart);if(!f){error.textContent='This chart was removed.';return;}
    try{const task={id:editingTask||crypto.randomUUID(),name:name.input.value,start:start.input.value,end:isMilestone.input.checked?start.input.value:end.input.value,progress:Number(progress.input.value),milestone:isMilestone.input.checked,dependencies:[...dependencyList.querySelectorAll('input:checked')].map(e=>e.value)};
      const saved=commit(f.id,editingTask?f.tasks.map(t=>t.id===editingTask?task:t):[...f.tasks,task]).find(t=>t.id===task.id);if(folderFilter===f.id&&!GanttModel.position(saved,first,settings().count)){first=GanttModel.day(saved.start)-3;draw();}dialog.close();
    }catch(e){error.textContent=e.message;}
  };
  const beforeRender=render;render=function(){beforeRender();const activeChart=!!chart(folderFilter);panel.hidden=!activeChart;$('notes-home').classList.toggle('show-gantt',activeChart);if(activeChart){folderActions.hidden=true;childFolders.hidden=true;$('empty').hidden=true;draw();}else{cancelDrag();currentId=null;}};
  window.GanttUI={add:id=>editTask(id)};render();
})();
