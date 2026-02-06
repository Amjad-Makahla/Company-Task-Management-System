<?php

function saveBase64Image($base64_string, $folder_path) {
    // Remove the data URI prefix (if it exists)
    $base64_string = preg_replace('/^data:image\/(png|jpeg);base64,/', '', $base64_string);

    // Decode base64 string to binary data
    $decoded_image = base64_decode($base64_string);
    if ($decoded_image === false) {
        return ["success" => false, "message" => "Invalid Base64 image string."];
    }

    // Verify image type using MIME detection
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime_type = finfo_buffer($finfo, $decoded_image);
    error_log("MIME Type: " . $mime_type);
    
    finfo_close($finfo);

    // Check if image format is allowed (JPEG or PNG)
    if (!in_array($mime_type, ['image/jpeg', 'image/png'])) {
        return ["success" => false, "message" => "Invalid image format. Only JPEG and PNG are allowed."];
    }

    // Set file extension based on MIME type
    $extension = $mime_type === 'image/jpeg' ? '.jpg' : '.png';
    $image_name = uniqid('image_') . $extension;

    // Create directory if it doesn't exist
    if (!is_dir($folder_path)) {
        mkdir($folder_path, 0755, true);
    }

    $image_path = $folder_path . '/' . $image_name;
    
    // Save the image to the specified path
    if (file_put_contents($image_path, $decoded_image) === false) {
        return ["success" => false, "message" => "Failed to save the uploaded image."];
    }

    // Return only the image name for database storage
    return ["success" => true, "image_path" => $image_name];
}

