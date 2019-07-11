App = {
    contracts: {}, // Store contract abstractions
    hashesAndNonces: {},
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
                        out = "Phase: " + result;
                    });
                break;
                case 2: 
                    out = "Grace: ";
                    instance.getGraceTimeDuration().then(result => {
                        out += result;
                    });
                    instance.getCommitmentDuration().then(result => {
                        out += ", Commitment: " + result;
                    });
                    instance.getWithdrawalDuration().then(result => {
                        out += ", Withdrawal: " + result;
                    });
                    instance.getOpeningDuration().then(result => {
                        out = ", Opening: " + result;
                    });
                break;
                case 3: 
                    instance.getCommitmentStatus().then(result => {
                        out = "Commitment status: " + result;
                    });
                break;
                case 4:
                    instance.getReservePrice().then(result => {
                        out = "Reserve Price is: " + result;
                    });
                    instance.getDeposit().then(result => {
                        out += " and deposit is: " + result;
                    });
                break;
            }
            $("#getterResult").html(out);
        })
    },
    getD: function(code) {
        App.contracts["DutchAuction"].deployed().then(async(instance) =>{
            let out;
            switch(code){
                case 1: 
                    instance.getCurrentPhase().then(result => {
                        out = "Phase: " + result;
                    });
                break;
                case 2: 
                    instance.getDuration().then(result => {
                        out = "Duration: " + result;
                    });
                break;
                case 3: 
                    instance.getStartPrice().then(result => {
                        out = "Start price is " + result;
                    });
                    instance.getReservePrice().then(result => {
                        out += " and reserve is " + result;
                    });
                break;
                case 4: 
                    instance.getCurrentPrice().then(result => {
                        out = "Current price: " + result;
                    });
                break;
                case 5: 
                    instance.getDecreaseLogicDescription().then(result => {
                        out = "Decrease logic is " + result;
                    });
                break;
            }
            $("#getterResult").html(out);
        })
    },
    callerV: function(code) {
        let out;
        switch(code){
            case 1:
                instance.updateCurrentPhase().then(result => {
                    out = result;
                });
            break;
            case 2:
                instance.createAuction($("createInput")).then(result => {
                    out = result;
                });
            break;
            case 3:
                instance.finalize().then(result => {
                    out = result;
                });
            break;
            case 4:
                addr = web3.eth.accounts[0];
                amount = $("valueIn");
                nonce = Math.floor(Math.random() * 10000);
                instance.getKeccak(nonce, amount).then(result => {
                    hash = result;
                });
                App.hashesAndNonces[addr] = [hash, nonce];
                instance.bid(hash, {from: addr, gas: 3000000, value: amount}).then(result => {
                    out = result;
                });
            break;
            case 5:
                // withdraw
                instance.withdraw({from: web3.eth.accounts[0]}).then(result => {
                    out = result;
                });
            break;
            case 6:
                addr = web3.eth.accounts[0];
                hash = App.hashesAndNonces[addr][0];
                nonce = App.hashesAndNonces[addr][1];
                remove(App.hashesAndNonces[addr]);
                instance.open(nonce, {from: addr}).then(result => {
                    out = result;
                });
            break;
        }
        $("#methodResult").html(out);
    },
    callerD: function(code) {
        let out;
        switch(code){
            case 1:
                // create auction (parameter)
            break;
            case 2: 
                // check auction ended
            break;
            case 3:
                // bid 
            break;
        }
        $("#methodResult").html(out);
    },
    refreshV: function(){
        //TODO
        // currentWinner
        // ownerAddr
        // AuctAddr
    },
    refreshD: function() {
        //TODO
        // currentPrice
        // ownerAddr
        // AuctAddr
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