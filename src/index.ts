
import { IResolvers } from './interfaces';
import * as methods from './methods';
import * as defaultActions from './actions';
import { mapActionsToResolvers } from './utilities';

export const createGraphQLMixin = function ({ types, resolvers, dependencies = [] }: { types: string, resolvers: IResolvers, dependencies?: Array<any> }): any {

  const settings = {
    graphql: {
      types, 
      resolvers,
      dependencies
    }
  };

  const metadata = {
    types,
    dependencies
  };

  const events = {
    '$graphql.schema.available'({ service, types }:{ service: string, types: string }) {
      if (service === this.name) {
        return;
      }
    }
  };

  const actions = Object.assign({}, defaultActions, mapActionsToResolvers(resolvers));

  return {
    settings,
    metadata,
    methods,
    actions,
    events,
    async started() {
      this.graphqlSchema = await this.buildGraphQLSchema();
    }
  };

};