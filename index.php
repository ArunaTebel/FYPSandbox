<?php
/**
 * Created by PhpStorm.
 * User: ArunaTebel
 * Date: 6/13/2015
 * Time: 3:47 PM
 */
require "helpers/StringHelper.php";
require "helpers/DbHelper.php";

$stringHelper = new StringHelper();
$dbHelper = new DbHelper();
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $nameErr = "";
    if (empty($_POST["firstname"])) {
        $nameErr = "First Name is required";
    } else {
        $first_name = $_POST["firstname"];
    }
    if (empty($_POST["lastname"])) {
        $nameErr = "Last Name is required";
    } else {
        $last_name = $_POST["lastname"];
    }
    if ($nameErr == "") {
        $connection = $dbHelper->connect();
        $stmt = $connection->prepare("INSERT INTO person(first_name, last_name) VALUES (?, ?)");
        $stmt->bind_param("ss", $first_name, $last_name);
        $stmt->execute();
        $connection->close();
    } else {
        echo $nameErr;
    }
}
?>

<html>
<head>
    <title>FYP Sandbox</title>
    <script type="text/javascript" src="public/js/jquery-2.1.4.js"></script>
    <script type="text/javascript" src="public/js/form-cache.js"></script>
    <script type="text/javascript" src="public/js/app.js"></script>
</head>
<body>
<form id="person-form" action="<?php echo htmlspecialchars($_SERVER["PHP_SELF"]); ?>" method="post">
    First name:<br>
    <input type="text" class="phoenix-input" name="firstname" value="<?php echo $stringHelper->generateRandomString(); ?>">
    <br>
    Last name:<br>
    <input type="text" class="phoenix-input" name="lastname" value="<?php echo $stringHelper->generateRandomString(); ?>">
    <br><br>
    <input type="submit" value="Submit">
</form>
</body>
</html>