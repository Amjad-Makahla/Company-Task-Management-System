<?php
require_once('config.php');
require_once('../controls/api_response.php');
validate_request_method('POST');
$data = validate_request_body('POST', ['first_name','last_name','email','role_ids']);

$first = trim($data['first_name']);
$last = trim($data['last_name']);
$email = trim($data['email']);
$role_ids = array_map('intval', $data['role_ids'] ?? []);

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
  print_response(false, 'Invalid email');
}

// unique email
$chk = $conn->prepare('SELECT id FROM users WHERE email=? LIMIT 1');
$chk->bind_param('s', $email);
$chk->execute();
$chk->store_result();
if ($chk->num_rows > 0) {
  print_response(false, 'Email already exists');
}
$chk->close();

// Some schemas make password_hash NOT NULL — generate a random one just in case
$tmp_pass = bin2hex(random_bytes(6));
$hash = password_hash($tmp_pass, PASSWORD_BCRYPT);

$conn->begin_transaction();
$stmt = $conn->prepare('INSERT INTO users(first_name,last_name,email,password_hash,status,created_at,updated_at) VALUES (?,?,?,?,1,NOW(),NOW())');
$stmt->bind_param('ssss', $first, $last, $email, $hash);
$stmt->execute();
$user_id = $stmt->insert_id;
$stmt->close();

if (!empty($role_ids)) {
  $ins = $conn->prepare('INSERT INTO user_roles(user_id, role_id, status, created_at, updated_at) VALUES (?,?,1,NOW(),NOW())');
  foreach ($role_ids as $rid) { $ins->bind_param('ii', $user_id, $rid); $ins->execute(); }
  $ins->close();
}
$conn->commit();

print_response(true, 'User created', ['user_id' => (int)$user_id]);