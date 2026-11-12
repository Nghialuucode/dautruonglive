"""GameLive — chạy bằng Streamlit.

Streamlit nhúng nguyên game (HTML/CSS/JS) vào một khung iframe. Toàn bộ file game
nằm ngay ngoài gốc repo, app.py đọc rồi ghép thành một trang duy nhất.

    streamlit run app.py

Tham số trên URL (tuỳ chọn): ?clean=1 ẩn nút ⚙️ · ?demo=0 tắt demo · ?user=tenTikTok
"""
import base64
import json
import os
from urllib.parse import urlencode

HERE = os.path.dirname(os.path.abspath(__file__))
# Thứ tự nạp phải giống index.html
JS_ORDER = ["config.js", "audio.js", "maps.js", "game.js", "render.js", "mc.js", "cinema.js", "live.js", "ui.js", "main.js"]

# Biến khung iframe thành toàn màn hình thật (tràn viền, che cả thanh trạng thái), cùng nguồn nên được phép chỉnh trang cha
AUTOFIT = """<script>
(function () {
  try {
    var f = window.frameElement, P = window.parent, pd = P.document;
    if (!f) return;
    var BG = '#120a26';
    function meta(n, c) { var m = pd.querySelector('meta[name="' + n + '"]'); if (!m) { m = pd.createElement('meta'); m.setAttribute('name', n); pd.head.appendChild(m); } m.setAttribute('content', c); }
    var vp = pd.querySelector('meta[name="viewport"]');
    if (vp && vp.content.indexOf('viewport-fit') < 0) vp.setAttribute('content', vp.content + ',viewport-fit=cover');
    meta('theme-color', BG); meta('mobile-web-app-capable', 'yes'); meta('apple-mobile-web-app-capable', 'yes');
    meta('apple-mobile-web-app-status-bar-style', 'black-translucent');
    pd.documentElement.style.cssText += ';background:' + BG + ';overflow:hidden;overscroll-behavior:none';
    pd.body.style.cssText += ';background:' + BG + ';overflow:hidden;margin:0';
    f.setAttribute('allow', 'autoplay; fullscreen; encrypted-media'); f.setAttribute('allowfullscreen', '');
    function fit() {
      var s = f.style;
      ['position:fixed', 'top:0', 'left:0', 'width:100vw', 'height:100vh', 'z-index:2147483000', 'border:0', 'background:' + BG].forEach(function (d) {
        var kv = d.split(':'); s.setProperty(kv[0], kv[1], 'important');
      });
      s.setProperty('height', (P.innerHeight || 1000) + 'px', 'important');
    }
    fit(); window.addEventListener('resize', fit); P.addEventListener('resize', fit); P.addEventListener('orientationchange', fit);
  } catch (e) { }
})();
</script>
"""


REQUIRED = ["index.html", "style.css"] + JS_ORDER


def _find(name):
    """Tìm file ở gốc repo (không phân biệt hoa/thường); nếu không có thì tìm trong thư mục con."""
    stem = name.rsplit(".", 1)[0]
    wanted = {name.lower(), stem.lower()}  # chấp nhận cả file bị mất đuôi, ví dụ "index"
    best = None
    for root, dirs, files in os.walk(HERE):
        dirs[:] = [d for d in dirs if not d.startswith(".") and d != "__pycache__"]
        for f in files:
            if f.lower() in wanted:
                p = os.path.join(root, f)
                if root == HERE:
                    return p
                best = best or p
    return best


def _read(name):
    p = _find(name)
    if p is None:
        raise FileNotFoundError(name)
    with open(p, encoding="utf-8") as f:
        return f.read()


def missing_files():
    return [n for n in REQUIRED if _find(n) is None]


def _find_music():
    """Tìm file nhạc .mp3 ở gốc repo (ưu tiên tên có 'nhac'); chấp nhận cả tên có dấu như nhạc_game.mp3."""
    cands = []
    for root, dirs, files in os.walk(HERE):
        dirs[:] = [d for d in dirs if not d.startswith(".") and d != "__pycache__"]
        cands += [os.path.join(root, f) for f in files if f.lower().endswith(".mp3")]
    cands.sort(key=lambda p: (0 if "nh" in os.path.basename(p).lower() and "game" in os.path.basename(p).lower() else 1, len(p)))
    return cands[0] if cands else None


def music_b64():
    """Nhạc dưới dạng base64 để nhúng thẳng vào trang (iframe Streamlit không tải được file tĩnh ở gốc repo)."""
    p = _find_music()
    if not p or os.path.getsize(p) > 9_000_000:
        return ""
    with open(p, "rb") as f:
        return base64.b64encode(f.read()).decode("ascii")


def video_b64():
    """Video cinematic top1-3 (top_cinema.mp4) nhúng base64 nếu có và không quá lớn (tránh crash mobile)."""
    p = _find("top_cinema.mp4")
    # Giới hạn ~2.2MB file — đã nén, đủ sáng, không làm mobile reload
    if not p or os.path.getsize(p) > 2_200_000:
        return ""
    with open(p, "rb") as f:
        return base64.b64encode(f.read()).decode("ascii")


def build_html(query="", music="", video=""):
    """Ghép index.html + style.css + các file .js thành một trang HTML duy nhất."""
    html = _read("index.html")
    link = '<link rel="stylesheet" href="style.css">'
    assert link in html, "index.html thiếu thẻ link style.css"
    html = html.replace(link, "<style>\n" + _read("style.css") + "\n</style>")
    for name in JS_ORDER:
        tag = '<script src="%s"></script>' % name
        assert tag in html, "index.html thiếu thẻ script " + name
        js = _read(name)
        if name == "config.js":
            # trong iframe không có ?query thật → truyền tham số từ URL của Streamlit vào
            js = js.replace("location.search", json.dumps(query))
        js = js.replace("</script", "<\\/script")
        html = html.replace(tag, "<script>\n" + js + "\n</script>")
    scripts = []
    if music:
        scripts.append('window.GL_MUSIC_B64="' + music + '";')
    if video:
        scripts.append('window.GL_TOP_VIDEO_B64="' + video + '";')
    if scripts:
        html = html.replace("</head>", "<script>" + "".join(scripts) + "</script>\n</head>", 1)
    return html.replace("</body>", AUTOFIT + "</body>")


def main():
    import streamlit as st
    import streamlit.components.v1 as components

    st.set_page_config(page_title="GameLive", page_icon="🎮", layout="wide",
                       initial_sidebar_state="collapsed")
    st.markdown(
        """<style>
        header[data-testid="stHeader"], footer, #MainMenu, [data-testid="stToolbar"], [data-testid="stDecoration"] {display:none !important}
        html, body, .stApp, [data-testid="stAppViewContainer"] {background:#120a26 !important; overflow:hidden !important}
        .block-container {padding:0 !important; max-width:100% !important}
        iframe {border:0; display:block}
        </style>""",
        unsafe_allow_html=True,
    )
    qp = st.query_params
    keep = {k: str(qp[k]) for k in ("demo", "user", "clean") if k in qp}
    query = "?" + urlencode(keep) if keep else ""
    try:
        height = max(420, min(int(qp.get("h", 900)), 2400))
    except (TypeError, ValueError):
        height = 900
    miss = missing_files()
    if miss:
        st.error("Repo GitHub đang thiếu file game: " + ", ".join(miss))
        st.write("Hãy upload các file này ngay ngoài cùng của repo (không để trong thư mục), "
                 "rồi vào app bấm Reboot. Các file hiện có trong repo:")
        names = sorted(f for f in os.listdir(HERE) if not f.startswith("."))
        st.code("\n".join(names) or "(trống)")
        st.stop()
    @st.cache_resource(show_spinner=False)
    def _music():
        return music_b64()
    @st.cache_resource(show_spinner=False)
    def _video():
        return video_b64()

    components.html(build_html(query, _music(), _video()), height=height, scrolling=False)


try:
    from streamlit.runtime.scriptrunner import get_script_run_ctx
    _IN_STREAMLIT = get_script_run_ctx() is not None
except Exception:  # chạy ngoài Streamlit (ví dụ khi kiểm thử build_html)
    _IN_STREAMLIT = False

if _IN_STREAMLIT:
    main()
