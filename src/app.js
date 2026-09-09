const $ = id => document.getElementById(id);
const KEY = 'quiet-notes-v1';
let folders=Folders.ROOTS.map(f=>({...f})), folderFilter='*';
let notes = [], view = 'all', active = null, toastTimer, storageFailed = false;
try {
  const raw=localStorage.getItem(KEY);
  if(raw){
    const parsed=JSON.parse(raw), data=Array.isArray(parsed)?{notes:parsed}:parsed;
    const loaded=Folders.load(data,NotesStore.validate(data.notes));
    if(!(data.version>=4)&&!localStorage.getItem('quiet-notes-before-folders'))localStorage.setItem('quiet-notes-before-folders',raw);
    folders=loaded.folders;notes=loaded.notes;
  }
} catch { storageFailed = true; }
function folderLabel(n){return Folders.path(folders,n.folderId||'generic');}
function inFolder(n){return folderFilter==='*'||n.folderId===folderFilter;}
function toast(message) { $('toast').textContent = message; $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').hidden = true, 5000); }
let saveSucceeded=!storageFailed;
function setSaveStatus(message){
  saveSucceeded=message==='Saved on this device';
  const label=saveSucceeded?'Saved':'Unsaved';
  $('save-status').textContent=label;$('save-tooltip').textContent=label;
  $('save-indicator').dataset.state=saveSucceeded?'saved':'unsaved';
}
function persist() {
  setSaveStatus('Unsaved');
  if (storageFailed) { setSaveStatus('Stored notes need recovery');toast('Stored notes could not be read. Export a backup before making changes.'); return false; }
  try { localStorage.setItem(KEY, JSON.stringify({version:4,notes,folders})); setSaveStatus('Saved on this device'); return true; }
  catch { setSaveStatus('Not saved — export a backup'); toast('Storage is full or unavailable. Export a backup to protect your notes.'); return false; }
}
function makeButton(text, label, fn) { const b = document.createElement('button'); b.type = 'button'; b.textContent = text; b.setAttribute('aria-label', label); b.addEventListener('click', fn); return b; }
function render() {
  const scoped=notes.filter(inFolder);
  const list = NotesStore.select(scoped,view,$('search').value,$('sort').value);
  $('all-count').textContent = scoped.filter(n=>!n.deleted).length;
  $('pinned-count').textContent = scoped.filter(n=>!n.deleted&&n.pinned).length;
  $('trash-count').textContent = scoped.filter(n=>n.deleted).length;
  $('results').textContent = `${list.length} ${list.length === 1 ? 'note' : 'notes'}`;
  $('notes').replaceChildren();
  for (const n of list) {
    const card = document.createElement('article'); card.className = 'note';card.dataset.noteId=n.id;card.draggable=!n.deleted;
    const button = document.createElement('button'); button.className = 'note-open'; button.setAttribute('aria-label',`Open ${n.title || 'Untitled note'}`);
    const h = document.createElement('h2'); h.textContent = n.title || 'Untitled note';
    const p = document.createElement('p'); p.textContent = n.body || (n.html?.includes('<img ')?'Image':'Empty note'); const clientTag=document.createElement('small');clientTag.className='note-client';clientTag.textContent=folderLabel(n);button.append(h,clientTag,p); button.onclick = () => openNote(n.id);
    const meta = document.createElement('div'); meta.className = 'note-meta'; const date = document.createElement('span'); date.textContent = new Date(n.updated).toLocaleDateString(undefined,{month:'short',day:'numeric'}); meta.append(date);
    if (n.deleted) meta.append(makeButton('Restore','Restore note',()=>{n.deleted=false;n.updated=Date.now();persist();render();toast('Note restored');}));
    else meta.append(makeButton(n.pinned?'◆':'◇',n.pinned?'Unpin note':'Pin note',()=>{n.pinned=!n.pinned;persist();render();}));
    card.append(button,meta); $('notes').append(card);
  }
  $('empty').hidden = list.length > 0;
  $('empty').querySelector('h2').textContent = $('search').value ? 'No notes found.' : view === 'trash' ? 'Nothing in the trash.' : view === 'pinned' ? 'No pinned notes' : 'No notes yet';
  $('empty').querySelector('p').textContent = $('search').value ? 'Try another word or clear your search.' : view === 'trash' ? 'Notes you delete can be restored here.' : view === 'pinned' ? 'Pin any note to find it here.' : 'Use + in the tab bar to create a note.';
  $('empty-new').hidden = view !== 'all' || !!$('search').value;
}
function openNote(id) {
  active = notes.find(n=>n.id===id); $('note-title').value=active.title; $('note-body').value=active.body; if(active.html) RichText.render($('note-body'),active.html);
  $('note-title').readOnly=active.deleted; $('note-body').readOnly=active.deleted;
  $('pin-note').hidden=active.deleted; $('trash-note').hidden=active.deleted;
  setSaveStatus(saveSucceeded?'Saved on this device':'Unsaved'); updateEditor(); if (!$('editor').open) $('editor').show();
}
function updateEditor() {
  const pinLabel=active.pinned?'Unpin note':'Pin note';$('pin-note').setAttribute('aria-label',pinLabel);$('pin-note').title=pinLabel;$('pin-note').setAttribute('aria-pressed',String(active.pinned));
  $('word-count').textContent=`${active.body.trim().split(/\s+/).filter(Boolean).length} words`;
}
function noteDestination(){const f=folders.find(f=>f.id===folderFilter);return !f?'generic':f.kind?(f.parent||'generic'):f.id;}
function newNote() {
  if (storageFailed) return toast('Your saved data needs recovery before new notes can be added.');
  const now=Date.now(); const n={id:crypto.randomUUID(),title:'',body:'',color:'neutral',folderId:noteDestination(),created:now,updated:now,pinned:false,deleted:false}; notes.unshift(n); persist(); setView('all'); $('search').value='';render();openNote(n.id);$('note-body').focus();
}
function setView(next) { view=next;document.querySelectorAll('.nav').forEach(b=>b.classList.toggle('active',b.dataset.view===view));$('heading').replaceChildren(document.createTextNode(view==='all'?'All notes':view==='pinned'?'Pinned notes':'Trash'));render(); }
for (const id of ['note-title','note-body']) $(id).addEventListener('input',()=>{if(active.deleted)return;active.title=$('note-title').value;active.body=$('note-body').value;active.html=RichText.clean($('note-body').innerHTML);active.updated=Date.now();persist();updateEditor();});
$('editor').addEventListener('close',render);
$('pin-note').onclick=()=>{active.pinned=!active.pinned;persist();updateEditor();};
$('trash-note').onclick=()=>{active.deleted=true;persist();$('editor').close();toast('Moved to trash. You can restore it anytime.');};
$('new-note').onclick=newNote;$('empty-new').onclick=newNote;
document.querySelectorAll('.nav').forEach(b=>b.onclick=()=>setView(b.dataset.view));
$('search').oninput=render;$('sort').onchange=render;
function setTheme(dark) {document.documentElement.dataset.theme=dark?'dark':'light';const label=dark?'Light mode':'Dark mode';$('theme').setAttribute('aria-label',label);$('theme').title=label;}
try {setTheme(localStorage.getItem('quiet-theme')==='dark');}catch{}
$('theme').onclick=()=>{const dark=document.documentElement.dataset.theme!=='dark';setTheme(dark);try{localStorage.setItem('quiet-theme',dark?'dark':'light');}catch{}};
$('export').onclick=()=>{const data=storageFailed?localStorage.getItem(KEY):JSON.stringify({version:4,notes,folders},null,2);const url=URL.createObjectURL(new Blob([data],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`quiet-notes-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('import').onclick=()=>$('import-file').click();
$('import-file').onchange=async e=>{
  const file=e.target.files[0];if(!file)return;
  try{
    if(storageFailed)throw new Error('Existing saved data needs recovery before importing.');
    if(file.size>20000000)throw new Error('Please choose a backup smaller than 20 MB.');
    const parsed=JSON.parse(await file.text()),data=Array.isArray(parsed)?{notes:parsed}:parsed;
    const incoming=Folders.load(data,NotesStore.validate(data.notes));
    const merged=Folders.merge({folders,notes},incoming),old={folders,notes};
    folders=merged.folders;notes=merged.notes;
    if(persist())toast(`Imported ${merged.added} notes. Existing notes were kept.`);
    else {folders=old.folders;notes=old.notes;}
    render();
  }catch(err){toast(err.message);}e.target.value='';
};
document.addEventListener('keydown',e=>{if(!(e.ctrlKey||e.metaKey))return;if(e.key.toLowerCase()==='n'){e.preventDefault();newNote();}if(e.key.toLowerCase()==='k'){e.preventDefault();if($('editor').open)$('editor').close();$('search').focus();}if(e.key.toLowerCase()==='s'){e.preventDefault();persist();}});
render();if(storageFailed)toast('Could not read saved notes. Original data has been preserved; export it for recovery.');

if(storageFailed)setSaveStatus('Stored notes need recovery');
