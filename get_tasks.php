<?php
require_once("config.php");
require_once("../controls/api_response.php");

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

validate_request_method("POST");
$data = validate_request_body("POST", ["user_id"]);

$user_id = intval($data['user_id']);

// Fetch tasks
$stmt = $conn->prepare("SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC");
$stmt->bind_param("i", $user_id);
$stmt->execute();
$result = $stmt->get_result();

$tasks = [];
$statistics = [
    "total" => 0,
    "completed" => 0,
    "inprogress" => 0,
    "notstarted" => 0
];

while ($row = $result->fetch_assoc()) {
    $tasks[] = $row;

    $statistics['total']++;
    if ($row['status'] === 'completed') $statistics['completed']++;
    elseif ($row['status'] === 'inprogress') $statistics['inprogress']++;
    else $statistics['notstarted']++;
}

$statistics["completed_percentage"] = $statistics['total'] ? ($statistics['completed'] / $statistics['total']) * 100 : 0;
$statistics["inprogress_percentage"] = $statistics['total'] ? ($statistics['inprogress'] / $statistics['total']) * 100 : 0;
$statistics["notstarted_percentage"] = $statistics['total'] ? ($statistics['notstarted'] / $statistics['total']) * 100 : 0;

print_response(true, "Tasks fetched", [
    "tasks" => $tasks,
    "statistics" => $statistics
]);

$stmt->close();
$conn->close();
?>
