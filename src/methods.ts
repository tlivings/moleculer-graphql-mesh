
import { parse, DocumentNode, DefinitionNode, OperationDefinitionNode, ObjectTypeDefinitionNode } from 'graphql';
import { makeExecutableSchema, addResolveFunctionsToSchema } from 'graphql-tools';
import { mergeTypeDefs, mergeResolvers } from 'graphql-toolkit';
import { Service } from 'moleculer';

export const createRemoteResolver = function (service: Service, serviceName: string, rootType: string, field: string) {
  return async function (_, args, context, info) {
    const operation = `${serviceName}.${rootType}.${field}`;
    
    service.logger.info(`calling remote action ${operation}`);

    try {
      return await service.broker.call(`${operation}`, {
        args,
        context,
        info
      });
    }
    catch (error) {
      const clean = error;
      delete clean.ctx;
      throw clean;
    }
  };
};

export const createRemoteDefinition = function (service: Service, serviceName: string, { types, dependencies }: { types: string, dependencies: string[] }) {
  const typeDefs: DocumentNode  = parse(types);

  const resolvers = {};

  for (const definition of typeDefs.definitions) {
    if (definition.kind === 'ObjectTypeDefinition') {
      const rootType = definition as ObjectTypeDefinitionNode;

      if (['Query', 'Mutation', 'Subscription'].indexOf(rootType.name.value) < 0) {
        continue;
      }
      if (!resolvers[rootType.name.value]) {
        resolvers[rootType.name.value] = {};
      }
      for (const field of rootType.fields) {
        resolvers[rootType.name.value][field.name.value] = createRemoteResolver(service, serviceName, rootType.name.value, field.name.value);
      }
    }
  }

  return {
    types: typeDefs,
    resolvers,
    dependencies
  };
};

export const remoteSchemaMap = async function () {
  return (await this.broker.call('$node.services'))
            .filter((service) => service.name !== this.name && service.metadata.types)
              .reduce((services, service) => Object.assign(services, { [service.name]: createRemoteDefinition(this, service.name, service.metadata) }), {});
};

export const mergeDependencies = function (dependencies: string[], map: { [k: string]: { types: any, dependencies: any[] } }) {
  const types = [];
  const resolvers = [];

  const follow = function (definition) {
    const types = [definition.types];
    const resolvers = [definition.resolvers];

    for (const dependency of definition.dependencies) {
      const result = follow(map[dependency]);

      types.push(...result.types);
      resolvers.push(...result.resolvers);
    }

    return {
      types, 
      resolvers
    };
  };

  for (const service of dependencies) {
    const result = follow(map[service]);
    
    types.push(...result.types);
    resolvers.push(...result.resolvers);
  }
  
  return {
    types: mergeTypeDefs(types),
    resolvers: mergeResolvers(resolvers)
  };
};

export const buildGraphQLSchema = async function () {
  const typeDefs = [this.metadata.types];
  const resolvers = [this.settings.graphql.resolvers];

  if (this.metadata.dependencies && this.metadata.dependencies.length > 0) {
    await this.broker.waitForServices(this.metadata.dependencies);

    const remoteMap = await this.remoteSchemaMap();

    const remotes = this.mergeDependencies(
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