(function(root){
  const DAY=86400000;
  function day(value){
    if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new Error('Choose a valid date.');
    const time=Date.parse(value+'T00:00:00Z');
    if(!Number.isFinite(time)||new Date(time).toISOString().slice(0,10)!==value||value<'1900-01-01'||value>'2200-12-31')throw new Error('Choose a date between 1900 and 2200.');
    return time/DAY;
  }
  const date=value=>new Date(value*DAY).toISOString().slice(0,10);
  function validate(tasks){
    if(!Array.isArray(tasks)||tasks.length>1000)throw new Error('A chart can contain up to 1,000 tasks.');
    const ids=new Set();
    const result=tasks.map(task=>{
      if(!task||typeof task.id!=='string'||!task.id||ids.has(task.id)||typeof task.name!=='string'||!task.name.trim()||task.name.length>200)throw new Error('Enter a task name of 1–200 characters.');
      const start=day(task.start),end=day(task.end);
      if(end<start)throw new Error('The end date must be on or after the start date.');
      if(!Number.isInteger(task.progress)||task.progress<0||task.progress>100)throw new Error('Progress must be a whole percentage from 0 to 100.');
      if(task.milestone!==undefined&&typeof task.milestone!=='boolean')throw new Error('Invalid milestone.');const dependencies=task.dependencies??[];if(!Array.isArray(dependencies)||dependencies.some(id=>typeof id!=='string')||new Set(dependencies).size!==dependencies.length)throw new Error('Invalid task dependencies.');if(task.milestone&&start!==end)throw new Error('A milestone must have one date.');ids.add(task.id);return {id:task.id,name:task.name.trim(),start:task.start,end:task.end,progress:task.progress,milestone:!!task.milestone,dependencies:[...dependencies]};
    });
    for(const task of result)if(task.dependencies.some(id=>id===task.id||!ids.has(id)))throw new Error('Choose other existing tasks as dependencies.');
    order(result);return result;
  }
  function order(tasks){
    const sorted=[],done=new Set();
    while(sorted.length<tasks.length){let changed=false;for(const task of tasks)if(!done.has(task.id)&&task.dependencies.every(id=>done.has(id))){sorted.push(task);done.add(task.id);changed=true;}if(!changed)throw new Error('Dependencies cannot form a loop.');}
    return sorted;
  }
  function schedule(tasks){
    const clean=validate(tasks),map=new Map(clean.map(t=>[t.id,t]));
    for(const task of order(clean)){
      const earliest=Math.max(day(task.start),...task.dependencies.map(id=>day(map.get(id).end)+1));
      if(earliest>day(task.start)){const duration=day(task.end)-day(task.start);task.start=date(earliest);task.end=date(earliest+duration);}
    }
    return validate(clean);
  }
  function shift(task,delta,edge='move'){
    const start=day(task.start),end=day(task.end);delta=Math.round(delta);if(task.milestone)edge='move';
    const next={...task,start:date(edge==='end'?start:Math.min(end,edge==='start'?start+delta:start)),end:date(edge==='start'?end:Math.max(start,edge==='end'?end+delta:end))};
    if(edge==='move'){next.start=date(start+delta);next.end=date(end+delta);}
    day(next.start);day(next.end);return next;
  }
  function position(task,first,count){const start=day(task.start),end=day(task.end)+1,left=Math.max(start,first),right=Math.min(end,first+count);return right<=left?null:{left:left-first,width:right-left,clippedStart:start<first,clippedEnd:end>first+count};}
  const api={day,date,validate,schedule,shift,position};if(typeof module!=='undefined')module.exports=api;else root.GanttModel=api;
})(typeof window!=='undefined'?window:globalThis);
