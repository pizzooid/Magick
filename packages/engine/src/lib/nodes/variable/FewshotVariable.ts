/* eslint-disable @typescript-eslint/no-unused-vars */
import Rete from 'rete'

import { MagickNode, MagickWorkerInputs, MagickWorkerOutputs, WorkerData } from '../../types'
import { FewshotControl } from '../../dataControls/FewshotControl'
import { InputControl } from '../../dataControls/InputControl'
import { anySocket } from '../../sockets'
import { MagickComponent } from '../../magick-component'
import { BooleanControl } from '../../dataControls/BooleanControl'

const info = `Fewshot Variable`

const fewshot = ``

type InputReturn = {
  output: string
}

export class FewshotVariable extends MagickComponent<InputReturn> {
  constructor() {
    super('Fewshot Variable')

    this.task = {
      outputs: {
        output: 'output',
      },
    }

    this.category = 'Variable'
    this.info = info
    this.display = true
  }

  builder(node: MagickNode) {
    if (!node.data.fewshot) node.data.fewshot = fewshot
    const out = new Rete.Output('output', 'output', anySocket)

    const name = new InputControl({
      dataKey: 'name',
      name: 'Name',
      icon: 'moon',
    })

    const _public = new BooleanControl({
      dataKey: 'isPublic',
      name: 'isPublic',
    })

    const fewshotControl = new FewshotControl({})

    node.inspector.add(fewshotControl).add(name).add(_public)

    return node.addOutput(out)
  }

  worker(node: WorkerData, _inputs: MagickWorkerInputs, _outputs: MagickWorkerOutputs, context: { module: { publicVariables: string } }) {
    let fewshot = node.data.fewshot as string
    const publicVars = JSON.parse(context.module.publicVariables)
    if(node?.data?.isPublic && publicVars[node.id]) {
      console.log('publicVars[node.id is', publicVars[node.id])
      fewshot = publicVars[node.id].value
    }

    return {
      output: fewshot,
    }
  }
}
