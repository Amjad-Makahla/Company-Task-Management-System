<?php
// get_roles.php
require_once("config.php");
require_once("../controls/api_response.php");

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

validate_request_method("POST"); // keep same as get_tasks.php

// No body required for this endpoint

try {
    // Pull roles (all), ordered by name
    $sql = "SELECT id, name, description, status, created_at, updated_at
            FROM roles
            ORDER BY name ASC";
    $result = $conn->query($sql);

    $roles = [];
    $statistics = [
        "total"     => 0,
        "active"    => 0,
        "inactive"  => 0
    ];

    if ($result) {
        while ($row = $result->fetch_assoc()) {
            // Make sure types are consistent
            $row['id']        = (int)$row['id'];
            $row['status']    = (int)$row['status'];
            // Keep name/description/created_at/updated_at as-is
            $roles[] = $row;

            // stats
            $statistics['total']++;
            if ((int)$row['status'] === 1) $statistics['active']++;
            else                           $statistics['inactive']++;
        }
        $result->free();
    }

    print_response(true, "Roles fetched", [
        "roles"       => $roles,
        "statistics"  => $statistics
    ]);

} catch (Throwable $e) {
    print_response(false, "DB_ERROR: " . $e->getMessage());
} finally {
    $conn->close();
}
