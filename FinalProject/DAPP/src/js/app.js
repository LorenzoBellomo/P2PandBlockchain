App = {
    contracts: {}, // Store contract abstractions
    hashesAndNonces: {},
    web3Provider: null, // Web3 provider
    url: 'http://localhost:7545', // Url for web3
    init: function(type) { return App.initWeb3(type); },
    initWeb3: function(type) {
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
        if(type==1)
            return App.initVickrey();
        else
            return App.initDutch();
    },
    initVickrey: function() {
        // Load content's abstractions
        $.getJSON("VickreyAuction.json").done(function(c) {
            App.contracts["VickreyAuction"] = TruffleContract(c);
            App.contracts["VickreyAuction"].setProvider(App.web3Provider);
            return App.listenForEventsV();
        });
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
                instance.GraceTimeOver().on('data', function (event) {
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
                    $("#currentWinner").html(event.returnValues.currentWinner);
                });
            });
            return App.renderVickrey();
        });
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
    getV: function(code) {
        var addr = web3.eth.accounts[0];
        App.contracts["VickreyAuction"].deployed().then(async(instance) => {
            switch(code){
                case 1: 
                    instance.getCurrentPhase({from: addr}).then(result => {
                        out = result;
                        $("#getterResult").html(out);
                    });
                break;
                case 2: 
                    out = "Grace -> ";
                    instance.getGraceTimeDuration({from: addr}).then(result => {
                        out += result;
                        instance.getCommitmentDuration({from: addr}).then(result => {
                            out += "<br>Commitment -> " + result.toNumber();
                            instance.getWithdrawalDuration({from: addr}).then(result => {
                                out += "<br>Withdrawal -> " + result.toNumber();
                                instance.getOpeningDuration({from: addr}).then(result => {
                                    out += "<br>Opening -> " + result.toNumber() + " <br>[time is expressed in blocks]";
                                    $("#getterResult").html(out);
                                });
                            });
                        });
                    });
                break;
                case 3: 
                    instance.getMyCommitmentStatus({from: addr}).then(result => {
                        out = "Your commitment status is: <br>\"" + result + "\"";
                        $("#getterResult").html(out);
                    });
                break;
                case 4:
                    instance.getReservePrice({from: addr}).then(result => {
                        out = "Reserve Price -> " + result.toNumber();
                        instance.getDeposit({from: addr}).then(result => {
                            out += "<br>Deposit -> " + result.toNumber();
                            $("#getterResult").html(out);
                        });
                    });
                break;
            }
        })
    },
    callerV: function(code) {
        App.contracts["VickreyAuction"].deployed().then(async(instance) =>{
            addr = web3.eth.accounts[0];
            let out;
            switch(code){
                case 1:
                    instance.updateCurrentPhase({from: addr}).then(result => {
                        out = result;
                    });
                break;
                case 2:
                    instance.createAuction($("createInput"), {from: addr}).then(result => {
                        out = result;
                    });
                break;
                case 3:
                    instance.finalize({from: addr}).then(result => {
                        out = result;
                    });
                break;
                case 4:
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
                    instance.withdraw({from: addr}).then(result => {
                        out = result;
                    });
                break;
                case 6:
                    hash = App.hashesAndNonces[addr][0];
                    nonce = App.hashesAndNonces[addr][1];
                    remove(App.hashesAndNonces[addr]);
                    instance.open(nonce, {from: addr}).then(result => {
                        out = result;
                    });
                break;
            }
            $("#methodResult").html(out);
        });
    },
    refreshV: function(){
        var addr = web3.eth.accounts[0];
        App.contracts["VickreyAuction"].deployed().then(async(instance) => {
            instance.getCurrentWinner({from: addr}).then(result => {
                if(result === "0x0000000000000000000000000000000000000000")
                    $("#currentWinner").html("None");
                else
                    $("#currentWinner").html(result);
            });
            instance.getOwner({from: addr}).then(result => {
                    $("#ownerAddr").html(result);
            });
            instance.getAuctioneer({from: addr}).then(result => {
                if(result === "0x0000000000000000000000000000000000000000")
                    $("#auctAddr").html("None");
                else
                    $("#auctAddr").html(result);
            });
        });
    },
    initDutch: function() {
        // Load content's abstractions
        $.getJSON("DutchAuction.json").done(function(c) {
            App.contracts["DutchAuction"] = TruffleContract(c);
            App.contracts["DutchAuction"].setProvider(App.web3Provider);
            return App.listenForEventsD();
        });
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
            return App.renderDutch();
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
    getD: function(code) {
        App.contracts["DutchAuction"].deployed().then(async(instance) =>{
            switch(code){
                case 1: 
                    instance.getCurrentPhase().then(result => {
                        out = result;
                        $("#getterResult").html(out);
                    });
                break;
                case 2: 
                    instance.getDuration().then(result => {
                        out = "Duration: " + result;
                        $("#getterResult").html(out);
                    });
                break;
                case 3: 
                    instance.getStartPrice().then(result => {
                        out = "Start price -> " + result;
                        instance.getReservePrice().then(result => {
                            out += "<br> Reserve price -> " + result;
                            $("#getterResult").html(out);
                        });
                    });
                break;
                case 4: 
                    instance.getCurrentPrice().then(result => {
                        out = "Current price is " + result;
                        $("#getterResult").html(out);
                    });
                break;
                case 5: 
                    instance.getDecreaseLogicDescription().then(result => {
                        out = "Decrease logic is " + result;
                        $("#getterResult").html(out);
                    });
                break;
            }
        })
    },
    refreshD: function() {
        var addr = web3.eth.accounts[0];
        App.contracts["DutchAuction"].deployed().then(async(instance) => {
            instance.getCurrentPrice({from: addr}).then(result => {
                $("#currentPrice").html(result.toNumber());
            });
            instance.getOwner({from: addr}).then(result => {
                    $("#ownerAddr").html(result);
            });
            instance.getAuctioneer({from: addr}).then(result => {
                if(result === "0x0000000000000000000000000000000000000000")
                    $("#auctAddr").html("None");
                else
                    $("#auctAddr").html(result);
            });
        });
    }
}

spamButton = function() {
    $(function() {
        $(".newSpam").fadeIn().delay(2000).fadeOut();
    });
}