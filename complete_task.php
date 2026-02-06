<?php
require_once("config.php");
require_once("../controls/api_response.php");

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

validate_request_method("POST");
$data = validate_request_body("POST", ["user_id", "task_id", "is_completed"]);

$user_id = intval($data['user_id']);
$task_id = intval($data['task_id']);
$is_completed = intval($data['is_completed']);

// Check if task exists and belongs to user
$check = $conn->prepare("SELECT id FROM tasks WHERE id = ? AND user_id = ?");
$check->bind_param("ii", $task_id, $user_id);
$check->execute();
$check->store_result();

if ($check->num_rows === 0) {
    print_response(false, "Task not found for user");
    exit;
}
$check->close();

// Update task completion status
$status = $is_completed ? 'completed' : 'notstarted';

$stmt = $conn->prepare("UPDATE tasks SET is_completed = ?, status = ?, updated_at = NOW() WHERE id = ? AND user_id = ?");
$stmt->bind_param("isii", $is_completed, $status, $task_id, $user_id);
$stmt->execute();

if ($stmt->affected_rows > 0) {
    $message = $is_completed ? "Task marked as completed" : "Task marked as incomplete";
    print_response(true, $message, [
        "task_id" => $task_id,
        "is_completed" => $is_completed,
        "status" => $status
    ]);
} else {
    print_response(false, "Failed to update task completion status");
}

$stmt->close();
$conn->close();
?>
