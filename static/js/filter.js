// トップページの大ジャンル絞り込み（クライアント側のみ・データは書き換えない）
document.querySelectorAll(".filter-btn").forEach(function (btn) {
  btn.addEventListener("click", function () {
    document.querySelectorAll(".filter-btn").forEach(function (b) { b.classList.remove("is-active"); });
    btn.classList.add("is-active");
    var kind = btn.getAttribute("data-filter-kind");
    var visible = 0;
    document.querySelectorAll("#places-grid .place-card").forEach(function (card) {
      var show = kind === "all" || card.getAttribute("data-kind") === kind;
      card.style.display = show ? "" : "none";
      if (show) visible++;
    });
    document.getElementById("empty-note").hidden = visible !== 0;
  });
});
