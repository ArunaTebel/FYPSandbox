/**
 * Created by ArunaTebel on 6/13/2015.
 */
var formDataQueue = [];
var isServerCheckRunning = false;
function checkServerStatus() {
    isServerCheckRunning = true;
    $.ajax({
        url: "http://localhost",
        type: "HEAD",
        timeout: 1000,
        statusCode: {
            200: function (response) {
                console.log('Working!');
                $.each(formDataQueue, function (i, formData) {
                    $.post("index.php", formData,
                        function (data, status) {
                            formDataQueue.splice( $.inArray(formData, formDataQueue), 1 );
                        });
                });
                isServerCheckRunning = false;
                clearTimeout(serverChecker);
            },
            400: function (response) {
                console.log('Not working!');
            },
            0: function (response) {
                console.log('Not working!');
            }
        }
    });
    var serverChecker = setTimeout("checkServerStatus()", 10000);
}

$(document).ready(function () {
    $('.phoenix-input').phoenix();
    $('#person-form').submit(function (e) {
        $('.phoenix-input').phoenix('remove')
    });


    $('#person-form').on('submit', function (e) { //use on if jQuery 1.7+
        e.preventDefault();  //prevent form from submitting
        formDataQueue.push($("#person-form :input").serializeArray());
        console.log(formDataQueue); //use the console for debugging, F12 in Chrome, not alerts
        if (!isServerCheckRunning) {
            checkServerStatus();
        }
    });


});
