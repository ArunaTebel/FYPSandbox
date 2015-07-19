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
?>

<html>
<head>
    <title>FYP Sandbox</title>
    <script type="text/javascript" src="public/js/jquery-2.1.4.js"></script>
    <script type="text/javascript" src="public/js/form-cache.js"></script>
    <script type="text/javascript" src="public/js/offlink.js"></script>
    <script type="text/javascript" src="public/js/app.js"></script>
</head>
<body>
<form id="person-form" action="<?php echo htmlspecialchars($_SERVER["PHP_SELF"]); ?>" method="post" name="person_form">
    First name:<br>
    <input type="text" class="phoenix-input" name="firstname"
           value="<?php echo $stringHelper->generateRandomString(); ?>">
    <br>
    Last name:<br>
    <input type="text" class="phoenix-input" name="lastname"
           value="<?php echo $stringHelper->generateRandomString(); ?>">
    <br><br>
    <input type="submit" value="Submit">

    <input type="button" id="view-person-list-btn" value="View Persons">
    <ul id="person-list">

    </ul>
</form>
</body>
</html>