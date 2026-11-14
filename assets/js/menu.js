// モバイル用ハンバーガーメニュー: ヘッダーのナビとテーマ切替を開閉パネルにまとめる（広い画面では常時表示で、この処理は見た目に影響しない）
// あわせて下部タブバーの「メニュー」ボタン、検索ページでの「イベント」タブのアクティブ表示、ホームのAI開示アコーディオンも担当する
(function () {
  var btn = document.getElementById("menu-toggle");
  var panel = document.getElementById("header-actions");
  function close() {
    if (!panel) return;
    panel.classList.remove("is-open");
    if (btn) {
      btn.setAttribute("aria-expanded", "false");
      btn.setAttribute("aria-label", "メニューを開く");
    }
  }
  function toggle() {
    if (!panel) return false;
    var open = panel.classList.toggle("is-open");
    if (btn) {
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      btn.setAttribute("aria-label", open ? "メニューを閉じる" : "メニューを開く");
    }
    return open;
  }
  if (btn && panel) {
    btn.addEventListener("click", toggle);
    panel.querySelectorAll("a").forEach(function (a) { a.addEventListener("click", close); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
    document.addEventListener("click", function (e) {
      if (panel.classList.contains("is-open") && !panel.contains(e.target) && !btn.contains(e.target)) close();
    });
  }
  // 下部タブバーの「メニュー」: 先頭へ戻ってヘッダーパネルを開閉する
  var tabMenu = document.getElementById("tabbar-menu");
  if (tabMenu) {
    tabMenu.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
      setTimeout(toggle, 250);
    });
  }
  // 検索ページで kind=event のときは「イベント」タブをアクティブにする
  if (/\/search\/?$/.test(location.pathname)) {
    var kind = new URLSearchParams(location.search).get("kind");
    var searchTab = document.querySelector('[data-tab="search"]');
    var eventsTab = document.querySelector('[data-tab="events"]');
    if (kind === "event" && searchTab && eventsTab) {
      searchTab.classList.remove("is-active");
      eventsTab.classList.add("is-active");
    }
  }
  // ホームのAI開示アコーディオン（モバイルのみ見た目に影響）
  var aiToggle = document.getElementById("ai-note-toggle");
  var aiBanner = document.getElementById("ai-banner");
  if (aiToggle && aiBanner) {
    aiToggle.addEventListener("click", function () {
      var open = aiBanner.classList.toggle("is-open");
      aiToggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }
})();
