chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "GPT_HISTORY_ACTION") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || !tabs[0]) {
        console.error('[GPT History Cleaner] No active tab found');
        sendResponse({ success: false, error: "No active tab found" });
        return;
      }
      
      const tabId = tabs[0].id;
      
      handleAction(request.action, request.id, tabId)
        .then(() => sendResponse({ success: true }))
        .catch(error => {
          console.error('[GPT History Cleaner] Error:', error);
          sendResponse({ success: false, error: error.message });
        });
    });
    
    return true;
  }
});

async function handleAction(action, conversationId, tabId) {
  if (!tabId) {
    throw new Error("No tab ID available");
  }

  const result = await chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    func: async (action, id) => {
      try {
        function getCookie(name) {
          const value = `; ${document.cookie}`;
          const parts = value.split(`; ${name}=`);
          if (parts.length === 2) return parts.pop().split(';').shift();
          return null;
        }

        const getDeviceId = () => {
          return getCookie('oai-did') || localStorage.getItem('oai-did') || '5c97cf74-5c28-412c-91f9-66c10f5aedb4';
        };

        const getBearerToken = async () => {
          try {
            const response = await fetch('https://chatgpt.com/api/auth/session');
            const session = await response.json();
            return session?.accessToken || null;
          } catch (e) {
            console.error('[GPT History Cleaner] Failed to get session:', e);
            return null;
          }
        };

        const token = await getBearerToken();
        
        if (!token) {
          throw new Error('No authentication token found. Please refresh the page and try again.');
        }

        const url = `https://chatgpt.com/backend-api/conversation/${id}`;
        let body;

        if (action === "delete") {
          body = { is_visible: false };
        } else if (action === "archive") {
          body = { is_archived: true };
        }

        const headers = {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "oai-device-id": getDeviceId(),
          "oai-language": navigator.language || "en-US"
        };

        const response = await fetch(url, {
          method: "PATCH" ,
          headers: headers,
          body: JSON.stringify(body),
          credentials: "include"
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const resultData = await response.json();
        console.log(`[GPT History Cleaner] ${action} success:`, id);
        return { success: true, status: response.status, data: resultData };

      } catch (error) {
        console.error(`[GPT History Cleaner] ${action} failed:`, error);
        throw error;
      }
    },
    args: [action, conversationId]
  });

  if (result && result[0] && result[0].result) {
    if (result[0].result.success) {
      return result[0].result;
    } else {
      throw new Error(result[0].result.error || "Unknown error");
    }
  }
  
  throw new Error("No result returned from script execution");
}
