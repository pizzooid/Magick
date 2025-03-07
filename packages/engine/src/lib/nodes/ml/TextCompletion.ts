import Rete from 'rete'

import {
  MagickNode,
  MagickWorkerInputs,
  MagickWorkerOutputs,
  EngineContext,
  WorkerData,
} from '../../types'
import { InputControl } from '../../dataControls/InputControl'
import { triggerSocket, stringSocket, anySocket } from '../../sockets'
import { MagickComponent } from '../../magick-component'
import { DropdownControl } from '../../dataControls/DropdownControl'
import { CompletionData, makeCompletion } from '../../functions/makeCompletion'

const info = 'Basic text completion using OpenAI.'

type WorkerReturn = {
  output: string
} | void

export class TextCompletion extends MagickComponent<Promise<WorkerReturn>> {
  constructor() {
    super('Text Completion')

    this.task = {
      outputs: {
        output: 'output',
        trigger: 'option',
      },
    }

    this.category = 'AI/ML'
    this.display = true
    this.info = info
  }

  builder(node: MagickNode) {
    const inp = new Rete.Input('string', 'Text', stringSocket)
    const settings = new Rete.Input('settings', 'Settings', anySocket)
    const dataInput = new Rete.Input('trigger', 'Trigger', triggerSocket, true)
    const dataOutput = new Rete.Output('trigger', 'Trigger', triggerSocket)
    const outp = new Rete.Output('output', 'output', stringSocket)

    const modelName = new DropdownControl({
      name: 'Model Name',
      dataKey: 'modelName',
      values: [
        'gpt-4',
        'text-davinci-003',
        'text-davinci-002',
        'text-davinci-001',
        'text-curie-001',
        'text-babbage-001',
        'text-ada-001',
        'curie-instruct-beta',
        'davinci-instruct-beta',
      ],
      defaultValue: 'text-davinci-003',
    })

    const temperature = new InputControl({
      dataKey: 'temperature',
      name: 'Temperature (0-1.0)',
      icon: 'moon',
      defaultValue: 0.5,
    })

    const max_tokens = new InputControl({
      dataKey: 'max_tokens',
      name: 'Max Tokens',
      icon: 'moon',
      defaultValue: 100,
    })

    const top_p = new InputControl({
      dataKey: 'top_p',
      name: 'Top P (0-1.0)',
      icon: 'moon',
      defaultValue: 1,
    })

    const frequency_penalty = new InputControl({
      dataKey: 'frequency_penalty',
      name: 'Frequency Penalty (0-2.0)',
      icon: 'moon',
      defaultValue: 0.0,
    })

    const presence_penalty = new InputControl({
      dataKey: 'presence_penalty',
      name: 'Presence Penalty (0-2.0)',
      icon: 'moon',
      defaultValue: 0,
    })

    const stop = new InputControl({
      dataKey: 'stop',
      name: 'Stop (Comma Separated)',
      icon: 'moon',
      defaultValue: '###',
    })

    node.inspector
      .add(modelName)
      .add(temperature)
      .add(max_tokens)
      .add(top_p)
      .add(frequency_penalty)
      .add(presence_penalty)
      .add(stop)

    return node
      .addInput(dataInput)
      .addInput(inp)
      .addInput(settings)
      .addOutput(dataOutput)
      .addOutput(outp)
  }

  async worker(
    node: WorkerData,
    inputs: MagickWorkerInputs,
    _outputs: MagickWorkerOutputs,
    context: { module: any, secrets: Record<string, string>; projectId: string; magick: EngineContext }
  ) {
    const {
      projectId,
      magick,
    } = context

    const currentSpell = magick.getCurrentSpell()
    const prompt = inputs['string'][0]

    const settings = ((inputs.settings && inputs.settings[0]) ?? {}) as any

    const modelName = settings.modelName ?? (node?.data?.modelName as string)

    const temperatureData =
      settings.temperature ?? (node?.data?.temperature as string)
    const temperature = parseFloat(temperatureData)

    const maxTokensData =
      settings.max_tokens ?? (node?.data?.max_tokens as string)
    const max_tokens = parseInt(maxTokensData)

    const topPData = settings.top_p ?? (node?.data?.top_p as string)
    const top_p = parseFloat(topPData)

    const frequencyPenaltyData =
      settings.frequency_penalty ?? (node?.data?.frequency_penalty as string)
    const frequency_penalty = parseFloat(frequencyPenaltyData ?? 0)

    const presencePenaltyData =
      settings.presence_penalty ?? (node?.data?.presence_penalty as string)
    const presence_penalty = parseFloat(presencePenaltyData ?? 0)

    const stopData = settings.stop ?? (node?.data?.stop as string)
    const stop = (stopData ?? '').split(', ')

    for (let i = 0; i < stop.length; i++) {
      if (stop[i] === '\\n') {
        stop[i] = '\n'
      }
    }

    const filteredStop = stop.filter(function (el: any) {
      return el != null && el !== undefined && el.length > 0
    })

    const body: CompletionData = {
      prompt: prompt as string,
      temperature,
      max_tokens,
      model: modelName ?? 'text-davinci-002',
      top_p,
      frequency_penalty,
      presence_penalty,
      stop: filteredStop,
      apiKey: context.module.secrets['openai_api_key'],
    }

    const data = await makeCompletion(body, {
      projectId,
      spell: currentSpell,
      nodeId: node.id,
    })

    const { success, choice } = data

    if (!success) {
      console.error('Error in text completion', data)
      node.data.error = true
      return console.error('Error in text completion')
    }

    const res =
      success !== 'false' && success !== false ? choice.text : '<error>'

    console.log('success:', success, 'choice:', choice.text, 'res:', res)

    return {
      output: res,
    }
  }
}
