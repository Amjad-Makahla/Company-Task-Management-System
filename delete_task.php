<?php
require_once("config.php");
require_once("../controls/api_response.php");

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

validate_request_method("POST");
$data = validate_request_body("POST", ["user_id", "task_id"]);

$user_id = intval($data['user_id']);
$task_id = intval($data['task_id']);

// Check if task exists and belongs to user
$check = $conn->prepare("SELECT id, title FROM tasks WHERE id = ? AND user_id = ?");
$check->bind_param("ii", $task_id, $user_id);
$check->execute();
$result = $check->get_result();

if ($result->num_rows === 0) {
    print_response(false, "Task not found for user");
    exit;
}

$task = $result->fetch_assoc();
$check->close();

// Delete the task
$stmt = $conn->prepare("DELETE FROM tasks WHERE id = ? AND user_id = ?");
$stmt->bind_param("ii", $task_id, $user_id);
$stmt->execute();

if ($stmt->affected_rows > 0) {
    print_response(true, "Task deleted successfully", [
        "task_id" => $task_id,
        "title" => $task['title']
    ]);
} else {
    print_response(false, "Failed to delete task");
}

$stmt->close();
$conn->close();
?>
