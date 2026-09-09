const {test}=require('node:test');const assert=require('node:assert/strict');const F=require('../src/folders-model.js');const S=require('../src/store.js');
const n={id:'n',title:'VPN',body:'Settings',color:'neutral',created:1,updated:2,pinned:false,deleted:false};
const roots=()=>F.ROOTS.map(f=>({...f}));
test('legacy customer and technology categories migrate to independent folders with one location',()=>{
 const original=[{...n,client:'HBS',technologies:['VPN','Firewall']},{...n,id:'t',technologies:['VPN']},{...n,id:'g'}];
 const migrated=F.load({clients:['Empty customer'],technologies:['Unused technology']},S.validate(original));
 assert.equal(F.path(migrated.folders,migrated.notes[0].folderId),'Customers / HBS');
 assert.equal(F.path(migrated.folders,migrated.notes[1].folderId),'Technologies / VPN');
 assert.equal(migrated.notes[2].folderId,'generic');
 assert.ok(migrated.folders.some(f=>f.name==='Empty customer'));
 assert.ok(migrated.folders.some(f=>f.name==='Firewall'));
 assert.deepEqual(migrated.notes[0].technologies,['VPN','Firewall']);
 assert.equal(original[0].folderId,undefined);
});
test('nested folders survive serialization, allow same names in different branches, reject duplicate siblings',()=>{
 let folders=F.create(roots(),'customers','HBS','hbs');folders=F.create(folders,'hbs','Networking','network');folders=F.create(folders,'network','VPN','vpn');folders=F.create(folders,'technologies','VPN','other-vpn');
 const data=JSON.parse(JSON.stringify({version:4,folders,notes:[{...n,folderId:'vpn'}]}));
 const result=F.load(data,S.validate(data.notes));assert.equal(F.path(result.folders,result.notes[0].folderId),'Customers / HBS / Networking / VPN');
 assert.throws(()=>F.create(folders,'network','vpn','dupe'));assert.throws(()=>F.create(folders,'missing','Test','invalid'));
});
test('invalid folder relationships and missing note destinations are rejected',()=>{
 assert.throws(()=>F.validate([...roots(),{id:'a',parent:'b',name:'A'},{id:'b',parent:'a',name:'B'}]));
 assert.throws(()=>F.validate([...roots(),{id:'a',parent:'missing',name:'A'}]));
 assert.throws(()=>F.load({version:4,folders:roots()},[{...n,folderId:'missing'}]));
 assert.doesNotThrow(()=>F.validate([...roots(),{id:'extra',parent:null,name:'Extra'}]));
});
test('backup merge maps matching paths and conflicting IDs while retaining existing notes',()=>{
 let current=F.create(roots(),'customers','HBS','a');current=F.create(current,'a','Networking','b');
 let incoming=F.create(roots(),'customers','hbs','foreign');incoming=F.create(incoming,'foreign','networking','nested');incoming=F.create(incoming,'technologies','DNS','a');
 const merged=F.merge({folders:current,notes:[{...n,folderId:'b'}]},{folders:incoming,notes:[{...n,folderId:'a'},{...n,id:'new',folderId:'nested'},{...n,id:'dns',folderId:'a'}]});
 assert.equal(merged.added,2);assert.equal(merged.notes[0].folderId,'b');assert.equal(merged.notes[1].folderId,'b');assert.equal(F.path(merged.folders,merged.notes[2].folderId),'Technologies / DNS');assert.doesNotThrow(()=>F.validate(merged.folders));
});
test('moving a note changes its only location without changing content or other notes',()=>{
 const folders=F.create(roots(),'technologies','VPN','vpn');const notes=[{...n,folderId:'customers'},{...n,id:'other',folderId:'generic'}];notes[0].folderId='vpn';
 const loaded=F.load({version:4,folders},S.validate(notes));assert.equal(loaded.notes.filter(n=>n.folderId==='customers').length,0);assert.equal(loaded.notes.filter(n=>n.folderId==='vpn').length,1);assert.equal(loaded.notes[0].body,'Settings');assert.equal(loaded.notes[1].folderId,'generic');
});

test('custom root folders and their subfolders survive backup merge',()=>{
 let folders=F.create(roots(),null,'Projects','projects');folders=F.create(folders,'projects','Migration','migration');
 assert.equal(F.path(folders,'projects'),'Projects');assert.equal(F.path(folders,'migration'),'Projects / Migration');
 assert.throws(()=>F.create(folders,null,'projects','duplicate'));
 const merged=F.merge({folders:roots(),notes:[]},{folders,notes:[{...n,folderId:'migration'}]});
 assert.equal(F.path(merged.folders,merged.notes[0].folderId),'Projects / Migration');
});
test('folder deletion removes its subtree and trashes only affected notes with valid recovery destinations',()=>{
 let folders=F.create(roots(), 'customers','HBS','hbs');folders=F.create(folders,'hbs','Network','net');
 const notes=[{...n,folderId:'net'},{...n,id:'already-trash',folderId:'hbs',deleted:true},{...n,id:'keep',folderId:'technologies'}];
 const result=F.remove(folders,notes,'customers');
 assert.ok(!result.folders.some(f=>['customers','hbs','net'].includes(f.id)));
 assert.deepEqual(result.notes[0],{...notes[0],folderId:'generic',deleted:true});assert.equal(result.notes[1].folderId,'generic');assert.deepEqual(result.notes[2],notes[2]);
 assert.equal(notes[0].deleted,false);assert.doesNotThrow(()=>F.load({version:4,folders:result.folders},result.notes));assert.throws(()=>F.remove(folders,notes,'generic'));
 const merged=F.merge(result,{folders,notes:[]});assert.ok(merged.folders.some(f=>f.id==='customers'));
});
test('folder moves preserve descendants and reject cycles, duplicate siblings, and invalid destinations',()=>{
 let folders=F.create(roots(),'customers','HBS','hbs');folders=F.create(folders,'hbs','Network','net');
 const moved=F.move(folders,'hbs','technologies');assert.equal(F.path(moved,'net'),'Technologies / HBS / Network');assert.equal(F.path(folders,'net'),'Customers / HBS / Network');
 assert.equal(F.path(F.move(moved,'hbs',null),'net'),'HBS / Network');
 assert.throws(()=>F.move(folders,'hbs','hbs'));assert.throws(()=>F.move(folders,'hbs','net'));assert.throws(()=>F.move(folders,'hbs','missing'));assert.throws(()=>F.move(folders,'generic','hbs'));
 const collision=F.create(folders,'technologies','hbs','other');assert.throws(()=>F.move(collision,'hbs','technologies'));
 const state=F.load({version:4,folders:moved},[{...n,folderId:'net'}]);assert.equal(state.notes[0].folderId,'net');
});
