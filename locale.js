/**
 * Created by Anton on 24.02.2017.
 */
"use strict";
var Locale = function (options) {
    this.gOptions = options;
    this.language = this.default;
    this.onReady = this.init();
};

Locale.prototype.default = {
    "help": "Hi! I will notify you about new videos on Youtube channels!",
    "emptyServiceList": "You don't have channels in watch list, yet.",
    "enterChannelName": "Enter the channel URL or name (example: blacksilverufa):",
    "enterService": "Enter a video platform",
    "channelExists": "This channel already exists!",
    "channelAdded": "Success! Channel {channelName} added!",
    "telegramChannelEnter": "Enter the channel name (example: @telegram):",
    "telegramChannelError": "Oops! I can't add channel {channelName}!",
    "commandCanceled": "The command {command} has been cancelled.",
    "channelDontExist": "Oops! Can't find channel in watch list!",
    "channelDeleted": "Success! Channel {channelName} deleted!",
    "cleared": "Success! The channel list has been cleared.",
    "channelNameIsEmpty": "Oops! Channel name is empty!",
    "selectDelChannel": "Select the channel that you want to delete",
    "channelIsNotFound": "Oops! Channel {channelName} is not found!",
    "clearSure": "Are you sure?",
    "users": "Users: {count}",
    "channels": "Channels: {count}",
    "preview": "preview",
    "rateMe": [
        "", "",
        "⭐️ If you like this bot, please rate us 5 stars in store:",
        "https://telegram.me/storebot?start=ytwatchbot"
    ],
    "groupNote": ["", "Note for groups: Use \"Reply\" to send a answer."]
};

Locale.prototype.init = function () {
    var _this = this;
    return Promise.resolve().then(function () {
        Object.keys(_this.language).forEach(function (key) {
            var line = _this.language[key];
            if (Array.isArray(line)) {
                line = line.join('\n');
            }
            _this.language[key] = line;
        });
    });
};

module.exports = Locale;