const {test}=require('node:test');
const assert=require('node:assert/strict');
const F=require('../src/folders-model.js');
const S=require('../src/store.js');
const note={id:'note',title:'Root note',body:'Keep this',color:'neutral',created:1,updated:2,pinned:false,deleted:false,folderId:null};

test('fresh installs and empty legacy stores contain no starter folders',()=>{
  assert.deepEqual(F.ROOTS,[]);
  assert.deepEqual(F.load({},[]),{folders:[],notes:[]});
  assert.deepEqual(F.load({version:4,folders:F.LEGACY_ROOTS},[]),{folders:[],notes:[]});
});
test('upgrade only removes unchanged empty defaults, preserving content and renamed folders',()=>{
  const folders=F.LEGACY_ROOTS.map(f=>({...f}));
  folders.find(f=>f.id==='generic').name='My notes';
  folders.push({id:'site',name:'Site',parent:'customers'});
  const existing=[{...note,folderId:'site'}];
  const loaded=F.load({version:4,folders},existing);
  assert.deepEqual(loaded.folders.map(f=>f.id),['customers','generic','site']);
  assert.deepEqual(loaded.notes,existing);
  assert.ok(F.load({version:4,folders:F.LEGACY_ROOTS},[{...note,folderId:'generic',deleted:true}]).folders.some(f=>f.id==='generic'));
  assert.deepEqual(F.load({version:5,folders:F.LEGACY_ROOTS},[]).folders,F.LEGACY_ROOTS);
});
test('root notes survive save, restore and backup import without recreating Generic',()=>{
  const raw=JSON.parse(JSON.stringify({version:5,folders:[],notes:[note]}));
  const loaded=F.load(raw,S.validate(raw.notes));
  const merged=F.merge({folders:[],notes:[]},loaded);
  assert.deepEqual(merged.notes,[note]);assert.deepEqual(merged.folders,[]);
  assert.throws(()=>F.load({version:5,folders:[]},[{...note,folderId:'missing'}]));
  assert.throws(()=>F.load({version:5,folders:[]},[{...note,folderId:undefined}]));
});
test('the last folder can be deleted and its notes restored at the root',()=>{
  const folders=F.create([],null,'My work','work');
  const removed=F.remove(folders,[{...note,folderId:'work'}],'work');
  assert.deepEqual(removed.folders,[]);
  assert.deepEqual(removed.notes,[{...note,deleted:true}]);
  const restored=F.load({version:5,folders:[]},S.validate(removed.notes.map(n=>({...n,deleted:false}))));
  assert.deepEqual(restored.notes,[note]);
});
test('older backups retain populated Generic folders when imported into an empty app',()=>{
  const incoming=F.load({version:4,folders:F.LEGACY_ROOTS},[{...note,folderId:'generic'}]);
  const merged=F.merge({folders:[],notes:[]},incoming);
  assert.deepEqual(merged.folders,[F.LEGACY_ROOTS.find(f=>f.id==='generic')]);
  assert.equal(merged.notes[0].folderId,'generic');
});
