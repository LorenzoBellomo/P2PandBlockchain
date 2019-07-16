// filename: js/App.js

App = {
    contracts: {}, // Store contract abstractions
    commitments: {}, // store the couples (amount, nonce) for the commitments in the vickrey auction
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
        // At this point I have to initialize/render the vickrey or the dutch auction
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
            return App.listenForEventsV(); // the V stands for vickrey
        });
    },
    listenForEventsV: function() {
        // Vickrey event listener (of course they are different with the dutch ones)
        App.contracts["VickreyAuction"].deployed().then(async (instance) => {
            // All the listeners just set some field in the UI, nothing interesting
            web3.eth.getBlockNumber(function (error, block) {
                // first event is fired whenever an auction begins
                instance.AuctionBegins({
                    fromBlock: 0,
                    toBlock: 'latest'
                }, function(error, event) {
                    // attached data
                    console.log(event);
                    $('#eventSink').html("Auction Begins");
                    $('#eventData').html("Grace Time: " + event.args.graceTime.toNumber() + 
                                        "<br>Reserve Price: " + event.args.reservePrice.toNumber() +
                                        "<br>Deposit Requirement: " + event.args.depositRequirement.toNumber());
                    spamButton();
                });

                // next event is fired whenever and auction ends
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

                // this is fired when grace time ends. Consider that more than one phase switch may be 
                // triggered by a single command (on a real blockchain, this happens because of the block
                // time measure chosen)
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
                // End of the phase switch related events, each event of these carries the duration of the next
                // phase as payload

                // Below are the 3 bid related events
                // the first one (new Commitment) is fired whenever someone makes a bid(commitment phase)     
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

                // New Withdrawal gets fired whenever someone withdraws the auction (during withdrawal phase)
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

                // New leader is fired during the opening phase, and it happens when a new opening
                // has revealed the highest bid (yet). So the event is not a winner declaration.
                instance.NewLeader({
                    fromBlock: 0,
                    toBlock: 'latest'
                }, function(error, event) {
                    console.log(event);
                    $('#eventSink').html("New (temporary) winner");
                    $('#eventData').html("Current Winner: " + event.args.currentWinner + 
                                        "<br>Top Payment until now: " + event.args.topPayment.toNumber());
                    $('#currentWinner').html(event.args.currentWinner);
                    spamButton();
                });
            });
            // End listeners
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
        // Caller for the getter methods found in the dropdown menu
        // depending on parameter code a different getter method is called
        // the result of the single getter methods is put in the getter field
        var addr = web3.eth.accounts[0];
        App.contracts["VickreyAuction"].deployed().then(async(instance) => {
            switch(code){
                case 1: 
                    // ask the contract the current phase
                    // it returns a descriptive string
                    instance.getCurrentPhase({from: addr}).then(result => {
                        out = result;
                        $("#getterResult").html(out);
                    });
                break;
                case 2: 
                    // ask every phase duration to the contract
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
                    // ask if the contract has a commitment from my address, and display 
                    // the information it returns (it's a descriptive string)
                    instance.getMyCommitmentStatus({from: addr}).then(result => {
                        out = "Your commitment status is: <br>\"" + result + "\"";
                        $("#getterResult").html(out);
                    });
                break;
                case 4:
                    // ask reserve price and deposit
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
        // Wrapper for all the calls to the main methods in the vickrey contract
        App.contracts["VickreyAuction"].deployed().then(async(instance) =>{
            var accounts =  await web3.eth.getAccounts();
            addr = accounts[0];
            // I get the metamask first address, and the gas limit specified by the user
            gasLimit = $("#gasLimit").val();
            // Now I choose which main method has to be called
            switch(code){
                case 1:
                    // Update current phase (in case of local testing, this is the function that is
                    // used to mine a virtual block)
                    instance.updateCurrentPhase({from: addr, gasLimit: gasLimit}).then(result => {
                        console.log(result);
                        instance.getCurrentPhase({from: addr}).then(result => {
                            $("#methodResult").html(result);
                        });
                    });
                break;
                case 2:
                    // the owner uses this method to create the auction (start the grace time)
                    auctAddr = $("#auctAddrIn").val();
                    if(auctAddr) {
                        instance.methods['createAuction(address)'](auctAddr, {from: addr, gas: gasLimit}).then(result => {
                            console.log(result);
                            $("#methodResult").html("Success");
                        }).catch(function(error) {
                            console.log(error);
                            err = error.message.split("Error: VM Exception while processing transaction: revert")[1];
                            $("#methodResult").html("<p style='color:red'>Error: " + err + "</p>");
                        });
                    } else {
                        // overloaded method, in this case the owner becomes also the auctioneer
                        instance.methods['createAuction()']({from: addr, gas: gasLimit}).then(result => {
                            console.log(result);
                            $("#methodResult").html("Success");
                        }).catch(function(error) {
                            console.log(error);
                            err = error.message.split("Error: VM Exception while processing transaction: revert")[1];
                            $("#methodResult").html("<p style='color:red'>Error: " + err + "</p>");
                        });
                    }
                break;
                case 3:
                    // finalize is called by the owner at the end of the vickrey auction 
                    instance.finalize({from: addr, gas: gasLimit}).then(result => {
                        console.log(result);
                        instance.isFinalized().then(result => {
                            if(result) 
                                $("#methodResult").html("Correctly Finalized");
                            else {
                                $("#methodResult").html("<p style='color:red'>Error: Not Finalized (This method might have failed because you are not the owner, or because it was called too early)</p>");
                            }
                        });
                    });
                break;
                case 4:
                    // Bid takes as input the value of the bid. The auction does not pay this amount (for now), 
                    // but delays this payment to the opening phase. This wrapper stores (in App.commitments)
                    // the amount passed as parameter and the nonce generated at random. It then bids paying the 
                    // deposit price
                    amount = $("#weiIn").val();
                    if(amount) {
                        // I have an input, so I can proceed
                        // Generate nonce randomly
                        nonce = Math.floor(Math.random() * 10000);
                        // compute hash through contract call
                        hash = await instance.getKeccak(nonce, amount, {});
                        // ask the contract the reserve price, since I have to pay it now
                        reservePrice = await instance.getReservePrice();
                        // save this commitment for later use (when the user clicks on open)
                        App.commitments[addr] = [amount, nonce];
                        // Make the bid
                        instance.bid(hash, {from: addr, gas: gasLimit, value: reservePrice.toNumber()}).then(result => {
                            console.log(result);
                            instance.getMyCommitmentStatus().then(result => {
                                // ask the contract if the bid succeded
                                if(result === "This commitment is valid and not opened yet") 
                                    $("#methodResult").html("Success: Bid placed");
                                else 
                                    $("#methodResult").html("<p style='color:red'>Error: The commitment failed (check phase)</p>");
                            });
                        });
                    } else {
                        $("#methodResult").html("<p style='color:red'>Error: Need a bidding value</p>");
                    }
                break;
                case 5:
                    // This method simply calls the withdraw one from the contract
                    instance.withdraw({from: addr, gas: gasLimit}).then(result => {
                        instance.getMyCommitmentStatus().then(result => {
                            if(result === "This commitment was withdrawn") 
                                $("#methodResult").html("Success: Bid withdrawn");
                            else 
                                $("#methodResult").html("<p style='color:red'>Error: Failed to withdraw (check phase)</p>");
                        });
                    });
                break;
                case 6:
                    // This is the open method. It takes from the storage (App.commitments) the nonce and
                    // the bidding amount. At this point it pays amount and passes value as parameter to the
                    // contract function open.
                    amount = App.commitments[addr][0];
                    nonce = App.commitments[addr][1];
                    instance.open(nonce, {from: addr, gas: gasLimit, value: amount}).then(result => {
                        instance.getMyCommitmentStatus({from: addr}).then(result => {
                            console.log(result);
                            if(result === "This commitment is currently winning" || result === "This commitment was opened, but is not winning") 
                                $("#methodResult").html("Success: Bid opened");
                            else 
                                $("#methodResult").html("<p style='color:red'>Error: Failed to open (check phase)</p>");
                        });
                    });
                break;
                case 7: 
                    // red button callback, calls suicide method
                    console.log("Suicide operation begins");
                    instance.destroyContract({from: addr, gasLimit: gasLimit}).then(result => {
                        console.log(result);
                        $("#methodResult").html("Successfully killed the auction");
                    }).catch(function(error) {
                        console.log(error);
                        err = error.message.split("Error: VM Exception while processing transaction: revert")[1];
                        $("#methodResult").html("<p style='color:red'>Error: " + err + "</p>");
                    });
                break;
            }
        });
    },
    refreshV: function(){
        // Callback for the refresh button in the live auction info panel
        App.contracts["VickreyAuction"].deployed().then(async(instance) => {
            // ask current winner
            instance.getCurrentWinner().then(result => {
                if(result === "0x0000000000000000000000000000000000000000")
                    $("#currentWinner").html("None");
                else
                    $("#currentWinner").html(result);
            });
            // ask auction owner and auctioneer
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
        // Only two events are raised by this auction. One when the auction is created (not 
        // by means of the constructor, but by means of createAuction), and another when
        // it ends
        App.contracts["DutchAuction"].deployed().then(async (instance) => {
            web3.eth.getBlockNumber(function (error, block) {
                // Only two events are generated
                // One when the owner makes the auction begin
                instance.AuctionBegins({
                    fromBlock: 0,
                    toBlock: 'latest'
                }, function(error, event) {
                    console.log(event);
                    $('#eventSink').html("Auction Begins");
                    $('#eventData').html("Start Price: " + event.args.startPrice.toNumber() + 
                                        "<br>Reserve Price: " + event.args.reservePrice.toNumber() +
                                        "<br>duration: " + event.args.duration.toNumber());
                    $("#currentPrice").html(event.args.startPrice.toNumber());
                    spamButton();
                });

                // One when the auction ends (timeout, so with no winner or with a bidding winner)
                instance.AuctionEnded({
                    fromBlock: 0,
                    toBlock: 'latest'
                }, function(error, event) {
                    console.log(event);
                    $('#eventSink').html("Auction Ended");
                    $('#eventData').html("Winner: " + event.args.winner + 
                                        "<br>Amount: " + event.args.amount);
                    $("#currentPrice").html("None");
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
        // Wrapper for all the main contract calls made by the interface.
        App.contracts["DutchAuction"].deployed().then(async(instance) => {
            var accounts =  await web3.eth.getAccounts();
            addr = accounts[0];
            gasLimit = $("#gasLimit").val();
            switch(code){
                case 1:
                    // Owner method, the owner creates the auction specifying the address of the auctioneer
                    auctAddr = $("#auctAddrIn").val();
                    if(auctAddr) {
                        instance.methods['createAuction(address)'](auctAddr, {from: addr, gas: gasLimit}).then(result => {
                            console.log(result);
                            $("#methodResult").html("Success");
                        }).catch(function(error) {
                            console.log(error);
                            err = error.message.split("Error: VM Exception while processing transaction: revert")[1];
                            $("#methodResult").html("<p style='color:red'>Error: " + err + "</p>");
                        });
                    } else {
                        // parameter-less overload, the owner becomes the auctioneer too
                        instance.methods['createAuction()']({from: addr, gas: gasLimit}).then(result => {
                            console.log(result);
                            $("#methodResult").html("Success");
                        }).catch(function(error) {
                            console.log(error);
                            err = error.message.split("Error: VM Exception while processing transaction: revert")[1];
                            $("#methodResult").html("<p style='color:red'>Error: " + err + "</p>");
                        });
                    }
                break;
                case 2: 
                    // Method used by the auctioneer to check if the auction has ended with no winner.
                    instance.checkIfAuctionEnded({from: addr, gas: gasLimit}).then(result => {
                        console.log(result);
                        instance.isEnded().then(result => {
                            out = (result)? "Auction is ended" : "Auction is NOT ended";
                            $("#methodResult").html(out);
                        });
                    }).catch(function(error) {
                        console.log(error);
                        err = error.message.split("Error: VM Exception while processing transaction: revert")[1];
                        $("#methodResult").html("<p style='color:red'>Error: " + err + "</p>");
                    });
                break;
                case 3:
                    // This method is used to make a bid
                    amount = $("#bidAmountIn").val();
                    if(amount) {
                        instance.bid({from: addr, gas: gasLimit, value: amount}).then(result => {
                            console.log(result);
                            $("#methodResult").html("Success");
                        }).catch(function(error) {
                            console.log(error);
                            err = error.message.split("Error: VM Exception while processing transaction: revert")[1];
                            $("#methodResult").html("<p style='color:red'>Error: " + err + "</p>");
                        });
                    } else
                        $("#methodResult").html("<p style='color:red'>Error: Need a bidding value as parameter!</p>");
                break;
                case 4: 
                    // This case calls the suicide operation in the contract
                    console.log("Suicide operation begins");
                    instance.destroyContract({from: addr, gasLimit: gasLimit}).then(result => {
                        console.log(result);
                        $("#methodResult").html("Successfully killed the auction");
                    }).catch(function(error) {
                        console.log(error);
                            err = error.message.split("Error: VM Exception while processing transaction: revert")[1];
                            $("#methodResult").html("<p style='color:red'>Error: " + err + "</p>");
                    });
                break;
            }
        });
    },
    getD: function(code) {
        // Wrapper for the getters (view methods in the smart contract). It wraps the ones provided 
        // by the dropdown menu in the UI
        App.contracts["DutchAuction"].deployed().then(async(instance) =>{
            switch(code){
                case 1: 
                    // ask current phase
                    instance.getCurrentPhase().then(result => {
                        out = result;
                        $("#getterResult").html(out);
                    });
                break;
                case 2: 
                    // ask contract duration
                    instance.getDuration().then(result => {
                        out = "Duration is " + result + " blocks";
                        $("#getterResult").html(out);
                    });
                break;
                case 3: 
                    // ask start and reserve price
                    instance.getStartPrice().then(result => {
                        out = "Start price -> " + result;
                        instance.getReservePrice().then(result => {
                            out += "<br> Reserve price -> " + result;
                            $("#getterResult").html(out);
                        });
                    });
                break;
                case 4: 
                    // ask current price, this method mught fail if called during grace period
                    // or when the auction is over
                    instance.getCurrentPrice().then(result => {
                        out = "Current price is " + result;
                        $("#getterResult").html(out);
                        $("#currentPrice").html(out);
                    }).catch(function() {
                        $("#getterResult").html("<p style=\"color:red;\">Wrong phase to call current Price</p>");
                    });
                break;
                case 5: 
                    // Ask for the description (linear/logarithmic/exponential)
                    instance.getDecreaseLogicDescription().then(result => {
                        out = "Decrease logic is " + result;
                        $("#getterResult").html(out);
                    });
                break;
            }
        })
    },
    refreshD: function() {
        // Callback for the refresh button placed inside the live auction status div
        App.contracts["DutchAuction"].deployed().then(async(instance) => {
            instance.getCurrentPrice().then(result => {
                // ask current price
                $("#currentPrice").html(result.toNumber());
            }).catch(function() {
                // remember current price might fail if called in wrong phase
                $("#currentPrice").html("None");
            });
            instance.getOwner().then(result => {
                // ask owner
                $("#ownerAddr").html(result);
            });
            // ask auctioneer
            instance.getAuctioneer().then(result => {
                if(result === "0x0000000000000000000000000000000000000000")
                    $("#auctAddr").html("None");
                else
                    $("#auctAddr").html(result);
            });
        });
    }
}

// This method makes a "new" png appear and disappear after 5 seconds whenever and event is receiver
spamButton = function() {
    $("#newSpam").fadeIn().delay(5000).fadeOut();
}