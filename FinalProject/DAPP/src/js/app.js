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
                instance.AuctionBegins({
                    fromBlock: 0,
                    toBlock: 'latest'
                }, function(error, event) {
                    console.log(event);
                    $('#eventSink').html("Auction Begins");
                    $('#eventData').html("Grace Time: " + event.args.graceTime.toNumber() + 
                                        "<br>Reserve Price: " + event.args.reservePrice.toNumber() +
                                        "<br>Deposit Requirement: " + event.args.depositRequirement.toNumber());
                    spamButton();
                });

                instance.AuctionEnded({
                    fromBlock: 0,
                    toBlock: 'latest'
                }, function(error, event) {
                    console.log(event);
                    $('#eventSink').html("Auction Ended");
                    $('#eventData').html("Winner: " + event.args.winner + 
                                        "<br>Amount: " + event.args.amount);
                    spamButton();
                });

                instance.GraceTimeOver({
                    fromBlock: 0,
                    toBlock: 'latest'
                }, function(error, event) {
                    console.log(event);
                    $('#eventSink').html("Grace Time is Over");
                    $('#eventData').html("Commitment Duration: " + event.args.commitmentDuration.toNumber() + 
                                        "<br>Reserve Price: " + event.args.reservePrice.toNumber() +
                                        "<br>Deposit Requirement: " + event.args.depositRequirement.toNumber());
                    spamButton();
                });

                instance.CommitmentOver({
                    fromBlock: 0,
                    toBlock: 'latest'
                }, function(error, event) {
                    console.log(event);
                    $('#eventSink').html("Commitment Phase is Over");
                    $('#eventData').html("Withdrawal Duration: " + event.args.withdrawalDuration.toNumber() + 
                                        "<br>Number of bidders: " + event.args.liveBidders.toNumber());                    spamButton();
                });

                instance.WithdrawalOver({
                    fromBlock: 0,
                    toBlock: 'latest'
                }, function(error, event) {
                    console.log(event);
                    $('#eventSink').html("Withdrawal Phase is Over");
                    $('#eventData').html("Opening Duration: " + event.args.openingDuration.toNumber() + 
                                        "<br>Number of bidders " + event.args.liveBidders.toNumber());
                    spamButton();
                });

                instance.NewCommitment({
                    fromBlock: 0,
                    toBlock: 'latest'
                }, function(error, event) {
                    console.log(event);
                    $('#eventSink').html("New Bidder Commitment");
                    $('#eventData').html("Address: " + event.args.bidder + 
                                        "<br>Number of bidders: " + event.args.liveBidders.toNumber());
                    spamButton();
                });

                instance.NewWithdrawal({
                    fromBlock: 0,
                    toBlock: 'latest'
                }, function(error, event) {
                    console.log(event);
                    $('#eventSink').html("There was a withdraw");
                    $('#eventData').html("Address: " + event.args.withdrawer + 
                                        "<br>Number of bidders: " + event.args.liveBidders.toNumber());
                    spamButton();
                });

                instance.NewLeader({
                    fromBlock: 0,
                    toBlock: 'latest'
                }, function(error, event) {
                    console.log(event);
                    $('#eventSink').html("New (temporary) winner");
                    $('#eventData').html("Current Winner: " + event.args.currentWinner + 
                                        "<br>Top Payment until now: " + event.args.topPayment.toNumber());
                    spamButton();
                });
            });
            return App.renderDutch();
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
            var accounts =  await web3.eth.getAccounts();
            addr = accounts[0];
            switch(code){
                case 1:
                    gasLimit = $("#gasLimit").val();
                    instance.updateCurrentPhase({from: addr, gas: gasLimit}).then(result => {
                        console.log(result);
                        $("#methodResult").html("Success");
                    });
                break;
                case 2:
                    auct = $("createInput").val();
                    instance.createAuction(auct, {from: addr}).then(result => {
                        out = result;
                        $("#methodResult").html(out);
                    });
                break;
                case 3:
                    instance.finalize({from: addr}).then(result => {
                        out = result;
                        $("#methodResult").html(out);
                    });
                break;
                case 4:
                    amount = $("valueIn");
                    gasLimit = $("gasLimit");
                    nonce = Math.floor(Math.random() * 10000);
                    instance.getKeccak(nonce, amount).then(result => {
                        hash = result;
                        App.hashesAndNonces[addr] = [hash, nonce];
                        instance.bid(hash, {from: addr, gas: gasLimit, value: amount}).then(result => {
                            out = result;
                            $("#methodResult").html(out);
                        });
                    });
                break;
                case 5:
                    // withdraw
                    instance.withdraw({from: addr}).then(result => {
                        out = result;
                        $("#methodResult").html(out);
                    });
                break;
                case 6:
                    hash = App.hashesAndNonces[addr][0];
                    nonce = App.hashesAndNonces[addr][1];
                    remove(App.hashesAndNonces[addr]);
                    instance.open(nonce, {from: addr}).then(result => {
                        out = result;
                        $("#methodResult").html(out);
                    });
                break;
            }
        });
    },
    refreshV: function(){
        App.contracts["VickreyAuction"].deployed().then(async(instance) => {
            instance.getCurrentWinner().then(result => {
                if(result === "0x0000000000000000000000000000000000000000")
                    $("#currentWinner").html("None");
                else
                    $("#currentWinner").html(result);
            });
            instance.getOwner().then(result => {
                    $("#ownerAddr").html(result);
            });
            instance.getAuctioneer().then(result => {
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
                instance.AuctionBegins({
                    fromBlock: 0,
                    toBlock: 'latest'
                }, function(error, event) {
                    console.log(event);
                    $('#eventSink').html("Auction Begins");
                    $('#eventData').html("Start Price: " + event.args.startPrice.toNumber() + 
                                        "<br>Reserve Price: " + event.args.reservePrice.toNumber() +
                                        "<br>duration: " + event.args.duration.toNumber());
                    spamButton();
                });

                instance.AuctionEnded({
                    fromBlock: 0,
                    toBlock: 'latest'
                }, function(error, event) {
                    console.log(event);
                    $('#eventSink').html("Auction Ended");
                    $('#eventData').html("Winner: " + event.args.winner + 
                                        "<br>Amount: " + event.args.amount);
                    spamButton();
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
        App.contracts["DutchAuction"].deployed().then(async(instance) =>{
            var accounts =  await web3.eth.getAccounts();
            addr = accounts[0];
            gasLimit = $("#gasLimit").val();
            switch(code){
                case 1:
                    auctAddr = $("#auctAddrIn").val();
                    if(auctAddr) {
                        instance.methods['createAuction(address)'](auctAddr, {from: addr, gas: gasLimit}).then(result => {
                            console.log(result);
                            $("#methodResult").html("Success");
                        }).catch(function(error) {
                            console.log(error);
                            if((error+"").search(/have the correct nonce/))
                                $("#methodResult").html("<p style='color:red'>Error: incorrect nonces for your account</p>");
                            else
                                $("#methodResult").html("<p style='color:red'>Error, are you the owner?</p>");
                        });
                    } else {
                        instance.methods['createAuction()']({from: addr, gas: gasLimit}).then(result => {
                            console.log(result);
                            $("#methodResult").html("Success");
                        }).catch(function(error) {
                            console.log(error);
                            if((error+"").search(/have the correct nonce/))
                                $("#methodResult").html("<p style='color:red'>Error: incorrect nonces for your account</p>");
                            else
                                $("#methodResult").html("<p style='color:red'>Error, are you the owner?</p>");
                        });
                    }
                break;
                case 2: 
                    instance.checkIfAuctionEnded({from: addr, gas: gasLimit}).then(result => {
                        console.log(result);
                        $("#methodResult").html("Success");
                    }).catch(function(error) {
                        console.log(error);
                        if((error+"").search(/have the correct nonce/))
                            $("#methodResult").html("<p style='color:red'>Error: incorrect nonces for your account</p>");
                        else
                            $("#methodResult").html("<p style='color:red'>Error: Forbidden method. Are you the auctioneer?</p>");
                    });
                break;
                case 3:
                    amount = $("#bidAmountIn").val();
                    if(amount) {
                        instance.bid({from: addr, gas: gasLimit, value: amount}).then(result => {
                            console.log(result);
                            $("#methodResult").html("Success");
                        }).catch(function(error) {
                            console.log(error);
                            if((error+"").search(/have the correct nonce/))
                                $("#methodResult").html("<p style='color:red'>Error: incorrect nonces for your account</p>");
                            else
                                $("#methodResult").html("<p style='color:red'>Error: Your bid was incorrect</p>");
                        });
                    } else
                    $("#methodResult").html("<p style='color:red'>Error: Need a bidding value as parameter!</p>");
                break;
            }
        });
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
                        out = "Duration is " + result + " blocks";
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
                    }).catch(function() {
                        $("#getterResult").html("<p style=\"color:red;\">Wrong phase to call current Price</p>");
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
        App.contracts["DutchAuction"].deployed().then(async(instance) => {
            instance.getCurrentPrice().then(result => {
                $("#currentPrice").html(result.toNumber());
            }).catch(function() {
                $("#currentPrice").html("None");
            });
            instance.getOwner().then(result => {
                    $("#ownerAddr").html(result);
            });
            instance.getAuctioneer().then(result => {
                if(result === "0x0000000000000000000000000000000000000000")
                    $("#auctAddr").html("None");
                else
                    $("#auctAddr").html(result);
            });
        });
    }
}

spamButton = function() {
    $("#newSpam").fadeIn().delay(2000).fadeOut();
}