/* ===== Menu cài đặt (nhiều tab) ===== */
(function () {
  'use strict';
  const G = window.G, st = G.settings, S = G.S, $ = id => document.getElementById(id);
  const M = (G.menu = { tab: 'conn' });

  const TABS = [['conn', '📡 Kết nối'], ['view', '📱 Màn hình TikTok'], ['match', '⚔️ Trận đấu'], ['gift', '🎁 Quà tặng'], ['fx', '🔊 Âm thanh & FX'], ['mc', '🎙️ NghiaMC & Điện ảnh'], ['rank', '🏆 Xếp hạng'], ['test', '🧪 Thử nghiệm']];

  const inp = (k, label, type, extra, hint) => {
    const v = st[k];
    if (type === 'check') return `<label class="f chk"><input type="checkbox" data-k="${k}" ${v ? 'checked' : ''}><span>${label}</span>${hint ? `<small>${hint}</small>` : ''}</label>`;
    if (type === 'range') return `<label class="f"><span>${label} <b data-o="${k}">${extra.fmt ? extra.fmt(v) : v}</b></span><input type="range" data-k="${k}" data-t="n" min="${extra.min}" max="${extra.max}" step="${extra.step || 1}" value="${v}">${hint ? `<small>${hint}</small>` : ''}</label>`;
    if (type === 'select') return `<label class="f"><span>${label}</span><select data-k="${k}" data-t="${extra.num ? 'n' : 's'}">${extra.opts.map(o => `<option value="${o[0]}" ${String(o[0]) === String(v) ? 'selected' : ''}>${o[1]}</option>`).join('')}</select>${hint ? `<small>${hint}</small>` : ''}</label>`;
    return `<label class="f"><span>${label}</span><input type="${type}" data-k="${k}" value="${G.esc(v)}" ${extra && extra.ph ? `placeholder="${extra.ph}"` : ''} autocomplete="off">${hint ? `<small>${hint}</small>` : ''}</label>`;
  };

  function tabConn() {
    return `<div class="card">
      <h3>Kết nối TikTok LIVE qua EulerStream</h3>
      ${inp('username', 'Tên TikTok đang LIVE (@username)', 'text', { ph: 'vd: tv_asahi_news (không cần @, có thể dán link)' })}
      ${inp('apiKey', 'Euler Stream API Key', 'password', { ph: 'dán API key (chỉ lưu trên trình duyệt này)' }, 'Lấy tại eulerstream.com. Key KHÔNG nằm trong code, không bị đẩy lên GitHub.')}
      ${inp('wsBase', 'WebSocket URL', 'text', {}, 'Mặc định wss://ws.eulerstream.com')}
      <small>Lưu ý: tài khoản phải đang LIVE thì Euler mới cho kết nối (lỗi 4404 = chưa LIVE hoặc sai tên). Game tự thử lại mỗi 15s.</small>
      ${inp('autoConnect', 'Tự kết nối khi mở trang', 'check')}
      <div class="row"><button class="btn pri" id="bConnect">Kết nối</button><button class="btn" id="bDisc">Ngắt</button><span id="connSt" class="pill"></span></div>
    </div>
    <div class="card">
      <h3>Chế độ Demo</h3>
      ${inp('demo', 'Bật người xem giả lập (để test, tự tắt khi kết nối thật)', 'check')}
    </div>
    <div class="card"><h3>Nhật ký sự kiện thô</h3><small>Dùng để kiểm tra định dạng dữ liệu Euler gửi về (chat / gift / like).</small><pre id="logBox"></pre></div>`;
  }
  function mapCards() {
    return G.MAPS.map(m => `<div class="mc ${st.mapId === m.id ? 'sel' : ''}" data-map="${m.id}"><canvas width="72" height="102" data-pv="${m.id}"></canvas><b>${m.name}</b><small>${m.desc}</small></div>`).join('');
  }
  function tabMatch() {
    return `<div class="card"><h3>Bản đồ</h3><div class="maps">${mapCards()}</div>${inp('rotateMaps', 'Tự đổi map sau mỗi trận', 'check')}</div>
    <div class="card"><h3>Luật trận</h3>
      ${inp('teamCount', 'Số đội', 'select', { num: 1, opts: [[2, '2 đội (Xanh – Đỏ)'], [3, '3 đội'], [4, '4 đội (Xanh – Đỏ – Xanh lá – Vàng)']] })}
      ${inp('matchSec', 'Thời gian trận (giây)', 'range', { min: 60, max: 600, step: 10, fmt: v => v + 's' })}
      ${inp('lobbySec', 'Thời gian chọn đội (giây)', 'range', { min: 5, max: 90, step: 5, fmt: v => v + 's' })}
      ${inp('resultSec', 'Hiện bảng vinh danh (giây)', 'range', { min: 8, max: 60, step: 1, fmt: v => v + 's' })}
      ${inp('autoLoop', 'Tự động chơi trận mới liên tục', 'check')}
      ${inp('baseHp', 'Máu căn cứ', 'range', { min: 500, max: 10000, step: 250 })}
      ${inp('speed', 'Tốc độ game', 'range', { min: 0.5, max: 2, step: 0.1, fmt: v => '×' + (+v).toFixed(1) })}
      ${inp('freeSoldierSec', 'Căn cứ tự sinh 1 lính mỗi … giây (0 = tắt)', 'range', { min: 0, max: 15, step: 1 }, 'Giữ trận sống động khi chưa có quà.')}
      ${inp('crates', 'Rương hỗ trợ xuất hiện giữa bản đồ', 'check')}
      <div class="row"><button class="btn pri" id="bApply">Áp dụng & bắt đầu trận mới</button></div>
    </div>`;
  }
  function ruleRows() {
    return st.rules.map((r, i) => `<div class="rule" data-i="${i}">
      <input type="number" min="1" value="${r.min}" data-r="min"><span>xu →</span>
      <select data-r="w">${Object.keys(G.WEAPONS).map(k => `<option value="${k}" ${k === r.w ? 'selected' : ''}>${G.WEAPONS[k].icon} ${G.WEAPONS[k].name}</option>`).join('')}</select>
      <span>×</span><input type="number" min="1" max="50" value="${r.n}" data-r="n"><button class="btn sm" data-del="${i}">✕</button></div>`).join('');
  }
  function tabGift() {
    return `<div class="card"><h3>Quà → vũ khí (theo số xu của 1 quà)</h3>
      <small>Lấy quy tắc có mốc xu lớn nhất mà ≤ số xu của quà. "×" là số lượng cho mỗi quà. Tặng nhiều quà liên tiếp (combo) sẽ ra thêm đơn vị.</small>
      <div id="rules">${ruleRows()}</div>
      <div class="row"><button class="btn" id="bAddRule">+ Thêm mốc</button><button class="btn" id="bResetRules">Về mặc định</button></div></div>
    <div class="card"><h3>Gán theo tên quà (tuỳ chọn)</h3>
      <small>Mỗi dòng: <code>Tên quà=vũ khí*số lượng</code>, ví dụ <code>Rose=soldier*3</code>. Vũ khí: ${Object.keys(G.WEAPONS).join(', ')}.</small>
      <textarea data-k="nameRules" data-t="s" rows="4" placeholder="Rose=soldier*3&#10;Lion=nuke*1">${G.esc(st.nameRules || '')}</textarea></div>
    <div class="card"><h3>Chạm màn hình (Like) & giới hạn</h3>
      ${inp('tapEnabled', 'Chạm màn hình (like) triệu hồi lính thường', 'check')}
      ${inp('autoTeam', 'Tap chưa có đội → tự vào đội ít người nhất (thả quà luôn tự chọn đội)', 'check')}
      ${inp('likesPerSoldier', 'Số like cho 1 lính', 'range', { min: 1, max: 20 })}
      ${inp('giftCap', 'Tối đa đơn vị / 1 lượt quà (dư sẽ dồn thành LEVEL)', 'range', { min: 3, max: 30 })}
      ${inp('maxUnits', 'Giới hạn lính mỗi đội (chống lag; quá sẽ nâng cấp lính cũ)', 'range', { min: 30, max: 250, step: 5 })}
      ${inp('lockTeamAfterGift', 'Khoá đội sau khi tặng quà (không đổi phe giữa trận)', 'check')}
    </div>`;
  }
  function tabFx() {
    return `<div class="card"><h3>Âm thanh</h3>
      ${inp('vol', 'Âm lượng tổng', 'range', { min: 0, max: 1, step: 0.05, fmt: v => Math.round(v * 100) + '%' })}
      ${inp('sfxVol', 'Hiệu ứng', 'range', { min: 0, max: 1, step: 0.05, fmt: v => Math.round(v * 100) + '%' })}
      ${inp('musicVol', 'Nhạc nền', 'range', { min: 0, max: 1, step: 0.05, fmt: v => Math.round(v * 100) + '%' })}
      ${inp('music', 'Bật nhạc nền', 'check')}
      <div class="row"><span id="audSt" class="pill"></span><button class="btn" id="bAudio">🔄 Khởi động lại âm thanh</button></div>
      <small>Âm thanh tự giám sát mỗi giây và tự bật lại nếu bị treo. Nếu điện thoại im hẳn, bấm nút trên (hoặc chạm màn hình 1 lần). iPhone: tắt công tắc im lặng bên hông máy.</small></div>
    <div class="card"><h3>Hình ảnh & hiệu năng</h3>
      ${inp('quality', 'Chất lượng', 'select', { opts: [['auto', 'Tự động (anti-lag)'], ['high', 'Cao'], ['mid', 'Vừa'], ['low', 'Thấp (máy yếu)']] }, 'Chế độ tự động sẽ giảm hiệu ứng khi FPS tụt và tăng lại khi ổn định.')}
      ${inp('shake', 'Rung màn hình khi nổ', 'check')}
      ${inp('dmgNumbers', 'Hiện số sát thương', 'check')}
      ${inp('entrance', 'Hiệu ứng vào game cho TOP 10 bảng xếp hạng', 'check')}
      <div class="pill" id="fpsBox">FPS …</div></div>`;
  }
  function tabMc() {
    const A = G.audio, ms = A.musicState;
    const msTxt = ms === 'ready' ? '🟢 Đã nạp nhac_game.mp3 (' + Math.round(A.buf.duration) + ' giây)' : ms === 'loading' ? '⏳ Đang nạp nhạc…' : ms === 'none' ? '⚪ Không thấy nhac_game.mp3 — dùng nhạc tổng hợp' : '…';
    const vs = (G.mc.voices.length ? G.mc.voices : G.mc.all.slice(0, 40)).map(v => [v.name, v.name + ' (' + v.lang + ')']);
    return `<div class="card"><h3>🎙️ NghiaMC dẫn chuyện</h3>
      <small>NghiaMC đọc đội, người vào đội, người gửi xu, vũ khí được triệu hồi và bình luận trận đấu theo tình huống thật. Dùng giọng đọc có sẵn của máy/trình duyệt (miễn phí); không có giọng thì vẫn dẫn bằng phụ đề. Có thể chọn nhiều giọng khác nhau và chỉnh cao độ để tạo sự đa dạng.</small>
      ${inp('mcOn', 'Bật NghiaMC', 'check')}
      ${inp('mcVoiceOn', 'Đọc thành tiếng (tắt = chỉ hiện phụ đề)', 'check')}
      ${inp('mcCaption', 'Hiện phụ đề NghiaMC trên màn hình', 'check')}
      ${inp('mcVoice', 'Giọng đọc', 'select', { opts: [['', 'Tự chọn giọng tiếng Việt tốt nhất']].concat(vs) })}
      ${inp('mcRate', 'Tốc độ đọc', 'range', { min: 0.7, max: 1.5, step: 0.02, fmt: v => '×' + (+v).toFixed(2) })}
      ${inp('mcPitch', 'Cao độ giọng', 'range', { min: 0.6, max: 1.6, step: 0.05, fmt: v => (+v).toFixed(2) })}
      ${inp('mcVol', 'Âm lượng NghiaMC', 'range', { min: 0, max: 1, step: 0.05, fmt: v => Math.round(v * 100) + '%' })}
      ${inp('mcFreq', 'Mức độ bình luận', 'select', { num: true, opts: [[1, 'Ít (thi thoảng mới nói)'], [2, 'Vừa'], [3, 'Nhiều (nói liên tục)']] })}
      ${inp('mcJoin', 'Đọc tên người vào đội', 'check')}
      ${inp('mcGift', 'Đọc người gửi xu', 'check')}
      ${inp('mcSummon', 'Đọc vũ khí / chiến binh được triệu hồi', 'check')}
      ${inp('mcCommentary', 'Bình luận trận đấu (đổi ngôi, căn cứ nguy kịch, giờ cuối…)', 'check')}
      <div class="row"><button class="btn" id="bMcTest">🎙️ Đọc thử</button><button class="btn" id="bMcStop">⏹ Dừng NghiaMC</button></div>
      <div class="pill" id="mcSt">${G.esc(G.mc.status())}</div>
      <small>Lần đầu cần chạm màn hình 1 lần để trình duyệt cho phép đọc. Giọng tiếng Việt: iPhone (Linh), Android (Google Tiếng Việt), Edge trên Windows (HoaiMy / NamMinh — tự nhiên nhất). Thử nhiều giọng + chỉnh pitch để có cảm giác nhiều người dẫn.</small></div>
    <div class="card"><h3>🎵 Nhạc</h3>
      ${inp('musicFile', 'Dùng nhạc từ file nhac_game.mp3 (tắt = nhạc tổng hợp)', 'check')}
      <div class="pill" id="musSt">${msTxt}</div>
      <small>Nhạc nền tự nhỏ lại khi MC nói. Hook, top ngày, Tele Zoom, quà 3D mỗi cảnh nhảy tới đoạn cao trào của bài rồi nhạc nền chạy tiếp.</small></div>
    <div class="card"><h3>🎬 Điện ảnh</h3>
      ${inp('dayTop', 'TOP NGÀY xuất hiện giữa màn hình (nhạc + tên + hiệu ứng riêng từng hạng)', 'check')}
      ${inp('fx3d', 'Quà từ mức xu bên dưới: hiệu ứng triệu hồi + camera 3D', 'check')}
      ${inp('fx3dMin', 'Mức xu tối thiểu cho hiệu ứng 3D', 'range', { min: 1, max: 500, step: 1, fmt: v => v + ' xu' })}
      ${inp('tele', 'Tele Zoom: camera zoom vào khu vực của đội', 'check')}
      ${inp('teleIntro', 'Zoom từng đội trước khi vào trận (kéo dài đếm ngược vài giây)', 'check')}
      ${inp('teleMin', 'Quà từ mức xu này sẽ Tele Zoom về đội của người tặng', 'range', { min: 30, max: 3000, step: 10, fmt: v => v + ' xu' })}
      ${inp('hookOn', 'Hook mở màn "bá khí" ở sảnh chọn đội', 'check')}
      ${inp('hookEvery', 'Chiếu hook mỗi … trận (1 = mọi trận)', 'range', { min: 1, max: 10, step: 1 })}
      <label class="f"><span>VIP: biểu tượng + câu nói riêng cho từng người (mỗi dòng: tên = 🦁 | câu nói)</span>
      <textarea data-k="vipRules" data-t="s" rows="3" placeholder="Hùng Dev = 🦁 | Vua của chiến trường">${G.esc(st.vipRules || '')}</textarea></label></div>
    <div class="card"><h3>▶ Xem thử</h3>
      <div class="row"><button class="btn" id="bHook">🎬 Hook mở màn</button></div>
      <div class="row">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(r => `<button class="btn" data-top="${r}">TOP ${r}</button>`).join('')}</div>
      <div class="row">${[['30', 'tank', 'Xe tăng'], ['99', 'cannon', 'Pháo'], ['500', 'fortress', 'Pháo đài'], ['1000', 'dragon', 'Rồng'], ['3000', 'nuke', 'Hạt nhân']].map(g => `<button class="btn" data-g3d="${g[0]}:${g[1]}">${g[0]} xu · ${g[2]}</button>`).join('')}</div>
      <div class="row">${[0, 1, 2, 3].slice(0, S.tc || 2).map(i => `<button class="btn" data-tele="${i}">🔭 Tele Zoom đội ${G.TEAMS[i].name}</button>`).join('')}</div>
      <small>Bấm xem thử khi đang ở tab này: bảng cài đặt tự thu nhỏ xuống dưới để bạn thấy hiệu ứng.</small></div>`;
  }
  function tabView() {
    return `<div class="card"><h3>📱 Vùng an toàn TikTok LIVE</h3>
      <small>TikTok che phần trên (tên host, số người xem) và phần dưới (khung chat, ô bình luận). Bật chế độ này để thanh điểm, bản đồ và bảng giá quà nằm gọn trong vùng không bị che.</small>
      ${inp('safeMode', 'Bật bố cục tránh khung chat TikTok', 'check')}
      ${inp('autoFullscreen', 'Tự bật toàn màn hình khi chạm lần đầu (ẩn thanh trạng thái điện thoại)', 'check')}
      <div class="row"><button class="btn" id="bFull">⛶ Toàn màn hình ngay</button></div>
      ${inp('fillArena', 'Lấp đầy hai bên (bản đồ tự đổi số hàng cho vừa khung, hết viền thừa)', 'check')}
      ${inp('safeTop', 'Chừa phía trên (px, theo màn 720×1280)', 'range', { min: 0, max: 300, step: 5, fmt: v => v + 'px' })}
      ${inp('safeBottom', 'Chừa phía dưới (khung chat + ô bình luận)', 'range', { min: 0, max: 520, step: 5, fmt: v => v + 'px' })}
      <div class="row"><button class="btn" data-preset="140:330">Mặc định</button><button class="btn" data-preset="110:250">Chừa ít</button><button class="btn" data-preset="170:420">Chừa nhiều</button><button class="btn" data-preset="0:0">Không chừa</button></div>
      <small>Mẹo: vùng đỏ sọc chỉ hiện khi đang mở tab này (đóng menu là tự ẩn, không lên hình LIVE). Mở live thử trên điện thoại rồi kéo thanh cho vùng đỏ trùm đúng khung chat của bạn.</small></div>
    <div class="card"><h3>Kích thước hiện tại</h3><div class="pill" id="layInfo"></div></div>`;
  }
  function tabRank() {
    const l = G.rankList().filter(e => e.id.indexOf('sim_') !== 0).slice(0, 20);
    return `<div class="card"><h3>Bảng xếp hạng tổng (xu đã tặng)</h3><div class="rk">${l.map((e, i) => `<div class="r"><em>${i + 1}</em>${G.avatar({ name: e.n, avatar: e.a }, 'xs')}<span>${G.esc(e.n)}</span><b>${G.fmt(e.c)} xu</b><small>🏆${e.w}</small></div>`).join('') || '<small>Chưa có dữ liệu.</small>'}</div>
      <div class="row"><button class="btn" id="bExport">Xuất JSON</button><label class="btn">Nhập JSON<input type="file" id="bImport" accept=".json" hidden></label><button class="btn danger" id="bReset">Xoá toàn bộ</button></div>
      <small>${G.serverOK ? '✅ Đang đồng bộ với server.py (lưu vào leaderboard.json).' : 'Lưu trong trình duyệt. Chạy server.py để lưu thành file trên máy.'}</small></div>`;
  }
  function tabTest() {
    const teams = S.teams.map((t, i) => `<div class="tw"><b style="color:${G.TEAMS[i].light}">${G.TEAMS[i].name}</b>${Object.keys(G.WEAPONS).map(k => `<button class="btn sm" data-sp="${i}:${k}" title="${G.WEAPONS[k].desc}">${G.WEAPONS[k].icon}</button>`).join('')}</div>`).join('');
    return `<div class="card"><h3>Triệu hồi thử</h3>${teams}<small>Bấm Shift+click để triệu hồi ×10.</small></div>
    <div class="card"><h3>Điều khiển trận</h3><div class="row"><button class="btn" id="bSkip">Bắt đầu ngay</button><button class="btn" id="bEnd">Kết thúc trận</button><button class="btn" id="bNew">Trận mới</button></div></div>
    <div class="card"><h3>Giả lập người xem</h3>
      <div class="row"><input id="tName" value="TestUser" style="flex:1"><input id="tChat" placeholder="bình luận: 1 / đỏ…" style="flex:1"><button class="btn" id="bChat">Gửi chat</button></div>
      <div class="row"><input id="tCoin" type="number" value="30" style="width:90px"><span>xu ×</span><input id="tCnt" type="number" value="1" style="width:70px"><button class="btn" id="bGift">Tặng quà</button><button class="btn" id="bLike">Like ×20</button></div></div>`;
  }

  function render() {
    const body = $('menuBody'); if (!body) return;
    const prevTop = body.scrollTop, same = M.shown === M.tab; M.shown = M.tab;
    body.innerHTML = { conn: tabConn, view: tabView, mc: tabMc, match: tabMatch, gift: tabGift, fx: tabFx, rank: tabRank, test: tabTest }[M.tab]();
    body.scrollTop = same ? prevTop : 0;
    $('menu').classList.toggle('peek', M.tab === 'view' || M.tab === 'mc');
    applyLock(); G.applyLayout();
    $('menuTabs').innerHTML = TABS.map(t => `<button class="${t[0] === M.tab ? 'on' : ''}" data-tab="${t[0]}">${t[1]}</button>`).join('');
    if (M.tab === 'match') drawPreviews();
    if (M.tab === 'conn') { updConn(); updLog(); }
    if (M.tab === 'fx') updAud();
  }
  function applyLock() {
    const on = !!st.uiLock, b = $('mLock'), body = $('menuBody'), mp = document.querySelector('#menu .mp');
    if (b) { b.textContent = on ? '🔒 Đã khoá — mở khoá' : '🔓 Khoá cài đặt'; b.classList.toggle('on', on); }
    if (body) body.classList.toggle('locked', on);
    if (mp) mp.classList.toggle('locked', on);
  }
  function drawPreviews() {
    document.querySelectorAll('canvas[data-pv]').forEach(c => {
      const m = G.buildMap(c.dataset.pv, st.teamCount), x = c.getContext('2d'), th = G.mapById(c.dataset.pv).theme, w = c.width / G.COLS, h = c.height / G.ROWS;
      x.fillStyle = '#241848'; x.fillRect(0, 0, c.width, c.height);
      for (let r = 0; r < G.ROWS; r++) for (let q = 0; q < G.COLS; q++) { const v = m.wall[r * G.COLS + q]; x.fillStyle = v === 1 ? th.wallTop : v === 2 ? th.water : '#3a2c70'; x.fillRect(q * w, r * h, w + 0.5, h + 0.5); }
      m.bases.forEach(([bc, br], i) => { x.fillStyle = G.TEAMS[i].color; x.beginPath(); x.arc((bc + .5) * w, (br + .5) * h, 5, 0, 7); x.fill(); });
    });
  }
  function updAud() { const e = $('audSt'); if (!e) return; const c = G.audio.ctx; e.textContent = !c ? '⚪ Chưa bật (chạm màn hình 1 lần)' : c.state === 'running' ? '🟢 Âm thanh đang chạy' : '🟠 Đang tạm dừng (' + c.state + ')'; }
  function updConn() { const e = $('connSt'); if (!e) return; const s = G.live.status; e.textContent = s === 'live' ? '🟢 Đã kết nối' : s === 'connecting' ? '🟡 Đang kết nối…' : s === 'waiting' ? '🟠 Chờ bạn bắt đầu LIVE…' : '⚪ Chưa kết nối'; }
  function updLog() { const e = $('logBox'); if (e) { e.textContent = G.live.log.slice(-18).join('\n'); e.scrollTop = e.scrollHeight; } }
  G.onStatus = updConn; G.onLog = () => { if (M.open_) updLog(); };

  M.open = function () { M.open_ = true; M.shown = null; $('menu').className = 'show'; render(); G.audio.resume(); };
  M.close = function () { M.open_ = false; $('menu').className = ''; G.saveSettings(); G.applyLayout(); };
  M.refresh = () => render();
  M.toggle = () => M.open_ ? M.close() : M.open();

  function readRules() {
    st.rules = [...document.querySelectorAll('.rule')].map(r => ({ min: Math.max(1, +r.querySelector('[data-r=min]').value || 1), w: r.querySelector('[data-r=w]').value, n: Math.max(1, +r.querySelector('[data-r=n]').value || 1) }));
    G.saveSettings(); G.ui.rebuildGuide();
  }

  function onInput(e) {
    const el = e.target, k = el.dataset.k;
    if (st.uiLock && el.closest('#menuBody')) return;
    if (el.dataset.r) { readRules(); return; }
    if (!k) return;
    let v = el.type === 'checkbox' ? el.checked : el.dataset.t === 'n' || el.type === 'range' ? +el.value : el.value;
    st[k] = v; G.saveSettings();
    const o = document.querySelector(`[data-o="${k}"]`); if (o) o.textContent = /^safe(Top|Bottom)$/.test(k) ? v + 'px' : k === 'speed' ? '×' + (+v).toFixed(1) : /Sec$/.test(k) && k !== 'freeSoldierSec' ? v + 's' : /vol|Vol/.test(k) ? Math.round(v * 100) + '%' : v;
    if (/^(vol|sfxVol|musicVol)$/.test(k)) G.audio.applyVol();
    if (k === 'music') { G.audio.resume(); v ? G.audio.startMusic() : G.audio.stopMusic(); }
    if (k === 'quality') { v === 'auto' ? G.setQuality(0) : G.setQuality({ high: 0, mid: 1, low: 2 }[v]); }
    if (k === 'teamCount' && M.tab === 'match') drawPreviews();
    if (k === 'mcVoice') { G.mc.reload(); const s = $('mcSt'); if (s) s.textContent = G.mc.status(); }
    if (k === 'mcOn' && !v) G.mc.clear();
    if (k === 'musicFile') { G.audio.resume(); G.audio.musicMode(); }
    if (/^(safeMode|safeTop|safeBottom|fillArena)$/.test(k)) { G.applyLayout(); G.refitArena(); }
    if (k === 'demo') { if (v) G.live.seedSim(); else G.purgeSim(); }
    if (k === 'username' || k === 'apiKey' || k === 'wsBase') { /* lưu khi kết nối */ }
  }

  function onClick(e) {
    const t = e.target.closest('button,[data-map],[data-tab],label.btn'); if (!t) return; G.audio.play('click');
    if (t.id === 'mLock') { st.uiLock = !st.uiLock; G.saveSettings(); applyLock(); return; }
    if (st.uiLock && t.id !== 'mClose' && !t.dataset.tab) return;
    if (t.dataset.tab) { M.tab = t.dataset.tab; render(); return; }
    if (t.dataset.preset) { const [a, b] = t.dataset.preset.split(':'); st.safeTop = +a; st.safeBottom = +b; st.safeMode = true; G.saveSettings(); G.applyLayout(); G.refitArena(); render(); return; }
    if (t.dataset.top) { G.audio.resume(); G.cine.demoTop(+t.dataset.top); return; }
    if (t.dataset.g3d) { G.audio.resume(); const [c, k] = t.dataset.g3d.split(':'); G.cine.demoGift(k, +c); return; }
    if (t.dataset.tele !== undefined) { G.audio.resume(); G.cine.tele(+t.dataset.tele, { force: true, say: true, pri: 6 }); return; }
    if (t.dataset.map) { st.mapId = t.dataset.map; G.saveSettings(); document.querySelectorAll('.mc').forEach(c => c.classList.toggle('sel', c.dataset.map === st.mapId)); return; }
    if (t.dataset.del !== undefined) { st.rules.splice(+t.dataset.del, 1); G.saveSettings(); $('rules').innerHTML = ruleRows(); G.ui.rebuildGuide(); return; }
    if (t.dataset.sp) { const [tm, k] = t.dataset.sp.split(':'); G.testSpawn(+tm, k, e.shiftKey ? 10 : 1); return; }
    switch (t.id) {
      case 'bConnect': G.live.connect(); break;
      case 'bAudio': G.audio.rebuild(); G.audio.resume(); setTimeout(updAud, 300); break;
      case 'bFull': G.fullscreen(); break;
      case 'bHook': G.audio.resume(); G.cine.hookStop(); G.cine.hook(); break;
      case 'bMcTest': G.audio.resume(); G.mc.unlock(); G.mc.test(); break;
      case 'bMcStop': G.mc.clear(); break;
      case 'bDisc': G.live.disconnect(); break;
      case 'bApply': st.rotateMaps = st.rotateMaps; G.S.matchCount = 0; G.newMatch(); M.close(); break;
      case 'bAddRule': readRules(); st.rules.push({ min: 1, w: 'soldier', n: 1 }); $('rules').innerHTML = ruleRows(); break;
      case 'bResetRules': st.rules = JSON.parse(JSON.stringify(G.DEFAULT_RULES)); G.saveSettings(); $('rules').innerHTML = ruleRows(); G.ui.rebuildGuide(); break;
      case 'bExport': { const a = document.createElement('a'); const out = {}; for (const id in G.board) if (id.indexOf('sim_') !== 0) out[id] = G.board[id]; a.href = URL.createObjectURL(new Blob([JSON.stringify(out, null, 1)], { type: 'application/json' })); a.download = 'leaderboard.json'; a.click(); break; }
      case 'bReset': if (confirm('Xoá toàn bộ bảng xếp hạng?')) { G.board = {}; G.boardDirty = true; G.persistBoard(); render(); } break;
      case 'bSkip': G.skipLobby(); M.close(); break;
      case 'bEnd': G.endNow(); M.close(); break;
      case 'bNew': G.S.matchCount = 0; G.newMatch(); M.close(); break;
      case 'bChat': G.onChat({ id: $('tName').value || 'test', name: $('tName').value || 'test' }, $('tChat').value); break;
      case 'bGift': G.onGift({ id: $('tName').value || 'test', name: $('tName').value || 'test' }, 'Test', +$('tCoin').value, +$('tCnt').value); break;
      case 'bLike': G.onLike({ id: $('tName').value || 'test', name: $('tName').value || 'test' }, 20); break;
    }
  }

  // Toàn màn hình (Android/máy tính). iPhone Safari không hỗ trợ → dùng "Thêm vào Màn hình chính" (xem README)
  G.fullscreen = function (toggle) {
    const d = document, el = d.documentElement;
    try {
      if (d.fullscreenElement || d.webkitFullscreenElement) { if (toggle) (d.exitFullscreen || d.webkitExitFullscreen).call(d); return; }
      const f = el.requestFullscreen || el.webkitRequestFullscreen;
      if (f) { const r = f.call(el, { navigationUI: 'hide' }); if (r && r.catch) r.catch(() => { }); }
      if (screen.orientation && screen.orientation.lock) screen.orientation.lock('portrait').catch(() => { });
    } catch (e) { }
  };
  G.initMenu = function () {
    const menu = $('menu');
    menu.innerHTML = `<div class="mp"><div class="mh"><b>⚙️ GameLive — Cài đặt</b><span><button class="btn" id="mLock"></button><button class="btn" id="mClose">✕ Đóng (Esc)</button></span></div><div id="lockNote">🔒 Cài đặt đang khoá: không thể kéo hay sửa. Bấm nút khoá ở góc phải để mở khoá.</div><div id="menuTabs"></div><div id="menuBody"></div></div>`;
    menu.addEventListener('input', onInput); menu.addEventListener('change', e => { if (e.target.id === 'bImport') importBoard(e.target.files[0]); else onInput(e); });
    menu.addEventListener('click', onClick);
    $('mClose').onclick = M.close;
    $('gear').onclick = M.toggle;
    window.addEventListener('keydown', e => {
      if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { if (e.key === 'Escape') M.close(); return; }
      if (e.key === 'm' || e.key === 'M' || e.key === 'Escape') M.toggle();
    });
    let gt = 0; const showGear = () => { $('gear').classList.add('vis'); clearTimeout(gt); gt = setTimeout(() => $('gear').classList.remove('vis'), 3000); };
    window.addEventListener('mousemove', showGear); window.addEventListener('touchstart', showGear);
    if (G.clean) $('gear').style.display = 'none';
    const gate = $('gate');
    gate.onclick = () => { G.audio.resume(); if (G.settings.autoFullscreen !== false) G.fullscreen(); setTimeout(() => { if (G.audio.ctx && G.audio.ctx.state === 'running') gate.style.display = 'none'; }, 200); };
    // nút nhắc bật âm thanh: hiện khi âm thanh chưa chạy, tự ẩn khi chạy; hiện lại nếu bị ngắt giữa chừng
    G.audio.onMusic = () => { if (M.open_ && M.tab === 'mc') render(); };
    G.audio.onState = ok => { gate.style.display = ok ? 'none' : 'block'; gate.textContent = G.audio.unlocked ? '🔊 Âm thanh bị ngắt — bấm để bật lại' : '🔊 Bấm vào đây để bật âm thanh'; updAud(); };
    let fsDone = false;
    window.addEventListener('pointerdown', () => {
      G.audio.resume();
      if (!fsDone && G.settings.autoFullscreen !== false && (navigator.maxTouchPoints > 0 || matchMedia('(pointer:coarse)').matches)) { fsDone = true; G.fullscreen(); }
    }, { once: false });
    window.addEventListener('keydown', e => { if ((e.key === 'f' || e.key === 'F') && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) G.fullscreen(true); });
  };
  function importBoard(f) {
    if (!f) return; const r = new FileReader();
    r.onload = () => { try { const j = JSON.parse(r.result); for (const id in j) if (j[id] && typeof j[id].c === 'number') G.board[id] = j[id]; G.boardDirty = true; G.persistBoard(); render(); } catch (e) { alert('File không hợp lệ'); } };
    r.readAsText(f);
  }
})();
