export function createRouter() {
  let current = null;

  function setRoute(route) {
    window.location.hash = route.startsWith("#") ? route : `#${route}`;
  }

  function getRoute() {
    const hash = window.location.hash || "#map";
    return hash.replace("#", "") || "map";
  }

  function onChange(cb) {
    function handler() {
      const next = getRoute();
      if (next === current) return;
      current = next;
      cb(next);
    }
    window.addEventListener("hashchange", handler);
    handler();
    return () => window.removeEventListener("hashchange", handler);
  }

  return { setRoute, getRoute, onChange };
}
