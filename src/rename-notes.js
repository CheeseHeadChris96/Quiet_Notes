const renameNoteDialog=document.createElement('dialog');renameNoteDialog.id='rename-note-dialog';renameNoteDialog.setAttribute('aria-labelledby','rename-note-heading');
const renameNoteForm=document.createElement('form');
const renameNoteHeading=document.createElement('h2');renameNoteHeading.id='rename-note-heading';renameNoteHeading.textContent='Rename note';
const renameNoteLabel=document.createElement('label');renameNoteLabel.textContent='Note name';
const renameNoteInput=document.createElement('input');renameNoteInput.maxLength=200;renameNoteInput.setAttribute('aria-label','Note name');renameNoteInput.placeholder='Untitled note';renameNoteLabel.append(renameNoteInput);
const renameNoteError=document.createElement('p');renameNoteError.setAttribute('role','alert');
const renameNoteButtons=document.createElement('div');renameNoteButtons.className='dialog-buttons';
const renameNoteCancel=makeButton('Cancel','Cancel note rename',()=>renameNoteDialog.close());
const renameNoteSave=document.createElement('button');renameNoteSave.type='submit';renameNoteSave.className='primary';renameNoteSave.textContent='Save';
renameNoteButtons.append(renameNoteCancel,renameNoteSave);renameNoteForm.append(renameNoteHeading,renameNoteLabel,renameNoteError,renameNoteButtons);renameNoteDialog.append(renameNoteForm);document.body.append(renameNoteDialog);
let renameNoteId=null,renameNoteAnchor=null;
function renameNote(id,anchor){
  if(storageFailed)return toast('Recover saved data before renaming notes.');
  const note=notes.find(n=>n.id===id);if(!note)return;
  renameNoteId=id;renameNoteAnchor=anchor;renameNoteInput.value=note.title;renameNoteError.textContent='';renameNoteDialog.showModal();renameNoteInput.focus();renameNoteInput.select();
}
renameNoteForm.onsubmit=e=>{
  e.preventDefault();const note=notes.find(n=>n.id===renameNoteId);if(!note)return renameNoteDialog.close();
  const previous={title:note.title,updated:note.updated};note.title=renameNoteInput.value.trim();note.updated=Date.now();
  if(!persist()){Object.assign(note,previous);renameNoteError.textContent='Could not save the new name.';return;}
  const h=active?.id===note.id?history:tabHistories.get(note.id);
  if(h)h.push({...h.values[h.index],title:note.title});
  if(active?.id===note.id){$('note-title').value=note.title;historyButtons();}
  renameNoteDialog.close();render();toast('Note renamed');
};
renameNoteDialog.onclose=()=>{if(renameNoteAnchor?.isConnected)renameNoteAnchor.focus();};
function openNoteContext(id,anchor,x,y){
  if(!notes.some(n=>n.id===id))return;
  menuAnchor=anchor;folderMenu.replaceChildren();
  const rename=makeButton('Rename','Rename',()=>{closeFolderMenu();renameNote(id,anchor);});rename.setAttribute('role','menuitem');rename.disabled=storageFailed;folderMenu.append(rename);folderMenu.setAttribute('aria-label','Note actions');
  folderMenu.hidden=false;folderMenu.style.left=Math.max(4,Math.min(x,innerWidth-folderMenu.offsetWidth-4))+'px';folderMenu.style.top=Math.max(4,Math.min(y,innerHeight-folderMenu.offsetHeight-4))+'px';rename.focus();
}
function noteContextTarget(target){const element=target.closest('[data-note-id]');if(!element?.dataset.noteId)return null;return {id:element.dataset.noteId,anchor:element.matches('button')?element:element.querySelector('button')};}
document.addEventListener('contextmenu',e=>{const note=noteContextTarget(e.target);if(note){e.preventDefault();openNoteContext(note.id,note.anchor,e.clientX,e.clientY);}});
document.addEventListener('keydown',e=>{if(e.key!=='ContextMenu'&&!(e.shiftKey&&e.key==='F10'))return;const note=noteContextTarget(e.target);if(note){e.preventDefault();const rect=note.anchor.getBoundingClientRect();openNoteContext(note.id,note.anchor,rect.left,rect.bottom);}});
