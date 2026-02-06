<?php
// api/save_task_participants.php
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
$employee_ids = $body['employee_ids'] ?? [];
if ($task_id <= 0) { print_response(false, "MISSING_TASK_ID"); exit; }
if (!is_array($employee_ids)) $employee_ids = [];

try {
  $conn->begin_transaction();

  // wipe old rows
  $del = $conn->prepare("DELETE FROM task_participants WHERE task_id = ?");
  if (!$del) throw new Exception("Prepare del failed: ".$conn->error);
  $del->bind_param("i", $task_id);
  if (!$del->execute()) { $del->close(); throw new Exception("Delete failed: ".$conn->error); }
  $del->close();

  // insert new rows
  if (count($employee_ids)) {
    $ins = $conn->prepare(
      "INSERT INTO task_participants (task_id, employee_id, status) 
       VALUES (?, ?, 1)
       ON DUPLICATE KEY UPDATE status = VALUES(status), updated_at = CURRENT_TIMESTAMP"
    );
    if (!$ins) throw new Exception("Prepare ins failed: ".$conn->error);

    foreach ($employee_ids as $eid) {
      $eid = (int)$eid; if ($eid <= 0) continue;
      $ins->bind_param("ii", $task_id, $eid);
      if (!$ins->execute()) { $ins->close(); throw new Exception("Insert failed: ".$conn->error); }
    }
    $ins->close();
  }

  $conn->commit();
  print_response(true, "Participants saved");
} catch (Throwable $e) {
  $conn->rollback();
  print_response(false, "DB_ERROR: ".$e->getMessage());
} finally {
  $conn->close();
}
