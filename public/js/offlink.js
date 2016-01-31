/**
 * Created by ArunaTebel on 8/31/2015.
 */
if ('undefined' === typeof window) {
    importScripts('manifest.js');
}
var OfflinkJs = angular.module('OfflinkJs', ['LocalStorageModule', 'indexedDB']);

OfflinkJs.controller('NavCtrl', function ($scope, $location) {
    $scope.isActive = function (route) {
        return route === $location.path();
    };
});

//var OfflinkJs = angular.module('OfflinkJs', []);
var previous = {};
OfflinkJs.factory("ConnectionDetectorService", ['flnkSynchronizer', function (flnkSynchronizer) {

    var conDetector = URL.createObjectURL(new Blob(['(',
        function () {
            var conDetectURL = "";
            addEventListener('message', function (e) {
                switch (e.data.msg) {
                    case 'REGISTER':
                        conDetectURL = e.data.url;
                        setInterval(detectConnectivity, 3000);
                        break;
                    case 'POLL':
                        return getConnectionStatus();
                        break;
                }
            }, false);

            function detectConnectivity() {
                var http = new XMLHttpRequest();
                http.open('HEAD', conDetectURL);
                http.onreadystatechange = function () {
                    if (this.readyState == this.DONE) {
                        connectionStatus = this.status;
                        self.postMessage(this.status);
                    }
                };
                if (conDetectURL != "") {
                    http.send();
                }
            }
        }.toString(),

        ')()'], {type: 'application/javascript'})
    );

    var callbackFunc = null;
    var connectionStatus = "";

    var worker = new Worker(conDetector);
    URL.revokeObjectURL(conDetector);
    worker.addEventListener('message', function (e) {
        callbackFunc(e.data);
        if (e.data === 200 && connectionStatus !== 200) {
            console.info("Connection status changed from " + connectionStatus + " to " + e.data);
            console.info("Auto Syncing started .... ");
            flnkSynchronizer.syncAuto();
        }
        connectionStatus = e.data;
    }, false);

    return {
        register: function (url, callback) {
            callbackFunc = callback;
            var msg = {
                msg: "REGISTER",
                url: url
            };
            worker.postMessage(msg);
        },
        getConnectionStatus: function () {
            return connectionStatus;
        }
    };

}]);


OfflinkJs.factory('cacheInterceptor', ['localStorageService', '$q', '$location', function (localStorageService, $q, $location) {

    var GET_CACHE = "GC";
    var WRITE_CACHE = "WC";
    return {
        request: function (config) {
            if (config.flnk_cache) {
                if (config.method === 'POST') {
                    //localStorageService.set(config.req_prefix + "." + Date.now(), config);
                }
            }
            return config;
        },
        response: function (response) {

            if (response.config.flnk_cache && response.config.method === 'GET') {
                localStorageService.set(GET_CACHE + "<>" + response.config.url, response.data);
            }
            return response;
        },
        responseError: function (rejection) {
            if (rejection.status === 401) {
                if (rejection.config.offlink_callback) {
                    rejection.config.offlink_callback(rejection);
                } else if (rejection.config.offlink_url_401) {
                    $location.url(rejection.config.offlink_url_401);
                }
            }
            if (rejection.status === 403) {
                if (rejection.config.offlink_callback) {
                    rejection.config.offlink_callback(rejection);
                } else if (rejection.config.url_403) {
                    $location.url(rejection.config.url_403);
                }
            }
            if (rejection.status === -1) {
                if (rejection.config.offlink_callback) {
                    rejection.config.offlink_callback(rejection);
                } else if (rejection.config.fallback_url) {
                    $location.url(rejection.config.fallback_url);
                }
            }
            if (rejection.status === 0) {
                console.log(rejection);

                rejection.offline_action = true;

                if (rejection.config.flnk_cache) {

                    if (rejection.config.method === 'GET') {
                        rejection.data = localStorageService.get("GC<>" + rejection.config.url);
                    } else if (rejection.config.offlink_callback) {
                        rejection.config.offlink_callback(rejection);
                    } else if (rejection.config.fallback_url) {
                        $location.url(rejection.config.fallback_url);
                    } else if (
                        rejection.config.method === 'POST' ||
                        rejection.config.method === 'PUT' ||
                        rejection.config.method === 'DELETE'
                    ) {
                        var prefix = WRITE_CACHE + "<>" + rejection.config.flnk_prefix + "<>" + Date.now();
                        if (rejection.config.flnk_auto_sync) {
                            prefix += "<>auto"
                        }
                        localStorageService.add(prefix, rejection.config);
                    }

                }

            }
            return rejection;
        }
    };
}]);

OfflinkJs.factory('flnkSynchronizer', ['$http', 'localStorageService', function ($http, localStorageService) {
    return {
        syncByPrefix: function (prefix) {
            var syncSuccess = [];
            var syncFailed = [];
            var lsKeys = localStorageService.keys();
            angular.forEach(lsKeys, function (value, key) {
                if (prefix === value.split("<>")[1]) {
                    var config = localStorageService.get(value);
                    $http(
                        {
                            method: config.method,
                            url: config.url,
                            data: config.data,
                            headers: config.headers,
                            flnk_cache: config.flnk_cache,
                            flnk_auto_sync: config.flnk_auto_sync,
                            flnk_prefix: config.flnk_prefix,
                            flnk_sync_callback: config.flnk_sync_callback
                        }
                    ).then(function (response) {
                        if (config.flnk_sync_callback) {
                            config.flnk_sync_callback(response);
                        }
                        localStorageService.remove(value); // TODO: HANDLE THIS!
                        syncSuccess.push(config);
                    }, function (response) {
                        syncFailed.push(config);
                    });
                }
            });
            return {
                sync_success: syncSuccess,
                sync_failed: syncFailed
            };
        },

        syncAuto: function () {
            var syncSuccess = [];
            var syncFailed = [];
            var lsKeys = localStorageService.keys();
            angular.forEach(lsKeys, function (value, key) {
                if (value.split("<>").length === 4) {
                    if (value.split("<>")[3] === 'auto') {
                        var config = localStorageService.get(value);
                        $http(
                            {
                                method: config.method,
                                url: config.url,
                                data: config.data,
                                headers: config.headers,
                                flnk_cache: config.flnk_cache,
                                flnk_auto_sync: config.flnk_auto_sync,
                                flnk_prefix: config.flnk_prefix,
                                flnk_sync_callback: config.flnk_sync_callback
                            }
                        ).then(function (response) {
                            if (config.flnk_sync_callback) {
                                config.flnk_sync_callback(response);
                            }
                            localStorageService.remove(value); // TODO: HANDLE THIS!
                            syncSuccess.push(config);
                        }, function (response) {
                            syncFailed.push(config);
                        });
                    }
                }
            });
            return {
                sync_success: syncSuccess,
                sync_failed: syncFailed
            };
        },

        bulkSync: function () {
            var syncSuccess = [];
            var syncFailed = [];
            var lsKeys = localStorageService.keys();
            angular.forEach(lsKeys, function (value, key) {
                var config = localStorageService.get(value);
                $http(
                    {
                        method: config.method,
                        url: config.url,
                        data: config.data,
                        headers: config.headers,
                        flnk_cache: config.flnk_cache,
                        flnk_auto_sync: config.flnk_auto_sync,
                        flnk_prefix: config.flnk_prefix,
                        flnk_sync_callback: config.flnk_sync_callback
                    }
                ).then(function (response) {
                    if (config.flnk_sync_callback) {
                        config.flnk_sync_callback(response);
                    }
                    localStorageService.remove(value); // TODO: HANDLE THIS!
                    syncSuccess.push(config);
                }, function (response) {
                    syncFailed.push(config);
                });
            });
            return {
                sync_success: syncSuccess,
                sync_failed: syncFailed
            };
        }
    };
}]);


OfflinkJs.factory('flnkDatabaseService', [function () {
    var _db = null;
    var promise = null;
    var schemaBuilder = null;

    var EXCEPTION_MESSAGES = {
        CREATE_DB_BEFORE_TABLES: "Please create a database, before creating tables.",
        DB_NAME_EMPTY: "Database name cannot be empty",
        DB_VERSION_NAN: "Database version should be a numeric value",
        TABLE_SCHEMA_NOT_AN_OBJECT: "Table schema should be an object type",
        TABLE_SCHEMA_EMPTY: "Table schema cannot be empty",
        TABLE_NAME_PROP_NOT_FOUND: "Table schema should have a 'name' property",
        TABLE_COLS_PROP_NOT_FOUND: "Table schema should have a 'columns' property",
        INSERT_DATA_NOT_AN_OBJECT: "Data to insert should be an object type",
        INSERT_DATA_ARRAY_EMPTY: "Data array to be inserted cannot be empty",
        INSERT_DATA_EMPTY: "Data rows to be inserted cannot be empty",
        TABLE_NAME_EMPTY: "Table name cannot be empty"
    };

    function assert(condition, message) {
        if (!condition) {
            throw new OfflinkDbException({
                message: message,
                name: 'OfflinkDbException'
            });
        } else {
            return true;
        }
    }

    function validateTableSchema(tables) {
        try {
            assert(typeof tables === 'object', EXCEPTION_MESSAGES.TABLE_SCHEMA_NOT_AN_OBJECT);
            assert(tables.length > 0, EXCEPTION_MESSAGES.TABLE_SCHEMA_EMPTY);
            if (tables.length > 0) {
                for (var i = 0; i < tables.length; i++) {
                    for (var prop in tables[i]) {
                        assert(tables[i].hasOwnProperty('table_name'), EXCEPTION_MESSAGES.TABLE_NAME_PROP_NOT_FOUND);
                        assert(tables[i].hasOwnProperty('columns'), EXCEPTION_MESSAGES.TABLE_COLS_PROP_NOT_FOUND);
                    }
                }
            }
        }
        catch (e) {
            throw e;
        }
    }

    function validateInsertBulkData(data) {
        try {
            assert(typeof data === 'object', EXCEPTION_MESSAGES.INSERT_DATA_NOT_AN_OBJECT);
            assert(data.length > 0, EXCEPTION_MESSAGES.INSERT_DATA_ARRAY_EMPTY);
            if (data.length > 0) {
                for (var i = 0; i < data.length; i++) {
                    assert(Object.keys(data[i]).length > 0, EXCEPTION_MESSAGES.INSERT_DATA_EMPTY)
                }
            }
        } catch (e) {
            throw e;
        }
    }

    function OfflinkDbException(e) {
        console.error(e.name, e.message);
        this.message = e.message;
        this.name = e.name;
    }

    return {

        DATA_TYPES: {
            ARRAY_BUFFER: lf.Type.ARRAY_BUFFER,
            BOOLEAN: lf.Type.BOOLEAN,
            DATE_TIME: lf.Type.DATE_TIME,
            INTEGER: lf.Type.INTEGER,
            NUMBER: lf.Type.NUMBER,
            STRING: lf.Type.STRING,
            OBJECT: lf.Type.OBJECT
        },

        CONSTRAINT_ACTIONS: {
            CASCADE: lf.ConstraintAction.CASCADE
        },

        OP: {
            AND: lf.op.and,
            OR: lf.op.or,
            NOT: lf.op.not
        },

        ORDER: {
            ASC: lf.Order.ASC,
            DESC: lf.Order.DESC
        },

        FN: {
            AVG: lf.fn.avg,
            COUNT: lf.fn.count,
            DISTINCT: lf.fn.distinct,
            GEOMEAN: lf.fn.geomean,
            MAX: lf.fn.max,
            MIN: lf.fn.min,
            STDDEV: lf.fn.stddev,
            SUM: lf.fn.sum
        },

        bind: lf.bind,

        createSchema: function (dbName, version) {
            if (dbName) {
                if (!isNaN(version)) {
                    schemaBuilder = lf.schema.create(dbName, version);
                } else {
                    throw new OfflinkDbException({
                        message: EXCEPTION_MESSAGES.DB_VERSION_NAN,
                        name: "OfflinkDbException"
                    });
                }
            } else {
                throw new OfflinkDbException({
                    message: EXCEPTION_MESSAGES.DB_NAME_EMPTY,
                    name: "OfflinkDbException"
                });
            }
        },

        initConnection: function (dbName, version) {
            if (schemaBuilder === null) {
                promise = lf.schema.create(dbName, version).connect();
                promise.then(function (db) {
                    _db = db;
                });
                return promise;
            }
        },

        createTables: function (tables) {
            if (schemaBuilder === null) {
                throw new OfflinkDbException({
                    message: EXCEPTION_MESSAGES.CREATE_DB_BEFORE_TABLES,
                    name: "OfflinkDbException"
                });
            } else {
                try {
                    validateTableSchema(tables);
                } catch (e) {
                    throw e;
                }
                for (var i = 0; i < tables.length; i++) {
                    var sb = schemaBuilder.createTable(tables[i].table_name);
                    for (var colName in tables[i].columns) {
                        if (tables[i].columns.hasOwnProperty(colName)) {
                            sb.addColumn(colName, tables[i].columns[colName]);
                        }
                    }
                    sb.addPrimaryKey([tables[i].primary_key]);
                    if (tables[i].foreign_key) {
                        if (tables[i].foreign_key.action) {
                            sb.addForeignKey(tables[i].foreign_key.name, {
                                local: tables[i].foreign_key.local,
                                ref: tables[i].foreign_key.ref,
                                action: tables[i].foreign_key.action
                            });
                        } else {
                            sb.addForeignKey(tables[i].foreign_key.name, {
                                local: tables[i].foreign_key.local,
                                ref: tables[i].foreign_key.ref
                            });
                        }

                    }
                }
                promise = schemaBuilder.connect();
                promise.then(function (db) {
                    _db = db;
                });
                return promise;
            }
        },
        insert: function (tableName, data) {
            if (!tableName) {
                throw new OfflinkDbException({
                    message: EXCEPTION_MESSAGES.TABLE_NAME_EMPTY,
                    name: "OfflinkDbException"
                });
            }
            try {
                // TODO: Implement this function
                //validateInsertSingleData(data);
            } catch (e) {
                throw e;
            }
            var rows = [];
            var table, row;
            if (_db != null) {
                table = _db.getSchema().table(tableName);
                rows.push(table.createRow(data[0]));
                return _db.insertOrReplace().into(table).values(rows).exec();
            } else {
                return promise.then(function (db) {
                    _db = db;
                    table = _db.getSchema().table(tableName);
                    rows.push(table.createRow(data[0]));
                    return _db.insertOrReplace().into(table).values(rows).exec();
                });
            }
        },

        insertBulk: function (tableName, data) {
            if (!tableName) {
                throw new OfflinkDbException({
                    message: EXCEPTION_MESSAGES.TABLE_NAME_EMPTY,
                    name: "OfflinkDbException"
                });
            }
            try {
                validateInsertBulkData(data);
            } catch (e) {
                throw e;
            }
            var rows = [];
            var table, row;
            if (_db != null) {
                table = _db.getSchema().table(tableName);

                for (var i = 0; i < data.length; i++) {
                    rows.push(table.createRow(data[i]));
                }

                return _db.insertOrReplace().into(table).values(rows).exec();
            } else {
                return promise.then(function (db) {
                    _db = db;
                    table = _db.getSchema().table(tableName);

                    for (var i = 0; i < data.length; i++) {
                        rows.push(table.createRow(data[i]));
                    }

                    return _db.insertOrReplace().into(table).values(rows).exec();
                });
            }
        },

        getTableRef: function (tableName) {
            return promise.then(function (db) {
                _db = db;
                return _db.getSchema().table(tableName);
            });
        },

        select: function (attrs) {
            if (_db != null) {
                return _db.select(attrs);
            } else {
                return promise.then(function (db) {
                    _db = db;
                    return _db.select(attrs);
                });
            }
        },

        getAllFromTable: function (tableName) {
            return promise.then(function (db) {
                _db = db;
                var table = _db.getSchema().table(tableName);
                return _db.select().from(table).exec().then(function (results) {
                    return results;
                });
            });
        },

        selectByIdFromTable: function (tableName, id) {
            return promise.then(function (db) {
                _db = db;
                var table = _db.getSchema().table(tableName);
                return _db.select().from(table).where(table.id.eq(id)).exec().then(function (results) {
                    return results;
                });
            });
        },

        update: function (table) {
            if (_db != null) {
                return _db.update(table);
            } else {
                return promise.then(function (db) {
                    _db = db;
                    return _db.update(table);
                });
            }
        },

        deleteFrom: function (table) {
            if (_db != null) {
                return _db.delete().from(table);
            } else {
                return promise.then(function (db) {
                    _db = db;
                    return _db.delete().from(table);
                });
            }
        },

        deleteAllFromTable: function (table) {
            if (_db != null) {
                return _db.delete().from(table).exec();
            } else {
                return promise.then(function (db) {
                    _db = db;
                    return _db.delete().from(table).exec();
                });
            }
        }

    };
}]);

OfflinkJs.factory('flinkPrefetchService', ['$window', '$indexedDB', 'localStorageService', '$location', '$document', '$http',
    function ($window, $indexedDB, localStorageService, $location, $document, $http) {
        var pc = $location.protocol() + "://";
        var host = $location.host();
        var port = $location.port() == '' ? '' : ':' + $location.port();
        var urlPrefix = pc + host + port;

        return {
            staticPrefetch: function (dom) {
                var head = dom.find('head').eq(0);
                for (var i = 0; i < OFFlINK_STATIC_CACHE.length; i++) {
                    head.append("<link rel='prefetch' href=" + OFFlINK_STATIC_CACHE[i] + ">");
                }
            },
            dynamicPrefetch: function (dom) {
                dom = typeof dom !== 'undefined' ? dom : $document;
                var threshold = 1;
                var absUrl = $location.absUrl();
                var routeUrl;
                $indexedDB.openStore('dynamic_prefetch_cache', function (store) {
                    store.find(absUrl).then(function (e) {
                        var links_array = [];
                        var head = dom.find('head').eq(0);
                        var pf_links = document.querySelectorAll('link[title=flnk_pf]');
                        for (var j = 0; j < pf_links.length; j++) {
                            links_array.push(pf_links[j]['attributes']['href']['value']);
                        }
                        for (var i = 0; i < e['child_pages'].length; i++) {
                            if (e['child_pages'][i].weight >= threshold) {
                                routeUrl = (e['child_pages'][i].url).split(urlPrefix)[1];
                                if (typeof ROUTE_MAP[routeUrl] !== 'undefined') {
                                    if (links_array.indexOf(ROUTE_MAP[routeUrl]) < 0) {
                                        head.append("<link title='flnk_pf' rel='prefetch' href=" + ROUTE_MAP[routeUrl] + ">");
                                    }
                                }
                            }
                        }
                    }, function () {
                        console.log('No pages to pre fetch');
                    });
                });
            },
            updateDynamicPrefetchModel: function (current, previous) {
                $indexedDB.openStore('dynamic_prefetch_cache', function (store) {
                        store.find(previous).then(function (e) {
                            var childPageExists = false;
                            for (var i = 0; i < e['child_pages'].length; i++) {
                                if (e['child_pages'][i].url == current) {
                                    e['child_pages'][i].weight++;
                                    childPageExists = true;
                                    break;
                                }
                            }
                            if (!childPageExists) {
                                e['child_pages'].push({
                                    url: current,
                                    weight: 1
                                });
                            }
                            store.upsert({
                                "parent_page": previous,
                                "child_pages": e['child_pages']
                            });
                        }, function (e) {
                            store.insert({
                                "parent_page": previous,
                                "child_pages": [{
                                    url: current,
                                    weight: 1
                                }]
                            });
                        });

                    }
                );
                //localStorageService.set("previous", $location.absUrl());
            }
        }
    }])
;

OfflinkJs.run(['$location', 'localStorageService', 'flinkPrefetchService', '$rootScope',
    function ($location, localStorageService, flinkPrefetchService, $rootScope) {
        $rootScope.$on("$locationChangeSuccess", function (event, current, previous) {
            flinkPrefetchService.updateDynamicPrefetchModel(current, previous);
            flinkPrefetchService.dynamicPrefetch();
        });
    }]);

OfflinkJs.config(['$indexedDBProvider', '$httpProvider', 'localStorageServiceProvider',
    function ($indexedDBProvider, $httpProvider, localStorageServiceProvider) {
        $httpProvider.interceptors.push('cacheInterceptor');
        localStorageServiceProvider
            .setPrefix('flnk')
            .setNotify(true, true);
        // TODO : Remove this comment
        $indexedDBProvider
            .connection('prefetchDB')
            .upgradeDatabase(1, function (event, db, tx) {
                var objStore = db.createObjectStore('dynamic_prefetch_cache', {keyPath: 'parent_page'});
                objStore.createIndex('child_pages_idx', 'child_pages', {unique: false});
            });

    }]);
