const RELEASES='https://github.com/CheeseHeadChris96/Quiet_Notes/releases';
const API='https://api.github.com/repos/CheeseHeadChris96/Quiet_Notes/releases/latest';
function versionParts(value){
  if(typeof value!=='string'||!/^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value))return null;
  const parts=value.replace(/^v/,'').split('.').map(Number);
  return parts.every(Number.isSafeInteger)?parts:null;
}
function newer(candidate,current){
  const a=versionParts(candidate),b=versionParts(current);if(!a||!b)return false;
  for(let i=0;i<3;i++)if(a[i]!==b[i])return a[i]>b[i];return false;
}
function selectUpdate(release,current,platform,arch){
  if(!release||release.draft||release.prerelease||!newer(release.tag_name,current))return null;
  const tag=release.tag_name,version=tag.replace(/^v/,'');
  const suffix=platform==='darwin'&&['arm64','x64'].includes(arch)?`mac-${arch}.dmg`:platform==='win32'&&arch==='x64'?'windows-x64-Setup.exe':null;
  if(!suffix)return null;
  const name=`Quiet-Notes-${version}-${suffix}`;
  const url=`${RELEASES}/download/${tag}/${name}`;
  if(!release.assets?.some(a=>a.name===name&&a.browser_download_url===url&&a.size>0))return null;
  return {version,url};
}
async function fetchRelease(){
  const response=await fetch(API,{headers:{Accept:'application/vnd.github+json','User-Agent':'Quiet-Notes-update-check'},signal:AbortSignal.timeout(10000)});
  if(response.status===404)return null;
  if(!response.ok)throw new Error('GitHub is unavailable.');
  return response.json();
}
function createChecker({version,platform,arch,getRelease=fetchRelease,showMessage,openExternal,readState=async()=>({}),writeState=async()=>{},now=()=>Date.now()}){
  let checking=false,lastOffered=null,nextPromptAt=0,loaded=false;
  async function check(manual=false){
    if(checking)return {status:'busy'};checking=true;
    try{
      if(!loaded){try{const state=await readState();lastOffered=state.lastOffered;nextPromptAt=Number.isFinite(state.nextPromptAt)?state.nextPromptAt:0;}catch{}loaded=true;}
      const release=await getRelease(),update=selectUpdate(release,version,platform,arch);
      if(!update){
        const unavailable=release&&!release.draft&&!release.prerelease&&newer(release.tag_name,version);
        if(manual)await showMessage({type:'info',message:unavailable?'A new release is being prepared':'You’re up to date',detail:unavailable?'A compatible installer is not available yet. Try again later.':`Quiet Notes ${version} is the latest available version for this computer.`,buttons:['OK']});
        return {status:unavailable?'unavailable':'current'};
      }
      if(!manual&&lastOffered===update.version&&now()<nextPromptAt)return {status:'deferred'};
      const result=await showMessage({type:'info',title:'Quiet Notes update',message:`Quiet Notes ${update.version} is available`,detail:`You’re using ${version}. Download the new installer from GitHub, close Quiet Notes, and install it to update. Your saved notes stay on this device.`,buttons:['Download update','Later'],defaultId:1,cancelId:1,noLink:true});
      if(result.response===0){try{await openExternal(update.url);}catch{await showMessage({type:'warning',message:'Could not open the update download',detail:'Please download the installer from '+RELEASES,buttons:['OK']});return {status:'error'};}}
      lastOffered=update.version;nextPromptAt=now()+24*60*60*1000;try{await writeState({lastOffered,nextPromptAt});}catch{}
      return {status:result.response===0?'download-opened':'deferred',version:update.version};
    }catch{
      if(manual)await showMessage({type:'warning',message:'Could not check for updates',detail:'Check your internet connection and try again later.',buttons:['OK']});
      return {status:'error'};
    }finally{checking=false;}
  }
  return {check};
}
module.exports={API,newer,selectUpdate,createChecker};
