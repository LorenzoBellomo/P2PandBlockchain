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
        return App.initContract();
    },
    initContract: function() {
        // Load content's abstractions
        $.getJSON("MyContract.json").done(function(c) {
            App.contracts["MyContract"] = TruffleContract(c);
            App.contracts["MyContract"].setProvider(App.web3Provider);
            return App.listenForEvents();
        });
    },
    listenForEvents: function() {
        App.contracts["MyContract"].deployed().then(async (instance) => {
            web3.eth.getBlockNumber(function (error, block) {
            // click is the Solidity event
            instance.click().on('data', function (event) {
                $("#eventId").html("Event catched!");
                    console.log("Event catched");
                    console.log(event);
                    // If event has parameters: event.returnValues.valueName
                });
            });
        });
        return App.render();
    },
    render: function() { /* Render page */ }
}

// Call init whenever the window loads
$(function() {
    $(window).on('load', function () {
        App.init();
    });
});