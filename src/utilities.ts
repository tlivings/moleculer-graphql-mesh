
import { IResolvers } from 'graphql-tools';
import { DocumentNode, parse, ObjectTypeDefinitionNode, GraphQLResolveInfo, FieldNode, OperationDefinitionNode } from 'graphql';
import { mergeTypeDefs, mergeResolvers } from 'graphql-toolkit';

export const createDocument = function (field: string, info: GraphQLResolveInfo) {
  const operation = info.operation as OperationDefinitionNode;

  const mapSelections = function (node) {
    const selection = node as FieldNode;

    if (selection.selectionSet && selection.selectionSet.selections.length) {
      return `${selection.name.value} {
        ${selection.selectionSet.selections.map(mapSelections).join(`, `)}
      }`;
    }

    return selection.name.value;
  };
  
  const selections = operation.selectionSet.selections.filter((node) => node.kind === 'Field' && node.name.value === field).map(mapSelections);
  
  return `${operation.operation} {
    ${selections.join(', ')}
  }`;
};

export const createRemoteResolver = function (serviceName: string, rootType: string, field: string) {
  return async function (_, args, context, info) {
    const operation = `${serviceName}.execute`;
    
    // const document = `
    //   ${rootType.toLowerCase()} {
    //     ${field} {
    //       value
    //     }
    //   }
    // `;
    
    const input = createDocument(field, info);
    
    const { logger, broker } = context.service;

    logger.info(`calling remote action ${operation}`);

    try {
      const { data, errors } = await broker.call(operation, {
        input,
        context
      });

      //TODO: wtf to do with errors

      return data[field];
    }
    catch (error) {
      const clean = error;
      delete clean.ctx;
      throw clean;
    }
  };
};

export const createRemoteDefinition = function (serviceName: string, { types, dependencies }: { types: string, dependencies: string[] }) {
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
        resolvers[rootType.name.value][field.name.value] = createRemoteResolver(serviceName, rootType.name.value, field.name.value);
      }
    }
  }

  return {
    types: typeDefs,
    resolvers,
    dependencies
  };
};

export const mapActionsToResolvers = function (resolvers: IResolvers) {
  const actions = {};

  for (const [name, value] of Object.entries(resolvers)) {
    if (['Query', 'Mutation', 'Subscription'].indexOf(name) > -1) {
      for (const [field, func] of Object.entries(value)) {
        actions[`${name}.${field}`] = function ({ params }) {
          this.logger.info(`calling resolver ${name}.${field} from action entry`);
          
          params.context.service = this;
          
          return func(null, params.args, params.context, params.info);
        }
      }
    }
  }

  return actions;
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