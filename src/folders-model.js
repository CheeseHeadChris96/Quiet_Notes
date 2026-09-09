(function(root){
  const Todo=typeof module!=='undefined'?require('./todo-model.js'):root.TodoModel;
  const Gantt=typeof module!=='undefined'?require('./gantt-model.js'):root.GanttModel;
  const ROOTS=[];
  const LEGACY_ROOTS=[{id:'customers',name:'Customers',parent:null},{id:'technologies',name:'Technologies',parent:null},{id:'generic',name:'Generic',parent:null}];
  const clean=value=>{if(typeof value!=='string')throw new Error('Enter a folder name.');const name=value.trim().replace(/\s+/g,' ');if(!name||name.length>120||/[\x00-\x1f/\\]/.test(name))throw new Error('Use 1–120 characters, without slashes.');return name;};
  const key=name=>name.toLowerCase();
  const pageFlags=f=>({...((f.kind&&f.pinned)?{pinned:true}:{}),...((f.kind&&f.deleted)?{deleted:true}:{})});
  function validate(data){
    if(!Array.isArray(data)||data.length>10000)throw new Error('Invalid folder list.');
    const ids=new Set(),siblings=new Set();
    const folders=data.map(f=>{if(!f||typeof f.id!=='string'||!f.id||ids.has(f.id)||(f.parent!==null&&typeof f.parent!=='string'))throw new Error('Invalid folder.');const name=clean(f.name),pair=JSON.stringify([f.parent,key(name)]);if(siblings.has(pair))throw new Error('Duplicate folder name.');ids.add(f.id);siblings.add(pair);if(f.kind!==undefined&&!['gallery','gantt','todo'].includes(f.kind))throw new Error('Invalid folder type.');for(const flag of ['pinned','deleted'])if(f[flag]!==undefined&&(!f.kind||typeof f[flag]!=='boolean'))throw new Error('Invalid page state.');return {id:f.id,name,parent:f.parent,...pageFlags(f),...(f.kind?{kind:f.kind}:{}),...(f.kind==='gantt'?{tasks:Gantt.validate(f.tasks||[])}:{}),...(f.kind==='todo'?{items:Todo.validate(f.items??[])}:{})};});
    const map=new Map(folders.map(f=>[f.id,f]));
    for(const f of folders){const seen=new Set([f.id]);let parent=f.parent;while(parent!==null){if(!map.has(parent)||seen.has(parent))throw new Error('Invalid folder hierarchy.');if(map.get(parent).kind)throw new Error('Choose a regular folder as the parent.');seen.add(parent);parent=map.get(parent).parent;}}
    return folders;
  }
  function path(folders,id){const map=new Map(folders.map(f=>[f.id,f])),parts=[];let f=map.get(id);while(f){parts.unshift(f.name);f=map.get(f.parent);}return parts.join(' / ');}
  function children(folders,parent){return folders.filter(f=>f.parent===parent&&!f.deleted).sort((a,b)=>a.name.localeCompare(b.name));}
  function create(folders,parent,value,id,kind){if(parent!==null&&!folders.some(f=>f.id===parent))throw new Error('Choose a parent folder.');const name=clean(value);if(folders.some(f=>f.parent===parent&&key(f.name)===key(name)))throw new Error('A folder with that name already exists here.');return validate([...folders,{id,name,parent,...(kind?{kind}:{})}]);}
  function load(data,notes){
    if(data.version>=4){
      let folders=validate(data.folders);
      const ids=new Set(folders.filter(f=>!f.kind).map(f=>f.id));
      if(notes.some(n=>!(data.version>=5&&n.folderId===null)&&!ids.has(n.folderId)))throw new Error('A note has an invalid folder.');
      // Remove only untouched, empty starter folders from older installations.
      if(data.version<5)folders=folders.filter(f=>!LEGACY_ROOTS.some(r=>r.id===f.id&&r.name===f.name&&f.parent===null&&!f.kind&&!folders.some(child=>child.parent===f.id)&&!notes.some(n=>n.folderId===f.id)));
      return {folders,notes};
    }
    const folders=[];
    // Legacy names can contain slashes. Keep them as literal folder names using a safe display separator.
    function legacy(parent,value){if(!folders.some(f=>f.id===parent))folders.push({...LEGACY_ROOTS.find(f=>f.id===parent)});const name=clean(value.replace(/[/\\]/g,'›'));let f=folders.find(f=>f.parent===parent&&key(f.name)===key(name));if(!f){f={id:'legacy:'+parent+':'+encodeURIComponent(key(name)),name,parent};folders.push(f);}return f.id;}
    for(const c of data.clients||[])if(c.trim().toLowerCase()!=='generic')legacy('customers',c);
    for(const t of data.technologies||[])if(t.trim().toLowerCase()!=='uncategorized')legacy('technologies',t);
    const moved=notes.map(n=>{const customer=n.client?legacy('customers',n.client):null;const techs=(n.technologies||[]).map(t=>legacy('technologies',t));return {...n,folderId:customer||techs[0]||null};});
    return {folders:validate(folders),notes:moved};
  }
  function merge(current,incoming){
    let folders=validate(current.folders).map(f=>({...f}));const mapped=new Map([[null,null]]);
    const pending=validate(incoming.folders);
    while(pending.length){const at=pending.findIndex(f=>mapped.has(f.parent));const f=pending.splice(at,1)[0],parent=mapped.get(f.parent);let match=folders.find(x=>x.parent===parent&&key(x.name)===key(f.name));if(match&&match.kind!==f.kind)throw new Error('Different folder types have the same backup path. Rename one before importing.');if(!match){let id=f.id;while(folders.some(x=>x.id===id))id+=':import';match={id,name:f.name,parent,...pageFlags(f),...(f.kind?{kind:f.kind}:{}),...(f.kind==='gantt'?{tasks:f.tasks}:{}),...(f.kind==='todo'?{items:f.items}:{})};folders.push(match);}else if(f.kind==='gantt'){const taskIds=new Set(match.tasks.map(t=>t.id));match.tasks=Gantt.schedule([...match.tasks,...f.tasks.filter(t=>!taskIds.has(t.id))]);}else if(f.kind==='todo'){match.items=Todo.merge(match.items,f.items);}mapped.set(f.id,match.id);}
    const ids=new Set(current.notes.map(n=>n.id));const additions=incoming.notes.filter(n=>!ids.has(n.id)).map(n=>({...n,folderId:mapped.get(n.folderId)}));
    return {folders,notes:[...current.notes,...additions],added:additions.length,folderMap:mapped};
  }
  function setPageState(folders,id,patch){
    if(!folders.some(f=>f.id===id&&f.kind))throw new Error('Page not found.');
    if(!patch||Object.keys(patch).some(key=>!['pinned','deleted'].includes(key)||typeof patch[key]!=='boolean'))throw new Error('Invalid page state.');
    return validate(folders.map(f=>f.id===id?{...f,...patch}:f));
  }
  function selectPages(folders,view,parent='*',query=''){
    const q=query.trim().toLowerCase();
    return folders.filter(f=>f.kind&&(parent==='*'||f.parent===parent)&&(view==='trash'?f.deleted:!f.deleted&&(view!=='pinned'||f.pinned))&&path(folders,f.id).toLowerCase().includes(q)).sort((a,b)=>Number(!!b.pinned)-Number(!!a.pinned)||a.name.localeCompare(b.name));
  }
  function remove(folders,notes,id){
    if(!folders.some(f=>f.id===id))throw new Error('Folder not found.');
    const removed=new Set([id]);let count;
    do{count=removed.size;for(const f of folders)if(removed.has(f.parent))removed.add(f.id);}while(count!==removed.size);
    return {folders:validate(folders.filter(f=>!removed.has(f.id))),notes:notes.map(n=>removed.has(n.folderId)?{...n,folderId:null,deleted:true}:n),removed};
  }
  function move(folders,id,parent){
    const folder=folders.find(f=>f.id===id);
    if(!folder)throw new Error('Folder not found.');
    if(parent!==null&&!folders.some(f=>f.id===parent))throw new Error('Destination folder not found.');
    let ancestor=parent;
    while(ancestor!==null){if(ancestor===id)throw new Error('A folder cannot be moved into itself or its subfolders.');ancestor=folders.find(f=>f.id===ancestor).parent;}
    if(folders.some(f=>f.id!==id&&f.parent===parent&&key(f.name)===key(folder.name)))throw new Error('A folder with that name already exists there.');
    return validate(folders.map(f=>f.id===id?{...f,parent}:f));
  }
  const api={setPageState,selectPages,move,remove,ROOTS,LEGACY_ROOTS,clean,validate,path,children,create,load,merge};if(typeof module!=='undefined')module.exports=api;else root.Folders=api;
})(typeof window!=='undefined'?window:globalThis);
