
import { makeExecutableSchema } from 'graphql-tools';
import { mergeTypeDefs, mergeResolvers } from 'graphql-toolkit';
import { createRemoteDefinition, mergeDependencies } from './utilities';
import { ApolloServer } from 'apollo-server';

export const startGateway = async function () {
  if (this.gateway) {
    await this.gateway.stop();
  }

  this.gateway = new ApolloServer({
    schema: this.graphqlSchema,
    context: () => ({
      service: this
    })
  });

  const { url } = await this.gateway.listen(this.settings.graphql.gatewayPort || 4000);

  this.logger.info(`gateway ready at ${url}`);
};

export const updateTypeMap = function () {
  let update;

  while ((update = this.updates.shift()) !== undefined) {
    if (update.name === this.name) {
      continue;
    }
    this.logger.info(`processing update from ${update.name}`);
    Object.assign(this.typeMap, { [update.name] : createRemoteDefinition(update) });
  }
};

export const buildGraphQLSchema = async function () {

  const all = mergeDependencies(
    this.metadata.dependencies.map((dependency) => dependency.name || dependency), 
    this.typeMap
  );

  const schema = makeExecutableSchema({
    typeDefs: mergeTypeDefs([this.metadata.types, all.types]), 
    resolvers: mergeResolvers([this.settings.graphql.resolvers, all.resolvers])
  });

  this.logger.info('built graphql schema');

  return schema;
};