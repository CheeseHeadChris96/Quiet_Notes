(() => {
  if(!window.appUpdates)return;
  const check=makeButton('Check for updates…','Check for updates',async()=>{
    check.disabled=true;document.querySelector('.more-menu').open=false;
    try{const result=await window.appUpdates.check();if(result?.status==='busy')toast('An update check is already running.');if(result?.status==='development')toast('Update checks are available in the installed app.');}
    catch{toast('Could not check for updates. Please try again later.');}
    finally{check.disabled=false;}
  });
  document.querySelector('.more-menu>div').append(check);
})();
