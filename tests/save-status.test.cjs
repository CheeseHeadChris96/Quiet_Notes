const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
test('save indicator reports failure until a later save succeeds',()=>{
 const elements=Object.fromEntries(['save-status','save-tooltip','save-indicator'].map(id=>[id,{dataset:{},textContent:''}]));
 let fail=true;const ctx={$:id=>elements[id],storageFailed:false,KEY:'test',notes:[],folders:[],toast(){},localStorage:{setItem(){if(fail)throw new Error('Full');}}};
 const source=fs.readFileSync(require.resolve('../src/app.js'),'utf8');vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('let saveSucceeded='),source.indexOf('function makeButton')),ctx);
 assert.equal(ctx.persist(),false);assert.equal(elements['save-indicator'].dataset.state,'unsaved');assert.equal(elements['save-tooltip'].textContent,'Unsaved');
 vm.runInContext("setSaveStatus(saveSucceeded?'Saved on this device':'Unsaved')",ctx);assert.equal(elements['save-status'].textContent,'Unsaved');
 fail=false;assert.equal(ctx.persist(),true);assert.equal(elements['save-indicator'].dataset.state,'saved');assert.equal(elements['save-tooltip'].textContent,'Saved');
});
