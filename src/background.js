chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "GPT_HISTORY_ACTION") {
    handleAction(request.action, request.ids, sender.tab?.id || null)
      .then(result => sendResponse({ success: true, failed: result.failed }))
      .catch(error => {
        console.error('[GPT History Cleaner] Error:', error);
        sendResponse({ success: false, error: error.message });
      });

    return true;
  }
});

async function handleAction(action, conversationIds, tabId) {
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
    args: [action, conversationIds]
  });

  if (result?.[0]?.result?.success) {
    return result[0].result;
  }

  throw new Error(result?.[0]?.result?.error || "Action failed");
}

async function performAction(action, ids) {
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

    const patchConversation = async (id) => {
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
    };

    // Limited concurrency: fast, without tripping ChatGPT's rate limit (HTTP 429)
    const CONCURRENCY = 5;
    const queue = [...ids];
    const failed = [];

    const worker = async () => {
      while (queue.length > 0) {
        const id = queue.shift();
        try {
          await patchConversation(id);
        } catch (error) {
          failed.push({ id, error: error.message });
        }
      }
    };

    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, ids.length) }, worker));

    if (failed.length === ids.length) {
      throw new Error(failed[0].error);
    }

    return { success: true, failed };

  } catch (error) {
    console.error(`[GPT History Cleaner] ${action} failed:`, error);
    return { success: false, error: error.message };
  }
}