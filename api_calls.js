// Deployment stage variable
const isLive = false; // Set to true for live deployment

// Set the base URL depending on the deployment stage
const base_url = isLive
    ? "api/" // Update with your live URL
    : "api/";

// Logging function: logs messages only when not in live mode
function logMessage(message, data = null) {
    if (!isLive) {
        console.log(message, data);
    }
}

// Display a custom user message (e.g., using a toast)
function showUserMessage(message, type = "info") {
    logMessage("show user message function has started");
    let existingBox = document.getElementById("user-message-box");
    if (existingBox) {
        existingBox.remove();
    }

    const messageBox = document.createElement("div");
    messageBox.id = "user-message-box";
    messageBox.textContent = message;

    let backgroundColor;
    switch (type) {
        case "success":
            backgroundColor = "#28a745";
            break;
        case "error":
            backgroundColor = "#dc3545";
            break;
        case "warning":
            backgroundColor = "#ffc107";
            break;
        default:
            backgroundColor = "#333333";
    }

    Object.assign(messageBox.style, {
        position: "fixed",
        top: "-100px",
        left: "50%",
        transform: "translateX(-50%)",
        backgroundColor: backgroundColor,
        color: "#fff",
        padding: "15px 30px",
        borderRadius: "5px",
        boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
        zIndex: 9999,
        fontSize: "16px",
        opacity: "0",
        transition: "all 0.5s ease-in-out",
    });

    document.body.appendChild(messageBox);
    setTimeout(() => {
        messageBox.style.top = "20px";
        messageBox.style.opacity = "1";
    }, 100);
    setTimeout(() => {
        messageBox.style.top = "-100px";
        messageBox.style.opacity = "0";
    }, 3000);
    setTimeout(() => {
        messageBox.remove();
    }, 4000);
}

/**
 * Validates an image file based on size and type.
 * @param {File} file - The image file to validate.
 * @param {Object} options - Validation options.
 * @param {number} options.maxSizeMB - Maximum file size in MB.
 * @param {string[]} options.allowedTypes - Allowed MIME types.
 * @returns {Object} Validation result with success and message.
 */
const defaultValidationOptions = {
    maxSizeMB: 2,
    allowedTypes: ["image/jpeg", "image/png"],
};

function validateImage(file, { maxSizeMB, allowedTypes }) {
    const maxSizeBytes = maxSizeMB * 1024 * 1024; // Convert MB to bytes
    const fileSize = file.size;

    if (fileSize > maxSizeBytes) {
        return {
            success: false,
            message: "File is too large. Maximum size allowed is " + maxSizeMB + "MB.",
        };
    }

    const fileType = file.type;
    if (!allowedTypes.includes(fileType)) {
        return {
            success: false,
            message: `Invalid file type. Allowed types: ${allowedTypes.join(", ")}`,
        };
    }

    return { success: true };
}

/**
 * Helper function to convert an image file to Base64 format.
 * @param {File} file - The file to convert.
 * @returns {Promise<string>} - A promise that resolves with the Base64 string.
 */
async function toBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(",")[1]); // Get only the Base64 part
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Handles image upload, validates it, and processes it.
 * @param {Event} event - The input change event.
 */
async function handleImageUpload(event) {
    const file = event.target.files[0]; // Get the uploaded file

    // Validate the image with custom options
    const validation = validateImage(file, {
        maxSizeMB: 5,
        allowedTypes: ["image/jpeg", "image/png", "image/gif"],
    });

    if (!validation.success) {
        // Show an error message
        showUserMessage(validation.message, "error");
        event.target.value = ""; // Clear the file input
        return null; // Return null in case of validation failure
    }

    // Convert to Base64 and return it
    const imageBase64 = await toBase64(file);
    return imageBase64; // Return the base64 string
}

// API configurations with dynamic concatenation using the base_url variable
const apis = {


  login: {
  url: `${base_url}login.php`,
  method: "POST"
},
register: {
  url: `${base_url}register.php`,
  method: "POST"
},

get_tasks:{
  url: `${base_url}get_tasks.php`,
  method: "POST"
},
complete_task :
{
  url: `${base_url}complete_task.php`,
  method: "POST"
},
delete_task:
{
  url: `${base_url}delete_task.php`,
  method: "POST"
},


add_task:
 {
  url: `${base_url}add_task.php`,
  method: "POST"
},
update_task:
 {
  url: `${base_url}update_task.php`,
  method: "POST"
}, 

get_employees: {
  url: `${base_url}get_employees.php`,
  method: "POST",
},
add_employee: {
  url: `${base_url}add_employee.php`,
  method: "POST",
},
update_employee: {
  url: `${base_url}update_employee.php`,
  method: "POST",
},
delete_employee: {
  url: `${base_url}delete_employee.php`,
  method: "POST",
},

// Roles
get_roles: {
  url: `${base_url}get_roles.php`,
  method: "POST",
},
get_task_participants: {
  url: `${base_url}get_task_participants`,
  method: "POST",
}
};



// Centralized API Call with Auto Image Conversion
async function callApi(apiName, data = null) {
    const apiConfig = apis[apiName];
    if (!apiConfig) {
        logMessage(`API '${apiName}' not found in the configuration.`);
        return;
    }

    const { url, method } = apiConfig;
    // Since the URL already includes the base_url, we use it directly.
    let apiUrl = url;
    let options = { method };

    if (["POST", "PUT"].includes(method)) {
        if (data instanceof FormData) {
            // Handle image upload if any
            const imageFile = data.get("image");
            if (imageFile) {
                const imageBase64 = await handleImageUpload({ target: { files: [imageFile] } });
                if (imageBase64) {
                    data.set("image", imageBase64);
                }
            }
            options.body = data;
        } else {
            options.headers = { "Content-Type": "application/json" };
            options.body = JSON.stringify({ ...data, is_live: isLive });
        }
    } else if (method === "GET" && data) {  
        const queryParams = new URLSearchParams(data).toString();
        apiUrl += `?${queryParams}`;
    }

    logMessage(`Final Request URL: ${apiUrl}`, options);

    try {
        const response = await fetch(apiUrl, options);
        const jsonData = await response.json();
        logMessage("API Response:", jsonData);

        if (!response.ok) {
            throw new Error(jsonData.message || "Something went wrong");
        }
        if (!jsonData.success) {
            showUserMessage(jsonData.message, "error");
        }

        return jsonData;
    } catch (error) {
        logMessage(`Error in API call '${apiName}':`, error);
        showUserMessage("An error occurred while processing.", "error");
        throw error;
    }
}
async function openParticipantsSidebar(taskId, taskTitle = '') {
  __selectedTaskId = Number(taskId) || 0;
  __selectedTaskTitle = taskTitle || '';
  if (participantsTitleEl) {
    participantsTitleEl.textContent = __selectedTaskTitle || `Task #${__selectedTaskId}`;
  }

  // open panel
  const offcanvas = bootstrap.Offcanvas.getOrCreateInstance(participantsPanelEl);
  offcanvas.show();

  // request token (prevents older, slower requests from overwriting UI)
  const rid = ++__ppsReq;

  // reset UI
  if (participantsSearchEl) participantsSearchEl.value = '';
  if (participantsListEl) {
    participantsListEl.innerHTML = `
      <div class="d-flex align-items-center gap-2 text-muted">
        <div class="spinner-border spinner-border-sm" role="status"></div>
        <span>Loading participants…</span>
      </div>`;
  }

  try {
    // 1) ensure users cached
    await loadUserOptions();
    if (rid !== __ppsReq) return; // user switched tasks fast

    // 2) fetch current participants
    const res = await callApi(`${TP_PATHS.getByTask}?task_id=${__selectedTaskId}`, 'GET');
    const rows = (res.data && res.data.participants) ? res.data.participants : (res.participants || []);
    __currentChecked = new Set(rows.map(r => Number(r.id)));

    if (rid !== __ppsReq) return;

    // 3) render
    renderParticipantsList('');
  } catch (err) {
    console.error(err);
    alert(err?.message || 'Failed to load participants');
  }
}


export { showUserMessage, callApi, logMessage, handleImageUpload, validateImage };
