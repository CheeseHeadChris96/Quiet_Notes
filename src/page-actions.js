(() => {
  const pageName=f=>f.kind==='todo'?'to-do page':f.kind==='gantt'?'Gantt chart':'photo gallery';
  const selectedPage=()=>!$('editor').open&&folders.find(f=>f.id===folderFilter&&f.kind&&!f.deleted);
  const selectedNote=()=>$('editor').open&&active&&!active.deleted?active:null;
  function updateFooter(){
    const page=selectedPage(),note=selectedNote(),item=page||note;
    const label=page?pageName(page):'note';
    const pin=$('pin-note'),trash=$('trash-note');
    pin.hidden=trash.hidden=false;
    pin.disabled=trash.disabled=!item||storageFailed;
    pin.title=(item?.pinned?'Unpin ':'Pin ')+label;
    pin.setAttribute('aria-label',pin.title);pin.setAttribute('aria-pressed',String(!!item?.pinned));
    trash.title=page?`Move ${label} to trash`:'Move to trash';trash.setAttribute('aria-label',trash.title);
    if(!note)$('word-count').textContent=page?pageName(page):'';
  }
  function changePage(id,patch){
    const previous=folders;folders=Folders.setPageState(folders,id,patch);
    if(!persist()){folders=previous;return false;}return true;
  }
  function trashPage(id){
    if(storageFailed)return;
    try{
      const f=folders.find(f=>f.id===id&&f.kind&&!f.deleted);if(!f)return;
      if(!changePage(id,{deleted:true}))return;
      folderFilter='*';view='all';setView('all');showNotes();toast('Moved to trash. Restore this page and its contents from Trash.');
    }catch(error){toast(error.message);}
  }
  $('pin-note').onclick=()=>{
    const page=selectedPage(),note=selectedNote();if(storageFailed)return;
    if(page){if(!changePage(page.id,{pinned:!page.pinned}))return;}
    else if(note){const previous=note.pinned;note.pinned=!previous;if(!persist()){note.pinned=previous;return;}}
    render();updateFooter();
  };
  $('trash-note').onclick=()=>{
    const page=selectedPage(),note=selectedNote();if(storageFailed)return;
    if(page)return trashPage(page.id);
    if(note){note.deleted=true;if(!persist()){note.deleted=false;return;}closeTab(note.id);toast('Moved to trash. You can restore it from Trash.');updateFooter();}
  };
  const previousDelete=deleteFolder;
  deleteFolder=function(id){if(folders.some(f=>f.id===id&&f.kind))trashPage(id);else previousDelete(id);};
  function collections(){
    if(view==='pinned')$('heading').textContent=$('heading').textContent.replace('Pinned notes','Pinned');
    const scoped=folders.filter(f=>f.kind&&(folderFilter==='*'||f.parent===folderFilter));
    for(const [id,predicate] of [['all-count',f=>!f.deleted],['pinned-count',f=>!f.deleted&&f.pinned],['trash-count',f=>f.deleted]])$(id).textContent=Number($(id).textContent)+scoped.filter(predicate).length;
    if(selectedPage())return;
    const query=$('search').value,pages=Folders.selectPages(folders,view,folderFilter,query);
    if(view!=='all'||query){
      childFolders.replaceChildren();
      for(const f of pages){
        const row=document.createElement('div');row.className='page-collection-item';
        const label=`${f.name} · ${pageName(f)}`;
        if(view==='trash'){
          const name=document.createElement('span');name.textContent=label;
          const restore=makeButton('Restore',`Restore ${pageName(f)} ${f.name}`,()=>{if(changePage(f.id,{deleted:false})){render();toast('Page restored with its contents.');}});restore.disabled=storageFailed;row.append(name,restore);
        }else{const button=makeButton(label,`Open ${pageName(f)} ${f.name}`,()=>browseFolder(f.id));attachFolderMenu(button,f.id);row.append(button);}
        childFolders.append(row);
      }
      childFolders.hidden=!pages.length;
      if(pages.length)$('empty').hidden=true;
      const count=$('notes').children.length+pages.length;$('results').textContent=`${count} ${count===1?'item':'items'}`;
    }
  }
  const previousRender=render;render=function(){previousRender();collections();updateFooter();};
  const previousOpen=openNote;openNote=function(id){previousOpen(id);updateFooter();};
  render();
})();
