<?php
require_once('config.php');

$request_method = "POST";
$required_fields = ["email", "password"];
validate_request_method($request_method);
$data = validate_request_body($request_method, $required_fields);

function login($data) {
    global $conn;

    $email = mysqli_real_escape_string($conn, trim($data['email']));
    $password = trim($data['password']);

    // Fetch user
    $sql = "SELECT id, name, email, password_hash, status FROM users WHERE email = ? LIMIT 1";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $res = $stmt->get_result();

    if ($res->num_rows === 0) {
        print_response(false, "البريد الإلكتروني غير مسجل.");
    }

    $user = $res->fetch_assoc();

    if ((int)$user['status'] !== 1) {
        print_response(false, "هذا الحساب غير مفعل.");
    }

    if (!password_verify($password, $user['password_hash'])) {
        print_response(false, "كلمة المرور غير صحيحة.");
    }

    // Remove password_hash before sending response
    unset($user['password_hash']);

    print_response(true, "تم تسجيل الدخول بنجاح", ["user" => $user]);
}

login($data);
