// モバイル用ハンバーガーメニュー: ヘッダーのナビとテーマ切替を開閉パネルにまとめる（広い画面では常時表示で、この処理は見た目に影響しない）
(function () {
  var btn = document.getElementById("menu-toggle");
  var panel = document.getElementById("header-actions");
  if (!btn || !panel) return;
  function close() {
    panel.classList.remove("is-open");
    btn.setAttribute("aria-expanded", "false");
    btn.setAttribute("aria-label", "メニューを開く");
  }
  btn.addEventListener("click", function () {
    var open = panel.classList.toggle("is-open");
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    btn.setAttribute("aria-label", open ? "メニューを閉じる" : "メニューを開く");
  });
  panel.querySelectorAll("a").forEach(function (a) { a.addEventListener("click", close); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  document.addEventListener("click", function (e) {
    if (panel.classList.contains("is-open") && !panel.contains(e.target) && !btn.contains(e.target)) close();
  });
})();
