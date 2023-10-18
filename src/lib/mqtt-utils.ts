import { isIPv6 } from 'node:net'

export const MqttUtils = {
    buildFullTopic: function (fullTopic: string, topic: string, prefix: string, command?: string) {
        let result = fullTopic

        result = result.replace('%topic%', topic)
        result = result.replace('%prefix%', prefix)
        result += result.endsWith('/') ? '' : '/'

        if (command !== undefined && command !== null) {
            result += command
        }

        return result
    },

    matchesMqttTopic(topic: string, subscribedTopic: string) {
        if (subscribedTopic === '#' || subscribedTopic === topic) {
            return true
        }
        const regex = new RegExp(
            '^' +
                subscribedTopic
                    .replace(/([\[\]\?\(\)\\\\$\^\*\.|])/g, '\\$1')
                    .replace(/\+/g, '[^/]+')
                    .replace(/\/#$/, '(/.*)?') +
                '$'
        )
        return regex.test(topic)
    },

    getBrokerUrl(address: string, port: string | number = '', useTls: boolean = false) {
        let brokerUrl = ''
        let brokerPort = port ? port : 1883

        if (address.indexOf('://') > -1) {
            brokerUrl = address
        } else {
            brokerUrl = useTls ? 'mqtts://' : 'mqtt://'

            if (address !== '') {
                brokerUrl += isIPv6(address) ? '[' + address + ']' : address
            } else {
                brokerUrl += 'localhost'
            }

            brokerUrl += ':' + brokerPort
        }

        return brokerUrl
    },
}
