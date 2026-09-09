let browseMode='folders';
try{if(localStorage.getItem('quiet-browse-mode')==='recents')browseMode='recents';}catch{}
const expandedFolders=new Set();
try{const saved=JSON.parse(localStorage.getItem('quiet-expanded-folders'));if(Array.isArray(saved)){expandedFolders.clear();for(const id of saved)expandedFolders.add(id);}}catch{}
function saveExpanded(){try{localStorage.setItem('quiet-expanded-folders',JSON.stringify([...expandedFolders]));}catch{}}
function revealFolder(id){let f=folders.find(f=>f.id===id);while(f){expandedFolders.add(f.id);f=folders.find(p=>p.id===f.parent);}saveExpanded();}
function browseFolder(id){folderFilter=id;$('search').value='';setView('all');revealFolder(id);showNotes();}
const browseSelect=document.createElement('select');browseSelect.id='browse-mode';browseSelect.setAttribute('aria-label','Browse notes by');
for(const [value,label] of [['folders','Folders'],['recents','Recents']]){const o=document.createElement('option');o.value=value;o.textContent=label;browseSelect.append(o);}browseSelect.value=browseMode;
$('recents-sidebar').querySelector('h2').replaceWith(browseSelect);$('recents-sidebar').setAttribute('aria-label','Folders and recent notes');$('hide-recents').title='Hide sidebar';$('hide-recents').setAttribute('aria-label','Hide sidebar');
const folderSearch=document.createElement('input');folderSearch.type='search';folderSearch.className='group-search';folderSearch.placeholder='Search folders';folderSearch.setAttribute('aria-label','Search sidebar folders');$('recent-notes').before(folderSearch);
const sidebarAdd=makeButton('+ New folder','Create a folder',()=>editFolder(null));sidebarAdd.className='sidebar-add';$('recent-notes').after(sidebarAdd);
const recentOnly=drawRecents;
drawRecents=function(){
  folderSearch.hidden=sidebarAdd.hidden=browseMode==='recents';
  if(browseMode==='recents'){recentOnly();return;}
  const list=$('recent-notes');list.replaceChildren();
  const all=makeButton('All notes','Browse all notes',()=>browseFolder('*'));all.className='folder-all';all.dataset.folderDrop='*';all.title='All notes · Drop a folder or note here to move it to the root';if(folderFilter==='*')all.setAttribute('aria-current','page');list.append(all);
  const query=folderSearch.value.trim().toLowerCase();
  const visible=new Set();
  if(query)for(const f of folders.filter(f=>Folders.path(folders,f.id).toLowerCase().includes(query))){let cur=f;while(cur){visible.add(cur.id);cur=folders.find(p=>p.id===cur.parent);}}
  const counts=new Map();for(const n of notes)if(!n.deleted)counts.set(n.folderId,(counts.get(n.folderId)||0)+1);
  function row(f,depth){
    if(query&&!visible.has(f.id))return;
    const children=Folders.children(folders,f.id),line=document.createElement('div');line.className='folder-row';line.style.paddingLeft=`${depth*14}px`;
    const expanded=!!query||expandedFolders.has(f.id);
    const toggle=makeButton(expanded?'▾':'▸',`${expanded?'Collapse':'Expand'} ${Folders.path(folders,f.id)}`,()=>{if(expandedFolders.has(f.id))expandedFolders.delete(f.id);else expandedFolders.add(f.id);saveExpanded();drawRecents();});toggle.className='folder-toggle';toggle.disabled=!children.length&&!counts.get(f.id);toggle.setAttribute('aria-expanded',String(expanded));
    const select=makeButton('',`Open folder ${Folders.path(folders,f.id)}`,()=>browseFolder(f.id));select.className='folder-select';select.title=Folders.path(folders,f.id);if(folderFilter===f.id)select.setAttribute('aria-current','page');
    const label=document.createElement('span');label.textContent=f.name;if(f.kind){label.classList.add('gallery-folder-label');const photo=document.createElementNS('http://www.w3.org/2000/svg','svg');photo.setAttribute('viewBox','0 0 24 24');photo.setAttribute('aria-hidden','true');photo.setAttribute('focusable','false');photo.classList.add('gallery-photo-icon','note-sheet');const outline=document.createElementNS('http://www.w3.org/2000/svg','path');outline.setAttribute('d',f.kind==='todo'?'M3 6l2 2 4-5 M12 6h9 M3 16l2 2 4-5 M12 16h9':f.kind==='gantt'?'M3 3v18h18 M6 6h7v3H6Z M10 12h8v3h-8Z M15 18h6':'M3 4h18v16H3Z M3 17l6-6 4 4 3-3 5 5 M15 8h.01');photo.append(outline);label.prepend(photo);select.setAttribute('aria-label',`Open ${f.kind==='todo'?'to-do page':f.kind==='gantt'?'Gantt chart':'photo gallery'} ${Folders.path(folders,f.id)}`);}const count=document.createElement('small');count.textContent=counts.get(f.id)||'';select.append(label,count);
    const subfolder=makeButton('',`Add subfolder to ${Folders.path(folders,f.id)}`,()=>editFolder(f.id));subfolder.className='folder-add folder-create';subfolder.title='New subfolder';
    const icon=document.createElementNS('http://www.w3.org/2000/svg','svg');icon.setAttribute('viewBox','0 0 24 24');icon.setAttribute('aria-hidden','true');icon.setAttribute('focusable','false');
    const outline=document.createElementNS('http://www.w3.org/2000/svg','path');outline.setAttribute('d','M3 7V5a1 1 0 0 1 1-1h5l2 3h9a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7Z');icon.append(outline);subfolder.append(icon);
    const add=makeButton('+',`New note in ${Folders.path(folders,f.id)}`,()=>{folderFilter=f.id;revealFolder(f.id);newNote();});add.className='folder-add';add.title='New note';
    if(f.kind){line.classList.add('gallery-row');line.style.paddingLeft='0';select.classList.add('folder-note','gallery-folder-select');select.style.paddingLeft=`${depth*14+22}px`;select.replaceChildren(label.querySelector('svg'),label);line.append(select);}else line.append(toggle,select,subfolder,add);attachFolderMenu(line,f.id);list.append(line);
    if(expanded){
      for(const child of children)row(child,depth+1);
      const contained=notes.filter(n=>!n.deleted&&n.folderId===f.id).sort((a,b)=>(a.title||'Untitled note').localeCompare(b.title||'Untitled note'));
      for(const n of contained)noteRow(n,depth+1,Folders.path(folders,f.id));
    }
  }
  function noteRow(n,depth,folderPath){
    const title=n.title||'Untitled note';
    const noteButton=makeButton('',`Open note ${folderPath?folderPath+' / ':''}${title}`,()=>openNote(n.id));noteButton.className='folder-note';noteButton.dataset.noteId=n.id;noteButton.draggable=true;noteButton.title=title;noteButton.style.paddingLeft=`${depth*14+22}px`;
    const sheet=document.createElementNS('http://www.w3.org/2000/svg','svg');sheet.setAttribute('viewBox','0 0 24 24');sheet.setAttribute('aria-hidden','true');sheet.setAttribute('focusable','false');sheet.classList.add('note-sheet');
    const paper=document.createElementNS('http://www.w3.org/2000/svg','path');paper.setAttribute('d','M5 3h9l5 5v13H5Z M14 3v5h5 M8 12h8 M8 16h8');sheet.append(paper);
    const label=document.createElement('span');label.textContent=title;noteButton.append(sheet,label);
    if(selectedTab===n.id)noteButton.setAttribute('aria-current','page');list.append(noteButton);
  }
  for(const r of Folders.children(folders,null))row(r,0);
  if(!query)for(const n of notes.filter(n=>!n.deleted&&n.folderId===null).sort((a,b)=>(a.title||'Untitled note').localeCompare(b.title||'Untitled note')))noteRow(n,0,'');
  if(query&&!visible.size){const p=document.createElement('p');p.className='recents-empty';p.textContent='No matching folders';list.append(p);}
};
browseSelect.onchange=()=>{browseMode=browseSelect.value;try{localStorage.setItem('quiet-browse-mode',browseMode);}catch{}drawRecents();};folderSearch.oninput=drawRecents;
const folderActions=document.createElement('div');folderActions.className='folder-actions';
const addChild=makeButton('+ New folder','Create root folder',()=>editFolder(null));
const renameFolder=makeButton('Rename','Rename selected folder',()=>editFolder(null,folderFilter));folderActions.append(addChild,renameFolder);$('heading').after(folderActions);
const childFolders=document.createElement('div');childFolders.className='child-folders';childFolders.setAttribute('aria-label','Subfolders');$('notes').before(childFolders);
const folderDialog=document.createElement('dialog');folderDialog.id='folder-dialog';folderDialog.setAttribute('aria-labelledby','folder-dialog-title');
const folderForm=document.createElement('form');
const dialogTitle=document.createElement('h2');dialogTitle.id='folder-dialog-title';
const nameLabel=document.createElement('label');nameLabel.textContent='Folder name';const nameInput=document.createElement('input');nameInput.required=true;nameInput.maxLength=120;nameInput.setAttribute('aria-label','Folder name');nameLabel.append(nameInput);
const dialogError=document.createElement('p');dialogError.setAttribute('role','alert');
const dialogButtons=document.createElement('div');dialogButtons.className='dialog-buttons';const cancel=makeButton('Cancel','Cancel folder changes',()=>folderDialog.close());const submit=document.createElement('button');submit.type='submit';submit.className='primary';dialogButtons.append(cancel,submit);
folderForm.append(dialogTitle,nameLabel,dialogError,dialogButtons);folderDialog.append(folderForm);document.body.append(folderDialog);
let createParent=null,renameId=null,moveAfterCreate=null,folderReturnFocus=null,createKind=null;
function editFolder(parent,id=null,noteId=null,kind=null){
  if(storageFailed)return toast('Recover stored data before changing folders.');
  folderReturnFocus=document.activeElement;createKind=kind;createParent=parent;renameId=id;moveAfterCreate=noteId;dialogTitle.textContent=id?'Rename folder':kind==='gallery'?'New photo gallery':kind==='gantt'?'New Gantt chart':kind==='todo'?'New to-do page':'New folder';submit.textContent=id?'Save':kind==='gallery'?'Create gallery':kind==='gantt'?'Create chart':kind==='todo'?'Create page':'Create folder';dialogError.textContent='';nameInput.value=id?folders.find(f=>f.id===id).name:'';
  folderDialog.showModal();nameInput.focus();nameInput.select();
}
folderDialog.addEventListener('close',()=>{if(folderReturnFocus?.isConnected)folderReturnFocus.focus();});
folderForm.onsubmit=e=>{
  e.preventDefault();
  try{
    const previous=folders;
    let id=renameId;
    if(id){folders=Folders.validate(folders.map(f=>f.id===id?{...f,name:Folders.clean(nameInput.value)}:f));}
    else{id=crypto.randomUUID();folders=Folders.create(folders,createParent,nameInput.value,id,createKind);}
    const note=moveAfterCreate?notes.find(n=>n.id===moveAfterCreate&&!n.deleted):null,oldFolder=note?.folderId,oldUpdated=note?.updated;
    if(note){note.folderId=id;note.updated=Date.now();}
    if(!persist()){folders=previous;if(note){note.folderId=oldFolder;note.updated=oldUpdated;}dialogError.textContent='Could not save folder changes.';return;}
    revealFolder(id);folderDialog.close();
    if(note)render();else {browseMode='folders';browseSelect.value=browseMode;browseFolder(id);}
  }catch(error){dialogError.textContent=error.message;}
};
const renderBeforeFolders=render;render=function(){
  renderBeforeFolders();
  const title=folderFilter==='*'?'All notes':Folders.path(folders,folderFilter),viewTitle=view==='pinned'?'Pinned notes':'Trash';
  $('heading').textContent=view==='all'?title:(folderFilter==='*'?viewTitle:`${title} · ${viewTitle}`);
  renameFolder.hidden=folderFilter==='*';folderActions.hidden=view!=='all';
  childFolders.replaceChildren();
  if(view==='all'&&!$('search').value){const children=Folders.children(folders,folderFilter==='*'?null:folderFilter);for(const f of children){const b=makeButton(`${f.kind==='gallery'?'▧':f.kind==='gantt'?'▤':f.kind==='todo'?'☑':'▸'} ${f.name}`,`Open subfolder ${Folders.path(folders,f.id)}`,()=>browseFolder(f.id));attachFolderMenu(b,f.id);childFolders.append(b);}}
  childFolders.hidden=!childFolders.children.length;
  if(childFolders.children.length&&!$('notes').children.length)$('empty').hidden=true;
};
// Make the untouched pre-migration data available through the normal backup menu.
const migrationExport=makeButton('Export pre-folder backup…','Export original category backup',()=>{
  const raw=localStorage.getItem('quiet-notes-before-folders');if(!raw)return;
  const url=URL.createObjectURL(new Blob([raw],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='quiet-notes-before-folders.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
try{migrationExport.hidden=!localStorage.getItem('quiet-notes-before-folders');}catch{migrationExport.hidden=true;}$('export').after(migrationExport);
// Folder actions work on the clicked folder, independently of the current view.
const folderMenu=document.createElement('div');folderMenu.id='folder-context-menu';folderMenu.setAttribute('role','menu');folderMenu.setAttribute('aria-label','Folder actions');folderMenu.hidden=true;document.body.append(folderMenu);
let menuFolder=null,menuAnchor=null,folderCreate=null,folderSubmenu=null,submenuTimer=null;
function hideCreateSubmenu(){clearTimeout(submenuTimer);if(folderSubmenu)folderSubmenu.hidden=true;folderCreate?.setAttribute('aria-expanded','false');}
function showCreateSubmenu(focus=false){
  if(!folderCreate?.isConnected||folderCreate.disabled||!folderSubmenu)return;
  clearTimeout(submenuTimer);folderSubmenu.hidden=false;folderCreate.setAttribute('aria-expanded','true');
  const menuRect=folderMenu.getBoundingClientRect(),rowRect=folderCreate.getBoundingClientRect();
  const left=menuRect.right+folderSubmenu.offsetWidth<=innerWidth-4?menuRect.right-1:menuRect.left-folderSubmenu.offsetWidth+1;
  folderSubmenu.style.left=Math.max(4,left)+'px';folderSubmenu.style.top=Math.max(4,Math.min(rowRect.top,innerHeight-folderSubmenu.offsetHeight-4))+'px';
  if(focus)folderSubmenu.querySelector('button:not(:disabled)')?.focus();
}
function closeFolderMenu(focus=false){hideCreateSubmenu();folderMenu.hidden=true;if(focus&&menuAnchor?.isConnected)menuAnchor.focus();}
function attachFolderMenu(element,id){
  element.dataset.folderId=id;element.dataset.folderDrop=id;element.draggable=true;
  element.addEventListener('contextmenu',e=>{e.preventDefault();e.stopPropagation();openFolderMenu(id,e.clientX,e.clientY,element);});
  element.addEventListener('keydown',e=>{if(e.key==='ContextMenu'||(e.shiftKey&&e.key==='F10')){e.preventDefault();const rect=element.getBoundingClientRect();openFolderMenu(id,rect.left,rect.bottom,element);}});
}
function openFolderMenu(id,x,y,anchor){
  if(!folders.some(f=>f.id===id))return;
  folderMenu.setAttribute('aria-label','Folder actions');menuFolder=id;menuAnchor=anchor.matches('button')?anchor:anchor.querySelector('.folder-select');
  hideCreateSubmenu();folderCreate=null;folderSubmenu=null;folderMenu.replaceChildren();
  const kind=folders.find(f=>f.id===id).kind;
  function actionButton(label,action){const b=makeButton(label,label,()=>{closeFolderMenu();action();});b.setAttribute('role','menuitem');b.disabled=storageFailed;b.addEventListener('pointerenter',hideCreateSubmenu);folderMenu.append(b);return b;}
  if(kind==='gallery')actionButton('Upload photos…',()=>window.Galleries?.upload(id));
  else if(kind==='gantt')actionButton('Add task…',()=>window.GanttUI?.add(id));
  else if(kind==='todo')actionButton('Add task…',()=>window.TodoUI?.add(id));
  else {
    const group=document.createElement('div');group.className='folder-create-group';
    const create=makeButton('Create','Create',()=>showCreateSubmenu(true));folderCreate=create;
    create.setAttribute('role','menuitem');create.setAttribute('aria-haspopup','menu');create.setAttribute('aria-expanded','false');create.setAttribute('aria-controls','folder-create-submenu');create.disabled=storageFailed;
    const chevron=document.createElement('span');chevron.textContent='›';chevron.setAttribute('aria-hidden','true');create.append(chevron);
    const submenu=document.createElement('div');folderSubmenu=submenu;submenu.id='folder-create-submenu';submenu.setAttribute('role','menu');submenu.setAttribute('aria-label','Create');submenu.hidden=true;
    for(const [label,action] of [['Subfolder',()=>editFolder(id)],['Note',()=>{folderFilter=id;revealFolder(id);newNote();}],['Photo gallery',()=>editFolder(id,null,null,'gallery')],['Gantt chart',()=>editFolder(id,null,null,'gantt')],['To-do page',()=>editFolder(id,null,null,'todo')]]){
      const button=makeButton(label,label,()=>{closeFolderMenu();action();});button.setAttribute('role','menuitem');submenu.append(button);
    }
    create.addEventListener('pointerenter',()=>showCreateSubmenu());
    group.addEventListener('pointerenter',()=>clearTimeout(submenuTimer));
    group.addEventListener('pointerleave',()=>{submenuTimer=setTimeout(hideCreateSubmenu,180);});
    submenu.addEventListener('pointerenter',()=>clearTimeout(submenuTimer));
    group.append(create,submenu);folderMenu.append(group);
  }
  actionButton('Rename',()=>editFolder(null,id));actionButton('Delete folder',()=>deleteFolder(id));
  folderMenu.hidden=false;folderMenu.style.left=Math.max(4,Math.min(x,innerWidth-folderMenu.offsetWidth-4))+'px';folderMenu.style.top=Math.max(4,Math.min(y,innerHeight-folderMenu.offsetHeight-4))+'px';folderMenu.querySelector('button:not(:disabled)')?.focus();
}
folderMenu.onkeydown=e=>{
  const menu=document.activeElement.closest('[role=menu]')||folderMenu;
  const items=[...menu.querySelectorAll('button:not(:disabled)')].filter(button=>button.closest('[role=menu]')===menu),at=items.indexOf(document.activeElement);
  if(e.key==='ArrowRight'&&document.activeElement===folderCreate){e.preventDefault();showCreateSubmenu(true);}
  else if((e.key==='ArrowLeft'||e.key==='Escape')&&menu===folderSubmenu){e.preventDefault();hideCreateSubmenu();folderCreate.focus();}
  else if(e.key==='Escape'){e.preventDefault();closeFolderMenu(true);}
  else if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();if(menu===folderMenu)hideCreateSubmenu();items[e.key==='Home'?0:e.key==='End'?items.length-1:(at+(e.key==='ArrowDown'?1:-1)+items.length)%items.length]?.focus();}
  else if(e.key==='Tab')closeFolderMenu();
};
document.addEventListener('pointerdown',e=>{if(!folderMenu.contains(e.target))closeFolderMenu();});
window.addEventListener('resize',()=>closeFolderMenu());document.addEventListener('scroll',()=>closeFolderMenu(),true);
function deleteFolder(id){
  if(storageFailed)return toast('Recover saved data before deleting folders.');
  try{
    const previous={folders,notes},result=Folders.remove(folders,notes,id),label=Folders.path(folders,id);
    // Preserve the complete hierarchy and notes before removing a folder.
    localStorage.setItem('quiet-notes-before-folder-delete',JSON.stringify({version:5,folders,notes}));
    folders=result.folders;notes=result.notes;
    if(!persist()){folders=previous.folders;notes=previous.notes;return;}
    const deletedActive=active&&result.removed.has(active.folderId);
    active=active?notes.find(n=>n.id===active.id):null;
    for(const removed of result.removed)expandedFolders.delete(removed);saveExpanded();
    if(result.removed.has(folderFilter))folderFilter='*';
    if(deletedActive)showNotes();else render();
    deleteBackup.hidden=false;toast(`Deleted ${label}. Its notes are in Trash.`);
  }catch(error){toast(error.message);}
}
const deleteBackup=makeButton('Export last folder deletion backup…','Export last folder deletion backup',()=>{
  const raw=localStorage.getItem('quiet-notes-before-folder-delete');if(!raw)return;
  const url=URL.createObjectURL(new Blob([raw],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='quiet-notes-before-folder-delete.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
try{deleteBackup.hidden=!localStorage.getItem('quiet-notes-before-folder-delete');}catch{deleteBackup.hidden=true;}$('export').after(deleteBackup);
render();
