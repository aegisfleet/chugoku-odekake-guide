// 絞り込み・キーワード検索（クライアント側のみ・データは書き換えない）
// トップページ: 大ジャンル（ボタン data-filter-kind × カード data-kind）とキーワード検索（ヘッダーの検索欄 × カード data-search）の併用
// アカウント一覧: ジャンル（ボタン data-filter-genre × カード data-genres、"|" 区切りの複数値）
function bindGenreFilter() {
  document.querySelectorAll(".filter-btn[data-filter-genre]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".filter-btn[data-filter-genre]").forEach(function (b) { b.classList.remove("is-active"); });
      btn.classList.add("is-active");
      var value = btn.getAttribute("data-filter-genre");
      var visible = 0;
      document.querySelectorAll("#accounts-grid .place-card").forEach(function (card) {
        var genres = (card.getAttribute("data-genres") || "").split("|");
        var show = value === "all" || genres.indexOf(value) !== -1;
        card.style.display = show ? "" : "none";
        if (show) visible++;
      });
      var note = document.getElementById("empty-note");
      if (note) note.hidden = visible !== 0;
    });
  });
}
bindGenreFilter();

// トップページの大ジャンル絞り込み（キーワード検索は専用ページ /search/ が担当）
(function () {
  var grid = document.getElementById("places-grid");
  if (!grid) return;
  var kind = "all";
  function apply() {
    var visible = 0, total = 0;
    grid.querySelectorAll(".place-card").forEach(function (card) {
      total++;
      var show = kind === "all" || card.getAttribute("data-kind") === kind;
      card.style.display = show ? "" : "none";
      if (show) visible++;
    });
    var note = document.getElementById("empty-note");
    if (note) note.hidden = visible !== 0;
    var count = document.getElementById("result-count");
    if (count) {
      if (kind !== "all") {
        count.hidden = false;
        count.textContent = visible + "件を表示中（全" + total + "件）";
      } else {
        count.hidden = true;
      }
    }
  }
  document.querySelectorAll(".filter-btn[data-filter-kind]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".filter-btn[data-filter-kind]").forEach(function (b) { b.classList.remove("is-active"); });
      btn.classList.add("is-active");
      kind = btn.getAttribute("data-filter-kind");
      apply();
    });
  });
})();
