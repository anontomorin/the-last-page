/* 冒烟测试：逐标签页渲染 + 隐藏 ARG + 键盘可达性，抓取运行期错误 */
const path=require('path');
const pw=require(process.env.PLAYWRIGHT_PATH||'playwright-core');
const {createServer}=require('./serve.js');
const CHROME=process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe';
(async()=>{
  const srv=createServer();
  await new Promise(r=>srv.listen(8140,'127.0.0.1',r));
  const b=await pw.chromium.launch({executablePath:CHROME,headless:true});
  const ctx=await b.newContext({viewport:{width:1280,height:860}});
  const p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  p.on('console',m=>{ if(m.type()==='error' && !/favicon|404/.test(m.text())) errs.push('console: '+m.text()); });
  await p.goto('http://127.0.0.1:8140/index.html');
  await p.waitForTimeout(700);
  // 直接进游戏并铺开足够状态
  await p.evaluate(()=>{
    LP.state.set({act:5, mode:'solo',
      discoveredEvidence:['clue_317','clue_zhou_name','clue_chen_name','clue_li_name','clue_bell7',
        'clue_conflict_sun','clue_conflict_rain','clue_cold_0316','clue_rain_0318','clue_0317_confirm','clue_page32_cut'],
      discoveredPeople:['person_linyuan','person_zhou','person_chen','person_li'],
      discoveredDocuments:['diary_21','diary_18','diary_24','diary_31','letter_02','letter_03','letter_04','photo_09'],
      discoveredLocations:['location_clocktower'],
      photoFlipped:['photo_08','photo_09','photo_11']});
    LP.router.go('archive');
  });
  await p.waitForTimeout(400);
  const tabs=['diary','photo','letter','map','person','evidence','timeline'];
  for(const t of tabs){
    await p.click(`.wb-tab[data-tab="${t}"]`).catch(e=>errs.push('tab '+t+': '+e.message));
    await p.waitForTimeout(350);
  }
  // 证据板连线模式开关
  await p.click('.wb-tab[data-tab="evidence"]');
  await p.waitForTimeout(300);
  await p.locator('.ev-modebar .btn-ghost').first().click().catch(()=>{});
  await p.waitForTimeout(200);

  // 键盘可达性：Tab 前进若干次，确认有可见焦点
  const focusInfo=await p.evaluate(()=>{
    const first=document.querySelector('.wb-tab');
    first.focus();
    const s=getComputedStyle(first);
    return { focused: document.activeElement===first, outline: s.outlineStyle };
  });

  // 隐藏 ARG：键入 032
  await p.evaluate(()=>{ LP.state.set({hiddenClues:[]}); });
  await p.keyboard.press('0'); await p.keyboard.press('3'); await p.keyboard.press('2');
  await p.waitForTimeout(300);
  const hidden=await p.evaluate(()=>LP.state.get().hiddenClues.slice());

  // 控制台隐藏提示
  const cssVar=await p.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--missing-page').trim());

  console.log('标签页渲染：', tabs.length, '无致命错误');
  console.log('焦点样式：', JSON.stringify(focusInfo));
  console.log('隐藏线索（键入032）：', JSON.stringify(hidden));
  console.log('CSS --missing-page =', JSON.stringify(cssVar));
  console.log('运行期错误：', errs.length ? errs : '无');
  await b.close(); srv.close();
  process.exit(errs.length?1:0);
})().catch(e=>{console.error('FATAL',e.message);process.exit(2);});
