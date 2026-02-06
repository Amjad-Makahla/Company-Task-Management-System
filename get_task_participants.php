<?php
require_once("config.php");
require_once("../controls/api_response.php");
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');
validate_request_method("POST");

$body = json_decode(file_get_contents("php://input"), true);
if (!$body) { $body = $_POST; }
$task_id = isset($body['task_id']) ? (int)$body['task_id'] : 0;
if ($task_id <= 0) { print_response(false, "MISSING_TASK_ID"); exit; }

try {
  $sql = "SELECT tp.employee_id AS id, e.first_name, e.last_name, e.email
          FROM task_participants tp
          JOIN employee e ON e.id = tp.employee_id
          WHERE tp.task_id = ? AND e.status = 1
          ORDER BY e.first_name, e.last_name";
  $stmt = $conn->prepare($sql);
  if (!$stmt) throw new Exception("Prepare failed: ".$conn->error);
  $stmt->bind_param("i", $task_id);
  if (!$stmt->execute()) { $stmt->close(); throw new Exception("Execute failed: ".$conn->error); }
  $res = $stmt->get_result();

  $participants = [];
  while ($row = $res->fetch_assoc()) {
    $participants[] = [
      "id" => (int)$row["id"],
      "name" => $row["first_name"]." ".$row["last_name"],
      "email" => $row["email"]
    ];
  }
  $stmt->close();

  print_response(true, "OK", ["participants" => $participants]);
} catch (Throwable $e) {
  print_response(false, "DB_ERROR: ".$e->getMessage());
} finally {
  $conn->close();
}
