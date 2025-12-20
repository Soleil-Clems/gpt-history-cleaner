chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "GPT_HISTORY_ACTION") {
    handleAction(request.action, request.id, sender.tab?.id || null)
      .then(() => sendResponse({ success: true }))
      .catch(error => {
        console.error('[GPT History Cleaner] Error:', error);
        sendResponse({ success: false, error: error.message });
      });

    return true;
  }
});

async function handleAction(action, conversationId, tabId) {
  if (!tabId) {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs || !tabs[0]) {
      throw new Error("No active tab found");
    }
    tabId = tabs[0].id;
  }

  const result = await chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    func: performAction,
    args: [action, conversationId]
  });

  if (result?.[0]?.result?.success) {
    return result[0].result;
  }

  throw new Error(result?.[0]?.result?.error || "Action failed");
}

async function performAction(action, id) {
  try {
    const getCookie = (name) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      return parts.length === 2 ? parts.pop().split(';').shift() : null;
    };

    const getDeviceId = () => {
      return getCookie('oai-did') ||
        localStorage.getItem('oai-did') ||
        '5c97cf74-5c28-412c-91f9-66c10f5aedb4';
    };

    // Fetch le token à chaque fois
    const response = await fetch('https://chatgpt.com/api/auth/session');
    if (!response.ok) {
      throw new Error('Failed to fetch session');
    }
    const session = await response.json();
    const token = session?.accessToken;
    const deviceId = getDeviceId();

    if (!token) {
      throw new Error('No authentication token found. Please refresh the page.');
    }

    const body = action === "delete"
      ? { is_visible: false }
      : { is_archived: true };

    const patchResponse = await fetch(
      `https://chatgpt.com/backend-api/conversation/${id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "oai-device-id": deviceId,
          "oai-language": navigator.language || "en-US"
        },
        body: JSON.stringify(body),
        credentials: "include"
      }
    );

    if (!patchResponse.ok) {
      const errorText = await patchResponse.text();
      throw new Error(`HTTP ${patchResponse.status}: ${errorText}`);
    }

    const data = await patchResponse.json();

    return { success: true, status: patchResponse.status, data };

  } catch (error) {
    console.error(`[GPT History Cleaner] ${action} failed:`, error);
    return { success: false, error: error.message };
  }
}