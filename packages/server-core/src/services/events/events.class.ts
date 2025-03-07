// For more information about this file see https://dove.feathersjs.com/guides/cli/service.class.html#database-services
import type { Params } from '@feathersjs/feathers'
import { KnexService } from '@feathersjs/knex'
import type { KnexAdapterParams, KnexAdapterOptions } from '@feathersjs/knex'

import type { Application } from '../../declarations'
import type { Event, EventData, EventPatch, EventQuery } from './events.schema'
import { app } from '../../app'

export type EventParams = KnexAdapterParams<EventQuery>

// By default calls the standard Knex adapter service methods but can be customized with your own functionality.
export class EventService<ServiceParams extends Params = EventParams> extends KnexService<
  Event,
  EventData,
  ServiceParams,
  EventPatch
> {
  async find(params?: ServiceParams) {
    const db = app.get('dbClient')
    if (params.query.embedding) {
      const blob = atob(params.query.embedding);
      const ary_buf = new ArrayBuffer(blob.length);
      const dv = new DataView(ary_buf);
      for (let i = 0; i < blob.length; i++) dv.setUint8(i, blob.charCodeAt(i));
      const f32_ary = new Float32Array(ary_buf);
      //const result = await findSimilarEventByEmbedding(db, "'[" + f32_ary.toString() + "]'")
      let vectordb = app.get('vectordb')
      const query = f32_ary as unknown as number[];
      const k = 2;
      const results = vectordb.search(query, k);
      let result_s = await db('events').where('id', results[0]).first()
      console.log(result_s)
      if (result_s) {
        return result_s
      }
    }
    return super.find(params)
  }

}


export const getOptions = (app: Application): KnexAdapterOptions => {
  return {
    paginate: app.get('paginate'),
    Model: app.get('dbClient'),
    name: 'events'
  }
}
