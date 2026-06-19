let supabaseClient;
let currentGame=null, currentRole=null, currentPlayer=null, historyFilter='mine', selectedCharacter='Top Hat', selectedColour='#d81f34';
let realtimeChannel=null;
const BANK='BANK';
const $=id=>document.getElementById(id);
const configKey='rentRushBankConfig';
const sessionKey='rentRushBankSession';
const show=id=>document.querySelectorAll('main > section.card').forEach(s=>s.id===id?s.classList.remove('hidden'):s.classList.add('hidden'));
const toast=msg=>{const t=$('toast');t.textContent=msg;t.classList.remove('hidden');setTimeout(()=>t.classList.add('hidden'),3000)};
const money=n=>'$'+Number(n||0).toLocaleString();
const cleanCode=s=>(s||'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,12);
const tokenList=[['Top Hat','🎩'],['Race Car','🏎️'],['Dog','🐕'],['Cat','🐈'],['Ship','🚢'],['Boot','🥾'],['Thimble','🧵'],['Wheelbarrow','🛒'],['Iron','♨️'],['Cannon','💣']];
const colourList=[['Ruby Red','#d81f34'],['Ocean Blue','#1e6fb8'],['Sunset Gold','#f5a400'],['Royal Purple','#7d3cff'],['Railroad Orange','#f26b21'],['Hot Pink','#e83e8c'],['Midnight Black','#222222'],['Aqua Teal','#009b9b'],['Boardwalk Brown','#8b5a2b'],['Silver Token','#8d99ae']];
async function sha(text){const data=new TextEncoder().encode(text);const buf=await crypto.subtle.digest('SHA-256',data);return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('')}
function loadConfig(){try{return JSON.parse(localStorage.getItem(configKey)||'{}')}catch{return {}}}
function saveSession(extra){localStorage.setItem(sessionKey,JSON.stringify(extra))}
function clearSession(){localStorage.removeItem(sessionKey)}
function saveConfig(){const url=$('supabaseUrl').value.trim();const key=$('supabaseKey').value.trim();if(!url||!key)return toast('Paste Supabase URL and anon key');localStorage.setItem(configKey,JSON.stringify({url,key}));init();toast('Setup saved')}
function init(){const c=loadConfig();if(c.url&&c.key){supabaseClient=window.supabase.createClient(c.url,c.key);show('homeCard');tryResume()}else show('setupCard');renderIdentityChoices()}
function setActive(btns,el){btns.forEach(b=>b.classList.remove('active'));el.classList.add('active')}
async function fetchGame(code){const {data,error}=await supabaseClient.from('games').select('*').eq('code',code).single();if(error||!data){toast('Game not found');return null}return data}
async function loadPlayers(code){const {data,error}=await supabaseClient.from('players').select('*').eq('game_code',code).order('created_at');if(error){toast('Could not load players. Did you run the updated SQL?');return []}return data||[]}
async function createGame(){
 const code=cleanCode($('newGameCode').value);const bankerPin=$('newBankerPin').value;const starting=Number($('startingMoney').value||1500);
 if(!code||!bankerPin)return toast('Add game code and banker PIN');
 if(starting<1)return toast('Starting money must be more than 0');
 const {error:gErr}=await supabaseClient.from('games').insert({code,banker_pin_hash:await sha(code+':'+bankerPin),starting_money:starting});
 if(gErr)return toast('Game code already exists or database setup is missing');
 toast('Game created. Share code: '+code);$('gameCode').value=code;
}
async function openLogin(role){const code=cleanCode($('gameCode').value);if(!code)return toast('Enter game code');currentGame=await fetchGame(code);if(!currentGame)return;currentRole=role;$('loginTitle').textContent=role==='banker'?'Banker Login':'Player Login';$('bankerLoginPanel').classList.toggle('hidden',role!=='banker');$('playerLoginPanel').classList.toggle('hidden',role!=='player');if(role==='player'){await loadReturningPlayers();await refreshTakenColours();}show('loginCard')}
async function confirmBankerLogin(){const pin=$('bankerPinInput').value;if(!pin)return toast('Enter banker PIN');const hash=await sha(currentGame.code+':'+pin);if(hash!==currentGame.banker_pin_hash)return toast('Wrong banker PIN');saveSession({role:'banker',code:currentGame.code,pinHash:hash});await openBanker()}
async function loadReturningPlayers(){const players=await loadPlayers(currentGame.code);$('returningPlayerSelect').innerHTML=players.map(p=>`<option value="${p.id}">${escapeHtml(p.name)} ${p.character?'- '+escapeHtml(p.character):''}</option>`).join('')||'<option>No players joined yet</option>'}
function renderIdentityChoices(takenColours=[]){
 if(!$('characterChoices'))return;
 $('characterChoices').innerHTML=tokenList.map(([name,emoji])=>`<button class="character-choice ${name===selectedCharacter?'active':''}" data-character="${name}"><span class="emoji">${emoji}</span>${name}</button>`).join('');
 $('colourChoices').innerHTML=colourList.map(([name,hex])=>`<button class="colour-choice ${hex===selectedColour?'active':''} ${takenColours.includes(hex)?'taken':''}" data-colour="${hex}" style="background:${hex}">${name}</button>`).join('');
}
async function refreshTakenColours(){const players=await loadPlayers(currentGame.code);renderIdentityChoices(players.map(p=>p.color).filter(Boolean))}
async function joinGame(){
 const name=$('joinName').value.trim();const pin=$('joinPin').value; if(!name||!pin)return toast('Add your name and PIN');
 const players=await loadPlayers(currentGame.code); if(players.some(p=>p.name.toLowerCase()===name.toLowerCase()))return toast('Name already used. Choose another name or Return.');
 if(players.some(p=>(p.color||'').toLowerCase()===selectedColour.toLowerCase()))return toast('That colour is already taken. Pick another.');
 const pin_hash=await sha(currentGame.code+':'+pin);
 const {data,error}=await supabaseClient.from('players').insert({game_code:currentGame.code,name,pin_hash,balance:currentGame.starting_money,character:selectedCharacter,color:selectedColour}).select('*').single();
 if(error)return toast('Could not join. Run the updated SQL in Supabase.');
 currentPlayer=data;saveSession({role:'player',code:currentGame.code,playerId:data.id,pinHash:pin_hash});toast('Welcome, '+name);await openPlayer();
}
async function confirmPlayerLogin(){const pin=$('returningPin').value;const playerId=$('returningPlayerSelect').value;if(!pin||!playerId)return toast('Select player and enter PIN');const players=await loadPlayers(currentGame.code);const p=players.find(x=>String(x.id)===String(playerId));const hash=await sha(currentGame.code+':'+pin);if(!p||hash!==p.pin_hash)return toast('Wrong player or PIN');currentPlayer=p;saveSession({role:'player',code:currentGame.code,playerId:p.id,pinHash:hash});await openPlayer()}
async function tryResume(){try{const s=JSON.parse(localStorage.getItem(sessionKey)||'null');if(!s||!s.code)return;currentGame=await fetchGame(s.code);if(!currentGame)return; if(s.role==='banker'&&s.pinHash===currentGame.banker_pin_hash){currentRole='banker';await openBanker();toast('Banker session restored')} if(s.role==='player'){const players=await loadPlayers(s.code);const p=players.find(x=>String(x.id)===String(s.playerId));if(p&&p.pin_hash===s.pinHash){currentRole='player';currentPlayer=p;await openPlayer();toast('Player session restored')}}}catch{}}
async function openBanker(){show('bankerCard');$('bankerGameName').textContent=currentGame.code;await refreshBanker();subscribe()}
async function openPlayer(){show('playerCard');$('playerNameTitle').textContent=currentPlayer.name;$('playerGameCode').textContent=currentGame.code;await refreshPlayer();subscribe()}
function bankOption(){return '<option value="BANK">🏦 BANK</option>'}
function playerOption(p){return `<option value="${p.id}">${escapeHtml(p.name)} ${p.character?'('+escapeHtml(p.character)+')':''}</option>`}
async function refreshBanker(){const players=await loadPlayers(currentGame.code);const opts=[bankOption(),...players.map(playerOption)].join('');$('fromSelect').innerHTML=opts;$('toSelect').innerHTML=opts;$('bankerBalances').innerHTML=players.map(balanceCard).join('')||'<div class="history-item">No players yet. Share the game code so players can join.</div>';await renderHistory('banker',players)}
async function refreshPlayer(){const {data:p,error}=await supabaseClient.from('players').select('*').eq('id',currentPlayer.id).single();if(error||!p)return toast('Could not refresh player');currentPlayer=p;document.documentElement.style.setProperty('--player-color',p.color||'#d81f34');$('playerBalance').textContent=money(p.balance);$('playerProfile').innerHTML=`<div class="profile-token" style="background:${p.color||'#d81f34'}">${tokenEmoji(p.character)}</div><div><strong>${escapeHtml(p.name)}</strong><br><span>${escapeHtml(p.character||'Token')} • ${colourName(p.color)}</span></div>`;const players=await loadPlayers(currentGame.code);$('playerToSelect').innerHTML=[bankOption(),...players.filter(x=>x.id!==p.id).map(playerOption)].join('');$('playerList').innerHTML=players.map(x=>`<div class="mini-player"><span class="mini-dot" style="background:${x.color||'#00844b'}"></span><strong>${escapeHtml(x.name)}</strong><span>${tokenEmoji(x.character)} ${escapeHtml(x.character||'')}</span></div>`).join('');await renderHistory('player',players)}
function balanceCard(p){return `<div class="balance-card" style="--player-color:${p.color||'#00844b'}"><span>${tokenEmoji(p.character)} ${escapeHtml(p.name)}</span><small>${escapeHtml(p.character||'Player')} • ${colourName(p.color)}</small><strong>${money(p.balance)}</strong></div>`}
async function renderHistory(mode,players){const {data=[]}=await supabaseClient.from('transactions').select('*').eq('game_code',currentGame.code).order('created_at',{ascending:false}).limit(120);const map=Object.fromEntries(players.map(p=>[p.id,p]));const display=v=>v===BANK?'🏦 BANK':(map[v]?`${tokenEmoji(map[v].character)} ${escapeHtml(map[v].name)}`:'Player');let list=data;if(mode==='player'&&historyFilter==='mine')list=data.filter(t=>String(t.from_player_id)===String(currentPlayer.id)||String(t.to_player_id)===String(currentPlayer.id));const html=list.map(t=>`<div class="history-item"><div class="route">${display(t.from_player_id)} → ${display(t.to_player_id)}</div><strong>${money(t.amount)}</strong><div>${escapeHtml(t.note||'No note')}</div><small>${new Date(t.created_at).toLocaleString()}</small></div>`).join('')||'<div class="history-item">No transactions yet.</div>';$(mode==='player'?'playerHistory':'bankerHistory').innerHTML=html}
async function moveMoney(from,to,amount,note,allowBankFrom=false){
 if(!amount||amount<=0)return toast('Enter amount'); if(from===to)return toast('From and To cannot be same'); if(from===BANK&&!allowBankFrom)return toast('Only banker can pay from the bank');
 const players=await loadPlayers(currentGame.code);const byId=Object.fromEntries(players.map(p=>[p.id,p])); if(from!==BANK&&(!byId[from]||Number(byId[from].balance)<amount)){if(!confirm('This payment will make balance negative. Continue?'))return}
 for(const [id,delta] of [[from,-amount],[to,amount]]){if(id!==BANK){const p=byId[id];const {error}=await supabaseClient.from('players').update({balance:Number(p.balance)+delta}).eq('id',id);if(error)return toast('Payment failed')}}
 const {error}=await supabaseClient.from('transactions').insert({game_code:currentGame.code,from_player_id:String(from),to_player_id:String(to),amount,note});if(error)return toast('History failed');toast('Payment sent');return true;
}
async function sendBankerPayment(){const ok=await moveMoney($('fromSelect').value,$('toSelect').value,Number($('amountInput').value),$('noteInput').value.trim(),true);if(ok){$('amountInput').value='';$('noteInput').value='';await refreshBanker()}}
async function sendPlayerPayment(){const ok=await moveMoney(currentPlayer.id,$('playerToSelect').value,Number($('playerAmountInput').value),$('playerNoteInput').value.trim(),false);if(ok){$('playerAmountInput').value='';$('playerNoteInput').value='';await refreshPlayer()}}
function subscribe(){if(!currentGame)return;if(realtimeChannel)supabaseClient.removeChannel(realtimeChannel);realtimeChannel=supabaseClient.channel('game-'+currentGame.code).on('postgres_changes',{event:'*',schema:'public',table:'players',filter:`game_code=eq.${currentGame.code}`},()=> currentRole==='banker'?refreshBanker():refreshPlayer()).on('postgres_changes',{event:'*',schema:'public',table:'transactions',filter:`game_code=eq.${currentGame.code}`},()=> currentRole==='banker'?refreshBanker():refreshPlayer()).subscribe()}
async function resetGame(){if(currentRole!=='banker')return toast('Only banker can reset');if(!confirm('Reset balances and delete history for this game?'))return;const players=await loadPlayers(currentGame.code);for(const p of players){await supabaseClient.from('players').update({balance:currentGame.starting_money}).eq('id',p.id)}await supabaseClient.from('transactions').delete().eq('game_code',currentGame.code);toast('Game reset');await refreshBanker()}
function tokenEmoji(name){return (tokenList.find(t=>t[0]===name)||['','🎲'])[1]}
function colourName(hex){return (colourList.find(c=>(c[1]||'').toLowerCase()===(hex||'').toLowerCase())||['Custom'])[0]}
function escapeHtml(str){return String(str||'').replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]))}
function switchDeskTab(kind,tabId,button){document.querySelectorAll(kind==='banker'?'.desk-tab':'.player-tab').forEach(b=>b.classList.remove('active'));button.classList.add('active');const ids=kind==='banker'?['bankPayTab','bankPlayersTab','bankHistoryTab']:['playerPayTab','playerHistoryTab','playerInfoTab'];ids.forEach(id=>$(id).classList.toggle('hidden',id!==tabId))}
document.addEventListener('click',e=>{
 if(e.target.id==='saveConfigBtn')saveConfig();
 if(e.target.id==='changeConfigBtn'){localStorage.removeItem(configKey);show('setupCard')}
 if(e.target.id==='createGameBtn')createGame();
 if(e.target.id==='bankerLoginBtn')openLogin('banker');
 if(e.target.id==='playerLoginBtn')openLogin('player');
 if(e.target.id==='confirmBankerLoginBtn')confirmBankerLogin();
 if(e.target.id==='joinGameBtn')joinGame();
 if(e.target.id==='confirmPlayerLoginBtn')confirmPlayerLogin();
 if(e.target.id==='sendBankerPaymentBtn')sendBankerPayment();
 if(e.target.id==='sendPlayerPaymentBtn')sendPlayerPayment();
 if(e.target.id==='resetGameBtn')resetGame();
 if(e.target.classList.contains('backBtn'))show('homeCard');
 if(e.target.classList.contains('logoutBtn')){currentRole=null;currentPlayer=null;currentGame=null;clearSession();show('homeCard')}
 if(e.target.id==='showNewPlayerTab'){setActive([$('showNewPlayerTab'),$('showReturningPlayerTab')],e.target);$('newPlayerTab').classList.remove('hidden');$('returningPlayerTab').classList.add('hidden');refreshTakenColours()}
 if(e.target.id==='showReturningPlayerTab'){setActive([$('showNewPlayerTab'),$('showReturningPlayerTab')],e.target);$('newPlayerTab').classList.add('hidden');$('returningPlayerTab').classList.remove('hidden');loadReturningPlayers()}
 if(e.target.classList.contains('character-choice')){selectedCharacter=e.target.dataset.character;renderIdentityChoices([...document.querySelectorAll('.colour-choice.taken')].map(b=>b.dataset.colour))}
 if(e.target.classList.contains('colour-choice')&&!e.target.classList.contains('taken')){selectedColour=e.target.dataset.colour;renderIdentityChoices([...document.querySelectorAll('.colour-choice.taken')].map(b=>b.dataset.colour))}
 if(e.target.classList.contains('desk-tab'))switchDeskTab('banker',e.target.dataset.tab,e.target);
 if(e.target.classList.contains('player-tab'))switchDeskTab('player',e.target.dataset.tab,e.target);
 if(e.target.id==='filterMineBtn'){historyFilter='mine';setActive([$('filterMineBtn'),$('filterAllBtn')],e.target);refreshPlayer()}
 if(e.target.id==='filterAllBtn'){historyFilter='all';setActive([$('filterMineBtn'),$('filterAllBtn')],e.target);refreshPlayer()}
 if(e.target.dataset.action==='salary'){$('fromSelect').value=BANK;$('amountInput').value=200;$('noteInput').value='Passed GO salary'}
 if(e.target.dataset.action==='bankfee'){$('toSelect').value=BANK;$('noteInput').value='Bank payment / tax'}
 if(e.target.dataset.action==='bankpay'){$('fromSelect').value=BANK;$('noteInput').value='Bank pays player'}
});
init();
