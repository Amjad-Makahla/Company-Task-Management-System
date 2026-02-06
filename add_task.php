<?php
require_once("config.php");
require_once("../controls/api_response.php");

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

validate_request_method("POST");

$input = json_decode(file_get_contents('php://input'), true);

// Validate required fields
if (!isset($input['user_id'], $input['title'])) {
    print_response(false, "Missing required fields: user_id and title are required");
    exit;
}

$user_id    = intval($input['user_id']);
$title      = trim($input['title']);
$description = isset($input['description']) ? trim($input['description']) : '';
$priority   = isset($input['priority']) ? trim($input['priority']) : 'moderate';
$due_date   = isset($input['due_date']) && !empty($input['due_date']) ? trim($input['due_date']) : null;

// Set status internally (you don't want it from frontend)
$status = 'notstarted';
$is_completed = 0;

// Validate priority
if (!in_array($priority, ['low', 'moderate', 'high'])) {
    $priority = 'moderate';
}

// Check user exists
$check_user = $conn->prepare("SELECT id FROM users WHERE id = ?");
$check_user->bind_param("i", $user_id);
$check_user->execute();
$check_user->store_result();

if ($check_user->num_rows === 0) {
    print_response(false, "User not found");
    exit;
}

// Insert the task
$stmt = $conn->prepare("
    INSERT INTO tasks (user_id, title, description, priority, status, due_date, is_completed)
    VALUES (?, ?, ?, ?, ?, ?, ?)
");

$stmt->bind_param("isssssi", $user_id, $title, $description, $priority, $status, $due_date, $is_completed);

if (!$stmt->execute()) {
    print_response(false, "Database Error: " . $stmt->error);
    exit;
}

print_response(true, "Task added successfully", [
    "task_id" => $stmt->insert_id,
    "title" => $title,
    "priority" => $priority
]);

$stmt->close();
$check_user->close();
$conn->close();
?>
