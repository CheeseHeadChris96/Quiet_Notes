const TABS_KEY='quiet-open-tabs-v1';
const tabHistories=new Map();
let tabIds=[], selectedTab=null;
const liveNote=id=>notes.find(n=>n.id===id&&!n.deleted);
try {
  const raw=localStorage.getItem(TABS_KEY);
  if(raw){const state=JSON.parse(raw);if(Array.isArray(state.ids))tabIds=[...new Set(state.ids)].filter(id=>typeof id==='string'&&liveNote(id));selectedTab=tabIds.includes(state.selected)?state.selected:null;}
  else tabIds=notes.filter(n=>!n.deleted).sort((a,b)=>b.updated-a.updated).slice(0,5).map(n=>n.id);
}catch{}
function saveTabs(){try{localStorage.setItem(TABS_KEY,JSON.stringify({ids:tabIds,selected:selectedTab}));}catch{}}
function tabButton(label,id){
  const button=makeButton(label,label,()=>id===null?showNotes():openNote(id));
  button.setAttribute('role','tab');button.setAttribute('aria-selected',String(selectedTab===id));
  button.setAttribute('aria-controls',id===null?'notes-home':'editor');
  button.tabIndex=selectedTab===id||(selectedTab===null&&id===tabIds[0])?0:-1;button.className='tab-select';button.title=label;button.dataset.noteId=id||'';button.draggable=!!id;
  button.onkeydown=e=>{
    const buttons=[...$('note-tabs').querySelectorAll('[role=tab]')];let index=buttons.indexOf(button);
    if(e.key==='ArrowRight')index=(index+1)%buttons.length;else if(e.key==='ArrowLeft')index=(index-1+buttons.length)%buttons.length;else if(e.key==='Home')index=0;else if(e.key==='End')index=buttons.length-1;else return;
    e.preventDefault();const target=buttons[index].dataset.noteId;target?openNote(target):showNotes();$('note-tabs').querySelectorAll('[role=tab]')[index]?.focus();
  };
  return button;
}
function drawTabs(){
  tabIds=tabIds.filter(id=>liveNote(id));
  $('note-tabs').replaceChildren();
  for(const id of tabIds){
    const n=liveNote(id),label=n.title||'Untitled note';const wrapper=document.createElement('div');wrapper.className='note-tab'+(selectedTab===id?' selected':'');wrapper.setAttribute('role','presentation');wrapper.dataset.noteId=id;
    const close=makeButton('×',`Close ${label} tab`,()=>closeTab(id));close.className='tab-close';close.title='Close tab (note stays saved)';
    wrapper.append(tabButton(label,id),close);$('note-tabs').append(wrapper);
  }
  drawRecents();
  saveTabs();
}
function drawRecents(){
  $('recent-notes').replaceChildren();
  const recent=notes.filter(n=>!n.deleted).sort((a,b)=>b.updated-a.updated).slice(0,20);
  for(const n of recent){
    const label=n.title||'Untitled note';
    const button=makeButton('',`Open recent note: ${label}`,()=>openNote(n.id));
    button.title=label;button.className='recent-item';button.dataset.noteId=n.id;button.draggable=true;
    if(selectedTab===n.id)button.setAttribute('aria-current','page');
    const title=document.createElement('span');title.textContent=label;
    const date=document.createElement('small');date.textContent=folderLabel(n)+' · '+new Date(n.updated).toLocaleDateString(undefined,{month:'short',day:'numeric'});
    button.append(title,date);$('recent-notes').append(button);
  }
  if(!recent.length){const empty=document.createElement('p');empty.className='recents-empty';empty.textContent='No recent notes';$('recent-notes').append(empty);}
}
function setRecentsVisible(visible){
  $('recents-sidebar').hidden=!visible;
  $('toggle-recents').setAttribute('aria-expanded',String(visible));
  $('toggle-recents').setAttribute('aria-label',visible?'Hide sidebar':'Show sidebar');
  try{localStorage.setItem('quiet-recents-visible',String(visible));}catch{}
}
$('toggle-recents').onclick=()=>setRecentsVisible($('recents-sidebar').hidden);
$('hide-recents').onclick=()=>{setRecentsVisible(false);$('toggle-recents').focus();};
let recentsVisible=true;
try{recentsVisible=localStorage.getItem('quiet-recents-visible')!=='false';}catch{}
setRecentsVisible(recentsVisible);
let recentsTimer;
$('note-body').addEventListener('input',()=>{clearTimeout(recentsTimer);recentsTimer=setTimeout(drawRecents,300);});

function rememberHistory(){if(selectedTab&&history)tabHistories.set(selectedTab,history);}
function showNotes(){rememberHistory();selectedTab=null;$('notes-home').hidden=false;if($('editor').open)$('editor').close();render();drawTabs();}
const openEditor=openNote;
openNote=function(id){
  if(!notes.some(n=>n.id===id))return;
  if(selectedTab===id&&$('editor').open){$('note-body').focus();return;}
  rememberHistory();
  if(liveNote(id)&&!tabIds.includes(id))tabIds.push(id);
  selectedTab=id;openEditor(id);
  if(tabHistories.has(id)){history=tabHistories.get(id);historyButtons();}
  $('notes-home').hidden=true;drawTabs();
  const selected=$('note-tabs').querySelector('[aria-selected=true]');selected?.scrollIntoView({block:'nearest',inline:'nearest'});
};
function closeTab(id){
  const index=tabIds.indexOf(id);const wasActive=selectedTab===id;
  tabIds=tabIds.filter(noteId=>noteId!==id);tabHistories.delete(id);
  if(wasActive){selectedTab=null;const nextId=tabIds[Math.min(index,tabIds.length-1)];if(nextId)openNote(nextId);else showNotes();}else drawTabs();
}
$('editor').addEventListener('close',()=>{if(!$('editor').open){selectedTab=null;$('notes-home').hidden=false;drawTabs();}});
$('editor').querySelector('form').addEventListener('submit',e=>{e.preventDefault();$('note-body').focus();});
$('note-title').addEventListener('input',drawTabs);
$('trash-note').onclick=()=>{const id=active.id;active.deleted=true;persist();closeTab(id);toast('Moved to trash. You can restore it from Trash.');};
const baseRender=render;
render=function(){baseRender();drawTabs();};
// Keep search available when an editor tab is active.
document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();e.stopImmediatePropagation();showNotes();$('search').focus();}},true);
if(selectedTab){const id=selectedTab;selectedTab=null;openNote(id);}else drawTabs();
const travelWithHistory=travel;
travel=function(direction){travelWithHistory(direction);drawTabs();};
