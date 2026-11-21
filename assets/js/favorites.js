// お気に入り: この端末のブラウザ（localStorage）にスポットの slug を保存する。サーバー送信はしない
// 担当: カード／詳細ページのお気に入りボタン、ヘッダーの件数バッジ、お気に入りページの index.json 動的描画と絞り込み
(function () {
  var KEY = "odekake-favorites-v1";
  var KIND_LABEL = { shop: "お店", spot: "観光スポット", event: "イベント", stay: "温泉・宿泊", activity: "体験・おでかけ" };
  var KIND_CLASS = { shop: "badge--shop", spot: "badge--spot", event: "badge--event", stay: "badge--stay", activity: "badge--activity" };
  var SVG_HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-8-5.5-10-10C.5 7 3 4 6.5 4c2 0 3.5 1 4.5 2.5C12 5 13.5 4 15.5 4 19 4 21.5 7 20 11c-2 4.5-8 10-8 10z"/></svg>';
  var SVG_PIN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg>';
  var SVG_IG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>';

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
  var placesCache = null;
  var loadingPromise = null;
  var favFilter = { pref: "all", kind: "all" };

  function isFav(slug) { return favs.indexOf(slug) !== -1; }

  function esc(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function startOfDayMs(d) {
    var x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x.getTime();
  }

  function parseDateMs(ymd) {
    if (!ymd) return NaN;
    var parts = String(ymd).split("-");
    if (parts.length !== 3) return NaN;
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)).getTime();
  }

  function buildCardHTML(item, searchUrl) {
    var todayMs = startOfDayMs(new Date());
    var addedMs = parseDateMs(item.added_at);
    var ageDays = isNaN(addedMs) ? -1 : Math.floor((todayMs - addedMs) / 86400000);
    var isNew = ageDays >= 0 && ageDays < 14;

    var ended = false;
    var evBadge = "";
    var daysToStart = 0;
    if (item.kind === "event" && item.period && item.period.start && item.period.end) {
      var sMs = parseDateMs(item.period.start);
      var eMs = parseDateMs(item.period.end);
      if (!isNaN(eMs) && todayMs > eMs) {
        ended = true;
      } else if (!isNaN(sMs) && !isNaN(eMs)) {
        if (sMs <= todayMs) {
          evBadge = Math.floor((eMs - todayMs) / 86400000) <= 7 ? "ending" : "live";
        } else {
          evBadge = "soon";
          daysToStart = Math.floor((sMs - todayMs) / 86400000);
        }
      }
    }

    var classes = "place-card" + (item.featured ? " place-card--featured" : "") + (ended ? " place-card--ended" : "");
    var kindClass = KIND_CLASS[item.kind] || "";
    var kindLabel = KIND_LABEL[item.kind] || item.kind;
    var placeHref = item.rel_url || item.url || "#";

    var badges = '<a class="badge ' + esc(kindClass) + '" href="' + esc(searchUrl) + '?kind=' + encodeURIComponent(item.kind) + '">' + esc(kindLabel) + '</a>';
    if (isNew) badges += '<span class="badge badge--new">New</span>';
    if (evBadge === "live") badges += '<span class="badge badge--live">開催中</span>';
    if (evBadge === "ending") badges += '<span class="badge badge--ending">まもなく終了</span>';
    if (evBadge === "soon") badges += '<span class="badge badge--soon">あと' + daysToStart + '日</span>';
    if (Array.isArray(item.tags)) {
      item.tags.forEach(function (t) {
        badges += '<a class="tag" href="' + esc(searchUrl) + '?tag=' + encodeURIComponent(t) + '">' + esc(t) + '</a>';
      });
    }
    if (item.has_notices) {
      badges += '<span class="tag tag--notice">お知らせあり</span>';
    }

    var periodHTML = "";
    if (item.kind === "event" && item.period && item.period.start && item.period.end) {
      periodHTML = '<p class="period">開催期間: ' + esc(item.period.start) + ' 〜 ' + esc(item.period.end) + (ended ? '（終了）' : '') + '</p>';
    }

    var handleHTML = item.author ? ' <span class="btn-handle">' + esc(item.author) + '</span>' : '';

    return '<article class="' + classes + '" data-kind="' + esc(item.kind) + '" data-slug="' + esc(item.slug) + '" data-prefecture="' + esc(item.prefecture) + '">' +
      '<button class="fav-btn is-fav" type="button" data-fav-slug="' + esc(item.slug) + '" aria-pressed="true" aria-label="お気に入りから外す">' + SVG_HEART + '</button>' +
      '<div class="badges">' + badges + '</div>' +
      '<h2 class="place-name"><a href="' + esc(placeHref) + '">' + esc(item.name) + '</a></h2>' +
      '<p class="area">' + SVG_PIN + esc(item.prefecture) + ' / ' + esc(item.area) + '</p>' +
      periodHTML +
      '<p class="summary">' + esc(item.summary) + '</p>' +
      '<div class="actions">' +
      '<a class="btn btn--instagram" href="' + esc(item.instagram_url) + '" rel="noopener" target="_blank">' + SVG_IG + 'Instagramで見る' + handleHTML + '</a>' +
      '<a class="btn btn--maps" href="' + esc(item.maps_url) + '" rel="noopener" target="_blank">' + SVG_PIN + 'Googleマップ</a>' +
      '</div>' +
      '</article>';
  }

  function fetchPlaces(indexUrl) {
    if (placesCache) return Promise.resolve(placesCache);
    if (loadingPromise) return loadingPromise;
    loadingPromise = fetch(indexUrl)
      .then(function (res) { return res.ok ? res.json() : []; })
      .then(function (data) {
        placesCache = Array.isArray(data) ? data : [];
        return placesCache;
      })
      .catch(function () {
        placesCache = [];
        return placesCache;
      });
    return loadingPromise;
  }

  function paintButtonsAndBadges() {
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
  }

  // お気に入りページ: index.json から登録済みスポットだけを動的描画し、県・カテゴリ絞り込みと全件クリアを提供する
  function paintFavPage() {
    var grid = document.getElementById("fav-grid");
    if (!grid) return;
    var toolbar = document.getElementById("fav-toolbar");
    var countEl = document.getElementById("fav-count-text");
    var emptyEl = document.getElementById("fav-empty");
    var filterEmptyEl = document.getElementById("fav-filter-empty");
    var searchUrl = grid.getAttribute("data-search-url") || "/search/";
    var indexUrl = grid.getAttribute("data-index-url") || "/index.json";

    if (favs.length === 0) {
      grid.innerHTML = "";
      if (toolbar) toolbar.hidden = true;
      if (countEl) countEl.textContent = "";
      if (filterEmptyEl) filterEmptyEl.hidden = true;
      if (emptyEl) emptyEl.hidden = false;
      grid.classList.add("is-ready");
      return;
    }

    fetchPlaces(indexUrl).then(function (allPlaces) {
      var favItems = allPlaces.filter(function (item) { return item && item.slug && isFav(item.slug); });
      if (favItems.length === 0) {
        grid.innerHTML = "";
        if (toolbar) toolbar.hidden = true;
        if (countEl) countEl.textContent = "";
        if (filterEmptyEl) filterEmptyEl.hidden = true;
        if (emptyEl) emptyEl.hidden = false;
        grid.classList.add("is-ready");
        return;
      }

      if (emptyEl) emptyEl.hidden = true;
      if (toolbar) toolbar.hidden = false;

      var filtered = favItems.filter(function (item) {
        if (favFilter.pref !== "all" && item.prefecture !== favFilter.pref) return false;
        if (favFilter.kind !== "all" && item.kind !== favFilter.kind) return false;
        return true;
      });

      grid.innerHTML = filtered.map(function (item) { return buildCardHTML(item, searchUrl); }).join("");
      if (countEl) {
        if (favFilter.pref !== "all" || favFilter.kind !== "all") {
          countEl.textContent = "お気に入り " + favItems.length + "件中 " + filtered.length + "件を表示";
        } else {
          countEl.textContent = "お気に入り " + favItems.length + "件";
        }
      }
      if (filterEmptyEl) filterEmptyEl.hidden = filtered.length !== 0;
      grid.classList.add("is-ready");
    });
  }

  function paint() {
    paintButtonsAndBadges();
    paintFavPage();
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

  function initFavControls() {
    var prefSel = document.getElementById("fav-pref-filter");
    var kindSel = document.getElementById("fav-kind-filter");
    var clearBtn = document.getElementById("fav-clear-all");
    if (prefSel) {
      prefSel.addEventListener("change", function () {
        favFilter.pref = prefSel.value;
        paintFavPage();
      });
    }
    if (kindSel) {
      kindSel.addEventListener("change", function () {
        favFilter.kind = kindSel.value;
        paintFavPage();
      });
    }
    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        if (!favs.length) return;
        favs = [];
        save(favs);
        favFilter.pref = "all";
        favFilter.kind = "all";
        if (prefSel) prefSel.value = "all";
        if (kindSel) kindSel.value = "all";
        paint();
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      initFavControls();
      paint();
    });
  } else {
    initFavControls();
    paint();
  }
})();
