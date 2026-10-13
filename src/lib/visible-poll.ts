// Page visibility is shared by MAIN and isolated scripts. Hidden tabs keep their
// cached data, but have no recurring DOM poll. Returning performs one immediate look.
export function visiblePoll(run: () => void, ms: number): () => void {
  let timer: number | null = null;
  function stop() {
    if (timer != null) window.clearInterval(timer);
    timer = null;
  }
  function start() {
    if (timer == null && !document.hidden) timer = window.setInterval(run, ms);
  }
  function changed() {
    stop();
    if (!document.hidden) { run(); start(); }
  }
  document.addEventListener("visibilitychange", changed);
  start();
  return () => { stop(); document.removeEventListener("visibilitychange", changed); };
}
