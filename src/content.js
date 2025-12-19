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







}





