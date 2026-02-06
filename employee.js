// assets/js/employee.js
import { callApi, showUserMessage, logMessage } from './config.js';

const user = JSON.parse(localStorage.getItem("user") || "{}");
if (!user.id) location.href = "login.html";

const listEl  = document.getElementById('employees-list');
const statsEl = document.getElementById('employees-stats');
let cachedRoles = [];

// ---------- helpers ----------
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text ?? '';
  return div.innerHTML;
}
function formatDate(d) {
  if (!d) return '';
  const x = new Date(d);
  return x.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
function roleChips(roles) {
  if (!roles || !roles.length) return '';
  const names = roles.map(r => typeof r === 'string' ? r : (r?.name ?? ''));
  return `<div class="mt-2 d-flex flex-wrap gap-2">
    ${names.filter(Boolean).map(n => `<span class="badge bg-info-subtle text-info">${escapeHtml(n)}</span>`).join('')}
  </div>`;
}

// ---------- list ----------
export async function loadEmployees() {
  try {
    const res = await callApi('get_employees', {});
    if (!res.success) throw new Error(res.message || 'Failed to load');

    const employees = res.data?.employees || [];
    listEl.innerHTML = employees.length
      ? employees.map(e => renderCard(e)).join('')
      : `<div class="text-muted">No employees yet.</div>`;

    statsEl.innerHTML = `
      <div class="d-flex justify-content-between"><div>Total</div><div>${employees.length}</div></div>
    `;

    bindCardActions(employees);
  } catch (err) {
    showUserMessage(err.message, 'error');
    logMessage('Load employees error:', err);
  }
}

function renderCard(e) {
  return `
    <div class="task-modern-card shadow-sm p-3 mb-3 rounded border bg-white" data-id="${e.id}">
      <div class="d-flex justify-content-between align-items-start">
        <div class="d-flex align-items-start gap-2">
          <div class="flex-shrink-0 rounded-circle bg-light border d-inline-flex align-items-center justify-content-center" style="width:40px;height:40px;">
            <span class="text-muted fw-bold">${escapeHtml((e.first_name?.[0] || '?') + (e.last_name?.[0] || ''))}</span>
          </div>
          <div>
            <div class="fw-semibold">${escapeHtml(`${e.first_name || ''} ${e.last_name || ''}`.trim())}</div>
            <div class="text-muted small">${escapeHtml(e.email || '')}</div>
            ${roleChips(e.roles)}
          </div>
        </div>

        <div class="dropdown">
          <i class="fa fa-ellipsis-v text-muted dropdown-toggle" data-bs-toggle="dropdown" style="cursor:pointer;"></i>
          <div class="dropdown-menu custom-task-menu p-0">
            <div class="menu-header d-flex align-items-center justify-content-between px-3 py-2">
              <span class="menu-title">Employee</span>
              <div class="menu-actions">
                <a href="#" class="edit-btn" data-edit="${e.id}" title="Edit"><i class="fa fa-pencil-alt"></i></a>
                <a href="#" class="delete-btn" data-del="${e.id}" title="Delete"><i class="fa fa-trash-alt"></i></a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="d-flex justify-content-between align-items-center pt-2 mt-3 border-top pt-2" style="font-size: 13px;">
        <small class="text-muted">Created on: ${formatDate(e.created_at)}</small>
        <small class="text-muted">Updated: ${formatDate(e.updated_at)}</small>
      </div>
    </div>
  `;
}

function bindCardActions(list) {
  // Edit
  listEl.querySelectorAll("[data-edit]").forEach(btn => {
    btn.addEventListener("click", async (ev) => {
      ev.preventDefault();
      const id = Number(btn.getAttribute("data-edit"));
      const emp = list.find(x => Number(x.id) === id);
      if (!emp) return;
      await openEditModal(emp);
    });
  });

  // Delete
  listEl.querySelectorAll("[data-del]").forEach(btn => {
    btn.addEventListener("click", async (ev) => {
      ev.preventDefault();
      const id = Number(btn.getAttribute("data-del"));
      if (!id) return;
      if (!confirm('Delete this employee?')) return;
      try {
        const res = await callApi('delete_employee', { id });
        if (!res?.success) throw new Error(res?.message || 'Delete failed');
        showUserMessage('Employee deleted', 'success');
        await loadEmployees();
      } catch (e) {
        showUserMessage(e.message, 'error');
      }
    });
  });
}

// ---------- roles loader ----------
async function loadEmployeeRolesIntoSelect() {
  try {
    if (!cachedRoles.length) {
      const res = await callApi('get_roles', {});
      if (!res?.success) throw new Error(res?.message || 'Failed to load roles');
      cachedRoles = (res.data?.roles || []).filter(r => Number(r.status ?? 1) === 1);
    }
    const sel = document.getElementById('role_ids');
    if (!sel) return;
    sel.innerHTML = cachedRoles.map(r => `<option value="${r.id}">${escapeHtml(r.name)}</option>`).join('');
  } catch (e) {
    showUserMessage('Could not load roles', 'error');
    logMessage('get_roles error', e);
  }
}

// ---------- modals ----------
async function openAddModal() {
  const res = await fetch("add_employee.html");
  document.getElementById("employeeModalContent").innerHTML = await res.text();
  await loadEmployeeRolesIntoSelect();
  new bootstrap.Modal(document.getElementById("employeeModal")).show();
}

async function openEditModal(emp) {
  const res = await fetch("edit_employee.html");
  document.getElementById("employeeModalContent").innerHTML = await res.text();
  await loadEmployeeRolesIntoSelect();

  // fill values
  document.getElementById('emp_id').value     = emp.id;
  document.getElementById('first_name').value = emp.first_name || '';
  document.getElementById('last_name').value  = emp.last_name  || '';
  document.getElementById('email').value      = emp.email      || '';

  // preselect roles if available
  if (emp.roles && emp.roles.length) {
    const selected = new Set(emp.roles.map(r => Number(r.id ?? r)));
    Array.from(document.getElementById('role_ids').options).forEach(o => {
      o.selected = selected.has(Number(o.value));
    });
  }

  new bootstrap.Modal(document.getElementById("employeeModal")).show();
}

// ---------- init ----------
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById("btn-add")?.addEventListener("click", openAddModal);
  loadEmployees();
});

// ---------- submit handler (single) ----------
document.addEventListener('submit', async (e) => {
  const form = e.target;

  // ADD
  if (form?.id === 'addEmployeeForm') {
    e.preventDefault();
    const payload = {
      first_name: (document.getElementById('first_name').value || '').trim(),
      last_name:  (document.getElementById('last_name').value  || '').trim(),
      email:      (document.getElementById('email').value      || '').trim(),
      role_ids:   Array.from(document.getElementById('role_ids')?.selectedOptions || [])
                    .map(o => Number(o.value))
    };
    if (!payload.first_name || !payload.last_name || !payload.email) {
      showUserMessage('Please fill all fields.', 'error');
      return;
    }
    try {
      const res = await callApi('add_employee', payload);
      if (!res.success) throw new Error(res.message || 'Save failed');
      showUserMessage('Employee added', 'success');
      bootstrap.Modal.getInstance(document.getElementById('employeeModal'))?.hide();
      await loadEmployees();
    } catch (err) {
      showUserMessage(err.message, 'error');
      logMessage('add_employee error:', err);
    }
    return;
  }

  // EDIT
  if (form?.id === 'editEmployeeForm') {
    e.preventDefault();

    const fd = new FormData(form);
    const roleIds = Array.from(form.querySelector('#role_ids')?.selectedOptions || [])
                         .map(o => Number(o.value));

    const payload = {
      id:         Number(fd.get('id') || 0),
      first_name: String(fd.get('first_name') || '').trim(),
      last_name:  String(fd.get('last_name')  || '').trim(),
      email:      String(fd.get('email')      || '').trim(),
      role_ids:   roleIds
    };

    if (!payload.id || !payload.first_name || !payload.last_name || !payload.email) {
      showUserMessage('Please fill all fields.', 'error');
      return;
    }

    try {
      const res = await callApi('update_employee', payload);
      if (!res?.success) throw new Error(res?.message || 'Update failed');
      showUserMessage('Employee updated', 'success');
      bootstrap.Modal.getInstance(document.getElementById('employeeModal'))?.hide();
      await loadEmployees();
    } catch (err) {
      showUserMessage(err.message, 'error');
      logMessage('update_employee error:', err);
    }
  }
});
