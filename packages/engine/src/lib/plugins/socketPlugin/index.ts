import io from 'socket.io'

import { EngineContext, IRunContextEditor } from '../../types'
import { MagickConsole } from '../consolePlugin/MagickConsole'

export type SocketPluginArgs = {
  server?: boolean
  socket?: io.Socket
  client?: any
}


export type SocketData = {
  output?: unknown
  error?: {
    message: string
    stack: string
  }
}

type Context = {
  magick: EngineContext
}

function install(
  editor: IRunContextEditor,
  // Need to better type the feathers client here
  { server = false, socket, client }: SocketPluginArgs
) {
  const subscriptionMap = new Map()

  editor.on('componentregister', (component: any) => {
    const worker = component.worker

    component.worker = async (
      node,
      inputs,
      outputs,
      context: Context,
      ...args
    ) => {
      const currentSpell = context.magick.getCurrentSpell()
      const event = `${currentSpell.id}-${node.id}`

      if (server) {
        try {
          const result = await worker.apply(component, [
            node,
            inputs,
            outputs,
            context,
            ...args,
          ])

          socket?.emit(event, {
            output: result?.output,
          })
          return result
        } catch (err: any) {
          console.log('CAUGHT ERROR')
          console.log(err)
          // handle errors here so they dont crash the process, and are communicated to the client
          socket?.emit(`${currentSpell.id}-${node.id}-error`, {
            error: {
              message: err.message,
              stack: err.stack,
            },
          })
          socket?.emit(`${currentSpell.id}-error`, {
            error: {
              message: err.message,
              stack: err.stack,
            },
          })
          socket?.emit(event, {
            output: { error: true},
          })
          // note: we may still want to throw the error here
          return console.error(err)
        }
      }

      if (client) {
        node.console = new MagickConsole({
          node,
          component,
          editor,
          server,
        })

        if (subscriptionMap.has(node.id)) return
        //  We may need to namespace this by spell as well
        const unsubscribe = client.io.on(
          event,
          async (socketData: SocketData) => {
            const newContext = {
              ...context,
              socketOutput: socketData,
            }

            // make sure errors are handled in the flow.
            if (socketData?.error) {
              const error = new Error(socketData.error.message)
              error.stack = socketData.error.stack
              node.console.error(error)
              return
            }

            await worker.apply(component, [
              node,
              inputs,
              outputs,
              newContext,
              ...args,
            ])
          }
        )

        subscriptionMap.set(node.id, unsubscribe)
      }
    }
  })
}

const defaultExport = {
  name: 'socketPlugin',
  install,
}

export default defaultExport
