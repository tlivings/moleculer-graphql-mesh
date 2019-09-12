import { GraphQLFieldResolver } from "graphql";

//export type IResolverFunc = (root: any, args: any, context: any, info: any) => any|Promise<any>;

export interface IResolvers {
  [key: string]: {
    [key: string]: GraphQLFieldResolver<any, any>
  }
}

export interface ITypeMap { 
  name: string, types: string, dependencies: string[]
}