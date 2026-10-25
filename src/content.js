let extensionState = {
  convList: [],
  selectedNum: 0,
  isInjected: false,
  extensionUI: null,
  counter: null,
  actionButtons: [],
  busy: false,
  toggleChecked: false,
  checkAll: false
};

// ChatGPT's own CSS no longer ships these Tailwind colors, so they are set inline
const COLORS = {
  delete: "#ef4444",
  toggleOn: "#3b82f6"
};

const CONV_SELECTOR = "a[href*='/c/']";

const ICONS = {
  archive: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8"/><path d="M10 12h4"/></svg>',
  delete: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6"/><path d="M10 11v6M14 11v6"/></svg>',
  check: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>'
};

// ChatGPT's stylesheet only ships the Tailwind classes it uses itself, so the
// action bar is styled here with prefixed classes
const STYLES = `
.ghc-toolbar { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 4px 16px; }
.ghc-select-all { display: flex; align-items: center; gap: 8px; font-size: 14px; cursor: pointer; user-select: none; }
.ghc-actions { display: flex; gap: 8px; padding: 6px 16px 10px; width: 100%; }
.ghc-btn {
  flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  height: 34px; padding: 0 12px; border-radius: 9999px; font-size: 13px; font-weight: 500;
  cursor: pointer; white-space: nowrap; transition: background-color .15s, opacity .15s, transform .1s;
}
.ghc-btn:active:not(:disabled) { transform: scale(.97); }
.ghc-btn:disabled { cursor: not-allowed; opacity: .4; }
.ghc-btn.ghc-btn-active:disabled { opacity: 1; cursor: progress; }
.ghc-btn-archive { background: rgba(128, 128, 128, .15); color: inherit; border: 1px solid rgba(128, 128, 128, .25); }
.ghc-btn-archive:hover:not(:disabled) { background: rgba(128, 128, 128, .25); }
.ghc-btn-delete { background: ${COLORS.delete}; color: #fff; border: 1px solid transparent; }
.ghc-btn-delete:hover:not(:disabled) { background: #dc2626; }
.ghc-btn-icon { display: inline-flex; width: 16px; height: 16px; flex-shrink: 0; }
.ghc-spinner { border: 2px solid currentColor; border-right-color: transparent; border-radius: 50%; width: 14px; height: 14px; animation: ghc-spin .7s linear infinite; }
@keyframes ghc-spin { to { transform: rotate(360deg); } }
.ghc-counter { font-size: 12px; opacity: .6; margin: 0; text-align: center; }
.ghc-counter-error { color: ${COLORS.delete}; opacity: 1; }
.ghc-busy input[name='toggle'], .ghc-busy input[name='select_all'] { pointer-events: none; }
.ghc-pending { opacity: .35; pointer-events: none; transition: opacity .2s; animation: ghc-pulse 1.2s ease-in-out infinite; }
@keyframes ghc-pulse { 50% { opacity: .15; } }
`;

function injectStyles() {
  if (document.getElementById("ghc-styles")) return;
  const style = document.createElement("style");
  style.id = "ghc-styles";
  style.textContent = STYLES;
  document.head.appendChild(style);
}

function getHistory() {
  return document.querySelector("nav section[data-app-action-sidebar-section-heading='Recents']") ||
    document.querySelector(`nav ${CONV_SELECTOR}`)?.closest("section");
}

// ChatGPT resets checkboxes (appearance: none) and they shrink to 0px in its flex rows
function styleCheckbox(checkbox) {
  checkbox.style.appearance = "auto";
  checkbox.style.width = "16px";
  checkbox.style.height = "16px";
  checkbox.style.flexShrink = "0";
  checkbox.style.accentColor = COLORS.toggleOn;
}

function getConversations() {
  const history = getHistory();
  return history ? history.querySelectorAll(CONV_SELECTOR) : [];
}

if (document.readyState === "complete") {
  observer();
} else {
  window.addEventListener("load", () => {
    observer();
  });
}

function observer() {
  const observer = new MutationObserver(() => {
    const history = getHistory();

    if (!history) return;

    if (!extensionState.isInjected || !document.body.contains(extensionState.extensionUI)) {
      injectExtensionUI(history);
    }

    if (extensionState.toggleChecked) {
      addCheckboxesToNewConversations();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

function injectExtensionUI(history) {
  if (extensionState.extensionUI && document.body.contains(extensionState.extensionUI)) {
    return;
  }

  injectStyles();

  const div = document.createElement("div");
  const child = document.createElement("div");
  div.setAttribute("tabindex", "0");

  const img = document.createElement("img");
  img.src = chrome.runtime.getURL("logo.png");
  img.className="w-full h-full"
  const imgParent = document.createElement("a");
  imgParent.href="https://soleil-ouisol.fr/"
  imgParent.alt="owner: Soleil OUISOL"
  imgParent.target="_blank"
  imgParent.className="w-8 h-8 rounded-full overflow-hidden object-cover cursor-pointer"


  const text = document.createTextNode("GPT history cleaner");

  const toggleExtension = document.createElement("input");
  const label = document.createElement("label");
  const slider = document.createElement("span");
  const knob = document.createElement("span");
  slider.appendChild(knob);
  toggleExtension.type = "checkbox";
  toggleExtension.name = "toggle";
  toggleExtension.style.marginRight = "8px";

  imgParent.appendChild(img);
  child.appendChild(imgParent);
  child.appendChild(text);
  label.appendChild(toggleExtension)
  label.appendChild(slider)
  child.appendChild(label);
  label.className = "relative inline-block w-10 h-5";
  toggleExtension.className = "peer absolute opacity-0 w-0 h-0"

  knob.className =
  "absolute left-1  bottom-0.5 h-4 w-4 rounded-full bg-white \
  transition-transform duration-300 pointer-events-none";

  slider.className =
  "absolute inset-0 p-1 flex items-center justify-start cursor-pointer rounded-full bg-gray-300 transition-colors duration-300 ";


  child.className = "flex gap-2 items-center";
  div.className = "group hoverable flex gap-2 flex-col items-center justify-around py-2";
  div.appendChild(child);

  const board = document.createElement("div");
  board.className = "hidden flex-col h-full text-sm";
  board.style.width = "100%";

  // A <label> so clicking the text toggles the checkbox too
  const selectAllWrapper = document.createElement("label");
  selectAllWrapper.className = "ghc-select-all";
  selectAllWrapper.style.display = "none";
  const selectAll = document.createElement("input");
  selectAll.type = "checkbox";
  selectAll.name = "select_all";
  styleCheckbox(selectAll);
  const selectAllText = document.createTextNode("Select All");
  selectAllWrapper.appendChild(selectAll);
  selectAllWrapper.appendChild(selectAllText);

  const wrapper = document.createElement("div");
  wrapper.className = "ghc-actions";
  const screen = document.createElement("p");
  screen.className = "ghc-counter";
  const archiveBtn = createActionButton("Archive", ICONS.archive, "ghc-btn-archive");
  const deleteBtn = createActionButton("Delete", ICONS.delete, "ghc-btn-delete");

  wrapper.appendChild(archiveBtn);
  wrapper.appendChild(deleteBtn);
  const toolbar = document.createElement("div");
  toolbar.className = "ghc-toolbar";
  toolbar.appendChild(selectAllWrapper);
  toolbar.appendChild(screen);

  board.appendChild(toolbar);
  board.appendChild(wrapper);

  div.appendChild(board);

  history.before(div);
  extensionState.extensionUI = div;
  extensionState.counter = screen;
  extensionState.actionButtons = [archiveBtn, deleteBtn];
  extensionState.isInjected = true;
  updateCounter();

  deleteBtn.addEventListener("click", async () => {
    const validIds = getValidSelection();
    if (validIds.length === 0) {
      return;
    }

    const confirmed = await confirmDelete(validIds.length);
    if (!confirmed) {
      return;
    }

    await runBulkAction("delete", validIds, deleteBtn, {
      busy: `Deleting ${validIds.length}…`,
      done: "Deleted",
      failure: "Delete failed. Check the console for details."
    });
  });

  archiveBtn.addEventListener("click", async () => {
    const validIds = getValidSelection();
    if (validIds.length === 0) {
      return;
    }

    await runBulkAction("archive", validIds, archiveBtn, {
      busy: `Archiving ${validIds.length}…`,
      done: "Archived",
      failure: "Archive failed. Check the console for details."
    });
  });

  toggleExtension.addEventListener("change", () => {
    const conversations = getConversations();
    extensionState.toggleChecked = toggleExtension.checked;

    if (toggleExtension.checked) {
      selectAllWrapper.style.display = "flex";
      board.classList.remove("hidden")
      slider.classList.remove("bg-gray-300")
      slider.classList.remove("justify-start")
      slider.style.backgroundColor = COLORS.toggleOn
      slider.classList.add("justify-end")
      board.classList.add("flex")
    } else {
      selectAllWrapper.style.display = "none";
      selectAll.checked = false;
      extensionState.checkAll = false;
      board.classList.remove("flex")
      board.classList.add("hidden")
      slider.classList.remove("justify-end")
      board.classList.add("justify-start")
      slider.classList.add("bg-gray-300")
      slider.style.backgroundColor = ""
    }

    extensionState.convList = [];
    updateCounter();

    conversations.forEach(conv => {
      if (toggleExtension.checked) {
        addCheckbox(conv);
      } else {
        conv.querySelector("input[name='conv']")?.remove();
      }
    });
  });

  selectAll.addEventListener("change", () => {
    if (!extensionState.toggleChecked) return;

    extensionState.checkAll = selectAll.checked;
    const conversations = getConversations();

    if (selectAll.checked) {
      extensionState.convList = [];

      conversations.forEach(conv => {
        const checkbox = conv.querySelector("input[type='checkbox']");
        if (checkbox) {
          checkbox.checked = true;
          const href = conv.getAttribute('href');
          const id = getConvId(href);

          if (id && !extensionState.convList.includes(id)) {
            extensionState.convList.push(id);
          }
        }
      });
    } else {
      extensionState.convList = [];

      conversations.forEach(conv => {
        const checkbox = conv.querySelector("input[type='checkbox']");
        if (checkbox) {
          checkbox.checked = false;
        }
      });
    }

    updateCounter();
  });

}

function updateCounter() {
  extensionState.selectedNum = extensionState.convList.length;
  if (extensionState.counter) {
    extensionState.counter.classList.remove("ghc-counter-error");
    extensionState.counter.textContent = extensionState.selectedNum + " conversation(s) selected";
  }
  if (!extensionState.busy) {
    extensionState.actionButtons.forEach(btn => {
      btn.disabled = extensionState.selectedNum === 0;
    });
  }
}

function getValidSelection() {
  return extensionState.convList.filter(id => id && typeof id === 'string' && !id.includes('Promise'));
}

function createActionButton(label, icon, variantClass) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `ghc-btn ${variantClass}`;

  const iconEl = document.createElement("span");
  iconEl.className = "ghc-btn-icon";
  iconEl.innerHTML = icon;

  const labelEl = document.createElement("span");
  labelEl.className = "ghc-btn-label";
  labelEl.textContent = label;

  btn.appendChild(iconEl);
  btn.appendChild(labelEl);
  return btn;
}

function setButtonContent(btn, { icon, label }) {
  const iconEl = btn.querySelector(".ghc-btn-icon");
  iconEl.innerHTML = icon || "";
  iconEl.classList.toggle("ghc-spinner", !icon);
  btn.querySelector(".ghc-btn-label").textContent = label;
}

// Locks the panel, shows a spinner on the clicked button and fades the rows
// being processed, then reloads so ChatGPT's sidebar reflects the change
async function runBulkAction(action, ids, activeBtn, labels) {
  const original = {
    icon: activeBtn.querySelector(".ghc-btn-icon").innerHTML,
    label: activeBtn.querySelector(".ghc-btn-label").textContent
  };

  extensionState.busy = true;
  extensionState.extensionUI.classList.add("ghc-busy");
  extensionState.actionButtons.forEach(btn => {
    btn.disabled = true;
  });
  activeBtn.classList.add("ghc-btn-active");
  setButtonContent(activeBtn, { label: labels.busy });

  const rows = [...getConversations()].filter(conv => ids.includes(getConvId(conv.getAttribute('href'))));
  rows.forEach(conv => conv.classList.add("ghc-pending"));

  try {
    // One batched call: the session token is fetched once for all conversations
    const { failed } = await customFetch(action, ids);

    if (failed.length > 0) {
      console.error(`Failed ${action}s:`, failed);
    }

    setButtonContent(activeBtn, { icon: ICONS.check, label: labels.done });
    extensionState.convList = [];

    setTimeout(() => window.location.reload(), 500);

  } catch (error) {
    console.error(`${action} operation failed:`, error);

    rows.forEach(conv => conv.classList.remove("ghc-pending"));
    activeBtn.classList.remove("ghc-btn-active");
    setButtonContent(activeBtn, original);
    extensionState.busy = false;
    extensionState.extensionUI.classList.remove("ghc-busy");
    updateCounter();

    extensionState.counter.textContent = labels.failure;
    extensionState.counter.classList.add("ghc-counter-error");
  }
}

// The checkbox only mirrors convList: clicks are handled once, on the row, by
// the delegated listener below (pointer-events: none so the box itself never
// toggles natively)
function addCheckbox(conv) {
  if (conv.querySelector("input[name='conv']")) return;

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.name = "conv";
  checkbox.tabIndex = -1;
  checkbox.style.marginRight = "8px";
  styleCheckbox(checkbox);
  checkbox.style.pointerEvents = "none";

  const id = getConvId(conv.getAttribute('href'));

  if (extensionState.checkAll && id && !extensionState.convList.includes(id)) {
    extensionState.convList.push(id);
    updateCounter();
  }
  checkbox.checked = !!id && extensionState.convList.includes(id);

  conv.prepend(checkbox);
}

function addCheckboxesToNewConversations() {
  getConversations().forEach(addCheckbox);
}

// One listener for every row, so rows re-rendered by ChatGPT never end up with
// zero or several handlers. Capture phase runs before ChatGPT's own navigation.
document.addEventListener("click", (e) => {
  if (!extensionState.toggleChecked) return;

  const conv = e.target.closest?.(CONV_SELECTOR);
  const history = getHistory();
  if (!conv || !history || !history.contains(conv)) return;

  e.preventDefault();
  e.stopPropagation();

  if (extensionState.busy) return;

  const id = getConvId(conv.getAttribute('href'));
  if (!id) return;

  const index = extensionState.convList.indexOf(id);
  if (index > -1) {
    extensionState.convList.splice(index, 1);
  } else {
    extensionState.convList.push(id);
  }

  addCheckbox(conv);
  conv.querySelector("input[name='conv']").checked = index === -1;
  updateCounter();
}, true);

// Custom modal instead of window.confirm() so it matches ChatGPT's light/dark theme
function confirmDelete(count) {
  return new Promise((resolve) => {
    const bodyStyle = getComputedStyle(document.body);

    const overlay = document.createElement("div");
    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      zIndex: "2147483647",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(0, 0, 0, 0.5)"
    });

    const dialog = document.createElement("div");
    dialog.setAttribute("role", "alertdialog");
    dialog.setAttribute("aria-modal", "true");
    Object.assign(dialog.style, {
      width: "min(400px, calc(100vw - 32px))",
      padding: "20px",
      borderRadius: "16px",
      backgroundColor: bodyStyle.backgroundColor || "#fff",
      color: bodyStyle.color || "#000",
      border: "1px solid rgba(128, 128, 128, 0.35)",
      boxShadow: "0 10px 30px rgba(0, 0, 0, 0.3)",
      display: "flex",
      flexDirection: "column",
      gap: "12px"
    });

    const title = document.createElement("h2");
    title.textContent = "Attention";
    Object.assign(title.style, { fontSize: "18px", fontWeight: "600", margin: "0" });

    const message = document.createElement("p");
    message.textContent = count > 1
      ? `Vous êtes sur le point de supprimer ${count} conversations. Cette action est irréversible.`
      : "Vous êtes sur le point de supprimer 1 conversation. Cette action est irréversible.";
    Object.assign(message.style, { fontSize: "14px", margin: "0", opacity: "0.85" });

    const actions = document.createElement("div");
    Object.assign(actions.style, { display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "8px" });

    const buttonStyle = {
      padding: "8px 14px",
      borderRadius: "9999px",
      fontSize: "14px",
      fontWeight: "500",
      cursor: "pointer"
    };

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.textContent = "Annuler";
    Object.assign(cancelBtn.style, buttonStyle, {
      border: "1px solid currentColor",
      backgroundColor: "transparent",
      color: "inherit"
    });

    const confirmBtn = document.createElement("button");
    confirmBtn.type = "button";
    confirmBtn.textContent = "Supprimer";
    Object.assign(confirmBtn.style, buttonStyle, {
      border: "none",
      backgroundColor: COLORS.delete,
      color: "#fff"
    });

    actions.appendChild(cancelBtn);
    actions.appendChild(confirmBtn);
    dialog.appendChild(title);
    dialog.appendChild(message);
    dialog.appendChild(actions);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    const close = (result) => {
      document.removeEventListener("keydown", onKeyDown, true);
      overlay.remove();
      resolve(result);
    };

    function onKeyDown(e) {
      if (e.key === "Escape") {
        e.stopPropagation();
        close(false);
      }
    }

    cancelBtn.addEventListener("click", () => close(false));
    confirmBtn.addEventListener("click", () => close(true));
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close(false);
    });
    document.addEventListener("keydown", onKeyDown, true);

    cancelBtn.focus();
  });
}

function getConvId(url) {
  if (!url || typeof url !== 'string') {
    return null;
  }

  const parts = url.split("/");
  const id = parts[parts.length - 1];

  if (!id || id === '' || id.includes('[object') || id.includes('Promise') || id === 'undefined' || id === 'null') {
    return null;
  }

  return id;
}

function customFetch(action, ids) {

  if (!Array.isArray(ids) || ids.length === 0) {
    return Promise.reject(new Error("No conversation IDs provided"));
  }

  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        type: "GPT_HISTORY_ACTION",
        action: action,
        ids: ids
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error("Extension error:", chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
          return;
        }

        if (response && response.success) {
          resolve({ failed: response.failed || [] });
        } else {
          console.error(`${action} failed:`, response ? response.error : "No response");
          reject(new Error(response ? response.error : "Unknown error"));
        }
      }
    );
  });
}