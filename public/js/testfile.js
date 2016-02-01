'use strict';

describe('OfflinkJs module', function () {

    beforeEach(module('LocalStorageModule'));
    beforeEach(module('indexedDB'));
    beforeEach(module('OfflinkJs'));
    var httpProviderIt, localStorageService;
    var location;
    var cacheInterceptor;
    var $httpBackend;
    var $http;
    var $scope;
    var flnkSynchronizer;
    var flnkDatabaseService;
    var flinkPrefetchService;

    beforeEach(function () {
        module('OfflinkJs', function ($httpProvider, $provide) {
            httpProviderIt = $httpProvider;
            $provide.value('$log', console);
        });

        inject(
            function (_cacheInterceptor_, _localStorageService_, _$httpBackend_, _$http_, _$rootScope_, _$location_,
                      _flnkSynchronizer_, _flinkPrefetchService_, _flnkDatabaseService_) {
                cacheInterceptor = _cacheInterceptor_;
                localStorageService = _localStorageService_;
                $httpBackend = _$httpBackend_;
                $http = _$http_;
                $scope = _$rootScope_.$new();
                location = _$location_;
                flnkSynchronizer = _flnkSynchronizer_;
                flnkDatabaseService = _flnkDatabaseService_;
                flinkPrefetchService = _flinkPrefetchService_;
            })
    });

    describe('cacheInterceptor', function () {


        describe('cacheInterceptor Tests', function () {

            it('should have cacheInterceptor be defined', function () {
                expect(cacheInterceptor).toBeDefined();
            });

            describe('HTTP tests', function () {

                it('should have the RequestService as an interceptor', function () {
                    expect(httpProviderIt.interceptors).toContain('cacheInterceptor');
                });

                it('should have the request and responseError methods defined', function () {
                    expect(cacheInterceptor.request).toBeDefined();
                    expect(cacheInterceptor.responseError).toBeDefined();
                });

                it('response should contain the request prefix sent with the request', function () {
                    var test_prefix = 'GC<>http://example';
                    $httpBackend.expectGET('http://example.com').respond(200, {});
                    $http.get('http://example.com', {
                        flnk_cache: true,
                        req_prefix: test_prefix
                    }).then(function (data) {
                        expect(data.config.flnk_cache).toBe(true);
                    });
                    $httpBackend.flush();
                    return false;
                });

                it('should cache GET requests when the cache flag is set', function () {

                    beforeEach(function () {
                        localStorageService.clearAll();
                    });

                    var test_prefix = 'GC<>http://example';
                    $httpBackend.expectGET('http://example.com').respond(200, {});
                    $http.get('http://example.com', {
                        flnk_cache: true,
                        req_prefix: test_prefix
                    }).then(function (data) {
                        var lsKey = localStorageService.keys()[0];
                        expect(lsKey.split(".")[0]).toBe(test_prefix);
                    });
                    $httpBackend.flush();
                    return false;
                });

                it('should call the callback function when the repsonse is 401', function () {

                    var callbackFunc = function (rejection) {
                        expect(rejection.status).toBe(401);
                    };

                    $httpBackend.expectGET('http://arunatebel.com/').respond(401, {});
                    $http.get('http://arunatebel.com/', {
                        offlink_callback: callbackFunc
                    });

                    $httpBackend.flush();
                });

                it('should redirect to the offline url when the response is 401', function () {

                    var offlink_url_401 = "/test/offlink_url_401";

                    $httpBackend.expectGET('http://arunatebel.com/').respond(401, {});
                    location.url('text');
                    $http.get('http://arunatebel.com/', {
                        offlink_url_401: offlink_url_401
                    }).then(function (data) {
                        expect(location.url()).toBe(offlink_url_401);
                    });

                    $httpBackend.flush();
                });

                it('should respond with cached data, when it is a GET request and cache flag set and the response code is 0',
                    function () {
                        beforeEach(function () {
                            localStorageService.clearAll();
                        });
                        $httpBackend.expectGET('http://example.com/').respond(200, {});
                        $http.get('http://example.com/', {
                            flnk_cache: true
                        }).then(function (res) {
                            $httpBackend.expectGET('http://example.com/').respond(0, {});
                            $http.get('http://example.com/', {
                                flnk_cache: true
                            }).then(function (res) {
                                var lsKey = localStorageService.keys()[0];
                                expect(lsKey.split(".")[0]).toBe('GC<>http://example');
                            });
                        });

                        $httpBackend.flush();
                    }
                );

                it('should call the callback function, when it is a not a GET request and ' +
                    '(cache flag set and callback function given) and the reponse code is 0', function () {

                    var callbackFunc = function (rejection) {
                        expect(rejection.status).toBe(0);
                    };

                    $httpBackend.expectGET('http://arunatebel.com/').respond(0, {});
                    $http.get('http://arunatebel.com/', {
                        offlink_callback: callbackFunc
                    });

                    $httpBackend.flush();
                });

                it('should cache the POST requests sent when offline',
                    function () {
                        beforeEach(function () {
                            localStorageService.clearAll();
                        });
                        $httpBackend.expectPOST('http://mysite.com/').respond(0, {});
                        $http.post('http://mysite.com/', null, {
                            flnk_cache: true,
                            flnk_prefix: 'test_prefix'
                        }).then(function (res) {
                            var lsKey = localStorageService.keys()[0];
                            expect(lsKey.split("<>")[1]).toBe('test_prefix');
                        });

                        $httpBackend.flush();
                    }
                );

                it('should cache the PUT requests sent when offline',
                    function () {
                        beforeEach(function () {
                            localStorageService.clearAll();
                        });
                        $httpBackend.expectPUT('http://mysite.com/').respond(0, {});
                        $http.put('http://mysite.com/', null, {
                            flnk_cache: true,
                            flnk_prefix: 'test_prefix'
                        }).then(function (res) {
                            var lsKey = localStorageService.keys()[0];
                            expect(lsKey.split("<>")[1]).toBe('test_prefix');
                        });

                        $httpBackend.flush();
                    }
                );

                it('should cache the DELETE requests sent when offline',
                    function () {
                        beforeEach(function () {
                            localStorageService.clearAll();
                        });
                        $httpBackend.expectDELETE('http://mysite.com/').respond(0, {});
                        $http.delete('http://mysite.com/', {
                            flnk_cache: true,
                            flnk_prefix: 'test_prefix'
                        }).then(function (res) {
                            var lsKey = localStorageService.keys()[0];
                            expect(lsKey.split("<>")[1]).toBe('test_prefix');
                        });

                        $httpBackend.flush();
                    }
                );

                it('should cache the POST requests sent when offline with <>auto suffix when the auto_sync flag is set',
                    function () {
                        beforeEach(function () {
                            localStorageService.clearAll();
                        });
                        $httpBackend.expectPOST('http://mysite.com/').respond(0, {});
                        $http.post('http://mysite.com/', null, {
                            flnk_cache: true,
                            flnk_prefix: 'test_prefix',
                            flnk_auto_sync: true
                        }).then(function (res) {
                            var lsKey = localStorageService.keys()[0];
                            expect(lsKey.split("<>")[1]).toBe('test_prefix');
                        });

                        $httpBackend.flush();
                    }
                );

                it('should cache the PUT requests sent when offline with <>auto suffix when the auto_sync flag is set',
                    function () {
                        beforeEach(function () {
                            localStorageService.clearAll();
                        });
                        $httpBackend.expectPUT('http://mysite.com/').respond(0, {});
                        $http.put('http://mysite.com/', null, {
                            flnk_cache: true,
                            flnk_prefix: 'test_prefix',
                            flnk_auto_sync: true
                        }).then(function (res) {
                            var lsKey = localStorageService.keys()[0];
                            expect(lsKey.split("<>")[1]).toBe('test_prefix');
                        });

                        $httpBackend.flush();
                    }
                );

                it('should cache the DELETE requests sent when offline with <>auto suffix when the auto_sync flag is set    ',
                    function () {
                        beforeEach(function () {
                            localStorageService.clearAll();
                        });
                        $httpBackend.expectDELETE('http://mysite.com/').respond(0, {});
                        $http.delete('http://mysite.com/', {
                            flnk_cache: true,
                            flnk_prefix: 'test_prefix',
                            flnk_auto_sync: true
                        }).then(function (res) {
                            var lsKey = localStorageService.keys()[0];
                            expect(lsKey.split("<>")[1]).toBe('test_prefix');
                        });

                        $httpBackend.flush();
                    }
                );
            });
        });

        describe('flnkSynchronizer Tests', function () {

            it('should have flnkSynchronizer defined', function () {
                expect(flnkSynchronizer).toBeDefined();
            });

            it('should have a syncByPrefix method', function () {
                expect(flnkSynchronizer.syncByPrefix).toBeDefined();
            });

            describe('Sync by prefix tests', function () {
                beforeEach(function () {
                    localStorageService.clearAll();
                });
                afterEach(function () {
                    localStorageService.clearAll();
                });
                it('should send requests cached in the local storage, matching the prefix given, and return the array of successful requests',
                    function () {
                        localStorageService.add('tk_1<>test_prefix<>test_suffix', {
                            method: 'GET',
                            url: 'http://example.com'
                        });

                        $httpBackend.expectGET('http://example.com').respond(404, {});

                        flnkSynchronizer.syncByPrefix('test_prefix').then(function (data) {
                            expect(data.sync_success.length).toBe(1);
                        });
                        $httpBackend.flush();

                    }
                );

                it('should send requests cached in the local storage, matching the prefix given, and returned array of successful requests should contain desired request method',
                    function () {
                        localStorageService.add('tk_1<>test_prefix<>test_suffix', {
                            method: 'GET',
                            url: 'http://example.com'
                        });

                        $httpBackend.expectGET('http://example.com').respond(404, {});

                        flnkSynchronizer.syncByPrefix('test_prefix').then(function (data) {
                            expect(data.sync_success[0].method).toBe('GET');
                        });
                        $httpBackend.flush();

                    }
                );

                it('should send requests cached in the local storage, matching the prefix given, and returned array of successful requests should contain desired request url',
                    function () {
                        localStorageService.add('tk_1<>test_prefix<>test_suffix', {
                            method: 'GET',
                            url: 'http://example.com'
                        });

                        $httpBackend.expectGET('http://example.com').respond(404, {});

                        flnkSynchronizer.syncByPrefix('test_prefix').then(function (data) {
                            expect(data.sync_success[0].url).toBe('http://example.com');
                        });
                        $httpBackend.flush();

                    }
                );
            });

            describe('auto sync method tests', function () {
                beforeEach(function () {
                    localStorageService.clearAll();
                });
                afterEach(function () {
                    localStorageService.clearAll();
                });
                it('should send requests cached in the local storage, matching the prefix given, and return the array of successful requests',
                    function () {
                        localStorageService.add('tk_1<>test_prefix<>test_suffix<>auto', {
                            method: 'GET',
                            url: 'http://example.com'
                        });

                        $httpBackend.expectGET('http://example.com').respond(404, {});

                        flnkSynchronizer.syncAuto('test_prefix').then(function (data) {
                            expect(data.sync_success.length).toBe(1);
                        });
                        $httpBackend.flush();

                    }
                );

                it('should send requests cached in the local storage, matching the prefix given, and returned array of successful requests should contain desired request method',
                    function () {
                        localStorageService.add('tk_1<>test_prefix<>test_suffix<>auto', {
                            method: 'GET',
                            url: 'http://example.com'
                        });

                        $httpBackend.expectGET('http://example.com').respond(404, {});

                        flnkSynchronizer.syncAuto('test_prefix').then(function (data) {
                            expect(data.sync_success[0].method).toBe('GET');
                        });
                        $httpBackend.flush();

                    }
                );

                it('should send requests cached in the local storage, matching the prefix given, and returned array of successful requests should contain desired request url',
                    function () {
                        localStorageService.add('tk_1<>test_prefix<>test_suffix<>auto', {
                            method: 'GET',
                            url: 'http://example.com'
                        });

                        $httpBackend.expectGET('http://example.com').respond(404, {});

                        flnkSynchronizer.syncAuto('test_prefix').then(function (data) {
                            expect(data.sync_success[0].url).toBe('http://example.com');
                        });
                        $httpBackend.flush();

                    }
                );
            });

            describe('bulk sync method tests', function () {
                beforeEach(function () {
                    localStorageService.clearAll();
                });
                afterEach(function () {
                    localStorageService.clearAll();
                });
                it('should send all requests cached in the local storage, and return the array of successful requests',
                    function () {
                        localStorageService.add('tk_1', {
                            method: 'GET',
                            url: 'http://example.com'
                        });

                        $httpBackend.expectGET('http://example.com').respond(404, {});

                        flnkSynchronizer.bulkSync('test_prefix').then(function (data) {
                            expect(data.sync_success.length).toBe(1);
                        });
                        $httpBackend.flush();

                    }
                );

                it('should send all requests cached in the local storage, and returned array of successful requests should contain desired request method',
                    function () {
                        localStorageService.add('tk_1', {
                            method: 'GET',
                            url: 'http://example.com'
                        });

                        $httpBackend.expectGET('http://example.com').respond(404, {});

                        flnkSynchronizer.bulkSync('test_prefix').then(function (data) {
                            expect(data.sync_success[0].method).toBe('GET');
                        });
                        $httpBackend.flush();

                    }
                );

                it('should send all requests cached in the local storage, and returned array of successful requests should contain desired request url',
                    function () {
                        localStorageService.add('tk_1', {
                            method: 'GET',
                            url: 'http://example.com'
                        });

                        $httpBackend.expectGET('http://example.com').respond(404, {});

                        flnkSynchronizer.bulkSync('test_prefix').then(function (data) {
                            expect(data.sync_success[0].url).toBe('http://example.com');
                        });
                        $httpBackend.flush();

                    }
                );
            });

        });


    });
    describe('flnkDatabaseService tests', function () {

        it('should have flnkDatabaseService defined', function () {
            expect(flnkDatabaseService).toBeDefined();
        });

        describe('createSchema tests', function () {
            it('should have createSchema function', function () {
                expect(flnkDatabaseService.createSchema).toBeDefined();
            });

            it('should create a schema', function () {
                expect(flnkDatabaseService.createSchema('testDb', 1)).toBe(true);
            });

        });
        describe('initConnection tests', function () {
            it('should return a db connection with the created database name', (function (done) {
                flnkDatabaseService.initConnection('testDb', 1).then(function (db) {
                    expect(db.schema_.name_).toBe('testDb');
                    done();
                });
            }));
        });

        describe('createTables tests', function () {
            it('should return a db connection with the created database name', (function (done) {
                var tables = [
                    {
                        table_name: 'posts',
                        columns: {
                            'id': flnkDatabaseService.DATA_TYPES.INTEGER,
                            'title': flnkDatabaseService.DATA_TYPES.STRING,
                            'text': flnkDatabaseService.DATA_TYPES.STRING,
                            'created': flnkDatabaseService.DATA_TYPES.STRING,
                            'votes': flnkDatabaseService.DATA_TYPES.INTEGER,
                            'tags': flnkDatabaseService.DATA_TYPES.OBJECT
                        },
                        primary_key: 'id'
                    },
                    {
                        table_name: 'comments',
                        columns: {
                            'id': flnkDatabaseService.DATA_TYPES.INTEGER,
                            'text': flnkDatabaseService.DATA_TYPES.STRING,
                            'created': flnkDatabaseService.DATA_TYPES.DATE_TIME,
                            'post_id': flnkDatabaseService.DATA_TYPES.INTEGER
                        },
                        primary_key: 'id',
                        foreign_key: {
                            name: 'fk_postId',
                            local: 'post_id',
                            ref: 'posts.id',
                            action: flnkDatabaseService.CONSTRAINT_ACTIONS.CASCADE
                        }
                    }
                ];
                flnkDatabaseService.createSchema('TestDatabase', 4);

                flnkDatabaseService.createTables(tables).then(function (db) {
                    flnkDatabaseService.insert('posts', [{
                        created: Date.now(),
                        id: Math.floor((Math.random() * 10000) + 1),
                        tags: ['Science', 'Mathematics'],
                        text: "This is s random post txt",
                        title: 'My random post 1',
                        votes: Math.floor((Math.random() * 10) + 1)
                    }]);
                    expect(db.schema_.name_).toBe('TestDatabase');
                    done();
                });
            }));
        });
    });

});
