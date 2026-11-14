// 検索ページ /search/ の絞り込み・並び替え・表示切替（クライアント側のみ・データは書き換えない）
// 対象はカードの data-* 属性（kind / prefecture / area / tags / 期間 / 注目度 / 反応数 / 検索文字列）
(function () {
  var grid = document.getElementById("search-grid");
  if (!grid) return;
  var cards = Array.prototype.slice.call(grid.querySelectorAll(".place-card"));
  var PREFS = ["広島県", "岡山県", "山口県", "島根県", "鳥取県"];
  var KIND_LABEL = { shop: "お店", spot: "観光スポット", event: "イベント", stay: "温泉・宿泊", activity: "体験・おでかけ" };
  var TIMING_LABEL = { today: "今日", weekend: "今週末", month: "今月中" };

  var state = { q: "", prefs: new Set(), areas: new Set(), kind: "all", tags: new Set(), timing: "none", sort: "popular" };
  // 県フィルターは「チェックした県だけに絞る」。未選択（または全県チェック）＝全県が対象
  function prefFiltered() { return state.prefs.size > 0 && state.prefs.size < PREFS.length; }

  var input = document.getElementById("search-input");
  var prefSelect = document.getElementById("search-pref");
  var countEl = document.getElementById("results-count");
  var condEl = document.getElementById("results-cond");
  var tokensEl = document.getElementById("active-tokens");
  var footEl = document.getElementById("results-foot");
  var emptyEl = document.getElementById("search-empty");

  function startOfDay(d) { var x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); }
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

  function matches(card) {
    if (state.prefs.size && !state.prefs.has(card.getAttribute("data-prefecture"))) return false;
    if (state.areas.size && !state.areas.has(card.getAttribute("data-area"))) return false;
    if (state.kind !== "all" && card.getAttribute("data-kind") !== state.kind) return false;
    if (state.tags.size) {
      var tagAttr = card.getAttribute("data-tags") || "";
      var ok = true;
      state.tags.forEach(function (t) { if (tagAttr.indexOf("|" + t + "|") === -1) ok = false; });
      if (!ok) return false;
    }
    if (state.q) {
      var text = card.getAttribute("data-search") || "";
      var terms = state.q.split(/[\s　]+/).filter(Boolean);
      for (var i = 0; i < terms.length; i++) { if (text.indexOf(terms[i]) === -1) return false; }
    }
    if (state.timing !== "none") {
      var s = parseInt(card.getAttribute("data-start") || "", 10);
      var e = parseInt(card.getAttribute("data-end") || "", 10);
      if (isNaN(s) || isNaN(e)) return false;
      var w = timingWindow(state.timing);
      if (!(s * 1000 <= w[1] && e * 1000 >= w[0])) return false;
    }
    return true;
  }

  function sortCards(list) {
    var val = {
      popular: function (c) { return -(parseInt(c.getAttribute("data-found") || "0", 10)); },
      new: function (c) { return -(parseInt(c.getAttribute("data-added") || "0", 10)); },
      likes: function (c) { return -(parseInt(c.getAttribute("data-likes") || "0", 10)); },
      ending: function (c) { var e = parseInt(c.getAttribute("data-end") || "", 10); return isNaN(e) ? Infinity : e; }
    }[state.sort];
    return list.map(function (c, i) { return [c, i]; })
      .sort(function (a, b) { var d = val(a[0]) - val(b[0]); return d !== 0 ? d : a[1] - b[1]; })
      .map(function (x) { return x[0]; });
  }

  function syncPrefControls() {
    document.querySelectorAll("[data-pref]").forEach(function (cb) { cb.checked = state.prefs.has(cb.getAttribute("data-pref")); });
    if (state.prefs.size === 1) prefSelect.value = state.prefs.values().next().value;
    else if (prefFiltered()) prefSelect.value = "custom";
    else prefSelect.value = "all";
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
    if (state.q) { mark(); addToken("キーワード「" + state.q + "」", function () { state.q = ""; input.value = ""; apply(); }); }
    if (prefFiltered()) {
      state.prefs.forEach(function (p) { mark(); addToken(p, function () { state.prefs.delete(p); syncPrefControls(); apply(); }); });
    }
    state.areas.forEach(function (a) { mark(); addToken(a, function () { state.areas.delete(a); syncToggleChips(); apply(); }); });
    if (state.kind !== "all") { mark(); addToken(KIND_LABEL[state.kind], function () { state.kind = "all"; syncKindRadios(); apply(); }); }
    state.tags.forEach(function (t) { mark(); addToken("#" + t, function () { state.tags.delete(t); syncToggleChips(); apply(); }); });
    if (state.timing !== "none") { mark(); addToken("開催時期：" + TIMING_LABEL[state.timing], function () { state.timing = "none"; syncTimingBtns(); apply(); }); }
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
    if (state.kind !== "all") parts.push(KIND_LABEL[state.kind]);
    if (state.q) parts.push("「" + state.q + "」");
    return parts.length ? "（" + parts.join(" / ") + "）" : "";
  }

  function syncURL() {
    var p = new URLSearchParams();
    if (state.q) p.set("q", state.q);
    if (state.kind !== "all") p.set("kind", state.kind);
    if (prefFiltered()) p.set("pref", Array.from(state.prefs).join(","));
    if (state.tags.size) p.set("tag", Array.from(state.tags).join(","));
    if (state.timing !== "none") p.set("timing", state.timing);
    var qs = p.toString();
    history.replaceState(null, "", location.pathname + (qs ? "?" + qs : ""));
  }

  function apply() {
    var visible = cards.filter(matches);
    var ordered = sortCards(visible);
    var visibleSet = new Set(ordered);
    cards.forEach(function (c) { c.style.display = visibleSet.has(c) ? "" : "none"; });
    ordered.forEach(function (c) { grid.appendChild(c); });
    countEl.textContent = visible.length + " 件";
    condEl.textContent = condText();
    footEl.textContent = "全 " + cards.length + " 件中 " + (visible.length ? "1 〜 " + visible.length : "0") + " 件を表示中";
    emptyEl.hidden = visible.length !== 0;
    renderTokens();
    syncURL();
    syncSegs();
    syncQuickTags();
    var badge = document.getElementById("filter-badge");
    if (badge) {
      var n = (state.q ? 1 : 0) + (prefFiltered() ? 1 : 0) + state.areas.size +
        (state.kind !== "all" ? 1 : 0) + state.tags.size + (state.timing !== "none" ? 1 : 0);
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
  function resetAll() {
    state.q = ""; input.value = "";
    state.prefs = new Set(); state.areas.clear(); state.tags.clear();
    state.kind = "all"; state.timing = "none";
    syncPrefControls(); syncToggleChips(); syncKindRadios(); syncTimingBtns();
    apply();
  }

  // 初期値（URLパラメータ）
  var params = new URLSearchParams(location.search);
  if (params.get("q")) { state.q = params.get("q").toLowerCase().trim(); input.value = params.get("q"); }
  if (params.get("kind") && KIND_LABEL[params.get("kind")]) state.kind = params.get("kind");
  if (params.get("pref")) {
    var ps = params.get("pref").split(",").filter(function (p) { return PREFS.indexOf(p) !== -1; });
    if (ps.length) state.prefs = new Set(ps);
  }
  if (params.get("tag")) params.get("tag").split(",").forEach(function (t) { if (t) state.tags.add(t); });
  if (params.get("timing") && TIMING_LABEL[params.get("timing")]) state.timing = params.get("timing");
  syncPrefControls(); syncToggleChips(); syncKindRadios(); syncTimingBtns();

  // イベント
  input.addEventListener("input", function () { state.q = input.value.toLowerCase().trim(); apply(); });
  document.getElementById("search-clear").addEventListener("click", function () { state.q = ""; input.value = ""; input.focus(); apply(); });
  document.getElementById("search-apply").addEventListener("click", function () {
    state.q = input.value.toLowerCase().trim(); apply();
    document.querySelector(".search-results").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  prefSelect.addEventListener("change", function () {
    if (prefSelect.value === "all") state.prefs = new Set();
    else if (prefSelect.value !== "custom") state.prefs = new Set([prefSelect.value]);
    syncPrefControls(); apply();
  });
  document.querySelectorAll("[data-pref]").forEach(function (cb) {
    cb.addEventListener("change", function () {
      if (cb.checked) state.prefs.add(cb.getAttribute("data-pref")); else state.prefs.delete(cb.getAttribute("data-pref"));
      syncPrefControls(); apply();
    });
  });
  document.querySelectorAll(".toggle-chip[data-area]").forEach(function (b) {
    b.addEventListener("click", function () {
      var a = b.getAttribute("data-area");
      if (state.areas.has(a)) state.areas.delete(a); else state.areas.add(a);
      syncToggleChips(); apply();
    });
  });
  document.querySelectorAll(".toggle-chip[data-tag]").forEach(function (b) {
    b.addEventListener("click", function () {
      var t = b.getAttribute("data-tag");
      if (state.tags.has(t)) state.tags.delete(t); else state.tags.add(t);
      syncToggleChips(); apply();
    });
  });
  document.querySelectorAll("[name='search-kind']").forEach(function (r) {
    r.addEventListener("change", function () { state.kind = r.getAttribute("data-kind"); apply(); });
  });
  document.querySelectorAll(".timing-btn").forEach(function (b) {
    b.addEventListener("click", function () { state.timing = b.getAttribute("data-timing"); syncTimingBtns(); apply(); });
  });
  document.getElementById("sort-select").addEventListener("change", function (e) { state.sort = e.target.value; apply(); });
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
      state.q = b.getAttribute("data-term").toLowerCase(); input.value = b.getAttribute("data-term"); apply();
      document.querySelector(".search-results").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  // モバイル: カテゴリセグメント・クイックタグ・絞り込みボトムシート
  document.querySelectorAll("[data-seg-kind]").forEach(function (b) {
    b.addEventListener("click", function () {
      state.kind = b.getAttribute("data-seg-kind");
      syncKindRadios(); apply();
    });
  });
  document.querySelectorAll("[data-quick-tag]").forEach(function (b) {
    b.addEventListener("click", function () {
      var t = b.getAttribute("data-quick-tag");
      if (state.tags.has(t)) state.tags.delete(t); else state.tags.add(t);
      syncToggleChips(); apply();
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
  var applyBtn = document.getElementById("sheet-apply");
  if (applyBtn) applyBtn.addEventListener("click", closeSheet);
  if (backdrop) backdrop.addEventListener("click", closeSheet);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeSheet(); });
  if (location.hash === "#filters" && window.innerWidth <= 900) openSheet();

  apply();
})();
