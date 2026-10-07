/**
 * 점심 약속 잡기 대화 엔진 (규칙 기반 · API 키 불필요)
 * 프로토타입(HTML)에서 쓰던 로직을 그대로 옮긴 것이며, 서버(NestJS)와 앱 양쪽에서 재사용할 수 있게 순수 함수로 유지한다.
 * 타입은 외부에 노출되는 부분(State, Reply)만 엄격하게 두고 내부는 느슨하게(any) 두었다.
 */
export interface Line{en:string;ko:string;expr:[string,string][];tag:string}
export interface DialogueState{[k:string]:any;sc:'plan'|'mia'|'me';lunch:boolean;time:string|null;timeLabel:string|null;place:any;day:string|null;pending:any;turns:number;done:boolean;confirming:boolean;evDone:string[];ev:any;refused:number;declined:boolean;softEnd?:boolean}
export interface Reply{line:Line;tags:string[];done?:boolean;event?:string;note?:string}
export type Level=0|1|2;

const PLACES:string[][]=[['cafeteria','the cafeteria','학생식당'],['dining hall','the dining hall','학생식당'],['student center','the student center','학생회관'],['coffee shop','the coffee shop','커피숍'],['cafe','the cafe','카페'],
  ['pizza','the pizza place','피자집'],['pasta','the pasta place','파스타집'],['burger','the burger place','햄버거집'],['sushi','the sushi place','초밥집'],['ramen','the ramen place','라멘집'],['noodle','the noodle place','국숫집'],
  ['korean','the Korean restaurant','한식당'],['bibimbap','the Korean restaurant','한식당'],['kimchi','the Korean restaurant','한식당'],['chinese','the Chinese restaurant','중식당'],['thai','the Thai restaurant','태국 음식점'],
  ['sandwich','the sandwich shop','샌드위치 가게'],['salad','the salad bar','샐러드 가게'],['food truck','the food truck','푸드트럭'],['restaurant','the restaurant','식당'],['library','the library cafe','도서관 카페'],['campus','the campus cafe','캠퍼스 카페']];
const rx=(s,r)=>r.test(s);
function parseTime(s){
  if(/\bnoon\b|\bmidday\b/.test(s))return{v:'12:00',label:'noon',ok:true};
  if(/\bafter (my )?class\b|\bright after\b/.test(s))return{v:'12:00',label:'right after class',ok:true};
  const w={one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12};
  let m=s.match(/\b(?:at|around|by|about|maybe|is|how about|make it|say|till|until)?\s*(1[0-2]|[1-9])(?:[:.]([0-5]\d))?\s*(a\.?m\.?|p\.?m\.?|o'?clock)?\b/);
  let h:any=null,mi=0,ap:any=null,explicit=false;
  if(m&&(m[2]||m[3]||/\b(at|around|by|about|noon|make it|say|time)\b/.test(s))){h=+m[1];mi=m[2]?+m[2]:0;ap=m[3]&&/^[ap]/.test(m[3])?m[3][0]:null;explicit=true}
  if(h==null){const m2=s.match(/\b(?:at|around|by|about)?\s*(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)(?:\s*(thirty|fifteen|forty[- ]five))?(?:\s*o'?clock)?\b/);
   if(m2&&(/\b(at|around|by|about|o'?clock)\b/.test(s)||m2[2])){h=w[m2[1]];mi=m2[2]?(m2[2]==='thirty'?30:m2[2]==='fifteen'?15:45):0;explicit=true}}
  if(/\bhalf past (\w+)/.test(s)){const mm=s.match(/half past (\w+)/)[1];h=w[mm]||+mm;mi=30;explicit=true}
  if(!explicit||h==null)return null;
  let h24:number=h;if(ap==='p'&&h<12)h24=h+12;else if(ap==='a'&&h===12)h24=0;else if(!ap){if(h<=2||h===12)h24=(h===12)?12:h+12;else if(h>=11)h24=h;else if(h<=10)h24=h<=7?h+12:h}
  const lab=(h%12||12)+(mi?':'+String(mi).padStart(2,'0'):'')+(h24>=12?(h24<12?'':' PM'):' AM');
  const label=(h24%12||12)+':'+String(mi).padStart(2,'0');const full=label+(h24>=12?' PM':' AM');
  return{v:String(h24).padStart(2,'0')+':'+String(mi).padStart(2,'0'),label:(mi?label:(h24%12||12)+'')+(h24>=12?' PM':' AM'),ok:h24>=11&&(h24<14||(h24===14&&mi===0)),h24,early:h24<11,late:h24>14}}
function findPlace(s){for(const p of PLACES)if(s.includes(p[0]))return{key:p[0],en:p[1],ko:p[2]};return null}
function intents(raw){
  const s=' '+raw.toLowerCase().replace(/[“”"]/g,'').replace(/’/g,"'")+' ';
  const I:any={};
  I.noProblem=/no problem|no worries|not a problem/.test(s);
  I.soft=/\b(i'd love to,? but|would love to,? but|love to but|unfortunately|afraid|i wish i could|no thanks|no thank you|i'll pass|i will pass|pass this time|can't make it|cannot make it)\b/.test(s);
  I.decline=!I.noProblem&&(/\b(no|nope|nah|can't|cannot|can not|busy|sorry|not today|not really|not free|rain check|i have to|i need to|i have (a |an )?(class|meeting|exam|test|plan|lab))\b/.test(s)&&!/\bno (plans?|problem)\b/.test(s)||I.soft);
  I.reason=/\b(because|since|have (a |an |some )?(class|classes|meeting|exam|test|lab|appointment|project|deadline|assignment|presentation|quiz|plans?)|busy|study|studying|homework|working|work|dentist|already (ate|eaten|had)|not hungry|on a diet|i have to|i need to)\b/.test(s)&&!/\b(no|any) plans?\b/.test(s);
  const WD={monday:'monday',tuesday:'tuesday',wednesday:'wednesday',thursday:'thursday',friday:'friday'};
  I.dayKey=/\btomorrow\b/.test(s)?'tomorrow':(Object.keys(WD).find(k=>s.includes(k))||null);
  I.alt=!!I.dayKey||/\b(next time|another (time|day)|some other time|later this week|next week|maybe later|rain check|this weekend)\b/.test(s);
  I.accept=!I.decline&&/\b(yes|yeah|yep|sure|ok|okay|sounds (good|great|nice|perfect|fine)|love to|i'd love|of course|why not|great|perfect|fine|that works|works for me|good idea|let's|lets|absolutely|definitely|alright|all right|i'm in|count me in|deal)\b/.test(s)||I.noProblem;
  I.free=/\b(no (special )?plans|nothing planned|(i'?m|i am) free|free today|nothing (special|much)|not yet|(don'?t|do not) have (any |anything )?(plans|planned)|haven'?t decided)\b/.test(s);
  I.lunch=/\b(lunch|eat|eating|grab|bite|hungry|food|meal|dine|dining)\b/.test(s);
  I.propose=/\b(do you want|would you like|want to|wanna|shall we|how about|why don't we|let's|lets|care to|are you free|are you hungry|join me)\b/.test(s)&&I.lunch;
  I.askPlace=/\b(where)\b/.test(s)||/\bwhat (kind|type) of food\b|\bwhat do you (want|like|feel like)\b/.test(s)||/\bwhat about you\b/.test(s)&&!I.lunch;
  I.askTime=/\b(when|what time|which time)\b/.test(s);
  I.askBack=/\b(what about you|how about you|and you|you\?)\b/.test(s);
  I.tomorrow=!!I.dayKey;I.today=/\btoday\b|\bnow\b/.test(s);
  I.greet=/\b(hi|hello|hey|good (morning|afternoon))\b/.test(s);
  I.thanks=/\b(thanks|thank you)\b/.test(s);
  I.time=parseTime(s.trim());I.place=findPlace(s);
  return I}
const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);
let LV=1;
const DK={tomorrow:['tomorrow','내일'],monday:['on Monday','월요일'],tuesday:['on Tuesday','화요일'],wednesday:['on Wednesday','수요일'],thursday:['on Thursday','목요일'],friday:['on Friday','금요일']};
const tko=t=>t==='noon'?'정오':t==='right after class'?'수업 직후':t;const dayEn=d=>d&&DK[d]?DK[d][0]:'';const dayKo=d=>d&&DK[d]?DK[d][1]:'오늘';
const L={
  open:()=>({en:"Hey! Class just finished. Do you have any plans for lunch?",ko:"안녕! 수업 방금 끝났네. 점심 계획 있어?",expr:[["Do you have any plans for ~?","~에 무슨 계획 있어요?"],["Class just finished.","수업이 막 끝났어요."]],tag:'open'}),
  askLunch:()=>({en:"Do you want to grab lunch together?",ko:"같이 점심 먹을래?",expr:[["grab lunch","점심을 간단히 먹다"],["Do you want to ~?","~할래요?"]],tag:'askLunch'}),
  freeResp:()=>({en:"Oh, nice! Then let's have lunch together. Want to?",ko:"오, 잘됐다! 그럼 같이 점심 먹자. 어때?",expr:[["Then let's ~","그럼 ~하자"],["Want to?","어때요? / 할래요?"]],tag:'freeResp'}),
  askTime:(sug)=>({en:`Great idea! What time works for you? Maybe ${sug}?`,ko:`좋은 생각이야! 몇 시가 괜찮아? ${sug}는 어때?`,expr:[["What time works for you?","몇 시가 편해요?"],["Maybe ~?","~는 어때요?"]],tag:'askTime'}),
  askTime2:(sug)=>({en:`What time should we meet? How about ${sug}?`,ko:`몇 시에 만날까? ${sug}는 어때?`,expr:[["What time should we meet?","몇 시에 만날까요?"],["How about ~?","~는 어때요?"]],tag:'askTime'}),
  askPlace:(p)=>({en:`Sounds good! Where should we eat? ${cap(p.en)} is close.`,ko:`좋아! 어디서 먹을까? ${p.ko}이 가까워.`,expr:[["Where should we eat?","어디서 먹을까요?"],["~ is close.","~이 가까워요."]],tag:'askPlace'}),
  placeGivenAskTime:(p,sug)=>({en:`${cap(p.en)}? Great choice! What time should we meet? Maybe ${sug}?`,ko:`${p.ko}? 좋은 선택이야! 몇 시에 만날까? ${sug}는 어때?`,expr:[["Great choice!","좋은 선택이에요!"],["What time should we meet?","몇 시에 만날까요?"]],tag:'placeGiven'}),
  timeGivenAskPlace:(t,p)=>({en:`${cap(t)} works for me! Where should we eat? ${cap(p.en)} is close.`,ko:`${t==='noon'?'정오':t==='right after class'?'수업 끝나고 바로':t} 좋아! 어디서 먹을까? ${p.ko}이 가까워.`,expr:[["~ works for me.","~가 저한테 좋아요."],["Where should we eat?","어디서 먹을까요?"]],tag:'timeGiven'}),
  tooLate:(t)=>({en:`Hmm, ${t} is a bit late for lunch. How about noon?`,ko:`음, ${t}는 점심으로는 좀 늦어. 정오는 어때?`,expr:[["a bit late for lunch","점심으로는 좀 늦은"],["How about noon?","정오는 어때요?"]],tag:'badTime'}),
  tooEarly:(t)=>({en:`Hmm, ${t} is a bit early for lunch. How about 12:30?`,ko:`음, ${t}는 점심으로는 좀 일러. 12시 반은 어때?`,expr:[["a bit early for lunch","점심으로는 좀 이른"],["How about 12:30?","12시 반은 어때요?"]],tag:'badTime'}),
  confirm:(day,t,p)=>({en:`So, lunch${day?' '+dayEn(day):''} at ${t} at ${p.en}. Does that sound good?`,ko:`그럼 ${day?dayKo(day)+' ':''}${t}에 ${p.ko}에서 점심이네. 괜찮아?`,expr:[["Does that sound good?","그거 괜찮아요?"],["So, ~","그러니까 ~"]],tag:'confirm'}),
  done:(p)=>({en:`Perfect! It's a lunch date, then. See you at ${p.en}!`,ko:`완벽해! 그럼 점심 약속 확정이야. ${p.ko}에서 보자!`,expr:[["It's a date, then.","그럼 약속이에요."],["See you at ~","~에서 봐요"]],tag:'done'}),
  decline1:()=>({en:"Oh, that's okay. Are you free tomorrow instead?",ko:"아, 괜찮아. 대신 내일은 시간 돼?",expr:[["That's okay.","괜찮아요."],["~ instead","대신 ~"]],tag:'decline'}),
  decline2:()=>({en:"No worries! How about a quick lunch? I'll even buy you a coffee.",ko:"걱정 마! 간단히 점심 어때? 커피는 내가 살게.",expr:[["a quick lunch","간단한 점심"],["I'll buy you ~","~를 사줄게요"]],tag:'decline'}),
  tomorrowAsk:(d)=>({en:`${cap(d&&d!=='tomorrow'?dayEn(d).replace('on ',''):'tomorrow')} works great for me! What time and where?`,ko:`나는 ${dayKo(d||'tomorrow')} 완전 좋아! 몇 시에 어디서 볼까?`,expr:[["works great for me","저한테 아주 좋아요"],["What time and where?","몇 시에 어디서요?"]],tag:'tomorrow'}),
  miaPlace:(p)=>({en:`How about ${p.en}? It's close and the food is great.`,ko:`${p.ko} 어때? 가깝고 음식도 맛있어.`,expr:[["How about ~?","~는 어때요?"],["the food is great","음식이 맛있어요"]],tag:'miaPlace'}),
  miaTime:(t)=>({en:`How about ${t}? My class ends at noon.`,ko:`${t}는 어때? 내 수업이 정오에 끝나.`,expr:[["How about ~?","~는 어때요?"],["My class ends at ~","제 수업은 ~에 끝나요"]],tag:'miaTime'}),
  unknown:(k)=>[{en:"Sorry, I didn't catch that. Are you free for lunch today?",ko:"미안, 잘 못 들었어. 오늘 점심 시간 돼?",expr:[["I didn't catch that.","잘 못 들었어요."],["Are you free for ~?","~할 시간 돼요?"]],tag:'unknown'},{en:"Hmm? Could you say that again? Maybe about lunch?",ko:"응? 다시 말해줄래? 점심 얘기였어?",expr:[["Could you say that again?","다시 말해줄래요?"]],tag:'unknown'}][k%2],

  stillBlocked:(k,x)=>k==='time'?({en:`Sorry, I really can't do ${x}. My professor, remember? Another time?`,ko:`미안, ${x}는 정말 안 돼. 교수님 말이야. 다른 시간은?`,expr:[["Another time?","다른 시간은요?"],["remember?","기억나죠?"]],tag:'miaNo'}):({en:`${cap(x.en)} is closed today, remember? Let's pick somewhere else.`,ko:`${x.ko}은 오늘 닫았다니까. 다른 데로 하자.`,expr:[["remember?","기억나죠?"],["somewhere else","다른 곳"]],tag:'miaNo'}),
  /* --- 시나리오: Mia가 거절 --- */
  miaOpen:()=>({en:"Hey! Class just finished. How's your day going?",ko:"안녕! 수업 방금 끝났어. 오늘 어때?",expr:[["How's your day going?","오늘 하루 어때요?"],["Class just finished.","수업이 막 끝났어요."]],tag:'open'}),
  miaNudge:()=>({en:"It's been a long morning. I'm a little hungry, actually. Any ideas?",ko:"오전이 길었네. 사실 좀 배고파. 좋은 생각 있어?",expr:[["I'm a little hungry.","좀 배고파요."],["Any ideas?","좋은 생각 있어요?"]],tag:'nudge'}),
  refuse1:()=>({en:"Oh, I'd love to, but I have a study group at noon today. Sorry!",ko:"아, 그러고 싶은데 오늘 정오에 스터디가 있어. 미안!",expr:[["I'd love to, but ~","그러고 싶지만 ~"],["I have a study group.","스터디가 있어요."]],tag:'miaNo'}),
  refuse2:()=>({en:"Hmm, tomorrow is tough too. I have a lab all day. What about Friday?",ko:"음, 내일도 힘들어. 하루 종일 실험이 있거든. 금요일은 어때?",expr:[["~ is tough too.","~도 어려워요."],["What about Friday?","금요일은 어때요?"]],tag:'miaNo'}),
  askAlt:()=>({en:"Thanks for understanding! Maybe another day? Do you have a day in mind?",ko:"이해해줘서 고마워! 다른 날은 어때? 생각해둔 날 있어?",expr:[["Thanks for understanding.","이해해줘서 고마워요."],["Do you have a day in mind?","생각해둔 날 있어요?"]],tag:'askAlt'}),
  stillBusy:()=>({en:"I really can't today. How about tomorrow instead?",ko:"오늘은 정말 안 돼. 대신 내일은 어때?",expr:[["I really can't today.","오늘은 정말 안 돼요."],["~ instead","대신 ~"]],tag:'miaNo'}),
  noPlace:(p)=>({en:`Hmm, I'm not a big fan of ${p.key==='ramen'?'ramen':'raw fish'}. Can we pick something else?`,ko:`음, 나는 ${p.key==='ramen'?'라멘':'날생선'}은 별로 안 좋아해. 다른 데로 하면 안 될까?`,expr:[["I'm not a big fan of ~","~을 별로 안 좋아해요"],["Can we pick something else?","다른 걸로 할까요?"]],tag:'miaNo'}),
  noTime:(t)=>({en:`Sorry, I have a lab at ${t}. Can we meet earlier, like noon?`,ko:`미안, ${t}에 실험이 있어. 정오처럼 좀 더 일찍 만나면 안 될까?`,expr:[["Sorry, I have ~ at ...","미안해요, ...에 ~가 있어요"],["Can we meet earlier?","더 일찍 만날 수 있어요?"]],tag:'miaNo'}),
  /* --- 시나리오: 내가 거절 --- */
  invite:()=>({en:"Hey! Class just finished. I'm starving! Do you want to grab lunch with me? I know a great pizza place.",ko:"안녕! 수업 방금 끝났어. 배고파 죽겠어! 나랑 점심 먹을래? 맛있는 피자집 알아.",expr:[["I'm starving!","배고파 죽겠어요!"],["Do you want to grab lunch with me?","저랑 점심 먹을래요?"]],tag:'open'}),
  askWhy:()=>({en:"Oh, really? Is something up? Do you have class or something?",ko:"어, 정말? 무슨 일 있어? 수업이라도 있어?",expr:[["Is something up?","무슨 일 있어요?"],["Do you have class or something?","수업 같은 게 있어요?"]],tag:'askWhy'}),
  push:()=>({en:"Are you sure? It's my treat! Just a quick bite?",ko:"정말? 내가 살게! 간단히만 먹으면 어때?",expr:[["Are you sure?","확실해요?"],["It's my treat.","제가 살게요."]],tag:'push'}),
  askAltLine:()=>({en:"Okay, I get it. Maybe another time, then? Are you free later this week?",ko:"알겠어, 이해해. 그럼 다음에 할까? 이번 주 중에 시간 돼?",expr:[["I get it.","이해해요."],["Are you free later this week?","이번 주 중에 시간 돼요?"]],tag:'askAlt'}),
  wait:()=>({en:"Yay! Let's go! ...Oh wait, I thought you might be busy. Are you sure you can come?",ko:"좋아! 가자! ...아 잠깐, 바쁠 줄 알았는데. 정말 갈 수 있어?",expr:[["Are you sure you can come?","정말 올 수 있어요?"],["I thought you might be ~","~일 줄 알았어요"]],tag:'wait'}),
  doneNo:()=>({en:"No problem at all! Thanks for letting me know. Let's go together next time!",ko:"괜찮아! 알려줘서 고마워. 다음엔 같이 가자!",expr:[["Thanks for letting me know.","알려줘서 고마워요."],["Let's go together next time.","다음엔 같이 가요."]],tag:'doneDecline'}),
  unknownMe:()=>({en:"Sorry, so... do you want to come to lunch with me?",ko:"미안, 그래서... 나랑 점심 같이 갈래?",expr:[["Do you want to come with me?","같이 갈래요?"]],tag:'unknown'}),
  thanks:()=>({en:"You're welcome! So, about lunch...",ko:"천만에! 그건 그렇고 점심 말인데...",expr:[["You're welcome.","천만에요."]],tag:'misc'}),
 };

function create(sc){return{sc:sc||'plan',lunch:false,time:null,timeLabel:null,place:null,day:null,pending:null,declines:0,unk:0,confirming:false,done:false,turns:0,achieved:{},
  evDone:[],ev:null,blockTime:null,blockPlace:null,stage:0,agreed:false,refused:0,declined:false,reason:false,alt:false,pushed:false,invited:false,lastNo:null,acc:0}}
const sugTime='12:30';
const needRefuse=()=>LV>=2?2:1;

 /* ---- 돌발상황 ---- */
let EVON=true;
const EVT={prof:'교수님 호출 · 시간 변경',closed:'식당 휴업 · 장소 변경',rain:'갑작스러운 비',friend:'친구 합류 제안',wallet:'지갑을 두고 옴'};
const evCount=()=>EVON?(LV>=2?2:1):0;
function pickEv(S){const pool=(LV===0?['rain','friend','wallet']:['prof','closed','rain','friend','wallet']).filter(x=>!S.evDone.includes(x));return pool[Math.floor(Math.random()*pool.length)]}
function evLine(t,S){const T=tko(S.timeLabel),P=S.place;
  if(t==='prof')return{en:`Oh no, my professor just texted me! He wants to see me at ${S.timeLabel}. Can we change the time?`,ko:`어머, 교수님이 방금 문자를 보내셨어! ${T}에 보자고 하셔. 시간을 바꿀 수 있을까?`,expr:[["Can we change the time?","시간을 바꿀 수 있을까요?"],["He wants to see me at ~","그분이 ~에 보자고 하세요"]],tag:'event'};
  if(t==='closed')return{en:`Wait, someone just told me ${P.en} is closed today! Can we go somewhere else?`,ko:`잠깐, 방금 들었는데 ${P.ko}이 오늘 문을 닫았대! 다른 데 가도 될까?`,expr:[["~ is closed today.","~은 오늘 문을 닫았어요."],["Can we go somewhere else?","다른 곳에 가도 될까요?"]],tag:'event'};
  if(t==='rain')return{en:"Look, it's starting to rain! Do you have an umbrella?",ko:"봐, 비가 오기 시작해! 우산 있어?",expr:[["It's starting to rain.","비가 오기 시작해요."],["Do you have an umbrella?","우산 있어요?"]],tag:'event'};
  if(t==='friend')return{en:"Oh, my friend Sam just walked up. Can he join us for lunch?",ko:"어, 내 친구 샘이 방금 왔어. 샘도 같이 점심 먹어도 될까?",expr:[["Can he join us?","그도 같이 가도 될까요?"],["walk up","다가오다"]],tag:'event'};
  return{en:"Oh no, I forgot my wallet in the classroom!",ko:"어떡해, 지갑을 교실에 두고 왔어!",expr:[["I forgot my wallet.","지갑을 깜빡했어요."],["in the classroom","교실에"]],tag:'event'}}
function startEv(S,tags){const t=pickEv(S);S.evDone.push(t);S.confirming=false;S.pending=null;
  const line=evLine(t,S);S.ev={type:t,reprocess:t==='prof'||t==='closed'};
  if(t==='prof'){S.blockTime=S.timeLabel;S.time=null;S.timeLabel=null;S.lastNo='time'}
  if(t==='closed'){S.blockPlace=S.place.key;S.place=null;S.lastNo='place'}
  return{line,tags,event:t}}
function reactEv(S,I,raw){const t=S.ev.type;S.ev=null;let r;const s=' '+raw.toLowerCase()+' ';
  if(t==='rain')r=(I.accept||/\bi do\b|\bhave\b/.test(s))&&!I.decline?{en:"Great, then we're all set!",ko:"좋아, 그럼 문제없네!",expr:[["we're all set","준비 다 됐어요"]]}:{en:"No worries, I have a big one. We can share!",ko:"걱정 마, 나한테 큰 우산 있어. 같이 쓰자!",expr:[["We can share.","같이 써요."],["No worries.","걱정 마요."]]};
  else if(t==='friend')r=I.decline&&!I.accept?{en:"No problem! I'll tell him maybe next time.",ko:"괜찮아! 샘한테는 다음에 같이 가자고 할게.",expr:[["maybe next time","다음에 (같이)"]]}:{en:"Great! He'll be so happy.",ko:"좋아! 샘이 엄청 좋아할 거야.",expr:[["He'll be so happy.","그가 아주 기뻐할 거예요."]]};
  else r=/\b(treat|pay|on me|buy|cover|my turn)\b/.test(s)?{en:"Really? You're the best! I'll pay next time.",ko:"정말? 최고야! 다음엔 내가 살게.",expr:[["You're the best!","최고예요!"],["I'll pay next time.","다음엔 제가 낼게요."]]}:{en:"Hmm, maybe I can run back and get it. Is that okay?",ko:"음, 얼른 가서 가져올 수 있을 거야. 괜찮을까?",expr:[["run back and get it","얼른 가서 가져오다"],["Is that okay?","괜찮을까요?"]]};
  S.confirming=true;const c=L.confirm(S.day,S.timeLabel,S.place);
  return{line:{en:r.en+' '+c.en,ko:r.ko+' '+c.ko,expr:r.expr.concat(c.expr),tag:'react'},tags:['react']}}
 /* ---- 난이도별 말투 변형 ---- */
function variant(out,S){
  const t=out.line.tag,l=out.line;
  if(LV===1)return out;
  const P=S.place,T=S.timeLabel;
  if(LV===0){
   if(t==='open'&&S.sc==='plan')out.line={en:"Hi! Class is over. Do you have plans for lunch?",ko:"안녕! 수업 끝났어. 점심 계획 있어?",expr:[["Do you have plans for ~?","~ 계획 있어요?"],["Class is over.","수업이 끝났어요."]],tag:'open'};
   if(t==='askTime')out.line={en:`What time? How about ${sugTime}?`,ko:`몇 시? ${sugTime} 어때?`,expr:[["What time?","몇 시요?"],["How about ~?","~는 어때요?"]],tag:'askTime'};
   if(t==='askPlace'||t==='timeGiven'){const p=S.pending&&S.pending.place||{en:'the cafeteria',ko:'학생식당'};out.line={en:`${t==='timeGiven'?cap(T)+' is good. ':''}Where do we eat? How about ${p.en}?`,ko:`${t==='timeGiven'?T+' 좋아! ':''}어디서 먹을까? ${p.ko} 어때?`,expr:[["Where do we eat?","어디서 먹어요?"],["How about ~?","~는 어때요?"]],tag:t}}
   if(t==='placeGiven'&&P)out.line={en:`${cap(P.en)}! Nice. What time? ${sugTime}?`,ko:`${P.ko}! 좋아. 몇 시? ${sugTime}?`,expr:[["Nice!","좋아요!"],["What time?","몇 시요?"]],tag:'placeGiven'};
   if(t==='confirm')out.line={en:`Lunch ${S.day?dayEn(S.day)+' ':''}at ${T}, at ${P.en}. OK?`,ko:`${S.day?dayKo(S.day)+' ':''}${T}, ${P.ko}에서 점심. 괜찮아?`,expr:[["OK?","괜찮아요?"],["Lunch at ~","~에 점심"]],tag:'confirm'};
   if(t==='done')out.line={en:`Great! See you at ${P.en}!`,ko:`좋아! ${P.ko}에서 봐!`,expr:[["See you at ~","~에서 봐요"],["Great!","좋아요!"]],tag:'done'};
   if(t==='open'&&S.sc==='me')out.line={en:"Hi! Class is over. Do you want to eat lunch with me?",ko:"안녕! 수업 끝났어. 나랑 점심 먹을래?",expr:[["Do you want to eat lunch with me?","저랑 점심 먹을래요?"],["Class is over.","수업이 끝났어요."]],tag:'open'};
   if(t==='askWhy')out.line={en:"Oh... why not? Do you have class?",ko:"아... 왜? 수업 있어?",expr:[["Why not?","왜 안 돼요?"],["Do you have class?","수업 있어요?"]],tag:'askWhy'};
  }else{
   if(t==='open'&&S.sc==='plan')out.line={en:"Hey, you made it out alive! That lecture ran long, huh? Got any plans for lunch, or are you winging it?",ko:"무사히 나왔네! 강의 길었지? 점심 계획 있어, 아니면 그냥 즉흥이야?",expr:[["Got any plans for ~?","~ 계획 있어요?"],["wing it","즉흥적으로 하다"]],tag:'open'};
   if(t==='open'&&S.sc==='me')out.line={en:"Hey! Finally out of class. I'm starving, so wanna grab lunch? I've been craving pizza all morning.",ko:"안녕! 드디어 수업 끝. 배고픈데 점심 같이 먹을래? 아침 내내 피자가 땡겼어.",expr:[["Wanna grab lunch?","점심 먹을래요?"],["I've been craving ~","~가 계속 땡겼어요"]],tag:'open'};
   if(t==='askTime'){S.pending=null;out.line={en:"I'm free right after class lets out at noon. When were you thinking?",ko:"정오에 수업 끝나면 바로 괜찮아. 언제쯤 생각해?",expr:[["When were you thinking?","언제쯤 생각해요?"],["lets out","(수업이) 끝나다"]],tag:'askTime'}}
   if(t==='askPlace'){S.pending=null;out.line={en:"Works for me. Any place in mind? I'm not picky.",ko:"좋아. 생각해둔 곳 있어? 난 가리는 거 없어.",expr:[["Any place in mind?","생각해둔 곳 있어요?"],["I'm not picky.","저는 가리는 것 없어요."]],tag:'askPlace'}}
   if(t==='timeGiven'){S.pending=null;out.line={en:`${cap(T)} works. Where do you wanna go?`,ko:`${T} 좋아. 어디 가고 싶어?`,expr:[["Where do you wanna go?","어디 가고 싶어요?"],["~ works.","~ 좋아요."]],tag:'timeGiven'}}
   if(t==='placeGiven'&&P){S.pending=null;out.line={en:`${cap(P.en)}, huh? I'm down. When should we head over?`,ko:`${P.ko}? 좋지. 언제 갈까?`,expr:[["I'm down.","좋아요."],["When should we head over?","언제 갈까요?"]],tag:'placeGiven'}}
   if(t==='confirm')out.line={en:`Alright, let me make sure I've got this right: lunch ${S.day?dayEn(S.day)+' ':''}at ${T}, ${P.en}. Does that work for you?`,ko:`좋아, 내가 맞게 이해했는지 확인할게. ${S.day?dayKo(S.day)+' ':''}${T}에 ${P.ko}에서 점심. 괜찮아?`,expr:[["let me make sure I've got this right","제가 제대로 이해했는지 확인할게요"],["Does that work for you?","괜찮아요?"]],tag:'confirm'};
   if(t==='done')out.line={en:`Awesome, it's a plan! Catch you at ${P.en}.`,ko:`좋아, 약속이야! ${P.ko}에서 보자.`,expr:[["It's a plan!","약속이에요!"],["Catch you at ~","~에서 봐요"]],tag:'done'};
   if(t==='askWhy')out.line={en:"Oh no, really? What's going on? Got something on your plate?",ko:"어, 정말? 무슨 일이야? 할 일이 있어?",expr:[["What's going on?","무슨 일이에요?"],["Got something on your plate?","할 일이 있어요?"]],tag:'askWhy'};
   if(t==='doneDecline')out.line={en:"Totally get it. No hard feelings! Let's catch up another time.",ko:"완전 이해해. 서운한 거 없어! 다음에 보자.",expr:[["Totally get it.","완전 이해해요."],["Let's catch up another time.","다음에 만나요."]],tag:'doneDecline'};
  }
  return out}
function reply(S,raw){const o=_reply(S,raw);return variant(o,S)}
function _reply(S,raw){
  S.turns++;const I=intents(raw);const tags:string[]=[];
  if(S.ev){if(S.ev.reprocess){S.ev=null;S.turns--;return _reply(S,raw)}return reactEv(S,I,raw)}
  if(S.sc==='me')return replyMe(S,I);
  /* --- Mia가 거절하는 시나리오: 아직 승낙 전 --- */
  if(S.sc==='mia'&&!S.agreed){
   if(S.stage===0){
    if(I.propose||(I.lunch&&!I.decline&&!I.askBack)||(I.askBack&&I.lunch)){S.invited=true;S.stage=1;S.refused=1;S.pending=null;return{line:L.refuse1(),tags:['propose']}}
    S.unk++;return{line:L.miaNudge(),tags:['greet']}}
   /* stage 1: 거절당한 뒤 */
   if(I.alt){
    if(S.refused<needRefuse()){S.refused++;S.pending={day:'friday'};return{line:L.refuse2(),tags:['alt']}}
    S.agreed=true;S.lunch=true;S.stage=2;S.day=I.dayKey||'tomorrow';S.alt=true;tags.push('alt')}
   else if(I.accept&&S.pending&&S.pending.day){S.agreed=true;S.lunch=true;S.stage=2;S.day=S.pending.day;S.pending=null;S.alt=true;tags.push('accept')}
   else if(I.decline||I.accept||I.noProblem||I.thanks){S.pending=null;return{line:L.askAlt(),tags:['understand']}}
   else if(I.propose||I.time||I.today){return{line:L.stillBusy(),tags:['propose'],pend:{day:'tomorrow'}}}
   else{S.unk++;return{line:L.askAlt(),tags:['unknown']}}
  }
  if(S.sc==='plan'&&LV>=1&&!S.lunch&&!S.confirming&&!S.refused&&!(S.pending&&S.pending.lunch)&&I.propose&&!I.decline){S.sc='mia';S.stage=1;S.invited=true;S.refused=1;S.pending=null;return{line:L.refuse1(),tags:['propose']}}
  /* 확인 단계 처리 */
  if(S.confirming){
   const changed=(I.time&&I.time.ok&&I.time.label!==S.timeLabel)||(I.place&&I.place.en!==S.place.en);
   if(!changed&&(I.accept||I.thanks)&&!I.decline&&S.evDone.length<evCount())return startEv(S,['accept']);
   if(!changed&&(I.accept||I.thanks)&&!I.decline){S.done=true;return{line:L.done(S.place),done:true,tags:['accept']}}
   if(I.decline&&!changed){S.confirming=false;S.pending=null;S.time=null;S.timeLabel=null;return{line:L.askTime2(sugTime),tags:['decline']}}
   S.confirming=false}
  /* 슬롯 갱신 */
  if(I.dayKey&&!(S.sc==='mia'&&S.agreed&&S.stage===2&&0)){S.day=I.dayKey}
  let badTime:any=null;
  if(I.time){
   if(I.time.ok){
    if(LV>=2&&I.time.h24>=13){S.refused++;S.lastNo='time';S.pending={time:{v:'12:00',label:'noon'}};return{line:L.noTime(I.time.label),tags:['time']}}
    if(S.blockTime&&I.time.label===S.blockTime){S.pending=null;return{line:L.stillBlocked('time',I.time.label),tags:['time']}}
    S.time=I.time.v;S.timeLabel=I.time.label;S.lunch=true;tags.push('time')}
   else badTime=I.time}
  if(I.place){
   if(LV>=1&&(I.place.key==='sushi'||(LV>=2&&I.place.key==='ramen'))){S.refused++;S.lastNo='place';S.place=null;S.lunch=true;S.pending=null;return{line:L.noPlace(I.place),tags:['place']}}
   if(S.blockPlace&&I.place.key===S.blockPlace){return{line:L.stillBlocked('place',I.place),tags:['place']}}
   S.place=I.place;S.lunch=true;tags.push('place')}
  if(I.propose&&!I.decline){S.lunch=true;tags.push('propose')}
  if(I.accept&&S.pending&&!(I.askPlace&&!S.place&&!I.place)&&!(I.askTime&&!S.time&&!I.time)){const p=S.pending;if(p.lunch||p.day){S.lunch=true;if(p.day)S.day=p.day}if(p.time){S.time=p.time.v;S.timeLabel=p.time.label}if(p.place)S.place=p.place;tags.push('accept');S.pending=null}
  else if(I.accept&&!S.pending&&!tags.length){if(S.turns<=2||!S.lunch){S.lunch=true}tags.push('accept')}
  if(I.decline&&!I.accept){tags.push('decline')}
  /* 응답 선택 */
  if(I.decline&&I.dayKey&&!I.accept){S.declined=true;S.reason=S.reason||I.reason;S.alt=true;S.lunch=true;S.pending=null}
  else if(I.decline&&!I.accept&&!I.time&&!I.place){S.declines++;S.declined=true;if(I.reason)S.reason=true;if(I.alt)S.alt=true;
   if(!S.reason&&!S.askedWhy){S.askedWhy=true;return{line:L.askWhy(),tags}}
   if(LV>=1&&!S.pushed){S.pushed=true;return{line:L.push(),tags}}
   if(!S.offeredDay){S.offeredDay=true;S.pending={day:'tomorrow'};return{line:L.decline1(),tags}}
   S.done=true;S.softEnd=true;return{line:L.doneNo(),done:true,tags}}
  if(badTime){S.pending={time:{v:badTime.late?'12:00':'12:30',label:badTime.late?'noon':'12:30 PM'}};return{line:badTime.late?L.tooLate(badTime.label):L.tooEarly(badTime.label),tags:['time']}}
  if(!S.lunch){
   if(I.free){S.pending={lunch:true};return{line:L.freeResp(),tags:['free']}}
   if(I.greet){S.pending={lunch:true};return{line:L.askLunch(),tags:['greet']}}
   if(I.thanks)return{line:L.thanks(),tags:['thanks']}
   S.unk++;S.pending={lunch:true};return{line:L.unknown(S.unk),tags:['unknown']}}
  if(I.askPlace&&!S.place){const p=PLACES.find(x=>x[0]==='pizza')!;const pl={key:'pizza',en:p[1],ko:p[2]};S.pending={place:pl};tags.push('ask');return{line:L.miaPlace(pl),tags}}
  if(I.askTime&&!S.time){S.pending={time:{v:'12:30',label:'12:30 PM'}};tags.push('ask');return{line:L.miaTime('12:30'),tags}}
  if(S.day&&I.dayKey&&!S.time&&!S.place&&!tags.includes('time')&&!tags.includes('place'))return{line:L.tomorrowAsk(S.day),tags:tags.length?tags:['tomorrow']}
  if(!S.time&&!S.place){S.pending={time:{v:'12:30',label:'12:30 PM'}};return{line:L.askTime(sugTime),tags}}
  if(S.time&&!S.place){const p={key:'cafeteria',en:'the cafeteria',ko:'학생식당'};S.pending={place:p};return{line:L.timeGivenAskPlace(S.timeLabel,p),tags}}
  if(!S.time&&S.place){S.pending={time:{v:'12:30',label:'12:30 PM'}};return{line:L.placeGivenAskTime(S.place,sugTime),tags}}
  if(S.evDone.length<evCount()&&S.evDone.length===0)return startEv(S,tags);
  S.confirming=true;S.pending=null;return{line:L.confirm(S.day,S.timeLabel,S.place),tags}}
 /* ---- 내가 거절하는 시나리오 ---- */
function replyMe(S,I){
  const tg:string[]=[];
  if(I.accept&&!I.decline){S.acc++;return{line:L.wait(),tags:['accept'],note:'이번 연습은 “정중하게 거절하기”예요. 거절하고 이유를 말해 보세요!'}}
  const gave=I.decline||I.reason||(I.alt&&(S.declined||S.stage>0));
  if(!gave&&!I.thanks){S.unk++;return{line:L.unknownMe(),tags:['unknown']}}
  if(I.decline||I.reason){S.declined=true;tg.push('decline')}
  if(I.reason){S.reason=true;tg.push('reason')}
  if(I.alt){S.alt=true;tg.push('alt')}
  if(!S.reason){S.stage=1;return{line:L.askWhy(),tags:tg.length?tg:['decline']}}
  if(LV>=1&&!S.pushed){S.pushed=true;S.stage=2;return{line:L.push(),tags:tg}}
  if(LV>=2&&!S.alt){S.stage=3;return{line:L.askAltLine(),tags:tg}}
  S.done=true;return{line:L.doneNo(),done:true,tags:tg}}
function setLevel(n){LV=n}function setEvents(b){EVON=b}
function open(sc){const l=sc==='mia'?L.miaOpen():sc==='me'?L.invite():L.open();return variant({line:l},{sc:sc||'plan'}).line}
function missions(S,summary){S.summary=!!summary;
  if(S.sc==='me'||S.softEnd)return[['① 정중히 거절',S.declined,'declined'],['② 이유 말하기',S.reason,'reason'],['③ 다음 제안',S.alt,'alt']];
  if(S.sc==='mia'&&S.summary)return[['① 점심 제안',S.invited,'invited'],['② 다른 날 제안',S.agreed,'agreed'],[S.time&&S.place?'③ '+tko(S.timeLabel)+'·'+S.place.ko:'③ 시간·장소',S.done||(S.time&&S.place),'slots']];
  return[['① 점심 약속',S.lunch,'lunch'],[S.time?'② '+tko(S.timeLabel):'② 시간',S.time,'time'],[S.place?'③ '+S.place.ko:'③ 장소',S.place,'place']]}

export const Dialogue={create:create as (sc?:string)=>DialogueState,reply:reply as (S:DialogueState,raw:string)=>Reply,intents,open:open as (sc?:string)=>Line,
  setLevel:setLevel as (n:Level)=>void,setEvents:setEvents as (b:boolean)=>void,EVT,missions,dayKo,dayEn,tko,PLACES};
export default Dialogue;
