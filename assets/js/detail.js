(function () {
  // 関連投稿の絞り込み（すべて／公式／ユーザー訪問記録）
  var buttons = document.querySelectorAll(".post-filter-btn");
  var rows = document.querySelectorAll(".post-row");
  if (buttons.length && rows.length) {
    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        buttons.forEach(function (b) { b.classList.remove("is-active"); });
        btn.classList.add("is-active");
        var f = btn.getAttribute("data-filter");
        rows.forEach(function (row) {
          row.style.display = (f === "all" || row.getAttribute("data-cat") === f) ? "" : "none";
        });
      });
    });
  }
  // シェア: 現在のURLをコピーする
  var shareBtn = document.getElementById("share-btn");
  var shareLabel = document.getElementById("share-label");
  if (shareBtn && shareLabel && navigator.clipboard) {
    shareBtn.addEventListener("click", function () {
      navigator.clipboard.writeText(window.location.href).then(function () {
        shareLabel.textContent = "URLをコピーしました";
        setTimeout(function () { shareLabel.textContent = "シェア"; }, 2500);
      }).catch(function () {
        shareLabel.textContent = "コピーできませんでした";
        setTimeout(function () { shareLabel.textContent = "シェア"; }, 2500);
      });
    });
  }
})();
