(function(root){
  function validate(items){
    if(!Array.isArray(items)||items.length>5000)throw new Error('A to-do page can contain up to 5,000 tasks.');
    const ids=new Set();
    const result=items.map(item=>{
      if(!item||typeof item.id!=='string'||!item.id||ids.has(item.id)||typeof item.title!=='string'||!item.title.trim()||item.title.length>300||typeof item.completed!=='boolean'||!Number.isFinite(item.created))throw new Error('Enter a task name of 1–300 characters.');
      const due=item.due??null,parent=item.parent??null;
      if(parent!==null&&(typeof parent!=='string'||!parent))throw new Error('Invalid parent task.');
      if(due!==null&&(typeof due!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(due)||due<'1900-01-01'||due>'2200-12-31'||!Number.isFinite(Date.parse(due+'T00:00:00Z'))||new Date(due+'T00:00:00Z').toISOString().slice(0,10)!==due))throw new Error('Choose a valid due date.');
      ids.add(item.id);return {id:item.id,title:item.title.trim(),completed:item.completed,due,created:item.created,parent};
    });
    const map=new Map(result.map(t=>[t.id,t]));
    for(const item of result){const seen=new Set([item.id]);let parent=item.parent;while(parent!==null){if(!map.has(parent)||seen.has(parent))throw new Error('A task cannot be placed inside itself or its subtasks.');seen.add(parent);parent=map.get(parent).parent;}}
    return result;
  }
  function tree(items){
    const children=new Map();for(const item of items){const parent=item.parent??null;if(!children.has(parent))children.set(parent,[]);children.get(parent).push(item);}
    const result=[],stack=(children.get(null)||[]).map(item=>({item,depth:0})).reverse();
    while(stack.length){const entry=stack.pop();result.push(entry);for(const item of [...(children.get(entry.item.id)||[])].reverse())stack.push({item,depth:entry.depth+1});}
    return result;
  }
  const matches=(item,filter)=>filter==='completed'?item.completed:filter==='active'?!item.completed:true;
  function select(items,filter){return tree(items).map(e=>e.item).filter(item=>matches(item,filter));}
  function visible(items,filter){
    const map=new Map(items.map(t=>[t.id,t])),included=new Set();
    for(const item of items)if(matches(item,filter)){let current=item;while(current&&!included.has(current.id)){included.add(current.id);current=map.get(current.parent);}}
    return tree(items).filter(e=>included.has(e.item.id)).map(e=>({...e,context:!matches(e.item,filter)}));
  }
  function subtree(items,id){const removed=new Set([id]);let previous;do{previous=removed.size;for(const item of items)if(removed.has(item.parent))removed.add(item.id);}while(previous!==removed.size);return removed;}
  function remove(items,id){const removed=subtree(items,id);return validate(items.filter(t=>!removed.has(t.id)));}
  function move(items,id,target,position){
    const clean=validate(items),source=clean.find(t=>t.id===id),destination=clean.find(t=>t.id===target);
    if(!source||!['before','after','inside','root'].includes(position)||(position!=='root'&&!destination))throw new Error('Choose a destination task.');
    const moving=subtree(clean,id);if(position!=='root'&&moving.has(target))throw new Error('A task cannot be placed inside itself or its subtasks.');
    const ordered=tree(clean).map(e=>e.item),branch=ordered.filter(t=>moving.has(t.id)),remaining=ordered.filter(t=>!moving.has(t.id));
    branch[0]={...branch[0],parent:position==='root'?null:position==='inside'?destination.id:destination.parent};
    let index=remaining.length;
    if(position==='before')index=remaining.findIndex(t=>t.id===target);
    else if(position==='after'||position==='inside'){const descendants=subtree(remaining,target);index=remaining.reduce((last,t,i)=>descendants.has(t.id)?i+1:last,0);}
    remaining.splice(index,0,...branch);return validate(remaining);
  }
  function merge(current,incoming){const ids=new Set(current.map(item=>item.id));return validate([...current,...incoming.filter(item=>!ids.has(item.id))]);}
  const api={validate,select,visible,merge,move,remove};if(typeof module!=='undefined')module.exports=api;else root.TodoModel=api;
})(typeof window!=='undefined'?window:globalThis);
