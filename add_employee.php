<?php
// add_employee.php
require_once("config.php");
require_once("../controls/api_response.php");

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

validate_request_method("POST");

// read JSON body or form-data
$body = json_decode(file_get_contents("php://input"), true);
if (!$body) { $body = $_POST; }

$first_name = trim($body['first_name'] ?? '');
$last_name  = trim($body['last_name']  ?? '');
$email      = trim($body['email']      ?? '');
$role_ids   = $body['role_ids'] ?? []; // [] or array of ints

if ($first_name === '' || $last_name === '' || $email === '') {
  print_response(false, "MISSING_FIELDS: first_name, last_name, email are required");
  exit;
}

try {
  $conn->begin_transaction();

  // 1) insert employee (status defaults to 1 in DB)
  $stmt = $conn->prepare("INSERT INTO employee (first_name, last_name, email) VALUES (?, ?, ?)");
  if (!$stmt) throw new Exception("Prepare failed: ".$conn->error);
  $stmt->bind_param("sss", $first_name, $last_name, $email);
  if (!$stmt->execute()) {
    // duplicate email?
    if ($conn->errno == 1062) {
      $stmt->close();
      $conn->rollback();
      print_response(false, "EMAIL_ALREADY_EXISTS");
      exit;
    }
    throw new Exception("Execute failed: ".$conn->error);
  }
  $emp_id = (int)$conn->insert_id;
  $stmt->close();

  // 2) assign roles (optional)
  if (is_array($role_ids) && count($role_ids) > 0) {
    $ins = $conn->prepare("INSERT IGNORE INTO employee_roles (employee_id, role_id) VALUES (?, ?)");
    if (!$ins) throw new Exception("Prepare failed: ".$conn->error);

    foreach ($role_ids as $rid) {
      $rid = (int)$rid;
      if ($rid <= 0) continue;
      $ins->bind_param("ii", $emp_id, $rid);
      if (!$ins->execute()) {
        $ins->close();
        throw new Exception("Insert role failed: ".$conn->error);
      }
    }
    $ins->close();
  }

  $conn->commit();
  print_response(true, "Employee created", ["id" => $emp_id]);

} catch (Throwable $e) {
  $conn->rollback();
  print_response(false, "DB_ERROR: ".$e->getMessage());
} finally {
  $conn->close();
}
