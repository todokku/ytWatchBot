/**
 * Created by Anton on 18.12.2015.
 */
"use strict";
const debug = require('debug')('app:pubsub');
const pubSubHubbub = require("./vendor/pubsubhubbub");
const xmldoc = require("xmldoc");
const base = require("./base");
const qs = require('querystring');
const parallel = require('./tools/parallel');
const promiseLimit = require('promise-limit');

const tenLimit = promiseLimit(10);

class PushApi {
  constructor(/**Main*/main) {
    var _this = this;
    this.main = main;

    this.config = this.main.config.push;

    this.hubUrl = 'https://pubsubhubbub.appspot.com/subscribe';

    this.pubsub = pubSubHubbub.createServer(this.main.config.push);

    this.onReady = new Promise((resolve, reject) => {
      _this.initListener((err) => err ? reject(err) : resolve());
    });

    _this.main.events.on('subscribe', function (/*dbChannel[]*/channels) {
      if (!Array.isArray(channels)) {
        channels = [channels];
      }

      var now = base.getNow();

      const subscribeChannels = channels.filter(function (channel) {
        return channel.subscribeExpire < now;
      });

      parallel(10, subscribeChannels, (channel) => {
        return tenLimit(() => {
          var ytChannelId = _this.main.channels.unWrapId(channel.id);
          return _this.subscribe(ytChannelId).then(function () {
            // debug('[manual] (s) %s', channel.id);
            channel.subscribeExpire = now + (_this.config.leaseSeconds / 2);
            return _this.main.channels.updateChannel(channel.id, {
              subscribeExpire: channel.subscribeExpire
            });
          }).catch(function (err) {
            debug('Subscribe error! %s %o', channel.id, err);
          });
        });
      });
    });

    _this.main.events.on('unsubscribe', function (channelIds) {
      if (!Array.isArray(channelIds)) {
        channelIds = [channelIds];
      }

      parallel(10, channelIds, (channelId) => {
        return tenLimit(() => {
          const ytChannelId = _this.main.channels.unWrapId(channelId);
          return _this.unsubscribe(ytChannelId).then(function () {
            // debug('[manual] (u) %s', channelId);
            return _this.main.channels.updateChannel(channelId, {
              subscribeExpire: 0
            });
          }).catch(function (err) {
            debug('Unsubscribe error! %s %o', channelId, err);
          });
        });
      });
    });
  }

  getTopicUrl(channelId) {
    const url = 'https://www.youtube.com/xml/feeds/videos.xml';
    return url + '?' + qs.stringify({
      channel_id: channelId
    });
  }

  subscribe(channelId) {
    var _this = this;

    return new Promise(function (resolve, reject) {
      var topicUrl = _this.getTopicUrl(channelId);
      _this.pubsub.subscribe(topicUrl, _this.hubUrl, function (err, topic) {
        if (err) {
          reject(err);
        } else {
          // debug('Subscribe %s', channelId);
          resolve(topic);
        }
      });
    });
  }

  unsubscribe(channelId) {
    var _this = this;

    return new Promise(function (resolve, reject) {
      var topicUrl = _this.getTopicUrl(channelId);
      _this.pubsub.unsubscribe(topicUrl, _this.hubUrl, function (err, topic) {
        if (err) {
          reject(err);
        } else {
          // debug('Unsubscribed! %s', channelId);
          resolve(topic);
        }
      });
    });
  }

  initListener(callback) {
    var _this = this;
    var pubsub = this.pubsub;

    pubsub.on("listen", function () {
      callback();
    });

    pubsub.on('error', function (err) {
      callback(err);
      debug('Error', err);
    });

    pubsub.on('denied', function (err) {
      debug('Denied', err);
    });

    pubsub.on('feed', function (data) {
      try {
        var feed = _this.prepareData(data.feed.toString());
        _this.main.events.emit('feed', feed);
      } catch (err) {
        if (err.message === 'Entry is not found!') {
          return;
        }

        debug('Parse xml error!', err);
      }
    });

    this.pubsub.listen(_this.main.config.push.port);
  }

  prepareData(xml) {
    var document = new xmldoc.XmlDocument(xml);

    var getChildNode = function (root, name) {
      var el = null;
      if (!root || !root.children) {
        return el;
      }
      for (var i = 0, node; node = root.children[i]; i++) {
        if (node.name === name) {
          return node;
        }
      }
      return el;
    };

    var entry = getChildNode(document, 'entry');

    if (!entry) {
      var isDeletedEntry = !!getChildNode(document, 'at:deleted-entry');
      if (!isDeletedEntry) {
        debug('Unknown entry %j', document.toString({compressed: true}));
      }
      throw new Error('Entry is not found!');
    }

    var data = {};

    var success = ['yt:videoId', 'yt:channelId'].every(function (item) {
      var node = getChildNode(entry, item);
      if (!node) {
        return false;
      }

      data[item] = node.val;

      return !!data[item];
    });

    if (!success) {
      debug('XML read error! %j', document.toString({compressed: true}));
      throw new Error('XML read error!');
    }

    return data;
  }
}

module.exports = PushApi;