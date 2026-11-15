// お気に入り: この端末のブラウザ（localStorage）にスポットの slug を保存する。サーバー送信はしない
// 担当: カード／詳細ページのお気に入りボタン、ヘッダーの件数バッジ、お気に入りページの絞り込み
(function () {
  var KEY = "odekake-favorites-v1";

  function load() {
    try {
      var v = JSON.parse(localStorage.getItem(KEY) || "[]");
      return Array.isArray(v) ? v.filter(function (x) { return typeof x === "string"; }) : [];
    } catch (e) { return []; }
  }
  function save(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) { /* 保存できない環境では何もしない */ }
  }

  var favs = load();

  function isFav(slug) { return favs.indexOf(slug) !== -1; }

  function paint() {
    document.querySelectorAll("[data-fav-slug]").forEach(function (btn) {
      var on = isFav(btn.getAttribute("data-fav-slug"));
      btn.classList.toggle("is-fav", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.setAttribute("aria-label", on ? "お気に入りから外す" : "お気に入りに追加");
    });
    document.querySelectorAll("[data-fav-count]").forEach(function (el) {
      el.textContent = String(favs.length);
      el.hidden = favs.length === 0;
    });
    paintFavPage();
  }

  // お気に入りページ: 登録済みのカードだけを残し、件数と空表示を切り替える
  function paintFavPage() {
    var grid = document.getElementById("fav-grid");
    if (!grid) return;
    var shown = 0;
    grid.querySelectorAll(".place-card").forEach(function (card) {
      var slug = card.getAttribute("data-slug");
      var show = slug && isFav(slug);
      card.style.display = show ? "" : "none";
      if (show) shown++;
    });
    var count = document.getElementById("fav-count-text");
    if (count) count.textContent = shown > 0 ? "お気に入り " + shown + "件" : "";
    var empty = document.getElementById("fav-empty");
    if (empty) empty.hidden = shown !== 0;
    grid.classList.add("is-ready");
  }

  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-fav-slug]");
    if (!btn) return;
    e.preventDefault();
    var slug = btn.getAttribute("data-fav-slug");
    if (isFav(slug)) {
      favs = favs.filter(function (x) { return x !== slug; });
    } else {
      favs.push(slug);
    }
    save(favs);
    paint();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", paint);
  } else {
    paint();
  }
})();
