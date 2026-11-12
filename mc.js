/* ===== MC AI: người dẫn chuyện + bình luận viên (giọng đọc có sẵn của trình duyệt) =====
   - Đọc đội, người chơi vào đội, người gửi xu, vũ khí / chiến binh được triệu hồi ra bản đồ
   - Bình luận trận đấu theo tình huống thật (đảo chiều, áp đảo, căn cứ nguy kịch, còn vài giây…)
   - Hàng đợi ưu tiên: câu quan trọng chen ngang, câu thường bị bỏ nếu đã cũ → không bao giờ "đọc trễ" cả phút
   - Có phụ đề trên màn hình, và vẫn dẫn bằng phụ đề nếu máy không có giọng đọc */
(function () {
  'use strict';
  const G = window.G, S = G.S, TM = G.TEAMS, WP = G.WEAPONS;
  const rnd = Math.random, $ = id => document.getElementById(id), nowMs = () => performance.now();
  const M = (G.mc = { q: [], cur: null, voices: [], all: [], voice: null, hist: {}, holdUntil: 0, lastSpoke: 0, fails: 0, unlocked: false, cool: {} });
  const st = () => G.settings;

  const TEAM_SAY = ['Xanh', 'Đỏ', 'Xanh Lá', 'Vàng'];
  const EPI = ['những chiến binh của biển cả', 'ngọn lửa không bao giờ tắt', 'đạo quân của rừng xanh', 'quân đoàn hoàng kim'];
  const WSAY = { soldier: 'chiến binh', archer: 'cung thủ', gunner: 'xạ thủ', tank: 'xe tăng', cannon: 'trụ pháo', laser: 'súng laze', fortress: 'pháo đài', dragon: 'rồng oanh tạc', nuke: 'bom hạt nhân' };
  const NUM = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín', 'mười'];
  const tn = i => 'đội ' + (TEAM_SAY[i] || '');
  const num = n => (n >= 0 && n <= 10 ? NUM[n] : String(n));

  /* ---------------- ngân hàng câu nói (đa dạng, chọn tránh lặp) ---------------- */
  const B = {
    intro: [
      'Xin chào cả nhà! Chào mừng đến với Đại Chiến Lãnh Thổ! Hôm nay chúng ta giao tranh tại {map}. {howto}!',
      'Alo alo, mic đã bật! Trận mới sắp bắt đầu tại {map}. {howto}!',
      'Chào mừng quý vị khán giả đến với đấu trường! Bản đồ lần này là {map}. {howto}, đừng để đội mình thiếu người nhé!',
      'Một trận chiến mới lại bắt đầu! Địa điểm: {map}. {howto}, rồi chuẩn bị quà để triệu hồi quân nào!',
      'Cả nhà ơi, đấu trường {map} đã sẵn sàng! {howto}. Ai vào đội sớm, người đó giữ lợi thế!',
      'Chào các chiến binh! {map} đang chờ các bạn. {howto}, sau đó thả tim hoặc tặng quà để gọi quân tiếp viện!',
      'Phát sóng trực tiếp trận đại chiến lãnh thổ! Hôm nay là {map}. {howto}!',
      'Không khí đang nóng lên rồi đây! Bản đồ {map}, {tc} đội tham chiến. {howto}!',
      'NghiaMC xin chào! Đấu trường {map} đã mở cửa. {howto}, ai vào sớm được ưu tiên vị trí đẹp!',
      'Đây là NghiaMC đang dẫn trận! Bản đồ {map} sẵn sàng. {howto} rồi chuẩn bị thả quà triệu hồi!',
      'Sóng live đã lên! Hôm nay chiến trường là {map}. {howto}, đừng bỏ lỡ cơ hội vào đội nhé!',
      'Xin kính chào các chiến thần! {map} đang chờ. {howto} để chọn phe và bắt đầu cuộc chiến!',
      'Mic NghiaMC đã nóng! Trận đại chiến tại {map} sắp nổ ra. {howto}!',
    ],
    lobbyTick: [
      'Còn {secs} giây nữa là khai chiến! {howto}.',
      'Đồng hồ đang chạy, chỉ còn {secs} giây! {howto}.',
      'Sắp hết giờ chọn đội rồi, {secs} giây cuối cùng! {howto}.',
      '{secs} giây nữa thôi! Ai chưa có đội thì nhanh tay lên nào!',
      'Chỉ còn {secs} giây! NghiaMC nhắc các bạn nhanh chóng chọn đội!',
      'Thời gian đang trôi, {secs} giây cuối cùng trước khi chiến tranh bùng nổ!',
      '{secs} giây nữa là hết cửa vào đội! Ai còn đứng ngoài thì mau lên!',
    ],
    lobbyFill: [
      'Hiện {stats}. {weak} đang cần thêm chiến binh, mời bạn gia nhập!',
      'Quân số lúc này: {stats}. {weak} đang thiếu người, ai vào ngay thì có chỗ đứng đẹp!',
      'Cân bằng đội hình nào cả nhà! {stats}. {weak} cần thêm lực lượng!',
    ],
    join1: [
      '{name} đã gia nhập {team}!', 'Chào mừng {name} về với {team}!', '{team} vừa có thêm {name}, quân số tăng lên!',
      '{name} chọn {team}! Một quyết định đầy bản lĩnh!', 'Xin chào {name}! Mời bạn vào hàng ngũ {team}!',
      '{name} xuất hiện ở {team}, nghe nói đây là cao thủ đấy!', 'Thêm một chiến binh cho {team}, đó là {name}!', '{team} đón {name} với vòng tay rộng mở!',
    ],
    joinM: [
      '{names} vừa gia nhập {team}!', '{team} đón thêm {names}, hùng hậu quá!', 'Làn sóng chiến binh đổ về {team}: {names}!', 'Chào mừng {names} đến với {team}!',
    ],
    joinMore: [
      '{team} đón thêm {k} chiến binh mới, trong đó có {names}!', 'Có {k} người vừa vào {team}, nổi bật là {names}!', 'Đội hình {team} đang phình to, thêm {k} người, tiêu biểu là {names}!',
    ],
    joinAuto: [
      '{name} được xếp vào {team} để cân bằng đội hình!', 'Hệ thống chọn giúp {name} vào {team}, chào mừng bạn!',
    ],
    // quà theo mức xu (một quà, đã nhân combo)
    g1: [
      'Cảm ơn {name} đã gửi {coins} xu cho {team}!', '{name} thả {gift}, {coins} xu về {team}, quá dễ thương!', '{name} gửi {coins} xu, {team} nhận được rồi nhé!',
      'Một chút quà nhỏ từ {name}, nhưng tấm lòng thì lớn!', '{name} góp {coins} xu cho {team}!',
    ],
    g2: [
      '{name} chi {coins} xu, triệu hồi {unit} cho {team}!', 'Quà từ {name}, {coins} xu, đổi lấy {unit} cho {team}!', '{team} nhận {unit} nhờ {name} gửi {coins} xu!',
      '{name} ra tay, {unit} xuất quân cho {team}!', 'Cảm ơn {name}! {coins} xu giúp {team} có thêm {unit}!',
    ],
    g3: [
      'Chà! {name} tặng {coins} xu, {unit} xuất trận cho {team}!', '{name} chơi lớn với {coins} xu! {team} được tiếp viện {unit}!',
      'Ồ! {coins} xu từ {name}, {unit} lăn bánh về phía {team}!', '{name} vừa nâng sức mạnh của {team} bằng {coins} xu!',
    ],
    g4: [
      'Ồ hô! {name} gửi {coins} xu, {unit} hạng nặng vào vị trí cho {team}!', 'Quá đã! {name} bơm {coins} xu, {team} có ngay {unit}!',
      '{name} thật hào phóng, {coins} xu! {unit} đã sẵn sàng cho {team}!', 'Tiếng reo vang lên! {name} tặng {coins} xu, {unit} đổ bộ!',
    ],
    g5: [
      'Đại gia {name} xuất hiện với {coins} xu! {unit} sừng sững bảo vệ {team}!', 'Wow! {name} chi tới {coins} xu, {team} có {unit} khủng!',
      '{coins} xu từ {name}! {unit} của {team} đã thay đổi cục diện!', 'Không thể tin nổi! {name} tặng {coins} xu, {unit} xuất hiện!',
    ],
    g6: [
      'Không thể tin nổi! {name} tặng {coins} xu! {unit} đang lao thẳng vào chiến trường!', 'Siêu phẩm! {name} gửi {coins} xu, {unit} của {team} làm rung chuyển bản đồ!',
      'Cả phòng live nín thở, {name} vừa gửi {coins} xu! {unit}!',
    ],
    g7: [
      'Thảm hoạ sắp ập xuống! {name} tung {coins} xu kích hoạt {unit}! Mọi người nằm xuống!', 'Huyền thoại! {name} gửi {coins} xu, {unit} của {team} đã khai hoả!',
      'Đây là khoảnh khắc lịch sử! {name} với {coins} xu, {unit}!',
    ],
    gBehind: ['Đúng là cứu tinh của {team}!', 'Phao cứu sinh cho {team} đây rồi!', '{team} đang cần đúng điều này!'],
    gAhead: ['{team} càng thêm vững vàng!', 'Lợi thế của {team} đang nới rộng!', '{team} đang bay cao!'],
    gMulti: [
      '{names} và {k} bạn khác vừa gửi quà, tổng cộng {coins} xu. Cảm ơn cả nhà!', 'Mưa quà đang đổ xuống, tổng {coins} xu từ {names} và những người bạn!', 'Cảm ơn {names} cùng các bạn đã gửi {coins} xu!',
    ],
    gMulti2: ['{names} vừa gửi tổng cộng {coins} xu. Cảm ơn các bạn!', 'Quà từ {names}, tổng {coins} xu, cảm ơn nhiều lắm!'],
    spTank: ['Xe tăng của {team} lăn bánh, mặt đất rung chuyển!', '{team} tung xe tăng thiết giáp ra mặt trận!', 'Quái vật thép của {team} đã xuất hiện!'],
    spCannon: ['Trụ pháo của {team} đã vào vị trí, tầm bắn cực xa!', '{team} dựng pháo, phía bên kia hãy cẩn thận!', 'Pháo của {team} đã lên nòng!'],
    spLaser: ['Súng laze của {team} đang quét sạch lãnh thổ địch!', 'Tia laze của {team} xé toạc mặt đất!', '{team} kích hoạt laze, đất đai đổi màu theo từng nhát quét!'],
    spFortress: ['Pháo đài của {team} sừng sững giữa chiến trường, liên tục đẻ lính!', '{team} xây pháo đài! Một thành trì mới đã mọc lên!', 'Pháo đài khổng lồ của {team} vừa xuất hiện!'],
    spDragon: ['Rồng oanh tạc của {team} cất cánh, bom sắp rơi như mưa!', 'Nhìn lên trời kìa! Rồng của {team} đang lao tới!', 'Rồng lửa của {team} càn quét bầu trời!'],
    spNuke: ['Cảnh báo! Bom hạt nhân của {team} đã khai hoả! Còn vài giây nữa thôi!', 'Báo động đỏ! Hạt nhân của {team} đang rơi xuống!', 'Tất cả hãy chạy đi! Bom hạt nhân của {team} sắp nổ!'],
    spUnit: ['{team} xuất quân: {list}!', 'Trên bản đồ xuất hiện {list} của {team}!', '{list} của {team} đã sẵn sàng chiến đấu!'],
    tapRain: ['{team} đổ bộ {n} chiến binh nhờ những cú chạm tim!', 'Cơn mưa lính của {team} đang tràn xuống, thêm {n} chiến binh!', 'Chạm tim liên tục! {team} có thêm {n} chiến binh!'],
    teamIntro: [
      'Đây là khu vực của {team}, {epi}! Đã có {n} người sẵn sàng!', '{team}! {epi}! Hôm nay họ sẽ chiến đấu vì danh dự!', 'Máy quay hướng về {team}, {epi}, với {n} chiến binh!',
      'Nhìn vào lãnh thổ của {team} kìa, {epi}! Sẵn sàng khai chiến!',
    ],
    ready: ['Hai bên đã sẵn sàng! {teams}! Trận đấu sắp bắt đầu!', 'Chuẩn bị! {teams} đối đầu nhau!'],
    go: ['Chiến!', 'Khai chiến!', 'Xung phong!'],
    lead: [
      'Đảo chiều! {team} vượt lên dẫn đầu với {pct} phần trăm lãnh thổ!', '{team} lên dẫn đầu rồi! {pct} phần trăm bản đồ đã thuộc về họ!', 'Cục diện thay đổi! {team} chiếm {pct} phần trăm và dẫn trước!',
      'Ngoạn mục! {team} đã bứt lên đầu bảng với {pct} phần trăm!', 'Quá hay! {team} giành lại ngôi đầu!',
    ],
    comeback: ['Màn lội ngược dòng đỉnh cao của {team}!', 'Không ai ngờ {team} lại lật kèo được như vậy!', '{team} từ thế yếu vươn lên dẫn đầu, tuyệt vời!'],
    dominate: [
      '{team} đang áp đảo với {pct} phần trăm, các đội còn lại cần quà để lật kèo!', 'Thế trận nghiêng hẳn về {team}, họ chiếm {pct} phần trăm bản đồ!',
      '{team} đang ngự trị với {pct} phần trăm, liệu có ai ngăn được?',
    ],
    close: ['Cực kỳ sít sao! Chỉ cách nhau {gap} phần trăm!', 'Hai bên ngang tài ngang sức, chênh lệch chỉ {gap} phần trăm!', 'Nghẹt thở! Một cú quà nữa thôi là đổi ngôi!'],
    baseLow: ['{team} nguy kịch! Căn cứ chỉ còn {hp} phần trăm máu!', 'Căn cứ của {team} sắp thất thủ, còn {hp} phần trăm!', 'Báo động! Căn cứ {team} đang bị đè bẹp, còn {hp} phần trăm máu!'],
    baseCrit: ['Căn cứ {team} sắp sụp đổ rồi! Ai cứu họ đây?', '{team} đang hấp hối! Chỉ cần một đòn nữa là hết!'],
    baseDead: ['Căn cứ {team} sụp đổ! Một đế chế vừa biến mất!', 'Xong rồi! {team} bị loại khỏi cuộc chơi!', 'Tiếng nổ lớn! Căn cứ của {team} đã tan thành khói bụi!'],
    time60: ['Còn một phút! {leader} đang dẫn đầu, mọi chuyện vẫn chưa ngã ngũ!', 'Một phút cuối cùng! Ai sẽ lên ngôi đây?'],
    time30: ['Ba mươi giây cuối! Mọi thứ vẫn có thể thay đổi!', 'Chỉ còn ba mươi giây, thả quà ngay để lật thế cờ!'],
    time10: ['Mười giây! Tăng tốc nào cả nhà!', 'Mười giây cuối cùng! Ai thả quà ngay còn kịp!'],
    stats: ['Quân số lúc này: {stats}.', 'Cập nhật chiến trường: {stats}.'],
    donor: ['{name} đang dẫn đầu bảng quà của trận này với {mc} xu!', 'Nhà tài trợ số một trận này là {name}, {mc} xu!', 'Top quà trận này thuộc về {name}, {mc} xu, quá đỉnh!'],
    coinPool: ['{team} đã nhận tổng cộng {coins} xu quà tặng trong trận này!', 'Quà dành cho {team} đã lên tới {coins} xu!'],
    cheer: ['Thả tim liên tục để gọi lính nào cả nhà!', 'Bình luận một số để chọn đội, đừng đứng ngoài cuộc chiến!', 'Tặng quà là triệu hồi vũ khí ngay, xe tăng chỉ từ ba mươi xu!', 'Mỗi cú chạm màn hình là một chiến binh ra trận!', 'Đừng quên theo dõi kênh để không bỏ lỡ trận kế tiếp!', 'Ai muốn đội mình thắng thì thả quà ngay nhé!'],
    crate: ['Rương báu thuộc về {team}: {msg}!', '{team} nhặt được rương, {msg}!'],
    win: ['Kết thúc trận! {team} giành chiến thắng với {pct} phần trăm lãnh thổ!', '{team} lên ngôi! {pct} phần trăm bản đồ nằm trong tay họ!', 'Tiếng còi vang lên! Chiến thắng thuộc về {team}!'],
    winKO: ['{team} là đội duy nhất còn đứng vững! Chiến thắng tuyệt đối!', 'Không còn ai đứng vững ngoài {team}! Chiến thắng!'],
    draw: ['Hoà! Không đội nào chịu nhường ai!', 'Một trận hoà kịch tính!'],
    mvp: ['MVP của trận là {name} với {mc} xu quà tặng! Xin một tràng pháo tay!', 'Nhân vật xuất sắc nhất: {name}, {mc} xu! Cảm ơn bạn rất nhiều!', '{name} là MVP trận này với {mc} xu, quá xuất sắc!'],
    thanks: ['Cảm ơn {names} đã đồng hành cùng các đội!', 'Gửi lời cảm ơn đến top quà: {names}!'],
    next: ['Trận mới sắp bắt đầu, hãy chuẩn bị chọn đội!', 'Nghỉ một chút, lát nữa chúng ta tiếp tục đại chiến!', 'Nhớ ở lại để xem trận kế tiếp nhé!'],
    top1: ['Quỳ xuống! Top một ngày {name} đã giá lâm!', 'Đại gia số một hôm nay, {name}, vừa bước vào cuộc chơi!', 'Ngai vàng đã có chủ, top một ngày {name}!'],
    top2: ['Sấm sét vang lên, top hai ngày {name} xuất hiện!', 'Top hai ngày {name}, một cao thủ thực thụ!'],
    top3: ['Lửa cháy rực! Top ba ngày {name} đã có mặt!', 'Top ba ngày {name}, thật ấn tượng!'],
    topN: ['Chào mừng top {rank} ngày {name}!', 'Top {rank} ngày {name} xuất hiện, cả phòng live vỗ tay nào!', 'Top {rank} ngày {name} vừa vào phòng!'],
    topRise: ['{name} vừa vươn lên top {rank} ngày!', 'Bứt phá ngoạn mục! {name} lên top {rank} ngày!', 'Bảng xếp hạng ngày vừa đổi chủ, {name} ở vị trí số {rank}!'],
    tele: ['Máy quay tele zoom vào khu vực của {team}!', 'Cận cảnh lãnh thổ của {team}!'],
    hook: ['Đại chiến lãnh thổ! Ai sẽ là vua?', 'Một đội duy nhất đứng cuối cùng! Bạn chọn đội nào?'],
  };

  /* ---------------- tiện ích ---------------- */
  function pick(key, arr) {
    const h = M.hist[key] || (M.hist[key] = []); let i = 0, tries = 0;
    do { i = (rnd() * arr.length) | 0; tries++; } while (arr.length > 3 && h.indexOf(i) >= 0 && tries < 8);
    h.push(i); if (h.length > Math.min(3, arr.length - 1)) h.shift(); return arr[i];
  }
  function fill(t, c) { return t.replace(/\{(\w+)\}/g, (m, k) => (c[k] != null ? c[k] : '')); }
  function say(key, c) { let s = fill(pick(key, B[key]), c).trim().replace(/([.!?]\s+)(\p{Ll})/gu, (x, a, b) => a + b.toUpperCase()); return s.charAt(0).toUpperCase() + s.slice(1); }
  // tên người chơi → chuỗi đọc được (bỏ emoji, ký hiệu, dãy số dài)
  function cleanName(n) {
    let s = String(n || '').replace(/[^\p{L}\p{N} .'-]/gu, ' ').replace(/\d{5,}/g, ' ').replace(/[._-]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (s.length > 20) s = s.slice(0, 20).replace(/\s+\S*$/, '') || s.slice(0, 20);
    if ((s.match(/\p{L}/gu) || []).length < 2) return 'một bạn khán giả';
    return s;
  }
  const sec = ms => ms / 1000;
  const howto = () => {
    const tc = S.tc || 2, p = ['số một vào đội Xanh', 'số hai vào đội Đỏ', 'số ba vào đội Xanh Lá', 'số bốn vào đội Vàng'].slice(0, tc);
    return 'Gõ ' + (p.length > 2 ? p.slice(0, -1).join(', ') + ' và ' + p[p.length - 1] : p.join(', '));
  };
  const ordered = () => S.teams.slice().sort((a, b) => b.pct - a.pct);
  const pct = t => Math.round((t.pct || 0) * 100);
  const coolOk = (k, ms) => { const t = nowMs(); if (t - (M.cool[k] || 0) < ms) return false; M.cool[k] = t; return true; };

  /* ---------------- giọng đọc ---------------- */
  const hasTTS = () => typeof window.speechSynthesis !== 'undefined' && typeof window.SpeechSynthesisUtterance !== 'undefined';
  function loadVoices() {
    if (!hasTTS()) return;
    const all = speechSynthesis.getVoices() || []; M.all = all;
    M.voices = all.filter(v => /^vi/i.test(v.lang) || /vietnam/i.test(v.name));
    const want = st().mcVoice;
    let v = want && all.find(x => x.name === want);
    if (!v) v = M.voices.find(x => /hoaimy|namminh|linh|mai|an\b/i.test(x.name)) || M.voices[0] || null;
    M.voice = v;
  }
  if (hasTTS()) { loadVoices(); try { speechSynthesis.onvoiceschanged = () => { loadVoices(); if (G.menu && G.menu.open_ && G.menu.tab === 'mc') G.menu.refresh && G.menu.refresh(); }; } catch (e) { } }
  M.reload = loadVoices;
  M.unlock = function () {      // gọi sau thao tác chạm đầu tiên (trình duyệt chặn đọc trước khi người dùng tương tác)
    if (M.unlocked) return; M.unlocked = true;
    if (!hasTTS()) return;
    try {
      // Force load voices + silent speak to unlock audio policy
      loadVoices();
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0.01; u.rate = 2;
      speechSynthesis.speak(u);
      // Also try cancel any stuck utterances
      setTimeout(() => { try { speechSynthesis.cancel(); } catch (e) {} }, 80);
    } catch (e) { }
  };
  window.addEventListener('pointerdown', M.unlock, { once: false, passive: true });
  window.addEventListener('touchstart', M.unlock, { once: false, passive: true });
  window.addEventListener('click', M.unlock, { once: false, passive: true });

  /* ---------------- hàng đợi + phụ đề ---------------- */
  let capT = 0;
  function showCaption(text, ms) {
    const el = $('mcbar'); if (!el || st().mcCaption === false) return;
    // Giữ phụ đề lâu hơn để đọc kịp (tối thiểu 5.5s + buffer)
    const hold = Math.max(5500, (ms || 2500) + 2200);
    el.innerHTML = '<b>🎙️ NghiaMC</b><span></span>'; el.lastChild.textContent = text; el.className = 'show';
    clearTimeout(capT); capT = setTimeout(() => { el.className = ''; }, hold);
  }
  function speak(it) {
    M.cur = it; it.start = nowMs();
    const rate = Math.max(0.55, +st().mcRate || 0.95);
    // Ước lượng thời gian đọc chậm hơn + buffer dài để text không biến mất quá nhanh
    const est = Math.max(3200, it.text.length * 95 / rate) + 1200;
    it.deadline = it.start + est + 5000; it.virtualEnd = it.start + est;
    showCaption(it.cap || it.text, est);
    if (G.audio && G.audio.duck) G.audio.duck(0.32);
    if (st().mcVoiceOn !== false && hasTTS() && M.fails < 5) {
      try {
        // Đảm bảo đã unlock
        if (!M.unlocked) M.unlock();
        const u = new SpeechSynthesisUtterance(it.text);
        // Ưu tiên giọng đã chọn, nếu có nhiều giọng tiếng Việt thì thỉnh thoảng đổi để tạo cảm giác đa dạng
        let v = M.voice;
        if (!v && M.voices.length) v = M.voices[Math.floor(rnd() * M.voices.length)];
        else if (M.voices.length > 1 && rnd() < 0.32) v = M.voices[Math.floor(rnd() * M.voices.length)];
        u.lang = v ? v.lang : 'vi-VN'; if (v) u.voice = v;
        u.rate = rate;
        // Biến thiên nhẹ pitch để giọng không đều đều
        const basePitch = +st().mcPitch || 1;
        u.pitch = Math.max(0.5, Math.min(1.8, basePitch + (rnd() - 0.5) * 0.2));
        u.volume = Math.max(0.15, Math.min(1, +st().mcVol || 0.9));
        u.onend = () => { M.fails = 0; finish(it); };
        u.onerror = e => { if (!e || (e.error !== 'canceled' && e.error !== 'interrupted')) M.fails++; finish(it); };
        it.tts = true;
        // Cancel any previous stuck speech then speak
        try { speechSynthesis.cancel(); } catch (e) {}
        setTimeout(() => { try { speechSynthesis.speak(u); } catch (e) { M.fails++; it.tts = false; finish(it); } }, 30);
      } catch (e) { M.fails++; it.tts = false; }
    }
  }
  function finish(it) {
    if (M.cur !== it) return; M.cur = null; M.lastSpoke = nowMs();
    if (G.audio && G.audio.unduck && !M.q.length) G.audio.unduck();
  }
  M.say = function (text, o) {
    o = o || {}; if (!st().mcOn || !text) return;
    const it = { text: text.replace(/\s+/g, ' ').trim(), pri: o.pri || 2, ttl: o.ttl || 7000, key: o.key || '', cap: o.cap, t: nowMs() };
    if (it.key) M.q = M.q.filter(x => x.key !== it.key);
    M.q.push(it);
    while (M.q.length > 7) { let k = 0; for (let i = 1; i < M.q.length; i++) if (M.q[i].pri < M.q[k].pri || (M.q[i].pri === M.q[k].pri && M.q[i].t < M.q[k].t)) k = i; M.q.splice(k, 1); }
    if (M.cur && it.pri >= M.cur.pri + 2 && M.cur.pri <= 3) { try { if (M.cur.tts) speechSynthesis.cancel(); } catch (e) { } const c = M.cur; M.cur = null; M.lastSpoke = nowMs(); }
  };
  M.hold = ms => { M.holdUntil = Math.max(M.holdUntil, nowMs() + ms); };
  M.clear = () => { M.q.length = 0; try { hasTTS() && speechSynthesis.cancel(); } catch (e) { } M.cur = null; };
  function pump() {
    const t = nowMs();
    if (!st().mcOn) { if (M.q.length || M.cur) M.clear(); return; }
    if (M.cur) { if (t > M.cur.deadline || (!M.cur.tts && t > M.cur.virtualEnd)) { try { M.cur.tts && speechSynthesis.cancel(); } catch (e) { } finish(M.cur); } else return; }
    if (t < M.holdUntil) return;
    M.q = M.q.filter(it => t - it.t < it.ttl);
    if (!M.q.length) { if (G.audio && G.audio.unduck) G.audio.unduck(); return; }
    M.q.sort((a, b) => b.pri - a.pri || a.t - b.t);
    speak(M.q.shift());
  }

  /* ---------------- gộp sự kiện: vào đội, quà nhỏ, lính chạm tim ---------------- */
  const joinBuf = {}; let giftBuf = [], giftT = 0, tapBuf = {}, tapT = 0, lastJoinSay = 0;
  G.on('join', e => {
    if (st().mcJoin === false) return;
    const b = joinBuf[e.t] || (joinBuf[e.t] = { names: [], t0: nowMs(), auto: 0 });
    b.names.push(cleanName(e.p.name)); if (e.auto) b.auto++;
  });
  function flushJoins(force) {
    const t = nowMs(); if (!force && t - lastJoinSay < 3200) return;
    for (const k in joinBuf) {
      const b = joinBuf[k]; if (!b.names.length) { delete joinBuf[k]; continue; }
      if (!force && t - b.t0 < 1800) continue;
      const team = tn(+k), n = b.names.length, uniq = [...new Set(b.names)];
      let txt;
      if (n === 1) txt = b.auto ? say('joinAuto', { name: uniq[0], team }) : say('join1', { name: uniq[0], team });
      else if (uniq.length <= 3) txt = say('joinM', { names: uniq.length > 1 ? uniq.slice(0, -1).join(', ') + ' và ' + uniq[uniq.length - 1] : uniq[0], team });
      else txt = say('joinMore', { k: n, team, names: uniq.slice(0, 2).join(' và ') });
      delete joinBuf[k]; lastJoinSay = t;
      M.say(txt, { pri: 2, ttl: 6000, key: 'join' + k });
      return;
    }
  }

  function coinsTier(c) { return c >= 3000 ? 7 : c >= 1000 ? 6 : c >= 500 ? 5 : c >= 99 ? 4 : c >= 30 ? 3 : c >= 5 ? 2 : 1; }
  G.on('gift', e => {
    if (st().mcGift === false) return;
    const p = e.p, name = cleanName(p.name), team = tn(p.team), w = WP[e.rule], tier = coinsTier(e.total);
    if (tier <= 2 && !(w && w.kind !== 'unit')) { giftBuf.push({ name, coins: e.total, gift: e.giftName, team, tier, w, n: e.n }); if (!giftT) giftT = nowMs(); return; }
    const unit = w ? (e.n > 1 ? num(e.n) + ' ' : 'một ') + WSAY[e.rule] : 'chiến binh';
    let txt = say('g' + tier, { name, coins: e.total, team, unit, gift: cleanGift(e.giftName) });
    // câu dài hơn một chút nếu đội đang yếu / đang dẫn
    if (S.teams.length > 1 && rnd() < 0.45 && tier >= 3) {
      const o = ordered(), me = S.teams[p.team]; if (me) txt += ' ' + (me === o[0] ? say('gAhead', { team }) : (o[0].pct - me.pct > 0.06 ? say('gBehind', { team }) : ''));
    }
    M.say(txt.trim(), { pri: tier >= 6 ? 5 : tier >= 4 ? 4 : 3, ttl: tier >= 5 ? 14000 : 8000 });
  });
  function cleanGift(g) { const s = String(g || '').replace(/[^\p{L}\p{N} ]/gu, '').trim(); return s && s.length <= 18 ? s : 'quà'; }
  function flushGifts(force) {
    if (!giftBuf.length) return; const t = nowMs(); if (!force && t - giftT < 2600) return;
    const L = giftBuf; giftBuf = []; giftT = 0;
    const sum = L.reduce((a, x) => a + x.coins, 0), names = [...new Set(L.map(x => x.name))];
    let txt;
    if (L.length === 1) { const x = L[0]; txt = say(x.tier === 1 ? 'g1' : 'g2', { name: x.name, coins: x.coins, team: x.team, gift: cleanGift(x.gift), unit: (x.n > 1 ? num(x.n) + ' ' : 'một ') + (x.w ? WSAY[Object.keys(WP).find(k => WP[k] === x.w)] : 'chiến binh') }); }
    else if (names.length <= 2) txt = say('gMulti2', { names: names.join(' và '), coins: sum });
    else txt = say('gMulti', { names: names.slice(0, 2).join(', '), k: names.length - 2, coins: sum });
    M.say(txt, { pri: 2, ttl: 7000, key: 'giftbuf' });
  }

  // vũ khí / chiến binh xuất hiện trên bản đồ
  G.on('spawn', e => {
    if (st().mcSummon === false) return;
    const key = e.key, w = WP[key]; if (!w) return; const team = tn(e.team);
    if (w.kind === 'unit') {
      if (e.tap) { tapBuf[e.team] = (tapBuf[e.team] || 0) + 1; if (!tapT) tapT = nowMs(); }
      return;
    }
    const map = { tank: 'spTank', cannon: 'spCannon', laser: 'spLaser', fortress: 'spFortress', dragon: 'spDragon', nuke: 'spNuke' };
    const b = map[key]; if (!b) return;
    M.say(say(b, { team }), { pri: key === 'nuke' ? 5 : key === 'dragon' || key === 'fortress' ? 4 : 3, ttl: 6000, key: 'sp' + key + e.team });
  });
  // xe tăng cũng là unit: đọc riêng vì nặng ký
  G.on('spawn', e => { if (e.key === 'tank' && e.p && !e.tap && st().mcSummon !== false && coolOk('tank' + e.team, 5000)) M.say(say('spTank', { team: tn(e.team) }), { pri: 3, ttl: 5000, key: 'sptank' + e.team }); });
  function flushTaps(force) {
    if (!tapT) return; const t = nowMs(); if (!force && t - tapT < 6000) return;
    for (const k in tapBuf) { if (tapBuf[k] >= 6) M.say(say('tapRain', { team: tn(+k), n: tapBuf[k] }), { pri: 1, ttl: 4000, key: 'tap' + k }); }
    tapBuf = {}; tapT = 0;
  }

  /* ---------------- vòng đời trận ---------------- */
  let tflags = {}, lastLeader = -1, leadSince = 0, maxGapBehind = {}, baseWarn = {}, lastCommentary = 0, lobbySaid = {};
  G.on('lobby', e => {
    tflags = {}; lastLeader = -1; leadSince = 0; maxGapBehind = {}; baseWarn = {}; lobbySaid = {}; lastCommentary = nowMs(); M.q.length = 0;
    for (const k in joinBuf) delete joinBuf[k];
    const hookMs = G.cine && G.cine.willHook ? G.cine.willHook() : 0; if (hookMs) M.hold(hookMs);
    if (st().mcOn) M.say(say('intro', { map: e.map ? e.map.name : 'đấu trường', howto: howto(), tc: num(S.tc) }), { pri: 4, ttl: 20000, key: 'intro' });
  });
  G.on('countdown', () => {
    if (!(G.cine && G.cine.hasTeleIntro && G.cine.hasTeleIntro()))
      M.say(say('ready', { teams: S.teams.map((t, i) => tn(i)).join(' và ') }), { pri: 4, ttl: 3500 });
  });
  G.on('teleintro', e => {
    const t = S.teams[e.team]; if (!t) return; let n = 0; S.players.forEach(p => { if (p.team === e.team) n++; });
    M.say(say('teamIntro', { team: tn(e.team), epi: EPI[e.team] || '', n: num(n) }), { pri: 4, ttl: 3500, key: 'ti' + e.team });
  });
  G.on('battle', () => { M.say(pick('goX', B.go), { pri: 5, ttl: 2000 }); lastCommentary = nowMs(); });
  G.on('baseDown', e => { M.say(say('baseDead', { team: tn(e.b.team) }), { pri: 5, ttl: 6000, key: 'bd' + e.b.team }); });
  G.on('crate', e => { if (rnd() < 0.7) M.say(say('crate', { team: tn(e.team), msg: e.msg }), { pri: 2, ttl: 4000 }); });
  G.on('tele', e => { if (e.say !== false) M.say(say('tele', { team: tn(e.team) }), { pri: 3, ttl: 4000, key: 'tele' }); });
  G.on('result', res => {
    M.q.length = 0; if (!res) return;
    const pctOf = i => Math.round(((res.teams.find(t => t.id === i) || {}).pct || 0) * 100);
    const alive = res.teams.filter(t => t.alive).length;
    if (res.winner >= 0) M.say(say(alive === 1 && S.tc > 1 && pctOf(res.winner) < 100 && res.teams.some(t => !t.alive) ? 'winKO' : 'win', { team: tn(res.winner), pct: pctOf(res.winner) }), { pri: 5, ttl: 9000, key: 'win' });
    else M.say(say('draw', {}), { pri: 5, ttl: 9000 });
    if (res.mvp) M.say(say('mvp', { name: cleanName(res.mvp.name), mc: res.mvp.mc }), { pri: 4, ttl: 15000, key: 'mvp' });
    const top = (res.top || []).slice(0, 3).map(p => cleanName(p.name));
    if (top.length > 1) M.say(say('thanks', { names: top.slice(0, -1).join(', ') + ' và ' + top[top.length - 1] }), { pri: 3, ttl: 18000, key: 'thanks' });
    M.say(say('next', {}), { pri: 2, ttl: 22000, key: 'next' });
  });
  M.sayTop = function (p, rank, rise, slogan) {
    const name = cleanName(p.name); let t;
    if (rise) t = say('topRise', { name, rank });
    else t = rank === 1 ? say('top1', { name }) : rank === 2 ? say('top2', { name }) : rank === 3 ? say('top3', { name }) : say('topN', { name, rank });
    if (slogan) t += ' ' + slogan;
    // Giữ câu top lâu hơn để đọc kịp + ưu tiên cao
    M.say(t, { pri: 5, ttl: rank <= 3 ? 14000 : 10000, key: 'top' });
  };

  /* ---------------- bình luận theo tình huống (chạy mỗi giây) ---------------- */
  const GAP = [0, 17000, 11000, 7500];
  function commentary() {
    const f = st().mcFreq || 2, gap = GAP[f] || 11000, t = nowMs();
    if (st().mcCommentary === false) return;
    const T = S.teams; if (T.length < 2) return;
    const o = ordered(), lead = o[0], second = o[1], gapPct = Math.round((lead.pct - second.pct) * 100);
    // đổi ngôi
    if (lead.alive && lead.id !== lastLeader && gapPct >= 2) {
      const hadLeader = lastLeader >= 0, behindBefore = maxGapBehind[lead.id] || 0;
      if (hadLeader && coolOk('lead', 9000)) {
        M.say(say(behindBefore >= 0.12 ? 'comeback' : 'lead', { team: tn(lead.id), pct: pct(lead) }), { pri: 3, ttl: 5000, key: 'lead' }); lastCommentary = t;
        if (behindBefore >= 0.12) M.say(say('lead', { team: tn(lead.id), pct: pct(lead) }), { pri: 3, ttl: 5000, key: 'lead2' });
      }
      lastLeader = lead.id; leadSince = t;
    } else if (lastLeader < 0 && lead.pct > 0) lastLeader = lead.id;
    T.forEach(tt => { maxGapBehind[tt.id] = Math.max(maxGapBehind[tt.id] || 0, lead.pct - tt.pct); });
    // căn cứ nguy kịch
    for (const b of S.bases) {
      if (b.dead || !S.teams[b.team].alive) continue; const f1 = b.hp / b.mhp, w = baseWarn[b.team] || 0;
      if (f1 < 0.15 && w < 2) { baseWarn[b.team] = 2; M.say(say('baseCrit', { team: tn(b.team) }), { pri: 4, ttl: 4500, key: 'bc' + b.team }); lastCommentary = t; }
      else if (f1 < 0.4 && w < 1) { baseWarn[b.team] = 1; M.say(say('baseLow', { team: tn(b.team), hp: Math.max(1, Math.round(f1 * 100)) }), { pri: 4, ttl: 4500, key: 'bl' + b.team }); lastCommentary = t; }
    }
    // mốc thời gian
    const bt = S.battleT;
    if (bt <= 60 && !tflags[60] && G.settings.matchSec > 75) { tflags[60] = 1; M.say(say('time60', { leader: tn(lead.id) }), { pri: 4, ttl: 5000 }); lastCommentary = t; }
    if (bt <= 30 && !tflags[30] && G.settings.matchSec > 40) { tflags[30] = 1; M.say(say('time30', {}), { pri: 4, ttl: 5000 }); lastCommentary = t; }
    if (bt <= 10 && !tflags[10]) { tflags[10] = 1; M.say(say('time10', {}), { pri: 4, ttl: 4000 }); lastCommentary = t; }
    // lời lấp chỗ trống
    if (t - lastCommentary < gap || M.cur || M.q.length) return;
    lastCommentary = t;
    const r = rnd();
    if (gapPct >= 22 && r < 0.4) M.say(say('dominate', { team: tn(lead.id), pct: pct(lead) }), { pri: 2, ttl: 5000 });
    else if (gapPct <= 4 && bt < 50 && r < 0.5) M.say(say('close', { gap: Math.max(1, gapPct) }), { pri: 2, ttl: 5000 });
    else if (r < 0.3) M.say(say('stats', { stats: S.teams.map((x, i) => tn(i) + ' ' + num(x.units + x.structs) + ' đơn vị').join(', ') }), { pri: 1, ttl: 5000 });
    else if (r < 0.55) { const top = [...S.players.values()].filter(p => p.mc > 0).sort((a, b) => b.mc - a.mc)[0]; if (top) M.say(say('donor', { name: cleanName(top.name), mc: top.mc }), { pri: 2, ttl: 5000 }); else M.say(pick('cheer', B.cheer), { pri: 1, ttl: 5000 }); }
    else if (r < 0.68) { const x = S.teams.slice().sort((a, b) => b.coins - a.coins)[0]; if (x && x.coins > 0) M.say(say('coinPool', { team: tn(x.id), coins: x.coins }), { pri: 1, ttl: 5000 }); }
    else M.say(pick('cheer', B.cheer), { pri: 1, ttl: 5000 });
  }
  function lobbyTalk() {
    const left = Math.ceil(S.phaseT), f = st().mcFreq || 2;
    for (const s of [10, 5]) if (left <= s && left > s - 2 && !lobbySaid[s] && G.settings.lobbySec > s + 3) { lobbySaid[s] = 1; M.say(say('lobbyTick', { secs: num(s), howto: howto() }), { pri: 3, ttl: 4000, key: 'lt' }); return; }
    if (nowMs() < M.holdUntil || M.cur || M.q.length) return;
    if (coolOk('lobbyfill', [0, 22000, 14000, 9000][f])) {
      const cnt = S.teams.map((t, i) => { let n = 0; S.players.forEach(p => { if (p.team === i) n++; }); return n; });
      let weak = 0; cnt.forEach((n, i) => { if (n < cnt[weak]) weak = i; });
      if (cnt.reduce((a, b) => a + b, 0) > 0) M.say(say('lobbyFill', { stats: cnt.map((n, i) => tn(i) + ' ' + num(n) + ' người').join(', '), weak: tn(weak) }), { pri: 1, ttl: 5000 });
      else M.say(pick('cheer', B.cheer), { pri: 1, ttl: 5000 });
    }
  }

  let lastAn = 0;
  setInterval(function () {
    try {
      const t = nowMs(); pump(); flushJoins(false); flushGifts(false); flushTaps(false);
      if (t - lastAn >= 1000) {
        lastAn = t; if (!st().mcOn || !S.teams.length) return;
        if (S.phase === 'battle') commentary(); else if (S.phase === 'lobby') lobbyTalk();
      }
      if (hasTTS() && speechSynthesis.paused && M.cur) speechSynthesis.resume();
    } catch (e) { console.error('mc', e); }
  }, 180);

  M.test = function () {
    M.say('Xin chào, mình là NghiaMC của Đại Chiến Lãnh Thổ. Mic đang hoạt động tốt, cả nhà nghe rõ không?', { pri: 5, ttl: 9000, key: 'test' });
  };
  M.status = function () {
    if (!hasTTS()) return '⚠️ Trình duyệt không hỗ trợ giọng đọc — NghiaMC vẫn dẫn bằng phụ đề';
    if (!M.voices.length) return '⚪ Chưa thấy giọng tiếng Việt — dùng giọng mặc định của máy (hoặc chỉ phụ đề)';
    return '🟢 Giọng đọc: ' + (M.voice ? M.voice.name : 'mặc định') + ' (' + M.voices.length + ' giọng tiếng Việt)';
  };
})();
