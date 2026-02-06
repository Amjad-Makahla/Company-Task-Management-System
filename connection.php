    <?php
    // Database connection details
    $servername = "localhost"; // Change if your database server is not localhost
    $username = "root";        // Replace with your database username
    $password = "";            // Replace with your database password
    $dbname = "taskati_db";      // Replace with your database name

    // Create the database connection
    $conn = new mysqli($servername, $username, $password, $dbname);

    // Check the connection
    if ($conn->connect_error) {
        die("Connection failed: " . $conn->connect_error);
    }

    // Uncomment this line for debugging purposes to confirm connection
    // echo "Database connected successfully!";
    ?>
