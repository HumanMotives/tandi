// ui/shell.js
import { mountSidebar } from "./sidebar.js";

export function mountShell({
  container,
  state,
  onEditName,
  onOpenBackpack,
  onOpenSettings,
  onToggleAudio,
  onOpenInfo
}) {
  const root = document.createElement("div");
  root.className = "dsShell";

  const sidebarHost = document.createElement("div");
  sidebarHost.className = "dsShellSidebar";

  const mainHost = document.createElement("main");
  mainHost.className = "dsShellMain";

  root.appendChild(sidebarHost);
  root.appendChild(mainHost);
  container.appendChild(root);

  const sidebar = mountSidebar({
    container: sidebarHost,
    state,
    onEditName,
    onOpenBackpack,
    onOpenSettings,
    onToggleAudio,
    onOpenInfo
  });

  function setMain(node) {
    mainHost.innerHTML = "";
    mainHost.appendChild(node);
  }

  function updateSidebar() {
    sidebar.update();
  }

  function unmount() {
    sidebar.unmount();
    root.remove();
  }

  return { unmount, setMain, updateSidebar, el: root, mainHost };
}
