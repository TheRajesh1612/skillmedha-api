// services/agora-service/agoraUtil.js
require("dotenv").config({
  path: "../../../.env",
});
const { RtcTokenBuilder, RtcRole } = require('agora-access-token');

const APP_ID = process.env.AGORA_APP_ID;
const APP_CERT = process.env.AGORA_APP_CERTIFICATE;

/**
 * Build an Agora token for a specific UID.
 * @param {String} channelName
 * @param {Number} uid - numeric Agora UID
 * @param {'publisher'|'subscriber'} role
 * @param {Number} ttlSeconds
 * @returns {String} token
 */
function buildToken(channelName, uid, role = 'subscriber', ttlSeconds = 3 * 60 * 60) {
  const agoraRole = role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
  const now = Math.floor(Date.now() / 1000);
  const privilegeExpires = now + ttlSeconds;

  return RtcTokenBuilder.buildTokenWithUid(
    APP_ID,
    APP_CERT,
    channelName,
    uid,
    agoraRole,
    privilegeExpires
  );
}

module.exports = { APP_ID, buildToken };
