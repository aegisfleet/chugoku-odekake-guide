// モバイル用メニュー: 下部タブバーの「メニュー」ボタンで、ヘッダーのナビとテーマ切替のパネルを開閉する
// あわせて検索ページでの「イベント」タブのアクティブ表示、ホームのAI開示アコーディオンも担当する
(function () {
  var panel = document.getElementById("header-actions");
  var tabMenu = null; // タブバーはこのスクリプトより後ろに定義されるため、DOMContentLoaded 後に確定する

  function setTabState(open) {
    if (!tabMenu) return;
    tabMenu.setAttribute("aria-expanded", open ? "true" : "false");
    tabMenu.setAttribute("aria-label", open ? "メニューを閉じる" : "メニューを開く");
  }
  function close() {
    if (!panel) return;
    panel.classList.remove("is-open");
    setTabState(false);
  }
  function toggle() {
    if (!panel) return false;
    var open = panel.classList.toggle("is-open");
    setTabState(open);
    return open;
  }

  if (panel) {
    panel.querySelectorAll("a").forEach(function (a) { a.addEventListener("click", close); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
    document.addEventListener("click", function (e) {
      if (!panel.classList.contains("is-open")) return;
      if (panel.contains(e.target)) return;
      // タブバーの「メニュー」ボタン自身のクリックは外側クリックとして扱わない
      // （扱うと、閉じるための2回目のタップで閉じた直後に toggle が再表示してしまう）
      if (e.target.closest && e.target.closest("#tabbar-menu")) return;
      close();
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    // 下部タブバーの「メニュー」: 先頭へ戻ってヘッダーパネルを開閉する
    tabMenu = document.getElementById("tabbar-menu");
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
  });
})();
