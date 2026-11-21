// 検索ページ /search/ の絞り込み・並び替え・表示切替（クライアント側のみ・データは書き換えない）
// 対象はカードの data-* 属性（kind / prefecture / area / tags / 期間 / 注目度 / 反応数 / 検索文字列）
(function () {
  var grid = document.getElementById("search-grid");
  if (!grid) return;
  var cards = Array.prototype.slice.call(grid.querySelectorAll(".place-card"));
  var PREFS = ["広島県", "岡山県", "山口県", "島根県", "鳥取県"];
  var KIND_LABEL = { shop: "お店", spot: "観光スポット", event: "イベント", stay: "温泉・宿泊", activity: "体験・おでかけ" };
  var TIMING_LABEL = { today: "今日", weekend: "今週末", month: "今月中" };
  var SORT_VALID = { popular: 1, new: 1, ending: 1, likes: 1 };
  var PAGE_SIZE = 24;
  var INITIAL_TAG_LIMIT = 12;
  var INITIAL_AREA_LIMIT = 10;

  var state = {
    q: "",
    prefs: new Set(),
    areas: new Set(),
    kind: "all",
    tags: new Set(),
    timing: "none",
    hideEnded: false,
    sort: "popular",
    limit: PAGE_SIZE,
    tagsExpanded: false,
    areasExpanded: false
  };

  // 県フィルターは「チェックした県だけに絞る」。未選択（または全県チェック）＝全県が対象
  function prefFiltered() { return state.prefs.size > 0 && state.prefs.size < PREFS.length; }

  // 文字列正規化（NFKC + 小文字化 + カタカナ→ひらがな統一）
  function normalizeText(str) {
    if (!str) return "";
    var s = str;
    if (typeof s.normalize === "function") s = s.normalize("NFKC");
    s = s.toLowerCase();
    return s.replace(/[\u30a1-\u30f6]/g, function (ch) {
      return String.fromCharCode(ch.charCodeAt(0) - 0x60);
    });
  }

  function startOfDay(d) { var x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); }
  var todayStartMs = startOfDay(new Date());

  // カード属性を事前キャッシュして高速化
  var cardMeta = new Map();
  cards.forEach(function (c) {
    var tagStr = c.getAttribute("data-tags") || "";
    var tagList = tagStr.split("|").filter(Boolean);
    var endSec = parseInt(c.getAttribute("data-end") || "", 10);
    var isEnded = c.classList.contains("place-card--ended") || (!isNaN(endSec) && (endSec * 1000 + 86400000 - 1) < todayStartMs);
    cardMeta.set(c, {
      pref: c.getAttribute("data-prefecture") || "",
      area: c.getAttribute("data-area") || "",
      kind: c.getAttribute("data-kind") || "",
      tags: tagList,
      tagSet: new Set(tagList),
      search: normalizeText(c.getAttribute("data-search") || ""),
      start: parseInt(c.getAttribute("data-start") || "", 10),
      end: endSec,
      ended: isEnded,
      found: parseInt(c.getAttribute("data-found") || "0", 10),
      added: parseInt(c.getAttribute("data-added") || "0", 10),
      likes: parseInt(c.getAttribute("data-likes") || "0", 10)
    });
  });

  var input = document.getElementById("search-input");
  var clearBtn = document.getElementById("search-clear");
  var prefSelect = document.getElementById("search-pref");
  var sortSelect = document.getElementById("sort-select");
  var hideEndedCb = document.getElementById("hide-ended");
  var countEl = document.getElementById("results-count");
  var condEl = document.getElementById("results-cond");
  var tokensEl = document.getElementById("active-tokens");
  var footEl = document.getElementById("results-foot");
  var emptyEl = document.getElementById("search-empty");
  var moreWrap = document.getElementById("results-more-wrap");
  var moreBtn = document.getElementById("results-more-btn");
  var tagMoreBtn = document.getElementById("tag-more-btn");
  var areaMoreBtn = document.getElementById("area-more-btn");
  var areaLabelEl = document.getElementById("area-filter-label");
  var applyBtn = document.getElementById("sheet-apply");

  function timingWindow(kind) {
    var now = new Date();
    var today = startOfDay(now);
    if (kind === "today") return [today, today + 86400000 - 1];
    if (kind === "month") {
      var first = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      var last = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).getTime();
      return [first, last];
    }
    if (kind === "weekend") {
      var dow = now.getDay(); // 0=日曜
      var toSat = (6 - dow + 7) % 7;
      var sat = today + toSat * 86400000;
      return [sat, sat + 2 * 86400000 - 1];
    }
    return null;
  }

  // skipDimension: "pref" | "area" | "kind" | null (ファセット件数計算用)
  // extraTag: 特定タグを追加仮定して判定する場合に指定
  function matchesWith(card, skipDimension, extraTag) {
    var m = cardMeta.get(card);
    if (skipDimension !== "pref" && prefFiltered() && !state.prefs.has(m.pref)) return false;
    if (skipDimension !== "area" && state.areas.size && !state.areas.has(m.area)) return false;
    if (skipDimension !== "kind" && state.kind !== "all" && m.kind !== state.kind) return false;
    if (state.hideEnded && m.ended) return false;
    if (state.tags.size) {
      var ok = true;
      state.tags.forEach(function (t) { if (!m.tagSet.has(t)) ok = false; });
      if (!ok) return false;
    }
    if (extraTag && !m.tagSet.has(extraTag)) return false;
    if (state.q) {
      var terms = normalizeText(state.q).split(/[\s　]+/).filter(Boolean);
      for (var i = 0; i < terms.length; i++) {
        if (m.search.indexOf(terms[i]) === -1) return false;
      }
    }
    if (state.timing !== "none") {
      if (isNaN(m.start) || isNaN(m.end)) return false;
      var w = timingWindow(state.timing);
      if (!(m.start * 1000 <= w[1] && m.end * 1000 >= w[0])) return false;
    }
    return true;
  }

  function matches(card) {
    return matchesWith(card, null, null);
  }

  function sortCards(list) {
    var val = {
      popular: function (c) { return -cardMeta.get(c).found; },
      new: function (c) { return -cardMeta.get(c).added; },
      likes: function (c) { return -cardMeta.get(c).likes; },
      // 開催終了が近い順: 開催中・開催予定を終了日の昇順で先頭に並べ、期間なしスポット→終了済みイベントの順で後ろに回す
      ending: function (c) {
        var m = cardMeta.get(c);
        if (isNaN(m.end)) return 1e15;
        if (m.ended) return 2e15 - m.end;
        return m.end;
      }
    }[state.sort] || function (c) { return -cardMeta.get(c).found; };
    return list.map(function (c, i) { return [c, i]; })
      .sort(function (a, b) { var d = val(a[0]) - val(b[0]); return d !== 0 ? d : a[1] - b[1]; })
      .map(function (x) { return x[0]; });
  }

  // 県選択が変更されたとき、対象外の県の市・区選択を自動解除して矛盾0件を防ぐ
  function pruneIncompatibleAreas() {
    if (!prefFiltered()) return;
    document.querySelectorAll(".toggle-chip[data-area]").forEach(function (b) {
      var a = b.getAttribute("data-area");
      var p = b.getAttribute("data-area-pref");
      if (state.areas.has(a) && p && !state.prefs.has(p)) {
        state.areas.delete(a);
      }
    });
  }

  function syncClearBtn() {
    if (clearBtn) clearBtn.hidden = !input.value;
  }

  function syncPrefControls() {
    document.querySelectorAll("[data-pref]").forEach(function (cb) { cb.checked = state.prefs.has(cb.getAttribute("data-pref")); });
    if (state.prefs.size === 1) prefSelect.value = state.prefs.values().next().value;
    else if (prefFiltered()) prefSelect.value = "custom";
    else prefSelect.value = "all";
  }

  function syncSortControl() {
    if (sortSelect) sortSelect.value = state.sort;
  }

  // 市・区チップの県連動と折りたたみ制御
  function syncAreaVisibility() {
    var isPrefFiltered = prefFiltered();
    var areaBtns = Array.prototype.slice.call(document.querySelectorAll(".toggle-chip[data-area]"));
    if (areaLabelEl) {
      if (isPrefFiltered) {
        areaLabelEl.textContent = Array.from(state.prefs).join("・") + "の市・区";
      } else {
        areaLabelEl.textContent = "主要エリア（市・区）";
      }
    }
    var eligibleCount = 0;
    var hiddenCount = 0;
    areaBtns.forEach(function (b) {
      var areaName = b.getAttribute("data-area");
      var areaPref = b.getAttribute("data-area-pref");
      var isSelected = state.areas.has(areaName);
      if (isPrefFiltered) {
        var inPref = state.prefs.has(areaPref);
        b.hidden = !inPref && !isSelected;
        b.classList.remove("is-collapsed-area");
      } else {
        b.hidden = false;
        eligibleCount++;
        var shouldCollapse = !state.areasExpanded && eligibleCount > INITIAL_AREA_LIMIT && !isSelected;
        b.classList.toggle("is-collapsed-area", shouldCollapse);
        if (shouldCollapse) hiddenCount++;
      }
    });
    if (areaMoreBtn) {
      if (isPrefFiltered || eligibleCount <= INITIAL_AREA_LIMIT) {
        areaMoreBtn.hidden = true;
      } else {
        areaMoreBtn.hidden = false;
        areaMoreBtn.textContent = state.areasExpanded
          ? "折りたたむ"
          : "すべて表示（+" + hiddenCount + "）";
      }
    }
  }

  // タグの初期12件表示と「すべてのタグ」展開制御（選択中のタグは折りたたみ時も常時表示）
  function syncTagVisibility() {
    var tagBtns = Array.prototype.slice.call(document.querySelectorAll(".toggle-chip[data-tag]"));
    var hiddenCount = 0;
    tagBtns.forEach(function (b, idx) {
      var tagName = b.getAttribute("data-tag");
      var isSelected = state.tags.has(tagName);
      var shouldCollapse = !state.tagsExpanded && idx >= INITIAL_TAG_LIMIT && !isSelected;
      b.classList.toggle("is-collapsed-tag", shouldCollapse);
      if (shouldCollapse) hiddenCount++;
    });
    if (tagMoreBtn) {
      if (tagBtns.length <= INITIAL_TAG_LIMIT) {
        tagMoreBtn.hidden = true;
      } else {
        tagMoreBtn.hidden = false;
        tagMoreBtn.textContent = state.tagsExpanded
          ? "折りたたむ"
          : "すべてのタグ（+" + hiddenCount + "）";
      }
    }
  }

  // 動的ファセット件数の再計算と0件項目の減衰表示
  function updateFacetCounts() {
    var prefCounts = {};
    PREFS.forEach(function (p) { prefCounts[p] = 0; });
    var areaCounts = {};
    var kindCounts = { all: 0, shop: 0, spot: 0, event: 0, stay: 0, activity: 0 };
    var tagCounts = {};

    cards.forEach(function (c) {
      var m = cardMeta.get(c);
      if (matchesWith(c, "pref", null)) {
        prefCounts[m.pref] = (prefCounts[m.pref] || 0) + 1;
      }
      if (matchesWith(c, "area", null)) {
        areaCounts[m.area] = (areaCounts[m.area] || 0) + 1;
      }
      if (matchesWith(c, "kind", null)) {
        kindCounts.all++;
        if (kindCounts[m.kind] !== undefined) kindCounts[m.kind]++;
      }
      // タグは現在の全条件を満たすカード群の中で各タグを持つ件数を集計
      if (matchesWith(c, null, null)) {
        for (var i = 0; i < m.tags.length; i++) {
          var t = m.tags[i];
          tagCounts[t] = (tagCounts[t] || 0) + 1;
        }
      }
    });

    // 県件数
    document.querySelectorAll("[data-pref-count]").forEach(function (el) {
      var p = el.getAttribute("data-pref-count");
      var cnt = prefCounts[p] || 0;
      el.textContent = cnt;
      var label = el.closest(".pref-check");
      if (label) label.classList.toggle("is-zero", cnt === 0 && !state.prefs.has(p));
    });

    // 市・区件数
    document.querySelectorAll(".toggle-chip[data-area]").forEach(function (b) {
      var a = b.getAttribute("data-area");
      var cnt = areaCounts[a] || 0;
      var span = b.querySelector(".chip-count");
      if (span) span.textContent = cnt;
      b.classList.toggle("is-zero", cnt === 0 && !state.areas.has(a));
    });

    // カテゴリ件数（サイドバー & モバイルセグメント）
    document.querySelectorAll("[data-kind-count]").forEach(function (el) {
      var k = el.getAttribute("data-kind-count");
      var cnt = kindCounts[k] || 0;
      el.textContent = cnt;
      var label = el.closest(".kind-radio");
      if (label) label.classList.toggle("is-zero", cnt === 0 && state.kind !== k);
    });
    document.querySelectorAll("[data-seg-count]").forEach(function (el) {
      var k = el.getAttribute("data-seg-count");
      var cnt = kindCounts[k] || 0;
      el.textContent = cnt;
      var btn = el.closest(".seg");
      if (btn) btn.classList.toggle("is-zero", cnt === 0 && state.kind !== k);
    });

    // タグ件数
    document.querySelectorAll(".toggle-chip[data-tag]").forEach(function (b) {
      var t = b.getAttribute("data-tag");
      var cnt = tagCounts[t] || 0;
      var span = b.querySelector(".chip-count");
      if (span) span.textContent = cnt;
      b.classList.toggle("is-zero", cnt === 0 && !state.tags.has(t));
    });
  }

  function addToken(label, onRemove) {
    var span = document.createElement("span");
    span.className = "token";
    span.appendChild(document.createTextNode(label));
    var btn = document.createElement("button");
    btn.type = "button"; btn.textContent = "×"; btn.setAttribute("aria-label", label + " を外す");
    btn.addEventListener("click", onRemove);
    span.appendChild(btn);
    tokensEl.appendChild(span);
  }

  function renderTokens() {
    tokensEl.innerHTML = "";
    var any = false;
    function mark() { if (!any) { var l = document.createElement("span"); l.className = "tokens-label"; l.textContent = "適用中："; tokensEl.appendChild(l); any = true; } }
    if (state.q) { mark(); addToken("キーワード「" + state.q + "」", function () { state.q = ""; input.value = ""; syncClearBtn(); state.limit = PAGE_SIZE; apply(); }); }
    if (prefFiltered()) {
      state.prefs.forEach(function (p) { mark(); addToken(p, function () { state.prefs.delete(p); pruneIncompatibleAreas(); syncPrefControls(); syncToggleChips(); state.limit = PAGE_SIZE; apply(); }); });
    }
    state.areas.forEach(function (a) { mark(); addToken(a, function () { state.areas.delete(a); syncToggleChips(); state.limit = PAGE_SIZE; apply(); }); });
    if (state.kind !== "all") { mark(); addToken(KIND_LABEL[state.kind], function () { state.kind = "all"; syncKindRadios(); state.limit = PAGE_SIZE; apply(); }); }
    state.tags.forEach(function (t) { mark(); addToken("#" + t, function () { state.tags.delete(t); syncToggleChips(); state.limit = PAGE_SIZE; apply(); }); });
    if (state.timing !== "none") { mark(); addToken("開催時期：" + TIMING_LABEL[state.timing], function () { state.timing = "none"; syncTimingBtns(); state.limit = PAGE_SIZE; apply(); }); }
    if (state.hideEnded) { mark(); addToken("終了イベントを除外", function () { state.hideEnded = false; syncHideEnded(); state.limit = PAGE_SIZE; apply(); }); }
    if (any) {
      var clear = document.createElement("button");
      clear.type = "button"; clear.className = "token-clear-all"; clear.textContent = "条件をクリア";
      clear.addEventListener("click", resetAll);
      tokensEl.appendChild(clear);
    }
  }

  function condText() {
    var parts = [];
    if (state.prefs.size === 1) parts.push(state.prefs.values().next().value);
    else if (prefFiltered()) parts.push(state.prefs.size + "県");
    if (state.areas.size) parts.push(Array.from(state.areas).join("・"));
    if (state.kind !== "all") parts.push(KIND_LABEL[state.kind]);
    if (state.q) parts.push("「" + state.q + "」");
    return parts.length ? "（" + parts.join(" / ") + "）" : "";
  }

  function syncURL() {
    var p = new URLSearchParams();
    if (state.q) p.set("q", state.q);
    if (state.kind !== "all") p.set("kind", state.kind);
    if (prefFiltered()) p.set("pref", Array.from(state.prefs).join(","));
    if (state.areas.size) p.set("area", Array.from(state.areas).join(","));
    if (state.tags.size) p.set("tag", Array.from(state.tags).join(","));
    if (state.timing !== "none") p.set("timing", state.timing);
    if (state.hideEnded) p.set("hide_ended", "1");
    if (state.sort !== "popular") p.set("sort", state.sort);
    var qs = p.toString();
    history.replaceState(null, "", location.pathname + (qs ? "?" + qs : ""));
  }

  function apply() {
    var visible = cards.filter(matches);
    var ordered = sortCards(visible);
    var shown = ordered.slice(0, state.limit);
    var shownSet = new Set(shown);
    cards.forEach(function (c) { c.style.display = shownSet.has(c) ? "" : "none"; });
    shown.forEach(function (c) { grid.appendChild(c); });
    countEl.textContent = visible.length + " 件";
    condEl.textContent = condText();
    footEl.textContent = "全 " + cards.length + " 件中 " + (visible.length ? "1 〜 " + shown.length : "0") + " 件を表示中（該当 " + visible.length + " 件）";
    emptyEl.hidden = visible.length !== 0;

    if (moreWrap && moreBtn) {
      var remain = visible.length - shown.length;
      if (remain > 0) {
        moreWrap.hidden = false;
        moreBtn.textContent = "もっと見る（残り " + remain + " 件）";
      } else {
        moreWrap.hidden = true;
      }
    }

    if (applyBtn) {
      applyBtn.textContent = visible.length + "件を表示する";
    }

    updateFacetCounts();
    syncAreaVisibility();
    syncTagVisibility();
    renderTokens();
    syncURL();
    syncSegs();
    syncQuickTags();
    syncCardTags();
    syncTrendChips();
    var badge = document.getElementById("filter-badge");
    if (badge) {
      var n = (state.q ? 1 : 0) + (prefFiltered() ? 1 : 0) + state.areas.size +
        (state.kind !== "all" ? 1 : 0) + state.tags.size + (state.timing !== "none" ? 1 : 0) +
        (state.hideEnded ? 1 : 0);
      badge.hidden = n === 0;
      badge.textContent = n;
    }
  }

  function syncSegs() {
    document.querySelectorAll("[data-seg-kind]").forEach(function (b) {
      b.classList.toggle("is-active", b.getAttribute("data-seg-kind") === state.kind);
    });
  }
  function syncQuickTags() {
    document.querySelectorAll("[data-quick-tag]").forEach(function (b) {
      b.classList.toggle("is-on", state.tags.has(b.getAttribute("data-quick-tag")));
    });
  }
  function syncTrendChips() {
    document.querySelectorAll(".trend-chip").forEach(function (b) {
      b.classList.toggle("is-on", state.tags.has(b.getAttribute("data-term")));
    });
  }
  function syncCardTags() {
    document.querySelectorAll("[data-card-tag]").forEach(function (b) {
      b.classList.toggle("is-on", state.tags.has(b.getAttribute("data-card-tag")));
    });
  }

  function syncToggleChips() {
    document.querySelectorAll("[data-area]").forEach(function (b) {
      if (b.classList.contains("toggle-chip")) b.classList.toggle("is-on", state.areas.has(b.getAttribute("data-area")));
    });
    document.querySelectorAll("[data-tag]").forEach(function (b) {
      if (b.classList.contains("toggle-chip")) b.classList.toggle("is-on", state.tags.has(b.getAttribute("data-tag")));
    });
  }
  function syncKindRadios() {
    document.querySelectorAll("[name='search-kind']").forEach(function (r) { r.checked = r.getAttribute("data-kind") === state.kind; });
  }
  function syncTimingBtns() {
    document.querySelectorAll(".timing-btn").forEach(function (b) { b.classList.toggle("is-active", b.getAttribute("data-timing") === state.timing); });
  }
  function syncHideEnded() {
    if (hideEndedCb) hideEndedCb.checked = state.hideEnded;
  }
  function resetAll() {
    state.q = ""; input.value = "";
    state.prefs = new Set(); state.areas.clear(); state.tags.clear();
    state.kind = "all"; state.timing = "none"; state.hideEnded = false;
    state.limit = PAGE_SIZE;
    syncClearBtn(); syncPrefControls(); syncToggleChips(); syncKindRadios(); syncTimingBtns(); syncHideEnded();
    apply();
  }

  // 初期値（URLパラメータ）
  var params = new URLSearchParams(location.search);
  if (params.get("q")) { state.q = params.get("q").trim(); input.value = params.get("q"); }
  if (params.get("kind") && KIND_LABEL[params.get("kind")]) state.kind = params.get("kind");
  if (params.get("pref")) {
    var ps = params.get("pref").split(",").filter(function (p) { return PREFS.indexOf(p) !== -1; });
    if (ps.length) state.prefs = new Set(ps);
  }
  if (params.get("area")) {
    params.get("area").split(",").forEach(function (a) { if (a) state.areas.add(a); });
  }
  if (params.get("tag")) params.get("tag").split(",").forEach(function (t) { if (t) state.tags.add(t); });
  if (params.get("timing") && TIMING_LABEL[params.get("timing")]) {
    state.timing = params.get("timing");
    if (state.kind !== "all" && state.kind !== "event") state.kind = "event";
  }
  if (params.get("hide_ended") === "1") {
    state.hideEnded = true;
  }
  if (params.get("sort") && SORT_VALID[params.get("sort")]) {
    state.sort = params.get("sort");
  }
  syncClearBtn(); syncPrefControls(); syncSortControl(); syncToggleChips(); syncKindRadios(); syncTimingBtns(); syncHideEnded();

  // イベント（IME変換中スキップ + デバウンス150ms）
  var isComposing = false;
  var debounceTimer = null;
  function handleSearchInput() {
    syncClearBtn();
    if (isComposing) return;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function () {
      state.q = input.value.trim();
      state.limit = PAGE_SIZE;
      apply();
    }, 150);
  }
  input.addEventListener("compositionstart", function () { isComposing = true; });
  input.addEventListener("compositionend", function () { isComposing = false; handleSearchInput(); });
  input.addEventListener("input", handleSearchInput);

  if (clearBtn) {
    clearBtn.addEventListener("click", function () {
      state.q = ""; input.value = ""; syncClearBtn(); input.focus(); state.limit = PAGE_SIZE; apply();
    });
  }
  document.getElementById("search-apply").addEventListener("click", function () {
    clearTimeout(debounceTimer);
    state.q = input.value.trim(); syncClearBtn(); state.limit = PAGE_SIZE; apply();
    document.querySelector(".search-results").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  prefSelect.addEventListener("change", function () {
    if (prefSelect.value === "all") state.prefs = new Set();
    else if (prefSelect.value !== "custom") state.prefs = new Set([prefSelect.value]);
    pruneIncompatibleAreas();
    syncPrefControls(); syncToggleChips(); state.limit = PAGE_SIZE; apply();
  });
  document.querySelectorAll("[data-pref]").forEach(function (cb) {
    cb.addEventListener("change", function () {
      if (cb.checked) state.prefs.add(cb.getAttribute("data-pref")); else state.prefs.delete(cb.getAttribute("data-pref"));
      pruneIncompatibleAreas();
      syncPrefControls(); syncToggleChips(); state.limit = PAGE_SIZE; apply();
    });
  });
  document.querySelectorAll(".toggle-chip[data-area]").forEach(function (b) {
    b.addEventListener("click", function () {
      var a = b.getAttribute("data-area");
      if (state.areas.has(a)) state.areas.delete(a); else state.areas.add(a);
      syncToggleChips(); state.limit = PAGE_SIZE; apply();
    });
  });
  document.querySelectorAll(".toggle-chip[data-tag]").forEach(function (b) {
    b.addEventListener("click", function () {
      var t = b.getAttribute("data-tag");
      if (state.tags.has(t)) state.tags.delete(t); else state.tags.add(t);
      syncToggleChips(); state.limit = PAGE_SIZE; apply();
    });
  });
  if (tagMoreBtn) {
    tagMoreBtn.addEventListener("click", function () {
      state.tagsExpanded = !state.tagsExpanded;
      syncTagVisibility();
    });
  }
  if (areaMoreBtn) {
    areaMoreBtn.addEventListener("click", function () {
      state.areasExpanded = !state.areasExpanded;
      syncAreaVisibility();
    });
  }
  if (moreBtn) {
    moreBtn.addEventListener("click", function () {
      state.limit += PAGE_SIZE;
      apply();
    });
  }
  document.querySelectorAll("[name='search-kind']").forEach(function (r) {
    r.addEventListener("change", function () {
      state.kind = r.getAttribute("data-kind");
      // イベント以外のカテゴリを選んだとき、開催時期が設定されていれば解除して矛盾を防ぐ
      if (state.kind !== "all" && state.kind !== "event" && state.timing !== "none") {
        state.timing = "none";
        syncTimingBtns();
      }
      state.limit = PAGE_SIZE;
      apply();
    });
  });
  document.querySelectorAll(".timing-btn").forEach(function (b) {
    b.addEventListener("click", function () {
      state.timing = b.getAttribute("data-timing");
      // 開催時期を選んだら自動でカテゴリを「イベント」に切り替える
      if (state.timing !== "none" && state.kind !== "event") {
        state.kind = "event";
        syncKindRadios();
      }
      syncTimingBtns();
      state.limit = PAGE_SIZE;
      apply();
    });
  });
  if (hideEndedCb) {
    hideEndedCb.addEventListener("change", function () {
      state.hideEnded = hideEndedCb.checked;
      state.limit = PAGE_SIZE;
      apply();
    });
  }
  if (sortSelect) {
    sortSelect.addEventListener("change", function (e) { state.sort = e.target.value; apply(); });
  }
  document.getElementById("view-grid").addEventListener("click", function () {
    grid.classList.remove("results-grid--list");
    this.classList.add("is-active"); document.getElementById("view-list").classList.remove("is-active");
  });
  document.getElementById("view-list").addEventListener("click", function () {
    grid.classList.add("results-grid--list");
    this.classList.add("is-active"); document.getElementById("view-grid").classList.remove("is-active");
  });
  document.getElementById("reset-filters").addEventListener("click", resetAll);
  document.querySelectorAll(".trend-chip").forEach(function (b) {
    b.addEventListener("click", function () {
      var t = b.getAttribute("data-term");
      if (state.tags.has(t)) state.tags.delete(t); else state.tags.add(t);
      syncToggleChips(); state.limit = PAGE_SIZE; apply();
      document.querySelector(".search-results").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  // モバイル: カテゴリセグメント・クイックタグ・絞り込みボトムシート
  document.querySelectorAll("[data-seg-kind]").forEach(function (b) {
    b.addEventListener("click", function () {
      state.kind = b.getAttribute("data-seg-kind");
      if (state.kind !== "all" && state.kind !== "event" && state.timing !== "none") {
        state.timing = "none";
        syncTimingBtns();
      }
      syncKindRadios(); state.limit = PAGE_SIZE; apply();
    });
  });
  document.querySelectorAll("[data-quick-tag]").forEach(function (b) {
    b.addEventListener("click", function () {
      var t = b.getAttribute("data-quick-tag");
      if (state.tags.has(t)) state.tags.delete(t); else state.tags.add(t);
      syncToggleChips(); state.limit = PAGE_SIZE; apply();
    });
  });
  // カード上のタグ: 検索ページ内ではその場で絞り込みを切り替える（他ページでは通常のリンクとして検索ページへ）
  document.querySelectorAll("[data-card-tag]").forEach(function (b) {
    b.addEventListener("click", function (e) {
      e.preventDefault();
      var t = b.getAttribute("data-card-tag");
      if (state.tags.has(t)) state.tags.delete(t); else state.tags.add(t);
      syncToggleChips(); state.limit = PAGE_SIZE; apply();
    });
  });
  // カード上のカテゴリ: 検索ページ内ではその場でカテゴリ絞り込みを切り替える（再クリックで解除。他ページでは通常のリンクとして検索ページへ）
  document.querySelectorAll("[data-card-kind]").forEach(function (b) {
    b.addEventListener("click", function (e) {
      e.preventDefault();
      var k = b.getAttribute("data-card-kind");
      state.kind = state.kind === k ? "all" : k;
      if (state.kind !== "all" && state.kind !== "event" && state.timing !== "none") {
        state.timing = "none";
        syncTimingBtns();
      }
      syncSegs(); syncKindRadios(); state.limit = PAGE_SIZE; apply();
    });
  });
  var side = document.getElementById("filters");
  var backdrop = document.getElementById("sheet-backdrop");
  function openSheet() { if (side) side.classList.add("is-open"); if (backdrop) backdrop.hidden = false; }
  function closeSheet() { if (side) side.classList.remove("is-open"); if (backdrop) backdrop.hidden = true; }
  var openBtn = document.getElementById("open-filters");
  if (openBtn) openBtn.addEventListener("click", openSheet);
  var closeBtn = document.getElementById("sheet-close");
  if (closeBtn) closeBtn.addEventListener("click", closeSheet);
  if (applyBtn) applyBtn.addEventListener("click", closeSheet);
  if (backdrop) backdrop.addEventListener("click", closeSheet);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeSheet(); });
  if (location.hash === "#filters" && window.innerWidth <= 900) openSheet();

  apply();
})();
