const Broker = require('./index')
const { secureRandom, createConnection } = require('testHelpers')

describe('Broker > OffsetFetch', () => {
  let topicName, groupId, seedBroker, broker, groupCoordinator

  beforeEach(async () => {
    topicName = `test-topic-${secureRandom()}`
    groupId = `consumer-group-id-${secureRandom()}`

    seedBroker = new Broker(createConnection())
    await seedBroker.connect()

    const metadata = await seedBroker.metadata([topicName])
    // Find leader of partition
    const partitionBroker = metadata.topicMetadata[0].partitionMetadata[0].leader
    const newBrokerData = metadata.brokers.find(b => b.nodeId === partitionBroker)

    // Connect to the correct broker to produce message
    broker = new Broker(createConnection(newBrokerData))
    await broker.connect()

    const { coordinator: { host, port } } = await seedBroker.findGroupCoordinator({ groupId })
    groupCoordinator = new Broker(createConnection({ host, port }))
    await groupCoordinator.connect()
  })

  afterEach(async () => {
    await seedBroker.disconnect()
    await broker.disconnect()
    await groupCoordinator.disconnect()
  })

  test('request', async () => {
    const produceData = [
      {
        topic: topicName,
        partitions: [
          {
            partition: 0,
            messages: [{ key: `key-0`, value: `some-value-0` }],
          },
        ],
      },
    ]

    await broker.produce({ topicData: produceData })
    const { generationId, memberId } = await groupCoordinator.joinGroup({
      groupId,
      sessionTimeout: 30000,
    })

    const groupAssignment = [
      {
        memberId,
        memberAssignment: { [topicName]: [0] },
      },
    ]

    await groupCoordinator.syncGroup({
      groupId,
      generationId,
      memberId,
      groupAssignment,
    })

    const topics = [
      {
        topic: topicName,
        partitions: [{ partition: 0 }],
      },
    ]

    const response = await groupCoordinator.offsetFetch({
      groupId,
      topics,
    })

    expect(response).toEqual({
      errorCode: 0,
      responses: [
        {
          partitions: [{ errorCode: 0, metadata: '', offset: '-1', partition: 0 }],
          topic: topicName,
        },
      ],
    })
  })
})
