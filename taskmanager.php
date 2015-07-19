<?php
/**
 * Created by PhpStorm.
 * User: ArunaTebel
 * Date: 7/3/2015
 * Time: 10:53 PM
 */
require "helpers/StringHelper.php";
require "helpers/DbHelper.php";
$stringHelper = new StringHelper();
?>
<!DOCTYPE html>
<html>
<head lang="en">
    <meta charset="UTF-8">
    <title>SancSoft Task Manager</title>
    <link rel='stylesheet' href='public/css/bootstrap.min.css' type='text/css' media='all'/>
    <link rel='stylesheet' href='public/css/bootstrap-theme.min.css' type='text/css' media='all'/>
    <link rel='stylesheet' href='public/css/task-manager.css' type='text/css' media='all'/>
    <script type="text/javascript" src="public/js/jquery-2.1.4.js"></script>
    <script src="public/js/indexeddb.shim.js"></script>
    <script type="text/javascript" src="public/js/offlink.js"></script>
    <script src="public/js/taskmanager.js"></script>
</head>
<body>
<nav class="navbar navbar-inverse">
    <div class="container-fluid">
        <div class="navbar-header">
            <h3>SancSoft Task Manager</h3>
        </div>
    </div>
</nav>

<div class="panel panel-primary sanctm-panel">
    <div class="panel-heading">Add a Task</div>
    <div class="panel-body">
        <form id="task-form" method="POST">
            <div class="form-group">
                <label for="input-title">Title</label>
                <input name="title" type="text" class="form-control" id="input-title" placeholder="Title"
                       value="<?php echo $stringHelper->generateRandomString() ?>">
            </div>
            <div class="form-group">
                <label for="input-description">Description</label>
                <textarea name="desc" class="form-control" id="input-description" placeholder="Description"><?php echo $stringHelper->generateRandomString() ?></textarea>
            </div>
            <div class="form-group">
                <label for="input-duedate">Due Date</label>
                <input name="due_date" type="date" id="input-duedate" value="<?php echo date('Y-m-d'); ?>">
            </div>
            <div class="form-group">
                <label for="input-duetime">Due Time</label>
                <input name="due_time" type="time" id="input-duetime">
            </div>
            <div class="form-group">
                <label for="input-priority">Priority</label>
                <select name="priority" type="" id="input-priority">
                    <option value="1" selected>High</option>
                    <option value="2">Normal</option>
                    <option value="3">Low</option>
                </select>
            </div>
            <div class="form-group">
                <input name="notify" type="checkbox" id="input-notify" checked>
                <label for="input-notify">Notify Me</label>
            </div>
            <button type="submit" class="btn btn-primary">Add Task</button>
        </form>
    </div>
</div>
<button type="button" onclick="createTaskDataStore()">Create Task DS</button>
<button type="button" onclick="createRequestDataStore()">Create Request DS</button>
</body>
</html>