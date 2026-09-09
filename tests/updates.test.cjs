const {test}=require('node:test'),assert=require('node:assert/strict');
const {newer,selectUpdate,createChecker}=require('../electron/updates.cjs');
function release(version='0.23.0'){
  const tag='v'+version;return {tag_name:tag,draft:false,prerelease:false,assets:['mac-arm64.dmg','mac-x64.dmg','windows-x64-Setup.exe'].map(suffix=>{const name=`Quiet-Notes-${version}-${suffix}`;return {name,size:100,browser_download_url:`https://github.com/CheeseHeadChris96/Quiet_Notes/releases/download/${tag}/${name}`};})};
}
test('updates compare stable version numbers, not alphabetical order',()=>{
  assert.ok(newer('v0.23.0','0.22.0'));assert.ok(newer('0.100.0','0.99.9'));assert.ok(!newer('0.22.0','0.22.0'));assert.ok(!newer('0.21.1','0.22.0'));assert.ok(!newer('0.23.0-beta.1','0.22.0'));assert.ok(!newer('vbogus','0.22.0'));
});
test('only compatible installers from this repository can be offered',()=>{
  const r=release();assert.match(selectUpdate(r,'0.22.0','darwin','arm64').url,/mac-arm64.dmg$/);assert.match(selectUpdate(r,'0.22.0','win32','x64').url,/windows-x64-Setup.exe$/);assert.equal(selectUpdate({...r,prerelease:true},'0.22.0','win32','x64'),null);assert.equal(selectUpdate({...r,draft:true},'0.22.0','darwin','x64'),null);assert.equal(selectUpdate({...r,assets:[]},'0.22.0','darwin','x64'),null);assert.equal(selectUpdate(r,'0.22.0','linux','x64'),null);
  r.assets[0].browser_download_url='https://evil.example/update.dmg';assert.equal(selectUpdate(r,'0.22.0','darwin','arm64'),null);
});
function setup(overrides={}){const messages=[],opened=[],saved=[];const checker=createChecker({version:'0.22.0',platform:'darwin',arch:'arm64',getRelease:async()=>release(),showMessage:async options=>{messages.push(options);return {response:1};},openExternal:async url=>opened.push(url),writeState:async state=>saved.push(state),...overrides});return {checker,messages,opened,saved};}
test('Later never starts a download, suppresses repeat prompts, and manual check can offer again',async()=>{
  const s=setup();assert.equal((await s.checker.check()).status,'deferred');assert.equal(s.opened.length,0);await s.checker.check();assert.equal(s.messages.length,1);await s.checker.check(true);assert.equal(s.messages.length,2);assert.equal(s.saved[0].lastOffered,'0.23.0');
});
test('download opens the validated architecture-specific installer only after accepting',async()=>{
  const s=setup({showMessage:async()=>({response:0})});assert.equal((await s.checker.check()).status,'download-opened');assert.equal(s.opened.length,1);assert.match(s.opened[0],/mac-arm64.dmg$/);
});
test('offline automatic checks stay quiet; manual checks explain the failure',async()=>{
  const s=setup({getRelease:async()=>{throw Error('offline');}});assert.equal((await s.checker.check()).status,'error');assert.equal(s.messages.length,0);await s.checker.check(true);assert.match(s.messages[0].message,/Could not check/);
});
test('current releases stay quiet automatically and a saved deferral survives restart',async()=>{
  const s=setup({getRelease:async()=>release('0.22.0')});assert.equal((await s.checker.check()).status,'current');assert.equal(s.messages.length,0);await s.checker.check(true);assert.match(s.messages[0].message,/up to date/);
  const deferred=setup({readState:async()=>({lastOffered:'0.23.0',nextPromptAt:Date.now()+86400000})});await deferred.checker.check();assert.equal(deferred.messages.length,0);
});
test('concurrent checks cannot open duplicate update dialogs',async()=>{
  let resolve;const s=setup({getRelease:()=>new Promise(r=>resolve=r)});const pending=s.checker.check();await new Promise(r=>setImmediate(r));assert.equal((await s.checker.check(true)).status,'busy');resolve(release());await pending;assert.equal(s.messages.length,1);
});

test('Later reminds again after a day without suppressing newer releases',async()=>{let now=0,current=release();const s=setup({now:()=>now,getRelease:async()=>current});await s.checker.check();now=86400001;await s.checker.check();assert.equal(s.messages.length,2);current=release('0.24.0');await s.checker.check();assert.equal(s.messages.length,3);});
