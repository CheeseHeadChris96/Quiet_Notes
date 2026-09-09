let draggedItem=null,dragSource=null,dropHighlight=null;
function clearDropHighlight(){dropHighlight?.classList.remove('drop-target');dropHighlight=null;}
function finishDrag(){clearDropHighlight();dragSource?.classList.remove('drag-source');dragSource=null;draggedItem=null;}
function dropDestination(event){return event.target.closest('[data-folder-drop]');}
function validateDrop(item,target){
  if(!item||!target||storageFailed)throw new Error('This item cannot be moved here.');
  const parent=target.dataset.folderDrop==='*'?null:target.dataset.folderDrop;
  if(item.kind==='folder')Folders.move(folders,item.id,parent);
  else {
    if(parent===null)throw new Error('Drop a note onto a folder.');
    if(!folders.some(f=>f.id===parent&&!f.kind)||!notes.some(n=>n.id===item.id&&!n.deleted))throw new Error('This note cannot be moved here.');
  }
  return parent;
}
document.addEventListener('dragstart',e=>{
  const source=e.target.closest('[draggable="true"]');
  if(!source||storageFailed){e.preventDefault();return;}
  if(e.target.closest('.folder-add,.folder-toggle,.tab-close,.note-meta')){e.preventDefault();return;}
  const kind=source.dataset.folderId?'folder':'note',id=source.dataset.folderId||source.dataset.noteId;
  if(!id){e.preventDefault();return;}
  draggedItem={kind,id};dragSource=source;closeFolderMenu();
  e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('application/x-quiet-notes-item',JSON.stringify(draggedItem));source.classList.add('drag-source');
});
document.addEventListener('dragover',e=>{
  if(!draggedItem)return;
  const target=dropDestination(e);clearDropHighlight();
  try{validateDrop(draggedItem,target);e.preventDefault();e.dataTransfer.dropEffect='move';target.classList.add('drop-target');dropHighlight=target;}
  catch{e.dataTransfer.dropEffect='none';}
});
document.addEventListener('dragleave',e=>{if(dropHighlight&&!dropHighlight.contains(e.relatedTarget))clearDropHighlight();});
document.addEventListener('drop',e=>{
  if(!draggedItem)return;
  e.preventDefault();const item=draggedItem,target=dropDestination(e);
  try{
    const parent=validateDrop(item,target);
    if(item.kind==='folder'){
      const previous=folders;const original=folders.find(f=>f.id===item.id);
      if(original.parent===parent){finishDrag();return;}
      folders=Folders.move(folders,item.id,parent);
      if(!persist()){folders=previous;finishDrag();return;}
      revealFolder(item.id);
    }else{
      const note=notes.find(n=>n.id===item.id),previous={folderId:note.folderId,updated:note.updated};
      if(note.folderId===parent){finishDrag();return;}
      note.folderId=parent;note.updated=Date.now();
      if(!persist()){Object.assign(note,previous);finishDrag();return;}
      revealFolder(parent);
    }
    finishDrag();render();toast(item.kind==='folder'?'Folder moved':'Note moved');
  }catch(error){finishDrag();toast(error.message);}
});
document.addEventListener('dragend',finishDrag);
window.addEventListener('blur',finishDrag);
