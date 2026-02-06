<?php

function validate_request_method($method): void {
    if ($_SERVER['REQUEST_METHOD'] != $method) {
        print_response(false, $_SERVER['REQUEST_METHOD'] . " Invalid request method. Expected $method.");
        exit;
    }
}

function validate_request_body($method, $required_fields) {
    switch($method){
        case "POST":
            $input_data = json_decode(file_get_contents('php://input'), true);
            error_log(print_r($input_data, true));
            break;
        case "GET":
            $input_data = $_GET;
            break;
        default:
            print_response(false, "Invalid request method. Expected $method.");
    }

    if ($method === "GET" && empty($input_data) && !empty($required_fields)) {
        print_response(false, "No query parameters provided.");
    }

    if ($method === "POST") {
        foreach ($required_fields as $field) {
            if (!isset($input_data[$field])) {
                print_response(false, "Missing required field: $field.");
                exit; // Add exit to prevent further execution
            }            
        }
    }

    return $input_data;
}
function validate_required_query_param(string $param_name): int {
    if (!isset($_GET[$param_name]) || trim($_GET[$param_name]) === '') {
        print_response(false, "Missing required query parameter: $param_name");
    }

    return intval($_GET[$param_name]);
}

function print_response(bool $success, string $message, ?array $data = null): void {
    header('Content-Type: application/json');
    echo json_encode([
        'success' => $success,
        'message' => $message,
        'data'    => $data
    ]);
    exit();
}
