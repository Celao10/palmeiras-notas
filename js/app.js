    const SUPABASE_URL = "https://exkurcyjralifdgdmdjt.supabase.co";
    const SUPABASE_KEY = "sb_publishable_kP5nMFx8P0OmrV0gocZqEg_0ZXI56r1";
    const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    let FRIENDS = ["Celão", "Danão", "Bona", "Gabão", "Calango", "Benga", "Lele", "Gabo"];
    const INITIAL_MATCH = { opponent: "Botafogo", match_date: "2026-09-06", match_time: "2026-09-06T16:00:00", competition: "Brasileirão Série A" };
    const ELENCO_ATUAL = [
      { name: "Carlos Miguel", pos: "Goleiro" }, { name: "Marcelo Lomba", pos: "Goleiro" }, { name: "Gustavo Gómez", pos: "Zagueiro" }, { name: "Murilo", pos: "Zagueiro" },
      { name: "Alexander Barboza", pos: "Zagueiro" }, { name: "Bruno Fuchs", pos: "Zagueiro" }, { name: "Joaquín Piquerez", pos: "Lateral" }, { name: "Khellven", pos: "Lateral" },
      { name: "Agustín Giay", pos: "Lateral" }, { name: "Jefté", pos: "Lateral" }, { name: "Aníbal Moreno", pos: "Volante" }, { name: "Marlon Freitas", pos: "Volante" },
      { name: "Emiliano Martínez", pos: "Volante" }, { name: "Andreas Pereira", pos: "Meia" }, { name: "Mauricio", pos: "Meia" }, { name: "Lucas Evangelista", pos: "Meia" },
      { name: "Felipe Anderson", pos: "Meia/Atacante" }, { name: "Jhon Arias", pos: "Atacante" }, { name: "Paulinho", pos: "Atacante" }, { name: "Ramón Sosa", pos: "Atacante" },
      { name: "Vitor Roque", pos: "Atacante" }, { name: "Flaco López", pos: "Atacante" }, { name: "Abel Ferreira", pos: "Técnico" }
    ];
    // Lista-base da Seleção. Cada partida recebe uma cópia desta lista, então
    // futuras convocações não alteram avaliações que já foram feitas.
    const ELENCO_BRASIL = [
      { name: "Alisson", pos: "Goleiro" }, { name: "Ederson", pos: "Goleiro" }, { name: "Bento", pos: "Goleiro" },
      { name: "Danilo", pos: "Lateral" }, { name: "Vanderson", pos: "Lateral" }, { name: "Wesley", pos: "Lateral" }, { name: "Guilherme Arana", pos: "Lateral" }, { name: "Carlos Augusto", pos: "Lateral" },
      { name: "Marquinhos", pos: "Zagueiro" }, { name: "Éder Militão", pos: "Zagueiro" }, { name: "Gabriel Magalhães", pos: "Zagueiro" }, { name: "Bremer", pos: "Zagueiro" }, { name: "Murillo", pos: "Zagueiro" }, { name: "Beraldo", pos: "Zagueiro" },
      { name: "Casemiro", pos: "Volante" }, { name: "Bruno Guimarães", pos: "Meia" }, { name: "João Gomes", pos: "Volante" }, { name: "André", pos: "Volante" }, { name: "Lucas Paquetá", pos: "Meia" },
      { name: "Vinícius Júnior", pos: "Atacante" }, { name: "Rodrygo", pos: "Atacante" }, { name: "Raphinha", pos: "Atacante" }, { name: "Savinho", pos: "Atacante" }, { name: "Estêvão", pos: "Atacante" }, { name: "Endrick", pos: "Atacante" }, { name: "João Pedro", pos: "Atacante" }, { name: "Richarlison", pos: "Atacante" }
    ];

    let currentUser = localStorage.getItem('palmeiras_user') || null;
    let allMatches = [], currentMatchId = null, players = [], ratings = [], predictions = [];
    let currentCraque = null, currentBagre = null;
    let appMode = 'palmeiras';
    let appModeChannel = null;

    let termoChallenge = null, pistasChallenge = null, missing11Challenge = null, daysSinceStart = 1;
    const today = new Date();
    const todayDateStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');

    function cleanStr(str) { return (str || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
    function isFifaMode() { return appMode === 'data_fifa'; }
    function getTeamName() { return isFifaMode() ? 'Brasil' : 'Palmeiras'; }
    function getActiveRoster() { return isFifaMode() ? ELENCO_BRASIL : ELENCO_ATUAL; }
    function getScoreColor(val) {
      const s = Math.max(0, Math.min(10, parseFloat(val) || 0));
      return `hsl(${Math.round(s <= 5 ? (s/5)*50 : 50+((s-5)/5)*92)}, 85%, 50%)`;
    }
    function showToast(text, icon = "✅") {
      const toast = document.getElementById('toastMessage');
      document.getElementById('toastText').textContent = text; document.getElementById('toastIcon').textContent = icon;
      toast.classList.remove('translate-y-20', 'opacity-0'); setTimeout(() => toast.classList.add('translate-y-20', 'opacity-0'), 2500);
    }

    function showLoading(text = 'Carregando...') {
      document.getElementById('loadingText').textContent = text;
      const overlay = document.getElementById('loadingOverlay');
      overlay.classList.remove('hidden'); overlay.classList.add('flex');
    }

    function hideLoading() {
      const overlay = document.getElementById('loadingOverlay');
      overlay.classList.add('hidden'); overlay.classList.remove('flex');
    }

    function reportError(context, error, userMessage = 'Não foi possível concluir. Tente novamente.') {
      console.error(context, error);
      showToast(userMessage, '❌');
    }

    async function runButtonAction(button, loadingText, action) {
      const originalText = button.textContent;
      button.disabled = true; button.textContent = loadingText;
      try { return await action(); }
      finally { button.disabled = false; button.textContent = originalText; }
    }

    async function loadFriendsFromDB() {
      try {
        const { data, error } = await db.from('app_users').select('name').order('created_at', { ascending: true });
        if (error) throw error;
        if (data && data.length > 0) FRIENDS = data.map(u => u.name);
      } catch (e) { reportError('Falha ao carregar amigos', e, 'Não foi possível carregar os amigos.'); throw e; }
    }

    async function loadAppMode() {
      try {
        const { data, error } = await db.from('app_settings').select('active_mode').eq('id', true).maybeSingle();
        if (error) throw error;
        appMode = data?.active_mode === 'data_fifa' ? 'data_fifa' : 'palmeiras';
      } catch (error) {
        // Enquanto o SQL não tiver sido executado, o site continua no modo Palmeiras.
        console.warn('Configuração global ainda não instalada.', error);
        appMode = 'palmeiras';
      }
      applyModeUI();
    }

    function startAppModeSubscription() {
      if (appModeChannel) return;
      appModeChannel = db.channel('notas-do-verdao-event-mode')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'app_settings', filter: 'id=eq.true' }, async payload => {
          const nextMode = payload.new?.active_mode === 'data_fifa' ? 'data_fifa' : 'palmeiras';
          if (nextMode === appMode) return;
          appMode = nextMode; currentMatchId = null; applyModeUI();
          if (isFifaMode()) switchTab('rate');
          showLoading('Atualizando o evento...');
          try {
            await initApp();
            if (!isFifaMode()) { await loadDailyChallenge(); await loadMissing11Challenge(); await loadGameStates(); await loadDailyRankings(); }
            showToast(isFifaMode() ? '🇧🇷 Data FIFA ativada!' : '🐷 Voltamos ao Palmeiras!');
          } catch (error) { reportError('Erro ao receber modo global', error); }
          finally { hideLoading(); }
        }).subscribe();
    }

    function applyModeUI() {
      const fifa = isFifaMode(), team = getTeamName();
      document.body.classList.toggle('data-fifa', fifa);
      document.title = fifa ? 'Notas da Seleção' : 'Notas do Verdão';
      document.getElementById('appBrandIcon').textContent = fifa ? '🇧🇷' : '🐷';
      document.getElementById('appBrandTitle').textContent = fifa ? 'Notas da Seleção' : 'Notas do Verdão';
      document.getElementById('loginBrandIcon').textContent = fifa ? '🇧🇷' : '🐷';
      document.getElementById('loginBrandTitle').textContent = fifa ? 'Notas da Seleção' : 'Notas do Verdão';
      document.getElementById('loginBrandSubtitle').textContent = fifa ? 'Especial Data FIFA' : 'Painel da Torcida';
      document.getElementById('eventModeBadge').style.display = fifa ? 'block' : 'none';
      document.getElementById('tabJogos').style.display = fifa ? 'none' : 'inline-flex';
      document.getElementById('bolaoTeamName').textContent = team;
      document.getElementById('scoreModalTeamName').textContent = team;
      document.getElementById('newMatchModalTitle').textContent = fifa ? 'Cadastrar Jogo do Brasil 🇧🇷' : 'Cadastrar Próximo Jogo ⚽';
      document.getElementById('modalOpponent').placeholder = fifa ? 'Ex: Argentina, Japão...' : 'Ex: Corinthians, Flamengo...';
      document.getElementById('modalCompetition').placeholder = fifa ? 'Ex: Amistoso Internacional, Eliminatórias...' : 'Ex: Brasileirão, Allianz Parque...';
      document.getElementById('watermarkLogo').style.display = fifa ? 'none' : 'block';
      const modeButton = document.getElementById('btnFifaMode');
      if (modeButton) modeButton.textContent = fifa ? '🐷 Voltar Palmeiras' : '🇧🇷 Data FIFA';
    }

    async function toggleFifaMode() {
      if (!currentUser || cleanStr(currentUser) !== 'celao') return;
      const nextMode = isFifaMode() ? 'palmeiras' : 'data_fifa';
      const label = nextMode === 'data_fifa' ? 'ativar o modo Data FIFA para todos?' : 'voltar o site ao modo Palmeiras para todos?';
      if (!confirm(`Deseja ${label}`)) return;
      try {
        const { error } = await db.from('app_settings').update({ active_mode: nextMode, updated_at: new Date().toISOString() }).eq('id', true);
        if (error) throw error;
        appMode = nextMode; currentMatchId = null; applyModeUI();
        if (isFifaMode()) switchTab('rate');
        showLoading('Trocando o evento...');
        await initApp();
        if (!isFifaMode()) { await loadDailyChallenge(); await loadMissing11Challenge(); await loadGameStates(); await loadDailyRankings(); }
        showToast(isFifaMode() ? 'Modo Data FIFA ativado para todos!' : 'Modo Palmeiras restaurado para todos!');
      } catch (error) { reportError('Erro ao alternar modo', error, 'Não foi possível alterar o evento global.'); }
      finally { hideLoading(); }
    }

    async function handleLogin() {
      const btn = document.getElementById('btnLogin');
      const errEl = document.getElementById('loginError');
      try {
        btn.textContent = 'Carregando...'; errEl.style.display = 'none';
        await loadFriendsFromDB();
        const input = document.getElementById('loginInput').value;
        const match = FRIENDS.find(f => cleanStr(f) === cleanStr(input));
        if (match) {
          currentUser = match; localStorage.setItem('palmeiras_user', currentUser); await checkSession();
        } else {
          errEl.textContent = `Nome não autorizado. Use: ${FRIENDS.join(', ')}.`; errEl.style.display = 'block';
        }
      } catch (err) {
        console.error(err); errEl.textContent = 'Erro de conexão.'; errEl.style.display = 'block';
      } finally { btn.textContent = 'Entrar na Resenha'; }
    }
    document.getElementById('loginInput').addEventListener('keyup', e => { if (e.key === 'Enter') handleLogin(); });

    function logout() { localStorage.removeItem('palmeiras_user'); currentUser = null; document.getElementById('loginInput').value = ''; checkSession(); }

    async function checkSession() {
      try {
        await loadFriendsFromDB();
        const loginScreen = document.getElementById('loginScreen'), appScreen = document.getElementById('appScreen');
        if (currentUser) {
          loginScreen.style.display = 'none'; appScreen.style.display = 'block';
          document.getElementById('loggedUserDisplay').textContent = currentUser;
          document.getElementById('adminToggleContainer').style.display = (cleanStr(currentUser) === 'celao') ? 'flex' : 'none';
          toggleAdminMode();
          showLoading('Preparando a resenha...');
          await loadAppMode(); startAppModeSubscription(); await initApp();
          if (!isFifaMode()) { await loadDailyChallenge(); await loadMissing11Challenge(); await loadGameStates(); await loadDailyRankings(); }
          switchTab('rate');
        } else {
          loginScreen.style.display = 'flex'; appScreen.style.display = 'none';
        }
      } catch (e) { reportError('Falha ao iniciar sessão', e, 'Erro ao carregar o site. Confira sua conexão.'); }
      finally { hideLoading(); }
    }

    function toggleAdminMode() {
      const isCelao = currentUser && cleanStr(currentUser) === 'celao';
      document.getElementById('adminActionGroup').style.display = (isCelao && document.getElementById('adminSwitch').checked) ? 'flex' : 'none';
    }

    function openManageUsersModal() { document.getElementById('manageUsersModal').style.display = 'flex'; document.getElementById('modalUserName').value = ''; renderManageUsersList(); }
    function closeManageUsersModal() { document.getElementById('manageUsersModal').style.display = 'none'; }
    function renderManageUsersList() {
      const listDiv = document.getElementById('usersManageList'); listDiv.innerHTML = '';
      FRIENDS.forEach(friend => {
        const isCelao = cleanStr(friend) === 'celao';
        listDiv.innerHTML += `<div class="flex items-center justify-between p-2 hover:bg-emerald-950/40 rounded-xl transition"><div class="flex items-center gap-2"><span class="font-bold text-white text-sm">${friend}</span>${isCelao ? '<span class="text-[10px] bg-amber-500/20 text-amber-300 font-black px-1.5 py-0.5 rounded border border-amber-500/30">ADMIN</span>' : ''}</div>${isCelao ? '<span class="text-xs text-slate-500 italic">Protegido</span>' : `<button onclick="deleteUserSubmit('${friend}')" class="text-xs bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white font-bold px-2.5 py-1 rounded-lg border border-rose-500/30 transition">Remover</button>`}</div>`;
      });
    }
    async function createUserSubmit() {
      const nameInput = document.getElementById('modalUserName').value.trim();
      if (!nameInput) return alert('Digite o nome.'); if (FRIENDS.some(f => cleanStr(f) === cleanStr(nameInput))) return alert('Nome já cadastrado!');
      const btn = document.getElementById('btnCreateUser');
      try {
        await runButtonAction(btn, 'Salvando...', async () => {
          const { error } = await db.from('app_users').insert([{ name: nameInput }]);
          if (error) throw error;
          document.getElementById('modalUserName').value = ''; await loadFriendsFromDB(); renderManageUsersList(); await loadData();
        });
        showToast('Amigo adicionado!');
      } catch (error) { reportError('Erro ao criar usuário', error, 'Não foi possível adicionar o amigo.'); }
    }
    async function deleteUserSubmit(friendName) {
      if (cleanStr(friendName) === 'celao') return;
      if (!confirm(`Remover "${friendName}"?`)) return;
      try {
        const { error } = await db.from('app_users').delete().eq('name', friendName);
        if (error) throw error;
        await loadFriendsFromDB(); renderManageUsersList(); await loadData(); showToast('Amigo removido.');
      } catch (error) { reportError('Erro ao remover usuário', error, 'Não foi possível remover o amigo.'); }
    }

    async function initApp() {
      try {
        let { data: matches, error: matchesError } = await db.from('matches').select('*').eq('event_mode', appMode).order('match_date', { ascending: false });
        if (matchesError) throw matchesError;
        if (!matches || matches.length === 0) {
          if (isFifaMode()) {
            allMatches = []; currentMatchId = null; renderMatchSelect(); await loadData(); return;
          }
          const { data: newMatch, error: createError } = await db.from('matches').insert([INITIAL_MATCH]).select().single();
          if (createError) throw createError;
          allMatches = [newMatch]; currentMatchId = newMatch?.id;
          if(newMatch) {
            const { error: playersError } = await db.from('match_players').insert(ELENCO_ATUAL.map(p => ({ match_id: newMatch.id, player_name: p.name, position: p.pos })));
            if (playersError) throw playersError;
          }
        } else {
          allMatches = matches; if (!currentMatchId) currentMatchId = matches[0].id;
        }
        renderMatchSelect(); await loadData();
      } catch (err) { reportError('Erro ao iniciar aplicação', err, 'Não foi possível carregar as partidas.'); throw err; }
    }

    function renderMatchSelect() {
      const select = document.getElementById('matchSelect'); select.innerHTML = '';
      if (!allMatches.length) {
        select.innerHTML = `<option value="">Nenhum jogo do ${getTeamName()} cadastrado ainda</option>`;
        return;
      }
      allMatches.forEach(m => {
        const scoreStr = (m.home_score !== null && m.away_score !== null) ? ` [${m.home_score}x${m.away_score}]` : '';
        select.innerHTML += `<option value="${m.id}" ${m.id === currentMatchId ? 'selected' : ''}>${getTeamName()} vs ${m.opponent}${scoreStr} (${m.competition})</option>`;
      });
    }
    async function onSelectMatch() {
      const selectedId = document.getElementById('matchSelect').value;
      currentMatchId = allMatches.find(match => String(match.id) === selectedId)?.id ?? selectedId;
      showLoading('Trocando a partida...');
      try { await loadData(); } finally { hideLoading(); }
    }

    function openNewMatchModal() { document.getElementById('newMatchModal').style.display = 'flex'; }
    function closeNewMatchModal() { document.getElementById('newMatchModal').style.display = 'none'; }
    async function createMatchSubmit() {
      const opp = document.getElementById('modalOpponent').value.trim(), comp = document.getElementById('modalCompetition').value.trim(), mTime = document.getElementById('modalMatchTime').value;
      if (!opp || !mTime) return alert('Preencha adversário e data.');
      const btn = document.getElementById('btnCreateMatch');
      try {
        await runButtonAction(btn, 'Criando...', async () => {
          const { data: newMatch, error: matchError } = await db.from('matches').insert([{ opponent: opp, competition: comp || (isFifaMode() ? 'Data FIFA' : 'Brasileirão'), match_date: mTime.split('T')[0], match_time: new Date(mTime).toISOString(), event_mode: appMode }]).select().single();
          if (matchError) throw matchError;
          const { error: playersError } = await db.from('match_players').insert(getActiveRoster().map(p => ({ match_id: newMatch.id, player_name: p.name, position: p.pos })));
          if (playersError) throw playersError;
          currentMatchId = newMatch.id; closeNewMatchModal(); await initApp();
        });
        showToast('Jogo publicado!');
      } catch (error) { reportError('Erro ao criar partida', error, 'Não foi possível publicar o jogo.'); }
    }

    function openScoreModal() {
      const curMatch = allMatches.find(m => m.id === currentMatchId); if (!curMatch) return;
      document.getElementById('scoreModalTeamName').textContent = getTeamName(); document.getElementById('scoreModalOpponent').textContent = curMatch.opponent; document.getElementById('scorePalmeiras').value = curMatch.home_score !== null ? curMatch.home_score : ''; document.getElementById('scoreOpponent').value = curMatch.away_score !== null ? curMatch.away_score : '';
      document.getElementById('scoreModal').style.display = 'flex';
    }
    function closeScoreModal() { document.getElementById('scoreModal').style.display = 'none'; }
    async function saveFinalScore() {
      const h = document.getElementById('scorePalmeiras').value, a = document.getElementById('scoreOpponent').value;
      if (h === '' || a === '') return alert('Preencha os placares.');
      const btn = document.getElementById('btnSaveScore');
      try {
        if (btn) btn.disabled = true;
        const { error } = await db.from('matches').update({ home_score: parseInt(h), away_score: parseInt(a) }).eq('id', currentMatchId);
        if (error) throw error;
        closeScoreModal(); await initApp(); showToast('Placar atualizado!');
      } catch (error) { reportError('Erro ao salvar placar', error, 'Não foi possível salvar o placar.'); }
      finally { if (btn) btn.disabled = false; }
    }

    function getMatchTime(match) { return match ? (match.match_time ? new Date(match.match_time) : new Date(match.match_date + 'T23:59:59')) : null; }
    function isMatchStarted(match) { const t = getMatchTime(match); return t ? new Date() >= t : false; }
    function isMatchExpired(match) { const t = getMatchTime(match); return t ? new Date() > new Date(t.getTime() + (24 * 60 * 60 * 1000)) : false; }

    async function loadData() {
      try {
        if (!currentMatchId) { renderEmptyMatchState(); return; }
        const { data: pData, error: playersError } = await db.from('match_players').select('*').eq('match_id', currentMatchId);
        if (playersError) throw playersError;
        players = pData || [];

        const playerIds = players.map(player => player.id);
        if (playerIds.length) {
          const { data: rData, error: ratingsError } = await db.from('ratings').select('*').in('match_player_id', playerIds);
          if (ratingsError) throw ratingsError;
          ratings = rData || [];
        } else ratings = [];

        const scoredMatchIds = allMatches.filter(match => match.home_score !== null && match.away_score !== null).map(match => match.id);
        const neededPredictionIds = [...new Set([currentMatchId, ...scoredMatchIds])];
        const { data: predData, error: predictionsError } = await db.from('match_predictions').select('*').in('match_id', neededPredictionIds);
        if (predictionsError) throw predictionsError;
        predictions = predData || [];
        
        const curMatch = allMatches.find(m => m.id === currentMatchId);
        if (curMatch) {
          const timeStr = curMatch.match_time ? new Date(curMatch.match_time).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : curMatch.match_date;
          document.getElementById('bolaoMatchTitle').textContent = `${getTeamName()} vs ${curMatch.opponent} • ${timeStr}`; document.getElementById('bolaoOpponentName').textContent = curMatch.opponent;
        }
        renderRateList(); renderCompareTable(); renderBolao(); renderRanking();
      } catch (err) { reportError('Erro ao carregar dados da partida', err, 'Não foi possível atualizar os dados do jogo.'); }
    }

    function renderEmptyMatchState() {
      players = []; ratings = []; predictions = [];
      const adminHint = currentUser && cleanStr(currentUser) === 'celao' ? ' Ative o Admin e use “+ Jogo” para publicar o primeiro.' : '';
      document.getElementById('playersList').innerHTML = `<div class="col-span-2 bg-[#0a1811] border border-emerald-900/40 rounded-3xl p-8 text-center text-sm text-slate-400">Ainda não há jogo do ${getTeamName()} publicado.${adminHint}</div>`;
      document.getElementById('btnSave').style.display = 'none';
      document.getElementById('bolaoMatchTitle').textContent = `Aguardando próximo jogo do ${getTeamName()}`;
      document.getElementById('bolaoOpponentName').textContent = 'Adversário';
      document.getElementById('inputPredPalmeiras').disabled = true; document.getElementById('inputPredOpponent').disabled = true;
      document.getElementById('btnSavePrediction').style.display = 'none';
      document.getElementById('matchPredictionsList').innerHTML = '<div class="text-xs text-slate-500">Aguardando jogo.</div>';
      document.getElementById('bolaoRankingList').innerHTML = '<div class="text-xs text-slate-500">Aguardando jogos.</div>';
      document.getElementById('monthlyRankingList').innerHTML = '<div class="text-xs text-slate-500 py-3">Aguardando avaliações.</div>';
      document.getElementById('craqueName').textContent = '-'; document.getElementById('bagreName').textContent = '-';
    }

    function updateScoreDisplay(playerId, scoreVal) {
      const valEl = document.getElementById(`val-${playerId}`), rangeEl = document.getElementById(`range-${playerId}`), cardEl = document.getElementById(`player-card-${playerId}`);
      const num = Number(scoreVal).toFixed(1), color = getScoreColor(num);
      valEl.textContent = num; valEl.style.color = color;
      if (rangeEl) rangeEl.style.accentColor = color; if (cardEl) cardEl.style.borderColor = color.replace(')', ', 0.35)').replace('hsl', 'hsla');
    }

    function togglePlayedStatus(playerId) {
      const chk = document.getElementById(`chk-${playerId}`), range = document.getElementById(`range-${playerId}`), val = document.getElementById(`val-${playerId}`), cardEl = document.getElementById(`player-card-${playerId}`);
      if (chk.checked) { range.disabled = false; range.classList.remove('opacity-30', 'cursor-not-allowed'); updateScoreDisplay(playerId, range.value); } 
      else { range.disabled = true; range.classList.add('opacity-30', 'cursor-not-allowed'); val.textContent = 'S/N'; val.style.color = '#475569'; if (cardEl) cardEl.style.borderColor = 'rgba(6, 78, 59, 0.4)'; }
    }

    function renderRateList() {
      const curMatch = allMatches.find(m => m.id === currentMatchId), hasStarted = isMatchStarted(curMatch), isExpired = isMatchExpired(curMatch);
      if (!curMatch) return;
      const userRatings = ratings.filter(r => r.friend_name === currentUser && players.some(p => p.id === r.match_player_id)), hasVoted = userRatings.length > 0;
      const lockWarn = document.getElementById('rateLockWarning'), readOnlyInfo = document.getElementById('rateReadOnlyInfo'), content = document.getElementById('rateContent'), btnSave = document.getElementById('btnSave');
      
      lockWarn.style.display = 'none'; readOnlyInfo.style.display = 'none'; content.style.display = 'block'; btnSave.style.display = 'block';

      if (!hasStarted) {
        lockWarn.style.display = 'block'; lockWarn.className = 'bg-amber-500/10 border border-amber-500/30 rounded-3xl p-8 text-center space-y-3';
        document.getElementById('rateLockIcon').textContent = '⏳'; document.getElementById('rateLockTitle').textContent = 'Votação não liberada!'; document.getElementById('rateLockTitle').className = 'text-xl font-black text-amber-300';
        content.style.display = 'none'; const d = curMatch?.match_time ? new Date(curMatch.match_time) : null;
        document.getElementById('rateLockMessage').textContent = d ? `A bola rola dia ${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}.` : 'As notas só liberam após o apito inicial.'; return;
      }
      if (isExpired && !hasVoted) {
        lockWarn.style.display = 'block'; lockWarn.className = 'bg-rose-500/10 border border-rose-500/30 rounded-3xl p-8 text-center space-y-3';
        document.getElementById('rateLockIcon').textContent = '🔒'; document.getElementById('rateLockTitle').textContent = 'Prazo Encerrado!'; document.getElementById('rateLockTitle').className = 'text-xl font-black text-rose-400';
        document.getElementById('rateLockMessage').textContent = 'O prazo de 24h acabou.'; content.style.display = 'none'; return;
      }

      const isReadOnly = isExpired && hasVoted;
      if (isReadOnly) { readOnlyInfo.style.display = 'block'; btnSave.style.display = 'none'; }

      const list = document.getElementById('playersList'); list.innerHTML = '';
      const displayPlayers = isReadOnly ? players.filter(p => userRatings.some(r => r.match_player_id === p.id && Number(r.score) >= 0)) : players;
      if (displayPlayers.length === 0 && isReadOnly) { list.innerHTML = `<div class="col-span-2 text-center text-slate-400 py-8">Ninguém atuou.</div>`; return; }

      displayPlayers.forEach(p => {
        const existing = ratings.find(r => r.match_player_id === p.id && r.friend_name === currentUser), hasScore = existing && existing.score !== null && existing.score !== -1, currentScore = hasScore ? existing.score : '6.0', isPlayed = hasScore || !existing, color = getScoreColor(currentScore);
        list.innerHTML += `<div id="player-card-${p.id}" class="bg-[#0a1811] p-4 rounded-2xl border border-emerald-900/40 flex flex-col justify-between gap-3 shadow-sm" style="border-color: ${isPlayed ? color.replace(')', ', 0.35)').replace('hsl', 'hsla') : ''}"><div class="flex items-center justify-between"><div><span class="font-extrabold text-base text-white">${p.player_name}</span><span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 ml-2 bg-[#05110a] text-emerald-400 border border-emerald-900/60 rounded-md">${p.position}</span></div>${isReadOnly ? `<span class="text-[11px] font-black uppercase text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-lg border border-emerald-500/30">Jogou</span>` : `<label class="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-300 bg-[#05110a] px-2.5 py-1 rounded-xl border border-emerald-950"><input type="checkbox" id="chk-${p.id}" ${isPlayed ? 'checked' : ''} onchange="togglePlayedStatus('${p.id}')" class="accent-emerald-500 rounded"><span>Jogou</span></label>`}</div><div class="flex items-center justify-between gap-3 pt-2 border-t border-emerald-950">${isReadOnly ? `<span class="text-xs text-slate-400 font-medium">Sua Nota Registrada:</span><span class="text-2xl font-black" style="color: ${color};">${Number(currentScore).toFixed(1)}</span>` : `<input type="range" min="0" max="10" step="0.5" value="${currentScore}" id="range-${p.id}" class="w-full cursor-pointer h-2 bg-[#050e09] rounded-lg ${isPlayed ? '' : 'opacity-20 cursor-not-allowed'}" style="accent-color: ${isPlayed ? color : '#475569'};" ${isPlayed ? '' : 'disabled'} oninput="updateScoreDisplay('${p.id}', this.value)"><span id="val-${p.id}" class="text-xl font-black min-w-[2.8rem] text-right" style="color: ${isPlayed ? color : '#475569'};">${isPlayed ? Number(currentScore).toFixed(1) : 'S/N'}</span>`}</div></div>`;
      });
    }

    async function saveRatings() {
      const curMatch = allMatches.find(m => m.id === currentMatchId);
      if (!isMatchStarted(curMatch)) return alert('Partida não começou.'); if (isMatchExpired(curMatch)) return alert('Prazo expirado.');
      const btn = document.getElementById('btnSave');
      const updates = players.map(p => { const chk = document.getElementById(`chk-${p.id}`), input = document.getElementById(`range-${p.id}`); return { match_player_id: p.id, friend_name: currentUser, score: (chk ? chk.checked : true) ? parseFloat(input ? input.value : 6.0) : -1 }; });
      try {
        await runButtonAction(btn, 'Gravando...', async () => {
          const { error } = await db.from('ratings').upsert(updates, { onConflict: 'match_player_id,friend_name' });
          if (error) throw error;
          await loadData();
        });
        showToast('Notas salvas!');
      } catch (error) { reportError('Erro ao salvar notas', error, 'Não foi possível salvar as notas.'); }
    }

    function renderCompareTable() {
      const curMatch = allMatches.find(m => m.id === currentMatchId), isExpired = isMatchExpired(curMatch);
      const userHasVoted = players.some(p => ratings.some(r => r.match_player_id === p.id && r.friend_name === currentUser && Number(r.score) >= 0));
      const warning = document.getElementById('blindVoteWarning'), content = document.getElementById('compareContent');
      if (!userHasVoted && !isExpired) { warning.style.display = 'block'; content.style.display = 'none'; return; }
      warning.style.display = 'none'; content.style.display = 'block';

      const playerIds = players.map(p => p.id), voters = FRIENDS.filter(friend => ratings.some(r => playerIds.includes(r.match_player_id) && r.friend_name === friend && Number(r.score) >= 0));
      const headerRow = document.getElementById('compareTableHeader'); while (headerRow.children.length > 3) headerRow.removeChild(headerRow.lastChild);
      voters.forEach(v => { headerRow.innerHTML += `<th class="p-4 text-center font-black text-slate-300 min-w-[110px]">${v}</th>`; });

      const tbody = document.getElementById('compareTableBody'); tbody.innerHTML = '';
      if (voters.length === 0) { tbody.innerHTML = `<tr><td colspan="3" class="p-8 text-center text-slate-400">Ninguém avaliou ainda.</td></tr>`; return; }

      players.forEach(p => {
        const valid = ratings.filter(r => r.match_player_id === p.id && r.score !== null && Number(r.score) >= 0), avg = valid.length ? (valid.reduce((s, r) => s + Number(r.score), 0) / valid.length).toFixed(1) : '-';
        let cols = ''; voters.forEach(v => { const r = ratings.find(item => item.match_player_id === p.id && item.friend_name === v), has = r && Number(r.score) >= 0; cols += `<td class="p-4 text-center font-mono font-black text-lg" style="color: ${has ? getScoreColor(r.score) : '#64748b'};">${has ? Number(r.score).toFixed(1) : (r && Number(r.score) === -1 ? 'S/N' : '-')}</td>`; });
        tbody.innerHTML += `<tr><td class="p-4 font-bold text-white sticky left-0 bg-[#0a1811] z-10 border-r border-emerald-950">${p.player_name}</td><td class="p-4 text-emerald-400/80 text-xs font-semibold uppercase">${p.position}</td><td class="p-4 font-black text-lg" style="color: ${avg !== '-' ? getScoreColor(avg) : '#10b981'};">${avg}</td>${cols}</tr>`;
      });
    }

    async function savePrediction() {
      const curMatch = allMatches.find(m => m.id === currentMatchId); if (!curMatch) return alert('Ainda não há jogo publicado.'); if (isMatchStarted(curMatch)) return alert('Bolão encerrado!');
      const pGoals = document.getElementById('inputPredPalmeiras').value, oGoals = document.getElementById('inputPredOpponent').value;
      if (pGoals === '' || oGoals === '') return alert('Digite os gols.');
      const btn = document.getElementById('btnSavePrediction');
      try {
        await runButtonAction(btn, 'Salvando...', async () => {
          const { error } = await db.from('match_predictions').upsert({ match_id: currentMatchId, friend_name: currentUser, palmeiras_goals: parseInt(pGoals), opponent_goals: parseInt(oGoals) }, { onConflict: 'match_id,friend_name' });
          if (error) throw error;
          await loadData();
        });
        showToast('Palpite registrado!');
      } catch (error) { reportError('Erro ao salvar palpite', error, 'Não foi possível salvar o palpite.'); }
    }

    function renderBolao() {
      const curMatch = allMatches.find(m => m.id === currentMatchId), isLocked = isMatchStarted(curMatch);
      if (!curMatch) return;
      ['inputPredPalmeiras', 'inputPredOpponent'].forEach(id => { document.getElementById(id).disabled = isLocked; isLocked ? document.getElementById(id).classList.add('opacity-30') : document.getElementById(id).classList.remove('opacity-30'); });
      document.getElementById('btnSavePrediction').style.display = isLocked ? 'none' : 'block'; document.getElementById('bolaoLockText').style.display = isLocked ? 'block' : 'none';
      document.getElementById('bolaoLockBadge').textContent = isLocked ? '🔒 Fechado' : '🔓 Aberto'; document.getElementById('bolaoLockBadge').className = isLocked ? 'inline-flex items-center self-start shrink-0 whitespace-nowrap text-[11px] font-extrabold px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'inline-flex items-center self-start shrink-0 whitespace-nowrap text-[11px] font-extrabold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40';

      const myPred = predictions.find(p => p.match_id === currentMatchId && p.friend_name === currentUser);
      document.getElementById('inputPredPalmeiras').value = myPred ? myPred.palmeiras_goals : ''; document.getElementById('inputPredOpponent').value = myPred ? myPred.opponent_goals : '';

      const matchPreds = predictions.filter(p => p.match_id === currentMatchId), listDiv = document.getElementById('matchPredictionsList'); listDiv.innerHTML = '';
      if (matchPreds.length === 0) listDiv.innerHTML = `<div class="text-xs text-slate-500">Nenhum palpite.</div>`;
      else {
        matchPreds.forEach(p => {
          let ptsTag = '';
          if (curMatch && curMatch.home_score !== null) {
            const pts = (p.palmeiras_goals === curMatch.home_score && p.opponent_goals === curMatch.away_score) ? 2 : (Math.sign(p.palmeiras_goals - p.opponent_goals) === Math.sign(curMatch.home_score - curMatch.away_score) ? 1 : 0);
            ptsTag = `<span class="ml-2 px-2 py-0.5 rounded text-[11px] font-black ${pts===2?'bg-emerald-500 text-slate-950':(pts===1?'bg-amber-400 text-slate-950':'bg-slate-800 text-slate-400')}">+${pts} pts</span>`;
          }
          listDiv.innerHTML += `<div class="flex justify-between items-center py-2.5"><span class="font-bold text-white">${p.friend_name}</span><div class="flex items-center"><span class="font-mono bg-[#050e09] px-2.5 py-1 rounded-xl text-emerald-400 font-black border border-emerald-950">${p.palmeiras_goals} x ${p.opponent_goals}</span>${ptsTag}</div></div>`;
        });
      }

      const scores = {}; FRIENDS.forEach(f => scores[f] = 0);
      allMatches.forEach(m => { if (m.home_score !== null) { predictions.filter(p => p.match_id === m.id).forEach(pred => { scores[pred.friend_name] += (pred.palmeiras_goals === m.home_score && pred.opponent_goals === m.away_score) ? 2 : (Math.sign(pred.palmeiras_goals - pred.opponent_goals) === Math.sign(m.home_score - m.away_score) ? 1 : 0); }); } });
      document.getElementById('bolaoRankingList').innerHTML = Object.entries(scores).map(([n, p]) => ({n, p})).sort((a,b) => b.p - a.p).slice(0, 5).map((item, idx) => `<div class="flex justify-between items-center py-2.5"><div class="flex items-center gap-3"><span class="font-mono text-xs font-bold w-5 text-emerald-500">#${idx+1}</span><span class="font-bold text-white">${item.n}</span></div><span class="font-mono font-black text-amber-400">${item.p} pts</span></div>`).join('');
    }

    async function renderRanking() {
      const stats = players.map(p => { const pR = ratings.filter(r => r.match_player_id === p.id && r.score !== null && Number(r.score) >= 0); return { name: p.player_name, pos: p.position, avg: pR.length ? pR.reduce((a,b)=>a+Number(b.score),0)/pR.length : null, total: pR.length }; }).filter(i => i.avg !== null).sort((a, b) => b.avg - a.avg);
      if (stats.length > 0) { currentCraque = stats[0]; currentBagre = stats[stats.length - 1]; document.getElementById('craqueName').textContent = currentCraque.name; document.getElementById('craqueScore').textContent = `Média: ${currentCraque.avg.toFixed(1)} (${currentCraque.pos})`; document.getElementById('bagreName').textContent = currentBagre.name; document.getElementById('bagreScore').textContent = `Média: ${currentBagre.avg.toFixed(1)} (${currentBagre.pos})`; } 
      else { currentCraque = currentBagre = null; document.getElementById('craqueName').textContent = "-"; document.getElementById('craqueScore').textContent = "Média: -"; document.getElementById('bagreName').textContent = "-"; document.getElementById('bagreScore').textContent = "Média: -"; }
      document.getElementById('monthlyRankingList').innerHTML = stats.length ? stats.map((p, idx) => `<div class="flex justify-between items-center py-2.5"><div class="flex items-center gap-3"><span class="font-mono text-xs font-bold w-5 text-emerald-500">#${idx+1}</span><span class="font-bold text-white">${p.name}</span><span class="text-[11px] text-slate-500">${p.pos} • ${p.total} voto(s)</span></div><span class="font-mono font-black text-base" style="color: ${getScoreColor(p.avg)};">${p.avg.toFixed(1)}</span></div>`).join('') : '<div class="text-xs text-slate-500 py-3">Sem avaliações suficientes.</div>';
    }

    async function shareMatchSummary() {
      const curMatch = allMatches.find(m => m.id === currentMatchId); if (!curMatch || (!currentCraque && !currentBagre)) return alert("Ainda não há notas nesta partida!");
      const placar = (curMatch.home_score !== null && curMatch.away_score !== null) ? `${curMatch.home_score}x${curMatch.away_score}` : "A definir";
      const txt = `⚽ ${getTeamName()} ${placar} ${curMatch.opponent}\n🌟 Craque: ${currentCraque?`${currentCraque.name} (${currentCraque.avg.toFixed(1)})`:'-'}\n🐟 Bagre: ${currentBagre?`${currentBagre.name} (${currentBagre.avg.toFixed(1)})`:'-'}\n\nConfira em: ${window.location.origin}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(txt)}`, '_blank');
    }

    function switchTab(tab) {
      if (tab === 'jogos' && isFifaMode()) tab = 'rate';
      ['rate', 'compare', 'bolao', 'ranking', 'jogos'].forEach(t => {
        document.getElementById(`view${t.charAt(0).toUpperCase() + t.slice(1)}`).style.display = t === tab ? 'block' : 'none';
        const btn = document.getElementById(`tab${t.charAt(0).toUpperCase() + t.slice(1)}`);
        btn.className = t === tab ? "px-4 py-2.5 font-extrabold rounded-2xl bg-emerald-500 text-slate-950 text-xs uppercase tracking-wider shrink-0 shadow-md shadow-emerald-950" : "px-4 py-2.5 font-bold rounded-2xl bg-[#0c1c14] text-slate-400 hover:text-slate-200 text-xs uppercase tracking-wider shrink-0 border border-emerald-900/30";
        if (t === tab && window.matchMedia('(max-width: 767px)').matches) btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      });
    }

    function setGameMode(mode) {
      document.getElementById('gameTermoContainer').style.display = mode === 'termo' ? 'block' : 'none'; document.getElementById('gamePistasContainer').style.display = mode === 'pistas' ? 'block' : 'none'; document.getElementById('gameMissing11Container').style.display = mode === 'missing11' ? 'block' : 'none';
      document.getElementById('btnGameTermo').className = mode === 'termo' ? "px-5 py-2 text-[11px] md:text-xs font-black uppercase tracking-wider rounded-xl bg-emerald-600 text-white shadow-sm" : "px-5 py-2 text-[11px] md:text-xs font-bold uppercase tracking-wider rounded-xl text-slate-400 hover:text-slate-200";
      document.getElementById('btnGamePistas').className = mode === 'pistas' ? "px-5 py-2 text-[11px] md:text-xs font-black uppercase tracking-wider rounded-xl bg-emerald-600 text-white shadow-sm" : "px-5 py-2 text-[11px] md:text-xs font-bold uppercase tracking-wider rounded-xl text-slate-400 hover:text-slate-200";
      document.getElementById('btnGameMissing11').className = mode === 'missing11' ? "px-5 py-2 text-[11px] md:text-xs font-black uppercase tracking-wider rounded-xl bg-emerald-600 text-white shadow-sm" : "px-5 py-2 text-[11px] md:text-xs font-bold uppercase tracking-wider rounded-xl text-slate-400 hover:text-slate-200";
    }

    /* =========================================================================
       GAMES ENGINE
       ========================================================================= */
    async function loadDailyChallenge() {
      try {
        const { data, error } = await db.from('game_challenges').select('*').order('id', { ascending: true });
        if (error) throw error;
        if (data && data.length > 0) {
          const start = new Date("2026-09-01T00:00:00").getTime(), todayMs = new Date(todayDateStr + "T00:00:00").getTime();
          daysSinceStart = Math.max(0, Math.floor((todayMs - start) / 86400000));
          termoChallenge = data[daysSinceStart % data.length];
          pistasChallenge = data[(daysSinceStart + Math.floor(data.length / 2)) % data.length];
          document.getElementById('termoDayCount').textContent = daysSinceStart + 1; document.getElementById('pistasDayCount').textContent = daysSinceStart + 1;
        }
      } catch (err) { reportError('Erro ao carregar desafios', err, 'Não foi possível carregar os desafios do dia.'); }
    }

    async function loadMissing11Challenge() {
      try {
        const { data, error } = await db.from('missing11_challenges').select('*').eq('active', true).order('id', { ascending: true });
        if (error) throw error;
        if (!data?.length) return;
        missing11Challenge = data[daysSinceStart % data.length];
        document.getElementById('missing11DayCount').textContent = daysSinceStart + 1;
      } catch (error) {
        console.warn('Missing 11 ainda não configurado.', error);
      }
    }

    async function loadGameStates() {
      const { data, error } = await db.from('game_daily_results').select('*').eq('friend_name', currentUser).eq('play_date', todayDateStr);
      if (error) { reportError('Erro ao carregar jogos', error, 'Não foi possível carregar seu progresso diário.'); return; }
      if (termoChallenge) initTermo(data?.find(d => d.game_type === 'termo'));
      if (pistasChallenge) initPistas(data?.find(d => d.game_type === 'pistas'));
      initMissing11(data?.find(d => d.game_type === 'missing11'));
    }

    async function saveGameState(gameType, score, won, completed, stateJson) {
      const { error } = await db.from('game_daily_results').upsert({ friend_name: currentUser, game_type: gameType, play_date: todayDateStr, score: score, won: won, completed: completed, game_state: stateJson }, { onConflict: 'friend_name,game_type,play_date' });
      if (error) { reportError('Erro ao salvar jogo diário', error, 'Seu progresso não pôde ser salvo.'); return false; }
      if(completed) loadDailyRankings();
      return true;
    }

    // Termo
    let termoWord, termoLen, termoMaxGuesses = 6, termoGuesses = [], currentTermoGuess = "", termoGameOver = false;

    function initTermo(savedData) {
      termoWord = termoChallenge.termo_word.toUpperCase(); termoLen = termoWord.length;
      termoGuesses = savedData?.game_state?.guesses || []; termoGameOver = savedData?.completed || false; currentTermoGuess = "";
      const grid = document.getElementById('termoGrid'); grid.style.gridTemplateColumns = `repeat(${termoLen}, minmax(0, 1fr))`; grid.innerHTML = '';
      for (let i = 0; i < termoMaxGuesses * termoLen; i++) grid.innerHTML += `<div id="tile-${i}" class="w-10 h-10 md:w-14 md:h-14 border-2 border-emerald-900/60 bg-[#050e09] flex items-center justify-center text-xl md:text-2xl font-black text-white rounded-lg tile-flip shadow-inner"></div>`;
      renderKeyboard(); termoGuesses.forEach((g, idx) => applyGuessVisuals(g, idx * termoLen, true));
      if (termoGameOver) endTermo(savedData?.won, true);
    }

    function renderKeyboard() {
      const layout = [["Q","W","E","R","T","Y","U","I","O","P"], ["A","S","D","F","G","H","J","K","L"], ["ENTER","Z","X","C","V","B","N","M","⌫"]];
      const kb = document.getElementById('termoKeyboard'); kb.innerHTML = '';
      layout.forEach(row => {
        const rowDiv = document.createElement('div'); rowDiv.className = "flex justify-center gap-0.5 md:gap-1.5";
        row.forEach(key => {
          const btn = document.createElement('button'); btn.id = `key-${key}`; btn.textContent = key; btn.onclick = () => handleKeyClick(key);
          let baseClass = "h-10 md:h-12 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg transition text-[11px] md:text-sm shadow-md active:scale-95 flex items-center justify-center ";
          baseClass += (key === "ENTER" || key === "⌫") ? "px-2 md:px-4 uppercase tracking-wider w-auto min-w-[45px]" : "min-w-[28px] md:w-10 flex-1 max-w-[40px]";
          btn.className = baseClass; rowDiv.appendChild(btn);
        }); kb.appendChild(rowDiv);
      });
    }

    function handleKeyClick(key) {
      if (termoGameOver) return;
      if (key === "⌫") currentTermoGuess = currentTermoGuess.slice(0, -1); else if (key === "ENTER" && currentTermoGuess.length === termoLen) submitTermoGuess(); else if (key !== "ENTER" && currentTermoGuess.length < termoLen) currentTermoGuess += key;
      updateGridDisplay();
    }

    function updateGridDisplay() {
      const startIdx = termoGuesses.length * termoLen;
      for (let i = 0; i < termoLen; i++) {
        const tile = document.getElementById(`tile-${startIdx + i}`); tile.textContent = currentTermoGuess[i] || "";
        if (currentTermoGuess[i]) { tile.classList.add('border-emerald-600', 'tile-pop'); tile.classList.remove('border-emerald-900/60'); } else { tile.classList.remove('border-emerald-600', 'tile-pop'); tile.classList.add('border-emerald-900/60'); }
      }
    }

    async function submitTermoGuess() {
      const guess = currentTermoGuess; termoGuesses.push(guess); applyGuessVisuals(guess, (termoGuesses.length - 1) * termoLen, false); currentTermoGuess = "";
      const won = (guess === termoWord); termoGameOver = won || (termoGuesses.length === termoMaxGuesses);
      await saveGameState('termo', won ? termoGuesses.length : 0, won, termoGameOver, { guesses: termoGuesses });
      setTimeout(() => { if (termoGameOver) endTermo(won); }, termoLen * 150 + 200);
    }

    function applyGuessVisuals(guess, startIdx, instant) {
      let targetArr = termoWord.split(''), colors = Array(termoLen).fill('gray');
      for (let i = 0; i < termoLen; i++) { if (guess[i] === targetArr[i]) { colors[i] = 'green'; targetArr[i] = null; } }
      for (let i = 0; i < termoLen; i++) { if (colors[i] !== 'green' && targetArr.includes(guess[i])) { colors[i] = 'yellow'; targetArr[targetArr.indexOf(guess[i])] = null; } }
      for (let i = 0; i < termoLen; i++) {
        setTimeout(() => {
          const tile = document.getElementById(`tile-${startIdx + i}`), btn = document.getElementById(`key-${guess[i]}`); tile.textContent = guess[i]; tile.classList.remove('bg-[#050e09]', 'border-emerald-600', 'border-emerald-900/60');
          if (colors[i] === 'green') { tile.classList.add('bg-emerald-600', 'border-emerald-500'); if(btn) btn.className = btn.className.replace(/bg-slate-[87]00/g, 'bg-emerald-600'); } 
          else if (colors[i] === 'yellow') { tile.classList.add('bg-amber-500', 'border-amber-400'); if (btn && !btn.className.includes('bg-emerald-600')) btn.className = btn.className.replace(/bg-slate-[87]00/g, 'bg-amber-500'); } 
          else { tile.classList.add('bg-slate-800', 'border-slate-700', 'text-slate-400'); if (btn && !btn.className.includes('bg-emerald-600') && !btn.className.includes('bg-amber-500')) btn.className = btn.className.replace(/bg-slate-[87]00/g, 'bg-slate-900 text-slate-500'); }
        }, instant ? 0 : i * 150);
      }
    }

    function endTermo(won, instant = false) {
      document.getElementById('termoResult').style.display = 'block'; const title = document.getElementById('termoResultTitle');
      if (won) { title.innerHTML = `🐷 Sensacional!<br><span class="text-sm text-emerald-400 font-medium">Acertou em ${termoGuesses.length} tentativa(s).</span>`; if(!instant) showToast("Vitória Alviverde!", "🏆"); } 
      else { title.innerHTML = `😢 Fim de Jogo<br><span class="text-sm text-rose-400 font-medium">A palavra era ${termoWord}.</span>`; }
    }

    function shareTermoToWhatsApp() {
      let txt = `Termo do Verdão #${daysSinceStart + 1} - ${termoGameOver && termoGuesses[termoGuesses.length-1] === termoWord ? termoGuesses.length : 'X'}/${termoMaxGuesses}\n\n`;
      termoGuesses.forEach(g => {
        let tArr = termoWord.split(''), rowStr = Array(termoLen).fill('⬛');
        for (let i=0; i<termoLen; i++) { if (g[i] === tArr[i]) { rowStr[i] = '🟩'; tArr[i] = null; } }
        for (let i=0; i<termoLen; i++) { if (rowStr[i] !== '🟩' && tArr.includes(g[i])) { rowStr[i] = '🟨'; tArr[tArr.indexOf(g[i])] = null; } }
        txt += rowStr.join('') + '\n';
      }); txt += `\nJogue em: ${window.location.origin}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(txt)}`, '_blank');
    }

    // Pistas
    let pScore = 500, pClueIdx = 0, pGameOver = false, pPlayerName = "";
    
    function initPistas(savedData) {
      pPlayerName = pistasChallenge.player_name; pScore = savedData?.score ?? 500; pClueIdx = savedData?.game_state?.clueIndex ?? 0; pGameOver = savedData?.completed ?? false;
      document.getElementById('cluesContainer').innerHTML = ''; document.getElementById('currentPistasScore').textContent = `${pScore} pts`;
      const renderLimit = pClueIdx === 0 ? 1 : pClueIdx; pClueIdx = 0; 
      for(let i=0; i<renderLimit; i++) renderClueUI();
      if (pGameOver) endPistas(savedData?.won ?? false);
    }

    async function revealNextClue() {
      if (pGameOver || pClueIdx >= 5) return;
      renderClueUI(); await saveGameState('pistas', pScore, false, false, { clueIndex: pClueIdx });
    }

    function renderClueUI() {
      if(pClueIdx >= 5) return;
      const t = ["Pista 1: Carreira", "Pista 2: Perfil", "Pista 3: Títulos", "Pista 4: Período", "Pista 5: Curiosidade"], txt = [pistasChallenge.clue_career, pistasChallenge.clue_profile, pistasChallenge.clue_titles, pistasChallenge.clue_period, pistasChallenge.clue_trivia];
      const div = document.createElement('div'); div.className = "bg-[#05110a] p-4 rounded-2xl border border-emerald-900/60 shadow-sm animate-[popIn_0.3s_ease]";
      div.innerHTML = `<span class="text-[10px] uppercase font-black tracking-widest text-emerald-500 block mb-1">${t[pClueIdx]}</span><p class="text-sm font-bold text-slate-200 leading-snug">${txt[pClueIdx]}</p>`;
      document.getElementById('cluesContainer').appendChild(div); pClueIdx++; document.getElementById('currentPistasScore').textContent = `${pScore} pts`;
    }

    async function guessPista() {
      if (pGameOver) return;
      const inputEl = document.getElementById('inputPistaGuess'), guess = cleanStr(inputEl.value), ans = cleanStr(pPlayerName);
      if (!guess) return;
      
      if (guess === ans || ans.includes(guess)) {
        await saveGameState('pistas', pScore, true, true, { clueIndex: pClueIdx }); endPistas(true);
      } else {
        pScore -= 100; inputEl.value = ''; inputEl.classList.add('border-rose-500'); showToast("Errou! -100 pts", "🔴");
        setTimeout(() => inputEl.classList.remove('border-rose-500'), 1000);
        if (pScore <= 0) { 
          pScore = 0; 
          await saveGameState('pistas', 0, false, true, { clueIndex: pClueIdx }); 
          endPistas(false); 
        } else {
          revealNextClue();
        }
      }
    }

    function endPistas(won) {
      pGameOver = true; document.getElementById('pistasInputArea').style.display = 'none'; document.getElementById('pistasResult').style.display = 'block';
      if (won) { document.getElementById('pistasResultIcon').textContent = "🎉"; document.getElementById('pistasResultTitle').textContent = "Enciclopédia!"; document.getElementById('pistasResultDesc').innerHTML = `O jogador era <b>${pPlayerName}</b>.<br>Você cravou com ${pScore} pontos.`; } 
      else { document.getElementById('pistasResultIcon').textContent = "💀"; document.getElementById('pistasResultTitle').textContent = "Game Over!"; document.getElementById('pistasResultDesc').innerHTML = `Pontos zerados.<br>O jogador era <b>${pPlayerName}</b>.`; }
    }

    function sharePistasToWhatsApp() {
      const txt = `🕵️ Quem é o Jogador? #${daysSinceStart + 1}\n\nFiz ${pScore} pontos!\nAbri ${pClueIdx} dica(s).\n\nConsegue me bater? Jogue em: ${window.location.origin}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(txt)}`, '_blank');
    }

    // Missing 11
    let missing11Found = [], missing11Attempts = 0, missing11Complete = false;

    function initMissing11(savedData) {
      const grid = document.getElementById('missing11Grid');
      if (!missing11Challenge?.lineup?.length) {
        document.getElementById('missing11Title').textContent = 'Em breve';
        document.getElementById('missing11Hint').textContent = 'Rode o arquivo SQL para liberar as escalações históricas.';
        document.getElementById('missing11Competition').textContent = 'MISSING 11';
        document.getElementById('missing11InputArea').style.display = 'none';
        document.getElementById('missing11Result').style.display = 'none';
        grid.innerHTML = '<div class="sm:col-span-2 py-8 text-center text-sm text-slate-500">A base de desafios ainda não foi cadastrada.</div>';
        return;
      }

      const state = savedData?.game_state || {};
      missing11Found = Array.isArray(state.found) ? state.found : [];
      missing11Attempts = Number(state.attempts) || 0;
      missing11Complete = Boolean(savedData?.completed) || missing11Found.length === missing11Challenge.lineup.length;

      document.getElementById('missing11Competition').textContent = `${missing11Challenge.competition} • ${missing11Challenge.match_date.split('-').reverse().join('/')}`;
      document.getElementById('missing11Title').textContent = missing11Challenge.title;
      document.getElementById('missing11Hint').textContent = missing11Challenge.hint;
      document.getElementById('missing11InputArea').style.display = missing11Complete ? 'none' : 'flex';
      document.getElementById('missing11Result').style.display = missing11Complete ? 'block' : 'none';
      document.getElementById('inputMissing11Guess').value = '';
      renderMissing11();
      if (missing11Complete) document.getElementById('missing11ResultText').textContent = `Você completou a escalação em ${missing11Attempts} tentativa(s).`;
    }

    function renderMissing11() {
      if (!missing11Challenge?.lineup) return;
      const grid = document.getElementById('missing11Grid');
      grid.innerHTML = '';
      missing11Challenge.lineup.forEach((player, index) => {
        const found = missing11Found.includes(player.name);
        const card = document.createElement('div');
        card.className = `min-h-[74px] rounded-2xl border p-3 flex items-center gap-3 transition ${found ? 'bg-emerald-950/50 border-emerald-500/50' : 'bg-[#0a1811] border-emerald-900/40'}`;
        const badge = document.createElement('span');
        badge.className = `w-8 h-8 shrink-0 rounded-xl flex items-center justify-center text-xs font-black ${found ? 'bg-emerald-500 text-slate-950' : 'bg-[#05110a] text-emerald-500 border border-emerald-900/60'}`;
        badge.textContent = index + 1;
        const text = document.createElement('div');
        const pos = document.createElement('span'); pos.className = 'block text-[10px] font-black uppercase tracking-widest text-emerald-500'; pos.textContent = player.position;
        const name = document.createElement('span'); name.className = `block font-black text-sm ${found ? 'text-white' : 'text-slate-600'}`; name.textContent = found ? player.name : '???';
        text.append(pos, name); card.append(badge, text); grid.appendChild(card);
      });
      document.getElementById('missing11FoundCount').textContent = missing11Found.length;
      document.getElementById('missing11Status').textContent = missing11Complete ? 'Concluído' : `${missing11Attempts} tentativa(s)`;
      document.getElementById('missing11Status').className = missing11Complete ? 'text-emerald-400' : 'text-slate-400';
    }

    async function guessMissing11() {
      if (!missing11Challenge || missing11Complete) return;
      const input = document.getElementById('inputMissing11Guess');
      const guess = cleanStr(input.value);
      if (!guess) return;
      missing11Attempts++;
      const player = missing11Challenge.lineup.find(item => {
        const accepted = [item.name, ...(item.aliases || [])].map(cleanStr);
        return accepted.includes(guess);
      });
      input.value = '';

      if (!player) {
        input.classList.add('border-rose-500'); showToast('Esse jogador não está nessa escalação.', '❌');
        setTimeout(() => input.classList.remove('border-rose-500'), 900);
      } else if (missing11Found.includes(player.name)) {
        showToast(`${player.name} já foi encontrado.`, '👀');
      } else {
        missing11Found.push(player.name); showToast(`${player.name} encontrado!`, '✅');
      }

      missing11Complete = missing11Found.length === missing11Challenge.lineup.length;
      await saveGameState('missing11', missing11Complete ? Math.max(0, 100 - missing11Attempts) : 0, missing11Complete, missing11Complete, { found: missing11Found, attempts: missing11Attempts, challengeId: missing11Challenge.id });
      renderMissing11();
      if (missing11Complete) {
        document.getElementById('missing11InputArea').style.display = 'none';
        document.getElementById('missing11Result').style.display = 'block';
        document.getElementById('missing11ResultText').textContent = `Você completou a escalação em ${missing11Attempts} tentativa(s).`;
        showToast('Missing 11 completo!', '🏆');
      }
    }

    document.getElementById('inputMissing11Guess').addEventListener('keydown', event => {
      if (event.key === 'Enter') guessMissing11();
    });

    function shareMissing11ToWhatsApp() {
      const txt = `🟩 Missing 11 do Verdão #${daysSinceStart + 1}\n${missing11Challenge.title}\n\nCompletei a escalação em ${missing11Attempts} tentativa(s)! 🐷\n\nJogue em: ${window.location.origin}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(txt)}`, '_blank');
    }

    async function loadDailyRankings() {
      const { data, error } = await db.from('game_daily_results').select('*').eq('play_date', todayDateStr);
      if (error) { reportError('Erro ao carregar ranking diário', error, 'Não foi possível carregar o ranking do dia.'); return; }
      if(!data) return;
      const tData = data.filter(d => d.game_type === 'termo' && d.completed && d.won).sort((a,b) => a.score - b.score), pData = data.filter(d => d.game_type === 'pistas' && d.completed).sort((a,b) => b.score - a.score);
      const missing11Data = data.filter(d => d.game_type === 'missing11' && d.completed).sort((a, b) => (a.game_state?.attempts ?? Infinity) - (b.game_state?.attempts ?? Infinity));
      document.getElementById('rankingTermoList').innerHTML = tData.length ? tData.slice(0,5).map((d, i) => `<div class="flex justify-between items-center py-2"><div class="flex items-center gap-2"><span class="text-xs font-black text-emerald-500 w-3">${i+1}</span><span class="font-bold text-white text-xs">${d.friend_name}</span></div><span class="text-xs font-black text-emerald-400">${d.score}/6</span></div>`).join('') : '<div class="text-xs text-slate-500 text-center py-2">Ninguém finalizou.</div>';
      document.getElementById('rankingPistasList').innerHTML = pData.length ? pData.slice(0,5).map((d, i) => `<div class="flex justify-between items-center py-2"><div class="flex items-center gap-2"><span class="text-xs font-black text-emerald-500 w-3">${i+1}</span><span class="font-bold text-white text-xs">${d.friend_name}</span></div><span class="text-xs font-black text-amber-400">${d.score} pts</span></div>`).join('') : '<div class="text-xs text-slate-500 text-center py-2">Ninguém finalizou.</div>';
      document.getElementById('rankingMissing11List').innerHTML = missing11Data.length ? missing11Data.slice(0,5).map((d, i) => `<div class="flex justify-between items-center py-2"><div class="flex items-center gap-2"><span class="text-xs font-black text-emerald-500 w-3">${i+1}</span><span class="font-bold text-white text-xs">${d.friend_name}</span></div><span class="text-xs font-black text-emerald-400">${d.game_state?.attempts ?? '-'} tent.</span></div>`).join('') : '<div class="text-xs text-slate-500 text-center py-2">Ninguém finalizou.</div>';
    }

    const modalCloseActions = {
      newMatchModal: closeNewMatchModal,
      scoreModal: closeScoreModal,
      manageUsersModal: closeManageUsersModal
    };

    Object.entries(modalCloseActions).forEach(([id, close]) => {
      const modal = document.getElementById(id);
      modal.addEventListener('click', event => { if (event.target === modal) close(); });
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        Object.entries(modalCloseActions).forEach(([id, close]) => {
          if (document.getElementById(id).style.display === 'flex') close();
        });
      }
    });

    checkSession();
