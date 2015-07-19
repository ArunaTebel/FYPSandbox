/**
 * Created by ArunaTebel on 7/2/2015.
 */
var formDataQueue = [];
var isServerCheckRunning = false;
var ajaxRequestTemplates = [];
// 'global' variable to store reference to the database
var db = [];

function openIDB(databaseName, databaseVersion, successCallback, errorCallback, upgradeCallback) {
    databaseOpen(successCallback, errorCallback);

    function databaseOpen(successCallback, errorCallback) {
        if (databaseVersion == null) {
            if (typeof(Storage) !== "undefined") {
                databaseVersion = (
                localStorage.getItem(databaseName + ".tm_db_version") == null
                || localStorage.getItem(databaseName + ".tm_db_version") == 0
                || localStorage.getItem(databaseName + ".tm_db_version") == "") ? 1 :
                    localStorage.getItem(databaseName + ".tm_db_version");
            } else {
                console.error("Sorry, localStorage is not supported by your browser!");
            }
        }
        // Open a database, specify the name and version
        var request = indexedDB.open(databaseName, databaseVersion);
        console.log(databaseVersion);
        request.onsuccess = function (e) {
            db[databaseName] = e.target.result;
            localStorage.setItem(databaseName + ".tm_db_version", databaseVersion);
            successCallback(db[databaseName]);
        };

        request.onerror = function (e) {
            errorCallback(request.error);
        };

        // Run migrations if necessary
        request.onupgradeneeded = function (e) {
            console.log("ahahahahahahahahhahahahahahahaha");
            if (typeof upgradeCallback == 'undefined' || upgradeCallback == null || upgradeCallback == "") {
                defaultDbUpgradeCallback(e);
            } else {
                upgradeCallback(e);
            }
        };
    }
}

function defaultDbSuccessCallback() {
    console.log('An IndexedDB successfully created');
}

function defaultDbErrorCallback(e) {
    console.error('An IndexedDB error has occurred', e);
}

function defaultDbUpgradeCallback(e) {
    console.log('An IndexedDB upgrade has occurred', e);
}

function defaultDataStoreErrorCallback(e) {
    console.error('An IndexedDB data store creation error has occurred', e);
}

function createDataStore(indexedDbName, dataStoreScheme) {
    db[indexedDbName].close();
    var request = indexedDB.open(indexedDbName);
    var createDSFunc = function (e) {
        db = e.target.result;
        e.target.transaction.onerror = defaultDataStoreErrorCallback;
        var objStore = db.createObjectStore(dataStoreScheme['ds_name'], {
            keyPath: dataStoreScheme['ds_key_path'],
            autoIncrement: dataStoreScheme['ds_key_path_ai']
        });
        $.each(dataStoreScheme['ds_indexes'], function (key, val) {
            objStore.createIndex(val['name'], val['keyPath'], val['optionalParams']);
        });
        objStore.transaction.oncomplete = function (event) {
            console.info("Successfully created the datastore " + dataStoreScheme['ds_name']);
        }
    };
    request.onsuccess = function (e) {
        var dbCon = e.target.result;
        var newVersion = dbCon.version + 1;
        dbCon.close();
        openIDB(indexedDbName, newVersion, defaultDbSuccessCallback, defaultDbErrorCallback, createDSFunc);
    };
}

function storeFormDataInIDB(indexedDbName, dataStoreName, formData) {
    var objectStore = db[indexedDbName].transaction(dataStoreName, "readwrite").objectStore(dataStoreName);
    var dataArray = {};
    for (var i in formData) {
        dataArray[formData[i]['name']] = formData[i]['value'];
    }
    objectStore.add(dataArray);
}

function storeRequestsInIDB(indexedDbName, dataStoreName, requestData) {
    var objectStore = db[indexedDbName].transaction(dataStoreName, "readwrite").objectStore(dataStoreName);
    objectStore.add(requestData);
    if (!isServerCheckRunning) {
        checkServerStatus();
    }
}

function checkServerStatus() {
    isServerCheckRunning = true;
    $.ajax({
        url: "http://localhost",
        type: "HEAD",
        timeout: 1000,
        statusCode: {
            200: function (response) {
                console.log('Working!');
                //syncRequests();
                syncRequestsInIDB();
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
    var serverChecker = setTimeout("checkServerStatus()", 3000);
}

function readFromIDB(indexedDbName, dataStoreName, searchVal) {
    var transaction = db[indexedDbName].transaction([dataStoreName]);
    var objectStore = transaction.objectStore(dataStoreName);
    var request = objectStore.get(searchVal);
    request.onerror = function (event) {
        console.error(request.error);
    };
    request.onsuccess = function (event) {
        // Do something with the request.result
    };
}

function syncRequestsInIDB() {
    var objectStore = db["offlinkDB"].transaction("request_queue").objectStore("request_queue");

    objectStore.openCursor().onsuccess = function (event) {
        var cursor = event.target.result;
        if (cursor) {
            sendAjaxRequest(cursor.value, cursor.key);
            cursor.continue();
        }
        else {
        }
    };
}

function addToQueue(ajaxRequestTemplate) {
    ajaxRequestTemplates.push(ajaxRequestTemplate);
    if (!isServerCheckRunning) {
        checkServerStatus();
    }
}

function syncRequests() {
    do {
        var request = ajaxRequestTemplates.shift();
        sendAjaxRequest(request);
    } while (ajaxRequestTemplates.length > 0);
}

function deleteRequest(requestId) {
    var request = db["offlinkDB"]
        .transaction(["request_queue"], "readwrite")
        .objectStore("request_queue")
        .delete(requestId);
    request.onsuccess = function (event) {
        console.info("Successfully deleted request for id - " + requestId);
    };
}

function sendAjaxRequest(ajaxRequestTemplate, requestId) {
    if (ajaxRequestTemplate['url'] == "" || ajaxRequestTemplate['url'] == null) {
        throw XMLHttpRequestException("URL cannot be null for an AJAX request");
    }
    if (ajaxRequestTemplate['method'] == "" || ajaxRequestTemplate['method'] == null) {
        ajaxRequestTemplate['method'] = "POST";
    }
    if (typeof ajaxRequestTemplate['contentType'] === "undefined" || ajaxRequestTemplate['contentType'] == null) {
        ajaxRequestTemplate['contentType'] = 'application/x-www-form-urlencoded; charset=UTF-8';
    }
    if (typeof ajaxRequestTemplate['processData'] === 'undefined' || ajaxRequestTemplate['processData'] == null) {
        ajaxRequestTemplate['processData'] = true;
    }
    $.ajax({
        url: ajaxRequestTemplate['url'],
        data: ajaxRequestTemplate['data'],
        processData: ajaxRequestTemplate['processData'],
        contentType: ajaxRequestTemplate['contentType'],
        type: ajaxRequestTemplate['method'],
        success: function (data, success) {
            if (typeof requestId != 'undefined') {
                window[ajaxRequestTemplate['callback']](data, success, requestId)
            } else {
                window[ajaxRequestTemplate['callback']](data, success)
            }
        },
        error: function (XMLHttpRequest, textStatus, errorThrown) {
            console.error(errorThrown);
        }
    });
}
