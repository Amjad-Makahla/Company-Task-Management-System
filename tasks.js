import { callApi, showUserMessage, logMessage } from './config.js';



// State
let __usersCache = [];                // [{id, display_name, email}, ...]
let __selectedTaskId = null;          // current selected task id
let __selectedTaskTitle = '';         // current selected task title
let __currentChecked = new Set();     // assigned user ids for current task 
let __ppsReq = 0; // participants panel request id

// Utility functions
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Initialization
const user = JSON.parse(localStorage.getItem("user") || "{}");
if (!user.id) location.href = "login.html";

const currentUser = user;
const todoList = document.getElementById('todo-list');
const completedList = document.getElementById('completed-tasks-list');

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById("user-name").textContent = currentUser.name;
  document.getElementById("user-email").textContent = currentUser.email;
  document.getElementById("greeting").textContent = `Welcome back, ${currentUser.name} 👋`;

  const today = new Date();
  document.getElementById("day-name").textContent = today.toLocaleDateString("en-GB", { weekday: 'long' });
  document.getElementById("date").textContent = today.toLocaleDateString("en-GB");

  document.getElementById("btn-add")?.addEventListener("click", openAddTaskModal);
  document.getElementById("settings-link")?.addEventListener("click", (e) => {
    e.preventDefault(); alert("Settings coming soon!");
  });

  document.getElementById("logout-link")?.addEventListener("click", (e) => {
    e.preventDefault();
    if (confirm("Logout?")) {
      localStorage.removeItem("user");
      localStorage.removeItem("currentTasks");
      location.href = "login.html";
    }
  });

  loadTasks();
});
document.addEventListener('click', async (e) => {
  const editBtn = e.target.closest('.btn-edit');
  if (!editBtn) return;

  const taskId = parseInt(editBtn.dataset.id);
  const tasks = JSON.parse(localStorage.getItem("currentTasks") || "[]");
  const task = tasks.find(t => t.id === taskId);
  if (!task) return showUserMessage("Task not found", "error");

  try {
    const modalHtml = await fetch('edit_task.html').then(res => res.text());
    document.getElementById('taskModalContent').innerHTML = modalHtml;

    // ✅ Pre-fill form values
    document.getElementById('editTaskId').value = task.id;
    document.getElementById('editTaskTitle').value = task.title;
    document.getElementById('editTaskDueDate').value = task.due_date || '';
    document.getElementById('editTaskPriority').value = task.priority;
    document.getElementById('editTaskStatus').value = task.status;
    document.getElementById('editTaskDescription').value = task.description || '';

    const modal = new bootstrap.Modal(document.getElementById('taskModal'));
    modal.show();
// add below your pre-fill section (after setting editTaskId, editTaskTitle, etc.)

async function loadEmployeesForEdit(taskId) {
  // 1) load active employees
  const empRes = await callApi('get_employees', {});
  if (!empRes?.success) { showUserMessage('Failed to load employees', 'error'); return; }

  const sel = document.getElementById('employee_ids');
  sel.innerHTML = (empRes.data?.employees || [])
    .map(e => `<option value="${e.id}">${e.first_name} ${e.last_name} — ${e.email}</option>`)
    .join('');

  // 2) preselect employees already on this task
  const partRes = await callApi('get_task_participants', { task_id: taskId });
  const selected = new Set((partRes.data?.participants || []).map(p => Number(p.id)));
  Array.from(sel.options).forEach(o => { o.selected = selected.has(Number(o.value)); });
}

// call it before showing the modal
await loadEmployeesForEdit(task.id);

    // ✅ Directly attach the edit form submit handler
    const editTaskForm = document.getElementById('editTaskForm');
    editTaskForm.addEventListener('submit', async function (ev) {
      ev.preventDefault();

      const formData = new FormData(editTaskForm);
      const taskData = {
        user_id: currentUser.id,
        task_id: parseInt(formData.get('task_id')),
        title: formData.get('title').trim(),
        description: formData.get('description').trim(),
        priority: formData.get('priority'),
        status: formData.get('status'),
        due_date: formData.get('due_date') || null
      
      };

      console.log("🧪 Submitting Edit Task:", taskData);

      if (!taskData.title || isNaN(taskData.task_id)) {
        showUserMessage('Missing title or task ID', 'error');
        return;
      }

      try {
        const res = await callApi('update_task', taskData);
        if (!res.success) throw new Error(res.message);

   showUserMessage('Task updated successfully', 'success');
modal.hide();
localStorage.removeItem("currentTasks"); // مسح الكاش المؤقت
await loadTasks(); // إعادة تحميل المهام فعليًا بعد التعديل

        if (typeof window.loadTasks === 'function') {
          window.loadTasks();
        }
      } catch (err) {
        showUserMessage(err.message, 'error');
        logMessage('Update Task Error:', err);
      }
    });

  } catch (err) {
    console.error("❌ Failed to open edit modal", err);
    showUserMessage("Could not load edit form", "error");
  }
});
document.addEventListener('click', async e => {
  // …existing handlers…

  // DELETE handler
  const deleteBtn = e.target.closest('.btn-delete');
  if (deleteBtn) {
    e.preventDefault();
    const taskId = deleteBtn.dataset.id;
    if (!confirm('Are you sure you want to delete this task?')) return;

    // Call your delete API
    const res = await callApi('delete_task', {
      task_id: taskId,
      user_id: currentUser.id
    });

    if (res.success) {
      // Remove the card from the DOM
      const card = deleteBtn.closest('.task-card'); 
      if (card) card.remove();
      // Refresh stats / counts
      loadTasks();
    } else {
      showUserMessage('Failed to delete task.');
    }
  }
});

// Load and render tasks
export async function loadTasks() {
  try {
    const res = await callApi('get_tasks', { user_id: currentUser.id });
    console.log('Tasks API response:', res);

    if (!res.success) throw new Error(res.message);

    todoList.innerHTML = '';
    completedList.innerHTML = '';

    const tasks = res.data.tasks || [];
    const stats = res.data.statistics || {};

    localStorage.setItem('currentTasks', JSON.stringify(tasks));

    tasks.forEach(renderTask);
    updateStatusRings(stats);

    document.dispatchEvent(new CustomEvent('tasksLoaded', { detail: { tasks } }));
  } catch (err) {
    console.error('Load tasks error:', err);
    showUserMessage(err.message, 'error');
  }
}

// Handle status updates
document.addEventListener('click', async (e) => {
  const target = e.target.closest('.btn-status');
  if (!target) return;

  const taskId = parseInt(target.dataset.id);
  const newStatus = target.dataset.status;

  try {
    // الحصول على بيانات المهمة الكاملة من التخزين المحلي
    const currentTasks = JSON.parse(localStorage.getItem('currentTasks') || '[]');
    const task = currentTasks.find(t => t.id === taskId);
    if (!task) {
      showUserMessage('Task not found in local data', 'error');
      return;
    }

    // إرسال كل بيانات المهمة محدثة بالحالة الجديدة
    const res = await callApi('update_task', {
      task_id: taskId,
      user_id: currentUser.id,
      title: task.title,
      description: task.description || '',
      priority: task.priority || 'moderate',
      due_date: task.due_date || null,
      status: newStatus
    });

    if (!res.success) throw new Error(res.message);
    showUserMessage('Task status updated', 'success');

    // إزالة الكاش القديم وتحميل المهام الجديدة
    localStorage.removeItem('currentTasks');
    loadTasks();

  } catch (err) {
    showUserMessage(err.message, 'error');
    logMessage('Status update error:', err);
  }
});


// Render each task card
  function renderTask(task) {
    const card = document.createElement('div');
    card.dataset.id = task.id;
    card.className = 'task-modern-card shadow-sm p-3 mb-3 rounded border bg-white';

    const isCompleted = task.status === 'completed';
    const createdDate = task.created_at ? formatDate(task.created_at) : 'Unknown';
    const priority = task.priority || 'moderate';
    const statusText = task.status || 'notstarted';

    const statusMap = {
      notstarted: { color: '#e74c3c', label: 'Not Started' },
      inprogress: { color: '#3498db', label: 'In Progress' },
      completed: { color: '#2ecc71', label: 'Completed' }
    };

    const { color: statusColor, label: statusLabel } = statusMap[statusText] || {};

    card.innerHTML = `
      <div class="d-flex justify-content-between align-items-start">
        <div class="d-flex align-items-start gap-2">
          <span class="status-ring mt-1" style="border: 2px solid ${statusColor}; width: 12px; height: 12px; border-radius: 50%; display: inline-block;"></span>
          <div>
            <h6 class="fw-bold mb-1 text-dark">${escapeHtml(task.title)}</h6>
            <p class="text-muted small mb-0">${escapeHtml(task.description || '')}</p>
          </div>
        </div>
       <div class="dropdown">
  <i
    class="fa fa-ellipsis-v text-muted dropdown-toggle"
    data-bs-toggle="dropdown"
    style="cursor:pointer;"
  ></i>

  <div class="dropdown-menu custom-task-menu p-0">
    <!-- HEADER BAR -->
    <div class="menu-header d-flex align-items-center justify-content-between px-3 py-2">
      <span class="menu-title">Task</span>
      <div class="menu-actions">
        <a href="#" class="edit-btn btn-edit" data-id="${task.id}">
          <i class="fa fa-pencil-alt"></i>
        </a>
        <a href="#" class="delete-btn btn-delete" data-id="${task.id}">
          <i class="fa fa-trash-alt"></i>
        </a>
      </div>
    </div>
    <div class="dropdown-divider my-0"></div>

    <!-- STATUS ITEMS -->
    <a class="dropdown-item status-item text-danger btn-status" href="#"
       data-id="${task.id}" data-status="notstarted">
      Not Started
    </a>
    <div class="dropdown-divider my-0"></div>

    <a class="dropdown-item status-item text-warning btn-status" href="#"
       data-id="${task.id}" data-status="inprogress">
      In Progress
    </a>
    <div class="dropdown-divider my-0"></div>

    <a class="dropdown-item status-item text-success btn-status" href="#"
       data-id="${task.id}" data-status="completed">
      Completed
    </a>
  </div>
</div>

      </div>

      <div class="d-flex justify-content-between align-items-center pt-2 mt-3 border-top pt-2" style="font-size: 13px;">
        <small class="text-muted">Priority: <span class="text-capitalize">${priority}</span></small>
        <small class="text-muted">Status: <span style="color: ${statusColor};">${statusLabel}</span></small>
        <small class="text-muted">Created on: ${createdDate}</small>
      </div>
    `;

    if (isCompleted) {
      card.classList.add('completed-task-card');
      completedList.appendChild(card);
    } else {
      todoList.appendChild(card);
    }
  }

// Update donut chart rings
function updateStatusRings(stats) {
  const total = stats.total || 0;
  if (total === 0) {
    ['completed', 'inprogress', 'notstarted'].forEach(s => updateRing(s, 0));
    return;
  }
  updateRing('completed', stats.completed_percentage || 0);
  updateRing('inprogress', stats.inprogress_percentage || 0);
  updateRing('notstarted', stats.notstarted_percentage || 0);
}

function updateRing(status, percentage) {
  const ring = document.querySelector(`.ring-fill.${status}`);
  const text = document.getElementById(`${status}-percent`);
  const circumference = 188.5;
  if (ring && text) {
    const offset = circumference - (percentage / 100) * circumference;
    ring.style.strokeDashoffset = offset;
    text.textContent = `${Math.round(percentage)}%`;
  }
}

// Open modal and add task
async function openAddTaskModal() {
  try {
    const res = await fetch("tasks.html");
    const html = await res.text();
    document.getElementById("taskModalContent").innerHTML = html;

    const modal = new bootstrap.Modal(document.getElementById("taskModal"));
    modal.show();

    const addTaskForm = document.getElementById('addTaskForm');
    if (addTaskForm) {
      addTaskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(addTaskForm);
        const taskData = {
          user_id: currentUser.id,
          title: formData.get('title').trim(),
          due_date: formData.get('due_date'),
          priority: formData.get('priority'),
          description: formData.get('description').trim(),
          status: formData.get('status')
          
        };

        try {
          const res = await callApi('add_task', taskData);
          if (!res.success) throw new Error(res.message);
          showUserMessage('Task added successfully', 'success');
          bootstrap.Modal.getInstance(document.getElementById('taskModal'))?.hide();
          loadTasks();
        } catch (err) {
          showUserMessage(err.message, 'error');
        }
      });
    }
  } catch (err) {
    console.error("Failed to open Add Task modal:", err);
    showUserMessage("Failed to open task modal", "error");

  }

}
async function loadUserOptions() {
  if (__usersCache.length) return __usersCache;
  const res = await callApi(TP_PATHS.usersOptions, 'GET');
  const users = (res.data && res.data.users) ? res.data.users : (res.users || []);
  __usersCache = users.map(u => ({
    id: Number(u.id),
    display_name: u.display_name || u.name || u.email,
    email: u.email || ''
  }));
  return __usersCache;
}

function renderParticipantsList(filter = '') {
  const q = (filter || '').trim().toLowerCase();
  const list = __usersCache.filter(u =>
    !q ||
    (u.display_name && u.display_name.toLowerCase().includes(q)) ||
    (u.email && u.email.toLowerCase().includes(q))
  );

  participantsListEl.innerHTML = list.map(u => {
    const checked = __currentChecked.has(u.id) ? 'checked' : '';
    return `
      <label class="user-row">
        <input type="checkbox" class="form-check-input me-2" data-user-id="${u.id}" ${checked}>
        <div>
          <div>${u.display_name || ''}</div>
          <div class="user-email">${u.email || ''}</div>
        </div>
      </label>
    `;
  }).join('') || `<div class="text-muted">No users found.</div>`;
}

function collectCheckedUserIds() {
  const boxes = participantsListEl.querySelectorAll('input[type="checkbox"][data-user-id]');
  const ids = [];
  boxes.forEach(b => { if (b.checked) ids.push(Number(b.getAttribute('data-user-id'))); });
  return ids;
}

participantsSearchEl?.addEventListener('input', (e) => {
  renderParticipantsList(e.target.value);
});

