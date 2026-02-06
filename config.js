// config.js
// API Configuration and Utility Functions

const API_BASE_URL = 'api/';

const API_ENDPOINTS = {
  login: 'login.php',
  register: 'register.php',
  get_tasks: 'get_tasks.php',
  add_task: 'add_task.php',
  update_task: 'update_task.php',
  update_task_status: 'update_task_status.php',
  delete_task: 'delete_task.php',
  complete_task: 'complete_task.php', 
  get_employees: 'get_employees.php',
  add_employee: 'add_employee.php',
  update_employee: 'update_employee.php',
  delete_employee: 'delete_employee.php',
  get_roles: 'get_roles.php',
  get_task_participants: 'get_task_participants.php',
  save_task_participants: 'save_task_participants.php',
};

// Generic API call function
export async function callApi(endpoint, data = {}) {
  try {
    data.is_live = false; // Add is_live flag for debugging
    
    const url = API_BASE_URL + API_ENDPOINTS[endpoint];
    if (!API_ENDPOINTS[endpoint]) {
      throw new Error(`API '${endpoint}' not found in the configuration.`);
    }
    
    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    };
    
    console.log(`Final Request URL: ${url}`, requestOptions);
    
    const response = await fetch(url, requestOptions);
    const result = await response.json();
    
    console.log('API Response:', result);
    
    return result;
  } catch (error) {
    console.error(`Error in API call '${endpoint}':`, error);
    throw error;
  }
}

// Show user message function
export function showUserMessage(message, type = 'info') {
  console.log('show user message function has started', null);
  // You can implement toast notifications here
  // For now, using simple alerts
  if (type === 'error') {
    console.error('User Message (Error):', message);
  } else if (type === 'success') {
    console.log('User Message (Success):', message);
  } else {
    console.log('User Message (Info):', message);
  }
}

// Log message function
export function logMessage(title, data) {
  console.log(title, data);
}


