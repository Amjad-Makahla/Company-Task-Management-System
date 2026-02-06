<?php
require_once('config.php');

$request_method = "POST";
$required_fields = ["name", "email", "password"];
validate_request_method($request_method);
$data = validate_request_body($request_method, $required_fields);

function register($data) {
    global $conn;

    $name = mysqli_real_escape_string($conn, trim($data['name']));
    $email = mysqli_real_escape_string($conn, trim($data['email']));
    $password = trim($data['password']);

    if (strlen($password) < 6) {
        print_response(false, "كلمة المرور يجب أن تكون 6 أحرف أو أكثر.");
    }


    $check_stmt = $conn->prepare("SELECT id FROM users WHERE email = ? LIMIT 1");
    $check_stmt->bind_param("s", $email);
    $check_stmt->execute();
    $result = $check_stmt->get_result();

    if ($result->num_rows > 0) {
        print_response(false, "البريد الإلكتروني مستخدم بالفعل.");
    }


    $password_hash = password_hash($password, PASSWORD_DEFAULT);

    $insert_stmt = $conn->prepare("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)");
    $insert_stmt->bind_param("sss", $name, $email, $password_hash);

    if ($insert_stmt->execute()) {
        print_response(true, "تم إنشاء الحساب بنجاح.", [
            "name" => $name,
            "email" => $email
        ]);
    } else {
        print_response(false, "فشل في إنشاء الحساب.");
    }
}

register($data);
