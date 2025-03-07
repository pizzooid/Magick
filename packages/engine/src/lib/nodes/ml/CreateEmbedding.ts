import Rete from 'rete'

import {
    MagickNodeData,
    MagickNode,
    MagickWorkerInputs,
    MagickWorkerOutputs,
    WorkerData,
} from '../../types'
import { triggerSocket, stringSocket, arraySocket } from '../../sockets'
import { MagickComponent } from '../../magick-component'
import { makeEmbedding } from '../../functions/makeEmbedding'

const info = 'Event Store is used to store events for an event and user'

type InputReturn = {
    embedding: number[] | null
} | void

export class CreateEmbedding extends MagickComponent<Promise<InputReturn>> {
    constructor() {
        super('Create Embedding')

        this.task = {
            outputs: {
                embedding: 'output',
                trigger: 'option',
            },
        }

        this.category = 'AI/ML'
        this.display = true
        this.info = info
    }

    builder(node: MagickNode) {
        const contentInput = new Rete.Input('content', 'Content', stringSocket)
        const dataInput = new Rete.Input('trigger', 'Trigger', triggerSocket, true)
        const dataOutput = new Rete.Output('trigger', 'Trigger', triggerSocket)
        const out = new Rete.Output('embedding', 'Events', arraySocket)

        return node
            .addInput(dataInput)
            .addInput(contentInput)
            .addOutput(dataOutput)
            .addOutput(out)
    }

    async worker(
        node: WorkerData,
        inputs: MagickWorkerInputs,
        _outputs: MagickWorkerOutputs,
        { projectId, module }: { projectId: string, module: any },
    ) {
        const content = (inputs['content'] && inputs['content'][0]) as string

        if (!content) return console.log('Content is null, not storing event')

        if(!module.secrets['openai_api_key']) {
            return console.log('No OpenAI API key found')
        }

        // TODO: fix this

        const data = await makeEmbedding({
            apiKey: module.secrets['openai_api_key'],
            input: content,
            model: 'text-embedding-ada-002',
        }, {
            projectId,
            // TODO: check if present
            spell: node.spell as string,
            nodeId: node.id,
        })

        if(!data) {
            return {
                embedding: null
            }
        }

        // TODO: check if data is valid
        // eslint-disable-next-line no-unsafe-optional-chaining
        const [responseData] = data?.data
        const embedding = responseData.embedding
        return {
            embedding
        }
    }
}
