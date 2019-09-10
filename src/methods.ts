
import { makeExecutableSchema } from 'graphql-tools';
import { mergeTypeDefs, mergeResolvers } from 'graphql-toolkit';
import { createRemoteDefinition, mergeDependencies } from './utilities';

export const remoteSchemaMap = async function () {
  return (await this.broker.call('$node.services'))
            .filter((service) => service.name !== this.name && service.metadata.types)
              .reduce((services, service) => Object.assign(services, { [service.name]: createRemoteDefinition(service.name, service.metadata) }), {});
};

export const buildGraphQLSchema = async function () {
  const typeDefs = [this.metadata.types];
  const resolvers = [this.settings.graphql.resolvers];

  if (this.metadata.dependencies && this.metadata.dependencies.length > 0) {
    await this.broker.waitForServices(this.metadata.dependencies);

    const remoteMap = await this.remoteSchemaMap();

    const remotes = mergeDependencies(
      this.metadata.dependencies.map((dependency) => dependency.name || dependency), 
      remoteMap
    );
    
    typeDefs.push(remotes.types);
    resolvers.push(remotes.resolvers);
  }

  return makeExecutableSchema({
    typeDefs: mergeTypeDefs(typeDefs), 
    resolvers: mergeResolvers(resolvers) 
  });
};