App = {
    // Attributes
    init: function() { return App.initWeb3(); },
    // Functions
}

// Call init whenever the window loads
$(function() {
    $(window).on('load', function () {
        App.init();
    });
});