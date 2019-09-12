
import { IResolvers } from 'graphql-tools';
import { DocumentNode, parse, ObjectTypeDefinitionNode, GraphQLResolveInfo, FieldNode, OperationDefinitionNode, DefinitionNode, Kind } from 'graphql';
import { mergeTypeDefs, mergeResolvers } from 'graphql-toolkit';

export const createDocument = function (field: string, info: GraphQLResolveInfo): DocumentNode {
  const operation = info.operation as OperationDefinitionNode;

  const selections = operation.selectionSet.selections.filter((node) => node.kind === Kind.FIELD && node.name.value === field);

  return {
    kind: Kind.DOCUMENT,
    definitions: [
      {
        kind: Kind.OPERATION_DEFINITION,
        operation: operation.operation,
        variableDefinitions: operation.variableDefinitions,
        selectionSet: {
          kind: Kind.SELECTION_SET,
          selections
        },
      }
    ],
  };
};

export const createRemoteResolver = function (serviceName: string, rootType: string, field: string) {
  return async function (_, args, context, info) {
    const operation = `${serviceName}.$execute`;
    
    const input = createDocument(field, info);
    
    const { logger, broker } = context.service;

    logger.info(`calling remote action ${operation}`);

    try {
      const { data, errors } = await broker.call(operation, {
        input,
        context
      });

      //TODO: handle errors appropriately

      return data[field];
    }
    catch (error) {
      const clean = error;
      delete clean.ctx;
      throw clean;
    }
  };
};

export const iterateRootTypes = function *(definitions: readonly DefinitionNode[]): Generator<ObjectTypeDefinitionNode> {
  for (const definition of definitions) {
    if (definition.kind === Kind.OBJECT_TYPE_DEFINITION && ['Query', 'Mutation', 'Subscription'].indexOf(definition.name.value) > -1) {
      yield definition as ObjectTypeDefinitionNode;
    }
  }
};

export const createRemoteDefinition = function ({ name, types, dependencies }: { name: string, types: string, dependencies: string[] }) {
  const typeDefs: DocumentNode  = parse(types);

  const resolvers = {};

  for (const definition of iterateRootTypes(typeDefs.definitions)) {
    if (!resolvers[definition.name.value]) {
      resolvers[definition.name.value] = {};
    }
    for (const field of definition.fields) {
      resolvers[definition.name.value][field.name.value] = createRemoteResolver(name, definition.name.value, field.name.value);
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
    if (!map[service]) {
      throw new Error(`${service} dependency missing from types`);
    }
    const result = follow(map[service]);
    
    types.push(...result.types);
    resolvers.push(...result.resolvers);
  }
  
  return {
    types: mergeTypeDefs(types),
    resolvers: mergeResolvers(resolvers)
  };
};