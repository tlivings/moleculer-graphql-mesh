
import * as graphql from 'graphql';
import gql from 'graphql-tag';

export const $introspect = function () {
  return {
    name: this.name,
    metadata: this.metadata
  };
};

export const $execute = async function ({ params }) {
  const schema = this.graphqlSchema;

  const document = params.input;

  const contextValue = {
    service: this,
    ...params.context
  };

  const result = await graphql.execute({ schema, document, contextValue });
  
  return result;
};

export const $graphql = async function ({ params, ...ctx }) {
  params.input = gql(params.input);

  return $execute.call(this, { params, ...ctx });
};