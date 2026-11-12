/* ===== Bản đồ: lưới 28x40, tạo 1/4 rồi đối xứng 4 chiều + tường biên 4 phía ===== */
(function () {
  'use strict';
  const G = window.G; let COLS = G.COLS, ROWS = G.ROWS;
  G.arenaHooks.push(() => { COLS = G.COLS; ROWS = G.ROWS; });

  // Căn cứ sát góc để sàn đấu rộng mở, có chiều sâu
  G.basePos = function (tc) {
    const cx = Math.floor(COLS / 2);
    const m = 2; // margin từ biên
    const b = ROWS - 1 - m;
    if (tc === 2) return [[cx, m + 1], [cx, b - 1]];
    if (tc === 3) return [[cx, m + 1], [m + 1, b - 1], [COLS - 2 - m, b - 1]];
    // 4 đội: 4 góc
    return [[m + 1, m + 1], [COLS - 2 - m, m + 1], [m + 1, b - 1], [COLS - 2 - m, b - 1]];
  };

  // ASCII 1/4 góc trên-trái: 12 cột x 17 hàng. # = đá, ~ = nước (chặn đi, đạn bay qua được)
  const Q = {
    arena: [
      '............', '............', '............', '............', '............',
      '....##......', '....##......', '............', '............', '..#.........',
      '..#....##...', '........##..', '............', '............', '......#.....',
      '............', '..........##'],
    maze: [
      '............', '............', '............', '.####.####..', '............',
      '............', '..#.....#...', '..#.....#...', '..#..###....', '..#.........',
      '..####.####.', '............', '............', '.##.....##..', '.##.....##..',
      '............', '....####....'],
    islands: [
      '............', '............', '............', '............', '..~~~.......',
      '.~~~~~......', '.~~~~.......', '..~~........', '............', '........~~..',
      '.......~~~~.', '.......~~~~.', '........~~..', '............', '............',
      '..~.........', '~~~.........'],
    cross: [
      '............', '............', '............', '............', '..#######...',
      '..#######...', '..#######...', '..#######...', '............', '............',
      '..####......', '..####......', '............', '............', '......####..',
      '......####..', '............'],
  };

  function fromAscii(rows) {
    return (set, tc) => {
      for (let r = 0; r < 17; r++) for (let c = 0; c < 12; c++) {
        const ch = rows[r][c];
        if (ch === '#') set(c, r, 1); else if (ch === '~') set(c, r, 2);
      }
    };
  }

  G.MAPS = [
    { id: 'arena', name: 'Đấu Trường', desc: 'Sân rộng, vài cột đá — đánh thẳng', theme: { wall: '#6a5a96', wallTop: '#9a88d0', water: '#1c4f8c', bg: '#120a26' }, gen: fromAscii(Q.arena) },
    {
      id: 'river', name: 'Hai Bờ Sông', desc: 'Sông chia đôi, chỉ qua được ở các cầu', theme: { wall: '#7a6a4a', wallTop: '#b09a68', water: '#1d6fa8', bg: '#0b1a26' },
      gen(set, tc) {
        for (let c = 0; c < 12; c++) { if (c === 2 || c === 3 || c >= 10) continue; set(c, 16, 2); set(c, 15, 2); }
        set(4, 14, 1); set(8, 14, 1); set(1, 13, 1); set(9, 12, 1); set(6, 12, 1);
        if (tc >= 3) for (let r = 0; r < 17; r++) { if (r === 7 || r === 8 || r >= 14) continue; set(11, r, 2); set(10, r, 2); }
      }
    },
    { id: 'maze', name: 'Mê Cung', desc: 'Tường chắn, đi vòng, phục kích', theme: { wall: '#5a4a7a', wallTop: '#8672b4', water: '#1c3f8c', bg: '#100a22' }, gen: fromAscii(Q.maze) },
    {
      id: 'diamond', name: 'Kim Cương', desc: 'Vòng đá trung tâm, 4 cổng vào', theme: { wall: '#2a8a8a', wallTop: '#6ae0d8', water: '#18548c', bg: '#071a22' },
      gen(set) {
        for (let r = 0; r < 17; r++) for (let c = 0; c < 12; c++) {
          const dx = 11.5 - c, dy = 16.5 - r, d = dx + dy;
          if (d > 6.2 && d < 8.6 && dx > 1.8 && dy > 1.8) set(c, r, 1);
        }
        set(5, 11, 1); set(5, 12, 1); set(2, 15, 1); set(3, 15, 1); set(8, 4, 1); set(9, 4, 1); set(9, 5, 1);
      }
    },
    { id: 'islands', name: 'Đảo Hoang', desc: 'Hồ nước rải rác, tuyến đường uốn lượn', theme: { wall: '#6a5a96', wallTop: '#9a88d0', water: '#1a7aa0', bg: '#081c24' }, gen: fromAscii(Q.islands) },
    { id: 'cross', name: 'Chữ Thập', desc: 'Khối đá lớn, đường đi hẹp', theme: { wall: '#8a4a5a', wallTop: '#c47a8a', water: '#1c4f8c', bg: '#1a0a14' }, gen: fromAscii(Q.cross) },
    {
      id: 'rocks', name: 'Bãi Đá', desc: 'Đá rải ngẫu nhiên (mỗi trận một khác)', theme: { wall: '#6a6a7a', wallTop: '#a4a4b8', water: '#1c4f8c', bg: '#12121c' }, random: true, native: true,
      gen(set, tc, rng, hr) { for (let r = 0; r < hr; r++) for (let c = 0; c < 16; c++) if (rng() < 0.13) set(c, r, 1); }
    },
    {
      id: 'chaos', name: 'Hỗn Loạn', desc: 'Đá + nước ngẫu nhiên, khó đoán', theme: { wall: '#7a4aa0', wallTop: '#b47ae0', water: '#1a6a9a', bg: '#150a24' }, random: true, native: true,
      gen(set, tc, rng, hr) { for (let r = 0; r < hr; r++) for (let c = 0; c < 16; c++) { const x = rng(); if (x < 0.09) set(c, r, 1); else if (x < 0.15) set(c, r, 2); } }
    },
  ];
  G.mapById = id => G.MAPS.find(m => m.id === id) || G.MAPS[0];

  /** Trả về { wall:Uint8Array, bases:[[c,r]...] }. */
  G.buildMap = function (mapId, tc) {
    const m = G.mapById(mapId), wall = new Uint8Array(COLS * ROWS);
    const rng = G.mulberry(m.random ? (Math.random() * 1e9) | 0 : 12345);
    const halfR = Math.ceil(ROWS / 2);
    const halfC = Math.floor(COLS / 2);
    // scale 1/4 ASCII (12x17) → halfC x halfR
    const set = (c, r, v) => {
      const sc = Math.round(c * (halfC - 1) / 11);
      const sr = Math.round(r * (halfR - 1) / 16);
      for (const [cc, rr] of [
        [sc, sr], [COLS - 1 - sc, sr],
        [sc, ROWS - 1 - sr], [COLS - 1 - sc, ROWS - 1 - sr]
      ]) {
        if (cc >= 0 && rr >= 0 && cc < COLS && rr < ROWS) wall[rr * COLS + cc] = v;
      }
    };
    m.gen(set, tc, rng, halfR);

    // === 4 bức tường dựng đứng quanh 4 cạnh (vật cản + chiều sâu) ===
    const border = 1;
    for (let c = 0; c < COLS; c++) {
      for (let t = 0; t < border; t++) {
        wall[t * COLS + c] = 1;                         // top
        wall[(ROWS - 1 - t) * COLS + c] = 1;            // bottom
      }
    }
    for (let r = 0; r < ROWS; r++) {
      for (let t = 0; t < border; t++) {
        wall[r * COLS + t] = 1;                         // left
        wall[r * COLS + (COLS - 1 - t)] = 1;            // right
      }
    }

    const bases = G.basePos(tc);
    // dọn quanh căn cứ (rộng hơn một chút)
    for (const [bc, br] of bases) for (let r = br - 4; r <= br + 4; r++) for (let c = bc - 4; c <= bc + 4; c++) {
      if (c >= 0 && r >= 0 && c < COLS && r < ROWS && (c - bc) ** 2 + (r - br) ** 2 <= 18) wall[r * COLS + c] = 0;
    }
    // đảm bảo các căn cứ nối được với nhau
    for (let guard = 0; guard < 4; guard++) {
      const seen = new Uint8Array(COLS * ROWS), q = [bases[0][1] * COLS + bases[0][0]];
      seen[q[0]] = 1;
      for (let i = 0; i < q.length; i++) {
        const c = q[i] % COLS, r = (q[i] / COLS) | 0;
        for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nc = c + dc, nr = r + dr;
          if (nc < 0 || nr < 0 || nc >= COLS || nr >= ROWS) continue;
          const k = nr * COLS + nc; if (seen[k] || wall[k]) continue; seen[k] = 1; q.push(k);
        }
      }
      let fixed = true;
      for (let i = 1; i < bases.length; i++) {
        const [bc, br] = bases[i];
        if (!seen[br * COLS + bc]) {
          fixed = false; let c = bc, r = br; const [tc0, tr0] = bases[0];
          while (r !== tr0) { r += Math.sign(tr0 - r); wall[r * COLS + c] = 0; wall[r * COLS + Math.min(COLS - 1, c + 1)] = 0; }
          while (c !== tc0) { c += Math.sign(tc0 - c); wall[r * COLS + c] = 0; wall[Math.min(ROWS - 1, r + 1) * COLS + c] = 0; }
        }
      }
      if (fixed) break;
    }
    return { wall, bases };
  };
})();
