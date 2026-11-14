// 絞り込み（クライアント側のみ・データは書き換えない）
// トップページ: 大ジャンル（ボタン data-filter-kind × カード data-kind）
// アカウント一覧: ジャンル（ボタン data-filter-genre × カード data-genres、"|" 区切りの複数値）
function bindFilter(attr, gridId, match) {
  document.querySelectorAll(".filter-btn[" + attr + "]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".filter-btn[" + attr + "]").forEach(function (b) { b.classList.remove("is-active"); });
      btn.classList.add("is-active");
      var value = btn.getAttribute(attr);
      var visible = 0;
      document.querySelectorAll("#" + gridId + " .place-card").forEach(function (card) {
        var show = value === "all" || match(card, value);
        card.style.display = show ? "" : "none";
        if (show) visible++;
      });
      var note = document.getElementById("empty-note");
      if (note) note.hidden = visible !== 0;
    });
  });
}
bindFilter("data-filter-kind", "places-grid", function (card, v) {
  return card.getAttribute("data-kind") === v;
});
bindFilter("data-filter-genre", "accounts-grid", function (card, v) {
  return (card.getAttribute("data-genres") || "").split("|").indexOf(v) !== -1;
});
