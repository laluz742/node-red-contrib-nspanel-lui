import { NodeStatus, NodeStatusFill, StatusLevel } from '../types'

export class NSPanelNodeUtils {
    public static createNodeStatus(statusLevel: StatusLevel, msg: string): NodeStatus | null {
        var statusFill: NodeStatusFill

        switch (statusLevel) {
            case 'error':
                statusFill = 'red'
                break
            case 'warn':
                statusFill = 'yellow'
                break
            case 'info':
                statusFill = 'blue'
                break
            case 'success':
                statusFill = 'green'
                break
            default:
                statusFill = 'grey'
        }

        return { fill: statusFill, shape: 'dot', text: msg }
    }
}
