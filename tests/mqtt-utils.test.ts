import { MqttUtils } from '../src/lib/mqtt-utils'

describe('MqttUtils', () => {
    test('buildFullTopic', () => {
        expect(MqttUtils.buildFullTopic('%topic%/%prefix%', 'topic', 'prefix')).toBe('topic/prefix/')
    })

    test('buildFullTopic with command', () => {
        expect(MqttUtils.buildFullTopic('%topic%/%prefix%', 'topic', 'prefix', 'cmd')).toBe('topic/prefix/cmd')
    })

    test('matchesMqttTopic with matching topic', () => {
        expect(MqttUtils.matchesMqttTopic('topic/prefix/cmd', 'topic/prefix/cmd')).toEqual(true)
    })

    test('matchesMqttTopic: Not matching topics', () => {
        expect(MqttUtils.matchesMqttTopic('topic/prefix/cmd', 'topic/prefix/arg')).toEqual(false)
    })

    test('matchesMqttTopic with topic matching wildcard topic', () => {
        expect(MqttUtils.matchesMqttTopic('topic/prefix/cmd', 'topic/prefix/#')).toEqual(true)
    })

    test('matchesMqttTopic with sub-topic matching wildcard topic', () => {
        expect(MqttUtils.matchesMqttTopic('topic/prefix/cmd/foo', 'topic/prefix/#')).toEqual(true)
    })

    test('getBrokerUrl with ipv4 no-tls', () => {
        expect(MqttUtils.getBrokerUrl('169.0.0.1', 1883, false)).toEqual('mqtt://169.0.0.1:1883')
    })

    test('getBrokerUrl with ipv4 tls', () => {
        expect(MqttUtils.getBrokerUrl('169.0.0.1', 1883, true)).toEqual('mqtts://169.0.0.1:1883')
    })

    test('getBrokerUrl with ipv6 no-tls', () => {
        expect(MqttUtils.getBrokerUrl('::1', 1883, false)).toEqual('mqtt://[::1]:1883')
    })

    test('getBrokerUrl with ipv6 tls', () => {
        expect(MqttUtils.getBrokerUrl('2001:0db8:85a3:0000:0000:8a2e:0370:7334', 1883, true)).toEqual(
            'mqtts://[2001:0db8:85a3:0000:0000:8a2e:0370:7334]:1883'
        )
    })

    test('getBrokerUrl with hostname no-tls', () => {
        expect(MqttUtils.getBrokerUrl('localhost', 1883, false)).toEqual('mqtt://localhost:1883')
    })
    test('getBrokerUrl with hostname tls', () => {
        expect(MqttUtils.getBrokerUrl('localhost', 1883, true)).toEqual('mqtts://localhost:1883')
    })

    test('getBrokerUrl with url no-tls', () => {
        expect(MqttUtils.getBrokerUrl('mqtt://localhost')).toEqual('mqtt://localhost')
    })
})
