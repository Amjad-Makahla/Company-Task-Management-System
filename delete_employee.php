<?php
// delete_employee.php  (soft delete: status = 0)
require_once("config.php");
require_once("../controls/api_response.php");

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

validate_request_method("POST");

// JSON or form-data
$body = json_decode(file_get_contents("php://input"), true);
if (!$body) { $body = $_POST; }

$id = isset($body['id']) ? (int)$body['id'] : 0;
if ($id <= 0) { print_response(false, "MISSING_ID"); exit; }

try {
  $stmt = $conn->prepare("UPDATE employee SET status = 0, updated_at = NOW() WHERE id = ? AND status <> 0");
  if (!$stmt) throw new Exception("Prepare failed: ".$conn->error);
  $stmt->bind_param("i", $id);
  if (!$stmt->execute()) { $stmt->close(); throw new Exception("Update failed: ".$conn->error); }

  $msg = ($stmt->affected_rows > 0) ? "Employee deactivated" : "Already inactive or not found";
  $stmt->close();

  print_response(true, $msg);
} catch (Throwable $e) {
  print_response(false, "DB_ERROR: ".$e->getMessage());
} finally {
  $conn->close();
}
