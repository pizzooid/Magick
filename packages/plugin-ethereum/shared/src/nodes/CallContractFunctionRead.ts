import { isEmpty } from 'lodash'
import Rete from 'rete'
import { v4 as uuidv4 } from 'uuid'

import {
  anySocket,
  InputControl,
  MagickComponent,
  MagickNode,
  MagickWorkerInputs,
  MagickWorkerOutputs,
  stringSocket,
  triggerSocket,
  WorkerData,
} from '@magickml/engine'

const info = `Call a arbitary function from a contract`

type InputReturn = {
  output: string
} | undefined

export class CallContractFunctionRead extends MagickComponent<Promise<InputReturn>> {
  constructor() {
    // Name of the component
    super('CallContractFunctionReadP')

    this.task = {
      outputs: {
        output: 'output',
        trigger: 'option',
      },
    }

    this.module = {
      nodeType: 'triggerIn',
      socket: anySocket,
      hide: true,
    }

    this.category = 'Ethereum'
    this.info = info
    this.display = true
    this.contextMenuName = 'CallContractFunctionReadP'
    this.displayName = 'CallContractFunctionReadP'
  }

  destroyed(node: MagickNode) {
    console.log('destroyed', node.id)
  }

  builder(node: MagickNode) {
    // module components need to have a socket key.
    // todo add this somewhere automated? Maybe wrap the modules builder in the plugin
    node.data.socketKey = node?.data?.socketKey || uuidv4()

    const contractInput = new Rete.Input('tx', 'Contract', stringSocket)
    const functionInput = new Rete.Input(
      'function',
      'Function Name',
      stringSocket
    )
    const functionParamsInput = new Rete.Input(
      'functionParams',
      'Function Params',
      stringSocket
    )
    const abiInput = new Rete.Input('abi', 'ABI', anySocket)
    const dataInput = new Rete.Input('trigger', 'Trigger', triggerSocket, true)
    const dataOutput = new Rete.Output('trigger', 'Trigger', triggerSocket)
    const resultOutput = new Rete.Output('output', 'Output', stringSocket)

    const rpcHttpControl = new InputControl({
      dataKey: 'rpc_http',
      name: 'RPC Endpoint',
    })

    node.inspector.add(rpcHttpControl)

    return node
      .addInput(dataInput)
      .addInput(contractInput)
      .addInput(functionInput)
      .addInput(functionParamsInput)
      .addInput(abiInput)
      .addOutput(dataOutput)
      .addOutput(resultOutput)
  }

  async worker(
    _node: WorkerData,
    _inputs: MagickWorkerInputs,
    _outputs: MagickWorkerOutputs,
    { data }: { data: string | undefined }
  ): Promise<InputReturn> {
    this._task.closed = ['trigger']
    console.log('********* processing input to ethereum input *********')
    console.log(data)

    // handle data subscription.  If there is data, this is from playtest
    if (data && !isEmpty(data)) {
      this._task.closed = []

      return {
        output: data,
      }
    }
  }
}
