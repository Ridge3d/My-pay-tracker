const STORAGE_KEY="workPayTrackerEntriesV1";
const SETTINGS_KEY="workPayTrackerSettingsV1";
const PAY_TAX_COLLAPSE_KEY="workPayTrackerPayTaxCollapsedV1";

let entries=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");
let settings=JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{"wage":"","filingStatus":"single","step2":"no","qualifyingChildren":0,"otherDependents":1,"otherIncome":0,"deductionsAmount":0,"extraWithholding":0,"stateWithholding":0}');
let editingId=null;

const els={
  wage:document.getElementById("wage"),filingStatus:document.getElementById("filingStatus"),step2:document.getElementById("step2"),qualifyingChildren:document.getElementById("qualifyingChildren"),otherDependents:document.getElementById("otherDependents"),otherIncome:document.getElementById("otherIncome"),deductionsAmount:document.getElementById("deductionsAmount"),extraWithholding:document.getElementById("extraWithholding"),stateWithholding:document.getElementById("stateWithholding"),saveSettings:document.getElementById("saveSettings"),workDate:document.getElementById("workDate"),dayType:document.getElementById("dayType"),clockIn:document.getElementById("clockIn"),clockOut:document.getElementById("clockOut"),breakMinutes:document.getElementById("breakMinutes"),notes:document.getElementById("notes"),addEntry:document.getElementById("addEntry"),entriesList:document.getElementById("entriesList"),totalHours:document.getElementById("totalHours"),grossPay:document.getElementById("grossPay"),federalTax:document.getElementById("federalTax"),socialSecurity:document.getElementById("socialSecurity"),medicare:document.getElementById("medicare"),stateTax:document.getElementById("stateTax"),deductions:document.getElementById("deductions"),takeHomePay:document.getElementById("takeHomePay"),periodLabel:document.getElementById("periodLabel"),historyList:document.getElementById("historyList"),togglePayTax:document.getElementById("togglePayTax"),payTaxContent:document.getElementById("payTaxContent")
};

function todayISO(){const d=new Date(),o=d.getTimezoneOffset();return new Date(d.getTime()-o*60000).toISOString().slice(0,10)}
function money(n){return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(n||0)}
function formatDate(s){return new Date(s+"T12:00:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})}
function escapeHtml(s){return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function saveAll(){localStorage.setItem(STORAGE_KEY,JSON.stringify(entries));localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings))}

els.workDate.value=todayISO();
els.dayType.value="regular";
els.wage.value=settings.wage??"";
els.filingStatus.value=settings.filingStatus??"single";
els.step2.value=settings.step2??"no";
els.qualifyingChildren.value=settings.qualifyingChildren??0;
els.otherDependents.value=settings.otherDependents??0;
els.otherIncome.value=settings.otherIncome??0;
els.deductionsAmount.value=settings.deductionsAmount??0;
els.extraWithholding.value=settings.extraWithholding??0;
els.stateWithholding.value=settings.stateWithholding??0;

function updateRequiredFieldColors(){
  document.querySelectorAll(".required-field").forEach(f=>{
    if(f.disabled){f.classList.remove("is-empty","is-filled");return}
    let filled;
    if(f.tagName==="SELECT") filled=f.value!=="";
    else if(f.type==="number") filled=f.id==="wage"?f.value!==""&&Number(f.value)>0:f.value!==""&&!Number.isNaN(Number(f.value));
    else filled=f.value.trim()!=="";
    f.classList.toggle("is-empty",!filled);f.classList.toggle("is-filled",filled);
  });
}
document.querySelectorAll(".required-field").forEach(f=>{f.addEventListener("input",updateRequiredFieldColors);f.addEventListener("change",updateRequiredFieldColors)});

function updateWorkDayFields(){
  const off=els.dayType.value==="dayOff";
  [els.clockIn,els.clockOut,els.breakMinutes].forEach(f=>f.disabled=off);
  if(off){els.clockIn.value="";els.clockOut.value="";els.breakMinutes.value=0}
  updateRequiredFieldColors();
}
els.dayType.addEventListener("change",updateWorkDayFields);

function parseTime(v){const [h,m]=v.split(":").map(Number);return h*60+m}
function calculateHours(a,b,breakMin){let s=parseTime(a),e=parseTime(b);if(e<s)e+=1440;return Math.max(0,e-s-Number(breakMin||0))/60}
function multiplier(e){return e.dayType==="holiday"?1.5:1}
function entryGross(e,wage){return e.dayType==="dayOff"?0:Number(e.hours||0)*wage*multiplier(e)}
function dayTypeLabel(e){return e.dayType==="dayOff"?"Day Off":e.dayType==="holiday"?"Holiday • 1.5× pay":"Regular Work Day"}

const TAX_TABLES={
 single:[[0,7500,0,0],[7500,19900,0,.10],[19900,57900,1240,.12],[57900,113200,5800,.22],[113200,209275,17966,.24],[209275,263725,41024,.32],[263725,648100,58448,.35],[648100,Infinity,192979.25,.37]],
 married:[[0,16100,0,0],[16100,40900,0,.10],[40900,116900,2480,.12],[116900,227500,11600,.22],[227500,419650,35932,.24],[419650,528550,82048,.32],[528550,777300,116896,.35],[777300,Infinity,203958.5,.37]],
 head:[[0,12000,0,0],[12000,29700,0,.10],[29700,67700,1770,.12],[67700,122950,6330,.22],[122950,219025,18485,.24],[219025,273475,41543,.32],[273475,657850,58967,.35],[657850,Infinity,193498.25,.37]]
};
function annualFederalTax(wage,status,step2){
  const table=TAX_TABLES[status]||TAX_TABLES.single;
  function calc(x){const b=table.find(r=>x>=r[0]&&x<r[1])||table.at(-1);return b[2]+(x-b[0])*b[3]}
  wage=Math.max(0,wage);return step2?calc(wage*2)/2:calc(wage);
}
function calculatePayrollTaxes(gross){
  const periods=52,annual=gross*periods,adjusted=Math.max(0,annual+Number(settings.otherIncome||0)-Number(settings.deductionsAmount||0));
  const credit=Number(settings.qualifyingChildren||0)*2200+Number(settings.otherDependents||0)*500;
  const tentative=annualFederalTax(adjusted,settings.filingStatus||"single",(settings.step2||"no")==="yes");
  const federal=Math.max(0,(tentative-credit)/periods)+Number(settings.extraWithholding||0);
  const socialSecurity=gross*.062,medicare=gross*.0145,state=Number(settings.stateWithholding||0);
  return{federal,socialSecurity,medicare,state,total:federal+socialSecurity+medicare+state};
}

function getPayPeriod(dateString){
  const d=new Date(dateString+"T12:00:00"),daysSinceTuesday=(d.getDay()-2+7)%7,start=new Date(d);start.setDate(d.getDate()-daysSinceTuesday);const end=new Date(start);end.setDate(start.getDate()+6);
  const iso=x=>{const o=x.getTimezoneOffset();return new Date(x.getTime()-o*60000).toISOString().slice(0,10)};
  return{start:iso(start),end:iso(end)};
}

function setPayTaxCollapsed(collapsed){
  els.payTaxContent.classList.toggle("hidden",collapsed);els.togglePayTax.classList.toggle("collapsed",collapsed);els.togglePayTax.setAttribute("aria-expanded",String(!collapsed));localStorage.setItem(PAY_TAX_COLLAPSE_KEY,collapsed?"1":"0");
}
const collapsePref=localStorage.getItem(PAY_TAX_COLLAPSE_KEY);
setPayTaxCollapsed(collapsePref===null?Number(settings.wage||0)>0:collapsePref==="1");
els.togglePayTax.addEventListener("click",()=>setPayTaxCollapsed(!els.payTaxContent.classList.contains("hidden")));

els.saveSettings.addEventListener("click",()=>{
  settings.wage=Number(els.wage.value||0);settings.filingStatus=els.filingStatus.value;settings.step2=els.step2.value;settings.qualifyingChildren=Number(els.qualifyingChildren.value||0);settings.otherDependents=Number(els.otherDependents.value||0);settings.otherIncome=Number(els.otherIncome.value||0);settings.deductionsAmount=Number(els.deductionsAmount.value||0);settings.extraWithholding=Number(els.extraWithholding.value||0);settings.stateWithholding=Number(els.stateWithholding.value||0);
  saveAll();render();renderHistory();if(settings.wage>0)setPayTaxCollapsed(true);els.saveSettings.textContent="Saved ✓";setTimeout(()=>els.saveSettings.textContent="Save Pay & Tax Settings",1100);
});

els.addEntry.addEventListener("click",()=>{
  const date=els.workDate.value,dayType=els.dayType.value,off=dayType==="dayOff",clockIn=off?"":els.clockIn.value,clockOut=off?"":els.clockOut.value,breakMinutes=off?0:Number(els.breakMinutes.value||0),notes=els.notes.value.trim();
  if(!date){alert("Please enter the work date.");return}
  if(!off&&(!clockIn||!clockOut)){alert("Please enter the clock-in and clock-out time, or choose Day Off.");return}
  if(entries.some(e=>e.date===date&&e.id!==editingId)){alert("A work entry already exists for that date. Use Edit on the saved entry instead.");return}
  const entry={id:editingId||crypto.randomUUID(),date,dayType,clockIn,clockOut,breakMinutes,notes,hours:off?0:calculateHours(clockIn,clockOut,breakMinutes)};
  if(editingId){const i=entries.findIndex(e=>e.id===editingId);if(i>=0)entries[i]=entry}else entries.push(entry);
  entries.sort((a,b)=>a.date.localeCompare(b.date));saveAll();editingId=null;els.addEntry.textContent="Save Work Day";els.dayType.value="regular";els.clockIn.value="";els.clockOut.value="";els.breakMinutes.value=0;els.notes.value="";updateWorkDayFields();render();renderHistory();
});

function editEntry(id){
  const e=entries.find(x=>x.id===id);if(!e)return;editingId=id;els.workDate.value=e.date;els.dayType.value=e.dayType||"regular";els.clockIn.value=e.clockIn||"";els.clockOut.value=e.clockOut||"";els.breakMinutes.value=e.breakMinutes||0;els.notes.value=e.notes||"";els.addEntry.textContent="Update Work Day";updateWorkDayFields();window.scrollTo({top:0,behavior:"smooth"});
}
function deleteEntry(id){if(editingId===id){editingId=null;els.addEntry.textContent="Save Work Day"}entries=entries.filter(e=>e.id!==id);saveAll();render();renderHistory()}

function render(){
  const wage=Number(settings.wage||0),period=getPayPeriod(els.workDate.value||todayISO()),periodEntries=entries.filter(e=>e.date>=period.start&&e.date<=period.end),hours=periodEntries.reduce((s,e)=>s+Number(e.hours||0),0),gross=periodEntries.reduce((s,e)=>s+entryGross(e,wage),0),taxes=calculatePayrollTaxes(gross),takeHome=Math.max(0,gross-taxes.total);
  els.totalHours.textContent=hours.toFixed(2);els.grossPay.textContent=money(gross);els.federalTax.textContent=money(taxes.federal);els.socialSecurity.textContent=money(taxes.socialSecurity);els.medicare.textContent=money(taxes.medicare);els.stateTax.textContent=money(taxes.state);els.deductions.textContent=money(taxes.total);els.takeHomePay.textContent=money(takeHome);els.periodLabel.textContent=`${formatDate(period.start)} – ${formatDate(period.end)} • Paid Friday`;
  if(!entries.length){els.entriesList.innerHTML='<div class="empty">No work days saved yet.</div>';return}
  els.entriesList.innerHTML=entries.map(e=>{
    const grossDay=entryGross(e,wage),p=getPayPeriod(e.date),week=entries.filter(x=>x.date>=p.start&&x.date<=p.end),weekGross=week.reduce((s,x)=>s+entryGross(x,wage),0),weekTaxes=calculatePayrollTaxes(weekGross),rate=weekGross>0?Math.max(0,(weekGross-weekTaxes.total)/weekGross):0,takeHomeDay=grossDay*rate,off=e.dayType==="dayOff",breakText=e.breakMinutes?`${e.breakMinutes} min break`:"No unpaid break",timeText=off?"No hours worked":`${e.clockIn} – ${e.clockOut} • ${breakText}`,hoursText=off?"0.00 hours":`${Number(e.hours).toFixed(2)} hours`;
    return `<div class="entry ${e.dayType==="holiday"?"holiday-entry":""} ${off?"day-off-entry":""}"><div><div class="entry-title">${formatDate(e.date)} <span class="day-type-badge">${dayTypeLabel(e)}</span></div><div class="entry-meta">${timeText}<br>${hoursText}${e.dayType==="holiday"?` • ${money(grossDay)} holiday gross`:""}${e.notes?` • ${escapeHtml(e.notes)}`:""}</div><div class="entry-actions"><button class="edit" onclick="editEntry('${e.id}')">Edit</button><button class="delete" onclick="deleteEntry('${e.id}')">Delete</button></div></div><div class="entry-pay">${off?"Day Off":money(takeHomeDay)}<div class="entry-meta">${off?"date accounted for":"est. take-home"}</div></div></div>`;
  }).join("");
}

document.querySelectorAll(".tab-btn").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll(".tab-btn").forEach(x=>x.classList.remove("active"));document.querySelectorAll(".tab-panel").forEach(x=>x.classList.remove("active"));b.classList.add("active");document.getElementById(b.dataset.tab).classList.add("active");if(b.dataset.tab==="historyPanel")renderHistory()}));

function renderHistory(){
  const wage=Number(settings.wage||0);if(!entries.length){els.historyList.innerHTML='<div class="empty">No previous pay periods yet.</div>';return}
  const current=getPayPeriod(todayISO()),groups={};entries.forEach(e=>{const period=getPayPeriod(e.date),key=`${period.start}|${period.end}`;(groups[key]??={period,entries:[]}).entries.push(e)});
  const periods=Object.values(groups).filter(g=>g.period.end<current.start).sort((a,b)=>b.period.start.localeCompare(a.period.start));if(!periods.length){els.historyList.innerHTML='<div class="empty">Previous pay periods will appear here automatically after the current period ends.</div>';return}
  els.historyList.innerHTML=periods.map(g=>{const hours=g.entries.reduce((s,e)=>s+Number(e.hours||0),0),gross=g.entries.reduce((s,e)=>s+entryGross(e,wage),0),taxes=calculatePayrollTaxes(gross),takeHome=Math.max(0,gross-taxes.total),days=[...g.entries].sort((a,b)=>a.date.localeCompare(b.date)).map(e=>e.dayType==="dayOff"?`${formatDate(e.date)} — Day Off`:`${formatDate(e.date)} — ${Number(e.hours).toFixed(2)} hrs${e.dayType==="holiday"?" • Holiday 1.5×":""}`).join("<br>");return `<div class="history-card"><div class="history-head"><div><div class="history-title">${formatDate(g.period.start)} – ${formatDate(g.period.end)}</div><div class="history-subtitle">Friday paycheck estimate</div></div><div class="history-pay">${money(takeHome)}</div></div><div class="history-stats"><div class="history-stat"><span>Hours</span><strong>${hours.toFixed(2)}</strong></div><div class="history-stat"><span>Gross</span><strong>${money(gross)}</strong></div><div class="history-stat"><span>Federal</span><strong>${money(taxes.federal)}</strong></div><div class="history-stat"><span>FICA</span><strong>${money(taxes.socialSecurity+taxes.medicare)}</strong></div></div><div class="history-days">${days}</div></div>`}).join("");
}

updateWorkDayFields();render();renderHistory();
