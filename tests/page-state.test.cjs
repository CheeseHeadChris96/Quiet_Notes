const {test}=require('node:test'),assert=require('node:assert/strict');
const F=require('../src/folders-model.js');
for(const kind of ['gallery','gantt','todo'])test(`${kind} pin and trash survive reload and backup without losing contents`,()=>{
  let folders=F.create([],null,'Project','page',kind);
  if(kind==='todo')folders[0].items=[{id:'task',title:'Keep me',completed:false,due:null,created:1,parent:null}];
  if(kind==='gantt')folders[0].tasks=[{id:'task',name:'Keep me',start:'2026-09-08',end:'2026-09-09',progress:25,milestone:false,dependencies:[]}];
  const original=JSON.parse(JSON.stringify(folders[0]));
  folders=F.setPageState(folders,'page',{pinned:true});assert.equal(F.selectPages(folders,'pinned').length,1);
  folders=F.setPageState(folders,'page',{deleted:true});assert.equal(F.children(folders,null).length,0);assert.equal(F.selectPages(folders,'pinned').length,0);assert.equal(F.selectPages(folders,'trash').length,1);
  const loaded=F.load({version:5,folders:JSON.parse(JSON.stringify(folders))},[]);
  folders=F.merge({folders:[],notes:[]},{...loaded,notes:[]}).folders;assert.equal(folders[0].deleted,true);
  folders=F.setPageState(folders,'page',{deleted:false,pinned:false});assert.deepEqual(folders[0],original);
});
test('page states reject malformed flags and cannot be applied to regular folders',()=>{
  const regular=F.create([],null,'Folder','folder');assert.throws(()=>F.setPageState(regular,'folder',{deleted:true}));
  const pages=F.create([],null,'Photos','photos','gallery');assert.throws(()=>F.setPageState(pages,'photos',{deleted:'yes'}));assert.throws(()=>F.setPageState(pages,'photos',{name:'Different'}));
});
test('pinned and trashed pages respect folder scope and search',()=>{
  let f=F.create([],null,'Customer','customer');f=F.create(f,'customer','VPN photos','photos','gallery');f=F.create(f,null,'Other','other','todo');f=F.setPageState(F.setPageState(f,'photos',{pinned:true}),'other',{pinned:true});
  assert.deepEqual(F.selectPages(f,'pinned','customer','vpn').map(x=>x.id),['photos']);assert.equal(F.selectPages(f,'trash').length,0);
});
