(function () {
  try {
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduce && 'IntersectionObserver' in window) {
      document.documentElement.classList.add('hh-motion');
    }
  } catch (e) {}
})();
