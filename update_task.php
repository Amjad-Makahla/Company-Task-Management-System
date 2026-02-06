<?php
// api/update_task.php
require_once("config.php");
require_once("../controls/api_response.php");

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

validate_request_method("POST");

// Accept JSON or form-data
$body = json_decode(file_get_contents("php://input"), true);
if (!$body) { $body = $_POST; }

// ---- read fields coming from your edit_task.js ----
$user_id    = isset($body['user_id'])    ? (int)$body['user_id'] : 0;
$task_id    = isset($body['task_id'])    ? (int)$body['task_id'] : 0;   // IMPORTANT: your JS sends task_id
$title      = trim($body['title']        ?? '');
$description= trim($body['description']  ?? '');
$priority   = trim($body['priority']     ?? 'moderate'); // low|moderate|high
$status     = trim($body['status']       ?? 'notstarted'); // notstarted|inprogress|completed
$due_date   = $body['due_date'] ?? null; // 'YYYY-MM-DD' or null
$employee_ids = $body['employee_ids'] ?? null; // array of ints or null

if ($task_id <= 0) { print_response(false, "MISSING_TASK_ID"); exit; }
if ($title === '') { print_response(false, "TITLE_REQUIRED"); exit; }

// optional: validate enums quickly
$allowedP = ['low','moderate','high'];
$allowedS = ['notstarted','inprogress','completed'];
if (!in_array($priority, $allowedP, true))  $priority = 'moderate';
if (!in_array($status, $allowedS, true))    $status = 'notstarted';

try {
  $conn->begin_transaction();

  // ---- update task row ----
  $sql = "UPDATE tasks
          SET title=?, description=?, priority=?, status=?, due_date=?
          WHERE id=?";
  $stmt = $conn->prepare($sql);
  if (!$stmt) throw new Exception("Prepare failed: ".$conn->error);

  // allow NULL due_date
  if ($due_date === '' || strtolower((string)$due_date) === 'null') $due_date = null;
  $stmt->bind_param("sssssi", $title, $description, $priority, $status, $due_date, $task_id);

  if (!$stmt->execute()) { $stmt->close(); throw new Exception("Update failed: ".$conn->error); }
  $stmt->close();

  // ---- replace participants only if the client sent employee_ids ----
  if (is_array($employee_ids)) {
    // 1) delete old
    $del = $conn->prepare("DELETE FROM task_participants WHERE task_id = ?");
    if (!$del) throw new Exception("Prepare del failed: ".$conn->error);
    $del->bind_param("i", $task_id);
    if (!$del->execute()) { $del->close(); throw new Exception("Delete participants failed: ".$conn->error); }
    $del->close();

    // 2) insert new (adjust INSERT if your table has no `status` column)
    $hasStatusColumn = false; // <-- set to true if your table has a `status` column
    if (!empty($employee_ids)) {
      if ($hasStatusColumn) {
        $ins = $conn->prepare("INSERT IGNORE INTO task_participants (task_id, employee_id, status) VALUES (?, ?, 1)");
      } else {
        $ins = $conn->prepare("INSERT IGNORE INTO task_participants (task_id, employee_id) VALUES (?, ?)");
      }
      if (!$ins) throw new Exception("Prepare ins failed: ".$conn->error);

      foreach ($employee_ids as $eid) {
        $eid = (int)$eid; if ($eid <= 0) continue;
        // bind depends on query, but both are "ii" for two ints
        $ins->bind_param("ii", $task_id, $eid);
        if (!$ins->execute()) { $ins->close(); throw new Exception("Insert participant failed: ".$conn->error); }
      }
      $ins->close();
    }
  }

  $conn->commit();
  print_response(true, "Task updated", null);

} catch (Throwable $e) {
  $conn->rollback();
  print_response(false, "DB_ERROR: ".$e->getMessage());
} finally {
  $conn->close();
}
