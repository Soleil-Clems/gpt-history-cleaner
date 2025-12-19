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
  toggleExtension.style.marginRight = "8px";

  child.appendChild(img);
  child.appendChild(text);
  child.appendChild(toggleExtension);
  child.className = "flex gap-2 items-center";
  div.className = "group hoverable flex gap-2 flex-col items-center justify-around";
  div.appendChild(child);

  const board = document.createElement("div");
  board.className = "flex flex-col h-full text-sm";
  
  const selectAllWrapper = document.createElement("div");
  selectAllWrapper.className = "flex items-center gap-2 p-1";
  selectAllWrapper.style.display = "none";
  const selectAll = document.createElement("input");
  selectAll.type = "checkbox";
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

    const confirmed = confirm(
      `Delete ${validIds.length} conversation(s)? This cannot be undone.`
    );

    if (!confirmed) return;

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

      alert(`✓ ${successCount} deleted${failCount > 0 ? `, ${failCount} failed` : ''}`);

      extensionState.convList = [];
      extensionState.selectedNum = 0;
      screen.textContent = "0 conversation(s) selected";

    } catch (error) {
      console.error("Delete operation failed:", error);
      alert("Operation failed. Check console for details.");
    } finally {
      deleteBtn.disabled = false;
      deleteBtn.textContent = originalText;
    }
  });





}





