// テーマ切替: 自動（端末設定）→ ライト → ダーク → 自動…の3状態を循環する。
// 選択は localStorage に保存され、head の先行スクリプトが描画前に html[data-theme] へ反映する（チラつき防止）。
(function () {
  var root = document.documentElement;
  var meta = document.querySelector('meta[name="theme-color"]');
  function stored() {
    try { return localStorage.getItem("theme"); } catch (e) { return null; }
  }
  function effective() {
    var t = root.dataset.theme;
    if (t === "dark" || t === "light") return t;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  function label() {
    var t = stored();
    return t === "dark" ? "テーマ: ダーク" : t === "light" ? "テーマ: ライト" : "テーマ: 自動";
  }
  function applyMeta() {
    if (meta) meta.setAttribute("content", effective() === "dark" ? "#171512" : "#faf7f2");
  }
  var btn = document.getElementById("theme-toggle");
  if (btn) {
    btn.textContent = label();
    btn.addEventListener("click", function () {
      var cur = stored();
      var next = cur === null ? "light" : cur === "light" ? "dark" : null;
      try {
        if (next === null) {
          localStorage.removeItem("theme");
          delete root.dataset.theme;
        } else {
          localStorage.setItem("theme", next);
          root.dataset.theme = next;
        }
      } catch (e) { /* 保存できない環境では今回の表示だけ切り替わる */ }
      btn.textContent = label();
      applyMeta();
    });
  }
  applyMeta();
})();
