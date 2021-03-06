const Encoder = require('../../../encoder')
const { JoinGroup: apiKey } = require('../../apiKeys')

/**
 * JoinGroup Request (Version: 0) => group_id session_timeout member_id protocol_type [group_protocols]
 *   group_id => STRING
 *   session_timeout => INT32
 *   member_id => STRING
 *   protocol_type => STRING
 *   group_protocols => protocol_name protocol_metadata
 *     protocol_name => STRING
 *     protocol_metadata => BYTES
 */

module.exports = ({ groupId, sessionTimeout, memberId, protocolType, groupProtocols }) => ({
  apiKey,
  apiVersion: 0,
  apiName: 'JoinGroup',
  encode: async () => {
    return new Encoder()
      .writeString(groupId)
      .writeInt32(sessionTimeout)
      .writeString(memberId)
      .writeString(protocolType)
      .writeArray(groupProtocols.map(encodeGroupProtocols))
  },
})

const encodeGroupProtocols = ({ name, metadata = {} }) => {
  const protocolMetadata = new Encoder().writeInt16(metadata.version || 0)
  return new Encoder().writeString(name).writeBytes(protocolMetadata.buffer)
}
