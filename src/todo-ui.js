(() => {
  const panel=document.createElement('section');panel.id='todo-page';panel.setAttribute('aria-label','To-do page');panel.hidden=true;$('notes-home').append(panel);
  const add=makeButton('+','Add to-do task',()=>edit(folderFilter,null,null));add.className='todo-add-root';add.title='Add task';
  const toolbar=document.createElement('div');toolbar.className='todo-toolbar';
  const filter=document.createElement('select');filter.setAttribute('aria-label','Show to-do tasks');for(const [value,label] of [['all','All tasks'],['active','To do'],['completed','Completed']]){const option=document.createElement('option');option.value=value;option.textContent=label;filter.append(option);}
  const status=document.createElement('span');status.className='todo-status';status.setAttribute('role','status');
  const undo=makeButton('↶','Undo to-do edit',()=>travel(-1)),redo=makeButton('↷','Redo to-do edit',()=>travel(1));undo.title='Undo';redo.title='Redo';toolbar.append(filter,status,undo,redo);
  const list=document.createElement('ul');list.className='todo-list';list.setAttribute('aria-label','To-do tasks');
  const empty=document.createElement('p');empty.className='todo-empty';panel.append(toolbar,list,empty,add);
  const histories=new Map();let currentId=null;
  const page=id=>folders.find(f=>f.id===id&&f.kind==='todo');
  const copy=items=>items.map(item=>({...item}));
  function historyFor(f){let h=histories.get(f.id);if(!h||JSON.stringify(h.states[h.index])!==JSON.stringify(f.items)){h={states:[copy(f.items)],index:0};histories.set(f.id,h);}return h;}
  function saveItems(id,items,target=null){
    const f=page(id);if(!f||storageFailed)throw new Error('This to-do page cannot be saved.');
    const h=historyFor(f),previous=f.items;f.items=TodoModel.validate(items);
    if(!persist()){f.items=previous;throw new Error('Task changes could not be saved.');}
    if(target===null){h.states=h.states.slice(0,h.index+1);h.states.push(copy(f.items));if(h.states.length>50)h.states.shift();h.index=h.states.length-1;}else h.index=target;
    if(folderFilter===id)draw();
  }
  function travel(direction){const f=page(folderFilter);if(!f)return;const h=historyFor(f),target=h.index+direction;if(target<0||target>=h.states.length)return;try{saveItems(f.id,copy(h.states[target]),target);}catch(error){toast(error.message);}}
  function today(){const now=new Date();return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;}
  function draw(){
    const f=page(folderFilter);if(!f)return;
    if(currentId!==f.id){currentId=f.id;filter.value='all';}
    const h=historyFor(f);undo.disabled=storageFailed||h.index===0;redo.disabled=storageFailed||h.index===h.states.length-1;add.disabled=storageFailed;
    const completed=f.items.filter(item=>item.completed).length;status.textContent=`${f.items.length-completed} to do · ${completed} completed`;
    list.replaceChildren();const items=TodoModel.visible(f.items,filter.value);
    for(const {item,depth,context} of items){
      const row=document.createElement('li');row.className='todo-item'+(item.completed?' completed':'');row.dataset.todoId=item.id;row.style.paddingLeft=(depth*22)+'px';row.classList.toggle('todo-context',context);row.setAttribute('aria-level',String(depth+1));attachDrag(row,item,f);
      const check=document.createElement('input');check.type='checkbox';check.checked=item.completed;check.disabled=storageFailed;check.setAttribute('aria-label',`Mark ${item.title} ${item.completed?'incomplete':'complete'}`);
      check.onchange=()=>{try{saveItems(f.id,f.items.map(t=>t.id===item.id?{...t,completed:check.checked}:t));const replacement=[...list.children].find(e=>e.dataset.todoId===item.id);(replacement?.querySelector('input')||add).focus();}catch(error){check.checked=item.completed;toast(error.message);}};
      const title=makeButton(item.title,`Edit task ${item.title}`,()=>edit(f.id,item.id));title.className='todo-title';title.title='Edit task';
      const due=document.createElement('span');due.className='todo-due';if(item.due){const overdue=!item.completed&&item.due<today();due.textContent=(overdue?'Overdue · ':item.due===today()?'Today · ':'')+item.due;due.classList.toggle('overdue',overdue);}
      const remove=makeButton('',`Delete task ${item.title}`,()=>{try{saveItems(f.id,TodoModel.remove(f.items,item.id));toast('Task and its subtasks deleted. Use Undo to restore them.');add.focus();}catch(error){toast(error.message);}});remove.className='todo-delete';remove.title='Delete task';remove.disabled=storageFailed;
      const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d','M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7');svg.append(path);remove.append(svg);
      const subtask=makeButton('+',`Add subtask to ${item.title}`,()=>edit(f.id,null,item.id));subtask.className='todo-add-child';subtask.title='Add subtask';subtask.disabled=storageFailed;
      row.append(check,title,due,subtask,remove);list.append(row);
    }
    empty.hidden=!!items.length;empty.textContent=filter.value==='completed'?'No completed tasks yet.':f.items.length?'All caught up.':'Use + below to add your first task.';
  }
  filter.onchange=draw;
  const dialog=document.createElement('dialog');dialog.className='todo-dialog';dialog.setAttribute('aria-label','Edit to-do task');const form=document.createElement('form');const heading=document.createElement('h2');heading.textContent='Edit task';
  const nameLabel=document.createElement('label');nameLabel.textContent='Task name';const name=document.createElement('input');name.type='text';name.required=true;name.maxLength=300;name.setAttribute('aria-label','Task name');nameLabel.append(name);
  const dueLabel=document.createElement('label');dueLabel.textContent='Due date (optional)';const due=document.createElement('input');due.type='date';due.min='1900-01-01';due.max='2200-12-31';due.setAttribute('aria-label','Due date (optional)');dueLabel.append(due);
  const doneLabel=document.createElement('label');doneLabel.className='todo-done-label';const done=document.createElement('input');done.type='checkbox';doneLabel.append(done,document.createTextNode('Completed'));
  const error=document.createElement('p');error.setAttribute('role','alert');const actions=document.createElement('div');actions.className='dialog-buttons';const cancel=makeButton('Cancel','Cancel to-do changes',()=>dialog.close());const submit=document.createElement('button');submit.type='submit';submit.textContent='Save task';actions.append(cancel,submit);form.append(heading,nameLabel,dueLabel,doneLabel,error,actions);dialog.append(form);document.body.append(dialog);
  let editingPage=null,editingItem=null,creatingParent=null;
  function edit(id,itemId=null,parent=null){
    const f=page(id),item=f?.items.find(item=>item.id===itemId);if(!f||storageFailed||itemId&&!item)return;
    editingPage=id;editingItem=itemId;creatingParent=parent;heading.textContent=item?'Edit task':parent?'New subtask':'New task';dialog.setAttribute('aria-label',heading.textContent);
    name.value=item?.title||'';due.value=item?.due||'';done.checked=item?.completed||false;error.textContent='';dialog.showModal();name.focus();
  }
  form.onsubmit=event=>{
    event.preventDefault();const f=page(editingPage);if(!f||(editingItem&&!f.items.some(t=>t.id===editingItem))){error.textContent='This task was removed.';return;}
    try{
      let items;
      if(editingItem)items=f.items.map(t=>t.id===editingItem?{...t,title:name.value,due:due.value||null,completed:done.checked}:t);
      else items=[...f.items,{id:crypto.randomUUID(),title:name.value,due:due.value||null,completed:done.checked,parent:creatingParent,created:Date.now()}];
      saveItems(f.id,items);if(!editingItem){filter.value='all';draw();}dialog.close();
    }catch(e){error.textContent=e.message;}
  };
  let dragged=null,dropTarget=null,dropPosition=null,suppressClickUntil=0;
  function clearDrop(){list.querySelectorAll('.todo-drop-before,.todo-drop-after,.todo-drop-inside').forEach(row=>row.classList.remove('todo-drop-before','todo-drop-after','todo-drop-inside'));add.classList.remove('todo-drop-root');dropTarget=null;dropPosition=null;}
  function endDrag(){const state=dragged;dragged=null;clearDrop();list.querySelectorAll('.todo-drag-source').forEach(row=>row.classList.remove('todo-drag-source'));if(state?.source.hasPointerCapture(state.pointer))state.source.releasePointerCapture(state.pointer);}
  function attachDrag(row,item,f){
    row.addEventListener('click',event=>{if(event.target===row)edit(f.id,item.id);});
    row.addEventListener('dragstart',event=>{event.preventDefault();event.stopPropagation();});
    row.addEventListener('pointerdown',event=>{
      if(event.button!==0||storageFailed||event.target.closest('input,.todo-add-child,.todo-delete'))return;
      event.preventDefault();row.querySelector('.todo-title').focus();
      dragged={id:item.id,page:f.id,source:row,pointer:event.pointerId,x:event.clientX,y:event.clientY,started:false};row.setPointerCapture(event.pointerId);
    });
    row.addEventListener('pointermove',event=>{
      if(!dragged||event.pointerId!==dragged.pointer)return;
      if(!dragged.started&&Math.hypot(event.clientX-dragged.x,event.clientY-dragged.y)<5)return;
      dragged.started=true;row.classList.add('todo-drag-source');clearDrop();
      const under=document.elementFromPoint(event.clientX,event.clientY);
      if(add.contains(under)){dropPosition='root';add.classList.add('todo-drop-root');return;}
      const target=under?.closest('.todo-item');if(!target||!list.contains(target))return;
      const rect=target.getBoundingClientRect(),ratio=(event.clientY-rect.top)/rect.height,position=ratio<.25?'before':ratio>.75?'after':'inside';
      try{TodoModel.move(f.items,dragged.id,target.dataset.todoId,position);dropTarget=target.dataset.todoId;dropPosition=position;target.classList.add('todo-drop-'+position);}catch{}
    });
    row.addEventListener('pointerup',()=>{
      if(!dragged)return;const state=dragged,target=dropTarget,position=dropPosition;
      if(state.started)suppressClickUntil=Date.now()+180;
      endDrag();
      if(state.started&&position){try{saveItems(f.id,TodoModel.move(f.items,state.id,target,position));toast(position==='inside'?'Task nested':position==='root'?'Task moved to the end of the list':'Task reordered');}catch(error){toast(error.message);}}
    });
    row.addEventListener('pointercancel',endDrag);row.addEventListener('lostpointercapture',()=>{if(dragged)endDrag();});
  }
  panel.addEventListener('click',event=>{if(Date.now()<suppressClickUntil){event.preventDefault();event.stopImmediatePropagation();}},true);
  document.addEventListener('keydown',event=>{if(dragged&&event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();suppressClickUntil=Date.now()+180;endDrag();}},true);
  window.addEventListener('blur',endDrag);
  const beforeRender=render;render=function(){beforeRender();const selected=!!page(folderFilter);panel.hidden=!selected;$('notes-home').classList.toggle('show-todo',selected);if(selected){folderActions.hidden=true;childFolders.hidden=true;$('empty').hidden=true;draw();}else{currentId=null;endDrag();}};
  window.TodoUI={add:id=>{browseFolder(id);edit(id);}};render();
})();
