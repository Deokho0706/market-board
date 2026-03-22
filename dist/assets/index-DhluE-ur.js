(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin===`use-credentials`?t.credentials=`include`:e.crossOrigin===`anonymous`?t.credentials=`omit`:t.credentials=`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();function e(e){return String(e??``).replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`).replace(/'/g,`&#x27;`)}var t=[],n=[],r=[];function i(e){let t=[],n=[],r=100,i=new Date;for(let a=e;a>=0;a--){let e=new Date(i);e.setDate(e.getDate()-a),t.push(`${e.getMonth()+1}/${e.getDate()}`),r+=(Math.random()-.47)*1.2,n.push(+r.toFixed(2))}return{labels:t,data:n}}function a(e){let t=[],n=[],r=22,i=new Date;for(let a=e;a>=0;a--){let e=new Date(i);e.setDate(e.getDate()-a),t.push(`${e.getMonth()+1}/${e.getDate()}`),r+=(Math.random()-.5)*1.5,r=Math.max(12,Math.min(40,r)),n.push(+r.toFixed(2))}return{labels:t,data:n}}function o(e){return e.toLocaleString(`ko-KR`,{month:`2-digit`,day:`2-digit`,hour:`2-digit`,minute:`2-digit`})}function s(e,t){let n=document.getElementById(e);n&&(n.classList.toggle(`spinning`,t),n.classList.toggle(`loading`,t))}function c(e,t,n){let r=document.getElementById(e);r&&(r.textContent=n?`${o(t)} (캐시)`:o(t),r.classList.toggle(`cached`,!!n))}function l(e){e.querySelectorAll(`.binary-bar-fill, .multi-bar-fill`).forEach(e=>{let t=e.dataset.pct+`%`;requestAnimationFrame(()=>{requestAnimationFrame(()=>{e.style.width=t})})})}function u(e,t){let n=document.getElementById(e);n.innerHTML=Array.from({length:t},()=>`<div class="skeleton"></div>`).join(``)}function d(){let e=document.getElementById(`market-grid`);e.innerHTML=``,t.forEach(t=>{let n=t.raw>0?`up`:t.raw<0?`down`:`neutral`,r=t.change?`<div class="mcard-change ${n}">${t.change}</div>`:``,i=document.createElement(`div`);i.className=`mcard ${n} fade-in`,i.innerHTML=`
  <div class="mcard-label">${t.label}</div>
  <div class="mcard-value">${t.value}</div>
  ${r}
  <div class="mcard-sub">${t.sub}</div>`,e.appendChild(i)})}function f(){let e=document.getElementById(`prob-grid`);e.innerHTML=``,n.forEach(t=>{let n=document.createElement(`div`);if(n.className=`pcard fade-in`,t.type===`binary`)n.innerHTML=`
    <div class="pcard-type binary">BINARY</div>
    <div class="pcard-title">${t.title}</div>
    <div class="binary-main">
      <span class="binary-yes-label">Yes</span>
      <span class="binary-yes-pct">${t.yes}%</span>
    </div>
    <div class="binary-bar">
      <div class="binary-bar-fill" data-pct="${t.yes}"></div>
    </div>
    <div class="binary-no">No <span>${t.no}%</span></div>
    <div class="pcard-src">${t.src}</div>`;else{let e=t.outcomes.map((e,t)=>`
    <div class="multi-row">
      <div class="multi-row-head">
        <span class="multi-row-label">${e.label}</span>
        <span class="multi-row-pct ${t===0?`top`:``}">${e.pct}%</span>
      </div>
      <div class="multi-bar">
        <div class="multi-bar-fill ${t===0?`top`:``}" data-pct="${e.pct}"></div>
      </div>
    </div>`).join(``);n.innerHTML=`
    <div class="pcard-type multi">MULTI-OUTCOME</div>
    <div class="pcard-title">${t.title}</div>
    <div class="multi-rows">${e}</div>
    <div class="multi-other">기타 ${t.other}% (나머지 아웃컴)</div>
    <div class="pcard-src">${t.src}</div>`}e.appendChild(n)}),l(e)}function p(){let t=document.getElementById(`news-grid`);t.innerHTML=``,r.forEach(n=>{let r=document.createElement(`div`);r.className=`ncard fade-in`,r.innerHTML=`
  <span class="ncard-tag ${n.tag}">${e(n.tagLabel)}</span>
  <div class="ncard-title">${e(n.title)}</div>
  <div class="ncard-summary">${e(n.summary)}</div>
  <div class="ncard-why">${e(n.why)}</div>
  <div class="ncard-meta">
    <span class="ncard-date">${e(n.date)}</span>
  </div>`,t.appendChild(r)})}var m={};function h(){return{responsive:!0,maintainAspectRatio:!1,plugins:{legend:{display:!1},tooltip:{backgroundColor:`#111318`,borderColor:`#2a3040`,borderWidth:1,titleColor:`#8a96a8`,bodyColor:`#c8d0dc`,titleFont:{family:`IBM Plex Mono`,size:10},bodyFont:{family:`IBM Plex Mono`,size:11}}},scales:{x:{ticks:{color:`#8a96a8`,font:{family:`IBM Plex Mono`,size:10},maxTicksLimit:6,maxRotation:0},grid:{color:`#1e2229`}},y:{ticks:{color:`#8a96a8`,font:{family:`IBM Plex Mono`,size:10}},grid:{color:`#1e2229`}}}}}function g(e){let{labels:t,data:n}=i(e),r=document.getElementById(`chart-sp`);if(!r)return;let a=r.getContext(`2d`);m.sp&&=(m.sp.destroy(),null);let o=a.createLinearGradient(0,0,0,180);o.addColorStop(0,`rgba(0,212,170,0.18)`),o.addColorStop(1,`rgba(0,212,170,0)`),m.sp=new Chart(a,{type:`line`,data:{labels:t,datasets:[{data:n,borderColor:`#00d4aa`,borderWidth:1.5,backgroundColor:o,fill:!0,tension:.3,pointRadius:0,pointHoverRadius:4,pointHoverBackgroundColor:`#00d4aa`}]},options:h()})}function _(e){let{labels:t,data:n}=a(e),r=document.getElementById(`chart-vix`);if(!r)return;let i=r.getContext(`2d`);m.vix&&=(m.vix.destroy(),null);let o=i.createLinearGradient(0,0,0,180);o.addColorStop(0,`rgba(244,63,94,0.15)`),o.addColorStop(1,`rgba(244,63,94,0)`),m.vix=new Chart(i,{type:`line`,data:{labels:t,datasets:[{data:n,borderColor:`#f43f5e`,borderWidth:1.5,backgroundColor:o,fill:!0,tension:.3,pointRadius:0,pointHoverRadius:4,pointHoverBackgroundColor:`#f43f5e`}]},options:h()})}function v(e,t,n){e.closest(`.chart-tabs`).querySelectorAll(`.chart-tab`).forEach(e=>e.classList.remove(`active`)),e.classList.add(`active`),t===`sp`&&g(n),t===`vix`&&_(n)}var y=!1;function b(){let e=document.getElementById(`chart-grid`);y||=(e.innerHTML=`
  <div class="chart-card fade-in">
    <div class="chart-card-head">
      <div>
        <div class="chart-card-title">S&P 500 추이</div>
        <div class="chart-card-sub">^GSPC · 상대지수(기준=100)</div>
      </div>
      <div class="chart-tabs">
        <button class="chart-tab active" onclick="switchTab(this,'sp',30)">1M</button>
        <button class="chart-tab" onclick="switchTab(this,'sp',90)">3M</button>
        <button class="chart-tab" onclick="switchTab(this,'sp',365)">1Y</button>
      </div>
    </div>
    <div class="chart-wrap"><canvas id="chart-sp"></canvas></div>
  </div>
  <div class="chart-card fade-in">
    <div class="chart-card-head">
      <div>
        <div class="chart-card-title">VIX 변동성 지수</div>
        <div class="chart-card-sub">CBOE · 20↑ 경계 · 30↑ 위험</div>
      </div>
      <div class="chart-tabs">
        <button class="chart-tab active" onclick="switchTab(this,'vix',30)">1M</button>
        <button class="chart-tab" onclick="switchTab(this,'vix',90)">3M</button>
        <button class="chart-tab" onclick="switchTab(this,'vix',365)">1Y</button>
      </div>
    </div>
    <div class="chart-wrap"><canvas id="chart-vix"></canvas></div>
  </div>`,!0),g(30),_(30)}var x={},S={market:9e4,prob:9e5,news:18e5};async function C(e){try{let i=await fetch(`/data/seed.json`);if(!i.ok)throw Error(`Fetch failed`);let a=await i.json(),o=null;try{let e=await fetch(`/api/dashboard`);e.ok&&(o=await e.json())}catch(e){console.error(`API error:`,e)}if((e===`market`||!e)&&(t=a.market||[],o)){let e=(e,n)=>{let r=t.findIndex(t=>t.label===e);r>-1?(t[r].value=n+`%`,t[r].change=`LIVE`,t[r].sub=`FRED 실시간`,t[r].raw=0):t.push({label:e,value:n+`%`,change:`LIVE`,raw:0,sub:`FRED 실시간`})};e(`미국 10Y`,o.us10y),e(`장단기금리차`,o.spread),e(`연준 기준금리`,o.fedfunds);let n=(e,n)=>{if(!n)return;let r=t.findIndex(t=>t.label===e);r>-1&&(t[r].value=n.price,t[r].change=n.change,t[r].raw=n.raw,t[r].sub.includes(`LIVE`)||(t[r].sub+=` · LIVE`))};o.market&&(n(`S&P 500`,o.market.sp500),n(`NASDAQ`,o.market.nasdaq),n(`VIX`,o.market.vix),n(`달러인덱스`,o.market.dxy),n(`달러/원`,o.market.krw),n(`WTI 원유`,o.market.wti),n(`금`,o.market.gold))}if((e===`prob`||!e)&&(n=a.probability||[],o&&o.polymarket)){let e=n.findIndex(e=>e.title.includes(`경기침체 진입`)||e.title.includes(`경기침체`));e>-1&&(n[e].yes=o.polymarket.recession.yes,n[e].no=o.polymarket.recession.no,n[e].src=`Polymarket · LIVE`);let t=n.findIndex(e=>e.title.includes(`금리 인하 횟수`)||e.title.includes(`기준금리 수준`)),r={type:`multi`,title:`연준 2026년 금리 인하 횟수`,outcomes:[{label:`0회 (동결)`,pct:o.polymarket.fed_cuts_2026.zero},{label:`1회 (25bp)`,pct:o.polymarket.fed_cuts_2026.one},{label:`2회 (50bp)`,pct:o.polymarket.fed_cuts_2026.two}],other:Math.max(0,100-(o.polymarket.fed_cuts_2026.zero+o.polymarket.fed_cuts_2026.one+o.polymarket.fed_cuts_2026.two)),src:`Polymarket · LIVE`};t>-1?n[t]=r:n.push(r)}(e===`news`||!e)&&(r=a.news||[])}catch(e){console.error(`Data fetch error:`,e)}}async function w(e){let t=Date.now();if(x[e]&&t-x[e]<S[e]){c(`ts-${e}`,new Date(x[e]),!0);return}let n=`btn-${e}`;s(n,!0);let r=e===`market`?10:6;u(`${e}-grid`,r);try{await C(e),x[e]=Date.now(),e===`market`&&d(),e===`prob`&&f(),e===`news`&&p(),c(`ts-${e}`,new Date(x[e]),!1)}finally{s(n,!1)}}async function T(){s(`btn-chart`,!0),await new Promise(e=>setTimeout(e,300)),b(),c(`ts-chart`,new Date,!1),s(`btn-chart`,!1)}async function E(){let e=document.getElementById(`btn-all`);e.classList.add(`spinning`,`loading`),[`market`,`prob`,`news`].forEach(e=>{s(`btn-${e}`,!0);let t=e===`market`?10:6;u(`${e}-grid`,t)}),x.market=x.prob=x.news=0,await Promise.all([C(`market`),C(`prob`),C(`news`)]);let t=Date.now();x.market=x.prob=x.news=t,d(),f(),p(),b();let n=new Date(t);[`market`,`prob`,`news`].forEach(e=>{c(`ts-${e}`,n,!1),s(`btn-${e}`,!1)}),c(`ts-chart`,n,!1),document.getElementById(`ts-val`).textContent=o(n),e.classList.remove(`spinning`,`loading`)}(async()=>{[`market`,`prob`,`news`].forEach(e=>{s(`btn-${e}`,!0),u(`${e}-grid`,e===`market`?10:6)}),s(`btn-chart`,!0),await Promise.all([C(`market`),C(`prob`),C(`news`)]);let e=Date.now();x.market=x.prob=x.news=e,d(),f(),p(),b();let t=new Date(e);[`market`,`prob`,`news`].forEach(e=>{c(`ts-${e}`,t,!1),s(`btn-${e}`,!1)}),c(`ts-chart`,t,!1),document.getElementById(`ts-val`).textContent=o(t)})(),window.reloadAll=E,window.reloadSection=w,window.reloadCharts=T,window.switchTab=v;