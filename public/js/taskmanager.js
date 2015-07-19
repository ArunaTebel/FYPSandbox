var taskDataStoreScheme = {
    ds_name: "task",
    ds_key_path: "task_id",
    ds_key_path_ai: true,
    ds_indexes: {
        1: {
            name: "by_title",
            keyPath: "title",
            optionalParams: {
                unique: true,
                multiEntry: false
            }
        },

        2: {
            name: "by_desc",
            keyPath: "desc"
        },

        3: {
            name: "by_due_date",
            keyPath: "due_date"
        },

        4: {
            name: "by_due_time",
            keyPath: "due_time"
        },

        5: {
            name: "by_priority",
            keyPath: "priority"
        },

        6: {
            name: "by_notify",
            keyPath: "notify"
        }
    }
}

var eventQueueDataStoreScheme = {
    ds_name: "request_queue",
    ds_key_path: "request_id",
    ds_key_path_ai: true,
    ds_indexes: {
        1: {
            name: "by_request_data",
            keyPath: "request_data"
        }
    }
};

function createTaskDataStore() {
    createDataStore("taskManagerDB", taskDataStoreScheme);
}

function createRequestDataStore() {
    createDataStore("offlinkDB", eventQueueDataStoreScheme);
}

function taskFormCallback(data, success, requestId) {
    console.log("Successfully synced data for request id - " + requestId);
    deleteRequest(requestId);
}

$(document).ready(function () {
    // Open the 'taskManagerDB' database
    openIDB("taskManagerDB", null, dbOpenSuccessCallback, dbOpenErrorCallback);
    openIDB("offlinkDB", null, dbOpenSuccessCallback, dbOpenErrorCallback);

    function dbOpenSuccessCallback(taskManagerDb) {
        // TODO
        //console.log("Database Successfully Created. Version - " + taskManagerDb.version);
    }

    function dbOpenErrorCallback(e) {
        // TODO
        console.error(e);
    }


    $('#task-form').on('submit', function (e) {
        e.preventDefault();
        var formData = $("#task-form").serializeArray();
        //var customData = {
        //    METHOD_NAME: "ADD_TASK"
        //}
        //formData.push(customData);
        var dataArray = {};
        $.each(formData, function (key, value) {
            dataArray[value.name] = value.value;
        });
        dataArray["METHOD_NAME"] = "ADD_TASK";
        var fd = new FormData(this);
        fd.append("METHOD_NAME", "ADD_PERSON");
        var request_data = {
            method: "POST",
            url: "application.php",
            data: dataArray,
            callback: "taskFormCallback"
        };
        storeRequestsInIDB("offlinkDB", "request_queue", request_data);
        // Implement a mapping mechanism to handle this.
        storeFormDataInIDB("taskManagerDB", "task", formData);
        // TODO
    });
});