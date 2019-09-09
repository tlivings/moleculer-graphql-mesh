
import { GraphQLSchema } from 'graphql';
import { Service } from 'moleculer';
import { makeExecutableSchema, addResolveFunctionsToSchema } from 'graphql-tools';
import { mergeTypeDefs, mergeResolvers } from 'graphql-toolkit';
import { IResolverFunc, IResolvers } from './interfaces';

export const mapActionsToResolvers = function (resolvers: IResolvers) {
  const actions = {};

  for (const [name, value] of Object.entries(resolvers)) {
    if (['Query', 'Mutation', 'Subscription'].indexOf(name) > -1) {
      for (const [field, func] of Object.entries(value)) {
        actions[`${name}.${field}`] = function ({ params }) {
          this.logger.info(`calling resolver ${name}.${field} from action entry`);
          
          return func(null, params.args, params.context, params.info);
        }
      }
    }
  }

  return actions;
};