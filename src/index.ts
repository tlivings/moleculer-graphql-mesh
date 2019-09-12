
import { IResolvers, ITypeMap } from './interfaces';
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
    '$graphql.schema.available'(meta: ITypeMap) {
      this.updates.push(meta);
    }
  };

  const actions = Object.assign({}, defaultActions, mapActionsToResolvers(resolvers));

  return {
    settings,
    metadata,
    methods,
    actions,
    events,
    created() {
      this.updates = [];
      this.typeMap = {
        [this.name]: {
          types: this.metadata.types
        }
      };
      this.updateInterval = setInterval(async () => {
        if (this.updates.length > 0) {
          this.updateTypeMap();
          this.logger.info(`rebuilding graphql schema`);
          this.graphqlSchema = await this.buildGraphQLSchema();
        }
      }, 10000); //TODO: configurable
    },
    async started() {
      // if (this.metadata.dependencies && this.metadata.dependencies.length > 0) {
      //   await this.broker.waitForServices(this.metadata.dependencies);
      // }

      this.graphqlSchema = await this.buildGraphQLSchema();

      this.broker.emit('$graphql.schema.available', {
        [this.name]: {
          types: this.metadata.types,
          dependencies: this.metadata.dependencies
        }
      });
    },
    async stopped() {
      this.updateInterval.unref();
      clearInterval(this.updateInterval);
    }
  };

};