//interceptado!!!
app.run(function ($rootScope, $state, $stateParams, $timeout, DataLayerService, TaggingService, DataCaptureService, facebookUser) {

    $('ul.slimmenu').slimmenu({
        animSpeed: 250,
        indentChildren: true,
        childrenIndenter: ''
    });

    $rootScope.loggedInUser = {};

    $rootScope.$on('fbLoginSuccess', function(name, response) {
        facebookUser.then(function(user) {
            user.api('/me?fields=name,email,birthday,first_name,last_name,gender').then(function(response) {
                console.log("Facebook login response " + JSON.stringify(response));
                $rootScope.loggedInUser = response;
                // TODO Facebook API does not provide title, it would be great to infer from firstName
                $rootScope.loggedInUser.title = "Mr";

                var dataLayer = DataLayerService.load($state.current.url);
                dataLayer.cart.contact = {
                    title: $rootScope.loggedInUser.title,
                    firstName: $rootScope.loggedInUser.first_name,
                    lastName: $rootScope.loggedInUser.last_name,
                    email: $rootScope.loggedInUser.email
                };

                if ($rootScope.loggedInUser.email && $rootScope.loggedInUser.email.length > 0) {
                    DataLayerService.save(dataLayer);
                    DataCaptureService.sendIdentityByFacebook(response, function() {
                        // Allow enough time for stream to process identity event
                        $timeout(function(){
                            user.api('/' + response.id + "/likes").then(function(response) {
                                console.log("Facebook like response " + JSON.stringify(response));
                                DataCaptureService.sendFacebookLikesData(response);
                            });
                        },1500);
                    });
                }
            });
        });
    });

    $rootScope.$on('fbLogoutSuccess', function() {
        $rootScope.$apply(function() {
            $rootScope.loggedInUser = {};
        });
    });

    $rootScope.fbLogin = function() {
        facebookUser.then(function(user) {
            user.login();
        });
    };

    $rootScope.fbLogout = function() {
       facebookUser.then(function(user) {
            user.logout();
       });
    };

    function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    $rootScope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams) {
        document.body.scrollTop = 0;
        document.documentElement.scrollTop = 0;
        if (toState.url.length > 1) {
            var dataLayer = DataLayerService.load(toState.url);
            if (TaggingService["pre" + capitalizeFirstLetter(toState.name) + "Ctrl"]) {
                TaggingService["pre" + capitalizeFirstLetter(toState.name) + "Ctrl"](dataLayer);
            }
        }
    });


    $rootScope.$on('$stateChangeStart', function (event, toState, toParams, fromState, fromParams) {
        if (fromState.url.length > 1) {
            var dataLayer = DataLayerService.load(toState.url);
            if (TaggingService["post" + capitalizeFirstLetter(toState.name) + "Ctrl"]) {
                TaggingService["post" + capitalizeFirstLetter(fromState.name) + "Ctrl"](dataLayer);
            }
        }
    });

document.addEventListener('keyup', function(event) {
        // 1 = a, 3 = c, 5 = e, 6 = f, 15 = o, 19 = s, 20 = t
        if(event.keyCode === 36 && confirm("Start as anonymous visitor?")) {
            facebookUser.then(function(user) {
                if (user.loggedIn) {
                    user.logout();
                }
            });
            var keys = [];
            for(var i=0, len=sessionStorage.length; i<len; i++) {
                var key = sessionStorage.key(i);
                if (key.indexOf("BXSuppress") != -1) {
                    keys.push(key);
                }
            }
            for(var i=0, len=keys.length; i<len; i++) {
                sessionStorage.removeItem(keys[i]);
            }
            DataLayerService.clear();
            DataCaptureService.startAsAnonymous(function(){
                // This is to allow the session in Boxever to instantiate
                $state.go("landingPage");
            });
        } else if(event.keyCode === 33 && confirm("Simulate close session?")) {
            DataCaptureService.closeSession();
        } /*else if(e.ctrlKey && e.which === 15 && confirm("Open guest profile in app?")) {
            var bid = Boxever.getID();
            var url = _boxever_settings.tenant.appEndPoint + '/#/guests/list?search=bid:' + bid;
            win = window.open(url, '_blank');
            win.focus();
        } else if(e.ctrlKey && e.which === 19 && confirm("Clear data layer?")) {
            DataLayerService.clear();
            // Must use window.location.href instead of angular to force page refresh of javascript files
            window.location.href="/";
        } else if(e.ctrlKey && e.which === 20) {
            window.location.href="/config.html";
        } else if(e.ctrlKey && e.which === 24) {
           // ctrl + x
           if (sessionStorage.getItem("isModalEnabled") === null) {
              sessionStorage.setItem("isModalEnabled", "true");
           } else {
              sessionStorage.removeItem("isModalEnabled");
           }
           window.location.reload();
        } else if(e.ctrlKey && e.which === 16) {
            // ctrl + p
            boxeverWebPush('sdk', function(sdk) {
                console.log("Web Push SDK Version: " + sdk.version);
                if (sdk.isSubscribed && confirm("Unsubscribe from push notifications")) {
                    sdk.unsubscribe().then(function(isSubscribed){
                       console.log("Unsubscribed to web push notifications");
                    });
                } else if (confirm("Subscribe to push notifications")) {
                    sdk.subscribe().then(function(isSubscribed){
                        console.log("Subscribed to web push notifications");
                        DataCaptureService.sendWebPushSubscriptionData(sdk.subscription);
                    });
                }*/
            });
        }
    });
});
