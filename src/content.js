let extensionState = {
  convList: [],
  selectedNum: 0,
  isInjected: false,
  extensionUI: null,
  toggleChecked: false,
  checkAll: false
};

window.addEventListener("load", () => {
  observer();
});

function observer() {
  const observer = new MutationObserver(() => {
    const aside = document.querySelector("nav aside");
    const history = document.querySelector("#history");

    if (!history || !aside) return;

    if (!extensionState.isInjected || !document.body.contains(extensionState.extensionUI)) {
      injectExtensionUI(aside, history);
    }

    if (extensionState.toggleChecked) {
      addCheckboxesToNewConversations(history);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

function injectExtensionUI(aside, history) {
  if (extensionState.extensionUI && document.body.contains(extensionState.extensionUI)) {
    return;
  }

  const div = document.createElement("div");
  const child = document.createElement("div");
  div.setAttribute("tabindex", "0");

  const img = document.createElement("img");
  img.src = chrome.runtime.getURL("logo.png");
  img.style.width = "20px";
  img.style.height = "20px";

  const text = document.createTextNode("GPT history cleaner");

  const toggleExtension = document.createElement("input");
  toggleExtension.type = "checkbox";
  toggleExtension.name = "toggle";
  toggleExtension.style.marginRight = "8px";

  child.appendChild(img);
  child.appendChild(text);
  child.appendChild(toggleExtension);
  child.className = "flex gap-2 items-center";
  div.className = "group hoverable flex gap-2 flex-col items-center justify-around";
  div.appendChild(child);

  const board = document.createElement("div");
  board.className = "hidden flex-col h-full text-sm";

  const selectAllWrapper = document.createElement("div");
  selectAllWrapper.className = "flex items-center gap-2 p-1";
  selectAllWrapper.style.display = "none";
  const selectAll = document.createElement("input");
  selectAll.type = "checkbox";
  selectAll.name = "select_all";
  const selectAllText = document.createTextNode("Select All");
  selectAllWrapper.appendChild(selectAll);
  selectAllWrapper.appendChild(selectAllText);

  const wrapper = document.createElement("div");
  wrapper.className = "flex gap-2 justify-around p-1 h-[50px]";
  const screen = document.createElement("p");
  screen.className = "text-xs text-gray-500";
  const archiveBtn = document.createElement("button");
  const deleteBtn = document.createElement("button");
  archiveBtn.className = "flex text-center items-center p-2 h-6 text-sm bg-yellow-500 text-black rounded-md hover:bg-yellow-400";
  deleteBtn.className = "flex text-center items-center p-2 h-6 text-sm bg-red-500 text-white rounded-md hover:bg-red-600";

  const selectionText = document.createTextNode(extensionState.selectedNum + " conversation(s) selected");
  const archiveText = document.createTextNode("Archive");
  const deleteText = document.createTextNode("Delete");

  screen.appendChild(selectionText);
  archiveBtn.appendChild(archiveText);
  deleteBtn.appendChild(deleteText);
  wrapper.appendChild(archiveBtn);
  wrapper.appendChild(deleteBtn);
  board.appendChild(selectAllWrapper);
  board.appendChild(screen);
  board.appendChild(wrapper);

  div.appendChild(board);

  aside.before(div);
  extensionState.extensionUI = div;
  extensionState.isInjected = true;

  deleteBtn.addEventListener("click", async () => {
    if (extensionState.convList.length === 0) {
      return;
    }

    const validIds = extensionState.convList.filter(id => id && typeof id === 'string' && !id.includes('Promise'));

    if (validIds.length === 0) {
      return;
    }

    // confirm

    deleteBtn.disabled = true;
    const originalText = deleteBtn.textContent;
    deleteBtn.textContent = "Deleting...";

    try {
      let successCount = 0;
      let failCount = 0;

      for (const id of validIds) {
        try {
          await customFetch("delete", id);
          successCount++;
          await new Promise(resolve => setTimeout(resolve, 200));


        } catch (error) {
          console.error(`Failed to delete ${id}:`, error);
          failCount++;
        }
      }


      extensionState.convList = [];
      extensionState.selectedNum = 0;
      screen.textContent = "0 conversation(s) selected";

    } catch (error) {
      console.error("Delete operation failed:", error);
      alert("Operation failed. Check console for details.");
    } finally {
      deleteBtn.disabled = false;
      deleteBtn.textContent = originalText;

      window.location.reload();
    }
  });

  archiveBtn.addEventListener("click", async () => {
    if (extensionState.convList.length === 0) {
      return;
    }

    const validIds = extensionState.convList.filter(id => id && typeof id === 'string' && !id.includes('Promise'));

    if (validIds.length === 0) {
      return;
    }

    // confirm

    archiveBtn.disabled = true;
    const originalText = archiveBtn.textContent;
    archiveBtn.textContent = "Archiving...";

    try {
      let successCount = 0;
      let failCount = 0;

      for (const id of validIds) {
        try {
          await customFetch("archive", id);
          successCount++;
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          console.error(`Failed to archive ${id}:`, error);
          failCount++;
        }
      }

      // alert(`✓ ${successCount} archived${failCount > 0 ? `, ${failCount} failed` : ''}`);

      extensionState.convList = [];
      extensionState.selectedNum = 0;
      screen.textContent = "0 conversation(s) selected";
      location.reload();

    } catch (error) {
      console.error("Archive operation failed:", error);
      alert("Operation failed. Check console for details.");
    } finally {
      archiveBtn.disabled = false;
      archiveBtn.textContent = originalText;
    }
  });

  toggleExtension.addEventListener("change", () => {
    const conversations = history.querySelectorAll("nav a");
    extensionState.toggleChecked = toggleExtension.checked;

    if (toggleExtension.checked) {
      selectAllWrapper.style.display = "flex";
      board.classList.remove("hidden")
      board.classList.add("flex")
      conversations.forEach(conv => {
        addCheckboxToConversation(conv);
      });
    } else {
      selectAllWrapper.style.display = "none";
      selectAll.checked = false;
      extensionState.checkAll = false;
      conversations.forEach(conv => {
        removeCheckboxFromConversation(conv);
      });
      extensionState.convList = [];
      extensionState.selectedNum = 0;
      screen.textContent = "0 conversation(s) selected";
      board.classList.remove("flex")
      board.classList.add("hidden")
    }
  });

  selectAll.addEventListener("change", () => {
    if (!extensionState.toggleChecked) return;

    extensionState.checkAll = selectAll.checked;
    const conversations = history.querySelectorAll("nav a");

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

    extensionState.selectedNum = extensionState.convList.length;
    screen.textContent = extensionState.selectedNum + " conversation(s) selected";
    console.log("Select All:", selectAll.checked, "Valid IDs:", extensionState.convList);
  });

  function handleConversationClick(e) {
    if (!extensionState.toggleChecked) return;

    e.preventDefault();
    const conv = e.currentTarget;
    const input = conv.querySelector("input[type='checkbox']");

    if (!input) return;

    input.checked = !input.checked;

    const href = conv.getAttribute('href');
    const id = getConvId(href);

    if (!id) return;

    if (input.checked) {
      if (!extensionState.convList.includes(id)) {
        extensionState.convList.push(id);
      }
    } else {
      const index = extensionState.convList.indexOf(id);
      if (index > -1) {
        extensionState.convList.splice(index, 1);
      }
    }

    console.log("Selected conversations:", extensionState.convList);
    extensionState.selectedNum = extensionState.convList.length;
    screen.textContent = extensionState.selectedNum + " conversation(s) selected";
  }

  function addCheckboxToConversation(conv) {
    if (conv.querySelector("input[type='checkbox']")) return;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = "conv";
    checkbox.style.marginRight = "8px";
    checkbox.style.pointerEvents = "none";

    const href = conv.getAttribute('href');
    const id = getConvId(href);

    if (extensionState.checkAll && id) {
      checkbox.checked = true;
      if (!extensionState.convList.includes(id)) {
        extensionState.convList.push(id);
      }
    } else if (id && extensionState.convList.includes(id)) {
      checkbox.checked = true;
    }


    conv.prepend(checkbox);
    conv.addEventListener("click", handleConversationClick);
  }

  function removeCheckboxFromConversation(conv) {
    const checkbox = conv.querySelector("input[type='checkbox']");
    if (checkbox) {
      conv.removeChild(checkbox);
    }
    conv.removeEventListener("click", handleConversationClick);
  }
}

function addCheckboxesToNewConversations(history) {
  const conversations = history.querySelectorAll("nav a");
  const screen = document.querySelector("p.text-xs.text-gray-500");

  conversations.forEach(conv => {
    if (!conv.querySelector("input[type='checkbox']")) {
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.name = "conv";
      checkbox.style.marginRight = "8px";

      const href = conv.getAttribute('href');
      const id = getConvId(href);

      if (extensionState.checkAll && id) {
        checkbox.checked = true;
        if (!extensionState.convList.includes(id)) {
          extensionState.convList.push(id);
          extensionState.selectedNum = extensionState.convList.length;
          if (screen) {
            screen.textContent = extensionState.selectedNum + " conversation(s) selected";
          }
        }
      } else if (id && extensionState.convList.includes(id)) {
        checkbox.checked = true;
      }

      conv.prepend(checkbox);

      conv.addEventListener("click", (e) => {
        if (!extensionState.toggleChecked) return;
        e.preventDefault();

        const input = conv.querySelector("input[type='checkbox']");
        if (!input) return;

        input.checked = !input.checked;
        const convHref = conv.getAttribute('href');
        const convId = getConvId(convHref);

        if (!convId) return;

        if (input.checked) {
          if (!extensionState.convList.includes(convId)) {
            extensionState.convList.push(convId);
          }
        } else {
          const index = extensionState.convList.indexOf(convId);
          if (index > -1) {
            extensionState.convList.splice(index, 1);
          }
        }

        console.log("Selected conversations:", extensionState.convList);
        extensionState.selectedNum = extensionState.convList.length;

        const screenEl = document.querySelector("p.text-xs.text-gray-500");
        if (screenEl) {
          screenEl.textContent = extensionState.selectedNum + " conversation(s) selected";
        }
      });
    }
  });
}

function getConvId(url) {
  if (!url || typeof url !== 'string') {
    console.warn('[GPT History Cleaner] Invalid URL type:', typeof url, url);
    return null;
  }

  const parts = url.split("/");
  const id = parts[parts.length - 1];

  if (!id || id === '' || id.includes('[object') || id.includes('Promise') || id === 'undefined' || id === 'null') {
    console.warn('[GPT History Cleaner] Invalid conversation ID extracted:', id, 'from URL:', url);
    return null;
  }

  return id;
}

function customFetch(action, id) {
  console.log(`[GPT History Cleaner] customFetch called with action=${action}, id=${id} (type: ${typeof id})`);

  if (!id || typeof id !== 'string') {
    return Promise.reject(new Error(`Invalid ID: ${id} (type: ${typeof id})`));
  }

  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        type: "GPT_HISTORY_ACTION",
        action: action,
        id: id
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error("Extension error:", chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
          return;
        }

        if (response && response.success) {
          console.log(`${action} success for ${id}`);
          resolve();
        } else {
          console.error(`${action} failed:`, response ? response.error : "No response");
          reject(new Error(response ? response.error : "Unknown error"));
        }
      }
    );
  });
}
