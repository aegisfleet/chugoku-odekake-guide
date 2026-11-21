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

  // シェア: モバイル等で Web Share API (navigator.share) が使える場合は優先し、非対応時のみクリップボードコピーへフォールバック
  var shareBtn = document.getElementById("share-btn");
  var shareLabel = document.getElementById("share-label");
  if (shareBtn && shareLabel) {
    shareBtn.addEventListener("click", function () {
      var shareUrl = window.location.href;
      var shareTitle = document.title;
      var useWebShare = typeof navigator.share === "function" &&
        (window.matchMedia("(max-width: 900px)").matches || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent));

      function copyFallback() {
        if (!navigator.clipboard) return;
        navigator.clipboard.writeText(shareUrl).then(function () {
          shareLabel.textContent = "URLをコピーしました";
          setTimeout(function () { shareLabel.textContent = "シェア"; }, 2500);
        }).catch(function () {
          shareLabel.textContent = "コピーできませんでした";
          setTimeout(function () { shareLabel.textContent = "シェア"; }, 2500);
        });
      }

      if (useWebShare) {
        navigator.share({ title: shareTitle, url: shareUrl }).catch(function (err) {
          // ユーザーキャンセル（AbortError）以外で失敗した場合はクリップボードへフォールバック
          if (err && err.name !== "AbortError") copyFallback();
        });
      } else {
        copyFallback();
      }
    });
  }

  // 「一覧・検索結果へ戻る」: サイト内（検索・トップ・お気に入り等）から遷移してきた場合はブラウザ履歴で戻り、絞り込み条件を維持する
  var backLink = document.getElementById("detail-back-link");
  if (backLink) {
    backLink.addEventListener("click", function (e) {
      if (document.referrer && document.referrer.indexOf(window.location.origin) === 0 && window.history.length > 1) {
        e.preventDefault();
        window.history.back();
      }
    });
  }
})();
