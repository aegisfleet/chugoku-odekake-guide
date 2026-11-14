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

(function () {
  var grid = document.getElementById("places-grid");
  if (!grid) return;
  var state = { kind: "all", q: "" };
  var input = document.getElementById("header-search-input");
  var form = document.getElementById("header-search");
  var scrolled = false;

  function apply() {
    var terms = state.q.split(/[\s　]+/).filter(Boolean);
    var visible = 0, total = 0;
    grid.querySelectorAll(".place-card").forEach(function (card) {
      total++;
      var kindOk = state.kind === "all" || card.getAttribute("data-kind") === state.kind;
      var text = card.getAttribute("data-search") || "";
      var qOk = terms.every(function (t) { return text.indexOf(t) !== -1; });
      var show = kindOk && qOk;
      card.style.display = show ? "" : "none";
      if (show) visible++;
    });
    var note = document.getElementById("empty-note");
    if (note) note.hidden = visible !== 0;
    var count = document.getElementById("result-count");
    if (count) {
      if (state.kind !== "all" || state.q) {
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
      state.kind = btn.getAttribute("data-filter-kind");
      apply();
    });
  });

  if (input) {
    var initial = new URLSearchParams(location.search).get("q");
    if (initial) {
      input.value = initial;
      state.q = initial.toLowerCase().trim();
    }
    input.addEventListener("input", function () {
      state.q = input.value.toLowerCase().trim();
      apply();
      if (state.q && !scrolled) {
        grid.scrollIntoView({ behavior: "smooth", block: "start" });
        scrolled = true;
      }
      if (!state.q) scrolled = false;
    });
  }
  if (form) {
    // トップページでは送信せず、その場で絞り込む（他ページでは通常送信され、トップへ ?q= で遷移する）
    form.addEventListener("submit", function (e) { e.preventDefault(); apply(); });
  }
  apply();
})();
