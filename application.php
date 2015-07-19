<?php
/**
 * Created by PhpStorm.
 * User: ArunaTebel
 * Date: 7/2/2015
 * Time: 1:40 PM
 */
require "helpers/DbHelper.php";

$dbHelper = new DbHelper();
$method_name = "";
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $method_name = $_POST['METHOD_NAME'];
} else {
    $method_name = $_GET['METHOD_NAME'];
}

switch ($method_name) {
    case "GET_PERSON_LIST":
        echo json_encode(getPersonList());
        break;
    case "ADD_PERSON":
        addPerson();
        break;
    case "ADD_TASK":
        addTask();
        break;
}

function getPersonList()
{
    global $dbHelper;
    return $dbHelper->select("SELECT * FROM person");
}

function addPerson()
{
    global $dbHelper;
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

function addTask()
{
    global $dbHelper;
    $title_err = $desc_err = $due_date_err = "";
    if (empty($_POST["title"])) {
        $title_err = "Title is required";
    } else {
        $title = $_POST["title"];
    }
    if (empty($_POST["desc"])) {
        $desc_err = "Description is required";
    } else {
        $desc = $_POST["desc"];
    }
    if ($title_err != "") {
        echo $title_err;
    } elseif ($desc_err != "") {
        echo $desc_err;
    } else {
        $due_date = $_POST['due_date'];
        $due_time = $_POST['due_time'];
        $priority = $_POST['priority'];
        $notify = isset($_POST['notify']) ? 1 : 0;
        $connection = $dbHelper->connect();
        $stmt = $connection->prepare("INSERT INTO task(title, description, due_date, due_time, priority, notify ) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("ssssii", $title, $desc, $due_date, $due_time, $priority, $notify);
        $success = $stmt->execute();
        $connection->close();
    }
}