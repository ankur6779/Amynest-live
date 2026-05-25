(function () {
  var STYLE_ID = "amynest-native-shell-style";
  var CSS =
    "@media (max-width:767px){" +
    "html.amynest-android-shell,html.amynest-native-shell," +
    "html.amynest-android-shell body,html.amynest-native-shell body," +
    "html.amynest-android-shell #root,html.amynest-native-shell #root," +
    "html.amynest-android-shell #app-root,html.amynest-native-shell #app-root," +
    "html.amynest-android-shell .app-scroll,html.amynest-native-shell .app-scroll" +
    "{min-height:100dvh!important;height:100%!important}" +
    "html.amynest-android-shell #app-root,html.amynest-native-shell #app-root{padding-top:0!important}" +
    "html.amynest-android-shell .main-container,html.amynest-native-shell .main-container," +
    "html.amynest-android-shell .main-layout,html.amynest-native-shell .main-layout" +
    "{min-height:0!important;flex:1!important}" +
    "html.amynest-android-shell .app-header,html.amynest-native-shell .app-header" +
    "{position:fixed!important;top:0!important;left:0!important;right:0!important;width:100%!important;" +
    "margin:0!important;z-index:1000!important;padding-top:6px!important;" +
    "box-shadow:0 2px 20px rgba(0,0,0,.4)!important;" +
    "backdrop-filter:blur(20px)!important;-webkit-backdrop-filter:blur(20px)!important}" +
    "html.amynest-android-shell .main-container:has(>.app-header)>.app-shell-main," +
    "html.amynest-native-shell .main-container:has(>.app-header)>.app-shell-main" +
    "{padding-top:calc(var(--app-header-height,56px) + 6px)!important;box-sizing:border-box!important}" +
    "html.amynest-android-shell .app-scroll,html.amynest-android-shell .page-content," +
    "html.amynest-native-shell .app-scroll,html.amynest-native-shell .page-content{padding-top:0!important}" +
    "html.amynest-android-shell body.has-tabbar .app-scroll," +
    "html.amynest-android-shell body.has-tabbar .page-content," +
    "html.amynest-native-shell body.has-tabbar .app-scroll," +
    "html.amynest-native-shell body.has-tabbar .page-content" +
    "{padding-bottom:calc(64px + 8px + 8px + 10px + 12px)!important}" +
    "html.amynest-android-shell .bottom-nav,html.amynest-native-shell .bottom-nav," +
    "html.amynest-android-shell .app-footer.tabbar,html.amynest-native-shell .app-footer.tabbar" +
    "{position:fixed!important;left:0!important;right:0!important;bottom:8px!important;" +
    "width:100%!important;z-index:1000!important;pointer-events:none}" +
    "html.amynest-android-shell .bottom-nav .app-footer__nav," +
    "html.amynest-native-shell .bottom-nav .app-footer__nav," +
    "html.amynest-android-shell .app-footer.tabbar .app-footer__nav," +
    "html.amynest-native-shell .app-footer.tabbar .app-footer__nav" +
    "{min-height:64px!important;height:64px!important;box-sizing:content-box!important;" +
    "padding-bottom:18px!important;pointer-events:auto;" +
    "background:rgba(10,10,30,.95)!important;box-shadow:0 2px 20px rgba(0,0,0,.4)!important;" +
    "backdrop-filter:blur(20px)!important;-webkit-backdrop-filter:blur(20px)!important;" +
    "border-radius:16px 16px 0 0!important}" +
    "html.amynest-android-shell .floating-button," +
    "html.amynest-android-shell #amy-fab-floating.amy-fab-floating.floating-button," +
    "html.amynest-native-shell .floating-button," +
    "html.amynest-native-shell #amy-fab-floating.amy-fab-floating.floating-button" +
    "{bottom:calc(64px + 8px + 10px + 8px + 12px)!important}" +
    "}";

  function markShell() {
    var r = document.documentElement;
    r.classList.add(
      "amynest-android-shell",
      "amynest-native-shell",
      "amynest-viewport-inset"
    );
    r.style.setProperty("--sat", "0px");
    r.style.setProperty("--sab", "0px");
    r.style.setProperty("--safe-top", "0px");
    r.style.setProperty("--safe-bottom", "0px");
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var el = document.createElement("style");
    el.id = STYLE_ID;
    el.textContent = CSS;
    (document.head || document.documentElement).appendChild(el);
  }

  function portalTabBar() {
    var tab = document.querySelector(
      "footer.app-footer.tabbar, .app-footer.tabbar"
    );
    if (!tab || tab.parentNode === document.body) return;
    tab.classList.add("bottom-nav");
    document.body.appendChild(tab);
  }

  function apply() {
    markShell();
    injectStyle();
    portalTabBar();
  }

  window.__amynestShellLayoutApply = apply;
  apply();
  document.addEventListener("DOMContentLoaded", apply);
  window.addEventListener("load", apply);
  setTimeout(apply, 400);
  setTimeout(apply, 1200);
})();
