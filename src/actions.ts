
import * as graphql from 'graphql';
import gql from 'graphql-tag';

export const $introspect = function () {
  return {
    name: this.name,
    metadata: this.metadata
  };
};

export const execute = async function ({ params }) {
  const schema = this.graphqlSchema;

  const document = gql(params.input);
  
  const contextValue = {
    service: this,
    ...params.context
  };

  const result = await graphql.execute({ schema, document, contextValue });
  
  return result;
};

