const tools=document.querySelector('.common-tools');
const toggle=document.getElementById('tools-toggle');
const compact=matchMedia('(max-width:800px)');
function setOpen(open){
  toggle.setAttribute('aria-expanded',String(open));
  tools.classList.toggle('open',open);
}
toggle.addEventListener('click',()=>setOpen(!tools.classList.contains('open')));
document.addEventListener('pointerdown',e=>{if(!tools.contains(e.target))setOpen(false);});
document.getElementById('tool-actions').addEventListener('click',e=>{
  if(compact.matches && e.target.closest('button')){setOpen(false);toggle.focus();}
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&tools.classList.contains('open')){setOpen(false);toggle.focus();}
});
compact.addEventListener('change',()=>setOpen(false));
