<?php
// get_employees.php
require_once("config.php");
require_once("../controls/api_response.php");

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

validate_request_method("POST");

try {
  // 1) employees
  $employees = [];
  $sql = "SELECT id, first_name, last_name, email, status, created_at, updated_at
        FROM employee
        WHERE status = 1
        ORDER BY id DESC";

  if (!$res = $conn->query($sql)) {
    throw new Exception("Query employees failed: ".$conn->error);
  }
  while ($row = $res->fetch_assoc()) {
    $eid = (int)$row['id'];
    $employees[$eid] = [
      "id"         => $eid,
      "first_name" => $row['first_name'],
      "last_name"  => $row['last_name'],
      "email"      => $row['email'],
      "status"     => (int)$row['status'],
      "created_at" => $row['created_at'],
      "updated_at" => $row['updated_at'],
      "roles"      => [] // filled next
    ];
  }
  $res->free();

  // short-circuit if empty
  if (!count($employees)) {
    print_response(true, "OK", ["employees" => []]);
    $conn->close();
    exit;
  }

  // 2) roles per employee
  $ids = implode(",", array_keys($employees));
  $sql2 = "SELECT er.employee_id, r.id AS role_id, r.name AS role_name
           FROM employee_roles er
           JOIN roles r ON r.id = er.role_id
           WHERE er.employee_id IN ($ids)
           ORDER BY r.name ASC";
  if (!$res2 = $conn->query($sql2)) {
    throw new Exception("Query roles failed: ".$conn->error);
  }
  while ($row = $res2->fetch_assoc()) {
    $eid = (int)$row['employee_id'];
    if (!isset($employees[$eid])) continue;
    $employees[$eid]['roles'][] = [
      "id"   => (int)$row['role_id'],
      "name" => $row['role_name']
    ];
  }
  $res2->free();

  // 3) flatten to array
  $out = array_values($employees);
  print_response(true, "OK", ["employees" => $out]);

} catch (Throwable $e) {
  print_response(false, "DB_ERROR: ".$e->getMessage());
} finally {
  $conn->close();
}
