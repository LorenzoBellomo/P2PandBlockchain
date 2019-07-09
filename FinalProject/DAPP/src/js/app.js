App = {
    contracts: {}, // Store contract abstractions
    web3Provider: null, // Web3 provider
    url: 'http://localhost:7545', // Url for web3
    init: function() { return App.initWeb3(); },
    initWeb3: function() {
        if(typeof web3 != 'undefined') { // Check whether exists a provider, e.g Metamask
            App.web3Provider = window.ethereum; // !! new standard, since 2/11/18
            web3 = new Web3(App.web3Provider);
            try { // Permission popup
                ethereum.enable().then(async() => { console.log("DApp connected"); });
            } catch(error) { console.log(error); }
        } else { // Otherwise, create a new local instance of Web3
            App.web3Provider = new Web3.providers.HttpProvider(App.url); // <==
            web3 = new Web3(App.web3Provider);
        }
    },
    initVickrey: function() {
        // Load content's abstractions
        $.getJSON("VickreyAuction.json").done(function(c) {
            App.contracts["VickreyAuction"] = TruffleContract(c);
            App.contracts["VickreyAuction"].setProvider(App.web3Provider);
        });
        return App.listenForEventsV();
    },
    listenForEventsV: function() {
        App.contracts["VickreyAuction"].deployed().then(async (instance) => {
            web3.eth.getBlockNumber(function (error, block) {
                // click is the Solidity event
                instance.AuctionBegins().on('data', function (event) {
                    spamButton();
                    console.log("Event catched");
                    console.log(event);
                    // If event has parameters: event.returnValues.valueName
                    $('#eventSink').value("Auction Begun");
                });
                instance.GraceTimeEnds().on('data', function (event) {
                    spamButton();
                    console.log("Event catched");
                    console.log(event);
                    // If event has parameters: event.returnValues.valueName
                    $('#eventSink').value("Grace Time is Over");
                });
                instance.CommitmentOver().on('data', function (event) {
                    spamButton();
                    console.log("Event catched");
                    console.log(event);
                    // If event has parameters: event.returnValues.valueName
                    $('#eventSink').value("Commitment Phase is Over");
                });
                instance.WithdrawalOver().on('data', function (event) {
                    spamButton();
                    console.log("Event catched");
                    console.log(event);
                    // If event has parameters: event.returnValues.valueName
                    $('#eventSink').value("Withdrawal Phase is Over");
                });
                instance.AuctionEnded().on('data', function (event) {
                    spamButton();
                    console.log("Event catched");
                    console.log(event);
                    // If event has parameters: event.returnValues.valueName
                    $('#eventSink').value("Auction is Over");
                });
                instance.NewCommitment().on('data', function (event) {
                    spamButton();
                    console.log("Event catched");
                    console.log(event);
                    // If event has parameters: event.returnValues.valueName
                    $('#eventSink').value("There was a new Commitment");
                });
                instance.NewWithdrawal().on('data', function (event) {
                    spamButton();
                    console.log("Event catched");
                    console.log(event);
                    // If event has parameters: event.returnValues.valueName
                    $('#eventSink').value("There was a new Withdrawal");
                });
                instance.NewLeader().on('data', function (event) {
                    spamButton();
                    console.log("Event catched");
                    console.log(event);
                    // If event has parameters: event.returnValues.valueName
                    $('#eventSink').value("There is a new temporary winner");
                });
            });
        });
        return App.renderVickrey();
    },
    initDutch: function() {
        // Load content's abstractions
        $.getJSON("DutchAuction.json").done(function(c) {
            App.contracts["DutchAuction"] = TruffleContract(c);
            App.contracts["DutchAuction"].setProvider(App.web3Provider);
        });
        return App.listenForEventsD();
    },
    listenForEventsD: function() {
        App.contracts["DutchAuction"].deployed().then(async (instance) => {
            web3.eth.getBlockNumber(function (error, block) {
                // click is the Solidity event
                instance.AuctionEnded().on('data', function (event) {
                    spamButton();
                    console.log("Event catched");
                    console.log(event);
                    // If event has parameters: event.returnValues.valueName
                    $('#eventSink').value("AuctionEnded");
                });
                instance.AuctionBegins().on('data', function (event) {
                    spamButton();
                    console.log("Event catched");
                    console.log(event);
                    // If event has parameters: event.returnValues.valueName
                    $('#eventSink').value("AuctionBegins");
                });
            });
        });
        return App.renderDutch();
    },
    renderVickrey: function() { 
        /* Render page */
        App.contracts["VickreyAuction"].deployed().then(async(instance) =>{
            $(function() {
                $("#activeMode").html("VickreyAuction");
                $(".AuctionChoice").remove();
                $('#auctionType').load("views/vickrey.html")
            });
        });
    },
    renderDutch: function() {
        /* Render page */
        App.contracts["DutchAuction"].deployed().then(async(instance) =>{
            $(function() {
                $("#activeMode").html("DutchAuction");
                $(".AuctionChoice").remove();
                $('#auctionType').load("views/dutch.html")
            });         
        });
    },
    getV: function(code) {
        App.contracts["VickreyAuction"].deployed().then(async(instance) =>{
            let out;
            switch(code){
                case 1: 
                    instance.getCurrentPhase().then(result => {
                        out = result;
                    });
                break;
                case 2: 
                    instance.getGraceTimeDuration().then(result => {
                        out = result;
                    });
                break;
                case 3: 
                    instance.getCommitmentDuration().then(result => {
                        out = result;
                    });
                break;
                case 4: 
                    instance.getWithdrawalDuration().then(result => {
                        out = result;
                    });
                break;
                case 5: 
                    instance.getOpeningDuration().then(result => {
                        out = result;
                    });
                break;
                case 1: 
                    instance.getCurrentPhase().then(result => {
                        out = result;
                    });
                break;
            }
            $("#getterResult").html(out);
        })
    },
    getD: function(code) {
        switch(code){
            case 1: 
        }
    }
}

// Call init whenever the window loads
$(function() {
    $(window).on('load', function () {
        App.init();
    });
});

spamButton = function() {
    $(function() {
        $(".newSpam").fadeIn().delay(2000).fadeOut();
    });
}