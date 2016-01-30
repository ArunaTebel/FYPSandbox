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
OfflinkJs.factory("ConnectionDetectorService", [function () {

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
    return {
        request: function (config) {
            if (config.flnk_cache) {
                if (config.method === 'POST') {
                    localStorageService.set(config.req_prefix + "." + Date.now(), config);
                }
            }
            return config;
        },
        response: function (response) {

            if (response.config.flnk_cache && response.config.method === 'GET') {
                localStorageService.set(response.config.url, response.data);
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
                if (rejection.config.flnk_cache) {
                    if (rejection.config.method === 'GET') {
                        rejection.data = localStorageService.get(rejection.config.url);
                    } else if (rejection.config.offlink_callback) {
                        rejection.config.offlink_callback(rejection);
                    } else if (rejection.config.fallback_url) {
                        $location.url(rejection.config.fallback_url);
                    } else if (
                        rejection.config.method === 'POST' ||
                        rejection.config.method === 'PUT' ||
                        rejection.config.method === 'DELETE'
                    ) {
                        localStorageService.add(rejection.config.flnk_prefix + "." + Date.now(), rejection.config);
                    }
                }
            }
            return rejection;
        }
    };
}]);

OfflinkJs.factory('flnkSynchronizer', ['$http', 'localStorageService', function ($http, localStorageService) {
    return {
        sync: function (prefix) {
            var lsKeys = localStorageService.keys();
            angular.forEach(lsKeys, function (value, key) {
                if (prefix === value.split(".")[0]) {
                    var config = localStorageService.get(value);
                    $http.post(config.url,
                        config.data
                    ).then(function (response) {
                    }, function (response) {
                    });
                }
            });
            return lsKeys;
        }
    };
}]);

OfflinkJs.factory('flnkDatabaseService', [function () {
    var _db = null;
    var promise;
    return {
        init: function (schemaBuilder) {
            promise = schemaBuilder.connect();
            promise.then(function (db) {
                _db = db;
            });
            return promise;
        },
        insert: function (tableName, data) {
            var table, row;
            if (_db != null) {
                table = _db.getSchema().table(tableName);
                row = table.createRow(data);
                return _db.insertOrReplace().into(table).values([row]).exec();
            } else {
                return promise.then(function (db) {
                    _db = db;
                    table = _db.getSchema().table(tableName);
                    row = table.createRow(data);
                    return _db.insertOrReplace().into(table).values([row]).exec();
                });
                //return schemaBuilder.connect().then(function (db) {
                //    console.log("muwahaha");
                //    _db = db;
                //    table = _db.getSchema().table(tableName);
                //    row = table.createRow(data);
                //    return _db.insertOrReplace().into(table).values([row]).exec();
                //});
            }
        },

        read: function (tableName, selectParam) {
            //console.log(selectParam[0]);
            var table;
            //angular.forEach(selectParam,function(param){
            //        console.log(param);
            //    }
            // );
            if (_db != null) {
                table = _db.getSchema().table(tableName);
                return _db.select.apply(this, selectParam).from(table).exec();
                /**
                 * TODO: add query parameters
                 */
                //return _db.select().from(table).where(item.done.eq(false)).exec();
            } else {
                return promise.then(function (db) {
                    _db = db;
                    table = _db.getSchema().table(tableName);
                    return _db.select().from(table).exec();
                });
                //return schemaBuilder.connect().then(function (db) {
                //    _db = db;
                //    table = _db.getSchema().table(tableName);
                //    return _db.select().from(table).exec();
                //});
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
            myFunc: function (dom) {
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
            dynamicPrefetch: function (current, previous) {
                //console.log("Inside Dynamic Prefetch");
                //var prev = localStorageService.get("previous");
                //console.log("Previous page : " + prev);
                //if (prev == null) {
                //    localStorageService.set("previous", $location.absUrl());
                //}
                //console.log("Current page : " + $location.absUrl());
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
            flinkPrefetchService.dynamicPrefetch(current, previous);
            flinkPrefetchService.myFunc();
        });
        //var prev = localStorageService.get("previous");
        //console.log("Previous page : " + prev);
        //if (prev == null) {
        //    localStorageService.set("previous", $location.absUrl());
        //}
        //console.log("Current page : " + $location.absUrl());
        //flinkPrefetchService.dynamicPrefetch(prev, $location.absUrl());
        //localStorageService.set("previous", $location.absUrl());
        //
        //previous = $location.absUrl();

    }]);

//OfflinkJs.provider('dynamicPrefetch', function DynamicPrefetchProvider($indexedDB) {
//
//    this.insertData = function () {
//        $indexedDB.openStore('prefetch_cache1', function (store) {
//            store.insert({"ssn": "444-444-222-111", "surname": "ABCD", "age": 17}).then(function (e) {
//                console.log(e);
//            });
//        });
//    };
//    this.$get = ['$indexedDB', function dynamicPrefetchFactory($indexedDB) {
//        return new DynamicPrefetch($indexedDB);
//    }];
//
//});

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



