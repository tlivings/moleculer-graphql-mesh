
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
      this.logger.debug(`received update from ${meta.name}`);
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
          name: this.name,
          types: this.metadata.types,
          dependencies: this.dependencies
        }
      };
    },
    async started() {
      try {
        await this.broker.waitForServices(this.metadata.dependencies);

        this.updates.push(
          ...(await this.broker.call('$node.services', { onlyAvailable: true, skipInternal: true }))
            .filter((service) => service.name !== this.name && service.metadata.types)
            .map((service) => ({ name: service.name, ...service.metadata }))
        );

        this.updateTypeMap();

        this.graphqlSchema = await this.buildGraphQLSchema();

        await this.startGateway();

        this.broker.emit('$graphql.schema.available', {
          name: this.name,
          types: this.metadata.types,
          dependencies: this.metadata.dependencies
        });

        this.updateInterval = setInterval(async () => {
          this.logger.debug('checking for updates');
          if (this.updates.length > 0) {
            this.updateTypeMap();
            this.logger.info(`rebuilding graphql schema`);
            this.graphqlSchema = await this.buildGraphQLSchema();
            await this.startGateway();
          }
        }, 10000); //TODO: configurable

      }
      catch (error) {
        this.logger.error(error);
      }
    },
    async stopped() {
      if (this.updateInterval) {
        this.updateInterval.unref();
        clearInterval(this.updateInterval);
      }
      this.logger.info('stopping gateway...');
      await this.gateway.stop();
    }
  };

};