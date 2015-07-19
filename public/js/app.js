/**
 * Created by ArunaTebel on 6/13/2015.
 */

var append_to_person_list = function (data, success) {
    $("#person-list").append(data);
};

function personFormCallback(data, success) {
    console.log("Successfully synced data - " + data);
}

$(document).ready(function () {
    $("#view-person-list-btn").click(function () {
        var ajaxRequestTemplate = {
            method: "GET",
            url: "application.php",
            data: {
                "METHOD_NAME": "GET_PERSON_LIST"
            },
            callback: function (data, success) {
                append_to_person_list(data, success);
            }
        };
        addToQueue(ajaxRequestTemplate);
    });

    $('#person-form').on('submit', function (e) {
        e.preventDefault();
        var formData = $("#person-form").serializeArray();
        var customData = {
            METHOD_NAME: "ADD_TASK"
        }
        formData.push(customData);
        var fd = new FormData(this);
        fd.append("METHOD_NAME", "ADD_PERSON");
        var ajaxRequestTemplate = {
            method: "POST",
            url: "application.php",
            processData: false,
            contentType: false,
            data: fd,
            callback: "personFormCallback"
        };
        addToQueue(ajaxRequestTemplate);
    });



});
