// assets/js/edit_task.js
import { callApi, showUserMessage, logMessage } from "./config.js";

const user = JSON.parse(localStorage.getItem("user") || "{}");

// Bind after the partial is injected (the script is included inside the popup)
(function initEditTask() {
  const form = document.getElementById('editTaskForm');
  if (!form) return;

  // Load employees + preselect current ones
  loadEmployeesAndPreselect().catch(err => {
    logMessage('loadEmployeesAndPreselect error', err);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fd = new FormData(form);
    const taskData = {
      user_id: user.id,
      task_id: Number(fd.get('task_id') || 0),
      title: String(fd.get('title') || '').trim(),
      description: String(fd.get('description') || '').trim(),
      priority: String(fd.get('priority') || ''),
      status: String(fd.get('status') || ''),
      due_date: String(fd.get('due_date') || '') || null
    };

    const employee_ids = Array.from(document.getElementById('employee_ids')?.selectedOptions || [])
                              .map(o => Number(o.value));

    // DEBUG: see exactly what we're sending
    console.log('update_task payload:', taskData);
    console.log('save_task_participants payload:', { task_id: taskData.task_id, employee_ids });

    if (!taskData.task_id || !taskData.title) {
      showUserMessage('Task title is required', 'error');
      return;
    }

    try {
      // 1) update task row
      const res = await callApi('update_task', taskData);
      if (!res?.success) throw new Error(res?.message || 'Update failed');

      // 2) save participants
      const res2 = await callApi('save_task_participants', {
        task_id: taskData.task_id,
        employee_ids
      });
      if (!res2?.success) throw new Error(res2?.message || 'Failed to save participants');

      showUserMessage('Task updated successfully', 'success');
      bootstrap.Modal.getInstance(document.getElementById('taskModal'))?.hide();
      if (typeof window.loadTasks === 'function') window.loadTasks();

    } catch (err) {
      showUserMessage(err.message, 'error');
      logMessage('Update Task Error:', err);
    }
  });
})();

// ---- helpers ----
async function loadEmployeesAndPreselect() {
  const taskId = Number(document.getElementById('task_id')?.value || 0);
  const selectEl = document.getElementById('employee_ids');
  if (!selectEl || !taskId) return;

  // 1) fill employees
  const empRes = await callApi('get_employees', {});
  if (!empRes?.success) throw new Error(empRes?.message || 'Failed to load employees');
  selectEl.innerHTML = (empRes.data?.employees || [])
    .map(e => `<option value="${e.id}">${e.first_name} ${e.last_name} — ${e.email}</option>`)
    .join('');

  // 2) preselect current participants
  const partRes = await callApi('get_task_participants', { task_id: taskId });
  const selected = new Set((partRes.data?.participants || []).map(p => Number(p.id)));
  Array.from(selectEl.options).forEach(o => { o.selected = selected.has(Number(o.value)); });
}
