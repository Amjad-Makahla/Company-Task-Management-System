<?php
// api/update_employee.php — FULL VERSION
require_once("config.php");
require_once("../controls/api_response.php");

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

validate_request_method("POST");

// Accept JSON or form-data
$body = json_decode(file_get_contents("php://input"), true);
if (!$body) { $body = $_POST; }

$id         = isset($body['id']) ? intval($body['id']) : 0;
$first_name = trim($body['first_name'] ?? '');
$last_name  = trim($body['last_name'] ?? '');
$email      = trim($body['email'] ?? '');
$role_ids   = $body['role_ids'] ?? [];

if ($id <= 0 || $first_name === '' || $last_name === '' || $email === '') {
  print_response(false, "Missing required fields (id, first_name, last_name, email).");
  exit;
}

// Normalize role_ids to int
if (!is_array($role_ids)) $role_ids = [];
$role_ids = array_values(array_filter(array_map('intval', $role_ids), fn($v) => $v > 0));

try {
  $conn->begin_transaction();

  // Ensure email is unique (except current record)
  $chk = $conn->prepare("SELECT id FROM employee WHERE email = ? AND id <> ? LIMIT 1");
  if (!$chk) throw new Exception("Prepare email check failed: ".$conn->error);
  $chk->bind_param("si", $email, $id);
  if (!$chk->execute()) { $chk->close(); throw new Exception("Email check execute failed: ".$conn->error); }
  $chk->store_result();
  if ($chk->num_rows > 0) { $chk->close(); throw new Exception("Email already in use."); }
  $chk->close();

  // Update employee
  $upd = $conn->prepare("UPDATE employee SET first_name = ?, last_name = ?, email = ? WHERE id = ?");
  if (!$upd) throw new Exception("Prepare update failed: ".$conn->error);
  $upd->bind_param("sssi", $first_name, $last_name, $email, $id);
  if (!$upd->execute()) { $upd->close(); throw new Exception("Update failed: ".$conn->error); }
  if ($upd->affected_rows < 0) { $upd->close(); throw new Exception("No rows updated."); }
  $upd->close();

  // Replace roles
  $del = $conn->prepare("DELETE FROM employee_roles WHERE employee_id = ?");
  if (!$del) throw new Exception("Prepare delete roles failed: ".$conn->error);
  $del->bind_param("i", $id);
  if (!$del->execute()) { $del->close(); throw new Exception("Delete roles failed: ".$conn->error); }
  $del->close();

  if (count($role_ids)) {
    // Insert IGNORE to avoid duplicates if a UNIQUE(employee_id,role_id) exists
    $ins = $conn->prepare("INSERT IGNORE INTO employee_roles (employee_id, role_id) VALUES (?, ?)");
    if (!$ins) throw new Exception("Prepare insert role failed: ".$conn->error);
    foreach ($role_ids as $rid) {
      $ins->bind_param("ii", $id, $rid);
      if (!$ins->execute()) { $ins->close(); throw new Exception("Insert role failed: ".$conn->error); }
    }
    $ins->close();
  }

  $conn->commit();
  print_response(true, "Employee updated successfully.", [
    "id" => $id,
    "first_name" => $first_name,
    "last_name" => $last_name,
    "email" => $email,
    "role_ids" => $role_ids
  ]);

} catch (Throwable $e) {
  $conn->rollback();
  print_response(false, "DB_ERROR: ".$e->getMessage());
} finally {
  $conn->close();
}
